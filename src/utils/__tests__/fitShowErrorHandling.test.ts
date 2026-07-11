import { FitShowErrorHandler } from '../fitShowErrorHandling';
import { FitShowScore } from '../../types/scoring';

describe('FitShowErrorHandler', () => {
  beforeEach(() => {
    FitShowErrorHandler.clearErrorLog();
    vi.clearAllMocks();
  });

  describe('logError', () => {
    it('should log error with context', () => {
      const error = new Error('Test error');
      const context = {
        operation: 'createFitShowScore',
        catId: 'cat123',
        timestamp: new Date()
      };

      FitShowErrorHandler.logError(error, context);

      const errorLog = FitShowErrorHandler.getErrorLog();
      expect(errorLog).toHaveLength(1);
      expect(errorLog[0].error).toBe(error);
      expect(errorLog[0].context).toBe(context);
    });

    it('should limit error log to 50 entries', () => {
      const context = {
        operation: 'test',
        timestamp: new Date()
      };

      // Add 60 errors
      for (let i = 0; i < 60; i++) {
        FitShowErrorHandler.logError(new Error(`Error ${i}`), context);
      }

      const errorLog = FitShowErrorHandler.getErrorLog();
      expect(errorLog).toHaveLength(50);
      
      // Should keep the most recent 50
      expect(errorLog[0].error.message).toBe('Error 59');
      expect(errorLog[49].error.message).toBe('Error 10');
    });
  });

  describe('createNetworkError', () => {
    it('should create network error with all fields', () => {
      const originalError = new Error('Original error');
      const networkError = FitShowErrorHandler.createNetworkError(
        'Network failed',
        'createScore',
        'NETWORK_ERROR',
        2,
        originalError
      );

      expect(networkError).toEqual({
        message: 'Network failed',
        code: 'NETWORK_ERROR',
        operation: 'createScore',
        timestamp: expect.any(Date),
        retryCount: 2,
        originalError
      });
    });

    it('should create network error with defaults', () => {
      const networkError = FitShowErrorHandler.createNetworkError(
        'Network failed',
        'createScore'
      );

      expect(networkError).toEqual({
        message: 'Network failed',
        code: 'NETWORK_ERROR',
        operation: 'createScore',
        timestamp: expect.any(Date),
        retryCount: 0,
        originalError: undefined
      });
    });
  });

  describe('isNetworkError', () => {
    it('should identify network errors', () => {
      const networkError = FitShowErrorHandler.createNetworkError('Test', 'op');
      expect(FitShowErrorHandler.isNetworkError(networkError)).toBe(true);
    });

    it('should reject regular errors', () => {
      const regularError = new Error('Test');
      expect(FitShowErrorHandler.isNetworkError(regularError)).toBe(false);
    });

    it('should reject invalid objects', () => {
      expect(FitShowErrorHandler.isNetworkError({})).toBe(false);
      expect(FitShowErrorHandler.isNetworkError(null)).toBe(false);
      expect(FitShowErrorHandler.isNetworkError(undefined)).toBe(false);
    });
  });

  describe('isValidationError', () => {
    it('should identify validation errors', () => {
      const validationError = { field: 'attire', message: 'Invalid score' };
      expect(FitShowErrorHandler.isValidationError(validationError)).toBe(true);
    });

    it('should reject objects without required fields', () => {
      expect(FitShowErrorHandler.isValidationError({ field: 'attire' })).toBe(false);
      expect(FitShowErrorHandler.isValidationError({ message: 'Invalid' })).toBe(false);
      expect(FitShowErrorHandler.isValidationError({})).toBe(false);
    });
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await FitShowErrorHandler.withRetry(
        operation,
        'testOperation',
        3,
        100
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Attempt 1 failed'))
        .mockRejectedValueOnce(new Error('Attempt 2 failed'))
        .mockResolvedValue('success');

      const result = await FitShowErrorHandler.withRetry(
        operation,
        'testOperation',
        3,
        10 // Short delay for testing
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw network error after max retries', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'));

      await expect(
        FitShowErrorHandler.withRetry(operation, 'testOperation', 2, 10)
      ).rejects.toMatchObject({
        code: 'MAX_RETRIES_EXCEEDED',
        operation: 'testOperation',
        retryCount: 2
      });

      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should use exponential backoff', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');

      const startTime = Date.now();
      
      await FitShowErrorHandler.withRetry(operation, 'testOperation', 3, 100);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should have waited at least 100ms + 200ms = 300ms
      expect(duration).toBeGreaterThan(250);
    });
  });

  describe('validateFitShowScore', () => {
    const validScore: Partial<FitShowScore> = {
      catId: 'cat123',
      judgeId: 'judge123',
      participantName: 'John Doe',
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

    it('should return no errors for valid score', () => {
      const errors = FitShowErrorHandler.validateFitShowScore(validScore);
      expect(errors).toHaveLength(0);
    });

    it('should return errors for missing required fields', () => {
      const invalidScore = { ...validScore };
      delete invalidScore.catId;
      delete invalidScore.judgeId;
      delete invalidScore.participantName;

      const errors = FitShowErrorHandler.validateFitShowScore(invalidScore);
      
      expect(errors).toContainEqual({
        field: 'catId',
        message: 'Cat ID is required'
      });
      expect(errors).toContainEqual({
        field: 'judgeId',
        message: 'Judge ID is required'
      });
      expect(errors).toContainEqual({
        field: 'participantName',
        message: 'Participant name is required'
      });
    });

    it('should return errors for empty participant name', () => {
      const invalidScore = { ...validScore, participantName: '   ' };
      const errors = FitShowErrorHandler.validateFitShowScore(invalidScore);
      
      expect(errors).toContainEqual({
        field: 'participantName',
        message: 'Participant name is required'
      });
    });

    it('should return errors for invalid score ranges', () => {
      const invalidScore = {
        ...validScore,
        attire: 15, // Should be 1-10
        attentive: 0, // Should be 1-5
        toenailsClipped: 10 // Should be 1-6
      };

      const errors = FitShowErrorHandler.validateFitShowScore(invalidScore);
      
      expect(errors).toContainEqual({
        field: 'attire',
        message: 'Score must be between 1 and 10',
        value: 15,
        expectedRange: '1-10'
      });
      expect(errors).toContainEqual({
        field: 'attentive',
        message: 'Score must be between 1 and 5',
        value: 0,
        expectedRange: '1-5'
      });
      expect(errors).toContainEqual({
        field: 'toenailsClipped',
        message: 'Score must be between 1 and 6',
        value: 10,
        expectedRange: '1-6'
      });
    });

    it('should return errors for comments that are too long', () => {
      const longComment = 'a'.repeat(501);
      const invalidScore = {
        ...validScore,
        appearanceComments: longComment,
        handlingComments: longComment
      };

      const errors = FitShowErrorHandler.validateFitShowScore(invalidScore);
      
      expect(errors).toContainEqual({
        field: 'appearanceComments',
        message: 'Comment must be 500 characters or less',
        value: 501,
        expectedRange: '0-500'
      });
      expect(errors).toContainEqual({
        field: 'handlingComments',
        message: 'Comment must be 500 characters or less',
        value: 501,
        expectedRange: '0-500'
      });
    });

    it('should handle non-number score values', () => {
      const invalidScore = {
        ...validScore,
        attire: 'invalid' as any,
        attentive: null as any
      };

      const errors = FitShowErrorHandler.validateFitShowScore(invalidScore);
      
      expect(errors).toContainEqual({
        field: 'attire',
        message: 'Score must be between 1 and 10',
        value: 'invalid',
        expectedRange: '1-10'
      });
      expect(errors).toContainEqual({
        field: 'attentive',
        message: 'Score must be between 1 and 5',
        value: null,
        expectedRange: '1-5'
      });
    });
  });

  describe('calculateFitShowTotals', () => {
    const scoreData = {
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
      fourHKnowledge: 3
    };

    it('should calculate all totals correctly', () => {
      const totals = FitShowErrorHandler.calculateFitShowTotals(scoreData);

      expect(totals).toEqual({
        appearanceTotal: 17, // 8 + 4 + 5
        handlingTotal: 10, // 7 + 3
        demonstrationTotal: 14, // 4 + 3 + 4 + 3
        healthExaminationTotal: 20, // 2 + 2 + 2 + 2 + 2 + 2 + 2 + 3 + 5
        groomingCareTotal: 13, // 3 + 7 + 3
        knowledgeTotal: 12, // 3 + 3 + 3 + 3
        totalScore: 86 // Sum of all category totals
      });
    });

    it('should handle missing fields as zero', () => {
      const partialScore = {
        attire: 8,
        attentive: 4
        // Missing courteous and others
      };

      const totals = FitShowErrorHandler.calculateFitShowTotals(partialScore);

      expect(totals.appearanceTotal).toBe(12); // 8 + 4 + 0
      expect(totals.handlingTotal).toBe(0); // 0 + 0
      expect(totals.totalScore).toBe(12);
    });

    it('should handle non-number values as zero', () => {
      const invalidScore = {
        attire: 'invalid' as any,
        attentive: null as any,
        courteous: undefined as any
      };

      const totals = FitShowErrorHandler.calculateFitShowTotals(invalidScore);

      expect(totals.appearanceTotal).toBe(0);
      expect(totals.totalScore).toBe(0);
    });
  });

  describe('formatErrorForUser', () => {
    it('should format network errors with specific messages', () => {
      const networkError = FitShowErrorHandler.createNetworkError(
        'Connection failed',
        'createScore',
        'NETWORK_ERROR'
      );

      const formatted = FitShowErrorHandler.formatErrorForUser(networkError);
      expect(formatted).toBe('Network connection error. Please check your internet connection and try again.');
    });

    it('should format timeout errors', () => {
      const timeoutError = FitShowErrorHandler.createNetworkError(
        'Request timed out',
        'createScore',
        'TIMEOUT_ERROR'
      );

      const formatted = FitShowErrorHandler.formatErrorForUser(timeoutError);
      expect(formatted).toBe('The request timed out. Please try again.');
    });

    it('should format server errors', () => {
      const serverError = FitShowErrorHandler.createNetworkError(
        'Internal server error',
        'createScore',
        'SERVER_ERROR'
      );

      const formatted = FitShowErrorHandler.formatErrorForUser(serverError);
      expect(formatted).toBe('Server error. Please try again in a few moments.');
    });

    it('should format max retries exceeded errors', () => {
      const maxRetriesError = FitShowErrorHandler.createNetworkError(
        'Failed after 3 attempts',
        'createScore',
        'MAX_RETRIES_EXCEEDED'
      );

      const formatted = FitShowErrorHandler.formatErrorForUser(maxRetriesError);
      expect(formatted).toBe('Unable to complete the operation after multiple attempts. Please try again later.');
    });

    it('should format regular errors', () => {
      const regularError = new Error('Something went wrong');
      const formatted = FitShowErrorHandler.formatErrorForUser(regularError);
      expect(formatted).toBe('Something went wrong');
    });

    it('should handle errors without messages', () => {
      const errorWithoutMessage = new Error();
      errorWithoutMessage.message = '';
      
      const formatted = FitShowErrorHandler.formatErrorForUser(errorWithoutMessage);
      expect(formatted).toBe('An unexpected error occurred.');
    });
  });

  describe('handleAsyncOperation', () => {
    it('should return success result for successful operation', async () => {
      const operation = vi.fn().mockResolvedValue('success data');
      
      const result = await FitShowErrorHandler.handleAsyncOperation(
        operation,
        'testOperation'
      );

      expect(result).toEqual({
        success: true,
        data: 'success data'
      });
    });

    it('should return error result for failed operation', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Operation failed'));
      
      const result = await FitShowErrorHandler.handleAsyncOperation(
        operation,
        'testOperation'
      );

      expect(result).toEqual({
        success: false,
        error: expect.objectContaining({
          code: 'UNKNOWN_ERROR',
          operation: 'testOperation',
          originalError: expect.any(Error)
        })
      });
    });

    it('should preserve network errors', async () => {
      const networkError = FitShowErrorHandler.createNetworkError(
        'Network failed',
        'testOperation',
        'NETWORK_ERROR'
      );
      const operation = vi.fn().mockRejectedValue(networkError);
      
      const result = await FitShowErrorHandler.handleAsyncOperation(
        operation,
        'testOperation'
      );

      expect(result).toEqual({
        success: false,
        error: networkError
      });
    });
  });

  describe('detectConflictFields', () => {
    const serverScore: FitShowScore = {
      id: 'score123',
      catId: 'cat123',
      participantName: 'John Doe',
      judgeId: 'judge123',
      judgeName: 'Judge Smith',
      attire: 8,
      attentive: 4,
      courteous: 5,
      appearanceComments: 'Server comment',
      isFinalized: true,
      // ... other required fields with default values
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
      totalScore: 85,
      appearanceTotal: 17,
      handlingTotal: 10,
      demonstrationTotal: 14,
      healthExaminationTotal: 20,
      groomingCareTotal: 13,
      knowledgeTotal: 12,
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-01T11:00:00Z'
    };

    it('should detect conflicting fields', () => {
      const localScore = {
        attire: 9, // Different from server (8)
        appearanceComments: 'Local comment', // Different from server
        isFinalized: false // Different from server (true)
      };

      const conflicts = FitShowErrorHandler.detectConflictFields(localScore, serverScore);
      
      expect(conflicts).toEqual(['attire', 'appearanceComments', 'isFinalized']);
    });

    it('should not detect conflicts for matching values', () => {
      const localScore = {
        attire: 8, // Same as server
        attentive: 4 // Same as server
      };

      const conflicts = FitShowErrorHandler.detectConflictFields(localScore, serverScore);
      
      expect(conflicts).toEqual([]);
    });

    it('should ignore undefined local values', () => {
      const localScore = {
        attire: undefined,
        attentive: 4 // Same as server
      };

      const conflicts = FitShowErrorHandler.detectConflictFields(localScore, serverScore);
      
      expect(conflicts).toEqual([]);
    });

    it('should detect conflicts for null vs defined values', () => {
      const localScore = {
        appearanceComments: null // Different from server (has value)
      };

      const conflicts = FitShowErrorHandler.detectConflictFields(localScore, serverScore);
      
      expect(conflicts).toEqual(['appearanceComments']);
    });
  });
});