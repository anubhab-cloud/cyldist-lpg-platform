'use strict';

/**
 * Integration test for the Smart Dispatch Optimization System.
 * Seeds sample orders and agents, then runs the optimizer pipeline.
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cylinder_platform';

async function test() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const { DispatchOrder, DeliveryAgent, DispatchRoute } = require('../src/modules/dispatch/dispatch.model');
  const { optimizeAndDispatchOrders } = require('../src/modules/dispatch/optimizer.service');

  // Clean previous test data
  await DispatchOrder.deleteMany({ orderId: { $regex: /^DISP-TEST/ } });
  await DeliveryAgent.deleteMany({ name: { $regex: /^Test Agent/ } });
  await DispatchRoute.deleteMany({ dispatchBatchId: 'TEST-BATCH' });

  // Create 3 test agents at different locations in Bengaluru
  const agents = await DeliveryAgent.insertMany([
    {
      userId: new mongoose.Types.ObjectId(),
      name: 'Test Agent Alpha',
      phone: '+919900000001',
      currentLocation: { type: 'Point', coordinates: [77.5946, 12.9716] }, // Bengaluru center
      status: 'available',
      vehicleType: 'bike',
      maxCapacity: 6,
    },
    {
      userId: new mongoose.Types.ObjectId(),
      name: 'Test Agent Beta',
      phone: '+919900000002',
      currentLocation: { type: 'Point', coordinates: [77.6408, 12.9784] }, // Indiranagar
      status: 'available',
      vehicleType: 'auto',
      maxCapacity: 8,
    },
    {
      userId: new mongoose.Types.ObjectId(),
      name: 'Test Agent Gamma',
      phone: '+919900000003',
      currentLocation: { type: 'Point', coordinates: [77.5700, 12.9350] }, // Jayanagar
      status: 'available',
      vehicleType: 'mini_truck',
      maxCapacity: 12,
    },
  ]);
  console.log(`✅ Created ${agents.length} test agents`);

  // Create 9 test orders spread across Bengaluru with mixed priorities
  const testOrders = [
    // Cluster near Indiranagar (East)
    { orderId: 'DISP-TEST-001', customerName: 'Hospital A', addressText: '100 Feet Rd, Indiranagar', priority: 'HIGH', coords: [77.6408, 12.9784] },
    { orderId: 'DISP-TEST-002', customerName: 'Ravi Kumar', addressText: 'CMH Road, Indiranagar', priority: 'LOW', coords: [77.6390, 12.9810] },
    { orderId: 'DISP-TEST-003', customerName: 'Priya Sharma', addressText: 'HAL Airport Road', priority: 'MEDIUM', coords: [77.6500, 12.9600] },
    // Cluster near Jayanagar (South)
    { orderId: 'DISP-TEST-004', customerName: 'Relief Center B', addressText: '4th Block, Jayanagar', priority: 'HIGH', coords: [77.5820, 12.9270] },
    { orderId: 'DISP-TEST-005', customerName: 'Suresh Reddy', addressText: 'JP Nagar 6th Phase', priority: 'LOW', coords: [77.5700, 12.9100] },
    { orderId: 'DISP-TEST-006', customerName: 'Meena Iyer', addressText: 'BTM Layout', priority: 'MEDIUM', coords: [77.6100, 12.9160] },
    // Cluster near MG Road (Central)
    { orderId: 'DISP-TEST-007', customerName: 'Hotel Grand', addressText: 'MG Road, Bengaluru', priority: 'MEDIUM', coords: [77.6070, 12.9750] },
    { orderId: 'DISP-TEST-008', customerName: 'Amit Patel', addressText: 'Brigade Road', priority: 'LOW', coords: [77.6060, 12.9720] },
    { orderId: 'DISP-TEST-009', customerName: 'Old Age Home C', addressText: 'Residency Road', priority: 'HIGH', coords: [77.6000, 12.9700] },
  ];

  const orderDocs = testOrders.map((o) => ({
    orderId: o.orderId,
    orderRef: new mongoose.Types.ObjectId(),
    customerName: o.customerName,
    customerPhone: '+919800000000',
    addressText: o.addressText,
    priority: o.priority,
    location: { type: 'Point', coordinates: o.coords },
    status: 'pending',
  }));

  await DispatchOrder.insertMany(orderDocs);
  console.log(`✅ Created ${orderDocs.length} test dispatch orders`);

  // Run the optimization pipeline (without Socket.IO for this test)
  console.log('\n🔄 Running optimization pipeline...\n');
  const result = await optimizeAndDispatchOrders(null, {
    batchId: 'TEST-BATCH',
    maxOrdersPerAgent: 5,
  });

  // Print results
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🎯 DISPATCH OPTIMIZATION RESULTS');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Batch ID: ${result.stats.batchId}`);
  console.log(`  Orders Dispatched: ${result.stats.orders}`);
  console.log(`  Agents Used: ${result.stats.agents}`);
  console.log(`  Clusters Formed: ${result.stats.clusters}`);
  console.log(`  Time Elapsed: ${result.stats.elapsed}`);
  console.log('');

  for (const route of result.routes) {
    console.log(`  🚚 Route: ${route.routeId}`);
    console.log(`     Agent: ${route.agentName}`);
    console.log(`     Total Distance: ${(route.totalDistanceMeters / 1000).toFixed(2)} km`);
    console.log(`     Total Duration: ~${Math.round(route.totalDurationSeconds / 60)} min`);
    console.log(`     Stops (${route.stops.length}):`);
    for (const stop of route.stops) {
      const priorityEmoji = { HIGH: '🔴', MEDIUM: '🟡', LOW: '🟢' }[stop.priority] || '⚪';
      console.log(`       #${stop.sequence} ${priorityEmoji} ${stop.customerName} [${stop.priority}] — ${(stop.distanceMeters / 1000).toFixed(2)} km`);
    }
    console.log('');
  }

  // Verify DB state
  const assignedOrders = await DispatchOrder.find({ dispatchBatchId: 'TEST-BATCH' }).lean();
  console.log(`  ✅ DB Verification: ${assignedOrders.length} orders now marked as "assigned"`);
  console.log(`     All have deliverySequence: ${assignedOrders.every((o) => o.deliverySequence != null)}`);
  console.log(`     All have assignedAgent: ${assignedOrders.every((o) => o.assignedAgent != null)}`);

  await mongoose.disconnect();
  console.log('\n✅ Done. MongoDB disconnected.');
}

test().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
