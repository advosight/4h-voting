import {
  parseError,
  getUserFriendlyMessage,
  isRetryableError,
  retryWithBackoff,
  withRetry,
  handleOptimisticLockConflict,
  logError,
  DEFAULT_RETRY_OPTIONS
} from '../errorHandling';

// Mock console methods
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

beforeAll(() => {
  console.error = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
});

// Mock navigator and window for tests
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

Object.defineProperty(navigator, 'userAgent', {
  writable: true,
  value: 'Test User Agent'
});

Object.defineProperty(window, 'location', {
  writable: true,
  value: { href: 'http://localhost:3000/test' }
});

describe('parseError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('parses GraphQL errors correctly', () => {
    const error = {
      graphQLErrors: [{
        message: 'Validation failed',
        extensions: {
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid input',
            field: 'name'
          }
        }
      }]
    };

    const result = parseError(error);

    expect(result).toEqual({
      error: {
        type: 'VALIDATION_ERROR',
        message: 'Invalid input',
        field: 'name'
      }
    });
  });

  it('handles GraphQL errors without extensions', () => {
    const error = {
      graphQLErrors: [{
        message: 'Something went wrong'
      }]
    };

    const result = parseError(error);

    expect(result).toEqual({
      error: {
        type: 'SYSTEM_ERROR',
        message: 'Something went wrong',
        code: 'GRAPHQL_ERROR'
      }
    });
  });

  it('parses network errors correctly', () => {
    const error = {
      networkError: {
        statusCode: 500
      }
    };

    const result = parseError(error);

    expect(result).toEqual({
      error: {
        type: 'SYSTEM_ERROR',
        message: 'Server error. Please try again later.',
        code: 'SERVER_ERROR'
      }
    });
  });

  it('handles offline network errors', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    });

    const error = {
      networkError: {
        statusCode: 0
      }
    };

    const result = parseError(error);

    expect(result).toEqual({
      error: {
        type: 'NETWORK_ERROR',
        message: 'Network connection lost. Please check your internet connection.',
        code: 'NETWORK_OFFLINE'
      }
    });

    // Reset
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
  });

  it('handles timeout errors', () => {
    const error = {
      name: 'TimeoutError'
    };

    const result = parseError(error);

    expect(result).toEqual({
      error: {
        type: 'TIMEOUT_ERROR',
        message: 'Request timed out. Please try again.',
        code: 'REQUEST_TIMEOUT'
      }
    });
  });

  it('handles structured error responses', () => {
    const error = {
      error: {
        type: 'PERMISSION_ERROR',
        message: 'Access denied'
      }
    };

    const result = parseError(error);

    expect(result).toEqual(error);
  });

  it('handles unknown errors', () => {
    const error = new Error('Unknown error');

    const result = parseError(error);

    expect(result).toEqual({
      error: {
        type: 'SYSTEM_ERROR',
        message: 'Unknown error',
        code: 'UNKNOWN_ERROR'
      }
    });
  });
});

describe('getUserFriendlyMessage', () => {
  it('returns user-friendly message for validation errors', () => {
    const error = {
      error: {
        type: 'VALIDATION_ERROR',
        message: 'Value is required',
        field: 'firstName'
      }
    };

    const result = getUserFriendlyMessage(error);

    expect(result).toBe('Invalid first name: Value is required');
  });

  it('returns message without field for validation errors', () => {
    const error = {
      error: {
        type: 'VALIDATION_ERROR',
        message: 'Form is invalid'
      }
    };

    const result = getUserFriendlyMessage(error);

    expect(result).toBe('Form is invalid');
  });

  it('returns generic message for permission errors', () => {
    const error = {
      error: {
        type: 'PERMISSION_ERROR',
        message: 'Specific permission denied'
      }
    };

    const result = getUserFriendlyMessage(error);

    expect(result).toBe('You do not have permission to perform this action.');
  });

  it('returns generic message for not found errors', () => {
    const error = {
      error: {
        type: 'NOT_FOUND',
        message: 'User not found'
      }
    };

    const result = getUserFriendlyMessage(error);

    expect(result).toBe('The requested item was not found.');
  });

  it('returns conflict message', () => {
    const error = {
      error: {
        type: 'CONFLICT',
        message: 'Version conflict'
      }
    };

    const result = getUserFriendlyMessage(error);

    expect(result).toBe('This item has been modified by another user. Please refresh and try again.');
  });

  it('returns network error message', () => {
    const error = {
      error: {
        type: 'NETWORK_ERROR',
        message: 'Connection failed'
      }
    };

    const result = getUserFriendlyMessage(error);

    expect(result).toBe('Network connection problem. Please check your internet connection and try again.');
  });

  it('returns timeout error message', () => {
    const error = {
      error: {
        type: 'TIMEOUT_ERROR',
        message: 'Request timeout'
      }
    };

    const result = getUserFriendlyMessage(error);

    expect(result).toBe('The request took too long. Please try again.');
  });

  it('returns generic message for system errors', () => {
    const error = {
      error: {
        type: 'SYSTEM_ERROR',
        message: 'Internal server error'
      }
    };

    const result = getUserFriendlyMessage(error);

    expect(result).toBe('An unexpected error occurred. Please try again later.');
  });
});

describe('isRetryableError', () => {
  it('returns true for retryable error types', () => {
    const retryableTypes = ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'SYSTEM_ERROR'];

    retryableTypes.forEach(type => {
      const error = { error: { type, message: 'Test' } };
      expect(isRetryableError(error)).toBe(true);
    });
  });

  it('returns false for non-retryable error types', () => {
    const nonRetryableTypes = ['VALIDATION_ERROR', 'PERMISSION_ERROR', 'NOT_FOUND', 'CONFLICT'];

    nonRetryableTypes.forEach(type => {
      const error = { error: { type, message: 'Test' } };
      expect(isRetryableError(error)).toBe(false);
    });
  });
});

describe('retryWithBackoff', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('succeeds on first attempt', async () => {
    const fn = jest.fn().mockResolvedValue('success');

    const result = await retryWithBackoff(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and eventually succeeds', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValue('success');

    const result = await retryWithBackoff(fn, { maxRetries: 2 });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('exhausts retries and throws last error', async () => {
    const error = new Error('Persistent failure');
    const fn = jest.fn().mockRejectedValue(error);

    await expect(retryWithBackoff(fn, { maxRetries: 2 })).rejects.toThrow('Persistent failure');
    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('does not retry non-retryable errors', async () => {
    const error = { error: { type: 'VALIDATION_ERROR', message: 'Invalid' } };
    const fn = jest.fn().mockRejectedValue(error);

    await expect(retryWithBackoff(fn)).rejects.toEqual(error);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('uses custom retry options', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('Failure'));

    await expect(retryWithBackoff(fn, { maxRetries: 1 })).rejects.toThrow('Failure');
    expect(fn).toHaveBeenCalledTimes(2); // Initial + 1 retry
  });
});

describe('withRetry', () => {
  it('creates a retry wrapper function', async () => {
    const originalFn = jest.fn().mockResolvedValue('success');
    const wrappedFn = withRetry(originalFn);

    const result = await wrappedFn('arg1', 'arg2');

    expect(result).toBe('success');
    expect(originalFn).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('passes retry options to retryWithBackoff', async () => {
    const originalFn = jest.fn().mockRejectedValue(new Error('Failure'));
    const wrappedFn = withRetry(originalFn, { maxRetries: 1 });

    await expect(wrappedFn()).rejects.toThrow('Failure');
    expect(originalFn).toHaveBeenCalledTimes(2); // Initial + 1 retry
  });
});

describe('handleOptimisticLockConflict', () => {
  it('returns result when no conflict occurs', async () => {
    const operation = jest.fn().mockResolvedValue('success');
    const onConflict = jest.fn();

    const result = await handleOptimisticLockConflict(operation, onConflict);

    expect(result).toBe('success');
    expect(onConflict).not.toHaveBeenCalled();
  });

  it('calls onConflict for optimistic lock failures', async () => {
    const error = {
      error: {
        type: 'CONFLICT',
        code: 'OPTIMISTIC_LOCK_FAILED',
        message: 'Lock failed'
      }
    };
    const operation = jest.fn().mockRejectedValue(error);
    const onConflict = jest.fn().mockResolvedValue(undefined);

    await expect(handleOptimisticLockConflict(operation, onConflict)).rejects.toEqual(error);
    expect(onConflict).toHaveBeenCalled();
  });

  it('does not call onConflict for other conflict types', async () => {
    const error = {
      error: {
        type: 'CONFLICT',
        code: 'OTHER_CONFLICT',
        message: 'Other conflict'
      }
    };
    const operation = jest.fn().mockRejectedValue(error);
    const onConflict = jest.fn();

    await expect(handleOptimisticLockConflict(operation, onConflict)).rejects.toEqual(error);
    expect(onConflict).not.toHaveBeenCalled();
  });

  it('does not call onConflict for non-conflict errors', async () => {
    const error = new Error('Other error');
    const operation = jest.fn().mockRejectedValue(error);
    const onConflict = jest.fn();

    await expect(handleOptimisticLockConflict(operation, onConflict)).rejects.toThrow('Other error');
    expect(onConflict).not.toHaveBeenCalled();
  });
});

describe('logError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs error with context', () => {
    const error = new Error('Test error');
    
    logError(error, 'TestContext');

    expect(console.error).toHaveBeenCalledWith('Error occurred:', expect.objectContaining({
      context: 'TestContext',
      type: 'SYSTEM_ERROR',
      message: 'Test error',
      timestamp: expect.any(String),
      userAgent: 'Test User Agent',
      url: 'http://localhost:3000/test'
    }));
  });

  it('logs error without context', () => {
    const error = new Error('Test error');
    
    logError(error);

    expect(console.error).toHaveBeenCalledWith('Error occurred:', expect.objectContaining({
      context: undefined,
      type: 'SYSTEM_ERROR',
      message: 'Test error'
    }));
  });

  it('logs structured error details', () => {
    const error = {
      error: {
        type: 'VALIDATION_ERROR',
        message: 'Invalid input',
        field: 'name',
        code: 'REQUIRED',
        details: { minLength: 3 }
      }
    };
    
    logError(error, 'ValidationContext');

    expect(console.error).toHaveBeenCalledWith('Error occurred:', expect.objectContaining({
      context: 'ValidationContext',
      type: 'VALIDATION_ERROR',
      message: 'Invalid input',
      field: 'name',
      code: 'REQUIRED',
      details: { minLength: 3 }
    }));
  });
});

describe('DEFAULT_RETRY_OPTIONS', () => {
  it('has expected default values', () => {
    expect(DEFAULT_RETRY_OPTIONS).toEqual({
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2
    });
  });
});