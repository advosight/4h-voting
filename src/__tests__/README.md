# Scoring Workflow Integration Tests

This directory contains comprehensive integration tests for both the cage scoring and type class scoring workflow features of the 4H Cat Voting System.

## Test Structure

### 1. Frontend Integration Tests (`scoring-workflow.integration.test.tsx`)

Tests the complete frontend scoring workflow including:

- **End-to-End Judge Scoring Process**
  - Complete scoring workflow from navigation to submission
  - Score editing and updates with audit trail
  - Form validation and error handling

- **Multi-Judge Scenarios**
  - Multiple judges scoring the same cat
  - Prevention of duplicate scoring by same judge
  - Score comparison and averaging

- **Score Calculation and Total Computation**
  - Real-time score calculation as user types
  - Validation of score ranges (0-25 per category)
  - Total score computation (sum of all categories)

- **Report Generation and Export Functionality**
  - Comprehensive scoring reports with sorting
  - Filtering by judge, date range, and score range
  - CSV export functionality
  - Detailed score breakdown with comments

- **Role-Based Access Control**
  - Judge-only access to scoring interfaces
  - Admin-only access to comprehensive reports
  - Participant access to own cat scores
  - Prevention of unauthorized access

- **Real-Time Updates and Subscription Functionality**
  - Live score updates via GraphQL subscriptions
  - Real-time leaderboard updates
  - Score change notifications

### 2. Backend Integration Tests (`../../../infrastructure/lambda/__tests__/scoring-workflow.integration.test.ts`)

Tests the complete backend cage scoring workflow including:

- **Complete Judge Scoring Process**
  - End-to-end scoring workflow with DynamoDB operations
  - Prevention of duplicate scoring by same judge
  - Score updates with audit trail creation

- **Multi-Judge Scenarios**
  - Multiple judges scoring same cat
  - Average score calculation for multi-judge scenarios

- **Score Calculation and Validation**
  - Score range validation (0-25 per category)
  - Total score calculation accuracy
  - Comment length validation (≤500 characters)

- **Report Generation and Export**
  - Comprehensive scoring reports with sorting
  - Judge-specific score filtering
  - CSV export data generation

- **Role-Based Access Control**
  - Judge role enforcement for scoring operations
  - Admin role enforcement for comprehensive reports
  - Judge access to own scores only
  - Prevention of cross-judge score access

- **Error Handling and Edge Cases**
  - DynamoDB error handling
  - Missing cat scenarios
  - Concurrent modification handling
  - Score finalization conflicts

- **Performance and Scalability**
  - Large dataset handling with pagination
  - Efficient DynamoDB batch operations

### 3. Type Class Scoring Backend Integration Tests (`../../../infrastructure/lambda/__tests__/class-scoring-workflow.integration.test.ts`)

Tests the complete backend type class scoring workflow including:

- **Complete Judge Type Class Scoring Process**
  - End-to-end type class scoring workflow with DynamoDB operations
  - Prevention of duplicate type class scoring by same judge
  - Class score updates with audit trail creation

- **Multi-Judge Type Class Scoring Scenarios**
  - Multiple judges scoring same cat for class competition
  - Average class score calculation for multi-judge scenarios

- **Class Score Calculation and Validation**
  - Class score range validation (0-15, 0-20, 0-15 per category)
  - Total class score calculation accuracy (max 50 points)
  - Ribbon eligibility calculation based on score and health standards
  - Comment length validation (≤500 characters per category, ≤1000 for health)

- **Class Score Report Generation and Export**
  - Comprehensive type class scoring reports with sorting by ribbon eligibility
  - Judge-specific class score filtering
  - CSV export data generation with all type class scoring fields

- **Role-Based Access Control for Type Class Scoring**
  - Judge role enforcement for type class scoring operations
  - Admin role enforcement for comprehensive class reports
  - Judge access to own class scores only
  - Prevention of cross-judge class score access

- **Error Handling and Edge Cases for Type Class Scoring**
  - DynamoDB error handling for class scores
  - Missing cat scenarios in type class scoring
  - Concurrent class score modification handling
  - Class score finalization conflicts

- **Performance and Scalability for Type Class Scoring**
  - Large class score dataset handling with pagination
  - Efficient DynamoDB batch operations for class scores

### 3. Type Class Scoring Frontend Integration Tests (`class-scoring-workflow.integration.test.tsx`)

Tests the complete type class scoring workflow including:

- **End-to-End Judge Type Class Scoring Process**
  - Complete type class scoring workflow from navigation to submission
  - Class score editing and updates with audit trail
  - Form validation and error handling for class-specific criteria

- **Multi-Judge Scenarios for Type Class Scoring**
  - Multiple judges scoring the same cat for class competition
  - Prevention of duplicate type class scoring by same judge
  - Class score comparison and averaging

- **Class Score Calculation and Ribbon Eligibility**
  - Real-time class score calculation (beauty + personality + balance/proportion)
  - Validation of class score ranges (0-15, 0-20, 0-15 points)
  - Ribbon eligibility calculation based on total score and health/grooming standards

- **Administrative Class Score Reports**
  - Comprehensive type class scoring reports with sorting by ribbon eligibility
  - Filtering by judge, date range, and ribbon type
  - CSV export functionality for class scores
  - Detailed class score breakdown with health evaluations

- **Role-Based Access Control for Type Class Scoring**
  - Judge-only access to type class scoring interfaces
  - Admin-only access to comprehensive class reports
  - Participant access to own cat class scores
  - Prevention of unauthorized type class scoring access

- **Real-Time Class Score Updates**
  - Live class score updates via GraphQL subscriptions
  - Real-time class score leaderboard with ribbon categories
  - Class score change notifications

- **Separation from Cage Scoring**
  - Distinct routes and components for class vs cage scoring
  - Separate data models and API endpoints
  - Visual differentiation between scoring types

### 4. Type Class Scoring End-to-End Integration Tests (`end-to-end-class-scoring.integration.test.tsx`)

Tests the complete type class scoring system integration including:

- **Complete Type Class Scoring Workflow - Judge Perspective**
  - Full workflow from login to class score submission
  - Class score editing with real-time updates and ribbon recalculation
  - Form validation and error recovery for type class scoring

- **Multi-Judge Type Class Scoring Scenarios**
  - Multiple judges scoring same cat for class competition with proper isolation
  - Class score comparison and administrative oversight
  - Average class score calculation for multi-judge scenarios

- **Administrative Class Reports and Export**
  - Comprehensive class report generation with filtering
  - Detailed class score breakdown with health evaluations and comments
  - CSV export functionality with all type class scoring data

- **Real-Time Class Score Updates and Notifications**
  - Live class score updates across multiple components
  - Real-time notifications for class score changes and ribbon achievements

- **Error Handling and Recovery for Type Class Scoring**
  - Network error handling with retry functionality for class scores
  - Validation error handling with user feedback
  - Graceful degradation for type class scoring system failures

### 5. End-to-End Integration Tests (`end-to-end-scoring.integration.test.tsx`)

Tests the complete cage scoring system integration including:

- **Complete Scoring Workflow - Judge Perspective**
  - Full workflow from login to score submission
  - Score editing with real-time updates
  - Form validation and error recovery

- **Multi-Judge Scoring Scenarios**
  - Multiple judges scoring same cat with proper isolation
  - Score comparison and administrative oversight

- **Administrative Reports and Export**
  - Comprehensive report generation with filtering
  - Detailed score breakdown with comments
  - CSV export functionality

- **Real-Time Updates and Notifications**
  - Live score updates across multiple components
  - Real-time notifications for score changes

- **Error Handling and Recovery**
  - Network error handling with retry functionality
  - Validation error handling with user feedback
  - Graceful degradation for system failures

## Running the Tests

### Individual Test Suites

```bash
# Frontend integration tests
cd website
npm run test:scoring

# Backend integration tests
cd infrastructure
npm run test:scoring

# All integration tests
cd website
npm run test:integration
```

### Test Coverage

```bash
# Generate coverage report
cd website
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

### Continuous Integration

The integration test runner (`run-integration-tests.js`) provides:

- Automated test execution across frontend and backend
- Test result summary with pass/fail counts
- Coverage report generation
- Proper exit codes for CI/CD integration

## Test Data and Mocking

### Mock Data Factories

The tests use standardized mock data factories for consistency:

```javascript
// Available in global.testData
const mockCat = testData.createMockCat({ name: 'Fluffy', cageNumber: 1 });
const mockJudge = testData.createMockJudge({ name: 'Judge Smith' });
const mockScore = testData.createMockScore({ totalScore: 85 });
```

### Authentication Mocking

Tests mock the authentication system to simulate different user roles:

```javascript
// Mock authenticated judge
testUtils.mockAuthenticatedUser(mockJudge);

// Mock authenticated admin
testUtils.mockAuthenticatedUser(mockAdmin);

// Mock unauthenticated user
testUtils.mockUnauthenticatedUser();
```

### GraphQL Mocking

Tests use Apollo Client's MockedProvider for GraphQL operations:

```javascript
const mocks = [
  testUtils.createMockResponse(GET_CAT_BY_CAGE_NUMBER, { cageNumber: 1 }, { getCatByCageNumber: mockCat }),
  testUtils.createMockSubscription(ON_SCORE_UPDATE, { onScoreUpdate: updatedScore }),
];
```

## Custom Test Matchers

The tests include custom Jest matchers for scoring-specific assertions:

```javascript
expect(score.totalScore).toHaveValidScore(); // 0-100, integer
expect(score.cageConditionScore).toHaveValidCategoryScore(); // 0-25, integer
expect(score.cageConditionComments).toHaveValidComment(); // string, ≤500 chars
```

## Test Requirements Coverage

The integration tests verify all requirements from the specification:

### Requirement 1.1 - Judge Scoring Interface
- ✅ Scoring form accessible by cage number
- ✅ Cat information display
- ✅ Judge authentication verification

### Requirement 2.1 - Standardized Categories
- ✅ Four scoring categories (Cage, Cat, Grooming, Overall)
- ✅ Point scale validation (0-25 per category)
- ✅ Total score calculation

### Requirement 5.1 - Administrative Reports
- ✅ Comprehensive scoring reports
- ✅ Sorting and filtering capabilities
- ✅ CSV export functionality

### Requirement 7.2 - Role-Based Access
- ✅ Judge role verification
- ✅ Admin role enforcement
- ✅ Access control validation

### Requirement 8.1 - Real-Time Updates
- ✅ GraphQL subscription functionality
- ✅ Live score updates
- ✅ Notification system

## Performance Considerations

The integration tests include performance validations:

- Response times under 5 seconds for large datasets
- Efficient pagination for report generation
- Proper batching of DynamoDB operations
- Memory usage optimization for real-time updates

## Error Scenarios Tested

- Network connectivity issues with retry mechanisms
- Invalid score ranges and validation errors
- Concurrent modification conflicts
- Missing or invalid cat data
- Authentication and authorization failures
- DynamoDB service unavailability
- GraphQL subscription connection issues

## Maintenance

### Adding New Tests

When adding new scoring features:

1. Add unit tests for individual components
2. Add integration tests for feature workflows
3. Update the test runner to include new test files
4. Update this documentation

### Test Data Updates

When modifying data models:

1. Update mock data factories in `integration-test.config.js`
2. Update GraphQL mocks to match schema changes
3. Verify all existing tests still pass
4. Add tests for new fields or validation rules

### CI/CD Integration

The test runner is designed for CI/CD integration:

- Returns proper exit codes (0 for success, 1 for failure)
- Generates machine-readable test reports
- Provides coverage metrics for quality gates
- Handles timeout and resource cleanup

## Troubleshooting

### Common Issues

1. **Tests timing out**: Increase Jest timeout in `integration-test.config.js`
2. **GraphQL mock mismatches**: Verify query variables match exactly
3. **Authentication mock issues**: Ensure role utils are properly mocked
4. **Subscription tests failing**: Check WebSocket mock implementation

### Debug Mode

Enable debug logging by setting environment variables:

```bash
DEBUG=true npm run test:integration
VERBOSE=true npm run test:scoring
```

### Test Isolation

Each test suite runs in isolation with:

- Fresh mock implementations
- Clean authentication state
- Reset GraphQL client cache
- Cleared local storage and session storage

This ensures tests don't interfere with each other and provide consistent results.