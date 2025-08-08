 // comprehensive-room-test.js
// Complete verification test suite for Room Manager

const roomManager = require('./models/RoomManager');

// Colors for better test output visibility
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function logTest(testName) {
  console.log(`\n${colors.blue}${colors.bold}🧪 Testing: ${testName}${colors.reset}`);
  console.log('━'.repeat(50));
}

function logPass(message) {
  log(colors.green, `✅ PASS: ${message}`);
}

function logFail(message) {
  log(colors.red, `❌ FAIL: ${message}`);
}

function logInfo(message) {
  log(colors.yellow, `ℹ️  INFO: ${message}`);
}

async function runVerificationTests() {
  console.log(`${colors.bold}🎮 Brain Brawl Room Manager Verification${colors.reset}`);
  console.log('═'.repeat(60));
  
  let passedTests = 0;
  let totalTests = 0;

  // ✅ Test 1: Room Creation & Unique 6-digit codes
  logTest("Room Creation - Generates unique 6-digit codes");
  try {
    totalTests++;
    
    // Create multiple rooms and verify codes
    const rooms = [];
    const codes = new Set();
    
    for (let i = 0; i < 10; i++) {
      const room = roomManager.createRoom(`host${i}`);
      rooms.push(room);
      codes.add(room.code);
      
      // Verify code format
      if (!/^\d{6}$/.test(room.code)) {
        throw new Error(`Invalid code format: ${room.code}`);
      }
    }
    
    // Verify all codes are unique
    if (codes.size !== 10) {
      throw new Error(`Expected 10 unique codes, got ${codes.size}`);
    }
    
    logPass(`Generated 10 unique 6-digit codes: ${Array.from(codes).slice(0, 3).join(', ')}...`);
    logInfo(`All codes match pattern: /^\\d{6}$/`);
    passedTests++;
    
  } catch (error) {
    logFail(`Room creation failed: ${error.message}`);
  }

  // ✅ Test 2: Player Joining
  logTest("Player Joining - Adds players to existing rooms");
  try {
    totalTests++;
    
    // Create a room
    const testRoom = roomManager.createRoom('testHost');
    const roomCode = testRoom.code;
    
    // Add players to room
    roomManager.joinRoom(roomCode, 'player1', 'Alice', 'socket1');
    roomManager.joinRoom(roomCode, 'player2', 'Bob', 'socket2');
    roomManager.joinRoom(roomCode, 'player3', 'Charlie', 'socket3');
    
    // Verify players were added
    const room = roomManager.getRoom(roomCode);
    if (room.players.size !== 3) {
      throw new Error(`Expected 3 players, got ${room.players.size}`);
    }
    
    // Verify player data
    const alice = room.players.get('player1');
    if (!alice || alice.username !== 'Alice' || alice.socketId !== 'socket1') {
      throw new Error('Player data not stored correctly');
    }
    
    logPass(`Added 3 players to room ${roomCode}`);
    logInfo(`Players: ${Array.from(room.players.values()).map(p => p.username).join(', ')}`);
    passedTests++;
    
  } catch (error) {
    logFail(`Player joining failed: ${error.message}`);
  }

  // ✅ Test 3: Player Tracking
  logTest("Player Tracking - Knows which room each player is in");
  try {
    totalTests++;
    
    // Create two rooms
    const room1 = roomManager.createRoom('host1');
    const room2 = roomManager.createRoom('host2');
    
    // Add players to different rooms
    roomManager.joinRoom(room1.code, 'tracker1', 'User1', 'sock1');
    roomManager.joinRoom(room2.code, 'tracker2', 'User2', 'sock2');
    
    // Test tracking
    const foundRoom1 = roomManager.getRoomByUserId('tracker1');
    const foundRoom2 = roomManager.getRoomByUserId('tracker2');
    const notFound = roomManager.getRoomByUserId('nonexistent');
    
    if (foundRoom1?.code !== room1.code) {
      throw new Error(`Player tracking failed for tracker1`);
    }
    
    if (foundRoom2?.code !== room2.code) {
      throw new Error(`Player tracking failed for tracker2`);
    }
    
    if (notFound !== null) {
      throw new Error(`Should return null for nonexistent player`);
    }
    
    logPass(`Correctly tracked players in their respective rooms`);
    logInfo(`tracker1 in room ${foundRoom1.code}, tracker2 in room ${foundRoom2.code}`);
    passedTests++;
    
  } catch (error) {
    logFail(`Player tracking failed: ${error.message}`);
  }

  // ✅ Test 4: Room Leaving & Cleanup
  logTest("Room Leaving - Removes players and cleans up empty rooms");
  try {
    totalTests++;
    
    // Create room with players
    const leaveRoom = roomManager.createRoom('leaveHost');
    roomManager.joinRoom(leaveRoom.code, 'leaver1', 'Leaver1', 'sock1');
    roomManager.joinRoom(leaveRoom.code, 'leaver2', 'Leaver2', 'sock2');
    
    const initialRoomCount = roomManager.getRoomStats().totalRooms;
    
    // Remove one player
    roomManager.leaveRoom('leaver1');
    
    const roomAfterOneLeave = roomManager.getRoom(leaveRoom.code);
    if (roomAfterOneLeave.players.size !== 1) {
      throw new Error(`Expected 1 player after one left, got ${roomAfterOneLeave.players.size}`);
    }
    
    // Verify player tracking removed
    const trackedRoom = roomManager.getRoomByUserId('leaver1');
    if (trackedRoom !== null) {
      throw new Error('Player tracking not removed after leaving');
    }
    
    // Remove last player - room should be deleted
    roomManager.leaveRoom('leaver2');
    
    const deletedRoom = roomManager.getRoom(leaveRoom.code);
    if (deletedRoom !== undefined) {
      throw new Error('Empty room was not deleted');
    }
    
    const finalRoomCount = roomManager.getRoomStats().totalRooms;
    if (finalRoomCount >= initialRoomCount) {
      throw new Error('Room count did not decrease after cleanup');
    }
    
    logPass(`Successfully removed players and cleaned up empty room`);
    logInfo(`Room ${leaveRoom.code} was automatically deleted when empty`);
    passedTests++;
    
  } catch (error) {
    logFail(`Room leaving/cleanup failed: ${error.message}`);
  }

  // ✅ Test 5: Error Handling
  logTest("Error Handling - Gracefully handles invalid room codes");
  try {
    totalTests++;
    
    let errorsCaught = 0;
    
    // Test joining nonexistent room
    try {
      roomManager.joinRoom('999999', 'testUser', 'TestName', 'sockTest');
    } catch (error) {
      if (error.message.includes('Room 999999 not found')) {
        errorsCaught++;
      }
    }
    
    // Test getting nonexistent room
    const nonexistentRoom = roomManager.getRoom('888888');
    if (nonexistentRoom === undefined) {
      errorsCaught++;
    }
    
    // Test leaving when not in any room
    const leaveResult = roomManager.leaveRoom('notInAnyRoom');
    if (leaveResult === null) {
      errorsCaught++;
    }
    
    if (errorsCaught !== 3) {
      throw new Error(`Expected 3 errors handled, got ${errorsCaught}`);
    }
    
    logPass(`Correctly handled 3/3 error scenarios`);
    logInfo(`Errors: Invalid join, nonexistent room lookup, leave when not in room`);
    passedTests++;
    
  } catch (error) {
    logFail(`Error handling failed: ${error.message}`);
  }

  // ✅ Test 6: Statistics
  logTest("Statistics - Provides real-time room usage data");
  try {
    totalTests++;
    
    // Clear all rooms for clean test
    roomManager.forceCleanupAllRooms();
    
    // Create test scenario
    const statsRoom1 = roomManager.createRoom('statsHost1');
    const statsRoom2 = roomManager.createRoom('statsHost2');
    const statsRoom3 = roomManager.createRoom('statsHost3');
    
    // Add players to some rooms
    roomManager.joinRoom(statsRoom1.code, 'stats1', 'StatsUser1', 'statsSock1');
    roomManager.joinRoom(statsRoom1.code, 'stats2', 'StatsUser2', 'statsSock2');
    roomManager.joinRoom(statsRoom2.code, 'stats3', 'StatsUser3', 'statsSock3');
    // statsRoom3 remains empty
    
    const stats = roomManager.getRoomStats();
    
    // Verify statistics
    if (stats.totalRooms !== 3) {
      throw new Error(`Expected 3 total rooms, got ${stats.totalRooms}`);
    }
    
    if (stats.totalPlayers !== 3) {
      throw new Error(`Expected 3 total players, got ${stats.totalPlayers}`);
    }
    
    if (stats.roomsWithPlayers !== 2) {
      throw new Error(`Expected 2 rooms with players, got ${stats.roomsWithPlayers}`);
    }
    
    const expectedAverage = (3 / 3).toFixed(1); // 3 players / 3 rooms
    if (stats.averagePlayersPerRoom !== expectedAverage) {
      throw new Error(`Expected average ${expectedAverage}, got ${stats.averagePlayersPerRoom}`);
    }
    
    logPass(`Statistics accurately calculated`);
    logInfo(`Stats: ${stats.totalRooms} rooms, ${stats.totalPlayers} players, ${stats.averagePlayersPerRoom} avg/room`);
    passedTests++;
    
  } catch (error) {
    logFail(`Statistics failed: ${error.message}`);
  }

  // ✅ Test 7: Cleanup System
  logTest("Cleanup - Automatically removes old rooms");
  try {
    totalTests++;
    
    // Create a room and manually age it
    const oldRoom = roomManager.createRoom('oldHost');
    
    // Simulate old room by manipulating creation time
    const room = roomManager.getRoom(oldRoom.code);
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    room.createdAt = threeHoursAgo;
    
    const beforeCleanup = roomManager.getRoomStats().totalRooms;
    
    // Trigger cleanup
    roomManager.cleanupOldRooms();
    
    const afterCleanup = roomManager.getRoomStats().totalRooms;
    
    // Verify old room was removed
    const cleanedRoom = roomManager.getRoom(oldRoom.code);
    if (cleanedRoom !== undefined) {
      throw new Error('Old room was not cleaned up');
    }
    
    if (afterCleanup >= beforeCleanup) {
      throw new Error('Room count did not decrease after cleanup');
    }
    
    logPass(`Successfully cleaned up old rooms`);
    logInfo(`Removed ${beforeCleanup - afterCleanup} old room(s)`);
    passedTests++;
    
  } catch (error) {
    logFail(`Cleanup failed: ${error.message}`);
  }

  // ✅ Test 8: Singleton Pattern
  logTest("Singleton Pattern - Only one RoomManager instance exists");
  try {
    totalTests++;
    
    // Import RoomManager multiple times
    const roomManager1 = require('./models/RoomManager');
    const roomManager2 = require('./models/RoomManager');
    
    // Create room with first instance
    const singletonRoom = roomManager1.createRoom('singletonTest');
    
    // Verify second instance sees the same room
    const foundRoom = roomManager2.getRoom(singletonRoom.code);
    
    if (!foundRoom) {
      throw new Error('Singleton pattern failed - instances are different');
    }
    
    if (roomManager1 !== roomManager2) {
      throw new Error('Multiple instances detected - not a true singleton');
    }
    
    logPass(`Singleton pattern working correctly`);
    logInfo(`All imports return the same RoomManager instance`);
    passedTests++;
    
  } catch (error) {
    logFail(`Singleton pattern failed: ${error.message}`);
  }

  // 📊 Final Results
  console.log('\n' + '═'.repeat(60));
  console.log(`${colors.bold}🏁 VERIFICATION RESULTS${colors.reset}`);
  console.log('═'.repeat(60));
  
  if (passedTests === totalTests) {
    log(colors.green, `🎉 ALL TESTS PASSED! (${passedTests}/${totalTests})`);
    console.log('\n✅ Your Room Manager is fully functional and ready for production!');
    
    // Show final stats
    const finalStats = roomManager.getRoomStats();
    console.log('\n📊 Final Room Manager State:');
    console.log(`   • Total Rooms: ${finalStats.totalRooms}`);
    console.log(`   • Total Players: ${finalStats.totalPlayers}`);
    console.log(`   • Average Players/Room: ${finalStats.averagePlayersPerRoom}`);
    
  } else {
    log(colors.red, `❌ SOME TESTS FAILED (${passedTests}/${totalTests})`);
    console.log('\n🔧 Please review the failed tests and fix the issues before proceeding.');
  }
  
  console.log('\n' + '═'.repeat(60));
  return passedTests === totalTests;
}

// Run the verification if this file is executed directly
if (require.main === module) {
  runVerificationTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { runVerificationTests };
