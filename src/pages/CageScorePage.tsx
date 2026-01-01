import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Box,
  AppBar,
  Toolbar,
  Alert,
  CircularProgress,
  Grid,
  Chip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  EmojiEvents as TrophyIcon,
  Person as PersonIcon,
  Pets as PetsIcon,
  BugReport as BugReportIcon,
} from '@mui/icons-material';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';
import CageScoringForm from '../components/CageScoringForm';
import { ScoringErrorBoundary } from '../components/ScoringErrorBoundary';
import { NetworkErrorHandler } from '../components/NetworkErrorHandler';
import UserDebugInfo from '../components/UserDebugInfo';
import { CreateScoreInput } from '../types/scoring';
import { parseError, getUserFriendlyMessage, logError, withRetry, handleOptimisticLockConflict } from '../utils/errorHandling';

const client = generateClient();

const getCatByCage = `
  query GetCatByCage($cageNumber: Int!) {
    getCatByCage(cageNumber: $cageNumber) {
      id
      name
      owner
      cageNumber
      votes
    }
  }
`;

const getScoresByCat = `
  query GetScoresByCat($catId: ID!) {
    getScoresByCat(catId: $catId) {
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

interface Cat {
  id: string;
  name: string;
  owner: string;
  cageNumber: number;
  votes: number;
}

interface Score {
  id: string;
  catId: string;
  judgeId: string;
  judgeName: string;
  firstImpressionScore: number;
  firstImpressionComments?: string;
  originalityScore: number;
  originalityComments?: string;
  informationCardScore: number;
  informationCardComments?: string;
  workDoneByMemberScore: number;
  workDoneByMemberComments?: string;
  basicComfortScore: number;
  basicComfortComments?: string;
  safetyScore: number;
  safetyComments?: string;
  easyViewOfCatScore: number;
  easyViewOfCatComments?: string;
  totalScore: number;
  timestamp: string;
  isFinalized: boolean;
}

function CageScorePage(): JSX.Element {
  const { cageNumber } = useParams<{ cageNumber: string }>();
  const navigate = useNavigate();
  
  const [cat, setCat] = useState<Cat | null>(null);
  const [existingScore, setExistingScore] = useState<Score | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [networkError, setNetworkError] = useState<any>(null);
  const [judge, setJudge] = useState<any>(null);
  const [showDebugInfo, setShowDebugInfo] = useState<boolean>(false);
  const [hasScorePermission, setHasScorePermission] = useState<boolean>(false);

  const checkScorePermission = (user: any): boolean => {
    if (!user) return false;
    
    // Check Cognito groups first (highest priority)
    const cognitoGroups = user.signInUserSession?.idToken?.payload?.['cognito:groups'] || [];
    if (cognitoGroups.includes('admin') || cognitoGroups.includes('judge')) {
      return true;
    }
    
    // Check if user is the default admin
    const isAdmin = user.signInDetails?.loginId === '4h-leader@example.com';
    
    // Check custom role attribute
    const customRole = user.attributes?.['custom:role'];
    const hasJudgeId = user.attributes?.['custom:judgeId'];
    
    // Determine if user has judge or admin role
    return isAdmin || 
           customRole === 'judge' || 
           customRole === 'admin' || 
           (hasJudgeId && !customRole); // Has judge ID but no explicit role set
  };

  useEffect(() => {
    initializePage();
  }, [cageNumber]);

  const initializePage = async () => {
    try {
      setLoading(true);
      setError('');

      // Wait a bit to ensure Amplify is fully configured
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify judge authentication
      let currentUser: any;
      try {
        currentUser = await getCurrentUser();
      } catch (authError) {
        logError(authError, 'CageScorePage.initializePage.auth');
        setError('Authentication required. Please log in.');
        return;
      }
      
      if (!currentUser) {
        setError('Authentication required. Please log in.');
        return;
      }

      // Check if user has judge role and scoring permissions
      setJudge(currentUser);
      const hasPermission = checkScorePermission(currentUser);
      setHasScorePermission(hasPermission);

      // Validate cage number
      if (!cageNumber || isNaN(parseInt(cageNumber))) {
        setError('Invalid cage number provided.');
        return;
      }

      // Fetch cat data by cage number with retry
      console.log('Fetching cat data for cage:', cageNumber);
      const fetchCatWithRetry = withRetry(async () => {
        return await client.graphql({
          query: getCatByCage,
          variables: { cageNumber: parseInt(cageNumber) }
        });
      }, { maxRetries: 2 });

      const catResult = await fetchCatWithRetry();
      console.log('Cat result:', catResult);

      if (!('data' in catResult) || !catResult.data?.getCatByCage) {
        setError(`No cat found in cage ${cageNumber}. Please verify the cage number.`);
        return;
      }

      const catData = catResult.data.getCatByCage;
      setCat(catData);

      // Fetch existing scores for this cat
      console.log('Fetching scores for cat:', catData.id);
      const scoresResult = await client.graphql({
        query: getScoresByCat,
        variables: { catId: catData.id }
      });
      console.log('Scores result:', scoresResult);

      // Find the current judge's score if it exists
      if ('data' in scoresResult && scoresResult.data?.getScoresByCat?.items) {
        const currentJudgeScore = scoresResult.data.getScoresByCat.items.find(
          (score: Score) => score.judgeId === currentUser.userId
        );

        if (currentJudgeScore) {
          setExistingScore(currentJudgeScore);
        }
      }

    } catch (err) {
      console.error('CageScorePage initialization error:', err);
      if (err && typeof err === 'object' && 'errors' in err) {
        console.error('GraphQL errors:', err.errors);
      }
      logError(err, 'CageScorePage.initializePage');
      const parsedError = parseError(err);
      
      if (parsedError.error.type === 'NETWORK_ERROR' || parsedError.error.type === 'TIMEOUT_ERROR') {
        setNetworkError(err);
      } else {
        const userMessage = getUserFriendlyMessage(parsedError);
        setError(userMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleScoreSubmitted = (score: Score) => {
    // Navigate back to cage scoring dashboard with success message
    navigate('/cage-scoring', { 
      state: { 
        message: `Cage score ${score.isFinalized ? 'finalized' : 'saved'} successfully for ${cat?.name} in cage ${cageNumber}!` 
      }
    });
  };

  const handleCancel = () => {
    navigate('/cage-scoring');
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Loading cage scoring page...
            </Typography>
            <PetsIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
          </CardContent>
        </Card>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h4" color="error" gutterBottom>
              ❌ Error
            </Typography>
            <Typography variant="body1" color="error" sx={{ mb: 3 }}>
              {error}
            </Typography>
            <Button 
              variant="contained"
              onClick={() => navigate('/cage-scoring')}
              startIcon={<ArrowBackIcon />}
            >
              Return to Cage Scoring
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  if (!cat) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h4" gutterBottom>
              🔍 Cage Empty
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              No cat found in cage {cageNumber}.
            </Typography>
            <Button 
              variant="contained"
              onClick={() => navigate('/cage-scoring')}
              startIcon={<ArrowBackIcon />}
            >
              Return to Cage Scoring
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  const handleNetworkRetry = async () => {
    setNetworkError(null);
    await initializePage();
  };

  return (
    <ScoringErrorBoundary>
      <Box sx={{ flexGrow: 1 }}>
        {/* Network Error Handler */}
        {networkError && (
          <NetworkErrorHandler
            error={networkError}
            onRetry={handleNetworkRetry}
            onCancel={() => setNetworkError(null)}
          />
        )}

        {/* User Debug Info */}
        {showDebugInfo && (
          <UserDebugInfo onClose={() => setShowDebugInfo(false)} />
        )}

        <AppBar position="static" elevation={2} sx={{ bgcolor: '#28a745' }}>
          <Toolbar>
            <Button
              color="inherit"
              onClick={() => navigate('/cage-scoring')}
              startIcon={<ArrowBackIcon />}
              sx={{ mr: 2 }}
            >
              Back to Cage Scoring
            </Button>
            <TrophyIcon sx={{ mr: 1 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              4H Cage Scoring - Cage {cageNumber}
            </Typography>
            <Button
              color="inherit"
              onClick={() => setShowDebugInfo(!showDebugInfo)}
              startIcon={<BugReportIcon />}
              size="small"
            >
              Debug User
            </Button>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ mt: 3, mb: 3 }}>
          {/* Cat & Judge Information */}
          <Card elevation={3} sx={{ mb: 3, border: '2px solid #28a745' }}>
            <CardContent>
              <Grid container spacing={3}>
                {/* Cat Info */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PetsIcon sx={{ color: '#28a745', mr: 1, fontSize: 32 }} />
                    <Typography variant="h5" sx={{ color: '#28a745', fontWeight: 'bold' }}>
                      {cat.name}
                    </Typography>
                  </Box>
                  <Typography variant="body1" gutterBottom>
                    <strong>Owner:</strong> {cat.owner}
                  </Typography>
                  <Typography variant="body1">
                    <strong>Votes:</strong> {cat.votes}
                  </Typography>
                </Grid>
                
                {/* Judge Info */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PersonIcon sx={{ mr: 1 }} />
                    <Typography variant="h6">
                      Judge Session
                    </Typography>
                  </Box>
                  <Typography variant="body2" gutterBottom>
                    <strong>Judge:</strong> {judge?.signInDetails?.loginId || judge?.username || 'Unknown'}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Time:</strong> {new Date().toLocaleTimeString()}
                  </Typography>
                  <Chip
                    label={hasScorePermission ? '✅ Can Score' : '❌ View Only'}
                    color={hasScorePermission ? 'success' : 'error'}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Grid>
              </Grid>
              
              {existingScore && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <strong>Note:</strong> You have already scored this cage. 
                  {existingScore.isFinalized 
                    ? ' Your score has been finalized.' 
                    : ' You can modify your draft score below.'
                  }
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Cage Scoring Form */}
          {hasScorePermission ? (
            <CageScoringForm
              cat={cat}
              existingScore={existingScore}
              onScoreSubmitted={handleScoreSubmitted}
              onCancel={handleCancel}
            />
          ) : (
            <Alert severity="error" sx={{ mt: 2 }}>
              <strong>Access Denied:</strong> You do not have permission to score cages. Please contact an administrator.
            </Alert>
          )}
        </Container>
      </Box>
    </ScoringErrorBoundary>
  );
}

export default CageScorePage;