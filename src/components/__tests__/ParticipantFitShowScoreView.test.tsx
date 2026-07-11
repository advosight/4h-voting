import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ParticipantFitShowScoreView } from '../ParticipantFitShowScoreView';
import { FitShowScore } from '../../types/scoring';
import type { Mock } from 'vitest';

// Mock fetch
global.fetch = vi.fn();

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

const mockMultipleScores: FitShowScore[] = [
  mockFitShowScore,
  {
    ...mockFitShowScore,
    id: 'test-score-2',
    totalScore: 92,
    updatedAt: '2024-01-16T10:30:00Z',
    judgeName: 'Judge Johnson'
  }
];

describe('ParticipantFitShowScoreView', () => {
  beforeEach(() => {
    (fetch as Mock).mockClear();
  });

  it('displays loading state initially', () => {
    (fetch as Mock).mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<ParticipantFitShowScoreView catId="cat-1" />);
    
    expect(screen.getByText('Loading your fit and show scores...')).toBeInTheDocument();
  });

  it('displays no scores message when no finalized scores exist', async () => {
    (fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });

    render(<ParticipantFitShowScoreView catId="cat-1" />);

    await waitFor(() => {
      expect(screen.getByText('No Fit and Show Scores Yet')).toBeInTheDocument();
    });

    expect(screen.getByText(/fit and show judging is either in progress/)).toBeInTheDocument();
  });

  it('displays error message when fetch fails', async () => {
    (fetch as Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<ParticipantFitShowScoreView catId="cat-1" />);

    await waitFor(() => {
      expect(screen.getByText('Error Loading Scores')).toBeInTheDocument();
    });

    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('displays single score correctly', async () => {
    (fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockFitShowScore]
    });

    render(<ParticipantFitShowScoreView catId="cat-1" participantName="John Doe" />);

    await waitFor(() => {
      expect(screen.getByText("John Doe's Fit and Show Results")).toBeInTheDocument();
    });

    expect(screen.getByText('Latest Score')).toBeInTheDocument();
    expect(screen.getByText('Your Evaluation')).toBeInTheDocument();
    expect(screen.getAllByText('87/100')).toHaveLength(2);
  });

  it('displays multiple scores with statistics', async () => {
    (fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMultipleScores
    });

    render(<ParticipantFitShowScoreView catId="cat-1" />);

    await waitFor(() => {
      expect(screen.getByText('Your Fit and Show Results')).toBeInTheDocument();
    });

    // Should show latest score (92/100) - appears multiple times
    expect(screen.getAllByText('92/100')).toHaveLength(3); // Latest, Best, and detailed view
    expect(screen.getByText('Latest Score')).toBeInTheDocument();
    
    // Should show best score
    expect(screen.getByText('Best Score')).toBeInTheDocument();
    
    // Should show average score (89.5 rounded to 90)
    expect(screen.getByText('90/100')).toBeInTheDocument();
    expect(screen.getByText('Average Score')).toBeInTheDocument();
  });

  it('shows "View All Scores" button when multiple scores exist', async () => {
    (fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMultipleScores
    });

    render(<ParticipantFitShowScoreView catId="cat-1" />);

    await waitFor(() => {
      expect(screen.getByText('View All 2 Scores')).toBeInTheDocument();
    });
  });

  it('toggles between showing latest and all scores', async () => {
    (fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMultipleScores
    });

    render(<ParticipantFitShowScoreView catId="cat-1" />);

    await waitFor(() => {
      expect(screen.getByText('View All 2 Scores')).toBeInTheDocument();
    });

    // Click to show all scores
    fireEvent.click(screen.getByText('View All 2 Scores'));

    expect(screen.getByText('Show Latest Only')).toBeInTheDocument();
    expect(screen.getByText('All Evaluations')).toBeInTheDocument();

    // Click to show latest only
    fireEvent.click(screen.getByText('Show Latest Only'));

    expect(screen.getByText('View All 2 Scores')).toBeInTheDocument();
  });

  it('displays performance ranking information', async () => {
    (fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockFitShowScore]
    });

    render(<ParticipantFitShowScoreView catId="cat-1" />);

    await waitFor(() => {
      expect(screen.getByText('Performance Ranking')).toBeInTheDocument();
    });

    // Should show ranking based on score percentage
    expect(screen.getByText(/Ranked #\d+ out of \d+ participants/)).toBeInTheDocument();
  });

  it('displays performance insights', async () => {
    (fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockFitShowScore]
    });

    render(<ParticipantFitShowScoreView catId="cat-1" />);

    await waitFor(() => {
      expect(screen.getByText('Performance Insights')).toBeInTheDocument();
    });

    expect(screen.getByText(/Strongest area:/)).toBeInTheDocument();
  });

  it('displays help text about fit and show scoring', async () => {
    (fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockFitShowScore]
    });

    render(<ParticipantFitShowScoreView catId="cat-1" />);

    await waitFor(() => {
      expect(screen.getByText('About Fit and Show Scoring')).toBeInTheDocument();
    });

    expect(screen.getByText(/Fit and show judging evaluates your presentation skills/)).toBeInTheDocument();
  });

  it('filters out non-finalized scores', async () => {
    const scoresWithUnfinalized = [
      mockFitShowScore,
      { ...mockFitShowScore, id: 'unfinalized', isFinalized: false }
    ];

    (fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => scoresWithUnfinalized
    });

    render(<ParticipantFitShowScoreView catId="cat-1" />);

    await waitFor(() => {
      // Should only show the finalized score
      expect(screen.getAllByText('87/100')).toHaveLength(2); // One in summary, one in detailed view
    });

    // Should not show multiple scores UI since only one is finalized
    expect(screen.queryByText('View All 2 Scores')).not.toBeInTheDocument();
  });

  it('retries fetch when try again button is clicked', async () => {
    (fetch as Mock)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [mockFitShowScore]
      });

    render(<ParticipantFitShowScoreView catId="cat-1" />);

    await waitFor(() => {
      expect(screen.getByText('Error Loading Scores')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Try again'));

    await waitFor(() => {
      expect(screen.getAllByText('87/100')).toHaveLength(2); // One in summary, one in detailed view
    });
  });

  it('uses participant name in header when provided', async () => {
    (fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockFitShowScore]
    });

    render(<ParticipantFitShowScoreView catId="cat-1" participantName="Jane Smith" />);

    await waitFor(() => {
      expect(screen.getByText("Jane Smith's Fit and Show Results")).toBeInTheDocument();
    });
  });

  it('uses generic text when no participant name provided', async () => {
    (fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockFitShowScore]
    });

    render(<ParticipantFitShowScoreView catId="cat-1" />);

    await waitFor(() => {
      expect(screen.getByText('Your Fit and Show Results')).toBeInTheDocument();
    });
  });
});