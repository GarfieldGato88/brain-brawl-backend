// models/GameRoom.js
'use strict';

class GameRoom {
  constructor(code, hostId) {
    if (!code || !hostId) {
      throw new Error('Room code and host ID are required');
    }
    
    this.code = code;
    this.hostId = hostId;
    this.players = new Map();
    this.status = 'waiting'; // waiting, playing, finished
    this.currentQuestion = 0;
    this.questions = [];
    this.scores = new Map();
    this.questionStartTime = null;
    this.maxPlayers = 5;
    this.createdAt = new Date();
    this.gameStartedAt = null;
    
    console.log(`🎮 GameRoom ${code} created with host ${hostId}`);
  }

  addPlayer(userId, username, socketId) {
    if (this.players.size >= this.maxPlayers) {
      throw new Error(`Room is full (max ${this.maxPlayers} players)`);
    }
    
    if (this.status === 'playing') {
      throw new Error('Cannot join - game already started');
    }
    
    if (this.players.has(userId)) {
      // Update existing player's socket ID (reconnection)
      const player = this.players.get(userId);
      player.socketId = socketId;
      console.log(`🔄 Player ${username} reconnected to room ${this.code}`);
    } else {
      // Add new player
      this.players.set(userId, {
        id: userId,
        username: username || `Player${userId}`,
        socketId,
        score: 0,
        ready: false,
        joinedAt: new Date(),
        answers: []
      });
      
      this.scores.set(userId, 0);
      console.log(`➕ Player ${username} added to room ${this.code} (${this.players.size}/${this.maxPlayers})`);
    }
  }

  removePlayer(userId) {
    if (!this.players.has(userId)) {
      return false;
    }
    
    const player = this.players.get(userId);
    this.players.delete(userId);
    this.scores.delete(userId);
    
    console.log(`➖ Player ${player.username} removed from room ${this.code}`);
    
    // If host leaves, transfer to next player or mark room for deletion
    if (userId === this.hostId && this.players.size > 0) {
      const newHostId = this.players.keys().next().value;
      this.hostId = newHostId;
      console.log(`👑 Host transferred to player ${newHostId} in room ${this.code}`);
    }
    
    return true;
  }

  startGame(questions) {
    if (this.players.size < 1) {
      throw new Error('Need at least 1 player to start');
    }
    
    if (this.status !== 'waiting') {
      throw new Error('Game already started or finished');
    }
    
    if (!questions || questions.length === 0) {
      throw new Error('No questions provided');
    }
    
    this.status = 'playing';
    this.questions = questions;
    this.currentQuestion = 0;
    this.questionStartTime = new Date();
    this.gameStartedAt = new Date();
    
    // Reset all player scores and ready status
    this.players.forEach((player, userId) => {
      player.score = 0;
      player.ready = false;
      player.answers = [];
      this.scores.set(userId, 0);
    });
    
    console.log(`🚀 Game started in room ${this.code} with ${questions.length} questions`);
  }

  submitAnswer(userId, answer, timeSpent = 0) {
    if (this.status !== 'playing') {
      throw new Error('Game is not active');
    }
    
    if (!this.players.has(userId)) {
      throw new Error('Player not in room');
    }
    
    const question = this.questions[this.currentQuestion];
    if (!question) {
      throw new Error('No current question');
    }
    
    const isCorrect = answer === question.correct_answer;
    
    // Calculate score: base points + time bonus
    let points = 0;
    if (isCorrect) {
      const maxTimeBonus = 500;
      const timeBonus = Math.max(0, maxTimeBonus - Math.floor(timeSpent / 10));
      points = 100 + timeBonus;
    }
    
    // Update player score
    const currentScore = this.scores.get(userId) || 0;
    this.scores.set(userId, currentScore + points);
    
    // Update player data
    const player = this.players.get(userId);
    player.score = currentScore + points;
    player.answers.push({
      questionIndex: this.currentQuestion,
      answer,
      isCorrect,
      points,
      timeSpent
    });
    
    console.log(`📊 Player ${player.username} answered ${answer} (${isCorrect ? 'Correct' : 'Wrong'}) +${points} points`);
    
    return { 
      isCorrect, 
      points, 
      correctAnswer: question.correct_answer,
      totalScore: currentScore + points
    };
  }

  nextQuestion() {
    if (this.status !== 'playing') {
      throw new Error('Game is not active');
    }
    
    this.currentQuestion++;
    this.questionStartTime = new Date();
    
    if (this.currentQuestion >= this.questions.length) {
      this.status = 'finished';
      console.log(`🏁 Game finished in room ${this.code}`);
      return null;
    }
    
    console.log(`➡️ Room ${this.code} advanced to question ${this.currentQuestion + 1}/${this.questions.length}`);
    return this.questions[this.currentQuestion];
  }

  getLeaderboard() {
    return Array.from(this.players.values())
      .map(player => ({
        id: player.id,
        username: player.username,
        score: this.scores.get(player.id) || 0,
        correctAnswers: player.answers.filter(a => a.isCorrect).length,
        totalAnswers: player.answers.length
      }))
      .sort((a, b) => b.score - a.score);
  }

  getCurrentQuestion() {
    if (this.currentQuestion >= this.questions.length) {
      return null;
    }
    
    const question = this.questions[this.currentQuestion];
    return {
      questionNumber: this.currentQuestion + 1,
      totalQuestions: this.questions.length,
      question: question.question,
      options: [question.option_a, question.option_b, question.option_c, question.option_d],
      category: question.category,
      timeLimit: 15000 // 15 seconds
    };
  }

  getGameStats() {
    return {
      code: this.code,
      status: this.status,
      playerCount: this.players.size,
      maxPlayers: this.maxPlayers,
      currentQuestion: this.currentQuestion + 1,
      totalQuestions: this.questions.length,
      createdAt: this.createdAt,
      gameStartedAt: this.gameStartedAt,
      hostId: this.hostId
    };
  }

  isHost(userId) {
    return userId === this.hostId;
  }

  hasPlayer(userId) {
    return this.players.has(userId);
  }

  canStart() {
    return this.status === 'waiting' && this.players.size >= 1;
  }
}

// Ensure proper export
module.exports = GameRoom;