import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClassScoreEditForm, { ClassScore, UpdateClassScoreInput } from '../ClassScoreEditForm';

// Mock class score data
const mockClassScore: ClassScore = {
  id: 'test-score-1',
  catId: 'cat-1',
  judgeId: 'judge-1',
  judgeName: 'Judge Smith',
  beautyScore: 12,
  beautyComments: 'Beautiful cat',
  personalityScore: 18,
  personalityComments: 'Very friendly',
  balanceProportionScore: 13,
  balanceProportionComments: 'Well proportioned',
  coatCleanGroomed: true,
  teethGumsHealthy: true,
  eyesNoseClear: true,
  earsCleanMiteFree: true,
  toenailsClipped: true,
  fleaIssues: false,
  healthGroomingComments: 'Excellent health',
  totalScore: 43,
  ribbonEligibility: 'Red',
  timestamp: '2024-01-15T10:00:00Z',
  isFinalized: false,
  modificationCount: 1,
  lastModifiedBy: 'Judge Smith',
  lastModifiedAt: '2024-01-15T10:00:00Z'
};

const mockFinalizedClassScore: ClassScore = {
  ...mockClassScore,
  id: 'test-score-2',
  isFinalized: true,
  modificationCount: 2
};

describe('ClassScoreEditForm', () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders form with class score data', () => {
    render(
      <ClassScoreEditForm
        classScore={mockClassScore}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByDisplayValue('12')).toBeInTheDocument(); // Beauty score
    expect(screen.getByDisplayValue('18')).toBeInTheDocument(); // Personality score
    expect(screen.getByDisplayValue('13')).toBeInTheDocument(); // Balance/Proportion score
    expect(screen.getByDisplayValue('Beautiful cat')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Very friendly')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Well proportioned')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Excellent health')).toBeInTheDocument();
  });

  it('displays modification history', () => {
    render(
      <ClassScoreEditForm
        classScore={mockClassScore}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(/Modifications: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Last modified by: Judge Smith/)).toBeInTheDocument();
  });

  it('shows finalized status for finalized scores', () => {
    render(
      <ClassScoreEditForm
        classScore={mockFinalizedClassScore}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('FINALIZED')).toBeInTheDocument();
  });

  it('calculates total score correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <ClassScoreEditForm
        classScore={mockClassScore}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Change beauty score
    const beautyInput = screen.getByLabelText(/Beauty Score/);
    await user.clear(beautyInput);
    await user.type(beautyInput, '15');

    // Total should update to 46 (15 + 18 + 13)
    expect(screen.getByText('Total Score: 46/50')).toBeInTheDocument();
  });

  it('calculates ribbon eligibility correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <ClassScoreEditForm
        classScore={mockClassScore}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Change scores to get Blue ribbon (45+ points)
    const beautyInput = screen.getByLabelText(/Beauty Score/);
    const personalityInput = screen.getByLabelText(/Personality Score/);
    
    await user.clear(beautyInput);
    await user.type(beautyInput, '15');
    await user.clear(personalityInput);
    await user.type(personalityInput, '20');

    // Total: 15 + 20 + 13 = 48, should be Blue ribbon
    expect(screen.getByText('Blue Ribbon')).toBeInTheDocument();
  });

  it('shows Red ribbon when health items fail', async () => {
    const user = userEvent.setup();
    
    render(
      <ClassScoreEditForm
        classScore={mockClassScore}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Uncheck a health item
    const coatCheckbox = screen.getByLabelText(/Coat is clean & well groomed/);
    await user.click(coatCheckbox);

    // Should show Red ribbon regardless of score
    expect(screen.getByText('Red Ribbon')).toBeInTheDocument();
  });

  it('shows Red ribbon when flea issues are present', async () => {
    const user = userEvent.setup();
    
    render(
      <ClassScoreEditForm
        classScore={mockClassScore}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Check flea issues
    const fleaCheckbox = screen.getByLabelText(/Flea or flea dirt issues/);
    await user.click(fleaCheckbox);

    // Should show Red ribbon regardless of score
    expect(screen.getByText('Red Ribbon')).toBeInTheDocument();
  });

  it('validates score ranges', async () => {
    const user = userEvent.setup();
    
    render(
      <ClassScoreEditForm
        classScore={mockClassScore}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Try to enter invalid beauty score
    const beautyInput = screen.getByLabelText(/Beauty Score/);
    await user.clear(beautyInput);
    await user.type(beautyInput, '20'); // Max is 15

    // Input should be constrained by max attribute
    expect(beautyInput).toHaveAttribute('max', '15');
  });

  it('validates comment lengths', async () => {
    const user = userEvent.setup();
    
    render(
      <ClassScoreEditForm
        classScore={mockClassScore}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const beautyComments = screen.getByLabelText(/Beauty Comments/);
    const longComment = 'a'.repeat(600); // Exceeds 500 char limit
    
    await user.clear(beautyComments);
    await user.type(beautyComments, longComment);

    // Should be limited by maxLength attribute
    expect(beautyComments).toHaveAttribute('maxLength', '500');
  });

  it('shows character count for comments', () => {
    render(
      <ClassScoreEditForm
        classScore={mockClassScore}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('12/500 characters')).toBeInTheDocument(); // Beauty comments
    expect(screen.getByText('13/500 characters')).toBeInTheDocument(); // Personality comments
    expect(screen.getByText('16/500 characters')).toBeInTheDocument(); // Balance comments
    expect(screen.getByText('16/1000 characters')).toBeInTheDocument(); // Health comments
  });

  it('detects changes and enables save button', async () => {
    const user = userEvent.setup();
    
    render(
      <ClassScoreEditForm
        classScore={mockClassScore}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const saveButton = screen.getByText('Save Changes');
    expect(saveButton).toBeDisabled();

    // Make a change
    const beautyInput = screen.getByLabelText(/Beauty Score/);
    await user.clear(beautyInput);
    await user.type(beautyInput, '14');

    expect(saveButton).toBeEnabled();
  });

  it('requires modification reason when changes are made', async () => {
    const user = userEvent.setup();
    
    render(
      <ClassScoreEditForm
        classScore={mockClassScore}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Make a change
    const beautyInput = screen.getByLabelText(/Beauty Score/);
    await user.clear(beautyInput);
    await user.type(beautyInput, '14');

    const reasonInput = screen.getByLabelText(/Reason for Modification/);
    expect(reasonInput).toBeRequired();
  });

  it('shows confirmation dialog for regular scores', async () => {
    const user = userEvent.setup();
    
    render(
      <ClassScoreEditForm
        classScore={mockClassScore}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Make changes
    const beautyInput = screen.getByLabelText(/Beauty Score/);
    await user.clear(beautyInput);
    await user.type(beautyInput, '14');

    const reasonInput = screen.getByLabelText(/Reason for Modification/);
    await user.type(reasonInput, 'Correcting score');

    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);

    expect(screen.getByText('Confirm Class Score Modification')).toBeInTheDocument();
    expect(screen.getByText('Reason: Correcting score')).toBeInTheDocument();
  });

  it('shows special dialog for finalized scores', async () => {
    const user = userEvent.setup();
    
    render(
      <ClassScoreEditForm
        classScore={mockFinalizedClassScore}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Make changes
    const beautyInput = screen.getByLabelText(/Beauty Score/);
    await user.clear(beautyInput);
    await user.type(beautyInput, '14');

    const reasonInput = screen.getByLabelText(/Reason for Modification/);
    await user.type(reasonInput, 'Admin correction');

    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);

    expect(screen.getByText('Modify Finalized Class Score')).toBeInTheDocument();
    expect(screen.getByText(/This class score has been finalized/)).toBeInTheDocument();
  });

  it('calls onSave with correct data when confirmed', async () => {
    const user = userEvent.setup();
    
    render(
      <ClassScoreEditForm
        classScore={mockClassScore}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Make changes
    const beautyInput = screen.getByLabelText(/Beauty Score/);
    await user.clear(beautyInput);
    await user.type(beautyInput, '14');

    const reasonInput = screen.getByLabelText(/Reason for Modification/);
    await user.type(reasonInput, 'Correcting score');

    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);

    const confirmButton = screen.getByText('Confirm Save');
    await user.click(confirmButton);

    expect(mockOnSave).toHaveBeenCalledWith(mockClassScore.id, {
      beautyScore: 14,
      beautyComments: 'Beautiful cat',
      personalityScore: 18,
      personalityComments: 'Very friendly',
      balanceProportionScore: 13,
      balanceProportionComments: 'Well proportioned',
      coatCleanGroomed: true,
      teethGumsHealthy: true,
      eyesNoseClear: true,
      earsCleanMiteFree: true,
      toenailsClipped: true,
      fleaIssues: false,
      healthGroomingComments: 'Excellent health',
      isFinalized: false,
      modificationReason: 'Correcting score'
    });
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <ClassScoreEditForm
        classScore={mockClassScore}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('shows loading state', () => {
    render(
      <ClassScoreEditForm
        classScore={mockClassScore}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        loading={true}
      />
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    
    // Form inputs should be disabled
    const beautyInput = screen.getByLabelText(/Beauty Score/);
    expect(beautyInput).toBeDisabled();
  });

  it('displays error message', () => {
    const errorMessage = 'Failed to save class score';
    
    render(
      <ClassScoreEditForm
        classScore={mockClassScore}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        error={errorMessage}
      />
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });
});