const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Test endpoint
router.get('/test', (req, res) => {
  console.log('🧪 Test endpoint hit!');
  res.json({ 
    success: true, 
    message: 'Auth routes are working!',
    timestamp: new Date().toISOString()
  });
});

// Registration endpoint
router.post('/register', async (req, res) => {
  console.log('=== REGISTRATION ATTEMPT ===');
  console.log('Request body:', req.body);
  
  try {
    const { username, email, password } = req.body;
    
    // Input validation
    if (!username || !email || !password) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Username, email, and password are required'
      });
    }
    
    console.log('✅ Input validation passed');
    
    // Normalize email to lowercase for consistent storage and checking
    const normalizedEmail = email.toLowerCase().trim();
    const trimmedUsername = username.trim();
    
    console.log('📧 Normalized email:', normalizedEmail);
    
    // Check if user already exists (case-insensitive email check)
    console.log('🔍 Checking for existing user...');
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email, username')
      .or(`email.eq.${normalizedEmail},username.eq.${trimmedUsername}`)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.log('❌ Database check error:', checkError);
      return res.status(500).json({
        success: false,
        message: 'Database error during user check'
      });
    }
    
    if (existingUser) {
      console.log('❌ User already exists:', existingUser);
      return res.status(400).json({
        success: false,
        message: 'User already exists with that email or username'
      });
    }
    
    console.log('✅ No existing user found, proceeding with registration');
    
    // Hash password
    console.log('🔐 Hashing password...');
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log('✅ Password hashed successfully');
    
    // Create user
    console.log('💾 Attempting to insert user into database...');
    const insertData = {
      username: trimmedUsername,
      email: normalizedEmail, // Store email in lowercase
      password: hashedPassword,
      gems: 100,
      xp: 0,
      streak_count: 0,
      games_played: 0,
      games_won: 0,
      total_score: 0,
      best_streak: 0,
      last_login: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    
    console.log('Insert data:', { ...insertData, password: '[HIDDEN]' });
    
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([insertData])
      .select()
      .single();
    
    if (insertError) {
      console.log('❌ Database insert error:', insertError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create user',
        error: insertError.message
      });
    }
    
    console.log('✅ User created successfully:', { ...newUser, password: '[HIDDEN]' });
    
    // Generate JWT token
    console.log('🎟️ Generating JWT token...');
    const token = jwt.sign(
      { 
        userId: newUser.id, 
        email: newUser.email,
        username: newUser.username 
      },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '7d' }
    );
    console.log('✅ JWT token generated successfully');
    
    // Remove password from response
    const { password: _, ...userResponse } = newUser;
    
    const response = {
      success: true,
      message: 'User registered successfully',
      token,
      user: userResponse
    };
    
    console.log('📤 Sending success response:', { ...response, token: '[HIDDEN]' });
    res.status(201).json(response);
    
  } catch (error) {
    console.log('💥 Unexpected error during registration:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
});

// Login endpoint - FIXED VERSION
router.post('/login', async (req, res) => {
  console.log('=== LOGIN ATTEMPT ===');
  console.log('Request body:', { ...req.body, password: '[HIDDEN]' });
  
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    // CRITICAL FIX: Normalize email to lowercase for case-insensitive comparison
    const normalizedEmail = email.toLowerCase().trim();
    console.log('📧 Original email:', email);
    console.log('📧 Normalized email:', normalizedEmail);
    console.log('🔍 Looking up user by normalized email...');
    
    // Find user by email (exact match with normalized email)
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .single();
    
    if (findError || !user) {
      console.log('❌ User not found with normalized email:', normalizedEmail);
      console.log('❌ Find error:', findError);
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    console.log('✅ User found:', { ...user, password: '[HIDDEN]' });
    
    // Check password
    console.log('🔐 Verifying password...');
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      console.log('❌ Password does not match');
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    console.log('✅ Password verified successfully');
    
    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);
    
    // Generate token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        username: user.username 
      },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '7d' }
    );
    
    // Remove password from response
    const { password: _, ...userResponse } = user;
    
    console.log('📤 Sending login success response');
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userResponse
    });
    
  } catch (error) {
    console.log('💥 Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

// Profile endpoint
router.get('/profile', async (req, res) => {
  console.log('=== PROFILE REQUEST ===');
  
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No valid authorization header');
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const token = authHeader.substring(7);
    console.log('🎟️ Token received, verifying...');
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
    console.log('✅ Token verified for user:', decoded.userId);
    
    // Get user data
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .single();
    
    if (error || !user) {
      console.log('❌ User not found:', error);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Remove password from response
    const { password: _, ...userResponse } = user;
    
    console.log('📤 Sending profile data');
    res.json({
      success: true,
      user: userResponse
    });
    
  } catch (error) {
    console.log('💥 Profile error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token',
      error: error.message
    });
  }
});

module.exports = router;