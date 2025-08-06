// Test GameRoom import specifically
console.log('🔍 Debugging GameRoom import...\n');

try {
  // Test 1: Check if file exists and can be required
  console.log('1️⃣ Testing require...');
  const GameRoom = require('./models/GameRoom');
  console.log('✅ GameRoom required successfully');
  console.log('Type of GameRoom:', typeof GameRoom);
  console.log('GameRoom:', GameRoom);
  
  // Test 2: Check if it's a constructor
  console.log('\n2️⃣ Testing constructor...');
  if (typeof GameRoom === 'function') {
    console.log('✅ GameRoom is a function');
    
    // Test 3: Try to create an instance
    console.log('\n3️⃣ Testing instantiation...');
    const room = new GameRoom('123456', 'testhost');
    console.log('✅ GameRoom instance created:', room.code);
    
  } else {
    console.error('❌ GameRoom is not a function, it is:', typeof GameRoom);
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}

console.log('\n🔍 Debug complete.');