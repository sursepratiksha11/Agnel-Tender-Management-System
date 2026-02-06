import { pool } from '../config/db.js';

async function checkTables() {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📋 Existing tables in database:');
    result.rows.forEach(row => console.log(`  - ${row.table_name}`));
    
    // Check for user table specifically
    const userCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user'
      );
    `);
    
    console.log(`\n"user" table exists: ${userCheck.rows[0].exists}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

checkTables();
