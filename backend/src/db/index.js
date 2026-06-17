const { Pool } = require('pg');

// Use a dedicated PostgreSQL connection pool instead of a silent fallback.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected PostgreSQL idle client error:', err.message);
  process.exit(1);
});

async function connectToDb() {
  if (!process.env.DATABASE_URL) {
    const message = '[DB] Missing DATABASE_URL environment variable. Please set DATABASE_URL in your .env file.';
    console.error(message);
    throw new Error(message);
  }

  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('[DB] PostgreSQL connection established successfully.');
  } catch (err) {
    console.error('[DB] Failed to connect to PostgreSQL:', err.message);
    console.error('[DB] Please verify that PostgreSQL is running and DATABASE_URL is correct.');
    throw err;
  }
}

async function query(text, params) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    console.error('[DB] Query error:', err.message, 'SQL:', text, 'PARAMS:', params);
    throw err;
  }
}

module.exports = {
  connectToDb,
  query,
  pool,
};

