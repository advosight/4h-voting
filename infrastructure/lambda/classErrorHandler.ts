import { 
  ErrorType, 
  ErrorResponse, 
  AppError, 
  ValidationError, 
  PermissionError, 
  NotFoundError, 
  ConflictError, 
  SystemError,
  handleError as baseHandleError
} from './errorHandler';

// Class scoring specific error response
export interface ClassScoringErrorResponse extends ErrorResponse {
  error: ErrorResponse['error'] & {
    scoringType: 'CLASS';
    category?: 'beauty' | 'personality' | 'balanceProportion' | 'health' | 'general';
    validationDetails?: {
      minValue?: number;
      maxValue?: number;
      currentValue?: number;
      requiredFields?: string[];
    };
    retryInfo?: {
      retryable: boolean;
      retryAfter?: number;
      maxRetries?: number;
    };
  };
}

// Class scoring specific validation error
export class ClassScoringValidationError extends ValidationError {
  public readonly category: string;
  public readonly validationDetails?: any;

  constructor(
    message: string, 
    field: string, 
    category: string, 
    validationDetails?: any
  ) {
    super(message, field, validationDetails);
    this.category = category;
    this.validationDetails = validationDetails;
  }
}

// Class scoring permission error
export class ClassScoringPermissionError extends PermissionError {
  constructor(message: string = 'Access denied for class scoring', details?: any) {
    super(message, details);
  }
}

// Class scoring not found error
export class ClassScoringNotFoundError extends NotFoundError {
  public readonly resourceType: string;

  constructor(message: string, resourceType: string = 'classScore', details?: any) {
    super(message, details);
    this.resourceType = resourceType;
  }
}

// Class scoring conflict error (for optimistic locking)
export class ClassScoringConflictError extends ConflictError {
  public readonly conflictType: string;

  constructor(
    message: string = 'Class score has been modified by another judge', 
    conflictType: string = 'optimistic_lock',
    details?: any
  ) {
    super(message, details);
    this.conflictType = conflictType;
  }
}

// Validate class scoring input
export const validateClassScoringInput = (input: any): void => {
  const errors: string[] = [];

  // Validate beauty score
  if (input.beautyScore !== undefined) {
    if (typeof input.beautyScore !== 'number' || input.beautyScore < 0 || input.beautyScore > 15) {
      throw new ClassScoringValidationError(
        'Beauty score must be between 0 and 15',
        'beautyScore',
        'beauty',
        { minValue: 0, maxValue: 15, currentValue: input.beautyScore }
      );
    }
  }

  // Validate personality score
  if (input.personalityScore !== undefined) {
    if (typeof input.personalityScore !== 'number' || input.personalityScore < 0 || input.personalityScore > 20) {
      throw new ClassScoringValidationError(
        'Personality score must be between 0 and 20',
        'personalityScore',
        'personality',
        { minValue: 0, maxValue: 20, currentValue: input.personalityScore }
      );
    }
  }

  // Validate balance/proportion score
  if (input.balanceProportionScore !== undefined) {
    if (typeof input.balanceProportionScore !== 'number' || input.balanceProportionScore < 0 || input.balanceProportionScore > 15) {
      throw new ClassScoringValidationError(
        'Balance/Proportion score must be between 0 and 15',
        'balanceProportionScore',
        'balanceProportion',
        { minValue: 0, maxValue: 15, currentValue: input.balanceProportionScore }
      );
    }
  }

  // Validate required fields for finalization
  if (input.isFinalized === true) {
    const requiredHealthFields = [
      'coatCleanGroomed',
      'teethGumsHealthy', 
      'eyesNoseClear',
      'earsCleanMiteFree',
      'toenailsClipped'
    ];

    const missingFields = requiredHealthFields.filter(field => 
      input[field] === undefined || input[field] === null
    );

    if (missingFields.length > 0) {
      throw new ClassScoringValidationError(
        'All health and grooming evaluations must be completed before finalizing',
        'healthGrooming',
        'health',
        { requiredFields: missingFields }
      );
    }
  }

  // Validate boolean health fields
  const booleanFields = [
    'coatCleanGroomed',
    'teethGumsHealthy',
    'eyesNoseClear', 
    'earsCleanMiteFree',
    'toenailsClipped',
    'fleaIssues'
  ];

  booleanFields.forEach(field => {
    if (input[field] !== undefined && typeof input[field] !== 'boolean') {
      throw new ClassScoringValidationError(
        `${field} must be a boolean value`,
        field,
        'health'
      );
    }
  });

  // Validate comment lengths
  const commentFields = [
    { field: 'beautyComments', maxLength: 500 },
    { field: 'personalityComments', maxLength: 500 },
    { field: 'balanceProportionComments', maxLength: 500 },
    { field: 'healthGroomingComments', maxLength: 1000 }
  ];

  commentFields.forEach(({ field, maxLength }) => {
    if (input[field] && typeof input[field] === 'string' && input[field].length > maxLength) {
      throw new ClassScoringValidationError(
        `${field} cannot exceed ${maxLength} characters`,
        field,
        'general',
        { maxLength, currentLength: input[field].length }
      );
    }
  });
};

// Handle class scoring specific errors
export const handleClassScoringError = (error: any, context?: string): ClassScoringErrorResponse => {
  console.error('Class scoring error occurred:', { error, context });

  // Handle class scoring specific errors
  if (error instanceof ClassScoringValidationError) {
    return {
      error: {
        type: ErrorType.VALIDATION_ERROR,
        message: error.message,
        field: error.field,
        code: 'CLASS_SCORING_VALIDATION_ERROR',
        scoringType: 'CLASS',
        category: error.category as any,
        validationDetails: error.validationDetails
      }
    };
  }

  if (error instanceof ClassScoringPermissionError) {
    return {
      error: {
        type: ErrorType.PERMISSION_ERROR,
        message: error.message,
        code: 'CLASS_SCORING_PERMISSION_ERROR',
        scoringType: 'CLASS'
      }
    };
  }

  if (error instanceof ClassScoringNotFoundError) {
    return {
      error: {
        type: ErrorType.NOT_FOUND,
        message: error.message,
        field: error.resourceType,
        code: 'CLASS_SCORING_NOT_FOUND',
        scoringType: 'CLASS'
      }
    };
  }

  if (error instanceof ClassScoringConflictError) {
    return {
      error: {
        type: ErrorType.CONFLICT,
        message: error.message,
        code: 'CLASS_SCORING_OPTIMISTIC_LOCK_FAILED',
        scoringType: 'CLASS',
        details: { conflictType: error.conflictType }
      }
    };
  }

  // Handle DynamoDB conditional check failures for class scoring
  if (error.name === 'ConditionalCheckFailedException' && context?.includes('class')) {
    return {
      error: {
        type: ErrorType.CONFLICT,
        message: 'This class score has been modified by another judge. Please refresh and try again.',
        code: 'CLASS_SCORING_OPTIMISTIC_LOCK_FAILED',
        scoringType: 'CLASS'
      }
    };
  }

  // Handle resource not found for class scoring
  if (error.name === 'ResourceNotFoundException' && context?.includes('class')) {
    return {
      error: {
        type: ErrorType.NOT_FOUND,
        message: 'The requested class score or cat was not found.',
        code: 'CLASS_SCORING_RESOURCE_NOT_FOUND',
        scoringType: 'CLASS'
      }
    };
  }

  // Fall back to base error handling but add class scoring context
  const baseError = baseHandleError(error);
  return {
    ...baseError,
    error: {
      ...baseError.error,
      scoringType: 'CLASS'
    }
  } as ClassScoringErrorResponse;
};

// Create class scoring error response with proper HTTP status codes
export const createClassScoringErrorResponse = (
  type: ErrorType,
  message: string,
  statusCode: number = 500,
  field?: string,
  category?: string,
  validationDetails?: any
): { statusCode: number; body: string } => {
  const errorResponse: ClassScoringErrorResponse = {
    error: {
      type,
      message,
      field,
      code: `CLASS_SCORING_${type}`,
      scoringType: 'CLASS',
      category: category as any,
      validationDetails
    }
  };

  return {
    statusCode,
    body: JSON.stringify(errorResponse)
  };
};

// Validate judge permissions for class scoring
export const validateClassScoringPermissions = (userRole: string, operation: string): void => {
  const allowedRoles = ['admin', 'judge'];
  
  if (!allowedRoles.includes(userRole.toLowerCase())) {
    throw new ClassScoringPermissionError(
      `Role '${userRole}' is not authorized for class scoring operations`,
      { operation, requiredRoles: allowedRoles }
    );
  }
};

// Validate cat exists for class scoring
export const validateCatForClassScoring = (cat: any): void => {
  if (!cat) {
    throw new ClassScoringNotFoundError(
      'Cat not found for class scoring',
      'cat'
    );
  }

  if (!cat.id) {
    throw new ClassScoringValidationError(
      'Cat ID is required for class scoring',
      'catId',
      'general'
    );
  }
};

// Calculate ribbon eligibility with error handling
export const calculateRibbonEligibility = (
  totalScore: number,
  healthPassing: boolean,
  fleaIssues: boolean = false
): string => {
  try {
    // Validate inputs
    if (typeof totalScore !== 'number' || totalScore < 0 || totalScore > 50) {
      throw new ClassScoringValidationError(
        'Invalid total score for ribbon calculation',
        'totalScore',
        'general',
        { minValue: 0, maxValue: 50, currentValue: totalScore }
      );
    }

    // Flea issues or health failures result in Red Ribbon regardless of score
    if (fleaIssues || !healthPassing) {
      return 'Red';
    }

    // Calculate ribbon based on score
    if (totalScore >= 45) return 'Blue';
    if (totalScore >= 35) return 'Red';
    if (totalScore >= 25) return 'White';
    return 'Participation';

  } catch (error) {
    console.error('Error calculating ribbon eligibility:', error);
    if (error instanceof ClassScoringValidationError) {
      throw error;
    }
    throw new SystemError('Failed to calculate ribbon eligibility');
  }
};

// Enhanced HTTP status code mapping for class scoring errors
export const getClassScoringHttpStatusCode = (errorType: ErrorType): number => {
  switch (errorType) {
    case ErrorType.VALIDATION_ERROR:
      return 400; // Bad Request
    case ErrorType.PERMISSION_ERROR:
      return 403; // Forbidden
    case ErrorType.NOT_FOUND:
      return 404; // Not Found
    case ErrorType.CONFLICT:
      return 409; // Conflict (for optimistic locking)
    case ErrorType.TIMEOUT_ERROR:
      return 408; // Request Timeout
    case ErrorType.NETWORK_ERROR:
      return 503; // Service Unavailable
    case ErrorType.SYSTEM_ERROR:
    default:
      return 500; // Internal Server Error
  }
};

// Enhanced error recovery strategies for class scoring
export const getClassScoringRecoveryStrategy = (errorType: ErrorType, context?: string): {
  retryable: boolean;
  retryAfter?: number;
  maxRetries?: number;
  strategy: 'immediate' | 'exponential_backoff' | 'linear_backoff' | 'no_retry';
} => {
  switch (errorType) {
    case ErrorType.NETWORK_ERROR:
    case ErrorType.TIMEOUT_ERROR:
      return {
        retryable: true,
        retryAfter: 2000,
        maxRetries: 3,
        strategy: 'exponential_backoff'
      };
    
    case ErrorType.CONFLICT:
      return {
        retryable: true,
        retryAfter: 1000,
        maxRetries: 2,
        strategy: 'linear_backoff'
      };
    
    case ErrorType.SYSTEM_ERROR:
      // Only retry system errors if they're not validation-related
      if (context?.includes('validation')) {
        return { retryable: false, strategy: 'no_retry' };
      }
      return {
        retryable: true,
        retryAfter: 3000,
        maxRetries: 2,
        strategy: 'exponential_backoff'
      };
    
    case ErrorType.VALIDATION_ERROR:
    case ErrorType.PERMISSION_ERROR:
    case ErrorType.NOT_FOUND:
    default:
      return { retryable: false, strategy: 'no_retry' };
  }
};

// Optimistic locking helper for class scores
export const withClassScoringOptimisticLock = async <T>(
  operation: () => Promise<T>,
  expectedVersion?: string,
  resourceId?: string
): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    // Handle DynamoDB conditional check failures
    if (error?.name === 'ConditionalCheckFailedException') {
      throw new ClassScoringConflictError(
        'This class score has been modified by another judge. Please refresh and try again.',
        'optimistic_lock',
        {
          resourceId,
          expectedVersion,
          timestamp: new Date().toISOString()
        }
      );
    }
    
    // Handle other AWS errors that might indicate conflicts
    if (error?.name === 'TransactionCanceledException') {
      const cancelReasons = error.CancellationReasons || [];
      const hasConditionalCheckFailure = cancelReasons.some(
        (reason: any) => reason.Code === 'ConditionalCheckFailed'
      );
      
      if (hasConditionalCheckFailure) {
        throw new ClassScoringConflictError(
          'Class score modification conflict detected in transaction.',
          'transaction_conflict',
          {
            resourceId,
            expectedVersion,
            cancelReasons,
            timestamp: new Date().toISOString()
          }
        );
      }
    }
    
    throw error;
  }
};

// Validate concurrent modification protection
export const validateConcurrentModification = (
  currentVersion: string,
  expectedVersion: string,
  resourceId: string
): void => {
  if (currentVersion !== expectedVersion) {
    throw new ClassScoringConflictError(
      'Class score has been modified by another judge since you last loaded it.',
      'version_mismatch',
      {
        resourceId,
        currentVersion,
        expectedVersion,
        timestamp: new Date().toISOString()
      }
    );
  }
};

// Enhanced error response with retry information
export const createClassScoringErrorResponseWithRetry = (
  type: ErrorType,
  message: string,
  field?: string,
  category?: string,
  validationDetails?: any,
  retryInfo?: {
    retryable: boolean;
    retryAfter?: number;
    maxRetries?: number;
  }
): { statusCode: number; body: string; headers?: Record<string, string> } => {
  const statusCode = getClassScoringHttpStatusCode(type);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Scoring-Type': 'CLASS'
  };

  // Add retry headers if applicable
  if (retryInfo?.retryable && retryInfo.retryAfter) {
    headers['Retry-After'] = retryInfo.retryAfter.toString();
  }

  const errorResponse: ClassScoringErrorResponse = {
    error: {
      type,
      message,
      field,
      code: `CLASS_SCORING_${type}`,
      scoringType: 'CLASS',
      category: category as any,
      validationDetails,
      retryInfo
    }
  };

  return {
    statusCode,
    headers,
    body: JSON.stringify(errorResponse)
  };
};

// Batch validation for multiple class scores
export const validateMultipleClassScores = (
  scores: Array<{ id: string; input: any }>
): Array<{ id: string; errors: ClassScoringValidationError[] }> => {
  return scores.map(({ id, input }) => {
    const errors: ClassScoringValidationError[] = [];
    
    try {
      validateClassScoringInput(input);
    } catch (error) {
      if (error instanceof ClassScoringValidationError) {
        errors.push(error);
      }
    }
    
    return { id, errors };
  });
};

// Rate limiting helper for class scoring operations
export const checkClassScoringRateLimit = (
  judgeId: string,
  operation: string,
  windowMs: number = 60000, // 1 minute
  maxOperations: number = 30
): boolean => {
  // This would typically use Redis or DynamoDB for distributed rate limiting
  // For now, we'll implement a simple in-memory version
  const key = `${judgeId}:${operation}`;
  const now = Date.now();
  
  // In a real implementation, you'd store this in a persistent cache
  // and clean up old entries periodically
  
  return true; // Placeholder - always allow for now
};

// Enhanced logging for class scoring operations
export const logClassScoringOperation = (
  operation: string,
  judgeId: string,
  catId?: string,
  details?: any,
  error?: any
): void => {
  const logData = {
    timestamp: new Date().toISOString(),
    operation,
    judgeId,
    catId,
    details,
    error: error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : undefined
  };
  
  if (error) {
    console.error('Class scoring operation failed:', logData);
  } else {
    console.log('Class scoring operation:', logData);
  }
};