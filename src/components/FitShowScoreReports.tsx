import React, { useState, useEffect, useMemo } from 'react';
import { generateClient } from 'aws-amplify/api';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Checkbox,
  FormControlLabel,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from '@mui/material';
import {
  Assessment as ReportsIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { FitShowScore } from '../types/scoring';

const client = generateClient();

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

const CATEGORY_BREAKDOWN = [
  { key: 'appearanceTotal', commentsKey: 'appearanceComments', label: 'Appearance', max: 20 },
  { key: 'handlingTotal', commentsKey: 'handlingComments', label: 'Handling', max: 14 },
  { key: 'demonstrationTotal', commentsKey: 'demonstrationComments', label: 'Demonstration', max: 16 },
  { key: 'healthExaminationTotal', commentsKey: 'healthExaminationComments', label: 'Health Exam', max: 21 },
  { key: 'groomingCareTotal', commentsKey: 'groomingCareComments', label: 'Grooming & Care', max: 14 },
  { key: 'knowledgeTotal', commentsKey: 'knowledgeComments', label: 'Knowledge', max: 12 },
] as const;

export const FitShowScoreReports: React.FC<FitShowScoreReportsProps> = () => {
  const [scores, setScores] = useState<FitShowScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('totalScore');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedScore, setSelectedScore] = useState<FitShowScore | null>(null);
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
    const filtered = scores.filter(score => {
      if (filters.judge && !score.judgeName.toLowerCase().includes(filters.judge.toLowerCase())) {
        return false;
      }
      if (filters.participant && !score.participantName.toLowerCase().includes(filters.participant.toLowerCase())) {
        return false;
      }
      if (filters.minScore && score.totalScore < parseInt(filters.minScore)) {
        return false;
      }
      if (filters.maxScore && score.totalScore > parseInt(filters.maxScore)) {
        return false;
      }

      const scoreDate = new Date(score.createdAt);
      if (filters.dateFrom && scoreDate < new Date(filters.dateFrom)) {
        return false;
      }
      if (filters.dateTo && scoreDate > new Date(filters.dateTo + 'T23:59:59')) {
        return false;
      }

      if (filters.finalizedOnly && !score.isFinalized) {
        return false;
      }

      return true;
    });

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
    URL.revokeObjectURL(url);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#2e7d32';
    if (score >= 60) return '#f9a825';
    return '#c62828';
  };

  if (loading) {
    return (
      <Card elevation={2}>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <ReportsIcon sx={{ fontSize: '2.5rem', color: '#1976d2', mb: 1 }} />
          <Typography color="text.secondary">Loading fit and show scoring reports...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card elevation={2} sx={{ border: '1px solid', borderColor: 'error.main' }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="error" gutterBottom>{error}</Typography>
          <Button variant="outlined" color="error" onClick={loadScores} startIcon={<RefreshIcon />}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevation={2}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1, color: '#1976d2' }}>
            <ReportsIcon sx={{ fontSize: '2rem' }} />
            Fit and Show Scoring Reports
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={exportToCSV}
            >
              Export to CSV ({filteredAndSortedScores.length})
            </Button>
            <Tooltip title="Refresh">
              <IconButton onClick={loadScores} aria-label="Refresh">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Filters */}
        <Box sx={{ p: 2, mb: 3, backgroundColor: 'action.hover', borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>Filters</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                label="Judge"
                size="small"
                fullWidth
                value={filters.judge}
                onChange={(e) => handleFilterChange('judge', e.target.value)}
                placeholder="Filter by judge name"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                label="Participant"
                size="small"
                fullWidth
                value={filters.participant}
                onChange={(e) => handleFilterChange('participant', e.target.value)}
                placeholder="Filter by participant name"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
              <TextField
                label="Min Score"
                type="number"
                size="small"
                fullWidth
                slotProps={{ htmlInput: { min: 0, max: 100 } }}
                value={filters.minScore}
                onChange={(e) => handleFilterChange('minScore', e.target.value)}
                placeholder="0"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
              <TextField
                label="Max Score"
                type="number"
                size="small"
                fullWidth
                slotProps={{ htmlInput: { min: 0, max: 100 } }}
                value={filters.maxScore}
                onChange={(e) => handleFilterChange('maxScore', e.target.value)}
                placeholder="100"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
              <TextField
                label="From Date"
                type="date"
                size="small"
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
              <TextField
                label="To Date"
                type="date"
                size="small"
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </Grid>
          </Grid>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, flexWrap: 'wrap', gap: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={filters.finalizedOnly}
                  onChange={(e) => handleFilterChange('finalizedOnly', e.target.checked)}
                />
              }
              label="Finalized scores only"
            />
            <Button size="small" onClick={clearFilters}>Clear Filters</Button>
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Showing {filteredAndSortedScores.length} of {scores.length} fit and show scores
        </Typography>

        {filteredAndSortedScores.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography color="text.secondary">No fit and show scores found matching the current filters.</Typography>
          </Box>
        ) : (
          <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sortDirection={sortField === 'participantName' ? sortDirection : false}>
                    <TableSortLabel
                      active={sortField === 'participantName'}
                      direction={sortField === 'participantName' ? sortDirection : 'asc'}
                      onClick={() => handleSort('participantName')}
                    >
                      Participant
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={sortField === 'judgeName' ? sortDirection : false}>
                    <TableSortLabel
                      active={sortField === 'judgeName'}
                      direction={sortField === 'judgeName' ? sortDirection : 'asc'}
                      onClick={() => handleSort('judgeName')}
                    >
                      Judge
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="center" sortDirection={sortField === 'totalScore' ? sortDirection : false}>
                    <TableSortLabel
                      active={sortField === 'totalScore'}
                      direction={sortField === 'totalScore' ? sortDirection : 'asc'}
                      onClick={() => handleSort('totalScore')}
                    >
                      Total Score
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Category Breakdown</TableCell>
                  <TableCell sortDirection={sortField === 'createdAt' ? sortDirection : false}>
                    <TableSortLabel
                      active={sortField === 'createdAt'}
                      direction={sortField === 'createdAt' ? sortDirection : 'asc'}
                      onClick={() => handleSort('createdAt')}
                    >
                      Date
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAndSortedScores.map((score) => (
                  <TableRow key={score.id} hover>
                    <TableCell sx={{ fontWeight: 'bold' }}>{score.participantName}</TableCell>
                    <TableCell>{score.judgeName}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${score.totalScore}/100`}
                        size="small"
                        sx={{ backgroundColor: getScoreColor(score.totalScore), color: 'white', fontWeight: 'bold' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(60px, 1fr))', gap: 0.5 }}>
                        {CATEGORY_BREAKDOWN.map((category) => (
                          <Typography key={category.key} variant="caption" color="text.secondary" noWrap>
                            {category.label.split(' ')[0]}: {score[category.key]}/{category.max}
                          </Typography>
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell>{new Date(score.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={score.isFinalized ? 'Finalized' : 'Draft'}
                        size="small"
                        color={score.isFinalized ? 'success' : 'warning'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => setSelectedScore(score)} aria-label="View details">
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>

      <Dialog open={!!selectedScore} onClose={() => setSelectedScore(null)} maxWidth="sm" fullWidth>
        {selectedScore && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Fit and Show Score Details
              <IconButton onClick={() => setSelectedScore(null)} aria-label="Close">
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Typography variant="h6" gutterBottom>{selectedScore.participantName}</Typography>
              <Typography variant="body2" color="text.secondary">Judge: {selectedScore.judgeName}</Typography>
              <Typography variant="body2" color="text.secondary">
                Date: {new Date(selectedScore.createdAt).toLocaleString()}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1, mb: 3 }}>
                <Chip
                  label={`Total: ${selectedScore.totalScore}/100`}
                  sx={{ backgroundColor: getScoreColor(selectedScore.totalScore), color: 'white', fontWeight: 'bold' }}
                />
                <Chip
                  label={selectedScore.isFinalized ? 'Finalized' : 'Draft'}
                  size="small"
                  color={selectedScore.isFinalized ? 'success' : 'warning'}
                  variant="outlined"
                />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {CATEGORY_BREAKDOWN.map((category) => (
                  <Box key={category.key} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{category.label}</Typography>
                      <Typography variant="subtitle2">{selectedScore[category.key]}/{category.max}</Typography>
                    </Box>
                    {selectedScore[category.commentsKey] && (
                      <Typography variant="body2" color="text.secondary">
                        {selectedScore[category.commentsKey]}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedScore(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Card>
  );
};

export default FitShowScoreReports;
