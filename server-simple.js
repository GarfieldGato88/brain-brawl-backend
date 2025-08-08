 
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Simple routes first
app.get('/', (req, res) => {
  res.json({ 
    message: 'Brain Brawl Backend is running!',
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Brain Brawl Backend is healthy!',
    timestamp: new Date().toISOString()
  });
});

app.get('/test', (req, res) => {
  res.json({ 
    message: 'Test endpoint working!',
    environment: process.env.NODE_ENV || 'development'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🧠 Brain Brawl Backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Test it: http://localhost:${PORT}/`);
});