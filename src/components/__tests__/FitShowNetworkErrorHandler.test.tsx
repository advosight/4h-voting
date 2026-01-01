import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import FitShowNetworkErrorHandler, { NetworkError } from '../FitShowNetworkErrorHandler';

describe('FitShowNetworkErrorHandler', () => {
  const mockNetworkError: NetworkError = {
    message: 'Network connection failed',
    code: 'NETWORK_ERROR',
    operation: 'createFitShowScore',
    timestamp: new Date('2024-01-01T10:00:00Z'),
    retryCount: 1
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render nothing when no error', () => {
    const { container } = render(<FitShowNetworkErrorHandler error={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should display error message and title', () => {
    render(<FitShowNetworkErrorHandler error={mockNetworkError} />);
    
    expect(screen.getByText('Network Error during createFitShowScore')).toBeInTheDocument();
    expect(screen.getByText('Network connection failed')).toBeInTheDocument();
  });

  it('should display retry count information', () => {
    render(<FitShowNetworkErrorHandler error={mockNetworkError} maxRetries={3} />);
    
    expect(screen.getByText('Retry attempt: 1 of 3')).toBeInTheDocument();
  });

  it('should show retry button when retries are available', () => {
    const onRetry = jest.fn();
    render(
      <FitShowNetworkErrorHandler 
        error={mockNetworkError} 
        onRetry={onRetry}
        maxRetries={3} 
      />
    );
    
    const retryButton = screen.getByText('Retry Now');
    expect(retryButton).toBeInTheDocument();
    expect(retryButton).not.toBeDisabled();
  });

  it('should disable retry button when max retries reached', () => {
    const errorWithMaxRetries = { ...mockNetworkError, retryCount: 3 };
    render(
      <FitShowNetworkErrorHandler 
        error={errorWithMaxRetries} 
        maxRetries={3} 
      />
    );
    
    expect(screen.getByText('Maximum retry attempts reached')).toBeInTheDocument();
    expect(screen.queryByText('Retry Now')).not.toBeInTheDocument();
  });

  it('should call onRetry when retry button is clicked', async () => {
    const onRetry = jest.fn().mockResolvedValue(undefined);
    render(
      <FitShowNetworkErrorHandler 
        error={mockNetworkError} 
        onRetry={onRetry}
        maxRetries={3} 
      />
    );
    
    const retryButton = screen.getByText('Retry Now');
    fireEvent.click(retryButton);
    
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should show loading state during retry', async () => {
    const onRetry = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
    render(
      <FitShowNetworkErrorHandler 
        error={mockNetworkError} 
        onRetry={onRetry}
        maxRetries={3} 
      />
    );
    
    const retryButton = screen.getByText('Retry Now');
    fireEvent.click(retryButton);
    
    expect(screen.getByText('Retrying...')).toBeInTheDocument();
    expect(screen.getByText('Retrying...')).toBeDisabled();
  });

  it('should call onDismiss when dismiss button is clicked', () => {
    const onDismiss = jest.fn();
    render(
      <FitShowNetworkErrorHandler 
        error={mockNetworkError} 
        onDismiss={onDismiss}
      />
    );
    
    const dismissButton = screen.getByText('Dismiss');
    fireEvent.click(dismissButton);
    
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should show auto-retry countdown when autoRetry is enabled', () => {
    render(
      <FitShowNetworkErrorHandler 
        error={mockNetworkError} 
        autoRetry={true}
        retryDelay={3000}
        maxRetries={3}
      />
    );
    
    expect(screen.getByText('Auto-retry in 3 seconds...')).toBeInTheDocument();
  });

  it('should countdown and auto-retry', async () => {
    const onRetry = jest.fn().mockResolvedValue(undefined);
    render(
      <FitShowNetworkErrorHandler 
        error={mockNetworkError} 
        onRetry={onRetry}
        autoRetry={true}
        retryDelay={2000}
        maxRetries={3}
      />
    );
    
    expect(screen.getByText('Auto-retry in 2 seconds...')).toBeInTheDocument();
    
    // Advance timer by 1 second
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    expect(screen.getByText('Auto-retry in 1 second...')).toBeInTheDocument();
    
    // Advance timer by another second to trigger retry
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    await waitFor(() => {
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  it('should cancel auto-retry when manual retry is clicked', () => {
    const onRetry = jest.fn().mockResolvedValue(undefined);
    render(
      <FitShowNetworkErrorHandler 
        error={mockNetworkError} 
        onRetry={onRetry}
        autoRetry={true}
        retryDelay={3000}
        maxRetries={3}
      />
    );
    
    expect(screen.getByText('Auto-retry in 3 seconds...')).toBeInTheDocument();
    
    const retryButton = screen.getByText('Retry Now');
    fireEvent.click(retryButton);
    
    expect(screen.queryByText(/Auto-retry in/)).not.toBeInTheDocument();
  });

  it('should display appropriate error icon and title for different error codes', () => {
    const timeoutError = { ...mockNetworkError, code: 'TIMEOUT_ERROR' };
    const { rerender } = render(<FitShowNetworkErrorHandler error={timeoutError} />);
    
    expect(screen.getByText('Request Timeout during createFitShowScore')).toBeInTheDocument();
    
    const serverError = { ...mockNetworkError, code: 'SERVER_ERROR' };
    rerender(<FitShowNetworkErrorHandler error={serverError} />);
    
    expect(screen.getByText('Server Error during createFitShowScore')).toBeInTheDocument();
  });

  it('should display appropriate suggestions for different error codes', () => {
    render(<FitShowNetworkErrorHandler error={mockNetworkError} />);
    
    expect(screen.getByText('Troubleshooting suggestions:')).toBeInTheDocument();
    expect(screen.getByText('• Check your internet connection')).toBeInTheDocument();
    expect(screen.getByText('• Try refreshing the page')).toBeInTheDocument();
    expect(screen.getByText('• Contact support if the problem persists')).toBeInTheDocument();
  });

  it('should show technical details when expanded', () => {
    render(<FitShowNetworkErrorHandler error={mockNetworkError} />);
    
    const detailsToggle = screen.getByText('Technical Details');
    fireEvent.click(detailsToggle);
    
    expect(screen.getByText('Error Code: NETWORK_ERROR')).toBeInTheDocument();
    expect(screen.getByText('Operation: createFitShowScore')).toBeInTheDocument();
    expect(screen.getByText('Retry Count: 1')).toBeInTheDocument();
    expect(screen.getByText('Message: Network connection failed')).toBeInTheDocument();
  });

  it('should provide refresh page button', () => {
    // Mock window.location.reload
    const mockReload = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true
    });

    render(<FitShowNetworkErrorHandler error={mockNetworkError} />);
    
    const refreshButton = screen.getByText('Refresh Page');
    fireEvent.click(refreshButton);
    
    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it('should handle retry failure and increment retry count', async () => {
    const onRetry = jest.fn().mockRejectedValue(new Error('Retry failed'));
    render(
      <FitShowNetworkErrorHandler 
        error={mockNetworkError} 
        onRetry={onRetry}
        maxRetries={3}
        autoRetry={true}
        retryDelay={1000}
      />
    );
    
    const retryButton = screen.getByText('Retry Now');
    fireEvent.click(retryButton);
    
    await waitFor(() => {
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
    
    // Should start auto-retry countdown again after failure
    await waitFor(() => {
      expect(screen.getByText('Auto-retry in 1 second...')).toBeInTheDocument();
    });
  });

  it('should apply custom className', () => {
    const { container } = render(
      <FitShowNetworkErrorHandler error={mockNetworkError} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should show close button when onDismiss is provided', () => {
    const onDismiss = jest.fn();
    render(
      <FitShowNetworkErrorHandler 
        error={mockNetworkError} 
        onDismiss={onDismiss}
      />
    );
    
    const closeButton = screen.getByLabelText('Close error message');
    expect(closeButton).toBeInTheDocument();
    
    fireEvent.click(closeButton);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should not show auto-retry when max retries reached', () => {
    const errorWithMaxRetries = { ...mockNetworkError, retryCount: 3 };
    render(
      <FitShowNetworkErrorHandler 
        error={errorWithMaxRetries} 
        autoRetry={true}
        maxRetries={3}
      />
    );
    
    expect(screen.queryByText(/Auto-retry in/)).not.toBeInTheDocument();
    expect(screen.getByText('Maximum retry attempts reached')).toBeInTheDocument();
  });
});