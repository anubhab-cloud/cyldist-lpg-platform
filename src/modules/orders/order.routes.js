'use strict';

const { Router } = require('express');
const controller = require('./order.controller');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const { authorize } = require('../../shared/middleware/rbac.middleware');
const { validate } = require('../../shared/middleware/validate.middleware');
const { orderLimiter } = require('../../shared/middleware/rateLimiter.middleware');
const {
  createOrderSchema,
  assignAgentSchema,
  updateStatusSchema,
  cancelOrderSchema,
  listOrdersQuerySchema,
} = require('./order.validator');

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
  authorize('customer', 'admin'),
  validate({ body: cancelOrderSchema }),
  controller.cancelOrder
);

module.exports = router;
