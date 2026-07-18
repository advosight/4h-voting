import React, { ReactNode, useEffect, useState } from 'react';
import { Box, Paper, useTheme } from '@mui/material';
import { useResponsive } from '../contexts/ResponsiveContext';

interface ResponsiveFormProps {
  children: ReactNode;
  title?: string;
  maxWidth?: number | string;
  enableLandscapeOptimization?: boolean;
  stickyActions?: boolean;
  className?: string;
}

export const ResponsiveForm: React.FC<ResponsiveFormProps> = ({
  children,
  title,
  maxWidth = 600,
  enableLandscapeOptimization = true,
  stickyActions = false,
  className = ''
}) => {
  const theme = useTheme();
  const {
    isMobile,
    isTablet,
    orientation,
    isChangingOrientation,
    shouldStackVertically,
    getResponsiveSpacing,
    isLandscapeOptimized
  } = useResponsive();

  const [formLayout, setFormLayout] = useState<'single' | 'two-column' | 'adaptive'>('single');

  // Determine optimal form layout based on device and orientation
  useEffect(() => {
    if (isMobile) {
      setFormLayout(orientation === 'landscape' && enableLandscapeOptimization ? 'two-column' : 'single');
    } else if (isTablet) {
      setFormLayout(orientation === 'landscape' ? 'two-column' : 'adaptive');
    } else {
      setFormLayout('adaptive');
    }
  }, [isMobile, isTablet, orientation, enableLandscapeOptimization]);

  const getFormStyles = () => {
    const baseSpacing = getResponsiveSpacing(16);
    
    return {
      container: {
        width: '100%',
        maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth,
        margin: '0 auto',
        padding: baseSpacing,
        transition: theme.transitions.create(['padding', 'margin'], {
          duration: theme.transitions.duration.standard,
        }),
        opacity: isChangingOrientation ? 0.7 : 1,
      },
      paper: {
        padding: baseSpacing * 1.5,
        borderRadius: isMobile ? 0 : theme.shape.borderRadius,
        boxShadow: isMobile ? 'none' : theme.shadows[2],
        transition: theme.transitions.create(['padding', 'border-radius', 'box-shadow'], {
          duration: theme.transitions.duration.standard,
        }),
      },
      formContent: {
        display: 'grid',
        gap: baseSpacing,
        gridTemplateColumns: formLayout === 'two-column' ? '1fr 1fr' : '1fr',
        alignItems: 'start',
        transition: theme.transitions.create(['grid-template-columns', 'gap'], {
          duration: theme.transitions.duration.standard,
        }),
      },
      title: {
        gridColumn: formLayout === 'two-column' ? '1 / -1' : '1',
        marginBottom: baseSpacing,
        fontSize: isMobile ? '1.25rem' : '1.5rem',
        fontWeight: 500,
        color: theme.palette.text.primary,
      }
    };
  };

  const styles = getFormStyles();

  // Clone children to add responsive props
  const enhanceFormFields = (children: ReactNode): ReactNode => {
    return React.Children.map(children, (child, index) => {
      if (!React.isValidElement(child)) return child;

      // Add responsive props to form fields
      const enhancedProps: any = {
        fullWidth: true,
        size: isMobile ? 'medium' : 'small',
        variant: isMobile ? 'outlined' : 'outlined',
      };

      // Handle form actions (buttons) specially
      if (child.props?.className?.includes('form-actions') || 
          child.type?.displayName?.includes('FormActions')) {
        enhancedProps.sx = {
          gridColumn: formLayout === 'two-column' ? '1 / -1' : '1',
          display: 'flex',
          flexDirection: shouldStackVertically() ? 'column' : 'row',
          gap: getResponsiveSpacing(8),
          justifyContent: 'flex-end',
          marginTop: getResponsiveSpacing(16),
          ...(stickyActions && isMobile && {
            position: 'sticky',
            bottom: 0,
            backgroundColor: theme.palette.background.paper,
            padding: getResponsiveSpacing(16),
            margin: `-${getResponsiveSpacing(16)}px`,
            marginTop: getResponsiveSpacing(16),
            borderTop: `1px solid ${theme.palette.divider}`,
            zIndex: 1,
          })
        };
      }

      // Handle full-width fields in landscape mode
      if (child.props?.['data-fullwidth'] === 'landscape' && isLandscapeOptimized) {
        enhancedProps.sx = {
          ...enhancedProps.sx,
          gridColumn: '1 / -1'
        };
      }

      return React.cloneElement(child, enhancedProps);
    });
  };

  return (
    <Box sx={styles.container} className={`responsive-form ${className}`}>
      <Paper sx={styles.paper} elevation={isMobile ? 0 : 2}>
        {title && (
          <Box component="h2" sx={styles.title}>
            {title}
          </Box>
        )}
        <Box sx={styles.formContent}>
          {enhanceFormFields(children)}
        </Box>
      </Paper>
    </Box>
  );
};

// Helper component for form actions
interface ResponsiveFormActionsProps {
  children: ReactNode;
  align?: 'left' | 'center' | 'right';
  sticky?: boolean;
}

export const ResponsiveFormActions: React.FC<ResponsiveFormActionsProps> = ({
  children,
  align = 'right',
  sticky = false
}) => {
  const { shouldStackVertically, getResponsiveSpacing } = useResponsive();
  
  return (
    <Box
      className="form-actions"
      sx={{
        display: 'flex',
        flexDirection: shouldStackVertically() ? 'column' : 'row',
        gap: getResponsiveSpacing(8),
        justifyContent: align === 'left' ? 'flex-start' : align === 'center' ? 'center' : 'flex-end',
        alignItems: shouldStackVertically() ? 'stretch' : 'center',
      }}
    >
      {children}
    </Box>
  );
};