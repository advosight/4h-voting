import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import FitShowScoringPage from '../pages/FitShowScoringPage';
import FitShowScoreLeaderboard from '../components/FitShowScoreLeaderboard';
import FitShowScoreNotifications from '../components/FitShowScoreNotifications';
import type { Mock } from 'vitest';

// Mock AWS Amplify
vi.mock('aws-amplify/api');

const mockClient = {
  graphql: vi.fn(),
  cancel: vi.fn(),
};

// Mock subscription
const mockSubscription = {
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
};

(generateClient as Mock).mockReturnValue(mockClient);

// Mock data
const mockFitShowScore = {
  id: 'score-123',
  catId: 'cat-123',
  participantName: 'John Doe',
  judgeId: 'judge-123',
  judgeName: 'Judge Smith',
  totalScore: 85,
  appearanceTotal: 17,
  handlingTotal: 10,
  demonstrationTotal: 14,
  healthExaminationTotal: 19,
  groomingCareTotal: 13,
  knowledgeTotal: 12,
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
  isFinalized: false
};

describe('Real-time Fit and Show Scoring Integration Tests', () => {
  let subscriptionCallback: (data: any) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Amplify configuration
    Amplify.configure({
      API: {
        GraphQL: {
          endpoint: 'https://test-api.appsync-api.us-east-1.amazonaws.com/graphql',
          region: 'us-east-1',
          defaultAuthMode: 'userPool'
        }
      }
    });

    // Mock subscription setup
    mockSubscription.subscribe.mockImplementation((callback) => {
      subscriptionCallback = callback;
      return { unsubscribe: mockSubscription.unsubscribe };
    });

    mockClient.graphql.mockImplementation((request) => {
      if (request.query.includes('onFitShowScoreCreated') || 
          request.query.includes('onFitShowScoreUpdated')) {
        return mockSubscription;
      }
      return Promise.resolve({ data: {} });
    });
  });

  describe('Real-time Score Updates', () => {
    test('should receive real-time score creation updates', async () => {
      mockClient.graphql.mockResolvedValue({
        data: { listFitShowScores: { items: [] } }
      });

      render(
        <BrowserRouter>
          <FitShowScoreLeaderboard />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Fit and Show Leaderboard')).toBeInTheDocument();
      });

      // Simulate real-time score creation
      act(() => {
        subscriptionCallback({
          data: {
            onFitShowScoreCreated: mockFitShowScore
          }
        });
      });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('85')).toBeInTheDocument();
      });
    });

    test('should receive real-time score update notifications', async () => {
      const updatedScore = {
        ...mockFitShowScore,
        totalScore: 92,
        updatedAt: '2024-01-15T10:30:00Z'
      };

      render(
        <BrowserRouter>
          <FitShowScoreNotifications />
        </BrowserRouter>
      );

      // Simulate real-time score update
      act(() => {
        subscriptionCallback({
          data: {
            onFitShowScoreUpdated: updatedScore
          }
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/score updated.*john doe.*92/i)).toBeInTheDocument();
      });

      // Verify notification auto-dismisses
      await waitFor(() => {
        expect(screen.queryByText(/score updated/i)).not.toBeInTheDocument();
      }, { timeout: 6000 });
    });

    test('should handle multiple concurrent score updates', async () => {
      const scores = [
        { ...mockFitShowScore, id: 'score-1', participantName: 'Alice', totalScore: 88 },
        { ...mockFitShowScore, id: 'score-2', participantName: 'Bob', totalScore: 91 },
        { ...mockFitShowScore, id: 'score-3', participantName: 'Carol', totalScore: 87 }
      ];

      mockClient.graphql.mockResolvedValue({
        data: { listFitShowScores: { items: [] } }
      });

      render(
        <BrowserRouter>
          <FitShowScoreLeaderboard />
        </BrowserRouter>
      );

      // Simulate rapid concurrent updates
      act(() => {
        scores.forEach((score, index) => {
          setTimeout(() => {
            subscriptionCallback({
              data: {
                onFitShowScoreCreated: score
              }
            });
          }, index * 100);
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
        expect(screen.getByText('Carol')).toBeInTheDocument();
      });

      // Verify scores are sorted correctly
      const scoreElements = screen.getAllByText(/\d{2}/);
      const displayedScores = scoreElements.map(el => parseInt(el.textContent || '0'));
      expect(displayedScores).toEqual([91, 88, 87]); // Sorted descending
    });
  });

  describe('Subscription Management', () => {
    test('should properly establish and clean up subscriptions', async () => {
      const { unmount } = render(
        <BrowserRouter>
          <FitShowScoreNotifications />
        </BrowserRouter>
      );

      // Verify subscription was established
      expect(mockClient.graphql).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('onFitShowScoreCreated')
        })
      );

      expect(mockClient.graphql).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('onFitShowScoreUpdated')
        })
      );

      // Unmount component
      unmount();

      // Verify subscriptions were cleaned up
      expect(mockSubscription.unsubscribe).toHaveBeenCalledTimes(2);
    });

    test('should handle subscription errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation();
      
      mockClient.graphql.mockRejectedValue(new Error('Subscription failed'));

      render(
        <BrowserRouter>
          <FitShowScoreNotifications />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Error setting up fit and show score subscriptions:',
          expect.any(Error)
        );
      });

      consoleError.mockRestore();
    });

    test('should reconnect subscriptions after network recovery', async () => {
      let reconnectCallback: () => void;

      // Mock network status
      const mockNetworkStatus = {
        online: true,
        addEventListener: vi.fn((event, callback) => {
          if (event === 'online') {
            reconnectCallback = callback;
          }
        }),
        removeEventListener: vi.fn()
      };

      Object.defineProperty(window, 'navigator', {
        value: { onLine: true },
        writable: true
      });

      Object.defineProperty(window, 'addEventListener', {
        value: mockNetworkStatus.addEventListener,
        writable: true
      });

      render(
        <BrowserRouter>
          <FitShowScoreNotifications />
        </BrowserRouter>
      );

      // Simulate network disconnection
      mockClient.graphql.mockRejectedValue(new Error('Network error'));
      
      // Simulate network reconnection
      mockClient.graphql.mockResolvedValue(mockSubscription);
      
      act(() => {
        reconnectCallback();
      });

      await waitFor(() => {
        expect(mockClient.graphql).toHaveBeenCalledWith(
          expect.objectContaining({
            query: expect.stringContaining('onFitShowScoreCreated')
          })
        );
      });
    });
  });

  describe('Real-time Form Updates', () => {
    test('should show optimistic updates during score submission', async () => {
      mockClient.graphql
        .mockResolvedValueOnce({
          data: { getCat: { id: 'cat-123', name: 'Fluffy', ownerName: 'John Doe' } }
        })
        .mockImplementation(() => new Promise(resolve => {
          setTimeout(() => resolve({ data: { createFitShowScore: mockFitShowScore } }), 1000);
        }));

      render(
        <BrowserRouter>
          <FitShowScoringPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Fit and Show Scoring')).toBeInTheDocument();
      });

      // Fill out form
      const attireInput = screen.getByLabelText(/neat.*clean.*appropriate attire/i);
      fireEvent.change(attireInput, { target: { value: '8' } });

      // Submit form
      const saveButton = screen.getByRole('button', { name: /save score/i });
      fireEvent.click(saveButton);

      // Verify optimistic update shows immediately
      expect(screen.getByText(/saving/i)).toBeInTheDocument();
      expect(saveButton).toBeDisabled();

      // Wait for actual response
      await waitFor(() => {
        expect(screen.getByText(/score saved/i)).toBeInTheDocument();
        expect(saveButton).not.toBeDisabled();
      }, { timeout: 2000 });
    });

    test('should handle concurrent editing conflicts', async () => {
      const conflictingScore = {
        ...mockFitShowScore,
        totalScore: 90,
        updatedAt: '2024-01-15T10:35:00Z'
      };

      mockClient.graphql
        .mockResolvedValueOnce({
          data: { getCat: { id: 'cat-123', name: 'Fluffy', ownerName: 'John Doe' } }
        })
        .mockResolvedValueOnce({
          data: { getFitShowScore: mockFitShowScore }
        });

      render(
        <BrowserRouter>
          <FitShowScoringPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Fit and Show Scoring')).toBeInTheDocument();
      });

      // Simulate another judge updating the score
      act(() => {
        subscriptionCallback({
          data: {
            onFitShowScoreUpdated: conflictingScore
          }
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/score has been updated by another judge/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
      });
    });
  });

  describe('Performance with Real-time Updates', () => {
    test('should handle high-frequency updates efficiently', async () => {
      const performanceStart = performance.now();
      
      mockClient.graphql.mockResolvedValue({
        data: { listFitShowScores: { items: [] } }
      });

      render(
        <BrowserRouter>
          <FitShowScoreLeaderboard />
        </BrowserRouter>
      );

      // Simulate 50 rapid updates
      const updates = Array.from({ length: 50 }, (_, i) => ({
        ...mockFitShowScore,
        id: `score-${i}`,
        participantName: `Participant ${i}`,
        totalScore: 80 + i
      }));

      act(() => {
        updates.forEach((score, index) => {
          setTimeout(() => {
            subscriptionCallback({
              data: {
                onFitShowScoreCreated: score
              }
            });
          }, index * 10); // 10ms intervals
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Participant 49')).toBeInTheDocument();
      }, { timeout: 2000 });

      const performanceEnd = performance.now();
      const duration = performanceEnd - performanceStart;

      // Should handle 50 updates in under 2 seconds
      expect(duration).toBeLessThan(2000);
    });

    test('should throttle excessive updates to prevent UI freezing', async () => {
      const renderSpy = vi.spyOn(React, 'useState');
      
      mockClient.graphql.mockResolvedValue({
        data: { listFitShowScores: { items: [] } }
      });

      render(
        <BrowserRouter>
          <FitShowScoreLeaderboard />
        </BrowserRouter>
      );

      // Simulate 100 very rapid updates (1ms intervals)
      const updates = Array.from({ length: 100 }, (_, i) => ({
        ...mockFitShowScore,
        id: `score-${i}`,
        totalScore: 80 + i
      }));

      act(() => {
        updates.forEach((score, index) => {
          setTimeout(() => {
            subscriptionCallback({
              data: {
                onFitShowScoreCreated: score
              }
            });
          }, index);
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/score-\d+/)).toBeInTheDocument();
      });

      // Should not cause excessive re-renders
      const renderCalls = renderSpy.mock.calls.length;
      expect(renderCalls).toBeLessThan(200); // Reasonable threshold

      renderSpy.mockRestore();
    });
  });
});