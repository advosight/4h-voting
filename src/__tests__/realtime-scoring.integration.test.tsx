import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';
import { BrowserRouter } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import ParticipantScorePage from '../pages/ParticipantScorePage';

// Mock AWS Amplify
const mockGraphql = vi.fn();
const mockClient = {
  graphql: mockGraphql,
};

vi.mock('aws-amplify/api', () => ({
  generateClient: vi.fn(() => mockClient),
}));
vi.mock('aws-amplify/auth');

// Mock auth
vi.mocked(getCurrentUser).mockResolvedValue({
  userId: 'test-user',
  username: 'test@example.com'
} as any);

// Mock subscription
const mockSubscription = {
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
};

describe('Real-time Scoring Integration', () => {
  let subscriptionCallbacks: { [key: string]: any } = {};

  beforeEach(() => {
    vi.clearAllMocks();
    subscriptionCallbacks = {};
    
    mockGraphql.mockImplementation((params) => {
      if (query.query.includes('subscription OnScoreUpdate')) {
        return {
          subscribe: ({ next }: any) => {
            subscriptionCallbacks.scoreUpdate = next;
            return { unsubscribe: vi.fn() };
          }
        };
      }
      if (query.query.includes('subscription OnVoteUpdate')) {
        return {
          subscribe: ({ next }: any) => {
            subscriptionCallbacks.voteUpdate = next;
            return { unsubscribe: vi.fn() };
          }
        };
      }
      if (query.query.includes('subscription OnEmailAdded')) {
        return {
          subscribe: ({ next }: any) => {
            subscriptionCallbacks.emailAdded = next;
            return { unsubscribe: vi.fn() };
          }
        };
      }
      if (query.query.includes('subscription OnVotingStatusChange')) {
        return {
          subscribe: ({ next }: any) => {
            subscriptionCallbacks.votingStatusChange = next;
            return { unsubscribe: vi.fn() };
          }
        };
      }
      
      // Mock other queries
      if (query.query.includes('listCats')) {
        return Promise.resolve({
          data: {
            listCats: {
              items: [
                {
                  id: 'cat1',
                  name: 'Fluffy',
                  owner: 'John Doe',
                  votes: 5,
                  cageNumber: 1
                }
              ]
            }
          }
        });
      }
      
      if (query.query.includes('listAllScores')) {
        return Promise.resolve({
          data: {
            listAllScores: {
              items: [
                {
                  id: 'score1',
                  catId: 'cat1',
                  judgeId: 'judge1',
                  judgeName: 'Judge Smith',
                  totalScore: 85,
                  timestamp: '2024-01-01T10:00:00Z',
                  isFinalized: false
                }
              ]
            }
          }
        });
      }
      
      if (query.query.includes('getCat')) {
        return Promise.resolve({
          data: {
            getCat: {
              id: 'cat1',
              name: 'Fluffy',
              owner: 'John Doe',
              cageNumber: 1,
              votes: 5
            }
          }
        });
      }
      
      if (query.query.includes('getScoresByCat')) {
        return Promise.resolve({
          data: {
            getScoresByCat: {
              items: [
                {
                  id: 'score1',
                  catId: 'cat1',
                  judgeId: 'judge1',
                  judgeName: 'Judge Smith',
                  cageConditionScore: 20,
                  cageConditionComments: 'Clean cage',
                  catConditionScore: 22,
                  catConditionComments: 'Healthy cat',
                  groomingScore: 21,
                  groomingComments: 'Well groomed',
                  overallScore: 22,
                  overallComments: 'Great presentation',
                  totalScore: 85,
                  timestamp: '2024-01-01T10:00:00Z',
                  isFinalized: false
                }
              ]
            }
          }
        });
      }
      
      if (query.query.includes('listEmails')) {
        return Promise.resolve({
          data: {
            listEmails: {
              items: []
            }
          }
        });
      }
      
      if (query.query.includes('getVotingStatus')) {
        return Promise.resolve({
          data: {
            getVotingStatus: {
              isActive: true
            }
          }
        });
      }
      
      return Promise.resolve({ data: {} });
    });
  });

  it('updates leaderboard in real-time when scores change', async () => {
    const TestComponent = () => (
      <BrowserRouter>
        <HomePage user={{ userId: 'test-user', attributes: { 'custom:role': 'judge' } }} />
      </BrowserRouter>
    );

    render(<TestComponent />);

    // Wait for initial load and switch to leaderboard view
    await waitFor(() => {
      expect(screen.getByText('🏆 Leaderboard')).toBeInTheDocument();
    });

    // Click leaderboard button
    act(() => {
      screen.getByText('🏆 Leaderboard').click();
    });

    await waitFor(() => {
      expect(screen.getByText('🏆 Score Leaderboard')).toBeInTheDocument();
    });

    // Initial score should be visible
    await waitFor(() => {
      expect(screen.getByText('85/100')).toBeInTheDocument();
    });

    // Simulate real-time score update
    act(() => {
      if (subscriptionCallbacks.scoreUpdate) {
        subscriptionCallbacks.scoreUpdate({
          data: {
            onScoreUpdate: {
              id: 'score1',
              catId: 'cat1',
              judgeId: 'judge1',
              judgeName: 'Judge Smith',
              totalScore: 92,
              timestamp: '2024-01-01T12:00:00Z',
              isFinalized: true
            }
          }
        });
      }
    });

    // Updated score should be visible
    await waitFor(() => {
      expect(screen.getByText('92/100')).toBeInTheDocument();
      expect(screen.queryByText('85/100')).not.toBeInTheDocument();
    });
  });

  it('shows real-time notifications for score updates', async () => {
    const TestComponent = () => (
      <BrowserRouter>
        <HomePage user={{ userId: 'test-user', attributes: { 'custom:role': 'judge' } }} />
      </BrowserRouter>
    );

    render(<TestComponent />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('4H Cat Voting System')).toBeInTheDocument();
    });

    // Simulate real-time score update
    act(() => {
      if (subscriptionCallbacks.scoreUpdate) {
        subscriptionCallbacks.scoreUpdate({
          data: {
            onScoreUpdate: {
              id: 'score2',
              catId: 'cat1',
              judgeId: 'judge2',
              judgeName: 'Judge Jones',
              totalScore: 88,
              timestamp: '2024-01-01T13:00:00Z',
              isFinalized: true
            }
          }
        });
      }
    });

    // Notification should appear
    await waitFor(() => {
      expect(screen.getByText('🔔 Score Updates')).toBeInTheDocument();
      expect(screen.getByText(/Fluffy received a final score of 88\/100 from Judge Jones/)).toBeInTheDocument();
    });
  });

  it('updates participant score view in real-time', async () => {
    // Mock useParams
    vi.doMock('react-router-dom', async () => ({
      ...(await vi.importActual('react-router-dom')),
      useParams: () => ({ catId: 'cat1' }),
      useNavigate: () => vi.fn(),
    }));

    const ParticipantScorePageWithRouter = () => (
      <BrowserRouter>
        <ParticipantScorePage />
      </BrowserRouter>
    );

    render(<ParticipantScorePageWithRouter />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Cat Scores')).toBeInTheDocument();
      expect(screen.getByText('Fluffy')).toBeInTheDocument();
    });

    // Initial score should be visible
    await waitFor(() => {
      expect(screen.getByText('85')).toBeInTheDocument();
    });

    // Simulate real-time score update for this cat
    act(() => {
      if (subscriptionCallbacks.scoreUpdate) {
        subscriptionCallbacks.scoreUpdate({
          data: {
            onScoreUpdate: {
              id: 'score1',
              catId: 'cat1',
              judgeId: 'judge1',
              judgeName: 'Judge Smith',
              cageConditionScore: 23,
              cageConditionComments: 'Very clean cage',
              catConditionScore: 24,
              catConditionComments: 'Excellent health',
              groomingScore: 23,
              groomingComments: 'Perfectly groomed',
              overallScore: 24,
              overallComments: 'Outstanding presentation',
              totalScore: 94,
              timestamp: '2024-01-01T14:00:00Z',
              isFinalized: true
            }
          }
        });
      }
    });

    // Updated score should be visible
    await waitFor(() => {
      expect(screen.getByText('94')).toBeInTheDocument();
      expect(screen.getByText('Very clean cage')).toBeInTheDocument();
      expect(screen.getByText('Excellent health')).toBeInTheDocument();
    });
  });

  it('handles multiple concurrent score updates correctly', async () => {
    const TestComponent = () => (
      <BrowserRouter>
        <HomePage user={{ userId: 'test-user', attributes: { 'custom:role': 'judge' } }} />
      </BrowserRouter>
    );

    render(<TestComponent />);

    // Switch to leaderboard view
    await waitFor(() => {
      expect(screen.getByText('🏆 Leaderboard')).toBeInTheDocument();
    });

    act(() => {
      screen.getByText('🏆 Leaderboard').click();
    });

    await waitFor(() => {
      expect(screen.getByText('🏆 Score Leaderboard')).toBeInTheDocument();
    });

    // Simulate multiple rapid score updates
    act(() => {
      if (subscriptionCallbacks.scoreUpdate) {
        // First update
        subscriptionCallbacks.scoreUpdate({
          data: {
            onScoreUpdate: {
              id: 'score2',
              catId: 'cat2',
              judgeId: 'judge1',
              judgeName: 'Judge Smith',
              totalScore: 90,
              timestamp: '2024-01-01T12:00:00Z',
              isFinalized: true
            }
          }
        });

        // Second update
        subscriptionCallbacks.scoreUpdate({
          data: {
            onScoreUpdate: {
              id: 'score3',
              catId: 'cat3',
              judgeId: 'judge2',
              judgeName: 'Judge Jones',
              totalScore: 87,
              timestamp: '2024-01-01T12:01:00Z',
              isFinalized: true
            }
          }
        });

        // Update to existing score
        subscriptionCallbacks.scoreUpdate({
          data: {
            onScoreUpdate: {
              id: 'score1',
              catId: 'cat1',
              judgeId: 'judge1',
              judgeName: 'Judge Smith',
              totalScore: 95,
              timestamp: '2024-01-01T12:02:00Z',
              isFinalized: true
            }
          }
        });
      }
    });

    // All updates should be reflected
    await waitFor(() => {
      expect(screen.getByText('95/100')).toBeInTheDocument(); // Updated score1
    });

    // Should also trigger notifications
    await waitFor(() => {
      expect(screen.getByText('🔔 Score Updates')).toBeInTheDocument();
    });
  });

  it('maintains subscription connections across component re-renders', async () => {
    const TestComponent = () => (
      <BrowserRouter>
        <HomePage user={{ userId: 'test-user', attributes: { 'custom:role': 'judge' } }} />
      </BrowserRouter>
    );

    const { rerender } = render(<TestComponent />);

    // Wait for initial subscriptions to be set up
    await waitFor(() => {
      expect(subscriptionCallbacks.scoreUpdate).toBeDefined();
    });

    // Re-render component
    rerender(<TestComponent />);

    // Subscriptions should still work after re-render
    act(() => {
      if (subscriptionCallbacks.scoreUpdate) {
        subscriptionCallbacks.scoreUpdate({
          data: {
            onScoreUpdate: {
              id: 'score1',
              catId: 'cat1',
              judgeId: 'judge1',
              judgeName: 'Judge Smith',
              totalScore: 88,
              timestamp: '2024-01-01T15:00:00Z',
              isFinalized: true
            }
          }
        });
      }
    });

    // Should still receive and process updates
    await waitFor(() => {
      expect(screen.getByText('🔔 Score Updates')).toBeInTheDocument();
    });
  });
});