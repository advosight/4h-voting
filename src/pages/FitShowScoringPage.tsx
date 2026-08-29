import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Box,
  Paper,
  TextField,
  InputAdornment,
  Alert,
  Chip,
  useTheme,
  useMediaQuery,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  School as FitShowIcon,
  Search as SearchIcon,
  TrendingUp as TrendingUpIcon,
  Psychology as KnowledgeIcon,
  Pets as HandlingIcon,
  Visibility as ShowmanshipIcon,
} from '@mui/icons-material';
import { generateClient } from 'aws-amplify/api';
import FitShowScoreLeaderboard from '../components/FitShowScoreLeaderboard';
import FitShowScoreNotifications from '../components/FitShowScoreNotifications';
import { OWNER_AGE_GROUPS, getOwnerAgeGroupLabel, getCatAgeGroupLabel } from '../utils/ageGroups';
import { useUserRole } from '../utils/roleUtils';
import { FitShowScoreAuditHistory } from '../components/FitShowScoreAuditHistory';

const client = generateClient();

const listCats = `
  query ListCats {
    listCats {
      items {
        id
        name
        owner
        votes
        cageNumber
        ownerAgeGroup
        catAgeGroup
      }
    }
  }
`;

const listAllFitShowScores = `
  query ListAllFitShowScores {
    listAllFitShowScores {
      items {
        id
        catId
        participantName
        judgeId
        judgeName
        totalScore
        isFinalized
        createdAt
        updatedAt
      }
    }
  }
`;

const onFitShowScoreCreated = `
  subscription OnFitShowScoreCreated {
    onFitShowScoreCreated {
      id
    }
  }
`;

const onFitShowScoreUpdated = `
  subscription OnFitShowScoreUpdated {
    onFitShowScoreUpdated {
      id
    }
  }
`;

const finalizeAllFitShowScores = `
  mutation FinalizeAllFitShowScores {
    finalizeAllFitShowScores {
      success
    }
  }
`;

const getFitShowScoreAuditHistoryQuery = `
  query GetFitShowScoreAuditHistory($fitShowScoreId: ID!) {
    getFitShowScoreAuditHistory(fitShowScoreId: $fitShowScoreId) {
      items {
        id
        fitShowScoreId
        action
        modifiedBy
        modifiedAt
        previousValues
        newValues
        reason
      }
    }
  }
`;

function FitShowScoringPage(): JSX.Element {
  const navigate = useNavigate();
  const [cats, setCats] = useState<any[]>([]);
  const [fitShowScores, setFitShowScores] = useState<any[]>([]);
  const [selectedParticipantGroup, setSelectedParticipantGroup] = useState<string>('all');
  const [showAlert, setShowAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [auditHistoryDialogOpen, setAuditHistoryDialogOpen] = useState(false);
  const [auditHistoryScoreId, setAuditHistoryScoreId] = useState<string | null>(null);
  const { userInfo, loading: roleLoading } = useUserRole();
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Filter cats based on selected participant group
  const filteredCats = selectedParticipantGroup === 'all' 
    ? cats 
    : cats.filter(cat => cat.ownerAgeGroup === selectedParticipantGroup);

  useEffect(() => {
    fetchCatsAndScores();

    // Subscribe to fit & show score changes
    const createdSub = client.graphql({ query: onFitShowScoreCreated }).subscribe({
      next: () => fetchCatsAndScores(),
      error: (err) => console.error('Fit and show score created subscription error:', err),
    });
    const updatedSub = client.graphql({ query: onFitShowScoreUpdated }).subscribe({
      next: () => fetchCatsAndScores(),
      error: (err) => console.error('Fit and show score updated subscription error:', err),
    });

    // Poll for updates every 30 seconds as a fallback
    const intervalId = setInterval(() => fetchCatsAndScores(), 30000);

    // Cleanup subscriptions and interval on unmount
    return () => {
      createdSub.unsubscribe();
      updatedSub.unsubscribe();
      clearInterval(intervalId);
    };
  }, []);

  const fetchCatsAndScores = async () => {
    try {
      // Fetch cats and scores in parallel
      const [catsResult, scoresResult] = await Promise.all([
        client.graphql({ query: listCats }),
        client.graphql({ query: listAllFitShowScores })
      ]);

      const sortedCats = catsResult.data.listCats.items.sort((a: any, b: any) => a.owner.localeCompare(b.owner));
      setCats(sortedCats);
      setFitShowScores(scoresResult.data.listAllFitShowScores.items);
    } catch (error) {
      console.error('Error fetching cats and scores:', error);
      setCats([]);
      setFitShowScores([]);
    }
  };

  // Helper function to get fit & show score for a cat
  const getFitShowScoreForCat = (catId: string) => {
    return fitShowScores.find(score => score.catId === catId);
  };

  // Task 1: Handle finalize all scores
  const handleFinalizeAllScores = async () => {
    const confirmed = window.confirm(
      'This will lock every currently-submitted fit & show score. This cannot be undone by judges — only an admin override can change a locked score afterward. Continue?'
    );

    if (!confirmed) {
      return;
    }

    try {
      await client.graphql({
        query: finalizeAllFitShowScores
      });

      setShowAlert({
        type: 'success',
        message: 'All fit & show scores have been finalized successfully!'
      });

      // Refresh the scores immediately
      await fetchCatsAndScores();

      // Clear alert after 5 seconds
      setTimeout(() => setShowAlert(null), 5000);
    } catch (error) {
      console.error('Error finalizing all scores:', error);
      setShowAlert({
        type: 'error',
        message: 'Failed to finalize scores. Please try again.'
      });
      setTimeout(() => setShowAlert(null), 5000);
    }
  };

  // Task 2: Handle override score
  const handleOverrideScore = (catId: string) => {
    const reason = window.prompt('Reason for overriding this finalized score (required):');

    if (reason && reason.trim()) {
      const fitShowScore = getFitShowScoreForCat(catId);
      navigate(`/fit-show-score/${catId}`, {
        state: {
          overrideScoreId: fitShowScore?.id,
          overrideReason: reason.trim()
        }
      });
    }
  };

  // Task 3: Handle audit history
  const handleOpenAuditHistory = (scoreId: string) => {
    setAuditHistoryScoreId(scoreId);
    setAuditHistoryDialogOpen(true);
  };

  const handleLoadAuditHistory = async (scoreId: string) => {
    try {
      const result = await client.graphql({
        query: getFitShowScoreAuditHistoryQuery,
        variables: { fitShowScoreId: scoreId }
      });
      return (result as any).data.getFitShowScoreAuditHistory.items;
    } catch (error) {
      console.error('Error loading audit history:', error);
      return [];
    }
  };

  return (
    <Box sx={{ pb: isMobile ? 10 : 2 }}>
      <Box sx={{ mb: 3, px: isMobile ? 1 : 0 }}>
        <Typography variant={isMobile ? "h5" : "h4"} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#e65100' }}>
          <FitShowIcon />
          Fit & Show Scoring Interface
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontSize: isMobile ? '0.8rem' : '1rem' }}>
          Participant evaluation for showmanship, handling, and knowledge demonstration.
        </Typography>
      </Box>

      {/* Admin Action Alerts */}
      {showAlert && (
        <Alert severity={showAlert.type} sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
          {showAlert.message}
        </Alert>
      )}

      {/* Quick Cage Access */}
      <Paper elevation={1} sx={{ p: 3, bgcolor: '#fff8e1', mb: 4, border: '1px solid #ffcc02' }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#e65100' }}>
          Quick Cage Access
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Enter a cage number for fit & show scoring:
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 2, flexWrap: 'wrap' }}>
          <TextField
            type="number"
            label="Cage Number"
            variant="outlined"
            size="medium"
            sx={{ minWidth: 250 }}
            slotProps={{
              input: {
                inputProps: { min: 1, max: 999 },
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const cageNumber = (e.target as HTMLInputElement).value;
                if (cageNumber) {
                  navigate(`/fit-show-score/cage/${cageNumber}`);
                  (e.target as HTMLInputElement).value = '';
                }
              }
            }}
          />
          <Button
            variant="contained"
            size="large"
            sx={{ 
              backgroundColor: '#ff9800',
              '&:hover': { backgroundColor: '#f57c00' },
              minHeight: 56,
              minWidth: 180,
              fontWeight: 'bold',
              fontSize: '1.1rem'
            }}
            onClick={() => {
              const input = document.querySelector('input[type="number"]') as HTMLInputElement;
              const cageNumber = input?.value;
              if (cageNumber) {
                navigate(`/fit-show-score/cage/${cageNumber}`);
                input.value = '';
              }
            }}
          >
            Start Fit & Show Scoring
          </Button>
        </Box>
      </Paper>

      {/* Participant Group Filter */}
      <Paper elevation={1} sx={{ p: 3, mb: 3, backgroundColor: '#fff3e0', border: '1px solid #ff9800' }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#e65100' }}>
          Filter Participants
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="participant-group-label">Participant Group</InputLabel>
            <Select
              labelId="participant-group-label"
              value={selectedParticipantGroup}
              label="Participant Group"
              onChange={(e) => setSelectedParticipantGroup(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#ff9800' },
                  '&:hover fieldset': { borderColor: '#f57c00' },
                  '&.Mui-focused fieldset': { borderColor: '#f57c00' }
                }
              }}
            >
              <MenuItem value="all">All Participants</MenuItem>
              {OWNER_AGE_GROUPS.map((group) => (
                <MenuItem key={group.value} value={group.value}>
                  {group.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Chip
            label={`${filteredCats.length} participant${filteredCats.length !== 1 ? 's' : ''} shown`}
            sx={{ backgroundColor: '#ff9800', color: 'white' }}
          />
          {selectedParticipantGroup !== 'all' && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => setSelectedParticipantGroup('all')}
              sx={{ 
                borderColor: '#ff9800',
                color: '#e65100',
                '&:hover': { borderColor: '#f57c00', backgroundColor: '#fff3e0' }
              }}
            >
              Clear Filter
            </Button>
          )}
        </Box>
      </Paper>

      {/* Available Participants Grid */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ color: '#e65100' }}>
          Available Participants
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {selectedParticipantGroup === 'all' 
            ? `Showing all ${filteredCats.length} participants`
            : `Showing ${filteredCats.length} ${getOwnerAgeGroupLabel(selectedParticipantGroup)} participants`
          }
        </Typography>
      </Box>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {filteredCats.map((cat) => {
          const fitShowScore = getFitShowScoreForCat(cat.id);
          const hasScore = !!fitShowScore;
          const isFinalized = fitShowScore?.isFinalized || false;
          
          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={`fit-show-${cat.id}`}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: hasScore ? (isFinalized ? '2px solid #4caf50' : '2px solid #ff9800') : '1px solid #ff9800',
                  backgroundColor: hasScore ? (isFinalized ? '#f1f8e9' : '#fff8f0') : 'white',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                    borderColor: hasScore ? (isFinalized ? '#388e3c' : '#f57c00') : '#f57c00',
                  }
                }}
                onClick={() => navigate(`/fit-show-score/${cat.id}`)}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ color: '#ff9800' }}>
                    {cat.name}
                  </Typography>
                  <Typography variant="body2" color="text.primary">
                    Cage {cat.cageNumber}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Participant: {cat.owner}
                  </Typography>
                  
                  {/* Score Information */}
                  {hasScore ? (
                    <Box sx={{ mt: 2, p: 1, backgroundColor: 'rgba(255, 152, 0, 0.1)', borderRadius: 1 }}>
                      <Typography variant="h6" sx={{ color: '#e65100', fontWeight: 'bold' }}>
                        {fitShowScore.totalScore}/100
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Fit & Show Score
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Chip
                          label={isFinalized ? '✅ Finalized' : '📝 Draft'}
                          size="small"
                          sx={{
                            backgroundColor: isFinalized ? '#4caf50' : '#ff9800',
                            color: 'white',
                            fontWeight: 'bold'
                          }}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        Judge: {fitShowScore.judgeName}
                      </Typography>

                      {/* Admin-only controls for finalized scores */}
                      {!roleLoading && userInfo?.role === 'admin' && isFinalized && (
                        <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            sx={{
                              color: '#ff9800',
                              borderColor: '#ff9800',
                              '&:hover': { borderColor: '#f57c00', backgroundColor: '#fff3e0' },
                              fontSize: '0.75rem'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOverrideScore(cat.id);
                            }}
                          >
                            Override
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            sx={{
                              color: '#4caf50',
                              borderColor: '#4caf50',
                              '&:hover': { borderColor: '#388e3c', backgroundColor: '#f1f8e9' },
                              fontSize: '0.75rem'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAuditHistory(fitShowScore.id);
                            }}
                          >
                            View History
                          </Button>
                        </Box>
                      )}
                    </Box>
                  ) : (
                    <Box sx={{ mt: 2, p: 1, backgroundColor: 'rgba(158, 158, 158, 0.1)', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Not yet scored
                      </Typography>
                      <Chip
                        label="🎓 Ready to Score"
                        size="small"
                        sx={{
                          backgroundColor: '#ff9800',
                          color: 'white',
                          mt: 1
                        }}
                      />
                    </Box>
                  )}

                  <Box sx={{ mt: 1 }}>
                    <Chip
                      label={`${cat.ownerAgeGroup} • ${cat.catAgeGroup}`}
                      size="small"
                      sx={{ backgroundColor: '#ff9800', color: 'white' }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
        {filteredCats.length === 0 && (
          <Grid item xs={12}>
            <Paper 
              elevation={1} 
              sx={{ 
                p: 4, 
                textAlign: 'center', 
                backgroundColor: '#fff8e1', 
                border: '1px solid #ff9800' 
              }}
            >
              <FitShowIcon sx={{ fontSize: 60, color: '#ff9800', mb: 2 }} />
              <Typography variant="h6" sx={{ color: '#e65100', mb: 1 }}>
                No Participants Found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {selectedParticipantGroup === 'all' 
                  ? 'No participants are currently available for fit & show scoring.'
                  : `No participants found in the ${getOwnerAgeGroupLabel(selectedParticipantGroup)} group.`
                }
              </Typography>
              {selectedParticipantGroup !== 'all' && (
                <Button
                  variant="outlined"
                  onClick={() => setSelectedParticipantGroup('all')}
                  sx={{ 
                    borderColor: '#ff9800',
                    color: '#e65100',
                    '&:hover': { borderColor: '#f57c00', backgroundColor: '#fff3e0' }
                  }}
                >
                  Show All Participants
                </Button>
              )}
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Scoring Criteria Information */}
      <Paper elevation={1} sx={{ p: 3, mb: 4, backgroundColor: '#fff3e0', border: '1px solid #ff9800' }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#e65100' }}>
          Fit & Show Scoring Criteria
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <ShowmanshipIcon sx={{ fontSize: 40, color: '#ff9800', mb: 1 }} />
              <Typography variant="h6" sx={{ color: '#e65100' }}>Showmanship</Typography>
              <Typography variant="body2" color="text.secondary">
                Presentation skills and confidence in the ring
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <HandlingIcon sx={{ fontSize: 40, color: '#ff9800', mb: 1 }} />
              <Typography variant="h6" sx={{ color: '#e65100' }}>Handling</Typography>
              <Typography variant="body2" color="text.secondary">
                Proper cat handling techniques and safety
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <KnowledgeIcon sx={{ fontSize: 40, color: '#ff9800', mb: 1 }} />
              <Typography variant="h6" sx={{ color: '#e65100' }}>Knowledge</Typography>
              <Typography variant="body2" color="text.secondary">
                Understanding of cat care and breed characteristics
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <TrendingUpIcon sx={{ fontSize: 40, color: '#ff9800', mb: 1 }} />
              <Typography variant="h6" sx={{ color: '#e65100' }}>Overall Care</Typography>
              <Typography variant="body2" color="text.secondary">
                Grooming, health maintenance, and preparation
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Real-time Leaderboard */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <FitShowScoreLeaderboard
            finalizedOnly={false}
            showTop={10}
            refreshInterval={30000}
          />
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <FitShowScoreNotifications 
            maxNotifications={5}
            autoHideDelay={8000}
            showOnlyFinalized={false}
            position="top-right"
          />
        </Grid>
      </Grid>

      {/* Quick Access to Reports */}
      <Paper elevation={2} sx={{ p: 3, backgroundColor: '#fff8e1', border: '1px solid #ff9800' }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#e65100' }}>
          📊 Fit & Show Reports & Administration
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
          Access comprehensive fit & show scoring reports and participant evaluations.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            sx={{
              backgroundColor: '#ff9800',
              '&:hover': { backgroundColor: '#f57c00' },
              minWidth: 200
            }}
            onClick={() => navigate('/fit-show-reports')}
          >
            View Fit & Show Reports
          </Button>
          <Button
            variant="outlined"
            sx={{
              borderColor: '#ff9800',
              color: '#e65100',
              '&:hover': { borderColor: '#f57c00', backgroundColor: '#fff3e0' },
              minWidth: 200
            }}
            onClick={() => navigate('/fit-show-leaderboard')}
          >
            View Fit & Show Leaderboard
          </Button>
          {!roleLoading && userInfo?.role === 'admin' && (
            <Button
              variant="contained"
              sx={{
                backgroundColor: '#4caf50',
                '&:hover': { backgroundColor: '#388e3c' },
                minWidth: 200
              }}
              onClick={handleFinalizeAllScores}
            >
              Finalize All Scores
            </Button>
          )}
        </Box>
      </Paper>

      <Alert severity="info" sx={{ mt: 3 }}>
        <strong>Fit & Show Scoring:</strong> Participant evaluation for showmanship, handling, and knowledge demonstration.
        Judges assess how well participants present their cats, demonstrate proper handling techniques, and show knowledge of cat care.
        This interface requires judge authentication to access scoring forms.
      </Alert>

      {/* Audit History Dialog */}
      <Dialog
        open={auditHistoryDialogOpen}
        onClose={() => setAuditHistoryDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Score Audit History</DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          {auditHistoryScoreId && (
            <FitShowScoreAuditHistory
              scoreId={auditHistoryScoreId}
              onLoadAuditHistory={handleLoadAuditHistory}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAuditHistoryDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default FitShowScoringPage;