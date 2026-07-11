import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import FitShowScoreReports from '../components/FitShowScoreReports';

const FitShowReportsPage: React.FC = () => {
  return (
    <Box sx={{ maxWidth: '100%', mx: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Fit and Show Scoring Reports
      </Typography>
      
      <Typography variant="body1" color="text.secondary" component="p" sx={{ mb: 2 }}>
        View comprehensive reports for fit and show scoring results. Filter by judge, participant,
        score range, or date to analyze performance and generate detailed reports.
      </Typography>

      <Paper sx={{ p: 0, mt: 3 }}>
        <FitShowScoreReports />
      </Paper>
    </Box>
  );
};

export default FitShowReportsPage;