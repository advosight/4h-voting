import { AppSyncResolverEvent } from 'aws-lambda';

// Mock the FitShowScoreDataAccess before importing the handler
const mockFitShowScoreDataAccess = {
  createFitShowScore: jest.fn(),
  createFitShowScoreWithAudit: jest.fn(),
  updateFitShowScore: jest.fn(),
  updateFitShowScoreWithAudit: jest.fn(),
  getFitShowScore: jest.fn(),
  getFitShowScoresByCat: jest.fn(),
  getFitShowScoresByCage: jest.fn(),
  listFitShowScores: jest.fn(),
  getFitShowScoresByJudge: jest.fn(),
  finalizeFitShowScore: jest.fn(),
  getFitShowScoreAuditHistory: jest.fn(),
};

jest.mock('../fitShowScoreDataAccess', () => ({
  FitShowScoreDataAccess: jest.fn().mockImplementation(() => mockFitShowScoreDataAccess),
}));

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn(),
}));

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn(),
  },
}));

// Now import the handler after mocks are set up
import { handler } from '../fitShowScoreResolver';

describe('Fit and Show Score Resolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockEvent = (
    fieldName: string,
    arguments_: any = {},
    userRole: string = 'judge',
    userId: string = 'judge-123'
  ): AppSyncResolverEvent<any> => ({
    info: { fieldName },
    arguments: arguments_,
    identity: {
      claims: {
        sub: userId,
        'cognito:username': 'testjudge',
        'custom:role': userRole,
        email: 'judge@example.com',
      },
    },
  } as any);

  const mockFitShowScore = {
    id: 'fitshow-score-123',
    catId: 'cat-456',
    participantName: 'John Doe',
    judgeId: 'judge-123',
    judgeName: 'testjudge',
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
    catAnatomy: 2,
    fourHKnowledge: 3,
    // Calculated totals
    appearanceTotal: 17,
    handlingTotal: 12,
    demonstrationTotal: 14,
    healthExaminationTotal: 20,
    groomingCareTotal: 13,
    knowledgeTotal: 11,
    totalScore: 87,
    // Comments
    appearanceComments: 'Well dressed and attentive',
    handlingComments: 'Good control of cat',
    demonstrationComments: 'Clear demonstrations',
    healthExaminationComments: 'Thorough examination',
    groomingCareComments: 'Cat well groomed',
    knowledgeComments: 'Good knowledge base',
    // Metadata
    timestamp: '2024-01-01T00:00:00.000Z',
    isFinalized: false,
    modificationCount: 0,
    lastModifiedBy: 'judge@example.com',
    lastModifiedAt: '2024-01-01T00:00:00.000Z',
  };

  describe('createFitShowScore', () => {
    it('should create a fit and show score successfully for judge', async () => {
      const input = {
        catId: 'cat-456',
        participantName: 'John Doe',
        attire: 8,
        attentive: 4,
        courteous: 5,
        controlEquipment: 9,
        pickupCarrying: 3,
        showingHeadShape: 3,
        showingBodyType: 4,
        showingTail: 3,
        showingCoatTexture: 4,
        showingMouthTeethGums: 2,
        conditionMouthTeethGums: 2,
        showingNose: 2,
        showingEyes: 2,
        conditionNoseEyes: 2,
        showingEars: 2,
        earsClean: 2,
        showingToenailsClaws: 3,
        toenailsClipped: 5,
        showingBellyCoatCleanliness: 3,
        coatCleanWellGroomed: 7,
        catHealthCare: 3,
        generalKnowledge: 3,
        catBreedsShowing: 3,
        catAnatomy: 2,
        fourHKnowledge: 3,
      };

      mockFitShowScoreDataAccess.createFitShowScoreWithAudit.mockResolvedValue(mockFitShowScore);

      const event = createMockEvent('createFitShowScore', { input });
      const result = await handler(event);

      expect(mockFitShowScoreDataAccess.createFitShowScoreWithAudit).toHaveBeenCalledWith({
        ...input,
        judgeId: 'judge-123',
        judgeName: 'testjudge',
      });
      expect(result).toEqual(mockFitShowScore);
    });

    it('should create a fit and show score successfully for admin', async () => {
      const input = {
        catId: 'cat-456',
        participantName: 'John Doe',
        attire: 8,
        attentive: 4,
        courteous: 5,
        controlEquipment: 9,
        pickupCarrying: 3,
        showingHeadShape: 3,
        showingBodyType: 4,
        showingTail: 3,
        showingCoatTexture: 4,
        showingMouthTeethGums: 2,
        conditionMouthTeethGums: 2,
        showingNose: 2,
        showingEyes: 2,
        conditionNoseEyes: 2,
        showingEars: 2,
        earsClean: 2,
        showingToenailsClaws: 3,
        toenailsClipped: 5,
        showingBellyCoatCleanliness: 3,
        coatCleanWellGroomed: 7,
        catHealthCare: 3,
        generalKnowledge: 3,
        catBreedsShowing: 3,
        catAnatomy: 2,
        fourHKnowledge: 3,
      };

      mockFitShowScoreDataAccess.createFitShowScoreWithAudit.mockResolvedValue(mockFitShowScore);

      const event = createMockEvent('createFitShowScore', { input }, 'admin');
      const result = await handler(event);

      expect(result).toEqual(mockFitShowScore);
    });

    it('should reject creation for non-judge/admin users', async () => {
      const input = {
        catId: 'cat-456',
        participantName: 'John Doe',
        attire: 8,
        attentive: 4,
        courteous: 5,
        controlEquipment: 9,
        pickupCarrying: 3,
        showingHeadShape: 3,
        showingBodyType: 4,
        showingTail: 3,
        showingCoatTexture: 4,
        showingMouthTeethGums: 2,
        conditionMouthTeethGums: 2,
        showingNose: 2,
        showingEyes: 2,
        conditionNoseEyes: 2,
        showingEars: 2,
        earsClean: 2,
        showingToenailsClaws: 3,
        toenailsClipped: 5,
        showingBellyCoatCleanliness: 3,
        coatCleanWellGroomed: 7,
        catHealthCare: 3,
        generalKnowledge: 3,
        catBreedsShowing: 3,
        catAnatomy: 2,
        fourHKnowledge: 3,
      };

      const event = createMockEvent('createFitShowScore', { input }, 'participant');

      await expect(handler(event)).rejects.toThrow('Forbidden: Judge role required');
      expect(mockFitShowScoreDataAccess.createFitShowScoreWithAudit).not.toHaveBeenCalled();
    });

    it('should validate score ranges for attire (1-10)', async () => {
      const input = {
        catId: 'cat-456',
        participantName: 'John Doe',
        attire: 15, // Invalid: > 10
        attentive: 4,
        courteous: 5,
        controlEquipment: 9,
        pickupCarrying: 3,
        showingHeadShape: 3,
        showingBodyType: 4,
        showingTail: 3,
        showingCoatTexture: 4,
        showingMouthTeethGums: 2,
        conditionMouthTeethGums: 2,
        showingNose: 2,
        showingEyes: 2,
        conditionNoseEyes: 2,
        showingEars: 2,
        earsClean: 2,
        showingToenailsClaws: 3,
        toenailsClipped: 5,
        showingBellyCoatCleanliness: 3,
        coatCleanWellGroomed: 7,
        catHealthCare: 3,
        generalKnowledge: 3,
        catBreedsShowing: 3,
        catAnatomy: 2,
        fourHKnowledge: 3,
      };

      const event = createMockEvent('createFitShowScore', { input });

      await expect(handler(event)).rejects.toThrow('attire must be between 1 and 10');
      expect(mockFitShowScoreDataAccess.createFitShowScoreWithAudit).not.toHaveBeenCalled();
    });

    it('should validate score ranges for toenailsClipped (1-6)', async () => {
      const input = {
        catId: 'cat-456',
        participantName: 'John Doe',
        attire: 8,
        attentive: 4,
        courteous: 5,
        controlEquipment: 9,
        pickupCarrying: 3,
        showingHeadShape: 3,
        showingBodyType: 4,
        showingTail: 3,
        showingCoatTexture: 4,
        showingMouthTeethGums: 2,
        conditionMouthTeethGums: 2,
        showingNose: 2,
        showingEyes: 2,
        conditionNoseEyes: 2,
        showingEars: 2,
        earsClean: 2,
        showingToenailsClaws: 3,
        toenailsClipped: 10, // Invalid: > 6
        showingBellyCoatCleanliness: 3,
        coatCleanWellGroomed: 7,
        catHealthCare: 3,
        generalKnowledge: 3,
        catBreedsShowing: 3,
        catAnatomy: 2,
        fourHKnowledge: 3,
      };

      const event = createMockEvent('createFitShowScore', { input });

      await expect(handler(event)).rejects.toThrow('toenailsClipped must be between 1 and 6');
      expect(mockFitShowScoreDataAccess.createFitShowScoreWithAudit).not.toHaveBeenCalled();
    });

    it('should validate participant name is required', async () => {
      const input = {
        catId: 'cat-456',
        participantName: '', // Invalid: empty
        attire: 8,
        attentive: 4,
        courteous: 5,
        controlEquipment: 9,
        pickupCarrying: 3,
        showingHeadShape: 3,
        showingBodyType: 4,
        showingTail: 3,
        showingCoatTexture: 4,
        showingMouthTeethGums: 2,
        conditionMouthTeethGums: 2,
        showingNose: 2,
        showingEyes: 2,
        conditionNoseEyes: 2,
        showingEars: 2,
        earsClean: 2,
        showingToenailsClaws: 3,
        toenailsClipped: 5,
        showingBellyCoatCleanliness: 3,
        coatCleanWellGroomed: 7,
        catHealthCare: 3,
        generalKnowledge: 3,
        catBreedsShowing: 3,
        catAnatomy: 2,
        fourHKnowledge: 3,
      };

      const event = createMockEvent('createFitShowScore', { input });

      await expect(handler(event)).rejects.toThrow('Participant name is required and cannot be empty');
      expect(mockFitShowScoreDataAccess.createFitShowScoreWithAudit).not.toHaveBeenCalled();
    });

    it('should validate comment lengths', async () => {
      const longComment = 'a'.repeat(501); // Too long
      const input = {
        catId: 'cat-456',
        participantName: 'John Doe',
        attire: 8,
        attentive: 4,
        courteous: 5,
        controlEquipment: 9,
        pickupCarrying: 3,
        showingHeadShape: 3,
        showingBodyType: 4,
        showingTail: 3,
        showingCoatTexture: 4,
        showingMouthTeethGums: 2,
        conditionMouthTeethGums: 2,
        showingNose: 2,
        showingEyes: 2,
        conditionNoseEyes: 2,
        showingEars: 2,
        earsClean: 2,
        showingToenailsClaws: 3,
        toenailsClipped: 5,
        showingBellyCoatCleanliness: 3,
        coatCleanWellGroomed: 7,
        catHealthCare: 3,
        generalKnowledge: 3,
        catBreedsShowing: 3,
        catAnatomy: 2,
        fourHKnowledge: 3,
        appearanceComments: longComment,
      };

      const event = createMockEvent('createFitShowScore', { input });

      await expect(handler(event)).rejects.toThrow('Comment must be 500 characters or less');
      expect(mockFitShowScoreDataAccess.createFitShowScoreWithAudit).not.toHaveBeenCalled();
    });
  });

  describe('updateFitShowScore', () => {
    it('should update a fit and show score successfully', async () => {
      const input = {
        attire: 9,
        appearanceComments: 'Updated comment',
      };

      const existingScore = { ...mockFitShowScore, judgeId: 'judge-123' };
      const updatedScore = { ...existingScore, ...input };

      mockFitShowScoreDataAccess.getFitShowScore.mockResolvedValue(existingScore);
      mockFitShowScoreDataAccess.updateFitShowScoreWithAudit.mockResolvedValue(updatedScore);

      const event = createMockEvent('updateFitShowScore', { id: 'fitshow-score-123', input });
      const result = await handler(event);

      expect(mockFitShowScoreDataAccess.updateFitShowScoreWithAudit).toHaveBeenCalledWith({
        ...input,
        id: 'fitshow-score-123',
      }, 'Score updated by judge', false);
      expect(result).toEqual(updatedScore);
    });

    it('should reject update for non-existent score', async () => {
      const input = { attire: 9 };

      mockFitShowScoreDataAccess.getFitShowScore.mockResolvedValue(null);

      const event = createMockEvent('updateFitShowScore', { id: 'nonexistent', input });

      await expect(handler(event)).rejects.toThrow('Fit and show score with ID nonexistent not found');
      expect(mockFitShowScoreDataAccess.updateFitShowScoreWithAudit).not.toHaveBeenCalled();
    });

    it('should reject update for finalized score by non-admin', async () => {
      const input = { attire: 9 };
      const finalizedScore = { ...mockFitShowScore, isFinalized: true, judgeId: 'judge-123' };

      mockFitShowScoreDataAccess.getFitShowScore.mockResolvedValue(finalizedScore);

      const event = createMockEvent('updateFitShowScore', { id: 'fitshow-score-123', input });

      await expect(handler(event)).rejects.toThrow('Cannot modify finalized fit and show scores. Admin access required.');
      expect(mockFitShowScoreDataAccess.updateFitShowScoreWithAudit).not.toHaveBeenCalled();
    });
  });

  describe('getFitShowScore', () => {
    it('should get a fit and show score for judge (own score)', async () => {
      const score = { ...mockFitShowScore, judgeId: 'judge-123' };
      mockFitShowScoreDataAccess.getFitShowScore.mockResolvedValue(score);

      const event = createMockEvent('getFitShowScore', { id: 'fitshow-score-123' });
      const result = await handler(event);

      expect(result).toEqual(score);
    });

    it('should get a finalized fit and show score for participant', async () => {
      const score = { ...mockFitShowScore, isFinalized: true };
      mockFitShowScoreDataAccess.getFitShowScore.mockResolvedValue(score);

      const event = createMockEvent('getFitShowScore', { id: 'fitshow-score-123' }, 'participant');
      const result = await handler(event);

      expect(result).toEqual(score);
    });

    it('should reject non-finalized score for participant', async () => {
      const score = { ...mockFitShowScore, isFinalized: false };
      mockFitShowScoreDataAccess.getFitShowScore.mockResolvedValue(score);

      const event = createMockEvent('getFitShowScore', { id: 'fitshow-score-123' }, 'participant');

      await expect(handler(event)).rejects.toThrow('Fit and show score is not yet finalized and cannot be viewed by participants');
    });

    it('should return null for non-existent score', async () => {
      mockFitShowScoreDataAccess.getFitShowScore.mockResolvedValue(null);

      const event = createMockEvent('getFitShowScore', { id: 'nonexistent' });
      const result = await handler(event);

      expect(result).toBeNull();
    });
  });

  describe('getFitShowScoresByCat', () => {
    it('should get all fit and show scores for admin', async () => {
      const scores = [mockFitShowScore];
      mockFitShowScoreDataAccess.getFitShowScoresByCat.mockResolvedValue(scores);

      const event = createMockEvent('getFitShowScoresByCat', { catId: 'cat-456' }, 'admin');
      const result = await handler(event);

      expect(result).toEqual({ items: scores });
    });

    it('should filter fit and show scores for judge (own scores only)', async () => {
      const scores = [
        { ...mockFitShowScore, judgeId: 'judge-123' },
        { ...mockFitShowScore, id: 'other-score', judgeId: 'other-judge' },
      ];
      mockFitShowScoreDataAccess.getFitShowScoresByCat.mockResolvedValue(scores);

      const event = createMockEvent('getFitShowScoresByCat', { catId: 'cat-456' });
      const result = await handler(event);

      expect(result).toEqual({ items: [scores[0]] });
    });

    it('should filter fit and show scores for participant (finalized only)', async () => {
      const scores = [
        { ...mockFitShowScore, isFinalized: true },
        { ...mockFitShowScore, id: 'other-score', isFinalized: false },
      ];
      mockFitShowScoreDataAccess.getFitShowScoresByCat.mockResolvedValue(scores);

      const event = createMockEvent('getFitShowScoresByCat', { catId: 'cat-456' }, 'participant');
      const result = await handler(event);

      expect(result).toEqual({ items: [scores[0]] });
    });
  });

  describe('finalizeFitShowScore', () => {
    it('should finalize a fit and show score successfully', async () => {
      const existingScore = { ...mockFitShowScore, judgeId: 'judge-123', isFinalized: false };
      const finalizedScore = { ...existingScore, isFinalized: true };

      mockFitShowScoreDataAccess.getFitShowScore.mockResolvedValue(existingScore);
      mockFitShowScoreDataAccess.finalizeFitShowScore.mockResolvedValue(finalizedScore);

      const event = createMockEvent('finalizeFitShowScore', { id: 'fitshow-score-123' });
      const result = await handler(event);

      expect(mockFitShowScoreDataAccess.finalizeFitShowScore).toHaveBeenCalledWith(
        'fitshow-score-123',
        'judge-123'
      );
      expect(result).toEqual(finalizedScore);
    });

    it('should reject finalizing already finalized score', async () => {
      const existingScore = { ...mockFitShowScore, judgeId: 'judge-123', isFinalized: true };

      mockFitShowScoreDataAccess.getFitShowScore.mockResolvedValue(existingScore);

      const event = createMockEvent('finalizeFitShowScore', { id: 'fitshow-score-123' });

      await expect(handler(event)).rejects.toThrow('Fit and show score is already finalized');
      expect(mockFitShowScoreDataAccess.finalizeFitShowScore).not.toHaveBeenCalled();
    });
  });

  describe('listAllFitShowScores', () => {
    it('should list all fit and show scores for admin', async () => {
      const scores = [mockFitShowScore];
      mockFitShowScoreDataAccess.listFitShowScores.mockResolvedValue(scores);

      const event = createMockEvent('listAllFitShowScores', {}, 'admin');
      const result = await handler(event);

      expect(result).toEqual({ items: scores });
    });

    it('should list all fit and show scores for judge', async () => {
      const scores = [mockFitShowScore];
      mockFitShowScoreDataAccess.listFitShowScores.mockResolvedValue(scores);

      const event = createMockEvent('listAllFitShowScores', {}, 'judge');
      const result = await handler(event);

      expect(result).toEqual({ items: scores });
    });

    it('should reject listing all scores for participant', async () => {
      const event = createMockEvent('listAllFitShowScores', {}, 'participant');

      await expect(handler(event)).rejects.toThrow('Forbidden: Judge role required');
      expect(mockFitShowScoreDataAccess.listFitShowScores).not.toHaveBeenCalled();
    });
  });

  describe('getFitShowScoreAuditHistory', () => {
    it('should return audit history for the score', async () => {
      const score = { ...mockFitShowScore, judgeId: 'judge-123' };
      const auditEntries = [{ id: 'audit-1', fitShowScoreId: 'fitshow-score-123', action: 'CREATE' }];

      mockFitShowScoreDataAccess.getFitShowScore.mockResolvedValue(score);
      mockFitShowScoreDataAccess.getFitShowScoreAuditHistory.mockResolvedValue(auditEntries);

      const event = createMockEvent('getFitShowScoreAuditHistory', { fitShowScoreId: 'fitshow-score-123' });
      const result = await handler(event);

      expect(result).toEqual({ items: auditEntries });
    });

    it('should reject audit history for non-existent score', async () => {
      mockFitShowScoreDataAccess.getFitShowScore.mockResolvedValue(null);

      const event = createMockEvent('getFitShowScoreAuditHistory', { fitShowScoreId: 'nonexistent' });

      await expect(handler(event)).rejects.toThrow('Fit and show score with ID nonexistent not found');
    });
  });

  describe('unknown field', () => {
    it('should throw error for unknown field', async () => {
      const event = createMockEvent('unknownField');

      await expect(handler(event)).rejects.toThrow('Unknown field: unknownField');
    });
  });
});