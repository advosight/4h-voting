import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ParticipantClassScoreView from '../ParticipantClassScoreView';
import { ClassScore, Cat } from '../../types/scoring';

// Mock data
const mockCat: Cat = {
  id: 'cat-1',
  name: 'Fluffy',
  owner: 'John Doe',
  cageNumber: 5,
  votes: 10
};

const mockClassScore: ClassScore = {
  id: 'class-score-1',
  catId: 'cat-1',
  judgeId: 'judge-1',
  judgeName: 'Judge Smith',
  beautyScore: 12,
  beautyComments: 'Beautiful coat and markings',
  personalityScore: 18,
  personalityComments: 'Very friendly and calm',
  balanceProportionScore: 13,
  balanceProportionComments: 'Well-proportioned body',
  coatCleanGroomed: true,
  teethGumsHealthy: true,
  eyesNoseClear: true,
  earsCleanMiteFree: true,
  toenailsClipped: true,
  fleaIssues: false,
  healthGroomingComments: 'Excellent health and grooming',
  totalScore: 43,
  ribbonEligibility: 'Red',
  timestamp: '2024-01-15T10:30:00Z',
  isFinalized: true
};

const mockPendingClassScore: ClassScore = {
  ...mockClassScore,
  id: 'class-score-2',
  judgeId: 'judge-2',
  judgeName: 'Judge Johnson',
  totalScore: 38,
  ribbonEligibility: 'Red',
  isFinalized: false
};

const mockAllClassScores: ClassScore[] = [
  mockClassScore,
  { ...mockClassScore, id: 'class-score-3', catId: 'cat-2', totalScore: 47, ribbonEligibility: 'Blue' },
  { ...mockClassScore, id: 'class-score-4', catId: 'cat-3', totalScore: 35, ribbonEligibility: 'Red' },
  { ...mockClassScore, id: 'class-score-5', catId: 'cat-4', totalScore: 28, ribbonEligibility: 'White' }
];

describe('ParticipantClassScoreView', () => {
  const defaultProps = {
    catId: 'cat-1',
    classScores: [mockClassScore],
    cat: mockCat,
    allClassScores: mockAllClassScores,
    loading: false,
    error: null
  };

  it('renders loading state correctly', () => {
    render(
      <ParticipantClassScoreView
        {...defaultProps}
        loading={true}
        classScores={[]}
      />
    );

    expect(screen.getByText('Loading class scores...')).toBeInTheDocument();
  });

  it('renders error state correctly', () => {
    const errorMessage = 'Failed to load class scores';
    render(
      <ParticipantClassScoreView
        {...defaultProps}
        error={errorMessage}
        classScores={[]}
      />
    );

    expect(screen.getByText('Error Loading Class Scores')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('renders no scores message when no class scores exist', () => {
    render(
      <ParticipantClassScoreView
        {...defaultProps}
        classScores={[]}
      />
    );

    expect(screen.getByText('No Class Scores Available')).toBeInTheDocument();
    expect(screen.getByText('This cat has not been judged for class competition yet. Please check back later.')).toBeInTheDocument();
  });

  it('displays cat information with class scoring badge', () => {
    render(<ParticipantClassScoreView {...defaultProps} />);

    expect(screen.getByText('Fluffy')).toBeInTheDocument();
    expect(screen.getByText('Owner: John Doe')).toBeInTheDocument();
    expect(screen.getByText('Cage: 5')).toBeInTheDocument();
    expect(screen.getByText('Type Class Scoring')).toBeInTheDocument();
  });

  it('displays finalized class scores correctly', () => {
    render(<ParticipantClassScoreView {...defaultProps} />);

    expect(screen.getByText('Final Class Scores')).toBeInTheDocument();
    expect(screen.getByText('Judge: Judge Smith')).toBeInTheDocument();
    expect(screen.getByText('43')).toBeInTheDocument();
    expect(screen.getByText('/ 50')).toBeInTheDocument();
    expect(screen.getByText('Red Ribbon')).toBeInTheDocument();
  });

  it('displays class scoring categories with correct scores', () => {
    render(<ParticipantClassScoreView {...defaultProps} />);

    // Beauty category
    expect(screen.getByText("Cat's Beauty")).toBeInTheDocument();
    expect(screen.getByText('12 / 15')).toBeInTheDocument();
    expect(screen.getByText('Beautiful coat and markings')).toBeInTheDocument();

    // Personality category
    expect(screen.getByText("Cat's Personality")).toBeInTheDocument();
    expect(screen.getByText('18 / 20')).toBeInTheDocument();
    expect(screen.getByText('Very friendly and calm')).toBeInTheDocument();

    // Balance/Proportion category
    expect(screen.getByText('Balance/Proportion')).toBeInTheDocument();
    expect(screen.getByText('13 / 15')).toBeInTheDocument();
    expect(screen.getByText('Well-proportioned body')).toBeInTheDocument();
  });

  it('displays health and grooming evaluation correctly', () => {
    render(<ParticipantClassScoreView {...defaultProps} />);

    expect(screen.getByText('Health & Grooming Evaluation')).toBeInTheDocument();
    
    // Check for health items
    expect(screen.getByText('Coat is clean & well groomed')).toBeInTheDocument();
    expect(screen.getByText('Teeth/gums clean & healthy')).toBeInTheDocument();
    expect(screen.getByText('Eyes & nose clear')).toBeInTheDocument();
    expect(screen.getByText('Ears clean & free of mites')).toBeInTheDocument();
    expect(screen.getByText('Toenails/claws clipped')).toBeInTheDocument();
    expect(screen.getByText('Flea or flea dirt issues detected')).toBeInTheDocument();

    // Check for health comments
    expect(screen.getByText('Excellent health and grooming')).toBeInTheDocument();
  });

  it('displays health items with correct pass/fail status', () => {
    const scoreWithFailedHealth: ClassScore = {
      ...mockClassScore,
      coatCleanGroomed: false,
      fleaIssues: true,
      ribbonEligibility: 'Red'
    };

    render(
      <ParticipantClassScoreView
        {...defaultProps}
        classScores={[scoreWithFailedHealth]}
      />
    );

    const healthItems = screen.getAllByText(/✓|✗/);
    expect(healthItems).toHaveLength(6); // 5 health items + flea issues
  });

  it('displays pending scores separately from finalized scores', () => {
    render(
      <ParticipantClassScoreView
        {...defaultProps}
        classScores={[mockClassScore, mockPendingClassScore]}
      />
    );

    expect(screen.getByText('Final Class Scores')).toBeInTheDocument();
    expect(screen.getByText('Preliminary Class Scores')).toBeInTheDocument();
    expect(screen.getByText('These class scores are not yet finalized and may change.')).toBeInTheDocument();
    expect(screen.getByText('Preliminary')).toBeInTheDocument();
  });

  it('calculates and displays ranking correctly', async () => {
    render(<ParticipantClassScoreView {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('#2')).toBeInTheDocument();
      expect(screen.getByText('out of 4 class entries (75th percentile)')).toBeInTheDocument();
    });
  });

  it('displays judging in progress message when only pending scores exist', () => {
    render(
      <ParticipantClassScoreView
        {...defaultProps}
        classScores={[mockPendingClassScore]}
      />
    );

    expect(screen.getByText('Class Judging in Progress')).toBeInTheDocument();
    expect(screen.getByText('Your cat is currently being judged for class competition. Final scores will be available once judging is complete.')).toBeInTheDocument();
  });

  it('displays score timestamp correctly', () => {
    render(<ParticipantClassScoreView {...defaultProps} />);

    expect(screen.getByText(/Scored on:/)).toBeInTheDocument();
  });

  it('handles missing cat data gracefully', () => {
    render(
      <ParticipantClassScoreView
        {...defaultProps}
        cat={null}
      />
    );

    expect(screen.getByText('No Cat Data')).toBeInTheDocument();
    expect(screen.getByText('Unable to load cat information.')).toBeInTheDocument();
  });

  it('displays ribbon colors correctly for different ribbon types', () => {
    const blueRibbonScore: ClassScore = {
      ...mockClassScore,
      totalScore: 47,
      ribbonEligibility: 'Blue'
    };

    render(
      <ParticipantClassScoreView
        {...defaultProps}
        classScores={[blueRibbonScore]}
      />
    );

    const ribbonElement = screen.getByText('Blue Ribbon');
    expect(ribbonElement).toHaveStyle({ backgroundColor: '#1976d2' });
  });

  it('handles multiple judges scoring the same cat', () => {
    const multipleScores = [
      mockClassScore,
      { ...mockClassScore, id: 'class-score-6', judgeId: 'judge-3', judgeName: 'Judge Wilson', totalScore: 45 }
    ];

    render(
      <ParticipantClassScoreView
        {...defaultProps}
        classScores={multipleScores}
      />
    );

    expect(screen.getByText('Judge: Judge Smith')).toBeInTheDocument();
    expect(screen.getByText('Judge: Judge Wilson')).toBeInTheDocument();
  });

  it('separates class scoring visually from cage scoring', () => {
    render(<ParticipantClassScoreView {...defaultProps} />);

    // Check for class-specific styling classes
    const classElements = document.querySelectorAll('.class-scoring, .class-score-card');
    expect(classElements.length).toBeGreaterThan(0);
  });
});