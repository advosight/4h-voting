import {
  validateCreateFitShowScoreInput,
  validateUpdateFitShowScoreInput,
  validateCalculatedScores,
  validateAllScoringFieldsPresent,
  getScoringFieldNames,
  getFieldRange,
  getAllFieldRanges,
  createValidationSummary,
  CATEGORY_MAXIMUMS
} from '../fitShowScoreValidation';
import { CreateFitShowScoreInput, UpdateFitShowScoreInput } from '../fitShowScoreDataAccess';

describe('FitShowScoreValidation', () => {
  const validInput: CreateFitShowScoreInput = {
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
      const result = validateCreateFitShowScoreInput(validInput);
      
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

      const result = validateCreateFitShowScoreInput(inputWithComments);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    describe('Required field validation', () => {
      it('should reject missing catId', () => {
        const input = { ...validInput };
        delete (input as any).catId;

        const result = validateCreateFitShowScoreInput(input);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'catId',
          message: 'Cat ID is required',
          value: undefined
        });
      });

      it('should reject empty participantName', () => {
        const input = { ...validInput, participantName: '' };

        const result = validateCreateFitShowScoreInput(input);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'participantName',
          message: 'Participant name cannot be empty',
          value: ''
        });
      });

      it('should reject whitespace-only participantName', () => {
        const input = { ...validInput, participantName: '   ' };

        const result = validateCreateFitShowScoreInput(input);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'participantName',
          message: 'Participant name cannot be empty',
          value: '   '
        });
      });

      it('should reject non-string judgeId', () => {
        const input = { ...validInput, judgeId: 123 as any };

        const result = validateCreateFitShowScoreInput(input);
        
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

        const result = validateCreateFitShowScoreInput(input);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'attire',
          message: 'Neat, clean, appropriate attire must be between 1 and 10 points',
          value: 0
        });
      });

      it('should reject scores above maximum range', () => {
        const input = { ...validInput, attire: 11 };

        const result = validateCreateFitShowScoreInput(input);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'attire',
          message: 'Neat, clean, appropriate attire must be between 1 and 10 points',
          value: 11
        });
      });

      it('should reject non-integer scores', () => {
        const input = { ...validInput, attire: 8.5 };

        const result = validateCreateFitShowScoreInput(input);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'attire',
          message: 'Neat, clean, appropriate attire must be a whole number',
          value: 8.5
        });
      });

      it('should reject non-numeric scores', () => {
        const input = { ...validInput, attire: 'eight' as any };

        const result = validateCreateFitShowScoreInput(input);
        
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
          const resultBelow = validateCreateFitShowScoreInput(inputBelow);
          expect(resultBelow.isValid).toBe(false);

          // Test above maximum
          const inputAbove = { ...validInput, [testCase.field]: testCase.max + 1 };
          const resultAbove = validateCreateFitShowScoreInput(inputAbove);
          expect(resultAbove.isValid).toBe(false);

          // Test valid range
          const inputValid = { ...validInput, [testCase.field]: testCase.min };
          const resultValid = validateCreateFitShowScoreInput(inputValid);
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

        const result = validateCreateFitShowScoreInput(input);
        
        expect(result.isValid).toBe(true);
      });

      it('should accept undefined comments', () => {
        const input = {
          ...validInput,
          appearanceComments: undefined,
          handlingComments: undefined
        };

        const result = validateCreateFitShowScoreInput(input);
        
        expect(result.isValid).toBe(true);
      });

      it('should reject comments that are too long', () => {
        const longComment = 'a'.repeat(501);
        const input = {
          ...validInput,
          appearanceComments: longComment
        };

        const result = validateCreateFitShowScoreInput(input);
        
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
          appearanceComments: 123 as any
        };

        const result = validateCreateFitShowScoreInput(input);
        
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

      const result = validateCreateFitShowScoreInput(input);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(4);
    });
  });

  describe('validateUpdateFitShowScoreInput', () => {
    it('should validate a correct update input', () => {
      const updateInput: UpdateFitShowScoreInput = {
        id: 'score-123',
        ...validInput
      };

      const result = validateUpdateFitShowScoreInput(updateInput);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing id', () => {
      const updateInput = { ...validInput } as any;

      const result = validateUpdateFitShowScoreInput(updateInput);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'id',
        message: 'Score ID is required',
        value: undefined
      });
    });

    it('should reject empty id', () => {
      const updateInput: UpdateFitShowScoreInput = {
        id: '',
        ...validInput
      };

      const result = validateUpdateFitShowScoreInput(updateInput);
      
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

      const result = validateCalculatedScores(scores);
      
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

      const result = validateCalculatedScores(scores);
      
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

      const result = validateCalculatedScores(scores);
      
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

      const result = validateCalculatedScores(scores);
      
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
      const result = validateAllScoringFieldsPresent(validInput);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject when scoring fields are missing', () => {
      const input = { ...validInput };
      delete (input as any).attire;
      delete (input as any).generalKnowledge;

      const result = validateAllScoringFieldsPresent(input);
      
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
        const fieldNames = getScoringFieldNames();
        
        expect(fieldNames).toHaveLength(25);
        expect(fieldNames).toContain('attire');
        expect(fieldNames).toContain('generalKnowledge');
        expect(fieldNames).toContain('toenailsClipped');
        expect(fieldNames).toContain('coatCleanWellGroomed');
      });
    });

    describe('getFieldRange', () => {
      it('should return correct range for valid field', () => {
        const range = getFieldRange('attire');
        
        expect(range).toEqual({
          min: 1,
          max: 10,
          description: 'Neat, clean, appropriate attire'
        });
      });

      it('should return null for invalid field', () => {
        const range = getFieldRange('invalidField');
        
        expect(range).toBeNull();
      });
    });

    describe('getAllFieldRanges', () => {
      it('should return all field ranges', () => {
        const ranges = getAllFieldRanges();
        
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
        const summary = createValidationSummary([]);
        
        expect(summary).toBe('All validations passed');
      });

      it('should create summary for single error', () => {
        const errors = [{
          field: 'attire',
          message: 'Must be between 1 and 10',
          value: 11
        }];

        const summary = createValidationSummary(errors);
        
        expect(summary).toBe('Found 1 validation error(s):\n- attire: Must be between 1 and 10 (received: 11)');
      });

      it('should create summary for multiple errors', () => {
        const errors = [
          { field: 'attire', message: 'Must be between 1 and 10', value: 11 },
          { field: 'catId', message: 'Is required' }
        ];

        const summary = createValidationSummary(errors);
        
        expect(summary).toContain('Found 2 validation error(s):');
        expect(summary).toContain('- attire: Must be between 1 and 10 (received: 11)');
        expect(summary).toContain('- catId: Is required');
      });
    });
  });

  describe('CATEGORY_MAXIMUMS', () => {
    it('should have correct maximum values', () => {
      expect(CATEGORY_MAXIMUMS.appearance).toBe(20);
      expect(CATEGORY_MAXIMUMS.handling).toBe(14);
      expect(CATEGORY_MAXIMUMS.demonstration).toBe(16);
      expect(CATEGORY_MAXIMUMS.healthExamination).toBe(24);
      expect(CATEGORY_MAXIMUMS.groomingCare).toBe(14);
      expect(CATEGORY_MAXIMUMS.knowledge).toBe(12);
      expect(CATEGORY_MAXIMUMS.total).toBe(100);
    });

    it('should sum to correct total', () => {
      const sum = CATEGORY_MAXIMUMS.appearance + 
                  CATEGORY_MAXIMUMS.handling + 
                  CATEGORY_MAXIMUMS.demonstration + 
                  CATEGORY_MAXIMUMS.healthExamination + 
                  CATEGORY_MAXIMUMS.groomingCare + 
                  CATEGORY_MAXIMUMS.knowledge;
      
      expect(sum).toBe(CATEGORY_MAXIMUMS.total);
    });
  });
});