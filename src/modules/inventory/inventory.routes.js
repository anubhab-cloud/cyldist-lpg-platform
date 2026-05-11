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

// Read: any authenticated user can list/view warehouses (customers need this for booking)
router.get('/', controller.listWarehouses);
router.get('/low-stock', authorize('admin'), controller.getLowStock);
router.get('/:id', controller.getWarehouse);

// Write: admin only
router.post('/', authorize('admin'), controller.createWarehouse);
router.patch('/:id', authorize('admin'), controller.updateWarehouse);

module.exports = router;
