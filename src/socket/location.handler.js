'use strict';

const deliveryService = require('../modules/delivery/delivery.service');
const logger = require('../config/logger');

// Minimum interval between location updates from same agent (ms)
const MIN_UPDATE_INTERVAL_MS = 5000; // 5 seconds

// Track last update time per agent to throttle
const lastUpdateTime = new Map();

/**
 * Register GPS location event handlers for a socket.
 *
 * Events (client → server):
 *   agent:location_update  { orderId, lat, lng }
 *   agent:location_stop    { orderId }
 *
 * Events (server → room):
 *   location:updated  { lat, lng, agentId, orderId, timestamp }
 *
 * @param {import('socket.io').Socket} socket
 * @param {import('socket.io').Server} io
 */
function registerLocationHandlers(socket, io) {
  const { id: agentId, role } = socket.user;

  /**
   * Agent sends periodic GPS update.
   * Clients (customers) in the order room receive the broadcast.
   */
  socket.on('agent:location_update', async ({ orderId, lat, lng }) => {
    try {
      // Only agents can emit location updates
      if (role !== 'agent') {
        socket.emit('error', { message: 'Only delivery agents can send location updates.' });
        return;
      }

      // Validate coordinates
      if (
        typeof lat !== 'number' || typeof lng !== 'number' ||
        lat < -90 || lat > 90 || lng < -180 || lng > 180
      ) {
        socket.emit('error', { message: 'Invalid GPS coordinates.' });
        return;
      }

      if (!orderId) {
        socket.emit('error', { message: 'orderId is required.' });
        return;
      }

      // Throttle: enforce minimum 5s between updates
      const now = Date.now();
      const lastTime = lastUpdateTime.get(`${agentId}:${orderId}`) || 0;
      if (now - lastTime < MIN_UPDATE_INTERVAL_MS) {
        return; // Silently drop — too frequent
      }
      lastUpdateTime.set(`${agentId}:${orderId}`, now);

      // Store in Redis and MongoDB
      const locationData = await deliveryService.updateAgentLocation(agentId, orderId, lat, lng);

      // Broadcast to all subscribers of this order room
      const room = `order:${orderId}`;
      io.to(room).emit('location:updated', locationData);

      logger.debug(`Location broadcast to room ${room}`, { lat, lng, agentId });
    } catch (err) {
      logger.error('location_update error:', { error: err.message, agentId });
      socket.emit('error', { message: 'Failed to process location update.' });
    }
  });

  /**
   * Agent signals they've stopped (reached destination or ended session).
   */
  socket.on('agent:location_stop', ({ orderId }) => {
    const room = `order:${orderId}`;
    io.to(room).emit('location:stopped', { agentId, orderId });
    lastUpdateTime.delete(`${agentId}:${orderId}`);
    logger.info(`Agent ${agentId} stopped location tracking for order ${orderId}`);
  });
}

module.exports = { registerLocationHandlers };
