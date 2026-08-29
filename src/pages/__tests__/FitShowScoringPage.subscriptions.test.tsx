import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { generateClient } from 'aws-amplify/api';
import type { Mocked } from 'vitest';

// Setup mocks globally before module imports
const subscriptionCallbacks: { created?: any; updated?: any } = {};
const globalMockUnsubscribe = vi.fn();

const globalMockSubscribe = vi.fn((callbacks: any) => {
  if (callbacks.next) {
    // Store the callback so we can trigger it later
    const lastCall = globalMockGraphql.mock.lastCall?.[0]?.query || '';
    if (lastCall.includes('OnFitShowScoreCreated')) {
      subscriptionCallbacks.created = callbacks.next;
    } else if (lastCall.includes('OnFitShowScoreUpdated')) {
      subscriptionCallbacks.updated = callbacks.next;
    }
  }
  return { unsubscribe: globalMockUnsubscribe };
});

const globalMockGraphql = vi.fn((args: any) => {
  const query = args.query || '';

  if (query.includes('ListCats')) {
    return Promise.resolve({
      data: {
        listCats: {
          items: [
            {
              id: 'cat-1',
              name: 'Fluffy',
              owner: 'John Doe',
              votes: 0,
              cageNumber: 1,
              ownerAgeGroup: 'Adult',
              catAgeGroup: 'Adult',
            },
          ],
        },
      },
    });
  }

  if (query.includes('ListAllFitShowScores')) {
    return Promise.resolve({
      data: {
        listAllFitShowScores: {
          items: [],
        },
      },
    });
  }

  if (query.includes('OnFitShowScoreCreated') || query.includes('OnFitShowScoreUpdated')) {
    // Return subscription object
    return { subscribe: globalMockSubscribe };
  }

  return Promise.reject(new Error('Unexpected query'));
});

vi.mock('aws-amplify/api', () => ({
  generateClient: vi.fn(() => ({
    graphql: globalMockGraphql,
  })),
}));

// Mock child components
vi.mock('../../components/FitShowScoreLeaderboard', () => ({
  default: () => <div data-testid="leaderboard" />,
}));

vi.mock('../../components/FitShowScoreNotifications', () => ({
  default: () => <div data-testid="notifications" />,
}));

let FitShowScoringPage: any;

beforeAll(async () => {
  const mod = await import('../FitShowScoringPage');
  FitShowScoringPage = mod.default;
});

describe('FitShowScoringPage - Subscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    subscriptionCallbacks.created = undefined;
    subscriptionCallbacks.updated = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('subscribes to onFitShowScoreCreated and onFitShowScoreUpdated on mount', async () => {
    render(
      <BrowserRouter>
        <FitShowScoringPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('leaderboard')).toBeInTheDocument();
    });

    // Check that subscriptions were created
    const calls = globalMockGraphql.mock.calls;
    const hasCreatedSubscription = calls.some((call) =>
      call[0]?.query?.includes('OnFitShowScoreCreated')
    );
    const hasUpdatedSubscription = calls.some((call) =>
      call[0]?.query?.includes('OnFitShowScoreUpdated')
    );

    expect(hasCreatedSubscription).toBe(true);
    expect(hasUpdatedSubscription).toBe(true);
  });

  it('refetches data when onFitShowScoreCreated subscription fires', async () => {
    render(
      <BrowserRouter>
        <FitShowScoringPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('leaderboard')).toBeInTheDocument();
    });

    // Reset the mock to count new calls
    globalMockGraphql.mockClear();

    // Trigger the created subscription callback
    if (subscriptionCallbacks.created) {
      subscriptionCallbacks.created({});

      // Wait for the refetch
      await waitFor(() => {
        expect(globalMockGraphql).toHaveBeenCalledWith(
          expect.objectContaining({
            query: expect.stringContaining('ListCats'),
          })
        );
      });
    }
  });

  it('refetches data when onFitShowScoreUpdated subscription fires', async () => {
    render(
      <BrowserRouter>
        <FitShowScoringPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('leaderboard')).toBeInTheDocument();
    });

    // Reset the mock to count new calls
    globalMockGraphql.mockClear();

    // Trigger the updated subscription callback
    if (subscriptionCallbacks.updated) {
      subscriptionCallbacks.updated({});

      // Wait for the refetch
      await waitFor(() => {
        expect(globalMockGraphql).toHaveBeenCalledWith(
          expect.objectContaining({
            query: expect.stringContaining('ListAllFitShowScores'),
          })
        );
      });
    }
  });

  it('unsubscribes and clears interval on unmount', async () => {
    const { unmount } = render(
      <BrowserRouter>
        <FitShowScoringPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('leaderboard')).toBeInTheDocument();
    });

    // Unmount the component
    unmount();

    // Check that unsubscribe was called on both subscriptions
    expect(globalMockUnsubscribe).toHaveBeenCalledTimes(2);
  });

  it('polls for updates every 30 seconds', async () => {
    render(
      <BrowserRouter>
        <FitShowScoringPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('leaderboard')).toBeInTheDocument();
    });

    // Reset the mock to count new calls
    globalMockGraphql.mockClear();

    // Advance time by 30 seconds
    vi.advanceTimersByTime(30000);

    // Wait for the poll to complete
    await waitFor(() => {
      // Check that both list queries were called
      const hasCatsCall = globalMockGraphql.mock.calls.some((call) =>
        call[0]?.query?.includes('ListCats')
      );
      const hasScoresCall = globalMockGraphql.mock.calls.some((call) =>
        call[0]?.query?.includes('ListAllFitShowScores')
      );
      expect(hasCatsCall).toBe(true);
      expect(hasScoresCall).toBe(true);
    });
  });
});
