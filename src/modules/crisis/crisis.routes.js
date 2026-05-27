'use strict';

const { Router } = require('express');
const asyncHandler  = require('../../shared/utils/asyncHandler');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const { authorize }   = require('../../shared/middleware/rbac.middleware');
const crisisService   = require('./crisis.service');
const AppSettings     = require('../inventory/appsettings.model');

const router = Router();
router.use(authenticate);

// ─── ADMIN ROUTES ────────────────────────────────────────────────────────────

/**
 * GET /crisis/pool
 * Live preview of all orders awaiting allocation, pre-sorted by score.
 * Admin use: shows who is in the pool before running the batch.
 */
router.get('/pool', authorize('admin'), asyncHandler(async (req, res) => {
  const pool = await crisisService.getPoolWithPreviewScores();
  res.json({ success: true, count: pool.length, data: pool });
}));

/**
 * GET /crisis/leaderboard
 * Results of the last (or specified) batch run.
 * Query: ?batchId=2024-06-01
 */
router.get('/leaderboard', authorize('admin'), asyncHandler(async (req, res) => {
  const leaderboard = await crisisService.getLastLeaderboard(req.query.batchId || null);
  const settings    = await AppSettings.getSingleton();
  res.json({
    success: true,
    count:   leaderboard.length,
    data:    leaderboard,
    lastBatchSummary: settings.crisisMode?.lastBatchSummary ?? null,
    lastBatchRunAt:   settings.crisisMode?.lastBatchRunAt   ?? null,
    currentBatchId:   settings.crisisMode?.currentBatchId   ?? null,
  });
}));

/**
 * POST /crisis/batch/run
 * Trigger the batch allocation engine manually.
 * Admin only. Requires crisis mode to be enabled.
 */
router.post('/batch/run', authorize('admin'), asyncHandler(async (req, res) => {
  const io = req.app.get('io');
  const result = await crisisService.runBatchAllocation(req.user.id, io);
  res.json({ success: true, data: result });
}));

/**
 * GET /crisis/batch/status
 * Returns the status/summary of the last batch run from AppSettings.
 */
router.get('/batch/status', authorize('admin'), asyncHandler(async (req, res) => {
  const settings = await AppSettings.getSingleton();
  const cm = settings.crisisMode;
  res.json({
    success: true,
    data: {
      crisisModeEnabled:    cm.enabled,
      currentBatchId:       cm.currentBatchId,
      lastBatchRunAt:       cm.lastBatchRunAt,
      lastBatchSummary:     cm.lastBatchSummary,
      batchWindowStartHour: cm.batchWindowStartHour,
      batchWindowEndHour:   cm.batchWindowEndHour,
      emergencyReservePercent:     cm.emergencyReservePercent,
      hotelCapReductionPercent:    cm.hotelCapReductionPercent,
      householdCrisisCooldownDays: cm.householdCrisisCooldownDays,
      hotelCrisisCooldownDays:     cm.hotelCrisisCooldownDays,
      hoardingThresholdDays:       cm.hoardingThresholdDays,
    },
  });
}));

/**
 * PATCH /crisis/batch/config
 * Update batch window config (start/end hours, reserve %, caps, etc.)
 * Admin only.
 */
router.patch('/batch/config', authorize('admin'), asyncHandler(async (req, res) => {
  const {
    batchWindowStartHour, batchWindowEndHour,
    emergencyReservePercent, hotelCapReductionPercent,
    householdCrisisCooldownDays, hotelCrisisCooldownDays, hoardingThresholdDays,
  } = req.body;

  const update = {};
  if (batchWindowStartHour   !== undefined) update['crisisMode.batchWindowStartHour']   = batchWindowStartHour;
  if (batchWindowEndHour     !== undefined) update['crisisMode.batchWindowEndHour']     = batchWindowEndHour;
  if (emergencyReservePercent    !== undefined) update['crisisMode.emergencyReservePercent']    = emergencyReservePercent;
  if (hotelCapReductionPercent   !== undefined) update['crisisMode.hotelCapReductionPercent']   = hotelCapReductionPercent;
  if (householdCrisisCooldownDays !== undefined) update['crisisMode.householdCrisisCooldownDays'] = householdCrisisCooldownDays;
  if (hotelCrisisCooldownDays    !== undefined) update['crisisMode.hotelCrisisCooldownDays']    = hotelCrisisCooldownDays;
  if (hoardingThresholdDays      !== undefined) update['crisisMode.hoardingThresholdDays']      = hoardingThresholdDays;

  const settings = await AppSettings.findOneAndUpdate(
    { key: 'global' },
    { $set: update },
    { new: true, upsert: true }
  ).lean();

  res.json({ success: true, data: settings.crisisMode });
}));

// ─── CUSTOMER ROUTES ─────────────────────────────────────────────────────────

/**
 * GET /crisis/my-status
 * Customer's own priority position in the current batch pool.
 */
router.get('/my-status', asyncHandler(async (req, res) => {
  const position = await crisisService.getCustomerCrisisPosition(req.user.id);
  res.json({ success: true, data: position });
}));

module.exports = router;
