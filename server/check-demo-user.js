import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://postgres:root@localhost:5432/tender_management'
});

async function checkDemoUser() {
  try {
    // Check if demo1@gmail.com exists
    const result = await pool.query(
      `SELECT user_id, name, email, role, specialty, organization_id 
       FROM "user" 
       WHERE LOWER(email) = $1`,
      ['demo1@gmail.com']
    );

    console.log('\n=== Demo1@gmail.com User Details ===');
    if (result.rows.length > 0) {
      console.table(result.rows);
    } else {
      console.log('User not found');
    }

    // Check all ASSISTER users in the system
    const assisters = await pool.query(
      `SELECT user_id, name, email, role, specialty, organization_id 
       FROM "user" 
       WHERE role = 'ASSISTER'
       ORDER BY name ASC`
    );

    console.log('\n=== All ASSISTER Users ===');
    console.log(`Total: ${assisters.rows.length}`);
    console.table(assisters.rows);

    // Check organization of any BIDDER (to find organization_id for testing)
    const bidder = await pool.query(
      `SELECT user_id, name, email, role, organization_id 
       FROM "user" 
       WHERE role = 'BIDDER'
       LIMIT 1`
    );

    if (bidder.rows.length > 0) {
      const orgId = bidder.rows[0].organization_id;
      console.log(`\n=== Testing Search in Organization ${orgId} ===`);
      
      const searchResults = await pool.query(
        `SELECT user_id, name, email, role, specialty 
         FROM "user" 
         WHERE organization_id = $1
           AND role = 'ASSISTER'
           AND LOWER(email) LIKE LOWER($2)
         ORDER BY name ASC`,
        [orgId, '%demo1%']
      );

      console.log('Search Results for "demo1":');
      console.table(searchResults.rows);
    }

    pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    pool.end();
    process.exit(1);
  }
}

checkDemoUser();
