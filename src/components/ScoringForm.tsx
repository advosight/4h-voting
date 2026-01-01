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
import { parseError, getUserFriendlyMessage, logError, withRetry, handleOptimisticLockConflict } from '../utils/errorHandling';
import { ScoringErrorBoundary } from './ScoringErrorBoundary';
import { NetworkErrorHandler } from './NetworkErrorHandler';
import { ConflictResolutionDialog } from './ConflictResolutionDialog';
import { FormField, ValidationSummary } from './ValidationErrorDisplay';

interface ScoringFormProps {
  catId: string;
  existingScore?: any;
  onSave: (scoreData: CreateScoreInput) => Promise<void>;
  onSubmit: (scoreData: CreateScoreInput) => Promise<void>;
  loading?: boolean;
  hasPermission?: boolean;
}

interface FormData {
  firstImpressionScore: number;
  firstImpressionComments: string;
  originalityScore: number;
  originalityComments: string;
  informationCardScore: number;
  informationCardComments: string;
  workDoneByMemberScore: number;
  workDoneByMemberComments: string;
  basicComfortScore: number;
  basicComfortComments: string;
  safetyScore: number;
  safetyComments: string;
  easyViewOfCatScore: number;
  easyViewOfCatComments: string;
}

function ScoringForm({ 
  catId, 
  existingScore, 
  onSave, 
  onSubmit, 
  loading = false,
  hasPermission = true 
}: ScoringFormProps): JSX.Element {
  const [formData, setFormData] = useState<FormData>({
    firstImpressionScore: 0,
    firstImpressionComments: '',
    originalityScore: 0,
    originalityComments: '',
    informationCardScore: 0,
    informationCardComments: '',
    workDoneByMemberScore: 0,
    workDoneByMemberComments: '',
    basicComfortScore: 0,
    basicComfortComments: '',
    safetyScore: 0,
    safetyComments: '',
    easyViewOfCatScore: 0,
    easyViewOfCatComments: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [totalScore, setTotalScore] = useState<number>(0);
  const [networkError, setNetworkError] = useState<any>(null);
  const [conflictError, setConflictError] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['firstImpression']));

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize form with existing score data
  useEffect(() => {
    if (existingScore) {
      setFormData({
        firstImpressionScore: existingScore.firstImpressionScore || 0,
        firstImpressionComments: existingScore.firstImpressionComments || '',
        originalityScore: existingScore.originalityScore || 0,
        originalityComments: existingScore.originalityComments || '',
        informationCardScore: existingScore.informationCardScore || 0,
        informationCardComments: existingScore.informationCardComments || '',
        workDoneByMemberScore: existingScore.workDoneByMemberScore || 0,
        workDoneByMemberComments: existingScore.workDoneByMemberComments || '',
        basicComfortScore: existingScore.basicComfortScore || 0,
        basicComfortComments: existingScore.basicComfortComments || '',
        safetyScore: existingScore.safetyScore || 0,
        safetyComments: existingScore.safetyComments || '',
        easyViewOfCatScore: existingScore.easyViewOfCatScore || 0,
        easyViewOfCatComments: existingScore.easyViewOfCatComments || ''
      });
    }
  }, [existingScore]);

  // Calculate total score whenever individual scores change
  useEffect(() => {
    const total = calculateTotalScore({
      firstImpressionScore: formData.firstImpressionScore,
      originalityScore: formData.originalityScore,
      informationCardScore: formData.informationCardScore,
      workDoneByMemberScore: formData.workDoneByMemberScore,
      basicComfortScore: formData.basicComfortScore,
      safetyScore: formData.safetyScore,
      easyViewOfCatScore: formData.easyViewOfCatScore
    });
    setTotalScore(total);
  }, [
    formData.firstImpressionScore,
    formData.originalityScore,
    formData.informationCardScore,
    formData.workDoneByMemberScore,
    formData.basicComfortScore,
    formData.safetyScore,
    formData.easyViewOfCatScore
  ]);

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
      catId,
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

  const handleSave = async () => {
    if (!validateForm()) return;

    const scoreData: CreateScoreInput = {
      catId,
      ...formData,
      isFinalized: false
    };

    try {
      // Clear previous errors
      setNetworkError(null);
      setConflictError(null);
      setValidationErrors([]);
      setErrors({});

      await handleOptimisticLockConflict(
        () => withRetry(onSave, { maxRetries: 2 })(scoreData),
        async () => {
          // Refresh form data when conflict occurs
          // This would typically refetch the latest score data
          console.log('Optimistic lock conflict detected, need to refresh data');
        }
      );
    } catch (error) {
      logError(error, 'ScoringForm.handleSave');
      const parsedError = parseError(error);
      
      // Handle different error types
      if (parsedError.error.type === 'NETWORK_ERROR' || parsedError.error.type === 'TIMEOUT_ERROR') {
        setNetworkError(error);
      } else if (parsedError.error.type === 'CONFLICT') {
        setConflictError(error);
      } else if (parsedError.error.type === 'VALIDATION_ERROR') {
        setValidationErrors([error]);
        if (parsedError.error.field) {
          setErrors(prev => ({
            ...prev,
            [parsedError.error.field!]: parsedError.error.message
          }));
        }
      } else {
        const userMessage = getUserFriendlyMessage(parsedError);
        setErrors({ form: userMessage });
      }
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const scoreData: CreateScoreInput = {
      catId,
      ...formData,
      isFinalized: true
    };

    try {
      // Clear previous errors
      setNetworkError(null);
      setConflictError(null);
      setValidationErrors([]);
      setErrors({});

      await handleOptimisticLockConflict(
        () => withRetry(onSubmit, { maxRetries: 2 })(scoreData),
        async () => {
          // Refresh form data when conflict occurs
          console.log('Optimistic lock conflict detected, need to refresh data');
        }
      );
    } catch (error) {
      logError(error, 'ScoringForm.handleSubmit');
      const parsedError = parseError(error);
      
      // Handle different error types
      if (parsedError.error.type === 'NETWORK_ERROR' || parsedError.error.type === 'TIMEOUT_ERROR') {
        setNetworkError(error);
      } else if (parsedError.error.type === 'CONFLICT') {
        setConflictError(error);
      } else if (parsedError.error.type === 'VALIDATION_ERROR') {
        setValidationErrors([error]);
        if (parsedError.error.field) {
          setErrors(prev => ({
            ...prev,
            [parsedError.error.field!]: parsedError.error.message
          }));
        }
      } else {
        const userMessage = getUserFriendlyMessage(parsedError);
        setErrors({ form: userMessage });
      }
    }
  };

  const handleNetworkRetry = async () => {
    setNetworkError(null);
    // The retry will be handled by the NetworkErrorHandler component
  };

  const handleConflictRefresh = async () => {
    setConflictError(null);
    // This would typically refetch the latest data
    // For now, we'll just clear the error and let the user try again
  };

  const handleConflictCancel = () => {
    setConflictError(null);
  };

  const toggleCategory = (categoryKey: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryKey)) {
        newSet.delete(categoryKey);
      } else {
        newSet.add(categoryKey);
      }
      return newSet;
    });
  };

  const expandAllCategories = () => {
    setExpandedCategories(new Set(SCORING_CATEGORY_KEYS));
  };

  const collapseAllCategories = () => {
    setExpandedCategories(new Set());
  };

  return (
    <ScoringErrorBoundary>
      <div className="scoring-form mobile-optimized">
        {/* Sticky Header with Total Score */}
        <div className="sticky-header cage-scoring">
          <div className="header-content">
            <h4 className="form-title">🏆 Cage Scoring</h4>
            <div className="total-score-display mobile">
              <div className="score-circle">
                <span className="score-value">{totalScore}</span>
                <span className="score-max">/100</span>
              </div>
              <div className="score-bar-container">
                <div className="score-bar">
                  <div 
                    className="score-fill"
                    style={{ 
                      width: `${totalScore}%`,
                      backgroundColor: totalScore >= 80 ? '#28a745' : totalScore >= 60 ? '#ffc107' : '#dc3545'
                    }}
                  />
                </div>
                <div className="score-labels">
                  <span className="score-label poor">Poor</span>
                  <span className="score-label good">Good</span>
                  <span className="score-label excellent">Excellent</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Network Error Handler */}
        {networkError && (
          <NetworkErrorHandler
            error={networkError}
            onRetry={handleNetworkRetry}
            onCancel={() => setNetworkError(null)}
          />
        )}

        {/* Conflict Resolution Dialog */}
        {conflictError && (
          <ConflictResolutionDialog
            error={conflictError}
            onRefresh={handleConflictRefresh}
            onCancel={handleConflictCancel}
            itemType="score"
          />
        )}

        {/* Validation Error Summary */}
        <ValidationSummary errors={validationErrors} />
        
        {/* Form-level Error Display */}
        {errors.form && (
          <div className="error-alert mobile">
            <strong>Error:</strong> {errors.form}
          </div>
        )}

        {/* Section Controls */}
        <div className="section-controls">
          <button type="button" onClick={expandAllCategories} className="btn-control">
            Expand All
          </button>
          <button type="button" onClick={collapseAllCategories} className="btn-control">
            Collapse All
          </button>
        </div>

        {/* Mobile Category Scoring - Collapsible Sections */}
        <div className="scoring-categories-container">
          {SCORING_CATEGORY_KEYS.map(categoryKey => {
            const category = SCORING_CATEGORIES[categoryKey];
            const label = SCORING_CATEGORY_LABELS[categoryKey];
            const scoreValue = formData[category.field];
            const commentValue = formData[category.commentField];
            const scoreError = errors[category.field];
            const commentError = errors[category.commentField];
            const isExpanded = expandedCategories.has(categoryKey);

            return (
              <div key={categoryKey} className="scoring-category-container">
                <div 
                  className="category-header"
                  onClick={() => toggleCategory(categoryKey)}
                >
                  <div className="category-info">
                    <h5 className="category-title">{label}</h5>
                    <span className="category-score">
                      {scoreValue}/{category.maxPoints}
                    </span>
                  </div>
                  <span className={`toggle-icon ${isExpanded ? 'expanded' : ''}`}>▼</span>
                </div>

                {isExpanded && (
                  <div className="category-content">
                    <p className="category-description">{category.description}</p>
                    
                    {/* Score Input with Slider */}
                    <div className="score-input-section">
                      <FormField 
                        error={scoreError ? { error: { type: 'VALIDATION_ERROR', message: scoreError, field: category.field } } : null}
                        field={category.field}
                        label={`Score (0-${category.maxPoints})`}
                        required
                      >
                        <div className="score-input-container mobile">
                          <input
                            id={`${categoryKey}-score`}
                            type="number"
                            min="0"
                            max={category.maxPoints}
                            value={scoreValue}
                            onChange={(e) => handleScoreChange(categoryKey, e.target.value)}
                            disabled={loading || !hasPermission}
                            className="score-input touch-optimized"
                          />
                          <div className="slider-container">
                            <input
                              type="range"
                              min="0"
                              max={category.maxPoints}
                              value={scoreValue}
                              onChange={(e) => handleScoreChange(categoryKey, e.target.value)}
                              disabled={loading || !hasPermission}
                              className="score-slider"
                            />
                            <div className="slider-labels">
                              <span>0</span>
                              <span>{Math.floor(category.maxPoints / 2)}</span>
                              <span>{category.maxPoints}</span>
                            </div>
                          </div>
                        </div>
                      </FormField>
                    </div>

                    {/* Comment Input */}
                    <div className="comment-input-section">
                      <FormField 
                        error={commentError ? { error: { type: 'VALIDATION_ERROR', message: commentError, field: category.commentField } } : null}
                        field={category.commentField}
                        label="Comments (optional)"
                      >
                        <textarea
                          id={`${categoryKey}-comments`}
                          value={commentValue}
                          onChange={(e) => handleCommentChange(categoryKey, e.target.value)}
                          maxLength={MAX_COMMENT_LENGTH}
                          rows={3}
                          placeholder={hasPermission ? `Comments for ${label.toLowerCase()}...` : 'View only - no permission to edit'}
                          disabled={loading || !hasPermission}
                          className="comment-textarea touch-optimized"
                        />
                        <div className="char-count">
                          {commentValue.length}/{MAX_COMMENT_LENGTH}
                        </div>
                      </FormField>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Permission Check */}
        {!hasPermission && (
          <div className="permission-warning">
            <h5>⚠️ Access Restricted</h5>
            <p>
              You need <strong>judge</strong> or <strong>admin</strong> role to save or submit scores.
              <br />
              Please contact an administrator to update your permissions.
            </p>
          </div>
        )}

        {/* Floating Action Buttons */}
        <div className="floating-actions">
          <button 
            type="button"
            onClick={handleSave}
            disabled={loading || !hasPermission}
            className="floating-action-button save"
            title={hasPermission ? 'Save draft score' : 'Requires judge or admin role'}
          >
            <span className="action-icon">💾</span>
            <span className="action-text">{loading ? 'Saving...' : 'Save Draft'}</span>
          </button>
          
          <button 
            type="button"
            onClick={handleSubmit}
            disabled={loading || !hasPermission}
            className="floating-action-button submit"
            title={hasPermission ? 'Submit final score' : 'Requires judge or admin role'}
          >
            <span className="action-icon">✅</span>
            <span className="action-text">{loading ? 'Submitting...' : 'Submit Final'}</span>
          </button>
        </div>
      </div>
    </ScoringErrorBoundary>
  );
}

export default ScoringForm;