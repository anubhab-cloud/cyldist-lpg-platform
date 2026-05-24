'use strict';

const express = require('express');
const { getProducts } = require('./product.controller');
const { authenticate } = require('../../shared/middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);
router.get('/', getProducts);

module.exports = router;
