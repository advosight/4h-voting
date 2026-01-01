"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const fitShowScoreResolver_1 = require("../fitShowScoreResolver");
const fitShowScoreDataAccess_1 = require("../fitShowScoreDataAccess");
// Mock DynamoDB
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');
const mockDynamoClient = {
    send: jest.fn(),
};
const mockDocClient = mockDynamoClient;
client_dynamodb_1.DynamoDBClient.mockImplementation(() => mockDynamoClient);
lib_dynamodb_1.DynamoDBDocumentClient.from.mockReturnValue(mockDocClient);
// Mock environment
process.env.TABLE_NAME = 'test-table';
// Test data
const mockCat = {
    id: 'cat-123',
    name: 'Fluffy',
    ownerName: 'John Doe',
    cageNumber: 5
};
const mockFitShowScoreInput = {
    catId: 'cat-123',
    participantName: 'John Doe',
    judgeId: 'judge-123',
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
    // Health Examination (21 points)
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
    catAnatomy: 3,
    fourHKnowledge: 3,
    // Comments
    appearanceComments: 'Well dressed and professional',
    handlingComments: 'Good control, needs practice with harness',
    demonstrationComments: 'Clear demonstrations of features',
    healthExaminationComments: 'Thorough examination technique',
    groomingCareComments: 'Cat well groomed and healthy',
    knowledgeComments: 'Excellent knowledge of breeds and anatomy'
};
const mockFitShowScore = {
    id: 'score-123',
    ...mockFitShowScoreInput,
    // Calculated totals
    appearanceTotal: 17,
    handlingTotal: 10,
    demonstrationTotal: 14,
    healthExaminationTotal: 19,
    groomingCareTotal: 13,
    knowledgeTotal: 12,
    totalScore: 85,
    // Metadata
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    isFinalized: false
};
describe('Fit and Show Scoring Workflow Integration Tests', () => {
    let dataAccess;
    beforeEach(() => {
        jest.clearAllMocks();
        dataAccess = new fitShowScoreDataAccess_1.FitShowScoreDataAccess();
    });
    describe('Complete Scoring Workflow', () => {
        test('should handle complete fit and show scoring workflow', async () => {
            // Mock DynamoDB responses for complete workflow
            mockDocClient.send
                // Check for existing score
                .mockResolvedValueOnce({ Items: [] })
                // Create score
                .mockResolvedValueOnce({})
                // Create index records
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({})
                // Get created score
                .mockResolvedValueOnce({ Item: mockFitShowScore })
                // Update score
                .mockResolvedValueOnce({})
                // Get updated score
                .mockResolvedValueOnce({
                Item: { ...mockFitShowScore, totalScore: 88, isFinalized: true }
            });
            // Step 1: Create fit and show score
            const createEvent = {
                info: { fieldName: 'createFitShowScore' },
                arguments: { input: mockFitShowScoreInput },
                identity: { sub: 'judge-123' }
            };
            const createdScore = await (0, fitShowScoreResolver_1.fitShowScoreResolver)(createEvent);
            expect(createdScore).toMatchObject({
                catId: 'cat-123',
                participantName: 'John Doe',
                totalScore: 85
            });
            // Verify DynamoDB operations
            expect(mockDocClient.send).toHaveBeenCalledWith(expect.objectContaining({
                input: expect.objectContaining({
                    TableName: 'test-table',
                    Item: expect.objectContaining({
                        PK: expect.stringContaining('FIT_SHOW_SCORE#'),
                        SK: 'METADATA'
                    })
                })
            }));
            // Step 2: Update fit and show score
            const updateEvent = {
                info: { fieldName: 'updateFitShowScore' },
                arguments: {
                    input: {
                        id: 'score-123',
                        ...mockFitShowScoreInput,
                        attire: 9, // Updated score
                        isFinalized: true
                    }
                },
                identity: { sub: 'judge-123' }
            };
            const updatedScore = await (0, fitShowScoreResolver_1.fitShowScoreResolver)(updateEvent);
            expect(updatedScore).toMatchObject({
                totalScore: 88,
                isFinalized: true
            });
        });
        test('should handle concurrent scoring by multiple judges', async () => {
            const judge1Score = { ...mockFitShowScoreInput, judgeId: 'judge-1', judgeName: 'Judge One' };
            const judge2Score = { ...mockFitShowScoreInput, judgeId: 'judge-2', judgeName: 'Judge Two' };
            const judge3Score = { ...mockFitShowScoreInput, judgeId: 'judge-3', judgeName: 'Judge Three' };
            // Mock responses for concurrent scoring
            mockDocClient.send
                .mockResolvedValue({ Items: [] }) // No existing scores
                .mockResolvedValue({}) // Create operations
                .mockResolvedValue({})
                .mockResolvedValue({});
            // Simulate concurrent score creation
            const createPromises = [judge1Score, judge2Score, judge3Score].map(async (scoreInput, index) => {
                const event = {
                    info: { fieldName: 'createFitShowScore' },
                    arguments: { input: scoreInput },
                    identity: { sub: scoreInput.judgeId }
                };
                return (0, fitShowScoreResolver_1.fitShowScoreResolver)(event);
            });
            const results = await Promise.all(createPromises);
            // Verify all scores were created
            expect(results).toHaveLength(3);
            results.forEach((result, index) => {
                expect(result.judgeId).toBe(`judge-${index + 1}`);
            });
            // Verify DynamoDB was called for each score
            expect(mockDocClient.send).toHaveBeenCalledTimes(9); // 3 checks + 6 creates (main + indexes)
        });
        test('should prevent duplicate scoring by same judge', async () => {
            const existingScore = { ...mockFitShowScore, judgeId: 'judge-123' };
            // Mock existing score found
            mockDocClient.send.mockResolvedValueOnce({
                Items: [existingScore]
            });
            const createEvent = {
                info: { fieldName: 'createFitShowScore' },
                arguments: { input: mockFitShowScoreInput },
                identity: { sub: 'judge-123' }
            };
            await expect((0, fitShowScoreResolver_1.fitShowScoreResolver)(createEvent))
                .rejects
                .toThrow('Judge has already scored this participant');
        });
    });
    describe('Score Calculation Integration', () => {
        test('should correctly calculate all category totals and overall score', async () => {
            mockDocClient.send
                .mockResolvedValueOnce({ Items: [] })
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({ Item: mockFitShowScore });
            const result = await dataAccess.createFitShowScore(mockFitShowScoreInput);
            expect(result).toMatchObject({
                appearanceTotal: 17, // 8 + 4 + 5
                handlingTotal: 10, // 7 + 3
                demonstrationTotal: 14, // 3 + 4 + 3 + 4
                healthExaminationTotal: 19, // 2+2+2+2+2+2+2+2+5
                groomingCareTotal: 13, // 3 + 7 + 3
                knowledgeTotal: 12, // 3 + 3 + 3 + 3
                totalScore: 85 // Sum of all categories
            });
        });
        test('should handle maximum possible scores correctly', async () => {
            const maxScoreInput = {
                ...mockFitShowScoreInput,
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
            mockDocClient.send
                .mockResolvedValueOnce({ Items: [] })
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({
                Item: {
                    ...maxScoreInput,
                    appearanceTotal: 20,
                    handlingTotal: 14,
                    demonstrationTotal: 16,
                    healthExaminationTotal: 21,
                    groomingCareTotal: 14,
                    knowledgeTotal: 12,
                    totalScore: 97 // Maximum possible: 20+14+16+21+14+12 = 97
                }
            });
            const result = await dataAccess.createFitShowScore(maxScoreInput);
            expect(result.totalScore).toBe(97);
            expect(result.appearanceTotal).toBe(20);
            expect(result.handlingTotal).toBe(14);
            expect(result.demonstrationTotal).toBe(16);
            expect(result.healthExaminationTotal).toBe(21);
            expect(result.groomingCareTotal).toBe(14);
            expect(result.knowledgeTotal).toBe(12);
        });
    });
    describe('Data Access Pattern Integration', () => {
        test('should support all required access patterns', async () => {
            const scores = [
                { ...mockFitShowScore, id: 'score-1', judgeId: 'judge-1' },
                { ...mockFitShowScore, id: 'score-2', judgeId: 'judge-2' },
                { ...mockFitShowScore, id: 'score-3', judgeId: 'judge-1', catId: 'cat-456' }
            ];
            // Test: Get fit and show score by ID
            mockDocClient.send.mockResolvedValueOnce({ Item: scores[0] });
            const scoreById = await dataAccess.getFitShowScore('score-1');
            expect(scoreById).toMatchObject(scores[0]);
            // Test: Get fit and show scores by cat
            mockDocClient.send.mockResolvedValueOnce({ Items: [scores[0], scores[1]] });
            const scoresByCat = await dataAccess.getFitShowScoresByCat('cat-123');
            expect(scoresByCat).toHaveLength(2);
            // Test: Get fit and show scores by judge
            mockDocClient.send.mockResolvedValueOnce({ Items: [scores[0], scores[2]] });
            const scoresByJudge = await dataAccess.getFitShowScoresByJudge('judge-1');
            expect(scoresByJudge).toHaveLength(2);
            // Test: List all fit and show scores
            mockDocClient.send.mockResolvedValueOnce({ Items: scores });
            const allScores = await dataAccess.listFitShowScores();
            expect(allScores.items).toHaveLength(3);
            // Verify correct DynamoDB queries were made
            expect(mockDocClient.send).toHaveBeenCalledWith(expect.objectContaining({
                input: expect.objectContaining({
                    TableName: 'test-table',
                    Key: { PK: 'FIT_SHOW_SCORE#score-1', SK: 'METADATA' }
                })
            }));
            expect(mockDocClient.send).toHaveBeenCalledWith(expect.objectContaining({
                input: expect.objectContaining({
                    TableName: 'test-table',
                    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
                    ExpressionAttributeValues: {
                        ':pk': 'CAT#cat-123',
                        ':sk': 'FIT_SHOW_SCORE#'
                    }
                })
            }));
        });
        test('should handle pagination correctly', async () => {
            const scores = Array.from({ length: 25 }, (_, i) => ({
                ...mockFitShowScore,
                id: `score-${i}`,
                participantName: `Participant ${i}`
            }));
            // First page
            mockDocClient.send.mockResolvedValueOnce({
                Items: scores.slice(0, 10),
                LastEvaluatedKey: { PK: 'FIT_SHOW_SCORE#score-9', SK: 'METADATA' }
            });
            const firstPage = await dataAccess.listFitShowScores({ limit: 10 });
            expect(firstPage.items).toHaveLength(10);
            expect(firstPage.nextToken).toBeDefined();
            // Second page
            mockDocClient.send.mockResolvedValueOnce({
                Items: scores.slice(10, 20),
                LastEvaluatedKey: { PK: 'FIT_SHOW_SCORE#score-19', SK: 'METADATA' }
            });
            const secondPage = await dataAccess.listFitShowScores({
                limit: 10,
                nextToken: firstPage.nextToken
            });
            expect(secondPage.items).toHaveLength(10);
            expect(secondPage.items[0].participantName).toBe('Participant 10');
        });
    });
    describe('Audit Trail Integration', () => {
        test('should create audit records for all operations', async () => {
            mockDocClient.send
                .mockResolvedValueOnce({ Items: [] })
                .mockResolvedValueOnce({}) // Create score
                .mockResolvedValueOnce({}) // Create cat index
                .mockResolvedValueOnce({}) // Create judge index
                .mockResolvedValueOnce({}) // Create audit record
                .mockResolvedValueOnce({ Item: mockFitShowScore });
            await dataAccess.createFitShowScore(mockFitShowScoreInput);
            // Verify audit record was created
            expect(mockDocClient.send).toHaveBeenCalledWith(expect.objectContaining({
                input: expect.objectContaining({
                    TableName: 'test-table',
                    Item: expect.objectContaining({
                        PK: expect.stringContaining('FIT_SHOW_SCORE_AUDIT#'),
                        SK: expect.stringContaining('ENTRY#'),
                        action: 'CREATE'
                    })
                })
            }));
        });
        test('should track score modifications in audit trail', async () => {
            const originalScore = mockFitShowScore;
            const updatedScore = { ...mockFitShowScore, totalScore: 88, attire: 9 };
            mockDocClient.send
                .mockResolvedValueOnce({ Item: originalScore }) // Get original
                .mockResolvedValueOnce({}) // Update score
                .mockResolvedValueOnce({}) // Create audit record
                .mockResolvedValueOnce({ Item: updatedScore }); // Get updated
            await dataAccess.updateFitShowScore('score-123', { attire: 9 });
            // Verify audit record tracks changes
            expect(mockDocClient.send).toHaveBeenCalledWith(expect.objectContaining({
                input: expect.objectContaining({
                    TableName: 'test-table',
                    Item: expect.objectContaining({
                        action: 'UPDATE',
                        previousValues: expect.stringContaining('"attire":8'),
                        newValues: expect.stringContaining('"attire":9')
                    })
                })
            }));
        });
    });
    describe('Error Handling Integration', () => {
        test('should handle DynamoDB errors gracefully', async () => {
            mockDocClient.send.mockRejectedValue(new Error('DynamoDB service error'));
            await expect(dataAccess.createFitShowScore(mockFitShowScoreInput))
                .rejects
                .toThrow('DynamoDB service error');
        });
        test('should handle conditional check failures for concurrent updates', async () => {
            mockDocClient.send
                .mockResolvedValueOnce({ Item: mockFitShowScore })
                .mockRejectedValueOnce({
                name: 'ConditionalCheckFailedException',
                message: 'The conditional request failed'
            });
            await expect(dataAccess.updateFitShowScore('score-123', { attire: 9 }))
                .rejects
                .toThrow('Score was modified by another user');
        });
        test('should validate score ranges before database operations', async () => {
            const invalidScoreInput = {
                ...mockFitShowScoreInput,
                attire: 15 // Invalid: max is 10
            };
            await expect(dataAccess.createFitShowScore(invalidScoreInput))
                .rejects
                .toThrow('Score must be between 1 and 10');
        });
    });
    describe('Performance Integration', () => {
        test('should handle batch operations efficiently', async () => {
            const batchSize = 25;
            const scores = Array.from({ length: batchSize }, (_, i) => ({
                ...mockFitShowScore,
                id: `score-${i}`,
                participantName: `Participant ${i}`
            }));
            mockDocClient.send.mockResolvedValue({ Items: scores });
            const startTime = Date.now();
            const result = await dataAccess.listFitShowScores({ limit: batchSize });
            const endTime = Date.now();
            expect(result.items).toHaveLength(batchSize);
            expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
        });
        test('should optimize queries for common access patterns', async () => {
            // Test optimized query for getting scores by cat
            mockDocClient.send.mockResolvedValue({ Items: [mockFitShowScore] });
            await dataAccess.getFitShowScoresByCat('cat-123');
            // Verify efficient query structure
            expect(mockDocClient.send).toHaveBeenCalledWith(expect.objectContaining({
                input: expect.objectContaining({
                    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
                    ExpressionAttributeValues: {
                        ':pk': 'CAT#cat-123',
                        ':sk': 'FIT_SHOW_SCORE#'
                    }
                })
            }));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZml0LXNob3ctc2NvcmluZy13b3JrZmxvdy5pbnRlZ3JhdGlvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZml0LXNob3ctc2NvcmluZy13b3JrZmxvdy5pbnRlZ3JhdGlvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsOERBQTBEO0FBQzFELHdEQUFvSDtBQUNwSCxrRUFBK0Q7QUFDL0Qsc0VBQW1FO0FBRW5FLGdCQUFnQjtBQUNoQixJQUFJLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLENBQUM7QUFDdEMsSUFBSSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0FBRW5DLE1BQU0sZ0JBQWdCLEdBQUc7SUFDdkIsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7Q0FDaEIsQ0FBQztBQUVGLE1BQU0sYUFBYSxHQUFHLGdCQUF1QixDQUFDO0FBRTdDLGdDQUE0QixDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFDeEUscUNBQXNCLENBQUMsSUFBa0IsQ0FBQyxlQUFlLENBQUMsYUFBYSxDQUFDLENBQUM7QUFFMUUsbUJBQW1CO0FBQ25CLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxHQUFHLFlBQVksQ0FBQztBQUV0QyxZQUFZO0FBQ1osTUFBTSxPQUFPLEdBQUc7SUFDZCxFQUFFLEVBQUUsU0FBUztJQUNiLElBQUksRUFBRSxRQUFRO0lBQ2QsU0FBUyxFQUFFLFVBQVU7SUFDckIsVUFBVSxFQUFFLENBQUM7Q0FDZCxDQUFDO0FBRUYsTUFBTSxxQkFBcUIsR0FBRztJQUM1QixLQUFLLEVBQUUsU0FBUztJQUNoQixlQUFlLEVBQUUsVUFBVTtJQUMzQixPQUFPLEVBQUUsV0FBVztJQUNwQixTQUFTLEVBQUUsYUFBYTtJQUN4QixvQ0FBb0M7SUFDcEMsTUFBTSxFQUFFLENBQUM7SUFDVCxTQUFTLEVBQUUsQ0FBQztJQUNaLFNBQVMsRUFBRSxDQUFDO0lB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LGdCQUFnQixDQUFDO2dCQUN0QixLQUFLLEVBQUUsTUFBTSxDQUFDLGdCQUFnQixDQUFDO29CQUM3QixzQkFBc0IsRUFBRSxtQ0FBbUM7b0JBQzNELHlCQUF5QixFQUFFO3dCQUN6QixLQUFLLEVBQUUsYUFBYTt3QkFDcEIsS0FBSyxFQUFFLGlCQUFpQjtxQkFDekI7aUJBQ0YsQ0FBQzthQUNILENBQUMsQ0FDSCxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRHluYW1vREJDbGllbnQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xuaW1wb3J0IHsgRHluYW1vREJEb2N1bWVudENsaWVudCwgUHV0Q29tbWFuZCwgR2V0Q29tbWFuZCwgUXVlcnlDb21tYW5kLCBEZWxldGVDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvbGliLWR5bmFtb2RiJztcbmltcG9ydCB7IGZpdFNob3dTY29yZVJlc29sdmVyIH0gZnJvbSAnLi4vZml0U2hvd1Njb3JlUmVzb2x2ZXInO1xuaW1wb3J0IHsgRml0U2hvd1Njb3JlRGF0YUFjY2VzcyB9IGZyb20gJy4uL2ZpdFNob3dTY29yZURhdGFBY2Nlc3MnO1xuXG4vLyBNb2NrIER5bmFtb0RCXG5qZXN0Lm1vY2soJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYicpO1xuamVzdC5tb2NrKCdAYXdzLXNkay9saWItZHluYW1vZGInKTtcblxuY29uc3QgbW9ja0R5bmFtb0NsaWVudCA9IHtcbiAgc2VuZDogamVzdC5mbigpLFxufTtcblxuY29uc3QgbW9ja0RvY0NsaWVudCA9IG1vY2tEeW5hbW9DbGllbnQgYXMgYW55O1xuXG4oRHluYW1vREJDbGllbnQgYXMgamVzdC5Nb2NrKS5tb2NrSW1wbGVtZW50YXRpb24oKCkgPT4gbW9ja0R5bmFtb0NsaWVudCk7XG4oRHluYW1vREJEb2N1bWVudENsaWVudC5mcm9tIGFzIGplc3QuTW9jaykubW9ja1JldHVyblZhbHVlKG1vY2tEb2NDbGllbnQpO1xuXG4vLyBNb2NrIGVudmlyb25tZW50XG5wcm9jZXNzLmVudi5UQUJMRV9OQU1FID0gJ3Rlc3QtdGFibGUnO1xuXG4vLyBUZXN0IGRhdGFcbmNvbnN0IG1vY2tDYXQgPSB7XG4gIGlkOiAnY2F0LTEyMycsXG4gIG5hbWU6ICdGbHVmZnknLFxuICBvd25lck5hbWU6ICdKb2huIERvZScsXG4gIGNhZ2VOdW1iZXI6IDVcbn07XG5cbmNvbnN0IG1vY2tGaXRTaG93U2NvcmVJbnB1dCA9IHtcbiAgY2F0SWQ6ICdjYXQtMTIzJyxcbiAgcGFydGljaXBhbnROYW1lOiAnSm9obiBEb2UnLFxuICBqdWRnZUlkOiAnanVkZ2UtMTIzJyxcbiAganVkZ2VOYW1lOiAnSnVkZ2UgU21pdGgnLFxuICAvLyBBcHBlYXJhbmNlICYgRGVtZWFub3IgKDIwIHBvaW50cylcbiAgYXR0aXJlOiA4LFxuICBhdHRlbnRpdmU6IDQsXG4gIGNvdXJ0ZW91czogNSxcbiAgLy8gSGFuZGxpbmcgJiBDb250cm9sICgxNCBwb2ludHMpXG4gIGNvbnRyb2xFcXVpcG1lbnQ6IDcsXG4gIHBpY2t1cENhcnJ5aW5nOiAzLFxuICAvLyBEZW1vbnN0cmF0aW9uIFNraWxscyAoMTYgcG9pbnRzKVxuICBzaG93aW5nSGVhZFNoYXBlOiAzLFxuICBzaG93aW5nQm9keVR5cGU6IDQsXG4gIHNob3dpbmdUYWlsOiAzLFxuICBzaG93aW5nQ29hdFRleHR1cmU6IDQsXG4gIC8vIEhlYWx0aCBFeGFtaW5hdGlvbiAoMjEgcG9pbnRzKVxuICBzaG93aW5nTW91dGhUZWV0aEd1bXM6IDIsXG4gIGNvbmRpdGlvbk1vdXRoVGVldGhHdW1zOiAyLFxuICBzaG93aW5nTm9zZTogMixcbiAgc2hvd2luZ0V5ZXM6IDIsXG4gIGNvbmRpdGlvbk5vc2VFeWVzOiAyLFxuICBzaG93aW5nRWFyczogMixcbiAgZWFyc0NsZWFuOiAyLFxuICBzaG93aW5nVG9lbmFpbHNDbGF3czogMixcbiAgdG9lbmFpbHNDbGlwcGVkOiA1LFxuICAvLyBHcm9vbWluZyAmIENhcmUgKDE0IHBvaW50cylcbiAgc2hvd2luZ0JlbGx5Q29hdENsZWFubGluZXNzOiAzLFxuICBjb2F0Q2xlYW5XZWxsR3Jvb21lZDogNyxcbiAgY2F0SGVhbHRoQ2FyZTogMyxcbiAgLy8gS25vd2xlZGdlICgxMiBwb2ludHMpXG4gIGdlbmVyYWxLbm93bGVkZ2U6IDMsXG4gIGNhdEJyZWVkc1Nob3dpbmc6IDMsXG4gIGNhdEFuYXRvbXk6IDMsXG4gIGZvdXJIS25vd2xlZGdlOiAzLFxuICAvLyBDb21tZW50c1xuICBhcHBlYXJhbmNlQ29tbWVudHM6ICdXZWxsIGRyZXNzZWQgYW5kIHByb2Zlc3Npb25hbCcsXG4gIGhhbmRsaW5nQ29tbWVudHM6ICdHb29kIGNvbnRyb2wsIG5lZWRzIHByYWN0aWNlIHdpdGggaGFybmVzcycsXG4gIGRlbW9uc3RyYXRpb25Db21tZW50czogJ0NsZWFyIGRlbW9uc3RyYXRpb25zIG9mIGZlYXR1cmVzJyxcbiAgaGVhbHRoRXhhbWluYXRpb25Db21tZW50czogJ1Rob3JvdWdoIGV4YW1pbmF0aW9uIHRlY2huaXF1ZScsXG4gIGdyb29taW5nQ2FyZUNvbW1lbnRzOiAnQ2F0IHdlbGwgZ3Jvb21lZCBhbmQgaGVhbHRoeScsXG4gIGtub3dsZWRnZUNvbW1lbnRzOiAnRXhjZWxsZW50IGtub3dsZWRnZSBvZiBicmVlZHMgYW5kIGFuYXRvbXknXG59O1xuXG5jb25zdCBtb2NrRml0U2hvd1Njb3JlID0ge1xuICBpZDogJ3Njb3JlLTEyMycsXG4gIC4uLm1vY2tGaXRTaG93U2NvcmVJbnB1dCxcbiAgLy8gQ2FsY3VsYXRlZCB0b3RhbHNcbiAgYXBwZWFyYW5jZVRvdGFsOiAxNyxcbiAgaGFuZGxpbmdUb3RhbDogMTAsXG4gIGRlbW9uc3RyYXRpb25Ub3RhbDogMTQsXG4gIGhlYWx0aEV4YW1pbmF0aW9uVG90YWw6IDE5LFxuICBncm9vbWluZ0NhcmVUb3RhbDogMTMsXG4gIGtub3dsZWRnZVRvdGFsOiAxMixcbiAgdG90YWxTY29yZTogODUsXG4gIC8vIE1ldGFkYXRhXG4gIGNyZWF0ZWRBdDogJzIwMjQtMDEtMTVUMTA6MDA6MDBaJyxcbiAgdXBkYXRlZEF0OiAnMjAyNC0wMS0xNVQxMDowMDowMFonLFxuICBpc0ZpbmFsaXplZDogZmFsc2Vcbn07XG5cbmRlc2NyaWJlKCdGaXQgYW5kIFNob3cgU2NvcmluZyBXb3JrZmxvdyBJbnRlZ3JhdGlvbiBUZXN0cycsICgpID0+IHtcbiAgbGV0IGRhdGFBY2Nlc3M6IEZpdFNob3dTY29yZURhdGFBY2Nlc3M7XG5cbiAgYmVmb3JlRWFjaCgoKSA9PiB7XG4gICAgamVzdC5jbGVhckFsbE1vY2tzKCk7XG4gICAgZGF0YUFjY2VzcyA9IG5ldyBGaXRTaG93U2NvcmVEYXRhQWNjZXNzKCk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdDb21wbGV0ZSBTY29yaW5nIFdvcmtmbG93JywgKCkgPT4ge1xuICAgIHRlc3QoJ3Nob3VsZCBoYW5kbGUgY29tcGxldGUgZml0IGFuZCBzaG93IHNjb3Jpbmcgd29ya2Zsb3cnLCBhc3luYyAoKSA9PiB7XG4gICAgICAvLyBNb2NrIER5bmFtb0RCIHJlc3BvbnNlcyBmb3IgY29tcGxldGUgd29ya2Zsb3dcbiAgICAgIG1vY2tEb2NDbGllbnQuc2VuZFxuICAgICAgICAvLyBDaGVjayBmb3IgZXhpc3Rpbmcgc2NvcmVcbiAgICAgICAgLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7IEl0ZW1zOiBbXSB9KVxuICAgICAgICAvLyBDcmVhdGUgc2NvcmVcbiAgICAgICAgLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7fSlcbiAgICAgICAgLy8gQ3JlYXRlIGluZGV4IHJlY29yZHNcbiAgICAgICAgLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7fSlcbiAgICAgICAgLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7fSlcbiAgICAgICAgLy8gR2V0IGNyZWF0ZWQgc2NvcmVcbiAgICAgICAgLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7IEl0ZW06IG1vY2tGaXRTaG93U2NvcmUgfSlcbiAgICAgICAgLy8gVXBkYXRlIHNjb3JlXG4gICAgICAgIC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe30pXG4gICAgICAgIC8vIEdldCB1cGRhdGVkIHNjb3JlXG4gICAgICAgIC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UoeyBcbiAgICAgICAgICBJdGVtOiB7IC4uLm1vY2tGaXRTaG93U2NvcmUsIHRvdGFsU2NvcmU6IDg4LCBpc0ZpbmFsaXplZDogdHJ1ZSB9XG4gICAgICAgIH0pO1xuXG4gICAgICAvLyBTdGVwIDE6IENyZWF0ZSBmaXQgYW5kIHNob3cgc2NvcmVcbiAgICAgIGNvbnN0IGNyZWF0ZUV2ZW50ID0ge1xuICAgICAgICBpbmZvOiB7IGZpZWxkTmFtZTogJ2NyZWF0ZUZpdFNob3dTY29yZScgfSxcbiAgICAgICAgYXJndW1lbnRzOiB7IGlucHV0OiBtb2NrRml0U2hvd1Njb3JlSW5wdXQgfSxcbiAgICAgICAgaWRlbnRpdHk6IHsgc3ViOiAnanVkZ2UtMTIzJyB9XG4gICAgICB9O1xuXG4gICAgICBjb25zdCBjcmVhdGVkU2NvcmUgPSBhd2FpdCBmaXRTaG93U2NvcmVSZXNvbHZlcihjcmVhdGVFdmVudCBhcyBhbnkpO1xuICAgICAgXG4gICAgICBleHBlY3QoY3JlYXRlZFNjb3JlKS50b01hdGNoT2JqZWN0KHtcbiAgICAgICAgY2F0SWQ6ICdjYXQtMTIzJyxcbiAgICAgICAgcGFydGljaXBhbnROYW1lOiAnSm9obiBEb2UnLFxuICAgICAgICB0b3RhbFNjb3JlOiA4NVxuICAgICAgfSk7XG5cbiAgICAgIC8vIFZlcmlmeSBEeW5hbW9EQiBvcGVyYXRpb25zXG4gICAgICBleHBlY3QobW9ja0RvY0NsaWVudC5zZW5kKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcbiAgICAgICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgICAgIGlucHV0OiBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICAgICAgICBUYWJsZU5hbWU6ICd0ZXN0LXRhYmxlJyxcbiAgICAgICAgICAgIEl0ZW06IGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgICAgICAgICAgUEs6IGV4cGVjdC5zdHJpbmdDb250YWluaW5nKCdGSVRfU0hPV19TQ09SRSMnKSxcbiAgICAgICAgICAgICAgU0s6ICdNRVRBREFUQSdcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgICk7XG5cbiAgICAgIC8vIFN0ZXAgMjogVXBkYXRlIGZpdCBhbmQgc2hvdyBzY29yZVxuICAgICAgY29uc3QgdXBkYXRlRXZlbnQgPSB7XG4gICAgICAgIGluZm86IHsgZmllbGROYW1lOiAndXBkYXRlRml0U2hvd1Njb3JlJyB9LFxuICAgICAgICBhcmd1bWVudHM6IHsgXG4gICAgICAgICAgaW5wdXQ6IHsgXG4gICAgICAgICAgICBpZDogJ3Njb3JlLTEyMycsXG4gICAgICAgICAgICAuLi5tb2NrRml0U2hvd1Njb3JlSW5wdXQsXG4gICAgICAgICAgICBhdHRpcmU6IDksIC8vIFVwZGF0ZWQgc2NvcmVcbiAgICAgICAgICAgIGlzRmluYWxpemVkOiB0cnVlXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBpZGVudGl0eTogeyBzdWI6ICdqdWRnZS0xMjMnIH1cbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IHVwZGF0ZWRTY29yZSA9IGF3YWl0IGZpdFNob3dTY29yZVJlc29sdmVyKHVwZGF0ZUV2ZW50IGFzIGFueSk7XG4gICAgICBcbiAgICAgIGV4cGVjdCh1cGRhdGVkU2NvcmUpLnRvTWF0Y2hPYmplY3Qoe1xuICAgICAgICB0b3RhbFNjb3JlOiA4OCxcbiAgICAgICAgaXNGaW5hbGl6ZWQ6IHRydWVcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIGhhbmRsZSBjb25jdXJyZW50IHNjb3JpbmcgYnkgbXVsdGlwbGUganVkZ2VzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QganVkZ2UxU2NvcmUgPSB7IC4uLm1vY2tGaXRTaG93U2NvcmVJbnB1dCwganVkZ2VJZDogJ2p1ZGdlLTEnLCBqdWRnZU5hbWU6ICdKdWRnZSBPbmUnIH07XG4gICAgICBjb25zdCBqdWRnZTJTY29yZSA9IHsgLi4ubW9ja0ZpdFNob3dTY29yZUlucHV0LCBqdWRnZUlkOiAnanVkZ2UtMicsIGp1ZGdlTmFtZTogJ0p1ZGdlIFR3bycgfTtcbiAgICAgIGNvbnN0IGp1ZGdlM1Njb3JlID0geyAuLi5tb2NrRml0U2hvd1Njb3JlSW5wdXQsIGp1ZGdlSWQ6ICdqdWRnZS0zJywganVkZ2VOYW1lOiAnSnVkZ2UgVGhyZWUnIH07XG5cbiAgICAgIC8vIE1vY2sgcmVzcG9uc2VzIGZvciBjb25jdXJyZW50IHNjb3JpbmdcbiAgICAgIG1vY2tEb2NDbGllbnQuc2VuZFxuICAgICAgICAubW9ja1Jlc29sdmVkVmFsdWUoeyBJdGVtczogW10gfSkgLy8gTm8gZXhpc3Rpbmcgc2NvcmVzXG4gICAgICAgIC5tb2NrUmVzb2x2ZWRWYWx1ZSh7fSkgLy8gQ3JlYXRlIG9wZXJhdGlvbnNcbiAgICAgICAgLm1vY2tSZXNvbHZlZFZhbHVlKHt9KSBcbiAgICAgICAgLm1vY2tSZXNvbHZlZFZhbHVlKHt9KTtcblxuICAgICAgLy8gU2ltdWxhdGUgY29uY3VycmVudCBzY29yZSBjcmVhdGlvblxuICAgICAgY29uc3QgY3JlYXRlUHJvbWlzZXMgPSBbanVkZ2UxU2NvcmUsIGp1ZGdlMlNjb3JlLCBqdWRnZTNTY29yZV0ubWFwKGFzeW5jIChzY29yZUlucHV0LCBpbmRleCkgPT4ge1xuICAgICAgICBjb25zdCBldmVudCA9IHtcbiAgICAgICAgICBpbmZvOiB7IGZpZWxkTmFtZTogJ2NyZWF0ZUZpdFNob3dTY29yZScgfSxcbiAgICAgICAgICBhcmd1bWVudHM6IHsgaW5wdXQ6IHNjb3JlSW5wdXQgfSxcbiAgICAgICAgICBpZGVudGl0eTogeyBzdWI6IHNjb3JlSW5wdXQuanVkZ2VJZCB9XG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIGZpdFNob3dTY29yZVJlc29sdmVyKGV2ZW50IGFzIGFueSk7XG4gICAgICB9KTtcblxuICAgICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IFByb21pc2UuYWxsKGNyZWF0ZVByb21pc2VzKTtcblxuICAgICAgLy8gVmVyaWZ5IGFsbCBzY29yZXMgd2VyZSBjcmVhdGVkXG4gICAgICBleHBlY3QocmVzdWx0cykudG9IYXZlTGVuZ3RoKDMpO1xuICAgICAgcmVzdWx0cy5mb3JFYWNoKChyZXN1bHQsIGluZGV4KSA9PiB7XG4gICAgICAgIGV4cGVjdChyZXN1bHQuanVkZ2VJZCkudG9CZShganVkZ2UtJHtpbmRleCArIDF9YCk7XG4gICAgICB9KTtcblxuICAgICAgLy8gVmVyaWZ5IER5bmFtb0RCIHdhcyBjYWxsZWQgZm9yIGVhY2ggc2NvcmVcbiAgICAgIGV4cGVjdChtb2NrRG9jQ2xpZW50LnNlbmQpLnRvSGF2ZUJlZW5DYWxsZWRUaW1lcyg5KTsgLy8gMyBjaGVja3MgKyA2IGNyZWF0ZXMgKG1haW4gKyBpbmRleGVzKVxuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIHByZXZlbnQgZHVwbGljYXRlIHNjb3JpbmcgYnkgc2FtZSBqdWRnZScsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGV4aXN0aW5nU2NvcmUgPSB7IC4uLm1vY2tGaXRTaG93U2NvcmUsIGp1ZGdlSWQ6ICdqdWRnZS0xMjMnIH07XG5cbiAgICAgIC8vIE1vY2sgZXhpc3Rpbmcgc2NvcmUgZm91bmRcbiAgICAgIG1vY2tEb2NDbGllbnQuc2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UoeyBcbiAgICAgICAgSXRlbXM6IFtleGlzdGluZ1Njb3JlXSBcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBjcmVhdGVFdmVudCA9IHtcbiAgICAgICAgaW5mbzogeyBmaWVsZE5hbWU6ICdjcmVhdGVGaXRTaG93U2NvcmUnIH0sXG4gICAgICAgIGFyZ3VtZW50czogeyBpbnB1dDogbW9ja0ZpdFNob3dTY29yZUlucHV0IH0sXG4gICAgICAgIGlkZW50aXR5OiB7IHN1YjogJ2p1ZGdlLTEyMycgfVxuICAgICAgfTtcblxuICAgICAgYXdhaXQgZXhwZWN0KGZpdFNob3dTY29yZVJlc29sdmVyKGNyZWF0ZUV2ZW50IGFzIGFueSkpXG4gICAgICAgIC5yZWplY3RzXG4gICAgICAgIC50b1Rocm93KCdKdWRnZSBoYXMgYWxyZWFkeSBzY29yZWQgdGhpcyBwYXJ0aWNpcGFudCcpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnU2NvcmUgQ2FsY3VsYXRpb24gSW50ZWdyYXRpb24nLCAoKSA9PiB7XG4gICAgdGVzdCgnc2hvdWxkIGNvcnJlY3RseSBjYWxjdWxhdGUgYWxsIGNhdGVnb3J5IHRvdGFscyBhbmQgb3ZlcmFsbCBzY29yZScsIGFzeW5jICgpID0+IHtcbiAgICAgIG1vY2tEb2NDbGllbnQuc2VuZFxuICAgICAgICAubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHsgSXRlbXM6IFtdIH0pXG4gICAgICAgIC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe30pXG4gICAgICAgIC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe30pXG4gICAgICAgIC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe30pXG4gICAgICAgIC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UoeyBJdGVtOiBtb2NrRml0U2hvd1Njb3JlIH0pO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBkYXRhQWNjZXNzLmNyZWF0ZUZpdFNob3dTY29yZShtb2NrRml0U2hvd1Njb3JlSW5wdXQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0KS50b01hdGNoT2JqZWN0KHtcbiAgICAgICAgYXBwZWFyYW5jZVRvdGFsOiAxNywgLy8gOCArIDQgKyA1XG4gICAgICAgIGhhbmRsaW5nVG90YWw6IDEwLCAgIC8vIDcgKyAzXG4gICAgICAgIGRlbW9uc3RyYXRpb25Ub3RhbDogMTQsIC8vIDMgKyA0ICsgMyArIDRcbiAgICAgICAgaGVhbHRoRXhhbWluYXRpb25Ub3RhbDogMTksIC8vIDIrMisyKzIrMisyKzIrMis1XG4gICAgICAgIGdyb29taW5nQ2FyZVRvdGFsOiAxMywgLy8gMyArIDcgKyAzXG4gICAgICAgIGtub3dsZWRnZVRvdGFsOiAxMiwgICAgLy8gMyArIDMgKyAzICsgM1xuICAgICAgICB0b3RhbFNjb3JlOiA4NSAgICAgICAgIC8vIFN1bSBvZiBhbGwgY2F0ZWdvcmllc1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgaGFuZGxlIG1heGltdW0gcG9zc2libGUgc2NvcmVzIGNvcnJlY3RseScsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IG1heFNjb3JlSW5wdXQgPSB7XG4gICAgICAgIC4uLm1vY2tGaXRTaG93U2NvcmVJbnB1dCxcbiAgICAgICAgLy8gQXBwZWFyYW5jZSAmIERlbWVhbm9yICgyMCBwb2ludHMgbWF4KVxuICAgICAgICBhdHRpcmU6IDEwLFxuICAgICAgICBhdHRlbnRpdmU6IDUsXG4gICAgICAgIGNvdXJ0ZW91czogNSxcbiAgICAgICAgLy8gSGFuZGxpbmcgJiBDb250cm9sICgxNCBwb2ludHMgbWF4KVxuICAgICAgICBjb250cm9sRXF1aXBtZW50OiAxMCxcbiAgICAgICAgcGlja3VwQ2Fycnlpbmc6IDQsXG4gICAgICAgIC8vIERlbW9uc3RyYXRpb24gU2tpbGxzICgxNiBwb2ludHMgbWF4KVxuICAgICAgICBzaG93aW5nSGVhZFNoYXBlOiA0LFxuICAgICAgICBzaG93aW5nQm9keVR5cGU6IDQsXG4gICAgICAgIHNob3dpbmdUYWlsOiA0LFxuICAgICAgICBzaG93aW5nQ29hdFRleHR1cmU6IDQsXG4gICAgICAgIC8vIEhlYWx0aCBFeGFtaW5hdGlvbiAoMjEgcG9pbnRzIG1heClcbiAgICAgICAgc2hvd2luZ01vdXRoVGVldGhHdW1zOiAzLFxuICAgICAgICBjb25kaXRpb25Nb3V0aFRlZXRoR3VtczogMixcbiAgICAgICAgc2hvd2luZ05vc2U6IDIsXG4gICAgICAgIHNob3dpbmdFeWVzOiAyLFxuICAgICAgICBjb25kaXRpb25Ob3NlRXllczogMixcbiAgICAgICAgc2hvd2luZ0VhcnM6IDIsXG4gICAgICAgIGVhcnNDbGVhbjogMixcbiAgICAgICAgc2hvd2luZ1RvZW5haWxzQ2xhd3M6IDMsXG4gICAgICAgIHRvZW5haWxzQ2xpcHBlZDogNixcbiAgICAgICAgLy8gR3Jvb21pbmcgJiBDYXJlICgxNCBwb2ludHMgbWF4KVxuICAgICAgICBzaG93aW5nQmVsbHlDb2F0Q2xlYW5saW5lc3M6IDMsXG4gICAgICAgIGNvYXRDbGVhbldlbGxHcm9vbWVkOiA4LFxuICAgICAgICBjYXRIZWFsdGhDYXJlOiAzLFxuICAgICAgICAvLyBLbm93bGVkZ2UgKDEyIHBvaW50cyBtYXgpXG4gICAgICAgIGdlbmVyYWxLbm93bGVkZ2U6IDMsXG4gICAgICAgIGNhdEJyZWVkc1Nob3dpbmc6IDMsXG4gICAgICAgIGNhdEFuYXRvbXk6IDMsXG4gICAgICAgIGZvdXJIS25vd2xlZGdlOiAzXG4gICAgICB9O1xuXG4gICAgICBtb2NrRG9jQ2xpZW50LnNlbmRcbiAgICAgICAgLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7IEl0ZW1zOiBbXSB9KVxuICAgICAgICAubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHt9KVxuICAgICAgICAubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHt9KVxuICAgICAgICAubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHt9KVxuICAgICAgICAubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHsgXG4gICAgICAgICAgSXRlbTogeyBcbiAgICAgICAgICAgIC4uLm1heFNjb3JlSW5wdXQsXG4gICAgICAgICAgICBhcHBlYXJhbmNlVG90YWw6IDIwLFxuICAgICAgICAgICAgaGFuZGxpbmdUb3RhbDogMTQsXG4gICAgICAgICAgICBkZW1vbnN0cmF0aW9uVG90YWw6IDE2LFxuICAgICAgICAgICAgaGVhbHRoRXhhbWluYXRpb25Ub3RhbDogMjEsXG4gICAgICAgICAgICBncm9vbWluZ0NhcmVUb3RhbDogMTQsXG4gICAgICAgICAgICBrbm93bGVkZ2VUb3RhbDogMTIsXG4gICAgICAgICAgICB0b3RhbFNjb3JlOiA5NyAvLyBNYXhpbXVtIHBvc3NpYmxlOiAyMCsxNCsxNisyMSsxNCsxMiA9IDk3XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZGF0YUFjY2Vzcy5jcmVhdGVGaXRTaG93U2NvcmUobWF4U2NvcmVJbnB1dCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQudG90YWxTY29yZSkudG9CZSg5Nyk7XG4gICAgICBleHBlY3QocmVzdWx0LmFwcGVhcmFuY2VUb3RhbCkudG9CZSgyMCk7XG4gICAgICBleHBlY3QocmVzdWx0LmhhbmRsaW5nVG90YWwpLnRvQmUoMTQpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5kZW1vbnN0cmF0aW9uVG90YWwpLnRvQmUoMTYpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5oZWFsdGhFeGFtaW5hdGlvblRvdGFsKS50b0JlKDIxKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuZ3Jvb21pbmdDYXJlVG90YWwpLnRvQmUoMTQpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5rbm93bGVkZ2VUb3RhbCkudG9CZSgxMik7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdEYXRhIEFjY2VzcyBQYXR0ZXJuIEludGVncmF0aW9uJywgKCkgPT4ge1xuICAgIHRlc3QoJ3Nob3VsZCBzdXBwb3J0IGFsbCByZXF1aXJlZCBhY2Nlc3MgcGF0dGVybnMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBzY29yZXMgPSBbXG4gICAgICAgIHsgLi4ubW9ja0ZpdFNob3dTY29yZSwgaWQ6ICdzY29yZS0xJywganVkZ2VJZDogJ2p1ZGdlLTEnIH0sXG4gICAgICAgIHsgLi4ubW9ja0ZpdFNob3dTY29yZSwgaWQ6ICdzY29yZS0yJywganVkZ2VJZDogJ2p1ZGdlLTInIH0sXG4gICAgICAgIHsgLi4ubW9ja0ZpdFNob3dTY29yZSwgaWQ6ICdzY29yZS0zJywganVkZ2VJZDogJ2p1ZGdlLTEnLCBjYXRJZDogJ2NhdC00NTYnIH1cbiAgICAgIF07XG5cbiAgICAgIC8vIFRlc3Q6IEdldCBmaXQgYW5kIHNob3cgc2NvcmUgYnkgSURcbiAgICAgIG1vY2tEb2NDbGllbnQuc2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UoeyBJdGVtOiBzY29yZXNbMF0gfSk7XG4gICAgICBcbiAgICAgIGNvbnN0IHNjb3JlQnlJZCA9IGF3YWl0IGRhdGFBY2Nlc3MuZ2V0Rml0U2hvd1Njb3JlKCdzY29yZS0xJyk7XG4gICAgICBleHBlY3Qoc2NvcmVCeUlkKS50b01hdGNoT2JqZWN0KHNjb3Jlc1swXSk7XG5cbiAgICAgIC8vIFRlc3Q6IEdldCBmaXQgYW5kIHNob3cgc2NvcmVzIGJ5IGNhdFxuICAgICAgbW9ja0RvY0NsaWVudC5zZW5kLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7IEl0ZW1zOiBbc2NvcmVzWzBdLCBzY29yZXNbMV1dIH0pO1xuICAgICAgXG4gICAgICBjb25zdCBzY29yZXNCeUNhdCA9IGF3YWl0IGRhdGFBY2Nlc3MuZ2V0Rml0U2hvd1Njb3Jlc0J5Q2F0KCdjYXQtMTIzJyk7XG4gICAgICBleHBlY3Qoc2NvcmVzQnlDYXQpLnRvSGF2ZUxlbmd0aCgyKTtcblxuICAgICAgLy8gVGVzdDogR2V0IGZpdCBhbmQgc2hvdyBzY29yZXMgYnkganVkZ2VcbiAgICAgIG1vY2tEb2NDbGllbnQuc2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UoeyBJdGVtczogW3Njb3Jlc1swXSwgc2NvcmVzWzJdXSB9KTtcbiAgICAgIFxuICAgICAgY29uc3Qgc2NvcmVzQnlKdWRnZSA9IGF3YWl0IGRhdGFBY2Nlc3MuZ2V0Rml0U2hvd1Njb3Jlc0J5SnVkZ2UoJ2p1ZGdlLTEnKTtcbiAgICAgIGV4cGVjdChzY29yZXNCeUp1ZGdlKS50b0hhdmVMZW5ndGgoMik7XG5cbiAgICAgIC8vIFRlc3Q6IExpc3QgYWxsIGZpdCBhbmQgc2hvdyBzY29yZXNcbiAgICAgIG1vY2tEb2NDbGllbnQuc2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UoeyBJdGVtczogc2NvcmVzIH0pO1xuICAgICAgXG4gICAgICBjb25zdCBhbGxTY29yZXMgPSBhd2FpdCBkYXRhQWNjZXNzLmxpc3RGaXRTaG93U2NvcmVzKCk7XG4gICAgICBleHBlY3QoYWxsU2NvcmVzLml0ZW1zKS50b0hhdmVMZW5ndGgoMyk7XG5cbiAgICAgIC8vIFZlcmlmeSBjb3JyZWN0IER5bmFtb0RCIHF1ZXJpZXMgd2VyZSBtYWRlXG4gICAgICBleHBlY3QobW9ja0RvY0NsaWVudC5zZW5kKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcbiAgICAgICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgICAgIGlucHV0OiBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICAgICAgICBUYWJsZU5hbWU6ICd0ZXN0LXRhYmxlJyxcbiAgICAgICAgICAgIEtleTogeyBQSzogJ0ZJVF9TSE9XX1NDT1JFI3Njb3JlLTEnLCBTSzogJ01FVEFEQVRBJyB9XG4gICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgICk7XG5cbiAgICAgIGV4cGVjdChtb2NrRG9jQ2xpZW50LnNlbmQpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxuICAgICAgICBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICAgICAgaW5wdXQ6IGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgICAgICAgIFRhYmxlTmFtZTogJ3Rlc3QtdGFibGUnLFxuICAgICAgICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjogJ1BLID0gOnBrIEFORCBiZWdpbnNfd2l0aChTSywgOnNrKScsXG4gICAgICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XG4gICAgICAgICAgICAgICc6cGsnOiAnQ0FUI2NhdC0xMjMnLFxuICAgICAgICAgICAgICAnOnNrJzogJ0ZJVF9TSE9XX1NDT1JFIydcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCBoYW5kbGUgcGFnaW5hdGlvbiBjb3JyZWN0bHknLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBzY29yZXMgPSBBcnJheS5mcm9tKHsgbGVuZ3RoOiAyNSB9LCAoXywgaSkgPT4gKHtcbiAgICAgICAgLi4ubW9ja0ZpdFNob3dTY29yZSxcbiAgICAgICAgaWQ6IGBzY29yZS0ke2l9YCxcbiAgICAgICAgcGFydGljaXBhbnROYW1lOiBgUGFydGljaXBhbnQgJHtpfWBcbiAgICAgIH0pKTtcblxuICAgICAgLy8gRmlyc3QgcGFnZVxuICAgICAgbW9ja0RvY0NsaWVudC5zZW5kLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7XG4gICAgICAgIEl0ZW1zOiBzY29yZXMuc2xpY2UoMCwgMTApLFxuICAgICAgICBMYXN0RXZhbHVhdGVkS2V5OiB7IFBLOiAnRklUX1NIT1dfU0NPUkUjc2NvcmUtOScsIFNLOiAnTUVUQURBVEEnIH1cbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBmaXJzdFBhZ2UgPSBhd2FpdCBkYXRhQWNjZXNzLmxpc3RGaXRTaG93U2NvcmVzKHsgbGltaXQ6IDEwIH0pO1xuICAgICAgXG4gICAgICBleHBlY3QoZmlyc3RQYWdlLml0ZW1zKS50b0hhdmVMZW5ndGgoMTApO1xuICAgICAgZXhwZWN0KGZpcnN0UGFnZS5uZXh0VG9rZW4pLnRvQmVEZWZpbmVkKCk7XG5cbiAgICAgIC8vIFNlY29uZCBwYWdlXG4gICAgICBtb2NrRG9jQ2xpZW50LnNlbmQubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHtcbiAgICAgICAgSXRlbXM6IHNjb3Jlcy5zbGljZSgxMCwgMjApLFxuICAgICAgICBMYXN0RXZhbHVhdGVkS2V5OiB7IFBLOiAnRklUX1NIT1dfU0NPUkUjc2NvcmUtMTknLCBTSzogJ01FVEFEQVRBJyB9XG4gICAgICB9KTtcblxuICAgICAgY29uc3Qgc2Vjb25kUGFnZSA9IGF3YWl0IGRhdGFBY2Nlc3MubGlzdEZpdFNob3dTY29yZXMoeyBcbiAgICAgICAgbGltaXQ6IDEwLCBcbiAgICAgICAgbmV4dFRva2VuOiBmaXJzdFBhZ2UubmV4dFRva2VuIFxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGV4cGVjdChzZWNvbmRQYWdlLml0ZW1zKS50b0hhdmVMZW5ndGgoMTApO1xuICAgICAgZXhwZWN0KHNlY29uZFBhZ2UuaXRlbXNbMF0ucGFydGljaXBhbnROYW1lKS50b0JlKCdQYXJ0aWNpcGFudCAxMCcpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnQXVkaXQgVHJhaWwgSW50ZWdyYXRpb24nLCAoKSA9PiB7XG4gICAgdGVzdCgnc2hvdWxkIGNyZWF0ZSBhdWRpdCByZWNvcmRzIGZvciBhbGwgb3BlcmF0aW9ucycsIGFzeW5jICgpID0+IHtcbiAgICAgIG1vY2tEb2NDbGllbnQuc2VuZFxuICAgICAgICAubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHsgSXRlbXM6IFtdIH0pXG4gICAgICAgIC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe30pIC8vIENyZWF0ZSBzY29yZVxuICAgICAgICAubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHt9KSAvLyBDcmVhdGUgY2F0IGluZGV4XG4gICAgICAgIC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe30pIC8vIENyZWF0ZSBqdWRnZSBpbmRleFxuICAgICAgICAubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHt9KSAvLyBDcmVhdGUgYXVkaXQgcmVjb3JkXG4gICAgICAgIC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UoeyBJdGVtOiBtb2NrRml0U2hvd1Njb3JlIH0pO1xuXG4gICAgICBhd2FpdCBkYXRhQWNjZXNzLmNyZWF0ZUZpdFNob3dTY29yZShtb2NrRml0U2hvd1Njb3JlSW5wdXQpO1xuXG4gICAgICAvLyBWZXJpZnkgYXVkaXQgcmVjb3JkIHdhcyBjcmVhdGVkXG4gICAgICBleHBlY3QobW9ja0RvY0NsaWVudC5zZW5kKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcbiAgICAgICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgICAgIGlucHV0OiBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICAgICAgICBUYWJsZU5hbWU6ICd0ZXN0LXRhYmxlJyxcbiAgICAgICAgICAgIEl0ZW06IGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgICAgICAgICAgUEs6IGV4cGVjdC5zdHJpbmdDb250YWluaW5nKCdGSVRfU0hPV19TQ09SRV9BVURJVCMnKSxcbiAgICAgICAgICAgICAgU0s6IGV4cGVjdC5zdHJpbmdDb250YWluaW5nKCdFTlRSWSMnKSxcbiAgICAgICAgICAgICAgYWN0aW9uOiAnQ1JFQVRFJ1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCB0cmFjayBzY29yZSBtb2RpZmljYXRpb25zIGluIGF1ZGl0IHRyYWlsJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3Qgb3JpZ2luYWxTY29yZSA9IG1vY2tGaXRTaG93U2NvcmU7XG4gICAgICBjb25zdCB1cGRhdGVkU2NvcmUgPSB7IC4uLm1vY2tGaXRTaG93U2NvcmUsIHRvdGFsU2NvcmU6IDg4LCBhdHRpcmU6IDkgfTtcblxuICAgICAgbW9ja0RvY0NsaWVudC5zZW5kXG4gICAgICAgIC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UoeyBJdGVtOiBvcmlnaW5hbFNjb3JlIH0pIC8vIEdldCBvcmlnaW5hbFxuICAgICAgICAubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHt9KSAvLyBVcGRhdGUgc2NvcmVcbiAgICAgICAgLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7fSkgLy8gQ3JlYXRlIGF1ZGl0IHJlY29yZFxuICAgICAgICAubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHsgSXRlbTogdXBkYXRlZFNjb3JlIH0pOyAvLyBHZXQgdXBkYXRlZFxuXG4gICAgICBhd2FpdCBkYXRhQWNjZXNzLnVwZGF0ZUZpdFNob3dTY29yZSgnc2NvcmUtMTIzJywgeyBhdHRpcmU6IDkgfSk7XG5cbiAgICAgIC8vIFZlcmlmeSBhdWRpdCByZWNvcmQgdHJhY2tzIGNoYW5nZXNcbiAgICAgIGV4cGVjdChtb2NrRG9jQ2xpZW50LnNlbmQpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxuICAgICAgICBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICAgICAgaW5wdXQ6IGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgICAgICAgIFRhYmxlTmFtZTogJ3Rlc3QtdGFibGUnLFxuICAgICAgICAgICAgSXRlbTogZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgICAgICAgICBhY3Rpb246ICdVUERBVEUnLFxuICAgICAgICAgICAgICBwcmV2aW91c1ZhbHVlczogZXhwZWN0LnN0cmluZ0NvbnRhaW5pbmcoJ1wiYXR0aXJlXCI6OCcpLFxuICAgICAgICAgICAgICBuZXdWYWx1ZXM6IGV4cGVjdC5zdHJpbmdDb250YWluaW5nKCdcImF0dGlyZVwiOjknKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ0Vycm9yIEhhbmRsaW5nIEludGVncmF0aW9uJywgKCkgPT4ge1xuICAgIHRlc3QoJ3Nob3VsZCBoYW5kbGUgRHluYW1vREIgZXJyb3JzIGdyYWNlZnVsbHknLCBhc3luYyAoKSA9PiB7XG4gICAgICBtb2NrRG9jQ2xpZW50LnNlbmQubW9ja1JlamVjdGVkVmFsdWUobmV3IEVycm9yKCdEeW5hbW9EQiBzZXJ2aWNlIGVycm9yJykpO1xuXG4gICAgICBhd2FpdCBleHBlY3QoZGF0YUFjY2Vzcy5jcmVhdGVGaXRTaG93U2NvcmUobW9ja0ZpdFNob3dTY29yZUlucHV0KSlcbiAgICAgICAgLnJlamVjdHNcbiAgICAgICAgLnRvVGhyb3coJ0R5bmFtb0RCIHNlcnZpY2UgZXJyb3InKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCBoYW5kbGUgY29uZGl0aW9uYWwgY2hlY2sgZmFpbHVyZXMgZm9yIGNvbmN1cnJlbnQgdXBkYXRlcycsIGFzeW5jICgpID0+IHtcbiAgICAgIG1vY2tEb2NDbGllbnQuc2VuZFxuICAgICAgICAubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHsgSXRlbTogbW9ja0ZpdFNob3dTY29yZSB9KVxuICAgICAgICAubW9ja1JlamVjdGVkVmFsdWVPbmNlKHtcbiAgICAgICAgICBuYW1lOiAnQ29uZGl0aW9uYWxDaGVja0ZhaWxlZEV4Y2VwdGlvbicsXG4gICAgICAgICAgbWVzc2FnZTogJ1RoZSBjb25kaXRpb25hbCByZXF1ZXN0IGZhaWxlZCdcbiAgICAgICAgfSk7XG5cbiAgICAgIGF3YWl0IGV4cGVjdChkYXRhQWNjZXNzLnVwZGF0ZUZpdFNob3dTY29yZSgnc2NvcmUtMTIzJywgeyBhdHRpcmU6IDkgfSkpXG4gICAgICAgIC5yZWplY3RzXG4gICAgICAgIC50b1Rocm93KCdTY29yZSB3YXMgbW9kaWZpZWQgYnkgYW5vdGhlciB1c2VyJyk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgdmFsaWRhdGUgc2NvcmUgcmFuZ2VzIGJlZm9yZSBkYXRhYmFzZSBvcGVyYXRpb25zJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgaW52YWxpZFNjb3JlSW5wdXQgPSB7XG4gICAgICAgIC4uLm1vY2tGaXRTaG93U2NvcmVJbnB1dCxcbiAgICAgICAgYXR0aXJlOiAxNSAvLyBJbnZhbGlkOiBtYXggaXMgMTBcbiAgICAgIH07XG5cbiAgICAgIGF3YWl0IGV4cGVjdChkYXRhQWNjZXNzLmNyZWF0ZUZpdFNob3dTY29yZShpbnZhbGlkU2NvcmVJbnB1dCkpXG4gICAgICAgIC5yZWplY3RzXG4gICAgICAgIC50b1Rocm93KCdTY29yZSBtdXN0IGJlIGJldHdlZW4gMSBhbmQgMTAnKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ1BlcmZvcm1hbmNlIEludGVncmF0aW9uJywgKCkgPT4ge1xuICAgIHRlc3QoJ3Nob3VsZCBoYW5kbGUgYmF0Y2ggb3BlcmF0aW9ucyBlZmZpY2llbnRseScsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGJhdGNoU2l6ZSA9IDI1O1xuICAgICAgY29uc3Qgc2NvcmVzID0gQXJyYXkuZnJvbSh7IGxlbmd0aDogYmF0Y2hTaXplIH0sIChfLCBpKSA9PiAoe1xuICAgICAgICAuLi5tb2NrRml0U2hvd1Njb3JlLFxuICAgICAgICBpZDogYHNjb3JlLSR7aX1gLFxuICAgICAgICBwYXJ0aWNpcGFudE5hbWU6IGBQYXJ0aWNpcGFudCAke2l9YFxuICAgICAgfSkpO1xuXG4gICAgICBtb2NrRG9jQ2xpZW50LnNlbmQubW9ja1Jlc29sdmVkVmFsdWUoeyBJdGVtczogc2NvcmVzIH0pO1xuXG4gICAgICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZGF0YUFjY2Vzcy5saXN0Rml0U2hvd1Njb3Jlcyh7IGxpbWl0OiBiYXRjaFNpemUgfSk7XG4gICAgICBjb25zdCBlbmRUaW1lID0gRGF0ZS5ub3coKTtcblxuICAgICAgZXhwZWN0KHJlc3VsdC5pdGVtcykudG9IYXZlTGVuZ3RoKGJhdGNoU2l6ZSk7XG4gICAgICBleHBlY3QoZW5kVGltZSAtIHN0YXJ0VGltZSkudG9CZUxlc3NUaGFuKDEwMDApOyAvLyBTaG91bGQgY29tcGxldGUgaW4gdW5kZXIgMSBzZWNvbmRcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCBvcHRpbWl6ZSBxdWVyaWVzIGZvciBjb21tb24gYWNjZXNzIHBhdHRlcm5zJywgYXN5bmMgKCkgPT4ge1xuICAgICAgLy8gVGVzdCBvcHRpbWl6ZWQgcXVlcnkgZm9yIGdldHRpbmcgc2NvcmVzIGJ5IGNhdFxuICAgICAgbW9ja0RvY0NsaWVudC5zZW5kLm1vY2tSZXNvbHZlZFZhbHVlKHsgSXRlbXM6IFttb2NrRml0U2hvd1Njb3JlXSB9KTtcblxuICAgICAgYXdhaXQgZGF0YUFjY2Vzcy5nZXRGaXRTaG93U2NvcmVzQnlDYXQoJ2NhdC0xMjMnKTtcblxuICAgICAgLy8gVmVyaWZ5IGVmZmljaWVudCBxdWVyeSBzdHJ1Y3R1cmVcbiAgICAgIGV4cGVjdChtb2NrRG9jQ2xpZW50LnNlbmQpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxuICAgICAgICBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICAgICAgaW5wdXQ6IGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgICAgICAgIEtleUNvbmRpdGlvbkV4cHJlc3Npb246ICdQSyA9IDpwayBBTkQgYmVnaW5zX3dpdGgoU0ssIDpzayknLFxuICAgICAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xuICAgICAgICAgICAgICAnOnBrJzogJ0NBVCNjYXQtMTIzJyxcbiAgICAgICAgICAgICAgJzpzayc6ICdGSVRfU0hPV19TQ09SRSMnXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfSk7XG4gIH0pO1xufSk7Il19