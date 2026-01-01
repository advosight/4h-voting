import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import {
  ClassScoringNetworkErrorHandler,
  useClassScoringNetworkErrorHandler
} from '../ClassScoringNetworkErrorHandler';

// Mock the class error handling utilities
jest.mock('../../utils/classErrorHandling', () => ({
  retryWithBackoff: jest.fn(),
  parseError: jest.fn((error) => ({
    error: {
      type: 'NETWORK_ERROR',
      message: error?.message || 'Network error occurred'
    }
  })),
  isRetryableError: jest.fn(() => true),
  logClassScoringError: jest.fn(),
  getClassScoringUserFriendlyMessage: jest.fn(() => 'User friendly network error message'),
  isClassScoringError: jest.fn(() => true)
}));

const mockError = new Error('Network connection failed');

describe('ClassScoringNetworkErrorHandler', () => {
  const mockOnRetry = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
  });

  it('should render network error message', () => {
    render(
      <ClassScoringNetworkErrorHandler
        error={mockError}
        onRetry={mockOnRetry}
        context="scoring"
      />
    );

    expect(screen.getByText('Type Class Scoring Connection Issue')).toBeInTheDocument();
    expect(screen.getByText('User friendly network error message')).toBeInTheDocument();
  });

  it('should show contextual help for scoring context', () => {
    render(
      <ClassScoringNetworkErrorHandler
        error={mockError}
        onRetry={mockOnRetry}
        context="scoring"
      />
    );

    expect(screen.getByText(/Your scoring progress is automatically saved/)).toBeInTheDocument();
  });

  it('should show contextual help for reports context', () => {
    render(
      <ClassScoringNetworkErrorHandler
        error={mockError}
        onRetry={mockOnRetry}
        context="reports"
      />
    );

    expect(screen.getByText(/Report data may be temporarily unavailable/)).toBeInTheDocument();
  });

  it('should show contextual help for management context', () => {
    render(
      <ClassScoringNetworkErrorHandler
        error={mockError}
        onRetry={mockOnRetry}
        context="management"
      />
    );

    expect(screen.getByText(/Score management operations are temporarily unavailable/)).toBeInTheDocument();
  });

  it('should show offline indicator when offline', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    });

    render(
      <ClassScoringNetworkErrorHandler
        error={mockError}
        onRetry={mockOnRetry}
      />
    );

    expect(screen.getByText("You're offline")).toBeInTheDocument();
    expect(screen.getByText(/Please check your internet connection/)).toBeInTheDocument();
  });

  it('should show retry button when online and retryable', () => {
    render(
      <ClassScoringNetworkErrorHandler
        error={mockError}
        onRetry={mockOnRetry}
        maxRetries={3}
      />
    );

    expect(screen.getByText('Retry (0/3)')).toBeInTheDocument();
  });

  it('should hide retry button when offline', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    });

    render(
      <ClassScoringNetworkErrorHandler
        error={mockError}
        onRetry={mockOnRetry}
      />
    );

    expect(screen.queryByText(/Retry/)).not.toBeInTheDocument();
  });

  it('should show cancel button when onCancel provided', () => {
    render(
      <ClassScoringNetworkErrorHandler
        error={mockError}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should call onRetry when retry button clicked', async () => {
    const { retryWithBackoff } = require('../../utils/classErrorHandling');
    retryWithBackoff.mockResolvedValue(undefined);

    render(
      <ClassScoringNetworkErrorHandler
        error={mockError}
        onRetry={mockOnRetry}
      />
    );

    fireEvent.click(screen.getByText('Retry (0/3)'));

    await waitFor(() => {
      expect(retryWithBackoff).toHaveBeenCalledWith(
        mockOnRetry,
        expect.objectContaining({
          maxRetries: 1,
          baseDelay: 1500,
          maxDelay: 5000,
          backoffFactor: 1.5
        })
      );
    });
  });

  it('should call onCancel when cancel button clicked', () => {
    render(
      <ClassScoringNetworkErrorHandler
        error={mockError}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should show reload button when max retries reached', () => {
    render(
      <ClassScoringNetworkErrorHandler
        error={mockError}
        onRetry={mockOnRetry}
        maxRetries={0} // Already at max retries
      />
    );

    expect(screen.getByText('Reload Page')).toBeInTheDocument();
  });

  it('should reload page when reload button clicked', () => {
    const mockReload = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true
    });

    render(
      <ClassScoringNetworkErrorHandler
        error={mockError}
        onRetry={mockOnRetry}
        maxRetries={0}
      />
    );

    fireEvent.click(screen.getByText('Reload Page'));

    expect(mockReload).toHaveBeenCalled();
  });

  it('should show scoring specific help for scoring context', () => {
    render(
      <ClassScoringNetworkErrorHandler
        error={mockError}
        onRetry={mockOnRetry}
        context="scoring"
      />
    );

    expect(screen.getByText('Scoring Tips:')).toBeInTheDocument();
    expect(screen.getByText(/Your progress is saved automatically every 30 seconds/)).toBeInTheDocument();
    expect(screen.getByText(/You can safely close and reopen the scoring form/)).toBeInTheDocument();
    expect(screen.getByText(/Use the "Save Draft" button to manually save your work/)).toBeInTheDocument();
  });

  it('should disable retry button when retrying', async () => {
    const { retryWithBackoff } = require('../../utils/classErrorHandling');
    retryWithBackoff.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <ClassScoringNetworkErrorHandler
        error={mockError}
        onRetry={mockOnRetry}
      />
    );

    const retryButton = screen.getByText('Retry (0/3)');
    fireEvent.click(retryButton);

    expect(screen.getByText('Retrying...')).toBeInTheDocument();
    expect(retryButton).toBeDisabled();
  });

  it('should log error with class scoring context', () => {
    const { logClassScoringError } = require('../../utils/classErrorHandling');

    render(
      <ClassScoringNetworkErrorHandler
        error={mockError}
        onRetry={mockOnRetry}
        context="scoring"
        catId="cat123"
        judgeId="judge456"
      />
    );

    expect(logClassScoringError).toHaveBeenCalledWith(
      mockError,
      'NetworkError:scoring',
      {
        catId: 'cat123',
        judgeId: 'judge456',
        operation: 'network_operation'
      }
    );
  });

  it('should update online status when network status changes', () => {
    render(
      <ClassScoringNetworkErrorHandler
        error={mockError}
        onRetry={mockOnRetry}
      />
    );

    // Initially online
    expect(screen.queryByText("You're offline")).not.toBeInTheDocument();

    // Simulate going offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    });

    fireEvent(window, new Event('offline'));

    expect(screen.getByText("You're offline")).toBeInTheDocument();

    // Simulate going back online
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });

    fireEvent(window, new Event('online'));

    expect(screen.queryByText("You're offline")).not.toBeInTheDocument();
  });
});

describe('useClassScoringNetworkErrorHandler', () => {
  it('should initialize with no network error', () => {
    const { result } = renderHook(() =>
      useClassScoringNetworkErrorHandler('scoring', 'cat123', 'judge456')
    );

    expect(result.current.networkError).toBeNull();
    expect(result.current.isRetrying).toBe(false);
  });

  it('should handle network error', () => {
    const { logClassScoringError } = require('../../utils/classErrorHandling');
    const { result } = renderHook(() =>
      useClassScoringNetworkErrorHandler('scoring', 'cat123', 'judge456')
    );

    act(() => {
      result.current.handleNetworkError(mockError);
    });

    expect(result.current.networkError).toBe(mockError);
    expect(logClassScoringError).toHaveBeenCalledWith(
      mockError,
      'NetworkErrorHandler:scoring',
      {
        catId: 'cat123',
        judgeId: 'judge456',
        operation: 'handle_network_error'
      }
    );
  });

  it('should clear network error', () => {
    const { result } = renderHook(() =>
      useClassScoringNetworkErrorHandler()
    );

    act(() => {
      result.current.handleNetworkError(mockError);
    });

    expect(result.current.networkError).toBe(mockError);

    act(() => {
      result.current.clearNetworkError();
    });

    expect(result.current.networkError).toBeNull();
  });

  it('should retry operation successfully', async () => {
    const mockOperation = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useClassScoringNetworkErrorHandler()
    );

    act(() => {
      result.current.handleNetworkError(mockError);
    });

    expect(result.current.networkError).toBe(mockError);

    await act(async () => {
      await result.current.retryOperation(mockOperation);
    });

    expect(mockOperation).toHaveBeenCalled();
    expect(result.current.networkError).toBeNull();
    expect(result.current.isRetrying).toBe(false);
  });

  it('should handle retry operation failure', async () => {
    const retryError = new Error('Retry failed');
    const mockOperation = jest.fn().mockRejectedValue(retryError);
    const { result } = renderHook(() =>
      useClassScoringNetworkErrorHandler()
    );

    await act(async () => {
      await result.current.retryOperation(mockOperation);
    });

    expect(result.current.networkError).toBe(retryError);
    expect(result.current.isRetrying).toBe(false);
  });

  it('should set isRetrying during operation', async () => {
    let resolveOperation: () => void;
    const mockOperation = jest.fn(() => new Promise<void>(resolve => {
      resolveOperation = resolve;
    }));

    const { result } = renderHook(() =>
      useClassScoringNetworkErrorHandler()
    );

    const retryPromise = act(async () => {
      await result.current.retryOperation(mockOperation);
    });

    expect(result.current.isRetrying).toBe(true);

    resolveOperation!();
    await retryPromise;

    expect(result.current.isRetrying).toBe(false);
  });
});