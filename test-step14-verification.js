const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';

async function verifyStep14Readiness() {
  console.log('🔍 Brain Brawl Step 14 Verification\n');
  console.log('Checking if backend is ready for reward system implementation...\n');
  
  let allGood = true;
  
  // 1. Check if server is running
  try {
    console.log('1. 🌐 Testing server connection...');
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('   ✅ Server running on port 5000');
    console.log(`   ✅ Status: ${response.data.status}`);
    
    if (response.data.stats) {
      console.log('   ✅ Database stats available');
      console.log(`   📊 Users: ${response.data.stats.totalUsers}, Games: ${response.data.stats.totalGames}`);
    }
  } catch (error) {
    console.log('   ❌ Server not responding. Run: npm run dev');
    allGood = false;
  }
  
  // 2. Check required folders exist
  console.log('\n2. 📁 Checking folder structure...');
  const requiredFolders = ['models', 'routes', 'middleware'];
  
  for (const folder of requiredFolders) {
    if (fs.existsSync(folder)) {
      console.log(`   ✅ ${folder}/ exists`);
    } else {
      console.log(`   ❌ ${folder}/ missing - create with: mkdir ${folder}`);
      allGood = false;
    }
  }
  
  // 3. Check existing files
  console.log('\n3. 📄 Checking existing files...');
  const requiredFiles = [
    'server.js',
    'routes/auth.js',
    'routes/gameSocket.js',
    'middleware/auth.js',
    'models/RoomManager.js',
    'models/GameRoom.js'
  ];
  
  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      console.log(`   ✅ ${file}`);
    } else {
      console.log(`   ❌ ${file} missing - needed for Step 14`);
      allGood = false;
    }
  }
  
  // 4. Test authentication
  console.log('\n4. 🔐 Testing authentication system...');
  try {
    // Try to access protected route without token
    await axios.get(`${BASE_URL}/api/auth/profile`);
    console.log('   ❌ Auth not working - unprotected route accessible');
    allGood = false;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('   ✅ Authentication working (401 without token)');
    } else {
      console.log('   ❌ Unexpected auth error:', error.message);
      allGood = false;
    }
  }
  
  // 5. Test database connection
  console.log('\n5. 🗄️  Testing database connection...');
  try {
    // Login with test user
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'testplayer',
      password: 'password123'
    });
    
    if (loginResponse.data.token) {
      console.log('   ✅ Database connection working (login successful)');
      console.log('   ✅ Test user exists');
      
      // Test protected route with token
      const profileResponse = await axios.get(`${BASE_URL}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${loginResponse.data.token}` }
      });
      
      console.log('   ✅ JWT authentication working');
      console.log(`   👤 Test user: ${profileResponse.data.username}`);
    }
  } catch (error) {
    console.log('   ❌ Database/auth issue:', error.response?.data?.error || error.message);
    allGood = false;
  }
  
  // 6. Check Socket.io initialization
  console.log('\n6. 🔌 Checking Socket.io setup...');
  if (fs.existsSync('routes/gameSocket.js')) {
    const socketContent = fs.readFileSync('routes/gameSocket.js', 'utf8');
    if (socketContent.includes('authenticateSocket') && socketContent.includes('create_room')) {
      console.log('   ✅ Socket.io game handlers implemented');
    } else {
      console.log('   ❌ Socket.io game handlers incomplete');
      allGood = false;
    }
  } else {
    console.log('   ❌ gameSocket.js missing');
    allGood = false;
  }
  
  // 7. Check if ready for Step 14
  console.log('\n7. 🎯 Step 14 Readiness Check...');
  
  const step14Files = [
    'models/GameResults.js',
    'routes/stats.js'
  ];
  
  let step14Started = false;
  for (const file of step14Files) {
    if (fs.existsSync(file)) {
      console.log(`   ✅ ${file} already exists`);
      step14Started = true;
    } else {
      console.log(`   ⏳ ${file} needs to be created`);
    }
  }
  
  // Final assessment
  console.log('\n' + '='.repeat(50));
  if (allGood) {
    if (step14Started) {
      console.log('🎉 READY: Step 14 partially implemented - continue with remaining files!');
    } else {
      console.log('🚀 READY: Backend ready for Step 14 implementation!');
    }
    
    console.log('\n📋 Next steps:');
    console.log('   1. Create models/GameResults.js');
    console.log('   2. Create routes/stats.js');
    console.log('   3. Update routes/gameSocket.js with rewards');
    console.log('   4. Update server.js with stats routes');
    console.log('   5. Test with: node test-rewards.js');
    
  } else {
    console.log('⚠️  NOT READY: Fix the issues above before Step 14');
    console.log('\n🔧 Common fixes:');
    console.log('   - Make sure server is running: npm run dev');
    console.log('   - Check database connection in .env');
    console.log('   - Verify all Step 13 files are created');
  }
  
  console.log('\n' + '='.repeat(50));
}

// Run verification
verifyStep14Readiness().catch(console.error);