import React from 'react';
import { render, screen } from '@testing-library/react';
import FitShowReportsPage from '../FitShowReportsPage';

// Mock the FitShowScoreReports component
vi.mock('../../components/FitShowScoreReports', () => {
  return {
    default: function MockFitShowScoreReports() {
    return <div data-testid="fit-show-score-reports">Fit Show Score Reports Component</div>;
    }
  };
});

// Mock AWS Amplify
vi.mock('aws-amplify', () => ({
  API: {
    graphql: vi.fn(),
  },
  graphqlOperation: vi.fn((query) => query),
}));

describe('FitShowReportsPage', () => {
  it('renders the page title and description', () => {
    render(<FitShowReportsPage />);
    
    expect(screen.getByText('Fit and Show Scoring Reports')).toBeInTheDocument();
    expect(screen.getByText(/View comprehensive reports for fit and show scoring results/)).toBeInTheDocument();
  });

  it('renders the FitShowScoreReports component', () => {
    render(<FitShowReportsPage />);
    
    expect(screen.getByTestId('fit-show-score-reports')).toBeInTheDocument();
  });

  it('has proper page structure with Material-UI components', () => {
    render(<FitShowReportsPage />);
    
    // Check that the page has proper structure
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Fit and Show Scoring Reports');
  });

  it('displays information about filtering capabilities', () => {
    render(<FitShowReportsPage />);
    
    expect(screen.getByText(/Filter by judge, participant, score range, or date/)).toBeInTheDocument();
  });
});