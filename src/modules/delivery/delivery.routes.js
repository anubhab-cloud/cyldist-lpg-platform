'use strict';

const { Router } = require('express');
const controller = require('./delivery.controller');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const { authorize } = require('../../shared/middleware/rbac.middleware');

const router = Router();

router.use(authenticate);

router.get('/:orderId/location', authorize('customer', 'admin'), controller.getAgentLocation);
router.get('/:orderId/route', authorize('customer', 'admin'), controller.getDeliveryRoute);

module.exports = router;
