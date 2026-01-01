import {
  ErrorType,
  AppError,
  ValidationError,
  PermissionError,
  NotFoundError,
  ConflictError,
  SystemError,
  handleError,
  createErrorResponse
} from '../errorHandler';

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe('AppError', () => {
  it('creates error with all properties', () => {
    const error = new AppError(
      ErrorType.VALIDATION_ERROR,
      'Test message',
      400,
      'testField',
      'TEST_CODE',
      { extra: 'data' }
    );

    expect(error.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(error.message).toBe('Test message');
    expect(error.statusCode).toBe(400);
    expect(error.field).toBe('testField');
    expect(error.code).toBe('TEST_CODE');
    expect(error.details).toEqual({ extra: 'data' });
    expect(error.name).toBe('AppError');
  });

  it('uses default status code when not provided', () => {
    const error = new AppError(ErrorType.SYSTEM_ERROR, 'Test message');

    expect(error.statusCode).toBe(500);
  });
});

describe('ValidationError', () => {
  it('creates validation error with correct properties', () => {
    const error = new ValidationError('Invalid input', 'email', { format: 'email' });

    expect(error.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(error.message).toBe('Invalid input');
    expect(error.statusCode).toBe(400);
    expect(error.field).toBe('email');
    expect(error.code).toBe('VALIDATION_FAILED');
    expect(error.details).toEqual({ format: 'email' });
  });

  it('creates validation error without field and details', () => {
    const error = new ValidationError('Form is invalid');

    expect(error.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(error.message).toBe('Form is invalid');
    expect(error.statusCode).toBe(400);
    expect(error.field).toBeUndefined();
    expect(error.details).toBeUndefined();
  });
});

describe('PermissionError', () => {
  it('creates permission error with default message', () => {
    const error = new PermissionError();

    expect(error.type).toBe(ErrorType.PERMISSION_ERROR);
    expect(error.message).toBe('Access denied');
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('ACCESS_DENIED');
  });

  it('creates permission error with custom message', () => {
    const error = new PermissionError('Custom access denied', { userId: '123' });

    expect(error.message).toBe('Custom access denied');
    expect(error.details).toEqual({ userId: '123' });
  });
});

describe('NotFoundError', () => {
  it('creates not found error', () => {
    const error = new NotFoundError('Resource not found', { resourceId: '456' });

    expect(error.type).toBe(ErrorType.NOT_FOUND);
    expect(error.message).toBe('Resource not found');
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.details).toEqual({ resourceId: '456' });
  });
});

describe('ConflictError', () => {
  it('creates conflict error', () => {
    const error = new ConflictError('Version conflict', { version: 2 });

    expect(error.type).toBe(ErrorType.CONFLICT);
    expect(error.message).toBe('Version conflict');
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('CONFLICT');
    expect(error.details).toEqual({ version: 2 });
  });
});

describe('SystemError', () => {
  it('creates system error with default message', () => {
    const error = new SystemError();

    expect(error.type).toBe(ErrorType.SYSTEM_ERROR);
    expect(error.message).toBe('Internal server error');
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('SYSTEM_ERROR');
  });

  it('creates system error with custom message', () => {
    const error = new SystemError('Database connection failed', { dbHost: 'localhost' });

    expect(error.message).toBe('Database connection failed');
    expect(error.details).toEqual({ dbHost: 'localhost' });
  });
});

describe('handleError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles AppError instances', () => {
    const error = new ValidationError('Invalid input', 'email');

    const result = handleError(error);

    expect(result).toEqual({
      error: {
        type: ErrorType.VALIDATION_ERROR,
        message: 'Invalid input',
        field: 'email',
        code: 'VALIDATION_FAILED',
        details: undefined
      }
    });
  });

  it('handles AWS ConditionalCheckFailedException', () => {
    const error = {
      name: 'ConditionalCheckFailedException',
      message: 'The conditional request failed'
    };

    const result = handleError(error);

    expect(result).toEqual({
      error: {
        type: ErrorType.CONFLICT,
        message: 'The item has been modified by another user. Please refresh and try again.',
        code: 'OPTIMISTIC_LOCK_FAILED'
      }
    });
  });

  it('handles AWS ResourceNotFoundException', () => {
    const error = {
      name: 'ResourceNotFoundException',
      message: 'Requested resource not found'
    };

    const result = handleError(error);

    expect(result).toEqual({
      error: {
        type: ErrorType.NOT_FOUND,
        message: 'The requested resource was not found.',
        code: 'RESOURCE_NOT_FOUND'
      }
    });
  });

  it('handles AWS ValidationException', () => {
    const error = {
      name: 'ValidationException',
      message: 'Invalid parameter value'
    };

    const result = handleError(error);

    expect(result).toEqual({
      error: {
        type: ErrorType.VALIDATION_ERROR,
        message: 'Invalid parameter value',
        code: 'VALIDATION_FAILED'
      }
    });
  });

  it('handles ValidationException without message', () => {
    const error = {
      name: 'ValidationException'
    };

    const result = handleError(error);

    expect(result).toEqual({
      error: {
        type: ErrorType.VALIDATION_ERROR,
        message: 'Invalid input provided.',
        code: 'VALIDATION_FAILED'
      }
    });
  });

  it('handles timeout errors', () => {
    const error = {
      name: 'TimeoutError'
    };

    const result = handleError(error);

    expect(result).toEqual({
      error: {
        type: ErrorType.TIMEOUT_ERROR,
        message: 'The request timed out. Please try again.',
        code: 'REQUEST_TIMEOUT'
      }
    });
  });

  it('handles timeout errors with code', () => {
    const error = {
      code: 'TIMEOUT',
      message: 'Request timeout'
    };

    const result = handleError(error);

    expect(result).toEqual({
      error: {
        type: ErrorType.TIMEOUT_ERROR,
        message: 'The request timed out. Please try again.',
        code: 'REQUEST_TIMEOUT'
      }
    });
  });

  it('handles unknown errors', () => {
    const error = new Error('Unknown error');

    const result = handleError(error);

    expect(result).toEqual({
      error: {
        type: ErrorType.SYSTEM_ERROR,
        message: 'An unexpected error occurred. Please try again later.',
        code: 'SYSTEM_ERROR'
      }
    });
  });

  it('logs all errors', () => {
    const error = new Error('Test error');

    handleError(error);

    expect(console.error).toHaveBeenCalledWith('Error occurred:', error);
  });
});

describe('createErrorResponse', () => {
  it('creates error response with all parameters', () => {
    const result = createErrorResponse(
      ErrorType.VALIDATION_ERROR,
      'Invalid input',
      400,
      'email',
      'INVALID_EMAIL',
      { format: 'email' }
    );

    expect(result).toEqual({
      statusCode: 400,
      body: JSON.stringify({
        error: {
          type: ErrorType.VALIDATION_ERROR,
          message: 'Invalid input',
          field: 'email',
          code: 'INVALID_EMAIL',
          details: { format: 'email' }
        }
      })
    });
  });

  it('creates error response with minimal parameters', () => {
    const result = createErrorResponse(
      ErrorType.SYSTEM_ERROR,
      'Internal error'
    );

    expect(result).toEqual({
      statusCode: 500,
      body: JSON.stringify({
        error: {
          type: ErrorType.SYSTEM_ERROR,
          message: 'Internal error',
          field: undefined,
          code: undefined,
          details: undefined
        }
      })
    });
  });

  it('uses default status code when not provided', () => {
    const result = createErrorResponse(
      ErrorType.VALIDATION_ERROR,
      'Invalid input'
    );

    expect(result.statusCode).toBe(500);
  });
});

describe('ErrorType enum', () => {
  it('has all expected error types', () => {
    expect(ErrorType.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(ErrorType.PERMISSION_ERROR).toBe('PERMISSION_ERROR');
    expect(ErrorType.NOT_FOUND).toBe('NOT_FOUND');
    expect(ErrorType.CONFLICT).toBe('CONFLICT');
    expect(ErrorType.SYSTEM_ERROR).toBe('SYSTEM_ERROR');
    expect(ErrorType.NETWORK_ERROR).toBe('NETWORK_ERROR');
    expect(ErrorType.TIMEOUT_ERROR).toBe('TIMEOUT_ERROR');
  });
});