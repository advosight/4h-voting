import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Chip,
  Grid,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Visibility as VisibilityIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import { generateClient } from 'aws-amplify/api';
import ClassScoreEditForm, { ClassScore, UpdateClassScoreInput } from '../components/ClassScoreEditForm';

const client = generateClient();
import ClassScoreAuditHistory, { ClassScoreAuditEntry } from '../components/ClassScoreAuditHistory';

// GraphQL queries and mutations
const GET_CLASS_SCORE = `
  query GetClassScore($id: ID!) {
    getClassScore(id: $id) {
      id
      catId
      judgeId
      judgeName
      beautyScore
      beautyComments
      personalityScore
      personalityComments
      balanceProportionScore
      balanceProportionComments
      coatCleanGroomed
      teethGumsHealthy
      eyesNoseClear
      earsCleanMiteFree
      toenailsClipped
      fleaIssues
      healthGroomingComments
      totalScore
      ribbonEligibility
      timestamp
      isFinalized
      modificationCount
      lastModifiedBy
      lastModifiedAt
    }
  }
`;

const GET_CLASS_SCORE_AUDIT_HISTORY = `
  query GetClassScoreAuditHistory($classScoreId: ID!) {
    getClassScoreAuditHistory(classScoreId: $classScoreId) {
      items {
        id
        classScoreId
        action
        modifiedBy
        modifiedAt
        previousValues
        newValues
        reason
      }
    }
  }
`;

const UPDATE_CLASS_SCORE = `
  mutation UpdateClassScore($id: ID!, $input: UpdateClassScoreInput!) {
    updateClassScore(id: $id, input: $input) {
      id
      catId
      judgeId
      judgeName
      beautyScore
      beautyComments
      personalityScore
      personalityComments
      balanceProportionScore
      balanceProportionComments
      coatCleanGroomed
      teethGumsHealthy
      eyesNoseClear
      earsCleanMiteFree
      toenailsClipped
      fleaIssues
      healthGroomingComments
      totalScore
      ribbonEligibility
      timestamp
      isFinalized
      modificationCount
      lastModifiedBy
      lastModifiedAt
    }
  }
`;

const FINALIZE_CLASS_SCORE = `
  mutation FinalizeClassScore($id: ID!) {
    finalizeClassScore(id: $id) {
      id
      isFinalized
      modificationCount
      lastModifiedBy
      lastModifiedAt
    }
  }
`;

const GET_CAT = `
  query GetCat($id: ID!) {
    getCat(id: $id) {
      id
      name
      owner
      cageNumber
      ownerAgeGroup
      catAgeGroup
    }
  }
`;

interface Cat {
  id: string;
  name: string;
  owner: string;
  cageNumber?: number;
  ownerAgeGroup?: string;
  catAgeGroup?: string;
}

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
      id={`class-score-tabpanel-${index}`}
      aria-labelledby={`class-score-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const ClassScoreManagementPage: React.FC = () => {
  const { classScoreId } = useParams<{ classScoreId: string }>();
  const navigate = useNavigate();
  
  const [classScore, setClassScore] = useState<ClassScore | null>(null);
  const [cat, setCat] = useState<Cat | null>(null);
  const [auditEntries, setAuditEntries] = useState<ClassScoreAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (classScoreId) {
      loadClassScore();
      loadAuditHistory();
    }
  }, [classScoreId]);

  useEffect(() => {
    if (classScore?.catId) {
      loadCat();
    }
  }, [classScore?.catId]);

  const loadClassScore = async () => {
    try {
      setLoading(true);
      const result = await client.graphql({
        query: GET_CLASS_SCORE,
        variables: { id: classScoreId }
      });

      if (result.data?.getClassScore) {
        setClassScore(result.data.getClassScore);
      } else {
        setError('Class score not found');
      }
    } catch (err) {
      console.error('Error loading class score:', err);
      setError('Failed to load class score');
    } finally {
      setLoading(false);
    }
  };

  const loadCat = async () => {
    if (!classScore?.catId) return;

    try {
      const result = await client.graphql({
        query: GET_CAT,
        variables: { id: classScore.catId }
      });

      if (result.data?.getCat) {
        setCat(result.data.getCat);
      }
    } catch (err) {
      console.error('Error loading cat:', err);
    }
  };

  const loadAuditHistory = async () => {
    try {
      const result = await client.graphql({
        query: GET_CLASS_SCORE_AUDIT_HISTORY,
        variables: { classScoreId }
      });

      if (result.data?.getClassScoreAuditHistory?.items) {
        setAuditEntries(result.data.getClassScoreAuditHistory.items);
      }
    } catch (err) {
      console.error('Error loading audit history:', err);
    }
  };

  const handleSave = async (id: string, input: UpdateClassScoreInput) => {
    try {
      setSaving(true);
      setError(null);

      const result = await client.graphql({
        query: UPDATE_CLASS_SCORE,
        variables: { id, input }
      });

      if (result.data?.updateClassScore) {
        setClassScore(result.data.updateClassScore);
        setIsEditing(false);
        // Reload audit history to show the new entry
        await loadAuditHistory();
      }
    } catch (err: any) {
      console.error('Error updating class score:', err);
      setError(err.message || 'Failed to update class score');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!classScore) return;

    try {
      setSaving(true);
      setError(null);

      const result = await client.graphql({
        query: FINALIZE_CLASS_SCORE,
        variables: { id: classScore.id }
      });

      if (result.data?.finalizeClassScore) {
        setClassScore(prev => prev ? {
          ...prev,
          isFinalized: true,
          modificationCount: result.data.finalizeClassScore.modificationCount,
          lastModifiedBy: result.data.finalizeClassScore.lastModifiedBy,
          lastModifiedAt: result.data.finalizeClassScore.lastModifiedAt
        } : null);
        // Reload audit history to show the finalization entry
        await loadAuditHistory();
      }
    } catch (err: any) {
      console.error('Error finalizing class score:', err);
      setError(err.message || 'Failed to finalize class score');
    } finally {
      setSaving(false);
    }
  };

  const getRibbonColor = (ribbon: string) => {
    switch (ribbon) {
      case 'Blue': return 'primary';
      case 'Red': return 'error';
      case 'White': return 'default';
      case 'Participation': return 'secondary';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error && !classScore) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/admin/class-scores')}
          sx={{ mt: 2 }}
        >
          Back to Class Scores
        </Button>
      </Box>
    );
  }

  if (!classScore) {
    return (
      <Box p={3}>
        <Alert severity="warning">Class score not found</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/admin/class-scores')}
          sx={{ mt: 2 }}
        >
          Back to Class Scores
        </Button>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box display="flex" alignItems="center">
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/admin/class-scores')}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h4">
            Class Score Management
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          {!classScore.isFinalized && (
            <Button
              variant="outlined"
              startIcon={<LockIcon />}
              onClick={handleFinalize}
              disabled={saving}
            >
              Finalize Score
            </Button>
          )}
        </Box>
      </Box>

      {/* Cat Information */}
      {cat && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="text.secondary">
                  Cat Name
                </Typography>
                <Typography variant="body1">{cat.name}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="text.secondary">
                  Owner
                </Typography>
                <Typography variant="body1">{cat.owner}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="text.secondary">
                  Cage Number
                </Typography>
                <Typography variant="body1">{cat.cageNumber || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="text.secondary">
                  Class Category
                </Typography>
                <Typography variant="body1">{cat.catAgeGroup || 'N/A'}</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Score Summary */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="subtitle2" color="text.secondary">
                Total Score
              </Typography>
              <Typography variant="h5">{classScore.totalScore}/50</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="subtitle2" color="text.secondary">
                Ribbon Eligibility
              </Typography>
              <Chip 
                label={`${classScore.ribbonEligibility} Ribbon`}
                color={getRibbonColor(classScore.ribbonEligibility) as any}
                size="medium"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="subtitle2" color="text.secondary">
                Judge
              </Typography>
              <Typography variant="body1">{classScore.judgeName}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="subtitle2" color="text.secondary">
                Status
              </Typography>
              <Chip 
                label={classScore.isFinalized ? 'Finalized' : 'Draft'}
                color={classScore.isFinalized ? 'success' : 'warning'}
                size="small"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={(_, newValue) => setTabValue(newValue)}
          aria-label="class score management tabs"
        >
          <Tab 
            label="View Score" 
            icon={<VisibilityIcon />} 
            iconPosition="start"
          />
          <Tab 
            label="Edit Score" 
            icon={<EditIcon />} 
            iconPosition="start"
          />
          <Tab 
            label="Audit History" 
            icon={<HistoryIcon />} 
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        {/* View Score Panel */}
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Class Score Details
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" color="text.secondary">
                Beauty Score
              </Typography>
              <Typography variant="h6">{classScore.beautyScore}/15</Typography>
              {classScore.beautyComments && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {classScore.beautyComments}
                </Typography>
              )}
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" color="text.secondary">
                Personality Score
              </Typography>
              <Typography variant="h6">{classScore.personalityScore}/20</Typography>
              {classScore.personalityComments && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {classScore.personalityComments}
                </Typography>
              )}
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" color="text.secondary">
                Balance/Proportion Score
              </Typography>
              <Typography variant="h6">{classScore.balanceProportionScore}/15</Typography>
              {classScore.balanceProportionComments && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {classScore.balanceProportionComments}
                </Typography>
              )}
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" gutterBottom>
            Health & Grooming Evaluation
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                Coat clean & groomed: {classScore.coatCleanGroomed ? '✓' : '✗'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                Teeth/gums healthy: {classScore.teethGumsHealthy ? '✓' : '✗'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                Eyes & nose clear: {classScore.eyesNoseClear ? '✓' : '✗'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                Ears clean & mite-free: {classScore.earsCleanMiteFree ? '✓' : '✗'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                Toenails clipped: {classScore.toenailsClipped ? '✓' : '✗'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color={classScore.fleaIssues ? 'error' : 'text.primary'}>
                Flea issues: {classScore.fleaIssues ? '⚠️ Yes' : '✓ No'}
              </Typography>
            </Grid>
          </Grid>
          
          {classScore.healthGroomingComments && (
            <Box mt={2}>
              <Typography variant="subtitle2" color="text.secondary">
                Health & Grooming Comments:
              </Typography>
              <Typography variant="body2">
                {classScore.healthGroomingComments}
              </Typography>
            </Box>
          )}
        </Paper>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {/* Edit Score Panel */}
        <ClassScoreEditForm
          classScore={classScore}
          onSave={handleSave}
          onCancel={() => setTabValue(0)}
          loading={saving}
          error={error}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {/* Audit History Panel */}
        <ClassScoreAuditHistory
          classScoreId={classScore.id}
          auditEntries={auditEntries}
          loading={false}
          error={null}
        />
      </TabPanel>
    </Box>
  );
};

export default ClassScoreManagementPage;