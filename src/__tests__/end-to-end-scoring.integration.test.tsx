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

// Mock GraphQL queries (these will be implemented in the actual scoring feature)
const GET_CAT_BY_CAGE_NUMBER = 'GET_CAT_BY_CAGE_NUMBER';
const CREATE_SCORE = 'CREATE_SCORE';
const UPDATE_SCORE = 'UPDATE_SCORE';
const GET_SCORES_BY_CAT = 'GET_SCORES_BY_CAT';
const LIST_ALL_SCORES = 'LIST_ALL_SCORES';
const FINALIZE_SCORE = 'FINALIZE_SCORE';
const ON_SCORE_UPDATE = 'ON_SCORE_UPDATE';
const GET_SCORES_BY_JUDGE = 'GET_SCORES_BY_JUDGE';
const GET_CATS = 'GET_CATS';

// Mock WebSocket for subscriptions
class MockWebSocket {
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  
  constructor(url: string) {
    setTimeout(() => {
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 100);
  }
  
  send(data: string) {
    // Mock sending data
  }
  
  close() {
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }
}

// @ts-ignore
global.WebSocket = MockWebSocket;

// Mock authentication and roles
jest.mock('../utils/roleUtils', () => ({
  getCurrentUser: jest.fn(),
  hasRole: jest.fn(),
  isJudge: jest.fn(),
  isAdmin: jest.fn(),
  requireRole: jest.fn(),
}));

// Mock CSV export
const mockCreateObjectURL = jest.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = jest.fn();
Object.defineProperty(window.URL, 'createObjectURL', { value: mockCreateObjectURL });
Object.defineProperty(window.URL, 'revokeObjectURL', { value: mockRevokeObjectURL });

// Test data
const mockCats = [
  {
    id: 'cat-1',
    name: 'Fluffy',
    owner: 'John Doe',
    cageNumber: 1,
    votes: 5,
  },
  {
    id: 'cat-2',
    name: 'Whiskers',
    owner: 'Jane Smith',
    cageNumber: 2,
    votes: 3,
  },
  {
    id: 'cat-3',
    name: 'Shadow',
    owner: 'Bob Johnson',
    cageNumber: 3,
    votes: 8,
  },
];

const mockJudges = [
  {
    id: 'judge-1',
    name: 'Judge Smith',
    username: 'judge1@example.com',
    role: 'judge',
  },
  {
    id: 'judge-2',
    name: 'Judge Johnson',
    username: 'judge2@example.com',
    role: 'judge',
  },
];

const mockAdmin = {
  id: 'admin-1',
  name: 'Admin User',
  username: 'admin@example.com',
  role: 'admin',
};

describe('End-to-End Scoring Integration Tests', () => {
  let mockRoleUtils: any;

  beforeEach(() => {
    mockRoleUtils = require('../utils/roleUtils');
    jest.clearAllMocks();
    mockCreateObjectURL.mockClear();
    mockRevokeObjectURL.mockClear();
  });

  describe('Complete Scoring Workflow - Judge Perspective', () => {
    beforeEach(() => {
      mockRoleUtils.getCurrentUser.mockResolvedValue(mockJudges[0]);
      mockRoleUtils.hasRole.mockReturnValue(true);
      mockRoleUtils.isJudge.mockReturnValue(true);
      mockRoleUtils.isAdmin.mockReturnValue(false);
      mockRoleUtils.requireRole.mockResolvedValue(true);
    });

    it('should complete full scoring workflow from login to submission', async () => {
      const user = userEvent.setup();
      
      const mocks = [
        // Initial cat lookup
        {
          request: {
            query: GET_CAT_BY_CAGE_NUMBER,
            variables: { cageNumber: 1 },
          },
          result: {
            data: {
              getCatByCageNumber: mockCats[0],
            },
          },
        },
        // Check existing scores
        {
          request: {
            query: GET_SCORES_BY_CAT,
            variables: { catId: 'cat-1' },
          },
          result: {
            data: {
              getScoresByCat: {
                items: [],
                averageScore: null,
              },
            },
          },
        },
        // Create new score
        {
          request: {
            query: CREATE_SCORE,
            variables: {
              input: {
                catId: 'cat-1',
                cageConditionScore: 22,
                cageConditionComments: 'Very clean and well organized cage',
                catConditionScore: 24,
                catConditionComments: 'Healthy, alert, and well-behaved cat',
                groomingScore: 20,
                groomingComments: 'Good grooming, could be improved',
                overallScore: 23,
                overallComments: 'Excellent overall presentation',
                isFinalized: false,
              },
            },
          },
          result: {
            data: {
              createScore: {
                id: 'score-1',
                catId: 'cat-1',
                judgeId: 'judge-1',
                judgeName: 'Judge Smith',
                cageConditionScore: 22,
                cageConditionComments: 'Very clean and well organized cage',
                catConditionScore: 24,
                catConditionComments: 'Healthy, alert, and well-behaved cat',
                groomingScore: 20,
                groomingComments: 'Good grooming, could be improved',
                overallScore: 23,
                overallComments: 'Excellent overall presentation',
                totalScore: 89,
                timestamp: '2024-01-15T10:00:00Z',
                isFinalized: false,
              },
            },
          },
        },
        // Subscription for real-time updates
        {
          request: {
            query: ON_SCORE_UPDATE,
          },
          result: {
            data: {
              onScoreUpdate: {
                id: 'score-1',
                catId: 'cat-1',
                judgeId: 'judge-1',
                judgeName: 'Judge Smith',
                totalScore: 89,
                timestamp: '2024-01-15T10:00:00Z',
                isFinalized: false,
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

      // Navigate to scoring page
      window.history.pushState({}, 'Test page', '/score/1');

      // Wait for page to load and cat information to display
      await waitFor(() => {
        expect(screen.getByText('Scoring for Cage #1')).toBeInTheDocument();
        expect(screen.getByText('Fluffy')).toBeInTheDocument();
        expect(screen.getByText('Owner: John Doe')).toBeInTheDocument();
      });

      // Verify scoring form is displayed
      expect(screen.getByLabelText(/cage condition/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/cat condition/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/grooming/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/overall presentation/i)).toBeInTheDocument();

      // Fill out the scoring form
      const cageConditionInput = screen.getByLabelText(/cage condition/i);
      const catConditionInput = screen.getByLabelText(/cat condition/i);
      const groomingInput = screen.getByLabelText(/grooming/i);
      const overallInput = screen.getByLabelText(/overall presentation/i);

      await user.clear(cageConditionInput);
      await user.type(cageConditionInput, '22');
      
      await user.clear(catConditionInput);
      await user.type(catConditionInput, '24');
      
      await user.clear(groomingInput);
      await user.type(groomingInput, '20');
      
      await user.clear(overallInput);
      await user.type(overallInput, '23');

      // Verify real-time total calculation
      await waitFor(() => {
        expect(screen.getByText('Total Score: 89')).toBeInTheDocument();
      });

      // Add comments for each category
      const cageComments = screen.getByLabelText(/cage.*comments/i);
      const catComments = screen.getByLabelText(/cat.*comments/i);
      const groomingComments = screen.getByLabelText(/grooming.*comments/i);
      const overallComments = screen.getByLabelText(/overall.*comments/i);

      await user.type(cageComments, 'Very clean and well organized cage');
      await user.type(catComments, 'Healthy, alert, and well-behaved cat');
      await user.type(groomingComments, 'Good grooming, could be improved');
      await user.type(overallComments, 'Excellent overall presentation');

      // Submit the score
      const submitButton = screen.getByRole('button', { name: /submit score/i });
      expect(submitButton).toBeEnabled();
      
      await user.click(submitButton);

      // Verify success message and score submission
      await waitFor(() => {
        expect(screen.getByText(/score submitted successfully/i)).toBeInTheDocument();
      });

      // Verify the score is now displayed as submitted
      await waitFor(() => {
        expect(screen.getByText(/score submitted/i)).toBeInTheDocument();
        expect(screen.getByText('Total: 89')).toBeInTheDocument();
      });
    });

    it('should handle score editing workflow', async () => {
      const user = userEvent.setup();
      
      const existingScore = {
        id: 'score-1',
        catId: 'cat-1',
        judgeId: 'judge-1',
        judgeName: 'Judge Smith',
        cageConditionScore: 20,
        cageConditionComments: 'Clean cage',
        catConditionScore: 22,
        catConditionComments: 'Healthy cat',
        groomingScore: 18,
        groomingComments: 'Well groomed',
        overallScore: 21,
        overallComments: 'Good presentation',
        totalScore: 81,
        timestamp: '2024-01-15T09:00:00Z',
        isFinalized: false,
      };

      const mocks = [
        {
          request: {
            query: GET_CAT_BY_CAGE_NUMBER,
            variables: { cageNumber: 1 },
          },
          result: {
            data: {
              getCatByCageNumber: mockCats[0],
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
                items: [existingScore],
                averageScore: 81,
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
                groomingScore: 23,
                groomingComments: 'Outstanding grooming',
              },
            },
          },
          result: {
            data: {
              updateScore: {
                ...existingScore,
                cageConditionScore: 25,
                cageConditionComments: 'Exceptional cage setup',
                groomingScore: 23,
                groomingComments: 'Outstanding grooming',
                totalScore: 91,
                timestamp: '2024-01-15T10:30:00Z',
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
        expect(screen.getByDisplayValue('20')).toBeInTheDocument(); // Cage condition
        expect(screen.getByDisplayValue('Clean cage')).toBeInTheDocument();
        expect(screen.getByText('Current Total: 81')).toBeInTheDocument();
      });

      // Edit some scores
      const cageConditionInput = screen.getByLabelText(/cage condition/i);
      const groomingInput = screen.getByLabelText(/grooming/i);

      await user.clear(cageConditionInput);
      await user.type(cageConditionInput, '25');

      await user.clear(groomingInput);
      await user.type(groomingInput, '23');

      // Update comments
      const cageComments = screen.getByLabelText(/cage.*comments/i);
      const groomingComments = screen.getByLabelText(/grooming.*comments/i);

      await user.clear(cageComments);
      await user.type(cageComments, 'Exceptional cage setup');

      await user.clear(groomingComments);
      await user.type(groomingComments, 'Outstanding grooming');

      // Verify updated total calculation
      await waitFor(() => {
        expect(screen.getByText('Total Score: 91')).toBeInTheDocument();
      });

      // Update the score
      const updateButton = screen.getByRole('button', { name: /update score/i });
      await user.click(updateButton);

      // Verify success message
      await waitFor(() => {
        expect(screen.getByText(/score updated successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Multi-Judge Scoring Scenarios', () => {
    it('should handle multiple judges scoring the same cat', async () => {
      const user = userEvent.setup();
      
      // Set up as admin to view all scores
      mockRoleUtils.getCurrentUser.mockResolvedValue(mockAdmin);
      mockRoleUtils.isAdmin.mockReturnValue(true);
      mockRoleUtils.isJudge.mockReturnValue(false);

      const judge1Score = {
        id: 'score-1',
        catId: 'cat-1',
        judgeId: 'judge-1',
        judgeName: 'Judge Smith',
        cageConditionScore: 22,
        catConditionScore: 24,
        groomingScore: 20,
        overallScore: 23,
        totalScore: 89,
        timestamp: '2024-01-15T10:00:00Z',
        isFinalized: true,
      };

      const judge2Score = {
        id: 'score-2',
        catId: 'cat-1',
        judgeId: 'judge-2',
        judgeName: 'Judge Johnson',
        cageConditionScore: 25,
        catConditionScore: 22,
        groomingScore: 24,
        overallScore: 21,
        totalScore: 92,
        timestamp: '2024-01-15T11:00:00Z',
        isFinalized: true,
      };

      const mocks = [
        {
          request: {
            query: GET_SCORES_BY_CAT,
            variables: { catId: 'cat-1' },
          },
          result: {
            data: {
              getScoresByCat: {
                items: [judge1Score, judge2Score],
                averageScore: 90.5,
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

      // Wait for scores to load
      await waitFor(() => {
        expect(screen.getByText('Scores for Fluffy')).toBeInTheDocument();
        expect(screen.getByText('Average Score: 90.5')).toBeInTheDocument();
      });

      // Verify both judges' scores are displayed
      expect(screen.getByText('Judge Smith')).toBeInTheDocument();
      expect(screen.getByText('Judge Johnson')).toBeInTheDocument();
      expect(screen.getByText('89')).toBeInTheDocument();
      expect(screen.getByText('92')).toBeInTheDocument();

      // Verify score details can be expanded
      const judge1Card = screen.getByText('Judge Smith').closest('[data-testid="score-card"]');
      const judge2Card = screen.getByText('Judge Johnson').closest('[data-testid="score-card"]');

      expect(within(judge1Card!).getByText('89')).toBeInTheDocument();
      expect(within(judge2Card!).getByText('92')).toBeInTheDocument();

      // Click to view detailed breakdown
      const viewDetailsButton = within(judge1Card!).getByRole('button', { name: /view details/i });
      await user.click(viewDetailsButton);

      await waitFor(() => {
        expect(screen.getByText('Cage Condition: 22')).toBeInTheDocument();
        expect(screen.getByText('Cat Condition: 24')).toBeInTheDocument();
        expect(screen.getByText('Grooming: 20')).toBeInTheDocument();
        expect(screen.getByText('Overall: 23')).toBeInTheDocument();
      });
    });
  });

  describe('Administrative Reports and Export', () => {
    beforeEach(() => {
      mockRoleUtils.getCurrentUser.mockResolvedValue(mockAdmin);
      mockRoleUtils.isAdmin.mockReturnValue(true);
      mockRoleUtils.isJudge.mockReturnValue(false);
    });

    it('should generate comprehensive scoring reports with export functionality', async () => {
      const user = userEvent.setup();
      
      const allScores = [
        {
          id: 'score-1',
          catId: 'cat-1',
          catName: 'Fluffy',
          catOwner: 'John Doe',
          cageNumber: 1,
          judgeId: 'judge-1',
          judgeName: 'Judge Smith',
          totalScore: 89,
          timestamp: '2024-01-15T10:00:00Z',
          isFinalized: true,
        },
        {
          id: 'score-2',
          catId: 'cat-2',
          catName: 'Whiskers',
          catOwner: 'Jane Smith',
          cageNumber: 2,
          judgeId: 'judge-1',
          judgeName: 'Judge Smith',
          totalScore: 85,
          timestamp: '2024-01-15T10:30:00Z',
          isFinalized: true,
        },
        {
          id: 'score-3',
          catId: 'cat-1',
          catName: 'Fluffy',
          catOwner: 'John Doe',
          cageNumber: 1,
          judgeId: 'judge-2',
          judgeName: 'Judge Johnson',
          totalScore: 92,
          timestamp: '2024-01-15T11:00:00Z',
          isFinalized: true,
        },
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
                items: allScores,
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
        expect(screen.getByText('Total Scores: 3')).toBeInTheDocument();
      });

      // Verify scores are sorted by highest total (descending)
      const scoreRows = screen.getAllByTestId('score-row');
      expect(scoreRows).toHaveLength(3);
      
      // First row should be highest score (92)
      expect(within(scoreRows[0]).getByText('92')).toBeInTheDocument();
      expect(within(scoreRows[0]).getByText('Judge Johnson')).toBeInTheDocument();
      
      // Second row should be 89
      expect(within(scoreRows[1]).getByText('89')).toBeInTheDocument();
      expect(within(scoreRows[1]).getByText('Judge Smith')).toBeInTheDocument();

      // Test filtering by judge
      const judgeFilter = screen.getByLabelText(/filter by judge/i);
      await user.selectOptions(judgeFilter, 'judge-1');

      await waitFor(() => {
        const filteredRows = screen.getAllByTestId('score-row');
        expect(filteredRows).toHaveLength(2); // Only Judge Smith's scores
        expect(screen.queryByText('Judge Johnson')).not.toBeInTheDocument();
      });

      // Reset filter
      await user.selectOptions(judgeFilter, '');

      // Test CSV export
      const exportButton = screen.getByRole('button', { name: /export csv/i });
      await user.click(exportButton);

      // Verify CSV export was triggered
      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalled();
      });

      // Verify CSV content structure
      const csvBlob = mockCreateObjectURL.mock.calls[0][0];
      expect(csvBlob.type).toBe('text/csv');
    });

    it('should show detailed score breakdown with comments', async () => {
      const user = userEvent.setup();
      
      const detailedScore = {
        id: 'score-1',
        catId: 'cat-1',
        catName: 'Fluffy',
        judgeId: 'judge-1',
        judgeName: 'Judge Smith',
        cageConditionScore: 22,
        cageConditionComments: 'Very clean and well organized cage',
        catConditionScore: 24,
        catConditionComments: 'Healthy, alert, and well-behaved cat',
        groomingScore: 20,
        groomingComments: 'Good grooming, could be improved',
        overallScore: 23,
        overallComments: 'Excellent overall presentation',
        totalScore: 89,
        timestamp: '2024-01-15T10:00:00Z',
        isFinalized: true,
      };

      const mocks = [
        {
          request: {
            query: LIST_ALL_SCORES,
          },
          result: {
            data: {
              listAllScores: {
                items: [detailedScore],
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

      // Click to view detailed breakdown
      const detailsButton = screen.getByRole('button', { name: /view details/i });
      await user.click(detailsButton);

      // Verify detailed breakdown is shown
      await waitFor(() => {
        expect(screen.getByText('Score Breakdown')).toBeInTheDocument();
        expect(screen.getByText('Cage Condition: 22/25')).toBeInTheDocument();
        expect(screen.getByText('Cat Condition: 24/25')).toBeInTheDocument();
        expect(screen.getByText('Grooming: 20/25')).toBeInTheDocument();
        expect(screen.getByText('Overall: 23/25')).toBeInTheDocument();
        
        // Verify comments are displayed
        expect(screen.getByText('Very clean and well organized cage')).toBeInTheDocument();
        expect(screen.getByText('Healthy, alert, and well-behaved cat')).toBeInTheDocument();
        expect(screen.getByText('Good grooming, could be improved')).toBeInTheDocument();
        expect(screen.getByText('Excellent overall presentation')).toBeInTheDocument();
      });
    });
  });

  describe('Real-Time Updates and Notifications', () => {
    it('should show real-time score updates across multiple components', async () => {
      const user = userEvent.setup();
      
      mockRoleUtils.getCurrentUser.mockResolvedValue(mockAdmin);
      mockRoleUtils.isAdmin.mockReturnValue(true);

      const initialScores = [
        {
          id: 'score-1',
          catId: 'cat-1',
          catName: 'Fluffy',
          judgeId: 'judge-1',
          judgeName: 'Judge Smith',
          totalScore: 85,
          timestamp: '2024-01-15T10:00:00Z',
          isFinalized: false,
        },
      ];

      const updatedScore = {
        id: 'score-1',
        catId: 'cat-1',
        catName: 'Fluffy',
        judgeId: 'judge-1',
        judgeName: 'Judge Smith',
        totalScore: 92,
        timestamp: '2024-01-15T10:30:00Z',
        isFinalized: true,
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
        {
          request: {
            query: ON_SCORE_UPDATE,
          },
          result: {
            data: {
              onScoreUpdate: updatedScore,
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

      window.history.pushState({}, 'Test page', '/admin/live-dashboard');

      // Initial score should be displayed
      await waitFor(() => {
        expect(screen.getByText('85')).toBeInTheDocument();
        expect(screen.getByText('In Progress')).toBeInTheDocument();
      });

      // Simulate real-time update
      await waitFor(() => {
        expect(screen.getByText('92')).toBeInTheDocument();
        expect(screen.getByText('Finalized')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify notification appears
      await waitFor(() => {
        expect(screen.getByText(/score updated/i)).toBeInTheDocument();
        expect(screen.getByText(/judge smith finalized/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network errors with retry functionality', async () => {
      const user = userEvent.setup();
      
      mockRoleUtils.getCurrentUser.mockResolvedValue(mockJudges[0]);
      mockRoleUtils.isJudge.mockReturnValue(true);

      let attemptCount = 0;
      const errorThenSuccessMock = {
        request: {
          query: GET_CAT_BY_CAGE_NUMBER,
          variables: { cageNumber: 1 },
        },
        result: () => {
          attemptCount++;
          if (attemptCount === 1) {
            throw new Error('Network error');
          }
          return {
            data: {
              getCatByCageNumber: mockCats[0],
            },
          };
        },
      };

      render(
        <MockedProvider mocks={[errorThenSuccessMock]} addTypename={false}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </MockedProvider>
      );

      window.history.pushState({}, 'Test page', '/score/1');

      // Should show error initially
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });

      // Click retry
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      // Should succeed on retry
      await waitFor(() => {
        expect(screen.getByText('Fluffy')).toBeInTheDocument();
        expect(screen.queryByText(/network error/i)).not.toBeInTheDocument();
      });
    });

    it('should handle validation errors gracefully', async () => {
      const user = userEvent.setup();
      
      mockRoleUtils.getCurrentUser.mockResolvedValue(mockJudges[0]);
      mockRoleUtils.isJudge.mockReturnValue(true);

      const mocks = [
        {
          request: {
            query: GET_CAT_BY_CAGE_NUMBER,
            variables: { cageNumber: 1 },
          },
          result: {
            data: {
              getCatByCageNumber: mockCats[0],
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
                cageConditionScore: 30, // Invalid score > 25
                catConditionScore: 20,
                groomingScore: 20,
                overallScore: 20,
              },
            },
          },
          result: {
            errors: [
              {
                message: 'Validation failed: Cage condition score must be between 0 and 25',
                extensions: {
                  code: 'VALIDATION_ERROR',
                  field: 'cageConditionScore',
                },
              },
            ],
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

      // Enter invalid score
      const cageConditionInput = screen.getByLabelText(/cage condition/i);
      await user.clear(cageConditionInput);
      await user.type(cageConditionInput, '30');

      // Fill other valid scores
      const catConditionInput = screen.getByLabelText(/cat condition/i);
      await user.clear(catConditionInput);
      await user.type(catConditionInput, '20');

      // Try to submit
      const submitButton = screen.getByRole('button', { name: /submit score/i });
      await user.click(submitButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/cage condition score must be between 0 and 25/i)).toBeInTheDocument();
      });

      // Form should remain editable
      expect(cageConditionInput).not.toBeDisabled();
    });
  });
});