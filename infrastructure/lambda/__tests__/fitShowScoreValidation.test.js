"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fitShowScoreValidation_1 = require("../fitShowScoreValidation");
describe('FitShowScoreValidation', () => {
    const validInput = {
        catId: 'cat-123',
        participantName: 'John Doe',
        judgeId: 'judge-123',
        judgeName: 'Judge Smith',
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
        conditionNoseEyes: 1,
        showingEars: 2,
        earsClean: 2,
        showingToenailsClaws: 3,
        toenailsClipped: 5,
        // Grooming & Care
        showingBellyCoatCleanliness: 3,
        coatCleanWellGroomed: 7,
        catHealthCare: 2,
        // Knowledge
        generalKnowledge: 3,
        catBreedsShowing: 2,
        catAnatomy: 3,
        fourHKnowledge: 3
    };
    describe('validateCreateFitShowScoreInput', () => {
        it('should validate a correct input', () => {
            const result = (0, fitShowScoreValidation_1.validateCreateFitShowScoreInput)(validInput);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
        it('should validate input with comments', () => {
            const inputWithComments = {
                ...validInput,
                appearanceComments: 'Professional attire',
                handlingComments: 'Excellent control',
                demonstrationComments: 'Clear demonstrations',
                healthExaminationComments: 'Thorough examination',
                groomingCareComments: 'Well-groomed cat',
                knowledgeComments: 'Great knowledge'
            };
            const result = (0, fitShowScoreValidation_1.validateCreateFitShowScoreInput)(inputWithComments);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
        describe('Required field validation', () => {
            it('should reject missing catId', () => {
                const input = { ...validInput };
                delete input.catId;
                const result = (0, fitShowScoreValidation_1.validateCreateFitShowScoreInput)(input);
                expect(result.isValid).toBe(false);
                expect(result.errors).toContainEqual({
                    field: 'catId',
                    message: 'Cat ID is required',
                    value: undefined
                });
            });
            it('should reject empty participantName', () => {
                const input = { ...validInput, participantName: '' };
                const result = (0, fitShowScoreValidation_1.validateCreateFitShowScoreInput)(input);
                expect(result.isValid).toBe(false);
                expect(result.errors).toContainEqual({
                    field: 'participantName',
                    message: 'Participant name cannot be empty',
                    value: ''
                });
            });
            it('should reject whitespace-only participantName', () => {
                const input = { ...validInput, participantName: '   ' };
                const result = (0, fitShowScoreValidation_1.validateCreateFitShowScoreInput)(input);
                expect(result.isValid).toBe(false);
                expect(result.errors).toContainEqual({
                    field: 'participantName',
                    message: 'Participant name cannot be empty',
                    value: '   '
                });
            });
            it('should reject non-string judgeId', () => {
                const input = { ...validInput, judgeId: 123 };
                const result = (0, fitShowScoreValidation_1.validateCreateFitShowScoreInput)(input);
                expect(result.isValid).toBe(false);
                expect(result.errors).toContainEqual({
                    field: 'judgeId',
                    message: 'Judge ID must be a string',
                    value: 123
                });
            });
        });
        describe('Score field validation', () => {
            it('should reject scores below minimum range', () => {
                const input = { ...validInput, attire: 0 };
                const result = (0, fitShowScoreValidation_1.validateCreateFitShowScoreInput)(input);
                expect(result.isValid).toBe(false);
                expect(result.errors).toContainEqual({
                    field: 'attire',
                    message: 'Neat, clean, appropriate attire must be between 1 and 10 points',
                    value: 0
                });
            });
            it('should reject scores above maximum range', () => {
                const input = { ...validInput, attire: 11 };
                const result = (0, fitShowScoreValidation_1.validateCreateFitShowScoreInput)(input);
                expect(result.isValid).toBe(false);
                expect(result.errors).toContainEqual({
                    field: 'attire',
                    message: 'Neat, clean, appropriate attire must be between 1 and 10 points',
                    value: 11
                });
            });
            it('should reject non-integer scores', () => {
                const input = { ...validInput, attire: 8.5 };
                const result = (0, fitShowScoreValidation_1.validateCreateFitShowScoreInput)(input);
                expect(result.isValid).toBe(false);
                expect(result.errors).toContainEqual({
                    field: 'attire',
                    message: 'Neat, clean, appropriate attire must be a whole number',
                    value: 8.5
                });
            });
            it('should reject non-numeric scores', () => {
                const input = { ...validInput, attire: 'eight' };
                const result = (0, fitShowScoreValidation_1.validateCreateFitShowScoreInput)(input);
                expect(result.isValid).toBe(false);
                expect(result.errors).toContainEqual({
                    field: 'attire',
                    message: 'Neat, clean, appropriate attire must be a number',
                    value: 'eight'
                });
            });
            it('should validate all scoring field ranges correctly', () => {
                const testCases = [
                    { field: 'attire', min: 1, max: 10 },
                    { field: 'attentive', min: 1, max: 5 },
                    { field: 'courteous', min: 1, max: 5 },
                    { field: 'controlEquipment', min: 1, max: 10 },
                    { field: 'pickupCarrying', min: 1, max: 4 },
                    { field: 'showingHeadShape', min: 1, max: 4 },
                    { field: 'toenailsClipped', min: 1, max: 6 },
                    { field: 'coatCleanWellGroomed', min: 1, max: 8 },
                    { field: 'generalKnowledge', min: 1, max: 3 }
                ];
                for (const testCase of testCases) {
                    // Test below minimum
                    const inputBelow = { ...validInput, [testCase.field]: testCase.min - 1 };
                    const resultBelow = (0, fitShowScoreValidation_1.validateCreateFitShowScoreInput)(inputBelow);
                    expect(resultBelow.isValid).toBe(false);
                    // Test above maximum
                    const inputAbove = { ...validInput, [testCase.field]: testCase.max + 1 };
                    const resultAbove = (0, fitShowScoreValidation_1.validateCreateFitShowScoreInput)(inputAbove);
                    expect(resultAbove.isValid).toBe(false);
                    // Test valid range
                    const inputValid = { ...validInput, [testCase.field]: testCase.min };
                    const resultValid = (0, fitShowScoreValidation_1.validateCreateFitShowScoreInput)(inputValid);
                    expect(resultValid.isValid).toBe(true);
                }
            });
        });
        describe('Comment field validation', () => {
            it('should accept valid comments', () => {
                const input = {
                    ...validInput,
                    appearanceComments: 'Great presentation skills',
                    handlingComments: 'Confident with the cat'
                };
                const result = (0, fitShowScoreValidation_1.validateCreateFitShowScoreInput)(input);
                expect(result.isValid).toBe(true);
            });
            it('should accept undefined comments', () => {
                const input = {
                    ...validInput,
                    appearanceComments: undefined,
                    handlingComments: undefined
                };
                const result = (0, fitShowScoreValidation_1.validateCreateFitShowScoreInput)(input);
                expect(result.isValid).toBe(true);
            });
            it('should reject comments that are too long', () => {
                const longComment = 'a'.repeat(501);
                const input = {
                    ...validInput,
                    appearanceComments: longComment
                };
                const result = (0, fitShowScoreValidation_1.validateCreateFitShowScoreInput)(input);
                expect(result.isValid).toBe(false);
                expect(result.errors).toContainEqual({
                    field: 'appearanceComments',
                    message: 'appearanceComments cannot exceed 500 characters',
                    value: longComment
                });
            });
            it('should reject non-string comments', () => {
                const input = {
                    ...validInput,
                    appearanceComments: 123
                };
                const result = (0, fitShowScoreValidation_1.validateCreateFitShowScoreInput)(input);
                expect(result.isValid).toBe(false);
                expect(result.errors).toContainEqual({
                    field: 'appearanceComments',
                    message: 'appearanceComments must be a string',
                    value: 123
                });
            });
        });
        it('should collect multiple validation errors', () => {
            const input = {
                ...validInput,
                catId: '',
                participantName: '',
                attire: 0,
                attentive: 6,
                appearanceComments: 'a'.repeat(501)
            };
            const result = (0, fitShowScoreValidation_1.validateCreateFitShowScoreInput)(input);
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(4);
        });
    });
    describe('validateUpdateFitShowScoreInput', () => {
        it('should validate a correct update input', () => {
            const updateInput = {
                id: 'score-123',
                ...validInput
            };
            const result = (0, fitShowScoreValidation_1.validateUpdateFitShowScoreInput)(updateInput);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
        it('should reject missing id', () => {
            const updateInput = { ...validInput };
            const result = (0, fitShowScoreValidation_1.validateUpdateFitShowScoreInput)(updateInput);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContainEqual({
                field: 'id',
                message: 'Score ID is required',
                value: undefined
            });
        });
        it('should reject empty id', () => {
            const updateInput = {
                id: '',
                ...validInput
            };
            const result = (0, fitShowScoreValidation_1.validateUpdateFitShowScoreInput)(updateInput);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContainEqual({
                field: 'id',
                message: 'Score ID cannot be empty',
                value: ''
            });
        });
    });
    describe('validateCalculatedScores', () => {
        it('should validate correct calculated scores', () => {
            const scores = {
                appearanceTotal: 17,
                handlingTotal: 12,
                demonstrationTotal: 14,
                healthExaminationTotal: 21,
                groomingCareTotal: 12,
                knowledgeTotal: 11,
                totalScore: 87
            };
            const result = (0, fitShowScoreValidation_1.validateCalculatedScores)(scores);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
        it('should validate maximum possible scores', () => {
            const scores = {
                appearanceTotal: 20,
                handlingTotal: 14,
                demonstrationTotal: 16,
                healthExaminationTotal: 21,
                groomingCareTotal: 14,
                knowledgeTotal: 12,
                totalScore: 100
            };
            const result = (0, fitShowScoreValidation_1.validateCalculatedScores)(scores);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
        it('should reject negative scores', () => {
            const scores = {
                appearanceTotal: -1,
                handlingTotal: 12,
                demonstrationTotal: 14,
                healthExaminationTotal: 21,
                groomingCareTotal: 12,
                knowledgeTotal: 11,
                totalScore: 87
            };
            const result = (0, fitShowScoreValidation_1.validateCalculatedScores)(scores);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContainEqual({
                field: 'appearanceTotal',
                message: 'Appearance & Demeanor cannot be negative',
                value: -1
            });
        });
        it('should reject scores exceeding category maximums', () => {
            const scores = {
                appearanceTotal: 21, // Max is 20
                handlingTotal: 15, // Max is 14
                demonstrationTotal: 17, // Max is 16
                healthExaminationTotal: 25, // Max is 24
                groomingCareTotal: 15, // Max is 14
                knowledgeTotal: 13, // Max is 12
                totalScore: 101 // Max is 100
            };
            const result = (0, fitShowScoreValidation_1.validateCalculatedScores)(scores);
            expect(result.isValid).toBe(false);
            expect(result.errors).toHaveLength(7); // All categories exceed maximum
            expect(result.errors).toContainEqual({
                field: 'appearanceTotal',
                message: 'Appearance & Demeanor cannot exceed 20 points',
                value: 21
            });
            expect(result.errors).toContainEqual({
                field: 'totalScore',
                message: 'Total Score cannot exceed 100 points',
                value: 101
            });
        });
    });
    describe('validateAllScoringFieldsPresent', () => {
        it('should validate when all fields are present', () => {
            const result = (0, fitShowScoreValidation_1.validateAllScoringFieldsPresent)(validInput);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
        it('should reject when scoring fields are missing', () => {
            const input = { ...validInput };
            delete input.attire;
            delete input.generalKnowledge;
            const result = (0, fitShowScoreValidation_1.validateAllScoringFieldsPresent)(input);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContainEqual({
                field: 'attire',
                message: 'Required scoring field attire is missing',
                value: undefined
            });
            expect(result.errors).toContainEqual({
                field: 'generalKnowledge',
                message: 'Required scoring field generalKnowledge is missing',
                value: undefined
            });
        });
    });
    describe('Utility functions', () => {
        describe('getScoringFieldNames', () => {
            it('should return all 25 scoring field names', () => {
                const fieldNames = (0, fitShowScoreValidation_1.getScoringFieldNames)();
                expect(fieldNames).toHaveLength(25);
                expect(fieldNames).toContain('attire');
                expect(fieldNames).toContain('generalKnowledge');
                expect(fieldNames).toContain('toenailsClipped');
                expect(fieldNames).toContain('coatCleanWellGroomed');
            });
        });
        describe('getFieldRange', () => {
            it('should return correct range for valid field', () => {
                const range = (0, fitShowScoreValidation_1.getFieldRange)('attire');
                expect(range).toEqual({
                    min: 1,
                    max: 10,
                    description: 'Neat, clean, appropriate attire'
                });
            });
            it('should return null for invalid field', () => {
                const range = (0, fitShowScoreValidation_1.getFieldRange)('invalidField');
                expect(range).toBeNull();
            });
        });
        describe('getAllFieldRanges', () => {
            it('should return all field ranges', () => {
                const ranges = (0, fitShowScoreValidation_1.getAllFieldRanges)();
                expect(Object.keys(ranges)).toHaveLength(25);
                expect(ranges.attire).toEqual({
                    min: 1,
                    max: 10,
                    description: 'Neat, clean, appropriate attire'
                });
                expect(ranges.toenailsClipped).toEqual({
                    min: 1,
                    max: 6,
                    description: 'Toenails clipped'
                });
            });
        });
        describe('createValidationSummary', () => {
            it('should create summary for no errors', () => {
                const summary = (0, fitShowScoreValidation_1.createValidationSummary)([]);
                expect(summary).toBe('All validations passed');
            });
            it('should create summary for single error', () => {
                const errors = [{
                        field: 'attire',
                        message: 'Must be between 1 and 10',
                        value: 11
                    }];
                const summary = (0, fitShowScoreValidation_1.createValidationSummary)(errors);
                expect(summary).toBe('Found 1 validation error(s):\n- attire: Must be between 1 and 10 (received: 11)');
            });
            it('should create summary for multiple errors', () => {
                const errors = [
                    { field: 'attire', message: 'Must be between 1 and 10', value: 11 },
                    { field: 'catId', message: 'Is required' }
                ];
                const summary = (0, fitShowScoreValidation_1.createValidationSummary)(errors);
                expect(summary).toContain('Found 2 validation error(s):');
                expect(summary).toContain('- attire: Must be between 1 and 10 (received: 11)');
                expect(summary).toContain('- catId: Is required');
            });
        });
    });
    describe('CATEGORY_MAXIMUMS', () => {
        it('should have correct maximum values', () => {
            expect(fitShowScoreValidation_1.CATEGORY_MAXIMUMS.appearance).toBe(20);
            expect(fitShowScoreValidation_1.CATEGORY_MAXIMUMS.handling).toBe(14);
            expect(fitShowScoreValidation_1.CATEGORY_MAXIMUMS.demonstration).toBe(16);
            expect(fitShowScoreValidation_1.CATEGORY_MAXIMUMS.healthExamination).toBe(24);
            expect(fitShowScoreValidation_1.CATEGORY_MAXIMUMS.groomingCare).toBe(14);
            expect(fitShowScoreValidation_1.CATEGORY_MAXIMUMS.knowledge).toBe(12);
            expect(fitShowScoreValidation_1.CATEGORY_MAXIMUMS.total).toBe(100);
        });
        it('should sum to correct total', () => {
            const sum = fitShowScoreValidation_1.CATEGORY_MAXIMUMS.appearance +
                fitShowScoreValidation_1.CATEGORY_MAXIMUMS.handling +
                fitShowScoreValidation_1.CATEGORY_MAXIMUMS.demonstration +
                fitShowScoreValidation_1.CATEGORY_MAXIMUMS.healthExamination +
                fitShowScoreValidation_1.CATEGORY_MAXIMUMS.groomingCare +
                fitShowScoreValidation_1.CATEGORY_MAXIMUMS.knowledge;
            expect(sum).toBe(fitShowScoreValidation_1.CATEGORY_MAXIMUMS.total);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZml0U2hvd1Njb3JlVmFsaWRhdGlvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZml0U2hvd1Njb3JlVmFsaWRhdGlvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsc0VBVW1DO0FBR25DLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUU7SUFDdEMsTUFBTSxVQUFVLEdBQTRCO1FBQzFDLEtBQUssRUFBRSxTQUFTO1FBQ2hCLGVBQWUsRUFBRSxVQUFVO1FBQzNCLE9BQU8sRUFBRSxXQUFXO1FBQ3BCLFNBQVMsRUFBRSxhQUFhO1FBRXhCLHdCQUF3QjtRQUN4QixNQUFNLEVBQUUsQ0FBQztRQUNULFNBQVMsRUFBRSxDQUFDO1FBQ1osU0FBUyxFQUFFLENBQUM7UUFFWixxQkFBcUI7UUFDckIsZ0JBQWdCLEVBQUUsQ0FBQztRQUNuQixjQUFjLEVBQUUsQ0FBQztRQUVqQix1QkFBdUI7UUFDdkIsZ0JBQWdCLEVBQUUsQ0FBQztRQUNuQixlQUFlLEVBQUUsQ0FBQztRQUNsQixXQUFXLEVBQUUsQ0FBQztRQUNkLGtCQUFrQixFQUFFLENBQUM7UUFFckIscUJBQXFCO1FBQ3JCLHFCQUFxQixFQUFFLENBQUM7UUFDeEIsdUJBQXVCLEVBQUUsQ0FBQztRQUMxQixXQUFXLEVBQUUsQ0FBQztRQUNkLFdBQVcsRUFBRSxDQUFDO1FBQ2QsaUJBQWlCLEVBQUUsQ0FBQztRQUNwQixXQUFXLEVBQUUsQ0FBQztRQUNkLFNBQVMsRUFBRSxDQUFDO1FBQ1osb0JBQW9CLEVBQUUsQ0FBQztRQUN2QixlQUFlLEVBQUUsQ0FBQztRQUVsQixrQkFBa0I7UUFDbEIsMkJBQTJCLEVBQUUsQ0FBQztRQUM5QixvQkFBb0IsRUFBRSxDQUFDO1FBQ3ZCLGFBQWEsRUFBRSxDQUFDO1FBRWhCLFlBQVk7UUFDWixnQkFBZ0IsRUFBRSxDQUFDO1FBQ25CLGdCQUFnQixFQUFFLENBQUM7UUFDbkIsVUFBVSxFQUFFLENBQUM7UUFDYixjQUFjLEVBQUUsQ0FBQztLQUNsQixDQUFDO0lBRUYsUUFBUSxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsRUFBRTtRQUMvQyxFQUFFLENBQUMsaUNBQWlDLEVBQUUsR0FBRyxFQUFFO1lBQ3pDLE1BQU0sTUFBTSxHQUFHLElBQUEsd0RBQStCLEVBQUMsVUFBVSxDQUFDLENBQUM7WUFFM0QsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEMsQ0FBQyxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMscUNBQXFDLEVBQUUsR0FBRyxFQUFFO1lBQzdDLE1BQU0saUJBQWlCLEdBQUc7Z0JBQ3hCLEdBQUcsVUFBVTtnQkFDYixrQkFBa0IsRUFBRSxxQkFBcUI7Z0JBQ3pDLGdCQUFnQixFQUFFLG1CQUFtQjtnQkFDckMscUJBQXFCLEVBQUUsc0JBQXNCO2dCQUM3Qyx5QkFBeUIsRUFBRSxzQkFBc0I7Z0JBQ2pELG9CQUFvQixFQUFFLGtCQUFrQjtnQkFDeEMsaUJBQWlCLEVBQUUsaUJBQWlCO2FBQ3JDLENBQUM7WUFFRixNQUFNLE1BQU0sR0FBRyxJQUFBLHdEQUErQixFQUFDLGlCQUFpQixDQUFDLENBQUM7WUFFbEUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEMsQ0FBQyxDQUFDLENBQUM7UUFFSCxRQUFRLENBQUMsMkJBQTJCLEVBQUUsR0FBRyxFQUFFO1lBQ3pDLEVBQUUsQ0FBQyw2QkFBNkIsRUFBRSxHQUFHLEVBQUU7Z0JBQ3JDLE1BQU0sS0FBSyxHQUFHLEVBQUUsR0FBRyxVQUFVLEVBQUUsQ0FBQztnQkFDaEMsT0FBUSxLQUFhLENBQUMsS0FBSyxDQUFDO2dCQUU1QixNQUFNLE1BQU0sR0FBRyxJQUFBLHdEQUErQixFQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUV0RCxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDbkMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxjQUFjLENBQUM7b0JBQ25DLEtBQUssRUFBRSxPQUFPO29CQUNkLE9BQU8sRUFBRSxvQkFBb0I7b0JBQzdCLEtBQUssRUFBRSxTQUFTO2lCQUNqQixDQUFDLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQztZQUVILEVBQUUsQ0FBQyxxQ0FBcUMsRUFBRSxHQUFHLEVBQUU7Z0JBQzdDLE1BQU0sS0FBSyxHQUFHLEVBQUUsR0FBRyxVQUFVLEVBQUUsZUFBZSxFQUFFLEVBQUUsRUFBRSxDQUFDO2dCQUVyRCxNQUFNLE1BQU0sR0FBRyxJQUFBLHdEQUErQixFQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUV0RCxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDbkMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxjQUFjLENBQUM7b0JBQ25DLEtBQUssRUFBRSxpQkFBaUI7b0JBQ3hCLE9BQU8sRUFBRSxrQ0FBa0M7b0JBQzNDLEtBQUssRUFBRSxFQUFFO2lCQUNWLENBQUMsQ0FBQztZQUNMLENBQUMsQ0FBQyxDQUFDO1lBRUgsRUFBRSxDQUFDLCtDQUErQyxFQUFFLEdBQUcsRUFBRTtnQkFDdkQsTUFBTSxLQUFLLEdBQUcsRUFBRSxHQUFHLFVBQVUsRUFBRSxlQUFlLEVBQUUsS0FBSyxFQUFFLENBQUM7Z0JBRXhELE1BQU0sTUFBTSxHQUFHLElBQUEsd0RBQStCLEVBQUMsS0FBSyxDQUFDLENBQUM7Z0JBRXRELE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNuQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLGNBQWMsQ0FBQztvQkFDbkMsS0FBSyxFQUFFLGlCQUFpQjtvQkFDeEIsT0FBTyxFQUFFLGtDQUFrQztvQkFDM0MsS0FBSyxFQUFFLEtBQUs7aUJBQ2IsQ0FBQyxDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUM7WUFFSCxFQUFFLENBQUMsa0NBQWtDLEVBQUUsR0FBRyxFQUFFO2dCQUMxQyxNQUFNLEtBQUssR0FBRyxFQUFFLEdBQUcsVUFBVSxFQUFFLE9BQU8sRUFBRSxHQUFVLEVBQUUsQ0FBQztnQkFFckQsTUFBTSxNQUFNLEdBQUcsSUFBQSx3REFBK0IsRUFBQyxLQUFLLENBQUMsQ0FBQztnQkFFdEQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ25DLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsY0FBYyxDQUFDO29CQUNuQyxLQUFLLEVBQUUsU0FBUztvQkFDaEIsT0FBTyxFQUFFLDJCQUEyQjtvQkFDcEMsS0FBSyxFQUFFLEdBQUc7aUJBQ1gsQ0FBQyxDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztRQUVILFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUU7WUFDdEMsRUFBRSxDQUFDLDBDQUEwQyxFQUFFLEdBQUcsRUFBRTtnQkFDbEQsTUFBTSxLQUFLLEdBQUcsRUFBRSxHQUFHLFVBQVUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUM7Z0JBRTNDLE1BQU0sTUFBTSxHQUFHLElBQUEsd0RBQStCLEVBQUMsS0FBSyxDQUFDLENBQUM7Z0JBRXRELE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNuQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLGNBQWMsQ0FBQztvQkFDbkMsS0FBSyxFQUFFLFFBQVE7b0JBQ2YsT0FBTyxFQUFFLGlFQUFpRTtvQkFDMUUsS0FBSyxFQUFFLENBQUM7aUJBQ1QsQ0FBQyxDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUM7WUFFSCxFQUFFLENBQUMsMENBQTBDLEVBQUUsR0FBRyxFQUFFO2dCQUNsRCxNQUFNLEtBQUssR0FBRyxFQUFFLEdBQUcsVUFBVSxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsQ0FBQztnQkFFNUMsTUFBTSxNQUFNLEdBQUcsSUFBQSx3REFBK0IsRUFBQyxLQUFLLENBQUMsQ0FBQztnQkFFdEQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ25DLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsY0FBYyxDQUFDO29CQUNuQyxLQUFLLEVBQUUsUUFBUTtvQkFDZixPQUFPLEVBQUUsaUVBQWlFO29CQUMxRSxLQUFLLEVBQUUsRUFBRTtpQkFDVixDQUFDLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQztZQUVILEVBQUUsQ0FBQyxrQ0FBa0MsRUFBRSxHQUFHLEVBQUU7Z0JBQzFDLE1BQU0sS0FBSyxHQUFHLEVBQUUsR0FBRyxVQUFVLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDO2dCQUU3QyxNQUFNLE1BQU0sR0FBRyxJQUFBLHdEQUErQixFQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUV0RCxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDbkMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxjQUFjLENBQUM7b0JBQ25DLEtBQUssRUFBRSxRQUFRO29CQUNmLE9BQU8sRUFBRSx3REFBd0Q7b0JBQ2pFLEtBQUssRUFBRSxHQUFHO2lCQUNYLENBQUMsQ0FBQztZQUNMLENBQUMsQ0FBQyxDQUFDO1lBRUgsRUFBRSxDQUFDLGtDQUFrQyxFQUFFLEdBQUcsRUFBRTtnQkFDMUMsTUFBTSxLQUFLLEdBQUcsRUFBRSxHQUFHLFVBQVUsRUFBRSxNQUFNLEVBQUUsT0FBYyxFQUFFLENBQUM7Z0JBRXhELE1BQU0sTUFBTSxHQUFHLElBQUEsd0RBQStCLEVBQUMsS0FBSyxDQUFDLENBQUM7Z0JBRXRELE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNuQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLGNBQWMsQ0FBQztvQkFDbkMsS0FBSyxFQUFFLFFBQVE7b0JBQ2YsT0FBTyxFQUFFLGtEQUFrRDtvQkFDM0QsS0FBSyxFQUFFLE9BQU87aUJBQ2YsQ0FBQyxDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUM7WUFFSCxFQUFFLENBQUMsb0RBQW9ELEVBQUUsR0FBRyxFQUFFO2dCQUM1RCxNQUFNLFNBQVMsR0FBRztvQkFDaEIsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtvQkFDcEMsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRTtvQkFDdEMsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRTtvQkFDdEMsRUFBRSxLQUFLLEVBQUUsa0JBQWtCLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFO29CQUM5QyxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUU7b0JBQzNDLEVBQUUsS0FBSyxFQUFFLGtCQUFrQixFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRTtvQkFDN0MsRUFBRSxLQUFLLEVBQUUsaUJBQWlCLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFO29CQUM1QyxFQUFFLEtBQUssRUFBRSxzQkFBc0IsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUU7b0JBQ2pELEVBQUUsS0FBSyxFQUFFLGtCQUFrQixFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRTtpQkFDOUMsQ0FBQztnQkFFRixLQUFLLE1BQU0sUUFBUSxJQUFJLFNBQVMsRUFBRSxDQUFDO29CQUNqQyxxQkFBcUI7b0JBQ3JCLE1BQU0sVUFBVSxHQUFHLEVBQUUsR0FBRyxVQUFVLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsUUFBUSxDQUFDLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDekUsTUFBTSxXQUFXLEdBQUcsSUFBQSx3REFBK0IsRUFBQyxVQUFVLENBQUMsQ0FBQztvQkFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7b0JBRXhDLHFCQUFxQjtvQkFDckIsTUFBTSxVQUFVLEdBQUcsRUFBRSxHQUFHLFVBQVUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxRQUFRLENBQUMsR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUN6RSxNQUFNLFdBQVcsR0FBRyxJQUFBLHdEQUErQixFQUFDLFVBQVUsQ0FBQyxDQUFDO29CQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFFeEMsbUJBQW1CO29CQUNuQixNQUFNLFVBQVUsR0FBRyxFQUFFLEdBQUcsVUFBVSxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLFFBQVEsQ0FBQyxHQUFHLEVBQUUsQ0FBQztvQkFDckUsTUFBTSxXQUFXLEdBQUcsSUFBQSx3REFBK0IsRUFBQyxVQUFVLENBQUMsQ0FBQztvQkFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3pDLENBQUM7WUFDSCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBRUgsUUFBUSxDQUFDLDBCQUEwQixFQUFFLEdBQUcsRUFBRTtZQUN4QyxFQUFFLENBQUMsOEJBQThCLEVBQUUsR0FBRyxFQUFFO2dCQUN0QyxNQUFNLEtBQUssR0FBRztvQkFDWixHQUFHLFVBQVU7b0JBQ2Isa0JBQWtCLEVBQUUsMkJBQTJCO29CQUMvQyxnQkFBZ0IsRUFBRSx3QkFBd0I7aUJBQzNDLENBQUM7Z0JBRUYsTUFBTSxNQUFNLEdBQUcsSUFBQSx3REFBK0IsRUFBQyxLQUFLLENBQUMsQ0FBQztnQkFFdEQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDcEMsQ0FBQyxDQUFDLENBQUM7WUFFSCxFQUFFLENBQUMsa0NBQWtDLEVBQUUsR0FBRyxFQUFFO2dCQUMxQyxNQUFNLEtBQUssR0FBRztvQkFDWixHQUFHLFVBQVU7b0JBQ2Isa0JBQWtCLEVBQUUsU0FBUztvQkFDN0IsZ0JBQWdCLEVBQUUsU0FBUztpQkFDNUIsQ0FBQztnQkFFRixNQUFNLE1BQU0sR0FBRyxJQUFBLHdEQUErQixFQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUV0RCxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNwQyxDQUFDLENBQUMsQ0FBQztZQUVILEVBQUUsQ0FBQywwQ0FBMEMsRUFBRSxHQUFHLEVBQUU7Z0JBQ2xELE1BQU0sV0FBVyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3BDLE1BQU0sS0FBSyxHQUFHO29CQUNaLEdBQUcsVUFBVTtvQkFDYixrQkFBa0IsRUFBRSxXQUFXO2lCQUNoQyxDQUFDO2dCQUVGLE1BQU0sTUFBTSxHQUFHLElBQUEsd0RBQStCLEVBQUMsS0FBSyxDQUFDLENBQUM7Z0JBRXRELE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNuQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLGNBQWMsQ0FBQztvQkFDbkMsS0FBSyxFQUFFLG9CQUFvQjtvQkFDM0IsT0FBTyxFQUFFLGlEQUFpRDtvQkFDMUQsS0FBSyxFQUFFLFdBQVc7aUJBQ25CLENBQUMsQ0FBQztZQUNMLENBQUMsQ0FBQyxDQUFDO1lBRUgsRUFBRSxDQUFDLG1DQUFtQyxFQUFFLEdBQUcsRUFBRTtnQkFDM0MsTUFBTSxLQUFLLEdBQUc7b0JBQ1osR0FBRyxVQUFVO29CQUNiLGtCQUFrQixFQUFFLEdBQVU7aUJBQy9CLENBQUM7Z0JBRUYsTUFBTSxNQUFNLEdBQUcsSUFBQSx3REFBK0IsRUFBQyxLQUFLLENBQUMsQ0FBQztnQkFFdEQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ25DLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsY0FBYyxDQUFDO29CQUNuQyxLQUFLLEVBQUUsb0JBQW9CO29CQUMzQixPQUFPLEVBQUUscUNBQXFDO29CQUM5QyxLQUFLLEVBQUUsR0FBRztpQkFDWCxDQUFDLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBRUgsRUFBRSxDQUFDLDJDQUEyQyxFQUFFLEdBQUcsRUFBRTtZQUNuRCxNQUFNLEtBQUssR0FBRztnQkFDWixHQUFHLFVBQVU7Z0JBQ2IsS0FBSyxFQUFFLEVBQUU7Z0JBQ1QsZUFBZSxFQUFFLEVBQUU7Z0JBQ25CLE1BQU0sRUFBRSxDQUFDO2dCQUNULFNBQVMsRUFBRSxDQUFDO2dCQUNaLGtCQUFrQixFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDO2FBQ3BDLENBQUM7WUFFRixNQUFNLE1BQU0sR0FBRyxJQUFBLHdEQUErQixFQUFDLEtBQUssQ0FBQyxDQUFDO1lBRXRELE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ25DLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsRCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsRUFBRTtRQUMvQyxFQUFFLENBQUMsd0NBQXdDLEVBQUUsR0FBRyxFQUFFO1lBQ2hELE1BQU0sV0FBVyxHQUE0QjtnQkFDM0MsRUFBRSxFQUFFLFdBQVc7Z0JBQ2YsR0FBRyxVQUFVO2FBQ2QsQ0FBQztZQUVGLE1BQU0sTUFBTSxHQUFHLElBQUEsd0RBQStCLEVBQUMsV0FBVyxDQUFDLENBQUM7WUFFNUQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEMsQ0FBQyxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFO1lBQ2xDLE1BQU0sV0FBVyxHQUFHLEVBQUUsR0FBRyxVQUFVLEVBQVMsQ0FBQztZQUU3QyxNQUFNLE1BQU0sR0FBRyxJQUFBLHdEQUErQixFQUFDLFdBQVcsQ0FBQyxDQUFDO1lBRTVELE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ25DLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsY0FBYyxDQUFDO2dCQUNuQyxLQUFLLEVBQUUsSUFBSTtnQkFDWCxPQUFPLEVBQUUsc0JBQXNCO2dCQUMvQixLQUFLLEVBQUUsU0FBUzthQUNqQixDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUU7WUFDaEMsTUFBTSxXQUFXLEdBQTRCO2dCQUMzQyxFQUFFLEVBQUUsRUFBRTtnQkFDTixHQUFHLFVBQVU7YUFDZCxDQUFDO1lBRUYsTUFBTSxNQUFNLEdBQUcsSUFBQSx3REFBK0IsRUFBQyxXQUFXLENBQUMsQ0FBQztZQUU1RCxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNuQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLGNBQWMsQ0FBQztnQkFDbkMsS0FBSyxFQUFFLElBQUk7Z0JBQ1gsT0FBTyxFQUFFLDBCQUEwQjtnQkFDbkMsS0FBSyxFQUFFLEVBQUU7YUFDVixDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLDBCQUEwQixFQUFFLEdBQUcsRUFBRTtRQUN4QyxFQUFFLENBQUMsMkNBQTJDLEVBQUUsR0FBRyxFQUFFO1lBQ25ELE1BQU0sTUFBTSxHQUFHO2dCQUNiLGVBQWUsRUFBRSxFQUFFO2dCQUNuQixhQUFhLEVBQUUsRUFBRTtnQkFDakIsa0JBQWtCLEVBQUUsRUFBRTtnQkFDdEIsc0JBQXNCLEVBQUUsRUFBRTtnQkFDMUIsaUJBQWlCLEVBQUUsRUFBRTtnQkFDckIsY0FBYyxFQUFFLEVBQUU7Z0JBQ2xCLFVBQVUsRUFBRSxFQUFFO2FBQ2YsQ0FBQztZQUVGLE1BQU0sTUFBTSxHQUFHLElBQUEsaURBQXdCLEVBQUMsTUFBTSxDQUFDLENBQUM7WUFFaEQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEMsQ0FBQyxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMseUNBQXlDLEVBQUUsR0FBRyxFQUFFO1lBQ2pELE1BQU0sTUFBTSxHQUFHO2dCQUNiLGVBQWUsRUFBRSxFQUFFO2dCQUNuQixhQUFhLEVBQUUsRUFBRTtnQkFDakIsa0JBQWtCLEVBQUUsRUFBRTtnQkFDdEIsc0JBQXNCLEVBQUUsRUFBRTtnQkFDMUIsaUJBQWlCLEVBQUUsRUFBRTtnQkFDckIsY0FBYyxFQUFFLEVBQUU7Z0JBQ2xCLFVBQVUsRUFBRSxHQUFHO2FBQ2hCLENBQUM7WUFFRixNQUFNLE1BQU0sR0FBRyxJQUFBLGlEQUF3QixFQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRWhELE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2xDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hDLENBQUMsQ0FBQyxDQUFDO1FBRUgsRUFBRSxDQUFDLCtCQUErQixFQUFFLEdBQUcsRUFBRTtZQUN2QyxNQUFNLE1BQU0sR0FBRztnQkFDYixlQUFlLEVBQUUsQ0FBQyxDQUFDO2dCQUNuQixhQUFhLEVBQUUsRUFBRTtnQkFDakIsa0JBQWtCLEVBQUUsRUFBRTtnQkFDdEIsc0JBQXNCLEVBQUUsRUFBRTtnQkFDMUIsaUJBQWlCLEVBQUUsRUFBRTtnQkFDckIsY0FBYyxFQUFFLEVBQUU7Z0JBQ2xCLFVBQVUsRUFBRSxFQUFFO2FBQ2YsQ0FBQztZQUVGLE1BQU0sTUFBTSxHQUFHLElBQUEsaURBQXdCLEVBQUMsTUFBTSxDQUFDLENBQUM7WUFFaEQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDbkMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxjQUFjLENBQUM7Z0JBQ25DLEtBQUssRUFBRSxpQkFBaUI7Z0JBQ3hCLE9BQU8sRUFBRSwwQ0FBMEM7Z0JBQ25ELEtBQUssRUFBRSxDQUFDLENBQUM7YUFDVixDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQyxrREFBa0QsRUFBRSxHQUFHLEVBQUU7WUFDMUQsTUFBTSxNQUFNLEdBQUc7Z0JBQ2IsZUFBZSxFQUFFLEVBQUUsRUFBRSxZQUFZO2dCQUNqQyxhQUFhLEVBQUUsRUFBRSxFQUFFLFlBQVk7Z0JBQy9CLGtCQUFrQixFQUFFLEVBQUUsRUFBRSxZQUFZO2dCQUNwQyxzQkFBc0IsRUFBRSxFQUFFLEVBQUUsWUFBWTtnQkFDeEMsaUJBQWlCLEVBQUUsRUFBRSxFQUFFLFlBQVk7Z0JBQ25DLGNBQWMsRUFBRSxFQUFFLEVBQUUsWUFBWTtnQkFDaEMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxhQUFhO2FBQzlCLENBQUM7WUFFRixNQUFNLE1BQU0sR0FBRyxJQUFBLGlEQUF3QixFQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRWhELE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ25DLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0NBQWdDO1lBRXZFLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsY0FBYyxDQUFDO2dCQUNuQyxLQUFLLEVBQUUsaUJBQWlCO2dCQUN4QixPQUFPLEVBQUUsK0NBQStDO2dCQUN4RCxLQUFLLEVBQUUsRUFBRTthQUNWLENBQUMsQ0FBQztZQUVILE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsY0FBYyxDQUFDO2dCQUNuQyxLQUFLLEVBQUUsWUFBWTtnQkFDbkIsT0FBTyxFQUFFLHNDQUFzQztnQkFDL0MsS0FBSyxFQUFFLEdBQUc7YUFDWCxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsRUFBRTtRQUMvQyxFQUFFLENBQUMsNkNBQTZDLEVBQUUsR0FBRyxFQUFFO1lBQ3JELE1BQU0sTUFBTSxHQUFHLElBQUEsd0RBQStCLEVBQUMsVUFBVSxDQUFDLENBQUM7WUFFM0QsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEMsQ0FBQyxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsK0NBQStDLEVBQUUsR0FBRyxFQUFFO1lBQ3ZELE1BQU0sS0FBSyxHQUFHLEVBQUUsR0FBRyxVQUFVLEVBQUUsQ0FBQztZQUNoQyxPQUFRLEtBQWEsQ0FBQyxNQUFNLENBQUM7WUFDN0IsT0FBUSxLQUFhLENBQUMsZ0JBQWdCLENBQUM7WUFFdkMsTUFBTSxNQUFNLEdBQUcsSUFBQSx3REFBK0IsRUFBQyxLQUFLLENBQUMsQ0FBQztZQUV0RCxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNuQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLGNBQWMsQ0FBQztnQkFDbkMsS0FBSyxFQUFFLFFBQVE7Z0JBQ2YsT0FBTyxFQUFFLDBDQUEwQztnQkFDbkQsS0FBSyxFQUFFLFNBQVM7YUFDakIsQ0FBQyxDQUFDO1lBQ0gsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxjQUFjLENBQUM7Z0JBQ25DLEtBQUssRUFBRSxrQkFBa0I7Z0JBQ3pCLE9BQU8sRUFBRSxvREFBb0Q7Z0JBQzdELEtBQUssRUFBRSxTQUFTO2FBQ2pCLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO1FBQ2pDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7WUFDcEMsRUFBRSxDQUFDLDBDQUEwQyxFQUFFLEdBQUcsRUFBRTtnQkFDbEQsTUFBTSxVQUFVLEdBQUcsSUFBQSw2Q0FBb0IsR0FBRSxDQUFDO2dCQUUxQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNwQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUN2QyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUFDLENBQUM7Z0JBQ2pELE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsQ0FBQztnQkFDaEQsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1lBQ3ZELENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7UUFFSCxRQUFRLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtZQUM3QixFQUFFLENBQUMsNkNBQTZDLEVBQUUsR0FBRyxFQUFFO2dCQUNyRCxNQUFNLEtBQUssR0FBRyxJQUFBLHNDQUFhLEVBQUMsUUFBUSxDQUFDLENBQUM7Z0JBRXRDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUM7b0JBQ3BCLEdBQUcsRUFBRSxDQUFDO29CQUNOLEdBQUcsRUFBRSxFQUFFO29CQUNQLFdBQVcsRUFBRSxpQ0FBaUM7aUJBQy9DLENBQUMsQ0FBQztZQUNMLENBQUMsQ0FBQyxDQUFDO1lBRUgsRUFBRSxDQUFDLHNDQUFzQyxFQUFFLEdBQUcsRUFBRTtnQkFDOUMsTUFBTSxLQUFLLEdBQUcsSUFBQSxzQ0FBYSxFQUFDLGNBQWMsQ0FBQyxDQUFDO2dCQUU1QyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDM0IsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztRQUVILFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7WUFDakMsRUFBRSxDQUFDLGdDQUFnQyxFQUFFLEdBQUcsRUFBRTtnQkFDeEMsTUFBTSxNQUFNLEdBQUcsSUFBQSwwQ0FBaUIsR0FBRSxDQUFDO2dCQUVuQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDN0MsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUM7b0JBQzVCLEdBQUcsRUFBRSxDQUFDO29CQUNOLEdBQUcsRUFBRSxFQUFFO29CQUNQLFdBQVcsRUFBRSxpQ0FBaUM7aUJBQy9DLENBQUMsQ0FBQztnQkFDSCxNQUFNLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLE9BQU8sQ0FBQztvQkFDckMsR0FBRyxFQUFFLENBQUM7b0JBQ04sR0FBRyxFQUFFLENBQUM7b0JBQ04sV0FBVyxFQUFFLGtCQUFrQjtpQkFDaEMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztRQUVILFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLEVBQUU7WUFDdkMsRUFBRSxDQUFDLHFDQUFxQyxFQUFFLEdBQUcsRUFBRTtnQkFDN0MsTUFBTSxPQUFPLEdBQUcsSUFBQSxnREFBdUIsRUFBQyxFQUFFLENBQUMsQ0FBQztnQkFFNUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1lBQ2pELENBQUMsQ0FBQyxDQUFDO1lBRUgsRUFBRSxDQUFDLHdDQUF3QyxFQUFFLEdBQUcsRUFBRTtnQkFDaEQsTUFBTSxNQUFNLEdBQUcsQ0FBQzt3QkFDZCxLQUFLLEVBQUUsUUFBUTt3QkFDZixPQUFPLEVBQUUsMEJBQTBCO3dCQUNuQyxLQUFLLEVBQUUsRUFBRTtxQkFDVixDQUFDLENBQUM7Z0JBRUgsTUFBTSxPQUFPLEdBQUcsSUFBQSxnREFBdUIsRUFBQyxNQUFNLENBQUMsQ0FBQztnQkFFaEQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxpRkFBaUYsQ0FBQyxDQUFDO1lBQzFHLENBQUMsQ0FBQyxDQUFDO1lBRUgsRUFBRSxDQUFDLDJDQUEyQyxFQUFFLEdBQUcsRUFBRTtnQkFDbkQsTUFBTSxNQUFNLEdBQUc7b0JBQ2IsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFO29CQUNuRSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRTtpQkFDM0MsQ0FBQztnQkFFRixNQUFNLE9BQU8sR0FBRyxJQUFBLGdEQUF1QixFQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUVoRCxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLDhCQUE4QixDQUFDLENBQUM7Z0JBQzFELE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsbURBQW1ELENBQUMsQ0FBQztnQkFDL0UsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1lBQ3BELENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7UUFDakMsRUFBRSxDQUFDLG9DQUFvQyxFQUFFLEdBQUcsRUFBRTtZQUM1QyxNQUFNLENBQUMsMENBQWlCLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzlDLE1BQU0sQ0FBQywwQ0FBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDNUMsTUFBTSxDQUFDLDBDQUFpQixDQUFDLGFBQWEsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNqRCxNQUFNLENBQUMsMENBQWlCLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDckQsTUFBTSxDQUFDLDBDQUFpQixDQUFDLFlBQVksQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNoRCxNQUFNLENBQUMsMENBQWlCLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzdDLE1BQU0sQ0FBQywwQ0FBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDNUMsQ0FBQyxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsNkJBQTZCLEVBQUUsR0FBRyxFQUFFO1lBQ3JDLE1BQU0sR0FBRyxHQUFHLDBDQUFpQixDQUFDLFVBQVU7Z0JBQzVCLDBDQUFpQixDQUFDLFFBQVE7Z0JBQzFCLDBDQUFpQixDQUFDLGFBQWE7Z0JBQy9CLDBDQUFpQixDQUFDLGlCQUFpQjtnQkFDbkMsMENBQWlCLENBQUMsWUFBWTtnQkFDOUIsMENBQWlCLENBQUMsU0FBUyxDQUFDO1lBRXhDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsMENBQWlCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDNUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgdmFsaWRhdGVDcmVhdGVGaXRTaG93U2NvcmVJbnB1dCxcbiAgdmFsaWRhdGVVcGRhdGVGaXRTaG93U2NvcmVJbnB1dCxcbiAgdmFsaWRhdGVDYWxjdWxhdGVkU2NvcmVzLFxuICB2YWxpZGF0ZUFsbFNjb3JpbmdGaWVsZHNQcmVzZW50LFxuICBnZXRTY29yaW5nRmllbGROYW1lcyxcbiAgZ2V0RmllbGRSYW5nZSxcbiAgZ2V0QWxsRmllbGRSYW5nZXMsXG4gIGNyZWF0ZVZhbGlkYXRpb25TdW1tYXJ5LFxuICBDQVRFR09SWV9NQVhJTVVNU1xufSBmcm9tICcuLi9maXRTaG93U2NvcmVWYWxpZGF0aW9uJztcbmltcG9ydCB7IENyZWF0ZUZpdFNob3dTY29yZUlucHV0LCBVcGRhdGVGaXRTaG93U2NvcmVJbnB1dCB9IGZyb20gJy4uL2ZpdFNob3dTY29yZURhdGFBY2Nlc3MnO1xuXG5kZXNjcmliZSgnRml0U2hvd1Njb3JlVmFsaWRhdGlvbicsICgpID0+IHtcbiAgY29uc3QgdmFsaWRJbnB1dDogQ3JlYXRlRml0U2hvd1Njb3JlSW5wdXQgPSB7XG4gICAgY2F0SWQ6ICdjYXQtMTIzJyxcbiAgICBwYXJ0aWNpcGFudE5hbWU6ICdKb2huIERvZScsXG4gICAganVkZ2VJZDogJ2p1ZGdlLTEyMycsXG4gICAganVkZ2VOYW1lOiAnSnVkZ2UgU21pdGgnLFxuICAgIFxuICAgIC8vIEFwcGVhcmFuY2UgJiBEZW1lYW5vclxuICAgIGF0dGlyZTogOCxcbiAgICBhdHRlbnRpdmU6IDQsXG4gICAgY291cnRlb3VzOiA1LFxuICAgIFxuICAgIC8vIEhhbmRsaW5nICYgQ29udHJvbFxuICAgIGNvbnRyb2xFcXVpcG1lbnQ6IDksXG4gICAgcGlja3VwQ2Fycnlpbmc6IDMsXG4gICAgXG4gICAgLy8gRGVtb25zdHJhdGlvbiBTa2lsbHNcbiAgICBzaG93aW5nSGVhZFNoYXBlOiAzLFxuICAgIHNob3dpbmdCb2R5VHlwZTogNCxcbiAgICBzaG93aW5nVGFpbDogMyxcbiAgICBzaG93aW5nQ29hdFRleHR1cmU6IDQsXG4gICAgXG4gICAgLy8gSGVhbHRoIEV4YW1pbmF0aW9uXG4gICAgc2hvd2luZ01vdXRoVGVldGhHdW1zOiAyLFxuICAgIGNvbmRpdGlvbk1vdXRoVGVldGhHdW1zOiAyLFxuICAgIHNob3dpbmdOb3NlOiAyLFxuICAgIHNob3dpbmdFeWVzOiAyLFxuICAgIGNvbmRpdGlvbk5vc2VFeWVzOiAxLFxuICAgIHNob3dpbmdFYXJzOiAyLFxuICAgIGVhcnNDbGVhbjogMixcbiAgICBzaG93aW5nVG9lbmFpbHNDbGF3czogMyxcbiAgICB0b2VuYWlsc0NsaXBwZWQ6IDUsXG4gICAgXG4gICAgLy8gR3Jvb21pbmcgJiBDYXJlXG4gICAgc2hvd2luZ0JlbGx5Q29hdENsZWFubGluZXNzOiAzLFxuICAgIGNvYXRDbGVhbldlbGxHcm9vbWVkOiA3LFxuICAgIGNhdEhlYWx0aENhcmU6IDIsXG4gICAgXG4gICAgLy8gS25vd2xlZGdlXG4gICAgZ2VuZXJhbEtub3dsZWRnZTogMyxcbiAgICBjYXRCcmVlZHNTaG93aW5nOiAyLFxuICAgIGNhdEFuYXRvbXk6IDMsXG4gICAgZm91ckhLbm93bGVkZ2U6IDNcbiAgfTtcblxuICBkZXNjcmliZSgndmFsaWRhdGVDcmVhdGVGaXRTaG93U2NvcmVJbnB1dCcsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIHZhbGlkYXRlIGEgY29ycmVjdCBpbnB1dCcsICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHZhbGlkYXRlQ3JlYXRlRml0U2hvd1Njb3JlSW5wdXQodmFsaWRJbnB1dCk7XG4gICAgICBcbiAgICAgIGV4cGVjdChyZXN1bHQuaXNWYWxpZCkudG9CZSh0cnVlKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuZXJyb3JzKS50b0hhdmVMZW5ndGgoMCk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHZhbGlkYXRlIGlucHV0IHdpdGggY29tbWVudHMnLCAoKSA9PiB7XG4gICAgICBjb25zdCBpbnB1dFdpdGhDb21tZW50cyA9IHtcbiAgICAgICAgLi4udmFsaWRJbnB1dCxcbiAgICAgICAgYXBwZWFyYW5jZUNvbW1lbnRzOiAnUHJvZmVzc2lvbmFsIGF0dGlyZScsXG4gICAgICAgIGhhbmRsaW5nQ29tbWVudHM6ICdFeGNlbGxlbnQgY29udHJvbCcsXG4gICAgICAgIGRlbW9uc3RyYXRpb25Db21tZW50czogJ0NsZWFyIGRlbW9uc3RyYXRpb25zJyxcbiAgICAgICAgaGVhbHRoRXhhbWluYXRpb25Db21tZW50czogJ1Rob3JvdWdoIGV4YW1pbmF0aW9uJyxcbiAgICAgICAgZ3Jvb21pbmdDYXJlQ29tbWVudHM6ICdXZWxsLWdyb29tZWQgY2F0JyxcbiAgICAgICAga25vd2xlZGdlQ29tbWVudHM6ICdHcmVhdCBrbm93bGVkZ2UnXG4gICAgICB9O1xuXG4gICAgICBjb25zdCByZXN1bHQgPSB2YWxpZGF0ZUNyZWF0ZUZpdFNob3dTY29yZUlucHV0KGlucHV0V2l0aENvbW1lbnRzKTtcbiAgICAgIFxuICAgICAgZXhwZWN0KHJlc3VsdC5pc1ZhbGlkKS50b0JlKHRydWUpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5lcnJvcnMpLnRvSGF2ZUxlbmd0aCgwKTtcbiAgICB9KTtcblxuICAgIGRlc2NyaWJlKCdSZXF1aXJlZCBmaWVsZCB2YWxpZGF0aW9uJywgKCkgPT4ge1xuICAgICAgaXQoJ3Nob3VsZCByZWplY3QgbWlzc2luZyBjYXRJZCcsICgpID0+IHtcbiAgICAgICAgY29uc3QgaW5wdXQgPSB7IC4uLnZhbGlkSW5wdXQgfTtcbiAgICAgICAgZGVsZXRlIChpbnB1dCBhcyBhbnkpLmNhdElkO1xuXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHZhbGlkYXRlQ3JlYXRlRml0U2hvd1Njb3JlSW5wdXQoaW5wdXQpO1xuICAgICAgICBcbiAgICAgICAgZXhwZWN0KHJlc3VsdC5pc1ZhbGlkKS50b0JlKGZhbHNlKTtcbiAgICAgICAgZXhwZWN0KHJlc3VsdC5lcnJvcnMpLnRvQ29udGFpbkVxdWFsKHtcbiAgICAgICAgICBmaWVsZDogJ2NhdElkJyxcbiAgICAgICAgICBtZXNzYWdlOiAnQ2F0IElEIGlzIHJlcXVpcmVkJyxcbiAgICAgICAgICB2YWx1ZTogdW5kZWZpbmVkXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIGl0KCdzaG91bGQgcmVqZWN0IGVtcHR5IHBhcnRpY2lwYW50TmFtZScsICgpID0+IHtcbiAgICAgICAgY29uc3QgaW5wdXQgPSB7IC4uLnZhbGlkSW5wdXQsIHBhcnRpY2lwYW50TmFtZTogJycgfTtcblxuICAgICAgICBjb25zdCByZXN1bHQgPSB2YWxpZGF0ZUNyZWF0ZUZpdFNob3dTY29yZUlucHV0KGlucHV0KTtcbiAgICAgICAgXG4gICAgICAgIGV4cGVjdChyZXN1bHQuaXNWYWxpZCkudG9CZShmYWxzZSk7XG4gICAgICAgIGV4cGVjdChyZXN1bHQuZXJyb3JzKS50b0NvbnRhaW5FcXVhbCh7XG4gICAgICAgICAgZmllbGQ6ICdwYXJ0aWNpcGFudE5hbWUnLFxuICAgICAgICAgIG1lc3NhZ2U6ICdQYXJ0aWNpcGFudCBuYW1lIGNhbm5vdCBiZSBlbXB0eScsXG4gICAgICAgICAgdmFsdWU6ICcnXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIGl0KCdzaG91bGQgcmVqZWN0IHdoaXRlc3BhY2Utb25seSBwYXJ0aWNpcGFudE5hbWUnLCAoKSA9PiB7XG4gICAgICAgIGNvbnN0IGlucHV0ID0geyAuLi52YWxpZElucHV0LCBwYXJ0aWNpcGFudE5hbWU6ICcgICAnIH07XG5cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdmFsaWRhdGVDcmVhdGVGaXRTaG93U2NvcmVJbnB1dChpbnB1dCk7XG4gICAgICAgIFxuICAgICAgICBleHBlY3QocmVzdWx0LmlzVmFsaWQpLnRvQmUoZmFsc2UpO1xuICAgICAgICBleHBlY3QocmVzdWx0LmVycm9ycykudG9Db250YWluRXF1YWwoe1xuICAgICAgICAgIGZpZWxkOiAncGFydGljaXBhbnROYW1lJyxcbiAgICAgICAgICBtZXNzYWdlOiAnUGFydGljaXBhbnQgbmFtZSBjYW5ub3QgYmUgZW1wdHknLFxuICAgICAgICAgIHZhbHVlOiAnICAgJ1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICBpdCgnc2hvdWxkIHJlamVjdCBub24tc3RyaW5nIGp1ZGdlSWQnLCAoKSA9PiB7XG4gICAgICAgIGNvbnN0IGlucHV0ID0geyAuLi52YWxpZElucHV0LCBqdWRnZUlkOiAxMjMgYXMgYW55IH07XG5cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdmFsaWRhdGVDcmVhdGVGaXRTaG93U2NvcmVJbnB1dChpbnB1dCk7XG4gICAgICAgIFxuICAgICAgICBleHBlY3QocmVzdWx0LmlzVmFsaWQpLnRvQmUoZmFsc2UpO1xuICAgICAgICBleHBlY3QocmVzdWx0LmVycm9ycykudG9Db250YWluRXF1YWwoe1xuICAgICAgICAgIGZpZWxkOiAnanVkZ2VJZCcsXG4gICAgICAgICAgbWVzc2FnZTogJ0p1ZGdlIElEIG11c3QgYmUgYSBzdHJpbmcnLFxuICAgICAgICAgIHZhbHVlOiAxMjNcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIGRlc2NyaWJlKCdTY29yZSBmaWVsZCB2YWxpZGF0aW9uJywgKCkgPT4ge1xuICAgICAgaXQoJ3Nob3VsZCByZWplY3Qgc2NvcmVzIGJlbG93IG1pbmltdW0gcmFuZ2UnLCAoKSA9PiB7XG4gICAgICAgIGNvbnN0IGlucHV0ID0geyAuLi52YWxpZElucHV0LCBhdHRpcmU6IDAgfTtcblxuICAgICAgICBjb25zdCByZXN1bHQgPSB2YWxpZGF0ZUNyZWF0ZUZpdFNob3dTY29yZUlucHV0KGlucHV0KTtcbiAgICAgICAgXG4gICAgICAgIGV4cGVjdChyZXN1bHQuaXNWYWxpZCkudG9CZShmYWxzZSk7XG4gICAgICAgIGV4cGVjdChyZXN1bHQuZXJyb3JzKS50b0NvbnRhaW5FcXVhbCh7XG4gICAgICAgICAgZmllbGQ6ICdhdHRpcmUnLFxuICAgICAgICAgIG1lc3NhZ2U6ICdOZWF0LCBjbGVhbiwgYXBwcm9wcmlhdGUgYXR0aXJlIG11c3QgYmUgYmV0d2VlbiAxIGFuZCAxMCBwb2ludHMnLFxuICAgICAgICAgIHZhbHVlOiAwXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIGl0KCdzaG91bGQgcmVqZWN0IHNjb3JlcyBhYm92ZSBtYXhpbXVtIHJhbmdlJywgKCkgPT4ge1xuICAgICAgICBjb25zdCBpbnB1dCA9IHsgLi4udmFsaWRJbnB1dCwgYXR0aXJlOiAxMSB9O1xuXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHZhbGlkYXRlQ3JlYXRlRml0U2hvd1Njb3JlSW5wdXQoaW5wdXQpO1xuICAgICAgICBcbiAgICAgICAgZXhwZWN0KHJlc3VsdC5pc1ZhbGlkKS50b0JlKGZhbHNlKTtcbiAgICAgICAgZXhwZWN0KHJlc3VsdC5lcnJvcnMpLnRvQ29udGFpbkVxdWFsKHtcbiAgICAgICAgICBmaWVsZDogJ2F0dGlyZScsXG4gICAgICAgICAgbWVzc2FnZTogJ05lYXQsIGNsZWFuLCBhcHByb3ByaWF0ZSBhdHRpcmUgbXVzdCBiZSBiZXR3ZWVuIDEgYW5kIDEwIHBvaW50cycsXG4gICAgICAgICAgdmFsdWU6IDExXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIGl0KCdzaG91bGQgcmVqZWN0IG5vbi1pbnRlZ2VyIHNjb3JlcycsICgpID0+IHtcbiAgICAgICAgY29uc3QgaW5wdXQgPSB7IC4uLnZhbGlkSW5wdXQsIGF0dGlyZTogOC41IH07XG5cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdmFsaWRhdGVDcmVhdGVGaXRTaG93U2NvcmVJbnB1dChpbnB1dCk7XG4gICAgICAgIFxuICAgICAgICBleHBlY3QocmVzdWx0LmlzVmFsaWQpLnRvQmUoZmFsc2UpO1xuICAgICAgICBleHBlY3QocmVzdWx0LmVycm9ycykudG9Db250YWluRXF1YWwoe1xuICAgICAgICAgIGZpZWxkOiAnYXR0aXJlJyxcbiAgICAgICAgICBtZXNzYWdlOiAnTmVhdCwgY2xlYW4sIGFwcHJvcHJpYXRlIGF0dGlyZSBtdXN0IGJlIGEgd2hvbGUgbnVtYmVyJyxcbiAgICAgICAgICB2YWx1ZTogOC41XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIGl0KCdzaG91bGQgcmVqZWN0IG5vbi1udW1lcmljIHNjb3JlcycsICgpID0+IHtcbiAgICAgICAgY29uc3QgaW5wdXQgPSB7IC4uLnZhbGlkSW5wdXQsIGF0dGlyZTogJ2VpZ2h0JyBhcyBhbnkgfTtcblxuICAgICAgICBjb25zdCByZXN1bHQgPSB2YWxpZGF0ZUNyZWF0ZUZpdFNob3dTY29yZUlucHV0KGlucHV0KTtcbiAgICAgICAgXG4gICAgICAgIGV4cGVjdChyZXN1bHQuaXNWYWxpZCkudG9CZShmYWxzZSk7XG4gICAgICAgIGV4cGVjdChyZXN1bHQuZXJyb3JzKS50b0NvbnRhaW5FcXVhbCh7XG4gICAgICAgICAgZmllbGQ6ICdhdHRpcmUnLFxuICAgICAgICAgIG1lc3NhZ2U6ICdOZWF0LCBjbGVhbiwgYXBwcm9wcmlhdGUgYXR0aXJlIG11c3QgYmUgYSBudW1iZXInLFxuICAgICAgICAgIHZhbHVlOiAnZWlnaHQnXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIGl0KCdzaG91bGQgdmFsaWRhdGUgYWxsIHNjb3JpbmcgZmllbGQgcmFuZ2VzIGNvcnJlY3RseScsICgpID0+IHtcbiAgICAgICAgY29uc3QgdGVzdENhc2VzID0gW1xuICAgICAgICAgIHsgZmllbGQ6ICdhdHRpcmUnLCBtaW46IDEsIG1heDogMTAgfSxcbiAgICAgICAgICB7IGZpZWxkOiAnYXR0ZW50aXZlJywgbWluOiAxLCBtYXg6IDUgfSxcbiAgICAgICAgICB7IGZpZWxkOiAnY291cnRlb3VzJywgbWluOiAxLCBtYXg6IDUgfSxcbiAgICAgICAgICB7IGZpZWxkOiAnY29udHJvbEVxdWlwbWVudCcsIG1pbjogMSwgbWF4OiAxMCB9LFxuICAgICAgICAgIHsgZmllbGQ6ICdwaWNrdXBDYXJyeWluZycsIG1pbjogMSwgbWF4OiA0IH0sXG4gICAgICAgICAgeyBmaWVsZDogJ3Nob3dpbmdIZWFkU2hhcGUnLCBtaW46IDEsIG1heDogNCB9LFxuICAgICAgICAgIHsgZmllbGQ6ICd0b2VuYWlsc0NsaXBwZWQnLCBtaW46IDEsIG1heDogNiB9LFxuICAgICAgICAgIHsgZmllbGQ6ICdjb2F0Q2xlYW5XZWxsR3Jvb21lZCcsIG1pbjogMSwgbWF4OiA4IH0sXG4gICAgICAgICAgeyBmaWVsZDogJ2dlbmVyYWxLbm93bGVkZ2UnLCBtaW46IDEsIG1heDogMyB9XG4gICAgICAgIF07XG5cbiAgICAgICAgZm9yIChjb25zdCB0ZXN0Q2FzZSBvZiB0ZXN0Q2FzZXMpIHtcbiAgICAgICAgICAvLyBUZXN0IGJlbG93IG1pbmltdW1cbiAgICAgICAgICBjb25zdCBpbnB1dEJlbG93ID0geyAuLi52YWxpZElucHV0LCBbdGVzdENhc2UuZmllbGRdOiB0ZXN0Q2FzZS5taW4gLSAxIH07XG4gICAgICAgICAgY29uc3QgcmVzdWx0QmVsb3cgPSB2YWxpZGF0ZUNyZWF0ZUZpdFNob3dTY29yZUlucHV0KGlucHV0QmVsb3cpO1xuICAgICAgICAgIGV4cGVjdChyZXN1bHRCZWxvdy5pc1ZhbGlkKS50b0JlKGZhbHNlKTtcblxuICAgICAgICAgIC8vIFRlc3QgYWJvdmUgbWF4aW11bVxuICAgICAgICAgIGNvbnN0IGlucHV0QWJvdmUgPSB7IC4uLnZhbGlkSW5wdXQsIFt0ZXN0Q2FzZS5maWVsZF06IHRlc3RDYXNlLm1heCArIDEgfTtcbiAgICAgICAgICBjb25zdCByZXN1bHRBYm92ZSA9IHZhbGlkYXRlQ3JlYXRlRml0U2hvd1Njb3JlSW5wdXQoaW5wdXRBYm92ZSk7XG4gICAgICAgICAgZXhwZWN0KHJlc3VsdEFib3ZlLmlzVmFsaWQpLnRvQmUoZmFsc2UpO1xuXG4gICAgICAgICAgLy8gVGVzdCB2YWxpZCByYW5nZVxuICAgICAgICAgIGNvbnN0IGlucHV0VmFsaWQgPSB7IC4uLnZhbGlkSW5wdXQsIFt0ZXN0Q2FzZS5maWVsZF06IHRlc3RDYXNlLm1pbiB9O1xuICAgICAgICAgIGNvbnN0IHJlc3VsdFZhbGlkID0gdmFsaWRhdGVDcmVhdGVGaXRTaG93U2NvcmVJbnB1dChpbnB1dFZhbGlkKTtcbiAgICAgICAgICBleHBlY3QocmVzdWx0VmFsaWQuaXNWYWxpZCkudG9CZSh0cnVlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBkZXNjcmliZSgnQ29tbWVudCBmaWVsZCB2YWxpZGF0aW9uJywgKCkgPT4ge1xuICAgICAgaXQoJ3Nob3VsZCBhY2NlcHQgdmFsaWQgY29tbWVudHMnLCAoKSA9PiB7XG4gICAgICAgIGNvbnN0IGlucHV0ID0ge1xuICAgICAgICAgIC4uLnZhbGlkSW5wdXQsXG4gICAgICAgICAgYXBwZWFyYW5jZUNvbW1lbnRzOiAnR3JlYXQgcHJlc2VudGF0aW9uIHNraWxscycsXG4gICAgICAgICAgaGFuZGxpbmdDb21tZW50czogJ0NvbmZpZGVudCB3aXRoIHRoZSBjYXQnXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdmFsaWRhdGVDcmVhdGVGaXRTaG93U2NvcmVJbnB1dChpbnB1dCk7XG4gICAgICAgIFxuICAgICAgICBleHBlY3QocmVzdWx0LmlzVmFsaWQpLnRvQmUodHJ1ZSk7XG4gICAgICB9KTtcblxuICAgICAgaXQoJ3Nob3VsZCBhY2NlcHQgdW5kZWZpbmVkIGNvbW1lbnRzJywgKCkgPT4ge1xuICAgICAgICBjb25zdCBpbnB1dCA9IHtcbiAgICAgICAgICAuLi52YWxpZElucHV0LFxuICAgICAgICAgIGFwcGVhcmFuY2VDb21tZW50czogdW5kZWZpbmVkLFxuICAgICAgICAgIGhhbmRsaW5nQ29tbWVudHM6IHVuZGVmaW5lZFxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHZhbGlkYXRlQ3JlYXRlRml0U2hvd1Njb3JlSW5wdXQoaW5wdXQpO1xuICAgICAgICBcbiAgICAgICAgZXhwZWN0KHJlc3VsdC5pc1ZhbGlkKS50b0JlKHRydWUpO1xuICAgICAgfSk7XG5cbiAgICAgIGl0KCdzaG91bGQgcmVqZWN0IGNvbW1lbnRzIHRoYXQgYXJlIHRvbyBsb25nJywgKCkgPT4ge1xuICAgICAgICBjb25zdCBsb25nQ29tbWVudCA9ICdhJy5yZXBlYXQoNTAxKTtcbiAgICAgICAgY29uc3QgaW5wdXQgPSB7XG4gICAgICAgICAgLi4udmFsaWRJbnB1dCxcbiAgICAgICAgICBhcHBlYXJhbmNlQ29tbWVudHM6IGxvbmdDb21tZW50XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdmFsaWRhdGVDcmVhdGVGaXRTaG93U2NvcmVJbnB1dChpbnB1dCk7XG4gICAgICAgIFxuICAgICAgICBleHBlY3QocmVzdWx0LmlzVmFsaWQpLnRvQmUoZmFsc2UpO1xuICAgICAgICBleHBlY3QocmVzdWx0LmVycm9ycykudG9Db250YWluRXF1YWwoe1xuICAgICAgICAgIGZpZWxkOiAnYXBwZWFyYW5jZUNvbW1lbnRzJyxcbiAgICAgICAgICBtZXNzYWdlOiAnYXBwZWFyYW5jZUNvbW1lbnRzIGNhbm5vdCBleGNlZWQgNTAwIGNoYXJhY3RlcnMnLFxuICAgICAgICAgIHZhbHVlOiBsb25nQ29tbWVudFxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICBpdCgnc2hvdWxkIHJlamVjdCBub24tc3RyaW5nIGNvbW1lbnRzJywgKCkgPT4ge1xuICAgICAgICBjb25zdCBpbnB1dCA9IHtcbiAgICAgICAgICAuLi52YWxpZElucHV0LFxuICAgICAgICAgIGFwcGVhcmFuY2VDb21tZW50czogMTIzIGFzIGFueVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHZhbGlkYXRlQ3JlYXRlRml0U2hvd1Njb3JlSW5wdXQoaW5wdXQpO1xuICAgICAgICBcbiAgICAgICAgZXhwZWN0KHJlc3VsdC5pc1ZhbGlkKS50b0JlKGZhbHNlKTtcbiAgICAgICAgZXhwZWN0KHJlc3VsdC5lcnJvcnMpLnRvQ29udGFpbkVxdWFsKHtcbiAgICAgICAgICBmaWVsZDogJ2FwcGVhcmFuY2VDb21tZW50cycsXG4gICAgICAgICAgbWVzc2FnZTogJ2FwcGVhcmFuY2VDb21tZW50cyBtdXN0IGJlIGEgc3RyaW5nJyxcbiAgICAgICAgICB2YWx1ZTogMTIzXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGNvbGxlY3QgbXVsdGlwbGUgdmFsaWRhdGlvbiBlcnJvcnMnLCAoKSA9PiB7XG4gICAgICBjb25zdCBpbnB1dCA9IHtcbiAgICAgICAgLi4udmFsaWRJbnB1dCxcbiAgICAgICAgY2F0SWQ6ICcnLFxuICAgICAgICBwYXJ0aWNpcGFudE5hbWU6ICcnLFxuICAgICAgICBhdHRpcmU6IDAsXG4gICAgICAgIGF0dGVudGl2ZTogNixcbiAgICAgICAgYXBwZWFyYW5jZUNvbW1lbnRzOiAnYScucmVwZWF0KDUwMSlcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IHZhbGlkYXRlQ3JlYXRlRml0U2hvd1Njb3JlSW5wdXQoaW5wdXQpO1xuICAgICAgXG4gICAgICBleHBlY3QocmVzdWx0LmlzVmFsaWQpLnRvQmUoZmFsc2UpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5lcnJvcnMubGVuZ3RoKS50b0JlR3JlYXRlclRoYW4oNCk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCd2YWxpZGF0ZVVwZGF0ZUZpdFNob3dTY29yZUlucHV0JywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgdmFsaWRhdGUgYSBjb3JyZWN0IHVwZGF0ZSBpbnB1dCcsICgpID0+IHtcbiAgICAgIGNvbnN0IHVwZGF0ZUlucHV0OiBVcGRhdGVGaXRTaG93U2NvcmVJbnB1dCA9IHtcbiAgICAgICAgaWQ6ICdzY29yZS0xMjMnLFxuICAgICAgICAuLi52YWxpZElucHV0XG4gICAgICB9O1xuXG4gICAgICBjb25zdCByZXN1bHQgPSB2YWxpZGF0ZVVwZGF0ZUZpdFNob3dTY29yZUlucHV0KHVwZGF0ZUlucHV0KTtcbiAgICAgIFxuICAgICAgZXhwZWN0KHJlc3VsdC5pc1ZhbGlkKS50b0JlKHRydWUpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5lcnJvcnMpLnRvSGF2ZUxlbmd0aCgwKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmVqZWN0IG1pc3NpbmcgaWQnLCAoKSA9PiB7XG4gICAgICBjb25zdCB1cGRhdGVJbnB1dCA9IHsgLi4udmFsaWRJbnB1dCB9IGFzIGFueTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gdmFsaWRhdGVVcGRhdGVGaXRTaG93U2NvcmVJbnB1dCh1cGRhdGVJbnB1dCk7XG4gICAgICBcbiAgICAgIGV4cGVjdChyZXN1bHQuaXNWYWxpZCkudG9CZShmYWxzZSk7XG4gICAgICBleHBlY3QocmVzdWx0LmVycm9ycykudG9Db250YWluRXF1YWwoe1xuICAgICAgICBmaWVsZDogJ2lkJyxcbiAgICAgICAgbWVzc2FnZTogJ1Njb3JlIElEIGlzIHJlcXVpcmVkJyxcbiAgICAgICAgdmFsdWU6IHVuZGVmaW5lZFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHJlamVjdCBlbXB0eSBpZCcsICgpID0+IHtcbiAgICAgIGNvbnN0IHVwZGF0ZUlucHV0OiBVcGRhdGVGaXRTaG93U2NvcmVJbnB1dCA9IHtcbiAgICAgICAgaWQ6ICcnLFxuICAgICAgICAuLi52YWxpZElucHV0XG4gICAgICB9O1xuXG4gICAgICBjb25zdCByZXN1bHQgPSB2YWxpZGF0ZVVwZGF0ZUZpdFNob3dTY29yZUlucHV0KHVwZGF0ZUlucHV0KTtcbiAgICAgIFxuICAgICAgZXhwZWN0KHJlc3VsdC5pc1ZhbGlkKS50b0JlKGZhbHNlKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuZXJyb3JzKS50b0NvbnRhaW5FcXVhbCh7XG4gICAgICAgIGZpZWxkOiAnaWQnLFxuICAgICAgICBtZXNzYWdlOiAnU2NvcmUgSUQgY2Fubm90IGJlIGVtcHR5JyxcbiAgICAgICAgdmFsdWU6ICcnXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ3ZhbGlkYXRlQ2FsY3VsYXRlZFNjb3JlcycsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIHZhbGlkYXRlIGNvcnJlY3QgY2FsY3VsYXRlZCBzY29yZXMnLCAoKSA9PiB7XG4gICAgICBjb25zdCBzY29yZXMgPSB7XG4gICAgICAgIGFwcGVhcmFuY2VUb3RhbDogMTcsXG4gICAgICAgIGhhbmRsaW5nVG90YWw6IDEyLFxuICAgICAgICBkZW1vbnN0cmF0aW9uVG90YWw6IDE0LFxuICAgICAgICBoZWFsdGhFeGFtaW5hdGlvblRvdGFsOiAyMSxcbiAgICAgICAgZ3Jvb21pbmdDYXJlVG90YWw6IDEyLFxuICAgICAgICBrbm93bGVkZ2VUb3RhbDogMTEsXG4gICAgICAgIHRvdGFsU2NvcmU6IDg3XG4gICAgICB9O1xuXG4gICAgICBjb25zdCByZXN1bHQgPSB2YWxpZGF0ZUNhbGN1bGF0ZWRTY29yZXMoc2NvcmVzKTtcbiAgICAgIFxuICAgICAgZXhwZWN0KHJlc3VsdC5pc1ZhbGlkKS50b0JlKHRydWUpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5lcnJvcnMpLnRvSGF2ZUxlbmd0aCgwKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgdmFsaWRhdGUgbWF4aW11bSBwb3NzaWJsZSBzY29yZXMnLCAoKSA9PiB7XG4gICAgICBjb25zdCBzY29yZXMgPSB7XG4gICAgICAgIGFwcGVhcmFuY2VUb3RhbDogMjAsXG4gICAgICAgIGhhbmRsaW5nVG90YWw6IDE0LFxuICAgICAgICBkZW1vbnN0cmF0aW9uVG90YWw6IDE2LFxuICAgICAgICBoZWFsdGhFeGFtaW5hdGlvblRvdGFsOiAyMSxcbiAgICAgICAgZ3Jvb21pbmdDYXJlVG90YWw6IDE0LFxuICAgICAgICBrbm93bGVkZ2VUb3RhbDogMTIsXG4gICAgICAgIHRvdGFsU2NvcmU6IDEwMFxuICAgICAgfTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gdmFsaWRhdGVDYWxjdWxhdGVkU2NvcmVzKHNjb3Jlcyk7XG4gICAgICBcbiAgICAgIGV4cGVjdChyZXN1bHQuaXNWYWxpZCkudG9CZSh0cnVlKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuZXJyb3JzKS50b0hhdmVMZW5ndGgoMCk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHJlamVjdCBuZWdhdGl2ZSBzY29yZXMnLCAoKSA9PiB7XG4gICAgICBjb25zdCBzY29yZXMgPSB7XG4gICAgICAgIGFwcGVhcmFuY2VUb3RhbDogLTEsXG4gICAgICAgIGhhbmRsaW5nVG90YWw6IDEyLFxuICAgICAgICBkZW1vbnN0cmF0aW9uVG90YWw6IDE0LFxuICAgICAgICBoZWFsdGhFeGFtaW5hdGlvblRvdGFsOiAyMSxcbiAgICAgICAgZ3Jvb21pbmdDYXJlVG90YWw6IDEyLFxuICAgICAgICBrbm93bGVkZ2VUb3RhbDogMTEsXG4gICAgICAgIHRvdGFsU2NvcmU6IDg3XG4gICAgICB9O1xuXG4gICAgICBjb25zdCByZXN1bHQgPSB2YWxpZGF0ZUNhbGN1bGF0ZWRTY29yZXMoc2NvcmVzKTtcbiAgICAgIFxuICAgICAgZXhwZWN0KHJlc3VsdC5pc1ZhbGlkKS50b0JlKGZhbHNlKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuZXJyb3JzKS50b0NvbnRhaW5FcXVhbCh7XG4gICAgICAgIGZpZWxkOiAnYXBwZWFyYW5jZVRvdGFsJyxcbiAgICAgICAgbWVzc2FnZTogJ0FwcGVhcmFuY2UgJiBEZW1lYW5vciBjYW5ub3QgYmUgbmVnYXRpdmUnLFxuICAgICAgICB2YWx1ZTogLTFcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCByZWplY3Qgc2NvcmVzIGV4Y2VlZGluZyBjYXRlZ29yeSBtYXhpbXVtcycsICgpID0+IHtcbiAgICAgIGNvbnN0IHNjb3JlcyA9IHtcbiAgICAgICAgYXBwZWFyYW5jZVRvdGFsOiAyMSwgLy8gTWF4IGlzIDIwXG4gICAgICAgIGhhbmRsaW5nVG90YWw6IDE1LCAvLyBNYXggaXMgMTRcbiAgICAgICAgZGVtb25zdHJhdGlvblRvdGFsOiAxNywgLy8gTWF4IGlzIDE2XG4gICAgICAgIGhlYWx0aEV4YW1pbmF0aW9uVG90YWw6IDI1LCAvLyBNYXggaXMgMjRcbiAgICAgICAgZ3Jvb21pbmdDYXJlVG90YWw6IDE1LCAvLyBNYXggaXMgMTRcbiAgICAgICAga25vd2xlZGdlVG90YWw6IDEzLCAvLyBNYXggaXMgMTJcbiAgICAgICAgdG90YWxTY29yZTogMTAxIC8vIE1heCBpcyAxMDBcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IHZhbGlkYXRlQ2FsY3VsYXRlZFNjb3JlcyhzY29yZXMpO1xuICAgICAgXG4gICAgICBleHBlY3QocmVzdWx0LmlzVmFsaWQpLnRvQmUoZmFsc2UpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5lcnJvcnMpLnRvSGF2ZUxlbmd0aCg3KTsgLy8gQWxsIGNhdGVnb3JpZXMgZXhjZWVkIG1heGltdW1cbiAgICAgIFxuICAgICAgZXhwZWN0KHJlc3VsdC5lcnJvcnMpLnRvQ29udGFpbkVxdWFsKHtcbiAgICAgICAgZmllbGQ6ICdhcHBlYXJhbmNlVG90YWwnLFxuICAgICAgICBtZXNzYWdlOiAnQXBwZWFyYW5jZSAmIERlbWVhbm9yIGNhbm5vdCBleGNlZWQgMjAgcG9pbnRzJyxcbiAgICAgICAgdmFsdWU6IDIxXG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgZXhwZWN0KHJlc3VsdC5lcnJvcnMpLnRvQ29udGFpbkVxdWFsKHtcbiAgICAgICAgZmllbGQ6ICd0b3RhbFNjb3JlJyxcbiAgICAgICAgbWVzc2FnZTogJ1RvdGFsIFNjb3JlIGNhbm5vdCBleGNlZWQgMTAwIHBvaW50cycsXG4gICAgICAgIHZhbHVlOiAxMDFcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgndmFsaWRhdGVBbGxTY29yaW5nRmllbGRzUHJlc2VudCcsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIHZhbGlkYXRlIHdoZW4gYWxsIGZpZWxkcyBhcmUgcHJlc2VudCcsICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHZhbGlkYXRlQWxsU2NvcmluZ0ZpZWxkc1ByZXNlbnQodmFsaWRJbnB1dCk7XG4gICAgICBcbiAgICAgIGV4cGVjdChyZXN1bHQuaXNWYWxpZCkudG9CZSh0cnVlKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuZXJyb3JzKS50b0hhdmVMZW5ndGgoMCk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHJlamVjdCB3aGVuIHNjb3JpbmcgZmllbGRzIGFyZSBtaXNzaW5nJywgKCkgPT4ge1xuICAgICAgY29uc3QgaW5wdXQgPSB7IC4uLnZhbGlkSW5wdXQgfTtcbiAgICAgIGRlbGV0ZSAoaW5wdXQgYXMgYW55KS5hdHRpcmU7XG4gICAgICBkZWxldGUgKGlucHV0IGFzIGFueSkuZ2VuZXJhbEtub3dsZWRnZTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gdmFsaWRhdGVBbGxTY29yaW5nRmllbGRzUHJlc2VudChpbnB1dCk7XG4gICAgICBcbiAgICAgIGV4cGVjdChyZXN1bHQuaXNWYWxpZCkudG9CZShmYWxzZSk7XG4gICAgICBleHBlY3QocmVzdWx0LmVycm9ycykudG9Db250YWluRXF1YWwoe1xuICAgICAgICBmaWVsZDogJ2F0dGlyZScsXG4gICAgICAgIG1lc3NhZ2U6ICdSZXF1aXJlZCBzY29yaW5nIGZpZWxkIGF0dGlyZSBpcyBtaXNzaW5nJyxcbiAgICAgICAgdmFsdWU6IHVuZGVmaW5lZFxuICAgICAgfSk7XG4gICAgICBleHBlY3QocmVzdWx0LmVycm9ycykudG9Db250YWluRXF1YWwoe1xuICAgICAgICBmaWVsZDogJ2dlbmVyYWxLbm93bGVkZ2UnLFxuICAgICAgICBtZXNzYWdlOiAnUmVxdWlyZWQgc2NvcmluZyBmaWVsZCBnZW5lcmFsS25vd2xlZGdlIGlzIG1pc3NpbmcnLFxuICAgICAgICB2YWx1ZTogdW5kZWZpbmVkXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ1V0aWxpdHkgZnVuY3Rpb25zJywgKCkgPT4ge1xuICAgIGRlc2NyaWJlKCdnZXRTY29yaW5nRmllbGROYW1lcycsICgpID0+IHtcbiAgICAgIGl0KCdzaG91bGQgcmV0dXJuIGFsbCAyNSBzY29yaW5nIGZpZWxkIG5hbWVzJywgKCkgPT4ge1xuICAgICAgICBjb25zdCBmaWVsZE5hbWVzID0gZ2V0U2NvcmluZ0ZpZWxkTmFtZXMoKTtcbiAgICAgICAgXG4gICAgICAgIGV4cGVjdChmaWVsZE5hbWVzKS50b0hhdmVMZW5ndGgoMjUpO1xuICAgICAgICBleHBlY3QoZmllbGROYW1lcykudG9Db250YWluKCdhdHRpcmUnKTtcbiAgICAgICAgZXhwZWN0KGZpZWxkTmFtZXMpLnRvQ29udGFpbignZ2VuZXJhbEtub3dsZWRnZScpO1xuICAgICAgICBleHBlY3QoZmllbGROYW1lcykudG9Db250YWluKCd0b2VuYWlsc0NsaXBwZWQnKTtcbiAgICAgICAgZXhwZWN0KGZpZWxkTmFtZXMpLnRvQ29udGFpbignY29hdENsZWFuV2VsbEdyb29tZWQnKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZGVzY3JpYmUoJ2dldEZpZWxkUmFuZ2UnLCAoKSA9PiB7XG4gICAgICBpdCgnc2hvdWxkIHJldHVybiBjb3JyZWN0IHJhbmdlIGZvciB2YWxpZCBmaWVsZCcsICgpID0+IHtcbiAgICAgICAgY29uc3QgcmFuZ2UgPSBnZXRGaWVsZFJhbmdlKCdhdHRpcmUnKTtcbiAgICAgICAgXG4gICAgICAgIGV4cGVjdChyYW5nZSkudG9FcXVhbCh7XG4gICAgICAgICAgbWluOiAxLFxuICAgICAgICAgIG1heDogMTAsXG4gICAgICAgICAgZGVzY3JpcHRpb246ICdOZWF0LCBjbGVhbiwgYXBwcm9wcmlhdGUgYXR0aXJlJ1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICBpdCgnc2hvdWxkIHJldHVybiBudWxsIGZvciBpbnZhbGlkIGZpZWxkJywgKCkgPT4ge1xuICAgICAgICBjb25zdCByYW5nZSA9IGdldEZpZWxkUmFuZ2UoJ2ludmFsaWRGaWVsZCcpO1xuICAgICAgICBcbiAgICAgICAgZXhwZWN0KHJhbmdlKS50b0JlTnVsbCgpO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBkZXNjcmliZSgnZ2V0QWxsRmllbGRSYW5nZXMnLCAoKSA9PiB7XG4gICAgICBpdCgnc2hvdWxkIHJldHVybiBhbGwgZmllbGQgcmFuZ2VzJywgKCkgPT4ge1xuICAgICAgICBjb25zdCByYW5nZXMgPSBnZXRBbGxGaWVsZFJhbmdlcygpO1xuICAgICAgICBcbiAgICAgICAgZXhwZWN0KE9iamVjdC5rZXlzKHJhbmdlcykpLnRvSGF2ZUxlbmd0aCgyNSk7XG4gICAgICAgIGV4cGVjdChyYW5nZXMuYXR0aXJlKS50b0VxdWFsKHtcbiAgICAgICAgICBtaW46IDEsXG4gICAgICAgICAgbWF4OiAxMCxcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ05lYXQsIGNsZWFuLCBhcHByb3ByaWF0ZSBhdHRpcmUnXG4gICAgICAgIH0pO1xuICAgICAgICBleHBlY3QocmFuZ2VzLnRvZW5haWxzQ2xpcHBlZCkudG9FcXVhbCh7XG4gICAgICAgICAgbWluOiAxLFxuICAgICAgICAgIG1heDogNixcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RvZW5haWxzIGNsaXBwZWQnXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBkZXNjcmliZSgnY3JlYXRlVmFsaWRhdGlvblN1bW1hcnknLCAoKSA9PiB7XG4gICAgICBpdCgnc2hvdWxkIGNyZWF0ZSBzdW1tYXJ5IGZvciBubyBlcnJvcnMnLCAoKSA9PiB7XG4gICAgICAgIGNvbnN0IHN1bW1hcnkgPSBjcmVhdGVWYWxpZGF0aW9uU3VtbWFyeShbXSk7XG4gICAgICAgIFxuICAgICAgICBleHBlY3Qoc3VtbWFyeSkudG9CZSgnQWxsIHZhbGlkYXRpb25zIHBhc3NlZCcpO1xuICAgICAgfSk7XG5cbiAgICAgIGl0KCdzaG91bGQgY3JlYXRlIHN1bW1hcnkgZm9yIHNpbmdsZSBlcnJvcicsICgpID0+IHtcbiAgICAgICAgY29uc3QgZXJyb3JzID0gW3tcbiAgICAgICAgICBmaWVsZDogJ2F0dGlyZScsXG4gICAgICAgICAgbWVzc2FnZTogJ011c3QgYmUgYmV0d2VlbiAxIGFuZCAxMCcsXG4gICAgICAgICAgdmFsdWU6IDExXG4gICAgICAgIH1dO1xuXG4gICAgICAgIGNvbnN0IHN1bW1hcnkgPSBjcmVhdGVWYWxpZGF0aW9uU3VtbWFyeShlcnJvcnMpO1xuICAgICAgICBcbiAgICAgICAgZXhwZWN0KHN1bW1hcnkpLnRvQmUoJ0ZvdW5kIDEgdmFsaWRhdGlvbiBlcnJvcihzKTpcXG4tIGF0dGlyZTogTXVzdCBiZSBiZXR3ZWVuIDEgYW5kIDEwIChyZWNlaXZlZDogMTEpJyk7XG4gICAgICB9KTtcblxuICAgICAgaXQoJ3Nob3VsZCBjcmVhdGUgc3VtbWFyeSBmb3IgbXVsdGlwbGUgZXJyb3JzJywgKCkgPT4ge1xuICAgICAgICBjb25zdCBlcnJvcnMgPSBbXG4gICAgICAgICAgeyBmaWVsZDogJ2F0dGlyZScsIG1lc3NhZ2U6ICdNdXN0IGJlIGJldHdlZW4gMSBhbmQgMTAnLCB2YWx1ZTogMTEgfSxcbiAgICAgICAgICB7IGZpZWxkOiAnY2F0SWQnLCBtZXNzYWdlOiAnSXMgcmVxdWlyZWQnIH1cbiAgICAgICAgXTtcblxuICAgICAgICBjb25zdCBzdW1tYXJ5ID0gY3JlYXRlVmFsaWRhdGlvblN1bW1hcnkoZXJyb3JzKTtcbiAgICAgICAgXG4gICAgICAgIGV4cGVjdChzdW1tYXJ5KS50b0NvbnRhaW4oJ0ZvdW5kIDIgdmFsaWRhdGlvbiBlcnJvcihzKTonKTtcbiAgICAgICAgZXhwZWN0KHN1bW1hcnkpLnRvQ29udGFpbignLSBhdHRpcmU6IE11c3QgYmUgYmV0d2VlbiAxIGFuZCAxMCAocmVjZWl2ZWQ6IDExKScpO1xuICAgICAgICBleHBlY3Qoc3VtbWFyeSkudG9Db250YWluKCctIGNhdElkOiBJcyByZXF1aXJlZCcpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdDQVRFR09SWV9NQVhJTVVNUycsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIGhhdmUgY29ycmVjdCBtYXhpbXVtIHZhbHVlcycsICgpID0+IHtcbiAgICAgIGV4cGVjdChDQVRFR09SWV9NQVhJTVVNUy5hcHBlYXJhbmNlKS50b0JlKDIwKTtcbiAgICAgIGV4cGVjdChDQVRFR09SWV9NQVhJTVVNUy5oYW5kbGluZykudG9CZSgxNCk7XG4gICAgICBleHBlY3QoQ0FURUdPUllfTUFYSU1VTVMuZGVtb25zdHJhdGlvbikudG9CZSgxNik7XG4gICAgICBleHBlY3QoQ0FURUdPUllfTUFYSU1VTVMuaGVhbHRoRXhhbWluYXRpb24pLnRvQmUoMjQpO1xuICAgICAgZXhwZWN0KENBVEVHT1JZX01BWElNVU1TLmdyb29taW5nQ2FyZSkudG9CZSgxNCk7XG4gICAgICBleHBlY3QoQ0FURUdPUllfTUFYSU1VTVMua25vd2xlZGdlKS50b0JlKDEyKTtcbiAgICAgIGV4cGVjdChDQVRFR09SWV9NQVhJTVVNUy50b3RhbCkudG9CZSgxMDApO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBzdW0gdG8gY29ycmVjdCB0b3RhbCcsICgpID0+IHtcbiAgICAgIGNvbnN0IHN1bSA9IENBVEVHT1JZX01BWElNVU1TLmFwcGVhcmFuY2UgKyBcbiAgICAgICAgICAgICAgICAgIENBVEVHT1JZX01BWElNVU1TLmhhbmRsaW5nICsgXG4gICAgICAgICAgICAgICAgICBDQVRFR09SWV9NQVhJTVVNUy5kZW1vbnN0cmF0aW9uICsgXG4gICAgICAgICAgICAgICAgICBDQVRFR09SWV9NQVhJTVVNUy5oZWFsdGhFeGFtaW5hdGlvbiArIFxuICAgICAgICAgICAgICAgICAgQ0FURUdPUllfTUFYSU1VTVMuZ3Jvb21pbmdDYXJlICsgXG4gICAgICAgICAgICAgICAgICBDQVRFR09SWV9NQVhJTVVNUy5rbm93bGVkZ2U7XG4gICAgICBcbiAgICAgIGV4cGVjdChzdW0pLnRvQmUoQ0FURUdPUllfTUFYSU1VTVMudG90YWwpO1xuICAgIH0pO1xuICB9KTtcbn0pOyJdfQ==