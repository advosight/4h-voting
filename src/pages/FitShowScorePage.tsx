import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Box,
  Alert,
  Grid,
  CircularProgress,
  Chip,
  Paper,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  School as FitShowIcon,
  Person as PersonIcon,
  Pets as PetsIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';
import { FitShowScoringForm } from '../components/FitShowScoringForm';
import { FitShowScoringErrorBoundary } from '../components/FitShowScoringErrorBoundary';
import { CreateFitShowScoreInput } from '../types/scoring';
import { parseError, getUserFriendlyMessage, logError } from '../utils/errorHandling';

const client = generateClient();

const FitShowScoringContainer = styled(Container)(({ theme }) => ({
  marginTop: theme.spacing(3),
  marginBottom: theme.spacing(3),
}));

const FitShowScoringPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  backgroundColor: '#fff8f0', // Light orange background to distinguish from other scoring types
  border: '2px solid #ff9800', // Orange border
}));

const FitShowScoringHeader = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  padding: theme.spacing(2),
  backgroundColor: '#ff9800',
  color: 'white',
  borderRadius: theme.shape.borderRadius,
}));

const getCat = `
  query GetCat($id: ID!) {
    getCat(id: $id) {
      id
      name
      owner
      cageNumber
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
      ownerAgeGroup
      catAgeGroup
    }
  }
`;

function FitShowScorePage(): JSX.Element {
  const { catId, cageNumber } = useParams<{ catId?: string; cageNumber?: string }>();
  const navigate = useNavigate();
  const [cat, setCat] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadCatAndUser();
  }, [catId, cageNumber]);

  const loadCatAndUser = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load current user
      const user = await getCurrentUser();
      setCurrentUser(user);

      // Load cat data
      let catData: any;
      if (catId) {
        const result = await client.graphql({
          query: getCat,
          variables: { id: catId }
        });
        catData = (result as any).data.getCat;
      } else if (cageNumber) {
        const result = await client.graphql({
          query: getCatByCage,
          variables: { cageNumber: parseInt(cageNumber) }
        });
        catData = (result as any).data.getCatByCage;
      }

      if (!catData) {
        throw new Error(catId ? `Cat with ID ${catId} not found` : `No cat found in cage ${cageNumber}`);
      }

      setCat(catData);
    } catch (err) {
      console.error('Error loading cat data:', err);
      const errorMessage = parseError(err);
      setError(getUserFriendlyMessage(errorMessage));
      logError(err, `FitShowScorePage.loadCatAndUser - catId: ${catId}, cageNumber: ${cageNumber}`);
    } finally {
      setLoading(false);
    }
  };

  const handleScoreSubmit = async (scoreData: CreateFitShowScoreInput) => {
    try {
      // The FitShowScoringForm handles the actual submission
      console.log('Score submitted successfully:', scoreData);
      // Navigate back to fit & show scoring page after successful submission
      navigate('/fit-show-scoring');
    } catch (err) {
      console.error('Error submitting score:', err);
      throw err; // Let the form handle the error display
    }
  };

  const handleBack = () => {
    navigate('/fit-show-scoring');
  };

  if (loading) {
    return (
      <FitShowScoringErrorBoundary>
        <FitShowScoringContainer maxWidth="lg">
          <FitShowScoringPaper elevation={4}>
            <FitShowScoringHeader>
              <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', mb: 1 }}>
                🎓 Fit & Show Scoring System
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Loading fit & show scoring page...
              </Typography>
            </FitShowScoringHeader>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <CircularProgress size={60} sx={{ mb: 2, color: '#ff9800' }} />
                <Typography variant="h5" gutterBottom sx={{ color: '#ff9800' }}>
                  Preparing fit & show scoring interface...
                </Typography>
                <FitShowIcon sx={{ fontSize: 40, color: '#ff9800', opacity: 0.7 }} />
              </CardContent>
            </Card>
          </FitShowScoringPaper>
        </FitShowScoringContainer>
      </FitShowScoringErrorBoundary>
    );
  }

  if (error) {
    return (
      <FitShowScoringErrorBoundary>
        <FitShowScoringContainer maxWidth="lg">
          <FitShowScoringPaper elevation={4}>
            <FitShowScoringHeader>
              <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', mb: 1 }}>
                🎓 Fit & Show Scoring System
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Error accessing fit & show scoring
              </Typography>
            </FitShowScoringHeader>
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
                  onClick={handleBack}
                  startIcon={<ArrowBackIcon />}
                  sx={{ 
                    backgroundColor: '#ff9800',
                    '&:hover': { backgroundColor: '#f57c00' },
                    padding: '12px 24px',
                    fontSize: '1rem'
                  }}
                >
                  Back to Fit & Show Scoring
                </Button>
              </CardContent>
            </Card>
          </FitShowScoringPaper>
        </FitShowScoringContainer>
      </FitShowScoringErrorBoundary>
    );
  }

  if (!cat) {
    return (
      <FitShowScoringErrorBoundary>
        <FitShowScoringContainer maxWidth="lg">
          <FitShowScoringPaper elevation={4}>
            <FitShowScoringHeader>
              <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', mb: 1 }}>
                🎓 Fit & Show Scoring System
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Cat not found
              </Typography>
            </FitShowScoringHeader>
            <Card sx={{ background: 'white', border: '3px solid #ff9800' }}>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <Typography variant="h4" sx={{ color: '#ff9800', mb: 2 }}>
                  🔍 Cat Not Found
                </Typography>
                <Typography variant="body1" sx={{ mb: 3, fontSize: '1.1rem' }}>
                  {catId ? `No cat found with ID: ${catId}` : `No cat found in cage: ${cageNumber}`}
                </Typography>
                <Button 
                  variant="contained"
                  onClick={handleBack}
                  startIcon={<ArrowBackIcon />}
                  sx={{ 
                    backgroundColor: '#ff9800',
                    '&:hover': { backgroundColor: '#f57c00' },
                    padding: '12px 24px',
                    fontSize: '1rem'
                  }}
                >
                  Back to Fit & Show Scoring
                </Button>
              </CardContent>
            </Card>
          </FitShowScoringPaper>
        </FitShowScoringContainer>
      </FitShowScoringErrorBoundary>
    );
  }

  return (
    <FitShowScoringErrorBoundary>
      <FitShowScoringContainer maxWidth="lg">
        <FitShowScoringPaper elevation={4}>
          {/* Fit & Show Scoring Breadcrumbs */}
          <Box sx={{ mb: 3 }}>
            <Breadcrumbs 
              separator="›" 
              sx={{ 
                '& .MuiBreadcrumbs-separator': { color: '#ff9800', fontWeight: 'bold' },
                mb: 2
              }}
            >
              <Link
                component="button"
                variant="body1"
                onClick={() => navigate('/fit-show-scoring')}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  color: '#ff9800',
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' },
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 500
                }}
              >
                <FitShowIcon sx={{ mr: 1 }} />
                Fit & Show Scoring
              </Link>
              <Typography color="text.primary" sx={{ fontWeight: 600 }}>
                Individual Scoring
              </Typography>
            </Breadcrumbs>
          </Box>

          {/* Fit & Show Scoring Header */}
          <FitShowScoringHeader>
            <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', mb: 1 }}>
              🎓 Fit & Show Scoring System
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              Professional evaluation of showmanship, handling, knowledge, and care demonstration
            </Typography>
          </FitShowScoringHeader>

          {/* Cat & Judge Information */}
          <Card 
            elevation={3} 
            sx={{ 
              mb: 3, 
              backgroundColor: 'white',
              border: '3px solid #ff9800',
              borderRadius: '15px',
              boxShadow: '0 8px 16px rgba(255, 152, 0, 0.15)'
            }}
          >
            <CardContent sx={{ padding: '25px' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PetsIcon sx={{ mr: 1, color: '#ff9800', fontSize: '2rem' }} />
                    <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 600 }}>
                      {cat.name}
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: 3,
                    background: 'linear-gradient(135deg, #fff8f0, #fff3e0)',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '2px solid #ffe0b2'
                  }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ color: '#ff9800', fontWeight: 600, mb: 1 }}>Owner</Typography>
                      <Typography variant="body1" fontWeight="bold" sx={{ color: '#333' }}>{cat.owner}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ color: '#ff9800', fontWeight: 600, mb: 1 }}>Cage Number</Typography>
                      <Typography variant="body1" fontWeight="bold" sx={{ color: '#333' }}>{cat.cageNumber}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ color: '#ff9800', fontWeight: 600, mb: 1 }}>Age Groups</Typography>
                      <Typography variant="body1" fontWeight="bold" sx={{ color: '#333' }}>
                        Owner: {cat.ownerAgeGroup || 'Unknown'} | Cat: {cat.catAgeGroup || 'Unknown'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ color: '#ff9800', fontWeight: 600, mb: 1 }}>Evaluation Type</Typography>
                      <Typography variant="body1" fontWeight="bold" sx={{ color: '#333' }}>Fit & Show</Typography>
                    </Box>
                  </Box>
                </Box>
                
                <Box sx={{ 
                  ml: 3, 
                  textAlign: 'right',
                  background: 'linear-gradient(135deg, #fff3e0, #fff8f0)',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '2px solid #ffcc80'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, justifyContent: 'flex-end' }}>
                    <PersonIcon sx={{ mr: 1, color: '#ff9800' }} />
                    <Typography variant="h6" sx={{ color: '#ff9800', fontWeight: 600 }}>Judge Session</Typography>
                  </Box>
                  <Typography variant="body2" gutterBottom sx={{ color: '#333' }}>
                    <strong>Judge:</strong> {currentUser?.signInDetails?.loginId || 'Unknown'}
                  </Typography>
                  <Typography variant="body2" gutterBottom sx={{ color: '#333' }}>
                    <strong>Time:</strong> {new Date().toLocaleTimeString()}
                  </Typography>
                  <Chip
                    label="🎓 Fit & Show Judge"
                    color="warning"
                    size="medium"
                    sx={{ 
                      mt: 1,
                      fontWeight: 600,
                      fontSize: '0.9rem'
                    }}
                  />
                </Box>
              </Box>
              
              <Alert 
                severity="info" 
                sx={{ 
                  mt: 2,
                  borderRadius: '10px',
                  border: '2px solid #ff9800',
                  backgroundColor: '#fff3e0',
                  '& .MuiAlert-message': {
                    fontSize: '1rem'
                  }
                }}
              >
                <strong>🎓 Fit & Show Evaluation:</strong> Assess showmanship, handling, knowledge, and overall care demonstration. 
                Focus on the participant's ability to present their cat and demonstrate proper care techniques.
              </Alert>
            </CardContent>
          </Card>

          {/* Scoring Form */}
          <FitShowScoringForm
            catId={cat.id}
            participantName={cat.owner}
            judgeId={currentUser?.userId || 'unknown'}
            judgeName={currentUser?.signInDetails?.loginId || 'Judge'}
            onScoreSubmitted={handleScoreSubmit}
            onError={(error) => {
              console.error('Scoring form error:', error);
              setError(error);
            }}
          />

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <strong>Error:</strong> {error}
            </Alert>
          )}
        </FitShowScoringPaper>
      </FitShowScoringContainer>
    </FitShowScoringErrorBoundary>
  );
}

export default FitShowScorePage;