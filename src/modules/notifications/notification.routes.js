'use strict';

const express = require('express');
const { authorize } = require('../../shared/middleware/rbac.middleware');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const { validate } = require('../../shared/middleware/validate.middleware');
const { z } = require('zod');
const controller = require('./notification.controller');

const router = express.Router();

const broadcastSchema = z.object({
  target: z.enum(['customers', 'agents', 'all', 'custom']),
  customPhone: z.string().optional(),
  message: z.string().min(5, 'Message must be at least 5 characters').max(500, 'Message too long'),
});

// Admin only: Broadcast promotional messages or alerts
router.post(
  '/broadcast',
  authenticate,
  authorize('admin'),
  validate({ body: broadcastSchema }),
  controller.broadcastMessage
);

module.exports = router;
