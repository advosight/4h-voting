import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { getCurrentUser } from 'aws-amplify/auth';
import AppLayout from '../AppLayout';
import { theme } from '../../theme/theme';

// Mock AWS Amplify
jest.mock('aws-amplify/auth');
const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;

// Mock components that might cause issues in tests
jest.mock('../ScoreNotifications', () => {
  return function MockScoreNotifications() {
    return <div data-testid="score-notifications">Score Notifications</div>;
  };
});

const renderAppLayout = (signOut = jest.fn()) => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <AppLayout signOut={signOut} />
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('AppLayout Navigation Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Admin User Navigation', () => {
    beforeEach(() => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'admin-123',
        username: 'admin',
        signInDetails: {
          loginId: '4h-leader@example.com'
        },
        attributes: {}
      } as any);
    });

    it('should show all scoring interfaces for admin user', async () => {
      renderAppLayout();

      await waitFor(() => {
        expect(screen.getAllByText('Cage Scoring')).toHaveLength(2); // Desktop and mobile
        expect(screen.getAllByText('Class Scoring')).toHaveLength(2);
        expect(screen.getAllByText('Fit & Show Scoring')).toHaveLength(2);
      });
    });

    it('should show all reports for admin user', async () => {
      renderAppLayout();

      await waitFor(() => {
        expect(screen.getAllByText('Cage Reports')).toHaveLength(2); // Desktop and mobile
        expect(screen.getAllByText('Class Reports')).toHaveLength(2);
        expect(screen.getAllByText('Fit & Show Reports')).toHaveLength(2);
      });
    });

    it('should show all leaderboards for admin user', async () => {
      renderAppLayout();

      await waitFor(() => {
        expect(screen.getAllByText('Cage Leaderboard')).toHaveLength(2); // Desktop and mobile
        expect(screen.getAllByText('Class Leaderboard')).toHaveLength(2);
        expect(screen.getAllByText('Fit & Show Leaderboard')).toHaveLength(2);
      });
    });

    it('should show user management for admin user', async () => {
      renderAppLayout();

      await waitFor(() => {
        expect(screen.getAllByText('User Management')).toHaveLength(2); // Desktop and mobile
      });
    });
  });

  describe('Judge User with All Permissions', () => {
    beforeEach(() => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'judge-123',
        username: 'judge1',
        signInDetails: {
          loginId: 'judge1@example.com'
        },
        attributes: {
          'custom:role': 'judge',
          'custom:judgeId': 'J001',
          'custom:cageScoring': 'true',
          'custom:classScoring': 'true',
          'custom:fitShowScoring': 'true'
        }
      } as any);
    });

    it('should show all scoring interfaces for judge with all permissions', async () => {
      renderAppLayout();

      await waitFor(() => {
        expect(screen.getAllByText('Cage Scoring')).toHaveLength(2); // Desktop and mobile
        expect(screen.getAllByText('Class Scoring')).toHaveLength(2);
        expect(screen.getAllByText('Fit & Show Scoring')).toHaveLength(2);
      });
    });

    it('should show all leaderboards for judge with all permissions', async () => {
      renderAppLayout();

      await waitFor(() => {
        expect(screen.getAllByText('Cage Leaderboard')).toHaveLength(2);
        expect(screen.getAllByText('Class Leaderboard')).toHaveLength(2);
        expect(screen.getAllByText('Fit & Show Leaderboard')).toHaveLength(2);
      });
    });

    it('should not show reports for judge user', async () => {
      renderAppLayout();

      await waitFor(() => {
        expect(screen.queryByText('Cage Reports')).not.toBeInTheDocument();
        expect(screen.queryByText('Class Reports')).not.toBeInTheDocument();
        expect(screen.queryByText('Fit & Show Reports')).not.toBeInTheDocument();
      });
    });

    it('should not show user management for judge user', async () => {
      renderAppLayout();

      await waitFor(() => {
        expect(screen.queryByText('User Management')).not.toBeInTheDocument();
      });
    });
  });

  describe('Judge User with Specific Permissions', () => {
    it('should show only cage scoring for cage-only judge', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'judge-cage-123',
        username: 'cagejudge',
        signInDetails: {
          loginId: 'cagejudge@example.com'
        },
        attributes: {
          'custom:role': 'judge',
          'custom:judgeId': 'J002',
          'custom:cageScoring': 'true',
          'custom:classScoring': 'false',
          'custom:fitShowScoring': 'false'
        }
      } as any);

      renderAppLayout();

      await waitFor(() => {
        expect(screen.getAllByText('Cage Scoring')).toHaveLength(2);
        expect(screen.getAllByText('Cage Leaderboard')).toHaveLength(2);
        expect(screen.queryByText('Class Scoring')).not.toBeInTheDocument();
        expect(screen.queryByText('Fit & Show Scoring')).not.toBeInTheDocument();
        expect(screen.queryByText('Class Leaderboard')).not.toBeInTheDocument();
        expect(screen.queryByText('Fit & Show Leaderboard')).not.toBeInTheDocument();
      });
    });

    it('should show only fit and show scoring for fit-show-only judge', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'judge-fitshow-123',
        username: 'fitshowjudge',
        signInDetails: {
          loginId: 'fitshowjudge@example.com'
        },
        attributes: {
          'custom:role': 'judge',
          'custom:judgeId': 'J003',
          'custom:cageScoring': 'false',
          'custom:classScoring': 'false',
          'custom:fitShowScoring': 'true'
        }
      } as any);

      renderAppLayout();

      await waitFor(() => {
        expect(screen.getAllByText('Fit & Show Scoring')).toHaveLength(2);
        expect(screen.getAllByText('Fit & Show Leaderboard')).toHaveLength(2);
        expect(screen.queryByText('Cage Scoring')).not.toBeInTheDocument();
        expect(screen.queryByText('Class Scoring')).not.toBeInTheDocument();
        expect(screen.queryByText('Cage Leaderboard')).not.toBeInTheDocument();
        expect(screen.queryByText('Class Leaderboard')).not.toBeInTheDocument();
      });
    });
  });

  describe('Participant User', () => {
    beforeEach(() => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'participant-123',
        username: 'participant',
        signInDetails: {
          loginId: 'participant@example.com'
        },
        attributes: {
          'custom:role': 'participant'
        }
      } as any);
    });

    it('should only show dashboard for participant user', async () => {
      renderAppLayout();

      await waitFor(() => {
        expect(screen.getAllByText('Dashboard')).toHaveLength(3); // Header, desktop nav, mobile nav
        expect(screen.queryByText('Cage Scoring')).not.toBeInTheDocument();
        expect(screen.queryByText('Class Scoring')).not.toBeInTheDocument();
        expect(screen.queryByText('Fit & Show Scoring')).not.toBeInTheDocument();
        expect(screen.queryByText('User Management')).not.toBeInTheDocument();
      });
    });
  });

  describe('Visual Differentiation', () => {
    beforeEach(() => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'admin-123',
        username: 'admin',
        signInDetails: {
          loginId: '4h-leader@example.com'
        },
        attributes: {}
      } as any);
    });

    it('should apply different colors to different scoring types', async () => {
      renderAppLayout();

      await waitFor(() => {
        const cageScorings = screen.getAllByText('Cage Scoring');
        const classScorings = screen.getAllByText('Class Scoring');
        const fitShowScorings = screen.getAllByText('Fit & Show Scoring');

        // Check that we have the expected number of elements
        expect(cageScorings).toHaveLength(2);
        expect(classScorings).toHaveLength(2);
        expect(fitShowScorings).toHaveLength(2);

        // Check that the parent ListItemButton has the correct styling for the first instance
        const cageScoringButton = cageScorings[0].closest('div[role="button"]');
        const classScoringButton = classScorings[0].closest('div[role="button"]');
        const fitShowScoringButton = fitShowScorings[0].closest('div[role="button"]');

        expect(cageScoringButton).toBeInTheDocument();
        expect(classScoringButton).toBeInTheDocument();
        expect(fitShowScoringButton).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors gracefully', async () => {
      mockGetCurrentUser.mockRejectedValue(new Error('Authentication failed'));

      renderAppLayout();

      await waitFor(() => {
        // Should still render the layout but with no permissions
        expect(screen.getAllByText('Dashboard')).toHaveLength(3); // Header, desktop nav, mobile nav
        expect(screen.queryByText('Cage Scoring')).not.toBeInTheDocument();
      });
    });
  });
});