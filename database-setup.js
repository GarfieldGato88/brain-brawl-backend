 require('dotenv').config();
const { Client } = require('pg');

async function setupDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('🔌 Connected to database...');

    // Create Users table
    console.log('👤 Creating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        gems INTEGER DEFAULT 100,
        total_xp INTEGER DEFAULT 0,
        games_played INTEGER DEFAULT 0,
        games_won INTEGER DEFAULT 0,
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create Game Rooms table
    console.log('🏠 Creating game_rooms table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS game_rooms (
        id SERIAL PRIMARY KEY,
        room_code VARCHAR(6) UNIQUE NOT NULL,
        host_id INTEGER REFERENCES users(id),
        status VARCHAR(20) DEFAULT 'waiting',
        category VARCHAR(50) DEFAULT 'all',
        max_players INTEGER DEFAULT 5,
        current_players INTEGER DEFAULT 0,
        questions_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        started_at TIMESTAMP,
        ended_at TIMESTAMP
      )
    `);

    // Create Game Sessions table
    console.log('🎮 Creating game_sessions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS game_sessions (
        id SERIAL PRIMARY KEY,
        room_id INTEGER REFERENCES game_rooms(id),
        user_id INTEGER REFERENCES users(id),
        final_score INTEGER DEFAULT 0,
        final_position INTEGER,
        questions_answered INTEGER DEFAULT 0,
        questions_correct INTEGER DEFAULT 0,
        xp_earned INTEGER DEFAULT 0,
        gems_earned INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create Trivia Questions table
    console.log('❓ Creating trivia_questions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS trivia_questions (
        id SERIAL PRIMARY KEY,
        category VARCHAR(50) NOT NULL,
        difficulty VARCHAR(20) DEFAULT 'medium',
        question TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        wrong_answers JSONB NOT NULL,
        explanation TEXT,
        snarky_comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create User Stats table
    console.log('📊 Creating user_stats table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_stats (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        category VARCHAR(50) NOT NULL,
        questions_answered INTEGER DEFAULT 0,
        questions_correct INTEGER DEFAULT 0,
        accuracy_percentage DECIMAL(5,2) DEFAULT 0.00,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, category)
      )
    `);

    // Create indexes for better performance
    console.log('⚡ Creating database indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_game_rooms_code ON game_rooms(room_code);
      CREATE INDEX IF NOT EXISTS idx_game_rooms_status ON game_rooms(status);
      CREATE INDEX IF NOT EXISTS idx_trivia_questions_category ON trivia_questions(category);
      CREATE INDEX IF NOT EXISTS idx_user_stats_user_category ON user_stats(user_id, category);
    `);

    console.log('✅ All tables created successfully!');

    // Insert sample trivia questions
    console.log('📝 Adding sample trivia questions...');
    await client.query(`
      INSERT INTO trivia_questions (category, question, correct_answer, wrong_answers, snarky_comment) VALUES
      ('Science', 'What is the chemical symbol for gold?', 'Au', '["Ag", "Go", "Gd"]', 'Really? It''s not ''Go'' for gold? Chemistry 101, people!'),
      ('Science', 'How many bones are in the adult human body?', '206', '["198", "215", "187"]', 'Apparently counting isn''t your strong suit!'),
      ('History', 'In what year did World War II end?', '1945', '["1944", "1946", "1943"]', 'Did you sleep through history class?'),
      ('History', 'Who was the first person to walk on the moon?', 'Neil Armstrong', '["Buzz Aldrin", "John Glenn", "Alan Shepard"]', 'One small step for man, one giant miss for you!'),
      ('Geography', 'What is the capital of Australia?', 'Canberra', '["Sydney", "Melbourne", "Perth"]', 'Sydney? Melbourne? Nope! Geography isn''t your thing, is it?'),
      ('Geography', 'Which river is the longest in the world?', 'Nile', '["Amazon", "Mississippi", "Yangtze"]', 'The Nile has been flowing longer than your attention span!'),
      ('Sports', 'How many players are on a basketball team on the court at once?', '5', '["6", "4", "7"]', 'Have you ever actually watched basketball?'),
      ('Sports', 'In what sport would you perform a slam dunk?', 'Basketball', '["Volleyball", "Tennis", "Football"]', 'Unless you''re dunking donuts, this should be obvious!'),
      ('Pop Culture', 'What does "www" stand for in a website address?', 'World Wide Web', '["World Wide Wire", "Web Wide World", "Wide World Web"]', 'The internet has been around longer than you think!'),
      ('Pop Culture', 'Which social media platform uses a bird as its logo?', 'Twitter', '["Facebook", "Instagram", "TikTok"]', 'Tweet tweet! This one should have been easy!'),
      ('Current Events', 'What does AI stand for?', 'Artificial Intelligence', '["Advanced Internet", "Automated Information", "Applied Innovation"]', 'Clearly you need some artificial intelligence yourself!'),
      ('Current Events', 'What does USB stand for?', 'Universal Serial Bus', '["United System Board", "Universal System Base", "Unified Serial Board"]', 'It''s not that complicated - just like this question!')
    `);

    console.log('✅ Sample questions added!');
    
    // Show table counts
    const counts = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM game_rooms) as rooms,
        (SELECT COUNT(*) FROM trivia_questions) as questions
    `);
    
    console.log('📊 Database Statistics:');
    console.log(`   👤 Users: ${counts.rows[0].users}`);
    console.log(`   🏠 Game Rooms: ${counts.rows[0].rooms}`);
    console.log(`   ❓ Questions: ${counts.rows[0].questions}`);

    await client.end();
    console.log('🎉 Database setup complete!');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

setupDatabase();
