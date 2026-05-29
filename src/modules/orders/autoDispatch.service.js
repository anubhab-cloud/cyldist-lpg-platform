'use strict';

const { kmeans } = require('ml-kmeans');
const Order = require('./order.model');
const User = require('../users/user.model');
const orderService = require('./order.service');
const logger = require('../../config/logger');

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-DISPATCH SERVICE
//
// One-click automated order assignment for the Admin.
// Works directly with the main Order and User models — no separate dispatch DB.
//
// Flow:
//  1. Fetch all orders with status 'created' (unassigned)
//  2. Fetch all agents who are active & on duty
//  3. K-Means cluster orders by delivery coordinates (K = agent count)
//  4. Greedily assign each cluster to the nearest agent
//  5. Within each cluster, sequence by priority-weighted nearest-neighbor
//  6. Call orderService.assignAgent() for each — triggers notifications, OTP, etc.
//  7. Socket broadcast the results
//
// This is the PRODUCTION flow — one API call from admin, everything is automated.
// ═══════════════════════════════════════════════════════════════════════════════

const PRIORITY_WEIGHTS = { urgent: 0.3, medium: 0.7, normal: 1.0 };

/**
 * Auto-dispatch all unassigned orders to available agents.
 *
 * @param {string} adminId - The admin user triggering the dispatch
 * @param {import('socket.io').Server} io - Socket.IO instance
 * @returns {Promise<Object>} Assignment results
 */
async function autoDispatchOrders(adminId, io) {
  const startTime = Date.now();

  // ── 1. Get unassigned orders with delivery coordinates ──
  const pendingOrders = await Order.find({ status: 'created' })
    .populate('customerId', 'name phone')
    .sort({ priority: -1, createdAt: 1 })
    .lean();

  if (pendingOrders.length === 0) {
    return { success: true, message: 'No unassigned orders to dispatch.', assignments: [], stats: { orders: 0, agents: 0, elapsed: '0ms' } };
  }

  // ── 2. Get available agents (active + on duty) ──
  const agents = await User.find({ role: 'agent', isActive: true, isOnDuty: true })
    .select('name phone location')
    .lean();

  if (agents.length === 0) {
    return { success: false, message: 'No agents available (on duty). Cannot auto-dispatch.', assignments: [], stats: { orders: pendingOrders.length, agents: 0, elapsed: '0ms' } };
  }

  logger.info(`[AutoDispatch] ${pendingOrders.length} orders → ${agents.length} agents`);

  // ── 3. Extract coordinates for clustering ──
  // Use delivery address coordinates; skip orders without valid coords
  const ordersWithCoords = pendingOrders.filter(o => {
    const loc = o.deliveryAddress?.location;
    return loc && loc.lat && loc.lng;
  });

  if (ordersWithCoords.length === 0) {
    return { success: false, message: 'No orders have valid delivery coordinates. Please ensure addresses have lat/lng.', assignments: [], stats: { orders: pendingOrders.length, agents: 0, elapsed: '0ms' } };
  }

  // ── 4. K-Means Clustering ──
  const K = Math.min(agents.length, ordersWithCoords.length);
  const vectors = ordersWithCoords.map(o => [o.deliveryAddress.location.lng, o.deliveryAddress.location.lat]);

  const kResult = kmeans(vectors, K, { initialization: 'kmeans++', maxIterations: 100 });

  // Group orders by cluster
  const clusters = new Map();
  ordersWithCoords.forEach((order, idx) => {
    const cid = kResult.clusters[idx];
    if (!clusters.has(cid)) clusters.set(cid, []);
    clusters.get(cid).push(order);
  });

  // ── 5. Assign clusters to nearest agents ──
  const centroids = kResult.centroids.map(c => c.centroid || c);
  const agentAssignments = greedyAssignAgents(centroids, agents);

  // ── 6. Sequence & Assign ──
  const assignments = [];
  const errors = [];

  for (const { clusterId, agent } of agentAssignments) {
    const clusterOrders = clusters.get(clusterId) || [];
    if (clusterOrders.length === 0) continue;

    // Priority-weighted nearest neighbor sequencing
    const agentCoords = [agent.location?.lng || 77.5946, agent.location?.lat || 12.9716];
    const sequenced = nearestNeighborSequence(agentCoords, clusterOrders);

    // Assign each order to this agent via the standard service
    for (let i = 0; i < sequenced.length; i++) {
      const order = sequenced[i];
      try {
        const etaMinutes = 20 + (i * 10); // rough ETA: 20 min base + 10 min per stop
        const estimatedDeliveryTime = new Date(Date.now() + etaMinutes * 60 * 1000);

        await orderService.assignAgent(order.orderId, agent._id.toString(), estimatedDeliveryTime, adminId);

        assignments.push({
          orderId: order.orderId,
          customerName: order.customerId?.name || 'Customer',
          agentName: agent.name,
          agentId: agent._id,
          sequence: i + 1,
          priority: order.priority,
          address: `${order.deliveryAddress?.line1}, ${order.deliveryAddress?.city}`,
        });
      } catch (err) {
        logger.warn(`[AutoDispatch] Failed to assign ${order.orderId} to ${agent.name}: ${err.message}`);
        errors.push({ orderId: order.orderId, error: err.message });
      }
    }
  }

  const elapsed = `${Date.now() - startTime}ms`;
  logger.info(`[AutoDispatch] Complete: ${assignments.length} assigned, ${errors.length} errors in ${elapsed}`);

  // ── 7. Socket broadcast ──
  if (io) {
    io.to('admin:room').emit('dispatch:auto_complete', {
      totalAssigned: assignments.length,
      totalErrors: errors.length,
      assignments,
      elapsed,
    });

    // Notify each agent individually
    const agentGroups = {};
    for (const a of assignments) {
      if (!agentGroups[a.agentId]) agentGroups[a.agentId] = [];
      agentGroups[a.agentId].push(a);
    }
    for (const [agentId, orders] of Object.entries(agentGroups)) {
      io.to(`user:${agentId}`).emit('dispatch:orders_assigned', {
        count: orders.length,
        orders: orders.map(o => ({ orderId: o.orderId, sequence: o.sequence, address: o.address, priority: o.priority })),
      });
    }
  }

  return {
    success: true,
    message: `Auto-dispatched ${assignments.length} orders to ${agentAssignments.length} agents in ${elapsed}.`,
    assignments,
    errors,
    stats: {
      orders: assignments.length,
      agents: agentAssignments.length,
      clusters: clusters.size,
      elapsed,
    },
  };
}

// ── Greedy Agent-Cluster Matching ──
function greedyAssignAgents(centroids, agents) {
  const pairs = [];
  for (let ci = 0; ci < centroids.length; ci++) {
    for (let ai = 0; ai < agents.length; ai++) {
      const agentCoords = [agents[ai].location?.lng || 77.5946, agents[ai].location?.lat || 12.9716];
      const dist = haversine(centroids[ci][1], centroids[ci][0], agentCoords[1], agentCoords[0]);
      pairs.push({ clusterId: ci, agentIdx: ai, distance: dist });
    }
  }
  pairs.sort((a, b) => a.distance - b.distance);

  const usedAgents = new Set();
  const usedClusters = new Set();
  const result = [];

  for (const p of pairs) {
    if (usedClusters.has(p.clusterId) || usedAgents.has(p.agentIdx)) continue;
    result.push({ clusterId: p.clusterId, agent: agents[p.agentIdx] });
    usedClusters.add(p.clusterId);
    usedAgents.add(p.agentIdx);
    if (result.length === centroids.length) break;
  }

  return result;
}

// ── Priority-Weighted Nearest Neighbor ──
function nearestNeighborSequence(startCoords, orders) {
  const sequenced = [];
  const remaining = [...orders];
  let current = startCoords; // [lng, lat]

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const o = remaining[i];
      const loc = o.deliveryAddress?.location;
      if (!loc) continue;
      const raw = haversine(current[1], current[0], loc.lat, loc.lng);
      const weight = PRIORITY_WEIGHTS[o.priority] || 1.0;
      const weighted = raw * weight;
      if (weighted < nearestDist) {
        nearestDist = weighted;
        nearestIdx = i;
      }
    }

    const selected = remaining.splice(nearestIdx, 1)[0];
    sequenced.push(selected);
    const loc = selected.deliveryAddress?.location;
    if (loc) current = [loc.lng, loc.lat];
  }

  return sequenced;
}

// ── Haversine Distance (km) ──
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = { autoDispatchOrders };
