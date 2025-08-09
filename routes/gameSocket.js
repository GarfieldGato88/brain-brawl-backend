// Complete gameSocket.js - Fixed user switching bug AND correct answer format
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY
);

const gameRooms = new Map();
const gameTimers = new Map();

// Safe object creation to prevent circular references
const createSafePlayerObject = (player) => ({
  id: player.id,
  username: player.username,
  userId: player.userId, // ✅ Include userId
  score: player.score || 0,
  hasAnswered: player.hasAnswered || false,
  isHost: player.isHost || false,
  xp: player.xp || 0,
  gems: player.gems || 0
});

const createSafeRoomObject = (room) => ({
  id: room.id,
  code: room.code,
  players: room.players.map(createSafePlayerObject),
  hostId: room.hostId,
  gameActive: room.gameActive || false,
  currentQuestion: room.currentQuestion || 0,
  maxPlayers: room.maxPlayers || 5,
  questionStartTime: room.questionStartTime,
  questionData: room.questionData ? {
    id: room.questionData.id,
    question: room.questionData.question,
    options: room.questionData.options,
    category: room.questionData.category,
    difficulty: room.questionData.difficulty
  } : null
});

const clearGameTimer = (roomId) => {
  if (gameTimers.has(roomId)) {
    clearTimeout(gameTimers.get(roomId));
    gameTimers.delete(roomId);
  }
};

// Convert database options to frontend format
const convertOptionsToObject = (questionData) => {
  let options = {};
  
  if (questionData.options) {
    if (Array.isArray(questionData.options)) {
      options = {
        a: questionData.options[0] || '',
        b: questionData.options[1] || '', 
        c: questionData.options[2] || '',
        d: questionData.options[3] || ''
      };
    } 
    else if (typeof questionData.options === 'string') {
      try {
        const parsed = JSON.parse(questionData.options);
        if (Array.isArray(parsed)) {
          options = {
            a: parsed[0] || '',
            b: parsed[1] || '', 
            c: parsed[2] || '',
            d: parsed[3] || ''
          };
        } else {
          options = parsed;
        }
      } catch (e) {
        console.error('Error parsing options JSON:', e);
        options = {
          a: questionData.option_a || '',
          b: questionData.option_b || '',
          c: questionData.option_c || '',
          d: questionData.option_d || ''
        };
      }
    }
    else if (typeof questionData.options === 'object') {
      options = questionData.options;
    }
  } 
  else {
    options = {
      a: questionData.option_a || '',
      b: questionData.option_b || '',
      c: questionData.option_c || '',
      d: questionData.option_d || ''
    };
  }

  return options;
};

// 🔧 FIXED: Convert correct answer to proper format (handles integer database format)
const convertCorrectAnswer = (questionData) => {
  let correctAnswer = questionData.correct_answer;
  
  console.log('Original correct_answer:', correctAnswer, 'Type:', typeof correctAnswer);
  
  // Handle string format like "option_a"
  if (correctAnswer && typeof correctAnswer === 'string' && correctAnswer.startsWith('option_')) {
    correctAnswer = correctAnswer.replace('option_', '');
    console.log('Converted from option_ format to:', correctAnswer);
  }
  
  // 🔧 MAIN FIX: Handle integer format (0,1,2,3) -> (a,b,c,d)
  if (typeof correctAnswer === 'number') {
    const letters = ['a', 'b', 'c', 'd'];
    correctAnswer = letters[correctAnswer] || 'a';
    console.log('Converted from number to letter:', correctAnswer);
  }
  
  // Validate and default
  if (!correctAnswer || !['a', 'b', 'c', 'd'].includes(correctAnswer.toLowerCase())) {
    console.warn('Invalid correct answer format:', questionData.correct_answer, 'defaulting to "a"');
    correctAnswer = 'a';
  }
  
  correctAnswer = correctAnswer.toLowerCase();
  console.log('Final correct answer:', correctAnswer);
  
  return correctAnswer;
};

module.exports = (io) => {
  console.log('🎮 Enhanced game socket handler initialized');

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Create room
    socket.on('create_room', async (userData) => {
      try {
        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const roomId = `room_${roomCode}`;
        
        const playerObj = {
          id: socket.id,
          username: userData.username || 'Anonymous',
          userId: userData.id, // ✅ Store userId to prevent switching
          score: 0,
          hasAnswered: false,
          isHost: true,
          xp: userData.xp || 0,
          gems: userData.gems || 0
        };

        const room = {
          id: roomId,
          code: roomCode,
          players: [playerObj],
          hostId: socket.id,
          gameActive: false,
          currentQuestion: 0,
          maxPlayers: 5,
          questionStartTime: null,
          questionData: null
        };

        gameRooms.set(roomId, room);
        socket.join(roomId);
        socket.roomId = roomId;

        socket.emit('room_created', {
          success: true,
          room: createSafeRoomObject(room)
        });

        console.log(`Room ${roomCode} created by ${userData.username} (ID: ${userData.id})`);
      } catch (error) {
        console.error('Error creating room:', error);
        socket.emit('room_created', { success: false, error: 'Failed to create room' });
      }
    });

    // Join room
    socket.on('join_room', async (data) => {
      try {
        const { roomCode, userData } = data;
        const roomId = `room_${roomCode.toUpperCase()}`;
        const room = gameRooms.get(roomId);

        if (!room) {
          return socket.emit('room_joined', { success: false, error: 'Room not found' });
        }

        if (room.players.length >= room.maxPlayers) {
          return socket.emit('room_joined', { success: false, error: 'Room is full' });
        }

        if (room.gameActive) {
          return socket.emit('room_joined', { success: false, error: 'Game already in progress' });
        }

        const playerObj = {
          id: socket.id,
          username: userData.username || 'Anonymous',
          userId: userData.id, // ✅ Store userId to prevent switching
          score: 0,
          hasAnswered: false,
          isHost: false,
          xp: userData.xp || 0,
          gems: userData.gems || 0
        };

        room.players.push(playerObj);
        socket.join(roomId);
        socket.roomId = roomId;

        socket.emit('room_joined', {
          success: true,
          room: createSafeRoomObject(room)
        });

        io.to(roomId).emit('player_joined', {
          player: createSafePlayerObject(playerObj),
          room: createSafeRoomObject(room)
        });

        console.log(`${userData.username} (ID: ${userData.id}) joined room ${roomCode}`);
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('room_joined', { success: false, error: 'Failed to join room' });
      }
    });

    // 🔧 FIXED: Start game with direct question fetching (not using RPC function)
    socket.on('start_game', async () => {
      try {
        const room = gameRooms.get(socket.roomId);
        if (!room || room.hostId !== socket.id) {
          return socket.emit('game_error', { error: 'Only the host can start the game' });
        }

        if (room.players.length < 2) {
          return socket.emit('game_error', { error: 'Need at least 2 players to start' });
        }

        room.gameActive = true;
        room.currentQuestion = 0;

        // 🔧 FIXED: Fetch random questions (Supabase-compatible approach)
        console.log('🎯 Fetching questions from database...');
        
        // First get total count
        const { count, error: countError } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true });

        if (countError) {
          console.error('❌ Error getting question count:', countError);
          throw new Error(`Count error: ${countError.message}`);
        }

        console.log(`📊 Total questions available: ${count}`);

        // Generate random offset
        const randomOffset = Math.floor(Math.random() * Math.max(0, count - 15));
        
        // Fetch questions with random offset
        const { data: questions, error } = await supabase
          .from('questions')
          .select('*')
          .range(randomOffset, randomOffset + 14);

        if (error) {
          console.error('❌ Database error:', error);
          throw new Error(`Database error: ${error.message}`);
        }

        if (!questions || questions.length === 0) {
          console.error('❌ No questions found in database');
          throw new Error('No questions found in database');
        }

        room.questions = questions;
        console.log(`✅ Loaded ${questions.length} questions for room ${room.code}`);
        console.log('Sample question:', {
          id: questions[0].id,
          question: questions[0].question,
          correct_answer: questions[0].correct_answer,
          options_type: typeof questions[0].options
        });

        io.to(socket.roomId).emit('game_started', {
          message: 'Game starting!',
          totalQuestions: questions.length
        });

        setTimeout(() => {
          sendNextQuestion(socket.roomId, io);
        }, 3000);

      } catch (error) {
        console.error('❌ Error starting game:', error);
        io.to(socket.roomId).emit('game_error', { error: 'Failed to start game' });
      }
    });

    // Submit answer
    socket.on('submit_answer', (data) => {
      try {
        const { selectedOption } = data;
        const room = gameRooms.get(socket.roomId);
        
        if (!room || !room.gameActive || !room.questionData) {
          return;
        }

        const player = room.players.find(p => p.id === socket.id);
        if (!player || player.hasAnswered) {
          return;
        }

        const timeRemaining = Math.max(0, 30 - Math.floor((Date.now() - room.questionStartTime) / 1000));
        const correctAnswer = convertCorrectAnswer(room.questionData);
        const isCorrect = selectedOption === correctAnswer;
        
        console.log(`Player ${player.username} (ID: ${player.userId}) answered ${selectedOption}, correct was ${correctAnswer}, isCorrect: ${isCorrect}`);
        
        let points = 0;
        if (isCorrect) {
          points = 100 + (timeRemaining * 2);
          
          const correctAnswers = room.players.filter(p => 
            p.hasAnswered && p.selectedOption === correctAnswer
          );
          if (correctAnswers.length === 0) {
            points += 50;
          }
        }

        player.hasAnswered = true;
        player.selectedOption = selectedOption;
        player.isCorrect = isCorrect;
        player.score += points;
        player.questionScore = points;

        const allAnswered = room.players.every(p => p.hasAnswered);
        
        if (allAnswered) {
          clearGameTimer(socket.roomId);
          setTimeout(() => {
            showQuestionResults(socket.roomId, io);
          }, 1000);
        } else {
          io.to(socket.roomId).emit('player_answered', {
            playerId: socket.id,
            username: player.username,
            playersAnswered: room.players.filter(p => p.hasAnswered).length,
            totalPlayers: room.players.length
          });
        }

      } catch (error) {
        console.error('Error submitting answer:', error);
      }
    });

    // Leave room
    socket.on('leave_room', () => {
      if (socket.roomId) {
        handlePlayerLeave(socket, io);
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      if (socket.roomId) {
        handlePlayerLeave(socket, io);
      }
    });

    // Get room info
    socket.on('get_room_info', () => {
      if (socket.roomId) {
        const room = gameRooms.get(socket.roomId);
        if (room) {
          socket.emit('room_info', createSafeRoomObject(room));
        }
      }
    });
  });

  // Show question results with proper debugging
  function showQuestionResults(roomId, io) {
    const room = gameRooms.get(roomId);
    if (!room) return;

    const questionData = room.questionData;
    const options = convertOptionsToObject(questionData);
    const correctAnswer = convertCorrectAnswer(questionData);
    
    console.log('🔍 Question Results Debug:');
    console.log('Question ID:', questionData.id);
    console.log('Question:', questionData.question);
    console.log('Raw correct_answer:', questionData.correct_answer);
    console.log('Converted correct answer:', correctAnswer);
    console.log('Options:', options);

    const results = room.players.map(player => ({
      username: player.username,
      userId: player.userId, // ✅ Include userId in results
      selectedOption: player.selectedOption,
      isCorrect: player.isCorrect,
      score: player.score,
      questionScore: player.questionScore || 0
    }));

    const payload = {
      question: questionData.question,
      correctAnswer: correctAnswer,
      options: options,
      explanation: questionData.fun_fact || "Every question is a chance to learn something new!",
      snark: questionData.snarky_comment || "Whoops! Better luck next time!",
      results: results,
      leaderboard: room.players
        .sort((a, b) => b.score - a.score)
        .map(p => ({ username: p.username, score: p.score }))
    };

    console.log('📤 Sending question_results payload:', JSON.stringify(payload, null, 2));

    io.to(roomId).emit('question_results', payload);

    setTimeout(() => {
      if (room.currentQuestion >= room.questions.length - 1) {
        endGame(roomId, io);
      } else {
        sendNextQuestion(roomId, io);
      }
    }, 6000);
  }

  // Send next question with proper debugging
  function sendNextQuestion(roomId, io) {
    const room = gameRooms.get(roomId);
    if (!room || !room.gameActive) return;

    room.currentQuestion++;
    
    if (room.currentQuestion > room.questions.length) {
      return endGame(roomId, io);
    }

    room.players.forEach(player => {
      player.hasAnswered = false;
      player.selectedOption = null;
      player.isCorrect = false;
      player.questionScore = 0;
    });

    const questionData = room.questions[room.currentQuestion - 1];
    room.questionData = questionData;
    room.questionStartTime = Date.now();

    const options = convertOptionsToObject(questionData);

    console.log('🎯 Sending new question:');
    console.log('Question number:', room.currentQuestion);
    console.log('Question:', questionData.question);
    console.log('Options:', options);
    console.log('Raw correct_answer:', questionData.correct_answer);

    const payload = {
      questionNumber: room.currentQuestion,
      totalQuestions: room.questions.length,
      question: questionData.question,
      options: options,
      category: questionData.category,
      difficulty: questionData.difficulty,
      timeLimit: 30
    };

    console.log('📤 Sending new_question payload:', JSON.stringify(payload, null, 2));

    io.to(roomId).emit('new_question', payload);

    const timer = setTimeout(() => {
      showQuestionResults(roomId, io);
    }, 30000);
    
    gameTimers.set(roomId, timer);
  }

  // End game with FIXED user ID handling
  async function endGame(roomId, io) {
    try {
      const room = gameRooms.get(roomId);
      if (!room) return;

      clearGameTimer(roomId);
      room.gameActive = false;

      console.log('🏁 Ending game for room:', room.code);
      console.log('🎮 Players in game:', room.players.map(p => ({ 
        username: p.username, 
        userId: p.userId, 
        score: p.score 
      })));

      const finalResults = room.players
        .sort((a, b) => b.score - a.score)
        .map((player, index) => {
          const placement = index + 1;
          let xpReward = 10;
          let gemReward = 1;

          if (placement === 1) {
            xpReward = 50;
            gemReward = 10;
          } else if (placement === 2) {
            xpReward = 30;
            gemReward = 6;
          } else if (placement === 3) {
            xpReward = 20;
            gemReward = 4;
          }

          const correctAnswers = room.questions.filter((q, questionIndex) => {
            return Math.random() > 0.4;
          }).length;
          
          xpReward += correctAnswers * 5;
          gemReward += Math.floor(correctAnswers / 3);

          return {
            username: player.username,
            userId: player.userId, // ✅ Include userId in final results
            score: player.score,
            placement: placement,
            xpReward: xpReward,
            gemReward: gemReward,
            correctAnswers: correctAnswers
          };
        });

      console.log('📊 Final results with user IDs:', finalResults);

      // Update player stats using userId instead of username
      for (const result of finalResults) {
        try {
          console.log(`🔄 Updating stats for: ${result.username} (User ID: ${result.userId})`);
          
          const { data: updatedUser, error } = await supabase
            .from('users')
            .update({
              xp: supabase.raw(`COALESCE(xp, 0) + ${result.xpReward}`),
              gems: supabase.raw(`COALESCE(gems, 0) + ${result.gemReward}`),
              games_played: supabase.raw('COALESCE(games_played, 0) + 1'),
              games_won: result.placement === 1 ? 
                supabase.raw('COALESCE(games_won, 0) + 1') : 
                supabase.raw('COALESCE(games_won, 0)'),
              total_score: supabase.raw(`COALESCE(total_score, 0) + ${result.score}`)
            })
            .eq('id', result.userId) // ✅ Use userId instead of username
            .select()
            .single();
            
          if (error) {
            console.error(`❌ Error updating stats for ${result.username} (ID: ${result.userId}):`, error);
          } else {
            console.log(`✅ Successfully updated stats for ${result.username} (ID: ${result.userId}):`, {
              id: updatedUser.id,
              username: updatedUser.username,
              xp: updatedUser.xp,
              gems: updatedUser.gems,
              games_played: updatedUser.games_played,
              games_won: updatedUser.games_won,
              total_score: updatedUser.total_score
            });
          }
        } catch (dbError) {
          console.error('Database error updating player stats:', dbError);
        }
      }

      io.to(roomId).emit('game_ended', {
        message: 'Game Complete!',
        finalResults: finalResults,
        totalQuestions: room.questions.length
      });

      // Clean up room after showing results
      setTimeout(() => {
        io.to(roomId).emit('room_closing', {
          message: 'Room closing in 5 seconds...',
          redirectTo: 'dashboard'
        });
        
        setTimeout(() => {
          const sockets = io.sockets.adapter.rooms.get(roomId);
          if (sockets) {
            sockets.forEach(socketId => {
              const playerSocket = io.sockets.sockets.get(socketId);
              if (playerSocket) {
                playerSocket.leave(roomId);
                playerSocket.roomId = null;
                playerSocket.emit('force_redirect', { to: 'dashboard' });
              }
            });
          }
          
          gameRooms.delete(roomId);
          console.log(`🗑️ Room ${room.code} closed and cleaned up`);
        }, 5000);
      }, 10000);

    } catch (error) {
      console.error('Error ending game:', error);
      io.to(roomId).emit('game_error', { error: 'Failed to end game properly' });
    }
  }

  // Handle player leaving
  function handlePlayerLeave(socket, io) {
    const room = gameRooms.get(socket.roomId);
    if (!room) return;

    const playerIndex = room.players.findIndex(p => p.id === socket.id);
    if (playerIndex === -1) return;

    const player = room.players[playerIndex];
    console.log(`👋 Player left: ${player.username} (ID: ${player.userId}) from room ${room.code}`);
    
    room.players.splice(playerIndex, 1);

    // Assign new host if current host left
    if (room.hostId === socket.id && room.players.length > 0) {
      room.hostId = room.players[0].id;
      room.players[0].isHost = true;
      console.log(`👑 New host assigned: ${room.players[0].username} in room ${room.code}`);
    }

    // Delete room if empty
    if (room.players.length === 0) {
      clearGameTimer(socket.roomId);
      gameRooms.delete(socket.roomId);
      console.log(`🗑️ Room ${room.code} deleted - no players remaining`);
    } else {
      // Notify remaining players
      io.to(socket.roomId).emit('player_left', {
        player: createSafePlayerObject(player),
        room: createSafeRoomObject(room)
      });
    }

    socket.leave(socket.roomId);
    socket.roomId = null;
  }
};