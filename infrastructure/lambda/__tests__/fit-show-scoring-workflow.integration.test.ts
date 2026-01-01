import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { fitShowScoreResolver } from '../fitShowScoreResolver';
import { FitShowScoreDataAccess } from '../fitShowScoreDataAccess';

// Mock DynamoDB
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

const mockDynamoClient = {
  send: jest.fn(),
};

const mockDocClient = mockDynamoClient as any;

(DynamoDBClient as jest.Mock).mockImplementation(() => mockDynamoClient);
(DynamoDBDocumentClient.from as jest.Mock).mockReturnValue(mockDocClient);

// Mock environment
process.env.TABLE_NAME = 'test-table';

// Test data
const mockCat = {
  id: 'cat-123',
  name: 'Fluffy',
  ownerName: 'John Doe',
  cageNumber: 5
};

const mockFitShowScoreInput = {
  catId: 'cat-123',
  participantName: 'John Doe',
  judgeId: 'judge-123',
  judgeName: 'Judge Smith',
  // Appearance & Demeanor (20 points)
  attire: 8,
  attentive: 4,
  courteous: 5,
  // Handling & Control (14 points)
  controlEquipment: 7,
  pickupCarrying: 3,
  // Demonstration Skills (16 points)
  showingHeadShape: 3,
  showingBodyType: 4,
  showingTail: 3,
  showingCoatTexture: 4,
  // Health Examination (21 points)
  showingMouthTeethGums: 2,
  conditionMouthTeethGums: 2,
  showingNose: 2,
  showingEyes: 2,
  conditionNoseEyes: 2,
  showingEars: 2,
  earsClean: 2,
  showingToenailsClaws: 2,
  toenailsClipped: 5,
  // Grooming & Care (14 points)
  showingBellyCoatCleanliness: 3,
  coatCleanWellGroomed: 7,
  catHealthCare: 3,
  // Knowledge (12 points)
  generalKnowledge: 3,
  catBreedsShowing: 3,
  catAnatomy: 3,
  fourHKnowledge: 3,
  // Comments
  appearanceComments: 'Well dressed and professional',
  handlingComments: 'Good control, needs practice with harness',
  demonstrationComments: 'Clear demonstrations of features',
  healthExaminationComments: 'Thorough examination technique',
  groomingCareComments: 'Cat well groomed and healthy',
  knowledgeComments: 'Excellent knowledge of breeds and anatomy'
};

const mockFitShowScore = {
  id: 'score-123',
  ...mockFitShowScoreInput,
  // Calculated totals
  appearanceTotal: 17,
  handlingTotal: 10,
  demonstrationTotal: 14,
  healthExaminationTotal: 19,
  groomingCareTotal: 13,
  knowledgeTotal: 12,
  totalScore: 85,
  // Metadata
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
  isFinalized: false
};

describe('Fit and Show Scoring Workflow Integration Tests', () => {
  let dataAccess: FitShowScoreDataAccess;

  beforeEach(() => {
    jest.clearAllMocks();
    dataAccess = new FitShowScoreDataAccess();
  });

  describe('Complete Scoring Workflow', () => {
    test('should handle complete fit and show scoring workflow', async () => {
      // Mock DynamoDB responses for complete workflow
      mockDocClient.send
        // Check for existing score
        .mockResolvedValueOnce({ Items: [] })
        // Create score
        .mockResolvedValueOnce({})
        // Create index records
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        // Get created score
        .mockResolvedValueOnce({ Item: mockFitShowScore })
        // Update score
        .mockResolvedValueOnce({})
        // Get updated score
        .mockResolvedValueOnce({ 
          Item: { ...mockFitShowScore, totalScore: 88, isFinalized: true }
        });

      // Step 1: Create fit and show score
      const createEvent = {
        info: { fieldName: 'createFitShowScore' },
        arguments: { input: mockFitShowScoreInput },
        identity: { sub: 'judge-123' }
      };

      const createdScore = await fitShowScoreResolver(createEvent as any);
      
      expect(createdScore).toMatchObject({
        catId: 'cat-123',
        participantName: 'John Doe',
        totalScore: 85
      });

      // Verify DynamoDB operations
      expect(mockDocClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-table',
            Item: expect.objectContaining({
              PK: expect.stringContaining('FIT_SHOW_SCORE#'),
              SK: 'METADATA'
            })
          })
        })
      );

      // Step 2: Update fit and show score
      const updateEvent = {
        info: { fieldName: 'updateFitShowScore' },
        arguments: { 
          input: { 
            id: 'score-123',
            ...mockFitShowScoreInput,
            attire: 9, // Updated score
            isFinalized: true
          }
        },
        identity: { sub: 'judge-123' }
      };

      const updatedScore = await fitShowScoreResolver(updateEvent as any);
      
      expect(updatedScore).toMatchObject({
        totalScore: 88,
        isFinalized: true
      });
    });

    test('should handle concurrent scoring by multiple judges', async () => {
      const judge1Score = { ...mockFitShowScoreInput, judgeId: 'judge-1', judgeName: 'Judge One' };
      const judge2Score = { ...mockFitShowScoreInput, judgeId: 'judge-2', judgeName: 'Judge Two' };
      const judge3Score = { ...mockFitShowScoreInput, judgeId: 'judge-3', judgeName: 'Judge Three' };

      // Mock responses for concurrent scoring
      mockDocClient.send
        .mockResolvedValue({ Items: [] }) // No existing scores
        .mockResolvedValue({}) // Create operations
        .mockResolvedValue({}) 
        .mockResolvedValue({});

      // Simulate concurrent score creation
      const createPromises = [judge1Score, judge2Score, judge3Score].map(async (scoreInput, index) => {
        const event = {
          info: { fieldName: 'createFitShowScore' },
          arguments: { input: scoreInput },
          identity: { sub: scoreInput.judgeId }
        };

        return fitShowScoreResolver(event as any);
      });

      const results = await Promise.all(createPromises);

      // Verify all scores were created
      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.judgeId).toBe(`judge-${index + 1}`);
      });

      // Verify DynamoDB was called for each score
      expect(mockDocClient.send).toHaveBeenCalledTimes(9); // 3 checks + 6 creates (main + indexes)
    });

    test('should prevent duplicate scoring by same judge', async () => {
      const existingScore = { ...mockFitShowScore, judgeId: 'judge-123' };

      // Mock existing score found
      mockDocClient.send.mockResolvedValueOnce({ 
        Items: [existingScore] 
      });

      const createEvent = {
        info: { fieldName: 'createFitShowScore' },
        arguments: { input: mockFitShowScoreInput },
        identity: { sub: 'judge-123' }
      };

      await expect(fitShowScoreResolver(createEvent as any))
        .rejects
        .toThrow('Judge has already scored this participant');
    });
  });

  describe('Score Calculation Integration', () => {
    test('should correctly calculate all category totals and overall score', async () => {
      mockDocClient.send
        .mockResolvedValueOnce({ Items: [] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ Item: mockFitShowScore });

      const result = await dataAccess.createFitShowScore(mockFitShowScoreInput);

      expect(result).toMatchObject({
        appearanceTotal: 17, // 8 + 4 + 5
        handlingTotal: 10,   // 7 + 3
        demonstrationTotal: 14, // 3 + 4 + 3 + 4
        healthExaminationTotal: 19, // 2+2+2+2+2+2+2+2+5
        groomingCareTotal: 13, // 3 + 7 + 3
        knowledgeTotal: 12,    // 3 + 3 + 3 + 3
        totalScore: 85         // Sum of all categories
      });
    });

    test('should handle maximum possible scores correctly', async () => {
      const maxScoreInput = {
        ...mockFitShowScoreInput,
        // Appearance & Demeanor (20 points max)
        attire: 10,
        attentive: 5,
        courteous: 5,
        // Handling & Control (14 points max)
        controlEquipment: 10,
        pickupCarrying: 4,
        // Demonstration Skills (16 points max)
        showingHeadShape: 4,
        showingBodyType: 4,
        showingTail: 4,
        showingCoatTexture: 4,
        // Health Examination (21 points max)
        showingMouthTeethGums: 3,
        conditionMouthTeethGums: 2,
        showingNose: 2,
        showingEyes: 2,
        conditionNoseEyes: 2,
        showingEars: 2,
        earsClean: 2,
        showingToenailsClaws: 3,
        toenailsClipped: 6,
        // Grooming & Care (14 points max)
        showingBellyCoatCleanliness: 3,
        coatCleanWellGroomed: 8,
        catHealthCare: 3,
        // Knowledge (12 points max)
        generalKnowledge: 3,
        catBreedsShowing: 3,
        catAnatomy: 3,
        fourHKnowledge: 3
      };

      mockDocClient.send
        .mockResolvedValueOnce({ Items: [] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ 
          Item: { 
            ...maxScoreInput,
            appearanceTotal: 20,
            handlingTotal: 14,
            demonstrationTotal: 16,
            healthExaminationTotal: 21,
            groomingCareTotal: 14,
            knowledgeTotal: 12,
            totalScore: 97 // Maximum possible: 20+14+16+21+14+12 = 97
          }
        });

      const result = await dataAccess.createFitShowScore(maxScoreInput);

      expect(result.totalScore).toBe(97);
      expect(result.appearanceTotal).toBe(20);
      expect(result.handlingTotal).toBe(14);
      expect(result.demonstrationTotal).toBe(16);
      expect(result.healthExaminationTotal).toBe(21);
      expect(result.groomingCareTotal).toBe(14);
      expect(result.knowledgeTotal).toBe(12);
    });
  });

  describe('Data Access Pattern Integration', () => {
    test('should support all required access patterns', async () => {
      const scores = [
        { ...mockFitShowScore, id: 'score-1', judgeId: 'judge-1' },
        { ...mockFitShowScore, id: 'score-2', judgeId: 'judge-2' },
        { ...mockFitShowScore, id: 'score-3', judgeId: 'judge-1', catId: 'cat-456' }
      ];

      // Test: Get fit and show score by ID
      mockDocClient.send.mockResolvedValueOnce({ Item: scores[0] });
      
      const scoreById = await dataAccess.getFitShowScore('score-1');
      expect(scoreById).toMatchObject(scores[0]);

      // Test: Get fit and show scores by cat
      mockDocClient.send.mockResolvedValueOnce({ Items: [scores[0], scores[1]] });
      
      const scoresByCat = await dataAccess.getFitShowScoresByCat('cat-123');
      expect(scoresByCat).toHaveLength(2);

      // Test: Get fit and show scores by judge
      mockDocClient.send.mockResolvedValueOnce({ Items: [scores[0], scores[2]] });
      
      const scoresByJudge = await dataAccess.getFitShowScoresByJudge('judge-1');
      expect(scoresByJudge).toHaveLength(2);

      // Test: List all fit and show scores
      mockDocClient.send.mockResolvedValueOnce({ Items: scores });
      
      const allScores = await dataAccess.listFitShowScores();
      expect(allScores.items).toHaveLength(3);

      // Verify correct DynamoDB queries were made
      expect(mockDocClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-table',
            Key: { PK: 'FIT_SHOW_SCORE#score-1', SK: 'METADATA' }
          })
        })
      );

      expect(mockDocClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-table',
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
            ExpressionAttributeValues: {
              ':pk': 'CAT#cat-123',
              ':sk': 'FIT_SHOW_SCORE#'
            }
          })
        })
      );
    });

    test('should handle pagination correctly', async () => {
      const scores = Array.from({ length: 25 }, (_, i) => ({
        ...mockFitShowScore,
        id: `score-${i}`,
        participantName: `Participant ${i}`
      }));

      // First page
      mockDocClient.send.mockResolvedValueOnce({
        Items: scores.slice(0, 10),
        LastEvaluatedKey: { PK: 'FIT_SHOW_SCORE#score-9', SK: 'METADATA' }
      });

      const firstPage = await dataAccess.listFitShowScores({ limit: 10 });
      
      expect(firstPage.items).toHaveLength(10);
      expect(firstPage.nextToken).toBeDefined();

      // Second page
      mockDocClient.send.mockResolvedValueOnce({
        Items: scores.slice(10, 20),
        LastEvaluatedKey: { PK: 'FIT_SHOW_SCORE#score-19', SK: 'METADATA' }
      });

      const secondPage = await dataAccess.listFitShowScores({ 
        limit: 10, 
        nextToken: firstPage.nextToken 
      });
      
      expect(secondPage.items).toHaveLength(10);
      expect(secondPage.items[0].participantName).toBe('Participant 10');
    });
  });

  describe('Audit Trail Integration', () => {
    test('should create audit records for all operations', async () => {
      mockDocClient.send
        .mockResolvedValueOnce({ Items: [] })
        .mockResolvedValueOnce({}) // Create score
        .mockResolvedValueOnce({}) // Create cat index
        .mockResolvedValueOnce({}) // Create judge index
        .mockResolvedValueOnce({}) // Create audit record
        .mockResolvedValueOnce({ Item: mockFitShowScore });

      await dataAccess.createFitShowScore(mockFitShowScoreInput);

      // Verify audit record was created
      expect(mockDocClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-table',
            Item: expect.objectContaining({
              PK: expect.stringContaining('FIT_SHOW_SCORE_AUDIT#'),
              SK: expect.stringContaining('ENTRY#'),
              action: 'CREATE'
            })
          })
        })
      );
    });

    test('should track score modifications in audit trail', async () => {
      const originalScore = mockFitShowScore;
      const updatedScore = { ...mockFitShowScore, totalScore: 88, attire: 9 };

      mockDocClient.send
        .mockResolvedValueOnce({ Item: originalScore }) // Get original
        .mockResolvedValueOnce({}) // Update score
        .mockResolvedValueOnce({}) // Create audit record
        .mockResolvedValueOnce({ Item: updatedScore }); // Get updated

      await dataAccess.updateFitShowScore('score-123', { attire: 9 });

      // Verify audit record tracks changes
      expect(mockDocClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-table',
            Item: expect.objectContaining({
              action: 'UPDATE',
              previousValues: expect.stringContaining('"attire":8'),
              newValues: expect.stringContaining('"attire":9')
            })
          })
        })
      );
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle DynamoDB errors gracefully', async () => {
      mockDocClient.send.mockRejectedValue(new Error('DynamoDB service error'));

      await expect(dataAccess.createFitShowScore(mockFitShowScoreInput))
        .rejects
        .toThrow('DynamoDB service error');
    });

    test('should handle conditional check failures for concurrent updates', async () => {
      mockDocClient.send
        .mockResolvedValueOnce({ Item: mockFitShowScore })
        .mockRejectedValueOnce({
          name: 'ConditionalCheckFailedException',
          message: 'The conditional request failed'
        });

      await expect(dataAccess.updateFitShowScore('score-123', { attire: 9 }))
        .rejects
        .toThrow('Score was modified by another user');
    });

    test('should validate score ranges before database operations', async () => {
      const invalidScoreInput = {
        ...mockFitShowScoreInput,
        attire: 15 // Invalid: max is 10
      };

      await expect(dataAccess.createFitShowScore(invalidScoreInput))
        .rejects
        .toThrow('Score must be between 1 and 10');
    });
  });

  describe('Performance Integration', () => {
    test('should handle batch operations efficiently', async () => {
      const batchSize = 25;
      const scores = Array.from({ length: batchSize }, (_, i) => ({
        ...mockFitShowScore,
        id: `score-${i}`,
        participantName: `Participant ${i}`
      }));

      mockDocClient.send.mockResolvedValue({ Items: scores });

      const startTime = Date.now();
      const result = await dataAccess.listFitShowScores({ limit: batchSize });
      const endTime = Date.now();

      expect(result.items).toHaveLength(batchSize);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
    });

    test('should optimize queries for common access patterns', async () => {
      // Test optimized query for getting scores by cat
      mockDocClient.send.mockResolvedValue({ Items: [mockFitShowScore] });

      await dataAccess.getFitShowScoresByCat('cat-123');

      // Verify efficient query structure
      expect(mockDocClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
            ExpressionAttributeValues: {
              ':pk': 'CAT#cat-123',
              ':sk': 'FIT_SHOW_SCORE#'
            }
          })
        })
      );
    });
  });
});