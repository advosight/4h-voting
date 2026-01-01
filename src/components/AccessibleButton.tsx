import React, { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { ACCESSIBILITY_CONSTANTS } from '../utils/accessibility';

interface AccessibleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'text' | 'icon';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  loadingText?: string;
  fullWidth?: boolean;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'medium',
      loading = false,
      loadingText,
      fullWidth = false,
      startIcon,
      endIcon,
      ariaLabel,
      ariaDescribedBy,
      className = '',
      disabled,
      onClick,
      ...props
    },
    ref
  ) => {
    const { config, announceToScreenReader, isMobile } = useAccessibility();

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (loading || disabled) {
        event.preventDefault();
        return;
      }

      // Announce action to screen readers if needed
      if (config.screenReaderMode && ariaLabel) {
        announceToScreenReader(`${ariaLabel} activated`);
      }

      onClick?.(event);
    };

    const getButtonClasses = () => {
      const baseClasses = [
        'button',
        'touch-target',
        `button-${variant}`,
        `button-${size}`,
      ];

      if (fullWidth) baseClasses.push('button-full-width');
      if (loading) baseClasses.push('loading');
      if (isMobile) baseClasses.push('button-mobile');
      if (config.highContrastMode) baseClasses.push('high-contrast');

      return [...baseClasses, className].join(' ');
    };

    const getMinimumSize = () => {
      const minSize = config.minTouchTarget;
      switch (size) {
        case 'small':
          return Math.max(minSize, 36);
        case 'large':
          return Math.max(minSize, 56);
        default:
          return minSize;
      }
    };

    const buttonStyle: React.CSSProperties = {
      minWidth: `${getMinimumSize()}px`,
      minHeight: `${getMinimumSize()}px`,
      ...props.style,
    };

    const buttonContent = (
      <>
        {loading && (
          <span className="sr-only">
            {loadingText || 'Loading, please wait'}
          </span>
        )}
        {startIcon && !loading && (
          <span className="button-icon button-start-icon" aria-hidden="true">
            {startIcon}
          </span>
        )}
        <span className={loading ? 'sr-only' : 'button-text'}>
          {children}
        </span>
        {endIcon && !loading && (
          <span className="button-icon button-end-icon" aria-hidden="true">
            {endIcon}
          </span>
        )}
      </>
    );

    return (
      <button
        ref={ref}
        className={getButtonClasses()}
        style={buttonStyle}
        disabled={disabled || loading}
        onClick={handleClick}
        aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
        aria-describedby={ariaDescribedBy}
        aria-busy={loading}
        {...props}
      >
        {buttonContent}
      </button>
    );
  }
);

AccessibleButton.displayName = 'AccessibleButton';

export default AccessibleButton;