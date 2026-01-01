import React, { useState, useEffect } from 'react';
import { logClassScoringError } from '../utils/classErrorHandling';

interface ClassScore {
  id: string;
  catId: string;
  judgeId: string;
  judgeName: string;
  beautyScore: number;
  beautyComments?: string;
  personalityScore: number;
  personalityComments?: string;
  balanceProportionScore: number;
  balanceProportionComments?: string;
  coatCleanGroomed: boolean;
  teethGumsHealthy: boolean;
  eyesNoseClear: boolean;
  earsCleanMiteFree: boolean;
  toenailsClipped: boolean;
  fleaIssues: boolean;
  healthGroomingComments?: string;
  totalScore: number;
  ribbonEligibility: string;
  timestamp: string;
  isFinalized: boolean;
}

interface ClassScoringConflictResolutionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentScore: Partial<ClassScore>;
  serverScore: ClassScore;
  onResolve: (resolution: 'keep_current' | 'use_server' | 'merge') => Promise<void>;
  onMerge?: (mergedScore: Partial<ClassScore>) => Promise<void>;
  catName?: string;
  cageNumber?: number;
}

export const ClassScoringConflictResolutionDialog: React.FC<ClassScoringConflictResolutionDialogProps> = ({
  isOpen,
  onClose,
  currentScore,
  serverScore,
  onResolve,
  onMerge,
  catName,
  cageNumber
}) => {
  const [selectedResolution, setSelectedResolution] = useState<'keep_current' | 'use_server' | 'merge'>('use_server');
  const [mergedScore, setMergedScore] = useState<Partial<ClassScore>>(currentScore);
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      logClassScoringError(
        new Error('Class scoring conflict detected'),
        'ConflictResolution',
        {
          catId: currentScore.catId,
          judgeId: currentScore.judgeId,
          operation: 'conflict_dialog_opened'
        }
      );
    }
  }, [isOpen, currentScore.catId, currentScore.judgeId]);

  const handleResolve = async () => {
    setIsResolving(true);
    try {
      if (selectedResolution === 'merge' && onMerge) {
        await onMerge(mergedScore);
      } else {
        await onResolve(selectedResolution);
      }
      onClose();
    } catch (error) {
      logClassScoringError(error, 'ConflictResolution', {
        catId: currentScore.catId,
        judgeId: currentScore.judgeId,
        resolution: selectedResolution,
        operation: 'conflict_resolution_failed'
      });
    } finally {
      setIsResolving(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const ScoreComparison: React.FC<{
    label: string;
    currentValue: any;
    serverValue: any;
    field: keyof ClassScore;
  }> = ({ label, currentValue, serverValue, field }) => {
    const isDifferent = currentValue !== serverValue;
    
    return (
      <div className={`score-comparison ${isDifferent ? 'different' : 'same'}`}>
        <div className="comparison-label">{label}</div>
        <div className="comparison-values">
          <div className="current-value">
            <span className="value-label">Your Version:</span>
            <span className="value">{currentValue ?? 'Not set'}</span>
          </div>
          <div className="server-value">
            <span className="value-label">Server Version:</span>
            <span className="value">{serverValue ?? 'Not set'}</span>
          </div>
          {selectedResolution === 'merge' && (
            <div className="merged-value">
              <span className="value-label">Merged:</span>
              <input
                type={typeof currentValue === 'number' ? 'number' : 
                      typeof currentValue === 'boolean' ? 'checkbox' : 'text'}
                value={mergedScore[field] as any}
                checked={typeof currentValue === 'boolean' ? mergedScore[field] as boolean : undefined}
                onChange={(e) => {
                  const value = typeof currentValue === 'number' ? Number(e.target.value) :
                               typeof currentValue === 'boolean' ? e.target.checked :
                               e.target.value;
                  setMergedScore(prev => ({ ...prev, [field]: value }));
                }}
                className="merge-input"
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="class-scoring-conflict-dialog-overlay">
      <div className="class-scoring-conflict-dialog">
        <div className="dialog-header">
          <h2>🎗️ Type Class Scoring Conflict</h2>
          <button onClick={onClose} className="close-button" disabled={isResolving}>×</button>
        </div>

        <div className="dialog-content">
          <div className="conflict-explanation">
            <p>
              Another judge has modified the class score for{' '}
              <strong>{catName || `Cat ${currentScore.catId}`}</strong>
              {cageNumber && ` (Cage ${cageNumber})`} while you were working on it.
            </p>
            <p>Please choose how to resolve this conflict:</p>
          </div>

          <div className="resolution-options">
            <label className="resolution-option">
              <input
                type="radio"
                name="resolution"
                value="use_server"
                checked={selectedResolution === 'use_server'}
                onChange={(e) => setSelectedResolution(e.target.value as any)}
              />
              <div className="option-content">
                <strong>Use Server Version</strong>
                <p>Discard your changes and use the version from the server</p>
                <small>Modified by {serverScore.judgeName} at {formatTimestamp(serverScore.timestamp)}</small>
              </div>
            </label>

            <label className="resolution-option">
              <input
                type="radio"
                name="resolution"
                value="keep_current"
                checked={selectedResolution === 'keep_current'}
                onChange={(e) => setSelectedResolution(e.target.value as any)}
              />
              <div className="option-content">
                <strong>Keep Your Version</strong>
                <p>Overwrite the server version with your changes</p>
                <small>⚠️ This will replace the other judge's work</small>
              </div>
            </label>

            {onMerge && (
              <label className="resolution-option">
                <input
                  type="radio"
                  name="resolution"
                  value="merge"
                  checked={selectedResolution === 'merge'}
                  onChange={(e) => setSelectedResolution(e.target.value as any)}
                />
                <div className="option-content">
                  <strong>Merge Changes</strong>
                  <p>Manually combine both versions</p>
                </div>
              </label>
            )}
          </div>

          <div className="score-differences">
            <h3>Score Differences</h3>
            
            <ScoreComparison
              label="Beauty Score"
              currentValue={currentScore.beautyScore}
              serverValue={serverScore.beautyScore}
              field="beautyScore"
            />
            
            <ScoreComparison
              label="Personality Score"
              currentValue={currentScore.personalityScore}
              serverValue={serverScore.personalityScore}
              field="personalityScore"
            />
            
            <ScoreComparison
              label="Balance/Proportion Score"
              currentValue={currentScore.balanceProportionScore}
              serverValue={serverScore.balanceProportionScore}
              field="balanceProportionScore"
            />

            <div className="health-comparisons">
              <h4>Health & Grooming</h4>
              <ScoreComparison
                label="Coat Clean & Groomed"
                currentValue={currentScore.coatCleanGroomed}
                serverValue={serverScore.coatCleanGroomed}
                field="coatCleanGroomed"
              />
              <ScoreComparison
                label="Teeth/Gums Healthy"
                currentValue={currentScore.teethGumsHealthy}
                serverValue={serverScore.teethGumsHealthy}
                field="teethGumsHealthy"
              />
              <ScoreComparison
                label="Eyes & Nose Clear"
                currentValue={currentScore.eyesNoseClear}
                serverValue={serverScore.eyesNoseClear}
                field="eyesNoseClear"
              />
              <ScoreComparison
                label="Ears Clean & Mite Free"
                currentValue={currentScore.earsCleanMiteFree}
                serverValue={serverScore.earsCleanMiteFree}
                field="earsCleanMiteFree"
              />
              <ScoreComparison
                label="Toenails Clipped"
                currentValue={currentScore.toenailsClipped}
                serverValue={serverScore.toenailsClipped}
                field="toenailsClipped"
              />
              <ScoreComparison
                label="Flea Issues"
                currentValue={currentScore.fleaIssues}
                serverValue={serverScore.fleaIssues}
                field="fleaIssues"
              />
            </div>

            {(currentScore.beautyComments !== serverScore.beautyComments ||
              currentScore.personalityComments !== serverScore.personalityComments ||
              currentScore.balanceProportionComments !== serverScore.balanceProportionComments ||
              currentScore.healthGroomingComments !== serverScore.healthGroomingComments) && (
              <div className="comment-differences">
                <h4>Comment Differences</h4>
                {currentScore.beautyComments !== serverScore.beautyComments && (
                  <ScoreComparison
                    label="Beauty Comments"
                    currentValue={currentScore.beautyComments}
                    serverValue={serverScore.beautyComments}
                    field="beautyComments"
                  />
                )}
                {currentScore.personalityComments !== serverScore.personalityComments && (
                  <ScoreComparison
                    label="Personality Comments"
                    currentValue={currentScore.personalityComments}
                    serverValue={serverScore.personalityComments}
                    field="personalityComments"
                  />
                )}
                {currentScore.balanceProportionComments !== serverScore.balanceProportionComments && (
                  <ScoreComparison
                    label="Balance/Proportion Comments"
                    currentValue={currentScore.balanceProportionComments}
                    serverValue={serverScore.balanceProportionComments}
                    field="balanceProportionComments"
                  />
                )}
                {currentScore.healthGroomingComments !== serverScore.healthGroomingComments && (
                  <ScoreComparison
                    label="Health/Grooming Comments"
                    currentValue={currentScore.healthGroomingComments}
                    serverValue={serverScore.healthGroomingComments}
                    field="healthGroomingComments"
                  />
                )}
              </div>
            )}
          </div>
        </div>

        <div className="dialog-actions">
          <button
            onClick={onClose}
            className="cancel-button class-scoring-button-secondary"
            disabled={isResolving}
          >
            Cancel
          </button>
          <button
            onClick={handleResolve}
            className="resolve-button class-scoring-button"
            disabled={isResolving}
          >
            {isResolving ? 'Resolving...' : 'Resolve Conflict'}
          </button>
        </div>
      </div>
    </div>
  );
};