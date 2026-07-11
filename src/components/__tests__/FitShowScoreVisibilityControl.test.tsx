import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FitShowScoreVisibilityControl } from '../FitShowScoreVisibilityControl';
import { FitShowScore } from '../../types/scoring';

const mockFitShowScore: FitShowScore = {
  id: 'test-score-1',
  catId: 'cat-1',
  participantName: 'John Doe',
  judgeId: 'judge-1',
  judgeName: 'Judge Smith',
  
  // Appearance & Demeanor (20 points)
  attire: 8,
  attentive: 4,
  courteous: 5,
  
  // Handling & Control (14 points)
  controlEquipment: 9,
  pickupCarrying: 3,
  
  // Demonstration Skills (16 points)
  showingHeadShape: 3,
  showingBodyType: 4,
  showingTail: 3,
  showingCoatTexture: 4,
  
  // Health Examination (21 points)
  showingMouthTeethGums: 2,
  conditionMouthTeethGums: 2,
  showingNose: 2,
  showingEyes: 2,
  conditionNoseEyes: 2,
  showingEars: 2,
  earsClean: 2,
  showingToenailsClaws: 3,
  toenailsClipped: 5,
  
  // Grooming & Care (14 points)
  showingBellyCoatCleanliness: 3,
  coatCleanWellGroomed: 7,
  catHealthCare: 3,
  
  // Knowledge (12 points)
  generalKnowledge: 3,
  catBreedsShowing: 2,
  catAnatomy: 3,
  fourHKnowledge: 3,
  
  // Calculated totals
  appearanceTotal: 17,
  handlingTotal: 12,
  demonstrationTotal: 14,
  healthExaminationTotal: 20,
  groomingCareTotal: 13,
  knowledgeTotal: 11,
  totalScore: 87,
  
  // Comments
  appearanceComments: 'Great presentation',
  handlingComments: 'Excellent control',
  demonstrationComments: 'Good demonstration',
  healthExaminationComments: 'Thorough examination',
  groomingCareComments: 'Well-groomed cat',
  knowledgeComments: 'Strong knowledge',
  
  // Metadata
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:30:00Z',
  isFinalized: true
};

describe('FitShowScoreVisibilityControl', () => {
  describe('Participant View', () => {
    it('displays visible status for finalized scores', () => {
      render(
        <FitShowScoreVisibilityControl 
          score={mockFitShowScore} 
          showParticipantView={true} 
        />
      );
      
      expect(screen.getByText('Score Visibility')).toBeInTheDocument();
      expect(screen.getByText(/has been finalized and is visible/)).toBeInTheDocument();
      expect(screen.getByText('Visible')).toBeInTheDocument();
    });

    it('displays pending status for non-finalized scores', () => {
      const unfinalized = { ...mockFitShowScore, isFinalized: false };
      
      render(
        <FitShowScoreVisibilityControl 
          score={unfinalized} 
          showParticipantView={true} 
        />
      );
      
      expect(screen.getByText(/is being reviewed and will be visible/)).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('does not show finalization controls in participant view', () => {
      render(
        <FitShowScoreVisibilityControl 
          score={mockFitShowScore} 
          showParticipantView={true}
          canModifyFinalization={true}
        />
      );
      
      expect(screen.queryByText('Finalize Score')).not.toBeInTheDocument();
      expect(screen.queryByText('Unfinalize')).not.toBeInTheDocument();
    });
  });

  describe('Judge/Admin View', () => {
    it('displays finalized status and controls for finalized scores', () => {
      render(
        <FitShowScoreVisibilityControl 
          score={mockFitShowScore} 
          canModifyFinalization={true}
        />
      );
      
      expect(screen.getByText('Score Status')).toBeInTheDocument();
      expect(screen.getByText(/is finalized and visible to the participant/)).toBeInTheDocument();
      expect(screen.getByText('Finalized')).toBeInTheDocument();
      expect(screen.getByText('Unfinalize')).toBeInTheDocument();
    });

    it('displays draft status and controls for non-finalized scores', () => {
      const unfinalized = { ...mockFitShowScore, isFinalized: false };
      
      render(
        <FitShowScoreVisibilityControl 
          score={unfinalized} 
          canModifyFinalization={true}
        />
      );
      
      expect(screen.getByText(/is in draft mode and not visible/)).toBeInTheDocument();
      expect(screen.getByText('Draft')).toBeInTheDocument();
      expect(screen.getByText('Finalize Score')).toBeInTheDocument();
    });

    it('displays last updated timestamp', () => {
      render(
        <FitShowScoreVisibilityControl 
          score={mockFitShowScore} 
          canModifyFinalization={true}
        />
      );
      
      expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    });

    it('shows warning for finalized scores', () => {
      render(
        <FitShowScoreVisibilityControl 
          score={mockFitShowScore} 
          canModifyFinalization={true}
        />
      );
      
      expect(screen.getByText(/currently visible to the participant/)).toBeInTheDocument();
    });

    it('does not show finalization buttons when canModifyFinalization is false', () => {
      render(
        <FitShowScoreVisibilityControl 
          score={mockFitShowScore} 
          canModifyFinalization={false}
        />
      );
      
      expect(screen.queryByText('Unfinalize')).not.toBeInTheDocument();
      expect(screen.queryByText('Finalize Score')).not.toBeInTheDocument();
    });
  });

  describe('Finalization Actions', () => {
    it('shows confirmation dialog when finalize button is clicked', () => {
      const unfinalized = { ...mockFitShowScore, isFinalized: false };
      
      render(
        <FitShowScoreVisibilityControl 
          score={unfinalized} 
          canModifyFinalization={true}
        />
      );
      
      fireEvent.click(screen.getByText('Finalize Score'));
      
      // Check for dialog content instead of duplicate title
      expect(screen.getByText(/Are you sure you want to finalize/)).toBeInTheDocument();
      expect(screen.getByText(/make the score visible to the participant/)).toBeInTheDocument();
      expect(screen.getByText('Yes, Finalize')).toBeInTheDocument();
    });

    it('shows confirmation dialog when unfinalize button is clicked', () => {
      render(
        <FitShowScoreVisibilityControl 
          score={mockFitShowScore} 
          canModifyFinalization={true}
        />
      );
      
      fireEvent.click(screen.getByText('Unfinalize'));
      
      expect(screen.getByText('Unfinalize Score')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to unfinalize/)).toBeInTheDocument();
      expect(screen.getByText(/hide the score from the participant/)).toBeInTheDocument();
    });

    it('calls onFinalize when finalize is confirmed', async () => {
      const mockOnFinalize = vi.fn().mockResolvedValue(undefined);
      const unfinalized = { ...mockFitShowScore, isFinalized: false };
      
      render(
        <FitShowScoreVisibilityControl 
          score={unfinalized} 
          canModifyFinalization={true}
          onFinalize={mockOnFinalize}
        />
      );
      
      fireEvent.click(screen.getByText('Finalize Score'));
      fireEvent.click(screen.getByText('Yes, Finalize'));
      
      await waitFor(() => {
        expect(mockOnFinalize).toHaveBeenCalledWith('test-score-1');
      });
    });

    it('calls onUnfinalize when unfinalize is confirmed', async () => {
      const mockOnUnfinalize = vi.fn().mockResolvedValue(undefined);
      
      render(
        <FitShowScoreVisibilityControl 
          score={mockFitShowScore} 
          canModifyFinalization={true}
          onUnfinalize={mockOnUnfinalize}
        />
      );
      
      fireEvent.click(screen.getByText('Unfinalize'));
      fireEvent.click(screen.getByText('Yes, Unfinalize'));
      
      await waitFor(() => {
        expect(mockOnUnfinalize).toHaveBeenCalledWith('test-score-1');
      });
    });

    it('cancels action when cancel button is clicked', () => {
      const unfinalized = { ...mockFitShowScore, isFinalized: false };
      
      render(
        <FitShowScoreVisibilityControl 
          score={unfinalized} 
          canModifyFinalization={true}
        />
      );
      
      fireEvent.click(screen.getByText('Finalize Score'));
      // Check for dialog content instead of duplicate title
      expect(screen.getByText(/Are you sure you want to finalize/)).toBeInTheDocument();
      
      fireEvent.click(screen.getByText('Cancel'));
      expect(screen.queryByText(/Are you sure you want to finalize/)).not.toBeInTheDocument();
    });

    it('shows processing state during finalization', async () => {
      const mockOnFinalize = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      const unfinalized = { ...mockFitShowScore, isFinalized: false };
      
      render(
        <FitShowScoreVisibilityControl 
          score={unfinalized} 
          canModifyFinalization={true}
          onFinalize={mockOnFinalize}
        />
      );
      
      fireEvent.click(screen.getByText('Finalize Score'));
      fireEvent.click(screen.getByText('Yes, Finalize'));
      
      expect(screen.getAllByText('Processing...')).toHaveLength(2); // Button and dialog
      
      await waitFor(() => {
        expect(mockOnFinalize).toHaveBeenCalled();
      });
    });

    it('disables buttons during processing', async () => {
      const mockOnFinalize = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      const unfinalized = { ...mockFitShowScore, isFinalized: false };
      
      render(
        <FitShowScoreVisibilityControl 
          score={unfinalized} 
          canModifyFinalization={true}
          onFinalize={mockOnFinalize}
        />
      );
      
      const finalizeButton = screen.getByText('Finalize Score');
      expect(finalizeButton).not.toBeDisabled();
      
      fireEvent.click(finalizeButton);
      fireEvent.click(screen.getByText('Yes, Finalize'));
      
      // Button should be disabled during processing
      const processingButtons = screen.getAllByText('Processing...');
      // Find the actual button element (not the div)
      const buttonElement = processingButtons.find(el => el.tagName === 'BUTTON');
      expect(buttonElement).toBeDisabled();
      
      await waitFor(() => {
        expect(mockOnFinalize).toHaveBeenCalled();
      });
    });

    it('handles errors during finalization gracefully', async () => {
      const mockOnFinalize = vi.fn().mockRejectedValue(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const unfinalized = { ...mockFitShowScore, isFinalized: false };
      
      render(
        <FitShowScoreVisibilityControl 
          score={unfinalized} 
          canModifyFinalization={true}
          onFinalize={mockOnFinalize}
        />
      );
      
      fireEvent.click(screen.getByText('Finalize Score'));
      fireEvent.click(screen.getByText('Yes, Finalize'));
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error updating finalization status:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });
  });
});