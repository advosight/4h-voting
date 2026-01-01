import { useState, useEffect } from 'react';

export interface DeviceCapabilities {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  hasTouch: boolean;
  supportsOrientation: boolean;
  supportsVibration: boolean;
  isOnline: boolean;
  connectionType: string;
}

export interface OrientationState {
  orientation: 'portrait' | 'landscape';
  angle: number;
  isChanging: boolean;
}

export interface ResponsiveBreakpoint {
  breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  width: number;
  height: number;
}

export const useDeviceDetection = () => {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    hasTouch: false,
    supportsOrientation: false,
    supportsVibration: false,
    isOnline: navigator.onLine,
    connectionType: 'unknown'
  });

  const [orientation, setOrientation] = useState<OrientationState>({
    orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
    angle: 0,
    isChanging: false
  });

  const [breakpoint, setBreakpoint] = useState<ResponsiveBreakpoint>({
    breakpoint: 'lg',
    width: window.innerWidth,
    height: window.innerHeight
  });

  // Detect device capabilities
  useEffect(() => {
    const detectCapabilities = () => {
      const width = window.innerWidth;
      const userAgent = navigator.userAgent;
      
      // Device type detection
      const isTabletUserAgent = /iPad|Android.*Mobile/i.test(userAgent) && !/iPhone|iPod/i.test(userAgent);
      const isMobileUserAgent = /Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) && !/iPad/i.test(userAgent);
      
      const isMobile = (width < 768 && !isTabletUserAgent) || isMobileUserAgent;
      const isTablet = (width >= 768 && width < 1024) || isTabletUserAgent;
      const isDesktop = width >= 1024 && !isMobileUserAgent && !isTabletUserAgent;

      // Touch detection
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      // Orientation support
      const supportsOrientation = 'orientation' in screen || 'orientation' in window;

      // Vibration support
      const supportsVibration = 'vibrate' in navigator;

      // Connection type
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      const connectionType = connection ? connection.effectiveType || connection.type || 'unknown' : 'unknown';

      setCapabilities({
        isMobile,
        isTablet,
        isDesktop,
        hasTouch,
        supportsOrientation,
        supportsVibration,
        isOnline: navigator.onLine,
        connectionType
      });
    };

    detectCapabilities();
    window.addEventListener('resize', detectCapabilities);
    
    return () => window.removeEventListener('resize', detectCapabilities);
  }, []);

  // Handle orientation changes
  useEffect(() => {
    const handleOrientationChange = () => {
      setOrientation(prev => ({ ...prev, isChanging: true }));

      // Use a timeout to smooth the transition
      setTimeout(() => {
        const newOrientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
        const angle = screen.orientation?.angle || 0;

        setOrientation({
          orientation: newOrientation,
          angle,
          isChanging: false
        });
      }, 100);
    };

    // Listen for orientation change events
    if (screen.orientation) {
      screen.orientation.addEventListener('change', handleOrientationChange);
    } else {
      // Fallback for older browsers
      window.addEventListener('orientationchange', handleOrientationChange);
    }

    // Also listen for resize as a fallback
    window.addEventListener('resize', handleOrientationChange);

    return () => {
      if (screen.orientation) {
        screen.orientation.removeEventListener('change', handleOrientationChange);
      } else {
        window.removeEventListener('orientationchange', handleOrientationChange);
      }
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);

  // Handle breakpoint detection
  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      let breakpointName: ResponsiveBreakpoint['breakpoint'] = 'xs';
      
      if (width >= 1536) {
        breakpointName = 'xl';
      } else if (width >= 1200) {
        breakpointName = 'lg';
      } else if (width >= 900) {
        breakpointName = 'md';
      } else if (width >= 600) {
        breakpointName = 'sm';
      }

      setBreakpoint({
        breakpoint: breakpointName,
        width,
        height
      });
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  // Handle network status
  useEffect(() => {
    const handleOnline = () => {
      setCapabilities(prev => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setCapabilities(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    capabilities,
    orientation,
    breakpoint,
    // Utility functions
    isLandscape: orientation.orientation === 'landscape',
    isPortrait: orientation.orientation === 'portrait',
    isMobile: capabilities.isMobile,
    isTablet: capabilities.isTablet,
    isDesktop: capabilities.isDesktop,
    hasTouch: capabilities.hasTouch,
    isOnline: capabilities.isOnline
  };
};