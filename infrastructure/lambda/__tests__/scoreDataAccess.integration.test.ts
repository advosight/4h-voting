import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { ScoreDataAccess, CreateScoreInput } from '../scoreDataAccess';

// This integration test would run against a real DynamoDB instance
// For now, it's disabled but shows how the integration would work
describe.skip('ScoreDataAccess Integration Tests', () => {
  let scoreDataAccess: ScoreDataAccess;
  let docClient: DynamoDBDocumentClient;
  const tableName = process.env.TABLE_NAME || 'test-table';

  beforeAll(() => {
    const client = new DynamoDBClient({
      region: 'us-east-1',
      endpoint: 'http://localhost:8000', // Local DynamoDB
    });
    docClient = DynamoDBDocumentClient.from(client);
    scoreDataAccess = new ScoreDataAccess(docClient, tableName);
  });

  describe('Full CRUD workflow', () => {
    let createdScoreId: string;

    it('should create, read, update, and delete a score', async () => {
      // Create
      const createInput: CreateScoreInput = {
        catId: 'integration-test-cat',
        judgeId: 'integration-test-judge',
        judgeName: 'Test Judge',
        cageConditionScore: 20,
        cageConditionComments: 'Clean cage',
        catConditionScore: 22,
        catConditionComments: 'Healthy cat',
        groomingScore: 18,
        groomingComments: 'Well groomed',
        overallScore: 23,
        overallComments: 'Excellent presentation',
        isFinalized: false,
      };

      const createdScore = await scoreDataAccess.createScore(createInput);
      createdScoreId = createdScore.id;

      expect(createdScore.totalScore).toBe(83);
      expect(createdScore.isFinalized).toBe(false);

      // Read
      const retrievedScore = await scoreDataAccess.getScore(createdScoreId);
      expect(retrievedScore).toEqual(createdScore);

      // Update
      const updatedScore = await scoreDataAccess.updateScore(createdScoreId, {
        cageConditionScore: 25,
        isFinalized: true,
      });

      expect(updatedScore.cageConditionScore).toBe(25);
      expect(updatedScore.totalScore).toBe(88); // 25 + 22 + 18 + 23
      expect(updatedScore.isFinalized).toBe(true);

      // Verify queries work
      const scoresByCat = await scoreDataAccess.getScoresByCat('integration-test-cat');
      expect(scoresByCat).toHaveLength(1);
      expect(scoresByCat[0].id).toBe(createdScoreId);

      const scoresByJudge = await scoreDataAccess.getScoresByJudge('integration-test-judge');
      expect(scoresByJudge).toHaveLength(1);
      expect(scoresByJudge[0].id).toBe(createdScoreId);

      // Delete
      const deletedScore = await scoreDataAccess.deleteScore(createdScoreId);
      expect(deletedScore.id).toBe(createdScoreId);

      // Verify deletion
      const shouldBeNull = await scoreDataAccess.getScore(createdScoreId);
      expect(shouldBeNull).toBeNull();

      const scoresAfterDelete = await scoreDataAccess.getScoresByCat('integration-test-cat');
      expect(scoresAfterDelete).toHaveLength(0);
    });
  });

  describe('Query patterns', () => {
    const testScores: CreateScoreInput[] = [
      {
        catId: 'cat-1',
        judgeId: 'judge-1',
        judgeName: 'Judge A',
        cageConditionScore: 20,
        catConditionScore: 22,
        groomingScore: 18,
        overallScore: 23,
      },
      {
        catId: 'cat-1',
        judgeId: 'judge-2',
        judgeName: 'Judge B',
        cageConditionScore: 22,
        catConditionScore: 23,
        groomingScore: 20,
        overallScore: 25,
      },
      {
        catId: 'cat-2',
        judgeId: 'judge-1',
        judgeName: 'Judge A',
        cageConditionScore: 18,
        catConditionScore: 20,
        groomingScore: 16,
        overallScore: 21,
      },
    ];

    let createdScoreIds: string[] = [];

    beforeAll(async () => {
      // Create test scores
      for (const scoreInput of testScores) {
        const score = await scoreDataAccess.createScore(scoreInput);
        createdScoreIds.push(score.id);
      }
    });

    afterAll(async () => {
      // Clean up test scores
      for (const scoreId of createdScoreIds) {
        try {
          await scoreDataAccess.deleteScore(scoreId);
        } catch (error) {
          // Ignore errors during cleanup
        }
      }
    });

    it('should query scores by cat correctly', async () => {
      const cat1Scores = await scoreDataAccess.getScoresByCat('cat-1');
      expect(cat1Scores).toHaveLength(2);
      
      const judgeIds = cat1Scores.map(s => s.judgeId).sort();
      expect(judgeIds).toEqual(['judge-1', 'judge-2']);
    });

    it('should query scores by judge correctly', async () => {
      const judge1Scores = await scoreDataAccess.getScoresByJudge('judge-1');
      expect(judge1Scores).toHaveLength(2);
      
      const catIds = judge1Scores.map(s => s.catId).sort();
      expect(catIds).toEqual(['cat-1', 'cat-2']);
    });

    it('should list all scores', async () => {
      const allScores = await scoreDataAccess.listAllScores();
      expect(allScores.length).toBeGreaterThanOrEqual(3);
      
      // Should include our test scores
      const testScoreIds = allScores.map(s => s.id);
      for (const createdId of createdScoreIds) {
        expect(testScoreIds).toContain(createdId);
      }
    });
  });
});