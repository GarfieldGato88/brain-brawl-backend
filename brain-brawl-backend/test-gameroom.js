 
const GameRoom = require('./models/GameRoom');

// Test GameRoom functionality
console.log('🧪 Testing GameRoom class...\n');

try {
  // Create a new room
  const room = new GameRoom('123456', 'host123');
  console.log('✅ Room created with code:', room.code);
  
  // Add players
  room.addPlayer('host123', 'HostPlayer', 'socket1');
  room.addPlayer('player2', 'Player2', 'socket2');
  console.log('✅ Added 2 players');
  console.log('Players:', room.players.size);
  
  // Test room info
  const roomInfo = room.getRoomInfo();
  console.log('✅ Room info:', roomInfo);
  
  // Mock questions for testing
  const mockQuestions = [
    {
      question: 'What is 2+2?',
      option_a: '3',
      option_b: '4',
      option_c: '5', 
      option_d: '6',
      correct_answer: 'B',
      category: 'Math',
      snarky_comment: 'Really? Basic math!'
    }
  ];
  
  // Start game
  room.startGame(mockQuestions);
  console.log('✅ Game started, status:', room.status);
  
  // Get current question
  const questionData = room.getCurrentQuestionData();
  console.log('✅ Current question:', questionData.question);
  
  // Submit answers
  const result1 = room.submitAnswer('host123', 'B', 3000);
  const result2 = room.submitAnswer('player2', 'A', 5000);
  
  console.log('✅ Host answer result:', result1);
  console.log('✅ Player2 answer result:', result2);
  
  // Get leaderboard
  const leaderboard = room.getLeaderboard();
  console.log('✅ Final leaderboard:', leaderboard);
  
  console.log('\n🎉 All GameRoom tests passed!');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
}