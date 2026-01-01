import React from 'react';
import {
  Typography,
  Paper,
  Box,
  Grid,
} from '@mui/material';
import {
  Leaderboard as LeaderboardIcon,
} from '@mui/icons-material';
import ScoreLeaderboard from '../components/ScoreLeaderboard';
import ClassScoreLeaderboard from '../components/ClassScoreLeaderboard';

function LeaderboardPage(): JSX.Element {
  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LeaderboardIcon />
        Scoring Leaderboards
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        View real-time scoring leaderboards and rankings for both cage and class scoring.
      </Typography>
      
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} lg={6}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <ScoreLeaderboard 
              showOnlyFinalized={false}
              maxEntries={15}
              refreshInterval={30000}
            />
          </Paper>
        </Grid>
        <Grid item xs={12} lg={6}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <ClassScoreLeaderboard 
              showOnlyFinalized={false}
              maxEntriesPerRibbon={15}
              refreshInterval={30000}
              groupByRibbon={true}
            />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default LeaderboardPage;