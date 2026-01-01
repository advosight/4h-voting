import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { ClassScoreDataAccess, CreateClassScoreInput, UpdateClassScoreInput } from '../classScoreDataAccess';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('ClassScoreDataAccess - Audit Trail', () => {
  let classScoreDataAccess: ClassScoreDataAccess;
  const tableName = 'test-table';

  beforeEach(() => {
    ddbMock.reset();
    classScoreDataAccess = new ClassScoreDataAccess(ddbMock as any, tableName);
  });

  describe('createClassScore', () => {
    it('creates audit trail entry on score creation', async () => {
      const input: CreateClassScoreInput = {
        catId: 'cat-1',
        judgeId: 'judge-1',
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
        healthGroomingComments: 'Excellent health',
        isFinalized: false
      };

      ddbMock.on(PutCommand).resolves({});

      await classScoreDataAccess.createClassScore(input);

      // Should create 4 PutCommand calls: main record, cat index, judge index, and audit entry
      expect(ddbMock.commandCalls(PutCommand)).toHaveLength(4);

      // Check audit entry creation
      const auditCall = ddbMock.commandCalls(PutCommand).find(call => 
        call.args[0].input.Item?.PK?.startsWith('CLASS_SCORE_AUDIT#')
      );

      expect(auditCall).toBeDefined();
      expect(auditCall?.args[0].input.Item).toMatchObject({
        action: 'CREATE',
        modifiedBy: 'Judge Smith',
        reason: 'Initial class score creation'
      });
    });

    it('includes modification tracking fields in created score', async () => {
      const input: CreateClassScoreInput = {
        catId: 'cat-1',
        judgeId: 'judge-1',
        judgeName: 'Judge Smith',
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

      ddbMock.on(PutCommand).resolves({});

      const result = await classScoreDataAccess.createClassScore(input);

      expect(result).toMatchObject({
        modificationCount: 0,
        lastModifiedBy: 'Judge Smith',
        lastModifiedAt: expect.any(String)
      });
    });
  });

  describe('updateClassScore', () => {
    const existingScore = {
      id: 'score-1',
      catId: 'cat-1',
      judgeId: 'judge-1',
      judgeName: 'Judge Smith',
      beautyScore: 12,
      personalityScore: 18,
      balanceProportionScore: 13,
      coatCleanGroomed: true,
      teethGumsHealthy: true,
      eyesNoseClear: true,
      earsCleanMiteFree: true,
      toenailsClipped: true,
      fleaIssues: false,
      totalScore: 43,
      ribbonEligibility: 'Red',
      timestamp: '2024-01-15T10:00:00Z',
      isFinalized: false,
      modificationCount: 0,
      lastModifiedBy: 'Judge Smith',
      lastModifiedAt: '2024-01-15T10:00:00Z'
    };

    beforeEach(() => {
      // Mock getClassScore to return existing score
      ddbMock.on(GetCommand).resolves({
        Item: {
          PK: 'CLASS_SCORE#score-1',
          SK: 'METADATA',
          ...existingScore
        }
      });
    });

    it('creates audit trail entry on score update', async () => {
      const updateInput: UpdateClassScoreInput = {
        beautyScore: 14,
        modificationReason: 'Corrected beauty score'
      };

      ddbMock.on(UpdateCommand).resolves({});
      ddbMock.on(PutCommand).resolves({});

      await classScoreDataAccess.updateClassScore('score-1', updateInput, 'Judge Smith');

      // Should create audit entry
      const auditCall = ddbMock.commandCalls(PutCommand).find(call => 
        call.args[0].input.Item?.PK?.startsWith('CLASS_SCORE_AUDIT#')
      );

      expect(auditCall).toBeDefined();
      expect(auditCall?.args[0].input.Item).toMatchObject({
        action: 'UPDATE',
        modifiedBy: 'Judge Smith',
        reason: 'Corrected beauty score',
        previousValues: existingScore,
        newValues: expect.objectContaining({
          beautyScore: 14,
          modificationCount: 1
        })
      });
    });

    it('increments modification count on update', async () => {
      const updateInput: UpdateClassScoreInput = {
        beautyScore: 14,
        modificationReason: 'Corrected beauty score'
      };

      ddbMock.on(UpdateCommand).resolves({});
      ddbMock.on(PutCommand).resolves({});

      const result = await classScoreDataAccess.updateClassScore('score-1', updateInput, 'Judge Smith');

      expect(result.modificationCount).toBe(1);
      expect(result.lastModifiedBy).toBe('Judge Smith');
      expect(result.lastModifiedAt).toBeDefined();
    });

    it('uses default reason when none provided', async () => {
      const updateInput: UpdateClassScoreInput = {
        beautyScore: 14
      };

      ddbMock.on(UpdateCommand).resolves({});
      ddbMock.on(PutCommand).resolves({});

      await classScoreDataAccess.updateClassScore('score-1', updateInput, 'Judge Smith');

      const auditCall = ddbMock.commandCalls(PutCommand).find(call => 
        call.args[0].input.Item?.PK?.startsWith('CLASS_SCORE_AUDIT#')
      );

      expect(auditCall?.args[0].input.Item?.reason).toBe('Class score updated');
    });
  });

  describe('finalizeClassScore', () => {
    const existingScore = {
      id: 'score-1',
      catId: 'cat-1',
      judgeId: 'judge-1',
      judgeName: 'Judge Smith',
      beautyScore: 12,
      personalityScore: 18,
      balanceProportionScore: 13,
      coatCleanGroomed: true,
      teethGumsHealthy: true,
      eyesNoseClear: true,
      earsCleanMiteFree: true,
      toenailsClipped: true,
      fleaIssues: false,
      totalScore: 43,
      ribbonEligibility: 'Red',
      timestamp: '2024-01-15T10:00:00Z',
      isFinalized: false,
      modificationCount: 1,
      lastModifiedBy: 'Judge Smith',
      lastModifiedAt: '2024-01-15T10:00:00Z'
    };

    beforeEach(() => {
      ddbMock.on(GetCommand).resolves({
        Item: {
          PK: 'CLASS_SCORE#score-1',
          SK: 'METADATA',
          ...existingScore
        }
      });
    });

    it('creates audit trail entry on finalization', async () => {
      ddbMock.on(UpdateCommand).resolves({});
      ddbMock.on(PutCommand).resolves({});

      await classScoreDataAccess.finalizeClassScore('score-1', 'Admin User');

      const auditCall = ddbMock.commandCalls(PutCommand).find(call => 
        call.args[0].input.Item?.PK?.startsWith('CLASS_SCORE_AUDIT#')
      );

      expect(auditCall).toBeDefined();
      expect(auditCall?.args[0].input.Item).toMatchObject({
        action: 'FINALIZE',
        modifiedBy: 'Admin User',
        reason: 'Class score finalized',
        previousValues: existingScore,
        newValues: expect.objectContaining({
          isFinalized: true,
          modificationCount: 2
        })
      });
    });

    it('throws error if score is already finalized', async () => {
      const finalizedScore = { ...existingScore, isFinalized: true };
      
      ddbMock.on(GetCommand).resolves({
        Item: {
          PK: 'CLASS_SCORE#score-1',
          SK: 'METADATA',
          ...finalizedScore
        }
      });

      await expect(
        classScoreDataAccess.finalizeClassScore('score-1', 'Admin User')
      ).rejects.toThrow('Class score is already finalized');
    });

    it('throws error if score not found', async () => {
      ddbMock.on(GetCommand).resolves({});

      await expect(
        classScoreDataAccess.finalizeClassScore('score-1', 'Admin User')
      ).rejects.toThrow('Class score not found');
    });
  });

  describe('getClassScoreAuditHistory', () => {
    it('retrieves audit history for a class score', async () => {
      const mockAuditEntries = [
        {
          PK: 'CLASS_SCORE_AUDIT#score-1',
          SK: 'ENTRY#2024-01-15T12:00:00Z#audit-2',
          id: 'audit-2',
          classScoreId: 'score-1',
          action: 'FINALIZE',
          modifiedBy: 'Admin User',
          modifiedAt: '2024-01-15T12:00:00Z',
          reason: 'Class score finalized'
        },
        {
          PK: 'CLASS_SCORE_AUDIT#score-1',
          SK: 'ENTRY#2024-01-15T11:00:00Z#audit-1',
          id: 'audit-1',
          classScoreId: 'score-1',
          action: 'UPDATE',
          modifiedBy: 'Judge Smith',
          modifiedAt: '2024-01-15T11:00:00Z',
          reason: 'Corrected beauty score'
        }
      ];

      ddbMock.on(QueryCommand).resolves({
        Items: mockAuditEntries
      });

      const result = await classScoreDataAccess.getClassScoreAuditHistory('score-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'audit-2',
        action: 'FINALIZE',
        modifiedBy: 'Admin User'
      });
      expect(result[1]).toMatchObject({
        id: 'audit-1',
        action: 'UPDATE',
        modifiedBy: 'Judge Smith'
      });

      // Verify query parameters
      const queryCall = ddbMock.commandCalls(QueryCommand)[0];
      expect(queryCall.args[0].input).toMatchObject({
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': 'CLASS_SCORE_AUDIT#score-1',
          ':sk': 'ENTRY#'
        },
        ScanIndexForward: false // Most recent first
      });
    });

    it('returns empty array when no audit entries exist', async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });

      const result = await classScoreDataAccess.getClassScoreAuditHistory('score-1');

      expect(result).toEqual([]);
    });
  });
});