import React, { useState, useCallback, useEffect } from 'react';

export interface NetworkError {
  message: string;
  code?: string;
  operation?: string;
  timestamp: Date;
  retryCount?: number;
}

interface FitShowNetworkErrorHandlerProps {
  error: NetworkError | null;
  onRetry?: () => Promise<void>;
  onDismiss?: () => void;
  maxRetries?: number;
  retryDelay?: number;
  autoRetry?: boolean;
  className?: string;
}

interface RetryState {
  isRetrying: boolean;
  retryCount: number;
  nextRetryIn: number;
  canRetry: boolean;
}

export const FitShowNetworkErrorHandler: React.FC<FitShowNetworkErrorHandlerProps> = ({
  error,
  onRetry,
  onDismiss,
  maxRetries = 3,
  retryDelay = 2000,
  autoRetry = false,
  className = ''
}) => {
  const [retryState, setRetryState] = useState<RetryState>({
    isRetrying: false,
    retryCount: 0,
    nextRetryIn: 0,
    canRetry: true
  });

  const [countdown, setCountdown] = useState<number>(0);

  // Reset retry state when error changes
  useEffect(() => {
    if (error) {
      setRetryState({
        isRetrying: false,
        retryCount: error.retryCount || 0,
        nextRetryIn: 0,
        canRetry: (error.retryCount || 0) < maxRetries
      });
    }
  }, [error, maxRetries]);

  // Auto-retry countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoRetry && error && retryState.canRetry && !retryState.isRetrying && countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            handleRetry();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoRetry, error, retryState.canRetry, retryState.isRetrying, countdown]);

  // Start auto-retry countdown when error occurs
  useEffect(() => {
    if (autoRetry && error && retryState.canRetry && !retryState.isRetrying) {
      setCountdown(Math.ceil(retryDelay / 1000));
    }
  }, [autoRetry, error, retryState.canRetry, retryState.isRetrying, retryDelay]);

  const handleRetry = useCallback(async () => {
    if (!onRetry || !retryState.canRetry || retryState.isRetrying) {
      return;
    }

    setRetryState(prev => ({
      ...prev,
      isRetrying: true,
      nextRetryIn: 0
    }));

    setCountdown(0);

    try {
      await onRetry();
      
      // Success - reset retry state
      setRetryState({
        isRetrying: false,
        retryCount: 0,
        nextRetryIn: 0,
        canRetry: true
      });
    } catch (retryError) {
      const newRetryCount = retryState.retryCount + 1;
      const canStillRetry = newRetryCount < maxRetries;
      
      setRetryState({
        isRetrying: false,
        retryCount: newRetryCount,
        nextRetryIn: canStillRetry ? retryDelay : 0,
        canRetry: canStillRetry
      });

      // Start next auto-retry if enabled and possible
      if (autoRetry && canStillRetry) {
        setCountdown(Math.ceil(retryDelay / 1000));
      }
    }
  }, [onRetry, retryState, maxRetries, retryDelay, autoRetry]);

  const handleManualRetry = useCallback(() => {
    setCountdown(0); // Cancel auto-retry countdown
    handleRetry();
  }, [handleRetry]);

  const getErrorIcon = (code?: string) => {
    switch (code) {
      case 'NETWORK_ERROR':
        return '🌐';
      case 'TIMEOUT_ERROR':
        return '⏱️';
      case 'SERVER_ERROR':
        return '🔧';
      default:
        return '⚠️';
    }
  };

  const getErrorTitle = (code?: string, operation?: string) => {
    const operationText = operation ? ` during ${operation}` : '';
    
    switch (code) {
      case 'NETWORK_ERROR':
        return `Network Error${operationText}`;
      case 'TIMEOUT_ERROR':
        return `Request Timeout${operationText}`;
      case 'SERVER_ERROR':
        return `Server Error${operationText}`;
      default:
        return `Connection Error${operationText}`;
    }
  };

  const getSuggestions = (code?: string) => {
    switch (code) {
      case 'NETWORK_ERROR':
        return [
          'Check your internet connection',
          'Try refreshing the page',
          'Contact support if the problem persists'
        ];
      case 'TIMEOUT_ERROR':
        return [
          'The request took too long to complete',
          'Try again with a stable connection',
          'Consider reducing the amount of data being processed'
        ];
      case 'SERVER_ERROR':
        return [
          'The server is experiencing issues',
          'Please try again in a few moments',
          'Contact support if the error continues'
        ];
      default:
        return [
          'Check your internet connection',
          'Try refreshing the page',
          'Contact support if needed'
        ];
    }
  };

  if (!error) {
    return null;
  }

  return (
    <div className={`fit-show-network-error ${className}`}>
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start">
          <span className="text-red-500 text-xl mr-3 mt-1">
            {getErrorIcon(error.code)}
          </span>
          
          <div className="flex-1">
            <h3 className="text-red-800 font-medium text-lg mb-2">
              {getErrorTitle(error.code, error.operation)}
            </h3>
            
            <p className="text-red-700 mb-3">
              {error.message}
            </p>

            {/* Retry Information */}
            <div className="mb-4">
              <div className="text-red-600 text-sm">
                Retry attempt: {retryState.retryCount} of {maxRetries}
              </div>
              
              {countdown > 0 && autoRetry && (
                <div className="text-red-600 text-sm mt-1">
                  Auto-retry in {countdown} second{countdown !== 1 ? 's' : ''}...
                </div>
              )}
              
              {!retryState.canRetry && (
                <div className="text-red-800 text-sm mt-1 font-medium">
                  Maximum retry attempts reached
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              {retryState.canRetry && onRetry && (
                <button
                  onClick={handleManualRetry}
                  disabled={retryState.isRetrying}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {retryState.isRetrying ? (
                    <>
                      <span className="inline-block animate-spin mr-2">⟳</span>
                      Retrying...
                    </>
                  ) : (
                    'Retry Now'
                  )}
                </button>
              )}
              
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm font-medium"
                >
                  Dismiss
                </button>
              )}
              
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
              >
                Refresh Page
              </button>
            </div>

            {/* Suggestions */}
            <div className="bg-red-100 rounded p-3">
              <h4 className="font-medium text-red-800 text-sm mb-2">
                Troubleshooting suggestions:
              </h4>
              <ul className="text-red-700 text-sm space-y-1">
                {getSuggestions(error.code).map((suggestion, index) => (
                  <li key={index}>• {suggestion}</li>
                ))}
              </ul>
            </div>

            {/* Technical Details */}
            <details className="mt-3">
              <summary className="text-red-600 text-sm cursor-pointer hover:text-red-800">
                Technical Details
              </summary>
              <div className="mt-2 p-2 bg-red-100 rounded text-xs font-mono text-red-800">
                <div>Error Code: {error.code || 'UNKNOWN'}</div>
                <div>Operation: {error.operation || 'N/A'}</div>
                <div>Timestamp: {error.timestamp.toISOString()}</div>
                <div>Retry Count: {retryState.retryCount}</div>
                <div>Message: {error.message}</div>
              </div>
            </details>
          </div>
          
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-red-400 hover:text-red-600 ml-2"
              aria-label="Close error message"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FitShowNetworkErrorHandler;