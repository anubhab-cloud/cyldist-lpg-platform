'use strict';

/**
 * Wraps an async route handler to catch rejected promises and
 * forward errors to the global error handler via next().
 * Eliminates the need for try/catch in every controller.
 *
 * @param {Function} fn - Async route handler
 * @returns {Function} Express middleware
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
