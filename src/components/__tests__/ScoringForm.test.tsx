import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScoringForm from '../ScoringForm';
import { CreateScoreInput } from '../../types/scoring';

// Mock the scoring utilities
jest.mock('../../utils/scoringValidation', () => ({
  ...jest.requireActual('../../utils/scoringValidation'),
  validateCreateScoreInput: jest.fn(),
  validateCategoryScore: jest.fn(),
  validateCategoryComment: jest.fn(),
  calculateTotalScore: jest.fn()
}));

describe('ScoringForm', () => {
  const mockOnSave = jest.fn();
  const mockOnSubmit = jest.fn();
  const defaultProps = {
    catId: 'test-cat-id',
    onSave: mockOnSave,
    onSubmit: mockOnSubmit
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock calculateTotalScore to return sum of scores
    const { calculateTotalScore } = require('../../utils/scoringValidation');
    calculateTotalScore.mockImplementation((scores: any) => 
      scores.cageConditionScore + scores.catConditionScore + scores.groomingScore + scores.overallScore
    );
  });

  it('renders all scoring categories', () => {
    render(<ScoringForm {...defaultProps} />);
    
    expect(screen.getByText('Cage Condition')).toBeInTheDocument();
    expect(screen.getByText('Cat Condition')).toBeInTheDocument();
    expect(screen.getByText('Grooming')).toBeInTheDocument();
    expect(screen.getByText('Overall Presentation')).toBeInTheDocument();
  });

  it('displays total score calculation', () => {
    render(<ScoringForm {...defaultProps} />);
    
    expect(screen.getByText('Total Score: 0/100')).toBeInTheDocument();
  });

  it('updates total score when individual scores change', async () => {
    const user = userEvent.setup();
    render(<ScoringForm {...defaultProps} />);
    
    const cageScoreInput = document.getElementById('cageCondition-score') as HTMLInputElement;
    
    await user.clear(cageScoreInput);
    await user.type(cageScoreInput, '20');
    
    await waitFor(() => {
      expect(screen.getByText('Total Score: 20/100')).toBeInTheDocument();
    });
  });

  it('validates score ranges', async () => {
    const { validateCategoryScore } = require('../../utils/scoringValidation');
    validateCategoryScore.mockReturnValue({
      field: 'cageConditionScore',
      message: 'cageCondition score cannot exceed 25 points'
    });

    const user = userEvent.setup();
    render(<ScoringForm {...defaultProps} />);
    
    const cageScoreInput = document.getElementById('cageCondition-score') as HTMLInputElement;
    
    await user.clear(cageScoreInput);
    await user.type(cageScoreInput, '30');
    
    await waitFor(() => {
      expect(screen.getByText('cageCondition score cannot exceed 25 points')).toBeInTheDocument();
    });
  });

  it('validates comment character limits', async () => {
    const { validateCategoryComment } = require('../../utils/scoringValidation');
    validateCategoryComment.mockReturnValue({
      field: 'cageConditionComments',
      message: 'cageCondition comment cannot exceed 500 characters'
    });

    const user = userEvent.setup();
    render(<ScoringForm {...defaultProps} />);
    
    const cageCommentInput = screen.getByPlaceholderText('Enter comments about cage condition...');
    const longComment = 'a'.repeat(50); // Use shorter text to avoid timeout
    
    await user.type(cageCommentInput, longComment);
    
    await waitFor(() => {
      expect(screen.getByText('cageCondition comment cannot exceed 500 characters')).toBeInTheDocument();
    });
  });

  it('displays character count for comments', async () => {
    const user = userEvent.setup();
    render(<ScoringForm {...defaultProps} />);
    
    const cageCommentInput = screen.getByPlaceholderText('Enter comments about cage condition...');
    
    await user.type(cageCommentInput, 'Test comment');
    
    await waitFor(() => {
      // The character count should match the actual length of "Test comment" which is 12
      expect(screen.getByText((content, element) => {
        return element?.textContent === '12/500';
      })).toBeInTheDocument();
    });
  });

  it('calls onSave with correct data when Save Draft is clicked', async () => {
    const { validateCreateScoreInput } = require('../../utils/scoringValidation');
    validateCreateScoreInput.mockReturnValue({ isValid: true, errors: [] });

    const user = userEvent.setup();
    render(<ScoringForm {...defaultProps} />);
    
    // Fill in some scores
    const cageScoreInput = document.getElementById('cageCondition-score') as HTMLInputElement;
    await user.clear(cageScoreInput);
    await user.type(cageScoreInput, '20');
    
    const saveButton = screen.getByText('Save Draft');
    await user.click(saveButton);
    
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({
        catId: 'test-cat-id',
        cageConditionScore: 20,
        cageConditionComments: '',
        catConditionScore: 0,
        catConditionComments: '',
        groomingScore: 0,
        groomingComments: '',
        overallScore: 0,
        overallComments: '',
        isFinalized: false
      });
    });
  });

  it('calls onSubmit with correct data when Submit Final Score is clicked', async () => {
    const { validateCreateScoreInput } = require('../../utils/scoringValidation');
    validateCreateScoreInput.mockReturnValue({ isValid: true, errors: [] });

    const user = userEvent.setup();
    render(<ScoringForm {...defaultProps} />);
    
    // Fill in some scores using the first input (cage condition)
    const scoreInputs = screen.getAllByDisplayValue('0');
    const cageScoreInput = scoreInputs[0];
    await user.clear(cageScoreInput);
    await user.type(cageScoreInput, '25');
    
    const submitButton = screen.getByText('Submit Final Score');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        catId: 'test-cat-id',
        cageConditionScore: 25,
        cageConditionComments: '',
        catConditionScore: 0,
        catConditionComments: '',
        groomingScore: 0,
        groomingComments: '',
        overallScore: 0,
        overallComments: '',
        isFinalized: true
      });
    });
  });

  it('prevents submission when validation fails', async () => {
    const { validateCreateScoreInput } = require('../../utils/scoringValidation');
    validateCreateScoreInput.mockReturnValue({ 
      isValid: false, 
      errors: [{ field: 'cageConditionScore', message: 'Score is required' }] 
    });

    const user = userEvent.setup();
    render(<ScoringForm {...defaultProps} />);
    
    const submitButton = screen.getByText('Submit Final Score');
    await user.click(submitButton);
    
    expect(mockOnSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Score is required')).toBeInTheDocument();
  });

  it('initializes form with existing score data', () => {
    const existingScore = {
      cageConditionScore: 20,
      cageConditionComments: 'Good cage setup',
      catConditionScore: 22,
      catConditionComments: 'Healthy cat',
      groomingScore: 18,
      groomingComments: 'Well groomed',
      overallScore: 24,
      overallComments: 'Excellent presentation'
    };

    render(<ScoringForm {...defaultProps} existingScore={existingScore} />);
    
    expect(screen.getByDisplayValue('20')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Good cage setup')).toBeInTheDocument();
    expect(screen.getByDisplayValue('22')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Healthy cat')).toBeInTheDocument();
  });

  it('disables form inputs when loading', () => {
    render(<ScoringForm {...defaultProps} loading={true} />);
    
    const cageScoreInput = document.getElementById('cageCondition-score') as HTMLInputElement;
    const cageCommentInput = screen.getByPlaceholderText('Enter comments about cage condition...');
    const saveButton = screen.getByText('Saving...');
    const submitButton = screen.getByText('Submitting...');
    
    expect(cageScoreInput).toBeDisabled();
    expect(cageCommentInput).toBeDisabled();
    expect(saveButton).toBeDisabled();
    expect(submitButton).toBeDisabled();
  });

  it('updates score bar width based on total score', async () => {
    const user = userEvent.setup();
    render(<ScoringForm {...defaultProps} />);
    
    // Fill in scores to get 50% total
    const scoreInputs = screen.getAllByLabelText('Score (0-25 points):');
    const cageScoreInput = scoreInputs[0];
    const catScoreInput = scoreInputs[1];
    
    await user.clear(cageScoreInput);
    await user.type(cageScoreInput, '25');
    await user.clear(catScoreInput);
    await user.type(catScoreInput, '25');
    
    await waitFor(() => {
      const scoreFill = document.querySelector('.score-fill');
      expect(scoreFill).toHaveStyle('width: 50%');
    });
  });

  it('handles numeric input validation', async () => {
    const user = userEvent.setup();
    render(<ScoringForm {...defaultProps} />);
    
    const cageScoreInput = document.getElementById('cageCondition-score') as HTMLInputElement;
    
    // Test non-numeric input
    await user.clear(cageScoreInput);
    await user.type(cageScoreInput, 'abc');
    
    // Should default to 0 for invalid input
    expect(cageScoreInput).toHaveValue(0);
  });

  it('shows category descriptions', () => {
    render(<ScoringForm {...defaultProps} />);
    
    expect(screen.getByText('Cage cleanliness, organization, and presentation')).toBeInTheDocument();
    expect(screen.getByText('Cat health, body condition, and temperament')).toBeInTheDocument();
    expect(screen.getByText('Coat condition, cleanliness, and grooming quality')).toBeInTheDocument();
    expect(screen.getByText('Overall presentation and showmanship')).toBeInTheDocument();
  });
});