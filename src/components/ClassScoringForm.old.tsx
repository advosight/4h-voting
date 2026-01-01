import React, { useState, useEffect } from 'react';
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
  Slider,
  Alert,

  Grid,
  Paper,
  Divider,
  LinearProgress,
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
  coatCleanGroomed: boolean;
  teethGumsHealthy: boolean;
  eyesNoseClear: boolean;
  earsCleanMiteFree: boolean;
  toenailsClipped: boolean;
  fleaIssues: boolean;
  healthGroomingComments: string;
}

const BEAUTY_MAX_SCORE = 15;
const PERSONALITY_MAX_SCORE = 20;
const BALANCE_PROPORTION_MAX_SCORE = 15;
const MAX_TOTAL_SCORE = 50;

const COMMENT_LIMITS = {
  category: 500,
  health: 1000
};

const calculateRibbonEligibility = (
  totalScore: number,
  healthPassing: boolean,
  fleaIssues: boolean
): string => {
  // Any health/grooming failure OR flea issues = Red Ribbon (regardless of score)
  if (!healthPassing || fleaIssues) {
    return 'Red';
  }

  // Score-based ribbon determination
  if (totalScore >= 45 && totalScore <= 50) {
    return 'Blue';
  } else if (totalScore >= 35 && totalScore <= 44) {
    return 'Red';
  } else if (totalScore >= 25 && totalScore <= 34) {
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
    beautyScore: existingScore?.beautyScore || 0,
    beautyComments: existingScore?.beautyComments || '',
    personalityScore: existingScore?.personalityScore || 0,
    personalityComments: existingScore?.personalityComments || '',
    balanceProportionScore: existingScore?.balanceProportionScore || 0,
    balanceProportionComments: existingScore?.balanceProportionComments || '',
    coatCleanGroomed: existingScore?.coatCleanGroomed ?? true,
    teethGumsHealthy: existingScore?.teethGumsHealthy ?? true,
    eyesNoseClear: existingScore?.eyesNoseClear ?? true,
    earsCleanMiteFree: existingScore?.earsCleanMiteFree ?? true,
    toenailsClipped: existingScore?.toenailsClipped ?? true,
    fleaIssues: existingScore?.fleaIssues ?? false,
    healthGroomingComments: existingScore?.healthGroomingComments || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate total score and ribbon eligibility
  const totalScore = formData.beautyScore + formData.personalityScore + formData.balanceProportionScore;
  const healthPassing = formData.coatCleanGroomed && formData.teethGumsHealthy && 
                       formData.eyesNoseClear && formData.earsCleanMiteFree && 
                       formData.toenailsClipped;
  const ribbonEligibility = calculateRibbonEligibility(totalScore, healthPassing, formData.fleaIssues);

  // Validation function
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Score validation
    if (formData.beautyScore < 0 || formData.beautyScore > BEAUTY_MAX_SCORE) {
      newErrors.beautyScore = `Beauty score must be between 0 and ${BEAUTY_MAX_SCORE}`;
    }
    if (formData.personalityScore < 0 || formData.personalityScore > PERSONALITY_MAX_SCORE) {
      newErrors.personalityScore = `Personality score must be between 0 and ${PERSONALITY_MAX_SCORE}`;
    }
    if (formData.balanceProportionScore < 0 || formData.balanceProportionScore > BALANCE_PROPORTION_MAX_SCORE) {
      newErrors.balanceProportionScore = `Balance/Proportion score must be between 0 and ${BALANCE_PROPORTION_MAX_SCORE}`;
    }

    // Comment length validation
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

  const handleInputChange = (field: keyof ClassScoreFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    const classScoreData = {
      ...formData,
      catId: catData.id,
      totalScore,
      ribbonEligibility,
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
      isFinalized: true
    };

    await onSubmit(classScoreData);
  };

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['scoring']));

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
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
            <Grid size={{xs: 12, sm: 4}}>
              <Box sx={{ textAlign: 'center', p: 1, background: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>Owner</Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{catData.owner}</Typography>
              </Box>
            </Grid>
            <Grid size={{xs: 12, sm: 4}}>
              <Box sx={{ textAlign: 'center', p: 1, background: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>Cage</Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{catData.cageNumber}</Typography>
              </Box>
            </Grid>
            <Grid size={{xs: 12, sm: 4}}>
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
            {!healthPassing && (
              <Chip
                label="⚠️ Health Issues"
                color="warning"
                sx={{ fontWeight: 'bold' }}
              />
            )}
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
              {/* Beauty Section */}
              <Card sx={{ mb: 3, border: '2px solid #e91e63' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <StarIcon sx={{ mr: 2, color: '#e91e63', fontSize: '2rem' }} />
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#e91e63' }}>
                      Beauty (0-{BEAUTY_MAX_SCORE})
                    </Typography>
                  </Box>
                  
                  <Grid container spacing={3}>
                    <Grid size={{xs: 12, sm: 4}}>
                      <TextField
                        type="number"
                        label="Beauty Score"
                        value={formData.beautyScore}
                        onChange={(e) => handleInputChange('beautyScore', parseInt(e.target.value) || 0)}
                        inputProps={{ min: 0, max: BEAUTY_MAX_SCORE }}
                        error={!!errors.beautyScore}
                        helperText={errors.beautyScore}
                        fullWidth
                        size="medium"
                        sx={{ mb: 2 }}
                      />
                      
                      <Typography gutterBottom>Score: {formData.beautyScore}</Typography>
                      <Slider
                        value={formData.beautyScore}
                        onChange={(_, value) => handleInputChange('beautyScore', value as number)}
                        min={0}
                        max={BEAUTY_MAX_SCORE}
                        marks
                        step={1}
                        valueLabelDisplay="auto"
                        sx={{ color: '#e91e63' }}
                      />
                    </Grid>
                    
                    <Grid size={{xs: 12, md: 8}}>
                      <TextField
                        multiline
                        rows={4}
                        label="Beauty Comments"
                        value={formData.beautyComments}
                        onChange={(e) => handleInputChange('beautyComments', e.target.value)}
                        placeholder="Comments on physical appearance, coat quality, breed standards..."
                        error={!!errors.beautyComments}
                        helperText={errors.beautyComments || `${formData.beautyComments.length}/${COMMENT_LIMITS.category} characters`}
                        fullWidth
                        inputProps={{ maxLength: COMMENT_LIMITS.category }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Personality Section */}
              <Card sx={{ mb: 3, border: '2px solid #ff9800' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <HeartIcon sx={{ mr: 2, color: '#ff9800', fontSize: '2rem' }} />
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#ff9800' }}>
                      Personality (0-{PERSONALITY_MAX_SCORE})
                    </Typography>
                  </Box>
                  
                  <Grid container spacing={3}>
                    <Grid size={{xs: 12, md: 4}}>
                      <TextField
                        type="number"
                        label="Personality Score"
                        value={formData.personalityScore}
                        onChange={(e) => handleInputChange('personalityScore', parseInt(e.target.value) || 0)}
                        inputProps={{ min: 0, max: PERSONALITY_MAX_SCORE }}
                        error={!!errors.personalityScore}
                        helperText={errors.personalityScore}
                        fullWidth
                        size="large"
                        sx={{ mb: 2 }}
                      />
                      
                      <Typography gutterBottom>Score: {formData.personalityScore}</Typography>
                      <Slider
                        value={formData.personalityScore}
                        onChange={(_, value) => handleInputChange('personalityScore', value as number)}
                        min={0}
                        max={PERSONALITY_MAX_SCORE}
                        marks
                        step={1}
                        valueLabelDisplay="auto"
                        sx={{ color: '#ff9800' }}
                      />
                    </Grid>
                    
                    <Grid size={{xs: 12, md: 8}}>
                      <TextField
                        multiline
                        rows={4}
                        label="Personality Comments"
                        value={formData.personalityComments}
                        onChange={(e) => handleInputChange('personalityComments', e.target.value)}
                        placeholder="Comments on temperament, behavior, interaction with judges..."
                        error={!!errors.personalityComments}
                        helperText={errors.personalityComments || `${formData.personalityComments.length}/${COMMENT_LIMITS.category} characters`}
                        fullWidth
                        inputProps={{ maxLength: COMMENT_LIMITS.category }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
              {/* Balance/Proportion Section */}
              <Card sx={{ mb: 3, border: '2px solid #4caf50' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <BalanceIcon sx={{ mr: 2, color: '#4caf50', fontSize: '2rem' }} />
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#4caf50' }}>
                      Balance/Proportion (0-{BALANCE_PROPORTION_MAX_SCORE})
                    </Typography>
                  </Box>
                  
                  <Grid container spacing={3}>
                    <Grid size={{xs: 12, md: 4}}>
                      <TextField
                        type="number"
                        label="Balance/Proportion Score"
                        value={formData.balanceProportionScore}
                        onChange={(e) => handleInputChange('balanceProportionScore', parseInt(e.target.value) || 0)}
                        inputProps={{ min: 0, max: BALANCE_PROPORTION_MAX_SCORE }}
                        error={!!errors.balanceProportionScore}
                        helperText={errors.balanceProportionScore}
                        fullWidth
                        size="large"
                        sx={{ mb: 2 }}
                      />
                      
                      <Typography gutterBottom>Score: {formData.balanceProportionScore}</Typography>
                      <Slider
                        value={formData.balanceProportionScore}
                        onChange={(_, value) => handleInputChange('balanceProportionScore', value as number)}
                        min={0}
                        max={BALANCE_PROPORTION_MAX_SCORE}
                        marks
                        step={1}
                        valueLabelDisplay="auto"
                        sx={{ color: '#4caf50' }}
                      />
                    </Grid>
                    
                    <Grid size={{xs: 12, md: 8}}>
                      <TextField
                        multiline
                        rows={4}
                        label="Balance/Proportion Comments"
                        value={formData.balanceProportionComments}
                        onChange={(e) => handleInputChange('balanceProportionComments', e.target.value)}
                        placeholder="Comments on overall balance, proportions, and structure..."
                        error={!!errors.balanceProportionComments}
                        helperText={errors.balanceProportionComments || `${formData.balanceProportionComments.length}/${COMMENT_LIMITS.category} characters`}
                        fullWidth
                        inputProps={{ maxLength: COMMENT_LIMITS.category }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
        </Paper>

        {/* Health & Grooming Section */}
        <Paper elevation={3} sx={{ mb: 3, p: 3, border: '2px solid #4caf50', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <HealthIcon sx={{ mr: 2, color: '#4caf50', fontSize: '2rem' }} />
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#4caf50' }}>
              Health & Grooming
            </Typography>
          </Box>
          
          <AccordionDetails sx={{ p: 3 }}>
          <Grid container spacing={3}>
                <div className="checkbox-group">
                  <label className="checkbox-label touch-optimized">
                    <input
                      type="checkbox"
                      checked={formData.coatCleanGroomed}
                      onChange={(e) => handleInputChange('coatCleanGroomed', e.target.checked)}
                      className="checkbox-input"
                    />
                    <span className="checkbox-text">Coat clean & groomed</span>
                    <span className="checkbox-indicator">✓</span>
                  </label>
                  
                  <label className="checkbox-label touch-optimized">
                    <input
                      type="checkbox"
                      checked={formData.teethGumsHealthy}
                      onChange={(e) => handleInputChange('teethGumsHealthy', e.target.checked)}
                      className="checkbox-input"
                    />
                    <span className="checkbox-text">Teeth/gums healthy</span>
                    <span className="checkbox-indicator">✓</span>
                  </label>
                  
                  <label className="checkbox-label touch-optimized">
                    <input
                      type="checkbox"
                      checked={formData.eyesNoseClear}
                      onChange={(e) => handleInputChange('eyesNoseClear', e.target.checked)}
                      className="checkbox-input"
                    />
                    <span className="checkbox-text">Eyes & nose clear</span>
                    <span className="checkbox-indicator">✓</span>
                  </label>
                  
                  <label className="checkbox-label touch-optimized">
                    <input
                      type="checkbox"
                      checked={formData.earsCleanMiteFree}
                      onChange={(e) => handleInputChange('earsCleanMiteFree', e.target.checked)}
                      className="checkbox-input"
                    />
                    <span className="checkbox-text">Ears clean & mite-free</span>
                    <span className="checkbox-indicator">✓</span>
                  </label>
                  
                  <label className="checkbox-label touch-optimized">
                    <input
                      type="checkbox"
                      checked={formData.toenailsClipped}
                      onChange={(e) => handleInputChange('toenailsClipped', e.target.checked)}
                      className="checkbox-input"
                    />
                    <span className="checkbox-text">Toenails clipped</span>
                    <span className="checkbox-indicator">✓</span>
                  </label>
                  
                  <label className="checkbox-label touch-optimized flea-warning">
                    <input
                      type="checkbox"
                      checked={formData.fleaIssues}
                      onChange={(e) => handleInputChange('fleaIssues', e.target.checked)}
                      className="checkbox-input"
                    />
                    <span className="checkbox-text">Flea issues detected</span>
                    <span className="checkbox-indicator warning">⚠️</span>
                  </label>
                </div>
              </div>
              
              <textarea
                id="healthGroomingComments"
                value={formData.healthGroomingComments}
                onChange={(e) => handleInputChange('healthGroomingComments', e.target.value)}
                maxLength={COMMENT_LIMITS.health}
                placeholder="Health & grooming observations..."
                className={`comment-textarea touch-optimized ${errors.healthGroomingComments ? 'error' : ''}`}
                rows={4}
              />
              <div className="char-count">{formData.healthGroomingComments.length}/{COMMENT_LIMITS.health}</div>
              {errors.healthGroomingComments && <span className="error-message">{errors.healthGroomingComments}</span>}
            </div>
          )}
          </AccordionDetails>
        </Accordion>
      </Box>

      {/* Floating Action Buttons */}
      <div className="floating-actions">
        <button
          type="button"
          onClick={handleSave}
          disabled={loading || !hasPermission}
          className="floating-action-button save"
        >
          <span className="action-icon">💾</span>
          <span className="action-text">{loading ? 'Saving...' : 'Save Draft'}</span>
        </button>
        
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !hasPermission}
          className="floating-action-button submit"
        >
          <span className="action-icon">✅</span>
          <span className="action-text">{loading ? 'Submitting...' : 'Submit Final'}</span>
        </button>
      </div>
    </div>
  );
};

export default ClassScoringForm;