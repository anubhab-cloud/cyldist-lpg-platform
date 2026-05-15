'use strict';

const { Router } = require('express');
const controller = require('./support.controller');
const { validate } = require('../../shared/middleware/validate.middleware');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const { authorize } = require('../../shared/middleware/rbac.middleware');
const { createComplaintSchema, updateComplaintSchema } = require('./support.validator');

const router = Router();

// All support routes require authentication
router.use(authenticate);

// Customers raise complaints and view their own
router.post(
  '/complaints',
  authorize('customer'),
  validate({ body: createComplaintSchema }),
  controller.createComplaint
);

// Both customers and admins can view complaints (service filters based on role)
router.get('/complaints', controller.getComplaints);
router.get('/complaints/:id', controller.getComplaintById);

// Admins update complaints
router.patch(
  '/complaints/:id',
  authorize('admin'),
  validate({ body: updateComplaintSchema }),
  controller.updateComplaint
);

module.exports = router;
