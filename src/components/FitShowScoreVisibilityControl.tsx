import React, { useState } from 'react';
import { FitShowScore } from '../types/scoring';

interface FitShowScoreVisibilityControlProps {
  score: FitShowScore;
  onFinalize?: (scoreId: string) => Promise<void>;
  onUnfinalize?: (scoreId: string) => Promise<void>;
  canModifyFinalization?: boolean;
  showParticipantView?: boolean;
}

export const FitShowScoreVisibilityControl: React.FC<FitShowScoreVisibilityControlProps> = ({
  score,
  onFinalize,
  onUnfinalize,
  canModifyFinalization = false,
  showParticipantView = false
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [actionType, setActionType] = useState<'finalize' | 'unfinalize' | null>(null);

  const handleFinalizationAction = async (action: 'finalize' | 'unfinalize') => {
    if (!canModifyFinalization) return;

    setActionType(action);
    setShowConfirmDialog(true);
  };

  const confirmAction = async () => {
    if (!actionType) return;

    try {
      setIsProcessing(true);
      
      if (actionType === 'finalize' && onFinalize) {
        await onFinalize(score.id);
      } else if (actionType === 'unfinalize' && onUnfinalize) {
        await onUnfinalize(score.id);
      }
      
      setShowConfirmDialog(false);
      setActionType(null);
    } catch (error) {
      console.error('Error updating finalization status:', error);
      // Error handling would be implemented here
    } finally {
      setIsProcessing(false);
    }
  };

  const cancelAction = () => {
    setShowConfirmDialog(false);
    setActionType(null);
  };

  // For participant view, show visibility status
  if (showParticipantView) {
    return (
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Score Visibility</h3>
            <p className="text-sm text-gray-600 mt-1">
              {score.isFinalized 
                ? 'Your fit and show score has been finalized and is visible to you.'
                : 'Your fit and show score is being reviewed and will be visible once finalized.'
              }
            </p>
          </div>
          <div className="flex-shrink-0">
            {score.isFinalized ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Visible
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                Pending
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // For judge/admin view, show finalization controls
  return (
    <>
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Score Status</h3>
            <p className="text-sm text-gray-600 mt-1">
              {score.isFinalized 
                ? 'This score is finalized and visible to the participant.'
                : 'This score is in draft mode and not visible to the participant.'
              }
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Last updated: {new Date(score.updatedAt).toLocaleString()}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Status Badge */}
            {score.isFinalized ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Finalized
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                Draft
              </span>
            )}

            {/* Action Button */}
            {canModifyFinalization && (
              <button
                onClick={() => handleFinalizationAction(score.isFinalized ? 'unfinalize' : 'finalize')}
                disabled={isProcessing}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  score.isFinalized
                    ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-200'
                    : 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-200'
                } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isProcessing ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </div>
                ) : (
                  score.isFinalized ? 'Unfinalize' : 'Finalize Score'
                )}
              </button>
            )}
          </div>
        </div>

        {/* Warning for finalized scores */}
        {score.isFinalized && canModifyFinalization && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  This score is currently visible to the participant. Unfinalizing will hide it from their view.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${
                actionType === 'finalize' ? 'bg-green-100' : 'bg-yellow-100'
              }`}>
                {actionType === 'finalize' ? (
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                )}
              </div>
              
              <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">
                {actionType === 'finalize' ? 'Finalize Score' : 'Unfinalize Score'}
              </h3>
              
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  {actionType === 'finalize' 
                    ? `Are you sure you want to finalize this fit and show score for ${score.participantName}? This will make the score visible to the participant.`
                    : `Are you sure you want to unfinalize this fit and show score for ${score.participantName}? This will hide the score from the participant.`
                  }
                </p>
              </div>
              
              <div className="items-center px-4 py-3">
                <button
                  onClick={confirmAction}
                  disabled={isProcessing}
                  className={`px-4 py-2 ${
                    actionType === 'finalize' ? 'bg-green-500 hover:bg-green-700' : 'bg-yellow-500 hover:bg-yellow-700'
                  } text-white text-base font-medium rounded-md w-full shadow-sm ${
                    isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isProcessing ? 'Processing...' : `Yes, ${actionType === 'finalize' ? 'Finalize' : 'Unfinalize'}`}
                </button>
                
                <button
                  onClick={cancelAction}
                  disabled={isProcessing}
                  className="mt-3 px-4 py-2 bg-gray-500 hover:bg-gray-700 text-white text-base font-medium rounded-md w-full shadow-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};