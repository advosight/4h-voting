import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NetworkErrorHandler } from '../NetworkErrorHandler';

// Mock the error handling utilities
vi.mock('../../utils/errorHandling', () => ({
  parseError: vi.fn((error) => ({
    error: {
      type: error.type || 'NETWORK_ERROR',
      message: error.message || 'Network error occurred',
      code: error.code || 'NETWORK_ERROR'
    }
  })),
  getUserFriendlyMessage: vi.fn((parsedError) => parsedError.error.message),
  isRetryableError: vi.fn((parsedError) => 
    ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'SYSTEM_ERROR'].includes(parsedError.error.type)
  ),
  retryWithBackoff: vi.fn()
}));

const mockOnRetry = vi.fn();
const mockOnCancel = vi.fn();

describe('NetworkErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
  });

  it('renders network error message', () => {
    const error = { type: 'NETWORK_ERROR', message: 'Connection failed' };

    render(
      <NetworkErrorHandler
        error={error}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Connection failed')).toBeInTheDocument();
  });

  it('shows retry button for retryable errors', () => {
    const error = { type: 'NETWORK_ERROR', message: 'Connection failed' };

    render(
      <NetworkErrorHandler
        error={error}
        onRetry={mockOnRetry}
        showRetryButton={true}
      />
    );

    expect(screen.getByText(/Retry \(0\/3\)/)).toBeInTheDocument();
  });

  it('hides retry button when showRetryButton is false', () => {
    const error = { type: 'NETWORK_ERROR', message: 'Connection failed' };

    render(
      <NetworkErrorHandler
        error={error}
        onRetry={mockOnRetry}
        showRetryButton={false}
      />
    );

    expect(screen.queryByText(/Retry/)).not.toBeInTheDocument();
  });

  it('shows cancel button when onCancel is provided', () => {
    const error = { type: 'NETWORK_ERROR', message: 'Connection failed' };

    render(
      <NetworkErrorHandler
        error={error}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', async () => {
    const error = { type: 'NETWORK_ERROR', message: 'Connection failed' };

    render(
      <NetworkErrorHandler
        error={error}
        onRetry={mockOnRetry}
      />
    );

    fireEvent.click(screen.getByText(/Retry \(0\/3\)/));

    await waitFor(() => {
      expect(mockOnRetry).toHaveBeenCalled();
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    const error = { type: 'NETWORK_ERROR', message: 'Connection failed' };

    render(
      <NetworkErrorHandler
        error={error}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('shows offline indicator when offline', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    });

    const error = { type: 'NETWORK_ERROR', message: 'Connection failed' };

    render(
      <NetworkErrorHandler
        error={error}
        onRetry={mockOnRetry}
      />
    );

    expect(screen.getByText("You're offline")).toBeInTheDocument();
    expect(screen.getByText('Please check your internet connection and try again when you\'re back online.')).toBeInTheDocument();
  });

  it('updates retry count after retry attempts', async () => {
    const error = { type: 'NETWORK_ERROR', message: 'Connection failed' };

    render(
      <NetworkErrorHandler
        error={error}
        onRetry={mockOnRetry}
      />
    );

    // First retry
    fireEvent.click(screen.getByText(/Retry \(0\/3\)/));
    
    await waitFor(() => {
      expect(screen.getByText(/Retry \(1\/3\)/)).toBeInTheDocument();
    });
  });

  it('shows reload button when max retries reached', async () => {
    const error = { type: 'NETWORK_ERROR', message: 'Connection failed' };

    render(
      <NetworkErrorHandler
        error={error}
        onRetry={mockOnRetry}
        maxRetries={1}
      />
    );

    // Exhaust retries
    fireEvent.click(screen.getByText(/Retry \(0\/1\)/));
    
    await waitFor(() => {
      fireEvent.click(screen.getByText(/Retry \(1\/1\)/));
    });

    await waitFor(() => {
      expect(screen.getByText('Reload Page')).toBeInTheDocument();
    });
  });

  it('shows loading state during retry', async () => {
    const error = { type: 'NETWORK_ERROR', message: 'Connection failed' };
    const slowRetry = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <NetworkErrorHandler
        error={error}
        onRetry={slowRetry}
      />
    );

    fireEvent.click(screen.getByText(/Retry \(0\/3\)/));

    expect(screen.getByText('Retrying...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByText('Retrying...')).not.toBeInTheDocument();
    });
  });

  it('shows error code when available', () => {
    const error = { 
      type: 'NETWORK_ERROR', 
      message: 'Connection failed',
      code: 'NET_001'
    };

    render(
      <NetworkErrorHandler
        error={error}
        onRetry={mockOnRetry}
      />
    );

    expect(screen.getByText('Error Code: NET_001')).toBeInTheDocument();
  });

  it('handles online/offline events', () => {
    const error = { type: 'NETWORK_ERROR', message: 'Connection failed' };

    render(
      <NetworkErrorHandler
        error={error}
        onRetry={mockOnRetry}
      />
    );

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