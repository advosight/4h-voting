import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { API } from 'aws-amplify';
import FitShowScoreReports from '../FitShowScoreReports';

// Mock AWS Amplify
jest.mock('aws-amplify', () => ({
  API: {
    graphql: jest.fn(),
  },
  graphqlOperation: jest.fn((query) => query),
}));

const mockAPI = API as jest.Mocked<typeof API>;

const mockFitShowScores = [
  {
    id: '1',
    catId: 'cat1',
    participantName: 'Alice Johnson',
    judgeId: 'judge1',
    judgeName: 'Judge Smith',
    totalScore: 85,
    appearanceTotal: 18,
    handlingTotal: 12,
    demonstrationTotal: 14,
    healthExaminationTotal: 19,
    groomingCareTotal: 12,
    knowledgeTotal: 10,
    appearanceComments: 'Great presentation',
    handlingComments: 'Excellent control',
    demonstrationComments: 'Clear demonstrations',
    healthExaminationComments: 'Thorough examination',
    groomingCareComments: 'Well groomed cat',
    knowledgeComments: 'Good knowledge base',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    isFinalized: true,
  },
  {
    id: '2',
    catId: 'cat2',
    participantName: 'Bob Wilson',
    judgeId: 'judge2',
    judgeName: 'Judge Davis',
    totalScore: 78,
    appearanceTotal: 16,
    handlingTotal: 11,
    demonstrationTotal: 13,
    healthExaminationTotal: 17,
    groomingCareTotal: 11,
    knowledgeTotal: 10,
    appearanceComments: 'Good attire',
    handlingComments: 'Needs improvement',
    demonstrationComments: 'Adequate',
    healthExaminationComments: 'Good technique',
    groomingCareComments: 'Clean cat',
    knowledgeComments: 'Solid understanding',
    createdAt: '2024-01-14T14:30:00Z',
    updatedAt: '2024-01-14T14:30:00Z',
    isFinalized: false,
  },
];

describe('FitShowScoreReports', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clean up any existing DOM elements
    document.body.innerHTML = '';
  });

  afterEach(() => {
    // Clean up after each test
    document.body.innerHTML = '';
  });

  it('renders loading state initially', () => {
    mockAPI.graphql.mockImplementation(() => new Promise(() => {}));
    
    render(<FitShowScoreReports />);
    
    expect(screen.getByText('Loading fit and show scoring reports...')).toBeInTheDocument();
  });

  it('renders scores table after loading', async () => {
    mockAPI.graphql.mockResolvedValue({
      data: {
        listFitShowScores: {
          items: mockFitShowScores,
          nextToken: null,
        },
      },
    });

    render(<FitShowScoreReports />);

    await waitFor(() => {
      expect(screen.getByText('Fit and Show Scoring Reports')).toBeInTheDocument();
    });

    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    expect(screen.getByText('Judge Smith')).toBeInTheDocument();
    expect(screen.getByText('Judge Davis')).toBeInTheDocument();
  });

  it('displays correct score information', async () => {
    mockAPI.graphql.mockResolvedValue({
      data: {
        listFitShowScores: {
          items: mockFitShowScores,
          nextToken: null,
        },
      },
    });

    render(<FitShowScoreReports />);

    await waitFor(() => {
      expect(screen.getByText('85/100')).toBeInTheDocument();
    });

    expect(screen.getByText('78/100')).toBeInTheDocument();
    expect(screen.getByText('App: 18/20')).toBeInTheDocument();
    expect(screen.getByText('Hand: 12/14')).toBeInTheDocument();
  });

  it('filters scores by participant name', async () => {
    mockAPI.graphql.mockResolvedValue({
      data: {
        listFitShowScores: {
          items: mockFitShowScores,
          nextToken: null,
        },
      },
    });

    render(<FitShowScoreReports />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    const participantFilter = screen.getByPlaceholderText('Filter by participant name');
    fireEvent.change(participantFilter, { target: { value: 'Alice' } });

    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument();
  });

  it('filters scores by judge name', async () => {
    mockAPI.graphql.mockResolvedValue({
      data: {
        listFitShowScores: {
          items: mockFitShowScores,
          nextToken: null,
        },
      },
    });

    render(<FitShowScoreReports />);

    await waitFor(() => {
      expect(screen.getByText('Judge Smith')).toBeInTheDocument();
    });

    const judgeFilter = screen.getByPlaceholderText('Filter by judge name');
    fireEvent.change(judgeFilter, { target: { value: 'Smith' } });

    expect(screen.getByText('Judge Smith')).toBeInTheDocument();
    expect(screen.queryByText('Judge Davis')).not.toBeInTheDocument();
  });

  it('filters scores by score range', async () => {
    mockAPI.graphql.mockResolvedValue({
      data: {
        listFitShowScores: {
          items: mockFitShowScores,
          nextToken: null,
        },
      },
    });

    render(<FitShowScoreReports />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    const minScoreFilter = screen.getByPlaceholderText('0');
    fireEvent.change(minScoreFilter, { target: { value: '80' } });

    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument();
  });

  it('filters finalized scores only', async () => {
    mockAPI.graphql.mockResolvedValue({
      data: {
        listFitShowScores: {
          items: mockFitShowScores,
          nextToken: null,
        },
      },
    });

    render(<FitShowScoreReports />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    const finalizedOnlyCheckbox = screen.getByRole('checkbox');
    fireEvent.click(finalizedOnlyCheckbox);

    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument();
  });

  it('sorts scores by total score', async () => {
    mockAPI.graphql.mockResolvedValue({
      data: {
        listFitShowScores: {
          items: mockFitShowScores,
          nextToken: null,
        },
      },
    });

    render(<FitShowScoreReports />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    // The table should already be sorted by total score descending by default
    const participantCells = screen.getAllByClassName('participant-name');
    expect(participantCells[0]).toHaveTextContent('Alice Johnson');
    expect(participantCells[1]).toHaveTextContent('Bob Wilson');
  });

  it('sorts scores by participant name', async () => {
    mockAPI.graphql.mockResolvedValue({
      data: {
        listFitShowScores: {
          items: mockFitShowScores,
          nextToken: null,
        },
      },
    });

    render(<FitShowScoreReports />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    // Find the table header specifically (not the filter label)
    const participantHeader = screen.getAllByText(/Participant/)[1]; // Get the table header, not the filter label
    fireEvent.click(participantHeader);

    // Should be sorted by name descending (Bob first)
    const participantCells = screen.getAllByClassName('participant-name');
    expect(participantCells[0]).toHaveTextContent('Bob Wilson');
    expect(participantCells[1]).toHaveTextContent('Alice Johnson');
  });

  it('clears all filters', async () => {
    mockAPI.graphql.mockResolvedValue({
      data: {
        listFitShowScores: {
          items: mockFitShowScores,
          nextToken: null,
        },
      },
    });

    render(<FitShowScoreReports />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    // Apply a filter
    const participantFilter = screen.getByPlaceholderText('Filter by participant name');
    fireEvent.change(participantFilter, { target: { value: 'Alice' } });

    expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument();

    // Clear filters
    const clearButton = screen.getByText('Clear Filters');
    fireEvent.click(clearButton);

    expect(participantFilter).toHaveValue('');
    expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
  });

  it('exports to CSV', async () => {
    mockAPI.graphql.mockResolvedValue({
      data: {
        listFitShowScores: {
          items: mockFitShowScores,
          nextToken: null,
        },
      },
    });

    // Mock URL.createObjectURL and document methods
    const mockCreateObjectURL = jest.fn(() => 'mock-url');
    const mockClick = jest.fn();
    const mockAppendChild = jest.fn();
    const mockRemoveChild = jest.fn();

    const originalCreateObjectURL = URL.createObjectURL;
    const originalCreateElement = document.createElement;
    const originalAppendChild = document.body.appendChild;
    const originalRemoveChild = document.body.removeChild;

    Object.defineProperty(URL, 'createObjectURL', {
      value: mockCreateObjectURL,
      configurable: true,
    });

    const mockLink = {
      setAttribute: jest.fn(),
      click: mockClick,
      style: { visibility: '' },
    };

    document.createElement = jest.fn().mockReturnValue(mockLink);
    document.body.appendChild = mockAppendChild;
    document.body.removeChild = mockRemoveChild;

    render(<FitShowScoreReports />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    const exportButton = screen.getByText(/Export to CSV/);
    fireEvent.click(exportButton);

    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
    expect(mockAppendChild).toHaveBeenCalled();
    expect(mockRemoveChild).toHaveBeenCalled();

    // Restore original methods
    Object.defineProperty(URL, 'createObjectURL', {
      value: originalCreateObjectURL,
      configurable: true,
    });
    document.createElement = originalCreateElement;
    document.body.appendChild = originalAppendChild;
    document.body.removeChild = originalRemoveChild;
  });

  it('handles API errors gracefully', async () => {
    mockAPI.graphql.mockRejectedValue(new Error('API Error'));

    render(<FitShowScoreReports />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load fit and show scores')).toBeInTheDocument();
    });

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('retries loading on error', async () => {
    mockAPI.graphql.mockRejectedValueOnce(new Error('API Error'))
                   .mockResolvedValueOnce({
                     data: {
                       listFitShowScores: {
                         items: mockFitShowScores,
                         nextToken: null,
                       },
                     },
                   });

    render(<FitShowScoreReports />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load fit and show scores')).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });
  });

  it('displays correct results summary', async () => {
    mockAPI.graphql.mockResolvedValue({
      data: {
        listFitShowScores: {
          items: mockFitShowScores,
          nextToken: null,
        },
      },
    });

    render(<FitShowScoreReports />);

    await waitFor(() => {
      expect(screen.getByText('Showing 2 of 2 fit and show scores')).toBeInTheDocument();
    });
  });

  it('shows no results message when no scores match filters', async () => {
    mockAPI.graphql.mockResolvedValue({
      data: {
        listFitShowScores: {
          items: mockFitShowScores,
          nextToken: null,
        },
      },
    });

    render(<FitShowScoreReports />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    // Apply a filter that matches no results
    const participantFilter = screen.getByPlaceholderText('Filter by participant name');
    fireEvent.change(participantFilter, { target: { value: 'NonExistent' } });

    expect(screen.getByText('No fit and show scores found matching the current filters.')).toBeInTheDocument();
  });
});