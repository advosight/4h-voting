import React from 'react';
import { Alert, Snackbar, Box, Typography } from '@mui/material';
import { WifiOff, Wifi, CloudOff, CloudDone } from '@mui/icons-material';
import usePerformanceOptimization from '../hooks/usePerformanceOptimization';

interface NetworkStatusIndicatorProps {
  showPersistent?: boolean;
  position?: 'top' | 'bottom';
}

export const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  showPersistent = false,
  position = 'top'
}) => {
  const { performanceState } = usePerformanceOptimization();
  const { isOnline, connectionSpeed } = performanceState;

  if (showPersistent) {
    return (
      <Box
        sx={{
          position: 'fixed',
          [position]: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          backgroundColor: isOnline ? 'success.main' : 'error.main',
          color: 'white',
          padding: 1,
          textAlign: 'center',
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1
        }}
      >
        {isOnline ? <Wifi fontSize="small" /> : <WifiOff fontSize="small" />}
        <Typography variant="body2" component="span">
          {isOnline 
            ? `Online${connectionSpeed !== 'unknown' ? ` (${connectionSpeed} connection)` : ''}`
            : 'Offline - Some features may be limited'
          }
        </Typography>
      </Box>
    );
  }

  return (
    <Snackbar
      open={!isOnline}
      anchorOrigin={{ vertical: position, horizontal: 'center' }}
      sx={{ zIndex: 9999 }}
    >
      <Alert 
        severity="warning" 
        icon={<WifiOff />}
        sx={{ width: '100%' }}
      >
        You're offline. Some features may be limited.
      </Alert>
    </Snackbar>
  );
};

export const ConnectionSpeedIndicator: React.FC = () => {
  const { performanceState } = usePerformanceOptimization();
  const { connectionSpeed, isOnline } = performanceState;

  if (!isOnline || connectionSpeed === 'unknown') {
    return null;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        color: connectionSpeed === 'slow' ? 'warning.main' : 'success.main',
        fontSize: '0.75rem'
      }}
    >
      {connectionSpeed === 'slow' ? <CloudOff fontSize="small" /> : <CloudDone fontSize="small" />}
      <Typography variant="caption">
        {connectionSpeed === 'slow' ? 'Slow connection' : 'Fast connection'}
      </Typography>
    </Box>
  );
};

export default NetworkStatusIndicator;