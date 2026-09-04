import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
} from '@mui/icons-material';
import { generateClient } from 'aws-amplify/api';
import ClassScoreLeaderboard from '../components/ClassScoreLeaderboard';
import ClassScoreNotifications from '../components/ClassScoreNotifications';
import { CAT_AGE_GROUPS, getCatAgeGroupLabel } from '../utils/ageGroups';
import { BREED_CATEGORIES, getBreedCategoryLabel } from '../utils/breedCategories';

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
        breedCategory
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
  const location = useLocation();
  const [cats, setCats] = useState<any[]>([]);
  const [classScores, setClassScores] = useState<any[]>([]);
  const [filteredCats, setFilteredCats] = useState<any[]>([]);
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('all');
  const [selectedBreedCategory, setSelectedBreedCategory] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(false);
  const [catsLoading, setCatsLoading] = useState<boolean>(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    fetchCats();
    // Fetch class scores but don't block the UI if it fails
    fetchClassScores().catch(console.error);

    // Refresh scores when page becomes visible (e.g., after returning from submission)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Page is now visible, refreshing class scores');
        fetchClassScores().catch(console.error);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    filterCats();
  }, [cats, selectedAgeGroup, selectedBreedCategory]);

  // Refresh scores when returning to this page (e.g., after submitting a score)
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear message after 5 seconds
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      // Refresh class scores when returning from submission
      fetchClassScores().catch(console.error);
      return () => clearTimeout(timer);
    }
  }, [location]);

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
    console.log('Filtering cats. Total cats:', cats.length, 'Selected age group:', selectedAgeGroup, 'Selected breed category:', selectedBreedCategory);
    const filtered = cats.filter(cat =>
      (selectedAgeGroup === 'all' || cat.catAgeGroup === selectedAgeGroup) &&
      (selectedBreedCategory === 'all' || cat.breedCategory === selectedBreedCategory)
    );
    console.log('Filtered cats:', filtered.length);
    setFilteredCats(filtered);
  };

  const getCatClassScore = (catId: string) => {
    return classScores.find(score => score.catId === catId);
  };

  const handleAgeGroupChange = (event: any) => {
    setSelectedAgeGroup(event.target.value);
  };

  const handleBreedCategoryChange = (event: any) => {
    setSelectedBreedCategory(event.target.value);
  };

  const hasActiveFilter = selectedAgeGroup !== 'all' || selectedBreedCategory !== 'all';

  const clearFilters = () => {
    setSelectedAgeGroup('all');
    setSelectedBreedCategory('all');
  };

  const unscoredCats = filteredCats.filter(cat => !getCatClassScore(cat.id));
  const scoredCats = filteredCats.filter(cat => getCatClassScore(cat.id));

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

      {/* Success Message */}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: '10px' }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {/* Filter Cats */}
      <Paper elevation={1} sx={{ p: 3, mb: 3, backgroundColor: '#f8f9ff', border: '1px solid #1976d2' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: '#1976d2' }}>
            Filter Cats
          </Typography>
          <Button
            size="small"
            variant="outlined"
            color="primary"
            onClick={() => {
              setCatsLoading(true);
              Promise.all([fetchCats(), fetchClassScores()]).catch(console.error);
            }}
            disabled={catsLoading || loading}
            sx={{ textTransform: 'none' }}
          >
            🔄 Refresh
          </Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="class-age-group-filter-label">Cat Age Group</InputLabel>
            <Select
              labelId="class-age-group-filter-label"
              value={selectedAgeGroup}
              label="Cat Age Group"
              onChange={handleAgeGroupChange}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#1976d2' },
                  '&:hover fieldset': { borderColor: '#1565c0' },
                  '&.Mui-focused fieldset': { borderColor: '#1565c0' }
                }
              }}
            >
              <MenuItem value="all">All Age Groups</MenuItem>
              {CAT_AGE_GROUPS.map((group) => (
                <MenuItem key={group.value} value={group.value}>
                  {group.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="class-breed-category-filter-label">Breed Category</InputLabel>
            <Select
              labelId="class-breed-category-filter-label"
              value={selectedBreedCategory}
              label="Breed Category"
              onChange={handleBreedCategoryChange}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#1976d2' },
                  '&:hover fieldset': { borderColor: '#1565c0' },
                  '&.Mui-focused fieldset': { borderColor: '#1565c0' }
                }
              }}
            >
              <MenuItem value="all">All Breed Categories</MenuItem>
              {BREED_CATEGORIES.map((category) => (
                <MenuItem key={category.value} value={category.value}>
                  {category.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Chip
            label={`${filteredCats.length} cat${filteredCats.length !== 1 ? 's' : ''} shown`}
            sx={{ backgroundColor: '#1976d2', color: 'white' }}
          />

          {hasActiveFilter && (
            <Button
              variant="outlined"
              size="small"
              onClick={clearFilters}
              sx={{
                borderColor: '#1976d2',
                color: '#1976d2',
                '&:hover': { borderColor: '#1565c0', backgroundColor: '#f8f9ff' }
              }}
            >
              Clear Filters
            </Button>
          )}
        </Box>
      </Paper>

      {/* Unscored Participants Grid */}
      {unscoredCats.length > 0 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="h6" sx={{ color: '#ff9800' }}>
              📝 Unscored Participants ({unscoredCats.length})
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Click a cat to begin class scoring
            </Typography>
          </Box>
          <Grid container spacing={2} sx={{ mb: 4 }} data-testid="class-scoring-unscored-cards">
            {unscoredCats.map((cat) => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={`class-${cat.id}`}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    border: '2px solid #ff9800',
                    backgroundColor: '#fffbf0',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 4,
                  borderColor: '#ff9800',
                  backgroundColor: '#fffbf0'
                }
              }}
              onClick={() => navigate(`/class-score/${cat.id}`)}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
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
                    sx={{ backgroundColor: '#ff9800', color: 'white' }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* Scored Participants Grid */}
      {scoredCats.length > 0 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="h6" sx={{ color: '#4caf50' }}>
              ✓ Scored Participants ({scoredCats.length})
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Click a cat to view or update their score
            </Typography>
          </Box>
          <Grid container spacing={2} sx={{ mb: 4 }} data-testid="class-scoring-scored-cards">
            {scoredCats.map((cat) => {
              const classScore = getCatClassScore(cat.id);
              return (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={`class-scored-${cat.id}`}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      border: '2px solid #4caf50',
                      backgroundColor: '#f0f7f0',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 4,
                        borderColor: '#388e3c',
                        backgroundColor: '#e8f5e9'
                      }
                    }}
                    onClick={() => navigate(`/class-score/${cat.id}`)}
                  >
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                        {cat.name}
                      </Typography>
                      <Typography variant="body2" color="text.primary">
                        Cage {cat.cageNumber}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Owner: {cat.owner}
                      </Typography>
                      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                        {classScore && (
                          <>
                            <Chip
                              label={`Score: ${classScore.totalScore}`}
                              size="small"
                              sx={{ backgroundColor: '#4caf50', color: 'white', fontWeight: 'bold' }}
                            />
                            <Chip
                              label={classScore.ribbonEligibility}
                              size="small"
                              color={
                                classScore.ribbonEligibility === 'Blue' ? 'primary' :
                                classScore.ribbonEligibility === 'Red' ? 'error' :
                                classScore.ribbonEligibility === 'White' ? 'default' : 'secondary'
                              }
                              variant="outlined"
                            />
                          </>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </>
      )}

      {filteredCats.length === 0 && !catsLoading && (
        <Box sx={{ textAlign: 'center', py: 4, mb: 4 }}>
          <Typography variant="body2" color="text.secondary">
            {cats.length === 0
              ? "No cats registered yet. Please add cats to the system first."
              : "No cats found for the selected age group and breed category."
            }
          </Typography>
        </Box>
      )}

      {/* Real-time Leaderboard & Scores */}
      <Typography variant="h6" gutterBottom sx={{ color: '#1976d2', display: 'flex', alignItems: 'center', gap: 1 }}>
        <ClassScoringIcon />
        Real-time Leaderboard & Scores
      </Typography>

      <Paper elevation={1} sx={{ maxWidth: '95vw', p: 3, mb: 3, backgroundColor: '#f8f9ff', border: '1px solid #e3f2fd' }}>
        <Typography variant="subtitle1" gutterBottom sx={{ color: '#1976d2', fontWeight: 'bold' }}>
          Registered Cats & Scores
        </Typography>

        {loading || catsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredCats.length > 0 ? (
          <TableContainer>
            <Table size={isMobile ? "small" : "medium"} sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                  <TableCell><strong>Cage #</strong></TableCell>
                  <TableCell><strong>Cat Name</strong></TableCell>
                  <TableCell><strong>Owner</strong></TableCell>
                  <TableCell><strong>Age Group</strong></TableCell>
                  <TableCell><strong>Breed Category</strong></TableCell>
                  <TableCell align="center"><strong>Beauty</strong></TableCell>
                  <TableCell align="center"><strong>Personality</strong></TableCell>
                  <TableCell align="center"><strong>Health</strong></TableCell>
                  <TableCell align="center"><strong>Total</strong></TableCell>
                  <TableCell align="center"><strong>Ribbon</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {/* Unscored participants first */}
                {unscoredCats.map((cat) => {
                  const classScore = getCatClassScore(cat.id);
                  return (
                    <TableRow
                      key={cat.id}
                      sx={{
                        '&:hover': { backgroundColor: '#fff3e0' },
                        cursor: 'pointer',
                        backgroundColor: '#fffbf0'
                      }}
                      onClick={() => navigate(`/class-score/${cat.id}`)}
                    >
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="contained"
                          color="warning"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/class-score/${cat.id}`);
                          }}
                          sx={{ minWidth: 'auto', px: 2 }}
                        >
                          Score Now
                        </Button>
                      </TableCell>
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
                      <TableCell>
                        {cat.breedCategory ? (
                          <Chip
                            label={getBreedCategoryLabel(cat.breedCategory)}
                            size="small"
                            color="secondary"
                            variant="outlined"
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip label="Pending" size="small" color="warning" />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Scored participants second */}
                {scoredCats.map((cat) => {
                  const classScore = getCatClassScore(cat.id);
                  return (
                    <TableRow
                      key={`scored-${cat.id}`}
                      sx={{
                        '&:hover': { backgroundColor: '#e8f5e9' },
                        cursor: 'pointer'
                      }}
                      onClick={() => navigate(`/class-score/${cat.id}`)}
                    >
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="outlined"
                          color="success"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/class-score/${cat.id}`);
                          }}
                          sx={{ minWidth: 'auto', px: 2 }}
                        >
                          View
                        </Button>
                      </TableCell>
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
                      <TableCell>
                        {cat.breedCategory ? (
                          <Chip
                            label={getBreedCategoryLabel(cat.breedCategory)}
                            size="small"
                            color="secondary"
                            variant="outlined"
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {classScore ? (
                          <Chip
                            label={classScore.beautyScore}
                            size="small"
                            color={classScore.beautyScore >= 12 ? "success" : classScore.beautyScore >= 8 ? "warning" : "default"}
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
                            color={classScore.personalityScore >= 16 ? "success" : classScore.personalityScore >= 12 ? "warning" : "default"}
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {classScore ? (
                          <Chip
                            label={isHealthyClassScore(classScore) ? 'Healthy' : 'Issues'}
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
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              {cats.length === 0
                ? "No cats registered yet. Please add cats to the system first."
                : "No cats found for the selected age group and breed category."
              }
            </Typography>
          </Box>
        )}
      </Paper>

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
