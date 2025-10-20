#!/usr/bin/env node

/**
 * Test Runner for Supabase Edge Functions
 * 
 * This script validates the test structure and provides a summary
 * of test coverage for the Edge Functions since Deno is not available
 * in the current environment.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FUNCTIONS_DIR = __dirname;

// Function directories to check
const EXPECTED_FUNCTIONS = [
  'seed-user',
  'score-outfit', 
  'check-outfit-duplicate',
  'filter-by-anchor',
  'delete-item-logic'
];

function validateTestFile(functionName, testFilePath) {
  if (!fs.existsSync(testFilePath)) {
    return {
      exists: false,
      testCount: 0,
      issues: [`Test file not found: ${testFilePath}`]
    };
  }

  const content = fs.readFileSync(testFilePath, 'utf8');
  const issues = [];
  
  // Count test cases
  const testMatches = content.match(/Deno\.test\(/g);
  const testCount = testMatches ? testMatches.length : 0;
  
  // Check for required test patterns
  const requiredPatterns = [
    'assertEquals',
    'assertExists', 
    'MockSupabaseClient',
    'auth.getUser',
    'unauthorized',
    'error handling'
  ];
  
  requiredPatterns.forEach(pattern => {
    if (!content.toLowerCase().includes(pattern.toLowerCase())) {
      issues.push(`Missing test pattern: ${pattern}`);
    }
  });
  
  // Check for specific test scenarios based on function
  const functionSpecificTests = {
    'seed-user': [
      'successful seeding',
      'skip seeding for existing user',
      'database error'
    ],
    'score-outfit': [
      'successful scoring',
      'formality',
      'color harmony',
      'empty item_ids'
    ],
    'check-outfit-duplicate': [
      'exact duplicate',
      'similar outfit',
      'no duplicates',
      'similarity threshold'
    ],
    'filter-by-anchor': [
      'successful filtering',
      'formality matching',
      'category filtering',
      'compatibility score'
    ],
    'delete-item-logic': [
      'analyze action',
      'orphaned outfits',
      'force_delete',
      'no dependencies'
    ]
  };
  
  if (functionSpecificTests[functionName]) {
    functionSpecificTests[functionName].forEach(scenario => {
      if (!content.toLowerCase().includes(scenario.toLowerCase())) {
        issues.push(`Missing test scenario: ${scenario}`);
      }
    });
  }
  
  return {
    exists: true,
    testCount,
    issues
  };
}

function validateFunctionImplementation(functionName, indexFilePath) {
  if (!fs.existsSync(indexFilePath)) {
    return {
      exists: false,
      issues: [`Implementation file not found: ${indexFilePath}`]
    };
  }

  const content = fs.readFileSync(indexFilePath, 'utf8');
  const issues = [];
  
  // Check for required implementation patterns
  const requiredPatterns = [
    'serve(',
    'corsHeaders',
    'OPTIONS',
    'Authorization',
    'createClient',
    'auth.getUser',
    'JSON.stringify',
    'error handling'
  ];
  
  requiredPatterns.forEach(pattern => {
    if (!content.includes(pattern)) {
      issues.push(`Missing implementation pattern: ${pattern}`);
    }
  });
  
  return {
    exists: true,
    issues
  };
}

function runValidation() {
  console.log('🧪 Supabase Edge Functions Test Validation\n');
  
  let totalTests = 0;
  let totalIssues = 0;
  const results = [];
  
  EXPECTED_FUNCTIONS.forEach(functionName => {
    const functionDir = path.join(FUNCTIONS_DIR, functionName);
    const indexFile = path.join(functionDir, 'index.ts');
    const testFile = path.join(functionDir, `${functionName}.test.ts`);
    
    console.log(`📁 Validating ${functionName}...`);
    
    // Validate implementation
    const implResult = validateFunctionImplementation(functionName, indexFile);
    
    // Validate tests
    const testResult = validateTestFile(functionName, testFile);
    
    const functionResult = {
      name: functionName,
      implementation: implResult,
      tests: testResult,
      totalIssues: implResult.issues.length + testResult.issues.length
    };
    
    results.push(functionResult);
    totalTests += testResult.testCount;
    totalIssues += functionResult.totalIssues;
    
    // Print results for this function
    if (implResult.exists) {
      console.log(`  ✅ Implementation: ${indexFile}`);
    } else {
      console.log(`  ❌ Implementation: Missing`);
    }
    
    if (testResult.exists) {
      console.log(`  ✅ Tests: ${testResult.testCount} test cases`);
    } else {
      console.log(`  ❌ Tests: Missing`);
    }
    
    if (functionResult.totalIssues > 0) {
      console.log(`  ⚠️  Issues: ${functionResult.totalIssues}`);
      [...implResult.issues, ...testResult.issues].forEach(issue => {
        console.log(`     - ${issue}`);
      });
    }
    
    console.log('');
  });
  
  // Summary
  console.log('📊 Summary:');
  console.log(`  Functions: ${EXPECTED_FUNCTIONS.length}`);
  console.log(`  Total Tests: ${totalTests}`);
  console.log(`  Total Issues: ${totalIssues}`);
  
  if (totalIssues === 0) {
    console.log('  🎉 All validations passed!');
  } else {
    console.log(`  ⚠️  ${totalIssues} issues found`);
  }
  
  // Detailed breakdown
  console.log('\n📋 Detailed Results:');
  results.forEach(result => {
    const status = result.totalIssues === 0 ? '✅' : '⚠️';
    console.log(`  ${status} ${result.name}: ${result.tests.testCount} tests, ${result.totalIssues} issues`);
  });
  
  return totalIssues === 0;
}

// Run validation
const success = runValidation();
process.exit(success ? 0 : 1);