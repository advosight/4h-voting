import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScoreEditForm from '../ScoreEditForm';

const mockScore = {
  id: 'score-123',
  catId: 'cat-123',
  judgeId: 'judge-456',
  judgeName: 'Judge Smith',
  cageConditionScore: 20,
  cageConditionComments: 'Clean cage',
  catConditionScore: 22,
  catConditionComments: 'Healthy cat',
  groomingScore: 18,
  groomingComments: 'Well groomed',
  overallScore: 23,
  overallComments: 'Excellent presentation',
  totalScore: 83,
  timestamp: '2024-01-01T00:00:00.000Z',
  isFinalized: false,
  modificationCount: 0,
  lastModifiedBy: 'Judge Smith',
  lastModifiedAt: '2024-01-01T00:00:00.000Z',
};

const mockFinalizedScore = {
  ...mockScore,
  isFinalized: true,
  modificationCount: 2,
  lastModifiedBy: 'Admin User',
  lastModifiedAt: '2024-01-01T02:00:00.000Z',
};

describe('ScoreEditForm', () => {
  const mockOnUpdate = vi.fn();
  const mockOnFinalize = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render score metadata correctly', () => {
      render(
        <ScoreEditForm
          score={mockScore}
          onUpdate={mockOnUpdate}
          onFinalize={mockOnFinalize}
        />
      );

      expect(screen.getByText('Judge Smith')).toBeInTheDocument();
      expect(screen.getByText('📝 Draft')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument(); // modification count
    });

    it('should render finalized score metadata correctly', () => {
      render(
        <ScoreEditForm
          score={mockFinalizedScore}
          onUpdate={mockOnUpdate}
          onFinalize={mockOnFinalize}
        />
      );

      expect(screen.getByText('✅ Finalized')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // modification count
      expect(screen.getByText(/Admin User at/)).toBeInTheDocument();
    });

    it('should display total score correctly', () => {
      render(
        <ScoreEditForm
          score={mockScore}
          onUpdate={mockOnUpdate}
          onFinalize={mockOnFinalize}
        />
      );

      expect(screen.getByText('Total Score: 83/100')).toBeInTheDocument();
    });

    it('should populate form fields with existing score data', () => {
      render(
        <ScoreEditForm
          score={mockScore}
          onUpdate={mockOnUpdate}
          onFinalize={mockOnFinalize}
        />
      );

      expect(screen.getByDisplayValue('20')).toBeInTheDocument(); // cage condition score
      expect(screen.getByDisplayValue('Clean cage')).toBeInTheDocument();
      expect(screen.getByDisplayValue('22')).toBeInTheDocument(); // cat condition score
      expect(screen.getByDisplayValue('Healthy cat')).toBeInTheDocument();
    });
  });

  describe('form interactions', () => {
    it('should update total score when individual scores change', async () => {
      render(
        <ScoreEditForm
          score={mockScore}
          onUpdate={mockOnUpdate}
          onFinalize={mockOnFinalize}
        />
      );

      const cageScoreInput = screen.getByDisplayValue('20');
      fireEvent.change(cageScoreInput, { target: { value: '25' } });

      await waitFor(() => {
        expect(screen.getByText('Total Score: 88/100')).toBeInTheDocument();
      });
    });

    it('should show changes indicator when form is modified', async () => {
      render(
        <ScoreEditForm
          score={mockScore}
          onUpdate={mockOnUpdate}
          onFinalize={mockOnFinalize}
        />
      );

      const cageScoreInput = screen.getByDisplayValue('20');
      fireEvent.change(cageScoreInput, { target: { value: '25' } });

      await waitFor(() => {
        expect(screen.getByText('● Unsaved changes')).toBeInTheDocument();
      });
    });

    it('should validate score inputs', async () => {
      render(
        <ScoreEditForm
          score={mockScore}
          onUpdate={mockOnUpdate}
          onFinalize={mockOnFinalize}
        />
      );

      const cageScoreInput = screen.getByDisplayValue('20');
      fireEvent.change(cageScoreInput, { target: { value: '30' } }); // Invalid: > 25

      const updateButton = screen.getByText('Update Score');
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText(/must be between 0 and 25/)).toBeInTheDocument();
      });

      expect(mockOnUpdate).not.toHaveBeenCalled();
    });
  });

  describe('confirmation dialogs', () => {
    it('should show confirmation dialog when updating score', async () => {
      render(
        <ScoreEditForm
          score={mockScore}
          onUpdate={mockOnUpdate}
          onFinalize={mockOnFinalize}
        />
      );

      const cageScoreInput = screen.getByDisplayValue('20');
      fireEvent.change(cageScoreInput, { target: { value: '25' } });

      const updateButton = screen.getByText('Update Score');
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText('Confirm Score Update')).toBeInTheDocument();
        expect(screen.getByText(/modification #1/)).toBeInTheDocument();
      });
    });

    it('should show confirmation dialog when finalizing score', async () => {
      render(
        <ScoreEditForm
          score={mockScore}
          onUpdate={mockOnUpdate}
          onFinalize={mockOnFinalize}
        />
      );

      const finalizeButton = screen.getByText('Finalize Score');
      fireEvent.click(finalizeButton);

      await waitFor(() => {
        expect(screen.getByText('Finalize Score')).toBeInTheDocument();
        expect(screen.getByText(/only administrators can make changes/)).toBeInTheDocument();
      });
    });

    it('should require reason for finalized score modifications', async () => {
      render(
        <ScoreEditForm
          score={mockFinalizedScore}
          onUpdate={mockOnUpdate}
          onFinalize={mockOnFinalize}
          isAdmin={true}
        />
      );

      const cageScoreInput = screen.getByDisplayValue('20');
      fireEvent.change(cageScoreInput, { target: { value: '25' } });

      const updateButton = screen.getByText('Update Score');
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText('Reason for modification (required):')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('Confirm');
      expect(confirmButton).toBeDisabled();

      const reasonTextarea = screen.getByPlaceholderText(/Please explain why/);
      fireEvent.change(reasonTextarea, { target: { value: 'Corrected scoring error' } });

      expect(confirmButton).not.toBeDisabled();
    });

    it('should call onUpdate with reason when confirmed', async () => {
      render(
        <ScoreEditForm
          score={mockFinalizedScore}
          onUpdate={mockOnUpdate}
          onFinalize={mockOnFinalize}
          isAdmin={true}
        />
      );

      const cageScoreInput = screen.getByDisplayValue('20');
      fireEvent.change(cageScoreInput, { target: { value: '25' } });

      const updateButton = screen.getByText('Update Score');
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText('Reason for modification (required):')).toBeInTheDocument();
      });

      const reasonTextarea = screen.getByPlaceholderText(/Please explain why/);
      fireEvent.change(reasonTextarea, { target: { value: 'Corrected scoring error' } });

      const confirmButton = screen.getByText('Confirm');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith(
          'score-123',
          expect.objectContaining({
            cageConditionScore: 25,
            modificationReason: 'Corrected scoring error',
          }),
          'Corrected scoring error'
        );
      });
    });
  });

  describe('permissions', () => {
    it('should disable form when canEdit is false', () => {
      render(
        <ScoreEditForm
          score={mockScore}
          onUpdate={mockOnUpdate}
          onFinalize={mockOnFinalize}
          canEdit={false}
        />
      );

      const cageScoreInput = screen.getByDisplayValue('20');
      expect(cageScoreInput).toBeDisabled();

      expect(screen.queryByText('Update Score')).not.toBeInTheDocument();
      expect(screen.getByText(/You do not have permission/)).toBeInTheDocument();
    });

    it('should disable form for finalized scores when not admin', () => {
      render(
        <ScoreEditForm
          score={mockFinalizedScore}
          onUpdate={mockOnUpdate}
          onFinalize={mockOnFinalize}
          canEdit={true}
          isAdmin={false}
        />
      );

      const cageScoreInput = screen.getByDisplayValue('20');
      expect(cageScoreInput).toBeDisabled();

      expect(screen.queryByText('Update Score')).not.toBeInTheDocument();
      expect(screen.getByText(/has been finalized and can only be modified by administrators/)).toBeInTheDocument();
    });

    it('should allow editing finalized scores when admin', () => {
      render(
        <ScoreEditForm
          score={mockFinalizedScore}
          onUpdate={mockOnUpdate}
          onFinalize={mockOnFinalize}
          canEdit={true}
          isAdmin={true}
        />
      );

      const cageScoreInput = screen.getByDisplayValue('20');
      expect(cageScoreInput).not.toBeDisabled();

      expect(screen.getByText('Update Score')).toBeInTheDocument();
    });

    it('should not show finalize button for already finalized scores', () => {
      render(
        <ScoreEditForm
          score={mockFinalizedScore}
          onUpdate={mockOnUpdate}
          onFinalize={mockOnFinalize}
          canEdit={true}
          isAdmin={true}
        />
      );

      expect(screen.queryByText('Finalize Score')).not.toBeInTheDocument();
    });
  });

  describe('reset functionality', () => {
    it('should show reset button when there are changes', async () => {
      render(
        <ScoreEditForm
          score={mockScore}
          onUpdate={mockOnUpdate}
          onFinalize={mockOnFinalize}
        />
      );

      const cageScoreInput = screen.getByDisplayValue('20');
      fireEvent.change(cageScoreInput, { target: { value: '25' } });

      await waitFor(() => {
        const resetButton = screen.getByText('Reset Changes');
        expect(resetButton).not.toBeDisabled();
      });
    });

    it('should disable reset button when no changes', () => {
      render(
        <ScoreEditForm
          score={mockScore}
          onUpdate={mockOnUpdate}
          onFinalize={mockOnFinalize}
        />
      );

      const resetButton = screen.getByText('Reset Changes');
      expect(resetButton).toBeDisabled();
    });

    it('should reset form to original values when confirmed', async () => {
      render(
        <ScoreEditForm
          score={mockScore}
          onUpdate={mockOnUpdate}
          onFinalize={mockOnFinalize}
        />
      );

      const cageScoreInput = screen.getByDisplayValue('20');
      fireEvent.change(cageScoreInput, { target: { value: '25' } });

      await waitFor(() => {
        expect(screen.getByText('Total Score: 88/100')).toBeInTheDocument();
      });

      const resetButton = screen.getByText('Reset Changes');
      fireEvent.click(resetButton);

      await waitFor(() => {
        expect(screen.getAllByText('Reset Changes')).toHaveLength(2); // Button and dialog title
      });

      const confirmButton = screen.getByText('Confirm');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText('Total Score: 83/100')).toBeInTheDocument();
        expect(screen.getByDisplayValue('20')).toBeInTheDocument();
      });
    });
  });
});