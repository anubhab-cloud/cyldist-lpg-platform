'use strict';

const { Router } = require('express');
const controller = require('./inventory.controller');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const { authorize } = require('../../shared/middleware/rbac.middleware');
const asyncHandler = require('../../shared/utils/asyncHandler');
const AppSettings = require('./appsettings.model');

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

// ─── Crisis Mode Settings ──────────────────────────────────────────────────
// IMPORTANT: Must be declared BEFORE /:id to prevent 'crisis-mode' being
// matched as a MongoDB ObjectId parameter (which causes a cast error).

// Any authenticated user can check if crisis mode is active (for customer UI)
router.get('/crisis-mode', asyncHandler(async (req, res) => {
  const settings = await AppSettings.getSingleton();
  res.json({ success: true, data: settings.crisisMode });
}));

// Only admin can enable/disable crisis mode
router.patch('/crisis-mode', authorize('admin'), asyncHandler(async (req, res) => {
  const { enabled, severity, message } = req.body;
  const update = { 'crisisMode.enabled': enabled };
  if (severity !== undefined) update['crisisMode.severity'] = severity;
  if (message !== undefined) update['crisisMode.message'] = message;
  if (enabled) {
    update['crisisMode.enabledBy'] = req.user.id;
    update['crisisMode.enabledAt'] = new Date();
  }

  const settings = await AppSettings.findOneAndUpdate(
    { key: 'global' },
    { $set: update },
    { new: true, upsert: true }
  ).lean();

  res.json({ success: true, data: settings.crisisMode });
}));

// Wildcard param routes ─ must come AFTER all named routes above
router.get('/:id', controller.getWarehouse);

// Write: admin only
router.post('/', authorize('admin'), controller.createWarehouse);
router.patch('/:id', authorize('admin'), controller.updateWarehouse);

module.exports = router;

