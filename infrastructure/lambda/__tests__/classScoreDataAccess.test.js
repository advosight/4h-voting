"use strict";
/**
 * Unit tests for ClassScoreDataAccess
 */
Object.defineProperty(exports, "__esModule", { value: true });
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const aws_sdk_client_mock_1 = require("aws-sdk-client-mock");
const classScoreDataAccess_1 = require("../classScoreDataAccess");
const ddbMock = (0, aws_sdk_client_mock_1.mockClient)(lib_dynamodb_1.DynamoDBDocumentClient);
describe('ClassScoreDataAccess', () => {
    let classScoreDataAccess;
    const tableName = 'test-table';
    beforeEach(() => {
        ddbMock.reset();
        const docClient = ddbMock;
        classScoreDataAccess = new classScoreDataAccess_1.ClassScoreDataAccess(docClient, tableName);
    });
    describe('createClassScore', () => {
        const validInput = {
            catId: 'cat-123',
            judgeId: 'judge-456',
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
            isFinalized: false
        };
        it('should create a class score with correct total and ribbon eligibility', async () => {
            ddbMock.on(lib_dynamodb_1.PutCommand).resolves({});
            const result = await classScoreDataAccess.createClassScore(validInput);
            expect(result.catId).toBe('cat-123');
            expect(result.judgeId).toBe('judge-456');
            expect(result.judgeName).toBe('Judge Smith');
            expect(result.totalScore).toBe(43); // 12 + 18 + 13
            expect(result.ribbonEligibility).toBe('Red'); // 43 points with all health passed
            expect(result.isFinalized).toBe(false);
            expect(result.id).toBeDefined();
            expect(result.timestamp).toBeDefined();
        });
        it('should calculate Blue ribbon for high scores with all health passed', async () => {
            const highScoreInput = {
                ...validInput,
                beautyScore: 15,
                personalityScore: 20,
                balanceProportionScore: 12
            };
            ddbMock.on(lib_dynamodb_1.PutCommand).resolves({});
            const result = await classScoreDataAccess.createClassScore(highScoreInput);
            expect(result.totalScore).toBe(47);
            expect(result.ribbonEligibility).toBe('Blue');
        });
        it('should calculate Red ribbon when health fails regardless of score', async () => {
            const healthFailInput = {
                ...validInput,
                beautyScore: 15,
                personalityScore: 20,
                balanceProportionScore: 15,
                fleaIssues: true
            };
            ddbMock.on(lib_dynamodb_1.PutCommand).resolves({});
            const result = await classScoreDataAccess.createClassScore(healthFailInput);
            expect(result.totalScore).toBe(50);
            expect(result.ribbonEligibility).toBe('Red'); // Flea issues override high score
        });
        it('should calculate White ribbon for lower scores', async () => {
            const lowerScoreInput = {
                ...validInput,
                beautyScore: 10,
                personalityScore: 12,
                balanceProportionScore: 8
            };
            ddbMock.on(lib_dynamodb_1.PutCommand).resolves({});
            const result = await classScoreDataAccess.createClassScore(lowerScoreInput);
            expect(result.totalScore).toBe(30);
            expect(result.ribbonEligibility).toBe('White');
        });
        it('should calculate Participation ribbon for very low scores', async () => {
            const veryLowScoreInput = {
                ...validInput,
                beautyScore: 5,
                personalityScore: 8,
                balanceProportionScore: 7
            };
            ddbMock.on(lib_dynamodb_1.PutCommand).resolves({});
            const result = await classScoreDataAccess.createClassScore(veryLowScoreInput);
            expect(result.totalScore).toBe(20);
            expect(result.ribbonEligibility).toBe('Participation');
        });
        it('should store records in correct DynamoDB patterns', async () => {
            ddbMock.on(lib_dynamodb_1.PutCommand).resolves({});
            await classScoreDataAccess.createClassScore(validInput);
            // Should make 3 PutCommand calls: main record, cat index, judge index
            expect(ddbMock.commandCalls(lib_dynamodb_1.PutCommand)).toHaveLength(3);
            const calls = ddbMock.commandCalls(lib_dynamodb_1.PutCommand);
            // Main record
            expect(calls[0].args[0].input.Item?.PK).toMatch(/^CLASS_SCORE#/);
            expect(calls[0].args[0].input.Item?.SK).toBe('METADATA');
            // Cat index
            expect(calls[1].args[0].input.Item?.PK).toBe('CAT#cat-123');
            expect(calls[1].args[0].input.Item?.SK).toMatch(/^CLASS_SCORE#/);
            // Judge index
            expect(calls[2].args[0].input.Item?.PK).toBe('JUDGE#judge-456');
            expect(calls[2].args[0].input.Item?.SK).toMatch(/^CLASS_SCORE#/);
        });
    });
    describe('getClassScore', () => {
        it('should return null when class score not found', async () => {
            ddbMock.on(lib_dynamodb_1.GetCommand).resolves({});
            const result = await classScoreDataAccess.getClassScore('nonexistent-id');
            expect(result).toBeNull();
        });
        it('should return class score when found', async () => {
            const mockItem = {
                id: 'score-123',
                catId: 'cat-123',
                judgeId: 'judge-456',
                judgeName: 'Judge Smith',
                beautyScore: '12',
                beautyComments: 'Beautiful cat',
                personalityScore: '18',
                personalityComments: 'Very friendly',
                balanceProportionScore: '13',
                balanceProportionComments: 'Well proportioned',
                coatCleanGroomed: true,
                teethGumsHealthy: true,
                eyesNoseClear: true,
                earsCleanMiteFree: true,
                toenailsClipped: true,
                fleaIssues: false,
                healthGroomingComments: 'Cat appears healthy',
                totalScore: '43',
                ribbonEligibility: 'Red',
                timestamp: '2023-01-01T00:00:00.000Z',
                isFinalized: false
            };
            ddbMock.on(lib_dynamodb_1.GetCommand).resolves({ Item: mockItem });
            const result = await classScoreDataAccess.getClassScore('score-123');
            expect(result).not.toBeNull();
            expect(result.id).toBe('score-123');
            expect(result.totalScore).toBe(43);
            expect(result.ribbonEligibility).toBe('Red');
        });
    });
    describe('updateClassScore', () => {
        const existingScore = {
            id: 'score-123',
            catId: 'cat-123',
            judgeId: 'judge-456',
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
        it('should throw error when class score not found', async () => {
            ddbMock.on(lib_dynamodb_1.GetCommand).resolves({});
            await expect(classScoreDataAccess.updateClassScore('nonexistent-id', {})).rejects.toThrow('Class score not found');
        });
        it('should update class score and recalculate totals', async () => {
            // Mock getClassScore call
            ddbMock.on(lib_dynamodb_1.GetCommand).resolves({
                Item: {
                    ...existingScore,
                    beautyScore: '12',
                    personalityScore: '18',
                    balanceProportionScore: '13',
                    totalScore: '43'
                }
            });
            // Mock update calls
            ddbMock.on(lib_dynamodb_1.UpdateCommand).resolves({});
            ddbMock.on(lib_dynamodb_1.PutCommand).resolves({});
            const updateInput = {
                beautyScore: 15,
                personalityScore: 20
            };
            const result = await classScoreDataAccess.updateClassScore('score-123', updateInput);
            expect(result.beautyScore).toBe(15);
            expect(result.personalityScore).toBe(20);
            expect(result.totalScore).toBe(48); // 15 + 20 + 13
            expect(result.ribbonEligibility).toBe('Blue'); // High score with health passed
        });
        it('should update ribbon eligibility when health status changes', async () => {
            // Mock getClassScore call
            ddbMock.on(lib_dynamodb_1.GetCommand).resolves({
                Item: {
                    ...existingScore,
                    beautyScore: '15',
                    personalityScore: '20',
                    balanceProportionScore: '15',
                    totalScore: '50'
                }
            });
            // Mock update calls
            ddbMock.on(lib_dynamodb_1.UpdateCommand).resolves({});
            ddbMock.on(lib_dynamodb_1.PutCommand).resolves({});
            const updateInput = {
                fleaIssues: true // This should force Red ribbon
            };
            const result = await classScoreDataAccess.updateClassScore('score-123', updateInput);
            expect(result.totalScore).toBe(50);
            expect(result.ribbonEligibility).toBe('Red'); // Flea issues override high score
        });
    });
    describe('deleteClassScore', () => {
        it('should throw error when class score not found', async () => {
            ddbMock.on(lib_dynamodb_1.GetCommand).resolves({});
            await expect(classScoreDataAccess.deleteClassScore('nonexistent-id')).rejects.toThrow('Class score not found');
        });
        it('should delete class score and all index records', async () => {
            const existingScore = {
                id: 'score-123',
                catId: 'cat-123',
                judgeId: 'judge-456',
                judgeName: 'Judge Smith',
                beautyScore: '12',
                personalityScore: '18',
                balanceProportionScore: '13',
                totalScore: '43'
            };
            ddbMock.on(lib_dynamodb_1.GetCommand).resolves({ Item: existingScore });
            ddbMock.on(lib_dynamodb_1.DeleteCommand).resolves({});
            const result = await classScoreDataAccess.deleteClassScore('score-123');
            expect(result.id).toBe('score-123');
            // Should make 3 DeleteCommand calls (main, cat index, judge index)
            expect(ddbMock.commandCalls(lib_dynamodb_1.DeleteCommand)).toHaveLength(3);
        });
    });
    describe('getClassScoresByCat', () => {
        it('should return empty array when no class scores found', async () => {
            ddbMock.on(lib_dynamodb_1.QueryCommand).resolves({ Items: [] });
            const result = await classScoreDataAccess.getClassScoresByCat('cat-123');
            expect(result).toEqual([]);
        });
        it('should return class scores for cat', async () => {
            const mockIndexItems = [
                { classScoreId: 'score-1' },
                { classScoreId: 'score-2' }
            ];
            ddbMock.on(lib_dynamodb_1.QueryCommand).resolves({ Items: mockIndexItems });
            // Mock individual getClassScore calls
            ddbMock.on(lib_dynamodb_1.GetCommand)
                .resolvesOnce({ Item: { id: 'score-1', catId: 'cat-123', totalScore: '40' } })
                .resolvesOnce({ Item: { id: 'score-2', catId: 'cat-123', totalScore: '45' } });
            const result = await classScoreDataAccess.getClassScoresByCat('cat-123');
            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('score-1');
            expect(result[1].id).toBe('score-2');
        });
    });
    describe('getClassScoresByJudge', () => {
        it('should return empty array when no class scores found', async () => {
            ddbMock.on(lib_dynamodb_1.QueryCommand).resolves({ Items: [] });
            const result = await classScoreDataAccess.getClassScoresByJudge('judge-456');
            expect(result).toEqual([]);
        });
        it('should return class scores for judge', async () => {
            const mockIndexItems = [
                { classScoreId: 'score-1' },
                { classScoreId: 'score-2' }
            ];
            ddbMock.on(lib_dynamodb_1.QueryCommand).resolves({ Items: mockIndexItems });
            // Mock individual getClassScore calls
            ddbMock.on(lib_dynamodb_1.GetCommand)
                .resolvesOnce({ Item: { id: 'score-1', judgeId: 'judge-456', totalScore: '40' } })
                .resolvesOnce({ Item: { id: 'score-2', judgeId: 'judge-456', totalScore: '45' } });
            const result = await classScoreDataAccess.getClassScoresByJudge('judge-456');
            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('score-1');
            expect(result[1].id).toBe('score-2');
        });
    });
    describe('getClassScoresByCage', () => {
        it('should return empty array when cat not found', async () => {
            ddbMock.on(lib_dynamodb_1.ScanCommand).resolves({ Items: [] });
            const result = await classScoreDataAccess.getClassScoresByCage(123);
            expect(result).toEqual([]);
        });
        it('should return class scores for cage number', async () => {
            // Mock finding cat by cage number
            ddbMock.on(lib_dynamodb_1.ScanCommand).resolves({
                Items: [{ PK: 'CAT#cat-123', cageNumber: 123 }]
            });
            // Mock getting class scores by cat
            ddbMock.on(lib_dynamodb_1.QueryCommand).resolves({
                Items: [{ classScoreId: 'score-1' }]
            });
            // Mock individual getClassScore call
            ddbMock.on(lib_dynamodb_1.GetCommand).resolves({
                Item: { id: 'score-1', catId: 'cat-123', totalScore: '40' }
            });
            const result = await classScoreDataAccess.getClassScoresByCage(123);
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('score-1');
        });
    });
    describe('listAllClassScores', () => {
        it('should return empty array when no class scores exist', async () => {
            ddbMock.on(lib_dynamodb_1.ScanCommand).resolves({ Items: [] });
            const result = await classScoreDataAccess.listAllClassScores();
            expect(result).toEqual([]);
        });
        it('should return all class scores', async () => {
            const mockItems = [
                {
                    id: 'score-1',
                    catId: 'cat-123',
                    judgeId: 'judge-456',
                    judgeName: 'Judge Smith',
                    beautyScore: '12',
                    personalityScore: '18',
                    balanceProportionScore: '13',
                    totalScore: '43',
                    ribbonEligibility: 'Red',
                    timestamp: '2023-01-01T00:00:00.000Z',
                    isFinalized: false
                },
                {
                    id: 'score-2',
                    catId: 'cat-456',
                    judgeId: 'judge-789',
                    judgeName: 'Judge Jones',
                    beautyScore: '15',
                    personalityScore: '20',
                    balanceProportionScore: '15',
                    totalScore: '50',
                    ribbonEligibility: 'Blue',
                    timestamp: '2023-01-02T00:00:00.000Z',
                    isFinalized: true
                }
            ];
            ddbMock.on(lib_dynamodb_1.ScanCommand).resolves({ Items: mockItems });
            const result = await classScoreDataAccess.listAllClassScores();
            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('score-1');
            expect(result[0].totalScore).toBe(43);
            expect(result[1].id).toBe('score-2');
            expect(result[1].totalScore).toBe(50);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhc3NTY29yZURhdGFBY2Nlc3MudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNsYXNzU2NvcmVEYXRhQWNjZXNzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOztHQUVHOztBQUVILHdEQUFnSjtBQUNoSiw2REFBaUQ7QUFDakQsa0VBQTZHO0FBRTdHLE1BQU0sT0FBTyxHQUFHLElBQUEsZ0NBQVUsRUFBQyxxQ0FBc0IsQ0FBQyxDQUFDO0FBRW5ELFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7SUFDcEMsSUFBSSxvQkFBMEMsQ0FBQztJQUMvQyxNQUFNLFNBQVMsR0FBRyxZQUFZLENBQUM7SUFFL0IsVUFBVSxDQUFDLEdBQUcsRUFBRTtRQUNkLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNoQixNQUFNLFNBQVMsR0FBRyxPQUE0QyxDQUFDO1FBQy9ELG9CQUFvQixHQUFHLElBQUksMkNBQW9CLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ3hFLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtRQUNoQyxNQUFNLFVBQVUsR0FBMEI7WUFDeEMsS0FBSyxFQUFFLFNBQVM7WUFDaEIsT0FBTyxFQUFFLFdBQVc7WUFDcEIsU0FBUyxFQUFFLGFBQWE7WUFDeEIsV0FBVyxFQUFFLEVBQUU7WUFDZixjQUFjLEVBQUUsZUFBZTtZQUMvQixnQkFBZ0IsRUFBRSxFQUFFO1lBQ3BCLG1CQUFtQixFQUFFLGVBQWU7WUFDcEMsc0JBQXNCLEVBQUUsRUFBRTtZQUMxQix5QkFBeUIsRUFBRSxtQkFBbUI7WUFDOUMsZ0JBQWdCLEVBQUUsSUFBSTtZQUN0QixnQkFBZ0IsRUFBRSxJQUFJO1lBQ3RCLGFBQWEsRUFBRSxJQUFJO1lBQ25CLGlCQUFpQixFQUFFLElBQUk7WUFDdkIsZUFBZSxFQUFFLElBQUk7WUFDckIsVUFBVSxFQUFFLEtBQUs7WUFDakIsc0JBQXNC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dkQsTUFBTSxNQUFNLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBRS9ELE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0IsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDckMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDdEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDckMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDeEMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBVbml0IHRlc3RzIGZvciBDbGFzc1Njb3JlRGF0YUFjY2Vzc1xuICovXG5cbmltcG9ydCB7IER5bmFtb0RCRG9jdW1lbnRDbGllbnQsIEdldENvbW1hbmQsIFB1dENvbW1hbmQsIERlbGV0ZUNvbW1hbmQsIFF1ZXJ5Q29tbWFuZCwgU2NhbkNvbW1hbmQsIFVwZGF0ZUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xuaW1wb3J0IHsgbW9ja0NsaWVudCB9IGZyb20gJ2F3cy1zZGstY2xpZW50LW1vY2snO1xuaW1wb3J0IHsgQ2xhc3NTY29yZURhdGFBY2Nlc3MsIENyZWF0ZUNsYXNzU2NvcmVJbnB1dCwgVXBkYXRlQ2xhc3NTY29yZUlucHV0IH0gZnJvbSAnLi4vY2xhc3NTY29yZURhdGFBY2Nlc3MnO1xuXG5jb25zdCBkZGJNb2NrID0gbW9ja0NsaWVudChEeW5hbW9EQkRvY3VtZW50Q2xpZW50KTtcblxuZGVzY3JpYmUoJ0NsYXNzU2NvcmVEYXRhQWNjZXNzJywgKCkgPT4ge1xuICBsZXQgY2xhc3NTY29yZURhdGFBY2Nlc3M6IENsYXNzU2NvcmVEYXRhQWNjZXNzO1xuICBjb25zdCB0YWJsZU5hbWUgPSAndGVzdC10YWJsZSc7XG5cbiAgYmVmb3JlRWFjaCgoKSA9PiB7XG4gICAgZGRiTW9jay5yZXNldCgpO1xuICAgIGNvbnN0IGRvY0NsaWVudCA9IGRkYk1vY2sgYXMgdW5rbm93biBhcyBEeW5hbW9EQkRvY3VtZW50Q2xpZW50O1xuICAgIGNsYXNzU2NvcmVEYXRhQWNjZXNzID0gbmV3IENsYXNzU2NvcmVEYXRhQWNjZXNzKGRvY0NsaWVudCwgdGFibGVOYW1lKTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2NyZWF0ZUNsYXNzU2NvcmUnLCAoKSA9PiB7XG4gICAgY29uc3QgdmFsaWRJbnB1dDogQ3JlYXRlQ2xhc3NTY29yZUlucHV0ID0ge1xuICAgICAgY2F0SWQ6ICdjYXQtMTIzJyxcbiAgICAgIGp1ZGdlSWQ6ICdqdWRnZS00NTYnLFxuICAgICAganVkZ2VOYW1lOiAnSnVkZ2UgU21pdGgnLFxuICAgICAgYmVhdXR5U2NvcmU6IDEyLFxuICAgICAgYmVhdXR5Q29tbWVudHM6ICdCZWF1dGlmdWwgY2F0JyxcbiAgICAgIHBlcnNvbmFsaXR5U2NvcmU6IDE4LFxuICAgICAgcGVyc29uYWxpdHlDb21tZW50czogJ1ZlcnkgZnJpZW5kbHknLFxuICAgICAgYmFsYW5jZVByb3BvcnRpb25TY29yZTogMTMsXG4gICAgICBiYWxhbmNlUHJvcG9ydGlvbkNvbW1lbnRzOiAnV2VsbCBwcm9wb3J0aW9uZWQnLFxuICAgICAgY29hdENsZWFuR3Jvb21lZDogdHJ1ZSxcbiAgICAgIHRlZXRoR3Vtc0hlYWx0aHk6IHRydWUsXG4gICAgICBleWVzTm9zZUNsZWFyOiB0cnVlLFxuICAgICAgZWFyc0NsZWFuTWl0ZUZyZWU6IHRydWUsXG4gICAgICB0b2VuYWlsc0NsaXBwZWQ6IHRydWUsXG4gICAgICBmbGVhSXNzdWVzOiBmYWxzZSxcbiAgICAgIGhlYWx0aEdyb29taW5nQ29tbWVudHM6ICdDYXQgYXBwZWFycyBoZWFsdGh5JyxcbiAgICAgIGlzRmluYWxpemVkOiBmYWxzZVxuICAgIH07XG5cbiAgICBpdCgnc2hvdWxkIGNyZWF0ZSBhIGNsYXNzIHNjb3JlIHdpdGggY29ycmVjdCB0b3RhbCBhbmQgcmliYm9uIGVsaWdpYmlsaXR5JywgYXN5bmMgKCkgPT4ge1xuICAgICAgZGRiTW9jay5vbihQdXRDb21tYW5kKS5yZXNvbHZlcyh7fSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNsYXNzU2NvcmVEYXRhQWNjZXNzLmNyZWF0ZUNsYXNzU2NvcmUodmFsaWRJbnB1dCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQuY2F0SWQpLnRvQmUoJ2NhdC0xMjMnKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuanVkZ2VJZCkudG9CZSgnanVkZ2UtNDU2Jyk7XG4gICAgICBleHBlY3QocmVzdWx0Lmp1ZGdlTmFtZSkudG9CZSgnSnVkZ2UgU21pdGgnKTtcbiAgICAgIGV4cGVjdChyZXN1bHQudG90YWxTY29yZSkudG9CZSg0Myk7IC8vIDEyICsgMTggKyAxM1xuICAgICAgZXhwZWN0KHJlc3VsdC5yaWJib25FbGlnaWJpbGl0eSkudG9CZSgnUmVkJyk7IC8vIDQzIHBvaW50cyB3aXRoIGFsbCBoZWFsdGggcGFzc2VkXG4gICAgICBleHBlY3QocmVzdWx0LmlzRmluYWxpemVkKS50b0JlKGZhbHNlKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuaWQpLnRvQmVEZWZpbmVkKCk7XG4gICAgICBleHBlY3QocmVzdWx0LnRpbWVzdGFtcCkudG9CZURlZmluZWQoKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgY2FsY3VsYXRlIEJsdWUgcmliYm9uIGZvciBoaWdoIHNjb3JlcyB3aXRoIGFsbCBoZWFsdGggcGFzc2VkJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgaGlnaFNjb3JlSW5wdXQgPSB7XG4gICAgICAgIC4uLnZhbGlkSW5wdXQsXG4gICAgICAgIGJlYXV0eVNjb3JlOiAxNSxcbiAgICAgICAgcGVyc29uYWxpdHlTY29yZTogMjAsXG4gICAgICAgIGJhbGFuY2VQcm9wb3J0aW9uU2NvcmU6IDEyXG4gICAgICB9O1xuICAgICAgZGRiTW9jay5vbihQdXRDb21tYW5kKS5yZXNvbHZlcyh7fSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNsYXNzU2NvcmVEYXRhQWNjZXNzLmNyZWF0ZUNsYXNzU2NvcmUoaGlnaFNjb3JlSW5wdXQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0LnRvdGFsU2NvcmUpLnRvQmUoNDcpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5yaWJib25FbGlnaWJpbGl0eSkudG9CZSgnQmx1ZScpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBjYWxjdWxhdGUgUmVkIHJpYmJvbiB3aGVuIGhlYWx0aCBmYWlscyByZWdhcmRsZXNzIG9mIHNjb3JlJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgaGVhbHRoRmFpbElucHV0ID0ge1xuICAgICAgICAuLi52YWxpZElucHV0LFxuICAgICAgICBiZWF1dHlTY29yZTogMTUsXG4gICAgICAgIHBlcnNvbmFsaXR5U2NvcmU6IDIwLFxuICAgICAgICBiYWxhbmNlUHJvcG9ydGlvblNjb3JlOiAxNSxcbiAgICAgICAgZmxlYUlzc3VlczogdHJ1ZVxuICAgICAgfTtcbiAgICAgIGRkYk1vY2sub24oUHV0Q29tbWFuZCkucmVzb2x2ZXMoe30pO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjbGFzc1Njb3JlRGF0YUFjY2Vzcy5jcmVhdGVDbGFzc1Njb3JlKGhlYWx0aEZhaWxJbnB1dCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQudG90YWxTY29yZSkudG9CZSg1MCk7XG4gICAgICBleHBlY3QocmVzdWx0LnJpYmJvbkVsaWdpYmlsaXR5KS50b0JlKCdSZWQnKTsgLy8gRmxlYSBpc3N1ZXMgb3ZlcnJpZGUgaGlnaCBzY29yZVxuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBjYWxjdWxhdGUgV2hpdGUgcmliYm9uIGZvciBsb3dlciBzY29yZXMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBsb3dlclNjb3JlSW5wdXQgPSB7XG4gICAgICAgIC4uLnZhbGlkSW5wdXQsXG4gICAgICAgIGJlYXV0eVNjb3JlOiAxMCxcbiAgICAgICAgcGVyc29uYWxpdHlTY29yZTogMTIsXG4gICAgICAgIGJhbGFuY2VQcm9wb3J0aW9uU2NvcmU6IDhcbiAgICAgIH07XG4gICAgICBkZGJNb2NrLm9uKFB1dENvbW1hbmQpLnJlc29sdmVzKHt9KTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2xhc3NTY29yZURhdGFBY2Nlc3MuY3JlYXRlQ2xhc3NTY29yZShsb3dlclNjb3JlSW5wdXQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0LnRvdGFsU2NvcmUpLnRvQmUoMzApO1xuICAgICAgZXhwZWN0KHJlc3VsdC5yaWJib25FbGlnaWJpbGl0eSkudG9CZSgnV2hpdGUnKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgY2FsY3VsYXRlIFBhcnRpY2lwYXRpb24gcmliYm9uIGZvciB2ZXJ5IGxvdyBzY29yZXMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCB2ZXJ5TG93U2NvcmVJbnB1dCA9IHtcbiAgICAgICAgLi4udmFsaWRJbnB1dCxcbiAgICAgICAgYmVhdXR5U2NvcmU6IDUsXG4gICAgICAgIHBlcnNvbmFsaXR5U2NvcmU6IDgsXG4gICAgICAgIGJhbGFuY2VQcm9wb3J0aW9uU2NvcmU6IDdcbiAgICAgIH07XG4gICAgICBkZGJNb2NrLm9uKFB1dENvbW1hbmQpLnJlc29sdmVzKHt9KTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2xhc3NTY29yZURhdGFBY2Nlc3MuY3JlYXRlQ2xhc3NTY29yZSh2ZXJ5TG93U2NvcmVJbnB1dCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQudG90YWxTY29yZSkudG9CZSgyMCk7XG4gICAgICBleHBlY3QocmVzdWx0LnJpYmJvbkVsaWdpYmlsaXR5KS50b0JlKCdQYXJ0aWNpcGF0aW9uJyk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHN0b3JlIHJlY29yZHMgaW4gY29ycmVjdCBEeW5hbW9EQiBwYXR0ZXJucycsIGFzeW5jICgpID0+IHtcbiAgICAgIGRkYk1vY2sub24oUHV0Q29tbWFuZCkucmVzb2x2ZXMoe30pO1xuXG4gICAgICBhd2FpdCBjbGFzc1Njb3JlRGF0YUFjY2Vzcy5jcmVhdGVDbGFzc1Njb3JlKHZhbGlkSW5wdXQpO1xuXG4gICAgICAvLyBTaG91bGQgbWFrZSAzIFB1dENvbW1hbmQgY2FsbHM6IG1haW4gcmVjb3JkLCBjYXQgaW5kZXgsIGp1ZGdlIGluZGV4XG4gICAgICBleHBlY3QoZGRiTW9jay5jb21tYW5kQ2FsbHMoUHV0Q29tbWFuZCkpLnRvSGF2ZUxlbmd0aCgzKTtcbiAgICAgIFxuICAgICAgY29uc3QgY2FsbHMgPSBkZGJNb2NrLmNvbW1hbmRDYWxscyhQdXRDb21tYW5kKTtcbiAgICAgIFxuICAgICAgLy8gTWFpbiByZWNvcmRcbiAgICAgIGV4cGVjdChjYWxsc1swXS5hcmdzWzBdLmlucHV0Lkl0ZW0/LlBLKS50b01hdGNoKC9eQ0xBU1NfU0NPUkUjLyk7XG4gICAgICBleHBlY3QoY2FsbHNbMF0uYXJnc1swXS5pbnB1dC5JdGVtPy5TSykudG9CZSgnTUVUQURBVEEnKTtcbiAgICAgIFxuICAgICAgLy8gQ2F0IGluZGV4XG4gICAgICBleHBlY3QoY2FsbHNbMV0uYXJnc1swXS5pbnB1dC5JdGVtPy5QSykudG9CZSgnQ0FUI2NhdC0xMjMnKTtcbiAgICAgIGV4cGVjdChjYWxsc1sxXS5hcmdzWzBdLmlucHV0Lkl0ZW0/LlNLKS50b01hdGNoKC9eQ0xBU1NfU0NPUkUjLyk7XG4gICAgICBcbiAgICAgIC8vIEp1ZGdlIGluZGV4XG4gICAgICBleHBlY3QoY2FsbHNbMl0uYXJnc1swXS5pbnB1dC5JdGVtPy5QSykudG9CZSgnSlVER0UjanVkZ2UtNDU2Jyk7XG4gICAgICBleHBlY3QoY2FsbHNbMl0uYXJnc1swXS5pbnB1dC5JdGVtPy5TSykudG9NYXRjaCgvXkNMQVNTX1NDT1JFIy8pO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnZ2V0Q2xhc3NTY29yZScsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIHJldHVybiBudWxsIHdoZW4gY2xhc3Mgc2NvcmUgbm90IGZvdW5kJywgYXN5bmMgKCkgPT4ge1xuICAgICAgZGRiTW9jay5vbihHZXRDb21tYW5kKS5yZXNvbHZlcyh7fSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNsYXNzU2NvcmVEYXRhQWNjZXNzLmdldENsYXNzU2NvcmUoJ25vbmV4aXN0ZW50LWlkJyk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvQmVOdWxsKCk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHJldHVybiBjbGFzcyBzY29yZSB3aGVuIGZvdW5kJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgbW9ja0l0ZW0gPSB7XG4gICAgICAgIGlkOiAnc2NvcmUtMTIzJyxcbiAgICAgICAgY2F0SWQ6ICdjYXQtMTIzJyxcbiAgICAgICAganVkZ2VJZDogJ2p1ZGdlLTQ1NicsXG4gICAgICAgIGp1ZGdlTmFtZTogJ0p1ZGdlIFNtaXRoJyxcbiAgICAgICAgYmVhdXR5U2NvcmU6ICcxMicsXG4gICAgICAgIGJlYXV0eUNvbW1lbnRzOiAnQmVhdXRpZnVsIGNhdCcsXG4gICAgICAgIHBlcnNvbmFsaXR5U2NvcmU6ICcxOCcsXG4gICAgICAgIHBlcnNvbmFsaXR5Q29tbWVudHM6ICdWZXJ5IGZyaWVuZGx5JyxcbiAgICAgICAgYmFsYW5jZVByb3BvcnRpb25TY29yZTogJzEzJyxcbiAgICAgICAgYmFsYW5jZVByb3BvcnRpb25Db21tZW50czogJ1dlbGwgcHJvcG9ydGlvbmVkJyxcbiAgICAgICAgY29hdENsZWFuR3Jvb21lZDogdHJ1ZSxcbiAgICAgICAgdGVldGhHdW1zSGVhbHRoeTogdHJ1ZSxcbiAgICAgICAgZXllc05vc2VDbGVhcjogdHJ1ZSxcbiAgICAgICAgZWFyc0NsZWFuTWl0ZUZyZWU6IHRydWUsXG4gICAgICAgIHRvZW5haWxzQ2xpcHBlZDogdHJ1ZSxcbiAgICAgICAgZmxlYUlzc3VlczogZmFsc2UsXG4gICAgICAgIGhlYWx0aEdyb29taW5nQ29tbWVudHM6ICdDYXQgYXBwZWFycyBoZWFsdGh5JyxcbiAgICAgICAgdG90YWxTY29yZTogJzQzJyxcbiAgICAgICAgcmliYm9uRWxpZ2liaWxpdHk6ICdSZWQnLFxuICAgICAgICB0aW1lc3RhbXA6ICcyMDIzLTAxLTAxVDAwOjAwOjAwLjAwMFonLFxuICAgICAgICBpc0ZpbmFsaXplZDogZmFsc2VcbiAgICAgIH07XG4gICAgICBkZGJNb2NrLm9uKEdldENvbW1hbmQpLnJlc29sdmVzKHsgSXRlbTogbW9ja0l0ZW0gfSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNsYXNzU2NvcmVEYXRhQWNjZXNzLmdldENsYXNzU2NvcmUoJ3Njb3JlLTEyMycpO1xuXG4gICAgICBleHBlY3QocmVzdWx0KS5ub3QudG9CZU51bGwoKTtcbiAgICAgIGV4cGVjdChyZXN1bHQhLmlkKS50b0JlKCdzY29yZS0xMjMnKTtcbiAgICAgIGV4cGVjdChyZXN1bHQhLnRvdGFsU2NvcmUpLnRvQmUoNDMpO1xuICAgICAgZXhwZWN0KHJlc3VsdCEucmliYm9uRWxpZ2liaWxpdHkpLnRvQmUoJ1JlZCcpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgndXBkYXRlQ2xhc3NTY29yZScsICgpID0+IHtcbiAgICBjb25zdCBleGlzdGluZ1Njb3JlID0ge1xuICAgICAgaWQ6ICdzY29yZS0xMjMnLFxuICAgICAgY2F0SWQ6ICdjYXQtMTIzJyxcbiAgICAgIGp1ZGdlSWQ6ICdqdWRnZS00NTYnLFxuICAgICAganVkZ2VOYW1lOiAnSnVkZ2UgU21pdGgnLFxuICAgICAgYmVhdXR5U2NvcmU6IDEyLFxuICAgICAgYmVhdXR5Q29tbWVudHM6ICdCZWF1dGlmdWwgY2F0JyxcbiAgICAgIHBlcnNvbmFsaXR5U2NvcmU6IDE4LFxuICAgICAgcGVyc29uYWxpdHlDb21tZW50czogJ1ZlcnkgZnJpZW5kbHknLFxuICAgICAgYmFsYW5jZVByb3BvcnRpb25TY29yZTogMTMsXG4gICAgICBiYWxhbmNlUHJvcG9ydGlvbkNvbW1lbnRzOiAnV2VsbCBwcm9wb3J0aW9uZWQnLFxuICAgICAgY29hdENsZWFuR3Jvb21lZDogdHJ1ZSxcbiAgICAgIHRlZXRoR3Vtc0hlYWx0aHk6IHRydWUsXG4gICAgICBleWVzTm9zZUNsZWFyOiB0cnVlLFxuICAgICAgZWFyc0NsZWFuTWl0ZUZyZWU6IHRydWUsXG4gICAgICB0b2VuYWlsc0NsaXBwZWQ6IHRydWUsXG4gICAgICBmbGVhSXNzdWVzOiBmYWxzZSxcbiAgICAgIGhlYWx0aEdyb29taW5nQ29tbWVudHM6ICdDYXQgYXBwZWFycyBoZWFsdGh5JyxcbiAgICAgIHRvdGFsU2NvcmU6IDQzLFxuICAgICAgcmliYm9uRWxpZ2liaWxpdHk6ICdSZWQnLFxuICAgICAgdGltZXN0YW1wOiAnMjAyMy0wMS0wMVQwMDowMDowMC4wMDBaJyxcbiAgICAgIGlzRmluYWxpemVkOiBmYWxzZVxuICAgIH07XG5cbiAgICBpdCgnc2hvdWxkIHRocm93IGVycm9yIHdoZW4gY2xhc3Mgc2NvcmUgbm90IGZvdW5kJywgYXN5bmMgKCkgPT4ge1xuICAgICAgZGRiTW9jay5vbihHZXRDb21tYW5kKS5yZXNvbHZlcyh7fSk7XG5cbiAgICAgIGF3YWl0IGV4cGVjdChcbiAgICAgICAgY2xhc3NTY29yZURhdGFBY2Nlc3MudXBkYXRlQ2xhc3NTY29yZSgnbm9uZXhpc3RlbnQtaWQnLCB7fSlcbiAgICAgICkucmVqZWN0cy50b1Rocm93KCdDbGFzcyBzY29yZSBub3QgZm91bmQnKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgdXBkYXRlIGNsYXNzIHNjb3JlIGFuZCByZWNhbGN1bGF0ZSB0b3RhbHMnLCBhc3luYyAoKSA9PiB7XG4gICAgICAvLyBNb2NrIGdldENsYXNzU2NvcmUgY2FsbFxuICAgICAgZGRiTW9jay5vbihHZXRDb21tYW5kKS5yZXNvbHZlcyh7XG4gICAgICAgIEl0ZW06IHtcbiAgICAgICAgICAuLi5leGlzdGluZ1Njb3JlLFxuICAgICAgICAgIGJlYXV0eVNjb3JlOiAnMTInLFxuICAgICAgICAgIHBlcnNvbmFsaXR5U2NvcmU6ICcxOCcsXG4gICAgICAgICAgYmFsYW5jZVByb3BvcnRpb25TY29yZTogJzEzJyxcbiAgICAgICAgICB0b3RhbFNjb3JlOiAnNDMnXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyBNb2NrIHVwZGF0ZSBjYWxsc1xuICAgICAgZGRiTW9jay5vbihVcGRhdGVDb21tYW5kKS5yZXNvbHZlcyh7fSk7XG4gICAgICBkZGJNb2NrLm9uKFB1dENvbW1hbmQpLnJlc29sdmVzKHt9KTtcblxuICAgICAgY29uc3QgdXBkYXRlSW5wdXQ6IFVwZGF0ZUNsYXNzU2NvcmVJbnB1dCA9IHtcbiAgICAgICAgYmVhdXR5U2NvcmU6IDE1LFxuICAgICAgICBwZXJzb25hbGl0eVNjb3JlOiAyMFxuICAgICAgfTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2xhc3NTY29yZURhdGFBY2Nlc3MudXBkYXRlQ2xhc3NTY29yZSgnc2NvcmUtMTIzJywgdXBkYXRlSW5wdXQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0LmJlYXV0eVNjb3JlKS50b0JlKDE1KTtcbiAgICAgIGV4cGVjdChyZXN1bHQucGVyc29uYWxpdHlTY29yZSkudG9CZSgyMCk7XG4gICAgICBleHBlY3QocmVzdWx0LnRvdGFsU2NvcmUpLnRvQmUoNDgpOyAvLyAxNSArIDIwICsgMTNcbiAgICAgIGV4cGVjdChyZXN1bHQucmliYm9uRWxpZ2liaWxpdHkpLnRvQmUoJ0JsdWUnKTsgLy8gSGlnaCBzY29yZSB3aXRoIGhlYWx0aCBwYXNzZWRcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgdXBkYXRlIHJpYmJvbiBlbGlnaWJpbGl0eSB3aGVuIGhlYWx0aCBzdGF0dXMgY2hhbmdlcycsIGFzeW5jICgpID0+IHtcbiAgICAgIC8vIE1vY2sgZ2V0Q2xhc3NTY29yZSBjYWxsXG4gICAgICBkZGJNb2NrLm9uKEdldENvbW1hbmQpLnJlc29sdmVzKHtcbiAgICAgICAgSXRlbToge1xuICAgICAgICAgIC4uLmV4aXN0aW5nU2NvcmUsXG4gICAgICAgICAgYmVhdXR5U2NvcmU6ICcxNScsXG4gICAgICAgICAgcGVyc29uYWxpdHlTY29yZTogJzIwJyxcbiAgICAgICAgICBiYWxhbmNlUHJvcG9ydGlvblNjb3JlOiAnMTUnLFxuICAgICAgICAgIHRvdGFsU2NvcmU6ICc1MCdcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIC8vIE1vY2sgdXBkYXRlIGNhbGxzXG4gICAgICBkZGJNb2NrLm9uKFVwZGF0ZUNvbW1hbmQpLnJlc29sdmVzKHt9KTtcbiAgICAgIGRkYk1vY2sub24oUHV0Q29tbWFuZCkucmVzb2x2ZXMoe30pO1xuXG4gICAgICBjb25zdCB1cGRhdGVJbnB1dDogVXBkYXRlQ2xhc3NTY29yZUlucHV0ID0ge1xuICAgICAgICBmbGVhSXNzdWVzOiB0cnVlIC8vIFRoaXMgc2hvdWxkIGZvcmNlIFJlZCByaWJib25cbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNsYXNzU2NvcmVEYXRhQWNjZXNzLnVwZGF0ZUNsYXNzU2NvcmUoJ3Njb3JlLTEyMycsIHVwZGF0ZUlucHV0KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdC50b3RhbFNjb3JlKS50b0JlKDUwKTtcbiAgICAgIGV4cGVjdChyZXN1bHQucmliYm9uRWxpZ2liaWxpdHkpLnRvQmUoJ1JlZCcpOyAvLyBGbGVhIGlzc3VlcyBvdmVycmlkZSBoaWdoIHNjb3JlXG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdkZWxldGVDbGFzc1Njb3JlJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgdGhyb3cgZXJyb3Igd2hlbiBjbGFzcyBzY29yZSBub3QgZm91bmQnLCBhc3luYyAoKSA9PiB7XG4gICAgICBkZGJNb2NrLm9uKEdldENvbW1hbmQpLnJlc29sdmVzKHt9KTtcblxuICAgICAgYXdhaXQgZXhwZWN0KFxuICAgICAgICBjbGFzc1Njb3JlRGF0YUFjY2Vzcy5kZWxldGVDbGFzc1Njb3JlKCdub25leGlzdGVudC1pZCcpXG4gICAgICApLnJlamVjdHMudG9UaHJvdygnQ2xhc3Mgc2NvcmUgbm90IGZvdW5kJyk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGRlbGV0ZSBjbGFzcyBzY29yZSBhbmQgYWxsIGluZGV4IHJlY29yZHMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBleGlzdGluZ1Njb3JlID0ge1xuICAgICAgICBpZDogJ3Njb3JlLTEyMycsXG4gICAgICAgIGNhdElkOiAnY2F0LTEyMycsXG4gICAgICAgIGp1ZGdlSWQ6ICdqdWRnZS00NTYnLFxuICAgICAgICBqdWRnZU5hbWU6ICdKdWRnZSBTbWl0aCcsXG4gICAgICAgIGJlYXV0eVNjb3JlOiAnMTInLFxuICAgICAgICBwZXJzb25hbGl0eVNjb3JlOiAnMTgnLFxuICAgICAgICBiYWxhbmNlUHJvcG9ydGlvblNjb3JlOiAnMTMnLFxuICAgICAgICB0b3RhbFNjb3JlOiAnNDMnXG4gICAgICB9O1xuICAgICAgXG4gICAgICBkZGJNb2NrLm9uKEdldENvbW1hbmQpLnJlc29sdmVzKHsgSXRlbTogZXhpc3RpbmdTY29yZSB9KTtcbiAgICAgIGRkYk1vY2sub24oRGVsZXRlQ29tbWFuZCkucmVzb2x2ZXMoe30pO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjbGFzc1Njb3JlRGF0YUFjY2Vzcy5kZWxldGVDbGFzc1Njb3JlKCdzY29yZS0xMjMnKTtcblxuICAgICAgZXhwZWN0KHJlc3VsdC5pZCkudG9CZSgnc2NvcmUtMTIzJyk7XG4gICAgICBcbiAgICAgIC8vIFNob3VsZCBtYWtlIDMgRGVsZXRlQ29tbWFuZCBjYWxscyAobWFpbiwgY2F0IGluZGV4LCBqdWRnZSBpbmRleClcbiAgICAgIGV4cGVjdChkZGJNb2NrLmNvbW1hbmRDYWxscyhEZWxldGVDb21tYW5kKSkudG9IYXZlTGVuZ3RoKDMpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnZ2V0Q2xhc3NTY29yZXNCeUNhdCcsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIHJldHVybiBlbXB0eSBhcnJheSB3aGVuIG5vIGNsYXNzIHNjb3JlcyBmb3VuZCcsIGFzeW5jICgpID0+IHtcbiAgICAgIGRkYk1vY2sub24oUXVlcnlDb21tYW5kKS5yZXNvbHZlcyh7IEl0ZW1zOiBbXSB9KTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2xhc3NTY29yZURhdGFBY2Nlc3MuZ2V0Q2xhc3NTY29yZXNCeUNhdCgnY2F0LTEyMycpO1xuXG4gICAgICBleHBlY3QocmVzdWx0KS50b0VxdWFsKFtdKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmV0dXJuIGNsYXNzIHNjb3JlcyBmb3IgY2F0JywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgbW9ja0luZGV4SXRlbXMgPSBbXG4gICAgICAgIHsgY2xhc3NTY29yZUlkOiAnc2NvcmUtMScgfSxcbiAgICAgICAgeyBjbGFzc1Njb3JlSWQ6ICdzY29yZS0yJyB9XG4gICAgICBdO1xuICAgICAgXG4gICAgICBkZGJNb2NrLm9uKFF1ZXJ5Q29tbWFuZCkucmVzb2x2ZXMoeyBJdGVtczogbW9ja0luZGV4SXRlbXMgfSk7XG4gICAgICBcbiAgICAgIC8vIE1vY2sgaW5kaXZpZHVhbCBnZXRDbGFzc1Njb3JlIGNhbGxzXG4gICAgICBkZGJNb2NrLm9uKEdldENvbW1hbmQpXG4gICAgICAgIC5yZXNvbHZlc09uY2UoeyBJdGVtOiB7IGlkOiAnc2NvcmUtMScsIGNhdElkOiAnY2F0LTEyMycsIHRvdGFsU2NvcmU6ICc0MCcgfSB9KVxuICAgICAgICAucmVzb2x2ZXNPbmNlKHsgSXRlbTogeyBpZDogJ3Njb3JlLTInLCBjYXRJZDogJ2NhdC0xMjMnLCB0b3RhbFNjb3JlOiAnNDUnIH0gfSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNsYXNzU2NvcmVEYXRhQWNjZXNzLmdldENsYXNzU2NvcmVzQnlDYXQoJ2NhdC0xMjMnKTtcblxuICAgICAgZXhwZWN0KHJlc3VsdCkudG9IYXZlTGVuZ3RoKDIpO1xuICAgICAgZXhwZWN0KHJlc3VsdFswXS5pZCkudG9CZSgnc2NvcmUtMScpO1xuICAgICAgZXhwZWN0KHJlc3VsdFsxXS5pZCkudG9CZSgnc2NvcmUtMicpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnZ2V0Q2xhc3NTY29yZXNCeUp1ZGdlJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgcmV0dXJuIGVtcHR5IGFycmF5IHdoZW4gbm8gY2xhc3Mgc2NvcmVzIGZvdW5kJywgYXN5bmMgKCkgPT4ge1xuICAgICAgZGRiTW9jay5vbihRdWVyeUNvbW1hbmQpLnJlc29sdmVzKHsgSXRlbXM6IFtdIH0pO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjbGFzc1Njb3JlRGF0YUFjY2Vzcy5nZXRDbGFzc1Njb3Jlc0J5SnVkZ2UoJ2p1ZGdlLTQ1NicpO1xuXG4gICAgICBleHBlY3QocmVzdWx0KS50b0VxdWFsKFtdKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmV0dXJuIGNsYXNzIHNjb3JlcyBmb3IganVkZ2UnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBtb2NrSW5kZXhJdGVtcyA9IFtcbiAgICAgICAgeyBjbGFzc1Njb3JlSWQ6ICdzY29yZS0xJyB9LFxuICAgICAgICB7IGNsYXNzU2NvcmVJZDogJ3Njb3JlLTInIH1cbiAgICAgIF07XG4gICAgICBcbiAgICAgIGRkYk1vY2sub24oUXVlcnlDb21tYW5kKS5yZXNvbHZlcyh7IEl0ZW1zOiBtb2NrSW5kZXhJdGVtcyB9KTtcbiAgICAgIFxuICAgICAgLy8gTW9jayBpbmRpdmlkdWFsIGdldENsYXNzU2NvcmUgY2FsbHNcbiAgICAgIGRkYk1vY2sub24oR2V0Q29tbWFuZClcbiAgICAgICAgLnJlc29sdmVzT25jZSh7IEl0ZW06IHsgaWQ6ICdzY29yZS0xJywganVkZ2VJZDogJ2p1ZGdlLTQ1NicsIHRvdGFsU2NvcmU6ICc0MCcgfSB9KVxuICAgICAgICAucmVzb2x2ZXNPbmNlKHsgSXRlbTogeyBpZDogJ3Njb3JlLTInLCBqdWRnZUlkOiAnanVkZ2UtNDU2JywgdG90YWxTY29yZTogJzQ1JyB9IH0pO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjbGFzc1Njb3JlRGF0YUFjY2Vzcy5nZXRDbGFzc1Njb3Jlc0J5SnVkZ2UoJ2p1ZGdlLTQ1NicpO1xuXG4gICAgICBleHBlY3QocmVzdWx0KS50b0hhdmVMZW5ndGgoMik7XG4gICAgICBleHBlY3QocmVzdWx0WzBdLmlkKS50b0JlKCdzY29yZS0xJyk7XG4gICAgICBleHBlY3QocmVzdWx0WzFdLmlkKS50b0JlKCdzY29yZS0yJyk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdnZXRDbGFzc1Njb3Jlc0J5Q2FnZScsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIHJldHVybiBlbXB0eSBhcnJheSB3aGVuIGNhdCBub3QgZm91bmQnLCBhc3luYyAoKSA9PiB7XG4gICAgICBkZGJNb2NrLm9uKFNjYW5Db21tYW5kKS5yZXNvbHZlcyh7IEl0ZW1zOiBbXSB9KTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2xhc3NTY29yZURhdGFBY2Nlc3MuZ2V0Q2xhc3NTY29yZXNCeUNhZ2UoMTIzKTtcblxuICAgICAgZXhwZWN0KHJlc3VsdCkudG9FcXVhbChbXSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHJldHVybiBjbGFzcyBzY29yZXMgZm9yIGNhZ2UgbnVtYmVyJywgYXN5bmMgKCkgPT4ge1xuICAgICAgLy8gTW9jayBmaW5kaW5nIGNhdCBieSBjYWdlIG51bWJlclxuICAgICAgZGRiTW9jay5vbihTY2FuQ29tbWFuZCkucmVzb2x2ZXMoe1xuICAgICAgICBJdGVtczogW3sgUEs6ICdDQVQjY2F0LTEyMycsIGNhZ2VOdW1iZXI6IDEyMyB9XVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIC8vIE1vY2sgZ2V0dGluZyBjbGFzcyBzY29yZXMgYnkgY2F0XG4gICAgICBkZGJNb2NrLm9uKFF1ZXJ5Q29tbWFuZCkucmVzb2x2ZXMoe1xuICAgICAgICBJdGVtczogW3sgY2xhc3NTY29yZUlkOiAnc2NvcmUtMScgfV1cbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyBNb2NrIGluZGl2aWR1YWwgZ2V0Q2xhc3NTY29yZSBjYWxsXG4gICAgICBkZGJNb2NrLm9uKEdldENvbW1hbmQpLnJlc29sdmVzKHtcbiAgICAgICAgSXRlbTogeyBpZDogJ3Njb3JlLTEnLCBjYXRJZDogJ2NhdC0xMjMnLCB0b3RhbFNjb3JlOiAnNDAnIH1cbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjbGFzc1Njb3JlRGF0YUFjY2Vzcy5nZXRDbGFzc1Njb3Jlc0J5Q2FnZSgxMjMpO1xuXG4gICAgICBleHBlY3QocmVzdWx0KS50b0hhdmVMZW5ndGgoMSk7XG4gICAgICBleHBlY3QocmVzdWx0WzBdLmlkKS50b0JlKCdzY29yZS0xJyk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdsaXN0QWxsQ2xhc3NTY29yZXMnLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gZW1wdHkgYXJyYXkgd2hlbiBubyBjbGFzcyBzY29yZXMgZXhpc3QnLCBhc3luYyAoKSA9PiB7XG4gICAgICBkZGJNb2NrLm9uKFNjYW5Db21tYW5kKS5yZXNvbHZlcyh7IEl0ZW1zOiBbXSB9KTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2xhc3NTY29yZURhdGFBY2Nlc3MubGlzdEFsbENsYXNzU2NvcmVzKCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvRXF1YWwoW10pO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gYWxsIGNsYXNzIHNjb3JlcycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IG1vY2tJdGVtcyA9IFtcbiAgICAgICAge1xuICAgICAgICAgIGlkOiAnc2NvcmUtMScsXG4gICAgICAgICAgY2F0SWQ6ICdjYXQtMTIzJyxcbiAgICAgICAgICBqdWRnZUlkOiAnanVkZ2UtNDU2JyxcbiAgICAgICAgICBqdWRnZU5hbWU6ICdKdWRnZSBTbWl0aCcsXG4gICAgICAgICAgYmVhdXR5U2NvcmU6ICcxMicsXG4gICAgICAgICAgcGVyc29uYWxpdHlTY29yZTogJzE4JyxcbiAgICAgICAgICBiYWxhbmNlUHJvcG9ydGlvblNjb3JlOiAnMTMnLFxuICAgICAgICAgIHRvdGFsU2NvcmU6ICc0MycsXG4gICAgICAgICAgcmliYm9uRWxpZ2liaWxpdHk6ICdSZWQnLFxuICAgICAgICAgIHRpbWVzdGFtcDogJzIwMjMtMDEtMDFUMDA6MDA6MDAuMDAwWicsXG4gICAgICAgICAgaXNGaW5hbGl6ZWQ6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogJ3Njb3JlLTInLFxuICAgICAgICAgIGNhdElkOiAnY2F0LTQ1NicsXG4gICAgICAgICAganVkZ2VJZDogJ2p1ZGdlLTc4OScsXG4gICAgICAgICAganVkZ2VOYW1lOiAnSnVkZ2UgSm9uZXMnLFxuICAgICAgICAgIGJlYXV0eVNjb3JlOiAnMTUnLFxuICAgICAgICAgIHBlcnNvbmFsaXR5U2NvcmU6ICcyMCcsXG4gICAgICAgICAgYmFsYW5jZVByb3BvcnRpb25TY29yZTogJzE1JyxcbiAgICAgICAgICB0b3RhbFNjb3JlOiAnNTAnLFxuICAgICAgICAgIHJpYmJvbkVsaWdpYmlsaXR5OiAnQmx1ZScsXG4gICAgICAgICAgdGltZXN0YW1wOiAnMjAyMy0wMS0wMlQwMDowMDowMC4wMDBaJyxcbiAgICAgICAgICBpc0ZpbmFsaXplZDogdHJ1ZVxuICAgICAgICB9XG4gICAgICBdO1xuICAgICAgXG4gICAgICBkZGJNb2NrLm9uKFNjYW5Db21tYW5kKS5yZXNvbHZlcyh7IEl0ZW1zOiBtb2NrSXRlbXMgfSk7XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNsYXNzU2NvcmVEYXRhQWNjZXNzLmxpc3RBbGxDbGFzc1Njb3JlcygpO1xuXG4gICAgICBleHBlY3QocmVzdWx0KS50b0hhdmVMZW5ndGgoMik7XG4gICAgICBleHBlY3QocmVzdWx0WzBdLmlkKS50b0JlKCdzY29yZS0xJyk7XG4gICAgICBleHBlY3QocmVzdWx0WzBdLnRvdGFsU2NvcmUpLnRvQmUoNDMpO1xuICAgICAgZXhwZWN0KHJlc3VsdFsxXS5pZCkudG9CZSgnc2NvcmUtMicpO1xuICAgICAgZXhwZWN0KHJlc3VsdFsxXS50b3RhbFNjb3JlKS50b0JlKDUwKTtcbiAgICB9KTtcbiAgfSk7XG59KTsiXX0=