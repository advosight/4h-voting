import React from 'react';
import { Box, Typography, TextField, Paper } from '@mui/material';
import { ScoreInput } from './ScoreInput';

interface ClassBeautyScoringProps {
  beautyScore: number;
  comments: string;
  total: number;
  onScoreChange: (field: string, value: number | string) => void;
}

export const ClassBeautyScoring: React.FC<ClassBeautyScoringProps> = ({
  beautyScore,
  comments,
  total,
  onScoreChange
}) => {
  return (
    <Paper sx={{ p: 3, mb: 3, backgroundColor: '#fff3e0', border: '2px solid #ff9800' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Cat's Beauty</Typography>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{total}/15 points</Typography>
      </Box>

      <Typography variant="body2" sx={{ mb: 3, color: '#666' }}>
        Points given according to judge's taste, Markings, colors, Body type & coat, Overall grace & balance
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 3, mb: 3 }}>
        <ScoreInput
          value={beautyScore}
          min={1}
          max={15}
          label="Beauty Score"
          onChange={(value) => onScoreChange('beautyScore', value)}
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
          onChange={(e) => onScoreChange('beautyComments', e.target.value)}
          placeholder="Add comments about the cat's beauty, markings, colors, body type and coat..."
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
