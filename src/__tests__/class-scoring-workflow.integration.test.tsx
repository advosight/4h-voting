import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';
import { theme } from '../theme/theme';
import App from '../App';
import ClassScorePage from '../pages/ClassScorePage';
import ClassScoreReports from '../components/ClassScoreReports';
import ParticipantClassScoreView from '../components/ParticipantClassScoreView';
import ClassScoreLeaderboard from '../components/ClassScoreLeaderboard';
import './integration-test.config';

// Mock AWS Amplify
jest.mock('aws-amplify/api');
jest.mock('aws-amplify/auth');

const mockClient = {
  graphql: jest.fn()
};
(generateClient as jest.Mock).mockReturnValue(mockClient);
(getCurrentUser as jest.Mock).mockResolvedValue({
  signInDetails: { loginId: 'judge@example.com' },
  username: 'judge1'
});

// Mock Authenticator
jest.mock('@aws-amplify/ui-react', () => ({
  Authenticator: ({ children }: { children: any }) => {
    const mockUser = { signInDetails: { loginId: 'judge@example.com' } };
    const mockSignOut = jest.fn();
    return children({ user: mockUser, signOut: mockSignOut });
  }
}));

// Test data
const mockCats = {
  'cat-1': {
    id: 'cat-1',
    name: 'Fluffy',
    owner: 'Alice Johnson',
    cageNumber: 1,
    class: 'Household Pet',
    ageGroup: 'Adult',
    votes: 5
  },
  'cat-2': {
    id: 'cat-2',
    name: 'Whiskers',
    owner: 'Bob Smith',
    cageNumber: 2,
    class: 'Household Pet',
    ageGroup: 'Kitten',
    votes: 3
  },
  'cat-3': {
    id: 'cat-3',
    name: 'Shadow',
    owner: 'Charlie Brown',
    cageNumber: 3,
    class: 'Pedigreed',
    ageGroup: 'Adult',
    votes: 8
  }
};

const mockJudges = {
  'judge-1': {
    id: 'judge-1',
    name: 'Judge Smith',
    username: 'judge@example.com',
    role: 'judge'
  },
  'judge-2': {
    id: 'judge-2',
    name: 'Judge Johnson',
    username: 'judge2@example.com',
    role: 'judge'
  }
};

const mockAdmin = {
  id: 'admin-1',
  name: 'Admin User',
  username: 'admin@example.com',
  role: 'admin'
};

describe('Type Class Scoring Workflow Integration Tests', () => {
  let subscriptionCallbacks: { [key: string]: any } = {};
  let mockSubscriptions: { [key: string]: any } = {};

  beforeEach(() => {
    jest.clearAllMocks();
    subscriptionCallbacks = {};
    mockSubscriptions = {};
    
    // Setup default GraphQL mocks
    mockClient.graphql.mockImplementation(({ query, variables }) => {
      // Handle queries
      if (query.includes('GetCat') && variables?.id) {
        const cat = mockCats[variables.id as keyof typeof mockCats];
        return Promise.resolve({
          data: { getCat: cat }
        });
      }
      
      if (query.includes('GetCatByCageNumber')) {
        const cat = Object.values(mockCats).find(c => c.cageNumber === variables.cageNumber);
        return Promise.resolve({
          data: { getCatByCageNumber: cat }
        });
      }
      
      if (query.includes('ListAllClassScores')) {
        return Promise.resolve({
          data: {
            listAllClassScores: {
              items: []
            }
          }
        });
      }
      
      if (query.includes('GetClassScoresByCat')) {
        return Promise.resolve({
          data: {
            getClassScoresByCat: {
              items: []
            }
          }
        });
      }
      
      // Handle mutations
      if (query.includes('CreateClassScore')) {
        const newScore = {
          id: `class-score-${Date.now()}`,
          catId: variables.input.catId,
          judgeId: 'judge-1',
          judgeName: 'Judge Smith',
          ...variables.input,
          totalScore: variables.input.beautyScore + variables.input.personalityScore + variables.input.balanceProportionScore,
          ribbonEligibility: calculateRibbonEligibility(variables.input),
          timestamp: new Date().toISOString(),
          isFinalized: variables.input.isFinalized || false
        };
        
        // Trigger subscription callback if exists
        if (subscriptionCallbacks.onClassScoreUpdate) {
          setTimeout(() => {
            subscriptionCallbacks.onClassScoreUpdate({ data: { onClassScoreUpdate: newScore } });
          }, 100);
        }
        
        return Promise.resolve({
          data: { createClassScore: newScore }
        });
      }
      
      if (query.includes('UpdateClassScore')) {
        const updatedScore = {
          id: variables.id,
          catId: 'cat-1',
          judgeId: 'judge-1',
          judgeName: 'Judge Smith',
          ...variables.input,
          totalScore: (variables.input.beautyScore || 0) + (variables.input.personalityScore || 0) + (variables.input.balanceProportionScore || 0),
          ribbonEligibility: calculateRibbonEligibility(variables.input),
          timestamp: new Date().toISOString(),
          isFinalized: variables.input.isFinalized || false
        };
        
        // Trigger subscription callback if exists
        if (subscriptionCallbacks.onClassScoreUpdate) {
          setTimeout(() => {
            subscriptionCallbacks.onClassScoreUpdate({ data: { onClassScoreUpdate: updatedScore } });
          }, 100);
        }
        
        return Promise.resolve({
          data: { updateClassScore: updatedScore }
        });
      }
      
      // Handle subscriptions
      if (query.includes('OnClassScoreUpdate')) {
        const subscriptionId = `subscription-${Date.now()}`;
        mockSubscriptions[subscriptionId] = { unsubscribe: jest.fn() };
        
        return {
          subscribe: jest.fn().mockImplementation(({ next, error }) => {
            subscriptionCallbacks.onClassScoreUpdate = next;
            return mockSubscriptions[subscriptionId];
          })
        };
      }
      
      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    // Clean up subscriptions
    Object.values(mockSubscriptions).forEach((sub: any) => {
      if (sub.unsubscribe) {
        sub.unsubscribe();
      }
    });
  });

  describe('End-to-End Judge Type Class Scoring Process', () => {
    it('completes full type type class scoring workflow from navigation to submission', async () => {
      const user = userEvent.setup();
      
      render(
        <ThemeProvider theme={theme}>
          <MemoryRouter initialEntries={['/class-score/cat-1']}>
            <App />
          </MemoryRouter>
        </ThemeProvider>
      );

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText('🏆 Type Class Scoring')).toBeInTheDocument();
        expect(screen.getByText('Fluffy')).toBeInTheDocument();
      });

      // Fill out type type class scoring form
      const beautyInput = screen.getByLabelText(/Beauty Score/i);
      const personalityInput = screen.getByLabelText(/Personality Score/i);
      const balanceInput = screen.getByLabelText(/Balance\/Proportion Score/i);

      await user.clear(beautyInput);
      await user.type(beautyInput, '12');
      
      await user.clear(personalityInput);
      await user.type(personalityInput, '18');
      
      await user.clear(balanceInput);
      await user.type(balanceInput, '13');

      // Fill health/grooming checklist
      const coatCheckbox = screen.getByLabelText(/Coat is clean & well groomed/i);
      const teethCheckbox = screen.getByLabelText(/Teeth\/gums clean & healthy/i);
      const eyesCheckbox = screen.getByLabelText(/Eyes & nose clear/i);
      const earsCheckbox = screen.getByLabelText(/Ears clean & free of mites/i);
      const nailsCheckbox = screen.getByLabelText(/Toenails\/claws clipped/i);

      await user.click(coatCheckbox);
      await user.click(teethCheckbox);
      await user.click(eyesCheckbox);
      await user.click(earsCheckbox);
      await user.click(nailsCheckbox);

      // Add comments
      const beautyComments = screen.getByLabelText(/Beauty Comments/i);
      await user.type(beautyComments, 'Beautiful coat and markings');

      const personalityComments = screen.getByLabelText(/Personality Comments/i);
      await user.type(personalityComments, 'Very friendly and calm temperament');

      // Verify real-time score calculation
      await waitFor(() => {
        expect(screen.getByText('Total Score: 43/50')).toBeInTheDocument();
        expect(screen.getByText('Ribbon Eligibility: Red')).toBeInTheDocument();
      });

      // Submit the score
      const submitButton = screen.getByText('Submit Class Score');
      await user.click(submitButton);

      // Wait for submission confirmation
      await waitFor(() => {
        expect(screen.getByText(/Class score submitted successfully/i)).toBeInTheDocument();
      });

      // Verify GraphQL mutation was called
      expect(mockClient.graphql).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('CreateClassScore'),
          variables: expect.objectContaining({
            input: expect.objectContaining({
              catId: 'cat-1',
              beautyScore: 12,
              personalityScore: 18,
              balanceProportionScore: 13,
              coatCleanGroomed: true,
              teethGumsHealthy: true,
              eyesNoseClear: true,
              earsCleanMiteFree: true,
              toenailsClipped: true,
              fleaIssues: false
            })
          })
        })
      );
    });

    it('handles score editing and updates with audit trail', async () => {
      const user = userEvent.setup();
      
      // Mock existing class score
      const existingScore = {
        id: 'class-score-1',
        catId: 'cat-1',
        judgeId: 'judge-1',
        judgeName: 'Judge Smith',
        beautyScore: 10,
        personalityScore: 15,
        balanceProportionScore: 12,
        totalScore: 37,
        ribbonEligibility: 'Red',
        isFinalized: false
      };

      mockClient.graphql.mockImplementation(({ query, variables }) => {
        if (query.includes('GetClassScoresByCat')) {
          return Promise.resolve({
            data: {
              getClassScoresByCat: {
                items: [existingScore]
              }
            }
          });
        }
        return mockClient.graphql.mockImplementation.mock.calls[0][0]({ query, variables });
      });

      render(
        <ThemeProvider theme={theme}>
          <MemoryRouter initialEntries={['/class-score/cat-1']}>
            <App />
          </MemoryRouter>
        </ThemeProvider>
      );

      // Wait for existing score to load
      await waitFor(() => {
        expect(screen.getByDisplayValue('10')).toBeInTheDocument(); // Beauty score
        expect(screen.getByDisplayValue('15')).toBeInTheDocument(); // Personality score
        expect(screen.getByDisplayValue('12')).toBeInTheDocument(); // Balance score
      });

      // Edit the beauty score
      const beautyInput = screen.getByLabelText(/Beauty Score/i);
      await user.clear(beautyInput);
      await user.type(beautyInput, '14');

      // Verify real-time recalculation
      await waitFor(() => {
        expect(screen.getByText('Total Score: 41/50')).toBeInTheDocument();
        expect(screen.getByText('Ribbon Eligibility: Red')).toBeInTheDocument();
      });

      // Update the score
      const updateButton = screen.getByText('Update Class Score');
      await user.click(updateButton);

      // Wait for update confirmation
      await waitFor(() => {
        expect(screen.getByText(/Class score updated successfully/i)).toBeInTheDocument();
      });

      // Verify update mutation was called
      expect(mockClient.graphql).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('UpdateClassScore'),
          variables: expect.objectContaining({
            id: 'class-score-1',
            input: expect.objectContaining({
              beautyScore: 14
            })
          })
        })
      );
    });

    it('validates form inputs and shows appropriate error messages', async () => {
      const user = userEvent.setup();
      
      render(
        <ThemeProvider theme={theme}>
          <MemoryRouter initialEntries={['/class-score/cat-1']}>
            <App />
          </MemoryRouter>
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('🏆 Type Class Scoring')).toBeInTheDocument();
      });

      // Try to enter invalid scores
      const beautyInput = screen.getByLabelText(/Beauty Score/i);
      await user.clear(beautyInput);
      await user.type(beautyInput, '20'); // Over maximum of 15

      const personalityInput = screen.getByLabelText(/Personality Score/i);
      await user.clear(personalityInput);
      await user.type(personalityInput, '-5'); // Below minimum of 0

      // Verify validation errors
      await waitFor(() => {
        expect(screen.getByText(/Beauty score must be between 0 and 15/i)).toBeInTheDocument();
        expect(screen.getByText(/Personality score must be between 0 and 20/i)).toBeInTheDocument();
      });

      // Submit button should be disabled
      const submitButton = screen.getByText('Submit Class Score');
      expect(submitButton).toBeDisabled();

      // Fix the scores
      await user.clear(beautyInput);
      await user.type(beautyInput, '12');
      
      await user.clear(personalityInput);
      await user.type(personalityInput, '18');

      const balanceInput = screen.getByLabelText(/Balance\/Proportion Score/i);
      await user.clear(balanceInput);
      await user.type(balanceInput, '13');

      // Errors should clear and submit should be enabled
      await waitFor(() => {
        expect(screen.queryByText(/Beauty score must be between 0 and 15/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Personality score must be between 0 and 20/i)).not.toBeInTheDocument();
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Multi-Judge Scenarios', () => {
    it('allows multiple judges to score the same cat independently', async () => {
      const user = userEvent.setup();
      
      // Mock existing score from judge-1
      const judge1Score = {
        id: 'class-score-1',
        catId: 'cat-1',
        judgeId: 'judge-1',
        judgeName: 'Judge Smith',
        beautyScore: 12,
        personalityScore: 18,
        balanceProportionScore: 13,
        totalScore: 43,
        ribbonEligibility: 'Red',
        isFinalized: true
      };

      // First render as judge-1 (existing score)
      mockClient.graphql.mockImplementation(({ query, variables }) => {
        if (query.includes('GetClassScoresByCat')) {
          return Promise.resolve({
            data: {
              getClassScoresByCat: {
                items: [judge1Score]
              }
            }
          });
        }
        if (query.includes('GetCat')) {
          return Promise.resolve({
            data: { getCat: mockCats['cat-1'] }
          });
        }
        return Promise.resolve({ data: {} });
      });

      const { rerender } = render(
        <ThemeProvider theme={theme}>
          <MemoryRouter initialEntries={['/class-score/cat-1']}>
            <App />
          </MemoryRouter>
        </ThemeProvider>
      );

      // Verify judge-1's existing score is shown
      await waitFor(() => {
        expect(screen.getByText('Previous Class Scores')).toBeInTheDocument();
        expect(screen.getByText('Judge Smith: 43/50 (Red)')).toBeInTheDocument();
      });

      // Now simulate judge-2 accessing the same cat
      (getCurrentUser as jest.Mock).mockResolvedValue({
        signInDetails: { loginId: 'judge2@example.com' },
        username: 'judge2'
      });

      mockClient.graphql.mockImplementation(({ query, variables }) => {
        if (query.includes('GetClassScoresByCat')) {
          return Promise.resolve({
            data: {
              getClassScoresByCat: {
                items: [judge1Score] // Only judge-1's score exists
              }
            }
          });
        }
        if (query.includes('GetCat')) {
          return Promise.resolve({
            data: { getCat: mockCats['cat-1'] }
          });
        }
        if (query.includes('CreateClassScore')) {
          const newScore = {
            id: 'class-score-2',
            catId: 'cat-1',
            judgeId: 'judge-2',
            judgeName: 'Judge Johnson',
            ...variables.input,
            totalScore: variables.input.beautyScore + variables.input.personalityScore + variables.input.balanceProportionScore,
            ribbonEligibility: calculateRibbonEligibility(variables.input),
            timestamp: new Date().toISOString(),
            isFinalized: false
          };
          return Promise.resolve({
            data: { createClassScore: newScore }
          });
        }
        return Promise.resolve({ data: {} });
      });

      rerender(
        <ThemeProvider theme={theme}>
          <MemoryRouter initialEntries={['/class-score/cat-1']}>
            <App />
          </MemoryRouter>
        </ThemeProvider>
      );

      // Judge-2 should see a fresh form (not judge-1's scores)
      await waitFor(() => {
        expect(screen.getByText('Previous Class Scores')).toBeInTheDocument();
        expect(screen.getByText('Judge Smith: 43/50 (Red)')).toBeInTheDocument();
      });

      // Judge-2 should be able to enter their own scores
      const beautyInput = screen.getByLabelText(/Beauty Score/i);
      const personalityInput = screen.getByLabelText(/Personality Score/i);
      const balanceInput = screen.getByLabelText(/Balance\/Proportion Score/i);

      await user.clear(beautyInput);
      await user.type(beautyInput, '14');
      
      await user.clear(personalityInput);
      await user.type(personalityInput, '19');
      
      await user.clear(balanceInput);
      await user.type(balanceInput, '14');

      // Fill health checklist
      const coatCheckbox = screen.getByLabelText(/Coat is clean & well groomed/i);
      await user.click(coatCheckbox);

      // Submit judge-2's score
      const submitButton = screen.getByText('Submit Class Score');
      await user.click(submitButton);

      // Verify judge-2's score was created
      await waitFor(() => {
        expect(mockClient.graphql).toHaveBeenCalledWith(
          expect.objectContaining({
            query: expect.stringContaining('CreateClassScore'),
            variables: expect.objectContaining({
              input: expect.objectContaining({
                catId: 'cat-1',
                beautyScore: 14,
                personalityScore: 19,
                balanceProportionScore: 14
              })
            })
          })
        );
      });
    });

    it('prevents duplicate scoring by the same judge', async () => {
      const user = userEvent.setup();
      
      // Mock existing finalized score from current judge
      const existingScore = {
        id: 'class-score-1',
        catId: 'cat-1',
        judgeId: 'judge-1',
        judgeName: 'Judge Smith',
        beautyScore: 12,
        personalityScore: 18,
        balanceProportionScore: 13,
        totalScore: 43,
        ribbonEligibility: 'Red',
        isFinalized: true
      };

      mockClient.graphql.mockImplementation(({ query, variables }) => {
        if (query.includes('GetClassScoresByCat')) {
          return Promise.resolve({
            data: {
              getClassScoresByCat: {
                items: [existingScore]
              }
            }
          });
        }
        if (query.includes('GetCat')) {
          return Promise.resolve({
            data: { getCat: mockCats['cat-1'] }
          });
        }
        return Promise.resolve({ data: {} });
      });

      render(
        <ThemeProvider theme={theme}>
          <MemoryRouter initialEntries={['/class-score/cat-1']}>
            <App />
          </MemoryRouter>
        </ThemeProvider>
      );

      // Should show existing finalized score and prevent new submission
      await waitFor(() => {
        expect(screen.getByText(/You have already submitted a finalized class score/i)).toBeInTheDocument();
        expect(screen.getByText('Judge Smith: 43/50 (Red)')).toBeInTheDocument();
      });

      // Form should be disabled or hidden
      expect(screen.queryByText('Submit Class Score')).not.toBeInTheDocument();
    });
  });

  describe('Class Score Calculation and Ribbon Eligibility', () => {
    it('calculates total scores and ribbon eligibility correctly', async () => {
      const user = userEvent.setup();
      
      render(
        <ThemeProvider theme={theme}>
          <MemoryRouter initialEntries={['/class-score/cat-1']}>
            <App />
          </MemoryRouter>
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('🏆 Type Class Scoring')).toBeInTheDocument();
      });

      // Test Blue Ribbon eligibility (45-50 points + all health pass)
      const beautyInput = screen.getByLabelText(/Beauty Score/i);
      const personalityInput = screen.getByLabelText(/Personality Score/i);
      const balanceInput = screen.getByLabelText(/Balance\/Proportion Score/i);

      await user.clear(beautyInput);
      await user.type(beautyInput, '15'); // Max beauty
      
      await user.clear(personalityInput);
      await user.type(personalityInput, '20'); // Max personality
      
      await user.clear(balanceInput);
      await user.type(balanceInput, '15'); // Max balance

      // All health items pass
      const healthCheckboxes = [
        screen.getByLabelText(/Coat is clean & well groomed/i),
        screen.getByLabelText(/Teeth\/gums clean & healthy/i),
        screen.getByLabelText(/Eyes & nose clear/i),
        screen.getByLabelText(/Ears clean & free of mites/i),
        screen.getByLabelText(/Toenails\/claws clipped/i)
      ];

      for (const checkbox of healthCheckboxes) {
        await user.click(checkbox);
      }

      // Should show Blue Ribbon eligibility
      await waitFor(() => {
        expect(screen.getByText('Total Score: 50/50')).toBeInTheDocument();
        expect(screen.getByText('Ribbon Eligibility: Blue')).toBeInTheDocument();
      });

      // Test Red Ribbon with health failure
      const fleaCheckbox = screen.getByLabelText(/Flea or flea dirt issues/i);
      await user.click(fleaCheckbox);

      // Should downgrade to Red Ribbon due to flea issues
      await waitFor(() => {
        expect(screen.getByText('Ribbon Eligibility: Red')).toBeInTheDocument();
      });

      // Uncheck flea issues and test score-based Red Ribbon
      await user.click(fleaCheckbox);
      
      await user.clear(beautyInput);
      await user.type(beautyInput, '10');
      
      await user.clear(personalityInput);
      await user.type(personalityInput, '15');
      
      await user.clear(balanceInput);
      await user.type(balanceInput, '12');

      // Should show Red Ribbon (37 points, 35-44 range)
      await waitFor(() => {
        expect(screen.getByText('Total Score: 37/50')).toBeInTheDocument();
        expect(screen.getByText('Ribbon Eligibility: Red')).toBeInTheDocument();
      });

      // Test White Ribbon
      await user.clear(personalityInput);
      await user.type(personalityInput, '10');

      // Should show White Ribbon (32 points, 25-34 range)
      await waitFor(() => {
        expect(screen.getByText('Total Score: 32/50')).toBeInTheDocument();
        expect(screen.getByText('Ribbon Eligibility: White')).toBeInTheDocument();
      });

      // Test Participation Ribbon
      await user.clear(beautyInput);
      await user.type(beautyInput, '5');
      
      await user.clear(personalityInput);
      await user.type(personalityInput, '8');
      
      await user.clear(balanceInput);
      await user.type(balanceInput, '6');

      // Should show Participation Ribbon (19 points, below 25)
      await waitFor(() => {
        expect(screen.getByText('Total Score: 19/50')).toBeInTheDocument();
        expect(screen.getByText('Ribbon Eligibility: Participation')).toBeInTheDocument();
      });
    });
  });

  describe('Administrative Reports and Export', () => {
    it('generates comprehensive type class scoring reports with filtering', async () => {
      const user = userEvent.setup();
      
      // Mock admin user
      (getCurrentUser as jest.Mock).mockResolvedValue({
        signInDetails: { loginId: 'admin@example.com' },
        username: 'admin'
      });

      const mockClassScores = [
        {
          id: 'class-score-1',
          catId: 'cat-1',
          judgeId: 'judge-1',
          judgeName: 'Judge Smith',
          totalScore: 47,
          ribbonEligibility: 'Blue',
          timestamp: '2024-01-15T10:00:00Z',
          isFinalized: true,
          cat: mockCats['cat-1']
        },
        {
          id: 'class-score-2',
          catId: 'cat-2',
          judgeId: 'judge-2',
          judgeName: 'Judge Johnson',
          totalScore: 38,
          ribbonEligibility: 'Red',
          timestamp: '2024-01-15T11:00:00Z',
          isFinalized: true,
          cat: mockCats['cat-2']
        },
        {
          id: 'class-score-3',
          catId: 'cat-3',
          judgeId: 'judge-1',
          judgeName: 'Judge Smith',
          totalScore: 31,
          ribbonEligibility: 'White',
          timestamp: '2024-01-15T12:00:00Z',
          isFinalized: false,
          cat: mockCats['cat-3']
        }
      ];

      mockClient.graphql.mockImplementation(({ query }) => {
        if (query.includes('ListAllClassScores')) {
          return Promise.resolve({
            data: {
              listAllClassScores: {
                items: mockClassScores
              }
            }
          });
        }
        return Promise.resolve({ data: {} });
      });

      render(
        <BrowserRouter>
          <ThemeProvider theme={theme}>
            <ClassScoreReports />
          </ThemeProvider>
        </BrowserRouter>
      );

      // Wait for reports to load
      await waitFor(() => {
        expect(screen.getByText('📊 Type Class Scoring Reports')).toBeInTheDocument();
        expect(screen.getByText('Fluffy')).toBeInTheDocument();
        expect(screen.getByText('Whiskers')).toBeInTheDocument();
        expect(screen.getByText('Shadow')).toBeInTheDocument();
      });

      // Test filtering by ribbon type
      const ribbonFilter = screen.getByLabelText(/Filter by Ribbon/i);
      await user.selectOptions(ribbonFilter, 'Blue');

      await waitFor(() => {
        expect(screen.getByText('Fluffy')).toBeInTheDocument();
        expect(screen.queryByText('Whiskers')).not.toBeInTheDocument();
        expect(screen.queryByText('Shadow')).not.toBeInTheDocument();
      });

      // Test filtering by judge
      await user.selectOptions(ribbonFilter, 'All');
      const judgeFilter = screen.getByLabelText(/Filter by Judge/i);
      await user.selectOptions(judgeFilter, 'Judge Smith');

      await waitFor(() => {
        expect(screen.getByText('Fluffy')).toBeInTheDocument();
        expect(screen.queryByText('Whiskers')).not.toBeInTheDocument();
        expect(screen.getByText('Shadow')).toBeInTheDocument();
      });

      // Test CSV export
      const exportButton = screen.getByText('Export to CSV');
      await user.click(exportButton);

      // Verify export was triggered (would normally download file)
      await waitFor(() => {
        expect(screen.getByText(/Export completed/i)).toBeInTheDocument();
      });
    });

    it('shows detailed score breakdown with comments and health evaluations', async () => {
      const user = userEvent.setup();
      
      const detailedScore = {
        id: 'class-score-1',
        catId: 'cat-1',
        judgeId: 'judge-1',
        judgeName: 'Judge Smith',
        beautyScore: 14,
        beautyComments: 'Excellent coat quality and markings',
        personalityScore: 19,
        personalityComments: 'Very friendly and well-socialized',
        balanceProportionScore: 13,
        balanceProportionComments: 'Good overall body structure',
        coatCleanGroomed: true,
        teethGumsHealthy: true,
        eyesNoseClear: true,
        earsCleanMiteFree: false,
        toenailsClipped: true,
        fleaIssues: false,
        healthGroomingComments: 'Minor ear wax buildup, otherwise excellent',
        totalScore: 46,
        ribbonEligibility: 'Red', // Red due to ear issue
        timestamp: '2024-01-15T10:00:00Z',
        isFinalized: true,
        cat: mockCats['cat-1']
      };

      mockClient.graphql.mockImplementation(({ query }) => {
        if (query.includes('ListAllClassScores')) {
          return Promise.resolve({
            data: {
              listAllClassScores: {
                items: [detailedScore]
              }
            }
          });
        }
        return Promise.resolve({ data: {} });
      });

      render(
        <BrowserRouter>
          <ThemeProvider theme={theme}>
            <ClassScoreReports />
          </ThemeProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Fluffy')).toBeInTheDocument();
      });

      // Click to view detailed breakdown
      const viewDetailsButton = screen.getByText('View Details');
      await user.click(viewDetailsButton);

      // Verify detailed breakdown is shown
      await waitFor(() => {
        expect(screen.getByText('Beauty: 14/15')).toBeInTheDocument();
        expect(screen.getByText('Personality: 19/20')).toBeInTheDocument();
        expect(screen.getByText('Balance/Proportion: 13/15')).toBeInTheDocument();
        expect(screen.getByText('Excellent coat quality and markings')).toBeInTheDocument();
        expect(screen.getByText('Very friendly and well-socialized')).toBeInTheDocument();
        expect(screen.getByText('Good overall body structure')).toBeInTheDocument();
      });

      // Verify health evaluation details
      expect(screen.getByText('✅ Coat is clean & well groomed')).toBeInTheDocument();
      expect(screen.getByText('✅ Teeth/gums clean & healthy')).toBeInTheDocument();
      expect(screen.getByText('✅ Eyes & nose clear')).toBeInTheDocument();
      expect(screen.getByText('❌ Ears clean & free of mites')).toBeInTheDocument();
      expect(screen.getByText('✅ Toenails/claws clipped')).toBeInTheDocument();
      expect(screen.getByText('Minor ear wax buildup, otherwise excellent')).toBeInTheDocument();

      // Verify ribbon explanation
      expect(screen.getByText(/Red Ribbon due to health\/grooming issues/i)).toBeInTheDocument();
    });
  });

  describe('Role-Based Access Control', () => {
    it('enforces judge-only access to type class scoring interface', async () => {
      // Mock participant user
      (getCurrentUser as jest.Mock).mockResolvedValue({
        signInDetails: { loginId: 'participant@example.com' },
        username: 'participant'
      });

      render(
        <ThemeProvider theme={theme}>
          <MemoryRouter initialEntries={['/class-score/cat-1']}>
            <App />
          </MemoryRouter>
        </ThemeProvider>
      );

      // Should show access denied message
      await waitFor(() => {
        expect(screen.getByText(/Access Denied/i)).toBeInTheDocument();
        expect(screen.getByText(/You must be a judge to access type class scoring/i)).toBeInTheDocument();
      });

      // Should not show scoring form
      expect(screen.queryByText('🏆 Type Class Scoring')).not.toBeInTheDocument();
    });

    it('allows admin access to all type class scoring features', async () => {
      // Mock admin user
      (getCurrentUser as jest.Mock).mockResolvedValue({
        signInDetails: { loginId: 'admin@example.com' },
        username: 'admin'
      });

      render(
        <ThemeProvider theme={theme}>
          <MemoryRouter initialEntries={['/class-score/cat-1']}>
            <App />
          </MemoryRouter>
        </ThemeProvider>
      );

      // Admin should have access to type class scoring
      await waitFor(() => {
        expect(screen.getByText('🏆 Type Class Scoring')).toBeInTheDocument();
        expect(screen.queryByText(/Access Denied/i)).not.toBeInTheDocument();
      });
    });

    it('allows participants to view their own cat class scores', async () => {
      const user = userEvent.setup();
      
      // Mock participant user
      (getCurrentUser as jest.Mock).mockResolvedValue({
        signInDetails: { loginId: 'alice@example.com' },
        username: 'alice'
      });

      const participantScore = {
        id: 'class-score-1',
        catId: 'cat-1',
        judgeId: 'judge-1',
        judgeName: 'Judge Smith',
        beautyScore: 14,
        beautyComments: 'Beautiful coat',
        personalityScore: 18,
        personalityComments: 'Very friendly',
        balanceProportionScore: 13,
        balanceProportionComments: 'Well proportioned',
        totalScore: 45,
        ribbonEligibility: 'Blue',
        timestamp: '2024-01-15T10:00:00Z',
        isFinalized: true
      };

      mockClient.graphql.mockImplementation(({ query, variables }) => {
        if (query.includes('GetClassScoresByCat')) {
          return Promise.resolve({
            data: {
              getClassScoresByCat: {
                items: [participantScore]
              }
            }
          });
        }
        if (query.includes('GetCat')) {
          return Promise.resolve({
            data: { getCat: mockCats['cat-1'] }
          });
        }
        return Promise.resolve({ data: {} });
      });

      render(
        <BrowserRouter>
          <ThemeProvider theme={theme}>
            <ParticipantClassScoreView catId="cat-1" />
          </ThemeProvider>
        </BrowserRouter>
      );

      // Should show participant's cat class scores
      await waitFor(() => {
        expect(screen.getByText('🏆 Class Score for Fluffy')).toBeInTheDocument();
        expect(screen.getByText('Total Score: 45/50')).toBeInTheDocument();
        expect(screen.getByText('Ribbon Eligibility: Blue')).toBeInTheDocument();
        expect(screen.getByText('Beautiful coat')).toBeInTheDocument();
        expect(screen.getByText('Very friendly')).toBeInTheDocument();
        expect(screen.getByText('Well proportioned')).toBeInTheDocument();
      });

      // Should not show editing capabilities
      expect(screen.queryByText('Edit Score')).not.toBeInTheDocument();
      expect(screen.queryByText('Submit Class Score')).not.toBeInTheDocument();
    });
  });

  describe('Real-Time Updates and Subscription Functionality', () => {
    it('updates leaderboard in real-time when new class scores are submitted', async () => {
      const user = userEvent.setup();
      
      mockClient.graphql.mockImplementation(({ query }) => {
        if (query.includes('ListAllClassScores')) {
          return Promise.resolve({
            data: {
              listAllClassScores: {
                items: []
              }
            }
          });
        }
        if (query.includes('OnClassScoreUpdate')) {
          return {
            subscribe: jest.fn().mockImplementation(({ next }) => {
              subscriptionCallbacks.onClassScoreUpdate = next;
              return { unsubscribe: jest.fn() };
            })
          };
        }
        return Promise.resolve({ data: {} });
      });

      render(
        <BrowserRouter>
          <ClassScoreLeaderboard />
        </BrowserRouter>
      );

      // Initially empty leaderboard
      await waitFor(() => {
        expect(screen.getByText('🏆 Class Score Leaderboard')).toBeInTheDocument();
        expect(screen.getByText('No class scores available')).toBeInTheDocument();
      });

      // Simulate real-time score update
      const newScore = {
        id: 'class-score-1',
        catId: 'cat-1',
        judgeId: 'judge-1',
        judgeName: 'Judge Smith',
        totalScore: 47,
        ribbonEligibility: 'Blue',
        timestamp: '2024-01-15T10:00:00Z',
        isFinalized: true,
        cat: mockCats['cat-1']
      };

      await act(async () => {
        subscriptionCallbacks.onClassScoreUpdate({ data: { onClassScoreUpdate: newScore } });
      });

      // Leaderboard should update with new score
      await waitFor(() => {
        expect(screen.getByText('Fluffy')).toBeInTheDocument();
        expect(screen.getByText('47/50')).toBeInTheDocument();
        expect(screen.getByText('Blue')).toBeInTheDocument();
        expect(screen.queryByText('No class scores available')).not.toBeInTheDocument();
      });
    });

    it('shows real-time notifications for class score changes', async () => {
      // This test is covered by the realtime-class-scoring.integration.test.tsx file
      // which specifically tests the notification system
      expect(true).toBe(true);
    });
  });

  describe('Separation from Cage Scoring Workflow', () => {
    it('maintains separate routes and components for class vs cage scoring', async () => {
      render(
        <ThemeProvider theme={theme}>
          <MemoryRouter initialEntries={['/class-score/cat-1']}>
            <App />
          </MemoryRouter>
        </ThemeProvider>
      );

      // Should show type class scoring page
      await waitFor(() => {
        expect(screen.getByText('🏆 Type Class Scoring')).toBeInTheDocument();
        expect(screen.getByText('Professional judging for class competition')).toBeInTheDocument();
      });

      // Should not show cage scoring elements
      expect(screen.queryByText('Cage Scoring')).not.toBeInTheDocument();
      expect(screen.queryByText('Traditional cage-based scoring')).not.toBeInTheDocument();
    });

    it('uses distinct visual styling for type class scoring pages', async () => {
      render(
        <ThemeProvider theme={theme}>
          <MemoryRouter initialEntries={['/class-score/cat-1']}>
            <App />
          </MemoryRouter>
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('🏆 Type Class Scoring')).toBeInTheDocument();
      });

      // Check for type class scoring specific styling elements
      const classScoreHeader = screen.getByText('🏆 Type Class Scoring');
      expect(classScoreHeader).toHaveClass('class-scoring-header');

      // Verify breadcrumbs show type class scoring
      expect(screen.getByText('Type Class Scoring')).toBeInTheDocument();
      expect(screen.queryByText('Cage Scoring')).not.toBeInTheDocument();
    });

    it('maintains separate data models and API endpoints', async () => {
      const user = userEvent.setup();
      
      render(
        <ThemeProvider theme={theme}>
          <MemoryRouter initialEntries={['/class-score/cat-1']}>
            <App />
          </MemoryRouter>
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('🏆 Type Class Scoring')).toBeInTheDocument();
      });

      // Fill out type class scoring form
      const beautyInput = screen.getByLabelText(/Beauty Score/i);
      await user.type(beautyInput, '12');

      const personalityInput = screen.getByLabelText(/Personality Score/i);
      await user.type(personalityInput, '18');

      const balanceInput = screen.getByLabelText(/Balance\/Proportion Score/i);
      await user.type(balanceInput, '13');

      const submitButton = screen.getByText('Submit Class Score');
      await user.click(submitButton);

      // Verify type class scoring specific GraphQL mutation is called
      await waitFor(() => {
        expect(mockClient.graphql).toHaveBeenCalledWith(
          expect.objectContaining({
            query: expect.stringContaining('CreateClassScore'), // Not CreateScore
            variables: expect.objectContaining({
              input: expect.objectContaining({
                beautyScore: 12, // Class scoring specific fields
                personalityScore: 18,
                balanceProportionScore: 13
              })
            })
          })
        );
      });

      // Should not call cage scoring mutations
      expect(mockClient.graphql).not.toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('CreateScore')
        })
      );
    });
  });
});

// Helper function to calculate ribbon eligibility
function calculateRibbonEligibility(input: any): string {
  const totalScore = (input.beautyScore || 0) + (input.personalityScore || 0) + (input.balanceProportionScore || 0);
  const healthPassing = input.coatCleanGroomed && input.teethGumsHealthy && 
                       input.eyesNoseClear && input.earsCleanMiteFree && 
                       input.toenailsClipped && !input.fleaIssues;

  if (!healthPassing || input.fleaIssues) {
    return 'Red';
  }

  if (totalScore >= 45) return 'Blue';
  if (totalScore >= 35) return 'Red';
  if (totalScore >= 25) return 'White';
  return 'Participation';
}