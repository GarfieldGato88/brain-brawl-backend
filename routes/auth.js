const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

// Enhanced environment variable checking
console.log('🔍 Auth.js - Checking Supabase environment variables:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Found' : '❌ Missing');
console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? '✅ Found' : '❌ Missing');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Found' : '❌ Missing');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Found' : '❌ Missing');

// Use SUPABASE_KEY (service role) for server-side operations
console.log('🔗 Auth.js - Creating Supabase client...');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY // Using service role key for full access
);
console.log('✅ Auth.js - Supabase client created successfully');

// Test database connection
const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) {
      console.log('❌ Database connection test failed:', error.message);
    } else {
      console.log('✅ Database connection test successful');
    }
  } catch (err) {
    console.log('❌ Database connection error:', err.message);
  }
};

testConnection();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log('🔐 JWT verification failed:', err.message);
      return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
    
    console.log('🔐 JWT verified for user:', user.username, 'ID:', user.userId);
    req.user = user;
    next();
  });
};

// Register endpoint
router.post('/register', async (req, res) => {
  console.log('📝 Register attempt for:', req.body.username);
  
  try {
    const { username, email, password } = req.body;

    if (!username || !password) {
      console.log('❌ Missing username or password');
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password required' 
      });
    }

    if (password.length < 3) {
      console.log('❌ Password too short');
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 3 characters' 
      });
    }

    // Check if user already exists
    console.log('🔍 Checking if user exists...');
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, username')
      .eq('username', username)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.log('❌ Database error checking user:', checkError);
      return res.status(500).json({ 
        success: false, 
        message: 'Database error' 
      });
    }

    if (existingUser) {
      console.log('❌ User already exists:', existingUser.username);
      return res.status(400).json({ 
        success: false, 
        message: 'Username already exists' 
      });
    }

    // Hash password
    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with all required fields
    console.log('👤 Creating new user...');
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([
        {
          username,
          email: email || null,
          password: hashedPassword,
          xp: 0,
          gems: 10, // Starting gems
          games_played: 0,
          games_won: 0,
          total_score: 0,
          current_streak: 0,
          best_streak: 0,
          last_login: new Date().toISOString()
        }
      ])
      .select('id, username, email, xp, gems, games_played, games_won, total_score, current_streak, best_streak')
      .single();

    if (createError) {
      console.log('❌ Error creating user:', createError);
      return res.status(500).json({ 
        success: false, 
        message: 'Error creating user: ' + createError.message 
      });
    }

    // Generate JWT token with UNIQUE user ID
    if (!process.env.JWT_SECRET) {
      console.log('❌ JWT_SECRET not configured');
      return res.status(500).json({ 
        success: false, 
        message: 'Server configuration error' 
      });
    }

    console.log('🎫 Generating JWT token for user ID:', newUser.id);
    const token = jwt.sign(
      { 
        userId: newUser.id,        // ✅ Use database ID for uniqueness
        username: newUser.username 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✅ User registered successfully:', newUser.username, 'with ID:', newUser.id);
    res.status(201).json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        xp: newUser.xp || 0,
        gems: newUser.gems || 10,
        games_played: newUser.games_played || 0,
        games_won: newUser.games_won || 0,
        total_score: newUser.total_score || 0,
        current_streak: newUser.current_streak || 0,
        best_streak: newUser.best_streak || 0
      },
      token
    });

  } catch (error) {
    console.error('💥 Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration' 
    });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  console.log('🔐 Login attempt for:', req.body.username);
  
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      console.log('❌ Missing username or password');
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password required' 
      });
    }

    // Find user
    console.log('🔍 Looking up user...');
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (findError || !user) {
      console.log('❌ User not found:', findError?.message);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }

    console.log('👤 User found:', user.username, 'with ID:', user.id);
    
    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      console.log('❌ Invalid password for user:', user.username);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }

    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // Generate JWT token with UNIQUE user ID
    if (!process.env.JWT_SECRET) {
      console.log('❌ JWT_SECRET not configured');
      return res.status(500).json({ 
        success: false, 
        message: 'Server configuration error' 
      });
    }

    console.log('🎫 Generating JWT token for user ID:', user.id);
    const token = jwt.sign(
      { 
        userId: user.id,        // ✅ Use database ID for uniqueness
        username: user.username 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✅ Login successful for:', user.username, 'with ID:', user.id);
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        xp: user.xp || 0,
        gems: user.gems || 10,
        games_played: user.games_played || 0,
        games_won: user.games_won || 0,
        total_score: user.total_score || 0,
        current_streak: user.current_streak || 0,
        best_streak: user.best_streak || 0
      },
      token
    });

  } catch (error) {
    console.error('💥 Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
});

// Get user profile (protected route) - FIXED to prevent user mix-up
router.get('/profile', authenticateToken, async (req, res) => {
  console.log('👤 Profile request for user ID:', req.user.userId, 'username:', req.user.username);
  
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, xp, gems, games_played, games_won, total_score, current_streak, best_streak, last_login')
      .eq('id', req.user.userId) // ✅ CRITICAL: Use JWT user ID, not username
      .single();

    if (error || !user) {
      console.log('❌ User not found for profile ID:', req.user.userId, 'Error:', error?.message);
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Double-check that the username matches what's in the JWT
    if (user.username !== req.user.username) {
      console.log('⚠️ Username mismatch! JWT:', req.user.username, 'DB:', user.username);
      return res.status(401).json({
        success: false,
        message: 'User identity mismatch'
      });
    }

    console.log('✅ Profile retrieved for:', user.username, 'ID:', user.id);
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        xp: user.xp || 0,
        gems: user.gems || 10,
        games_played: user.games_played || 0,
        games_won: user.games_won || 0,
        total_score: user.total_score || 0,
        current_streak: user.current_streak || 0,
        best_streak: user.best_streak || 0,
        last_login: user.last_login
      }
    });

  } catch (error) {
    console.error('💥 Profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching profile' 
    });
  }
});

// Update user profile (protected route)
router.put('/profile', authenticateToken, async (req, res) => {
  console.log('📝 Profile update for user ID:', req.user.userId);
  
  try {
    const { email } = req.body;
    const updates = {};
    
    if (email !== undefined) updates.email = email;
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No valid fields to update' 
      });
    }

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user.userId) // ✅ Use JWT user ID
      .select('id, username, email, xp, gems, games_played, games_won, total_score, current_streak, best_streak')
      .single();

    if (error) {
      console.log('❌ Error updating profile:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Error updating profile' 
      });
    }

    console.log('✅ Profile updated for:', user.username, 'ID:', user.id);
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        xp: user.xp || 0,
        gems: user.gems || 10,
        games_played: user.games_played || 0,
        games_won: user.games_won || 0,
        total_score: user.total_score || 0,
        current_streak: user.current_streak || 0,
        best_streak: user.best_streak || 0
      }
    });

  } catch (error) {
    console.error('💥 Profile update error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error updating profile' 
    });
  }
});

module.exports = router;