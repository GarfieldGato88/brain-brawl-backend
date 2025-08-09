// Enhanced server.js compatible with new gameSocket.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const server = http.createServer(app);

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
};

// Socket.io setup with CORS
const io = socketIo(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling']
});

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Test Supabase connection
console.log('🔍 Server.js - Testing Supabase connection...');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Add this to your server.js file
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const handleGameSocket = require('./routes/gameSocket'); // Updated import

const app = express();
const server = createServer(app);

// CORS configuration
const corsOptions = {
  origin: "http://localhost:3000", // Your React app
  credentials: true
};

app.use(cors({
  origin: [
    'http://localhost:3000',  // Local development
    'https://brain-brawl-frontend-xyz.vercel.app',  // https://brain-brawl-six.vercel.app/
    /\.vercel\.app$/  // Allow any Vercel subdomain
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Socket.io setup with CORS
const io = new Server(server, {
  cors: corsOptions
});

// Initialize game socket handlers
handleGameSocket(io);

// Your existing middleware and routes
app.use(express.json());
app.use('/api/auth', require('./routes/auth'));

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Brain Brawl Backend is running!' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Brain Brawl server running on port ${PORT}`);
});

// Test database connection
supabase
  .from('users')
  .select('count', { count: 'exact', head: true })
  .then(({ error, count }) => {
    if (error) {
      console.error('❌ Database connection failed:', error.message);
    } else {
      console.log('✅ Database connection test successful');
      console.log(`📊 Database: Connected (${count || 0} users)`);
    }
  });

// Routes
app.get('/', (req, res) => {
  res.json({
    message: '🧠 Brain Brawl API Server',
    version: '1.7',
    status: 'running',
    features: [
      'Enhanced visual feedback',
      'Educational content system', 
      'Complete game flow',
      'User stats tracking',
      'Proper game ending'
    ],
    endpoints: {
      auth: '/api/auth/*',
      health: '/health'
    },
    socket: 'Socket.io enabled for real-time multiplayer',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// Auth routes
try {
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes mounted successfully');
} catch (error) {
  console.error('❌ Failed to load auth routes:', error.message);
}

// Socket.io game handler - FIXED
try {
  console.log('🎮 Initializing enhanced game socket handler...');
  
  // Import the game socket handler (it's a function that takes io as parameter)
  const gameSocketHandler = require('./routes/gameSocket');
  
  // Call the function with the io instance
  gameSocketHandler(io);
  
  console.log('✅ Enhanced game socket handler attached successfully');
} catch (error) {
  console.error('❌ Failed to attach game socket handler:', error.message);
  console.error('Stack trace:', error.stack);
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);
  
  socket.on('disconnect', (reason) => {
    console.log(`🔌 User disconnected: ${socket.id} (${reason})`);
  });
});

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

server.listen(PORT, () => {
  console.log('\n🚀 Brain Brawl server running on port', PORT);
  console.log('🎮 Socket.io ready for multiplayer battles!');
  console.log('📍 Environment:', NODE_ENV);
  console.log('🌐 Server URL: http://localhost:' + PORT);
  
  if (NODE_ENV === 'development') {
    console.log('🔧 Development mode - Auto-restart enabled');
    console.log('🌐 Frontend should connect to: http://localhost:' + PORT);
  }
});

module.exports = { app, server, io };