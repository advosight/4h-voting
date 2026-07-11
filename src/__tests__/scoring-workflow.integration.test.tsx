import './integration-test.config';
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { App } from 'aws-cdk-lib';
import { BrowserRouter } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';
import { App } from 'aws-cdk-lib';
import { BrowserRouter } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';
import { App } from 'aws-cdk-lib';
import { BrowserRouter } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';
import { App } from 'aws-cdk-lib';
import { BrowserRouter } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';
import { App } from 'aws-cdk-lib';
import { BrowserRouter } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';
import { App } from 'aws-cdk-lib';
import { BrowserRouter } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';
import { App } from 'aws-cdk-lib';
import { BrowserRouter } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';
import { App } from 'aws-cdk-lib';
import { BrowserRouter } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';
import { App } from 'aws-cdk-lib';
import { BrowserRouter } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';
import { App } from 'aws-cdk-lib';
import { BrowserRouter } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';
import { App } from 'aws-cdk-lib';
import { BrowserRouter } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';
import { App } from 'aws-cdk-lib';
import { BrowserRouter } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';
import { App } from 'aws-cdk-lib';
import { BrowserRouter } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';
import { App } from 'aws-cdk-lib';
import { BrowserRouter } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';
import { App } from 'aws-cdk-lib';
import { BrowserRouter } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';
import { App } from 'aws-cdk-lib';
import { BrowserRouter } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';
import { App } from 'aws-cdk-lib';
import { BrowserRouter } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';
import { App } from 'aws-cdk-lib';
import { BrowserRouter } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';
import { App } from 'aws-cdk-lib';
import { BrowserRouter } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';
import { App } from 'aws-cdk-lib';
import { BrowserRouter } from 'react-router-dom';

// Mock GraphQL queries (these will be implemented in the actual scoring feature)
const GET_CAT_BY_CAGE_NUMBER = 'GET_CAT_BY_CAGE_NUMBER';
const CREATE_SCORE = 'CREATE_SCORE';
const UPDATE_SCORE = 'UPDATE_SCORE';
const GET_SCORES_BY_CAT = 'GET_SCORES_BY_CAT';
const LIST_ALL_SCORES = 'LIST_ALL_SCORES';
const FINALIZE_SCORE = 'FINALIZE_SCORE';
const ON_SCORE_UPDATE = 'ON_SCORE_UPDATE';
const GET_CATS = 'GET_CATS';

// Mock authentication
vi.mock('../utils/roleUtils', () => ({
  getCurrentUser: vi.fn(),
  hasRole: vi.fn(),
  isJudge: vi.fn(),
  isAdmin: vi.fn(),
  requireRole: vi.fn(),
}));

// Mock data
const mockCat = {
  id: 'cat-1',
  name: 'Fluffy',
  owner: 'John Doe',
  cageNumber: 1,
  votes: 0,
};

const mockJudge1 = {
  id: 'judge-1',
  name: 'Judge Smith',
  role: 'judge',
};

const mockJudge2 = {
  id: 'judge-2',
  name: 'Judge Johnson',
  role: 'judge',
};

const mockScore1 = {
  id: 'score-1',
  catId: 'cat-1',
  judgeId: 'judge-1',
  judgeName: 'Judge Smith',
  cageConditionScore: 20,
  cageConditionComments: 'Clean and organized',
  catConditionScore: 22,
  catConditionComments: 'Healthy and alert',
  groomingScore: 18,
  groomingComments: 'Well groomed',
  overallScore: 21,
  overallComments: 'Excellent presentation',
  totalScore: 81,
  timestamp: '2024-01-15T10:00:00Z',
  isFinalized: false,
};

const mockScore2 = {
  id: 'score-2',
  catId: 'cat-1',
  judgeId: 'judge-2',
  judgeName: 'Judge Johnson',
  cageConditionScore: 23,
  cageConditionComments: 'Exceptional cage setup',
  catConditionScore: 20,
  catConditionComments: 'Good condition',
  groomingScore: 24,
  groomingComments: 'Outstanding grooming',
  overallScore: 19,
  overallComments: 'Very good overall',
  totalScore: 86,
  timestamp: '2024-01-15T11:00:00Z',
  isFinalized: false,
};

describe('Complete Scoring Workflow Integration Tests', () => {
  let mockRoleUtils: any;

  beforeEach(() => {
    mockRoleUtils = require('../utils/roleUtils');
    mockRoleUtils.getCurrentUser.mockResolvedValue(mockJudge1);
    mockRoleUtils.hasRole.mockReturnValue(true);
    mockRoleUtils.isJudge.mockReturnValue(true);
    mockRoleUtils.isAdmin.mockReturnValue(false);
    mockRoleUtils.requireRole.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('End-to-End Judge Scoring Process', () => {
    it('should complete full scoring workflow from navigation to submission', async () => {
      const user = userEvent.setup();
      
      const mocks = [
        {
          request: {
            query: GET_CAT_BY_CAGE_NUMBER,
            variables: { cageNumber: 1 },
          },
          result: {
            data: {
              getCatByCageNumber: mockCat,
            },
          },
        },
        {
          request: {
            query: GET_SCORES_BY_CAT,
            variables: { catId: 'cat-1' },
          },
          result: {
            data: {
              getScoresByCat: {
                items: [],
              },
            },
          },
        },
        {
          request: {
            query: CREATE_SCORE,
            variables: {
              input: {
                catId: 'cat-1',
                cageConditionScore: 20,
                cageConditionComments: 'Clean and organized',
                catConditionScore: 22,
                catConditionComments: 'Healthy and alert',
                groomingScore: 18,
                groomingComments: 'Well groomed',
                overallScore: 21,
                overallComments: 'Excellent presentation',
                isFinalized: false,
              },
            },
          },
          result: {
            data: {
              createScore: mockScore1,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </MockedProvider>
      );

      // Navigate to scoring page
      window.history.pushState({}, 'Test page', '/score/1');

      // Wait for cat data to load
      await waitFor(() => {
        expect(screen.getByText('Fluffy')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Cage #1')).toBeInTheDocument();
      });

      // Fill out scoring form
      const cageConditionInput = screen.getByLabelText(/cage condition/i);
      const catConditionInput = screen.getByLabelText(/cat condition/i);
      const groomingInput = screen.getByLabelText(/grooming/i);
      const overallInput = screen.getByLabelText(/overall/i);

      await user.clear(cageConditionInput);
      await user.type(cageConditionInput, '20');
      
      await user.clear(catConditionInput);
      await user.type(catConditionInput, '22');
      
      await user.clear(groomingInput);
      await user.type(groomingInput, '18');
      
      await user.clear(overallInput);
      await user.type(overallInput, '21');

      // Add comments
      const cageComments = screen.getByLabelText(/cage.*comments/i);
      const catComments = screen.getByLabelText(/cat.*comments/i);
      const groomingComments = screen.getByLabelText(/grooming.*comments/i);
      const overallComments = screen.getByLabelText(/overall.*comments/i);

      await user.type(cageComments, 'Clean and organized');
      await user.type(catComments, 'Healthy and alert');
      await user.type(groomingComments, 'Well groomed');
      await user.type(overallComments, 'Excellent presentation');

      // Verify total score calculation
      await waitFor(() => {
        expect(screen.getByText('Total Score: 81')).toBeInTheDocument();
      });

      // Submit score
      const submitButton = screen.getByRole('button', { name: /submit score/i });
      await user.click(submitButton);

      // Verify success message
      await waitFor(() => {
        expect(screen.getByText(/score submitted successfully/i)).toBeInTheDocument();
      });
    });

    it('should handle score editing and updates', async () => {
      const user = userEvent.setup();
      
      const mocks = [
        {
          request: {
            query: GET_CAT_BY_CAGE_NUMBER,
            variables: { cageNumber: 1 },
          },
          result: {
            data: {
              getCatByCageNumber: mockCat,
            },
          },
        },
        {
          request: {
            query: GET_SCORES_BY_CAT,
            variables: { catId: 'cat-1' },
          },
          result: {
            data: {
              getScoresByCat: {
                items: [mockScore1],
              },
            },
          },
        },
        {
          request: {
            query: UPDATE_SCORE,
            variables: {
              id: 'score-1',
              input: {
                cageConditionScore: 25,
                cageConditionComments: 'Exceptional cage setup',
              },
            },
          },
          result: {
            data: {
              updateScore: {
                ...mockScore1,
                cageConditionScore: 25,
                cageConditionComments: 'Exceptional cage setup',
                totalScore: 86,
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </MockedProvider>
      );

      window.history.pushState({}, 'Test page', '/score/1');

      // Wait for existing score to load
      await waitFor(() => {
        expect(screen.getByDisplayValue('20')).toBeInTheDocument();
      });

      // Edit the cage condition score
      const cageConditionInput = screen.getByLabelText(/cage condition/i);
      await user.clear(cageConditionInput);
      await user.type(cageConditionInput, '25');

      // Edit comments
      const cageComments = screen.getByLabelText(/cage.*comments/i);
      await user.clear(cageComments);
      await user.type(cageComments, 'Exceptional cage setup');

      // Verify total recalculation
      await waitFor(() => {
        expect(screen.getByText('Total Score: 86')).toBeInTheDocument();
      });

      // Update score
      const updateButton = screen.getByRole('button', { name: /update score/i });
      await user.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText(/score updated successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Multi-Judge Scenarios', () => {
    it('should handle multiple judges scoring the same cat', async () => {
      const user = userEvent.setup();
      
      const mocks = [
        {
          request: {
            query: GET_SCORES_BY_CAT,
            variables: { catId: 'cat-1' },
          },
          result: {
            data: {
              getScoresByCat: {
                items: [mockScore1, mockScore2],
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </MockedProvider>
      );

      window.history.pushState({}, 'Test page', '/admin/scores/cat-1');

      await waitFor(() => {
        expect(screen.getByText('Judge Smith')).toBeInTheDocument();
        expect(screen.getByText('Judge Johnson')).toBeInTheDocument();
        expect(screen.getByText('81')).toBeInTheDocument();
        expect(screen.getByText('86')).toBeInTheDocument();
      });

      // Verify both scores are displayed with judge information
      const judgeSmithScore = screen.getByText('Judge Smith').closest('[data-testid="score-card"]');
      const judgeJohnsonScore = screen.getByText('Judge Johnson').closest('[data-testid="score-card"]');

      expect(within(judgeSmithScore!).getByText('81')).toBeInTheDocument();
      expect(within(judgeJohnsonScore!).getByText('86')).toBeInTheDocument();
    });

    it('should prevent duplicate scoring by same judge', async () => {
      const user = userEvent.setup();
      
      const mocks = [
        {
          request: {
            query: GET_CAT_BY_CAGE_NUMBER,
            variables: { cageNumber: 1 },
          },
          result: {
            data: {
              getCatByCageNumber: mockCat,
            },
          },
        },
        {
          request: {
            query: GET_SCORES_BY_CAT,
            variables: { catId: 'cat-1' },
          },
          result: {
            data: {
              getScoresByCat: {
                items: [mockScore1], // Judge 1 already scored
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </MockedProvider>
      );

      window.history.pushState({}, 'Test page', '/score/1');

      await waitFor(() => {
        expect(screen.getByText(/you have already scored this cat/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /edit existing score/i })).toBeInTheDocument();
      });
    });
  });

  describe('Score Calculation and Total Computation', () => {
    it('should correctly calculate total scores in real-time', async () => {
      const user = userEvent.setup();
      
      const mocks = [
        {
          request: {
            query: GET_CAT_BY_CAGE_NUMBER,
            variables: { cageNumber: 1 },
          },
          result: {
            data: {
              getCatByCageNumber: mockCat,
            },
          },
        },
        {
          request: {
            query: GET_SCORES_BY_CAT,
            variables: { catId: 'cat-1' },
          },
          result: {
            data: {
              getScoresByCat: {
                items: [],
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </MockedProvider>
      );

      window.history.pushState({}, 'Test page', '/score/1');

      await waitFor(() => {
        expect(screen.getByText('Fluffy')).toBeInTheDocument();
      });

      // Initially should show 0
      expect(screen.getByText('Total Score: 0')).toBeInTheDocument();

      // Add scores incrementally and verify calculation
      const cageConditionInput = screen.getByLabelText(/cage condition/i);
      await user.clear(cageConditionInput);
      await user.type(cageConditionInput, '25');
      
      await waitFor(() => {
        expect(screen.getByText('Total Score: 25')).toBeInTheDocument();
      });

      const catConditionInput = screen.getByLabelText(/cat condition/i);
      await user.clear(catConditionInput);
      await user.type(catConditionInput, '20');
      
      await waitFor(() => {
        expect(screen.getByText('Total Score: 45')).toBeInTheDocument();
      });

      const groomingInput = screen.getByLabelText(/grooming/i);
      await user.clear(groomingInput);
      await user.type(groomingInput, '15');
      
      await waitFor(() => {
        expect(screen.getByText('Total Score: 60')).toBeInTheDocument();
      });

      const overallInput = screen.getByLabelText(/overall/i);
      await user.clear(overallInput);
      await user.type(overallInput, '25');
      
      await waitFor(() => {
        expect(screen.getByText('Total Score: 85')).toBeInTheDocument();
      });
    });

    it('should validate score ranges and show errors', async () => {
      const user = userEvent.setup();
      
      const mocks = [
        {
          request: {
            query: GET_CAT_BY_CAGE_NUMBER,
            variables: { cageNumber: 1 },
          },
          result: {
            data: {
              getCatByCageNumber: mockCat,
            },
          },
        },
        {
          request: {
            query: GET_SCORES_BY_CAT,
            variables: { catId: 'cat-1' },
          },
          result: {
            data: {
              getScoresByCat: {
                items: [],
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </MockedProvider>
      );

      window.history.pushState({}, 'Test page', '/score/1');

      await waitFor(() => {
        expect(screen.getByText('Fluffy')).toBeInTheDocument();
      });

      // Test invalid high score
      const cageConditionInput = screen.getByLabelText(/cage condition/i);
      await user.clear(cageConditionInput);
      await user.type(cageConditionInput, '30');
      
      await waitFor(() => {
        expect(screen.getByText(/score must be between 0 and 25/i)).toBeInTheDocument();
      });

      // Test invalid negative score
      await user.clear(cageConditionInput);
      await user.type(cageConditionInput, '-5');
      
      await waitFor(() => {
        expect(screen.getByText(/score must be between 0 and 25/i)).toBeInTheDocument();
      });

      // Submit button should be disabled with invalid scores
      const submitButton = screen.getByRole('button', { name: /submit score/i });
      expect(submitButton).toBeDisabled();
    });
  });
});  desc
ribe('Report Generation and Export Functionality', () => {
    beforeEach(() => {
      mockRoleUtils.isAdmin.mockReturnValue(true);
      mockRoleUtils.isJudge.mockReturnValue(false);
    });

    it('should generate comprehensive scoring reports', async () => {
      const user = userEvent.setup();
      
      const mockCats = [
        { ...mockCat, id: 'cat-1', name: 'Fluffy', cageNumber: 1 },
        { ...mockCat, id: 'cat-2', name: 'Whiskers', cageNumber: 2 },
        { ...mockCat, id: 'cat-3', name: 'Shadow', cageNumber: 3 },
      ];

      const mockScores = [
        { ...mockScore1, catId: 'cat-1', totalScore: 85 },
        { ...mockScore2, catId: 'cat-1', totalScore: 88 },
        { ...mockScore1, id: 'score-3', catId: 'cat-2', totalScore: 92 },
        { ...mockScore2, id: 'score-4', catId: 'cat-3', totalScore: 78 },
      ];

      const mocks = [
        {
          request: {
            query: GET_CATS,
          },
          result: {
            data: {
              listCats: {
                items: mockCats,
              },
            },
          },
        },
        {
          request: {
            query: LIST_ALL_SCORES,
          },
          result: {
            data: {
              listAllScores: {
                items: mockScores,
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </MockedProvider>
      );

      window.history.pushState({}, 'Test page', '/admin/reports');

      // Wait for reports to load
      await waitFor(() => {
        expect(screen.getByText('Scoring Reports')).toBeInTheDocument();
      });

      // Verify scores are sorted by highest total
      const scoreRows = screen.getAllByTestId('score-row');
      expect(scoreRows).toHaveLength(4);
      
      // First row should be highest score (92)
      expect(within(scoreRows[0]).getByText('92')).toBeInTheDocument();
      expect(within(scoreRows[0]).getByText('Whiskers')).toBeInTheDocument();
    });

    it('should filter reports by judge', async () => {
      const user = userEvent.setup();
      
      const mockScores = [
        { ...mockScore1, judgeId: 'judge-1', judgeName: 'Judge Smith' },
        { ...mockScore2, judgeId: 'judge-2', judgeName: 'Judge Johnson' },
      ];

      const mocks = [
        {
          request: {
            query: LIST_ALL_SCORES,
          },
          result: {
            data: {
              listAllScores: {
                items: mockScores,
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </MockedProvider>
      );

      window.history.pushState({}, 'Test page', '/admin/reports');

      await waitFor(() => {
        expect(screen.getByText('Judge Smith')).toBeInTheDocument();
        expect(screen.getByText('Judge Johnson')).toBeInTheDocument();
      });

      // Filter by Judge Smith
      const judgeFilter = screen.getByLabelText(/filter by judge/i);
      await user.selectOptions(judgeFilter, 'judge-1');

      await waitFor(() => {
        expect(screen.getByText('Judge Smith')).toBeInTheDocument();
        expect(screen.queryByText('Judge Johnson')).not.toBeInTheDocument();
      });
    });

    it('should export reports to CSV', async () => {
      const user = userEvent.setup();
      
      // Mock URL.createObjectURL and document.createElement
      const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
      const mockClick = vi.fn();
      const mockAppendChild = vi.fn();
      const mockRemoveChild = vi.fn();
      
      Object.defineProperty(window.URL, 'createObjectURL', {
        value: mockCreateObjectURL,
      });
      
      const mockAnchor = {
        href: '',
        download: '',
        click: mockClick,
      };
      
      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
      vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
      vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild);

      const mockScores = [mockScore1, mockScore2];

      const mocks = [
        {
          request: {
            query: LIST_ALL_SCORES,
          },
          result: {
            data: {
              listAllScores: {
                items: mockScores,
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </MockedProvider>
      );

      window.history.pushState({}, 'Test page', '/admin/reports');

      await waitFor(() => {
        expect(screen.getByText('Scoring Reports')).toBeInTheDocument();
      });

      // Click export button
      const exportButton = screen.getByRole('button', { name: /export csv/i });
      await user.click(exportButton);

      // Verify CSV export was triggered
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockAnchor.download).toContain('.csv');
    });

    it('should show detailed score breakdown', async () => {
      const user = userEvent.setup();
      
      const mocks = [
        {
          request: {
            query: LIST_ALL_SCORES,
          },
          result: {
            data: {
              listAllScores: {
                items: [mockScore1],
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </MockedProvider>
      );

      window.history.pushState({}, 'Test page', '/admin/reports');

      await waitFor(() => {
        expect(screen.getByText('Judge Smith')).toBeInTheDocument();
      });

      // Click to view details
      const detailsButton = screen.getByRole('button', { name: /view details/i });
      await user.click(detailsButton);

      // Verify detailed breakdown is shown
      await waitFor(() => {
        expect(screen.getByText('Cage Condition: 20')).toBeInTheDocument();
        expect(screen.getByText('Cat Condition: 22')).toBeInTheDocument();
        expect(screen.getByText('Grooming: 18')).toBeInTheDocument();
        expect(screen.getByText('Overall: 21')).toBeInTheDocument();
        expect(screen.getByText('Clean and organized')).toBeInTheDocument();
        expect(screen.getByText('Healthy and alert')).toBeInTheDocument();
      });
    });
  });

  describe('Role-Based Access Control', () => {
    it('should restrict scoring access to judges only', async () => {
      mockRoleUtils.isJudge.mockReturnValue(false);
      mockRoleUtils.isAdmin.mockReturnValue(false);
      mockRoleUtils.hasRole.mockReturnValue(false);

      render(
        <MockedProvider mocks={[]} addTypename={false}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </MockedProvider>
      );

      window.history.pushState({}, 'Test page', '/score/1');

      await waitFor(() => {
        expect(screen.getByText(/access denied/i)).toBeInTheDocument();
        expect(screen.getByText(/judge access required/i)).toBeInTheDocument();
      });
    });

    it('should restrict admin reports to admin users only', async () => {
      mockRoleUtils.isJudge.mockReturnValue(true);
      mockRoleUtils.isAdmin.mockReturnValue(false);
      mockRoleUtils.hasRole.mockImplementation((role) => role === 'judge');

      render(
        <MockedProvider mocks={[]} addTypename={false}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </MockedProvider>
      );

      window.history.pushState({}, 'Test page', '/admin/reports');

      await waitFor(() => {
        expect(screen.getByText(/access denied/i)).toBeInTheDocument();
        expect(screen.getByText(/admin access required/i)).toBeInTheDocument();
      });
    });

    it('should allow judges to view their own scores', async () => {
      mockRoleUtils.isJudge.mockReturnValue(true);
      mockRoleUtils.getCurrentUser.mockResolvedValue(mockJudge1);

      const mocks = [
        {
          request: {
            query: LIST_ALL_SCORES,
            variables: { judgeId: 'judge-1' },
          },
          result: {
            data: {
              getScoresByJudge: {
                items: [mockScore1],
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </MockedProvider>
      );

      window.history.pushState({}, 'Test page', '/judge/my-scores');

      await waitFor(() => {
        expect(screen.getByText('My Scores')).toBeInTheDocument();
        expect(screen.getByText('Judge Smith')).toBeInTheDocument();
        expect(screen.getByText('81')).toBeInTheDocument();
      });
    });

    it('should prevent judges from viewing other judges scores', async () => {
      mockRoleUtils.isJudge.mockReturnValue(true);
      mockRoleUtils.isAdmin.mockReturnValue(false);
      mockRoleUtils.getCurrentUser.mockResolvedValue(mockJudge1);

      render(
        <MockedProvider mocks={[]} addTypename={false}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </MockedProvider>
      );

      window.history.pushState({}, 'Test page', '/judge/scores/judge-2');

      await waitFor(() => {
        expect(screen.getByText(/access denied/i)).toBeInTheDocument();
        expect(screen.getByText(/cannot view other judges/i)).toBeInTheDocument();
      });
    });
  });

  describe('Real-Time Updates and Subscription Functionality', () => {
    it('should receive real-time score updates via subscriptions', async () => {
      const user = userEvent.setup();
      
      const subscriptionMock = {
        request: {
          query: ON_SCORE_UPDATE,
        },
        result: {
          data: {
            onScoreUpdate: {
              ...mockScore1,
              totalScore: 90,
              timestamp: '2024-01-15T12:00:00Z',
            },
          },
        },
      };

      const mocks = [
        {
          request: {
            query: LIST_ALL_SCORES,
          },
          result: {
            data: {
              listAllScores: {
                items: [mockScore1],
              },
            },
          },
        },
        subscriptionMock,
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </MockedProvider>
      );

      window.history.pushState({}, 'Test page', '/admin/live-scores');

      // Initial score should be displayed
      await waitFor(() => {
        expect(screen.getByText('81')).toBeInTheDocument();
      });

      // Simulate subscription update
      await waitFor(() => {
        expect(screen.getByText('90')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should update leaderboard in real-time', async () => {
      const initialScores = [
        { ...mockScore1, totalScore: 85 },
        { ...mockScore2, totalScore: 88 },
      ];

      const updatedScore = {
        ...mockScore1,
        totalScore: 95, // This should move to top
      };

      const subscriptionMock = {
        request: {
          query: ON_SCORE_UPDATE,
        },
        result: {
          data: {
            onScoreUpdate: updatedScore,
          },
        },
      };

      const mocks = [
        {
          request: {
            query: LIST_ALL_SCORES,
          },
          result: {
            data: {
              listAllScores: {
                items: initialScores,
              },
            },
          },
        },
        subscriptionMock,
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </MockedProvider>
      );

      window.history.pushState({}, 'Test page', '/leaderboard');

      // Initial order: Judge Johnson (88) should be first
      await waitFor(() => {
        const scoreRows = screen.getAllByTestId('leaderboard-row');
        expect(within(scoreRows[0]).getByText('88')).toBeInTheDocument();
        expect(within(scoreRows[1]).getByText('85')).toBeInTheDocument();
      });

      // After subscription update: Judge Smith (95) should be first
      await waitFor(() => {
        const scoreRows = screen.getAllByTestId('leaderboard-row');
        expect(within(scoreRows[0]).getByText('95')).toBeInTheDocument();
        expect(within(scoreRows[1]).getByText('88')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should show real-time notifications for score changes', async () => {
      const subscriptionMock = {
        request: {
          query: ON_SCORE_UPDATE,
        },
        result: {
          data: {
            onScoreUpdate: {
              ...mockScore1,
              totalScore: 92,
              judgeName: 'Judge Smith',
            },
          },
        },
      };

      const mocks = [subscriptionMock];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </MockedProvider>
      );

      window.history.pushState({}, 'Test page', '/admin/dashboard');

      // Should show notification for score update
      await waitFor(() => {
        expect(screen.getByText(/new score from judge smith/i)).toBeInTheDocument();
        expect(screen.getByText(/total: 92/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network errors gracefully', async () => {
      const errorMock = {
        request: {
          query: GET_CAT_BY_CAGE_NUMBER,
          variables: { cageNumber: 1 },
        },
        error: new Error('Network error'),
      };

      render(
        <MockedProvider mocks={[errorMock]} addTypename={false}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </MockedProvider>
      );

      window.history.pushState({}, 'Test page', '/score/1');

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should handle empty cage scenarios', async () => {
      const mocks = [
        {
          request: {
            query: GET_CAT_BY_CAGE_NUMBER,
            variables: { cageNumber: 999 },
          },
          result: {
            data: {
              getCatByCageNumber: null,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </MockedProvider>
      );

      window.history.pushState({}, 'Test page', '/score/999');

      await waitFor(() => {
        expect(screen.getByText(/no cat found in cage 999/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /back to cage selection/i })).toBeInTheDocument();
      });
    });

    it('should handle score finalization conflicts', async () => {
      const user = userEvent.setup();
      
      const conflictError = {
        request: {
          query: FINALIZE_SCORE,
          variables: { id: 'score-1' },
        },
        result: {
          errors: [
            {
              message: 'Score has been modified by another judge',
              extensions: {
                code: 'CONFLICT',
                conflictingScore: {
                  ...mockScore1,
                  totalScore: 90,
                  judgeName: 'Judge Johnson',
                },
              },
            },
          ],
        },
      };

      render(
        <MockedProvider mocks={[conflictError]} addTypename={false}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </MockedProvider>
      );

      window.history.pushState({}, 'Test page', '/score/1/finalize');

      const finalizeButton = screen.getByRole('button', { name: /finalize score/i });
      await user.click(finalizeButton);

      await waitFor(() => {
        expect(screen.getByText(/conflict detected/i)).toBeInTheDocument();
        expect(screen.getByText(/modified by judge johnson/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /resolve conflict/i })).toBeInTheDocument();
      });
    });
  });
});