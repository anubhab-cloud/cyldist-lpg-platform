'use strict';

const express = require('express');
const { getActiveCoupons } = require('./coupon.controller');
const { authenticate } = require('../../shared/middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);
router.get('/active', getActiveCoupons);

module.exports = router;
