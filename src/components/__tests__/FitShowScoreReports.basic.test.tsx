import React from 'react';
import { render } from '@testing-library/react';
import FitShowScoreReports from '../FitShowScoreReports';

// Mock AWS Amplify
jest.mock('aws-amplify', () => ({
  API: {
    graphql: jest.fn(() => Promise.resolve({
      data: {
        listFitShowScores: {
          items: [],
          nextToken: null,
        },
      },
    })),
  },
  graphqlOperation: jest.fn((query) => query),
}));

describe('FitShowScoreReports Basic', () => {
  it('renders without crashing', () => {
    render(<FitShowScoreReports />);
  });

  it('has the correct component structure', () => {
    const { container } = render(<FitShowScoreReports />);
    expect(container.querySelector('.fit-show-score-reports')).toBeInTheDocument();
  });
});