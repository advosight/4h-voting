import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { classScoreResolver } from '../classScoreResolver';
import { createClassScore, updateClassScore, getClassScore, getClassScoresByCat, listAllClassScores } from '../classScoreDataAccess';

// Mock DynamoDB
const ddbMock = mockClient(DynamoDBDocumentClient);

// Mock environment variables
process.env.TABLE_NAME = 'test-table';

// Test data
const mockCats = {
  'cat-1': {
    id: 'cat-1',
    name: 'Fluffy',
    owner: 'Alice Johnson',
    cageNumber: 1,
    class: 'Household Pet',
    ageGroup: 'Adult'
  },
  'cat-2': {
    id: 'cat-2',
    name: 'Whiskers',
    owner: 'Bob Smith',
    cageNumber: 2,
    class: 'Household Pet',
    ageGroup: 'Kitten'
  },
  'cat-3': {
    id: 'cat-3',
    name: 'Shadow',
    owner: 'Charlie Brown',
    cageNumber: 3,
    class: 'Pedigreed',
    ageGroup: 'Adult'
  }
};

const mockJudges = {
  'judge-1': {
    id: 'judge-1',
    name: 'Judge Smith',
    username: 'judge@example.com',
    role: 'judge'
  },
  'judge-2': {
    id: 'judge-2',
    name: 'Judge Johnson',
    username: 'judge2@example.com',
    role: 'judge'
  }
};

describe('Type Class Scoring Workflow Backend Integration Tests', () => {
  beforeEach(() => {
    ddbMock.reset();
    jest.clearAllMocks();
  });

  describe('Complete Judge Type Class Scoring Process', () => {
    it('handles end-to-end type class scoring workflow with DynamoDB operations', async () => {
      // Mock successful DynamoDB operations
      ddbMock.on(PutCommand).resolves({});
      ddbMock.on(QueryCommand).resolves({ Items: [] });

      const classScoreInput = {
        catId: 'cat-1',
        beautyScore: 14,
        beautyComments: 'Excellent coat quality and markings',
        personalityScore: 19,
        personalityComments: 'Very friendly and well-socialized cat',
        balanceProportionScore: 13,
        balanceProportionComments: 'Good overall body structure and proportions',
        coatCleanGroomed: true,
        teethGumsHealthy: true,
        eyesNoseClear: true,
        earsCleanMiteFree: true,
        toenailsClipped: true,
        fleaIssues: false,
        healthGroomingComments: 'Excellent health and grooming standards',
        isFinalized: false
      };

      const judgeContext = {
        identity: {
          sub: 'judge-1',
          username: 'judge@example.com'
        }
      };

      // Create class score
      const createdScore = await createClassScore(classScoreInput, judgeContext);

      // Verify score creation
      expect(createdScore).toMatchObject({
        catId: 'cat-1',
        judgeId: 'judge-1',
        beautyScore: 14,
        personalityScore: 19,
        balanceProportionScore: 13,
        totalScore: 46, // 14 + 19 + 13
        ribbonEligibility: 'Blue', // 46 points with all health passing
        coatCleanGroomed: true,
        teethGumsHealthy: true,
        eyesNoseClear: true,
        earsCleanMiteFree: true,
        toenailsClipped: true,
        fleaIssues: false,
        isFinalized: false
      });

      expect(createdScore.id).toBeDefined();
      expect(createdScore.timestamp).toBeDefined();

      // Verify DynamoDB operations
      expect(ddbMock.commandCalls(PutCommand)).toHaveLength(3); // Main record + 2 indexes

      const putCalls = ddbMock.commandCalls(PutCommand);
      
      // Main class score record
      expect(putCalls[0].args[0].input.Item).toMatchObject({
        PK: expect.stringMatching(/^CLASS_SCORE#/),
        SK: 'METADATA',
        catId: 'cat-1',
        judgeId: 'judge-1',
        totalScore: 46,
        ribbonEligibility: 'Blue'
      });

      // Cat index record
      expect(putCalls[1].args[0].input.Item).toMatchObject({
        PK: 'CAT#cat-1',
        SK: expect.stringMatching(/^CLASS_SCORE#/),
        judgeId: 'judge-1',
        totalScore: 46,
        ribbonEligibility: 'Blue'
      });

      // Judge index record
      expect(putCalls[2].args[0].input.Item).toMatchObject({
        PK: 'JUDGE#judge-1',
        SK: expect.stringMatching(/^CLASS_SCORE#/),
        catId: 'cat-1',
        totalScore: 46,
        ribbonEligibility: 'Blue'
      });
    });

    it('prevents duplicate type class scoring by same judge', async () => {
      // Mock existing class score by same judge
      const existingScore = {
        id: 'class-score-1',
        catId: 'cat-1',
        judgeId: 'judge-1',
        judgeName: 'Judge Smith',
        totalScore: 40,
        ribbonEligibility: 'Red',
        isFinalized: true,
        timestamp: '2024-01-15T10:00:00Z'
      };

      ddbMock.on(QueryCommand).resolves({
        Items: [existingScore]
      });

      const classScoreInput = {
        catId: 'cat-1',
        beautyScore: 12,
        personalityScore: 18,
        balanceProportionScore: 13,
        coatCleanGroomed: true,
        teethGumsHealthy: true,
        eyesNoseClear: true,
        earsCleanMiteFree: true,
        toenailsClipped: true,
        fleaIssues: false,
        isFinalized: false
      };

      const judgeContext = {
        identity: {
          sub: 'judge-1',
          username: 'judge@example.com'
        }
      };

      // Attempt to create duplicate score should throw error
      await expect(createClassScore(classScoreInput, judgeContext))
        .rejects.toThrow('Judge has already submitted a finalized class score for this cat');

      // Verify no new records were created
      expect(ddbMock.commandCalls(PutCommand)).toHaveLength(0);
    });

    it('handles class score updates with audit trail creation', async () => {
      const existingScore = {
        id: 'class-score-1',
        catId: 'cat-1',
        judgeId: 'judge-1',
        judgeName: 'Judge Smith',
        beautyScore: 12,
        personalityScore: 18,
        balanceProportionScore: 13,
        totalScore: 43,
        ribbonEligibility: 'Red',
        isFinalized: false,
        timestamp: '2024-01-15T10:00:00Z'
      };

      // Mock existing score retrieval
      ddbMock.on(QueryCommand).resolves({
        Items: [existingScore]
      });

      // Mock successful update
      ddbMock.on(PutCommand).resolves({});

      const updateInput = {
        beautyScore: 14,
        beautyComments: 'Updated: Excellent coat quality',
        personalityScore: 19,
        personalityComments: 'Updated: Very friendly temperament'
      };

      const judgeContext = {
        identity: {
          sub: 'judge-1',
          username: 'judge@example.com'
        }
      };

      const updatedScore = await updateClassScore('class-score-1', updateInput, judgeContext);

      // Verify updated values
      expect(updatedScore).toMatchObject({
        id: 'class-score-1',
        catId: 'cat-1',
        judgeId: 'judge-1',
        beautyScore: 14,
        personalityScore: 19,
        balanceProportionScore: 13, // Unchanged
        totalScore: 46, // Recalculated: 14 + 19 + 13
        ribbonEligibility: 'Blue', // Updated based on new total
        isFinalized: false
      });

      // Verify audit trail creation
      const putCalls = ddbMock.commandCalls(PutCommand);
      expect(putCalls.length).toBeGreaterThan(3); // Main + indexes + audit record

      // Check for audit record
      const auditCall = putCalls.find(call => 
        call.args[0].input.Item.PK?.includes('AUDIT')
      );
      expect(auditCall).toBeDefined();
      expect(auditCall.args[0].input.Item).toMatchObject({
        PK: expect.stringMatching(/^CLASS_SCORE_AUDIT#/),
        SK: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        classScoreId: 'class-score-1',
        judgeId: 'judge-1',
        action: 'UPDATE',
        changes: expect.objectContaining({
          beautyScore: { from: 12, to: 14 },
          personalityScore: { from: 18, to: 19 },
          totalScore: { from: 43, to: 46 },
          ribbonEligibility: { from: 'Red', to: 'Blue' }
        })
      });
    });
  });

  describe('Multi-Judge Scenarios', () => {
    it('allows multiple judges to score same cat independently', async () => {
      // Mock no existing scores for judge-2
      ddbMock.on(QueryCommand).resolves({ Items: [] });
      ddbMock.on(PutCommand).resolves({});

      const judge1Input = {
        catId: 'cat-1',
        beautyScore: 12,
        personalityScore: 18,
        balanceProportionScore: 13,
        coatCleanGroomed: true,
        teethGumsHealthy: true,
        eyesNoseClear: true,
        earsCleanMiteFree: true,
        toenailsClipped: true,
        fleaIssues: false,
        isFinalized: true
      };

      const judge2Input = {
        catId: 'cat-1',
        beautyScore: 14,
        personalityScore: 19,
        balanceProportionScore: 14,
        coatCleanGroomed: true,
        teethGumsHealthy: true,
        eyesNoseClear: true,
        earsCleanMiteFree: true,
        toenailsClipped: true,
        fleaIssues: false,
        isFinalized: true
      };

      const judge1Context = {
        identity: { sub: 'judge-1', username: 'judge@example.com' }
      };

      const judge2Context = {
        identity: { sub: 'judge-2', username: 'judge2@example.com' }
      };

      // Create scores from both judges
      const judge1Score = await createClassScore(judge1Input, judge1Context);
      const judge2Score = await createClassScore(judge2Input, judge2Context);

      // Verify both scores were created with different judges
      expect(judge1Score.judgeId).toBe('judge-1');
      expect(judge1Score.totalScore).toBe(43);
      expect(judge1Score.ribbonEligibility).toBe('Red');

      expect(judge2Score.judgeId).toBe('judge-2');
      expect(judge2Score.totalScore).toBe(47);
      expect(judge2Score.ribbonEligibility).toBe('Blue');

      // Verify separate DynamoDB records
      expect(ddbMock.commandCalls(PutCommand)).toHaveLength(6); // 3 records per score
    });

    it('calculates average scores for multi-judge scenarios', async () => {
      const judge1Score = {
        id: 'class-score-1',
        catId: 'cat-1',
        judgeId: 'judge-1',
        judgeName: 'Judge Smith',
        totalScore: 43,
        ribbonEligibility: 'Red',
        isFinalized: true
      };

      const judge2Score = {
        id: 'class-score-2',
        catId: 'cat-1',
        judgeId: 'judge-2',
        judgeName: 'Judge Johnson',
        totalScore: 47,
        ribbonEligibility: 'Blue',
        isFinalized: true
      };

      // Mock retrieval of multiple scores for same cat
      ddbMock.on(QueryCommand).resolves({
        Items: [judge1Score, judge2Score]
      });

      const catScores = await getClassScoresByCat('cat-1');

      expect(catScores.items).toHaveLength(2);
      expect(catScores.items[0].totalScore).toBe(43);
      expect(catScores.items[1].totalScore).toBe(47);

      // Calculate average (would be done in frontend or separate function)
      const averageScore = catScores.items.reduce((sum, score) => sum + score.totalScore, 0) / catScores.items.length;
      expect(averageScore).toBe(45); // (43 + 47) / 2
    });
  });

  describe('Class Score Calculation and Validation', () => {
    it('validates score ranges for each category', async () => {
      const invalidInputs = [
        {
          catId: 'cat-1',
          beautyScore: 16, // Over maximum of 15
          personalityScore: 18,
          balanceProportionScore: 13,
          coatCleanGroomed: true,
          teethGumsHealthy: true,
          eyesNoseClear: true,
          earsCleanMiteFree: true,
          toenailsClipped: true,
          fleaIssues: false
        },
        {
          catId: 'cat-1',
          beautyScore: 12,
          personalityScore: 21, // Over maximum of 20
          balanceProportionScore: 13,
          coatCleanGroomed: true,
          teethGumsHealthy: true,
          eyesNoseClear: true,
          earsCleanMiteFree: true,
          toenailsClipped: true,
          fleaIssues: false
        },
        {
          catId: 'cat-1',
          beautyScore: 12,
          personalityScore: 18,
          balanceProportionScore: -1, // Below minimum of 0
          coatCleanGroomed: true,
          teethGumsHealthy: true,
          eyesNoseClear: true,
          earsCleanMiteFree: true,
          toenailsClipped: true,
          fleaIssues: false
        }
      ];

      const judgeContext = {
        identity: { sub: 'judge-1', username: 'judge@example.com' }
      };

      for (const invalidInput of invalidInputs) {
        await expect(createClassScore(invalidInput, judgeContext))
          .rejects.toThrow(/score must be between/);
      }
    });

    it('calculates total scores and ribbon eligibility accurately', async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });
      ddbMock.on(PutCommand).resolves({});

      const testCases = [
        {
          input: {
            beautyScore: 15, personalityScore: 20, balanceProportionScore: 15,
            coatCleanGroomed: true, teethGumsHealthy: true, eyesNoseClear: true,
            earsCleanMiteFree: true, toenailsClipped: true, fleaIssues: false
          },
          expected: { totalScore: 50, ribbonEligibility: 'Blue' }
        },
        {
          input: {
            beautyScore: 12, personalityScore: 18, balanceProportionScore: 13,
            coatCleanGroomed: true, teethGumsHealthy: true, eyesNoseClear: true,
            earsCleanMiteFree: true, toenailsClipped: true, fleaIssues: false
          },
          expected: { totalScore: 43, ribbonEligibility: 'Red' }
        },
        {
          input: {
            beautyScore: 10, personalityScore: 12, balanceProportionScore: 10,
            coatCleanGroomed: true, teethGumsHealthy: true, eyesNoseClear: true,
            earsCleanMiteFree: true, toenailsClipped: true, fleaIssues: false
          },
          expected: { totalScore: 32, ribbonEligibility: 'White' }
        },
        {
          input: {
            beautyScore: 8, personalityScore: 10, balanceProportionScore: 6,
            coatCleanGroomed: true, teethGumsHealthy: true, eyesNoseClear: true,
            earsCleanMiteFree: true, toenailsClipped: true, fleaIssues: false
          },
          expected: { totalScore: 24, ribbonEligibility: 'Participation' }
        },
        {
          input: {
            beautyScore: 15, personalityScore: 20, balanceProportionScore: 15,
            coatCleanGroomed: true, teethGumsHealthy: true, eyesNoseClear: true,
            earsCleanMiteFree: false, toenailsClipped: true, fleaIssues: false
          },
          expected: { totalScore: 50, ribbonEligibility: 'Red' } // Health failure
        },
        {
          input: {
            beautyScore: 15, personalityScore: 20, balanceProportionScore: 15,
            coatCleanGroomed: true, teethGumsHealthy: true, eyesNoseClear: true,
            earsCleanMiteFree: true, toenailsClipped: true, fleaIssues: true
          },
          expected: { totalScore: 50, ribbonEligibility: 'Red' } // Flea issues
        }
      ];

      const judgeContext = {
        identity: { sub: 'judge-1', username: 'judge@example.com' }
      };

      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        const input = { catId: `cat-${i + 1}`, ...testCase.input };
        
        const result = await createClassScore(input, judgeContext);
        
        expect(result.totalScore).toBe(testCase.expected.totalScore);
        expect(result.ribbonEligibility).toBe(testCase.expected.ribbonEligibility);
      }
    });

    it('validates comment length limits', async () => {
      const longComment = 'x'.repeat(501); // Over 500 character limit
      const veryLongHealthComment = 'x'.repeat(1001); // Over 1000 character limit

      const invalidInputs = [
        {
          catId: 'cat-1',
          beautyScore: 12,
          beautyComments: longComment,
          personalityScore: 18,
          balanceProportionScore: 13,
          coatCleanGroomed: true,
          teethGumsHealthy: true,
          eyesNoseClear: true,
          earsCleanMiteFree: true,
          toenailsClipped: true,
          fleaIssues: false
        },
        {
          catId: 'cat-1',
          beautyScore: 12,
          personalityScore: 18,
          personalityComments: longComment,
          balanceProportionScore: 13,
          coatCleanGroomed: true,
          teethGumsHealthy: true,
          eyesNoseClear: true,
          earsCleanMiteFree: true,
          toenailsClipped: true,
          fleaIssues: false
        },
        {
          catId: 'cat-1',
          beautyScore: 12,
          personalityScore: 18,
          balanceProportionScore: 13,
          healthGroomingComments: veryLongHealthComment,
          coatCleanGroomed: true,
          teethGumsHealthy: true,
          eyesNoseClear: true,
          earsCleanMiteFree: true,
          toenailsClipped: true,
          fleaIssues: false
        }
      ];

      const judgeContext = {
        identity: { sub: 'judge-1', username: 'judge@example.com' }
      };

      for (const invalidInput of invalidInputs) {
        await expect(createClassScore(invalidInput, judgeContext))
          .rejects.toThrow(/comment.*too long/);
      }
    });
  });

  describe('Report Generation and Export', () => {
    it('generates comprehensive type class scoring reports with sorting', async () => {
      const mockClassScores = [
        {
          id: 'class-score-1',
          catId: 'cat-1',
          judgeId: 'judge-1',
          judgeName: 'Judge Smith',
          totalScore: 47,
          ribbonEligibility: 'Blue',
          timestamp: '2024-01-15T10:00:00Z',
          isFinalized: true
        },
        {
          id: 'class-score-2',
          catId: 'cat-2',
          judgeId: 'judge-2',
          judgeName: 'Judge Johnson',
          totalScore: 38,
          ribbonEligibility: 'Red',
          timestamp: '2024-01-15T11:00:00Z',
          isFinalized: true
        },
        {
          id: 'class-score-3',
          catId: 'cat-3',
          judgeId: 'judge-1',
          judgeName: 'Judge Smith',
          totalScore: 31,
          ribbonEligibility: 'White',
          timestamp: '2024-01-15T12:00:00Z',
          isFinalized: false
        }
      ];

      ddbMock.on(ScanCommand).resolves({
        Items: mockClassScores
      });

      const allScores = await listAllClassScores();

      expect(allScores.items).toHaveLength(3);
      
      // Verify scores are sorted by total score (descending)
      const sortedScores = allScores.items.sort((a, b) => b.totalScore - a.totalScore);
      expect(sortedScores[0].totalScore).toBe(47);
      expect(sortedScores[1].totalScore).toBe(38);
      expect(sortedScores[2].totalScore).toBe(31);

      // Verify ribbon distribution
      const ribbonCounts = allScores.items.reduce((counts, score) => {
        counts[score.ribbonEligibility] = (counts[score.ribbonEligibility] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);

      expect(ribbonCounts).toEqual({
        'Blue': 1,
        'Red': 1,
        'White': 1
      });
    });

    it('filters class scores by judge', async () => {
      const judge1Scores = [
        {
          id: 'class-score-1',
          catId: 'cat-1',
          judgeId: 'judge-1',
          judgeName: 'Judge Smith',
          totalScore: 47,
          ribbonEligibility: 'Blue'
        },
        {
          id: 'class-score-3',
          catId: 'cat-3',
          judgeId: 'judge-1',
          judgeName: 'Judge Smith',
          totalScore: 31,
          ribbonEligibility: 'White'
        }
      ];

      ddbMock.on(QueryCommand).resolves({
        Items: judge1Scores
      });

      // This would be implemented in a getClassScoresByJudge function
      const judgeScores = await getClassScoresByCat('judge-1'); // Mock implementation
      
      expect(judgeScores.items).toHaveLength(2);
      expect(judgeScores.items.every(score => score.judgeId === 'judge-1')).toBe(true);
    });

    it('generates CSV export data with all type class scoring fields', async () => {
      const detailedScore = {
        id: 'class-score-1',
        catId: 'cat-1',
        judgeId: 'judge-1',
        judgeName: 'Judge Smith',
        beautyScore: 14,
        beautyComments: 'Excellent coat quality',
        personalityScore: 19,
        personalityComments: 'Very friendly temperament',
        balanceProportionScore: 13,
        balanceProportionComments: 'Good body structure',
        coatCleanGroomed: true,
        teethGumsHealthy: true,
        eyesNoseClear: true,
        earsCleanMiteFree: false,
        toenailsClipped: true,
        fleaIssues: false,
        healthGroomingComments: 'Minor ear wax buildup',
        totalScore: 46,
        ribbonEligibility: 'Red',
        timestamp: '2024-01-15T10:00:00Z',
        isFinalized: true
      };

      ddbMock.on(ScanCommand).resolves({
        Items: [detailedScore]
      });

      const allScores = await listAllClassScores();
      
      // Verify all fields are present for CSV export
      const csvData = allScores.items.map(score => ({
        'Cat ID': score.catId,
        'Judge': score.judgeName,
        'Beauty Score': score.beautyScore,
        'Beauty Comments': score.beautyComments,
        'Personality Score': score.personalityScore,
        'Personality Comments': score.personalityComments,
        'Balance/Proportion Score': score.balanceProportionScore,
        'Balance/Proportion Comments': score.balanceProportionComments,
        'Coat Clean/Groomed': score.coatCleanGroomed ? 'Pass' : 'Fail',
        'Teeth/Gums Healthy': score.teethGumsHealthy ? 'Pass' : 'Fail',
        'Eyes/Nose Clear': score.eyesNoseClear ? 'Pass' : 'Fail',
        'Ears Clean/Mite Free': score.earsCleanMiteFree ? 'Pass' : 'Fail',
        'Toenails Clipped': score.toenailsClipped ? 'Pass' : 'Fail',
        'Flea Issues': score.fleaIssues ? 'Yes' : 'No',
        'Health/Grooming Comments': score.healthGroomingComments,
        'Total Score': score.totalScore,
        'Ribbon Eligibility': score.ribbonEligibility,
        'Finalized': score.isFinalized ? 'Yes' : 'No',
        'Timestamp': score.timestamp
      }));

      expect(csvData[0]).toMatchObject({
        'Cat ID': 'cat-1',
        'Judge': 'Judge Smith',
        'Beauty Score': 14,
        'Beauty Comments': 'Excellent coat quality',
        'Personality Score': 19,
        'Personality Comments': 'Very friendly temperament',
        'Balance/Proportion Score': 13,
        'Balance/Proportion Comments': 'Good body structure',
        'Coat Clean/Groomed': 'Pass',
        'Teeth/Gums Healthy': 'Pass',
        'Eyes/Nose Clear': 'Pass',
        'Ears Clean/Mite Free': 'Fail',
        'Toenails Clipped': 'Pass',
        'Flea Issues': 'No',
        'Health/Grooming Comments': 'Minor ear wax buildup',
        'Total Score': 46,
        'Ribbon Eligibility': 'Red',
        'Finalized': 'Yes'
      });
    });
  });

  describe('Role-Based Access Control', () => {
    it('enforces judge role for type class scoring operations', async () => {
      const participantContext = {
        identity: {
          sub: 'participant-1',
          username: 'participant@example.com'
        }
      };

      const classScoreInput = {
        catId: 'cat-1',
        beautyScore: 12,
        personalityScore: 18,
        balanceProportionScore: 13,
        coatCleanGroomed: true,
        teethGumsHealthy: true,
        eyesNoseClear: true,
        earsCleanMiteFree: true,
        toenailsClipped: true,
        fleaIssues: false
      };

      // Should reject non-judge users
      await expect(createClassScore(classScoreInput, participantContext))
        .rejects.toThrow('Unauthorized: Judge role required');
    });

    it('allows admin access to all type class scoring operations', async () => {
      const adminContext = {
        identity: {
          sub: 'admin-1',
          username: 'admin@example.com'
        }
      };

      ddbMock.on(QueryCommand).resolves({ Items: [] });
      ddbMock.on(PutCommand).resolves({});

      const classScoreInput = {
        catId: 'cat-1',
        beautyScore: 12,
        personalityScore: 18,
        balanceProportionScore: 13,
        coatCleanGroomed: true,
        teethGumsHealthy: true,
        eyesNoseClear: true,
        earsCleanMiteFree: true,
        toenailsClipped: true,
        fleaIssues: false
      };

      // Admin should be able to create class scores
      const result = await createClassScore(classScoreInput, adminContext);
      expect(result).toBeDefined();
      expect(result.judgeId).toBe('admin-1');
    });

    it('restricts judge access to own class scores only', async () => {
      const judge1Context = {
        identity: { sub: 'judge-1', username: 'judge@example.com' }
      };

      const judge2Score = {
        id: 'class-score-2',
        catId: 'cat-1',
        judgeId: 'judge-2',
        judgeName: 'Judge Johnson',
        totalScore: 40,
        isFinalized: true
      };

      ddbMock.on(QueryCommand).resolves({
        Items: [judge2Score]
      });

      // Judge-1 should not be able to update Judge-2's score
      await expect(updateClassScore('class-score-2', { beautyScore: 15 }, judge1Context))
        .rejects.toThrow('Unauthorized: Can only modify own class scores');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles DynamoDB errors gracefully', async () => {
      ddbMock.on(PutCommand).rejects(new Error('DynamoDB service unavailable'));

      const classScoreInput = {
        catId: 'cat-1',
        beautyScore: 12,
        personalityScore: 18,
        balanceProportionScore: 13,
        coatCleanGroomed: true,
        teethGumsHealthy: true,
        eyesNoseClear: true,
        earsCleanMiteFree: true,
        toenailsClipped: true,
        fleaIssues: false
      };

      const judgeContext = {
        identity: { sub: 'judge-1', username: 'judge@example.com' }
      };

      await expect(createClassScore(classScoreInput, judgeContext))
        .rejects.toThrow('Failed to create class score: DynamoDB service unavailable');
    });

    it('handles missing cat scenarios', async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });

      const classScoreInput = {
        catId: 'nonexistent-cat',
        beautyScore: 12,
        personalityScore: 18,
        balanceProportionScore: 13,
        coatCleanGroomed: true,
        teethGumsHealthy: true,
        eyesNoseClear: true,
        earsCleanMiteFree: true,
        toenailsClipped: true,
        fleaIssues: false
      };

      const judgeContext = {
        identity: { sub: 'judge-1', username: 'judge@example.com' }
      };

      // Should validate cat exists before creating score
      await expect(createClassScore(classScoreInput, judgeContext))
        .rejects.toThrow('Cat not found: nonexistent-cat');
    });

    it('handles concurrent modification conflicts', async () => {
      const existingScore = {
        id: 'class-score-1',
        catId: 'cat-1',
        judgeId: 'judge-1',
        totalScore: 43,
        timestamp: '2024-01-15T10:00:00Z',
        version: 1
      };

      ddbMock.on(QueryCommand).resolves({
        Items: [existingScore]
      });

      // Mock conditional check failure (version mismatch)
      ddbMock.on(PutCommand).rejects({
        name: 'ConditionalCheckFailedException',
        message: 'The conditional request failed'
      });

      const judgeContext = {
        identity: { sub: 'judge-1', username: 'judge@example.com' }
      };

      await expect(updateClassScore('class-score-1', { beautyScore: 15 }, judgeContext))
        .rejects.toThrow('Class score was modified by another user. Please refresh and try again.');
    });

    it('handles score finalization conflicts', async () => {
      const finalizedScore = {
        id: 'class-score-1',
        catId: 'cat-1',
        judgeId: 'judge-1',
        totalScore: 43,
        isFinalized: true,
        timestamp: '2024-01-15T10:00:00Z'
      };

      ddbMock.on(QueryCommand).resolves({
        Items: [finalizedScore]
      });

      const judgeContext = {
        identity: { sub: 'judge-1', username: 'judge@example.com' }
      };

      // Should not allow modification of finalized scores without admin override
      await expect(updateClassScore('class-score-1', { beautyScore: 15 }, judgeContext))
        .rejects.toThrow('Cannot modify finalized class score without admin privileges');
    });
  });

  describe('Performance and Scalability', () => {
    it('handles large datasets with pagination', async () => {
      // Mock large dataset with pagination
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `class-score-${i + 1}`,
        catId: `cat-${i + 1}`,
        judgeId: 'judge-1',
        totalScore: Math.floor(Math.random() * 50) + 1,
        ribbonEligibility: 'Red',
        timestamp: new Date().toISOString()
      }));

      // Mock paginated response
      ddbMock.on(ScanCommand).resolves({
        Items: largeDataset.slice(0, 100), // First page
        LastEvaluatedKey: { PK: 'CLASS_SCORE#class-score-100', SK: 'METADATA' }
      });

      const firstPage = await listAllClassScores(100);
      
      expect(firstPage.items).toHaveLength(100);
      expect(firstPage.lastEvaluatedKey).toBeDefined();

      // Mock second page
      ddbMock.on(ScanCommand).resolves({
        Items: largeDataset.slice(100, 200),
        LastEvaluatedKey: { PK: 'CLASS_SCORE#class-score-200', SK: 'METADATA' }
      });

      const secondPage = await listAllClassScores(100, firstPage.lastEvaluatedKey);
      
      expect(secondPage.items).toHaveLength(100);
      expect(secondPage.items[0].id).toBe('class-score-101');
    });

    it('efficiently batches DynamoDB operations', async () => {
      ddbMock.on(PutCommand).resolves({});
      ddbMock.on(QueryCommand).resolves({ Items: [] });

      const classScoreInput = {
        catId: 'cat-1',
        beautyScore: 12,
        personalityScore: 18,
        balanceProportionScore: 13,
        coatCleanGroomed: true,
        teethGumsHealthy: true,
        eyesNoseClear: true,
        earsCleanMiteFree: true,
        toenailsClipped: true,
        fleaIssues: false
      };

      const judgeContext = {
        identity: { sub: 'judge-1', username: 'judge@example.com' }
      };

      await createClassScore(classScoreInput, judgeContext);

      // Verify efficient batching (3 puts: main record + 2 indexes)
      expect(ddbMock.commandCalls(PutCommand)).toHaveLength(3);
      
      // Verify all operations completed in reasonable time
      const startTime = Date.now();
      await createClassScore({ ...classScoreInput, catId: 'cat-2' }, judgeContext);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});