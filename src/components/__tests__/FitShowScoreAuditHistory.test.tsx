import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FitShowScoreAuditHistory } from '../FitShowScoreAuditHistory';

const mockAuditEntries = [
  {
    id: 'audit-1',
    fitShowScoreId: 'score-1',
    action: 'CREATE' as const,
    modifiedBy: 'judge-1',
    modifiedAt: '2024-01-01T10:00:00Z',
    newValues: {
      attire: 8,
      attentive: 4,
      courteous: 5,
      totalScore: 85
    },
    reason: 'Initial score creation'
  },
  {
    id: 'audit-2',
    fitShowScoreId: 'score-1',
    action: 'UPDATE' as const,
    modifiedBy: 'judge-1',
    modifiedAt: '2024-01-01T11:00:00Z',
    previousValues: {
      attire: 8,
      totalScore: 85
    },
    newValues: {
      attire: 9,
      totalScore: 86
    },
    reason: 'Score updated by judge'
  },
  {
    id: 'audit-3',
    fitShowScoreId: 'score-1',
    action: 'FINALIZE' as const,
    modifiedBy: 'judge-1',
    modifiedAt: '2024-01-01T12:00:00Z',
    previousValues: {
      isFinalized: false
    },
    newValues: {
      isFinalized: true
    },
    reason: 'Score finalized by judge'
  }
];

describe('FitShowScoreAuditHistory', () => {
  const mockOnLoadAuditHistory = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    mockOnLoadAuditHistory.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(
      <FitShowScoreAuditHistory
        scoreId="score-1"
        onLoadAuditHistory={mockOnLoadAuditHistory}
      />
    );

    expect(screen.getByText('Loading audit history...')).toBeInTheDocument();
    expect(screen.getByRole('generic', { name: /loading-spinner/i })).toBeInTheDocument();
  });

  it('loads and displays audit entries', async () => {
    mockOnLoadAuditHistory.mockResolvedValue(mockAuditEntries);
    
    render(
      <FitShowScoreAuditHistory
        scoreId="score-1"
        onLoadAuditHistory={mockOnLoadAuditHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Audit History')).toBeInTheDocument();
    });

    expect(mockOnLoadAuditHistory).toHaveBeenCalledWith('score-1');
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('Updated')).toBeInTheDocument();
    expect(screen.getByText('Finalized')).toBeInTheDocument();
  });

  it('displays entries in chronological order (most recent first)', async () => {
    mockOnLoadAuditHistory.mockResolvedValue(mockAuditEntries);
    
    render(
      <FitShowScoreAuditHistory
        scoreId="score-1"
        onLoadAuditHistory={mockOnLoadAuditHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Audit History')).toBeInTheDocument();
    });

    const entries = screen.getAllByText(/judge-1/);
    expect(entries).toHaveLength(3);
    
    // Check that the most recent entry (FINALIZE) appears first
    const actionBadges = screen.getAllByText(/Created|Updated|Finalized/);
    expect(actionBadges[0]).toHaveTextContent('Finalized');
    expect(actionBadges[1]).toHaveTextContent('Updated');
    expect(actionBadges[2]).toHaveTextContent('Created');
  });

  it('expands and collapses audit entry details', async () => {
    const user = userEvent.setup();
    mockOnLoadAuditHistory.mockResolvedValue(mockAuditEntries);
    
    render(
      <FitShowScoreAuditHistory
        scoreId="score-1"
        onLoadAuditHistory={mockOnLoadAuditHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Audit History')).toBeInTheDocument();
    });

    // Find the UPDATE entry and click to expand
    const updateEntry = screen.getByText('Updated').closest('.audit-entry');
    expect(updateEntry).toBeInTheDocument();
    
    const expandButton = updateEntry?.querySelector('.audit-entry-header');
    expect(expandButton).toBeInTheDocument();
    
    // Initially collapsed
    expect(screen.queryByText('Changes:')).not.toBeInTheDocument();
    
    // Click to expand
    await user.click(expandButton!);
    
    await waitFor(() => {
      expect(screen.getByText('Changes:')).toBeInTheDocument();
    });
    
    // Should show the changes
    expect(screen.getByText('attire:')).toBeInTheDocument();
    expect(screen.getByText('8 → 9')).toBeInTheDocument();
    
    // Click again to collapse
    await user.click(expandButton!);
    
    await waitFor(() => {
      expect(screen.queryByText('Changes:')).not.toBeInTheDocument();
    });
  });

  it('displays action badges with correct colors', async () => {
    mockOnLoadAuditHistory.mockResolvedValue(mockAuditEntries);
    
    render(
      <FitShowScoreAuditHistory
        scoreId="score-1"
        onLoadAuditHistory={mockOnLoadAuditHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Audit History')).toBeInTheDocument();
    });

    const createBadge = screen.getByText('Created');
    const updateBadge = screen.getByText('Updated');
    const finalizeBadge = screen.getByText('Finalized');

    expect(createBadge).toHaveStyle({ backgroundColor: 'green' });
    expect(updateBadge).toHaveStyle({ backgroundColor: 'blue' });
    expect(finalizeBadge).toHaveStyle({ backgroundColor: 'orange' });
  });

  it('shows reason when provided', async () => {
    const user = userEvent.setup();
    mockOnLoadAuditHistory.mockResolvedValue(mockAuditEntries);
    
    render(
      <FitShowScoreAuditHistory
        scoreId="score-1"
        onLoadAuditHistory={mockOnLoadAuditHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Audit History')).toBeInTheDocument();
    });

    // Expand the CREATE entry
    const createEntry = screen.getByText('Created').closest('.audit-entry');
    const expandButton = createEntry?.querySelector('.audit-entry-header');
    await user.click(expandButton!);

    await waitFor(() => {
      expect(screen.getByText('Reason:')).toBeInTheDocument();
      expect(screen.getByText('Initial score creation')).toBeInTheDocument();
    });
  });

  it('displays initial values for CREATE action', async () => {
    const user = userEvent.setup();
    mockOnLoadAuditHistory.mockResolvedValue(mockAuditEntries);
    
    render(
      <FitShowScoreAuditHistory
        scoreId="score-1"
        onLoadAuditHistory={mockOnLoadAuditHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Audit History')).toBeInTheDocument();
    });

    // Expand the CREATE entry
    const createEntry = screen.getByText('Created').closest('.audit-entry');
    const expandButton = createEntry?.querySelector('.audit-entry-header');
    await user.click(expandButton!);

    await waitFor(() => {
      expect(screen.getByText('Initial Values:')).toBeInTheDocument();
      expect(screen.getByText('attire: 8')).toBeInTheDocument();
      expect(screen.getByText('totalScore: 85')).toBeInTheDocument();
    });
  });

  it('handles error state', async () => {
    mockOnLoadAuditHistory.mockRejectedValue(new Error('Failed to load'));
    
    render(
      <FitShowScoreAuditHistory
        scoreId="score-1"
        onLoadAuditHistory={mockOnLoadAuditHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load audit history')).toBeInTheDocument();
    });

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('allows retry after error', async () => {
    const user = userEvent.setup();
    mockOnLoadAuditHistory
      .mockRejectedValueOnce(new Error('Failed to load'))
      .mockResolvedValue(mockAuditEntries);
    
    render(
      <FitShowScoreAuditHistory
        scoreId="score-1"
        onLoadAuditHistory={mockOnLoadAuditHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load audit history')).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Retry');
    await user.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Audit History')).toBeInTheDocument();
    });

    expect(mockOnLoadAuditHistory).toHaveBeenCalledTimes(2);
  });

  it('displays empty state when no audit entries exist', async () => {
    mockOnLoadAuditHistory.mockResolvedValue([]);
    
    render(
      <FitShowScoreAuditHistory
        scoreId="score-1"
        onLoadAuditHistory={mockOnLoadAuditHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No audit entries found for this score.')).toBeInTheDocument();
    });
  });

  it('refreshes audit history when refresh button is clicked', async () => {
    const user = userEvent.setup();
    mockOnLoadAuditHistory.mockResolvedValue(mockAuditEntries);
    
    render(
      <FitShowScoreAuditHistory
        scoreId="score-1"
        onLoadAuditHistory={mockOnLoadAuditHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Audit History')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('Refresh');
    await user.click(refreshButton);

    expect(mockOnLoadAuditHistory).toHaveBeenCalledTimes(2);
  });

  it('displays audit summary with total entries and last modification', async () => {
    mockOnLoadAuditHistory.mockResolvedValue(mockAuditEntries);
    
    render(
      <FitShowScoreAuditHistory
        scoreId="score-1"
        onLoadAuditHistory={mockOnLoadAuditHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Total entries: 3')).toBeInTheDocument();
    });

    expect(screen.getByText(/Last modified:.*by judge-1/)).toBeInTheDocument();
  });

  it('formats timestamps correctly', async () => {
    mockOnLoadAuditHistory.mockResolvedValue(mockAuditEntries);
    
    render(
      <FitShowScoreAuditHistory
        scoreId="score-1"
        onLoadAuditHistory={mockOnLoadAuditHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Audit History')).toBeInTheDocument();
    });

    // Check that timestamps are formatted as locale strings
    const timestamps = screen.getAllByText(/1\/1\/2024/);
    expect(timestamps.length).toBeGreaterThan(0);
  });

  it('handles missing onLoadAuditHistory prop gracefully', () => {
    render(
      <FitShowScoreAuditHistory scoreId="score-1" />
    );

    // Should not crash and should not show loading state
    expect(screen.queryByText('Loading audit history...')).not.toBeInTheDocument();
  });
});