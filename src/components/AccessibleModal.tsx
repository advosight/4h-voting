import React, { useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useAccessibleNavigation } from '../hooks/useAccessibleNavigation';
import AccessibleButton from './AccessibleButton';

interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  className?: string;
  ariaDescribedBy?: string;
}

export const AccessibleModal: React.FC<AccessibleModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className = '',
  ariaDescribedBy,
}) => {
  const { config, announceToScreenReader, isMobile } = useAccessibility();
  const { containerRef } = useAccessibleNavigation({
    trapFocus: isOpen,
    autoFocus: isOpen,
    onEscape: closeOnEscape ? onClose : undefined,
  });

  // Store the previously focused element
  const previouslyFocusedElement = React.useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previouslyFocusedElement.current = document.activeElement as HTMLElement;
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      // Announce modal opening to screen readers
      if (config.screenReaderMode) {
        announceToScreenReader(`${title} dialog opened`, 'assertive');
      }
    } else {
      // Restore body scroll
      document.body.style.overflow = '';
      
      // Restore focus to previously focused element
      if (previouslyFocusedElement.current) {
        previouslyFocusedElement.current.focus();
      }
      
      // Announce modal closing to screen readers
      if (config.screenReaderMode) {
        announceToScreenReader(`${title} dialog closed`, 'polite');
      }
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, title, config.screenReaderMode, announceToScreenReader]);

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleClose = () => {
    onClose();
  };

  const getModalClasses = () => {
    const baseClasses = [
      'modal-content',
      `modal-${size}`,
    ];

    if (isMobile) baseClasses.push('modal-mobile');
    if (config.highContrastMode) baseClasses.push('high-contrast');

    return [...baseClasses, className].join(' ');
  };

  if (!isOpen) {
    return null;
  }

  const modalContent = (
    <div
      className="modal-overlay"
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        ref={containerRef}
        className={getModalClasses()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={ariaDescribedBy}
      >
        {showCloseButton && (
          <AccessibleButton
            className="modal-close"
            variant="icon"
            onClick={handleClose}
            ariaLabel={`Close ${title} dialog`}
          >
            ×
          </AccessibleButton>
        )}

        <h2 id="modal-title" className="modal-title">
          {title}
        </h2>

        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default AccessibleModal;