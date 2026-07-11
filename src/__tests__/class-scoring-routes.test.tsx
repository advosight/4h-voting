import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../theme/theme';
import App from '../App';

// Mock AWS Amplify
vi.mock('aws-amplify/api', () => ({
  generateClient: () => ({
    graphql: vi.fn().mockResolvedValue({
      data: {
        listCats: {
          items: []
        }
      }
    })
  })
}));

vi.mock('aws-amplify/auth', () => ({
  getCurrentUser: vi.fn().mockResolvedValue({
    signInDetails: { loginId: '4h-leader@example.com' },
    username: 'admin'
  })
}));

vi.mock('@aws-amplify/ui-react', () => ({
  Authenticator: ({ children }: { children: any }) => {
    const mockUser = { signInDetails: { loginId: '4h-leader@example.com' } };
    const mockSignOut = vi.fn();
    return children({ user: mockUser, signOut: mockSignOut });
  }
}));

// Mock the ClassScoringForm component since it's not fully implemented yet
vi.mock('../components/ClassScoringForm', () => {
  return {
    default: function MockClassScoringForm({ catData, onSave }: any) {
    return (
      <div data-testid="class-scoring-form">
        <p>Type Class Scoring Form for {catData?.name}</p>
        <button onClick={() => onSave({ test: 'data' })}>Save Score</button>
      </div>
    );
    }
  };
});

describe('Type Class Scoring Routes', () => {
  const renderWithRouter = (initialEntries: string[]) => {
    return render(
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={initialEntries}>
          <App />
        </MemoryRouter>
      </ThemeProvider>
    );
  };

  test('renders class scoring page with cat ID route', async () => {
    renderWithRouter(['/class-score/test-cat-123']);
    
    // Should show the class scoring page
    expect(await screen.findByText('🏆 Type Class Scoring')).toBeInTheDocument();
    expect(screen.getByText('Professional judging for class competition')).toBeInTheDocument();
    
    // Should show cat information section
    expect(screen.getByText('Cat Information')).toBeInTheDocument();
    expect(screen.getByText('Cat test-cat-123')).toBeInTheDocument();
  });

  test('renders class scoring page with cage number route', async () => {
    renderWithRouter(['/class-score/cage/42']);
    
    // Should show the class scoring page
    expect(await screen.findByText('🏆 Type Class Scoring')).toBeInTheDocument();
    expect(screen.getByText('Professional judging for class competition')).toBeInTheDocument();
    
    // Should show cat information for cage
    expect(screen.getByText('Cat Information')).toBeInTheDocument();
    expect(screen.getByText('Cat in Cage 42')).toBeInTheDocument();
  });

  test('class scoring page shows breadcrumbs', async () => {
    renderWithRouter(['/class-score/test-cat-123']);
    
    // Should show breadcrumbs
    expect(await screen.findByText('Scoring Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Type Class Scoring')).toBeInTheDocument();
  });

  test('class scoring page has distinct styling from cage scoring', async () => {
    renderWithRouter(['/class-score/test-cat-123']);
    
    // Should have class scoring specific elements
    expect(await screen.findByText('🏆 Type Class Scoring')).toBeInTheDocument();
    expect(screen.getByText('Professional judging for class competition')).toBeInTheDocument();
    
    // Should not have cage scoring elements
    expect(screen.queryByText('Cage Scoring')).not.toBeInTheDocument();
  });
});

describe('Scoring Dashboard Navigation', () => {
  const renderWithRouter = (initialEntries: string[]) => {
    return render(
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={initialEntries}>
          <App />
        </MemoryRouter>
      </ThemeProvider>
    );
  };

  test('scoring dashboard shows both cage and class scoring options', async () => {
    renderWithRouter(['/scoring']);
    
    // Should show both scoring types
    expect(await screen.findByText('Cage Scoring')).toBeInTheDocument();
    expect(screen.getByText('Type Class Scoring')).toBeInTheDocument();
    
    // Should show access buttons
    expect(screen.getByText('Access Cage Scoring')).toBeInTheDocument();
    expect(screen.getByText('Access Type Class Scoring')).toBeInTheDocument();
  });

  test('scoring dashboard has separate sections for each scoring type', async () => {
    renderWithRouter(['/scoring']);
    
    // Should show separate sections
    expect(await screen.findByText('Traditional cage-based scoring system for general judging')).toBeInTheDocument();
    expect(screen.getByText('Professional class competition scoring with beauty, personality, and health criteria')).toBeInTheDocument();
    
    // Should show manual entry options for both
    expect(screen.getByText('Manual Cage Entry')).toBeInTheDocument();
    expect(screen.getByText('Manual Entry for Type Class Scoring')).toBeInTheDocument();
  });
});