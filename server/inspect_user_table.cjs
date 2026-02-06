const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    console.log('[DB] Connected? attempting to query information_schema for "user" table columns...');
    const res = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'user'
      ORDER BY ordinal_position
    `);

    console.log('\n=== Columns for table "user" ===');
    console.table(res.rows);

    // Try a sample select to show available columns
    const sample = await pool.query(`SELECT * FROM "user" LIMIT 5`);
    console.log('\n=== Sample rows (first 5) - columns shown dynamically ===');
    console.table(sample.rows);

    process.exit(0);
  } catch (err) {
    console.error('Error querying DB:', err.message);
    console.error(err);
    process.exit(1);
  }
}

main();
