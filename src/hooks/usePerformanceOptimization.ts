import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  networkManager, 
  offlineStorage, 
  performanceMonitor,
  PerformanceMonitor 
} from '../utils/serviceWorker';
import { shouldLoadMobileComponents, getDeviceType } from '../utils/mobileDetection';

interface PerformanceState {
  isOnline: boolean;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  shouldOptimizeForMobile: boolean;
  connectionSpeed: 'slow' | 'fast' | 'unknown';
  memoryUsage?: number;
}

interface PerformanceOptimizationOptions {
  enableOfflineStorage?: boolean;
  enablePerformanceMonitoring?: boolean;
  enableImageOptimization?: boolean;
  enableCodeSplitting?: boolean;
}

export const usePerformanceOptimization = (
  options: PerformanceOptimizationOptions = {}
) => {
  const {
    enableOfflineStorage = true,
    enablePerformanceMonitoring = true,
    enableImageOptimization = true,
    enableCodeSplitting = true
  } = options;

  const [performanceState, setPerformanceState] = useState<PerformanceState>({
    isOnline: networkManager.isOnline,
    deviceType: getDeviceType(),
    shouldOptimizeForMobile: shouldLoadMobileComponents(),
    connectionSpeed: 'unknown'
  });

  const performanceRef = useRef<PerformanceMonitor>(performanceMonitor);
  const offlineDataRef = useRef<any[]>([]);

  // Network status monitoring
  useEffect(() => {
    const unsubscribe = networkManager.addListener((isOnline) => {
      setPerformanceState(prev => ({ ...prev, isOnline }));
      
      if (isOnline && offlineDataRef.current.length > 0) {
        // Sync offline data when connection is restored
        syncOfflineData();
      }
    });

    return unsubscribe;
  }, []);

  // Connection speed detection
  useEffect(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const updateConnectionSpeed = () => {
        const effectiveType = connection.effectiveType;
        const speed = ['slow-2g', '2g', '3g'].includes(effectiveType) ? 'slow' : 'fast';
        setPerformanceState(prev => ({ ...prev, connectionSpeed: speed }));
      };

      updateConnectionSpeed();
      connection.addEventListener('change', updateConnectionSpeed);

      return () => {
        connection.removeEventListener('change', updateConnectionSpeed);
      };
    }
  }, []);

  // Memory usage monitoring
  useEffect(() => {
    if (enablePerformanceMonitoring && 'memory' in performance) {
      const updateMemoryUsage = () => {
        const memory = (performance as any).memory;
        setPerformanceState(prev => ({
          ...prev,
          memoryUsage: memory.usedJSHeapSize / memory.jsHeapSizeLimit
        }));
      };

      updateMemoryUsage();
      const interval = setInterval(updateMemoryUsage, 30000); // Check every 30 seconds

      return () => clearInterval(interval);
    }
  }, [enablePerformanceMonitoring]);

  // Device type monitoring (for orientation changes)
  useEffect(() => {
    const handleResize = () => {
      const newDeviceType = getDeviceType();
      const shouldOptimize = shouldLoadMobileComponents();
      
      setPerformanceState(prev => ({
        ...prev,
        deviceType: newDeviceType,
        shouldOptimizeForMobile: shouldOptimize
      }));
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Performance timing utilities
  const startTiming = useCallback((label: string) => {
    if (enablePerformanceMonitoring) {
      performanceRef.current.startTiming(label);
    }
  }, [enablePerformanceMonitoring]);

  const endTiming = useCallback((label: string) => {
    if (enablePerformanceMonitoring) {
      return performanceRef.current.endTiming(label);
    }
    return 0;
  }, [enablePerformanceMonitoring]);

  // Offline data management
  const storeOfflineData = useCallback(async (type: 'votes' | 'scores', data: any) => {
    if (enableOfflineStorage && !performanceState.isOnline) {
      try {
        await offlineStorage.storeOfflineData(type, data);
        offlineDataRef.current.push({ type, data });
        return true;
      } catch (error) {
        console.error('Failed to store offline data:', error);
        return false;
      }
    }
    return false;
  }, [enableOfflineStorage, performanceState.isOnline]);

  const syncOfflineData = useCallback(async () => {
    if (enableOfflineStorage && performanceState.isOnline) {
      try {
        const votes = await offlineStorage.getOfflineData('votes');
        const scores = await offlineStorage.getOfflineData('scores');
        
        // Sync votes
        for (const vote of votes) {
          try {
            await fetch('/api/votes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(vote)
            });
          } catch (error) {
            console.error('Failed to sync vote:', error);
          }
        }

        // Sync scores
        for (const score of scores) {
          try {
            await fetch('/api/scores', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(score)
            });
          } catch (error) {
            console.error('Failed to sync score:', error);
          }
        }

        // Clear offline data after successful sync
        await offlineStorage.clearOfflineData('votes');
        await offlineStorage.clearOfflineData('scores');
        offlineDataRef.current = [];

      } catch (error) {
        console.error('Failed to sync offline data:', error);
      }
    }
  }, [enableOfflineStorage, performanceState.isOnline]);

  // Image optimization utilities
  const getOptimizedImageProps = useCallback((src: string, alt: string) => {
    if (!enableImageOptimization) {
      return { src, alt };
    }

    const { deviceType, connectionSpeed } = performanceState;
    
    // Determine optimal image size based on device and connection
    let width = 800;
    let quality = 85;

    if (deviceType === 'mobile') {
      width = connectionSpeed === 'slow' ? 300 : 400;
      quality = connectionSpeed === 'slow' ? 60 : 75;
    } else if (deviceType === 'tablet') {
      width = connectionSpeed === 'slow' ? 600 : 800;
      quality = connectionSpeed === 'slow' ? 70 : 85;
    } else {
      width = connectionSpeed === 'slow' ? 800 : 1200;
      quality = connectionSpeed === 'slow' ? 80 : 90;
    }

    return {
      src,
      alt,
      loading: 'lazy' as const,
      sizes: '(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw',
      style: { maxWidth: '100%', height: 'auto' },
      // Add responsive image attributes if supported
      ...(src.includes('?') ? {} : {
        srcSet: `${src}?w=${width}&q=${quality} 1x, ${src}?w=${width * 2}&q=${quality} 2x`
      })
    };
  }, [enableImageOptimization, performanceState]);

  // Code splitting utilities
  const shouldLoadComponent = useCallback((componentType: 'mobile' | 'desktop' | 'universal') => {
    if (!enableCodeSplitting) return true;

    const { shouldOptimizeForMobile, connectionSpeed } = performanceState;

    switch (componentType) {
      case 'mobile':
        return shouldOptimizeForMobile;
      case 'desktop':
        return !shouldOptimizeForMobile && connectionSpeed !== 'slow';
      case 'universal':
        return true;
      default:
        return true;
    }
  }, [enableCodeSplitting, performanceState]);

  // Resource preloading
  const preloadResource = useCallback((href: string, as: string) => {
    if (performanceState.connectionSpeed === 'slow') {
      return; // Skip preloading on slow connections
    }

    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    document.head.appendChild(link);
  }, [performanceState.connectionSpeed]);

  // Memory cleanup
  const cleanupMemory = useCallback(() => {
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
  }, []);

  // Performance recommendations
  const getPerformanceRecommendations = useCallback(() => {
    const recommendations: string[] = [];
    const { connectionSpeed, memoryUsage, shouldOptimizeForMobile } = performanceState;

    if (connectionSpeed === 'slow') {
      recommendations.push('Reduce image quality and size for better loading times');
      recommendations.push('Enable offline mode for better user experience');
    }

    if (memoryUsage && memoryUsage > 0.8) {
      recommendations.push('High memory usage detected - consider reducing component complexity');
      recommendations.push('Clear unused data and optimize component rendering');
    }

    if (shouldOptimizeForMobile) {
      recommendations.push('Mobile device detected - using optimized mobile components');
      recommendations.push('Touch interactions and mobile-first layout enabled');
    }

    return recommendations;
  }, [performanceState]);

  return {
    performanceState,
    startTiming,
    endTiming,
    storeOfflineData,
    syncOfflineData,
    getOptimizedImageProps,
    shouldLoadComponent,
    preloadResource,
    cleanupMemory,
    getPerformanceRecommendations
  };
};

export default usePerformanceOptimization;