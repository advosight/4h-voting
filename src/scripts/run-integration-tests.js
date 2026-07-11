#!/usr/bin/env node

/**
 * Integration Test Runner for Scoring Workflow
 * 
 * This script runs all integration tests for the scoring workflow feature,
 * including frontend, backend, and end-to-end tests.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logHeader(message) {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(`${message}`, colors.cyan + colors.bright);
  log(`${'='.repeat(60)}`, colors.cyan);
}

function logSection(message) {
  log(`\n${'-'.repeat(40)}`, colors.blue);
  log(`${message}`, colors.blue + colors.bright);
  log(`${'-'.repeat(40)}`, colors.blue);
}

function runCommand(command, description, options = {}) {
  logSection(description);
  log(`Running: ${command}`, colors.yellow);
  
  try {
    const result = execSync(command, {
      stdio: 'inherit',
      cwd: options.cwd || process.cwd(),
      ...options,
    });
    log(`✅ ${description} completed successfully`, colors.green);
    return true;
  } catch (error) {
    log(`❌ ${description} failed`, colors.red);
    log(`Error: ${error.message}`, colors.red);
    return false;
  }
}

function checkFileExists(filePath, description) {
  if (fs.existsSync(filePath)) {
    log(`✅ ${description} exists`, colors.green);
    return true;
  } else {
    log(`❌ ${description} not found: ${filePath}`, colors.red);
    return false;
  }
}

async function main() {
  logHeader('Scoring Workflow Integration Test Suite');
  
  const startTime = Date.now();
  let totalTests = 0;
  let passedTests = 0;
  
  // Check if we're in the correct directory
  const websiteDir = path.resolve(__dirname, '..');
  const infrastructureDir = path.resolve(__dirname, '../../../infrastructure');
  
  log(`Website directory: ${websiteDir}`, colors.blue);
  log(`Infrastructure directory: ${infrastructureDir}`, colors.blue);
  
  // Verify test files exist
  logSection('Verifying Test Files');
  
  const testFiles = [
    {
      path: path.join(__dirname, 'scoring-workflow.integration.test.tsx'),
      description: 'Frontend Integration Tests',
    },
    {
      path: path.join(__dirname, 'end-to-end-scoring.integration.test.tsx'),
      description: 'End-to-End Integration Tests',
    },
    {
      path: path.join(__dirname, 'class-scoring-workflow.integration.test.tsx'),
      description: 'Type Class Scoring Frontend Integration Tests',
    },
    {
      path: path.join(__dirname, 'end-to-end-class-scoring.integration.test.tsx'),
      description: 'Type Class Scoring End-to-End Integration Tests',
    },
    {
      path: path.join(__dirname, 'end-to-end-fit-show-scoring.integration.test.tsx'),
      description: 'Fit and Show Scoring End-to-End Integration Tests',
    },
    {
      path: path.join(__dirname, 'realtime-fit-show-scoring.integration.test.tsx'),
      description: 'Fit and Show Scoring Real-time Integration Tests',
    },
    {
      path: path.join(__dirname, 'concurrent-fit-show-scoring.integration.test.tsx'),
      description: 'Fit and Show Scoring Concurrent Integration Tests',
    },
    {
      path: path.join(__dirname, 'fit-show-scoring-performance.integration.test.tsx'),
      description: 'Fit and Show Scoring Performance Integration Tests',
    },
    {
      path: path.join(__dirname, 'fit-show-scoring-system-integration.test.tsx'),
      description: 'Fit and Show Scoring System Integration Tests',
    },
    {
      path: path.join(infrastructureDir, 'lambda/__tests__/scoring-workflow.integration.test.ts'),
      description: 'Backend Integration Tests',
    },
    {
      path: path.join(infrastructureDir, 'lambda/__tests__/class-scoring-workflow.integration.test.ts'),
      description: 'Type Class Scoring Backend Integration Tests',
    },
    {
      path: path.join(infrastructureDir, 'lambda/__tests__/fit-show-scoring-workflow.integration.test.ts'),
      description: 'Fit and Show Scoring Backend Integration Tests',
    },
  ];
  
  for (const testFile of testFiles) {
    if (!checkFileExists(testFile.path, testFile.description)) {
      log('❌ Missing required test files. Exiting.', colors.red);
      process.exit(1);
    }
  }
  
  // Run frontend integration tests
  logSection('Frontend Integration Tests');
  totalTests++;
  if (runCommand(
    'npm test -- --testPathPattern=scoring-workflow.integration.test.tsx --watchAll=false --coverage=false',
    'Frontend Scoring Workflow Tests',
    { cwd: websiteDir }
  )) {
    passedTests++;
  }
  
  // Run end-to-end integration tests
  logSection('End-to-End Integration Tests');
  totalTests++;
  if (runCommand(
    'npm test -- --testPathPattern=end-to-end-scoring.integration.test.tsx --watchAll=false --coverage=false',
    'End-to-End Scoring Tests',
    { cwd: websiteDir }
  )) {
    passedTests++;
  }
  
  // Run type class scoring frontend integration tests
  logSection('Type Class Scoring Frontend Integration Tests');
  totalTests++;
  if (runCommand(
    'npm test -- --testPathPattern=class-scoring-workflow.integration.test.tsx --watchAll=false --coverage=false',
    'Type Class Scoring Frontend Tests',
    { cwd: websiteDir }
  )) {
    passedTests++;
  }
  
  // Run type class scoring end-to-end integration tests
  logSection('Type Class Scoring End-to-End Integration Tests');
  totalTests++;
  if (runCommand(
    'npm test -- --testPathPattern=end-to-end-class-scoring.integration.test.tsx --watchAll=false --coverage=false',
    'Type Class Scoring End-to-End Tests',
    { cwd: websiteDir }
  )) {
    passedTests++;
  }
  
  // Run backend integration tests
  logSection('Backend Integration Tests');
  totalTests++;
  if (runCommand(
    'npm test -- --testPathPattern=scoring-workflow.integration.test.ts --watchAll=false',
    'Backend Scoring Workflow Tests',
    { cwd: infrastructureDir }
  )) {
    passedTests++;
  }
  
  // Run type class scoring backend integration tests
  logSection('Type Class Scoring Backend Integration Tests');
  totalTests++;
  if (runCommand(
    'npm test -- --testPathPattern=class-scoring-workflow.integration.test.ts --watchAll=false',
    'Type Class Scoring Backend Tests',
    { cwd: infrastructureDir }
  )) {
    passedTests++;
  }
  
  // Run fit and show scoring end-to-end integration tests
  logSection('Fit and Show Scoring End-to-End Integration Tests');
  totalTests++;
  if (runCommand(
    'npm test -- --testPathPattern=end-to-end-fit-show-scoring.integration.test.tsx --watchAll=false --coverage=false',
    'Fit and Show Scoring End-to-End Tests',
    { cwd: websiteDir }
  )) {
    passedTests++;
  }
  
  // Run fit and show scoring real-time integration tests
  logSection('Fit and Show Scoring Real-time Integration Tests');
  totalTests++;
  if (runCommand(
    'npm test -- --testPathPattern=realtime-fit-show-scoring.integration.test.tsx --watchAll=false --coverage=false',
    'Fit and Show Scoring Real-time Tests',
    { cwd: websiteDir }
  )) {
    passedTests++;
  }
  
  // Run fit and show scoring concurrent integration tests
  logSection('Fit and Show Scoring Concurrent Integration Tests');
  totalTests++;
  if (runCommand(
    'npm test -- --testPathPattern=concurrent-fit-show-scoring.integration.test.tsx --watchAll=false --coverage=false',
    'Fit and Show Scoring Concurrent Tests',
    { cwd: websiteDir }
  )) {
    passedTests++;
  }
  
  // Run fit and show scoring performance integration tests
  logSection('Fit and Show Scoring Performance Integration Tests');
  totalTests++;
  if (runCommand(
    'npm test -- --testPathPattern=fit-show-scoring-performance.integration.test.tsx --watchAll=false --coverage=false',
    'Fit and Show Scoring Performance Tests',
    { cwd: websiteDir }
  )) {
    passedTests++;
  }
  
  // Run fit and show scoring system integration tests
  logSection('Fit and Show Scoring System Integration Tests');
  totalTests++;
  if (runCommand(
    'npm test -- --testPathPattern=fit-show-scoring-system-integration.test.tsx --watchAll=false --coverage=false',
    'Fit and Show Scoring System Integration Tests',
    { cwd: websiteDir }
  )) {
    passedTests++;
  }
  
  // Run fit and show scoring backend integration tests
  logSection('Fit and Show Scoring Backend Integration Tests');
  totalTests++;
  if (runCommand(
    'npm test -- --testPathPattern=fit-show-scoring-workflow.integration.test.ts --watchAll=false',
    'Fit and Show Scoring Backend Tests',
    { cwd: infrastructureDir }
  )) {
    passedTests++;
  }
  
  // Run existing scoring-related unit tests to ensure no regressions
  logSection('Regression Tests - Existing Scoring Tests');
  
  const existingTests = [
    'scoreResolver.test.ts',
    'scoreDataAccess.test.ts',
    'ScoringForm.test.tsx',
    'ScorePage.test.tsx',
    'ScoreReports.test.tsx',
    'scoringValidation.test.ts',
    'classScoreResolver.test.ts',
    'classScoreDataAccess.test.ts',
    'ClassScoringForm.test.tsx',
    'ClassScorePage.test.tsx',
    'ClassScoreReports.unit.test.tsx',
    'classScoring.test.ts',
    'fitShowScoreResolver.test.ts',
    'fitShowScoreDataAccess.test.ts',
    'fitShowScoreValidation.test.ts',
    'FitShowScoringForm.test.tsx',
    'FitShowScoringPage.test.tsx',
    'FitShowScoreReports.test.tsx',
    'AppearanceScoring.test.tsx',
    'HandlingScoring.test.tsx',
    'DemonstrationScoring.test.tsx',
    'HealthExaminationScoring.test.tsx',
    'GroomingCareScoring.test.tsx',
    'KnowledgeScoring.test.tsx',
  ];
  
  for (const testFile of existingTests) {
    totalTests++;
    if (runCommand(
      `npm test -- --testPathPattern=${testFile} --watchAll=false --coverage=false`,
      `Regression Test: ${testFile}`,
      { cwd: testFile.endsWith('.ts') ? infrastructureDir : websiteDir }
    )) {
      passedTests++;
    }
  }
  
  // Generate test coverage report
  logSection('Test Coverage Report');
  runCommand(
    'npm test -- --testPathPattern="(scoring|score)" --watchAll=false --coverage --coverageDirectory=coverage/integration',
    'Generate Coverage Report',
    { cwd: websiteDir }
  );
  
  // Summary
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  logHeader('Test Results Summary');
  
  log(`Total test suites: ${totalTests}`, colors.blue);
  log(`Passed: ${passedTests}`, passedTests === totalTests ? colors.green : colors.yellow);
  log(`Failed: ${totalTests - passedTests}`, totalTests - passedTests === 0 ? colors.green : colors.red);
  log(`Duration: ${duration}s`, colors.blue);
  
  if (passedTests === totalTests) {
    log('\n🎉 All integration tests passed!', colors.green + colors.bright);
    log('The scoring workflow is ready for production.', colors.green);
  } else {
    log('\n⚠️  Some tests failed.', colors.yellow + colors.bright);
    log('Please review the failures above and fix any issues.', colors.yellow);
  }
  
  // Test coverage summary
  const coverageFile = path.join(websiteDir, 'coverage/integration/lcov-report/index.html');
  if (fs.existsSync(coverageFile)) {
    log(`\n📊 Coverage report generated: ${coverageFile}`, colors.cyan);
  }
  
  // Exit with appropriate code
  process.exit(passedTests === totalTests ? 0 : 1);
}

// Handle process termination
process.on('SIGINT', () => {
  log('\n\n⚠️  Test run interrupted by user', colors.yellow);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log('\n\n❌ Uncaught exception during test run:', colors.red);
  log(error.stack, colors.red);
  process.exit(1);
});

// Run the test suite
main().catch((error) => {
  log('\n\n❌ Test runner failed:', colors.red);
  log(error.stack, colors.red);
  process.exit(1);
});