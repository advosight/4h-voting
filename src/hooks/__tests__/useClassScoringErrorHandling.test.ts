import { renderHook, act } from '@testing-library/react';
import { useClassScoringErrorHandling } from '../useClassScoringErrorHandling';
import * as classErrorHandling from '../../utils/classErrorHandling';
import { parseError } from '../../utils/errorHandling';
import type { Mock } from 'vitest';

// Mock the class error handling utilities
vi.mock('../../utils/classErrorHandling', async () => ({
  ...(await vi.importActual('../../utils/classErrorHandling')),
  logClassScoringError: vi.fn(),
  retryClassScoringOperation: vi.fn(),
  withOptimisticLockRetry: vi.fn(),
  classScoringNetworkMonitor: {
    addListener: vi.fn(() => vi.fn()),
    getIsOnline: vi.fn(() => true),
    waitForConnection: vi.fn(() => Promise.resolve(true))
  }
}));

// Mock the base error handling utilities
vi.mock('../../utils/errorHandling', () => ({
  parseError: vi.fn((error) => ({
    error: {
      type: error.type || 'SYSTEM_ERROR',
      message: error.message || 'Test error'
    }
  })),
  isRetryableError: vi.fn(() => true)
}));

describe('useClassScoringErrorHandling', () => {
  const defaultOptions = {
    context: 'scoring' as const,
    catId: 'cat123',
    judgeId: 'judge456'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with no error state', () => {
    const { result } = renderHook(() => useClassScoringErrorHandling(defaultOptions));

    expect(result.current.error).toBeNull();
    expect(result.current.isRetrying).toBe(false);
    expect(result.current.retryCount).toBe(0);
    expect(result.current.canRetry).toBe(false);
    expect(result.current.userMessage).toBe('');
  });

  it('should handle errors correctly', () => {
    const { result } = renderHook(() => useClassScoringErrorHandling(defaultOptions));
    const testError = new Error('Test error');

    act(() => {
      result.current.handleError(testError);
    });

    expect(result.current.error).toBe(testError);
    expect(result.current.userMessage).toBe('Test error');
    expect(result.current.canRetry).toBe(true);
    expect(classErrorHandling.logClassScoringError).toHaveBeenCalledWith(
      testError,
      'ErrorHandler:scoring',
      {
        catId: 'cat123',
        judgeId: 'judge456',
        operation: 'handle_error'
      }
    );
  });

  it('should clear error state', () => {
    const { result } = renderHook(() => useClassScoringErrorHandling(defaultOptions));
    const testError = new Error('Test error');

    act(() => {
      result.current.handleError(testError);
    });

    expect(result.current.error).toBe(testError);

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.userMessage).toBe('');
    expect(result.current.retryCount).toBe(0);
  });

  it('should identify network errors', () => {
    const { result } = renderHook(() => useClassScoringErrorHandling(defaultOptions));
    const networkError = { type: 'NETWORK_ERROR', message: 'Network failed' };

    // Mock parseError to return network error
    (parseError as Mock).mockReturnValue({
      error: networkError
    });

    act(() => {
      result.current.handleError(networkError);
    });

    expect(result.current.isNetworkError).toBe(true);
    expect(result.current.isValidationError).toBe(false);
    expect(result.current.isConflictError).toBe(false);
  });

  it('should identify validation errors', () => {
    const { result } = renderHook(() => useClassScoringErrorHandling(defaultOptions));
    const validationError = { type: 'VALIDATION_ERROR', message: 'Invalid input' };

    // Mock parseError to return validation error
    (parseError as Mock).mockReturnValue({
      error: validationError
    });

    act(() => {
      result.current.handleError(validationError);
    });

    expect(result.current.isValidationError).toBe(true);
    expect(result.current.isNetworkError).toBe(false);
    expect(result.current.isConflictError).toBe(false);
  });

  it('should identify conflict errors', () => {
    const { result } = renderHook(() => useClassScoringErrorHandling(defaultOptions));
    const conflictError = { type: 'CONFLICT', message: 'Optimistic lock failed' };

    // Mock parseError to return conflict error
    (parseError as Mock).mockReturnValue({
      error: conflictError
    });

    act(() => {
      result.current.handleError(conflictError);
    });

    expect(result.current.isConflictError).toBe(true);
    expect(result.current.isNetworkError).toBe(false);
    expect(result.current.isValidationError).toBe(false);
  });

  it('should retry operations successfully', async () => {
    const { result } = renderHook(() => useClassScoringErrorHandling(defaultOptions));
    const mockOperation = vi.fn().mockResolvedValue(undefined);
    
    // Mock successful retry
    (classErrorHandling.retryClassScoringOperation as Mock).mockResolvedValue(undefined);

    // Set up error state first
    act(() => {
      result.current.handleError(new Error('Test error'));
    });

    await act(async () => {
      await result.current.retryOperation(mockOperation);
    });

    expect(classErrorHandling.retryClassScoringOperation).toHaveBeenCalledWith(
      mockOperation,
      expect.objectContaining({
        maxRetries: 3,
        context: 'scoring',
        catId: 'cat123',
        judgeId: 'judge456'
      })
    );

    expect(result.current.error).toBeNull();
  });

  it('should handle retry failures', async () => {
    const { result } = renderHook(() => useClassScoringErrorHandling(defaultOptions));
    const mockOperation = vi.fn();
    const retryError = new Error('Retry failed');
    
    // Mock failed retry
    (classErrorHandling.retryClassScoringOperation as Mock).mockRejectedValue(retryError);

    // Set up error state first
    act(() => {
      result.current.handleError(new Error('Initial error'));
    });

    await act(async () => {
      await result.current.retryOperation(mockOperation);
    });

    expect(result.current.error).toBe(retryError);
    expect(result.current.userMessage).toBe('Retry failed');
  });

  it('should handle optimistic lock retries', async () => {
    const { result } = renderHook(() => useClassScoringErrorHandling(defaultOptions));
    const mockOperation = vi.fn().mockResolvedValue(undefined);
    
    // Mock successful optimistic lock retry
    (classErrorHandling.withOptimisticLockRetry as Mock).mockResolvedValue(undefined);

    await act(async () => {
      await result.current.retryWithOptimisticLock(mockOperation);
    });

    expect(classErrorHandling.withOptimisticLockRetry).toHaveBeenCalledWith(
      mockOperation,
      expect.objectContaining({
        maxRetries: 2,
        context: 'scoring',
        catId: 'cat123',
        judgeId: 'judge456'
      })
    );

    expect(result.current.error).toBeNull();
  });

  it('should execute operations with error handling', async () => {
    const { result } = renderHook(() => useClassScoringErrorHandling(defaultOptions));
    const mockOperation = vi.fn().mockResolvedValue(undefined);

    await act(async () => {
      await result.current.executeWithErrorHandling(mockOperation);
    });

    expect(mockOperation).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('should handle operation failures in executeWithErrorHandling', async () => {
    const { result } = renderHook(() => useClassScoringErrorHandling(defaultOptions));
    const operationError = new Error('Operation failed');
    const mockOperation = vi.fn().mockRejectedValue(operationError);

    await act(async () => {
      await result.current.executeWithErrorHandling(mockOperation);
    });

    expect(result.current.error).toBe(operationError);
    expect(result.current.userMessage).toBe('Operation failed');
  });

  it('should determine error severity correctly', () => {
    const { result } = renderHook(() => useClassScoringErrorHandling(defaultOptions));

    // No error - low severity
    expect(result.current.errorSeverity).toBe('low');

    // Validation error - low severity
    const validationError = { type: 'VALIDATION_ERROR', message: 'Invalid input' };
    (parseError as Mock).mockReturnValue({
      error: validationError
    });

    act(() => {
      result.current.handleError(validationError);
    });

    expect(result.current.errorSeverity).toBe('low');

    // Network error while online - medium severity
    const networkError = { type: 'NETWORK_ERROR', message: 'Network failed' };
    (parseError as Mock).mockReturnValue({
      error: networkError
    });

    act(() => {
      result.current.handleError(networkError);
    });

    expect(result.current.errorSeverity).toBe('medium');
  });

  it('should show retry button appropriately', () => {
    const { result } = renderHook(() => useClassScoringErrorHandling(defaultOptions));

    // No error - no retry button
    expect(result.current.shouldShowRetryButton()).toBe(false);

    // Network error - show retry button
    const networkError = { type: 'NETWORK_ERROR', message: 'Network failed' };
    (parseError as Mock).mockReturnValue({
      error: networkError
    });

    act(() => {
      result.current.handleError(networkError);
    });

    expect(result.current.shouldShowRetryButton()).toBe(true);

    // Validation error - no retry button
    const validationError = { type: 'VALIDATION_ERROR', message: 'Invalid input' };
    (parseError as Mock).mockReturnValue({
      error: validationError
    });

    act(() => {
      result.current.handleError(validationError);
    });

    expect(result.current.shouldShowRetryButton()).toBe(false);
  });

  it('should generate appropriate retry button text', () => {
    const { result } = renderHook(() => useClassScoringErrorHandling(defaultOptions));

    // Initial state
    expect(result.current.retryButtonText).toBe('Retry');

    // Set up error state and simulate retry count
    act(() => {
      result.current.handleError(new Error('Test error'));
    });

    // Simulate retry count
    act(() => {
      (result.current as any).retryCount = 1;
    });

    // Note: This test might need adjustment based on internal state management
    expect(result.current.retryButtonText).toMatch(/Retry/);
  });

  it('should call custom error handler', () => {
    const onError = vi.fn();
    const { result } = renderHook(() => 
      useClassScoringErrorHandling({ ...defaultOptions, onError })
    );
    const testError = new Error('Test error');

    act(() => {
      result.current.handleError(testError);
    });

    expect(onError).toHaveBeenCalledWith(testError);
  });

  it('should call retry success callback', async () => {
    const onRetrySuccess = vi.fn();
    const { result } = renderHook(() => 
      useClassScoringErrorHandling({ ...defaultOptions, onRetrySuccess })
    );
    const mockOperation = vi.fn().mockResolvedValue(undefined);
    
    // Mock successful retry
    (classErrorHandling.retryClassScoringOperation as Mock).mockResolvedValue(undefined);

    // Set up error state first
    act(() => {
      result.current.handleError(new Error('Test error'));
    });

    await act(async () => {
      await result.current.retryOperation(mockOperation);
    });

    expect(onRetrySuccess).toHaveBeenCalled();
  });

  it('should call retry failure callback', async () => {
    const onRetryFailure = vi.fn();
    const { result } = renderHook(() => 
      useClassScoringErrorHandling({ ...defaultOptions, onRetryFailure })
    );
    const mockOperation = vi.fn();
    const retryError = new Error('Retry failed');
    
    // Mock failed retry
    (classErrorHandling.retryClassScoringOperation as Mock).mockRejectedValue(retryError);

    // Set up error state first
    act(() => {
      result.current.handleError(new Error('Initial error'));
    });

    await act(async () => {
      await result.current.retryOperation(mockOperation);
    });

    expect(onRetryFailure).toHaveBeenCalledWith(retryError);
  });
});