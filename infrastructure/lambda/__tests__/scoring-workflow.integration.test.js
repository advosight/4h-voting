"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const aws_sdk_client_mock_1 = require("aws-sdk-client-mock");
const scoreResolver_1 = require("../scoreResolver");
// Mock DynamoDB
const ddbMock = (0, aws_sdk_client_mock_1.mockClient)(lib_dynamodb_1.DynamoDBDocumentClient);
// Mock environment variables
process.env.TABLE_NAME = 'test-table';
process.env.AWS_REGION = 'us-east-1';
// Mock data
const mockCat = {
    id: 'cat-1',
    name: 'Fluffy',
    owner: 'John Doe',
    cageNumber: 1,
    votes: 0,
};
const mockJudge1 = {
    id: 'judge-1',
    username: 'judge1@example.com',
    name: 'Judge Smith',
    role: 'judge',
};
const mockJudge2 = {
    id: 'judge-2',
    username: 'judge2@example.com',
    name: 'Judge Johnson',
    role: 'judge',
};
const mockAdmin = {
    id: 'admin-1',
    username: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
};
const mockScore1 = {
    id: 'score-1',
    catId: 'cat-1',
    judgeId: 'judge-1',
    judgeName: 'Judge Smith',
    cageConditionScore: 20,
    cageConditionComments: 'Clean and organized',
    catConditionScore: 22,
    catConditionComments: 'Healthy and alert',
    groomingScore: 18,
    groomingComments: 'Well groomed',
    overallScore: 21,
    overallComments: 'Excellent presentation',
    totalScore: 81,
    timestamp: '2024-01-15T10:00:00Z',
    isFinalized: false,
};
const mockScore2 = {
    id: 'score-2',
    catId: 'cat-1',
    judgeId: 'judge-2',
    judgeName: 'Judge Johnson',
    cageConditionScore: 23,
    cageConditionComments: 'Exceptional cage setup',
    catConditionScore: 20,
    catConditionComments: 'Good condition',
    groomingScore: 24,
    groomingComments: 'Outstanding grooming',
    overallScore: 19,
    overallComments: 'Very good overall',
    totalScore: 86,
    timestamp: '2024-01-15T11:00:00Z',
    isFinalized: false,
};
describe('Scoring Workflow Backend Integration Tests', () => {
    beforeEach(() => {
        ddbMock.reset();
    });
    describe('Complete Judge Scoring Process', () => {
        it('should handle end-to-end scoring workflow', async () => {
            // Mock cat lookup
            ddbMock.on(lib_dynamodb_1.GetCommand, {
                TableName: 'test-table',
                Key: { PK: 'CAT#cat-1', SK: 'METADATA' },
            }).resolves({
                Item: {
                    PK: 'CAT#cat-1',
                    SK: 'METADATA',
                    ...mockCat,
                },
            });
            // Mock existing scores check
            ddbMock.on(lib_dynamodb_1.QueryCommand, {
                TableName: 'test-table',
                KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
                ExpressionAttributeValues: {
                    ':pk': 'CAT#cat-1',
                    ':sk': 'SCORE#',
                },
            }).resolves({
                Items: [],
            });
            // Mock score creation
            ddbMock.on(lib_dynamodb_1.PutCommand).resolves({});
            const createScoreEvent = {
                info: {
                    fieldName: 'createScore',
                },
                arguments: {
                    input: {
                        catId: 'cat-1',
                        cageConditionScore: 20,
                        cageConditionComments: 'Clean and organized',
                        catConditionScore: 22,
                        catConditionComments: 'Healthy and alert',
                        groomingScore: 18,
                        groomingComments: 'Well groomed',
                        overallScore: 21,
                        overallComments: 'Excellent presentation',
                        isFinalized: false,
                    },
                },
                identity: {
                    sub: 'judge-1',
                    'custom:role': 'judge',
                    'custom:name': 'Judge Smith',
                },
            };
            const result = await (0, scoreResolver_1.handler)(createScoreEvent);
            expect(result).toMatchObject({
                id: expect.any(String),
                catId: 'cat-1',
                judgeId: 'judge-1',
                judgeName: 'Judge Smith',
                totalScore: 81,
                isFinalized: false,
            });
            // Verify DynamoDB operations
            expect(ddbMock.commandCalls(lib_dynamodb_1.PutCommand)).toHaveLength(3); // Main record + 2 indexes
        });
        it('should prevent duplicate scoring by same judge', async () => {
            // Mock existing score by same judge
            ddbMock.on(lib_dynamodb_1.QueryCommand, {
                TableName: 'test-table',
                KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
                ExpressionAttributeValues: {
                    ':pk': 'CAT#cat-1',
                    ':sk': 'SCORE#',
                },
            }).resolves({
                Items: [
                    {
                        PK: 'CAT#cat-1',
                        SK: 'SCORE#score-1',
                        judgeId: 'judge-1',
                        ...mockScore1,
                    },
                ],
            });
            const createScoreEvent = {
                info: {
                    fieldName: 'createScore',
                },
                arguments: {
                    input: {
                        catId: 'cat-1',
                        cageConditionScore: 25,
                        cageConditionComments: 'Updated score',
                        catConditionScore: 25,
                        catConditionComments: 'Updated',
                        groomingScore: 25,
                        groomingComments: 'Updated',
                        overallScore: 25,
                        overallComments: 'Updated',
                        isFinalized: false,
                    },
                },
                identity: {
                    sub: 'judge-1',
                    'custom:role': 'judge',
                    'custom:name': 'Judge Smith',
                },
            };
            await expect((0, scoreResolver_1.handler)(createScoreEvent)).rejects.toThrow('You have already scored this cat');
        });
        it('should handle score updates with audit trail', async () => {
            // Mock existing score
            ddbMock.on(lib_dynamodb_1.GetCommand, {
                TableName: 'test-table',
                Key: { PK: 'SCORE#score-1', SK: 'METADATA' },
            }).resolves({
                Item: {
                    PK: 'SCORE#score-1',
                    SK: 'METADATA',
                    ...mockScore1,
                },
            });
            // Mock update operations
            ddbMock.on(lib_dynamodb_1.PutCommand).resolves({});
            const updateScoreEvent = {
                info: {
                    fieldName: 'updateScore',
                },
                arguments: {
                    id: 'score-1',
                    input: {
                        cageConditionScore: 25,
                        cageConditionComments: 'Updated to exceptional',
                    },
                },
                identity: {
                    sub: 'judge-1',
                    'custom:role': 'judge',
                    'custom:name': 'Judge Smith',
                },
            };
            const result = await (0, scoreResolver_1.handler)(updateScoreEvent);
            expect(result).toMatchObject({
                id: 'score-1',
                cageConditionScore: 25,
                cageConditionComments: 'Updated to exceptional',
                totalScore: 86, // Recalculated total
            });
            // Verify audit trail creation
            const auditCalls = ddbMock.commandCalls(lib_dynamodb_1.PutCommand).filter(call => call.args[0].input.Item.PK.startsWith('AUDIT#'));
            expect(auditCalls).toHaveLength(1);
        });
    });
    describe('Multi-Judge Scenarios', () => {
        it('should handle multiple judges scoring same cat', async () => {
            // Mock cat with existing scores
            ddbMock.on(lib_dynamodb_1.QueryCommand, {
                TableName: 'test-table',
                KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
                ExpressionAttributeValues: {
                    ':pk': 'CAT#cat-1',
                    ':sk': 'SCORE#',
                },
            }).resolves({
                Items: [
                    {
                        PK: 'CAT#cat-1',
                        SK: 'SCORE#score-1',
                        judgeId: 'judge-1',
                        ...mockScore1,
                    },
                ],
            });
            // Mock score creation for second judge
            ddbMock.on(lib_dynamodb_1.PutCommand).resolves({});
            const createScoreEvent = {
                info: {
                    fieldName: 'createScore',
                },
                arguments: {
                    input: {
                        catId: 'cat-1',
                        cageConditionScore: 23,
                        cageConditionComments: 'Exceptional cage setup',
                        catConditionScore: 20,
                        catConditionComments: 'Good condition',
                        groomingScore: 24,
                        groomingComments: 'Outstanding grooming',
                        overallScore: 19,
                        overallComments: 'Very good overall',
                        isFinalized: false,
                    },
                },
                identity: {
                    sub: 'judge-2',
                    'custom:role': 'judge',
                    'custom:name': 'Judge Johnson',
                },
            };
            const result = await (0, scoreResolver_1.handler)(createScoreEvent);
            expect(result).toMatchObject({
                catId: 'cat-1',
                judgeId: 'judge-2',
                judgeName: 'Judge Johnson',
                totalScore: 86,
            });
            // Should not throw duplicate error since different judge
            expect(ddbMock.commandCalls(lib_dynamodb_1.PutCommand)).toHaveLength(3);
        });
        it('should calculate average scores for multi-judge scenarios', async () => {
            // Mock multiple scores for same cat
            ddbMock.on(lib_dynamodb_1.QueryCommand, {
                TableName: 'test-table',
                KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
                ExpressionAttributeValues: {
                    ':pk': 'CAT#cat-1',
                    ':sk': 'SCORE#',
                },
            }).resolves({
                Items: [
                    {
                        PK: 'CAT#cat-1',
                        SK: 'SCORE#score-1',
                        ...mockScore1,
                    },
                    {
                        PK: 'CAT#cat-1',
                        SK: 'SCORE#score-2',
                        ...mockScore2,
                    },
                ],
            });
            const getScoresByCatEvent = {
                info: {
                    fieldName: 'getScoresByCat',
                },
                arguments: {
                    catId: 'cat-1',
                },
                identity: {
                    sub: 'admin-1',
                    'custom:role': 'admin',
                },
            };
            const result = await (0, scoreResolver_1.handler)(getScoresByCatEvent);
            expect(result.items).toHaveLength(2);
            expect(result.averageScore).toBe(83.5); // (81 + 86) / 2
            expect(result.items[0].totalScore).toBe(81);
            expect(result.items[1].totalScore).toBe(86);
        });
    });
    describe('Score Calculation and Validation', () => {
        it('should validate score ranges', async () => {
            const invalidScoreEvent = {
                info: {
                    fieldName: 'createScore',
                },
                arguments: {
                    input: {
                        catId: 'cat-1',
                        cageConditionScore: 30, // Invalid: > 25
                        cageConditionComments: 'Test',
                        catConditionScore: -5, // Invalid: < 0
                        catConditionComments: 'Test',
                        groomingScore: 15,
                        groomingComments: 'Test',
                        overallScore: 20,
                        overallComments: 'Test',
                        isFinalized: false,
                    },
                },
                identity: {
                    sub: 'judge-1',
                    'custom:role': 'judge',
                    'custom:name': 'Judge Smith',
                },
            };
            await expect((0, scoreResolver_1.handler)(invalidScoreEvent)).rejects.toThrow('Score validation failed');
        });
        it('should calculate total scores correctly', async () => {
            ddbMock.on(lib_dynamodb_1.GetCommand).resolves({ Item: null });
            ddbMock.on(lib_dynamodb_1.QueryCommand).resolves({ Items: [] });
            ddbMock.on(lib_dynamodb_1.PutCommand).resolves({});
            const createScoreEvent = {
                info: {
                    fieldName: 'createScore',
                },
                arguments: {
                    input: {
                        catId: 'cat-1',
                        cageConditionScore: 25,
                        cageConditionComments: 'Perfect',
                        catConditionScore: 25,
                        catConditionComments: 'Perfect',
                        groomingScore: 25,
                        groomingComments: 'Perfect',
                        overallScore: 25,
                        overallComments: 'Perfect',
                        isFinalized: false,
                    },
                },
                identity: {
                    sub: 'judge-1',
                    'custom:role': 'judge',
                    'custom:name': 'Judge Smith',
                },
            };
            const result = await (0, scoreResolver_1.handler)(createScoreEvent);
            expect(result.totalScore).toBe(100);
            expect(result.cageConditionScore).toBe(25);
            expect(result.catConditionScore).toBe(25);
            expect(result.groomingScore).toBe(25);
            expect(result.overallScore).toBe(25);
        });
        it('should validate comment length limits', async () => {
            const longComment = 'x'.repeat(501); // Exceeds 500 char limit
            const invalidCommentEvent = {
                info: {
                    fieldName: 'createScore',
                },
                arguments: {
                    input: {
                        catId: 'cat-1',
                        cageConditionScore: 20,
                        cageConditionComments: longComment,
                        catConditionScore: 20,
                        catConditionComments: 'Valid comment',
                        groomingScore: 20,
                        groomingComments: 'Valid comment',
                        overallScore: 20,
                        overallComments: 'Valid comment',
                        isFinalized: false,
                    },
                },
                identity: {
                    sub: 'judge-1',
                    'custom:role': 'judge',
                    'custom:name': 'Judge Smith',
                },
            };
            await expect((0, scoreResolver_1.handler)(invalidCommentEvent)).rejects.toThrow('Comment exceeds maximum length');
        });
    });
    describe('Report Generation and Export', () => {
        it('should generate comprehensive scoring reports', async () => {
            // Mock all scores query
            ddbMock.on(lib_dynamodb_1.QueryCommand, {
                TableName: 'test-table',
                IndexName: 'GSI1',
                KeyConditionExpression: 'GSI1PK = :pk',
                ExpressionAttributeValues: {
                    ':pk': 'SCORE',
                },
            }).resolves({
                Items: [
                    {
                        PK: 'SCORE#score-1',
                        SK: 'METADATA',
                        GSI1PK: 'SCORE',
                        GSI1SK: 'TOTAL#081',
                        ...mockScore1,
                    },
                    {
                        PK: 'SCORE#score-2',
                        SK: 'METADATA',
                        GSI1PK: 'SCORE',
                        GSI1SK: 'TOTAL#086',
                        ...mockScore2,
                    },
                ],
            });
            const listAllScoresEvent = {
                info: {
                    fieldName: 'listAllScores',
                },
                arguments: {},
                identity: {
                    sub: 'admin-1',
                    'custom:role': 'admin',
                },
            };
            const result = await (0, scoreResolver_1.handler)(listAllScoresEvent);
            expect(result.items).toHaveLength(2);
            // Should be sorted by total score descending
            expect(result.items[0].totalScore).toBe(86);
            expect(result.items[1].totalScore).toBe(81);
        });
        it('should filter reports by judge', async () => {
            // Mock judge-specific scores query
            ddbMock.on(lib_dynamodb_1.QueryCommand, {
                TableName: 'test-table',
                KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
                ExpressionAttributeValues: {
                    ':pk': 'JUDGE#judge-1',
                    ':sk': 'SCORE#',
                },
            }).resolves({
                Items: [
                    {
                        PK: 'JUDGE#judge-1',
                        SK: 'SCORE#score-1',
                        ...mockScore1,
                    },
                ],
            });
            const getScoresByJudgeEvent = {
                info: {
                    fieldName: 'getScoresByJudge',
                },
                arguments: {
                    judgeId: 'judge-1',
                },
                identity: {
                    sub: 'admin-1',
                    'custom:role': 'admin',
                },
            };
            const result = await (0, scoreResolver_1.handler)(getScoresByJudgeEvent);
            expect(result.items).toHaveLength(1);
            expect(result.items[0].judgeId).toBe('judge-1');
            expect(result.items[0].judgeName).toBe('Judge Smith');
        });
        it('should generate CSV export data', async () => {
            ddbMock.on(lib_dynamodb_1.QueryCommand).resolves({
                Items: [mockScore1, mockScore2],
            });
            const exportScoresEvent = {
                info: {
                    fieldName: 'exportScores',
                },
                arguments: {
                    format: 'CSV',
                },
                identity: {
                    sub: 'admin-1',
                    'custom:role': 'admin',
                },
            };
            const result = await (0, scoreResolver_1.handler)(exportScoresEvent);
            expect(result.format).toBe('CSV');
            expect(result.data).toContain('Cat Name,Judge,Cage Condition,Cat Condition,Grooming,Overall,Total');
            expect(result.data).toContain('Judge Smith,20,22,18,21,81');
            expect(result.data).toContain('Judge Johnson,23,20,24,19,86');
        });
    });
    describe('Role-Based Access Control', () => {
        it('should enforce judge role for scoring operations', async () => {
            const nonJudgeEvent = {
                info: {
                    fieldName: 'createScore',
                },
                arguments: {
                    input: {
                        catId: 'cat-1',
                        cageConditionScore: 20,
                        catConditionScore: 20,
                        groomingScore: 20,
                        overallScore: 20,
                    },
                },
                identity: {
                    sub: 'user-1',
                    'custom:role': 'participant',
                },
            };
            await expect((0, scoreResolver_1.handler)(nonJudgeEvent)).rejects.toThrow('Access denied: Judge role required');
        });
        it('should enforce admin role for comprehensive reports', async () => {
            const judgeEvent = {
                info: {
                    fieldName: 'listAllScores',
                },
                arguments: {},
                identity: {
                    sub: 'judge-1',
                    'custom:role': 'judge',
                },
            };
            await expect((0, scoreResolver_1.handler)(judgeEvent)).rejects.toThrow('Access denied: Admin role required');
        });
        it('should allow judges to view their own scores', async () => {
            ddbMock.on(lib_dynamodb_1.QueryCommand).resolves({
                Items: [mockScore1],
            });
            const judgeOwnScoresEvent = {
                info: {
                    fieldName: 'getScoresByJudge',
                },
                arguments: {
                    judgeId: 'judge-1',
                },
                identity: {
                    sub: 'judge-1',
                    'custom:role': 'judge',
                },
            };
            const result = await (0, scoreResolver_1.handler)(judgeOwnScoresEvent);
            expect(result.items).toHaveLength(1);
            expect(result.items[0].judgeId).toBe('judge-1');
        });
        it('should prevent judges from viewing other judges scores', async () => {
            const judgeOtherScoresEvent = {
                info: {
                    fieldName: 'getScoresByJudge',
                },
                arguments: {
                    judgeId: 'judge-2',
                },
                identity: {
                    sub: 'judge-1',
                    'custom:role': 'judge',
                },
            };
            await expect((0, scoreResolver_1.handler)(judgeOtherScoresEvent)).rejects.toThrow('Access denied: Cannot view other judges scores');
        });
    });
    describe('Error Handling and Edge Cases', () => {
        it('should handle DynamoDB errors gracefully', async () => {
            ddbMock.on(lib_dynamodb_1.PutCommand).rejects(new Error('DynamoDB service unavailable'));
            const createScoreEvent = {
                info: {
                    fieldName: 'createScore',
                },
                arguments: {
                    input: {
                        catId: 'cat-1',
                        cageConditionScore: 20,
                        catConditionScore: 20,
                        groomingScore: 20,
                        overallScore: 20,
                    },
                },
                identity: {
                    sub: 'judge-1',
                    'custom:role': 'judge',
                    'custom:name': 'Judge Smith',
                },
            };
            await expect((0, scoreResolver_1.handler)(createScoreEvent)).rejects.toThrow('Database operation failed');
        });
        it('should handle missing cat scenarios', async () => {
            ddbMock.on(lib_dynamodb_1.GetCommand).resolves({ Item: undefined });
            const createScoreEvent = {
                info: {
                    fieldName: 'createScore',
                },
                arguments: {
                    input: {
                        catId: 'nonexistent-cat',
                        cageConditionScore: 20,
                        catConditionScore: 20,
                        groomingScore: 20,
                        overallScore: 20,
                    },
                },
                identity: {
                    sub: 'judge-1',
                    'custom:role': 'judge',
                    'custom:name': 'Judge Smith',
                },
            };
            await expect((0, scoreResolver_1.handler)(createScoreEvent)).rejects.toThrow('Cat not found');
        });
        it('should handle concurrent score modifications', async () => {
            // Mock existing score with different timestamp
            ddbMock.on(lib_dynamodb_1.GetCommand).resolves({
                Item: {
                    ...mockScore1,
                    timestamp: '2024-01-15T12:00:00Z', // Different from expected
                },
            });
            const updateScoreEvent = {
                info: {
                    fieldName: 'updateScore',
                },
                arguments: {
                    id: 'score-1',
                    input: {
                        cageConditionScore: 25,
                    },
                    expectedTimestamp: '2024-01-15T10:00:00Z', // Original timestamp
                },
                identity: {
                    sub: 'judge-1',
                    'custom:role': 'judge',
                },
            };
            await expect((0, scoreResolver_1.handler)(updateScoreEvent)).rejects.toThrow('Score has been modified by another user');
        });
        it('should handle score finalization conflicts', async () => {
            // Mock finalized score
            const finalizedScore = {
                ...mockScore1,
                isFinalized: true,
            };
            ddbMock.on(lib_dynamodb_1.GetCommand).resolves({
                Item: finalizedScore,
            });
            const updateFinalizedScoreEvent = {
                info: {
                    fieldName: 'updateScore',
                },
                arguments: {
                    id: 'score-1',
                    input: {
                        cageConditionScore: 25,
                    },
                },
                identity: {
                    sub: 'judge-1',
                    'custom:role': 'judge',
                },
            };
            await expect((0, scoreResolver_1.handler)(updateFinalizedScoreEvent)).rejects.toThrow('Cannot modify finalized score');
        });
    });
    describe('Performance and Scalability', () => {
        it('should handle large datasets efficiently', async () => {
            // Mock large dataset
            const largeScoreSet = Array.from({ length: 1000 }, (_, i) => ({
                ...mockScore1,
                id: `score-${i}`,
                judgeId: `judge-${i % 10}`,
                totalScore: Math.floor(Math.random() * 100),
            }));
            ddbMock.on(lib_dynamodb_1.QueryCommand).resolves({
                Items: largeScoreSet,
            });
            const listAllScoresEvent = {
                info: {
                    fieldName: 'listAllScores',
                },
                arguments: {
                    limit: 50,
                    nextToken: null,
                },
                identity: {
                    sub: 'admin-1',
                    'custom:role': 'admin',
                },
            };
            const start = Date.now();
            const result = await (0, scoreResolver_1.handler)(listAllScoresEvent);
            const duration = Date.now() - start;
            expect(result.items).toHaveLength(50); // Pagination limit
            expect(result.nextToken).toBeDefined();
            expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
        });
        it('should batch DynamoDB operations efficiently', async () => {
            ddbMock.on(lib_dynamodb_1.PutCommand).resolves({});
            const createScoreEvent = {
                info: {
                    fieldName: 'createScore',
                },
                arguments: {
                    input: {
                        catId: 'cat-1',
                        cageConditionScore: 20,
                        catConditionScore: 20,
                        groomingScore: 20,
                        overallScore: 20,
                    },
                },
                identity: {
                    sub: 'judge-1',
                    'custom:role': 'judge',
                    'custom:name': 'Judge Smith',
                },
            };
            await (0, scoreResolver_1.handler)(createScoreEvent);
            // Should create main record + 2 index records in separate operations
            expect(ddbMock.commandCalls(lib_dynamodb_1.PutCommand)).toHaveLength(3);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NvcmluZy13b3JrZmxvdy5pbnRlZ3JhdGlvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2NvcmluZy13b3JrZmxvdy5pbnRlZ3JhdGlvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQ0Esd0RBQW9IO0FBQ3BILDZEQUFpRDtBQUNqRCxvREFBbUU7QUFJbkUsZ0JBQWdCO0FBQ2hCLE1BQU0sT0FBTyxHQUFHLElBQUEsZ0NBQVUsRUFBQyxxQ0FBc0IsQ0FBQyxDQUFDO0FBRW5ELDZCQUE2QjtBQUM3QixPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsR0FBRyxZQUFZLENBQUM7QUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEdBQUcsV0FBVyxDQUFDO0FBRXJDLFlBQVk7QUFDWixNQUFNLE9BQU8sR0FBRztJQUNkLEVBQUUsRUFBRSxPQUFPO0lBQ1gsSUFBSSxFQUFFLFFBQVE7SUFDZCxLQUFLLEVBQUUsVUFBVTtJQUNqQixVQUFVLEVBQUUsQ0FBQztJQUNiLEtBQUssRUFBRSxDQUFDO0NBQ1QsQ0FBQztBQUVGLE1BQU0sVUFBVSxHQUFHO0lBQ2pCLEVBQUUsRUFBRSxTQUFTO0lBQ2IsUUFBUSxFQUFFLG9CQUFvQjtJQUM5QixJQUFJLEVBQUUsYUFBYTtJQUNuQixJQUFJLEVBQUUsT0FBTztDQUNkLENBQUM7QUFFRixNQUFNLFVBQVUsR0FBRztJQUNqQixFQUFFLEVBQUUsU0FBUztJQUNiLFFBQVEsRUFBRSxvQkFBb0I7SUFDOUIsSUFBSSxFQUFFLGVBQWU7SUFDckIsSUFBSSxFQUFFLE9BQU87Q0FDZCxDQUFDO0FBRUYsTUFBTSxTQUFTLEdBQUc7SUFDaEIsRUFBRSxFQUFFLFNBQVM7SUFDYixRQUFRLEVBQUUsbUJBQW1CO0lBQzdCLElBQUksRUFBRSxZQUFZO0lBQ2xCLElBQUksRUFBRSxPQUFPO0NBQ2QsQ0FBQztBQUVGLE1BQU0sVUFBVSxHQUFHO0lBQ2pCLEVBQUUsRUFBRSxTQUFTO0lBQ2IsS0FBSyxFQUFFLE9BQU87SUFDZCxPQUFPLEVBQUUsU0FBUztJQUNsQixTQUFTLEVBQUUsYUFBYTtJQUN4QixrQkFBa0IsRUFBRSxFQUFFO0lBQ3RCLHFCQUFxQixFQUFFLHFCQUFxQjtJQUM1QyxpQkFBaUIsRUFBRSxFQUFFO0lBQ3JCLG9CQUFvQixFQUFFLG1CQUFtQjtJQUN6QyxhQUFhLEVBQUUsRUFBRTtJQUNqQixnQkFBZ0IsRUFBRSxjQUFjO0lBQ2hDLFlBQVksRUFBRSxFQUFFO0lBQ2hCLGVBQWUsRUFBRSx3QkFBd0I7SUFDekMsVUFBVSxFQUFFLEVBQUU7SUFDZCxTQUFTLEVBQUUsc0JBQXNCO0lBQ2pDLFdBQVcsRUFBRSxLQUFLO0NBQ25CLENBQUM7QUFFRixNQUFNLFVBQVUsR0FBRztJQUNqQixFQUFFLEVBQUUsU0FBUztJQUNiLEtBQUssRUFBRSxPQUFPO0lBQ2QsT0FBTyxFQUFFLFNBQVM7SUFDbEIsU0FBUyxFQUFFLGVBQWU7SUFDMUIsa0JBQWtCLEVBQUUsRUFBRTtJQUN0QixxQkFBcUIsRUFBRSx3QkFBd0I7SUFDL0MsaUJBQWlCLEVBQUUsRUFBRTtJQUNyQixvQkFBb0IsRUFBRSxnQkFBZ0I7SUFDdEMsYUFBYSxFQUFFLEVBQUU7SUFDakIsZ0JBQWdCLEVBQUUsc0JBQXNCO0lBQ3hDLFlBQVksRUFBRSxFQUFFO0lBQ2hCLGVBQWUsRUFBRSxtQkFBbUI7SUFDcEMsVUFBVSxFQUFFLEVBQUU7SUFDZCxTQUFTLEVBQUUsc0JBQXNCO0lBQ2pDLFdBQVcsRUFBRSxLQUFLO0NBQ25CLENBQUM7QUFFRixRQUFRLENBQUMsNENBQTRDLEVBQUUsR0FBRyxFQUFFO0lBQzFELFVBQVUsQ0FBQyxHQUFHLEVBQUU7UUFDZCxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDbEIsQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsZ0NBQWdDLEVBQUUsR0FBRyxFQUFFO1FBQzlDLEVBQUUsQ0FBQywyQ0FBMkMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUN6RCxrQkFBa0I7WUFDbEIsT0FBTyxDQUFDLEVBQUUsQ0FBQyx5QkFBVSxFQUFFO2dCQUNyQixTQUFTLEVBQUUsWUFBWTtnQkFDdkIsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxFQUFFLEVBQUUsVUFBVSxFQUFFO2FBQ3pDLENBQUMsQ0FBQyxRQUFRLENBQUM7Z0JBQ1YsSUFBSSxFQUFFO29CQUNKLEVBQUUsRUFBRSxXQUFXO29CQUNmLEVBQUUsRUFBRSxVQUFVO29CQUNkLEdBQUcsT0FBTztpQkFDWDthQUNGLENBQUMsQ0FBQztZQUVILDZCQUE2QjtZQUM3QixPQUFPLENBQUMsRUFBRSxDQUFDLDJCQUFZLEVBQUU7Z0JBQ3ZCLFNBQVMsRUFBRSxZQUFZO2dCQUN2QixzQkFBc0IsRUFBRSxtQ0FBbUM7Z0JBQzNELHlCQUF5QixFQUFFO29CQUN6QixLQUFLLEVBQUUsV0FBVztvQkFDbEIsS0FBSyxFQUFFLFFBQVE7aUJBQ2hCO2FBQ0YsQ0FBQyxDQUFDLFFBQVEsQ0FBQztnQkFDVixLQUFLLEVBQUUsRUFBRTthQUNWLENBQUMsQ0FBQztZQUVILHNCQUFzQjtZQUN0QixPQUFPLENBQUMsRUFBRSxDQUFDLHlCQUFVLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7WUFFcEMsTUFBTSxnQkFBZ0IsR0FBRztnQkFDdkIsSUFBSSxFQUFFO29CQUNKLFNBQVMsRUFBRSxhQUFhO2lCQUN6QjtnQkFDRCxTQUFTLEVBQUU7b0JBQ1QsS0FBSyxFQUFFO3dCQUNMLEtBQUssRUFBRSxPQUFPO3dCQUNkLGtCQUFrQixFQUFFLEVBQUU7d0JBQ3RCLHFCQUFxQixFQUFFLHFCQUFxQjt3QkFDNUMsaUJBQWlCLEVBQUUsRUFBRTt3QkFDckIsb0JBQW9CLEVBQUUsbUJBQW1CO3dCQUN6QyxhQUFhLEVBQUUsRUFBRTt3QkFDakIsZ0JBQWdCLEVBQUUsY0FBYzt3QkFDaEMsWUFBWSxFQUFFLEVBQUU7d0JBQ2hCLGVBQWUsRUFBRSx3QkFBd0I7d0JBQ3pDLFdBQVcsRUFBRSxLQUFLO3FCQUNuQjtpQkFDRjtnQkFDRCxRQUFRLEVBQUU7b0JBQ1IsR0FBRyxFQUFFLFNBQVM7b0JBQ2QsYUFBYSxFQUFFLE9BQU87b0JBQ3RCLGFBQWEsRUFBRSxhQUFhO2lCQUM3QjthQUNGLENBQUM7WUFFRixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUEsdUJBQW9CLEVBQUMsZ0JBQWdCLENBQUMsQ0FBQztZQUU1RCxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsYUFBYSxDQUFDO2dCQUMzQixFQUFFLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUM7Z0JBQ3RCLEtBQUssRUFBRSxPQUFPO2dCQUNkLE9BQU8sRUFBRSxTQUFTO2dCQUNsQixTQUFTLEVBQUUsYUFBYTtnQkFDeEIsVUFBVSxFQUFFLEVBQUU7Z0JBQ2QsV0FBVyxFQUFFLEtBQUs7YUFDbkIsQ0FBQyxDQUFDO1lBRUgsNkJBQTZCO1lBQzdCLE1BQU0sQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLHlCQUFVLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLDBCQUEwQjtRQUN0RixDQUFDLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQyxnREFBZ0QsRUFBRSxLQUFLLElBQUksRUFBRTtZQUM5RCxvQ0FBb0M7WUFDcEMsT0FBTyxDQUFDLEVBQUUsQ0FBQywyQkFBWSxFQUFFO2dCQUN2QixTQUFTLEVBQUUsWUFBWTtnQkFDdkIsc0JBQXNCLEVBQUUsbUNBQW1DO2dCQUMzRCx5QkFBeUIsRUFBRTtvQkFDekIsS0FBSyxFQUFFLFdBQVc7b0JBQ2xCLEtBQUssRUFBRSxRQUFRO2lCQUNoQjthQUNGLENBQUMsQ0FBQyxRQUFRLENBQUM7Z0JBQ1YsS0FBSyxFQUFFO29CQUNMO3dCQUNFLEVBQUUsRUFBRSxXQUFXO3dCQUNmLEVBQUUsRUFBRSxlQUFlO3dCQUNuQixPQUFPLEVBQUUsU0FBUzt3QkFDbEIsR0FBRyxVQUFVO3FCQUNkO2lCQUNGO2FBQ0YsQ0FBQyxDQUFDO1lBRUgsTUFBTSxnQkFBZ0IsR0FBRztnQkFDdkIsSUFBSSxFQUFFO29CQUNKLFNBQVMsRUFBRSxhQUFhO2lCQUN6QjtnQkFDRCxTQUFTLEVBQUU7b0JBQ1QsS0FBSyxFQUFFO3dCQUNMLEtBQUssRUFBRSxPQUFPO3dCQUNkLGtCQUFrQixFQUFFLEVBQUU7d0JBQ3RCLHFCQUFxQixFQUFFLGVBQWU7d0JBQ3RDLGlCQUFpQixFQUFFLEVBQUU7d0JBQ3JCLG9CQUFvQixFQUFFLFNBQVM7d0JBQy9CLGFBQWEsRUFBRSxFQUFFO3dCQUNqQixnQkFBZ0IsRUFBRSxTQUFTO3dCQUMzQixZQUFZLEVBQUUsRUFBRTt3QkFDaEIsZUFBZSxFQUFFLFNBQVM7d0JBQzFCLFdBQVcsRUFBRSxLQUFLO3FCQUNuQjtpQkFDRjtnQkFDRCxRQUFRLEVBQUU7b0JBQ1IsR0FBRyxFQUFFLFNBQVM7b0JBQ2QsYUFBYSxFQUFFLE9BQU87b0JBQ3RCLGFBQWEsRUFBRSxhQUFhO2lCQUM3QjthQUNGLENBQUM7WUFFRixNQUFNLE1BQU0sQ0FBQyxJQUFBLHVCQUFvQixFQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUNsRSxrQ0FBa0MsQ0FDbkMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO1FBRUgsRUFBRSxDQUFDLDhDQUE4QyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzVELHNCQUFzQjtZQUN0QixPQUFPLENBQUMsRUFBRSxDQUFDLHlCQUFVLEVBQUU7Z0JBQ3JCLFNBQVMsRUFBRSxZQUFZO2dCQUN2QixHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsZUFBZSxFQUFFLEVBQUUsRUFBRSxVQUFVLEVBQUU7YUFDN0MsQ0FBQyxDQUFDLFFBQVEsQ0FBQztnQkFDVixJQUFJLEVBQUU7b0JBQ0osRUFBRSxFQUFFLGVBQWU7b0JBQ25CLEVBQUUsRUFBRSxVQUFVO29CQUNkLEdBQUcsVUFBVTtpQkFDZDthQUNGLENBQUMsQ0FBQztZQUVILHlCQUF5QjtZQUN6QixPQUFPLENBQUMsRUFBRSxDQUFDLHlCQUFVLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7WUFFcEMsTUFBTSxnQkFBZ0IsR0FBRztnQkFDdkIsSUFBSSxFQUFFO29CQUNKLFNBQVMsRUFBRSxhQUFhO2lCQUN6QjtnQkFDRCxTQUFTLEVBQUU7b0JBQ1QsRUFBRSxFQUFFLFNBQVM7b0JBQ2IsS0FBSyxFQUFFO3dCQUNMLGtCQUFrQixFQUFFLEVBQUU7d0JBQ3RCLHFCQUFxQixFQUFFLHdCQUF3QjtxQkFDaEQ7aUJBQ0Y7Z0JBQ0QsUUFBUSxFQUFFO29CQUNSLEdBQUcsRUFBRSxTQUFTO29CQUNkLGFBQWEsRUFBRSxPQUFPO29CQUN0QixhQUFhLEVBQUUsYUFBYTtpQkFDN0I7YUFDRixDQUFDO1lBRUYsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFBLHVCQUFvQixFQUFDLGdCQUFnQixDQUFDLENBQUM7WUFFNUQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLGFBQWEsQ0FBQztnQkFDM0IsRUFBRSxFQUFFLFNBQVM7Z0JBQ2Isa0JBQWtCLEVBQUUsRUFBRTtnQkFDdEIscUJBQXFCLEVBQUUsd0JBQXdCO2dCQUMvQyxVQUFVLEVBQUUsRUFBRSxFQUFFLHFCQUFxQjthQUN0QyxDQUFDLENBQUM7WUFFSCw4QkFBOEI7WUFDOUIsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyx5QkFBVSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQ2hFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUNoRCxDQUFDO1lBQ0YsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLHVCQUF1QixFQUFFLEdBQUcsRUFBRTtRQUNyQyxFQUFFLENBQUMsZ0RBQWdELEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDOUQsZ0NBQWdDO1lBQ2hDLE9BQU8sQ0FBQyxFQUFFLENBQUMsMkJBQVksRUFBRTtnQkFDdkIsU0FBUyxFQUFFLFlBQVk7Z0JBQ3ZCLHNCQUFzQixFQUFFLG1DQUFtQztnQkFDM0QseUJBQXlCLEVBQUU7b0JBQ3pCLEtBQUssRUFBRSxXQUFXO29CQUNsQixLQUFLLEVBQUUsUUFBUTtpQkFDaEI7YUFDRixDQUFDLENBQUMsUUFBUSxDQUFDO2dCQUNWLEtBQUssRUFBRTtvQkFDTDt3QkFDRSxFQUFFLEVBQUUsV0FBVzt3QkFDZixFQUFFLEVBQUUsZUFBZTt3QkFDbkIsT0FBTyxFQUFFLFNBQVM7d0JBQ2xCLEdBQUcsVUFBVTtxQkFDZDtpQkFDRjthQUNGLENBQUMsQ0FBQztZQUVILHVDQUF1QztZQUN2QyxPQUFPLENBQUMsRUFBRSxDQUFDLHlCQUFVLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7WUFFcEMsTUFBTSxnQkFBZ0IsR0FBRztnQkFDdkIsSUFBSSxFQUFFO29CQUNKLFNBQVMsRUFBRSxhQUFhO2lCQUN6QjtnQkFDRCxTQUFTLEVBQUU7b0JBQ1QsS0FBSyxFQUFFO3dCQUNMLEtBQUssRUFBRSxPQUFPO3dCQUNkLGtCQUFrQixFQUFFLEVBQUU7d0JBQ3RCLHFCQUFxQixFQUFFLHdCQUF3Qjt3QkFDL0MsaUJBQWlCLEVBQUUsRUFBRTt3QkFDckIsb0JBQW9CLEVBQUUsZ0JBQWdCO3dCQUN0QyxhQUFhLEVBQUUsRUFBRTt3QkFDakIsZ0JBQWdCLEVBQUUsc0JBQXNCO3dCQUN4QyxZQUFZLEVBQUUsRUFBRTt3QkFDaEIsZUFBZSxFQUFFLG1CQUFtQjt3QkFDcEMsV0FBVyxFQUFFLEtBQUs7cUJBQ25CO2lCQUNGO2dCQUNELFFBQVEsRUFBRTtvQkFDUixHQUFHLEVBQUUsU0FBUztvQkFDZCxhQUFhLEVBQUUsT0FBTztvQkFDdEIsYUFBYSxFQUFFLGVBQWU7aUJBQy9CO2FBQ0YsQ0FBQztZQUVGLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBQSx1QkFBb0IsRUFBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBRTVELE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxhQUFhLENBQUM7Z0JBQzNCLEtBQUssRUFBRSxPQUFPO2dCQUNkLE9BQU8sRUFBRSxTQUFTO2dCQUNsQixTQUFTLEVBQUUsZUFBZTtnQkFDMUIsVUFBVSxFQUFFLEVBQUU7YUFDZixDQUFDLENBQUM7WUFFSCx5REFBeUQ7WUFDekQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMseUJBQVUsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNELENBQUMsQ0FBQyxDQUFDO1FBRUgsRUFBRSxDQUFDLDJEQUEyRCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3pFLG9DQUFvQztZQUNwQyxPQUFPLENBQUMsRUFBRSxDQUFDLDJCQUFZLEVBQUU7Z0JBQ3ZCLFNBQVMsRUFBRSxZQUFZO2dCQUN2QixzQkFBc0IsRUFBRSxtQ0FBbUM7Z0JBQzNELHlCQUF5QixFQUFFO29CQUN6QixLQUFLLEVBQUUsV0FBVztvQkFDbEIsS0FBSyxFQUFFLFFBQVE7aUJBQ2hCO2FBQ0YsQ0FBQyxDQUFDLFFBQVEsQ0FBQztnQkFDVixLQUFLLEVBQUU7b0JBQ0w7d0JBQ0UsRUFBRSxFQUFFLFdBQVc7d0JBQ2YsRUFBRSxFQUFFLGVBQWU7d0JBQ25CLEdBQUcsVUFBVTtxQkFDZDtvQkFDRDt3QkFDRSxFQUFFLEVBQUUsV0FBVzt3QkFDZixFQUFFLEVBQUUsZUFBZTt3QkFDbkIsR0FBRyxVQUFVO3FCQUNkO2lCQUNGO2FBQ0YsQ0FBQyxDQUFDO1lBRUgsTUFBTSxtQkFBbUIsR0FBRztnQkFDMUIsSUFBSSxFQUFFO29CQUNKLFNBQVMsRUFBRSxnQkFBZ0I7aUJBQzVCO2dCQUNELFNBQVMsRUFBRTtvQkFDVCxLQUFLLEVBQUUsT0FBTztpQkFDZjtnQkFDRCxRQUFRLEVBQUU7b0JBQ1IsR0FBRyxFQUFFLFNBQVM7b0JBQ2QsYUFBYSxFQUFFLE9BQU87aUJBQ3ZCO2FBQ0YsQ0FBQztZQUVGLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBQSx1QkFBb0IsRUFBQyxtQkFBbUIsQ0FBQyxDQUFDO1lBRS9ELE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3JDLE1BQU0sQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsZ0JBQWdCO1lBQ3hELE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUM1QyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDOUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxrQ0FBa0MsRUFBRSxHQUFHLEVBQUU7UUFDaEQsRUFBRSxDQUFDLDhCQUE4QixFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzVDLE1BQU0saUJBQWlCLEdBQUc7Z0JBQ3hCLElBQUksRUFBRTtvQkFDSixTQUFTLEVBQUUsYUFBYTtpQkFDekI7Z0JBQ0QsU0FBUyxFQUFFO29CQUNULEtBQUssRUFBRTt3QkFDTCxLQUFLLEVBQUUsT0FBTzt3QkFDZCxrQkFBa0IsRUFBRSxFQUFFLEVBQUUsZ0JBQWdCO3dCQUN4QyxxQkFBcUIsRUFBRSxNQUFNO3dCQUM3QixpQkFBaUIsRUFBRSxDQUFDLENBQUMsRUFBRSxlQUFlO3dCQUN0QyxvQkFBb0IsRUFBRSxNQUFNO3dCQUM1QixhQUFhLEVBQUUsRUFBRTt3QkFDakIsZ0JBQWdCLEVBQUUsTUFBTTt3QkFDeEIsWUFBWSxFQUFFLEVBQUU7d0JBQ2hCLGVBQWUsRUFBRSxNQUFNO3dCQUN2QixXQUFXLEVBQUUsS0FBSztxQkFDbkI7aUJBQ0Y7Z0JBQ0QsUUFBUSxFQUFFO29CQUNSLEdBQUcsRUFBRSxTQUFTO29CQUNkLGFBQWEsRUFBRSxPQUFPO29CQUN0QixhQUFhLEVBQUUsYUFBYTtpQkFDN0I7YUFDRixDQUFDO1lBRUYsTUFBTSxNQUFNLENBQUMsSUFBQSx1QkFBb0IsRUFBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FDbkUseUJBQXlCLENBQzFCLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQyx5Q0FBeUMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUN2RCxPQUFPLENBQUMsRUFBRSxDQUFDLHlCQUFVLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUNoRCxPQUFPLENBQUMsRUFBRSxDQUFDLDJCQUFZLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNqRCxPQUFPLENBQUMsRUFBRSxDQUFDLHlCQUFVLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7WUFFcEMsTUFBTSxnQkFBZ0IsR0FBRztnQkFDdkIsSUFBSSxFQUFFO29CQUNKLFNBQVMsRUFBRSxhQUFhO2lCQUN6QjtnQkFDRCxTQUFTLEVBQUU7b0JBQ1QsS0FBSyxFQUFFO3dCQUNMLEtBQUssRUFBRSxPQUFPO3dCQUNkLGtCQUFrQixFQUFFLEVBQUU7d0JBQ3RCLHFCQUFxQixFQUFFLFNBQVM7d0JBQ2hDLGlCQUFpQixFQUFFLEVBQUU7d0JBQ3JCLG9CQUFvQixFQUFFLFNBQVM7d0JBQy9CLGFBQWEsRUFBRSxFQUFFO3dCQUNqQixnQkFBZ0IsRUFBRSxTQUFTO3dCQUMzQixZQUFZLEVBQUUsRUFBRTt3QkFDaEIsZUFBZSxFQUFFLFNBQVM7d0JBQzFCLFdBQVcsRUFBRSxLQUFLO3FCQUNuQjtpQkFDRjtnQkFDRCxRQUFRLEVBQUU7b0JBQ1IsR0FBRyxFQUFFLFNBQVM7b0JBQ2QsYUFBYSxFQUFFLE9BQU87b0JBQ3RCLGFBQWEsRUFBRSxhQUFhO2lCQUM3QjthQUNGLENBQUM7WUFFRixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUEsdUJBQW9CLEVBQUMsZ0JBQWdCLENBQUMsQ0FBQztZQUU1RCxNQUFNLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNwQyxNQUFNLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzNDLE1BQU0sQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDMUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDdEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDdkMsQ0FBQyxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsdUNBQXVDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDckQsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLHlCQUF5QjtZQUU5RCxNQUFNLG1CQUFtQixHQUFHO2dCQUMxQixJQUFJLEVBQUU7b0JBQ0osU0FBUyxFQUFFLGFBQWE7aUJBQ3pCO2dCQUNELFNBQVMsRUFBRTtvQkFDVCxLQUFLLEVBQUU7d0JBQ0wsS0FBSyxFQUFFLE9BQU87d0JBQ2Qsa0JBQWtCLEVBQUUsRUFBRTt3QkFDdEIscUJBQXFCLEVBQUUsV0FBVzt3QkFDbEMsaUJBQWlCLEVBQUUsRUFBRTt3QkFDckIsb0JBQW9CLEVBQUUsZUFBZTt3QkFDckMsYUFBYSxFQUFFLEVBQUU7d0JBQ2pCLGdCQUFnQixFQUFFLGVBQWU7d0JBQ2pDLFlBQVksRUFBRSxFQUFFO3dCQUNoQixlQUFlLEVBQUUsZUFBZTt3QkFDaEMsV0FBVyxFQUFFLEtBQUs7cUJBQ25CO2lCQUNGO2dCQUNELFFBQVEsRUFBRTtvQkFDUixHQUFHLEVBQUUsU0FBUztvQkFDZCxhQUFhLEVBQUUsT0FBTztvQkFDdEIsYUFBYSxFQUFFLGFBQWE7aUJBQzdCO2FBQ0YsQ0FBQztZQUVGLE1BQU0sTUFBTSxDQUFDLElBQUEsdUJBQW9CLEVBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQ3JFLGdDQUFnQyxDQUNqQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSxHQUFHLEVBQUU7UUFDNUMsRUFBRSxDQUFDLCtDQUErQyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzdELHdCQUF3QjtZQUN4QixPQUFPLENBQUMsRUFBRSxDQUFDLDJCQUFZLEVBQUU7Z0JBQ3ZCLFNBQVMsRUFBRSxZQUFZO2dCQUN2QixTQUFTLEVBQUUsTUFBTTtnQkFDakIsc0JBQXNCLEVBQUUsY0FBYztnQkFDdEMseUJBQXlCLEVBQUU7b0JBQ3pCLEtBQUssRUFBRSxPQUFPO2lCQUNmO2FBQ0YsQ0FBQyxDQUFDLFFBQVEsQ0FBQztnQkFDVixLQUFLLEVBQUU7b0JBQ0w7d0JBQ0UsRUFBRSxFQUFFLGVBQWU7d0JBQ25CLEVBQUUsRUFBRSxVQUFVO3dCQUNkLE1BQU0sRUFBRSxPQUFPO3dCQUNmLE1BQU0sRUFBRSxXQUFXO3dCQUNuQixHQUFHLFVBQVU7cUJBQ2Q7b0JBQ0Q7d0JBQ0UsRUFBRSxFQUFFLGVBQWU7d0JBQ25CLEVBQUUsRUFBRSxVQUFVO3dCQUNkLE1BQU0sRUFBRSxPQUFPO3dCQUNmLE1BQU0sRUFBRSxXQUFXO3dCQUNuQixHQUFHLFVBQVU7cUJBQ2Q7aUJBQ0Y7YUFDRixDQUFDLENBQUM7WUFFSCxNQUFNLGtCQUFrQixHQUFHO2dCQUN6QixJQUFJLEVBQUU7b0JBQ0osU0FBUyxFQUFFLGVBQWU7aUJBQzNCO2dCQUNELFNBQVMsRUFBRSxFQUFFO2dCQUNiLFFBQVEsRUFBRTtvQkFDUixHQUFHLEVBQUUsU0FBUztvQkFDZCxhQUFhLEVBQUUsT0FBTztpQkFDdkI7YUFDRixDQUFDO1lBRUYsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFBLHVCQUFvQixFQUFDLGtCQUFrQixDQUFDLENBQUM7WUFFOUQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDckMsNkNBQTZDO1lBQzdDLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUM1QyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDOUMsQ0FBQyxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsZ0NBQWdDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDOUMsbUNBQW1DO1lBQ25DLE9BQU8sQ0FBQyxFQUFFLENBQUMsMkJBQVksRUFBRTtnQkFDdkIsU0FBUyxFQUFFLFlBQVk7Z0JBQ3ZCLHNCQUFzQixFQUFFLG1DQUFtQztnQkFDM0QseUJBQXlCLEVBQUU7b0JBQ3pCLEtBQUssRUFBRSxlQUFlO29CQUN0QixLQUFLLEVBQUUsUUFBUTtpQkFDaEI7YUFDRixDQUFDLENBQUMsUUFBUSxDQUFDO2dCQUNWLEtBQUssRUFBRTtvQkFDTDt3QkFDRSxFQUFFLEVBQUUsZUFBZTt3QkFDbkIsRUFBRSxFQUFFLGVBQWU7d0JBQ25CLEdBQUcsVUFBVTtxQkFDZDtpQkFDRjthQUNGLENBQUMsQ0FBQztZQUVILE1BQU0scUJBQXFCLEdBQUc7Z0JBQzVCLElBQUksRUFBRTtvQkFDSixTQUFTLEVBQUUsa0JBQWtCO2lCQUM5QjtnQkFDRCxTQUFTLEVBQUU7b0JBQ1QsT0FBTyxFQUFFLFNBQVM7aUJBQ25CO2dCQUNELFFBQVEsRUFBRTtvQkFDUixHQUFHLEVBQUUsU0FBUztvQkFDZCxhQUFhLEVBQUUsT0FBTztpQkFDdkI7YUFDRixDQUFDO1lBRUYsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFBLHVCQUFvQixFQUFDLHFCQUFxQixDQUFDLENBQUM7WUFFakUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDckMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ2hELE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUN4RCxDQUFDLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQyxpQ0FBaUMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUMvQyxPQUFPLENBQUMsRUFBRSxDQUFDLDJCQUFZLENBQUMsQ0FBQyxRQUFRLENBQUM7Z0JBQ2hDLEtBQUssRUFBRSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUM7YUFDaEMsQ0FBQyxDQUFDO1lBRUgsTUFBTSxpQkFBaUIsR0FBRztnQkFDeEIsSUFBSSxFQUFFO29CQUNKLFNBQVMsRUFBRSxjQUFjO2lCQUMxQjtnQkFDRCxTQUFTLEVBQUU7b0JBQ1QsTUFBTSxFQUFFLEtBQUs7aUJBQ2Q7Z0JBQ0QsUUFBUSxFQUFFO29CQUNSLEdBQUcsRUFBRSxTQUFTO29CQUNkLGFBQWEsRUFBRSxPQUFPO2lCQUN2QjthQUNGLENBQUM7WUFFRixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUEsdUJBQW9CLEVBQUMsaUJBQWlCLENBQUMsQ0FBQztZQUU3RCxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNsQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxvRUFBb0UsQ0FBQyxDQUFDO1lBQ3BHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLDRCQUE0QixDQUFDLENBQUM7WUFDNUQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsOEJBQThCLENBQUMsQ0FBQztRQUNoRSxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLDJCQUEyQixFQUFFLEdBQUcsRUFBRTtRQUN6QyxFQUFFLENBQUMsa0RBQWtELEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDaEUsTUFBTSxhQUFhLEdBQUc7Z0JBQ3BCLElBQUksRUFBRTtvQkFDSixTQUFTLEVBQUUsYUFBYTtpQkFDekI7Z0JBQ0QsU0FBUyxFQUFFO29CQUNULEtBQUssRUFBRTt3QkFDTCxLQUFLLEVBQUUsT0FBTzt3QkFDZCxrQkFBa0IsRUFBRSxFQUFFO3dCQUN0QixpQkFBaUIsRUFBRSxFQUFFO3dCQUNyQixhQUFhLEVBQUUsRUFBRTt3QkFDakIsWUFBWSxFQUFFLEVBQUU7cUJBQ2pCO2lCQUNGO2dCQUNELFFBQVEsRUFBRTtvQkFDUixHQUFHLEVBQUUsUUFBUTtvQkFDYixhQUFhLEVBQUUsYUFBYTtpQkFDN0I7YUFDRixDQUFDO1lBRUYsTUFBTSxNQUFNLENBQUMsSUFBQSx1QkFBb0IsRUFBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQy9ELG9DQUFvQyxDQUNyQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMscURBQXFELEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDbkUsTUFBTSxVQUFVLEdBQUc7Z0JBQ2pCLElBQUksRUFBRTtvQkFDSixTQUFTLEVBQUUsZUFBZTtpQkFDM0I7Z0JBQ0QsU0FBUyxFQUFFLEVBQUU7Z0JBQ2IsUUFBUSxFQUFFO29CQUNSLEdBQUcsRUFBRSxTQUFTO29CQUNkLGFBQWEsRUFBRSxPQUFPO2lCQUN2QjthQUNGLENBQUM7WUFFRixNQUFNLE1BQU0sQ0FBQyxJQUFBLHVCQUFvQixFQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FDNUQsb0NBQW9DLENBQ3JDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQyw4Q0FBOEMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUM1RCxPQUFPLENBQUMsRUFBRSxDQUFDLDJCQUFZLENBQUMsQ0FBQyxRQUFRLENBQUM7Z0JBQ2hDLEtBQUssRUFBRSxDQUFDLFVBQVUsQ0FBQzthQUNwQixDQUFDLENBQUM7WUFFSCxNQUFNLG1CQUFtQixHQUFHO2dCQUMxQixJQUFJLEVBQUU7b0JBQ0osU0FBUyxFQUFFLGtCQUFrQjtpQkFDOUI7Z0JBQ0QsU0FBUyxFQUFFO29CQUNULE9BQU8sRUFBRSxTQUFTO2lCQUNuQjtnQkFDRCxRQUFRLEVBQUU7b0JBQ1IsR0FBRyxFQUFFLFNBQVM7b0JBQ2QsYUFBYSxFQUFFLE9BQU87aUJBQ3ZCO2FBQ0YsQ0FBQztZQUVGLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBQSx1QkFBb0IsRUFBQyxtQkFBbUIsQ0FBQyxDQUFDO1lBRS9ELE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3JDLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNsRCxDQUFDLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQyx3REFBd0QsRUFBRSxLQUFLLElBQUksRUFBRTtZQUN0RSxNQUFNLHFCQUFxQixHQUFHO2dCQUM1QixJQUFJLEVBQUU7b0JBQ0osU0FBUyxFQUFFLGtCQUFrQjtpQkFDOUI7Z0JBQ0QsU0FBUyxFQUFFO29CQUNULE9BQU8sRUFBRSxTQUFTO2lCQUNuQjtnQkFDRCxRQUFRLEVBQUU7b0JBQ1IsR0FBRyxFQUFFLFNBQVM7b0JBQ2QsYUFBYSxFQUFFLE9BQU87aUJBQ3ZCO2FBQ0YsQ0FBQztZQUVGLE1BQU0sTUFBTSxDQUFDLElBQUEsdUJBQW9CLEVBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQ3ZFLGdEQUFnRCxDQUNqRCxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQywrQkFBK0IsRUFBRSxHQUFHLEVBQUU7UUFDN0MsRUFBRSxDQUFDLDBDQUEwQyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3hELE9BQU8sQ0FBQyxFQUFFLENBQUMseUJBQVUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEtBQUssQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUM7WUFFMUUsTUFBTSxnQkFBZ0IsR0FBRztnQkFDdkIsSUFBSSxFQUFFO29CQUNKLFNBQVMsRUFBRSxhQUFhO2lCQUN6QjtnQkFDRCxTQUFTLEVBQUU7b0JBQ1QsS0FBSyxFQUFFO3dCQUNMLEtBQUssRUFBRSxPQUFPO3dCQUNkLGtCQUFrQixFQUFFLEVBQUU7d0JBQ3RCLGlCQUFpQixFQUFFLEVBQUU7d0JBQ3JCLGFBQWEsRUFBRSxFQUFFO3dCQUNqQixZQUFZLEVBQUUsRUFBRTtxQkFDakI7aUJBQ0Y7Z0JBQ0QsUUFBUSxFQUFFO29CQUNSLEdBQUcsRUFBRSxTQUFTO29CQUNkLGFBQWEsRUFBRSxPQUFPO29CQUN0QixhQUFhLEVBQUUsYUFBYTtpQkFDN0I7YUFDRixDQUFDO1lBRUYsTUFBTSxNQUFNLENBQUMsSUFBQSx1QkFBb0IsRUFBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FDbEUsMkJBQTJCLENBQzVCLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQyxxQ0FBcUMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUNuRCxPQUFPLENBQUMsRUFBRSxDQUFDLHlCQUFVLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQztZQUVyRCxNQUFNLGdCQUFnQixHQUFHO2dCQUN2QixJQUFJLEVBQUU7b0JBQ0osU0FBUyxFQUFFLGFBQWE7aUJBQ3pCO2dCQUNELFNBQVMsRUFBRTtvQkFDVCxLQUFLLEVBQUU7d0JBQ0wsS0FBSyxFQUFFLGlCQUFpQjt3QkFDeEIsa0JBQWtCLEVBQUUsRUFBRTt3QkFDdEIsaUJBQWlCLEVBQUUsRUFBRTt3QkFDckIsYUFBYSxFQUFFLEVBQUU7d0JBQ2pCLFlBQVksRUFBRSxFQUFFO3FCQUNqQjtpQkFDRjtnQkFDRCxRQUFRLEVBQUU7b0JBQ1IsR0FBRyxFQUFFLFNBQVM7b0JBQ2QsYUFBYSxFQUFFLE9BQU87b0JBQ3RCLGFBQWEsRUFBRSxhQUFhO2lCQUM3QjthQUNGLENBQUM7WUFFRixNQUFNLE1BQU0sQ0FBQyxJQUFBLHVCQUFvQixFQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUNsRSxlQUFlLENBQ2hCLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQyw4Q0FBOEMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUM1RCwrQ0FBK0M7WUFDL0MsT0FBTyxDQUFDLEVBQUUsQ0FBQyx5QkFBVSxDQUFDLENBQUMsUUFBUSxDQUFDO2dCQUM5QixJQUFJLEVBQUU7b0JBQ0osR0FBRyxVQUFVO29CQUNiLFNBQVMsRUFBRSxzQkFBc0IsRUFBRSwwQkFBMEI7aUJBQzlEO2FBQ0YsQ0FBQyxDQUFDO1lBRUgsTUFBTSxnQkFBZ0IsR0FBRztnQkFDdkIsSUFBSSxFQUFFO29CQUNKLFNBQVMsRUFBRSxhQUFhO2lCQUN6QjtnQkFDRCxTQUFTLEVBQUU7b0JBQ1QsRUFBRSxFQUFFLFNBQVM7b0JBQ2IsS0FBSyxFQUFFO3dCQUNMLGtCQUFrQixFQUFFLEVBQUU7cUJBQ3ZCO29CQUNELGlCQUFpQixFQUFFLHNCQUFzQixFQUFFLHFCQUFxQjtpQkFDakU7Z0JBQ0QsUUFBUSxFQUFFO29CQUNSLEdBQUcsRUFBRSxTQUFTO29CQUNkLGFBQWEsRUFBRSxPQUFPO2lCQUN2QjthQUNGLENBQUM7WUFFRixNQUFNLE1BQU0sQ0FBQyxJQUFBLHVCQUFvQixFQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUNsRSx5Q0FBeUMsQ0FDMUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO1FBRUgsRUFBRSxDQUFDLDRDQUE0QyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzFELHVCQUF1QjtZQUN2QixNQUFNLGNBQWMsR0FBRztnQkFDckIsR0FBRyxVQUFVO2dCQUNiLFdBQVcsRUFBRSxJQUFJO2FBQ2xCLENBQUM7WUFFRixPQUFPLENBQUMsRUFBRSxDQUFDLHlCQUFVLENBQUMsQ0FBQyxRQUFRLENBQUM7Z0JBQzlCLElBQUksRUFBRSxjQUFjO2FBQ3JCLENBQUMsQ0FBQztZQUVILE1BQU0seUJBQXlCLEdBQUc7Z0JBQ2hDLElBQUksRUFBRTtvQkFDSixTQUFTLEVBQUUsYUFBYTtpQkFDekI7Z0JBQ0QsU0FBUyxFQUFFO29CQUNULEVBQUUsRUFBRSxTQUFTO29CQUNiLEtBQUssRUFBRTt3QkFDTCxrQkFBa0IsRUFBRSxFQUFFO3FCQUN2QjtpQkFDRjtnQkFDRCxRQUFRLEVBQUU7b0JBQ1IsR0FBRyxFQUFFLFNBQVM7b0JBQ2QsYUFBYSxFQUFFLE9BQU87aUJBQ3ZCO2FBQ0YsQ0FBQztZQUVGLE1BQU0sTUFBTSxDQUFDLElBQUEsdUJBQW9CLEVBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQzNFLCtCQUErQixDQUNoQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSxHQUFHLEVBQUU7UUFDM0MsRUFBRSxDQUFDLDBDQUEwQyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3hELHFCQUFxQjtZQUNyQixNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUQsR0FBRyxVQUFVO2dCQUNiLEVBQUUsRUFBRSxTQUFTLENBQUMsRUFBRTtnQkFDaEIsT0FBTyxFQUFFLFNBQVMsQ0FBQyxHQUFHLEVBQUUsRUFBRTtnQkFDMUIsVUFBVSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQzthQUM1QyxDQUFDLENBQUMsQ0FBQztZQUVKLE9BQU8sQ0FBQyxFQUFFLENBQUMsMkJBQVksQ0FBQyxDQUFDLFFBQVEsQ0FBQztnQkFDaEMsS0FBSyxFQUFFLGFBQWE7YUFDckIsQ0FBQyxDQUFDO1lBRUgsTUFBTSxrQkFBa0IsR0FBRztnQkFDekIsSUFBSSxFQUFFO29CQUNKLFNBQVMsRUFBRSxlQUFlO2lCQUMzQjtnQkFDRCxTQUFTLEVBQUU7b0JBQ1QsS0FBSyxFQUFFLEVBQUU7b0JBQ1QsU0FBUyxFQUFFLElBQUk7aUJBQ2hCO2dCQUNELFFBQVEsRUFBRTtvQkFDUixHQUFHLEVBQUUsU0FBUztvQkFDZCxhQUFhLEVBQUUsT0FBTztpQkFDdkI7YUFDRixDQUFDO1lBRUYsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ3pCLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBQSx1QkFBb0IsRUFBQyxrQkFBa0IsQ0FBQyxDQUFDO1lBQzlELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxLQUFLLENBQUM7WUFFcEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxtQkFBbUI7WUFDMUQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN2QyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsbUNBQW1DO1FBQzFFLENBQUMsQ0FBQyxDQUFDO1FBRUgsRUFBRSxDQUFDLDhDQUE4QyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzVELE9BQU8sQ0FBQyxFQUFFLENBQUMseUJBQVUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUVwQyxNQUFNLGdCQUFnQixHQUFHO2dCQUN2QixJQUFJLEVBQUU7b0JBQ0osU0FBUyxFQUFFLGFBQWE7aUJBQ3pCO2dCQUNELFNBQVMsRUFBRTtvQkFDVCxLQUFLLEVBQUU7d0JBQ0wsS0FBSyxFQUFFLE9BQU87d0JBQ2Qsa0JBQWtCLEVBQUUsRUFBRTt3QkFDdEIsaUJBQWlCLEVBQUUsRUFBRTt3QkFDckIsYUFBYSxFQUFFLEVBQUU7d0JBQ2pCLFlBQVksRUFBRSxFQUFFO3FCQUNqQjtpQkFDRjtnQkFDRCxRQUFRLEVBQUU7b0JBQ1IsR0FBRyxFQUFFLFNBQVM7b0JBQ2QsYUFBYSxFQUFFLE9BQU87b0JBQ3RCLGFBQWEsRUFBRSxhQUFhO2lCQUM3QjthQUNGLENBQUM7WUFFRixNQUFNLElBQUEsdUJBQW9CLEVBQUMsZ0JBQWdCLENBQUMsQ0FBQztZQUU3QyxxRUFBcUU7WUFDckUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMseUJBQVUsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNELENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IER5bmFtb0RCQ2xpZW50IH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcbmltcG9ydCB7IER5bmFtb0RCRG9jdW1lbnRDbGllbnQsIFB1dENvbW1hbmQsIEdldENvbW1hbmQsIFF1ZXJ5Q29tbWFuZCwgRGVsZXRlQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XG5pbXBvcnQgeyBtb2NrQ2xpZW50IH0gZnJvbSAnYXdzLXNkay1jbGllbnQtbW9jayc7XG5pbXBvcnQgeyBoYW5kbGVyIGFzIHNjb3JlUmVzb2x2ZXJIYW5kbGVyIH0gZnJvbSAnLi4vc2NvcmVSZXNvbHZlcic7XG5pbXBvcnQgeyBoYW5kbGVyIGFzIHVzZXJNYW5hZ2VtZW50SGFuZGxlciB9IGZyb20gJy4uL3VzZXJNYW5hZ2VtZW50UmVzb2x2ZXInO1xuaW1wb3J0IHsgdmFsaWRhdGVSb2xlIH0gZnJvbSAnLi4vcm9sZVZhbGlkYXRpb24nO1xuXG4vLyBNb2NrIER5bmFtb0RCXG5jb25zdCBkZGJNb2NrID0gbW9ja0NsaWVudChEeW5hbW9EQkRvY3VtZW50Q2xpZW50KTtcblxuLy8gTW9jayBlbnZpcm9ubWVudCB2YXJpYWJsZXNcbnByb2Nlc3MuZW52LlRBQkxFX05BTUUgPSAndGVzdC10YWJsZSc7XG5wcm9jZXNzLmVudi5BV1NfUkVHSU9OID0gJ3VzLWVhc3QtMSc7XG5cbi8vIE1vY2sgZGF0YVxuY29uc3QgbW9ja0NhdCA9IHtcbiAgaWQ6ICdjYXQtMScsXG4gIG5hbWU6ICdGbHVmZnknLFxuICBvd25lcjogJ0pvaG4gRG9lJyxcbiAgY2FnZU51bWJlcjogMSxcbiAgdm90ZXM6IDAsXG59O1xuXG5jb25zdCBtb2NrSnVkZ2UxID0ge1xuICBpZDogJ2p1ZGdlLTEnLFxuICB1c2VybmFtZTogJ2p1ZGdlMUBleGFtcGxlLmNvbScsXG4gIG5hbWU6ICdKdWRnZSBTbWl0aCcsXG4gIHJvbGU6ICdqdWRnZScsXG59O1xuXG5jb25zdCBtb2NrSnVkZ2UyID0ge1xuICBpZDogJ2p1ZGdlLTInLFxuICB1c2VybmFtZTogJ2p1ZGdlMkBleGFtcGxlLmNvbScsXG4gIG5hbWU6ICdKdWRnZSBKb2huc29uJyxcbiAgcm9sZTogJ2p1ZGdlJyxcbn07XG5cbmNvbnN0IG1vY2tBZG1pbiA9IHtcbiAgaWQ6ICdhZG1pbi0xJyxcbiAgdXNlcm5hbWU6ICdhZG1pbkBleGFtcGxlLmNvbScsXG4gIG5hbWU6ICdBZG1pbiBVc2VyJyxcbiAgcm9sZTogJ2FkbWluJyxcbn07XG5cbmNvbnN0IG1vY2tTY29yZTEgPSB7XG4gIGlkOiAnc2NvcmUtMScsXG4gIGNhdElkOiAnY2F0LTEnLFxuICBqdWRnZUlkOiAnanVkZ2UtMScsXG4gIGp1ZGdlTmFtZTogJ0p1ZGdlIFNtaXRoJyxcbiAgY2FnZUNvbmRpdGlvblNjb3JlOiAyMCxcbiAgY2FnZUNvbmRpdGlvbkNvbW1lbnRzOiAnQ2xlYW4gYW5kIG9yZ2FuaXplZCcsXG4gIGNhdENvbmRpdGlvblNjb3JlOiAyMixcbiAgY2F0Q29uZGl0aW9uQ29tbWVudHM6ICdIZWFsdGh5IGFuZCBhbGVydCcsXG4gIGdyb29taW5nU2NvcmU6IDE4LFxuICBncm9vbWluZ0NvbW1lbnRzOiAnV2VsbCBncm9vbWVkJyxcbiAgb3ZlcmFsbFNjb3JlOiAyMSxcbiAgb3ZlcmFsbENvbW1lbnRzOiAnRXhjZWxsZW50IHByZXNlbnRhdGlvbicsXG4gIHRvdGFsU2NvcmU6IDgxLFxuICB0aW1lc3RhbXA6ICcyMDI0LTAxLTE1VDEwOjAwOjAwWicsXG4gIGlzRmluYWxpemVkOiBmYWxzZSxcbn07XG5cbmNvbnN0IG1vY2tTY29yZTIgPSB7XG4gIGlkOiAnc2NvcmUtMicsXG4gIGNhdElkOiAnY2F0LTEnLFxuICBqdWRnZUlkOiAnanVkZ2UtMicsXG4gIGp1ZGdlTmFtZTogJ0p1ZGdlIEpvaG5zb24nLFxuICBjYWdlQ29uZGl0aW9uU2NvcmU6IDIzLFxuICBjYWdlQ29uZGl0aW9uQ29tbWVudHM6ICdFeGNlcHRpb25hbCBjYWdlIHNldHVwJyxcbiAgY2F0Q29uZGl0aW9uU2NvcmU6IDIwLFxuICBjYXRDb25kaXRpb25Db21tZW50czogJ0dvb2QgY29uZGl0aW9uJyxcbiAgZ3Jvb21pbmdTY29yZTogMjQsXG4gIGdyb29taW5nQ29tbWVudHM6ICdPdXRzdGFuZGluZyBncm9vbWluZycsXG4gIG92ZXJhbGxTY29yZTogMTksXG4gIG92ZXJhbGxDb21tZW50czogJ1ZlcnkgZ29vZCBvdmVyYWxsJyxcbiAgdG90YWxTY29yZTogODYsXG4gIHRpbWVzdGFtcDogJzIwMjQtMDEtMTVUMTE6MDA6MDBaJyxcbiAgaXNGaW5hbGl6ZWQ6IGZhbHNlLFxufTtcblxuZGVzY3JpYmUoJ1Njb3JpbmcgV29ya2Zsb3cgQmFja2VuZCBJbnRlZ3JhdGlvbiBUZXN0cycsICgpID0+IHtcbiAgYmVmb3JlRWFjaCgoKSA9PiB7XG4gICAgZGRiTW9jay5yZXNldCgpO1xuICB9KTtcblxuICBkZXNjcmliZSgnQ29tcGxldGUgSnVkZ2UgU2NvcmluZyBQcm9jZXNzJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgaGFuZGxlIGVuZC10by1lbmQgc2NvcmluZyB3b3JrZmxvdycsIGFzeW5jICgpID0+IHtcbiAgICAgIC8vIE1vY2sgY2F0IGxvb2t1cFxuICAgICAgZGRiTW9jay5vbihHZXRDb21tYW5kLCB7XG4gICAgICAgIFRhYmxlTmFtZTogJ3Rlc3QtdGFibGUnLFxuICAgICAgICBLZXk6IHsgUEs6ICdDQVQjY2F0LTEnLCBTSzogJ01FVEFEQVRBJyB9LFxuICAgICAgfSkucmVzb2x2ZXMoe1xuICAgICAgICBJdGVtOiB7XG4gICAgICAgICAgUEs6ICdDQVQjY2F0LTEnLFxuICAgICAgICAgIFNLOiAnTUVUQURBVEEnLFxuICAgICAgICAgIC4uLm1vY2tDYXQsXG4gICAgICAgIH0sXG4gICAgICB9KTtcblxuICAgICAgLy8gTW9jayBleGlzdGluZyBzY29yZXMgY2hlY2tcbiAgICAgIGRkYk1vY2sub24oUXVlcnlDb21tYW5kLCB7XG4gICAgICAgIFRhYmxlTmFtZTogJ3Rlc3QtdGFibGUnLFxuICAgICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiAnUEsgPSA6cGsgQU5EIGJlZ2luc193aXRoKFNLLCA6c2spJyxcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xuICAgICAgICAgICc6cGsnOiAnQ0FUI2NhdC0xJyxcbiAgICAgICAgICAnOnNrJzogJ1NDT1JFIycsXG4gICAgICAgIH0sXG4gICAgICB9KS5yZXNvbHZlcyh7XG4gICAgICAgIEl0ZW1zOiBbXSxcbiAgICAgIH0pO1xuXG4gICAgICAvLyBNb2NrIHNjb3JlIGNyZWF0aW9uXG4gICAgICBkZGJNb2NrLm9uKFB1dENvbW1hbmQpLnJlc29sdmVzKHt9KTtcblxuICAgICAgY29uc3QgY3JlYXRlU2NvcmVFdmVudCA9IHtcbiAgICAgICAgaW5mbzoge1xuICAgICAgICAgIGZpZWxkTmFtZTogJ2NyZWF0ZVNjb3JlJyxcbiAgICAgICAgfSxcbiAgICAgICAgYXJndW1lbnRzOiB7XG4gICAgICAgICAgaW5wdXQ6IHtcbiAgICAgICAgICAgIGNhdElkOiAnY2F0LTEnLFxuICAgICAgICAgICAgY2FnZUNvbmRpdGlvblNjb3JlOiAyMCxcbiAgICAgICAgICAgIGNhZ2VDb25kaXRpb25Db21tZW50czogJ0NsZWFuIGFuZCBvcmdhbml6ZWQnLFxuICAgICAgICAgICAgY2F0Q29uZGl0aW9uU2NvcmU6IDIyLFxuICAgICAgICAgICAgY2F0Q29uZGl0aW9uQ29tbWVudHM6ICdIZWFsdGh5IGFuZCBhbGVydCcsXG4gICAgICAgICAgICBncm9vbWluZ1Njb3JlOiAxOCxcbiAgICAgICAgICAgIGdyb29taW5nQ29tbWVudHM6ICdXZWxsIGdyb29tZWQnLFxuICAgICAgICAgICAgb3ZlcmFsbFNjb3JlOiAyMSxcbiAgICAgICAgICAgIG92ZXJhbGxDb21tZW50czogJ0V4Y2VsbGVudCBwcmVzZW50YXRpb24nLFxuICAgICAgICAgICAgaXNGaW5hbGl6ZWQ6IGZhbHNlLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIGlkZW50aXR5OiB7XG4gICAgICAgICAgc3ViOiAnanVkZ2UtMScsXG4gICAgICAgICAgJ2N1c3RvbTpyb2xlJzogJ2p1ZGdlJyxcbiAgICAgICAgICAnY3VzdG9tOm5hbWUnOiAnSnVkZ2UgU21pdGgnLFxuICAgICAgICB9LFxuICAgICAgfTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2NvcmVSZXNvbHZlckhhbmRsZXIoY3JlYXRlU2NvcmVFdmVudCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvTWF0Y2hPYmplY3Qoe1xuICAgICAgICBpZDogZXhwZWN0LmFueShTdHJpbmcpLFxuICAgICAgICBjYXRJZDogJ2NhdC0xJyxcbiAgICAgICAganVkZ2VJZDogJ2p1ZGdlLTEnLFxuICAgICAgICBqdWRnZU5hbWU6ICdKdWRnZSBTbWl0aCcsXG4gICAgICAgIHRvdGFsU2NvcmU6IDgxLFxuICAgICAgICBpc0ZpbmFsaXplZDogZmFsc2UsXG4gICAgICB9KTtcblxuICAgICAgLy8gVmVyaWZ5IER5bmFtb0RCIG9wZXJhdGlvbnNcbiAgICAgIGV4cGVjdChkZGJNb2NrLmNvbW1hbmRDYWxscyhQdXRDb21tYW5kKSkudG9IYXZlTGVuZ3RoKDMpOyAvLyBNYWluIHJlY29yZCArIDIgaW5kZXhlc1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBwcmV2ZW50IGR1cGxpY2F0ZSBzY29yaW5nIGJ5IHNhbWUganVkZ2UnLCBhc3luYyAoKSA9PiB7XG4gICAgICAvLyBNb2NrIGV4aXN0aW5nIHNjb3JlIGJ5IHNhbWUganVkZ2VcbiAgICAgIGRkYk1vY2sub24oUXVlcnlDb21tYW5kLCB7XG4gICAgICAgIFRhYmxlTmFtZTogJ3Rlc3QtdGFibGUnLFxuICAgICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiAnUEsgPSA6cGsgQU5EIGJlZ2luc193aXRoKFNLLCA6c2spJyxcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xuICAgICAgICAgICc6cGsnOiAnQ0FUI2NhdC0xJyxcbiAgICAgICAgICAnOnNrJzogJ1NDT1JFIycsXG4gICAgICAgIH0sXG4gICAgICB9KS5yZXNvbHZlcyh7XG4gICAgICAgIEl0ZW1zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgUEs6ICdDQVQjY2F0LTEnLFxuICAgICAgICAgICAgU0s6ICdTQ09SRSNzY29yZS0xJyxcbiAgICAgICAgICAgIGp1ZGdlSWQ6ICdqdWRnZS0xJyxcbiAgICAgICAgICAgIC4uLm1vY2tTY29yZTEsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBjcmVhdGVTY29yZUV2ZW50ID0ge1xuICAgICAgICBpbmZvOiB7XG4gICAgICAgICAgZmllbGROYW1lOiAnY3JlYXRlU2NvcmUnLFxuICAgICAgICB9LFxuICAgICAgICBhcmd1bWVudHM6IHtcbiAgICAgICAgICBpbnB1dDoge1xuICAgICAgICAgICAgY2F0SWQ6ICdjYXQtMScsXG4gICAgICAgICAgICBjYWdlQ29uZGl0aW9uU2NvcmU6IDI1LFxuICAgICAgICAgICAgY2FnZUNvbmRpdGlvbkNvbW1lbnRzOiAnVXBkYXRlZCBzY29yZScsXG4gICAgICAgICAgICBjYXRDb25kaXRpb25TY29yZTogMjUsXG4gICAgICAgICAgICBjYXRDb25kaXRpb25Db21tZW50czogJ1VwZGF0ZWQnLFxuICAgICAgICAgICAgZ3Jvb21pbmdTY29yZTogMjUsXG4gICAgICAgICAgICBncm9vbWluZ0NvbW1lbnRzOiAnVXBkYXRlZCcsXG4gICAgICAgICAgICBvdmVyYWxsU2NvcmU6IDI1LFxuICAgICAgICAgICAgb3ZlcmFsbENvbW1lbnRzOiAnVXBkYXRlZCcsXG4gICAgICAgICAgICBpc0ZpbmFsaXplZDogZmFsc2UsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgaWRlbnRpdHk6IHtcbiAgICAgICAgICBzdWI6ICdqdWRnZS0xJyxcbiAgICAgICAgICAnY3VzdG9tOnJvbGUnOiAnanVkZ2UnLFxuICAgICAgICAgICdjdXN0b206bmFtZSc6ICdKdWRnZSBTbWl0aCcsXG4gICAgICAgIH0sXG4gICAgICB9O1xuXG4gICAgICBhd2FpdCBleHBlY3Qoc2NvcmVSZXNvbHZlckhhbmRsZXIoY3JlYXRlU2NvcmVFdmVudCkpLnJlamVjdHMudG9UaHJvdyhcbiAgICAgICAgJ1lvdSBoYXZlIGFscmVhZHkgc2NvcmVkIHRoaXMgY2F0J1xuICAgICAgKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgaGFuZGxlIHNjb3JlIHVwZGF0ZXMgd2l0aCBhdWRpdCB0cmFpbCcsIGFzeW5jICgpID0+IHtcbiAgICAgIC8vIE1vY2sgZXhpc3Rpbmcgc2NvcmVcbiAgICAgIGRkYk1vY2sub24oR2V0Q29tbWFuZCwge1xuICAgICAgICBUYWJsZU5hbWU6ICd0ZXN0LXRhYmxlJyxcbiAgICAgICAgS2V5OiB7IFBLOiAnU0NPUkUjc2NvcmUtMScsIFNLOiAnTUVUQURBVEEnIH0sXG4gICAgICB9KS5yZXNvbHZlcyh7XG4gICAgICAgIEl0ZW06IHtcbiAgICAgICAgICBQSzogJ1NDT1JFI3Njb3JlLTEnLFxuICAgICAgICAgIFNLOiAnTUVUQURBVEEnLFxuICAgICAgICAgIC4uLm1vY2tTY29yZTEsXG4gICAgICAgIH0sXG4gICAgICB9KTtcblxuICAgICAgLy8gTW9jayB1cGRhdGUgb3BlcmF0aW9uc1xuICAgICAgZGRiTW9jay5vbihQdXRDb21tYW5kKS5yZXNvbHZlcyh7fSk7XG5cbiAgICAgIGNvbnN0IHVwZGF0ZVNjb3JlRXZlbnQgPSB7XG4gICAgICAgIGluZm86IHtcbiAgICAgICAgICBmaWVsZE5hbWU6ICd1cGRhdGVTY29yZScsXG4gICAgICAgIH0sXG4gICAgICAgIGFyZ3VtZW50czoge1xuICAgICAgICAgIGlkOiAnc2NvcmUtMScsXG4gICAgICAgICAgaW5wdXQ6IHtcbiAgICAgICAgICAgIGNhZ2VDb25kaXRpb25TY29yZTogMjUsXG4gICAgICAgICAgICBjYWdlQ29uZGl0aW9uQ29tbWVudHM6ICdVcGRhdGVkIHRvIGV4Y2VwdGlvbmFsJyxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICBpZGVudGl0eToge1xuICAgICAgICAgIHN1YjogJ2p1ZGdlLTEnLFxuICAgICAgICAgICdjdXN0b206cm9sZSc6ICdqdWRnZScsXG4gICAgICAgICAgJ2N1c3RvbTpuYW1lJzogJ0p1ZGdlIFNtaXRoJyxcbiAgICAgICAgfSxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNjb3JlUmVzb2x2ZXJIYW5kbGVyKHVwZGF0ZVNjb3JlRXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0KS50b01hdGNoT2JqZWN0KHtcbiAgICAgICAgaWQ6ICdzY29yZS0xJyxcbiAgICAgICAgY2FnZUNvbmRpdGlvblNjb3JlOiAyNSxcbiAgICAgICAgY2FnZUNvbmRpdGlvbkNvbW1lbnRzOiAnVXBkYXRlZCB0byBleGNlcHRpb25hbCcsXG4gICAgICAgIHRvdGFsU2NvcmU6IDg2LCAvLyBSZWNhbGN1bGF0ZWQgdG90YWxcbiAgICAgIH0pO1xuXG4gICAgICAvLyBWZXJpZnkgYXVkaXQgdHJhaWwgY3JlYXRpb25cbiAgICAgIGNvbnN0IGF1ZGl0Q2FsbHMgPSBkZGJNb2NrLmNvbW1hbmRDYWxscyhQdXRDb21tYW5kKS5maWx0ZXIoY2FsbCA9PiBcbiAgICAgICAgY2FsbC5hcmdzWzBdLmlucHV0Lkl0ZW0uUEsuc3RhcnRzV2l0aCgnQVVESVQjJylcbiAgICAgICk7XG4gICAgICBleHBlY3QoYXVkaXRDYWxscykudG9IYXZlTGVuZ3RoKDEpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnTXVsdGktSnVkZ2UgU2NlbmFyaW9zJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgaGFuZGxlIG11bHRpcGxlIGp1ZGdlcyBzY29yaW5nIHNhbWUgY2F0JywgYXN5bmMgKCkgPT4ge1xuICAgICAgLy8gTW9jayBjYXQgd2l0aCBleGlzdGluZyBzY29yZXNcbiAgICAgIGRkYk1vY2sub24oUXVlcnlDb21tYW5kLCB7XG4gICAgICAgIFRhYmxlTmFtZTogJ3Rlc3QtdGFibGUnLFxuICAgICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiAnUEsgPSA6cGsgQU5EIGJlZ2luc193aXRoKFNLLCA6c2spJyxcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xuICAgICAgICAgICc6cGsnOiAnQ0FUI2NhdC0xJyxcbiAgICAgICAgICAnOnNrJzogJ1NDT1JFIycsXG4gICAgICAgIH0sXG4gICAgICB9KS5yZXNvbHZlcyh7XG4gICAgICAgIEl0ZW1zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgUEs6ICdDQVQjY2F0LTEnLFxuICAgICAgICAgICAgU0s6ICdTQ09SRSNzY29yZS0xJyxcbiAgICAgICAgICAgIGp1ZGdlSWQ6ICdqdWRnZS0xJyxcbiAgICAgICAgICAgIC4uLm1vY2tTY29yZTEsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0pO1xuXG4gICAgICAvLyBNb2NrIHNjb3JlIGNyZWF0aW9uIGZvciBzZWNvbmQganVkZ2VcbiAgICAgIGRkYk1vY2sub24oUHV0Q29tbWFuZCkucmVzb2x2ZXMoe30pO1xuXG4gICAgICBjb25zdCBjcmVhdGVTY29yZUV2ZW50ID0ge1xuICAgICAgICBpbmZvOiB7XG4gICAgICAgICAgZmllbGROYW1lOiAnY3JlYXRlU2NvcmUnLFxuICAgICAgICB9LFxuICAgICAgICBhcmd1bWVudHM6IHtcbiAgICAgICAgICBpbnB1dDoge1xuICAgICAgICAgICAgY2F0SWQ6ICdjYXQtMScsXG4gICAgICAgICAgICBjYWdlQ29uZGl0aW9uU2NvcmU6IDIzLFxuICAgICAgICAgICAgY2FnZUNvbmRpdGlvbkNvbW1lbnRzOiAnRXhjZXB0aW9uYWwgY2FnZSBzZXR1cCcsXG4gICAgICAgICAgICBjYXRDb25kaXRpb25TY29yZTogMjAsXG4gICAgICAgICAgICBjYXRDb25kaXRpb25Db21tZW50czogJ0dvb2QgY29uZGl0aW9uJyxcbiAgICAgICAgICAgIGdyb29taW5nU2NvcmU6IDI0LFxuICAgICAgICAgICAgZ3Jvb21pbmdDb21tZW50czogJ091dHN0YW5kaW5nIGdyb29taW5nJyxcbiAgICAgICAgICAgIG92ZXJhbGxTY29yZTogMTksXG4gICAgICAgICAgICBvdmVyYWxsQ29tbWVudHM6ICdWZXJ5IGdvb2Qgb3ZlcmFsbCcsXG4gICAgICAgICAgICBpc0ZpbmFsaXplZDogZmFsc2UsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgaWRlbnRpdHk6IHtcbiAgICAgICAgICBzdWI6ICdqdWRnZS0yJyxcbiAgICAgICAgICAnY3VzdG9tOnJvbGUnOiAnanVkZ2UnLFxuICAgICAgICAgICdjdXN0b206bmFtZSc6ICdKdWRnZSBKb2huc29uJyxcbiAgICAgICAgfSxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNjb3JlUmVzb2x2ZXJIYW5kbGVyKGNyZWF0ZVNjb3JlRXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0KS50b01hdGNoT2JqZWN0KHtcbiAgICAgICAgY2F0SWQ6ICdjYXQtMScsXG4gICAgICAgIGp1ZGdlSWQ6ICdqdWRnZS0yJyxcbiAgICAgICAganVkZ2VOYW1lOiAnSnVkZ2UgSm9obnNvbicsXG4gICAgICAgIHRvdGFsU2NvcmU6IDg2LFxuICAgICAgfSk7XG5cbiAgICAgIC8vIFNob3VsZCBub3QgdGhyb3cgZHVwbGljYXRlIGVycm9yIHNpbmNlIGRpZmZlcmVudCBqdWRnZVxuICAgICAgZXhwZWN0KGRkYk1vY2suY29tbWFuZENhbGxzKFB1dENvbW1hbmQpKS50b0hhdmVMZW5ndGgoMyk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGNhbGN1bGF0ZSBhdmVyYWdlIHNjb3JlcyBmb3IgbXVsdGktanVkZ2Ugc2NlbmFyaW9zJywgYXN5bmMgKCkgPT4ge1xuICAgICAgLy8gTW9jayBtdWx0aXBsZSBzY29yZXMgZm9yIHNhbWUgY2F0XG4gICAgICBkZGJNb2NrLm9uKFF1ZXJ5Q29tbWFuZCwge1xuICAgICAgICBUYWJsZU5hbWU6ICd0ZXN0LXRhYmxlJyxcbiAgICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjogJ1BLID0gOnBrIEFORCBiZWdpbnNfd2l0aChTSywgOnNrKScsXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcbiAgICAgICAgICAnOnBrJzogJ0NBVCNjYXQtMScsXG4gICAgICAgICAgJzpzayc6ICdTQ09SRSMnLFxuICAgICAgICB9LFxuICAgICAgfSkucmVzb2x2ZXMoe1xuICAgICAgICBJdGVtczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIFBLOiAnQ0FUI2NhdC0xJyxcbiAgICAgICAgICAgIFNLOiAnU0NPUkUjc2NvcmUtMScsXG4gICAgICAgICAgICAuLi5tb2NrU2NvcmUxLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgUEs6ICdDQVQjY2F0LTEnLFxuICAgICAgICAgICAgU0s6ICdTQ09SRSNzY29yZS0yJyxcbiAgICAgICAgICAgIC4uLm1vY2tTY29yZTIsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBnZXRTY29yZXNCeUNhdEV2ZW50ID0ge1xuICAgICAgICBpbmZvOiB7XG4gICAgICAgICAgZmllbGROYW1lOiAnZ2V0U2NvcmVzQnlDYXQnLFxuICAgICAgICB9LFxuICAgICAgICBhcmd1bWVudHM6IHtcbiAgICAgICAgICBjYXRJZDogJ2NhdC0xJyxcbiAgICAgICAgfSxcbiAgICAgICAgaWRlbnRpdHk6IHtcbiAgICAgICAgICBzdWI6ICdhZG1pbi0xJyxcbiAgICAgICAgICAnY3VzdG9tOnJvbGUnOiAnYWRtaW4nLFxuICAgICAgICB9LFxuICAgICAgfTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2NvcmVSZXNvbHZlckhhbmRsZXIoZ2V0U2NvcmVzQnlDYXRFdmVudCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQuaXRlbXMpLnRvSGF2ZUxlbmd0aCgyKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuYXZlcmFnZVNjb3JlKS50b0JlKDgzLjUpOyAvLyAoODEgKyA4NikgLyAyXG4gICAgICBleHBlY3QocmVzdWx0Lml0ZW1zWzBdLnRvdGFsU2NvcmUpLnRvQmUoODEpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5pdGVtc1sxXS50b3RhbFNjb3JlKS50b0JlKDg2KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ1Njb3JlIENhbGN1bGF0aW9uIGFuZCBWYWxpZGF0aW9uJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgdmFsaWRhdGUgc2NvcmUgcmFuZ2VzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgaW52YWxpZFNjb3JlRXZlbnQgPSB7XG4gICAgICAgIGluZm86IHtcbiAgICAgICAgICBmaWVsZE5hbWU6ICdjcmVhdGVTY29yZScsXG4gICAgICAgIH0sXG4gICAgICAgIGFyZ3VtZW50czoge1xuICAgICAgICAgIGlucHV0OiB7XG4gICAgICAgICAgICBjYXRJZDogJ2NhdC0xJyxcbiAgICAgICAgICAgIGNhZ2VDb25kaXRpb25TY29yZTogMzAsIC8vIEludmFsaWQ6ID4gMjVcbiAgICAgICAgICAgIGNhZ2VDb25kaXRpb25Db21tZW50czogJ1Rlc3QnLFxuICAgICAgICAgICAgY2F0Q29uZGl0aW9uU2NvcmU6IC01LCAvLyBJbnZhbGlkOiA8IDBcbiAgICAgICAgICAgIGNhdENvbmRpdGlvbkNvbW1lbnRzOiAnVGVzdCcsXG4gICAgICAgICAgICBncm9vbWluZ1Njb3JlOiAxNSxcbiAgICAgICAgICAgIGdyb29taW5nQ29tbWVudHM6ICdUZXN0JyxcbiAgICAgICAgICAgIG92ZXJhbGxTY29yZTogMjAsXG4gICAgICAgICAgICBvdmVyYWxsQ29tbWVudHM6ICdUZXN0JyxcbiAgICAgICAgICAgIGlzRmluYWxpemVkOiBmYWxzZSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICBpZGVudGl0eToge1xuICAgICAgICAgIHN1YjogJ2p1ZGdlLTEnLFxuICAgICAgICAgICdjdXN0b206cm9sZSc6ICdqdWRnZScsXG4gICAgICAgICAgJ2N1c3RvbTpuYW1lJzogJ0p1ZGdlIFNtaXRoJyxcbiAgICAgICAgfSxcbiAgICAgIH07XG5cbiAgICAgIGF3YWl0IGV4cGVjdChzY29yZVJlc29sdmVySGFuZGxlcihpbnZhbGlkU2NvcmVFdmVudCkpLnJlamVjdHMudG9UaHJvdyhcbiAgICAgICAgJ1Njb3JlIHZhbGlkYXRpb24gZmFpbGVkJ1xuICAgICAgKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgY2FsY3VsYXRlIHRvdGFsIHNjb3JlcyBjb3JyZWN0bHknLCBhc3luYyAoKSA9PiB7XG4gICAgICBkZGJNb2NrLm9uKEdldENvbW1hbmQpLnJlc29sdmVzKHsgSXRlbTogbnVsbCB9KTtcbiAgICAgIGRkYk1vY2sub24oUXVlcnlDb21tYW5kKS5yZXNvbHZlcyh7IEl0ZW1zOiBbXSB9KTtcbiAgICAgIGRkYk1vY2sub24oUHV0Q29tbWFuZCkucmVzb2x2ZXMoe30pO1xuXG4gICAgICBjb25zdCBjcmVhdGVTY29yZUV2ZW50ID0ge1xuICAgICAgICBpbmZvOiB7XG4gICAgICAgICAgZmllbGROYW1lOiAnY3JlYXRlU2NvcmUnLFxuICAgICAgICB9LFxuICAgICAgICBhcmd1bWVudHM6IHtcbiAgICAgICAgICBpbnB1dDoge1xuICAgICAgICAgICAgY2F0SWQ6ICdjYXQtMScsXG4gICAgICAgICAgICBjYWdlQ29uZGl0aW9uU2NvcmU6IDI1LFxuICAgICAgICAgICAgY2FnZUNvbmRpdGlvbkNvbW1lbnRzOiAnUGVyZmVjdCcsXG4gICAgICAgICAgICBjYXRDb25kaXRpb25TY29yZTogMjUsXG4gICAgICAgICAgICBjYXRDb25kaXRpb25Db21tZW50czogJ1BlcmZlY3QnLFxuICAgICAgICAgICAgZ3Jvb21pbmdTY29yZTogMjUsXG4gICAgICAgICAgICBncm9vbWluZ0NvbW1lbnRzOiAnUGVyZmVjdCcsXG4gICAgICAgICAgICBvdmVyYWxsU2NvcmU6IDI1LFxuICAgICAgICAgICAgb3ZlcmFsbENvbW1lbnRzOiAnUGVyZmVjdCcsXG4gICAgICAgICAgICBpc0ZpbmFsaXplZDogZmFsc2UsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgaWRlbnRpdHk6IHtcbiAgICAgICAgICBzdWI6ICdqdWRnZS0xJyxcbiAgICAgICAgICAnY3VzdG9tOnJvbGUnOiAnanVkZ2UnLFxuICAgICAgICAgICdjdXN0b206bmFtZSc6ICdKdWRnZSBTbWl0aCcsXG4gICAgICAgIH0sXG4gICAgICB9O1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBzY29yZVJlc29sdmVySGFuZGxlcihjcmVhdGVTY29yZUV2ZW50KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdC50b3RhbFNjb3JlKS50b0JlKDEwMCk7XG4gICAgICBleHBlY3QocmVzdWx0LmNhZ2VDb25kaXRpb25TY29yZSkudG9CZSgyNSk7XG4gICAgICBleHBlY3QocmVzdWx0LmNhdENvbmRpdGlvblNjb3JlKS50b0JlKDI1KTtcbiAgICAgIGV4cGVjdChyZXN1bHQuZ3Jvb21pbmdTY29yZSkudG9CZSgyNSk7XG4gICAgICBleHBlY3QocmVzdWx0Lm92ZXJhbGxTY29yZSkudG9CZSgyNSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHZhbGlkYXRlIGNvbW1lbnQgbGVuZ3RoIGxpbWl0cycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGxvbmdDb21tZW50ID0gJ3gnLnJlcGVhdCg1MDEpOyAvLyBFeGNlZWRzIDUwMCBjaGFyIGxpbWl0XG5cbiAgICAgIGNvbnN0IGludmFsaWRDb21tZW50RXZlbnQgPSB7XG4gICAgICAgIGluZm86IHtcbiAgICAgICAgICBmaWVsZE5hbWU6ICdjcmVhdGVTY29yZScsXG4gICAgICAgIH0sXG4gICAgICAgIGFyZ3VtZW50czoge1xuICAgICAgICAgIGlucHV0OiB7XG4gICAgICAgICAgICBjYXRJZDogJ2NhdC0xJyxcbiAgICAgICAgICAgIGNhZ2VDb25kaXRpb25TY29yZTogMjAsXG4gICAgICAgICAgICBjYWdlQ29uZGl0aW9uQ29tbWVudHM6IGxvbmdDb21tZW50LFxuICAgICAgICAgICAgY2F0Q29uZGl0aW9uU2NvcmU6IDIwLFxuICAgICAgICAgICAgY2F0Q29uZGl0aW9uQ29tbWVudHM6ICdWYWxpZCBjb21tZW50JyxcbiAgICAgICAgICAgIGdyb29taW5nU2NvcmU6IDIwLFxuICAgICAgICAgICAgZ3Jvb21pbmdDb21tZW50czogJ1ZhbGlkIGNvbW1lbnQnLFxuICAgICAgICAgICAgb3ZlcmFsbFNjb3JlOiAyMCxcbiAgICAgICAgICAgIG92ZXJhbGxDb21tZW50czogJ1ZhbGlkIGNvbW1lbnQnLFxuICAgICAgICAgICAgaXNGaW5hbGl6ZWQ6IGZhbHNlLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIGlkZW50aXR5OiB7XG4gICAgICAgICAgc3ViOiAnanVkZ2UtMScsXG4gICAgICAgICAgJ2N1c3RvbTpyb2xlJzogJ2p1ZGdlJyxcbiAgICAgICAgICAnY3VzdG9tOm5hbWUnOiAnSnVkZ2UgU21pdGgnLFxuICAgICAgICB9LFxuICAgICAgfTtcblxuICAgICAgYXdhaXQgZXhwZWN0KHNjb3JlUmVzb2x2ZXJIYW5kbGVyKGludmFsaWRDb21tZW50RXZlbnQpKS5yZWplY3RzLnRvVGhyb3coXG4gICAgICAgICdDb21tZW50IGV4Y2VlZHMgbWF4aW11bSBsZW5ndGgnXG4gICAgICApO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnUmVwb3J0IEdlbmVyYXRpb24gYW5kIEV4cG9ydCcsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIGdlbmVyYXRlIGNvbXByZWhlbnNpdmUgc2NvcmluZyByZXBvcnRzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgLy8gTW9jayBhbGwgc2NvcmVzIHF1ZXJ5XG4gICAgICBkZGJNb2NrLm9uKFF1ZXJ5Q29tbWFuZCwge1xuICAgICAgICBUYWJsZU5hbWU6ICd0ZXN0LXRhYmxlJyxcbiAgICAgICAgSW5kZXhOYW1lOiAnR1NJMScsXG4gICAgICAgIEtleUNvbmRpdGlvbkV4cHJlc3Npb246ICdHU0kxUEsgPSA6cGsnLFxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XG4gICAgICAgICAgJzpwayc6ICdTQ09SRScsXG4gICAgICAgIH0sXG4gICAgICB9KS5yZXNvbHZlcyh7XG4gICAgICAgIEl0ZW1zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgUEs6ICdTQ09SRSNzY29yZS0xJyxcbiAgICAgICAgICAgIFNLOiAnTUVUQURBVEEnLFxuICAgICAgICAgICAgR1NJMVBLOiAnU0NPUkUnLFxuICAgICAgICAgICAgR1NJMVNLOiAnVE9UQUwjMDgxJyxcbiAgICAgICAgICAgIC4uLm1vY2tTY29yZTEsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBQSzogJ1NDT1JFI3Njb3JlLTInLFxuICAgICAgICAgICAgU0s6ICdNRVRBREFUQScsXG4gICAgICAgICAgICBHU0kxUEs6ICdTQ09SRScsXG4gICAgICAgICAgICBHU0kxU0s6ICdUT1RBTCMwODYnLFxuICAgICAgICAgICAgLi4ubW9ja1Njb3JlMixcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IGxpc3RBbGxTY29yZXNFdmVudCA9IHtcbiAgICAgICAgaW5mbzoge1xuICAgICAgICAgIGZpZWxkTmFtZTogJ2xpc3RBbGxTY29yZXMnLFxuICAgICAgICB9LFxuICAgICAgICBhcmd1bWVudHM6IHt9LFxuICAgICAgICBpZGVudGl0eToge1xuICAgICAgICAgIHN1YjogJ2FkbWluLTEnLFxuICAgICAgICAgICdjdXN0b206cm9sZSc6ICdhZG1pbicsXG4gICAgICAgIH0sXG4gICAgICB9O1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBzY29yZVJlc29sdmVySGFuZGxlcihsaXN0QWxsU2NvcmVzRXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0Lml0ZW1zKS50b0hhdmVMZW5ndGgoMik7XG4gICAgICAvLyBTaG91bGQgYmUgc29ydGVkIGJ5IHRvdGFsIHNjb3JlIGRlc2NlbmRpbmdcbiAgICAgIGV4cGVjdChyZXN1bHQuaXRlbXNbMF0udG90YWxTY29yZSkudG9CZSg4Nik7XG4gICAgICBleHBlY3QocmVzdWx0Lml0ZW1zWzFdLnRvdGFsU2NvcmUpLnRvQmUoODEpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBmaWx0ZXIgcmVwb3J0cyBieSBqdWRnZScsIGFzeW5jICgpID0+IHtcbiAgICAgIC8vIE1vY2sganVkZ2Utc3BlY2lmaWMgc2NvcmVzIHF1ZXJ5XG4gICAgICBkZGJNb2NrLm9uKFF1ZXJ5Q29tbWFuZCwge1xuICAgICAgICBUYWJsZU5hbWU6ICd0ZXN0LXRhYmxlJyxcbiAgICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjogJ1BLID0gOnBrIEFORCBiZWdpbnNfd2l0aChTSywgOnNrKScsXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcbiAgICAgICAgICAnOnBrJzogJ0pVREdFI2p1ZGdlLTEnLFxuICAgICAgICAgICc6c2snOiAnU0NPUkUjJyxcbiAgICAgICAgfSxcbiAgICAgIH0pLnJlc29sdmVzKHtcbiAgICAgICAgSXRlbXM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBQSzogJ0pVREdFI2p1ZGdlLTEnLFxuICAgICAgICAgICAgU0s6ICdTQ09SRSNzY29yZS0xJyxcbiAgICAgICAgICAgIC4uLm1vY2tTY29yZTEsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBnZXRTY29yZXNCeUp1ZGdlRXZlbnQgPSB7XG4gICAgICAgIGluZm86IHtcbiAgICAgICAgICBmaWVsZE5hbWU6ICdnZXRTY29yZXNCeUp1ZGdlJyxcbiAgICAgICAgfSxcbiAgICAgICAgYXJndW1lbnRzOiB7XG4gICAgICAgICAganVkZ2VJZDogJ2p1ZGdlLTEnLFxuICAgICAgICB9LFxuICAgICAgICBpZGVudGl0eToge1xuICAgICAgICAgIHN1YjogJ2FkbWluLTEnLFxuICAgICAgICAgICdjdXN0b206cm9sZSc6ICdhZG1pbicsXG4gICAgICAgIH0sXG4gICAgICB9O1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBzY29yZVJlc29sdmVySGFuZGxlcihnZXRTY29yZXNCeUp1ZGdlRXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0Lml0ZW1zKS50b0hhdmVMZW5ndGgoMSk7XG4gICAgICBleHBlY3QocmVzdWx0Lml0ZW1zWzBdLmp1ZGdlSWQpLnRvQmUoJ2p1ZGdlLTEnKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuaXRlbXNbMF0uanVkZ2VOYW1lKS50b0JlKCdKdWRnZSBTbWl0aCcpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBnZW5lcmF0ZSBDU1YgZXhwb3J0IGRhdGEnLCBhc3luYyAoKSA9PiB7XG4gICAgICBkZGJNb2NrLm9uKFF1ZXJ5Q29tbWFuZCkucmVzb2x2ZXMoe1xuICAgICAgICBJdGVtczogW21vY2tTY29yZTEsIG1vY2tTY29yZTJdLFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IGV4cG9ydFNjb3Jlc0V2ZW50ID0ge1xuICAgICAgICBpbmZvOiB7XG4gICAgICAgICAgZmllbGROYW1lOiAnZXhwb3J0U2NvcmVzJyxcbiAgICAgICAgfSxcbiAgICAgICAgYXJndW1lbnRzOiB7XG4gICAgICAgICAgZm9ybWF0OiAnQ1NWJyxcbiAgICAgICAgfSxcbiAgICAgICAgaWRlbnRpdHk6IHtcbiAgICAgICAgICBzdWI6ICdhZG1pbi0xJyxcbiAgICAgICAgICAnY3VzdG9tOnJvbGUnOiAnYWRtaW4nLFxuICAgICAgICB9LFxuICAgICAgfTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2NvcmVSZXNvbHZlckhhbmRsZXIoZXhwb3J0U2NvcmVzRXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0LmZvcm1hdCkudG9CZSgnQ1NWJyk7XG4gICAgICBleHBlY3QocmVzdWx0LmRhdGEpLnRvQ29udGFpbignQ2F0IE5hbWUsSnVkZ2UsQ2FnZSBDb25kaXRpb24sQ2F0IENvbmRpdGlvbixHcm9vbWluZyxPdmVyYWxsLFRvdGFsJyk7XG4gICAgICBleHBlY3QocmVzdWx0LmRhdGEpLnRvQ29udGFpbignSnVkZ2UgU21pdGgsMjAsMjIsMTgsMjEsODEnKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuZGF0YSkudG9Db250YWluKCdKdWRnZSBKb2huc29uLDIzLDIwLDI0LDE5LDg2Jyk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdSb2xlLUJhc2VkIEFjY2VzcyBDb250cm9sJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgZW5mb3JjZSBqdWRnZSByb2xlIGZvciBzY29yaW5nIG9wZXJhdGlvbnMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBub25KdWRnZUV2ZW50ID0ge1xuICAgICAgICBpbmZvOiB7XG4gICAgICAgICAgZmllbGROYW1lOiAnY3JlYXRlU2NvcmUnLFxuICAgICAgICB9LFxuICAgICAgICBhcmd1bWVudHM6IHtcbiAgICAgICAgICBpbnB1dDoge1xuICAgICAgICAgICAgY2F0SWQ6ICdjYXQtMScsXG4gICAgICAgICAgICBjYWdlQ29uZGl0aW9uU2NvcmU6IDIwLFxuICAgICAgICAgICAgY2F0Q29uZGl0aW9uU2NvcmU6IDIwLFxuICAgICAgICAgICAgZ3Jvb21pbmdTY29yZTogMjAsXG4gICAgICAgICAgICBvdmVyYWxsU2NvcmU6IDIwLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIGlkZW50aXR5OiB7XG4gICAgICAgICAgc3ViOiAndXNlci0xJyxcbiAgICAgICAgICAnY3VzdG9tOnJvbGUnOiAncGFydGljaXBhbnQnLFxuICAgICAgICB9LFxuICAgICAgfTtcblxuICAgICAgYXdhaXQgZXhwZWN0KHNjb3JlUmVzb2x2ZXJIYW5kbGVyKG5vbkp1ZGdlRXZlbnQpKS5yZWplY3RzLnRvVGhyb3coXG4gICAgICAgICdBY2Nlc3MgZGVuaWVkOiBKdWRnZSByb2xlIHJlcXVpcmVkJ1xuICAgICAgKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgZW5mb3JjZSBhZG1pbiByb2xlIGZvciBjb21wcmVoZW5zaXZlIHJlcG9ydHMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBqdWRnZUV2ZW50ID0ge1xuICAgICAgICBpbmZvOiB7XG4gICAgICAgICAgZmllbGROYW1lOiAnbGlzdEFsbFNjb3JlcycsXG4gICAgICAgIH0sXG4gICAgICAgIGFyZ3VtZW50czoge30sXG4gICAgICAgIGlkZW50aXR5OiB7XG4gICAgICAgICAgc3ViOiAnanVkZ2UtMScsXG4gICAgICAgICAgJ2N1c3RvbTpyb2xlJzogJ2p1ZGdlJyxcbiAgICAgICAgfSxcbiAgICAgIH07XG5cbiAgICAgIGF3YWl0IGV4cGVjdChzY29yZVJlc29sdmVySGFuZGxlcihqdWRnZUV2ZW50KSkucmVqZWN0cy50b1Rocm93KFxuICAgICAgICAnQWNjZXNzIGRlbmllZDogQWRtaW4gcm9sZSByZXF1aXJlZCdcbiAgICAgICk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGFsbG93IGp1ZGdlcyB0byB2aWV3IHRoZWlyIG93biBzY29yZXMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBkZGJNb2NrLm9uKFF1ZXJ5Q29tbWFuZCkucmVzb2x2ZXMoe1xuICAgICAgICBJdGVtczogW21vY2tTY29yZTFdLFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IGp1ZGdlT3duU2NvcmVzRXZlbnQgPSB7XG4gICAgICAgIGluZm86IHtcbiAgICAgICAgICBmaWVsZE5hbWU6ICdnZXRTY29yZXNCeUp1ZGdlJyxcbiAgICAgICAgfSxcbiAgICAgICAgYXJndW1lbnRzOiB7XG4gICAgICAgICAganVkZ2VJZDogJ2p1ZGdlLTEnLFxuICAgICAgICB9LFxuICAgICAgICBpZGVudGl0eToge1xuICAgICAgICAgIHN1YjogJ2p1ZGdlLTEnLFxuICAgICAgICAgICdjdXN0b206cm9sZSc6ICdqdWRnZScsXG4gICAgICAgIH0sXG4gICAgICB9O1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBzY29yZVJlc29sdmVySGFuZGxlcihqdWRnZU93blNjb3Jlc0V2ZW50KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdC5pdGVtcykudG9IYXZlTGVuZ3RoKDEpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5pdGVtc1swXS5qdWRnZUlkKS50b0JlKCdqdWRnZS0xJyk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHByZXZlbnQganVkZ2VzIGZyb20gdmlld2luZyBvdGhlciBqdWRnZXMgc2NvcmVzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QganVkZ2VPdGhlclNjb3Jlc0V2ZW50ID0ge1xuICAgICAgICBpbmZvOiB7XG4gICAgICAgICAgZmllbGROYW1lOiAnZ2V0U2NvcmVzQnlKdWRnZScsXG4gICAgICAgIH0sXG4gICAgICAgIGFyZ3VtZW50czoge1xuICAgICAgICAgIGp1ZGdlSWQ6ICdqdWRnZS0yJyxcbiAgICAgICAgfSxcbiAgICAgICAgaWRlbnRpdHk6IHtcbiAgICAgICAgICBzdWI6ICdqdWRnZS0xJyxcbiAgICAgICAgICAnY3VzdG9tOnJvbGUnOiAnanVkZ2UnLFxuICAgICAgICB9LFxuICAgICAgfTtcblxuICAgICAgYXdhaXQgZXhwZWN0KHNjb3JlUmVzb2x2ZXJIYW5kbGVyKGp1ZGdlT3RoZXJTY29yZXNFdmVudCkpLnJlamVjdHMudG9UaHJvdyhcbiAgICAgICAgJ0FjY2VzcyBkZW5pZWQ6IENhbm5vdCB2aWV3IG90aGVyIGp1ZGdlcyBzY29yZXMnXG4gICAgICApO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnRXJyb3IgSGFuZGxpbmcgYW5kIEVkZ2UgQ2FzZXMnLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCBoYW5kbGUgRHluYW1vREIgZXJyb3JzIGdyYWNlZnVsbHknLCBhc3luYyAoKSA9PiB7XG4gICAgICBkZGJNb2NrLm9uKFB1dENvbW1hbmQpLnJlamVjdHMobmV3IEVycm9yKCdEeW5hbW9EQiBzZXJ2aWNlIHVuYXZhaWxhYmxlJykpO1xuXG4gICAgICBjb25zdCBjcmVhdGVTY29yZUV2ZW50ID0ge1xuICAgICAgICBpbmZvOiB7XG4gICAgICAgICAgZmllbGROYW1lOiAnY3JlYXRlU2NvcmUnLFxuICAgICAgICB9LFxuICAgICAgICBhcmd1bWVudHM6IHtcbiAgICAgICAgICBpbnB1dDoge1xuICAgICAgICAgICAgY2F0SWQ6ICdjYXQtMScsXG4gICAgICAgICAgICBjYWdlQ29uZGl0aW9uU2NvcmU6IDIwLFxuICAgICAgICAgICAgY2F0Q29uZGl0aW9uU2NvcmU6IDIwLFxuICAgICAgICAgICAgZ3Jvb21pbmdTY29yZTogMjAsXG4gICAgICAgICAgICBvdmVyYWxsU2NvcmU6IDIwLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIGlkZW50aXR5OiB7XG4gICAgICAgICAgc3ViOiAnanVkZ2UtMScsXG4gICAgICAgICAgJ2N1c3RvbTpyb2xlJzogJ2p1ZGdlJyxcbiAgICAgICAgICAnY3VzdG9tOm5hbWUnOiAnSnVkZ2UgU21pdGgnLFxuICAgICAgICB9LFxuICAgICAgfTtcblxuICAgICAgYXdhaXQgZXhwZWN0KHNjb3JlUmVzb2x2ZXJIYW5kbGVyKGNyZWF0ZVNjb3JlRXZlbnQpKS5yZWplY3RzLnRvVGhyb3coXG4gICAgICAgICdEYXRhYmFzZSBvcGVyYXRpb24gZmFpbGVkJ1xuICAgICAgKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgaGFuZGxlIG1pc3NpbmcgY2F0IHNjZW5hcmlvcycsIGFzeW5jICgpID0+IHtcbiAgICAgIGRkYk1vY2sub24oR2V0Q29tbWFuZCkucmVzb2x2ZXMoeyBJdGVtOiB1bmRlZmluZWQgfSk7XG5cbiAgICAgIGNvbnN0IGNyZWF0ZVNjb3JlRXZlbnQgPSB7XG4gICAgICAgIGluZm86IHtcbiAgICAgICAgICBmaWVsZE5hbWU6ICdjcmVhdGVTY29yZScsXG4gICAgICAgIH0sXG4gICAgICAgIGFyZ3VtZW50czoge1xuICAgICAgICAgIGlucHV0OiB7XG4gICAgICAgICAgICBjYXRJZDogJ25vbmV4aXN0ZW50LWNhdCcsXG4gICAgICAgICAgICBjYWdlQ29uZGl0aW9uU2NvcmU6IDIwLFxuICAgICAgICAgICAgY2F0Q29uZGl0aW9uU2NvcmU6IDIwLFxuICAgICAgICAgICAgZ3Jvb21pbmdTY29yZTogMjAsXG4gICAgICAgICAgICBvdmVyYWxsU2NvcmU6IDIwLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIGlkZW50aXR5OiB7XG4gICAgICAgICAgc3ViOiAnanVkZ2UtMScsXG4gICAgICAgICAgJ2N1c3RvbTpyb2xlJzogJ2p1ZGdlJyxcbiAgICAgICAgICAnY3VzdG9tOm5hbWUnOiAnSnVkZ2UgU21pdGgnLFxuICAgICAgICB9LFxuICAgICAgfTtcblxuICAgICAgYXdhaXQgZXhwZWN0KHNjb3JlUmVzb2x2ZXJIYW5kbGVyKGNyZWF0ZVNjb3JlRXZlbnQpKS5yZWplY3RzLnRvVGhyb3coXG4gICAgICAgICdDYXQgbm90IGZvdW5kJ1xuICAgICAgKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgaGFuZGxlIGNvbmN1cnJlbnQgc2NvcmUgbW9kaWZpY2F0aW9ucycsIGFzeW5jICgpID0+IHtcbiAgICAgIC8vIE1vY2sgZXhpc3Rpbmcgc2NvcmUgd2l0aCBkaWZmZXJlbnQgdGltZXN0YW1wXG4gICAgICBkZGJNb2NrLm9uKEdldENvbW1hbmQpLnJlc29sdmVzKHtcbiAgICAgICAgSXRlbToge1xuICAgICAgICAgIC4uLm1vY2tTY29yZTEsXG4gICAgICAgICAgdGltZXN0YW1wOiAnMjAyNC0wMS0xNVQxMjowMDowMFonLCAvLyBEaWZmZXJlbnQgZnJvbSBleHBlY3RlZFxuICAgICAgICB9LFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHVwZGF0ZVNjb3JlRXZlbnQgPSB7XG4gICAgICAgIGluZm86IHtcbiAgICAgICAgICBmaWVsZE5hbWU6ICd1cGRhdGVTY29yZScsXG4gICAgICAgIH0sXG4gICAgICAgIGFyZ3VtZW50czoge1xuICAgICAgICAgIGlkOiAnc2NvcmUtMScsXG4gICAgICAgICAgaW5wdXQ6IHtcbiAgICAgICAgICAgIGNhZ2VDb25kaXRpb25TY29yZTogMjUsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBleHBlY3RlZFRpbWVzdGFtcDogJzIwMjQtMDEtMTVUMTA6MDA6MDBaJywgLy8gT3JpZ2luYWwgdGltZXN0YW1wXG4gICAgICAgIH0sXG4gICAgICAgIGlkZW50aXR5OiB7XG4gICAgICAgICAgc3ViOiAnanVkZ2UtMScsXG4gICAgICAgICAgJ2N1c3RvbTpyb2xlJzogJ2p1ZGdlJyxcbiAgICAgICAgfSxcbiAgICAgIH07XG5cbiAgICAgIGF3YWl0IGV4cGVjdChzY29yZVJlc29sdmVySGFuZGxlcih1cGRhdGVTY29yZUV2ZW50KSkucmVqZWN0cy50b1Rocm93KFxuICAgICAgICAnU2NvcmUgaGFzIGJlZW4gbW9kaWZpZWQgYnkgYW5vdGhlciB1c2VyJ1xuICAgICAgKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgaGFuZGxlIHNjb3JlIGZpbmFsaXphdGlvbiBjb25mbGljdHMnLCBhc3luYyAoKSA9PiB7XG4gICAgICAvLyBNb2NrIGZpbmFsaXplZCBzY29yZVxuICAgICAgY29uc3QgZmluYWxpemVkU2NvcmUgPSB7XG4gICAgICAgIC4uLm1vY2tTY29yZTEsXG4gICAgICAgIGlzRmluYWxpemVkOiB0cnVlLFxuICAgICAgfTtcblxuICAgICAgZGRiTW9jay5vbihHZXRDb21tYW5kKS5yZXNvbHZlcyh7XG4gICAgICAgIEl0ZW06IGZpbmFsaXplZFNjb3JlLFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHVwZGF0ZUZpbmFsaXplZFNjb3JlRXZlbnQgPSB7XG4gICAgICAgIGluZm86IHtcbiAgICAgICAgICBmaWVsZE5hbWU6ICd1cGRhdGVTY29yZScsXG4gICAgICAgIH0sXG4gICAgICAgIGFyZ3VtZW50czoge1xuICAgICAgICAgIGlkOiAnc2NvcmUtMScsXG4gICAgICAgICAgaW5wdXQ6IHtcbiAgICAgICAgICAgIGNhZ2VDb25kaXRpb25TY29yZTogMjUsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgaWRlbnRpdHk6IHtcbiAgICAgICAgICBzdWI6ICdqdWRnZS0xJyxcbiAgICAgICAgICAnY3VzdG9tOnJvbGUnOiAnanVkZ2UnLFxuICAgICAgICB9LFxuICAgICAgfTtcblxuICAgICAgYXdhaXQgZXhwZWN0KHNjb3JlUmVzb2x2ZXJIYW5kbGVyKHVwZGF0ZUZpbmFsaXplZFNjb3JlRXZlbnQpKS5yZWplY3RzLnRvVGhyb3coXG4gICAgICAgICdDYW5ub3QgbW9kaWZ5IGZpbmFsaXplZCBzY29yZSdcbiAgICAgICk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdQZXJmb3JtYW5jZSBhbmQgU2NhbGFiaWxpdHknLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCBoYW5kbGUgbGFyZ2UgZGF0YXNldHMgZWZmaWNpZW50bHknLCBhc3luYyAoKSA9PiB7XG4gICAgICAvLyBNb2NrIGxhcmdlIGRhdGFzZXRcbiAgICAgIGNvbnN0IGxhcmdlU2NvcmVTZXQgPSBBcnJheS5mcm9tKHsgbGVuZ3RoOiAxMDAwIH0sIChfLCBpKSA9PiAoe1xuICAgICAgICAuLi5tb2NrU2NvcmUxLFxuICAgICAgICBpZDogYHNjb3JlLSR7aX1gLFxuICAgICAgICBqdWRnZUlkOiBganVkZ2UtJHtpICUgMTB9YCxcbiAgICAgICAgdG90YWxTY29yZTogTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwKSxcbiAgICAgIH0pKTtcblxuICAgICAgZGRiTW9jay5vbihRdWVyeUNvbW1hbmQpLnJlc29sdmVzKHtcbiAgICAgICAgSXRlbXM6IGxhcmdlU2NvcmVTZXQsXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgbGlzdEFsbFNjb3Jlc0V2ZW50ID0ge1xuICAgICAgICBpbmZvOiB7XG4gICAgICAgICAgZmllbGROYW1lOiAnbGlzdEFsbFNjb3JlcycsXG4gICAgICAgIH0sXG4gICAgICAgIGFyZ3VtZW50czoge1xuICAgICAgICAgIGxpbWl0OiA1MCxcbiAgICAgICAgICBuZXh0VG9rZW46IG51bGwsXG4gICAgICAgIH0sXG4gICAgICAgIGlkZW50aXR5OiB7XG4gICAgICAgICAgc3ViOiAnYWRtaW4tMScsXG4gICAgICAgICAgJ2N1c3RvbTpyb2xlJzogJ2FkbWluJyxcbiAgICAgICAgfSxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IHN0YXJ0ID0gRGF0ZS5ub3coKTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNjb3JlUmVzb2x2ZXJIYW5kbGVyKGxpc3RBbGxTY29yZXNFdmVudCk7XG4gICAgICBjb25zdCBkdXJhdGlvbiA9IERhdGUubm93KCkgLSBzdGFydDtcblxuICAgICAgZXhwZWN0KHJlc3VsdC5pdGVtcykudG9IYXZlTGVuZ3RoKDUwKTsgLy8gUGFnaW5hdGlvbiBsaW1pdFxuICAgICAgZXhwZWN0KHJlc3VsdC5uZXh0VG9rZW4pLnRvQmVEZWZpbmVkKCk7XG4gICAgICBleHBlY3QoZHVyYXRpb24pLnRvQmVMZXNzVGhhbig1MDAwKTsgLy8gU2hvdWxkIGNvbXBsZXRlIHdpdGhpbiA1IHNlY29uZHNcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgYmF0Y2ggRHluYW1vREIgb3BlcmF0aW9ucyBlZmZpY2llbnRseScsIGFzeW5jICgpID0+IHtcbiAgICAgIGRkYk1vY2sub24oUHV0Q29tbWFuZCkucmVzb2x2ZXMoe30pO1xuXG4gICAgICBjb25zdCBjcmVhdGVTY29yZUV2ZW50ID0ge1xuICAgICAgICBpbmZvOiB7XG4gICAgICAgICAgZmllbGROYW1lOiAnY3JlYXRlU2NvcmUnLFxuICAgICAgICB9LFxuICAgICAgICBhcmd1bWVudHM6IHtcbiAgICAgICAgICBpbnB1dDoge1xuICAgICAgICAgICAgY2F0SWQ6ICdjYXQtMScsXG4gICAgICAgICAgICBjYWdlQ29uZGl0aW9uU2NvcmU6IDIwLFxuICAgICAgICAgICAgY2F0Q29uZGl0aW9uU2NvcmU6IDIwLFxuICAgICAgICAgICAgZ3Jvb21pbmdTY29yZTogMjAsXG4gICAgICAgICAgICBvdmVyYWxsU2NvcmU6IDIwLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIGlkZW50aXR5OiB7XG4gICAgICAgICAgc3ViOiAnanVkZ2UtMScsXG4gICAgICAgICAgJ2N1c3RvbTpyb2xlJzogJ2p1ZGdlJyxcbiAgICAgICAgICAnY3VzdG9tOm5hbWUnOiAnSnVkZ2UgU21pdGgnLFxuICAgICAgICB9LFxuICAgICAgfTtcblxuICAgICAgYXdhaXQgc2NvcmVSZXNvbHZlckhhbmRsZXIoY3JlYXRlU2NvcmVFdmVudCk7XG5cbiAgICAgIC8vIFNob3VsZCBjcmVhdGUgbWFpbiByZWNvcmQgKyAyIGluZGV4IHJlY29yZHMgaW4gc2VwYXJhdGUgb3BlcmF0aW9uc1xuICAgICAgZXhwZWN0KGRkYk1vY2suY29tbWFuZENhbGxzKFB1dENvbW1hbmQpKS50b0hhdmVMZW5ndGgoMyk7XG4gICAgfSk7XG4gIH0pO1xufSk7Il19