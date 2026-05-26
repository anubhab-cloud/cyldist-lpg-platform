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
router.post('/me/wallet/add', validate({ body: z.object({ amount: z.number().positive() }) }), controller.addWalletFunds);
router.post('/me/wallet/deposit', validate({ body: z.object({ amount: z.number().positive() }) }), controller.initiateWalletDeposit);
router.post('/me/wallet/verify', validate({ body: z.object({ razorpayPaymentId: z.string(), razorpayOrderId: z.string(), razorpaySignature: z.string() }) }), controller.verifyWalletDeposit);
const upload = require('../../shared/middleware/upload.middleware');

router.post('/me/kyc', upload.single('documentImage'), validate({ body: z.object({ documentType: z.enum(['Aadhar', 'PAN', 'VoterID']), documentNumber: z.string().min(5) }) }), controller.submitKyc);

// --- Agent routes ---
router.patch(
  '/me/duty-status',
  authorize('agent'),
  validate({ body: z.object({ isOnDuty: z.boolean() }) }),
  controller.updateDutyStatus
);

// --- Admin routes ---
router.get('/kyc/pending', authorize('admin'), controller.listPendingKyc);
router.get('/agents/performance', authorize('admin'), controller.getAgentsPerformance);
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
router.patch(
  '/:id/kyc-status',
  authorize('admin'),
  validate({ body: z.object({ status: z.enum(['verified', 'rejected']) }) }),
  controller.updateKycStatus
);

module.exports = router;
