/**
 * Accessibility utilities for mobile optimization
 * Implements WCAG 2.1 AA guidelines for mobile interfaces
 */

export interface AccessibilityConfig {
  minTouchTarget: number;
  focusRingWidth: number;
  highContrastMode: boolean;
  reducedMotion: boolean;
  screenReaderMode: boolean;
}

export const ACCESSIBILITY_CONSTANTS = {
  MIN_TOUCH_TARGET: 44, // WCAG guideline minimum
  RECOMMENDED_TOUCH_TARGET: 48, // Material Design recommendation
  MIN_CONTRAST_RATIO: 4.5, // WCAG AA standard
  FOCUS_RING_WIDTH: 2,
  KEYBOARD_NAVIGATION_DELAY: 100,
} as const;

/**
 * Detects if user prefers reduced motion
 */
export const prefersReducedMotion = (): boolean => {
  try {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

/**
 * Detects if user prefers high contrast
 */
export const prefersHighContrast = (): boolean => {
  try {
    return window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches;
  } catch {
    return false;
  }
};

/**
 * Detects if screen reader is likely active
 */
export const isScreenReaderActive = (): boolean => {
  // Check for common screen reader indicators
  return !!(
    navigator.userAgent.includes('NVDA') ||
    navigator.userAgent.includes('JAWS') ||
    navigator.userAgent.includes('VoiceOver') ||
    navigator.userAgent.includes('TalkBack') ||
    window.speechSynthesis?.speaking
  );
};

/**
 * Validates touch target size meets WCAG guidelines
 */
export const validateTouchTarget = (element: HTMLElement): boolean => {
  const rect = element.getBoundingClientRect();
  const minSize = ACCESSIBILITY_CONSTANTS.MIN_TOUCH_TARGET;
  return rect.width >= minSize && rect.height >= minSize;
};

/**
 * Ensures proper focus management for mobile
 */
export const manageFocus = {
  /**
   * Sets focus to element with proper mobile considerations
   */
  setFocus: (element: HTMLElement, options?: { preventScroll?: boolean }) => {
    // Delay focus to ensure mobile keyboard doesn't interfere
    setTimeout(() => {
      element.focus({ preventScroll: options?.preventScroll });
    }, ACCESSIBILITY_CONSTANTS.KEYBOARD_NAVIGATION_DELAY);
  },

  /**
   * Traps focus within a container (for modals, drawers)
   */
  trapFocus: (container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    return () => container.removeEventListener('keydown', handleTabKey);
  },

  /**
   * Announces content to screen readers
   */
  announce: (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.textContent = message;
    
    document.body.appendChild(announcer);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  }
};

/**
 * Generates accessible labels and descriptions
 */
export const generateAccessibleContent = {
  /**
   * Creates descriptive label for form inputs
   */
  createLabel: (fieldName: string, required: boolean = false): string => {
    const label = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
    return required ? `${label} (required)` : label;
  },

  /**
   * Creates error message with proper ARIA attributes
   */
  createErrorMessage: (fieldName: string, error: string): string => {
    return `${fieldName} error: ${error}`;
  },

  /**
   * Creates loading announcement
   */
  createLoadingMessage: (action: string): string => {
    return `Loading ${action}, please wait`;
  },

  /**
   * Creates success announcement
   */
  createSuccessMessage: (action: string): string => {
    return `${action} completed successfully`;
  }
};

/**
 * Touch target enhancement utilities
 */
export const touchTargetUtils = {
  /**
   * Ensures minimum touch target size
   */
  ensureMinimumSize: (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const minSize = ACCESSIBILITY_CONSTANTS.MIN_TOUCH_TARGET;
    
    if (rect.width < minSize) {
      element.style.minWidth = `${minSize}px`;
    }
    if (rect.height < minSize) {
      element.style.minHeight = `${minSize}px`;
    }
  },

  /**
   * Adds proper spacing between touch targets
   */
  addTouchSpacing: (element: HTMLElement) => {
    element.style.margin = '8px';
  }
};

/**
 * Keyboard navigation utilities
 */
export const keyboardNavigation = {
  /**
   * Handles arrow key navigation for lists
   */
  handleArrowKeys: (
    event: KeyboardEvent,
    items: HTMLElement[],
    currentIndex: number,
    onIndexChange: (index: number) => void
  ) => {
    let newIndex = currentIndex;
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        newIndex = Math.min(currentIndex + 1, items.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        newIndex = Math.max(currentIndex - 1, 0);
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = items.length - 1;
        break;
    }
    
    if (newIndex !== currentIndex) {
      onIndexChange(newIndex);
      manageFocus.setFocus(items[newIndex]);
    }
  },

  /**
   * Handles escape key for closing modals/drawers
   */
  handleEscape: (event: KeyboardEvent, onEscape: () => void) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onEscape();
    }
  }
};

/**
 * Zoom and viewport utilities
 */
export const zoomUtils = {
  /**
   * Detects current zoom level
   */
  getZoomLevel: (): number => {
    try {
      return Math.round((window.outerWidth / window.innerWidth) * 100) / 100;
    } catch {
      return 1;
    }
  },

  /**
   * Checks if zoom level is within acceptable range (up to 200%)
   */
  isZoomAcceptable: (): boolean => {
    const zoom = zoomUtils.getZoomLevel();
    return zoom <= 2.0; // 200% maximum
  },

  /**
   * Adjusts layout for high zoom levels
   */
  adjustForZoom: (element: HTMLElement) => {
    const zoom = zoomUtils.getZoomLevel();
    if (zoom > 1.5) {
      element.classList.add('high-zoom-layout');
    } else {
      element.classList.remove('high-zoom-layout');
    }
  }
};

/**
 * ARIA utilities for dynamic content
 */
export const ariaUtils = {
  /**
   * Updates ARIA live region content
   */
  updateLiveRegion: (regionId: string, content: string, priority: 'polite' | 'assertive' = 'polite') => {
    let region = document.getElementById(regionId);
    if (!region) {
      region = document.createElement('div');
      region.id = regionId;
      region.setAttribute('aria-live', priority);
      region.setAttribute('aria-atomic', 'true');
      region.className = 'sr-only';
      document.body.appendChild(region);
    }
    region.textContent = content;
  },

  /**
   * Sets up proper ARIA attributes for form validation
   */
  setupFormValidation: (input: HTMLInputElement, errorId: string) => {
    input.setAttribute('aria-describedby', errorId);
    input.setAttribute('aria-invalid', 'false');
  },

  /**
   * Updates form validation state
   */
  updateValidationState: (input: HTMLInputElement, isValid: boolean, errorMessage?: string) => {
    input.setAttribute('aria-invalid', isValid ? 'false' : 'true');
    
    if (!isValid && errorMessage) {
      const errorId = input.getAttribute('aria-describedby');
      if (errorId) {
        const errorElement = document.getElementById(errorId);
        if (errorElement) {
          errorElement.textContent = errorMessage;
        }
      }
    }
  }
};