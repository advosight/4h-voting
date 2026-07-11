import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Box,
  Paper,
  TextField,
  InputAdornment,
  Alert,
  Chip,
  useTheme,
  useMediaQuery,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
} from '@mui/material';
import {
  EmojiEvents as ClassScoringIcon,
  Search as SearchIcon,
  TrendingUp as TrendingUpIcon,
  Star as StarIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { generateClient } from 'aws-amplify/api';
import ClassScoreLeaderboard from '../components/ClassScoreLeaderboard';
import ClassScoreNotifications from '../components/ClassScoreNotifications';
import { CAT_AGE_GROUPS, getCatAgeGroupLabel } from '../utils/ageGroups';

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

const listAllClassScores = `
  query ListAllClassScores($limit: Int, $nextToken: String) {
    listAllClassScores(limit: $limit, nextToken: $nextToken) {
      items {
        id
        catId
        beautyScore
        personalityScore
        coatCleanGroomed
        teethGumsHealthy
        eyesNoseClear
        earsCleanMiteFree
        toenailsClipped
        fleaIssues
        totalScore
        ribbonEligibility
        isFinalized
        judgeId
        judgeName
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;

const isHealthyClassScore = (classScore: any): boolean =>
  classScore.coatCleanGroomed &&
  classScore.teethGumsHealthy &&
  classScore.eyesNoseClear &&
  classScore.earsCleanMiteFree &&
  classScore.toenailsClipped &&
  !classScore.fleaIssues;

function ClassScoringPage(): JSX.Element {
  const navigate = useNavigate();
  const [cats, setCats] = useState<any[]>([]);
  const [classScores, setClassScores] = useState<any[]>([]);
  const [filteredCats, setFilteredCats] = useState<any[]>([]);
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(false);
  const [catsLoading, setCatsLoading] = useState<boolean>(true);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    fetchCats();
    // Fetch class scores but don't block the UI if it fails
    fetchClassScores().catch(console.error);
  }, []);

  useEffect(() => {
    filterCats();
  }, [cats, selectedAgeGroup]);

  const fetchCats = async () => {
    try {
      setCatsLoading(true);
      console.log('Fetching cats...');
      const result = await client.graphql({ query: listCats });
      console.log('Cats result:', result);
      if ('data' in result && result.data?.listCats?.items) {
        const sortedCats = result.data.listCats.items.sort((a: any, b: any) => a.name.localeCompare(b.name));
        console.log('Sorted cats:', sortedCats);
        setCats(sortedCats);
      } else {
        setCats([]);
      }
    } catch (error) {
      console.error('Error fetching cats:', error);
      setCats([]);
    } finally {
      setCatsLoading(false);
    }
  };

  const fetchClassScores = async () => {
    try {
      setLoading(true);
      console.log('Fetching class scores...');
      const result = await client.graphql({ 
        query: listAllClassScores,
        variables: { limit: 100 }
      });
      console.log('Class scores result:', result);
      if ('data' in result && result.data?.listAllClassScores?.items) {
        setClassScores(result.data.listAllClassScores.items);
      } else {
        setClassScores([]);
      }
    } catch (error) {
      console.error('Error fetching class scores:', error);
      setClassScores([]);
    } finally {
      setLoading(false);
    }
  };

  const filterCats = () => {
    console.log('Filtering cats. Total cats:', cats.length, 'Selected age group:', selectedAgeGroup);
    if (selectedAgeGroup === 'all') {
      setFilteredCats(cats);
    } else {
      const filtered = cats.filter(cat => cat.catAgeGroup === selectedAgeGroup);
      console.log('Filtered cats:', filtered.length);
      setFilteredCats(filtered);
    }
  };

  const getCatClassScore = (catId: string) => {
    return classScores.find(score => score.catId === catId);
  };

  const handleAgeGroupChange = (event: any) => {
    setSelectedAgeGroup(event.target.value);
  };

  return (
    <Box sx={{ pb: isMobile ? 10 : 2 }}>
      
      {/* Debug Info - Remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Debug: Cats loaded: {cats.length} | Filtered: {filteredCats.length} | Loading: {loading.toString()} | Age Group: {selectedAgeGroup}
        </Alert>
      )}

      {/* Manual Entry Options */}
      <Paper elevation={1} sx={{ p: 3, bgcolor: '#f8f9ff', mb: 4, border: '1px solid #e3f2fd' }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
          Quick Access by Cage Number
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Enter a cage number to access class scoring for that participant:
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 2, flexWrap: 'wrap' }}>
          <TextField
            type="number"
            label="Cage Number"
            variant="outlined"
            size="small"
            sx={{ minWidth: 200 }}
            slotProps={{
              input: {
                inputProps: { min: 1 },
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const cageNumber = (e.target as HTMLInputElement).value;
                if (cageNumber) {
                  navigate(`/class-score/cage/${cageNumber}`);
                  (e.target as HTMLInputElement).value = '';
                }
              }
            }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              const input = document.querySelector('input[type="number"]') as HTMLInputElement;
              const cageNumber = input?.value;
              if (cageNumber) {
                navigate(`/class-score/cage/${cageNumber}`);
                input.value = '';
              }
            }}
            sx={{ minHeight: 44 }}
          >
            Open Class Scoring
          </Button>
        </Box>
      </Paper>

      {/* Cats List with Scores */}
      <Paper elevation={1} sx={{ p: 3, mb: 4, backgroundColor: '#f8f9ff', border: '1px solid #e3f2fd' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h6" sx={{ color: '#1976d2', display: 'flex', alignItems: 'center', gap: 1 }}>
            <ClassScoringIcon />
            Registered Cats & Scores
          </Typography>
          
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="class-age-group-filter-label">Filter by Cat Age Group</InputLabel>
            <Select
              labelId="class-age-group-filter-label"
              value={selectedAgeGroup}
              label="Filter by Cat Age Group"
              onChange={handleAgeGroupChange}
              startAdornment={
                <InputAdornment position="start">
                  <FilterIcon />
                </InputAdornment>
              }
            >
              <MenuItem value="all">All Age Groups</MenuItem>
              {CAT_AGE_GROUPS.map((group) => (
                <MenuItem key={group.value} value={group.value}>
                  {group.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Simple cats list for debugging */}
        {process.env.NODE_ENV === 'development' && cats.length > 0 && (
          <Box sx={{ mb: 2, p: 2, bgcolor: '#f0f0f0', borderRadius: 1 }}>
            <Typography variant="caption">
              Raw cats data: {cats.map(cat => `${cat.name} (${cat.cageNumber})`).join(', ')}
            </Typography>
          </Box>
        )}

        {loading || catsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredCats.length > 0 ? (
          <TableContainer>
            <Table size={isMobile ? "small" : "medium"}>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Cage #</strong></TableCell>
                  <TableCell><strong>Cat Name</strong></TableCell>
                  <TableCell><strong>Owner</strong></TableCell>
                  <TableCell><strong>Age Group</strong></TableCell>
                  <TableCell align="center"><strong>Beauty</strong></TableCell>
                  <TableCell align="center"><strong>Personality</strong></TableCell>
                  <TableCell align="center"><strong>Health</strong></TableCell>
                  <TableCell align="center"><strong>Total</strong></TableCell>
                  <TableCell align="center"><strong>Ribbon</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCats.map((cat) => {
                  const classScore = getCatClassScore(cat.id);
                  return (
                    <TableRow 
                      key={cat.id}
                      sx={{ 
                        '&:hover': { backgroundColor: '#f5f5f5' },
                        cursor: 'pointer'
                      }}
                      onClick={() => navigate(`/class-score/${cat.id}`)}
                    >
                      <TableCell>{cat.cageNumber}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {cat.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{cat.owner}</TableCell>
                      <TableCell>
                        <Chip 
                          label={getCatAgeGroupLabel(cat.catAgeGroup)} 
                          size="small" 
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        {classScore ? (
                          <Chip 
                            label={classScore.beautyScore} 
                            size="small" 
                            color={classScore.beautyScore >= 80 ? "success" : classScore.beautyScore >= 60 ? "warning" : "default"}
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {classScore ? (
                          <Chip 
                            label={classScore.personalityScore} 
                            size="small" 
                            color={classScore.personalityScore >= 80 ? "success" : classScore.personalityScore >= 60 ? "warning" : "default"}
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {classScore ? (
                          <Chip
                            label={isHealthyClassScore(classScore) ? 'Healthy' : 'Issues Found'}
                            size="small"
                            color={isHealthyClassScore(classScore) ? 'success' : 'warning'}
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {classScore ? (
                          <Chip 
                            label={classScore.totalScore} 
                            size="small" 
                            color="primary"
                            sx={{ fontWeight: 'bold' }}
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {classScore?.ribbonEligibility ? (
                          <Chip
                            label={classScore.ribbonEligibility}
                            size="small"
                            color={
                              classScore.ribbonEligibility === 'Blue' ? 'primary' :
                              classScore.ribbonEligibility === 'Red' ? 'error' :
                              classScore.ribbonEligibility === 'White' ? 'default' : 'secondary'
                            }
                            sx={{ fontWeight: 'bold' }}
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">Not Scored</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/class-score/${cat.id}`);
                          }}
                          sx={{ minWidth: 'auto', px: 2 }}
                        >
                          Score
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {filteredCats.length === 0 && !loading && !catsLoading && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              {cats.length === 0 
                ? "No cats registered yet. Please add cats to the system first."
                : "No cats found for the selected age group."
              }
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Total cats loaded: {cats.length} | Filtered cats: {filteredCats.length}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Available Participants Grid */}
      <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
        Available Participants
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {cats.map((cat) => (
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={`class-${cat.id}`}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: '1px solid #1976d2',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4,
                  borderColor: '#1565c0',
                }
              }}
              onClick={() => navigate(`/class-score/${cat.id}`)}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="primary">
                  {cat.name}
                </Typography>
                <Typography variant="body2" color="text.primary">
                  Cage {cat.cageNumber}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Owner: {cat.owner}
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Chip 
                    label={`${cat.ownerAgeGroup} • ${cat.catAgeGroup}`} 
                    size="small" 
                    color="primary"
                    variant="outlined"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Scoring Criteria Information */}
      <Paper elevation={1} sx={{ p: 3, mb: 4, backgroundColor: '#e3f2fd', border: '1px solid #1976d2' }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
          Class Scoring Criteria
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <StarIcon sx={{ fontSize: 40, color: '#1976d2', mb: 1 }} />
              <Typography variant="h6" color="primary">Beauty</Typography>
              <Typography variant="body2" color="text.secondary">
                Physical appearance, coat quality, and breed standards
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <ClassScoringIcon sx={{ fontSize: 40, color: '#1976d2', mb: 1 }} />
              <Typography variant="h6" color="primary">Personality</Typography>
              <Typography variant="body2" color="text.secondary">
                Temperament, behavior, and interaction with judges
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <TrendingUpIcon sx={{ fontSize: 40, color: '#1976d2', mb: 1 }} />
              <Typography variant="h6" color="primary">Health</Typography>
              <Typography variant="body2" color="text.secondary">
                Overall health condition and vitality assessment
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Real-time Leaderboard */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <ClassScoreLeaderboard 
            showOnlyFinalized={false}
            maxEntriesPerRibbon={8}
            refreshInterval={30000}
            groupByRibbon={true}
          />
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <ClassScoreNotifications 
            maxNotifications={5}
            autoHideDelay={8000}
            showOnlyFinalized={false}
            position="top-right"
          />
        </Grid>
      </Grid>

      {/* Quick Access to Reports */}
      <Paper elevation={2} sx={{ p: 3, backgroundColor: '#f8f9ff', border: '1px solid #1976d2' }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
          📊 Class Scoring Reports & Administration
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
          Access comprehensive class scoring reports and ribbon assignments.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/class-reports')}
            sx={{ minWidth: 200 }}
          >
            View Class Reports
          </Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => navigate('/class-leaderboard')}
            sx={{ minWidth: 200 }}
          >
            View Class Leaderboard
          </Button>
        </Box>
      </Paper>

      <Alert severity="info" sx={{ mt: 3 }}>
        <strong>Type Class Scoring:</strong> Professional class competition with beauty, personality, and health criteria.
        Judges evaluate participants across multiple dimensions and assign ribbon placements.
        This interface requires judge authentication to access scoring forms.
      </Alert>
    </Box>
  );
}

export default ClassScoringPage;