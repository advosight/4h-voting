import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../theme/theme';
import ClassScoringPage from '../ClassScoringPage';

// Mock AWS Amplify
const mockGraphql = jest.fn();
jest.mock('aws-amplify/api', () => ({
  generateClient: () => ({
    graphql: (...args: unknown[]) => mockGraphql(...args)
  })
}));

// Mock age groups
jest.mock('../../utils/ageGroups', () => ({
  CAT_AGE_GROUPS: [
    { value: 'kitten', label: 'Kitten (under 8 months)' },
    { value: 'adult', label: 'Adult (2-7 years)' }
  ],
  getCatAgeGroupLabel: (value: string) => {
    const groups: any = {
      'kitten': 'Kitten (under 8 months)',
      'adult': 'Adult (2-7 years)'
    };
    return groups[value] || value;
  }
}));

// Mock components
jest.mock('../../components/ClassScoreLeaderboard', () => {
  return function MockClassScoreLeaderboard() {
    return <div data-testid="class-score-leaderboard">Class Score Leaderboard</div>;
  };
});

jest.mock('../../components/ClassScoreNotifications', () => {
  return function MockClassScoreNotifications() {
    return <div data-testid="class-score-notifications">Class Score Notifications</div>;
  };
});

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
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

describe('ClassScoringPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock responses
    mockGraphql.mockImplementation(({ query }) => {
      if (query.includes('listCats')) {
        return Promise.resolve({
          data: {
            listCats: {
              items: [
                {
                  id: 'cat1',
                  name: 'Bella',
                  owner: 'Alice Johnson',
                  cageNumber: 10,
                  ownerAgeGroup: 'junior',
                  catAgeGroup: 'kitten'
                },
                {
                  id: 'cat2',
                  name: 'Max',
                  owner: 'Bob Wilson',
                  cageNumber: 11,
                  ownerAgeGroup: 'senior',
                  catAgeGroup: 'adult'
                }
              ]
            }
          }
        });
      } else if (query.includes('listAllClassScores')) {
        return Promise.resolve({
          data: {
            listAllClassScores: {
              items: [
                {
                  id: 'score1',
                  catId: 'cat1',
                  beautyScore: 85,
                  personalityScore: 90,
                  healthScore: 88,
                  totalScore: 263,
                  ribbon: 'Blue',
                  isFinalized: true
                }
              ],
              nextToken: null
            }
          }
        });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('renders class scoring interface correctly', async () => {
    renderWithProviders(<ClassScoringPage />);
    
    // Wait for cats to load
    await waitFor(() => {
      expect(screen.getByText('Bella')).toBeInTheDocument();
      expect(screen.getByText('Max')).toBeInTheDocument();
    });
    
    // Check that key components are present
    expect(screen.getByText('Quick Access by Cage Number')).toBeInTheDocument();
    expect(screen.getByText('Available Participants')).toBeInTheDocument();
  });

  it('displays participant cards with correct information', async () => {
    renderWithProviders(<ClassScoringPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Bella')).toBeInTheDocument();
      expect(screen.getByText('Max')).toBeInTheDocument();
      expect(screen.getByText('Cage 10')).toBeInTheDocument();
      expect(screen.getByText('Cage 11')).toBeInTheDocument();
      expect(screen.getByText('Owner: Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Owner: Bob Wilson')).toBeInTheDocument();
    });
  });

  it('navigates to class scoring when participant card is clicked', async () => {
    renderWithProviders(<ClassScoringPage />);
    
    await waitFor(() => {
      const participantCard = screen.getByText('Bella').closest('div[role="button"], div');
      if (participantCard) {
        fireEvent.click(participantCard);
      }
    });
    
    expect(mockNavigate).toHaveBeenCalledWith('/class-score/cat1');
  });

  it('handles manual cage number entry for class scoring', async () => {
    renderWithProviders(<ClassScoringPage />);
    
    const input = screen.getByLabelText('Cage Number');
    const button = screen.getByText('Open Class Scoring');
    
    fireEvent.change(input, { target: { value: '15' } });
    fireEvent.click(button);
    
    expect(mockNavigate).toHaveBeenCalledWith('/class-score/cage/15');
  });

  it('handles Enter key in cage number input', async () => {
    renderWithProviders(<ClassScoringPage />);
    
    const input = screen.getByLabelText('Cage Number');
    
    fireEvent.change(input, { target: { value: '20' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    
    expect(mockNavigate).toHaveBeenCalledWith('/class-score/cage/20');
  });

  it('displays scoring criteria information', () => {
    renderWithProviders(<ClassScoringPage />);
    
    expect(screen.getByText('Class Scoring Criteria')).toBeInTheDocument();
    expect(screen.getByText('Beauty')).toBeInTheDocument();
    expect(screen.getByText('Personality')).toBeInTheDocument();
    expect(screen.getByText('Health')).toBeInTheDocument();
    expect(screen.getByText('Physical appearance, coat quality, and breed standards')).toBeInTheDocument();
  });

  it('displays quick access section correctly', () => {
    renderWithProviders(<ClassScoringPage />);
    
    expect(screen.getByText('Quick Access by Cage Number')).toBeInTheDocument();
    expect(screen.getByText('Enter a cage number to access class scoring for that participant:')).toBeInTheDocument();
    expect(screen.getByLabelText('Cage Number')).toBeInTheDocument();
  });

  it('displays leaderboard and notifications components', () => {
    renderWithProviders(<ClassScoringPage />);
    
    expect(screen.getByTestId('class-score-leaderboard')).toBeInTheDocument();
    expect(screen.getByTestId('class-score-notifications')).toBeInTheDocument();
  });

  it('displays cats list with scores', async () => {
    renderWithProviders(<ClassScoringPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Registered Cats & Scores')).toBeInTheDocument();
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    // Cats appear in both the quick-access cards and the table, so scope to the table
    const table = within(screen.getByRole('table'));
    expect(table.getByText('Cage #')).toBeInTheDocument();
    expect(table.getByText('Cat Name')).toBeInTheDocument();
    expect(table.getByText('Beauty')).toBeInTheDocument();
    expect(table.getByText('Personality')).toBeInTheDocument();
    expect(table.getByText('Health')).toBeInTheDocument();
    expect(table.getByText('Bella')).toBeInTheDocument();
    expect(table.getByText('Max')).toBeInTheDocument();
  });

  it('filters cats by age group', async () => {
    renderWithProviders(<ClassScoringPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Bella')).toBeInTheDocument();
      expect(screen.getByText('Max')).toBeInTheDocument();
    });
    
    // Filter by kitten age group
    const filterSelect = screen.getByLabelText('Filter by Cat Age Group');
    fireEvent.mouseDown(filterSelect);
    fireEvent.click(screen.getByRole('option', { name: 'Kitten (under 8 months)' }));

    // The age filter only applies to the scores table (the quick-access cards
    // above always list every cat), so scope the "Max filtered out" check to the table.
    await waitFor(() => {
      const table = within(screen.getByRole('table'));
      expect(table.getByText('Bella')).toBeInTheDocument();
      expect(table.queryByText('Max')).not.toBeInTheDocument();
    });
  });

  it('displays class scores in the table', async () => {
    renderWithProviders(<ClassScoringPage />);
    
    await waitFor(() => {
      // Check that scores are displayed for Bella
      expect(screen.getByText('85')).toBeInTheDocument(); // Beauty score
      expect(screen.getByText('90')).toBeInTheDocument(); // Personality score
      expect(screen.getByText('88')).toBeInTheDocument(); // Health score
      expect(screen.getByText('263')).toBeInTheDocument(); // Total score
      expect(screen.getByText('Blue')).toBeInTheDocument(); // Ribbon
    });
  });

  it('navigates to class reports when report buttons are clicked', () => {
    renderWithProviders(<ClassScoringPage />);
    
    const reportsButton = screen.getByText('View Class Reports');
    const leaderboardButton = screen.getByText('View Class Leaderboard');
    
    fireEvent.click(reportsButton);
    expect(mockNavigate).toHaveBeenCalledWith('/class-reports');
    
    fireEvent.click(leaderboardButton);
    expect(mockNavigate).toHaveBeenCalledWith('/class-leaderboard');
  });
});