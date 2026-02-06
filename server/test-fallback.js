/**
 * Test script for AI Fallback Mechanism
 * 
 * This script tests the fallback mechanism for proposal section analysis
 * Run this to verify rule-based guidance works when AI is unavailable
 */

import { AIService } from './src/services/ai.service.js';

console.log('🧪 Testing AI Fallback Mechanism\n');
console.log('=' .repeat(60));

// Test cases for different section types
const testCases = [
  {
    sectionType: 'ELIGIBILITY',
    draftContent: 'We have some experience in this field.',
    tenderRequirement: 'Bidders must have 5+ years of experience and annual turnover of 5 crores',
    description: 'Brief draft with missing details'
  },
  {
    sectionType: 'TECHNICAL',
    draftContent: 'We will use good quality materials and follow best practices for implementation.',
    tenderRequirement: 'Must comply with ISO 9001 standards and provide third-party testing certificates',
    description: 'Generic technical response without specifics'
  },
  {
    sectionType: 'FINANCIAL',
    draftContent: 'Total cost: Rs. 10 lakhs',
    tenderRequirement: 'Provide itemized cost breakdown with payment milestones and EMD details',
    description: 'Brief financial proposal without breakdown'
  },
  {
    sectionType: 'EVALUATION',
    draftContent: 'We are a good company.',
    tenderRequirement: 'Technical (60%) + Financial (40%) evaluation criteria',
    description: 'Very brief evaluation response'
  },
  {
    sectionType: 'TERMS',
    draftContent: 'Okay',
    tenderRequirement: 'Accept all terms including penalty clauses, warranties, and dispute resolution',
    description: 'Too brief terms acceptance'
  },
  {
    sectionType: 'ELIGIBILITY',
    draftContent: 'Our organization has been operating for 8 years in the infrastructure sector. We have an average annual turnover of Rs. 12 crores over the last 3 financial years, supported by audited financial statements. We hold valid ISO 9001:2015 certification, GST registration, and PAN. We have successfully completed 15+ similar projects for government clients including road construction, building works, and civil engineering projects. Key projects include ABC Highway (Rs. 50 crores, completed 2022), XYZ Government Building (Rs. 30 crores, completed 2023). All certifications and project completion certificates are attached.',
    tenderRequirement: 'Bidders must have 5+ years of experience and annual turnover of 5 crores',
    description: 'Comprehensive eligibility response'
  }
];

console.log('Note: Set OPENAI_API_KEY="" in .env to force fallback mode\n');

async function runTests() {
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    
    console.log(`\n📝 Test Case ${i + 1}: ${testCase.sectionType}`);
    console.log(`Description: ${testCase.description}`);
    console.log('-'.repeat(60));
    
    try {
      const result = await AIService.analyzeProposalSection(
        testCase.sectionType,
        testCase.draftContent,
        testCase.tenderRequirement,
        'Analyze this draft'
      );

      console.log(`\n✅ Result (${result.mode?.toUpperCase() || 'UNKNOWN'} mode):`);
      console.log(JSON.stringify(result, null, 2));

      if (result.mode === 'fallback') {
        console.log('\n✓ Fallback mechanism activated successfully');
      } else if (result.mode === 'ai') {
        console.log('\n✓ AI analysis completed successfully');
      } else {
        console.log('\n⚠️ Unknown mode - check response format');
      }

      // Validate response structure
      if (!result.suggestions || !Array.isArray(result.suggestions)) {
        console.error('\n❌ ERROR: Missing or invalid suggestions array');
      } else if (result.suggestions.length === 0) {
        console.log('\n⚠️ WARNING: No suggestions returned');
      } else {
        console.log(`\n📊 ${result.suggestions.length} suggestion(s) provided`);
        result.suggestions.forEach((s, idx) => {
          if (!s.observation || !s.reason) {
            console.error(`  ❌ Suggestion ${idx + 1}: Missing required fields`);
          } else {
            console.log(`  ✓ Suggestion ${idx + 1}: Valid`);
          }
        });
      }
    } catch (error) {
      console.error(`\n❌ ERROR: ${error.message}`);
      console.error('Stack:', error.stack);
    }
    
    console.log('\n' + '='.repeat(60));
  }

  console.log('\n\n🎯 Test Summary:');
  console.log('All tests completed. Check output above for results.');
  console.log('\n📋 Expected Behavior:');
  console.log('  1. Each test should return HTTP 200 (no exceptions thrown)');
  console.log('  2. Response format: { mode: "ai"|"fallback", suggestions: [...] }');
  console.log('  3. Each suggestion has: observation, suggestedImprovement, reason');
  console.log('  4. Brief drafts should get more suggestions than comprehensive ones');
  console.log('\n💡 To test fallback mode specifically:');
  console.log('  1. Remove or comment out OPENAI_API_KEY in server/.env');
  console.log('  2. Run: node server/test-fallback.js');
  console.log('  3. All results should show mode: "fallback"');
}

// Run tests
runTests().catch(err => {
  console.error('\n💥 Fatal error:', err);
  process.exit(1);
});
