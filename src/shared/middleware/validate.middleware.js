'use strict';

const AppError = require('../utils/AppError');

/**
 * Zod-based request validation middleware factory.
 * Validates req.body, req.query, and req.params against provided Zod schemas.
 *
 * @param {{ body?: ZodSchema, query?: ZodSchema, params?: ZodSchema }} schemas
 * @returns {Function} Express middleware
 *
 * @example
 * router.post('/', validate({ body: createOrderSchema }), controller.create);
 */
const validate = (schemas) => (req, res, next) => {
  const errors = [];

  for (const [target, schema] of Object.entries(schemas)) {
    if (!schema) continue;

    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const fieldErrors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      errors.push(...fieldErrors);
    } else {
      // Replace req target with parsed (and potentially transformed) value
      req[target] = result.data;
    }
  }

  if (errors.length > 0) {
    return next(new AppError('Validation failed.', 422, errors));
  }

  next();
};

module.exports = { validate };
