import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Slider,
  Paper,
  Alert,
  Divider,
  Chip,
  Avatar,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Save as SaveIcon,
  Check as CheckIcon,
  Assessment as AssessmentIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';
import type { Score, CreateScoreInput, UpdateScoreInput, Cat } from '../types/scoring';

const client = generateClient();

interface CageScoringFormProps {
  cat: Cat;
  existingScore?: Score;
  onScoreSubmitted: (score: Score) => void;
  onCancel: () => void;
}

const CAGE_SCORING_CATEGORIES = [
  {
    field: 'firstImpressionScore',
    label: 'First Impression',
    maxPoints: 10,
    description: 'Initial visual impact and overall presentation'
  },
  {
    field: 'originalityScore',
    label: 'Originality',
    maxPoints: 15,
    description: 'Creativity and uniqueness of cage decoration'
  },
  {
    field: 'informationCardScore',
    label: 'Information Card',
    maxPoints: 15,
    description: 'Quality and completeness of information display'
  },
  {
    field: 'workDoneByMemberScore',
    label: 'Work Done by Member',
    maxPoints: 15,
    description: 'Evidence of member participation and effort'
  },
  {
    field: 'basicComfortScore',
    label: 'Basic Comfort',
    maxPoints: 15,
    description: 'Cat comfort and welfare considerations'
  },
  {
    field: 'safetyScore',
    label: 'Safety',
    maxPoints: 15,
    description: 'Safety measures and hazard prevention'
  },
  {
    field: 'easyViewOfCatScore',
    label: 'Easy View of Cat',
    maxPoints: 15,
    description: 'Visibility and accessibility for viewing the cat'
  }
];

const createScore = `
  mutation CreateScore($input: CreateScoreInput!) {
    createScore(input: $input) {
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

const updateScore = `
  mutation UpdateScore($id: ID!, $input: UpdateScoreInput!) {
    updateScore(id: $id, input: $input) {
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

function CageScoringForm({ cat, existingScore, onScoreSubmitted, onCancel }: CageScoringFormProps): JSX.Element {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [scores, setScores] = useState<Record<string, number>>(() => {
    // If editing existing score, use existing values; otherwise default to max points
    const defaultScores: Record<string, number> = {};
    CAGE_SCORING_CATEGORIES.forEach(category => {
      defaultScores[category.field] = existingScore?.[category.field as keyof Score] as number || category.maxPoints;
    });
    return defaultScores;
  });



  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [judgeInfo, setJudgeInfo] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    loadJudgeInfo();
  }, []);

  const loadJudgeInfo = async () => {
    try {
      const user = await getCurrentUser();
      setJudgeInfo({
        id: user.userId,
        name: user.signInDetails?.loginId || 'Unknown Judge'
      });
    } catch (error) {
      console.error('Error loading judge info:', error);
      setError('Unable to load judge information');
    }
  };

  const calculateTotalScore = () => {
    return Object.values(scores).reduce((total, score) => total + score, 0);
  };

  const handleScoreChange = (field: string, value: number) => {
    setScores(prev => ({ ...prev, [field]: value }));
  };



  const handleSubmit = async (finalize: boolean = false) => {
    if (!judgeInfo) {
      setError('Judge information not available');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const totalScore = calculateTotalScore();

      if (existingScore) {
        // Update existing score
        const input: UpdateScoreInput = {
          ...scores,
          isFinalized: finalize,
        };

        const result = await client.graphql({
          query: updateScore,
          variables: {
            id: existingScore.id,
            input
          }
        });

        if ('data' in result && result.data?.updateScore) {
          onScoreSubmitted(result.data.updateScore);
        }
      } else {
        // Create new score
        const input: CreateScoreInput = {
          catId: cat.id,
          ...scores,
          isFinalized: finalize,
        };

        const result = await client.graphql({
          query: createScore,
          variables: { input }
        });

        if ('data' in result && result.data?.createScore) {
          onScoreSubmitted(result.data.createScore);
        }
      }
    } catch (error) {
      console.error('Error submitting score:', error);
      setError('Failed to submit score. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalScore = calculateTotalScore();
  const maxTotalScore = CAGE_SCORING_CATEGORIES.reduce((sum, cat) => sum + cat.maxPoints, 0);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: isMobile ? 1 : 3 }}>
      {/* Header */}
      <Paper elevation={3} sx={{ p: 3, mb: 3, bgcolor: '#f8f9fa', border: '2px solid #28a745' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar sx={{ bgcolor: '#28a745', width: 56, height: 56 }}>
            <AssessmentIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h4" sx={{ color: '#28a745', fontWeight: 'bold' }}>
              Cage Scoring - {cat.name}
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Cage #{cat.cageNumber} • Owner: {cat.owner}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip
            icon={<StarIcon />}
            label={`Total Score: ${totalScore}/${maxTotalScore}`}
            color="success"
            variant="filled"
            sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}
          />
          {existingScore && (
            <Chip
              label={existingScore.isFinalized ? 'Finalized' : 'Draft'}
              color={existingScore.isFinalized ? 'success' : 'warning'}
              variant="outlined"
            />
          )}
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Scoring Categories */}
      <Grid container spacing={3}>
        {CAGE_SCORING_CATEGORIES.map((category) => (
          <Grid size={{ xs: 12, md: 6 }} key={category.field}>
            <Card elevation={2} sx={{ height: '100%', border: '1px solid #e0e0e0' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ color: '#28a745', fontWeight: 'bold' }}>
                    {category.label}
                  </Typography>
                  <Chip
                    label={`${scores[category.field]}/${category.maxPoints}`}
                    color="success"
                    variant="outlined"
                    sx={{ fontWeight: 'bold' }}
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {category.description}
                </Typography>

                <Box sx={{ px: 2 }}>
                  <Slider
                    value={scores[category.field]}
                    onChange={(_, value) => handleScoreChange(category.field, value as number)}
                    min={1}
                    max={category.maxPoints}
                    step={1}
                    marks
                    valueLabelDisplay="auto"
                    sx={{
                      color: '#28a745',
                      '& .MuiSlider-thumb': {
                        backgroundColor: '#28a745',
                      },
                      '& .MuiSlider-track': {
                        backgroundColor: '#28a745',
                      },
                      '& .MuiSlider-rail': {
                        backgroundColor: '#e0e0e0',
                      },
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Total Score Summary */}
      <Paper elevation={3} sx={{ p: 3, mt: 4, bgcolor: '#f8f9fa', border: '2px solid #28a745' }}>
        <Typography variant="h5" sx={{ color: '#28a745', fontWeight: 'bold', mb: 2 }}>
          Score Summary
        </Typography>
        <Grid container spacing={2}>
          {CAGE_SCORING_CATEGORIES.map((category) => (
            <Grid size={{ xs: 6, sm: 4, md: 3 }} key={category.field}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  {category.label}
                </Typography>
                <Typography variant="h6" sx={{ color: '#28a745', fontWeight: 'bold' }}>
                  {scores[category.field]}/{category.maxPoints}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
        <Divider sx={{ my: 2 }} />
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h4" sx={{ color: '#28a745', fontWeight: 'bold' }}>
            Total: {totalScore}/{maxTotalScore}
          </Typography>
        </Box>
      </Paper>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, mt: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          color="inherit"
          onClick={onCancel}
          disabled={isSubmitting}
          size="large"
        >
          Cancel
        </Button>
        <Button
          variant="outlined"
          color="success"
          onClick={() => handleSubmit(false)}
          disabled={isSubmitting}
          startIcon={<SaveIcon />}
          size="large"
        >
          Save Draft
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={() => handleSubmit(true)}
          disabled={isSubmitting}
          startIcon={<CheckIcon />}
          size="large"
          sx={{ fontWeight: 'bold' }}
        >
          Finalize Score
        </Button>
      </Box>
    </Box>
  );
}

export default CageScoringForm;