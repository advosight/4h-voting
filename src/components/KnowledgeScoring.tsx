import React from 'react';
import { Box, Typography, TextField, Slider, Paper } from '@mui/material';

interface KnowledgeScoringProps {
  generalKnowledge: number;
  catBreedsShowing: number;
  catAnatomy: number;
  fourHKnowledge: number;
  comments: string;
  total: number;
  onScoreChange: (field: string, value: number | string) => void;
}

export const KnowledgeScoring: React.FC<KnowledgeScoringProps> = ({
  generalKnowledge,
  catBreedsShowing,
  catAnatomy,
  fourHKnowledge,
  comments,
  total,
  onScoreChange
}) => {
  return (
    <Paper sx={{ p: 3, mb: 3, backgroundColor: '#fff3e0', border: '2px solid #ff9800' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Knowledge</Typography>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{total}/12 points</Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3, mb: 3 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
            General Knowledge (1-3 pts)
          </Typography>
          <Slider
            value={generalKnowledge}
            onChange={(e, newValue) => onScoreChange('generalKnowledge', newValue)}
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
            value={generalKnowledge}
            onChange={(e) => onScoreChange('generalKnowledge', Math.max(1, Math.min(3, parseInt(e.target.value) || 1)))}
            inputProps={{ min: 1, max: 3 }}
          />
        </Box>

        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
            Cat Breeds & Showing (1-3 pts)
          </Typography>
          <Slider
            value={catBreedsShowing}
            onChange={(e, newValue) => onScoreChange('catBreedsShowing', newValue)}
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
            value={catBreedsShowing}
            onChange={(e) => onScoreChange('catBreedsShowing', Math.max(1, Math.min(3, parseInt(e.target.value) || 1)))}
            inputProps={{ min: 1, max: 3 }}
          />
        </Box>

        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
            Cat Anatomy (1-3 pts)
          </Typography>
          <Slider
            value={catAnatomy}
            onChange={(e, newValue) => onScoreChange('catAnatomy', newValue)}
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
            value={catAnatomy}
            onChange={(e) => onScoreChange('catAnatomy', Math.max(1, Math.min(3, parseInt(e.target.value) || 1)))}
            inputProps={{ min: 1, max: 3 }}
          />
        </Box>

        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
            4-H Knowledge (1-3 pts)
          </Typography>
          <Slider
            value={fourHKnowledge}
            onChange={(e, newValue) => onScoreChange('fourHKnowledge', newValue)}
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
            value={fourHKnowledge}
            onChange={(e) => onScoreChange('fourHKnowledge', Math.max(1, Math.min(3, parseInt(e.target.value) || 1)))}
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
          onChange={(e) => onScoreChange('knowledgeComments', e.target.value)}
          placeholder="Add comments about the participant's knowledge of cats, breeds, and 4H..."
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