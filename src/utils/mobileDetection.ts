/**
 * Mobile detection utilities for performance optimization
 */

export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

export const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

export const getViewportWidth = (): number => {
  if (typeof window === 'undefined') return 0;
  
  return window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
};

export const isMobileViewport = (): boolean => {
  return getViewportWidth() <= 768;
};

export const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  const width = getViewportWidth();
  
  if (width <= 600) return 'mobile';
  if (width <= 900) return 'tablet';
  return 'desktop';
};

export const shouldLoadMobileComponents = (): boolean => {
  return isMobileDevice() || isMobileViewport() || isTouchDevice();
};

export const getOptimalImageSize = (): { width: number; quality: number } => {
  const deviceType = getDeviceType();
  
  switch (deviceType) {
    case 'mobile':
      return { width: 400, quality: 75 };
    case 'tablet':
      return { width: 800, quality: 85 };
    default:
      return { width: 1200, quality: 90 };
  }
};