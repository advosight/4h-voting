import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ClassScoringErrorBoundary, withClassScoringErrorBoundary } from '../ClassScoringErrorBoundary';

// Mock the error handling utilities
jest.mock('../../utils/errorHandling', () => ({
  logError: jest.fn(),
  parseError: jest.fn((error) => ({
    error: {
      type: 'SYSTEM_ERROR',
      message: error?.message || 'Test error message'
    }
  })),
  getUserFriendlyMessage: jest.fn(() => 'User friendly error message')
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

// Mock alert
global.alert = jest.fn();

// Component that throws an error for testing
const ThrowError: React.FC<{ shouldThrow?: boolean; errorMessage?: string }> = ({ 
  shouldThrow = false, 
  errorMessage = 'Test error' 
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No error</div>;
};

describe('ClassScoringErrorBoundary', () => {
  beforeEach(() => {
    // Mock console.error to avoid noise in test output
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render children when there is no error', () => {
    render(
      <ClassScoringErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ClassScoringErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should render error UI when child component throws', () => {
    render(
      <ClassScoringErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ClassScoringErrorBoundary>
    );

    expect(screen.getByText('Type Class Scoring Error')).toBeInTheDocument();
    expect(screen.getByText('User friendly error message')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Reload Page')).toBeInTheDocument();
  });

  it('should render contextual message for scoring context', () => {
    render(
      <ClassScoringErrorBoundary context="scoring">
        <ThrowError shouldThrow={true} />
      </ClassScoringErrorBoundary>
    );

    expect(screen.getByText(/There was an issue with the class scoring form/)).toBeInTheDocument();
    expect(screen.getByText(/Your progress may have been saved automatically/)).toBeInTheDocument();
  });

  it('should render contextual message for reports context', () => {
    render(
      <ClassScoringErrorBoundary context="reports">
        <ThrowError shouldThrow={true} />
      </ClassScoringErrorBoundary>
    );

    expect(screen.getByText(/Unable to load class scoring reports/)).toBeInTheDocument();
  });

  it('should render contextual message for management context', () => {
    render(
      <ClassScoringErrorBoundary context="management">
        <ThrowError shouldThrow={true} />
      </ClassScoringErrorBoundary>
    );

    expect(screen.getByText(/There was an issue with class score management/)).toBeInTheDocument();
  });

  it('should show scoring help for scoring context', () => {
    render(
      <ClassScoringErrorBoundary context="scoring">
        <ThrowError shouldThrow={true} />
      </ClassScoringErrorBoundary>
    );

    expect(screen.getByText(/Your scoring progress is automatically saved/)).toBeInTheDocument();
  });

  it('should call onError callback when error occurs', () => {
    const onError = jest.fn();
    
    render(
      <ClassScoringErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} errorMessage="Custom error" />
      </ClassScoringErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });

  it('should render custom fallback when provided', () => {
    const customFallback = <div>Custom error fallback</div>;
    
    render(
      <ClassScoringErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ClassScoringErrorBoundary>
    );

    expect(screen.getByText('Custom error fallback')).toBeInTheDocument();
    expect(screen.queryByText('Type Class Scoring Error')).not.toBeInTheDocument();
  });

  it('should reset error state when Try Again is clicked', () => {
    const { rerender } = render(
      <ClassScoringErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ClassScoringErrorBoundary>
    );

    expect(screen.getByText('Type Class Scoring Error')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Try Again'));

    // Re-render with no error
    rerender(
      <ClassScoringErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ClassScoringErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
    expect(screen.queryByText('Type Class Scoring Error')).not.toBeInTheDocument();
  });

  it('should reload page when Reload Page is clicked', () => {
    // Mock window.location.reload
    const mockReload = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true
    });

    render(
      <ClassScoringErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ClassScoringErrorBoundary>
    );

    fireEvent.click(screen.getByText('Reload Page'));

    expect(mockReload).toHaveBeenCalled();
  });

  it('should handle report error button click', async () => {
    render(
      <ClassScoringErrorBoundary context="scoring">
        <ThrowError shouldThrow={true} errorMessage="Test error for reporting" />
      </ClassScoringErrorBoundary>
    );

    const reportButton = screen.getByText('Report Error');
    fireEvent.click(reportButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('"error":"Test error for reporting"')
      );
      expect(global.alert).toHaveBeenCalledWith(
        'Error details copied to clipboard. Please share with support.'
      );
    });
  });

  it('should handle clipboard failure gracefully', async () => {
    (navigator.clipboard.writeText as jest.Mock).mockRejectedValueOnce(new Error('Clipboard failed'));

    render(
      <ClassScoringErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ClassScoringErrorBoundary>
    );

    const reportButton = screen.getByText('Report Error');
    fireEvent.click(reportButton);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        'Unable to copy error details. Please take a screenshot.'
      );
    });
  });

  it('should log retry attempts', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    render(
      <ClassScoringErrorBoundary context="scoring">
        <ThrowError shouldThrow={true} />
      </ClassScoringErrorBoundary>
    );

    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Class scoring error boundary retry attempted',
      expect.objectContaining({
        context: 'scoring',
        timestamp: expect.any(String)
      })
    );

    consoleSpy.mockRestore();
  });

  it('should log reload attempts', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const mockReload = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true
    });

    render(
      <ClassScoringErrorBoundary context="reports">
        <ThrowError shouldThrow={true} />
      </ClassScoringErrorBoundary>
    );

    const reloadButton = screen.getByText('Reload Page');
    fireEvent.click(reloadButton);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Class scoring error boundary reload initiated',
      expect.objectContaining({
        context: 'reports',
        timestamp: expect.any(String)
      })
    );

    consoleSpy.mockRestore();
  });

  it('should show error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ClassScoringErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Development error" />
      </ClassScoringErrorBoundary>
    );

    expect(screen.getByText('Error Details (Development)')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should not show error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <ClassScoringErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ClassScoringErrorBoundary>
    );

    expect(screen.queryByText('Error Details (Development)')).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });
});

describe('withClassScoringErrorBoundary', () => {
  it('should wrap component with error boundary', () => {
    const TestComponent: React.FC = () => <div>Test component</div>;
    const WrappedComponent = withClassScoringErrorBoundary(TestComponent, 'scoring');

    render(<WrappedComponent />);

    expect(screen.getByText('Test component')).toBeInTheDocument();
  });

  it('should handle errors in wrapped component', () => {
    const ErrorComponent: React.FC = () => {
      throw new Error('Wrapped component error');
    };
    const WrappedComponent = withClassScoringErrorBoundary(ErrorComponent, 'scoring');

    render(<WrappedComponent />);

    expect(screen.getByText('Type Class Scoring Error')).toBeInTheDocument();
    expect(screen.getByText(/There was an issue with the class scoring form/)).toBeInTheDocument();
  });

  it('should use custom fallback in wrapped component', () => {
    const ErrorComponent: React.FC = () => {
      throw new Error('Wrapped component error');
    };
    const customFallback = <div>Custom wrapped fallback</div>;
    const WrappedComponent = withClassScoringErrorBoundary(
      ErrorComponent, 
      'scoring', 
      customFallback
    );

    render(<WrappedComponent />);

    expect(screen.getByText('Custom wrapped fallback')).toBeInTheDocument();
    expect(screen.queryByText('Type Class Scoring Error')).not.toBeInTheDocument();
  });
});