import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { generateClient } from 'aws-amplify/api';
import ClassScoreLeaderboard from '../ClassScoreLeaderboard';

// Mock AWS Amplify
jest.mock('aws-amplify/api');
const mockClient = {
  graphql: jest.fn()
};
(generateClient as jest.Mock).mockReturnValue(mockClient);

// Mock data
const mockClassScores = [
  {
    id: 'class-score-1',
    catId: 'cat-1',
    judgeId: 'judge-1',
    judgeName: 'Judge Smith',
    totalScore: 45,
    ribbonEligibility: 'Blue',
    timestamp: '2024-01-15T10:00:00Z',
    isFinalized: true
  },
  {
    id: 'class-score-2',
    catId: 'cat-2',
    judgeId: 'judge-1',
    judgeName: 'Judge Smith',
    totalScore: 38,
    ribbonEligibility: 'Red',
    timestamp: '2024-01-15T10:30:00Z',
    isFinalized: true
  },
  {
    id: 'class-score-3',
    catId: 'cat-3',
    judgeId: 'judge-2',
    judgeName: 'Judge Johnson',
    totalScore: 28,
    ribbonEligibility: 'White',
    timestamp: '2024-01-15T11:00:00Z',
    isFinalized: false
  }
];

const mockCats = {
  'cat-1': { id: 'cat-1', name: 'Fluffy', owner: 'Alice', cageNumber: 1 },
  'cat-2': { id: 'cat-2', name: 'Whiskers', owner: 'Bob', cageNumber: 2 },
  'cat-3': { id: 'cat-3', name: 'Shadow', owner: 'Charlie', cageNumber: 3 }
};

describe('ClassScoreLeaderboard', () => {
  let mockSubscription: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock subscription
    mockSubscription = {
      unsubscribe: jest.fn()
    };

    // Mock GraphQL responses
    mockClient.graphql.mockImplementation(({ query, variables }) => {
      if (query.includes('ListAllClassScores')) {
        return Promise.resolve({
          data: {
            listAllClassScores: {
              items: mockClassScores
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
          subscribe: jest.fn().mockReturnValue(mockSubscription)
        };
      }
      
      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('renders loading state initially', () => {
    render(<ClassScoreLeaderboard />);
    expect(screen.getByText(/Loading Class Score Leaderboard/)).toBeInTheDocument();
  });

  it('displays class score leaderboard with ribbon categories', async () => {
    render(<ClassScoreLeaderboard groupByRibbon={true} />);

    await waitFor(() => {
      expect(screen.getByText('🏆 Class Score Leaderboard')).toBeInTheDocument();
    });

    // Check for ribbon categories
    await waitFor(() => {
      expect(screen.getByText(/Blue Ribbon/)).toBeInTheDocument();
      expect(screen.getByText(/Red Ribbon/)).toBeInTheDocument();
    });

    // Check for cat names
    await waitFor(() => {
      expect(screen.getByText('Fluffy')).toBeInTheDocument();
      expect(screen.getByText('Whiskers')).toBeInTheDocument();
    });

    // Check scores
    await waitFor(() => {
      expect(screen.getByText('45/50')).toBeInTheDocument();
      expect(screen.getByText('38/50')).toBeInTheDocument();
    });
  });

  it('displays leaderboard without ribbon grouping', async () => {
    render(<ClassScoreLeaderboard groupByRibbon={false} />);

    await waitFor(() => {
      expect(screen.getByText('🏆 Class Score Leaderboard')).toBeInTheDocument();
    });

    // Should show entries in order without ribbon grouping
    await waitFor(() => {
      expect(screen.getByText('Fluffy')).toBeInTheDocument();
      expect(screen.getByText('Whiskers')).toBeInTheDocument();
    });

    // Should show ribbon icons
    await waitFor(() => {
      expect(screen.getByText('🥇')).toBeInTheDocument(); // Blue ribbon icon
      expect(screen.getByText('🥈')).toBeInTheDocument(); // Red ribbon icon
    });
  });

  it('filters finalized scores only when showOnlyFinalized is true', async () => {
    render(<ClassScoreLeaderboard showOnlyFinalized={true} />);

    await waitFor(() => {
      expect(screen.getByText('✅ Showing finalized class scores only')).toBeInTheDocument();
    });

    // Should show finalized scores
    await waitFor(() => {
      expect(screen.getByText('Fluffy')).toBeInTheDocument();
      expect(screen.getByText('Whiskers')).toBeInTheDocument();
    });

    // Should not show non-finalized scores
    await waitFor(() => {
      expect(screen.queryByText('Shadow')).not.toBeInTheDocument();
    });
  });

  it('sets up real-time subscription for class score updates', async () => {
    const mockSubscribe = jest.fn().mockReturnValue(mockSubscription);
    mockClient.graphql.mockImplementation(({ query }) => {
      if (query.includes('OnClassScoreUpdate')) {
        return { subscribe: mockSubscribe };
      }
      return Promise.resolve({ data: { listAllClassScores: { items: [] } } });
    });

    render(<ClassScoreLeaderboard />);

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalledWith({
        next: expect.any(Function),
        error: expect.any(Function)
      });
    });
  });

  it('handles real-time class score updates', async () => {
    let subscriptionCallback: any;
    const mockSubscribe = jest.fn().mockImplementation(({ next }) => {
      subscriptionCallback = next;
      return mockSubscription;
    });

    mockClient.graphql.mockImplementation(({ query }) => {
      if (query.includes('OnClassScoreUpdate')) {
        return { subscribe: mockSubscribe };
      }
      if (query.includes('ListAllClassScores')) {
        return Promise.resolve({
          data: {
            listAllClassScores: {
              items: [mockClassScores[0]] // Start with one score
            }
          }
        });
      }
      if (query.includes('GetCat')) {
        return Promise.resolve({
          data: {
            getCat: mockCats['cat-1']
          }
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(<ClassScoreLeaderboard />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Fluffy')).toBeInTheDocument();
    });

    // Simulate real-time update
    const newScore = {
      id: 'class-score-4',
      catId: 'cat-1',
      judgeId: 'judge-2',
      judgeName: 'Judge Johnson',
      totalScore: 48,
      ribbonEligibility: 'Blue',
      timestamp: '2024-01-15T12:00:00Z',
      isFinalized: true
    };

    act(() => {
      subscriptionCallback({ data: { onClassScoreUpdate: newScore } });
    });

    // Should update the score for the existing cat
    await waitFor(() => {
      expect(screen.getByText('48/50')).toBeInTheDocument();
    });
  });

  it('handles subscription errors gracefully', async () => {
    const mockSubscribe = jest.fn().mockReturnValue(mockSubscription);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    mockClient.graphql.mockImplementation(({ query }) => {
      if (query.includes('OnClassScoreUpdate')) {
        return { subscribe: mockSubscribe };
      }
      return Promise.resolve({ data: { listAllClassScores: { items: [] } } });
    });

    render(<ClassScoreLeaderboard />);

    // Simulate subscription error
    const errorCallback = mockSubscribe.mock.calls[0][0].error;
    act(() => {
      errorCallback(new Error('Subscription failed'));
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Class score leaderboard subscription error:',
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
      return Promise.resolve({ data: { listAllClassScores: { items: [] } } });
    });

    const { unmount } = render(<ClassScoreLeaderboard />);

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalled();
    });

    unmount();

    expect(mockSubscription.unsubscribe).toHaveBeenCalled();
  });

  it('displays error state when loading fails', async () => {
    mockClient.graphql.mockImplementation(({ query }) => {
      if (query.includes('ListAllClassScores')) {
        return Promise.reject(new Error('Network error'));
      }
      if (query.includes('OnClassScoreUpdate')) {
        return { subscribe: jest.fn().mockReturnValue(mockSubscription) };
      }
      return Promise.resolve({ data: {} });
    });

    render(<ClassScoreLeaderboard />);

    await waitFor(() => {
      expect(screen.getByText('❌ Error Loading Class Score Leaderboard')).toBeInTheDocument();
      expect(screen.getByText('Failed to load class score leaderboard. Please try again.')).toBeInTheDocument();
    });
  });

  it('shows empty state when no class scores exist', async () => {
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
        return { subscribe: jest.fn().mockReturnValue(mockSubscription) };
      }
      return Promise.resolve({ data: {} });
    });

    render(<ClassScoreLeaderboard />);

    await waitFor(() => {
      expect(screen.getByText('No class scores available yet.')).toBeInTheDocument();
    });
  });

  it('respects maxEntriesPerRibbon prop', async () => {
    const manyScores = Array.from({ length: 15 }, (_, i) => ({
      id: `class-score-${i}`,
      catId: `cat-${i}`,
      judgeId: 'judge-1',
      judgeName: 'Judge Smith',
      totalScore: 45 - i,
      ribbonEligibility: 'Blue',
      timestamp: `2024-01-15T${10 + i}:00:00Z`,
      isFinalized: true
    }));

    mockClient.graphql.mockImplementation(({ query, variables }) => {
      if (query.includes('ListAllClassScores')) {
        return Promise.resolve({
          data: {
            listAllClassScores: {
              items: manyScores
            }
          }
        });
      }
      if (query.includes('GetCat')) {
        return Promise.resolve({
          data: {
            getCat: { id: variables.id, name: `Cat ${variables.id}`, owner: 'Owner', cageNumber: 1 }
          }
        });
      }
      if (query.includes('OnClassScoreUpdate')) {
        return { subscribe: jest.fn().mockReturnValue(mockSubscription) };
      }
      return Promise.resolve({ data: {} });
    });

    render(<ClassScoreLeaderboard maxEntriesPerRibbon={5} groupByRibbon={true} />);

    await waitFor(() => {
      expect(screen.getByText('🏆 Class Score Leaderboard')).toBeInTheDocument();
    });

    // Should limit entries per ribbon to 5
    await waitFor(() => {
      const catElements = screen.getAllByText(/Cat cat-/);
      expect(catElements.length).toBeLessThanOrEqual(5);
    });
  });
});