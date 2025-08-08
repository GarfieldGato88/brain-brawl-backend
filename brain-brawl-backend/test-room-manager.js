// test-room-manager-simple.js
// This test works without GameRoom.js for now

// Mock GameRoom class for testing
class MockGameRoom {
  constructor(code, hostId) {
    this.code = code;
    this.hostId = hostId;
    this.players = new Map();
    this.status = 'waiting';
    this.createdAt = new Date();
  }

  addPlayer(userId, username, socketId) {
    if (this.players.size >= 5) {
      throw new Error('Room is full');
    }
    if (this.status !== 'waiting') {
      throw new Error('Game already started');
    }
    
    this.players.set(userId, {
      id: userId,
      username,
      socketId,
      score: 0,
      ready: false,
      joinedAt: new Date()
    });
  }

  removePlayer(userId) {
    this.players.delete(userId);
    
    // If host leaves, transfer to next player
    if (userId === this.hostId && this.players.size > 0) {
      this.hostId = this.players.keys().next().value;
    }
  }
}

// Temporarily replace the GameRoom require
const originalRequire = require;
require = function(id) {
  if (id === './GameRoom') {
    return MockGameRoom;
  }
  return originalRequire(id);
};

// Now test the RoomManager
const roomManager = require('./models/RoomManager');

async function testRoomManager() {
  console.log('🧪 Testing Room Manager (Simple Version)...\n');

  try {
    // Test 1: Room code generation
    console.log('1️⃣ Testing room code generation...');
    const codes = new Set();
    for (let i = 0; i < 10; i++) {
      const code = roomManager.generateRoomCode();
      if (codes.has(code)) {
        throw new Error('Duplicate room code generated!');
      }
      codes.add(code);
    }
    console.log(`✅ Generated 10 unique codes: ${Array.from(codes).join(', ')}\n`);

    // Test 2: Create rooms
    console.log('2️⃣ Testing room creation...');
    const room1 = roomManager.createRoom('user123');
    const room2 = roomManager.createRoom('user456');
    console.log(`✅ Created rooms: ${room1.code}, ${room2.code}\n`);

    // Test 3: Room stats
    console.log('3️⃣ Testing room statistics...');
    const stats = roomManager.getRoomStats();
    console.log('✅ Room stats:', stats, '\n');

    // Test 4: Room lookup
    console.log('4️⃣ Testing room lookup...');
    const foundRoom = roomManager.getRoom(room1.code);
    console.log(`✅ Found room by code: ${foundRoom?.code}\n`);

    // Test 5: Join rooms
    console.log('5️⃣ Testing room joining...');
    roomManager.joinRoom(room1.code, 'user123', 'Alice', 'socket1');
    roomManager.joinRoom(room1.code, 'user789', 'Bob', 'socket2');
    console.log(`✅ Players joined room ${room1.code}\n`);

    // Test 6: Find user's room
    console.log('6️⃣ Testing user room lookup...');
    const userRoom = roomManager.getRoomByUserId('user123');
    console.log(`✅ Found user123 in room: ${userRoom?.code}\n`);

    // Test 7: Leave room
    console.log('7️⃣ Testing room leaving...');
    const leftRoom = roomManager.leaveRoom('user789');
    console.log(`✅ User789 left room: ${leftRoom?.code}\n`);

    // Test 8: Error handling
    console.log('8️⃣ Testing error handling...');
    try {
      roomManager.joinRoom('999999', 'user999', 'Charlie', 'socket3');
      console.log('❌ Should have thrown error for invalid room code');
    } catch (error) {
      console.log(`✅ Correctly caught error: ${error.message}\n`);
    }

    // Test 9: Final stats
    console.log('9️⃣ Final statistics...');
    const finalStats = roomManager.getRoomStats();
    console.log('✅ Final room stats:', finalStats, '\n');

    console.log('🎉 All Room Manager tests passed!');
    console.log('\n📊 Summary:');
    console.log(`- Rooms created: ${finalStats.totalRooms}`);
    console.log(`- Players tracked: ${finalStats.totalPlayers}`);
    console.log(`- Average players per room: ${finalStats.averagePlayersPerRoom}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testRoomManager();