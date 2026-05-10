'use strict';

const { Router } = require('express');
const controller = require('./user.controller');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const { authorize } = require('../../shared/middleware/rbac.middleware');
const { validate } = require('../../shared/middleware/validate.middleware');
const {
  updateProfileSchema,
  changePasswordSchema,
  addressSchema,
  listUsersQuerySchema,
  changeRoleSchema,
} = require('./user.validator');
const { z } = require('zod');

const router = Router();

// All user routes require authentication
router.use(authenticate);

// --- Own profile routes ---
router.get('/me', controller.getMyProfile);
router.put('/me', validate({ body: updateProfileSchema }), controller.updateMyProfile);
router.patch('/me/password', validate({ body: changePasswordSchema }), controller.changeMyPassword);
router.post('/me/addresses', validate({ body: addressSchema }), controller.addMyAddress);
router.delete('/me/addresses/:addressId', controller.removeMyAddress);

// --- Agent routes ---
router.patch(
  '/me/duty-status',
  authorize('agent'),
  validate({ body: z.object({ isOnDuty: z.boolean() }) }),
  controller.updateDutyStatus
);

// --- Admin routes ---
router.get('/', authorize('admin'), validate({ query: listUsersQuerySchema }), controller.listUsers);
router.get('/available-agents', authorize('admin'), controller.getAvailableAgents);
router.get('/:id', authorize('admin'), controller.getUserById);
router.patch('/:id/role', authorize('admin'), validate({ body: changeRoleSchema }), controller.changeUserRole);
router.patch(
  '/:id/active',
  authorize('admin'),
  validate({ body: z.object({ isActive: z.boolean() }) }),
  controller.toggleUserActive
);

module.exports = router;
