'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Socket.IO JWT authentication middleware.
 * Extracts token from handshake query or auth header.
 * Attaches decoded user to socket.user.
 *
 * Usage (client):
 *   const socket = io('http://host:port', { auth: { token: '<access_token>' } });
 *   // OR
 *   const socket = io('http://host:port', { query: { token: '<access_token>' } });
 */
const socketAuth = (socket, next) => {
  try {
    // Support both auth object and query string
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication required. Provide token in handshake.auth.token'));
    }

    const decoded = jwt.verify(token, config.jwt.accessSecret);
    socket.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new Error('Token expired. Please refresh your session.'));
    }
    return next(new Error('Invalid authentication token.'));
  }
};

module.exports = { socketAuth };
