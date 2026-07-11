import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FitShowScoreEditForm } from '../FitShowScoreEditForm';
import { FitShowScore } from '../../types/scoring';

// Mock the scoring components
vi.mock('../AppearanceScoring', () => ({
  AppearanceScoring: ({ onScoreChange, onCommentsChange }: any) => (
    <div data-testid="appearance-scoring">
      <input
        data-testid="attire-input"
        onChange={(e) => onScoreChange('attire', parseInt(e.target.value))}
      />
      <textarea
        data-testid="appearance-comments"
        onChange={(e) => onCommentsChange(e.target.value)}
      />
    </div>
  )
}));

vi.mock('../HandlingScoring', () => ({
  HandlingScoring: ({ onScoreChange, onCommentsChange }: any) => (
    <div data-testid="handling-scoring">
      <input
        data-testid="control-equipment-input"
        onChange={(e) => onScoreChange('controlEquipment', parseInt(e.target.value))}
      />
      <textarea
        data-testid="handling-comments"
        onChange={(e) => onCommentsChange(e.target.value)}
      />
    </div>
  )
}));

vi.mock('../DemonstrationScoring', () => ({
  DemonstrationScoring: ({ onScoreChange, onCommentsChange }: any) => (
    <div data-testid="demonstration-scoring">
      <input
        data-testid="head-shape-input"
        onChange={(e) => onScoreChange('showingHeadShape', parseInt(e.target.value))}
      />
      <textarea
        data-testid="demonstration-comments"
        onChange={(e) => onCommentsChange(e.target.value)}
      />
    </div>
  )
}));

vi.mock('../HealthExaminationScoring', () => ({
  HealthExaminationScoring: ({ onScoreChange, onCommentsChange }: any) => (
    <div data-testid="health-examination-scoring">
      <input
        data-testid="mouth-teeth-gums-input"
        onChange={(e) => onScoreChange('showingMouthTeethGums', parseInt(e.target.value))}
      />
      <textarea
        data-testid="health-examination-comments"
        onChange={(e) => onCommentsChange(e.target.value)}
      />
    </div>
  )
}));

vi.mock('../GroomingCareScoring', () => ({
  GroomingCareScoring: ({ onScoreChange, onCommentsChange }: any) => (
    <div data-testid="grooming-care-scoring">
      <input
        data-testid="belly-coat-input"
        onChange={(e) => onScoreChange('showingBellyCoatCleanliness', parseInt(e.target.value))}
      />
      <textarea
        data-testid="grooming-care-comments"
        onChange={(e) => onCommentsChange(e.target.value)}
      />
    </div>
  )
}));

vi.mock('../KnowledgeScoring', () => ({
  KnowledgeScoring: ({ onScoreChange, onCommentsChange }: any) => (
    <div data-testid="knowledge-scoring">
      <input
        data-testid="general-knowledge-input"
        onChange={(e) => onScoreChange('generalKnowledge', parseInt(e.target.value))}
      />
      <textarea
        data-testid="knowledge-comments"
        onChange={(e) => onCommentsChange(e.target.value)}
      />
    </div>
  )
}));

const mockFitShowScore: FitShowScore = {
  id: 'test-score-1',
  catId: 'cat-1',
  participantName: 'John Doe',
  judgeId: 'judge-1',
  judgeName: 'Judge Smith',
  
  // Appearance & Demeanor
  attire: 8,
  attentive: 4,
  courteous: 5,
  
  // Handling & Control
  controlEquipment: 9,
  pickupCarrying: 3,
  
  // Demonstration Skills
  showingHeadShape: 3,
  showingBodyType: 4,
  showingTail: 3,
  showingCoatTexture: 4,
  
  // Health Examination
  showingMouthTeethGums: 2,
  conditionMouthTeethGums: 2,
  showingNose: 2,
  showingEyes: 2,
  conditionNoseEyes: 2,
  showingEars: 2,
  earsClean: 2,
  showingToenailsClaws: 3,
  toenailsClipped: 5,
  
  // Grooming & Care
  showingBellyCoatCleanliness: 3,
  coatCleanWellGroomed: 7,
  catHealthCare: 3,
  
  // Knowledge
  generalKnowledge: 3,
  catBreedsShowing: 3,
  catAnatomy: 3,
  fourHKnowledge: 3,
  
  // Calculated totals
  appearanceTotal: 17,
  handlingTotal: 12,
  demonstrationTotal: 14,
  healthExaminationTotal: 22,
  groomingCareTotal: 13,
  knowledgeTotal: 12,
  totalScore: 90,
  
  // Comments
  appearanceComments: 'Good presentation',
  handlingComments: 'Excellent control',
  demonstrationComments: 'Clear demonstrations',
  healthExaminationComments: 'Thorough examination',
  groomingCareComments: 'Well groomed cat',
  knowledgeComments: 'Strong knowledge base',
  
  // Metadata
  createdAt: '2024-01-01T10:00:00Z',
  updatedAt: '2024-01-01T10:00:00Z',
  isFinalized: false,
  modificationCount: 0,
  lastModifiedBy: 'judge-1',
  lastModifiedAt: '2024-01-01T10:00:00Z'
};

describe('FitShowScoreEditForm', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form with participant information', () => {
    render(
      <FitShowScoreEditForm
        score={mockFitShowScore}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Edit Fit and Show Score')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('cat-1')).toBeInTheDocument();
    expect(screen.getByText('Judge Smith')).toBeInTheDocument();
  });

  it('displays finalized warning for finalized scores', () => {
    const finalizedScore = { ...mockFitShowScore, isFinalized: true };
    
    render(
      <FitShowScoreEditForm
        score={finalizedScore}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(/This score has been finalized/)).toBeInTheDocument();
  });

  it('renders all scoring section components', () => {
    render(
      <FitShowScoreEditForm
        score={mockFitShowScore}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByTestId('appearance-scoring')).toBeInTheDocument();
    expect(screen.getByTestId('handling-scoring')).toBeInTheDocument();
    expect(screen.getByTestId('demonstration-scoring')).toBeInTheDocument();
    expect(screen.getByTestId('health-examination-scoring')).toBeInTheDocument();
    expect(screen.getByTestId('grooming-care-scoring')).toBeInTheDocument();
    expect(screen.getByTestId('knowledge-scoring')).toBeInTheDocument();
  });

  it('displays the total score', () => {
    render(
      <FitShowScoreEditForm
        score={mockFitShowScore}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Total Score: 90 / 100')).toBeInTheDocument();
  });

  it('tracks modifications when scores are changed', async () => {
    const user = userEvent.setup();
    
    render(
      <FitShowScoreEditForm
        score={mockFitShowScore}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Change a score
    const attireInput = screen.getByTestId('attire-input');
    await user.clear(attireInput);
    await user.type(attireInput, '9');

    // Check that modifications are tracked
    await waitFor(() => {
      expect(screen.getByText(/Recent Modifications/)).toBeInTheDocument();
    });
  });

  it('recalculates totals when scores change', async () => {
    const user = userEvent.setup();
    
    render(
      <FitShowScoreEditForm
        score={mockFitShowScore}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Change attire score from 8 to 10
    const attireInput = screen.getByTestId('attire-input');
    await user.clear(attireInput);
    await user.type(attireInput, '10');

    // Total should increase by 2 (from 90 to 92)
    await waitFor(() => {
      expect(screen.getByText('Total Score: 92 / 100')).toBeInTheDocument();
    });
  });

  it('enables save button when changes are made', async () => {
    const user = userEvent.setup();
    
    render(
      <FitShowScoreEditForm
        score={mockFitShowScore}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const saveButton = screen.getByText('Save Changes');
    expect(saveButton).toBeDisabled();

    // Make a change
    const attireInput = screen.getByTestId('attire-input');
    await user.clear(attireInput);
    await user.type(attireInput, '9');

    await waitFor(() => {
      expect(saveButton).toBeEnabled();
    });
  });

  it('calls onSave with updated data when save is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <FitShowScoreEditForm
        score={mockFitShowScore}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Make a change
    const attireInput = screen.getByTestId('attire-input');
    await user.clear(attireInput);
    await user.type(attireInput, '10');

    // Click save
    const saveButton = screen.getByText('Save Changes');
    await waitFor(() => {
      expect(saveButton).toBeEnabled();
    });
    
    await user.click(saveButton);

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        attire: 10,
        appearanceTotal: 19, // 10 + 4 + 5
        totalScore: 92, // Original 90 + 2 increase
        modificationCount: 1,
        lastModifiedBy: 'current-judge'
      })
    );
  });

  it('shows confirmation dialog for finalized scores', async () => {
    const user = userEvent.setup();
    const finalizedScore = { ...mockFitShowScore, isFinalized: true };
    
    render(
      <FitShowScoreEditForm
        score={finalizedScore}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Make a change
    const attireInput = screen.getByTestId('attire-input');
    await user.clear(attireInput);
    await user.type(attireInput, '10');

    // Click save
    const saveButton = screen.getByText('Save Changes');
    await waitFor(() => {
      expect(saveButton).toBeEnabled();
    });
    
    await user.click(saveButton);

    // Should show confirmation dialog
    expect(screen.getByText('Confirm Modification')).toBeInTheDocument();
    expect(screen.getAllByText(/This score has been finalized/)).toHaveLength(2);
  });

  it('calls onCancel when cancel is clicked without changes', async () => {
    const user = userEvent.setup();
    
    render(
      <FitShowScoreEditForm
        score={mockFitShowScore}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('shows confirmation when canceling with unsaved changes', async () => {
    const user = userEvent.setup();
    
    // Mock window.confirm
    const mockConfirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    
    render(
      <FitShowScoreEditForm
        score={mockFitShowScore}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Make a change
    const attireInput = screen.getByTestId('attire-input');
    await user.clear(attireInput);
    await user.type(attireInput, '10');

    // Click cancel
    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(mockConfirm).toHaveBeenCalledWith(
      'You have unsaved changes. Are you sure you want to cancel?'
    );
    expect(mockOnCancel).toHaveBeenCalled();

    mockConfirm.mockRestore();
  });

  it('handles loading state', () => {
    render(
      <FitShowScoreEditForm
        score={mockFitShowScore}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        isLoading={true}
      />
    );

    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeDisabled();
  });

  it('updates comments when comment fields change', async () => {
    const user = userEvent.setup();
    
    render(
      <FitShowScoreEditForm
        score={mockFitShowScore}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Change appearance comments
    const appearanceComments = screen.getByTestId('appearance-comments');
    await user.clear(appearanceComments);
    await user.type(appearanceComments, 'Updated appearance comments');

    // Click save
    const saveButton = screen.getByText('Save Changes');
    await waitFor(() => {
      expect(saveButton).toBeEnabled();
    });
    
    await user.click(saveButton);

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        appearanceComments: 'Updated appearance comments'
      })
    );
  });
});