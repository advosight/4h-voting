import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, useParams as _useParams } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ClassScorePage from '../ClassScorePage';
import * as amplifyApi from 'aws-amplify/api';
import * as amplifyAuth from 'aws-amplify/auth';
import * as roleUtils from '../../utils/roleUtils';
import type { MockedFunction, Mock } from 'vitest';

// Mock dependencies
vi.mock('aws-amplify/api');
vi.mock('aws-amplify/auth');
vi.mock('../../utils/roleUtils');
vi.mock('../../components/ClassScoringForm', () => {
  return {
    default: function MockClassScoringForm({ catData, onSave, onSubmit, loading, hasPermission }: any) {
    return (
      <div data-testid="class-scoring-form">
        <div>Cat: {catData?.name}</div>
        <div>Permission: {hasPermission ? 'Yes' : 'No'}</div>
        <div>Loading: {loading ? 'Yes' : 'No'}</div>
        <button onClick={() => onSave({ beautyScore: 10 })}>Save</button>
        <button onClick={() => onSubmit({ beautyScore: 10 })}>Submit</button>
      </div>
    );
    }
  };
});

// Mock react-router-dom useParams and useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useParams: vi.fn(),
  useNavigate: () => mockNavigate,
}));

const useParams = vi.mocked(_useParams, { partial: true });

const mockGenerateClient = amplifyApi.generateClient as MockedFunction<typeof amplifyApi.generateClient>;
const mockGetCurrentUser = amplifyAuth.getCurrentUser as MockedFunction<typeof amplifyAuth.getCurrentUser>;
const mockIsJudge = roleUtils.isJudge as MockedFunction<typeof roleUtils.isJudge>;

const theme = createTheme();

const renderWithProviders = (component: React.ReactElement, initialEntries = ['/class-score/1']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </MemoryRouter>
  );
};

describe('ClassScorePage', () => {
  const mockClient = {
    graphql: vi.fn(),
  };

  const mockCat = {
    id: '1',
    name: 'Fluffy',
    owner: 'John Doe',
    cageNumber: 5,
    votes: 10,
    catAgeGroup: 'Adult',
  };

  const mockUser = {
    userId: 'judge-123',
    username: 'judge@example.com',
    signInDetails: {
      loginId: 'judge@example.com',
    },
  };

  const mockClassScore = {
    id: 'score-1',
    catId: '1',
    judgeId: 'judge-123',
    judgeName: 'Judge Smith',
    beautyScore: 12,
    personalityScore: 18,
    balanceProportionScore: 13,
    totalScore: 43,
    ribbonEligibility: 'Red',
    isFinalized: false,
    timestamp: '2024-01-01T10:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockGenerateClient.mockReturnValue(mockClient as any);
    mockGetCurrentUser.mockResolvedValue(mockUser as any);
    mockIsJudge.mockResolvedValue(true);
    
    // Mock useParams to return default values
    useParams.mockReturnValue({ catId: '1' });
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching data', async () => {
      mockClient.graphql.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithProviders(<ClassScorePage />);

      expect(screen.getByText('Loading class scoring page...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Authentication', () => {
    it('should show error when user is not authenticated', async () => {
      mockGetCurrentUser.mockRejectedValue(new Error('Not authenticated'));

      renderWithProviders(<ClassScorePage />);

      await waitFor(() => {
        expect(screen.getByText(/Authentication required/)).toBeInTheDocument();
      });
    });

    it('should show error when user is not a judge', async () => {
      mockIsJudge.mockResolvedValue(false);

      renderWithProviders(<ClassScorePage />);

      await waitFor(() => {
        expect(screen.getByText(/Access denied. Only judges can access class scoring/)).toBeInTheDocument();
      });
    });
  });

  describe('Cat Data Fetching by ID', () => {
    it('should fetch cat data by ID successfully', async () => {
      mockClient.graphql
        .mockResolvedValueOnce({
          data: { getCat: mockCat }
        })
        .mockResolvedValueOnce({
          data: { getClassScoresByCat: { items: [] } }
        });

      renderWithProviders(<ClassScorePage />, '/class-score/1');

      await waitFor(() => {
        expect(screen.getByText('Fluffy')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
      });

      expect(mockClient.graphql).toHaveBeenCalledWith({
        query: expect.stringContaining('getCat'),
        variables: { id: '1' }
      });
    });

    it('should show error when cat ID is not found', async () => {
      mockClient.graphql.mockResolvedValue({
        data: { getCat: null }
      });

      renderWithProviders(<ClassScorePage />, '/class-score/999');

      await waitFor(() => {
        expect(screen.getByText(/No cat found with ID 999/)).toBeInTheDocument();
      });
    });
  });

  describe('Cat Data Fetching by Cage Number', () => {
    it('should fetch cat data by cage number successfully', async () => {
      useParams.mockReturnValue({ cageNumber: '5' });
      
      mockClient.graphql
        .mockResolvedValueOnce({
          data: { getCatByCage: mockCat }
        })
        .mockResolvedValueOnce({
          data: { getClassScoresByCat: { items: [] } }
        });

      renderWithProviders(<ClassScorePage />, ['/class-score/cage/5']);

      await waitFor(() => {
        expect(screen.getByText('Fluffy')).toBeInTheDocument();
      });

      expect(mockClient.graphql).toHaveBeenCalledWith({
        query: expect.stringContaining('getCatByCage'),
        variables: { cageNumber: 5 }
      });
    });

    it('should show error when cage number is invalid', async () => {
      useParams.mockReturnValue({ cageNumber: 'invalid' });

      renderWithProviders(<ClassScorePage />, ['/class-score/cage/invalid']);

      await waitFor(() => {
        expect(screen.getByText(/Invalid cage number provided/)).toBeInTheDocument();
      });
    });

    it('should show error when cage number is not found', async () => {
      useParams.mockReturnValue({ cageNumber: '999' });
      
      mockClient.graphql.mockResolvedValue({
        data: { getCatByCage: null }
      });

      renderWithProviders(<ClassScorePage />, ['/class-score/cage/999']);

      await waitFor(() => {
        expect(screen.getByText(/No cat found in cage 999/)).toBeInTheDocument();
      });
    });
  });

  describe('Existing Class Scores', () => {
    it('should display existing class score for current judge', async () => {
      mockClient.graphql
        .mockResolvedValueOnce({
          data: { getCat: mockCat }
        })
        .mockResolvedValueOnce({
          data: { 
            getClassScoresByCat: { 
              items: [mockClassScore] 
            } 
          }
        });

      renderWithProviders(<ClassScorePage />, '/class-score/1');

      await waitFor(() => {
        expect(screen.getByText(/You have already scored this cat for class competition/)).toBeInTheDocument();
      });
    });

    it('should show finalized message for finalized scores', async () => {
      const finalizedScore = { ...mockClassScore, isFinalized: true };
      mockClient.graphql
        .mockResolvedValueOnce({
          data: { getCat: mockCat }
        })
        .mockResolvedValueOnce({
          data: { 
            getClassScoresByCat: { 
              items: [finalizedScore] 
            } 
          }
        });

      renderWithProviders(<ClassScorePage />, '/class-score/1');

      await waitFor(() => {
        expect(screen.getByText(/Your class score has been finalized/)).toBeInTheDocument();
      });
    });
  });

  describe('Visual Styling', () => {
    it('should display class scoring header with distinct styling', async () => {
      mockClient.graphql
        .mockResolvedValueOnce({
          data: { getCat: mockCat }
        })
        .mockResolvedValueOnce({
          data: { getClassScoresByCat: { items: [] } }
        });

      renderWithProviders(<ClassScorePage />, '/class-score/1');

      await waitFor(() => {
        expect(screen.getByText('Type Class Scoring')).toBeInTheDocument();
        expect(screen.getByText(/Professional judging for class competition/)).toBeInTheDocument();
      });
    });

    it('should display breadcrumbs with class scoring context', async () => {
      mockClient.graphql
        .mockResolvedValueOnce({
          data: { getCat: mockCat }
        })
        .mockResolvedValueOnce({
          data: { getClassScoresByCat: { items: [] } }
        });

      renderWithProviders(<ClassScorePage />, '/class-score/1');

      await waitFor(() => {
        expect(screen.getByText('Scoring Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Type Class Scoring')).toBeInTheDocument();
      });
    });
  });

  describe('Cat Information Display', () => {
    it('should display cat information prominently', async () => {
      mockClient.graphql
        .mockResolvedValueOnce({
          data: { getCat: mockCat }
        })
        .mockResolvedValueOnce({
          data: { getClassScoresByCat: { items: [] } }
        });

      renderWithProviders(<ClassScorePage />, '/class-score/1');

      await waitFor(() => {
        expect(screen.getByText('Fluffy')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('Adult')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
      });
    });

    it('should show default class category when not specified', async () => {
      const catWithoutCategory = { ...mockCat, catAgeGroup: undefined, ownerAgeGroup: undefined };
      mockClient.graphql
        .mockResolvedValueOnce({
          data: { getCat: catWithoutCategory }
        })
        .mockResolvedValueOnce({
          data: { getClassScoresByCat: { items: [] } }
        });

      renderWithProviders(<ClassScorePage />, '/class-score/1');

      await waitFor(() => {
        expect(screen.getByText('Household Pet')).toBeInTheDocument();
      });
    });
  });

  describe('Judge Information Display', () => {
    it('should display judge session information', async () => {
      mockClient.graphql
        .mockResolvedValueOnce({
          data: { getCat: mockCat }
        })
        .mockResolvedValueOnce({
          data: { getClassScoresByCat: { items: [] } }
        });

      renderWithProviders(<ClassScorePage />, '/class-score/1');

      await waitFor(() => {
        expect(screen.getByText('Judge Session')).toBeInTheDocument();
        expect(screen.getByText(/judge@example.com/)).toBeInTheDocument();
        expect(screen.getByText('✅ Can Score')).toBeInTheDocument();
      });
    });
  });

  describe('Form Integration', () => {
    it('should pass correct props to ClassScoringForm', async () => {
      mockClient.graphql
        .mockResolvedValueOnce({
          data: { getCat: mockCat }
        })
        .mockResolvedValueOnce({
          data: { getClassScoresByCat: { items: [] } }
        });

      renderWithProviders(<ClassScorePage />, '/class-score/1');

      await waitFor(() => {
        expect(screen.getByTestId('class-scoring-form')).toBeInTheDocument();
        expect(screen.getByText('Cat: Fluffy')).toBeInTheDocument();
        expect(screen.getByText('Permission: Yes')).toBeInTheDocument();
        expect(screen.getByText('Loading: No')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network error');
      mockClient.graphql.mockRejectedValue(networkError);

      renderWithProviders(<ClassScorePage />, '/class-score/1');

      await waitFor(() => {
        expect(screen.getByText(/Error/)).toBeInTheDocument();
      });
    });

    it('should show error when no cat ID or cage number provided', async () => {
      useParams.mockReturnValue({});

      renderWithProviders(<ClassScorePage />, ['/class-score']);

      await waitFor(() => {
        expect(screen.getByText(/No cat ID or cage number provided/)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should provide navigation back to scoring dashboard', async () => {
      mockClient.graphql.mockRejectedValue(new Error('Test error'));

      renderWithProviders(<ClassScorePage />, '/class-score/1');

      await waitFor(() => {
        const backButton = screen.getByText('Return to Scoring Dashboard');
        expect(backButton).toBeInTheDocument();
      });
    });
  });

  describe('Save and Submit Functionality', () => {
    beforeEach(async () => {
      mockClient.graphql
        .mockResolvedValueOnce({
          data: { getCat: mockCat }
        })
        .mockResolvedValueOnce({
          data: { getClassScoresByCat: { items: [] } }
        });
    });

    it('should handle save functionality', async () => {
      mockClient.graphql.mockResolvedValueOnce({
        data: { createClassScore: mockClassScore }
      });

      renderWithProviders(<ClassScorePage />, '/class-score/1');

      await waitFor(() => {
        expect(screen.getByTestId('class-scoring-form')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockClient.graphql).toHaveBeenCalledWith({
          query: expect.stringContaining('createClassScore'),
          variables: { input: { beautyScore: 10 } }
        });
      });
    });

    it('should handle submit functionality', async () => {
      mockClient.graphql.mockResolvedValueOnce({
        data: { createClassScore: { ...mockClassScore, isFinalized: true } }
      });

      renderWithProviders(<ClassScorePage />, '/class-score/1');

      await waitFor(() => {
        expect(screen.getByTestId('class-scoring-form')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('Submit');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockClient.graphql).toHaveBeenCalledWith({
          query: expect.stringContaining('createClassScore'),
          variables: { input: { beautyScore: 10, isFinalized: true } }
        });
      });
    });
  });
});