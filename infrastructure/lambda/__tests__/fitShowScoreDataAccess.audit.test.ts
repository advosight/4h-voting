import { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { FitShowScoreDataAccess, CreateFitShowScoreInput } from '../fitShowScoreDataAccess';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('FitShowScoreDataAccess - Audit Functionality', () => {
  let dataAccess: FitShowScoreDataAccess;
  const tableName = 'test-table';

  beforeEach(() => {
    ddbMock.reset();
    dataAccess = new FitShowScoreDataAccess(tableName);
  });

  const mockCreateInput: CreateFitShowScoreInput = {
    catId: 'cat-1',
    participantName: 'John Doe',
    judgeId: 'judge-1',
    judgeName: 'Judge Smith',
    
    // Appearance & Demeanor
    attire: 8,
    attentive: 4,
    courteous: 5,
    
    // Handling & Control
    controlEquipment: 9,
    pickupCarrying: 3,
    
    // Demonstration Skills
    showingHeadShape: 3,
    showingBodyType: 4,
    showingTail: 3,
    showingCoatTexture: 4,
    
    // Health Examination
    showingMouthTeethGums: 2,
    conditionMouthTeethGums: 2,
    showingNose: 2,
    showingEyes: 2,
    conditionNoseEyes: 2,
    showingEars: 2,
    earsClean: 2,
    showingToenailsClaws: 3,
    toenailsClipped: 5,
    
    // Grooming & Care
    showingBellyCoatCleanliness: 3,
    coatCleanWellGroomed: 7,
    catHealthCare: 3,
    
    // Knowledge
    generalKnowledge: 3,
    catBreedsShowing: 3,
    catAnatomy: 3,
    fourHKnowledge: 3
  };

  describe('createFitShowScoreWithAudit', () => {
    it('creates score and audit entry', async () => {
      ddbMock.on(PutCommand).resolves({});

      const result = await dataAccess.createFitShowScoreWithAudit(mockCreateInput);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.participantName).toBe('John Doe');
      expect(result.totalScore).toBe(90); // Sum of all scores

      // Should have called PutCommand multiple times (main record, indexes, audit)
      const putCalls = ddbMock.commandCalls(PutCommand);
      expect(putCalls.length).toBeGreaterThan(3); // At least main + 2 indexes + audit

      // Check that audit entry was created
      const auditCall = putCalls.find(call => 
        call.args[0].input.Item?.PK?.startsWith('FIT_SHOW_SCORE_AUDIT#')
      );
      expect(auditCall).toBeDefined();
      expect(auditCall?.args[0].input.Item?.action).toBe('CREATE');
      expect(auditCall?.args[0].input.Item?.reason).toBe('Initial score creation');
    });

    it('includes all score data in audit entry new values', async () => {
      ddbMock.on(PutCommand).resolves({});

      await dataAccess.createFitShowScoreWithAudit(mockCreateInput);

      const putCalls = ddbMock.commandCalls(PutCommand);
      const auditCall = putCalls.find(call => 
        call.args[0].input.Item?.PK?.startsWith('FIT_SHOW_SCORE_AUDIT#')
      );

      expect(auditCall?.args[0].input.Item?.newValues).toEqual(
        expect.objectContaining({
          participantName: 'John Doe',
          attire: 8,
          totalScore: 90
        })
      );
    });
  });

  describe('updateFitShowScoreWithAudit', () => {
    it('updates score and creates audit entry with changes', async () => {
      const existingScore = {
        id: 'score-1',
        ...mockCreateInput,
        appearanceTotal: 17,
        handlingTotal: 12,
        demonstrationTotal: 14,
        healthExaminationTotal: 22,
        groomingCareTotal: 13,
        knowledgeTotal: 12,
        totalScore: 90,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        isFinalized: false,
        modificationCount: 0,
        lastModifiedBy: 'judge-1',
        lastModifiedAt: '2024-01-01T10:00:00Z'
      };

      // Mock getting existing score
      ddbMock.on(GetCommand).resolves({
        Item: { PK: 'FIT_SHOW_SCORE#score-1', SK: 'METADATA', ...existingScore }
      });
      ddbMock.on(PutCommand).resolves({});

      const updateInput = {
        id: 'score-1',
        ...mockCreateInput,
        attire: 10, // Changed from 8 to 10
        modificationReason: 'Improved attire score'
      };

      const result = await dataAccess.updateFitShowScoreWithAudit(updateInput, 'Improved attire score');

      expect(result).toBeDefined();
      expect(result.attire).toBe(10);
      expect(result.totalScore).toBe(92); // Should increase by 2

      // Check audit entry was created
      const putCalls = ddbMock.commandCalls(PutCommand);
      const auditCall = putCalls.find(call => 
        call.args[0].input.Item?.PK?.startsWith('FIT_SHOW_SCORE_AUDIT#')
      );
      
      expect(auditCall).toBeDefined();
      expect(auditCall?.args[0].input.Item?.action).toBe('UPDATE');
      expect(auditCall?.args[0].input.Item?.reason).toBe('Improved attire score');
      expect(auditCall?.args[0].input.Item?.previousValues).toEqual(existingScore);
      expect(auditCall?.args[0].input.Item?.newValues).toEqual(updateInput);
    });
  });

  describe('deleteFitShowScoreWithAudit', () => {
    it('deletes score and creates audit entry', async () => {
      const existingScore = {
        id: 'score-1',
        ...mockCreateInput,
        appearanceTotal: 17,
        handlingTotal: 12,
        demonstrationTotal: 14,
        healthExaminationTotal: 22,
        groomingCareTotal: 13,
        knowledgeTotal: 12,
        totalScore: 90,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        isFinalized: false,
        modificationCount: 0,
        lastModifiedBy: 'judge-1',
        lastModifiedAt: '2024-01-01T10:00:00Z'
      };

      // Mock getting existing score
      ddbMock.on(GetCommand).resolves({
        Item: { PK: 'FIT_SHOW_SCORE#score-1', SK: 'METADATA', ...existingScore }
      });
      ddbMock.on(PutCommand).resolves({});

      await dataAccess.deleteFitShowScoreWithAudit('score-1', 'judge-1', 'Score deleted due to error');

      // Check audit entry was created before deletion
      const putCalls = ddbMock.commandCalls(PutCommand);
      const auditCall = putCalls.find(call => 
        call.args[0].input.Item?.PK?.startsWith('FIT_SHOW_SCORE_AUDIT#')
      );
      
      expect(auditCall).toBeDefined();
      expect(auditCall?.args[0].input.Item?.action).toBe('DELETE');
      expect(auditCall?.args[0].input.Item?.reason).toBe('Score deleted due to error');
      expect(auditCall?.args[0].input.Item?.previousValues).toEqual(existingScore);
    });
  });

  describe('getFitShowScoreAuditHistory', () => {
    it('retrieves audit history for a score', async () => {
      const mockAuditEntries = [
        {
          PK: 'FIT_SHOW_SCORE_AUDIT#score-1',
          SK: 'ENTRY#2024-01-01T12:00:00Z#audit-3',
          id: 'audit-3',
          fitShowScoreId: 'score-1',
          action: 'FINALIZE',
          modifiedBy: 'judge-1',
          modifiedAt: '2024-01-01T12:00:00Z',
          previousValues: { isFinalized: false },
          newValues: { isFinalized: true },
          reason: 'Score finalized'
        },
        {
          PK: 'FIT_SHOW_SCORE_AUDIT#score-1',
          SK: 'ENTRY#2024-01-01T11:00:00Z#audit-2',
          id: 'audit-2',
          fitShowScoreId: 'score-1',
          action: 'UPDATE',
          modifiedBy: 'judge-1',
          modifiedAt: '2024-01-01T11:00:00Z',
          previousValues: { attire: 8 },
          newValues: { attire: 10 },
          reason: 'Score updated'
        },
        {
          PK: 'FIT_SHOW_SCORE_AUDIT#score-1',
          SK: 'ENTRY#2024-01-01T10:00:00Z#audit-1',
          id: 'audit-1',
          fitShowScoreId: 'score-1',
          action: 'CREATE',
          modifiedBy: 'judge-1',
          modifiedAt: '2024-01-01T10:00:00Z',
          newValues: { participantName: 'John Doe', totalScore: 88 },
          reason: 'Initial creation'
        }
      ];

      ddbMock.on(QueryCommand).resolves({
        Items: mockAuditEntries
      });

      const result = await dataAccess.getFitShowScoreAuditHistory('score-1');

      expect(result).toHaveLength(3);
      expect(result[0].action).toBe('FINALIZE'); // Most recent first
      expect(result[1].action).toBe('UPDATE');
      expect(result[2].action).toBe('CREATE');

      // Verify query parameters
      const queryCall = ddbMock.commandCalls(QueryCommand)[0];
      expect(queryCall.args[0].input.KeyConditionExpression).toBe('PK = :pk AND begins_with(SK, :sk)');
      expect(queryCall.args[0].input.ExpressionAttributeValues).toEqual({
        ':pk': 'FIT_SHOW_SCORE_AUDIT#score-1',
        ':sk': 'ENTRY#'
      });
      expect(queryCall.args[0].input.ScanIndexForward).toBe(false); // Most recent first
    });

    it('returns empty array when no audit entries exist', async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: []
      });

      const result = await dataAccess.getFitShowScoreAuditHistory('score-1');

      expect(result).toEqual([]);
    });

    it('handles undefined Items in query response', async () => {
      ddbMock.on(QueryCommand).resolves({});

      const result = await dataAccess.getFitShowScoreAuditHistory('score-1');

      expect(result).toEqual([]);
    });
  });

  describe('finalizeFitShowScore with audit', () => {
    it('creates audit entry when finalizing score', async () => {
      const existingScore = {
        id: 'score-1',
        ...mockCreateInput,
        appearanceTotal: 17,
        handlingTotal: 12,
        demonstrationTotal: 14,
        healthExaminationTotal: 22,
        groomingCareTotal: 13,
        knowledgeTotal: 12,
        totalScore: 90,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        isFinalized: false,
        modificationCount: 0,
        lastModifiedBy: 'judge-1',
        lastModifiedAt: '2024-01-01T10:00:00Z'
      };

      // Mock getting existing score
      ddbMock.on(GetCommand).resolves({
        Item: { PK: 'FIT_SHOW_SCORE#score-1', SK: 'METADATA', ...existingScore }
      });
      ddbMock.on(PutCommand).resolves({});

      const result = await dataAccess.finalizeFitShowScore('score-1', 'judge-1');

      expect(result.isFinalized).toBe(true);

      // Check audit entry was created
      const putCalls = ddbMock.commandCalls(PutCommand);
      const auditCall = putCalls.find(call => 
        call.args[0].input.Item?.PK?.startsWith('FIT_SHOW_SCORE_AUDIT#')
      );
      
      expect(auditCall).toBeDefined();
      expect(auditCall?.args[0].input.Item?.action).toBe('FINALIZE');
      expect(auditCall?.args[0].input.Item?.reason).toBe('Score finalized by judge');
      expect(auditCall?.args[0].input.Item?.previousValues).toEqual({ isFinalized: false });
      expect(auditCall?.args[0].input.Item?.newValues).toEqual({ isFinalized: true });
    });
  });

  describe('audit entry structure', () => {
    it('creates audit entries with correct PK/SK pattern', async () => {
      ddbMock.on(PutCommand).resolves({});

      await dataAccess.createFitShowScoreWithAudit(mockCreateInput);

      const putCalls = ddbMock.commandCalls(PutCommand);
      const auditCall = putCalls.find(call => 
        call.args[0].input.Item?.PK?.startsWith('FIT_SHOW_SCORE_AUDIT#')
      );

      expect(auditCall?.args[0].input.Item?.PK).toMatch(/^FIT_SHOW_SCORE_AUDIT#/);
      expect(auditCall?.args[0].input.Item?.SK).toMatch(/^ENTRY#\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z#/);
      expect(auditCall?.args[0].input.Item?.id).toBeDefined();
      expect(auditCall?.args[0].input.Item?.fitShowScoreId).toBeDefined();
    });

    it('includes all required audit fields', async () => {
      ddbMock.on(PutCommand).resolves({});

      await dataAccess.createFitShowScoreWithAudit(mockCreateInput);

      const putCalls = ddbMock.commandCalls(PutCommand);
      const auditCall = putCalls.find(call => 
        call.args[0].input.Item?.PK?.startsWith('FIT_SHOW_SCORE_AUDIT#')
      );

      const auditItem = auditCall?.args[0].input.Item;
      expect(auditItem).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          fitShowScoreId: expect.any(String),
          action: 'CREATE',
          modifiedBy: 'judge-1',
          modifiedAt: expect.any(String),
          newValues: expect.any(Object),
          reason: 'Initial score creation'
        })
      );
    });
  });
});