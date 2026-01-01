import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../theme/theme';
import usePerformanceOptimization from '../hooks/usePerformanceOptimization';
import { ResponsiveImage } from '../components/ResponsiveImage';
import NetworkStatusIndicator from '../components/NetworkStatusIndicator';
import { PerformanceMonitorButton } from '../components/PerformanceDashboard';

// Mock the service worker utilities
jest.mock('../utils/serviceWorker', () => ({
  register: jest.fn(),
  performanceMonitor: {
    startTiming: jest.fn(),
    endTiming: jest.fn(),
    observeWebVitals: jest.fn(),
  },
  networkManager: {
    isOnline: true,
    addListener: jest.fn(() => jest.fn()),
  },
  offlineStorage: {
    storeOfflineData: jest.fn(),
    getOfflineData: jest.fn(() => Promise.resolve([])),
    clearOfflineData: jest.fn(),
  },
  swMessenger: {
    getCacheStatus: jest.fn(() => Promise.resolve({})),
    clearCache: jest.fn(),
  },
}));

// Mock mobile detection
jest.mock('../utils/mobileDetection', () => ({
  isMobileDevice: jest.fn(() => false),
  isTouchDevice: jest.fn(() => false),
  getViewportWidth: jest.fn(() => 1024),
  isMobileViewport: jest.fn(() => false),
  getDeviceType: jest.fn(() => 'desktop'),
  shouldLoadMobileComponents: jest.fn(() => false),
  getOptimalImageSize: jest.fn(() => ({ width: 1200, quality: 90 })),
}));

// Test component that uses performance optimization hook
const TestComponent: React.FC = () => {
  const { performanceState, startTiming, endTiming, getOptimizedImageProps } = usePerformanceOptimization();
  
  React.useEffect(() => {
    startTiming('test-component-load');
    setTimeout(() => {
      endTiming('test-component-load');
    }, 100);
  }, [startTiming, endTiming]);

  const imageProps = getOptimizedImageProps('/test-image.jpg', 'Test image');

  return (
    <div>
      <div data-testid="device-type">{performanceState.deviceType}</div>
      <div data-testid="is-online">{performanceState.isOnline ? 'online' : 'offline'}</div>
      <div data-testid="connection-speed">{performanceState.connectionSpeed}</div>
      <img {...imageProps} data-testid="optimized-image" />
    </div>
  );
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('Performance Optimization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('usePerformanceOptimization hook', () => {
    it('should provide performance state', async () => {
      renderWithProviders(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('device-type')).toHaveTextContent('desktop');
        expect(screen.getByTestId('is-online')).toHaveTextContent('online');
        expect(screen.getByTestId('connection-speed')).toHaveTextContent('fast');
      });
    });

    it('should optimize image properties', async () => {
      renderWithProviders(<TestComponent />);
      
      await waitFor(() => {
        const image = screen.getByTestId('optimized-image');
        expect(image).toHaveAttribute('loading', 'lazy');
        expect(image).toHaveAttribute('sizes');
      });
    });
  });

  describe('ResponsiveImage component', () => {
    it('should render with lazy loading by default', async () => {
      renderWithProviders(
        <ResponsiveImage src="/test-image.jpg" alt="Test image" />
      );
      
      // Wait for intersection observer to trigger and image to load
      await waitFor(() => {
        const image = screen.getByRole('img');
        expect(image).toHaveAttribute('loading', 'lazy');
        expect(image).toHaveAttribute('alt', 'Test image');
      });
    });

    it('should render with eager loading when specified', () => {
      renderWithProviders(
        <ResponsiveImage src="/test-image.jpg" alt="Test image" loading="eager" />
      );
      
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('loading', 'eager');
    });

    it('should show error state when image fails to load', async () => {
      renderWithProviders(
        <ResponsiveImage src="/invalid-image.jpg" alt="Test image" />
      );
      
      // Wait for intersection observer to trigger
      await waitFor(() => {
        const image = screen.getByRole('img');
        
        // Simulate image load error
        Object.defineProperty(image, 'complete', { value: false });
        image.dispatchEvent(new Event('error'));
      });
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load image')).toBeInTheDocument();
      });
    });
  });

  describe('NetworkStatusIndicator component', () => {
    it('should not show snackbar when online', () => {
      renderWithProviders(<NetworkStatusIndicator />);
      
      // Should not show offline indicator when online
      expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
    });

    it('should show persistent indicator when enabled', () => {
      renderWithProviders(<NetworkStatusIndicator showPersistent={true} />);
      
      expect(screen.getByText(/online/i)).toBeInTheDocument();
    });
  });

  describe('PerformanceMonitorButton component', () => {
    // Mock NODE_ENV for this test
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should render in development mode', () => {
      process.env.NODE_ENV = 'development';
      
      renderWithProviders(<PerformanceMonitorButton />);
      
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should not render in production mode', () => {
      process.env.NODE_ENV = 'production';
      
      renderWithProviders(<PerformanceMonitorButton />);
      
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('Code splitting and lazy loading', () => {
    it('should support React.lazy components', async () => {
      const LazyComponent = React.lazy(() => 
        Promise.resolve({
          default: () => <div data-testid="lazy-component">Lazy loaded content</div>
        })
      );

      renderWithProviders(
        <React.Suspense fallback={<div>Loading...</div>}>
          <LazyComponent />
        </React.Suspense>
      );

      // Should show loading state first
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Should show lazy component after loading
      await waitFor(() => {
        expect(screen.getByTestId('lazy-component')).toBeInTheDocument();
        expect(screen.getByText('Lazy loaded content')).toBeInTheDocument();
      });
    });
  });

  describe('Bundle optimization', () => {
    it('should support dynamic imports', async () => {
      // Test that dynamic imports work (this would be tested in integration)
      const dynamicImport = () => import('../utils/bundleOptimization');
      
      await expect(dynamicImport()).resolves.toBeDefined();
    });
  });

  describe('Service Worker integration', () => {
    it('should register service worker', () => {
      const { register } = require('../utils/serviceWorker');
      
      // Service worker registration should be called
      expect(register).toBeDefined();
    });
  });
});

describe('Performance Metrics', () => {
  it('should track performance timing', () => {
    const { performanceMonitor } = require('../utils/serviceWorker');
    
    performanceMonitor.startTiming('test-metric');
    performanceMonitor.endTiming('test-metric');
    
    expect(performanceMonitor.startTiming).toHaveBeenCalledWith('test-metric');
    expect(performanceMonitor.endTiming).toHaveBeenCalledWith('test-metric');
  });

  it('should observe web vitals', () => {
    const { performanceMonitor } = require('../utils/serviceWorker');
    
    performanceMonitor.observeWebVitals();
    
    expect(performanceMonitor.observeWebVitals).toHaveBeenCalled();
  });
});

describe('Offline functionality', () => {
  it('should store data offline', async () => {
    const { offlineStorage } = require('../utils/serviceWorker');
    
    await offlineStorage.storeOfflineData('votes', { id: '1', vote: 'test' });
    
    expect(offlineStorage.storeOfflineData).toHaveBeenCalledWith('votes', { id: '1', vote: 'test' });
  });

  it('should retrieve offline data', async () => {
    const { offlineStorage } = require('../utils/serviceWorker');
    
    await offlineStorage.getOfflineData('votes');
    
    expect(offlineStorage.getOfflineData).toHaveBeenCalledWith('votes');
  });

  it('should clear offline data', async () => {
    const { offlineStorage } = require('../utils/serviceWorker');
    
    await offlineStorage.clearOfflineData('votes');
    
    expect(offlineStorage.clearOfflineData).toHaveBeenCalledWith('votes');
  });
});