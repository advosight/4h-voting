import React from 'react';
import { Box, Button, Typography, useTheme, useMediaQuery } from '@mui/material';
import { Remove as RemoveIcon, Add as AddIcon } from '@mui/icons-material';

interface ScoreInputProps {
  value: number;
  min: number;
  max: number;
  label: string;
  onChange: (value: number) => void;
}

export const ScoreInput: React.FC<ScoreInputProps> = ({
  value,
  min,
  max,
  label,
  onChange
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleMinus = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handlePlus = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, bgcolor: '#fafafa', borderRadius: 1, border: '1px solid #e0e0e0' }}>
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
          {label}
        </Typography>
        <Typography variant="caption" sx={{ color: '#666' }}>
          Range: {min}-{max} points
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button
          size="small"
          variant="outlined"
          onClick={handleMinus}
          disabled={value <= min}
          sx={{
            minWidth: isMobile ? '36px' : '44px',
            height: isMobile ? '36px' : '44px',
            p: 0
          }}
          aria-label={`Decrease ${label}`}
        >
          <RemoveIcon fontSize="small" />
        </Button>

        <Box
          sx={{
            width: '60px',
            textAlign: 'center',
            py: 1,
            px: 2,
            bgcolor: 'white',
            border: '2px solid #ff9800',
            borderRadius: 1,
            fontWeight: 'bold',
            fontSize: '1.2rem',
            color: '#ff9800'
          }}
        >
          {value}
        </Box>

        <Button
          size="small"
          variant="outlined"
          onClick={handlePlus}
          disabled={value >= max}
          sx={{
            minWidth: isMobile ? '36px' : '44px',
            height: isMobile ? '36px' : '44px',
            p: 0
          }}
          aria-label={`Increase ${label}`}
        >
          <AddIcon fontSize="small" />
        </Button>
      </Box>
    </Box>
  );
};
