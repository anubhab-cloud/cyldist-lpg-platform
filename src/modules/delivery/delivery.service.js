'use strict';

const cache = require('../../shared/cache/redis.cache');
const userRepository = require('../users/user.repository');
const orderRepository = require('../orders/order.repository');
const AppError = require('../../shared/utils/AppError');

const LOCATION_TTL = 300; // 5 minutes — location expires if agent stops updating
const locationKey = (orderId) => `location:order:${orderId}`;
const agentLocationKey = (agentId) => `location:agent:${agentId}`;

/**
 * Delivery location tracking service.
 * Agent GPS coordinates are stored in Redis for fast retrieval.
 * MongoDB location is updated periodically for persistence.
 */
class DeliveryService {
  /**
   * Update agent's live location (called from Socket.IO handler).
   *
   * @param {string} agentId
   * @param {string} orderId
   * @param {number} lat
   * @param {number} lng
   */
  async updateAgentLocation(agentId, orderId, lat, lng) {
    const locationData = {
      lat,
      lng,
      agentId,
      orderId,
      timestamp: new Date().toISOString(),
    };

    // Store in Redis (fast, ephemeral)
    await Promise.all([
      cache.set(locationKey(orderId), locationData, LOCATION_TTL),
      cache.set(agentLocationKey(agentId), locationData, LOCATION_TTL),
    ]);

    // Persist to MongoDB (throttle: only update every N calls via a flag)
    // In production, use a separate write-behind strategy
    await userRepository.updateLocation(agentId, lat, lng);

    return locationData;
  }

  /**
   * Get the last known location of an agent for a specific order.
   * Used by customers to track their delivery.
   *
   * @param {string} orderId
   * @param {string} userId - Requesting user ID
   * @param {string} userRole
   */
  async getOrderAgentLocation(orderId, userId, userRole) {
    const order = await orderRepository.findByOrderId(orderId);
    if (!order) throw new AppError('Order not found.', 404);

    // Authorization: only the customer of this order or admin
    if (userRole === 'customer') {
      const customerId = order.customerId?._id?.toString() || order.customerId?.toString();
      if (customerId !== userId) throw new AppError('Access denied.', 403);
    }

    if (!['assigned', 'out_for_delivery'].includes(order.status)) {
      throw new AppError('Location tracking is only available for active deliveries.', 409);
    }

    if (!order.agentId) {
      throw new AppError('No delivery agent assigned to this order yet.', 404);
    }

    // Try Redis first
    const cached = await cache.get(locationKey(orderId));
    if (cached) return cached;

    // Fallback to agent's last known location from MongoDB
    const agentId = order.agentId?._id || order.agentId;
    const agent = await userRepository.findById(agentId);
    if (!agent || !agent.location?.lat) {
      throw new AppError('Agent location not available.', 404);
    }

    return {
      lat: agent.location.lat,
      lng: agent.location.lng,
      agentId: agentId.toString(),
      orderId,
      timestamp: null, // Stale from DB
    };
  }

  /**
   * Get route-related data for a delivery.
   * Extensible for Google Maps Directions API integration.
   *
   * @param {string} orderId
   * @param {string} userId
   * @param {string} userRole
   */
  async getDeliveryRoute(orderId, userId, userRole) {
    const location = await this.getOrderAgentLocation(orderId, userId, userRole);
    const order = await orderRepository.findByOrderId(orderId);

    return {
      agentLocation: {
        lat: location.lat,
        lng: location.lng,
      },
      destination: order.deliveryAddress?.location || null,
      // TODO: Integrate Google Maps Directions API here
      // directionsUrl: `https://maps.googleapis.com/maps/api/directions/json?origin=...&destination=...&key=${config.maps.googleApiKey}`
      googleMapsUrl: order.deliveryAddress?.location
        ? `https://www.google.com/maps/dir/${location.lat},${location.lng}/${order.deliveryAddress.location.lat},${order.deliveryAddress.location.lng}`
        : null,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
    };
  }
}

module.exports = new DeliveryService();
