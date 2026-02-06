#!/usr/bin/env node

/**
 * Quick Fallback Test Runner
 * 
 * Usage:
 *   node quick-test-fallback.js
 * 
 * This script runs a quick smoke test of the fallback mechanism
 */

console.log('\n🚀 Quick Fallback Mechanism Test\n');
console.log('='.repeat(60));

// Check if we're in the right directory
const fs = require('fs');
const path = require('path');

if (!fs.existsSync(path.join(__dirname, 'src', 'services', 'ai.service.js'))) {
  console.error('❌ Error: Run this script from the server/ directory');
  console.log('\nUsage:');
  console.log('  cd server');
  console.log('  node quick-test-fallback.js\n');
  process.exit(1);
}

async function quickTest() {
  console.log('\n📋 Loading AI Service...');
  
  try {
    // Dynamic import for ES modules
    const { AIService } = await import('./src/services/ai.service.js');
    
    console.log('✅ AI Service loaded successfully\n');
    
    // Test Case 1: Brief ELIGIBILITY draft
    console.log('🧪 Test 1: Brief ELIGIBILITY Section');
    console.log('-'.repeat(60));
    
    const result1 = await AIService.analyzeProposalSection(
      'ELIGIBILITY',
      'We have some experience.',
      'Bidders must have 5+ years experience and annual turnover of 5 crores',
      'Analyze this'
    );
    
    console.log(`Mode: ${result1.mode}`);
    console.log(`Suggestions: ${result1.suggestions?.length || 0}`);
    
    if (result1.mode === 'fallback') {
      console.log('✅ Fallback activated correctly');
    } else if (result1.mode === 'ai') {
      console.log('ℹ️ AI mode active (API key present)');
    } else {
      console.log('⚠️ Unknown mode:', result1.mode);
    }
    
    if (result1.suggestions && result1.suggestions.length > 0) {
      console.log('\n📊 Sample Suggestion:');
      console.log('   Observation:', result1.suggestions[0].observation);
      console.log('   Improvement:', result1.suggestions[0].suggestedImprovement?.substring(0, 60) + '...');
      console.log('   Reason:', result1.suggestions[0].reason?.substring(0, 60) + '...');
    }
    
    // Test Case 2: Comprehensive draft
    console.log('\n\n🧪 Test 2: Comprehensive Content');
    console.log('-'.repeat(60));
    
    const result2 = await AIService.analyzeProposalSection(
      'ELIGIBILITY',
      'Our organization has 8 years of experience in infrastructure sector with average annual turnover of Rs. 12 crores over last 3 years supported by audited statements. We hold ISO 9001:2015, GST registration, and have completed 15+ similar government projects.',
      'Bidders must have 5+ years experience',
      'Check this'
    );
    
    console.log(`Mode: ${result2.mode}`);
    console.log(`Suggestions: ${result2.suggestions?.length || 0}`);
    
    // Validation
    console.log('\n\n✅ Validation Results:');
    console.log('-'.repeat(60));
    
    let passed = 0;
    let failed = 0;
    
    // Check 1: Has mode field
    if (result1.mode) {
      console.log('✓ Response has mode field');
      passed++;
    } else {
      console.log('✗ Missing mode field');
      failed++;
    }
    
    // Check 2: Has suggestions array
    if (Array.isArray(result1.suggestions)) {
      console.log('✓ Response has suggestions array');
      passed++;
    } else {
      console.log('✗ Missing or invalid suggestions array');
      failed++;
    }
    
    // Check 3: Suggestions have required fields
    const firstSugg = result1.suggestions?.[0];
    if (firstSugg?.observation && firstSugg?.reason) {
      console.log('✓ Suggestions have required fields');
      passed++;
    } else {
      console.log('✗ Suggestions missing required fields');
      failed++;
    }
    
    // Check 4: Brief content gets suggestions
    if (result1.suggestions && result1.suggestions.length > 0) {
      console.log('✓ Brief content triggers suggestions');
      passed++;
    } else {
      console.log('✗ No suggestions for brief content');
      failed++;
    }
    
    // Check 5: No exceptions thrown
    console.log('✓ No exceptions thrown during analysis');
    passed++;
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log(`\n📊 Test Summary: ${passed} passed, ${failed} failed`);
    
    if (failed === 0) {
      console.log('\n🎉 All checks passed! Fallback mechanism is working.\n');
      
      // Next steps
      console.log('📋 Next Steps:');
      console.log('  1. Run full test suite: node test-fallback.js');
      console.log('  2. Test in browser (see FALLBACK_TESTING_CHECKLIST.md)');
      console.log('  3. Review documentation: AI_FALLBACK_MECHANISM.md\n');
      
      process.exit(0);
    } else {
      console.log('\n⚠️ Some checks failed. Review output above.\n');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
    console.error('\nStack:', error.stack);
    console.log('\n💡 Troubleshooting:');
    console.log('  - Ensure all dependencies installed: npm install');
    console.log('  - Check database connection in .env');
    console.log('  - Verify ai.service.js has no syntax errors\n');
    process.exit(1);
  }
}

// Run test
quickTest();
