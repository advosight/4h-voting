import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Chip,
  LinearProgress
} from '@mui/material';
import { Speed, Memory, NetworkCheck, Storage } from '@mui/icons-material';
import usePerformanceOptimization from '../hooks/usePerformanceOptimization';
import { swMessenger } from '../utils/serviceWorker';

interface PerformanceDashboardProps {
  open: boolean;
  onClose: () => void;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  open,
  onClose
}) => {
  const { performanceState, getPerformanceRecommendations } = usePerformanceOptimization();
  const [cacheStatus, setCacheStatus] = useState<Record<string, number>>({});
  const [webVitals, setWebVitals] = useState<Record<string, number>>({});

  useEffect(() => {
    if (open) {
      // Get cache status
      swMessenger.getCacheStatus()
        .then(setCacheStatus)
        .catch(console.error);

      // Get performance metrics
      if ('performance' in window) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          setWebVitals({
            'DOM Content Loaded': navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            'Load Complete': navigation.loadEventEnd - navigation.loadEventStart,
            'First Paint': performance.getEntriesByName('first-paint')[0]?.startTime || 0,
            'First Contentful Paint': performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
          });
        }
      }
    }
  }, [open]);

  const recommendations = getPerformanceRecommendations();
  const { isOnline, deviceType, connectionSpeed, memoryUsage } = performanceState;

  const handleClearCache = async () => {
    try {
      await swMessenger.clearCache();
      setCacheStatus({});
      alert('Cache cleared successfully');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      alert('Failed to clear cache');
    }
  };

  const getConnectionColor = (speed: string) => {
    switch (speed) {
      case 'fast': return 'success';
      case 'slow': return 'warning';
      default: return 'default';
    }
  };

  const getMemoryColor = (usage?: number) => {
    if (!usage) return 'default';
    if (usage > 0.8) return 'error';
    if (usage > 0.6) return 'warning';
    return 'success';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Speed />
          Performance Dashboard
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Grid container spacing={3}>
          {/* System Status */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <NetworkCheck sx={{ mr: 1 }} />
                  System Status
                </Typography>
                
                <Box mb={2}>
                  <Typography variant="body2" color="textSecondary">
                    Network Status
                  </Typography>
                  <Chip 
                    label={isOnline ? 'Online' : 'Offline'} 
                    color={isOnline ? 'success' : 'error'} 
                    size="small" 
                  />
                </Box>

                <Box mb={2}>
                  <Typography variant="body2" color="textSecondary">
                    Device Type
                  </Typography>
                  <Chip label={deviceType} variant="outlined" size="small" />
                </Box>

                <Box mb={2}>
                  <Typography variant="body2" color="textSecondary">
                    Connection Speed
                  </Typography>
                  <Chip 
                    label={connectionSpeed} 
                    color={getConnectionColor(connectionSpeed) as any}
                    size="small" 
                  />
                </Box>

                {memoryUsage && (
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Memory Usage
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      <LinearProgress 
                        variant="determinate" 
                        value={memoryUsage * 100} 
                        color={getMemoryColor(memoryUsage) as any}
                        sx={{ flexGrow: 1 }}
                      />
                      <Typography variant="body2">
                        {Math.round(memoryUsage * 100)}%
                      </Typography>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Cache Status */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <Storage sx={{ mr: 1 }} />
                  Cache Status
                </Typography>
                
                {Object.keys(cacheStatus).length > 0 ? (
                  <List dense>
                    {Object.entries(cacheStatus).map(([cacheName, count]) => (
                      <ListItem key={cacheName} disablePadding>
                        <ListItemText
                          primary={cacheName}
                          secondary={`${count} items cached`}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    No cache data available
                  </Typography>
                )}

                <Button 
                  variant="outlined" 
                  size="small" 
                  onClick={handleClearCache}
                  sx={{ mt: 2 }}
                >
                  Clear Cache
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Web Vitals */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <Memory sx={{ mr: 1 }} />
                  Web Vitals
                </Typography>
                
                {Object.keys(webVitals).length > 0 ? (
                  <List dense>
                    {Object.entries(webVitals).map(([metric, value]) => (
                      <ListItem key={metric} disablePadding>
                        <ListItemText
                          primary={metric}
                          secondary={`${Math.round(value)}ms`}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    No performance metrics available
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Recommendations */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recommendations
                </Typography>
                
                {recommendations.length > 0 ? (
                  <List dense>
                    {recommendations.map((recommendation, index) => (
                      <ListItem key={index} disablePadding>
                        <ListItemText
                          primary={recommendation}
                          slotProps={{ primary: { variant: 'body2' } }}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    No recommendations at this time
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

// Development-only performance monitor button
export const PerformanceMonitorButton: React.FC = () => {
  const [open, setOpen] = useState(false);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        onClick={() => setOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1000,
          minWidth: 'auto',
          padding: 1
        }}
      >
        <Speed />
      </Button>
      
      <PerformanceDashboard open={open} onClose={() => setOpen(false)} />
    </>
  );
};

export default PerformanceDashboard;