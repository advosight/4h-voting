# Lambda Functions

This directory contains the AWS Lambda functions for the 4H Cat Voting and Scoring system.

## Files

### Core Functions
- `resolver.ts` - Main GraphQL resolver for cat voting functionality
- `vote.ts` - Public voting API handler
- `scoreDataAccess.ts` - DynamoDB data access layer for scoring functionality
- `scoreResolver.example.ts` - Example integration of scoring into GraphQL resolvers

### Tests
- `__tests__/scoreDataAccess.test.ts` - Unit tests for score data access layer
- `__tests__/scoreDataAccess.integration.test.ts` - Integration tests (disabled by default)

## Score Data Access Layer

The `ScoreDataAccess` class provides a complete data access layer for the scoring functionality with the following features:

### Key Features
- **CRUD Operations**: Create, read, update, and delete scores
- **Query Patterns**: Get scores by cat, judge, or cage number
- **Index Management**: Automatically maintains index records for efficient queries
- **Score Calculation**: Automatically calculates total scores from category scores
- **Validation**: Built-in validation for score ranges and data integrity

### DynamoDB Schema

The scoring system uses the existing single-table design with these access patterns:

#### Main Score Records
```
PK: SCORE#{scoreId}
SK: METADATA
```

#### Score-by-Cat Index
```
PK: CAT#{catId}
SK: SCORE#{scoreId}
```

#### Score-by-Judge Index
```
PK: JUDGE#{judgeId}
SK: SCORE#{scoreId}
```

### Usage Example

```typescript
import { ScoreDataAccess } from './scoreDataAccess';

const scoreDataAccess = new ScoreDataAccess(docClient, tableName);

// Create a score
const score = await scoreDataAccess.createScore({
  catId: 'cat-123',
  judgeId: 'judge-456',
  judgeName: 'Judge Smith',
  cageConditionScore: 20,
  cageConditionComments: 'Clean cage',
  catConditionScore: 22,
  catConditionComments: 'Healthy cat',
  groomingScore: 18,
  groomingComments: 'Well groomed',
  overallScore: 23,
  overallComments: 'Excellent presentation',
  isFinalized: false,
});

// Get scores for a cat
const catScores = await scoreDataAccess.getScoresByCat('cat-123');

// Get scores by a judge
const judgeScores = await scoreDataAccess.getScoresByJudge('judge-456');

// Update a score
const updatedScore = await scoreDataAccess.updateScore(score.id, {
  cageConditionScore: 25,
  isFinalized: true,
});
```

### Scoring Categories

The system supports four scoring categories, each with a maximum of 25 points:

1. **Cage Condition** (0-25 points) - Cage cleanliness, organization, and presentation
2. **Cat Condition** (0-25 points) - Cat health, body condition, and temperament  
3. **Grooming** (0-25 points) - Coat condition, cleanliness, and grooming quality
4. **Overall Presentation** (0-25 points) - Overall presentation and showmanship

**Maximum Total Score**: 100 points

### Validation Rules

- Each category score must be between 0 and 25 points
- Comments are optional but limited to 500 characters each
- Required fields: `catId`, `judgeId`, `judgeName`
- Total score is automatically calculated from category scores

### Error Handling

The data access layer includes comprehensive error handling:

- **Not Found**: Returns `null` for missing records or throws descriptive errors
- **Validation**: Throws errors for invalid score ranges or missing required fields
- **Consistency**: Maintains data consistency across main and index records
- **Transactions**: Uses atomic operations where possible

### Testing

Run the unit tests:

```bash
npm test
```

The test suite includes:
- ✅ CRUD operations testing
- ✅ Query pattern validation
- ✅ Score calculation verification
- ✅ Error handling scenarios
- ✅ Index record management
- ✅ Data consistency checks

### Integration with GraphQL

See `scoreResolver.example.ts` for an example of how to integrate the data access layer with AppSync GraphQL resolvers. The example includes:

- Resolver function structure
- Input validation
- Error handling
- Response formatting
- Integration with existing resolver patterns

### Performance Considerations

- **Efficient Queries**: Uses proper DynamoDB key patterns for fast lookups
- **Index Management**: Maintains denormalized index records for query performance
- **Batch Operations**: Supports batch operations where applicable
- **Connection Pooling**: Reuses DynamoDB client connections

### Security Considerations

- **Input Sanitization**: Validates all input parameters
- **Access Control**: Designed to work with role-based access control
- **Audit Trail**: Maintains timestamps for all score modifications
- **Data Integrity**: Ensures consistency between main and index records