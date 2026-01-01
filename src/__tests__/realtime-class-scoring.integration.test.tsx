import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { generateClient } from 'aws-amplify/api';
import ClassScoreLeaderboard from '../components/ClassScoreLeaderboard';
import ClassScoreNotifications from '../components/ClassScoreNotifications';
import ClassScoreReports from '../components/ClassScoreReports';

// Mock AWS Amplify
jest.mock('aws-amplify/api');
const mockClient = {
  graphql: jest.fn()
};
(generateClient as jest.Mock).mockReturnValue(mockClient);

// Mock data
const mockCats = {
  'cat-1': { id: 'cat-1', name: 'Fluffy', owner: 'Alice', cageNumber: 1 },
  'cat-2': { id: 'cat-2', name: 'Whiskers', owner: 'Bob', cageNumber: 2 },
  'cat-3': { id: 'cat-3', name: 'Shadow', owner: 'Charlie', cageNumber: 3 }
};

const initialClassScores = [
  {
    id: 'class-score-1',
    catId: 'cat-1',
    judgeId: 'judge-1',
    judgeName: 'Judge Smith',
    beautyScore: 12,
    beautyComments: 'Beautiful coat',
    personalityScore: 18,
    personalityComments: 'Very friendly',
    balanceProportionScore: 13,
    balanceProportionComments: 'Well proportioned',
    coatCleanGroomed: true,
    teethGumsHealthy: true,
    eyesNoseClear: true,
    earsCleanMiteFree: true,
    toenailsClipped: true,
    fleaIssues: false,
    healthGroomingComments: 'Excellent health',
    totalScore: 43,
    ribbonEligibility: 'Red',
    timestamp: '2024-01-15T10:00:00Z',
    isFinalized: true,
    cat: mockCats['cat-1']
  },
  {
    id: 'class-score-2',
    catId: 'cat-2',
    judgeId: 'judge-1',
    judgeName: 'Judge Smith',
    beautyScore: 10,
    beautyComments: 'Nice appearance',
    personalityScore: 15,
    personalityComments: 'Calm temperament',
    balanceProportionScore: 11,
    balanceProportionComments: 'Good balance',
    coatCleanGroomed: true,
    teethGumsHealthy: true,
    eyesNoseClear: true,
    earsCleanMiteFree: true,
    toenailsClipped: true,
    fleaIssues: false,
    healthGroomingComments: 'Good health',
    totalScore: 36,
    ribbonEligibility: 'Red',
    timestamp: '2024-01-15T10:30:00Z',
    isFinalized: true,
    cat: mockCats['cat-2']
  }
];

describe('Real-time Class Scoring Integration', () => {
  let leaderboardSubscription: any;
  let notificationsSubscription: any;
  let reportsSubscription: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Mock subscriptions
    leaderboardSubscription = { unsubscribe: jest.fn() };
    notificationsSubscription = { unsubscribe: jest.fn() };
    reportsSubscription = { unsubscribe: jest.fn() };

    // Mock GraphQL responses
    mockClient.graphql.mockImplementation(({ query, variables }) => {
      if (query.includes('ListAllClassScores')) {
        return Promise.resolve({
          data: {
            listAllClassScores: {
              items: initialClassScores
            }
          }
        });
      }
      
      if (query.includes('GetCat')) {
        const cat = mockCats[variables.id as keyof typeof mockCats];
        return Promise.resolve({
          data: {
            getCat: cat
          }
        });
      }
      
      if (query.includes('OnClassScoreUpdate')) {
        return {
          subscribe: jest.fn().mockReturnValue(leaderboardSubscription)
        };
      }
      
      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('synchronizes real-time updates across leaderboard, notifications, and reports', async () => {
    let leaderboardCallback: any;
    let notificationsCallback: any;
    let reportsCallback: any;

    // Set up subscription callbacks
    const mockLeaderboardSubscribe = jest.fn().mockImplementation(({ next }) => {
      leaderboardCallback = next;
      return leaderboardSubscription;
    });

    const mockNotificationsSubscribe = jest.fn().mockImplementation(({ next }) => {
      notificationsCallback = next;
      return notificationsSubscription;
    });

    const mockReportsSubscribe = jest.fn().mockImplementation(({ next }) => {
      reportsCallback = next;
      return reportsSubscription;
    });

    // Mock different subscription instances for each component
    let subscribeCallCount = 0;
    mockClient.graphql.mockImplementation(({ query, variables }) => {
      if (query.includes('ListAllClassScores')) {
        return Promise.resolve({
          data: {
            listAllClassScores: {
              items: initialClassScores
            }
          }
        });
      }
      
      if (query.includes('GetCat')) {
        const cat = mockCats[variables.id as keyof typeof mockCats];
        return Promise.resolve({
          data: {
            getCat: cat
          }
        });
      }
      
      if (query.includes('OnClassScoreUpdate')) {
        subscribeCallCount++;
        if (subscribeCallCount === 1) {
          return { subscribe: mockLeaderboardSubscribe };
        } else if (subscribeCallCount === 2) {
          return { subscribe: mockNotificationsSubscribe };
        } else {
          return { subscribe: mockReportsSubscribe };
        }
      }
      
      return Promise.resolve({ data: {} });
    });

    // Render all components
    const { container } = render(
      <BrowserRouter>
        <div>
          <ClassScoreLeaderboard />
          <ClassScoreNotifications />
          <ClassScoreReports />
        </div>
      </BrowserRouter>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('🏆 Class Score Leaderboard')).toBeInTheDocument();
      expect(screen.getByText('Fluffy')).toBeInTheDocument();
      expect(screen.getByText('Whiskers')).toBeInTheDocument();
    });

    // Simulate a new class score update
    const newClassScore = {
      id: 'class-score-3',
      catId: 'cat-3',
      judgeId: 'judge-2',
      judgeName: 'Judge Johnson',
      beautyScore: 14,
      beautyComments: 'Stunning appearance',
      personalityScore: 19,
      personalityComments: 'Excellent temperament',
      balanceProportionScore: 14,
      balanceProportionComments: 'Perfect proportions',
      coatCleanGroomed: true,
      teethGumsHealthy: true,
      eyesNoseClear: true,
      earsCleanMiteFree: true,
      toenailsClipped: true,
      fleaIssues: false,
      healthGroomingComments: 'Perfect health',
      totalScore: 47,
      ribbonEligibility: 'Blue',
      timestamp: '2024-01-15T11:00:00Z',
      isFinalized: true
    };

    // Trigger real-time update for all components
    await act(async () => {
      leaderboardCallback({ data: { onClassScoreUpdate: newClassScore } });
      notificationsCallback({ data: { onClassScoreUpdate: newClassScore } });
      reportsCallback({ data: { onClassScoreUpdate: newClassScore } });
    });

    // Verify leaderboard updates
    await waitFor(() => {
      expect(screen.getByText('Shadow')).toBeInTheDocument();
      expect(screen.getByText('47/50')).toBeInTheDocument();
    });

    // Verify notification appears
    await waitFor(() => {
      expect(screen.getByText('🔔 Class Score Updates')).toBeInTheDocument();
      expect(screen.getByText(/Shadow received a final class score of 47\/50/)).toBeInTheDocument();
    });

    // Wait for Blue ribbon achievement notification
    act(() => {
      jest.advanceTimersByTime(1100);
    });

    await waitFor(() => {
      expect(screen.getByText(/🥇 Shadow achieved Blue Ribbon eligibility/)).toBeInTheDocument();
    });
  });

  it('handles concurrent updates from multiple judges', async () => {
    let leaderboardCallback: any;
    let notificationsCallback: any;

    const mockLeaderboardSubscribe = jest.fn().mockImplementation(({ next }) => {
      leaderboardCallback = next;
      return leaderboardSubscription;
    });

    const mockNotificationsSubscribe = jest.fn().mockImplementation(({ next }) => {
      notificationsCallback = next;
      return notificationsSubscription;
    });

    let subscribeCallCount = 0;
    mockClient.graphql.mockImplementation(({ query, variables }) => {
      if (query.includes('ListAllClassScores')) {
        return Promise.resolve({
          data: {
            listAllClassScores: {
              items: initialClassScores
            }
          }
        });
      }
      
      if (query.includes('GetCat')) {
        const cat = mockCats[variables.id as keyof typeof mockCats];
        return Promise.resolve({
          data: {
            getCat: cat
          }
        });
      }
      
      if (query.includes('OnClassScoreUpdate')) {
        subscribeCallCount++;
        if (subscribeCallCount === 1) {
          return { subscribe: mockLeaderboardSubscribe };
        } else {
          return { subscribe: mockNotificationsSubscribe };
        }
      }
      
      return Promise.resolve({ data: {} });
    });

    render(
      <div>
        <ClassScoreLeaderboard />
        <ClassScoreNotifications autoHideDelay={0} />
      </div>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Fluffy')).toBeInTheDocument();
    });

    // Simulate concurrent updates from different judges for the same cat
    const judge1Update = {
      id: 'class-score-1-updated',
      catId: 'cat-1',
      judgeId: 'judge-1',
      judgeName: 'Judge Smith',
      totalScore: 45,
      ribbonEligibility: 'Blue',
      timestamp: '2024-01-15T11:00:00Z',
      isFinalized: false
    };

    const judge2Update = {
      id: 'class-score-1-judge2',
      catId: 'cat-1',
      judgeId: 'judge-2',
      judgeName: 'Judge Johnson',
      totalScore: 48,
      ribbonEligibility: 'Blue',
      timestamp: '2024-01-15T11:05:00Z',
      isFinalized: false
    };

    // Simulate rapid concurrent updates
    await act(async () => {
      leaderboardCallback({ data: { onClassScoreUpdate: judge1Update } });
      notificationsCallback({ data: { onClassScoreUpdate: judge1Update } });
    });

    await act(async () => {
      leaderboardCallback({ data: { onClassScoreUpdate: judge2Update } });
      notificationsCallback({ data: { onClassScoreUpdate: judge2Update } });
    });

    // Verify both updates are handled
    await waitFor(() => {
      expect(screen.getAllByText(/Fluffy received a new class score/).length).toBe(2);
    });

    // Verify leaderboard shows the highest score
    await waitFor(() => {
      expect(screen.getByText('48/50')).toBeInTheDocument();
    });
  });

  it('maintains data consistency during network interruptions', async () => {
    let leaderboardCallback: any;
    const mockLeaderboardSubscribe = jest.fn().mockImplementation(({ next, error }) => {
      leaderboardCallback = next;
      // Simulate network error after setup
      setTimeout(() => {
        error(new Error('Network connection lost'));
      }, 100);
      return leaderboardSubscription;
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    mockClient.graphql.mockImplementation(({ query, variables }) => {
      if (query.includes('ListAllClassScores')) {
        return Promise.resolve({
          data: {
            listAllClassScores: {
              items: initialClassScores
            }
          }
        });
      }
      
      if (query.includes('GetCat')) {
        const cat = mockCats[variables.id as keyof typeof mockCats];
        return Promise.resolve({
          data: {
            getCat: cat
          }
        });
      }
      
      if (query.includes('OnClassScoreUpdate')) {
        return { subscribe: mockLeaderboardSubscribe };
      }
      
      return Promise.resolve({ data: {} });
    });

    render(<ClassScoreLeaderboard />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Fluffy')).toBeInTheDocument();
    });

    // Wait for network error to be triggered
    act(() => {
      jest.advanceTimersByTime(150);
    });

    // Verify error is logged but component remains functional
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Class score leaderboard subscription error:',
        expect.any(Error)
      );
    });

    // Component should still display existing data
    expect(screen.getByText('Fluffy')).toBeInTheDocument();
    expect(screen.getByText('Whiskers')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('handles ribbon eligibility changes in real-time', async () => {
    let leaderboardCallback: any;
    let notificationsCallback: any;

    const mockLeaderboardSubscribe = jest.fn().mockImplementation(({ next }) => {
      leaderboardCallback = next;
      return leaderboardSubscription;
    });

    const mockNotificationsSubscribe = jest.fn().mockImplementation(({ next }) => {
      notificationsCallback = next;
      return notificationsSubscription;
    });

    let subscribeCallCount = 0;
    mockClient.graphql.mockImplementation(({ query, variables }) => {
      if (query.includes('ListAllClassScores')) {
        return Promise.resolve({
          data: {
            listAllClassScores: {
              items: initialClassScores
            }
          }
        });
      }
      
      if (query.includes('GetCat')) {
        const cat = mockCats[variables.id as keyof typeof mockCats];
        return Promise.resolve({
          data: {
            getCat: cat
          }
        });
      }
      
      if (query.includes('OnClassScoreUpdate')) {
        subscribeCallCount++;
        if (subscribeCallCount === 1) {
          return { subscribe: mockLeaderboardSubscribe };
        } else {
          return { subscribe: mockNotificationsSubscribe };
        }
      }
      
      return Promise.resolve({ data: {} });
    });

    render(
      <div>
        <ClassScoreLeaderboard groupByRibbon={true} />
        <ClassScoreNotifications autoHideDelay={0} />
      </div>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Red Ribbon')).toBeInTheDocument();
    });

    // Simulate score update that changes ribbon eligibility from Red to Blue
    const ribbonUpgrade = {
      id: 'class-score-1',
      catId: 'cat-1',
      judgeId: 'judge-1',
      judgeName: 'Judge Smith',
      totalScore: 47,
      ribbonEligibility: 'Blue',
      timestamp: '2024-01-15T12:00:00Z',
      isFinalized: true
    };

    await act(async () => {
      leaderboardCallback({ data: { onClassScoreUpdate: ribbonUpgrade } });
      notificationsCallback({ data: { onClassScoreUpdate: ribbonUpgrade } });
    });

    // Verify ribbon category change in leaderboard
    await waitFor(() => {
      expect(screen.getByText('Blue Ribbon')).toBeInTheDocument();
      expect(screen.getByText('47/50')).toBeInTheDocument();
    });

    // Verify notification shows the upgrade
    await waitFor(() => {
      expect(screen.getByText(/Fluffy received a final class score of 47\/50/)).toBeInTheDocument();
    });

    // Wait for Blue ribbon achievement notification
    act(() => {
      jest.advanceTimersByTime(1100);
    });

    await waitFor(() => {
      expect(screen.getByText(/🥇 Fluffy achieved Blue Ribbon eligibility/)).toBeInTheDocument();
    });
  });

  it('properly cleans up all subscriptions on unmount', async () => {
    const mockLeaderboardSubscribe = jest.fn().mockReturnValue(leaderboardSubscription);
    const mockNotificationsSubscribe = jest.fn().mockReturnValue(notificationsSubscription);
    const mockReportsSubscribe = jest.fn().mockReturnValue(reportsSubscription);

    let subscribeCallCount = 0;
    mockClient.graphql.mockImplementation(({ query }) => {
      if (query.includes('ListAllClassScores')) {
        return Promise.resolve({
          data: {
            listAllClassScores: {
              items: []
            }
          }
        });
      }
      
      if (query.includes('OnClassScoreUpdate')) {
        subscribeCallCount++;
        if (subscribeCallCount === 1) {
          return { subscribe: mockLeaderboardSubscribe };
        } else if (subscribeCallCount === 2) {
          return { subscribe: mockNotificationsSubscribe };
        } else {
          return { subscribe: mockReportsSubscribe };
        }
      }
      
      return Promise.resolve({ data: {} });
    });

    const { unmount } = render(
      <BrowserRouter>
        <div>
          <ClassScoreLeaderboard />
          <ClassScoreNotifications />
          <ClassScoreReports />
        </div>
      </BrowserRouter>
    );

    // Wait for subscriptions to be set up
    await waitFor(() => {
      expect(mockLeaderboardSubscribe).toHaveBeenCalled();
      expect(mockNotificationsSubscribe).toHaveBeenCalled();
      expect(mockReportsSubscribe).toHaveBeenCalled();
    });

    // Unmount components
    unmount();

    // Verify all subscriptions are cleaned up
    expect(leaderboardSubscription.unsubscribe).toHaveBeenCalled();
    expect(notificationsSubscription.unsubscribe).toHaveBeenCalled();
    expect(reportsSubscription.unsubscribe).toHaveBeenCalled();
  });

  it('handles malformed subscription data gracefully', async () => {
    let leaderboardCallback: any;
    const mockLeaderboardSubscribe = jest.fn().mockImplementation(({ next }) => {
      leaderboardCallback = next;
      return leaderboardSubscription;
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    mockClient.graphql.mockImplementation(({ query }) => {
      if (query.includes('ListAllClassScores')) {
        return Promise.resolve({
          data: {
            listAllClassScores: {
              items: initialClassScores
            }
          }
        });
      }
      
      if (query.includes('OnClassScoreUpdate')) {
        return { subscribe: mockLeaderboardSubscribe };
      }
      
      return Promise.resolve({ data: {} });
    });

    render(<ClassScoreLeaderboard />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Fluffy')).toBeInTheDocument();
    });

    // Simulate malformed subscription data
    await act(async () => {
      leaderboardCallback({ data: null });
      leaderboardCallback({ data: { onClassScoreUpdate: null } });
      leaderboardCallback({ data: { onClassScoreUpdate: { id: null } } });
    });

    // Component should remain stable and not crash
    expect(screen.getByText('Fluffy')).toBeInTheDocument();
    expect(screen.getByText('Whiskers')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});