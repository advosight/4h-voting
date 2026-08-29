import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Chip,
  FormControlLabel,
  Checkbox,
  Alert,
  Grid,
  Paper,
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  Star as StarIcon,
  Favorite as HeartIcon,
  Balance as BalanceIcon,
  HealthAndSafety as HealthIcon,
  Save as SaveIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import { ScoreInput } from './ScoreInput';

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
  coatCleanGroomed: number; // 0-15 points
  teethGumsHealthy: number; // 0-5 points
  eyesNoseClear: number; // 0-5 points
  earsCleanMiteFree: number; // 0-10 points
  toenailsClipped: number; // 0-15 points
  fleaIssues: boolean;
  healthGroomingComments?: string;
  totalScore: number;
  ribbonEligibility: string;
  timestamp: string;
  isFinalized: boolean;
}

interface ClassScoringFormProps {
  catData: Cat;
  existingScore?: ClassScore;
  onSave: (classScore: Partial<ClassScore>) => Promise<void>;
  onSubmit: (classScore: Partial<ClassScore>) => Promise<void>;
  loading?: boolean;
  hasPermission?: boolean;
}

interface ClassScoreFormData {
  beautyScore: number;
  beautyComments: string;
  personalityScore: number;
  personalityComments: string;
  balanceProportionScore: number;
  balanceProportionComments: string;
  coatCleanGroomed: number; // 0-15 points
  teethGumsHealthy: number; // 0-5 points
  eyesNoseClear: number; // 0-5 points
  earsCleanMiteFree: number; // 0-10 points
  toenailsClipped: number; // 0-15 points
  fleaIssues: boolean;
  healthGroomingComments: string;
}

const BEAUTY_MAX_SCORE = 15;
const PERSONALITY_MAX_SCORE = 20;
const BALANCE_PROPORTION_MAX_SCORE = 15;
const COAT_CLEAN_GROOMED_MAX_SCORE = 15;
const TEETH_GUMS_MAX_SCORE = 5;
const EYES_NOSE_MAX_SCORE = 5;
const EARS_CLEAN_MAX_SCORE = 10;
const TOENAILS_CLIPPED_MAX_SCORE = 15;
const HEALTH_GROOMING_MAX_SCORE = 50; // Total of all health categories
const MAX_TOTAL_SCORE = 100; // 50 for main categories + 50 for health/grooming

const COMMENT_LIMITS = {
  category: 500,
  health: 1000
};

const calculateRibbonEligibility = (
  totalScore: number,
  fleaIssues: boolean
): string => {
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
  catData,
  existingScore,
  onSave,
  onSubmit,
  loading = false,
  hasPermission = true
}) => {
  const [formData, setFormData] = useState<ClassScoreFormData>({
    beautyScore: existingScore?.beautyScore ?? 15,
    beautyComments: existingScore?.beautyComments || '',
    personalityScore: existingScore?.personalityScore ?? 20,
    personalityComments: existingScore?.personalityComments || '',
    balanceProportionScore: existingScore?.balanceProportionScore ?? 15,
    balanceProportionComments: existingScore?.balanceProportionComments || '',
    coatCleanGroomed: existingScore?.coatCleanGroomed ?? 15,
    teethGumsHealthy: existingScore?.teethGumsHealthy ?? 5,
    eyesNoseClear: existingScore?.eyesNoseClear ?? 5,
    earsCleanMiteFree: existingScore?.earsCleanMiteFree ?? 10,
    toenailsClipped: existingScore?.toenailsClipped ?? 15,
    fleaIssues: existingScore?.fleaIssues ?? false,
    healthGroomingComments: existingScore?.healthGroomingComments || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate total score and ribbon eligibility
  const mainCategoriesScore = formData.beautyScore + formData.personalityScore + formData.balanceProportionScore;
  const healthGroomingScore = formData.coatCleanGroomed + formData.teethGumsHealthy +
    formData.eyesNoseClear + formData.earsCleanMiteFree +
    formData.toenailsClipped;
  const totalScore = mainCategoriesScore + healthGroomingScore;
  const ribbonEligibility = calculateRibbonEligibility(totalScore, formData.fleaIssues);

  const handleInputChange = (field: keyof ClassScoreFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.beautyScore < 0 || formData.beautyScore > BEAUTY_MAX_SCORE) {
      newErrors.beautyScore = `Beauty score must be between 0 and ${BEAUTY_MAX_SCORE}`;
    }
    if (formData.personalityScore < 0 || formData.personalityScore > PERSONALITY_MAX_SCORE) {
      newErrors.personalityScore = `Personality score must be between 0 and ${PERSONALITY_MAX_SCORE}`;
    }
    if (formData.balanceProportionScore < 0 || formData.balanceProportionScore > BALANCE_PROPORTION_MAX_SCORE) {
      newErrors.balanceProportionScore = `Balance/Proportion score must be between 0 and ${BALANCE_PROPORTION_MAX_SCORE}`;
    }

    // Health & Grooming validation
    if (formData.coatCleanGroomed < 0 || formData.coatCleanGroomed > COAT_CLEAN_GROOMED_MAX_SCORE) {
      newErrors.coatCleanGroomed = `Coat clean & groomed score must be between 0 and ${COAT_CLEAN_GROOMED_MAX_SCORE}`;
    }
    if (formData.teethGumsHealthy < 0 || formData.teethGumsHealthy > TEETH_GUMS_MAX_SCORE) {
      newErrors.teethGumsHealthy = `Teeth/gums score must be between 0 and ${TEETH_GUMS_MAX_SCORE}`;
    }
    if (formData.eyesNoseClear < 0 || formData.eyesNoseClear > EYES_NOSE_MAX_SCORE) {
      newErrors.eyesNoseClear = `Eyes & nose score must be between 0 and ${EYES_NOSE_MAX_SCORE}`;
    }
    if (formData.earsCleanMiteFree < 0 || formData.earsCleanMiteFree > EARS_CLEAN_MAX_SCORE) {
      newErrors.earsCleanMiteFree = `Ears clean score must be between 0 and ${EARS_CLEAN_MAX_SCORE}`;
    }
    if (formData.toenailsClipped < 0 || formData.toenailsClipped > TOENAILS_CLIPPED_MAX_SCORE) {
      newErrors.toenailsClipped = `Toenails clipped score must be between 0 and ${TOENAILS_CLIPPED_MAX_SCORE}`;
    }

    if (formData.beautyComments.length > COMMENT_LIMITS.category) {
      newErrors.beautyComments = `Beauty comments must be ${COMMENT_LIMITS.category} characters or less`;
    }
    if (formData.personalityComments.length > COMMENT_LIMITS.category) {
      newErrors.personalityComments = `Personality comments must be ${COMMENT_LIMITS.category} characters or less`;
    }
    if (formData.balanceProportionComments.length > COMMENT_LIMITS.category) {
      newErrors.balanceProportionComments = `Balance/Proportion comments must be ${COMMENT_LIMITS.category} characters or less`;
    }
    if (formData.healthGroomingComments.length > COMMENT_LIMITS.health) {
      newErrors.healthGroomingComments = `Health/Grooming comments must be ${COMMENT_LIMITS.health} characters or less`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    const classScoreData = {
      ...formData,
      catId: catData.id,
      totalScore,
      ribbonEligibility,
      timestamp: new Date().toISOString(),
      isFinalized: false
    };

    await onSave(classScoreData);
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const classScoreData = {
      ...formData,
      catId: catData.id,
      totalScore,
      ribbonEligibility,
      timestamp: new Date().toISOString(),
      isFinalized: true
    };

    await onSubmit(classScoreData);
  };

  return (
    <Box sx={{ mt: 3 }}>
      {/* Sticky Header with Cat Info and Total */}
      <Paper
        elevation={4}
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          mb: 3,
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          color: 'white',
          borderRadius: 2
        }}
      >
        <CardContent sx={{ pb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrophyIcon sx={{ fontSize: '2rem' }} />
              {catData.name}
            </Typography>
            <Box sx={{
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 2,
              px: 3,
              py: 1,
              border: '2px solid rgba(255,255,255,0.3)'
            }}>
              <Typography variant="h3" sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                {totalScore}
                <Typography component="span" variant="h5" sx={{ opacity: 0.8 }}>
                  /{MAX_TOTAL_SCORE}
                </Typography>
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', opacity: 0.9 }}>
                Total Score
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Box sx={{ textAlign: 'center', p: 1, background: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>Owner</Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{catData.owner}</Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Box sx={{ textAlign: 'center', p: 1, background: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>Cage</Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{catData.cageNumber}</Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Box sx={{ textAlign: 'center', p: 1, background: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>Category</Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  {catData.catAgeGroup || catData.ownerAgeGroup || 'Household Pet'}
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip
              label={`${ribbonEligibility} Ribbon`}
              sx={{
                backgroundColor:
                  ribbonEligibility === 'Blue' ? '#2196f3' :
                    ribbonEligibility === 'Red' ? '#f44336' :
                      ribbonEligibility === 'White' ? '#ffffff' : '#9e9e9e',
                color: ribbonEligibility === 'White' ? '#000' : '#fff',
                fontWeight: 'bold',
                fontSize: '1rem',
                px: 2,
                py: 1
              }}
            />
            <Chip
              label={`Health/Grooming: ${healthGroomingScore}/${HEALTH_GROOMING_MAX_SCORE}`}
              sx={{
                backgroundColor: healthGroomingScore >= 40 ? '#4caf50' : healthGroomingScore >= 30 ? '#ff9800' : '#f44336',
                color: '#fff',
                fontWeight: 'bold'
              }}
            />
            {formData.fleaIssues && (
              <Chip
                label="🚫 Flea Issues"
                color="error"
                sx={{ fontWeight: 'bold' }}
              />
            )}
          </Box>
        </CardContent>
      </Paper>

      {/* Scoring Sections */}
      <Box sx={{ mb: 3 }}>
        {/* Scoring Section */}
        <Paper elevation={3} sx={{ mb: 3, p: 3, border: '2px solid #1976d2', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <TrophyIcon sx={{ mr: 2, color: '#1976d2', fontSize: '2rem' }} />
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
              Scoring Categories
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {/* Beauty Section */}
            <Grid size={{ xs: 12 }}>
              <Card sx={{ border: '2px solid #e91e63' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <StarIcon sx={{ mr: 2, color: '#e91e63', fontSize: '2rem' }} />
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#e91e63' }}>
                      Beauty (0-{BEAUTY_MAX_SCORE})
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 3 }}>
                    <ScoreInput
                      value={formData.beautyScore}
                      min={0}
                      max={BEAUTY_MAX_SCORE}
                      label="Beauty Score"
                      onChange={(value) => handleInputChange('beautyScore', value)}
                    />
                  </Box>

                  {errors.beautyScore && (
                    <Alert severity="error" sx={{ mb: 2 }}>{errors.beautyScore}</Alert>
                  )}

                  <TextField
                    multiline
                    rows={3}
                    label="Beauty Comments"
                    value={formData.beautyComments}
                    onChange={(e) => handleInputChange('beautyComments', e.target.value)}
                    placeholder="Comments on physical appearance, coat quality, breed standards..."
                    error={!!errors.beautyComments}
                    helperText={errors.beautyComments || `${formData.beautyComments.length}/${COMMENT_LIMITS.category} characters`}
                    fullWidth
                    slotProps={{ htmlInput: { maxLength: COMMENT_LIMITS.category } }}
                  />
                </CardContent>
              </Card>
            </Grid>

            {/* Personality Section */}
            <Grid size={{ xs: 12 }}>
              <Card sx={{ border: '2px solid #ff9800' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <HeartIcon sx={{ mr: 2, color: '#ff9800', fontSize: '2rem' }} />
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#ff9800' }}>
                      Personality (0-{PERSONALITY_MAX_SCORE})
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 3 }}>
                    <ScoreInput
                      value={formData.personalityScore}
                      min={0}
                      max={PERSONALITY_MAX_SCORE}
                      label="Personality Score"
                      onChange={(value) => handleInputChange('personalityScore', value)}
                    />
                  </Box>

                  {errors.personalityScore && (
                    <Alert severity="error" sx={{ mb: 2 }}>{errors.personalityScore}</Alert>
                  )}

                  <TextField
                    multiline
                    rows={3}
                    label="Personality Comments"
                    value={formData.personalityComments}
                    onChange={(e) => handleInputChange('personalityComments', e.target.value)}
                    placeholder="Comments on temperament, behavior, interaction with judges..."
                    error={!!errors.personalityComments}
                    helperText={errors.personalityComments || `${formData.personalityComments.length}/${COMMENT_LIMITS.category} characters`}
                    fullWidth
                    slotProps={{ htmlInput: { maxLength: COMMENT_LIMITS.category } }}
                  />
                </CardContent>
              </Card>
            </Grid>

            {/* Balance/Proportion Section */}
            <Grid size={{ xs: 12 }}>
              <Card sx={{ border: '2px solid #4caf50' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <BalanceIcon sx={{ mr: 2, color: '#4caf50', fontSize: '2rem' }} />
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#4caf50' }}>
                      Balance/Proportion (0-{BALANCE_PROPORTION_MAX_SCORE})
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 3 }}>
                    <ScoreInput
                      value={formData.balanceProportionScore}
                      min={0}
                      max={BALANCE_PROPORTION_MAX_SCORE}
                      label="Balance/Proportion Score"
                      onChange={(value) => handleInputChange('balanceProportionScore', value)}
                    />
                  </Box>

                  {errors.balanceProportionScore && (
                    <Alert severity="error" sx={{ mb: 2 }}>{errors.balanceProportionScore}</Alert>
                  )}

                  <TextField
                    multiline
                    rows={3}
                    label="Balance/Proportion Comments"
                    value={formData.balanceProportionComments}
                    onChange={(e) => handleInputChange('balanceProportionComments', e.target.value)}
                    placeholder="Comments on overall balance, proportions, and structure..."
                    error={!!errors.balanceProportionComments}
                    helperText={errors.balanceProportionComments || `${formData.balanceProportionComments.length}/${COMMENT_LIMITS.category} characters`}
                    fullWidth
                    slotProps={{ htmlInput: { maxLength: COMMENT_LIMITS.category } }}
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>

        {/* Health & Grooming Section */}
        <Paper elevation={3} sx={{ mb: 3, p: 3, border: '2px solid #4caf50', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <HealthIcon sx={{ mr: 2, color: '#4caf50', fontSize: '2rem' }} />
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#4caf50' }}>
              Health & Grooming (Total: {healthGroomingScore}/{HEALTH_GROOMING_MAX_SCORE})
            </Typography>
          </Box>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <Box sx={{ mb: 3 }}>
                <ScoreInput
                  value={formData.coatCleanGroomed}
                  min={0}
                  max={COAT_CLEAN_GROOMED_MAX_SCORE}
                  label="Coat Clean & Well Groomed"
                  onChange={(value) => handleInputChange('coatCleanGroomed', value)}
                />
              </Box>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Box sx={{ mb: 3 }}>
                <ScoreInput
                  value={formData.teethGumsHealthy}
                  min={0}
                  max={TEETH_GUMS_MAX_SCORE}
                  label="Teeth/Gums Clean & Healthy"
                  onChange={(value) => handleInputChange('teethGumsHealthy', value)}
                />
              </Box>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Box sx={{ mb: 3 }}>
                <ScoreInput
                  value={formData.eyesNoseClear}
                  min={0}
                  max={EYES_NOSE_MAX_SCORE}
                  label="Eyes & Nose Clear"
                  onChange={(value) => handleInputChange('eyesNoseClear', value)}
                />
              </Box>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Box sx={{ mb: 3 }}>
                <ScoreInput
                  value={formData.earsCleanMiteFree}
                  min={0}
                  max={EARS_CLEAN_MAX_SCORE}
                  label="Ears Clean Free of Mites"
                  onChange={(value) => handleInputChange('earsCleanMiteFree', value)}
                />
              </Box>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Box sx={{ mb: 3 }}>
                <ScoreInput
                  value={formData.toenailsClipped}
                  min={0}
                  max={TOENAILS_CLIPPED_MAX_SCORE}
                  label="Toenails/Claws Clipped"
                  onChange={(value) => handleInputChange('toenailsClipped', value)}
                />
              </Box>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Card sx={{ p: 2, border: formData.fleaIssues ? '2px solid #f44336' : '1px solid #e0e0e0', mb: 3 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.fleaIssues}
                      onChange={(e) => handleInputChange('fleaIssues', e.target.checked)}
                      color="error"
                    />
                  }
                  label="⚠️ Flea issues detected (may result in Red Ribbon)"
                  sx={{ color: formData.fleaIssues ? '#f44336' : 'inherit' }}
                />
              </Card>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                multiline
                rows={4}
                label="Health & Grooming Comments"
                value={formData.healthGroomingComments}
                onChange={(e) => handleInputChange('healthGroomingComments', e.target.value)}
                placeholder="Additional health and grooming observations..."
                error={!!errors.healthGroomingComments}
                helperText={errors.healthGroomingComments || `${formData.healthGroomingComments.length}/${COMMENT_LIMITS.health} characters`}
                fullWidth
                slotProps={{ htmlInput: { maxLength: COMMENT_LIMITS.health } }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Action Buttons */}
        <Paper elevation={3} sx={{ p: 3, border: '2px solid #1976d2', borderRadius: 2 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Button
                variant="outlined"
                color="primary"
                onClick={handleSave}
                disabled={loading || !hasPermission}
                startIcon={<SaveIcon />}
                fullWidth
                sx={{ minHeight: 56 }}
              >
                Save Draft
              </Button>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSubmit}
                disabled={loading || !hasPermission}
                startIcon={<SendIcon />}
                fullWidth
                sx={{ minHeight: 56 }}
              >
                Submit Final Score
              </Button>
            </Grid>
          </Grid>

          {!hasPermission && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              You do not have permission to score this cat. Contact an administrator for access.
            </Alert>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default ClassScoringForm;