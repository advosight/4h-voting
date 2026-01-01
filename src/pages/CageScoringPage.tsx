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
  Avatar,
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Search as SearchIcon,
  TrendingUp as TrendingUpIcon,
  Dashboard as DashboardIcon,
  Pets as PetsIcon,
  CheckCircle as CheckCircleIcon,
  Assignment as AssignmentIcon,
  EmojiEvents as TrophyIcon,
} from '@mui/icons-material';
import { generateClient } from 'aws-amplify/api';
import ScoreLeaderboard from '../components/ScoreLeaderboard';
import ScoreNotifications from '../components/ScoreNotifications';

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

const listAllScores = `
  query ListAllScores {
    listAllScores {
      items {
        id
        catId
        totalScore
        isFinalized
      }
    }
  }
`;

function CageScoringPage(): JSX.Element {
  const navigate = useNavigate();
  const [cats, setCats] = useState<any[]>([]);
  const [cageScores, setCageScores] = useState<any[]>([]);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    fetchCats();
    fetchCageScores();
  }, []);

  const fetchCats = async () => {
    try {
      const result = await client.graphql({ query: listCats });
      if ('data' in result && result.data?.listCats?.items) {
        const sortedCats = result.data.listCats.items.sort((a: any, b: any) => a.cageNumber - b.cageNumber);
        setCats(sortedCats);
      } else {
        setCats([]);
      }
    } catch (error) {
      console.error('Error fetching cats:', error);
      setCats([]);
    }
  };

  const fetchCageScores = async () => {
    try {
      const result = await client.graphql({ query: listAllScores });
      if ('data' in result && result.data?.listAllScores?.items) {
        setCageScores(result.data.listAllScores.items);
      } else {
        setCageScores([]);
      }
    } catch (error) {
      console.error('Error fetching cage scores:', error);
      setCageScores([]);
    }
  };

  return (
    <Box sx={{ pb: isMobile ? 10 : 2 }}>
      {/* Main Header Section */}
      <Paper 
        elevation={4} 
        sx={{ 
          mb: 4, 
          p: 4, 
          background: 'linear-gradient(135deg, #2e7d32 0%, #388e3c 50%, #4caf50 100%)',
          color: 'white',
          borderRadius: 3,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="30" cy="30" r="4"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            opacity: 0.3,
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, position: 'relative', zIndex: 1 }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 72, height: 72, border: '3px solid rgba(255,255,255,0.3)' }}>
            <AssignmentIcon sx={{ fontSize: 40, color: 'white' }} />
          </Avatar>
          <Box>
            <Typography variant={isMobile ? "h4" : "h3"} sx={{ fontWeight: 'bold', mb: 1, textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
              🏆 Cage Scoring System
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9, fontSize: isMobile ? '1rem' : '1.25rem', textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
              Traditional Cage-Based Judging • 4H Competition Standards
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
              <Chip 
                label="First Impression" 
                size="small" 
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 'bold' }}
              />
              <Chip 
                label="Originality" 
                size="small" 
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 'bold' }}
              />
              <Chip 
                label="Safety & Comfort" 
                size="small" 
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 'bold' }}
              />
            </Box>
          </Box>
        </Box>
      </Paper>

   
   {/* Quick Cage Access Section */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          mb: 4, 
          background: 'linear-gradient(135deg, #e8f5e8 0%, #f1f8e9 100%)',
          border: '2px solid #4caf50',
          borderRadius: 2,
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 8,
            left: 8,
            right: 8,
            bottom: 8,
            border: '1px dashed #81c784',
            borderRadius: 1,
            pointerEvents: 'none',
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, position: 'relative', zIndex: 1 }}>
          <Avatar sx={{ bgcolor: '#2e7d32', width: 48, height: 48, boxShadow: 2 }}>
            <SearchIcon sx={{ fontSize: 28 }} />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ color: '#2e7d32', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
              🎯 Quick Cage Access
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Jump directly to any cage for immediate scoring • Fast track to judging
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 2, flexWrap: 'wrap' }}>
          <TextField
            type="number"
            label="Enter Cage Number"
            variant="outlined"
            size="medium"
            sx={{
              minWidth: 250,
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: '#4caf50', borderWidth: 2 },
                '&:hover fieldset': { borderColor: '#2e7d32' },
                '&.Mui-focused fieldset': { borderColor: '#2e7d32' }
              }
            }}
            slotProps={{
              input: {
                inputProps: { min: 1, max: 999 },
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#2e7d32' }} />
                  </InputAdornment>
                ),
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const cageNumber = (e.target as HTMLInputElement).value;
                if (cageNumber) {
                  navigate(`/cage-score/${cageNumber}`);
                  (e.target as HTMLInputElement).value = '';
                }
              }
            }}
          />
          <Button
            variant="contained"
            color="success"
            size="large"
            onClick={() => {
              const input = document.querySelector('input[type="number"]') as HTMLInputElement;
              const cageNumber = input?.value;
              if (cageNumber) {
                navigate(`/cage-score/${cageNumber}`);
                input.value = '';
              }
            }}
            sx={{
              minHeight: 56,
              minWidth: 180,
              fontWeight: 'bold',
              fontSize: '1.1rem'
            }}
          >
            Start Scoring
          </Button>
        </Box>        {
/* Quick Actions */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 3 }}>
          <Button
            variant="outlined"
            color="success"
            onClick={() => navigate('/reports')}
            startIcon={<AssessmentIcon />}
          >
            View Cage Reports
          </Button>
          <Button
            variant="outlined"
            color="success"
            onClick={() => navigate('/leaderboard')}
            startIcon={<TrendingUpIcon />}
          >
            Cage Leaderboard
          </Button>
          <Button
            variant="outlined"
            color="success"
            onClick={() => navigate('/dashboard')}
            startIcon={<DashboardIcon />}
          >
            Main Dashboard
          </Button>
        </Box>
      </Paper>

      {/* Available Cages Section */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Avatar sx={{ bgcolor: '#2e7d32' }}>
            <PetsIcon />
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>
              Available Cages ({cats.length})
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Click any cage to begin cage scoring
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {cats.map((cat) => {
            const score = cageScores.find(score => score.catId === cat.id);
            const hasScore = !!score;
            const isFinalized = score?.isFinalized || false;
            const totalScore = score?.totalScore;
            
            return (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={cat.id}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  border: hasScore ? '2px solid #2e7d32' : '2px solid #4caf50',
                  backgroundColor: hasScore ? '#e8f5e8' : '#f8fff8',
                  position: 'relative',
                  '&:hover': {
                    transform: 'translateY(-6px)',
                    boxShadow: 8,
                    borderColor: '#2e7d32',
                    backgroundColor: '#f1f8e9',
                  }
                }}
                onClick={() => navigate(`/cage-score/${cat.cageNumber}`)}
              >  
              <CardContent sx={{ textAlign: 'center', pb: 3 }}>
                  <Avatar sx={{ bgcolor: '#2e7d32', width: 56, height: 56, mx: 'auto', mb: 2 }}>
                    <PetsIcon sx={{ fontSize: 28 }} />
                  </Avatar>

                  <Typography variant="h6" sx={{ color: '#2e7d32', fontWeight: 'bold', mb: 1 }}>
                    {cat.name}
                  </Typography>
                  <Typography variant="body2" color="text.primary" sx={{ mb: 1 }}>
                    Owner: {cat.owner}
                  </Typography>

                  {isFinalized && totalScore && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                      <Chip
                        label={`Score: ${totalScore}`}
                        size="small"
                        color="primary"
                        variant="filled"
                        sx={{ fontWeight: 'bold' }}
                      />
                    </Box>
                  )}

                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    fullWidth
                    sx={{ fontWeight: 'bold' }}
                  >
                    {hasScore ? '✓ View/Edit Score' : 'Score Cage'} {cat.cageNumber}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            );
          })}
        </Grid>
      </Box>   
   {/* Cage Scoring Leaderboard */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <ScoreLeaderboard
            showOnlyFinalized={false}
            maxEntries={10}
            refreshInterval={30000}
          />
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <ScoreNotifications
            maxNotifications={5}
            autoHideDelay={8000}
            showOnlyFinalized={false}
            position="top-right"
          />
        </Grid>
      </Grid>

      {/* Cage Scoring Administration */}
      <Paper elevation={3} sx={{ p: 4, backgroundColor: '#f1f8e9', border: '2px solid #4caf50', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Avatar sx={{ bgcolor: '#2e7d32' }}>
            <AssessmentIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>
              Cage Scoring Administration
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Reports and management tools for cage-based scoring
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 400 }}>
          <Button
            variant="contained"
            color="success"
            onClick={() => navigate('/reports')}
            startIcon={<AssessmentIcon />}
            fullWidth
            size="large"
          >
            View Cage Reports
          </Button>
          <Button
            variant="outlined"
            color="success"
            onClick={() => navigate('/leaderboard')}
            startIcon={<TrendingUpIcon />}
            fullWidth
            size="large"
          >
            View Cage Leaderboard
          </Button>
          <Button
            variant="outlined"
            color="success"
            onClick={() => navigate('/dashboard')}
            startIcon={<DashboardIcon />}
            fullWidth
            size="large"
          >
            Back to Dashboard
          </Button>
        </Box>
      </Paper>

      <Alert
        severity="success"
        sx={{
          mt: 3,
          border: '2px solid #4caf50',
          backgroundColor: '#f1f8e9',
          '& .MuiAlert-icon': { color: '#2e7d32' }
        }}
      >
        <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
          🏆 Cage Scoring Interface
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          Traditional cage-based judging system for evaluating cats using standardized 4H criteria including
          First Impression, Originality, Information Card, Work Done by Member, Basic Comfort, Safety, and Easy View of Cat.
          Each cat is scored individually in their assigned cage. All scoring requires judge authentication for security and accountability.
        </Typography>
      </Alert>
    </Box>
  );
}

export default CageScoringPage;