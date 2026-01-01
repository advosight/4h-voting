import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ClassScoringForm from '../ClassScoringForm';
import { Cat, ClassScore } from '../../types/scoring';

// Mock cat data
const mockCat: Cat = {
  id: 'cat-1',
  name: 'Fluffy',
  owner: 'John Doe',
  cageNumber: 5,
  votes: 10
};

// Mock existing class score
const mockExistingClassScore: ClassScore = {
  id: 'score-1',
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
  timestamp: '2024-01-01T00:00:00Z',
  isFinalized: false
};

describe('ClassScoringForm', () => {
  const mockOnSave = jest.fn();
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders form with cat information', () => {
    render(
      <ClassScoringForm
        catData={mockCat}
        onSave={mockOnSave}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByText('Type Class Scoring Form')).toBeInTheDocument();
    expect(screen.getByText('Fluffy')).toBeInTheDocument();
    expect(screen.getByText('Owner: John Doe | Cage: 5')).toBeInTheDocument();
  });

  it('renders all scoring sections', () => {
    render(
      <ClassScoringForm
        catData={mockCat}
        onSave={mockOnSave}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByText("Cat's Beauty (0-15 points)")).toBeInTheDocument();
    expect(screen.getByText("Cat's Personality (0-20 points)")).toBeInTheDocument();
    expect(screen.getByText("Cat's Balance/Proportion (0-15 points)")).toBeInTheDocument();
    expect(screen.getByText('Health & Grooming Standards')).toBeInTheDocument();
  });

  it('renders health checklist items', () => {
    render(
      <ClassScoringForm
        catData={mockCat}
        onSave={mockOnSave}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByLabelText('Coat is clean & well groomed')).toBeInTheDocument();
    expect(screen.getByLabelText('Teeth/gums clean & healthy')).toBeInTheDocument();
    expect(screen.getByLabelText('Eyes & nose clear')).toBeInTheDocument();
    expect(screen.getByLabelText('Ears clean & free of mites')).toBeInTheDocument();
    expect(screen.getByLabelText('Toenails/claws clipped')).toBeInTheDocument();
    expect(screen.getByLabelText('Flea or flea dirt issues detected')).toBeInTheDocument();
  });

  it('populates form with existing class score data', () => {
    render(
      <ClassScoringForm
        catData={mockCat}
        existingClassScore={mockExistingClassScore}
        onSave={mockOnSave}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByDisplayValue('12')).toBeInTheDocument(); // beauty score
    expect(screen.getByDisplayValue('18')).toBeInTheDocument(); // personality score
    expect(screen.getByDisplayValue('13')).toBeInTheDocument(); // balance score
    expect(screen.getByDisplayValue('Beautiful cat')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Very friendly')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Well proportioned')).toBeInTheDocument();
  });

  it('calculates total score correctly', async () => {
    render(
      <ClassScoringForm
        catData={mockCat}
        onSave={mockOnSave}
        onSubmit={mockOnSubmit}
      />
    );

    const scoreInputs = screen.getAllByLabelText('Score:');
    const beautyInput = scoreInputs[0] as HTMLInputElement;
    const personalityInput = scoreInputs[1] as HTMLInputElement;
    const balanceInput = scoreInputs[2] as HTMLInputElement;

    fireEvent.change(beautyInput, { target: { value: '10' } });
    fireEvent.change(personalityInput, { target: { value: '15' } });
    fireEvent.change(balanceInput, { target: { value: '12' } });

    expect(screen.getByText('Total Score: 37/50')).toBeInTheDocument();
  });

  it('calculates ribbon eligibility correctly for Blue ribbon', async () => {
    render(
      <ClassScoringForm
        catData={mockCat}
        onSave={mockOnSave}
        onSubmit={mockOnSubmit}
      />
    );

    const scoreInputs = screen.getAllByLabelText('Score:');
    
    // Set scores for Blue ribbon (45+ points, all health passing)
    fireEvent.change(scoreInputs[0], { target: { value: '15' } }); // beauty
    fireEvent.change(scoreInputs[1], { target: { value: '20' } }); // personality
    fireEvent.change(scoreInputs[2], { target: { value: '10' } }); // balance

    expect(screen.getByText('Ribbon Eligibility: Blue Ribbon')).toBeInTheDocument();
  });

  it('calculates ribbon eligibility correctly for Red ribbon due to flea issues', async () => {
    render(
      <ClassScoringForm
        catData={mockCat}
        onSave={mockOnSave}
        onSubmit={mockOnSubmit}
      />
    );

    const scoreInputs = screen.getAllByLabelText('Score:');
    const fleaCheckbox = screen.getByLabelText('Flea or flea dirt issues detected');
    
    // Set high scores but mark flea issues
    fireEvent.change(scoreInputs[0], { target: { value: '15' } });
    fireEvent.change(scoreInputs[1], { target: { value: '20' } });
    fireEvent.change(scoreInputs[2], { target: { value: '15' } });

    fireEvent.click(fleaCheckbox);

    expect(screen.getByText('Ribbon Eligibility: Red Ribbon')).toBeInTheDocument();
    expect(screen.getByText('Note: This may result in Red Ribbon consideration')).toBeInTheDocument();
  });

  it('validates score ranges', async () => {
    render(
      <ClassScoringForm
        catData={mockCat}
        onSave={mockOnSave}
        onSubmit={mockOnSubmit}
      />
    );

    const beautyInput = screen.getAllByLabelText('Score:')[0];
    
    // Try to enter invalid score
    fireEvent.change(beautyInput, { target: { value: '20' } }); // Over max of 15

    const saveButton = screen.getByText('Save Draft');
    fireEvent.click(saveButton);

    expect(screen.getByText('Beauty score must be between 0 and 15')).toBeInTheDocument();
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('validates comment length limits', async () => {
    render(
      <ClassScoringForm
        catData={mockCat}
        onSave={mockOnSave}
        onSubmit={mockOnSubmit}
      />
    );

    const beautyComments = screen.getByPlaceholderText('Comments about the cat\'s beauty and appearance...');
    
    // Enter comment over limit
    const longComment = 'a'.repeat(501);
    fireEvent.change(beautyComments, { target: { value: longComment } });

    const saveButton = screen.getByText('Save Draft');
    fireEvent.click(saveButton);

    expect(screen.getByText('Beauty comments must be 500 characters or less')).toBeInTheDocument();
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('shows character count for comment fields', async () => {
    render(
      <ClassScoringForm
        catData={mockCat}
        onSave={mockOnSave}
        onSubmit={mockOnSubmit}
      />
    );

    const beautyComments = screen.getByPlaceholderText('Comments about the cat\'s beauty and appearance...');
    
    fireEvent.change(beautyComments, { target: { value: 'Test comment' } });

    expect(screen.getByText('12/500 characters')).toBeInTheDocument();
  });

  it('calls onSave with correct data when Save Draft is clicked', async () => {
    render(
      <ClassScoringForm
        catData={mockCat}
        onSave={mockOnSave}
        onSubmit={mockOnSubmit}
      />
    );

    const scoreInputs = screen.getAllByLabelText('Score:');
    
    fireEvent.change(scoreInputs[0], { target: { value: '10' } });
    fireEvent.change(scoreInputs[1], { target: { value: '15' } });
    fireEvent.change(scoreInputs[2], { target: { value: '12' } });

    const saveButton = screen.getByText('Save Draft');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          catId: 'cat-1',
          beautyScore: 10,
          personalityScore: 15,
          balanceProportionScore: 12,
          totalScore: 37,
          ribbonEligibility: 'Red',
          isFinalized: false
        })
      );
    });
  });

  it('calls onSubmit with correct data when Submit Final Score is clicked', async () => {
    render(
      <ClassScoringForm
        catData={mockCat}
        onSave={mockOnSave}
        onSubmit={mockOnSubmit}
      />
    );

    const scoreInputs = screen.getAllByLabelText('Score:');
    
    fireEvent.change(scoreInputs[0], { target: { value: '10' } });
    fireEvent.change(scoreInputs[1], { target: { value: '15' } });
    fireEvent.change(scoreInputs[2], { target: { value: '12' } });

    const submitButton = screen.getByText('Submit Final Score');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          catId: 'cat-1',
          beautyScore: 10,
          personalityScore: 15,
          balanceProportionScore: 12,
          totalScore: 37,
          ribbonEligibility: 'Red',
          isFinalized: true
        })
      );
    });
  });

  it('disables buttons when loading', () => {
    render(
      <ClassScoringForm
        catData={mockCat}
        onSave={mockOnSave}
        onSubmit={mockOnSubmit}
        isLoading={true}
      />
    );

    expect(screen.getByText('Saving...')).toBeDisabled();
    expect(screen.getByText('Submitting...')).toBeDisabled();
  });

  it('calculates White ribbon eligibility correctly', async () => {
    render(
      <ClassScoringForm
        catData={mockCat}
        onSave={mockOnSave}
        onSubmit={mockOnSubmit}
      />
    );

    const scoreInputs = screen.getAllByLabelText('Score:');
    
    // Set scores for White ribbon (25-34 points)
    fireEvent.change(scoreInputs[0], { target: { value: '10' } }); // beauty
    fireEvent.change(scoreInputs[1], { target: { value: '10' } }); // personality
    fireEvent.change(scoreInputs[2], { target: { value: '10' } }); // balance

    expect(screen.getByText('Ribbon Eligibility: White Ribbon')).toBeInTheDocument();
  });

  it('calculates Participation ribbon eligibility correctly', async () => {
    render(
      <ClassScoringForm
        catData={mockCat}
        onSave={mockOnSave}
        onSubmit={mockOnSubmit}
      />
    );

    const scoreInputs = screen.getAllByLabelText('Score:');
    
    // Set scores for Participation ribbon (below 25 points)
    fireEvent.change(scoreInputs[0], { target: { value: '5' } }); // beauty
    fireEvent.change(scoreInputs[1], { target: { value: '8' } }); // personality
    fireEvent.change(scoreInputs[2], { target: { value: '6' } }); // balance

    expect(screen.getByText('Ribbon Eligibility: Participation Ribbon')).toBeInTheDocument();
  });

  it('handles health checklist changes correctly', async () => {
    render(
      <ClassScoringForm
        catData={mockCat}
        onSave={mockOnSave}
        onSubmit={mockOnSubmit}
      />
    );

    const scoreInputs = screen.getAllByLabelText('Score:');
    const coatCheckbox = screen.getByLabelText('Coat is clean & well groomed');
    
    // Set high scores
    fireEvent.change(scoreInputs[0], { target: { value: '15' } });
    fireEvent.change(scoreInputs[1], { target: { value: '20' } });
    fireEvent.change(scoreInputs[2], { target: { value: '15' } });

    // Initially should be Blue ribbon
    expect(screen.getByText('Ribbon Eligibility: Blue Ribbon')).toBeInTheDocument();

    // Uncheck a health item
    fireEvent.click(coatCheckbox);

    // Should now be Red ribbon due to health failure
    expect(screen.getByText('Ribbon Eligibility: Red Ribbon')).toBeInTheDocument();
  });
});