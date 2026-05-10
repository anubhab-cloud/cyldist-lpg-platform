'use strict';

const { Router } = require('express');
const controller = require('./inventory.controller');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const { authorize } = require('../../shared/middleware/rbac.middleware');

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /inventory:
 *   get:
 *     summary: List all warehouses
 *     tags: [Inventory]
 *   post:
 *     summary: Create a new warehouse (Admin)
 *     tags: [Inventory]
 * /inventory/low-stock:
 *   get:
 *     summary: Get warehouses with low stock (Admin)
 *     tags: [Inventory]
 * /inventory/{id}:
 *   get:
 *     summary: Get a single warehouse
 *     tags: [Inventory]
 *   patch:
 *     summary: Update warehouse / restock (Admin)
 *     tags: [Inventory]
 */

router.get('/', authorize('admin'), controller.listWarehouses);
router.get('/low-stock', authorize('admin'), controller.getLowStock);
router.get('/:id', authorize('admin'), controller.getWarehouse);
router.post('/', authorize('admin'), controller.createWarehouse);
router.patch('/:id', authorize('admin'), controller.updateWarehouse);

module.exports = router;
