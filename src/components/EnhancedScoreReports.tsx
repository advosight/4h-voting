import React, { useState, useEffect, useMemo } from 'react';
import { generateClient } from 'aws-amplify/api';
import { Score } from '../types/scoring';
import { SCORING_CATEGORY_LABELS } from '../utils/scoringConstants';
import ResponsiveDataTable, { TableColumn } from './ResponsiveDataTable';

const client = generateClient();

const listAllScores = `
  query ListAllScores {
    listAllScores {
      items {
        id
        catId
        judgeId
        judgeName
        firstImpressionScore
        firstImpressionComments
        originalityScore
        originalityComments
        informationCardScore
        informationCardComments
        workDoneByMemberScore
        workDoneByMemberComments
        basicComfortScore
        basicComfortComments
        safetyScore
        safetyComments
        easyViewOfCatScore
        easyViewOfCatComments
        totalScore
        timestamp
        isFinalized
      }
    }
  }
`;

const getCatById = `
  query GetCat($id: ID!) {
    getCat(id: $id) {
      id
      name
      owner
      cageNumber
    }
  }
`;

interface EnhancedScore extends Score {
  cat?: {
    id: string;
    name: string;
    owner: string;
    cageNumber: number;
  };
}

const EnhancedScoreReports: React.FC = () => {
  const [scores, setScores] = useState<EnhancedScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedScore, setSelectedScore] = useState<EnhancedScore | null>(null);
  const [sortColumn, setSortColumn] = useState<string>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    fetchScores();
  }, []);

  const fetchScores = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await client.graphql({
        query: listAllScores
      });

      const scoresData = result.data?.listAllScores?.items || [];
      
      // Fetch cat details for each score
      const scoresWithCats = await Promise.all(
        scoresData.map(async (score) => {
          try {
            const catResult = await client.graphql({
              query: getCatById,
              variables: { id: score.catId }
            });
            
            return {
              ...score,
              cat: catResult.data?.getCat || null
            };
          } catch (error) {
            console.error('Error fetching cat details:', error);
            return { ...score, cat: null };
          }
        })
      );

      setScores(scoresWithCats);
    } catch (error) {
      console.error('Error fetching scores:', error);
      setError('Failed to load scores. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Define table columns
  const columns: TableColumn<EnhancedScore>[] = [
    {
      key: 'cageNumber',
      label: 'Cage #',
      sortable: true,
      priority: 'high',
      align: 'center',
      width: '80px',
      render: (value, row) => (
        <strong style={{ fontSize: '1.1em' }}>
          {row.cat?.cageNumber || 'N/A'}
        </strong>
      ),
      mobileRender: (row) => (
        <strong style={{ fontSize: '1.2em', color: '#0066cc' }}>
          Cage #{row.cat?.cageNumber || 'N/A'}
        </strong>
      )
    },
    {
      key: 'catName',
      label: 'Cat',
      sortable: true,
      priority: 'high',
      render: (value, row) => (
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
            {row.cat?.name || 'Unknown'}
          </div>
          <div style={{ fontSize: '0.85em', color: '#666' }}>
            {row.cat?.owner || 'Unknown'}
          </div>
        </div>
      ),
      mobileRender: (row) => (
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
            {row.cat?.name || 'Unknown'}
          </div>
          <div style={{ fontSize: '0.9em', color: '#666' }}>
            Owner: {row.cat?.owner || 'Unknown'}
          </div>
        </div>
      )
    },
    {
      key: 'judgeName',
      label: 'Judge',
      sortable: true,
      priority: 'medium',
      render: (value) => value || 'Unknown'
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
        const color = score >= 80 ? '#28a745' : score >= 60 ? '#ffc107' : '#dc3545';
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
      key: 'timestamp',
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
          padding: '4px 8px',
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

  // Sort data
  const sortedData = useMemo(() => {
    const sorted = [...scores].sort((a, b) => {
      let aValue = a[sortColumn as keyof EnhancedScore];
      let bValue = b[sortColumn as keyof EnhancedScore];

      // Handle special cases
      if (sortColumn === 'cageNumber') {
        aValue = a.cat?.cageNumber || 0;
        bValue = b.cat?.cageNumber || 0;
      } else if (sortColumn === 'catName') {
        aValue = a.cat?.name || '';
        bValue = b.cat?.name || '';
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [scores, sortColumn, sortDirection]);

  // Handle sort
  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    setSortColumn(column);
    setSortDirection(direction);
  };

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Render score details modal
  const renderScoreDetails = () => {
    if (!selectedScore) return null;

    return (
      <div className="modal-overlay" onClick={() => setSelectedScore(null)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Score Details</h3>
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
                <p><strong>Name:</strong> {selectedScore.cat?.name || 'Unknown'}</p>
                <p><strong>Owner:</strong> {selectedScore.cat?.owner || 'Unknown'}</p>
                <p><strong>Cage #:</strong> {selectedScore.cat?.cageNumber || 'N/A'}</p>
              </div>
              
              <div className="detail-section">
                <h4>Scoring Information</h4>
                <p><strong>Judge:</strong> {selectedScore.judgeName}</p>
                <p><strong>Total Score:</strong> {selectedScore.totalScore}/100</p>
                <p><strong>Status:</strong> {selectedScore.isFinalized ? 'Finalized' : 'Draft'}</p>
                <p><strong>Date:</strong> {new Date(selectedScore.timestamp).toLocaleString()}</p>
              </div>
              
              <div className="detail-section">
                <h4>Category Breakdown</h4>
                <div className="category-scores">
                  <div className="score-item">
                    <span>First Impression:</span>
                    <span>{selectedScore.firstImpressionScore || 0}/15</span>
                  </div>
                  <div className="score-item">
                    <span>Originality:</span>
                    <span>{selectedScore.originalityScore || 0}/15</span>
                  </div>
                  <div className="score-item">
                    <span>Information Card:</span>
                    <span>{selectedScore.informationCardScore || 0}/15</span>
                  </div>
                  <div className="score-item">
                    <span>Work Done by Member:</span>
                    <span>{selectedScore.workDoneByMemberScore || 0}/15</span>
                  </div>
                  <div className="score-item">
                    <span>Basic Comfort:</span>
                    <span>{selectedScore.basicComfortScore || 0}/15</span>
                  </div>
                  <div className="score-item">
                    <span>Safety:</span>
                    <span>{selectedScore.safetyScore || 0}/15</span>
                  </div>
                  <div className="score-item">
                    <span>Easy View of Cat:</span>
                    <span>{selectedScore.easyViewOfCatScore || 0}/10</span>
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
        <h3>Error Loading Scores</h3>
        <p>{error}</p>
        <button className="btn btn-primary touch-target" onClick={fetchScores}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="enhanced-score-reports">
      <div className="reports-header">
        <h2>Cage Scoring Reports</h2>
        <p>View and analyze all cage scoring results</p>
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
          total: sortedData.length,
          onPageChange: setCurrentPage
        }}
        emptyMessage="No scores available yet. Start scoring to see results here."
        ariaLabel="Cage scoring reports table"
        className="score-reports-table"
      />

      {selectedScore && renderScoreDetails()}
    </div>
  );
};

export default EnhancedScoreReports;