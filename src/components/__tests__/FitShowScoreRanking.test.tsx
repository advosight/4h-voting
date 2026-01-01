import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FitShowScoreRanking } from '../FitShowScoreRanking';
import { FitShowScore } from '../../types/scoring';

const createMockScore = (overrides: Partial<FitShowScore>): FitShowScore => ({
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
  isFinalized: true,
  
  ...overrides
});

const mockScores: FitShowScore[] = [
  createMockScore({
    id: 'score-1',
    participantName: 'Alice Johnson',
    totalScore: 95,
    appearanceTotal: 19,
    handlingTotal: 14,
    demonstrationTotal: 16,
    healthExaminationTotal: 21,
    groomingCareTotal: 14,
    knowledgeTotal: 11
  }),
  createMockScore({
    id: 'score-2',
    participantName: 'Bob Smith',
    totalScore: 87,
    appearanceTotal: 17,
    handlingTotal: 12,
    demonstrationTotal: 14,
    healthExaminationTotal: 20,
    groomingCareTotal: 13,
    knowledgeTotal: 11
  }),
  createMockScore({
    id: 'score-3',
    participantName: 'Carol Davis',
    totalScore: 92,
    appearanceTotal: 18,
    handlingTotal: 13,
    demonstrationTotal: 15,
    healthExaminationTotal: 21,
    groomingCareTotal: 14,
    knowledgeTotal: 11
  }),
  createMockScore({
    id: 'score-4',
    participantName: 'David Wilson',
    totalScore: 78,
    isFinalized: false // This should be filtered out
  })
];

describe('FitShowScoreRanking', () => {
  it('displays no rankings message when no finalized scores exist', () => {
    const unfinalized = mockScores.map(score => ({ ...score, isFinalized: false }));
    render(<FitShowScoreRanking scores={unfinalized} />);
    
    expect(screen.getByText('No Rankings Available')).toBeInTheDocument();
    expect(screen.getByText('Rankings will appear once fit and show scores are finalized.')).toBeInTheDocument();
  });

  it('filters out non-finalized scores', () => {
    render(<FitShowScoreRanking scores={mockScores} />);
    
    // Should show 3 finalized scores, not 4
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    expect(screen.getByText('Carol Davis')).toBeInTheDocument();
    expect(screen.queryByText('David Wilson')).not.toBeInTheDocument();
  });

  it('displays scores ranked by total score by default', () => {
    render(<FitShowScoreRanking scores={mockScores} />);
    
    const participants = screen.getAllByText(/Alice Johnson|Bob Smith|Carol Davis/);
    
    // Should be in order: Alice (95), Carol (92), Bob (87)
    expect(participants[0]).toHaveTextContent('Alice Johnson');
    expect(participants[1]).toHaveTextContent('Carol Davis');
    expect(participants[2]).toHaveTextContent('Bob Smith');
  });

  it('displays correct rank badges', () => {
    render(<FitShowScoreRanking scores={mockScores} />);
    
    // Check rank numbers are displayed (there are multiple "3"s - rank badge and total participants)
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getAllByText('3')).toHaveLength(2); // Rank badge and total participants
  });

  it('displays correct scores and percentages', () => {
    render(<FitShowScoreRanking scores={mockScores} />);
    
    expect(screen.getByText('95/100')).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument();
    expect(screen.getByText('92/100')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(screen.getByText('87/100')).toBeInTheDocument();
    expect(screen.getByText('87%')).toBeInTheDocument();
  });

  it('displays percentile rankings', () => {
    render(<FitShowScoreRanking scores={mockScores} />);
    
    expect(screen.getByText('100th')).toBeInTheDocument(); // Alice - 1st place
    expect(screen.getByText('67th')).toBeInTheDocument();  // Carol - 2nd place
    expect(screen.getByText('33th')).toBeInTheDocument();  // Bob - 3rd place
  });

  it('changes sorting when category buttons are clicked', () => {
    render(<FitShowScoreRanking scores={mockScores} />);
    
    // Click on Appearance sorting
    fireEvent.click(screen.getByText('Appearance'));
    
    // Should now sort by appearance scores
    // Alice: 19/20, Carol: 18/20, Bob: 17/20
    const participants = screen.getAllByText(/Alice Johnson|Bob Smith|Carol Davis/);
    expect(participants[0]).toHaveTextContent('Alice Johnson');
    expect(participants[1]).toHaveTextContent('Carol Davis');
    expect(participants[2]).toHaveTextContent('Bob Smith');
  });

  it('highlights specified participant', () => {
    render(<FitShowScoreRanking scores={mockScores} highlightParticipant="Bob Smith" />);
    
    // Find the row containing Bob Smith and check if it has highlight classes
    const bobRow = screen.getByText('Bob Smith').closest('.px-4.py-4');
    expect(bobRow).toHaveClass('bg-purple-50', 'border-l-4', 'border-purple-500');
  });

  it('limits displayed scores when showTop is specified', () => {
    render(<FitShowScoreRanking scores={mockScores} showTop={2} />);
    
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('Carol Davis')).toBeInTheDocument();
    expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
    
    expect(screen.getByText('(Top 2 of 3)')).toBeInTheDocument();
  });

  it('displays category breakdown when showCategoryBreakdown is true', () => {
    render(<FitShowScoreRanking scores={mockScores} showCategoryBreakdown={true} />);
    
    expect(screen.getAllByText('Appearance')).toHaveLength(4); // Button + 3 participants
    expect(screen.getAllByText('Handling')).toHaveLength(4); // Button + 3 participants
    expect(screen.getAllByText('Demo')).toHaveLength(3); // Only in breakdown
    expect(screen.getAllByText('Health')).toHaveLength(3); // Only in breakdown
    expect(screen.getAllByText('Grooming')).toHaveLength(4); // Button + 3 participants
    expect(screen.getAllByText('Knowledge')).toHaveLength(4); // Button + 3 participants
  });

  it('displays statistics summary', () => {
    render(<FitShowScoreRanking scores={mockScores} />);
    
    expect(screen.getByText('Total Participants')).toBeInTheDocument();
    // There are multiple "3"s - rank badge and total participants count
    expect(screen.getAllByText('3')).toHaveLength(2);
    
    expect(screen.getByText('91')).toBeInTheDocument(); // Average Score (95+92+87)/3 = 91.33 rounded to 91
    expect(screen.getByText('Average Score')).toBeInTheDocument();
    
    expect(screen.getByText('95')).toBeInTheDocument(); // Highest Score
    expect(screen.getByText('Highest Score')).toBeInTheDocument();
    
    expect(screen.getByText('87')).toBeInTheDocument(); // Lowest Score
    expect(screen.getByText('Lowest Score')).toBeInTheDocument();
  });

  it('displays judge information for each score', () => {
    render(<FitShowScoreRanking scores={mockScores} />);
    
    expect(screen.getAllByText(/Judge: Judge Smith/)).toHaveLength(3);
  });

  it('applies correct rank badge colors', () => {
    render(<FitShowScoreRanking scores={mockScores} />);
    
    const firstPlace = screen.getByText('1').closest('div');
    expect(firstPlace).toHaveClass('bg-yellow-100', 'text-yellow-800');
    
    const secondPlace = screen.getByText('2').closest('div');
    expect(secondPlace).toHaveClass('bg-gray-100', 'text-gray-800');
    
    // Find the rank badge with "3" (not the statistics "3")
    const rankBadges = screen.getAllByText('3');
    const thirdPlaceRankBadge = rankBadges.find(el => 
      el.closest('.w-8.h-8.rounded-full')
    );
    expect(thirdPlaceRankBadge?.closest('div')).toHaveClass('bg-orange-100', 'text-orange-800');
  });

  it('sorts by different categories correctly', () => {
    render(<FitShowScoreRanking scores={mockScores} />);
    
    // Test Knowledge sorting (all have 11 points, so order should be by total score as tiebreaker)
    fireEvent.click(screen.getByText('Knowledge'));
    
    // Should still maintain relative order since knowledge scores are tied
    const participants = screen.getAllByText(/Alice Johnson|Bob Smith|Carol Davis/);
    expect(participants[0]).toHaveTextContent('Alice Johnson');
  });

  it('displays correct category scores when sorting by category', () => {
    render(<FitShowScoreRanking scores={mockScores} />);
    
    // Sort by handling
    fireEvent.click(screen.getByText('Handling'));
    
    // Should show handling scores instead of total scores
    expect(screen.getByText('14/14')).toBeInTheDocument(); // Alice's handling score
    expect(screen.getByText('13/14')).toBeInTheDocument(); // Carol's handling score
    expect(screen.getByText('12/14')).toBeInTheDocument(); // Bob's handling score
  });
});