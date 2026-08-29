import React from 'react';
import { Box, Typography, TextField, Paper, FormControlLabel, Checkbox } from '@mui/material';
import { ScoreInput } from './ScoreInput';

interface ClassConditionHealthScoringProps {
  coatCleanGroomed: number;
  teethGumsHealthy: number;
  eyesNoseClear: number;
  earsCleanMiteFree: number;
  toenailsClipped: number;
  fleaIssues: boolean;
  comments: string;
  total: number;
  onScoreChange: (field: string, value: number | string | boolean) => void;
}

export const ClassConditionHealthScoring: React.FC<ClassConditionHealthScoringProps> = ({
  coatCleanGroomed,
  teethGumsHealthy,
  eyesNoseClear,
  earsCleanMiteFree,
  toenailsClipped,
  fleaIssues,
  comments,
  total,
  onScoreChange
}) => {
  return (
    <Paper sx={{ p: 3, mb: 3, backgroundColor: '#fff3e0', border: '2px solid #ff9800' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Cat's Condition/Health</Typography>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{total}/50 points</Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 3, mb: 3 }}>
        <ScoreInput
          value={coatCleanGroomed}
          min={0}
          max={15}
          label="Coat Clean & Well Groomed"
          onChange={(value) => onScoreChange('coatCleanGroomed', value)}
        />

        <ScoreInput
          value={teethGumsHealthy}
          min={0}
          max={5}
          label="Teeth/Gums Clean & Healthy"
          onChange={(value) => onScoreChange('teethGumsHealthy', value)}
        />

        <ScoreInput
          value={eyesNoseClear}
          min={0}
          max={5}
          label="Eyes & Nose Clear"
          onChange={(value) => onScoreChange('eyesNoseClear', value)}
        />

        <ScoreInput
          value={earsCleanMiteFree}
          min={0}
          max={10}
          label="Ears Clean, Free of Mites"
          onChange={(value) => onScoreChange('earsCleanMiteFree', value)}
        />

        <ScoreInput
          value={toenailsClipped}
          min={0}
          max={15}
          label="Toenails/Claws Clipped"
          onChange={(value) => onScoreChange('toenailsClipped', value)}
        />
      </Box>

      <Box sx={{ mb: 3, p: 2, backgroundColor: '#fce4ec', borderRadius: 1 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={fleaIssues}
              onChange={(e) => onScoreChange('fleaIssues', e.target.checked)}
            />
          }
          label="Flea/Flea Dirt Issues (may receive Red Ribbon)"
        />
      </Box>

      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
          Comments (optional, max 500 characters)
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={3}
          value={comments}
          onChange={(e) => onScoreChange('conditionHealthComments', e.target.value)}
          placeholder="Add comments about the cat's health, coat condition, teeth, eyes, ears, and nails..."
          slotProps={{
            input: {
              maxLength: 500,
            },
          }}
          helperText={`${comments.length}/500 characters`}
        />
      </Box>
    </Paper>
  );
};
