'use strict';

const rateLimit = require('express-rate-limit');
const config = require('../../config');

/**
 * Factory to create a rate limiter with custom options.
 * @param {object} options
 * @returns {Function} Express middleware
 */
const createLimiter = (options = {}) =>
  rateLimit({
    windowMs: options.windowMs || config.rateLimit.windowMs,
    max: options.max || config.rateLimit.max,
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false,
    message: {
      success: false,
      statusCode: 429,
      message: options.message || 'Too many requests. Please try again later.',
    },
    skip: () => config.isTest || config.isDevelopment, // Skip rate limiting in tests and development
  });

/**
 * Global API rate limiter — 100 requests per 15 minutes.
 */
const globalLimiter = createLimiter();

/**
 * Stricter limiter for auth endpoints — 10 attempts per 15 minutes.
 * Prevents brute-force attacks on login/register.
 */
const authLimiter = createLimiter({
  max: config.rateLimit.authMax,
  message: 'Too many authentication attempts. Please wait before trying again.',
});

/**
 * Order creation limiter — prevent order spam.
 */
const orderLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'Order limit exceeded. You can place up to 20 orders per hour.',
});

module.exports = { globalLimiter, authLimiter, orderLimiter, createLimiter };
