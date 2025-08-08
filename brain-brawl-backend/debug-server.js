// Debug server imports
console.log('🔍 Debugging server imports...\n');

// Test auth routes import
console.log('1️⃣ Testing auth routes import...');
try {
  const authRoutes = require('./routes/auth');
  console.log('✅ Auth routes imported');
  console.log('Type of authRoutes:', typeof authRoutes);
  console.log('AuthRoutes:', authRoutes);
  
  if (typeof authRoutes === 'function') {
    console.log('✅ Auth routes is a function (middleware)');
  } else {
    console.error('❌ Auth routes is not a function:', typeof authRoutes);
  }
} catch (error) {
  console.error('❌ Auth routes import error:', error.message);
}

// Test game socket import
console.log('\n2️⃣ Testing game socket import...');
try {
  const handleGameSocket = require('./routes/gameSocket');
  console.log('✅ Game socket imported');
  console.log('Type of handleGameSocket:', typeof handleGameSocket);
  
  if (typeof handleGameSocket === 'function') {
    console.log('✅ Game socket is a function');
  } else {
    console.error('❌ Game socket is not a function:', typeof handleGameSocket);
  }
} catch (error) {
  console.error('❌ Game socket import error:', error.message);
}

console.log('\n🔍 Debug complete.');