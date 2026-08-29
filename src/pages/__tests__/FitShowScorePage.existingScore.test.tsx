import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { getCurrentUser } from 'aws-amplify/auth';
import * as roleUtils from '../../utils/roleUtils';
import { FitShowScore } from '../../types/scoring';
import type { Mocked } from 'vitest';

// Mock AWS Amplify auth
vi.mock('aws-amplify/auth', () => ({
  getCurrentUser: vi.fn(),
  fetchUserAttributes: vi.fn(),
  fetchAuthSession: vi.fn(),
}));

// Mock AWS Amplify API - setup global mock
const globalMockGraphql = vi.fn();
vi.mock('aws-amplify/api', () => ({
  generateClient: vi.fn(() => ({
    graphql: globalMockGraphql,
  })),
}));

// Mock roleUtils
vi.mock('../../utils/roleUtils', () => ({
  getJudgeId: vi.fn(),
  getUserRole: vi.fn(),
  hasRole: vi.fn(),
  hasAnyRole: vi.fn(),
  isJudge: vi.fn(),
  isAdmin: vi.fn(),
  canCageScore: vi.fn(),
  canClassScore: vi.fn(),
  canFitShowScore: vi.fn(),
  useUserRole: vi.fn(),
}));

// Mock error handling utils
vi.mock('../../utils/errorHandling', () => ({
  parseError: vi.fn((err) => 'Mocked error'),
  getUserFriendlyMessage: vi.fn((msg) => msg),
  logError: vi.fn(),
}));

// Mock components
vi.mock('../../components/FitShowScoringForm', () => ({
  FitShowScoringForm: (props: any) => (
    <div data-testid="scoring-form">
      <div data-testid="form-judge-id">{props.judgeId}</div>
      <div data-testid="form-existing-score">{props.existingScore ? 'has-score' : 'no-score'}</div>
    </div>
  ),
}));

vi.mock('../../components/FitShowScoringErrorBoundary', () => ({
  FitShowScoringErrorBoundary: ({ children }: any) => <div>{children}</div>,
}));

// Dynamically import to get mocked generateClient
let FitShowScorePage: any;

beforeAll(async () => {
  const mod = await import('../FitShowScorePage');
  FitShowScorePage = mod.default;
});

describe('FitShowScorePage - Existing Score Loading', () => {
  const mockUser = {
    userId: 'user-123',
    username: 'testuser',
    signInDetails: {
      loginId: 'test@example.com',
    },
  };

  const mockCat = {
    id: 'cat-456',
    name: 'Fluffy',
    owner: 'John Doe',
    cageNumber: 1,
    ownerAgeGroup: 'Adult',
    catAgeGroup: 'Adult',
  };

  const mockExistingScore: FitShowScore = {
    id: 'score-789',
    catId: 'cat-456',
    participantName: 'John Doe',
    judgeId: 'judge-001',
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
    isFinalized: false,
    modificationCount: 1,
    lastModifiedBy: 'judge-001',
    lastModifiedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as Mocked<typeof getCurrentUser>).mockResolvedValue(mockUser as any);
  });

  it('loads and passes existing score when judge has already scored the cat', async () => {
    (roleUtils.getJudgeId as Mocked<typeof roleUtils.getJudgeId>).mockResolvedValue('judge-001');

    globalMockGraphql.mockImplementation((args: any) => {
      if (args.query.includes('GetCat')) {
        return Promise.resolve({
          data: { getCat: mockCat },
        });
      }
      if (args.query.includes('GetFitShowScoresByCat')) {
        return Promise.resolve({
          data: {
            getFitShowScoresByCat: [mockExistingScore],
          },
        });
      }
      return Promise.reject(new Error('Unexpected query'));
    });

    render(
      <MemoryRouter initialEntries={['/fit-show-score/cat-456']}>
        <Routes>
          <Route path="/fit-show-score/:catId" element={<FitShowScorePage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('scoring-form')).toBeInTheDocument();
    });

    expect(screen.getByTestId('form-existing-score')).toHaveTextContent('has-score');
  });

  it('loads no existing score when judge has not scored the cat', async () => {
    (roleUtils.getJudgeId as Mocked<typeof roleUtils.getJudgeId>).mockResolvedValue('judge-002');

    globalMockGraphql.mockImplementation((args: any) => {
      if (args.query.includes('GetCat')) {
        return Promise.resolve({
          data: { getCat: mockCat },
        });
      }
      if (args.query.includes('GetFitShowScoresByCat')) {
        return Promise.resolve({
          data: {
            getFitShowScoresByCat: [mockExistingScore], // Score from a different judge
          },
        });
      }
      return Promise.reject(new Error('Unexpected query'));
    });

    render(
      <MemoryRouter initialEntries={['/fit-show-score/cat-456']}>
        <Routes>
          <Route path="/fit-show-score/:catId" element={<FitShowScorePage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('scoring-form')).toBeInTheDocument();
    });

    expect(screen.getByTestId('form-existing-score')).toHaveTextContent('no-score');
  });

  it('uses getJudgeId() for judgeId prop instead of currentUser.userId', async () => {
    const resolvedJudgeId = 'judge-resolved-001';
    (roleUtils.getJudgeId as Mocked<typeof roleUtils.getJudgeId>).mockResolvedValue(
      resolvedJudgeId
    );

    globalMockGraphql.mockImplementation((args: any) => {
      if (args.query.includes('GetCat')) {
        return Promise.resolve({
          data: { getCat: mockCat },
        });
      }
      if (args.query.includes('GetFitShowScoresByCat')) {
        return Promise.resolve({
          data: {
            getFitShowScoresByCat: [],
          },
        });
      }
      return Promise.reject(new Error('Unexpected query'));
    });

    render(
      <MemoryRouter initialEntries={['/fit-show-score/cat-456']}>
        <Routes>
          <Route path="/fit-show-score/:catId" element={<FitShowScorePage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('scoring-form')).toBeInTheDocument();
    });

    // Verify that the form receives the resolved judge ID, not the raw user ID
    expect(screen.getByTestId('form-judge-id')).toHaveTextContent(resolvedJudgeId);
    expect(screen.getByTestId('form-judge-id')).not.toHaveTextContent(mockUser.userId);
  });
});
