const express = require('express');
const jwt = require('jsonwebtoken');
const { Client } = require('pg');
const router = express.Router();

// Database connection helper
const getDbClient = () => {
  return new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
};

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Generate random room code
const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Create new game room
router.post('/create-room', authenticateToken, async (req, res) => {
  const { category = 'all' } = req.body;
  const validCategories = ['science', 'history', 'geography', 'sports', 'pop culture', 'current events', 'all'];
  
  if (!validCategories.includes(category.toLowerCase())) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  const client = getDbClient();

  try {
    await client.connect();

    // Generate unique room code
    let roomCode;
    let codeExists = true;
    
    while (codeExists) {
      roomCode = generateRoomCode();
      const existing = await client.query('SELECT id FROM game_rooms WHERE room_code = $1', [roomCode]);
      codeExists = existing.rows.length > 0;
    }

    // Get questions for the selected category
    let questionQuery = 'SELECT * FROM trivia_questions ORDER BY RANDOM() LIMIT 15';
    let queryParams = [];
    
    if (category.toLowerCase() !== 'all') {
      questionQuery = 'SELECT * FROM trivia_questions WHERE LOWER(category) = $1 ORDER BY RANDOM() LIMIT 15';
      queryParams = [category.toLowerCase()];
    }

    const questions = await client.query(questionQuery, queryParams);
    
    if (questions.rows.length < 15) {
      return res.status(400).json({ 
        error: 'Not enough questions available for this category',
        available: questions.rows.length,
        required: 15
      });
    }

    // Create the room
    const roomResult = await client.query(`
      INSERT INTO game_rooms (room_code, host_id, category, questions_data, current_players)
      VALUES ($1, $2, $3, $4, 1)
      RETURNING id, room_code, category, created_at
    `, [roomCode, req.user.userId, category.toLowerCase(), JSON.stringify(questions.rows)]);

    const room = roomResult.rows[0];

    res.status(201).json({
      message: 'Game room created successfully!',
      room: {
        id: room.id,
        code: room.room_code,
        category: room.category,
        hostId: req.user.userId,
        maxPlayers: 5,
        currentPlayers: 1,
        status: 'waiting',
        createdAt: room.created_at
      }
    });

  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Failed to create room' });
  } finally {
    await client.end();
  }
});

// Join existing game room
router.post('/join-room', authenticateToken, async (req, res) => {
  const { roomCode } = req.body;

  if (!roomCode || roomCode.length !== 6) {
    return res.status(400).json({ error: 'Valid 6-character room code required' });
  }

  const client = getDbClient();

  try {
    await client.connect();

    // Find the room
    const roomResult = await client.query(`
      SELECT id, room_code, host_id, status, category, current_players, max_players 
      FROM game_rooms 
      WHERE room_code = $1
    `, [roomCode.toUpperCase()]);

    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const room = roomResult.rows[0];

    if (room.status !== 'waiting') {
      return res.status(400).json({ error: 'Game has already started' });
    }

    if (room.current_players >= room.max_players) {
      return res.status(400).json({ error: 'Room is full' });
    }

    // Check if user is already in the room
    const existingSession = await client.query(`
      SELECT id FROM game_sessions 
      WHERE room_id = $1 AND user_id = $2
    `, [room.id, req.user.userId]);

    if (existingSession.rows.length > 0) {
      return res.status(400).json({ error: 'Already in this room' });
    }

    // Add player to the room
    await client.query(`
      INSERT INTO game_sessions (room_id, user_id)
      VALUES ($1, $2)
    `, [room.id, req.user.userId]);

    // Update room player count
    await client.query(`
      UPDATE game_rooms 
      SET current_players = current_players + 1 
      WHERE id = $1
    `, [room.id]);

    res.json({
      message: 'Successfully joined room!',
      room: {
        id: room.id,
        code: room.room_code,
        category: room.category,
        hostId: room.host_id,
        currentPlayers: room.current_players + 1,
        maxPlayers: room.max_players,
        status: room.status
      }
    });

  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ error: 'Failed to join room' });
  } finally {
    await client.end();
  }
});

// Get room details
router.get('/room/:roomCode', authenticateToken, async (req, res) => {
  const { roomCode } = req.params;
  const client = getDbClient();

  try {
    await client.connect();

    // Get room details
    const roomResult = await client.query(`
      SELECT gr.id, gr.room_code, gr.host_id, gr.status, gr.category, 
             gr.current_players, gr.max_players, gr.created_at,
             u.username as host_username
      FROM game_rooms gr
      JOIN users u ON gr.host_id = u.id
      WHERE gr.room_code = $1
    `, [roomCode.toUpperCase()]);

    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const room = roomResult.rows[0];

    // Get players in the room
    const playersResult = await client.query(`
      SELECT u.id, u.username, u.total_xp, gs.created_at as joined_at
      FROM game_sessions gs
      JOIN users u ON gs.user_id = u.id
      WHERE gs.room_id = $1
      ORDER BY gs.created_at ASC
    `, [room.id]);

    res.json({
      room: {
        id: room.id,
        code: room.room_code,
        category: room.category,
        hostId: room.host_id,
        hostUsername: room.host_username,
        currentPlayers: room.current_players,
        maxPlayers: room.max_players,
        status: room.status,
        createdAt: room.created_at
      },
      players: playersResult.rows.map(player => ({
        id: player.id,
        username: player.username,
        totalXp: player.total_xp,
        joinedAt: player.joined_at
      }))
    });

  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ error: 'Failed to get room details' });
  } finally {
    await client.end();
  }
});

// Leave room
router.post('/leave-room', authenticateToken, async (req, res) => {
  const { roomCode } = req.body;
  const client = getDbClient();

  try {
    await client.connect();

    // Find the room
    const roomResult = await client.query(`
      SELECT id, host_id, current_players 
      FROM game_rooms 
      WHERE room_code = $1
    `, [roomCode.toUpperCase()]);

    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const room = roomResult.rows[0];

    // Remove player from the room
    const deleteResult = await client.query(`
      DELETE FROM game_sessions 
      WHERE room_id = $1 AND user_id = $2
    `, [room.id, req.user.userId]);

    if (deleteResult.rowCount === 0) {
      return res.status(400).json({ error: 'Not in this room' });
    }

    // Update room player count
    await client.query(`
      UPDATE game_rooms 
      SET current_players = current_players - 1 
      WHERE id = $1
    `, [room.id]);

    // If host left and there are other players, assign new host
    if (room.host_id === req.user.userId && room.current_players > 1) {
      const newHostResult = await client.query(`
        SELECT user_id FROM game_sessions 
        WHERE room_id = $1 
        ORDER BY created_at ASC 
        LIMIT 1
      `, [room.id]);

      if (newHostResult.rows.length > 0) {
        await client.query(`
          UPDATE game_rooms 
          SET host_id = $1 
          WHERE id = $2
        `, [newHostResult.rows[0].user_id, room.id]);
      }
    }

    // If room is empty, delete it
    if (room.current_players <= 1) {
      await client.query('DELETE FROM game_rooms WHERE id = $1', [room.id]);
    }

    res.json({ message: 'Successfully left room' });

  } catch (error) {
    console.error('Leave room error:', error);
    res.status(500).json({ error: 'Failed to leave room' });
  } finally {
    await client.end();
  }
});

// Get available categories
router.get('/categories', (req, res) => {
  res.json({
    categories: [
      { id: 'all', name: 'All Categories', icon: '🎯' },
      { id: 'science', name: 'Science', icon: '🔬' },
      { id: 'history', name: 'History', icon: '📚' },
      { id: 'geography', name: 'Geography', icon: '🌍' },
      { id: 'sports', name: 'Sports', icon: '⚽' },
      { id: 'pop culture', name: 'Pop Culture', icon: '🎬' },
      { id: 'current events', name: 'Current Events', icon: '📰' }
    ]
  });
});

module.exports = router;