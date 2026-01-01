import React, { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/api';
import { Score } from '../types/scoring';
import { SCORING_CATEGORY_LABELS } from '../utils/scoringConstants';

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

const onScoreUpdate = `
  subscription OnScoreUpdate {
    onScoreUpdate {
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
`;

interface Cat {
  id: string;
  name: string;
  owner: string;
  cageNumber: number;
}

interface ScoreWithCat extends Score {
  cat?: Cat;
}

interface FilterOptions {
  judge: string;
  dateFrom: string;
  dateTo: string;
  scoreMin: number;
  scoreMax: number;
  finalized: string; // 'all', 'finalized', 'draft'
}

interface SortOptions {
  field: 'totalScore' | 'timestamp' | 'judgeName' | 'cageNumber';
  direction: 'asc' | 'desc';
}

const ITEMS_PER_PAGE = 10;

function ScoreReports(): JSX.Element {
  const [scores, setScores] = useState<ScoreWithCat[]>([]);
  const [filteredScores, setFilteredScores] = useState<ScoreWithCat[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [selectedScore, setSelectedScore] = useState<ScoreWithCat | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  
  // Filter state
  const [filters, setFilters] = useState<FilterOptions>({
    judge: '',
    dateFrom: '',
    dateTo: '',
    scoreMin: 0,
    scoreMax: 100,
    finalized: 'all'
  });
  
  // Sort state
  const [sort, setSort] = useState<SortOptions>({
    field: 'totalScore',
    direction: 'desc'
  });

  // Available judges for filter dropdown
  const [judges, setJudges] = useState<string[]>([]);

  useEffect(() => {
    fetchScores();
    
    // Set up real-time subscription for score updates
    console.log('Setting up score subscription...');
    const scoreSubscription = client.graphql({
      query: onScoreUpdate
    }).subscribe({
      next: ({ data }) => {
        console.log('Score update received:', data);
        if (data?.onScoreUpdate) {
          const updatedScore = data.onScoreUpdate;
          
          // Update the scores array with the new/updated score
          setScores(prev => {
            const existingIndex = prev.findIndex(score => score.id === updatedScore.id);
            
            if (existingIndex >= 0) {
              // Update existing score
              const updated = [...prev];
              updated[existingIndex] = { ...updated[existingIndex], ...updatedScore };
              return updated;
            } else {
              // Add new score - fetch cat data for it
              fetchCatDataForScore(updatedScore).then(scoreWithCat => {
                setScores(current => [...current, scoreWithCat]);
              });
              return prev;
            }
          });
        }
      },
      error: (error) => {
        console.error('Score subscription error:', error);
      }
    });

    return () => {
      console.log('Cleaning up score subscription');
      scoreSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [scores, filters, sort]);

  const fetchCatDataForScore = async (score: Score): Promise<ScoreWithCat> => {
    try {
      const catResult = await client.graphql({
        query: getCatById,
        variables: { id: score.catId }
      });
      return {
        ...score,
        cat: catResult.data.getCat
      };
    } catch (err) {
      console.error(`Error fetching cat data for score ${score.id}:`, err);
      return score;
    }
  };

  const fetchScores = async () => {
    try {
      setLoading(true);
      setError('');

      const result = await client.graphql({
        query: listAllScores
      });

      const scoresData = result.data.listAllScores.items;
      
      // Fetch cat data for each score
      const scoresWithCats = await Promise.all(
        scoresData.map(fetchCatDataForScore)
      );

      setScores(scoresWithCats);
      
      // Extract unique judges for filter dropdown
      const uniqueJudges = [...new Set(scoresData.map((score: Score) => score.judgeName))];
      setJudges(uniqueJudges);

    } catch (err) {
      console.error('Error fetching scores:', err);
      setError('Failed to load scoring reports. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...scores];

    // Apply filters
    if (filters.judge) {
      filtered = filtered.filter(score => score.judgeName === filters.judge);
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(score => new Date(score.timestamp) >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(score => new Date(score.timestamp) <= toDate);
    }

    filtered = filtered.filter(score => 
      score.totalScore >= filters.scoreMin && score.totalScore <= filters.scoreMax
    );

    if (filters.finalized !== 'all') {
      const isFinalized = filters.finalized === 'finalized';
      filtered = filtered.filter(score => score.isFinalized === isFinalized);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sort.field) {
        case 'totalScore':
          aValue = a.totalScore;
          bValue = b.totalScore;
          break;
        case 'timestamp':
          aValue = new Date(a.timestamp);
          bValue = new Date(b.timestamp);
          break;
        case 'judgeName':
          aValue = a.judgeName;
          bValue = b.judgeName;
          break;
        case 'cageNumber':
          aValue = a.cat?.cageNumber || 0;
          bValue = b.cat?.cageNumber || 0;
          break;
        default:
          aValue = a.totalScore;
          bValue = b.totalScore;
      }

      if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredScores(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleFilterChange = (field: keyof FilterOptions, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSortChange = (field: SortOptions['field']) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const resetFilters = () => {
    setFilters({
      judge: '',
      dateFrom: '',
      dateTo: '',
      scoreMin: 0,
      scoreMax: 100,
      finalized: 'all'
    });
  };

  const exportToCSV = () => {
    const headers = [
      'Cat Name',
      'Owner',
      'Cage Number',
      'Judge',
      'First Impression Score',
      'First Impression Comments',
      'Originality Score', 
      'Originality Comments',
      'Information Card Score',
      'Information Card Comments',
      'Work Done by Member Score',
      'Work Done by Member Comments',
      'Basic Comfort Score',
      'Basic Comfort Comments',
      'Safety Score',
      'Safety Comments',
      'Easy View of Cat Score',
      'Easy View of Cat Comments',
      'Total Score',
      'Timestamp',
      'Status'
    ];

    const csvData = filteredScores.map(score => [
      score.cat?.name || 'Unknown',
      score.cat?.owner || 'Unknown',
      score.cat?.cageNumber || 'Unknown',
      score.judgeName,
      score.firstImpressionScore,
      `"${(score.firstImpressionComments || '').replace(/"/g, '""')}"`,
      score.originalityScore,
      `"${(score.originalityComments || '').replace(/"/g, '""')}"`,
      score.informationCardScore,
      `"${(score.informationCardComments || '').replace(/"/g, '""')}"`,
      score.workDoneByMemberScore,
      `"${(score.workDoneByMemberComments || '').replace(/"/g, '""')}"`,
      score.basicComfortScore,
      `"${(score.basicComfortComments || '').replace(/"/g, '""')}"`,
      score.safetyScore,
      `"${(score.safetyComments || '').replace(/"/g, '""')}"`,
      score.easyViewOfCatScore,
      `"${(score.easyViewOfCatComments || '').replace(/"/g, '""')}"`,
      score.totalScore,
      new Date(score.timestamp).toLocaleString(),
      score.isFinalized ? 'Finalized' : 'Draft'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `score-reports-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pagination
  const totalPages = Math.ceil(filteredScores.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentScores = filteredScores.slice(startIndex, endIndex);

  const getSortIcon = (field: SortOptions['field']) => {
    if (sort.field !== field) return '↕️';
    return sort.direction === 'desc' ? '↓' : '↑';
  };

  if (loading) {
    return (
      <div className="cat-card">
        <h2>📊 Loading Score Reports...</h2>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '2rem' }}>🐱</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cat-card">
        <h2>❌ Error Loading Reports</h2>
        <p style={{ color: 'red' }}>{error}</p>
        <button className="btn btn-primary" onClick={fetchScores}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="cat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>📊 Score Reports ({filteredScores.length} scores)</h2>
        <button 
          className="btn btn-success"
          onClick={exportToCSV}
          disabled={filteredScores.length === 0}
        >
          📥 Export CSV
        </button>
      </div>

      {/* Filters Section */}
      <div className="filters-section" style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '15px', 
        borderRadius: '5px', 
        marginBottom: '20px' 
      }}>
        <h4>🔍 Filters</h4>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '15px',
          marginTop: '10px'
        }}>
          <div>
            <label>Judge:</label>
            <select
              value={filters.judge}
              onChange={(e) => handleFilterChange('judge', e.target.value)}
              style={{ width: '100%', padding: '5px', marginTop: '5px' }}
            >
              <option value="">All Judges</option>
              {judges.map(judge => (
                <option key={judge} value={judge}>{judge}</option>
              ))}
            </select>
          </div>

          <div>
            <label>Date From:</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              style={{ width: '100%', padding: '5px', marginTop: '5px' }}
            />
          </div>

          <div>
            <label>Date To:</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              style={{ width: '100%', padding: '5px', marginTop: '5px' }}
            />
          </div>

          <div>
            <label>Min Score:</label>
            <input
              type="number"
              min="0"
              max="100"
              value={filters.scoreMin}
              onChange={(e) => handleFilterChange('scoreMin', parseInt(e.target.value) || 0)}
              style={{ width: '100%', padding: '5px', marginTop: '5px' }}
            />
          </div>

          <div>
            <label>Max Score:</label>
            <input
              type="number"
              min="0"
              max="100"
              value={filters.scoreMax}
              onChange={(e) => handleFilterChange('scoreMax', parseInt(e.target.value) || 100)}
              style={{ width: '100%', padding: '5px', marginTop: '5px' }}
            />
          </div>

          <div>
            <label>Status:</label>
            <select
              value={filters.finalized}
              onChange={(e) => handleFilterChange('finalized', e.target.value)}
              style={{ width: '100%', padding: '5px', marginTop: '5px' }}
            >
              <option value="all">All Scores</option>
              <option value="finalized">Finalized Only</option>
              <option value="draft">Drafts Only</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: '15px' }}>
          <button className="btn btn-secondary" onClick={resetFilters}>
            🔄 Reset Filters
          </button>
        </div>
      </div>

      {/* Results Summary */}
      <div style={{ marginBottom: '15px', fontSize: '0.9em', color: '#666' }}>
        Showing {currentScores.length} of {filteredScores.length} scores 
        (Page {currentPage} of {totalPages})
      </div>

      {/* Scores Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
          <thead>
            <tr style={{ backgroundColor: '#e9ecef' }}>
              <th 
                style={{ padding: '10px', border: '1px solid #ddd', cursor: 'pointer' }}
                onClick={() => handleSortChange('cageNumber')}
              >
                Cage {getSortIcon('cageNumber')}
              </th>
              <th style={{ padding: '10px', border: '1px solid #ddd' }}>Cat</th>
              <th 
                style={{ padding: '10px', border: '1px solid #ddd', cursor: 'pointer' }}
                onClick={() => handleSortChange('judgeName')}
              >
                Judge {getSortIcon('judgeName')}
              </th>
              <th 
                style={{ padding: '10px', border: '1px solid #ddd', cursor: 'pointer' }}
                onClick={() => handleSortChange('totalScore')}
              >
                Total Score {getSortIcon('totalScore')}
              </th>
              <th 
                style={{ padding: '10px', border: '1px solid #ddd', cursor: 'pointer' }}
                onClick={() => handleSortChange('timestamp')}
              >
                Date {getSortIcon('timestamp')}
              </th>
              <th style={{ padding: '10px', border: '1px solid #ddd' }}>Status</th>
              <th style={{ padding: '10px', border: '1px solid #ddd' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentScores.map((score) => (
              <tr key={score.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>
                  <strong>{score.cat?.cageNumber || 'N/A'}</strong>
                </td>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                  <div><strong>{score.cat?.name || 'Unknown'}</strong></div>
                  <div style={{ fontSize: '0.8em', color: '#666' }}>
                    {score.cat?.owner || 'Unknown'}
                  </div>
                </td>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                  {score.judgeName}
                </td>
                <td style={{ 
                  padding: '10px', 
                  border: '1px solid #ddd', 
                  textAlign: 'center',
                  fontWeight: 'bold',
                  color: score.totalScore >= 80 ? '#28a745' : score.totalScore >= 60 ? '#ffc107' : '#dc3545'
                }}>
                  {score.totalScore}/100
                </td>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                  {new Date(score.timestamp).toLocaleDateString()}
                  <div style={{ fontSize: '0.8em', color: '#666' }}>
                    {new Date(score.timestamp).toLocaleTimeString()}
                  </div>
                </td>
                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '12px',
                    fontSize: '0.8em',
                    backgroundColor: score.isFinalized ? '#d4edda' : '#fff3cd',
                    color: score.isFinalized ? '#155724' : '#856404',
                    border: `1px solid ${score.isFinalized ? '#c3e6cb' : '#ffeaa7'}`
                  }}>
                    {score.isFinalized ? '✅ Final' : '📝 Draft'}
                  </span>
                </td>
                <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => setSelectedScore(score)}
                    style={{ fontSize: '0.8em' }}
                  >
                    👁️ View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredScores.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📊</div>
          <p>No scores found matching your filters.</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          gap: '10px',
          marginTop: '20px' 
        }}>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            ← Previous
          </button>
          
          <span style={{ margin: '0 15px' }}>
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next →
          </button>
        </div>
      )}

      {/* Score Detail Modal */}
      {selectedScore && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '10px',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflowY: 'auto',
            width: '90%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>📋 Score Details</h3>
              <button
                onClick={() => setSelectedScore(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            {/* Cat Information */}
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
              <h4>🐱 Cat Information</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                <div><strong>Name:</strong> {selectedScore.cat?.name || 'Unknown'}</div>
                <div><strong>Owner:</strong> {selectedScore.cat?.owner || 'Unknown'}</div>
                <div><strong>Cage:</strong> {selectedScore.cat?.cageNumber || 'N/A'}</div>
              </div>
            </div>

            {/* Judge Information */}
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '5px' }}>
              <h4>👨‍⚖️ Judge Information</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                <div><strong>Judge:</strong> {selectedScore.judgeName}</div>
                <div><strong>Date:</strong> {new Date(selectedScore.timestamp).toLocaleDateString()}</div>
                <div><strong>Time:</strong> {new Date(selectedScore.timestamp).toLocaleTimeString()}</div>
                <div><strong>Status:</strong> {selectedScore.isFinalized ? '✅ Finalized' : '📝 Draft'}</div>
              </div>
            </div>

            {/* Score Breakdown */}
            <div style={{ marginBottom: '20px' }}>
              <h4>🏆 Score Breakdown</h4>
              <div style={{ display: 'grid', gap: '15px' }}>
                {Object.entries(SCORING_CATEGORY_LABELS).map(([key, label]) => {
                  const scoreField = `${key}Score` as keyof Score;
                  const commentField = `${key}Comments` as keyof Score;
                  const score = selectedScore[scoreField] as number;
                  const comments = selectedScore[commentField] as string;
                  
                  // Get max points for this category
                  const maxPoints = key === 'firstImpression' ? 10 : 15;

                  return (
                    <div key={key} style={{ 
                      padding: '10px', 
                      border: '1px solid #ddd', 
                      borderRadius: '5px' 
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <strong>{label}</strong>
                        <span style={{ 
                          fontWeight: 'bold',
                          color: score >= (maxPoints * 0.8) ? '#28a745' : score >= (maxPoints * 0.6) ? '#ffc107' : '#dc3545'
                        }}>
                          {score}/{maxPoints}
                        </span>
                      </div>
                      {comments && (
                        <div style={{ 
                          fontSize: '0.9em', 
                          color: '#666', 
                          fontStyle: 'italic',
                          marginTop: '5px',
                          padding: '8px',
                          backgroundColor: '#f8f9fa',
                          borderRadius: '3px'
                        }}>
                          "{comments}"
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Total Score */}
              <div style={{ 
                marginTop: '15px', 
                padding: '15px', 
                backgroundColor: '#e8f5e8', 
                borderRadius: '5px',
                textAlign: 'center'
              }}>
                <h3 style={{ margin: 0, color: '#28a745' }}>
                  Total Score: {selectedScore.totalScore}/100
                </h3>
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setSelectedScore(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScoreReports;