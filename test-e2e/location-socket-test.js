const { io } = require('socket.io-client');

async function loginAndGetToken(email, password) {
  const res = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!data.success) throw new Error(`Login failed: ${data.message}`);
  return data.data.accessToken;
}

async function test() {
  console.log('\n======================================================');
  console.log('📡 STARTING REAL-TIME WEBSOCKET GPS LOCATION TRACKING TEST');
  console.log('======================================================\n');

  // 1. Login as Rajesh Kumar (agent) and Amit Sharma (customer)
  const agentToken = await loginAndGetToken('rajesh.agent@cylinderplatform.com', 'Agent@123456');
  const customerToken = await loginAndGetToken('amit@example.com', 'Customer@123');

  // 2. Fetch the active order dynamically
  const ordersRes = await fetch('http://localhost:5000/api/v1/orders?limit=10', {
    headers: { 'Authorization': `Bearer ${customerToken}` }
  });
  const ordersData = await ordersRes.json();
  if (!ordersData.success || !ordersData.data || ordersData.data.length === 0) {
    throw new Error('No active orders found in database to test tracking. Please seed/create one first.');
  }

  // Find the order we seeded earlier for Amit Sharma
  const order = ordersData.data.find(o => o.customerId?.email === 'amit@example.com' || o.customerId === '6a15591224e7fd9dcea619c0') || ordersData.data[0];
  const orderId = order.orderId;
  console.log(`✓ Tokens obtained. Dynamically selected Order ID for testing: ${orderId}`);

  // 3. Connect Sockets
  const agentSocket = io('http://localhost:5000', { auth: { token: agentToken } });
  const customerSocket = io('http://localhost:5000', { auth: { token: customerToken } });

  let agentConnected = false;
  let customerConnected = false;
  let customerSubscribed = false;
  let customerReceivedCoordinates = null;

  // 4. Setup Customer Listeners
  customerSocket.on('connect', () => {
    customerConnected = true;
    console.log('✓ Customer socket connected:', customerSocket.id);
    
    // Subscribe to the order tracking room
    customerSocket.emit('subscribe:order_tracking', { orderId });
    console.log(`→ Customer requested to subscribe to order tracking room: order:${orderId}`);
  });

  customerSocket.on('subscribed', (data) => {
    customerSubscribed = true;
    console.log('✓ Customer successfully subscribed to room:', data.room);
  });

  customerSocket.on('location:updated', (data) => {
    customerReceivedCoordinates = data;
    console.log('\n======================================================');
    console.log('🎉 SUCCESS: CUSTOMER SOCKET RECEIVED REAL-TIME GPS BROADCAST!');
    console.log('======================================================');
    console.log(`Latitude:     ${data.lat}`);
    console.log(`Longitude:    ${data.lng}`);
    console.log(`Timestamp:    ${data.timestamp}`);
    console.log(`Order ID:     ${data.orderId}`);
    console.log('======================================================\n');
  });

  // 5. Setup Agent Listeners
  agentSocket.on('connect', () => {
    agentConnected = true;
    console.log('✓ Agent socket connected:', agentSocket.id);
  });

  agentSocket.on('connect_error', (err) => {
    console.error('✗ Agent connection error:', err.message);
  });

  customerSocket.on('connect_error', (err) => {
    console.error('✗ Customer connection error:', err.message);
  });

  // Wait for connections and subscriptions to establish
  await new Promise(resolve => setTimeout(resolve, 2000));

  if (!agentConnected || !customerConnected) {
    console.error('✗ Sockets failed to connect.');
    agentSocket.disconnect();
    customerSocket.disconnect();
    process.exit(1);
  }

  // 6. Agent emits location update
  const testLat = 12.9716;
  const testLng = 77.5946;
  console.log(`\n→ Agent emitting live GPS coordinates: [lat: ${testLat}, lng: ${testLng}]...`);
  
  agentSocket.emit('agent:location_update', {
    orderId,
    lat: testLat,
    lng: testLng
  });

  // Wait to receive broadcast
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 7. Verification Summary
  console.log('=== VERIFICATION SUMMARY ===');
  console.log('Customer Subscribed to Room:      ', customerSubscribed ? '✓ YES' : '✗ NO');
  console.log('Customer Received Live GPS Signal:', customerReceivedCoordinates ? '✓ YES' : '✗ NO');
  if (customerReceivedCoordinates) {
    const latMatch = customerReceivedCoordinates.lat === testLat;
    const lngMatch = customerReceivedCoordinates.lng === testLng;
    console.log('GPS Coordinates Lat/Lng Match:    ', (latMatch && lngMatch) ? '✓ MATCHED' : '✗ MISMATCH');
  }
  console.log('============================\n');

  agentSocket.disconnect();
  customerSocket.disconnect();
  
  if (customerReceivedCoordinates) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

test().catch(err => {
  console.error('✗ Test suite failed with error:', err);
  process.exit(1);
});
