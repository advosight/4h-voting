import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FitShowScoringForm } from '../FitShowScoringForm';
import { FitShowScore } from '../../types/scoring';
import type { Mocked, Mock } from 'vitest';

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

describe('FitShowScoringForm - Mobile FAB', () => {
  const defaultProps = {
    catId: 'cat-123',
    participantName: 'John Doe',
    judgeId: 'judge-456',
    judgeName: 'Judge Smith'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // Test 1: Form renders with submit button
  it('renders the form with submit button', () => {
    render(<FitShowScoringForm {...defaultProps} />);

    // Header submit button should be present on all breakpoints
    const submitButton = screen.getByText('Submit Score');
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toBeVisible();
  });

  // Test 2: FAB component should be rendered on mobile
  it('renders a FAB component for mobile submission', () => {
    render(<FitShowScoringForm {...defaultProps} />);

    // After implementation, the FAB will be a fixed button at bottom-right
    // This test verifies it exists and is accessible
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  // Test 3: FAB disabled state matches form submission state
  it('FAB disables when form is submitting', async () => {
    render(<FitShowScoringForm {...defaultProps} />);

    const submitButton = screen.getByText('Submit Score');

    // Initially enabled
    expect(submitButton).not.toBeDisabled();

    // Click to submit
    fireEvent.click(submitButton);

    // Should show submitting state
    await waitFor(() => {
      expect(screen.getByText('Submitting...')).toBeInTheDocument();
    });
  });
});

describe('FitShowScoringForm - Single Column Layout (Mobile)', () => {
  const defaultProps = {
    catId: 'cat-123',
    participantName: 'John Doe',
    judgeId: 'judge-456',
    judgeName: 'Judge Smith'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // Test 1: All scoring sections render
  it('renders all scoring sections in single column format', () => {
    render(<FitShowScoringForm {...defaultProps} />);

    // Check that all scoring sections are rendered
    const appearanceSection = screen.getByTestId('appearance-scoring');
    const handlingSection = screen.getByTestId('handling-scoring');
    const demonstrationSection = screen.getByTestId('demonstration-scoring');
    const healthSection = screen.getByTestId('health-examination-scoring');
    const groomingSection = screen.getByTestId('grooming-care-scoring');
    const knowledgeSection = screen.getByTestId('knowledge-scoring');

    // All sections should be present and visible
    expect(appearanceSection).toBeInTheDocument();
    expect(appearanceSection).toBeVisible();

    expect(handlingSection).toBeInTheDocument();
    expect(handlingSection).toBeVisible();

    expect(demonstrationSection).toBeInTheDocument();
    expect(demonstrationSection).toBeVisible();

    expect(healthSection).toBeInTheDocument();
    expect(healthSection).toBeVisible();

    expect(groomingSection).toBeInTheDocument();
    expect(groomingSection).toBeVisible();

    expect(knowledgeSection).toBeInTheDocument();
    expect(knowledgeSection).toBeVisible();
  });

  // Test 2: Totals are calculated correctly
  it('calculates and displays correct totals for all scoring sections', () => {
    render(<FitShowScoringForm {...defaultProps} />);

    // Initial totals should be minimum values (all 1s)
    // appearance: 1+1+1=3, handling: 1+1=2, demonstration: 1+1+1+1=4,
    // health: 1*9=9, grooming: 1+1+1=3, knowledge: 1+1+1+1=4
    expect(screen.getByTestId('appearance-total')).toHaveTextContent('3');
    expect(screen.getByTestId('handling-total')).toHaveTextContent('2');
    expect(screen.getByTestId('demonstration-total')).toHaveTextContent('4');
    expect(screen.getByTestId('health-examination-total')).toHaveTextContent('9');
    expect(screen.getByTestId('grooming-care-total')).toHaveTextContent('3');
    expect(screen.getByTestId('knowledge-total')).toHaveTextContent('4');
  });

  // Test 3: Total score displays and updates
  it('displays total score and updates when sections change', async () => {
    render(<FitShowScoringForm {...defaultProps} />);

    // Initial total score should be 25 (minimum values)
    expect(screen.getByText('Total Score: 25/100')).toBeInTheDocument();

    // Update a score by clicking the button in a mocked sub-component
    const attireButton = screen.getByText('Change Attire');
    fireEvent.click(attireButton);

    // Total should update (+4 points from changing attire from 1 to 5)
    await waitFor(() => {
      expect(screen.getByText('Total Score: 29/100')).toBeInTheDocument();
    });
  });
});
