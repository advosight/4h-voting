import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import ParticipantClassScoreView from '../ParticipantClassScorePage';

// Mock AWS Amplify completely
jest.mock('aws-amplify/api', () => ({
  generateClient: jest.fn(() => ({
    graphql: jest.fn(() => Promise.resolve({ data: {} }))
  }))
}));

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ catId: undefined }) // Test missing catId case
}));

// Mock data
const mockCat = {
  id: 'test-cat-1',
  name: 'Test Cat',
  owner: 'Test Owner',
  cageNumber: 1,
  votes: 5
};

const mockClassScore = {
  id: 'class-score-1',
  catId: 'test-cat-1',
  judgeId: 'judge-1',
  judgeName: 'Judge Smith',
  beautyScore: 12,
  beautyComments: 'Beautiful cat',
  personalityScore: 18,
  personalityComments: 'Very friendly',
  balanceProportionScore: 13,
  balanceProportionComments: 'Well balanced',
  coatCleanGroomed: true,
  teethGumsHealthy: true,
  eyesNoseClear: true,
  earsCleanMiteFree: true,
  toenailsClipped: true,
  fleaIssues: false,
  healthGroomingComments: 'Excellent health',
  totalScore: 43,
  ribbonEligibility: 'Red',
  timestamp: '2024-01-15T10:30:00Z',
  isFinalized: true
};

const mockAllClassScores = [
  mockClassScore,
  { ...mockClassScore, id: 'class-score-2', catId: 'cat-2', totalScore: 47 },
  { ...mockClassScore, id: 'class-score-3', catId: 'cat-3', totalScore: 35 }
];

describe('ParticipantClassScorePage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  const renderWithRouter = (component: React.ReactElement) => {
    return render(
      <MemoryRouter initialEntries={['/participant-class-score/test-cat-1']}>
        {component}
      </MemoryRouter>
    );
  };

  it('handles missing catId parameter', () => {
    renderWithRouter(<ParticipantClassScoreView />);

    expect(screen.getByText('Invalid Cat ID')).toBeInTheDocument();
    expect(screen.getByText('Please provide a valid cat ID to view class scores.')).toBeInTheDocument();
  });

  it('displays class scoring specific styling', () => {
    renderWithRouter(<ParticipantClassScoreView />);

    const pageElement = document.querySelector('.participant-class-score-page');
    expect(pageElement).toBeInTheDocument();
  });
});