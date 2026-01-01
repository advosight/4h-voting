"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fitShowScoreResolver_1 = require("../fitShowScoreResolver");
const fitShowScoreDataAccess_1 = require("../fitShowScoreDataAccess");
// Mock the data access layer
jest.mock('../fitShowScoreDataAccess');
const MockFitShowScoreDataAccess = fitShowScoreDataAccess_1.FitShowScoreDataAccess;
// Mock role validation
jest.mock('../roleValidation', () => ({
    getUserContext: jest.fn(),
    requireAnyRole: jest.fn(),
    requireRole: jest.fn(),
    getJudgeId: jest.fn(),
    requireScoreAccess: jest.fn()
}));
const roleValidation_1 = require("../roleValidation");
const mockGetUserContext = roleValidation_1.getUserContext;
const mockGetJudgeId = roleValidation_1.getJudgeId;
const mockRequireAnyRole = roleValidation_1.requireAnyRole;
const mockRequireScoreAccess = roleValidation_1.requireScoreAccess;
describe('FitShowScoreResolver - Audit Functionality', () => {
    let mockDataAccess;
    beforeEach(() => {
        jest.clearAllMocks();
        // Create mock instance
        mockDataAccess = {
            createFitShowScoreWithAudit: jest.fn(),
            updateFitShowScoreWithAudit: jest.fn(),
            getFitShowScore: jest.fn(),
            getFitShowScoreAuditHistory: jest.fn(),
            finalizeFitShowScore: jest.fn()
        };
        // Mock the constructor to return our mock instance
        MockFitShowScoreDataAccess.mockImplementation(() => mockDataAccess);
        // Setup default mocks
        mockGetUserContext.mockReturnValue({
            role: 'judge',
            claims: { 'cognito:username': 'judge-smith', email: 'judge@example.com' },
            email: 'judge@example.com'
        });
        mockGetJudgeId.mockReturnValue('judge-1');
        mockRequireAnyRole.mockImplementation(() => { });
        mockRequireScoreAccess.mockImplementation(() => { });
    });
    const mockEvent = (fieldName, args) => ({
        info: { fieldName },
        arguments: args,
        identity: {
            claims: {
                'cognito:username': 'judge-smith',
                email: 'judge@example.com'
            }
        }
    });
    describe('createFitShowScore with audit', () => {
        it('calls createFitShowScoreWithAudit instead of regular create', async () => {
            const mockScore = {
                id: 'score-1',
                catId: 'cat-1',
                participantName: 'John Doe',
                judgeId: 'judge-1',
                judgeName: 'judge-smith',
                attire: 8,
                totalScore: 88,
                isFinalized: false
            };
            mockDataAccess.createFitShowScoreWithAudit.mockResolvedValue(mockScore);
            const event = mockEvent('createFitShowScore', {
                input: {
                    catId: 'cat-1',
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
                    catAnatomy: 3,
                    fourHKnowledge: 3
                }
            });
            const result = await (0, fitShowScoreResolver_1.handler)(event);
            expect(mockDataAccess.createFitShowScoreWithAudit).toHaveBeenCalledWith(expect.objectContaining({
                catId: 'cat-1',
                participantName: 'John Doe',
                judgeId: 'judge-1',
                judgeName: 'judge-smith'
            }));
            expect(result).toEqual(mockScore);
        });
    });
    describe('updateFitShowScore with audit', () => {
        it('calls updateFitShowScoreWithAudit with modification reason', async () => {
            const existingScore = {
                id: 'score-1',
                catId: 'cat-1',
                participantName: 'John Doe',
                judgeId: 'judge-1',
                judgeName: 'judge-smith',
                attire: 8,
                totalScore: 88,
                isFinalized: false
            };
            const updatedScore = {
                ...existingScore,
                attire: 10,
                totalScore: 90
            };
            mockDataAccess.getFitShowScore.mockResolvedValue(existingScore);
            mockDataAccess.updateFitShowScoreWithAudit.mockResolvedValue(updatedScore);
            const event = mockEvent('updateFitShowScore', {
                id: 'score-1',
                input: {
                    attire: 10,
                    modificationReason: 'Improved attire presentation'
                }
            });
            const result = await (0, fitShowScoreResolver_1.handler)(event);
            expect(mockDataAccess.updateFitShowScoreWithAudit).toHaveBeenCalledWith(expect.objectContaining({
                id: 'score-1',
                attire: 10
            }), 'Improved attire presentation');
            expect(result).toEqual(updatedScore);
        });
        it('uses default reason when modificationReason not provided', async () => {
            const existingScore = {
                id: 'score-1',
                catId: 'cat-1',
                participantName: 'John Doe',
                judgeId: 'judge-1',
                judgeName: 'judge-smith',
                attire: 8,
                totalScore: 88,
                isFinalized: false
            };
            mockDataAccess.getFitShowScore.mockResolvedValue(existingScore);
            mockDataAccess.updateFitShowScoreWithAudit.mockResolvedValue(existingScore);
            const event = mockEvent('updateFitShowScore', {
                id: 'score-1',
                input: {
                    attire: 10
                }
            });
            await (0, fitShowScoreResolver_1.handler)(event);
            expect(mockDataAccess.updateFitShowScoreWithAudit).toHaveBeenCalledWith(expect.anything(), 'Score updated by judge');
        });
        it('prevents modification of finalized scores by non-admin users', async () => {
            const finalizedScore = {
                id: 'score-1',
                catId: 'cat-1',
                participantName: 'John Doe',
                judgeId: 'judge-1',
                judgeName: 'judge-smith',
                attire: 8,
                totalScore: 88,
                isFinalized: true
            };
            mockDataAccess.getFitShowScore.mockResolvedValue(finalizedScore);
            const event = mockEvent('updateFitShowScore', {
                id: 'score-1',
                input: {
                    attire: 10
                }
            });
            await expect((0, fitShowScoreResolver_1.handler)(event)).rejects.toThrow('Cannot modify finalized fit and show scores');
        });
        it('allows admin users to modify finalized scores', async () => {
            mockGetUserContext.mockReturnValue({
                role: 'admin',
                claims: { 'cognito:username': 'admin-user', email: 'admin@example.com' },
                email: 'admin@example.com'
            });
            const finalizedScore = {
                id: 'score-1',
                catId: 'cat-1',
                participantName: 'John Doe',
                judgeId: 'judge-1',
                judgeName: 'judge-smith',
                attire: 8,
                totalScore: 88,
                isFinalized: true
            };
            const updatedScore = {
                ...finalizedScore,
                attire: 10,
                totalScore: 90
            };
            mockDataAccess.getFitShowScore.mockResolvedValue(finalizedScore);
            mockDataAccess.updateFitShowScoreWithAudit.mockResolvedValue(updatedScore);
            const event = mockEvent('updateFitShowScore', {
                id: 'score-1',
                input: {
                    attire: 10,
                    modificationReason: 'Admin correction'
                }
            });
            const result = await (0, fitShowScoreResolver_1.handler)(event);
            expect(mockDataAccess.updateFitShowScoreWithAudit).toHaveBeenCalledWith(expect.objectContaining({
                id: 'score-1',
                attire: 10
            }), 'Admin correction');
            expect(result).toEqual(updatedScore);
        });
    });
    describe('getFitShowScoreAuditHistory', () => {
        it('retrieves audit history for authorized users', async () => {
            const mockScore = {
                id: 'score-1',
                judgeId: 'judge-1',
                participantName: 'John Doe'
            };
            const mockAuditEntries = [
                {
                    id: 'audit-1',
                    fitShowScoreId: 'score-1',
                    action: 'CREATE',
                    modifiedBy: 'judge-1',
                    modifiedAt: '2024-01-01T10:00:00Z',
                    reason: 'Initial creation'
                },
                {
                    id: 'audit-2',
                    fitShowScoreId: 'score-1',
                    action: 'UPDATE',
                    modifiedBy: 'judge-1',
                    modifiedAt: '2024-01-01T11:00:00Z',
                    reason: 'Score updated'
                }
            ];
            mockDataAccess.getFitShowScore.mockResolvedValue(mockScore);
            mockDataAccess.getFitShowScoreAuditHistory.mockResolvedValue(mockAuditEntries);
            const event = mockEvent('getFitShowScoreAuditHistory', {
                fitShowScoreId: 'score-1'
            });
            const result = await (0, fitShowScoreResolver_1.handler)(event);
            expect(mockDataAccess.getFitShowScoreAuditHistory).toHaveBeenCalledWith('score-1');
            expect(result).toEqual({ items: mockAuditEntries });
        });
        it('validates score access permissions', async () => {
            const mockScore = {
                id: 'score-1',
                judgeId: 'other-judge',
                participantName: 'John Doe'
            };
            mockDataAccess.getFitShowScore.mockResolvedValue(mockScore);
            const event = mockEvent('getFitShowScoreAuditHistory', {
                fitShowScoreId: 'score-1'
            });
            await (0, fitShowScoreResolver_1.handler)(event);
            expect(mockRequireScoreAccess).toHaveBeenCalledWith(expect.anything(), 'other-judge');
        });
        it('throws error when score not found', async () => {
            mockDataAccess.getFitShowScore.mockResolvedValue(null);
            const event = mockEvent('getFitShowScoreAuditHistory', {
                fitShowScoreId: 'nonexistent-score'
            });
            await expect((0, fitShowScoreResolver_1.handler)(event)).rejects.toThrow('Fit and show score with ID nonexistent-score not found');
        });
        it('requires appropriate role for audit access', async () => {
            const event = mockEvent('getFitShowScoreAuditHistory', {
                fitShowScoreId: 'score-1'
            });
            await (0, fitShowScoreResolver_1.handler)(event);
            expect(mockRequireAnyRole).toHaveBeenCalledWith(expect.anything(), ['judge', 'admin']);
        });
    });
    describe('finalizeFitShowScore with audit', () => {
        it('creates audit entry when finalizing score', async () => {
            const mockScore = {
                id: 'score-1',
                judgeId: 'judge-1',
                isFinalized: false
            };
            const finalizedScore = {
                ...mockScore,
                isFinalized: true
            };
            mockDataAccess.getFitShowScore.mockResolvedValue(mockScore);
            mockDataAccess.finalizeFitShowScore.mockResolvedValue(finalizedScore);
            const event = mockEvent('finalizeFitShowScore', {
                id: 'score-1'
            });
            const result = await (0, fitShowScoreResolver_1.handler)(event);
            expect(mockDataAccess.finalizeFitShowScore).toHaveBeenCalledWith('score-1', 'judge-1');
            expect(result).toEqual(finalizedScore);
        });
        it('prevents finalizing already finalized scores', async () => {
            const finalizedScore = {
                id: 'score-1',
                judgeId: 'judge-1',
                isFinalized: true
            };
            mockDataAccess.getFitShowScore.mockResolvedValue(finalizedScore);
            const event = mockEvent('finalizeFitShowScore', {
                id: 'score-1'
            });
            await expect((0, fitShowScoreResolver_1.handler)(event)).rejects.toThrow('Fit and show score is already finalized');
        });
    });
    describe('error handling', () => {
        it('handles data access errors gracefully', async () => {
            mockDataAccess.getFitShowScoreAuditHistory.mockRejectedValue(new Error('Database error'));
            const mockScore = {
                id: 'score-1',
                judgeId: 'judge-1'
            };
            mockDataAccess.getFitShowScore.mockResolvedValue(mockScore);
            const event = mockEvent('getFitShowScoreAuditHistory', {
                fitShowScoreId: 'score-1'
            });
            await expect((0, fitShowScoreResolver_1.handler)(event)).rejects.toThrow();
        });
        it('validates input parameters', async () => {
            const event = mockEvent('getFitShowScoreAuditHistory', {
            // Missing fitShowScoreId
            });
            await expect((0, fitShowScoreResolver_1.handler)(event)).rejects.toThrow();
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZml0U2hvd1Njb3JlUmVzb2x2ZXIuYXVkaXQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImZpdFNob3dTY29yZVJlc29sdmVyLmF1ZGl0LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFDQSxrRUFBa0Q7QUFDbEQsc0VBQW1FO0FBRW5FLDZCQUE2QjtBQUM3QixJQUFJLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLENBQUM7QUFDdkMsTUFBTSwwQkFBMEIsR0FBRywrQ0FBeUUsQ0FBQztBQUU3Ryx1QkFBdUI7QUFDdkIsSUFBSSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQ3BDLGNBQWMsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO0lBQ3pCLGNBQWMsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO0lBQ3pCLFdBQVcsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO0lBQ3RCLFVBQVUsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO0lBQ3JCLGtCQUFrQixFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7Q0FDOUIsQ0FBQyxDQUFDLENBQUM7QUFFSixzREFBbUc7QUFFbkcsTUFBTSxrQkFBa0IsR0FBRywrQkFBNEQsQ0FBQztBQUN4RixNQUFNLGNBQWMsR0FBRywyQkFBb0QsQ0FBQztBQUM1RSxNQUFNLGtCQUFrQixHQUFHLCtCQUE0RCxDQUFDO0FBQ3hGLE1BQU0sc0JBQXNCLEdBQUcsbUNBQW9FLENBQUM7QUFFcEcsUUFBUSxDQUFDLDRDQUE0QyxFQUFFLEdBQUcsRUFBRTtJQUMxRCxJQUFJLGNBQW1ELENBQUM7SUFFeEQsVUFBVSxDQUFDLEdBQUcsRUFBRTtRQUNkLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUVyQix1QkFBdUI7UUFDdkIsY0FBYyxHQUFHO1lBQ2YsMkJBQTJCLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtZQUN0QywyQkFBMkIsRUFBRSxJQUFJLENBQUMsRUFB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b3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHBTeW5jUmVzb2x2ZXJFdmVudCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgaGFuZGxlciB9IGZyb20gJy4uL2ZpdFNob3dTY29yZVJlc29sdmVyJztcbmltcG9ydCB7IEZpdFNob3dTY29yZURhdGFBY2Nlc3MgfSBmcm9tICcuLi9maXRTaG93U2NvcmVEYXRhQWNjZXNzJztcblxuLy8gTW9jayB0aGUgZGF0YSBhY2Nlc3MgbGF5ZXJcbmplc3QubW9jaygnLi4vZml0U2hvd1Njb3JlRGF0YUFjY2VzcycpO1xuY29uc3QgTW9ja0ZpdFNob3dTY29yZURhdGFBY2Nlc3MgPSBGaXRTaG93U2NvcmVEYXRhQWNjZXNzIGFzIGplc3QuTW9ja2VkQ2xhc3M8dHlwZW9mIEZpdFNob3dTY29yZURhdGFBY2Nlc3M+O1xuXG4vLyBNb2NrIHJvbGUgdmFsaWRhdGlvblxuamVzdC5tb2NrKCcuLi9yb2xlVmFsaWRhdGlvbicsICgpID0+ICh7XG4gIGdldFVzZXJDb250ZXh0OiBqZXN0LmZuKCksXG4gIHJlcXVpcmVBbnlSb2xlOiBqZXN0LmZuKCksXG4gIHJlcXVpcmVSb2xlOiBqZXN0LmZuKCksXG4gIGdldEp1ZGdlSWQ6IGplc3QuZm4oKSxcbiAgcmVxdWlyZVNjb3JlQWNjZXNzOiBqZXN0LmZuKClcbn0pKTtcblxuaW1wb3J0IHsgZ2V0VXNlckNvbnRleHQsIGdldEp1ZGdlSWQsIHJlcXVpcmVBbnlSb2xlLCByZXF1aXJlU2NvcmVBY2Nlc3MgfSBmcm9tICcuLi9yb2xlVmFsaWRhdGlvbic7XG5cbmNvbnN0IG1vY2tHZXRVc2VyQ29udGV4dCA9IGdldFVzZXJDb250ZXh0IGFzIGplc3QuTW9ja2VkRnVuY3Rpb248dHlwZW9mIGdldFVzZXJDb250ZXh0PjtcbmNvbnN0IG1vY2tHZXRKdWRnZUlkID0gZ2V0SnVkZ2VJZCBhcyBqZXN0Lk1vY2tlZEZ1bmN0aW9uPHR5cGVvZiBnZXRKdWRnZUlkPjtcbmNvbnN0IG1vY2tSZXF1aXJlQW55Um9sZSA9IHJlcXVpcmVBbnlSb2xlIGFzIGplc3QuTW9ja2VkRnVuY3Rpb248dHlwZW9mIHJlcXVpcmVBbnlSb2xlPjtcbmNvbnN0IG1vY2tSZXF1aXJlU2NvcmVBY2Nlc3MgPSByZXF1aXJlU2NvcmVBY2Nlc3MgYXMgamVzdC5Nb2NrZWRGdW5jdGlvbjx0eXBlb2YgcmVxdWlyZVNjb3JlQWNjZXNzPjtcblxuZGVzY3JpYmUoJ0ZpdFNob3dTY29yZVJlc29sdmVyIC0gQXVkaXQgRnVuY3Rpb25hbGl0eScsICgpID0+IHtcbiAgbGV0IG1vY2tEYXRhQWNjZXNzOiBqZXN0Lk1vY2tlZDxGaXRTaG93U2NvcmVEYXRhQWNjZXNzPjtcblxuICBiZWZvcmVFYWNoKCgpID0+IHtcbiAgICBqZXN0LmNsZWFyQWxsTW9ja3MoKTtcbiAgICBcbiAgICAvLyBDcmVhdGUgbW9jayBpbnN0YW5jZVxuICAgIG1vY2tEYXRhQWNjZXNzID0ge1xuICAgICAgY3JlYXRlRml0U2hvd1Njb3JlV2l0aEF1ZGl0OiBqZXN0LmZuKCksXG4gICAgICB1cGRhdGVGaXRTaG93U2NvcmVXaXRoQXVkaXQ6IGplc3QuZm4oKSxcbiAgICAgIGdldEZpdFNob3dTY29yZTogamVzdC5mbigpLFxuICAgICAgZ2V0Rml0U2hvd1Njb3JlQXVkaXRIaXN0b3J5OiBqZXN0LmZuKCksXG4gICAgICBmaW5hbGl6ZUZpdFNob3dTY29yZTogamVzdC5mbigpXG4gICAgfSBhcyBhbnk7XG5cbiAgICAvLyBNb2NrIHRoZSBjb25zdHJ1Y3RvciB0byByZXR1cm4gb3VyIG1vY2sgaW5zdGFuY2VcbiAgICBNb2NrRml0U2hvd1Njb3JlRGF0YUFjY2Vzcy5tb2NrSW1wbGVtZW50YXRpb24oKCkgPT4gbW9ja0RhdGFBY2Nlc3MpO1xuXG4gICAgLy8gU2V0dXAgZGVmYXVsdCBtb2Nrc1xuICAgIG1vY2tHZXRVc2VyQ29udGV4dC5tb2NrUmV0dXJuVmFsdWUoe1xuICAgICAgcm9sZTogJ2p1ZGdlJyxcbiAgICAgIGNsYWltczogeyAnY29nbml0bzp1c2VybmFtZSc6ICdqdWRnZS1zbWl0aCcsIGVtYWlsOiAnanVkZ2VAZXhhbXBsZS5jb20nIH0sXG4gICAgICBlbWFpbDogJ2p1ZGdlQGV4YW1wbGUuY29tJ1xuICAgIH0pO1xuICAgIG1vY2tHZXRKdWRnZUlkLm1vY2tSZXR1cm5WYWx1ZSgnanVkZ2UtMScpO1xuICAgIG1vY2tSZXF1aXJlQW55Um9sZS5tb2NrSW1wbGVtZW50YXRpb24oKCkgPT4ge30pO1xuICAgIG1vY2tSZXF1aXJlU2NvcmVBY2Nlc3MubW9ja0ltcGxlbWVudGF0aW9uKCgpID0+IHt9KTtcbiAgfSk7XG5cbiAgY29uc3QgbW9ja0V2ZW50ID0gKGZpZWxkTmFtZTogc3RyaW5nLCBhcmdzOiBhbnkpOiBBcHBTeW5jUmVzb2x2ZXJFdmVudDxhbnk+ID0+ICh7XG4gICAgaW5mbzogeyBmaWVsZE5hbWUgfSxcbiAgICBhcmd1bWVudHM6IGFyZ3MsXG4gICAgaWRlbnRpdHk6IHtcbiAgICAgIGNsYWltczoge1xuICAgICAgICAnY29nbml0bzp1c2VybmFtZSc6ICdqdWRnZS1zbWl0aCcsXG4gICAgICAgIGVtYWlsOiAnanVkZ2VAZXhhbXBsZS5jb20nXG4gICAgICB9XG4gICAgfVxuICB9IGFzIGFueSk7XG5cbiAgZGVzY3JpYmUoJ2NyZWF0ZUZpdFNob3dTY29yZSB3aXRoIGF1ZGl0JywgKCkgPT4ge1xuICAgIGl0KCdjYWxscyBjcmVhdGVGaXRTaG93U2NvcmVXaXRoQXVkaXQgaW5zdGVhZCBvZiByZWd1bGFyIGNyZWF0ZScsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IG1vY2tTY29yZSA9IHtcbiAgICAgICAgaWQ6ICdzY29yZS0xJyxcbiAgICAgICAgY2F0SWQ6ICdjYXQtMScsXG4gICAgICAgIHBhcnRpY2lwYW50TmFtZTogJ0pvaG4gRG9lJyxcbiAgICAgICAganVkZ2VJZDogJ2p1ZGdlLTEnLFxuICAgICAgICBqdWRnZU5hbWU6ICdqdWRnZS1zbWl0aCcsXG4gICAgICAgIGF0dGlyZTogOCxcbiAgICAgICAgdG90YWxTY29yZTogODgsXG4gICAgICAgIGlzRmluYWxpemVkOiBmYWxzZVxuICAgICAgfTtcblxuICAgICAgbW9ja0RhdGFBY2Nlc3MuY3JlYXRlRml0U2hvd1Njb3JlV2l0aEF1ZGl0Lm1vY2tSZXNvbHZlZFZhbHVlKG1vY2tTY29yZSBhcyBhbnkpO1xuXG4gICAgICBjb25zdCBldmVudCA9IG1vY2tFdmVudCgnY3JlYXRlRml0U2hvd1Njb3JlJywge1xuICAgICAgICBpbnB1dDoge1xuICAgICAgICAgIGNhdElkOiAnY2F0LTEnLFxuICAgICAgICAgIHBhcnRpY2lwYW50TmFtZTogJ0pvaG4gRG9lJyxcbiAgICAgICAgICBhdHRpcmU6IDgsXG4gICAgICAgICAgYXR0ZW50aXZlOiA0LFxuICAgICAgICAgIGNvdXJ0ZW91czogNSxcbiAgICAgICAgICBjb250cm9sRXF1aXBtZW50OiA5LFxuICAgICAgICAgIHBpY2t1cENhcnJ5aW5nOiAzLFxuICAgICAgICAgIHNob3dpbmdIZWFkU2hhcGU6IDMsXG4gICAgICAgICAgc2hvd2luZ0JvZHlUeXBlOiA0LFxuICAgICAgICAgIHNob3dpbmdUYWlsOiAzLFxuICAgICAgICAgIHNob3dpbmdDb2F0VGV4dHVyZTogNCxcbiAgICAgICAgICBzaG93aW5nTW91dGhUZWV0aEd1bXM6IDIsXG4gICAgICAgICAgY29uZGl0aW9uTW91dGhUZWV0aEd1bXM6IDIsXG4gICAgICAgICAgc2hvd2luZ05vc2U6IDIsXG4gICAgICAgICAgc2hvd2luZ0V5ZXM6IDIsXG4gICAgICAgICAgY29uZGl0aW9uTm9zZUV5ZXM6IDIsXG4gICAgICAgICAgc2hvd2luZ0VhcnM6IDIsXG4gICAgICAgICAgZWFyc0NsZWFuOiAyLFxuICAgICAgICAgIHNob3dpbmdUb2VuYWlsc0NsYXdzOiAzLFxuICAgICAgICAgIHRvZW5haWxzQ2xpcHBlZDogNSxcbiAgICAgICAgICBzaG93aW5nQmVsbHlDb2F0Q2xlYW5saW5lc3M6IDMsXG4gICAgICAgICAgY29hdENsZWFuV2VsbEdyb29tZWQ6IDcsXG4gICAgICAgICAgY2F0SGVhbHRoQ2FyZTogMyxcbiAgICAgICAgICBnZW5lcmFsS25vd2xlZGdlOiAzLFxuICAgICAgICAgIGNhdEJyZWVkc1Nob3dpbmc6IDMsXG4gICAgICAgICAgY2F0QW5hdG9teTogMyxcbiAgICAgICAgICBmb3VySEtub3dsZWRnZTogM1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCk7XG5cbiAgICAgIGV4cGVjdChtb2NrRGF0YUFjY2Vzcy5jcmVhdGVGaXRTaG93U2NvcmVXaXRoQXVkaXQpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxuICAgICAgICBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICAgICAgY2F0SWQ6ICdjYXQtMScsXG4gICAgICAgICAgcGFydGljaXBhbnROYW1lOiAnSm9obiBEb2UnLFxuICAgICAgICAgIGp1ZGdlSWQ6ICdqdWRnZS0xJyxcbiAgICAgICAgICBqdWRnZU5hbWU6ICdqdWRnZS1zbWl0aCdcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgICBleHBlY3QocmVzdWx0KS50b0VxdWFsKG1vY2tTY29yZSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCd1cGRhdGVGaXRTaG93U2NvcmUgd2l0aCBhdWRpdCcsICgpID0+IHtcbiAgICBpdCgnY2FsbHMgdXBkYXRlRml0U2hvd1Njb3JlV2l0aEF1ZGl0IHdpdGggbW9kaWZpY2F0aW9uIHJlYXNvbicsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGV4aXN0aW5nU2NvcmUgPSB7XG4gICAgICAgIGlkOiAnc2NvcmUtMScsXG4gICAgICAgIGNhdElkOiAnY2F0LTEnLFxuICAgICAgICBwYXJ0aWNpcGFudE5hbWU6ICdKb2huIERvZScsXG4gICAgICAgIGp1ZGdlSWQ6ICdqdWRnZS0xJyxcbiAgICAgICAganVkZ2VOYW1lOiAnanVkZ2Utc21pdGgnLFxuICAgICAgICBhdHRpcmU6IDgsXG4gICAgICAgIHRvdGFsU2NvcmU6IDg4LFxuICAgICAgICBpc0ZpbmFsaXplZDogZmFsc2VcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IHVwZGF0ZWRTY29yZSA9IHtcbiAgICAgICAgLi4uZXhpc3RpbmdTY29yZSxcbiAgICAgICAgYXR0aXJlOiAxMCxcbiAgICAgICAgdG90YWxTY29yZTogOTBcbiAgICAgIH07XG5cbiAgICAgIG1vY2tEYXRhQWNjZXNzLmdldEZpdFNob3dTY29yZS5tb2NrUmVzb2x2ZWRWYWx1ZShleGlzdGluZ1Njb3JlIGFzIGFueSk7XG4gICAgICBtb2NrRGF0YUFjY2Vzcy51cGRhdGVGaXRTaG93U2NvcmVXaXRoQXVkaXQubW9ja1Jlc29sdmVkVmFsdWUodXBkYXRlZFNjb3JlIGFzIGFueSk7XG5cbiAgICAgIGNvbnN0IGV2ZW50ID0gbW9ja0V2ZW50KCd1cGRhdGVGaXRTaG93U2NvcmUnLCB7XG4gICAgICAgIGlkOiAnc2NvcmUtMScsXG4gICAgICAgIGlucHV0OiB7XG4gICAgICAgICAgYXR0aXJlOiAxMCxcbiAgICAgICAgICBtb2RpZmljYXRpb25SZWFzb246ICdJbXByb3ZlZCBhdHRpcmUgcHJlc2VudGF0aW9uJ1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCk7XG5cbiAgICAgIGV4cGVjdChtb2NrRGF0YUFjY2Vzcy51cGRhdGVGaXRTaG93U2NvcmVXaXRoQXVkaXQpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxuICAgICAgICBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICAgICAgaWQ6ICdzY29yZS0xJyxcbiAgICAgICAgICBhdHRpcmU6IDEwXG4gICAgICAgIH0pLFxuICAgICAgICAnSW1wcm92ZWQgYXR0aXJlIHByZXNlbnRhdGlvbidcbiAgICAgICk7XG4gICAgICBleHBlY3QocmVzdWx0KS50b0VxdWFsKHVwZGF0ZWRTY29yZSk7XG4gICAgfSk7XG5cbiAgICBpdCgndXNlcyBkZWZhdWx0IHJlYXNvbiB3aGVuIG1vZGlmaWNhdGlvblJlYXNvbiBub3QgcHJvdmlkZWQnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBleGlzdGluZ1Njb3JlID0ge1xuICAgICAgICBpZDogJ3Njb3JlLTEnLFxuICAgICAgICBjYXRJZDogJ2NhdC0xJyxcbiAgICAgICAgcGFydGljaXBhbnROYW1lOiAnSm9obiBEb2UnLFxuICAgICAgICBqdWRnZUlkOiAnanVkZ2UtMScsXG4gICAgICAgIGp1ZGdlTmFtZTogJ2p1ZGdlLXNtaXRoJyxcbiAgICAgICAgYXR0aXJlOiA4LFxuICAgICAgICB0b3RhbFNjb3JlOiA4OCxcbiAgICAgICAgaXNGaW5hbGl6ZWQ6IGZhbHNlXG4gICAgICB9O1xuXG4gICAgICBtb2NrRGF0YUFjY2Vzcy5nZXRGaXRTaG93U2NvcmUubW9ja1Jlc29sdmVkVmFsdWUoZXhpc3RpbmdTY29yZSBhcyBhbnkpO1xuICAgICAgbW9ja0RhdGFBY2Nlc3MudXBkYXRlRml0U2hvd1Njb3JlV2l0aEF1ZGl0Lm1vY2tSZXNvbHZlZFZhbHVlKGV4aXN0aW5nU2NvcmUgYXMgYW55KTtcblxuICAgICAgY29uc3QgZXZlbnQgPSBtb2NrRXZlbnQoJ3VwZGF0ZUZpdFNob3dTY29yZScsIHtcbiAgICAgICAgaWQ6ICdzY29yZS0xJyxcbiAgICAgICAgaW5wdXQ6IHtcbiAgICAgICAgICBhdHRpcmU6IDEwXG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBhd2FpdCBoYW5kbGVyKGV2ZW50KTtcblxuICAgICAgZXhwZWN0KG1vY2tEYXRhQWNjZXNzLnVwZGF0ZUZpdFNob3dTY29yZVdpdGhBdWRpdCkudG9IYXZlQmVlbkNhbGxlZFdpdGgoXG4gICAgICAgIGV4cGVjdC5hbnl0aGluZygpLFxuICAgICAgICAnU2NvcmUgdXBkYXRlZCBieSBqdWRnZSdcbiAgICAgICk7XG4gICAgfSk7XG5cbiAgICBpdCgncHJldmVudHMgbW9kaWZpY2F0aW9uIG9mIGZpbmFsaXplZCBzY29yZXMgYnkgbm9uLWFkbWluIHVzZXJzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZmluYWxpemVkU2NvcmUgPSB7XG4gICAgICAgIGlkOiAnc2NvcmUtMScsXG4gICAgICAgIGNhdElkOiAnY2F0LTEnLFxuICAgICAgICBwYXJ0aWNpcGFudE5hbWU6ICdKb2huIERvZScsXG4gICAgICAgIGp1ZGdlSWQ6ICdqdWRnZS0xJyxcbiAgICAgICAganVkZ2VOYW1lOiAnanVkZ2Utc21pdGgnLFxuICAgICAgICBhdHRpcmU6IDgsXG4gICAgICAgIHRvdGFsU2NvcmU6IDg4LFxuICAgICAgICBpc0ZpbmFsaXplZDogdHJ1ZVxuICAgICAgfTtcblxuICAgICAgbW9ja0RhdGFBY2Nlc3MuZ2V0Rml0U2hvd1Njb3JlLm1vY2tSZXNvbHZlZFZhbHVlKGZpbmFsaXplZFNjb3JlIGFzIGFueSk7XG5cbiAgICAgIGNvbnN0IGV2ZW50ID0gbW9ja0V2ZW50KCd1cGRhdGVGaXRTaG93U2NvcmUnLCB7XG4gICAgICAgIGlkOiAnc2NvcmUtMScsXG4gICAgICAgIGlucHV0OiB7XG4gICAgICAgICAgYXR0aXJlOiAxMFxuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgYXdhaXQgZXhwZWN0KGhhbmRsZXIoZXZlbnQpKS5yZWplY3RzLnRvVGhyb3coJ0Nhbm5vdCBtb2RpZnkgZmluYWxpemVkIGZpdCBhbmQgc2hvdyBzY29yZXMnKTtcbiAgICB9KTtcblxuICAgIGl0KCdhbGxvd3MgYWRtaW4gdXNlcnMgdG8gbW9kaWZ5IGZpbmFsaXplZCBzY29yZXMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBtb2NrR2V0VXNlckNvbnRleHQubW9ja1JldHVyblZhbHVlKHtcbiAgICAgICAgcm9sZTogJ2FkbWluJyxcbiAgICAgICAgY2xhaW1zOiB7ICdjb2duaXRvOnVzZXJuYW1lJzogJ2FkbWluLXVzZXInLCBlbWFpbDogJ2FkbWluQGV4YW1wbGUuY29tJyB9LFxuICAgICAgICBlbWFpbDogJ2FkbWluQGV4YW1wbGUuY29tJ1xuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IGZpbmFsaXplZFNjb3JlID0ge1xuICAgICAgICBpZDogJ3Njb3JlLTEnLFxuICAgICAgICBjYXRJZDogJ2NhdC0xJyxcbiAgICAgICAgcGFydGljaXBhbnROYW1lOiAnSm9obiBEb2UnLFxuICAgICAgICBqdWRnZUlkOiAnanVkZ2UtMScsXG4gICAgICAgIGp1ZGdlTmFtZTogJ2p1ZGdlLXNtaXRoJyxcbiAgICAgICAgYXR0aXJlOiA4LFxuICAgICAgICB0b3RhbFNjb3JlOiA4OCxcbiAgICAgICAgaXNGaW5hbGl6ZWQ6IHRydWVcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IHVwZGF0ZWRTY29yZSA9IHtcbiAgICAgICAgLi4uZmluYWxpemVkU2NvcmUsXG4gICAgICAgIGF0dGlyZTogMTAsXG4gICAgICAgIHRvdGFsU2NvcmU6IDkwXG4gICAgICB9O1xuXG4gICAgICBtb2NrRGF0YUFjY2Vzcy5nZXRGaXRTaG93U2NvcmUubW9ja1Jlc29sdmVkVmFsdWUoZmluYWxpemVkU2NvcmUgYXMgYW55KTtcbiAgICAgIG1vY2tEYXRhQWNjZXNzLnVwZGF0ZUZpdFNob3dTY29yZVdpdGhBdWRpdC5tb2NrUmVzb2x2ZWRWYWx1ZSh1cGRhdGVkU2NvcmUgYXMgYW55KTtcblxuICAgICAgY29uc3QgZXZlbnQgPSBtb2NrRXZlbnQoJ3VwZGF0ZUZpdFNob3dTY29yZScsIHtcbiAgICAgICAgaWQ6ICdzY29yZS0xJyxcbiAgICAgICAgaW5wdXQ6IHtcbiAgICAgICAgICBhdHRpcmU6IDEwLFxuICAgICAgICAgIG1vZGlmaWNhdGlvblJlYXNvbjogJ0FkbWluIGNvcnJlY3Rpb24nXG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50KTtcblxuICAgICAgZXhwZWN0KG1vY2tEYXRhQWNjZXNzLnVwZGF0ZUZpdFNob3dTY29yZVdpdGhBdWRpdCkudG9IYXZlQmVlbkNhbGxlZFdpdGgoXG4gICAgICAgIGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgICAgICBpZDogJ3Njb3JlLTEnLFxuICAgICAgICAgIGF0dGlyZTogMTBcbiAgICAgICAgfSksXG4gICAgICAgICdBZG1pbiBjb3JyZWN0aW9uJ1xuICAgICAgKTtcbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvRXF1YWwodXBkYXRlZFNjb3JlKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2dldEZpdFNob3dTY29yZUF1ZGl0SGlzdG9yeScsICgpID0+IHtcbiAgICBpdCgncmV0cmlldmVzIGF1ZGl0IGhpc3RvcnkgZm9yIGF1dGhvcml6ZWQgdXNlcnMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBtb2NrU2NvcmUgPSB7XG4gICAgICAgIGlkOiAnc2NvcmUtMScsXG4gICAgICAgIGp1ZGdlSWQ6ICdqdWRnZS0xJyxcbiAgICAgICAgcGFydGljaXBhbnROYW1lOiAnSm9obiBEb2UnXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBtb2NrQXVkaXRFbnRyaWVzID0gW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6ICdhdWRpdC0xJyxcbiAgICAgICAgICBmaXRTaG93U2NvcmVJZDogJ3Njb3JlLTEnLFxuICAgICAgICAgIGFjdGlvbjogJ0NSRUFURScsXG4gICAgICAgICAgbW9kaWZpZWRCeTogJ2p1ZGdlLTEnLFxuICAgICAgICAgIG1vZGlmaWVkQXQ6ICcyMDI0LTAxLTAxVDEwOjAwOjAwWicsXG4gICAgICAgICAgcmVhc29uOiAnSW5pdGlhbCBjcmVhdGlvbidcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGlkOiAnYXVkaXQtMicsXG4gICAgICAgICAgZml0U2hvd1Njb3JlSWQ6ICdzY29yZS0xJyxcbiAgICAgICAgICBhY3Rpb246ICdVUERBVEUnLFxuICAgICAgICAgIG1vZGlmaWVkQnk6ICdqdWRnZS0xJyxcbiAgICAgICAgICBtb2RpZmllZEF0OiAnMjAyNC0wMS0wMVQxMTowMDowMFonLFxuICAgICAgICAgIHJlYXNvbjogJ1Njb3JlIHVwZGF0ZWQnXG4gICAgICAgIH1cbiAgICAgIF07XG5cbiAgICAgIG1vY2tEYXRhQWNjZXNzLmdldEZpdFNob3dTY29yZS5tb2NrUmVzb2x2ZWRWYWx1ZShtb2NrU2NvcmUgYXMgYW55KTtcbiAgICAgIG1vY2tEYXRhQWNjZXNzLmdldEZpdFNob3dTY29yZUF1ZGl0SGlzdG9yeS5tb2NrUmVzb2x2ZWRWYWx1ZShtb2NrQXVkaXRFbnRyaWVzIGFzIGFueSk7XG5cbiAgICAgIGNvbnN0IGV2ZW50ID0gbW9ja0V2ZW50KCdnZXRGaXRTaG93U2NvcmVBdWRpdEhpc3RvcnknLCB7XG4gICAgICAgIGZpdFNob3dTY29yZUlkOiAnc2NvcmUtMSdcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50KTtcblxuICAgICAgZXhwZWN0KG1vY2tEYXRhQWNjZXNzLmdldEZpdFNob3dTY29yZUF1ZGl0SGlzdG9yeSkudG9IYXZlQmVlbkNhbGxlZFdpdGgoJ3Njb3JlLTEnKTtcbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvRXF1YWwoeyBpdGVtczogbW9ja0F1ZGl0RW50cmllcyB9KTtcbiAgICB9KTtcblxuICAgIGl0KCd2YWxpZGF0ZXMgc2NvcmUgYWNjZXNzIHBlcm1pc3Npb25zJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgbW9ja1Njb3JlID0ge1xuICAgICAgICBpZDogJ3Njb3JlLTEnLFxuICAgICAgICBqdWRnZUlkOiAnb3RoZXItanVkZ2UnLFxuICAgICAgICBwYXJ0aWNpcGFudE5hbWU6ICdKb2huIERvZSdcbiAgICAgIH07XG5cbiAgICAgIG1vY2tEYXRhQWNjZXNzLmdldEZpdFNob3dTY29yZS5tb2NrUmVzb2x2ZWRWYWx1ZShtb2NrU2NvcmUgYXMgYW55KTtcblxuICAgICAgY29uc3QgZXZlbnQgPSBtb2NrRXZlbnQoJ2dldEZpdFNob3dTY29yZUF1ZGl0SGlzdG9yeScsIHtcbiAgICAgICAgZml0U2hvd1Njb3JlSWQ6ICdzY29yZS0xJ1xuICAgICAgfSk7XG5cbiAgICAgIGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xuXG4gICAgICBleHBlY3QobW9ja1JlcXVpcmVTY29yZUFjY2VzcykudG9IYXZlQmVlbkNhbGxlZFdpdGgoXG4gICAgICAgIGV4cGVjdC5hbnl0aGluZygpLFxuICAgICAgICAnb3RoZXItanVkZ2UnXG4gICAgICApO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Rocm93cyBlcnJvciB3aGVuIHNjb3JlIG5vdCBmb3VuZCcsIGFzeW5jICgpID0+IHtcbiAgICAgIG1vY2tEYXRhQWNjZXNzLmdldEZpdFNob3dTY29yZS5tb2NrUmVzb2x2ZWRWYWx1ZShudWxsKTtcblxuICAgICAgY29uc3QgZXZlbnQgPSBtb2NrRXZlbnQoJ2dldEZpdFNob3dTY29yZUF1ZGl0SGlzdG9yeScsIHtcbiAgICAgICAgZml0U2hvd1Njb3JlSWQ6ICdub25leGlzdGVudC1zY29yZSdcbiAgICAgIH0pO1xuXG4gICAgICBhd2FpdCBleHBlY3QoaGFuZGxlcihldmVudCkpLnJlamVjdHMudG9UaHJvdygnRml0IGFuZCBzaG93IHNjb3JlIHdpdGggSUQgbm9uZXhpc3RlbnQtc2NvcmUgbm90IGZvdW5kJyk7XG4gICAgfSk7XG5cbiAgICBpdCgncmVxdWlyZXMgYXBwcm9wcmlhdGUgcm9sZSBmb3IgYXVkaXQgYWNjZXNzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZXZlbnQgPSBtb2NrRXZlbnQoJ2dldEZpdFNob3dTY29yZUF1ZGl0SGlzdG9yeScsIHtcbiAgICAgICAgZml0U2hvd1Njb3JlSWQ6ICdzY29yZS0xJ1xuICAgICAgfSk7XG5cbiAgICAgIGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xuXG4gICAgICBleHBlY3QobW9ja1JlcXVpcmVBbnlSb2xlKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcbiAgICAgICAgZXhwZWN0LmFueXRoaW5nKCksXG4gICAgICAgIFsnanVkZ2UnLCAnYWRtaW4nXVxuICAgICAgKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2ZpbmFsaXplRml0U2hvd1Njb3JlIHdpdGggYXVkaXQnLCAoKSA9PiB7XG4gICAgaXQoJ2NyZWF0ZXMgYXVkaXQgZW50cnkgd2hlbiBmaW5hbGl6aW5nIHNjb3JlJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgbW9ja1Njb3JlID0ge1xuICAgICAgICBpZDogJ3Njb3JlLTEnLFxuICAgICAgICBqdWRnZUlkOiAnanVkZ2UtMScsXG4gICAgICAgIGlzRmluYWxpemVkOiBmYWxzZVxuICAgICAgfTtcblxuICAgICAgY29uc3QgZmluYWxpemVkU2NvcmUgPSB7XG4gICAgICAgIC4uLm1vY2tTY29yZSxcbiAgICAgICAgaXNGaW5hbGl6ZWQ6IHRydWVcbiAgICAgIH07XG5cbiAgICAgIG1vY2tEYXRhQWNjZXNzLmdldEZpdFNob3dTY29yZS5tb2NrUmVzb2x2ZWRWYWx1ZShtb2NrU2NvcmUgYXMgYW55KTtcbiAgICAgIG1vY2tEYXRhQWNjZXNzLmZpbmFsaXplRml0U2hvd1Njb3JlLm1vY2tSZXNvbHZlZFZhbHVlKGZpbmFsaXplZFNjb3JlIGFzIGFueSk7XG5cbiAgICAgIGNvbnN0IGV2ZW50ID0gbW9ja0V2ZW50KCdmaW5hbGl6ZUZpdFNob3dTY29yZScsIHtcbiAgICAgICAgaWQ6ICdzY29yZS0xJ1xuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xuXG4gICAgICBleHBlY3QobW9ja0RhdGFBY2Nlc3MuZmluYWxpemVGaXRTaG93U2NvcmUpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKCdzY29yZS0xJywgJ2p1ZGdlLTEnKTtcbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvRXF1YWwoZmluYWxpemVkU2NvcmUpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3ByZXZlbnRzIGZpbmFsaXppbmcgYWxyZWFkeSBmaW5hbGl6ZWQgc2NvcmVzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZmluYWxpemVkU2NvcmUgPSB7XG4gICAgICAgIGlkOiAnc2NvcmUtMScsXG4gICAgICAgIGp1ZGdlSWQ6ICdqdWRnZS0xJyxcbiAgICAgICAgaXNGaW5hbGl6ZWQ6IHRydWVcbiAgICAgIH07XG5cbiAgICAgIG1vY2tEYXRhQWNjZXNzLmdldEZpdFNob3dTY29yZS5tb2NrUmVzb2x2ZWRWYWx1ZShmaW5hbGl6ZWRTY29yZSBhcyBhbnkpO1xuXG4gICAgICBjb25zdCBldmVudCA9IG1vY2tFdmVudCgnZmluYWxpemVGaXRTaG93U2NvcmUnLCB7XG4gICAgICAgIGlkOiAnc2NvcmUtMSdcbiAgICAgIH0pO1xuXG4gICAgICBhd2FpdCBleHBlY3QoaGFuZGxlcihldmVudCkpLnJlamVjdHMudG9UaHJvdygnRml0IGFuZCBzaG93IHNjb3JlIGlzIGFscmVhZHkgZmluYWxpemVkJyk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdlcnJvciBoYW5kbGluZycsICgpID0+IHtcbiAgICBpdCgnaGFuZGxlcyBkYXRhIGFjY2VzcyBlcnJvcnMgZ3JhY2VmdWxseScsIGFzeW5jICgpID0+IHtcbiAgICAgIG1vY2tEYXRhQWNjZXNzLmdldEZpdFNob3dTY29yZUF1ZGl0SGlzdG9yeS5tb2NrUmVqZWN0ZWRWYWx1ZShuZXcgRXJyb3IoJ0RhdGFiYXNlIGVycm9yJykpO1xuXG4gICAgICBjb25zdCBtb2NrU2NvcmUgPSB7XG4gICAgICAgIGlkOiAnc2NvcmUtMScsXG4gICAgICAgIGp1ZGdlSWQ6ICdqdWRnZS0xJ1xuICAgICAgfTtcblxuICAgICAgbW9ja0RhdGFBY2Nlc3MuZ2V0Rml0U2hvd1Njb3JlLm1vY2tSZXNvbHZlZFZhbHVlKG1vY2tTY29yZSBhcyBhbnkpO1xuXG4gICAgICBjb25zdCBldmVudCA9IG1vY2tFdmVudCgnZ2V0Rml0U2hvd1Njb3JlQXVkaXRIaXN0b3J5Jywge1xuICAgICAgICBmaXRTaG93U2NvcmVJZDogJ3Njb3JlLTEnXG4gICAgICB9KTtcblxuICAgICAgYXdhaXQgZXhwZWN0KGhhbmRsZXIoZXZlbnQpKS5yZWplY3RzLnRvVGhyb3coKTtcbiAgICB9KTtcblxuICAgIGl0KCd2YWxpZGF0ZXMgaW5wdXQgcGFyYW1ldGVycycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGV2ZW50ID0gbW9ja0V2ZW50KCdnZXRGaXRTaG93U2NvcmVBdWRpdEhpc3RvcnknLCB7XG4gICAgICAgIC8vIE1pc3NpbmcgZml0U2hvd1Njb3JlSWRcbiAgICAgIH0pO1xuXG4gICAgICBhd2FpdCBleHBlY3QoaGFuZGxlcihldmVudCkpLnJlamVjdHMudG9UaHJvdygpO1xuICAgIH0pO1xuICB9KTtcbn0pOyJdfQ==