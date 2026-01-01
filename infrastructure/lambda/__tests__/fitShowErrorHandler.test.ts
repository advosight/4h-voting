import { FitShowErrorHandler } from '../fitShowErrorHandler';

describe('FitShowErrorHandler', () => {
  describe('createError', () => {
    it('should create a basic error object', () => {
      const error = FitShowErrorHandler.createError('TEST_CODE', 'Test message');
      
      expect(error).toEqual({
        code: 'TEST_CODE',
        message: 'Test message',
        field: undefined,
        value: undefined,
        details: undefined
      });
    });

    it('should create an error with all fields', () => {
      const error = FitShowErrorHandler.createError(
        'TEST_CODE',
        'Test message',
        'testField',
        'testValue',
        { extra: 'info' }
      );
      
      expect(error).toEqual({
        code: 'TEST_CODE',
        message: 'Test message',
        field: 'testField',
        value: 'testValue',
        details: { extra: 'info' }
      });
    });
  });

  describe('handleValidationError', () => {
    it('should create validation error without expected range', () => {
      const error = FitShowErrorHandler.handleValidationError('attire', 15);
      
      expect(error.code).toBe('INVALID_SCORE_RANGE');
      expect(error.message).toBe('Invalid value for attire');
      expect(error.field).toBe('attire');
      expect(error.value).toBe(15);
    });

    it('should create validation error with expected range', () => {
      const error = FitShowErrorHandler.handleValidationError('attire', 15, '1-10');
      
      expect(error.code).toBe('INVALID_SCORE_RANGE');
      expect(error.message).toBe('Invalid value for attire. Expected range: 1-10');
      expect(error.field).toBe('attire');
      expect(error.value).toBe(15);
      expect(error.details?.expectedRange).toBe('1-10');
      expect(error.details?.receivedValue).toBe(15);
    });
  });

  describe('handleMissingFieldError', () => {
    it('should create missing field error', () => {
      const error = FitShowErrorHandler.handleMissingFieldError('catId');
      
      expect(error.code).toBe('MISSING_REQUIRED_FIELD');
      expect(error.message).toBe("Required field 'catId' is missing");
      expect(error.field).toBe('catId');
    });
  });

  describe('handleUnauthorizedJudgeError', () => {
    it('should create unauthorized judge error', () => {
      const error = FitShowErrorHandler.handleUnauthorizedJudgeError('judge123');
      
      expect(error.code).toBe('UNAUTHORIZED_JUDGE');
      expect(error.message).toBe('User lacks judge permissions for fit and show scoring');
      expect(error.field).toBe('judgeId');
      expect(error.value).toBe('judge123');
    });
  });

  describe('handleCatNotFoundError', () => {
    it('should create cat not found error', () => {
      const error = FitShowErrorHandler.handleCatNotFoundError('cat123');
      
      expect(error.code).toBe('CAT_NOT_FOUND');
      expect(error.message).toBe("Cat with ID 'cat123' not found");
      expect(error.field).toBe('catId');
      expect(error.value).toBe('cat123');
    });
  });

  describe('handleScoreAlreadyFinalizedError', () => {
    it('should create score already finalized error', () => {
      const error = FitShowErrorHandler.handleScoreAlreadyFinalizedError('score123');
      
      expect(error.code).toBe('SCORE_ALREADY_FINALIZED');
      expect(error.message).toBe('Cannot modify finalized score without proper authorization');
      expect(error.field).toBe('scoreId');
      expect(error.value).toBe('score123');
    });
  });

  describe('handleCommentTooLongError', () => {
    it('should create comment too long error with default max length', () => {
      const error = FitShowErrorHandler.handleCommentTooLongError('appearanceComments', 600);
      
      expect(error.code).toBe('COMMENT_TOO_LONG');
      expect(error.message).toBe('Comment exceeds maximum length of 500 characters');
      expect(error.field).toBe('appearanceComments');
      expect(error.value).toBe(600);
      expect(error.details?.maxLength).toBe(500);
      expect(error.details?.actualLength).toBe(600);
    });

    it('should create comment too long error with custom max length', () => {
      const error = FitShowErrorHandler.handleCommentTooLongError('notes', 1200, 1000);
      
      expect(error.code).toBe('COMMENT_TOO_LONG');
      expect(error.message).toBe('Comment exceeds maximum length of 1000 characters');
      expect(error.field).toBe('notes');
      expect(error.value).toBe(1200);
      expect(error.details?.maxLength).toBe(1000);
      expect(error.details?.actualLength).toBe(1200);
    });
  });

  describe('handleConcurrentModificationError', () => {
    it('should create concurrent modification error', () => {
      const error = FitShowErrorHandler.handleConcurrentModificationError('score123', 1, 2);
      
      expect(error.code).toBe('CONCURRENT_MODIFICATION');
      expect(error.message).toBe('Score was modified by another user. Please refresh and try again.');
      expect(error.field).toBe('scoreId');
      expect(error.value).toBe('score123');
      expect(error.details?.expectedVersion).toBe(1);
      expect(error.details?.actualVersion).toBe(2);
    });
  });

  describe('validateScoreRange', () => {
    it('should return null for valid score', () => {
      const error = FitShowErrorHandler.validateScoreRange('attire', 5, 1, 10);
      expect(error).toBeNull();
    });

    it('should return error for score below minimum', () => {
      const error = FitShowErrorHandler.validateScoreRange('attire', 0, 1, 10);
      expect(error).not.toBeNull();
      expect(error?.code).toBe('INVALID_SCORE_RANGE');
      expect(error?.field).toBe('attire');
      expect(error?.value).toBe(0);
    });

    it('should return error for score above maximum', () => {
      const error = FitShowErrorHandler.validateScoreRange('attire', 15, 1, 10);
      expect(error).not.toBeNull();
      expect(error?.code).toBe('INVALID_SCORE_RANGE');
      expect(error?.field).toBe('attire');
      expect(error?.value).toBe(15);
    });

    it('should return error for non-number value', () => {
      const error = FitShowErrorHandler.validateScoreRange('attire', 'invalid' as any, 1, 10);
      expect(error).not.toBeNull();
      expect(error?.code).toBe('INVALID_SCORE_RANGE');
      expect(error?.field).toBe('attire');
      expect(error?.value).toBe('invalid');
    });
  });

  describe('validateRequiredField', () => {
    it('should return null for valid field', () => {
      const error = FitShowErrorHandler.validateRequiredField('catId', 'cat123');
      expect(error).toBeNull();
    });

    it('should return error for undefined field', () => {
      const error = FitShowErrorHandler.validateRequiredField('catId', undefined);
      expect(error).not.toBeNull();
      expect(error?.code).toBe('MISSING_REQUIRED_FIELD');
      expect(error?.field).toBe('catId');
    });

    it('should return error for null field', () => {
      const error = FitShowErrorHandler.validateRequiredField('catId', null);
      expect(error).not.toBeNull();
      expect(error?.code).toBe('MISSING_REQUIRED_FIELD');
      expect(error?.field).toBe('catId');
    });

    it('should return error for empty string', () => {
      const error = FitShowErrorHandler.validateRequiredField('catId', '');
      expect(error).not.toBeNull();
      expect(error?.code).toBe('MISSING_REQUIRED_FIELD');
      expect(error?.field).toBe('catId');
    });
  });

  describe('validateCommentLength', () => {
    it('should return null for valid comment', () => {
      const error = FitShowErrorHandler.validateCommentLength('comments', 'Valid comment');
      expect(error).toBeNull();
    });

    it('should return null for empty comment', () => {
      const error = FitShowErrorHandler.validateCommentLength('comments', '');
      expect(error).toBeNull();
    });

    it('should return error for comment exceeding default length', () => {
      const longComment = 'a'.repeat(501);
      const error = FitShowErrorHandler.validateCommentLength('comments', longComment);
      expect(error).not.toBeNull();
      expect(error?.code).toBe('COMMENT_TOO_LONG');
      expect(error?.field).toBe('comments');
      expect(error?.value).toBe(501);
    });

    it('should return error for comment exceeding custom length', () => {
      const longComment = 'a'.repeat(101);
      const error = FitShowErrorHandler.validateCommentLength('comments', longComment, 100);
      expect(error).not.toBeNull();
      expect(error?.code).toBe('COMMENT_TOO_LONG');
      expect(error?.field).toBe('comments');
      expect(error?.value).toBe(101);
    });
  });

  describe('validateAllFitShowScores', () => {
    const validScores = {
      catId: 'cat123',
      judgeId: 'judge123',
      attire: 8,
      attentive: 4,
      courteous: 5,
      controlEquipment: 7,
      pickupCarrying: 3,
      showingHeadShape: 4,
      showingBodyType: 3,
      showingTail: 4,
      showingCoatTexture: 3,
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
      fourHKnowledge: 3,
      appearanceComments: 'Good appearance',
      handlingComments: 'Excellent handling'
    };

    it('should return no errors for valid scores', () => {
      const errors = FitShowErrorHandler.validateAllFitShowScores(validScores);
      expect(errors).toHaveLength(0);
    });

    it('should return errors for missing required fields', () => {
      const invalidScores = { ...validScores };
      (invalidScores as any).catId = undefined;
      (invalidScores as any).judgeId = undefined;

      const errors = FitShowErrorHandler.validateAllFitShowScores(invalidScores);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'catId')).toBe(true);
      expect(errors.some(e => e.field === 'judgeId')).toBe(true);
    });

    it('should return errors for invalid score ranges', () => {
      const invalidScores = {
        ...validScores,
        attire: 15, // Should be 1-10
        attentive: 0, // Should be 1-5
        toenailsClipped: 10 // Should be 1-6
      };

      const errors = FitShowErrorHandler.validateAllFitShowScores(invalidScores);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'attire')).toBe(true);
      expect(errors.some(e => e.field === 'attentive')).toBe(true);
      expect(errors.some(e => e.field === 'toenailsClipped')).toBe(true);
    });

    it('should return errors for comments that are too long', () => {
      const invalidScores = {
        ...validScores,
        appearanceComments: 'a'.repeat(501),
        handlingComments: 'b'.repeat(501)
      };

      const errors = FitShowErrorHandler.validateAllFitShowScores(invalidScores);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'appearanceComments')).toBe(true);
      expect(errors.some(e => e.field === 'handlingComments')).toBe(true);
    });
  });

  describe('formatErrorForResponse', () => {
    it('should format error for GraphQL response', () => {
      const error = FitShowErrorHandler.createError(
        'TEST_CODE',
        'Test message',
        'testField',
        'testValue',
        { extra: 'info' }
      );

      const formatted = FitShowErrorHandler.formatErrorForResponse(error);
      
      expect(formatted).toEqual({
        errorType: 'TEST_CODE',
        errorMessage: 'Test message',
        errorInfo: {
          field: 'testField',
          value: 'testValue',
          details: { extra: 'info' }
        }
      });
    });
  });

  describe('handleResolverError', () => {
    const mockEvent = {
      info: { fieldName: 'createFitShowScore' },
      arguments: { input: { catId: 'cat123' } }
    } as any;

    const mockContext = {
      awsRequestId: 'request123'
    } as any;

    it('should handle FitShowError', async () => {
      const fitShowError = FitShowErrorHandler.createError('TEST_CODE', 'Test message');
      
      const result = await FitShowErrorHandler.handleResolverError(
        mockEvent,
        mockContext,
        fitShowError
      );

      expect(result.errorType).toBe('TEST_CODE');
      expect(result.errorMessage).toBe('Test message');
    });

    it('should handle regular Error', async () => {
      const regularError = new Error('Regular error message');
      
      const result = await FitShowErrorHandler.handleResolverError(
        mockEvent,
        mockContext,
        regularError
      );

      expect(result.errorType).toBe('UNKNOWN_ERROR');
      expect(result.errorMessage).toBe('An unexpected error occurred');
    });
  });
});