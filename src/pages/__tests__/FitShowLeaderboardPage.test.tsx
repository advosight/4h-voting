import React from 'react';
import { render, screen } from '@testing-library/react';
import FitShowLeaderboardPage from '../FitShowLeaderboardPage';

// Mock the FitShowScoreLeaderboard component
jest.mock('../../components/FitShowScoreLeaderboard', () => {
  return function MockFitShowScoreLeaderboard({ showTop, finalizedOnly }: { showTop: number; finalizedOnly: boolean }) {
    return (
      <div data-testid="fit-show-score-leaderboard">
        Fit Show Score Leaderboard Component (showTop: {showTop}, finalizedOnly: {finalizedOnly.toString()})
      </div>
    );
  };
});

// Mock AWS Amplify
jest.mock('aws-amplify', () => ({
  API: {
    graphql: jest.fn(),
  },
  graphqlOperation: jest.fn((query) => query),
}));

describe('FitShowLeaderboardPage', () => {
  it('renders the page title and description', () => {
    render(<FitShowLeaderboardPage />);
    
    expect(screen.getByText('Fit and Show Scoring Leaderboard')).toBeInTheDocument();
    expect(screen.getByText(/View participant rankings based on fit and show scoring results/)).toBeInTheDocument();
  });

  it('renders the FitShowScoreLeaderboard component with correct props', () => {
    render(<FitShowLeaderboardPage />);
    
    const leaderboard = screen.getByTestId('fit-show-score-leaderboard');
    expect(leaderboard).toBeInTheDocument();
    expect(leaderboard).toHaveTextContent('showTop: 20');
    expect(leaderboard).toHaveTextContent('finalizedOnly: true');
  });

  it('has proper page structure with Material-UI components', () => {
    render(<FitShowLeaderboardPage />);
    
    // Check that the page has proper structure
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Fit and Show Scoring Leaderboard');
  });

  it('displays information about showmanship categories', () => {
    render(<FitShowLeaderboardPage />);
    
    expect(screen.getByText(/showmanship, handling, and knowledge categories/)).toBeInTheDocument();
  });
});