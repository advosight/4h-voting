import React from 'react';
import { Box, Typography, TextField, Paper } from '@mui/material';
import { ScoreInput } from './ScoreInput';

interface HealthExaminationScoringProps {
  showingMouthTeethGums: number;
  conditionMouthTeethGums: number;
  showingNose: number;
  showingEyes: number;
  conditionNoseEyes: number;
  showingEars: number;
  earsClean: number;
  showingToenailsClaws: number;
  toenailsClipped: number;
  comments: string;
  total: number;
  onScoreChange: (field: string, value: number | string) => void;
}

export const HealthExaminationScoring: React.FC<HealthExaminationScoringProps> = ({
  showingMouthTeethGums,
  conditionMouthTeethGums,
  showingNose,
  showingEyes,
  conditionNoseEyes,
  showingEars,
  earsClean,
  showingToenailsClaws,
  toenailsClipped,
  comments,
  total,
  onScoreChange
}) => {
  return (
    <Paper sx={{ p: 3, mb: 3, backgroundColor: '#fff3e0', border: '2px solid #ff9800' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Health Examination</Typography>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{total}/24 points</Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 3, mb: 3 }}>
        <ScoreInput
          value={showingMouthTeethGums}
          min={1}
          max={3}
          label="Showing mouth/teeth/gums"
          onChange={(value) => onScoreChange('showingMouthTeethGums', value)}
        />

        <ScoreInput
          value={conditionMouthTeethGums}
          min={1}
          max={2}
          label="Condition of mouth/teeth/gums"
          onChange={(value) => onScoreChange('conditionMouthTeethGums', value)}
        />

        <ScoreInput
          value={showingNose}
          min={1}
          max={2}
          label="Showing nose"
          onChange={(value) => onScoreChange('showingNose', value)}
        />

        <ScoreInput
          value={showingEyes}
          min={1}
          max={2}
          label="Showing eyes"
          onChange={(value) => onScoreChange('showingEyes', value)}
        />

        <ScoreInput
          value={conditionNoseEyes}
          min={1}
          max={2}
          label="Condition of nose & eyes"
          onChange={(value) => onScoreChange('conditionNoseEyes', value)}
        />

        <ScoreInput
          value={showingEars}
          min={1}
          max={2}
          label="Showing ears"
          onChange={(value) => onScoreChange('showingEars', value)}
        />

        <ScoreInput
          value={earsClean}
          min={1}
          max={2}
          label="Ears clean"
          onChange={(value) => onScoreChange('earsClean', value)}
        />

        <ScoreInput
          value={showingToenailsClaws}
          min={1}
          max={3}
          label="Showing toenails/claws"
          onChange={(value) => onScoreChange('showingToenailsClaws', value)}
        />

        <ScoreInput
          value={toenailsClipped}
          min={1}
          max={6}
          label="Toenails clipped"
          onChange={(value) => onScoreChange('toenailsClipped', value)}
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
          onChange={(e) => onScoreChange('healthExaminationComments', e.target.value)}
          placeholder="Add comments about the participant's health examination skills..."
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