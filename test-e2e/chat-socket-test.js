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
  console.log('\n=== SOCKET CHAT TEST ===\n');

  const agentToken = await loginAndGetToken('rajesh.agent@cylinderplatform.com', 'Agent@123456');
  const customerToken = await loginAndGetToken('amit@example.com', 'Customer@123');
  const roomId = 'f7d51973-6f08-43ac-a7ae-46407a3ed285';

  console.log('✓ Tokens obtained');

  // Connect both sockets
  const agentSocket = io('http://localhost:5000', { auth: { token: agentToken } });
  const customerSocket = io('http://localhost:5000', { auth: { token: customerToken } });

  let agentConnected = false;
  let customerConnected = false;
  let agentReceivedMsg = false;
  let customerReceivedMsg = false;

  agentSocket.on('connect', () => {
    agentConnected = true;
    console.log('✓ Agent socket connected:', agentSocket.id);
    agentSocket.emit('chat:join', { chatRoomId: roomId });
    console.log('→ Agent joined room:', roomId);
  });

  agentSocket.on('connect_error', (err) => {
    console.error('✗ Agent socket connect error:', err.message);
  });

  agentSocket.on('error', (err) => {
    console.error('✗ Agent socket error:', err);
  });

  agentSocket.on('chat:history', ({ messages }) => {
    console.log(`✓ Agent received history: ${messages.length} messages`);
  });

  agentSocket.on('chat:message', (msg) => {
    agentReceivedMsg = true;
    console.log('✓ Agent received message from customer:', msg.content, '| senderId:', msg.senderId?._id || msg.senderId);
  });

  customerSocket.on('connect', () => {
    customerConnected = true;
    console.log('✓ Customer socket connected:', customerSocket.id);
    customerSocket.emit('chat:join', { chatRoomId: roomId });
    console.log('→ Customer joined room:', roomId);
  });

  customerSocket.on('connect_error', (err) => {
    console.error('✗ Customer socket connect error:', err.message);
  });

  customerSocket.on('error', (err) => {
    console.error('✗ Customer socket error:', err);
  });

  customerSocket.on('chat:history', ({ messages }) => {
    console.log(`✓ Customer received history: ${messages.length} messages`);
  });

  customerSocket.on('chat:message', (msg) => {
    customerReceivedMsg = true;
    console.log('✓ Customer received message from agent:', msg.content, '| senderId:', msg.senderId?._id || msg.senderId);
  });

  // Wait for both to connect
  await new Promise(resolve => setTimeout(resolve, 3000));

  if (!agentConnected || !customerConnected) {
    console.error('✗ One or both sockets failed to connect!');
    process.exit(1);
  }

  // Agent sends a message
  console.log('\n→ Agent sends message to customer...');
  agentSocket.emit('chat:send', { chatRoomId: roomId, content: 'Hello from agent (socket test)' });

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Customer sends a message
  console.log('→ Customer sends message to agent...');
  customerSocket.emit('chat:send', { chatRoomId: roomId, content: 'Hello from customer (socket test)' });

  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n=== RESULTS ===');
  console.log('Agent received customer message:', agentReceivedMsg ? '✓ YES' : '✗ NO');
  console.log('Customer received agent message:', customerReceivedMsg ? '✓ YES' : '✗ NO');

  agentSocket.disconnect();
  customerSocket.disconnect();
  process.exit(0);
}

test().catch(err => { console.error('Test failed:', err); process.exit(1); });
