const io = require('socket.io-client');

console.log('🔍 Starting Socket.io connection test...');
console.log('📡 Attempting to connect to: http://localhost:5000');

// Test Socket.io connection with more detailed logging
const socket = io('http://localhost:5000', {
  transports: ['websocket', 'polling'],
  timeout: 10000,
  forceNew: true
});

// Connection successful
socket.on('connect', () => {
  console.log('✅ Socket.io connection successful!');
  console.log('🔗 Socket ID:', socket.id);
  console.log('🚀 Transport method:', socket.io.engine.transport.name);
  
  // Test a simple event
  console.log('📤 Testing ping...');
  socket.emit('ping', 'Hello from test client!');
  
  // Disconnect after 2 seconds
  setTimeout(() => {
    console.log('📤 Disconnecting...');
    socket.disconnect();
  }, 2000);
});

// Connection error
socket.on('connect_error', (error) => {
  console.log('❌ Socket.io connection failed!');
  console.log('🔍 Error details:', error.message);
  console.log('📋 Error code:', error.code);
  console.log('📋 Error type:', error.type);
  
  // Common solutions
  console.log('\n🛠️  Possible solutions:');
  console.log('1. Make sure server is running: npm run dev');
  console.log('2. Check if port 5000 is available');
  console.log('3. Verify socket.io-client is installed');
  console.log('4. Check Windows firewall settings');
  
  process.exit(1);
});

// Disconnection
socket.on('disconnect', (reason) => {
  console.log('✅ Socket disconnected:', reason);
  console.log('🎯 Test completed successfully!');
  process.exit(0);
});

// Timeout handler
setTimeout(() => {
  console.log('⏰ Connection test timeout (10 seconds)');
  console.log('❌ Server might not be running or Socket.io not configured');
  
  console.log('\n🔍 Debug steps:');
  console.log('1. Check server console for errors');
  console.log('2. Verify server.js has Socket.io integration');
  console.log('3. Test basic HTTP endpoint: curl http://localhost:5000');
  
  socket.disconnect();
  process.exit(1);
}, 10000);

// Handle process interruption
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  socket.disconnect();
  process.exit(0);
});