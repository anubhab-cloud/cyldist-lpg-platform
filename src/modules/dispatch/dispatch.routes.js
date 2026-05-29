'use strict';

const { Router } = require('express');
const controller = require('./dispatch.controller');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const { authorize } = require('../../shared/middleware/rbac.middleware');

const router = Router();

// All dispatch routes require authentication
router.use(authenticate);

// ── Optimization Engine ──
router.post('/optimize', authorize('admin'), controller.triggerOptimization);

// ── Dispatch Orders ──
router.post('/orders', authorize('admin'), controller.createDispatchOrder);
router.get('/orders', authorize('admin', 'agent'), controller.listDispatchOrders);

// ── Routes ──
router.get('/routes', authorize('admin', 'agent'), controller.listRoutes);
router.get('/routes/:routeId', authorize('admin', 'agent'), controller.getRoute);

// ── Agents ──
router.post('/agents', authorize('admin'), controller.upsertAgent);
router.get('/agents', authorize('admin'), controller.listAgents);
router.patch('/agents/:agentId/status', authorize('admin', 'agent'), controller.updateAgentStatus);

// ── Stats ──
router.get('/stats', authorize('admin'), controller.getStats);

module.exports = router;
