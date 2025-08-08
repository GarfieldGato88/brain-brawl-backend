 
require('dotenv').config();
const { Client } = require('pg');

async function testConnection() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    
    console.log('✅ Database connected successfully!');
    
    // Test query
    const result = await client.query('SELECT NOW() as current_time');
    console.log('🕒 Database time:', result.rows[0].current_time);
    
    await client.end();
    console.log('🔌 Database connection closed.');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();