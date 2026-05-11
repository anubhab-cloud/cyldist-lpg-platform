'use strict';

const orderRepository = require('./order.repository');
const inventoryService = require('../inventory/inventory.service');
const userRepository = require('../users/user.repository');
const notificationService = require('../notifications/notification.service');
const cache = require('../../shared/cache/redis.cache');
const AppError = require('../../shared/utils/AppError');
const Order = require('./order.model');

const ACTIVE_ORDER_CACHE_TTL = 60; // seconds

/**
 * Order management service.
 * Handles the full order lifecycle: create → assign → out_for_delivery → delivered/cancelled
 */
class OrderService {
  /**
   * Create a new cylinder booking.
   * Atomically deducts inventory.
   *
   * @param {object} data
   * @param {string} customerId
   */
  async createOrder(data, customerId) {
    const { warehouseId, deliveryAddress, cylinderCount, notes, pricePerCylinder = 0, paymentMode = 'cod' } = data;

    // Verify warehouse exists and has stock
    await inventoryService.deductStock(warehouseId, cylinderCount);

    // Online payments are considered paid immediately; COD stays pending for agent collection
    const paymentStatus = paymentMode === 'cod' ? 'pending' : 'paid';

    const orderData = {
      customerId,
      warehouseId,
      deliveryAddress,
      cylinderCount,
      notes,
      pricePerCylinder,
      totalAmount: pricePerCylinder * cylinderCount,
      paymentMode,
      paymentStatus,
    };

    const order = await orderRepository.create(orderData);

    // Emit notification event
    const customer = await userRepository.findById(customerId);
    notificationService.emit('order.created', { order, customer });

    // Cache active order
    await cache.set(`order:${order.orderId}`, order, ACTIVE_ORDER_CACHE_TTL);

    return order;
  }

  /**
   * Fetch orders with role-based filtering.
   * Customers see only their own orders; agents see their assigned orders; admins see all.
   */
  async listOrders({ page = 1, limit = 20, status, warehouseId } = {}, user) {
    const filter = { page: Number(page), limit: Number(limit), status, warehouseId };

    if (user.role === 'customer') {
      filter.customerId = user.id;
    } else if (user.role === 'agent') {
      filter.agentId = user.id;
    }
    // admin: no filter by user — sees all

    return orderRepository.findAll(filter);
  }

  async getOrder(orderId, user) {
    const order = await orderRepository.findByOrderId(orderId);
    if (!order) throw new AppError('Order not found.', 404);

    // Authorization: customers can only see their own orders
    if (
      user.role === 'customer' &&
      order.customerId._id.toString() !== user.id
    ) {
      throw new AppError('Access denied.', 403);
    }

    // Agents can only see their assigned orders
    if (
      user.role === 'agent' &&
      order.agentId &&
      order.agentId._id.toString() !== user.id
    ) {
      throw new AppError('Access denied.', 403);
    }

    return order;
  }

  /**
   * Admin: assign a delivery agent to an order.
   */
  async assignAgent(orderId, agentId, estimatedDeliveryTime, adminId) {
    const order = await orderRepository.findByOrderId(orderId);
    if (!order) throw new AppError('Order not found.', 404);

    if (order.status !== 'created') {
      throw new AppError(
        `Cannot assign agent. Order is in '${order.status}' status.`,
        409
      );
    }

    // Verify agent exists and is active
    const agent = await userRepository.findById(agentId);
    if (!agent || agent.role !== 'agent' || !agent.isActive) {
      throw new AppError('Agent not found or inactive.', 404);
    }

    const updated = await orderRepository.assignAgent(
      orderId,
      agentId,
      estimatedDeliveryTime,
      adminId
    );

    if (!updated) throw new AppError('Failed to assign agent. Order may have changed status.', 409);

    // Invalidate cache
    await cache.del(`order:${orderId}`);

    const customer = await userRepository.findById(updated.customerId._id || updated.customerId);
    notificationService.emit('order.assigned', { order: updated, customer, agent });

    return updated;
  }

  /**
   * Update order status (agent or admin).
   * Validates against the status machine.
   */
  async updateStatus(orderId, newStatus, note, userId, userRole) {
    const order = await orderRepository.findByOrderId(orderId);
    if (!order) throw new AppError('Order not found.', 404);

    // Authorization
    if (userRole === 'agent') {
      if (!order.agentId || order.agentId._id.toString() !== userId) {
        throw new AppError('You are not assigned to this order.', 403);
      }
      // Agents can only move forward (no cancellation via status update)
      if (newStatus === 'cancelled') {
        throw new AppError('Agents cannot cancel orders. Please contact admin.', 403);
      }
    }

    // Validate transition
    if (!Order.isValidTransition(order.status, newStatus)) {
      throw new AppError(
        `Invalid status transition: ${order.status} → ${newStatus}. ` +
        `Allowed: ${(Order.STATUS_TRANSITIONS[order.status] || []).join(', ') || 'none'}`,
        409
      );
    }

    const updated = await orderRepository.updateStatus(orderId, newStatus, note, userId);
    await cache.del(`order:${orderId}`);

    // Handle inventory and notifications based on new status
    const customer = await userRepository.findById(updated.customerId._id || updated.customerId);
    const agent = updated.agentId ? await userRepository.findById(updated.agentId._id || updated.agentId) : null;

    if (newStatus === 'delivered') {
      // Commit stock (remove from reserved and total — cylinders are now delivered)
      await inventoryService.commitStock(updated.warehouseId._id || updated.warehouseId, updated.cylinderCount);
      notificationService.emit('order.delivered', { order: updated, customer, agent });
    } else if (newStatus === 'out_for_delivery') {
      notificationService.emit('order.out_for_delivery', { order: updated, customer, agent });
    }

    return updated;
  }

  /**
   * Cancel an order. Releases inventory back to available.
   */
  async cancelOrder(orderId, reason, userId, userRole) {
    const order = await orderRepository.findByOrderId(orderId);
    if (!order) throw new AppError('Order not found.', 404);

    // Customers can only cancel their own orders, and only if not yet out for delivery
    if (userRole === 'customer') {
      if (order.customerId._id.toString() !== userId) {
        throw new AppError('Access denied.', 403);
      }
      if (!['created', 'assigned'].includes(order.status)) {
        throw new AppError(
          'You can only cancel orders that are in "created" or "assigned" status.',
          409
        );
      }
    }

    if (order.status === 'cancelled') {
      throw new AppError('Order is already cancelled.', 409);
    }

    if (order.status === 'delivered') {
      throw new AppError('Delivered orders cannot be cancelled.', 409);
    }

    const updated = await orderRepository.cancelOrder(orderId, reason, userId);
    await cache.del(`order:${orderId}`);

    // Release inventory back
    if (!['delivered'].includes(order.status)) {
      await inventoryService.releaseStock(
        updated.warehouseId?._id || updated.warehouseId,
        updated.cylinderCount
      );
    }

    const customer = await userRepository.findById(updated.customerId?._id || updated.customerId);
    notificationService.emit('order.cancelled', { order: updated, customer });

    return updated;
  }
}

module.exports = new OrderService();
