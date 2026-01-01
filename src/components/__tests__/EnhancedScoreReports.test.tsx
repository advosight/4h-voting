import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import EnhancedScoreReports from '../EnhancedScoreReports';

// Mock AWS Amplify
const mockGraphQL = jest.fn();
jest.mock('aws-amplify/api', () => ({
  generateClient: () => ({
    graphql: mockGraphQL
  })
}));

// Mock useMediaQuery
jest.mock('@mui/material', () => {
  const actual = jest.requireActual('@mui/material');
  return {
    ...actual,
    useMediaQuery: () => false, // Default to desktop
    useTheme: () => actual.createTheme()
  };
});

const mockScoreData = [
  {
    id: '1',
    catId: 'cat1',
    judgeId: 'judge1',
    judgeName: 'Judge Smith',
    firstImpressionScore: 12,
    originalityScore: 13,
    informationCardScore: 14,
    workDoneByMemberScore: 15,
    basicComfortScore: 11,
    safetyScore: 14,
    easyViewOfCatScore: 8,
    totalScore: 87,
    timestamp: '2024-01-15T10:30:00Z',
    isFinalized: true
  },
  {
    id: '2',
    catId: 'cat2',
    judgeId: 'judge2',
    judgeName: 'Judge Johnson',
    firstImpressionScore: 10,
    originalityScore: 11,
    informationCardScore: 12,
    workDoneByMemberScore: 13,
    basicComfortScore: 9,
    safetyScore: 12,
    easyViewOfCatScore: 7,
    totalScore: 74,
    timestamp: '2024-01-16T14:20:00Z',
    isFinalized: false
  }
];

const mockCatData = {
  cat1: {
    id: 'cat1',
    name: 'Fluffy',
    owner: 'John Doe',
    cageNumber: 1
  },
  cat2: {
    id: 'cat2',
    name: 'Whiskers',
    owner: 'Jane Smith',
    cageNumber: 2
  }
};

const renderWithTheme = (component: React.ReactElement) => {
  const theme = createTheme();
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('EnhancedScoreReports', () => {
  beforeEach(() => {
    mockGraphQL.mockImplementation(({ query }) => {
      if (query.includes('listAllScores')) {
        return Promise.resolve({
          data: {
            listAllScores: {
              items: mockScoreData
            }
          }
        });
      } else if (query.includes('getCat')) {
        const catId = query.match(/variables.*id.*"(\w+)"/)?.[1];
        return Promise.resolve({
          data: {
            getCat: mockCatData[catId as keyof typeof mockCatData] || null
          }
        });
      }
      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading and Data Display', () => {
    it('shows loading state initially', () => {
      renderWithTheme(<EnhancedScoreReports />);
      
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });

    it('displays score data after loading', async () => {
      renderWithTheme(<EnhancedScoreReports />);
      
      await waitFor(() => {
        expect(screen.getByText('Fluffy')).toBeInTheDocument();
        expect(screen.getByText('Whiskers')).toBeInTheDocument();
        expect(screen.getByText('Judge Smith')).toBeInTheDocument();
        expect(screen.getByText('Judge Johnson')).toBeInTheDocument();
      });
    });

    it('displays correct score formatting', async () => {
      renderWithTheme(<EnhancedScoreReports />);
      
      await waitFor(() => {
        expect(screen.getByText('87/100')).toBeInTheDocument();
        expect(screen.getByText('74/100')).toBeInTheDocument();
      });
    });

    it('shows finalized status correctly', async () => {
      renderWithTheme(<EnhancedScoreReports />);
      
      await waitFor(() => {
        expect(screen.getByText('✅ Final')).toBeInTheDocument();
        expect(screen.getByText('📝 Draft')).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('filters scores by search term', async () => {
      const user = userEvent.setup();
      renderWithTheme(<EnhancedScoreReports />);
      
      await waitFor(() => {
        expect(screen.getByText('Fluffy')).toBeInTheDocument();
      });

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'Fluffy');

      expect(screen.getByText('Fluffy')).toBeInTheDocument();
      expect(screen.queryByText('Whiskers')).not.toBeInTheDocument();
    });

    it('shows no results message when search has no matches', async () => {
      const user = userEvent.setup();
      renderWithTheme(<EnhancedScoreReports />);
      
      await waitFor(() => {
        expect(screen.getByText('Fluffy')).toBeInTheDocument();
      });

      const searchInput = screen.getByRole('searchbox');
      await user.type(searchInput, 'NonexistentCat');

      expect(screen.getByText('No scores available yet. Start scoring to see results here.')).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('sorts by cage number when header is clicked', async () => {
      renderWithTheme(<EnhancedScoreReports />);
      
      await waitFor(() => {
        expect(screen.getByText('Fluffy')).toBeInTheDocument();
      });

      const cageHeader = screen.getByRole('columnheader', { name: /cage/i });
      fireEvent.click(cageHeader);

      // Should sort by cage number ascending (1, 2)
      const rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveTextContent('Cage #1');
      expect(rows[2]).toHaveTextContent('Cage #2');
    });

    it('sorts by total score when header is clicked', async () => {
      renderWithTheme(<EnhancedScoreReports />);
      
      await waitFor(() => {
        expect(screen.getByText('Fluffy')).toBeInTheDocument();
      });

      const scoreHeader = screen.getByRole('columnheader', { name: /total score/i });
      fireEvent.click(scoreHeader);

      // Should sort by score ascending (74, 87)
      const scoreElements = screen.getAllByText(/\/100/);
      expect(scoreElements[0]).toHaveTextContent('74/100');
      expect(scoreElements[1]).toHaveTextContent('87/100');
    });
  });

  describe('Score Details Modal', () => {
    it('opens modal when view details button is clicked', async () => {
      renderWithTheme(<EnhancedScoreReports />);
      
      await waitFor(() => {
        expect(screen.getByText('Fluffy')).toBeInTheDocument();
      });

      const viewButtons = screen.getAllByText('👁️ View Details');
      fireEvent.click(viewButtons[0]);

      expect(screen.getByText('Score Details')).toBeInTheDocument();
      expect(screen.getByText('Cat Information')).toBeInTheDocument();
      expect(screen.getByText('Category Breakdown')).toBeInTheDocument();
    });

    it('displays correct score breakdown in modal', async () => {
      renderWithTheme(<EnhancedScoreReports />);
      
      await waitFor(() => {
        expect(screen.getByText('Fluffy')).toBeInTheDocument();
      });

      const viewButtons = screen.getAllByText('👁️ View Details');
      fireEvent.click(viewButtons[0]);

      expect(screen.getByText('First Impression:')).toBeInTheDocument();
      expect(screen.getByText('12/15')).toBeInTheDocument();
      expect(screen.getByText('Originality:')).toBeInTheDocument();
      expect(screen.getByText('13/15')).toBeInTheDocument();
    });

    it('closes modal when close button is clicked', async () => {
      renderWithTheme(<EnhancedScoreReports />);
      
      await waitFor(() => {
        expect(screen.getByText('Fluffy')).toBeInTheDocument();
      });

      const viewButtons = screen.getAllByText('👁️ View Details');
      fireEvent.click(viewButtons[0]);

      const closeButton = screen.getByRole('button', { name: /close modal/i });
      fireEvent.click(closeButton);

      expect(screen.queryByText('Score Details')).not.toBeInTheDocument();
    });

    it('closes modal when overlay is clicked', async () => {
      renderWithTheme(<EnhancedScoreReports />);
      
      await waitFor(() => {
        expect(screen.getByText('Fluffy')).toBeInTheDocument();
      });

      const viewButtons = screen.getAllByText('👁️ View Details');
      fireEvent.click(viewButtons[0]);

      const overlay = screen.getByText('Score Details').closest('.modal-overlay');
      fireEvent.click(overlay!);

      expect(screen.queryByText('Score Details')).not.toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('shows pagination controls when there are multiple pages', async () => {
      // Mock more data to trigger pagination
      const manyScores = Array.from({ length: 15 }, (_, i) => ({
        ...mockScoreData[0],
        id: `score-${i}`,
        catId: `cat-${i}`
      }));

      mockGraphQL.mockImplementation(({ query }) => {
        if (query.includes('listAllScores')) {
          return Promise.resolve({
            data: {
              listAllScores: {
                items: manyScores
              }
            }
          });
        }
        return Promise.resolve({
          data: {
            getCat: mockCatData.cat1
          }
        });
      });

      renderWithTheme(<EnhancedScoreReports />);
      
      await waitFor(() => {
        expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when API call fails', async () => {
      mockGraphQL.mockRejectedValue(new Error('API Error'));
      
      renderWithTheme(<EnhancedScoreReports />);
      
      await waitFor(() => {
        expect(screen.getByText('Error Loading Scores')).toBeInTheDocument();
        expect(screen.getByText('Failed to load scores. Please try again.')).toBeInTheDocument();
      });
    });

    it('shows try again button on error', async () => {
      mockGraphQL.mockRejectedValue(new Error('API Error'));
      
      renderWithTheme(<EnhancedScoreReports />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });

    it('retries loading when try again button is clicked', async () => {
      mockGraphQL.mockRejectedValueOnce(new Error('API Error'));
      
      renderWithTheme(<EnhancedScoreReports />);
      
      await waitFor(() => {
        expect(screen.getByText('Error Loading Scores')).toBeInTheDocument();
      });

      // Reset mock to return successful data
      mockGraphQL.mockImplementation(({ query }) => {
        if (query.includes('listAllScores')) {
          return Promise.resolve({
            data: {
              listAllScores: {
                items: mockScoreData
              }
            }
          });
        }
        return Promise.resolve({
          data: {
            getCat: mockCatData.cat1
          }
        });
      });

      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(tryAgainButton);

      await waitFor(() => {
        expect(screen.getByText('Fluffy')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', async () => {
      renderWithTheme(<EnhancedScoreReports />);
      
      await waitFor(() => {
        expect(screen.getByRole('table', { name: /cage scoring reports table/i })).toBeInTheDocument();
      });
    });

    it('has proper heading structure', () => {
      renderWithTheme(<EnhancedScoreReports />);
      
      expect(screen.getByRole('heading', { name: /cage scoring reports/i })).toBeInTheDocument();
    });

    it('supports keyboard navigation for interactive elements', async () => {
      renderWithTheme(<EnhancedScoreReports />);
      
      await waitFor(() => {
        expect(screen.getByText('Fluffy')).toBeInTheDocument();
      });

      const viewButton = screen.getAllByText('👁️ View Details')[0];
      viewButton.focus();
      expect(viewButton).toHaveFocus();
    });
  });
});