import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { generateClient } from 'aws-amplify/api';
import ScoringDashboardPage from '../ScoringDashboardPage';
import { theme } from '../../theme/theme';

// Mock AWS Amplify
jest.mock('aws-amplify/api');
const mockGenerateClient = generateClient as jest.MockedFunction<typeof generateClient>;

// Mock components that might cause issues in tests
jest.mock('../../components/ScoreLeaderboard', () => {
  return function MockScoreLeaderboard() {
    return <div data-testid="score-leaderboard">Score Leaderboard</div>;
  };
});

jest.mock('../../components/ClassScoreLeaderboard', () => {
  return function MockClassScoreLeaderboard() {
    return <div data-testid="class-score-leaderboard">Class Score Leaderboard</div>;
  };
});

jest.mock('../../components/FitShowScoreLeaderboard', () => {
  return function MockFitShowScoreLeaderboard() {
    return <div data-testid="fit-show-score-leaderboard">Fit Show Score Leaderboard</div>;
  };
});

jest.mock('../../components/ScoreNotifications', () => {
  return function MockScoreNotifications() {
    return <div data-testid="score-notifications">Score Notifications</div>;
  };
});

jest.mock('../../components/ClassScoreNotifications', () => {
  return function MockClassScoreNotifications() {
    return <div data-testid="class-score-notifications">Class Score Notifications</div>;
  };
});

jest.mock('../../components/FitShowScoreNotifications', () => {
  return function MockFitShowScoreNotifications() {
    return <div data-testid="fit-show-score-notifications">Fit Show Score Notifications</div>;
  };
});

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockCats = [
  {
    id: 'cat-1',
    name: 'Fluffy',
    owner: 'John Doe',
    cageNumber: 1,
    votes: 5,
    ownerAgeGroup: 'Junior',
    catAgeGroup: 'Kitten'
  },
  {
    id: 'cat-2',
    name: 'Whiskers',
    owner: 'Jane Smith',
    cageNumber: 2,
    votes: 3,
    ownerAgeGroup: 'Senior',
    catAgeGroup: 'Adult'
  }
];

const renderScoringDashboardPage = () => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <ScoringDashboardPage />
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('ScoringDashboardPage - Fit and Show Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    const mockClient = {
      graphql: jest.fn().mockResolvedValue({
        data: {
          listCats: {
            items: mockCats
          }
        }
      })
    };
    mockGenerateClient.mockReturnValue(mockClient as any);
  });

  describe('Fit and Show Scoring Section', () => {
    it('should display fit and show scoring section', async () => {
      renderScoringDashboardPage();

      await waitFor(() => {
        expect(screen.getByText('Fit & Show Scoring')).toBeInTheDocument();
        expect(screen.getByText('Participant evaluation for showmanship, handling, and knowledge')).toBeInTheDocument();
      });
    });

    it('should display fit and show scoring card in selection area', async () => {
      renderScoringDashboardPage();

      await waitFor(() => {
        const fitShowCard = screen.getByText('Fit & Show Scoring').closest('[elevation="2"]');
        expect(fitShowCard).toBeInTheDocument();
        expect(screen.getByText('Access Fit & Show Scoring')).toBeInTheDocument();
      });
    });

    it('should scroll to fit and show section when card button is clicked', async () => {
      // Mock scrollIntoView
      const mockScrollIntoView = jest.fn();
      Element.prototype.scrollIntoView = mockScrollIntoView;

      renderScoringDashboardPage();

      await waitFor(() => {
        const accessButton = screen.getByText('Access Fit & Show Scoring');
        fireEvent.click(accessButton);
        expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
      });
    });

    it('should display cats for fit and show scoring', async () => {
      renderScoringDashboardPage();

      await waitFor(() => {
        // Check that cats are displayed in the fit and show section
        const fitShowSection = screen.getByText('Quick Access by Participant').closest('div');
        expect(fitShowSection).toBeInTheDocument();
        
        // Should show participant names instead of just cat names
        expect(screen.getByText('Participant: John Doe')).toBeInTheDocument();
        expect(screen.getByText('Participant: Jane Smith')).toBeInTheDocument();
      });
    });

    it('should navigate to fit and show scoring when cat card is clicked', async () => {
      renderScoringDashboardPage();

      await waitFor(() => {
        // Find the fit and show cat cards (they should have orange border)
        const fluffyCards = screen.getAllByText('Fluffy');
        // The fit and show card should be the third one (after cage and class)
        const fitShowFluffyCard = fluffyCards[2];
        
        fireEvent.click(fitShowFluffyCard);
        expect(mockNavigate).toHaveBeenCalledWith('/fit-show-score/cat-1');
      });
    });
  });

  describe('Manual Entry for Fit and Show', () => {
    it('should allow manual entry by cat ID for fit and show scoring', async () => {
      renderScoringDashboardPage();

      await waitFor(() => {
        const catIdInputs = screen.getAllByLabelText('Cat ID');
        // The fit and show input should be the last one
        const fitShowCatIdInput = catIdInputs[catIdInputs.length - 1];
        
        fireEvent.change(fitShowCatIdInput, { target: { value: 'test-cat-id' } });
        fireEvent.keyDown(fitShowCatIdInput, { key: 'Enter' });
        
        expect(mockNavigate).toHaveBeenCalledWith('/fit-show-score/test-cat-id');
      });
    });

    it('should allow manual entry by cage number for fit and show scoring', async () => {
      renderScoringDashboardPage();

      await waitFor(() => {
        const cageNumberInputs = screen.getAllByLabelText('Cage Number');
        // The fit and show input should be the last one
        const fitShowCageInput = cageNumberInputs[cageNumberInputs.length - 1];
        
        fireEvent.change(fitShowCageInput, { target: { value: '5' } });
        fireEvent.keyDown(fitShowCageInput, { key: 'Enter' });
        
        expect(mockNavigate).toHaveBeenCalledWith('/fit-show-score/cage/5');
      });
    });

    it('should navigate when manual entry buttons are clicked', async () => {
      renderScoringDashboardPage();

      await waitFor(() => {
        // Test Cat ID button
        const catIdInputs = screen.getAllByLabelText('Cat ID');
        const fitShowCatIdInput = catIdInputs[catIdInputs.length - 1];
        fireEvent.change(fitShowCatIdInput, { target: { value: 'manual-cat-id' } });
        
        const catIdButtons = screen.getAllByText('Open by Cat ID');
        const fitShowCatIdButton = catIdButtons[catIdButtons.length - 1];
        fireEvent.click(fitShowCatIdButton);
        
        expect(mockNavigate).toHaveBeenCalledWith('/fit-show-score/manual-cat-id');
      });
    });
  });

  describe('Leaderboards Integration', () => {
    it('should display fit and show leaderboard alongside other leaderboards', async () => {
      renderScoringDashboardPage();

      await waitFor(() => {
        expect(screen.getByTestId('score-leaderboard')).toBeInTheDocument();
        expect(screen.getByTestId('class-score-leaderboard')).toBeInTheDocument();
        expect(screen.getByTestId('fit-show-score-leaderboard')).toBeInTheDocument();
      });
    });
  });

  describe('Notifications Integration', () => {
    it('should display fit and show notifications alongside other notifications', async () => {
      renderScoringDashboardPage();

      await waitFor(() => {
        expect(screen.getByTestId('score-notifications')).toBeInTheDocument();
        expect(screen.getByTestId('class-score-notifications')).toBeInTheDocument();
        expect(screen.getByTestId('fit-show-score-notifications')).toBeInTheDocument();
      });
    });
  });

  describe('Visual Differentiation', () => {
    it('should use orange color scheme for fit and show scoring elements', async () => {
      renderScoringDashboardPage();

      await waitFor(() => {
        // Check that the fit and show section has the correct styling
        const fitShowSection = screen.getByText('Fit & Show Scoring').closest('div');
        expect(fitShowSection).toBeInTheDocument();
        
        // The section should have orange color indicators
        const fitShowTitle = screen.getByText('Fit & Show Scoring');
        expect(fitShowTitle).toHaveStyle({ color: '#e65100' });
      });
    });

    it('should display updated alert text mentioning all three scoring types', async () => {
      renderScoringDashboardPage();

      await waitFor(() => {
        expect(screen.getByText(/All scoring interfaces require judge authentication/)).toBeInTheDocument();
        expect(screen.getByText(/Fit & Show Scoring.*Participant evaluation for showmanship, handling, and knowledge/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const mockClient = {
        graphql: jest.fn().mockRejectedValue(new Error('API Error'))
      };
      mockGenerateClient.mockReturnValue(mockClient as any);

      renderScoringDashboardPage();

      await waitFor(() => {
        // Should still render the page structure even if cats fail to load
        expect(screen.getByText('Scoring Interface')).toBeInTheDocument();
        expect(screen.getByText('Fit & Show Scoring')).toBeInTheDocument();
      });
    });
  });
});