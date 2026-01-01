import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  prefersReducedMotion, 
  prefersHighContrast, 
  isScreenReaderActive,
  zoomUtils,
  AccessibilityConfig
} from '../utils/accessibility';

interface AccessibilityContextType {
  config: AccessibilityConfig;
  updateConfig: (updates: Partial<AccessibilityConfig>) => void;
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
  isHighZoom: boolean;
  isMobile: boolean;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

interface AccessibilityProviderProps {
  children: ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<AccessibilityConfig>({
    minTouchTarget: 44,
    focusRingWidth: 2,
    highContrastMode: prefersHighContrast(),
    reducedMotion: prefersReducedMotion(),
    screenReaderMode: isScreenReaderActive(),
  });

  const [isHighZoom, setIsHighZoom] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 767);
    };

    // Check zoom level
    const checkZoom = () => {
      const zoom = zoomUtils.getZoomLevel();
      setIsHighZoom(zoom > 1.5);
    };

    // Initial checks
    checkMobile();
    checkZoom();

    // Set up event listeners
    const handleResize = () => {
      checkMobile();
      checkZoom();
    };

    const handleMediaChange = () => {
      setConfig(prev => ({
        ...prev,
        highContrastMode: prefersHighContrast(),
        reducedMotion: prefersReducedMotion(),
      }));
    };

    window.addEventListener('resize', handleResize);
    
    // Listen for media query changes
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    contrastQuery.addEventListener('change', handleMediaChange);
    motionQuery.addEventListener('change', handleMediaChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      contrastQuery.removeEventListener('change', handleMediaChange);
      motionQuery.removeEventListener('change', handleMediaChange);
    };
  }, []);

  const updateConfig = (updates: Partial<AccessibilityConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.textContent = message;
    
    document.body.appendChild(announcer);
    
    setTimeout(() => {
      if (document.body.contains(announcer)) {
        document.body.removeChild(announcer);
      }
    }, 1000);
  };

  const value: AccessibilityContextType = {
    config,
    updateConfig,
    announceToScreenReader,
    isHighZoom,
    isMobile,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};