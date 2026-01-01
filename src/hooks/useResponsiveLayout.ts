import { useState, useEffect, useCallback } from 'react';
import { useDeviceDetection } from './useDeviceDetection';

export interface LayoutConfig {
  columns: number;
  spacing: number;
  containerMaxWidth: string;
  sidebarWidth: string;
  headerHeight: string;
  bottomNavHeight: string;
}

export interface ResponsiveLayoutState {
  layout: LayoutConfig;
  showSidebar: boolean;
  showBottomNav: boolean;
  compactMode: boolean;
  adaptiveSpacing: boolean;
}

const getLayoutForBreakpoint = (
  breakpoint: string,
  orientation: string,
  isMobile: boolean,
  isTablet: boolean
): LayoutConfig => {
  // Mobile portrait
  if (isMobile && orientation === 'portrait') {
    return {
      columns: 1,
      spacing: 8,
      containerMaxWidth: '100%',
      sidebarWidth: '280px',
      headerHeight: '56px',
      bottomNavHeight: '64px'
    };
  }

  // Mobile landscape
  if (isMobile && orientation === 'landscape') {
    return {
      columns: 2,
      spacing: 12,
      containerMaxWidth: '100%',
      sidebarWidth: '240px',
      headerHeight: '48px',
      bottomNavHeight: '56px'
    };
  }

  // Tablet portrait
  if (isTablet && orientation === 'portrait') {
    return {
      columns: 2,
      spacing: 16,
      containerMaxWidth: '768px',
      sidebarWidth: '320px',
      headerHeight: '64px',
      bottomNavHeight: '0px'
    };
  }

  // Tablet landscape
  if (isTablet && orientation === 'landscape') {
    return {
      columns: 3,
      spacing: 20,
      containerMaxWidth: '1024px',
      sidebarWidth: '280px',
      headerHeight: '64px',
      bottomNavHeight: '0px'
    };
  }

  // Desktop (default)
  return {
    columns: breakpoint === 'xl' ? 4 : 3,
    spacing: 24,
    containerMaxWidth: breakpoint === 'xl' ? '1536px' : '1200px',
    sidebarWidth: '320px',
    headerHeight: '64px',
    bottomNavHeight: '0px'
  };
};

export const useResponsiveLayout = () => {
  const { capabilities, orientation, breakpoint, isMobile, isTablet } = useDeviceDetection();
  
  const [layoutState, setLayoutState] = useState<ResponsiveLayoutState>({
    layout: getLayoutForBreakpoint(breakpoint.breakpoint, orientation.orientation, isMobile, isTablet),
    showSidebar: !isMobile,
    showBottomNav: isMobile,
    compactMode: isMobile,
    adaptiveSpacing: true
  });

  // Update layout when device characteristics change
  useEffect(() => {
    const newLayout = getLayoutForBreakpoint(
      breakpoint.breakpoint,
      orientation.orientation,
      isMobile,
      isTablet
    );

    setLayoutState(prev => ({
      ...prev,
      layout: newLayout,
      showSidebar: !isMobile || orientation.orientation === 'landscape',
      showBottomNav: isMobile && orientation.orientation === 'portrait',
      compactMode: isMobile || (isTablet && orientation.orientation === 'portrait')
    }));
  }, [breakpoint.breakpoint, orientation.orientation, isMobile, isTablet]);

  // Handle smooth transitions during orientation changes
  useEffect(() => {
    if (orientation.isChanging) {
      // Add a brief delay to prevent layout flicker
      const timer = setTimeout(() => {
        // Force a re-render after orientation change completes
        setLayoutState(prev => ({ ...prev }));
      }, 150);

      return () => clearTimeout(timer);
    }
  }, [orientation.isChanging]);

  // Utility functions for layout decisions
  const shouldUseCardLayout = useCallback(() => {
    return isMobile || (isTablet && orientation.orientation === 'portrait');
  }, [isMobile, isTablet, orientation.orientation]);

  const shouldUseHorizontalScroll = useCallback(() => {
    return isMobile && orientation.orientation === 'landscape';
  }, [isMobile, orientation.orientation]);

  const shouldStackVertically = useCallback(() => {
    return isMobile && orientation.orientation === 'portrait';
  }, [isMobile, orientation.orientation]);

  const getOptimalColumnCount = useCallback((maxColumns: number = 4) => {
    const { columns } = layoutState.layout;
    return Math.min(columns, maxColumns);
  }, [layoutState.layout]);

  const getResponsiveSpacing = useCallback((baseSpacing: number = 16) => {
    if (!layoutState.adaptiveSpacing) return baseSpacing;
    
    const multiplier = isMobile ? 0.75 : isTablet ? 0.875 : 1;
    return Math.round(baseSpacing * multiplier);
  }, [layoutState.adaptiveSpacing, isMobile, isTablet]);

  // CSS custom properties for dynamic styling
  const getCSSVariables = useCallback(() => {
    const { layout } = layoutState;
    return {
      '--layout-columns': layout.columns.toString(),
      '--layout-spacing': `${layout.spacing}px`,
      '--container-max-width': layout.containerMaxWidth,
      '--sidebar-width': layout.sidebarWidth,
      '--header-height': layout.headerHeight,
      '--bottom-nav-height': layout.bottomNavHeight,
      '--is-mobile': isMobile ? '1' : '0',
      '--is-tablet': isTablet ? '1' : '0',
      '--is-landscape': orientation.orientation === 'landscape' ? '1' : '0',
      '--is-portrait': orientation.orientation === 'portrait' ? '1' : '0'
    };
  }, [layoutState, isMobile, isTablet, orientation.orientation]);

  return {
    ...layoutState,
    orientation: orientation.orientation,
    isChangingOrientation: orientation.isChanging,
    breakpoint: breakpoint.breakpoint,
    capabilities,
    
    // Utility functions
    shouldUseCardLayout,
    shouldUseHorizontalScroll,
    shouldStackVertically,
    getOptimalColumnCount,
    getResponsiveSpacing,
    getCSSVariables,
    
    // Layout helpers
    isLandscapeOptimized: orientation.orientation === 'landscape' && (isMobile || isTablet),
    isPortraitOptimized: orientation.orientation === 'portrait' && isMobile,
    shouldShowCompactHeader: isMobile || (isTablet && orientation.orientation === 'landscape'),
    shouldUseBottomSheet: isMobile && orientation.orientation === 'portrait'
  };
};