import React, { forwardRef, InputHTMLAttributes, useId, useState, useEffect } from 'react';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { ariaUtils, generateAccessibleContent } from '../utils/accessibility';

interface AccessibleInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
}

export const AccessibleInput = forwardRef<HTMLInputElement, AccessibleInputProps>(
  (
    {
      label,
      error,
      helperText,
      required = false,
      size = 'medium',
      fullWidth = false,
      startAdornment,
      endAdornment,
      className = '',
      onChange,
      onBlur,
      onFocus,
      ...props
    },
    ref
  ) => {
    const { config, announceToScreenReader, isMobile } = useAccessibility();
    const [isFocused, setIsFocused] = useState(false);
    const [hasBeenTouched, setHasBeenTouched] = useState(false);

    const inputId = useId();
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;
    const labelId = `${inputId}-label`;

    const showError = error && hasBeenTouched;
    const showHelper = helperText && !showError;

    useEffect(() => {
      if (ref && typeof ref === 'object' && ref.current) {
        ariaUtils.setupFormValidation(ref.current, errorId);
      }
    }, [ref, errorId]);

    useEffect(() => {
      if (ref && typeof ref === 'object' && ref.current) {
        ariaUtils.updateValidationState(ref.current, !showError, error);
      }
    }, [ref, showError, error]);

    const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      onFocus?.(event);
    };

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      setHasBeenTouched(true);
      onBlur?.(event);
    };

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      // Announce validation errors to screen readers
      if (config.screenReaderMode && error && hasBeenTouched) {
        announceToScreenReader(
          generateAccessibleContent.createErrorMessage(label, error),
          'assertive'
        );
      }
      onChange?.(event);
    };

    const getInputClasses = () => {
      const baseClasses = [
        'form-input',
        `input-${size}`,
      ];

      if (fullWidth) baseClasses.push('input-full-width');
      if (isFocused) baseClasses.push('input-focused');
      if (showError) baseClasses.push('input-error');
      if (isMobile) baseClasses.push('input-mobile');
      if (config.highContrastMode) baseClasses.push('high-contrast');
      if (startAdornment) baseClasses.push('input-with-start-adornment');
      if (endAdornment) baseClasses.push('input-with-end-adornment');

      return [...baseClasses, className].join(' ');
    };

    const getContainerClasses = () => {
      const baseClasses = ['form-field'];
      if (fullWidth) baseClasses.push('form-field-full-width');
      return baseClasses.join(' ');
    };

    const getMinimumHeight = () => {
      const minHeight = config.minTouchTarget;
      switch (size) {
        case 'small':
          return Math.max(minHeight, 36);
        case 'large':
          return Math.max(minHeight, 56);
        default:
          return minHeight;
      }
    };

    const inputStyle: React.CSSProperties = {
      minHeight: `${getMinimumHeight()}px`,
      fontSize: isMobile ? '16px' : undefined, // Prevents zoom on iOS
      ...props.style,
    };

    const describedBy = [
      showError ? errorId : undefined,
      showHelper ? helperId : undefined,
    ].filter(Boolean).join(' ');

    return (
      <div className={getContainerClasses()}>
        <label
          id={labelId}
          htmlFor={inputId}
          className={`form-label ${required ? 'required' : ''}`}
        >
          {generateAccessibleContent.createLabel(label, required)}
        </label>

        <div className="input-container">
          {startAdornment && (
            <div className="input-adornment input-start-adornment" aria-hidden="true">
              {startAdornment}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={getInputClasses()}
            style={inputStyle}
            aria-labelledby={labelId}
            aria-describedby={describedBy || undefined}
            aria-required={required}
            aria-invalid={showError}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />

          {endAdornment && (
            <div className="input-adornment input-end-adornment" aria-hidden="true">
              {endAdornment}
            </div>
          )}
        </div>

        {showError && (
          <div
            id={errorId}
            className="form-error"
            role="alert"
            aria-live="polite"
          >
            {error}
          </div>
        )}

        {showHelper && (
          <div
            id={helperId}
            className="form-helper"
          >
            {helperText}
          </div>
        )}
      </div>
    );
  }
);

AccessibleInput.displayName = 'AccessibleInput';

export default AccessibleInput;