import React, { useState } from 'react';
import {
  Typography,
  Paper,
  Box,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import {
  FindInPage as AuditIcon,
  Assessment as CageScoringIcon,
  EmojiEvents as ClassScoringIcon,
} from '@mui/icons-material';
import ScoreReports from '../components/ScoreReports';
import { ClassScoreReports } from '../components/ClassScoreReports';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`reports-tabpanel-${index}`}
      aria-labelledby={`reports-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `reports-tab-${index}`,
    'aria-controls': `reports-tabpanel-${index}`,
  };
}

function ReportsPage(): JSX.Element {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AuditIcon />
        Scoring Reports
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        View detailed scoring reports and audit history for both cage scoring and class scoring.
      </Typography>
      
      <Paper elevation={2} sx={{ mt: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="scoring reports tabs"
            sx={{
              '& .MuiTab-root': {
                minHeight: 64,
                fontSize: '1rem',
                fontWeight: 'bold',
              }
            }}
          >
            <Tab 
              icon={<CageScoringIcon />} 
              iconPosition="start"
              label="Cage Scoring Reports" 
              {...a11yProps(0)}
              sx={{ 
                color: '#2e7d32',
                '&.Mui-selected': { 
                  color: '#2e7d32',
                  backgroundColor: '#f1f8e9'
                }
              }}
            />
            <Tab 
              icon={<ClassScoringIcon />} 
              iconPosition="start"
              label="Type Class Scoring Reports" 
              {...a11yProps(1)}
              sx={{ 
                color: '#1976d2',
                '&.Mui-selected': { 
                  color: '#1976d2',
                  backgroundColor: '#f8f9ff'
                }
              }}
            />
          </Tabs>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ p: 3, backgroundColor: '#f1f8e9' }}>
            <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#2e7d32' }}>
              <CageScoringIcon />
              Cage Scoring Reports
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
              Traditional cage-based scoring reports and audit history.
            </Typography>
            <Divider sx={{ mb: 3, borderColor: '#4caf50' }} />
            <ScoreReports />
          </Box>
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 3, backgroundColor: '#f8f9ff' }}>
            <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#1976d2' }}>
              <ClassScoringIcon />
              Type Class Scoring Reports
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
              Professional class competition scoring reports with beauty, personality, and health criteria.
            </Typography>
            <Divider sx={{ mb: 3, borderColor: '#1976d2' }} />
            <ClassScoreReports />
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
}

export default ReportsPage;