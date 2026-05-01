const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production' ||
  (process.env.DATABASE_URL || '').includes('railway');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

async function initDb() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const client = await pool.connect();
  try {
    await client.query(schema);
    console.log('Database initialized');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDb };
