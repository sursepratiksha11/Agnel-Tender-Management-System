import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.bsxckyyqqpegwoorlqst:Omkarjagtap%408443@aws-1-ap-south-1.pooler.supabase.com:5432/postgres'
});

async function updateToAssister() {
  try {
    console.log('🔄 Updating database constraints to use ASSISTER role...');
    
    // Update user table role constraint
    await pool.query(`
      ALTER TABLE "user" DROP CONSTRAINT IF EXISTS user_role_check;
      ALTER TABLE "user" ADD CONSTRAINT user_role_check
        CHECK (role IN ('AUTHORITY', 'BIDDER', 'ASSISTER'));
    `);
    console.log('✅ User role constraint updated');
    
    // Update organization table type constraint
    await pool.query(`
      ALTER TABLE organization DROP CONSTRAINT IF EXISTS organization_type_check;
      ALTER TABLE organization ADD CONSTRAINT organization_type_check
        CHECK (type IN ('AUTHORITY', 'BIDDER', 'ASSISTER'));
    `);
    console.log('✅ Organization type constraint updated');
    
    // Update existing REVIEWER/COMMENTER to ASSISTER
    const userUpdate = await pool.query(`
      UPDATE "user" SET role = 'ASSISTER' WHERE role IN ('REVIEWER', 'COMMENTER');
    `);
    console.log(`✅ Updated ${userUpdate.rowCount} user(s) to ASSISTER role`);
    
    const orgUpdate = await pool.query(`
      UPDATE organization SET type = 'ASSISTER' WHERE type IN ('REVIEWER', 'COMMENTER');
    `);
    console.log(`✅ Updated ${orgUpdate.rowCount} organization(s) to ASSISTER type`);
    
    console.log('🎉 Database migration complete!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

updateToAssister();
