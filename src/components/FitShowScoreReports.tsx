import React, { useState, useEffect, useMemo } from 'react';
import { generateClient } from 'aws-amplify/api';
import { FitShowScore } from '../types/scoring';

const LIST_FIT_SHOW_SCORES = `
  query ListFitShowScores($limit: Int, $nextToken: String) {
    listFitShowScores(limit: $limit, nextToken: $nextToken) {
      items {
        id
        catId
        participantName
        judgeId
        judgeName
        totalScore
        appearanceTotal
        handlingTotal
        demonstrationTotal
        healthExaminationTotal
        groomingCareTotal
        knowledgeTotal
        appearanceComments
        handlingComments
        demonstrationComments
        healthExaminationComments
        groomingCareComments
        knowledgeComments
        createdAt
        updatedAt
        isFinalized
      }
      nextToken
    }
  }
`;

interface FitShowScoreReportsProps {
  className?: string;
}

type SortField = 'participantName' | 'judgeName' | 'totalScore' | 'createdAt';
type SortDirection = 'asc' | 'desc';

interface FilterOptions {
  judge: string;
  participant: string;
  minScore: string;
  maxScore: string;
  dateFrom: string;
  dateTo: string;
  finalizedOnly: boolean;
}

export const FitShowScoreReports: React.FC<FitShowScoreReportsProps> = ({ className = '' }) => {
  const [scores, setScores] = useState<FitShowScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('totalScore');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filters, setFilters] = useState<FilterOptions>({
    judge: '',
    participant: '',
    minScore: '',
    maxScore: '',
    dateFrom: '',
    dateTo: '',
    finalizedOnly: false
  });

  useEffect(() => {
    loadScores();
  }, []);

  const loadScores = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const client = generateClient();
      const result = await client.graphql({
        query: LIST_FIT_SHOW_SCORES,
        variables: { limit: 1000 }
      }) as any;
      setScores(result.data.listFitShowScores.items || []);
    } catch (err) {
      console.error('Error loading fit and show scores:', err);
      setError('Failed to load fit and show scores');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedScores = useMemo(() => {
    let filtered = scores.filter(score => {
      // Judge filter
      if (filters.judge && !score.judgeName.toLowerCase().includes(filters.judge.toLowerCase())) {
        return false;
      }
      
      // Participant filter
      if (filters.participant && !score.participantName.toLowerCase().includes(filters.participant.toLowerCase())) {
        return false;
      }
      
      // Score range filters
      if (filters.minScore && score.totalScore < parseInt(filters.minScore)) {
        return false;
      }
      if (filters.maxScore && score.totalScore > parseInt(filters.maxScore)) {
        return false;
      }
      
      // Date range filters
      const scoreDate = new Date(score.createdAt);
      if (filters.dateFrom && scoreDate < new Date(filters.dateFrom)) {
        return false;
      }
      if (filters.dateTo && scoreDate > new Date(filters.dateTo + 'T23:59:59')) {
        return false;
      }
      
      // Finalized filter
      if (filters.finalizedOnly && !score.isFinalized) {
        return false;
      }
      
      return true;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];
      
      if (sortField === 'createdAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [scores, filters, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleFilterChange = (key: keyof FilterOptions, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      judge: '',
      participant: '',
      minScore: '',
      maxScore: '',
      dateFrom: '',
      dateTo: '',
      finalizedOnly: false
    });
  };

  const exportToCSV = () => {
    const headers = [
      'Participant Name',
      'Judge Name',
      'Total Score',
      'Appearance Total',
      'Handling Total',
      'Demonstration Total',
      'Health Examination Total',
      'Grooming & Care Total',
      'Knowledge Total',
      'Appearance Comments',
      'Handling Comments',
      'Demonstration Comments',
      'Health Examination Comments',
      'Grooming & Care Comments',
      'Knowledge Comments',
      'Created At',
      'Finalized'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredAndSortedScores.map(score => [
        `"${score.participantName}"`,
        `"${score.judgeName}"`,
        score.totalScore,
        score.appearanceTotal,
        score.handlingTotal,
        score.demonstrationTotal,
        score.healthExaminationTotal,
        score.groomingCareTotal,
        score.knowledgeTotal,
        `"${score.appearanceComments || ''}"`,
        `"${score.handlingComments || ''}"`,
        `"${score.demonstrationComments || ''}"`,
        `"${score.healthExaminationComments || ''}"`,
        `"${score.groomingCareComments || ''}"`,
        `"${score.knowledgeComments || ''}"`,
        new Date(score.createdAt).toLocaleString(),
        score.isFinalized ? 'Yes' : 'No'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `fit-show-scores-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  if (loading) {
    return (
      <div className={`fit-show-score-reports ${className}`}>
        <div className="loading">Loading fit and show scoring reports...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`fit-show-score-reports ${className}`}>
        <div className="error">
          <p>{error}</p>
          <button onClick={loadScores}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`fit-show-score-reports ${className}`}>
      <div className="reports-header">
        <h2>Fit and Show Scoring Reports</h2>
        <div className="header-actions">
          <button onClick={exportToCSV} className="export-btn">
            Export to CSV ({filteredAndSortedScores.length} records)
          </button>
          <button onClick={loadScores} className="refresh-btn">
            Refresh
          </button>
        </div>
      </div>

      <div className="filters-section">
        <h3>Filters</h3>
        <div className="filters-grid">
          <div className="filter-group">
            <label>Judge:</label>
            <input
              type="text"
              value={filters.judge}
              onChange={(e) => handleFilterChange('judge', e.target.value)}
              placeholder="Filter by judge name"
            />
          </div>
          
          <div className="filter-group">
            <label>Participant:</label>
            <input
              type="text"
              value={filters.participant}
              onChange={(e) => handleFilterChange('participant', e.target.value)}
              placeholder="Filter by participant name"
            />
          </div>
          
          <div className="filter-group">
            <label>Min Score:</label>
            <input
              type="number"
              min="0"
              max="100"
              value={filters.minScore}
              onChange={(e) => handleFilterChange('minScore', e.target.value)}
              placeholder="0"
            />
          </div>
          
          <div className="filter-group">
            <label>Max Score:</label>
            <input
              type="number"
              min="0"
              max="100"
              value={filters.maxScore}
              onChange={(e) => handleFilterChange('maxScore', e.target.value)}
              placeholder="100"
            />
          </div>
          
          <div className="filter-group">
            <label>From Date:</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <label>To Date:</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            />
          </div>
          
          <div className="filter-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={filters.finalizedOnly}
                onChange={(e) => handleFilterChange('finalizedOnly', e.target.checked)}
              />
              Finalized scores only
            </label>
          </div>
          
          <div className="filter-group">
            <button onClick={clearFilters} className="clear-filters-btn">
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      <div className="results-summary">
        <p>Showing {filteredAndSortedScores.length} of {scores.length} fit and show scores</p>
      </div>

      <div className="scores-table-container">
        <table className="scores-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('participantName')} className="sortable">
                Participant {getSortIcon('participantName')}
              </th>
              <th onClick={() => handleSort('judgeName')} className="sortable">
                Judge {getSortIcon('judgeName')}
              </th>
              <th onClick={() => handleSort('totalScore')} className="sortable">
                Total Score {getSortIcon('totalScore')}
              </th>
              <th>Category Breakdown</th>
              <th onClick={() => handleSort('createdAt')} className="sortable">
                Date {getSortIcon('createdAt')}
              </th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedScores.map((score) => (
              <tr key={score.id}>
                <td className="participant-name">{score.participantName}</td>
                <td className="judge-name">{score.judgeName}</td>
                <td className="total-score">
                  <strong>{score.totalScore}/100</strong>
                </td>
                <td className="category-breakdown">
                  <div className="category-scores">
                    <span>App: {score.appearanceTotal}/20</span>
                    <span>Hand: {score.handlingTotal}/14</span>
                    <span>Demo: {score.demonstrationTotal}/16</span>
                    <span>Health: {score.healthExaminationTotal}/21</span>
                    <span>Groom: {score.groomingCareTotal}/14</span>
                    <span>Know: {score.knowledgeTotal}/12</span>
                  </div>
                </td>
                <td className="date">
                  {new Date(score.createdAt).toLocaleDateString()}
                </td>
                <td className="status">
                  <span className={`status-badge ${score.isFinalized ? 'finalized' : 'draft'}`}>
                    {score.isFinalized ? 'Finalized' : 'Draft'}
                  </span>
                </td>
                <td className="actions">
                  <button 
                    className="view-details-btn"
                    onClick={() => {/* TODO: Implement view details */}}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredAndSortedScores.length === 0 && (
        <div className="no-results">
          <p>No fit and show scores found matching the current filters.</p>
        </div>
      )}
    </div>
  );
};

export default FitShowScoreReports;