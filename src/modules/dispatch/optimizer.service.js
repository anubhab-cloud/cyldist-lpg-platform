'use strict';

const { kmeans } = require('ml-kmeans');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../config/logger');
const config = require('../../config');
const { DispatchOrder, DeliveryAgent, DispatchRoute } = require('./dispatch.model');
const { geocodeAddress } = require('./geocoding.service');

// ═══════════════════════════════════════════════════════════════════════════════
// SMART DELIVERY OPTIMIZER SERVICE
//
// This module implements the core dispatch optimization pipeline:
//
// STAGE 1: Data Collection — Query pending orders + available agents
// STAGE 2: Geocoding — Resolve any text addresses to GeoJSON coordinates
// STAGE 3: K-Means Clustering — Partition orders into K spatial clusters
//          where K = number of available agents
// STAGE 4: Agent-Cluster Assignment — Match clusters to nearest agents
// STAGE 5: Route Sequencing — Within each cluster, apply Priority-Weighted
//          Nearest Neighbor Heuristic to determine optimal stop order
// STAGE 6: Directions API — Fetch polyline geometries from Ola Maps
// STAGE 7: Persist & Broadcast — Bulk write to MongoDB, emit via Socket.IO
//
// ALGORITHMIC COMPLEXITY:
//   - K-Means: O(n * k * i) where n=orders, k=agents, i=iterations
//   - Nearest Neighbor: O(m²) per cluster where m=orders in cluster
//   - Overall: O(n*k*i + Σ(mⱼ²)) — practical for <1000 orders
// ═══════════════════════════════════════════════════════════════════════════════

// Priority multiplier for distance weighting
// Lower multiplier = appears closer = gets visited first
const PRIORITY_WEIGHTS = {
  HIGH: 0.3,   // Hospitals, emergencies — 70% distance reduction
  MEDIUM: 0.7, // Standard urgent orders
  LOW: 1.0,    // Normal delivery — no modification
};

const OLA_DIRECTIONS_URL = 'https://api.olamaps.io/routing/v1/directions';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MAIN OPTIMIZATION PIPELINE
 *
 * Orchestrates the complete dispatch cycle. Designed to be called either:
 *  - Periodically via cron (every 5–10 minutes)
 *  - On-demand when admin triggers a dispatch batch
 *  - Automatically when pending order count exceeds a threshold
 *
 * @param {import('socket.io').Server} io - Socket.IO server instance for broadcasts
 * @param {Object} options
 * @param {string} [options.batchId] - Custom batch identifier
 * @param {number} [options.maxOrdersPerAgent] - Override max stops per agent
 * @returns {Promise<{routes: Array, stats: Object}>}
 * ═══════════════════════════════════════════════════════════════════════════════
 */
async function optimizeAndDispatchOrders(io, options = {}) {
  const batchId = options.batchId || new Date().toISOString().slice(0, 16);
  const maxOrdersPerAgent = options.maxOrdersPerAgent || 8;
  const startTime = Date.now();

  logger.info(`[Dispatch] Starting optimization batch: ${batchId}`);

  // ─────────────────────────────────────────────────────────────────────────
  // STAGE 1: DATA COLLECTION
  // ─────────────────────────────────────────────────────────────────────────

  const [pendingOrders, availableAgents] = await Promise.all([
    DispatchOrder.find({ status: 'pending' })
      .sort({ priority: -1, createdAt: 1 }) // HIGH priority first, then FIFO
      .limit(200) // Safety cap
      .lean(),
    DeliveryAgent.find({ status: 'available' })
      .sort({ rating: -1 })
      .lean(),
  ]);

  if (pendingOrders.length === 0) {
    logger.info('[Dispatch] No pending orders to process.');
    return { routes: [], stats: { orders: 0, agents: 0, elapsed: 0 } };
  }

  if (availableAgents.length === 0) {
    logger.warn('[Dispatch] No available agents. Orders remain in pending state.');
    return { routes: [], stats: { orders: pendingOrders.length, agents: 0, elapsed: 0 } };
  }

  logger.info(`[Dispatch] Found ${pendingOrders.length} pending orders, ${availableAgents.length} available agents.`);

  // ─────────────────────────────────────────────────────────────────────────
  // STAGE 2: GEOCODING (resolve any missing coordinates)
  // ─────────────────────────────────────────────────────────────────────────

  const ordersToGeocode = pendingOrders.filter(
    (o) => !o.location || !o.location.coordinates || o.location.coordinates[0] === 0
  );

  if (ordersToGeocode.length > 0) {
    logger.info(`[Dispatch] Geocoding ${ordersToGeocode.length} orders with missing coordinates...`);
    const geocodeOps = [];

    for (const order of ordersToGeocode) {
      try {
        const { lng, lat } = await geocodeAddress(order.addressText);
        geocodeOps.push({
          updateOne: {
            filter: { _id: order._id },
            update: {
              $set: {
                location: { type: 'Point', coordinates: [lng, lat] },
              },
            },
          },
        });
        // Update in-memory for this run
        order.location = { type: 'Point', coordinates: [lng, lat] };
      } catch (err) {
        logger.error(`[Dispatch] Geocode failed for order ${order.orderId}: ${err.message}`);
      }
    }

    if (geocodeOps.length > 0) {
      await DispatchOrder.bulkWrite(geocodeOps);
    }
  }

  // Filter out orders that still lack valid coordinates
  const geocodedOrders = pendingOrders.filter(
    (o) => o.location?.coordinates?.[0] !== 0 && o.location?.coordinates?.[1] !== 0
  );

  if (geocodedOrders.length === 0) {
    logger.warn('[Dispatch] No orders with valid coordinates after geocoding.');
    return { routes: [], stats: { orders: 0, agents: availableAgents.length, elapsed: Date.now() - startTime } };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STAGE 3: K-MEANS SPATIAL CLUSTERING
  //
  // The number of clusters K = min(availableAgents, geocodedOrders)
  // Each order is represented as a 2D vector [longitude, latitude].
  //
  // ml-kmeans uses Lloyd's algorithm with random initialization.
  // Complexity: O(n * k * iterations) — typically converges in 10–20 iterations.
  // ─────────────────────────────────────────────────────────────────────────

  const K = Math.min(availableAgents.length, geocodedOrders.length);
  const dataVectors = geocodedOrders.map((o) => o.location.coordinates); // [[lng, lat], ...]

  logger.info(`[Dispatch] Running K-Means with K=${K} on ${dataVectors.length} spatial vectors...`);

  const kmeansResult = kmeans(dataVectors, K, {
    initialization: 'kmeans++', // Better initial centroid selection
    maxIterations: 100,
    tolerance: 1e-6,
  });

  // Assign cluster IDs back to orders
  const clusteredOrders = geocodedOrders.map((order, idx) => ({
    ...order,
    clusterId: kmeansResult.clusters[idx],
  }));

  // Group orders by cluster
  const clusters = new Map();
  for (const order of clusteredOrders) {
    if (!clusters.has(order.clusterId)) {
      clusters.set(order.clusterId, []);
    }
    clusters.get(order.clusterId).push(order);
  }

  logger.info(`[Dispatch] K-Means produced ${clusters.size} clusters: ${[...clusters.values()].map((c) => c.length).join(', ')} orders each.`);

  // ─────────────────────────────────────────────────────────────────────────
  // STAGE 4: AGENT-CLUSTER ASSIGNMENT
  //
  // Strategy: Assign each cluster centroid to the nearest available agent.
  // Uses a greedy matching approach — assign closest pair first, then remove
  // both from the pool. O(K²) which is fine for practical agent counts.
  // ─────────────────────────────────────────────────────────────────────────

  const centroids = kmeansResult.centroids.map((c) => c.centroid || c);
  const agentAssignments = assignAgentsToClusters(centroids, availableAgents);

  logger.info(`[Dispatch] Agent assignments: ${JSON.stringify(agentAssignments.map((a) => ({ cluster: a.clusterId, agent: a.agent.name })))}`);

  // ─────────────────────────────────────────────────────────────────────────
  // STAGE 5: PRIORITY-WEIGHTED NEAREST NEIGHBOR ROUTE SEQUENCING
  //
  // For each cluster, starting from the agent's current position:
  //  1. Compute weighted distances from current position to all unvisited stops
  //  2. Weight = haversineDistance * PRIORITY_WEIGHTS[order.priority]
  //  3. Select the stop with minimum weighted distance
  //  4. Move to that stop, mark visited, repeat
  //
  // Complexity: O(m²) per cluster where m = orders in cluster
  // This is the Nearest Neighbor TSP heuristic — not globally optimal
  // but provides ~25% improvement over random and runs in polynomial time.
  // ─────────────────────────────────────────────────────────────────────────

  const routeResults = [];
  const bulkOps = [];

  for (const assignment of agentAssignments) {
    const { clusterId, agent } = assignment;
    const clusterOrders = clusters.get(clusterId) || [];

    if (clusterOrders.length === 0) continue;

    // Cap orders per agent
    const ordersToAssign = clusterOrders.slice(0, maxOrdersPerAgent);

    // Agent starting position
    const agentCoords = agent.currentLocation?.coordinates || [77.5946, 12.9716];

    // Run priority-weighted nearest neighbor
    const sequencedStops = priorityWeightedNearestNeighbor(agentCoords, ordersToAssign);

    // Build dispatch route document
    const routeId = `ROUTE-${batchId}-${agent._id.toString().slice(-6)}`;
    const stops = sequencedStops.map((stop, idx) => ({
      dispatchOrderId: stop._id,
      orderId: stop.orderId,
      sequence: idx + 1,
      location: stop.location,
      customerName: stop.customerName,
      priority: stop.priority,
      distanceMeters: Math.round(stop._computedDistance * 1000), // km→m
      durationSeconds: Math.round((stop._computedDistance / 25) * 3600), // ~25 km/h avg speed
    }));

    const totalDistance = stops.reduce((sum, s) => sum + s.distanceMeters, 0);
    const totalDuration = stops.reduce((sum, s) => sum + s.durationSeconds, 0);

    routeResults.push({
      routeId,
      agentId: agent._id,
      agentName: agent.name,
      dispatchBatchId: batchId,
      stops,
      totalDistanceMeters: totalDistance,
      totalDurationSeconds: totalDuration,
      totalStops: stops.length,
      status: 'computed',
    });

    // Build bulk write operations for order updates
    for (const stop of stops) {
      bulkOps.push({
        updateOne: {
          filter: { _id: stop.dispatchOrderId },
          update: {
            $set: {
              status: 'assigned',
              clusterId,
              assignedAgent: agent._id,
              deliverySequence: stop.sequence,
              dispatchBatchId: batchId,
              etaFromPrevious: stop.durationSeconds,
              distanceFromPrevious: stop.distanceMeters,
            },
          },
        },
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STAGE 6: OLA MAPS DIRECTIONS API (Route Polyline Geometry)
  //
  // For each route, request the actual road-network polyline from Ola Maps.
  // This provides the visual line overlay for the frontend map.
  // ─────────────────────────────────────────────────────────────────────────

  const olaApiKey = config.maps?.googleApiKey || process.env.OLA_MAPS_API_KEY || '';

  for (const route of routeResults) {
    try {
      const polyline = await fetchRoutePolyline(route, olaApiKey);
      if (polyline) {
        route.routeGeometry = {
          type: 'LineString',
          coordinates: polyline,
        };
      }
    } catch (err) {
      logger.warn(`[Dispatch] Could not fetch polyline for route ${route.routeId}: ${err.message}`);
      // Fallback: straight-line geometry from stops
      route.routeGeometry = {
        type: 'LineString',
        coordinates: route.stops.map((s) => s.location.coordinates),
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STAGE 7: PERSIST & BROADCAST
  // ─────────────────────────────────────────────────────────────────────────

  // Bulk update dispatch orders
  if (bulkOps.length > 0) {
    await DispatchOrder.bulkWrite(bulkOps, { ordered: false });
    logger.info(`[Dispatch] Bulk updated ${bulkOps.length} dispatch orders.`);
  }

  // Update agent statuses
  const agentUpdateOps = agentAssignments.map((a) => ({
    updateOne: {
      filter: { _id: a.agent._id },
      update: {
        $set: {
          status: 'busy',
          activeRouteId: routeResults.find((r) => r.agentId.equals(a.agent._id))?.routeId || null,
          assignedOrderCount: (clusters.get(a.clusterId) || []).length,
        },
      },
    },
  }));
  if (agentUpdateOps.length > 0) {
    await DeliveryAgent.bulkWrite(agentUpdateOps, { ordered: false });
  }

  // Save route documents
  const savedRoutes = await DispatchRoute.insertMany(routeResults, { ordered: false });
  logger.info(`[Dispatch] Saved ${savedRoutes.length} route documents.`);

  // Socket.IO broadcast to admin dashboard and agents
  if (io) {
    // Broadcast to admin room
    io.to('admin:room').emit('dispatch:batch_complete', {
      batchId,
      routeCount: savedRoutes.length,
      totalOrders: bulkOps.length,
      timestamp: new Date().toISOString(),
    });

    // Broadcast individual routes to assigned agents
    for (const route of routeResults) {
      io.to(`user:${route.agentId}`).emit('dispatch:route_assigned', {
        routeId: route.routeId,
        stops: route.stops,
        totalDistance: route.totalDistanceMeters,
        totalDuration: route.totalDurationSeconds,
        routeGeometry: route.routeGeometry,
      });
    }

    logger.info('[Dispatch] Broadcasted route assignments via Socket.IO.');
  }

  const elapsed = Date.now() - startTime;
  const stats = {
    batchId,
    orders: bulkOps.length,
    agents: agentAssignments.length,
    clusters: clusters.size,
    elapsed: `${elapsed}ms`,
  };

  logger.info(`[Dispatch] Optimization complete in ${elapsed}ms. ${JSON.stringify(stats)}`);
  return { routes: routeResults, stats };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIORITY-WEIGHTED NEAREST NEIGHBOR HEURISTIC
//
// Standard Nearest Neighbor TSP with a critical modification:
// The distance to HIGH priority stops is multiplied by 0.3, making them
// appear 70% closer — forcing the algorithm to visit them first even if
// they're geographically further away.
//
// @param {Array<number>} startCoords - [lng, lat] agent starting position
// @param {Array<Object>} orders - Array of DispatchOrder lean documents
// @returns {Array<Object>} - Sequenced orders with _computedDistance attached
//
// Complexity: O(m²) where m = number of orders
// ═══════════════════════════════════════════════════════════════════════════════

function priorityWeightedNearestNeighbor(startCoords, orders) {
  const sequenced = [];
  const remaining = [...orders];
  let currentPos = startCoords; // [lng, lat]

  while (remaining.length > 0) {
    let nearestIdx = -1;
    let nearestWeightedDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const order = remaining[i];
      const orderCoords = order.location.coordinates; // [lng, lat]

      // Haversine distance in kilometers
      const rawDistance = haversineKm(
        currentPos[1], currentPos[0], // lat, lng of current
        orderCoords[1], orderCoords[0] // lat, lng of order
      );

      // Apply priority weight — HIGH priority orders appear closer
      const weight = PRIORITY_WEIGHTS[order.priority] || 1.0;
      const weightedDistance = rawDistance * weight;

      if (weightedDistance < nearestWeightedDist) {
        nearestWeightedDist = weightedDistance;
        nearestIdx = i;
      }
    }

    if (nearestIdx === -1) break;

    const selected = remaining.splice(nearestIdx, 1)[0];
    selected._computedDistance = haversineKm(
      currentPos[1], currentPos[0],
      selected.location.coordinates[1], selected.location.coordinates[0]
    );
    sequenced.push(selected);
    currentPos = selected.location.coordinates;
  }

  return sequenced;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT-CLUSTER ASSIGNMENT (Greedy Nearest Centroid)
//
// For each cluster centroid, find the closest unassigned agent.
// Greedy approach: assign the globally closest (centroid, agent) pair first.
//
// Complexity: O(K² * A) where K=clusters, A=agents
// ═══════════════════════════════════════════════════════════════════════════════

function assignAgentsToClusters(centroids, agents) {
  const assignments = [];
  const usedAgents = new Set();
  const usedClusters = new Set();

  // Build all possible (cluster, agent) pairs with distances
  const pairs = [];
  for (let ci = 0; ci < centroids.length; ci++) {
    for (let ai = 0; ai < agents.length; ai++) {
      const agentCoords = agents[ai].currentLocation?.coordinates || [77.5946, 12.9716];
      const dist = haversineKm(
        centroids[ci][1], centroids[ci][0],
        agentCoords[1], agentCoords[0]
      );
      pairs.push({ clusterId: ci, agentIdx: ai, distance: dist });
    }
  }

  // Sort by distance ascending — assign closest pairs first
  pairs.sort((a, b) => a.distance - b.distance);

  for (const pair of pairs) {
    if (usedClusters.has(pair.clusterId) || usedAgents.has(pair.agentIdx)) continue;

    assignments.push({
      clusterId: pair.clusterId,
      agent: agents[pair.agentIdx],
      distance: pair.distance,
    });

    usedClusters.add(pair.clusterId);
    usedAgents.add(pair.agentIdx);

    if (assignments.length === centroids.length) break;
  }

  return assignments;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OLA MAPS DIRECTIONS API — FETCH POLYLINE
//
// Builds a waypoint list from the route stops and requests the actual
// road-following polyline geometry from Ola Maps Routing API.
//
// Returns: Array of [lng, lat] coordinate pairs forming the polyline.
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchRoutePolyline(route, apiKey) {
  if (!apiKey || route.stops.length < 2) return null;

  // Build origin, destination, and intermediate waypoints
  const origin = route.stops[0].location.coordinates; // [lng, lat]
  const destination = route.stops[route.stops.length - 1].location.coordinates;
  const waypoints = route.stops.slice(1, -1).map((s) => s.location.coordinates);

  try {
    const params = {
      origin: `${origin[1]},${origin[0]}`, // lat,lng format for Ola API
      destination: `${destination[1]},${destination[0]}`,
      api_key: apiKey,
      mode: 'driving',
      alternatives: false,
      steps: true,
      overview: 'full', // Request full polyline
    };

    if (waypoints.length > 0) {
      params.waypoints = waypoints
        .map((wp) => `${wp[1]},${wp[0]}`) // lat,lng
        .join('|');
    }

    const response = await axios.get(OLA_DIRECTIONS_URL, {
      params,
      timeout: 15000,
    });

    const routes = response.data?.routes;
    if (routes && routes.length > 0) {
      const geometry = routes[0].overview_polyline?.points;
      if (geometry) {
        // Decode Google-style encoded polyline to coordinate array
        const decoded = decodePolyline(geometry);
        return decoded.map(([lat, lng]) => [lng, lat]); // Convert to [lng, lat]
      }

      // Alternative: if legs contain step geometries
      const coordinates = [];
      for (const leg of routes[0].legs || []) {
        for (const step of leg.steps || []) {
          if (step.polyline?.points) {
            const stepCoords = decodePolyline(step.polyline.points);
            coordinates.push(...stepCoords.map(([lat, lng]) => [lng, lat]));
          }
        }
      }
      if (coordinates.length > 0) return coordinates;
    }

    return null;
  } catch (err) {
    logger.warn(`[Dispatch] Directions API request failed: ${err.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Haversine formula — Great-circle distance between two lat/lng points.
 * @returns {number} Distance in kilometers
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Decode Google-encoded polyline string into [[lat, lng], ...] array.
 * Reference: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
function decodePolyline(encoded) {
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

module.exports = {
  optimizeAndDispatchOrders,
  priorityWeightedNearestNeighbor,
  assignAgentsToClusters,
  haversineKm,
  PRIORITY_WEIGHTS,
};
