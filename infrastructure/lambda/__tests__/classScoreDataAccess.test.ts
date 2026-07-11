/**
 * Unit tests for ClassScoreDataAccess
 */

import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { ClassScoreDataAccess, CreateClassScoreInput, UpdateClassScoreInput } from '../classScoreDataAccess';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('ClassScoreDataAccess', () => {
  let classScoreDataAccess: ClassScoreDataAccess;
  const tableName = 'test-table';

  beforeEach(() => {
    ddbMock.reset();
    const docClient = ddbMock as unknown as DynamoDBDocumentClient;
    classScoreDataAccess = new ClassScoreDataAccess(docClient, tableName);
  });

  describe('createClassScore', () => {
    const validInput: CreateClassScoreInput = {
      catId: 'cat-123',
      judgeId: 'judge-456',
      judgeName: 'Judge Smith',
      beautyScore: 12,
      beautyComments: 'Beautiful cat',
      personalityScore: 18,
      personalityComments: 'Very friendly',
      balanceProportionScore: 13,
      balanceProportionComments: 'Well proportioned',
      coatCleanGroomed: true,
      teethGumsHealthy: true,
      eyesNoseClear: true,
      earsCleanMiteFree: true,
      toenailsClipped: true,
      fleaIssues: false,
      healthGroomingComments: 'Cat appears healthy',
      isFinalized: false
    };

    it('should create a class score with correct total and ribbon eligibility', async () => {
      ddbMock.on(PutCommand).resolves({});

      const result = await classScoreDataAccess.createClassScore(validInput);

      expect(result.catId).toBe('cat-123');
      expect(result.judgeId).toBe('judge-456');
      expect(result.judgeName).toBe('Judge Smith');
      expect(result.totalScore).toBe(43); // 12 + 18 + 13
      expect(result.ribbonEligibility).toBe('Red'); // 43 points with all health passed
      expect(result.isFinalized).toBe(false);
      expect(result.id).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should calculate Blue ribbon for high scores with all health passed', async () => {
      const highScoreInput = {
        ...validInput,
        beautyScore: 15,
        personalityScore: 20,
        balanceProportionScore: 12
      };
      ddbMock.on(PutCommand).resolves({});

      const result = await classScoreDataAccess.createClassScore(highScoreInput);

      expect(result.totalScore).toBe(47);
      expect(result.ribbonEligibility).toBe('Blue');
    });

    it('should calculate Red ribbon when health fails regardless of score', async () => {
      const healthFailInput = {
        ...validInput,
        beautyScore: 15,
        personalityScore: 20,
        balanceProportionScore: 15,
        fleaIssues: true
      };
      ddbMock.on(PutCommand).resolves({});

      const result = await classScoreDataAccess.createClassScore(healthFailInput);

      expect(result.totalScore).toBe(50);
      expect(result.ribbonEligibility).toBe('Red'); // Flea issues override high score
    });

    it('should calculate White ribbon for lower scores', async () => {
      const lowerScoreInput = {
        ...validInput,
        beautyScore: 10,
        personalityScore: 12,
        balanceProportionScore: 8
      };
      ddbMock.on(PutCommand).resolves({});

      const result = await classScoreDataAccess.createClassScore(lowerScoreInput);

      expect(result.totalScore).toBe(30);
      expect(result.ribbonEligibility).toBe('White');
    });

    it('should calculate Participation ribbon for very low scores', async () => {
      const veryLowScoreInput = {
        ...validInput,
        beautyScore: 5,
        personalityScore: 8,
        balanceProportionScore: 7
      };
      ddbMock.on(PutCommand).resolves({});

      const result = await classScoreDataAccess.createClassScore(veryLowScoreInput);

      expect(result.totalScore).toBe(20);
      expect(result.ribbonEligibility).toBe('Participation');
    });

    it('should store records in correct DynamoDB patterns', async () => {
      ddbMock.on(PutCommand).resolves({});

      await classScoreDataAccess.createClassScore(validInput);

      // Should make 4 PutCommand calls: main record, cat index, judge index, audit entry
      expect(ddbMock.commandCalls(PutCommand)).toHaveLength(4);

      const calls = ddbMock.commandCalls(PutCommand);

      // Main record
      expect(calls[0].args[0].input.Item?.PK).toMatch(/^CLASS_SCORE#/);
      expect(calls[0].args[0].input.Item?.SK).toBe('METADATA');

      // Cat index
      expect(calls[1].args[0].input.Item?.PK).toBe('CAT#cat-123');
      expect(calls[1].args[0].input.Item?.SK).toMatch(/^CLASS_SCORE#/);

      // Judge index
      expect(calls[2].args[0].input.Item?.PK).toBe('JUDGE#judge-456');
      expect(calls[2].args[0].input.Item?.SK).toMatch(/^CLASS_SCORE#/);

      // Audit entry
      expect(calls[3].args[0].input.Item?.PK).toMatch(/^CLASS_SCORE_AUDIT#/);
      expect(calls[3].args[0].input.Item?.SK).toMatch(/^ENTRY#/);
    });
  });

  describe('getClassScore', () => {
    it('should return null when class score not found', async () => {
      ddbMock.on(GetCommand).resolves({});

      const result = await classScoreDataAccess.getClassScore('nonexistent-id');

      expect(result).toBeNull();
    });

    it('should return class score when found', async () => {
      const mockItem = {
        id: 'score-123',
        catId: 'cat-123',
        judgeId: 'judge-456',
        judgeName: 'Judge Smith',
        beautyScore: '12',
        beautyComments: 'Beautiful cat',
        personalityScore: '18',
        personalityComments: 'Very friendly',
        balanceProportionScore: '13',
        balanceProportionComments: 'Well proportioned',
        coatCleanGroomed: true,
        teethGumsHealthy: true,
        eyesNoseClear: true,
        earsCleanMiteFree: true,
        toenailsClipped: true,
        fleaIssues: false,
        healthGroomingComments: 'Cat appears healthy',
        totalScore: '43',
        ribbonEligibility: 'Red',
        timestamp: '2023-01-01T00:00:00.000Z',
        isFinalized: false
      };
      ddbMock.on(GetCommand).resolves({ Item: mockItem });

      const result = await classScoreDataAccess.getClassScore('score-123');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('score-123');
      expect(result!.totalScore).toBe(43);
      expect(result!.ribbonEligibility).toBe('Red');
    });
  });

  describe('updateClassScore', () => {
    const existingScore = {
      id: 'score-123',
      catId: 'cat-123',
      judgeId: 'judge-456',
      judgeName: 'Judge Smith',
      beautyScore: 12,
      beautyComments: 'Beautiful cat',
      personalityScore: 18,
      personalityComments: 'Very friendly',
      balanceProportionScore: 13,
      balanceProportionComments: 'Well proportioned',
      coatCleanGroomed: true,
      teethGumsHealthy: true,
      eyesNoseClear: true,
      earsCleanMiteFree: true,
      toenailsClipped: true,
      fleaIssues: false,
      healthGroomingComments: 'Cat appears healthy',
      totalScore: 43,
      ribbonEligibility: 'Red',
      timestamp: '2023-01-01T00:00:00.000Z',
      isFinalized: false
    };

    it('should throw error when class score not found', async () => {
      ddbMock.on(GetCommand).resolves({});

      await expect(
        classScoreDataAccess.updateClassScore('nonexistent-id', {}, 'tester')
      ).rejects.toThrow('Class score not found');
    });

    it('should update class score and recalculate totals', async () => {
      // Mock getClassScore call
      ddbMock.on(GetCommand).resolves({
        Item: {
          ...existingScore,
          beautyScore: '12',
          personalityScore: '18',
          balanceProportionScore: '13',
          totalScore: '43'
        }
      });
      
      // Mock update calls
      ddbMock.on(UpdateCommand).resolves({});
      ddbMock.on(PutCommand).resolves({});

      const updateInput: UpdateClassScoreInput = {
        beautyScore: 15,
        personalityScore: 20
      };

      const result = await classScoreDataAccess.updateClassScore('score-123', updateInput, 'tester');

      expect(result.beautyScore).toBe(15);
      expect(result.personalityScore).toBe(20);
      expect(result.totalScore).toBe(48); // 15 + 20 + 13
      expect(result.ribbonEligibility).toBe('Blue'); // High score with health passed
    });

    it('should update ribbon eligibility when health status changes', async () => {
      // Mock getClassScore call
      ddbMock.on(GetCommand).resolves({
        Item: {
          ...existingScore,
          beautyScore: '15',
          personalityScore: '20',
          balanceProportionScore: '15',
          totalScore: '50'
        }
      });
      
      // Mock update calls
      ddbMock.on(UpdateCommand).resolves({});
      ddbMock.on(PutCommand).resolves({});

      const updateInput: UpdateClassScoreInput = {
        fleaIssues: true // This should force Red ribbon
      };

      const result = await classScoreDataAccess.updateClassScore('score-123', updateInput, 'tester');

      expect(result.totalScore).toBe(50);
      expect(result.ribbonEligibility).toBe('Red'); // Flea issues override high score
    });
  });

  describe('deleteClassScore', () => {
    it('should throw error when class score not found', async () => {
      ddbMock.on(GetCommand).resolves({});

      await expect(
        classScoreDataAccess.deleteClassScore('nonexistent-id')
      ).rejects.toThrow('Class score not found');
    });

    it('should delete class score and all index records', async () => {
      const existingScore = {
        id: 'score-123',
        catId: 'cat-123',
        judgeId: 'judge-456',
        judgeName: 'Judge Smith',
        beautyScore: '12',
        personalityScore: '18',
        balanceProportionScore: '13',
        totalScore: '43'
      };
      
      ddbMock.on(GetCommand).resolves({ Item: existingScore });
      ddbMock.on(DeleteCommand).resolves({});

      const result = await classScoreDataAccess.deleteClassScore('score-123');

      expect(result.id).toBe('score-123');
      
      // Should make 3 DeleteCommand calls (main, cat index, judge index)
      expect(ddbMock.commandCalls(DeleteCommand)).toHaveLength(3);
    });
  });

  describe('getClassScoresByCat', () => {
    it('should return empty array when no class scores found', async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });

      const result = await classScoreDataAccess.getClassScoresByCat('cat-123');

      expect(result).toEqual([]);
    });

    it('should return class scores for cat', async () => {
      const mockIndexItems = [
        { classScoreId: 'score-1' },
        { classScoreId: 'score-2' }
      ];
      
      ddbMock.on(QueryCommand).resolves({ Items: mockIndexItems });
      
      // Mock individual getClassScore calls
      ddbMock.on(GetCommand)
        .resolvesOnce({ Item: { id: 'score-1', catId: 'cat-123', totalScore: '40' } })
        .resolvesOnce({ Item: { id: 'score-2', catId: 'cat-123', totalScore: '45' } });

      const result = await classScoreDataAccess.getClassScoresByCat('cat-123');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('score-1');
      expect(result[1].id).toBe('score-2');
    });
  });

  describe('getClassScoresByJudge', () => {
    it('should return empty array when no class scores found', async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });

      const result = await classScoreDataAccess.getClassScoresByJudge('judge-456');

      expect(result).toEqual([]);
    });

    it('should return class scores for judge', async () => {
      const mockIndexItems = [
        { classScoreId: 'score-1' },
        { classScoreId: 'score-2' }
      ];
      
      ddbMock.on(QueryCommand).resolves({ Items: mockIndexItems });
      
      // Mock individual getClassScore calls
      ddbMock.on(GetCommand)
        .resolvesOnce({ Item: { id: 'score-1', judgeId: 'judge-456', totalScore: '40' } })
        .resolvesOnce({ Item: { id: 'score-2', judgeId: 'judge-456', totalScore: '45' } });

      const result = await classScoreDataAccess.getClassScoresByJudge('judge-456');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('score-1');
      expect(result[1].id).toBe('score-2');
    });
  });

  describe('getClassScoresByCage', () => {
    it('should return empty array when cat not found', async () => {
      ddbMock.on(ScanCommand).resolves({ Items: [] });

      const result = await classScoreDataAccess.getClassScoresByCage(123);

      expect(result).toEqual([]);
    });

    it('should return class scores for cage number', async () => {
      // Mock finding cat by cage number
      ddbMock.on(ScanCommand).resolves({
        Items: [{ PK: 'CAT#cat-123', cageNumber: 123 }]
      });
      
      // Mock getting class scores by cat
      ddbMock.on(QueryCommand).resolves({
        Items: [{ classScoreId: 'score-1' }]
      });
      
      // Mock individual getClassScore call
      ddbMock.on(GetCommand).resolves({
        Item: { id: 'score-1', catId: 'cat-123', totalScore: '40' }
      });

      const result = await classScoreDataAccess.getClassScoresByCage(123);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('score-1');
    });
  });

  describe('listAllClassScores', () => {
    it('should return empty array when no class scores exist', async () => {
      ddbMock.on(ScanCommand).resolves({ Items: [] });

      const result = await classScoreDataAccess.listAllClassScores();

      expect(result).toEqual([]);
    });

    it('should return all class scores', async () => {
      const mockItems = [
        {
          id: 'score-1',
          catId: 'cat-123',
          judgeId: 'judge-456',
          judgeName: 'Judge Smith',
          beautyScore: '12',
          personalityScore: '18',
          balanceProportionScore: '13',
          totalScore: '43',
          ribbonEligibility: 'Red',
          timestamp: '2023-01-01T00:00:00.000Z',
          isFinalized: false
        },
        {
          id: 'score-2',
          catId: 'cat-456',
          judgeId: 'judge-789',
          judgeName: 'Judge Jones',
          beautyScore: '15',
          personalityScore: '20',
          balanceProportionScore: '15',
          totalScore: '50',
          ribbonEligibility: 'Blue',
          timestamp: '2023-01-02T00:00:00.000Z',
          isFinalized: true
        }
      ];
      
      ddbMock.on(ScanCommand).resolves({ Items: mockItems });

      const result = await classScoreDataAccess.listAllClassScores();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('score-1');
      expect(result[0].totalScore).toBe(43);
      expect(result[1].id).toBe('score-2');
      expect(result[1].totalScore).toBe(50);
    });
  });
});