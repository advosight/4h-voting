import React from 'react';
import { Box, Typography, TextField, Paper } from '@mui/material';
import { ScoreInput } from './ScoreInput';

interface DemonstrationScoringProps {
  showingHeadShape: number;
  showingBodyType: number;
  showingTail: number;
  showingCoatTexture: number;
  comments: string;
  total: number;
  onScoreChange: (field: string, value: number | string) => void;
}

export const DemonstrationScoring: React.FC<DemonstrationScoringProps> = ({
  showingHeadShape,
  showingBodyType,
  showingTail,
  showingCoatTexture,
  comments,
  total,
  onScoreChange
}) => {
  return (
    <Paper sx={{ p: 3, mb: 3, backgroundColor: '#fff3e0', border: '2px solid #ff9800' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Demonstration Skills</Typography>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{total}/16 points</Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 3, mb: 3 }}>
        <ScoreInput
          value={showingHeadShape}
          min={1}
          max={4}
          label="Showing head shape"
          onChange={(value) => onScoreChange('showingHeadShape', value)}
        />

        <ScoreInput
          value={showingBodyType}
          min={1}
          max={4}
          label="Showing body type"
          onChange={(value) => onScoreChange('showingBodyType', value)}
        />

        <ScoreInput
          value={showingTail}
          min={1}
          max={4}
          label="Showing tail"
          onChange={(value) => onScoreChange('showingTail', value)}
        />

        <ScoreInput
          value={showingCoatTexture}
          min={1}
          max={4}
          label="Showing coat texture"
          onChange={(value) => onScoreChange('showingCoatTexture', value)}
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
          onChange={(e) => onScoreChange('demonstrationComments', e.target.value)}
          placeholder="Add comments about the participant's demonstration skills..."
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