import React from 'react';
import { Box, Typography, TextField, Slider, Paper } from '@mui/material';
import { ScoreInput } from './ScoreInput';

interface AppearanceScoringProps {
  attire: number;
  attentive: number;
  courteous: number;
  comments: string;
  total: number;
  onScoreChange: (field: string, value: number | string) => void;
}

export const AppearanceScoring: React.FC<AppearanceScoringProps> = ({
  attire,
  attentive,
  courteous,
  comments,
  total,
  onScoreChange
}) => {
  return (
    <Paper sx={{ p: 3, mb: 3, backgroundColor: '#fff3e0', border: '2px solid #ff9800' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ color: '#ff9800', fontWeight: 600 }}>
          Appearance & Demeanor
        </Typography>
        <Typography variant="h6" sx={{ color: '#ff9800', fontWeight: 600 }}>
          {total}/20 points
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 3 }}>
        <ScoreInput
          value={attire}
          min={1}
          max={10}
          label="Neat, clean, appropriate attire"
          onChange={(value) => onScoreChange('attire', value)}
        />

        <ScoreInput
          value={attentive}
          min={1}
          max={5}
          label="Attentive"
          onChange={(value) => onScoreChange('attentive', value)}
        />

        <ScoreInput
          value={courteous}
          min={1}
          max={5}
          label="Courteous"
          onChange={(value) => onScoreChange('courteous', value)}
        />
      </Box>

      <Box sx={{ mt: 3 }}>
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Comments (optional, max 500 characters)"
          value={comments}
          onChange={(e) => onScoreChange('appearanceComments', e.target.value.slice(0, 500))}
          placeholder="Add comments about the participant's appearance and demeanor..."
          helperText={`${comments.length}/500 characters`}
        />
      </Box>
    </Paper>
  );
};