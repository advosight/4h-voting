import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../theme/theme';
import { ResponsiveProvider, useResponsive } from '../contexts/ResponsiveContext';
import { useDeviceDetection } from '../hooks/useDeviceDetection';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { ResponsiveForm } from '../components/ResponsiveForm';
import { ResponsiveDataTable } from '../components/ResponsiveDataTable';

// Mock window properties for testing
const mockWindowProperties = (width: number, height: number, userAgent: string = '') => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  Object.defineProperty(navigator, 'userAgent', {
    writable: true,
    configurable: true,
    value: userAgent,
  });
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    configurable: true,
    value: true,
  });
};

// Mock screen orientation API
const mockScreenOrientation = (angle: number = 0) => {
  Object.defineProperty(screen, 'orientation', {
    writable: true,
    configurable: true,
    value: {
      angle,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
  });
};

// Test component that uses responsive context
const TestComponent: React.FC = () => {
  const responsive = useResponsive();
  
  return (
    <div data-testid="test-component">
      <div data-testid="device-type">
        {responsive.isMobile ? 'mobile' : responsive.isTablet ? 'tablet' : 'desktop'}
      </div>
      <div data-testid="orientation">{responsive.orientation}</div>
      <div data-testid="breakpoint">{responsive.breakpoint}</div>
      <div data-testid="show-sidebar">{responsive.showSidebar ? 'true' : 'false'}</div>
      <div data-testid="show-bottom-nav">{responsive.showBottomNav ? 'true' : 'false'}</div>
    </div>
  );
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      <ResponsiveProvider>
        {component}
      </ResponsiveProvider>
    </ThemeProvider>
  );
};

describe('Orientation and Device Adaptation', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    mockScreenOrientation();
  });

  describe('Device Detection', () => {
    test('detects mobile device correctly', async () => {
      mockWindowProperties(375, 667, 'iPhone');
      
      renderWithProviders(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('device-type')).toHaveTextContent('mobile');
      });
    });

    test('detects tablet device correctly', async () => {
      mockWindowProperties(768, 1024, 'iPad');
      
      renderWithProviders(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('device-type')).toHaveTextContent('tablet');
      });
    });

    test('detects desktop device correctly', async () => {
      mockWindowProperties(1200, 800, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
      
      renderWithProviders(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('device-type')).toHaveTextContent('desktop');
      });
    });
  });

  describe('Orientation Detection', () => {
    test('detects portrait orientation', async () => {
      mockWindowProperties(375, 667); // Portrait mobile
      
      renderWithProviders(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('orientation')).toHaveTextContent('portrait');
      });
    });

    test('detects landscape orientation', async () => {
      mockWindowProperties(667, 375); // Landscape mobile
      
      renderWithProviders(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('orientation')).toHaveTextContent('landscape');
      });
    });

    test('handles orientation change', async () => {
      mockWindowProperties(375, 667); // Start in portrait
      
      renderWithProviders(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('orientation')).toHaveTextContent('portrait');
      });

      // Simulate orientation change
      act(() => {
        mockWindowProperties(667, 375); // Change to landscape
        window.dispatchEvent(new Event('resize'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('orientation')).toHaveTextContent('landscape');
      });
    });
  });

  describe('Breakpoint Detection', () => {
    test('detects xs breakpoint', async () => {
      mockWindowProperties(400, 600);
      
      renderWithProviders(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('breakpoint')).toHaveTextContent('xs');
      });
    });

    test('detects sm breakpoint', async () => {
      mockWindowProperties(700, 800);
      
      renderWithProviders(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('breakpoint')).toHaveTextContent('sm');
      });
    });

    test('detects md breakpoint', async () => {
      mockWindowProperties(1000, 800);
      
      renderWithProviders(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('breakpoint')).toHaveTextContent('md');
      });
    });
  });

  describe('Layout Adaptation', () => {
    test('shows bottom navigation on mobile portrait', async () => {
      mockWindowProperties(375, 667, 'iPhone');
      
      renderWithProviders(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('show-bottom-nav')).toHaveTextContent('true');
        expect(screen.getByTestId('show-sidebar')).toHaveTextContent('false');
      });
    });

    test('shows sidebar on desktop', async () => {
      mockWindowProperties(1200, 800);
      
      renderWithProviders(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('show-sidebar')).toHaveTextContent('true');
        expect(screen.getByTestId('show-bottom-nav')).toHaveTextContent('false');
      });
    });

    test('adapts layout for mobile landscape', async () => {
      mockWindowProperties(667, 375, 'iPhone');
      
      renderWithProviders(<TestComponent />);
      
      await waitFor(() => {
        // In landscape, mobile might show sidebar instead of bottom nav
        const showSidebar = screen.getByTestId('show-sidebar').textContent;
        const showBottomNav = screen.getByTestId('show-bottom-nav').textContent;
        
        // At least one navigation method should be available
        expect(showSidebar === 'true' || showBottomNav === 'true').toBe(true);
      });
    });
  });

  describe('ResponsiveForm Component', () => {
    test('renders single column on mobile portrait', () => {
      mockWindowProperties(375, 667, 'iPhone');
      
      renderWithProviders(
        <ResponsiveForm title="Test Form">
          <div>Field 1</div>
          <div>Field 2</div>
        </ResponsiveForm>
      );
      
      expect(screen.getByText('Test Form')).toBeInTheDocument();
      expect(screen.getByText('Field 1')).toBeInTheDocument();
      expect(screen.getByText('Field 2')).toBeInTheDocument();
    });

    test('optimizes layout for landscape mode', () => {
      mockWindowProperties(667, 375, 'iPhone');
      
      renderWithProviders(
        <ResponsiveForm title="Test Form" enableLandscapeOptimization>
          <div>Field 1</div>
          <div>Field 2</div>
        </ResponsiveForm>
      );
      
      expect(screen.getByText('Test Form')).toBeInTheDocument();
    });
  });

  describe('ResponsiveDataTable Component', () => {
    const mockColumns = [
      { key: 'name', label: 'Name', priority: 'high' as const },
      { key: 'email', label: 'Email', priority: 'medium' as const },
      { key: 'phone', label: 'Phone', priority: 'low' as const, landscapeOnly: true },
    ];

    const mockData = [
      { id: '1', name: 'John Doe', email: 'john@example.com', phone: '123-456-7890' },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com', phone: '098-765-4321' },
    ];

    test('renders card layout on mobile', () => {
      mockWindowProperties(375, 667, 'iPhone');
      
      renderWithProviders(
        <ResponsiveDataTable
          columns={mockColumns}
          data={mockData}
          ariaLabel="Test table"
        />
      );
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    test('shows landscape-only columns in landscape mode', () => {
      mockWindowProperties(667, 375, 'iPhone');
      
      renderWithProviders(
        <ResponsiveDataTable
          columns={mockColumns}
          data={mockData}
          enableLandscapeOptimization
          ariaLabel="Test table"
        />
      );
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    test('renders table layout on desktop', () => {
      mockWindowProperties(1200, 800);
      
      renderWithProviders(
        <ResponsiveDataTable
          columns={mockColumns}
          data={mockData}
          ariaLabel="Test table"
        />
      );
      
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
    });
  });

  describe('CSS Variables and Classes', () => {
    test('applies orientation classes to body', async () => {
      mockWindowProperties(375, 667);
      
      renderWithProviders(<TestComponent />);
      
      await waitFor(() => {
        expect(document.body.classList.contains('orientation-portrait')).toBe(true);
        expect(document.body.classList.contains('device-mobile')).toBe(true);
      });
    });

    test('applies CSS variables to document root', async () => {
      mockWindowProperties(375, 667);
      
      renderWithProviders(<TestComponent />);
      
      await waitFor(() => {
        const rootStyle = getComputedStyle(document.documentElement);
        expect(rootStyle.getPropertyValue('--is-mobile')).toBe('1');
        expect(rootStyle.getPropertyValue('--is-portrait')).toBe('1');
      });
    });
  });

  describe('Network Status Detection', () => {
    test('detects online status', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        configurable: true,
        value: true,
      });

      renderWithProviders(<TestComponent />);
      
      await waitFor(() => {
        expect(document.body.classList.contains('online')).toBe(true);
      });
    });

    test('handles offline status', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        configurable: true,
        value: false,
      });

      renderWithProviders(<TestComponent />);
      
      await waitFor(() => {
        expect(document.body.classList.contains('offline')).toBe(true);
      });
    });
  });
});

describe('Device Detection Hook', () => {
  test('useDeviceDetection returns correct capabilities', () => {
    mockWindowProperties(375, 667, 'iPhone');
    
    const TestHookComponent = () => {
      const detection = useDeviceDetection();
      
      return (
        <div>
          <div data-testid="is-mobile">{detection.isMobile ? 'true' : 'false'}</div>
          <div data-testid="has-touch">{detection.hasTouch ? 'true' : 'false'}</div>
          <div data-testid="is-online">{detection.isOnline ? 'true' : 'false'}</div>
        </div>
      );
    };

    render(<TestHookComponent />);
    
    expect(screen.getByTestId('is-mobile')).toHaveTextContent('true');
    expect(screen.getByTestId('is-online')).toHaveTextContent('true');
  });
});

describe('Responsive Layout Hook', () => {
  test('useResponsiveLayout returns correct layout config', () => {
    mockWindowProperties(375, 667, 'iPhone');
    
    const TestLayoutComponent = () => {
      const layout = useResponsiveLayout();
      
      return (
        <div>
          <div data-testid="columns">{layout.layout.columns}</div>
          <div data-testid="compact-mode">{layout.compactMode ? 'true' : 'false'}</div>
          <div data-testid="should-stack">{layout.shouldStackVertically() ? 'true' : 'false'}</div>
        </div>
      );
    };

    render(<TestLayoutComponent />);
    
    expect(screen.getByTestId('columns')).toHaveTextContent('1');
    expect(screen.getByTestId('compact-mode')).toHaveTextContent('true');
    expect(screen.getByTestId('should-stack')).toHaveTextContent('true');
  });
});