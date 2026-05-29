'use strict';

const asyncHandler = require('../../shared/utils/asyncHandler');
const AppError = require('../../shared/utils/AppError');
const { DispatchOrder, DeliveryAgent, DispatchRoute } = require('./dispatch.model');
const { optimizeAndDispatchOrders } = require('./optimizer.service');
const { geocodeAddress } = require('./geocoding.service');
const response = require('../../shared/utils/response');

// ═══════════════════════════════════════════════════════════════════════════════
// DISPATCH CONTROLLER
//
// HTTP endpoints for the Smart Delivery Assignment system.
// Admin-only routes for triggering optimization and viewing dispatch state.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /dispatch/optimize
 * Trigger the full optimization pipeline.
 * Admin-only. Queries pending orders, clusters, sequences, and dispatches.
 */
const triggerOptimization = asyncHandler(async (req, res) => {
  const io = req.app.get('io');
  const { batchId, maxOrdersPerAgent } = req.body;

  const result = await optimizeAndDispatchOrders(io, {
    batchId,
    maxOrdersPerAgent,
  });

  return response.success(res, 200, 'Dispatch optimization complete.', result);
});

/**
 * POST /dispatch/orders
 * Manually add an order to the dispatch queue (for testing or manual entry).
 * Automatically geocodes the address if coordinates are not provided.
 */
const createDispatchOrder = asyncHandler(async (req, res) => {
  const { orderId, orderRef, customerName, customerPhone, addressText, priority, location } = req.body;

  if (!orderId || !customerName || !addressText) {
    throw new AppError('orderId, customerName, and addressText are required.', 400);
  }

  let coords = location?.coordinates;

  // Geocode if coordinates not provided
  if (!coords || coords[0] === 0) {
    try {
      const geo = await geocodeAddress(addressText);
      coords = [geo.lng, geo.lat];
    } catch (geoErr) {
      // If geocoding fails, try to use a fallback or reject
      if (!coords) {
        throw new AppError(`Geocoding failed: ${geoErr.message}. Provide location.coordinates manually.`, 400);
      }
    }
  }

  const dispatchOrder = await DispatchOrder.create({
    orderId,
    orderRef: orderRef || null,
    customerName,
    customerPhone,
    addressText,
    priority: priority || 'LOW',
    location: {
      type: 'Point',
      coordinates: coords,
    },
    status: 'pending',
  });

  // Notify admin dashboard of new pending order
  const io = req.app.get('io');
  if (io) {
    io.to('admin:room').emit('dispatch:order_added', {
      orderId: dispatchOrder.orderId,
      customerName: dispatchOrder.customerName,
      priority: dispatchOrder.priority,
      coordinates: coords,
    });
  }

  return response.success(res, 201, 'Dispatch order created and geocoded.', dispatchOrder);
});

/**
 * GET /dispatch/orders
 * List dispatch orders with optional status filter.
 */
const listDispatchOrders = asyncHandler(async (req, res) => {
  const { status, batchId, limit = 50, page = 1 } = req.query;
  const filter = {};

  if (status) filter.status = status;
  if (batchId) filter.dispatchBatchId = batchId;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [orders, total] = await Promise.all([
    DispatchOrder.find(filter)
      .sort({ priority: -1, deliverySequence: 1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('assignedAgent', 'name phone status')
      .lean(),
    DispatchOrder.countDocuments(filter),
  ]);

  return response.success(res, 200, 'Dispatch orders fetched.', {
    orders,
    pagination: { page: parseInt(page), limit: parseInt(limit), total },
  });
});

/**
 * GET /dispatch/routes
 * List computed dispatch routes.
 */
const listRoutes = asyncHandler(async (req, res) => {
  const { batchId, agentId, status } = req.query;
  const filter = {};

  if (batchId) filter.dispatchBatchId = batchId;
  if (agentId) filter.agentId = agentId;
  if (status) filter.status = status;

  const routes = await DispatchRoute.find(filter)
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('agentId', 'name phone status currentLocation')
    .lean();

  return response.success(res, 200, 'Dispatch routes fetched.', routes);
});

/**
 * GET /dispatch/routes/:routeId
 * Get a single route with full stop details and polyline.
 */
const getRoute = asyncHandler(async (req, res) => {
  const route = await DispatchRoute.findOne({ routeId: req.params.routeId })
    .populate('agentId', 'name phone status currentLocation')
    .lean();

  if (!route) throw new AppError('Route not found.', 404);

  return response.success(res, 200, 'Route fetched.', route);
});

/**
 * POST /dispatch/agents
 * Register or update a delivery agent in the dispatch system.
 */
const upsertAgent = asyncHandler(async (req, res) => {
  const { userId, name, phone, vehicleType, maxCapacity, currentLocation } = req.body;

  if (!userId || !name) {
    throw new AppError('userId and name are required.', 400);
  }

  const agent = await DeliveryAgent.findOneAndUpdate(
    { userId },
    {
      name,
      phone,
      vehicleType: vehicleType || 'bike',
      maxCapacity: maxCapacity || 4,
      ...(currentLocation && {
        currentLocation: {
          type: 'Point',
          coordinates: currentLocation,
        },
      }),
    },
    { upsert: true, new: true }
  );

  return response.success(res, 200, 'Agent registered/updated.', agent);
});

/**
 * GET /dispatch/agents
 * List all delivery agents with their current status and location.
 */
const listAgents = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};

  const agents = await DeliveryAgent.find(filter)
    .sort({ status: 1, rating: -1 })
    .lean();

  return response.success(res, 200, 'Agents fetched.', agents);
});

/**
 * PATCH /dispatch/agents/:agentId/status
 * Update agent availability status.
 */
const updateAgentStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['available', 'busy', 'offline', 'returning'];

  if (!validStatuses.includes(status)) {
    throw new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
  }

  const agent = await DeliveryAgent.findByIdAndUpdate(
    req.params.agentId,
    { status },
    { new: true }
  );

  if (!agent) throw new AppError('Agent not found.', 404);

  // Broadcast status change to admin
  const io = req.app.get('io');
  if (io) {
    io.to('admin:room').emit('dispatch:agent_status_changed', {
      agentId: agent._id,
      name: agent.name,
      status: agent.status,
    });
  }

  return response.success(res, 200, 'Agent status updated.', agent);
});

/**
 * GET /dispatch/stats
 * Get dispatch system statistics.
 */
const getStats = asyncHandler(async (req, res) => {
  const [
    pendingOrders,
    assignedOrders,
    availableAgents,
    busyAgents,
    totalRoutes,
  ] = await Promise.all([
    DispatchOrder.countDocuments({ status: 'pending' }),
    DispatchOrder.countDocuments({ status: 'assigned' }),
    DeliveryAgent.countDocuments({ status: 'available' }),
    DeliveryAgent.countDocuments({ status: 'busy' }),
    DispatchRoute.countDocuments(),
  ]);

  return response.success(res, 200, 'Dispatch stats.', {
    pendingOrders,
    assignedOrders,
    availableAgents,
    busyAgents,
    totalRoutes,
  });
});

module.exports = {
  triggerOptimization,
  createDispatchOrder,
  listDispatchOrders,
  listRoutes,
  getRoute,
  upsertAgent,
  listAgents,
  updateAgentStatus,
  getStats,
};
