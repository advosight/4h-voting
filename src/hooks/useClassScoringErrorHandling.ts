import { useState, useCallback, useEffect } from 'react';
import {
  ClassScoringValidationError,
  ClassScoringErrorResponse,
  getClassScoringUserFriendlyMessage,
  isClassScoringError,
  logClassScoringError,
  retryClassScoringOperation,
  withOptimisticLockRetry,
  classScoringNetworkMonitor
} from '../utils/classErrorHandling';
import { parseError, isRetryableError } from '../utils/errorHandling';

interface UseClassScoringErrorHandlingOptions {
  context: 'scoring' | 'reports' | 'management';
  catId?: string;
  judgeId?: string;
  onError?: (error: any) => void;
  onRetrySuccess?: () => void;
  onRetryFailure?: (error: any) => void;
  onOptimisticLockConflict?: (conflictData?: any) => void;
}

interface ErrorState {
  error: any | null;
  isRetrying: boolean;
  retryCount: number;
  canRetry: boolean;
  userMessage: string;
  isNetworkError: boolean;
  isValidationError: boolean;
  isConflictError: boolean;
  isOnline: boolean;
}

export const useClassScoringErrorHandling = (options: UseClassScoringErrorHandlingOptions) => {
  const {
    context,
    catId,
    judgeId,
    onError,
    onRetrySuccess,
    onRetryFailure,
    onOptimisticLockConflict
  } = options;

  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isRetrying: false,
    retryCount: 0,
    canRetry: false,
    userMessage: '',
    isNetworkError: false,
    isValidationError: false,
    isConflictError: false,
    isOnline: navigator.onLine
  });

  // Monitor network status
  useEffect(() => {
    const removeListener = classScoringNetworkMonitor.addListener((isOnline) => {
      setErrorState(prev => ({ ...prev, isOnline }));
    });

    return removeListener;
  }, []);

  const analyzeError = useCallback((error: any): Partial<ErrorState> => {
    const parsedError = parseError(error);
    const isClassError = isClassScoringError(parsedError);
    const userMessage = isClassError 
      ? getClassScoringUserFriendlyMessage(parsedError as ClassScoringErrorResponse)
      : parsedError.error.message;

    return {
      error,
      userMessage,
      canRetry: isRetryableError(parsedError),
      isNetworkError: parsedError.error.type === 'NETWORK_ERROR' || parsedError.error.type === 'TIMEOUT_ERROR',
      isValidationError: parsedError.error.type === 'VALIDATION_ERROR',
      isConflictError: parsedError.error.type === 'CONFLICT',
      isOnline: classScoringNetworkMonitor.getIsOnline()
    };
  }, []);

  const handleError = useCallback((error: any) => {
    const errorAnalysis = analyzeError(error);
    
    setErrorState(prev => ({
      ...prev,
      ...errorAnalysis,
      retryCount: 0,
      isRetrying: false
    }));

    // Log the error
    logClassScoringError(error, `ErrorHandler:${context}`, {
      catId,
      judgeId,
      operation: 'handle_error'
    });

    // Call custom error handler
    if (onError) {
      onError(error);
    }
  }, [analyzeError, context, catId, judgeId, onError]);

  const clearError = useCallback(() => {
    setErrorState(prev => ({
      ...prev,
      error: null,
      userMessage: '',
      retryCount: 0,
      isRetrying: false,
      canRetry: false,
      isNetworkError: false,
      isValidationError: false,
      isConflictError: false
    }));
  }, []);

  const retryOperation = useCallback(async (
    operation: () => Promise<void>,
    options: {
      maxRetries?: number;
      waitForOnline?: boolean;
    } = {}
  ) => {
    if (!errorState.canRetry || errorState.isRetrying) {
      return;
    }

    const { maxRetries = 3, waitForOnline = true } = options;

    setErrorState(prev => ({ ...prev, isRetrying: true }));

    try {
      // Wait for connection if offline
      if (!errorState.isOnline && waitForOnline) {
        const connectionRestored = await classScoringNetworkMonitor.waitForConnection(30000);
        if (!connectionRestored) {
          throw new Error('Network connection not restored within timeout');
        }
      }

      await retryClassScoringOperation(operation, {
        maxRetries,
        context,
        catId,
        judgeId,
        onRetry: (attempt, error) => {
          setErrorState(prev => ({ ...prev, retryCount: attempt }));
        },
        onFinalFailure: (error) => {
          const errorAnalysis = analyzeError(error);
          setErrorState(prev => ({
            ...prev,
            ...errorAnalysis,
            isRetrying: false
          }));
          
          if (onRetryFailure) {
            onRetryFailure(error);
          }
        }
      });

      // Success
      clearError();
      if (onRetrySuccess) {
        onRetrySuccess();
      }

    } catch (error) {
      const errorAnalysis = analyzeError(error);
      setErrorState(prev => ({
        ...prev,
        ...errorAnalysis,
        isRetrying: false
      }));

      if (onRetryFailure) {
        onRetryFailure(error);
      }
    }
  }, [errorState.canRetry, errorState.isRetrying, errorState.isOnline, analyzeError, clearError, context, catId, judgeId, onRetrySuccess, onRetryFailure]);

  const retryWithOptimisticLock = useCallback(async (
    operation: () => Promise<void>,
    options: {
      maxRetries?: number;
    } = {}
  ) => {
    if (errorState.isRetrying) {
      return;
    }

    const { maxRetries = 2 } = options;

    setErrorState(prev => ({ ...prev, isRetrying: true }));

    try {
      await withOptimisticLockRetry(operation, {
        maxRetries,
        context,
        catId,
        judgeId,
        onConflict: async (conflictData, attempt) => {
          setErrorState(prev => ({ ...prev, retryCount: attempt || 0 }));
          
          if (onOptimisticLockConflict) {
            await onOptimisticLockConflict(conflictData);
          }
        },
        onFinalConflict: async (conflictData) => {
          const conflictError = {
            error: {
              type: 'CONFLICT' as const,
              message: 'Multiple modification conflicts detected',
              code: 'OPTIMISTIC_LOCK_FAILED',
              scoringType: 'CLASS' as const,
              details: conflictData
            }
          };

          const errorAnalysis = analyzeError(conflictError);
          setErrorState(prev => ({
            ...prev,
            ...errorAnalysis,
            isRetrying: false
          }));

          if (onOptimisticLockConflict) {
            await onOptimisticLockConflict(conflictData);
          }
        }
      });

      // Success
      clearError();
      if (onRetrySuccess) {
        onRetrySuccess();
      }

    } catch (error) {
      const errorAnalysis = analyzeError(error);
      setErrorState(prev => ({
        ...prev,
        ...errorAnalysis,
        isRetrying: false
      }));

      if (onRetryFailure) {
        onRetryFailure(error);
      }
    }
  }, [errorState.isRetrying, analyzeError, clearError, context, catId, judgeId, onRetrySuccess, onRetryFailure, onOptimisticLockConflict]);

  const executeWithErrorHandling = useCallback(async (
    operation: () => Promise<void>,
    options: {
      useOptimisticLock?: boolean;
      maxRetries?: number;
      waitForOnline?: boolean;
    } = {}
  ) => {
    const { useOptimisticLock = false, ...retryOptions } = options;

    try {
      await operation();
      clearError();
    } catch (error) {
      handleError(error);
      
      // Auto-retry for certain types of errors
      if (errorState.canRetry && (errorState.isNetworkError || errorState.isConflictError)) {
        if (useOptimisticLock && errorState.isConflictError) {
          await retryWithOptimisticLock(operation, retryOptions);
        } else if (errorState.isNetworkError) {
          await retryOperation(operation, retryOptions);
        }
      }
    }
  }, [clearError, handleError, errorState.canRetry, errorState.isNetworkError, errorState.isConflictError, retryWithOptimisticLock, retryOperation]);

  const getErrorSeverity = useCallback((): 'low' | 'medium' | 'high' | 'critical' => {
    if (!errorState.error) return 'low';
    
    if (errorState.isValidationError) return 'low';
    if (errorState.isNetworkError && errorState.isOnline) return 'medium';
    if (errorState.isConflictError) return 'medium';
    if (errorState.isNetworkError && !errorState.isOnline) return 'high';
    
    return 'critical';
  }, [errorState]);

  const shouldShowRetryButton = useCallback((): boolean => {
    return errorState.canRetry && 
           !errorState.isRetrying && 
           !errorState.isValidationError &&
           errorState.retryCount < 3;
  }, [errorState]);

  const getRetryButtonText = useCallback((): string => {
    if (errorState.isRetrying) return 'Retrying...';
    if (errorState.retryCount > 0) return `Retry (${errorState.retryCount}/3)`;
    return 'Retry';
  }, [errorState]);

  return {
    // Error state
    error: errorState.error,
    userMessage: errorState.userMessage,
    isRetrying: errorState.isRetrying,
    retryCount: errorState.retryCount,
    canRetry: errorState.canRetry,
    isNetworkError: errorState.isNetworkError,
    isValidationError: errorState.isValidationError,
    isConflictError: errorState.isConflictError,
    isOnline: errorState.isOnline,
    
    // Error analysis
    errorSeverity: getErrorSeverity(),
    shouldShowRetryButton: shouldShowRetryButton(),
    retryButtonText: getRetryButtonText(),
    
    // Error handling functions
    handleError,
    clearError,
    retryOperation,
    retryWithOptimisticLock,
    executeWithErrorHandling
  };
};

export default useClassScoringErrorHandling;