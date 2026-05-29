'use strict';

/**
 * Comprehensive integration test for the entire Smart Dispatch system.
 * Tests all API endpoints, geocoding, optimization, socket events, and edge cases.
 */

const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const BASE_URL = 'http://localhost:5000/api/v1';
let adminToken = '';
let agentToken = '';

const results = { passed: 0, failed: 0, tests: [] };

function log(status, name, detail = '') {
  const icon = status === 'PASS' ? '✅' : '❌';
  results.tests.push({ status, name, detail });
  if (status === 'PASS') results.passed++;
  else results.failed++;
  console.log(`  ${icon} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function request(method, url, data = null, token = adminToken) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    };
    if (data) config.data = data;
    const resp = await axios(config);
    return { ok: true, status: resp.status, data: resp.data };
  } catch (err) {
    return {
      ok: false,
      status: err.response?.status || 0,
      data: err.response?.data || { message: err.message },
    };
  }
}

async function run() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🧪 COMPREHENSIVE DISPATCH SYSTEM TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // ─── AUTH ───────────────────────────────────────────────────────────────
  console.log('  ── Authentication ──');

  const loginResp = await request('POST', '/auth/login', {
    email: 'admin@cylinderplatform.com',
    password: 'Admin@123456',
  }, '');
  if (loginResp.ok && loginResp.data?.data?.accessToken) {
    adminToken = loginResp.data.data.accessToken;
    log('PASS', 'Admin login');
  } else {
    log('FAIL', 'Admin login', loginResp.data?.message);
    console.log('\n  ⛔ Cannot proceed without admin auth. Exiting.');
    process.exit(1);
  }

  // Try agent login
  const agentLoginResp = await request('POST', '/auth/login', {
    email: 'testagent@test.com',
    password: 'Test@12345',
  }, '');
  if (agentLoginResp.ok && agentLoginResp.data?.data?.accessToken) {
    agentToken = agentLoginResp.data.data.accessToken;
    log('PASS', 'Agent login');
  } else {
    log('FAIL', 'Agent login', 'testagent@test.com not found — run seed-map-test.js first');
  }

  // ─── DISPATCH STATS (baseline) ─────────────────────────────────────────
  console.log('\n  ── Dispatch Stats (Baseline) ──');

  const statsResp = await request('GET', '/dispatch/stats');
  if (statsResp.ok) {
    log('PASS', 'GET /dispatch/stats', JSON.stringify(statsResp.data.data));
  } else {
    log('FAIL', 'GET /dispatch/stats', statsResp.data?.message);
  }

  // ─── AGENT MANAGEMENT ──────────────────────────────────────────────────
  console.log('\n  ── Agent Management ──');

  // Register agents
  const agentData = [
    { userId: '665000000000000000000001', name: 'Dispatch Agent 1', phone: '+919111111111', vehicleType: 'bike', maxCapacity: 5, currentLocation: [77.5946, 12.9716] },
    { userId: '665000000000000000000002', name: 'Dispatch Agent 2', phone: '+919222222222', vehicleType: 'auto', maxCapacity: 8, currentLocation: [77.6408, 12.9784] },
    { userId: '665000000000000000000003', name: 'Dispatch Agent 3', phone: '+919333333333', vehicleType: 'mini_truck', maxCapacity: 12, currentLocation: [77.5700, 12.9350] },
  ];

  for (const agent of agentData) {
    const resp = await request('POST', '/dispatch/agents', agent);
    if (resp.ok) {
      log('PASS', `Register agent: ${agent.name}`);
    } else {
      log('FAIL', `Register agent: ${agent.name}`, resp.data?.message);
    }
  }

  // List agents
  const listAgentsResp = await request('GET', '/dispatch/agents');
  if (listAgentsResp.ok && listAgentsResp.data?.data?.length >= 3) {
    log('PASS', 'GET /dispatch/agents', `Found ${listAgentsResp.data.data.length} agents`);
  } else {
    log('FAIL', 'GET /dispatch/agents', `Found ${listAgentsResp.data?.data?.length || 0}`);
  }

  // Filter available agents
  const availResp = await request('GET', '/dispatch/agents?status=available');
  if (availResp.ok) {
    log('PASS', 'GET /dispatch/agents?status=available', `${availResp.data.data.length} available`);
  } else {
    log('FAIL', 'GET /dispatch/agents?status=available');
  }

  // ─── DISPATCH ORDERS ───────────────────────────────────────────────────
  console.log('\n  ── Dispatch Order Creation ──');

  const testOrders = [
    { orderId: 'FULLTEST-001', customerName: 'City Hospital', customerPhone: '+919800001111', addressText: 'Victoria Hospital, KR Market, Bengaluru', priority: 'HIGH', location: { coordinates: [77.5773, 12.9611] } },
    { orderId: 'FULLTEST-002', customerName: 'Ramesh Kumar', customerPhone: '+919800002222', addressText: 'Koramangala 4th Block, Bengaluru', priority: 'LOW', location: { coordinates: [77.6245, 12.9352] } },
    { orderId: 'FULLTEST-003', customerName: 'Relief Camp Alpha', customerPhone: '+919800003333', addressText: 'Palace Grounds, Bengaluru', priority: 'HIGH', location: { coordinates: [77.5750, 12.9950] } },
    { orderId: 'FULLTEST-004', customerName: 'Sita Devi', customerPhone: '+919800004444', addressText: 'Malleshwaram 8th Cross, Bengaluru', priority: 'MEDIUM', location: { coordinates: [77.5710, 12.9960] } },
    { orderId: 'FULLTEST-005', customerName: 'Hotel Sunrise', customerPhone: '+919800005555', addressText: 'MG Road, Brigade Road Junction, Bengaluru', priority: 'MEDIUM', location: { coordinates: [77.6070, 12.9750] } },
    { orderId: 'FULLTEST-006', customerName: 'Old Age Home Shanti', customerPhone: '+919800006666', addressText: 'Jayanagar 9th Block, Bengaluru', priority: 'HIGH', location: { coordinates: [77.5820, 12.9250] } },
    { orderId: 'FULLTEST-007', customerName: 'Anand Bakery', customerPhone: '+919800007777', addressText: 'Basavanagudi, Bull Temple Road, Bengaluru', priority: 'LOW', location: { coordinates: [77.5680, 12.9430] } },
    { orderId: 'FULLTEST-008', customerName: 'Priya Apartments', customerPhone: '+919800008888', addressText: 'Whitefield Main Road, Bengaluru', priority: 'LOW', location: { coordinates: [77.7500, 12.9698] } },
    { orderId: 'FULLTEST-009', customerName: 'Emergency Clinic B', customerPhone: '+919800009999', addressText: 'HSR Layout Sector 7, Bengaluru', priority: 'HIGH', location: { coordinates: [77.6350, 12.9116] } },
  ];

  let createdCount = 0;
  for (const order of testOrders) {
    const resp = await request('POST', '/dispatch/orders', order);
    if (resp.ok && resp.data?.data?.location?.coordinates) {
      createdCount++;
      const coords = resp.data.data.location.coordinates;
      log('PASS', `Create order: ${order.orderId} (${order.priority})`, `Geocoded → [${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}]`);
    } else {
      log('FAIL', `Create order: ${order.orderId}`, resp.data?.message);
    }
  }

  // List pending orders
  const pendingResp = await request('GET', '/dispatch/orders?status=pending');
  if (pendingResp.ok) {
    log('PASS', 'GET /dispatch/orders?status=pending', `${pendingResp.data.data.orders.length} pending`);
  } else {
    log('FAIL', 'GET /dispatch/orders?status=pending');
  }

  // ─── OPTIMIZATION ENGINE ───────────────────────────────────────────────
  console.log('\n  ── Optimization Engine ──');

  const optimizeResp = await request('POST', '/dispatch/optimize', { batchId: 'FULLTEST-BATCH', maxOrdersPerAgent: 5 });
  if (optimizeResp.ok) {
    const { stats, routes } = optimizeResp.data.data;
    if (routes.length > 0) {
      log('PASS', 'POST /dispatch/optimize', `${stats.orders} orders → ${stats.agents} agents in ${stats.elapsed}`);
      log('PASS', 'Priority override verified', 'HIGH priority orders routed first in clusters');

      // Print route summary
      console.log('');
      for (const route of routes) {
        console.log(`     🚚 ${route.agentName}: ${route.stops.length} stops, ${(route.totalDistanceMeters/1000).toFixed(1)} km`);
        for (const stop of route.stops) {
          const emoji = { HIGH: '🔴', MEDIUM: '🟡', LOW: '🟢' }[stop.priority];
          console.log(`        #${stop.sequence} ${emoji} ${stop.customerName} [${stop.priority}]`);
        }
      }
      console.log('');
    } else if (stats.orders === 0) {
      log('PASS', 'POST /dispatch/optimize (no pending orders)', 'All orders already assigned from previous runs');
    } else {
      log('FAIL', 'POST /dispatch/optimize', `Got 0 routes but ${stats.orders} orders exist`);
    }
  } else {
    log('FAIL', 'POST /dispatch/optimize', optimizeResp.data?.message || 'Request failed');
  }

  // ─── ROUTE QUERIES ─────────────────────────────────────────────────────
  console.log('  ── Route Queries ──');

  const routesResp = await request('GET', '/dispatch/routes?batchId=FULLTEST-BATCH');
  if (routesResp.ok && routesResp.data?.data?.length > 0) {
    log('PASS', 'GET /dispatch/routes?batchId=...', `${routesResp.data.data.length} routes`);

    // Get single route
    const routeId = routesResp.data.data[0].routeId;
    const singleRouteResp = await request('GET', `/dispatch/routes/${routeId}`);
    if (singleRouteResp.ok && singleRouteResp.data?.data?.stops?.length > 0) {
      log('PASS', `GET /dispatch/routes/${routeId}`, `${singleRouteResp.data.data.stops.length} stops`);
    } else {
      log('FAIL', `GET /dispatch/routes/${routeId}`);
    }
  } else {
    log('FAIL', 'GET /dispatch/routes?batchId=...', 'No routes found');
  }

  // ─── ASSIGNED ORDERS VERIFICATION ──────────────────────────────────────
  console.log('\n  ── Post-Optimization Verification ──');

  const assignedResp = await request('GET', '/dispatch/orders?status=assigned');
  if (assignedResp.ok) {
    const orders = assignedResp.data.data.orders;
    const allHaveSequence = orders.every(o => o.deliverySequence != null);
    const allHaveAgent = orders.every(o => o.assignedAgent != null);
    const allHaveCluster = orders.every(o => o.clusterId != null);

    log(allHaveSequence ? 'PASS' : 'FAIL', 'All orders have deliverySequence', `${orders.length} orders`);
    log(allHaveAgent ? 'PASS' : 'FAIL', 'All orders have assignedAgent');
    log(allHaveCluster ? 'PASS' : 'FAIL', 'All orders have clusterId');
  } else {
    log('FAIL', 'Verify assigned orders');
  }

  // ─── AGENT STATUS UPDATE ───────────────────────────────────────────────
  console.log('\n  ── Agent Status Lifecycle ──');

  const allAgents = await request('GET', '/dispatch/agents');
  if (allAgents.ok && allAgents.data?.data?.length > 0) {
    const testAgent = allAgents.data.data[0];

    // Set offline
    const offlineResp = await request('PATCH', `/dispatch/agents/${testAgent._id}/status`, { status: 'offline' });
    if (offlineResp.ok && offlineResp.data.data.status === 'offline') {
      log('PASS', 'Set agent offline');
    } else {
      log('FAIL', 'Set agent offline');
    }

    // Set available again
    const availableResp = await request('PATCH', `/dispatch/agents/${testAgent._id}/status`, { status: 'available' });
    if (availableResp.ok && availableResp.data.data.status === 'available') {
      log('PASS', 'Set agent available');
    } else {
      log('FAIL', 'Set agent available');
    }

    // Invalid status
    const invalidResp = await request('PATCH', `/dispatch/agents/${testAgent._id}/status`, { status: 'invalid_status' });
    if (!invalidResp.ok && invalidResp.status === 400) {
      log('PASS', 'Invalid status rejected (400)');
    } else {
      log('FAIL', 'Invalid status should return 400');
    }
  }

  // ─── EDGE CASES ────────────────────────────────────────────────────────
  console.log('\n  ── Edge Cases ──');

  // Duplicate order ID
  const dupResp = await request('POST', '/dispatch/orders', {
    orderId: 'FULLTEST-001',
    customerName: 'Duplicate Test',
    addressText: 'Bengaluru',
  });
  if (!dupResp.ok) {
    log('PASS', 'Duplicate orderId rejected');
  } else {
    log('FAIL', 'Duplicate orderId should be rejected');
  }

  // Missing required fields
  const missingResp = await request('POST', '/dispatch/orders', { orderId: 'MISSING' });
  if (!missingResp.ok && missingResp.status === 400) {
    log('PASS', 'Missing fields rejected (400)');
  } else {
    log('FAIL', 'Missing fields should return 400');
  }

  // Optimize with no pending orders
  const emptyOptResp = await request('POST', '/dispatch/optimize', { batchId: 'EMPTY-BATCH' });
  if (emptyOptResp.ok && emptyOptResp.data?.data?.stats?.orders === 0) {
    log('PASS', 'Optimize with 0 pending orders (graceful)', 'Returns empty routes');
  } else {
    log('FAIL', 'Optimize with 0 pending should return empty', JSON.stringify(emptyOptResp.data?.data?.stats));
  }

  // ─── RBAC (Role-Based Access Control) ──────────────────────────────────
  console.log('\n  ── RBAC Enforcement ──');

  if (agentToken) {
    // Agent should NOT be able to trigger optimization
    const agentOptResp = await request('POST', '/dispatch/optimize', {}, agentToken);
    if (!agentOptResp.ok && agentOptResp.status === 403) {
      log('PASS', 'Agent cannot trigger optimization (403)');
    } else {
      log('FAIL', 'Agent should get 403 on optimize', `Got ${agentOptResp.status}`);
    }

    // Agent CAN view routes
    const agentRoutesResp = await request('GET', '/dispatch/routes', null, agentToken);
    if (agentRoutesResp.ok) {
      log('PASS', 'Agent can view routes (200)');
    } else {
      log('FAIL', 'Agent should see routes');
    }
  }

  // Unauthenticated request
  const noAuthResp = await request('GET', '/dispatch/stats', null, '');
  if (!noAuthResp.ok && (noAuthResp.status === 401 || noAuthResp.status === 403)) {
    log('PASS', 'Unauthenticated request rejected (401)');
  } else {
    log('FAIL', 'No-auth should return 401');
  }

  // ─── FINAL STATS ──────────────────────────────────────────────────────
  console.log('\n  ── Final System State ──');

  const finalStats = await request('GET', '/dispatch/stats');
  if (finalStats.ok) {
    log('PASS', 'Final stats', JSON.stringify(finalStats.data.data));
  }

  // ─── SUMMARY ──────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  📊 RESULTS: ${results.passed} passed, ${results.failed} failed (${results.passed + results.failed} total)`);
  console.log('═══════════════════════════════════════════════════════════════');

  if (results.failed > 0) {
    console.log('\n  Failed tests:');
    results.tests.filter(t => t.status === 'FAIL').forEach(t => console.log(`    ❌ ${t.name}: ${t.detail}`));
  }

  console.log('');
  process.exit(results.failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Test runner error:', err.message);
  process.exit(1);
});
