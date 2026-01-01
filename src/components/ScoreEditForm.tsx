import React, { useState, useEffect } from 'react';
import { 
  SCORING_CATEGORIES, 
  SCORING_CATEGORY_KEYS, 
  SCORING_CATEGORY_LABELS,
  MAX_COMMENT_LENGTH 
} from '../utils/scoringConstants';
import { 
  validateCategoryScore, 
  validateCategoryComment, 
  calculateTotalScore,
  validateCreateScoreInput 
} from '../utils/scoringValidation';
import { CreateScoreInput, ValidationError } from '../types/scoring';

interface Score {
  id: string;
  catId: string;
  judgeId: string;
  judgeName: string;
  cageConditionScore: number;
  cageConditionComments?: string;
  catConditionScore: number;
  catConditionComments?: string;
  groomingScore: number;
  groomingComments?: string;
  overallScore: number;
  overallComments?: string;
  totalScore: number;
  timestamp: string;
  isFinalized: boolean;
  modificationCount: number;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
}

interface ScoreEditFormProps {
  score: Score;
  onUpdate: (scoreId: string, updateData: any, reason?: string) => Promise<void>;
  onFinalize: (scoreId: string) => Promise<void>;
  loading?: boolean;
  canEdit?: boolean;
  isAdmin?: boolean;
}

interface FormData {
  cageConditionScore: number;
  cageConditionComments: string;
  catConditionScore: number;
  catConditionComments: string;
  groomingScore: number;
  groomingComments: string;
  overallScore: number;
  overallComments: string;
}

interface ConfirmationDialog {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  requiresReason?: boolean;
}

function ScoreEditForm({ 
  score, 
  onUpdate, 
  onFinalize, 
  loading = false,
  canEdit = true,
  isAdmin = false
}: ScoreEditFormProps): JSX.Element {
  const [formData, setFormData] = useState<FormData>({
    cageConditionScore: 0,
    cageConditionComments: '',
    catConditionScore: 0,
    catConditionComments: '',
    groomingScore: 0,
    groomingComments: '',
    overallScore: 0,
    overallComments: ''
  });

  const [originalData, setOriginalData] = useState<FormData | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [totalScore, setTotalScore] = useState<number>(0);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [modificationReason, setModificationReason] = useState<string>('');
  const [confirmDialog, setConfirmDialog] = useState<ConfirmationDialog | null>(null);

  // Initialize form with existing score data
  useEffect(() => {
    const initialData: FormData = {
      cageConditionScore: score.cageConditionScore || 0,
      cageConditionComments: score.cageConditionComments || '',
      catConditionScore: score.catConditionScore || 0,
      catConditionComments: score.catConditionComments || '',
      groomingScore: score.groomingScore || 0,
      groomingComments: score.groomingComments || '',
      overallScore: score.overallScore || 0,
      overallComments: score.overallComments || ''
    };
    
    setFormData(initialData);
    setOriginalData(initialData);
  }, [score]);

  // Calculate total score whenever individual scores change
  useEffect(() => {
    const total = calculateTotalScore({
      cageConditionScore: formData.cageConditionScore,
      catConditionScore: formData.catConditionScore,
      groomingScore: formData.groomingScore,
      overallScore: formData.overallScore
    });
    setTotalScore(total);
  }, [
    formData.cageConditionScore,
    formData.catConditionScore,
    formData.groomingScore,
    formData.overallScore
  ]);

  // Check for changes
  useEffect(() => {
    if (!originalData) return;
    
    const hasFormChanges = Object.keys(formData).some(key => 
      formData[key as keyof FormData] !== originalData[key as keyof FormData]
    );
    setHasChanges(hasFormChanges);
  }, [formData, originalData]);

  const handleScoreChange = (categoryKey: keyof typeof SCORING_CATEGORIES, value: string) => {
    const numericValue = parseInt(value) || 0;
    const category = SCORING_CATEGORIES[categoryKey];
    
    setFormData(prev => ({
      ...prev,
      [category.field]: numericValue
    }));

    // Validate the score
    const error = validateCategoryScore(categoryKey, numericValue);
    setErrors(prev => ({
      ...prev,
      [category.field]: error ? error.message : ''
    }));
  };

  const handleCommentChange = (categoryKey: keyof typeof SCORING_CATEGORIES, value: string) => {
    const category = SCORING_CATEGORIES[categoryKey];
    
    setFormData(prev => ({
      ...prev,
      [category.commentField]: value
    }));

    // Validate the comment
    const error = validateCategoryComment(categoryKey, value);
    setErrors(prev => ({
      ...prev,
      [category.commentField]: error ? error.message : ''
    }));
  };

  const validateForm = (): boolean => {
    const scoreInput: CreateScoreInput = {
      catId: score.catId,
      ...formData
    };

    const validation = validateCreateScoreInput(scoreInput);
    
    if (!validation.isValid) {
      const newErrors: Record<string, string> = {};
      validation.errors.forEach((error: ValidationError) => {
        newErrors[error.field] = error.message;
      });
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  const showConfirmDialog = (dialog: ConfirmationDialog) => {
    setConfirmDialog(dialog);
  };

  const hideConfirmDialog = () => {
    setConfirmDialog(null);
    setModificationReason('');
  };

  const handleSave = () => {
    if (!validateForm()) return;

    const requiresReason = score.isFinalized || score.modificationCount > 0;
    
    showConfirmDialog({
      isOpen: true,
      title: 'Confirm Score Update',
      message: hasChanges 
        ? `Are you sure you want to update this score? This will be modification #${score.modificationCount + 1}.`
        : 'No changes detected. Save anyway?',
      requiresReason,
      onConfirm: async () => {
        const updateData = {
          ...formData,
          modificationReason: modificationReason || 'Score updated'
        };
        
        await onUpdate(score.id, updateData, modificationReason);
        hideConfirmDialog();
      },
      onCancel: hideConfirmDialog
    });
  };

  const handleFinalize = () => {
    showConfirmDialog({
      isOpen: true,
      title: 'Finalize Score',
      message: 'Are you sure you want to finalize this score? Once finalized, only administrators can make changes.',
      onConfirm: async () => {
        await onFinalize(score.id);
        hideConfirmDialog();
      },
      onCancel: hideConfirmDialog
    });
  };

  const handleReset = () => {
    if (!originalData) return;
    
    showConfirmDialog({
      isOpen: true,
      title: 'Reset Changes',
      message: 'Are you sure you want to discard all changes and reset to the original values?',
      onConfirm: () => {
        setFormData(originalData);
        setErrors({});
        hideConfirmDialog();
      },
      onCancel: hideConfirmDialog
    });
  };

  const canModify = canEdit && (!score.isFinalized || isAdmin);

  return (
    <div className="score-edit-form">
      {/* Score Metadata */}
      <div className="score-metadata">
        <div className="metadata-row">
          <span><strong>Judge:</strong> {score.judgeName}</span>
          <span><strong>Created:</strong> {new Date(score.timestamp).toLocaleString()}</span>
        </div>
        <div className="metadata-row">
          <span><strong>Status:</strong> {score.isFinalized ? '✅ Finalized' : '📝 Draft'}</span>
          <span><strong>Modifications:</strong> {score.modificationCount}</span>
        </div>
        {score.lastModifiedBy && score.lastModifiedAt && (
          <div className="metadata-row">
            <span><strong>Last Modified:</strong> {score.lastModifiedBy} at {new Date(score.lastModifiedAt).toLocaleString()}</span>
          </div>
        )}
      </div>

      <h3>🏆 Edit Score 🏆</h3>
      
      {/* Total Score Display */}
      <div className="total-score-display">
        <h2>Total Score: {totalScore}/100</h2>
        <div className="score-bar">
          <div 
            className="score-fill" 
            style={{ width: `${totalScore}%` }}
          />
        </div>
        {hasChanges && <span className="changes-indicator">● Unsaved changes</span>}
      </div>

      {/* Category Scoring Sections */}
      {SCORING_CATEGORY_KEYS.map(categoryKey => {
        const category = SCORING_CATEGORIES[categoryKey];
        const label = SCORING_CATEGORY_LABELS[categoryKey];
        const scoreValue = formData[category.field];
        const commentValue = formData[category.commentField];
        const scoreError = errors[category.field];
        const commentError = errors[category.commentField];

        return (
          <div key={categoryKey} className="scoring-category">
            <h4>{label}</h4>
            <p className="category-description">{category.description}</p>
            
            {/* Score Input */}
            <div className="form-group">
              <label htmlFor={`${categoryKey}-score`}>
                Score (0-{category.maxPoints} points):
              </label>
              <input
                id={`${categoryKey}-score`}
                type="number"
                min="0"
                max={category.maxPoints}
                value={scoreValue}
                onChange={(e) => handleScoreChange(categoryKey, e.target.value)}
                className={scoreError ? 'error' : ''}
                disabled={loading || !canModify}
              />
              {scoreError && <span className="error-message">{scoreError}</span>}
            </div>

            {/* Comment Input */}
            <div className="form-group">
              <label htmlFor={`${categoryKey}-comments`}>
                Comments (optional, max {MAX_COMMENT_LENGTH} characters):
              </label>
              <textarea
                id={`${categoryKey}-comments`}
                value={commentValue}
                onChange={(e) => handleCommentChange(categoryKey, e.target.value)}
                maxLength={MAX_COMMENT_LENGTH}
                rows={3}
                placeholder={`Enter comments about ${label.toLowerCase()}...`}
                className={commentError ? 'error' : ''}
                disabled={loading || !canModify}
              />
              <div className="character-count">
                {commentValue.length}/{MAX_COMMENT_LENGTH}
              </div>
              {commentError && <span className="error-message">{commentError}</span>}
            </div>
          </div>
        );
      })}

      {/* Action Buttons */}
      {canModify && (
        <div className="form-actions">
          <button 
            type="button"
            className="btn btn-secondary"
            onClick={handleReset}
            disabled={loading || !hasChanges}
          >
            Reset Changes
          </button>
          <button 
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Update Score'}
          </button>
          {!score.isFinalized && (
            <button 
              type="button"
              className="btn btn-success"
              onClick={handleFinalize}
              disabled={loading}
            >
              {loading ? 'Finalizing...' : 'Finalize Score'}
            </button>
          )}
        </div>
      )}

      {!canModify && (
        <div className="read-only-notice">
          <p>
            {score.isFinalized 
              ? '🔒 This score has been finalized and can only be modified by administrators.'
              : '🔒 You do not have permission to modify this score.'
            }
          </p>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{confirmDialog.title}</h3>
            <p>{confirmDialog.message}</p>
            
            {confirmDialog.requiresReason && (
              <div className="form-group">
                <label htmlFor="modification-reason">
                  Reason for modification (required):
                </label>
                <textarea
                  id="modification-reason"
                  value={modificationReason}
                  onChange={(e) => setModificationReason(e.target.value)}
                  rows={3}
                  placeholder="Please explain why this score is being modified..."
                  required
                />
              </div>
            )}
            
            <div className="modal-actions">
              <button 
                type="button"
                className="btn btn-secondary"
                onClick={confirmDialog.onCancel}
              >
                Cancel
              </button>
              <button 
                type="button"
                className="btn btn-primary"
                onClick={confirmDialog.onConfirm}
                disabled={confirmDialog.requiresReason && !modificationReason.trim()}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScoreEditForm;