import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { generateClient } from 'aws-amplify/api';
import ParticipantScorePage from '../ParticipantScorePage';
import type { MockedFunction, Mock } from 'vitest';

// Mock AWS Amplify
const mockGraphql = vi.fn();

vi.mock('aws-amplify/api', () => ({
  generateClient: vi.fn(),
}));

const mockGenerateClient = generateClient as MockedFunction<typeof generateClient>;

// Mock the ParticipantScoreView component
vi.mock('../../components/ParticipantScoreView', () => {
  return {
    default: function MockParticipantScoreView({ catId, scores, cat, allScores, loading, error }: any) {
    if (loading) return <div>Loading scores...</div>;
    if (error) return <div>Error: {error}</div>;
    return (
      <div data-testid="participant-score-view">
        <div>Cat: {cat?.name}</div>
        <div>Scores: {scores?.length || 0}</div>
        <div>All Scores: {allScores?.length || 0}</div>
      </div>
    );
    }
  };
});

// Mock react-router-dom hooks
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => mockNavigate,
  useParams: () => ({ catId: 'test-cat-id' })
}));



// Set up the mock client before the module is imported
const mockClient = {
  graphql: mockGraphql,
};
mockGenerateClient.mockReturnValue(mockClient as any);

describe('ParticipantScorePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
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

  const mockCatData = {
    getCat: {
      id: 'test-cat-id',
      name: 'Test Cat',
      owner: 'Test Owner',
      cageNumber: 5,
      votes: 10
    }
  };

  const mockScoresData = {
    getScoresByCat: {
      items: [
        {
          id: 'score-1',
          catId: 'test-cat-id',
          judgeId: 'judge-1',
          judgeName: 'Judge Smith',
          cageConditionScore: 20,
          catConditionScore: 22,
          groomingScore: 18,
          overallScore: 23,
          totalScore: 83,
          timestamp: '2024-01-15T10:30:00Z',
          isFinalized: true
        }
      ]
    }
  };

  const mockAllScoresData = {
    listAllScores: {
      items: [
        {
          id: 'score-1',
          catId: 'test-cat-id',
          totalScore: 83,
          isFinalized: true
        },
        {
          id: 'score-2',
          catId: 'other-cat',
          totalScore: 90,
          isFinalized: true
        }
      ]
    }
  };

  it('renders loading state initially', () => {
    mockGraphql.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <MemoryRouter>
        <ParticipantScorePage />
      </MemoryRouter>
    );

    expect(screen.getByText('Loading scores...')).toBeInTheDocument();
  });

  it('fetches and displays cat data and scores successfully', async () => {
    mockGraphql
      .mockResolvedValueOnce({ data: mockCatData })
      .mockResolvedValueOnce({ data: mockScoresData })
      .mockResolvedValueOnce({ data: mockAllScoresData });

    render(
      <MemoryRouter>
        <ParticipantScorePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('participant-score-view')).toBeInTheDocument();
    });

    expect(screen.getByText('Cat: Test Cat')).toBeInTheDocument();
    expect(screen.getByText('Scores: 1')).toBeInTheDocument();
    expect(screen.getByText('All Scores: 2')).toBeInTheDocument();
  });

  it('handles cat not found error', async () => {
    mockGraphql.mockResolvedValueOnce({ data: { getCat: null } });

    render(
      <MemoryRouter>
        <ParticipantScorePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Error: Cat not found')).toBeInTheDocument();
    });
  });

  it('handles GraphQL errors gracefully', async () => {
    mockGraphql.mockRejectedValueOnce(new Error('Network error'));

    render(
      <MemoryRouter>
        <ParticipantScorePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Error: Network error')).toBeInTheDocument();
    });
  });

  it('continues without ranking data if all scores fetch fails', async () => {
    mockGraphql
      .mockResolvedValueOnce({ data: mockCatData })
      .mockResolvedValueOnce({ data: mockScoresData })
      .mockRejectedValueOnce(new Error('Failed to fetch all scores'));

    // Mock console.warn to avoid test output noise
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();

    render(
      <MemoryRouter>
        <ParticipantScorePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('participant-score-view')).toBeInTheDocument();
    });

    expect(screen.getByText('Cat: Test Cat')).toBeInTheDocument();
    expect(screen.getByText('Scores: 1')).toBeInTheDocument();
    expect(screen.getByText('All Scores: 0')).toBeInTheDocument();

    expect(consoleSpy).toHaveBeenCalledWith(
      'Could not fetch all scores for ranking:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('renders page header and navigation correctly', async () => {
    mockGraphql
      .mockResolvedValueOnce({ data: mockCatData })
      .mockResolvedValueOnce({ data: mockScoresData })
      .mockResolvedValueOnce({ data: mockAllScoresData });

    render(
      <MemoryRouter>
        <ParticipantScorePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Cat Scores')).toBeInTheDocument();
    });

    expect(screen.getByText('← Back to Home')).toBeInTheDocument();
    expect(screen.getByText('Questions about your scores? Contact the 4H organizers for more information.')).toBeInTheDocument();
  });

  it('navigates back to home when back button is clicked', async () => {
    mockGraphql
      .mockResolvedValueOnce({ data: mockCatData })
      .mockResolvedValueOnce({ data: mockScoresData })
      .mockResolvedValueOnce({ data: mockAllScoresData });

    render(
      <MemoryRouter>
        <ParticipantScorePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('← Back to Home')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('← Back to Home'));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('makes correct GraphQL queries', async () => {
    mockGraphql
      .mockResolvedValueOnce({ data: mockCatData })
      .mockResolvedValueOnce({ data: mockScoresData })
      .mockResolvedValueOnce({ data: mockAllScoresData });

    render(
      <MemoryRouter>
        <ParticipantScorePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockGraphql).toHaveBeenCalledTimes(3);
    });

    // Check getCat query
    expect(mockGraphql).toHaveBeenNthCalledWith(1, {
      query: expect.stringContaining('query GetCat'),
      variables: { id: 'test-cat-id' }
    });

    // Check getScoresByCat query
    expect(mockGraphql).toHaveBeenNthCalledWith(2, {
      query: expect.stringContaining('query GetScoresByCat'),
      variables: { catId: 'test-cat-id' }
    });

    // Check listAllScores query
    expect(mockGraphql).toHaveBeenNthCalledWith(3, {
      query: expect.stringContaining('query ListAllScores')
    });
  });
});

// Test with missing catId parameter
describe('ParticipantScorePage without catId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles missing catId parameter', async () => {
    // Mock useParams to return undefined catId
    vi.doMock('react-router-dom', async () => ({
      ...(await vi.importActual('react-router-dom')),
      useNavigate: () => mockNavigate,
      useParams: () => ({ catId: undefined })
    }));

    const ParticipantScorePageWithoutId = (await import('../ParticipantScorePage')).default;

    render(
      <MemoryRouter>
        <ParticipantScorePageWithoutId />
      </MemoryRouter>
    );

    expect(screen.getByText('Invalid Cat ID')).toBeInTheDocument();
    expect(screen.getByText('Please provide a valid cat ID to view scores.')).toBeInTheDocument();
    expect(screen.getByText('Back to Home')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Back to Home'));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});