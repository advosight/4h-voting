import {
  ClassScoringValidationError,
  getClassScoringUserFriendlyMessage,
  validateClassScoringInput,
  validateHealthRequirements,
  withClassScoringRetry,
  retryClassScoringOperation,
  withOptimisticLockRetry,
  handleClassScoringOptimisticLock,
  logClassScoringError,
  createClassScoringErrorResponse,
  isClassScoringError,
  getValidationErrorSummary
} from '../classErrorHandling';

// Mock the base error handling functions
jest.mock('../errorHandling', () => ({
  ...jest.requireActual('../errorHandling'),
  logError: jest.fn(),
  retryWithBackoff: jest.fn(),
  withRetry: jest.fn((fn) => fn),
  parseError: jest.fn((error) => ({ error: { type: 'SYSTEM_ERROR', message: error.message } })),
  getUserFriendlyMessage: jest.fn(() => 'Base error message')
}));

describe('ClassScoringValidationError', () => {
  it('should create validation error with category and field', () => {
    const error = new ClassScoringValidationError(
      'Beauty score must be between 0 and 15',
      'beauty',
      'beautyScore',
      { minValue: 0, maxValue: 15, currentValue: 20 }
    );

    expect(error.message).toBe('Beauty score must be between 0 and 15');
    expect(error.category).toBe('beauty');
    expect(error.field).toBe('beautyScore');
    expect(error.validationDetails).toEqual({
      minValue: 0,
      maxValue: 15,
      currentValue: 20
    });
  });
});

describe('getClassScoringUserFriendlyMessage', () => {
  it('should return beauty score validation message', () => {
    const error = {
      error: {
        type: 'VALIDATION_ERROR' as const,
        message: 'Invalid beauty score',
        category: 'beauty' as const,
        validationDetails: { minValue: 0, maxValue: 15 }
      }
    };

    const message = getClassScoringUserFriendlyMessage(error);
    expect(message).toBe('Beauty score must be between 0 and 15 points.');
  });

  it('should return personality score validation message', () => {
    const error = {
      error: {
        type: 'VALIDATION_ERROR' as const,
        message: 'Invalid personality score',
        category: 'personality' as const,
        validationDetails: { minValue: 0, maxValue: 20 }
      }
    };

    const message = getClassScoringUserFriendlyMessage(error);
    expect(message).toBe('Personality score must be between 0 and 20 points.');
  });

  it('should return balance/proportion score validation message', () => {
    const error = {
      error: {
        type: 'VALIDATION_ERROR' as const,
        message: 'Invalid balance score',
        category: 'balanceProportion' as const,
        validationDetails: { minValue: 0, maxValue: 15 }
      }
    };

    const message = getClassScoringUserFriendlyMessage(error);
    expect(message).toBe('Balance/Proportion score must be between 0 and 15 points.');
  });

  it('should return health validation message', () => {
    const error = {
      error: {
        type: 'VALIDATION_ERROR' as const,
        message: 'Health validation failed',
        category: 'health' as const
      }
    };

    const message = getClassScoringUserFriendlyMessage(error);
    expect(message).toBe('Please complete all health and grooming evaluations before submitting.');
  });

  it('should return permission error message', () => {
    const error = {
      error: {
        type: 'PERMISSION_ERROR' as const,
        message: 'Access denied'
      }
    };

    const message = getClassScoringUserFriendlyMessage(error);
    expect(message).toBe('You do not have permission to perform class scoring. Please ensure you have judge privileges.');
  });

  it('should return not found error message for cat', () => {
    const error = {
      error: {
        type: 'NOT_FOUND' as const,
        message: 'Cat not found',
        field: 'cat'
      }
    };

    const message = getClassScoringUserFriendlyMessage(error);
    expect(message).toBe('The cat you are trying to score was not found. Please verify the cat ID or cage number.');
  });

  it('should return conflict error message', () => {
    const error = {
      error: {
        type: 'CONFLICT' as const,
        message: 'Score modified'
      }
    };

    const message = getClassScoringUserFriendlyMessage(error);
    expect(message).toBe('This class score has been modified by another judge. Please refresh the page to see the latest version.');
  });
});

describe('validateClassScoringInput', () => {
  it('should return no errors for valid input', () => {
    const input = {
      beautyScore: 10,
      personalityScore: 15,
      balanceProportionScore: 12
    };

    const errors = validateClassScoringInput(input);
    expect(errors).toHaveLength(0);
  });

  it('should return error for invalid beauty score', () => {
    const input = {
      beautyScore: 20 // Max is 15
    };

    const errors = validateClassScoringInput(input);
    expect(errors).toHaveLength(1);
    expect(errors[0].category).toBe('beauty');
    expect(errors[0].field).toBe('beautyScore');
    expect(errors[0].validationDetails.maxValue).toBe(15);
  });

  it('should return error for invalid personality score', () => {
    const input = {
      personalityScore: -5 // Min is 0
    };

    const errors = validateClassScoringInput(input);
    expect(errors).toHaveLength(1);
    expect(errors[0].category).toBe('personality');
    expect(errors[0].field).toBe('personalityScore');
    expect(errors[0].validationDetails.minValue).toBe(0);
  });

  it('should return error for invalid balance/proportion score', () => {
    const input = {
      balanceProportionScore: 25 // Max is 15
    };

    const errors = validateClassScoringInput(input);
    expect(errors).toHaveLength(1);
    expect(errors[0].category).toBe('balanceProportion');
    expect(errors[0].field).toBe('balanceProportionScore');
    expect(errors[0].validationDetails.maxValue).toBe(15);
  });

  it('should return multiple errors for multiple invalid scores', () => {
    const input = {
      beautyScore: 20,
      personalityScore: -5,
      balanceProportionScore: 25
    };

    const errors = validateClassScoringInput(input);
    expect(errors).toHaveLength(3);
  });
});

describe('validateHealthRequirements', () => {
  it('should return no errors when all health fields are provided', () => {
    const input = {
      coatCleanGroomed: true,
      teethGumsHealthy: true,
      eyesNoseClear: true,
      earsCleanMiteFree: true,
      toenailsClipped: true
    };

    const errors = validateHealthRequirements(input);
    expect(errors).toHaveLength(0);
  });

  it('should return error when health fields are missing', () => {
    const input = {
      coatCleanGroomed: true,
      // Missing other required fields
    };

    const errors = validateHealthRequirements(input);
    expect(errors).toHaveLength(1);
    expect(errors[0].category).toBe('health');
    expect(errors[0].field).toBe('healthGrooming');
    expect(errors[0].validationDetails.requiredFields).toContain('Teeth/Gums Healthy');
  });
});

describe('createClassScoringErrorResponse', () => {
  it('should create class scoring error response', () => {
    const response = createClassScoringErrorResponse(
      'VALIDATION_ERROR',
      'Invalid score',
      'beauty',
      'beautyScore',
      { minValue: 0, maxValue: 15 }
    );

    expect(response.error.type).toBe('VALIDATION_ERROR');
    expect(response.error.message).toBe('Invalid score');
    expect(response.error.scoringType).toBe('CLASS');
    expect(response.error.category).toBe('beauty');
    expect(response.error.field).toBe('beautyScore');
    expect(response.error.validationDetails).toEqual({ minValue: 0, maxValue: 15 });
  });
});

describe('isClassScoringError', () => {
  it('should identify class scoring errors', () => {
    const classError = {
      error: {
        type: 'VALIDATION_ERROR',
        message: 'Test error',
        scoringType: 'CLASS'
      }
    };

    const regularError = {
      error: {
        type: 'VALIDATION_ERROR',
        message: 'Test error'
      }
    };

    expect(isClassScoringError(classError)).toBe(true);
    expect(isClassScoringError(regularError)).toBe(false);
  });
});

describe('getValidationErrorSummary', () => {
  it('should return empty string for no errors', () => {
    const summary = getValidationErrorSummary([]);
    expect(summary).toBe('');
  });

  it('should return single error message', () => {
    const errors = [
      new ClassScoringValidationError('Beauty score invalid', 'beauty', 'beautyScore')
    ];

    const summary = getValidationErrorSummary(errors);
    expect(summary).toBe('Beauty score invalid');
  });

  it('should return summary for multiple errors', () => {
    const errors = [
      new ClassScoringValidationError('Beauty score invalid', 'beauty', 'beautyScore'),
      new ClassScoringValidationError('Personality score invalid', 'personality', 'personalityScore'),
      new ClassScoringValidationError('Health check missing', 'health', 'healthGrooming')
    ];

    const summary = getValidationErrorSummary(errors);
    expect(summary).toBe('Please fix 3 validation errors in: beauty, personality, health');
  });
});

describe('logClassScoringError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console.error
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should log class scoring error with context', () => {
    const error = new Error('Test error');
    const context = 'TestContext';
    const additionalData = {
      catId: 'cat123',
      judgeId: 'judge456',
      operation: 'test_operation'
    };

    logClassScoringError(error, context, additionalData);

    expect(console.error).toHaveBeenCalledWith(
      'Class scoring error occurred:',
      expect.objectContaining({
        context: 'ClassScoring:TestContext',
        catId: 'cat123',
        judgeId: 'judge456',
        operation: 'test_operation',
        timestamp: expect.any(String),
        userAgent: expect.any(String),
        url: expect.any(String)
      })
    );
  });
});

describe('handleClassScoringOptimisticLock', () => {
  it('should execute operation successfully', async () => {
    const operation = jest.fn().mockResolvedValue('success');
    const onConflict = jest.fn();

    const result = await handleClassScoringOptimisticLock(operation, onConflict);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalled();
    expect(onConflict).not.toHaveBeenCalled();
  });

  it('should handle optimistic lock conflict', async () => {
    const conflictError = {
      error: {
        type: 'CONFLICT',
        code: 'OPTIMISTIC_LOCK_FAILED',
        details: { conflictData: 'test' }
      }
    };
    
    const operation = jest.fn().mockRejectedValue(conflictError);
    const onConflict = jest.fn().mockResolvedValue(undefined);

    await expect(
      handleClassScoringOptimisticLock(operation, onConflict)
    ).rejects.toEqual(
      expect.objectContaining({
        error: expect.objectContaining({
          scoringType: 'CLASS'
        })
      })
    );

    expect(onConflict).toHaveBeenCalledWith({ conflictData: 'test' });
  });

  it('should re-throw non-conflict errors', async () => {
    const otherError = new Error('Other error');
    const operation = jest.fn().mockRejectedValue(otherError);
    const onConflict = jest.fn();

    await expect(
      handleClassScoringOptimisticLock(operation, onConflict)
    ).rejects.toBe(otherError);

    expect(onConflict).not.toHaveBeenCalled();
  });
});

describe('retryClassScoringOperation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
      fn();
      return 1 as any;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should succeed on first attempt', async () => {
    const operation = jest.fn().mockResolvedValue('success');
    
    const result = await retryClassScoringOperation(operation);
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable errors', async () => {
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue('success');
    
    const result = await retryClassScoringOperation(operation, { maxRetries: 2 });
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should call retry callback', async () => {
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue('success');
    const onRetry = jest.fn();
    
    await retryClassScoringOperation(operation, { onRetry });
    
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
  });

  it('should call final failure callback', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('Persistent error'));
    const onFinalFailure = jest.fn();
    
    await expect(
      retryClassScoringOperation(operation, { maxRetries: 2, onFinalFailure })
    ).rejects.toThrow('Persistent error');
    
    expect(onFinalFailure).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('withOptimisticLockRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
      fn();
      return 1 as any;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should succeed on first attempt', async () => {
    const operation = jest.fn().mockResolvedValue('success');
    
    const result = await withOptimisticLockRetry(operation);
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on conflict errors', async () => {
    const conflictError = {
      error: {
        type: 'CONFLICT',
        code: 'OPTIMISTIC_LOCK_FAILED',
        details: { conflictData: 'test' }
      }
    };
    
    const operation = jest.fn()
      .mockRejectedValueOnce(conflictError)
      .mockResolvedValue('success');
    
    const onConflict = jest.fn();
    
    const result = await withOptimisticLockRetry(operation, { onConflict });
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
    expect(onConflict).toHaveBeenCalledWith({ conflictData: 'test' }, 1);
  });

  it('should handle final conflict after max retries', async () => {
    const conflictError = {
      error: {
        type: 'CONFLICT',
        code: 'OPTIMISTIC_LOCK_FAILED',
        details: { conflictData: 'test' }
      }
    };
    
    const operation = jest.fn().mockRejectedValue(conflictError);
    const onFinalConflict = jest.fn();
    
    await expect(
      withOptimisticLockRetry(operation, { maxRetries: 2, onFinalConflict })
    ).rejects.toEqual(
      expect.objectContaining({
        error: expect.objectContaining({
          message: expect.stringContaining('multiple times')
        })
      })
    );
    
    expect(onFinalConflict).toHaveBeenCalledWith({ conflictData: 'test' });
  });
});

describe('ClassScoringNetworkMonitor', () => {
  let monitor: any;

  beforeEach(() => {
    const { ClassScoringNetworkMonitor } = require('../classErrorHandling');
    monitor = new ClassScoringNetworkMonitor();
  });

  afterEach(() => {
    if (monitor) {
      monitor.destroy();
    }
  });

  it('should initialize with current online status', () => {
    expect(monitor.getIsOnline()).toBe(navigator.onLine);
  });

  it('should add and remove listeners', () => {
    const listener = jest.fn();
    const removeListener = monitor.addListener(listener);
    
    expect(typeof removeListener).toBe('function');
    
    removeListener();
    // Listener should be removed from internal array
  });

  it('should wait for connection', async () => {
    // Mock online status
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });

    const result = await monitor.waitForConnection(1000);
    expect(result).toBe(true);
  });

  it('should timeout when waiting for connection', async () => {
    // Mock offline status
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    });

    const result = await monitor.waitForConnection(100);
    expect(result).toBe(false);
  });
});