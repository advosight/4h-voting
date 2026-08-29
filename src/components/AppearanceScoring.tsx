import React from 'react';
import { Box, Typography, TextField, Slider, Paper } from '@mui/material';

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

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
            Neat, clean, appropriate attire (1-10 pts)
          </Typography>
          <Slider
            value={attire}
            onChange={(e, value) => onScoreChange('attire', value as number)}
            min={1}
            max={10}
            marks
            valueLabelDisplay="auto"
            sx={{ mb: 1 }}
          />
          <TextField
            type="number"
            size="small"
            value={attire}
            onChange={(e) => onScoreChange('attire', Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
            inputProps={{ min: 1, max: 10 }}
            sx={{ width: '100px' }}
          />
        </Box>

        <Box>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
            Attentive (1-5 pts)
          </Typography>
          <Slider
            value={attentive}
            onChange={(e, value) => onScoreChange('attentive', value as number)}
            min={1}
            max={5}
            marks
            valueLabelDisplay="auto"
            sx={{ mb: 1 }}
          />
          <TextField
            type="number"
            size="small"
            value={attentive}
            onChange={(e) => onScoreChange('attentive', Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))}
            inputProps={{ min: 1, max: 5 }}
            sx={{ width: '100px' }}
          />
        </Box>

        <Box>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
            Courteous (1-5 pts)
          </Typography>
          <Slider
            value={courteous}
            onChange={(e, value) => onScoreChange('courteous', value as number)}
            min={1}
            max={5}
            marks
            valueLabelDisplay="auto"
            sx={{ mb: 1 }}
          />
          <TextField
            type="number"
            size="small"
            value={courteous}
            onChange={(e) => onScoreChange('courteous', Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))}
            inputProps={{ min: 1, max: 5 }}
            sx={{ width: '100px' }}
          />
        </Box>
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