import { pool } from './src/config/db.js';

async function checkTenders() {
  try {
    const res = await pool.query(`
      SELECT tender_id, title, status, created_at 
      FROM tender 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log('\n=== Recent Tenders ===\n');
    res.rows.forEach(t => {
      console.log(`ID: ${t.tender_id}`);
      console.log(`Title: ${t.title}`);
      console.log(`Status: ${t.status}`);
      console.log(`Created: ${t.created_at}`);
      console.log('---');
    });
    
    console.log('\n=== Status Summary ===');
    const statusRes = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM tender 
      GROUP BY status
    `);
    statusRes.rows.forEach(s => {
      console.log(`${s.status}: ${s.count}`);
    });
    
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkTenders();
