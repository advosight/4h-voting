import React from 'react';
import { render, screen } from '@testing-library/react';
import { FitShowScoreCard } from '../FitShowScoreCard';
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
  appearanceComments: 'Great presentation and professional attire',
  handlingComments: 'Excellent control of the cat',
  demonstrationComments: 'Good demonstration of anatomical features',
  healthExaminationComments: 'Thorough health examination',
  groomingCareComments: 'Cat was well-groomed',
  knowledgeComments: 'Strong knowledge of cats and 4H',
  
  // Metadata
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:30:00Z',
  isFinalized: true
};

describe('FitShowScoreCard', () => {
  it('renders score card with participant and judge information', () => {
    render(<FitShowScoreCard score={mockFitShowScore} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Judged by: Judge Smith')).toBeInTheDocument();
    expect(screen.getByText('87/100')).toBeInTheDocument();
    expect(screen.getByText('87%')).toBeInTheDocument();
  });

  it('displays finalized status when score is finalized', () => {
    render(<FitShowScoreCard score={mockFitShowScore} />);
    
    expect(screen.getByText('Finalized')).toBeInTheDocument();
  });

  it('does not display finalized status when score is not finalized', () => {
    const unfinalized = { ...mockFitShowScore, isFinalized: false };
    render(<FitShowScoreCard score={unfinalized} />);
    
    expect(screen.queryByText('Finalized')).not.toBeInTheDocument();
  });

  it('displays all category breakdowns with correct scores', () => {
    render(<FitShowScoreCard score={mockFitShowScore} />);
    
    // Check category headers
    expect(screen.getByText('Appearance & Demeanor')).toBeInTheDocument();
    expect(screen.getByText('Handling & Control')).toBeInTheDocument();
    expect(screen.getByText('Demonstration Skills')).toBeInTheDocument();
    expect(screen.getByText('Health Examination')).toBeInTheDocument();
    expect(screen.getByText('Grooming & Care')).toBeInTheDocument();
    expect(screen.getByText('Knowledge')).toBeInTheDocument();
    
    // Check category scores
    expect(screen.getByText('17/20 (85%)')).toBeInTheDocument();
    expect(screen.getByText('12/14 (86%)')).toBeInTheDocument();
    expect(screen.getByText('14/16 (88%)')).toBeInTheDocument();
    expect(screen.getByText('20/21 (95%)')).toBeInTheDocument();
    expect(screen.getByText('13/14 (93%)')).toBeInTheDocument();
    expect(screen.getByText('11/12 (92%)')).toBeInTheDocument();
  });

  it('displays individual scoring details within categories', () => {
    render(<FitShowScoreCard score={mockFitShowScore} />);
    
    // Check some individual scores
    expect(screen.getByText('Attire: 8/10')).toBeInTheDocument();
    expect(screen.getByText('Attentive: 4/5')).toBeInTheDocument();
    expect(screen.getByText('Courteous: 5/5')).toBeInTheDocument();
    expect(screen.getByText('Control & Equipment: 9/10')).toBeInTheDocument();
    expect(screen.getByText('Pickup & Carrying: 3/4')).toBeInTheDocument();
  });

  it('displays comments for each category', () => {
    render(<FitShowScoreCard score={mockFitShowScore} />);
    
    expect(screen.getByText('"Great presentation and professional attire"')).toBeInTheDocument();
    expect(screen.getByText('"Excellent control of the cat"')).toBeInTheDocument();
    expect(screen.getByText('"Good demonstration of anatomical features"')).toBeInTheDocument();
    expect(screen.getByText('"Thorough health examination"')).toBeInTheDocument();
    expect(screen.getByText('"Cat was well-groomed"')).toBeInTheDocument();
    expect(screen.getByText('"Strong knowledge of cats and 4H"')).toBeInTheDocument();
  });

  it('does not display comments when they are not provided', () => {
    const scoreWithoutComments = {
      ...mockFitShowScore,
      appearanceComments: undefined,
      handlingComments: undefined,
      demonstrationComments: undefined,
      healthExaminationComments: undefined,
      groomingCareComments: undefined,
      knowledgeComments: undefined
    };
    
    render(<FitShowScoreCard score={scoreWithoutComments} />);
    
    expect(screen.queryByText('"Great presentation and professional attire"')).not.toBeInTheDocument();
  });

  it('renders in compact mode when specified', () => {
    render(<FitShowScoreCard score={mockFitShowScore} compact={true} />);
    
    // Should still show basic info
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Judge: Judge Smith')).toBeInTheDocument();
    expect(screen.getByText('87/100')).toBeInTheDocument();
    
    // Should not show detailed category breakdowns
    expect(screen.queryByText('Appearance & Demeanor')).not.toBeInTheDocument();
    expect(screen.queryByText('Handling & Control')).not.toBeInTheDocument();
  });

  it('hides participant info when showParticipantInfo is false', () => {
    render(<FitShowScoreCard score={mockFitShowScore} showParticipantInfo={false} />);
    
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    expect(screen.getByText('Judged by: Judge Smith')).toBeInTheDocument();
  });

  it('hides judge info when showJudgeInfo is false', () => {
    render(<FitShowScoreCard score={mockFitShowScore} showJudgeInfo={false} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Judged by: Judge Smith')).not.toBeInTheDocument();
  });

  it('formats date correctly', () => {
    render(<FitShowScoreCard score={mockFitShowScore} />);
    
    // The exact format may vary based on locale, but should contain date elements
    const dateElement = screen.getByText(/Jan.*15.*2024/);
    expect(dateElement).toBeInTheDocument();
  });

  it('applies correct color coding for different score percentages', () => {
    // Test high score (90%+) - should be green
    const highScore = { ...mockFitShowScore, appearanceTotal: 19 }; // 95%
    const { rerender } = render(<FitShowScoreCard score={highScore} />);
    
    let scoreElement = screen.getByText('19/20 (95%)');
    expect(scoreElement).toHaveClass('text-green-600');
    
    // Test medium score (80-89%) - should be blue
    const mediumScore = { ...mockFitShowScore, appearanceTotal: 17 }; // 85%
    rerender(<FitShowScoreCard score={mediumScore} />);
    
    scoreElement = screen.getByText('17/20 (85%)');
    expect(scoreElement).toHaveClass('text-blue-600');
    
    // Test low score (70-79%) - should be yellow
    const lowScore = { ...mockFitShowScore, appearanceTotal: 15 }; // 75%
    rerender(<FitShowScoreCard score={lowScore} />);
    
    scoreElement = screen.getByText('15/20 (75%)');
    expect(scoreElement).toHaveClass('text-yellow-600');
    
    // Test very low score (<70%) - should be red
    const veryLowScore = { ...mockFitShowScore, appearanceTotal: 13 }; // 65%
    rerender(<FitShowScoreCard score={veryLowScore} />);
    
    scoreElement = screen.getByText('13/20 (65%)');
    expect(scoreElement).toHaveClass('text-red-600');
  });
});