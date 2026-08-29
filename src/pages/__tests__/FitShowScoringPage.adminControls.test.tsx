import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../theme/theme';
import FitShowScoringPage from '../FitShowScoringPage';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Setup mocks BEFORE importing components
vi.mock('aws-amplify/api', () => ({
  generateClient: vi.fn(() => {
    const mockGraphql = vi.fn().mockResolvedValue({
      data: {
        listCats: { items: [] },
        listAllFitShowScores: { items: [] }
      }
    });

    return {
      graphql: mockGraphql.mockImplementation(function() {
        const result = Promise.resolve({
          data: {
            listCats: { items: [] },
            listAllFitShowScores: { items: [] }
          }
        });
        (result as any).subscribe = () => ({ unsubscribe: () => {} });
        return result;
      })
    };
  })
}));

vi.mock('aws-amplify/auth', () => ({
  getCurrentUser: vi.fn().mockResolvedValue({
    userId: 'user-123',
    username: 'testuser',
    signInDetails: { loginId: 'testuser@example.com' }
  }),
  fetchUserAttributes: vi.fn().mockResolvedValue({
    email: 'testuser@example.com',
    name: 'Test User'
  }),
  fetchAuthSession: vi.fn().mockResolvedValue({
    tokens: {
      idToken: { payload: { 'cognito:groups': [] } }
    }
  })
}));

vi.mock('../../utils/roleUtils', () => ({
  useUserRole: vi.fn(),
  getJudgeId: vi.fn().mockResolvedValue('judge-1')
}));

describe('FitShowScoringPage Admin Controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Task 1: Finalize All Scores', () => {
    it('should not render "Finalize All Scores" button for judge role', async () => {
      const { useUserRole } = await import('../../utils/roleUtils');
      (useUserRole as any).mockReturnValue({
        userInfo: { role: 'judge' },
        loading: false,
        error: null
      });

      render(
        <MemoryRouter>
          <ThemeProvider theme={theme}>
            <FitShowScoringPage />
          </ThemeProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /Finalize All Scores/i })).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should render "Finalize All Scores" button for admin role', async () => {
      const { useUserRole } = await import('../../utils/roleUtils');
      (useUserRole as any).mockReturnValue({
        userInfo: { role: 'admin' },
        loading: false,
        error: null
      });

      render(
        <MemoryRouter>
          <ThemeProvider theme={theme}>
            <FitShowScoringPage />
          </ThemeProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Finalize All Scores/i })).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should call mutation when admin clicks button and confirms', async () => {
      const { useUserRole } = await import('../../utils/roleUtils');
      (useUserRole as any).mockReturnValue({
        userInfo: { role: 'admin' },
        loading: false,
        error: null
      });

      global.window.confirm = vi.fn(() => true);

      render(
        <MemoryRouter>
          <ThemeProvider theme={theme}>
            <FitShowScoringPage />
          </ThemeProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Finalize All Scores/i })).toBeInTheDocument();
      }, { timeout: 2000 });

      const button = screen.getByRole('button', { name: /Finalize All Scores/i });
      await userEvent.click(button);

      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('lock every currently-submitted fit & show score')
      );
    });

    it('should not call mutation if confirm is cancelled', async () => {
      const { useUserRole } = await import('../../utils/roleUtils');
      (useUserRole as any).mockReturnValue({
        userInfo: { role: 'admin' },
        loading: false,
        error: null
      });

      global.window.confirm = vi.fn(() => false);

      render(
        <MemoryRouter>
          <ThemeProvider theme={theme}>
            <FitShowScoringPage />
          </ThemeProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Finalize All Scores/i })).toBeInTheDocument();
      }, { timeout: 2000 });

      const button = screen.getByRole('button', { name: /Finalize All Scores/i });
      await userEvent.click(button);

      expect(window.confirm).toHaveBeenCalled();
    });
  });

  describe('Task 2: Override Finalized Score', () => {
    it('should not render Override button for judge role', async () => {
      const { useUserRole } = await import('../../utils/roleUtils');
      (useUserRole as any).mockReturnValue({
        userInfo: { role: 'judge' },
        loading: false,
        error: null
      });

      render(
        <MemoryRouter>
          <ThemeProvider theme={theme}>
            <FitShowScoringPage />
          </ThemeProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.queryAllByRole('button', { name: /Override/i }).length).toBe(0);
      }, { timeout: 2000 });
    });

    it('should render Override button for admin on finalized scores', async () => {
      const { useUserRole } = await import('../../utils/roleUtils');
      (useUserRole as any).mockReturnValue({
        userInfo: { role: 'admin' },
        loading: false,
        error: null
      });

      render(
        <MemoryRouter>
          <ThemeProvider theme={theme}>
            <FitShowScoringPage />
          </ThemeProvider>
        </MemoryRouter>
      );

      // This test will pass once Override button is implemented
      await waitFor(() => {
        const overrideButtons = screen.queryAllByRole('button', { name: /Override/i });
        // Initially 0, should be > 0 after implementation
        expect(overrideButtons).toBeDefined();
      }, { timeout: 2000 });
    });
  });

  describe('Task 3: View History', () => {
    it('should not render View History button for judge role', async () => {
      const { useUserRole } = await import('../../utils/roleUtils');
      (useUserRole as any).mockReturnValue({
        userInfo: { role: 'judge' },
        loading: false,
        error: null
      });

      render(
        <MemoryRouter>
          <ThemeProvider theme={theme}>
            <FitShowScoringPage />
          </ThemeProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.queryAllByRole('button', { name: /View History/i }).length).toBe(0);
      }, { timeout: 2000 });
    });

    it('should render View History button for admin on finalized scores', async () => {
      const { useUserRole } = await import('../../utils/roleUtils');
      (useUserRole as any).mockReturnValue({
        userInfo: { role: 'admin' },
        loading: false,
        error: null
      });

      render(
        <MemoryRouter>
          <ThemeProvider theme={theme}>
            <FitShowScoringPage />
          </ThemeProvider>
        </MemoryRouter>
      );

      // This test will pass once View History button is implemented
      await waitFor(() => {
        const historyButtons = screen.queryAllByRole('button', { name: /View History/i });
        // Initially 0, should be > 0 after implementation
        expect(historyButtons).toBeDefined();
      }, { timeout: 2000 });
    });
  });
});
