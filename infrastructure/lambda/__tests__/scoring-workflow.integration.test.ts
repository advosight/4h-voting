import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { handler as scoreResolverHandler } from '../scoreResolver';
import { handler as userManagementHandler } from '../userManagementResolver';
import { validateRole } from '../roleValidation';

// Mock DynamoDB
const ddbMock = mockClient(DynamoDBDocumentClient);

// Mock environment variables
process.env.TABLE_NAME = 'test-table';
process.env.AWS_REGION = 'us-east-1';

// Mock data
const mockCat = {
  id: 'cat-1',
  name: 'Fluffy',
  owner: 'John Doe',
  cageNumber: 1,
  votes: 0,
};

const mockJudge1 = {
  id: 'judge-1',
  username: 'judge1@example.com',
  name: 'Judge Smith',
  role: 'judge',
};

const mockJudge2 = {
  id: 'judge-2',
  username: 'judge2@example.com',
  name: 'Judge Johnson',
  role: 'judge',
};

const mockAdmin = {
  id: 'admin-1',
  username: 'admin@example.com',
  name: 'Admin User',
  role: 'admin',
};

const mockScore1 = {
  id: 'score-1',
  catId: 'cat-1',
  judgeId: 'judge-1',
  judgeName: 'Judge Smith',
  cageConditionScore: 20,
  cageConditionComments: 'Clean and organized',
  catConditionScore: 22,
  catConditionComments: 'Healthy and alert',
  groomingScore: 18,
  groomingComments: 'Well groomed',
  overallScore: 21,
  overallComments: 'Excellent presentation',
  totalScore: 81,
  timestamp: '2024-01-15T10:00:00Z',
  isFinalized: false,
};

const mockScore2 = {
  id: 'score-2',
  catId: 'cat-1',
  judgeId: 'judge-2',
  judgeName: 'Judge Johnson',
  cageConditionScore: 23,
  cageConditionComments: 'Exceptional cage setup',
  catConditionScore: 20,
  catConditionComments: 'Good condition',
  groomingScore: 24,
  groomingComments: 'Outstanding grooming',
  overallScore: 19,
  overallComments: 'Very good overall',
  totalScore: 86,
  timestamp: '2024-01-15T11:00:00Z',
  isFinalized: false,
};

describe('Scoring Workflow Backend Integration Tests', () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  describe('Complete Judge Scoring Process', () => {
    it('should handle end-to-end scoring workflow', async () => {
      // Mock cat lookup
      ddbMock.on(GetCommand, {
        TableName: 'test-table',
        Key: { PK: 'CAT#cat-1', SK: 'METADATA' },
      }).resolves({
        Item: {
          PK: 'CAT#cat-1',
          SK: 'METADATA',
          ...mockCat,
        },
      });

      // Mock existing scores check
      ddbMock.on(QueryCommand, {
        TableName: 'test-table',
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': 'CAT#cat-1',
          ':sk': 'SCORE#',
        },
      }).resolves({
        Items: [],
      });

      // Mock score creation
      ddbMock.on(PutCommand).resolves({});

      const createScoreEvent = {
        info: {
          fieldName: 'createScore',
        },
        arguments: {
          input: {
            catId: 'cat-1',
            cageConditionScore: 20,
            cageConditionComments: 'Clean and organized',
            catConditionScore: 22,
            catConditionComments: 'Healthy and alert',
            groomingScore: 18,
            groomingComments: 'Well groomed',
            overallScore: 21,
            overallComments: 'Excellent presentation',
            isFinalized: false,
          },
        },
        identity: {
          sub: 'judge-1',
          'custom:role': 'judge',
          'custom:name': 'Judge Smith',
        },
      };

      const result = await scoreResolverHandler(createScoreEvent);

      expect(result).toMatchObject({
        id: expect.any(String),
        catId: 'cat-1',
        judgeId: 'judge-1',
        judgeName: 'Judge Smith',
        totalScore: 81,
        isFinalized: false,
      });

      // Verify DynamoDB operations
      expect(ddbMock.commandCalls(PutCommand)).toHaveLength(3); // Main record + 2 indexes
    });

    it('should prevent duplicate scoring by same judge', async () => {
      // Mock existing score by same judge
      ddbMock.on(QueryCommand, {
        TableName: 'test-table',
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': 'CAT#cat-1',
          ':sk': 'SCORE#',
        },
      }).resolves({
        Items: [
          {
            PK: 'CAT#cat-1',
            SK: 'SCORE#score-1',
            judgeId: 'judge-1',
            ...mockScore1,
          },
        ],
      });

      const createScoreEvent = {
        info: {
          fieldName: 'createScore',
        },
        arguments: {
          input: {
            catId: 'cat-1',
            cageConditionScore: 25,
            cageConditionComments: 'Updated score',
            catConditionScore: 25,
            catConditionComments: 'Updated',
            groomingScore: 25,
            groomingComments: 'Updated',
            overallScore: 25,
            overallComments: 'Updated',
            isFinalized: false,
          },
        },
        identity: {
          sub: 'judge-1',
          'custom:role': 'judge',
          'custom:name': 'Judge Smith',
        },
      };

      await expect(scoreResolverHandler(createScoreEvent)).rejects.toThrow(
        'You have already scored this cat'
      );
    });

    it('should handle score updates with audit trail', async () => {
      // Mock existing score
      ddbMock.on(GetCommand, {
        TableName: 'test-table',
        Key: { PK: 'SCORE#score-1', SK: 'METADATA' },
      }).resolves({
        Item: {
          PK: 'SCORE#score-1',
          SK: 'METADATA',
          ...mockScore1,
        },
      });

      // Mock update operations
      ddbMock.on(PutCommand).resolves({});

      const updateScoreEvent = {
        info: {
          fieldName: 'updateScore',
        },
        arguments: {
          id: 'score-1',
          input: {
            cageConditionScore: 25,
            cageConditionComments: 'Updated to exceptional',
          },
        },
        identity: {
          sub: 'judge-1',
          'custom:role': 'judge',
          'custom:name': 'Judge Smith',
        },
      };

      const result = await scoreResolverHandler(updateScoreEvent);

      expect(result).toMatchObject({
        id: 'score-1',
        cageConditionScore: 25,
        cageConditionComments: 'Updated to exceptional',
        totalScore: 86, // Recalculated total
      });

      // Verify audit trail creation
      const auditCalls = ddbMock.commandCalls(PutCommand).filter(call => 
        call.args[0].input.Item.PK.startsWith('AUDIT#')
      );
      expect(auditCalls).toHaveLength(1);
    });
  });

  describe('Multi-Judge Scenarios', () => {
    it('should handle multiple judges scoring same cat', async () => {
      // Mock cat with existing scores
      ddbMock.on(QueryCommand, {
        TableName: 'test-table',
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': 'CAT#cat-1',
          ':sk': 'SCORE#',
        },
      }).resolves({
        Items: [
          {
            PK: 'CAT#cat-1',
            SK: 'SCORE#score-1',
            judgeId: 'judge-1',
            ...mockScore1,
          },
        ],
      });

      // Mock score creation for second judge
      ddbMock.on(PutCommand).resolves({});

      const createScoreEvent = {
        info: {
          fieldName: 'createScore',
        },
        arguments: {
          input: {
            catId: 'cat-1',
            cageConditionScore: 23,
            cageConditionComments: 'Exceptional cage setup',
            catConditionScore: 20,
            catConditionComments: 'Good condition',
            groomingScore: 24,
            groomingComments: 'Outstanding grooming',
            overallScore: 19,
            overallComments: 'Very good overall',
            isFinalized: false,
          },
        },
        identity: {
          sub: 'judge-2',
          'custom:role': 'judge',
          'custom:name': 'Judge Johnson',
        },
      };

      const result = await scoreResolverHandler(createScoreEvent);

      expect(result).toMatchObject({
        catId: 'cat-1',
        judgeId: 'judge-2',
        judgeName: 'Judge Johnson',
        totalScore: 86,
      });

      // Should not throw duplicate error since different judge
      expect(ddbMock.commandCalls(PutCommand)).toHaveLength(3);
    });

    it('should calculate average scores for multi-judge scenarios', async () => {
      // Mock multiple scores for same cat
      ddbMock.on(QueryCommand, {
        TableName: 'test-table',
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': 'CAT#cat-1',
          ':sk': 'SCORE#',
        },
      }).resolves({
        Items: [
          {
            PK: 'CAT#cat-1',
            SK: 'SCORE#score-1',
            ...mockScore1,
          },
          {
            PK: 'CAT#cat-1',
            SK: 'SCORE#score-2',
            ...mockScore2,
          },
        ],
      });

      const getScoresByCatEvent = {
        info: {
          fieldName: 'getScoresByCat',
        },
        arguments: {
          catId: 'cat-1',
        },
        identity: {
          sub: 'admin-1',
          'custom:role': 'admin',
        },
      };

      const result = await scoreResolverHandler(getScoresByCatEvent);

      expect(result.items).toHaveLength(2);
      expect(result.averageScore).toBe(83.5); // (81 + 86) / 2
      expect(result.items[0].totalScore).toBe(81);
      expect(result.items[1].totalScore).toBe(86);
    });
  });

  describe('Score Calculation and Validation', () => {
    it('should validate score ranges', async () => {
      const invalidScoreEvent = {
        info: {
          fieldName: 'createScore',
        },
        arguments: {
          input: {
            catId: 'cat-1',
            cageConditionScore: 30, // Invalid: > 25
            cageConditionComments: 'Test',
            catConditionScore: -5, // Invalid: < 0
            catConditionComments: 'Test',
            groomingScore: 15,
            groomingComments: 'Test',
            overallScore: 20,
            overallComments: 'Test',
            isFinalized: false,
          },
        },
        identity: {
          sub: 'judge-1',
          'custom:role': 'judge',
          'custom:name': 'Judge Smith',
        },
      };

      await expect(scoreResolverHandler(invalidScoreEvent)).rejects.toThrow(
        'Score validation failed'
      );
    });

    it('should calculate total scores correctly', async () => {
      ddbMock.on(GetCommand).resolves({ Item: null });
      ddbMock.on(QueryCommand).resolves({ Items: [] });
      ddbMock.on(PutCommand).resolves({});

      const createScoreEvent = {
        info: {
          fieldName: 'createScore',
        },
        arguments: {
          input: {
            catId: 'cat-1',
            cageConditionScore: 25,
            cageConditionComments: 'Perfect',
            catConditionScore: 25,
            catConditionComments: 'Perfect',
            groomingScore: 25,
            groomingComments: 'Perfect',
            overallScore: 25,
            overallComments: 'Perfect',
            isFinalized: false,
          },
        },
        identity: {
          sub: 'judge-1',
          'custom:role': 'judge',
          'custom:name': 'Judge Smith',
        },
      };

      const result = await scoreResolverHandler(createScoreEvent);

      expect(result.totalScore).toBe(100);
      expect(result.cageConditionScore).toBe(25);
      expect(result.catConditionScore).toBe(25);
      expect(result.groomingScore).toBe(25);
      expect(result.overallScore).toBe(25);
    });

    it('should validate comment length limits', async () => {
      const longComment = 'x'.repeat(501); // Exceeds 500 char limit

      const invalidCommentEvent = {
        info: {
          fieldName: 'createScore',
        },
        arguments: {
          input: {
            catId: 'cat-1',
            cageConditionScore: 20,
            cageConditionComments: longComment,
            catConditionScore: 20,
            catConditionComments: 'Valid comment',
            groomingScore: 20,
            groomingComments: 'Valid comment',
            overallScore: 20,
            overallComments: 'Valid comment',
            isFinalized: false,
          },
        },
        identity: {
          sub: 'judge-1',
          'custom:role': 'judge',
          'custom:name': 'Judge Smith',
        },
      };

      await expect(scoreResolverHandler(invalidCommentEvent)).rejects.toThrow(
        'Comment exceeds maximum length'
      );
    });
  });

  describe('Report Generation and Export', () => {
    it('should generate comprehensive scoring reports', async () => {
      // Mock all scores query
      ddbMock.on(QueryCommand, {
        TableName: 'test-table',
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: {
          ':pk': 'SCORE',
        },
      }).resolves({
        Items: [
          {
            PK: 'SCORE#score-1',
            SK: 'METADATA',
            GSI1PK: 'SCORE',
            GSI1SK: 'TOTAL#081',
            ...mockScore1,
          },
          {
            PK: 'SCORE#score-2',
            SK: 'METADATA',
            GSI1PK: 'SCORE',
            GSI1SK: 'TOTAL#086',
            ...mockScore2,
          },
        ],
      });

      const listAllScoresEvent = {
        info: {
          fieldName: 'listAllScores',
        },
        arguments: {},
        identity: {
          sub: 'admin-1',
          'custom:role': 'admin',
        },
      };

      const result = await scoreResolverHandler(listAllScoresEvent);

      expect(result.items).toHaveLength(2);
      // Should be sorted by total score descending
      expect(result.items[0].totalScore).toBe(86);
      expect(result.items[1].totalScore).toBe(81);
    });

    it('should filter reports by judge', async () => {
      // Mock judge-specific scores query
      ddbMock.on(QueryCommand, {
        TableName: 'test-table',
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': 'JUDGE#judge-1',
          ':sk': 'SCORE#',
        },
      }).resolves({
        Items: [
          {
            PK: 'JUDGE#judge-1',
            SK: 'SCORE#score-1',
            ...mockScore1,
          },
        ],
      });

      const getScoresByJudgeEvent = {
        info: {
          fieldName: 'getScoresByJudge',
        },
        arguments: {
          judgeId: 'judge-1',
        },
        identity: {
          sub: 'admin-1',
          'custom:role': 'admin',
        },
      };

      const result = await scoreResolverHandler(getScoresByJudgeEvent);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].judgeId).toBe('judge-1');
      expect(result.items[0].judgeName).toBe('Judge Smith');
    });

    it('should generate CSV export data', async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [mockScore1, mockScore2],
      });

      const exportScoresEvent = {
        info: {
          fieldName: 'exportScores',
        },
        arguments: {
          format: 'CSV',
        },
        identity: {
          sub: 'admin-1',
          'custom:role': 'admin',
        },
      };

      const result = await scoreResolverHandler(exportScoresEvent);

      expect(result.format).toBe('CSV');
      expect(result.data).toContain('Cat Name,Judge,Cage Condition,Cat Condition,Grooming,Overall,Total');
      expect(result.data).toContain('Judge Smith,20,22,18,21,81');
      expect(result.data).toContain('Judge Johnson,23,20,24,19,86');
    });
  });

  describe('Role-Based Access Control', () => {
    it('should enforce judge role for scoring operations', async () => {
      const nonJudgeEvent = {
        info: {
          fieldName: 'createScore',
        },
        arguments: {
          input: {
            catId: 'cat-1',
            cageConditionScore: 20,
            catConditionScore: 20,
            groomingScore: 20,
            overallScore: 20,
          },
        },
        identity: {
          sub: 'user-1',
          'custom:role': 'participant',
        },
      };

      await expect(scoreResolverHandler(nonJudgeEvent)).rejects.toThrow(
        'Access denied: Judge role required'
      );
    });

    it('should enforce admin role for comprehensive reports', async () => {
      const judgeEvent = {
        info: {
          fieldName: 'listAllScores',
        },
        arguments: {},
        identity: {
          sub: 'judge-1',
          'custom:role': 'judge',
        },
      };

      await expect(scoreResolverHandler(judgeEvent)).rejects.toThrow(
        'Access denied: Admin role required'
      );
    });

    it('should allow judges to view their own scores', async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [mockScore1],
      });

      const judgeOwnScoresEvent = {
        info: {
          fieldName: 'getScoresByJudge',
        },
        arguments: {
          judgeId: 'judge-1',
        },
        identity: {
          sub: 'judge-1',
          'custom:role': 'judge',
        },
      };

      const result = await scoreResolverHandler(judgeOwnScoresEvent);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].judgeId).toBe('judge-1');
    });

    it('should prevent judges from viewing other judges scores', async () => {
      const judgeOtherScoresEvent = {
        info: {
          fieldName: 'getScoresByJudge',
        },
        arguments: {
          judgeId: 'judge-2',
        },
        identity: {
          sub: 'judge-1',
          'custom:role': 'judge',
        },
      };

      await expect(scoreResolverHandler(judgeOtherScoresEvent)).rejects.toThrow(
        'Access denied: Cannot view other judges scores'
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle DynamoDB errors gracefully', async () => {
      ddbMock.on(PutCommand).rejects(new Error('DynamoDB service unavailable'));

      const createScoreEvent = {
        info: {
          fieldName: 'createScore',
        },
        arguments: {
          input: {
            catId: 'cat-1',
            cageConditionScore: 20,
            catConditionScore: 20,
            groomingScore: 20,
            overallScore: 20,
          },
        },
        identity: {
          sub: 'judge-1',
          'custom:role': 'judge',
          'custom:name': 'Judge Smith',
        },
      };

      await expect(scoreResolverHandler(createScoreEvent)).rejects.toThrow(
        'Database operation failed'
      );
    });

    it('should handle missing cat scenarios', async () => {
      ddbMock.on(GetCommand).resolves({ Item: undefined });

      const createScoreEvent = {
        info: {
          fieldName: 'createScore',
        },
        arguments: {
          input: {
            catId: 'nonexistent-cat',
            cageConditionScore: 20,
            catConditionScore: 20,
            groomingScore: 20,
            overallScore: 20,
          },
        },
        identity: {
          sub: 'judge-1',
          'custom:role': 'judge',
          'custom:name': 'Judge Smith',
        },
      };

      await expect(scoreResolverHandler(createScoreEvent)).rejects.toThrow(
        'Cat not found'
      );
    });

    it('should handle concurrent score modifications', async () => {
      // Mock existing score with different timestamp
      ddbMock.on(GetCommand).resolves({
        Item: {
          ...mockScore1,
          timestamp: '2024-01-15T12:00:00Z', // Different from expected
        },
      });

      const updateScoreEvent = {
        info: {
          fieldName: 'updateScore',
        },
        arguments: {
          id: 'score-1',
          input: {
            cageConditionScore: 25,
          },
          expectedTimestamp: '2024-01-15T10:00:00Z', // Original timestamp
        },
        identity: {
          sub: 'judge-1',
          'custom:role': 'judge',
        },
      };

      await expect(scoreResolverHandler(updateScoreEvent)).rejects.toThrow(
        'Score has been modified by another user'
      );
    });

    it('should handle score finalization conflicts', async () => {
      // Mock finalized score
      const finalizedScore = {
        ...mockScore1,
        isFinalized: true,
      };

      ddbMock.on(GetCommand).resolves({
        Item: finalizedScore,
      });

      const updateFinalizedScoreEvent = {
        info: {
          fieldName: 'updateScore',
        },
        arguments: {
          id: 'score-1',
          input: {
            cageConditionScore: 25,
          },
        },
        identity: {
          sub: 'judge-1',
          'custom:role': 'judge',
        },
      };

      await expect(scoreResolverHandler(updateFinalizedScoreEvent)).rejects.toThrow(
        'Cannot modify finalized score'
      );
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large datasets efficiently', async () => {
      // Mock large dataset
      const largeScoreSet = Array.from({ length: 1000 }, (_, i) => ({
        ...mockScore1,
        id: `score-${i}`,
        judgeId: `judge-${i % 10}`,
        totalScore: Math.floor(Math.random() * 100),
      }));

      ddbMock.on(QueryCommand).resolves({
        Items: largeScoreSet,
      });

      const listAllScoresEvent = {
        info: {
          fieldName: 'listAllScores',
        },
        arguments: {
          limit: 50,
          nextToken: null,
        },
        identity: {
          sub: 'admin-1',
          'custom:role': 'admin',
        },
      };

      const start = Date.now();
      const result = await scoreResolverHandler(listAllScoresEvent);
      const duration = Date.now() - start;

      expect(result.items).toHaveLength(50); // Pagination limit
      expect(result.nextToken).toBeDefined();
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should batch DynamoDB operations efficiently', async () => {
      ddbMock.on(PutCommand).resolves({});

      const createScoreEvent = {
        info: {
          fieldName: 'createScore',
        },
        arguments: {
          input: {
            catId: 'cat-1',
            cageConditionScore: 20,
            catConditionScore: 20,
            groomingScore: 20,
            overallScore: 20,
          },
        },
        identity: {
          sub: 'judge-1',
          'custom:role': 'judge',
          'custom:name': 'Judge Smith',
        },
      };

      await scoreResolverHandler(createScoreEvent);

      // Should create main record + 2 index records in separate operations
      expect(ddbMock.commandCalls(PutCommand)).toHaveLength(3);
    });
  });
});