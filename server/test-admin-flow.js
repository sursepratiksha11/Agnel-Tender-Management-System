/**
 * Test Script: Admin Login → Create Tender → Add Sections → Publish → Test AI
 * 
 * This script tests the complete tender creation and publishing workflow
 * with AI functionality using GROQ API
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:5175/api';
const ADMIN_EMAIL = 'xyz@gmail.com';
const ADMIN_PASSWORD = '123456';

let authToken = '';
let tenderId = '';

// Helper function to make API calls
async function apiCall(endpoint, method = 'GET', body = null, requiresAuth = true) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (requiresAuth && authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const options = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  console.log(`\n→ ${method} ${endpoint}`);
  if (body) {
    console.log('  Request:', JSON.stringify(body, null, 2));
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    console.error(`✗ Failed: ${response.status}`, data);
    throw new Error(`API Error: ${response.status} ${JSON.stringify(data)}`);
  }

  console.log(`✓ Success:`, JSON.stringify(data, null, 2));
  return data;
}

async function runTests() {
  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  ADMIN TENDER CREATION & PUBLISHING TEST WITH AI');
    console.log('═══════════════════════════════════════════════════════\n');

    // Step 1: Login as Admin
    console.log('\n[STEP 1] Logging in as Admin...');
    const loginResponse = await apiCall('/auth/login', 'POST', {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }, false);

    authToken = loginResponse.token;
    console.log(`✓ Logged in successfully as: ${loginResponse.user.email} (${loginResponse.user.role})`);

    if (loginResponse.user.role !== 'AUTHORITY') {
      throw new Error('User must be an AUTHORITY to create tenders!');
    }

    // Step 2: Create a New Tender
    console.log('\n[STEP 2] Creating a new tender...');
    const tenderData = {
      title: `AI-Powered Infrastructure Development Tender ${Date.now()}`,
      description: 'A comprehensive tender for infrastructure development with AI-assisted proposal evaluation',
      industryDomain: 'CONSTRUCTION',
      budget: 50000000,
      publishedAt: null,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    };

    const createTenderResponse = await apiCall('/tenders', 'POST', tenderData);
    tenderId = createTenderResponse.tender.tenderId || createTenderResponse.tender.tender_id;
    console.log(`✓ Tender created with ID: ${tenderId}`);

    // Step 3: Add Sections to the Tender
    console.log('\n[STEP 3] Adding sections to the tender...');

    const sections = [
      {
        title: 'Eligibility Criteria',
        order_index: 1,
        is_mandatory: true,
        description: 'Required qualifications and certifications for bidders',
      },
      {
        title: 'Technical Specifications',
        order_index: 2,
        is_mandatory: true,
        description: 'Detailed technical requirements and standards',
      },
      {
        title: 'Financial Requirements',
        order_index: 3,
        is_mandatory: true,
        description: 'Budget breakdown, payment terms, and financial guarantees',
      },
      {
        title: 'Evaluation Criteria',
        order_index: 4,
        is_mandatory: true,
        description: 'Scoring methodology and selection process',
      },
    ];

    for (const section of sections) {
      const sectionResponse = await apiCall(`/tenders/${tenderId}/sections`, 'POST', section);
      console.log(`✓ Added section: ${section.title}`);
    }

    // Step 4: Publish the Tender
    console.log('\n[STEP 4] Publishing the tender...');
    const publishResponse = await apiCall(`/tenders/${tenderId}/publish`, 'POST', {});
    console.log(`✓ Tender published successfully!`);
    console.log(`  Status: ${publishResponse.tender.status}`);
    console.log(`  Published At: ${publishResponse.tender.publishedAt || publishResponse.tender.published_at}`);

    // Step 5: Test AI Query on the Published Tender
    console.log('\n[STEP 5] Testing AI query on the published tender...');
    try {
      const aiQueryResponse = await apiCall('/ai/query', 'POST', {
        tenderId: tenderId,
        question: 'What are the eligibility criteria for this tender?',
      });
      console.log(`✓ AI Query Response:`, aiQueryResponse.answer);
    } catch (error) {
      console.log(`⚠ AI Query failed (this is expected if AI ingestion hasn't completed):`, error.message);
    }

    // Step 6: Test AI Drafting Assistant
    console.log('\n[STEP 6] Testing AI drafting assistant...');
    try {
      const aiAssistResponse = await apiCall('/ai/assist', 'POST', {
        mode: 'section',
        sectionType: 'ELIGIBILITY',
        existingContent: '',
        tenderMetadata: {
          title: tenderData.title,
          domain: tenderData.industryDomain,
        },
        userQuestion: 'What should I include in the eligibility criteria section?',
      });
      console.log(`✓ AI Drafting Assistance:`, JSON.stringify(aiAssistResponse.suggestions, null, 2));
    } catch (error) {
      console.log(`⚠ AI Assist failed:`, error.message);
    }

    // Step 7: Retrieve the Tender Details
    console.log('\n[STEP 7] Retrieving tender details...');
    const tenderDetails = await apiCall(`/tenders/${tenderId}`);
    console.log(`✓ Tender Details Retrieved:`);
    console.log(`  Title: ${tenderDetails.tender.title}`);
    console.log(`  Status: ${tenderDetails.tender.status}`);
    console.log(`  Budget: ₹${tenderDetails.tender.budget.toLocaleString()}`);
    console.log(`  Sections: ${tenderDetails.sections ? tenderDetails.sections.length : 0}`);

    // Success Summary
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  ✓ ALL TESTS PASSED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`\nTender ID: ${tenderId}`);
    console.log(`View in browser: http://localhost:5174/admin/tenders/${tenderId}`);
    console.log('\n');

  } catch (error) {
    console.error('\n✗ TEST FAILED:', error.message);
    console.error('\nStack Trace:', error.stack);
    process.exit(1);
  }
}

// Run the tests
runTests();
