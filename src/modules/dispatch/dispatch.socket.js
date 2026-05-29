'use strict';

const { DeliveryAgent } = require('./dispatch.model');
const logger = require('../../config/logger');

// ═══════════════════════════════════════════════════════════════════════════════
// DISPATCH SOCKET.IO HANDLER
//
// Extends the base Socket.IO infrastructure with dispatch-specific events:
//
// INBOUND (agent → server):
//   dispatch:agent_location  { lat, lng }  — Agent GPS update (stored in DeliveryAgent)
//   dispatch:delivery_start  { routeId }   — Agent begins route execution
//   dispatch:stop_complete   { orderId }   — Agent marks a stop as delivered
//
// OUTBOUND (server → clients):
//   dispatch:agent_moved     — Broadcast to admin room for live dashboard tracking
//   dispatch:stop_delivered  — Notify admin of completed delivery
//
// Integration: Register this handler in the main socket/index.js
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Register dispatch-related socket event handlers.
 *
 * @param {import('socket.io').Socket} socket
 * @param {import('socket.io').Server} io
 */
function registerDispatchHandlers(socket, io) {
  const { id: userId, role } = socket.user;

  // ── Agent Location Stream (for dispatch dashboard) ──
  socket.on('dispatch:agent_location', async ({ lat, lng }) => {
    if (role !== 'agent') return;

    if (typeof lat !== 'number' || typeof lng !== 'number') return;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;

    try {
      // Update the DeliveryAgent document with new coordinates
      await DeliveryAgent.findOneAndUpdate(
        { userId },
        {
          $set: {
            'currentLocation.coordinates': [lng, lat],
            lastLocationUpdate: new Date(),
          },
        }
      );

      // Broadcast to admin dashboard for live tracking visualization
      io.to('admin:room').emit('dispatch:agent_moved', {
        agentUserId: userId,
        coordinates: [lng, lat],
        timestamp: Date.now(),
      });
    } catch (err) {
      logger.error(`[Dispatch Socket] Location update failed: ${err.message}`);
    }
  });

  // ── Agent starts executing a dispatch route ──
  socket.on('dispatch:delivery_start', async ({ routeId }) => {
    if (role !== 'agent') return;

    try {
      const { DispatchRoute } = require('./dispatch.model');
      await DispatchRoute.findOneAndUpdate(
        { routeId },
        { status: 'in_progress' }
      );

      io.to('admin:room').emit('dispatch:route_started', {
        routeId,
        agentUserId: userId,
        timestamp: Date.now(),
      });

      logger.info(`[Dispatch] Agent ${userId} started route ${routeId}`);
    } catch (err) {
      logger.error(`[Dispatch Socket] delivery_start error: ${err.message}`);
    }
  });

  // ── Agent completes a stop ──
  socket.on('dispatch:stop_complete', async ({ orderId, routeId }) => {
    if (role !== 'agent') return;

    try {
      const { DispatchOrder } = require('./dispatch.model');
      await DispatchOrder.findOneAndUpdate(
        { orderId },
        { status: 'delivered' }
      );

      io.to('admin:room').emit('dispatch:stop_delivered', {
        orderId,
        routeId,
        agentUserId: userId,
        timestamp: Date.now(),
      });

      logger.info(`[Dispatch] Stop ${orderId} delivered by agent ${userId}`);
    } catch (err) {
      logger.error(`[Dispatch Socket] stop_complete error: ${err.message}`);
    }
  });

  // ── Admin subscribes to dispatch tracking ──
  socket.on('dispatch:subscribe_tracking', () => {
    if (role === 'admin') {
      socket.join('dispatch:live');
      socket.emit('dispatch:subscribed', { room: 'dispatch:live' });
    }
  });
}

module.exports = { registerDispatchHandlers };
