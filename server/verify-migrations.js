import { pool } from './src/config/db.js';

async function verifyMigrations() {
  try {
    console.log('🔍 Checking database tables...\n');

    // Check saved_tender table
    const savedTenderResult = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'saved_tender'
      );
    `);
    
    console.log('✅ saved_tender table exists:', savedTenderResult.rows[0].exists);

    // Check table structure
    const structure = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'saved_tender'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 saved_tender table structure:');
    structure.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    // Check indexes
    const indexes = await pool.query(`
      SELECT indexname FROM pg_indexes WHERE tablename = 'saved_tender';
    `);

    console.log('\n🔑 Indexes on saved_tender:');
    indexes.rows.forEach(row => {
      console.log(`  - ${row.indexname}`);
    });

    console.log('\n✅ Database verification complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyMigrations();
