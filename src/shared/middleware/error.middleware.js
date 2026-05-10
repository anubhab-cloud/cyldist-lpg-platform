'use strict';

const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const logger = require('../../config/logger');

/**
 * Global error handling middleware.
 * Must be registered last in the Express middleware chain.
 *
 * Handles:
 * - AppError (operational errors) → structured JSON response
 * - Mongoose ValidationError → 422 with field details
 * - Mongoose CastError (bad ObjectId) → 400
 * - MongoDB duplicate key error (11000) → 409
 * - JWT errors → 401 (handled upstream in auth middleware)
 * - Unknown errors → 500 (never leak stack traces in production)
 *
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {Function} next
 */
const errorHandler = (err, req, res, next) => {
  let error = err;

  // Log all errors (use 'error' level for 5xx, 'warn' for 4xx)
  const logLevel = (error.statusCode || 500) >= 500 ? 'error' : 'warn';
  logger[logLevel](`${req.method} ${req.originalUrl}`, {
    statusCode: error.statusCode,
    message: error.message,
    stack: error.stack,
  });

  // --- Mongoose: invalid ObjectId ---
  if (error instanceof mongoose.Error.CastError) {
    error = new AppError(`Invalid ${error.path}: ${error.value}`, 400);
  }

  // --- Mongoose: validation error ---
  if (error instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(error.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    error = new AppError('Validation failed.', 422, errors);
  }

  // --- MongoDB: duplicate key ---
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue || {})[0] || 'field';
    error = new AppError(
      `Duplicate value for ${field}. This ${field} is already in use.`,
      409
    );
  }

  // --- Operational errors (AppError instances) ---
  if (error.isOperational) {
    return res.status(error.statusCode).json({
      success: false,
      statusCode: error.statusCode,
      message: error.message,
      ...(error.errors && error.errors.length && { errors: error.errors }),
    });
  }

  // --- Unknown / programmer errors ---
  // In production: never expose internal details
  const statusCode = error.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please try again later.'
      : error.message;

  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
  });
};

/**
 * 404 Not Found handler — catches unmatched routes.
 */
const notFound = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

module.exports = { errorHandler, notFound };
