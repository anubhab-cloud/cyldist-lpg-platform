'use strict';

const jwt = require('jsonwebtoken');
const config = require('../../config');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * JWT Authentication Middleware.
 * Verifies the Bearer token from the Authorization header,
 * decodes the payload, and attaches it to req.user.
 */
const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Access denied. No token provided.', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret);
    req.user = decoded; // { id, email, role, iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError('Token expired. Please refresh your session.', 401);
    }
    if (err.name === 'JsonWebTokenError') {
      throw new AppError('Invalid token.', 401);
    }
    throw new AppError('Authentication failed.', 401);
  }
});

module.exports = { authenticate };
