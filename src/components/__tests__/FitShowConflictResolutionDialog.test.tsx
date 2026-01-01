import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FitShowConflictResolutionDialog, { FitShowScoreConflict } from '../FitShowConflictResolutionDialog';
import { FitShowScore } from '../../types/scoring';

describe('FitShowConflictResolutionDialog', () => {
  const mockServerScore: FitShowScore = {
    id: 'score123',
    catId: 'cat123',
    participantName: 'John Doe',
    judgeId: 'judge123',
    judgeName: 'Judge Smith',
    totalScore: 85,
    isFinalized: true,
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T11:00:00Z',
    // Score fields
    attire: 8,
    attentive: 4,
    courteous: 5,
    controlEquipment: 7,
    pickupCarrying: 3,
    showingHeadShape: 4,
    showingBodyType: 3,
    showingTail: 4,
    showingCoatTexture: 3,
    showingMouthTeethGums: 2,
    conditionMouthTeethGums: 2,
    showingNose: 2,
    showingEyes: 2,
    conditionNoseEyes: 2,
    showingEars: 2,
    earsClean: 2,
    showingToenailsClaws: 3,
    toenailsClipped: 5,
    showingBellyCoatCleanliness: 3,
    coatCleanWellGroomed: 7,
    catHealthCare: 3,
    generalKnowledge: 3,
    catBreedsShowing: 3,
    catAnatomy: 3,
    fourHKnowledge: 3,
    // Calculated totals
    appearanceTotal: 17,
    handlingTotal: 10,
    demonstrationTotal: 14,
    healthExaminationTotal: 21,
    groomingCareTotal: 13,
    knowledgeTotal: 12,
    // Comments
    appearanceComments: 'Server appearance comment',
    handlingComments: 'Server handling comment'
  };

  const mockLocalScore = {
    attire: 9,
    appearanceComments: 'Local appearance comment',
    isFinalized: false
  };

  const mockConflict: FitShowScoreConflict = {
    scoreId: 'score123',
    participantName: 'John Doe',
    localVersion: mockLocalScore,
    serverVersion: mockServerScore,
    conflictFields: ['attire', 'appearanceComments', 'isFinalized'],
    lastModifiedBy: 'Another Judge',
    lastModifiedAt: '2024-01-01T11:00:00Z'
  };

  const mockProps = {
    conflict: mockConflict,
    onResolve: jest.fn(),
    onCancel: jest.fn(),
    isOpen: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render nothing when not open', () => {
    const { container } = render(
      <FitShowConflictResolutionDialog {...mockProps} isOpen={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render nothing when no conflict', () => {
    const { container } = render(
      <FitShowConflictResolutionDialog {...mockProps} conflict={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should display conflict information', () => {
    render(<FitShowConflictResolutionDialog {...mockProps} />);
    
    expect(screen.getByText('Resolve Fit & Show Score Conflict')).toBeInTheDocument();
    expect(screen.getByText(/The fit & show score for John Doe has been modified/)).toBeInTheDocument();
    expect(screen.getByText('Last modified by: Another Judge')).toBeInTheDocument();
  });

  it('should display resolution strategy options', () => {
    render(<FitShowConflictResolutionDialog {...mockProps} />);
    
    expect(screen.getByText('Keep my changes (discard server changes)')).toBeInTheDocument();
    expect(screen.getByText('Use server version (discard my changes)')).toBeInTheDocument();
    expect(screen.getByText('Merge changes (choose field by field)')).toBeInTheDocument();
  });

  it('should default to merge strategy', () => {
    render(<FitShowConflictResolutionDialog {...mockProps} />);
    
    const mergeRadio = screen.getByDisplayValue('merge');
    expect(mergeRadio).toBeChecked();
  });

  it('should show field comparisons when merge is selected', () => {
    render(<FitShowConflictResolutionDialog {...mockProps} />);
    
    expect(screen.getByText('Conflicting Fields (3)')).toBeInTheDocument();
    expect(screen.getByText('Neat, Clean, Appropriate Attire')).toBeInTheDocument();
    expect(screen.getByText('Appearance Comments')).toBeInTheDocument();
    expect(screen.getByText('Finalized Status')).toBeInTheDocument();
  });

  it('should hide field comparisons when other strategies are selected', () => {
    render(<FitShowConflictResolutionDialog {...mockProps} />);
    
    const keepLocalRadio = screen.getByDisplayValue('keep-local');
    fireEvent.click(keepLocalRadio);
    
    expect(screen.queryByText('Conflicting Fields')).not.toBeInTheDocument();
  });

  it('should display local and server values for each field', () => {
    render(<FitShowConflictResolutionDialog {...mockProps} />);
    
    // Check attire field values
    expect(screen.getByText('9')).toBeInTheDocument(); // Local value
    expect(screen.getByText('8')).toBeInTheDocument(); // Server value
    
    // Check comment field values
    expect(screen.getByText('Local appearance comment')).toBeInTheDocument();
    expect(screen.getByText('Server appearance comment')).toBeInTheDocument();
    
    // Check boolean field values
    expect(screen.getByText('No')).toBeInTheDocument(); // Local isFinalized: false
    expect(screen.getByText('Yes')).toBeInTheDocument(); // Server isFinalized: true
  });

  it('should allow field-level selection in merge mode', () => {
    render(<FitShowConflictResolutionDialog {...mockProps} />);
    
    // Select server version for attire field
    const attireServerRadio = screen.getAllByDisplayValue('server')[0];
    fireEvent.click(attireServerRadio);
    
    expect(attireServerRadio).toBeChecked();
  });

  it('should call onResolve with keep-local strategy', () => {
    render(<FitShowConflictResolutionDialog {...mockProps} />);
    
    const keepLocalRadio = screen.getByDisplayValue('keep-local');
    fireEvent.click(keepLocalRadio);
    
    const resolveButton = screen.getByText('Resolve Conflict');
    fireEvent.click(resolveButton);
    
    expect(mockProps.onResolve).toHaveBeenCalledWith('keep-local');
  });

  it('should call onResolve with use-server strategy', () => {
    render(<FitShowConflictResolutionDialog {...mockProps} />);
    
    const useServerRadio = screen.getByDisplayValue('use-server');
    fireEvent.click(useServerRadio);
    
    const resolveButton = screen.getByText('Resolve Conflict');
    fireEvent.click(resolveButton);
    
    expect(mockProps.onResolve).toHaveBeenCalledWith('use-server');
  });

  it('should call onResolve with merge strategy and merged data', () => {
    render(<FitShowConflictResolutionDialog {...mockProps} />);
    
    // Keep merge strategy (default)
    // Select server version for attire field
    const attireServerRadio = screen.getAllByDisplayValue('server')[0];
    fireEvent.click(attireServerRadio);
    
    const resolveButton = screen.getByText('Resolve Conflict');
    fireEvent.click(resolveButton);
    
    expect(mockProps.onResolve).toHaveBeenCalledWith('merge', expect.objectContaining({
      attire: 8, // Server value
      appearanceComments: 'Local appearance comment', // Local value (default)
      isFinalized: false // Local value (default)
    }));
  });

  it('should call onCancel when cancel button is clicked', () => {
    render(<FitShowConflictResolutionDialog {...mockProps} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(mockProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('should format long comments with ellipsis', () => {
    const longComment = 'a'.repeat(60);
    const conflictWithLongComment = {
      ...mockConflict,
      serverVersion: {
        ...mockServerScore,
        appearanceComments: longComment
      }
    };

    render(
      <FitShowConflictResolutionDialog 
        {...mockProps} 
        conflict={conflictWithLongComment} 
      />
    );
    
    expect(screen.getByText(`${'a'.repeat(50)}...`)).toBeInTheDocument();
  });

  it('should handle null and undefined values gracefully', () => {
    const conflictWithNullValues = {
      ...mockConflict,
      localVersion: {
        ...mockLocalScore,
        appearanceComments: null
      },
      serverVersion: {
        ...mockServerScore,
        appearanceComments: undefined
      }
    };

    render(
      <FitShowConflictResolutionDialog 
        {...mockProps} 
        conflict={conflictWithNullValues} 
      />
    );
    
    expect(screen.getAllByText('Not set')).toHaveLength(2);
  });

  it('should display field display names correctly', () => {
    render(<FitShowConflictResolutionDialog {...mockProps} />);
    
    expect(screen.getByText('Neat, Clean, Appropriate Attire')).toBeInTheDocument();
    expect(screen.getByText('Appearance Comments')).toBeInTheDocument();
    expect(screen.getByText('Finalized Status')).toBeInTheDocument();
  });

  it('should handle unknown field names', () => {
    const conflictWithUnknownField = {
      ...mockConflict,
      conflictFields: ['unknownField'],
      localVersion: { unknownField: 'local value' },
      serverVersion: { ...mockServerScore, unknownField: 'server value' }
    };

    render(
      <FitShowConflictResolutionDialog 
        {...mockProps} 
        conflict={conflictWithUnknownField} 
      />
    );
    
    expect(screen.getByText('unknownField')).toBeInTheDocument();
  });

  it('should apply visual styling to selected values', () => {
    render(<FitShowConflictResolutionDialog {...mockProps} />);
    
    // Local values should be selected by default
    const localValueDivs = screen.getAllByText('My Version');
    expect(localValueDivs).toHaveLength(3); // One for each conflict field
    
    // Check that the corresponding radio buttons are selected
    const localRadios = screen.getAllByDisplayValue('local');
    localRadios.forEach(radio => {
      expect(radio).toBeChecked();
    });
  });

  it('should update field selections when radio buttons are clicked', () => {
    render(<FitShowConflictResolutionDialog {...mockProps} />);
    
    // Initially all local values should be selected
    const localRadios = screen.getAllByDisplayValue('local');
    localRadios.forEach(radio => {
      expect(radio).toBeChecked();
    });
    
    // Click server radio for first field
    const serverRadios = screen.getAllByDisplayValue('server');
    fireEvent.click(serverRadios[0]);
    
    // First server radio should now be checked
    expect(serverRadios[0]).toBeChecked();
    // Other local radios should still be checked
    expect(localRadios[1]).toBeChecked();
    expect(localRadios[2]).toBeChecked();
  });
});