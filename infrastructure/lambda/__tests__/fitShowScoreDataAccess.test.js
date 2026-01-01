"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fitShowScoreDataAccess_1 = require("../fitShowScoreDataAccess");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
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
lib_dynamodb_1.DynamoDBDocumentClient.from = jest.fn(() => mockDocClient);
describe('FitShowScoreDataAccess', () => {
    let dataAccess;
    const tableName = 'test-table';
    beforeEach(() => {
        dataAccess = new fitShowScoreDataAccess_1.FitShowScoreDataAccess(tableName);
        (0, fitShowScoreDataAccess_1.setDocClient)(mockDocClient);
        mockSend.mockClear();
    });
    describe('Score Calculation', () => {
        it('should calculate all category totals correctly', async () => {
            const input = {
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
            const maxInput = {
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
            const minInput = {
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
            const input = {
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
            const input = {
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
                isFinalized: false
            };
            mockSend.mockResolvedValue({ Item: mockScore });
            const result = await dataAccess.getFitShowScore('test-id');
            expect(result).toEqual({
                id: 'test-id',
                catId: 'cat-123',
                participantName: 'John Doe',
                totalScore: 85,
                isFinalized: false
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
            const updateInput = {
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
            const updateInput = {
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
            // Verify four database operations (get + 3 updates)
            expect(mockSend).toHaveBeenCalledTimes(4);
        });
        it('should throw error when score not found', async () => {
            mockSend.mockResolvedValue({});
            await expect(dataAccess.finalizeFitShowScore('non-existent', 'judge-123')).rejects.toThrow('Fit and show score not found');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZml0U2hvd1Njb3JlRGF0YUFjY2Vzcy50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZml0U2hvd1Njb3JlRGF0YUFjY2Vzcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsc0VBQW1JO0FBQ25JLHdEQUFpSTtBQUVqSSxlQUFlO0FBQ2YsSUFBSSxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0FBQ3RDLElBQUksQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQztBQUNuQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZCLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLGVBQWUsQ0FBQztDQUNuQyxDQUFDLENBQUMsQ0FBQztBQUVKLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQztBQUMzQixNQUFNLGFBQWEsR0FBRztJQUNwQixJQUFJLEVBQUUsUUFBUTtDQUNmLENBQUM7QUFFRCxxQ0FBc0IsQ0FBQyxJQUFrQixHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsYUFBYSxDQUFDLENBQUM7QUFFMUUsUUFBUSxDQUFDLHdCQUF3QixFQUFFLEdBQUcsRUFBRTtJQUN0QyxJQUFJLFVBQWtDLENBQUM7SUFDdkMsTUFBTSxTQUFTLEdBQUcsWUFBWSxDQUFDO0lBRS9CLFVBQVUsQ0FBQyxHQUFHLEVBQUU7UUFDZCxVQUFVLEdBQUcsSUFBSSwrQ0FBc0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNuRCxJQUFBLHFDQUFZLEVBQUMsYUFBb0IsQ0FBQyxDQUFDO1FBQ25DLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUN2QixDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7UUFDakMsRUFBRSxDQUFDLGdEQUFnRCxFQUFFLEtBQUssSUFB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LENBQUMsQ0FBQztZQUN0QyxNQUFNLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUNoRCxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBRXZDLG9EQUFvRDtZQUNwRCxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUMsQ0FBQyxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMseUNBQXlDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDdkQsUUFBUSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBRS9CLE1BQU0sTUFBTSxDQUFDLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLDhCQUE4QixDQUFDLENBQUM7UUFDN0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRml0U2hvd1Njb3JlRGF0YUFjY2VzcywgQ3JlYXRlRml0U2hvd1Njb3JlSW5wdXQsIFVwZGF0ZUZpdFNob3dTY29yZUlucHV0LCBzZXREb2NDbGllbnQgfSBmcm9tICcuLi9maXRTaG93U2NvcmVEYXRhQWNjZXNzJztcbmltcG9ydCB7IER5bmFtb0RCRG9jdW1lbnRDbGllbnQsIFB1dENvbW1hbmQsIEdldENvbW1hbmQsIERlbGV0ZUNvbW1hbmQsIFF1ZXJ5Q29tbWFuZCwgU2NhbkNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xuXG4vLyBNb2NrIEFXUyBTREtcbmplc3QubW9jaygnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJyk7XG5qZXN0Lm1vY2soJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYicpO1xuamVzdC5tb2NrKCd1dWlkJywgKCkgPT4gKHtcbiAgdjQ6IGplc3QuZm4oKCkgPT4gJ3Rlc3QtdXVpZC0xMjMnKVxufSkpO1xuXG5jb25zdCBtb2NrU2VuZCA9IGplc3QuZm4oKTtcbmNvbnN0IG1vY2tEb2NDbGllbnQgPSB7XG4gIHNlbmQ6IG1vY2tTZW5kXG59O1xuXG4oRHluYW1vREJEb2N1bWVudENsaWVudC5mcm9tIGFzIGplc3QuTW9jaykgPSBqZXN0LmZuKCgpID0+IG1vY2tEb2NDbGllbnQpO1xuXG5kZXNjcmliZSgnRml0U2hvd1Njb3JlRGF0YUFjY2VzcycsICgpID0+IHtcbiAgbGV0IGRhdGFBY2Nlc3M6IEZpdFNob3dTY29yZURhdGFBY2Nlc3M7XG4gIGNvbnN0IHRhYmxlTmFtZSA9ICd0ZXN0LXRhYmxlJztcblxuICBiZWZvcmVFYWNoKCgpID0+IHtcbiAgICBkYXRhQWNjZXNzID0gbmV3IEZpdFNob3dTY29yZURhdGFBY2Nlc3ModGFibGVOYW1lKTtcbiAgICBzZXREb2NDbGllbnQobW9ja0RvY0NsaWVudCBhcyBhbnkpO1xuICAgIG1vY2tTZW5kLm1vY2tDbGVhcigpO1xuICB9KTtcblxuICBkZXNjcmliZSgnU2NvcmUgQ2FsY3VsYXRpb24nLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCBjYWxjdWxhdGUgYWxsIGNhdGVnb3J5IHRvdGFscyBjb3JyZWN0bHknLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBpbnB1dDogQ3JlYXRlRml0U2hvd1Njb3JlSW5wdXQgPSB7XG4gICAgICAgIGNhdElkOiAnY2F0LTEyMycsXG4gICAgICAgIHBhcnRpY2lwYW50TmFtZTogJ0pvaG4gRG9lJyxcbiAgICAgICAganVkZ2VJZDogJ2p1ZGdlLTEyMycsXG4gICAgICAgIGp1ZGdlTmFtZTogJ0p1ZGdlIFNtaXRoJyxcbiAgICAgICAgXG4gICAgICAgIC8vIEFwcGVhcmFuY2UgJiBEZW1lYW5vciAoMjAgcG9pbnRzIG1heClcbiAgICAgICAgYXR0aXJlOiA4LFxuICAgICAgICBhdHRlbnRpdmU6IDQsXG4gICAgICAgIGNvdXJ0ZW91czogNSxcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsaW5nICYgQ29udHJvbCAoMTQgcG9pbnRzIG1heClcbiAgICAgICAgY29udHJvbEVxdWlwbWVudDogOSxcbiAgICAgICAgcGlja3VwQ2Fycnlpbmc6IDMsXG4gICAgICAgIFxuICAgICAgICAvLyBEZW1vbnN0cmF0aW9uIFNraWxscyAoMTYgcG9pbnRzIG1heClcbiAgICAgICAgc2hvd2luZ0hlYWRTaGFwZTogMyxcbiAgICAgICAgc2hvd2luZ0JvZHlUeXBlOiA0LFxuICAgICAgICBzaG93aW5nVGFpbDogMyxcbiAgICAgICAgc2hvd2luZ0NvYXRUZXh0dXJlOiA0LFxuICAgICAgICBcbiAgICAgICAgLy8gSGVhbHRoIEV4YW1pbmF0aW9uICgyMSBwb2ludHMgbWF4KVxuICAgICAgICBzaG93aW5nTW91dGhUZWV0aEd1bXM6IDIsXG4gICAgICAgIGNvbmRpdGlvbk1vdXRoVGVldGhHdW1zOiAyLFxuICAgICAgICBzaG93aW5nTm9zZTogMixcbiAgICAgICAgc2hvd2luZ0V5ZXM6IDIsXG4gICAgICAgIGNvbmRpdGlvbk5vc2VFeWVzOiAxLFxuICAgICAgICBzaG93aW5nRWFyczogMixcbiAgICAgICAgZWFyc0NsZWFuOiAyLFxuICAgICAgICBzaG93aW5nVG9lbmFpbHNDbGF3czogMyxcbiAgICAgICAgdG9lbmFpbHNDbGlwcGVkOiA1LFxuICAgICAgICBcbiAgICAgICAgLy8gR3Jvb21pbmcgJiBDYXJlICgxNCBwb2ludHMgbWF4KVxuICAgICAgICBzaG93aW5nQmVsbHlDb2F0Q2xlYW5saW5lc3M6IDMsXG4gICAgICAgIGNvYXRDbGVhbldlbGxHcm9vbWVkOiA3LFxuICAgICAgICBjYXRIZWFsdGhDYXJlOiAyLFxuICAgICAgICBcbiAgICAgICAgLy8gS25vd2xlZGdlICgxMiBwb2ludHMgbWF4KVxuICAgICAgICBnZW5lcmFsS25vd2xlZGdlOiAzLFxuICAgICAgICBjYXRCcmVlZHNTaG93aW5nOiAyLFxuICAgICAgICBjYXRBbmF0b215OiAzLFxuICAgICAgICBmb3VySEtub3dsZWRnZTogM1xuICAgICAgfTtcblxuICAgICAgbW9ja1NlbmQubW9ja1Jlc29sdmVkVmFsdWUoe30pO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBkYXRhQWNjZXNzLmNyZWF0ZUZpdFNob3dTY29yZShpbnB1dCk7XG5cbiAgICAgIC8vIFZlcmlmeSBjYWxjdWxhdGVkIHRvdGFsc1xuICAgICAgZXhwZWN0KHJlc3VsdC5hcHBlYXJhbmNlVG90YWwpLnRvQmUoMTcpOyAvLyA4ICsgNCArIDVcbiAgICAgIGV4cGVjdChyZXN1bHQuaGFuZGxpbmdUb3RhbCkudG9CZSgxMik7IC8vIDkgKyAzXG4gICAgICBleHBlY3QocmVzdWx0LmRlbW9uc3RyYXRpb25Ub3RhbCkudG9CZSgxNCk7IC8vIDMgKyA0ICsgMyArIDRcbiAgICAgIGV4cGVjdChyZXN1bHQuaGVhbHRoRXhhbWluYXRpb25Ub3RhbCkudG9CZSgyMSk7IC8vIDIgKyAyICsgMiArIDIgKyAxICsgMiArIDIgKyAzICsgNVxuICAgICAgZXhwZWN0KHJlc3VsdC5ncm9vbWluZ0NhcmVUb3RhbCkudG9CZSgxMik7IC8vIDMgKyA3ICsgMlxuICAgICAgZXhwZWN0KHJlc3VsdC5rbm93bGVkZ2VUb3RhbCkudG9CZSgxMSk7IC8vIDMgKyAyICsgMyArIDNcbiAgICAgIGV4cGVjdChyZXN1bHQudG90YWxTY29yZSkudG9CZSg4Nyk7IC8vIDE3ICsgMTIgKyAxNCArIDIxICsgMTIgKyAxMVxuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBjYWxjdWxhdGUgbWF4aW11bSBwb3NzaWJsZSBzY29yZSBjb3JyZWN0bHknLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBtYXhJbnB1dDogQ3JlYXRlRml0U2hvd1Njb3JlSW5wdXQgPSB7XG4gICAgICAgIGNhdElkOiAnY2F0LTEyMycsXG4gICAgICAgIHBhcnRpY2lwYW50TmFtZTogJ0pvaG4gRG9lJyxcbiAgICAgICAganVkZ2VJZDogJ2p1ZGdlLTEyMycsXG4gICAgICAgIGp1ZGdlTmFtZTogJ0p1ZGdlIFNtaXRoJyxcbiAgICAgICAgXG4gICAgICAgIC8vIEFwcGVhcmFuY2UgJiBEZW1lYW5vciAoMjAgcG9pbnRzIG1heClcbiAgICAgICAgYXR0aXJlOiAxMCxcbiAgICAgICAgYXR0ZW50aXZlOiA1LFxuICAgICAgICBjb3VydGVvdXM6IDUsXG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGluZyAmIENvbnRyb2wgKDE0IHBvaW50cyBtYXgpXG4gICAgICAgIGNvbnRyb2xFcXVpcG1lbnQ6IDEwLFxuICAgICAgICBwaWNrdXBDYXJyeWluZzogNCxcbiAgICAgICAgXG4gICAgICAgIC8vIERlbW9uc3RyYXRpb24gU2tpbGxzICgxNiBwb2ludHMgbWF4KVxuICAgICAgICBzaG93aW5nSGVhZFNoYXBlOiA0LFxuICAgICAgICBzaG93aW5nQm9keVR5cGU6IDQsXG4gICAgICAgIHNob3dpbmdUYWlsOiA0LFxuICAgICAgICBzaG93aW5nQ29hdFRleHR1cmU6IDQsXG4gICAgICAgIFxuICAgICAgICAvLyBIZWFsdGggRXhhbWluYXRpb24gKDIxIHBvaW50cyBtYXgpXG4gICAgICAgIHNob3dpbmdNb3V0aFRlZXRoR3VtczogMyxcbiAgICAgICAgY29uZGl0aW9uTW91dGhUZWV0aEd1bXM6IDIsXG4gICAgICAgIHNob3dpbmdOb3NlOiAyLFxuICAgICAgICBzaG93aW5nRXllczogMixcbiAgICAgICAgY29uZGl0aW9uTm9zZUV5ZXM6IDIsXG4gICAgICAgIHNob3dpbmdFYXJzOiAyLFxuICAgICAgICBlYXJzQ2xlYW46IDIsXG4gICAgICAgIHNob3dpbmdUb2VuYWlsc0NsYXdzOiAzLFxuICAgICAgICB0b2VuYWlsc0NsaXBwZWQ6IDYsXG4gICAgICAgIFxuICAgICAgICAvLyBHcm9vbWluZyAmIENhcmUgKDE0IHBvaW50cyBtYXgpXG4gICAgICAgIHNob3dpbmdCZWxseUNvYXRDbGVhbmxpbmVzczogMyxcbiAgICAgICAgY29hdENsZWFuV2VsbEdyb29tZWQ6IDgsXG4gICAgICAgIGNhdEhlYWx0aENhcmU6IDMsXG4gICAgICAgIFxuICAgICAgICAvLyBLbm93bGVkZ2UgKDEyIHBvaW50cyBtYXgpXG4gICAgICAgIGdlbmVyYWxLbm93bGVkZ2U6IDMsXG4gICAgICAgIGNhdEJyZWVkc1Nob3dpbmc6IDMsXG4gICAgICAgIGNhdEFuYXRvbXk6IDMsXG4gICAgICAgIGZvdXJIS25vd2xlZGdlOiAzXG4gICAgICB9O1xuXG4gICAgICBtb2NrU2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZSh7fSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGRhdGFBY2Nlc3MuY3JlYXRlRml0U2hvd1Njb3JlKG1heElucHV0KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdC5hcHBlYXJhbmNlVG90YWwpLnRvQmUoMjApO1xuICAgICAgZXhwZWN0KHJlc3VsdC5oYW5kbGluZ1RvdGFsKS50b0JlKDE0KTtcbiAgICAgIGV4cGVjdChyZXN1bHQuZGVtb25zdHJhdGlvblRvdGFsKS50b0JlKDE2KTtcbiAgICAgIGV4cGVjdChyZXN1bHQuaGVhbHRoRXhhbWluYXRpb25Ub3RhbCkudG9CZSgyNCk7IC8vIDMgKyAyICsgMiArIDIgKyAyICsgMiArIDIgKyAzICsgNlxuICAgICAgZXhwZWN0KHJlc3VsdC5ncm9vbWluZ0NhcmVUb3RhbCkudG9CZSgxNCk7XG4gICAgICBleHBlY3QocmVzdWx0Lmtub3dsZWRnZVRvdGFsKS50b0JlKDEyKTtcbiAgICAgIGV4cGVjdChyZXN1bHQudG90YWxTY29yZSkudG9CZSgxMDApO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBjYWxjdWxhdGUgbWluaW11bSBwb3NzaWJsZSBzY29yZSBjb3JyZWN0bHknLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBtaW5JbnB1dDogQ3JlYXRlRml0U2hvd1Njb3JlSW5wdXQgPSB7XG4gICAgICAgIGNhdElkOiAnY2F0LTEyMycsXG4gICAgICAgIHBhcnRpY2lwYW50TmFtZTogJ0pvaG4gRG9lJyxcbiAgICAgICAganVkZ2VJZDogJ2p1ZGdlLTEyMycsXG4gICAgICAgIGp1ZGdlTmFtZTogJ0p1ZGdlIFNtaXRoJyxcbiAgICAgICAgXG4gICAgICAgIC8vIEFsbCBtaW5pbXVtIHZhbHVlc1xuICAgICAgICBhdHRpcmU6IDEsIGF0dGVudGl2ZTogMSwgY291cnRlb3VzOiAxLFxuICAgICAgICBjb250cm9sRXF1aXBtZW50OiAxLCBwaWNrdXBDYXJyeWluZzogMSxcbiAgICAgICAgc2hvd2luZ0hlYWRTaGFwZTogMSwgc2hvd2luZ0JvZHlUeXBlOiAxLCBzaG93aW5nVGFpbDogMSwgc2hvd2luZ0NvYXRUZXh0dXJlOiAxLFxuICAgICAgICBzaG93aW5nTW91dGhUZWV0aEd1bXM6IDEsIGNvbmRpdGlvbk1vdXRoVGVldGhHdW1zOiAxLCBzaG93aW5nTm9zZTogMSwgc2hvd2luZ0V5ZXM6IDEsXG4gICAgICAgIGNvbmRpdGlvbk5vc2VFeWVzOiAxLCBzaG93aW5nRWFyczogMSwgZWFyc0NsZWFuOiAxLCBzaG93aW5nVG9lbmFpbHNDbGF3czogMSwgdG9lbmFpbHNDbGlwcGVkOiAxLFxuICAgICAgICBzaG93aW5nQmVsbHlDb2F0Q2xlYW5saW5lc3M6IDEsIGNvYXRDbGVhbldlbGxHcm9vbWVkOiAxLCBjYXRIZWFsdGhDYXJlOiAxLFxuICAgICAgICBnZW5lcmFsS25vd2xlZGdlOiAxLCBjYXRCcmVlZHNTaG93aW5nOiAxLCBjYXRBbmF0b215OiAxLCBmb3VySEtub3dsZWRnZTogMVxuICAgICAgfTtcblxuICAgICAgbW9ja1NlbmQubW9ja1Jlc29sdmVkVmFsdWUoe30pO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBkYXRhQWNjZXNzLmNyZWF0ZUZpdFNob3dTY29yZShtaW5JbnB1dCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQuYXBwZWFyYW5jZVRvdGFsKS50b0JlKDMpOyAvLyAxICsgMSArIDFcbiAgICAgIGV4cGVjdChyZXN1bHQuaGFuZGxpbmdUb3RhbCkudG9CZSgyKTsgLy8gMSArIDFcbiAgICAgIGV4cGVjdChyZXN1bHQuZGVtb25zdHJhdGlvblRvdGFsKS50b0JlKDQpOyAvLyAxICsgMSArIDEgKyAxXG4gICAgICBleHBlY3QocmVzdWx0LmhlYWx0aEV4YW1pbmF0aW9uVG90YWwpLnRvQmUoOSk7IC8vIDkgZmllbGRzIMOXIDEgcG9pbnQgZWFjaFxuICAgICAgZXhwZWN0KHJlc3VsdC5ncm9vbWluZ0NhcmVUb3RhbCkudG9CZSgzKTsgLy8gMSArIDEgKyAxXG4gICAgICBleHBlY3QocmVzdWx0Lmtub3dsZWRnZVRvdGFsKS50b0JlKDQpOyAvLyAxICsgMSArIDEgKyAxXG4gICAgICBleHBlY3QocmVzdWx0LnRvdGFsU2NvcmUpLnRvQmUoMjUpOyAvLyAzICsgMiArIDQgKyA5ICsgMyArIDRcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2NyZWF0ZUZpdFNob3dTY29yZScsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIGNyZWF0ZSBhIGZpdCBhbmQgc2hvdyBzY29yZSB3aXRoIGFsbCByZXF1aXJlZCBkYXRhYmFzZSBvcGVyYXRpb25zJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgaW5wdXQ6IENyZWF0ZUZpdFNob3dTY29yZUlucHV0ID0ge1xuICAgICAgICBjYXRJZDogJ2NhdC0xMjMnLFxuICAgICAgICBwYXJ0aWNpcGFudE5hbWU6ICdKb2huIERvZScsXG4gICAgICAgIGp1ZGdlSWQ6ICdqdWRnZS0xMjMnLFxuICAgICAgICBqdWRnZU5hbWU6ICdKdWRnZSBTbWl0aCcsXG4gICAgICAgIGF0dGlyZTogOCwgYXR0ZW50aXZlOiA0LCBjb3VydGVvdXM6IDUsXG4gICAgICAgIGNvbnRyb2xFcXVpcG1lbnQ6IDksIHBpY2t1cENhcnJ5aW5nOiAzLFxuICAgICAgICBzaG93aW5nSGVhZFNoYXBlOiAzLCBzaG93aW5nQm9keVR5cGU6IDQsIHNob3dpbmdUYWlsOiAzLCBzaG93aW5nQ29hdFRleHR1cmU6IDQsXG4gICAgICAgIHNob3dpbmdNb3V0aFRlZXRoR3VtczogMiwgY29uZGl0aW9uTW91dGhUZWV0aEd1bXM6IDIsIHNob3dpbmdOb3NlOiAyLCBzaG93aW5nRXllczogMixcbiAgICAgICAgY29uZGl0aW9uTm9zZUV5ZXM6IDEsIHNob3dpbmdFYXJzOiAyLCBlYXJzQ2xlYW46IDIsIHNob3dpbmdUb2VuYWlsc0NsYXdzOiAzLCB0b2VuYWlsc0NsaXBwZWQ6IDUsXG4gICAgICAgIHNob3dpbmdCZWxseUNvYXRDbGVhbmxpbmVzczogMywgY29hdENsZWFuV2VsbEdyb29tZWQ6IDcsIGNhdEhlYWx0aENhcmU6IDIsXG4gICAgICAgIGdlbmVyYWxLbm93bGVkZ2U6IDMsIGNhdEJyZWVkc1Nob3dpbmc6IDIsIGNhdEFuYXRvbXk6IDMsIGZvdXJIS25vd2xlZGdlOiAzLFxuICAgICAgICBhcHBlYXJhbmNlQ29tbWVudHM6ICdHcmVhdCBwcmVzZW50YXRpb24nLFxuICAgICAgICBoYW5kbGluZ0NvbW1lbnRzOiAnRXhjZWxsZW50IGNvbnRyb2wnXG4gICAgICB9O1xuXG4gICAgICBtb2NrU2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZSh7fSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGRhdGFBY2Nlc3MuY3JlYXRlRml0U2hvd1Njb3JlKGlucHV0KTtcblxuICAgICAgLy8gVmVyaWZ5IHRoZSByZXN1bHQgc3RydWN0dXJlXG4gICAgICBleHBlY3QocmVzdWx0LmlkKS50b0JlKCd0ZXN0LXV1aWQtMTIzJyk7XG4gICAgICBleHBlY3QocmVzdWx0LmNhdElkKS50b0JlKGlucHV0LmNhdElkKTtcbiAgICAgIGV4cGVjdChyZXN1bHQucGFydGljaXBhbnROYW1lKS50b0JlKGlucHV0LnBhcnRpY2lwYW50TmFtZSk7XG4gICAgICBleHBlY3QocmVzdWx0Lmp1ZGdlSWQpLnRvQmUoaW5wdXQuanVkZ2VJZCk7XG4gICAgICBleHBlY3QocmVzdWx0Lmp1ZGdlTmFtZSkudG9CZShpbnB1dC5qdWRnZU5hbWUpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5pc0ZpbmFsaXplZCkudG9CZShmYWxzZSk7XG4gICAgICBleHBlY3QocmVzdWx0Lm1vZGlmaWNhdGlvbkNvdW50KS50b0JlKDApO1xuICAgICAgZXhwZWN0KHJlc3VsdC5jcmVhdGVkQXQpLnRvQmVEZWZpbmVkKCk7XG4gICAgICBleHBlY3QocmVzdWx0LnVwZGF0ZWRBdCkudG9CZURlZmluZWQoKTtcblxuICAgICAgLy8gVmVyaWZ5IHRocmVlIGRhdGFiYXNlIG9wZXJhdGlvbnMgd2VyZSBjYWxsZWQgKG1haW4gcmVjb3JkICsgMiBpbmRleGVzKVxuICAgICAgZXhwZWN0KG1vY2tTZW5kKS50b0hhdmVCZWVuQ2FsbGVkVGltZXMoMyk7XG5cbiAgICAgIC8vIFZlcmlmeSBtYWluIHJlY29yZCAtIGNoZWNrIHRoZSBjb21tYW5kIHN0cnVjdHVyZVxuICAgICAgY29uc3QgZmlyc3RDYWxsID0gbW9ja1NlbmQubW9jay5jYWxsc1swXVswXTtcbiAgICAgIGV4cGVjdChmaXJzdENhbGwpLnRvQmVEZWZpbmVkKCk7XG4gICAgICBleHBlY3QoZmlyc3RDYWxsLmNvbnN0cnVjdG9yLm5hbWUpLnRvQmUoJ1B1dENvbW1hbmQnKTtcblxuICAgICAgLy8gVmVyaWZ5IGNhdCBpbmRleFxuICAgICAgY29uc3Qgc2Vjb25kQ2FsbCA9IG1vY2tTZW5kLm1vY2suY2FsbHNbMV1bMF07XG4gICAgICBleHBlY3Qoc2Vjb25kQ2FsbC5jb25zdHJ1Y3Rvci5uYW1lKS50b0JlKCdQdXRDb21tYW5kJyk7XG5cbiAgICAgIC8vIFZlcmlmeSBqdWRnZSBpbmRleFxuICAgICAgY29uc3QgdGhpcmRDYWxsID0gbW9ja1NlbmQubW9jay5jYWxsc1syXVswXTtcbiAgICAgIGV4cGVjdCh0aGlyZENhbGwuY29uc3RydWN0b3IubmFtZSkudG9CZSgnUHV0Q29tbWFuZCcpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBoYW5kbGUgY29tbWVudHMgY29ycmVjdGx5JywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgaW5wdXQ6IENyZWF0ZUZpdFNob3dTY29yZUlucHV0ID0ge1xuICAgICAgICBjYXRJZDogJ2NhdC0xMjMnLFxuICAgICAgICBwYXJ0aWNpcGFudE5hbWU6ICdKb2huIERvZScsXG4gICAgICAgIGp1ZGdlSWQ6ICdqdWRnZS0xMjMnLFxuICAgICAgICBqdWRnZU5hbWU6ICdKdWRnZSBTbWl0aCcsXG4gICAgICAgIGF0dGlyZTogOCwgYXR0ZW50aXZlOiA0LCBjb3VydGVvdXM6IDUsXG4gICAgICAgIGNvbnRyb2xFcXVpcG1lbnQ6IDksIHBpY2t1cENhcnJ5aW5nOiAzLFxuICAgICAgICBzaG93aW5nSGVhZFNoYXBlOiAzLCBzaG93aW5nQm9keVR5cGU6IDQsIHNob3dpbmdUYWlsOiAzLCBzaG93aW5nQ29hdFRleHR1cmU6IDQsXG4gICAgICAgIHNob3dpbmdNb3V0aFRlZXRoR3VtczogMiwgY29uZGl0aW9uTW91dGhUZWV0aEd1bXM6IDIsIHNob3dpbmdOb3NlOiAyLCBzaG93aW5nRXllczogMixcbiAgICAgICAgY29uZGl0aW9uTm9zZUV5ZXM6IDEsIHNob3dpbmdFYXJzOiAyLCBlYXJzQ2xlYW46IDIsIHNob3dpbmdUb2VuYWlsc0NsYXdzOiAzLCB0b2VuYWlsc0NsaXBwZWQ6IDUsXG4gICAgICAgIHNob3dpbmdCZWxseUNvYXRDbGVhbmxpbmVzczogMywgY29hdENsZWFuV2VsbEdyb29tZWQ6IDcsIGNhdEhlYWx0aENhcmU6IDIsXG4gICAgICAgIGdlbmVyYWxLbm93bGVkZ2U6IDMsIGNhdEJyZWVkc1Nob3dpbmc6IDIsIGNhdEFuYXRvbXk6IDMsIGZvdXJIS25vd2xlZGdlOiAzLFxuICAgICAgICBhcHBlYXJhbmNlQ29tbWVudHM6ICdQcm9mZXNzaW9uYWwgYXR0aXJlJyxcbiAgICAgICAgaGFuZGxpbmdDb21tZW50czogJ0NvbmZpZGVudCBoYW5kbGluZycsXG4gICAgICAgIGRlbW9uc3RyYXRpb25Db21tZW50czogJ0NsZWFyIGRlbW9uc3RyYXRpb25zJyxcbiAgICAgICAgaGVhbHRoRXhhbWluYXRpb25Db21tZW50czogJ1Rob3JvdWdoIGV4YW1pbmF0aW9uJyxcbiAgICAgICAgZ3Jvb21pbmdDYXJlQ29tbWVudHM6ICdXZWxsLWdyb29tZWQgY2F0JyxcbiAgICAgICAga25vd2xlZGdlQ29tbWVudHM6ICdFeGNlbGxlbnQga25vd2xlZGdlJ1xuICAgICAgfTtcblxuICAgICAgbW9ja1NlbmQubW9ja1Jlc29sdmVkVmFsdWUoe30pO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBkYXRhQWNjZXNzLmNyZWF0ZUZpdFNob3dTY29yZShpbnB1dCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQuYXBwZWFyYW5jZUNvbW1lbnRzKS50b0JlKCdQcm9mZXNzaW9uYWwgYXR0aXJlJyk7XG4gICAgICBleHBlY3QocmVzdWx0LmhhbmRsaW5nQ29tbWVudHMpLnRvQmUoJ0NvbmZpZGVudCBoYW5kbGluZycpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5kZW1vbnN0cmF0aW9uQ29tbWVudHMpLnRvQmUoJ0NsZWFyIGRlbW9uc3RyYXRpb25zJyk7XG4gICAgICBleHBlY3QocmVzdWx0LmhlYWx0aEV4YW1pbmF0aW9uQ29tbWVudHMpLnRvQmUoJ1Rob3JvdWdoIGV4YW1pbmF0aW9uJyk7XG4gICAgICBleHBlY3QocmVzdWx0Lmdyb29taW5nQ2FyZUNvbW1lbnRzKS50b0JlKCdXZWxsLWdyb29tZWQgY2F0Jyk7XG4gICAgICBleHBlY3QocmVzdWx0Lmtub3dsZWRnZUNvbW1lbnRzKS50b0JlKCdFeGNlbGxlbnQga25vd2xlZGdlJyk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdnZXRGaXRTaG93U2NvcmUnLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCByZXRyaWV2ZSBhIGZpdCBhbmQgc2hvdyBzY29yZSBieSBJRCcsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IG1vY2tTY29yZSA9IHtcbiAgICAgICAgUEs6ICdGSVRfU0hPV19TQ09SRSN0ZXN0LWlkJyxcbiAgICAgICAgU0s6ICdNRVRBREFUQScsXG4gICAgICAgIGlkOiAndGVzdC1pZCcsXG4gICAgICAgIGNhdElkOiAnY2F0LTEyMycsXG4gICAgICAgIHBhcnRpY2lwYW50TmFtZTogJ0pvaG4gRG9lJyxcbiAgICAgICAgdG90YWxTY29yZTogODUsXG4gICAgICAgIGlzRmluYWxpemVkOiBmYWxzZVxuICAgICAgfTtcblxuICAgICAgbW9ja1NlbmQubW9ja1Jlc29sdmVkVmFsdWUoeyBJdGVtOiBtb2NrU2NvcmUgfSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGRhdGFBY2Nlc3MuZ2V0Rml0U2hvd1Njb3JlKCd0ZXN0LWlkJyk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvRXF1YWwoe1xuICAgICAgICBpZDogJ3Rlc3QtaWQnLFxuICAgICAgICBjYXRJZDogJ2NhdC0xMjMnLFxuICAgICAgICBwYXJ0aWNpcGFudE5hbWU6ICdKb2huIERvZScsXG4gICAgICAgIHRvdGFsU2NvcmU6IDg1LFxuICAgICAgICBpc0ZpbmFsaXplZDogZmFsc2VcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBjYWxsID0gbW9ja1NlbmQubW9jay5jYWxsc1swXVswXTtcbiAgICAgIGV4cGVjdChjYWxsLmNvbnN0cnVjdG9yLm5hbWUpLnRvQmUoJ0dldENvbW1hbmQnKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmV0dXJuIG51bGwgd2hlbiBzY29yZSBub3QgZm91bmQnLCBhc3luYyAoKSA9PiB7XG4gICAgICBtb2NrU2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZSh7fSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGRhdGFBY2Nlc3MuZ2V0Rml0U2hvd1Njb3JlKCdub24tZXhpc3RlbnQnKTtcblxuICAgICAgZXhwZWN0KHJlc3VsdCkudG9CZU51bGwoKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ3VwZGF0ZUZpdFNob3dTY29yZScsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIHVwZGF0ZSBhIGZpdCBhbmQgc2hvdyBzY29yZSBhbmQgcmVjYWxjdWxhdGUgdG90YWxzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZXhpc3RpbmdTY29yZSA9IHtcbiAgICAgICAgaWQ6ICd0ZXN0LWlkJyxcbiAgICAgICAgY2F0SWQ6ICdjYXQtMTIzJyxcbiAgICAgICAgcGFydGljaXBhbnROYW1lOiAnSm9obiBEb2UnLFxuICAgICAgICBqdWRnZUlkOiAnanVkZ2UtMTIzJyxcbiAgICAgICAganVkZ2VOYW1lOiAnSnVkZ2UgU21pdGgnLFxuICAgICAgICB0b3RhbFNjb3JlOiA4NSxcbiAgICAgICAgbW9kaWZpY2F0aW9uQ291bnQ6IDAsXG4gICAgICAgIGlzRmluYWxpemVkOiBmYWxzZVxuICAgICAgfTtcblxuICAgICAgY29uc3QgdXBkYXRlSW5wdXQ6IFVwZGF0ZUZpdFNob3dTY29yZUlucHV0ID0ge1xuICAgICAgICBpZDogJ3Rlc3QtaWQnLFxuICAgICAgICBjYXRJZDogJ2NhdC0xMjMnLFxuICAgICAgICBwYXJ0aWNpcGFudE5hbWU6ICdKb2huIERvZScsXG4gICAgICAgIGp1ZGdlSWQ6ICdqdWRnZS0xMjMnLFxuICAgICAgICBqdWRnZU5hbWU6ICdKdWRnZSBTbWl0aCcsXG4gICAgICAgIGF0dGlyZTogOSwgYXR0ZW50aXZlOiA1LCBjb3VydGVvdXM6IDUsIC8vIFVwZGF0ZWQgc2NvcmVzXG4gICAgICAgIGNvbnRyb2xFcXVpcG1lbnQ6IDEwLCBwaWNrdXBDYXJyeWluZzogNCxcbiAgICAgICAgc2hvd2luZ0hlYWRTaGFwZTogNCwgc2hvd2luZ0JvZHlUeXBlOiA0LCBzaG93aW5nVGFpbDogNCwgc2hvd2luZ0NvYXRUZXh0dXJlOiA0LFxuICAgICAgICBzaG93aW5nTW91dGhUZWV0aEd1bXM6IDMsIGNvbmRpdGlvbk1vdXRoVGVldGhHdW1zOiAyLCBzaG93aW5nTm9zZTogMiwgc2hvd2luZ0V5ZXM6IDIsXG4gICAgICAgIGNvbmRpdGlvbk5vc2VFeWVzOiAyLCBzaG93aW5nRWFyczogMiwgZWFyc0NsZWFuOiAyLCBzaG93aW5nVG9lbmFpbHNDbGF3czogMywgdG9lbmFpbHNDbGlwcGVkOiA2LFxuICAgICAgICBzaG93aW5nQmVsbHlDb2F0Q2xlYW5saW5lc3M6IDMsIGNvYXRDbGVhbldlbGxHcm9vbWVkOiA4LCBjYXRIZWFsdGhDYXJlOiAzLFxuICAgICAgICBnZW5lcmFsS25vd2xlZGdlOiAzLCBjYXRCcmVlZHNTaG93aW5nOiAzLCBjYXRBbmF0b215OiAzLCBmb3VySEtub3dsZWRnZTogM1xuICAgICAgfTtcblxuICAgICAgLy8gTW9jayBnZXRGaXRTaG93U2NvcmUgY2FsbFxuICAgICAgbW9ja1NlbmQubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHsgSXRlbTogeyBQSzogJ3Rlc3QnLCBTSzogJ3Rlc3QnLCAuLi5leGlzdGluZ1Njb3JlIH0gfSk7XG4gICAgICAvLyBNb2NrIHVwZGF0ZSBvcGVyYXRpb25zXG4gICAgICBtb2NrU2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZSh7fSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGRhdGFBY2Nlc3MudXBkYXRlRml0U2hvd1Njb3JlKHVwZGF0ZUlucHV0KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdC50b3RhbFNjb3JlKS50b0JlKDk5KTsgLy8gVXBkYXRlZCBzY29yZSB0b3RhbFxuICAgICAgZXhwZWN0KHJlc3VsdC5tb2RpZmljYXRpb25Db3VudCkudG9CZSgxKTtcbiAgICAgIGV4cGVjdChyZXN1bHQudXBkYXRlZEF0KS50b0JlRGVmaW5lZCgpO1xuXG4gICAgICAvLyBWZXJpZnkgZm91ciBkYXRhYmFzZSBvcGVyYXRpb25zIChnZXQgKyAzIHVwZGF0ZXMpXG4gICAgICBleHBlY3QobW9ja1NlbmQpLnRvSGF2ZUJlZW5DYWxsZWRUaW1lcyg0KTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgdGhyb3cgZXJyb3Igd2hlbiBzY29yZSBub3QgZm91bmQnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCB1cGRhdGVJbnB1dDogVXBkYXRlRml0U2hvd1Njb3JlSW5wdXQgPSB7XG4gICAgICAgIGlkOiAnbm9uLWV4aXN0ZW50JyxcbiAgICAgICAgY2F0SWQ6ICdjYXQtMTIzJyxcbiAgICAgICAgcGFydGljaXBhbnROYW1lOiAnSm9obiBEb2UnLFxuICAgICAgICBqdWRnZUlkOiAnanVkZ2UtMTIzJyxcbiAgICAgICAganVkZ2VOYW1lOiAnSnVkZ2UgU21pdGgnLFxuICAgICAgICBhdHRpcmU6IDgsIGF0dGVudGl2ZTogNCwgY291cnRlb3VzOiA1LFxuICAgICAgICBjb250cm9sRXF1aXBtZW50OiA5LCBwaWNrdXBDYXJyeWluZzogMyxcbiAgICAgICAgc2hvd2luZ0hlYWRTaGFwZTogMywgc2hvd2luZ0JvZHlUeXBlOiA0LCBzaG93aW5nVGFpbDogMywgc2hvd2luZ0NvYXRUZXh0dXJlOiA0LFxuICAgICAgICBzaG93aW5nTW91dGhUZWV0aEd1bXM6IDIsIGNvbmRpdGlvbk1vdXRoVGVldGhHdW1zOiAyLCBzaG93aW5nTm9zZTogMiwgc2hvd2luZ0V5ZXM6IDIsXG4gICAgICAgIGNvbmRpdGlvbk5vc2VFeWVzOiAxLCBzaG93aW5nRWFyczogMiwgZWFyc0NsZWFuOiAyLCBzaG93aW5nVG9lbmFpbHNDbGF3czogMywgdG9lbmFpbHNDbGlwcGVkOiA1LFxuICAgICAgICBzaG93aW5nQmVsbHlDb2F0Q2xlYW5saW5lc3M6IDMsIGNvYXRDbGVhbldlbGxHcm9vbWVkOiA3LCBjYXRIZWFsdGhDYXJlOiAyLFxuICAgICAgICBnZW5lcmFsS25vd2xlZGdlOiAzLCBjYXRCcmVlZHNTaG93aW5nOiAyLCBjYXRBbmF0b215OiAzLCBmb3VySEtub3dsZWRnZTogM1xuICAgICAgfTtcblxuICAgICAgbW9ja1NlbmQubW9ja1Jlc29sdmVkVmFsdWUoe30pO1xuXG4gICAgICBhd2FpdCBleHBlY3QoZGF0YUFjY2Vzcy51cGRhdGVGaXRTaG93U2NvcmUodXBkYXRlSW5wdXQpKS5yZWplY3RzLnRvVGhyb3coJ0ZpdCBhbmQgc2hvdyBzY29yZSBub3QgZm91bmQnKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2RlbGV0ZUZpdFNob3dTY29yZScsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIGRlbGV0ZSBhIGZpdCBhbmQgc2hvdyBzY29yZSBhbmQgYWxsIGluZGV4ZXMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBleGlzdGluZ1Njb3JlID0ge1xuICAgICAgICBpZDogJ3Rlc3QtaWQnLFxuICAgICAgICBjYXRJZDogJ2NhdC0xMjMnLFxuICAgICAgICBqdWRnZUlkOiAnanVkZ2UtMTIzJyxcbiAgICAgICAgaXNGaW5hbGl6ZWQ6IGZhbHNlXG4gICAgICB9O1xuXG4gICAgICAvLyBNb2NrIGdldEZpdFNob3dTY29yZSBjYWxsXG4gICAgICBtb2NrU2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UoeyBJdGVtOiB7IFBLOiAndGVzdCcsIFNLOiAndGVzdCcsIC4uLmV4aXN0aW5nU2NvcmUgfSB9KTtcbiAgICAgIC8vIE1vY2sgZGVsZXRlIG9wZXJhdGlvbnNcbiAgICAgIG1vY2tTZW5kLm1vY2tSZXNvbHZlZFZhbHVlKHt9KTtcblxuICAgICAgYXdhaXQgZGF0YUFjY2Vzcy5kZWxldGVGaXRTaG93U2NvcmUoJ3Rlc3QtaWQnKTtcblxuICAgICAgLy8gVmVyaWZ5IGZvdXIgZGF0YWJhc2Ugb3BlcmF0aW9ucyAoZ2V0ICsgMyBkZWxldGVzKVxuICAgICAgZXhwZWN0KG1vY2tTZW5kKS50b0hhdmVCZWVuQ2FsbGVkVGltZXMoNCk7XG5cbiAgICAgIC8vIFZlcmlmeSBkZWxldGUgb3BlcmF0aW9ucyAtIHNob3VsZCBiZSAzIERlbGV0ZUNvbW1hbmRzXG4gICAgICBleHBlY3QobW9ja1NlbmQubW9jay5jYWxsc1sxXVswXS5jb25zdHJ1Y3Rvci5uYW1lKS50b0JlKCdEZWxldGVDb21tYW5kJyk7XG4gICAgICBleHBlY3QobW9ja1NlbmQubW9jay5jYWxsc1syXVswXS5jb25zdHJ1Y3Rvci5uYW1lKS50b0JlKCdEZWxldGVDb21tYW5kJyk7XG4gICAgICBleHBlY3QobW9ja1NlbmQubW9jay5jYWxsc1szXVswXS5jb25zdHJ1Y3Rvci5uYW1lKS50b0JlKCdEZWxldGVDb21tYW5kJyk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHRocm93IGVycm9yIHdoZW4gc2NvcmUgbm90IGZvdW5kJywgYXN5bmMgKCkgPT4ge1xuICAgICAgbW9ja1NlbmQubW9ja1Jlc29sdmVkVmFsdWUoe30pO1xuXG4gICAgICBhd2FpdCBleHBlY3QoZGF0YUFjY2Vzcy5kZWxldGVGaXRTaG93U2NvcmUoJ25vbi1leGlzdGVudCcpKS5yZWplY3RzLnRvVGhyb3coJ0ZpdCBhbmQgc2hvdyBzY29yZSBub3QgZm91bmQnKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2dldEZpdFNob3dTY29yZXNCeUNhdCcsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIHJldHJpZXZlIGFsbCBmaXQgYW5kIHNob3cgc2NvcmVzIGZvciBhIGNhdCcsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IG1vY2tJbmRleEl0ZW1zID0gW1xuICAgICAgICB7IGZpdFNob3dTY29yZUlkOiAnc2NvcmUtMScgfSxcbiAgICAgICAgeyBmaXRTaG93U2NvcmVJZDogJ3Njb3JlLTInIH1cbiAgICAgIF07XG5cbiAgICAgIGNvbnN0IG1vY2tTY29yZTEgPSB7IGlkOiAnc2NvcmUtMScsIHRvdGFsU2NvcmU6IDg1IH07XG4gICAgICBjb25zdCBtb2NrU2NvcmUyID0geyBpZDogJ3Njb3JlLTInLCB0b3RhbFNjb3JlOiA5MiB9O1xuXG4gICAgICAvLyBNb2NrIHF1ZXJ5IGZvciBjYXQgaW5kZXhcbiAgICAgIG1vY2tTZW5kLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7IEl0ZW1zOiBtb2NrSW5kZXhJdGVtcyB9KTtcbiAgICAgIC8vIE1vY2sgaW5kaXZpZHVhbCBzY29yZSByZXRyaWV2YWxzXG4gICAgICBtb2NrU2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UoeyBJdGVtOiB7IFBLOiAndGVzdCcsIFNLOiAndGVzdCcsIC4uLm1vY2tTY29yZTEgfSB9KTtcbiAgICAgIG1vY2tTZW5kLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7IEl0ZW06IHsgUEs6ICd0ZXN0JywgU0s6ICd0ZXN0JywgLi4ubW9ja1Njb3JlMiB9IH0pO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBkYXRhQWNjZXNzLmdldEZpdFNob3dTY29yZXNCeUNhdCgnY2F0LTEyMycpO1xuXG4gICAgICBleHBlY3QocmVzdWx0KS50b0hhdmVMZW5ndGgoMik7XG4gICAgICBleHBlY3QocmVzdWx0WzBdLmlkKS50b0JlKCdzY29yZS0xJyk7XG4gICAgICBleHBlY3QocmVzdWx0WzFdLmlkKS50b0JlKCdzY29yZS0yJyk7XG5cbiAgICAgIC8vIFZlcmlmeSBxdWVyeSB3YXMgY2FsbGVkXG4gICAgICBleHBlY3QobW9ja1NlbmQubW9jay5jYWxsc1swXVswXS5jb25zdHJ1Y3Rvci5uYW1lKS50b0JlKCdRdWVyeUNvbW1hbmQnKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmV0dXJuIGVtcHR5IGFycmF5IHdoZW4gbm8gc2NvcmVzIGZvdW5kJywgYXN5bmMgKCkgPT4ge1xuICAgICAgbW9ja1NlbmQubW9ja1Jlc29sdmVkVmFsdWUoeyBJdGVtczogW10gfSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGRhdGFBY2Nlc3MuZ2V0Rml0U2hvd1Njb3Jlc0J5Q2F0KCdjYXQtMTIzJyk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvRXF1YWwoW10pO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnZ2V0Rml0U2hvd1Njb3Jlc0J5SnVkZ2UnLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCByZXRyaWV2ZSBhbGwgZml0IGFuZCBzaG93IHNjb3JlcyBieSBhIGp1ZGdlJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgbW9ja0luZGV4SXRlbXMgPSBbXG4gICAgICAgIHsgZml0U2hvd1Njb3JlSWQ6ICdzY29yZS0xJyB9LFxuICAgICAgICB7IGZpdFNob3dTY29yZUlkOiAnc2NvcmUtMicgfVxuICAgICAgXTtcblxuICAgICAgY29uc3QgbW9ja1Njb3JlMSA9IHsgaWQ6ICdzY29yZS0xJywgdG90YWxTY29yZTogODUgfTtcbiAgICAgIGNvbnN0IG1vY2tTY29yZTIgPSB7IGlkOiAnc2NvcmUtMicsIHRvdGFsU2NvcmU6IDkyIH07XG5cbiAgICAgIC8vIE1vY2sgcXVlcnkgZm9yIGp1ZGdlIGluZGV4XG4gICAgICBtb2NrU2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UoeyBJdGVtczogbW9ja0luZGV4SXRlbXMgfSk7XG4gICAgICAvLyBNb2NrIGluZGl2aWR1YWwgc2NvcmUgcmV0cmlldmFsc1xuICAgICAgbW9ja1NlbmQubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHsgSXRlbTogeyBQSzogJ3Rlc3QnLCBTSzogJ3Rlc3QnLCAuLi5tb2NrU2NvcmUxIH0gfSk7XG4gICAgICBtb2NrU2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UoeyBJdGVtOiB7IFBLOiAndGVzdCcsIFNLOiAndGVzdCcsIC4uLm1vY2tTY29yZTIgfSB9KTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZGF0YUFjY2Vzcy5nZXRGaXRTaG93U2NvcmVzQnlKdWRnZSgnanVkZ2UtMTIzJyk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvSGF2ZUxlbmd0aCgyKTtcbiAgICAgIGV4cGVjdChyZXN1bHRbMF0uaWQpLnRvQmUoJ3Njb3JlLTEnKTtcbiAgICAgIGV4cGVjdChyZXN1bHRbMV0uaWQpLnRvQmUoJ3Njb3JlLTInKTtcblxuICAgICAgLy8gVmVyaWZ5IHF1ZXJ5IHdhcyBjYWxsZWRcbiAgICAgIGV4cGVjdChtb2NrU2VuZC5tb2NrLmNhbGxzWzBdWzBdLmNvbnN0cnVjdG9yLm5hbWUpLnRvQmUoJ1F1ZXJ5Q29tbWFuZCcpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnbGlzdEZpdFNob3dTY29yZXMnLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCByZXRyaWV2ZSBhbGwgZml0IGFuZCBzaG93IHNjb3JlcycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IG1vY2tJdGVtcyA9IFtcbiAgICAgICAgeyBQSzogJ0ZJVF9TSE9XX1NDT1JFIzEnLCBTSzogJ01FVEFEQVRBJywgaWQ6ICdzY29yZS0xJywgdG90YWxTY29yZTogODUgfSxcbiAgICAgICAgeyBQSzogJ0ZJVF9TSE9XX1NDT1JFIzInLCBTSzogJ01FVEFEQVRBJywgaWQ6ICdzY29yZS0yJywgdG90YWxTY29yZTogOTIgfVxuICAgICAgXTtcblxuICAgICAgbW9ja1NlbmQubW9ja1Jlc29sdmVkVmFsdWUoeyBJdGVtczogbW9ja0l0ZW1zIH0pO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBkYXRhQWNjZXNzLmxpc3RGaXRTaG93U2NvcmVzKCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvSGF2ZUxlbmd0aCgyKTtcbiAgICAgIGV4cGVjdChyZXN1bHRbMF0uaWQpLnRvQmUoJ3Njb3JlLTEnKTtcbiAgICAgIGV4cGVjdChyZXN1bHRbMV0uaWQpLnRvQmUoJ3Njb3JlLTInKTtcblxuICAgICAgLy8gVmVyaWZ5IHNjYW4gd2FzIGNhbGxlZFxuICAgICAgZXhwZWN0KG1vY2tTZW5kLm1vY2suY2FsbHNbMF1bMF0uY29uc3RydWN0b3IubmFtZSkudG9CZSgnU2NhbkNvbW1hbmQnKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2ZpbmFsaXplRml0U2hvd1Njb3JlJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgZmluYWxpemUgYSBmaXQgYW5kIHNob3cgc2NvcmUnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBleGlzdGluZ1Njb3JlID0ge1xuICAgICAgICBpZDogJ3Rlc3QtaWQnLFxuICAgICAgICBjYXRJZDogJ2NhdC0xMjMnLFxuICAgICAgICBqdWRnZUlkOiAnanVkZ2UtMTIzJyxcbiAgICAgICAgdG90YWxTY29yZTogODUsXG4gICAgICAgIGlzRmluYWxpemVkOiBmYWxzZVxuICAgICAgfTtcblxuICAgICAgLy8gTW9jayBnZXRGaXRTaG93U2NvcmUgY2FsbFxuICAgICAgbW9ja1NlbmQubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHsgSXRlbTogeyBQSzogJ3Rlc3QnLCBTSzogJ3Rlc3QnLCAuLi5leGlzdGluZ1Njb3JlIH0gfSk7XG4gICAgICAvLyBNb2NrIHVwZGF0ZSBvcGVyYXRpb25zXG4gICAgICBtb2NrU2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZSh7fSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGRhdGFBY2Nlc3MuZmluYWxpemVGaXRTaG93U2NvcmUoJ3Rlc3QtaWQnLCAnanVkZ2UtMTIzJyk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQuaXNGaW5hbGl6ZWQpLnRvQmUodHJ1ZSk7XG4gICAgICBleHBlY3QocmVzdWx0Lmxhc3RNb2RpZmllZEJ5KS50b0JlKCdqdWRnZS0xMjMnKTtcbiAgICAgIGV4cGVjdChyZXN1bHQudXBkYXRlZEF0KS50b0JlRGVmaW5lZCgpO1xuXG4gICAgICAvLyBWZXJpZnkgZm91ciBkYXRhYmFzZSBvcGVyYXRpb25zIChnZXQgKyAzIHVwZGF0ZXMpXG4gICAgICBleHBlY3QobW9ja1NlbmQpLnRvSGF2ZUJlZW5DYWxsZWRUaW1lcyg0KTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgdGhyb3cgZXJyb3Igd2hlbiBzY29yZSBub3QgZm91bmQnLCBhc3luYyAoKSA9PiB7XG4gICAgICBtb2NrU2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZSh7fSk7XG5cbiAgICAgIGF3YWl0IGV4cGVjdChkYXRhQWNjZXNzLmZpbmFsaXplRml0U2hvd1Njb3JlKCdub24tZXhpc3RlbnQnLCAnanVkZ2UtMTIzJykpLnJlamVjdHMudG9UaHJvdygnRml0IGFuZCBzaG93IHNjb3JlIG5vdCBmb3VuZCcpO1xuICAgIH0pO1xuICB9KTtcbn0pOyJdfQ==