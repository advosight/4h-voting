import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useResponsive } from '../contexts/ResponsiveContext';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  useTheme,
  useMediaQuery,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Collapse,
  Badge,
  Tooltip,
  SwipeableDrawer,
} from '@mui/material';
import {
  Pets as PetsIcon,
  ExitToApp as ExitToAppIcon,
  Dashboard as DashboardIcon,
  Assessment as AssessmentIcon,
  FindInPage as AuditIcon,
  Leaderboard as LeaderboardIcon,
  People as PeopleIcon,
  Menu as MenuIcon,
  EmojiEvents as FitShowIcon,
  School as ClassIcon,
  Home as CageIcon,
  ExpandLess,
  ExpandMore,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useUserRole } from '../utils/roleUtils';
import ScoreNotifications from './ScoreNotifications';
import NetworkStatusIndicator from './NetworkStatusIndicator';
import { PerformanceMonitorButton } from './PerformanceDashboard';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useAccessibleNavigation } from '../hooks/useAccessibleNavigation';
import UserDebugInfo from './UserDebugInfo';

interface AppLayoutProps {
  signOut?: ((data?: any) => void) | (() => void);
}

// iOS detection for SwipeableDrawer optimization
const iOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

function AppLayout({ signOut }: AppLayoutProps): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const legacyIsMobile = useMediaQuery(theme.breakpoints.down('md'));
  const legacyIsTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  const { config, announceToScreenReader } = useAccessibility();
  const { containerRef } = useAccessibleNavigation({
    arrowKeyNavigation: true,
  });
  
  // Enhanced responsive context
  const {
    isMobile,
    isTablet,
    orientation,
    isChangingOrientation,
    showSidebar,
    showBottomNav,
    shouldShowCompactHeader,
    getResponsiveSpacing,
    getCSSVariables
  } = useResponsive();
  
  const { userInfo } = useUserRole();
  const hasAdminRole = userInfo?.role === 'admin';
  const hasJudgeRole = hasAdminRole || userInfo?.role === 'judge';
  const canCageScore = userInfo?.permissions?.cageScoring ?? false;
  const canClassScore = userInfo?.permissions?.classScoring ?? false;
  const canFitShowScore = userInfo?.permissions?.fitShowScoring ?? false;
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    scoring: true,
    reports: true,
    leaderboards: true,
  });
  const [bottomNavValue, setBottomNavValue] = useState<string>('');
  const [touchStartX, setTouchStartX] = useState<number>(0);
  const [touchStartY, setTouchStartY] = useState<number>(0);

  const handleDrawerToggle = useCallback(() => {
    setMobileOpen(!mobileOpen);
  }, [mobileOpen]);

  const handleDrawerClose = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const handleDrawerOpen = useCallback(() => {
    setMobileOpen(true);
  }, []);

  const handleMenuItemClick = useCallback((path: string, label?: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
    // Update bottom navigation value
    setBottomNavValue(path);
    
    // Announce navigation to screen readers
    if (config.screenReaderMode && label) {
      announceToScreenReader(`Navigated to ${label}`, 'polite');
    }
  }, [navigate, isMobile, config.screenReaderMode, announceToScreenReader]);

  const handleSectionToggle = useCallback((section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  const handleBottomNavChange = useCallback((_event: React.SyntheticEvent, newValue: string) => {
    if (newValue) {
      navigate(newValue);
      setBottomNavValue(newValue);
    }
  }, [navigate]);

  // Gesture handling for drawer
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    setTouchStartX(event.touches[0].clientX);
    setTouchStartY(event.touches[0].clientY);
  }, []);

  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    if (!touchStartX || !touchStartY) return;

    const touchEndX = event.changedTouches[0].clientX;
    const touchEndY = event.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Only handle horizontal swipes (ignore vertical scrolling)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0 && touchStartX < 50 && !mobileOpen) {
        // Swipe right from left edge to open drawer
        handleDrawerOpen();
      } else if (deltaX < 0 && mobileOpen) {
        // Swipe left to close drawer
        handleDrawerClose();
      }
    }

    setTouchStartX(0);
    setTouchStartY(0);
  }, [touchStartX, touchStartY, mobileOpen, handleDrawerOpen, handleDrawerClose]);

  // Update bottom nav value when location changes
  useEffect(() => {
    setBottomNavValue(location.pathname);
  }, [location.pathname]);

  // Handle responsive layout and orientation changes
  useEffect(() => {
    // Apply CSS variables for responsive layout
    const cssVariables = getCSSVariables();
    const root = document.documentElement;
    
    Object.entries(cssVariables).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    // Close mobile drawer when switching to desktop
    if (!isMobile && mobileOpen) {
      setMobileOpen(false);
    }

    // Handle orientation change announcements for screen readers
    if (config.announceOrientationChanges) {
      const orientationMessage = `Screen orientation changed to ${orientation}`;
      announceToScreenReader(orientationMessage);
    }
  }, [getCSSVariables, isMobile, mobileOpen, orientation, config.announceOrientationChanges, announceToScreenReader]);

  // Handle smooth transitions during orientation changes
  useEffect(() => {
    if (isChangingOrientation) {
      // Temporarily disable interactions during orientation change
      document.body.style.pointerEvents = 'none';
      
      const timer = setTimeout(() => {
        document.body.style.pointerEvents = 'auto';
      }, 300);

      return () => {
        clearTimeout(timer);
        document.body.style.pointerEvents = 'auto';
      };
    }
  }, [isChangingOrientation]);

  const drawerWidth = 280;

  const menuItems = [
    {
      path: 'dashboard',
      label: 'Dashboard',
      icon: <DashboardIcon />,
      show: true,
      category: 'main',
      mobileOrder: 1,
      showInBottomNav: true,
    },
    // Scoring Interfaces
    {
      path: 'cage-scoring',
      label: 'Cage Scoring',
      icon: <CageIcon />,
      show: canCageScore,
      category: 'scoring',
      color: '#4caf50',
      mobileOrder: 2,
      showInBottomNav: true,
    },
    {
      path: 'class-scoring',
      label: 'Class Scoring',
      icon: <ClassIcon />,
      show: canClassScore,
      category: 'scoring',
      color: '#1976d2',
      mobileOrder: 3,
      showInBottomNav: true,
    },
    {
      path: 'fit-show-scoring',
      label: 'Fit & Show Scoring',
      icon: <FitShowIcon />,
      show: canFitShowScore,
      category: 'scoring',
      color: '#ff9800',
      mobileOrder: 4,
      showInBottomNav: true,
    },
    // Reports
    {
      path: 'reports',
      label: 'Cage Reports',
      icon: <AuditIcon />,
      show: hasAdminRole && canCageScore,
      category: 'reports',
      color: '#4caf50',
      mobileOrder: 10,
      showInBottomNav: false,
    },
    {
      path: 'class-reports',
      label: 'Class Reports',
      icon: <AuditIcon />,
      show: hasAdminRole && canClassScore,
      category: 'reports',
      color: '#1976d2',
      mobileOrder: 11,
      showInBottomNav: false,
    },
    {
      path: 'fit-show-reports',
      label: 'Fit & Show Reports',
      icon: <AuditIcon />,
      show: hasAdminRole && canFitShowScore,
      category: 'reports',
      color: '#ff9800',
      mobileOrder: 12,
      showInBottomNav: false,
    },
    // Leaderboards
    {
      path: 'leaderboard',
      label: 'Cage Leaderboard',
      icon: <LeaderboardIcon />,
      show: canCageScore,
      category: 'leaderboards',
      color: '#4caf50',
      mobileOrder: 6,
      showInBottomNav: false,
    },
    {
      path: 'class-leaderboard',
      label: 'Class Leaderboard',
      icon: <LeaderboardIcon />,
      show: canClassScore,
      category: 'leaderboards',
      color: '#1976d2',
      mobileOrder: 7,
      showInBottomNav: false,
    },
    {
      path: 'fit-show-leaderboard',
      label: 'Fit & Show Leaderboard',
      icon: <LeaderboardIcon />,
      show: canFitShowScore,
      category: 'leaderboards',
      color: '#ff9800',
      mobileOrder: 8,
      showInBottomNav: false,
    },
    {
      path: 'users',
      label: 'User Management',
      icon: <PeopleIcon />,
      show: hasAdminRole,
      category: 'admin',
      mobileOrder: 15,
      showInBottomNav: false,
    },
  ];

  // Get bottom navigation items (max 5 for mobile)
  const bottomNavItems = menuItems
    .filter(item => item.show && item.showInBottomNav)
    .sort((a, b) => a.mobileOrder - b.mobileOrder)
    .slice(0, 5);

  const getCurrentPageTitle = () => {
    const currentItem = menuItems.find(item => item.path === location.pathname);
    return currentItem?.label || 'Dashboard';
  };

  const renderCollapsibleSection = (
    title: string,
    sectionKey: string,
    items: typeof menuItems,
    showDivider: boolean = true
  ) => {
    const sectionItems = items.filter(item => item.show && item.category === sectionKey);
    if (sectionItems.length === 0) return null;

    return (
      <>
        {showDivider && <Divider />}
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => handleSectionToggle(sectionKey)}
            sx={{
              minHeight: isMobile ? 48 : 40,
              '&:hover': {
                backgroundColor: 'action.hover',
              }
            }}
          >
            <ListItemText
              primary={title}
              slotProps={{
                primary: {
                  variant: isMobile ? 'body2' : 'caption',
                  color: 'text.secondary',
                  sx: {
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    fontSize: isMobile ? '0.875rem' : '0.75rem'
                  }
                }
              }}
            />
            {expandedSections[sectionKey] ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>
        <Collapse in={expandedSections[sectionKey]} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {sectionItems.map((item) => (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => handleMenuItemClick(item.path)}
                  sx={{
                    pl: isMobile ? 2 : 4,
                    minHeight: isMobile ? 56 : 48,
                    '&.Mui-selected': {
                      backgroundColor: item.color ? `${item.color}20` : 'action.selected',
                      borderRight: item.color ? `3px solid ${item.color}` : 'none',
                    },
                    '&:hover': {
                      backgroundColor: item.color ? `${item.color}10` : 'action.hover',
                    }
                  }}
                >
                  <ListItemIcon 
                    sx={{ 
                      color: item.color || 'inherit',
                      minWidth: isMobile ? 40 : 56,
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    slotProps={{
                      primary: {
                        sx: {
                          color: location.pathname === item.path && item.color ? item.color : 'inherit',
                          fontWeight: location.pathname === item.path ? 'bold' : 'normal',
                          fontSize: isMobile ? '0.875rem' : '1rem'
                        }
                      }
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Collapse>
      </>
    );
  };

  const drawer = (
    <Box 
      ref={containerRef}
      sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      {/* Skip link for keyboard navigation */}
      <a 
        href="#main-content" 
        className="skip-link"
        style={{
          position: 'absolute',
          top: '-40px',
          left: '6px',
          background: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          padding: '8px',
          textDecoration: 'none',
          borderRadius: '4px',
          zIndex: 9999,
          fontSize: '14px',
          fontWeight: 500,
        }}
        onFocus={(e) => {
          e.currentTarget.style.top = '6px';
        }}
        onBlur={(e) => {
          e.currentTarget.style.top = '-40px';
        }}
      >
        Skip to main content
      </a>
      
      <Toolbar sx={{ minHeight: isMobile ? 56 : 64 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          width: '100%',
          justifyContent: 'space-between'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PetsIcon color="primary" aria-hidden="true" />
            <Typography 
              id="mobile-navigation-title"
              variant={isMobile ? "subtitle1" : "h6"} 
              noWrap 
              component="div"
              sx={{ fontSize: isMobile ? '1.1rem' : '1.25rem' }}
            >
              4H Cat Voting
            </Typography>
          </Box>
          {isMobile && (
            <IconButton
              onClick={handleDrawerClose}
              aria-label="Close navigation menu"
              sx={{ 
                minWidth: Math.max(44, config.minTouchTarget),
                minHeight: Math.max(44, config.minTouchTarget),
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
                '&:focus-visible': {
                  outline: `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: 2,
                }
              }}
            >
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </Toolbar>
      <Divider />
      
      <Box 
        sx={{ flexGrow: 1, overflowY: 'auto' }}
        role="navigation"
        aria-label="Main navigation"
      >
        <List sx={{ pt: 0 }}>
          {/* Dashboard */}
          {menuItems
            .filter(item => item.show && item.category === 'main')
            .map((item) => (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => handleMenuItemClick(item.path, item.label)}
                  aria-current={location.pathname === item.path ? 'page' : undefined}
                  sx={{
                    minHeight: Math.max(isMobile ? 56 : 48, config.minTouchTarget),
                    '&.Mui-selected': {
                      backgroundColor: 'action.selected',
                    },
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                    '&:focus-visible': {
                      outline: `2px solid ${theme.palette.primary.main}`,
                      outlineOffset: 2,
                    }
                  }}
                >
                  <ListItemIcon 
                    sx={{ minWidth: isMobile ? 40 : 56 }}
                    aria-hidden="true"
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.label}
                    sx={{
                      '& .MuiListItemText-primary': {
                        fontSize: isMobile ? '0.875rem' : '1rem'
                      }
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          
          {/* Scoring Interfaces */}
          {renderCollapsibleSection('Scoring Interfaces', 'scoring', menuItems)}
          
          {/* Reports */}
          {hasAdminRole && renderCollapsibleSection('Reports', 'reports', menuItems)}
          
          {/* Leaderboards */}
          {renderCollapsibleSection('Leaderboards', 'leaderboards', menuItems)}
          
          {/* User Management */}
          {hasAdminRole && (
            <>
              <Divider />
              {menuItems
                .filter(item => item.show && item.category === 'admin')
                .map((item) => (
                  <ListItem key={item.path} disablePadding>
                    <ListItemButton
                      selected={location.pathname === item.path}
                      onClick={() => handleMenuItemClick(item.path)}
                      sx={{
                        minHeight: isMobile ? 56 : 48,
                        '&.Mui-selected': {
                          backgroundColor: 'action.selected',
                        },
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        }
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: isMobile ? 40 : 56 }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        slotProps={{
                          primary: {
                            sx: { fontSize: isMobile ? '0.875rem' : '1rem' }
                          }
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
            </>
          )}
        </List>
      </Box>
    </Box>
  );

  return (
    <Box 
      sx={{ display: 'flex', height: '100vh' }}
      onTouchStart={isMobile ? handleTouchStart : undefined}
      onTouchEnd={isMobile ? handleTouchEnd : undefined}
    >
      {/* Enhanced AppBar with mobile optimizations */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          zIndex: theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ minHeight: isMobile ? 56 : 64 }}>
          <IconButton
            color="inherit"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation-drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ 
              mr: 2, 
              display: { md: 'none' },
              minWidth: Math.max(44, config.minTouchTarget),
              minHeight: Math.max(44, config.minTouchTarget),
            }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography 
            variant={isMobile ? "subtitle1" : "h6"} 
            noWrap 
            component="div" 
            sx={{ 
              flexGrow: 1,
              fontSize: isMobile ? '1.1rem' : '1.25rem',
              fontWeight: isMobile ? 500 : 400,
            }}
          >
            {getCurrentPageTitle()}
          </Typography>
          
          {/* Desktop sign out button */}
          {!isMobile && (
            <Button
              color="inherit"
              onClick={() => signOut && signOut()}
              startIcon={<ExitToAppIcon />}
              aria-label="Sign out of application"
              sx={{ 
                minHeight: Math.max(44, config.minTouchTarget),
                '&:focus-visible': {
                  outline: `2px solid ${theme.palette.common.white}`,
                  outlineOffset: 2,
                }
              }}
            >
              Sign Out
            </Button>
          )}
          
          {/* Mobile sign out button - icon only */}
          {isMobile && (
            <Tooltip title="Sign Out">
              <IconButton
                color="inherit"
                onClick={() => signOut && signOut()}
                aria-label="Sign out of application"
                sx={{ 
                  minWidth: Math.max(44, config.minTouchTarget),
                  minHeight: Math.max(44, config.minTouchTarget),
                  '&:focus-visible': {
                    outline: `2px solid ${theme.palette.common.white}`,
                    outlineOffset: 2,
                  }
                }}
              >
                <ExitToAppIcon />
              </IconButton>
            </Tooltip>
          )}
        </Toolbar>
      </AppBar>

      {/* Enhanced Navigation Drawer with gesture support */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer with SwipeableDrawer for better performance */}
        <SwipeableDrawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerClose}
          onOpen={handleDrawerOpen}
          slotProps={{
            modal: {
              keepMounted: true, // Better open performance on mobile
              'aria-labelledby': 'mobile-navigation-title',
            },
            paper: {
              id: 'mobile-navigation-drawer',
              role: 'navigation',
              'aria-label': 'Main navigation menu',
            },
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              maxWidth: '85vw', // Prevent drawer from taking full width on small screens
            },
          }}
          swipeAreaWidth={20}
          disableBackdropTransition={!iOS}
          disableDiscovery={iOS}
        >
          {drawer}
        </SwipeableDrawer>
        
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          slotProps={{
            paper: {
              role: 'navigation',
              'aria-label': 'Main navigation menu',
            },
          }}
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              position: 'relative',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main content with mobile optimizations */}
      <Box
        component="main"
        id="main-content"
        role="main"
        aria-label="Main content"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          pb: isMobile ? 7 : 0, // Add padding for bottom navigation
        }}
      >
        <Toolbar sx={{ minHeight: isMobile ? 56 : 64 }} />
        
        <Box sx={{ 
          flexGrow: 1, 
          p: isMobile ? 2 : 3,
          overflowY: 'auto',
        }}>
          <Outlet />
        </Box>
        
        {/* Score Notifications - Positioned for mobile */}
        {canCageScore && (
          <ScoreNotifications 
            maxNotifications={isMobile ? 2 : 3}
            autoHideDelay={8000}
            showOnlyFinalized={false}
            position={isMobile ? "top-center" : "top-right"}
          />
        )}
      </Box>

      {/* Bottom Navigation for Mobile */}
      {isMobile && bottomNavItems.length > 0 && (
        <Paper 
          sx={{ 
            position: 'fixed', 
            bottom: 0, 
            left: 0, 
            right: 0,
            zIndex: theme.zIndex.appBar,
          }} 
          elevation={8}
          role="navigation"
          aria-label="Mobile navigation"
        >
          <BottomNavigation
            value={bottomNavValue}
            onChange={handleBottomNavChange}
            sx={{
              height: Math.max(56, config.minTouchTarget),
              '& .MuiBottomNavigationAction-root': {
                minWidth: 'auto',
                minHeight: Math.max(44, config.minTouchTarget),
                padding: '6px 12px 8px',
                '&.Mui-selected': {
                  color: theme.palette.primary.main,
                },
                '&:focus-visible': {
                  outline: `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: 2,
                }
              },
              '& .MuiBottomNavigationAction-label': {
                fontSize: '0.75rem',
                '&.Mui-selected': {
                  fontSize: '0.75rem',
                },
              },
            }}
          >
            {bottomNavItems.map((item) => (
              <BottomNavigationAction
                key={item.path}
                label={item.label.replace(' Scoring', '').replace(' ', '\n')}
                value={item.path}
                aria-label={`Navigate to ${item.label}`}
                aria-current={location.pathname === item.path ? 'page' : undefined}
                icon={
                  <Badge
                    variant="dot"
                    invisible={location.pathname !== item.path}
                    sx={{
                      '& .MuiBadge-badge': {
                        backgroundColor: item.color || theme.palette.primary.main,
                      }
                    }}
                  >
                    <Box component="span" aria-hidden="true">
                      {item.icon}
                    </Box>
                  </Badge>
                }
                sx={{
                  '&.Mui-selected': {
                    color: item.color || theme.palette.primary.main,
                  }
                }}
              />
            ))}
          </BottomNavigation>
        </Paper>
      )}
      
      {/* Performance monitoring components */}
      <NetworkStatusIndicator />
      <PerformanceMonitorButton />
      <UserDebugInfo />
    </Box>
  );
}

export default AppLayout;