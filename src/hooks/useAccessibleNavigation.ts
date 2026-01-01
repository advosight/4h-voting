import { useEffect, useRef, useCallback } from 'react';
import { manageFocus, keyboardNavigation } from '../utils/accessibility';

interface UseAccessibleNavigationOptions {
  trapFocus?: boolean;
  autoFocus?: boolean;
  onEscape?: () => void;
  arrowKeyNavigation?: boolean;
}

export const useAccessibleNavigation = (options: UseAccessibleNavigationOptions = {}) => {
  const containerRef = useRef<HTMLElement>(null);
  const focusableElementsRef = useRef<HTMLElement[]>([]);
  const currentIndexRef = useRef<number>(0);

  // Update focusable elements
  const updateFocusableElements = useCallback(() => {
    if (!containerRef.current) return;

    const focusableSelectors = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]:not([aria-disabled="true"])',
      '[role="link"]:not([aria-disabled="true"])',
    ].join(', ');

    const elements = Array.from(
      containerRef.current.querySelectorAll(focusableSelectors)
    ) as HTMLElement[];

    focusableElementsRef.current = elements;
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const { onEscape, arrowKeyNavigation } = options;

    // Handle escape key
    if (event.key === 'Escape' && onEscape) {
      keyboardNavigation.handleEscape(event, onEscape);
      return;
    }

    // Handle arrow key navigation
    if (arrowKeyNavigation && focusableElementsRef.current.length > 0) {
      keyboardNavigation.handleArrowKeys(
        event,
        focusableElementsRef.current,
        currentIndexRef.current,
        (newIndex) => {
          currentIndexRef.current = newIndex;
        }
      );
    }
  }, [options]);

  // Set up focus management
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    updateFocusableElements();

    // Auto focus first element if requested
    if (options.autoFocus && focusableElementsRef.current.length > 0) {
      manageFocus.setFocus(focusableElementsRef.current[0]);
    }

    // Set up focus trap if requested
    let cleanupFocusTrap: (() => void) | undefined;
    if (options.trapFocus) {
      cleanupFocusTrap = manageFocus.trapFocus(container);
    }

    // Add keyboard event listener
    container.addEventListener('keydown', handleKeyDown);

    // Update focusable elements when DOM changes
    const observer = new MutationObserver(updateFocusableElements);
    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'tabindex', 'aria-disabled'],
    });

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      observer.disconnect();
      if (cleanupFocusTrap) {
        cleanupFocusTrap();
      }
    };
  }, [handleKeyDown, updateFocusableElements, options.autoFocus, options.trapFocus]);

  // Focus management methods
  const focusFirst = useCallback(() => {
    if (focusableElementsRef.current.length > 0) {
      manageFocus.setFocus(focusableElementsRef.current[0]);
      currentIndexRef.current = 0;
    }
  }, []);

  const focusLast = useCallback(() => {
    const elements = focusableElementsRef.current;
    if (elements.length > 0) {
      const lastIndex = elements.length - 1;
      manageFocus.setFocus(elements[lastIndex]);
      currentIndexRef.current = lastIndex;
    }
  }, []);

  const focusNext = useCallback(() => {
    const elements = focusableElementsRef.current;
    if (elements.length > 0) {
      const nextIndex = Math.min(currentIndexRef.current + 1, elements.length - 1);
      manageFocus.setFocus(elements[nextIndex]);
      currentIndexRef.current = nextIndex;
    }
  }, []);

  const focusPrevious = useCallback(() => {
    const elements = focusableElementsRef.current;
    if (elements.length > 0) {
      const prevIndex = Math.max(currentIndexRef.current - 1, 0);
      manageFocus.setFocus(elements[prevIndex]);
      currentIndexRef.current = prevIndex;
    }
  }, []);

  return {
    containerRef,
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious,
    updateFocusableElements,
  };
};

export default useAccessibleNavigation;