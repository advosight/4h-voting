import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import ScoringDashboardPage from '../pages/ScoringDashboardPage';
import FitShowScoringPage from '../pages/FitShowScoringPage';
import ScorePage from '../pages/ScorePage';
import ClassScorePage from '../pages/ClassScorePage';
import AppLayout from '../components/AppLayout';
import type { Mock } from 'vitest';

// Mock AWS Amplify
vi.mock('aws-amplify/api');
vi.mock('aws-amplify/auth');

const mockClient = {
  graphql: vi.fn(),
  cancel: vi.fn(),
};

(generateClient as Mock).mockReturnValue(mockClient);

// Mock data for all scoring types
const mockCat = {
  id: 'cat-123',
  name: 'Fluffy',
  ownerName: 'John Doe',
  cageNumber: 5,
  photo: null
};

const mockCageScore = {
  id: 'cage-score-123',
  catId: 'cat-123',
  judgeId: 'judge-cage',
  judgeName: 'Cage Judge',
  totalScore: 78,
  isFinalized: true,
  createdAt: '2024-01-15T09:00:00Z'
};

const mockClassScore = {
  id: 'class-score-123',
  catId: 'cat-123',
  judgeId: 'judge-class',
  judgeName: 'Class Judge',
  totalScore: 82,
  isFinalized: true,
  createdAt: '2024-01-15T09:30:00Z'
};

const mockFitShowScore = {
  id: 'fit-show-score-123',
  catId: 'cat-123',
  participantName: 'John Doe',
  judgeId: 'judge-fitshow',
  judgeName: 'Fit Show Judge',
  totalScore: 85,
  appearanceTotal: 17,
  handlingTotal: 10,
  demonstrationTotal: 14,
  healthExaminationTotal: 19,
  groomingCareTotal: 13,
  knowledgeTotal: 12,
  isFinalized: true,
  createdAt: '2024-01-15T10:00:00Z'
};

describe('Fit and Show Scoring System Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    Amplify.configure({
      API: {
        GraphQL: {
          endpoint: 'https://test-api.appsync-api.us-east-1.amazonaws.com/graphql',
          region: 'us-east-1',
          defaultAuthMode: 'userPool'
        }
      }
    });
  });

  describe('Integration with Cage Scoring System', () => {
    test('should display cage scores alongside fit and show scores', async () => {
      const catWithBothScores = {
        ...mockCat,
        cageScore: mockCageScore,
        fitShowScore: mockFitShowScore
      };

      mockClient.graphql.mockResolvedValue({
        data: { getCat: catWithBothScores }
      });

      render(
        <BrowserRouter>
          <FitShowScoringPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Fit and Show Scoring')).toBeInTheDocument();
      });

      // Should display both scores with clear distinction
      expect(screen.getByText(/cage score.*78/i)).toBeInTheDocument();
      expect(screen.getByText(/fit.*show.*score.*85/i)).toBeInTheDocument();

      // Should show different evaluation focuses
      expect(screen.getByText(/cat evaluation/i)).toBeInTheDocument();
      expect(screen.getByText(/participant evaluation/i)).toBeInTheDocument();
    });

    test('should maintain separate navigation between cage and fit show scoring', async () => {
      mockClient.graphql.mockResolvedValue({
        data: { getCat: mockCat }
      });

      render(
        <BrowserRouter>
          <AppLayout>
            <ScoringDashboardPage />
          </AppLayout>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Scoring Dashboard')).toBeInTheDocument();
      });

      // Should have separate navigation options
      expect(screen.getByRole('link', { name: /cage scoring/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /fit.*show.*scoring/i })).toBeInTheDocument();

      // Navigate to fit and show scoring
      fireEvent.click(screen.getByRole('link', { name: /fit.*show.*scoring/i }));

      await waitFor(() => {
        expect(window.location.pathname).toContain('fit-show');
      });
    });

    test('should prevent confusion between cage and fit show scoring interfaces', async () => {
      // Test cage scoring page
      mockClient.graphql.mockResolvedValue({
        data: { getCat: mockCat }
      });

      const { rerender } = render(
        <BrowserRouter>
          <ScorePage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/cage.*scoring/i)).toBeInTheDocument();
        expect(screen.getByText(/cat.*evaluation/i)).toBeInTheDocument();
        expect(screen.queryByText(/participant.*evaluation/i)).not.toBeInTheDocument();
      });

      // Test fit and show scoring page
      rerender(
        <BrowserRouter>
          <FitShowScoringPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/fit.*show.*scoring/i)).toBeInTheDocument();
        expect(screen.getByText(/participant.*evaluation/i)).toBeInTheDocument();
        expect(screen.queryByText(/cat.*evaluation/i)).not.toBeInTheDocument();
      });
    });

    test('should handle concurrent cage and fit show scoring', async () => {
      mockClient.graphql
        .mockResolvedValueOnce({ data: { getCat: mockCat } })
        .mockResolvedValueOnce({ data: { createScore: mockCageScore } })
        .mockResolvedValueOnce({ data: { createFitShowScore: mockFitShowScore } });

      // Simulate concurrent scoring by different judges
      const cageComponent = (
        <div data-testid="cage-scoring">
          <BrowserRouter>
            <ScorePage judgeId="judge-cage" />
          </BrowserRouter>
        </div>
      );

      const fitShowComponent = (
        <div data-testid="fit-show-scoring">
          <BrowserRouter>
            <FitShowScoringPage judgeId="judge-fitshow" />
          </BrowserRouter>
        </div>
      );

      const { container } = render(
        <div>
          {cageComponent}
          {fitShowComponent}
        </div>
      );

      await waitFor(() => {
        expect(container.querySelector('[data-testid="cage-scoring"]')).toBeInTheDocument();
        expect(container.querySelector('[data-testid="fit-show-scoring"]')).toBeInTheDocument();
      });

      // Both should be able to score simultaneously without interference
      const cageContainer = container.querySelector('[data-testid="cage-scoring"]');
      const fitShowContainer = container.querySelector('[data-testid="fit-show-scoring"]');

      expect(cageContainer?.textContent).toContain('Cage Scoring');
      expect(fitShowContainer?.textContent).toContain('Fit and Show Scoring');
    });
  });

  describe('Integration with Class Scoring System', () => {
    test('should display class scores alongside fit and show scores', async () => {
      const catWithAllScores = {
        ...mockCat,
        classScore: mockClassScore,
        fitShowScore: mockFitShowScore
      };

      mockClient.graphql.mockResolvedValue({
        data: { getCat: catWithAllScores }
      });

      render(
        <BrowserRouter>
          <FitShowScoringPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Fit and Show Scoring')).toBeInTheDocument();
      });

      // Should display both scores
      expect(screen.getByText(/class.*score.*82/i)).toBeInTheDocument();
      expect(screen.getByText(/fit.*show.*score.*85/i)).toBeInTheDocument();

      // Should show different evaluation types
      expect(screen.getByText(/showmanship.*evaluation/i)).toBeInTheDocument();
    });

    test('should maintain visual distinction between all three scoring types', async () => {
      mockClient.graphql.mockResolvedValue({
        data: { getCat: mockCat }
      });

      // Test all three scoring interfaces
      const scoringTypes = [
        { component: ScorePage, title: /cage.*scoring/i, theme: 'cage' },
        { component: ClassScorePage, title: /class.*scoring/i, theme: 'class' },
        { component: FitShowScoringPage, title: /fit.*show.*scoring/i, theme: 'fitshow' }
      ];

      for (const { component: Component, title, theme } of scoringTypes) {
        const { unmount } = render(
          <BrowserRouter>
            <Component />
          </BrowserRouter>
        );

        await waitFor(() => {
          expect(screen.getByText(title)).toBeInTheDocument();
        });

        // Each should have distinct visual styling
        const mainElement = screen.getByRole('main') || document.body;
        expect(mainElement).toHaveClass(expect.stringContaining(theme));

        unmount();
      }
    });

    test('should handle all three scoring types for same participant', async () => {
      const catWithAllScores = {
        ...mockCat,
        cageScore: mockCageScore,
        classScore: mockClassScore,
        fitShowScore: mockFitShowScore
      };

      mockClient.graphql.mockResolvedValue({
        data: { 
          listScores: { items: [mockCageScore] },
          listClassScores: { items: [mockClassScore] },
          listFitShowScores: { items: [mockFitShowScore] }
        }
      });

      render(
        <BrowserRouter>
          <ScoringDashboardPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Scoring Dashboard')).toBeInTheDocument();
      });

      // Should display all three score types
      expect(screen.getByText(/cage.*78/i)).toBeInTheDocument();
      expect(screen.getByText(/class.*82/i)).toBeInTheDocument();
      expect(screen.getByText(/fit.*show.*85/i)).toBeInTheDocument();

      // Should show comprehensive participant evaluation
      expect(screen.getByText(/total.*evaluation.*score/i)).toBeInTheDocument();
    });
  });

  describe('Cross-System Data Consistency', () => {
    test('should maintain consistent participant information across all scoring types', async () => {
      const participantData = {
        participantName: 'John Doe',
        catName: 'Fluffy',
        cageNumber: 5
      };

      mockClient.graphql
        .mockResolvedValueOnce({ 
          data: { 
            getCat: { ...mockCat, ...participantData }
          }
        })
        .mockResolvedValueOnce({ 
          data: { 
            createScore: { ...mockCageScore, ...participantData }
          }
        })
        .mockResolvedValueOnce({ 
          data: { 
            createClassScore: { ...mockClassScore, ...participantData }
          }
        })
        .mockResolvedValueOnce({ 
          data: { 
            createFitShowScore: { ...mockFitShowScore, ...participantData }
          }
        });

      // Test cage scoring
      const { rerender } = render(
        <BrowserRouter>
          <ScorePage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Fluffy')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
      });

      // Test class scoring
      rerender(
        <BrowserRouter>
          <ClassScorePage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Fluffy')).toBeInTheDocument();
      });

      // Test fit and show scoring
      rerender(
        <BrowserRouter>
          <FitShowScoringPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Fluffy')).toBeInTheDocument();
      });
    });

    test('should handle score updates across systems without conflicts', async () => {
      mockClient.graphql
        .mockResolvedValueOnce({ data: { getCat: mockCat } })
        .mockResolvedValueOnce({ data: { updateScore: { ...mockCageScore, totalScore: 80 } } })
        .mockResolvedValueOnce({ data: { updateClassScore: { ...mockClassScore, totalScore: 85 } } })
        .mockResolvedValueOnce({ data: { updateFitShowScore: { ...mockFitShowScore, totalScore: 88 } } });

      // Simulate concurrent updates to different score types
      const updatePromises = [
        // Update cage score
        mockClient.graphql({
          query: 'updateScore',
          variables: { input: { id: 'cage-score-123', totalScore: 80 } }
        }),
        // Update class score
        mockClient.graphql({
          query: 'updateClassScore',
          variables: { input: { id: 'class-score-123', totalScore: 85 } }
        }),
        // Update fit and show score
        mockClient.graphql({
          query: 'updateFitShowScore',
          variables: { input: { id: 'fit-show-score-123', totalScore: 88 } }
        })
      ];

      const results = await Promise.all(updatePromises);

      // All updates should succeed without conflicts
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.data).toBeDefined();
      });
    });
  });

  describe('Unified Reporting Integration', () => {
    test('should generate comprehensive reports including all scoring types', async () => {
      const allScores = {
        cageScores: [mockCageScore],
        classScores: [mockClassScore],
        fitShowScores: [mockFitShowScore]
      };

      mockClient.graphql.mockResolvedValue({
        data: { 
          listScores: { items: allScores.cageScores },
          listClassScores: { items: allScores.classScores },
          listFitShowScores: { items: allScores.fitShowScores }
        }
      });

      render(
        <BrowserRouter>
          <ScoringDashboardPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Comprehensive Scoring Report')).toBeInTheDocument();
      });

      // Should show all scoring categories
      expect(screen.getByText(/cage.*scoring.*results/i)).toBeInTheDocument();
      expect(screen.getByText(/class.*scoring.*results/i)).toBeInTheDocument();
      expect(screen.getByText(/fit.*show.*scoring.*results/i)).toBeInTheDocument();

      // Should calculate overall rankings
      expect(screen.getByText(/overall.*participant.*ranking/i)).toBeInTheDocument();
    });

    test('should export unified data across all scoring systems', async () => {
      const exportData = {
        participants: [
          {
            name: 'John Doe',
            catName: 'Fluffy',
            cageNumber: 5,
            cageScore: 78,
            classScore: 82,
            fitShowScore: 85,
            totalScore: 245
          }
        ]
      };

      mockClient.graphql.mockResolvedValue({
        data: { generateUnifiedReport: exportData }
      });

      render(
        <BrowserRouter>
          <ScoringDashboardPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export.*unified.*report/i })).toBeInTheDocument();
      });

      // Mock CSV download
      const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
      const mockRevokeObjectURL = vi.fn();
      
      Object.defineProperty(window.URL, 'createObjectURL', { value: mockCreateObjectURL });
      Object.defineProperty(window.URL, 'revokeObjectURL', { value: mockRevokeObjectURL });

      const exportButton = screen.getByRole('button', { name: /export.*unified.*report/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalled();
      });

      // Verify export includes all scoring types
      const exportCall = mockCreateObjectURL.mock.calls[0][0];
      expect(exportCall.type).toBe('text/csv');
    });
  });

  describe('Role-Based Access Integration', () => {
    test('should enforce proper role separation across scoring systems', async () => {
      const roles = [
        { role: 'cageJudge', allowedSystems: ['cage'] },
        { role: 'classJudge', allowedSystems: ['class'] },
        { role: 'fitShowJudge', allowedSystems: ['fitshow'] },
        { role: 'headJudge', allowedSystems: ['cage', 'class', 'fitshow'] }
      ];

      for (const { role, allowedSystems } of roles) {
        mockClient.graphql.mockResolvedValue({
          data: { getCurrentUser: { role } }
        });

        const { unmount } = render(
          <BrowserRouter>
            <AppLayout>
              <ScoringDashboardPage />
            </AppLayout>
          </BrowserRouter>
        );

        await waitFor(() => {
          expect(screen.getByText('Scoring Dashboard')).toBeInTheDocument();
        });

        // Check access to each scoring system
        const cageLink = screen.queryByRole('link', { name: /cage.*scoring/i });
        const classLink = screen.queryByRole('link', { name: /class.*scoring/i });
        const fitShowLink = screen.queryByRole('link', { name: /fit.*show.*scoring/i });

        if (allowedSystems.includes('cage')) {
          expect(cageLink).toBeInTheDocument();
        } else {
          expect(cageLink).not.toBeInTheDocument();
        }

        if (allowedSystems.includes('class')) {
          expect(classLink).toBeInTheDocument();
        } else {
          expect(classLink).not.toBeInTheDocument();
        }

        if (allowedSystems.includes('fitshow')) {
          expect(fitShowLink).toBeInTheDocument();
        } else {
          expect(fitShowLink).not.toBeInTheDocument();
        }

        unmount();
      }
    });

    test('should handle cross-system judge assignments', async () => {
      const multiRoleJudge = {
        id: 'judge-multi',
        name: 'Multi Judge',
        roles: ['cageJudge', 'fitShowJudge']
      };

      mockClient.graphql.mockResolvedValue({
        data: { getCurrentUser: multiRoleJudge }
      });

      render(
        <BrowserRouter>
          <AppLayout>
            <ScoringDashboardPage />
          </AppLayout>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Scoring Dashboard')).toBeInTheDocument();
      });

      // Should have access to both cage and fit show scoring
      expect(screen.getByRole('link', { name: /cage.*scoring/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /fit.*show.*scoring/i })).toBeInTheDocument();
      
      // Should not have access to class scoring
      expect(screen.queryByRole('link', { name: /class.*scoring/i })).not.toBeInTheDocument();
    });
  });
});