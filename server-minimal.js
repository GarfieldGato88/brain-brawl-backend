const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

console.log('🚀 Starting Brain Brawl server...');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ["https://your-frontend-domain.vercel.app"]
    : ["http://localhost:3000", "http://localhost:3001"],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: '🧠 Brain Brawl API',
    version: '1.0.0',
    status: 'active',
    endpoints: {
      auth: '/api/auth',
      health: '/health'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Test import auth routes
console.log('📁 Importing auth routes...');
try {
  const authRoutes = require('./routes/auth');
  console.log('✅ Auth routes imported successfully');
  console.log('Type:', typeof authRoutes);
  
  if (typeof authRoutes === 'function') {
    app.use('/api/auth', authRoutes);
    console.log('✅ Auth routes mounted at /api/auth');
  } else {
    console.error('❌ Auth routes is not a function:', typeof authRoutes);
  }
} catch (error) {
  console.error('❌ Failed to import auth routes:', error.message);
  console.error('Stack:', error.stack);
}

// Test import game socket
console.log('🎮 Importing game socket...');
try {
  const handleGameSocket = require('./routes/gameSocket');
  console.log('✅ Game socket imported successfully');
  console.log('Type:', typeof handleGameSocket);
} catch (error) {
  console.error('❌ Failed to import game socket:', error.message);
  console.error('Stack:', error.stack);
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Create HTTP server
const server = createServer(app);

// Initialize Socket.io
console.log('🔌 Initializing Socket.io...');
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ["https://your-frontend-domain.vercel.app"]
      : ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});
console.log('✅ Socket.io initialized');

// Handle game socket connections
try {
  const handleGameSocket = require('./routes/gameSocket');
  handleGameSocket(io);
  console.log('✅ Game socket handler attached');
} catch (error) {
  console.error('❌ Failed to attach game socket handler:', error.message);
}

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 Brain Brawl server running on port ${PORT}`);
  console.log(`🎮 Socket.io ready for multiplayer battles!`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Server URL: http://localhost:${PORT}`);
});