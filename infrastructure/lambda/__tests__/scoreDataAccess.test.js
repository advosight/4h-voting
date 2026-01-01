"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const aws_sdk_client_mock_1 = require("aws-sdk-client-mock");
const scoreDataAccess_1 = require("../scoreDataAccess");
const ddbMock = (0, aws_sdk_client_mock_1.mockClient)(lib_dynamodb_1.DynamoDBDocumentClient);
describe('ScoreDataAccess', () => {
    let scoreDataAccess;
    const tableName = 'test-table';
    beforeEach(() => {
        ddbMock.reset();
        const docClient = ddbMock;
        scoreDataAccess = new scoreDataAccess_1.ScoreDataAccess(docClient, tableName);
    });
    describe('createScore', () => {
        it('should create a score with all required records', async () => {
            const input = {
                catId: 'cat-123',
                judgeId: 'judge-456',
                judgeName: 'Judge Smith',
                cageConditionScore: 20,
                cageConditionComments: 'Clean cage',
                catConditionScore: 22,
                catConditionComments: 'Healthy cat',
                groomingScore: 18,
                groomingComments: 'Well groomed',
                overallScore: 23,
                overallComments: 'Excellent presentation',
                isFinalized: false,
            };
            ddbMock.on(lib_dynamodb_1.PutCommand).resolves({});
            const result = await scoreDataAccess.createScore(input);
            expect(result).toMatchObject({
                catId: 'cat-123',
                judgeId: 'judge-456',
                judgeName: 'Judge Smith',
                cageConditionScore: 20,
                catConditionScore: 22,
                groomingScore: 18,
                overallScore: 23,
                totalScore: 83, // 20 + 22 + 18 + 23
                isFinalized: false,
            });
            expect(result.id).toBeDefined();
            expect(result.timestamp).toBeDefined();
            // Verify four PutCommand calls were made (main record + 2 index records + audit entry)
            expect(ddbMock.commandCalls(lib_dynamodb_1.PutCommand)).toHaveLength(4);
        });
        it('should calculate total score correctly', async () => {
            const input = {
                catId: 'cat-123',
                judgeId: 'judge-456',
                judgeName: 'Judge Smith',
                cageConditionScore: 25,
                catConditionScore: 25,
                groomingScore: 25,
                overallScore: 25,
            };
            ddbMock.on(lib_dynamodb_1.PutCommand).resolves({});
            const result = await scoreDataAccess.createScore(input);
            expect(result.totalScore).toBe(100);
        });
        it('should default isFinalized to false when not provided', async () => {
            const input = {
                catId: 'cat-123',
                judgeId: 'judge-456',
                judgeName: 'Judge Smith',
                cageConditionScore: 20,
                catConditionScore: 20,
                groomingScore: 20,
                overallScore: 20,
            };
            ddbMock.on(lib_dynamodb_1.PutCommand).resolves({});
            const result = await scoreDataAccess.createScore(input);
            expect(result.isFinalized).toBe(false);
        });
    });
    describe('getScore', () => {
        it('should return a score when found', async () => {
            const mockScore = {
                id: 'score-123',
                catId: 'cat-123',
                judgeId: 'judge-456',
                judgeName: 'Judge Smith',
                cageConditionScore: 20,
                cageConditionComments: 'Clean cage',
                catConditionScore: 22,
                catConditionComments: 'Healthy cat',
                groomingScore: 18,
                groomingComments: 'Well groomed',
                overallScore: 23,
                overallComments: 'Excellent presentation',
                totalScore: 83,
                timestamp: '2024-01-01T00:00:00.000Z',
                isFinalized: false,
                modificationCount: 0,
                lastModifiedBy: undefined,
                lastModifiedAt: undefined,
            };
            ddbMock.on(lib_dynamodb_1.GetCommand).resolves({ Item: mockScore });
            const result = await scoreDataAccess.getScore('score-123');
            expect(result).toEqual(mockScore);
            expect(ddbMock.commandCalls(lib_dynamodb_1.GetCommand)[0].args[0].input).toEqual({
                TableName: tableName,
                Key: { PK: 'SCORE#score-123', SK: 'METADATA' },
            });
        });
        it('should return null when score not found', async () => {
            ddbMock.on(lib_dynamodb_1.GetCommand).resolves({});
            const result = await scoreDataAccess.getScore('nonexistent-score');
            expect(result).toBeNull();
        });
    });
    describe('updateScore', () => {
        const existingScore = {
            id: 'score-123',
            catId: 'cat-123',
            judgeId: 'judge-456',
            judgeName: 'Judge Smith',
            cageConditionScore: 20,
            cageConditionComments: 'Clean cage',
            catConditionScore: 22,
            catConditionComments: 'Healthy cat',
            groomingScore: 18,
            groomingComments: 'Well groomed',
            overallScore: 23,
            overallComments: 'Excellent presentation',
            totalScore: 83,
            timestamp: '2024-01-01T00:00:00.000Z',
            isFinalized: false,
            modificationCount: 0,
            lastModifiedBy: undefined,
            lastModifiedAt: undefined,
        };
        it('should update score and recalculate total', async () => {
            ddbMock.on(lib_dynamodb_1.GetCommand).resolves({ Item: existingScore });
            ddbMock.on(lib_dynamodb_1.PutCommand).resolves({});
            const updateInput = {
                cageConditionScore: 25,
                isFinalized: true,
            };
            const result = await scoreDataAccess.updateScore('score-123', updateInput);
            expect(result.cageConditionScore).toBe(25);
            expect(result.totalScore).toBe(88); // 25 + 22 + 18 + 23
            expect(result.isFinalized).toBe(true);
            expect(result.timestamp).not.toBe(existingScore.timestamp); // Should be updated
            // Verify four PutCommand calls were made (main record + 2 index records + audit entry)
            expect(ddbMock.commandCalls(lib_dynamodb_1.PutCommand)).toHaveLength(4);
        });
        it('should throw error when score not found', async () => {
            ddbMock.on(lib_dynamodb_1.GetCommand).resolves({});
            await expect(scoreDataAccess.updateScore('nonexistent-score', { cageConditionScore: 25 })).rejects.toThrow('Score not found');
        });
    });
    describe('deleteScore', () => {
        const existingScore = {
            id: 'score-123',
            catId: 'cat-123',
            judgeId: 'judge-456',
            judgeName: 'Judge Smith',
            cageConditionScore: 20,
            cageConditionComments: undefined,
            catConditionScore: 22,
            catConditionComments: undefined,
            groomingScore: 18,
            groomingComments: undefined,
            overallScore: 23,
            overallComments: undefined,
            totalScore: 83,
            timestamp: '2024-01-01T00:00:00.000Z',
            isFinalized: false,
            modificationCount: 0,
            lastModifiedBy: undefined,
            lastModifiedAt: undefined,
        };
        it('should delete score and all index records', async () => {
            ddbMock.on(lib_dynamodb_1.GetCommand).resolves({ Item: existingScore });
            ddbMock.on(lib_dynamodb_1.DeleteCommand).resolves({});
            const result = await scoreDataAccess.deleteScore('score-123');
            expect(result).toEqual(existingScore);
            // Verify three DeleteCommand calls were made (main record + 2 index records)
            expect(ddbMock.commandCalls(lib_dynamodb_1.DeleteCommand)).toHaveLength(3);
            const deleteCalls = ddbMock.commandCalls(lib_dynamodb_1.DeleteCommand);
            expect(deleteCalls[0].args[0].input.Key).toEqual({ PK: 'SCORE#score-123', SK: 'METADATA' });
            expect(deleteCalls[1].args[0].input.Key).toEqual({ PK: 'CAT#cat-123', SK: 'SCORE#score-123' });
            expect(deleteCalls[2].args[0].input.Key).toEqual({ PK: 'JUDGE#judge-456', SK: 'SCORE#score-123' });
        });
        it('should throw error when score not found', async () => {
            ddbMock.on(lib_dynamodb_1.GetCommand).resolves({});
            await expect(scoreDataAccess.deleteScore('nonexistent-score')).rejects.toThrow('Score not found');
        });
    });
    describe('getScoresByCat', () => {
        it('should return scores for a specific cat', async () => {
            const indexItems = [
                { scoreId: 'score-1', judgeId: 'judge-1', totalScore: 85 },
                { scoreId: 'score-2', judgeId: 'judge-2', totalScore: 90 },
            ];
            const score1 = {
                id: 'score-1',
                catId: 'cat-123',
                judgeId: 'judge-1',
                judgeName: 'Judge A',
                cageConditionScore: 20,
                cageConditionComments: undefined,
                catConditionScore: 22,
                catConditionComments: undefined,
                groomingScore: 18,
                groomingComments: undefined,
                overallScore: 25,
                overallComments: undefined,
                totalScore: 85,
                timestamp: '2024-01-01T00:00:00.000Z',
                isFinalized: true,
                modificationCount: 0,
                lastModifiedBy: undefined,
                lastModifiedAt: undefined,
            };
            const score2 = {
                id: 'score-2',
                catId: 'cat-123',
                judgeId: 'judge-2',
                judgeName: 'Judge B',
                cageConditionScore: 22,
                cageConditionComments: undefined,
                catConditionScore: 23,
                catConditionComments: undefined,
                groomingScore: 20,
                groomingComments: undefined,
                overallScore: 25,
                overallComments: undefined,
                totalScore: 90,
                timestamp: '2024-01-01T01:00:00.000Z',
                isFinalized: true,
                modificationCount: 0,
                lastModifiedBy: undefined,
                lastModifiedAt: undefined,
            };
            ddbMock.on(lib_dynamodb_1.QueryCommand).resolves({ Items: indexItems });
            ddbMock.on(lib_dynamodb_1.GetCommand)
                .resolvesOnce({ Item: score1 })
                .resolvesOnce({ Item: score2 });
            const result = await scoreDataAccess.getScoresByCat('cat-123');
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(score1);
            expect(result[1]).toEqual(score2);
            expect(ddbMock.commandCalls(lib_dynamodb_1.QueryCommand)[0].args[0].input).toEqual({
                TableName: tableName,
                KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
                ExpressionAttributeValues: {
                    ':pk': 'CAT#cat-123',
                    ':sk': 'SCORE#',
                },
            });
        });
        it('should return empty array when no scores found', async () => {
            ddbMock.on(lib_dynamodb_1.QueryCommand).resolves({ Items: [] });
            const result = await scoreDataAccess.getScoresByCat('cat-123');
            expect(result).toEqual([]);
        });
    });
    describe('getScoresByJudge', () => {
        it('should return scores for a specific judge', async () => {
            const indexItems = [
                { scoreId: 'score-1', catId: 'cat-1', totalScore: 85 },
                { scoreId: 'score-2', catId: 'cat-2', totalScore: 90 },
            ];
            const score1 = {
                id: 'score-1',
                catId: 'cat-1',
                judgeId: 'judge-456',
                judgeName: 'Judge Smith',
                cageConditionScore: 20,
                cageConditionComments: undefined,
                catConditionScore: 22,
                catConditionComments: undefined,
                groomingScore: 18,
                groomingComments: undefined,
                overallScore: 25,
                overallComments: undefined,
                totalScore: 85,
                timestamp: '2024-01-01T00:00:00.000Z',
                isFinalized: true,
                modificationCount: 0,
                lastModifiedBy: undefined,
                lastModifiedAt: undefined,
            };
            const score2 = {
                id: 'score-2',
                catId: 'cat-2',
                judgeId: 'judge-456',
                judgeName: 'Judge Smith',
                cageConditionScore: 22,
                cageConditionComments: undefined,
                catConditionScore: 23,
                catConditionComments: undefined,
                groomingScore: 20,
                groomingComments: undefined,
                overallScore: 25,
                overallComments: undefined,
                totalScore: 90,
                timestamp: '2024-01-01T01:00:00.000Z',
                isFinalized: true,
                modificationCount: 0,
                lastModifiedBy: undefined,
                lastModifiedAt: undefined,
            };
            ddbMock.on(lib_dynamodb_1.QueryCommand).resolves({ Items: indexItems });
            ddbMock.on(lib_dynamodb_1.GetCommand)
                .resolvesOnce({ Item: score1 })
                .resolvesOnce({ Item: score2 });
            const result = await scoreDataAccess.getScoresByJudge('judge-456');
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(score1);
            expect(result[1]).toEqual(score2);
            expect(ddbMock.commandCalls(lib_dynamodb_1.QueryCommand)[0].args[0].input).toEqual({
                TableName: tableName,
                KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
                ExpressionAttributeValues: {
                    ':pk': 'JUDGE#judge-456',
                    ':sk': 'SCORE#',
                },
            });
        });
    });
    describe('getScoresByCage', () => {
        it('should return scores for a specific cage number', async () => {
            const catItems = [
                { PK: 'CAT#cat-123', cageNumber: 5, name: 'Fluffy' },
            ];
            const indexItems = [
                { scoreId: 'score-1', judgeId: 'judge-1', totalScore: 85 },
            ];
            const score1 = {
                id: 'score-1',
                catId: 'cat-123',
                judgeId: 'judge-1',
                judgeName: 'Judge A',
                cageConditionScore: 20,
                cageConditionComments: undefined,
                catConditionScore: 22,
                catConditionComments: undefined,
                groomingScore: 18,
                groomingComments: undefined,
                overallScore: 25,
                overallComments: undefined,
                totalScore: 85,
                timestamp: '2024-01-01T00:00:00.000Z',
                isFinalized: true,
                modificationCount: 0,
                lastModifiedBy: undefined,
                lastModifiedAt: undefined,
            };
            ddbMock.on(lib_dynamodb_1.ScanCommand).resolves({ Items: catItems });
            ddbMock.on(lib_dynamodb_1.QueryCommand).resolves({ Items: indexItems });
            ddbMock.on(lib_dynamodb_1.GetCommand).resolves({ Item: score1 });
            const result = await scoreDataAccess.getScoresByCage(5);
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual(score1);
            // Verify scan was called to find cat by cage number
            expect(ddbMock.commandCalls(lib_dynamodb_1.ScanCommand)[0].args[0].input).toEqual({
                TableName: tableName,
                FilterExpression: 'begins_with(PK, :pk) AND cageNumber = :cageNumber',
                ExpressionAttributeValues: {
                    ':pk': 'CAT#',
                    ':cageNumber': 5,
                },
            });
        });
        it('should return empty array when no cat found for cage number', async () => {
            ddbMock.on(lib_dynamodb_1.ScanCommand).resolves({ Items: [] });
            const result = await scoreDataAccess.getScoresByCage(999);
            expect(result).toEqual([]);
        });
    });
    describe('listAllScores', () => {
        it('should return all scores in the system', async () => {
            const mockScores = [
                {
                    id: 'score-1',
                    catId: 'cat-1',
                    judgeId: 'judge-1',
                    judgeName: 'Judge A',
                    cageConditionScore: 20,
                    cageConditionComments: undefined,
                    catConditionScore: 22,
                    catConditionComments: undefined,
                    groomingScore: 18,
                    groomingComments: undefined,
                    overallScore: 25,
                    overallComments: undefined,
                    totalScore: 85,
                    timestamp: '2024-01-01T00:00:00.000Z',
                    isFinalized: true,
                    modificationCount: 0,
                    lastModifiedBy: undefined,
                    lastModifiedAt: undefined,
                },
                {
                    id: 'score-2',
                    catId: 'cat-2',
                    judgeId: 'judge-2',
                    judgeName: 'Judge B',
                    cageConditionScore: 22,
                    cageConditionComments: undefined,
                    catConditionScore: 23,
                    catConditionComments: undefined,
                    groomingScore: 20,
                    groomingComments: undefined,
                    overallScore: 25,
                    overallComments: undefined,
                    totalScore: 90,
                    timestamp: '2024-01-01T01:00:00.000Z',
                    isFinalized: true,
                    modificationCount: 0,
                    lastModifiedBy: undefined,
                    lastModifiedAt: undefined,
                },
            ];
            ddbMock.on(lib_dynamodb_1.ScanCommand).resolves({ Items: mockScores });
            const result = await scoreDataAccess.listAllScores();
            expect(result).toHaveLength(2);
            expect(result).toEqual(mockScores);
            expect(ddbMock.commandCalls(lib_dynamodb_1.ScanCommand)[0].args[0].input).toEqual({
                TableName: tableName,
                FilterExpression: 'begins_with(PK, :pk) AND SK = :sk',
                ExpressionAttributeValues: {
                    ':pk': 'SCORE#',
                    ':sk': 'METADATA',
                },
            });
        });
        it('should return empty array when no scores exist', async () => {
            ddbMock.on(lib_dynamodb_1.ScanCommand).resolves({ Items: [] });
            const result = await scoreDataAccess.listAllScores();
            expect(result).toEqual([]);
        });
    });
    describe('audit trail functionality', () => {
        describe('createScore with audit trail', () => {
            it('should create audit entry when creating score', async () => {
                const input = {
                    catId: 'cat-123',
                    judgeId: 'judge-456',
                    judgeName: 'Judge Smith',
                    cageConditionScore: 20,
                    catConditionScore: 22,
                    groomingScore: 18,
                    overallScore: 23,
                };
                ddbMock.on(lib_dynamodb_1.PutCommand).resolves({});
                const result = await scoreDataAccess.createScore(input, 'Judge Smith');
                expect(result.modificationCount).toBe(0);
                expect(result.lastModifiedBy).toBe('Judge Smith');
                expect(result.lastModifiedAt).toBeDefined();
                // Verify four PutCommand calls were made (main record + 2 index records + audit entry)
                expect(ddbMock.commandCalls(lib_dynamodb_1.PutCommand)).toHaveLength(4);
                // Check that audit entry was created
                const auditCall = ddbMock.commandCalls(lib_dynamodb_1.PutCommand)[3];
                expect(auditCall.args[0].input.Item?.PK).toMatch(/^SCORE#/);
                expect(auditCall.args[0].input.Item?.SK).toMatch(/^AUDIT#/);
                expect(auditCall.args[0].input.Item?.action).toBe('CREATE');
                expect(auditCall.args[0].input.Item?.modifiedBy).toBe('Judge Smith');
            });
        });
        describe('updateScore with audit trail', () => {
            const existingScore = {
                id: 'score-123',
                catId: 'cat-123',
                judgeId: 'judge-456',
                judgeName: 'Judge Smith',
                cageConditionScore: 20,
                cageConditionComments: 'Clean cage',
                catConditionScore: 22,
                catConditionComments: 'Healthy cat',
                groomingScore: 18,
                groomingComments: 'Well groomed',
                overallScore: 23,
                overallComments: 'Excellent presentation',
                totalScore: 83,
                timestamp: '2024-01-01T00:00:00.000Z',
                isFinalized: false,
                modificationCount: 0,
                lastModifiedBy: 'Judge Smith',
                lastModifiedAt: '2024-01-01T00:00:00.000Z',
            };
            it('should create audit entry and increment modification count when updating score', async () => {
                ddbMock.on(lib_dynamodb_1.GetCommand).resolves({ Item: existingScore });
                ddbMock.on(lib_dynamodb_1.PutCommand).resolves({});
                const updateInput = {
                    cageConditionScore: 25,
                    modificationReason: 'Corrected scoring error',
                };
                const result = await scoreDataAccess.updateScore('score-123', updateInput, 'Admin User');
                expect(result.cageConditionScore).toBe(25);
                expect(result.modificationCount).toBe(1);
                expect(result.lastModifiedBy).toBe('Admin User');
                expect(result.lastModifiedAt).not.toBe(existingScore.lastModifiedAt);
                // Verify four PutCommand calls were made (main record + 2 index records + audit entry)
                expect(ddbMock.commandCalls(lib_dynamodb_1.PutCommand)).toHaveLength(4);
                // Check that audit entry was created
                const auditCall = ddbMock.commandCalls(lib_dynamodb_1.PutCommand)[3];
                expect(auditCall.args[0].input.Item?.action).toBe('UPDATE');
                expect(auditCall.args[0].input.Item?.modifiedBy).toBe('Admin User');
                expect(auditCall.args[0].input.Item?.reason).toBe('Corrected scoring error');
                expect(auditCall.args[0].input.Item?.previousValues).toBeDefined();
                expect(auditCall.args[0].input.Item?.newValues).toBeDefined();
            });
        });
        describe('getScoreAuditHistory', () => {
            it('should return audit history for a score', async () => {
                const mockAuditEntries = [
                    {
                        id: 'audit-1',
                        scoreId: 'score-123',
                        action: 'UPDATE',
                        modifiedBy: 'Admin User',
                        modifiedAt: '2024-01-01T01:00:00.000Z',
                        previousValues: '{"cageConditionScore": 20}',
                        newValues: '{"cageConditionScore": 25}',
                        reason: 'Corrected scoring error',
                    },
                    {
                        id: 'audit-2',
                        scoreId: 'score-123',
                        action: 'CREATE',
                        modifiedBy: 'Judge Smith',
                        modifiedAt: '2024-01-01T00:00:00.000Z',
                        newValues: '{"cageConditionScore": 20, "totalScore": 83}',
                        reason: 'Initial score creation',
                    },
                ];
                ddbMock.on(lib_dynamodb_1.QueryCommand).resolves({ Items: mockAuditEntries });
                const result = await scoreDataAccess.getScoreAuditHistory('score-123');
                expect(result).toHaveLength(2);
                expect(result[0].action).toBe('UPDATE');
                expect(result[0].modifiedBy).toBe('Admin User');
                expect(result[0].previousValues).toEqual({ cageConditionScore: 20 });
                expect(result[0].newValues).toEqual({ cageConditionScore: 25 });
                expect(result[1].action).toBe('CREATE');
                expect(result[1].modifiedBy).toBe('Judge Smith');
                expect(ddbMock.commandCalls(lib_dynamodb_1.QueryCommand)[0].args[0].input).toEqual({
                    TableName: tableName,
                    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
                    ExpressionAttributeValues: {
                        ':pk': 'SCORE#score-123',
                        ':sk': 'AUDIT#',
                    },
                    ScanIndexForward: false,
                });
            });
            it('should return empty array when no audit history exists', async () => {
                ddbMock.on(lib_dynamodb_1.QueryCommand).resolves({ Items: [] });
                const result = await scoreDataAccess.getScoreAuditHistory('score-123');
                expect(result).toEqual([]);
            });
            it('should handle audit entries with missing JSON values', async () => {
                const mockAuditEntries = [
                    {
                        id: 'audit-1',
                        scoreId: 'score-123',
                        action: 'CREATE',
                        modifiedBy: 'Judge Smith',
                        modifiedAt: '2024-01-01T00:00:00.000Z',
                        reason: 'Initial score creation',
                        // No previousValues or newValues
                    },
                ];
                ddbMock.on(lib_dynamodb_1.QueryCommand).resolves({ Items: mockAuditEntries });
                const result = await scoreDataAccess.getScoreAuditHistory('score-123');
                expect(result).toHaveLength(1);
                expect(result[0].previousValues).toBeUndefined();
                expect(result[0].newValues).toBeUndefined();
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NvcmVEYXRhQWNjZXNzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzY29yZURhdGFBY2Nlc3MudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHdEQUFpSTtBQUNqSSw2REFBaUQ7QUFDakQsd0RBQXlGO0FBRXpGLE1BQU0sT0FBTyxHQUFHLElBQUEsZ0NBQVUsRUFBQyxxQ0FBc0IsQ0FBQyxDQUFDO0FBRW5ELFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7SUFDL0IsSUFBSSxlQUFnQyxDQUFDO0lBQ3JDLE1BQU0sU0FBUyxHQUFHLFlBQVksQ0FBQztJQUUvQixVQUFVLENBQUMsR0FBRyxFQUFFO1FBQ2QsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ2hCLE1BQU0sU0FBUyxHQUFHLE9BQTRDLENBQUM7UUFDL0QsZUFBZSxHQUFHLElBQUksaUNBQWUsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDOUQsQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtRQUMzQixFQUFFLENBQUMsaURBQWlELEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDL0QsTUFBTSxLQUFLLEdBQXFCO2dCQUM5QixLQUFLLEVBQUUsU0FBUztnQkFDaEIsT0FBTyxFQUFFLFdBQVc7Z0JBQ3BCLFNBQVMsRUFBRSxhQUFhO2dCQUN4QixrQkFBa0IsRUFBRSxFQUFFO2dCQUN0QixxQkFBcUIsRUFBRSxZQUFZO2dCQUNuQyxpQkFBaUIsRUFBRSxFQUFFO2dCQUNyQixvQkFBb0IsRUFBRSxhQUFhO2dCQUNuQyxhQUFhLEVBQUUsRUFBRTtnQkFDakIsZ0JBQWdCLEVBQUUsY0FBYztnQkFDaEMsWUFBWSxFQUFFLEVBQUU7Z0JBQ2hCLGVBQWUsRUFBRSx3QkFBd0I7Z0JBQ3pDLFdBQVcsRUFBRSxLQUFLO2FBQ25CLENBQUM7WUFFRixPQUFPLENBQUMsRUFBRSxDQUFDLHlCQUFVLENBQUMsQ0FB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Q0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQy9CLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsYUFBYSxFQUFFLENBQUM7Z0JBQ2pELE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDOUMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LCBHZXRDb21tYW5kLCBQdXRDb21tYW5kLCBEZWxldGVDb21tYW5kLCBRdWVyeUNvbW1hbmQsIFNjYW5Db21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvbGliLWR5bmFtb2RiJztcbmltcG9ydCB7IG1vY2tDbGllbnQgfSBmcm9tICdhd3Mtc2RrLWNsaWVudC1tb2NrJztcbmltcG9ydCB7IFNjb3JlRGF0YUFjY2VzcywgQ3JlYXRlU2NvcmVJbnB1dCwgVXBkYXRlU2NvcmVJbnB1dCB9IGZyb20gJy4uL3Njb3JlRGF0YUFjY2Vzcyc7XG5cbmNvbnN0IGRkYk1vY2sgPSBtb2NrQ2xpZW50KER5bmFtb0RCRG9jdW1lbnRDbGllbnQpO1xuXG5kZXNjcmliZSgnU2NvcmVEYXRhQWNjZXNzJywgKCkgPT4ge1xuICBsZXQgc2NvcmVEYXRhQWNjZXNzOiBTY29yZURhdGFBY2Nlc3M7XG4gIGNvbnN0IHRhYmxlTmFtZSA9ICd0ZXN0LXRhYmxlJztcblxuICBiZWZvcmVFYWNoKCgpID0+IHtcbiAgICBkZGJNb2NrLnJlc2V0KCk7XG4gICAgY29uc3QgZG9jQ2xpZW50ID0gZGRiTW9jayBhcyB1bmtub3duIGFzIER5bmFtb0RCRG9jdW1lbnRDbGllbnQ7XG4gICAgc2NvcmVEYXRhQWNjZXNzID0gbmV3IFNjb3JlRGF0YUFjY2Vzcyhkb2NDbGllbnQsIHRhYmxlTmFtZSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdjcmVhdGVTY29yZScsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIGNyZWF0ZSBhIHNjb3JlIHdpdGggYWxsIHJlcXVpcmVkIHJlY29yZHMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBpbnB1dDogQ3JlYXRlU2NvcmVJbnB1dCA9IHtcbiAgICAgICAgY2F0SWQ6ICdjYXQtMTIzJyxcbiAgICAgICAganVkZ2VJZDogJ2p1ZGdlLTQ1NicsXG4gICAgICAgIGp1ZGdlTmFtZTogJ0p1ZGdlIFNtaXRoJyxcbiAgICAgICAgY2FnZUNvbmRpdGlvblNjb3JlOiAyMCxcbiAgICAgICAgY2FnZUNvbmRpdGlvbkNvbW1lbnRzOiAnQ2xlYW4gY2FnZScsXG4gICAgICAgIGNhdENvbmRpdGlvblNjb3JlOiAyMixcbiAgICAgICAgY2F0Q29uZGl0aW9uQ29tbWVudHM6ICdIZWFsdGh5IGNhdCcsXG4gICAgICAgIGdyb29taW5nU2NvcmU6IDE4LFxuICAgICAgICBncm9vbWluZ0NvbW1lbnRzOiAnV2VsbCBncm9vbWVkJyxcbiAgICAgICAgb3ZlcmFsbFNjb3JlOiAyMyxcbiAgICAgICAgb3ZlcmFsbENvbW1lbnRzOiAnRXhjZWxsZW50IHByZXNlbnRhdGlvbicsXG4gICAgICAgIGlzRmluYWxpemVkOiBmYWxzZSxcbiAgICAgIH07XG5cbiAgICAgIGRkYk1vY2sub24oUHV0Q29tbWFuZCkucmVzb2x2ZXMoe30pO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBzY29yZURhdGFBY2Nlc3MuY3JlYXRlU2NvcmUoaW5wdXQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0KS50b01hdGNoT2JqZWN0KHtcbiAgICAgICAgY2F0SWQ6ICdjYXQtMTIzJyxcbiAgICAgICAganVkZ2VJZDogJ2p1ZGdlLTQ1NicsXG4gICAgICAgIGp1ZGdlTmFtZTogJ0p1ZGdlIFNtaXRoJyxcbiAgICAgICAgY2FnZUNvbmRpdGlvblNjb3JlOiAyMCxcbiAgICAgICAgY2F0Q29uZGl0aW9uU2NvcmU6IDIyLFxuICAgICAgICBncm9vbWluZ1Njb3JlOiAxOCxcbiAgICAgICAgb3ZlcmFsbFNjb3JlOiAyMyxcbiAgICAgICAgdG90YWxTY29yZTogODMsIC8vIDIwICsgMjIgKyAxOCArIDIzXG4gICAgICAgIGlzRmluYWxpemVkOiBmYWxzZSxcbiAgICAgIH0pO1xuXG4gICAgICBleHBlY3QocmVzdWx0LmlkKS50b0JlRGVmaW5lZCgpO1xuICAgICAgZXhwZWN0KHJlc3VsdC50aW1lc3RhbXApLnRvQmVEZWZpbmVkKCk7XG5cbiAgICAgIC8vIFZlcmlmeSBmb3VyIFB1dENvbW1hbmQgY2FsbHMgd2VyZSBtYWRlIChtYWluIHJlY29yZCArIDIgaW5kZXggcmVjb3JkcyArIGF1ZGl0IGVudHJ5KVxuICAgICAgZXhwZWN0KGRkYk1vY2suY29tbWFuZENhbGxzKFB1dENvbW1hbmQpKS50b0hhdmVMZW5ndGgoNCk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGNhbGN1bGF0ZSB0b3RhbCBzY29yZSBjb3JyZWN0bHknLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBpbnB1dDogQ3JlYXRlU2NvcmVJbnB1dCA9IHtcbiAgICAgICAgY2F0SWQ6ICdjYXQtMTIzJyxcbiAgICAgICAganVkZ2VJZDogJ2p1ZGdlLTQ1NicsXG4gICAgICAgIGp1ZGdlTmFtZTogJ0p1ZGdlIFNtaXRoJyxcbiAgICAgICAgY2FnZUNvbmRpdGlvblNjb3JlOiAyNSxcbiAgICAgICAgY2F0Q29uZGl0aW9uU2NvcmU6IDI1LFxuICAgICAgICBncm9vbWluZ1Njb3JlOiAyNSxcbiAgICAgICAgb3ZlcmFsbFNjb3JlOiAyNSxcbiAgICAgIH07XG5cbiAgICAgIGRkYk1vY2sub24oUHV0Q29tbWFuZCkucmVzb2x2ZXMoe30pO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBzY29yZURhdGFBY2Nlc3MuY3JlYXRlU2NvcmUoaW5wdXQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0LnRvdGFsU2NvcmUpLnRvQmUoMTAwKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgZGVmYXVsdCBpc0ZpbmFsaXplZCB0byBmYWxzZSB3aGVuIG5vdCBwcm92aWRlZCcsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGlucHV0OiBDcmVhdGVTY29yZUlucHV0ID0ge1xuICAgICAgICBjYXRJZDogJ2NhdC0xMjMnLFxuICAgICAgICBqdWRnZUlkOiAnanVkZ2UtNDU2JyxcbiAgICAgICAganVkZ2VOYW1lOiAnSnVkZ2UgU21pdGgnLFxuICAgICAgICBjYWdlQ29uZGl0aW9uU2NvcmU6IDIwLFxuICAgICAgICBjYXRDb25kaXRpb25TY29yZTogMjAsXG4gICAgICAgIGdyb29taW5nU2NvcmU6IDIwLFxuICAgICAgICBvdmVyYWxsU2NvcmU6IDIwLFxuICAgICAgfTtcblxuICAgICAgZGRiTW9jay5vbihQdXRDb21tYW5kKS5yZXNvbHZlcyh7fSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNjb3JlRGF0YUFjY2Vzcy5jcmVhdGVTY29yZShpbnB1dCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQuaXNGaW5hbGl6ZWQpLnRvQmUoZmFsc2UpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnZ2V0U2NvcmUnLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gYSBzY29yZSB3aGVuIGZvdW5kJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgbW9ja1Njb3JlID0ge1xuICAgICAgICBpZDogJ3Njb3JlLTEyMycsXG4gICAgICAgIGNhdElkOiAnY2F0LTEyMycsXG4gICAgICAgIGp1ZGdlSWQ6ICdqdWRnZS00NTYnLFxuICAgICAgICBqdWRnZU5hbWU6ICdKdWRnZSBTbWl0aCcsXG4gICAgICAgIGNhZ2VDb25kaXRpb25TY29yZTogMjAsXG4gICAgICAgIGNhZ2VDb25kaXRpb25Db21tZW50czogJ0NsZWFuIGNhZ2UnLFxuICAgICAgICBjYXRDb25kaXRpb25TY29yZTogMjIsXG4gICAgICAgIGNhdENvbmRpdGlvbkNvbW1lbnRzOiAnSGVhbHRoeSBjYXQnLFxuICAgICAgICBncm9vbWluZ1Njb3JlOiAxOCxcbiAgICAgICAgZ3Jvb21pbmdDb21tZW50czogJ1dlbGwgZ3Jvb21lZCcsXG4gICAgICAgIG92ZXJhbGxTY29yZTogMjMsXG4gICAgICAgIG92ZXJhbGxDb21tZW50czogJ0V4Y2VsbGVudCBwcmVzZW50YXRpb24nLFxuICAgICAgICB0b3RhbFNjb3JlOiA4MyxcbiAgICAgICAgdGltZXN0YW1wOiAnMjAyNC0wMS0wMVQwMDowMDowMC4wMDBaJyxcbiAgICAgICAgaXNGaW5hbGl6ZWQ6IGZhbHNlLFxuICAgICAgICBtb2RpZmljYXRpb25Db3VudDogMCxcbiAgICAgICAgbGFzdE1vZGlmaWVkQnk6IHVuZGVmaW5lZCxcbiAgICAgICAgbGFzdE1vZGlmaWVkQXQ6IHVuZGVmaW5lZCxcbiAgICAgIH07XG5cbiAgICAgIGRkYk1vY2sub24oR2V0Q29tbWFuZCkucmVzb2x2ZXMoeyBJdGVtOiBtb2NrU2NvcmUgfSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNjb3JlRGF0YUFjY2Vzcy5nZXRTY29yZSgnc2NvcmUtMTIzJyk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvRXF1YWwobW9ja1Njb3JlKTtcbiAgICAgIGV4cGVjdChkZGJNb2NrLmNvbW1hbmRDYWxscyhHZXRDb21tYW5kKVswXS5hcmdzWzBdLmlucHV0KS50b0VxdWFsKHtcbiAgICAgICAgVGFibGVOYW1lOiB0YWJsZU5hbWUsXG4gICAgICAgIEtleTogeyBQSzogJ1NDT1JFI3Njb3JlLTEyMycsIFNLOiAnTUVUQURBVEEnIH0sXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmV0dXJuIG51bGwgd2hlbiBzY29yZSBub3QgZm91bmQnLCBhc3luYyAoKSA9PiB7XG4gICAgICBkZGJNb2NrLm9uKEdldENvbW1hbmQpLnJlc29sdmVzKHt9KTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2NvcmVEYXRhQWNjZXNzLmdldFNjb3JlKCdub25leGlzdGVudC1zY29yZScpO1xuXG4gICAgICBleHBlY3QocmVzdWx0KS50b0JlTnVsbCgpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgndXBkYXRlU2NvcmUnLCAoKSA9PiB7XG4gICAgY29uc3QgZXhpc3RpbmdTY29yZSA9IHtcbiAgICAgIGlkOiAnc2NvcmUtMTIzJyxcbiAgICAgIGNhdElkOiAnY2F0LTEyMycsXG4gICAgICBqdWRnZUlkOiAnanVkZ2UtNDU2JyxcbiAgICAgIGp1ZGdlTmFtZTogJ0p1ZGdlIFNtaXRoJyxcbiAgICAgIGNhZ2VDb25kaXRpb25TY29yZTogMjAsXG4gICAgICBjYWdlQ29uZGl0aW9uQ29tbWVudHM6ICdDbGVhbiBjYWdlJyxcbiAgICAgIGNhdENvbmRpdGlvblNjb3JlOiAyMixcbiAgICAgIGNhdENvbmRpdGlvbkNvbW1lbnRzOiAnSGVhbHRoeSBjYXQnLFxuICAgICAgZ3Jvb21pbmdTY29yZTogMTgsXG4gICAgICBncm9vbWluZ0NvbW1lbnRzOiAnV2VsbCBncm9vbWVkJyxcbiAgICAgIG92ZXJhbGxTY29yZTogMjMsXG4gICAgICBvdmVyYWxsQ29tbWVudHM6ICdFeGNlbGxlbnQgcHJlc2VudGF0aW9uJyxcbiAgICAgIHRvdGFsU2NvcmU6IDgzLFxuICAgICAgdGltZXN0YW1wOiAnMjAyNC0wMS0wMVQwMDowMDowMC4wMDBaJyxcbiAgICAgIGlzRmluYWxpemVkOiBmYWxzZSxcbiAgICAgIG1vZGlmaWNhdGlvbkNvdW50OiAwLFxuICAgICAgbGFzdE1vZGlmaWVkQnk6IHVuZGVmaW5lZCxcbiAgICAgIGxhc3RNb2RpZmllZEF0OiB1bmRlZmluZWQsXG4gICAgfTtcblxuICAgIGl0KCdzaG91bGQgdXBkYXRlIHNjb3JlIGFuZCByZWNhbGN1bGF0ZSB0b3RhbCcsIGFzeW5jICgpID0+IHtcbiAgICAgIGRkYk1vY2sub24oR2V0Q29tbWFuZCkucmVzb2x2ZXMoeyBJdGVtOiBleGlzdGluZ1Njb3JlIH0pO1xuICAgICAgZGRiTW9jay5vbihQdXRDb21tYW5kKS5yZXNvbHZlcyh7fSk7XG5cbiAgICAgIGNvbnN0IHVwZGF0ZUlucHV0OiBVcGRhdGVTY29yZUlucHV0ID0ge1xuICAgICAgICBjYWdlQ29uZGl0aW9uU2NvcmU6IDI1LFxuICAgICAgICBpc0ZpbmFsaXplZDogdHJ1ZSxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNjb3JlRGF0YUFjY2Vzcy51cGRhdGVTY29yZSgnc2NvcmUtMTIzJywgdXBkYXRlSW5wdXQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0LmNhZ2VDb25kaXRpb25TY29yZSkudG9CZSgyNSk7XG4gICAgICBleHBlY3QocmVzdWx0LnRvdGFsU2NvcmUpLnRvQmUoODgpOyAvLyAyNSArIDIyICsgMTggKyAyM1xuICAgICAgZXhwZWN0KHJlc3VsdC5pc0ZpbmFsaXplZCkudG9CZSh0cnVlKTtcbiAgICAgIGV4cGVjdChyZXN1bHQudGltZXN0YW1wKS5ub3QudG9CZShleGlzdGluZ1Njb3JlLnRpbWVzdGFtcCk7IC8vIFNob3VsZCBiZSB1cGRhdGVkXG5cbiAgICAgIC8vIFZlcmlmeSBmb3VyIFB1dENvbW1hbmQgY2FsbHMgd2VyZSBtYWRlIChtYWluIHJlY29yZCArIDIgaW5kZXggcmVjb3JkcyArIGF1ZGl0IGVudHJ5KVxuICAgICAgZXhwZWN0KGRkYk1vY2suY29tbWFuZENhbGxzKFB1dENvbW1hbmQpKS50b0hhdmVMZW5ndGgoNCk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHRocm93IGVycm9yIHdoZW4gc2NvcmUgbm90IGZvdW5kJywgYXN5bmMgKCkgPT4ge1xuICAgICAgZGRiTW9jay5vbihHZXRDb21tYW5kKS5yZXNvbHZlcyh7fSk7XG5cbiAgICAgIGF3YWl0IGV4cGVjdChcbiAgICAgICAgc2NvcmVEYXRhQWNjZXNzLnVwZGF0ZVNjb3JlKCdub25leGlzdGVudC1zY29yZScsIHsgY2FnZUNvbmRpdGlvblNjb3JlOiAyNSB9KVxuICAgICAgKS5yZWplY3RzLnRvVGhyb3coJ1Njb3JlIG5vdCBmb3VuZCcpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnZGVsZXRlU2NvcmUnLCAoKSA9PiB7XG4gICAgY29uc3QgZXhpc3RpbmdTY29yZSA9IHtcbiAgICAgIGlkOiAnc2NvcmUtMTIzJyxcbiAgICAgIGNhdElkOiAnY2F0LTEyMycsXG4gICAgICBqdWRnZUlkOiAnanVkZ2UtNDU2JyxcbiAgICAgIGp1ZGdlTmFtZTogJ0p1ZGdlIFNtaXRoJyxcbiAgICAgIGNhZ2VDb25kaXRpb25TY29yZTogMjAsXG4gICAgICBjYWdlQ29uZGl0aW9uQ29tbWVudHM6IHVuZGVmaW5lZCxcbiAgICAgIGNhdENvbmRpdGlvblNjb3JlOiAyMixcbiAgICAgIGNhdENvbmRpdGlvbkNvbW1lbnRzOiB1bmRlZmluZWQsXG4gICAgICBncm9vbWluZ1Njb3JlOiAxOCxcbiAgICAgIGdyb29taW5nQ29tbWVudHM6IHVuZGVmaW5lZCxcbiAgICAgIG92ZXJhbGxTY29yZTogMjMsXG4gICAgICBvdmVyYWxsQ29tbWVudHM6IHVuZGVmaW5lZCxcbiAgICAgIHRvdGFsU2NvcmU6IDgzLFxuICAgICAgdGltZXN0YW1wOiAnMjAyNC0wMS0wMVQwMDowMDowMC4wMDBaJyxcbiAgICAgIGlzRmluYWxpemVkOiBmYWxzZSxcbiAgICAgIG1vZGlmaWNhdGlvbkNvdW50OiAwLFxuICAgICAgbGFzdE1vZGlmaWVkQnk6IHVuZGVmaW5lZCxcbiAgICAgIGxhc3RNb2RpZmllZEF0OiB1bmRlZmluZWQsXG4gICAgfTtcblxuICAgIGl0KCdzaG91bGQgZGVsZXRlIHNjb3JlIGFuZCBhbGwgaW5kZXggcmVjb3JkcycsIGFzeW5jICgpID0+IHtcbiAgICAgIGRkYk1vY2sub24oR2V0Q29tbWFuZCkucmVzb2x2ZXMoeyBJdGVtOiBleGlzdGluZ1Njb3JlIH0pO1xuICAgICAgZGRiTW9jay5vbihEZWxldGVDb21tYW5kKS5yZXNvbHZlcyh7fSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNjb3JlRGF0YUFjY2Vzcy5kZWxldGVTY29yZSgnc2NvcmUtMTIzJyk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvRXF1YWwoZXhpc3RpbmdTY29yZSk7XG5cbiAgICAgIC8vIFZlcmlmeSB0aHJlZSBEZWxldGVDb21tYW5kIGNhbGxzIHdlcmUgbWFkZSAobWFpbiByZWNvcmQgKyAyIGluZGV4IHJlY29yZHMpXG4gICAgICBleHBlY3QoZGRiTW9jay5jb21tYW5kQ2FsbHMoRGVsZXRlQ29tbWFuZCkpLnRvSGF2ZUxlbmd0aCgzKTtcbiAgICAgIFxuICAgICAgY29uc3QgZGVsZXRlQ2FsbHMgPSBkZGJNb2NrLmNvbW1hbmRDYWxscyhEZWxldGVDb21tYW5kKTtcbiAgICAgIGV4cGVjdChkZWxldGVDYWxsc1swXS5hcmdzWzBdLmlucHV0LktleSkudG9FcXVhbCh7IFBLOiAnU0NPUkUjc2NvcmUtMTIzJywgU0s6ICdNRVRBREFUQScgfSk7XG4gICAgICBleHBlY3QoZGVsZXRlQ2FsbHNbMV0uYXJnc1swXS5pbnB1dC5LZXkpLnRvRXF1YWwoeyBQSzogJ0NBVCNjYXQtMTIzJywgU0s6ICdTQ09SRSNzY29yZS0xMjMnIH0pO1xuICAgICAgZXhwZWN0KGRlbGV0ZUNhbGxzWzJdLmFyZ3NbMF0uaW5wdXQuS2V5KS50b0VxdWFsKHsgUEs6ICdKVURHRSNqdWRnZS00NTYnLCBTSzogJ1NDT1JFI3Njb3JlLTEyMycgfSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHRocm93IGVycm9yIHdoZW4gc2NvcmUgbm90IGZvdW5kJywgYXN5bmMgKCkgPT4ge1xuICAgICAgZGRiTW9jay5vbihHZXRDb21tYW5kKS5yZXNvbHZlcyh7fSk7XG5cbiAgICAgIGF3YWl0IGV4cGVjdChcbiAgICAgICAgc2NvcmVEYXRhQWNjZXNzLmRlbGV0ZVNjb3JlKCdub25leGlzdGVudC1zY29yZScpXG4gICAgICApLnJlamVjdHMudG9UaHJvdygnU2NvcmUgbm90IGZvdW5kJyk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdnZXRTY29yZXNCeUNhdCcsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIHJldHVybiBzY29yZXMgZm9yIGEgc3BlY2lmaWMgY2F0JywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgaW5kZXhJdGVtcyA9IFtcbiAgICAgICAgeyBzY29yZUlkOiAnc2NvcmUtMScsIGp1ZGdlSWQ6ICdqdWRnZS0xJywgdG90YWxTY29yZTogODUgfSxcbiAgICAgICAgeyBzY29yZUlkOiAnc2NvcmUtMicsIGp1ZGdlSWQ6ICdqdWRnZS0yJywgdG90YWxTY29yZTogOTAgfSxcbiAgICAgIF07XG5cbiAgICAgIGNvbnN0IHNjb3JlMSA9IHtcbiAgICAgICAgaWQ6ICdzY29yZS0xJyxcbiAgICAgICAgY2F0SWQ6ICdjYXQtMTIzJyxcbiAgICAgICAganVkZ2VJZDogJ2p1ZGdlLTEnLFxuICAgICAgICBqdWRnZU5hbWU6ICdKdWRnZSBBJyxcbiAgICAgICAgY2FnZUNvbmRpdGlvblNjb3JlOiAyMCxcbiAgICAgICAgY2FnZUNvbmRpdGlvbkNvbW1lbnRzOiB1bmRlZmluZWQsXG4gICAgICAgIGNhdENvbmRpdGlvblNjb3JlOiAyMixcbiAgICAgICAgY2F0Q29uZGl0aW9uQ29tbWVudHM6IHVuZGVmaW5lZCxcbiAgICAgICAgZ3Jvb21pbmdTY29yZTogMTgsXG4gICAgICAgIGdyb29taW5nQ29tbWVudHM6IHVuZGVmaW5lZCxcbiAgICAgICAgb3ZlcmFsbFNjb3JlOiAyNSxcbiAgICAgICAgb3ZlcmFsbENvbW1lbnRzOiB1bmRlZmluZWQsXG4gICAgICAgIHRvdGFsU2NvcmU6IDg1LFxuICAgICAgICB0aW1lc3RhbXA6ICcyMDI0LTAxLTAxVDAwOjAwOjAwLjAwMFonLFxuICAgICAgICBpc0ZpbmFsaXplZDogdHJ1ZSxcbiAgICAgICAgbW9kaWZpY2F0aW9uQ291bnQ6IDAsXG4gICAgICAgIGxhc3RNb2RpZmllZEJ5OiB1bmRlZmluZWQsXG4gICAgICAgIGxhc3RNb2RpZmllZEF0OiB1bmRlZmluZWQsXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBzY29yZTIgPSB7XG4gICAgICAgIGlkOiAnc2NvcmUtMicsXG4gICAgICAgIGNhdElkOiAnY2F0LTEyMycsXG4gICAgICAgIGp1ZGdlSWQ6ICdqdWRnZS0yJyxcbiAgICAgICAganVkZ2VOYW1lOiAnSnVkZ2UgQicsXG4gICAgICAgIGNhZ2VDb25kaXRpb25TY29yZTogMjIsXG4gICAgICAgIGNhZ2VDb25kaXRpb25Db21tZW50czogdW5kZWZpbmVkLFxuICAgICAgICBjYXRDb25kaXRpb25TY29yZTogMjMsXG4gICAgICAgIGNhdENvbmRpdGlvbkNvbW1lbnRzOiB1bmRlZmluZWQsXG4gICAgICAgIGdyb29taW5nU2NvcmU6IDIwLFxuICAgICAgICBncm9vbWluZ0NvbW1lbnRzOiB1bmRlZmluZWQsXG4gICAgICAgIG92ZXJhbGxTY29yZTogMjUsXG4gICAgICAgIG92ZXJhbGxDb21tZW50czogdW5kZWZpbmVkLFxuICAgICAgICB0b3RhbFNjb3JlOiA5MCxcbiAgICAgICAgdGltZXN0YW1wOiAnMjAyNC0wMS0wMVQwMTowMDowMC4wMDBaJyxcbiAgICAgICAgaXNGaW5hbGl6ZWQ6IHRydWUsXG4gICAgICAgIG1vZGlmaWNhdGlvbkNvdW50OiAwLFxuICAgICAgICBsYXN0TW9kaWZpZWRCeTogdW5kZWZpbmVkLFxuICAgICAgICBsYXN0TW9kaWZpZWRBdDogdW5kZWZpbmVkLFxuICAgICAgfTtcblxuICAgICAgZGRiTW9jay5vbihRdWVyeUNvbW1hbmQpLnJlc29sdmVzKHsgSXRlbXM6IGluZGV4SXRlbXMgfSk7XG4gICAgICBkZGJNb2NrLm9uKEdldENvbW1hbmQpXG4gICAgICAgIC5yZXNvbHZlc09uY2UoeyBJdGVtOiBzY29yZTEgfSlcbiAgICAgICAgLnJlc29sdmVzT25jZSh7IEl0ZW06IHNjb3JlMiB9KTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2NvcmVEYXRhQWNjZXNzLmdldFNjb3Jlc0J5Q2F0KCdjYXQtMTIzJyk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvSGF2ZUxlbmd0aCgyKTtcbiAgICAgIGV4cGVjdChyZXN1bHRbMF0pLnRvRXF1YWwoc2NvcmUxKTtcbiAgICAgIGV4cGVjdChyZXN1bHRbMV0pLnRvRXF1YWwoc2NvcmUyKTtcblxuICAgICAgZXhwZWN0KGRkYk1vY2suY29tbWFuZENhbGxzKFF1ZXJ5Q29tbWFuZClbMF0uYXJnc1swXS5pbnB1dCkudG9FcXVhbCh7XG4gICAgICAgIFRhYmxlTmFtZTogdGFibGVOYW1lLFxuICAgICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiAnUEsgPSA6cGsgQU5EIGJlZ2luc193aXRoKFNLLCA6c2spJyxcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xuICAgICAgICAgICc6cGsnOiAnQ0FUI2NhdC0xMjMnLFxuICAgICAgICAgICc6c2snOiAnU0NPUkUjJyxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gZW1wdHkgYXJyYXkgd2hlbiBubyBzY29yZXMgZm91bmQnLCBhc3luYyAoKSA9PiB7XG4gICAgICBkZGJNb2NrLm9uKFF1ZXJ5Q29tbWFuZCkucmVzb2x2ZXMoeyBJdGVtczogW10gfSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNjb3JlRGF0YUFjY2Vzcy5nZXRTY29yZXNCeUNhdCgnY2F0LTEyMycpO1xuXG4gICAgICBleHBlY3QocmVzdWx0KS50b0VxdWFsKFtdKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2dldFNjb3Jlc0J5SnVkZ2UnLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gc2NvcmVzIGZvciBhIHNwZWNpZmljIGp1ZGdlJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgaW5kZXhJdGVtcyA9IFtcbiAgICAgICAgeyBzY29yZUlkOiAnc2NvcmUtMScsIGNhdElkOiAnY2F0LTEnLCB0b3RhbFNjb3JlOiA4NSB9LFxuICAgICAgICB7IHNjb3JlSWQ6ICdzY29yZS0yJywgY2F0SWQ6ICdjYXQtMicsIHRvdGFsU2NvcmU6IDkwIH0sXG4gICAgICBdO1xuXG4gICAgICBjb25zdCBzY29yZTEgPSB7XG4gICAgICAgIGlkOiAnc2NvcmUtMScsXG4gICAgICAgIGNhdElkOiAnY2F0LTEnLFxuICAgICAgICBqdWRnZUlkOiAnanVkZ2UtNDU2JyxcbiAgICAgICAganVkZ2VOYW1lOiAnSnVkZ2UgU21pdGgnLFxuICAgICAgICBjYWdlQ29uZGl0aW9uU2NvcmU6IDIwLFxuICAgICAgICBjYWdlQ29uZGl0aW9uQ29tbWVudHM6IHVuZGVmaW5lZCxcbiAgICAgICAgY2F0Q29uZGl0aW9uU2NvcmU6IDIyLFxuICAgICAgICBjYXRDb25kaXRpb25Db21tZW50czogdW5kZWZpbmVkLFxuICAgICAgICBncm9vbWluZ1Njb3JlOiAxOCxcbiAgICAgICAgZ3Jvb21pbmdDb21tZW50czogdW5kZWZpbmVkLFxuICAgICAgICBvdmVyYWxsU2NvcmU6IDI1LFxuICAgICAgICBvdmVyYWxsQ29tbWVudHM6IHVuZGVmaW5lZCxcbiAgICAgICAgdG90YWxTY29yZTogODUsXG4gICAgICAgIHRpbWVzdGFtcDogJzIwMjQtMDEtMDFUMDA6MDA6MDAuMDAwWicsXG4gICAgICAgIGlzRmluYWxpemVkOiB0cnVlLFxuICAgICAgICBtb2RpZmljYXRpb25Db3VudDogMCxcbiAgICAgICAgbGFzdE1vZGlmaWVkQnk6IHVuZGVmaW5lZCxcbiAgICAgICAgbGFzdE1vZGlmaWVkQXQ6IHVuZGVmaW5lZCxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IHNjb3JlMiA9IHtcbiAgICAgICAgaWQ6ICdzY29yZS0yJyxcbiAgICAgICAgY2F0SWQ6ICdjYXQtMicsXG4gICAgICAgIGp1ZGdlSWQ6ICdqdWRnZS00NTYnLFxuICAgICAgICBqdWRnZU5hbWU6ICdKdWRnZSBTbWl0aCcsXG4gICAgICAgIGNhZ2VDb25kaXRpb25TY29yZTogMjIsXG4gICAgICAgIGNhZ2VDb25kaXRpb25Db21tZW50czogdW5kZWZpbmVkLFxuICAgICAgICBjYXRDb25kaXRpb25TY29yZTogMjMsXG4gICAgICAgIGNhdENvbmRpdGlvbkNvbW1lbnRzOiB1bmRlZmluZWQsXG4gICAgICAgIGdyb29taW5nU2NvcmU6IDIwLFxuICAgICAgICBncm9vbWluZ0NvbW1lbnRzOiB1bmRlZmluZWQsXG4gICAgICAgIG92ZXJhbGxTY29yZTogMjUsXG4gICAgICAgIG92ZXJhbGxDb21tZW50czogdW5kZWZpbmVkLFxuICAgICAgICB0b3RhbFNjb3JlOiA5MCxcbiAgICAgICAgdGltZXN0YW1wOiAnMjAyNC0wMS0wMVQwMTowMDowMC4wMDBaJyxcbiAgICAgICAgaXNGaW5hbGl6ZWQ6IHRydWUsXG4gICAgICAgIG1vZGlmaWNhdGlvbkNvdW50OiAwLFxuICAgICAgICBsYXN0TW9kaWZpZWRCeTogdW5kZWZpbmVkLFxuICAgICAgICBsYXN0TW9kaWZpZWRBdDogdW5kZWZpbmVkLFxuICAgICAgfTtcblxuICAgICAgZGRiTW9jay5vbihRdWVyeUNvbW1hbmQpLnJlc29sdmVzKHsgSXRlbXM6IGluZGV4SXRlbXMgfSk7XG4gICAgICBkZGJNb2NrLm9uKEdldENvbW1hbmQpXG4gICAgICAgIC5yZXNvbHZlc09uY2UoeyBJdGVtOiBzY29yZTEgfSlcbiAgICAgICAgLnJlc29sdmVzT25jZSh7IEl0ZW06IHNjb3JlMiB9KTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2NvcmVEYXRhQWNjZXNzLmdldFNjb3Jlc0J5SnVkZ2UoJ2p1ZGdlLTQ1NicpO1xuXG4gICAgICBleHBlY3QocmVzdWx0KS50b0hhdmVMZW5ndGgoMik7XG4gICAgICBleHBlY3QocmVzdWx0WzBdKS50b0VxdWFsKHNjb3JlMSk7XG4gICAgICBleHBlY3QocmVzdWx0WzFdKS50b0VxdWFsKHNjb3JlMik7XG5cbiAgICAgIGV4cGVjdChkZGJNb2NrLmNvbW1hbmRDYWxscyhRdWVyeUNvbW1hbmQpWzBdLmFyZ3NbMF0uaW5wdXQpLnRvRXF1YWwoe1xuICAgICAgICBUYWJsZU5hbWU6IHRhYmxlTmFtZSxcbiAgICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjogJ1BLID0gOnBrIEFORCBiZWdpbnNfd2l0aChTSywgOnNrKScsXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcbiAgICAgICAgICAnOnBrJzogJ0pVREdFI2p1ZGdlLTQ1NicsXG4gICAgICAgICAgJzpzayc6ICdTQ09SRSMnLFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdnZXRTY29yZXNCeUNhZ2UnLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gc2NvcmVzIGZvciBhIHNwZWNpZmljIGNhZ2UgbnVtYmVyJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY2F0SXRlbXMgPSBbXG4gICAgICAgIHsgUEs6ICdDQVQjY2F0LTEyMycsIGNhZ2VOdW1iZXI6IDUsIG5hbWU6ICdGbHVmZnknIH0sXG4gICAgICBdO1xuXG4gICAgICBjb25zdCBpbmRleEl0ZW1zID0gW1xuICAgICAgICB7IHNjb3JlSWQ6ICdzY29yZS0xJywganVkZ2VJZDogJ2p1ZGdlLTEnLCB0b3RhbFNjb3JlOiA4NSB9LFxuICAgICAgXTtcblxuICAgICAgY29uc3Qgc2NvcmUxID0ge1xuICAgICAgICBpZDogJ3Njb3JlLTEnLFxuICAgICAgICBjYXRJZDogJ2NhdC0xMjMnLFxuICAgICAgICBqdWRnZUlkOiAnanVkZ2UtMScsXG4gICAgICAgIGp1ZGdlTmFtZTogJ0p1ZGdlIEEnLFxuICAgICAgICBjYWdlQ29uZGl0aW9uU2NvcmU6IDIwLFxuICAgICAgICBjYWdlQ29uZGl0aW9uQ29tbWVudHM6IHVuZGVmaW5lZCxcbiAgICAgICAgY2F0Q29uZGl0aW9uU2NvcmU6IDIyLFxuICAgICAgICBjYXRDb25kaXRpb25Db21tZW50czogdW5kZWZpbmVkLFxuICAgICAgICBncm9vbWluZ1Njb3JlOiAxOCxcbiAgICAgICAgZ3Jvb21pbmdDb21tZW50czogdW5kZWZpbmVkLFxuICAgICAgICBvdmVyYWxsU2NvcmU6IDI1LFxuICAgICAgICBvdmVyYWxsQ29tbWVudHM6IHVuZGVmaW5lZCxcbiAgICAgICAgdG90YWxTY29yZTogODUsXG4gICAgICAgIHRpbWVzdGFtcDogJzIwMjQtMDEtMDFUMDA6MDA6MDAuMDAwWicsXG4gICAgICAgIGlzRmluYWxpemVkOiB0cnVlLFxuICAgICAgICBtb2RpZmljYXRpb25Db3VudDogMCxcbiAgICAgICAgbGFzdE1vZGlmaWVkQnk6IHVuZGVmaW5lZCxcbiAgICAgICAgbGFzdE1vZGlmaWVkQXQ6IHVuZGVmaW5lZCxcbiAgICAgIH07XG5cbiAgICAgIGRkYk1vY2sub24oU2NhbkNvbW1hbmQpLnJlc29sdmVzKHsgSXRlbXM6IGNhdEl0ZW1zIH0pO1xuICAgICAgZGRiTW9jay5vbihRdWVyeUNvbW1hbmQpLnJlc29sdmVzKHsgSXRlbXM6IGluZGV4SXRlbXMgfSk7XG4gICAgICBkZGJNb2NrLm9uKEdldENvbW1hbmQpLnJlc29sdmVzKHsgSXRlbTogc2NvcmUxIH0pO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBzY29yZURhdGFBY2Nlc3MuZ2V0U2NvcmVzQnlDYWdlKDUpO1xuXG4gICAgICBleHBlY3QocmVzdWx0KS50b0hhdmVMZW5ndGgoMSk7XG4gICAgICBleHBlY3QocmVzdWx0WzBdKS50b0VxdWFsKHNjb3JlMSk7XG5cbiAgICAgIC8vIFZlcmlmeSBzY2FuIHdhcyBjYWxsZWQgdG8gZmluZCBjYXQgYnkgY2FnZSBudW1iZXJcbiAgICAgIGV4cGVjdChkZGJNb2NrLmNvbW1hbmRDYWxscyhTY2FuQ29tbWFuZClbMF0uYXJnc1swXS5pbnB1dCkudG9FcXVhbCh7XG4gICAgICAgIFRhYmxlTmFtZTogdGFibGVOYW1lLFxuICAgICAgICBGaWx0ZXJFeHByZXNzaW9uOiAnYmVnaW5zX3dpdGgoUEssIDpwaykgQU5EIGNhZ2VOdW1iZXIgPSA6Y2FnZU51bWJlcicsXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcbiAgICAgICAgICAnOnBrJzogJ0NBVCMnLFxuICAgICAgICAgICc6Y2FnZU51bWJlcic6IDUsXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmV0dXJuIGVtcHR5IGFycmF5IHdoZW4gbm8gY2F0IGZvdW5kIGZvciBjYWdlIG51bWJlcicsIGFzeW5jICgpID0+IHtcbiAgICAgIGRkYk1vY2sub24oU2NhbkNvbW1hbmQpLnJlc29sdmVzKHsgSXRlbXM6IFtdIH0pO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBzY29yZURhdGFBY2Nlc3MuZ2V0U2NvcmVzQnlDYWdlKDk5OSk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvRXF1YWwoW10pO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnbGlzdEFsbFNjb3JlcycsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIHJldHVybiBhbGwgc2NvcmVzIGluIHRoZSBzeXN0ZW0nLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBtb2NrU2NvcmVzID0gW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6ICdzY29yZS0xJyxcbiAgICAgICAgICBjYXRJZDogJ2NhdC0xJyxcbiAgICAgICAgICBqdWRnZUlkOiAnanVkZ2UtMScsXG4gICAgICAgICAganVkZ2VOYW1lOiAnSnVkZ2UgQScsXG4gICAgICAgICAgY2FnZUNvbmRpdGlvblNjb3JlOiAyMCxcbiAgICAgICAgICBjYWdlQ29uZGl0aW9uQ29tbWVudHM6IHVuZGVmaW5lZCxcbiAgICAgICAgICBjYXRDb25kaXRpb25TY29yZTogMjIsXG4gICAgICAgICAgY2F0Q29uZGl0aW9uQ29tbWVudHM6IHVuZGVmaW5lZCxcbiAgICAgICAgICBncm9vbWluZ1Njb3JlOiAxOCxcbiAgICAgICAgICBncm9vbWluZ0NvbW1lbnRzOiB1bmRlZmluZWQsXG4gICAgICAgICAgb3ZlcmFsbFNjb3JlOiAyNSxcbiAgICAgICAgICBvdmVyYWxsQ29tbWVudHM6IHVuZGVmaW5lZCxcbiAgICAgICAgICB0b3RhbFNjb3JlOiA4NSxcbiAgICAgICAgICB0aW1lc3RhbXA6ICcyMDI0LTAxLTAxVDAwOjAwOjAwLjAwMFonLFxuICAgICAgICAgIGlzRmluYWxpemVkOiB0cnVlLFxuICAgICAgICAgIG1vZGlmaWNhdGlvbkNvdW50OiAwLFxuICAgICAgICAgIGxhc3RNb2RpZmllZEJ5OiB1bmRlZmluZWQsXG4gICAgICAgICAgbGFzdE1vZGlmaWVkQXQ6IHVuZGVmaW5lZCxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGlkOiAnc2NvcmUtMicsXG4gICAgICAgICAgY2F0SWQ6ICdjYXQtMicsXG4gICAgICAgICAganVkZ2VJZDogJ2p1ZGdlLTInLFxuICAgICAgICAgIGp1ZGdlTmFtZTogJ0p1ZGdlIEInLFxuICAgICAgICAgIGNhZ2VDb25kaXRpb25TY29yZTogMjIsXG4gICAgICAgICAgY2FnZUNvbmRpdGlvbkNvbW1lbnRzOiB1bmRlZmluZWQsXG4gICAgICAgICAgY2F0Q29uZGl0aW9uU2NvcmU6IDIzLFxuICAgICAgICAgIGNhdENvbmRpdGlvbkNvbW1lbnRzOiB1bmRlZmluZWQsXG4gICAgICAgICAgZ3Jvb21pbmdTY29yZTogMjAsXG4gICAgICAgICAgZ3Jvb21pbmdDb21tZW50czogdW5kZWZpbmVkLFxuICAgICAgICAgIG92ZXJhbGxTY29yZTogMjUsXG4gICAgICAgICAgb3ZlcmFsbENvbW1lbnRzOiB1bmRlZmluZWQsXG4gICAgICAgICAgdG90YWxTY29yZTogOTAsXG4gICAgICAgICAgdGltZXN0YW1wOiAnMjAyNC0wMS0wMVQwMTowMDowMC4wMDBaJyxcbiAgICAgICAgICBpc0ZpbmFsaXplZDogdHJ1ZSxcbiAgICAgICAgICBtb2RpZmljYXRpb25Db3VudDogMCxcbiAgICAgICAgICBsYXN0TW9kaWZpZWRCeTogdW5kZWZpbmVkLFxuICAgICAgICAgIGxhc3RNb2RpZmllZEF0OiB1bmRlZmluZWQsXG4gICAgICAgIH0sXG4gICAgICBdO1xuXG4gICAgICBkZGJNb2NrLm9uKFNjYW5Db21tYW5kKS5yZXNvbHZlcyh7IEl0ZW1zOiBtb2NrU2NvcmVzIH0pO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBzY29yZURhdGFBY2Nlc3MubGlzdEFsbFNjb3JlcygpO1xuXG4gICAgICBleHBlY3QocmVzdWx0KS50b0hhdmVMZW5ndGgoMik7XG4gICAgICBleHBlY3QocmVzdWx0KS50b0VxdWFsKG1vY2tTY29yZXMpO1xuXG4gICAgICBleHBlY3QoZGRiTW9jay5jb21tYW5kQ2FsbHMoU2NhbkNvbW1hbmQpWzBdLmFyZ3NbMF0uaW5wdXQpLnRvRXF1YWwoe1xuICAgICAgICBUYWJsZU5hbWU6IHRhYmxlTmFtZSxcbiAgICAgICAgRmlsdGVyRXhwcmVzc2lvbjogJ2JlZ2luc193aXRoKFBLLCA6cGspIEFORCBTSyA9IDpzaycsXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcbiAgICAgICAgICAnOnBrJzogJ1NDT1JFIycsXG4gICAgICAgICAgJzpzayc6ICdNRVRBREFUQScsXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmV0dXJuIGVtcHR5IGFycmF5IHdoZW4gbm8gc2NvcmVzIGV4aXN0JywgYXN5bmMgKCkgPT4ge1xuICAgICAgZGRiTW9jay5vbihTY2FuQ29tbWFuZCkucmVzb2x2ZXMoeyBJdGVtczogW10gfSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNjb3JlRGF0YUFjY2Vzcy5saXN0QWxsU2NvcmVzKCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvRXF1YWwoW10pO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnYXVkaXQgdHJhaWwgZnVuY3Rpb25hbGl0eScsICgpID0+IHtcbiAgICBkZXNjcmliZSgnY3JlYXRlU2NvcmUgd2l0aCBhdWRpdCB0cmFpbCcsICgpID0+IHtcbiAgICAgIGl0KCdzaG91bGQgY3JlYXRlIGF1ZGl0IGVudHJ5IHdoZW4gY3JlYXRpbmcgc2NvcmUnLCBhc3luYyAoKSA9PiB7XG4gICAgICAgIGNvbnN0IGlucHV0OiBDcmVhdGVTY29yZUlucHV0ID0ge1xuICAgICAgICAgIGNhdElkOiAnY2F0LTEyMycsXG4gICAgICAgICAganVkZ2VJZDogJ2p1ZGdlLTQ1NicsXG4gICAgICAgICAganVkZ2VOYW1lOiAnSnVkZ2UgU21pdGgnLFxuICAgICAgICAgIGNhZ2VDb25kaXRpb25TY29yZTogMjAsXG4gICAgICAgICAgY2F0Q29uZGl0aW9uU2NvcmU6IDIyLFxuICAgICAgICAgIGdyb29taW5nU2NvcmU6IDE4LFxuICAgICAgICAgIG92ZXJhbGxTY29yZTogMjMsXG4gICAgICAgIH07XG5cbiAgICAgICAgZGRiTW9jay5vbihQdXRDb21tYW5kKS5yZXNvbHZlcyh7fSk7XG5cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2NvcmVEYXRhQWNjZXNzLmNyZWF0ZVNjb3JlKGlucHV0LCAnSnVkZ2UgU21pdGgnKTtcblxuICAgICAgICBleHBlY3QocmVzdWx0Lm1vZGlmaWNhdGlvbkNvdW50KS50b0JlKDApO1xuICAgICAgICBleHBlY3QocmVzdWx0Lmxhc3RNb2RpZmllZEJ5KS50b0JlKCdKdWRnZSBTbWl0aCcpO1xuICAgICAgICBleHBlY3QocmVzdWx0Lmxhc3RNb2RpZmllZEF0KS50b0JlRGVmaW5lZCgpO1xuXG4gICAgICAgIC8vIFZlcmlmeSBmb3VyIFB1dENvbW1hbmQgY2FsbHMgd2VyZSBtYWRlIChtYWluIHJlY29yZCArIDIgaW5kZXggcmVjb3JkcyArIGF1ZGl0IGVudHJ5KVxuICAgICAgICBleHBlY3QoZGRiTW9jay5jb21tYW5kQ2FsbHMoUHV0Q29tbWFuZCkpLnRvSGF2ZUxlbmd0aCg0KTtcblxuICAgICAgICAvLyBDaGVjayB0aGF0IGF1ZGl0IGVudHJ5IHdhcyBjcmVhdGVkXG4gICAgICAgIGNvbnN0IGF1ZGl0Q2FsbCA9IGRkYk1vY2suY29tbWFuZENhbGxzKFB1dENvbW1hbmQpWzNdO1xuICAgICAgICBleHBlY3QoYXVkaXRDYWxsLmFyZ3NbMF0uaW5wdXQuSXRlbT8uUEspLnRvTWF0Y2goL15TQ09SRSMvKTtcbiAgICAgICAgZXhwZWN0KGF1ZGl0Q2FsbC5hcmdzWzBdLmlucHV0Lkl0ZW0/LlNLKS50b01hdGNoKC9eQVVESVQjLyk7XG4gICAgICAgIGV4cGVjdChhdWRpdENhbGwuYXJnc1swXS5pbnB1dC5JdGVtPy5hY3Rpb24pLnRvQmUoJ0NSRUFURScpO1xuICAgICAgICBleHBlY3QoYXVkaXRDYWxsLmFyZ3NbMF0uaW5wdXQuSXRlbT8ubW9kaWZpZWRCeSkudG9CZSgnSnVkZ2UgU21pdGgnKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZGVzY3JpYmUoJ3VwZGF0ZVNjb3JlIHdpdGggYXVkaXQgdHJhaWwnLCAoKSA9PiB7XG4gICAgICBjb25zdCBleGlzdGluZ1Njb3JlID0ge1xuICAgICAgICBpZDogJ3Njb3JlLTEyMycsXG4gICAgICAgIGNhdElkOiAnY2F0LTEyMycsXG4gICAgICAgIGp1ZGdlSWQ6ICdqdWRnZS00NTYnLFxuICAgICAgICBqdWRnZU5hbWU6ICdKdWRnZSBTbWl0aCcsXG4gICAgICAgIGNhZ2VDb25kaXRpb25TY29yZTogMjAsXG4gICAgICAgIGNhZ2VDb25kaXRpb25Db21tZW50czogJ0NsZWFuIGNhZ2UnLFxuICAgICAgICBjYXRDb25kaXRpb25TY29yZTogMjIsXG4gICAgICAgIGNhdENvbmRpdGlvbkNvbW1lbnRzOiAnSGVhbHRoeSBjYXQnLFxuICAgICAgICBncm9vbWluZ1Njb3JlOiAxOCxcbiAgICAgICAgZ3Jvb21pbmdDb21tZW50czogJ1dlbGwgZ3Jvb21lZCcsXG4gICAgICAgIG92ZXJhbGxTY29yZTogMjMsXG4gICAgICAgIG92ZXJhbGxDb21tZW50czogJ0V4Y2VsbGVudCBwcmVzZW50YXRpb24nLFxuICAgICAgICB0b3RhbFNjb3JlOiA4MyxcbiAgICAgICAgdGltZXN0YW1wOiAnMjAyNC0wMS0wMVQwMDowMDowMC4wMDBaJyxcbiAgICAgICAgaXNGaW5hbGl6ZWQ6IGZhbHNlLFxuICAgICAgICBtb2RpZmljYXRpb25Db3VudDogMCxcbiAgICAgICAgbGFzdE1vZGlmaWVkQnk6ICdKdWRnZSBTbWl0aCcsXG4gICAgICAgIGxhc3RNb2RpZmllZEF0OiAnMjAyNC0wMS0wMVQwMDowMDowMC4wMDBaJyxcbiAgICAgIH07XG5cbiAgICAgIGl0KCdzaG91bGQgY3JlYXRlIGF1ZGl0IGVudHJ5IGFuZCBpbmNyZW1lbnQgbW9kaWZpY2F0aW9uIGNvdW50IHdoZW4gdXBkYXRpbmcgc2NvcmUnLCBhc3luYyAoKSA9PiB7XG4gICAgICAgIGRkYk1vY2sub24oR2V0Q29tbWFuZCkucmVzb2x2ZXMoeyBJdGVtOiBleGlzdGluZ1Njb3JlIH0pO1xuICAgICAgICBkZGJNb2NrLm9uKFB1dENvbW1hbmQpLnJlc29sdmVzKHt9KTtcblxuICAgICAgICBjb25zdCB1cGRhdGVJbnB1dDogVXBkYXRlU2NvcmVJbnB1dCA9IHtcbiAgICAgICAgICBjYWdlQ29uZGl0aW9uU2NvcmU6IDI1LFxuICAgICAgICAgIG1vZGlmaWNhdGlvblJlYXNvbjogJ0NvcnJlY3RlZCBzY29yaW5nIGVycm9yJyxcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBzY29yZURhdGFBY2Nlc3MudXBkYXRlU2NvcmUoJ3Njb3JlLTEyMycsIHVwZGF0ZUlucHV0LCAnQWRtaW4gVXNlcicpO1xuXG4gICAgICAgIGV4cGVjdChyZXN1bHQuY2FnZUNvbmRpdGlvblNjb3JlKS50b0JlKDI1KTtcbiAgICAgICAgZXhwZWN0KHJlc3VsdC5tb2RpZmljYXRpb25Db3VudCkudG9CZSgxKTtcbiAgICAgICAgZXhwZWN0KHJlc3VsdC5sYXN0TW9kaWZpZWRCeSkudG9CZSgnQWRtaW4gVXNlcicpO1xuICAgICAgICBleHBlY3QocmVzdWx0Lmxhc3RNb2RpZmllZEF0KS5ub3QudG9CZShleGlzdGluZ1Njb3JlLmxhc3RNb2RpZmllZEF0KTtcblxuICAgICAgICAvLyBWZXJpZnkgZm91ciBQdXRDb21tYW5kIGNhbGxzIHdlcmUgbWFkZSAobWFpbiByZWNvcmQgKyAyIGluZGV4IHJlY29yZHMgKyBhdWRpdCBlbnRyeSlcbiAgICAgICAgZXhwZWN0KGRkYk1vY2suY29tbWFuZENhbGxzKFB1dENvbW1hbmQpKS50b0hhdmVMZW5ndGgoNCk7XG5cbiAgICAgICAgLy8gQ2hlY2sgdGhhdCBhdWRpdCBlbnRyeSB3YXMgY3JlYXRlZFxuICAgICAgICBjb25zdCBhdWRpdENhbGwgPSBkZGJNb2NrLmNvbW1hbmRDYWxscyhQdXRDb21tYW5kKVszXTtcbiAgICAgICAgZXhwZWN0KGF1ZGl0Q2FsbC5hcmdzWzBdLmlucHV0Lkl0ZW0/LmFjdGlvbikudG9CZSgnVVBEQVRFJyk7XG4gICAgICAgIGV4cGVjdChhdWRpdENhbGwuYXJnc1swXS5pbnB1dC5JdGVtPy5tb2RpZmllZEJ5KS50b0JlKCdBZG1pbiBVc2VyJyk7XG4gICAgICAgIGV4cGVjdChhdWRpdENhbGwuYXJnc1swXS5pbnB1dC5JdGVtPy5yZWFzb24pLnRvQmUoJ0NvcnJlY3RlZCBzY29yaW5nIGVycm9yJyk7XG4gICAgICAgIGV4cGVjdChhdWRpdENhbGwuYXJnc1swXS5pbnB1dC5JdGVtPy5wcmV2aW91c1ZhbHVlcykudG9CZURlZmluZWQoKTtcbiAgICAgICAgZXhwZWN0KGF1ZGl0Q2FsbC5hcmdzWzBdLmlucHV0Lkl0ZW0/Lm5ld1ZhbHVlcykudG9CZURlZmluZWQoKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZGVzY3JpYmUoJ2dldFNjb3JlQXVkaXRIaXN0b3J5JywgKCkgPT4ge1xuICAgICAgaXQoJ3Nob3VsZCByZXR1cm4gYXVkaXQgaGlzdG9yeSBmb3IgYSBzY29yZScsIGFzeW5jICgpID0+IHtcbiAgICAgICAgY29uc3QgbW9ja0F1ZGl0RW50cmllcyA9IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBpZDogJ2F1ZGl0LTEnLFxuICAgICAgICAgICAgc2NvcmVJZDogJ3Njb3JlLTEyMycsXG4gICAgICAgICAgICBhY3Rpb246ICdVUERBVEUnLFxuICAgICAgICAgICAgbW9kaWZpZWRCeTogJ0FkbWluIFVzZXInLFxuICAgICAgICAgICAgbW9kaWZpZWRBdDogJzIwMjQtMDEtMDFUMDE6MDA6MDAuMDAwWicsXG4gICAgICAgICAgICBwcmV2aW91c1ZhbHVlczogJ3tcImNhZ2VDb25kaXRpb25TY29yZVwiOiAyMH0nLFxuICAgICAgICAgICAgbmV3VmFsdWVzOiAne1wiY2FnZUNvbmRpdGlvblNjb3JlXCI6IDI1fScsXG4gICAgICAgICAgICByZWFzb246ICdDb3JyZWN0ZWQgc2NvcmluZyBlcnJvcicsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBpZDogJ2F1ZGl0LTInLFxuICAgICAgICAgICAgc2NvcmVJZDogJ3Njb3JlLTEyMycsXG4gICAgICAgICAgICBhY3Rpb246ICdDUkVBVEUnLFxuICAgICAgICAgICAgbW9kaWZpZWRCeTogJ0p1ZGdlIFNtaXRoJyxcbiAgICAgICAgICAgIG1vZGlmaWVkQXQ6ICcyMDI0LTAxLTAxVDAwOjAwOjAwLjAwMFonLFxuICAgICAgICAgICAgbmV3VmFsdWVzOiAne1wiY2FnZUNvbmRpdGlvblNjb3JlXCI6IDIwLCBcInRvdGFsU2NvcmVcIjogODN9JyxcbiAgICAgICAgICAgIHJlYXNvbjogJ0luaXRpYWwgc2NvcmUgY3JlYXRpb24nLFxuICAgICAgICAgIH0sXG4gICAgICAgIF07XG5cbiAgICAgICAgZGRiTW9jay5vbihRdWVyeUNvbW1hbmQpLnJlc29sdmVzKHsgSXRlbXM6IG1vY2tBdWRpdEVudHJpZXMgfSk7XG5cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2NvcmVEYXRhQWNjZXNzLmdldFNjb3JlQXVkaXRIaXN0b3J5KCdzY29yZS0xMjMnKTtcblxuICAgICAgICBleHBlY3QocmVzdWx0KS50b0hhdmVMZW5ndGgoMik7XG4gICAgICAgIGV4cGVjdChyZXN1bHRbMF0uYWN0aW9uKS50b0JlKCdVUERBVEUnKTtcbiAgICAgICAgZXhwZWN0KHJlc3VsdFswXS5tb2RpZmllZEJ5KS50b0JlKCdBZG1pbiBVc2VyJyk7XG4gICAgICAgIGV4cGVjdChyZXN1bHRbMF0ucHJldmlvdXNWYWx1ZXMpLnRvRXF1YWwoeyBjYWdlQ29uZGl0aW9uU2NvcmU6IDIwIH0pO1xuICAgICAgICBleHBlY3QocmVzdWx0WzBdLm5ld1ZhbHVlcykudG9FcXVhbCh7IGNhZ2VDb25kaXRpb25TY29yZTogMjUgfSk7XG4gICAgICAgIGV4cGVjdChyZXN1bHRbMV0uYWN0aW9uKS50b0JlKCdDUkVBVEUnKTtcbiAgICAgICAgZXhwZWN0KHJlc3VsdFsxXS5tb2RpZmllZEJ5KS50b0JlKCdKdWRnZSBTbWl0aCcpO1xuXG4gICAgICAgIGV4cGVjdChkZGJNb2NrLmNvbW1hbmRDYWxscyhRdWVyeUNvbW1hbmQpWzBdLmFyZ3NbMF0uaW5wdXQpLnRvRXF1YWwoe1xuICAgICAgICAgIFRhYmxlTmFtZTogdGFibGVOYW1lLFxuICAgICAgICAgIEtleUNvbmRpdGlvbkV4cHJlc3Npb246ICdQSyA9IDpwayBBTkQgYmVnaW5zX3dpdGgoU0ssIDpzayknLFxuICAgICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcbiAgICAgICAgICAgICc6cGsnOiAnU0NPUkUjc2NvcmUtMTIzJyxcbiAgICAgICAgICAgICc6c2snOiAnQVVESVQjJyxcbiAgICAgICAgICB9LFxuICAgICAgICAgIFNjYW5JbmRleEZvcndhcmQ6IGZhbHNlLFxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICBpdCgnc2hvdWxkIHJldHVybiBlbXB0eSBhcnJheSB3aGVuIG5vIGF1ZGl0IGhpc3RvcnkgZXhpc3RzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgICBkZGJNb2NrLm9uKFF1ZXJ5Q29tbWFuZCkucmVzb2x2ZXMoeyBJdGVtczogW10gfSk7XG5cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2NvcmVEYXRhQWNjZXNzLmdldFNjb3JlQXVkaXRIaXN0b3J5KCdzY29yZS0xMjMnKTtcblxuICAgICAgICBleHBlY3QocmVzdWx0KS50b0VxdWFsKFtdKTtcbiAgICAgIH0pO1xuXG4gICAgICBpdCgnc2hvdWxkIGhhbmRsZSBhdWRpdCBlbnRyaWVzIHdpdGggbWlzc2luZyBKU09OIHZhbHVlcycsIGFzeW5jICgpID0+IHtcbiAgICAgICAgY29uc3QgbW9ja0F1ZGl0RW50cmllcyA9IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBpZDogJ2F1ZGl0LTEnLFxuICAgICAgICAgICAgc2NvcmVJZDogJ3Njb3JlLTEyMycsXG4gICAgICAgICAgICBhY3Rpb246ICdDUkVBVEUnLFxuICAgICAgICAgICAgbW9kaWZpZWRCeTogJ0p1ZGdlIFNtaXRoJyxcbiAgICAgICAgICAgIG1vZGlmaWVkQXQ6ICcyMDI0LTAxLTAxVDAwOjAwOjAwLjAwMFonLFxuICAgICAgICAgICAgcmVhc29uOiAnSW5pdGlhbCBzY29yZSBjcmVhdGlvbicsXG4gICAgICAgICAgICAvLyBObyBwcmV2aW91c1ZhbHVlcyBvciBuZXdWYWx1ZXNcbiAgICAgICAgICB9LFxuICAgICAgICBdO1xuXG4gICAgICAgIGRkYk1vY2sub24oUXVlcnlDb21tYW5kKS5yZXNvbHZlcyh7IEl0ZW1zOiBtb2NrQXVkaXRFbnRyaWVzIH0pO1xuXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNjb3JlRGF0YUFjY2Vzcy5nZXRTY29yZUF1ZGl0SGlzdG9yeSgnc2NvcmUtMTIzJyk7XG5cbiAgICAgICAgZXhwZWN0KHJlc3VsdCkudG9IYXZlTGVuZ3RoKDEpO1xuICAgICAgICBleHBlY3QocmVzdWx0WzBdLnByZXZpb3VzVmFsdWVzKS50b0JlVW5kZWZpbmVkKCk7XG4gICAgICAgIGV4cGVjdChyZXN1bHRbMF0ubmV3VmFsdWVzKS50b0JlVW5kZWZpbmVkKCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG59KTsiXX0=