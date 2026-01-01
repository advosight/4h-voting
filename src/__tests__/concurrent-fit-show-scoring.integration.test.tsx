import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import FitShowScoringPage from '../pages/FitShowScoringPage';
import FitShowScoreReports from '../components/FitShowScoreReports';

// Mock AWS Amplify
jest.mock('aws-amplify/api');

const mockClient = {
  graphql: jest.fn(),
  cancel: jest.fn(),
};

(generateClient as jest.Mock).mockReturnValue(mockClient);

// Mock multiple judges
const judges = [
  { id: 'judge-1', name: 'Judge Smith', role: 'fitShowJudge' },
  { id: 'judge-2', name: 'Judge Johnson', role: 'fitShowJudge' },
  { id: 'judge-3', name: 'Judge Williams', role: 'fitShowJudge' }
];

const mockCat = {
  id: 'cat-123',
  name: 'Fluffy',
  ownerName: 'John Doe',
  cageNumber: 5
};

const createMockScore = (judgeId: string, judgeName: string, totalScore: number) => ({
  id: `score-${judgeId}`,
  catId: 'cat-123',
  participantName: 'John Doe',
  judgeId,
  judgeName,
  attire: 8,
  attentive: 4,
  courteous: 5,
  controlEquipment: 7,
  pickupCarrying: 3,
  showingHeadShape: 3,
  showingBodyType: 4,
  showingTail: 3,
  showingCoatTexture: 4,
  showingMouthTeethGums: 2,
  conditionMouthTeethGums: 2,
  showingNose: 2,
  showingEyes: 2,
  conditionNoseEyes: 2,
  showingEars: 2,
  earsClean: 2,
  showingToenailsClaws: 2,
  toenailsClipped: 5,
  showingBellyCoatCleanliness: 3,
  coatCleanWellGroomed: 7,
  catHealthCare: 3,
  generalKnowledge: 3,
  catBreedsShowing: 3,
  catAnatomy: 3,
  fourHKnowledge: 3,
  totalScore,
  appearanceTotal: 17,
  handlingTotal: 10,
  demonstrationTotal: 14,
  healthExaminationTotal: 19,
  groomingCareTotal: 13,
  knowledgeTotal: 12,
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
  isFinalized: false
});

describe('Concurrent Fit and Show Scoring Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    Amplify.configure({
      API: {
        GraphQL: {
          endpoint: 'https://test-api.appsync-api.us-east-1.amazonaws.com/graphql',
          region: 'us-east-1',
          defaultAuthMode: 'userPool'
        }
      }
    });
  });

  describe('Multiple Judges Scoring Same Participant', () => {
    test('should handle multiple judges scoring the same participant simultaneously', async () => {
      const scores = judges.map((judge, index) => 
        createMockScore(judge.id, judge.name, 85 + index)
      );

      // Mock concurrent score creation
      mockClient.graphql
        .mockResolvedValueOnce({ data: { getCat: mockCat } })
        .mockResolvedValueOnce({ data: { createFitShowScore: scores[0] } })
        .mockResolvedValueOnce({ data: { createFitShowScore: scores[1] } })
        .mockResolvedValueOnce({ data: { createFitShowScore: scores[2] } });

      // Simulate three judges scoring simultaneously
      const judgeComponents = judges.map((judge, index) => (
        <div key={judge.id} data-testid={`judge-${index}`}>
          <BrowserRouter>
            <FitShowScoringPage judgeId={judge.id} />
          </BrowserRouter>
        </div>
      ));

      const { container } = render(<div>{judgeComponents}</div>);

      // Wait for all components to load
      await waitFor(() => {
        judges.forEach((_, index) => {
          expect(container.querySelector(`[data-testid="judge-${index}"]`)).toBeInTheDocument();
        });
      });

      // Simulate concurrent scoring
      const promises = judges.map(async (judge, index) => {
        const judgeContainer = container.querySelector(`[data-testid="judge-${index}"]`);
        const attireInput = judgeContainer?.querySelector('input[name="attire"]') as HTMLInputElement;
        const saveButton = judgeContainer?.querySelector('button[type="submit"]') as HTMLButtonElement;

        if (attireInput && saveButton) {
          fireEvent.change(attireInput, { target: { value: '8' } });
          fireEvent.click(saveButton);
        }
      });

      await Promise.all(promises);

      // Verify all scores were created
      expect(mockClient.graphql).toHaveBeenCalledTimes(4); // 1 getCat + 3 createFitShowScore
    });

    test('should prevent duplicate scoring by same judge', async () => {
      const existingScore = createMockScore('judge-1', 'Judge Smith', 85);

      mockClient.graphql
        .mockResolvedValueOnce({ data: { getCat: mockCat } })
        .mockResolvedValueOnce({ 
          data: { getFitShowScoresByCat: [existingScore] }
        });

      render(
        <BrowserRouter>
          <FitShowScoringPage judgeId="judge-1" />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/you have already scored this participant/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /edit existing score/i })).toBeInTheDocument();
      });

      // Verify new score creation is blocked
      expect(screen.queryByRole('button', { name: /save score/i })).not.toBeInTheDocument();
    });

    test('should handle concurrent score modifications with optimistic locking', async () => {
      const originalScore = createMockScore('judge-1', 'Judge Smith', 85);
      const updatedScore1 = { ...originalScore, totalScore: 88, updatedAt: '2024-01-15T10:30:00Z' };
      const updatedScore2 = { ...originalScore, totalScore: 90, updatedAt: '2024-01-15T10:35:00Z' };

      mockClient.graphql
        .mockResolvedValueOnce({ data: { getCat: mockCat } })
        .mockResolvedValueOnce({ data: { getFitShowScore: originalScore } })
        .mockResolvedValueOnce({ data: { updateFitShowScore: updatedScore1 } })
        .mockRejectedValueOnce(new Error('ConditionalCheckFailedException: Score was modified by another user'));

      const { rerender } = render(
        <BrowserRouter>
          <FitShowScoringPage scoreId={originalScore.id} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('8')).toBeInTheDocument(); // attire score
      });

      // First judge modifies score
      const attireInput = screen.getByLabelText(/neat.*clean.*appropriate attire/i);
      fireEvent.change(attireInput, { target: { value: '9' } });

      const saveButton = screen.getByRole('button', { name: /save score/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/score updated/i)).toBeInTheDocument();
      });

      // Second judge tries to modify the same score (should fail)
      rerender(
        <BrowserRouter>
          <FitShowScoringPage scoreId={originalScore.id} />
        </BrowserRouter>
      );

      fireEvent.change(attireInput, { target: { value: '10' } });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/score was modified by another user/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /reload latest version/i })).toBeInTheDocument();
      });
    });
  });

  describe('Concurrent Scoring Performance', () => {
    test('should handle high concurrent load without performance degradation', async () => {
      const participantCount = 20;
      const judgeCount = 5;
      
      const participants = Array.from({ length: participantCount }, (_, i) => ({
        id: `cat-${i}`,
        name: `Cat ${i}`,
        ownerName: `Owner ${i}`,
        cageNumber: i + 1
      }));

      const scores = [];
      for (let p = 0; p < participantCount; p++) {
        for (let j = 0; j < judgeCount; j++) {
          scores.push(createMockScore(`judge-${j}`, `Judge ${j}`, 80 + Math.random() * 20));
        }
      }

      mockClient.graphql.mockResolvedValue({
        data: { listFitShowScores: { items: scores } }
      });

      const startTime = performance.now();

      render(
        <BrowserRouter>
          <FitShowScoreReports />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Fit and Show Scoring Reports')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // Should load 100 scores in under 2 seconds
      expect(loadTime).toBeLessThan(2000);

      // Verify all scores are displayed
      expect(screen.getAllByText(/Owner \d+/)).toHaveLength(participantCount);
    });

    test('should handle concurrent real-time updates efficiently', async () => {
      const updateCount = 50;
      const updates = Array.from({ length: updateCount }, (_, i) => 
        createMockScore(`judge-${i % 5}`, `Judge ${i % 5}`, 80 + i)
      );

      mockClient.graphql.mockResolvedValue({
        data: { listFitShowScores: { items: [] } }
      });

      const mockSubscription = {
        subscribe: jest.fn((callback) => {
          // Simulate rapid updates
          updates.forEach((score, index) => {
            setTimeout(() => {
              callback({
                data: { onFitShowScoreCreated: score }
              });
            }, index * 20); // 20ms intervals
          });
          
          return { unsubscribe: jest.fn() };
        })
      };

      mockClient.graphql.mockReturnValue(mockSubscription);

      const startTime = performance.now();

      render(
        <BrowserRouter>
          <FitShowScoreReports />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Judge \d+/)).toHaveLength(5);
      }, { timeout: 3000 });

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Should process 50 real-time updates in under 3 seconds
      expect(processingTime).toBeLessThan(3000);
    });
  });

  describe('Concurrent Data Consistency', () => {
    test('should maintain data consistency across concurrent operations', async () => {
      const baseScore = createMockScore('judge-1', 'Judge Smith', 85);
      
      // Simulate concurrent read and write operations
      mockClient.graphql
        .mockResolvedValueOnce({ data: { getFitShowScore: baseScore } })
        .mockResolvedValueOnce({ 
          data: { 
            updateFitShowScore: { ...baseScore, totalScore: 88, updatedAt: '2024-01-15T10:30:00Z' }
          }
        })
        .mockResolvedValueOnce({ data: { getFitShowScore: baseScore } })
        .mockResolvedValueOnce({
          data: {
            updateFitShowScore: { ...baseScore, totalScore: 90, updatedAt: '2024-01-15T10:35:00Z' }
          }
        });

      // First component reads and updates
      const { rerender } = render(
        <BrowserRouter>
          <FitShowScoringPage scoreId={baseScore.id} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('8')).toBeInTheDocument();
      });

      // Update score
      const attireInput = screen.getByLabelText(/neat.*clean.*appropriate attire/i);
      fireEvent.change(attireInput, { target: { value: '9' } });
      fireEvent.click(screen.getByRole('button', { name: /save score/i }));

      await waitFor(() => {
        expect(screen.getByText(/score updated/i)).toBeInTheDocument();
      });

      // Second component reads the updated version
      rerender(
        <BrowserRouter>
          <FitShowScoringPage scoreId={baseScore.id} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('9')).toBeInTheDocument();
      });
    });

    test('should handle concurrent finalization attempts', async () => {
      const score = createMockScore('judge-1', 'Judge Smith', 85);
      const finalizedScore = { ...score, isFinalized: true };

      mockClient.graphql
        .mockResolvedValueOnce({ data: { getFitShowScore: score } })
        .mockResolvedValueOnce({ data: { updateFitShowScore: finalizedScore } })
        .mockRejectedValueOnce(new Error('Score already finalized'));

      render(
        <BrowserRouter>
          <FitShowScoringPage scoreId={score.id} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /finalize score/i })).toBeInTheDocument();
      });

      // First finalization attempt succeeds
      fireEvent.click(screen.getByRole('button', { name: /finalize score/i }));

      await waitFor(() => {
        expect(screen.getByText(/score finalized/i)).toBeInTheDocument();
      });

      // Second finalization attempt should be prevented
      expect(screen.queryByRole('button', { name: /finalize score/i })).not.toBeInTheDocument();
    });
  });

  describe('Concurrent Error Handling', () => {
    test('should handle network errors during concurrent operations', async () => {
      mockClient.graphql
        .mockResolvedValueOnce({ data: { getCat: mockCat } })
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockResolvedValueOnce({ 
          data: { createFitShowScore: createMockScore('judge-1', 'Judge Smith', 85) }
        });

      render(
        <BrowserRouter>
          <FitShowScoringPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Fit and Show Scoring')).toBeInTheDocument();
      });

      // Fill form and attempt to save (will fail)
      const attireInput = screen.getByLabelText(/neat.*clean.*appropriate attire/i);
      fireEvent.change(attireInput, { target: { value: '8' } });
      fireEvent.click(screen.getByRole('button', { name: /save score/i }));

      await waitFor(() => {
        expect(screen.getByText(/network timeout/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });

      // Retry (will fail again)
      fireEvent.click(screen.getByRole('button', { name: /retry/i }));

      await waitFor(() => {
        expect(screen.getByText(/service unavailable/i)).toBeInTheDocument();
      });

      // Third retry succeeds
      fireEvent.click(screen.getByRole('button', { name: /retry/i }));

      await waitFor(() => {
        expect(screen.getByText(/score saved/i)).toBeInTheDocument();
      });
    });

    test('should recover gracefully from partial failures in concurrent scenarios', async () => {
      const scores = [
        createMockScore('judge-1', 'Judge Smith', 85),
        createMockScore('judge-2', 'Judge Johnson', 88),
        createMockScore('judge-3', 'Judge Williams', 90)
      ];

      mockClient.graphql
        .mockResolvedValueOnce({ data: { listFitShowScores: { items: [scores[0]] } } })
        .mockRejectedValueOnce(new Error('Partial failure'))
        .mockResolvedValueOnce({ data: { listFitShowScores: { items: scores } } });

      render(
        <BrowserRouter>
          <FitShowScoreReports />
        </BrowserRouter>
      );

      // Initial load shows partial data
      await waitFor(() => {
        expect(screen.getByText('Judge Smith')).toBeInTheDocument();
        expect(screen.queryByText('Judge Johnson')).not.toBeInTheDocument();
      });

      // Retry mechanism should recover
      await waitFor(() => {
        expect(screen.getByText('Judge Smith')).toBeInTheDocument();
        expect(screen.getByText('Judge Johnson')).toBeInTheDocument();
        expect(screen.getByText('Judge Williams')).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });
});