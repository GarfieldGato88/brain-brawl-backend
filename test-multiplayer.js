// Test multiplayer functionality
const roomManager = require('./models/RoomManager');
const GameRoom = require('./models/GameRoom');

console.log('🧪 Testing Brain Brawl Multiplayer System...\n');

// Test 1: Room Manager
console.log('1️⃣ Testing Room Manager...');
try {
  const stats = roomManager.getRoomStats();
  console.log('✅ Room Manager working:', stats);
} catch (error) {
  console.error('❌ Room Manager error:', error.message);
  process.exit(1);
}

// Test 2: Game Room Creation
console.log('\n2️⃣ Testing Room Creation...');
try {
  const room = roomManager.createRoom('host123');
  console.log('✅ Room created:', room.code);
  
  // Test adding players
  room.addPlayer('host123', 'TestHost', 'socket1');
  room.addPlayer('player456', 'TestPlayer', 'socket2');
  
  console.log('✅ Players added:', room.players.size);
} catch (error) {
  console.error('❌ Room creation error:', error.message);
  process.exit(1);
}

// Test 3: Game Flow
console.log('\n3️⃣ Testing Game Flow...');
try {
  const testRoom = roomManager.getAllRooms()[0];
  if (testRoom) {
    const room = roomManager.getRoom(testRoom.code);
    
    // Mock questions for testing
    const mockQuestions = [
      {
        question: "What is 2 + 2?",
        option_a: "3",
        option_b: "4", 
        option_c: "5",
        option_d: "6",
        correct_answer: "B",
        category: "Math",
        snarky_comment: "Really? It's basic math!"
      },
      {
        question: "What color is the sky?",
        option_a: "Blue",
        option_b: "Red",
        option_c: "Green", 
        option_d: "Purple",
        correct_answer: "A",
        category: "Science",
        snarky_comment: "Have you ever looked outside?"
      }
    ];
    
    room.startGame(mockQuestions);
    console.log('✅ Game started with', mockQuestions.length, 'questions');
    
    // Test submitting answers
    const result1 = room.submitAnswer('host123', 'B', 2000);
    const result2 = room.submitAnswer('player456', 'A', 5000);
    
    console.log('✅ Answers submitted:');
    console.log('  - Host answer:', result1.isCorrect ? 'Correct' : 'Wrong', `(+${result1.points} points)`);
    console.log('  - Player answer:', result2.isCorrect ? 'Correct' : 'Wrong', `(+${result2.points} points)`);
    
    // Test next question
    const nextQ = room.nextQuestion();
    if (nextQ) {
      console.log('✅ Advanced to next question:', nextQ.question);
    }
    
    // Test leaderboard
    const leaderboard = room.getLeaderboard();
    console.log('✅ Leaderboard generated:', leaderboard.length, 'players');
    
  } else {
    console.log('⚠️ No room found for game flow test');
  }
} catch (error) {
  console.error('❌ Game flow error:', error.message);
}

// Test 4: Room Stats
console.log('\n4️⃣ Testing Room Statistics...');
try {
  const finalStats = roomManager.getRoomStats();
  console.log('✅ Final room stats:', finalStats);
  
  const allRooms = roomManager.getAllRooms();
  console.log('✅ All rooms:', allRooms.length);
  
} catch (error) {
  console.error('❌ Stats error:', error.message);
}

console.log('\n🎉 Multiplayer system test completed!');
console.log('💡 If all tests passed, your Socket.io server should work correctly.');
console.log('🚀 Try running: npm run dev');