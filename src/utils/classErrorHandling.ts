import { 
  ErrorResponse, 
  RetryOptions, 
  DEFAULT_RETRY_OPTIONS,
  parseError,
  getUserFriendlyMessage as getBaseUserFriendlyMessage,
  isRetryableError,
  retryWithBackoff,
  withRetry,
  handleOptimisticLockConflict,
  logError
} from './errorHandling';

// Class scoring specific error types
export interface ClassScoringErrorResponse extends ErrorResponse {
  error: ErrorResponse['error'] & {
    scoringType?: 'CLASS';
    category?: 'beauty' | 'personality' | 'balanceProportion' | 'health' | 'general';
    validationDetails?: {
      minValue?: number;
      maxValue?: number;
      currentValue?: number;
      requiredFields?: string[];
    };
  };
}

// Class scoring validation errors
export class ClassScoringValidationError extends Error {
  public readonly category: string;
  public readonly field: string;
  public readonly validationDetails: any;

  constructor(message: string, category: string, field: string, validationDetails?: any) {
    super(message);
    this.name = 'ClassScoringValidationError';
    this.category = category;
    this.field = field;
    this.validationDetails = validationDetails;
  }
}

// Class scoring specific error messages
export const getClassScoringUserFriendlyMessage = (error: ClassScoringErrorResponse): string => {
  const { type, message, field, category, validationDetails } = error.error;

  // Handle class scoring specific validation errors
  if (type === 'VALIDATION_ERROR' && category) {
    switch (category) {
      case 'beauty':
        if (validationDetails?.minValue !== undefined && validationDetails?.maxValue !== undefined) {
          return `Beauty score must be between ${validationDetails.minValue} and ${validationDetails.maxValue} points.`;
        }
        return 'Invalid beauty score. Please enter a value between 0 and 15 points.';
      
      case 'personality':
        if (validationDetails?.minValue !== undefined && validationDetails?.maxValue !== undefined) {
          return `Personality score must be between ${validationDetails.minValue} and ${validationDetails.maxValue} points.`;
        }
        return 'Invalid personality score. Please enter a value between 0 and 20 points.';
      
      case 'balanceProportion':
        if (validationDetails?.minValue !== undefined && validationDetails?.maxValue !== undefined) {
          return `Balance/Proportion score must be between ${validationDetails.minValue} and ${validationDetails.maxValue} points.`;
        }
        return 'Invalid balance/proportion score. Please enter a value between 0 and 15 points.';
      
      case 'health':
        return 'Please complete all health and grooming evaluations before submitting.';
      
      default:
        break;
    }
  }

  // Handle class scoring specific permission errors
  if (type === 'PERMISSION_ERROR') {
    return 'You do not have permission to perform class scoring. Please ensure you have judge privileges.';
  }

  // Handle class scoring specific not found errors
  if (type === 'NOT_FOUND') {
    if (field === 'cat') {
      return 'The cat you are trying to score was not found. Please verify the cat ID or cage number.';
    }
    if (field === 'classScore') {
      return 'The class score you are looking for was not found.';
    }
  }

  // Handle class scoring specific conflict errors
  if (type === 'CONFLICT') {
    return 'This class score has been modified by another judge. Please refresh the page to see the latest version.';
  }

  // Fall back to base error handling
  return getBaseUserFriendlyMessage(error);
};

// Validate class scoring input
export const validateClassScoringInput = (input: {
  beautyScore?: number;
  personalityScore?: number;
  balanceProportionScore?: number;
  coatCleanGroomed?: boolean;
  teethGumsHealthy?: boolean;
  eyesNoseClear?: boolean;
  earsCleanMiteFree?: boolean;
  toenailsClipped?: boolean;
  fleaIssues?: boolean;
}): ClassScoringValidationError[] => {
  const errors: ClassScoringValidationError[] = [];

  // Validate beauty score
  if (input.beautyScore !== undefined) {
    if (input.beautyScore < 0 || input.beautyScore > 15) {
      errors.push(new ClassScoringValidationError(
        'Beauty score must be between 0 and 15',
        'beauty',
        'beautyScore',
        { minValue: 0, maxValue: 15, currentValue: input.beautyScore }
      ));
    }
  }

  // Validate personality score
  if (input.personalityScore !== undefined) {
    if (input.personalityScore < 0 || input.personalityScore > 20) {
      errors.push(new ClassScoringValidationError(
        'Personality score must be between 0 and 20',
        'personality',
        'personalityScore',
        { minValue: 0, maxValue: 20, currentValue: input.personalityScore }
      ));
    }
  }

  // Validate balance/proportion score
  if (input.balanceProportionScore !== undefined) {
    if (input.balanceProportionScore < 0 || input.balanceProportionScore > 15) {
      errors.push(new ClassScoringValidationError(
        'Balance/Proportion score must be between 0 and 15',
        'balanceProportion',
        'balanceProportionScore',
        { minValue: 0, maxValue: 15, currentValue: input.balanceProportionScore }
      ));
    }
  }

  return errors;
};

// Validate required health fields for finalization
export const validateHealthRequirements = (input: {
  coatCleanGroomed?: boolean;
  teethGumsHealthy?: boolean;
  eyesNoseClear?: boolean;
  earsCleanMiteFree?: boolean;
  toenailsClipped?: boolean;
}): ClassScoringValidationError[] => {
  const errors: ClassScoringValidationError[] = [];
  const requiredFields: string[] = [];

  if (input.coatCleanGroomed === undefined) requiredFields.push('Coat Clean & Groomed');
  if (input.teethGumsHealthy === undefined) requiredFields.push('Teeth/Gums Healthy');
  if (input.eyesNoseClear === undefined) requiredFields.push('Eyes & Nose Clear');
  if (input.earsCleanMiteFree === undefined) requiredFields.push('Ears Clean & Mite Free');
  if (input.toenailsClipped === undefined) requiredFields.push('Toenails Clipped');

  if (requiredFields.length > 0) {
    errors.push(new ClassScoringValidationError(
      'All health and grooming items must be evaluated',
      'health',
      'healthGrooming',
      { requiredFields }
    ));
  }

  return errors;
};

// Class scoring specific retry wrapper with enhanced error handling
export const withClassScoringRetry = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options?: Partial<RetryOptions & {
    onRetry?: (attempt: number, error: any) => void;
    shouldRetry?: (error: any) => boolean;
  }>
) => {
  const { onRetry, shouldRetry, ...retryOptions } = options || {};
  
  return withRetry(async (...args: T) => {
    try {
      return await fn(...args);
    } catch (error) {
      // Log class scoring specific retry attempt
      logClassScoringError(error, 'RetryAttempt', {
        operation: 'retry_operation',
        retryAttempt: retryOptions.maxRetries || 0
      });
      
      // Check if we should retry this specific error
      if (shouldRetry && !shouldRetry(error)) {
        throw error;
      }
      
      // Call retry callback if provided
      if (onRetry) {
        onRetry(retryOptions.maxRetries || 0, error);
      }
      
      throw error;
    }
  }, {
    ...DEFAULT_RETRY_OPTIONS,
    maxRetries: 2, // Fewer retries for scoring operations
    baseDelay: 1500, // Slightly longer delay
    ...retryOptions
  });
};

// Enhanced retry mechanism for network operations
export const retryClassScoringOperation = async <T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    onRetry?: (attempt: number, error: any) => void;
    onFinalFailure?: (error: any) => void;
    context?: string;
    catId?: string;
    judgeId?: string;
  } = {}
): Promise<T> => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    onRetry,
    onFinalFailure,
    context = 'unknown',
    catId,
    judgeId
  } = options;

  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Log the retry attempt
      logClassScoringError(error, `RetryOperation:${context}`, {
        catId,
        judgeId,
        operation: context,
        retryAttempt: attempt,
        maxRetries
      });
      
      // Check if this error is retryable
      const parsedError = parseError(error);
      if (!isRetryableError(parsedError)) {
        throw error;
      }
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Call retry callback
      if (onRetry) {
        onRetry(attempt, error);
      }
      
      // Wait before retrying with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // All retries failed
  if (onFinalFailure) {
    onFinalFailure(lastError);
  }
  
  throw lastError;
};

// Handle class scoring optimistic locking with user-friendly messaging
export const handleClassScoringOptimisticLock = async <T>(
  operation: () => Promise<T>,
  onConflict: (conflictData?: any) => Promise<void>
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    const parsedError = parseError(error) as ClassScoringErrorResponse;
    
    if (parsedError.error.type === 'CONFLICT' && 
        parsedError.error.code === 'OPTIMISTIC_LOCK_FAILED') {
      
      // Add class scoring context to the error
      parsedError.error.scoringType = 'CLASS';
      
      await onConflict(parsedError.error.details);
      throw parsedError; // Re-throw with enhanced context
    }
    
    throw error;
  }
};

// Class scoring specific error logging
export const logClassScoringError = (
  error: any, 
  context: string, 
  additionalData?: {
    catId?: string;
    judgeId?: string;
    scoringCategory?: string;
    operation?: string;
  }
) => {
  const enhancedContext = `ClassScoring:${context}`;
  
  console.error('Class scoring error occurred:', {
    context: enhancedContext,
    ...additionalData,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  });
  
  logError(error, enhancedContext);
};

// Create class scoring error response
export const createClassScoringErrorResponse = (
  type: ErrorResponse['error']['type'],
  message: string,
  category?: 'beauty' | 'personality' | 'balanceProportion' | 'health' | 'general',
  field?: string,
  validationDetails?: any
): ClassScoringErrorResponse => {
  return {
    error: {
      type,
      message,
      field,
      code: 'CLASS_SCORING_ERROR',
      scoringType: 'CLASS',
      category,
      validationDetails
    }
  };
};

// Check if error is class scoring related
export const isClassScoringError = (error: any): error is ClassScoringErrorResponse => {
  return error?.error?.scoringType === 'CLASS';
};

// Get validation error summary for display
export const getValidationErrorSummary = (errors: ClassScoringValidationError[]): string => {
  if (errors.length === 0) return '';
  
  if (errors.length === 1) {
    return errors[0].message;
  }
  
  const categories = [...new Set(errors.map(e => e.category))];
  return `Please fix ${errors.length} validation errors in: ${categories.join(', ')}`;
};

// Enhanced optimistic locking with automatic retry
export const withOptimisticLockRetry = async <T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    onConflict?: (conflictData?: any, attempt?: number) => Promise<void>;
    onFinalConflict?: (conflictData?: any) => Promise<void>;
    context?: string;
    catId?: string;
    judgeId?: string;
  } = {}
): Promise<T> => {
  const {
    maxRetries = 2,
    onConflict,
    onFinalConflict,
    context = 'unknown',
    catId,
    judgeId
  } = options;

  let lastConflictData: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const parsedError = parseError(error) as ClassScoringErrorResponse;
      
      if (parsedError.error.type === 'CONFLICT' && 
          parsedError.error.code === 'OPTIMISTIC_LOCK_FAILED') {
        
        lastConflictData = parsedError.error.details;
        
        // Log the conflict
        logClassScoringError(error, `OptimisticLockConflict:${context}`, {
          catId,
          judgeId,
          operation: context,
          conflictAttempt: attempt,
          maxRetries
        });
        
        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          break;
        }
        
        // Call conflict handler
        if (onConflict) {
          await onConflict(lastConflictData, attempt);
        }
        
        // Add class scoring context to the error
        parsedError.error.scoringType = 'CLASS';
        
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        continue;
      }
      
      // Non-conflict error, re-throw immediately
      throw error;
    }
  }
  
  // All retries failed due to conflicts
  if (onFinalConflict) {
    await onFinalConflict(lastConflictData);
  }
  
  // Create enhanced conflict error
  const conflictError = createClassScoringErrorResponse(
    'CONFLICT',
    'This class score has been modified by another judge multiple times. Please refresh the page and try again.',
    'general',
    undefined,
    { conflictData: lastConflictData, maxRetriesExceeded: true }
  );
  
  throw conflictError;
};

// Network status monitoring for class scoring
export class ClassScoringNetworkMonitor {
  private isOnline: boolean = navigator.onLine;
  private listeners: Array<(isOnline: boolean) => void> = [];
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 2000;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  private handleOnline = () => {
    this.isOnline = true;
    this.reconnectAttempts = 0;
    this.notifyListeners(true);
    
    logClassScoringError(
      new Error('Network connection restored'),
      'NetworkMonitor',
      { operation: 'connection_restored' }
    );
  };

  private handleOffline = () => {
    this.isOnline = false;
    this.notifyListeners(false);
    
    logClassScoringError(
      new Error('Network connection lost'),
      'NetworkMonitor',
      { operation: 'connection_lost' }
    );
  };

  private notifyListeners(isOnline: boolean) {
    this.listeners.forEach(listener => listener(isOnline));
  }

  public addListener(listener: (isOnline: boolean) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public getIsOnline(): boolean {
    return this.isOnline;
  }

  public async waitForConnection(timeout: number = 30000): Promise<boolean> {
    if (this.isOnline) return true;

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        removeListener();
        resolve(false);
      }, timeout);

      const removeListener = this.addListener((isOnline) => {
        if (isOnline) {
          clearTimeout(timeoutId);
          removeListener();
          resolve(true);
        }
      });
    });
  }

  public async attemptReconnect(): Promise<boolean> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return false;
    }

    this.reconnectAttempts++;
    
    try {
      // Try to fetch a small resource to test connectivity
      const response = await fetch('/favicon.ico', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      if (response.ok) {
        this.handleOnline();
        return true;
      }
    } catch (error) {
      logClassScoringError(error, 'NetworkMonitor', {
        operation: 'reconnect_attempt',
        attempt: this.reconnectAttempts
      });
    }

    // Wait before next attempt
    await new Promise(resolve => 
      setTimeout(resolve, this.reconnectDelay * this.reconnectAttempts)
    );
    
    return false;
  }

  public destroy() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    this.listeners = [];
  }
}

// Global network monitor instance
export const classScoringNetworkMonitor = new ClassScoringNetworkMonitor();