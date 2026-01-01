export interface ErrorResponse {
  error: {
    type: 'VALIDATION_ERROR' | 'PERMISSION_ERROR' | 'NOT_FOUND' | 'CONFLICT' | 'SYSTEM_ERROR' | 'NETWORK_ERROR' | 'TIMEOUT_ERROR';
    message: string;
    field?: string;
    code?: string;
    details?: any;
  };
}

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2
};

/**
 * Parse error response from GraphQL or REST API
 */
export const parseError = (error: any): ErrorResponse => {
  // Handle GraphQL errors
  if (error.graphQLErrors && error.graphQLErrors.length > 0) {
    const graphQLError = error.graphQLErrors[0];
    
    // Check if it's a structured error response
    if (graphQLError.extensions?.error) {
      return { error: graphQLError.extensions.error };
    }
    
    // Fallback to message
    return {
      error: {
        type: 'SYSTEM_ERROR',
        message: graphQLError.message || 'An unexpected error occurred',
        code: 'GRAPHQL_ERROR'
      }
    };
  }

  // Handle network errors
  if (error.networkError) {
    const networkError = error.networkError;
    
    if (networkError.statusCode === 0 || !navigator.onLine) {
      return {
        error: {
          type: 'NETWORK_ERROR',
          message: 'Network connection lost. Please check your internet connection.',
          code: 'NETWORK_OFFLINE'
        }
      };
    }
    
    if (networkError.statusCode >= 500) {
      return {
        error: {
          type: 'SYSTEM_ERROR',
          message: 'Server error. Please try again later.',
          code: 'SERVER_ERROR'
        }
      };
    }
    
    return {
      error: {
        type: 'NETWORK_ERROR',
        message: 'Network error occurred. Please try again.',
        code: 'NETWORK_ERROR'
      }
    };
  }

  // Handle timeout errors
  if (error.name === 'TimeoutError' || error.code === 'TIMEOUT') {
    return {
      error: {
        type: 'TIMEOUT_ERROR',
        message: 'Request timed out. Please try again.',
        code: 'REQUEST_TIMEOUT'
      }
    };
  }

  // Handle structured error responses
  if (error.error) {
    return error as ErrorResponse;
  }

  // Fallback for unknown errors
  return {
    error: {
      type: 'SYSTEM_ERROR',
      message: error.message || 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR'
    }
  };
};

/**
 * Get user-friendly error message
 */
export const getUserFriendlyMessage = (error: ErrorResponse): string => {
  const { type, message, field } = error.error;

  switch (type) {
    case 'VALIDATION_ERROR':
      if (field) {
        return `Invalid ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}: ${message}`;
      }
      return message;
    
    case 'PERMISSION_ERROR':
      return 'You do not have permission to perform this action.';
    
    case 'NOT_FOUND':
      return 'The requested item was not found.';
    
    case 'CONFLICT':
      return 'This item has been modified by another user. Please refresh and try again.';
    
    case 'NETWORK_ERROR':
      return 'Network connection problem. Please check your internet connection and try again.';
    
    case 'TIMEOUT_ERROR':
      return 'The request took too long. Please try again.';
    
    case 'SYSTEM_ERROR':
    default:
      return 'An unexpected error occurred. Please try again later.';
  }
};

/**
 * Determine if an error is retryable
 */
export const isRetryableError = (error: ErrorResponse): boolean => {
  const { type } = error.error;
  
  return [
    'NETWORK_ERROR',
    'TIMEOUT_ERROR',
    'SYSTEM_ERROR'
  ].includes(type);
};

/**
 * Retry function with exponential backoff
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> => {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on the last attempt
      if (attempt === config.maxRetries) {
        break;
      }
      
      // Check if error is retryable
      const parsedError = parseError(error);
      if (!isRetryableError(parsedError)) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffFactor, attempt),
        config.maxDelay
      );
      
      // Add jitter to prevent thundering herd
      const jitteredDelay = delay + Math.random() * 1000;
      
      console.log(`Retry attempt ${attempt + 1}/${config.maxRetries} after ${jitteredDelay}ms`);
      await new Promise(resolve => setTimeout(resolve, jitteredDelay));
    }
  }

  throw lastError;
};

/**
 * Create a retry wrapper for GraphQL operations
 */
export const withRetry = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options?: Partial<RetryOptions>
) => {
  return (...args: T): Promise<R> => {
    return retryWithBackoff(() => fn(...args), options);
  };
};

/**
 * Handle optimistic locking conflicts
 */
export const handleOptimisticLockConflict = async <T>(
  operation: () => Promise<T>,
  onConflict: () => Promise<void>
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    const parsedError = parseError(error);
    
    if (parsedError.error.type === 'CONFLICT' && 
        parsedError.error.code === 'OPTIMISTIC_LOCK_FAILED') {
      await onConflict();
      throw error; // Re-throw to let the UI handle the conflict
    }
    
    throw error;
  }
};

/**
 * Error logging utility
 */
export const logError = (error: any, context?: string) => {
  const parsedError = parseError(error);
  
  console.error('Error occurred:', {
    context,
    type: parsedError.error.type,
    message: parsedError.error.message,
    code: parsedError.error.code,
    field: parsedError.error.field,
    details: parsedError.error.details,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  });
  
  // In a real app, you might send this to an error reporting service
  // reportError(parsedError, context);
};