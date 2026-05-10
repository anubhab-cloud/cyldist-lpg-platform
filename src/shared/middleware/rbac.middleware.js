'use strict';

const AppError = require('../utils/AppError');

/**
 * Role-Based Access Control (RBAC) guard factory.
 * Returns a middleware that restricts access to the specified roles.
 *
 * @param {...string} roles - Allowed roles (e.g., 'admin', 'customer', 'agent')
 * @returns {Function} Express middleware
 *
 * @example
 * router.patch('/assign', authenticate, authorize('admin'), controller.assign);
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required.', 401));
  }

  if (!roles.includes(req.user.role)) {
    return next(
      new AppError(
        `Access denied. This action requires one of the following roles: ${roles.join(', ')}.`,
        403
      )
    );
  }

  next();
};

module.exports = { authorize };
