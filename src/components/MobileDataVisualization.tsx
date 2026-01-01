import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Remove as StableIcon,
} from '@mui/icons-material';

interface DataPoint {
  label: string;
  value: number;
  maxValue?: number;
  color?: string;
  trend?: 'up' | 'down' | 'stable';
  percentage?: number;
}

interface MobileDataVisualizationProps {
  title: string;
  data: DataPoint[];
  type?: 'bar' | 'progress' | 'stats';
  showTrends?: boolean;
  compact?: boolean;
}

const MobileDataVisualization: React.FC<MobileDataVisualizationProps> = ({
  title,
  data,
  type = 'stats',
  showTrends = false,
  compact = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main' }} />;
      case 'down':
        return <TrendingDownIcon sx={{ fontSize: 16, color: 'error.main' }} />;
      case 'stable':
        return <StableIcon sx={{ fontSize: 16, color: 'text.secondary' }} />;
      default:
        return null;
    }
  };

  const renderStatsView = () => (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 2 }}>
      {data.map((item, index) => (
        <Box
          key={index}
          sx={{
            textAlign: 'center',
            p: 2,
            backgroundColor: 'grey.50',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'grey.200',
          }}
        >
          <Typography
            variant="h6"
            sx={{
              color: item.color || 'primary.main',
              fontWeight: 700,
              fontSize: isMobile ? '1.1rem' : '1.25rem',
              mb: 0.5,
            }}
          >
            {item.value}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontWeight: 500,
              fontSize: isMobile ? '0.7rem' : '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
            }}
          >
            {item.label}
            {showTrends && getTrendIcon(item.trend)}
          </Typography>
        </Box>
      ))}
    </Box>
  );

  const renderProgressView = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {data.map((item, index) => (
        <Box key={index}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 500, fontSize: isMobile ? '0.8rem' : '0.875rem' }}>
              {item.label}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: item.color || 'primary.main' }}>
                {item.value}
                {item.maxValue && `/${item.maxValue}`}
              </Typography>
              {showTrends && getTrendIcon(item.trend)}
            </Box>
          </Box>
          <LinearProgress
            variant="determinate"
            value={item.percentage || (item.maxValue ? (item.value / item.maxValue) * 100 : 0)}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                backgroundColor: item.color || 'primary.main',
                borderRadius: 4,
              },
            }}
          />
        </Box>
      ))}
    </Box>
  );

  const renderBarView = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {data.map((item, index) => {
        const maxValue = Math.max(...data.map(d => d.value));
        const percentage = (item.value / maxValue) * 100;
        
        return (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography
              variant="body2"
              sx={{
                minWidth: isMobile ? 60 : 80,
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                fontWeight: 500,
              }}
            >
              {item.label}
            </Typography>
            <Box sx={{ flex: 1, position: 'relative' }}>
              <Box
                sx={{
                  height: isMobile ? 20 : 24,
                  backgroundColor: 'grey.200',
                  borderRadius: 1,
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    height: '100%',
                    width: `${percentage}%`,
                    backgroundColor: item.color || 'primary.main',
                    transition: 'width 0.3s ease',
                  }}
                />
              </Box>
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  right: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontWeight: 600,
                  color: 'text.primary',
                  fontSize: isMobile ? '0.7rem' : '0.75rem',
                  pr: 1,
                }}
              >
                {item.value}
              </Typography>
            </Box>
            {showTrends && (
              <Box sx={{ minWidth: 20 }}>
                {getTrendIcon(item.trend)}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );

  const renderContent = () => {
    switch (type) {
      case 'progress':
        return renderProgressView();
      case 'bar':
        return renderBarView();
      default:
        return renderStatsView();
    }
  };

  return (
    <Card elevation={2} sx={{ mb: 2 }}>
      <CardContent sx={{ p: compact ? 2 : 3, '&:last-child': { pb: compact ? 2 : 3 } }}>
        <Typography
          variant={isMobile ? "subtitle1" : "h6"}
          gutterBottom
          sx={{
            fontWeight: 600,
            color: 'text.primary',
            mb: 2,
            fontSize: isMobile ? '1rem' : '1.25rem',
          }}
        >
          {title}
        </Typography>
        {renderContent()}
      </CardContent>
    </Card>
  );
};

export default MobileDataVisualization;