import React, { useState, useEffect, useMemo } from 'react';
import { generateClient } from 'aws-amplify/api';
import ResponsiveDataTable, { TableColumn } from './ResponsiveDataTable';

const client = generateClient();

const listFitShowScores = `
  query ListFitShowScores {
    listFitShowScores {
      items {
        id
        participantName
        judgeId
        judgeName
        appearanceTotal
        handlingTotal
        demonstrationTotal
        healthExaminationTotal
        groomingCareTotal
        knowledgeTotal
        totalScore
        createdAt
        updatedAt
        isFinalized
      }
    }
  }
`;

interface FitShowScore {
  id: string;
  participantName: string;
  judgeId: string;
  judgeName: string;
  appearanceTotal: number;
  handlingTotal: number;
  demonstrationTotal: number;
  healthExaminationTotal: number;
  groomingCareTotal: number;
  knowledgeTotal: number;
  totalScore: number;
  createdAt: string;
  updatedAt: string;
  isFinalized: boolean;
}

interface FilterState {
  participantName: string;
  judge: string;
  dateFrom: string;
  dateTo: string;
  scoreMin: string;
  scoreMax: string;
}

const EnhancedFitShowScoreReports: React.FC = () => {
  const [scores, setScores] = useState<FitShowScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedScore, setSelectedScore] = useState<FitShowScore | null>(null);
  const [sortColumn, setSortColumn] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FilterState>({
    participantName: '',
    judge: '',
    dateFrom: '',
    dateTo: '',
    scoreMin: '',
    scoreMax: ''
  });
  const pageSize = 10;

  useEffect(() => {
    fetchFitShowScores();
  }, []);

  const fetchFitShowScores = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await client.graphql({
        query: listFitShowScores
      });

      const scoresData = result.data?.listFitShowScores?.items || [];
      setScores(scoresData);
    } catch (error) {
      console.error('Error fetching fit show scores:', error);
      setError('Failed to load fit show scores. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter data
  const filteredData = useMemo(() => {
    return scores.filter(score => {
      // Text filters
      if (filters.participantName && !score.participantName.toLowerCase().includes(filters.participantName.toLowerCase())) {
        return false;
      }
      if (filters.judge && !score.judgeName.toLowerCase().includes(filters.judge.toLowerCase())) {
        return false;
      }

      // Date filters
      const scoreDate = new Date(score.createdAt);
      if (filters.dateFrom && scoreDate < new Date(filters.dateFrom)) {
        return false;
      }
      if (filters.dateTo && scoreDate > new Date(filters.dateTo + 'T23:59:59')) {
        return false;
      }

      // Score filters
      if (filters.scoreMin && score.totalScore < parseInt(filters.scoreMin)) {
        return false;
      }
      if (filters.scoreMax && score.totalScore > parseInt(filters.scoreMax)) {
        return false;
      }

      return true;
    });
  }, [scores, filters]);

  // Sort data
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let aValue = a[sortColumn as keyof FitShowScore];
      let bValue = b[sortColumn as keyof FitShowScore];

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Handle filter changes
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({
      participantName: '',
      judge: '',
      dateFrom: '',
      dateTo: '',
      scoreMin: '',
      scoreMax: ''
    });
    setCurrentPage(1);
  };

  // Handle sort
  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    setSortColumn(column);
    setSortDirection(direction);
  };

  // Define table columns
  const columns: TableColumn<FitShowScore>[] = [
    {
      key: 'participantName',
      label: 'Participant',
      sortable: true,
      priority: 'high',
      render: (value) => (
        <strong style={{ fontSize: '1.05em', color: '#0066cc' }}>
          {value}
        </strong>
      ),
      mobileRender: (row) => (
        <div>
          <strong style={{ fontSize: '1.1em', color: '#0066cc' }}>
            {row.participantName}
          </strong>
          <div style={{ fontSize: '0.9em', color: '#666', marginTop: '2px' }}>
            Judge: {row.judgeName}
          </div>
        </div>
      )
    },
    {
      key: 'judgeName',
      label: 'Judge',
      sortable: true,
      priority: 'high',
      render: (value) => value
    },
    {
      key: 'totalScore',
      label: 'Total Score',
      sortable: true,
      priority: 'high',
      align: 'center',
      width: '120px',
      render: (value) => {
        const score = value || 0;
        const percentage = (score / 100) * 100;
        let color = '#dc3545'; // Red for low scores
        if (percentage >= 80) color = '#28a745'; // Green for high scores
        else if (percentage >= 60) color = '#ffc107'; // Yellow for medium scores
        
        return (
          <div style={{ 
            fontWeight: 'bold', 
            fontSize: '1.1em',
            color,
            padding: '4px 8px',
            borderRadius: '4px',
            backgroundColor: `${color}15`
          }}>
            {score}/100
          </div>
        );
      }
    },
    {
      key: 'categoryBreakdown',
      label: 'Category Breakdown',
      priority: 'medium',
      render: (value, row) => (
        <div className="category-breakdown-compact">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', fontSize: '0.8em' }}>
            <span>App: {row.appearanceTotal}/20</span>
            <span>Hand: {row.handlingTotal}/14</span>
            <span>Demo: {row.demonstrationTotal}/16</span>
            <span>Health: {row.healthExaminationTotal}/21</span>
            <span>Groom: {row.groomingCareTotal}/14</span>
            <span>Know: {row.knowledgeTotal}/12</span>
          </div>
        </div>
      ),
      mobileRender: (row) => (
        <div style={{ fontSize: '0.9em' }}>
          <div style={{ fontWeight: '600', marginBottom: '4px' }}>Category Scores:</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2px' }}>
            <span>Appearance: {row.appearanceTotal}/20</span>
            <span>Handling: {row.handlingTotal}/14</span>
            <span>Demo: {row.demonstrationTotal}/16</span>
            <span>Health: {row.healthExaminationTotal}/21</span>
            <span>Grooming: {row.groomingCareTotal}/14</span>
            <span>Knowledge: {row.knowledgeTotal}/12</span>
          </div>
        </div>
      )
    },
    {
      key: 'createdAt',
      label: 'Date',
      sortable: true,
      priority: 'medium',
      render: (value) => {
        const date = new Date(value);
        return (
          <div>
            <div>{date.toLocaleDateString()}</div>
            <div style={{ fontSize: '0.8em', color: '#666' }}>
              {date.toLocaleTimeString()}
            </div>
          </div>
        );
      }
    },
    {
      key: 'isFinalized',
      label: 'Status',
      priority: 'medium',
      align: 'center',
      render: (value) => (
        <span style={{
          padding: '3px 8px',
          borderRadius: '12px',
          fontSize: '0.8em',
          fontWeight: '500',
          backgroundColor: value ? '#d4edda' : '#fff3cd',
          color: value ? '#155724' : '#856404',
          border: `1px solid ${value ? '#c3e6cb' : '#ffeaa7'}`
        }}>
          {value ? '✅ Final' : '📝 Draft'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      priority: 'low',
      align: 'center',
      render: (value, row) => (
        <button
          className="btn btn-sm btn-outline-primary touch-target"
          onClick={() => setSelectedScore(row)}
          style={{ fontSize: '0.85em' }}
        >
          👁️ View Details
        </button>
      )
    }
  ];

  // Render filters
  const renderFilters = () => (
    <div className="table-filters">
      <div className="filters-grid">
        <div className="filter-group">
          <label>Participant:</label>
          <input
            type="text"
            value={filters.participantName}
            onChange={(e) => handleFilterChange('participantName', e.target.value)}
            placeholder="Search by participant name"
            className="filter-input touch-target"
          />
        </div>
        
        <div className="filter-group">
          <label>Judge:</label>
          <input
            type="text"
            value={filters.judge}
            onChange={(e) => handleFilterChange('judge', e.target.value)}
            placeholder="Search by judge"
            className="filter-input touch-target"
          />
        </div>
        
        <div className="filter-group">
          <label>Date From:</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            className="filter-input touch-target"
          />
        </div>
        
        <div className="filter-group">
          <label>Date To:</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            className="filter-input touch-target"
          />
        </div>
        
        <div className="filter-group">
          <label>Min Score:</label>
          <input
            type="number"
            min="0"
            max="100"
            value={filters.scoreMin}
            onChange={(e) => handleFilterChange('scoreMin', e.target.value)}
            placeholder="0"
            className="filter-input touch-target"
          />
        </div>
        
        <div className="filter-group">
          <label>Max Score:</label>
          <input
            type="number"
            min="0"
            max="100"
            value={filters.scoreMax}
            onChange={(e) => handleFilterChange('scoreMax', e.target.value)}
            placeholder="100"
            className="filter-input touch-target"
          />
        </div>
      </div>
      
      <div className="filter-actions">
        <button
          onClick={clearFilters}
          className="btn btn-secondary touch-target"
        >
          Clear All Filters
        </button>
      </div>
    </div>
  );

  // Render score details modal
  const renderScoreDetails = () => {
    if (!selectedScore) return null;

    return (
      <div className="modal-overlay" onClick={() => setSelectedScore(null)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Fit & Show Score Details</h3>
            <button 
              className="modal-close touch-target"
              onClick={() => setSelectedScore(null)}
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
          
          <div className="modal-body">
            <div className="score-details-grid">
              <div className="detail-section">
                <h4>Participant Information</h4>
                <p><strong>Name:</strong> {selectedScore.participantName}</p>
                <p><strong>Judge:</strong> {selectedScore.judgeName}</p>
                <p><strong>Total Score:</strong> {selectedScore.totalScore}/100</p>
                <p><strong>Status:</strong> {selectedScore.isFinalized ? 'Finalized' : 'Draft'}</p>
                <p><strong>Date:</strong> {new Date(selectedScore.createdAt).toLocaleString()}</p>
              </div>
              
              <div className="detail-section">
                <h4>Category Breakdown</h4>
                <div className="category-scores">
                  <div className="score-item">
                    <span>Appearance:</span>
                    <span>{selectedScore.appearanceTotal}/20</span>
                  </div>
                  <div className="score-item">
                    <span>Handling:</span>
                    <span>{selectedScore.handlingTotal}/14</span>
                  </div>
                  <div className="score-item">
                    <span>Demonstration:</span>
                    <span>{selectedScore.demonstrationTotal}/16</span>
                  </div>
                  <div className="score-item">
                    <span>Health Examination:</span>
                    <span>{selectedScore.healthExaminationTotal}/21</span>
                  </div>
                  <div className="score-item">
                    <span>Grooming & Care:</span>
                    <span>{selectedScore.groomingCareTotal}/14</span>
                  </div>
                  <div className="score-item">
                    <span>Knowledge:</span>
                    <span>{selectedScore.knowledgeTotal}/12</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="error-state">
        <div className="error-icon">⚠️</div>
        <h3>Error Loading Fit & Show Scores</h3>
        <p>{error}</p>
        <button className="btn btn-primary touch-target" onClick={fetchFitShowScores}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="enhanced-fit-show-score-reports">
      <div className="reports-header">
        <h2>Fit & Show Scoring Reports</h2>
        <p>View and analyze all fit & show scoring results</p>
      </div>

      {renderFilters()}

      <div className="results-summary">
        <p>
          Showing {paginatedData.length} of {filteredData.length} fit & show scores
          {filteredData.length !== scores.length && 
            ` (filtered from ${scores.length} total)`
          }
        </p>
      </div>

      <ResponsiveDataTable
        data={paginatedData}
        columns={columns}
        loading={loading}
        onSort={handleSort}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        searchable={true}
        pagination={{
          page: currentPage,
          pageSize,
          total: filteredData.length,
          onPageChange: setCurrentPage
        }}
        emptyMessage="No fit & show scores available yet. Start scoring to see results here."
        ariaLabel="Fit & show scoring reports table"
        className="fit-show-score-reports-table"
      />

      {selectedScore && renderScoreDetails()}
    </div>
  );
};

export default EnhancedFitShowScoreReports;