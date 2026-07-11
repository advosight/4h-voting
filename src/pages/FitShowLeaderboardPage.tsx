import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import FitShowScoreLeaderboard from '../components/FitShowScoreLeaderboard';

const FitShowLeaderboardPage: React.FC = () => {
  return (
    <Box sx={{ maxWidth: '100%', mx: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Fit and Show Scoring Leaderboard
      </Typography>
      
      <Typography variant="body1" color="text.secondary" component="p" sx={{ mb: 2 }}>
        View participant rankings based on fit and show scoring results. Rankings show
        participants' performance in showmanship, handling, and knowledge categories.
      </Typography>

      <Paper sx={{ p: 0, mt: 3 }}>
        <FitShowScoreLeaderboard 
          showTop={20}
          finalizedOnly={true}
        />
      </Paper>
    </Box>
  );
};

export default FitShowLeaderboardPage;