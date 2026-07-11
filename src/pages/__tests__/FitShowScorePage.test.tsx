import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../theme/theme';
import FitShowScorePage from '../FitShowScorePage';

// Mock AWS Amplify
vi.mock('aws-amplify/api', () => ({
  generateClient: () => ({
    graphql: vi.fn().mockResolvedValue({
      data: {
        getCat: {
          id: 'cat-123',
          name: 'Fluffy',
          owner: 'John Doe',
          cageNumber: 5,
          ownerAgeGroup: 'JUNIOR',
          catAgeGroup: 'KITTEN'
        }
      }
    })
  })
}));

vi.mock('aws-amplify/auth', () => ({
  getCurrentUser: vi.fn().mockResolvedValue({
    signInDetails: {
      loginId: 'judge@example.com'
    }
  })
}));

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => mockNavigate,
  useParams: () => ({ catId: 'cat-123' }),
}));

// Mock components
vi.mock('../../components/FitShowScoringForm', () => ({
  FitShowScoringForm: ({ catId, participantName, onSubmit }: any) => (
    <div data-testid="fit-show-scoring-form">
      <div>Cat ID: {catId}</div>
      <div>Participant: {participantName}</div>
      <button onClick={() => onSubmit({})}>Submit Score</button>
    </div>
  )
}));

vi.mock('../../components/FitShowScoringErrorBoundary', () => ({
  FitShowScoringErrorBoundary: ({ children }: any) => <div>{children}</div>
}));

vi.mock('../../components/FitShowNetworkErrorHandler', () => ({
  FitShowNetworkErrorHandler: ({ children }: any) => <div>{children}</div>
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

describe('FitShowScorePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    renderWithProviders(<FitShowScorePage />);
    
    expect(screen.getByText('Loading fit & show scoring interface...')).toBeInTheDocument();
  });

  it('renders cat information and scoring form after loading', async () => {
    renderWithProviders(<FitShowScorePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Fluffy')).toBeInTheDocument();
      expect(screen.getByText('Cage 5 • Participant: John Doe')).toBeInTheDocument();
      expect(screen.getByTestId('fit-show-scoring-form')).toBeInTheDocument();
    });
  });

  it('displays fit & show scoring header', async () => {
    renderWithProviders(<FitShowScorePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Fit & Show Scoring')).toBeInTheDocument();
    });
  });

  it('shows back button in header', async () => {
    renderWithProviders(<FitShowScorePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Back')).toBeInTheDocument();
    });
  });

  it('displays cat age group information', async () => {
    renderWithProviders(<FitShowScorePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Owner: JUNIOR')).toBeInTheDocument();
      expect(screen.getByText('Cat: KITTEN')).toBeInTheDocument();
    });
  });

  it('shows fit & show evaluation info', async () => {
    renderWithProviders(<FitShowScorePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Fit & Show Evaluation')).toBeInTheDocument();
      expect(screen.getByText('Assess showmanship, handling, knowledge, and overall care demonstration')).toBeInTheDocument();
    });
  });
});