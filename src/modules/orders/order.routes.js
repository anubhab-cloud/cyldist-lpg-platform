'use strict';

const { Router } = require('express');
const path = require('path');
const multer = require('multer');
const controller = require('./order.controller');
const analyticsController = require('./analytics.controller');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const { authorize } = require('../../shared/middleware/rbac.middleware');
const { validate } = require('../../shared/middleware/validate.middleware');
const { orderLimiter } = require('../../shared/middleware/rateLimiter.middleware');
const {
  createOrderSchema,
  assignAgentSchema,
  updateStatusSchema,
  cancelOrderSchema,
  rejectOrderSchema,
  setPrioritySchema,
  listOrdersQuerySchema,
} = require('./order.validator');

// Multer config for delivery proof images
const deliveryProofStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const fs = require('fs');
    const dest = path.join(__dirname, '../../../public/uploads/delivery-proofs');
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `proof-${req.params.orderId}-${Date.now()}${ext}`);
  },
});

const deliveryProofUpload = multer({
  storage: deliveryProofStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|heic/;
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowed.test(file.mimetype.split('/')[1]);
    if (extOk || mimeOk) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, png, webp, heic) are allowed.'));
    }
  },
});

const router = Router();

router.use(authenticate);

// Customer: Create order (rate-limited)
router.post(
  '/',
  authorize('customer'),
  orderLimiter,
  validate({ body: createOrderSchema }),
  controller.createOrder
);

// All roles: List orders (filtered by role in service)
router.get(
  '/',
  authorize('customer', 'admin', 'agent'),
  validate({ query: listOrdersQuerySchema }),
  controller.listOrders
);

// Admin: Dashboard analytics (pre-computed stats)
router.get('/analytics', authorize('admin'), analyticsController.getAnalytics);

// Admin: One-click auto-dispatch all unassigned orders
router.post('/auto-dispatch', authorize('admin'), controller.autoDispatch);

// All roles: Get single order
router.get('/:orderId', authorize('customer', 'admin', 'agent'), controller.getOrder);

// Admin: Assign delivery agent
router.patch(
  '/:orderId/assign',
  authorize('admin'),
  validate({ body: assignAgentSchema }),
  controller.assignAgent
);

// Agent/Admin: Update order status
router.patch(
  '/:orderId/status',
  authorize('agent', 'admin'),
  validate({ body: updateStatusSchema }),
  controller.updateOrderStatus
);

// Customer/Admin: Cancel order
router.delete(
  '/:orderId',
  authorize('customer', 'admin', 'agent'),
  validate({ body: cancelOrderSchema }),
  controller.cancelOrder
);

// Agent: Reject an assigned order
router.delete(
  '/:orderId/reject',
  authorize('agent'),
  validate({ body: rejectOrderSchema }),
  controller.rejectOrder
);

// Admin: Set order priority
router.patch(
  '/:orderId/priority',
  authorize('admin'),
  validate({ body: setPrioritySchema }),
  controller.setPriority
);

// Customer: Verify online payment
router.post(
  '/:orderId/verify-payment',
  authorize('customer'),
  controller.verifyPayment
);

// Agent: Upload delivery proof photo
router.post(
  '/:orderId/delivery-proof',
  authorize('agent'),
  deliveryProofUpload.single('photo'),
  controller.uploadDeliveryProof
);

// Customer: Rate a delivered order
router.post(
  '/:orderId/rate',
  authorize('customer'),
  controller.rateOrder
);

module.exports = router;
