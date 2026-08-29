import React from 'react';
import { Box, Typography, TextField, Slider, Paper } from '@mui/material';

interface GroomingCareScoringProps {
  showingBellyCoatCleanliness: number;
  coatCleanWellGroomed: number;
  catHealthCare: number;
  comments: string;
  total: number;
  onScoreChange: (field: string, value: number | string) => void;
}

export const GroomingCareScoring: React.FC<GroomingCareScoringProps> = ({
  showingBellyCoatCleanliness,
  coatCleanWellGroomed,
  catHealthCare,
  comments,
  total,
  onScoreChange
}) => {
  return (
    <Paper sx={{ p: 3, mb: 3, backgroundColor: '#fff3e0', border: '2px solid #ff9800' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Grooming & Care</Typography>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{total}/14 points</Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3, mb: 3 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
            Showing belly/coat/cleanliness (1-3 pts)
          </Typography>
          <Slider
            value={showingBellyCoatCleanliness}
            onChange={(e, newValue) => onScoreChange('showingBellyCoatCleanliness', newValue)}
            min={1}
            max={3}
            marks
            valueLabelDisplay="auto"
            sx={{ mb: 2 }}
          />
          <TextField
            type="number"
            size="small"
            fullWidth
            value={showingBellyCoatCleanliness}
            onChange={(e) => onScoreChange('showingBellyCoatCleanliness', Math.max(1, Math.min(3, parseInt(e.target.value) || 1)))}
            inputProps={{ min: 1, max: 3 }}
          />
        </Box>

        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
            Coat clean & well groomed (1-8 pts)
          </Typography>
          <Slider
            value={coatCleanWellGroomed}
            onChange={(e, newValue) => onScoreChange('coatCleanWellGroomed', newValue)}
            min={1}
            max={8}
            marks
            valueLabelDisplay="auto"
            sx={{ mb: 2 }}
          />
          <TextField
            type="number"
            size="small"
            fullWidth
            value={coatCleanWellGroomed}
            onChange={(e) => onScoreChange('coatCleanWellGroomed', Math.max(1, Math.min(8, parseInt(e.target.value) || 1)))}
            inputProps={{ min: 1, max: 8 }}
          />
        </Box>

        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
            Cat health/care (1-3 pts)
          </Typography>
          <Slider
            value={catHealthCare}
            onChange={(e, newValue) => onScoreChange('catHealthCare', newValue)}
            min={1}
            max={3}
            marks
            valueLabelDisplay="auto"
            sx={{ mb: 2 }}
          />
          <TextField
            type="number"
            size="small"
            fullWidth
            value={catHealthCare}
            onChange={(e) => onScoreChange('catHealthCare', Math.max(1, Math.min(3, parseInt(e.target.value) || 1)))}
            inputProps={{ min: 1, max: 3 }}
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