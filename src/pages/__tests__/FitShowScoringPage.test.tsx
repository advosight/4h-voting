import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../theme/theme';
import FitShowScoringPage from '../FitShowScoringPage';

// Mock AWS Amplify
vi.mock('aws-amplify/api', () => ({
  generateClient: () => ({
    graphql: vi.fn().mockResolvedValue({
      data: {
        listCats: {
          items: [
            {
              id: 'fs1',
              name: 'Shadow',
              owner: 'Emma Davis',
              cageNumber: 20,
              ownerAgeGroup: 'junior',
              catAgeGroup: 'kitten'
            },
            {
              id: 'fs2',
              name: 'Luna',
              owner: 'Michael Brown',
              cageNumber: 21,
              ownerAgeGroup: 'senior',
              catAgeGroup: 'adult'
            }
          ]
        }
      }
    })
  })
}));

// Mock components
vi.mock('../../components/FitShowScoreLeaderboard', () => {
  return {
    default: function MockFitShowScoreLeaderboard() {
    return <div data-testid="fit-show-score-leaderboard">Fit Show Score Leaderboard</div>;
    }
  };
});

vi.mock('../../components/FitShowScoreNotifications', () => {
  return {
    default: function MockFitShowScoreNotifications() {
    return <div data-testid="fit-show-score-notifications">Fit Show Score Notifications</div>;
    }
  };
});

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => mockNavigate,
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('FitShowScoringPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders fit & show scoring interface correctly', async () => {
    renderWithProviders(<FitShowScoringPage />);
    
    expect(screen.getByText('Fit & Show Scoring Interface')).toBeInTheDocument();
    expect(screen.getByText('Participant evaluation for showmanship, handling, and knowledge demonstration.')).toBeInTheDocument();
    
    // Wait for cats to load
    await waitFor(() => {
      expect(screen.getByText('Shadow')).toBeInTheDocument();
      expect(screen.getByText('Luna')).toBeInTheDocument();
    });
  });

  it('displays participant cards with correct information', async () => {
    renderWithProviders(<FitShowScoringPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Shadow')).toBeInTheDocument();
      expect(screen.getByText('Luna')).toBeInTheDocument();
      expect(screen.getByText('Cage 20')).toBeInTheDocument();
      expect(screen.getByText('Cage 21')).toBeInTheDocument();
      expect(screen.getByText('Participant: Emma Davis')).toBeInTheDocument();
      expect(screen.getByText('Participant: Michael Brown')).toBeInTheDocument();
    });
  });

  it('navigates to fit & show scoring when participant card is clicked', async () => {
    renderWithProviders(<FitShowScoringPage />);
    
    await waitFor(() => {
      const participantCard = screen.getByText('Shadow').closest('div[role="button"], div');
      if (participantCard) {
        fireEvent.click(participantCard);
      }
    });
    
    expect(mockNavigate).toHaveBeenCalledWith('/fit-show-score/fs1');
  });

  it('handles manual cat ID entry', async () => {
    renderWithProviders(<FitShowScoringPage />);
    
    const input = screen.getByLabelText('Cat ID');
    const button = screen.getByText('Open by Cat ID');
    
    fireEvent.change(input, { target: { value: 'test-fit-show-id' } });
    fireEvent.click(button);
    
    expect(mockNavigate).toHaveBeenCalledWith('/fit-show-score/test-fit-show-id');
  });

  it('handles manual cage number entry for fit & show scoring', async () => {
    renderWithProviders(<FitShowScoringPage />);
    
    const input = screen.getByLabelText('Cage Number');
    const button = screen.getByText('Open by Cage');
    
    fireEvent.change(input, { target: { value: '25' } });
    fireEvent.click(button);
    
    expect(mockNavigate).toHaveBeenCalledWith('/fit-show-score/cage/25');
  });

  it('displays scoring criteria information', () => {
    renderWithProviders(<FitShowScoringPage />);
    
    expect(screen.getByText('Fit & Show Scoring Criteria')).toBeInTheDocument();
    expect(screen.getByText('Showmanship')).toBeInTheDocument();
    expect(screen.getByText('Handling')).toBeInTheDocument();
    expect(screen.getByText('Knowledge')).toBeInTheDocument();
    expect(screen.getByText('Overall Care')).toBeInTheDocument();
    expect(screen.getByText('Presentation skills and confidence in the ring')).toBeInTheDocument();
  });

  it('displays stats correctly', async () => {
    renderWithProviders(<FitShowScoringPage />);
    
    await waitFor(() => {
      expect(screen.getByText('2 Participants')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Showmanship Evaluation')).toBeInTheDocument();
    expect(screen.getByText('Knowledge • Handling • Care')).toBeInTheDocument();
  });

  it('displays leaderboard and notifications components', () => {
    renderWithProviders(<FitShowScoringPage />);
    
    expect(screen.getByTestId('fit-show-score-leaderboard')).toBeInTheDocument();
    expect(screen.getByTestId('fit-show-score-notifications')).toBeInTheDocument();
  });

  it('navigates to fit & show reports when report buttons are clicked', () => {
    renderWithProviders(<FitShowScoringPage />);
    
    const reportsButton = screen.getByText('View Fit & Show Reports');
    const leaderboardButton = screen.getByText('View Fit & Show Leaderboard');
    
    fireEvent.click(reportsButton);
    expect(mockNavigate).toHaveBeenCalledWith('/fit-show-reports');
    
    fireEvent.click(leaderboardButton);
    expect(mockNavigate).toHaveBeenCalledWith('/fit-show-leaderboard');
  });

  it('handles Enter key in input fields', async () => {
    renderWithProviders(<FitShowScoringPage />);
    
    // Test Cat ID input
    const catIdInput = screen.getByLabelText('Cat ID');
    fireEvent.change(catIdInput, { target: { value: 'enter-test-id' } });
    fireEvent.keyDown(catIdInput, { key: 'Enter' });
    expect(mockNavigate).toHaveBeenCalledWith('/fit-show-score/enter-test-id');
    
    // Test Cage Number input
    const cageInput = screen.getByLabelText('Cage Number');
    fireEvent.change(cageInput, { target: { value: '30' } });
    fireEvent.keyDown(cageInput, { key: 'Enter' });
    expect(mockNavigate).toHaveBeenCalledWith('/fit-show-score/cage/30');
  });
});