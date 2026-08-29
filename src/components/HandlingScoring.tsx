import React from 'react';
import { Box, Typography, TextField, Slider, Paper } from '@mui/material';

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

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3, mb: 3 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
            Control, harness fits, leash on wrist (1-10 pts)
          </Typography>
          <Slider
            value={controlEquipment}
            onChange={(e, newValue) => onScoreChange('controlEquipment', newValue)}
            min={1}
            max={10}
            marks
            valueLabelDisplay="auto"
            sx={{ mb: 2 }}
          />
          <TextField
            type="number"
            size="small"
            fullWidth
            value={controlEquipment}
            onChange={(e) => onScoreChange('controlEquipment', Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
            inputProps={{ min: 1, max: 10 }}
          />
        </Box>

        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
            Picking up & carrying of cat (1-4 pts)
          </Typography>
          <Slider
            value={pickupCarrying}
            onChange={(e, newValue) => onScoreChange('pickupCarrying', newValue)}
            min={1}
            max={4}
            marks
            valueLabelDisplay="auto"
            sx={{ mb: 2 }}
          />
          <TextField
            type="number"
            size="small"
            fullWidth
            value={pickupCarrying}
            onChange={(e) => onScoreChange('pickupCarrying', Math.max(1, Math.min(4, parseInt(e.target.value) || 1)))}
            inputProps={{ min: 1, max: 4 }}
          />
        </Box>
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