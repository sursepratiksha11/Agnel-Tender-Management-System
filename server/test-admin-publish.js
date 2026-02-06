#!/usr/bin/env node

/**
 * Test Admin Flow: Login → Create Tender → Publish → Verify Status
 */

const BASE_URL = 'http://localhost:5175/api';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...( options.token ? { 'Authorization': `Bearer ${options.token}` } : {})
    },
    ...( options.body ? { body: JSON.stringify(options.body) } : {})
  };

  const response = await fetch(url, config);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  
  return data;
}

async function runTest() {
  log('\n=== Admin Tender Publish Test ===\n', 'cyan');

  try {
    // Step 1: Login
    log('1. Logging in as admin...', 'blue');
    const loginData = await makeRequest('/auth/login', {
      method: 'POST',
      body: {
        email: 'vivekjangam73@gmail.com',
        password: 'Vivek@126'
      }
    });
    const token = loginData.token;
    log('   ✓ Logged in successfully', 'green');

    // Step 2: Create Tender
    log('\n2. Creating new tender...', 'blue');
    const tender = await makeRequest('/tenders', {
      method: 'POST',
      token,
      body: {
        title: `Test Tender - ${Date.now()}`,
        description: 'This is a test tender for status verification',
        submission_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }
    });
    const tenderId = tender.tender_id;
    log(`   ✓ Tender created with ID: ${tenderId}`, 'green');
    log(`   Status: ${tender.status}`, 'yellow');

    // Step 3: Add a section (required for publishing)
    log('\n3. Adding a section to tender...', 'blue');
    const section = await makeRequest(`/tenders/${tenderId}/sections`, {
      method: 'POST',
      token,
      body: {
        title: 'Project Overview',
        is_mandatory: true,
        content: 'This is a detailed project overview section with sufficient content to meet the requirements.',
        section_key: 'overview'
      }
    });
    log(`   ✓ Section added: ${section.title}`, 'green');

    // Step 4: Publish Tender
    log('\n4. Publishing tender...', 'blue');
    const published = await makeRequest(`/tenders/${tenderId}/publish`, {
      method: 'POST',
      token
    });
    log(`   ✓ Tender published!`, 'green');
    log(`   New Status: ${published.status}`, 'yellow');

    // Step 5: Verify Status
    log('\n5. Verifying tender status...', 'blue');
    const verified = await makeRequest(`/tenders/${tenderId}`, { token });
    log(`   Current Status: ${verified.status}`, verified.status === 'PUBLISHED' ? 'green' : 'red');

    if (verified.status !== 'PUBLISHED') {
      throw new Error(`Expected status PUBLISHED but got ${verified.status}`);
    }

    // Step 6: List All Tenders and Check
    log('\n6. Listing all tenders...', 'blue');
    const { tenders } = await makeRequest('/tenders', { token });
    const ourTender = tenders.find(t => t.tender_id === tenderId);
    
    if (!ourTender) {
      throw new Error('Tender not found in list');
    }
    
    log(`   Found tender in list with status: ${ourTender.status}`, ourTender.status === 'PUBLISHED' ? 'green' : 'red');

    // Summary
    log('\n=== Test Results ===', 'cyan');
    log(`✓ Tender ID: ${tenderId}`, 'green');
    log(`✓ Status in list: ${ourTender.status}`, 'green');
    log(`✓ All checks passed!`, 'green');

  } catch (error) {
    log(`\n✗ Test failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

runTest();
