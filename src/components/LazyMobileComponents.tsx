import React, { Suspense } from 'react';
import { CircularProgress, Box } from '@mui/material';
import { shouldLoadMobileComponents } from '../utils/mobileDetection';

// Lazy load mobile-specific components
const MobileDataVisualization = React.lazy(() => 
  import('./MobileDataVisualization').then(module => ({ default: module.MobileDataVisualization }))
);

const SwipeableCardContainer = React.lazy(() => 
  import('./SwipeableCardContainer').then(module => ({ default: module.SwipeableCardContainer }))
);

const ResponsiveDataTable = React.lazy(() => 
  import('./ResponsiveDataTable').then(module => ({ default: module.ResponsiveDataTable }))
);

// Loading fallback component
const LoadingFallback: React.FC = () => (
  <Box 
    display="flex" 
    justifyContent="center" 
    alignItems="center" 
    minHeight="200px"
  >
    <CircularProgress size={40} />
  </Box>
);

// HOC for conditional mobile component loading
export const withMobileOptimization = <P extends object>(
  Component: React.ComponentType<P>,
  MobileComponent?: React.ComponentType<P>
) => {
  return (props: P) => {
    const isMobile = shouldLoadMobileComponents();
    
    if (isMobile && MobileComponent) {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <MobileComponent {...props} />
        </Suspense>
      );
    }
    
    return <Component {...props} />;
  };
};

// Lazy mobile components with suspense
export const LazyMobileDataVisualization: React.FC<any> = (props) => (
  <Suspense fallback={<LoadingFallback />}>
    <MobileDataVisualization {...props} />
  </Suspense>
);

export const LazySwipeableCardContainer: React.FC<any> = (props) => (
  <Suspense fallback={<LoadingFallback />}>
    <SwipeableCardContainer {...props} />
  </Suspense>
);

export const LazyResponsiveDataTable: React.FC<any> = (props) => (
  <Suspense fallback={<LoadingFallback />}>
    <ResponsiveDataTable {...props} />
  </Suspense>
);

// Dynamic import utility for mobile-specific features
export const loadMobileFeature = async (featureName: string) => {
  if (!shouldLoadMobileComponents()) {
    return null;
  }
  
  try {
    switch (featureName) {
      case 'swipeGestures':
        return await import('../utils/swipeGestures');
      case 'touchOptimization':
        return await import('../utils/touchOptimization');
      case 'mobileNavigation':
        return await import('../components/MobileNavigation');
      default:
        return null;
    }
  } catch (error) {
    console.warn(`Failed to load mobile feature: ${featureName}`, error);
    return null;
  }
};