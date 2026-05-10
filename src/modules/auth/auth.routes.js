'use strict';

const { Router } = require('express');
const controller = require('./auth.controller');
const { validate } = require('../../shared/middleware/validate.middleware');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const { authorize } = require('../../shared/middleware/rbac.middleware');
const { authLimiter } = require('../../shared/middleware/rateLimiter.middleware');
const {
  registerSchema,
  registerAgentSchema,
  loginSchema,
  refreshSchema,
} = require('./auth.validator');

const router = Router();

// Public routes (rate-limited)
router.post('/register', authLimiter, validate({ body: registerSchema }), controller.register);
router.post('/login', authLimiter, validate({ body: loginSchema }), controller.login);
router.post('/refresh', authLimiter, validate({ body: refreshSchema }), controller.refresh);

// Admin-only: register delivery agents
router.post(
  '/register-agent',
  authenticate,
  authorize('admin'),
  validate({ body: registerAgentSchema }),
  controller.registerAgent
);

// Protected
router.post('/logout', authenticate, controller.logout);

module.exports = router;
