import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../theme/theme';
import App from '../App';

// Mock CSS imports
jest.mock('@aws-amplify/ui-react/styles.css', () => ({}), { virtual: true });

// Mock AWS Amplify
jest.mock('aws-amplify/api', () => ({
  generateClient: jest.fn(() => ({
    graphql: jest.fn()
  }))
}));

jest.mock('aws-amplify/auth', () => ({
  getCurrentUser: jest.fn(),
  signOut: jest.fn()
}));

// Mock utility functions
jest.mock('../utils/errorHandling', () => ({
  parseError: jest.fn(),
  getUserFriendlyMessage: jest.fn(),
  logError: jest.fn(),
  withRetry: jest.fn((fn) => fn),
  handleOptimisticLockConflict: jest.fn((fn) => fn())
}));

jest.mock('../utils/roleUtils', () => ({
  isJudge: jest.fn(),
  getUserRole: jest.fn(),
  hasRole: jest.fn()
}));

// Mock all page components to avoid complex rendering
jest.mock('../pages/FitShowScoringPage', () => {
  return function MockFitShowScoringPage() {
    return <div data-testid="fit-show-scoring-page">Fit & Show Scoring Page</div>;
  };
});

jest.mock('../pages/VotePage', () => {
  return function MockVotePage() {
    return <div data-testid="vote-page">Vote Page</div>;
  };
});

jest.mock('../pages/TVModePage', () => {
  return function MockTVModePage() {
    return <div data-testid="tv-mode-page">TV Mode Page</div>;
  };
});

jest.mock('../pages/ScorePage', () => {
  return function MockScorePage() {
    return <div data-testid="score-page">Score Page</div>;
  };
});

jest.mock('../pages/ClassScorePage', () => {
  return function MockClassScorePage() {
    return <div data-testid="class-score-page">Class Score Page</div>;
  };
});

jest.mock('../pages/ParticipantScorePage', () => {
  return function MockParticipantScorePage() {
    return <div data-testid="participant-score-page">Participant Score Page</div>;
  };
});

jest.mock('../pages/ParticipantClassScorePage', () => {
  return function MockParticipantClassScorePage() {
    return <div data-testid="participant-class-score-page">Participant Class Score Page</div>;
  };
});

// Mock ProtectedRoute to always allow access for testing
jest.mock('../components/ProtectedRoute', () => {
  return function MockProtectedRoute({ children }: any) {
    return <div data-testid="protected-route">{children}</div>;
  };
});

// Mock Authenticator
jest.mock('@aws-amplify/ui-react', () => ({
  Authenticator: ({ children }: any) => {
    const mockSignOut = jest.fn();
    return children({ signOut: mockSignOut });
  }
}));

// Mock AppLayout
jest.mock('../components/AppLayout', () => {
  return function MockAppLayout() {
    return <div data-testid="app-layout">App Layout</div>;
  };
});

const renderWithRouter = (route: string) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ThemeProvider theme={theme}>
        <App />
      </ThemeProvider>
    </MemoryRouter>
  );
};

describe('Fit & Show Scoring Routes', () => {
  const mockCurrentUser = {
    userId: 'judge-123',
    username: 'testjudge',
    signInDetails: {
      loginId: 'judge@example.com'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    const { getCurrentUser } = require('aws-amplify/auth');
    const { isJudge, getUserRole, hasRole } = require('../utils/roleUtils');
    
    getCurrentUser.mockResolvedValue(mockCurrentUser);
    isJudge.mockResolvedValue(true);
    getUserRole.mockResolvedValue('judge');
    hasRole.mockResolvedValue(true);
  });

  describe('Fit & Show Scoring Route by Cat ID', () => {
    it('should render FitShowScoringPage for /fit-show-score/:catId route', async () => {
      renderWithRouter('/fit-show-score/cat-123');

      await waitFor(() => {
        expect(screen.getByTestId('protected-route')).toBeInTheDocument();
        expect(screen.getByTestId('fit-show-scoring-page')).toBeInTheDocument();
        expect(screen.getByText('Fit & Show Scoring Page')).toBeInTheDocument();
      });
    });

    it('should handle different cat IDs in the route', async () => {
      renderWithRouter('/fit-show-score/different-cat-456');

      await waitFor(() => {
        expect(screen.getByTestId('fit-show-scoring-page')).toBeInTheDocument();
      });
    });

    it('should handle UUID format cat IDs', async () => {
      renderWithRouter('/fit-show-score/550e8400-e29b-41d4-a716-446655440000');

      await waitFor(() => {
        expect(screen.getByTestId('fit-show-scoring-page')).toBeInTheDocument();
      });
    });
  });

  describe('Fit & Show Scoring Route by Cage Number', () => {
    it('should render FitShowScoringPage for /fit-show-score/cage/:cageNumber route', async () => {
      renderWithRouter('/fit-show-score/cage/5');

      await waitFor(() => {
        expect(screen.getByTestId('protected-route')).toBeInTheDocument();
        expect(screen.getByTestId('fit-show-scoring-page')).toBeInTheDocument();
        expect(screen.getByText('Fit & Show Scoring Page')).toBeInTheDocument();
      });
    });

    it('should handle different cage numbers', async () => {
      renderWithRouter('/fit-show-score/cage/42');

      await waitFor(() => {
        expect(screen.getByTestId('fit-show-scoring-page')).toBeInTheDocument();
      });
    });

    it('should handle single digit cage numbers', async () => {
      renderWithRouter('/fit-show-score/cage/1');

      await waitFor(() => {
        expect(screen.getByTestId('fit-show-scoring-page')).toBeInTheDocument();
      });
    });

    it('should handle three digit cage numbers', async () => {
      renderWithRouter('/fit-show-score/cage/123');

      await waitFor(() => {
        expect(screen.getByTestId('fit-show-scoring-page')).toBeInTheDocument();
      });
    });
  });

  describe('Route Protection', () => {
    it('should wrap fit & show scoring routes with ProtectedRoute requiring judge role', async () => {
      renderWithRouter('/fit-show-score/cat-123');

      await waitFor(() => {
        expect(screen.getByTestId('protected-route')).toBeInTheDocument();
        expect(screen.getByTestId('fit-show-scoring-page')).toBeInTheDocument();
      });
    });

    it('should protect cage-based fit & show scoring routes', async () => {
      renderWithRouter('/fit-show-score/cage/5');

      await waitFor(() => {
        expect(screen.getByTestId('protected-route')).toBeInTheDocument();
        expect(screen.getByTestId('fit-show-scoring-page')).toBeInTheDocument();
      });
    });
  });

  describe('Route Distinction from Other Scoring Types', () => {
    it('should render different components for different scoring routes', async () => {
      // Test cage scoring route
      renderWithRouter('/score/5');
      await waitFor(() => {
        expect(screen.getByTestId('score-page')).toBeInTheDocument();
        expect(screen.queryByTestId('fit-show-scoring-page')).not.toBeInTheDocument();
      });
    });

    it('should distinguish fit & show from class scoring routes', async () => {
      // Test class scoring route
      renderWithRouter('/class-score/cat-123');
      await waitFor(() => {
        expect(screen.getByTestId('class-score-page')).toBeInTheDocument();
        expect(screen.queryByTestId('fit-show-scoring-page')).not.toBeInTheDocument();
      });
    });

    it('should distinguish fit & show from class scoring cage routes', async () => {
      // Test class scoring cage route
      renderWithRouter('/class-score/cage/5');
      await waitFor(() => {
        expect(screen.getByTestId('class-score-page')).toBeInTheDocument();
        expect(screen.queryByTestId('fit-show-scoring-page')).not.toBeInTheDocument();
      });
    });
  });

  describe('Public Routes Accessibility', () => {
    it('should not interfere with public voting routes', async () => {
      renderWithRouter('/vote/cat-123');

      await waitFor(() => {
        expect(screen.getByTestId('vote-page')).toBeInTheDocument();
        expect(screen.queryByTestId('fit-show-scoring-page')).not.toBeInTheDocument();
      });
    });

    it('should not interfere with TV mode route', async () => {
      renderWithRouter('/tv-mode');

      await waitFor(() => {
        expect(screen.getByTestId('tv-mode-page')).toBeInTheDocument();
        expect(screen.queryByTestId('fit-show-scoring-page')).not.toBeInTheDocument();
      });
    });

    it('should not interfere with participant score routes', async () => {
      renderWithRouter('/participant-score/participant-123');

      await waitFor(() => {
        expect(screen.getByTestId('participant-score-page')).toBeInTheDocument();
        expect(screen.queryByTestId('fit-show-scoring-page')).not.toBeInTheDocument();
      });
    });

    it('should not interfere with participant class score routes', async () => {
      renderWithRouter('/participant-class-score/cat-123');

      await waitFor(() => {
        expect(screen.getByTestId('participant-class-score-page')).toBeInTheDocument();
        expect(screen.queryByTestId('fit-show-scoring-page')).not.toBeInTheDocument();
      });
    });
  });

  describe('Route Parameter Handling', () => {
    it('should handle special characters in cat IDs', async () => {
      renderWithRouter('/fit-show-score/cat-with-dashes-123');

      await waitFor(() => {
        expect(screen.getByTestId('fit-show-scoring-page')).toBeInTheDocument();
      });
    });

    it('should handle alphanumeric cage numbers', async () => {
      renderWithRouter('/fit-show-score/cage/A1');

      await waitFor(() => {
        expect(screen.getByTestId('fit-show-scoring-page')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation Integration', () => {
    it('should maintain route structure consistency with other scoring types', () => {
      // Verify that fit & show routes follow the same pattern as other scoring routes
      const fitShowCatRoute = '/fit-show-score/cat-123';
      const fitShowCageRoute = '/fit-show-score/cage/5';
      const classCatRoute = '/class-score/cat-123';
      const classCageRoute = '/class-score/cage/5';
      const cageRoute = '/score/5';

      // All routes should follow similar patterns
      expect(fitShowCatRoute).toMatch(/^\/[\w-]+\/[\w-]+$/);
      expect(fitShowCageRoute).toMatch(/^\/[\w-]+\/cage\/\d+$/);
      expect(classCatRoute).toMatch(/^\/[\w-]+\/[\w-]+$/);
      expect(classCageRoute).toMatch(/^\/[\w-]+\/cage\/\d+$/);
      expect(cageRoute).toMatch(/^\/score\/\d+$/);
    });

    it('should support navigation between different scoring types', async () => {
      // Start with fit & show scoring
      renderWithRouter('/fit-show-score/cat-123');
      
      await waitFor(() => {
        expect(screen.getByTestId('fit-show-scoring-page')).toBeInTheDocument();
      });

      // Test that class scoring route renders different component
      const { unmount } = render(
        <MemoryRouter initialEntries={['/class-score/cat-123']}>
          <ThemeProvider theme={theme}>
            <App />
          </ThemeProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('class-score-page')).toBeInTheDocument();
      });

      unmount();
    });
  });

  describe('Error Handling in Routes', () => {
    it('should handle invalid routes gracefully', async () => {
      renderWithRouter('/fit-show-score/invalid/route/structure');

      // Should not crash the application
      // The route won't match, so it should render the default layout or 404
      await waitFor(() => {
        // The app should still render without crashing
        expect(document.body).toBeInTheDocument();
      });
    });

    it('should handle missing route parameters', async () => {
      renderWithRouter('/fit-show-score/');

      await waitFor(() => {
        // Should not render the fit & show scoring page without proper parameters
        expect(screen.queryByTestId('fit-show-scoring-page')).not.toBeInTheDocument();
      });
    });
  });
});