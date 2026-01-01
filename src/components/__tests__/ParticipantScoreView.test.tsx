import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ParticipantScoreView from '../ParticipantScoreView';
import { Score } from '../../types/scoring';

// Mock data
const mockCat = {
  id: 'cat-1',
  name: 'Fluffy',
  owner: 'John Doe',
  cageNumber: 5
};

const mockScore: Score = {
  id: 'score-1',
  catId: 'cat-1',
  judgeId: 'judge-1',
  judgeName: 'Judge Smith',
  cageConditionScore: 20,
  cageConditionComments: 'Very clean cage',
  catConditionScore: 22,
  catConditionComments: 'Healthy and well-groomed cat',
  groomingScore: 18,
  groomingComments: 'Good grooming, could be better',
  overallScore: 23,
  overallComments: 'Excellent overall presentation',
  totalScore: 83,
  timestamp: '2024-01-15T10:30:00Z',
  isFinalized: true
};

const mockPendingScore: Score = {
  ...mockScore,
  id: 'score-2',
  judgeId: 'judge-2',
  judgeName: 'Judge Johnson',
  totalScore: 75,
  isFinalized: false
};

const mockAllScores: Score[] = [
  mockScore,
  { ...mockScore, id: 'score-3', catId: 'cat-2', totalScore: 90 },
  { ...mockScore, id: 'score-4', catId: 'cat-3', totalScore: 70 },
  { ...mockScore, id: 'score-5', catId: 'cat-4', totalScore: 85 }
];

describe('ParticipantScoreView', () => {
  const defaultProps = {
    catId: 'cat-1',
    scores: [mockScore],
    cat: mockCat,
    allScores: mockAllScores
  };

  it('renders loading state correctly', () => {
    render(
      <ParticipantScoreView
        {...defaultProps}
        loading={true}
      />
    );

    expect(screen.getByText('Loading scores...')).toBeInTheDocument();
  });

  it('renders error state correctly', () => {
    const errorMessage = 'Failed to load scores';
    render(
      <ParticipantScoreView
        {...defaultProps}
        error={errorMessage}
      />
    );

    expect(screen.getByText('Error Loading Scores')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('renders no scores state correctly', () => {
    render(
      <ParticipantScoreView
        {...defaultProps}
        scores={[]}
      />
    );

    expect(screen.getByText('Fluffy')).toBeInTheDocument();
    expect(screen.getByText('Owner: John Doe')).toBeInTheDocument();
    expect(screen.getByText('Cage: 5')).toBeInTheDocument();
    expect(screen.getByText('No Scores Available')).toBeInTheDocument();
    expect(screen.getByText('This cat has not been judged yet. Please check back later.')).toBeInTheDocument();
  });

  it('renders finalized scores correctly', () => {
    render(
      <ParticipantScoreView {...defaultProps} />
    );

    // Check cat information
    expect(screen.getByText('Fluffy')).toBeInTheDocument();
    expect(screen.getByText('Owner: John Doe')).toBeInTheDocument();
    expect(screen.getByText('Cage: 5')).toBeInTheDocument();

    // Check score section
    expect(screen.getByText('Final Scores')).toBeInTheDocument();
    expect(screen.getByText('Judge: Judge Smith')).toBeInTheDocument();
    expect(screen.getByText('83')).toBeInTheDocument();
    expect(screen.getByText('/ 100')).toBeInTheDocument();

    // Check category scores
    expect(screen.getByText('Cage Condition')).toBeInTheDocument();
    expect(screen.getByText('20 / 25')).toBeInTheDocument();
    expect(screen.getByText('Very clean cage')).toBeInTheDocument();

    expect(screen.getByText('Cat Condition')).toBeInTheDocument();
    expect(screen.getByText('22 / 25')).toBeInTheDocument();
    expect(screen.getByText('Healthy and well-groomed cat')).toBeInTheDocument();

    expect(screen.getByText('Grooming')).toBeInTheDocument();
    expect(screen.getByText('18 / 25')).toBeInTheDocument();
    expect(screen.getByText('Good grooming, could be better')).toBeInTheDocument();

    expect(screen.getByText('Overall Presentation')).toBeInTheDocument();
    expect(screen.getByText('23 / 25')).toBeInTheDocument();
    expect(screen.getByText('Excellent overall presentation')).toBeInTheDocument();
  });

  it('renders pending scores correctly', () => {
    render(
      <ParticipantScoreView
        {...defaultProps}
        scores={[mockPendingScore]}
      />
    );

    expect(screen.getByText('Preliminary Scores')).toBeInTheDocument();
    expect(screen.getByText('These scores are not yet finalized and may change.')).toBeInTheDocument();
    expect(screen.getByText('Judge: Judge Johnson')).toBeInTheDocument();
    expect(screen.getByText('Preliminary')).toBeInTheDocument();
    expect(screen.getByText('Judging in Progress')).toBeInTheDocument();
  });

  it('renders both finalized and pending scores', () => {
    render(
      <ParticipantScoreView
        {...defaultProps}
        scores={[mockScore, mockPendingScore]}
      />
    );

    expect(screen.getByText('Final Scores')).toBeInTheDocument();
    expect(screen.getByText('Preliminary Scores')).toBeInTheDocument();
    expect(screen.getByText('Judge: Judge Smith')).toBeInTheDocument();
    expect(screen.getByText('Judge: Judge Johnson')).toBeInTheDocument();
  });

  it('calculates and displays ranking correctly', async () => {
    render(
      <ParticipantScoreView {...defaultProps} />
    );

    await waitFor(() => {
      // Score of 83 should rank 3rd out of 4 (90, 85, 83, 70)
      expect(screen.getByText('#3')).toBeInTheDocument();
      expect(screen.getByText('out of 4 entries (50th percentile)')).toBeInTheDocument();
    });
  });

  it('handles missing comments gracefully', () => {
    const scoreWithoutComments: Score = {
      ...mockScore,
      cageConditionComments: undefined,
      catConditionComments: undefined,
      groomingComments: undefined,
      overallComments: undefined
    };

    render(
      <ParticipantScoreView
        {...defaultProps}
        scores={[scoreWithoutComments]}
      />
    );

    // Should still render category scores without comments
    expect(screen.getByText('Cage Condition')).toBeInTheDocument();
    expect(screen.getByText('20 / 25')).toBeInTheDocument();
    
    // Should not render comment sections
    expect(screen.queryByText('Judge Comments:')).not.toBeInTheDocument();
  });

  it('formats timestamp correctly', () => {
    render(
      <ParticipantScoreView {...defaultProps} />
    );

    // Check that timestamp is formatted and displayed
    expect(screen.getByText(/Scored on:/)).toBeInTheDocument();
  });

  it('handles cat without cage number', () => {
    const catWithoutCage = { ...mockCat, cageNumber: undefined };
    
    render(
      <ParticipantScoreView
        {...defaultProps}
        cat={catWithoutCage}
      />
    );

    expect(screen.getByText('Fluffy')).toBeInTheDocument();
    expect(screen.getByText('Owner: John Doe')).toBeInTheDocument();
    expect(screen.queryByText(/Cage:/)).not.toBeInTheDocument();
  });

  it('handles multiple scores from same judge correctly', () => {
    const multipleScores = [
      mockScore,
      { ...mockScore, id: 'score-6', totalScore: 88, timestamp: '2024-01-16T10:30:00Z' }
    ];

    render(
      <ParticipantScoreView
        {...defaultProps}
        scores={multipleScores}
      />
    );

    // Should display both scores
    expect(screen.getAllByText('Judge: Judge Smith')).toHaveLength(2);
    expect(screen.getByText('83')).toBeInTheDocument();
    expect(screen.getByText('88')).toBeInTheDocument();
  });

  it('handles empty allScores array for ranking', () => {
    render(
      <ParticipantScoreView
        {...defaultProps}
        allScores={[]}
      />
    );

    // Should not display ranking section
    expect(screen.queryByText(/#\d+/)).not.toBeInTheDocument();
    expect(screen.queryByText(/percentile/)).not.toBeInTheDocument();
  });
});