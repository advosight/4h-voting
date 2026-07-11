import React from 'react';
import { render } from '@testing-library/react';
import FitShowScoreLeaderboard from '../FitShowScoreLeaderboard';

// Mock AWS Amplify
vi.mock('aws-amplify', () => ({
  API: {
    graphql: vi.fn(() => Promise.resolve({
      data: {
        listFitShowScores: {
          items: [],
          nextToken: null,
        },
      },
    })),
  },
  graphqlOperation: vi.fn((query) => query),
}));

describe('FitShowScoreLeaderboard Basic', () => {
  it('renders without crashing', () => {
    render(<FitShowScoreLeaderboard />);
  });

  it('has the correct component structure', () => {
    const { container } = render(<FitShowScoreLeaderboard />);
    expect(container.querySelector('.fit-show-score-leaderboard')).toBeInTheDocument();
  });
});