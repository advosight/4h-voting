"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Mock the ScoreDataAccess before importing the handler
const mockScoreDataAccess = {
    createScore: jest.fn(),
    updateScore: jest.fn(),
    getScore: jest.fn(),
    getScoresByCat: jest.fn(),
    getScoresByCage: jest.fn(),
    listAllScores: jest.fn(),
    getScoresByJudge: jest.fn(),
    deleteScore: jest.fn(),
};
jest.mock('../scoreDataAccess', () => ({
    ScoreDataAccess: jest.fn().mockImplementation(() => mockScoreDataAccess),
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
const scoreResolver_1 = require("../scoreResolver");
describe('Score Resolver', () => {
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
    const mockScore = {
        id: 'score-123',
        catId: 'cat-456',
        judgeId: 'judge-123',
        judgeName: 'testjudge',
        cageConditionScore: 20,
        cageConditionComments: 'Good cage condition',
        catConditionScore: 22,
        catConditionComments: 'Healthy cat',
        groomingScore: 18,
        groomingComments: 'Well groomed',
        overallScore: 23,
        overallComments: 'Excellent overall',
        totalScore: 83,
        timestamp: '2024-01-01T00:00:00.000Z',
        isFinalized: false,
    };
    describe('createScore', () => {
        it('should create a score successfully for judge', async () => {
            const input = {
                catId: 'cat-456',
                cageConditionScore: 20,
                catConditionScore: 22,
                groomingScore: 18,
                overallScore: 23,
            };
            mockScoreDataAccess.createScore.mockResolvedValue(mockScore);
            const event = createMockEvent('createScore', { input });
            const result = await (0, scoreResolver_1.handler)(event);
            expect(mockScoreDataAccess.createScore).toHaveBeenCalledWith({
                ...input,
                judgeId: 'judge-123',
                judgeName: 'testjudge',
            });
            expect(result).toEqual(mockScore);
        });
        it('should create a score successfully for admin', async () => {
            const input = {
                catId: 'cat-456',
                cageConditionScore: 20,
                catConditionScore: 22,
                groomingScore: 18,
                overallScore: 23,
            };
            mockScoreDataAccess.createScore.mockResolvedValue(mockScore);
            const event = createMockEvent('createScore', { input }, 'admin');
            const result = await (0, scoreResolver_1.handler)(event);
            expect(result).toEqual(mockScore);
        });
        it('should reject creation for non-judge/admin users', async () => {
            const input = {
                catId: 'cat-456',
                cageConditionScore: 20,
                catConditionScore: 22,
                groomingScore: 18,
                overallScore: 23,
            };
            const event = createMockEvent('createScore', { input }, 'participant');
            await expect((0, scoreResolver_1.handler)(event)).rejects.toThrow('Forbidden: Judge role required');
            expect(mockScoreDataAccess.createScore).not.toHaveBeenCalled();
        });
        it('should validate score ranges', async () => {
            const input = {
                catId: 'cat-456',
                cageConditionScore: 30, // Invalid: > 25
                catConditionScore: 22,
                groomingScore: 18,
                overallScore: 23,
            };
            const event = createMockEvent('createScore', { input });
            await expect((0, scoreResolver_1.handler)(event)).rejects.toThrow('Invalid cageConditionScore: must be between 0 and 25');
            expect(mockScoreDataAccess.createScore).not.toHaveBeenCalled();
        });
        it('should validate comment lengths', async () => {
            const input = {
                catId: 'cat-456',
                cageConditionScore: 20,
                catConditionScore: 22,
                groomingScore: 18,
                overallScore: 23,
                cageConditionComments: 'a'.repeat(501), // Too long
            };
            const event = createMockEvent('createScore', { input });
            await expect((0, scoreResolver_1.handler)(event)).rejects.toThrow('Invalid cageConditionComments: must be 500 characters or less');
            expect(mockScoreDataAccess.createScore).not.toHaveBeenCalled();
        });
        it('should reject creation without authentication', async () => {
            const input = {
                catId: 'cat-456',
                cageConditionScore: 20,
                catConditionScore: 22,
                groomingScore: 18,
                overallScore: 23,
            };
            const event = {
                info: { fieldName: 'createScore' },
                arguments: { input },
                identity: null,
            };
            await expect((0, scoreResolver_1.handler)(event)).rejects.toThrow('Unauthorized: No user context found');
        });
    });
    describe('updateScore', () => {
        it('should update own score successfully', async () => {
            const input = { cageConditionScore: 25 };
            const updatedScore = { ...mockScore, cageConditionScore: 25, totalScore: 88 };
            mockScoreDataAccess.getScore.mockResolvedValue(mockScore);
            mockScoreDataAccess.updateScore.mockResolvedValue(updatedScore);
            const event = createMockEvent('updateScore', { id: 'score-123', input });
            const result = await (0, scoreResolver_1.handler)(event);
            expect(mockScoreDataAccess.updateScore).toHaveBeenCalledWith('score-123', input);
            expect(result).toEqual(updatedScore);
        });
        it('should allow admin to update any score', async () => {
            const input = { cageConditionScore: 25 };
            const otherJudgeScore = { ...mockScore, judgeId: 'other-judge' };
            const updatedScore = { ...otherJudgeScore, cageConditionScore: 25 };
            mockScoreDataAccess.getScore.mockResolvedValue(otherJudgeScore);
            mockScoreDataAccess.updateScore.mockResolvedValue(updatedScore);
            const event = createMockEvent('updateScore', { id: 'score-123', input }, 'admin');
            const result = await (0, scoreResolver_1.handler)(event);
            expect(result).toEqual(updatedScore);
        });
        it('should reject updating other judge scores', async () => {
            const input = { cageConditionScore: 25 };
            const otherJudgeScore = { ...mockScore, judgeId: 'other-judge' };
            mockScoreDataAccess.getScore.mockResolvedValue(otherJudgeScore);
            const event = createMockEvent('updateScore', { id: 'score-123', input });
            await expect((0, scoreResolver_1.handler)(event)).rejects.toThrow('Forbidden: Can only edit your own scores');
            expect(mockScoreDataAccess.updateScore).not.toHaveBeenCalled();
        });
        it('should reject updating finalized scores for non-admin', async () => {
            const input = { cageConditionScore: 25 };
            const finalizedScore = { ...mockScore, isFinalized: true };
            mockScoreDataAccess.getScore.mockResolvedValue(finalizedScore);
            const event = createMockEvent('updateScore', { id: 'score-123', input });
            await expect((0, scoreResolver_1.handler)(event)).rejects.toThrow('Forbidden: Cannot modify finalized scores');
            expect(mockScoreDataAccess.updateScore).not.toHaveBeenCalled();
        });
        it('should allow admin to update finalized scores', async () => {
            const input = { cageConditionScore: 25 };
            const finalizedScore = { ...mockScore, isFinalized: true };
            const updatedScore = { ...finalizedScore, cageConditionScore: 25 };
            mockScoreDataAccess.getScore.mockResolvedValue(finalizedScore);
            mockScoreDataAccess.updateScore.mockResolvedValue(updatedScore);
            const event = createMockEvent('updateScore', { id: 'score-123', input }, 'admin');
            const result = await (0, scoreResolver_1.handler)(event);
            expect(result).toEqual(updatedScore);
        });
        it('should handle non-existent score', async () => {
            const input = { cageConditionScore: 25 };
            mockScoreDataAccess.getScore.mockResolvedValue(null);
            const event = createMockEvent('updateScore', { id: 'nonexistent', input });
            await expect((0, scoreResolver_1.handler)(event)).rejects.toThrow('Score not found');
            expect(mockScoreDataAccess.updateScore).not.toHaveBeenCalled();
        });
    });
    describe('getScore', () => {
        it('should get own score successfully', async () => {
            mockScoreDataAccess.getScore.mockResolvedValue(mockScore);
            const event = createMockEvent('getScore', { id: 'score-123' });
            const result = await (0, scoreResolver_1.handler)(event);
            expect(result).toEqual(mockScore);
        });
        it('should allow admin to get any score', async () => {
            const otherJudgeScore = { ...mockScore, judgeId: 'other-judge' };
            mockScoreDataAccess.getScore.mockResolvedValue(otherJudgeScore);
            const event = createMockEvent('getScore', { id: 'score-123' }, 'admin');
            const result = await (0, scoreResolver_1.handler)(event);
            expect(result).toEqual(otherJudgeScore);
        });
        it('should reject getting other judge scores', async () => {
            const otherJudgeScore = { ...mockScore, judgeId: 'other-judge' };
            mockScoreDataAccess.getScore.mockResolvedValue(otherJudgeScore);
            const event = createMockEvent('getScore', { id: 'score-123' });
            await expect((0, scoreResolver_1.handler)(event)).rejects.toThrow('Forbidden: Can only view your own scores');
        });
        it('should return null for non-existent score', async () => {
            mockScoreDataAccess.getScore.mockResolvedValue(null);
            const event = createMockEvent('getScore', { id: 'nonexistent' });
            const result = await (0, scoreResolver_1.handler)(event);
            expect(result).toBeNull();
        });
    });
    describe('getScoresByCat', () => {
        const mockScores = [
            mockScore,
            { ...mockScore, id: 'score-456', judgeId: 'other-judge' },
        ];
        it('should return all scores for admin', async () => {
            mockScoreDataAccess.getScoresByCat.mockResolvedValue(mockScores);
            const event = createMockEvent('getScoresByCat', { catId: 'cat-456' }, 'admin');
            const result = await (0, scoreResolver_1.handler)(event);
            expect(result).toEqual({ items: mockScores });
        });
        it('should filter to own scores for judge', async () => {
            mockScoreDataAccess.getScoresByCat.mockResolvedValue(mockScores);
            const event = createMockEvent('getScoresByCat', { catId: 'cat-456' });
            const result = await (0, scoreResolver_1.handler)(event);
            expect(result).toEqual({ items: [mockScore] });
        });
        it('should return only finalized scores for participants', async () => {
            const finalizedScore = { ...mockScore, isFinalized: true };
            const unfinalizedScore = { ...mockScore, id: 'score-456', isFinalized: false };
            mockScoreDataAccess.getScoresByCat.mockResolvedValue([finalizedScore, unfinalizedScore]);
            const event = createMockEvent('getScoresByCat', { catId: 'cat-456' }, 'participant');
            const result = await (0, scoreResolver_1.handler)(event);
            expect(result).toEqual({ items: [finalizedScore] });
        });
    });
    describe('getScoresByCage', () => {
        it('should get scores by cage number', async () => {
            mockScoreDataAccess.getScoresByCage.mockResolvedValue([mockScore]);
            const event = createMockEvent('getScoresByCage', { cageNumber: 1 }, 'admin');
            const result = await (0, scoreResolver_1.handler)(event);
            expect(result).toEqual({ items: [mockScore] });
            expect(mockScoreDataAccess.getScoresByCage).toHaveBeenCalledWith(1);
        });
    });
    describe('listAllScores', () => {
        it('should list all scores for admin', async () => {
            const allScores = [mockScore, { ...mockScore, id: 'score-456' }];
            mockScoreDataAccess.listAllScores.mockResolvedValue(allScores);
            const event = createMockEvent('listAllScores', {}, 'admin');
            const result = await (0, scoreResolver_1.handler)(event);
            expect(result).toEqual({ items: allScores });
        });
        it('should reject listing all scores for non-admin', async () => {
            const event = createMockEvent('listAllScores', {});
            await expect((0, scoreResolver_1.handler)(event)).rejects.toThrow('Forbidden: Admin role required');
            expect(mockScoreDataAccess.listAllScores).not.toHaveBeenCalled();
        });
    });
    describe('getScoresByJudge', () => {
        it('should get own scores', async () => {
            mockScoreDataAccess.getScoresByJudge.mockResolvedValue([mockScore]);
            const event = createMockEvent('getScoresByJudge', { judgeId: 'judge-123' });
            const result = await (0, scoreResolver_1.handler)(event);
            expect(result).toEqual({ items: [mockScore] });
        });
        it('should allow admin to get any judge scores', async () => {
            mockScoreDataAccess.getScoresByJudge.mockResolvedValue([mockScore]);
            const event = createMockEvent('getScoresByJudge', { judgeId: 'other-judge' }, 'admin');
            const result = await (0, scoreResolver_1.handler)(event);
            expect(result).toEqual({ items: [mockScore] });
        });
        it('should reject getting other judge scores', async () => {
            const event = createMockEvent('getScoresByJudge', { judgeId: 'other-judge' });
            await expect((0, scoreResolver_1.handler)(event)).rejects.toThrow('Forbidden: Can only view your own scores');
            expect(mockScoreDataAccess.getScoresByJudge).not.toHaveBeenCalled();
        });
    });
    describe('finalizeScore', () => {
        it('should finalize own score', async () => {
            const finalizedScore = { ...mockScore, isFinalized: true };
            mockScoreDataAccess.getScore.mockResolvedValue(mockScore);
            mockScoreDataAccess.updateScore.mockResolvedValue(finalizedScore);
            const event = createMockEvent('finalizeScore', { id: 'score-123' });
            const result = await (0, scoreResolver_1.handler)(event);
            expect(mockScoreDataAccess.updateScore).toHaveBeenCalledWith('score-123', { isFinalized: true });
            expect(result).toEqual(finalizedScore);
        });
        it('should allow admin to finalize any score', async () => {
            const otherJudgeScore = { ...mockScore, judgeId: 'other-judge' };
            const finalizedScore = { ...otherJudgeScore, isFinalized: true };
            mockScoreDataAccess.getScore.mockResolvedValue(otherJudgeScore);
            mockScoreDataAccess.updateScore.mockResolvedValue(finalizedScore);
            const event = createMockEvent('finalizeScore', { id: 'score-123' }, 'admin');
            const result = await (0, scoreResolver_1.handler)(event);
            expect(result).toEqual(finalizedScore);
        });
        it('should reject finalizing other judge scores', async () => {
            const otherJudgeScore = { ...mockScore, judgeId: 'other-judge' };
            mockScoreDataAccess.getScore.mockResolvedValue(otherJudgeScore);
            const event = createMockEvent('finalizeScore', { id: 'score-123' });
            await expect((0, scoreResolver_1.handler)(event)).rejects.toThrow('Forbidden: Can only finalize your own scores');
            expect(mockScoreDataAccess.updateScore).not.toHaveBeenCalled();
        });
        it('should handle non-existent score', async () => {
            mockScoreDataAccess.getScore.mockResolvedValue(null);
            const event = createMockEvent('finalizeScore', { id: 'nonexistent' });
            await expect((0, scoreResolver_1.handler)(event)).rejects.toThrow('Score not found');
            expect(mockScoreDataAccess.updateScore).not.toHaveBeenCalled();
        });
    });
    describe('error handling', () => {
        it('should handle unknown field names', async () => {
            const event = createMockEvent('unknownField');
            await expect((0, scoreResolver_1.handler)(event)).rejects.toThrow('Unknown field: unknownField');
        });
        it('should handle data access errors', async () => {
            mockScoreDataAccess.getScore.mockRejectedValue(new Error('Database error'));
            const event = createMockEvent('getScore', { id: 'score-123' });
            await expect((0, scoreResolver_1.handler)(event)).rejects.toThrow('Database error');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NvcmVSZXNvbHZlci50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2NvcmVSZXNvbHZlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBRUEsd0RBQXdEO0FBQ3hELE1BQU0sbUJBQW1CLEdBQUc7SUFDMUIsV0FBVyxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7SUFDdEIsV0FBVyxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7SUFDdEIsUUFBUSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7SUFDbkIsY0FBYyxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7SUFDekIsZUFBZSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7SUFDMUIsYUFBYSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7SUFDeEIsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtJQUMzQixXQUFXLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtDQUN2QixDQUFDO0FBRUYsSUFBSSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQ3JDLGVBQWUsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsbUJBQW1CLENBQUM7Q0FDekUsQ0FBQyxDQUFDLENBQUM7QUFFSixlQUFlO0FBQ2YsSUFBSSxDQUFDLElBQUksQ0FBQywwQkFBMEIsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQzNDLGNBQWMsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO0NBQzFCLENBQUMsQ0FBQyxDQUFDO0FBRUosSUFBSSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQ3hDLHNCQUFzQixFQUFFO1FBQ3RCLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO0tBQ2hCO0NBQ0YsQ0FBQyxDQUFDLENBQUM7QUFFSixnREFBZ0Q7QUFDaEQsb0RBQTJD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dGVudCI6WyJpbXBvcnQgeyBBcHBTeW5jUmVzb2x2ZXJFdmVudCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuXG4vLyBNb2NrIHRoZSBTY29yZURhdGFBY2Nlc3MgYmVmb3JlIGltcG9ydGluZyB0aGUgaGFuZGxlclxuY29uc3QgbW9ja1Njb3JlRGF0YUFjY2VzcyA9IHtcbiAgY3JlYXRlU2NvcmU6IGplc3QuZm4oKSxcbiAgdXBkYXRlU2NvcmU6IGplc3QuZm4oKSxcbiAgZ2V0U2NvcmU6IGplc3QuZm4oKSxcbiAgZ2V0U2NvcmVzQnlDYXQ6IGplc3QuZm4oKSxcbiAgZ2V0U2NvcmVzQnlDYWdlOiBqZXN0LmZuKCksXG4gIGxpc3RBbGxTY29yZXM6IGplc3QuZm4oKSxcbiAgZ2V0U2NvcmVzQnlKdWRnZTogamVzdC5mbigpLFxuICBkZWxldGVTY29yZTogamVzdC5mbigpLFxufTtcblxuamVzdC5tb2NrKCcuLi9zY29yZURhdGFBY2Nlc3MnLCAoKSA9PiAoe1xuICBTY29yZURhdGFBY2Nlc3M6IGplc3QuZm4oKS5tb2NrSW1wbGVtZW50YXRpb24oKCkgPT4gbW9ja1Njb3JlRGF0YUFjY2VzcyksXG59KSk7XG5cbi8vIE1vY2sgQVdTIFNES1xuamVzdC5tb2NrKCdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInLCAoKSA9PiAoe1xuICBEeW5hbW9EQkNsaWVudDogamVzdC5mbigpLFxufSkpO1xuXG5qZXN0Lm1vY2soJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYicsICgpID0+ICh7XG4gIER5bmFtb0RCRG9jdW1lbnRDbGllbnQ6IHtcbiAgICBmcm9tOiBqZXN0LmZuKCksXG4gIH0sXG59KSk7XG5cbi8vIE5vdyBpbXBvcnQgdGhlIGhhbmRsZXIgYWZ0ZXIgbW9ja3MgYXJlIHNldCB1cFxuaW1wb3J0IHsgaGFuZGxlciB9IGZyb20gJy4uL3Njb3JlUmVzb2x2ZXInO1xuXG5kZXNjcmliZSgnU2NvcmUgUmVzb2x2ZXInLCAoKSA9PiB7XG4gIGJlZm9yZUVhY2goKCkgPT4ge1xuICAgIGplc3QuY2xlYXJBbGxNb2NrcygpO1xuICB9KTtcblxuICBjb25zdCBjcmVhdGVNb2NrRXZlbnQgPSAoXG4gICAgZmllbGROYW1lOiBzdHJpbmcsXG4gICAgYXJndW1lbnRzXzogYW55ID0ge30sXG4gICAgdXNlclJvbGU6IHN0cmluZyA9ICdqdWRnZScsXG4gICAgdXNlcklkOiBzdHJpbmcgPSAnanVkZ2UtMTIzJ1xuICApOiBBcHBTeW5jUmVzb2x2ZXJFdmVudDxhbnk+ID0+ICh7XG4gICAgaW5mbzogeyBmaWVsZE5hbWUgfSxcbiAgICBhcmd1bWVudHM6IGFyZ3VtZW50c18sXG4gICAgaWRlbnRpdHk6IHtcbiAgICAgIGNsYWltczoge1xuICAgICAgICBzdWI6IHVzZXJJZCxcbiAgICAgICAgJ2NvZ25pdG86dXNlcm5hbWUnOiAndGVzdGp1ZGdlJyxcbiAgICAgICAgJ2N1c3RvbTpyb2xlJzogdXNlclJvbGUsXG4gICAgICAgIGVtYWlsOiAnanVkZ2VAZXhhbXBsZS5jb20nLFxuICAgICAgfSxcbiAgICB9LFxuICB9IGFzIGFueSk7XG5cbiAgY29uc3QgbW9ja1Njb3JlID0ge1xuICAgIGlkOiAnc2NvcmUtMTIzJyxcbiAgICBjYXRJZDogJ2NhdC00NTYnLFxuICAgIGp1ZGdlSWQ6ICdqdWRnZS0xMjMnLFxuICAgIGp1ZGdlTmFtZTogJ3Rlc3RqdWRnZScsXG4gICAgY2FnZUNvbmRpdGlvblNjb3JlOiAyMCxcbiAgICBjYWdlQ29uZGl0aW9uQ29tbWVudHM6ICdHb29kIGNhZ2UgY29uZGl0aW9uJyxcbiAgICBjYXRDb25kaXRpb25TY29yZTogMjIsXG4gICAgY2F0Q29uZGl0aW9uQ29tbWVudHM6ICdIZWFsdGh5IGNhdCcsXG4gICAgZ3Jvb21pbmdTY29yZTogMTgsXG4gICAgZ3Jvb21pbmdDb21tZW50czogJ1dlbGwgZ3Jvb21lZCcsXG4gICAgb3ZlcmFsbFNjb3JlOiAyMyxcbiAgICBvdmVyYWxsQ29tbWVudHM6ICdFeGNlbGxlbnQgb3ZlcmFsbCcsXG4gICAgdG90YWxTY29yZTogODMsXG4gICAgdGltZXN0YW1wOiAnMjAyNC0wMS0wMVQwMDowMDowMC4wMDBaJyxcbiAgICBpc0ZpbmFsaXplZDogZmFsc2UsXG4gIH07XG5cbiAgZGVzY3JpYmUoJ2NyZWF0ZVNjb3JlJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgY3JlYXRlIGEgc2NvcmUgc3VjY2Vzc2Z1bGx5IGZvciBqdWRnZScsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGlucHV0ID0ge1xuICAgICAgICBjYXRJZDogJ2NhdC00NTYnLFxuICAgICAgICBjYWdlQ29uZGl0aW9uU2NvcmU6IDIwLFxuICAgICAgICBjYXRDb25kaXRpb25TY29yZTogMjIsXG4gICAgICAgIGdyb29taW5nU2NvcmU6IDE4LFxuICAgICAgICBvdmVyYWxsU2NvcmU6IDIzLFxuICAgICAgfTtcblxuICAgICAgbW9ja1Njb3JlRGF0YUFjY2Vzcy5jcmVhdGVTY29yZS5tb2NrUmVzb2x2ZWRWYWx1ZShtb2NrU2NvcmUpO1xuXG4gICAgICBjb25zdCBldmVudCA9IGNyZWF0ZU1vY2tFdmVudCgnY3JlYXRlU2NvcmUnLCB7IGlucHV0IH0pO1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCk7XG5cbiAgICAgIGV4cGVjdChtb2NrU2NvcmVEYXRhQWNjZXNzLmNyZWF0ZVNjb3JlKS50b0hhdmVCZWVuQ2FsbGVkV2l0aCh7XG4gICAgICAgIC4uLmlucHV0LFxuICAgICAgICBqdWRnZUlkOiAnanVkZ2UtMTIzJyxcbiAgICAgICAganVkZ2VOYW1lOiAndGVzdGp1ZGdlJyxcbiAgICAgIH0pO1xuICAgICAgZXhwZWN0KHJlc3VsdCkudG9FcXVhbChtb2NrU2NvcmUpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBjcmVhdGUgYSBzY29yZSBzdWNjZXNzZnVsbHkgZm9yIGFkbWluJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgaW5wdXQgPSB7XG4gICAgICAgIGNhdElkOiAnY2F0LTQ1NicsXG4gICAgICAgIGNhZ2VDb25kaXRpb25TY29yZTogMjAsXG4gICAgICAgIGNhdENvbmRpdGlvblNjb3JlOiAyMixcbiAgICAgICAgZ3Jvb21pbmdTY29yZTogMTgsXG4gICAgICAgIG92ZXJhbGxTY29yZTogMjMsXG4gICAgICB9O1xuXG4gICAgICBtb2NrU2NvcmVEYXRhQWNjZXNzLmNyZWF0ZVNjb3JlLm1vY2tSZXNvbHZlZFZhbHVlKG1vY2tTY29yZSk7XG5cbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KCdjcmVhdGVTY29yZScsIHsgaW5wdXQgfSwgJ2FkbWluJyk7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdCkudG9FcXVhbChtb2NrU2NvcmUpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCByZWplY3QgY3JlYXRpb24gZm9yIG5vbi1qdWRnZS9hZG1pbiB1c2VycycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGlucHV0ID0ge1xuICAgICAgICBjYXRJZDogJ2NhdC00NTYnLFxuICAgICAgICBjYWdlQ29uZGl0aW9uU2NvcmU6IDIwLFxuICAgICAgICBjYXRDb25kaXRpb25TY29yZTogMjIsXG4gICAgICAgIGdyb29taW5nU2NvcmU6IDE4LFxuICAgICAgICBvdmVyYWxsU2NvcmU6IDIzLFxuICAgICAgfTtcblxuICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVNb2NrRXZlbnQoJ2NyZWF0ZVNjb3JlJywgeyBpbnB1dCB9LCAncGFydGljaXBhbnQnKTtcblxuICAgICAgYXdhaXQgZXhwZWN0KGhhbmRsZXIoZXZlbnQpKS5yZWplY3RzLnRvVGhyb3coJ0ZvcmJpZGRlbjogSnVkZ2Ugcm9sZSByZXF1aXJlZCcpO1xuICAgICAgZXhwZWN0KG1vY2tTY29yZURhdGFBY2Nlc3MuY3JlYXRlU2NvcmUpLm5vdC50b0hhdmVCZWVuQ2FsbGVkKCk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHZhbGlkYXRlIHNjb3JlIHJhbmdlcycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGlucHV0ID0ge1xuICAgICAgICBjYXRJZDogJ2NhdC00NTYnLFxuICAgICAgICBjYWdlQ29uZGl0aW9uU2NvcmU6IDMwLCAvLyBJbnZhbGlkOiA+IDI1XG4gICAgICAgIGNhdENvbmRpdGlvblNjb3JlOiAyMixcbiAgICAgICAgZ3Jvb21pbmdTY29yZTogMTgsXG4gICAgICAgIG92ZXJhbGxTY29yZTogMjMsXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBldmVudCA9IGNyZWF0ZU1vY2tFdmVudCgnY3JlYXRlU2NvcmUnLCB7IGlucHV0IH0pO1xuXG4gICAgICBhd2FpdCBleHBlY3QoaGFuZGxlcihldmVudCkpLnJlamVjdHMudG9UaHJvdygnSW52YWxpZCBjYWdlQ29uZGl0aW9uU2NvcmU6IG11c3QgYmUgYmV0d2VlbiAwIGFuZCAyNScpO1xuICAgICAgZXhwZWN0KG1vY2tTY29yZURhdGFBY2Nlc3MuY3JlYXRlU2NvcmUpLm5vdC50b0hhdmVCZWVuQ2FsbGVkKCk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHZhbGlkYXRlIGNvbW1lbnQgbGVuZ3RocycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGlucHV0ID0ge1xuICAgICAgICBjYXRJZDogJ2NhdC00NTYnLFxuICAgICAgICBjYWdlQ29uZGl0aW9uU2NvcmU6IDIwLFxuICAgICAgICBjYXRDb25kaXRpb25TY29yZTogMjIsXG4gICAgICAgIGdyb29taW5nU2NvcmU6IDE4LFxuICAgICAgICBvdmVyYWxsU2NvcmU6IDIzLFxuICAgICAgICBjYWdlQ29uZGl0aW9uQ29tbWVudHM6ICdhJy5yZXBlYXQoNTAxKSwgLy8gVG9vIGxvbmdcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KCdjcmVhdGVTY29yZScsIHsgaW5wdXQgfSk7XG5cbiAgICAgIGF3YWl0IGV4cGVjdChoYW5kbGVyKGV2ZW50KSkucmVqZWN0cy50b1Rocm93KCdJbnZhbGlkIGNhZ2VDb25kaXRpb25Db21tZW50czogbXVzdCBiZSA1MDAgY2hhcmFjdGVycyBvciBsZXNzJyk7XG4gICAgICBleHBlY3QobW9ja1Njb3JlRGF0YUFjY2Vzcy5jcmVhdGVTY29yZSkubm90LnRvSGF2ZUJlZW5DYWxsZWQoKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmVqZWN0IGNyZWF0aW9uIHdpdGhvdXQgYXV0aGVudGljYXRpb24nLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBpbnB1dCA9IHtcbiAgICAgICAgY2F0SWQ6ICdjYXQtNDU2JyxcbiAgICAgICAgY2FnZUNvbmRpdGlvblNjb3JlOiAyMCxcbiAgICAgICAgY2F0Q29uZGl0aW9uU2NvcmU6IDIyLFxuICAgICAgICBncm9vbWluZ1Njb3JlOiAxOCxcbiAgICAgICAgb3ZlcmFsbFNjb3JlOiAyMyxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGV2ZW50ID0ge1xuICAgICAgICBpbmZvOiB7IGZpZWxkTmFtZTogJ2NyZWF0ZVNjb3JlJyB9LFxuICAgICAgICBhcmd1bWVudHM6IHsgaW5wdXQgfSxcbiAgICAgICAgaWRlbnRpdHk6IG51bGwsXG4gICAgICB9IGFzIGFueTtcblxuICAgICAgYXdhaXQgZXhwZWN0KGhhbmRsZXIoZXZlbnQpKS5yZWplY3RzLnRvVGhyb3coJ1VuYXV0aG9yaXplZDogTm8gdXNlciBjb250ZXh0IGZvdW5kJyk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCd1cGRhdGVTY29yZScsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIHVwZGF0ZSBvd24gc2NvcmUgc3VjY2Vzc2Z1bGx5JywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgaW5wdXQgPSB7IGNhZ2VDb25kaXRpb25TY29yZTogMjUgfTtcbiAgICAgIGNvbnN0IHVwZGF0ZWRTY29yZSA9IHsgLi4ubW9ja1Njb3JlLCBjYWdlQ29uZGl0aW9uU2NvcmU6IDI1LCB0b3RhbFNjb3JlOiA4OCB9O1xuXG4gICAgICBtb2NrU2NvcmVEYXRhQWNjZXNzLmdldFNjb3JlLm1vY2tSZXNvbHZlZFZhbHVlKG1vY2tTY29yZSk7XG4gICAgICBtb2NrU2NvcmVEYXRhQWNjZXNzLnVwZGF0ZVNjb3JlLm1vY2tSZXNvbHZlZFZhbHVlKHVwZGF0ZWRTY29yZSk7XG5cbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KCd1cGRhdGVTY29yZScsIHsgaWQ6ICdzY29yZS0xMjMnLCBpbnB1dCB9KTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xuXG4gICAgICBleHBlY3QobW9ja1Njb3JlRGF0YUFjY2Vzcy51cGRhdGVTY29yZSkudG9IYXZlQmVlbkNhbGxlZFdpdGgoJ3Njb3JlLTEyMycsIGlucHV0KTtcbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvRXF1YWwodXBkYXRlZFNjb3JlKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgYWxsb3cgYWRtaW4gdG8gdXBkYXRlIGFueSBzY29yZScsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGlucHV0ID0geyBjYWdlQ29uZGl0aW9uU2NvcmU6IDI1IH07XG4gICAgICBjb25zdCBvdGhlckp1ZGdlU2NvcmUgPSB7IC4uLm1vY2tTY29yZSwganVkZ2VJZDogJ290aGVyLWp1ZGdlJyB9O1xuICAgICAgY29uc3QgdXBkYXRlZFNjb3JlID0geyAuLi5vdGhlckp1ZGdlU2NvcmUsIGNhZ2VDb25kaXRpb25TY29yZTogMjUgfTtcblxuICAgICAgbW9ja1Njb3JlRGF0YUFjY2Vzcy5nZXRTY29yZS5tb2NrUmVzb2x2ZWRWYWx1ZShvdGhlckp1ZGdlU2NvcmUpO1xuICAgICAgbW9ja1Njb3JlRGF0YUFjY2Vzcy51cGRhdGVTY29yZS5tb2NrUmVzb2x2ZWRWYWx1ZSh1cGRhdGVkU2NvcmUpO1xuXG4gICAgICBjb25zdCBldmVudCA9IGNyZWF0ZU1vY2tFdmVudCgndXBkYXRlU2NvcmUnLCB7IGlkOiAnc2NvcmUtMTIzJywgaW5wdXQgfSwgJ2FkbWluJyk7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdCkudG9FcXVhbCh1cGRhdGVkU2NvcmUpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCByZWplY3QgdXBkYXRpbmcgb3RoZXIganVkZ2Ugc2NvcmVzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgaW5wdXQgPSB7IGNhZ2VDb25kaXRpb25TY29yZTogMjUgfTtcbiAgICAgIGNvbnN0IG90aGVySnVkZ2VTY29yZSA9IHsgLi4ubW9ja1Njb3JlLCBqdWRnZUlkOiAnb3RoZXItanVkZ2UnIH07XG5cbiAgICAgIG1vY2tTY29yZURhdGFBY2Nlc3MuZ2V0U2NvcmUubW9ja1Jlc29sdmVkVmFsdWUob3RoZXJKdWRnZVNjb3JlKTtcblxuICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVNb2NrRXZlbnQoJ3VwZGF0ZVNjb3JlJywgeyBpZDogJ3Njb3JlLTEyMycsIGlucHV0IH0pO1xuXG4gICAgICBhd2FpdCBleHBlY3QoaGFuZGxlcihldmVudCkpLnJlamVjdHMudG9UaHJvdygnRm9yYmlkZGVuOiBDYW4gb25seSBlZGl0IHlvdXIgb3duIHNjb3JlcycpO1xuICAgICAgZXhwZWN0KG1vY2tTY29yZURhdGFBY2Nlc3MudXBkYXRlU2NvcmUpLm5vdC50b0hhdmVCZWVuQ2FsbGVkKCk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHJlamVjdCB1cGRhdGluZyBmaW5hbGl6ZWQgc2NvcmVzIGZvciBub24tYWRtaW4nLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBpbnB1dCA9IHsgY2FnZUNvbmRpdGlvblNjb3JlOiAyNSB9O1xuICAgICAgY29uc3QgZmluYWxpemVkU2NvcmUgPSB7IC4uLm1vY2tTY29yZSwgaXNGaW5hbGl6ZWQ6IHRydWUgfTtcblxuICAgICAgbW9ja1Njb3JlRGF0YUFjY2Vzcy5nZXRTY29yZS5tb2NrUmVzb2x2ZWRWYWx1ZShmaW5hbGl6ZWRTY29yZSk7XG5cbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KCd1cGRhdGVTY29yZScsIHsgaWQ6ICdzY29yZS0xMjMnLCBpbnB1dCB9KTtcblxuICAgICAgYXdhaXQgZXhwZWN0KGhhbmRsZXIoZXZlbnQpKS5yZWplY3RzLnRvVGhyb3coJ0ZvcmJpZGRlbjogQ2Fubm90IG1vZGlmeSBmaW5hbGl6ZWQgc2NvcmVzJyk7XG4gICAgICBleHBlY3QobW9ja1Njb3JlRGF0YUFjY2Vzcy51cGRhdGVTY29yZSkubm90LnRvSGF2ZUJlZW5DYWxsZWQoKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgYWxsb3cgYWRtaW4gdG8gdXBkYXRlIGZpbmFsaXplZCBzY29yZXMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBpbnB1dCA9IHsgY2FnZUNvbmRpdGlvblNjb3JlOiAyNSB9O1xuICAgICAgY29uc3QgZmluYWxpemVkU2NvcmUgPSB7IC4uLm1vY2tTY29yZSwgaXNGaW5hbGl6ZWQ6IHRydWUgfTtcbiAgICAgIGNvbnN0IHVwZGF0ZWRTY29yZSA9IHsgLi4uZmluYWxpemVkU2NvcmUsIGNhZ2VDb25kaXRpb25TY29yZTogMjUgfTtcblxuICAgICAgbW9ja1Njb3JlRGF0YUFjY2Vzcy5nZXRTY29yZS5tb2NrUmVzb2x2ZWRWYWx1ZShmaW5hbGl6ZWRTY29yZSk7XG4gICAgICBtb2NrU2NvcmVEYXRhQWNjZXNzLnVwZGF0ZVNjb3JlLm1vY2tSZXNvbHZlZFZhbHVlKHVwZGF0ZWRTY29yZSk7XG5cbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KCd1cGRhdGVTY29yZScsIHsgaWQ6ICdzY29yZS0xMjMnLCBpbnB1dCB9LCAnYWRtaW4nKTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0KS50b0VxdWFsKHVwZGF0ZWRTY29yZSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGhhbmRsZSBub24tZXhpc3RlbnQgc2NvcmUnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBpbnB1dCA9IHsgY2FnZUNvbmRpdGlvblNjb3JlOiAyNSB9O1xuXG4gICAgICBtb2NrU2NvcmVEYXRhQWNjZXNzLmdldFNjb3JlLm1vY2tSZXNvbHZlZFZhbHVlKG51bGwpO1xuXG4gICAgICBjb25zdCBldmVudCA9IGNyZWF0ZU1vY2tFdmVudCgndXBkYXRlU2NvcmUnLCB7IGlkOiAnbm9uZXhpc3RlbnQnLCBpbnB1dCB9KTtcblxuICAgICAgYXdhaXQgZXhwZWN0KGhhbmRsZXIoZXZlbnQpKS5yZWplY3RzLnRvVGhyb3coJ1Njb3JlIG5vdCBmb3VuZCcpO1xuICAgICAgZXhwZWN0KG1vY2tTY29yZURhdGFBY2Nlc3MudXBkYXRlU2NvcmUpLm5vdC50b0hhdmVCZWVuQ2FsbGVkKCk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdnZXRTY29yZScsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIGdldCBvd24gc2NvcmUgc3VjY2Vzc2Z1bGx5JywgYXN5bmMgKCkgPT4ge1xuICAgICAgbW9ja1Njb3JlRGF0YUFjY2Vzcy5nZXRTY29yZS5tb2NrUmVzb2x2ZWRWYWx1ZShtb2NrU2NvcmUpO1xuXG4gICAgICBjb25zdCBldmVudCA9IGNyZWF0ZU1vY2tFdmVudCgnZ2V0U2NvcmUnLCB7IGlkOiAnc2NvcmUtMTIzJyB9KTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0KS50b0VxdWFsKG1vY2tTY29yZSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGFsbG93IGFkbWluIHRvIGdldCBhbnkgc2NvcmUnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBvdGhlckp1ZGdlU2NvcmUgPSB7IC4uLm1vY2tTY29yZSwganVkZ2VJZDogJ290aGVyLWp1ZGdlJyB9O1xuICAgICAgbW9ja1Njb3JlRGF0YUFjY2Vzcy5nZXRTY29yZS5tb2NrUmVzb2x2ZWRWYWx1ZShvdGhlckp1ZGdlU2NvcmUpO1xuXG4gICAgICBjb25zdCBldmVudCA9IGNyZWF0ZU1vY2tFdmVudCgnZ2V0U2NvcmUnLCB7IGlkOiAnc2NvcmUtMTIzJyB9LCAnYWRtaW4nKTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0KS50b0VxdWFsKG90aGVySnVkZ2VTY29yZSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHJlamVjdCBnZXR0aW5nIG90aGVyIGp1ZGdlIHNjb3JlcycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IG90aGVySnVkZ2VTY29yZSA9IHsgLi4ubW9ja1Njb3JlLCBqdWRnZUlkOiAnb3RoZXItanVkZ2UnIH07XG4gICAgICBtb2NrU2NvcmVEYXRhQWNjZXNzLmdldFNjb3JlLm1vY2tSZXNvbHZlZFZhbHVlKG90aGVySnVkZ2VTY29yZSk7XG5cbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KCdnZXRTY29yZScsIHsgaWQ6ICdzY29yZS0xMjMnIH0pO1xuXG4gICAgICBhd2FpdCBleHBlY3QoaGFuZGxlcihldmVudCkpLnJlamVjdHMudG9UaHJvdygnRm9yYmlkZGVuOiBDYW4gb25seSB2aWV3IHlvdXIgb3duIHNjb3JlcycpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gbnVsbCBmb3Igbm9uLWV4aXN0ZW50IHNjb3JlJywgYXN5bmMgKCkgPT4ge1xuICAgICAgbW9ja1Njb3JlRGF0YUFjY2Vzcy5nZXRTY29yZS5tb2NrUmVzb2x2ZWRWYWx1ZShudWxsKTtcblxuICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVNb2NrRXZlbnQoJ2dldFNjb3JlJywgeyBpZDogJ25vbmV4aXN0ZW50JyB9KTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0KS50b0JlTnVsbCgpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnZ2V0U2NvcmVzQnlDYXQnLCAoKSA9PiB7XG4gICAgY29uc3QgbW9ja1Njb3JlcyA9IFtcbiAgICAgIG1vY2tTY29yZSxcbiAgICAgIHsgLi4ubW9ja1Njb3JlLCBpZDogJ3Njb3JlLTQ1NicsIGp1ZGdlSWQ6ICdvdGhlci1qdWRnZScgfSxcbiAgICBdO1xuXG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gYWxsIHNjb3JlcyBmb3IgYWRtaW4nLCBhc3luYyAoKSA9PiB7XG4gICAgICBtb2NrU2NvcmVEYXRhQWNjZXNzLmdldFNjb3Jlc0J5Q2F0Lm1vY2tSZXNvbHZlZFZhbHVlKG1vY2tTY29yZXMpO1xuXG4gICAgICBjb25zdCBldmVudCA9IGNyZWF0ZU1vY2tFdmVudCgnZ2V0U2NvcmVzQnlDYXQnLCB7IGNhdElkOiAnY2F0LTQ1NicgfSwgJ2FkbWluJyk7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdCkudG9FcXVhbCh7IGl0ZW1zOiBtb2NrU2NvcmVzIH0pO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBmaWx0ZXIgdG8gb3duIHNjb3JlcyBmb3IganVkZ2UnLCBhc3luYyAoKSA9PiB7XG4gICAgICBtb2NrU2NvcmVEYXRhQWNjZXNzLmdldFNjb3Jlc0J5Q2F0Lm1vY2tSZXNvbHZlZFZhbHVlKG1vY2tTY29yZXMpO1xuXG4gICAgICBjb25zdCBldmVudCA9IGNyZWF0ZU1vY2tFdmVudCgnZ2V0U2NvcmVzQnlDYXQnLCB7IGNhdElkOiAnY2F0LTQ1NicgfSk7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdCkudG9FcXVhbCh7IGl0ZW1zOiBbbW9ja1Njb3JlXSB9KTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmV0dXJuIG9ubHkgZmluYWxpemVkIHNjb3JlcyBmb3IgcGFydGljaXBhbnRzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZmluYWxpemVkU2NvcmUgPSB7IC4uLm1vY2tTY29yZSwgaXNGaW5hbGl6ZWQ6IHRydWUgfTtcbiAgICAgIGNvbnN0IHVuZmluYWxpemVkU2NvcmUgPSB7IC4uLm1vY2tTY29yZSwgaWQ6ICdzY29yZS00NTYnLCBpc0ZpbmFsaXplZDogZmFsc2UgfTtcbiAgICAgIG1vY2tTY29yZURhdGFBY2Nlc3MuZ2V0U2NvcmVzQnlDYXQubW9ja1Jlc29sdmVkVmFsdWUoW2ZpbmFsaXplZFNjb3JlLCB1bmZpbmFsaXplZFNjb3JlXSk7XG5cbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KCdnZXRTY29yZXNCeUNhdCcsIHsgY2F0SWQ6ICdjYXQtNDU2JyB9LCAncGFydGljaXBhbnQnKTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0KS50b0VxdWFsKHsgaXRlbXM6IFtmaW5hbGl6ZWRTY29yZV0gfSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdnZXRTY29yZXNCeUNhZ2UnLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCBnZXQgc2NvcmVzIGJ5IGNhZ2UgbnVtYmVyJywgYXN5bmMgKCkgPT4ge1xuICAgICAgbW9ja1Njb3JlRGF0YUFjY2Vzcy5nZXRTY29yZXNCeUNhZ2UubW9ja1Jlc29sdmVkVmFsdWUoW21vY2tTY29yZV0pO1xuXG4gICAgICBjb25zdCBldmVudCA9IGNyZWF0ZU1vY2tFdmVudCgnZ2V0U2NvcmVzQnlDYWdlJywgeyBjYWdlTnVtYmVyOiAxIH0sICdhZG1pbicpO1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvRXF1YWwoeyBpdGVtczogW21vY2tTY29yZV0gfSk7XG4gICAgICBleHBlY3QobW9ja1Njb3JlRGF0YUFjY2Vzcy5nZXRTY29yZXNCeUNhZ2UpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKDEpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnbGlzdEFsbFNjb3JlcycsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIGxpc3QgYWxsIHNjb3JlcyBmb3IgYWRtaW4nLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBhbGxTY29yZXMgPSBbbW9ja1Njb3JlLCB7IC4uLm1vY2tTY29yZSwgaWQ6ICdzY29yZS00NTYnIH1dO1xuICAgICAgbW9ja1Njb3JlRGF0YUFjY2Vzcy5saXN0QWxsU2NvcmVzLm1vY2tSZXNvbHZlZFZhbHVlKGFsbFNjb3Jlcyk7XG5cbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KCdsaXN0QWxsU2NvcmVzJywge30sICdhZG1pbicpO1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvRXF1YWwoeyBpdGVtczogYWxsU2NvcmVzIH0pO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCByZWplY3QgbGlzdGluZyBhbGwgc2NvcmVzIGZvciBub24tYWRtaW4nLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBldmVudCA9IGNyZWF0ZU1vY2tFdmVudCgnbGlzdEFsbFNjb3JlcycsIHt9KTtcblxuICAgICAgYXdhaXQgZXhwZWN0KGhhbmRsZXIoZXZlbnQpKS5yZWplY3RzLnRvVGhyb3coJ0ZvcmJpZGRlbjogQWRtaW4gcm9sZSByZXF1aXJlZCcpO1xuICAgICAgZXhwZWN0KG1vY2tTY29yZURhdGFBY2Nlc3MubGlzdEFsbFNjb3Jlcykubm90LnRvSGF2ZUJlZW5DYWxsZWQoKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2dldFNjb3Jlc0J5SnVkZ2UnLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCBnZXQgb3duIHNjb3JlcycsIGFzeW5jICgpID0+IHtcbiAgICAgIG1vY2tTY29yZURhdGFBY2Nlc3MuZ2V0U2NvcmVzQnlKdWRnZS5tb2NrUmVzb2x2ZWRWYWx1ZShbbW9ja1Njb3JlXSk7XG5cbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KCdnZXRTY29yZXNCeUp1ZGdlJywgeyBqdWRnZUlkOiAnanVkZ2UtMTIzJyB9KTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0KS50b0VxdWFsKHsgaXRlbXM6IFttb2NrU2NvcmVdIH0pO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBhbGxvdyBhZG1pbiB0byBnZXQgYW55IGp1ZGdlIHNjb3JlcycsIGFzeW5jICgpID0+IHtcbiAgICAgIG1vY2tTY29yZURhdGFBY2Nlc3MuZ2V0U2NvcmVzQnlKdWRnZS5tb2NrUmVzb2x2ZWRWYWx1ZShbbW9ja1Njb3JlXSk7XG5cbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KCdnZXRTY29yZXNCeUp1ZGdlJywgeyBqdWRnZUlkOiAnb3RoZXItanVkZ2UnIH0sICdhZG1pbicpO1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvRXF1YWwoeyBpdGVtczogW21vY2tTY29yZV0gfSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHJlamVjdCBnZXR0aW5nIG90aGVyIGp1ZGdlIHNjb3JlcycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KCdnZXRTY29yZXNCeUp1ZGdlJywgeyBqdWRnZUlkOiAnb3RoZXItanVkZ2UnIH0pO1xuXG4gICAgICBhd2FpdCBleHBlY3QoaGFuZGxlcihldmVudCkpLnJlamVjdHMudG9UaHJvdygnRm9yYmlkZGVuOiBDYW4gb25seSB2aWV3IHlvdXIgb3duIHNjb3JlcycpO1xuICAgICAgZXhwZWN0KG1vY2tTY29yZURhdGFBY2Nlc3MuZ2V0U2NvcmVzQnlKdWRnZSkubm90LnRvSGF2ZUJlZW5DYWxsZWQoKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2ZpbmFsaXplU2NvcmUnLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCBmaW5hbGl6ZSBvd24gc2NvcmUnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBmaW5hbGl6ZWRTY29yZSA9IHsgLi4ubW9ja1Njb3JlLCBpc0ZpbmFsaXplZDogdHJ1ZSB9O1xuICAgICAgbW9ja1Njb3JlRGF0YUFjY2Vzcy5nZXRTY29yZS5tb2NrUmVzb2x2ZWRWYWx1ZShtb2NrU2NvcmUpO1xuICAgICAgbW9ja1Njb3JlRGF0YUFjY2Vzcy51cGRhdGVTY29yZS5tb2NrUmVzb2x2ZWRWYWx1ZShmaW5hbGl6ZWRTY29yZSk7XG5cbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KCdmaW5hbGl6ZVNjb3JlJywgeyBpZDogJ3Njb3JlLTEyMycgfSk7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50KTtcblxuICAgICAgZXhwZWN0KG1vY2tTY29yZURhdGFBY2Nlc3MudXBkYXRlU2NvcmUpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKCdzY29yZS0xMjMnLCB7IGlzRmluYWxpemVkOiB0cnVlIH0pO1xuICAgICAgZXhwZWN0KHJlc3VsdCkudG9FcXVhbChmaW5hbGl6ZWRTY29yZSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGFsbG93IGFkbWluIHRvIGZpbmFsaXplIGFueSBzY29yZScsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IG90aGVySnVkZ2VTY29yZSA9IHsgLi4ubW9ja1Njb3JlLCBqdWRnZUlkOiAnb3RoZXItanVkZ2UnIH07XG4gICAgICBjb25zdCBmaW5hbGl6ZWRTY29yZSA9IHsgLi4ub3RoZXJKdWRnZVNjb3JlLCBpc0ZpbmFsaXplZDogdHJ1ZSB9O1xuICAgICAgbW9ja1Njb3JlRGF0YUFjY2Vzcy5nZXRTY29yZS5tb2NrUmVzb2x2ZWRWYWx1ZShvdGhlckp1ZGdlU2NvcmUpO1xuICAgICAgbW9ja1Njb3JlRGF0YUFjY2Vzcy51cGRhdGVTY29yZS5tb2NrUmVzb2x2ZWRWYWx1ZShmaW5hbGl6ZWRTY29yZSk7XG5cbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KCdmaW5hbGl6ZVNjb3JlJywgeyBpZDogJ3Njb3JlLTEyMycgfSwgJ2FkbWluJyk7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdCkudG9FcXVhbChmaW5hbGl6ZWRTY29yZSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHJlamVjdCBmaW5hbGl6aW5nIG90aGVyIGp1ZGdlIHNjb3JlcycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IG90aGVySnVkZ2VTY29yZSA9IHsgLi4ubW9ja1Njb3JlLCBqdWRnZUlkOiAnb3RoZXItanVkZ2UnIH07XG4gICAgICBtb2NrU2NvcmVEYXRhQWNjZXNzLmdldFNjb3JlLm1vY2tSZXNvbHZlZFZhbHVlKG90aGVySnVkZ2VTY29yZSk7XG5cbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KCdmaW5hbGl6ZVNjb3JlJywgeyBpZDogJ3Njb3JlLTEyMycgfSk7XG5cbiAgICAgIGF3YWl0IGV4cGVjdChoYW5kbGVyKGV2ZW50KSkucmVqZWN0cy50b1Rocm93KCdGb3JiaWRkZW46IENhbiBvbmx5IGZpbmFsaXplIHlvdXIgb3duIHNjb3JlcycpO1xuICAgICAgZXhwZWN0KG1vY2tTY29yZURhdGFBY2Nlc3MudXBkYXRlU2NvcmUpLm5vdC50b0hhdmVCZWVuQ2FsbGVkKCk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGhhbmRsZSBub24tZXhpc3RlbnQgc2NvcmUnLCBhc3luYyAoKSA9PiB7XG4gICAgICBtb2NrU2NvcmVEYXRhQWNjZXNzLmdldFNjb3JlLm1vY2tSZXNvbHZlZFZhbHVlKG51bGwpO1xuXG4gICAgICBjb25zdCBldmVudCA9IGNyZWF0ZU1vY2tFdmVudCgnZmluYWxpemVTY29yZScsIHsgaWQ6ICdub25leGlzdGVudCcgfSk7XG5cbiAgICAgIGF3YWl0IGV4cGVjdChoYW5kbGVyKGV2ZW50KSkucmVqZWN0cy50b1Rocm93KCdTY29yZSBub3QgZm91bmQnKTtcbiAgICAgIGV4cGVjdChtb2NrU2NvcmVEYXRhQWNjZXNzLnVwZGF0ZVNjb3JlKS5ub3QudG9IYXZlQmVlbkNhbGxlZCgpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnZXJyb3IgaGFuZGxpbmcnLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCBoYW5kbGUgdW5rbm93biBmaWVsZCBuYW1lcycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KCd1bmtub3duRmllbGQnKTtcblxuICAgICAgYXdhaXQgZXhwZWN0KGhhbmRsZXIoZXZlbnQpKS5yZWplY3RzLnRvVGhyb3coJ1Vua25vd24gZmllbGQ6IHVua25vd25GaWVsZCcpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBoYW5kbGUgZGF0YSBhY2Nlc3MgZXJyb3JzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgbW9ja1Njb3JlRGF0YUFjY2Vzcy5nZXRTY29yZS5tb2NrUmVqZWN0ZWRWYWx1ZShuZXcgRXJyb3IoJ0RhdGFiYXNlIGVycm9yJykpO1xuXG4gICAgICBjb25zdCBldmVudCA9IGNyZWF0ZU1vY2tFdmVudCgnZ2V0U2NvcmUnLCB7IGlkOiAnc2NvcmUtMTIzJyB9KTtcblxuICAgICAgYXdhaXQgZXhwZWN0KGhhbmRsZXIoZXZlbnQpKS5yZWplY3RzLnRvVGhyb3coJ0RhdGFiYXNlIGVycm9yJyk7XG4gICAgfSk7XG4gIH0pO1xufSk7Il19