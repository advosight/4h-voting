import React, { useState, useEffect, useMemo } from 'react';
import { generateClient } from 'aws-amplify/api';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  ButtonGroup,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { FitShowScore } from '../types/scoring';

const client = generateClient();

const LIST_FIT_SHOW_SCORES = `
  query ListFitShowScores($limit: Int, $nextToken: String) {
    listFitShowScores(limit: $limit, nextToken: $nextToken) {
      items {
        id
        catId
        participantName
        judgeId
        judgeName
        totalScore
        appearanceTotal
        handlingTotal
        demonstrationTotal
        healthExaminationTotal
        groomingCareTotal
        knowledgeTotal
        createdAt
        isFinalized
      }
      nextToken
    }
  }
`;

const onFitShowScoreCreated = `
  subscription OnFitShowScoreCreated {
    onFitShowScoreCreated {
      id
    }
  }
`;

const onFitShowScoreUpdated = `
  subscription OnFitShowScoreUpdated {
    onFitShowScoreUpdated {
      id
    }
  }
`;

interface FitShowScoreLeaderboardProps {
  className?: string;
  showTop?: number;
  finalizedOnly?: boolean;
  refreshInterval?: number;
}

interface LeaderboardEntry {
  participantName: string;
  bestScore: number;
  scoreCount: number;
  latestScore: FitShowScore;
  rank: number;
}

const getRankDisplay = (rank: number) => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
};

const getScoreColor = (score: number) => {
  if (score >= 90) return '#2e7d32';
  if (score >= 80) return '#0288d1';
  if (score >= 70) return '#f9a825';
  if (score >= 60) return '#ef6c00';
  return '#c62828';
};

const getCategoryBreakdown = (score: FitShowScore) => [
  { name: 'Appearance', score: score.appearanceTotal, max: 20 },
  { name: 'Handling', score: score.handlingTotal, max: 14 },
  { name: 'Demonstration', score: score.demonstrationTotal, max: 16 },
  { name: 'Health Exam', score: score.healthExaminationTotal, max: 21 },
  { name: 'Grooming', score: score.groomingCareTotal, max: 14 },
  { name: 'Knowledge', score: score.knowledgeTotal, max: 12 },
];

export const FitShowScoreLeaderboard: React.FC<FitShowScoreLeaderboardProps> = ({
  showTop = 10,
  finalizedOnly = true,
  refreshInterval = 30000,
}) => {
  const [scores, setScores] = useState<FitShowScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'best' | 'latest'>('best');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    loadScores();

    const createdSub = client.graphql({ query: onFitShowScoreCreated }).subscribe({
      next: () => loadScores(),
      error: (err) => console.error('Fit and show score created subscription error:', err),
    });
    const updatedSub = client.graphql({ query: onFitShowScoreUpdated }).subscribe({
      next: () => loadScores(),
      error: (err) => console.error('Fit and show score updated subscription error:', err),
    });

    const intervalId = setInterval(() => loadScores(), refreshInterval);

    return () => {
      createdSub.unsubscribe();
      updatedSub.unsubscribe();
      clearInterval(intervalId);
    };
  }, [refreshInterval]);

  const loadScores = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await client.graphql({
        query: LIST_FIT_SHOW_SCORES,
        variables: { limit: 1000 }
      }) as any;
      const allScores: FitShowScore[] = result.data.listFitShowScores.items || [];

      const filteredScores = finalizedOnly
        ? allScores.filter((score) => score.isFinalized)
        : allScores;

      setScores(filteredScores);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error loading fit and show scores:', err);
      setError('Failed to load fit and show scores');
    } finally {
      setLoading(false);
    }
  };

  const leaderboardEntries = useMemo(() => {
    const participantScores = scores.reduce((acc, score) => {
      const participant = score.participantName;
      if (!acc[participant]) {
        acc[participant] = [];
      }
      acc[participant].push(score);
      return acc;
    }, {} as Record<string, FitShowScore[]>);

    const entries: LeaderboardEntry[] = Object.entries(participantScores).map(([participantName, participantScoreList]) => {
      const sortedScores = [...participantScoreList].sort((a, b) => {
        if (b.totalScore !== a.totalScore) {
          return b.totalScore - a.totalScore;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      const bestScore = sortedScores[0];
      const latestScore = [...participantScoreList].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];

      return {
        participantName,
        bestScore: bestScore.totalScore,
        scoreCount: participantScoreList.length,
        latestScore: viewMode === 'latest' ? latestScore : bestScore,
        rank: 0
      };
    });

    entries.sort((a, b) => {
      const scoreA = viewMode === 'latest' ? a.latestScore.totalScore : a.bestScore;
      const scoreB = viewMode === 'latest' ? b.latestScore.totalScore : b.bestScore;

      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
      return new Date(b.latestScore.createdAt).getTime() - new Date(a.latestScore.createdAt).getTime();
    });

    let currentRank = 1;
    entries.forEach((entry, index) => {
      if (index > 0) {
        const prevScore = viewMode === 'latest'
          ? entries[index - 1].latestScore.totalScore
          : entries[index - 1].bestScore;
        const currentScore = viewMode === 'latest'
          ? entry.latestScore.totalScore
          : entry.bestScore;

        if (currentScore < prevScore) {
          currentRank = index + 1;
        }
      }
      entry.rank = currentRank;
    });

    return entries.slice(0, showTop);
  }, [scores, viewMode, showTop]);

  const totalParticipants = useMemo(() => {
    return new Set(scores.map((score) => score.participantName)).size;
  }, [scores]);

  if (loading && scores.length === 0) {
    return (
      <Card elevation={2}>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <TrophyIcon sx={{ fontSize: '2.5rem', color: '#f9a825', mb: 1 }} />
          <Typography color="text.secondary">Loading fit and show leaderboard...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card elevation={2} sx={{ border: '1px solid', borderColor: 'error.main' }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="error" gutterBottom>{error}</Typography>
          <Button variant="outlined" color="error" onClick={loadScores} startIcon={<RefreshIcon />}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevation={2}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1, color: '#f9a825' }}>
            <TrophyIcon sx={{ fontSize: '2rem' }} />
            Fit and Show Scoring Leaderboard
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ButtonGroup size="small" variant="outlined">
              <Button
                variant={viewMode === 'best' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('best')}
              >
                Best Scores
              </Button>
              <Button
                variant={viewMode === 'latest' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('latest')}
              >
                Latest Scores
              </Button>
            </ButtonGroup>
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={loadScores} aria-label="Refresh">
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Showing top {Math.min(showTop, leaderboardEntries.length)} participants
            {finalizedOnly && ' (finalized scores only)'} &middot;{' '}
            {viewMode === 'best'
              ? "Ranked by each participant's highest score"
              : "Ranked by each participant's most recent score"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </Typography>
        </Box>

        {leaderboardEntries.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <TrophyIcon sx={{ fontSize: '3rem', color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">No fit and show scores available for leaderboard.</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {leaderboardEntries.map((entry) => {
              const scoreColor = getScoreColor(entry.latestScore.totalScore);
              return (
                <Box
                  key={entry.participantName}
                  sx={{
                    p: 2,
                    border: '2px solid',
                    borderColor: entry.rank <= 3 ? scoreColor : 'divider',
                    borderRadius: 2,
                    backgroundColor: entry.rank <= 3 ? `${scoreColor}0d` : 'background.paper',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                    <Typography sx={{ fontSize: '1.5rem', fontWeight: 'bold', minWidth: 48, textAlign: 'center' }}>
                      {getRankDisplay(entry.rank)}
                    </Typography>

                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {entry.participantName}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', mt: 0.5 }}>
                        {viewMode === 'best' && entry.scoreCount > 1 && (
                          <Typography variant="caption" color="text.secondary">
                            Best of {entry.scoreCount} scores
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          Judge: {entry.latestScore.judgeName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(entry.latestScore.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Box>

                    <Chip
                      label={`${entry.latestScore.totalScore}/100`}
                      sx={{
                        backgroundColor: scoreColor,
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        px: 1,
                      }}
                    />
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 1.5 }}>
                    {getCategoryBreakdown(entry.latestScore).map((category) => (
                      <Box key={category.name}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">{category.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {category.score}/{category.max}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(100, (category.score / category.max) * 100)}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: 'action.hover',
                            '& .MuiLinearProgress-bar': { backgroundColor: scoreColor, borderRadius: 3 },
                          }}
                        />
                      </Box>
                    ))}
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 3 }}>
          Total participants with scores: {totalParticipants}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default FitShowScoreLeaderboard;
