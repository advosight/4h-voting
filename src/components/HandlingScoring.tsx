import React from 'react';
import { Box, Typography, TextField, Paper } from '@mui/material';
import { ScoreInput } from './ScoreInput';

interface HandlingScoringProps {
  controlEquipment: number;
  pickupCarrying: number;
  comments: string;
  total: number;
  onScoreChange: (field: string, value: number | string) => void;
}

export const HandlingScoring: React.FC<HandlingScoringProps> = ({
  controlEquipment,
  pickupCarrying,
  comments,
  total,
  onScoreChange
}) => {
  return (
    <Paper sx={{ p: 3, mb: 3, backgroundColor: '#fff3e0', border: '2px solid #ff9800' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Handling & Control</Typography>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{total}/14 points</Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 3, mb: 3 }}>
        <ScoreInput
          value={controlEquipment}
          min={1}
          max={10}
          label="Control, harness fits, leash on wrist"
          onChange={(value) => onScoreChange('controlEquipment', value)}
        />

        <ScoreInput
          value={pickupCarrying}
          min={1}
          max={4}
          label="Picking up & carrying of cat"
          onChange={(value) => onScoreChange('pickupCarrying', value)}
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
          onChange={(e) => onScoreChange('handlingComments', e.target.value)}
          placeholder="Add comments about the participant's handling techniques..."
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