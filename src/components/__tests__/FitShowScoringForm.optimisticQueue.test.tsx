import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FitShowScoringForm } from '../FitShowScoringForm';
import { FitShowScore } from '../../types/scoring';
import type { Mocked } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock AWS Amplify v6
vi.mock('aws-amplify/api', () => ({
  generateClient: vi.fn(() => ({
    graphql: vi.fn()
  }))
}));

// Get the mocked client
import { generateClient } from 'aws-amplify/api';
const mockClient = generateClient() as Mocked<ReturnType<typeof generateClient>>;

// Mock the sub-components
vi.mock('../AppearanceScoring', () => ({
  AppearanceScoring: ({ onScoreChange, total }: any) => (
    <div data-testid="appearance-scoring">
      <span data-testid="appearance-total">{total}</span>
      <button onClick={() => onScoreChange('attire', 5)}>Change Attire</button>
    </div>
  )
}));

vi.mock('../HandlingScoring', () => ({
  HandlingScoring: ({ onScoreChange, total }: any) => (
    <div data-testid="handling-scoring">
      <span data-testid="handling-total">{total}</span>
      <button onClick={() => onScoreChange('controlEquipment', 8)}>Change Control</button>
    </div>
  )
}));

vi.mock('../DemonstrationScoring', () => ({
  DemonstrationScoring: ({ onScoreChange, total }: any) => (
    <div data-testid="demonstration-scoring">
      <span data-testid="demonstration-total">{total}</span>
    </div>
  )
}));

vi.mock('../HealthExaminationScoring', () => ({
  HealthExaminationScoring: ({ onScoreChange, total }: any) => (
    <div data-testid="health-examination-scoring">
      <span data-testid="health-examination-total">{total}</span>
    </div>
  )
}));

vi.mock('../GroomingCareScoring', () => ({
  GroomingCareScoring: ({ onScoreChange, total }: any) => (
    <div data-testid="grooming-care-scoring">
      <span data-testid="grooming-care-total">{total}</span>
    </div>
  )
}));

vi.mock('../KnowledgeScoring', () => ({
  KnowledgeScoring: ({ onScoreChange, total }: any) => (
    <div data-testid="knowledge-scoring">
      <span data-testid="knowledge-total">{total}</span>
    </div>
  )
}));

vi.mock('../ValidationErrorDisplay', () => ({
  ValidationSummary: ({ errors }: any) => (
    <div data-testid="validation-errors">
      {errors.map((error: any, index: number) => (
        <div key={index}>{error.error?.message || 'Validation error'}</div>
      ))}
    </div>
  )
}));

vi.mock('../FitShowNetworkErrorHandler', () => ({
  FitShowNetworkErrorHandler: ({ error, onRetry }: any) => (
    error ? (
      <div data-testid="network-error-handler">
        <div data-testid="error-message">{error.message}</div>
        {onRetry && (
          <button data-testid="retry-button" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    ) : null
  )
}));

describe('FitShowScoringForm - Optimistic Queue', () => {
  const defaultProps = {
    catId: 'cat-123',
    participantName: 'John Doe',
    judgeId: 'judge-456',
    judgeName: 'Judge Smith'
  };

  const mockExistingScore: FitShowScore = {
    id: 'score-789',
    catId: 'cat-123',
    participantName: 'John Doe',
    judgeId: 'judge-456',
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
    isFinalized: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('persists pending submission to localStorage before calling mutation with correct scoping', async () => {
    const newScore = { ...mockExistingScore, updatedAt: new Date().toISOString() };
    (mockClient.graphql as any).mockResolvedValue({
      data: { updateFitShowScore: newScore }
    });

    const { getByRole } = render(<FitShowScoringForm {...defaultProps} existingScore={mockExistingScore} />);

    // Submit the form
    const submitButton = getByRole('button', { name: /update score/i });
    fireEvent.click(submitButton);

    // Check localStorage for queued entry with proper scoping
    await waitFor(() => {
      const queueKey = `fitshow-queue-cat-123-judge-456`;
      const queuedData = localStorage.getItem(queueKey);
      expect(queuedData).toBeTruthy();

      if (queuedData) {
        const parsed = JSON.parse(queuedData);
        expect(parsed.catId).toBe('cat-123');
        expect(parsed.judgeId).toBe('judge-456');
        expect(parsed.timestamp).toBeDefined();
        expect(parsed.scoreData).toBeDefined();
      }
    });
  });

  it('shows optimistic submit feedback immediately on submit', async () => {
    const newScore = { ...mockExistingScore, updatedAt: new Date().toISOString() };
    (mockClient.graphql as any).mockResolvedValue({
      data: { updateFitShowScore: newScore }
    });

    const { getByRole } = render(<FitShowScoringForm {...defaultProps} existingScore={mockExistingScore} />);

    // Submit the form
    const submitButton = getByRole('button', { name: /update score/i });
    fireEvent.click(submitButton);

    // Optimistic feedback should appear
    await waitFor(() => {
      expect(screen.queryByText(/score submitted/i)).toBeInTheDocument();
    });
  });

  it('uses properly scoped localStorage key with catId and judgeId', async () => {
    const newScore = { ...mockExistingScore, updatedAt: new Date().toISOString() };
    (mockClient.graphql as any).mockImplementationOnce(() =>
      Promise.resolve({
        data: { updateFitShowScore: newScore }
      })
    );

    const { getByRole } = render(
      <FitShowScoringForm
        {...defaultProps}
        catId="different-cat"
        judgeId="different-judge"
        existingScore={mockExistingScore}
      />
    );

    // Submit the form
    const submitButton = getByRole('button', { name: /update score/i });
    fireEvent.click(submitButton);

    // Verify localStorage uses correct scoped key (not the default props)
    await waitFor(() => {
      const correctKey = `fitshow-queue-different-cat-different-judge`;
      expect(localStorage.getItem(correctKey)).toBeTruthy();

      // Verify wrong key doesn't have the entry
      const wrongKey = `fitshow-queue-cat-123-judge-456`;
      expect(localStorage.getItem(wrongKey)).toBeNull();
    });
  });

  it('keeps localStorage entry and shows error handler on submission failure', async () => {
    const error = new Error('Network failed');
    (mockClient.graphql as any).mockRejectedValue(error);

    const { getByRole } = render(<FitShowScoringForm {...defaultProps} existingScore={mockExistingScore} />);

    // Submit the form
    const submitButton = getByRole('button', { name: /update score/i });
    fireEvent.click(submitButton);

    // Wait for error handler to appear
    await waitFor(() => {
      expect(screen.getByTestId('network-error-handler')).toBeInTheDocument();
    });

    // localStorage entry should still be there for retry
    const queueKey = `fitshow-queue-cat-123-judge-456`;
    expect(localStorage.getItem(queueKey)).toBeTruthy();
  });

  it('uses FitShowNetworkErrorHandler for displaying submission errors', async () => {
    const error = new Error('Connection error');
    (mockClient.graphql as any).mockImplementationOnce(() =>
      Promise.reject(error)
    );

    render(<FitShowScoringForm {...defaultProps} existingScore={mockExistingScore} />);

    const submitButton = screen.getByRole('button', { name: /update score/i });
    fireEvent.click(submitButton);

    // Verify error handler component is rendered
    await waitFor(() => {
      expect(screen.getByTestId('network-error-handler')).toBeInTheDocument();
      // The error message should be captured and displayed
      const errorMessage = screen.getByTestId('error-message');
      expect(errorMessage).toBeInTheDocument();
    });
  });
});
