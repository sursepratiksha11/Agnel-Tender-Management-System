import { pool } from '../config/db.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function applyMigration() {
  console.log('🚀 Applying migration 008_tender_creation_flow_enhancements.sql...\n');

  try {
    const filePath = join(__dirname, 'migrations', '008_tender_creation_flow_enhancements.sql');
    const sql = readFileSync(filePath, 'utf-8');
    
    await pool.query(sql);
    console.log('✅ Migration 008 completed successfully!\n');
    
    // Verify the columns were added
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tender' 
      AND column_name IN ('authority_name', 'reference_id', 'tender_type', 'sector', 'estimated_value', 'submission_start_date')
      ORDER BY column_name;
    `);
    
    console.log('✅ Verified tender table columns:');
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

applyMigration();
