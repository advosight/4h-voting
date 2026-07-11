import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';
import { theme } from '../theme/theme';
import App from '../App';
import './integration-test.config';
import type { Mock } from 'vitest';

// Mock AWS Amplify
vi.mock('aws-amplify/api');
vi.mock('aws-amplify/auth');

const mockClient = {
  graphql: vi.fn()
};
(generateClient as Mock).mockReturnValue(mockClient);

// Mock Authenticator
vi.mock('@aws-amplify/ui-react', () => ({
  Authenticator: ({ children }: { children: any }) => {
    const mockUser = { signInDetails: { loginId: 'judge@example.com' } };
    const mockSignOut = vi.fn();
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
  }
};

describe('End-to-End Type Class Scoring Integration Tests', () => {
  let subscriptionCallbacks: { [key: string]: any } = {};
  let mockSubscriptions: { [key: string]: any } = {};

  beforeEach(() => {
    vi.clearAllMocks();
    subscriptionCallbacks = {};
    mockSubscriptions = {};
    
    // Default judge user
    (getCurrentUser as Mock).mockResolvedValue({
      signInDetails: { loginId: 'judge@example.com' },
      username: 'judge1'
    });

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
        mockSubscriptions[subscriptionId] = { unsubscribe: vi.fn() };
        
        return {
          subscribe: vi.fn().mockImplementation(({ next, error }) => {
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

  describe('Complete Type Class Scoring Workflow - Judge Perspective', () => {
    it('completes full workflow from login to score submission with real-time updates', async () => {
      const user = userEvent.setup();
      
      // Render the full application
      render(
        <ThemeProvider theme={theme}>
          <MemoryRouter initialEntries={['/scoring']}>
            <App />
          </MemoryRouter>
        </ThemeProvider>
      );

      // Navigate to scoring dashboard
      await waitFor(() => {
        expect(screen.getByText('Scoring Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Type Class Scoring')).toBeInTheDocument();
      });

      // Click on type class scoring access
      const classScoreButton = screen.getByText('Access Type Class Scoring');
      await user.click(classScoreButton);

      // Should navigate to type class scoring entry page
      await waitFor(() => {
        expect(screen.getByText('Manual Entry for Type Class Scoring')).toBeInTheDocument();
      });

      // Enter cat ID for scoring
      const catIdInput = screen.getByLabelText(/Cat ID/i);
      await user.type(catIdInput, 'cat-1');

      const goButton = screen.getByText('Go to Type Class Scoring');
      await user.click(goButton);

      // Should navigate to type class scoring page
      await waitFor(() => {
        expect(screen.getByText('🏆 Type Class Scoring')).toBeInTheDocument();
        expect(screen.getByText('Fluffy')).toBeInTheDocument();
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
        expect(screen.getByText('Cage #1')).toBeInTheDocument();
      });

      // Fill out the complete type class scoring form
      const beautyInput = screen.getByLabelText(/Beauty Score/i);
      const personalityInput = screen.getByLabelText(/Personality Score/i);
      const balanceInput = screen.getByLabelText(/Balance\/Proportion Score/i);

      await user.clear(beautyInput);
      await user.type(beautyInput, '14');
      
      await user.clear(personalityInput);
      await user.type(personalityInput, '19');
      
      await user.clear(balanceInput);
      await user.type(balanceInput, '13');

      // Fill health/grooming checklist
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

      // Add detailed comments
      const beautyComments = screen.getByLabelText(/Beauty Comments/i);
      await user.type(beautyComments, 'Excellent coat quality with beautiful markings and color distribution');

      const personalityComments = screen.getByLabelText(/Personality Comments/i);
      await user.type(personalityComments, 'Very friendly and well-socialized cat, calm during handling');

      const balanceComments = screen.getByLabelText(/Balance\/Proportion Comments/i);
      await user.type(balanceComments, 'Good overall body structure and proportions for the breed');

      const healthComments = screen.getByLabelText(/Health\/Grooming Comments/i);
      await user.type(healthComments, 'Excellent health and grooming standards, well-maintained by owner');

      // Verify real-time score calculation
      await waitFor(() => {
        expect(screen.getByText('Total Score: 46/50')).toBeInTheDocument();
        expect(screen.getByText('Ribbon Eligibility: Blue')).toBeInTheDocument();
      });

      // Submit the class score
      const submitButton = screen.getByText('Submit Class Score');
      await user.click(submitButton);

      // Wait for submission confirmation
      await waitFor(() => {
        expect(screen.getByText(/Class score submitted successfully/i)).toBeInTheDocument();
      });

      // Verify the GraphQL mutation was called with correct data
      expect(mockClient.graphql).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('CreateClassScore'),
          variables: expect.objectContaining({
            input: expect.objectContaining({
              catId: 'cat-1',
              beautyScore: 14,
              beautyComments: 'Excellent coat quality with beautiful markings and color distribution',
              personalityScore: 19,
              personalityComments: 'Very friendly and well-socialized cat, calm during handling',
              balanceProportionScore: 13,
              balanceProportionComments: 'Good overall body structure and proportions for the breed',
              coatCleanGroomed: true,
              teethGumsHealthy: true,
              eyesNoseClear: true,
              earsCleanMiteFree: true,
              toenailsClipped: true,
              fleaIssues: false,
              healthGroomingComments: 'Excellent health and grooming standards, well-maintained by owner'
            })
          })
        })
      );

      // Navigate to reports to verify the score appears
      const reportsLink = screen.getByText('View Reports');
      await user.click(reportsLink);

      // Should show the submitted score in reports
      await waitFor(() => {
        expect(screen.getByText('📊 Type Class Scoring Reports')).toBeInTheDocument();
      });
    });

    it('handles score editing with real-time updates and audit trail', async () => {
      const user = userEvent.setup();
      
      // Mock existing class score
      const existingScore = {
        id: 'class-score-1',
        catId: 'cat-1',
        judgeId: 'judge-1',
        judgeName: 'Judge Smith',
        beautyScore: 12,
        beautyComments: 'Good coat quality',
        personalityScore: 17,
        personalityComments: 'Friendly temperament',
        balanceProportionScore: 12,
        balanceProportionComments: 'Decent proportions',
        coatCleanGroomed: true,
        teethGumsHealthy: true,
        eyesNoseClear: true,
        earsCleanMiteFree: true,
        toenailsClipped: true,
        fleaIssues: false,
        healthGroomingComments: 'Good health overall',
        totalScore: 41,
        ribbonEligibility: 'Red',
        timestamp: '2024-01-15T10:00:00Z',
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
        if (query.includes('GetCat')) {
          return Promise.resolve({
            data: { getCat: mockCats['cat-1'] }
          });
        }
        if (query.includes('UpdateClassScore')) {
          const updatedScore = {
            ...existingScore,
            ...variables.input,
            totalScore: (variables.input.beautyScore || existingScore.beautyScore) + 
                       (variables.input.personalityScore || existingScore.personalityScore) + 
                       (variables.input.balanceProportionScore || existingScore.balanceProportionScore),
            ribbonEligibility: calculateRibbonEligibility({
              ...existingScore,
              ...variables.input
            }),
            timestamp: new Date().toISOString()
          };
          
          // Trigger subscription callback
          if (subscriptionCallbacks.onClassScoreUpdate) {
            setTimeout(() => {
              subscriptionCallbacks.onClassScoreUpdate({ data: { onClassScoreUpdate: updatedScore } });
            }, 100);
          }
          
          return Promise.resolve({
            data: { updateClassScore: updatedScore }
          });
        }
        if (query.includes('OnClassScoreUpdate')) {
          return {
            subscribe: vi.fn().mockImplementation(({ next }) => {
              subscriptionCallbacks.onClassScoreUpdate = next;
              return { unsubscribe: vi.fn() };
            })
          };
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

      // Wait for existing score to load
      await waitFor(() => {
        expect(screen.getByDisplayValue('12')).toBeInTheDocument(); // Beauty score
        expect(screen.getByDisplayValue('17')).toBeInTheDocument(); // Personality score
        expect(screen.getByDisplayValue('12')).toBeInTheDocument(); // Balance score
        expect(screen.getByText('Total Score: 41/50')).toBeInTheDocument();
        expect(screen.getByText('Ribbon Eligibility: Red')).toBeInTheDocument();
      });

      // Edit the scores to achieve Blue Ribbon
      const beautyInput = screen.getByLabelText(/Beauty Score/i);
      await user.clear(beautyInput);
      await user.type(beautyInput, '15');

      const personalityInput = screen.getByLabelText(/Personality Score/i);
      await user.clear(personalityInput);
      await user.type(personalityInput, '20');

      const balanceInput = screen.getByLabelText(/Balance\/Proportion Score/i);
      await user.clear(balanceInput);
      await user.type(balanceInput, '15');

      // Update comments
      const beautyComments = screen.getByLabelText(/Beauty Comments/i);
      await user.clear(beautyComments);
      await user.type(beautyComments, 'Outstanding coat quality - perfect markings and color');

      // Verify real-time recalculation
      await waitFor(() => {
        expect(screen.getByText('Total Score: 50/50')).toBeInTheDocument();
        expect(screen.getByText('Ribbon Eligibility: Blue')).toBeInTheDocument();
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
              beautyScore: 15,
              personalityScore: 20,
              balanceProportionScore: 15,
              beautyComments: 'Outstanding coat quality - perfect markings and color'
            })
          })
        })
      );

      // Wait for real-time update to be processed
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
      });

      // Verify the updated values are reflected
      await waitFor(() => {
        expect(screen.getByText('Total Score: 50/50')).toBeInTheDocument();
        expect(screen.getByText('Ribbon Eligibility: Blue')).toBeInTheDocument();
      });
    });

    it('handles form validation and error recovery', async () => {
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

      // Enter invalid scores
      const beautyInput = screen.getByLabelText(/Beauty Score/i);
      const personalityInput = screen.getByLabelText(/Personality Score/i);
      const balanceInput = screen.getByLabelText(/Balance\/Proportion Score/i);

      await user.clear(beautyInput);
      await user.type(beautyInput, '20'); // Over maximum of 15

      await user.clear(personalityInput);
      await user.type(personalityInput, '25'); // Over maximum of 20

      await user.clear(balanceInput);
      await user.type(balanceInput, '-5'); // Below minimum of 0

      // Verify validation errors appear
      await waitFor(() => {
        expect(screen.getByText(/Beauty score must be between 0 and 15/i)).toBeInTheDocument();
        expect(screen.getByText(/Personality score must be between 0 and 20/i)).toBeInTheDocument();
        expect(screen.getByText(/Balance\/Proportion score must be between 0 and 15/i)).toBeInTheDocument();
      });

      // Submit button should be disabled
      const submitButton = screen.getByText('Submit Class Score');
      expect(submitButton).toBeDisabled();

      // Fix the validation errors
      await user.clear(beautyInput);
      await user.type(beautyInput, '14');

      await user.clear(personalityInput);
      await user.type(personalityInput, '18');

      await user.clear(balanceInput);
      await user.type(balanceInput, '13');

      // Fill required health checklist
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

      // Validation errors should clear and submit should be enabled
      await waitFor(() => {
        expect(screen.queryByText(/Beauty score must be between 0 and 15/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Personality score must be between 0 and 20/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Balance\/Proportion score must be between 0 and 15/i)).not.toBeInTheDocument();
        expect(submitButton).not.toBeDisabled();
      });

      // Verify score calculation is correct
      expect(screen.getByText('Total Score: 45/50')).toBeInTheDocument();
      expect(screen.getByText('Ribbon Eligibility: Blue')).toBeInTheDocument();

      // Now submit should work
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Class score submitted successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Multi-Judge Scoring Scenarios', () => {
    it('handles multiple judges scoring same cat with proper isolation', async () => {
      const user = userEvent.setup();
      
      // First judge's score
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
        isFinalized: true,
        timestamp: '2024-01-15T10:00:00Z'
      };

      // Mock judge-1 viewing the page (sees existing score)
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

      // Judge-1 should see their existing finalized score
      await waitFor(() => {
        expect(screen.getByText(/You have already submitted a finalized class score/i)).toBeInTheDocument();
        expect(screen.getByText('Judge Smith: 43/50 (Red)')).toBeInTheDocument();
      });

      // Now simulate judge-2 accessing the same cat
      (getCurrentUser as Mock).mockResolvedValue({
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

      // Judge-2 should see judge-1's score but have a fresh form
      await waitFor(() => {
        expect(screen.getByText('Previous Class Scores')).toBeInTheDocument();
        expect(screen.getByText('Judge Smith: 43/50 (Red)')).toBeInTheDocument();
        expect(screen.getByText('Submit Class Score')).toBeInTheDocument(); // Fresh form available
      });

      // Judge-2 enters their own scores
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

      // Verify judge-2's score calculation
      await waitFor(() => {
        expect(screen.getByText('Total Score: 47/50')).toBeInTheDocument();
        expect(screen.getByText('Ribbon Eligibility: Blue')).toBeInTheDocument();
      });

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

    it('shows score comparison and administrative oversight', async () => {
      const user = userEvent.setup();
      
      // Mock admin user
      (getCurrentUser as Mock).mockResolvedValue({
        signInDetails: { loginId: 'admin@example.com' },
        username: 'admin'
      });

      const multipleScores = [
        {
          id: 'class-score-1',
          catId: 'cat-1',
          judgeId: 'judge-1',
          judgeName: 'Judge Smith',
          beautyScore: 12,
          personalityScore: 18,
          balanceProportionScore: 13,
          totalScore: 43,
          ribbonEligibility: 'Red',
          isFinalized: true,
          timestamp: '2024-01-15T10:00:00Z',
          cat: mockCats['cat-1']
        },
        {
          id: 'class-score-2',
          catId: 'cat-1',
          judgeId: 'judge-2',
          judgeName: 'Judge Johnson',
          beautyScore: 14,
          personalityScore: 19,
          balanceProportionScore: 14,
          totalScore: 47,
          ribbonEligibility: 'Blue',
          isFinalized: true,
          timestamp: '2024-01-15T11:00:00Z',
          cat: mockCats['cat-1']
        }
      ];

      mockClient.graphql.mockImplementation(({ query }) => {
        if (query.includes('ListAllClassScores')) {
          return Promise.resolve({
            data: {
              listAllClassScores: {
                items: multipleScores
              }
            }
          });
        }
        return Promise.resolve({ data: {} });
      });

      render(
        <ThemeProvider theme={theme}>
          <MemoryRouter initialEntries={['/reports']}>
            <App />
          </MemoryRouter>
        </ThemeProvider>
      );

      // Navigate to type class scoring reports
      await waitFor(() => {
        expect(screen.getByText('Reports Dashboard')).toBeInTheDocument();
      });

      const classReportsButton = screen.getByText('Type Class Scoring Reports');
      await user.click(classReportsButton);

      // Should show both scores for the same cat
      await waitFor(() => {
        expect(screen.getByText('📊 Type Class Scoring Reports')).toBeInTheDocument();
        expect(screen.getAllByText('Fluffy')).toHaveLength(2); // Two entries for same cat
        expect(screen.getByText('Judge Smith')).toBeInTheDocument();
        expect(screen.getByText('Judge Johnson')).toBeInTheDocument();
        expect(screen.getByText('43/50')).toBeInTheDocument();
        expect(screen.getByText('47/50')).toBeInTheDocument();
      });

      // Should show score variance analysis
      expect(screen.getByText(/Score Variance: 4 points/i)).toBeInTheDocument();
      expect(screen.getByText(/Average Score: 45\/50/i)).toBeInTheDocument();

      // Click to view detailed comparison
      const compareButton = screen.getByText('Compare Scores');
      await user.click(compareButton);

      // Should show detailed breakdown comparison
      await waitFor(() => {
        expect(screen.getByText('Score Comparison for Fluffy')).toBeInTheDocument();
        expect(screen.getByText('Beauty: 12 vs 14')).toBeInTheDocument();
        expect(screen.getByText('Personality: 18 vs 19')).toBeInTheDocument();
        expect(screen.getByText('Balance/Proportion: 13 vs 14')).toBeInTheDocument();
      });
    });
  });

  describe('Administrative Reports and Export', () => {
    it('generates comprehensive reports with filtering and export', async () => {
      const user = userEvent.setup();
      
      // Mock admin user
      (getCurrentUser as Mock).mockResolvedValue({
        signInDetails: { loginId: 'admin@example.com' },
        username: 'admin'
      });

      const comprehensiveScores = [
        {
          id: 'class-score-1',
          catId: 'cat-1',
          judgeId: 'judge-1',
          judgeName: 'Judge Smith',
          beautyScore: 14,
          beautyComments: 'Excellent coat quality',
          personalityScore: 19,
          personalityComments: 'Very friendly',
          balanceProportionScore: 13,
          balanceProportionComments: 'Good proportions',
          coatCleanGroomed: true,
          teethGumsHealthy: true,
          eyesNoseClear: true,
          earsCleanMiteFree: true,
          toenailsClipped: true,
          fleaIssues: false,
          healthGroomingComments: 'Excellent health',
          totalScore: 46,
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
          beautyScore: 10,
          beautyComments: 'Nice appearance',
          personalityScore: 15,
          personalityComments: 'Calm temperament',
          balanceProportionScore: 11,
          balanceProportionComments: 'Decent structure',
          coatCleanGroomed: true,
          teethGumsHealthy: true,
          eyesNoseClear: true,
          earsCleanMiteFree: false,
          toenailsClipped: true,
          fleaIssues: false,
          healthGroomingComments: 'Minor ear issues',
          totalScore: 36,
          ribbonEligibility: 'Red',
          timestamp: '2024-01-15T11:00:00Z',
          isFinalized: true,
          cat: mockCats['cat-2']
        }
      ];

      mockClient.graphql.mockImplementation(({ query }) => {
        if (query.includes('ListAllClassScores')) {
          return Promise.resolve({
            data: {
              listAllClassScores: {
                items: comprehensiveScores
              }
            }
          });
        }
        return Promise.resolve({ data: {} });
      });

      // Mock CSV download
      const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
      const mockRevokeObjectURL = vi.fn();
      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;

      // Mock link click for download
      const mockClick = vi.fn();
      const mockLink = { click: mockClick, href: '', download: '' };
      vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
        if (tagName === 'a') {
          return mockLink as any;
        }
        return document.createElement(tagName);
      });

      render(
        <ThemeProvider theme={theme}>
          <MemoryRouter initialEntries={['/reports']}>
            <App />
          </MemoryRouter>
        </ThemeProvider>
      );

      // Navigate to type class scoring reports
      await waitFor(() => {
        expect(screen.getByText('Reports Dashboard')).toBeInTheDocument();
      });

      const classReportsButton = screen.getByText('Type Class Scoring Reports');
      await user.click(classReportsButton);

      // Wait for reports to load
      await waitFor(() => {
        expect(screen.getByText('📊 Type Class Scoring Reports')).toBeInTheDocument();
        expect(screen.getByText('Fluffy')).toBeInTheDocument();
        expect(screen.getByText('Whiskers')).toBeInTheDocument();
      });

      // Test filtering by ribbon type
      const ribbonFilter = screen.getByLabelText(/Filter by Ribbon/i);
      await user.selectOptions(ribbonFilter, 'Blue');

      await waitFor(() => {
        expect(screen.getByText('Fluffy')).toBeInTheDocument();
        expect(screen.queryByText('Whiskers')).not.toBeInTheDocument();
      });

      // Reset filter and test judge filtering
      await user.selectOptions(ribbonFilter, 'All');
      const judgeFilter = screen.getByLabelText(/Filter by Judge/i);
      await user.selectOptions(judgeFilter, 'Judge Smith');

      await waitFor(() => {
        expect(screen.getByText('Fluffy')).toBeInTheDocument();
        expect(screen.queryByText('Whiskers')).not.toBeInTheDocument();
      });

      // Reset filters
      await user.selectOptions(judgeFilter, 'All');

      // Test detailed view
      const viewDetailsButtons = screen.getAllByText('View Details');
      await user.click(viewDetailsButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Class Score Details for Fluffy')).toBeInTheDocument();
        expect(screen.getByText('Beauty: 14/15')).toBeInTheDocument();
        expect(screen.getByText('Personality: 19/20')).toBeInTheDocument();
        expect(screen.getByText('Balance/Proportion: 13/15')).toBeInTheDocument();
        expect(screen.getByText('Excellent coat quality')).toBeInTheDocument();
        expect(screen.getByText('Very friendly')).toBeInTheDocument();
        expect(screen.getByText('Good proportions')).toBeInTheDocument();
        expect(screen.getByText('✅ Coat is clean & well groomed')).toBeInTheDocument();
        expect(screen.getByText('✅ Teeth/gums clean & healthy')).toBeInTheDocument();
        expect(screen.getByText('Excellent health')).toBeInTheDocument();
      });

      // Close details and test CSV export
      const closeButton = screen.getByText('Close');
      await user.click(closeButton);

      const exportButton = screen.getByText('Export to CSV');
      await user.click(exportButton);

      // Verify CSV export was triggered
      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalled();
        expect(mockClick).toHaveBeenCalled();
        expect(screen.getByText(/Export completed/i)).toBeInTheDocument();
      });

      // Verify CSV content structure
      const csvBlob = mockCreateObjectURL.mock.calls[0][0];
      expect(csvBlob.type).toBe('text/csv');
    });
  });

  describe('Real-Time Updates and Notifications', () => {
    it('shows live score updates across multiple components', async () => {
      const user = userEvent.setup();
      
      // Mock admin user to see all components
      (getCurrentUser as Mock).mockResolvedValue({
        signInDetails: { loginId: 'admin@example.com' },
        username: 'admin'
      });

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
            subscribe: vi.fn().mockImplementation(({ next }) => {
              subscriptionCallbacks.onClassScoreUpdate = next;
              return { unsubscribe: vi.fn() };
            })
          };
        }
        return Promise.resolve({ data: {} });
      });

      render(
        <ThemeProvider theme={theme}>
          <MemoryRouter initialEntries={['/dashboard']}>
            <App />
          </MemoryRouter>
        </ThemeProvider>
      );

      // Navigate to dashboard with leaderboard
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      // Should show empty leaderboard initially
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
        beautyScore: 14,
        personalityScore: 19,
        balanceProportionScore: 13,
        totalScore: 46,
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
        expect(screen.getByText('46/50')).toBeInTheDocument();
        expect(screen.getByText('Blue')).toBeInTheDocument();
        expect(screen.queryByText('No class scores available')).not.toBeInTheDocument();
      });

      // Should show notification
      await waitFor(() => {
        expect(screen.getByText('🔔 Class Score Updates')).toBeInTheDocument();
        expect(screen.getByText(/Fluffy received a final class score of 46\/50/)).toBeInTheDocument();
      });

      // Simulate another score update
      const secondScore = {
        id: 'class-score-2',
        catId: 'cat-2',
        judgeId: 'judge-2',
        judgeName: 'Judge Johnson',
        beautyScore: 15,
        personalityScore: 20,
        balanceProportionScore: 15,
        totalScore: 50,
        ribbonEligibility: 'Blue',
        timestamp: '2024-01-15T11:00:00Z',
        isFinalized: true,
        cat: mockCats['cat-2']
      };

      await act(async () => {
        subscriptionCallbacks.onClassScoreUpdate({ data: { onClassScoreUpdate: secondScore } });
      });

      // Leaderboard should update with both scores, sorted by total
      await waitFor(() => {
        expect(screen.getByText('Whiskers')).toBeInTheDocument();
        expect(screen.getByText('50/50')).toBeInTheDocument();
        
        // Verify sorting (Whiskers with 50 should be first)
        const scoreElements = screen.getAllByText(/\/50/);
        expect(scoreElements[0]).toHaveTextContent('50/50');
        expect(scoreElements[1]).toHaveTextContent('46/50');
      });

      // Should show Blue Ribbon achievement notification
      await waitFor(() => {
        expect(screen.getByText(/🥇 Whiskers achieved Blue Ribbon eligibility/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('handles network errors with retry functionality', async () => {
      const user = userEvent.setup();
      
      // Mock network error on first attempt, success on retry
      let attemptCount = 0;
      mockClient.graphql.mockImplementation(({ query, variables }) => {
        if (query.includes('CreateClassScore')) {
          attemptCount++;
          if (attemptCount === 1) {
            return Promise.reject(new Error('Network error'));
          } else {
            return Promise.resolve({
              data: {
                createClassScore: {
                  id: 'class-score-1',
                  catId: variables.input.catId,
                  judgeId: 'judge-1',
                  judgeName: 'Judge Smith',
                  ...variables.input,
                  totalScore: variables.input.beautyScore + variables.input.personalityScore + variables.input.balanceProportionScore,
                  ribbonEligibility: calculateRibbonEligibility(variables.input),
                  timestamp: new Date().toISOString(),
                  isFinalized: false
                }
              }
            });
          }
        }
        if (query.includes('GetCat')) {
          return Promise.resolve({
            data: { getCat: mockCats['cat-1'] }
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
        return Promise.resolve({ data: {} });
      });

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

      // Fill out form
      const beautyInput = screen.getByLabelText(/Beauty Score/i);
      const personalityInput = screen.getByLabelText(/Personality Score/i);
      const balanceInput = screen.getByLabelText(/Balance\/Proportion Score/i);

      await user.type(beautyInput, '12');
      await user.type(personalityInput, '18');
      await user.type(balanceInput, '13');

      // Fill health checklist
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

      // Submit - should fail first time
      const submitButton = screen.getByText('Submit Class Score');
      await user.click(submitButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Network error occurred/i)).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      // Click retry
      const retryButton = screen.getByText('Retry');
      await user.click(retryButton);

      // Should succeed on retry
      await waitFor(() => {
        expect(screen.getByText(/Class score submitted successfully/i)).toBeInTheDocument();
      });

      // Verify both attempts were made
      expect(attemptCount).toBe(2);
    });

    it('handles validation errors with user feedback', async () => {
      const user = userEvent.setup();
      
      // Mock server-side validation error
      mockClient.graphql.mockImplementation(({ query, variables }) => {
        if (query.includes('CreateClassScore')) {
          return Promise.reject({
            errors: [
              {
                message: 'Validation failed: Beauty score must be between 0 and 15',
                extensions: {
                  code: 'VALIDATION_ERROR',
                  field: 'beautyScore'
                }
              }
            ]
          });
        }
        if (query.includes('GetCat')) {
          return Promise.resolve({
            data: { getCat: mockCats['cat-1'] }
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
        return Promise.resolve({ data: {} });
      });

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

      // Fill out form with valid client-side values
      const beautyInput = screen.getByLabelText(/Beauty Score/i);
      const personalityInput = screen.getByLabelText(/Personality Score/i);
      const balanceInput = screen.getByLabelText(/Balance\/Proportion Score/i);

      await user.type(beautyInput, '12');
      await user.type(personalityInput, '18');
      await user.type(balanceInput, '13');

      // Fill health checklist
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

      // Submit - should fail with server validation error
      const submitButton = screen.getByText('Submit Class Score');
      await user.click(submitButton);

      // Should show server validation error
      await waitFor(() => {
        expect(screen.getByText(/Beauty score must be between 0 and 15/i)).toBeInTheDocument();
      });

      // Beauty input should be highlighted as error
      expect(beautyInput).toHaveClass('error');
    });

    it('handles graceful degradation for system failures', async () => {
      const user = userEvent.setup();
      
      // Mock complete system failure
      mockClient.graphql.mockImplementation(() => {
        return Promise.reject(new Error('System unavailable'));
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

      render(
        <ThemeProvider theme={theme}>
          <MemoryRouter initialEntries={['/class-score/cat-1']}>
            <App />
          </MemoryRouter>
        </ThemeProvider>
      );

      // Should show error boundary or fallback UI
      await waitFor(() => {
        expect(screen.getByText(/Something went wrong/i) || screen.getByText(/Unable to load/i)).toBeInTheDocument();
      });

      // Should log error but not crash
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
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