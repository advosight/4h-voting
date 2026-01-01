import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScoreAuditHistory from '../ScoreAuditHistory';

const mockAuditEntries = [
  {
    id: 'audit-1',
    scoreId: 'score-123',
    action: 'UPDATE',
    modifiedBy: 'Admin User',
    modifiedAt: '2024-01-01T02:00:00.000Z',
    previousValues: {
      cageConditionScore: 20,
      totalScore: 83,
    },
    newValues: {
      cageConditionScore: 25,
      totalScore: 88,
    },
    reason: 'Corrected scoring error',
  },
  {
    id: 'audit-2',
    scoreId: 'score-123',
    action: 'CREATE',
    modifiedBy: 'Judge Smith',
    modifiedAt: '2024-01-01T00:00:00.000Z',
    newValues: {
      cageConditionScore: 20,
      catConditionScore: 22,
      groomingScore: 18,
      overallScore: 23,
      totalScore: 83,
    },
    reason: 'Initial score creation',
  },
];

describe('ScoreAuditHistory', () => {
  const mockOnLoadAuditHistory = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading states', () => {
    it('should show loading message while fetching audit history', () => {
      render(
        <ScoreAuditHistory
          scoreId="score-123"
          onLoadAuditHistory={mockOnLoadAuditHistory}
          loading={true}
        />
      );

      expect(screen.getByText('Loading audit history...')).toBeInTheDocument();
    });

    it('should call onLoadAuditHistory on mount', () => {
      render(
        <ScoreAuditHistory
          scoreId="score-123"
          onLoadAuditHistory={mockOnLoadAuditHistory}
        />
      );

      expect(mockOnLoadAuditHistory).toHaveBeenCalledWith('score-123');
    });
  });

  describe('error handling', () => {
    it('should show error message when loading fails', async () => {
      mockOnLoadAuditHistory.mockRejectedValue(new Error('Failed to load audit history'));

      render(
        <ScoreAuditHistory
          scoreId="score-123"
          onLoadAuditHistory={mockOnLoadAuditHistory}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Error loading audit history/)).toBeInTheDocument();
        expect(screen.getByText('Failed to load audit history')).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      mockOnLoadAuditHistory.mockRejectedValue(new Error('Network error'));

      render(
        <ScoreAuditHistory
          scoreId="score-123"
          onLoadAuditHistory={mockOnLoadAuditHistory}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      expect(mockOnLoadAuditHistory).toHaveBeenCalledTimes(2);
    });
  });

  describe('audit entries display', () => {
    beforeEach(() => {
      mockOnLoadAuditHistory.mockResolvedValue(mockAuditEntries);
    });

    it('should display audit entries after loading', async () => {
      render(
        <ScoreAuditHistory
          scoreId="score-123"
          onLoadAuditHistory={mockOnLoadAuditHistory}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('✏️ UPDATE')).toBeInTheDocument();
        expect(screen.getByText('✨ CREATE')).toBeInTheDocument();
        expect(screen.getByText('Admin User')).toBeInTheDocument();
        expect(screen.getByText('Judge Smith')).toBeInTheDocument();
      });
    });

    it('should show audit summary', async () => {
      render(
        <ScoreAuditHistory
          scoreId="score-123"
          onLoadAuditHistory={mockOnLoadAuditHistory}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Total Modifications: 2')).toBeInTheDocument();
        expect(screen.getByText(/Last Modified:/)).toBeInTheDocument();
      });
    });

    it('should show expand/collapse controls', async () => {
      render(
        <ScoreAuditHistory
          scoreId="score-123"
          onLoadAuditHistory={mockOnLoadAuditHistory}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Expand All')).toBeInTheDocument();
        expect(screen.getByText('Collapse All')).toBeInTheDocument();
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });
    });
  });

  describe('entry expansion', () => {
    beforeEach(() => {
      mockOnLoadAuditHistory.mockResolvedValue(mockAuditEntries);
    });

    it('should expand entry when clicked', async () => {
      render(
        <ScoreAuditHistory
          scoreId="score-123"
          onLoadAuditHistory={mockOnLoadAuditHistory}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('✏️ UPDATE')).toBeInTheDocument();
      });

      const updateEntry = screen.getByText('✏️ UPDATE').closest('.audit-entry-header');
      fireEvent.click(updateEntry!);

      await waitFor(() => {
        expect(screen.getByText('Reason: Corrected scoring error')).toBeInTheDocument();
        expect(screen.getByText('Changed Fields:')).toBeInTheDocument();
        expect(screen.getByText('cageConditionScore:')).toBeInTheDocument();
      });
    });

    it('should show changed fields with before/after values', async () => {
      render(
        <ScoreAuditHistory
          scoreId="score-123"
          onLoadAuditHistory={mockOnLoadAuditHistory}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('✏️ UPDATE')).toBeInTheDocument();
      });

      const updateEntry = screen.getByText('✏️ UPDATE').closest('.audit-entry-header');
      fireEvent.click(updateEntry!);

      await waitFor(() => {
        expect(screen.getByText('From: 20')).toBeInTheDocument();
        expect(screen.getByText('To: 25')).toBeInTheDocument();
        expect(screen.getByText('From: 83')).toBeInTheDocument();
        expect(screen.getByText('To: 88')).toBeInTheDocument();
      });
    });

    it('should show initial values for CREATE action', async () => {
      render(
        <ScoreAuditHistory
          scoreId="score-123"
          onLoadAuditHistory={mockOnLoadAuditHistory}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('✨ CREATE')).toBeInTheDocument();
      });

      const createEntry = screen.getByText('✨ CREATE').closest('.audit-entry-header');
      fireEvent.click(createEntry!);

      await waitFor(() => {
        expect(screen.getByText('Initial Values:')).toBeInTheDocument();
        expect(screen.getByText(/"cageConditionScore": 20/)).toBeInTheDocument();
      });
    });

    it('should expand all entries when Expand All is clicked', async () => {
      render(
        <ScoreAuditHistory
          scoreId="score-123"
          onLoadAuditHistory={mockOnLoadAuditHistory}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Expand All')).toBeInTheDocument();
      });

      const expandAllButton = screen.getByText('Expand All');
      fireEvent.click(expandAllButton);

      await waitFor(() => {
        expect(screen.getByText('Reason: Corrected scoring error')).toBeInTheDocument();
        expect(screen.getByText('Reason: Initial score creation')).toBeInTheDocument();
      });
    });

    it('should collapse all entries when Collapse All is clicked', async () => {
      render(
        <ScoreAuditHistory
          scoreId="score-123"
          onLoadAuditHistory={mockOnLoadAuditHistory}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Expand All')).toBeInTheDocument();
      });

      // First expand all
      const expandAllButton = screen.getByText('Expand All');
      fireEvent.click(expandAllButton);

      await waitFor(() => {
        expect(screen.getByText('Reason: Corrected scoring error')).toBeInTheDocument();
      });

      // Then collapse all
      const collapseAllButton = screen.getByText('Collapse All');
      fireEvent.click(collapseAllButton);

      await waitFor(() => {
        expect(screen.queryByText('Reason: Corrected scoring error')).not.toBeInTheDocument();
      });
    });
  });

  describe('empty state', () => {
    it('should show message when no audit entries exist', async () => {
      mockOnLoadAuditHistory.mockResolvedValue([]);

      render(
        <ScoreAuditHistory
          scoreId="score-123"
          onLoadAuditHistory={mockOnLoadAuditHistory}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('No audit history available for this score.')).toBeInTheDocument();
      });
    });
  });

  describe('refresh functionality', () => {
    it('should refresh audit history when refresh button is clicked', async () => {
      mockOnLoadAuditHistory.mockResolvedValue(mockAuditEntries);

      render(
        <ScoreAuditHistory
          scoreId="score-123"
          onLoadAuditHistory={mockOnLoadAuditHistory}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });

      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);

      expect(mockOnLoadAuditHistory).toHaveBeenCalledTimes(2);
    });
  });

  describe('action badges', () => {
    beforeEach(() => {
      mockOnLoadAuditHistory.mockResolvedValue([
        {
          id: 'audit-1',
          scoreId: 'score-123',
          action: 'FINALIZE',
          modifiedBy: 'Judge Smith',
          modifiedAt: '2024-01-01T03:00:00.000Z',
          reason: 'Score finalized',
        },
        ...mockAuditEntries,
      ]);
    });

    it('should display correct icons for different actions', async () => {
      render(
        <ScoreAuditHistory
          scoreId="score-123"
          onLoadAuditHistory={mockOnLoadAuditHistory}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('🔒 FINALIZE')).toBeInTheDocument();
        expect(screen.getByText('✏️ UPDATE')).toBeInTheDocument();
        expect(screen.getByText('✨ CREATE')).toBeInTheDocument();
      });
    });
  });
});