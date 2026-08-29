import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Grid,
  Paper,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Check as CheckIcon } from '@mui/icons-material';
import { ClassBeautyScoring } from './ClassBeautyScoring';
import { ClassPersonalityScoring } from './ClassPersonalityScoring';
import { ClassBalanceProportionScoring } from './ClassBalanceProportionScoring';
import { ClassConditionHealthScoring } from './ClassConditionHealthScoring';

interface ClassScore {
  id?: string;
  catId: string;
  catName: string;
  participantName: string;
  judgeId: string;
  judgeName: string;
  beautyScore: number;
  beautyComments?: string;
  personalityScore: number;
  personalityComments?: string;
  balanceProportionScore: number;
  balanceProportionComments?: string;
  coatCleanGroomed: number;
  teethGumsHealthy: number;
  eyesNoseClear: number;
  earsCleanMiteFree: number;
  toenailsClipped: number;
  fleaIssues: boolean;
  conditionHealthComments?: string;
  totalScore: number;
  ribbonEligibility: string;
  createdAt?: string;
  updatedAt?: string;
  isFinalized: boolean;
}

interface ClassScoringFormProps {
  catId: string;
  catName: string;
  participantName: string;
  judgeId: string;
  judgeName: string;
  existingScore?: ClassScore;
  onScoreSubmitted?: (score: ClassScore) => void;
  onError?: (error: string) => void;
}

interface ClassScoreData {
  beautyScore: number;
  beautyComments: string;
  personalityScore: number;
  personalityComments: string;
  balanceProportionScore: number;
  balanceProportionComments: string;
  coatCleanGroomed: number;
  teethGumsHealthy: number;
  eyesNoseClear: number;
  earsCleanMiteFree: number;
  toenailsClipped: number;
  fleaIssues: boolean;
  conditionHealthComments: string;
}

const initialScoreData: ClassScoreData = {
  // All scores default to maximum (judges deduct points)
  beautyScore: 15,
  beautyComments: '',
  personalityScore: 20,
  personalityComments: '',
  balanceProportionScore: 15,
  balanceProportionComments: '',
  coatCleanGroomed: 15,
  teethGumsHealthy: 5,
  eyesNoseClear: 5,
  earsCleanMiteFree: 10,
  toenailsClipped: 15,
  fleaIssues: false,
  conditionHealthComments: ''
};

const calculateRibbonEligibility = (totalScore: number, fleaIssues: boolean): string => {
  if (fleaIssues) {
    return 'Red';
  }
  if (totalScore >= 90 && totalScore <= 100) {
    return 'Blue';
  } else if (totalScore >= 70 && totalScore <= 89) {
    return 'Red';
  } else if (totalScore >= 50 && totalScore <= 69) {
    return 'White';
  } else {
    return 'Participation';
  }
};

export const ClassScoringForm: React.FC<ClassScoringFormProps> = ({
  catId,
  catName,
  participantName,
  judgeId,
  judgeName,
  existingScore,
  onScoreSubmitted,
  onError
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [scoreData, setScoreData] = useState<ClassScoreData>(initialScoreData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitted' | 'success' | 'error'>('idle');

  // Initialize form with existing score data
  useEffect(() => {
    if (existingScore) {
      setScoreData({
        beautyScore: existingScore.beautyScore,
        beautyComments: existingScore.beautyComments || '',
        personalityScore: existingScore.personalityScore,
        personalityComments: existingScore.personalityComments || '',
        balanceProportionScore: existingScore.balanceProportionScore,
        balanceProportionComments: existingScore.balanceProportionComments || '',
        coatCleanGroomed: existingScore.coatCleanGroomed,
        teethGumsHealthy: existingScore.teethGumsHealthy,
        eyesNoseClear: existingScore.eyesNoseClear,
        earsCleanMiteFree: existingScore.earsCleanMiteFree,
        toenailsClipped: existingScore.toenailsClipped,
        fleaIssues: existingScore.fleaIssues,
        conditionHealthComments: existingScore.conditionHealthComments || ''
      });
    }
  }, [existingScore]);

  // Calculate category totals
  const calculateCategoryTotals = useCallback(() => {
    const beautyTotal = scoreData.beautyScore;
    const personalityTotal = scoreData.personalityScore;
    const balanceProportionTotal = scoreData.balanceProportionScore;
    const conditionHealthTotal = scoreData.coatCleanGroomed + scoreData.teethGumsHealthy +
      scoreData.eyesNoseClear + scoreData.earsCleanMiteFree + scoreData.toenailsClipped;
    const totalScore = beautyTotal + personalityTotal + balanceProportionTotal + conditionHealthTotal;

    return {
      beautyTotal,
      personalityTotal,
      balanceProportionTotal,
      conditionHealthTotal,
      totalScore
    };
  }, [scoreData]);

  const totals = calculateCategoryTotals();
  const ribbonEligibility = calculateRibbonEligibility(totals.totalScore, scoreData.fleaIssues);

  // Validation function
  const validateScoreData = useCallback((): string[] => {
    const errors: string[] = [];

    if (scoreData.beautyScore < 0 || scoreData.beautyScore > 15) errors.push('Beauty score must be between 0-15');
    if (scoreData.personalityScore < 0 || scoreData.personalityScore > 20) errors.push('Personality score must be between 0-20');
    if (scoreData.balanceProportionScore < 0 || scoreData.balanceProportionScore > 15) errors.push('Balance/Proportion score must be between 0-15');
    if (scoreData.coatCleanGroomed < 0 || scoreData.coatCleanGroomed > 15) errors.push('Coat score must be between 0-15');
    if (scoreData.teethGumsHealthy < 0 || scoreData.teethGumsHealthy > 5) errors.push('Teeth/Gums score must be between 0-5');
    if (scoreData.eyesNoseClear < 0 || scoreData.eyesNoseClear > 5) errors.push('Eyes & Nose score must be between 0-5');
    if (scoreData.earsCleanMiteFree < 0 || scoreData.earsCleanMiteFree > 10) errors.push('Ears score must be between 0-10');
    if (scoreData.toenailsClipped < 0 || scoreData.toenailsClipped > 15) errors.push('Toenails score must be between 0-15');

    if (scoreData.beautyComments.length > 500) errors.push('Beauty comments must be 500 characters or less');
    if (scoreData.personalityComments.length > 500) errors.push('Personality comments must be 500 characters or less');
    if (scoreData.balanceProportionComments.length > 500) errors.push('Balance/Proportion comments must be 500 characters or less');
    if (scoreData.conditionHealthComments.length > 500) errors.push('Condition/Health comments must be 500 characters or less');

    return errors;
  }, [scoreData]);

  const handleScoreChange = (field: string, value: number | string | boolean) => {
    setScoreData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateScoreData();
    setValidationErrors(errors);

    if (errors.length > 0) {
      onError?.('Please correct the validation errors before submitting.');
      return;
    }

    setSubmitStatus('submitted');
    setIsSubmitting(true);

    try {
      const score: ClassScore = {
        catId,
        catName,
        participantName,
        judgeId,
        judgeName,
        ...scoreData,
        totalScore: totals.totalScore,
        ribbonEligibility,
        isFinalized: true
      };

      // Here you would make the API call to save the score
      // For now, just simulate it
      setTimeout(() => {
        setSubmitStatus('success');
        setTimeout(() => setSubmitStatus('idle'), 2000);
        onScoreSubmitted?.(score);
      }, 500);
    } catch (error) {
      console.error('Error submitting class score:', error);
      onError?.('Failed to submit score. Please try again.');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* Sticky Header with Totals */}
      <Paper elevation={3} sx={{ p: 3, mb: 3, bgcolor: '#fff8f0', border: '2px solid #ff9800', position: 'sticky', top: 0, zIndex: 100 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 'bold', mb: 1 }}>
            Class Scoring
          </Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body1">
            Cat: <Box component="span">{catName}</Box>
          </Typography>
          <Typography variant="body1">
            Participant: <Box component="span">{participantName}</Box>
          </Typography>
          <Typography variant="body1">
            Judge: <Box component="span">{judgeName}</Box>
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip
            label={`Total Score: ${totals.totalScore}/100`}
            color="warning"
            variant="filled"
            sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}
          />
          <Chip
            label={`Beauty: ${totals.beautyTotal}/15`}
            color="warning"
            variant="outlined"
          />
          <Chip
            label={`Personality: ${totals.personalityTotal}/20`}
            color="warning"
            variant="outlined"
          />
          <Chip
            label={`Balance: ${totals.balanceProportionTotal}/15`}
            color="warning"
            variant="outlined"
          />
          <Chip
            label={`Condition: ${totals.conditionHealthTotal}/50`}
            color="warning"
            variant="outlined"
          />
          <Chip
            label={`${ribbonEligibility} Ribbon`}
            variant="filled"
            sx={{
              backgroundColor:
                ribbonEligibility === 'Blue' ? '#2196f3' :
                  ribbonEligibility === 'Red' ? '#f44336' :
                    ribbonEligibility === 'White' ? '#ffffff' : '#9e9e9e',
              color: ribbonEligibility === 'White' ? '#000' : '#fff',
              fontWeight: 'bold'
            }}
          />
        </Box>
      </Paper>

      {submitStatus === 'submitted' && (
        <Alert severity="success" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={20} sx={{ color: 'success.main' }} />
          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
            Score submitted! Syncing to server...
          </Typography>
        </Alert>
      )}

      {submitStatus === 'success' && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
            ✅ Score submitted successfully!
          </Typography>
        </Alert>
      )}

      {validationErrors.length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>Please correct the following errors:</Typography>
          <ul>
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Beauty Scoring */}
          <Grid size={{ xs: 12 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#ff9800' }}>
                Cat's Beauty (15 pts)
              </Typography>
            </Box>
            <ClassBeautyScoring
              beautyScore={scoreData.beautyScore}
              comments={scoreData.beautyComments}
              total={totals.beautyTotal}
              onScoreChange={handleScoreChange}
            />
          </Grid>

          {/* Personality Scoring */}
          <Grid size={{ xs: 12 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#ff9800' }}>
                Cat's Personality (20 pts)
              </Typography>
            </Box>
            <ClassPersonalityScoring
              personalityScore={scoreData.personalityScore}
              comments={scoreData.personalityComments}
              total={totals.personalityTotal}
              onScoreChange={handleScoreChange}
            />
          </Grid>

          {/* Balance/Proportion Scoring */}
          <Grid size={{ xs: 12 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#ff9800' }}>
                Cat's Balance/Proportion (15 pts)
              </Typography>
            </Box>
            <ClassBalanceProportionScoring
              balanceProportionScore={scoreData.balanceProportionScore}
              comments={scoreData.balanceProportionComments}
              total={totals.balanceProportionTotal}
              onScoreChange={handleScoreChange}
            />
          </Grid>

          {/* Condition/Health Scoring */}
          <Grid size={{ xs: 12 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#ff9800' }}>
                Cat's Condition/Health (50 pts)
              </Typography>
            </Box>
            <ClassConditionHealthScoring
              coatCleanGroomed={scoreData.coatCleanGroomed}
              teethGumsHealthy={scoreData.teethGumsHealthy}
              eyesNoseClear={scoreData.eyesNoseClear}
              earsCleanMiteFree={scoreData.earsCleanMiteFree}
              toenailsClipped={scoreData.toenailsClipped}
              fleaIssues={scoreData.fleaIssues}
              comments={scoreData.conditionHealthComments}
              total={totals.conditionHealthTotal}
              onScoreChange={handleScoreChange}
            />
          </Grid>

          {/* Action Button */}
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 4 }}>
              <Button
                type="submit"
                variant="contained"
                color="warning"
                disabled={isSubmitting}
                size="large"
                sx={{ fontWeight: 'bold' }}
                startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
              >
                {isSubmitting ? 'Submitting...' : (existingScore ? 'Update Score' : 'Submit Score')}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
};
