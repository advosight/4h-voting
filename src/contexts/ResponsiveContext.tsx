import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { useDeviceDetection } from '../hooks/useDeviceDetection';

interface ResponsiveContextType {
  // Device detection
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  hasTouch: boolean;
  isOnline: boolean;
  
  // Orientation
  orientation: 'portrait' | 'landscape';
  isChangingOrientation: boolean;
  isLandscape: boolean;
  isPortrait: boolean;
  
  // Layout
  breakpoint: string;
  shouldUseCardLayout: () => boolean;
  shouldUseHorizontalScroll: () => boolean;
  shouldStackVertically: () => boolean;
  getOptimalColumnCount: (maxColumns?: number) => number;
  getResponsiveSpacing: (baseSpacing?: number) => number;
  getCSSVariables: () => Record<string, string>;
  
  // Layout state
  showSidebar: boolean;
  showBottomNav: boolean;
  compactMode: boolean;
  isLandscapeOptimized: boolean;
  isPortraitOptimized: boolean;
  shouldShowCompactHeader: boolean;
  shouldUseBottomSheet: boolean;
}

const ResponsiveContext = createContext<ResponsiveContextType | undefined>(undefined);

export const useResponsive = () => {
  const context = useContext(ResponsiveContext);
  if (context === undefined) {
    throw new Error('useResponsive must be used within a ResponsiveProvider');
  }
  return context;
};

interface ResponsiveProviderProps {
  children: ReactNode;
}

export const ResponsiveProvider: React.FC<ResponsiveProviderProps> = ({ children }) => {
  const deviceDetection = useDeviceDetection();
  const responsiveLayout = useResponsiveLayout();

  // Apply CSS variables to document root
  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof document === 'undefined' || !document.body) {
      return;
    }

    const cssVariables = responsiveLayout.getCSSVariables();
    const root = document.documentElement;
    
    Object.entries(cssVariables).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    // Add orientation class to body for CSS targeting
    document.body.classList.remove('orientation-portrait', 'orientation-landscape');
    document.body.classList.add(`orientation-${deviceDetection.orientation.orientation}`);

    // Add device type classes
    document.body.classList.remove('device-mobile', 'device-tablet', 'device-desktop');
    if (deviceDetection.isMobile) {
      document.body.classList.add('device-mobile');
    } else if (deviceDetection.isTablet) {
      document.body.classList.add('device-tablet');
    } else {
      document.body.classList.add('device-desktop');
    }

    // Add touch capability class
    document.body.classList.toggle('has-touch', deviceDetection.hasTouch);
    document.body.classList.toggle('no-touch', !deviceDetection.hasTouch);

    // Add online/offline status
    document.body.classList.toggle('online', deviceDetection.isOnline);
    document.body.classList.toggle('offline', !deviceDetection.isOnline);

  }, [responsiveLayout, deviceDetection]);

  // Handle orientation change animations
  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof document === 'undefined' || !document.body) {
      return;
    }

    if (deviceDetection.orientation.isChanging) {
      document.body.classList.add('orientation-changing');
      
      const timer = setTimeout(() => {
        if (document.body) {
          document.body.classList.remove('orientation-changing');
        }
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [deviceDetection.orientation.isChanging]);

  const contextValue: ResponsiveContextType = {
    // Device detection
    isMobile: deviceDetection.isMobile,
    isTablet: deviceDetection.isTablet,
    isDesktop: deviceDetection.isDesktop,
    hasTouch: deviceDetection.hasTouch,
    isOnline: deviceDetection.isOnline,
    
    // Orientation
    orientation: deviceDetection.orientation.orientation,
    isChangingOrientation: deviceDetection.orientation.isChanging,
    isLandscape: deviceDetection.isLandscape,
    isPortrait: deviceDetection.isPortrait,
    
    // Layout
    breakpoint: responsiveLayout.breakpoint,
    shouldUseCardLayout: responsiveLayout.shouldUseCardLayout,
    shouldUseHorizontalScroll: responsiveLayout.shouldUseHorizontalScroll,
    shouldStackVertically: responsiveLayout.shouldStackVertically,
    getOptimalColumnCount: responsiveLayout.getOptimalColumnCount,
    getResponsiveSpacing: responsiveLayout.getResponsiveSpacing,
    getCSSVariables: responsiveLayout.getCSSVariables,
    
    // Layout state
    showSidebar: responsiveLayout.showSidebar,
    showBottomNav: responsiveLayout.showBottomNav,
    compactMode: responsiveLayout.compactMode,
    isLandscapeOptimized: responsiveLayout.isLandscapeOptimized,
    isPortraitOptimized: responsiveLayout.isPortraitOptimized,
    shouldShowCompactHeader: responsiveLayout.shouldShowCompactHeader,
    shouldUseBottomSheet: responsiveLayout.shouldUseBottomSheet
  };

  return (
    <ResponsiveContext.Provider value={contextValue}>
      {children}
    </ResponsiveContext.Provider>
  );
};