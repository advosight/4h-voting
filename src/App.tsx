import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, CircularProgress, Box } from '@mui/material';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { theme } from './theme/theme';
import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { register as registerSW, performanceMonitor } from './utils/serviceWorker';
import { addResourceHints, preloadCriticalResources } from './utils/bundleOptimization';
import usePerformanceOptimization from './hooks/usePerformanceOptimization';
import { AccessibilityProvider } from './contexts/AccessibilityContext';
import { ResponsiveProvider } from './contexts/ResponsiveContext';

// Lazy load pages for better performance
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const CageScoringPage = React.lazy(() => import('./pages/CageScoringPage'));
const CageScorePage = React.lazy(() => import('./pages/CageScorePage'));
const ClassScoringPage = React.lazy(() => import('./pages/ClassScoringPage'));
const FitShowScoringPage = React.lazy(() => import('./pages/FitShowScoringPage'));
const FitShowScorePage = React.lazy(() => import('./pages/FitShowScorePage'));
const ReportsPage = React.lazy(() => import('./pages/ReportsPage'));
const LeaderboardPage = React.lazy(() => import('./pages/LeaderboardPage'));
const UserManagementPage = React.lazy(() => import('./pages/UserManagementPage'));
const VotePage = React.lazy(() => import('./pages/VotePage'));
const SignPage = React.lazy(() => import('./pages/SignPage'));
const TVModePage = React.lazy(() => import('./pages/TVModePage'));
const ScorePage = React.lazy(() => import('./pages/ScorePage'));
const ClassScorePage = React.lazy(() => import('./pages/ClassScorePage'));
const ClassScoreManagementPage = React.lazy(() => import('./pages/ClassScoreManagementPage'));
const FitShowReportsPage = React.lazy(() => import('./pages/FitShowReportsPage'));
const FitShowLeaderboardPage = React.lazy(() => import('./pages/FitShowLeaderboardPage'));
const EmailReportsPage = React.lazy(() => import('./pages/EmailReportsPage'));
const ParticipantScorePage = React.lazy(() => import('./pages/ParticipantScorePage'));
const ParticipantClassScorePage = React.lazy(() => import('./pages/ParticipantClassScorePage'));

// Loading fallback component
const LoadingFallback: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      flexDirection: 'column',
      gap: 2,
    }}
  >
    <CircularProgress size={40} />
    <Box sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
      Loading...
    </Box>
  </Box>
);

function App(): JSX.Element {
  console.log('App component rendering, current path:', window.location.pathname);

  const { performanceState, startTiming, endTiming } = usePerformanceOptimization({
    enableOfflineStorage: true,
    enablePerformanceMonitoring: true,
    enableImageOptimization: true,
    enableCodeSplitting: true
  });

  useEffect(() => {
    // Start app initialization timing
    startTiming('app-initialization');

    // Register service worker
    registerSW({
      onSuccess: (registration) => {
        console.log('Service Worker registered successfully:', registration);
      },
      onUpdate: (registration) => {
        console.log('Service Worker updated:', registration);
        // Optionally show update notification to user
      }
    });

    // Add resource hints for better performance
    addResourceHints();
    preloadCriticalResources();

    // Start performance monitoring
    performanceMonitor.observeWebVitals();

    // End app initialization timing
    endTiming('app-initialization');

    // Log performance state in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Performance state:', performanceState);
    }
  }, [startTiming, endTiming, performanceState]);

  return (
    <AccessibilityProvider>
      <ResponsiveProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <div className="App">
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                {/* Public routes */}
                <Route path="/vote/:catId" element={<VotePage />} />
                <Route path="/tv-mode" element={<TVModePage />} />
                <Route path="/participant-score/:participantId" element={<ParticipantScorePage />} />
                <Route path="/participant-class-score/:catId" element={<ParticipantClassScorePage />} />

                {/* Protected scoring routes - require judge role */}
                <Route path="/score/:cageNumber" element={
                  <ProtectedRoute requiredRoles={['judge', 'admin']}>
                    <ScorePage />
                  </ProtectedRoute>
                } />

                {/* Protected cage scoring routes - require judge role */}
                <Route path="/cage-score/:cageNumber" element={
                  <ProtectedRoute requiredRoles={['judge', 'admin']}>
                    <CageScorePage />
                  </ProtectedRoute>
                } />

                {/* Protected class scoring routes - require judge role */}
                <Route path="/class-score/:catId" element={
                  <ProtectedRoute requiredRoles={['judge', 'admin']}>
                    <ClassScorePage />
                  </ProtectedRoute>
                } />
                <Route path="/class-score/cage/:cageNumber" element={
                  <ProtectedRoute requiredRoles={['judge', 'admin']}>
                    <ClassScorePage />
                  </ProtectedRoute>
                } />

                {/* Protected fit and show scoring routes - require judge role */}
                <Route path="/fit-show-score/:catId" element={
                  <ProtectedRoute requiredRoles={['judge', 'admin']}>
                    <FitShowScorePage />
                  </ProtectedRoute>
                } />
                <Route path="/fit-show-score/cage/:cageNumber" element={
                  <ProtectedRoute requiredRoles={['judge', 'admin']}>
                    <FitShowScorePage />
                  </ProtectedRoute>
                } />

                {/* Class score management route - admin only */}
                <Route path="/admin/class-score/:classScoreId" element={
                  <ProtectedRoute requiredRoles={['admin']}>
                    <ClassScoreManagementPage />
                  </ProtectedRoute>
                } />

                {/* Protected sign page */}
                <Route path="/sign/:catId" element={
                  <ProtectedRoute requiredRoles={['admin']}>
                    <SignPage />
                  </ProtectedRoute>
                } />

                {/* Protected admin routes with layout */}
                <Route path="/" element={
                  <Authenticator>
                    {({ signOut }) => {
                      console.log('Authenticator rendering for admin routes');
                      return <AppLayout signOut={signOut || (() => { })} />;
                    }}
                  </Authenticator>
                }>
                  {/* Nested routes within the layout */}
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage />} />

                  {/* Scoring interfaces */}
                  <Route path="cage-scoring" element={<CageScoringPage />} />
                  <Route path="class-scoring" element={<ClassScoringPage />} />
                  <Route path="fit-show-scoring" element={<FitShowScoringPage />} />

                  {/* Reports */}
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="class-reports" element={<ReportsPage />} />
                  <Route path="fit-show-reports" element={<FitShowReportsPage />} />
                  
                  {/* Admin-only Email Reports */}
                  <Route path="email-reports" element={
                    <ProtectedRoute requiredRoles={['admin']}>
                      <EmailReportsPage />
                    </ProtectedRoute>
                  } />

                  {/* Leaderboards */}
                  <Route path="leaderboard" element={<LeaderboardPage />} />
                  <Route path="class-leaderboard" element={<LeaderboardPage />} />
                  <Route path="fit-show-leaderboard" element={<FitShowLeaderboardPage />} />

                  <Route path="users" element={<UserManagementPage />} />
                </Route>
              </Routes>
            </Suspense>
          </div>
        </ThemeProvider>
      </ResponsiveProvider>
    </AccessibilityProvider>
  );
}

export default App;