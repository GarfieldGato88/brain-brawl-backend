const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const authenticateToken = require('../middleware/auth');

// Initialize database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Get player's profile with stats
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        username,
        xp,
        gems,
        current_streak,
        longest_streak,
        games_won,
        games_played,
        created_at,
        last_played,
        CASE 
          WHEN games_played > 0 THEN ROUND((games_won * 100.0 / games_played), 1)
          ELSE 0 
        END as win_rate
      FROM users 
      WHERE user_id = $1
    `, [req.user.userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    // Get category stats
    const categoryResult = await pool.query(`
      SELECT 
        category,
        questions_answered,
        questions_correct,
        CASE 
          WHEN questions_answered > 0 THEN ROUND((questions_correct * 100.0 / questions_answered), 1)
          ELSE 0 
        END as accuracy
      FROM user_stats 
      WHERE user_id = $1
      ORDER BY questions_answered DESC
    `, [req.user.userId]);
    
    res.json({
      user,
      categoryStats: categoryResult.rows
    });
    
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get game history  
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await pool.query(`
      SELECT 
        gs.session_id,
        gs.room_code,
        gs.total_players,
        gs.created_at,
        gs.total_questions
      FROM game_sessions gs
      ORDER BY gs.created_at DESC
      LIMIT $1
    `, [limit]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get leaderboards
router.get('/leaderboard/:type?', async (req, res) => {
  try {
    const type = req.params.type || 'xp';
    const limit = parseInt(req.query.limit) || 50;
    
    if (!['xp', 'gems', 'streak', 'wins'].includes(type)) {
      return res.status(400).json({ error: 'Invalid leaderboard type' });
    }
    
    let orderBy;
    switch(type) {
      case 'gems':
        orderBy = 'gems DESC';
        break;
      case 'streak':
        orderBy = 'current_streak DESC, longest_streak DESC';
        break;
      case 'wins':
        orderBy = 'games_won DESC';
        break;
      default:
        orderBy = 'xp DESC';
    }
    
    const result = await pool.query(`
      SELECT 
        username,
        xp,
        gems,
        current_streak,
        longest_streak,
        games_won,
        games_played,
        CASE 
          WHEN games_played > 0 THEN ROUND((games_won * 100.0 / games_played), 1)
          ELSE 0 
        END as win_rate
      FROM users 
      WHERE games_played > 0
      ORDER BY ${orderBy}
      LIMIT $1
    `, [limit]);
    
    const leaderboard = result.rows.map((row, index) => ({
      rank: index + 1,
      ...row
    }));
    
    res.json({
      type,
      leaderboard
    });
    
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// IMPORTANT: Export the router
module.exports = router;