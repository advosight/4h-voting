import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScoringErrorBoundary, withScoringErrorBoundary } from '../ScoringErrorBoundary';

// Mock console.error to avoid noise in tests
const originalError = console.error;
beforeAll(() => {
  console.error = vi.fn();
});

afterAll(() => {
  console.error = originalError;
});

// Component that throws an error for testing
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ScoringErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <ScoringErrorBoundary>
        <div>Test content</div>
      </ScoringErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders error UI when child component throws', () => {
    render(
      <ScoringErrorBoundary>
        <ThrowError />
      </ScoringErrorBoundary>
    );

    expect(screen.getByText('Something went wrong with the scoring system')).toBeInTheDocument();
    expect(screen.getByText('An unexpected error occurred. Please try again later.')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <ScoringErrorBoundary fallback={customFallback}>
        <ThrowError />
      </ScoringErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong with the scoring system')).not.toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn();

    render(
      <ScoringErrorBoundary onError={onError}>
        <ThrowError />
      </ScoringErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });

  it('allows retry after error', () => {
    const { rerender } = render(
      <ScoringErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ScoringErrorBoundary>
    );

    // Error should be displayed
    expect(screen.getByText('Something went wrong with the scoring system')).toBeInTheDocument();

    // Click retry button
    fireEvent.click(screen.getByText('Try Again'));

    // Rerender with no error
    rerender(
      <ScoringErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ScoringErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('allows page reload', () => {
    // Mock window.location.reload
    const mockReload = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true
    });

    render(
      <ScoringErrorBoundary>
        <ThrowError />
      </ScoringErrorBoundary>
    );

    fireEvent.click(screen.getByText('Reload Page'));
    expect(mockReload).toHaveBeenCalled();
  });

  it('shows error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ScoringErrorBoundary>
        <ThrowError />
      </ScoringErrorBoundary>
    );

    expect(screen.getByText('Error Details (Development)')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('hides error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <ScoringErrorBoundary>
        <ThrowError />
      </ScoringErrorBoundary>
    );

    expect(screen.queryByText('Error Details (Development)')).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });
});

describe('withScoringErrorBoundary HOC', () => {
  it('wraps component with error boundary', () => {
    const TestComponent = () => <div>Test component</div>;
    const WrappedComponent = withScoringErrorBoundary(TestComponent);

    render(<WrappedComponent />);

    expect(screen.getByText('Test component')).toBeInTheDocument();
  });

  it('handles errors in wrapped component', () => {
    const WrappedComponent = withScoringErrorBoundary(ThrowError);

    render(<WrappedComponent />);

    expect(screen.getByText('Something went wrong with the scoring system')).toBeInTheDocument();
  });

  it('uses custom fallback when provided', () => {
    const customFallback = <div>HOC custom error</div>;
    const WrappedComponent = withScoringErrorBoundary(ThrowError, customFallback);

    render(<WrappedComponent />);

    expect(screen.getByText('HOC custom error')).toBeInTheDocument();
  });
});