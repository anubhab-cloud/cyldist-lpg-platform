'use strict';

const orderRepository = require('./order.repository');
const inventoryService = require('../inventory/inventory.service');
const userRepository = require('../users/user.repository');
const notificationService = require('../notifications/notification.service');
const cache = require('../../shared/cache/redis.cache');
const AppError = require('../../shared/utils/AppError');
const Order = require('./order.model');
const emailService = require('../../utils/email');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const config = require('../../config');

let razorpayInstance = null;
if (config.razorpay.keyId && config.razorpay.keySecret) {
  razorpayInstance = new Razorpay({
    key_id: config.razorpay.keyId,
    key_secret: config.razorpay.keySecret,
  });
}

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
    const { warehouseId, deliveryAddress, cylinderCount, notes, pricePerCylinder = 850, paymentMode = 'cod', cylinderType = 'Domestic (14.2 kg)' } = data;

    // Billing calculations
    const subTotal = pricePerCylinder * cylinderCount;
    const taxAmount = Math.round(subTotal * 0.05); // 5% GST
    const deliveryCharge = 50; // Flat delivery fee
    const discountAmount = paymentMode === 'online' ? Math.round(subTotal * 0.05) : 0; // 5% off for online payments
    const totalAmount = subTotal + taxAmount + deliveryCharge - discountAmount;

    // Verify warehouse exists and has stock
    await inventoryService.deductStock(warehouseId, cylinderCount);

    // Online payments are considered pending until verified
    const paymentStatus = paymentMode === 'cod' ? 'pending' : 'pending';

    let razorpayOrderId = null;

    if (paymentMode === 'online' && razorpayInstance) {
      try {
        const rpOrder = await razorpayInstance.orders.create({
          amount: totalAmount * 100, // amount in paise (using calculated total)
          currency: 'INR',
          receipt: `rcpt_${Date.now()}`,
        });
        razorpayOrderId = rpOrder.id;
      } catch (err) {
        const errorMsg = err.error?.description || err.message || JSON.stringify(err);
        throw new AppError('Failed to create online payment order. ' + errorMsg, 500);
      }
    }

    const orderData = {
      customerId,
      warehouseId,
      deliveryAddress,
      cylinderCount,
      cylinderType,
      notes,
      pricePerCylinder,
      subTotal,
      taxAmount,
      deliveryCharge,
      discountAmount,
      totalAmount,
      paymentMode,
      paymentStatus,
      razorpayOrderId,
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
  async updateStatus(orderId, newStatus, note, userId, userRole, deliveryOtp, extraData = {}) {
    const order = await orderRepository.findByOrderId(orderId);
    if (!order) throw new AppError('Order not found.', 404);

    // Authorization
    if (userRole === 'agent') {
      if (!order.agentId || order.agentId._id.toString() !== userId) {
        throw new AppError('You are not assigned to this order.', 403);
      }
      // Agents can cancel (reject) their assigned orders, but not cancel delivered orders
      if (newStatus === 'cancelled' && order.status === 'delivered') {
        throw new AppError('Delivered orders cannot be rejected.', 403);
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

    let extraFields = {};

    // DELIVERY OTP: Generate when moving to out_for_delivery
    if (newStatus === 'out_for_delivery') {
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      extraFields.deliveryOtp = otp;
      const customer = await userRepository.findById(order.customerId._id || order.customerId);
      if (customer?.email) {
        emailService.send2FAEmail(customer.email, otp).catch(() => {});
      }
    }

    // DELIVERY OTP: Verify when marking delivered
    if (newStatus === 'delivered') {
      if (!order.deliveryOtp) throw new AppError('No delivery OTP found for this order. Contact admin.', 400);
      if (!deliveryOtp) throw new AppError('Delivery OTP is required to mark this order as delivered.', 400);
      if (String(order.deliveryOtp) !== String(deliveryOtp)) {
        throw new AppError('Invalid delivery OTP. Please ask the customer for the correct code.', 401);
      }
      if (extraData.deliveredCount) extraFields.deliveredCount = extraData.deliveredCount;
      if (extraData.notes) extraFields.notes = extraData.notes;
    }

    // Store cancellation reason from agent rejection
    if (newStatus === 'cancelled' && extraData.reason) {
      extraFields.cancellationReason = extraData.reason;
    }

    const updated = await orderRepository.updateStatus(orderId, newStatus, note, userId, extraFields);
    await cache.del(`order:${orderId}`);

    const customer = await userRepository.findById(updated.customerId._id || updated.customerId);
    const agent = updated.agentId ? await userRepository.findById(updated.agentId._id || updated.agentId) : null;

    if (newStatus === 'delivered') {
      await inventoryService.commitStock(updated.warehouseId._id || updated.warehouseId, updated.cylinderCount);
      notificationService.emit('order.delivered', { order: updated, customer, agent });
    } else if (newStatus === 'out_for_delivery') {
      notificationService.emit('order.out_for_delivery', { order: updated, customer, agent });
    } else if (newStatus === 'cancelled') {
      await inventoryService.releaseStock(
        updated.warehouseId?._id || updated.warehouseId,
        updated.cylinderCount
      ).catch(() => {});
      notificationService.emit('order.cancelled', { order: updated, customer });
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

    if (order.status === 'cancelled') throw new AppError('Order is already cancelled.', 409);
    if (order.status === 'delivered') throw new AppError('Delivered orders cannot be cancelled.', 409);

    const updated = await orderRepository.cancelOrder(orderId, reason, userId);
    await cache.del(`order:${orderId}`);

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

  /**
   * Set order priority (Admin only).
   */
  async setPriority(orderId, priority) {
    const order = await orderRepository.findByOrderId(orderId);
    if (!order) throw new AppError('Order not found.', 404);
    const updated = await Order.findOneAndUpdate(
      { orderId },
      { priority },
      { new: true }
    ).populate('customerId', 'name email phone').lean({ virtuals: true });
    return updated;
  }
  /**
   * Verify Razorpay payment signature
   */
  async verifyPayment(orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature) {
    const order = await orderRepository.findByOrderId(orderId);
    if (!order) throw new AppError('Order not found.', 404);
    if (order.razorpayOrderId !== razorpayOrderId) {
      throw new AppError('Invalid order id for this payment.', 400);
    }

    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === razorpaySignature) {
      order.paymentStatus = 'completed';
      order.razorpayPaymentId = razorpayPaymentId;
      await Order.findOneAndUpdate(
        { orderId },
        { paymentStatus: 'completed', razorpayPaymentId }
      );
      await cache.del(`order:${orderId}`);
      return order;
    } else {
      throw new AppError('Payment signature verification failed.', 400);
    }
  }
}

module.exports = new OrderService();
