export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR'
}

export interface ErrorResponse {
  error: {
    type: ErrorType;
    message: string;
    field?: string;
    code?: string;
    details?: any;
  };
}

export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly field?: string;
  public readonly code?: string;
  public readonly details?: any;

  constructor(
    type: ErrorType,
    message: string,
    statusCode: number = 500,
    field?: string,
    code?: string,
    details?: any
  ) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
    this.field = field;
    this.code = code;
    this.details = details;
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string, details?: any) {
    super(ErrorType.VALIDATION_ERROR, message, 400, field, 'VALIDATION_FAILED', details);
  }
}

export class PermissionError extends AppError {
  constructor(message: string = 'Access denied', details?: any) {
    super(ErrorType.PERMISSION_ERROR, message, 403, undefined, 'ACCESS_DENIED', details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: any) {
    super(ErrorType.NOT_FOUND, message, 404, undefined, 'NOT_FOUND', details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any, code: string = 'CONFLICT') {
    super(ErrorType.CONFLICT, message, 409, undefined, code, details);
  }
}

export class SystemError extends AppError {
  constructor(message: string = 'Internal server error', details?: any) {
    super(ErrorType.SYSTEM_ERROR, message, 500, undefined, 'SYSTEM_ERROR', details);
  }
}

export const handleError = (error: any): ErrorResponse => {
  console.error('Error occurred:', error);

  if (error instanceof AppError) {
    return {
      error: {
        type: error.type,
        message: error.message,
        field: error.field,
        code: error.code,
        details: error.details
      }
    };
  }

  // Handle AWS SDK errors
  if (error.name === 'ConditionalCheckFailedException') {
    return {
      error: {
        type: ErrorType.CONFLICT,
        message: 'The item has been modified by another user. Please refresh and try again.',
        code: 'OPTIMISTIC_LOCK_FAILED'
      }
    };
  }

  if (error.name === 'ResourceNotFoundException') {
    return {
      error: {
        type: ErrorType.NOT_FOUND,
        message: 'The requested resource was not found.',
        code: 'RESOURCE_NOT_FOUND'
      }
    };
  }

  if (error.name === 'ValidationException') {
    return {
      error: {
        type: ErrorType.VALIDATION_ERROR,
        message: error.message || 'Invalid input provided.',
        code: 'VALIDATION_FAILED'
      }
    };
  }

  // Handle timeout errors
  if (error.name === 'TimeoutError' || error.code === 'TIMEOUT') {
    return {
      error: {
        type: ErrorType.TIMEOUT_ERROR,
        message: 'The request timed out. Please try again.',
        code: 'REQUEST_TIMEOUT'
      }
    };
  }

  // Handle role validation errors
  if (error.message && error.message.includes('Access denied')) {
    const message = error.message.includes('Required roles:') 
      ? 'Forbidden: Judge role required'
      : 'Forbidden: Admin role required';
    
    return {
      error: {
        type: ErrorType.PERMISSION_ERROR,
        message: message,
        code: 'ACCESS_DENIED'
      }
    };
  }

  // Default system error
  return {
    error: {
      type: ErrorType.SYSTEM_ERROR,
      message: 'An unexpected error occurred. Please try again later.',
      code: 'SYSTEM_ERROR'
    }
  };
};

export const createErrorResponse = (
  type: ErrorType,
  message: string,
  statusCode: number = 500,
  field?: string,
  code?: string,
  details?: any
): { statusCode: number; body: string } => {
  const errorResponse: ErrorResponse = {
    error: {
      type,
      message,
      field,
      code,
      details
    }
  };

  return {
    statusCode,
    body: JSON.stringify(errorResponse)
  };
};