import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FitShowScoringErrorBoundary from '../FitShowScoringErrorBoundary';

// Component that throws an error for testing
const ThrowError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>No error</div>;
};

describe('FitShowScoringErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children when no error occurs', () => {
    render(
      <FitShowScoringErrorBoundary>
        <ThrowError shouldThrow={false} />
      </FitShowScoringErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should render error UI when error occurs', () => {
    render(
      <FitShowScoringErrorBoundary>
        <ThrowError shouldThrow={true} />
      </FitShowScoringErrorBoundary>
    );

    expect(screen.getByText('Fit & Show Scoring Error')).toBeInTheDocument();
    expect(screen.getByText(/Something went wrong with the fit and show scoring system/)).toBeInTheDocument();
  });

  it('should display error message in technical details', () => {
    render(
      <FitShowScoringErrorBoundary>
        <ThrowError shouldThrow={true} />
      </FitShowScoringErrorBoundary>
    );

    // Click to expand technical details
    const detailsToggle = screen.getByText('Technical Details');
    fireEvent.click(detailsToggle);

    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('should generate unique error ID', () => {
    const { unmount } = render(
      <FitShowScoringErrorBoundary>
        <ThrowError shouldThrow={true} />
      </FitShowScoringErrorBoundary>
    );

    // Click to expand technical details
    const detailsToggle = screen.getByText('Technical Details');
    fireEvent.click(detailsToggle);

    const errorIdElement = screen.getByText(/Error ID:/);
    expect(errorIdElement).toBeInTheDocument();
    
    const errorIdText = errorIdElement.textContent;
    expect(errorIdText).toMatch(/Error ID: fitshow-error-\d+-[a-z0-9]+/);

    unmount();

    // Render again and check for different error ID
    render(
      <FitShowScoringErrorBoundary>
        <ThrowError shouldThrow={true} />
      </FitShowScoringErrorBoundary>
    );

    const detailsToggle2 = screen.getByText('Technical Details');
    fireEvent.click(detailsToggle2);

    const errorIdElement2 = screen.getByText(/Error ID:/);
    const errorIdText2 = errorIdElement2.textContent;
    
    expect(errorIdText2).not.toBe(errorIdText);
  });

  it('should call onError callback when provided', () => {
    const onError = jest.fn();
    
    render(
      <FitShowScoringErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </FitShowScoringErrorBoundary>
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });

  it('should render custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;
    
    render(
      <FitShowScoringErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </FitShowScoringErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText('Fit & Show Scoring Error')).not.toBeInTheDocument();
  });

  it('should reset error state when Try Again is clicked', () => {
    const { rerender } = render(
      <FitShowScoringErrorBoundary>
        <ThrowError shouldThrow={true} />
      </FitShowScoringErrorBoundary>
    );

    expect(screen.getByText('Fit & Show Scoring Error')).toBeInTheDocument();

    const tryAgainButton = screen.getByText('Try Again');
    fireEvent.click(tryAgainButton);

    // Re-render with no error
    rerender(
      <FitShowScoringErrorBoundary>
        <ThrowError shouldThrow={false} />
      </FitShowScoringErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
    expect(screen.queryByText('Fit & Show Scoring Error')).not.toBeInTheDocument();
  });

  it('should reload page when Reload Page is clicked', () => {
    // Mock window.location.reload
    const mockReload = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true
    });

    render(
      <FitShowScoringErrorBoundary>
        <ThrowError shouldThrow={true} />
      </FitShowScoringErrorBoundary>
    );

    const reloadButton = screen.getByText('Reload Page');
    fireEvent.click(reloadButton);

    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it('should display help information', () => {
    render(
      <FitShowScoringErrorBoundary>
        <ThrowError shouldThrow={true} />
      </FitShowScoringErrorBoundary>
    );

    expect(screen.getByText('What you can do:')).toBeInTheDocument();
    expect(screen.getByText('• Try clicking "Try Again" to retry the operation')).toBeInTheDocument();
    expect(screen.getByText('• Refresh the page to start over')).toBeInTheDocument();
    expect(screen.getByText('• Check your internet connection')).toBeInTheDocument();
    expect(screen.getByText('• Contact support if the problem persists')).toBeInTheDocument();
  });

  it('should display current timestamp', () => {
    render(
      <FitShowScoringErrorBoundary>
        <ThrowError shouldThrow={true} />
      </FitShowScoringErrorBoundary>
    );

    // Click to expand technical details
    const detailsToggle = screen.getByText('Technical Details');
    fireEvent.click(detailsToggle);

    const timeElement = screen.getByText(/Time:/);
    expect(timeElement).toBeInTheDocument();
    
    // Check that it contains a reasonable timestamp format
    expect(timeElement.textContent).toMatch(/Time: \d{1,2}\/\d{1,2}\/\d{4}/);
  });

  it('should display stack trace when available', () => {
    render(
      <FitShowScoringErrorBoundary>
        <ThrowError shouldThrow={true} />
      </FitShowScoringErrorBoundary>
    );

    // Click to expand technical details
    const detailsToggle = screen.getByText('Technical Details');
    fireEvent.click(detailsToggle);

    expect(screen.getByText('Stack Trace:')).toBeInTheDocument();
    // Stack trace should contain the error message
    expect(screen.getByText(/Test error message/)).toBeInTheDocument();
  });

  it('should display component stack when available', () => {
    render(
      <FitShowScoringErrorBoundary>
        <ThrowError shouldThrow={true} />
      </FitShowScoringErrorBoundary>
    );

    // Click to expand technical details
    const detailsToggle = screen.getByText('Technical Details');
    fireEvent.click(detailsToggle);

    expect(screen.getByText('Component Stack:')).toBeInTheDocument();
  });

  it('should log error to console', () => {
    render(
      <FitShowScoringErrorBoundary>
        <ThrowError shouldThrow={true} />
      </FitShowScoringErrorBoundary>
    );

    expect(console.error).toHaveBeenCalledWith(
      'FitShow Scoring Error Boundary caught an error:',
      expect.objectContaining({
        error: 'Test error message',
        stack: expect.any(String),
        componentStack: expect.any(String),
        errorId: expect.stringMatching(/fitshow-error-\d+-[a-z0-9]+/),
        timestamp: expect.any(String)
      })
    );
  });

  it('should report to error tracker if available', () => {
    const mockErrorTracker = {
      captureException: jest.fn()
    };

    // Mock window.errorTracker
    (window as any).errorTracker = mockErrorTracker;

    render(
      <FitShowScoringErrorBoundary>
        <ThrowError shouldThrow={true} />
      </FitShowScoringErrorBoundary>
    );

    expect(mockErrorTracker.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: {
          component: 'FitShowScoring',
          errorBoundary: true
        },
        extra: expect.objectContaining({
          componentStack: expect.any(String),
          errorId: expect.any(String)
        })
      })
    );

    // Clean up
    delete (window as any).errorTracker;
  });

  it('should display support information with error ID', () => {
    render(
      <FitShowScoringErrorBoundary>
        <ThrowError shouldThrow={true} />
      </FitShowScoringErrorBoundary>
    );

    expect(screen.getByText(/If this error continues, please report it with Error ID:/)).toBeInTheDocument();
    
    const errorIdCode = screen.getByRole('generic', { name: /fitshow-error-/ });
    expect(errorIdCode).toBeInTheDocument();
  });

  it('should handle errors without stack traces gracefully', () => {
    // Create an error without stack trace
    const ErrorWithoutStack: React.FC = () => {
      const error = new Error('Error without stack');
      delete error.stack;
      throw error;
    };

    render(
      <FitShowScoringErrorBoundary>
        <ErrorWithoutStack />
      </FitShowScoringErrorBoundary>
    );

    expect(screen.getByText('Fit & Show Scoring Error')).toBeInTheDocument();
    
    // Click to expand technical details
    const detailsToggle = screen.getByText('Technical Details');
    fireEvent.click(detailsToggle);

    expect(screen.getByText('Error without stack')).toBeInTheDocument();
  });
});