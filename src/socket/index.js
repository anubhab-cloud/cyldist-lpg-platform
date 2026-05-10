'use strict';

const { Server } = require('socket.io');
const config = require('../config');
const logger = require('../config/logger');
const { socketAuth } = require('./auth.middleware');
const { registerLocationHandlers } = require('./location.handler');
const { registerChatHandlers } = require('./chat.handler');

/**
 * Initialize Socket.IO server and attach to the HTTP server.
 *
 * Socket.IO Rooms:
 *   - `order:{orderId}`  — Location tracking for a specific order
 *   - `chat:{chatRoomId}` — Chat messages for a specific order
 *
 * Scaling:
 *   For multi-node horizontal scaling, add @socket.io/redis-adapter:
 *   io.adapter(createAdapter(pubClient, subClient));
 *
 * @param {import('http').Server} httpServer
 * @returns {import('socket.io').Server}
 */
function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: config.socket.corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Ping interval for connection health checks
    pingInterval: 25000,
    pingTimeout: 20000,
    // Limit payload to prevent DoS
    maxHttpBufferSize: 1e6, // 1 MB
    transports: ['websocket', 'polling'],
  });

  // JWT authentication for all socket connections
  io.use(socketAuth);

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} | User: ${socket.user.id} (${socket.user.role})`);

    // Auto-join a user-specific room for private notifications
    socket.join(`user:${socket.user.id}`);

    // Register feature handlers
    registerLocationHandlers(socket, io);
    registerChatHandlers(socket, io);

    /**
     * Subscribe to order location updates (customers/admins).
     * Event: subscribe:order_tracking { orderId }
     */
    socket.on('subscribe:order_tracking', ({ orderId }) => {
      if (!orderId) {
        socket.emit('error', { message: 'orderId is required.' });
        return;
      }
      const room = `order:${orderId}`;
      socket.join(room);
      logger.info(`User ${socket.user.id} subscribed to tracking room: ${room}`);
      socket.emit('subscribed', { room, orderId });
    });

    socket.on('unsubscribe:order_tracking', ({ orderId }) => {
      socket.leave(`order:${orderId}`);
      logger.info(`User ${socket.user.id} unsubscribed from order ${orderId}`);
    });

    // Disconnect cleanup
    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} | Reason: ${reason}`);
    });

    socket.on('error', (err) => {
      logger.error(`Socket error: ${socket.id}`, { error: err.message });
    });
  });

  logger.info('Socket.IO server initialized');
  return io;
}

module.exports = { initSocket };
