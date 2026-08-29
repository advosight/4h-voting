import React from 'react';
import { Box, Typography, TextField, Slider, Paper } from '@mui/material';

interface HealthExaminationScoringProps {
  showingMouthTeethGums: number;
  conditionMouthTeethGums: number;
  showingNose: number;
  showingEyes: number;
  conditionNoseEyes: number;
  showingEars: number;
  earsClean: number;
  showingToenailsClaws: number;
  toenailsClipped: number;
  comments: string;
  total: number;
  onScoreChange: (field: string, value: number | string) => void;
}

export const HealthExaminationScoring: React.FC<HealthExaminationScoringProps> = ({
  showingMouthTeethGums,
  conditionMouthTeethGums,
  showingNose,
  showingEyes,
  conditionNoseEyes,
  showingEars,
  earsClean,
  showingToenailsClaws,
  toenailsClipped,
  comments,
  total,
  onScoreChange
}) => {
  return (
    <Paper sx={{ p: 3, mb: 3, backgroundColor: '#fff3e0', border: '2px solid #ff9800' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Health Examination</Typography>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{total}/24 points</Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3, mb: 3 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
            Showing mouth/teeth/gums (1-3 pts)
          </Typography>
          <Slider
            value={showingMouthTeethGums}
            onChange={(e, newValue) => onScoreChange('showingMouthTeethGums', newValue)}
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
            value={showingMouthTeethGums}
            onChange={(e) => onScoreChange('showingMouthTeethGums', Math.max(1, Math.min(3, parseInt(e.target.value) || 1)))}
            inputProps={{ min: 1, max: 3 }}
          />
        </Box>

        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
            Condition of mouth/teeth/gums (1-2 pts)
          </Typography>
          <Slider
            value={conditionMouthTeethGums}
            onChange={(e, newValue) => onScoreChange('conditionMouthTeethGums', newValue)}
            min={1}
            max={2}
            marks
            valueLabelDisplay="auto"
            sx={{ mb: 2 }}
          />
          <TextField
            type="number"
            size="small"
            fullWidth
            value={conditionMouthTeethGums}
            onChange={(e) => onScoreChange('conditionMouthTeethGums', Math.max(1, Math.min(2, parseInt(e.target.value) || 1)))}
            inputProps={{ min: 1, max: 2 }}
          />
        </Box>

        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
            Showing nose (1-2 pts)
          </Typography>
          <Slider
            value={showingNose}
            onChange={(e, newValue) => onScoreChange('showingNose', newValue)}
            min={1}
            max={2}
            marks
            valueLabelDisplay="auto"
            sx={{ mb: 2 }}
          />
          <TextField
            type="number"
            size="small"
            fullWidth
            value={showingNose}
            onChange={(e) => onScoreChange('showingNose', Math.max(1, Math.min(2, parseInt(e.target.value) || 1)))}
            inputProps={{ min: 1, max: 2 }}
          />
        </Box>

        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
            Showing eyes (1-2 pts)
          </Typography>
          <Slider
            value={showingEyes}
            onChange={(e, newValue) => onScoreChange('showingEyes', newValue)}
            min={1}
            max={2}
            marks
            valueLabelDisplay="auto"
            sx={{ mb: 2 }}
          />
          <TextField
            type="number"
            size="small"
            fullWidth
            value={showingEyes}
            onChange={(e) => onScoreChange('showingEyes', Math.max(1, Math.min(2, parseInt(e.target.value) || 1)))}
            inputProps={{ min: 1, max: 2 }}
          />
        </Box>

        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
            Condition of nose & eyes (1-2 pts)
          </Typography>
          <Slider
            value={conditionNoseEyes}
            onChange={(e, newValue) => onScoreChange('conditionNoseEyes', newValue)}
            min={1}
            max={2}
            marks
            valueLabelDisplay="auto"
            sx={{ mb: 2 }}
          />
          <TextField
            type="number"
            size="small"
            fullWidth
            value={conditionNoseEyes}
            onChange={(e) => onScoreChange('conditionNoseEyes', Math.max(1, Math.min(2, parseInt(e.target.value) || 1)))}
            inputProps={{ min: 1, max: 2 }}
          />
        </Box>

        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
            Showing ears (1-2 pts)
          </Typography>
          <Slider
            value={showingEars}
            onChange={(e, newValue) => onScoreChange('showingEars', newValue)}
            min={1}
            max={2}
            marks
            valueLabelDisplay="auto"
            sx={{ mb: 2 }}
          />
          <TextField
            type="number"
            size="small"
            fullWidth
            value={showingEars}
            onChange={(e) => onScoreChange('showingEars', Math.max(1, Math.min(2, parseInt(e.target.value) || 1)))}
            inputProps={{ min: 1, max: 2 }}
          />
        </Box>

        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
            Ears clean (1-2 pts)
          </Typography>
          <Slider
            value={earsClean}
            onChange={(e, newValue) => onScoreChange('earsClean', newValue)}
            min={1}
            max={2}
            marks
            valueLabelDisplay="auto"
            sx={{ mb: 2 }}
          />
          <TextField
            type="number"
            size="small"
            fullWidth
            value={earsClean}
            onChange={(e) => onScoreChange('earsClean', Math.max(1, Math.min(2, parseInt(e.target.value) || 1)))}
            inputProps={{ min: 1, max: 2 }}
          />
        </Box>

        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
            Showing toenails/claws (1-3 pts)
          </Typography>
          <Slider
            value={showingToenailsClaws}
            onChange={(e, newValue) => onScoreChange('showingToenailsClaws', newValue)}
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
            value={showingToenailsClaws}
            onChange={(e) => onScoreChange('showingToenailsClaws', Math.max(1, Math.min(3, parseInt(e.target.value) || 1)))}
            inputProps={{ min: 1, max: 3 }}
          />
        </Box>

        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
            Toenails clipped (1-6 pts)
          </Typography>
          <Slider
            value={toenailsClipped}
            onChange={(e, newValue) => onScoreChange('toenailsClipped', newValue)}
            min={1}
            max={6}
            marks
            valueLabelDisplay="auto"
            sx={{ mb: 2 }}
          />
          <TextField
            type="number"
            size="small"
            fullWidth
            value={toenailsClipped}
            onChange={(e) => onScoreChange('toenailsClipped', Math.max(1, Math.min(6, parseInt(e.target.value) || 1)))}
            inputProps={{ min: 1, max: 6 }}
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
          onChange={(e) => onScoreChange('healthExaminationComments', e.target.value)}
          placeholder="Add comments about the participant's health examination skills..."
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