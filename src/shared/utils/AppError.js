'use strict';

/**
 * Custom application error class.
 * Extends the native Error with a statusCode and optional metadata.
 */
class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code
   * @param {Array} [errors] - Optional array of field-level errors (e.g. from validation)
   */
  constructor(message, statusCode, errors = []) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.status = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error';
    this.isOperational = true; // Distinguish from programmer errors
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
