import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Avatar,
  Chip,
  TextField,
  InputAdornment,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Email as EmailIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { generateClient } from 'aws-amplify/api';

const client = generateClient();

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

const onEmailAdded = `
  subscription OnEmailAdded {
    onEmailAdded {
      id
      email
      timestamp
    }
  }
`;

function EmailReportsPage(): JSX.Element {
  const [emails, setEmails] = useState<any[]>([]);
  const [filteredEmails, setFilteredEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    fetchEmails();

    // Set up real-time subscription for new emails
    let emailSubscription: any;
    
    try {
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
    } catch (error) {
      console.error('Failed to set up email subscription:', error);
    }

    return () => {
      if (emailSubscription?.unsubscribe) {
        emailSubscription.unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    // Filter emails based on search term
    const filtered = emails.filter(email =>
      email.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredEmails(filtered);
  }, [emails, searchTerm]);

  const fetchEmails = async () => {
    try {
      const result = await client.graphql({ query: listEmails });
      const sortedEmails = result.data.listEmails.items.sort(
        (a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setEmails(sortedEmails);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching emails:', error);
      setEmails([]);
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Email', 'Date Submitted'],
      ...filteredEmails.map(email => [
        email.email,
        new Date(email.timestamp).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `4h-email-signups-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading email reports...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: isMobile ? 10 : 2 }}>
      {/* Header */}
      <Box sx={{ mb: 4, px: isMobile ? 1 : 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar sx={{ bgcolor: '#1976d2', width: 56, height: 56 }}>
            <EmailIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant={isMobile ? "h4" : "h3"} gutterBottom sx={{ color: '#1976d2', fontWeight: 'bold', mb: 0 }}>
              Email Reports
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ fontSize: isMobile ? '1rem' : '1.25rem' }}>
              4H Interest Email Signups - Admin Only
            </Typography>
          </Box>
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ fontSize: isMobile ? '0.9rem' : '1rem', maxWidth: 800 }}>
          View and manage email addresses collected from visitors interested in 4H programs.
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
        <Card elevation={3} sx={{ backgroundColor: '#e3f2fd', border: '2px solid #1976d2', minWidth: 200 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <PeopleIcon sx={{ fontSize: 40, color: '#1976d2', mb: 1 }} />
            <Typography variant="h4" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
              {emails.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Email Signups
            </Typography>
          </CardContent>
        </Card>

        <Card elevation={3} sx={{ backgroundColor: '#f3e5f5', border: '2px solid #9c27b0', minWidth: 200 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <EmailIcon sx={{ fontSize: 40, color: '#9c27b0', mb: 1 }} />
            <Typography variant="h4" sx={{ color: '#9c27b0', fontWeight: 'bold' }}>
              {filteredEmails.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Filtered Results
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Search and Export */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search emails..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            variant="outlined"
            size="small"
            sx={{ minWidth: 250, flex: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={exportToCSV}
            disabled={filteredEmails.length === 0}
          >
            Export CSV
          </Button>
        </Box>
      </Paper>

      {/* Email List */}
      <Card elevation={3}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EmailIcon />
            Email Signups ({filteredEmails.length})
          </Typography>

          {filteredEmails.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              {searchTerm ? 'No emails match your search criteria.' : 'No email signups yet.'}
            </Alert>
          ) : (
            <TableContainer component={Paper} sx={{ mt: 2, maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Email Address</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Date Submitted</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Time</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredEmails.map((email) => (
                    <TableRow key={email.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <EmailIcon color="primary" fontSize="small" />
                          {email.email}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={new Date(email.timestamp).toLocaleDateString()}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(email.timestamp).toLocaleTimeString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Admin Notice */}
      <Alert severity="warning" sx={{ mt: 3 }}>
        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
          🔒 Admin Access Only
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          This page contains sensitive information and is only accessible to administrators. 
          Email addresses are collected from visitors who express interest in 4H programs during voting.
        </Typography>
      </Alert>
    </Box>
  );
}

export default EmailReportsPage;