import React, { useState, useEffect, useMemo } from 'react';
import { generateClient } from 'aws-amplify/api';
import ResponsiveDataTable, { TableColumn } from './ResponsiveDataTable';

const client = generateClient();

const listClassScores = `
  query ListClassScores {
    listClassScores {
      items {
        id
        catId
        catName
        owner
        cageNumber
        judgeId
        judgeName
        totalScore
        ribbonEligibility
        createdAt
        updatedAt
        isFinalized
      }
    }
  }
`;

interface ClassScore {
  id: string;
  catId: string;
  catName: string;
  owner: string;
  cageNumber: number;
  judgeId: string;
  judgeName: string;
  totalScore: number;
  ribbonEligibility: string;
  createdAt: string;
  updatedAt: string;
  isFinalized: boolean;
}

interface FilterState {
  catName: string;
  owner: string;
  judge: string;
  ribbonType: string;
  dateFrom: string;
  dateTo: string;
  scoreMin: string;
  scoreMax: string;
}

const EnhancedClassScoreReports: React.FC = () => {
  const [classScores, setClassScores] = useState<ClassScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedScore, setSelectedScore] = useState<ClassScore | null>(null);
  const [sortColumn, setSortColumn] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FilterState>({
    catName: '',
    owner: '',
    judge: '',
    ribbonType: '',
    dateFrom: '',
    dateTo: '',
    scoreMin: '',
    scoreMax: ''
  });
  const pageSize = 10;

  useEffect(() => {
    fetchClassScores();
  }, []);

  const fetchClassScores = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await client.graphql({
        query: listClassScores
      });

      const scoresData = result.data?.listClassScores?.items || [];
      setClassScores(scoresData);
    } catch (error) {
      console.error('Error fetching class scores:', error);
      setError('Failed to load class scores. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter data
  const filteredData = useMemo(() => {
    return classScores.filter(score => {
      // Text filters
      if (filters.catName && !score.catName.toLowerCase().includes(filters.catName.toLowerCase())) {
        return false;
      }
      if (filters.owner && !score.owner.toLowerCase().includes(filters.owner.toLowerCase())) {
        return false;
      }
      if (filters.judge && !score.judgeName.toLowerCase().includes(filters.judge.toLowerCase())) {
        return false;
      }
      if (filters.ribbonType && score.ribbonEligibility !== filters.ribbonType) {
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
  }, [classScores, filters]);

  // Sort data
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let aValue = a[sortColumn as keyof ClassScore];
      let bValue = b[sortColumn as keyof ClassScore];

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
      catName: '',
      owner: '',
      judge: '',
      ribbonType: '',
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

  // Get ribbon color
  const getRibbonColor = (ribbon: string) => {
    switch (ribbon) {
      case 'Blue': return '#0066cc';
      case 'Red': return '#cc0000';
      case 'White': return '#666666';
      case 'Participation': return '#ff9900';
      default: return '#999999';
    }
  };

  // Define table columns
  const columns: TableColumn<ClassScore>[] = [
    {
      key: 'catName',
      label: 'Cat Name',
      sortable: true,
      priority: 'high',
      render: (value) => (
        <strong style={{ fontSize: '1.05em' }}>{value}</strong>
      ),
      mobileRender: (row) => (
        <div>
          <strong style={{ fontSize: '1.1em', color: '#0066cc' }}>
            {row.catName}
          </strong>
          <div style={{ fontSize: '0.9em', color: '#666', marginTop: '2px' }}>
            Cage #{row.cageNumber}
          </div>
        </div>
      )
    },
    {
      key: 'owner',
      label: 'Owner',
      sortable: true,
      priority: 'high',
      render: (value) => value
    },
    {
      key: 'cageNumber',
      label: 'Cage #',
      sortable: true,
      priority: 'medium',
      align: 'center',
      width: '80px',
      render: (value) => (
        <strong style={{ 
          padding: '4px 8px',
          backgroundColor: '#f0f8ff',
          borderRadius: '4px',
          color: '#0066cc'
        }}>
          {value}
        </strong>
      )
    },
    {
      key: 'judgeName',
      label: 'Judge',
      sortable: true,
      priority: 'medium',
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
        const percentage = (score / 50) * 100;
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
            {score}/50
          </div>
        );
      }
    },
    {
      key: 'ribbonEligibility',
      label: 'Ribbon',
      sortable: true,
      priority: 'high',
      align: 'center',
      render: (value) => (
        <span style={{
          padding: '4px 12px',
          borderRadius: '16px',
          fontSize: '0.85em',
          fontWeight: '600',
          color: 'white',
          backgroundColor: getRibbonColor(value),
          textShadow: '0 1px 2px rgba(0,0,0,0.3)'
        }}>
          {value}
        </span>
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
      priority: 'low',
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
          <label>Cat Name:</label>
          <input
            type="text"
            value={filters.catName}
            onChange={(e) => handleFilterChange('catName', e.target.value)}
            placeholder="Search by cat name"
            className="filter-input touch-target"
          />
        </div>
        
        <div className="filter-group">
          <label>Owner:</label>
          <input
            type="text"
            value={filters.owner}
            onChange={(e) => handleFilterChange('owner', e.target.value)}
            placeholder="Search by owner"
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
          <label>Ribbon Type:</label>
          <select
            value={filters.ribbonType}
            onChange={(e) => handleFilterChange('ribbonType', e.target.value)}
            className="filter-select touch-target"
          >
            <option value="">All Ribbons</option>
            <option value="Blue">Blue</option>
            <option value="Red">Red</option>
            <option value="White">White</option>
            <option value="Participation">Participation</option>
          </select>
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
            max="50"
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
            max="50"
            value={filters.scoreMax}
            onChange={(e) => handleFilterChange('scoreMax', e.target.value)}
            placeholder="50"
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
            <h3>Class Score Details</h3>
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
                <h4>Cat Information</h4>
                <p><strong>Name:</strong> {selectedScore.catName}</p>
                <p><strong>Owner:</strong> {selectedScore.owner}</p>
                <p><strong>Cage #:</strong> {selectedScore.cageNumber}</p>
              </div>
              
              <div className="detail-section">
                <h4>Scoring Information</h4>
                <p><strong>Judge:</strong> {selectedScore.judgeName}</p>
                <p><strong>Total Score:</strong> {selectedScore.totalScore}/50</p>
                <p><strong>Ribbon:</strong> 
                  <span style={{
                    marginLeft: '8px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.85em',
                    fontWeight: '600',
                    color: 'white',
                    backgroundColor: getRibbonColor(selectedScore.ribbonEligibility)
                  }}>
                    {selectedScore.ribbonEligibility}
                  </span>
                </p>
                <p><strong>Status:</strong> {selectedScore.isFinalized ? 'Finalized' : 'Draft'}</p>
                <p><strong>Date:</strong> {new Date(selectedScore.createdAt).toLocaleString()}</p>
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
        <h3>Error Loading Class Scores</h3>
        <p>{error}</p>
        <button className="btn btn-primary touch-target" onClick={fetchClassScores}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="enhanced-class-score-reports">
      <div className="reports-header">
        <h2>Class Scoring Reports</h2>
        <p>View and analyze all class scoring results</p>
      </div>

      {renderFilters()}

      <div className="results-summary">
        <p>
          Showing {paginatedData.length} of {filteredData.length} class scores
          {filteredData.length !== classScores.length && 
            ` (filtered from ${classScores.length} total)`
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
        emptyMessage="No class scores available yet. Start scoring to see results here."
        ariaLabel="Class scoring reports table"
        className="class-score-reports-table"
      />

      {selectedScore && renderScoreDetails()}
    </div>
  );
};

export default EnhancedClassScoreReports;