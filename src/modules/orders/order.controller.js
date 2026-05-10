'use strict';

const orderService = require('./order.service');
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
  return response.success(res, 200, 'Agent assigned successfully.', order);
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const order = await orderService.updateStatus(
    req.params.orderId, status, note, req.user.id, req.user.role
  );
  return response.success(res, 200, `Order status updated to '${status}'.`, order);
});

const cancelOrder = asyncHandler(async (req, res) => {
  const order = await orderService.cancelOrder(
    req.params.orderId, req.body.reason, req.user.id, req.user.role
  );
  return response.success(res, 200, 'Order cancelled.', order);
});

module.exports = { createOrder, listOrders, getOrder, assignAgent, updateOrderStatus, cancelOrder };
