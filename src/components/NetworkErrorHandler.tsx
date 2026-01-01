import React, { useState, useEffect } from 'react';
import { retryWithBackoff, parseError, getUserFriendlyMessage, isRetryableError } from '../utils/errorHandling';

interface NetworkErrorHandlerProps {
  error: any;
  onRetry: () => Promise<void>;
  onCancel?: () => void;
  maxRetries?: number;
  showRetryButton?: boolean;
}

export const NetworkErrorHandler: React.FC<NetworkErrorHandlerProps> = ({
  error,
  onRetry,
  onCancel,
  maxRetries = 3,
  showRetryButton = true
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const parsedError = parseError(error);
  const userMessage = getUserFriendlyMessage(parsedError);
  const canRetry = isRetryableError(parsedError) && retryCount < maxRetries;

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = async () => {
    if (!canRetry || isRetrying) return;

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      await retryWithBackoff(onRetry, {
        maxRetries: 1, // Single retry attempt here since we're managing count
        baseDelay: 1000,
        maxDelay: 5000,
        backoffFactor: 1.5
      });
    } catch (retryError) {
      console.error('Retry failed:', retryError);
    } finally {
      setIsRetrying(false);
    }
  };

  const getErrorClassName = () => {
    if (!isOnline) return 'network-error offline';
    if (parsedError.error.type === 'NETWORK_ERROR') return 'network-error';
    return 'network-error';
  };

  return (
    <div className={getErrorClassName()}>
      <div className="error-content">
        {!isOnline && (
          <div className="offline-indicator">
            <span>📡</span>
            <strong>You're offline</strong>
          </div>
        )}
        
        <p className="error-message">{userMessage}</p>
        
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
              className="retry-button"
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
            <button onClick={onCancel} className="cancel-button">
              Cancel
            </button>
          )}
          
          {!canRetry && retryCount >= maxRetries && (
            <button onClick={() => window.location.reload()} className="reload-button">
              Reload Page
            </button>
          )}
        </div>

        {parsedError.error.code && (
          <div className="error-code">
            Error Code: {parsedError.error.code}
          </div>
        )}
      </div>
    </div>
  );
};