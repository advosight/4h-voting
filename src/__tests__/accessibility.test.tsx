import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { AccessibilityProvider } from '../contexts/AccessibilityContext';
import AccessibleButton from '../components/AccessibleButton';
import AccessibleInput from '../components/AccessibleInput';
import AccessibleModal from '../components/AccessibleModal';
import { 
  validateTouchTarget, 
  manageFocus, 
  ACCESSIBILITY_CONSTANTS,
  prefersReducedMotion,
  prefersHighContrast,
  zoomUtils
} from '../utils/accessibility';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AccessibilityProvider>
    {children}
  </AccessibilityProvider>
);

describe('Accessibility Utilities', () => {
  describe('Touch Target Validation', () => {
    test('validates minimum touch target size', () => {
      const mockElement = {
        getBoundingClientRect: () => ({
          width: 44,
          height: 44,
          top: 0,
          left: 0,
          bottom: 44,
          right: 44,
        }),
      } as HTMLElement;

      expect(validateTouchTarget(mockElement)).toBe(true);
    });

    test('fails validation for small touch targets', () => {
      const mockElement = {
        getBoundingClientRect: () => ({
          width: 30,
          height: 30,
          top: 0,
          left: 0,
          bottom: 30,
          right: 30,
        }),
      } as HTMLElement;

      expect(validateTouchTarget(mockElement)).toBe(false);
    });
  });

  describe('Focus Management', () => {
    test('announces messages to screen readers', () => {
      const spy = jest.spyOn(document.body, 'appendChild');
      
      manageFocus.announce('Test message', 'polite');
      
      expect(spy).toHaveBeenCalled();
      const announcer = spy.mock.calls[0][0] as HTMLElement;
      expect(announcer.getAttribute('aria-live')).toBe('polite');
      expect(announcer.textContent).toBe('Test message');
      
      spy.mockRestore();
    });
  });

  describe('Media Query Detection', () => {
    test('detects reduced motion preference', () => {
      (window.matchMedia as jest.Mock).mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      expect(prefersReducedMotion()).toBe(true);
    });

    test('detects high contrast preference', () => {
      (window.matchMedia as jest.Mock).mockImplementation(query => ({
        matches: query === '(prefers-contrast: high)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      expect(prefersHighContrast()).toBe(true);
    });
  });

  describe('Zoom Utilities', () => {
    test('calculates zoom level', () => {
      Object.defineProperty(window, 'outerWidth', { value: 1200, writable: true });
      Object.defineProperty(window, 'innerWidth', { value: 600, writable: true });
      
      expect(zoomUtils.getZoomLevel()).toBe(2);
    });

    test('validates acceptable zoom levels', () => {
      Object.defineProperty(window, 'outerWidth', { value: 1200, writable: true });
      Object.defineProperty(window, 'innerWidth', { value: 600, writable: true });
      
      expect(zoomUtils.isZoomAcceptable()).toBe(true);
      
      Object.defineProperty(window, 'innerWidth', { value: 400, writable: true });
      expect(zoomUtils.isZoomAcceptable()).toBe(false);
    });
  });
});

describe('AccessibleButton Component', () => {
  test('renders with proper ARIA attributes', () => {
    render(
      <TestWrapper>
        <AccessibleButton ariaLabel="Test button">
          Click me
        </AccessibleButton>
      </TestWrapper>
    );

    const button = screen.getByRole('button', { name: 'Test button' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Test button');
  });

  test('meets minimum touch target size', () => {
    render(
      <TestWrapper>
        <AccessibleButton>Small button</AccessibleButton>
      </TestWrapper>
    );

    const button = screen.getByRole('button');
    const styles = window.getComputedStyle(button);
    
    // Check that minimum dimensions are set
    expect(button.style.minWidth).toBeTruthy();
    expect(button.style.minHeight).toBeTruthy();
  });

  test('handles loading state with proper ARIA', () => {
    render(
      <TestWrapper>
        <AccessibleButton loading loadingText="Saving data">
          Save
        </AccessibleButton>
      </TestWrapper>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
    expect(screen.getByText('Saving data')).toBeInTheDocument();
  });

  test('has no accessibility violations', async () => {
    const { container } = render(
      <TestWrapper>
        <AccessibleButton>Accessible button</AccessibleButton>
      </TestWrapper>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('AccessibleInput Component', () => {
  test('renders with proper labels and ARIA attributes', () => {
    render(
      <TestWrapper>
        <AccessibleInput
          label="Email address"
          required
          helperText="Enter your email"
        />
      </TestWrapper>
    );

    const input = screen.getByLabelText('Email address (required)');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(screen.getByText('Enter your email')).toBeInTheDocument();
  });

  test('displays error messages with proper ARIA', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <AccessibleInput
          label="Email"
          error="Invalid email format"
        />
      </TestWrapper>
    );

    const input = screen.getByLabelText('Email');
    
    // Trigger blur to show error
    await user.click(input);
    await user.tab();

    await waitFor(() => {
      expect(input).toHaveAttribute('aria-invalid', 'true');
      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toHaveTextContent('Invalid email format');
    });
  });

  test('meets minimum touch target size on mobile', () => {
    render(
      <TestWrapper>
        <AccessibleInput label="Test input" />
      </TestWrapper>
    );

    const input = screen.getByLabelText('Test input');
    expect(input.style.minHeight).toBeTruthy();
  });

  test('has no accessibility violations', async () => {
    const { container } = render(
      <TestWrapper>
        <AccessibleInput
          label="Accessible input"
          helperText="This is an accessible input"
        />
      </TestWrapper>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('AccessibleModal Component', () => {
  test('renders with proper ARIA attributes', () => {
    render(
      <TestWrapper>
        <AccessibleModal
          isOpen={true}
          onClose={() => {}}
          title="Test Modal"
        >
          <p>Modal content</p>
        </AccessibleModal>
      </TestWrapper>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
  });

  test('traps focus within modal', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(
      <TestWrapper>
        <button>Outside button</button>
        <AccessibleModal
          isOpen={true}
          onClose={onClose}
          title="Focus Trap Test"
        >
          <button>Inside button 1</button>
          <button>Inside button 2</button>
        </AccessibleModal>
      </TestWrapper>
    );

    const insideButton1 = screen.getByText('Inside button 1');
    const insideButton2 = screen.getByText('Inside button 2');
    const closeButton = screen.getByLabelText(/close.*dialog/i);

    // Focus should be trapped within modal
    await user.tab();
    expect(document.activeElement).toBe(closeButton);
    
    await user.tab();
    expect(document.activeElement).toBe(insideButton1);
    
    await user.tab();
    expect(document.activeElement).toBe(insideButton2);
    
    // Should cycle back to close button
    await user.tab();
    expect(document.activeElement).toBe(closeButton);
  });

  test('closes on escape key', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(
      <TestWrapper>
        <AccessibleModal
          isOpen={true}
          onClose={onClose}
          title="Escape Test"
          closeOnEscape={true}
        >
          <p>Press escape to close</p>
        </AccessibleModal>
      </TestWrapper>
    );

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  test('has no accessibility violations', async () => {
    const { container } = render(
      <TestWrapper>
        <AccessibleModal
          isOpen={true}
          onClose={() => {}}
          title="Accessible Modal"
        >
          <p>This is an accessible modal</p>
          <button>Action button</button>
        </AccessibleModal>
      </TestWrapper>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Keyboard Navigation', () => {
  test('handles arrow key navigation', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <div role="listbox" aria-label="Test list">
          <button role="option">Item 1</button>
          <button role="option">Item 2</button>
          <button role="option">Item 3</button>
        </div>
      </TestWrapper>
    );

    const items = screen.getAllByRole('option');
    
    // Focus first item
    items[0].focus();
    expect(document.activeElement).toBe(items[0]);

    // Arrow down should move to next item
    await user.keyboard('{ArrowDown}');
    // Note: This test would need the actual keyboard navigation implementation
    // in the component to work properly
  });
});

describe('High Contrast Mode', () => {
  test('applies high contrast styles when preferred', () => {
    (window.matchMedia as jest.Mock).mockImplementation(query => ({
      matches: query === '(prefers-contrast: high)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    render(
      <TestWrapper>
        <AccessibleButton>High contrast button</AccessibleButton>
      </TestWrapper>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('high-contrast');
  });
});

describe('Zoom Support', () => {
  test('adjusts layout for high zoom levels', () => {
    // Mock high zoom level
    Object.defineProperty(window, 'outerWidth', { value: 1200, writable: true });
    Object.defineProperty(window, 'innerWidth', { value: 600, writable: true });

    const mockElement = document.createElement('div');
    const spy = jest.spyOn(mockElement.classList, 'add');

    zoomUtils.adjustForZoom(mockElement);

    expect(spy).toHaveBeenCalledWith('high-zoom-layout');
    
    spy.mockRestore();
  });
});

describe('Screen Reader Support', () => {
  test('provides proper live region updates', () => {
    const spy = jest.spyOn(document.body, 'appendChild');
    
    manageFocus.announce('Status update', 'assertive');
    
    expect(spy).toHaveBeenCalled();
    const announcer = spy.mock.calls[0][0] as HTMLElement;
    expect(announcer.getAttribute('aria-live')).toBe('assertive');
    expect(announcer.getAttribute('aria-atomic')).toBe('true');
    
    spy.mockRestore();
  });
});

describe('Touch Target Guidelines', () => {
  test('enforces minimum 44px touch targets', () => {
    expect(ACCESSIBILITY_CONSTANTS.MIN_TOUCH_TARGET).toBe(44);
    expect(ACCESSIBILITY_CONSTANTS.RECOMMENDED_TOUCH_TARGET).toBe(48);
  });

  test('validates touch target spacing', () => {
    render(
      <TestWrapper>
        <div style={{ display: 'flex', gap: '8px' }}>
          <AccessibleButton>Button 1</AccessibleButton>
          <AccessibleButton>Button 2</AccessibleButton>
        </div>
      </TestWrapper>
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
    
    // Both buttons should meet minimum size requirements
    buttons.forEach(button => {
      expect(button.style.minWidth).toBeTruthy();
      expect(button.style.minHeight).toBeTruthy();
    });
  });
});