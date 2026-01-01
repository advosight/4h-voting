import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import VotePage from '../VotePage';

// Mock useParams
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ catId: 'test-cat-123' }),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

const renderVotePage = () => {
  return render(
    <BrowserRouter>
      <VotePage />
    </BrowserRouter>
  );
};

describe('VotePage Mobile Optimization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
    navigator.onLine = true;
  });

  describe('Mobile-First Layout', () => {
    test('renders with mobile-optimized layout', () => {
      renderVotePage();
      
      // Check for mobile-friendly elements
      expect(screen.getByRole('heading', { name: /vote for this cat/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cast your vote/i })).toBeInTheDocument();
      
      // Check for proper ARIA labels
      const voteButton = screen.getByRole('button', { name: /cast your vote/i });
      expect(voteButton).toHaveClass('btn-large');
    });

    test('displays large touch targets for mobile', () => {
      renderVotePage();
      
      const voteButton = screen.getByRole('button', { name: /cast your vote/i });
      expect(voteButton).toHaveClass('vote-button');
      expect(voteButton).toHaveClass('btn-large');
    });

    test('uses single-column layout on mobile', () => {
      renderVotePage();
      
      const container = screen.getByRole('button', { name: /cast your vote/i }).closest('.vote-card');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Touch-Friendly Form Inputs', () => {
    test('shows email input with proper keyboard type after voting', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      renderVotePage();
      
      const voteButton = screen.getByRole('button', { name: /cast your vote/i });
      fireEvent.click(voteButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /vote recorded/i })).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email address for 4h information/i);
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('inputMode', 'email');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');
    });

    test('validates email input properly', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      renderVotePage();
      
      const voteButton = screen.getByRole('button', { name: /cast your vote/i });
      fireEvent.click(voteButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /vote recorded/i })).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /get 4h information/i });
      expect(submitButton).toBeDisabled();

      const emailInput = screen.getByLabelText(/email address for 4h information/i);
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Loading States and Visual Feedback', () => {
    test('shows loading state during voting', async () => {
      (fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ ok: true }), 100))
      );

      renderVotePage();
      
      const voteButton = screen.getByRole('button', { name: /cast your vote/i });
      fireEvent.click(voteButton);

      expect(screen.getByText(/voting\.\.\./i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /voting\.\.\./i })).toBeDisabled();
    });

    test('shows loading spinner during email submission', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      renderVotePage();
      
      const voteButton = screen.getByRole('button', { name: /cast your vote/i });
      fireEvent.click(voteButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /vote recorded/i })).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email address for 4h information/i);
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      const submitButton = screen.getByRole('button', { name: /get 4h information/i });
      fireEvent.click(submitButton);

      expect(screen.getByText(/submitting\.\.\./i)).toBeInTheDocument();
    });
  });

  describe('Network Error Handling', () => {
    test('displays network error message', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      renderVotePage();
      
      const voteButton = screen.getByRole('button', { name: /cast your vote/i });
      fireEvent.click(voteButton);

      // First it should show retry message
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/connection issue.*retrying/i);
      });

      // After all retries fail, should show final error
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/unable to record vote/i);
      }, { timeout: 5000 });
    });

    test('handles offline state', () => {
      // Mock offline state
      navigator.onLine = false;
      
      renderVotePage();
      
      // Trigger offline event
      fireEvent(window, new Event('offline'));

      expect(screen.getByRole('alert')).toHaveTextContent(/no internet connection/i);
      
      const voteButton = screen.getByRole('button', { name: /cast your vote/i });
      expect(voteButton).toBeDisabled();
    });

    test('shows retry mechanism with exponential backoff', async () => {
      let callCount = 0;
      (fetch as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({ ok: true });
      });

      renderVotePage();
      
      const voteButton = screen.getByRole('button', { name: /cast your vote/i });
      fireEvent.click(voteButton);

      // Should show retry message
      await waitFor(() => {
        expect(screen.getByText(/retrying in \d+ seconds/i)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Eventually should succeed
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /vote recorded/i })).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    test('recovers when network comes back online', () => {
      // Start offline
      navigator.onLine = false;
      renderVotePage();
      
      fireEvent(window, new Event('offline'));
      expect(screen.getByRole('alert')).toHaveTextContent(/no internet connection/i);

      // Go back online
      navigator.onLine = true;
      fireEvent(window, new Event('online'));

      // Should remove offline message
      expect(screen.queryByText(/no internet connection/i)).not.toBeInTheDocument();
    });
  });

  describe('Success Page Layout', () => {
    test('displays clear visual hierarchy on success page', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      renderVotePage();
      
      const voteButton = screen.getByRole('button', { name: /cast your vote/i });
      fireEvent.click(voteButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /vote recorded/i })).toBeInTheDocument();
      });

      // Check for proper heading hierarchy
      expect(screen.getByRole('heading', { name: /vote recorded/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /interested in 4h/i })).toBeInTheDocument();
      
      // Check for readable text and proper spacing
      expect(screen.getByText(/thank you for voting/i)).toBeInTheDocument();
      expect(screen.getByText(/join our community/i)).toBeInTheDocument();
    });

    test('shows external link with proper accessibility', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      renderVotePage();
      
      const voteButton = screen.getByRole('button', { name: /cast your vote/i });
      fireEvent.click(voteButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /vote recorded/i })).toBeInTheDocument();
      });

      const externalLink = screen.getByRole('link', { name: /visit wsu 4h extension/i });
      expect(externalLink).toHaveAttribute('target', '_blank');
      expect(externalLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Accessibility Features', () => {
    test('provides proper ARIA labels and roles', () => {
      renderVotePage();
      
      const voteButton = screen.getByRole('button', { name: /cast your vote/i });
      expect(voteButton).toBeInTheDocument();
      
      // Check for proper button labeling
      expect(voteButton).toHaveAccessibleName();
    });

    test('manages focus properly', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      renderVotePage();
      
      const voteButton = screen.getByRole('button', { name: /cast your vote/i });
      fireEvent.click(voteButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /vote recorded/i })).toBeInTheDocument();
      });

      // Email input should be focusable
      const emailInput = screen.getByLabelText(/email address for 4h information/i);
      expect(emailInput).toBeInTheDocument();
    });

    test('provides error announcements for screen readers', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      renderVotePage();
      
      const voteButton = screen.getByRole('button', { name: /cast your vote/i });
      fireEvent.click(voteButton);

      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toBeInTheDocument();
        expect(errorAlert).toHaveTextContent(/connection issue.*retrying/i);
      });

      // After all retries fail, should show final error
      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toHaveTextContent(/unable to record vote/i);
      }, { timeout: 5000 });
    });
  });
});