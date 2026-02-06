import { pool } from './src/config/db.js';

async function checkUploaded() {
  try {
    // Check what uploaded tenders exist
    const result = await pool.query(`
      SELECT uploaded_tender_id, title, status, organization_id, user_id 
      FROM uploaded_tender 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log('\n=== Uploaded Tenders in DB ===');
    console.log(JSON.stringify(result.rows, null, 2));
    console.log(`\nTotal count: ${result.rows.length}`);
    
    // Check if there are duplicate titles in tender table
    const tenderCheck = await pool.query(`
      SELECT tender_id, title, status, source
      FROM tender
      WHERE title ILIKE '%NATIONAL HIGHWAYS%'
      ORDER BY created_at DESC
    `);
    
    console.log('\n=== Tender Table (NATIONAL HIGHWAYS) ===');
    console.log(JSON.stringify(tenderCheck.rows, null, 2));
    
    // Test the listForDiscovery query
    const discoveryResult = await pool.query(`
      SELECT 
             ut.uploaded_tender_id,
             ut.title,
             ut.description,
             ut.authority_name,
             ut.sector,
             ut.estimated_value,
             ut.submission_deadline,
             ut.word_count,
             ut.opportunity_score,
             ut.created_at,
             o.name as organization_name,
             u.name as uploaded_by_name
      FROM uploaded_tender ut
      LEFT JOIN organization o ON ut.organization_id = o.organization_id
      LEFT JOIN "user" u ON ut.user_id = u.user_id
      WHERE ut.status = 'ANALYZED'
      ORDER BY ut.created_at DESC
      LIMIT 10
    `);
    
    console.log('\n=== Discovery Query Result ===');
    console.log(JSON.stringify(discoveryResult.rows, null, 2));
    console.log(`\nDiscovery count: ${discoveryResult.rows.length}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkUploaded();
