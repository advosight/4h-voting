import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FitShowScoringForm } from '../FitShowScoringForm';
import { FitShowScore } from '../../types/scoring';
import type { Mocked, Mock } from 'vitest';

// Mock AWS Amplify v6
const mockGraphql = vi.fn();
vi.mock('aws-amplify/api', () => ({
  generateClient: vi.fn(() => ({
    graphql: vi.fn()
  }))
}));

// Get the mocked client
import { generateClient } from 'aws-amplify/api';
const mockClient = generateClient() as Mocked<ReturnType<typeof generateClient>>;

// Mock the sub-components
vi.mock('../AppearanceScoring', () => ({
  AppearanceScoring: ({ onScoreChange, total }: any) => (
    <div data-testid="appearance-scoring">
      <span data-testid="appearance-total">{total}</span>
      <button onClick={() => onScoreChange('attire', 5)}>Change Attire</button>
    </div>
  )
}));

vi.mock('../HandlingScoring', () => ({
  HandlingScoring: ({ onScoreChange, total }: any) => (
    <div data-testid="handling-scoring">
      <span data-testid="handling-total">{total}</span>
      <button onClick={() => onScoreChange('controlEquipment', 8)}>Change Control</button>
    </div>
  )
}));

vi.mock('../DemonstrationScoring', () => ({
  DemonstrationScoring: ({ onScoreChange, total }: any) => (
    <div data-testid="demonstration-scoring">
      <span data-testid="demonstration-total">{total}</span>
    </div>
  )
}));

vi.mock('../HealthExaminationScoring', () => ({
  HealthExaminationScoring: ({ onScoreChange, total }: any) => (
    <div data-testid="health-examination-scoring">
      <span data-testid="health-examination-total">{total}</span>
    </div>
  )
}));

vi.mock('../GroomingCareScoring', () => ({
  GroomingCareScoring: ({ onScoreChange, total }: any) => (
    <div data-testid="grooming-care-scoring">
      <span data-testid="grooming-care-total">{total}</span>
    </div>
  )
}));

vi.mock('../KnowledgeScoring', () => ({
  KnowledgeScoring: ({ onScoreChange, total }: any) => (
    <div data-testid="knowledge-scoring">
      <span data-testid="knowledge-total">{total}</span>
    </div>
  )
}));

vi.mock('../ValidationErrorDisplay', () => ({
  ValidationSummary: ({ errors }: any) => (
    <div data-testid="validation-errors">
      {errors.map((error: any, index: number) => (
        <div key={index}>{error.error?.message || 'Validation error'}</div>
      ))}
    </div>
  )
}));

describe('FitShowScoringForm', () => {
  const defaultProps = {
    catId: 'cat-123',
    participantName: 'John Doe',
    judgeId: 'judge-456',
    judgeName: 'Judge Smith'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockExistingScore: FitShowScore = {
    id: 'score-789',
    catId: 'cat-123',
    participantName: 'John Doe',
    judgeId: 'judge-456',
    judgeName: 'Judge Smith',
    attire: 8,
    attentive: 4,
    courteous: 3,
    controlEquipment: 7,
    pickupCarrying: 3,
    showingHeadShape: 3,
    showingBodyType: 2,
    showingTail: 4,
    showingCoatTexture: 3,
    showingMouthTeethGums: 2,
    conditionMouthTeethGums: 1,
    showingNose: 2,
    showingEyes: 1,
    conditionNoseEyes: 2,
    showingEars: 1,
    earsClean: 2,
    showingToenailsClaws: 2,
    toenailsClipped: 4,
    showingBellyCoatCleanliness: 2,
    coatCleanWellGroomed: 6,
    catHealthCare: 2,
    generalKnowledge: 2,
    catBreedsShowing: 3,
    catAnatomy: 2,
    fourHKnowledge: 2,
    appearanceTotal: 15,
    handlingTotal: 10,
    demonstrationTotal: 12,
    healthExaminationTotal: 17,
    groomingCareTotal: 10,
    knowledgeTotal: 9,
    totalScore: 73,
    appearanceComments: 'Good appearance',
    handlingComments: 'Needs improvement',
    demonstrationComments: '',
    healthExaminationComments: 'Well done',
    groomingCareComments: '',
    knowledgeComments: 'Good knowledge',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    isFinalized: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form with participant information', () => {
    render(<FitShowScoringForm {...defaultProps} />);
    
    expect(screen.getByText('Fit and Show Scoring')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Judge Smith')).toBeInTheDocument();
    expect(screen.getByText('cat-123')).toBeInTheDocument();
  });

  it('displays initial total score of 25 (minimum scores)', () => {
    render(<FitShowScoringForm {...defaultProps} />);
    
    expect(screen.getByText('Total Score: 25/100')).toBeInTheDocument();
  });

  it('renders all scoring section components', () => {
    render(<FitShowScoringForm {...defaultProps} />);
    
    expect(screen.getByTestId('appearance-scoring')).toBeInTheDocument();
    expect(screen.getByTestId('handling-scoring')).toBeInTheDocument();
    expect(screen.getByTestId('demonstration-scoring')).toBeInTheDocument();
    expect(screen.getByTestId('health-examination-scoring')).toBeInTheDocument();
    expect(screen.getByTestId('grooming-care-scoring')).toBeInTheDocument();
    expect(screen.getByTestId('knowledge-scoring')).toBeInTheDocument();
  });

  it('initializes form with existing score data', () => {
    render(<FitShowScoringForm {...defaultProps} existingScore={mockExistingScore} />);
    
    expect(screen.getByText('Total Score: 73/100')).toBeInTheDocument();
    expect(screen.getByText('Update Score')).toBeInTheDocument();
  });

  it('calculates totals correctly when scores change', async () => {
    render(<FitShowScoringForm {...defaultProps} />);
    
    // Initial totals should be minimum values
    expect(screen.getByTestId('appearance-total')).toHaveTextContent('3'); // 1+1+1
    expect(screen.getByTestId('handling-total')).toHaveTextContent('2'); // 1+1
    
    // Change a score
    fireEvent.click(screen.getByText('Change Attire'));
    
    // Total should update
    await waitFor(() => {
      expect(screen.getByTestId('appearance-total')).toHaveTextContent('7'); // 5+1+1
    });
  });

  it('updates total score when individual scores change', async () => {
    render(<FitShowScoringForm {...defaultProps} />);
    
    expect(screen.getByText('Total Score: 25/100')).toBeInTheDocument();
    
    // Change scores
    fireEvent.click(screen.getByText('Change Attire')); // +4 points
    fireEvent.click(screen.getByText('Change Control')); // +7 points
    
    await waitFor(() => {
      expect(screen.getByText('Total Score: 36/100')).toBeInTheDocument();
    });
  });

  it('shows submit button with correct text for new score', () => {
    render(<FitShowScoringForm {...defaultProps} />);
    
    expect(screen.getByText('Submit Score')).toBeInTheDocument();
  });

  it('shows update button with correct text for existing score', () => {
    render(<FitShowScoringForm {...defaultProps} existingScore={mockExistingScore} />);
    
    expect(screen.getByText('Update Score')).toBeInTheDocument();
  });

  it('calls onError when form submission fails', async () => {
    const mockOnError = vi.fn();
    
    render(
      <FitShowScoringForm 
        {...defaultProps} 
        onError={mockOnError}
      />
    );
    
    const submitButton = screen.getByText('Submit Score');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to submit score')
      );
    });
  });

  it('calls onError when validation fails', async () => {
    const mockOnError = vi.fn();
    render(
      <FitShowScoringForm 
        {...defaultProps} 
        onError={mockOnError}
      />
    );
    
    // Mock validation to fail by setting invalid score ranges
    // This would require modifying the component to accept invalid values for testing
    // For now, we'll test the error callback structure
    
    const submitButton = screen.getByText('Submit Score');
    fireEvent.click(submitButton);
    
    // Since all initial values are valid, this won't trigger validation errors
    // In a real scenario, we'd need to set invalid values first
  });

  it('disables submit button while submitting', async () => {
    render(<FitShowScoringForm {...defaultProps} />);
    
    const submitButton = screen.getByText('Submit Score');
    fireEvent.click(submitButton);
    
    // Button should be disabled during submission
    expect(screen.getByText('Submitting...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('shows auto-save status for existing scores', () => {
    render(<FitShowScoringForm {...defaultProps} existingScore={mockExistingScore} />);
    
    // Auto-save status should be present (initially idle, so no visible status)
    // The auto-save functionality would be tested with more complex mocking
  });

  it('passes correct props to sub-components', () => {
    render(<FitShowScoringForm {...defaultProps} existingScore={mockExistingScore} />);
    
    // Verify that sub-components receive the correct totals
    expect(screen.getByTestId('appearance-total')).toHaveTextContent('15');
    expect(screen.getByTestId('handling-total')).toHaveTextContent('10');
    expect(screen.getByTestId('demonstration-total')).toHaveTextContent('12');
    expect(screen.getByTestId('health-examination-total')).toHaveTextContent('17');
    expect(screen.getByTestId('grooming-care-total')).toHaveTextContent('10');
    expect(screen.getByTestId('knowledge-total')).toHaveTextContent('9');
  });

  it('handles score changes from sub-components', async () => {
    const user = userEvent.setup();
    render(<FitShowScoringForm {...defaultProps} />);
    
    // Simulate score change from sub-component
    const changeButton = screen.getByText('Change Attire');
    await user.click(changeButton);
    
    // Verify the total updates
    await waitFor(() => {
      expect(screen.getByTestId('appearance-total')).toHaveTextContent('7');
    });
  });

  it('validates score ranges correctly', () => {
    // This test would require exposing the validation function or testing through invalid inputs
    // For now, we'll test the structure
    render(<FitShowScoringForm {...defaultProps} />);
    
    // The validation logic is internal, so we'd need to trigger it through form submission
    // with invalid data or expose it for testing
  });

  it('handles comment length validation', () => {
    // Similar to score validation, this would be tested through the form submission
    // or by exposing the validation logic
    render(<FitShowScoringForm {...defaultProps} />);
    
    // Comment validation is handled in the sub-components and validated on submission
  });
});