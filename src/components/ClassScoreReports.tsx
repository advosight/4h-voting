import React, { useState, useEffect, useMemo } from 'react';
import { generateClient } from 'aws-amplify/api';
import { GraphQLResult } from '@aws-amplify/api-graphql';

const client = generateClient();

interface ClassScore {
  id: string;
  catId: string;
  judgeId: string;
  judgeName: string;
  beautyScore: number;
  beautyComments?: string;
  personalityScore: number;
  personalityComments?: string;
  balanceProportionScore: number;
  balanceProportionComments?: string;
  coatCleanGroomed: boolean;
  teethGumsHealthy: boolean;
  eyesNoseClear: boolean;
  earsCleanMiteFree: boolean;
  toenailsClipped: boolean;
  fleaIssues: boolean;
  healthGroomingComments?: string;
  totalScore: number;
  ribbonEligibility: string;
  timestamp: string;
  isFinalized: boolean;
  cat?: {
    id: string;
    name: string;
    owner: string;
    cageNumber: number;
  };
}

interface ClassScoreConnection {
  items: ClassScore[];
}

interface FilterState {
  judge: string;
  dateFrom: string;
  dateTo: string;
  scoreMin: string;
  scoreMax: string;
  ribbonType: string;
  searchTerm: string;
}

interface SortConfig {
  key: keyof ClassScore | 'catName' | 'owner' | 'cageNumber';
  direction: 'asc' | 'desc';
}

const LIST_ALL_CLASS_SCORES = `
  query ListAllClassScores {
    listAllClassScores {
      items {
        id
        catId
        judgeId
        judgeName
        beautyScore
        beautyComments
        personalityScore
        personalityComments
        balanceProportionScore
        balanceProportionComments
        coatCleanGroomed
        teethGumsHealthy
        eyesNoseClear
        earsCleanMiteFree
        toenailsClipped
        fleaIssues
        healthGroomingComments
        totalScore
        ribbonEligibility
        timestamp
        isFinalized
        cat {
          id
          name
          owner
          cageNumber
        }
      }
    }
  }
`;

const ITEMS_PER_PAGE = 20;

export const ClassScoreReports: React.FC = () => {
  const [classScores, setClassScores] = useState<ClassScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedScore, setSelectedScore] = useState<ClassScore | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  const [filters, setFilters] = useState<FilterState>({
    judge: '',
    dateFrom: '',
    dateTo: '',
    scoreMin: '',
    scoreMax: '',
    ribbonType: '',
    searchTerm: ''
  });

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'totalScore',
    direction: 'desc'
  });

  useEffect(() => {
    fetchClassScores();
    
    // Set up real-time subscription for class score updates
    console.log('Setting up class score reports subscription...');
    const classScoreSubscription = client.graphql({
      query: `
        subscription OnClassScoreUpdate {
          onClassScoreUpdate {
            id
            catId
            judgeId
            judgeName
            beautyScore
            beautyComments
            personalityScore
            personalityComments
            balanceProportionScore
            balanceProportionComments
            coatCleanGroomed
            teethGumsHealthy
            eyesNoseClear
            earsCleanMiteFree
            toenailsClipped
            fleaIssues
            healthGroomingComments
            totalScore
            ribbonEligibility
            timestamp
            isFinalized
          }
        }
      `
    }).subscribe({
      next: ({ data }) => {
        console.log('Class score reports update received:', data);
        if (data?.onClassScoreUpdate) {
          updateClassScoreInReports(data.onClassScoreUpdate);
        }
      },
      error: (error) => {
        console.error('Class score reports subscription error:', error);
      }
    });

    return () => {
      console.log('Cleaning up class score reports subscription');
      classScoreSubscription.unsubscribe();
    };
  }, []);

  const fetchClassScores = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await client.graphql({
        query: LIST_ALL_CLASS_SCORES
      }) as GraphQLResult<{
        listAllClassScores: ClassScoreConnection;
      }>;

      if (result.data?.listAllClassScores?.items) {
        setClassScores(result.data.listAllClassScores.items);
      }
    } catch (err) {
      console.error('Error fetching class scores:', err);
      setError('Failed to load class scores. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateClassScoreInReports = async (updatedScore: any) => {
    try {
      // Fetch cat data if not already present
      let catData = null;
      if (updatedScore.catId) {
        const catResult = await client.graphql({
          query: `
            query GetCat($id: ID!) {
              getCat(id: $id) {
                id
                name
                owner
                cageNumber
              }
            }
          `,
          variables: { id: updatedScore.catId }
        });
        catData = catResult.data?.getCat;
      }

      const scoreWithCat = {
        ...updatedScore,
        cat: catData
      };

      setClassScores(prev => {
        const existingIndex = prev.findIndex(score => score.id === updatedScore.id);
        
        if (existingIndex >= 0) {
          // Update existing score
          const updated = [...prev];
          updated[existingIndex] = scoreWithCat;
          return updated;
        } else {
          // Add new score
          return [scoreWithCat, ...prev];
        }
      });

      // Update selected score if it's the one being updated
      if (selectedScore && selectedScore.id === updatedScore.id) {
        setSelectedScore(scoreWithCat);
      }
    } catch (error) {
      console.error('Error updating class score in reports:', error);
    }
  };

  const filteredAndSortedScores = useMemo(() => {
    let filtered = classScores.filter(score => {
      // Judge filter
      if (filters.judge && !score.judgeName.toLowerCase().includes(filters.judge.toLowerCase())) {
        return false;
      }

      // Date range filter
      if (filters.dateFrom) {
        const scoreDate = new Date(score.timestamp);
        const fromDate = new Date(filters.dateFrom);
        if (scoreDate < fromDate) return false;
      }
      
      if (filters.dateTo) {
        const scoreDate = new Date(score.timestamp);
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        if (scoreDate > toDate) return false;
      }

      // Score range filter
      if (filters.scoreMin && score.totalScore < parseInt(filters.scoreMin)) {
        return false;
      }
      
      if (filters.scoreMax && score.totalScore > parseInt(filters.scoreMax)) {
        return false;
      }

      // Ribbon type filter
      if (filters.ribbonType && score.ribbonEligibility !== filters.ribbonType) {
        return false;
      }

      // Search term filter (cat name, owner, cage number)
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const catName = score.cat?.name?.toLowerCase() || '';
        const owner = score.cat?.owner?.toLowerCase() || '';
        const cageNumber = score.cat?.cageNumber?.toString() || '';
        
        if (!catName.includes(searchLower) && 
            !owner.includes(searchLower) && 
            !cageNumber.includes(searchLower)) {
          return false;
        }
      }

      return true;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.key) {
        case 'catName':
          aValue = a.cat?.name || '';
          bValue = b.cat?.name || '';
          break;
        case 'owner':
          aValue = a.cat?.owner || '';
          bValue = b.cat?.owner || '';
          break;
        case 'cageNumber':
          aValue = a.cat?.cageNumber || 0;
          bValue = b.cat?.cageNumber || 0;
          break;
        default:
          aValue = a[sortConfig.key as keyof ClassScore];
          bValue = b[sortConfig.key as keyof ClassScore];
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  }, [classScores, filters, sortConfig]);

  const paginatedScores = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedScores.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedScores, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedScores.length / ITEMS_PER_PAGE);

  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setCurrentPage(1); // Reset to first page when sorting
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({
      judge: '',
      dateFrom: '',
      dateTo: '',
      scoreMin: '',
      scoreMax: '',
      ribbonType: '',
      searchTerm: ''
    });
    setCurrentPage(1);
  };

  const exportToCSV = () => {
    const headers = [
      'Cat Name',
      'Owner',
      'Cage Number',
      'Judge',
      'Beauty Score',
      'Beauty Comments',
      'Personality Score', 
      'Personality Comments',
      'Balance/Proportion Score',
      'Balance/Proportion Comments',
      'Total Score',
      'Coat Clean/Groomed',
      'Teeth/Gums Healthy',
      'Eyes/Nose Clear',
      'Ears Clean/Mite Free',
      'Toenails Clipped',
      'Flea Issues',
      'Health/Grooming Comments',
      'Ribbon Eligibility',
      'Timestamp',
      'Finalized'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredAndSortedScores.map(score => [
        `"${score.cat?.name || ''}"`,
        `"${score.cat?.owner || ''}"`,
        score.cat?.cageNumber || '',
        `"${score.judgeName}"`,
        score.beautyScore,
        `"${score.beautyComments || ''}"`,
        score.personalityScore,
        `"${score.personalityComments || ''}"`,
        score.balanceProportionScore,
        `"${score.balanceProportionComments || ''}"`,
        score.totalScore,
        score.coatCleanGroomed ? 'Yes' : 'No',
        score.teethGumsHealthy ? 'Yes' : 'No',
        score.eyesNoseClear ? 'Yes' : 'No',
        score.earsCleanMiteFree ? 'Yes' : 'No',
        score.toenailsClipped ? 'Yes' : 'No',
        score.fleaIssues ? 'Yes' : 'No',
        `"${score.healthGroomingComments || ''}"`,
        score.ribbonEligibility,
        new Date(score.timestamp).toLocaleString(),
        score.isFinalized ? 'Yes' : 'No'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `class-scores-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getRibbonColor = (ribbon: string) => {
    switch (ribbon) {
      case 'Blue': return '#0066cc';
      case 'Red': return '#cc0000';
      case 'White': return '#666666';
      case 'Participation': return '#999999';
      default: return '#333333';
    }
  };

  const SortIcon: React.FC<{ column: SortConfig['key'] }> = ({ column }) => {
    if (sortConfig.key !== column) {
      return <span style={{ color: '#ccc' }}>↕</span>;
    }
    return <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading class scores...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: '#cc0000' }}>
        <div>{error}</div>
        <button onClick={fetchClassScores} style={{ marginTop: '10px' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        borderBottom: '3px solid #0066cc',
        paddingBottom: '10px'
      }}>
        <h2 style={{ color: '#0066cc', margin: 0 }}>Class Score Reports</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={exportToCSV}
            style={{
              padding: '8px 16px',
              backgroundColor: '#0066cc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            disabled={filteredAndSortedScores.length === 0}
          >
            Export CSV ({filteredAndSortedScores.length} records)
          </button>
          <button
            onClick={fetchClassScores}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '15px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        border: '1px solid #dee2e6'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Search:</label>
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
              placeholder="Cat name, owner, or cage #"
              style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Judge:</label>
            <input
              type="text"
              value={filters.judge}
              onChange={(e) => handleFilterChange('judge', e.target.value)}
              placeholder="Judge name"
              style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Ribbon Type:</label>
            <select
              value={filters.ribbonType}
              onChange={(e) => handleFilterChange('ribbonType', e.target.value)}
              style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
            >
              <option value="">All Ribbons</option>
              <option value="Blue">Blue</option>
              <option value="Red">Red</option>
              <option value="White">White</option>
              <option value="Participation">Participation</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Date From:</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Date To:</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Min Score:</label>
            <input
              type="number"
              min="0"
              max="50"
              value={filters.scoreMin}
              onChange={(e) => handleFilterChange('scoreMin', e.target.value)}
              placeholder="0"
              style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Max Score:</label>
            <input
              type="number"
              min="0"
              max="50"
              value={filters.scoreMax}
              onChange={(e) => handleFilterChange('scoreMax', e.target.value)}
              placeholder="50"
              style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'end' }}>
            <button
              onClick={clearFilters}
              style={{
                padding: '6px 12px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div style={{ marginBottom: '15px', color: '#666' }}>
        Showing {paginatedScores.length} of {filteredAndSortedScores.length} class scores
        {filteredAndSortedScores.length !== classScores.length && ` (filtered from ${classScores.length} total)`}
      </div>

      {/* Scores Table */}
      <div style={{ overflowX: 'auto', border: '1px solid #dee2e6', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
          <thead style={{ backgroundColor: '#e3f2fd' }}>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #0066cc', cursor: 'pointer' }}
                  onClick={() => handleSort('catName')}>
                Cat Name <SortIcon column="catName" />
              </th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #0066cc', cursor: 'pointer' }}
                  onClick={() => handleSort('owner')}>
                Owner <SortIcon column="owner" />
              </th>
              <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #0066cc', cursor: 'pointer' }}
                  onClick={() => handleSort('cageNumber')}>
                Cage # <SortIcon column="cageNumber" />
              </th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #0066cc', cursor: 'pointer' }}
                  onClick={() => handleSort('judgeName')}>
                Judge <SortIcon column="judgeName" />
              </th>
              <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #0066cc', cursor: 'pointer' }}
                  onClick={() => handleSort('totalScore')}>
                Total Score <SortIcon column="totalScore" />
              </th>
              <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #0066cc', cursor: 'pointer' }}
                  onClick={() => handleSort('ribbonEligibility')}>
                Ribbon <SortIcon column="ribbonEligibility" />
              </th>
              <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #0066cc', cursor: 'pointer' }}
                  onClick={() => handleSort('timestamp')}>
                Date <SortIcon column="timestamp" />
              </th>
              <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #0066cc', cursor: 'pointer' }}
                  onClick={() => handleSort('isFinalized')}>
                Status <SortIcon column="isFinalized" />
              </th>
              <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #0066cc' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedScores.map((score, index) => (
              <tr key={score.id} style={{ 
                backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white',
                borderBottom: '1px solid #dee2e6'
              }}>
                <td style={{ padding: '10px', fontWeight: 'bold' }}>
                  {score.cat?.name || 'Unknown'}
                </td>
                <td style={{ padding: '10px' }}>
                  {score.cat?.owner || 'Unknown'}
                </td>
                <td style={{ padding: '10px', textAlign: 'center' }}>
                  {score.cat?.cageNumber || 'N/A'}
                </td>
                <td style={{ padding: '10px' }}>
                  {score.judgeName}
                </td>
                <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', fontSize: '16px' }}>
                  {score.totalScore}/50
                </td>
                <td style={{ padding: '10px', textAlign: 'center' }}>
                  <span style={{ 
                    color: getRibbonColor(score.ribbonEligibility),
                    fontWeight: 'bold',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: `${getRibbonColor(score.ribbonEligibility)}20`
                  }}>
                    {score.ribbonEligibility}
                  </span>
                </td>
                <td style={{ padding: '10px', textAlign: 'center' }}>
                  {new Date(score.timestamp).toLocaleDateString()}
                </td>
                <td style={{ padding: '10px', textAlign: 'center' }}>
                  <span style={{ 
                    color: score.isFinalized ? '#28a745' : '#ffc107',
                    fontWeight: 'bold'
                  }}>
                    {score.isFinalized ? 'Final' : 'Draft'}
                  </span>
                </td>
                <td style={{ padding: '10px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                    <button
                      onClick={() => setSelectedScore(score)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#0066cc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => window.open(`/admin/class-score/${score.id}`, '_blank')}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Manage
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '8px 12px',
              backgroundColor: currentPage === 1 ? '#ccc' : '#0066cc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            Previous
          </button>
          
          <span style={{ margin: '0 15px' }}>
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: '8px 12px',
              backgroundColor: currentPage === totalPages ? '#ccc' : '#0066cc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
            }}
          >
            Next
          </button>
        </div>
      )}

      {/* No Results */}
      {filteredAndSortedScores.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          color: '#666',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          marginTop: '20px'
        }}>
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>No class scores found</div>
          <div>Try adjusting your filters or check back later.</div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedScore && (
        <ClassScoreDetailModal 
          score={selectedScore} 
          onClose={() => setSelectedScore(null)} 
        />
      )}
    </div>
  );
};

// Detail Modal Component
interface ClassScoreDetailModalProps {
  score: ClassScore;
  onClose: () => void;
}

const ClassScoreDetailModal: React.FC<ClassScoreDetailModalProps> = ({ score, onClose }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflowY: 'auto',
        margin: '20px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px',
          borderBottom: '2px solid #0066cc',
          paddingBottom: '10px'
        }}>
          <h3 style={{ color: '#0066cc', margin: 0 }}>Class Score Details</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>

        {/* Cat Information */}
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <h4 style={{ color: '#0066cc', marginTop: 0 }}>Cat Information</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
            <div><strong>Name:</strong> {score.cat?.name || 'Unknown'}</div>
            <div><strong>Owner:</strong> {score.cat?.owner || 'Unknown'}</div>
            <div><strong>Cage Number:</strong> {score.cat?.cageNumber || 'N/A'}</div>
            <div><strong>Judge:</strong> {score.judgeName}</div>
          </div>
        </div>

        {/* Scoring Details */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ color: '#0066cc' }}>Scoring Breakdown</h4>
          <div style={{ display: 'grid', gap: '15px' }}>
            
            {/* Beauty Score */}
            <div style={{ padding: '10px', border: '1px solid #dee2e6', borderRadius: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <strong>Cat's Beauty</strong>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#0066cc' }}>
                  {score.beautyScore}/15
                </span>
              </div>
              {score.beautyComments && (
                <div style={{ color: '#666', fontStyle: 'italic' }}>
                  "{score.beautyComments}"
                </div>
              )}
            </div>

            {/* Personality Score */}
            <div style={{ padding: '10px', border: '1px solid #dee2e6', borderRadius: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <strong>Cat's Personality</strong>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#0066cc' }}>
                  {score.personalityScore}/20
                </span>
              </div>
              {score.personalityComments && (
                <div style={{ color: '#666', fontStyle: 'italic' }}>
                  "{score.personalityComments}"
                </div>
              )}
            </div>

            {/* Balance/Proportion Score */}
            <div style={{ padding: '10px', border: '1px solid #dee2e6', borderRadius: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <strong>Balance/Proportion</strong>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#0066cc' }}>
                  {score.balanceProportionScore}/15
                </span>
              </div>
              {score.balanceProportionComments && (
                <div style={{ color: '#666', fontStyle: 'italic' }}>
                  "{score.balanceProportionComments}"
                </div>
              )}
            </div>

            {/* Total Score */}
            <div style={{ 
              padding: '15px', 
              backgroundColor: '#e3f2fd', 
              borderRadius: '6px',
              border: '2px solid #0066cc'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '18px' }}>Total Score</strong>
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#0066cc' }}>
                  {score.totalScore}/50
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Health & Grooming */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ color: '#0066cc' }}>Health & Grooming Evaluation</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: score.coatCleanGroomed ? '#28a745' : '#dc3545', fontSize: '18px' }}>
                {score.coatCleanGroomed ? '✓' : '✗'}
              </span>
              <span>Coat is clean & well groomed</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: score.teethGumsHealthy ? '#28a745' : '#dc3545', fontSize: '18px' }}>
                {score.teethGumsHealthy ? '✓' : '✗'}
              </span>
              <span>Teeth/gums clean & healthy</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: score.eyesNoseClear ? '#28a745' : '#dc3545', fontSize: '18px' }}>
                {score.eyesNoseClear ? '✓' : '✗'}
              </span>
              <span>Eyes & nose clear</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: score.earsCleanMiteFree ? '#28a745' : '#dc3545', fontSize: '18px' }}>
                {score.earsCleanMiteFree ? '✓' : '✗'}
              </span>
              <span>Ears clean & free of mites</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: score.toenailsClipped ? '#28a745' : '#dc3545', fontSize: '18px' }}>
                {score.toenailsClipped ? '✓' : '✗'}
              </span>
              <span>Toenails/claws clipped</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: score.fleaIssues ? '#dc3545' : '#28a745', fontSize: '18px' }}>
                {score.fleaIssues ? '⚠' : '✓'}
              </span>
              <span>Flea issues detected</span>
            </div>
          </div>
          
          {score.healthGroomingComments && (
            <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
              <strong>Health/Grooming Comments:</strong>
              <div style={{ marginTop: '5px', fontStyle: 'italic' }}>
                "{score.healthGroomingComments}"
              </div>
            </div>
          )}
        </div>

        {/* Ribbon & Status */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ color: '#0066cc' }}>Results</h4>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div>
              <strong>Ribbon Eligibility:</strong>
              <div style={{ 
                marginTop: '5px',
                padding: '8px 16px',
                borderRadius: '6px',
                backgroundColor: `${getRibbonColor(score.ribbonEligibility)}20`,
                color: getRibbonColor(score.ribbonEligibility),
                fontWeight: 'bold',
                fontSize: '16px',
                display: 'inline-block'
              }}>
                {score.ribbonEligibility} Ribbon
              </div>
            </div>
            <div>
              <strong>Status:</strong>
              <div style={{ 
                marginTop: '5px',
                color: score.isFinalized ? '#28a745' : '#ffc107',
                fontWeight: 'bold',
                fontSize: '16px'
              }}>
                {score.isFinalized ? 'Finalized' : 'Draft'}
              </div>
            </div>
            <div>
              <strong>Scored On:</strong>
              <div style={{ marginTop: '5px', fontSize: '14px' }}>
                {new Date(score.timestamp).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right', paddingTop: '15px', borderTop: '1px solid #dee2e6' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#0066cc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const getRibbonColor = (ribbon: string) => {
  switch (ribbon) {
    case 'Blue': return '#0066cc';
    case 'Red': return '#cc0000';
    case 'White': return '#666666';
    case 'Participation': return '#999999';
    default: return '#333333';
  }
};

export default ClassScoreReports;