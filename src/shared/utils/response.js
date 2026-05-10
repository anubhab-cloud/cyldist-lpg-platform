'use strict';

/**
 * Standard API response envelope.
 * Ensures all responses follow the same shape:
 * { success, statusCode, message, data?, pagination? }
 */
const response = {
  /**
   * Send a success response.
   * @param {import('express').Response} res
   * @param {number} statusCode
   * @param {string} message
   * @param {*} [data]
   * @param {object} [pagination]
   */
  success(res, statusCode, message, data = null, pagination = null) {
    const payload = { success: true, statusCode, message };
    if (data !== null) payload.data = data;
    if (pagination !== null) payload.pagination = pagination;
    return res.status(statusCode).json(payload);
  },

  /**
   * Send an error response.
   * @param {import('express').Response} res
   * @param {number} statusCode
   * @param {string} message
   * @param {Array} [errors]
   */
  error(res, statusCode, message, errors = []) {
    const payload = { success: false, statusCode, message };
    if (errors.length) payload.errors = errors;
    return res.status(statusCode).json(payload);
  },

  /**
   * Build a pagination object.
   * @param {number} total
   * @param {number} page
   * @param {number} limit
   */
  paginate(total, page, limit) {
    return {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    };
  },
};

module.exports = response;
