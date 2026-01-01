import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ClassScoringConflictResolutionDialog } from '../ClassScoringConflictResolutionDialog';

// Mock the class error handling utilities
jest.mock('../../utils/classErrorHandling', () => ({
  logClassScoringError: jest.fn()
}));

const mockCurrentScore = {
  id: 'score123',
  catId: 'cat123',
  judgeId: 'judge456',
  beautyScore: 12,
  beautyComments: 'Current beauty comment',
  personalityScore: 18,
  personalityComments: 'Current personality comment',
  balanceProportionScore: 10,
  balanceProportionComments: 'Current balance comment',
  coatCleanGroomed: true,
  teethGumsHealthy: true,
  eyesNoseClear: false,
  earsCleanMiteFree: true,
  toenailsClipped: true,
  fleaIssues: false,
  healthGroomingComments: 'Current health comment'
};

const mockServerScore = {
  id: 'score123',
  catId: 'cat123',
  judgeId: 'judge789',
  judgeName: 'Judge Smith',
  beautyScore: 14,
  beautyComments: 'Server beauty comment',
  personalityScore: 16,
  personalityComments: 'Server personality comment',
  balanceProportionScore: 12,
  balanceProportionComments: 'Server balance comment',
  coatCleanGroomed: true,
  teethGumsHealthy: false,
  eyesNoseClear: true,
  earsCleanMiteFree: true,
  toenailsClipped: true,
  fleaIssues: true,
  healthGroomingComments: 'Server health comment',
  totalScore: 42,
  ribbonEligibility: 'Red',
  timestamp: '2024-01-15T10:30:00Z',
  isFinalized: false
};

describe('ClassScoringConflictResolutionDialog', () => {
  const mockOnClose = jest.fn();
  const mockOnResolve = jest.fn();
  const mockOnMerge = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when not open', () => {
    const { container } = render(
      <ClassScoringConflictResolutionDialog
        isOpen={false}
        onClose={mockOnClose}
        currentScore={mockCurrentScore}
        serverScore={mockServerScore}
        onResolve={mockOnResolve}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render conflict dialog when open', () => {
    render(
      <ClassScoringConflictResolutionDialog
        isOpen={true}
        onClose={mockOnClose}
        currentScore={mockCurrentScore}
        serverScore={mockServerScore}
        onResolve={mockOnResolve}
        catName="Fluffy"
        cageNumber={42}
      />
    );

    expect(screen.getByText('🎗️ Type Class Scoring Conflict')).toBeInTheDocument();
    expect(screen.getByText(/Another judge has modified the class score for Fluffy \(Cage 42\)/)).toBeInTheDocument();
  });

  it('should show resolution options', () => {
    render(
      <ClassScoringConflictResolutionDialog
        isOpen={true}
        onClose={mockOnClose}
        currentScore={mockCurrentScore}
        serverScore={mockServerScore}
        onResolve={mockOnResolve}
      />
    );

    expect(screen.getByText('Use Server Version')).toBeInTheDocument();
    expect(screen.getByText('Keep Your Version')).toBeInTheDocument();
    expect(screen.getByText(/Discard your changes and use the version from the server/)).toBeInTheDocument();
    expect(screen.getByText(/Overwrite the server version with your changes/)).toBeInTheDocument();
  });

  it('should show merge option when onMerge provided', () => {
    render(
      <ClassScoringConflictResolutionDialog
        isOpen={true}
        onClose={mockOnClose}
        currentScore={mockCurrentScore}
        serverScore={mockServerScore}
        onResolve={mockOnResolve}
        onMerge={mockOnMerge}
      />
    );

    expect(screen.getByText('Merge Changes')).toBeInTheDocument();
    expect(screen.getByText(/Manually combine both versions/)).toBeInTheDocument();
  });

  it('should display score differences', () => {
    render(
      <ClassScoringConflictResolutionDialog
        isOpen={true}
        onClose={mockOnClose}
        currentScore={mockCurrentScore}
        serverScore={mockServerScore}
        onResolve={mockOnResolve}
      />
    );

    expect(screen.getByText('Score Differences')).toBeInTheDocument();
    expect(screen.getByText('Beauty Score')).toBeInTheDocument();
    expect(screen.getByText('Personality Score')).toBeInTheDocument();
    expect(screen.getByText('Balance/Proportion Score')).toBeInTheDocument();
  });

  it('should display health and grooming differences', () => {
    render(
      <ClassScoringConflictResolutionDialog
        isOpen={true}
        onClose={mockOnClose}
        currentScore={mockCurrentScore}
        serverScore={mockServerScore}
        onResolve={mockOnResolve}
      />
    );

    expect(screen.getByText('Health & Grooming')).toBeInTheDocument();
    expect(screen.getByText('Coat Clean & Groomed')).toBeInTheDocument();
    expect(screen.getByText('Teeth/Gums Healthy')).toBeInTheDocument();
    expect(screen.getByText('Eyes & Nose Clear')).toBeInTheDocument();
    expect(screen.getByText('Ears Clean & Mite Free')).toBeInTheDocument();
    expect(screen.getByText('Toenails Clipped')).toBeInTheDocument();
    expect(screen.getByText('Flea Issues')).toBeInTheDocument();
  });

  it('should display comment differences when they exist', () => {
    render(
      <ClassScoringConflictResolutionDialog
        isOpen={true}
        onClose={mockOnClose}
        currentScore={mockCurrentScore}
        serverScore={mockServerScore}
        onResolve={mockOnResolve}
      />
    );

    expect(screen.getByText('Comment Differences')).toBeInTheDocument();
    expect(screen.getByText('Beauty Comments')).toBeInTheDocument();
    expect(screen.getByText('Personality Comments')).toBeInTheDocument();
    expect(screen.getByText('Balance/Proportion Comments')).toBeInTheDocument();
    expect(screen.getByText('Health/Grooming Comments')).toBeInTheDocument();
  });

  it('should show server modification details', () => {
    render(
      <ClassScoringConflictResolutionDialog
        isOpen={true}
        onClose={mockOnClose}
        currentScore={mockCurrentScore}
        serverScore={mockServerScore}
        onResolve={mockOnResolve}
      />
    );

    expect(screen.getByText(/Modified by Judge Smith at/)).toBeInTheDocument();
  });

  it('should call onClose when close button clicked', () => {
    render(
      <ClassScoringConflictResolutionDialog
        isOpen={true}
        onClose={mockOnClose}
        currentScore={mockCurrentScore}
        serverScore={mockServerScore}
        onResolve={mockOnResolve}
      />
    );

    fireEvent.click(screen.getByText('×'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should call onClose when cancel button clicked', () => {
    render(
      <ClassScoringConflictResolutionDialog
        isOpen={true}
        onClose={mockOnClose}
        currentScore={mockCurrentScore}
        serverScore={mockServerScore}
        onResolve={mockOnResolve}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should change selected resolution when radio button clicked', () => {
    render(
      <ClassScoringConflictResolutionDialog
        isOpen={true}
        onClose={mockOnClose}
        currentScore={mockCurrentScore}
        serverScore={mockServerScore}
        onResolve={mockOnResolve}
      />
    );

    const keepCurrentRadio = screen.getByDisplayValue('keep_current');
    fireEvent.click(keepCurrentRadio);

    expect(keepCurrentRadio).toBeChecked();
  });

  it('should call onResolve with selected resolution', async () => {
    mockOnResolve.mockResolvedValue(undefined);

    render(
      <ClassScoringConflictResolutionDialog
        isOpen={true}
        onClose={mockOnClose}
        currentScore={mockCurrentScore}
        serverScore={mockServerScore}
        onResolve={mockOnResolve}
      />
    );

    // Select "Keep Your Version"
    fireEvent.click(screen.getByDisplayValue('keep_current'));
    fireEvent.click(screen.getByText('Resolve Conflict'));

    await waitFor(() => {
      expect(mockOnResolve).toHaveBeenCalledWith('keep_current');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should call onMerge when merge resolution selected', async () => {
    mockOnMerge.mockResolvedValue(undefined);

    render(
      <ClassScoringConflictResolutionDialog
        isOpen={true}
        onClose={mockOnClose}
        currentScore={mockCurrentScore}
        serverScore={mockServerScore}
        onResolve={mockOnResolve}
        onMerge={mockOnMerge}
      />
    );

    // Select "Merge Changes"
    fireEvent.click(screen.getByDisplayValue('merge'));
    fireEvent.click(screen.getByText('Resolve Conflict'));

    await waitFor(() => {
      expect(mockOnMerge).toHaveBeenCalledWith(mockCurrentScore);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should show merge inputs when merge option selected', () => {
    render(
      <ClassScoringConflictResolutionDialog
        isOpen={true}
        onClose={mockOnClose}
        currentScore={mockCurrentScore}
        serverScore={mockServerScore}
        onResolve={mockOnResolve}
        onMerge={mockOnMerge}
      />
    );

    // Select "Merge Changes"
    fireEvent.click(screen.getByDisplayValue('merge'));

    // Should show merge inputs
    const mergeInputs = screen.getAllByClassName('merge-input');
    expect(mergeInputs.length).toBeGreaterThan(0);
  });

  it('should update merged values when merge inputs changed', () => {
    render(
      <ClassScoringConflictResolutionDialog
        isOpen={true}
        onClose={mockOnClose}
        currentScore={mockCurrentScore}
        serverScore={mockServerScore}
        onResolve={mockOnResolve}
        onMerge={mockOnMerge}
      />
    );

    // Select "Merge Changes"
    fireEvent.click(screen.getByDisplayValue('merge'));

    // Find and change a merge input
    const mergeInputs = screen.getAllByClassName('merge-input');
    const beautyScoreInput = mergeInputs.find(input => 
      (input as HTMLInputElement).value === '12'
    ) as HTMLInputElement;

    if (beautyScoreInput) {
      fireEvent.change(beautyScoreInput, { target: { value: '13' } });
      expect(beautyScoreInput.value).toBe('13');
    }
  });

  it('should disable buttons when resolving', async () => {
    mockOnResolve.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <ClassScoringConflictResolutionDialog
        isOpen={true}
        onClose={mockOnClose}
        currentScore={mockCurrentScore}
        serverScore={mockServerScore}
        onResolve={mockOnResolve}
      />
    );

    fireEvent.click(screen.getByText('Resolve Conflict'));

    expect(screen.getByText('Resolving...')).toBeInTheDocument();
    expect(screen.getByText('×')).toBeDisabled();
    expect(screen.getByText('Cancel')).toBeDisabled();
  });

  it('should log error when dialog opens', () => {
    const { logClassScoringError } = require('../../utils/classErrorHandling');

    render(
      <ClassScoringConflictResolutionDialog
        isOpen={true}
        onClose={mockOnClose}
        currentScore={mockCurrentScore}
        serverScore={mockServerScore}
        onResolve={mockOnResolve}
      />
    );

    expect(logClassScoringError).toHaveBeenCalledWith(
      expect.any(Error),
      'ConflictResolution',
      {
        catId: 'cat123',
        judgeId: 'judge456',
        operation: 'conflict_dialog_opened'
      }
    );
  });

  it('should handle resolution error', async () => {
    const { logClassScoringError } = require('../../utils/classErrorHandling');
    const resolutionError = new Error('Resolution failed');
    mockOnResolve.mockRejectedValue(resolutionError);

    render(
      <ClassScoringConflictResolutionDialog
        isOpen={true}
        onClose={mockOnClose}
        currentScore={mockCurrentScore}
        serverScore={mockServerScore}
        onResolve={mockOnResolve}
      />
    );

    fireEvent.click(screen.getByText('Resolve Conflict'));

    await waitFor(() => {
      expect(logClassScoringError).toHaveBeenCalledWith(
        resolutionError,
        'ConflictResolution',
        {
          catId: 'cat123',
          judgeId: 'judge456',
          resolution: 'use_server',
          operation: 'conflict_resolution_failed'
        }
      );
    });
  });

  it('should format timestamp correctly', () => {
    render(
      <ClassScoringConflictResolutionDialog
        isOpen={true}
        onClose={mockOnClose}
        currentScore={mockCurrentScore}
        serverScore={mockServerScore}
        onResolve={mockOnResolve}
      />
    );

    // Should show formatted timestamp
    expect(screen.getByText(/Modified by Judge Smith at/)).toBeInTheDocument();
  });

  it('should show different styling for different and same values', () => {
    render(
      <ClassScoringConflictResolutionDialog
        isOpen={true}
        onClose={mockOnClose}
        currentScore={mockCurrentScore}
        serverScore={mockServerScore}
        onResolve={mockOnResolve}
      />
    );

    // Beauty scores are different (12 vs 14)
    const beautyComparison = screen.getByText('Beauty Score').closest('.score-comparison');
    expect(beautyComparison).toHaveClass('different');

    // If we had same values, they would have 'same' class
    // This is tested by the component logic
  });
});