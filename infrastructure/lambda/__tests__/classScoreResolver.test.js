"use strict";
/**
 * Unit tests for classScoreResolver
 */
Object.defineProperty(exports, "__esModule", { value: true });
const classScoreResolver_1 = require("../classScoreResolver");
const classScoreDataAccess_1 = require("../classScoreDataAccess");
const roleValidation_1 = require("../roleValidation");
const errorHandler_1 = require("../errorHandler");
// Mock dependencies
jest.mock('../classScoreDataAccess');
jest.mock('../roleValidation');
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');
const mockClassScoreDataAccess = classScoreDataAccess_1.ClassScoreDataAccess;
const mockGetUserContext = roleValidation_1.getUserContext;
const mockRequireAnyRole = roleValidation_1.requireAnyRole;
const mockGetJudgeId = roleValidation_1.getJudgeId;
describe('classScoreResolver', () => {
    let mockDataAccess;
    beforeEach(() => {
        jest.clearAllMocks();
        // Create mock instance
        mockDataAccess = {
            createClassScore: jest.fn(),
            updateClassScore: jest.fn(),
            getClassScore: jest.fn(),
            getClassScoresByCat: jest.fn(),
            getClassScoresByCage: jest.fn(),
            listAllClassScores: jest.fn(),
            getClassScoresByJudge: jest.fn(),
            deleteClassScore: jest.fn(),
        };
        // Mock constructor to return our mock instance
        mockClassScoreDataAccess.mockImplementation(() => mockDataAccess);
        // Default mock implementations
        mockGetUserContext.mockReturnValue({
            userId: 'user-123',
            role: 'judge',
            email: 'judge@example.com',
            claims: { 'cognito:username': 'judge123' }
        });
        mockRequireAnyRole.mockImplementation(() => { });
        mockGetJudgeId.mockReturnValue('judge-123');
    });
    describe('createClassScore', () => {
        const validInput = {
            catId: 'cat-123',
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
        const mockEvent = {
            info: { fieldName: 'createClassScore' },
            arguments: { input: validInput }
        };
        it('should create a class score successfully', async () => {
            const expectedScore = {
                id: 'score-123',
                ...validInput,
                judgeId: 'judge-123',
                judgeName: 'judge@example.com',
                totalScore: 43,
                ribbonEligibility: 'Red',
                timestamp: '2023-01-01T00:00:00.000Z'
            };
            mockDataAccess.createClassScore.mockResolvedValue(expectedScore);
            const result = await (0, classScoreResolver_1.handler)(mockEvent);
            expect(mockRequireAnyRole).toHaveBeenCalledWith(expect.any(Object), ['judge', 'admin']);
            expect(mockGetJudgeId).toHaveBeenCalled();
            expect(mockDataAccess.createClassScore).toHaveBeenCalledWith({
                ...validInput,
                judgeId: 'judge-123',
                judgeName: 'judge@example.com'
            });
            expect(result).toEqual(expectedScore);
        });
        it('should validate beauty score range (0-15)', async () => {
            const invalidInput = { ...validInput, beautyScore: 20 };
            const event = { ...mockEvent, arguments: { input: invalidInput } };
            await expect((0, classScoreResolver_1.handler)(event)).rejects.toThrow(errorHandler_1.ValidationError);
            expect(mockDataAccess.createClassScore).not.toHaveBeenCalled();
        });
        it('should validate personality score range (0-20)', async () => {
            const invalidInput = { ...validInput, personalityScore: 25 };
            const event = { ...mockEvent, arguments: { input: invalidInput } };
            await expect((0, classScoreResolver_1.handler)(event)).rejects.toThrow(errorHandler_1.ValidationError);
            expect(mockDataAccess.createClassScore).not.toHaveBeenCalled();
        });
        it('should validate balance/proportion score range (0-15)', async () => {
            const invalidInput = { ...validInput, balanceProportionScore: 18 };
            const event = { ...mockEvent, arguments: { input: invalidInput } };
            await expect((0, classScoreResolver_1.handler)(event)).rejects.toThrow(errorHandler_1.ValidationError);
            expect(mockDataAccess.createClassScore).not.toHaveBeenCalled();
        });
        it('should validate comment lengths', async () => {
            const longComment = 'a'.repeat(501);
            const invalidInput = { ...validInput, beautyComments: longComment };
            const event = { ...mockEvent, arguments: { input: invalidInput } };
            await expect((0, classScoreResolver_1.handler)(event)).rejects.toThrow(errorHandler_1.ValidationError);
            expect(mockDataAccess.createClassScore).not.toHaveBeenCalled();
        });
        it('should validate health comment length (1000 chars)', async () => {
            const longComment = 'a'.repeat(1001);
            const invalidInput = { ...validInput, healthGroomingComments: longComment };
            const event = { ...mockEvent, arguments: { input: invalidInput } };
            await expect((0, classScoreResolver_1.handler)(event)).rejects.toThrow(errorHandler_1.ValidationError);
            expect(mockDataAccess.createClassScore).not.toHaveBeenCalled();
        });
        it('should validate boolean health fields', async () => {
            const invalidInput = { ...validInput, coatCleanGroomed: 'true' };
            const event = { ...mockEvent, arguments: { input: invalidInput } };
            await expect((0, classScoreResolver_1.handler)(event)).rejects.toThrow(errorHandler_1.ValidationError);
            expect(mockDataAccess.createClassScore).not.toHaveBeenCalled();
        });
        it('should throw error when judge ID cannot be determined', async () => {
            mockGetJudgeId.mockReturnValue(null);
            await expect((0, classScoreResolver_1.handler)(mockEvent)).rejects.toThrow(errorHandler_1.ValidationError);
            expect(mockDataAccess.createClassScore).not.toHaveBeenCalled();
        });
    });
    describe('updateClassScore', () => {
        const updateInput = {
            beautyScore: 14,
            personalityScore: 19
        };
        const mockEvent = {
            info: { fieldName: 'updateClassScore' },
            arguments: { id: 'score-123', input: updateInput }
        };
        const existingScore = {
            id: 'score-123',
            catId: 'cat-123',
            judgeId: 'judge-123',
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
        it('should update a class score successfully', async () => {
            const updatedScore = { ...existingScore, ...updateInput, totalScore: 46 };
            mockDataAccess.getClassScore.mockResolvedValue(existingScore);
            mockDataAccess.updateClassScore.mockResolvedValue(updatedScore);
            const result = await (0, classScoreResolver_1.handler)(mockEvent);
            expect(mockRequireAnyRole).toHaveBeenCalledWith(expect.any(Object), ['judge', 'admin']);
            expect(mockDataAccess.getClassScore).toHaveBeenCalledWith('score-123');
            expect(mockDataAccess.updateClassScore).toHaveBeenCalledWith('score-123', updateInput);
            expect(result).toEqual(updatedScore);
        });
        it('should throw error when class score not found', async () => {
            mockDataAccess.getClassScore.mockResolvedValue(null);
            await expect((0, classScoreResolver_1.handler)(mockEvent)).rejects.toThrow(errorHandler_1.NotFoundError);
            expect(mockDataAccess.updateClassScore).not.toHaveBeenCalled();
        });
        it('should prevent modification of finalized scores by non-admin', async () => {
            const finalizedScore = { ...existingScore, isFinalized: true };
            mockDataAccess.getClassScore.mockResolvedValue(finalizedScore);
            await expect((0, classScoreResolver_1.handler)(mockEvent)).rejects.toThrow(errorHandler_1.PermissionError);
            expect(mockDataAccess.updateClassScore).not.toHaveBeenCalled();
        });
        it('should allow admin to modify finalized scores', async () => {
            const finalizedScore = { ...existingScore, isFinalized: true };
            const updatedScore = { ...finalizedScore, ...updateInput };
            mockGetUserContext.mockReturnValue({
                userId: 'admin-123',
                role: 'admin',
                email: 'admin@example.com',
                claims: {}
            });
            mockDataAccess.getClassScore.mockResolvedValue(finalizedScore);
            mockDataAccess.updateClassScore.mockResolvedValue(updatedScore);
            const result = await (0, classScoreResolver_1.handler)(mockEvent);
            expect(result).toEqual(updatedScore);
        });
    });
    describe('getClassScore', () => {
        const mockEvent = {
            info: { fieldName: 'getClassScore' },
            arguments: { id: 'score-123' }
        };
        const existingScore = {
            id: 'score-123',
            catId: 'cat-123',
            judgeId: 'judge-123',
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
            isFinalized: true
        };
        it('should return class score for admin', async () => {
            mockGetUserContext.mockReturnValue({
                userId: 'admin-123',
                role: 'admin',
                email: 'admin@example.com',
                claims: {}
            });
            mockDataAccess.getClassScore.mockResolvedValue(existingScore);
            const result = await (0, classScoreResolver_1.handler)(mockEvent);
            expect(result).toEqual(existingScore);
        });
        it('should return class score for owning judge', async () => {
            mockDataAccess.getClassScore.mockResolvedValue(existingScore);
            const result = await (0, classScoreResolver_1.handler)(mockEvent);
            expect(result).toEqual(existingScore);
        });
        it('should return finalized score for participant', async () => {
            mockGetUserContext.mockReturnValue({
                userId: 'participant-123',
                role: 'participant',
                email: 'participant@example.com',
                claims: {}
            });
            mockDataAccess.getClassScore.mockResolvedValue(existingScore);
            const result = await (0, classScoreResolver_1.handler)(mockEvent);
            expect(result).toEqual(existingScore);
        });
        it('should prevent participant from viewing non-finalized score', async () => {
            const nonFinalizedScore = { ...existingScore, isFinalized: false };
            mockGetUserContext.mockReturnValue({
                userId: 'participant-123',
                role: 'participant',
                email: 'participant@example.com',
                claims: {}
            });
            mockDataAccess.getClassScore.mockResolvedValue(nonFinalizedScore);
            await expect((0, classScoreResolver_1.handler)(mockEvent)).rejects.toThrow(errorHandler_1.PermissionError);
        });
        it('should return null when score not found', async () => {
            mockDataAccess.getClassScore.mockResolvedValue(null);
            const result = await (0, classScoreResolver_1.handler)(mockEvent);
            expect(result).toBeNull();
        });
    });
    describe('getClassScoresByCat', () => {
        const mockEvent = {
            info: { fieldName: 'getClassScoresByCat' },
            arguments: { catId: 'cat-123' }
        };
        const mockScores = [
            {
                id: 'score-1',
                catId: 'cat-123',
                judgeId: 'judge-123',
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
                isFinalized: true
            },
            {
                id: 'score-2',
                catId: 'cat-123',
                judgeId: 'judge-456',
                judgeName: 'Judge Jones',
                beautyScore: 15,
                beautyComments: 'Excellent appearance',
                personalityScore: 20,
                personalityComments: 'Outstanding personality',
                balanceProportionScore: 12,
                balanceProportionComments: 'Good proportions',
                coatCleanGroomed: true,
                teethGumsHealthy: true,
                eyesNoseClear: true,
                earsCleanMiteFree: true,
                toenailsClipped: true,
                fleaIssues: false,
                healthGroomingComments: 'Excellent health',
                totalScore: 47,
                ribbonEligibility: 'Blue',
                timestamp: '2023-01-01T01:00:00.000Z',
                isFinalized: false
            }
        ];
        it('should return all scores for admin', async () => {
            mockGetUserContext.mockReturnValue({
                userId: 'admin-123',
                role: 'admin',
                email: 'admin@example.com',
                claims: {}
            });
            mockDataAccess.getClassScoresByCat.mockResolvedValue(mockScores);
            const result = await (0, classScoreResolver_1.handler)(mockEvent);
            expect(result).toEqual({ items: mockScores });
        });
        it('should return only own scores for judge', async () => {
            mockDataAccess.getClassScoresByCat.mockResolvedValue(mockScores);
            const result = await (0, classScoreResolver_1.handler)(mockEvent);
            expect(result).toEqual({ items: [mockScores[0]] }); // Only judge-123's score
        });
        it('should return only finalized scores for participant', async () => {
            mockGetUserContext.mockReturnValue({
                userId: 'participant-123',
                role: 'participant',
                email: 'participant@example.com',
                claims: {}
            });
            mockDataAccess.getClassScoresByCat.mockResolvedValue(mockScores);
            const result = await (0, classScoreResolver_1.handler)(mockEvent);
            expect(result).toEqual({ items: [mockScores[0]] }); // Only finalized score
        });
    });
    describe('finalizeClassScore', () => {
        const mockEvent = {
            info: { fieldName: 'finalizeClassScore' },
            arguments: { id: 'score-123' }
        };
        const existingScore = {
            id: 'score-123',
            catId: 'cat-123',
            judgeId: 'judge-123',
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
        it('should finalize a class score successfully', async () => {
            const finalizedScore = { ...existingScore, isFinalized: true };
            mockDataAccess.getClassScore.mockResolvedValue(existingScore);
            mockDataAccess.updateClassScore.mockResolvedValue(finalizedScore);
            const result = await (0, classScoreResolver_1.handler)(mockEvent);
            expect(mockDataAccess.getClassScore).toHaveBeenCalledWith('score-123');
            expect(mockDataAccess.updateClassScore).toHaveBeenCalledWith('score-123', { isFinalized: true });
            expect(result).toEqual(finalizedScore);
        });
        it('should throw error when class score not found', async () => {
            mockDataAccess.getClassScore.mockResolvedValue(null);
            await expect((0, classScoreResolver_1.handler)(mockEvent)).rejects.toThrow(errorHandler_1.NotFoundError);
            expect(mockDataAccess.updateClassScore).not.toHaveBeenCalled();
        });
        it('should throw error when score is already finalized', async () => {
            const alreadyFinalizedScore = { ...existingScore, isFinalized: true };
            mockDataAccess.getClassScore.mockResolvedValue(alreadyFinalizedScore);
            await expect((0, classScoreResolver_1.handler)(mockEvent)).rejects.toThrow(errorHandler_1.ConflictError);
            expect(mockDataAccess.updateClassScore).not.toHaveBeenCalled();
        });
    });
    describe('unknown field', () => {
        it('should throw error for unknown field', async () => {
            const mockEvent = {
                info: { fieldName: 'unknownField' },
                arguments: {}
            };
            await expect((0, classScoreResolver_1.handler)(mockEvent)).rejects.toThrow(errorHandler_1.ValidationError);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhc3NTY29yZVJlc29sdmVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGFzc1Njb3JlUmVzb2x2ZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7O0dBRUc7O0FBR0gsOERBQWdEO0FBQ2hELGtFQUErRDtBQUMvRCxzREFBK0U7QUFDL0Usa0RBQWlHO0FBRWpHLG9CQUFvQjtBQUNwQixJQUFJLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUM7QUFDckMsSUFBSSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBQy9CLElBQUksQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsQ0FBQztBQUN0QyxJQUFJLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUM7QUFFbkMsTUFBTSx3QkFBd0IsR0FBRywyQ0FBcUUsQ0FBQztBQUN2RyxNQUFNLGtCQUFrQixHQUFHLCtCQUE0RCxDQUFDO0FBQ3hGLE1BQU0sa0JBQWtCLEdBQUcsK0JBQTRELENBQUM7QUFDeEYsTUFBTSxjQUFjLEdBQUcsMkJBQW9ELENBQUM7QUFFNUUsUUFBUSxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtJQUNsQyxJQUFJLGNBQWlELENBQUM7SUFFdEQsVUFBVSxDQUFDLEdBQUcsRUFBRTtRQUNkLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUVyQix1QkFBdUI7UUFDdkIsY0FBYyxHQUFHO1lBQ2YsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtZQUMzQixnQkFBZ0IsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO1lBQzNCLGFBQWEsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO1lBQ3hCLG1CQUFtQixFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7WUFDOUIsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtZQUMvQixrQkFBa0IsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO1lBQzdCLHFCQUFxQixFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7WUFDaEMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtTQUNyQixDQUFDO1FBRVQsK0NBQStDO1FBQy9DLHdCQUF3QixDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBRWxFLCtCQUErQjtRQUMvQixrQkFBa0IsQ0FBQyxlQUFlLENBQUM7WUFDakMsTUFBTSxFQUFFLFVBQVU7WUFDbEIsSUFBSSxFQUFFLE9BQU87WUFDYixLQUFLLEVBQUUsbUJBQW1CO1lBQzFCLE1BQU0sRUFBRSxFQUFFLGtCQUFrQixFQUFFLFVBQVUsRUFBRTtTQUMzQyxDQUFDLENBQUM7UUFDSCxrQkFBa0IsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsR0FBRSxDQUFDLENBQUMsQ0FBQztRQUNoRCxjQUFjLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQzlDLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtRQUNoQyxNQUFNLFVBQVUsR0FBRztZQUNqQixLQUFLLEVBQUUsU0FBUztZQUNoQixXQUFXLEVBQUUsRUFBRTtZQUNmLGNBQWMsRUFBRSxlQUFlO1lBQy9CLGdCQUFnQixFQUFFLEVBQUU7WUFDcEIsbUJBQW1CLEVBQUUsZUFBZTtZQUNwQyxzQkFBc0IsRUFBRSxFQUFFO1lBQzFCLHlCQUF5QixFQUFFLG1CQUFtQjtZQUM5QyxnQkFBZ0IsRUFBRSxJQUFJO1lBQ3RCLGdCQUFnQixFQUFFLElBQUk7WUFDdEIsYUFBYSxFQUFFLElBQUk7WUFDbkIsaUJBQWlCLEVBQUUsSUFBSTtZQUN2QixlQUFlLEVBQUUsSUFBSTtZQUNyQixVQUFVLEVBQUUsS0FBSztZQUNqQixzQkFBc0IsRUFBRSxxQkFBcUI7WUFDN0MsV0FBVyxFQUFFLEtBQUs7U0FDbkIsQ0FBQztRQUVGLE1BQU0sU0FBUyxHQUF5QztZQUN0RCxJQUFJLEVBQUUsRUFBRSxTQUFTLEVBQUUsa0JBQWtCLEVBQUU7WUFDdkMsU0FBUyxFQUFFLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRTtTQUMxQixDQUFDO1FBRVQsRUFBRSxDQUFDLDBDQUEwQyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3hELE1BQU0sYUFBYSxHQUFHO2dCQUNwQixFQUFFLEVBQUUsV0FBVztnQkFDZixHQUFHLFVBQVU7Z0JBQ2IsT0FBTyxFQUFFLFdBQVc7Z0JBQ3BCLFNBQVMsRUFBRSxtQkFBbUI7Z0JBQzlCLFVBQVUsRUFBRSxFQUFFO2dCQUNkLGlCQUFpQixFQUFFLEtBQUs7Z0JBQ3hCLFNBQVMsRUFBRSwwQkFBMEI7YUFDdEMsQ0FBQztZQUVGLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUVqRSxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUEsNEJBQU8sRUFBQyxTQUFTLENBQUMsQ0FBQztZQUV4QyxNQUFNLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDeEYsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDMUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLG9CQUFvQixDQUFDO2dCQUMzRCxHQUFHLFVBQVU7Z0JBQ2IsT0FBTyxFQUFFLFdBQVc7Z0JBQ3BCLFNBQVMsRUFBRSxtQkFBbUI7YUFDL0IsQ0FBQyxDQUFDO1lBQ0gsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUN4QyxDQUFDLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQywyQ0FBMkMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUN6RCxNQUFNLFlBQVksR0FBRyxFQUFFLEdBQUcsVUFBVSxFQUFFLFdBQVcsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUN4RCxNQUFNLEtBQUssR0FBRyxFQUFFLEdBQUcsU0FBUyxFQUFFLFNBQVMsRUFBRSxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsRUFBRSxDQUFDO1lBRW5FLE1BQU0sTUFBTSxDQUFDLElBQUEsNEJBQU8sRUFBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsOEJBQWUsQ0FBQyxDQUFDO1lBQzlELE1BQU0sQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUNqRSxDQUFDLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQyxnREFBZ0QsRUFBRSxLQUFLLElBQUksRUFBRTtZQUM5RCxNQUFNLFlBQVksR0FBRyxFQUFFLEdBQUcsVUFBVSxFQUFFLGdCQUFnQixFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQzdELE1BQU0sS0FBSyxHQUFHLEVBQUUsR0FBRyxTQUFTLEVBQUUsU0FBUyxFQUFFLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxFQUFFLENBQUM7WUFFbkUsTUFBTSxNQUFNLENBQUMsSUFBQSw0QkFBTyxFQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyw4QkFBZSxDQUFDLENBQUM7WUFDOUQsTUFBTSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ2pFLENBQUMsQ0FBQyxDQUFDO1FBRUgsRUFBRSxDQUFDLHVEQUF1RCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3JFLE1BQU0sWUFBWSxHQUFHLEVBQUUsR0FBRyxVQUFVLEVBQUUsc0JBQXNCLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDbkUsTUFBTSxLQUFLLEdBQUcsRUFBRSxHQUFHLFNBQVMsRUFBRSxTQUFTLEVBQUUsRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLEVBQUUsQ0FBQztZQUVuRSxNQUFNLE1BQU0sQ0FBQyxJQUFBLDRCQUFPLEVBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLDhCQUFlLENBQUMsQ0FBQztZQUM5RCxNQUFNLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDakUsQ0FBQyxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsaUNBQWlDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDL0MsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNwQyxNQUFNLFlBQVksR0FBRyxFQUFFLEdBQUcsVUFBVSxFQUFFLGNBQWMsRUFBRSxXQUFXLEVBQUUsQ0FBQztZQUNwRSxNQUFNLEtBQUssR0FBRyxFQUFFLEdBQUcsU0FBUyxFQUFFLFNBQVMsRUFBRSxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsRUFBRSxDQUFDO1lBRW5FLE1BQU0sTUFBTSxDQUFDLElBQUEsNEJBQU8sRUFBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsOEJBQWUsQ0FBQyxDQUFDO1lBQzlELE1BQU0sQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUNqRSxDQUFDLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQyxvREFBb0QsRUFBRSxLQUFLLElBQUksRUFBRTtZQUNsRSxNQUFNLFdBQVcsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3JDLE1BQU0sWUFBWSxHQUFHLEVBQUUsR0FBRyxVQUFVLEVBQUUsc0JBQXNCLEVBQUUsV0FBVyxFQUFFLENBQUM7WUFDNUUsTUFBTSxLQUFLLEdBQUcsRUFBRSxHQUFHLFNBQVMsRUFBRSxTQUFTLEVBQUUsRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLEVBQUUsQ0FBQztZQUVuRSxNQUFNLE1BQU0sQ0FBQyxJQUFBLDRCQUFPLEVBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLDhCQUFlLENBQUMsQ0FBQztZQUM5RCxNQUFNLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDakUsQ0FBQyxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsdUNBQXVDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDckQsTUFBTSxZQUFZLEdBQUcsRUFBRSxHQUFHLFVBQVUsRUFBRSxnQkFBZ0IsRUFBRSxNQUFhLEVBQUUsQ0FBQztZQUN4RSxNQUFNLEtBQUssR0FBRyxFQUFFLEdBQUcsU0FBUyxFQUFFLFNBQVMsRUFBRSxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsRUFBRSxDQUFDO1lBRW5FLE1BQU0sTUFBTSxDQUFDLElBQUEsNEJBQU8sRUFBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsOEJBQWUsQ0FBQyxDQUFDO1lBQzlELE1BQU0sQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUNqRSxDQUFDLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQyx1REFBdUQsRUFBRSxLQUFLLElBQUksRUFBRTtZQUNyRSxjQUFjLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRXJDLE1BQU0sTUFBTSxDQUFDLElBQUEsNEJBQU8sRUFBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsOEJBQWUsQ0FBQyxDQUFDO1lBQ2xFLE1BQU0sQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUNqRSxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtRQUNoQyxNQUFNLFdBQVcsR0FBRztZQUNsQixXQUFXLEVBQUUsRUFBRTtZQUNmLGdCQUFnQixFQUFFLEVBQUU7U0FDckIsQ0FBQztRQUVGLE1BQU0sU0FBUyxHQUFxRDtZQUNsRSxJQUFJLEVBQUUsRUFBRSxTQUFTLEVBQUUsa0JBQWtCLEVBQUU7WUFDdkMsU0FBUyxFQUFFLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFO1NBQzVDLENBQUM7UUFFVCxNQUFNLGFBQWEsR0FBRztZQUNwQixFQUFFLEVBQUUsV0FBVztZQUNmLEtBQUssRUFBRSxTQUFTO1lBQ2hCLE9BQU8sRUFBRSxXQUFXO1lBQ3BCLFNBQVMsRUFBRSxhQUFhO1lBQ3hCLFdBQVcsRUFBRSxFQUFFO1lBQ2YsY0FBYyxFQUFFLGVBQWU7WUFDL0IsZ0JBQWdCLEVBQUUsRUFBRTtZQUNwQixtQkFBbUIsRUFBRSxlQUFlO1lBQ3BDLHNCQUFzQixFQUFFLEVBQUU7WUFDMUIseUJBQXlCLEVBQUUsbUJBQW1CO1lBQzlDLGdCQUFnQixFQUFFLElBQUk7WUFDdEIsZ0JBQWdCLEVBQUUsSUFBSTtZQUN0QixhQUFhLEVBQUUsSUFBSTtZQUNuQixpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLGVBQWUsRUFBRSxJQUFJO1lBQ3JCLFVBQVUsRUFBRSxLQUFLO1lBQ2pCLHNCQUFzQixFQUFFLHFCQUFxQjtZQUM3QyxVQUFVLEVBQUUsRUFBRTtZQUNkLGlCQUFpQixFQUFFLEtBQUs7WUFDeEIsU0FBUyxFQUFFLDBCQUEwQjtZQUNyQyxXQUFXLEVBQUUsS0FBSztTQUNuQixDQUFDO1FBRUYsRUFBRSxDQUFDLDBDQUEwQyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3hELE1BQU0sWUFBWSxHQUFHLEVBQUUsR0FBRyxhQUFhLEVBQUUsR0FBRyxXQUFXLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBRTFFLGNBQWMsQ0FBQyxhQUFhLENBQUMsaUJBQWlCLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDOUQsY0FBYyxDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxDQUFDO1lBRWhFLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBQSw0QkFBTyxFQUFDLFNBQVMsQ0FBQyxDQUFDO1lBRXhDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUN4RixNQUFNLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3ZFLE1BQU0sQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFDdkYsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUN2QyxDQUFDLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQywrQ0FBK0MsRUFBRSxLQUFLLElBQUksRUFBRTtZQUM3RCxjQUFjLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBRXJELE1BQU0sTUFBTSxDQUFDLElBQUEsNEJBQU8sRUFBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsNEJBQWEsQ0FBQyxDQUFDO1lBQ2hFLE1BQU0sQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUNqRSxDQUFDLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQyw4REFBOEQsRUFBRSxLQUFLLElBQUksRUFBRTtZQUM1RSxNQUFNLGNBQWMsR0FBRyxFQUFFLEdBQUcsYUFBYSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQztZQUMvRCxjQUFjLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBRS9ELE1BQU0sTUFBTSxDQUFDLElBQUEsNEJBQU8sRUFBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsOEJBQWUsQ0FBQyxDQUFDO1lBQ2xFLE1BQU0sQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUNqRSxDQUFDLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQywrQ0FBK0MsRUFBRSxLQUFLLElBQUksRUFBRTtZQUM3RCxNQUFNLGNBQWMsR0FBRyxFQUFFLEdBQUcsYUFBYSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQztZQUMvRCxNQUFNLFlBQVksR0FBRyxFQUFFLEdBQUcsY0FBYyxFQUFFLEdBQUcsV0FBVyxFQUFFLENBQUM7WUFFM0Qsa0JBQWtCLENBQUMsZUFBZSxDQUFDO2dCQUNqQyxNQUFNLEVBQUUsV0FBVztnQkFDbkIsSUFBSSxFQUFFLE9BQU87Z0JBQ2IsS0FBSyxFQUFFLG1CQUFtQjtnQkFDMUIsTUFBTSxFQUFFLEVBQUU7YUFDWCxDQUFDLENBQUM7WUFDSCxjQUFjLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQy9ELGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUVoRSxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUEsNEJBQU8sRUFBQyxTQUFTLENBQUMsQ0FBQztZQUV4QyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3ZDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtRQUM3QixNQUFNLFNBQVMsR0FBeUM7WUFDdEQsSUFBSSxFQUFFLEVBQUUsU0FBUyxFQUFFLGVBQWUsRUFBRTtZQUNwQyxTQUFTLEVBQUUsRUFBRSxFQUFFLEVBQUUsV0FBVyxFQUFFO1NBQ3hCLENBQUM7UUFFVCxNQUFNLGFBQWEsR0FBRztZQUNwQixFQUFFLEVBQUUsV0FBVztZQUNmLEtBQUssRUFBRSxTQUFTO1lBQ2hCLE9BQU8sRUFBRSxXQUFXO1lBQ3BCLFNBQVMsRUFBRSxhQUFhO1lBQ3hCLFdBQVcsRUFBRSxFQUFFO1lBQ2YsY0FBYyxFQUFFLGVBQWU7WUFDL0IsZ0JBQWdCLEVBQUUsRUFBRTtZQUNwQixtQkFBbUIsRUFBRSxlQUFlO1lBQ3BDLHNCQUFzQixFQUFFLEVBQUU7WUFDMUIseUJBQXlCLEVBQUUsbUJBQW1CO1lBQzlDLGdCQUFnQixFQUFFLElBQUk7WUFDdEIsZ0JBQWdCLEVBQUUsSUFBSTtZQUN0QixhQUFhLEVBQUUsSUFBSTtZQUNuQixpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLGVBQWUsRUFBRSxJQUFJO1lBQ3JCLFVBQVUsRUFBRSxLQUFLO1lBQ2pCLHNCQUFzQixFQUFFLHFCQUFxQjtZQUM3QyxVQUFVLEVBQUUsRUFBRTtZQUNkLGlCQUFpQixFQUFFLEtBQUs7WUFDeEIsU0FBUyxFQUFFLDBCQUEwQjtZQUNyQyxXQUFXLEVBQUUsSUFBSTtTQUNsQixDQUFDO1FBRUYsRUFBRSxDQUFDLHFDQUFxQyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ25ELGtCQUFrQixDQUFDLGVBQWUsQ0FBQztnQkFDakMsTUFBTSxFQUFFLFdBQVc7Z0JBQ25CLElBQUksRUFBRSxPQUFPO2dCQUNiLEtBQUssRUFBRSxtQkFBbUI7Z0JBQzFCLE1BQU0sRUFBRSxFQUFFO2FBQ1gsQ0FBQyxDQUFDO1lBQ0gsY0FBYyxDQUFDLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUU5RCxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUEsNEJBQU8sRUFBQyxTQUFTLENBQUMsQ0FBQztZQUV4QyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ3hDLENBQUMsQ0FBQyxDQUFDO1FBRUgsRUFBRSxDQUFDLDRDQUE0QyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzFELGNBQWMsQ0FBQyxhQUFhLENBQUMsaUJBQWlCLENBQUMsYUFBYSxDQUFDLENBQUM7WUFFOUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFBLDRCQUFPLEVBQUMsU0FBUyxDQUFDLENBQUM7WUFFeEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUN4QyxDQUFDLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQywrQ0FBK0MsRUFBRSxLQUFLLElBQUksRUFBRTtZQUM3RCxrQkFBa0IsQ0FBQyxlQUFlLENBQUM7Z0JBQ2pDLE1BQU0sRUFBRSxpQkFBaUI7Z0JBQ3pCLElBQUksRUFBRSxhQUFhO2dCQUNuQixLQUFLLEVBQUUseUJBQXlCO2dCQUNoQyxNQUFNLEVBQUUsRUFBRTthQUNYLENBQUMsQ0FBQztZQUNILGNBQWMsQ0FBQyxhQUFhLENBQUMsaUJBQWlCLENBQUMsYUFBYSxDQUFDLENBQUM7WUFFOUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFBLDRCQUFPLEVBQUMsU0FBUyxDQUFDLENBQUM7WUFFeEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUN4QyxDQUFDLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQyw2REFBNkQsRUFBRSxLQUFLLElBQUksRUFBRTtZQUMzRSxNQUFNLGlCQUFpQixHQUFHLEVBQUUsR0FBRyxhQUFhLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxDQUFDO1lBQ25FLGtCQUFrQixDQUFDLGVBQWUsQ0FBQztnQkFDakMsTUFBTSxFQUFFLGlCQUFpQjtnQkFDekIsSUFBSSxFQUFFLGFBQWE7Z0JBQ25CLEtBQUssRUFBRSx5QkFBeUI7Z0JBQ2hDLE1BQU0sRUFBRSxFQUFFO2FBQ1gsQ0FBQyxDQUFDO1lBQ0gsY0FBYyxDQUFDLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBRWxFLE1BQU0sTUFBTSxDQUFDLElBQUEsNEJBQU8sRUFBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsOEJBQWUsQ0FBQyxDQUFDO1FBQ3BFLENBQUMsQ0FBQyxDQUFDO1FBRUgsRUFBRSxDQUFDLHlDQUF5QyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3ZELGNBQWMsQ0FBQyxhQUFhLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFckQsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFBLDRCQUFPLEVBQUMsU0FBUyxDQUFDLENBQUM7WUFFeEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQzVCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO1FBQ25DLE1BQU0sU0FBUyxHQUE0QztZQUN6RCxJQUFJLEVBQUUsRUFBRSxTQUFTLEVBQUUscUJBQXFCLEVBQUU7WUFDMUMsU0FBUyxFQUFFLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRTtTQUN6QixDQUFDO1FBRVQsTUFBTSxVQUFVLEdBQUc7WUFDakI7Z0JBQ0UsRUFBRSxFQUFFLFNBQVM7Z0JBQ2IsS0FBSyxFQUFFLFNBQVM7Z0JBQ2hCLE9BQU8sRUFBRSxXQUFXO2dCQUNwQixTQUFTLEVBQUUsYUFBYTtnQkFDeEIsV0FBVyxFQUFFLEVBQUU7Z0JBQ2YsY0FBYyxFQUFFLGVBQWU7Z0JBQy9CLGdCQUFnQixFQUFFLEVBQUU7Z0JBQ3BCLG1CQUFtQixFQUFFLGVBQWU7Z0JBQ3BDLHNCQUFzQixFQUFFLEVBQUU7Z0JBQzFCLHlCQUF5QixFQUFFLG1CQUFtQjtnQkFDOUMsZ0JBQWdCLEVBQUUsSUFBSTtnQkFDdEIsZ0JBQWdCLEVBQUUsSUFBSTtnQkFDdEIsYUFBYSxFQUFFLElBQUk7Z0JBQ25CLGlCQUFpQixFQUFFLElBQUk7Z0JBQ3ZCLGVBQWUsRUFBRSxJQUFJO2dCQUNyQixVQUFVLEVBQUUsS0FBSztnQkFDakIsc0JBQXNCLEVBQUUscUJBQXFCO2dCQUM3QyxVQUFVLEVBQUUsRUFBRTtnQkFDZCxpQkFBaUIsRUFBRSxLQUFLO2dCQUN4QixTQUFTLEVBQUUsMEJBQTBCO2dCQUNyQyxXQUFXLEVBQUUsSUFBSTthQUNsQjtZQUNEO2dCQUNFLEVBQUUsRUFBRSxTQUFTO2dCQUNiLEtBQUssRUFBRSxTQUFTO2dCQUNoQixPQUFPLEVBQUUsV0FBVztnQkFDcEIsU0FBUyxFQUFFLGFBQWE7Z0JBQ3hCLFdBQVcsRUFBRSxFQUFFO2dCQUNmLGNBQWMsRUFBRSxzQkFBc0I7Z0JBQ3RDLGdCQUFnQixFQUFFLEVBQUU7Z0JBQ3BCLG1CQUFtQixFQUFFLHlCQUF5QjtnQkFDOUMsc0JBQXNCLEVBQUUsRUFBRTtnQkFDMUIseUJBQXlCLEVBQUUsa0JBQWtCO2dCQUM3QyxnQkFBZ0IsRUFBRSxJQUFJO2dCQUN0QixnQkFBZ0IsRUFBRSxJQUFJO2dCQUN0QixhQUFhLEVBQUUsSUFBSTtnQkFDbkIsaUJBQWlCLEVBQUUsSUFBSTtnQkFDdkIsZUFBZSxFQUFFLElBQUk7Z0JBQ3JCLFVBQVUsRUFBRSxLQUFLO2dCQUNqQixzQkFBc0IsRUFBRSxrQkFBa0I7Z0JBQzFDLFVBQVUsRUFBRSxFQUFFO2dCQUNkLGlCQUFpQixFQUFFLE1BQU07Z0JBQ3pCLFNBQVMsRUFBRSwwQkFBMEI7Z0JBQ3JDLFdBQVcsRUFBRSxLQUFLO2FBQ25CO1NBQ0YsQ0FBQztRQUVGLEVBQUUsQ0FBQyxvQ0FBb0MsRUFBRSxLQUFLLElBQUksRUFBRTtZQUNsRCxrQkFBa0IsQ0FBQyxlQUFlLENBQUM7Z0JBQ2pDLE1BQU0sRUFBRSxXQUFXO2dCQUNuQixJQUFJLEVBQUUsT0FBTztnQkFDYixLQUFLLEVBQUUsbUJBQW1CO2dCQUMxQixNQUFNLEVBQUUsRUFBRTthQUNYLENBQUMsQ0FBQztZQUNILGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUVqRSxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUEsNEJBQU8sRUFBQyxTQUFTLENBQUMsQ0FBQztZQUV4QyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUM7UUFDaEQsQ0FBQyxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMseUNBQXlDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDdkQsY0FBYyxDQUFDLG1CQUFtQixDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBRWpFLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBQSw0QkFBTyxFQUFDLFNBQVMsQ0FBQyxDQUFDO1lBRXhDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyx5QkFBeUI7UUFDL0UsQ0FBQyxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMscURBQXFELEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDbkUsa0JBQWtCLENBQUMsZUFBZSxDQUFDO2dCQUNqQyxNQUFNLEVBQUUsaUJBQWlCO2dCQUN6QixJQUFJLEVBQUUsYUFBYTtnQkFDbkIsS0FBSyxFQUFFLHlCQUF5QjtnQkFDaEMsTUFBTSxFQUFFLEVBQUU7YUFDWCxDQUFDLENBQUM7WUFDSCxjQUFjLENBQUMsbUJBQW1CLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUFDLENBQUM7WUFFakUsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFBLDRCQUFPLEVBQUMsU0FBUyxDQUFDLENBQUM7WUFFeEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLHVCQUF1QjtRQUM3RSxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtRQUNsQyxNQUFNLFNBQVMsR0FBeUM7WUFDdEQsSUFBSSxFQUFFLEVBQUUsU0FBUyxFQUFFLG9CQUFvQixFQUFFO1lBQ3pDLFNBQVMsRUFBRSxFQUFFLEVBQUUsRUFBRSxXQUFXLEVBQUU7U0FDeEIsQ0FBQztRQUVULE1BQU0sYUFBYSxHQUFHO1lBQ3BCLEVBQUUsRUFBRSxXQUFXO1lBQ2YsS0FBSyxFQUFFLFNBQVM7WUFDaEIsT0FBTyxFQUFFLFdBQVc7WUFDcEIsU0FBUyxFQUFFLGFBQWE7WUFDeEIsV0FBVyxFQUFFLEVBQUU7WUFDZixjQUFjLEVBQUUsZUFBZTtZQUMvQixnQkFBZ0IsRUFBRSxFQUFFO1lBQ3BCLG1CQUFtQixFQUFFLGVBQWU7WUFDcEMsc0JBQXNCLEVBQUUsRUFBRTtZQUMxQix5QkFBeUIsRUFBRSxtQkFBbUI7WUFDOUMsZ0JBQWdCLEVBQUUsSUFBSTtZQUN0QixnQkFBZ0IsRUFBRSxJQUFJO1lBQ3RCLGFBQWEsRUFBRSxJQUFJO1lBQ25CLGlCQUFpQixFQUFFLElBQUk7WUFDdkIsZUFBZSxFQUFFLElBQUk7WUFDckIsVUFBVSxFQUFFLEtBQUs7WUFDakIsc0JBQXNCLEVBQUUscUJBQXFCO1lBQzdDLFVBQVUsRUFBRSxFQUFFO1lBQ2QsaUJBQWlCLEVBQUUsS0FBSztZQUN4QixTQUFTLEVBQUUsMEJBQTBCO1lBQ3JDLFdBQVcsRUFBRSxLQUFLO1NBQ25CLENBQUM7UUFFRixFQUFFLENBQUMsNENBQTRDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDMUQsTUFBTSxjQUFjLEdBQUcsRUFBRSxHQUFHLGFBQWEsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLENBQUM7WUFFL0QsY0FBYyxDQUFDLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUM5RCxjQUFjLENBQUMsZ0JBQWdCLENBQUMsaUJBQWlCLENBQUMsY0FBYyxDQUFDLENBQUM7WUFFbEUsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFBLDRCQUFPLEVBQUMsU0FBUyxDQUFDLENBQUM7WUFFeEMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUN2RSxNQUFNLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLENBQUMsb0JBQW9CLENBQUMsV0FBVyxFQUFFLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFDakcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUN6QyxDQUFDLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQywrQ0FBK0MsRUFBRSxLQUFLLElBQUksRUFBRTtZQUM3RCxjQUFjLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBRXJELE1BQU0sTUFBTSxDQUFDLElBQUEsNEJBQU8sRUFBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsNEJBQWEsQ0FBQyxDQUFDO1lBQ2hFLE1BQU0sQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUNqRSxDQUFDLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQyxvREFBb0QsRUFBRSxLQUFLLElBQUksRUFBRTtZQUNsRSxNQUFNLHFCQUFxQixHQUFHLEVBQUUsR0FBRyxhQUFhLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxDQUFDO1lBQ3RFLGNBQWMsQ0FBQyxhQUFhLENBQUMsaUJBQWlCLENBQUMscUJBQXFCLENBQUMsQ0FBQztZQUV0RSxNQUFNLE1BQU0sQ0FBQyxJQUFBLDRCQUFPLEVBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLDRCQUFhLENBQUMsQ0FBQztZQUNoRSxNQUFNLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDakUsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO1FBQzdCLEVBQUUsQ0FBQyxzQ0FBc0MsRUFBRSxLQUFLLElBQUksRUFBRTtZQUNwRCxNQUFNLFNBQVMsR0FBOEI7Z0JBQzNDLElBQUksRUFBRSxFQUFFLFNBQVMsRUFBRSxjQUFjLEVBQUU7Z0JBQ25DLFNBQVMsRUFBRSxFQUFFO2FBQ1AsQ0FBQztZQUVULE1BQU0sTUFBTSxDQUFDLElBQUEsNEJBQU8sRUFBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsOEJBQWUsQ0FBQyxDQUFDO1FBQ3BFLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogVW5pdCB0ZXN0cyBmb3IgY2xhc3NTY29yZVJlc29sdmVyXG4gKi9cblxuaW1wb3J0IHsgQXBwU3luY1Jlc29sdmVyRXZlbnQgfSBmcm9tICdhd3MtbGFtYmRhJztcbmltcG9ydCB7IGhhbmRsZXIgfSBmcm9tICcuLi9jbGFzc1Njb3JlUmVzb2x2ZXInO1xuaW1wb3J0IHsgQ2xhc3NTY29yZURhdGFBY2Nlc3MgfSBmcm9tICcuLi9jbGFzc1Njb3JlRGF0YUFjY2Vzcyc7XG5pbXBvcnQgeyBnZXRVc2VyQ29udGV4dCwgcmVxdWlyZUFueVJvbGUsIGdldEp1ZGdlSWQgfSBmcm9tICcuLi9yb2xlVmFsaWRhdGlvbic7XG5pbXBvcnQgeyBWYWxpZGF0aW9uRXJyb3IsIFBlcm1pc3Npb25FcnJvciwgTm90Rm91bmRFcnJvciwgQ29uZmxpY3RFcnJvciB9IGZyb20gJy4uL2Vycm9ySGFuZGxlcic7XG5cbi8vIE1vY2sgZGVwZW5kZW5jaWVzXG5qZXN0Lm1vY2soJy4uL2NsYXNzU2NvcmVEYXRhQWNjZXNzJyk7XG5qZXN0Lm1vY2soJy4uL3JvbGVWYWxpZGF0aW9uJyk7XG5qZXN0Lm1vY2soJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYicpO1xuamVzdC5tb2NrKCdAYXdzLXNkay9saWItZHluYW1vZGInKTtcblxuY29uc3QgbW9ja0NsYXNzU2NvcmVEYXRhQWNjZXNzID0gQ2xhc3NTY29yZURhdGFBY2Nlc3MgYXMgamVzdC5Nb2NrZWRDbGFzczx0eXBlb2YgQ2xhc3NTY29yZURhdGFBY2Nlc3M+O1xuY29uc3QgbW9ja0dldFVzZXJDb250ZXh0ID0gZ2V0VXNlckNvbnRleHQgYXMgamVzdC5Nb2NrZWRGdW5jdGlvbjx0eXBlb2YgZ2V0VXNlckNvbnRleHQ+O1xuY29uc3QgbW9ja1JlcXVpcmVBbnlSb2xlID0gcmVxdWlyZUFueVJvbGUgYXMgamVzdC5Nb2NrZWRGdW5jdGlvbjx0eXBlb2YgcmVxdWlyZUFueVJvbGU+O1xuY29uc3QgbW9ja0dldEp1ZGdlSWQgPSBnZXRKdWRnZUlkIGFzIGplc3QuTW9ja2VkRnVuY3Rpb248dHlwZW9mIGdldEp1ZGdlSWQ+O1xuXG5kZXNjcmliZSgnY2xhc3NTY29yZVJlc29sdmVyJywgKCkgPT4ge1xuICBsZXQgbW9ja0RhdGFBY2Nlc3M6IGplc3QuTW9ja2VkPENsYXNzU2NvcmVEYXRhQWNjZXNzPjtcblxuICBiZWZvcmVFYWNoKCgpID0+IHtcbiAgICBqZXN0LmNsZWFyQWxsTW9ja3MoKTtcbiAgICBcbiAgICAvLyBDcmVhdGUgbW9jayBpbnN0YW5jZVxuICAgIG1vY2tEYXRhQWNjZXNzID0ge1xuICAgICAgY3JlYXRlQ2xhc3NTY29yZTogamVzdC5mbigpLFxuICAgICAgdXBkYXRlQ2xhc3NTY29yZTogamVzdC5mbigpLFxuICAgICAgZ2V0Q2xhc3NTY29yZTogamVzdC5mbigpLFxuICAgICAgZ2V0Q2xhc3NTY29yZXNCeUNhdDogamVzdC5mbigpLFxuICAgICAgZ2V0Q2xhc3NTY29yZXNCeUNhZ2U6IGplc3QuZm4oKSxcbiAgICAgIGxpc3RBbGxDbGFzc1Njb3JlczogamVzdC5mbigpLFxuICAgICAgZ2V0Q2xhc3NTY29yZXNCeUp1ZGdlOiBqZXN0LmZuKCksXG4gICAgICBkZWxldGVDbGFzc1Njb3JlOiBqZXN0LmZuKCksXG4gICAgfSBhcyBhbnk7XG5cbiAgICAvLyBNb2NrIGNvbnN0cnVjdG9yIHRvIHJldHVybiBvdXIgbW9jayBpbnN0YW5jZVxuICAgIG1vY2tDbGFzc1Njb3JlRGF0YUFjY2Vzcy5tb2NrSW1wbGVtZW50YXRpb24oKCkgPT4gbW9ja0RhdGFBY2Nlc3MpO1xuXG4gICAgLy8gRGVmYXVsdCBtb2NrIGltcGxlbWVudGF0aW9uc1xuICAgIG1vY2tHZXRVc2VyQ29udGV4dC5tb2NrUmV0dXJuVmFsdWUoe1xuICAgICAgdXNlcklkOiAndXNlci0xMjMnLFxuICAgICAgcm9sZTogJ2p1ZGdlJyxcbiAgICAgIGVtYWlsOiAnanVkZ2VAZXhhbXBsZS5jb20nLFxuICAgICAgY2xhaW1zOiB7ICdjb2duaXRvOnVzZXJuYW1lJzogJ2p1ZGdlMTIzJyB9XG4gICAgfSk7XG4gICAgbW9ja1JlcXVpcmVBbnlSb2xlLm1vY2tJbXBsZW1lbnRhdGlvbigoKSA9PiB7fSk7XG4gICAgbW9ja0dldEp1ZGdlSWQubW9ja1JldHVyblZhbHVlKCdqdWRnZS0xMjMnKTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2NyZWF0ZUNsYXNzU2NvcmUnLCAoKSA9PiB7XG4gICAgY29uc3QgdmFsaWRJbnB1dCA9IHtcbiAgICAgIGNhdElkOiAnY2F0LTEyMycsXG4gICAgICBiZWF1dHlTY29yZTogMTIsXG4gICAgICBiZWF1dHlDb21tZW50czogJ0JlYXV0aWZ1bCBjYXQnLFxuICAgICAgcGVyc29uYWxpdHlTY29yZTogMTgsXG4gICAgICBwZXJzb25hbGl0eUNvbW1lbnRzOiAnVmVyeSBmcmllbmRseScsXG4gICAgICBiYWxhbmNlUHJvcG9ydGlvblNjb3JlOiAxMyxcbiAgICAgIGJhbGFuY2VQcm9wb3J0aW9uQ29tbWVudHM6ICdXZWxsIHByb3BvcnRpb25lZCcsXG4gICAgICBjb2F0Q2xlYW5Hcm9vbWVkOiB0cnVlLFxuICAgICAgdGVldGhHdW1zSGVhbHRoeTogdHJ1ZSxcbiAgICAgIGV5ZXNOb3NlQ2xlYXI6IHRydWUsXG4gICAgICBlYXJzQ2xlYW5NaXRlRnJlZTogdHJ1ZSxcbiAgICAgIHRvZW5haWxzQ2xpcHBlZDogdHJ1ZSxcbiAgICAgIGZsZWFJc3N1ZXM6IGZhbHNlLFxuICAgICAgaGVhbHRoR3Jvb21pbmdDb21tZW50czogJ0NhdCBhcHBlYXJzIGhlYWx0aHknLFxuICAgICAgaXNGaW5hbGl6ZWQ6IGZhbHNlXG4gICAgfTtcblxuICAgIGNvbnN0IG1vY2tFdmVudDogQXBwU3luY1Jlc29sdmVyRXZlbnQ8eyBpbnB1dDogYW55IH0+ID0ge1xuICAgICAgaW5mbzogeyBmaWVsZE5hbWU6ICdjcmVhdGVDbGFzc1Njb3JlJyB9LFxuICAgICAgYXJndW1lbnRzOiB7IGlucHV0OiB2YWxpZElucHV0IH1cbiAgICB9IGFzIGFueTtcblxuICAgIGl0KCdzaG91bGQgY3JlYXRlIGEgY2xhc3Mgc2NvcmUgc3VjY2Vzc2Z1bGx5JywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZXhwZWN0ZWRTY29yZSA9IHtcbiAgICAgICAgaWQ6ICdzY29yZS0xMjMnLFxuICAgICAgICAuLi52YWxpZElucHV0LFxuICAgICAgICBqdWRnZUlkOiAnanVkZ2UtMTIzJyxcbiAgICAgICAganVkZ2VOYW1lOiAnanVkZ2VAZXhhbXBsZS5jb20nLFxuICAgICAgICB0b3RhbFNjb3JlOiA0MyxcbiAgICAgICAgcmliYm9uRWxpZ2liaWxpdHk6ICdSZWQnLFxuICAgICAgICB0aW1lc3RhbXA6ICcyMDIzLTAxLTAxVDAwOjAwOjAwLjAwMFonXG4gICAgICB9O1xuXG4gICAgICBtb2NrRGF0YUFjY2Vzcy5jcmVhdGVDbGFzc1Njb3JlLm1vY2tSZXNvbHZlZFZhbHVlKGV4cGVjdGVkU2NvcmUpO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKG1vY2tFdmVudCk7XG5cbiAgICAgIGV4cGVjdChtb2NrUmVxdWlyZUFueVJvbGUpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKGV4cGVjdC5hbnkoT2JqZWN0KSwgWydqdWRnZScsICdhZG1pbiddKTtcbiAgICAgIGV4cGVjdChtb2NrR2V0SnVkZ2VJZCkudG9IYXZlQmVlbkNhbGxlZCgpO1xuICAgICAgZXhwZWN0KG1vY2tEYXRhQWNjZXNzLmNyZWF0ZUNsYXNzU2NvcmUpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKHtcbiAgICAgICAgLi4udmFsaWRJbnB1dCxcbiAgICAgICAganVkZ2VJZDogJ2p1ZGdlLTEyMycsXG4gICAgICAgIGp1ZGdlTmFtZTogJ2p1ZGdlQGV4YW1wbGUuY29tJ1xuICAgICAgfSk7XG4gICAgICBleHBlY3QocmVzdWx0KS50b0VxdWFsKGV4cGVjdGVkU2NvcmUpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCB2YWxpZGF0ZSBiZWF1dHkgc2NvcmUgcmFuZ2UgKDAtMTUpJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgaW52YWxpZElucHV0ID0geyAuLi52YWxpZElucHV0LCBiZWF1dHlTY29yZTogMjAgfTtcbiAgICAgIGNvbnN0IGV2ZW50ID0geyAuLi5tb2NrRXZlbnQsIGFyZ3VtZW50czogeyBpbnB1dDogaW52YWxpZElucHV0IH0gfTtcblxuICAgICAgYXdhaXQgZXhwZWN0KGhhbmRsZXIoZXZlbnQpKS5yZWplY3RzLnRvVGhyb3coVmFsaWRhdGlvbkVycm9yKTtcbiAgICAgIGV4cGVjdChtb2NrRGF0YUFjY2Vzcy5jcmVhdGVDbGFzc1Njb3JlKS5ub3QudG9IYXZlQmVlbkNhbGxlZCgpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCB2YWxpZGF0ZSBwZXJzb25hbGl0eSBzY29yZSByYW5nZSAoMC0yMCknLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBpbnZhbGlkSW5wdXQgPSB7IC4uLnZhbGlkSW5wdXQsIHBlcnNvbmFsaXR5U2NvcmU6IDI1IH07XG4gICAgICBjb25zdCBldmVudCA9IHsgLi4ubW9ja0V2ZW50LCBhcmd1bWVudHM6IHsgaW5wdXQ6IGludmFsaWRJbnB1dCB9IH07XG5cbiAgICAgIGF3YWl0IGV4cGVjdChoYW5kbGVyKGV2ZW50KSkucmVqZWN0cy50b1Rocm93KFZhbGlkYXRpb25FcnJvcik7XG4gICAgICBleHBlY3QobW9ja0RhdGFBY2Nlc3MuY3JlYXRlQ2xhc3NTY29yZSkubm90LnRvSGF2ZUJlZW5DYWxsZWQoKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgdmFsaWRhdGUgYmFsYW5jZS9wcm9wb3J0aW9uIHNjb3JlIHJhbmdlICgwLTE1KScsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGludmFsaWRJbnB1dCA9IHsgLi4udmFsaWRJbnB1dCwgYmFsYW5jZVByb3BvcnRpb25TY29yZTogMTggfTtcbiAgICAgIGNvbnN0IGV2ZW50ID0geyAuLi5tb2NrRXZlbnQsIGFyZ3VtZW50czogeyBpbnB1dDogaW52YWxpZElucHV0IH0gfTtcblxuICAgICAgYXdhaXQgZXhwZWN0KGhhbmRsZXIoZXZlbnQpKS5yZWplY3RzLnRvVGhyb3coVmFsaWRhdGlvbkVycm9yKTtcbiAgICAgIGV4cGVjdChtb2NrRGF0YUFjY2Vzcy5jcmVhdGVDbGFzc1Njb3JlKS5ub3QudG9IYXZlQmVlbkNhbGxlZCgpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCB2YWxpZGF0ZSBjb21tZW50IGxlbmd0aHMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBsb25nQ29tbWVudCA9ICdhJy5yZXBlYXQoNTAxKTtcbiAgICAgIGNvbnN0IGludmFsaWRJbnB1dCA9IHsgLi4udmFsaWRJbnB1dCwgYmVhdXR5Q29tbWVudHM6IGxvbmdDb21tZW50IH07XG4gICAgICBjb25zdCBldmVudCA9IHsgLi4ubW9ja0V2ZW50LCBhcmd1bWVudHM6IHsgaW5wdXQ6IGludmFsaWRJbnB1dCB9IH07XG5cbiAgICAgIGF3YWl0IGV4cGVjdChoYW5kbGVyKGV2ZW50KSkucmVqZWN0cy50b1Rocm93KFZhbGlkYXRpb25FcnJvcik7XG4gICAgICBleHBlY3QobW9ja0RhdGFBY2Nlc3MuY3JlYXRlQ2xhc3NTY29yZSkubm90LnRvSGF2ZUJlZW5DYWxsZWQoKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgdmFsaWRhdGUgaGVhbHRoIGNvbW1lbnQgbGVuZ3RoICgxMDAwIGNoYXJzKScsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGxvbmdDb21tZW50ID0gJ2EnLnJlcGVhdCgxMDAxKTtcbiAgICAgIGNvbnN0IGludmFsaWRJbnB1dCA9IHsgLi4udmFsaWRJbnB1dCwgaGVhbHRoR3Jvb21pbmdDb21tZW50czogbG9uZ0NvbW1lbnQgfTtcbiAgICAgIGNvbnN0IGV2ZW50ID0geyAuLi5tb2NrRXZlbnQsIGFyZ3VtZW50czogeyBpbnB1dDogaW52YWxpZElucHV0IH0gfTtcblxuICAgICAgYXdhaXQgZXhwZWN0KGhhbmRsZXIoZXZlbnQpKS5yZWplY3RzLnRvVGhyb3coVmFsaWRhdGlvbkVycm9yKTtcbiAgICAgIGV4cGVjdChtb2NrRGF0YUFjY2Vzcy5jcmVhdGVDbGFzc1Njb3JlKS5ub3QudG9IYXZlQmVlbkNhbGxlZCgpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCB2YWxpZGF0ZSBib29sZWFuIGhlYWx0aCBmaWVsZHMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBpbnZhbGlkSW5wdXQgPSB7IC4uLnZhbGlkSW5wdXQsIGNvYXRDbGVhbkdyb29tZWQ6ICd0cnVlJyBhcyBhbnkgfTtcbiAgICAgIGNvbnN0IGV2ZW50ID0geyAuLi5tb2NrRXZlbnQsIGFyZ3VtZW50czogeyBpbnB1dDogaW52YWxpZElucHV0IH0gfTtcblxuICAgICAgYXdhaXQgZXhwZWN0KGhhbmRsZXIoZXZlbnQpKS5yZWplY3RzLnRvVGhyb3coVmFsaWRhdGlvbkVycm9yKTtcbiAgICAgIGV4cGVjdChtb2NrRGF0YUFjY2Vzcy5jcmVhdGVDbGFzc1Njb3JlKS5ub3QudG9IYXZlQmVlbkNhbGxlZCgpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCB0aHJvdyBlcnJvciB3aGVuIGp1ZGdlIElEIGNhbm5vdCBiZSBkZXRlcm1pbmVkJywgYXN5bmMgKCkgPT4ge1xuICAgICAgbW9ja0dldEp1ZGdlSWQubW9ja1JldHVyblZhbHVlKG51bGwpO1xuXG4gICAgICBhd2FpdCBleHBlY3QoaGFuZGxlcihtb2NrRXZlbnQpKS5yZWplY3RzLnRvVGhyb3coVmFsaWRhdGlvbkVycm9yKTtcbiAgICAgIGV4cGVjdChtb2NrRGF0YUFjY2Vzcy5jcmVhdGVDbGFzc1Njb3JlKS5ub3QudG9IYXZlQmVlbkNhbGxlZCgpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgndXBkYXRlQ2xhc3NTY29yZScsICgpID0+IHtcbiAgICBjb25zdCB1cGRhdGVJbnB1dCA9IHtcbiAgICAgIGJlYXV0eVNjb3JlOiAxNCxcbiAgICAgIHBlcnNvbmFsaXR5U2NvcmU6IDE5XG4gICAgfTtcblxuICAgIGNvbnN0IG1vY2tFdmVudDogQXBwU3luY1Jlc29sdmVyRXZlbnQ8eyBpZDogc3RyaW5nOyBpbnB1dDogYW55IH0+ID0ge1xuICAgICAgaW5mbzogeyBmaWVsZE5hbWU6ICd1cGRhdGVDbGFzc1Njb3JlJyB9LFxuICAgICAgYXJndW1lbnRzOiB7IGlkOiAnc2NvcmUtMTIzJywgaW5wdXQ6IHVwZGF0ZUlucHV0IH1cbiAgICB9IGFzIGFueTtcblxuICAgIGNvbnN0IGV4aXN0aW5nU2NvcmUgPSB7XG4gICAgICBpZDogJ3Njb3JlLTEyMycsXG4gICAgICBjYXRJZDogJ2NhdC0xMjMnLFxuICAgICAganVkZ2VJZDogJ2p1ZGdlLTEyMycsXG4gICAgICBqdWRnZU5hbWU6ICdKdWRnZSBTbWl0aCcsXG4gICAgICBiZWF1dHlTY29yZTogMTIsXG4gICAgICBiZWF1dHlDb21tZW50czogJ0JlYXV0aWZ1bCBjYXQnLFxuICAgICAgcGVyc29uYWxpdHlTY29yZTogMTgsXG4gICAgICBwZXJzb25hbGl0eUNvbW1lbnRzOiAnVmVyeSBmcmllbmRseScsXG4gICAgICBiYWxhbmNlUHJvcG9ydGlvblNjb3JlOiAxMyxcbiAgICAgIGJhbGFuY2VQcm9wb3J0aW9uQ29tbWVudHM6ICdXZWxsIHByb3BvcnRpb25lZCcsXG4gICAgICBjb2F0Q2xlYW5Hcm9vbWVkOiB0cnVlLFxuICAgICAgdGVldGhHdW1zSGVhbHRoeTogdHJ1ZSxcbiAgICAgIGV5ZXNOb3NlQ2xlYXI6IHRydWUsXG4gICAgICBlYXJzQ2xlYW5NaXRlRnJlZTogdHJ1ZSxcbiAgICAgIHRvZW5haWxzQ2xpcHBlZDogdHJ1ZSxcbiAgICAgIGZsZWFJc3N1ZXM6IGZhbHNlLFxuICAgICAgaGVhbHRoR3Jvb21pbmdDb21tZW50czogJ0NhdCBhcHBlYXJzIGhlYWx0aHknLFxuICAgICAgdG90YWxTY29yZTogNDMsXG4gICAgICByaWJib25FbGlnaWJpbGl0eTogJ1JlZCcsXG4gICAgICB0aW1lc3RhbXA6ICcyMDIzLTAxLTAxVDAwOjAwOjAwLjAwMFonLFxuICAgICAgaXNGaW5hbGl6ZWQ6IGZhbHNlXG4gICAgfTtcblxuICAgIGl0KCdzaG91bGQgdXBkYXRlIGEgY2xhc3Mgc2NvcmUgc3VjY2Vzc2Z1bGx5JywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgdXBkYXRlZFNjb3JlID0geyAuLi5leGlzdGluZ1Njb3JlLCAuLi51cGRhdGVJbnB1dCwgdG90YWxTY29yZTogNDYgfTtcblxuICAgICAgbW9ja0RhdGFBY2Nlc3MuZ2V0Q2xhc3NTY29yZS5tb2NrUmVzb2x2ZWRWYWx1ZShleGlzdGluZ1Njb3JlKTtcbiAgICAgIG1vY2tEYXRhQWNjZXNzLnVwZGF0ZUNsYXNzU2NvcmUubW9ja1Jlc29sdmVkVmFsdWUodXBkYXRlZFNjb3JlKTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihtb2NrRXZlbnQpO1xuXG4gICAgICBleHBlY3QobW9ja1JlcXVpcmVBbnlSb2xlKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChleHBlY3QuYW55KE9iamVjdCksIFsnanVkZ2UnLCAnYWRtaW4nXSk7XG4gICAgICBleHBlY3QobW9ja0RhdGFBY2Nlc3MuZ2V0Q2xhc3NTY29yZSkudG9IYXZlQmVlbkNhbGxlZFdpdGgoJ3Njb3JlLTEyMycpO1xuICAgICAgZXhwZWN0KG1vY2tEYXRhQWNjZXNzLnVwZGF0ZUNsYXNzU2NvcmUpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKCdzY29yZS0xMjMnLCB1cGRhdGVJbnB1dCk7XG4gICAgICBleHBlY3QocmVzdWx0KS50b0VxdWFsKHVwZGF0ZWRTY29yZSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHRocm93IGVycm9yIHdoZW4gY2xhc3Mgc2NvcmUgbm90IGZvdW5kJywgYXN5bmMgKCkgPT4ge1xuICAgICAgbW9ja0RhdGFBY2Nlc3MuZ2V0Q2xhc3NTY29yZS5tb2NrUmVzb2x2ZWRWYWx1ZShudWxsKTtcblxuICAgICAgYXdhaXQgZXhwZWN0KGhhbmRsZXIobW9ja0V2ZW50KSkucmVqZWN0cy50b1Rocm93KE5vdEZvdW5kRXJyb3IpO1xuICAgICAgZXhwZWN0KG1vY2tEYXRhQWNjZXNzLnVwZGF0ZUNsYXNzU2NvcmUpLm5vdC50b0hhdmVCZWVuQ2FsbGVkKCk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHByZXZlbnQgbW9kaWZpY2F0aW9uIG9mIGZpbmFsaXplZCBzY29yZXMgYnkgbm9uLWFkbWluJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZmluYWxpemVkU2NvcmUgPSB7IC4uLmV4aXN0aW5nU2NvcmUsIGlzRmluYWxpemVkOiB0cnVlIH07XG4gICAgICBtb2NrRGF0YUFjY2Vzcy5nZXRDbGFzc1Njb3JlLm1vY2tSZXNvbHZlZFZhbHVlKGZpbmFsaXplZFNjb3JlKTtcblxuICAgICAgYXdhaXQgZXhwZWN0KGhhbmRsZXIobW9ja0V2ZW50KSkucmVqZWN0cy50b1Rocm93KFBlcm1pc3Npb25FcnJvcik7XG4gICAgICBleHBlY3QobW9ja0RhdGFBY2Nlc3MudXBkYXRlQ2xhc3NTY29yZSkubm90LnRvSGF2ZUJlZW5DYWxsZWQoKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgYWxsb3cgYWRtaW4gdG8gbW9kaWZ5IGZpbmFsaXplZCBzY29yZXMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBmaW5hbGl6ZWRTY29yZSA9IHsgLi4uZXhpc3RpbmdTY29yZSwgaXNGaW5hbGl6ZWQ6IHRydWUgfTtcbiAgICAgIGNvbnN0IHVwZGF0ZWRTY29yZSA9IHsgLi4uZmluYWxpemVkU2NvcmUsIC4uLnVwZGF0ZUlucHV0IH07XG5cbiAgICAgIG1vY2tHZXRVc2VyQ29udGV4dC5tb2NrUmV0dXJuVmFsdWUoeyBcbiAgICAgICAgdXNlcklkOiAnYWRtaW4tMTIzJyxcbiAgICAgICAgcm9sZTogJ2FkbWluJywgXG4gICAgICAgIGVtYWlsOiAnYWRtaW5AZXhhbXBsZS5jb20nLFxuICAgICAgICBjbGFpbXM6IHt9XG4gICAgICB9KTtcbiAgICAgIG1vY2tEYXRhQWNjZXNzLmdldENsYXNzU2NvcmUubW9ja1Jlc29sdmVkVmFsdWUoZmluYWxpemVkU2NvcmUpO1xuICAgICAgbW9ja0RhdGFBY2Nlc3MudXBkYXRlQ2xhc3NTY29yZS5tb2NrUmVzb2x2ZWRWYWx1ZSh1cGRhdGVkU2NvcmUpO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKG1vY2tFdmVudCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvRXF1YWwodXBkYXRlZFNjb3JlKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2dldENsYXNzU2NvcmUnLCAoKSA9PiB7XG4gICAgY29uc3QgbW9ja0V2ZW50OiBBcHBTeW5jUmVzb2x2ZXJFdmVudDx7IGlkOiBzdHJpbmcgfT4gPSB7XG4gICAgICBpbmZvOiB7IGZpZWxkTmFtZTogJ2dldENsYXNzU2NvcmUnIH0sXG4gICAgICBhcmd1bWVudHM6IHsgaWQ6ICdzY29yZS0xMjMnIH1cbiAgICB9IGFzIGFueTtcblxuICAgIGNvbnN0IGV4aXN0aW5nU2NvcmUgPSB7XG4gICAgICBpZDogJ3Njb3JlLTEyMycsXG4gICAgICBjYXRJZDogJ2NhdC0xMjMnLFxuICAgICAganVkZ2VJZDogJ2p1ZGdlLTEyMycsXG4gICAgICBqdWRnZU5hbWU6ICdKdWRnZSBTbWl0aCcsXG4gICAgICBiZWF1dHlTY29yZTogMTIsXG4gICAgICBiZWF1dHlDb21tZW50czogJ0JlYXV0aWZ1bCBjYXQnLFxuICAgICAgcGVyc29uYWxpdHlTY29yZTogMTgsXG4gICAgICBwZXJzb25hbGl0eUNvbW1lbnRzOiAnVmVyeSBmcmllbmRseScsXG4gICAgICBiYWxhbmNlUHJvcG9ydGlvblNjb3JlOiAxMyxcbiAgICAgIGJhbGFuY2VQcm9wb3J0aW9uQ29tbWVudHM6ICdXZWxsIHByb3BvcnRpb25lZCcsXG4gICAgICBjb2F0Q2xlYW5Hcm9vbWVkOiB0cnVlLFxuICAgICAgdGVldGhHdW1zSGVhbHRoeTogdHJ1ZSxcbiAgICAgIGV5ZXNOb3NlQ2xlYXI6IHRydWUsXG4gICAgICBlYXJzQ2xlYW5NaXRlRnJlZTogdHJ1ZSxcbiAgICAgIHRvZW5haWxzQ2xpcHBlZDogdHJ1ZSxcbiAgICAgIGZsZWFJc3N1ZXM6IGZhbHNlLFxuICAgICAgaGVhbHRoR3Jvb21pbmdDb21tZW50czogJ0NhdCBhcHBlYXJzIGhlYWx0aHknLFxuICAgICAgdG90YWxTY29yZTogNDMsXG4gICAgICByaWJib25FbGlnaWJpbGl0eTogJ1JlZCcsXG4gICAgICB0aW1lc3RhbXA6ICcyMDIzLTAxLTAxVDAwOjAwOjAwLjAwMFonLFxuICAgICAgaXNGaW5hbGl6ZWQ6IHRydWVcbiAgICB9O1xuXG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gY2xhc3Mgc2NvcmUgZm9yIGFkbWluJywgYXN5bmMgKCkgPT4ge1xuICAgICAgbW9ja0dldFVzZXJDb250ZXh0Lm1vY2tSZXR1cm5WYWx1ZSh7IFxuICAgICAgICB1c2VySWQ6ICdhZG1pbi0xMjMnLFxuICAgICAgICByb2xlOiAnYWRtaW4nLCBcbiAgICAgICAgZW1haWw6ICdhZG1pbkBleGFtcGxlLmNvbScsXG4gICAgICAgIGNsYWltczoge31cbiAgICAgIH0pO1xuICAgICAgbW9ja0RhdGFBY2Nlc3MuZ2V0Q2xhc3NTY29yZS5tb2NrUmVzb2x2ZWRWYWx1ZShleGlzdGluZ1Njb3JlKTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihtb2NrRXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0KS50b0VxdWFsKGV4aXN0aW5nU2NvcmUpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gY2xhc3Mgc2NvcmUgZm9yIG93bmluZyBqdWRnZScsIGFzeW5jICgpID0+IHtcbiAgICAgIG1vY2tEYXRhQWNjZXNzLmdldENsYXNzU2NvcmUubW9ja1Jlc29sdmVkVmFsdWUoZXhpc3RpbmdTY29yZSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIobW9ja0V2ZW50KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdCkudG9FcXVhbChleGlzdGluZ1Njb3JlKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmV0dXJuIGZpbmFsaXplZCBzY29yZSBmb3IgcGFydGljaXBhbnQnLCBhc3luYyAoKSA9PiB7XG4gICAgICBtb2NrR2V0VXNlckNvbnRleHQubW9ja1JldHVyblZhbHVlKHsgXG4gICAgICAgIHVzZXJJZDogJ3BhcnRpY2lwYW50LTEyMycsXG4gICAgICAgIHJvbGU6ICdwYXJ0aWNpcGFudCcsIFxuICAgICAgICBlbWFpbDogJ3BhcnRpY2lwYW50QGV4YW1wbGUuY29tJyxcbiAgICAgICAgY2xhaW1zOiB7fVxuICAgICAgfSk7XG4gICAgICBtb2NrRGF0YUFjY2Vzcy5nZXRDbGFzc1Njb3JlLm1vY2tSZXNvbHZlZFZhbHVlKGV4aXN0aW5nU2NvcmUpO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKG1vY2tFdmVudCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvRXF1YWwoZXhpc3RpbmdTY29yZSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHByZXZlbnQgcGFydGljaXBhbnQgZnJvbSB2aWV3aW5nIG5vbi1maW5hbGl6ZWQgc2NvcmUnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBub25GaW5hbGl6ZWRTY29yZSA9IHsgLi4uZXhpc3RpbmdTY29yZSwgaXNGaW5hbGl6ZWQ6IGZhbHNlIH07XG4gICAgICBtb2NrR2V0VXNlckNvbnRleHQubW9ja1JldHVyblZhbHVlKHsgXG4gICAgICAgIHVzZXJJZDogJ3BhcnRpY2lwYW50LTEyMycsXG4gICAgICAgIHJvbGU6ICdwYXJ0aWNpcGFudCcsIFxuICAgICAgICBlbWFpbDogJ3BhcnRpY2lwYW50QGV4YW1wbGUuY29tJyxcbiAgICAgICAgY2xhaW1zOiB7fVxuICAgICAgfSk7XG4gICAgICBtb2NrRGF0YUFjY2Vzcy5nZXRDbGFzc1Njb3JlLm1vY2tSZXNvbHZlZFZhbHVlKG5vbkZpbmFsaXplZFNjb3JlKTtcblxuICAgICAgYXdhaXQgZXhwZWN0KGhhbmRsZXIobW9ja0V2ZW50KSkucmVqZWN0cy50b1Rocm93KFBlcm1pc3Npb25FcnJvcik7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHJldHVybiBudWxsIHdoZW4gc2NvcmUgbm90IGZvdW5kJywgYXN5bmMgKCkgPT4ge1xuICAgICAgbW9ja0RhdGFBY2Nlc3MuZ2V0Q2xhc3NTY29yZS5tb2NrUmVzb2x2ZWRWYWx1ZShudWxsKTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihtb2NrRXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0KS50b0JlTnVsbCgpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnZ2V0Q2xhc3NTY29yZXNCeUNhdCcsICgpID0+IHtcbiAgICBjb25zdCBtb2NrRXZlbnQ6IEFwcFN5bmNSZXNvbHZlckV2ZW50PHsgY2F0SWQ6IHN0cmluZyB9PiA9IHtcbiAgICAgIGluZm86IHsgZmllbGROYW1lOiAnZ2V0Q2xhc3NTY29yZXNCeUNhdCcgfSxcbiAgICAgIGFyZ3VtZW50czogeyBjYXRJZDogJ2NhdC0xMjMnIH1cbiAgICB9IGFzIGFueTtcblxuICAgIGNvbnN0IG1vY2tTY29yZXMgPSBbXG4gICAgICB7XG4gICAgICAgIGlkOiAnc2NvcmUtMScsXG4gICAgICAgIGNhdElkOiAnY2F0LTEyMycsXG4gICAgICAgIGp1ZGdlSWQ6ICdqdWRnZS0xMjMnLFxuICAgICAgICBqdWRnZU5hbWU6ICdKdWRnZSBTbWl0aCcsXG4gICAgICAgIGJlYXV0eVNjb3JlOiAxMixcbiAgICAgICAgYmVhdXR5Q29tbWVudHM6ICdCZWF1dGlmdWwgY2F0JyxcbiAgICAgICAgcGVyc29uYWxpdHlTY29yZTogMTgsXG4gICAgICAgIHBlcnNvbmFsaXR5Q29tbWVudHM6ICdWZXJ5IGZyaWVuZGx5JyxcbiAgICAgICAgYmFsYW5jZVByb3BvcnRpb25TY29yZTogMTMsXG4gICAgICAgIGJhbGFuY2VQcm9wb3J0aW9uQ29tbWVudHM6ICdXZWxsIHByb3BvcnRpb25lZCcsXG4gICAgICAgIGNvYXRDbGVhbkdyb29tZWQ6IHRydWUsXG4gICAgICAgIHRlZXRoR3Vtc0hlYWx0aHk6IHRydWUsXG4gICAgICAgIGV5ZXNOb3NlQ2xlYXI6IHRydWUsXG4gICAgICAgIGVhcnNDbGVhbk1pdGVGcmVlOiB0cnVlLFxuICAgICAgICB0b2VuYWlsc0NsaXBwZWQ6IHRydWUsXG4gICAgICAgIGZsZWFJc3N1ZXM6IGZhbHNlLFxuICAgICAgICBoZWFsdGhHcm9vbWluZ0NvbW1lbnRzOiAnQ2F0IGFwcGVhcnMgaGVhbHRoeScsXG4gICAgICAgIHRvdGFsU2NvcmU6IDQzLFxuICAgICAgICByaWJib25FbGlnaWJpbGl0eTogJ1JlZCcsXG4gICAgICAgIHRpbWVzdGFtcDogJzIwMjMtMDEtMDFUMDA6MDA6MDAuMDAwWicsXG4gICAgICAgIGlzRmluYWxpemVkOiB0cnVlXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBpZDogJ3Njb3JlLTInLFxuICAgICAgICBjYXRJZDogJ2NhdC0xMjMnLFxuICAgICAgICBqdWRnZUlkOiAnanVkZ2UtNDU2JyxcbiAgICAgICAganVkZ2VOYW1lOiAnSnVkZ2UgSm9uZXMnLFxuICAgICAgICBiZWF1dHlTY29yZTogMTUsXG4gICAgICAgIGJlYXV0eUNvbW1lbnRzOiAnRXhjZWxsZW50IGFwcGVhcmFuY2UnLFxuICAgICAgICBwZXJzb25hbGl0eVNjb3JlOiAyMCxcbiAgICAgICAgcGVyc29uYWxpdHlDb21tZW50czogJ091dHN0YW5kaW5nIHBlcnNvbmFsaXR5JyxcbiAgICAgICAgYmFsYW5jZVByb3BvcnRpb25TY29yZTogMTIsXG4gICAgICAgIGJhbGFuY2VQcm9wb3J0aW9uQ29tbWVudHM6ICdHb29kIHByb3BvcnRpb25zJyxcbiAgICAgICAgY29hdENsZWFuR3Jvb21lZDogdHJ1ZSxcbiAgICAgICAgdGVldGhHdW1zSGVhbHRoeTogdHJ1ZSxcbiAgICAgICAgZXllc05vc2VDbGVhcjogdHJ1ZSxcbiAgICAgICAgZWFyc0NsZWFuTWl0ZUZyZWU6IHRydWUsXG4gICAgICAgIHRvZW5haWxzQ2xpcHBlZDogdHJ1ZSxcbiAgICAgICAgZmxlYUlzc3VlczogZmFsc2UsXG4gICAgICAgIGhlYWx0aEdyb29taW5nQ29tbWVudHM6ICdFeGNlbGxlbnQgaGVhbHRoJyxcbiAgICAgICAgdG90YWxTY29yZTogNDcsXG4gICAgICAgIHJpYmJvbkVsaWdpYmlsaXR5OiAnQmx1ZScsXG4gICAgICAgIHRpbWVzdGFtcDogJzIwMjMtMDEtMDFUMDE6MDA6MDAuMDAwWicsXG4gICAgICAgIGlzRmluYWxpemVkOiBmYWxzZVxuICAgICAgfVxuICAgIF07XG5cbiAgICBpdCgnc2hvdWxkIHJldHVybiBhbGwgc2NvcmVzIGZvciBhZG1pbicsIGFzeW5jICgpID0+IHtcbiAgICAgIG1vY2tHZXRVc2VyQ29udGV4dC5tb2NrUmV0dXJuVmFsdWUoeyBcbiAgICAgICAgdXNlcklkOiAnYWRtaW4tMTIzJyxcbiAgICAgICAgcm9sZTogJ2FkbWluJywgXG4gICAgICAgIGVtYWlsOiAnYWRtaW5AZXhhbXBsZS5jb20nLFxuICAgICAgICBjbGFpbXM6IHt9XG4gICAgICB9KTtcbiAgICAgIG1vY2tEYXRhQWNjZXNzLmdldENsYXNzU2NvcmVzQnlDYXQubW9ja1Jlc29sdmVkVmFsdWUobW9ja1Njb3Jlcyk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIobW9ja0V2ZW50KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdCkudG9FcXVhbCh7IGl0ZW1zOiBtb2NrU2NvcmVzIH0pO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gb25seSBvd24gc2NvcmVzIGZvciBqdWRnZScsIGFzeW5jICgpID0+IHtcbiAgICAgIG1vY2tEYXRhQWNjZXNzLmdldENsYXNzU2NvcmVzQnlDYXQubW9ja1Jlc29sdmVkVmFsdWUobW9ja1Njb3Jlcyk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIobW9ja0V2ZW50KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdCkudG9FcXVhbCh7IGl0ZW1zOiBbbW9ja1Njb3Jlc1swXV0gfSk7IC8vIE9ubHkganVkZ2UtMTIzJ3Mgc2NvcmVcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmV0dXJuIG9ubHkgZmluYWxpemVkIHNjb3JlcyBmb3IgcGFydGljaXBhbnQnLCBhc3luYyAoKSA9PiB7XG4gICAgICBtb2NrR2V0VXNlckNvbnRleHQubW9ja1JldHVyblZhbHVlKHsgXG4gICAgICAgIHVzZXJJZDogJ3BhcnRpY2lwYW50LTEyMycsXG4gICAgICAgIHJvbGU6ICdwYXJ0aWNpcGFudCcsIFxuICAgICAgICBlbWFpbDogJ3BhcnRpY2lwYW50QGV4YW1wbGUuY29tJyxcbiAgICAgICAgY2xhaW1zOiB7fVxuICAgICAgfSk7XG4gICAgICBtb2NrRGF0YUFjY2Vzcy5nZXRDbGFzc1Njb3Jlc0J5Q2F0Lm1vY2tSZXNvbHZlZFZhbHVlKG1vY2tTY29yZXMpO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKG1vY2tFdmVudCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvRXF1YWwoeyBpdGVtczogW21vY2tTY29yZXNbMF1dIH0pOyAvLyBPbmx5IGZpbmFsaXplZCBzY29yZVxuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnZmluYWxpemVDbGFzc1Njb3JlJywgKCkgPT4ge1xuICAgIGNvbnN0IG1vY2tFdmVudDogQXBwU3luY1Jlc29sdmVyRXZlbnQ8eyBpZDogc3RyaW5nIH0+ID0ge1xuICAgICAgaW5mbzogeyBmaWVsZE5hbWU6ICdmaW5hbGl6ZUNsYXNzU2NvcmUnIH0sXG4gICAgICBhcmd1bWVudHM6IHsgaWQ6ICdzY29yZS0xMjMnIH1cbiAgICB9IGFzIGFueTtcblxuICAgIGNvbnN0IGV4aXN0aW5nU2NvcmUgPSB7XG4gICAgICBpZDogJ3Njb3JlLTEyMycsXG4gICAgICBjYXRJZDogJ2NhdC0xMjMnLFxuICAgICAganVkZ2VJZDogJ2p1ZGdlLTEyMycsXG4gICAgICBqdWRnZU5hbWU6ICdKdWRnZSBTbWl0aCcsXG4gICAgICBiZWF1dHlTY29yZTogMTIsXG4gICAgICBiZWF1dHlDb21tZW50czogJ0JlYXV0aWZ1bCBjYXQnLFxuICAgICAgcGVyc29uYWxpdHlTY29yZTogMTgsXG4gICAgICBwZXJzb25hbGl0eUNvbW1lbnRzOiAnVmVyeSBmcmllbmRseScsXG4gICAgICBiYWxhbmNlUHJvcG9ydGlvblNjb3JlOiAxMyxcbiAgICAgIGJhbGFuY2VQcm9wb3J0aW9uQ29tbWVudHM6ICdXZWxsIHByb3BvcnRpb25lZCcsXG4gICAgICBjb2F0Q2xlYW5Hcm9vbWVkOiB0cnVlLFxuICAgICAgdGVldGhHdW1zSGVhbHRoeTogdHJ1ZSxcbiAgICAgIGV5ZXNOb3NlQ2xlYXI6IHRydWUsXG4gICAgICBlYXJzQ2xlYW5NaXRlRnJlZTogdHJ1ZSxcbiAgICAgIHRvZW5haWxzQ2xpcHBlZDogdHJ1ZSxcbiAgICAgIGZsZWFJc3N1ZXM6IGZhbHNlLFxuICAgICAgaGVhbHRoR3Jvb21pbmdDb21tZW50czogJ0NhdCBhcHBlYXJzIGhlYWx0aHknLFxuICAgICAgdG90YWxTY29yZTogNDMsXG4gICAgICByaWJib25FbGlnaWJpbGl0eTogJ1JlZCcsXG4gICAgICB0aW1lc3RhbXA6ICcyMDIzLTAxLTAxVDAwOjAwOjAwLjAwMFonLFxuICAgICAgaXNGaW5hbGl6ZWQ6IGZhbHNlXG4gICAgfTtcblxuICAgIGl0KCdzaG91bGQgZmluYWxpemUgYSBjbGFzcyBzY29yZSBzdWNjZXNzZnVsbHknLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBmaW5hbGl6ZWRTY29yZSA9IHsgLi4uZXhpc3RpbmdTY29yZSwgaXNGaW5hbGl6ZWQ6IHRydWUgfTtcblxuICAgICAgbW9ja0RhdGFBY2Nlc3MuZ2V0Q2xhc3NTY29yZS5tb2NrUmVzb2x2ZWRWYWx1ZShleGlzdGluZ1Njb3JlKTtcbiAgICAgIG1vY2tEYXRhQWNjZXNzLnVwZGF0ZUNsYXNzU2NvcmUubW9ja1Jlc29sdmVkVmFsdWUoZmluYWxpemVkU2NvcmUpO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKG1vY2tFdmVudCk7XG5cbiAgICAgIGV4cGVjdChtb2NrRGF0YUFjY2Vzcy5nZXRDbGFzc1Njb3JlKS50b0hhdmVCZWVuQ2FsbGVkV2l0aCgnc2NvcmUtMTIzJyk7XG4gICAgICBleHBlY3QobW9ja0RhdGFBY2Nlc3MudXBkYXRlQ2xhc3NTY29yZSkudG9IYXZlQmVlbkNhbGxlZFdpdGgoJ3Njb3JlLTEyMycsIHsgaXNGaW5hbGl6ZWQ6IHRydWUgfSk7XG4gICAgICBleHBlY3QocmVzdWx0KS50b0VxdWFsKGZpbmFsaXplZFNjb3JlKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgdGhyb3cgZXJyb3Igd2hlbiBjbGFzcyBzY29yZSBub3QgZm91bmQnLCBhc3luYyAoKSA9PiB7XG4gICAgICBtb2NrRGF0YUFjY2Vzcy5nZXRDbGFzc1Njb3JlLm1vY2tSZXNvbHZlZFZhbHVlKG51bGwpO1xuXG4gICAgICBhd2FpdCBleHBlY3QoaGFuZGxlcihtb2NrRXZlbnQpKS5yZWplY3RzLnRvVGhyb3coTm90Rm91bmRFcnJvcik7XG4gICAgICBleHBlY3QobW9ja0RhdGFBY2Nlc3MudXBkYXRlQ2xhc3NTY29yZSkubm90LnRvSGF2ZUJlZW5DYWxsZWQoKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgdGhyb3cgZXJyb3Igd2hlbiBzY29yZSBpcyBhbHJlYWR5IGZpbmFsaXplZCcsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGFscmVhZHlGaW5hbGl6ZWRTY29yZSA9IHsgLi4uZXhpc3RpbmdTY29yZSwgaXNGaW5hbGl6ZWQ6IHRydWUgfTtcbiAgICAgIG1vY2tEYXRhQWNjZXNzLmdldENsYXNzU2NvcmUubW9ja1Jlc29sdmVkVmFsdWUoYWxyZWFkeUZpbmFsaXplZFNjb3JlKTtcblxuICAgICAgYXdhaXQgZXhwZWN0KGhhbmRsZXIobW9ja0V2ZW50KSkucmVqZWN0cy50b1Rocm93KENvbmZsaWN0RXJyb3IpO1xuICAgICAgZXhwZWN0KG1vY2tEYXRhQWNjZXNzLnVwZGF0ZUNsYXNzU2NvcmUpLm5vdC50b0hhdmVCZWVuQ2FsbGVkKCk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCd1bmtub3duIGZpZWxkJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgdGhyb3cgZXJyb3IgZm9yIHVua25vd24gZmllbGQnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBtb2NrRXZlbnQ6IEFwcFN5bmNSZXNvbHZlckV2ZW50PGFueT4gPSB7XG4gICAgICAgIGluZm86IHsgZmllbGROYW1lOiAndW5rbm93bkZpZWxkJyB9LFxuICAgICAgICBhcmd1bWVudHM6IHt9XG4gICAgICB9IGFzIGFueTtcblxuICAgICAgYXdhaXQgZXhwZWN0KGhhbmRsZXIobW9ja0V2ZW50KSkucmVqZWN0cy50b1Rocm93KFZhbGlkYXRpb25FcnJvcik7XG4gICAgfSk7XG4gIH0pO1xufSk7Il19