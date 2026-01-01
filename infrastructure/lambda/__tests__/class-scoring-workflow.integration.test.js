"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const aws_sdk_client_mock_1 = require("aws-sdk-client-mock");
const classScoreDataAccess_1 = require("../classScoreDataAccess");
// Mock DynamoDB
const ddbMock = (0, aws_sdk_client_mock_1.mockClient)(lib_dynamodb_1.DynamoDBDocumentClient);
// Mock environment variables
process.env.TABLE_NAME = 'test-table';
// Test data
const mockCats = {
    'cat-1': {
        id: 'cat-1',
        name: 'Fluffy',
        owner: 'Alice Johnson',
        cageNumber: 1,
        class: 'Household Pet',
        ageGroup: 'Adult'
    },
    'cat-2': {
        id: 'cat-2',
        name: 'Whiskers',
        owner: 'Bob Smith',
        cageNumber: 2,
        class: 'Household Pet',
        ageGroup: 'Kitten'
    },
    'cat-3': {
        id: 'cat-3',
        name: 'Shadow',
        owner: 'Charlie Brown',
        cageNumber: 3,
        class: 'Pedigreed',
        ageGroup: 'Adult'
    }
};
const mockJudges = {
    'judge-1': {
        id: 'judge-1',
        name: 'Judge Smith',
        username: 'judge@example.com',
        role: 'judge'
    },
    'judge-2': {
        id: 'judge-2',
        name: 'Judge Johnson',
        username: 'judge2@example.com',
        role: 'judge'
    }
};
describe('Type Class Scoring Workflow Backend Integration Tests', () => {
    beforeEach(() => {
        ddbMock.reset();
        jest.clearAllMocks();
    });
    describe('Complete Judge Type Class Scoring Process', () => {
        it('handles end-to-end type class scoring workflow with DynamoDB operations', async () => {
            // Mock successful DynamoDB operations
            ddbMock.on(lib_dynamodb_1.PutCommand).resolves({});
            ddbMock.on(lib_dynamodb_1.QueryCommand).resolves({ Items: [] });
            const classScoreInput = {
                catId: 'cat-1',
                beautyScore: 14,
                beautyComments: 'Excellent coat quality and markings',
                personalityScore: 19,
                personalityComments: 'Very friendly and well-socialized cat',
                balanceProportionScore: 13,
                balanceProportionComments: 'Good overall body structure and proportions',
                coatCleanGroomed: true,
                teethGumsHealthy: true,
                eyesNoseClear: true,
                earsCleanMiteFree: true,
                toenailsClipped: true,
                fleaIssues: false,
                healthGroomingComments: 'Excellent health and grooming standards',
                isFinalized: false
            };
            const judgeContext = {
                identity: {
                    sub: 'judge-1',
                    username: 'judge@example.com'
                }
            };
            // Create class score
            const createdScore = await (0, classScoreDataAccess_1.createClassScore)(classScoreInput, judgeContext);
            // Verify score creation
            expect(createdScore).toMatchObject({
                catId: 'cat-1',
                judgeId: 'judge-1',
                beautyScore: 14,
                personalityScore: 19,
                balanceProportionScore: 13,
                totalScore: 46, // 14 + 19 + 13
                ribbonEligibility: 'Blue', // 46 points with all health passing
                coatCleanGroomed: true,
                teethGumsHealthy: true,
                eyesNoseClear: true,
                earsCleanMiteFree: true,
                toenailsClipped: true,
                fleaIssues: false,
                isFinalized: false
            });
            expect(createdScore.id).toBeDefined();
            expect(createdScore.timestamp).toBeDefined();
            // Verify DynamoDB operations
            expect(ddbMock.commandCalls(lib_dynamodb_1.PutCommand)).toHaveLength(3); // Main record + 2 indexes
            const putCalls = ddbMock.commandCalls(lib_dynamodb_1.PutCommand);
            // Main class score record
            expect(putCalls[0].args[0].input.Item).toMatchObject({
                PK: expect.stringMatching(/^CLASS_SCORE#/),
                SK: 'METADATA',
                catId: 'cat-1',
                judgeId: 'judge-1',
                totalScore: 46,
                ribbonEligibility: 'Blue'
            });
            // Cat index record
            expect(putCalls[1].args[0].input.Item).toMatchObject({
                PK: 'CAT#cat-1',
                SK: expect.stringMatching(/^CLASS_SCORE#/),
                judgeId: 'judge-1',
                totalScore: 46,
                ribbonEligibility: 'Blue'
            });
            // Judge index record
            expect(putCalls[2].args[0].input.Item).toMatchObject({
                PK: 'JUDGE#judge-1',
                SK: expect.stringMatching(/^CLASS_SCORE#/),
                catId: 'cat-1',
                totalScore: 46,
                ribbonEligibility: 'Blue'
            });
        });
        it('prevents duplicate type class scoring by same judge', async () => {
            // Mock existing class score by same judge
            const existingScore = {
                id: 'class-score-1',
                catId: 'cat-1',
                judgeId: 'judge-1',
                judgeName: 'Judge Smith',
                totalScore: 40,
                ribbonEligibility: 'Red',
                isFinalized: true,
                timestamp: '2024-01-15T10:00:00Z'
            };
            ddbMock.on(lib_dynamodb_1.QueryCommand).resolves({
                Items: [existingScore]
            });
            const classScoreInput = {
                catId: 'cat-1',
                beautyScore: 12,
                personalityScore: 18,
                balanceProportionScore: 13,
                coatCleanGroomed: true,
                teethGumsHealthy: true,
                eyesNoseClear: true,
                earsCleanMiteFree: true,
                toenailsClipped: true,
                fleaIssues: false,
                isFinalized: false
            };
            const judgeContext = {
                identity: {
                    sub: 'judge-1',
                    username: 'judge@example.com'
                }
            };
            // Attempt to create duplicate score should throw error
            await expect((0, classScoreDataAccess_1.createClassScore)(classScoreInput, judgeContext))
                .rejects.toThrow('Judge has already submitted a finalized class score for this cat');
            // Verify no new records were created
            expect(ddbMock.commandCalls(lib_dynamodb_1.PutCommand)).toHaveLength(0);
        });
        it('handles class score updates with audit trail creation', async () => {
            const existingScore = {
                id: 'class-score-1',
                catId: 'cat-1',
                judgeId: 'judge-1',
                judgeName: 'Judge Smith',
                beautyScore: 12,
                personalityScore: 18,
                balanceProportionScore: 13,
                totalScore: 43,
                ribbonEligibility: 'Red',
                isFinalized: false,
                timestamp: '2024-01-15T10:00:00Z'
            };
            // Mock existing score retrieval
            ddbMock.on(lib_dynamodb_1.QueryCommand).resolves({
                Items: [existingScore]
            });
            // Mock successful update
            ddbMock.on(lib_dynamodb_1.PutCommand).resolves({});
            const updateInput = {
                beautyScore: 14,
                beautyComments: 'Updated: Excellent coat quality',
                personalityScore: 19,
                personalityComments: 'Updated: Very friendly temperament'
            };
            const judgeContext = {
                identity: {
                    sub: 'judge-1',
                    username: 'judge@example.com'
                }
            };
            const updatedScore = await (0, classScoreDataAccess_1.updateClassScore)('class-score-1', updateInput, judgeContext);
            // Verify updated values
            expect(updatedScore).toMatchObject({
                id: 'class-score-1',
                catId: 'cat-1',
                judgeId: 'judge-1',
                beautyScore: 14,
                personalityScore: 19,
                balanceProportionScore: 13, // Unchanged
                totalScore: 46, // Recalculated: 14 + 19 + 13
                ribbonEligibility: 'Blue', // Updated based on new total
                isFinalized: false
            });
            // Verify audit trail creation
            const putCalls = ddbMock.commandCalls(lib_dynamodb_1.PutCommand);
            expect(putCalls.length).toBeGreaterThan(3); // Main + indexes + audit record
            // Check for audit record
            const auditCall = putCalls.find(call => call.args[0].input.Item.PK?.includes('AUDIT'));
            expect(auditCall).toBeDefined();
            expect(auditCall.args[0].input.Item).toMatchObject({
                PK: expect.stringMatching(/^CLASS_SCORE_AUDIT#/),
                SK: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
                classScoreId: 'class-score-1',
                judgeId: 'judge-1',
                action: 'UPDATE',
                changes: expect.objectContaining({
                    beautyScore: { from: 12, to: 14 },
                    personalityScore: { from: 18, to: 19 },
                    totalScore: { from: 43, to: 46 },
                    ribbonEligibility: { from: 'Red', to: 'Blue' }
                })
            });
        });
    });
    describe('Multi-Judge Scenarios', () => {
        it('allows multiple judges to score same cat independently', async () => {
            // Mock no existing scores for judge-2
            ddbMock.on(lib_dynamodb_1.QueryCommand).resolves({ Items: [] });
            ddbMock.on(lib_dynamodb_1.PutCommand).resolves({});
            const judge1Input = {
                catId: 'cat-1',
                beautyScore: 12,
                personalityScore: 18,
                balanceProportionScore: 13,
                coatCleanGroomed: true,
                teethGumsHealthy: true,
                eyesNoseClear: true,
                earsCleanMiteFree: true,
                toenailsClipped: true,
                fleaIssues: false,
                isFinalized: true
            };
            const judge2Input = {
                catId: 'cat-1',
                beautyScore: 14,
                personalityScore: 19,
                balanceProportionScore: 14,
                coatCleanGroomed: true,
                teethGumsHealthy: true,
                eyesNoseClear: true,
                earsCleanMiteFree: true,
                toenailsClipped: true,
                fleaIssues: false,
                isFinalized: true
            };
            const judge1Context = {
                identity: { sub: 'judge-1', username: 'judge@example.com' }
            };
            const judge2Context = {
                identity: { sub: 'judge-2', username: 'judge2@example.com' }
            };
            // Create scores from both judges
            const judge1Score = await (0, classScoreDataAccess_1.createClassScore)(judge1Input, judge1Context);
            const judge2Score = await (0, classScoreDataAccess_1.createClassScore)(judge2Input, judge2Context);
            // Verify both scores were created with different judges
            expect(judge1Score.judgeId).toBe('judge-1');
            expect(judge1Score.totalScore).toBe(43);
            expect(judge1Score.ribbonEligibility).toBe('Red');
            expect(judge2Score.judgeId).toBe('judge-2');
            expect(judge2Score.totalScore).toBe(47);
            expect(judge2Score.ribbonEligibility).toBe('Blue');
            // Verify separate DynamoDB records
            expect(ddbMock.commandCalls(lib_dynamodb_1.PutCommand)).toHaveLength(6); // 3 records per score
        });
        it('calculates average scores for multi-judge scenarios', async () => {
            const judge1Score = {
                id: 'class-score-1',
                catId: 'cat-1',
                judgeId: 'judge-1',
                judgeName: 'Judge Smith',
                totalScore: 43,
                ribbonEligibility: 'Red',
                isFinalized: true
            };
            const judge2Score = {
                id: 'class-score-2',
                catId: 'cat-1',
                judgeId: 'judge-2',
                judgeName: 'Judge Johnson',
                totalScore: 47,
                ribbonEligibility: 'Blue',
                isFinalized: true
            };
            // Mock retrieval of multiple scores for same cat
            ddbMock.on(lib_dynamodb_1.QueryCommand).resolves({
                Items: [judge1Score, judge2Score]
            });
            const catScores = await (0, classScoreDataAccess_1.getClassScoresByCat)('cat-1');
            expect(catScores.items).toHaveLength(2);
            expect(catScores.items[0].totalScore).toBe(43);
            expect(catScores.items[1].totalScore).toBe(47);
            // Calculate average (would be done in frontend or separate function)
            const averageScore = catScores.items.reduce((sum, score) => sum + score.totalScore, 0) / catScores.items.length;
            expect(averageScore).toBe(45); // (43 + 47) / 2
        });
    });
    describe('Class Score Calculation and Validation', () => {
        it('validates score ranges for each category', async () => {
            const invalidInputs = [
                {
                    catId: 'cat-1',
                    beautyScore: 16, // Over maximum of 15
                    personalityScore: 18,
                    balanceProportionScore: 13,
                    coatCleanGroomed: true,
                    teethGumsHealthy: true,
                    eyesNoseClear: true,
                    earsCleanMiteFree: true,
                    toenailsClipped: true,
                    fleaIssues: false
                },
                {
                    catId: 'cat-1',
                    beautyScore: 12,
                    personalityScore: 21, // Over maximum of 20
                    balanceProportionScore: 13,
                    coatCleanGroomed: true,
                    teethGumsHealthy: true,
                    eyesNoseClear: true,
                    earsCleanMiteFree: true,
                    toenailsClipped: true,
                    fleaIssues: false
                },
                {
                    catId: 'cat-1',
                    beautyScore: 12,
                    personalityScore: 18,
                    balanceProportionScore: -1, // Below minimum of 0
                    coatCleanGroomed: true,
                    teethGumsHealthy: true,
                    eyesNoseClear: true,
                    earsCleanMiteFree: true,
                    toenailsClipped: true,
                    fleaIssues: false
                }
            ];
            const judgeContext = {
                identity: { sub: 'judge-1', username: 'judge@example.com' }
            };
            for (const invalidInput of invalidInputs) {
                await expect((0, classScoreDataAccess_1.createClassScore)(invalidInput, judgeContext))
                    .rejects.toThrow(/score must be between/);
            }
        });
        it('calculates total scores and ribbon eligibility accurately', async () => {
            ddbMock.on(lib_dynamodb_1.QueryCommand).resolves({ Items: [] });
            ddbMock.on(lib_dynamodb_1.PutCommand).resolves({});
            const testCases = [
                {
                    input: {
                        beautyScore: 15, personalityScore: 20, balanceProportionScore: 15,
                        coatCleanGroomed: true, teethGumsHealthy: true, eyesNoseClear: true,
                        earsCleanMiteFree: true, toenailsClipped: true, fleaIssues: false
                    },
                    expected: { totalScore: 50, ribbonEligibility: 'Blue' }
                },
                {
                    input: {
                        beautyScore: 12, personalityScore: 18, balanceProportionScore: 13,
                        coatCleanGroomed: true, teethGumsHealthy: true, eyesNoseClear: true,
                        earsCleanMiteFree: true, toenailsClipped: true, fleaIssues: false
                    },
                    expected: { totalScore: 43, ribbonEligibility: 'Red' }
                },
                {
                    input: {
                        beautyScore: 10, personalityScore: 12, balanceProportionScore: 10,
                        coatCleanGroomed: true, teethGumsHealthy: true, eyesNoseClear: true,
                        earsCleanMiteFree: true, toenailsClipped: true, fleaIssues: false
                    },
                    expected: { totalScore: 32, ribbonEligibility: 'White' }
                },
                {
                    input: {
                        beautyScore: 8, personalityScore: 10, balanceProportionScore: 6,
                        coatCleanGroomed: true, teethGumsHealthy: true, eyesNoseClear: true,
                        earsCleanMiteFree: true, toenailsClipped: true, fleaIssues: false
                    },
                    expected: { totalScore: 24, ribbonEligibility: 'Participation' }
                },
                {
                    input: {
                        beautyScore: 15, personalityScore: 20, balanceProportionScore: 15,
                        coatCleanGroomed: true, teethGumsHealthy: true, eyesNoseClear: true,
                        earsCleanMiteFree: false, toenailsClipped: true, fleaIssues: false
                    },
                    expected: { totalScore: 50, ribbonEligibility: 'Red' } // Health failure
                },
                {
                    input: {
                        beautyScore: 15, personalityScore: 20, balanceProportionScore: 15,
                        coatCleanGroomed: true, teethGumsHealthy: true, eyesNoseClear: true,
                        earsCleanMiteFree: true, toenailsClipped: true, fleaIssues: true
                    },
                    expected: { totalScore: 50, ribbonEligibility: 'Red' } // Flea issues
                }
            ];
            const judgeContext = {
                identity: { sub: 'judge-1', username: 'judge@example.com' }
            };
            for (let i = 0; i < testCases.length; i++) {
                const testCase = testCases[i];
                const input = { catId: `cat-${i + 1}`, ...testCase.input };
                const result = await (0, classScoreDataAccess_1.createClassScore)(input, judgeContext);
                expect(result.totalScore).toBe(testCase.expected.totalScore);
                expect(result.ribbonEligibility).toBe(testCase.expected.ribbonEligibility);
            }
        });
        it('validates comment length limits', async () => {
            const longComment = 'x'.repeat(501); // Over 500 character limit
            const veryLongHealthComment = 'x'.repeat(1001); // Over 1000 character limit
            const invalidInputs = [
                {
                    catId: 'cat-1',
                    beautyScore: 12,
                    beautyComments: longComment,
                    personalityScore: 18,
                    balanceProportionScore: 13,
                    coatCleanGroomed: true,
                    teethGumsHealthy: true,
                    eyesNoseClear: true,
                    earsCleanMiteFree: true,
                    toenailsClipped: true,
                    fleaIssues: false
                },
                {
                    catId: 'cat-1',
                    beautyScore: 12,
                    personalityScore: 18,
                    personalityComments: longComment,
                    balanceProportionScore: 13,
                    coatCleanGroomed: true,
                    teethGumsHealthy: true,
                    eyesNoseClear: true,
                    earsCleanMiteFree: true,
                    toenailsClipped: true,
                    fleaIssues: false
                },
                {
                    catId: 'cat-1',
                    beautyScore: 12,
                    personalityScore: 18,
                    balanceProportionScore: 13,
                    healthGroomingComments: veryLongHealthComment,
                    coatCleanGroomed: true,
                    teethGumsHealthy: true,
                    eyesNoseClear: true,
                    earsCleanMiteFree: true,
                    toenailsClipped: true,
                    fleaIssues: false
                }
            ];
            const judgeContext = {
                identity: { sub: 'judge-1', username: 'judge@example.com' }
            };
            for (const invalidInput of invalidInputs) {
                await expect((0, classScoreDataAccess_1.createClassScore)(invalidInput, judgeContext))
                    .rejects.toThrow(/comment.*too long/);
            }
        });
    });
    describe('Report Generation and Export', () => {
        it('generates comprehensive type class scoring reports with sorting', async () => {
            const mockClassScores = [
                {
                    id: 'class-score-1',
                    catId: 'cat-1',
                    judgeId: 'judge-1',
                    judgeName: 'Judge Smith',
                    totalScore: 47,
                    ribbonEligibility: 'Blue',
                    timestamp: '2024-01-15T10:00:00Z',
                    isFinalized: true
                },
                {
                    id: 'class-score-2',
                    catId: 'cat-2',
                    judgeId: 'judge-2',
                    judgeName: 'Judge Johnson',
                    totalScore: 38,
                    ribbonEligibility: 'Red',
                    timestamp: '2024-01-15T11:00:00Z',
                    isFinalized: true
                },
                {
                    id: 'class-score-3',
                    catId: 'cat-3',
                    judgeId: 'judge-1',
                    judgeName: 'Judge Smith',
                    totalScore: 31,
                    ribbonEligibility: 'White',
                    timestamp: '2024-01-15T12:00:00Z',
                    isFinalized: false
                }
            ];
            ddbMock.on(lib_dynamodb_1.ScanCommand).resolves({
                Items: mockClassScores
            });
            const allScores = await (0, classScoreDataAccess_1.listAllClassScores)();
            expect(allScores.items).toHaveLength(3);
            // Verify scores are sorted by total score (descending)
            const sortedScores = allScores.items.sort((a, b) => b.totalScore - a.totalScore);
            expect(sortedScores[0].totalScore).toBe(47);
            expect(sortedScores[1].totalScore).toBe(38);
            expect(sortedScores[2].totalScore).toBe(31);
            // Verify ribbon distribution
            const ribbonCounts = allScores.items.reduce((counts, score) => {
                counts[score.ribbonEligibility] = (counts[score.ribbonEligibility] || 0) + 1;
                return counts;
            }, {});
            expect(ribbonCounts).toEqual({
                'Blue': 1,
                'Red': 1,
                'White': 1
            });
        });
        it('filters class scores by judge', async () => {
            const judge1Scores = [
                {
                    id: 'class-score-1',
                    catId: 'cat-1',
                    judgeId: 'judge-1',
                    judgeName: 'Judge Smith',
                    totalScore: 47,
                    ribbonEligibility: 'Blue'
                },
                {
                    id: 'class-score-3',
                    catId: 'cat-3',
                    judgeId: 'judge-1',
                    judgeName: 'Judge Smith',
                    totalScore: 31,
                    ribbonEligibility: 'White'
                }
            ];
            ddbMock.on(lib_dynamodb_1.QueryCommand).resolves({
                Items: judge1Scores
            });
            // This would be implemented in a getClassScoresByJudge function
            const judgeScores = await (0, classScoreDataAccess_1.getClassScoresByCat)('judge-1'); // Mock implementation
            expect(judgeScores.items).toHaveLength(2);
            expect(judgeScores.items.every(score => score.judgeId === 'judge-1')).toBe(true);
        });
        it('generates CSV export data with all type class scoring fields', async () => {
            const detailedScore = {
                id: 'class-score-1',
                catId: 'cat-1',
                judgeId: 'judge-1',
                judgeName: 'Judge Smith',
                beautyScore: 14,
                beautyComments: 'Excellent coat quality',
                personalityScore: 19,
                personalityComments: 'Very friendly temperament',
                balanceProportionScore: 13,
                balanceProportionComments: 'Good body structure',
                coatCleanGroomed: true,
                teethGumsHealthy: true,
                eyesNoseClear: true,
                earsCleanMiteFree: false,
                toenailsClipped: true,
                fleaIssues: false,
                healthGroomingComments: 'Minor ear wax buildup',
                totalScore: 46,
                ribbonEligibility: 'Red',
                timestamp: '2024-01-15T10:00:00Z',
                isFinalized: true
            };
            ddbMock.on(lib_dynamodb_1.ScanCommand).resolves({
                Items: [detailedScore]
            });
            const allScores = await (0, classScoreDataAccess_1.listAllClassScores)();
            // Verify all fields are present for CSV export
            const csvData = allScores.items.map(score => ({
                'Cat ID': score.catId,
                'Judge': score.judgeName,
                'Beauty Score': score.beautyScore,
                'Beauty Comments': score.beautyComments,
                'Personality Score': score.personalityScore,
                'Personality Comments': score.personalityComments,
                'Balance/Proportion Score': score.balanceProportionScore,
                'Balance/Proportion Comments': score.balanceProportionComments,
                'Coat Clean/Groomed': score.coatCleanGroomed ? 'Pass' : 'Fail',
                'Teeth/Gums Healthy': score.teethGumsHealthy ? 'Pass' : 'Fail',
                'Eyes/Nose Clear': score.eyesNoseClear ? 'Pass' : 'Fail',
                'Ears Clean/Mite Free': score.earsCleanMiteFree ? 'Pass' : 'Fail',
                'Toenails Clipped': score.toenailsClipped ? 'Pass' : 'Fail',
                'Flea Issues': score.fleaIssues ? 'Yes' : 'No',
                'Health/Grooming Comments': score.healthGroomingComments,
                'Total Score': score.totalScore,
                'Ribbon Eligibility': score.ribbonEligibility,
                'Finalized': score.isFinalized ? 'Yes' : 'No',
                'Timestamp': score.timestamp
            }));
            expect(csvData[0]).toMatchObject({
                'Cat ID': 'cat-1',
                'Judge': 'Judge Smith',
                'Beauty Score': 14,
                'Beauty Comments': 'Excellent coat quality',
                'Personality Score': 19,
                'Personality Comments': 'Very friendly temperament',
                'Balance/Proportion Score': 13,
                'Balance/Proportion Comments': 'Good body structure',
                'Coat Clean/Groomed': 'Pass',
                'Teeth/Gums Healthy': 'Pass',
                'Eyes/Nose Clear': 'Pass',
                'Ears Clean/Mite Free': 'Fail',
                'Toenails Clipped': 'Pass',
                'Flea Issues': 'No',
                'Health/Grooming Comments': 'Minor ear wax buildup',
                'Total Score': 46,
                'Ribbon Eligibility': 'Red',
                'Finalized': 'Yes'
            });
        });
    });
    describe('Role-Based Access Control', () => {
        it('enforces judge role for type class scoring operations', async () => {
            const participantContext = {
                identity: {
                    sub: 'participant-1',
                    username: 'participant@example.com'
                }
            };
            const classScoreInput = {
                catId: 'cat-1',
                beautyScore: 12,
                personalityScore: 18,
                balanceProportionScore: 13,
                coatCleanGroomed: true,
                teethGumsHealthy: true,
                eyesNoseClear: true,
                earsCleanMiteFree: true,
                toenailsClipped: true,
                fleaIssues: false
            };
            // Should reject non-judge users
            await expect((0, classScoreDataAccess_1.createClassScore)(classScoreInput, participantContext))
                .rejects.toThrow('Unauthorized: Judge role required');
        });
        it('allows admin access to all type class scoring operations', async () => {
            const adminContext = {
                identity: {
                    sub: 'admin-1',
                    username: 'admin@example.com'
                }
            };
            ddbMock.on(lib_dynamodb_1.QueryCommand).resolves({ Items: [] });
            ddbMock.on(lib_dynamodb_1.PutCommand).resolves({});
            const classScoreInput = {
                catId: 'cat-1',
                beautyScore: 12,
                personalityScore: 18,
                balanceProportionScore: 13,
                coatCleanGroomed: true,
                teethGumsHealthy: true,
                eyesNoseClear: true,
                earsCleanMiteFree: true,
                toenailsClipped: true,
                fleaIssues: false
            };
            // Admin should be able to create class scores
            const result = await (0, classScoreDataAccess_1.createClassScore)(classScoreInput, adminContext);
            expect(result).toBeDefined();
            expect(result.judgeId).toBe('admin-1');
        });
        it('restricts judge access to own class scores only', async () => {
            const judge1Context = {
                identity: { sub: 'judge-1', username: 'judge@example.com' }
            };
            const judge2Score = {
                id: 'class-score-2',
                catId: 'cat-1',
                judgeId: 'judge-2',
                judgeName: 'Judge Johnson',
                totalScore: 40,
                isFinalized: true
            };
            ddbMock.on(lib_dynamodb_1.QueryCommand).resolves({
                Items: [judge2Score]
            });
            // Judge-1 should not be able to update Judge-2's score
            await expect((0, classScoreDataAccess_1.updateClassScore)('class-score-2', { beautyScore: 15 }, judge1Context))
                .rejects.toThrow('Unauthorized: Can only modify own class scores');
        });
    });
    describe('Error Handling and Edge Cases', () => {
        it('handles DynamoDB errors gracefully', async () => {
            ddbMock.on(lib_dynamodb_1.PutCommand).rejects(new Error('DynamoDB service unavailable'));
            const classScoreInput = {
                catId: 'cat-1',
                beautyScore: 12,
                personalityScore: 18,
                balanceProportionScore: 13,
                coatCleanGroomed: true,
                teethGumsHealthy: true,
                eyesNoseClear: true,
                earsCleanMiteFree: true,
                toenailsClipped: true,
                fleaIssues: false
            };
            const judgeContext = {
                identity: { sub: 'judge-1', username: 'judge@example.com' }
            };
            await expect((0, classScoreDataAccess_1.createClassScore)(classScoreInput, judgeContext))
                .rejects.toThrow('Failed to create class score: DynamoDB service unavailable');
        });
        it('handles missing cat scenarios', async () => {
            ddbMock.on(lib_dynamodb_1.QueryCommand).resolves({ Items: [] });
            const classScoreInput = {
                catId: 'nonexistent-cat',
                beautyScore: 12,
                personalityScore: 18,
                balanceProportionScore: 13,
                coatCleanGroomed: true,
                teethGumsHealthy: true,
                eyesNoseClear: true,
                earsCleanMiteFree: true,
                toenailsClipped: true,
                fleaIssues: false
            };
            const judgeContext = {
                identity: { sub: 'judge-1', username: 'judge@example.com' }
            };
            // Should validate cat exists before creating score
            await expect((0, classScoreDataAccess_1.createClassScore)(classScoreInput, judgeContext))
                .rejects.toThrow('Cat not found: nonexistent-cat');
        });
        it('handles concurrent modification conflicts', async () => {
            const existingScore = {
                id: 'class-score-1',
                catId: 'cat-1',
                judgeId: 'judge-1',
                totalScore: 43,
                timestamp: '2024-01-15T10:00:00Z',
                version: 1
            };
            ddbMock.on(lib_dynamodb_1.QueryCommand).resolves({
                Items: [existingScore]
            });
            // Mock conditional check failure (version mismatch)
            ddbMock.on(lib_dynamodb_1.PutCommand).rejects({
                name: 'ConditionalCheckFailedException',
                message: 'The conditional request failed'
            });
            const judgeContext = {
                identity: { sub: 'judge-1', username: 'judge@example.com' }
            };
            await expect((0, classScoreDataAccess_1.updateClassScore)('class-score-1', { beautyScore: 15 }, judgeContext))
                .rejects.toThrow('Class score was modified by another user. Please refresh and try again.');
        });
        it('handles score finalization conflicts', async () => {
            const finalizedScore = {
                id: 'class-score-1',
                catId: 'cat-1',
                judgeId: 'judge-1',
                totalScore: 43,
                isFinalized: true,
                timestamp: '2024-01-15T10:00:00Z'
            };
            ddbMock.on(lib_dynamodb_1.QueryCommand).resolves({
                Items: [finalizedScore]
            });
            const judgeContext = {
                identity: { sub: 'judge-1', username: 'judge@example.com' }
            };
            // Should not allow modification of finalized scores without admin override
            await expect((0, classScoreDataAccess_1.updateClassScore)('class-score-1', { beautyScore: 15 }, judgeContext))
                .rejects.toThrow('Cannot modify finalized class score without admin privileges');
        });
    });
    describe('Performance and Scalability', () => {
        it('handles large datasets with pagination', async () => {
            // Mock large dataset with pagination
            const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
                id: `class-score-${i + 1}`,
                catId: `cat-${i + 1}`,
                judgeId: 'judge-1',
                totalScore: Math.floor(Math.random() * 50) + 1,
                ribbonEligibility: 'Red',
                timestamp: new Date().toISOString()
            }));
            // Mock paginated response
            ddbMock.on(lib_dynamodb_1.ScanCommand).resolves({
                Items: largeDataset.slice(0, 100), // First page
                LastEvaluatedKey: { PK: 'CLASS_SCORE#class-score-100', SK: 'METADATA' }
            });
            const firstPage = await (0, classScoreDataAccess_1.listAllClassScores)(100);
            expect(firstPage.items).toHaveLength(100);
            expect(firstPage.lastEvaluatedKey).toBeDefined();
            // Mock second page
            ddbMock.on(lib_dynamodb_1.ScanCommand).resolves({
                Items: largeDataset.slice(100, 200),
                LastEvaluatedKey: { PK: 'CLASS_SCORE#class-score-200', SK: 'METADATA' }
            });
            const secondPage = await (0, classScoreDataAccess_1.listAllClassScores)(100, firstPage.lastEvaluatedKey);
            expect(secondPage.items).toHaveLength(100);
            expect(secondPage.items[0].id).toBe('class-score-101');
        });
        it('efficiently batches DynamoDB operations', async () => {
            ddbMock.on(lib_dynamodb_1.PutCommand).resolves({});
            ddbMock.on(lib_dynamodb_1.QueryCommand).resolves({ Items: [] });
            const classScoreInput = {
                catId: 'cat-1',
                beautyScore: 12,
                personalityScore: 18,
                balanceProportionScore: 13,
                coatCleanGroomed: true,
                teethGumsHealthy: true,
                eyesNoseClear: true,
                earsCleanMiteFree: true,
                toenailsClipped: true,
                fleaIssues: false
            };
            const judgeContext = {
                identity: { sub: 'judge-1', username: 'judge@example.com' }
            };
            await (0, classScoreDataAccess_1.createClassScore)(classScoreInput, judgeContext);
            // Verify efficient batching (3 puts: main record + 2 indexes)
            expect(ddbMock.commandCalls(lib_dynamodb_1.PutCommand)).toHaveLength(3);
            // Verify all operations completed in reasonable time
            const startTime = Date.now();
            await (0, classScoreDataAccess_1.createClassScore)({ ...classScoreInput, catId: 'cat-2' }, judgeContext);
            const endTime = Date.now();
            expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhc3Mtc2NvcmluZy13b3JrZmxvdy5pbnRlZ3JhdGlvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xhc3Mtc2NvcmluZy13b3JrZmxvdy5pbnRlZ3JhdGlvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQ0Esd0RBQXNHO0FBQ3RHLDZEQUFpRDtBQUVqRCxrRUFBcUk7QUFFckksZ0JBQWdCO0FBQ2hCLE1BQU0sT0FBTyxHQUFHLElBQUEsZ0NBQVUsRUFBQyxxQ0FBc0IsQ0FBQyxDQUFDO0FBRW5ELDZCQUE2QjtBQUM3QixPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsR0FBRyxZQUFZLENBQUM7QUFFdEMsWUFBWTtBQUNaLE1BQU0sUUFBUSxHQUFHO0lBQ2YsT0FBTyxFQUFFO1FBQ1AsRUFBRSxFQUFFLE9BQU87UUFDWCxJQUFJLEVBQUUsUUFBUTtRQUNkLEtBQUssRUFBRSxlQUFlO1FBQ3RCLFVBQVUsRUFBRSxDQUFDO1FBQ2IsS0FBSyxFQUFFLGVBQWU7UUFDdEIsUUFBUSxFQUFFLE9BQU87S0FDbEI7SUFDRCxPQUFPLEVBQUU7UUFDUCxFQUFFLEVBQUUsT0FBTztRQUNYLElBQUksRUFBRSxVQUFVO1FBQ2hCLEtBQUssRUFBRSxXQUFXO1FBQ2xCLFVBQVUsRUFBRSxDQUFDO1FBQ2IsS0FBSyxFQUFFLGVBQWU7UUFDdEIsUUFBUSxFQUFFLFFBQVE7S0FDbkI7SUFDRCxPQUFPLEVBQUU7UUFDUCxFQUFFLEVBQUUsT0FBTztRQUNYLElBQUksRUFBRSxRQUFRO1FBQ2QsS0FBSyxFQUFFLGVBQWU7UUFDdEIsVUFBVSxFQUFFLENBQUM7UUFDYixLQUFLLEVBQUUsV0FBVztRQUNsQixRQUFRLEVBQUUsT0FBTztLQUNsQjtDQUNGLENBQUM7QUFFRixNQUFNLFVBQVUsR0FBRztJQUNqQixTQUFTLEVBQUU7UUFDVCxFQUFFLEVBQUUsU0FBUztRQUNiLElBQUksRUFBRSxhQUFhO1FBQ25CLFFBQVEsRUFBRSxtQkFBbUI7UUFD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QWUsR0FBRztnQkFDdEIsS0FBSyxFQUFFLE9BQU87Z0JBQ2QsV0FBVyxFQUFFLEVBQUU7Z0JBQ2YsZ0JBQWdCLEVBQUUsRUFBRTtnQkFDcEIsc0JBQXNCLEVBQUUsRUFBRTtnQkFDMUIsZ0JBQWdCLEVBQUUsSUFBSTtnQkFDdEIsZ0JBQWdCLEVBQUUsSUFBSTtnQkFDdEIsYUFBYSxFQUFFLElBQUk7Z0JBQ25CLGlCQUFpQixFQUFFLElBQUk7Z0JBQ3ZCLGVBQWUsRUFBRSxJQUFJO2dCQUNyQixVQUFVLEVBQUUsS0FBSzthQUNsQixDQUFDO1lBRUYsTUFBTSxZQUFZLEdBQUc7Z0JBQ25CLFFBQVEsRUFBRSxFQUFFLEdBQUcsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLG1CQUFtQixFQUFFO2FBQzVELENBQUM7WUFFRixNQUFNLElBQUEsdUNBQWdCLEVBQUMsZUFBZSxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBRXRELDhEQUE4RDtZQUM5RCxNQUFNLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyx5QkFBVSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFekQscURBQXFEO1lBQ3JELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUM3QixNQUFNLElBQUEsdUNBQWdCLEVBQUMsRUFBRSxHQUFHLGVBQWUsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDN0UsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBRTNCLE1BQU0sQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFDLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsa0NBQWtDO1FBQ3BGLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IER5bmFtb0RCQ2xpZW50IH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcbmltcG9ydCB7IER5bmFtb0RCRG9jdW1lbnRDbGllbnQsIFB1dENvbW1hbmQsIFF1ZXJ5Q29tbWFuZCwgU2NhbkNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xuaW1wb3J0IHsgbW9ja0NsaWVudCB9IGZyb20gJ2F3cy1zZGstY2xpZW50LW1vY2snO1xuaW1wb3J0IHsgY2xhc3NTY29yZVJlc29sdmVyIH0gZnJvbSAnLi4vY2xhc3NTY29yZVJlc29sdmVyJztcbmltcG9ydCB7IGNyZWF0ZUNsYXNzU2NvcmUsIHVwZGF0ZUNsYXNzU2NvcmUsIGdldENsYXNzU2NvcmUsIGdldENsYXNzU2NvcmVzQnlDYXQsIGxpc3RBbGxDbGFzc1Njb3JlcyB9IGZyb20gJy4uL2NsYXNzU2NvcmVEYXRhQWNjZXNzJztcblxuLy8gTW9jayBEeW5hbW9EQlxuY29uc3QgZGRiTW9jayA9IG1vY2tDbGllbnQoRHluYW1vREJEb2N1bWVudENsaWVudCk7XG5cbi8vIE1vY2sgZW52aXJvbm1lbnQgdmFyaWFibGVzXG5wcm9jZXNzLmVudi5UQUJMRV9OQU1FID0gJ3Rlc3QtdGFibGUnO1xuXG4vLyBUZXN0IGRhdGFcbmNvbnN0IG1vY2tDYXRzID0ge1xuICAnY2F0LTEnOiB7XG4gICAgaWQ6ICdjYXQtMScsXG4gICAgbmFtZTogJ0ZsdWZmeScsXG4gICAgb3duZXI6ICdBbGljZSBKb2huc29uJyxcbiAgICBjYWdlTnVtYmVyOiAxLFxuICAgIGNsYXNzOiAnSG91c2Vob2xkIFBldCcsXG4gICAgYWdlR3JvdXA6ICdBZHVsdCdcbiAgfSxcbiAgJ2NhdC0yJzoge1xuICAgIGlkOiAnY2F0LTInLFxuICAgIG5hbWU6ICdXaGlza2VycycsXG4gICAgb3duZXI6ICdCb2IgU21pdGgnLFxuICAgIGNhZ2VOdW1iZXI6IDIsXG4gICAgY2xhc3M6ICdIb3VzZWhvbGQgUGV0JyxcbiAgICBhZ2VHcm91cDogJ0tpdHRlbidcbiAgfSxcbiAgJ2NhdC0zJzoge1xuICAgIGlkOiAnY2F0LTMnLFxuICAgIG5hbWU6ICdTaGFkb3cnLFxuICAgIG93bmVyOiAnQ2hhcmxpZSBCcm93bicsXG4gICAgY2FnZU51bWJlcjogMyxcbiAgICBjbGFzczogJ1BlZGlncmVlZCcsXG4gICAgYWdlR3JvdXA6ICdBZHVsdCdcbiAgfVxufTtcblxuY29uc3QgbW9ja0p1ZGdlcyA9IHtcbiAgJ2p1ZGdlLTEnOiB7XG4gICAgaWQ6ICdqdWRnZS0xJyxcbiAgICBuYW1lOiAnSnVkZ2UgU21pdGgnLFxuICAgIHVzZXJuYW1lOiAnanVkZ2VAZXhhbXBsZS5jb20nLFxuICAgIHJvbGU6ICdqdWRnZSdcbiAgfSxcbiAgJ2p1ZGdlLTInOiB7XG4gICAgaWQ6ICdqdWRnZS0yJyxcbiAgICBuYW1lOiAnSnVkZ2UgSm9obnNvbicsXG4gICAgdXNlcm5hbWU6ICdqdWRnZTJAZXhhbXBsZS5jb20nLFxuICAgIHJvbGU6ICdqdWRnZSdcbiAgfVxufTtcblxuZGVzY3JpYmUoJ1R5cGUgQ2xhc3MgU2NvcmluZyBXb3JrZmxvdyBCYWNrZW5kIEludGVncmF0aW9uIFRlc3RzJywgKCkgPT4ge1xuICBiZWZvcmVFYWNoKCgpID0+IHtcbiAgICBkZGJNb2NrLnJlc2V0KCk7XG4gICAgamVzdC5jbGVhckFsbE1vY2tzKCk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdDb21wbGV0ZSBKdWRnZSBUeXBlIENsYXNzIFNjb3JpbmcgUHJvY2VzcycsICgpID0+IHtcbiAgICBpdCgnaGFuZGxlcyBlbmQtdG8tZW5kIHR5cGUgY2xhc3Mgc2NvcmluZyB3b3JrZmxvdyB3aXRoIER5bmFtb0RCIG9wZXJhdGlvbnMnLCBhc3luYyAoKSA9PiB7XG4gICAgICAvLyBNb2NrIHN1Y2Nlc3NmdWwgRHluYW1vREIgb3BlcmF0aW9uc1xuICAgICAgZGRiTW9jay5vbihQdXRDb21tYW5kKS5yZXNvbHZlcyh7fSk7XG4gICAgICBkZGJNb2NrLm9uKFF1ZXJ5Q29tbWFuZCkucmVzb2x2ZXMoeyBJdGVtczogW10gfSk7XG5cbiAgICAgIGNvbnN0IGNsYXNzU2NvcmVJbnB1dCA9IHtcbiAgICAgICAgY2F0SWQ6ICdjYXQtMScsXG4gICAgICAgIGJlYXV0eVNjb3JlOiAxNCxcbiAgICAgICAgYmVhdXR5Q29tbWVudHM6ICdFeGNlbGxlbnQgY29hdCBxdWFsaXR5IGFuZCBtYXJraW5ncycsXG4gICAgICAgIHBlcnNvbmFsaXR5U2NvcmU6IDE5LFxuICAgICAgICBwZXJzb25hbGl0eUNvbW1lbnRzOiAnVmVyeSBmcmllbmRseSBhbmQgd2VsbC1zb2NpYWxpemVkIGNhdCcsXG4gICAgICAgIGJhbGFuY2VQcm9wb3J0aW9uU2NvcmU6IDEzLFxuICAgICAgICBiYWxhbmNlUHJvcG9ydGlvbkNvbW1lbnRzOiAnR29vZCBvdmVyYWxsIGJvZHkgc3RydWN0dXJlIGFuZCBwcm9wb3J0aW9ucycsXG4gICAgICAgIGNvYXRDbGVhbkdyb29tZWQ6IHRydWUsXG4gICAgICAgIHRlZXRoR3Vtc0hlYWx0aHk6IHRydWUsXG4gICAgICAgIGV5ZXNOb3NlQ2xlYXI6IHRydWUsXG4gICAgICAgIGVhcnNDbGVhbk1pdGVGcmVlOiB0cnVlLFxuICAgICAgICB0b2VuYWlsc0NsaXBwZWQ6IHRydWUsXG4gICAgICAgIGZsZWFJc3N1ZXM6IGZhbHNlLFxuICAgICAgICBoZWFsdGhHcm9vbWluZ0NvbW1lbnRzOiAnRXhjZWxsZW50IGhlYWx0aCBhbmQgZ3Jvb21pbmcgc3RhbmRhcmRzJyxcbiAgICAgICAgaXNGaW5hbGl6ZWQ6IGZhbHNlXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBqdWRnZUNvbnRleHQgPSB7XG4gICAgICAgIGlkZW50aXR5OiB7XG4gICAgICAgICAgc3ViOiAnanVkZ2UtMScsXG4gICAgICAgICAgdXNlcm5hbWU6ICdqdWRnZUBleGFtcGxlLmNvbSdcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgLy8gQ3JlYXRlIGNsYXNzIHNjb3JlXG4gICAgICBjb25zdCBjcmVhdGVkU2NvcmUgPSBhd2FpdCBjcmVhdGVDbGFzc1Njb3JlKGNsYXNzU2NvcmVJbnB1dCwganVkZ2VDb250ZXh0KTtcblxuICAgICAgLy8gVmVyaWZ5IHNjb3JlIGNyZWF0aW9uXG4gICAgICBleHBlY3QoY3JlYXRlZFNjb3JlKS50b01hdGNoT2JqZWN0KHtcbiAgICAgICAgY2F0SWQ6ICdjYXQtMScsXG4gICAgICAgIGp1ZGdlSWQ6ICdqdWRnZS0xJyxcbiAgICAgICAgYmVhdXR5U2NvcmU6IDE0LFxuICAgICAgICBwZXJzb25hbGl0eVNjb3JlOiAxOSxcbiAgICAgICAgYmFsYW5jZVByb3BvcnRpb25TY29yZTogMTMsXG4gICAgICAgIHRvdGFsU2NvcmU6IDQ2LCAvLyAxNCArIDE5ICsgMTNcbiAgICAgICAgcmliYm9uRWxpZ2liaWxpdHk6ICdCbHVlJywgLy8gNDYgcG9pbnRzIHdpdGggYWxsIGhlYWx0aCBwYXNzaW5nXG4gICAgICAgIGNvYXRDbGVhbkdyb29tZWQ6IHRydWUsXG4gICAgICAgIHRlZXRoR3Vtc0hlYWx0aHk6IHRydWUsXG4gICAgICAgIGV5ZXNOb3NlQ2xlYXI6IHRydWUsXG4gICAgICAgIGVhcnNDbGVhbk1pdGVGcmVlOiB0cnVlLFxuICAgICAgICB0b2VuYWlsc0NsaXBwZWQ6IHRydWUsXG4gICAgICAgIGZsZWFJc3N1ZXM6IGZhbHNlLFxuICAgICAgICBpc0ZpbmFsaXplZDogZmFsc2VcbiAgICAgIH0pO1xuXG4gICAgICBleHBlY3QoY3JlYXRlZFNjb3JlLmlkKS50b0JlRGVmaW5lZCgpO1xuICAgICAgZXhwZWN0KGNyZWF0ZWRTY29yZS50aW1lc3RhbXApLnRvQmVEZWZpbmVkKCk7XG5cbiAgICAgIC8vIFZlcmlmeSBEeW5hbW9EQiBvcGVyYXRpb25zXG4gICAgICBleHBlY3QoZGRiTW9jay5jb21tYW5kQ2FsbHMoUHV0Q29tbWFuZCkpLnRvSGF2ZUxlbmd0aCgzKTsgLy8gTWFpbiByZWNvcmQgKyAyIGluZGV4ZXNcblxuICAgICAgY29uc3QgcHV0Q2FsbHMgPSBkZGJNb2NrLmNvbW1hbmRDYWxscyhQdXRDb21tYW5kKTtcbiAgICAgIFxuICAgICAgLy8gTWFpbiBjbGFzcyBzY29yZSByZWNvcmRcbiAgICAgIGV4cGVjdChwdXRDYWxsc1swXS5hcmdzWzBdLmlucHV0Lkl0ZW0pLnRvTWF0Y2hPYmplY3Qoe1xuICAgICAgICBQSzogZXhwZWN0LnN0cmluZ01hdGNoaW5nKC9eQ0xBU1NfU0NPUkUjLyksXG4gICAgICAgIFNLOiAnTUVUQURBVEEnLFxuICAgICAgICBjYXRJZDogJ2NhdC0xJyxcbiAgICAgICAganVkZ2VJZDogJ2p1ZGdlLTEnLFxuICAgICAgICB0b3RhbFNjb3JlOiA0NixcbiAgICAgICAgcmliYm9uRWxpZ2liaWxpdHk6ICdCbHVlJ1xuICAgICAgfSk7XG5cbiAgICAgIC8vIENhdCBpbmRleCByZWNvcmRcbiAgICAgIGV4cGVjdChwdXRDYWxsc1sxXS5hcmdzWzBdLmlucHV0Lkl0ZW0pLnRvTWF0Y2hPYmplY3Qoe1xuICAgICAgICBQSzogJ0NBVCNjYXQtMScsXG4gICAgICAgIFNLOiBleHBlY3Quc3RyaW5nTWF0Y2hpbmcoL15DTEFTU19TQ09SRSMvKSxcbiAgICAgICAganVkZ2VJZDogJ2p1ZGdlLTEnLFxuICAgICAgICB0b3RhbFNjb3JlOiA0NixcbiAgICAgICAgcmliYm9uRWxpZ2liaWxpdHk6ICdCbHVlJ1xuICAgICAgfSk7XG5cbiAgICAgIC8vIEp1ZGdlIGluZGV4IHJlY29yZFxuICAgICAgZXhwZWN0KHB1dENhbGxzWzJdLmFyZ3NbMF0uaW5wdXQuSXRlbSkudG9NYXRjaE9iamVjdCh7XG4gICAgICAgIFBLOiAnSlVER0UjanVkZ2UtMScsXG4gICAgICAgIFNLOiBleHBlY3Quc3RyaW5nTWF0Y2hpbmcoL15DTEFTU19TQ09SRSMvKSxcbiAgICAgICAgY2F0SWQ6ICdjYXQtMScsXG4gICAgICAgIHRvdGFsU2NvcmU6IDQ2LFxuICAgICAgICByaWJib25FbGlnaWJpbGl0eTogJ0JsdWUnXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIGl0KCdwcmV2ZW50cyBkdXBsaWNhdGUgdHlwZSBjbGFzcyBzY29yaW5nIGJ5IHNhbWUganVkZ2UnLCBhc3luYyAoKSA9PiB7XG4gICAgICAvLyBNb2NrIGV4aXN0aW5nIGNsYXNzIHNjb3JlIGJ5IHNhbWUganVkZ2VcbiAgICAgIGNvbnN0IGV4aXN0aW5nU2NvcmUgPSB7XG4gICAgICAgIGlkOiAnY2xhc3Mtc2NvcmUtMScsXG4gICAgICAgIGNhdElkOiAnY2F0LTEnLFxuICAgICAgICBqdWRnZUlkOiAnanVkZ2UtMScsXG4gICAgICAgIGp1ZGdlTmFtZTogJ0p1ZGdlIFNtaXRoJyxcbiAgICAgICAgdG90YWxTY29yZTogNDAsXG4gICAgICAgIHJpYmJvbkVsaWdpYmlsaXR5OiAnUmVkJyxcbiAgICAgICAgaXNGaW5hbGl6ZWQ6IHRydWUsXG4gICAgICAgIHRpbWVzdGFtcDogJzIwMjQtMDEtMTVUMTA6MDA6MDBaJ1xuICAgICAgfTtcblxuICAgICAgZGRiTW9jay5vbihRdWVyeUNvbW1hbmQpLnJlc29sdmVzKHtcbiAgICAgICAgSXRlbXM6IFtleGlzdGluZ1Njb3JlXVxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IGNsYXNzU2NvcmVJbnB1dCA9IHtcbiAgICAgICAgY2F0SWQ6ICdjYXQtMScsXG4gICAgICAgIGJlYXV0eVNjb3JlOiAxMixcbiAgICAgICAgcGVyc29uYWxpdHlTY29yZTogMTgsXG4gICAgICAgIGJhbGFuY2VQcm9wb3J0aW9uU2NvcmU6IDEzLFxuICAgICAgICBjb2F0Q2xlYW5Hcm9vbWVkOiB0cnVlLFxuICAgICAgICB0ZWV0aEd1bXNIZWFsdGh5OiB0cnVlLFxuICAgICAgICBleWVzTm9zZUNsZWFyOiB0cnVlLFxuICAgICAgICBlYXJzQ2xlYW5NaXRlRnJlZTogdHJ1ZSxcbiAgICAgICAgdG9lbmFpbHNDbGlwcGVkOiB0cnVlLFxuICAgICAgICBmbGVhSXNzdWVzOiBmYWxzZSxcbiAgICAgICAgaXNGaW5hbGl6ZWQ6IGZhbHNlXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBqdWRnZUNvbnRleHQgPSB7XG4gICAgICAgIGlkZW50aXR5OiB7XG4gICAgICAgICAgc3ViOiAnanVkZ2UtMScsXG4gICAgICAgICAgdXNlcm5hbWU6ICdqdWRnZUBleGFtcGxlLmNvbSdcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgLy8gQXR0ZW1wdCB0byBjcmVhdGUgZHVwbGljYXRlIHNjb3JlIHNob3VsZCB0aHJvdyBlcnJvclxuICAgICAgYXdhaXQgZXhwZWN0KGNyZWF0ZUNsYXNzU2NvcmUoY2xhc3NTY29yZUlucHV0LCBqdWRnZUNvbnRleHQpKVxuICAgICAgICAucmVqZWN0cy50b1Rocm93KCdKdWRnZSBoYXMgYWxyZWFkeSBzdWJtaXR0ZWQgYSBmaW5hbGl6ZWQgY2xhc3Mgc2NvcmUgZm9yIHRoaXMgY2F0Jyk7XG5cbiAgICAgIC8vIFZlcmlmeSBubyBuZXcgcmVjb3JkcyB3ZXJlIGNyZWF0ZWRcbiAgICAgIGV4cGVjdChkZGJNb2NrLmNvbW1hbmRDYWxscyhQdXRDb21tYW5kKSkudG9IYXZlTGVuZ3RoKDApO1xuICAgIH0pO1xuXG4gICAgaXQoJ2hhbmRsZXMgY2xhc3Mgc2NvcmUgdXBkYXRlcyB3aXRoIGF1ZGl0IHRyYWlsIGNyZWF0aW9uJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZXhpc3RpbmdTY29yZSA9IHtcbiAgICAgICAgaWQ6ICdjbGFzcy1zY29yZS0xJyxcbiAgICAgICAgY2F0SWQ6ICdjYXQtMScsXG4gICAgICAgIGp1ZGdlSWQ6ICdqdWRnZS0xJyxcbiAgICAgICAganVkZ2VOYW1lOiAnSnVkZ2UgU21pdGgnLFxuICAgICAgICBiZWF1dHlTY29yZTogMTIsXG4gICAgICAgIHBlcnNvbmFsaXR5U2NvcmU6IDE4LFxuICAgICAgICBiYWxhbmNlUHJvcG9ydGlvblNjb3JlOiAxMyxcbiAgICAgICAgdG90YWxTY29yZTogNDMsXG4gICAgICAgIHJpYmJvbkVsaWdpYmlsaXR5OiAnUmVkJyxcbiAgICAgICAgaXNGaW5hbGl6ZWQ6IGZhbHNlLFxuICAgICAgICB0aW1lc3RhbXA6ICcyMDI0LTAxLTE1VDEwOjAwOjAwWidcbiAgICAgIH07XG5cbiAgICAgIC8vIE1vY2sgZXhpc3Rpbmcgc2NvcmUgcmV0cmlldmFsXG4gICAgICBkZGJNb2NrLm9uKFF1ZXJ5Q29tbWFuZCkucmVzb2x2ZXMoe1xuICAgICAgICBJdGVtczogW2V4aXN0aW5nU2NvcmVdXG4gICAgICB9KTtcblxuICAgICAgLy8gTW9jayBzdWNjZXNzZnVsIHVwZGF0ZVxuICAgICAgZGRiTW9jay5vbihQdXRDb21tYW5kKS5yZXNvbHZlcyh7fSk7XG5cbiAgICAgIGNvbnN0IHVwZGF0ZUlucHV0ID0ge1xuICAgICAgICBiZWF1dHlTY29yZTogMTQsXG4gICAgICAgIGJlYXV0eUNvbW1lbnRzOiAnVXBkYXRlZDogRXhjZWxsZW50IGNvYXQgcXVhbGl0eScsXG4gICAgICAgIHBlcnNvbmFsaXR5U2NvcmU6IDE5LFxuICAgICAgICBwZXJzb25hbGl0eUNvbW1lbnRzOiAnVXBkYXRlZDogVmVyeSBmcmllbmRseSB0ZW1wZXJhbWVudCdcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGp1ZGdlQ29udGV4dCA9IHtcbiAgICAgICAgaWRlbnRpdHk6IHtcbiAgICAgICAgICBzdWI6ICdqdWRnZS0xJyxcbiAgICAgICAgICB1c2VybmFtZTogJ2p1ZGdlQGV4YW1wbGUuY29tJ1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBjb25zdCB1cGRhdGVkU2NvcmUgPSBhd2FpdCB1cGRhdGVDbGFzc1Njb3JlKCdjbGFzcy1zY29yZS0xJywgdXBkYXRlSW5wdXQsIGp1ZGdlQ29udGV4dCk7XG5cbiAgICAgIC8vIFZlcmlmeSB1cGRhdGVkIHZhbHVlc1xuICAgICAgZXhwZWN0KHVwZGF0ZWRTY29yZSkudG9NYXRjaE9iamVjdCh7XG4gICAgICAgIGlkOiAnY2xhc3Mtc2NvcmUtMScsXG4gICAgICAgIGNhdElkOiAnY2F0LTEnLFxuICAgICAgICBqdWRnZUlkOiAnanVkZ2UtMScsXG4gICAgICAgIGJlYXV0eVNjb3JlOiAxNCxcbiAgICAgICAgcGVyc29uYWxpdHlTY29yZTogMTksXG4gICAgICAgIGJhbGFuY2VQcm9wb3J0aW9uU2NvcmU6IDEzLCAvLyBVbmNoYW5nZWRcbiAgICAgICAgdG90YWxTY29yZTogNDYsIC8vIFJlY2FsY3VsYXRlZDogMTQgKyAxOSArIDEzXG4gICAgICAgIHJpYmJvbkVsaWdpYmlsaXR5OiAnQmx1ZScsIC8vIFVwZGF0ZWQgYmFzZWQgb24gbmV3IHRvdGFsXG4gICAgICAgIGlzRmluYWxpemVkOiBmYWxzZVxuICAgICAgfSk7XG5cbiAgICAgIC8vIFZlcmlmeSBhdWRpdCB0cmFpbCBjcmVhdGlvblxuICAgICAgY29uc3QgcHV0Q2FsbHMgPSBkZGJNb2NrLmNvbW1hbmRDYWxscyhQdXRDb21tYW5kKTtcbiAgICAgIGV4cGVjdChwdXRDYWxscy5sZW5ndGgpLnRvQmVHcmVhdGVyVGhhbigzKTsgLy8gTWFpbiArIGluZGV4ZXMgKyBhdWRpdCByZWNvcmRcblxuICAgICAgLy8gQ2hlY2sgZm9yIGF1ZGl0IHJlY29yZFxuICAgICAgY29uc3QgYXVkaXRDYWxsID0gcHV0Q2FsbHMuZmluZChjYWxsID0+IFxuICAgICAgICBjYWxsLmFyZ3NbMF0uaW5wdXQuSXRlbS5QSz8uaW5jbHVkZXMoJ0FVRElUJylcbiAgICAgICk7XG4gICAgICBleHBlY3QoYXVkaXRDYWxsKS50b0JlRGVmaW5lZCgpO1xuICAgICAgZXhwZWN0KGF1ZGl0Q2FsbC5hcmdzWzBdLmlucHV0Lkl0ZW0pLnRvTWF0Y2hPYmplY3Qoe1xuICAgICAgICBQSzogZXhwZWN0LnN0cmluZ01hdGNoaW5nKC9eQ0xBU1NfU0NPUkVfQVVESVQjLyksXG4gICAgICAgIFNLOiBleHBlY3Quc3RyaW5nTWF0Y2hpbmcoL15cXGR7NH0tXFxkezJ9LVxcZHsyfVQvKSxcbiAgICAgICAgY2xhc3NTY29yZUlkOiAnY2xhc3Mtc2NvcmUtMScsXG4gICAgICAgIGp1ZGdlSWQ6ICdqdWRnZS0xJyxcbiAgICAgICAgYWN0aW9uOiAnVVBEQVRFJyxcbiAgICAgICAgY2hhbmdlczogZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgICAgIGJlYXV0eVNjb3JlOiB7IGZyb206IDEyLCB0bzogMTQgfSxcbiAgICAgICAgICBwZXJzb25hbGl0eVNjb3JlOiB7IGZyb206IDE4LCB0bzogMTkgfSxcbiAgICAgICAgICB0b3RhbFNjb3JlOiB7IGZyb206IDQzLCB0bzogNDYgfSxcbiAgICAgICAgICByaWJib25FbGlnaWJpbGl0eTogeyBmcm9tOiAnUmVkJywgdG86ICdCbHVlJyB9XG4gICAgICAgIH0pXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ011bHRpLUp1ZGdlIFNjZW5hcmlvcycsICgpID0+IHtcbiAgICBpdCgnYWxsb3dzIG11bHRpcGxlIGp1ZGdlcyB0byBzY29yZSBzYW1lIGNhdCBpbmRlcGVuZGVudGx5JywgYXN5bmMgKCkgPT4ge1xuICAgICAgLy8gTW9jayBubyBleGlzdGluZyBzY29yZXMgZm9yIGp1ZGdlLTJcbiAgICAgIGRkYk1vY2sub24oUXVlcnlDb21tYW5kKS5yZXNvbHZlcyh7IEl0ZW1zOiBbXSB9KTtcbiAgICAgIGRkYk1vY2sub24oUHV0Q29tbWFuZCkucmVzb2x2ZXMoe30pO1xuXG4gICAgICBjb25zdCBqdWRnZTFJbnB1dCA9IHtcbiAgICAgICAgY2F0SWQ6ICdjYXQtMScsXG4gICAgICAgIGJlYXV0eVNjb3JlOiAxMixcbiAgICAgICAgcGVyc29uYWxpdHlTY29yZTogMTgsXG4gICAgICAgIGJhbGFuY2VQcm9wb3J0aW9uU2NvcmU6IDEzLFxuICAgICAgICBjb2F0Q2xlYW5Hcm9vbWVkOiB0cnVlLFxuICAgICAgICB0ZWV0aEd1bXNIZWFsdGh5OiB0cnVlLFxuICAgICAgICBleWVzTm9zZUNsZWFyOiB0cnVlLFxuICAgICAgICBlYXJzQ2xlYW5NaXRlRnJlZTogdHJ1ZSxcbiAgICAgICAgdG9lbmFpbHNDbGlwcGVkOiB0cnVlLFxuICAgICAgICBmbGVhSXNzdWVzOiBmYWxzZSxcbiAgICAgICAgaXNGaW5hbGl6ZWQ6IHRydWVcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGp1ZGdlMklucHV0ID0ge1xuICAgICAgICBjYXRJZDogJ2NhdC0xJyxcbiAgICAgICAgYmVhdXR5U2NvcmU6IDE0LFxuICAgICAgICBwZXJzb25hbGl0eVNjb3JlOiAxOSxcbiAgICAgICAgYmFsYW5jZVByb3BvcnRpb25TY29yZTogMTQsXG4gICAgICAgIGNvYXRDbGVhbkdyb29tZWQ6IHRydWUsXG4gICAgICAgIHRlZXRoR3Vtc0hlYWx0aHk6IHRydWUsXG4gICAgICAgIGV5ZXNOb3NlQ2xlYXI6IHRydWUsXG4gICAgICAgIGVhcnNDbGVhbk1pdGVGcmVlOiB0cnVlLFxuICAgICAgICB0b2VuYWlsc0NsaXBwZWQ6IHRydWUsXG4gICAgICAgIGZsZWFJc3N1ZXM6IGZhbHNlLFxuICAgICAgICBpc0ZpbmFsaXplZDogdHJ1ZVxuICAgICAgfTtcblxuICAgICAgY29uc3QganVkZ2UxQ29udGV4dCA9IHtcbiAgICAgICAgaWRlbnRpdHk6IHsgc3ViOiAnanVkZ2UtMScsIHVzZXJuYW1lOiAnanVkZ2VAZXhhbXBsZS5jb20nIH1cbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGp1ZGdlMkNvbnRleHQgPSB7XG4gICAgICAgIGlkZW50aXR5OiB7IHN1YjogJ2p1ZGdlLTInLCB1c2VybmFtZTogJ2p1ZGdlMkBleGFtcGxlLmNvbScgfVxuICAgICAgfTtcblxuICAgICAgLy8gQ3JlYXRlIHNjb3JlcyBmcm9tIGJvdGgganVkZ2VzXG4gICAgICBjb25zdCBqdWRnZTFTY29yZSA9IGF3YWl0IGNyZWF0ZUNsYXNzU2NvcmUoanVkZ2UxSW5wdXQsIGp1ZGdlMUNvbnRleHQpO1xuICAgICAgY29uc3QganVkZ2UyU2NvcmUgPSBhd2FpdCBjcmVhdGVDbGFzc1Njb3JlKGp1ZGdlMklucHV0LCBqdWRnZTJDb250ZXh0KTtcblxuICAgICAgLy8gVmVyaWZ5IGJvdGggc2NvcmVzIHdlcmUgY3JlYXRlZCB3aXRoIGRpZmZlcmVudCBqdWRnZXNcbiAgICAgIGV4cGVjdChqdWRnZTFTY29yZS5qdWRnZUlkKS50b0JlKCdqdWRnZS0xJyk7XG4gICAgICBleHBlY3QoanVkZ2UxU2NvcmUudG90YWxTY29yZSkudG9CZSg0Myk7XG4gICAgICBleHBlY3QoanVkZ2UxU2NvcmUucmliYm9uRWxpZ2liaWxpdHkpLnRvQmUoJ1JlZCcpO1xuXG4gICAgICBleHBlY3QoanVkZ2UyU2NvcmUuanVkZ2VJZCkudG9CZSgnanVkZ2UtMicpO1xuICAgICAgZXhwZWN0KGp1ZGdlMlNjb3JlLnRvdGFsU2NvcmUpLnRvQmUoNDcpO1xuICAgICAgZXhwZWN0KGp1ZGdlMlNjb3JlLnJpYmJvbkVsaWdpYmlsaXR5KS50b0JlKCdCbHVlJyk7XG5cbiAgICAgIC8vIFZlcmlmeSBzZXBhcmF0ZSBEeW5hbW9EQiByZWNvcmRzXG4gICAgICBleHBlY3QoZGRiTW9jay5jb21tYW5kQ2FsbHMoUHV0Q29tbWFuZCkpLnRvSGF2ZUxlbmd0aCg2KTsgLy8gMyByZWNvcmRzIHBlciBzY29yZVxuICAgIH0pO1xuXG4gICAgaXQoJ2NhbGN1bGF0ZXMgYXZlcmFnZSBzY29yZXMgZm9yIG11bHRpLWp1ZGdlIHNjZW5hcmlvcycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGp1ZGdlMVNjb3JlID0ge1xuICAgICAgICBpZDogJ2NsYXNzLXNjb3JlLTEnLFxuICAgICAgICBjYXRJZDogJ2NhdC0xJyxcbiAgICAgICAganVkZ2VJZDogJ2p1ZGdlLTEnLFxuICAgICAgICBqdWRnZU5hbWU6ICdKdWRnZSBTbWl0aCcsXG4gICAgICAgIHRvdGFsU2NvcmU6IDQzLFxuICAgICAgICByaWJib25FbGlnaWJpbGl0eTogJ1JlZCcsXG4gICAgICAgIGlzRmluYWxpemVkOiB0cnVlXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBqdWRnZTJTY29yZSA9IHtcbiAgICAgICAgaWQ6ICdjbGFzcy1zY29yZS0yJyxcbiAgICAgICAgY2F0SWQ6ICdjYXQtMScsXG4gICAgICAgIGp1ZGdlSWQ6ICdqdWRnZS0yJyxcbiAgICAgICAganVkZ2VOYW1lOiAnSnVkZ2UgSm9obnNvbicsXG4gICAgICAgIHRvdGFsU2NvcmU6IDQ3LFxuICAgICAgICByaWJib25FbGlnaWJpbGl0eTogJ0JsdWUnLFxuICAgICAgICBpc0ZpbmFsaXplZDogdHJ1ZVxuICAgICAgfTtcblxuICAgICAgLy8gTW9jayByZXRyaWV2YWwgb2YgbXVsdGlwbGUgc2NvcmVzIGZvciBzYW1lIGNhdFxuICAgICAgZGRiTW9jay5vbihRdWVyeUNvbW1hbmQpLnJlc29sdmVzKHtcbiAgICAgICAgSXRlbXM6IFtqdWRnZTFTY29yZSwganVkZ2UyU2NvcmVdXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgY2F0U2NvcmVzID0gYXdhaXQgZ2V0Q2xhc3NTY29yZXNCeUNhdCgnY2F0LTEnKTtcblxuICAgICAgZXhwZWN0KGNhdFNjb3Jlcy5pdGVtcykudG9IYXZlTGVuZ3RoKDIpO1xuICAgICAgZXhwZWN0KGNhdFNjb3Jlcy5pdGVtc1swXS50b3RhbFNjb3JlKS50b0JlKDQzKTtcbiAgICAgIGV4cGVjdChjYXRTY29yZXMuaXRlbXNbMV0udG90YWxTY29yZSkudG9CZSg0Nyk7XG5cbiAgICAgIC8vIENhbGN1bGF0ZSBhdmVyYWdlICh3b3VsZCBiZSBkb25lIGluIGZyb250ZW5kIG9yIHNlcGFyYXRlIGZ1bmN0aW9uKVxuICAgICAgY29uc3QgYXZlcmFnZVNjb3JlID0gY2F0U2NvcmVzLml0ZW1zLnJlZHVjZSgoc3VtLCBzY29yZSkgPT4gc3VtICsgc2NvcmUudG90YWxTY29yZSwgMCkgLyBjYXRTY29yZXMuaXRlbXMubGVuZ3RoO1xuICAgICAgZXhwZWN0KGF2ZXJhZ2VTY29yZSkudG9CZSg0NSk7IC8vICg0MyArIDQ3KSAvIDJcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ0NsYXNzIFNjb3JlIENhbGN1bGF0aW9uIGFuZCBWYWxpZGF0aW9uJywgKCkgPT4ge1xuICAgIGl0KCd2YWxpZGF0ZXMgc2NvcmUgcmFuZ2VzIGZvciBlYWNoIGNhdGVnb3J5JywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgaW52YWxpZElucHV0cyA9IFtcbiAgICAgICAge1xuICAgICAgICAgIGNhdElkOiAnY2F0LTEnLFxuICAgICAgICAgIGJlYXV0eVNjb3JlOiAxNiwgLy8gT3ZlciBtYXhpbXVtIG9mIDE1XG4gICAgICAgICAgcGVyc29uYWxpdHlTY29yZTogMTgsXG4gICAgICAgICAgYmFsYW5jZVByb3BvcnRpb25TY29yZTogMTMsXG4gICAgICAgICAgY29hdENsZWFuR3Jvb21lZDogdHJ1ZSxcbiAgICAgICAgICB0ZWV0aEd1bXNIZWFsdGh5OiB0cnVlLFxuICAgICAgICAgIGV5ZXNOb3NlQ2xlYXI6IHRydWUsXG4gICAgICAgICAgZWFyc0NsZWFuTWl0ZUZyZWU6IHRydWUsXG4gICAgICAgICAgdG9lbmFpbHNDbGlwcGVkOiB0cnVlLFxuICAgICAgICAgIGZsZWFJc3N1ZXM6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBjYXRJZDogJ2NhdC0xJyxcbiAgICAgICAgICBiZWF1dHlTY29yZTogMTIsXG4gICAgICAgICAgcGVyc29uYWxpdHlTY29yZTogMjEsIC8vIE92ZXIgbWF4aW11bSBvZiAyMFxuICAgICAgICAgIGJhbGFuY2VQcm9wb3J0aW9uU2NvcmU6IDEzLFxuICAgICAgICAgIGNvYXRDbGVhbkdyb29tZWQ6IHRydWUsXG4gICAgICAgICAgdGVldGhHdW1zSGVhbHRoeTogdHJ1ZSxcbiAgICAgICAgICBleWVzTm9zZUNsZWFyOiB0cnVlLFxuICAgICAgICAgIGVhcnNDbGVhbk1pdGVGcmVlOiB0cnVlLFxuICAgICAgICAgIHRvZW5haWxzQ2xpcHBlZDogdHJ1ZSxcbiAgICAgICAgICBmbGVhSXNzdWVzOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgY2F0SWQ6ICdjYXQtMScsXG4gICAgICAgICAgYmVhdXR5U2NvcmU6IDEyLFxuICAgICAgICAgIHBlcnNvbmFsaXR5U2NvcmU6IDE4LFxuICAgICAgICAgIGJhbGFuY2VQcm9wb3J0aW9uU2NvcmU6IC0xLCAvLyBCZWxvdyBtaW5pbXVtIG9mIDBcbiAgICAgICAgICBjb2F0Q2xlYW5Hcm9vbWVkOiB0cnVlLFxuICAgICAgICAgIHRlZXRoR3Vtc0hlYWx0aHk6IHRydWUsXG4gICAgICAgICAgZXllc05vc2VDbGVhcjogdHJ1ZSxcbiAgICAgICAgICBlYXJzQ2xlYW5NaXRlRnJlZTogdHJ1ZSxcbiAgICAgICAgICB0b2VuYWlsc0NsaXBwZWQ6IHRydWUsXG4gICAgICAgICAgZmxlYUlzc3VlczogZmFsc2VcbiAgICAgICAgfVxuICAgICAgXTtcblxuICAgICAgY29uc3QganVkZ2VDb250ZXh0ID0ge1xuICAgICAgICBpZGVudGl0eTogeyBzdWI6ICdqdWRnZS0xJywgdXNlcm5hbWU6ICdqdWRnZUBleGFtcGxlLmNvbScgfVxuICAgICAgfTtcblxuICAgICAgZm9yIChjb25zdCBpbnZhbGlkSW5wdXQgb2YgaW52YWxpZElucHV0cykge1xuICAgICAgICBhd2FpdCBleHBlY3QoY3JlYXRlQ2xhc3NTY29yZShpbnZhbGlkSW5wdXQsIGp1ZGdlQ29udGV4dCkpXG4gICAgICAgICAgLnJlamVjdHMudG9UaHJvdygvc2NvcmUgbXVzdCBiZSBiZXR3ZWVuLyk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpdCgnY2FsY3VsYXRlcyB0b3RhbCBzY29yZXMgYW5kIHJpYmJvbiBlbGlnaWJpbGl0eSBhY2N1cmF0ZWx5JywgYXN5bmMgKCkgPT4ge1xuICAgICAgZGRiTW9jay5vbihRdWVyeUNvbW1hbmQpLnJlc29sdmVzKHsgSXRlbXM6IFtdIH0pO1xuICAgICAgZGRiTW9jay5vbihQdXRDb21tYW5kKS5yZXNvbHZlcyh7fSk7XG5cbiAgICAgIGNvbnN0IHRlc3RDYXNlcyA9IFtcbiAgICAgICAge1xuICAgICAgICAgIGlucHV0OiB7XG4gICAgICAgICAgICBiZWF1dHlTY29yZTogMTUsIHBlcnNvbmFsaXR5U2NvcmU6IDIwLCBiYWxhbmNlUHJvcG9ydGlvblNjb3JlOiAxNSxcbiAgICAgICAgICAgIGNvYXRDbGVhbkdyb29tZWQ6IHRydWUsIHRlZXRoR3Vtc0hlYWx0aHk6IHRydWUsIGV5ZXNOb3NlQ2xlYXI6IHRydWUsXG4gICAgICAgICAgICBlYXJzQ2xlYW5NaXRlRnJlZTogdHJ1ZSwgdG9lbmFpbHNDbGlwcGVkOiB0cnVlLCBmbGVhSXNzdWVzOiBmYWxzZVxuICAgICAgICAgIH0sXG4gICAgICAgICAgZXhwZWN0ZWQ6IHsgdG90YWxTY29yZTogNTAsIHJpYmJvbkVsaWdpYmlsaXR5OiAnQmx1ZScgfVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgaW5wdXQ6IHtcbiAgICAgICAgICAgIGJlYXV0eVNjb3JlOiAxMiwgcGVyc29uYWxpdHlTY29yZTogMTgsIGJhbGFuY2VQcm9wb3J0aW9uU2NvcmU6IDEzLFxuICAgICAgICAgICAgY29hdENsZWFuR3Jvb21lZDogdHJ1ZSwgdGVldGhHdW1zSGVhbHRoeTogdHJ1ZSwgZXllc05vc2VDbGVhcjogdHJ1ZSxcbiAgICAgICAgICAgIGVhcnNDbGVhbk1pdGVGcmVlOiB0cnVlLCB0b2VuYWlsc0NsaXBwZWQ6IHRydWUsIGZsZWFJc3N1ZXM6IGZhbHNlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBleHBlY3RlZDogeyB0b3RhbFNjb3JlOiA0MywgcmliYm9uRWxpZ2liaWxpdHk6ICdSZWQnIH1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGlucHV0OiB7XG4gICAgICAgICAgICBiZWF1dHlTY29yZTogMTAsIHBlcnNvbmFsaXR5U2NvcmU6IDEyLCBiYWxhbmNlUHJvcG9ydGlvblNjb3JlOiAxMCxcbiAgICAgICAgICAgIGNvYXRDbGVhbkdyb29tZWQ6IHRydWUsIHRlZXRoR3Vtc0hlYWx0aHk6IHRydWUsIGV5ZXNOb3NlQ2xlYXI6IHRydWUsXG4gICAgICAgICAgICBlYXJzQ2xlYW5NaXRlRnJlZTogdHJ1ZSwgdG9lbmFpbHNDbGlwcGVkOiB0cnVlLCBmbGVhSXNzdWVzOiBmYWxzZVxuICAgICAgICAgIH0sXG4gICAgICAgICAgZXhwZWN0ZWQ6IHsgdG90YWxTY29yZTogMzIsIHJpYmJvbkVsaWdpYmlsaXR5OiAnV2hpdGUnIH1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGlucHV0OiB7XG4gICAgICAgICAgICBiZWF1dHlTY29yZTogOCwgcGVyc29uYWxpdHlTY29yZTogMTAsIGJhbGFuY2VQcm9wb3J0aW9uU2NvcmU6IDYsXG4gICAgICAgICAgICBjb2F0Q2xlYW5Hcm9vbWVkOiB0cnVlLCB0ZWV0aEd1bXNIZWFsdGh5OiB0cnVlLCBleWVzTm9zZUNsZWFyOiB0cnVlLFxuICAgICAgICAgICAgZWFyc0NsZWFuTWl0ZUZyZWU6IHRydWUsIHRvZW5haWxzQ2xpcHBlZDogdHJ1ZSwgZmxlYUlzc3VlczogZmFsc2VcbiAgICAgICAgICB9LFxuICAgICAgICAgIGV4cGVjdGVkOiB7IHRvdGFsU2NvcmU6IDI0LCByaWJib25FbGlnaWJpbGl0eTogJ1BhcnRpY2lwYXRpb24nIH1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGlucHV0OiB7XG4gICAgICAgICAgICBiZWF1dHlTY29yZTogMTUsIHBlcnNvbmFsaXR5U2NvcmU6IDIwLCBiYWxhbmNlUHJvcG9ydGlvblNjb3JlOiAxNSxcbiAgICAgICAgICAgIGNvYXRDbGVhbkdyb29tZWQ6IHRydWUsIHRlZXRoR3Vtc0hlYWx0aHk6IHRydWUsIGV5ZXNOb3NlQ2xlYXI6IHRydWUsXG4gICAgICAgICAgICBlYXJzQ2xlYW5NaXRlRnJlZTogZmFsc2UsIHRvZW5haWxzQ2xpcHBlZDogdHJ1ZSwgZmxlYUlzc3VlczogZmFsc2VcbiAgICAgICAgICB9LFxuICAgICAgICAgIGV4cGVjdGVkOiB7IHRvdGFsU2NvcmU6IDUwLCByaWJib25FbGlnaWJpbGl0eTogJ1JlZCcgfSAvLyBIZWFsdGggZmFpbHVyZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgaW5wdXQ6IHtcbiAgICAgICAgICAgIGJlYXV0eVNjb3JlOiAxNSwgcGVyc29uYWxpdHlTY29yZTogMjAsIGJhbGFuY2VQcm9wb3J0aW9uU2NvcmU6IDE1LFxuICAgICAgICAgICAgY29hdENsZWFuR3Jvb21lZDogdHJ1ZSwgdGVldGhHdW1zSGVhbHRoeTogdHJ1ZSwgZXllc05vc2VDbGVhcjogdHJ1ZSxcbiAgICAgICAgICAgIGVhcnNDbGVhbk1pdGVGcmVlOiB0cnVlLCB0b2VuYWlsc0NsaXBwZWQ6IHRydWUsIGZsZWFJc3N1ZXM6IHRydWVcbiAgICAgICAgICB9LFxuICAgICAgICAgIGV4cGVjdGVkOiB7IHRvdGFsU2NvcmU6IDUwLCByaWJib25FbGlnaWJpbGl0eTogJ1JlZCcgfSAvLyBGbGVhIGlzc3Vlc1xuICAgICAgICB9XG4gICAgICBdO1xuXG4gICAgICBjb25zdCBqdWRnZUNvbnRleHQgPSB7XG4gICAgICAgIGlkZW50aXR5OiB7IHN1YjogJ2p1ZGdlLTEnLCB1c2VybmFtZTogJ2p1ZGdlQGV4YW1wbGUuY29tJyB9XG4gICAgICB9O1xuXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRlc3RDYXNlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCB0ZXN0Q2FzZSA9IHRlc3RDYXNlc1tpXTtcbiAgICAgICAgY29uc3QgaW5wdXQgPSB7IGNhdElkOiBgY2F0LSR7aSArIDF9YCwgLi4udGVzdENhc2UuaW5wdXQgfTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNyZWF0ZUNsYXNzU2NvcmUoaW5wdXQsIGp1ZGdlQ29udGV4dCk7XG4gICAgICAgIFxuICAgICAgICBleHBlY3QocmVzdWx0LnRvdGFsU2NvcmUpLnRvQmUodGVzdENhc2UuZXhwZWN0ZWQudG90YWxTY29yZSk7XG4gICAgICAgIGV4cGVjdChyZXN1bHQucmliYm9uRWxpZ2liaWxpdHkpLnRvQmUodGVzdENhc2UuZXhwZWN0ZWQucmliYm9uRWxpZ2liaWxpdHkpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaXQoJ3ZhbGlkYXRlcyBjb21tZW50IGxlbmd0aCBsaW1pdHMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBsb25nQ29tbWVudCA9ICd4Jy5yZXBlYXQoNTAxKTsgLy8gT3ZlciA1MDAgY2hhcmFjdGVyIGxpbWl0XG4gICAgICBjb25zdCB2ZXJ5TG9uZ0hlYWx0aENvbW1lbnQgPSAneCcucmVwZWF0KDEwMDEpOyAvLyBPdmVyIDEwMDAgY2hhcmFjdGVyIGxpbWl0XG5cbiAgICAgIGNvbnN0IGludmFsaWRJbnB1dHMgPSBbXG4gICAgICAgIHtcbiAgICAgICAgICBjYXRJZDogJ2NhdC0xJyxcbiAgICAgICAgICBiZWF1dHlTY29yZTogMTIsXG4gICAgICAgICAgYmVhdXR5Q29tbWVudHM6IGxvbmdDb21tZW50LFxuICAgICAgICAgIHBlcnNvbmFsaXR5U2NvcmU6IDE4LFxuICAgICAgICAgIGJhbGFuY2VQcm9wb3J0aW9uU2NvcmU6IDEzLFxuICAgICAgICAgIGNvYXRDbGVhbkdyb29tZWQ6IHRydWUsXG4gICAgICAgICAgdGVldGhHdW1zSGVhbHRoeTogdHJ1ZSxcbiAgICAgICAgICBleWVzTm9zZUNsZWFyOiB0cnVlLFxuICAgICAgICAgIGVhcnNDbGVhbk1pdGVGcmVlOiB0cnVlLFxuICAgICAgICAgIHRvZW5haWxzQ2xpcHBlZDogdHJ1ZSxcbiAgICAgICAgICBmbGVhSXNzdWVzOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgY2F0SWQ6ICdjYXQtMScsXG4gICAgICAgICAgYmVhdXR5U2NvcmU6IDEyLFxuICAgICAgICAgIHBlcnNvbmFsaXR5U2NvcmU6IDE4LFxuICAgICAgICAgIHBlcnNvbmFsaXR5Q29tbWVudHM6IGxvbmdDb21tZW50LFxuICAgICAgICAgIGJhbGFuY2VQcm9wb3J0aW9uU2NvcmU6IDEzLFxuICAgICAgICAgIGNvYXRDbGVhbkdyb29tZWQ6IHRydWUsXG4gICAgICAgICAgdGVldGhHdW1zSGVhbHRoeTogdHJ1ZSxcbiAgICAgICAgICBleWVzTm9zZUNsZWFyOiB0cnVlLFxuICAgICAgICAgIGVhcnNDbGVhbk1pdGVGcmVlOiB0cnVlLFxuICAgICAgICAgIHRvZW5haWxzQ2xpcHBlZDogdHJ1ZSxcbiAgICAgICAgICBmbGVhSXNzdWVzOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgY2F0SWQ6ICdjYXQtMScsXG4gICAgICAgICAgYmVhdXR5U2NvcmU6IDEyLFxuICAgICAgICAgIHBlcnNvbmFsaXR5U2NvcmU6IDE4LFxuICAgICAgICAgIGJhbGFuY2VQcm9wb3J0aW9uU2NvcmU6IDEzLFxuICAgICAgICAgIGhlYWx0aEdyb29taW5nQ29tbWVudHM6IHZlcnlMb25nSGVhbHRoQ29tbWVudCxcbiAgICAgICAgICBjb2F0Q2xlYW5Hcm9vbWVkOiB0cnVlLFxuICAgICAgICAgIHRlZXRoR3Vtc0hlYWx0aHk6IHRydWUsXG4gICAgICAgICAgZXllc05vc2VDbGVhcjogdHJ1ZSxcbiAgICAgICAgICBlYXJzQ2xlYW5NaXRlRnJlZTogdHJ1ZSxcbiAgICAgICAgICB0b2VuYWlsc0NsaXBwZWQ6IHRydWUsXG4gICAgICAgICAgZmxlYUlzc3VlczogZmFsc2VcbiAgICAgICAgfVxuICAgICAgXTtcblxuICAgICAgY29uc3QganVkZ2VDb250ZXh0ID0ge1xuICAgICAgICBpZGVudGl0eTogeyBzdWI6ICdqdWRnZS0xJywgdXNlcm5hbWU6ICdqdWRnZUBleGFtcGxlLmNvbScgfVxuICAgICAgfTtcblxuICAgICAgZm9yIChjb25zdCBpbnZhbGlkSW5wdXQgb2YgaW52YWxpZElucHV0cykge1xuICAgICAgICBhd2FpdCBleHBlY3QoY3JlYXRlQ2xhc3NTY29yZShpbnZhbGlkSW5wdXQsIGp1ZGdlQ29udGV4dCkpXG4gICAgICAgICAgLnJlamVjdHMudG9UaHJvdygvY29tbWVudC4qdG9vIGxvbmcvKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ1JlcG9ydCBHZW5lcmF0aW9uIGFuZCBFeHBvcnQnLCAoKSA9PiB7XG4gICAgaXQoJ2dlbmVyYXRlcyBjb21wcmVoZW5zaXZlIHR5cGUgY2xhc3Mgc2NvcmluZyByZXBvcnRzIHdpdGggc29ydGluZycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IG1vY2tDbGFzc1Njb3JlcyA9IFtcbiAgICAgICAge1xuICAgICAgICAgIGlkOiAnY2xhc3Mtc2NvcmUtMScsXG4gICAgICAgICAgY2F0SWQ6ICdjYXQtMScsXG4gICAgICAgICAganVkZ2VJZDogJ2p1ZGdlLTEnLFxuICAgICAgICAgIGp1ZGdlTmFtZTogJ0p1ZGdlIFNtaXRoJyxcbiAgICAgICAgICB0b3RhbFNjb3JlOiA0NyxcbiAgICAgICAgICByaWJib25FbGlnaWJpbGl0eTogJ0JsdWUnLFxuICAgICAgICAgIHRpbWVzdGFtcDogJzIwMjQtMDEtMTVUMTA6MDA6MDBaJyxcbiAgICAgICAgICBpc0ZpbmFsaXplZDogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgaWQ6ICdjbGFzcy1zY29yZS0yJyxcbiAgICAgICAgICBjYXRJZDogJ2NhdC0yJyxcbiAgICAgICAgICBqdWRnZUlkOiAnanVkZ2UtMicsXG4gICAgICAgICAganVkZ2VOYW1lOiAnSnVkZ2UgSm9obnNvbicsXG4gICAgICAgICAgdG90YWxTY29yZTogMzgsXG4gICAgICAgICAgcmliYm9uRWxpZ2liaWxpdHk6ICdSZWQnLFxuICAgICAgICAgIHRpbWVzdGFtcDogJzIwMjQtMDEtMTVUMTE6MDA6MDBaJyxcbiAgICAgICAgICBpc0ZpbmFsaXplZDogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgaWQ6ICdjbGFzcy1zY29yZS0zJyxcbiAgICAgICAgICBjYXRJZDogJ2NhdC0zJyxcbiAgICAgICAgICBqdWRnZUlkOiAnanVkZ2UtMScsXG4gICAgICAgICAganVkZ2VOYW1lOiAnSnVkZ2UgU21pdGgnLFxuICAgICAgICAgIHRvdGFsU2NvcmU6IDMxLFxuICAgICAgICAgIHJpYmJvbkVsaWdpYmlsaXR5OiAnV2hpdGUnLFxuICAgICAgICAgIHRpbWVzdGFtcDogJzIwMjQtMDEtMTVUMTI6MDA6MDBaJyxcbiAgICAgICAgICBpc0ZpbmFsaXplZDogZmFsc2VcbiAgICAgICAgfVxuICAgICAgXTtcblxuICAgICAgZGRiTW9jay5vbihTY2FuQ29tbWFuZCkucmVzb2x2ZXMoe1xuICAgICAgICBJdGVtczogbW9ja0NsYXNzU2NvcmVzXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgYWxsU2NvcmVzID0gYXdhaXQgbGlzdEFsbENsYXNzU2NvcmVzKCk7XG5cbiAgICAgIGV4cGVjdChhbGxTY29yZXMuaXRlbXMpLnRvSGF2ZUxlbmd0aCgzKTtcbiAgICAgIFxuICAgICAgLy8gVmVyaWZ5IHNjb3JlcyBhcmUgc29ydGVkIGJ5IHRvdGFsIHNjb3JlIChkZXNjZW5kaW5nKVxuICAgICAgY29uc3Qgc29ydGVkU2NvcmVzID0gYWxsU2NvcmVzLml0ZW1zLnNvcnQoKGEsIGIpID0+IGIudG90YWxTY29yZSAtIGEudG90YWxTY29yZSk7XG4gICAgICBleHBlY3Qoc29ydGVkU2NvcmVzWzBdLnRvdGFsU2NvcmUpLnRvQmUoNDcpO1xuICAgICAgZXhwZWN0KHNvcnRlZFNjb3Jlc1sxXS50b3RhbFNjb3JlKS50b0JlKDM4KTtcbiAgICAgIGV4cGVjdChzb3J0ZWRTY29yZXNbMl0udG90YWxTY29yZSkudG9CZSgzMSk7XG5cbiAgICAgIC8vIFZlcmlmeSByaWJib24gZGlzdHJpYnV0aW9uXG4gICAgICBjb25zdCByaWJib25Db3VudHMgPSBhbGxTY29yZXMuaXRlbXMucmVkdWNlKChjb3VudHMsIHNjb3JlKSA9PiB7XG4gICAgICAgIGNvdW50c1tzY29yZS5yaWJib25FbGlnaWJpbGl0eV0gPSAoY291bnRzW3Njb3JlLnJpYmJvbkVsaWdpYmlsaXR5XSB8fCAwKSArIDE7XG4gICAgICAgIHJldHVybiBjb3VudHM7XG4gICAgICB9LCB7fSBhcyBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+KTtcblxuICAgICAgZXhwZWN0KHJpYmJvbkNvdW50cykudG9FcXVhbCh7XG4gICAgICAgICdCbHVlJzogMSxcbiAgICAgICAgJ1JlZCc6IDEsXG4gICAgICAgICdXaGl0ZSc6IDFcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgaXQoJ2ZpbHRlcnMgY2xhc3Mgc2NvcmVzIGJ5IGp1ZGdlJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QganVkZ2UxU2NvcmVzID0gW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6ICdjbGFzcy1zY29yZS0xJyxcbiAgICAgICAgICBjYXRJZDogJ2NhdC0xJyxcbiAgICAgICAgICBqdWRnZUlkOiAnanVkZ2UtMScsXG4gICAgICAgICAganVkZ2VOYW1lOiAnSnVkZ2UgU21pdGgnLFxuICAgICAgICAgIHRvdGFsU2NvcmU6IDQ3LFxuICAgICAgICAgIHJpYmJvbkVsaWdpYmlsaXR5OiAnQmx1ZSdcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGlkOiAnY2xhc3Mtc2NvcmUtMycsXG4gICAgICAgICAgY2F0SWQ6ICdjYXQtMycsXG4gICAgICAgICAganVkZ2VJZDogJ2p1ZGdlLTEnLFxuICAgICAgICAgIGp1ZGdlTmFtZTogJ0p1ZGdlIFNtaXRoJyxcbiAgICAgICAgICB0b3RhbFNjb3JlOiAzMSxcbiAgICAgICAgICByaWJib25FbGlnaWJpbGl0eTogJ1doaXRlJ1xuICAgICAgICB9XG4gICAgICBdO1xuXG4gICAgICBkZGJNb2NrLm9uKFF1ZXJ5Q29tbWFuZCkucmVzb2x2ZXMoe1xuICAgICAgICBJdGVtczoganVkZ2UxU2NvcmVzXG4gICAgICB9KTtcblxuICAgICAgLy8gVGhpcyB3b3VsZCBiZSBpbXBsZW1lbnRlZCBpbiBhIGdldENsYXNzU2NvcmVzQnlKdWRnZSBmdW5jdGlvblxuICAgICAgY29uc3QganVkZ2VTY29yZXMgPSBhd2FpdCBnZXRDbGFzc1Njb3Jlc0J5Q2F0KCdqdWRnZS0xJyk7IC8vIE1vY2sgaW1wbGVtZW50YXRpb25cbiAgICAgIFxuICAgICAgZXhwZWN0KGp1ZGdlU2NvcmVzLml0ZW1zKS50b0hhdmVMZW5ndGgoMik7XG4gICAgICBleHBlY3QoanVkZ2VTY29yZXMuaXRlbXMuZXZlcnkoc2NvcmUgPT4gc2NvcmUuanVkZ2VJZCA9PT0gJ2p1ZGdlLTEnKSkudG9CZSh0cnVlKTtcbiAgICB9KTtcblxuICAgIGl0KCdnZW5lcmF0ZXMgQ1NWIGV4cG9ydCBkYXRhIHdpdGggYWxsIHR5cGUgY2xhc3Mgc2NvcmluZyBmaWVsZHMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBkZXRhaWxlZFNjb3JlID0ge1xuICAgICAgICBpZDogJ2NsYXNzLXNjb3JlLTEnLFxuICAgICAgICBjYXRJZDogJ2NhdC0xJyxcbiAgICAgICAganVkZ2VJZDogJ2p1ZGdlLTEnLFxuICAgICAgICBqdWRnZU5hbWU6ICdKdWRnZSBTbWl0aCcsXG4gICAgICAgIGJlYXV0eVNjb3JlOiAxNCxcbiAgICAgICAgYmVhdXR5Q29tbWVudHM6ICdFeGNlbGxlbnQgY29hdCBxdWFsaXR5JyxcbiAgICAgICAgcGVyc29uYWxpdHlTY29yZTogMTksXG4gICAgICAgIHBlcnNvbmFsaXR5Q29tbWVudHM6ICdWZXJ5IGZyaWVuZGx5IHRlbXBlcmFtZW50JyxcbiAgICAgICAgYmFsYW5jZVByb3BvcnRpb25TY29yZTogMTMsXG4gICAgICAgIGJhbGFuY2VQcm9wb3J0aW9uQ29tbWVudHM6ICdHb29kIGJvZHkgc3RydWN0dXJlJyxcbiAgICAgICAgY29hdENsZWFuR3Jvb21lZDogdHJ1ZSxcbiAgICAgICAgdGVldGhHdW1zSGVhbHRoeTogdHJ1ZSxcbiAgICAgICAgZXllc05vc2VDbGVhcjogdHJ1ZSxcbiAgICAgICAgZWFyc0NsZWFuTWl0ZUZyZWU6IGZhbHNlLFxuICAgICAgICB0b2VuYWlsc0NsaXBwZWQ6IHRydWUsXG4gICAgICAgIGZsZWFJc3N1ZXM6IGZhbHNlLFxuICAgICAgICBoZWFsdGhHcm9vbWluZ0NvbW1lbnRzOiAnTWlub3IgZWFyIHdheCBidWlsZHVwJyxcbiAgICAgICAgdG90YWxTY29yZTogNDYsXG4gICAgICAgIHJpYmJvbkVsaWdpYmlsaXR5OiAnUmVkJyxcbiAgICAgICAgdGltZXN0YW1wOiAnMjAyNC0wMS0xNVQxMDowMDowMFonLFxuICAgICAgICBpc0ZpbmFsaXplZDogdHJ1ZVxuICAgICAgfTtcblxuICAgICAgZGRiTW9jay5vbihTY2FuQ29tbWFuZCkucmVzb2x2ZXMoe1xuICAgICAgICBJdGVtczogW2RldGFpbGVkU2NvcmVdXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgYWxsU2NvcmVzID0gYXdhaXQgbGlzdEFsbENsYXNzU2NvcmVzKCk7XG4gICAgICBcbiAgICAgIC8vIFZlcmlmeSBhbGwgZmllbGRzIGFyZSBwcmVzZW50IGZvciBDU1YgZXhwb3J0XG4gICAgICBjb25zdCBjc3ZEYXRhID0gYWxsU2NvcmVzLml0ZW1zLm1hcChzY29yZSA9PiAoe1xuICAgICAgICAnQ2F0IElEJzogc2NvcmUuY2F0SWQsXG4gICAgICAgICdKdWRnZSc6IHNjb3JlLmp1ZGdlTmFtZSxcbiAgICAgICAgJ0JlYXV0eSBTY29yZSc6IHNjb3JlLmJlYXV0eVNjb3JlLFxuICAgICAgICAnQmVhdXR5IENvbW1lbnRzJzogc2NvcmUuYmVhdXR5Q29tbWVudHMsXG4gICAgICAgICdQZXJzb25hbGl0eSBTY29yZSc6IHNjb3JlLnBlcnNvbmFsaXR5U2NvcmUsXG4gICAgICAgICdQZXJzb25hbGl0eSBDb21tZW50cyc6IHNjb3JlLnBlcnNvbmFsaXR5Q29tbWVudHMsXG4gICAgICAgICdCYWxhbmNlL1Byb3BvcnRpb24gU2NvcmUnOiBzY29yZS5iYWxhbmNlUHJvcG9ydGlvblNjb3JlLFxuICAgICAgICAnQmFsYW5jZS9Qcm9wb3J0aW9uIENvbW1lbnRzJzogc2NvcmUuYmFsYW5jZVByb3BvcnRpb25Db21tZW50cyxcbiAgICAgICAgJ0NvYXQgQ2xlYW4vR3Jvb21lZCc6IHNjb3JlLmNvYXRDbGVhbkdyb29tZWQgPyAnUGFzcycgOiAnRmFpbCcsXG4gICAgICAgICdUZWV0aC9HdW1zIEhlYWx0aHknOiBzY29yZS50ZWV0aEd1bXNIZWFsdGh5ID8gJ1Bhc3MnIDogJ0ZhaWwnLFxuICAgICAgICAnRXllcy9Ob3NlIENsZWFyJzogc2NvcmUuZXllc05vc2VDbGVhciA/ICdQYXNzJyA6ICdGYWlsJyxcbiAgICAgICAgJ0VhcnMgQ2xlYW4vTWl0ZSBGcmVlJzogc2NvcmUuZWFyc0NsZWFuTWl0ZUZyZWUgPyAnUGFzcycgOiAnRmFpbCcsXG4gICAgICAgICdUb2VuYWlscyBDbGlwcGVkJzogc2NvcmUudG9lbmFpbHNDbGlwcGVkID8gJ1Bhc3MnIDogJ0ZhaWwnLFxuICAgICAgICAnRmxlYSBJc3N1ZXMnOiBzY29yZS5mbGVhSXNzdWVzID8gJ1llcycgOiAnTm8nLFxuICAgICAgICAnSGVhbHRoL0dyb29taW5nIENvbW1lbnRzJzogc2NvcmUuaGVhbHRoR3Jvb21pbmdDb21tZW50cyxcbiAgICAgICAgJ1RvdGFsIFNjb3JlJzogc2NvcmUudG90YWxTY29yZSxcbiAgICAgICAgJ1JpYmJvbiBFbGlnaWJpbGl0eSc6IHNjb3JlLnJpYmJvbkVsaWdpYmlsaXR5LFxuICAgICAgICAnRmluYWxpemVkJzogc2NvcmUuaXNGaW5hbGl6ZWQgPyAnWWVzJyA6ICdObycsXG4gICAgICAgICdUaW1lc3RhbXAnOiBzY29yZS50aW1lc3RhbXBcbiAgICAgIH0pKTtcblxuICAgICAgZXhwZWN0KGNzdkRhdGFbMF0pLnRvTWF0Y2hPYmplY3Qoe1xuICAgICAgICAnQ2F0IElEJzogJ2NhdC0xJyxcbiAgICAgICAgJ0p1ZGdlJzogJ0p1ZGdlIFNtaXRoJyxcbiAgICAgICAgJ0JlYXV0eSBTY29yZSc6IDE0LFxuICAgICAgICAnQmVhdXR5IENvbW1lbnRzJzogJ0V4Y2VsbGVudCBjb2F0IHF1YWxpdHknLFxuICAgICAgICAnUGVyc29uYWxpdHkgU2NvcmUnOiAxOSxcbiAgICAgICAgJ1BlcnNvbmFsaXR5IENvbW1lbnRzJzogJ1ZlcnkgZnJpZW5kbHkgdGVtcGVyYW1lbnQnLFxuICAgICAgICAnQmFsYW5jZS9Qcm9wb3J0aW9uIFNjb3JlJzogMTMsXG4gICAgICAgICdCYWxhbmNlL1Byb3BvcnRpb24gQ29tbWVudHMnOiAnR29vZCBib2R5IHN0cnVjdHVyZScsXG4gICAgICAgICdDb2F0IENsZWFuL0dyb29tZWQnOiAnUGFzcycsXG4gICAgICAgICdUZWV0aC9HdW1zIEhlYWx0aHknOiAnUGFzcycsXG4gICAgICAgICdFeWVzL05vc2UgQ2xlYXInOiAnUGFzcycsXG4gICAgICAgICdFYXJzIENsZWFuL01pdGUgRnJlZSc6ICdGYWlsJyxcbiAgICAgICAgJ1RvZW5haWxzIENsaXBwZWQnOiAnUGFzcycsXG4gICAgICAgICdGbGVhIElzc3Vlcyc6ICdObycsXG4gICAgICAgICdIZWFsdGgvR3Jvb21pbmcgQ29tbWVudHMnOiAnTWlub3IgZWFyIHdheCBidWlsZHVwJyxcbiAgICAgICAgJ1RvdGFsIFNjb3JlJzogNDYsXG4gICAgICAgICdSaWJib24gRWxpZ2liaWxpdHknOiAnUmVkJyxcbiAgICAgICAgJ0ZpbmFsaXplZCc6ICdZZXMnXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ1JvbGUtQmFzZWQgQWNjZXNzIENvbnRyb2wnLCAoKSA9PiB7XG4gICAgaXQoJ2VuZm9yY2VzIGp1ZGdlIHJvbGUgZm9yIHR5cGUgY2xhc3Mgc2NvcmluZyBvcGVyYXRpb25zJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgcGFydGljaXBhbnRDb250ZXh0ID0ge1xuICAgICAgICBpZGVudGl0eToge1xuICAgICAgICAgIHN1YjogJ3BhcnRpY2lwYW50LTEnLFxuICAgICAgICAgIHVzZXJuYW1lOiAncGFydGljaXBhbnRAZXhhbXBsZS5jb20nXG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGNsYXNzU2NvcmVJbnB1dCA9IHtcbiAgICAgICAgY2F0SWQ6ICdjYXQtMScsXG4gICAgICAgIGJlYXV0eVNjb3JlOiAxMixcbiAgICAgICAgcGVyc29uYWxpdHlTY29yZTogMTgsXG4gICAgICAgIGJhbGFuY2VQcm9wb3J0aW9uU2NvcmU6IDEzLFxuICAgICAgICBjb2F0Q2xlYW5Hcm9vbWVkOiB0cnVlLFxuICAgICAgICB0ZWV0aEd1bXNIZWFsdGh5OiB0cnVlLFxuICAgICAgICBleWVzTm9zZUNsZWFyOiB0cnVlLFxuICAgICAgICBlYXJzQ2xlYW5NaXRlRnJlZTogdHJ1ZSxcbiAgICAgICAgdG9lbmFpbHNDbGlwcGVkOiB0cnVlLFxuICAgICAgICBmbGVhSXNzdWVzOiBmYWxzZVxuICAgICAgfTtcblxuICAgICAgLy8gU2hvdWxkIHJlamVjdCBub24tanVkZ2UgdXNlcnNcbiAgICAgIGF3YWl0IGV4cGVjdChjcmVhdGVDbGFzc1Njb3JlKGNsYXNzU2NvcmVJbnB1dCwgcGFydGljaXBhbnRDb250ZXh0KSlcbiAgICAgICAgLnJlamVjdHMudG9UaHJvdygnVW5hdXRob3JpemVkOiBKdWRnZSByb2xlIHJlcXVpcmVkJyk7XG4gICAgfSk7XG5cbiAgICBpdCgnYWxsb3dzIGFkbWluIGFjY2VzcyB0byBhbGwgdHlwZSBjbGFzcyBzY29yaW5nIG9wZXJhdGlvbnMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBhZG1pbkNvbnRleHQgPSB7XG4gICAgICAgIGlkZW50aXR5OiB7XG4gICAgICAgICAgc3ViOiAnYWRtaW4tMScsXG4gICAgICAgICAgdXNlcm5hbWU6ICdhZG1pbkBleGFtcGxlLmNvbSdcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgZGRiTW9jay5vbihRdWVyeUNvbW1hbmQpLnJlc29sdmVzKHsgSXRlbXM6IFtdIH0pO1xuICAgICAgZGRiTW9jay5vbihQdXRDb21tYW5kKS5yZXNvbHZlcyh7fSk7XG5cbiAgICAgIGNvbnN0IGNsYXNzU2NvcmVJbnB1dCA9IHtcbiAgICAgICAgY2F0SWQ6ICdjYXQtMScsXG4gICAgICAgIGJlYXV0eVNjb3JlOiAxMixcbiAgICAgICAgcGVyc29uYWxpdHlTY29yZTogMTgsXG4gICAgICAgIGJhbGFuY2VQcm9wb3J0aW9uU2NvcmU6IDEzLFxuICAgICAgICBjb2F0Q2xlYW5Hcm9vbWVkOiB0cnVlLFxuICAgICAgICB0ZWV0aEd1bXNIZWFsdGh5OiB0cnVlLFxuICAgICAgICBleWVzTm9zZUNsZWFyOiB0cnVlLFxuICAgICAgICBlYXJzQ2xlYW5NaXRlRnJlZTogdHJ1ZSxcbiAgICAgICAgdG9lbmFpbHNDbGlwcGVkOiB0cnVlLFxuICAgICAgICBmbGVhSXNzdWVzOiBmYWxzZVxuICAgICAgfTtcblxuICAgICAgLy8gQWRtaW4gc2hvdWxkIGJlIGFibGUgdG8gY3JlYXRlIGNsYXNzIHNjb3Jlc1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY3JlYXRlQ2xhc3NTY29yZShjbGFzc1Njb3JlSW5wdXQsIGFkbWluQ29udGV4dCk7XG4gICAgICBleHBlY3QocmVzdWx0KS50b0JlRGVmaW5lZCgpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5qdWRnZUlkKS50b0JlKCdhZG1pbi0xJyk7XG4gICAgfSk7XG5cbiAgICBpdCgncmVzdHJpY3RzIGp1ZGdlIGFjY2VzcyB0byBvd24gY2xhc3Mgc2NvcmVzIG9ubHknLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBqdWRnZTFDb250ZXh0ID0ge1xuICAgICAgICBpZGVudGl0eTogeyBzdWI6ICdqdWRnZS0xJywgdXNlcm5hbWU6ICdqdWRnZUBleGFtcGxlLmNvbScgfVxuICAgICAgfTtcblxuICAgICAgY29uc3QganVkZ2UyU2NvcmUgPSB7XG4gICAgICAgIGlkOiAnY2xhc3Mtc2NvcmUtMicsXG4gICAgICAgIGNhdElkOiAnY2F0LTEnLFxuICAgICAgICBqdWRnZUlkOiAnanVkZ2UtMicsXG4gICAgICAgIGp1ZGdlTmFtZTogJ0p1ZGdlIEpvaG5zb24nLFxuICAgICAgICB0b3RhbFNjb3JlOiA0MCxcbiAgICAgICAgaXNGaW5hbGl6ZWQ6IHRydWVcbiAgICAgIH07XG5cbiAgICAgIGRkYk1vY2sub24oUXVlcnlDb21tYW5kKS5yZXNvbHZlcyh7XG4gICAgICAgIEl0ZW1zOiBbanVkZ2UyU2NvcmVdXG4gICAgICB9KTtcblxuICAgICAgLy8gSnVkZ2UtMSBzaG91bGQgbm90IGJlIGFibGUgdG8gdXBkYXRlIEp1ZGdlLTIncyBzY29yZVxuICAgICAgYXdhaXQgZXhwZWN0KHVwZGF0ZUNsYXNzU2NvcmUoJ2NsYXNzLXNjb3JlLTInLCB7IGJlYXV0eVNjb3JlOiAxNSB9LCBqdWRnZTFDb250ZXh0KSlcbiAgICAgICAgLnJlamVjdHMudG9UaHJvdygnVW5hdXRob3JpemVkOiBDYW4gb25seSBtb2RpZnkgb3duIGNsYXNzIHNjb3JlcycpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnRXJyb3IgSGFuZGxpbmcgYW5kIEVkZ2UgQ2FzZXMnLCAoKSA9PiB7XG4gICAgaXQoJ2hhbmRsZXMgRHluYW1vREIgZXJyb3JzIGdyYWNlZnVsbHknLCBhc3luYyAoKSA9PiB7XG4gICAgICBkZGJNb2NrLm9uKFB1dENvbW1hbmQpLnJlamVjdHMobmV3IEVycm9yKCdEeW5hbW9EQiBzZXJ2aWNlIHVuYXZhaWxhYmxlJykpO1xuXG4gICAgICBjb25zdCBjbGFzc1Njb3JlSW5wdXQgPSB7XG4gICAgICAgIGNhdElkOiAnY2F0LTEnLFxuICAgICAgICBiZWF1dHlTY29yZTogMTIsXG4gICAgICAgIHBlcnNvbmFsaXR5U2NvcmU6IDE4LFxuICAgICAgICBiYWxhbmNlUHJvcG9ydGlvblNjb3JlOiAxMyxcbiAgICAgICAgY29hdENsZWFuR3Jvb21lZDogdHJ1ZSxcbiAgICAgICAgdGVldGhHdW1zSGVhbHRoeTogdHJ1ZSxcbiAgICAgICAgZXllc05vc2VDbGVhcjogdHJ1ZSxcbiAgICAgICAgZWFyc0NsZWFuTWl0ZUZyZWU6IHRydWUsXG4gICAgICAgIHRvZW5haWxzQ2xpcHBlZDogdHJ1ZSxcbiAgICAgICAgZmxlYUlzc3VlczogZmFsc2VcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGp1ZGdlQ29udGV4dCA9IHtcbiAgICAgICAgaWRlbnRpdHk6IHsgc3ViOiAnanVkZ2UtMScsIHVzZXJuYW1lOiAnanVkZ2VAZXhhbXBsZS5jb20nIH1cbiAgICAgIH07XG5cbiAgICAgIGF3YWl0IGV4cGVjdChjcmVhdGVDbGFzc1Njb3JlKGNsYXNzU2NvcmVJbnB1dCwganVkZ2VDb250ZXh0KSlcbiAgICAgICAgLnJlamVjdHMudG9UaHJvdygnRmFpbGVkIHRvIGNyZWF0ZSBjbGFzcyBzY29yZTogRHluYW1vREIgc2VydmljZSB1bmF2YWlsYWJsZScpO1xuICAgIH0pO1xuXG4gICAgaXQoJ2hhbmRsZXMgbWlzc2luZyBjYXQgc2NlbmFyaW9zJywgYXN5bmMgKCkgPT4ge1xuICAgICAgZGRiTW9jay5vbihRdWVyeUNvbW1hbmQpLnJlc29sdmVzKHsgSXRlbXM6IFtdIH0pO1xuXG4gICAgICBjb25zdCBjbGFzc1Njb3JlSW5wdXQgPSB7XG4gICAgICAgIGNhdElkOiAnbm9uZXhpc3RlbnQtY2F0JyxcbiAgICAgICAgYmVhdXR5U2NvcmU6IDEyLFxuICAgICAgICBwZXJzb25hbGl0eVNjb3JlOiAxOCxcbiAgICAgICAgYmFsYW5jZVByb3BvcnRpb25TY29yZTogMTMsXG4gICAgICAgIGNvYXRDbGVhbkdyb29tZWQ6IHRydWUsXG4gICAgICAgIHRlZXRoR3Vtc0hlYWx0aHk6IHRydWUsXG4gICAgICAgIGV5ZXNOb3NlQ2xlYXI6IHRydWUsXG4gICAgICAgIGVhcnNDbGVhbk1pdGVGcmVlOiB0cnVlLFxuICAgICAgICB0b2VuYWlsc0NsaXBwZWQ6IHRydWUsXG4gICAgICAgIGZsZWFJc3N1ZXM6IGZhbHNlXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBqdWRnZUNvbnRleHQgPSB7XG4gICAgICAgIGlkZW50aXR5OiB7IHN1YjogJ2p1ZGdlLTEnLCB1c2VybmFtZTogJ2p1ZGdlQGV4YW1wbGUuY29tJyB9XG4gICAgICB9O1xuXG4gICAgICAvLyBTaG91bGQgdmFsaWRhdGUgY2F0IGV4aXN0cyBiZWZvcmUgY3JlYXRpbmcgc2NvcmVcbiAgICAgIGF3YWl0IGV4cGVjdChjcmVhdGVDbGFzc1Njb3JlKGNsYXNzU2NvcmVJbnB1dCwganVkZ2VDb250ZXh0KSlcbiAgICAgICAgLnJlamVjdHMudG9UaHJvdygnQ2F0IG5vdCBmb3VuZDogbm9uZXhpc3RlbnQtY2F0Jyk7XG4gICAgfSk7XG5cbiAgICBpdCgnaGFuZGxlcyBjb25jdXJyZW50IG1vZGlmaWNhdGlvbiBjb25mbGljdHMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBleGlzdGluZ1Njb3JlID0ge1xuICAgICAgICBpZDogJ2NsYXNzLXNjb3JlLTEnLFxuICAgICAgICBjYXRJZDogJ2NhdC0xJyxcbiAgICAgICAganVkZ2VJZDogJ2p1ZGdlLTEnLFxuICAgICAgICB0b3RhbFNjb3JlOiA0MyxcbiAgICAgICAgdGltZXN0YW1wOiAnMjAyNC0wMS0xNVQxMDowMDowMFonLFxuICAgICAgICB2ZXJzaW9uOiAxXG4gICAgICB9O1xuXG4gICAgICBkZGJNb2NrLm9uKFF1ZXJ5Q29tbWFuZCkucmVzb2x2ZXMoe1xuICAgICAgICBJdGVtczogW2V4aXN0aW5nU2NvcmVdXG4gICAgICB9KTtcblxuICAgICAgLy8gTW9jayBjb25kaXRpb25hbCBjaGVjayBmYWlsdXJlICh2ZXJzaW9uIG1pc21hdGNoKVxuICAgICAgZGRiTW9jay5vbihQdXRDb21tYW5kKS5yZWplY3RzKHtcbiAgICAgICAgbmFtZTogJ0NvbmRpdGlvbmFsQ2hlY2tGYWlsZWRFeGNlcHRpb24nLFxuICAgICAgICBtZXNzYWdlOiAnVGhlIGNvbmRpdGlvbmFsIHJlcXVlc3QgZmFpbGVkJ1xuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IGp1ZGdlQ29udGV4dCA9IHtcbiAgICAgICAgaWRlbnRpdHk6IHsgc3ViOiAnanVkZ2UtMScsIHVzZXJuYW1lOiAnanVkZ2VAZXhhbXBsZS5jb20nIH1cbiAgICAgIH07XG5cbiAgICAgIGF3YWl0IGV4cGVjdCh1cGRhdGVDbGFzc1Njb3JlKCdjbGFzcy1zY29yZS0xJywgeyBiZWF1dHlTY29yZTogMTUgfSwganVkZ2VDb250ZXh0KSlcbiAgICAgICAgLnJlamVjdHMudG9UaHJvdygnQ2xhc3Mgc2NvcmUgd2FzIG1vZGlmaWVkIGJ5IGFub3RoZXIgdXNlci4gUGxlYXNlIHJlZnJlc2ggYW5kIHRyeSBhZ2Fpbi4nKTtcbiAgICB9KTtcblxuICAgIGl0KCdoYW5kbGVzIHNjb3JlIGZpbmFsaXphdGlvbiBjb25mbGljdHMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBmaW5hbGl6ZWRTY29yZSA9IHtcbiAgICAgICAgaWQ6ICdjbGFzcy1zY29yZS0xJyxcbiAgICAgICAgY2F0SWQ6ICdjYXQtMScsXG4gICAgICAgIGp1ZGdlSWQ6ICdqdWRnZS0xJyxcbiAgICAgICAgdG90YWxTY29yZTogNDMsXG4gICAgICAgIGlzRmluYWxpemVkOiB0cnVlLFxuICAgICAgICB0aW1lc3RhbXA6ICcyMDI0LTAxLTE1VDEwOjAwOjAwWidcbiAgICAgIH07XG5cbiAgICAgIGRkYk1vY2sub24oUXVlcnlDb21tYW5kKS5yZXNvbHZlcyh7XG4gICAgICAgIEl0ZW1zOiBbZmluYWxpemVkU2NvcmVdXG4gICAgICB9KTtcblxuICAgICAgY29uc3QganVkZ2VDb250ZXh0ID0ge1xuICAgICAgICBpZGVudGl0eTogeyBzdWI6ICdqdWRnZS0xJywgdXNlcm5hbWU6ICdqdWRnZUBleGFtcGxlLmNvbScgfVxuICAgICAgfTtcblxuICAgICAgLy8gU2hvdWxkIG5vdCBhbGxvdyBtb2RpZmljYXRpb24gb2YgZmluYWxpemVkIHNjb3JlcyB3aXRob3V0IGFkbWluIG92ZXJyaWRlXG4gICAgICBhd2FpdCBleHBlY3QodXBkYXRlQ2xhc3NTY29yZSgnY2xhc3Mtc2NvcmUtMScsIHsgYmVhdXR5U2NvcmU6IDE1IH0sIGp1ZGdlQ29udGV4dCkpXG4gICAgICAgIC5yZWplY3RzLnRvVGhyb3coJ0Nhbm5vdCBtb2RpZnkgZmluYWxpemVkIGNsYXNzIHNjb3JlIHdpdGhvdXQgYWRtaW4gcHJpdmlsZWdlcycpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnUGVyZm9ybWFuY2UgYW5kIFNjYWxhYmlsaXR5JywgKCkgPT4ge1xuICAgIGl0KCdoYW5kbGVzIGxhcmdlIGRhdGFzZXRzIHdpdGggcGFnaW5hdGlvbicsIGFzeW5jICgpID0+IHtcbiAgICAgIC8vIE1vY2sgbGFyZ2UgZGF0YXNldCB3aXRoIHBhZ2luYXRpb25cbiAgICAgIGNvbnN0IGxhcmdlRGF0YXNldCA9IEFycmF5LmZyb20oeyBsZW5ndGg6IDEwMDAgfSwgKF8sIGkpID0+ICh7XG4gICAgICAgIGlkOiBgY2xhc3Mtc2NvcmUtJHtpICsgMX1gLFxuICAgICAgICBjYXRJZDogYGNhdC0ke2kgKyAxfWAsXG4gICAgICAgIGp1ZGdlSWQ6ICdqdWRnZS0xJyxcbiAgICAgICAgdG90YWxTY29yZTogTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogNTApICsgMSxcbiAgICAgICAgcmliYm9uRWxpZ2liaWxpdHk6ICdSZWQnLFxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxuICAgICAgfSkpO1xuXG4gICAgICAvLyBNb2NrIHBhZ2luYXRlZCByZXNwb25zZVxuICAgICAgZGRiTW9jay5vbihTY2FuQ29tbWFuZCkucmVzb2x2ZXMoe1xuICAgICAgICBJdGVtczogbGFyZ2VEYXRhc2V0LnNsaWNlKDAsIDEwMCksIC8vIEZpcnN0IHBhZ2VcbiAgICAgICAgTGFzdEV2YWx1YXRlZEtleTogeyBQSzogJ0NMQVNTX1NDT1JFI2NsYXNzLXNjb3JlLTEwMCcsIFNLOiAnTUVUQURBVEEnIH1cbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBmaXJzdFBhZ2UgPSBhd2FpdCBsaXN0QWxsQ2xhc3NTY29yZXMoMTAwKTtcbiAgICAgIFxuICAgICAgZXhwZWN0KGZpcnN0UGFnZS5pdGVtcykudG9IYXZlTGVuZ3RoKDEwMCk7XG4gICAgICBleHBlY3QoZmlyc3RQYWdlLmxhc3RFdmFsdWF0ZWRLZXkpLnRvQmVEZWZpbmVkKCk7XG5cbiAgICAgIC8vIE1vY2sgc2Vjb25kIHBhZ2VcbiAgICAgIGRkYk1vY2sub24oU2NhbkNvbW1hbmQpLnJlc29sdmVzKHtcbiAgICAgICAgSXRlbXM6IGxhcmdlRGF0YXNldC5zbGljZSgxMDAsIDIwMCksXG4gICAgICAgIExhc3RFdmFsdWF0ZWRLZXk6IHsgUEs6ICdDTEFTU19TQ09SRSNjbGFzcy1zY29yZS0yMDAnLCBTSzogJ01FVEFEQVRBJyB9XG4gICAgICB9KTtcblxuICAgICAgY29uc3Qgc2Vjb25kUGFnZSA9IGF3YWl0IGxpc3RBbGxDbGFzc1Njb3JlcygxMDAsIGZpcnN0UGFnZS5sYXN0RXZhbHVhdGVkS2V5KTtcbiAgICAgIFxuICAgICAgZXhwZWN0KHNlY29uZFBhZ2UuaXRlbXMpLnRvSGF2ZUxlbmd0aCgxMDApO1xuICAgICAgZXhwZWN0KHNlY29uZFBhZ2UuaXRlbXNbMF0uaWQpLnRvQmUoJ2NsYXNzLXNjb3JlLTEwMScpO1xuICAgIH0pO1xuXG4gICAgaXQoJ2VmZmljaWVudGx5IGJhdGNoZXMgRHluYW1vREIgb3BlcmF0aW9ucycsIGFzeW5jICgpID0+IHtcbiAgICAgIGRkYk1vY2sub24oUHV0Q29tbWFuZCkucmVzb2x2ZXMoe30pO1xuICAgICAgZGRiTW9jay5vbihRdWVyeUNvbW1hbmQpLnJlc29sdmVzKHsgSXRlbXM6IFtdIH0pO1xuXG4gICAgICBjb25zdCBjbGFzc1Njb3JlSW5wdXQgPSB7XG4gICAgICAgIGNhdElkOiAnY2F0LTEnLFxuICAgICAgICBiZWF1dHlTY29yZTogMTIsXG4gICAgICAgIHBlcnNvbmFsaXR5U2NvcmU6IDE4LFxuICAgICAgICBiYWxhbmNlUHJvcG9ydGlvblNjb3JlOiAxMyxcbiAgICAgICAgY29hdENsZWFuR3Jvb21lZDogdHJ1ZSxcbiAgICAgICAgdGVldGhHdW1zSGVhbHRoeTogdHJ1ZSxcbiAgICAgICAgZXllc05vc2VDbGVhcjogdHJ1ZSxcbiAgICAgICAgZWFyc0NsZWFuTWl0ZUZyZWU6IHRydWUsXG4gICAgICAgIHRvZW5haWxzQ2xpcHBlZDogdHJ1ZSxcbiAgICAgICAgZmxlYUlzc3VlczogZmFsc2VcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGp1ZGdlQ29udGV4dCA9IHtcbiAgICAgICAgaWRlbnRpdHk6IHsgc3ViOiAnanVkZ2UtMScsIHVzZXJuYW1lOiAnanVkZ2VAZXhhbXBsZS5jb20nIH1cbiAgICAgIH07XG5cbiAgICAgIGF3YWl0IGNyZWF0ZUNsYXNzU2NvcmUoY2xhc3NTY29yZUlucHV0LCBqdWRnZUNvbnRleHQpO1xuXG4gICAgICAvLyBWZXJpZnkgZWZmaWNpZW50IGJhdGNoaW5nICgzIHB1dHM6IG1haW4gcmVjb3JkICsgMiBpbmRleGVzKVxuICAgICAgZXhwZWN0KGRkYk1vY2suY29tbWFuZENhbGxzKFB1dENvbW1hbmQpKS50b0hhdmVMZW5ndGgoMyk7XG4gICAgICBcbiAgICAgIC8vIFZlcmlmeSBhbGwgb3BlcmF0aW9ucyBjb21wbGV0ZWQgaW4gcmVhc29uYWJsZSB0aW1lXG4gICAgICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xuICAgICAgYXdhaXQgY3JlYXRlQ2xhc3NTY29yZSh7IC4uLmNsYXNzU2NvcmVJbnB1dCwgY2F0SWQ6ICdjYXQtMicgfSwganVkZ2VDb250ZXh0KTtcbiAgICAgIGNvbnN0IGVuZFRpbWUgPSBEYXRlLm5vdygpO1xuICAgICAgXG4gICAgICBleHBlY3QoZW5kVGltZSAtIHN0YXJ0VGltZSkudG9CZUxlc3NUaGFuKDEwMDApOyAvLyBTaG91bGQgY29tcGxldGUgd2l0aGluIDEgc2Vjb25kXG4gICAgfSk7XG4gIH0pO1xufSk7Il19