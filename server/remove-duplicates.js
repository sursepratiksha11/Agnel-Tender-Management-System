import { pool } from './src/config/db.js';

async function removeDuplicates() {
  try {
    console.log('\n=== Removing Duplicate Uploaded Tenders ===\n');
    
    // Delete duplicates, keeping only the most recent for each title
    const result = await pool.query(`
      DELETE FROM uploaded_tender
      WHERE uploaded_tender_id IN (
        SELECT uploaded_tender_id
        FROM (
          SELECT 
            uploaded_tender_id,
            ROW_NUMBER() OVER (
              PARTITION BY title, user_id 
              ORDER BY created_at DESC
            ) as rn
          FROM uploaded_tender
        ) t
        WHERE t.rn > 1
      )
      RETURNING uploaded_tender_id, title
    `);
    
    console.log(`Deleted ${result.rows.length} duplicate entries:`);
    result.rows.forEach(row => {
      console.log(`  - ${row.title} (ID: ${row.uploaded_tender_id})`);
    });
    
    // Show remaining unique tenders
    const remaining = await pool.query(`
      SELECT uploaded_tender_id, title, created_at
      FROM uploaded_tender
      ORDER BY created_at DESC
    `);
    
    console.log(`\n=== Remaining Uploaded Tenders (${remaining.rows.length}) ===`);
    remaining.rows.forEach(row => {
      console.log(`  - ${row.title}`);
      console.log(`    ID: ${row.uploaded_tender_id}`);
      console.log(`    Created: ${row.created_at}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

removeDuplicates();
