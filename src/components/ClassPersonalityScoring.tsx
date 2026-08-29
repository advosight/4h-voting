import React from 'react';
import { Box, Typography, TextField, Paper } from '@mui/material';
import { ScoreInput } from './ScoreInput';

interface ClassPersonalityScoringProps {
  personalityScore: number;
  comments: string;
  total: number;
  onScoreChange: (field: string, value: number | string) => void;
}

export const ClassPersonalityScoring: React.FC<ClassPersonalityScoringProps> = ({
  personalityScore,
  comments,
  total,
  onScoreChange
}) => {
  return (
    <Paper sx={{ p: 3, mb: 3, backgroundColor: '#fff3e0', border: '2px solid #ff9800' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Cat's Personality</Typography>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{total}/20 points</Typography>
      </Box>

      <Typography variant="body2" sx={{ mb: 3, color: '#666' }}>
        Friendly, alert & easy to handle. Allow some nervousness due to show. Dangerous cats discouraged (opposed to fear) – may receive white ribbon.
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 3, mb: 3 }}>
        <ScoreInput
          value={personalityScore}
          min={1}
          max={20}
          label="Personality Score"
          onChange={(value) => onScoreChange('personalityScore', value)}
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
          onChange={(e) => onScoreChange('personalityComments', e.target.value)}
          placeholder="Add comments about the cat's personality, friendliness, and behavior..."
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
