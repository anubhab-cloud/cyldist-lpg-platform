'use strict';

const deliveryService = require('./delivery.service');
const response = require('../../shared/utils/response');
const asyncHandler = require('../../shared/utils/asyncHandler');

/**
 * @swagger
 * tags:
 *   name: Delivery
 *   description: Real-time delivery location tracking
 */

/**
 * @swagger
 * /delivery/{orderId}/location:
 *   get:
 *     summary: Get current agent location for an order
 *     tags: [Delivery]
 *     parameters:
 *       - name: orderId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Agent location data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 lat:
 *                   type: number
 *                 lng:
 *                   type: number
 *                 timestamp:
 *                   type: string
 */
const getAgentLocation = asyncHandler(async (req, res) => {
  const location = await deliveryService.getOrderAgentLocation(
    req.params.orderId,
    req.user.id,
    req.user.role
  );
  return response.success(res, 200, 'Agent location fetched.', location);
});

/**
 * @swagger
 * /delivery/{orderId}/route:
 *   get:
 *     summary: Get delivery route data (extensible for Google Maps)
 *     tags: [Delivery]
 */
const getDeliveryRoute = asyncHandler(async (req, res) => {
  const routeData = await deliveryService.getDeliveryRoute(
    req.params.orderId,
    req.user.id,
    req.user.role
  );
  return response.success(res, 200, 'Delivery route data fetched.', routeData);
});

module.exports = { getAgentLocation, getDeliveryRoute };
