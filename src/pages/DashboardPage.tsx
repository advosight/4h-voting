import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Button,
  Grid,
  Box,
  Alert,
  Paper,
  Chip,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Fab,
  useTheme,
  useMediaQuery,
  Drawer,
  SwipeableDrawer,
} from '@mui/material';
import {
  Tv as TvIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  Add as AddIcon,
  Assessment as AssessmentIcon,
  Email as EmailIcon,
  EmojiEvents as TrophyIcon,
  SwipeLeft as SwipeIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { generateClient } from 'aws-amplify/api';
import AddCatForm from '../components/AddCatForm';
import CatCard from '../components/CatCard';
import { useUserRole } from '../utils/roleUtils';

const client = generateClient();

const listCats = `
  query ListCats {
    listCats {
      items {
        id
        name
        owner
        votes
        cageNumber
        ownerAgeGroup
        catAgeGroup
      }
    }
  }
`;

const listEmails = `
  query ListEmails {
    listEmails {
      items {
        id
        email
        timestamp
      }
    }
  }
`;

const getVotingStatus = `
  query GetVotingStatus {
    getVotingStatus {
      isActive
    }
  }
`;

const setVotingStatus = `
  mutation SetVotingStatus($isActive: Boolean!) {
    setVotingStatus(isActive: $isActive) {
      isActive
    }
  }
`;

const onVoteUpdate = `
  subscription OnVoteUpdate {
    onVoteUpdate {
      id
      votes
    }
  }
`;

const onEmailAdded = `
  subscription OnEmailAdded {
    onEmailAdded {
      id
      email
      timestamp
    }
  }
`;

const onVotingStatusChange = `
  subscription OnVotingStatusChange {
    onVotingStatusChange {
      isActive
    }
  }
`;

function DashboardPage(): JSX.Element {
  const navigate = useNavigate();
  const [cats, setCats] = useState<any[]>([]);
  const [emails, setEmails] = useState<any[]>([]);
  const [votingActive, setVotingActive] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [addCatDrawerOpen, setAddCatDrawerOpen] = useState<boolean>(false);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'lg'));

  const { userInfo } = useUserRole();
  const isAdmin = userInfo?.role === 'admin';
  const canScore = isAdmin || !!(
    userInfo?.permissions?.cageScoring ||
    userInfo?.permissions?.classScoring ||
    userInfo?.permissions?.fitShowScoring
  );

  useEffect(() => {
    if (isAdmin) {
      fetchEmails();
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchCats();
    fetchVotingStatus();

    console.log('Setting up subscriptions...');
    
    let voteSubscription: any;
    let emailSubscription: any;
    let votingStatusSubscription: any;

    try {
      const voteSubscriptionObservable = client.graphql({
        query: onVoteUpdate
      });
      
      if ('subscribe' in voteSubscriptionObservable) {
        voteSubscription = voteSubscriptionObservable.subscribe({
          next: (result: any) => {
            console.log('Vote update received:', result);
            if (result?.data?.onVoteUpdate?.id) {
              setCats(prev => {
                const updated = prev.map(cat => 
                  cat.id === result.data.onVoteUpdate.id 
                    ? { ...cat, votes: result.data.onVoteUpdate.votes }
                    : cat
                );
                return updated.sort((a: any, b: any) => b.votes - a.votes);
              });
            }
          },
          error: (error: any) => {
            console.error('Vote subscription error:', error);
          }
        });
      }

      const emailSubscriptionObservable = client.graphql({
        query: onEmailAdded
      });
      
      if ('subscribe' in emailSubscriptionObservable) {
        emailSubscription = emailSubscriptionObservable.subscribe({
          next: (result: any) => {
            console.log('Email update received:', result);
            if (result?.data?.onEmailAdded) {
              setEmails(prev => {
                const exists = prev.find(email => email.id === result.data.onEmailAdded.id);
                if (!exists) {
                  return [result.data.onEmailAdded, ...prev];
                }
                return prev;
              });
            }
          },
          error: (error: any) => {
            console.error('Email subscription error:', error);
          }
        });
      }
      
      const votingStatusSubscriptionObservable = client.graphql({
        query: onVotingStatusChange
      });
      
      if ('subscribe' in votingStatusSubscriptionObservable) {
        votingStatusSubscription = votingStatusSubscriptionObservable.subscribe({
          next: (result: any) => {
            console.log('Voting status update received:', result);
            if (result?.data?.onVotingStatusChange?.isActive !== undefined) {
              setVotingActive(result.data.onVotingStatusChange.isActive);
            }
          },
          error: (error: any) => {
            console.error('Voting status subscription error:', error);
          }
        });
      }
    } catch (error) {
      console.error('Error setting up subscriptions:', error);
    }

    console.log('Subscriptions set up');

    return () => {
      console.log('Cleaning up subscriptions');
      if (voteSubscription?.unsubscribe) {
        voteSubscription.unsubscribe();
      }
      if (emailSubscription?.unsubscribe) {
        emailSubscription.unsubscribe();
      }
      if (votingStatusSubscription?.unsubscribe) {
        votingStatusSubscription.unsubscribe();
      }
    };
  }, []);

  const fetchCats = async () => {
    try {
      const result = await client.graphql({ query: listCats });
      const sortedCats = result.data.listCats.items.sort((a: any, b: any) => b.votes - a.votes);
      setCats(sortedCats);
    } catch (error) {
      console.error('Error fetching cats:', error);
      setCats([]);
    }
  };

  const fetchEmails = async () => {
    try {
      const result = await client.graphql({ query: listEmails });
      setEmails(result.data.listEmails.items);
    } catch (error) {
      console.error('Error fetching emails:', error);
      setEmails([]);
    }
  };
  
  const fetchVotingStatus = async () => {
    try {
      const result = await client.graphql({ query: getVotingStatus });
      setVotingActive(result.data.getVotingStatus.isActive);
    } catch (error) {
      console.error('Error fetching voting status:', error);
      setVotingActive(true);
    }
  };
  
  const toggleVotingStatus = async () => {
    try {
      setLoading(true);
      await client.graphql({
        query: setVotingStatus,
        variables: {
          isActive: !votingActive
        }
      });
      setVotingActive(!votingActive);
    } catch (error) {
      console.error('Error toggling voting status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCatAdded = () => {
    fetchCats();
  };

  const handleCatUpdated = () => {
    fetchCats();
  };

  // Mobile swipe handlers for cat cards
  const handleSwipeLeft = () => {
    if (currentCardIndex < cats.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    }
  };

  const handleSwipeRight = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
    }
  };

  // Widget components for mobile dashboard
  const VotingControlWidget = () => (
    <Card elevation={3} sx={{ mb: 2 }}>
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrophyIcon color="primary" />
            Voting Control
          </Typography>
          <Chip 
            label={`${cats.reduce((sum, cat) => sum + cat.votes, 0)} votes`}
            color="secondary"
            size="small"
          />
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {isAdmin && (
            <Button
              variant={votingActive ? "contained" : "outlined"}
              color={votingActive ? "error" : "success"}
              onClick={toggleVotingStatus}
              disabled={loading}
              startIcon={votingActive ? <PauseIcon /> : <PlayArrowIcon />}
              size={isMobile ? "small" : "medium"}
              sx={{ flex: 1, minHeight: 44 }}
            >
              {loading ? 'Updating...' : votingActive ? 'Pause' : 'Resume'}
            </Button>
          )}

          <Button
            variant="outlined"
            onClick={() => window.open('/tv-mode', '_blank')}
            startIcon={<TvIcon />}
            size={isMobile ? "small" : "medium"}
            sx={{ flex: 1, minHeight: 44 }}
          >
            TV Mode
          </Button>
        </Box>

        {!votingActive && (
          <Alert severity="warning" sx={{ mt: 2, fontSize: '0.875rem' }}>
            Voting is currently paused
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  const QuickActionsWidget = () => (
    <Card elevation={2} sx={{ mb: 2, backgroundColor: '#f8f9ff', border: '1px solid #e3f2fd' }}>
      <CardContent sx={{ pb: 1 }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#1976d2', display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssessmentIcon />
          Quick Actions
        </Typography>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(140px, 1fr))', gap: 1 }}>
          {canScore && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => window.location.href = '/scoring'}
              size="small"
              sx={{ minHeight: 44 }}
            >
              Scoring
            </Button>
          )}
          {isAdmin && (
            <Button
              variant="outlined"
              color="primary"
              onClick={() => window.location.href = '/reports'}
              size="small"
              sx={{ minHeight: 44 }}
            >
              Reports
            </Button>
          )}
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => window.location.href = '/leaderboard'}
            size="small"
            sx={{ minHeight: 44 }}
          >
            Leaderboard
          </Button>
        </Box>
      </CardContent>
    </Card>
  );

  const EmailSignupsWidget = () => (
    <Card elevation={2} sx={{ mb: 2 }}>
      <CardContent sx={{ pb: 1 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmailIcon color="primary" />
          Email Signups ({emails.length})
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {emails.length === 0 
            ? 'No email signups yet.' 
            : `${emails.length} people have signed up for 4H information.`
          }
        </Typography>
        
        {isAdmin && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<EmailIcon />}
            onClick={() => navigate('/email-reports')}
            fullWidth
            sx={{ mt: 1 }}
          >
            View Email Reports (Admin)
          </Button>
        )}
      </CardContent>
    </Card>
  );

  const CatCardsWidget = () => {
    if (isMobile && cats.length > 0) {
      // Mobile: Swipeable single card view
      return (
        <Card elevation={2} sx={{ mb: 2 }}>
          <CardContent sx={{ pb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                Cat Entries ({cats.length})
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {currentCardIndex + 1} of {cats.length}
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={handleSwipeRight}
                  disabled={currentCardIndex === 0}
                  sx={{ minHeight: 44, minWidth: 44 }}
                >
                  <SwipeIcon sx={{ transform: 'rotate(180deg)' }} />
                </IconButton>
                <IconButton 
                  size="small" 
                  onClick={handleSwipeLeft}
                  disabled={currentCardIndex === cats.length - 1}
                  sx={{ minHeight: 44, minWidth: 44 }}
                >
                  <SwipeIcon />
                </IconButton>
              </Box>
            </Box>
            
            {cats.length > 0 && (
              <CatCard
                cat={cats[currentCardIndex]}
                rank={currentCardIndex + 1}
                onUpdate={handleCatUpdated}
                isAdmin={isAdmin}
              />
            )}
          </CardContent>
        </Card>
      );
    }

    // Tablet/Desktop: Grid view
    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ px: 1 }}>
          Cat Entries ({cats.length})
        </Typography>
        <Grid container spacing={2}>
          {cats.map((cat, index) => (
            <Grid size={{xs: 12, sm: 6, md: 4, lg: 3}} key={cat.id}>
              <CatCard
                cat={cat}
                rank={index + 1}
                onUpdate={handleCatUpdated}
                isAdmin={isAdmin}
              />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  return (
    <Box sx={{ pb: isMobile ? 10 : 2 }}>
      {/* Mobile: Widget-based priority layout */}
      {isMobile ? (
        <Box sx={{ px: 1 }}>
          <VotingControlWidget />
          <QuickActionsWidget />
          <CatCardsWidget />
          {isAdmin && <EmailSignupsWidget />}
        </Box>
      ) : (
        /* Tablet/Desktop: Enhanced grid layout */
        <Box>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{xs: 12, lg: 8}}>
              <VotingControlWidget />
            </Grid>
            <Grid size={{xs: 12, lg: 4}}>
              <QuickActionsWidget />
            </Grid>
          </Grid>

          <CatCardsWidget />

          {isAdmin && (
            <Grid container spacing={3}>
              <Grid size={{xs: 12, lg: 6}}>
                <EmailSignupsWidget />
              </Grid>
              <Grid size={{xs: 12, lg: 6}}>
                <Card elevation={2}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AddIcon color="primary" />
                      Add New Cat
                    </Typography>
                    <AddCatForm onCatAdded={handleCatAdded} />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Box>
      )}

      {/* Mobile: Floating Action Button for Add Cat */}
      {isMobile && isAdmin && (
        <Fab
          color="primary"
          aria-label="add cat"
          onClick={() => setAddCatDrawerOpen(true)}
          className="mobile-fab-above-nav"
          sx={{
            position: 'fixed',
            right: 16,
            zIndex: 1000,
            minHeight: 56,
            minWidth: 56,
            '&:hover': {
              transform: 'scale(1.05)',
            }
          }}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Mobile: Add Cat Drawer */}
      {isAdmin && (
        <SwipeableDrawer
          anchor="bottom"
          open={addCatDrawerOpen}
          onClose={() => setAddCatDrawerOpen(false)}
          onOpen={() => setAddCatDrawerOpen(true)}
          disableSwipeToOpen={false}
          slotProps={{
            paper: {
              sx: {
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                maxHeight: '90vh',
                paddingBottom: 'env(safe-area-inset-bottom, 16px)', // Safe area for mobile devices
              }
            }
          }}
        >
          <Box sx={{
            p: 2,
            pb: 'calc(16px + env(safe-area-inset-bottom, 0px))', // Extra bottom padding for safe area
            minHeight: 'fit-content'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">Add New Cat</Typography>
              <IconButton
                onClick={() => setAddCatDrawerOpen(false)}
                sx={{ minHeight: 44, minWidth: 44 }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
            <AddCatForm
              onCatAdded={() => {
                handleCatAdded();
                setAddCatDrawerOpen(false);
              }}
            />
          </Box>
        </SwipeableDrawer>
      )}
    </Box>
  );
}

export default DashboardPage;