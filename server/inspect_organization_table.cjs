const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'organization'
      ORDER BY ordinal_position
    `);

    console.log('\n=== Columns for table "organization" ===');
    console.table(res.rows);
    process.exit(0);
  } catch (err) {
    console.error('Error querying DB:', err.message);
    console.error(err);
    process.exit(1);
  }
}

main();
