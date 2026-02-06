import { pool } from './src/config/db.js';

async function main() {
  try {
    // Check all users
    console.log('\n=== All Users (Last 20) ===');
    const users = await pool.query(`
      SELECT user_id, name, email, role, organization_id
      FROM "user"
      ORDER BY created_at DESC
      LIMIT 20
    `);
    console.table(users.rows);

    console.log('\n=== Count by Role ===');
    const roleCount = await pool.query(`
      SELECT role, COUNT(*) as count
      FROM "user"
      GROUP BY role
    `);
    console.table(roleCount.rows);

    // Check demo1 specifically
    console.log('\n=== Search for demo1@gmail.com ===');
    const demo = await pool.query(`
      SELECT user_id, name, email, role, organization_id
      FROM "user"
      WHERE LOWER(email) LIKE LOWER('%demo1%')
    `);
    console.table(demo.rows);

    // Check organization IDs for search simulation
    if (demo.rows.length > 0) {
      const orgId = demo.rows[0].organization_id;
      console.log(`\n=== Searching in Organization ${orgId} ===`);
      const search = await pool.query(`
        SELECT user_id, name, email, role
        FROM "user"
        WHERE organization_id = $1
          AND role = 'ASSISTER'
          AND LOWER(email) LIKE LOWER('%demo1%')
      `, [orgId]);
      console.log('ASSISTER results:');
      console.table(search.rows);
    }

    process.exit(0);
  } catch (err) {
    console.error('Database error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

main();
