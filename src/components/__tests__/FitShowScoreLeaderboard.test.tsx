import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { API } from 'aws-amplify';
import FitShowScoreLeaderboard from '../FitShowScoreLeaderboard';
import type { Mocked, Mock } from 'vitest';

// Mock AWS Amplify
vi.mock('aws-amplify', () => ({
  API: {
    graphql: vi.fn(),
  },
  graphqlOperation: vi.fn((query) => query),
}));

const mockAPI = API as Mocked<typeof API>;

const mockFitShowScores = [
  {
    id: '1',
    catId: 'cat1',
    participantName: 'Alice Johnson',
    judgeId: 'judge1',
    judgeName: 'Judge Smith',
    totalScore: 85,
    appearanceTotal: 18,
    handlingTotal: 12,
    demonstrationTotal: 14,
    healthExaminationTotal: 19,
    groomingCareTotal: 12,
    knowledgeTotal: 10,
    createdAt: '2024-01-15T10:00:00Z',
    isFinalized: true,
  },
  {
    id: '2',
    catId: 'cat2',
    participantName: 'Bob Wilson',
    judgeId: 'judge2',
    judgeName: 'Judge Davis',
    totalScore: 78,
    appearanceTotal: 16,
    handlingTotal: 11,
    demonstrationTotal: 13,
    healthExaminationTotal: 17,
    groomingCareTotal: 11,
    knowledgeTotal: 10,
    createdAt: '2024-01-14T14:30:00Z',
    isFinalized: true,
  },
  {
    id: '3',
    catId: 'cat1',
    participantName: 'Alice Johnson',
    judgeId: 'judge1',
    judgeName: 'Judge Smith',
    totalScore: 92,
    appearanceTotal: 19,
    handlingTotal: 13,
    demonstrationTotal: 15,
    healthExaminationTotal: 20,
    groomingCareTotal: 13,
    knowledgeTotal: 12,
    createdAt: '2024-01-16T09:00:00Z',
    isFinalized: true,
  },
  {
    id: '4',
    catId: 'cat3',
    participantName: 'Charlie Brown',
    judgeId: 'judge3',
    judgeName: 'Judge Wilson',
    totalScore: 88,
    appearanceTotal: 17,
    handlingTotal: 12,
    demonstrationTotal: 14,
    healthExaminationTotal: 20,
    groomingCareTotal: 13,
    knowledgeTotal: 12,
    createdAt: '2024-01-17T11:00:00Z',
    isFinalized: false,
  },
];

describe('FitShowScoreLeaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    mockAPI.graphql.mockImplementation(() => new Promise(() => {}));
    
    render(<FitShowScoreLeaderboard />);
    
    expect(screen.getByText('Loading fit and show leaderboard...')).toBeInTheDocument();
  });

  it('renders leaderboard after loading', async () => {
    mockAPI.graphql.mockResolvedValue({
      data: {
        listFitShowScores: {
          items: mockFitShowScores,
          nextToken: null,
        },
      },
    });

    render(<FitShowScoreLeaderboard />);

    await waitFor(() => {
      expect(screen.getByText('Fit and Show Scoring Leaderboard')).toBeInTheDocument();
    });

    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
  });

  it('shows only finalized scores by default', async () => {
    mockAPI.graphql.mockResolvedValue({
      data: {
        listFitShowScores: {
          items: mockFitShowScores,
          nextToken: null,
        },
      },
    });

    render(<FitShowScoreLeaderboard finalizedOnly={true} />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    // Charlie Brown should not appear because his score is not finalized
    expect(screen.queryByText('Charlie Brown')).not.toBeInTheDocument();
  });

  it('shows all scores when finalizedOnly is false', async () => {
    mockAPI.graphql.mockResolvedValue({
      data: {
        listFitShowScores: {
          items: mockFitShowScores,
          nextToken: null,
        },
      },
    });

    render(<FitShowScoreLeaderboard finalizedOnly={false} />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
  });

  it('displays participants ranked by best score', async () => {
    mockAPI.graphql.mockResolvedValue({
      data: {
        listFitShowScores: {
          items: mockFitShowScores,
          nextToken: null,
        },
      },
    });

    render(<FitShowScoreLeaderboard />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    // Alice should be first with her best score of 92
    const entries = screen.getAllByText(/\/100 points/);
    expect(entries[0]).toHaveTextContent('92/100 points');
    
    // Check that Alice's entry shows "Best of 2 scores"
    expect(screen.getByText('Best of 2 scores')).toBeInTheDocument();
  });

  it('switches between best and latest score views', async () => {
    mockAPI.graphql.mockResolvedValue({
      data: {
        listFitShowScores: {
          items: mockFitShowScores,
          nextToken: null,
        },
      },
    });

    render(<FitShowScoreLeaderboard />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    // Should start in "Best Scores" mode
    expect(screen.getByText('Best Scores')).toHaveClass('active');
    expect(screen.getByText('92/100 points')).toBeInTheDocument();

    // Switch to "Latest Scores" mode
    const latestButton = screen.getByText('Latest Scores');
    fireEvent.click(latestButton);

    expect(latestButton).toHaveClass('active');
    expect(screen.queryByText('Best Scores')).not.toHaveClass('active');
  });

  it('displays correct rank indicators', async () => {
    mockAPI.graphql.mockResolvedValue({
      data: {
        listFitShowScores: {
          items: mockFitShowScores,
          nextToken: null,
        },
      },
    });

    render(<FitShowScoreLeaderboard />);

    await waitFor(() => {
      expect(screen.getByText('🥇')).toBeInTheDocument();
    });

    expect(screen.getByText('🥈')).toBeInTheDocument();
  });

  it('displays category breakdown correctly', async () => {
    mockAPI.graphql.mockResolvedValue({
      data: {
        listFitShowScores: {
          items: mockFitShowScores,
          nextToken: null,
        },
      },
    });

    render(<FitShowScoreLeaderboard />);

    await waitFor(() => {
      expect(screen.getByText('Appearance')).toBeInTheDocument();
    });

    expect(screen.getByText('Handling')).toBeInTheDocument();
    expect(screen.getByText('Demonstration')).toBeInTheDocument();
    expect(screen.getByText('Health Exam')).toBeInTheDocument();
    expect(screen.getByText('Grooming')).toBeInTheDocument();
    expect(screen.getByText('Knowledge')).toBeInTheDocument();
  });

  it('limits the number of entries shown', async () => {
    mockAPI.graphql.mockResolvedValue({
      data: {
        listFitShowScores: {
          items: mockFitShowScores,
          nextToken: null,
        },
      },
    });

    render(<FitShowScoreLeaderboard showTop={1} />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    // Should only show top 1 participant
    expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument();
  });

  it('handles ties in scoring correctly', async () => {
    const tiedScores = [
      {
        ...mockFitShowScores[0],
        totalScore: 85,
        createdAt: '2024-01-15T10:00:00Z',
      },
      {
        ...mockFitShowScores[1],
        totalScore: 85,
        createdAt: '2024-01-14T14:30:00Z',
      },
    ];

    mockAPI.graphql.mockResolvedValue({
      data: {
        listFitShowScores: {
          items: tiedScores,
          nextToken: null,
        },
      },
    });

    render(<FitShowScoreLeaderboard />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    // Both should have rank 1 (tied)
    const rankDisplays = screen.getAllByText('🥇');
    expect(rankDisplays).toHaveLength(2);
  });

  it('refreshes data when refresh button is clicked', async () => {
    mockAPI.graphql.mockResolvedValue({
      data: {
        listFitShowScores: {
          items: mockFitShowScores,
          nextToken: null,
        },
      },
    });

    render(<FitShowScoreLeaderboard />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    expect(mockAPI.graphql).toHaveBeenCalledTimes(2);
  });

  it('handles API errors gracefully', async () => {
    mockAPI.graphql.mockRejectedValue(new Error('API Error'));

    render(<FitShowScoreLeaderboard />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load fit and show scores')).toBeInTheDocument();
    });

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('shows no scores message when no data available', async () => {
    mockAPI.graphql.mockResolvedValue({
      data: {
        listFitShowScores: {
          items: [],
          nextToken: null,
        },
      },
    });

    render(<FitShowScoreLeaderboard />);

    await waitFor(() => {
      expect(screen.getByText('No fit and show scores available for leaderboard.')).toBeInTheDocument();
    });
  });

  it('displays correct participant count in footer', async () => {
    mockAPI.graphql.mockResolvedValue({
      data: {
        listFitShowScores: {
          items: mockFitShowScores,
          nextToken: null,
        },
      },
    });

    render(<FitShowScoreLeaderboard />);

    await waitFor(() => {
      expect(screen.getByText('Total participants with scores: 2')).toBeInTheDocument();
    });
  });

  it('shows correct view mode description', async () => {
    mockAPI.graphql.mockResolvedValue({
      data: {
        listFitShowScores: {
          items: mockFitShowScores,
          nextToken: null,
        },
      },
    });

    render(<FitShowScoreLeaderboard />);

    await waitFor(() => {
      expect(screen.getByText('Ranked by each participant\'s highest score')).toBeInTheDocument();
    });

    // Switch to latest scores
    const latestButton = screen.getByText('Latest Scores');
    fireEvent.click(latestButton);

    expect(screen.getByText('Ranked by each participant\'s most recent score')).toBeInTheDocument();
  });

  it('displays judge information correctly', async () => {
    mockAPI.graphql.mockResolvedValue({
      data: {
        listFitShowScores: {
          items: mockFitShowScores,
          nextToken: null,
        },
      },
    });

    render(<FitShowScoreLeaderboard />);

    await waitFor(() => {
      expect(screen.getByText('Judge: Judge Smith')).toBeInTheDocument();
    });

    expect(screen.getByText('Judge: Judge Davis')).toBeInTheDocument();
  });
});