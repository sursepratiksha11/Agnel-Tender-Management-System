import { pool } from './src/config/db.js';
import fs from 'fs';

async function applyMigration() {
  try {
    const sql = fs.readFileSync('./src/db/migrations/016_prevent_duplicate_uploads.sql', 'utf8');
    await pool.query(sql);
    console.log('✓ Migration applied: Unique constraint added to prevent duplicate uploads');
    console.log('  - Index: idx_uploaded_tender_user_title (user_id + title)');
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    process.exit(0);
  }
}

applyMigration();
