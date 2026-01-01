import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Grid,
  FormControlLabel,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  Divider,
  CircularProgress
} from '@mui/material';
import { Edit as EditIcon, Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material';

export interface ClassScore {
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
  modificationCount: number;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
}

export interface UpdateClassScoreInput {
  beautyScore?: number;
  beautyComments?: string;
  personalityScore?: number;
  personalityComments?: string;
  balanceProportionScore?: number;
  balanceProportionComments?: string;
  coatCleanGroomed?: boolean;
  teethGumsHealthy?: boolean;
  eyesNoseClear?: boolean;
  earsCleanMiteFree?: boolean;
  toenailsClipped?: boolean;
  fleaIssues?: boolean;
  healthGroomingComments?: string;
  isFinalized?: boolean;
  modificationReason?: string;
}

interface ClassScoreEditFormProps {
  classScore: ClassScore;
  onSave: (id: string, input: UpdateClassScoreInput) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  error?: string;
}

export const ClassScoreEditForm: React.FC<ClassScoreEditFormProps> = ({
  classScore,
  onSave,
  onCancel,
  loading = false,
  error
}) => {
  const [formData, setFormData] = useState<UpdateClassScoreInput>({});
  const [modificationReason, setModificationReason] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form data with current class score values
  useEffect(() => {
    setFormData({
      beautyScore: classScore.beautyScore,
      beautyComments: classScore.beautyComments || '',
      personalityScore: classScore.personalityScore,
      personalityComments: classScore.personalityComments || '',
      balanceProportionScore: classScore.balanceProportionScore,
      balanceProportionComments: classScore.balanceProportionComments || '',
      coatCleanGroomed: classScore.coatCleanGroomed,
      teethGumsHealthy: classScore.teethGumsHealthy,
      eyesNoseClear: classScore.eyesNoseClear,
      earsCleanMiteFree: classScore.earsCleanMiteFree,
      toenailsClipped: classScore.toenailsClipped,
      fleaIssues: classScore.fleaIssues,
      healthGroomingComments: classScore.healthGroomingComments || '',
      isFinalized: classScore.isFinalized,
    });
  }, [classScore]);

  // Check if form has changes
  useEffect(() => {
    const hasFormChanges =
      formData.beautyScore !== classScore.beautyScore ||
      (formData.beautyComments || '') !== (classScore.beautyComments || '') ||
      formData.personalityScore !== classScore.personalityScore ||
      (formData.personalityComments || '') !== (classScore.personalityComments || '') ||
      formData.balanceProportionScore !== classScore.balanceProportionScore ||
      (formData.balanceProportionComments || '') !== (classScore.balanceProportionComments || '') ||
      formData.coatCleanGroomed !== classScore.coatCleanGroomed ||
      formData.teethGumsHealthy !== classScore.teethGumsHealthy ||
      formData.eyesNoseClear !== classScore.eyesNoseClear ||
      formData.earsCleanMiteFree !== classScore.earsCleanMiteFree ||
      formData.toenailsClipped !== classScore.toenailsClipped ||
      formData.fleaIssues !== classScore.fleaIssues ||
      (formData.healthGroomingComments || '') !== (classScore.healthGroomingComments || '');

    setHasChanges(hasFormChanges);
  }, [formData, classScore]);

  const calculateTotalScore = () => {
    return (formData.beautyScore || 0) + (formData.personalityScore || 0) + (formData.balanceProportionScore || 0);
  };

  const calculateRibbonEligibility = () => {
    const totalScore = calculateTotalScore();
    const healthItemsPassed = formData.coatCleanGroomed &&
      formData.teethGumsHealthy &&
      formData.eyesNoseClear &&
      formData.earsCleanMiteFree &&
      formData.toenailsClipped;

    if (!healthItemsPassed || formData.fleaIssues) {
      return 'Red';
    }

    if (totalScore >= 45) return 'Blue';
    if (totalScore >= 35) return 'Red';
    if (totalScore >= 25) return 'White';
    return 'Participation';
  };

  const handleInputChange = (field: keyof UpdateClassScoreInput, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    if (!hasChanges && !modificationReason.trim()) {
      return;
    }

    if (classScore.isFinalized) {
      setShowFinalizeDialog(true);
    } else {
      setShowConfirmDialog(true);
    }
  };

  const confirmSave = async () => {
    try {
      const updateInput: UpdateClassScoreInput = {
        ...formData,
        modificationReason: modificationReason.trim() || 'Class score updated'
      };

      await onSave(classScore.id, updateInput);
      setShowConfirmDialog(false);
      setShowFinalizeDialog(false);
    } catch (error) {
      console.error('Error saving class score:', error);
    }
  };

  const getRibbonColor = (ribbon: string) => {
    switch (ribbon) {
      case 'Blue': return 'primary';
      case 'Red': return 'error';
      case 'White': return 'default';
      case 'Participation': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Box display="flex" alignItems="center" mb={2}>
        <EditIcon sx={{ mr: 1 }} />
        <Typography variant="h6">
          Edit Class Score
        </Typography>
        {classScore.isFinalized && (
          <Chip
            label="FINALIZED"
            color="warning"
            size="small"
            sx={{ ml: 2 }}
          />
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Score Modification History */}
      <Box mb={2}>
        <Typography variant="body2" color="text.secondary">
          Modifications: {classScore.modificationCount}
          {classScore.lastModifiedBy && (
            <> | Last modified by: {classScore.lastModifiedBy}</>
          )}
          {classScore.lastModifiedAt && (
            <> | {new Date(classScore.lastModifiedAt).toLocaleString()}</>
          )}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Beauty Score */}
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            fullWidth
            label="Beauty Score (0-15)"
            type="number"
            value={formData.beautyScore || ''}
            onChange={(e) => handleInputChange('beautyScore', parseInt(e.target.value) || 0)}
            inputProps={{ min: 0, max: 15 }}
            disabled={loading}
          />
          <TextField
            fullWidth
            label="Beauty Comments"
            multiline
            rows={3}
            value={formData.beautyComments || ''}
            onChange={(e) => handleInputChange('beautyComments', e.target.value)}
            inputProps={{ maxLength: 500 }}
            helperText={`${(formData.beautyComments || '').length}/500 characters`}
            disabled={loading}
            sx={{ mt: 1 }}
          />
        </Grid>

        {/* Personality Score */}
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            fullWidth
            label="Personality Score (0-20)"
            type="number"
            value={formData.personalityScore || ''}
            onChange={(e) => handleInputChange('personalityScore', parseInt(e.target.value) || 0)}
            inputProps={{ min: 0, max: 20 }}
            disabled={loading}
          />
          <TextField
            fullWidth
            label="Personality Comments"
            multiline
            rows={3}
            value={formData.personalityComments || ''}
            onChange={(e) => handleInputChange('personalityComments', e.target.value)}
            inputProps={{ maxLength: 500 }}
            helperText={`${(formData.personalityComments || '').length}/500 characters`}
            disabled={loading}
            sx={{ mt: 1 }}
          />
        </Grid>

        {/* Balance/Proportion Score */}
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            fullWidth
            label="Balance/Proportion Score (0-15)"
            type="number"
            value={formData.balanceProportionScore || ''}
            onChange={(e) => handleInputChange('balanceProportionScore', parseInt(e.target.value) || 0)}
            inputProps={{ min: 0, max: 15 }}
            disabled={loading}
          />
          <TextField
            fullWidth
            label="Balance/Proportion Comments"
            multiline
            rows={3}
            value={formData.balanceProportionComments || ''}
            onChange={(e) => handleInputChange('balanceProportionComments', e.target.value)}
            inputProps={{ maxLength: 500 }}
            helperText={`${(formData.balanceProportionComments || '').length}/500 characters`}
            disabled={loading}
            sx={{ mt: 1 }}
          />
        </Grid>

        {/* Health/Grooming Checklist */}
        <Grid size={{ xs: 12 }}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" gutterBottom>
            Health & Grooming Checklist
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.coatCleanGroomed || false}
                    onChange={(e) => handleInputChange('coatCleanGroomed', e.target.checked)}
                    disabled={loading}
                  />
                }
                label="Coat is clean & well groomed"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.teethGumsHealthy || false}
                    onChange={(e) => handleInputChange('teethGumsHealthy', e.target.checked)}
                    disabled={loading}
                  />
                }
                label="Teeth/gums clean & healthy"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.eyesNoseClear || false}
                    onChange={(e) => handleInputChange('eyesNoseClear', e.target.checked)}
                    disabled={loading}
                  />
                }
                label="Eyes & nose clear"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.earsCleanMiteFree || false}
                    onChange={(e) => handleInputChange('earsCleanMiteFree', e.target.checked)}
                    disabled={loading}
                  />
                }
                label="Ears clean & free of mites"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.toenailsClipped || false}
                    onChange={(e) => handleInputChange('toenailsClipped', e.target.checked)}
                    disabled={loading}
                  />
                }
                label="Toenails/claws clipped"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.fleaIssues || false}
                    onChange={(e) => handleInputChange('fleaIssues', e.target.checked)}
                    disabled={loading}
                  />
                }
                label="Flea or flea dirt issues"
              />
            </Grid>
          </Grid>

          <TextField
            fullWidth
            label="Health & Grooming Comments"
            multiline
            rows={3}
            value={formData.healthGroomingComments || ''}
            onChange={(e) => handleInputChange('healthGroomingComments', e.target.value)}
            inputProps={{ maxLength: 1000 }}
            helperText={`${(formData.healthGroomingComments || '').length}/1000 characters`}
            disabled={loading}
            sx={{ mt: 2 }}
          />
        </Grid>

        {/* Score Summary */}
        <Grid size={{ xs: 12 }}>
          <Divider sx={{ my: 2 }} />
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="h6">
              Total Score: {calculateTotalScore()}/50
            </Typography>
            <Chip
              label={`${calculateRibbonEligibility()} Ribbon`}
              color={getRibbonColor(calculateRibbonEligibility()) as any}
            />
          </Box>
        </Grid>

        {/* Modification Reason */}
        <Grid size={{ xs: 12 }}>
          <TextField
            fullWidth
            label="Reason for Modification"
            value={modificationReason}
            onChange={(e) => setModificationReason(e.target.value)}
            placeholder="Please provide a reason for this modification..."
            disabled={loading}
            required={hasChanges}
          />
        </Grid>

        {/* Action Buttons */}
        <Grid size={{ xs: 12 }}>
          <Box display="flex" gap={2} justifyContent="flex-end">
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
              onClick={handleSave}
              disabled={loading || (!hasChanges && !modificationReason.trim())}
            >
              Save Changes
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onClose={() => setShowConfirmDialog(false)}>
        <DialogTitle>Confirm Class Score Modification</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to save these changes to the class score?
          </Typography>
          {modificationReason && (
            <Box mt={2}>
              <Typography variant="body2" color="text.secondary">
                Reason: {modificationReason}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmDialog(false)}>Cancel</Button>
          <Button onClick={confirmSave} variant="contained">
            Confirm Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Finalized Score Modification Dialog */}
      <Dialog open={showFinalizeDialog} onClose={() => setShowFinalizeDialog(false)}>
        <DialogTitle>Modify Finalized Class Score</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This class score has been finalized. Modifications require additional confirmation.
          </Alert>
          <Typography>
            Are you sure you want to modify this finalized class score? This action will be logged in the audit trail.
          </Typography>
          {modificationReason && (
            <Box mt={2}>
              <Typography variant="body2" color="text.secondary">
                Reason: {modificationReason}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowFinalizeDialog(false)}>Cancel</Button>
          <Button onClick={confirmSave} variant="contained" color="warning">
            Confirm Modification
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ClassScoreEditForm;