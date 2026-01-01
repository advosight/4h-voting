/**
 * Bundle optimization utilities for mobile-first delivery
 */

// Selective Material-UI imports to reduce bundle size
export const loadMUIComponents = async (components: string[]) => {
  const imports = await Promise.all(
    components.map(async (component) => {
      try {
        switch (component) {
          case 'Button':
            return (await import('@mui/material/Button')).default;
          case 'TextField':
            return (await import('@mui/material/TextField')).default;
          case 'Card':
            return (await import('@mui/material/Card')).default;
          case 'CardContent':
            return (await import('@mui/material/CardContent')).default;
          case 'Typography':
            return (await import('@mui/material/Typography')).default;
          case 'Box':
            return (await import('@mui/material/Box')).default;
          case 'Grid':
            return (await import('@mui/material/Grid')).default;
          case 'Paper':
            return (await import('@mui/material/Paper')).default;
          case 'AppBar':
            return (await import('@mui/material/AppBar')).default;
          case 'Toolbar':
            return (await import('@mui/material/Toolbar')).default;
          case 'Drawer':
            return (await import('@mui/material/Drawer')).default;
          case 'List':
            return (await import('@mui/material/List')).default;
          case 'ListItem':
            return (await import('@mui/material/ListItem')).default;
          case 'ListItemText':
            return (await import('@mui/material/ListItemText')).default;
          case 'IconButton':
            return (await import('@mui/material/IconButton')).default;
          case 'Menu':
            return (await import('@mui/material/Menu')).default;
          case 'MenuItem':
            return (await import('@mui/material/MenuItem')).default;
          case 'Dialog':
            return (await import('@mui/material/Dialog')).default;
          case 'DialogTitle':
            return (await import('@mui/material/DialogTitle')).default;
          case 'DialogContent':
            return (await import('@mui/material/DialogContent')).default;
          case 'DialogActions':
            return (await import('@mui/material/DialogActions')).default;
          case 'Snackbar':
            return (await import('@mui/material/Snackbar')).default;
          case 'Alert':
            return (await import('@mui/material/Alert')).default;
          case 'CircularProgress':
            return (await import('@mui/material/CircularProgress')).default;
          case 'LinearProgress':
            return (await import('@mui/material/LinearProgress')).default;
          case 'Skeleton':
            return (await import('@mui/material/Skeleton')).default;
          case 'Chip':
            return (await import('@mui/material/Chip')).default;
          case 'Badge':
            return (await import('@mui/material/Badge')).default;
          case 'Avatar':
            return (await import('@mui/material/Avatar')).default;
          case 'Tabs':
            return (await import('@mui/material/Tabs')).default;
          case 'Tab':
            return (await import('@mui/material/Tab')).default;
          case 'BottomNavigation':
            return (await import('@mui/material/BottomNavigation')).default;
          case 'BottomNavigationAction':
            return (await import('@mui/material/BottomNavigationAction')).default;
          default:
            console.warn(`Unknown MUI component: ${component}`);
            return null;
        }
      } catch (error) {
        console.error(`Failed to load MUI component: ${component}`, error);
        return null;
      }
    })
  );
  
  return imports.filter(Boolean);
};

// Selective icon imports
export const loadMUIIcons = async (icons: string[]) => {
  const imports = await Promise.all(
    icons.map(async (icon) => {
      try {
        switch (icon) {
          case 'Menu':
            return (await import('@mui/icons-material/Menu')).default;
          case 'Home':
            return (await import('@mui/icons-material/Home')).default;
          case 'Person':
            return (await import('@mui/icons-material/Person')).default;
          case 'Settings':
            return (await import('@mui/icons-material/Settings')).default;
          case 'Close':
            return (await import('@mui/icons-material/Close')).default;
          case 'ArrowBack':
            return (await import('@mui/icons-material/ArrowBack')).default;
          case 'Search':
            return (await import('@mui/icons-material/Search')).default;
          case 'Add':
            return (await import('@mui/icons-material/Add')).default;
          case 'Edit':
            return (await import('@mui/icons-material/Edit')).default;
          case 'Delete':
            return (await import('@mui/icons-material/Delete')).default;
          case 'Save':
            return (await import('@mui/icons-material/Save')).default;
          case 'Cancel':
            return (await import('@mui/icons-material/Cancel')).default;
          case 'Check':
            return (await import('@mui/icons-material/Check')).default;
          case 'Warning':
            return (await import('@mui/icons-material/Warning')).default;
          case 'Error':
            return (await import('@mui/icons-material/Error')).default;
          case 'Info':
            return (await import('@mui/icons-material/Info')).default;
          case 'Success':
            return (await import('@mui/icons-material/CheckCircle')).default;
          case 'Refresh':
            return (await import('@mui/icons-material/Refresh')).default;
          case 'Download':
            return (await import('@mui/icons-material/Download')).default;
          case 'Upload':
            return (await import('@mui/icons-material/Upload')).default;
          case 'Share':
            return (await import('@mui/icons-material/Share')).default;
          case 'Print':
            return (await import('@mui/icons-material/Print')).default;
          case 'Visibility':
            return (await import('@mui/icons-material/Visibility')).default;
          case 'VisibilityOff':
            return (await import('@mui/icons-material/VisibilityOff')).default;
          default:
            console.warn(`Unknown MUI icon: ${icon}`);
            return null;
        }
      } catch (error) {
        console.error(`Failed to load MUI icon: ${icon}`, error);
        return null;
      }
    })
  );
  
  return imports.filter(Boolean);
};

// Feature-based code splitting
export const loadFeatureBundle = async (feature: string) => {
  try {
    switch (feature) {
      case 'scoring':
        return await import('../pages/ScorePage');
      case 'voting':
        return await import('../pages/VotePage');
      case 'reports':
        return await import('../pages/ReportsPage');
      case 'dashboard':
        return await import('../pages/DashboardPage');
      case 'tvMode':
        return await import('../pages/TVModePage');
      case 'classScoring':
        return await import('../pages/ClassScorePage');
      case 'fitShowScoring':
        return await import('../pages/FitShowScoringPage');
      case 'userManagement':
        return await import('../pages/UserManagementPage');
      default:
        console.warn(`Unknown feature bundle: ${feature}`);
        return null;
    }
  } catch (error) {
    console.error(`Failed to load feature bundle: ${feature}`, error);
    return null;
  }
};

// Preload critical resources for mobile
export const preloadCriticalResources = () => {
  if (typeof window === 'undefined') return;
  
  const criticalResources = [
    '/static/css/main.css',
    '/static/js/main.js'
  ];
  
  criticalResources.forEach(resource => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = resource;
    link.as = resource.endsWith('.css') ? 'style' : 'script';
    document.head.appendChild(link);
  });
};

// Resource hints for mobile optimization
export const addResourceHints = () => {
  if (typeof window === 'undefined') return;
  
  // DNS prefetch for external resources
  const dnsPrefetchDomains = [
    'fonts.googleapis.com',
    'fonts.gstatic.com'
  ];
  
  dnsPrefetchDomains.forEach(domain => {
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = `//${domain}`;
    document.head.appendChild(link);
  });
  
  // Preconnect to critical origins
  const preconnectDomains = [
    'https://fonts.googleapis.com'
  ];
  
  preconnectDomains.forEach(domain => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = domain;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
};