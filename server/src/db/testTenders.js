import { pool } from '../config/db.js';

const API_BASE = 'http://localhost:5000/api';

let authorityToken = '';
let bidderToken = '';
let tenderId = '';
let sectionId1 = '';
let sectionId2 = '';

async function testTenderAPIs() {
  console.log('\n=== Testing Tender Management System ===\n');

  try {
    // Setup: Create test users
    console.log('Setup: Creating test users...');
    
    // Create AUTHORITY user
    const signupAuthority = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Authority Tester',
        email: 'authority@test.com',
        password: 'test123',
        role: 'AUTHORITY',
        organizationName: 'Test Government Body',
      }),
    });
    
    if (signupAuthority.ok) {
      const data = await signupAuthority.json();
      authorityToken = data.token;
      console.log('   ✅ Authority user created');
    }

    // Create BIDDER user
    const signupBidder = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bidder Tester',
        email: 'bidder@test.com',
        password: 'test123',
        role: 'BIDDER',
        organizationName: 'Test Bidding Company',
      }),
    });
    
    if (signupBidder.ok) {
      const data = await signupBidder.json();
      bidderToken = data.token;
      console.log('   ✅ Bidder user created\n');
    }

    // Test 1: Create Tender (AUTHORITY only)
    console.log('1. Testing CREATE tender (AUTHORITY)...');
    const createRes = await fetch(`${API_BASE}/tenders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authorityToken}`,
      },
      body: JSON.stringify({
        title: 'Road Construction Project',
        description: 'Construction of 5km highway with modern facilities',
        submission_deadline: '2026-03-01T23:59:59Z',
      }),
    });

    if (createRes.ok) {
      const tender = await createRes.json();
      tenderId = tender.tender_id;
      console.log('   ✅ Tender created successfully');
      console.log(`   → ID: ${tenderId} | Status: ${tender.status}`);
    } else {
      const error = await createRes.json();
      console.log('   ❌ Create failed:', error);
    }

    // Test 2: Create Tender as BIDDER (should fail)
    console.log('\n2. Testing CREATE tender as BIDDER (should fail)...');
    const createBidderRes = await fetch(`${API_BASE}/tenders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bidderToken}`,
      },
      body: JSON.stringify({
        title: 'Unauthorized Tender',
        description: 'This should fail',
        submission_deadline: '2026-03-01T23:59:59Z',
      }),
    });

    if (createBidderRes.status === 403) {
      console.log('   ✅ Bidder correctly forbidden from creating tender');
    } else {
      console.log('   ❌ Security issue: Bidder was able to create tender');
    }

    // Test 3: Update Tender (DRAFT only)
    console.log('\n3. Testing UPDATE tender (DRAFT)...');
    const updateRes = await fetch(`${API_BASE}/tenders/${tenderId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authorityToken}`,
      },
      body: JSON.stringify({
        title: 'Updated: Road Construction Project',
        description: 'Updated description with more details',
      }),
    });

    if (updateRes.ok) {
      const tender = await updateRes.json();
      console.log('   ✅ Tender updated successfully');
      console.log(`   → Title: ${tender.title}`);
    } else {
      const error = await updateRes.json();
      console.log('   ❌ Update failed:', error);
    }

    // Test 4: Get Tender as AUTHORITY
    console.log('\n4. Testing GET tender as AUTHORITY...');
    const getAuthRes = await fetch(`${API_BASE}/tenders/${tenderId}`, {
      headers: { Authorization: `Bearer ${authorityToken}` },
    });

    if (getAuthRes.ok) {
      const tender = await getAuthRes.json();
      console.log('   ✅ Tender retrieved successfully');
      console.log(`   → Status: ${tender.status} | Sections: ${tender.sections.length}`);
    } else {
      console.log('   ❌ Get failed');
    }

    // Test 5: Get DRAFT Tender as BIDDER (should fail)
    console.log('\n5. Testing GET DRAFT tender as BIDDER (should fail)...');
    const getBidderRes = await fetch(`${API_BASE}/tenders/${tenderId}`, {
      headers: { Authorization: `Bearer ${bidderToken}` },
    });

    if (getBidderRes.status === 404) {
      console.log('   ✅ Bidder correctly cannot see DRAFT tender');
    } else {
      console.log('   ❌ Security issue: Bidder can see DRAFT tender');
    }

    // Test 6: Add Section 1
    console.log('\n6. Testing ADD section...');
    const addSection1Res = await fetch(`${API_BASE}/tenders/${tenderId}/sections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authorityToken}`,
      },
      body: JSON.stringify({
        title: 'Technical Specifications',
        is_mandatory: true,
      }),
    });

    if (addSection1Res.ok) {
      const section = await addSection1Res.json();
      sectionId1 = section.section_id;
      console.log('   ✅ Section 1 added');
      console.log(`   → Title: ${section.title} | Order: ${section.order_index}`);
    } else {
      const error = await addSection1Res.json();
      console.log('   ❌ Add section failed:', error);
    }

    // Test 7: Add Section 2
    console.log('\n7. Testing ADD second section...');
    const addSection2Res = await fetch(`${API_BASE}/tenders/${tenderId}/sections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authorityToken}`,
      },
      body: JSON.stringify({
        title: 'Financial Proposal',
        is_mandatory: true,
      }),
    });

    if (addSection2Res.ok) {
      const section = await addSection2Res.json();
      sectionId2 = section.section_id;
      console.log('   ✅ Section 2 added');
      console.log(`   → Title: ${section.title} | Order: ${section.order_index}`);
    }

    // Test 8: Update Section
    console.log('\n8. Testing UPDATE section...');
    const updateSectionRes = await fetch(`${API_BASE}/tenders/sections/${sectionId1}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authorityToken}`,
      },
      body: JSON.stringify({
        title: 'Updated: Technical Specifications',
        is_mandatory: false,
      }),
    });

    if (updateSectionRes.ok) {
      const section = await updateSectionRes.json();
      console.log('   ✅ Section updated');
      console.log(`   → Title: ${section.title} | Mandatory: ${section.is_mandatory}`);
    } else {
      console.log('   ❌ Update section failed');
    }

    // Test 9: Reorder Sections
    console.log('\n9. Testing REORDER sections...');
    const reorderRes = await fetch(`${API_BASE}/tenders/${tenderId}/sections/order`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authorityToken}`,
      },
      body: JSON.stringify({
        orderedSectionIds: [sectionId2, sectionId1], // Swap order
      }),
    });

    if (reorderRes.ok) {
      const sections = await reorderRes.json();
      console.log('   ✅ Sections reordered');
      sections.forEach((s) => {
        console.log(`   → Order ${s.order_index}: ${s.title}`);
      });
    } else {
      console.log('   ❌ Reorder failed');
    }

    // Test 10: Try to Publish without sections (should fail - but we have sections now, so skip this)
    
    // Test 11: Publish Tender
    console.log('\n10. Testing PUBLISH tender...');
    const publishRes = await fetch(`${API_BASE}/tenders/${tenderId}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authorityToken}`,
      },
    });

    if (publishRes.ok) {
      const tender = await publishRes.json();
      console.log('   ✅ Tender published successfully');
      console.log(`   → Status: ${tender.status}`);
    } else {
      const error = await publishRes.json();
      console.log('   ❌ Publish failed:', error);
    }

    // Test 12: Try to Update Published Tender (should fail)
    console.log('\n11. Testing UPDATE published tender (should fail)...');
    const updatePublishedRes = await fetch(`${API_BASE}/tenders/${tenderId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authorityToken}`,
      },
      body: JSON.stringify({
        title: 'This should not work',
      }),
    });

    if (updatePublishedRes.status === 403) {
      console.log('   ✅ Published tender correctly immutable');
    } else {
      console.log('   ❌ Security issue: Published tender was updated');
    }

    // Test 13: Try to Add Section to Published Tender (should fail)
    console.log('\n12. Testing ADD section to published tender (should fail)...');
    const addSectionPublishedRes = await fetch(`${API_BASE}/tenders/${tenderId}/sections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authorityToken}`,
      },
      body: JSON.stringify({
        title: 'New Section',
        is_mandatory: false,
      }),
    });

    if (addSectionPublishedRes.status === 403) {
      console.log('   ✅ Cannot add sections to published tender');
    } else {
      console.log('   ❌ Security issue: Section added to published tender');
    }

    // Test 14: Get Published Tender as BIDDER (should work)
    console.log('\n13. Testing GET published tender as BIDDER (should work)...');
    const getBidderPublishedRes = await fetch(`${API_BASE}/tenders/${tenderId}`, {
      headers: { Authorization: `Bearer ${bidderToken}` },
    });

    if (getBidderPublishedRes.ok) {
      const tender = await getBidderPublishedRes.json();
      console.log('   ✅ Bidder can see published tender');
      console.log(`   → Title: ${tender.title}`);
      console.log(`   → Sections: ${tender.sections.length}`);
    } else {
      console.log('   ❌ Bidder cannot see published tender (should be able to)');
    }

    // Test 15: Delete Section from Published Tender (should fail)
    console.log('\n14. Testing DELETE section from published tender (should fail)...');
    const deleteSectionRes = await fetch(`${API_BASE}/tenders/sections/${sectionId1}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authorityToken}` },
    });

    if (deleteSectionRes.status === 403) {
      console.log('   ✅ Cannot delete sections from published tender');
    } else {
      console.log('   ❌ Security issue: Section deleted from published tender');
    }

    console.log('\n=== All Tender Tests Completed ===\n');
  } catch (err) {
    console.error('Test error:', err.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

// Check if server is running
console.log('Checking if server is running on http://localhost:5000...');
fetch('http://localhost:5000/health')
  .then((res) => {
    if (res.ok) {
      console.log('✅ Server is running\n');
      testTenderAPIs();
    } else {
      console.log('❌ Server responded with error');
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error('❌ Cannot connect to server. Make sure it is running on port 5000');
    console.error('Run: npm run dev');
    process.exit(1);
  });
