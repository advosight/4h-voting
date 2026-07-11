import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../theme/theme';
import CageScoringPage from '../CageScoringPage';

// Mock AWS Amplify
vi.mock('aws-amplify/api', () => ({
  generateClient: () => ({
    graphql: vi.fn().mockResolvedValue({
      data: {
        listCats: {
          items: [
            {
              id: '1',
              name: 'Fluffy',
              owner: 'John Doe',
              votes: 5,
              cageNumber: 1,
              ownerAgeGroup: 'JUNIOR',
              catAgeGroup: 'KITTEN'
            },
            {
              id: '2',
              name: 'Whiskers',
              owner: 'Jane Smith',
              votes: 3,
              cageNumber: 2,
              ownerAgeGroup: 'SENIOR',
              catAgeGroup: 'ADULT'
            }
          ]
        }
      }
    })
  })
}));

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => mockNavigate,
}));

// Mock components
vi.mock('../../components/ScoreLeaderboard', () => {
  return {
    default: function MockScoreLeaderboard() {
    return <div data-testid="score-leaderboard">Score Leaderboard</div>;
    }
  };
});

vi.mock('../../components/ScoreNotifications', () => {
  return {
    default: function MockScoreNotifications() {
    return <div data-testid="score-notifications">Score Notifications</div>;
    }
  };
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('CageScoringPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders cage scoring page with correct title', async () => {
    renderWithProviders(<CageScoringPage />);
    
    expect(screen.getByText('Cage Scoring')).toBeInTheDocument();
    expect(screen.getByText('Traditional Cage-Based Judging System')).toBeInTheDocument();
  });

  it('displays cage statistics', async () => {
    renderWithProviders(<CageScoringPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Total Cages')).toBeInTheDocument();
      expect(screen.getByText('Scored Cages')).toBeInTheDocument();
      expect(screen.getByText('Pending Scores')).toBeInTheDocument();
    });
  });

  it('renders quick cage access section', () => {
    renderWithProviders(<CageScoringPage />);
    
    expect(screen.getByText('Quick Cage Access')).toBeInTheDocument();
    expect(screen.getByLabelText('Enter Cage Number')).toBeInTheDocument();
    expect(screen.getByText('Start Scoring')).toBeInTheDocument();
  });

  it('navigates to cage scoring when cage number is entered', async () => {
    renderWithProviders(<CageScoringPage />);
    
    const input = screen.getByLabelText('Enter Cage Number');
    const button = screen.getByText('Start Scoring');
    
    fireEvent.change(input, { target: { value: '123' } });
    fireEvent.click(button);
    
    expect(mockNavigate).toHaveBeenCalledWith('/score/123');
  });

  it('displays available cages', async () => {
    renderWithProviders(<CageScoringPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Available Cages (2)')).toBeInTheDocument();
      expect(screen.getByText('Fluffy')).toBeInTheDocument();
      expect(screen.getByText('Whiskers')).toBeInTheDocument();
      expect(screen.getByText('Owner: John Doe')).toBeInTheDocument();
      expect(screen.getByText('Owner: Jane Smith')).toBeInTheDocument();
    });
  });

  it('navigates to cage scoring when cage card is clicked', async () => {
    renderWithProviders(<CageScoringPage />);
    
    await waitFor(() => {
      const cageCard = screen.getByText('Score Cage 1');
      fireEvent.click(cageCard.closest('div[role="button"]') || cageCard);
      expect(mockNavigate).toHaveBeenCalledWith('/score/1');
    });
  });

  it('renders administration section', () => {
    renderWithProviders(<CageScoringPage />);
    
    expect(screen.getByText('Cage Scoring Administration')).toBeInTheDocument();
    expect(screen.getByText('View Cage Reports')).toBeInTheDocument();
    expect(screen.getByText('View Cage Leaderboard')).toBeInTheDocument();
  });

  it('renders leaderboard and notifications components', () => {
    renderWithProviders(<CageScoringPage />);
    
    expect(screen.getByTestId('score-leaderboard')).toBeInTheDocument();
    expect(screen.getByTestId('score-notifications')).toBeInTheDocument();
  });
});