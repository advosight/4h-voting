import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { ScoreDataAccess, CreateScoreInput, UpdateScoreInput } from '../scoreDataAccess';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('ScoreDataAccess', () => {
  let scoreDataAccess: ScoreDataAccess;
  const tableName = 'test-table';

  beforeEach(() => {
    ddbMock.reset();
    const docClient = ddbMock as unknown as DynamoDBDocumentClient;
    scoreDataAccess = new ScoreDataAccess(docClient, tableName);
  });

  describe('createScore', () => {
    it('should create a score with all required records', async () => {
      const input: CreateScoreInput = {
        catId: 'cat-123',
        judgeId: 'judge-456',
        judgeName: 'Judge Smith',
        firstImpressionScore: 20,
        firstImpressionComments: 'Clean cage',
        originalityScore: 22,
        originalityComments: 'Healthy cat',
        informationCardScore: 18,
        informationCardComments: 'Well groomed',
        workDoneByMemberScore: 23,
        workDoneByMemberComments: 'Excellent presentation',
        basicComfortScore: 0,
        safetyScore: 0,
        easyViewOfCatScore: 0,
        isFinalized: false,
      };

      ddbMock.on(PutCommand).resolves({});

      const result = await scoreDataAccess.createScore(input);

      expect(result).toMatchObject({
        catId: 'cat-123',
        judgeId: 'judge-456',
        judgeName: 'Judge Smith',
        firstImpressionScore: 20,
        originalityScore: 22,
        informationCardScore: 18,
        workDoneByMemberScore: 23,
        totalScore: 83, // 20 + 22 + 18 + 23
        isFinalized: false,
      });

      expect(result.id).toBeDefined();
      expect(result.timestamp).toBeDefined();

      // Verify four PutCommand calls were made (main record + 2 index records + audit entry)
      expect(ddbMock.commandCalls(PutCommand)).toHaveLength(4);
    });

    it('should calculate total score correctly', async () => {
      const input: CreateScoreInput = {
        catId: 'cat-123',
        judgeId: 'judge-456',
        judgeName: 'Judge Smith',
        firstImpressionScore: 25,
        originalityScore: 25,
        informationCardScore: 25,
        workDoneByMemberScore: 25,
        basicComfortScore: 0,
        safetyScore: 0,
        easyViewOfCatScore: 0,
      };

      ddbMock.on(PutCommand).resolves({});

      const result = await scoreDataAccess.createScore(input);

      expect(result.totalScore).toBe(100);
    });

    it('should default isFinalized to false when not provided', async () => {
      const input: CreateScoreInput = {
        catId: 'cat-123',
        judgeId: 'judge-456',
        judgeName: 'Judge Smith',
        firstImpressionScore: 20,
        originalityScore: 20,
        informationCardScore: 20,
        workDoneByMemberScore: 20,
        basicComfortScore: 0,
        safetyScore: 0,
        easyViewOfCatScore: 0,
      };

      ddbMock.on(PutCommand).resolves({});

      const result = await scoreDataAccess.createScore(input);

      expect(result.isFinalized).toBe(false);
    });
  });

  describe('getScore', () => {
    it('should return a score when found', async () => {
      const mockScore = {
        id: 'score-123',
        catId: 'cat-123',
        judgeId: 'judge-456',
        judgeName: 'Judge Smith',
        firstImpressionScore: 20,
        firstImpressionComments: 'Clean cage',
        originalityScore: 22,
        originalityComments: 'Healthy cat',
        informationCardScore: 18,
        informationCardComments: 'Well groomed',
        workDoneByMemberScore: 23,
        workDoneByMemberComments: 'Excellent presentation',
        basicComfortScore: 0,
        basicComfortComments: undefined,
        safetyScore: 0,
        safetyComments: undefined,
        easyViewOfCatScore: 0,
        easyViewOfCatComments: undefined,
        totalScore: 83,
        timestamp: '2024-01-01T00:00:00.000Z',
        isFinalized: false,
        modificationCount: 0,
        lastModifiedBy: undefined,
        lastModifiedAt: undefined,
      };

      ddbMock.on(GetCommand).resolves({ Item: mockScore });

      const result = await scoreDataAccess.getScore('score-123');

      expect(result).toEqual(mockScore);
      expect(ddbMock.commandCalls(GetCommand)[0].args[0].input).toEqual({
        TableName: tableName,
        Key: { PK: 'SCORE#score-123', SK: 'METADATA' },
      });
    });

    it('should return null when score not found', async () => {
      ddbMock.on(GetCommand).resolves({});

      const result = await scoreDataAccess.getScore('nonexistent-score');

      expect(result).toBeNull();
    });
  });

  describe('updateScore', () => {
    const existingScore = {
      id: 'score-123',
      catId: 'cat-123',
      judgeId: 'judge-456',
      judgeName: 'Judge Smith',
      firstImpressionScore: 20,
      firstImpressionComments: 'Clean cage',
      originalityScore: 22,
      originalityComments: 'Healthy cat',
      informationCardScore: 18,
      informationCardComments: 'Well groomed',
      workDoneByMemberScore: 23,
      workDoneByMemberComments: 'Excellent presentation',
      totalScore: 83,
      timestamp: '2024-01-01T00:00:00.000Z',
      isFinalized: false,
      modificationCount: 0,
      lastModifiedBy: undefined,
      lastModifiedAt: undefined,
    };

    it('should update score and recalculate total', async () => {
      ddbMock.on(GetCommand).resolves({ Item: existingScore });
      ddbMock.on(PutCommand).resolves({});

      const updateInput: UpdateScoreInput = {
        firstImpressionScore: 25,
        isFinalized: true,
      };

      const result = await scoreDataAccess.updateScore('score-123', updateInput);

      expect(result.firstImpressionScore).toBe(25);
      expect(result.totalScore).toBe(88); // 25 + 22 + 18 + 23
      expect(result.isFinalized).toBe(true);
      expect(result.timestamp).not.toBe(existingScore.timestamp); // Should be updated

      // Main record is updated via UpdateCommand (optimistic locking); PutCommand is used
      // only for the 2 index records + audit entry.
      expect(ddbMock.commandCalls(PutCommand)).toHaveLength(3);
    });

    it('should throw error when score not found', async () => {
      ddbMock.on(GetCommand).resolves({});

      await expect(
        scoreDataAccess.updateScore('nonexistent-score', { firstImpressionScore: 25 })
      ).rejects.toThrow('Score not found');
    });
  });

  describe('deleteScore', () => {
    const existingScore = {
      id: 'score-123',
      catId: 'cat-123',
      judgeId: 'judge-456',
      judgeName: 'Judge Smith',
      firstImpressionScore: 20,
      firstImpressionComments: undefined,
      originalityScore: 22,
      originalityComments: undefined,
      informationCardScore: 18,
      informationCardComments: undefined,
      workDoneByMemberScore: 23,
      workDoneByMemberComments: undefined,
      basicComfortScore: 0,
      basicComfortComments: undefined,
      safetyScore: 0,
      safetyComments: undefined,
      easyViewOfCatScore: 0,
      easyViewOfCatComments: undefined,
      totalScore: 83,
      timestamp: '2024-01-01T00:00:00.000Z',
      isFinalized: false,
      modificationCount: 0,
      lastModifiedBy: undefined,
      lastModifiedAt: undefined,
    };

    it('should delete score and all index records', async () => {
      ddbMock.on(GetCommand).resolves({ Item: existingScore });
      ddbMock.on(DeleteCommand).resolves({});

      const result = await scoreDataAccess.deleteScore('score-123');

      expect(result).toEqual(existingScore);

      // Verify three DeleteCommand calls were made (main record + 2 index records)
      expect(ddbMock.commandCalls(DeleteCommand)).toHaveLength(3);
      
      const deleteCalls = ddbMock.commandCalls(DeleteCommand);
      expect(deleteCalls[0].args[0].input.Key).toEqual({ PK: 'SCORE#score-123', SK: 'METADATA' });
      expect(deleteCalls[1].args[0].input.Key).toEqual({ PK: 'CAT#cat-123', SK: 'SCORE#score-123' });
      expect(deleteCalls[2].args[0].input.Key).toEqual({ PK: 'JUDGE#judge-456', SK: 'SCORE#score-123' });
    });

    it('should throw error when score not found', async () => {
      ddbMock.on(GetCommand).resolves({});

      await expect(
        scoreDataAccess.deleteScore('nonexistent-score')
      ).rejects.toThrow('Score not found');
    });
  });

  describe('getScoresByCat', () => {
    it('should return scores for a specific cat', async () => {
      const indexItems = [
        { scoreId: 'score-1', judgeId: 'judge-1', totalScore: 85 },
        { scoreId: 'score-2', judgeId: 'judge-2', totalScore: 90 },
      ];

      const score1 = {
        id: 'score-1',
        catId: 'cat-123',
        judgeId: 'judge-1',
        judgeName: 'Judge A',
        firstImpressionScore: 20,
        firstImpressionComments: undefined,
        originalityScore: 22,
        originalityComments: undefined,
        informationCardScore: 18,
        informationCardComments: undefined,
        workDoneByMemberScore: 25,
        workDoneByMemberComments: undefined,
        basicComfortScore: 0,
        basicComfortComments: undefined,
        safetyScore: 0,
        safetyComments: undefined,
        easyViewOfCatScore: 0,
        easyViewOfCatComments: undefined,
        totalScore: 85,
        timestamp: '2024-01-01T00:00:00.000Z',
        isFinalized: true,
        modificationCount: 0,
        lastModifiedBy: undefined,
        lastModifiedAt: undefined,
      };

      const score2 = {
        id: 'score-2',
        catId: 'cat-123',
        judgeId: 'judge-2',
        judgeName: 'Judge B',
        firstImpressionScore: 22,
        firstImpressionComments: undefined,
        originalityScore: 23,
        originalityComments: undefined,
        informationCardScore: 20,
        informationCardComments: undefined,
        workDoneByMemberScore: 25,
        workDoneByMemberComments: undefined,
        basicComfortScore: 0,
        basicComfortComments: undefined,
        safetyScore: 0,
        safetyComments: undefined,
        easyViewOfCatScore: 0,
        easyViewOfCatComments: undefined,
        totalScore: 90,
        timestamp: '2024-01-01T01:00:00.000Z',
        isFinalized: true,
        modificationCount: 0,
        lastModifiedBy: undefined,
        lastModifiedAt: undefined,
      };

      ddbMock.on(QueryCommand).resolves({ Items: indexItems });
      ddbMock.on(GetCommand)
        .resolvesOnce({ Item: score1 })
        .resolvesOnce({ Item: score2 });

      const result = await scoreDataAccess.getScoresByCat('cat-123');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(score1);
      expect(result[1]).toEqual(score2);

      expect(ddbMock.commandCalls(QueryCommand)[0].args[0].input).toEqual({
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': 'CAT#cat-123',
          ':sk': 'SCORE#',
        },
      });
    });

    it('should return empty array when no scores found', async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });

      const result = await scoreDataAccess.getScoresByCat('cat-123');

      expect(result).toEqual([]);
    });
  });

  describe('getScoresByJudge', () => {
    it('should return scores for a specific judge', async () => {
      const indexItems = [
        { scoreId: 'score-1', catId: 'cat-1', totalScore: 85 },
        { scoreId: 'score-2', catId: 'cat-2', totalScore: 90 },
      ];

      const score1 = {
        id: 'score-1',
        catId: 'cat-1',
        judgeId: 'judge-456',
        judgeName: 'Judge Smith',
        firstImpressionScore: 20,
        firstImpressionComments: undefined,
        originalityScore: 22,
        originalityComments: undefined,
        informationCardScore: 18,
        informationCardComments: undefined,
        workDoneByMemberScore: 25,
        workDoneByMemberComments: undefined,
        basicComfortScore: 0,
        basicComfortComments: undefined,
        safetyScore: 0,
        safetyComments: undefined,
        easyViewOfCatScore: 0,
        easyViewOfCatComments: undefined,
        totalScore: 85,
        timestamp: '2024-01-01T00:00:00.000Z',
        isFinalized: true,
        modificationCount: 0,
        lastModifiedBy: undefined,
        lastModifiedAt: undefined,
      };

      const score2 = {
        id: 'score-2',
        catId: 'cat-2',
        judgeId: 'judge-456',
        judgeName: 'Judge Smith',
        firstImpressionScore: 22,
        firstImpressionComments: undefined,
        originalityScore: 23,
        originalityComments: undefined,
        informationCardScore: 20,
        informationCardComments: undefined,
        workDoneByMemberScore: 25,
        workDoneByMemberComments: undefined,
        basicComfortScore: 0,
        basicComfortComments: undefined,
        safetyScore: 0,
        safetyComments: undefined,
        easyViewOfCatScore: 0,
        easyViewOfCatComments: undefined,
        totalScore: 90,
        timestamp: '2024-01-01T01:00:00.000Z',
        isFinalized: true,
        modificationCount: 0,
        lastModifiedBy: undefined,
        lastModifiedAt: undefined,
      };

      ddbMock.on(QueryCommand).resolves({ Items: indexItems });
      ddbMock.on(GetCommand)
        .resolvesOnce({ Item: score1 })
        .resolvesOnce({ Item: score2 });

      const result = await scoreDataAccess.getScoresByJudge('judge-456');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(score1);
      expect(result[1]).toEqual(score2);

      expect(ddbMock.commandCalls(QueryCommand)[0].args[0].input).toEqual({
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': 'JUDGE#judge-456',
          ':sk': 'SCORE#',
        },
      });
    });
  });

  describe('getScoresByCage', () => {
    it('should return scores for a specific cage number', async () => {
      const catItems = [
        { PK: 'CAT#cat-123', cageNumber: 5, name: 'Fluffy' },
      ];

      const indexItems = [
        { scoreId: 'score-1', judgeId: 'judge-1', totalScore: 85 },
      ];

      const score1 = {
        id: 'score-1',
        catId: 'cat-123',
        judgeId: 'judge-1',
        judgeName: 'Judge A',
        firstImpressionScore: 20,
        firstImpressionComments: undefined,
        originalityScore: 22,
        originalityComments: undefined,
        informationCardScore: 18,
        informationCardComments: undefined,
        workDoneByMemberScore: 25,
        workDoneByMemberComments: undefined,
        basicComfortScore: 0,
        basicComfortComments: undefined,
        safetyScore: 0,
        safetyComments: undefined,
        easyViewOfCatScore: 0,
        easyViewOfCatComments: undefined,
        totalScore: 85,
        timestamp: '2024-01-01T00:00:00.000Z',
        isFinalized: true,
        modificationCount: 0,
        lastModifiedBy: undefined,
        lastModifiedAt: undefined,
      };

      ddbMock.on(ScanCommand).resolves({ Items: catItems });
      ddbMock.on(QueryCommand).resolves({ Items: indexItems });
      ddbMock.on(GetCommand).resolves({ Item: score1 });

      const result = await scoreDataAccess.getScoresByCage(5);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(score1);

      // Verify scan was called to find cat by cage number
      expect(ddbMock.commandCalls(ScanCommand)[0].args[0].input).toEqual({
        TableName: tableName,
        FilterExpression: 'begins_with(PK, :pk) AND cageNumber = :cageNumber',
        ExpressionAttributeValues: {
          ':pk': 'CAT#',
          ':cageNumber': 5,
        },
      });
    });

    it('should return empty array when no cat found for cage number', async () => {
      ddbMock.on(ScanCommand).resolves({ Items: [] });

      const result = await scoreDataAccess.getScoresByCage(999);

      expect(result).toEqual([]);
    });
  });

  describe('listAllScores', () => {
    it('should return all scores in the system', async () => {
      const mockScores = [
        {
          id: 'score-1',
          catId: 'cat-1',
          judgeId: 'judge-1',
          judgeName: 'Judge A',
          firstImpressionScore: 20,
          firstImpressionComments: undefined,
          originalityScore: 22,
          originalityComments: undefined,
          informationCardScore: 18,
          informationCardComments: undefined,
          workDoneByMemberScore: 25,
          workDoneByMemberComments: undefined,
          basicComfortScore: 0,
          basicComfortComments: undefined,
          safetyScore: 0,
          safetyComments: undefined,
          easyViewOfCatScore: 0,
          easyViewOfCatComments: undefined,
          totalScore: 85,
          timestamp: '2024-01-01T00:00:00.000Z',
          isFinalized: true,
          modificationCount: 0,
          lastModifiedBy: undefined,
          lastModifiedAt: undefined,
        },
        {
          id: 'score-2',
          catId: 'cat-2',
          judgeId: 'judge-2',
          judgeName: 'Judge B',
          firstImpressionScore: 22,
          firstImpressionComments: undefined,
          originalityScore: 23,
          originalityComments: undefined,
          informationCardScore: 20,
          informationCardComments: undefined,
          workDoneByMemberScore: 25,
          workDoneByMemberComments: undefined,
          basicComfortScore: 0,
          basicComfortComments: undefined,
          safetyScore: 0,
          safetyComments: undefined,
          easyViewOfCatScore: 0,
          easyViewOfCatComments: undefined,
          totalScore: 90,
          timestamp: '2024-01-01T01:00:00.000Z',
          isFinalized: true,
          modificationCount: 0,
          lastModifiedBy: undefined,
          lastModifiedAt: undefined,
        },
      ];

      ddbMock.on(ScanCommand).resolves({ Items: mockScores });

      const result = await scoreDataAccess.listAllScores();

      expect(result).toHaveLength(2);
      expect(result).toEqual(mockScores);

      expect(ddbMock.commandCalls(ScanCommand)[0].args[0].input).toEqual({
        TableName: tableName,
        FilterExpression: 'begins_with(PK, :pk) AND SK = :sk',
        ExpressionAttributeValues: {
          ':pk': 'SCORE#',
          ':sk': 'METADATA',
        },
      });
    });

    it('should return empty array when no scores exist', async () => {
      ddbMock.on(ScanCommand).resolves({ Items: [] });

      const result = await scoreDataAccess.listAllScores();

      expect(result).toEqual([]);
    });
  });

  describe('audit trail functionality', () => {
    describe('createScore with audit trail', () => {
      it('should create audit entry when creating score', async () => {
        const input: CreateScoreInput = {
          catId: 'cat-123',
          judgeId: 'judge-456',
          judgeName: 'Judge Smith',
          firstImpressionScore: 20,
          originalityScore: 22,
          informationCardScore: 18,
          workDoneByMemberScore: 23,
          basicComfortScore: 0,
          safetyScore: 0,
          easyViewOfCatScore: 0,
        };

        ddbMock.on(PutCommand).resolves({});

        const result = await scoreDataAccess.createScore(input, 'Judge Smith');

        expect(result.modificationCount).toBe(0);
        expect(result.lastModifiedBy).toBe('Judge Smith');
        expect(result.lastModifiedAt).toBeDefined();

        // Verify four PutCommand calls were made (main record + 2 index records + audit entry)
        expect(ddbMock.commandCalls(PutCommand)).toHaveLength(4);

        // Check that audit entry was created
        const auditCall = ddbMock.commandCalls(PutCommand)[3];
        expect(auditCall.args[0].input.Item?.PK).toMatch(/^SCORE#/);
        expect(auditCall.args[0].input.Item?.SK).toMatch(/^AUDIT#/);
        expect(auditCall.args[0].input.Item?.action).toBe('CREATE');
        expect(auditCall.args[0].input.Item?.modifiedBy).toBe('Judge Smith');
      });
    });

    describe('updateScore with audit trail', () => {
      const existingScore = {
        id: 'score-123',
        catId: 'cat-123',
        judgeId: 'judge-456',
        judgeName: 'Judge Smith',
        firstImpressionScore: 20,
        firstImpressionComments: 'Clean cage',
        originalityScore: 22,
        originalityComments: 'Healthy cat',
        informationCardScore: 18,
        informationCardComments: 'Well groomed',
        workDoneByMemberScore: 23,
        workDoneByMemberComments: 'Excellent presentation',
        totalScore: 83,
        timestamp: '2024-01-01T00:00:00.000Z',
        isFinalized: false,
        modificationCount: 0,
        lastModifiedBy: 'Judge Smith',
        lastModifiedAt: '2024-01-01T00:00:00.000Z',
      };

      it('should create audit entry and increment modification count when updating score', async () => {
        ddbMock.on(GetCommand).resolves({ Item: existingScore });
        ddbMock.on(PutCommand).resolves({});

        const updateInput: UpdateScoreInput = {
          firstImpressionScore: 25,
          modificationReason: 'Corrected scoring error',
        };

        const result = await scoreDataAccess.updateScore('score-123', updateInput, 'Admin User');

        expect(result.firstImpressionScore).toBe(25);
        expect(result.modificationCount).toBe(1);
        expect(result.lastModifiedBy).toBe('Admin User');
        expect(result.lastModifiedAt).not.toBe(existingScore.lastModifiedAt);

        // Main record is updated via UpdateCommand (optimistic locking); PutCommand is used
        // only for the 2 index records + audit entry.
        expect(ddbMock.commandCalls(PutCommand)).toHaveLength(3);

        // Check that audit entry was created
        const auditCall = ddbMock.commandCalls(PutCommand)[2];
        expect(auditCall.args[0].input.Item?.action).toBe('UPDATE');
        expect(auditCall.args[0].input.Item?.modifiedBy).toBe('Admin User');
        expect(auditCall.args[0].input.Item?.reason).toBe('Corrected scoring error');
        expect(auditCall.args[0].input.Item?.previousValues).toBeDefined();
        expect(auditCall.args[0].input.Item?.newValues).toBeDefined();
      });
    });

    describe('getScoreAuditHistory', () => {
      it('should return audit history for a score', async () => {
        const mockAuditEntries = [
          {
            id: 'audit-1',
            scoreId: 'score-123',
            action: 'UPDATE',
            modifiedBy: 'Admin User',
            modifiedAt: '2024-01-01T01:00:00.000Z',
            previousValues: '{"firstImpressionScore": 20}',
            newValues: '{"firstImpressionScore": 25}',
            reason: 'Corrected scoring error',
          },
          {
            id: 'audit-2',
            scoreId: 'score-123',
            action: 'CREATE',
            modifiedBy: 'Judge Smith',
            modifiedAt: '2024-01-01T00:00:00.000Z',
            newValues: '{"firstImpressionScore": 20, "totalScore": 83}',
            reason: 'Initial score creation',
          },
        ];

        ddbMock.on(QueryCommand).resolves({ Items: mockAuditEntries });

        const result = await scoreDataAccess.getScoreAuditHistory('score-123');

        expect(result).toHaveLength(2);
        expect(result[0].action).toBe('UPDATE');
        expect(result[0].modifiedBy).toBe('Admin User');
        expect(result[0].previousValues).toEqual({ firstImpressionScore: 20 });
        expect(result[0].newValues).toEqual({ firstImpressionScore: 25 });
        expect(result[1].action).toBe('CREATE');
        expect(result[1].modifiedBy).toBe('Judge Smith');

        expect(ddbMock.commandCalls(QueryCommand)[0].args[0].input).toEqual({
          TableName: tableName,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
          ExpressionAttributeValues: {
            ':pk': 'SCORE#score-123',
            ':sk': 'AUDIT#',
          },
          ScanIndexForward: false,
        });
      });

      it('should return empty array when no audit history exists', async () => {
        ddbMock.on(QueryCommand).resolves({ Items: [] });

        const result = await scoreDataAccess.getScoreAuditHistory('score-123');

        expect(result).toEqual([]);
      });

      it('should handle audit entries with missing JSON values', async () => {
        const mockAuditEntries = [
          {
            id: 'audit-1',
            scoreId: 'score-123',
            action: 'CREATE',
            modifiedBy: 'Judge Smith',
            modifiedAt: '2024-01-01T00:00:00.000Z',
            reason: 'Initial score creation',
            // No previousValues or newValues
          },
        ];

        ddbMock.on(QueryCommand).resolves({ Items: mockAuditEntries });

        const result = await scoreDataAccess.getScoreAuditHistory('score-123');

        expect(result).toHaveLength(1);
        expect(result[0].previousValues).toBeUndefined();
        expect(result[0].newValues).toBeUndefined();
      });
    });
  });
});