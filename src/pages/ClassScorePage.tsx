import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, 
  Paper, 
  Typography, 
  Box, 
  Alert,
  CircularProgress,
  Breadcrumbs,
  Link,
  Button,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  EmojiEvents as TrophyIcon,
  Person as PersonIcon,
  Pets as PetsIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';
import ClassScoringForm from '../components/ClassScoringForm';
import { ScoringErrorBoundary } from '../components/ScoringErrorBoundary';
import { NetworkErrorHandler } from '../components/NetworkErrorHandler';
import { parseError, getUserFriendlyMessage, logError, withRetry, handleOptimisticLockConflict } from '../utils/errorHandling';
import { isJudge, getUserRole } from '../utils/roleUtils';

const client = generateClient();

// GraphQL queries for class scoring
const getCatById = `
  query GetCat($id: ID!) {
    getCat(id: $id) {
      id
      name
      owner
      cageNumber
      votes
      ownerAgeGroup
      catAgeGroup
    }
  }
`;

const getCatByCage = `
  query GetCatByCage($cageNumber: Int!) {
    getCatByCage(cageNumber: $cageNumber) {
      id
      name
      owner
      cageNumber
      votes
      ownerAgeGroup
      catAgeGroup
    }
  }
`;

const getClassScoresByCat = `
  query GetClassScoresByCat($catId: ID!) {
    getClassScoresByCat(catId: $catId) {
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
      }
    }
  }
`;

const createClassScore = `
  mutation CreateClassScore($input: CreateClassScoreInput!) {
    createClassScore(input: $input) {
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
`;

const ClassScoringContainer = styled(Container)(({ theme }) => ({
  marginTop: theme.spacing(3),
  marginBottom: theme.spacing(3),
}));

const ClassScoringPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  backgroundColor: '#f8f9ff', // Light blue background to distinguish from cage scoring
  border: '2px solid #1976d2', // Blue border
}));

const ClassScoringHeader = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  padding: theme.spacing(2),
  backgroundColor: '#1976d2',
  color: 'white',
  borderRadius: theme.shape.borderRadius,
}));

interface Cat {
  id: string;
  name: string;
  owner: string;
  cageNumber: number;
  votes: number;
  ownerAgeGroup?: string;
  catAgeGroup?: string;
}

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
}

const ClassScorePage: React.FC = () => {
  const { catId, cageNumber } = useParams<{ catId?: string; cageNumber?: string }>();
  const navigate = useNavigate();
  const [cat, setCat] = useState<Cat | null>(null);
  const [existingClassScore, setExistingClassScore] = useState<ClassScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<any>(null);
  const [judge, setJudge] = useState<any>(null);
  const [hasClassScorePermission, setHasClassScorePermission] = useState<boolean>(false);

  const checkClassScorePermission = async (): Promise<boolean> => {
    try {
      const userRole = await getUserRole();
      const judgeCheck = await isJudge();
      console.log('Class score permission check:', {
        userRole,
        judgeCheck,
        currentUser: judge
      });
      return judgeCheck;
    } catch (error) {
      console.error('Error checking class score permission:', error);
      return false;
    }
  };

  useEffect(() => {
    initializePage();
  }, [catId, cageNumber]);

  const initializePage = async () => {
    try {
      setLoading(true);
      setError(null);

      // Wait a bit to ensure Amplify is fully configured
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify judge authentication
      let currentUser: any;
      try {
        currentUser = await getCurrentUser();
      } catch (authError) {
        console.error('Authentication error:', authError);
        logError(authError, 'ClassScorePage.initializePage.auth');
        setError('Authentication required. Please log in as a judge to access class scoring.');
        return;
      }
      
      if (!currentUser) {
        console.error('No current user found');
        setError('Authentication required. Please log in as a judge to access class scoring.');
        return;
      }

      console.log('Current user authenticated:', { userId: currentUser.userId, username: currentUser.username });

      // Check if user has judge role and class scoring permissions
      setJudge(currentUser);
      const hasPermission = await checkClassScorePermission();
      setHasClassScorePermission(hasPermission);

      if (!hasPermission) {
        setError('Access denied. Only judges can access class scoring.');
        return;
      }

      // Validate parameters
      if (!catId && !cageNumber) {
        setError('No cat ID or cage number provided.');
        return;
      }

      if (cageNumber && isNaN(parseInt(cageNumber))) {
        setError('Invalid cage number provided.');
        return;
      }

      // Fetch cat data
      let catResult: any;
      if (catId) {
        console.log('Fetching cat data by ID:', catId);
        const fetchCatWithRetry = withRetry(async () => {
          return await client.graphql({
            query: getCatById,
            variables: { id: catId }
          });
        }, { maxRetries: 2 });

        catResult = await fetchCatWithRetry();
        
        if (!catResult.data?.getCat) {
          setError(`No cat found with ID ${catId}. Please verify the cat ID.`);
          return;
        }
        
        setCat(catResult.data.getCat);
      } else if (cageNumber) {
        console.log('Fetching cat data by cage number:', cageNumber);
        const fetchCatWithRetry = withRetry(async () => {
          return await client.graphql({
            query: getCatByCage,
            variables: { cageNumber: parseInt(cageNumber) }
          });
        }, { maxRetries: 2 });

        catResult = await fetchCatWithRetry();
        
        if (!catResult.data?.getCatByCage) {
          setError(`No cat found in cage ${cageNumber}. Please verify the cage number.`);
          return;
        }
        
        setCat(catResult.data.getCatByCage);
      }

      const catData = catResult.data?.getCat || catResult.data?.getCatByCage;
      
      // Ensure we have a valid authenticated user before making class score queries
      if (!currentUser || !currentUser.userId) {
        setError('Authentication required. Please log in as a judge to access class scoring.');
        return;
      }
      
      // Fetch existing class scores for this cat
      console.log('Fetching class scores for cat:', catData.id);
      const classScoresResult = await client.graphql({
        query: getClassScoresByCat,
        variables: { catId: catData.id }
      });

      // Find the current judge's class score if it exists
      const currentJudgeClassScore = classScoresResult.data?.getClassScoresByCat?.items?.find(
        (score: ClassScore) => score.judgeId === currentUser.userId
      );

      if (currentJudgeClassScore) {
        setExistingClassScore(currentJudgeClassScore);
      }

    } catch (err) {
      console.error('ClassScorePage initialization error:', err);
      logError(err, 'ClassScorePage.initializePage');
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

  const handleSave = async (classScoreData: any) => {
    try {
      setSaving(true);
      setError(null);

      await handleOptimisticLockConflict(
        async () => {
          const saveWithRetry = withRetry(async () => {
            return await client.graphql({
              query: createClassScore,
              variables: { input: classScoreData }
            });
          }, { maxRetries: 2 });
          
          return await saveWithRetry();
        },
        async () => {
          // On conflict, refresh the page data to get latest version
          await initializePage();
        }
      );

      // Refresh the page data to show the saved class score
      await initializePage();
      
    } catch (err) {
      logError(err, 'ClassScorePage.handleSave');
      const parsedError = parseError(err);
      
      if (parsedError.error.type === 'NETWORK_ERROR' || parsedError.error.type === 'TIMEOUT_ERROR') {
        setNetworkError(err);
      } else {
        const userMessage = getUserFriendlyMessage(parsedError);
        setError(userMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (classScoreData: any) => {
    try {
      setSaving(true);
      setError(null);

      await handleOptimisticLockConflict(
        async () => {
          const submitWithRetry = withRetry(async () => {
            return await client.graphql({
              query: createClassScore,
              variables: { input: { ...classScoreData, isFinalized: true } }
            });
          }, { maxRetries: 2 });
          
          return await submitWithRetry();
        },
        async () => {
          // On conflict, refresh the page data to get latest version
          await initializePage();
        }
      );

      // Navigate back to scoring dashboard with success message
      navigate('/scoring', { 
        state: { 
          message: `Class score submitted successfully for ${cat?.name}!` 
        }
      });
      
    } catch (err) {
      logError(err, 'ClassScorePage.handleSubmit');
      const parsedError = parseError(err);
      
      if (parsedError.error.type === 'NETWORK_ERROR' || parsedError.error.type === 'TIMEOUT_ERROR') {
        setNetworkError(err);
      } else {
        const userMessage = getUserFriendlyMessage(parsedError);
        setError(userMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleNetworkRetry = async () => {
    setNetworkError(null);
    await initializePage();
  };

  if (loading) {
    return (
      <ScoringErrorBoundary>
        <ClassScoringContainer maxWidth="lg">
          <ClassScoringPaper elevation={4}>
            <ClassScoringHeader>
              <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', mb: 1 }}>
                🏆 Type Class Scoring System
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Loading class scoring page...
              </Typography>
            </ClassScoringHeader>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <CircularProgress size={60} sx={{ mb: 2, color: '#1976d2' }} />
                <Typography variant="h5" gutterBottom sx={{ color: '#1976d2' }}>
                  Preparing class scoring interface...
                </Typography>
                <TrophyIcon sx={{ fontSize: 40, color: '#1976d2', opacity: 0.7 }} />
              </CardContent>
            </Card>
          </ClassScoringPaper>
        </ClassScoringContainer>
      </ScoringErrorBoundary>
    );
  }

  if (error) {
    return (
      <ScoringErrorBoundary>
        <ClassScoringContainer maxWidth="lg">
          <ClassScoringPaper elevation={4}>
            <ClassScoringHeader>
              <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', mb: 1 }}>
                🏆 Type Class Scoring System
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Error accessing class scoring
              </Typography>
            </ClassScoringHeader>
            <Card sx={{ background: 'white', border: '3px solid #f44336' }}>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <Typography variant="h4" sx={{ color: '#f44336', mb: 2 }}>
                  🚫 Access Error
                </Typography>
                <Typography variant="body1" sx={{ color: '#f44336', mb: 3, fontSize: '1.1rem' }}>
                  {error}
                </Typography>
                <Button 
                  variant="contained"
                  onClick={() => navigate('/scoring')}
                  startIcon={<ArrowBackIcon />}
                  sx={{ 
                    backgroundColor: '#1976d2',
                    '&:hover': { backgroundColor: '#1565c0' },
                    padding: '12px 24px',
                    fontSize: '1rem'
                  }}
                >
                  Return to Scoring Dashboard
                </Button>
              </CardContent>
            </Card>
          </ClassScoringPaper>
        </ClassScoringContainer>
      </ScoringErrorBoundary>
    );
  }

  if (!cat) {
    return (
      <ScoringErrorBoundary>
        <ClassScoringContainer maxWidth="lg">
          <ClassScoringPaper elevation={4}>
            <ClassScoringHeader>
              <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', mb: 1 }}>
                🏆 Type Class Scoring System
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Cat not found
              </Typography>
            </ClassScoringHeader>
            <Card sx={{ background: 'white', border: '3px solid #ff9800' }}>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <Typography variant="h4" sx={{ color: '#ff9800', mb: 2 }}>
                  🔍 Cat Not Found
                </Typography>
                <Typography variant="body1" sx={{ mb: 3, fontSize: '1.1rem' }}>
                  No cat found {catId ? `with ID ${catId}` : `in cage ${cageNumber}`}.
                </Typography>
                <Button 
                  variant="contained"
                  onClick={() => navigate('/scoring')}
                  startIcon={<ArrowBackIcon />}
                  sx={{ 
                    backgroundColor: '#1976d2',
                    '&:hover': { backgroundColor: '#1565c0' },
                    padding: '12px 24px',
                    fontSize: '1rem'
                  }}
                >
                  Return to Scoring Dashboard
                </Button>
              </CardContent>
            </Card>
          </ClassScoringPaper>
        </ClassScoringContainer>
      </ScoringErrorBoundary>
    );
  }

  return (
    <ScoringErrorBoundary>
      <ClassScoringContainer maxWidth="lg">
        {/* Network Error Handler */}
        {networkError && (
          <NetworkErrorHandler
            error={networkError}
            onRetry={handleNetworkRetry}
            onCancel={() => setNetworkError(null)}
          />
        )}

        <ClassScoringPaper elevation={4}>
          {/* Type Class Scoring Breadcrumbs */}
          <Box sx={{ mb: 3 }}>
            <Breadcrumbs 
              separator="›" 
              sx={{ 
                '& .MuiBreadcrumbs-separator': { color: '#1976d2', fontWeight: 'bold' },
                mb: 2
              }}
            >
              <Link
                component="button"
                variant="body1"
                onClick={() => navigate('/scoring')}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  color: '#1976d2',
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' },
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 500
                }}
              >
                <TrophyIcon sx={{ mr: 1 }} />
                Scoring Dashboard
              </Link>
              <Typography color="text.primary" sx={{ fontWeight: 600 }}>
                Type Class Scoring
              </Typography>
            </Breadcrumbs>
          </Box>

          {/* Type Class Scoring Header */}
          <ClassScoringHeader>
            <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', mb: 1 }}>
              🏆 Type Class Scoring System
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              Professional judging for class competition - Beauty, Personality & Balance/Proportion
            </Typography>
          </ClassScoringHeader>



            {/* Cat & Judge Information */}
            <Card 
              elevation={3} 
              sx={{ 
                mb: 3, 
                backgroundColor: 'white',
                border: '3px solid #1976d2',
                borderRadius: '15px',
                boxShadow: '0 8px 16px rgba(25, 118, 210, 0.15)'
              }}
            >
              <CardContent sx={{ padding: '25px' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <PetsIcon sx={{ mr: 1, color: '#1976d2', fontSize: '2rem' }} />
                      <Typography variant="h4" sx={{ color: '#1976d2', fontWeight: 600 }}>
                        {cat.name}
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                      gap: 3,
                      background: 'linear-gradient(135deg, #f8fbff, #f3f8ff)',
                      padding: '20px',
                      borderRadius: '12px',
                      border: '2px solid #e3f2fd'
                    }}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ color: '#1976d2', fontWeight: 600, mb: 1 }}>Owner</Typography>
                        <Typography variant="body1" fontWeight="bold" sx={{ color: '#333' }}>{cat.owner}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" sx={{ color: '#1976d2', fontWeight: 600, mb: 1 }}>Cage Number</Typography>
                        <Typography variant="body1" fontWeight="bold" sx={{ color: '#333' }}>{cat.cageNumber}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" sx={{ color: '#1976d2', fontWeight: 600, mb: 1 }}>Class Category</Typography>
                        <Typography variant="body1" fontWeight="bold" sx={{ color: '#333' }}>
                          {cat.catAgeGroup || cat.ownerAgeGroup || 'Household Pet'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" sx={{ color: '#1976d2', fontWeight: 600, mb: 1 }}>Current Votes</Typography>
                        <Typography variant="body1" fontWeight="bold" sx={{ color: '#333' }}>{cat.votes}</Typography>
                      </Box>
                    </Box>
                  </Box>
                  
                  <Box sx={{ 
                    ml: 3, 
                    textAlign: 'right',
                    background: 'linear-gradient(135deg, #e3f2fd, #f3f8ff)',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '2px solid #bbdefb'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, justifyContent: 'flex-end' }}>
                      <PersonIcon sx={{ mr: 1, color: '#1976d2' }} />
                      <Typography variant="h6" sx={{ color: '#1976d2', fontWeight: 600 }}>Judge Session</Typography>
                    </Box>
                    <Typography variant="body2" gutterBottom sx={{ color: '#333' }}>
                      <strong>Judge:</strong> {judge?.signInDetails?.loginId || judge?.username || 'Unknown'}
                    </Typography>
                    <Typography variant="body2" gutterBottom sx={{ color: '#333' }}>
                      <strong>Time:</strong> {new Date().toLocaleTimeString()}
                    </Typography>
                    <Chip
                      label={hasClassScorePermission ? '🏆 Can Score' : '👁️ View Only'}
                      color={hasClassScorePermission ? 'success' : 'error'}
                      size="medium"
                      sx={{ 
                        mt: 1,
                        fontWeight: 600,
                        fontSize: '0.9rem'
                      }}
                    />
                  </Box>
                </Box>
                
                {existingClassScore && (
                  <Alert 
                    severity="warning" 
                    sx={{ 
                      mt: 2,
                      borderRadius: '10px',
                      border: '2px solid #ff9800',
                      '& .MuiAlert-message': {
                        fontSize: '1rem'
                      }
                    }}
                  >
                    <strong>📝 Note:</strong> You have already scored this cat for class competition. 
                    {existingClassScore.isFinalized 
                      ? ' Your class score has been finalized.' 
                      : ' You can modify your draft class score below.'
                    }
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Type Class Scoring Form */}
            <ClassScoringForm 
              catData={cat}
              existingScore={existingClassScore}
              onSave={handleSave}
              onSubmit={handleSubmit}
              loading={saving}
              hasPermission={hasClassScorePermission}
            />

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                <strong>Error:</strong> {error}
              </Alert>
            )}
        </ClassScoringPaper>
      </ClassScoringContainer>
    </ScoringErrorBoundary>
  );
};

export default ClassScorePage;