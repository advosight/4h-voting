import React from 'react';
import { 
  ClassScoringValidationError, 
  getValidationErrorSummary,
  validateClassScoringInput,
  validateHealthRequirements
} from '../utils/classErrorHandling';

interface ClassScoringValidationDisplayProps {
  errors: ClassScoringValidationError[];
  showSummary?: boolean;
  className?: string;
}

export const ClassScoringValidationDisplay: React.FC<ClassScoringValidationDisplayProps> = ({
  errors,
  showSummary = false,
  className = ''
}) => {
  if (errors.length === 0) return null;

  const errorsByCategory = errors.reduce((acc, error) => {
    if (!acc[error.category]) {
      acc[error.category] = [];
    }
    acc[error.category].push(error);
    return acc;
  }, {} as Record<string, ClassScoringValidationError[]>);

  const getCategoryIcon = (category: string): string => {
    switch (category) {
      case 'beauty': return '✨';
      case 'personality': return '😸';
      case 'balanceProportion': return '⚖️';
      case 'health': return '🏥';
      default: return '⚠️';
    }
  };

  const getCategoryTitle = (category: string): string => {
    switch (category) {
      case 'beauty': return 'Beauty Score';
      case 'personality': return 'Personality Score';
      case 'balanceProportion': return 'Balance/Proportion Score';
      case 'health': return 'Health & Grooming';
      default: return 'General';
    }
  };

  return (
    <div className={`class-scoring-validation-display ${className}`}>
      {showSummary && (
        <div className="validation-summary">
          <span className="summary-icon">⚠️</span>
          <span className="summary-text">{getValidationErrorSummary(errors)}</span>
        </div>
      )}

      <div className="validation-errors">
        {Object.entries(errorsByCategory).map(([category, categoryErrors]) => (
          <div key={category} className={`validation-category ${category}`}>
            <div className="category-header">
              <span className="category-icon">{getCategoryIcon(category)}</span>
              <span className="category-title">{getCategoryTitle(category)}</span>
            </div>
            
            <ul className="category-errors">
              {categoryErrors.map((error, index) => (
                <li key={index} className="validation-error">
                  <span className="error-message">{error.message}</span>
                  
                  {error.validationDetails && (
                    <div className="error-details">
                      {error.validationDetails.minValue !== undefined && 
                       error.validationDetails.maxValue !== undefined && (
                        <span className="range-info">
                          Valid range: {error.validationDetails.minValue}-{error.validationDetails.maxValue}
                        </span>
                      )}
                      
                      {error.validationDetails.currentValue !== undefined && (
                        <span className="current-value">
                          Current: {error.validationDetails.currentValue}
                        </span>
                      )}
                      
                      {error.validationDetails.requiredFields && (
                        <div className="required-fields">
                          <span>Required: </span>
                          <ul>
                            {error.validationDetails.requiredFields.map((field: string, idx: number) => (
                              <li key={idx}>{field}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

// Hook for real-time validation
export const useClassScoringValidation = (formData: {
  beautyScore?: number;
  personalityScore?: number;
  balanceProportionScore?: number;
  coatCleanGroomed?: boolean;
  teethGumsHealthy?: boolean;
  eyesNoseClear?: boolean;
  earsCleanMiteFree?: boolean;
  toenailsClipped?: boolean;
  fleaIssues?: boolean;
}, isFinalized: boolean = false) => {
  const [validationErrors, setValidationErrors] = React.useState<ClassScoringValidationError[]>([]);

  React.useEffect(() => {
    const errors: ClassScoringValidationError[] = [];

    // Validate scoring input
    try {
      const scoringErrors = validateClassScoringInput(formData);
      errors.push(...scoringErrors);
    } catch (error) {
      if (error instanceof ClassScoringValidationError) {
        errors.push(error);
      }
    }

    // Validate health requirements if finalizing
    if (isFinalized) {
      try {
        const healthErrors = validateHealthRequirements(formData);
        errors.push(...healthErrors);
      } catch (error) {
        if (error instanceof ClassScoringValidationError) {
          errors.push(error);
        }
      }
    }

    setValidationErrors(errors);
  }, [formData, isFinalized]);

  const isValid = validationErrors.length === 0;
  const hasErrors = validationErrors.length > 0;
  const errorsByCategory = validationErrors.reduce((acc, error) => {
    if (!acc[error.category]) {
      acc[error.category] = [];
    }
    acc[error.category].push(error);
    return acc;
  }, {} as Record<string, ClassScoringValidationError[]>);

  return {
    validationErrors,
    isValid,
    hasErrors,
    errorsByCategory,
    getErrorsForField: (field: string) => 
      validationErrors.filter(error => error.field === field),
    getErrorsForCategory: (category: string) => 
      validationErrors.filter(error => error.category === category)
  };
};

// Component for field-specific validation display
interface FieldValidationProps {
  field: string;
  errors: ClassScoringValidationError[];
  className?: string;
  showIcon?: boolean;
  inline?: boolean;
}

export const FieldValidation: React.FC<FieldValidationProps> = ({
  field,
  errors,
  className = '',
  showIcon = true,
  inline = false
}) => {
  const fieldErrors = errors.filter(error => error.field === field);
  
  if (fieldErrors.length === 0) return null;

  const containerClass = `field-validation ${className} ${inline ? 'inline' : 'block'}`;

  return (
    <div className={containerClass}>
      {fieldErrors.map((error, index) => (
        <div key={index} className="field-error">
          {showIcon && <span className="error-icon">⚠️</span>}
          <span className="error-text">{error.message}</span>
          {error.validationDetails && (
            <div className="error-help">
              {error.validationDetails.minValue !== undefined && 
               error.validationDetails.maxValue !== undefined && (
                <small>
                  Valid range: {error.validationDetails.minValue}-{error.validationDetails.maxValue}
                </small>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Enhanced validation display with retry and recovery options
interface EnhancedValidationDisplayProps extends ClassScoringValidationDisplayProps {
  onRetry?: () => void;
  onClearErrors?: () => void;
  isRetrying?: boolean;
  canRetry?: boolean;
  context?: 'form' | 'submission' | 'finalization';
}

export const EnhancedClassScoringValidationDisplay: React.FC<EnhancedValidationDisplayProps> = ({
  errors,
  showSummary = false,
  className = '',
  onRetry,
  onClearErrors,
  isRetrying = false,
  canRetry = false,
  context = 'form'
}) => {
  if (errors.length === 0) return null;

  const errorsByCategory = errors.reduce((acc, error) => {
    if (!acc[error.category]) {
      acc[error.category] = [];
    }
    acc[error.category].push(error);
    return acc;
  }, {} as Record<string, ClassScoringValidationError[]>);

  const getCategoryIcon = (category: string): string => {
    switch (category) {
      case 'beauty': return '✨';
      case 'personality': return '😸';
      case 'balanceProportion': return '⚖️';
      case 'health': return '🏥';
      default: return '⚠️';
    }
  };

  const getCategoryTitle = (category: string): string => {
    switch (category) {
      case 'beauty': return 'Beauty Score';
      case 'personality': return 'Personality Score';
      case 'balanceProportion': return 'Balance/Proportion Score';
      case 'health': return 'Health & Grooming';
      default: return 'General';
    }
  };

  const getContextualHelp = (): string => {
    switch (context) {
      case 'submission':
        return 'Please fix these errors before submitting your class score.';
      case 'finalization':
        return 'All validation errors must be resolved before finalizing the class score.';
      default:
        return 'Please review and correct the following validation errors.';
    }
  };

  const getSeverityClass = (): string => {
    const hasHealthErrors = errors.some(e => e.category === 'health');
    const hasScoreErrors = errors.some(e => ['beauty', 'personality', 'balanceProportion'].includes(e.category));
    
    if (hasHealthErrors) return 'severity-high';
    if (hasScoreErrors) return 'severity-medium';
    return 'severity-low';
  };

  return (
    <div className={`enhanced-class-scoring-validation-display ${className} ${getSeverityClass()}`}>
      {showSummary && (
        <div className="validation-summary">
          <span className="summary-icon">⚠️</span>
          <span className="summary-text">{getValidationErrorSummary(errors)}</span>
        </div>
      )}

      <div className="contextual-help">
        <p>{getContextualHelp()}</p>
      </div>

      <div className="validation-errors">
        {Object.entries(errorsByCategory).map(([category, categoryErrors]) => (
          <div key={category} className={`validation-category ${category}`}>
            <div className="category-header">
              <span className="category-icon">{getCategoryIcon(category)}</span>
              <span className="category-title">{getCategoryTitle(category)}</span>
              <span className="error-count">({categoryErrors.length})</span>
            </div>
            
            <ul className="category-errors">
              {categoryErrors.map((error, index) => (
                <li key={index} className="validation-error">
                  <div className="error-content">
                    <span className="error-message">{error.message}</span>
                    
                    {error.validationDetails && (
                      <div className="error-details">
                        {error.validationDetails.minValue !== undefined && 
                         error.validationDetails.maxValue !== undefined && (
                          <div className="range-info">
                            <strong>Valid range:</strong> {error.validationDetails.minValue}-{error.validationDetails.maxValue}
                            {error.validationDetails.currentValue !== undefined && (
                              <span className="current-value">
                                (Current: {error.validationDetails.currentValue})
                              </span>
                            )}
                          </div>
                        )}
                        
                        {error.validationDetails.requiredFields && (
                          <div className="required-fields">
                            <strong>Required fields:</strong>
                            <ul>
                              {error.validationDetails.requiredFields.map((field: string, idx: number) => (
                                <li key={idx}>{field}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {error.validationDetails.maxLength && (
                          <div className="length-info">
                            <strong>Maximum length:</strong> {error.validationDetails.maxLength} characters
                            {error.validationDetails.currentLength && (
                              <span className="current-length">
                                (Current: {error.validationDetails.currentLength})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {(canRetry || onClearErrors) && (
        <div className="validation-actions">
          {canRetry && onRetry && (
            <button
              onClick={onRetry}
              disabled={isRetrying}
              className="retry-validation-button class-scoring-button-secondary"
            >
              {isRetrying ? 'Retrying...' : 'Retry Validation'}
            </button>
          )}
          
          {onClearErrors && (
            <button
              onClick={onClearErrors}
              className="clear-errors-button class-scoring-button-secondary"
            >
              Clear Errors
            </button>
          )}
        </div>
      )}

      <div className="validation-tips">
        <h4>Validation Tips:</h4>
        <ul>
          <li>Beauty scores range from 0-15 points</li>
          <li>Personality scores range from 0-20 points</li>
          <li>Balance/Proportion scores range from 0-15 points</li>
          <li>All health and grooming items must be evaluated before finalizing</li>
          <li>Comments are limited to 500 characters per category (1000 for health)</li>
        </ul>
      </div>
    </div>
  );
};