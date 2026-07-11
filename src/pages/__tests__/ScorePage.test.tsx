import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { getCurrentUser } from 'aws-amplify/auth';
import ScorePage from '../ScorePage';
import type { MockedFunction, Mock } from 'vitest';

// Mock AWS Amplify
const mockGraphql = vi.fn();

vi.mock('aws-amplify/api', () => ({
  generateClient: () => ({
    graphql: (...args: unknown[]) => mockGraphql(...args),
  }),
}));

vi.mock('aws-amplify/auth', () => ({
  getCurrentUser: vi.fn(),
}));

const mockGetCurrentUser = getCurrentUser as MockedFunction<typeof getCurrentUser>;

// Mock the ScoringForm component
vi.mock('../../components/ScoringForm', () => {
  return {
    default: function MockScoringForm({ catId, existingScore, onSave, onSubmit, loading }: any) {
    return (
      <div data-testid="scoring-form">
        <div>Cat ID: {catId}</div>
        <div>Loading: {loading ? 'true' : 'false'}</div>
        <div>Has existing score: {existingScore ? 'true' : 'false'}</div>
        <button onClick={() => onSave({ catId, cageConditionScore: 20 })}>
          Save Draft
        </button>
        <button onClick={() => onSubmit({ catId, cageConditionScore: 20 })}>
          Submit Score
        </button>
      </div>
    );
    }
  };
});



const mockUser = {
  userId: 'judge-123',
  username: 'testjudge',
};

const mockCat = {
  id: 'cat-123',
  name: 'Fluffy',
  owner: 'John Doe',
  cageNumber: 5,
  votes: 10,
};

const mockScore = {
  id: 'score-123',
  catId: 'cat-123',
  judgeId: 'judge-123',
  judgeName: 'Test Judge',
  cageConditionScore: 20,
  cageConditionComments: 'Good condition',
  catConditionScore: 22,
  catConditionComments: 'Healthy cat',
  groomingScore: 18,
  groomingComments: 'Well groomed',
  overallScore: 21,
  overallComments: 'Great presentation',
  totalScore: 81,
  timestamp: '2024-01-01T12:00:00Z',
  isFinalized: false,
};

describe('ScorePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(mockUser as any);
    
    // Reset the mock implementation
    mockGraphql.mockImplementation((params) => {
      if (params.query && params.query.includes('subscription')) {
        return {
          subscribe: vi.fn(() => ({
            unsubscribe: vi.fn(),
          })),
        };
      }
      return Promise.resolve({ data: {} });
    });
  });

  const renderScorePage = (cageNumber: string = '5') => {
    return render(
      <MemoryRouter initialEntries={[`/score/${cageNumber}`]}>
        <Routes>
          <Route path="/score/:cageNumber" element={<ScorePage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  describe('Loading State', () => {
    it('should show loading state initially', () => {
      mockGraphql.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      renderScorePage();
      
      expect(screen.getByText('Loading scoring page...')).toBeInTheDocument();
      expect(screen.getByText('🐱')).toBeInTheDocument();
    });
  });

  describe('Authentication', () => {
    it('should show error when user is not authenticated', async () => {
      mockGetCurrentUser.mockRejectedValue(new Error('Not authenticated'));
      
      renderScorePage();
      
      await waitFor(() => {
        expect(screen.getByText('❌ Error')).toBeInTheDocument();
        expect(screen.getByText('Authentication required. Please log in.')).toBeInTheDocument();
      });
    });
  });

  describe('Invalid Cage Number', () => {
    it('should show error for invalid cage number', async () => {
      renderScorePage('invalid');
      
      await waitFor(() => {
        expect(screen.getByText('❌ Error')).toBeInTheDocument();
        expect(screen.getByText('Invalid cage number provided.')).toBeInTheDocument();
      });
    });

    it('should show error for missing cage number', async () => {
      render(
        <MemoryRouter initialEntries={['/score/']}>
          <Routes>
            <Route path="/score/:cageNumber?" element={<ScorePage />} />
          </Routes>
        </MemoryRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText('❌ Error')).toBeInTheDocument();
        expect(screen.getByText('Invalid cage number provided.')).toBeInTheDocument();
      });
    });
  });

  describe('Cat Not Found', () => {
    it('should show error when cat is not found in cage', async () => {
      mockGraphql.mockResolvedValueOnce({
        data: { getCatByCage: null }
      });
      
      renderScorePage('99');
      
      await waitFor(() => {
        expect(screen.getByText('🔍 Cage Empty')).toBeInTheDocument();
        expect(screen.getByText('No cat found in cage 99.')).toBeInTheDocument();
      });
    });
  });

  describe('Successful Loading', () => {
    beforeEach(() => {
      mockGraphql
        .mockResolvedValueOnce({
          data: { getCatByCage: mockCat }
        })
        .mockResolvedValueOnce({
          data: { getScoresByCat: { items: [] } }
        });
    });

    it('should display cat information correctly', async () => {
      renderScorePage();
      
      await waitFor(() => {
        expect(screen.getByText('🏆 4H Cat Scoring 🏆')).toBeInTheDocument();
        expect(screen.getByText('🐱 Cat Information')).toBeInTheDocument();
        expect(screen.getByText('Fluffy')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
      });
    });

    it('should display judge information', async () => {
      renderScorePage();
      
      await waitFor(() => {
        expect(screen.getByText('👨‍⚖️ Judge Information')).toBeInTheDocument();
        expect(screen.getByText(/Judge:.*testjudge/)).toBeInTheDocument();
        expect(screen.getByText(/Scoring Time:/)).toBeInTheDocument();
      });
    });

    it('should render scoring form with correct props', async () => {
      renderScorePage();
      
      await waitFor(() => {
        expect(screen.getByTestId('scoring-form')).toBeInTheDocument();
        expect(screen.getByText('Cat ID: cat-123')).toBeInTheDocument();
        expect(screen.getByText('Loading: false')).toBeInTheDocument();
        expect(screen.getByText('Has existing score: false')).toBeInTheDocument();
      });
    });
  });

  describe('Existing Score', () => {
    beforeEach(() => {
      mockGraphql
        .mockResolvedValueOnce({
          data: { getCatByCage: mockCat }
        })
        .mockResolvedValueOnce({
          data: { getScoresByCat: { items: [mockScore] } }
        });
    });

    it('should show existing score warning', async () => {
      renderScorePage();
      
      await waitFor(() => {
        expect(screen.getByText(/You have already scored this cat/)).toBeInTheDocument();
        expect(screen.getByText(/You can modify your draft score below/)).toBeInTheDocument();
      });
    });

    it('should pass existing score to scoring form', async () => {
      renderScorePage();
      
      await waitFor(() => {
        expect(screen.getByText('Has existing score: true')).toBeInTheDocument();
      });
    });
  });

  describe('Finalized Score', () => {
    beforeEach(() => {
      const finalizedScore = { ...mockScore, isFinalized: true };
      mockGraphql
        .mockResolvedValueOnce({
          data: { getCatByCage: mockCat }
        })
        .mockResolvedValueOnce({
          data: { getScoresByCat: { items: [finalizedScore] } }
        });
    });

    it('should show finalized score message', async () => {
      renderScorePage();
      
      await waitFor(() => {
        expect(screen.getByText(/Your score has been finalized/)).toBeInTheDocument();
      });
    });
  });

  describe('Score Operations', () => {
    beforeEach(() => {
      mockGraphql
        .mockResolvedValueOnce({
          data: { getCatByCage: mockCat }
        })
        .mockResolvedValueOnce({
          data: { getScoresByCat: { items: [] } }
        });
    });

    it('should handle save operation', async () => {
      mockGraphql.mockResolvedValueOnce({
        data: { createScore: mockScore }
      });

      renderScorePage();
      
      await waitFor(() => {
        expect(screen.getByTestId('scoring-form')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save Draft');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockGraphql).toHaveBeenCalledWith({
          query: expect.stringContaining('createScore'),
          variables: {
            input: {
              catId: 'cat-123',
              cageConditionScore: 20
            }
          }
        });
      });
    });

    it('should handle submit operation and navigate', async () => {
      const mockNavigate = vi.fn();
      vi.doMock('react-router-dom', async () => ({
        ...(await vi.importActual('react-router-dom')),
        useNavigate: () => mockNavigate,
      }));

      mockGraphql.mockResolvedValueOnce({
        data: { createScore: { ...mockScore, isFinalized: true } }
      });

      renderScorePage();
      
      await waitFor(() => {
        expect(screen.getByTestId('scoring-form')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('Submit Score');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockGraphql).toHaveBeenCalledWith({
          query: expect.stringContaining('createScore'),
          variables: {
            input: {
              catId: 'cat-123',
              cageConditionScore: 20,
              isFinalized: true
            }
          }
        });
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockGraphql
        .mockResolvedValueOnce({
          data: { getCatByCage: mockCat }
        })
        .mockResolvedValueOnce({
          data: { getScoresByCat: { items: [] } }
        });
    });

    it('should handle GraphQL errors during initialization', async () => {
      mockGraphql.mockRejectedValueOnce(new Error('GraphQL Error'));
      
      renderScorePage();
      
      await waitFor(() => {
        expect(screen.getByText('❌ Error')).toBeInTheDocument();
        expect(screen.getByText('Failed to load scoring page. Please try again.')).toBeInTheDocument();
      });
    });

    it('should handle save errors', async () => {
      renderScorePage();
      
      await waitFor(() => {
        expect(screen.getByTestId('scoring-form')).toBeInTheDocument();
      });

      mockGraphql.mockRejectedValueOnce(new Error('Save failed'));

      const saveButton = screen.getByText('Save Draft');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to save score. Please try again.')).toBeInTheDocument();
      });
    });

    it('should handle submit errors', async () => {
      renderScorePage();
      
      await waitFor(() => {
        expect(screen.getByTestId('scoring-form')).toBeInTheDocument();
      });

      mockGraphql.mockRejectedValueOnce(new Error('Submit failed'));

      const submitButton = screen.getByText('Submit Score');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to submit score. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should have back to dashboard button', async () => {
      mockGraphql
        .mockResolvedValueOnce({
          data: { getCatByCage: mockCat }
        })
        .mockResolvedValueOnce({
          data: { getScoresByCat: { items: [] } }
        });

      renderScorePage();
      
      await waitFor(() => {
        expect(screen.getByText('← Back to Dashboard')).toBeInTheDocument();
      });
    });

    it('should have return to dashboard button on error pages', async () => {
      mockGraphql.mockResolvedValueOnce({
        data: { getCatByCage: null }
      });
      
      renderScorePage();
      
      await waitFor(() => {
        expect(screen.getByText('Return to Dashboard')).toBeInTheDocument();
      });
    });
  });
});