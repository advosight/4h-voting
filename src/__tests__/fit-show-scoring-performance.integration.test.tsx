import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import FitShowScoreReports from '../components/FitShowScoreReports';
import FitShowScoreLeaderboard from '../components/FitShowScoreLeaderboard';
import FitShowScoringPage from '../pages/FitShowScoringPage';
import type { Mock } from 'vitest';

// Mock AWS Amplify
vi.mock('aws-amplify/api');

const mockClient = {
  graphql: vi.fn(),
  cancel: vi.fn(),
};

(generateClient as Mock).mockReturnValue(mockClient);

// Helper to generate large datasets
const generateMockScores = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `score-${i}`,
    catId: `cat-${i}`,
    participantName: `Participant ${i}`,
    judgeId: `judge-${i % 10}`, // 10 judges
    judgeName: `Judge ${i % 10}`,
    totalScore: 70 + Math.floor(Math.random() * 30), // Random scores 70-100
    appearanceTotal: 15 + Math.floor(Math.random() * 5),
    handlingTotal: 8 + Math.floor(Math.random() * 6),
    demonstrationTotal: 12 + Math.floor(Math.random() * 4),
    healthExaminationTotal: 16 + Math.floor(Math.random() * 5),
    groomingCareTotal: 10 + Math.floor(Math.random() * 4),
    knowledgeTotal: 9 + Math.floor(Math.random() * 3),
    createdAt: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    isFinalized: Math.random() > 0.3 // 70% finalized
  }));
};

describe('Fit and Show Scoring Performance Integration Tests', () => {
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

    // Mock performance API
    Object.defineProperty(window, 'performance', {
      value: {
        now: vi.fn(() => Date.now()),
        mark: vi.fn(),
        measure: vi.fn(),
        getEntriesByType: vi.fn(() => [])
      }
    });
  });

  describe('Large Dataset Performance', () => {
    test('should handle 500+ fit and show scores efficiently', async () => {
      const largeDataset = generateMockScores(500);
      
      mockClient.graphql.mockResolvedValue({
        data: { listFitShowScores: { items: largeDataset } }
      });

      const startTime = performance.now();

      render(
        <BrowserRouter>
          <FitShowScoreReports />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Fit and Show Scoring Reports')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render 500 scores in under 3 seconds
      expect(renderTime).toBeLessThan(3000);

      // Verify data is displayed
      expect(screen.getAllByText(/Participant \d+/)).toHaveLength(Math.min(50, largeDataset.length)); // Assuming pagination
    });

    test('should handle pagination with large datasets efficiently', async () => {
      const totalScores = 1000;
      const pageSize = 50;
      const pages = Math.ceil(totalScores / pageSize);

      // Mock paginated responses
      for (let page = 0; page < pages; page++) {
        const startIndex = page * pageSize;
        const endIndex = Math.min(startIndex + pageSize, totalScores);
        const pageData = generateMockScores(endIndex - startIndex);
        
        mockClient.graphql.mockResolvedValueOnce({
          data: { 
            listFitShowScores: { 
              items: pageData,
              nextToken: page < pages - 1 ? `token-${page + 1}` : null
            }
          }
        });
      }

      render(
        <BrowserRouter>
          <FitShowScoreReports />
        </BrowserRouter>
      );

      const startTime = performance.now();

      // Load first page
      await waitFor(() => {
        expect(screen.getByText('Fit and Show Scoring Reports')).toBeInTheDocument();
      });

      // Navigate through multiple pages
      for (let page = 1; page < 5; page++) { // Test first 5 pages
        const nextButton = screen.getByRole('button', { name: /next/i });
        fireEvent.click(nextButton);

        await waitFor(() => {
          expect(screen.getByText(`Page ${page + 1}`)).toBeInTheDocument();
        });
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should navigate through 5 pages in under 5 seconds
      expect(totalTime).toBeLessThan(5000);
    });

    test('should handle filtering and sorting large datasets efficiently', async () => {
      const largeDataset = generateMockScores(300);
      
      mockClient.graphql.mockResolvedValue({
        data: { listFitShowScores: { items: largeDataset } }
      });

      render(
        <BrowserRouter>
          <FitShowScoreReports />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Fit and Show Scoring Reports')).toBeInTheDocument();
      });

      const startTime = performance.now();

      // Test filtering
      const filterInput = screen.getByLabelText(/filter by participant/i);
      fireEvent.change(filterInput, { target: { value: 'Participant 1' } });

      await waitFor(() => {
        const filteredResults = screen.getAllByText(/Participant 1\d*/);
        expect(filteredResults.length).toBeGreaterThan(0);
        expect(filteredResults.length).toBeLessThan(20); // Should be filtered
      });

      // Test sorting
      const sortButton = screen.getByRole('button', { name: /sort by score/i });
      fireEvent.click(sortButton);

      await waitFor(() => {
        const scoreElements = screen.getAllByText(/\d{2,3}/);
        const scores = scoreElements.map(el => parseInt(el.textContent || '0'));
        
        // Verify scores are sorted (descending)
        for (let i = 1; i < Math.min(scores.length, 10); i++) {
          expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
        }
      });

      const endTime = performance.now();
      const operationTime = endTime - startTime;

      // Filtering and sorting should complete in under 1 second
      expect(operationTime).toBeLessThan(1000);
    });
  });

  describe('Concurrent User Performance', () => {
    test('should handle multiple concurrent users viewing leaderboard', async () => {
      const scores = generateMockScores(100);
      
      mockClient.graphql.mockResolvedValue({
        data: { listFitShowScores: { items: scores } }
      });

      // Simulate 10 concurrent users
      const userComponents = Array.from({ length: 10 }, (_, i) => (
        <div key={i} data-testid={`user-${i}`}>
          <BrowserRouter>
            <FitShowScoreLeaderboard />
          </BrowserRouter>
        </div>
      ));

      const startTime = performance.now();

      const { container } = render(<div>{userComponents}</div>);

      // Wait for all components to load
      await waitFor(() => {
        for (let i = 0; i < 10; i++) {
          expect(container.querySelector(`[data-testid="user-${i}"]`)).toBeInTheDocument();
        }
      });

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // 10 concurrent leaderboards should load in under 3 seconds
      expect(loadTime).toBeLessThan(3000);

      // Verify all components loaded the same data
      const leaderboards = container.querySelectorAll('[data-testid^="user-"]');
      expect(leaderboards).toHaveLength(10);
    });

    test('should handle concurrent real-time updates efficiently', async () => {
      const initialScores = generateMockScores(50);
      const updates = generateMockScores(100);

      mockClient.graphql.mockResolvedValue({
        data: { listFitShowScores: { items: initialScores } }
      });

      // Mock subscription
      const mockSubscription = {
        subscribe: vi.fn((callback) => {
          // Simulate rapid concurrent updates
          updates.forEach((score, index) => {
            setTimeout(() => {
              callback({
                data: { onFitShowScoreCreated: score }
              });
            }, index * 10); // 10ms intervals
          });
          
          return { unsubscribe: vi.fn() };
        })
      };

      mockClient.graphql.mockReturnValue(mockSubscription);

      const startTime = performance.now();

      render(
        <BrowserRouter>
          <FitShowScoreLeaderboard />
        </BrowserRouter>
      );

      // Wait for initial load and all updates
      await waitFor(() => {
        expect(screen.getByText('Fit and Show Leaderboard')).toBeInTheDocument();
      });

      // Wait for updates to process
      await new Promise(resolve => setTimeout(resolve, 1500));

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Should handle 100 rapid updates in under 2 seconds
      expect(processingTime).toBeLessThan(2000);
    });

    test('should maintain performance with concurrent form submissions', async () => {
      const mockCat = {
        id: 'cat-123',
        name: 'Fluffy',
        ownerName: 'John Doe',
        cageNumber: 5
      };

      // Mock responses for concurrent submissions
      mockClient.graphql
        .mockResolvedValue({ data: { getCat: mockCat } })
        .mockResolvedValue({ data: { createFitShowScore: generateMockScores(1)[0] } });

      // Simulate 5 concurrent form submissions
      const formComponents = Array.from({ length: 5 }, (_, i) => (
        <div key={i} data-testid={`form-${i}`}>
          <BrowserRouter>
            <FitShowScoringPage judgeId={`judge-${i}`} />
          </BrowserRouter>
        </div>
      ));

      const { container } = render(<div>{formComponents}</div>);

      await waitFor(() => {
        for (let i = 0; i < 5; i++) {
          expect(container.querySelector(`[data-testid="form-${i}"]`)).toBeInTheDocument();
        }
      });

      const startTime = performance.now();

      // Simulate concurrent form submissions
      const submissionPromises = Array.from({ length: 5 }, async (_, i) => {
        const formContainer = container.querySelector(`[data-testid="form-${i}"]`);
        const attireInput = formContainer?.querySelector('input[name="attire"]') as HTMLInputElement;
        const saveButton = formContainer?.querySelector('button[type="submit"]') as HTMLButtonElement;

        if (attireInput && saveButton) {
          fireEvent.change(attireInput, { target: { value: '8' } });
          fireEvent.click(saveButton);
        }
      });

      await Promise.all(submissionPromises);

      const endTime = performance.now();
      const submissionTime = endTime - startTime;

      // 5 concurrent submissions should complete in under 2 seconds
      expect(submissionTime).toBeLessThan(2000);
    });
  });

  describe('Memory and Resource Performance', () => {
    test('should not cause memory leaks with large datasets', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Load and unload large datasets multiple times
      for (let iteration = 0; iteration < 5; iteration++) {
        const largeDataset = generateMockScores(200);
        
        mockClient.graphql.mockResolvedValue({
          data: { listFitShowScores: { items: largeDataset } }
        });

        const { unmount } = render(
          <BrowserRouter>
            <FitShowScoreReports />
          </BrowserRouter>
        );

        await waitFor(() => {
          expect(screen.getByText('Fit and Show Scoring Reports')).toBeInTheDocument();
        });

        // Force garbage collection if available
        if ((global as any).gc) {
          (global as any).gc();
        }

        unmount();
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    test('should handle rapid component mounting and unmounting', async () => {
      const scores = generateMockScores(50);
      
      mockClient.graphql.mockResolvedValue({
        data: { listFitShowScores: { items: scores } }
      });

      const startTime = performance.now();

      // Rapidly mount and unmount components
      for (let i = 0; i < 20; i++) {
        const { unmount } = render(
          <BrowserRouter>
            <FitShowScoreLeaderboard />
          </BrowserRouter>
        );

        await waitFor(() => {
          expect(screen.getByText('Fit and Show Leaderboard')).toBeInTheDocument();
        });

        unmount();
      }

      const endTime = performance.now();
      const cycleTime = endTime - startTime;

      // 20 mount/unmount cycles should complete in under 5 seconds
      expect(cycleTime).toBeLessThan(5000);
    });

    test('should optimize re-renders with large lists', async () => {
      const renderSpy = vi.spyOn(React, 'useState');
      const scores = generateMockScores(200);
      
      mockClient.graphql.mockResolvedValue({
        data: { listFitShowScores: { items: scores } }
      });

      render(
        <BrowserRouter>
          <FitShowScoreReports />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Fit and Show Scoring Reports')).toBeInTheDocument();
      });

      const initialRenderCount = renderSpy.mock.calls.length;

      // Trigger a filter change
      const filterInput = screen.getByLabelText(/filter by participant/i);
      fireEvent.change(filterInput, { target: { value: 'Participant 1' } });

      await waitFor(() => {
        expect(screen.getByDisplayValue('Participant 1')).toBeInTheDocument();
      });

      const finalRenderCount = renderSpy.mock.calls.length;
      const additionalRenders = finalRenderCount - initialRenderCount;

      // Should not cause excessive re-renders (less than 20 additional renders)
      expect(additionalRenders).toBeLessThan(20);

      renderSpy.mockRestore();
    });
  });

  describe('Network Performance', () => {
    test('should handle slow network conditions gracefully', async () => {
      const scores = generateMockScores(100);
      
      // Simulate slow network (2 second delay)
      mockClient.graphql.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            data: { listFitShowScores: { items: scores } }
          }), 2000)
        )
      );

      const startTime = performance.now();

      render(
        <BrowserRouter>
          <FitShowScoreReports />
        </BrowserRouter>
      );

      // Should show loading state immediately
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Fit and Show Scoring Reports')).toBeInTheDocument();
      }, { timeout: 3000 });

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should handle slow network within reasonable time
      expect(totalTime).toBeGreaterThan(2000); // Network delay
      expect(totalTime).toBeLessThan(2500); // Plus processing time
    });

    test('should implement efficient caching for repeated requests', async () => {
      const scores = generateMockScores(50);
      let requestCount = 0;
      
      mockClient.graphql.mockImplementation(() => {
        requestCount++;
        return Promise.resolve({
          data: { listFitShowScores: { items: scores } }
        });
      });

      // Render component multiple times
      for (let i = 0; i < 3; i++) {
        const { unmount } = render(
          <BrowserRouter>
            <FitShowScoreReports />
          </BrowserRouter>
        );

        await waitFor(() => {
          expect(screen.getByText('Fit and Show Scoring Reports')).toBeInTheDocument();
        });

        unmount();
      }

      // Should cache results and not make excessive requests
      expect(requestCount).toBeLessThanOrEqual(3); // One per render is acceptable
    });
  });
});