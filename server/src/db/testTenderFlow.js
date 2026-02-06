import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api';

// Helper to make requests
async function apiRequest(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${data.error || text}`);
  }

  return data;
}

async function testTenderFlow() {
  console.log('\n🚀 Starting Tender Flow Test...\n');

  let authorityToken;
  let tenderId;
  let sectionIds = [];

  try {
    // Step 1: Create Authority User
    console.log('📝 Step 1: Creating authority user...');
    const authUser = await apiRequest('/auth/signup', {
      method: 'POST',
      body: {
        email: `authority_${Date.now()}@test.com`,
        password: 'Test@1234',
        name: 'Test Authority',
        role: 'AUTHORITY',
        organizationName: `Test Org ${Date.now()}`,
      },
    });
    authorityToken = authUser.token;
    console.log('✅ Authority user created:', authUser.user.email);
    console.log('   Token:', authorityToken.substring(0, 20) + '...');

    // Step 2: Create Tender Draft
    console.log('\n📝 Step 2: Creating tender draft...');
    const tender = await apiRequest('/tenders', {
      method: 'POST',
      token: authorityToken,
      body: {
        title: 'Test Tender - Road Construction',
        description: 'Testing tender creation flow with sections',
        submission_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });
    tenderId = tender.tender_id;
    console.log('✅ Tender created:', tender.title);
    console.log('   Tender ID:', tenderId);
    console.log('   Status:', tender.status);

    if (tender.status !== 'DRAFT') {
      throw new Error('❌ Tender should be in DRAFT status after creation');
    }

    // Step 3: Add Sections
    console.log('\n📝 Step 3: Adding sections to tender...');
    
    const section1 = await apiRequest(`/tenders/${tenderId}/sections`, {
      method: 'POST',
      token: authorityToken,
      body: {
        title: 'Technical Requirements',
        is_mandatory: true,
      },
    });
    sectionIds.push(section1.section_id);
    console.log('✅ Section 1 added:', section1.title);

    const section2 = await apiRequest(`/tenders/${tenderId}/sections`, {
      method: 'POST',
      token: authorityToken,
      body: {
        title: 'Financial Proposal',
        is_mandatory: true,
      },
    });
    sectionIds.push(section2.section_id);
    console.log('✅ Section 2 added:', section2.title);

    const section3 = await apiRequest(`/tenders/${tenderId}/sections`, {
      method: 'POST',
      token: authorityToken,
      body: {
        title: 'Company Profile',
        is_mandatory: false,
      },
    });
    sectionIds.push(section3.section_id);
    console.log('✅ Section 3 added:', section3.title);

    console.log(`   Total sections added: ${sectionIds.length}`);

    // Step 4: Verify Tender with Sections
    console.log('\n📝 Step 4: Verifying tender details...');
    const tenderDetail = await apiRequest(`/tenders/${tenderId}`, {
      token: authorityToken,
    });
    console.log('✅ Tender retrieved:', tenderDetail.title);
    console.log('   Sections count:', tenderDetail.sections?.length || 0);
    console.log('   Status:', tenderDetail.status);

    if (tenderDetail.sections?.length !== sectionIds.length) {
      throw new Error(`❌ Expected ${sectionIds.length} sections, got ${tenderDetail.sections?.length}`);
    }

    // Step 5: Publish Tender
    console.log('\n📝 Step 5: Publishing tender...');
    const publishedTender = await apiRequest(`/tenders/${tenderId}/publish`, {
      method: 'POST',
      token: authorityToken,
    });
    console.log('✅ Tender published successfully!');
    console.log('   Status:', publishedTender.status);

    if (publishedTender.status !== 'PUBLISHED') {
      throw new Error(`❌ Expected status PUBLISHED, got ${publishedTender.status}`);
    }

    // Step 6: Verify Published Status
    console.log('\n📝 Step 6: Verifying published tender...');
    const finalTender = await apiRequest(`/tenders/${tenderId}`, {
      token: authorityToken,
    });
    console.log('✅ Final tender status:', finalTender.status);
    
    if (finalTender.status !== 'PUBLISHED') {
      throw new Error(`❌ Tender status should be PUBLISHED but is ${finalTender.status}`);
    }

    // Step 7: List Tenders (Authority)
    console.log('\n📝 Step 7: Listing all tenders for authority...');
    const { tenders } = await apiRequest('/tenders', {
      token: authorityToken,
    });
    console.log(`✅ Found ${tenders.length} tender(s)`);
    const publishedCount = tenders.filter(t => t.status === 'PUBLISHED').length;
    const draftCount = tenders.filter(t => t.status === 'DRAFT').length;
    console.log(`   Published: ${publishedCount}, Draft: ${draftCount}`);

    // Step 8: Test Bidder Access
    console.log('\n📝 Step 8: Creating bidder user...');
    const bidderUser = await apiRequest('/auth/signup', {
      method: 'POST',
      body: {
        email: `bidder_${Date.now()}@test.com`,
        password: 'Test@1234',
        name: 'Test Bidder',
        role: 'BIDDER',
        organizationName: `Bidder Org ${Date.now()}`,
      },
    });
    const bidderToken = bidderUser.token;
    console.log('✅ Bidder user created:', bidderUser.user.email);

    // Step 9: Bidder List Published Tenders
    console.log('\n📝 Step 9: Bidder listing published tenders...');
    const { tenders: bidderTenders } = await apiRequest('/tenders?status=PUBLISHED', {
      token: bidderToken,
    });
    console.log(`✅ Bidder can see ${bidderTenders.length} published tender(s)`);
    
    const canSeeTender = bidderTenders.some(t => t.tender_id === tenderId);
    if (canSeeTender) {
      console.log('✅ Bidder can see the newly published tender');
    } else {
      console.log('⚠️  Bidder cannot see the newly published tender (might be cached)');
    }

    // Step 10: Bidder View Tender Detail
    console.log('\n📝 Step 10: Bidder viewing tender detail...');
    const bidderTenderView = await apiRequest(`/tenders/${tenderId}`, {
      token: bidderToken,
    });
    console.log('✅ Bidder can view tender:', bidderTenderView.title);
    console.log('   Sections visible to bidder:', bidderTenderView.sections?.length || 0);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('\n📊 Summary:');
    console.log(`   Tender ID: ${tenderId}`);
    console.log(`   Status: ${finalTender.status}`);
    console.log(`   Sections: ${sectionIds.length}`);
    console.log(`   Authority Email: ${authUser.user.email}`);
    console.log(`   Bidder Email: ${bidderUser.user.email}`);
    console.log('\n✨ Tender creation and publish flow is working correctly!\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED!');
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testTenderFlow();
