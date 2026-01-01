import React from 'react';
import { parseError, getUserFriendlyMessage } from '../utils/errorHandling';

interface ValidationErrorDisplayProps {
  error: any;
  field?: string;
  className?: string;
}

export const ValidationErrorDisplay: React.FC<ValidationErrorDisplayProps> = ({
  error,
  field,
  className = ''
}) => {
  if (!error) return null;

  const parsedError = parseError(error);
  
  // Only show validation errors
  if (!parsedError?.error || parsedError.error.type !== 'VALIDATION_ERROR') return null;

  // If field is specified, only show errors for that field
  if (field && parsedError.error.field && parsedError.error.field !== field) {
    return null;
  }

  const message = getUserFriendlyMessage(parsedError);

  return (
    <div className={`validation-error ${className}`}>
      {message}
    </div>
  );
};

interface FormFieldProps {
  children: React.ReactNode;
  error?: any;
  field?: string;
  label?: string;
  required?: boolean;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  children,
  error,
  field,
  label,
  required = false,
  className = ''
}) => {
  const parsedError = error ? parseError(error) : null;
  const hasError = parsedError?.error && parsedError.error.type === 'VALIDATION_ERROR' && 
    (!field || !parsedError.error.field || parsedError.error.field === field);

  return (
    <div className={`form-field ${hasError ? 'error' : ''} ${className}`}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="required-indicator">*</span>}
        </label>
      )}
      
      {children}
      
      <ValidationErrorDisplay error={error} field={field} />
    </div>
  );
};

interface ValidationSummaryProps {
  errors: any[];
  title?: string;
  className?: string;
}

export const ValidationSummary: React.FC<ValidationSummaryProps> = ({
  errors,
  title = 'Please correct the following errors:',
  className = ''
}) => {
  const validationErrors = errors
    .map(error => parseError(error))
    .filter(parsed => parsed?.error && parsed.error.type === 'VALIDATION_ERROR');

  if (validationErrors.length === 0) return null;

  return (
    <div className={`validation-summary ${className}`}>
      <h4>{title}</h4>
      <ul>
        {validationErrors.map((error, index) => (
          <li key={index}>
            {getUserFriendlyMessage(error)}
          </li>
        ))}
      </ul>
    </div>
  );
};