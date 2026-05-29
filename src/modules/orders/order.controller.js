'use strict';

const orderService = require('./order.service');
const { autoDispatchOrders } = require('./autoDispatch.service');
const response = require('../../shared/utils/response');
const asyncHandler = require('../../shared/utils/asyncHandler');

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Cylinder booking and delivery lifecycle management
 */

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Create a cylinder booking (Customer)
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [warehouseId, deliveryAddress, cylinderCount]
 *             properties:
 *               warehouseId:
 *                 type: string
 *               deliveryAddress:
 *                 $ref: '#/components/schemas/Address'
 *               cylinderCount:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Order created successfully
 *       409:
 *         description: Insufficient stock
 */
const createOrder = asyncHandler(async (req, res) => {
  const order = await orderService.createOrder(req.body, req.user.id);
  return response.success(res, 201, 'Order created successfully.', order);
});

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: List orders (role-filtered)
 *     tags: [Orders]
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [created, assigned, out_for_delivery, delivered, cancelled]
 */
const listOrders = asyncHandler(async (req, res) => {
  const { page, limit, status, warehouseId } = req.query;
  const { orders, total } = await orderService.listOrders({ page, limit, status, warehouseId }, req.user);
  return response.success(
    res, 200, 'Orders fetched.', orders,
    response.paginate(total, page || 1, limit || 20)
  );
});

const getOrder = asyncHandler(async (req, res) => {
  const order = await orderService.getOrder(req.params.orderId, req.user);
  return response.success(res, 200, 'Order fetched.', order);
});

const assignAgent = asyncHandler(async (req, res) => {
  const { agentId, estimatedDeliveryTime } = req.body;
  const order = await orderService.assignAgent(
    req.params.orderId, agentId, estimatedDeliveryTime, req.user.id
  );
  
  const io = req.app.get('io');
  if (io) {
    io.to(`order:${order.orderId}`).emit('order:status_updated', order);
  }

  return response.success(res, 200, 'Agent assigned successfully.', order);
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note, deliveryOtp, deliveredCount, notes } = req.body;
  const extraData = { deliveredCount, notes };
  const order = await orderService.updateStatus(
    req.params.orderId, status, note, req.user.id, req.user.role, deliveryOtp, extraData
  );

  const io = req.app.get('io');
  if (io) {
    io.to(`order:${order.orderId}`).emit('order:status_updated', order);
  }

  return response.success(res, 200, `Order status updated to '${status}'.`, order);
});

const rejectOrder = asyncHandler(async (req, res) => {
  // Agent rejecting an assigned order — treated as cancellation with reason
  const { reason } = req.body;
  const extraData = { reason };
  const order = await orderService.updateStatus(
    req.params.orderId, 'cancelled', reason, req.user.id, req.user.role, undefined, extraData
  );

  const io = req.app.get('io');
  if (io) {
    io.to(`order:${order.orderId}`).emit('order:status_updated', order);
  }

  return response.success(res, 200, 'Order rejected successfully.', order);
});

const setPriority = asyncHandler(async (req, res) => {
  const order = await orderService.setPriority(req.params.orderId, req.body);
  return response.success(res, 200, 'Priority updated.', order);
});

const cancelOrder = asyncHandler(async (req, res) => {
  const order = await orderService.cancelOrder(
    req.params.orderId, req.body.reason, req.user.id, req.user.role
  );

  const io = req.app.get('io');
  if (io) {
    io.to(`order:${order.orderId}`).emit('order:status_updated', order);
  }

  return response.success(res, 200, 'Order cancelled.', order);
});

const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
  const order = await orderService.verifyPayment(
    req.params.orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature
  );
  return response.success(res, 200, 'Payment verified successfully.', order);
});

/**
 * POST /orders/auto-dispatch
 * One-click: automatically assign ALL unassigned orders to available agents.
 * Uses K-Means clustering + priority-weighted nearest-neighbor routing.
 */
const autoDispatch = asyncHandler(async (req, res) => {
  const io = req.app.get('io');
  const result = await autoDispatchOrders(req.user.id, io);

  if (!result.success) {
    return response.success(res, 200, result.message, result);
  }

  return response.success(res, 200, result.message, result);
});

/**
 * POST /orders/:orderId/delivery-proof
 * Agent uploads a delivery proof photo.
 */
const uploadDeliveryProof = asyncHandler(async (req, res) => {
  if (!req.file) {
    const AppError = require('../../shared/utils/AppError');
    throw new AppError('No image file uploaded.', 400);
  }

  const Order = require('./order.model');
  const order = await Order.findOne({ orderId: req.params.orderId });

  if (!order) {
    const AppError = require('../../shared/utils/AppError');
    throw new AppError('Order not found.', 404);
  }

  // Verify agent owns this order
  if (order.agentId?.toString() !== req.user.id) {
    const AppError = require('../../shared/utils/AppError');
    throw new AppError('You are not assigned to this order.', 403);
  }

  order.deliveryProofImage = req.file.filename;
  await order.save();

  return response.success(res, 200, 'Delivery proof uploaded successfully.', {
    deliveryProofImage: req.file.filename,
  });
});

/**
 * POST /orders/:orderId/rate
 * Customer rates a delivered order (1-5 stars + optional comment).
 */
const rateOrder = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const AppError = require('../../shared/utils/AppError');

  if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    throw new AppError('Rating must be an integer between 1 and 5.', 400);
  }

  const Order = require('./order.model');
  const order = await Order.findOne({ orderId: req.params.orderId });

  if (!order) {
    throw new AppError('Order not found.', 404);
  }

  // Only the customer who placed the order can rate
  if (order.customerId?.toString() !== req.user.id) {
    throw new AppError('You can only rate your own orders.', 403);
  }

  if (order.status !== 'delivered') {
    throw new AppError('Only delivered orders can be rated.', 400);
  }

  if (order.rating) {
    throw new AppError('This order has already been rated.', 400);
  }

  order.rating = rating;
  order.ratingComment = comment || '';
  await order.save();

  // Update agent's average rating
  if (order.agentId) {
    const avgResult = await Order.aggregate([
      { $match: { agentId: order.agentId, rating: { $ne: null } } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);

    if (avgResult.length > 0) {
      const User = require('../users/user.model');
      await User.findByIdAndUpdate(order.agentId, {
        rating: Math.round(avgResult[0].avgRating * 10) / 10,
      });
    }
  }

  return response.success(res, 200, 'Rating submitted successfully.', {
    rating: order.rating,
    ratingComment: order.ratingComment,
  });
});

module.exports = { createOrder, listOrders, getOrder, assignAgent, updateOrderStatus, cancelOrder, rejectOrder, setPriority, verifyPayment, autoDispatch, uploadDeliveryProof, rateOrder };
