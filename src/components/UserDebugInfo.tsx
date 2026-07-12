import React, { useState, useEffect } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import { Box, Typography, Paper, Button, Collapse } from '@mui/material';

function UserDebugInfo(): JSX.Element {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      setUserInfo(user);
    } catch (error) {
      console.error('Error fetching user info:', error);
      setUserInfo({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  if (loading) {
    return <Typography>Loading user info...</Typography>;
  }

  return (
    <Box sx={{ position: 'fixed', bottom: 80, right: 10, zIndex: 9999 }}>
      <Button
        variant="outlined"
        size="small"
        onClick={() => setShowDebug(!showDebug)}
        sx={{ mb: 1 }}
      >
        {showDebug ? 'Hide' : 'Show'} User Debug
      </Button>
      
      <Collapse in={showDebug}>
        <Paper sx={{ p: 2, maxWidth: 400, maxHeight: 400, overflow: 'auto' }}>
          <Typography variant="h6" gutterBottom>
            User Debug Info
          </Typography>
          <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(userInfo, null, 2)}
          </pre>
        </Paper>
      </Collapse>
    </Box>
  );
}

export default UserDebugInfo;