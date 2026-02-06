const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    const res = await pool.query(`
      SELECT tc.constraint_name, tc.constraint_type, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'user'
    `);

    console.log('\n=== Constraints for table "user" ===');
    console.table(res.rows);
    process.exit(0);
  } catch (err) {
    console.error('Error querying DB:', err.message);
    console.error(err);
    process.exit(1);
  }
}

main();
