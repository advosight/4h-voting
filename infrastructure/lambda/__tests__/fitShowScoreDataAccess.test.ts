import { FitShowScoreDataAccess, CreateFitShowScoreInput, UpdateFitShowScoreInput, setDocClient } from '../fitShowScoreDataAccess';
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123')
}));

const mockSend = jest.fn();
const mockDocClient = {
  send: mockSend
};

(DynamoDBDocumentClient.from as jest.Mock) = jest.fn(() => mockDocClient);

describe('FitShowScoreDataAccess', () => {
  let dataAccess: FitShowScoreDataAccess;
  const tableName = 'test-table';

  beforeEach(() => {
    dataAccess = new FitShowScoreDataAccess(tableName);
    setDocClient(mockDocClient as any);
    mockSend.mockClear();
  });

  describe('Score Calculation', () => {
    it('should calculate all category totals correctly', async () => {
      const input: CreateFitShowScoreInput = {
        catId: 'cat-123',
        participantName: 'John Doe',
        judgeId: 'judge-123',
        judgeName: 'Judge Smith',
        
        // Appearance & Demeanor (20 points max)
        attire: 8,
        attentive: 4,
        courteous: 5,
        
        // Handling & Control (14 points max)
        controlEquipment: 9,
        pickupCarrying: 3,
        
        // Demonstration Skills (16 points max)
        showingHeadShape: 3,
        showingBodyType: 4,
        showingTail: 3,
        showingCoatTexture: 4,
        
        // Health Examination (21 points max)
        showingMouthTeethGums: 2,
        conditionMouthTeethGums: 2,
        showingNose: 2,
        showingEyes: 2,
        conditionNoseEyes: 1,
        showingEars: 2,
        earsClean: 2,
        showingToenailsClaws: 3,
        toenailsClipped: 5,
        
        // Grooming & Care (14 points max)
        showingBellyCoatCleanliness: 3,
        coatCleanWellGroomed: 7,
        catHealthCare: 2,
        
        // Knowledge (12 points max)
        generalKnowledge: 3,
        catBreedsShowing: 2,
        catAnatomy: 3,
        fourHKnowledge: 3
      };

      mockSend.mockResolvedValue({});

      const result = await dataAccess.createFitShowScore(input);

      // Verify calculated totals
      expect(result.appearanceTotal).toBe(17); // 8 + 4 + 5
      expect(result.handlingTotal).toBe(12); // 9 + 3
      expect(result.demonstrationTotal).toBe(14); // 3 + 4 + 3 + 4
      expect(result.healthExaminationTotal).toBe(21); // 2 + 2 + 2 + 2 + 1 + 2 + 2 + 3 + 5
      expect(result.groomingCareTotal).toBe(12); // 3 + 7 + 2
      expect(result.knowledgeTotal).toBe(11); // 3 + 2 + 3 + 3
      expect(result.totalScore).toBe(87); // 17 + 12 + 14 + 21 + 12 + 11
    });

    it('should calculate maximum possible score correctly', async () => {
      const maxInput: CreateFitShowScoreInput = {
        catId: 'cat-123',
        participantName: 'John Doe',
        judgeId: 'judge-123',
        judgeName: 'Judge Smith',
        
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

      mockSend.mockResolvedValue({});

      const result = await dataAccess.createFitShowScore(maxInput);

      expect(result.appearanceTotal).toBe(20);
      expect(result.handlingTotal).toBe(14);
      expect(result.demonstrationTotal).toBe(16);
      expect(result.healthExaminationTotal).toBe(24); // 3 + 2 + 2 + 2 + 2 + 2 + 2 + 3 + 6
      expect(result.groomingCareTotal).toBe(14);
      expect(result.knowledgeTotal).toBe(12);
      expect(result.totalScore).toBe(100);
    });

    it('should calculate minimum possible score correctly', async () => {
      const minInput: CreateFitShowScoreInput = {
        catId: 'cat-123',
        participantName: 'John Doe',
        judgeId: 'judge-123',
        judgeName: 'Judge Smith',
        
        // All minimum values
        attire: 1, attentive: 1, courteous: 1,
        controlEquipment: 1, pickupCarrying: 1,
        showingHeadShape: 1, showingBodyType: 1, showingTail: 1, showingCoatTexture: 1,
        showingMouthTeethGums: 1, conditionMouthTeethGums: 1, showingNose: 1, showingEyes: 1,
        conditionNoseEyes: 1, showingEars: 1, earsClean: 1, showingToenailsClaws: 1, toenailsClipped: 1,
        showingBellyCoatCleanliness: 1, coatCleanWellGroomed: 1, catHealthCare: 1,
        generalKnowledge: 1, catBreedsShowing: 1, catAnatomy: 1, fourHKnowledge: 1
      };

      mockSend.mockResolvedValue({});

      const result = await dataAccess.createFitShowScore(minInput);

      expect(result.appearanceTotal).toBe(3); // 1 + 1 + 1
      expect(result.handlingTotal).toBe(2); // 1 + 1
      expect(result.demonstrationTotal).toBe(4); // 1 + 1 + 1 + 1
      expect(result.healthExaminationTotal).toBe(9); // 9 fields × 1 point each
      expect(result.groomingCareTotal).toBe(3); // 1 + 1 + 1
      expect(result.knowledgeTotal).toBe(4); // 1 + 1 + 1 + 1
      expect(result.totalScore).toBe(25); // 3 + 2 + 4 + 9 + 3 + 4
    });
  });

  describe('createFitShowScore', () => {
    it('should create a fit and show score with all required database operations', async () => {
      const input: CreateFitShowScoreInput = {
        catId: 'cat-123',
        participantName: 'John Doe',
        judgeId: 'judge-123',
        judgeName: 'Judge Smith',
        attire: 8, attentive: 4, courteous: 5,
        controlEquipment: 9, pickupCarrying: 3,
        showingHeadShape: 3, showingBodyType: 4, showingTail: 3, showingCoatTexture: 4,
        showingMouthTeethGums: 2, conditionMouthTeethGums: 2, showingNose: 2, showingEyes: 2,
        conditionNoseEyes: 1, showingEars: 2, earsClean: 2, showingToenailsClaws: 3, toenailsClipped: 5,
        showingBellyCoatCleanliness: 3, coatCleanWellGroomed: 7, catHealthCare: 2,
        generalKnowledge: 3, catBreedsShowing: 2, catAnatomy: 3, fourHKnowledge: 3,
        appearanceComments: 'Great presentation',
        handlingComments: 'Excellent control'
      };

      mockSend.mockResolvedValue({});

      const result = await dataAccess.createFitShowScore(input);

      // Verify the result structure
      expect(result.id).toBe('test-uuid-123');
      expect(result.catId).toBe(input.catId);
      expect(result.participantName).toBe(input.participantName);
      expect(result.judgeId).toBe(input.judgeId);
      expect(result.judgeName).toBe(input.judgeName);
      expect(result.isFinalized).toBe(false);
      expect(result.modificationCount).toBe(0);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();

      // Verify three database operations were called (main record + 2 indexes)
      expect(mockSend).toHaveBeenCalledTimes(3);

      // Verify main record - check the command structure
      const firstCall = mockSend.mock.calls[0][0];
      expect(firstCall).toBeDefined();
      expect(firstCall.constructor.name).toBe('PutCommand');

      // Verify cat index
      const secondCall = mockSend.mock.calls[1][0];
      expect(secondCall.constructor.name).toBe('PutCommand');

      // Verify judge index
      const thirdCall = mockSend.mock.calls[2][0];
      expect(thirdCall.constructor.name).toBe('PutCommand');
    });

    it('should handle comments correctly', async () => {
      const input: CreateFitShowScoreInput = {
        catId: 'cat-123',
        participantName: 'John Doe',
        judgeId: 'judge-123',
        judgeName: 'Judge Smith',
        attire: 8, attentive: 4, courteous: 5,
        controlEquipment: 9, pickupCarrying: 3,
        showingHeadShape: 3, showingBodyType: 4, showingTail: 3, showingCoatTexture: 4,
        showingMouthTeethGums: 2, conditionMouthTeethGums: 2, showingNose: 2, showingEyes: 2,
        conditionNoseEyes: 1, showingEars: 2, earsClean: 2, showingToenailsClaws: 3, toenailsClipped: 5,
        showingBellyCoatCleanliness: 3, coatCleanWellGroomed: 7, catHealthCare: 2,
        generalKnowledge: 3, catBreedsShowing: 2, catAnatomy: 3, fourHKnowledge: 3,
        appearanceComments: 'Professional attire',
        handlingComments: 'Confident handling',
        demonstrationComments: 'Clear demonstrations',
        healthExaminationComments: 'Thorough examination',
        groomingCareComments: 'Well-groomed cat',
        knowledgeComments: 'Excellent knowledge'
      };

      mockSend.mockResolvedValue({});

      const result = await dataAccess.createFitShowScore(input);

      expect(result.appearanceComments).toBe('Professional attire');
      expect(result.handlingComments).toBe('Confident handling');
      expect(result.demonstrationComments).toBe('Clear demonstrations');
      expect(result.healthExaminationComments).toBe('Thorough examination');
      expect(result.groomingCareComments).toBe('Well-groomed cat');
      expect(result.knowledgeComments).toBe('Excellent knowledge');
    });
  });

  describe('getFitShowScore', () => {
    it('should retrieve a fit and show score by ID', async () => {
      const mockScore = {
        PK: 'FIT_SHOW_SCORE#test-id',
        SK: 'METADATA',
        id: 'test-id',
        catId: 'cat-123',
        participantName: 'John Doe',
        totalScore: 85,
        isFinalized: false,
        timestamp: '2024-01-01T00:00:00.000Z'
      };

      mockSend.mockResolvedValue({ Item: mockScore });

      const result = await dataAccess.getFitShowScore('test-id');

      expect(result).toEqual({
        id: 'test-id',
        catId: 'cat-123',
        participantName: 'John Doe',
        totalScore: 85,
        isFinalized: false,
        timestamp: '2024-01-01T00:00:00.000Z'
      });

      const call = mockSend.mock.calls[0][0];
      expect(call.constructor.name).toBe('GetCommand');
    });

    it('should return null when score not found', async () => {
      mockSend.mockResolvedValue({});

      const result = await dataAccess.getFitShowScore('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateFitShowScore', () => {
    it('should update a fit and show score and recalculate totals', async () => {
      const existingScore = {
        id: 'test-id',
        catId: 'cat-123',
        participantName: 'John Doe',
        judgeId: 'judge-123',
        judgeName: 'Judge Smith',
        totalScore: 85,
        modificationCount: 0,
        isFinalized: false
      };

      const updateInput: UpdateFitShowScoreInput = {
        id: 'test-id',
        catId: 'cat-123',
        participantName: 'John Doe',
        judgeId: 'judge-123',
        judgeName: 'Judge Smith',
        attire: 9, attentive: 5, courteous: 5, // Updated scores
        controlEquipment: 10, pickupCarrying: 4,
        showingHeadShape: 4, showingBodyType: 4, showingTail: 4, showingCoatTexture: 4,
        showingMouthTeethGums: 3, conditionMouthTeethGums: 2, showingNose: 2, showingEyes: 2,
        conditionNoseEyes: 2, showingEars: 2, earsClean: 2, showingToenailsClaws: 3, toenailsClipped: 6,
        showingBellyCoatCleanliness: 3, coatCleanWellGroomed: 8, catHealthCare: 3,
        generalKnowledge: 3, catBreedsShowing: 3, catAnatomy: 3, fourHKnowledge: 3
      };

      // Mock getFitShowScore call
      mockSend.mockResolvedValueOnce({ Item: { PK: 'test', SK: 'test', ...existingScore } });
      // Mock update operations
      mockSend.mockResolvedValue({});

      const result = await dataAccess.updateFitShowScore(updateInput);

      expect(result.totalScore).toBe(99); // Updated score total
      expect(result.modificationCount).toBe(1);
      expect(result.updatedAt).toBeDefined();

      // Verify four database operations (get + 3 updates)
      expect(mockSend).toHaveBeenCalledTimes(4);
    });

    it('should throw error when score not found', async () => {
      const updateInput: UpdateFitShowScoreInput = {
        id: 'non-existent',
        catId: 'cat-123',
        participantName: 'John Doe',
        judgeId: 'judge-123',
        judgeName: 'Judge Smith',
        attire: 8, attentive: 4, courteous: 5,
        controlEquipment: 9, pickupCarrying: 3,
        showingHeadShape: 3, showingBodyType: 4, showingTail: 3, showingCoatTexture: 4,
        showingMouthTeethGums: 2, conditionMouthTeethGums: 2, showingNose: 2, showingEyes: 2,
        conditionNoseEyes: 1, showingEars: 2, earsClean: 2, showingToenailsClaws: 3, toenailsClipped: 5,
        showingBellyCoatCleanliness: 3, coatCleanWellGroomed: 7, catHealthCare: 2,
        generalKnowledge: 3, catBreedsShowing: 2, catAnatomy: 3, fourHKnowledge: 3
      };

      mockSend.mockResolvedValue({});

      await expect(dataAccess.updateFitShowScore(updateInput)).rejects.toThrow('Fit and show score not found');
    });
  });

  describe('deleteFitShowScore', () => {
    it('should delete a fit and show score and all indexes', async () => {
      const existingScore = {
        id: 'test-id',
        catId: 'cat-123',
        judgeId: 'judge-123',
        isFinalized: false
      };

      // Mock getFitShowScore call
      mockSend.mockResolvedValueOnce({ Item: { PK: 'test', SK: 'test', ...existingScore } });
      // Mock delete operations
      mockSend.mockResolvedValue({});

      await dataAccess.deleteFitShowScore('test-id');

      // Verify four database operations (get + 3 deletes)
      expect(mockSend).toHaveBeenCalledTimes(4);

      // Verify delete operations - should be 3 DeleteCommands
      expect(mockSend.mock.calls[1][0].constructor.name).toBe('DeleteCommand');
      expect(mockSend.mock.calls[2][0].constructor.name).toBe('DeleteCommand');
      expect(mockSend.mock.calls[3][0].constructor.name).toBe('DeleteCommand');
    });

    it('should throw error when score not found', async () => {
      mockSend.mockResolvedValue({});

      await expect(dataAccess.deleteFitShowScore('non-existent')).rejects.toThrow('Fit and show score not found');
    });
  });

  describe('getFitShowScoresByCat', () => {
    it('should retrieve all fit and show scores for a cat', async () => {
      const mockIndexItems = [
        { fitShowScoreId: 'score-1' },
        { fitShowScoreId: 'score-2' }
      ];

      const mockScore1 = { id: 'score-1', totalScore: 85 };
      const mockScore2 = { id: 'score-2', totalScore: 92 };

      // Mock query for cat index
      mockSend.mockResolvedValueOnce({ Items: mockIndexItems });
      // Mock individual score retrievals
      mockSend.mockResolvedValueOnce({ Item: { PK: 'test', SK: 'test', ...mockScore1 } });
      mockSend.mockResolvedValueOnce({ Item: { PK: 'test', SK: 'test', ...mockScore2 } });

      const result = await dataAccess.getFitShowScoresByCat('cat-123');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('score-1');
      expect(result[1].id).toBe('score-2');

      // Verify query was called
      expect(mockSend.mock.calls[0][0].constructor.name).toBe('QueryCommand');
    });

    it('should return empty array when no scores found', async () => {
      mockSend.mockResolvedValue({ Items: [] });

      const result = await dataAccess.getFitShowScoresByCat('cat-123');

      expect(result).toEqual([]);
    });
  });

  describe('getFitShowScoresByJudge', () => {
    it('should retrieve all fit and show scores by a judge', async () => {
      const mockIndexItems = [
        { fitShowScoreId: 'score-1' },
        { fitShowScoreId: 'score-2' }
      ];

      const mockScore1 = { id: 'score-1', totalScore: 85 };
      const mockScore2 = { id: 'score-2', totalScore: 92 };

      // Mock query for judge index
      mockSend.mockResolvedValueOnce({ Items: mockIndexItems });
      // Mock individual score retrievals
      mockSend.mockResolvedValueOnce({ Item: { PK: 'test', SK: 'test', ...mockScore1 } });
      mockSend.mockResolvedValueOnce({ Item: { PK: 'test', SK: 'test', ...mockScore2 } });

      const result = await dataAccess.getFitShowScoresByJudge('judge-123');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('score-1');
      expect(result[1].id).toBe('score-2');

      // Verify query was called
      expect(mockSend.mock.calls[0][0].constructor.name).toBe('QueryCommand');
    });
  });

  describe('listFitShowScores', () => {
    it('should retrieve all fit and show scores', async () => {
      const mockItems = [
        { PK: 'FIT_SHOW_SCORE#1', SK: 'METADATA', id: 'score-1', totalScore: 85 },
        { PK: 'FIT_SHOW_SCORE#2', SK: 'METADATA', id: 'score-2', totalScore: 92 }
      ];

      mockSend.mockResolvedValue({ Items: mockItems });

      const result = await dataAccess.listFitShowScores();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('score-1');
      expect(result[1].id).toBe('score-2');

      // Verify scan was called
      expect(mockSend.mock.calls[0][0].constructor.name).toBe('ScanCommand');
    });
  });

  describe('finalizeFitShowScore', () => {
    it('should finalize a fit and show score', async () => {
      const existingScore = {
        id: 'test-id',
        catId: 'cat-123',
        judgeId: 'judge-123',
        totalScore: 85,
        isFinalized: false
      };

      // Mock getFitShowScore call
      mockSend.mockResolvedValueOnce({ Item: { PK: 'test', SK: 'test', ...existingScore } });
      // Mock update operations
      mockSend.mockResolvedValue({});

      const result = await dataAccess.finalizeFitShowScore('test-id', 'judge-123');

      expect(result.isFinalized).toBe(true);
      expect(result.lastModifiedBy).toBe('judge-123');
      expect(result.updatedAt).toBeDefined();

      // Verify five database operations (get + audit entry + main record + cat index + judge index)
      expect(mockSend).toHaveBeenCalledTimes(5);
    });

    it('should throw error when score not found', async () => {
      mockSend.mockResolvedValue({});

      await expect(dataAccess.finalizeFitShowScore('non-existent', 'judge-123')).rejects.toThrow('Fit and show score not found');
    });
  });
});