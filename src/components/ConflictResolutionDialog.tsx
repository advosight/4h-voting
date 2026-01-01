import React, { useState } from 'react';
import { parseError } from '../utils/errorHandling';

interface ConflictResolutionDialogProps {
  error: any;
  onRefresh: () => Promise<void>;
  onCancel: () => void;
  itemType?: string;
}

export const ConflictResolutionDialog: React.FC<ConflictResolutionDialogProps> = ({
  error,
  onRefresh,
  onCancel,
  itemType = 'item'
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const parsedError = parseError(error);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch (refreshError) {
      console.error('Refresh failed:', refreshError);
    } finally {
      setIsRefreshing(false);
    }
  };

  const isOptimisticLockConflict = 
    parsedError.error.type === 'CONFLICT' && 
    parsedError.error.code === 'OPTIMISTIC_LOCK_FAILED';

  return (
    <div className="conflict-dialog">
      <div className="conflict-content">
        <h3>
          {isOptimisticLockConflict ? 'Conflict Detected' : 'Update Conflict'}
        </h3>
        
        <div className="conflict-message">
          {isOptimisticLockConflict ? (
            <>
              <p>
                This {itemType} has been modified by another user while you were editing it.
              </p>
              <p>
                To continue, you'll need to refresh the data and reapply your changes.
                Your current changes will be lost.
              </p>
            </>
          ) : (
            <p>{parsedError.error.message}</p>
          )}
        </div>

        <div className="conflict-details">
          <div className="conflict-warning">
            ⚠️ <strong>Warning:</strong> Refreshing will discard your current changes.
          </div>
        </div>

        <div className="conflict-actions">
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="conflict-refresh"
          >
            {isRefreshing ? (
              <span className="retry-indicator">
                <span className="retry-spinner"></span>
                Refreshing...
              </span>
            ) : (
              'Refresh & Continue'
            )}
          </button>
          
          <button 
            onClick={onCancel}
            disabled={isRefreshing}
            className="conflict-cancel"
          >
            Cancel
          </button>
        </div>

        {parsedError.error.details && (
          <details className="conflict-technical-details">
            <summary>Technical Details</summary>
            <pre>{JSON.stringify(parsedError.error.details, null, 2)}</pre>
          </details>
        )}
      </div>
    </div>
  );
};