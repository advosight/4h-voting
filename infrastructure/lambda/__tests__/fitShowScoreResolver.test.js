"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Mock the FitShowScoreDataAccess before importing the handler
const mockFitShowScoreDataAccess = {
    createFitShowScore: jest.fn(),
    updateFitShowScore: jest.fn(),
    getFitShowScore: jest.fn(),
    getFitShowScoresByCat: jest.fn(),
    getFitShowScoresByCage: jest.fn(),
    listFitShowScores: jest.fn(),
    getFitShowScoresByJudge: jest.fn(),
    finalizeFitShowScore: jest.fn(),
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
const fitShowScoreResolver_1 = require("../fitShowScoreResolver");
describe('Fit and Show Score Resolver', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    const createMockEvent = (fieldName, arguments_ = {}, userRole = 'judge', userId = 'judge-123') => ({
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
    });
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
            mockFitShowScoreDataAccess.createFitShowScore.mockResolvedValue(mockFitShowScore);
            const event = createMockEvent('createFitShowScore', { input });
            const result = await (0, fitShowScoreResolver_1.handler)(event);
            expect(mockFitShowScoreDataAccess.createFitShowScore).toHaveBeenCalledWith({
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
            mockFitShowScoreDataAccess.createFitShowScore.mockResolvedValue(mockFitShowScore);
            const event = createMockEvent('createFitShowScore', { input }, 'admin');
            const result = await (0, fitShowScoreResolver_1.handler)(event);
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
            await expect((0, fitShowScoreResolver_1.handler)(event)).rejects.toThrow('Forbidden: Judge role required');
            expect(mockFitShowScoreDataAccess.createFitShowScore).not.toHaveBeenCalled();
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
            await expect((0, fitShowScoreResolver_1.handler)(event)).rejects.toThrow('attire must be between 1 and 10');
            expect(mockFitShowScoreDataAccess.createFitShowScore).not.toHaveBeenCalled();
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
            await expect((0, fitShowScoreResolver_1.handler)(event)).rejects.toThrow('toenailsClipped must be between 1 and 6');
            expect(mockFitShowScoreDataAccess.createFitShowScore).not.toHaveBeenCalled();
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
            await expect((0, fitShowScoreResolver_1.handler)(event)).rejects.toThrow('Participant name is required and cannot be empty');
            expect(mockFitShowScoreDataAccess.createFitShowScore).not.toHaveBeenCalled();
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
            await expect((0, fitShowScoreResolver_1.handler)(event)).rejects.toThrow('Comment must be 500 characters or less');
            expect(mockFitShowScoreDataAccess.createFitShowScore).not.toHaveBeenCalled();
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
            mockFitShowScoreDataAccess.updateFitShowScore.mockResolvedValue(updatedScore);
            const event = createMockEvent('updateFitShowScore', { id: 'fitshow-score-123', input });
            const result = await (0, fitShowScoreResolver_1.handler)(event);
            expect(mockFitShowScoreDataAccess.updateFitShowScore).toHaveBeenCalledWith({
                ...input,
                id: 'fitshow-score-123',
            });
            expect(result).toEqual(updatedScore);
        });
        it('should reject update for non-existent score', async () => {
            const input = { attire: 9 };
            mockFitShowScoreDataAccess.getFitShowScore.mockResolvedValue(null);
            const event = createMockEvent('updateFitShowScore', { id: 'nonexistent', input });
            await expect((0, fitShowScoreResolver_1.handler)(event)).rejects.toThrow('Fit and show score with ID nonexistent not found');
            expect(mockFitShowScoreDataAccess.updateFitShowScore).not.toHaveBeenCalled();
        });
        it('should reject update for finalized score by non-admin', async () => {
            const input = { attire: 9 };
            const finalizedScore = { ...mockFitShowScore, isFinalized: true, judgeId: 'judge-123' };
            mockFitShowScoreDataAccess.getFitShowScore.mockResolvedValue(finalizedScore);
            const event = createMockEvent('updateFitShowScore', { id: 'fitshow-score-123', input });
            await expect((0, fitShowScoreResolver_1.handler)(event)).rejects.toThrow('Cannot modify finalized fit and show scores. Admin access required.');
            expect(mockFitShowScoreDataAccess.updateFitShowScore).not.toHaveBeenCalled();
        });
    });
    describe('getFitShowScore', () => {
        it('should get a fit and show score for judge (own score)', async () => {
            const score = { ...mockFitShowScore, judgeId: 'judge-123' };
            mockFitShowScoreDataAccess.getFitShowScore.mockResolvedValue(score);
            const event = createMockEvent('getFitShowScore', { id: 'fitshow-score-123' });
            const result = await (0, fitShowScoreResolver_1.handler)(event);
            expect(result).toEqual(score);
        });
        it('should get a finalized fit and show score for participant', async () => {
            const score = { ...mockFitShowScore, isFinalized: true };
            mockFitShowScoreDataAccess.getFitShowScore.mockResolvedValue(score);
            const event = createMockEvent('getFitShowScore', { id: 'fitshow-score-123' }, 'participant');
            const result = await (0, fitShowScoreResolver_1.handler)(event);
            expect(result).toEqual(score);
        });
        it('should reject non-finalized score for participant', async () => {
            const score = { ...mockFitShowScore, isFinalized: false };
            mockFitShowScoreDataAccess.getFitShowScore.mockResolvedValue(score);
            const event = createMockEvent('getFitShowScore', { id: 'fitshow-score-123' }, 'participant');
            await expect((0, fitShowScoreResolver_1.handler)(event)).rejects.toThrow('Fit and show score is not yet finalized and cannot be viewed by participants');
        });
        it('should return null for non-existent score', async () => {
            mockFitShowScoreDataAccess.getFitShowScore.mockResolvedValue(null);
            const event = createMockEvent('getFitShowScore', { id: 'nonexistent' });
            const result = await (0, fitShowScoreResolver_1.handler)(event);
            expect(result).toBeNull();
        });
    });
    describe('getFitShowScoresByCat', () => {
        it('should get all fit and show scores for admin', async () => {
            const scores = [mockFitShowScore];
            mockFitShowScoreDataAccess.getFitShowScoresByCat.mockResolvedValue(scores);
            const event = createMockEvent('getFitShowScoresByCat', { catId: 'cat-456' }, 'admin');
            const result = await (0, fitShowScoreResolver_1.handler)(event);
            expect(result).toEqual({ items: scores });
        });
        it('should filter fit and show scores for judge (own scores only)', async () => {
            const scores = [
                { ...mockFitShowScore, judgeId: 'judge-123' },
                { ...mockFitShowScore, id: 'other-score', judgeId: 'other-judge' },
            ];
            mockFitShowScoreDataAccess.getFitShowScoresByCat.mockResolvedValue(scores);
            const event = createMockEvent('getFitShowScoresByCat', { catId: 'cat-456' });
            const result = await (0, fitShowScoreResolver_1.handler)(event);
            expect(result).toEqual({ items: [scores[0]] });
        });
        it('should filter fit and show scores for participant (finalized only)', async () => {
            const scores = [
                { ...mockFitShowScore, isFinalized: true },
                { ...mockFitShowScore, id: 'other-score', isFinalized: false },
            ];
            mockFitShowScoreDataAccess.getFitShowScoresByCat.mockResolvedValue(scores);
            const event = createMockEvent('getFitShowScoresByCat', { catId: 'cat-456' }, 'participant');
            const result = await (0, fitShowScoreResolver_1.handler)(event);
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
            const result = await (0, fitShowScoreResolver_1.handler)(event);
            expect(mockFitShowScoreDataAccess.finalizeFitShowScore).toHaveBeenCalledWith('fitshow-score-123', 'judge-123');
            expect(result).toEqual(finalizedScore);
        });
        it('should reject finalizing already finalized score', async () => {
            const existingScore = { ...mockFitShowScore, judgeId: 'judge-123', isFinalized: true };
            mockFitShowScoreDataAccess.getFitShowScore.mockResolvedValue(existingScore);
            const event = createMockEvent('finalizeFitShowScore', { id: 'fitshow-score-123' });
            await expect((0, fitShowScoreResolver_1.handler)(event)).rejects.toThrow('Fit and show score is already finalized');
            expect(mockFitShowScoreDataAccess.finalizeFitShowScore).not.toHaveBeenCalled();
        });
    });
    describe('listAllFitShowScores', () => {
        it('should list all fit and show scores for admin', async () => {
            const scores = [mockFitShowScore];
            mockFitShowScoreDataAccess.listFitShowScores.mockResolvedValue(scores);
            const event = createMockEvent('listAllFitShowScores', {}, 'admin');
            const result = await (0, fitShowScoreResolver_1.handler)(event);
            expect(result).toEqual({ items: scores });
        });
        it('should reject listing all scores for non-admin', async () => {
            const event = createMockEvent('listAllFitShowScores', {}, 'judge');
            await expect((0, fitShowScoreResolver_1.handler)(event)).rejects.toThrow('Forbidden: Admin role required');
            expect(mockFitShowScoreDataAccess.listFitShowScores).not.toHaveBeenCalled();
        });
    });
    describe('getFitShowScoreAuditHistory', () => {
        it('should return empty audit history (not yet implemented)', async () => {
            const score = { ...mockFitShowScore, judgeId: 'judge-123' };
            mockFitShowScoreDataAccess.getFitShowScore.mockResolvedValue(score);
            const event = createMockEvent('getFitShowScoreAuditHistory', { fitShowScoreId: 'fitshow-score-123' });
            const result = await (0, fitShowScoreResolver_1.handler)(event);
            expect(result).toEqual({ items: [] });
        });
        it('should reject audit history for non-existent score', async () => {
            mockFitShowScoreDataAccess.getFitShowScore.mockResolvedValue(null);
            const event = createMockEvent('getFitShowScoreAuditHistory', { fitShowScoreId: 'nonexistent' });
            await expect((0, fitShowScoreResolver_1.handler)(event)).rejects.toThrow('Fit and show score with ID nonexistent not found');
        });
    });
    describe('unknown field', () => {
        it('should throw error for unknown field', async () => {
            const event = createMockEvent('unknownField');
            await expect((0, fitShowScoreResolver_1.handler)(event)).rejects.toThrow('Unknown field: unknownField');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZml0U2hvd1Njb3JlUmVzb2x2ZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImZpdFNob3dTY29yZVJlc29sdmVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFFQSwrREFBK0Q7QUFDL0QsTUFBTSwwQkFBMEIsR0FBRztJQUNqQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO0lBQzdCLGtCQUFrQixFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7SUFDN0IsZUFBZSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7SUFDMUIscUJBQXFCLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtJQUNoQyxzQkFBc0IsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO0lBQ2pDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7SUFDNUIsdUJBQXVCLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtJQUNsQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO0NBQ2hDLENBQUM7QUFFRixJQUFJLENBQUMsSUFBSSxDQUFDLDJCQUEyQixFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDNUMsc0JBQXNCLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLDBCQUEwQixDQUFDO0NBQ3ZGLENBQUMsQ0FBQyxDQUFDO0FBRUosZUFBZTtBQUNmLElBQUksQ0FBQyxJQUFJLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztJQUMzQyxjQUFjLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtDQUMxQixDQUFDLENBQUMsQ0FBQztBQUVKLElBQUksQ0FBQyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztJQUN4QyxzQkFBc0IsRUFBRTtRQUN0QixJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtLQUNoQjtDQUNGLENBQUMsQ0FBQyxD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WUFDdEcsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFBLDhCQUFPLEVBQUMsS0FBSyxDQUFDLENBQUM7WUFFcEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3hDLENBQUMsQ0FBQyxDQUFDO1FBRUgsRUFBRSxDQUFDLG9EQUFvRCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ2xFLDBCQUEwQixDQUFDLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUVuRSxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsNkJBQTZCLEVBQUUsRUFBRSxjQUFjLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQztZQUVoRyxNQUFNLE1BQU0sQ0FBQyxJQUFBLDhCQUFPLEVBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLGtEQUFrRCxDQUFDLENBQUM7UUFDbkcsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO1FBQzdCLEVBQUUsQ0FBQyxzQ0FBc0MsRUFBRSxLQUFLLElBQUksRUFBRTtZQUNwRCxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsY0FBYyxDQUFDLENBQUM7WUFFOUMsTUFBTSxNQUFNLENBQUMsSUFBQSw4QkFBTyxFQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1FBQzlFLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcFN5bmNSZXNvbHZlckV2ZW50IH0gZnJvbSAnYXdzLWxhbWJkYSc7XG5cbi8vIE1vY2sgdGhlIEZpdFNob3dTY29yZURhdGFBY2Nlc3MgYmVmb3JlIGltcG9ydGluZyB0aGUgaGFuZGxlclxuY29uc3QgbW9ja0ZpdFNob3dTY29yZURhdGFBY2Nlc3MgPSB7XG4gIGNyZWF0ZUZpdFNob3dTY29yZTogamVzdC5mbigpLFxuICB1cGRhdGVGaXRTaG93U2NvcmU6IGplc3QuZm4oKSxcbiAgZ2V0Rml0U2hvd1Njb3JlOiBqZXN0LmZuKCksXG4gIGdldEZpdFNob3dTY29yZXNCeUNhdDogamVzdC5mbigpLFxuICBnZXRGaXRTaG93U2NvcmVzQnlDYWdlOiBqZXN0LmZuKCksXG4gIGxpc3RGaXRTaG93U2NvcmVzOiBqZXN0LmZuKCksXG4gIGdldEZpdFNob3dTY29yZXNCeUp1ZGdlOiBqZXN0LmZuKCksXG4gIGZpbmFsaXplRml0U2hvd1Njb3JlOiBqZXN0LmZuKCksXG59O1xuXG5qZXN0Lm1vY2soJy4uL2ZpdFNob3dTY29yZURhdGFBY2Nlc3MnLCAoKSA9PiAoe1xuICBGaXRTaG93U2NvcmVEYXRhQWNjZXNzOiBqZXN0LmZuKCkubW9ja0ltcGxlbWVudGF0aW9uKCgpID0+IG1vY2tGaXRTaG93U2NvcmVEYXRhQWNjZXNzKSxcbn0pKTtcblxuLy8gTW9jayBBV1MgU0RLXG5qZXN0Lm1vY2soJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYicsICgpID0+ICh7XG4gIER5bmFtb0RCQ2xpZW50OiBqZXN0LmZuKCksXG59KSk7XG5cbmplc3QubW9jaygnQGF3cy1zZGsvbGliLWR5bmFtb2RiJywgKCkgPT4gKHtcbiAgRHluYW1vREJEb2N1bWVudENsaWVudDoge1xuICAgIGZyb206IGplc3QuZm4oKSxcbiAgfSxcbn0pKTtcblxuLy8gTm93IGltcG9ydCB0aGUgaGFuZGxlciBhZnRlciBtb2NrcyBhcmUgc2V0IHVwXG5pbXBvcnQgeyBoYW5kbGVyIH0gZnJvbSAnLi4vZml0U2hvd1Njb3JlUmVzb2x2ZXInO1xuXG5kZXNjcmliZSgnRml0IGFuZCBTaG93IFNjb3JlIFJlc29sdmVyJywgKCkgPT4ge1xuICBiZWZvcmVFYWNoKCgpID0+IHtcbiAgICBqZXN0LmNsZWFyQWxsTW9ja3MoKTtcbiAgfSk7XG5cbiAgY29uc3QgY3JlYXRlTW9ja0V2ZW50ID0gKFxuICAgIGZpZWxkTmFtZTogc3RyaW5nLFxuICAgIGFyZ3VtZW50c186IGFueSA9IHt9LFxuICAgIHVzZXJSb2xlOiBzdHJpbmcgPSAnanVkZ2UnLFxuICAgIHVzZXJJZDogc3RyaW5nID0gJ2p1ZGdlLTEyMydcbiAgKTogQXBwU3luY1Jlc29sdmVyRXZlbnQ8YW55PiA9PiAoe1xuICAgIGluZm86IHsgZmllbGROYW1lIH0sXG4gICAgYXJndW1lbnRzOiBhcmd1bWVudHNfLFxuICAgIGlkZW50aXR5OiB7XG4gICAgICBjbGFpbXM6IHtcbiAgICAgICAgc3ViOiB1c2VySWQsXG4gICAgICAgICdjb2duaXRvOnVzZXJuYW1lJzogJ3Rlc3RqdWRnZScsXG4gICAgICAgICdjdXN0b206cm9sZSc6IHVzZXJSb2xlLFxuICAgICAgICBlbWFpbDogJ2p1ZGdlQGV4YW1wbGUuY29tJyxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSBhcyBhbnkpO1xuXG4gIGNvbnN0IG1vY2tGaXRTaG93U2NvcmUgPSB7XG4gICAgaWQ6ICdmaXRzaG93LXNjb3JlLTEyMycsXG4gICAgY2F0SWQ6ICdjYXQtNDU2JyxcbiAgICBwYXJ0aWNpcGFudE5hbWU6ICdKb2huIERvZScsXG4gICAganVkZ2VJZDogJ2p1ZGdlLTEyMycsXG4gICAganVkZ2VOYW1lOiAndGVzdGp1ZGdlJyxcbiAgICAvLyBBcHBlYXJhbmNlICYgRGVtZWFub3JcbiAgICBhdHRpcmU6IDgsXG4gICAgYXR0ZW50aXZlOiA0LFxuICAgIGNvdXJ0ZW91czogNSxcbiAgICAvLyBIYW5kbGluZyAmIENvbnRyb2xcbiAgICBjb250cm9sRXF1aXBtZW50OiA5LFxuICAgIHBpY2t1cENhcnJ5aW5nOiAzLFxuICAgIC8vIERlbW9uc3RyYXRpb24gU2tpbGxzXG4gICAgc2hvd2luZ0hlYWRTaGFwZTogMyxcbiAgICBzaG93aW5nQm9keVR5cGU6IDQsXG4gICAgc2hvd2luZ1RhaWw6IDMsXG4gICAgc2hvd2luZ0NvYXRUZXh0dXJlOiA0LFxuICAgIC8vIEhlYWx0aCBFeGFtaW5hdGlvblxuICAgIHNob3dpbmdNb3V0aFRlZXRoR3VtczogMixcbiAgICBjb25kaXRpb25Nb3V0aFRlZXRoR3VtczogMixcbiAgICBzaG93aW5nTm9zZTogMixcbiAgICBzaG93aW5nRXllczogMixcbiAgICBjb25kaXRpb25Ob3NlRXllczogMixcbiAgICBzaG93aW5nRWFyczogMixcbiAgICBlYXJzQ2xlYW46IDIsXG4gICAgc2hvd2luZ1RvZW5haWxzQ2xhd3M6IDMsXG4gICAgdG9lbmFpbHNDbGlwcGVkOiA1LFxuICAgIC8vIEdyb29taW5nICYgQ2FyZVxuICAgIHNob3dpbmdCZWxseUNvYXRDbGVhbmxpbmVzczogMyxcbiAgICBjb2F0Q2xlYW5XZWxsR3Jvb21lZDogNyxcbiAgICBjYXRIZWFsdGhDYXJlOiAzLFxuICAgIC8vIEtub3dsZWRnZVxuICAgIGdlbmVyYWxLbm93bGVkZ2U6IDMsXG4gICAgY2F0QnJlZWRzU2hvd2luZzogMyxcbiAgICBjYXRBbmF0b215OiAyLFxuICAgIGZvdXJIS25vd2xlZGdlOiAzLFxuICAgIC8vIENhbGN1bGF0ZWQgdG90YWxzXG4gICAgYXBwZWFyYW5jZVRvdGFsOiAxNyxcbiAgICBoYW5kbGluZ1RvdGFsOiAxMixcbiAgICBkZW1vbnN0cmF0aW9uVG90YWw6IDE0LFxuICAgIGhlYWx0aEV4YW1pbmF0aW9uVG90YWw6IDIwLFxuICAgIGdyb29taW5nQ2FyZVRvdGFsOiAxMyxcbiAgICBrbm93bGVkZ2VUb3RhbDogMTEsXG4gICAgdG90YWxTY29yZTogODcsXG4gICAgLy8gQ29tbWVudHNcbiAgICBhcHBlYXJhbmNlQ29tbWVudHM6ICdXZWxsIGRyZXNzZWQgYW5kIGF0dGVudGl2ZScsXG4gICAgaGFuZGxpbmdDb21tZW50czogJ0dvb2QgY29udHJvbCBvZiBjYXQnLFxuICAgIGRlbW9uc3RyYXRpb25Db21tZW50czogJ0NsZWFyIGRlbW9uc3RyYXRpb25zJyxcbiAgICBoZWFsdGhFeGFtaW5hdGlvbkNvbW1lbnRzOiAnVGhvcm91Z2ggZXhhbWluYXRpb24nLFxuICAgIGdyb29taW5nQ2FyZUNvbW1lbnRzOiAnQ2F0IHdlbGwgZ3Jvb21lZCcsXG4gICAga25vd2xlZGdlQ29tbWVudHM6ICdHb29kIGtub3dsZWRnZSBiYXNlJyxcbiAgICAvLyBNZXRhZGF0YVxuICAgIHRpbWVzdGFtcDogJzIwMjQtMDEtMDFUMDA6MDA6MDAuMDAwWicsXG4gICAgaXNGaW5hbGl6ZWQ6IGZhbHNlLFxuICAgIG1vZGlmaWNhdGlvbkNvdW50OiAwLFxuICAgIGxhc3RNb2RpZmllZEJ5OiAnanVkZ2VAZXhhbXBsZS5jb20nLFxuICAgIGxhc3RNb2RpZmllZEF0OiAnMjAyNC0wMS0wMVQwMDowMDowMC4wMDBaJyxcbiAgfTtcblxuICBkZXNjcmliZSgnY3JlYXRlRml0U2hvd1Njb3JlJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgY3JlYXRlIGEgZml0IGFuZCBzaG93IHNjb3JlIHN1Y2Nlc3NmdWxseSBmb3IganVkZ2UnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBpbnB1dCA9IHtcbiAgICAgICAgY2F0SWQ6ICdjYXQtNDU2JyxcbiAgICAgICAgcGFydGljaXBhbnROYW1lOiAnSm9obiBEb2UnLFxuICAgICAgICBhdHRpcmU6IDgsXG4gICAgICAgIGF0dGVudGl2ZTogNCxcbiAgICAgICAgY291cnRlb3VzOiA1LFxuICAgICAgICBjb250cm9sRXF1aXBtZW50OiA5LFxuICAgICAgICBwaWNrdXBDYXJyeWluZzogMyxcbiAgICAgICAgc2hvd2luZ0hlYWRTaGFwZTogMyxcbiAgICAgICAgc2hvd2luZ0JvZHlUeXBlOiA0LFxuICAgICAgICBzaG93aW5nVGFpbDogMyxcbiAgICAgICAgc2hvd2luZ0NvYXRUZXh0dXJlOiA0LFxuICAgICAgICBzaG93aW5nTW91dGhUZWV0aEd1bXM6IDIsXG4gICAgICAgIGNvbmRpdGlvbk1vdXRoVGVldGhHdW1zOiAyLFxuICAgICAgICBzaG93aW5nTm9zZTogMixcbiAgICAgICAgc2hvd2luZ0V5ZXM6IDIsXG4gICAgICAgIGNvbmRpdGlvbk5vc2VFeWVzOiAyLFxuICAgICAgICBzaG93aW5nRWFyczogMixcbiAgICAgICAgZWFyc0NsZWFuOiAyLFxuICAgICAgICBzaG93aW5nVG9lbmFpbHNDbGF3czogMyxcbiAgICAgICAgdG9lbmFpbHNDbGlwcGVkOiA1LFxuICAgICAgICBzaG93aW5nQmVsbHlDb2F0Q2xlYW5saW5lc3M6IDMsXG4gICAgICAgIGNvYXRDbGVhbldlbGxHcm9vbWVkOiA3LFxuICAgICAgICBjYXRIZWFsdGhDYXJlOiAzLFxuICAgICAgICBnZW5lcmFsS25vd2xlZGdlOiAzLFxuICAgICAgICBjYXRCcmVlZHNTaG93aW5nOiAzLFxuICAgICAgICBjYXRBbmF0b215OiAyLFxuICAgICAgICBmb3VySEtub3dsZWRnZTogMyxcbiAgICAgIH07XG5cbiAgICAgIG1vY2tGaXRTaG93U2NvcmVEYXRhQWNjZXNzLmNyZWF0ZUZpdFNob3dTY29yZS5tb2NrUmVzb2x2ZWRWYWx1ZShtb2NrRml0U2hvd1Njb3JlKTtcblxuICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVNb2NrRXZlbnQoJ2NyZWF0ZUZpdFNob3dTY29yZScsIHsgaW5wdXQgfSk7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50KTtcblxuICAgICAgZXhwZWN0KG1vY2tGaXRTaG93U2NvcmVEYXRhQWNjZXNzLmNyZWF0ZUZpdFNob3dTY29yZSkudG9IYXZlQmVlbkNhbGxlZFdpdGgoe1xuICAgICAgICAuLi5pbnB1dCxcbiAgICAgICAganVkZ2VJZDogJ2p1ZGdlLTEyMycsXG4gICAgICAgIGp1ZGdlTmFtZTogJ3Rlc3RqdWRnZScsXG4gICAgICB9KTtcbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvRXF1YWwobW9ja0ZpdFNob3dTY29yZSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGNyZWF0ZSBhIGZpdCBhbmQgc2hvdyBzY29yZSBzdWNjZXNzZnVsbHkgZm9yIGFkbWluJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgaW5wdXQgPSB7XG4gICAgICAgIGNhdElkOiAnY2F0LTQ1NicsXG4gICAgICAgIHBhcnRpY2lwYW50TmFtZTogJ0pvaG4gRG9lJyxcbiAgICAgICAgYXR0aXJlOiA4LFxuICAgICAgICBhdHRlbnRpdmU6IDQsXG4gICAgICAgIGNvdXJ0ZW91czogNSxcbiAgICAgICAgY29udHJvbEVxdWlwbWVudDogOSxcbiAgICAgICAgcGlja3VwQ2Fycnlpbmc6IDMsXG4gICAgICAgIHNob3dpbmdIZWFkU2hhcGU6IDMsXG4gICAgICAgIHNob3dpbmdCb2R5VHlwZTogNCxcbiAgICAgICAgc2hvd2luZ1RhaWw6IDMsXG4gICAgICAgIHNob3dpbmdDb2F0VGV4dHVyZTogNCxcbiAgICAgICAgc2hvd2luZ01vdXRoVGVldGhHdW1zOiAyLFxuICAgICAgICBjb25kaXRpb25Nb3V0aFRlZXRoR3VtczogMixcbiAgICAgICAgc2hvd2luZ05vc2U6IDIsXG4gICAgICAgIHNob3dpbmdFeWVzOiAyLFxuICAgICAgICBjb25kaXRpb25Ob3NlRXllczogMixcbiAgICAgICAgc2hvd2luZ0VhcnM6IDIsXG4gICAgICAgIGVhcnNDbGVhbjogMixcbiAgICAgICAgc2hvd2luZ1RvZW5haWxzQ2xhd3M6IDMsXG4gICAgICAgIHRvZW5haWxzQ2xpcHBlZDogNSxcbiAgICAgICAgc2hvd2luZ0JlbGx5Q29hdENsZWFubGluZXNzOiAzLFxuICAgICAgICBjb2F0Q2xlYW5XZWxsR3Jvb21lZDogNyxcbiAgICAgICAgY2F0SGVhbHRoQ2FyZTogMyxcbiAgICAgICAgZ2VuZXJhbEtub3dsZWRnZTogMyxcbiAgICAgICAgY2F0QnJlZWRzU2hvd2luZzogMyxcbiAgICAgICAgY2F0QW5hdG9teTogMixcbiAgICAgICAgZm91ckhLbm93bGVkZ2U6IDMsXG4gICAgICB9O1xuXG4gICAgICBtb2NrRml0U2hvd1Njb3JlRGF0YUFjY2Vzcy5jcmVhdGVGaXRTaG93U2NvcmUubW9ja1Jlc29sdmVkVmFsdWUobW9ja0ZpdFNob3dTY29yZSk7XG5cbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KCdjcmVhdGVGaXRTaG93U2NvcmUnLCB7IGlucHV0IH0sICdhZG1pbicpO1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvRXF1YWwobW9ja0ZpdFNob3dTY29yZSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHJlamVjdCBjcmVhdGlvbiBmb3Igbm9uLWp1ZGdlL2FkbWluIHVzZXJzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgaW5wdXQgPSB7XG4gICAgICAgIGNhdElkOiAnY2F0LTQ1NicsXG4gICAgICAgIHBhcnRpY2lwYW50TmFtZTogJ0pvaG4gRG9lJyxcbiAgICAgICAgYXR0aXJlOiA4LFxuICAgICAgICBhdHRlbnRpdmU6IDQsXG4gICAgICAgIGNvdXJ0ZW91czogNSxcbiAgICAgICAgY29udHJvbEVxdWlwbWVudDogOSxcbiAgICAgICAgcGlja3VwQ2Fycnlpbmc6IDMsXG4gICAgICAgIHNob3dpbmdIZWFkU2hhcGU6IDMsXG4gICAgICAgIHNob3dpbmdCb2R5VHlwZTogNCxcbiAgICAgICAgc2hvd2luZ1RhaWw6IDMsXG4gICAgICAgIHNob3dpbmdDb2F0VGV4dHVyZTogNCxcbiAgICAgICAgc2hvd2luZ01vdXRoVGVldGhHdW1zOiAyLFxuICAgICAgICBjb25kaXRpb25Nb3V0aFRlZXRoR3VtczogMixcbiAgICAgICAgc2hvd2luZ05vc2U6IDIsXG4gICAgICAgIHNob3dpbmdFeWVzOiAyLFxuICAgICAgICBjb25kaXRpb25Ob3NlRXllczogMixcbiAgICAgICAgc2hvd2luZ0VhcnM6IDIsXG4gICAgICAgIGVhcnNDbGVhbjogMixcbiAgICAgICAgc2hvd2luZ1RvZW5haWxzQ2xhd3M6IDMsXG4gICAgICAgIHRvZW5haWxzQ2xpcHBlZDogNSxcbiAgICAgICAgc2hvd2luZ0JlbGx5Q29hdENsZWFubGluZXNzOiAzLFxuICAgICAgICBjb2F0Q2xlYW5XZWxsR3Jvb21lZDogNyxcbiAgICAgICAgY2F0SGVhbHRoQ2FyZTogMyxcbiAgICAgICAgZ2VuZXJhbEtub3dsZWRnZTogMyxcbiAgICAgICAgY2F0QnJlZWRzU2hvd2luZzogMyxcbiAgICAgICAgY2F0QW5hdG9teTogMixcbiAgICAgICAgZm91ckhLbm93bGVkZ2U6IDMsXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBldmVudCA9IGNyZWF0ZU1vY2tFdmVudCgnY3JlYXRlRml0U2hvd1Njb3JlJywgeyBpbnB1dCB9LCAncGFydGljaXBhbnQnKTtcblxuICAgICAgYXdhaXQgZXhwZWN0KGhhbmRsZXIoZXZlbnQpKS5yZWplY3RzLnRvVGhyb3coJ0ZvcmJpZGRlbjogSnVkZ2Ugcm9sZSByZXF1aXJlZCcpO1xuICAgICAgZXhwZWN0KG1vY2tGaXRTaG93U2NvcmVEYXRhQWNjZXNzLmNyZWF0ZUZpdFNob3dTY29yZSkubm90LnRvSGF2ZUJlZW5DYWxsZWQoKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgdmFsaWRhdGUgc2NvcmUgcmFuZ2VzIGZvciBhdHRpcmUgKDEtMTApJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgaW5wdXQgPSB7XG4gICAgICAgIGNhdElkOiAnY2F0LTQ1NicsXG4gICAgICAgIHBhcnRpY2lwYW50TmFtZTogJ0pvaG4gRG9lJyxcbiAgICAgICAgYXR0aXJlOiAxNSwgLy8gSW52YWxpZDogPiAxMFxuICAgICAgICBhdHRlbnRpdmU6IDQsXG4gICAgICAgIGNvdXJ0ZW91czogNSxcbiAgICAgICAgY29udHJvbEVxdWlwbWVudDogOSxcbiAgICAgICAgcGlja3VwQ2Fycnlpbmc6IDMsXG4gICAgICAgIHNob3dpbmdIZWFkU2hhcGU6IDMsXG4gICAgICAgIHNob3dpbmdCb2R5VHlwZTogNCxcbiAgICAgICAgc2hvd2luZ1RhaWw6IDMsXG4gICAgICAgIHNob3dpbmdDb2F0VGV4dHVyZTogNCxcbiAgICAgICAgc2hvd2luZ01vdXRoVGVldGhHdW1zOiAyLFxuICAgICAgICBjb25kaXRpb25Nb3V0aFRlZXRoR3VtczogMixcbiAgICAgICAgc2hvd2luZ05vc2U6IDIsXG4gICAgICAgIHNob3dpbmdFeWVzOiAyLFxuICAgICAgICBjb25kaXRpb25Ob3NlRXllczogMixcbiAgICAgICAgc2hvd2luZ0VhcnM6IDIsXG4gICAgICAgIGVhcnNDbGVhbjogMixcbiAgICAgICAgc2hvd2luZ1RvZW5haWxzQ2xhd3M6IDMsXG4gICAgICAgIHRvZW5haWxzQ2xpcHBlZDogNSxcbiAgICAgICAgc2hvd2luZ0JlbGx5Q29hdENsZWFubGluZXNzOiAzLFxuICAgICAgICBjb2F0Q2xlYW5XZWxsR3Jvb21lZDogNyxcbiAgICAgICAgY2F0SGVhbHRoQ2FyZTogMyxcbiAgICAgICAgZ2VuZXJhbEtub3dsZWRnZTogMyxcbiAgICAgICAgY2F0QnJlZWRzU2hvd2luZzogMyxcbiAgICAgICAgY2F0QW5hdG9teTogMixcbiAgICAgICAgZm91ckhLbm93bGVkZ2U6IDMsXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBldmVudCA9IGNyZWF0ZU1vY2tFdmVudCgnY3JlYXRlRml0U2hvd1Njb3JlJywgeyBpbnB1dCB9KTtcblxuICAgICAgYXdhaXQgZXhwZWN0KGhhbmRsZXIoZXZlbnQpKS5yZWplY3RzLnRvVGhyb3coJ2F0dGlyZSBtdXN0IGJlIGJldHdlZW4gMSBhbmQgMTAnKTtcbiAgICAgIGV4cGVjdChtb2NrRml0U2hvd1Njb3JlRGF0YUFjY2Vzcy5jcmVhdGVGaXRTaG93U2NvcmUpLm5vdC50b0hhdmVCZWVuQ2FsbGVkKCk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHZhbGlkYXRlIHNjb3JlIHJhbmdlcyBmb3IgdG9lbmFpbHNDbGlwcGVkICgxLTYpJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgaW5wdXQgPSB7XG4gICAgICAgIGNhdElkOiAnY2F0LTQ1NicsXG4gICAgICAgIHBhcnRpY2lwYW50TmFtZTogJ0pvaG4gRG9lJyxcbiAgICAgICAgYXR0aXJlOiA4LFxuICAgICAgICBhdHRlbnRpdmU6IDQsXG4gICAgICAgIGNvdXJ0ZW91czogNSxcbiAgICAgICAgY29udHJvbEVxdWlwbWVudDogOSxcbiAgICAgICAgcGlja3VwQ2Fycnlpbmc6IDMsXG4gICAgICAgIHNob3dpbmdIZWFkU2hhcGU6IDMsXG4gICAgICAgIHNob3dpbmdCb2R5VHlwZTogNCxcbiAgICAgICAgc2hvd2luZ1RhaWw6IDMsXG4gICAgICAgIHNob3dpbmdDb2F0VGV4dHVyZTogNCxcbiAgICAgICAgc2hvd2luZ01vdXRoVGVldGhHdW1zOiAyLFxuICAgICAgICBjb25kaXRpb25Nb3V0aFRlZXRoR3VtczogMixcbiAgICAgICAgc2hvd2luZ05vc2U6IDIsXG4gICAgICAgIHNob3dpbmdFeWVzOiAyLFxuICAgICAgICBjb25kaXRpb25Ob3NlRXllczogMixcbiAgICAgICAgc2hvd2luZ0VhcnM6IDIsXG4gICAgICAgIGVhcnNDbGVhbjogMixcbiAgICAgICAgc2hvd2luZ1RvZW5haWxzQ2xhd3M6IDMsXG4gICAgICAgIHRvZW5haWxzQ2xpcHBlZDogMTAsIC8vIEludmFsaWQ6ID4gNlxuICAgICAgICBzaG93aW5nQmVsbHlDb2F0Q2xlYW5saW5lc3M6IDMsXG4gICAgICAgIGNvYXRDbGVhbldlbGxHcm9vbWVkOiA3LFxuICAgICAgICBjYXRIZWFsdGhDYXJlOiAzLFxuICAgICAgICBnZW5lcmFsS25vd2xlZGdlOiAzLFxuICAgICAgICBjYXRCcmVlZHNTaG93aW5nOiAzLFxuICAgICAgICBjYXRBbmF0b215OiAyLFxuICAgICAgICBmb3VySEtub3dsZWRnZTogMyxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KCdjcmVhdGVGaXRTaG93U2NvcmUnLCB7IGlucHV0IH0pO1xuXG4gICAgICBhd2FpdCBleHBlY3QoaGFuZGxlcihldmVudCkpLnJlamVjdHMudG9UaHJvdygndG9lbmFpbHNDbGlwcGVkIG11c3QgYmUgYmV0d2VlbiAxIGFuZCA2Jyk7XG4gICAgICBleHBlY3QobW9ja0ZpdFNob3dTY29yZURhdGFBY2Nlc3MuY3JlYXRlRml0U2hvd1Njb3JlKS5ub3QudG9IYXZlQmVlbkNhbGxlZCgpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCB2YWxpZGF0ZSBwYXJ0aWNpcGFudCBuYW1lIGlzIHJlcXVpcmVkJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgaW5wdXQgPSB7XG4gICAgICAgIGNhdElkOiAnY2F0LTQ1NicsXG4gICAgICAgIHBhcnRpY2lwYW50TmFtZTogJycsIC8vIEludmFsaWQ6IGVtcHR5XG4gICAgICAgIGF0dGlyZTogOCxcbiAgICAgICAgYXR0ZW50aXZlOiA0LFxuICAgICAgICBjb3VydGVvdXM6IDUsXG4gICAgICAgIGNvbnRyb2xFcXVpcG1lbnQ6IDksXG4gICAgICAgIHBpY2t1cENhcnJ5aW5nOiAzLFxuICAgICAgICBzaG93aW5nSGVhZFNoYXBlOiAzLFxuICAgICAgICBzaG93aW5nQm9keVR5cGU6IDQsXG4gICAgICAgIHNob3dpbmdUYWlsOiAzLFxuICAgICAgICBzaG93aW5nQ29hdFRleHR1cmU6IDQsXG4gICAgICAgIHNob3dpbmdNb3V0aFRlZXRoR3VtczogMixcbiAgICAgICAgY29uZGl0aW9uTW91dGhUZWV0aEd1bXM6IDIsXG4gICAgICAgIHNob3dpbmdOb3NlOiAyLFxuICAgICAgICBzaG93aW5nRXllczogMixcbiAgICAgICAgY29uZGl0aW9uTm9zZUV5ZXM6IDIsXG4gICAgICAgIHNob3dpbmdFYXJzOiAyLFxuICAgICAgICBlYXJzQ2xlYW46IDIsXG4gICAgICAgIHNob3dpbmdUb2VuYWlsc0NsYXdzOiAzLFxuICAgICAgICB0b2VuYWlsc0NsaXBwZWQ6IDUsXG4gICAgICAgIHNob3dpbmdCZWxseUNvYXRDbGVhbmxpbmVzczogMyxcbiAgICAgICAgY29hdENsZWFuV2VsbEdyb29tZWQ6IDcsXG4gICAgICAgIGNhdEhlYWx0aENhcmU6IDMsXG4gICAgICAgIGdlbmVyYWxLbm93bGVkZ2U6IDMsXG4gICAgICAgIGNhdEJyZWVkc1Nob3dpbmc6IDMsXG4gICAgICAgIGNhdEFuYXRvbXk6IDIsXG4gICAgICAgIGZvdXJIS25vd2xlZGdlOiAzLFxuICAgICAgfTtcblxuICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVNb2NrRXZlbnQoJ2NyZWF0ZUZpdFNob3dTY29yZScsIHsgaW5wdXQgfSk7XG5cbiAgICAgIGF3YWl0IGV4cGVjdChoYW5kbGVyKGV2ZW50KSkucmVqZWN0cy50b1Rocm93KCdQYXJ0aWNpcGFudCBuYW1lIGlzIHJlcXVpcmVkIGFuZCBjYW5ub3QgYmUgZW1wdHknKTtcbiAgICAgIGV4cGVjdChtb2NrRml0U2hvd1Njb3JlRGF0YUFjY2Vzcy5jcmVhdGVGaXRTaG93U2NvcmUpLm5vdC50b0hhdmVCZWVuQ2FsbGVkKCk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHZhbGlkYXRlIGNvbW1lbnQgbGVuZ3RocycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGxvbmdDb21tZW50ID0gJ2EnLnJlcGVhdCg1MDEpOyAvLyBUb28gbG9uZ1xuICAgICAgY29uc3QgaW5wdXQgPSB7XG4gICAgICAgIGNhdElkOiAnY2F0LTQ1NicsXG4gICAgICAgIHBhcnRpY2lwYW50TmFtZTogJ0pvaG4gRG9lJyxcbiAgICAgICAgYXR0aXJlOiA4LFxuICAgICAgICBhdHRlbnRpdmU6IDQsXG4gICAgICAgIGNvdXJ0ZW91czogNSxcbiAgICAgICAgY29udHJvbEVxdWlwbWVudDogOSxcbiAgICAgICAgcGlja3VwQ2Fycnlpbmc6IDMsXG4gICAgICAgIHNob3dpbmdIZWFkU2hhcGU6IDMsXG4gICAgICAgIHNob3dpbmdCb2R5VHlwZTogNCxcbiAgICAgICAgc2hvd2luZ1RhaWw6IDMsXG4gICAgICAgIHNob3dpbmdDb2F0VGV4dHVyZTogNCxcbiAgICAgICAgc2hvd2luZ01vdXRoVGVldGhHdW1zOiAyLFxuICAgICAgICBjb25kaXRpb25Nb3V0aFRlZXRoR3VtczogMixcbiAgICAgICAgc2hvd2luZ05vc2U6IDIsXG4gICAgICAgIHNob3dpbmdFeWVzOiAyLFxuICAgICAgICBjb25kaXRpb25Ob3NlRXllczogMixcbiAgICAgICAgc2hvd2luZ0VhcnM6IDIsXG4gICAgICAgIGVhcnNDbGVhbjogMixcbiAgICAgICAgc2hvd2luZ1RvZW5haWxzQ2xhd3M6IDMsXG4gICAgICAgIHRvZW5haWxzQ2xpcHBlZDogNSxcbiAgICAgICAgc2hvd2luZ0JlbGx5Q29hdENsZWFubGluZXNzOiAzLFxuICAgICAgICBjb2F0Q2xlYW5XZWxsR3Jvb21lZDogNyxcbiAgICAgICAgY2F0SGVhbHRoQ2FyZTogMyxcbiAgICAgICAgZ2VuZXJhbEtub3dsZWRnZTogMyxcbiAgICAgICAgY2F0QnJlZWRzU2hvd2luZzogMyxcbiAgICAgICAgY2F0QW5hdG9teTogMixcbiAgICAgICAgZm91ckhLbm93bGVkZ2U6IDMsXG4gICAgICAgIGFwcGVhcmFuY2VDb21tZW50czogbG9uZ0NvbW1lbnQsXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBldmVudCA9IGNyZWF0ZU1vY2tFdmVudCgnY3JlYXRlRml0U2hvd1Njb3JlJywgeyBpbnB1dCB9KTtcblxuICAgICAgYXdhaXQgZXhwZWN0KGhhbmRsZXIoZXZlbnQpKS5yZWplY3RzLnRvVGhyb3coJ0NvbW1lbnQgbXVzdCBiZSA1MDAgY2hhcmFjdGVycyBvciBsZXNzJyk7XG4gICAgICBleHBlY3QobW9ja0ZpdFNob3dTY29yZURhdGFBY2Nlc3MuY3JlYXRlRml0U2hvd1Njb3JlKS5ub3QudG9IYXZlQmVlbkNhbGxlZCgpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgndXBkYXRlRml0U2hvd1Njb3JlJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgdXBkYXRlIGEgZml0IGFuZCBzaG93IHNjb3JlIHN1Y2Nlc3NmdWxseScsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGlucHV0ID0ge1xuICAgICAgICBhdHRpcmU6IDksXG4gICAgICAgIGFwcGVhcmFuY2VDb21tZW50czogJ1VwZGF0ZWQgY29tbWVudCcsXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBleGlzdGluZ1Njb3JlID0geyAuLi5tb2NrRml0U2hvd1Njb3JlLCBqdWRnZUlkOiAnanVkZ2UtMTIzJyB9O1xuICAgICAgY29uc3QgdXBkYXRlZFNjb3JlID0geyAuLi5leGlzdGluZ1Njb3JlLCAuLi5pbnB1dCB9O1xuXG4gICAgICBtb2NrRml0U2hvd1Njb3JlRGF0YUFjY2Vzcy5nZXRGaXRTaG93U2NvcmUubW9ja1Jlc29sdmVkVmFsdWUoZXhpc3RpbmdTY29yZSk7XG4gICAgICBtb2NrRml0U2hvd1Njb3JlRGF0YUFjY2Vzcy51cGRhdGVGaXRTaG93U2NvcmUubW9ja1Jlc29sdmVkVmFsdWUodXBkYXRlZFNjb3JlKTtcblxuICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVNb2NrRXZlbnQoJ3VwZGF0ZUZpdFNob3dTY29yZScsIHsgaWQ6ICdmaXRzaG93LXNjb3JlLTEyMycsIGlucHV0IH0pO1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCk7XG5cbiAgICAgIGV4cGVjdChtb2NrRml0U2hvd1Njb3JlRGF0YUFjY2Vzcy51cGRhdGVGaXRTaG93U2NvcmUpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKHtcbiAgICAgICAgLi4uaW5wdXQsXG4gICAgICAgIGlkOiAnZml0c2hvdy1zY29yZS0xMjMnLFxuICAgICAgfSk7XG4gICAgICBleHBlY3QocmVzdWx0KS50b0VxdWFsKHVwZGF0ZWRTY29yZSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHJlamVjdCB1cGRhdGUgZm9yIG5vbi1leGlzdGVudCBzY29yZScsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGlucHV0ID0geyBhdHRpcmU6IDkgfTtcblxuICAgICAgbW9ja0ZpdFNob3dTY29yZURhdGFBY2Nlc3MuZ2V0Rml0U2hvd1Njb3JlLm1vY2tSZXNvbHZlZFZhbHVlKG51bGwpO1xuXG4gICAgICBjb25zdCBldmVudCA9IGNyZWF0ZU1vY2tFdmVudCgndXBkYXRlRml0U2hvd1Njb3JlJywgeyBpZDogJ25vbmV4aXN0ZW50JywgaW5wdXQgfSk7XG5cbiAgICAgIGF3YWl0IGV4cGVjdChoYW5kbGVyKGV2ZW50KSkucmVqZWN0cy50b1Rocm93KCdGaXQgYW5kIHNob3cgc2NvcmUgd2l0aCBJRCBub25leGlzdGVudCBub3QgZm91bmQnKTtcbiAgICAgIGV4cGVjdChtb2NrRml0U2hvd1Njb3JlRGF0YUFjY2Vzcy51cGRhdGVGaXRTaG93U2NvcmUpLm5vdC50b0hhdmVCZWVuQ2FsbGVkKCk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHJlamVjdCB1cGRhdGUgZm9yIGZpbmFsaXplZCBzY29yZSBieSBub24tYWRtaW4nLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBpbnB1dCA9IHsgYXR0aXJlOiA5IH07XG4gICAgICBjb25zdCBmaW5hbGl6ZWRTY29yZSA9IHsgLi4ubW9ja0ZpdFNob3dTY29yZSwgaXNGaW5hbGl6ZWQ6IHRydWUsIGp1ZGdlSWQ6ICdqdWRnZS0xMjMnIH07XG5cbiAgICAgIG1vY2tGaXRTaG93U2NvcmVEYXRhQWNjZXNzLmdldEZpdFNob3dTY29yZS5tb2NrUmVzb2x2ZWRWYWx1ZShmaW5hbGl6ZWRTY29yZSk7XG5cbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KCd1cGRhdGVGaXRTaG93U2NvcmUnLCB7IGlkOiAnZml0c2hvdy1zY29yZS0xMjMnLCBpbnB1dCB9KTtcblxuICAgICAgYXdhaXQgZXhwZWN0KGhhbmRsZXIoZXZlbnQpKS5yZWplY3RzLnRvVGhyb3coJ0Nhbm5vdCBtb2RpZnkgZmluYWxpemVkIGZpdCBhbmQgc2hvdyBzY29yZXMuIEFkbWluIGFjY2VzcyByZXF1aXJlZC4nKTtcbiAgICAgIGV4cGVjdChtb2NrRml0U2hvd1Njb3JlRGF0YUFjY2Vzcy51cGRhdGVGaXRTaG93U2NvcmUpLm5vdC50b0hhdmVCZWVuQ2FsbGVkKCk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdnZXRGaXRTaG93U2NvcmUnLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCBnZXQgYSBmaXQgYW5kIHNob3cgc2NvcmUgZm9yIGp1ZGdlIChvd24gc2NvcmUpJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3Qgc2NvcmUgPSB7IC4uLm1vY2tGaXRTaG93U2NvcmUsIGp1ZGdlSWQ6ICdqdWRnZS0xMjMnIH07XG4gICAgICBtb2NrRml0U2hvd1Njb3JlRGF0YUFjY2Vzcy5nZXRGaXRTaG93U2NvcmUubW9ja1Jlc29sdmVkVmFsdWUoc2NvcmUpO1xuXG4gICAgICBjb25zdCBldmVudCA9IGNyZWF0ZU1vY2tFdmVudCgnZ2V0Rml0U2hvd1Njb3JlJywgeyBpZDogJ2ZpdHNob3ctc2NvcmUtMTIzJyB9KTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0KS50b0VxdWFsKHNjb3JlKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgZ2V0IGEgZmluYWxpemVkIGZpdCBhbmQgc2hvdyBzY29yZSBmb3IgcGFydGljaXBhbnQnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBzY29yZSA9IHsgLi4ubW9ja0ZpdFNob3dTY29yZSwgaXNGaW5hbGl6ZWQ6IHRydWUgfTtcbiAgICAgIG1vY2tGaXRTaG93U2NvcmVEYXRhQWNjZXNzLmdldEZpdFNob3dTY29yZS5tb2NrUmVzb2x2ZWRWYWx1ZShzY29yZSk7XG5cbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KCdnZXRGaXRTaG93U2NvcmUnLCB7IGlkOiAnZml0c2hvdy1zY29yZS0xMjMnIH0sICdwYXJ0aWNpcGFudCcpO1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvRXF1YWwoc2NvcmUpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCByZWplY3Qgbm9uLWZpbmFsaXplZCBzY29yZSBmb3IgcGFydGljaXBhbnQnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBzY29yZSA9IHsgLi4ubW9ja0ZpdFNob3dTY29yZSwgaXNGaW5hbGl6ZWQ6IGZhbHNlIH07XG4gICAgICBtb2NrRml0U2hvd1Njb3JlRGF0YUFjY2Vzcy5nZXRGaXRTaG93U2NvcmUubW9ja1Jlc29sdmVkVmFsdWUoc2NvcmUpO1xuXG4gICAgICBjb25zdCBldmVudCA9IGNyZWF0ZU1vY2tFdmVudCgnZ2V0Rml0U2hvd1Njb3JlJywgeyBpZDogJ2ZpdHNob3ctc2NvcmUtMTIzJyB9LCAncGFydGljaXBhbnQnKTtcblxuICAgICAgYXdhaXQgZXhwZWN0KGhhbmRsZXIoZXZlbnQpKS5yZWplY3RzLnRvVGhyb3coJ0ZpdCBhbmQgc2hvdyBzY29yZSBpcyBub3QgeWV0IGZpbmFsaXplZCBhbmQgY2Fubm90IGJlIHZpZXdlZCBieSBwYXJ0aWNpcGFudHMnKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmV0dXJuIG51bGwgZm9yIG5vbi1leGlzdGVudCBzY29yZScsIGFzeW5jICgpID0+IHtcbiAgICAgIG1vY2tGaXRTaG93U2NvcmVEYXRhQWNjZXNzLmdldEZpdFNob3dTY29yZS5tb2NrUmVzb2x2ZWRWYWx1ZShudWxsKTtcblxuICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVNb2NrRXZlbnQoJ2dldEZpdFNob3dTY29yZScsIHsgaWQ6ICdub25leGlzdGVudCcgfSk7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdCkudG9CZU51bGwoKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2dldEZpdFNob3dTY29yZXNCeUNhdCcsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIGdldCBhbGwgZml0IGFuZCBzaG93IHNjb3JlcyBmb3IgYWRtaW4nLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBzY29yZXMgPSBbbW9ja0ZpdFNob3dTY29yZV07XG4gICAgICBtb2NrRml0U2hvd1Njb3JlRGF0YUFjY2Vzcy5nZXRGaXRTaG93U2NvcmVzQnlDYXQubW9ja1Jlc29sdmVkVmFsdWUoc2NvcmVzKTtcblxuICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVNb2NrRXZlbnQoJ2dldEZpdFNob3dTY29yZXNCeUNhdCcsIHsgY2F0SWQ6ICdjYXQtNDU2JyB9LCAnYWRtaW4nKTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0KS50b0VxdWFsKHsgaXRlbXM6IHNjb3JlcyB9KTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgZmlsdGVyIGZpdCBhbmQgc2hvdyBzY29yZXMgZm9yIGp1ZGdlIChvd24gc2NvcmVzIG9ubHkpJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3Qgc2NvcmVzID0gW1xuICAgICAgICB7IC4uLm1vY2tGaXRTaG93U2NvcmUsIGp1ZGdlSWQ6ICdqdWRnZS0xMjMnIH0sXG4gICAgICAgIHsgLi4ubW9ja0ZpdFNob3dTY29yZSwgaWQ6ICdvdGhlci1zY29yZScsIGp1ZGdlSWQ6ICdvdGhlci1qdWRnZScgfSxcbiAgICAgIF07XG4gICAgICBtb2NrRml0U2hvd1Njb3JlRGF0YUFjY2Vzcy5nZXRGaXRTaG93U2NvcmVzQnlDYXQubW9ja1Jlc29sdmVkVmFsdWUoc2NvcmVzKTtcblxuICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVNb2NrRXZlbnQoJ2dldEZpdFNob3dTY29yZXNCeUNhdCcsIHsgY2F0SWQ6ICdjYXQtNDU2JyB9KTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0KS50b0VxdWFsKHsgaXRlbXM6IFtzY29yZXNbMF1dIH0pO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBmaWx0ZXIgZml0IGFuZCBzaG93IHNjb3JlcyBmb3IgcGFydGljaXBhbnQgKGZpbmFsaXplZCBvbmx5KScsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHNjb3JlcyA9IFtcbiAgICAgICAgeyAuLi5tb2NrRml0U2hvd1Njb3JlLCBpc0ZpbmFsaXplZDogdHJ1ZSB9LFxuICAgICAgICB7IC4uLm1vY2tGaXRTaG93U2NvcmUsIGlkOiAnb3RoZXItc2NvcmUnLCBpc0ZpbmFsaXplZDogZmFsc2UgfSxcbiAgICAgIF07XG4gICAgICBtb2NrRml0U2hvd1Njb3JlRGF0YUFjY2Vzcy5nZXRGaXRTaG93U2NvcmVzQnlDYXQubW9ja1Jlc29sdmVkVmFsdWUoc2NvcmVzKTtcblxuICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVNb2NrRXZlbnQoJ2dldEZpdFNob3dTY29yZXNCeUNhdCcsIHsgY2F0SWQ6ICdjYXQtNDU2JyB9LCAncGFydGljaXBhbnQnKTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0KS50b0VxdWFsKHsgaXRlbXM6IFtzY29yZXNbMF1dIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnZmluYWxpemVGaXRTaG93U2NvcmUnLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCBmaW5hbGl6ZSBhIGZpdCBhbmQgc2hvdyBzY29yZSBzdWNjZXNzZnVsbHknLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBleGlzdGluZ1Njb3JlID0geyAuLi5tb2NrRml0U2hvd1Njb3JlLCBqdWRnZUlkOiAnanVkZ2UtMTIzJywgaXNGaW5hbGl6ZWQ6IGZhbHNlIH07XG4gICAgICBjb25zdCBmaW5hbGl6ZWRTY29yZSA9IHsgLi4uZXhpc3RpbmdTY29yZSwgaXNGaW5hbGl6ZWQ6IHRydWUgfTtcblxuICAgICAgbW9ja0ZpdFNob3dTY29yZURhdGFBY2Nlc3MuZ2V0Rml0U2hvd1Njb3JlLm1vY2tSZXNvbHZlZFZhbHVlKGV4aXN0aW5nU2NvcmUpO1xuICAgICAgbW9ja0ZpdFNob3dTY29yZURhdGFBY2Nlc3MuZmluYWxpemVGaXRTaG93U2NvcmUubW9ja1Jlc29sdmVkVmFsdWUoZmluYWxpemVkU2NvcmUpO1xuXG4gICAgICBjb25zdCBldmVudCA9IGNyZWF0ZU1vY2tFdmVudCgnZmluYWxpemVGaXRTaG93U2NvcmUnLCB7IGlkOiAnZml0c2hvdy1zY29yZS0xMjMnIH0pO1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCk7XG5cbiAgICAgIGV4cGVjdChtb2NrRml0U2hvd1Njb3JlRGF0YUFjY2Vzcy5maW5hbGl6ZUZpdFNob3dTY29yZSkudG9IYXZlQmVlbkNhbGxlZFdpdGgoXG4gICAgICAgICdmaXRzaG93LXNjb3JlLTEyMycsXG4gICAgICAgICdqdWRnZS0xMjMnXG4gICAgICApO1xuICAgICAgZXhwZWN0KHJlc3VsdCkudG9FcXVhbChmaW5hbGl6ZWRTY29yZSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHJlamVjdCBmaW5hbGl6aW5nIGFscmVhZHkgZmluYWxpemVkIHNjb3JlJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZXhpc3RpbmdTY29yZSA9IHsgLi4ubW9ja0ZpdFNob3dTY29yZSwganVkZ2VJZDogJ2p1ZGdlLTEyMycsIGlzRmluYWxpemVkOiB0cnVlIH07XG5cbiAgICAgIG1vY2tGaXRTaG93U2NvcmVEYXRhQWNjZXNzLmdldEZpdFNob3dTY29yZS5tb2NrUmVzb2x2ZWRWYWx1ZShleGlzdGluZ1Njb3JlKTtcblxuICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVNb2NrRXZlbnQoJ2ZpbmFsaXplRml0U2hvd1Njb3JlJywgeyBpZDogJ2ZpdHNob3ctc2NvcmUtMTIzJyB9KTtcblxuICAgICAgYXdhaXQgZXhwZWN0KGhhbmRsZXIoZXZlbnQpKS5yZWplY3RzLnRvVGhyb3coJ0ZpdCBhbmQgc2hvdyBzY29yZSBpcyBhbHJlYWR5IGZpbmFsaXplZCcpO1xuICAgICAgZXhwZWN0KG1vY2tGaXRTaG93U2NvcmVEYXRhQWNjZXNzLmZpbmFsaXplRml0U2hvd1Njb3JlKS5ub3QudG9IYXZlQmVlbkNhbGxlZCgpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnbGlzdEFsbEZpdFNob3dTY29yZXMnLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCBsaXN0IGFsbCBmaXQgYW5kIHNob3cgc2NvcmVzIGZvciBhZG1pbicsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHNjb3JlcyA9IFttb2NrRml0U2hvd1Njb3JlXTtcbiAgICAgIG1vY2tGaXRTaG93U2NvcmVEYXRhQWNjZXNzLmxpc3RGaXRTaG93U2NvcmVzLm1vY2tSZXNvbHZlZFZhbHVlKHNjb3Jlcyk7XG5cbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KCdsaXN0QWxsRml0U2hvd1Njb3JlcycsIHt9LCAnYWRtaW4nKTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0KS50b0VxdWFsKHsgaXRlbXM6IHNjb3JlcyB9KTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmVqZWN0IGxpc3RpbmcgYWxsIHNjb3JlcyBmb3Igbm9uLWFkbWluJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVNb2NrRXZlbnQoJ2xpc3RBbGxGaXRTaG93U2NvcmVzJywge30sICdqdWRnZScpO1xuXG4gICAgICBhd2FpdCBleHBlY3QoaGFuZGxlcihldmVudCkpLnJlamVjdHMudG9UaHJvdygnRm9yYmlkZGVuOiBBZG1pbiByb2xlIHJlcXVpcmVkJyk7XG4gICAgICBleHBlY3QobW9ja0ZpdFNob3dTY29yZURhdGFBY2Nlc3MubGlzdEZpdFNob3dTY29yZXMpLm5vdC50b0hhdmVCZWVuQ2FsbGVkKCk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdnZXRGaXRTaG93U2NvcmVBdWRpdEhpc3RvcnknLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gZW1wdHkgYXVkaXQgaGlzdG9yeSAobm90IHlldCBpbXBsZW1lbnRlZCknLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBzY29yZSA9IHsgLi4ubW9ja0ZpdFNob3dTY29yZSwganVkZ2VJZDogJ2p1ZGdlLTEyMycgfTtcblxuICAgICAgbW9ja0ZpdFNob3dTY29yZURhdGFBY2Nlc3MuZ2V0Rml0U2hvd1Njb3JlLm1vY2tSZXNvbHZlZFZhbHVlKHNjb3JlKTtcblxuICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVNb2NrRXZlbnQoJ2dldEZpdFNob3dTY29yZUF1ZGl0SGlzdG9yeScsIHsgZml0U2hvd1Njb3JlSWQ6ICdmaXRzaG93LXNjb3JlLTEyMycgfSk7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdCkudG9FcXVhbCh7IGl0ZW1zOiBbXSB9KTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmVqZWN0IGF1ZGl0IGhpc3RvcnkgZm9yIG5vbi1leGlzdGVudCBzY29yZScsIGFzeW5jICgpID0+IHtcbiAgICAgIG1vY2tGaXRTaG93U2NvcmVEYXRhQWNjZXNzLmdldEZpdFNob3dTY29yZS5tb2NrUmVzb2x2ZWRWYWx1ZShudWxsKTtcblxuICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVNb2NrRXZlbnQoJ2dldEZpdFNob3dTY29yZUF1ZGl0SGlzdG9yeScsIHsgZml0U2hvd1Njb3JlSWQ6ICdub25leGlzdGVudCcgfSk7XG5cbiAgICAgIGF3YWl0IGV4cGVjdChoYW5kbGVyKGV2ZW50KSkucmVqZWN0cy50b1Rocm93KCdGaXQgYW5kIHNob3cgc2NvcmUgd2l0aCBJRCBub25leGlzdGVudCBub3QgZm91bmQnKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ3Vua25vd24gZmllbGQnLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCB0aHJvdyBlcnJvciBmb3IgdW5rbm93biBmaWVsZCcsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KCd1bmtub3duRmllbGQnKTtcblxuICAgICAgYXdhaXQgZXhwZWN0KGhhbmRsZXIoZXZlbnQpKS5yZWplY3RzLnRvVGhyb3coJ1Vua25vd24gZmllbGQ6IHVua25vd25GaWVsZCcpO1xuICAgIH0pO1xuICB9KTtcbn0pOyJdfQ==