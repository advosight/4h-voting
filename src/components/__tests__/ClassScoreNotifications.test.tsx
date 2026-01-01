import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { generateClient } from 'aws-amplify/api';
import ClassScoreNotifications from '../ClassScoreNotifications';

// Mock AWS Amplify
jest.mock('aws-amplify/api');
const mockClient = {
  graphql: jest.fn()
};
(generateClient as jest.Mock).mockReturnValue(mockClient);

// Mock data
const mockCat = {
  id: 'cat-1',
  name: 'Fluffy',
  owner: 'Alice',
  cageNumber: 1
};

const mockClassScoreUpdate = {
  id: 'class-score-1',
  catId: 'cat-1',
  judgeId: 'judge-1',
  judgeName: 'Judge Smith',
  totalScore: 45,
  ribbonEligibility: 'Blue',
  timestamp: '2024-01-15T10:00:00Z',
  isFinalized: false
};

describe('ClassScoreNotifications', () => {
  let mockSubscription: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Mock subscription
    mockSubscription = {
      unsubscribe: jest.fn()
    };

    // Mock GraphQL responses
    mockClient.graphql.mockImplementation(({ query, variables }) => {
      if (query.includes('GetCat')) {
        return Promise.resolve({
          data: {
            getCat: mockCat
          }
        });
      }
      
      if (query.includes('OnClassScoreUpdate')) {
        return {
          subscribe: jest.fn().mockReturnValue(mockSubscription)
        };
      }
      
      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sets up real-time subscription for class score updates', async () => {
    const mockSubscribe = jest.fn().mockReturnValue(mockSubscription);
    mockClient.graphql.mockImplementation(({ query }) => {
      if (query.includes('OnClassScoreUpdate')) {
        return { subscribe: mockSubscribe };
      }
      return Promise.resolve({ data: {} });
    });

    render(<ClassScoreNotifications />);

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalledWith({
        next: expect.any(Function),
        error: expect.any(Function)
      });
    });
  });

  it('displays new class score notification', async () => {
    let subscriptionCallback: any;
    const mockSubscribe = jest.fn().mockImplementation(({ next }) => {
      subscriptionCallback = next;
      return mockSubscription;
    });

    mockClient.graphql.mockImplementation(({ query }) => {
      if (query.includes('OnClassScoreUpdate')) {
        return { subscribe: mockSubscribe };
      }
      if (query.includes('GetCat')) {
        return Promise.resolve({
          data: { getCat: mockCat }
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(<ClassScoreNotifications />);

    // Simulate new class score update
    await act(async () => {
      subscriptionCallback({ data: { onClassScoreUpdate: mockClassScoreUpdate } });
    });

    await waitFor(() => {
      expect(screen.getByText('🔔 Class Score Updates')).toBeInTheDocument();
      expect(screen.getByText(/Fluffy received a new class score of 45\/50 from Judge Smith/)).toBeInTheDocument();
    });

    // Check for ribbon eligibility display
    expect(screen.getByText('Blue Ribbon')).toBeInTheDocument();
    expect(screen.getByText('🥇')).toBeInTheDocument();
  });

  it('displays finalized class score notification', async () => {
    let subscriptionCallback: any;
    const mockSubscribe = jest.fn().mockImplementation(({ next }) => {
      subscriptionCallback = next;
      return mockSubscription;
    });

    mockClient.graphql.mockImplementation(({ query }) => {
      if (query.includes('OnClassScoreUpdate')) {
        return { subscribe: mockSubscribe };
      }
      if (query.includes('GetCat')) {
        return Promise.resolve({
          data: { getCat: mockCat }
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(<ClassScoreNotifications />);

    const finalizedScore = {
      ...mockClassScoreUpdate,
      isFinalized: true
    };

    // Simulate finalized class score update
    await act(async () => {
      subscriptionCallback({ data: { onClassScoreUpdate: finalizedScore } });
    });

    await waitFor(() => {
      expect(screen.getByText(/Fluffy received a final class score of 45\/50 from Judge Smith/)).toBeInTheDocument();
    });
  });

  it('displays ribbon achievement notification for Blue ribbon', async () => {
    let subscriptionCallback: any;
    const mockSubscribe = jest.fn().mockImplementation(({ next }) => {
      subscriptionCallback = next;
      return mockSubscription;
    });

    mockClient.graphql.mockImplementation(({ query }) => {
      if (query.includes('OnClassScoreUpdate')) {
        return { subscribe: mockSubscribe };
      }
      if (query.includes('GetCat')) {
        return Promise.resolve({
          data: { getCat: mockCat }
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(<ClassScoreNotifications />);

    const blueRibbonScore = {
      ...mockClassScoreUpdate,
      isFinalized: true,
      ribbonEligibility: 'Blue'
    };

    // Simulate Blue ribbon achievement
    await act(async () => {
      subscriptionCallback({ data: { onClassScoreUpdate: blueRibbonScore } });
    });

    // Wait for the ribbon notification (appears after 1 second delay)
    act(() => {
      jest.advanceTimersByTime(1100);
    });

    await waitFor(() => {
      expect(screen.getByText(/🥇 Fluffy achieved Blue Ribbon eligibility with 45\/50 points!/)).toBeInTheDocument();
    });
  });

  it('filters notifications when showOnlyFinalized is true', async () => {
    let subscriptionCallback: any;
    const mockSubscribe = jest.fn().mockImplementation(({ next }) => {
      subscriptionCallback = next;
      return mockSubscription;
    });

    mockClient.graphql.mockImplementation(({ query }) => {
      if (query.includes('OnClassScoreUpdate')) {
        return { subscribe: mockSubscribe };
      }
      return Promise.resolve({ data: {} });
    });

    render(<ClassScoreNotifications showOnlyFinalized={true} />);

    // Simulate non-finalized score update
    await act(async () => {
      subscriptionCallback({ data: { onClassScoreUpdate: mockClassScoreUpdate } });
    });

    // Should not show notification for non-finalized score
    await waitFor(() => {
      expect(screen.queryByText(/Fluffy received a new class score/)).not.toBeInTheDocument();
    });
  });

  it('auto-hides notifications after delay', async () => {
    let subscriptionCallback: any;
    const mockSubscribe = jest.fn().mockImplementation(({ next }) => {
      subscriptionCallback = next;
      return mockSubscription;
    });

    mockClient.graphql.mockImplementation(({ query }) => {
      if (query.includes('OnClassScoreUpdate')) {
        return { subscribe: mockSubscribe };
      }
      if (query.includes('GetCat')) {
        return Promise.resolve({
          data: { getCat: mockCat }
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(<ClassScoreNotifications autoHideDelay={3000} />);

    // Simulate new class score update
    await act(async () => {
      subscriptionCallback({ data: { onClassScoreUpdate: mockClassScoreUpdate } });
    });

    // Notification should be visible initially
    await waitFor(() => {
      expect(screen.getByText(/Fluffy received a new class score/)).toBeInTheDocument();
    });

    // Fast-forward time to trigger auto-hide
    act(() => {
      jest.advanceTimersByTime(3100);
    });

    // Notification should be hidden
    await waitFor(() => {
      expect(screen.queryByText(/Fluffy received a new class score/)).not.toBeInTheDocument();
    });
  });

  it('allows manual dismissal of notifications', async () => {
    let subscriptionCallback: any;
    const mockSubscribe = jest.fn().mockImplementation(({ next }) => {
      subscriptionCallback = next;
      return mockSubscription;
    });

    mockClient.graphql.mockImplementation(({ query }) => {
      if (query.includes('OnClassScoreUpdate')) {
        return { subscribe: mockSubscribe };
      }
      if (query.includes('GetCat')) {
        return Promise.resolve({
          data: { getCat: mockCat }
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(<ClassScoreNotifications autoHideDelay={0} />);

    // Simulate new class score update
    await act(async () => {
      subscriptionCallback({ data: { onClassScoreUpdate: mockClassScoreUpdate } });
    });

    // Notification should be visible
    await waitFor(() => {
      expect(screen.getByText(/Fluffy received a new class score/)).toBeInTheDocument();
    });

    // Click dismiss button
    const dismissButton = screen.getAllByTitle('Dismiss')[0];
    fireEvent.click(dismissButton);

    // Notification should be hidden
    await waitFor(() => {
      expect(screen.queryByText(/Fluffy received a new class score/)).not.toBeInTheDocument();
    });
  });

  it('clears all notifications', async () => {
    let subscriptionCallback: any;
    const mockSubscribe = jest.fn().mockImplementation(({ next }) => {
      subscriptionCallback = next;
      return mockSubscription;
    });

    mockClient.graphql.mockImplementation(({ query }) => {
      if (query.includes('OnClassScoreUpdate')) {
        return { subscribe: mockSubscribe };
      }
      if (query.includes('GetCat')) {
        return Promise.resolve({
          data: { getCat: mockCat }
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(<ClassScoreNotifications autoHideDelay={0} />);

    // Simulate multiple class score updates
    await act(async () => {
      subscriptionCallback({ data: { onClassScoreUpdate: mockClassScoreUpdate } });
      subscriptionCallback({ data: { onClassScoreUpdate: { ...mockClassScoreUpdate, id: 'class-score-2' } } });
    });

    // Both notifications should be visible
    await waitFor(() => {
      expect(screen.getAllByText(/Fluffy received a new class score/).length).toBe(2);
    });

    // Click clear all button
    const clearAllButton = screen.getByText('Clear All');
    fireEvent.click(clearAllButton);

    // All notifications should be hidden
    await waitFor(() => {
      expect(screen.queryByText(/Fluffy received a new class score/)).not.toBeInTheDocument();
    });
  });

  it('handles subscription errors gracefully', async () => {
    const mockSubscribe = jest.fn().mockReturnValue(mockSubscription);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    mockClient.graphql.mockImplementation(({ query }) => {
      if (query.includes('OnClassScoreUpdate')) {
        return { subscribe: mockSubscribe };
      }
      return Promise.resolve({ data: {} });
    });

    render(<ClassScoreNotifications />);

    // Simulate subscription error
    const errorCallback = mockSubscribe.mock.calls[0][0].error;
    act(() => {
      errorCallback(new Error('Subscription failed'));
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Class score notifications subscription error:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('cleans up subscription on unmount', async () => {
    const mockSubscribe = jest.fn().mockReturnValue(mockSubscription);
    mockClient.graphql.mockImplementation(({ query }) => {
      if (query.includes('OnClassScoreUpdate')) {
        return { subscribe: mockSubscribe };
      }
      return Promise.resolve({ data: {} });
    });

    const { unmount } = render(<ClassScoreNotifications />);

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalled();
    });

    unmount();

    expect(mockSubscription.unsubscribe).toHaveBeenCalled();
  });

  it('displays different notification icons for different types', async () => {
    let subscriptionCallback: any;
    const mockSubscribe = jest.fn().mockImplementation(({ next }) => {
      subscriptionCallback = next;
      return mockSubscription;
    });

    mockClient.graphql.mockImplementation(({ query }) => {
      if (query.includes('OnClassScoreUpdate')) {
        return { subscribe: mockSubscribe };
      }
      if (query.includes('GetCat')) {
        return Promise.resolve({
          data: { getCat: mockCat }
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(<ClassScoreNotifications autoHideDelay={0} />);

    // Test new score notification
    await act(async () => {
      subscriptionCallback({ data: { onClassScoreUpdate: mockClassScoreUpdate } });
    });

    await waitFor(() => {
      expect(screen.getByText('🆕')).toBeInTheDocument();
    });

    // Test finalized score notification
    await act(async () => {
      subscriptionCallback({ 
        data: { 
          onClassScoreUpdate: { 
            ...mockClassScoreUpdate, 
            id: 'class-score-2',
            isFinalized: true 
          } 
        } 
      });
    });

    await waitFor(() => {
      expect(screen.getByText('✅')).toBeInTheDocument();
    });
  });

  it('respects maxNotifications limit', async () => {
    let subscriptionCallback: any;
    const mockSubscribe = jest.fn().mockImplementation(({ next }) => {
      subscriptionCallback = next;
      return mockSubscription;
    });

    mockClient.graphql.mockImplementation(({ query }) => {
      if (query.includes('OnClassScoreUpdate')) {
        return { subscribe: mockSubscribe };
      }
      if (query.includes('GetCat')) {
        return Promise.resolve({
          data: { getCat: mockCat }
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(<ClassScoreNotifications maxNotifications={2} autoHideDelay={0} />);

    // Simulate 3 class score updates
    await act(async () => {
      subscriptionCallback({ data: { onClassScoreUpdate: { ...mockClassScoreUpdate, id: 'class-score-1' } } });
      subscriptionCallback({ data: { onClassScoreUpdate: { ...mockClassScoreUpdate, id: 'class-score-2' } } });
      subscriptionCallback({ data: { onClassScoreUpdate: { ...mockClassScoreUpdate, id: 'class-score-3' } } });
    });

    // Should only show 2 notifications (the most recent ones)
    await waitFor(() => {
      const notifications = screen.getAllByText(/Fluffy received a new class score/);
      expect(notifications.length).toBe(2);
    });
  });
});