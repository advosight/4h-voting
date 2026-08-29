import React from 'react';
import { Box, Typography, TextField, Slider, Paper } from '@mui/material';

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

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3, mb: 3 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
            Showing head shape (1-4 pts)
          </Typography>
          <Slider
            value={showingHeadShape}
            onChange={(e, newValue) => onScoreChange('showingHeadShape', newValue)}
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
            value={showingHeadShape}
            onChange={(e) => onScoreChange('showingHeadShape', Math.max(1, Math.min(4, parseInt(e.target.value) || 1)))}
            inputProps={{ min: 1, max: 4 }}
          />
        </Box>

        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
            Showing body type (1-4 pts)
          </Typography>
          <Slider
            value={showingBodyType}
            onChange={(e, newValue) => onScoreChange('showingBodyType', newValue)}
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
            value={showingBodyType}
            onChange={(e) => onScoreChange('showingBodyType', Math.max(1, Math.min(4, parseInt(e.target.value) || 1)))}
            inputProps={{ min: 1, max: 4 }}
          />
        </Box>

        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
            Showing tail (1-4 pts)
          </Typography>
          <Slider
            value={showingTail}
            onChange={(e, newValue) => onScoreChange('showingTail', newValue)}
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
            value={showingTail}
            onChange={(e) => onScoreChange('showingTail', Math.max(1, Math.min(4, parseInt(e.target.value) || 1)))}
            inputProps={{ min: 1, max: 4 }}
          />
        </Box>

        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
            Showing coat texture (1-4 pts)
          </Typography>
          <Slider
            value={showingCoatTexture}
            onChange={(e, newValue) => onScoreChange('showingCoatTexture', newValue)}
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
            value={showingCoatTexture}
            onChange={(e) => onScoreChange('showingCoatTexture', Math.max(1, Math.min(4, parseInt(e.target.value) || 1)))}
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