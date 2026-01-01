import React, { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/api';
import { Score } from '../types/scoring';

const client = generateClient();

const listAllScores = `
  query ListAllScores {
    listAllScores {
      items {
        id
        catId
        judgeId
        judgeName
        totalScore
        timestamp
        isFinalized
      }
    }
  }
`;

const getCatById = `
  query GetCat($id: ID!) {
    getCat(id: $id) {
      id
      name
      owner
      cageNumber
    }
  }
`;

const onScoreUpdate = `
  subscription OnScoreUpdate {
    onScoreUpdate {
      id
      catId
      judgeId
      judgeName
      totalScore
      timestamp
      isFinalized
    }
  }
`;

interface Cat {
  id: string;
  name: string;
  owner: string;
  cageNumber: number;
}

interface LeaderboardEntry {
  catId: string;
  cat?: Cat;
  highestScore: number;
  averageScore: number;
  scoreCount: number;
  lastUpdated: string;
  isFinalized: boolean;
}

interface ScoreLeaderboardProps {
  showOnlyFinalized?: boolean;
  maxEntries?: number;
  refreshInterval?: number;
}

function ScoreLeaderboard({ 
  showOnlyFinalized = false, 
  maxEntries = 10,
  refreshInterval = 30000 
}: ScoreLeaderboardProps): JSX.Element {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    fetchLeaderboardData();
    
    // Set up real-time subscription for score updates
    console.log('Setting up leaderboard score subscription...');
    const scoreSubscription = client.graphql({
      query: onScoreUpdate
    }).subscribe({
      next: ({ data }) => {
        console.log('Leaderboard score update received:', data);
        if (data?.onScoreUpdate) {
          updateLeaderboardWithNewScore(data.onScoreUpdate);
          setLastUpdate(new Date());
        }
      },
      error: (error) => {
        console.error('Leaderboard score subscription error:', error);
      }
    });

    // Set up periodic refresh as backup
    const refreshInterval_id = setInterval(() => {
      console.log('Refreshing leaderboard data...');
      fetchLeaderboardData();
    }, refreshInterval);

    return () => {
      console.log('Cleaning up leaderboard subscription and refresh interval');
      scoreSubscription.unsubscribe();
      clearInterval(refreshInterval_id);
    };
  }, [refreshInterval]);

  const fetchLeaderboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const result = await client.graphql({
        query: listAllScores
      });

      const scores = result.data.listAllScores.items;
      const leaderboardData = await processScoresIntoLeaderboard(scores);
      
      setLeaderboard(leaderboardData);
      setLastUpdate(new Date());

    } catch (err) {
      console.error('Error fetching leaderboard data:', err);
      setError('Failed to load leaderboard. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const processScoresIntoLeaderboard = async (scores: Score[]): Promise<LeaderboardEntry[]> => {
    // Filter scores based on finalized status if required
    const filteredScores = showOnlyFinalized 
      ? scores.filter(score => score.isFinalized)
      : scores;

    // Group scores by catId
    const scoresByCat = filteredScores.reduce((acc, score) => {
      if (!acc[score.catId]) {
        acc[score.catId] = [];
      }
      acc[score.catId].push(score);
      return acc;
    }, {} as Record<string, Score[]>);

    // Calculate leaderboard entries
    const entries = await Promise.all(
      Object.entries(scoresByCat).map(async ([catId, catScores]) => {
        const scores = catScores.map(s => s.totalScore);
        const highestScore = Math.max(...scores);
        const averageScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
        const lastScore = catScores.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
        
        // Fetch cat data
        let cat: Cat | undefined;
        try {
          const catResult = await client.graphql({
            query: getCatById,
            variables: { id: catId }
          });
          cat = catResult.data.getCat;
        } catch (err) {
          console.error(`Error fetching cat data for ${catId}:`, err);
        }

        return {
          catId,
          cat,
          highestScore,
          averageScore,
          scoreCount: catScores.length,
          lastUpdated: lastScore.timestamp,
          isFinalized: catScores.some(score => score.isFinalized)
        };
      })
    );

    // Sort by highest score descending, then by average score
    return entries
      .sort((a, b) => {
        if (b.highestScore !== a.highestScore) {
          return b.highestScore - a.highestScore;
        }
        return b.averageScore - a.averageScore;
      })
      .slice(0, maxEntries);
  };

  const updateLeaderboardWithNewScore = async (newScore: Score) => {
    // If we're filtering for finalized only and this score isn't finalized, ignore it
    if (showOnlyFinalized && !newScore.isFinalized) {
      return;
    }

    setLeaderboard(prev => {
      const existingEntryIndex = prev.findIndex(entry => entry.catId === newScore.catId);
      
      if (existingEntryIndex >= 0) {
        // Update existing entry
        const updated = [...prev];
        const entry = updated[existingEntryIndex];
        
        // We need to recalculate properly, but for real-time updates we'll approximate
        const newHighest = Math.max(entry.highestScore, newScore.totalScore);
        const newAverage = Math.round(
          (entry.averageScore * entry.scoreCount + newScore.totalScore) / (entry.scoreCount + 1)
        );
        
        updated[existingEntryIndex] = {
          ...entry,
          highestScore: newHighest,
          averageScore: newAverage,
          scoreCount: entry.scoreCount + 1,
          lastUpdated: newScore.timestamp,
          isFinalized: entry.isFinalized || newScore.isFinalized
        };
        
        // Re-sort the leaderboard
        return updated.sort((a, b) => {
          if (b.highestScore !== a.highestScore) {
            return b.highestScore - a.highestScore;
          }
          return b.averageScore - a.averageScore;
        });
      } else {
        // Add new entry - we'll need to fetch cat data
        fetchCatDataForNewEntry(newScore);
        return prev;
      }
    });
  };

  const fetchCatDataForNewEntry = async (score: Score) => {
    try {
      const catResult = await client.graphql({
        query: getCatById,
        variables: { id: score.catId }
      });
      
      const newEntry: LeaderboardEntry = {
        catId: score.catId,
        cat: catResult.data.getCat,
        highestScore: score.totalScore,
        averageScore: score.totalScore,
        scoreCount: 1,
        lastUpdated: score.timestamp,
        isFinalized: score.isFinalized
      };
      
      setLeaderboard(prev => {
        const updated = [...prev, newEntry];
        return updated
          .sort((a, b) => {
            if (b.highestScore !== a.highestScore) {
              return b.highestScore - a.highestScore;
            }
            return b.averageScore - a.averageScore;
          })
          .slice(0, maxEntries);
      });
    } catch (err) {
      console.error('Error fetching cat data for new leaderboard entry:', err);
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `${index + 1}.`;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#28a745'; // Green
    if (score >= 80) return '#17a2b8'; // Blue
    if (score >= 70) return '#ffc107'; // Yellow
    if (score >= 60) return '#fd7e14'; // Orange
    return '#dc3545'; // Red
  };

  if (loading) {
    return (
      <div className="cat-card">
        <h3>🏆 Loading Leaderboard...</h3>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '2rem' }}>🐱</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cat-card">
        <h3>❌ Error Loading Leaderboard</h3>
        <p style={{ color: 'red' }}>{error}</p>
        <button className="btn btn-primary" onClick={fetchLeaderboardData}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="cat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3>🏆 Score Leaderboard</h3>
        <div style={{ fontSize: '0.8em', color: '#666' }}>
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      </div>

      {showOnlyFinalized && (
        <div style={{ 
          backgroundColor: '#d4edda', 
          color: '#155724', 
          padding: '8px 12px', 
          borderRadius: '4px', 
          marginBottom: '15px',
          fontSize: '0.9em'
        }}>
          ✅ Showing finalized scores only
        </div>
      )}

      {leaderboard.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🏆</div>
          <p>No scores available yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {leaderboard.map((entry, index) => (
            <div
              key={entry.catId}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                backgroundColor: index < 3 ? '#f8f9fa' : 'white',
                border: `2px solid ${index < 3 ? '#dee2e6' : '#e9ecef'}`,
                borderRadius: '8px',
                transition: 'all 0.3s ease'
              }}
            >
              {/* Rank */}
              <div style={{ 
                fontSize: '1.2em', 
                fontWeight: 'bold', 
                minWidth: '40px',
                textAlign: 'center'
              }}>
                {getRankIcon(index)}
              </div>

              {/* Cat Info */}
              <div style={{ flex: 1, marginLeft: '15px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                  {entry.cat?.name || 'Unknown Cat'}
                </div>
                <div style={{ fontSize: '0.9em', color: '#666' }}>
                  {entry.cat?.owner || 'Unknown Owner'} • Cage {entry.cat?.cageNumber || 'N/A'}
                </div>
              </div>

              {/* Scores */}
              <div style={{ textAlign: 'right', marginRight: '15px' }}>
                <div style={{ 
                  fontSize: '1.3em', 
                  fontWeight: 'bold',
                  color: getScoreColor(entry.highestScore)
                }}>
                  {entry.highestScore}/100
                </div>
                <div style={{ fontSize: '0.8em', color: '#666' }}>
                  Avg: {entry.averageScore} ({entry.scoreCount} score{entry.scoreCount !== 1 ? 's' : ''})
                </div>
              </div>

              {/* Status */}
              <div style={{ minWidth: '60px', textAlign: 'center' }}>
                {entry.isFinalized ? (
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: '10px',
                    fontSize: '0.7em',
                    backgroundColor: '#d4edda',
                    color: '#155724'
                  }}>
                    ✅ Final
                  </span>
                ) : (
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: '10px',
                    fontSize: '0.7em',
                    backgroundColor: '#fff3cd',
                    color: '#856404'
                  }}>
                    📝 Draft
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ 
        textAlign: 'center', 
        marginTop: '15px', 
        fontSize: '0.8em', 
        color: '#666' 
      }}>
        {leaderboard.length < maxEntries ? 
          `Showing all ${leaderboard.length} entries` : 
          `Showing top ${maxEntries} entries`
        }
      </div>
    </div>
  );
}

export default ScoreLeaderboard;