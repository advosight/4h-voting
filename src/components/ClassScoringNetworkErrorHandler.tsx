import React, { useState, useEffect } from 'react';
import { 
  retryWithBackoff, 
  parseError, 
  isRetryableError,
  logClassScoringError,
  getClassScoringUserFriendlyMessage,
  isClassScoringError,
  ClassScoringErrorResponse
} from '../utils/classErrorHandling';

interface ClassScoringNetworkErrorHandlerProps {
  error: any;
  onRetry: () => Promise<void>;
  onCancel?: () => void;
  context?: 'scoring' | 'reports' | 'management';
  maxRetries?: number;
  showRetryButton?: boolean;
  catId?: string;
  judgeId?: string;
}

export const ClassScoringNetworkErrorHandler: React.FC<ClassScoringNetworkErrorHandlerProps> = ({
  error,
  onRetry,
  onCancel,
  context = 'scoring',
  maxRetries = 3,
  showRetryButton = true,
  catId,
  judgeId
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const parsedError = parseError(error) as ClassScoringErrorResponse;
  const isClassError = isClassScoringError(parsedError);
  const userMessage = isClassError 
    ? getClassScoringUserFriendlyMessage(parsedError)
    : parsedError.error.message;
  const canRetry = isRetryableError(parsedError) && retryCount < maxRetries;

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Log the error with class scoring context
    logClassScoringError(error, `NetworkError:${context}`, {
      catId,
      judgeId,
      operation: 'network_operation'
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [error, context, catId, judgeId]);

  const handleRetry = async () => {
    if (!canRetry || isRetrying) return;

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      await retryWithBackoff(onRetry, {
        maxRetries: 1, // Single retry attempt here since we're managing count
        baseDelay: 1500, // Longer delay for class scoring
        maxDelay: 5000,
        backoffFactor: 1.5
      });
    } catch (retryError) {
      logClassScoringError(retryError, `RetryFailed:${context}`, {
        catId,
        judgeId,
        retryAttempt: retryCount,
        operation: 'retry_operation'
      });
    } finally {
      setIsRetrying(false);
    }
  };

  const getErrorClassName = () => {
    const baseClass = 'class-scoring-network-error';
    if (!isOnline) return `${baseClass} offline`;
    if (parsedError.error.type === 'NETWORK_ERROR') return `${baseClass} network`;
    if (parsedError.error.type === 'TIMEOUT_ERROR') return `${baseClass} timeout`;
    return baseClass;
  };

  const getContextualHelp = () => {
    switch (context) {
      case 'scoring':
        return 'Your scoring progress is automatically saved. You can safely retry or reload the page.';
      case 'reports':
        return 'Report data may be temporarily unavailable. Please try again in a moment.';
      case 'management':
        return 'Score management operations are temporarily unavailable. Please try again.';
      default:
        return 'Class scoring operations are temporarily unavailable.';
    }
  };

  return (
    <div className={getErrorClassName()}>
      <div className="error-content class-scoring-theme">
        <div className="error-header">
          <span className="error-icon">🎗️</span>
          <h3>Type Class Scoring Connection Issue</h3>
        </div>

        {!isOnline && (
          <div className="offline-indicator">
            <span className="offline-icon">📡</span>
            <strong>You're offline</strong>
          </div>
        )}
        
        <p className="error-message">{userMessage}</p>
        
        <div className="contextual-help">
          <p>{getContextualHelp()}</p>
        </div>

        {!isOnline && (
          <p className="offline-help">
            Please check your internet connection and try again when you're back online.
          </p>
        )}

        <div className="error-actions">
          {showRetryButton && canRetry && isOnline && (
            <button 
              onClick={handleRetry}
              disabled={isRetrying}
              className="retry-button class-scoring-button"
            >
              {isRetrying ? (
                <span className="retry-indicator">
                  <span className="retry-spinner"></span>
                  Retrying...
                </span>
              ) : (
                `Retry (${retryCount}/${maxRetries})`
              )}
            </button>
          )}
          
          {onCancel && (
            <button 
              onClick={onCancel} 
              className="cancel-button class-scoring-button-secondary"
            >
              Cancel
            </button>
          )}
          
          {!canRetry && retryCount >= maxRetries && (
            <button 
              onClick={() => window.location.reload()} 
              className="reload-button class-scoring-button"
            >
              Reload Page
            </button>
          )}
        </div>

        {parsedError.error.code && (
          <div className="error-code">
            Error Code: {parsedError.error.code}
          </div>
        )}

        {isClassError && parsedError.error.category && (
          <div className="error-category">
            Category: {parsedError.error.category}
          </div>
        )}

        {context === 'scoring' && (
          <div className="scoring-specific-help">
            <h4>Scoring Tips:</h4>
            <ul>
              <li>Your progress is saved automatically every 30 seconds</li>
              <li>You can safely close and reopen the scoring form</li>
              <li>Use the "Save Draft" button to manually save your work</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

// Hook for handling class scoring network errors with enhanced retry logic
export const useClassScoringNetworkErrorHandler = (
  context: 'scoring' | 'reports' | 'management' = 'scoring',
  catId?: string,
  judgeId?: string
) => {
  const [networkError, setNetworkError] = useState<any>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSuccessfulOperation, setLastSuccessfulOperation] = useState<Date | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setRetryCount(0); // Reset retry count when back online
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleNetworkError = (error: any) => {
    logClassScoringError(error, `NetworkErrorHandler:${context}`, {
      catId,
      judgeId,
      operation: 'handle_network_error',
      isOnline,
      retryCount
    });
    setNetworkError(error);
  };

  const clearNetworkError = () => {
    setNetworkError(null);
    setRetryCount(0);
    setLastSuccessfulOperation(new Date());
  };

  const retryOperation = async (
    operation: () => Promise<void>,
    options: {
      maxRetries?: number;
      exponentialBackoff?: boolean;
      waitForOnline?: boolean;
    } = {}
  ) => {
    const { 
      maxRetries = 3, 
      exponentialBackoff = true, 
      waitForOnline = true 
    } = options;

    setIsRetrying(true);
    
    try {
      // Wait for connection if offline and waitForOnline is true
      if (!isOnline && waitForOnline) {
        logClassScoringError(
          new Error('Waiting for network connection'),
          `NetworkErrorHandler:${context}`,
          { catId, judgeId, operation: 'waiting_for_connection' }
        );
        
        // Wait up to 30 seconds for connection
        const connectionRestored = await new Promise<boolean>((resolve) => {
          const timeout = setTimeout(() => resolve(false), 30000);
          
          const handleOnlineRestore = () => {
            clearTimeout(timeout);
            window.removeEventListener('online', handleOnlineRestore);
            resolve(true);
          };
          
          if (navigator.onLine) {
            clearTimeout(timeout);
            resolve(true);
          } else {
            window.addEventListener('online', handleOnlineRestore);
          }
        });
        
        if (!connectionRestored) {
          throw new Error('Network connection not restored within timeout period');
        }
      }

      // Attempt the operation with retry logic
      let lastError: any;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          await operation();
          clearNetworkError();
          return; // Success!
        } catch (error) {
          lastError = error;
          setRetryCount(attempt);
          
          logClassScoringError(error, `NetworkErrorHandler:${context}`, {
            catId,
            judgeId,
            operation: 'retry_attempt',
            attempt,
            maxRetries
          });
          
          // Don't retry on the last attempt
          if (attempt === maxRetries) {
            break;
          }
          
          // Calculate delay with exponential backoff
          const baseDelay = 1000;
          const delay = exponentialBackoff 
            ? baseDelay * Math.pow(2, attempt - 1)
            : baseDelay;
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      // All retries failed
      handleNetworkError(lastError);
      
    } catch (error) {
      handleNetworkError(error);
    } finally {
      setIsRetrying(false);
    }
  };

  const retryWithOptimisticLock = async (
    operation: () => Promise<void>,
    onConflict?: (conflictData?: any) => Promise<void>
  ) => {
    setIsRetrying(true);
    
    try {
      await operation();
      clearNetworkError();
    } catch (error) {
      const parsedError = parseError(error);
      
      if (parsedError.error.type === 'CONFLICT') {
        logClassScoringError(error, `OptimisticLockConflict:${context}`, {
          catId,
          judgeId,
          operation: 'optimistic_lock_conflict'
        });
        
        if (onConflict) {
          await onConflict(parsedError.error.details);
        }
      }
      
      handleNetworkError(error);
    } finally {
      setIsRetrying(false);
    }
  };

  const getConnectionQuality = (): 'good' | 'poor' | 'offline' => {
    if (!isOnline) return 'offline';
    
    // Simple heuristic based on recent success/failure
    if (lastSuccessfulOperation) {
      const timeSinceSuccess = Date.now() - lastSuccessfulOperation.getTime();
      if (timeSinceSuccess < 30000 && retryCount === 0) return 'good';
    }
    
    return retryCount > 0 ? 'poor' : 'good';
  };

  return {
    networkError,
    isRetrying,
    retryCount,
    isOnline,
    connectionQuality: getConnectionQuality(),
    lastSuccessfulOperation,
    handleNetworkError,
    clearNetworkError,
    retryOperation,
    retryWithOptimisticLock
  };
};