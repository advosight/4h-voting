import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { generateClient } from 'aws-amplify/api';
import ScoreNotifications from '../ScoreNotifications';
import type { Mock } from 'vitest';

// Mock AWS Amplify
vi.mock('aws-amplify/api');
const mockClient = {
  graphql: vi.fn(),
};
(generateClient as Mock).mockReturnValue(mockClient);

// Mock subscription
const mockSubscription = {
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
};

describe('ScoreNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.graphql.mockImplementation((query) => {
      if (query.query.includes('subscription')) {
        return mockSubscription;
      }
      return Promise.resolve({
        data: {
          getCat: {
            id: 'cat1',
            name: 'Fluffy',
            owner: 'John Doe',
            cageNumber: 1
          }
        }
      });
    });
    
    mockSubscription.subscribe.mockReturnValue({
      unsubscribe: vi.fn()
    });
  });

  it('sets up score subscription on mount', () => {
    render(<ScoreNotifications />);

    expect(mockClient.graphql).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.stringContaining('subscription OnScoreUpdate')
      })
    );

    expect(mockSubscription.subscribe).toHaveBeenCalled();
  });

  it('displays notification header when notifications exist', async () => {
    let subscriptionCallback: any;

    mockSubscription.subscribe.mockImplementation(({ next }) => {
      subscriptionCallback = next;
      return { unsubscribe: vi.fn() };
    });

    render(<ScoreNotifications />);

    // Simulate receiving a score update
    act(() => {
      subscriptionCallback({
        data: {
          onScoreUpdate: {
            id: 'score1',
            catId: 'cat1',
            judgeId: 'judge1',
            judgeName: 'Judge Smith',
            totalScore: 95,
            timestamp: '2024-01-01T10:00:00Z',
            isFinalized: true
          }
        }
      });
    });

    await waitFor(() => {
      expect(screen.getByText('🔔 Score Updates')).toBeInTheDocument();
    });
  });

  it('creates notification for new finalized score', async () => {
    let subscriptionCallback: any;

    mockSubscription.subscribe.mockImplementation(({ next }) => {
      subscriptionCallback = next;
      return { unsubscribe: vi.fn() };
    });

    render(<ScoreNotifications />);

    // Simulate receiving a finalized score update
    act(() => {
      subscriptionCallback({
        data: {
          onScoreUpdate: {
            id: 'score1',
            catId: 'cat1',
            judgeId: 'judge1',
            judgeName: 'Judge Smith',
            totalScore: 95,
            timestamp: '2024-01-01T10:00:00Z',
            isFinalized: true
          }
        }
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/Fluffy received a final score of 95\/100 from Judge Smith/)).toBeInTheDocument();
      expect(screen.getByText('✅')).toBeInTheDocument();
    });
  });

  it('creates notification for new draft score', async () => {
    let subscriptionCallback: any;

    mockSubscription.subscribe.mockImplementation(({ next }) => {
      subscriptionCallback = next;
      return { unsubscribe: vi.fn() };
    });

    render(<ScoreNotifications />);

    // Simulate receiving a draft score update
    act(() => {
      subscriptionCallback({
        data: {
          onScoreUpdate: {
            id: 'score1',
            catId: 'cat1',
            judgeId: 'judge1',
            judgeName: 'Judge Smith',
            totalScore: 88,
            timestamp: '2024-01-01T10:00:00Z',
            isFinalized: false
          }
        }
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/Fluffy received a new score of 88\/100 from Judge Smith/)).toBeInTheDocument();
      expect(screen.getByText('🆕')).toBeInTheDocument();
    });
  });

  it('filters out non-finalized scores when showOnlyFinalized is true', async () => {
    let subscriptionCallback: any;

    mockSubscription.subscribe.mockImplementation(({ next }) => {
      subscriptionCallback = next;
      return { unsubscribe: vi.fn() };
    });

    render(<ScoreNotifications showOnlyFinalized={true} />);

    // Simulate receiving a draft score update
    act(() => {
      subscriptionCallback({
        data: {
          onScoreUpdate: {
            id: 'score1',
            catId: 'cat1',
            judgeId: 'judge1',
            judgeName: 'Judge Smith',
            totalScore: 88,
            timestamp: '2024-01-01T10:00:00Z',
            isFinalized: false
          }
        }
      });
    });

    // Should not show notification for draft score
    await waitFor(() => {
      expect(screen.queryByText(/Fluffy received a new score/)).not.toBeInTheDocument();
    });

    // Simulate receiving a finalized score update
    act(() => {
      subscriptionCallback({
        data: {
          onScoreUpdate: {
            id: 'score2',
            catId: 'cat1',
            judgeId: 'judge1',
            judgeName: 'Judge Smith',
            totalScore: 95,
            timestamp: '2024-01-01T11:00:00Z',
            isFinalized: true
          }
        }
      });
    });

    // Should show notification for finalized score
    await waitFor(() => {
      expect(screen.getByText(/Fluffy received a final score of 95\/100/)).toBeInTheDocument();
    });
  });

  it('allows dismissing individual notifications', async () => {
    let subscriptionCallback: any;

    mockSubscription.subscribe.mockImplementation(({ next }) => {
      subscriptionCallback = next;
      return { unsubscribe: vi.fn() };
    });

    render(<ScoreNotifications />);

    // Add a notification
    act(() => {
      subscriptionCallback({
        data: {
          onScoreUpdate: {
            id: 'score1',
            catId: 'cat1',
            judgeId: 'judge1',
            judgeName: 'Judge Smith',
            totalScore: 95,
            timestamp: '2024-01-01T10:00:00Z',
            isFinalized: true
          }
        }
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/Fluffy received a final score/)).toBeInTheDocument();
    });

    // Click dismiss button
    const dismissButton = screen.getAllByText('✕')[1]; // Second ✕ is the dismiss button
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(screen.queryByText(/Fluffy received a final score/)).not.toBeInTheDocument();
    });
  });

  it('allows clearing all notifications', async () => {
    let subscriptionCallback: any;

    mockSubscription.subscribe.mockImplementation(({ next }) => {
      subscriptionCallback = next;
      return { unsubscribe: vi.fn() };
    });

    render(<ScoreNotifications />);

    // Add multiple notifications
    act(() => {
      subscriptionCallback({
        data: {
          onScoreUpdate: {
            id: 'score1',
            catId: 'cat1',
            judgeId: 'judge1',
            judgeName: 'Judge Smith',
            totalScore: 95,
            timestamp: '2024-01-01T10:00:00Z',
            isFinalized: true
          }
        }
      });
    });

    act(() => {
      subscriptionCallback({
        data: {
          onScoreUpdate: {
            id: 'score2',
            catId: 'cat1',
            judgeId: 'judge2',
            judgeName: 'Judge Jones',
            totalScore: 88,
            timestamp: '2024-01-01T11:00:00Z',
            isFinalized: false
          }
        }
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/Judge Smith/)).toBeInTheDocument();
      expect(screen.getByText(/Judge Jones/)).toBeInTheDocument();
    });

    // Click clear all button
    const clearAllButton = screen.getByText('Clear All');
    fireEvent.click(clearAllButton);

    await waitFor(() => {
      expect(screen.queryByText(/Judge Smith/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Judge Jones/)).not.toBeInTheDocument();
    });
  });

  it('auto-hides notifications after delay', async () => {
    vi.useFakeTimers();
    
    let subscriptionCallback: any;

    mockSubscription.subscribe.mockImplementation(({ next }) => {
      subscriptionCallback = next;
      return { unsubscribe: vi.fn() };
    });

    render(<ScoreNotifications autoHideDelay={3000} />);

    // Add a notification
    act(() => {
      subscriptionCallback({
        data: {
          onScoreUpdate: {
            id: 'score1',
            catId: 'cat1',
            judgeId: 'judge1',
            judgeName: 'Judge Smith',
            totalScore: 95,
            timestamp: '2024-01-01T10:00:00Z',
            isFinalized: true
          }
        }
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/Fluffy received a final score/)).toBeInTheDocument();
    });

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(screen.queryByText(/Fluffy received a final score/)).not.toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  it('respects maxNotifications limit', async () => {
    let subscriptionCallback: any;

    mockSubscription.subscribe.mockImplementation(({ next }) => {
      subscriptionCallback = next;
      return { unsubscribe: vi.fn() };
    });

    render(<ScoreNotifications maxNotifications={2} />);

    // Add 3 notifications
    for (let i = 1; i <= 3; i++) {
      act(() => {
        subscriptionCallback({
          data: {
            onScoreUpdate: {
              id: `score${i}`,
              catId: 'cat1',
              judgeId: `judge${i}`,
              judgeName: `Judge ${i}`,
              totalScore: 90 + i,
              timestamp: `2024-01-01T1${i}:00:00Z`,
              isFinalized: true
            }
          }
        });
      });
    }

    await waitFor(() => {
      // Should only show the 2 most recent notifications
      expect(screen.getByText(/Judge 3/)).toBeInTheDocument();
      expect(screen.getByText(/Judge 2/)).toBeInTheDocument();
      expect(screen.queryByText(/Judge 1/)).not.toBeInTheDocument();
    });
  });

  it('cleans up subscription on unmount', () => {
    const mockUnsubscribe = vi.fn();
    mockSubscription.subscribe.mockReturnValue({
      unsubscribe: mockUnsubscribe
    });

    const { unmount } = render(<ScoreNotifications />);
    
    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('handles subscription errors gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation();
    
    mockSubscription.subscribe.mockImplementation(({ error }) => {
      error(new Error('Subscription failed'));
      return { unsubscribe: vi.fn() };
    });

    render(<ScoreNotifications />);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Score notifications subscription error:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});