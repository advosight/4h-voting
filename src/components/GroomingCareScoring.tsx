import React from 'react';
import { Box, Typography, TextField, Paper } from '@mui/material';
import { ScoreInput } from './ScoreInput';

interface GroomingCareScoringProps {
  showingBellyCoatCleanliness: number;
  coatCleanWellGroomed: number;
  comments: string;
  total: number;
  onScoreChange: (field: string, value: number | string) => void;
}

export const GroomingCareScoring: React.FC<GroomingCareScoringProps> = ({
  showingBellyCoatCleanliness,
  coatCleanWellGroomed,
  comments,
  total,
  onScoreChange
}) => {
  return (
    <Paper sx={{ p: 3, mb: 3, backgroundColor: '#fff3e0', border: '2px solid #ff9800' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Grooming & Presentation</Typography>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{total}/11 points</Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 3, mb: 3 }}>
        <ScoreInput
          value={showingBellyCoatCleanliness}
          min={1}
          max={3}
          label="Showing belly/coat/cleanliness"
          onChange={(value) => onScoreChange('showingBellyCoatCleanliness', value)}
        />

        <ScoreInput
          value={coatCleanWellGroomed}
          min={1}
          max={8}
          label="Coat clean & well groomed"
          onChange={(value) => onScoreChange('coatCleanWellGroomed', value)}
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
          onChange={(e) => onScoreChange('groomingCareComments', e.target.value)}
          placeholder="Add comments about the participant's grooming and care knowledge..."
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