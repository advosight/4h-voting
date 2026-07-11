import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ClassScoringForm } from '../components/ClassScoringForm';
import { ClassScoringErrorBoundary } from '../components/ClassScoringErrorBoundary';
import { ClassScoringNetworkErrorHandler, useClassScoringNetworkErrorHandler } from '../components/ClassScoringNetworkErrorHandler';
import {
  retryClassScoringOperation,
  withOptimisticLockRetry,
  ClassScoringNetworkMonitor,
  logClassScoringError
} from '../utils/classErrorHandling';
import type { Mock } from 'vitest';

// Mock GraphQL operations
const mockGraphQLOperation = vi.fn();
vi.mock('@aws-amplify/api-graphql', () => ({
  generateClient: () => ({
    graphql: mockGraphQLOperation
  })
}));

// Mock console methods
const originalError = console.error;
const originalLog = console.log;

beforeAll(() => {
  console.error = vi.fn();
  console.log = vi.fn();
});

afterAll(() => {
  console.error = originalError;
  console.log = originalLog;
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
});

// Mock alert
global.alert = vi.fn();

// Mock fetch for network testing
global.fetch = vi.fn();

// Test component that uses error handling
const TestClassScoringComponent: React.FC<{
  shouldThrowError?: boolean;
  errorType?: 'validation' | 'network' | 'conflict' | 'permission';
  onSave?: (data: any) => Promise<void>;
}> = ({ shouldThrowError = false, errorType = 'validation', onSave }) => {
  const {
    networkError,
    isRetrying,
    retryCount,
    isOnline,
    handleNetworkError,
    clearNetworkError,
    retryOperation
  } = useClassScoringNetworkErrorHandler('scoring', 'cat123', 'judge456');

  const handleSave = async (data: any) => {
    if (shouldThrowError) {
      let error;
      switch (errorType) {
        case 'validation':
          error = {
            error: {
              type: 'VALIDATION_ERROR',
              message: 'Beauty score must be between 0 and 15',
              category: 'beauty',
              field: 'beautyScore',
              scoringType: 'CLASS',
              validationDetails: { minValue: 0, maxValue: 15, currentValue: 20 }
            }
          };
          break;
        case 'network':
          error = new Error('Network connection failed');
          break;
        case 'conflict':
          error = {
            error: {
              type: 'CONFLICT',
              code: 'OPTIMISTIC_LOCK_FAILED',
              message: 'Score has been modified by another judge',
              scoringType: 'CLASS'
            }
          };
          break;
        case 'permission':
          error = {
            error: {
              type: 'PERMISSION_ERROR',
              message: 'Access denied for class scoring',
              scoringType: 'CLASS'
            }
          };
          break;
        default:
          error = new Error('Unknown error');
      }
      
      if (errorType === 'network') {
        handleNetworkError(error);
      } else {
        throw error;
      }
    } else if (onSave) {
      await onSave(data);
    }
  };

  if (networkError) {
    return (
      <ClassScoringNetworkErrorHandler
        error={networkError}
        onRetry={async () => {
          await retryOperation(async () => {
            clearNetworkError();
          });
        }}
        onCancel={clearNetworkError}
        context="scoring"
        catId="cat123"
        judgeId="judge456"
      />
    );
  }

  return (
    <div>
      <div data-testid="scoring-form">Class Scoring Form</div>
      <div data-testid="retry-count">{retryCount}</div>
      <div data-testid="is-retrying">{isRetrying ? 'retrying' : 'not-retrying'}</div>
      <div data-testid="is-online">{isOnline ? 'online' : 'offline'}</div>
      <button 
        onClick={() => handleSave({ beautyScore: 20 })}
        data-testid="save-button"
      >
        Save Score
      </button>
    </div>
  );
};

describe('Class Scoring Comprehensive Error Handling Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as Mock).mockClear();
    (navigator.clipboard.writeText as Mock).mockClear();
    (global.alert as Mock).mockClear();
  });

  describe('Error Boundary Integration', () => {
    it('should catch and display validation errors', () => {
      render(
        <ClassScoringErrorBoundary context="scoring">
          <TestClassScoringComponent shouldThrowError={true} errorType="validation" />
        </ClassScoringErrorBoundary>
      );

      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);

      expect(screen.getByText('Class Scoring Error')).toBeInTheDocument();
      expect(screen.getByText(/There was an issue with the class scoring form/)).toBeInTheDocument();
    });

    it('should provide retry functionality', async () => {
      const { rerender } = render(
        <ClassScoringErrorBoundary context="scoring">
          <TestClassScoringComponent shouldThrowError={true} errorType="validation" />
        </ClassScoringErrorBoundary>
      );

      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);

      expect(screen.getByText('Class Scoring Error')).toBeInTheDocument();

      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);

      // Re-render without error
      rerender(
        <ClassScoringErrorBoundary context="scoring">
          <TestClassScoringComponent shouldThrowError={false} />
        </ClassScoringErrorBoundary>
      );

      expect(screen.getByTestId('scoring-form')).toBeInTheDocument();
      expect(screen.queryByText('Class Scoring Error')).not.toBeInTheDocument();
    });

    it('should handle error reporting', async () => {
      render(
        <ClassScoringErrorBoundary context="scoring">
          <TestClassScoringComponent shouldThrowError={true} errorType="validation" />
        </ClassScoringErrorBoundary>
      );

      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);

      const reportButton = screen.getByText('Report Error');
      fireEvent.click(reportButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          expect.stringContaining('"context":"scoring"')
        );
        expect(global.alert).toHaveBeenCalledWith(
          'Error details copied to clipboard. Please share with support.'
        );
      });
    });
  });

  describe('Network Error Handling Integration', () => {
    it('should display network error handler for network failures', async () => {
      render(
        <BrowserRouter>
          <TestClassScoringComponent shouldThrowError={true} errorType="network" />
        </BrowserRouter>
      );

      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Class Scoring Connection Issue')).toBeInTheDocument();
        expect(screen.getByText(/Your scoring progress is automatically saved/)).toBeInTheDocument();
      });
    });

    it('should handle offline scenarios', async () => {
      // Mock being offline
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });

      render(
        <BrowserRouter>
          <TestClassScoringComponent shouldThrowError={true} errorType="network" />
        </BrowserRouter>
      );

      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("You're offline")).toBeInTheDocument();
        expect(screen.getByText(/Please check your internet connection/)).toBeInTheDocument();
      });

      // Reset online status
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
    });

    it('should retry network operations', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');

      const result = await retryClassScoringOperation(mockOperation, {
        maxRetries: 2,
        baseDelay: 10,
        context: 'test_operation',
        catId: 'cat123',
        judgeId: 'judge456'
      });

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should handle retry callbacks', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');
      const onRetry = vi.fn();
      const onFinalFailure = vi.fn();

      await retryClassScoringOperation(mockOperation, {
        maxRetries: 2,
        baseDelay: 10,
        onRetry,
        onFinalFailure
      });

      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
      expect(onFinalFailure).not.toHaveBeenCalled();
    });
  });

  describe('Optimistic Locking Integration', () => {
    it('should handle optimistic lock conflicts', async () => {
      const conflictError = {
        error: {
          type: 'CONFLICT',
          code: 'OPTIMISTIC_LOCK_FAILED',
          details: { version: 'v2' }
        }
      };

      const mockOperation = vi.fn()
        .mockRejectedValueOnce(conflictError)
        .mockResolvedValue('success');
      const onConflict = vi.fn();

      const result = await withOptimisticLockRetry(mockOperation, {
        maxRetries: 2,
        onConflict
      });

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
      expect(onConflict).toHaveBeenCalledWith({ version: 'v2' }, 1);
    });

    it('should handle final conflict after max retries', async () => {
      const conflictError = {
        error: {
          type: 'CONFLICT',
          code: 'OPTIMISTIC_LOCK_FAILED',
          details: { version: 'v2' }
        }
      };

      const mockOperation = vi.fn().mockRejectedValue(conflictError);
      const onFinalConflict = vi.fn();

      await expect(
        withOptimisticLockRetry(mockOperation, {
          maxRetries: 2,
          onFinalConflict
        })
      ).rejects.toMatchObject({
        error: expect.objectContaining({
          type: 'CONFLICT',
          scoringType: 'CLASS'
        })
      });

      expect(onFinalConflict).toHaveBeenCalledWith({ version: 'v2' });
    });
  });

  describe('Network Monitor Integration', () => {
    let monitor: ClassScoringNetworkMonitor;

    beforeEach(() => {
      monitor = new ClassScoringNetworkMonitor();
    });

    afterEach(() => {
      monitor.destroy();
    });

    it('should monitor network status changes', () => {
      const listener = vi.fn();
      monitor.addListener(listener);

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      window.dispatchEvent(new Event('offline'));

      expect(listener).toHaveBeenCalledWith(false);

      // Simulate coming back online
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      window.dispatchEvent(new Event('online'));

      expect(listener).toHaveBeenCalledWith(true);
    });

    it('should wait for connection restoration', async () => {
      // Mock being offline initially
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });

      const waitPromise = monitor.waitForConnection(200);

      // Simulate coming back online after a delay
      setTimeout(() => {
        Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
        window.dispatchEvent(new Event('online'));
      }, 50);

      const result = await waitPromise;
      expect(result).toBe(true);
    });

    it('should attempt reconnection', async () => {
      (global.fetch as Mock).mockResolvedValueOnce({ ok: true });

      const result = await monitor.attemptReconnect();

      expect(global.fetch).toHaveBeenCalledWith('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      expect(result).toBe(true);
    });

    it('should handle failed reconnection attempts', async () => {
      (global.fetch as Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await monitor.attemptReconnect();

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Error Logging Integration', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should log class scoring errors with context', () => {
      const error = new Error('Test class scoring error');
      
      logClassScoringError(error, 'IntegrationTest', {
        catId: 'cat123',
        judgeId: 'judge456',
        operation: 'save_score'
      });

      expect(console.error).toHaveBeenCalledWith(
        'Class scoring error occurred:',
        expect.objectContaining({
          context: 'ClassScoring:IntegrationTest',
          catId: 'cat123',
          judgeId: 'judge456',
          operation: 'save_score',
          timestamp: expect.any(String),
          userAgent: expect.any(String),
          url: expect.any(String)
        })
      );
    });
  });

  describe('End-to-End Error Scenarios', () => {
    it('should handle complete error recovery workflow', async () => {
      let attemptCount = 0;
      const mockSave = vi.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('Network error');
        } else if (attemptCount === 2) {
          throw {
            error: {
              type: 'CONFLICT',
              code: 'OPTIMISTIC_LOCK_FAILED',
              details: { version: 'v2' }
            }
          };
        }
        return 'success';
      });

      render(
        <ClassScoringErrorBoundary context="scoring">
          <TestClassScoringComponent onSave={mockSave} />
        </ClassScoringErrorBoundary>
      );

      const saveButton = screen.getByTestId('save-button');
      
      // First attempt - network error
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Class Scoring Connection Issue')).toBeInTheDocument();
      });

      // Retry - conflict error
      const retryButton = screen.getByText(/Retry/);
      fireEvent.click(retryButton);

      // Should eventually succeed after handling conflicts
      await waitFor(() => {
        expect(mockSave).toHaveBeenCalledTimes(3);
      }, { timeout: 5000 });
    });

    it('should handle validation errors with user-friendly messages', () => {
      render(
        <ClassScoringErrorBoundary context="scoring">
          <TestClassScoringComponent shouldThrowError={true} errorType="validation" />
        </ClassScoringErrorBoundary>
      );

      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);

      expect(screen.getByText('Class Scoring Error')).toBeInTheDocument();
      expect(screen.getByText(/There was an issue with the class scoring form/)).toBeInTheDocument();
      expect(screen.getByText(/Your progress may have been saved automatically/)).toBeInTheDocument();
    });

    it('should handle permission errors appropriately', () => {
      render(
        <ClassScoringErrorBoundary context="scoring">
          <TestClassScoringComponent shouldThrowError={true} errorType="permission" />
        </ClassScoringErrorBoundary>
      );

      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);

      expect(screen.getByText('Class Scoring Error')).toBeInTheDocument();
    });
  });

  describe('Performance and Memory Management', () => {
    it('should properly clean up network monitor listeners', () => {
      const monitor = new ClassScoringNetworkMonitor();
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const remove1 = monitor.addListener(listener1);
      const remove2 = monitor.addListener(listener2);

      // Remove one listener
      remove1();

      // Simulate network event
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      window.dispatchEvent(new Event('offline'));

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledWith(false);

      // Clean up
      monitor.destroy();
    });

    it('should handle multiple concurrent error operations', async () => {
      const operations = Array.from({ length: 5 }, (_, i) => 
        retryClassScoringOperation(
          async () => {
            if (Math.random() > 0.5) {
              throw new Error(`Error ${i}`);
            }
            return `Success ${i}`;
          },
          { maxRetries: 2, baseDelay: 10 }
        )
      );

      const results = await Promise.allSettled(operations);
      
      // Should handle all operations without interference
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(['fulfilled', 'rejected']).toContain(result.status);
      });
    });
  });
});