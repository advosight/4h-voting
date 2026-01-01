import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { FitShowScoreDataAccess, CreateFitShowScoreInput } from '../fitShowScoreDataAccess';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123')
}));

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('FitShowScoreDataAccess - Core Functionality', () => {
  let dataAccess: FitShowScoreDataAccess;
  const tableName = 'test-table';

  beforeEach(() => {
    ddbMock.reset();
    dataAccess = new FitShowScoreDataAccess(tableName);
  });

  const createValidInput = (): CreateFitShowScoreInput => ({
    catId: 'cat-123',
    participantName: 'John Doe',
    judgeId: 'judge-456',
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
    
    // Health Examination (24 points)
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
    catAnatomy: 2,
    fourHKnowledge: 3,
    
    // Comments
    appearanceComments: 'Great presentation',
    handlingComments: 'Excellent control'
  });

  describe('createFitShowScore', () => {
    it('should create a fit and show score with correct score calculations', async () => {
      const input = createValidInput();
      ddbMock.on(PutCommand).resolves({});

      const result = await dataAccess.createFitShowScore(input);

      // Verify basic properties
      expect(result.id).toBe('test-uuid-123');
      expect(result.catId).toBe(input.catId);
      expect(result.participantName).toBe(input.participantName);
      expect(result.judgeId).toBe(input.judgeId);
      expect(result.judgeName).toBe(input.judgeName);
      
      // Verify score calculations
      expect(result.appearanceTotal).toBe(17); // 8 + 4 + 5
      expect(result.handlingTotal).toBe(10); // 7 + 3
      expect(result.demonstrationTotal).toBe(14); // 3 + 4 + 3 + 4
      expect(result.healthExaminationTotal).toBe(21); // 2+2+2+2+2+2+2+2+5
      expect(result.groomingCareTotal).toBe(13); // 3 + 7 + 3
      expect(result.knowledgeTotal).toBe(11); // 3 + 3 + 2 + 3
      expect(result.totalScore).toBe(86); // 17+10+14+21+13+11

      // Verify metadata
      expect(result.isFinalized).toBe(false);
      expect(result.modificationCount).toBe(0);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();

      // Verify DynamoDB was called
      expect(ddbMock.commandCalls(PutCommand)).toHaveLength(3);
    });

    it('should calculate maximum possible score correctly', async () => {
      const maxInput: CreateFitShowScoreInput = {
        ...createValidInput(),
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
        
        // Health Examination (24 points max)
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

      ddbMock.on(PutCommand).resolves({});

      const result = await dataAccess.createFitShowScore(maxInput);

      expect(result.appearanceTotal).toBe(20);
      expect(result.handlingTotal).toBe(14);
      expect(result.demonstrationTotal).toBe(16);
      expect(result.healthExaminationTotal).toBe(24);
      expect(result.groomingCareTotal).toBe(14);
      expect(result.knowledgeTotal).toBe(12);
      expect(result.totalScore).toBe(100); // Maximum possible score
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
        createdAt: '2023-01-01T00:00:00.000Z'
      };

      ddbMock.on(GetCommand).resolves({ Item: mockScore });

      const result = await dataAccess.getFitShowScore('test-id');

      expect(result).toEqual({
        id: 'test-id',
        catId: 'cat-123',
        participantName: 'John Doe',
        totalScore: 85,
        createdAt: '2023-01-01T00:00:00.000Z'
      });

      expect(ddbMock.commandCalls(GetCommand)).toHaveLength(1);
    });

    it('should return null when score not found', async () => {
      ddbMock.on(GetCommand).resolves({});

      const result = await dataAccess.getFitShowScore('non-existent');

      expect(result).toBeNull();
    });
  });
});