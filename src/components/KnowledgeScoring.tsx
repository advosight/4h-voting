import React from 'react';
import { Box, Typography, TextField, Paper } from '@mui/material';
import { ScoreInput } from './ScoreInput';

interface KnowledgeScoringProps {
  catHealthCare: number;
  generalKnowledge: number;
  catBreedsShowing: number;
  catAnatomy: number;
  fourHKnowledge: number;
  comments: string;
  total: number;
  onScoreChange: (field: string, value: number | string) => void;
}

export const KnowledgeScoring: React.FC<KnowledgeScoringProps> = ({
  catHealthCare,
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
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{total}/15 points</Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 3, mb: 3 }}>
        <ScoreInput
          value={catHealthCare}
          min={1}
          max={3}
          label="Cat Health/Care"
          onChange={(value) => onScoreChange('catHealthCare', value)}
        />

        <ScoreInput
          value={generalKnowledge}
          min={1}
          max={3}
          label="General Knowledge"
          onChange={(value) => onScoreChange('generalKnowledge', value)}
        />

        <ScoreInput
          value={catBreedsShowing}
          min={1}
          max={3}
          label="Cat Breeds & Showing"
          onChange={(value) => onScoreChange('catBreedsShowing', value)}
        />

        <ScoreInput
          value={catAnatomy}
          min={1}
          max={3}
          label="Cat Anatomy"
          onChange={(value) => onScoreChange('catAnatomy', value)}
        />

        <ScoreInput
          value={fourHKnowledge}
          min={1}
          max={3}
          label="4-H Knowledge"
          onChange={(value) => onScoreChange('fourHKnowledge', value)}
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