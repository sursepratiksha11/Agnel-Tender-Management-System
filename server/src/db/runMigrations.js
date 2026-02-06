import { pool } from '../config/db.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const migrations = [
  '000_enable_extensions.sql',
  '001_create_organization.sql',
  '002_create_user.sql',
  '003_create_tender.sql',
  '004_create_tender_section.sql',
  '005_create_tender_content_chunk.sql',
  '006_create_proposal.sql',
  '007_create_proposal_section_response.sql',
  '008_tender_creation_flow_enhancements.sql',
  '009_create_bid_evaluation.sql',
  '010_add_proposal_submission_fields.sql',
  '011_add_user_user_id.sql',
  '012_fix_proposals_proposal_id_and_fk.sql',
  '013_add_unique_constraint_to_proposals.sql',
  '014_add_missing_user_columns.sql',
];

async function runMigrations() {
  console.log('🚀 Starting database migrations...\n');

  for (const migration of migrations) {
    try {
      console.log(`Running ${migration}...`);
      const filePath = join(__dirname, 'migrations', migration);
      const sql = readFileSync(filePath, 'utf-8');
      
      await pool.query(sql);
      console.log(`✅ ${migration} completed\n`);
    } catch (error) {
      console.error(`❌ Error running ${migration}:`, error.message);
      process.exit(1);
    }
  }

  console.log('✅ All migrations completed successfully!');
  process.exit(0);
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
