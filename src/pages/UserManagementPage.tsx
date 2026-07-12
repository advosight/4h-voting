import React from 'react';
import {
  Typography,
  Paper,
  Box,
} from '@mui/material';
import {
  People as PeopleIcon,
} from '@mui/icons-material';
import JudgeManagement from '../components/JudgeManagement';

function UserManagementPage(): JSX.Element {
  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PeopleIcon />
        User Management
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Invite judges and admins by email, and manage existing accounts and permissions.
      </Typography>
      
      <Paper elevation={2} sx={{ p: 3, mt: 3 }}>
        <JudgeManagement />
      </Paper>
    </Box>
  );
}

export default UserManagementPage;