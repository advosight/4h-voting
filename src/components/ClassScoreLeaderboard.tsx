import React, { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/api';
import { ClassScore, Cat, RibbonType } from '../types/scoring';

const client = generateClient();

const listAllClassScores = `
  query ListAllClassScores {
    listAllClassScores {
      items {
        id
        catId
        judgeId
        judgeName
        totalScore
        ribbonEligibility
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

const onClassScoreUpdate = `
  subscription OnClassScoreUpdate {
    onClassScoreUpdate {
      id
      catId
      judgeId
      judgeName
      totalScore
      ribbonEligibility
      timestamp
      isFinalized
    }
  }
`;

interface ClassLeaderboardEntry {
  catId: string;
  cat?: Cat;
  highestScore: number;
  averageScore: number;
  scoreCount: number;
  lastUpdated: string;
  isFinalized: boolean;
  ribbonEligibility: RibbonType;
}

interface RibbonCategory {
  type: RibbonType;
  entries: ClassLeaderboardEntry[];
  color: string;
  icon: string;
}

interface ClassScoreLeaderboardProps {
  showOnlyFinalized?: boolean;
  maxEntriesPerRibbon?: number;
  refreshInterval?: number;
  groupByRibbon?: boolean;
}

function ClassScoreLeaderboard({ 
  showOnlyFinalized = false, 
  maxEntriesPerRibbon = 10,
  refreshInterval = 30000,
  groupByRibbon = true
}: ClassScoreLeaderboardProps): JSX.Element {
  const [leaderboard, setLeaderboard] = useState<ClassLeaderboardEntry[]>([]);
  const [ribbonCategories, setRibbonCategories] = useState<RibbonCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    fetchLeaderboardData();
    
    // Set up real-time subscription for class score updates
    console.log('Setting up class score leaderboard subscription...');
    const classScoreSubscription = client.graphql({
      query: onClassScoreUpdate
    }).subscribe({
      next: ({ data }) => {
        console.log('Class score leaderboard update received:', data);
        if (data?.onClassScoreUpdate) {
          updateLeaderboardWithNewScore(data.onClassScoreUpdate);
          setLastUpdate(new Date());
        }
      },
      error: (error) => {
        console.error('Class score leaderboard subscription error:', error);
      }
    });

    // Set up periodic refresh as backup
    const refreshInterval_id = setInterval(() => {
      console.log('Refreshing class score leaderboard data...');
      fetchLeaderboardData();
    }, refreshInterval);

    return () => {
      console.log('Cleaning up class score leaderboard subscription and refresh interval');
      classScoreSubscription.unsubscribe();
      clearInterval(refreshInterval_id);
    };
  }, [refreshInterval]);

  const fetchLeaderboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const result = await client.graphql({
        query: listAllClassScores
      });

      const classScores = result.data.listAllClassScores.items;
      const leaderboardData = await processClassScoresIntoLeaderboard(classScores);
      
      setLeaderboard(leaderboardData);
      
      if (groupByRibbon) {
        const ribbonData = groupEntriesByRibbon(leaderboardData);
        setRibbonCategories(ribbonData);
      }
      
      setLastUpdate(new Date());

    } catch (err) {
      console.error('Error fetching class score leaderboard data:', err);
      setError('Failed to load class score leaderboard. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const processClassScoresIntoLeaderboard = async (classScores: any[]): Promise<ClassLeaderboardEntry[]> => {
    // Filter scores based on finalized status if required
    const filteredScores = showOnlyFinalized 
      ? classScores.filter(score => score.isFinalized)
      : classScores;

    // Group scores by catId
    const scoresByCat = filteredScores.reduce((acc, score) => {
      if (!acc[score.catId]) {
        acc[score.catId] = [];
      }
      acc[score.catId].push(score);
      return acc;
    }, {} as Record<string, any[]>);

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
          isFinalized: catScores.some(score => score.isFinalized),
          ribbonEligibility: lastScore.ribbonEligibility as RibbonType
        };
      })
    );

    // Sort by ribbon eligibility first, then by highest score descending
    return entries.sort((a, b) => {
      const ribbonOrder = { 'Blue': 0, 'Red': 1, 'White': 2, 'Participation': 3 };
      const aOrder = ribbonOrder[a.ribbonEligibility] ?? 4;
      const bOrder = ribbonOrder[b.ribbonEligibility] ?? 4;
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      
      if (b.highestScore !== a.highestScore) {
        return b.highestScore - a.highestScore;
      }
      return b.averageScore - a.averageScore;
    });
  };

  const groupEntriesByRibbon = (entries: ClassLeaderboardEntry[]): RibbonCategory[] => {
    const ribbonConfig = {
      'Blue': { color: '#007bff', icon: '🥇' },
      'Red': { color: '#dc3545', icon: '🥈' },
      'White': { color: '#6c757d', icon: '🥉' },
      'Participation': { color: '#28a745', icon: '🎖️' }
    };

    const grouped = entries.reduce((acc, entry) => {
      if (!acc[entry.ribbonEligibility]) {
        acc[entry.ribbonEligibility] = [];
      }
      acc[entry.ribbonEligibility].push(entry);
      return acc;
    }, {} as Record<RibbonType, ClassLeaderboardEntry[]>);

    return Object.entries(grouped).map(([ribbonType, ribbonEntries]) => ({
      type: ribbonType as RibbonType,
      entries: ribbonEntries.slice(0, maxEntriesPerRibbon),
      color: ribbonConfig[ribbonType as RibbonType]?.color || '#6c757d',
      icon: ribbonConfig[ribbonType as RibbonType]?.icon || '🏆'
    }));
  };

  const updateLeaderboardWithNewScore = async (newScore: any) => {
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
          isFinalized: entry.isFinalized || newScore.isFinalized,
          ribbonEligibility: newScore.ribbonEligibility
        };
        
        // Re-sort the leaderboard
        const sorted = updated.sort((a, b) => {
          const ribbonOrder = { 'Blue': 0, 'Red': 1, 'White': 2, 'Participation': 3 };
          const aOrder = ribbonOrder[a.ribbonEligibility] ?? 4;
          const bOrder = ribbonOrder[b.ribbonEligibility] ?? 4;
          
          if (aOrder !== bOrder) {
            return aOrder - bOrder;
          }
          
          if (b.highestScore !== a.highestScore) {
            return b.highestScore - a.highestScore;
          }
          return b.averageScore - a.averageScore;
        });

        if (groupByRibbon) {
          const ribbonData = groupEntriesByRibbon(sorted);
          setRibbonCategories(ribbonData);
        }

        return sorted;
      } else {
        // Add new entry - we'll need to fetch cat data
        fetchCatDataForNewEntry(newScore);
        return prev;
      }
    });
  };

  const fetchCatDataForNewEntry = async (score: any) => {
    try {
      const catResult = await client.graphql({
        query: getCatById,
        variables: { id: score.catId }
      });
      
      const newEntry: ClassLeaderboardEntry = {
        catId: score.catId,
        cat: catResult.data.getCat,
        highestScore: score.totalScore,
        averageScore: score.totalScore,
        scoreCount: 1,
        lastUpdated: score.timestamp,
        isFinalized: score.isFinalized,
        ribbonEligibility: score.ribbonEligibility
      };
      
      setLeaderboard(prev => {
        const updated = [...prev, newEntry];
        const sorted = updated.sort((a, b) => {
          const ribbonOrder = { 'Blue': 0, 'Red': 1, 'White': 2, 'Participation': 3 };
          const aOrder = ribbonOrder[a.ribbonEligibility] ?? 4;
          const bOrder = ribbonOrder[b.ribbonEligibility] ?? 4;
          
          if (aOrder !== bOrder) {
            return aOrder - bOrder;
          }
          
          if (b.highestScore !== a.highestScore) {
            return b.highestScore - a.highestScore;
          }
          return b.averageScore - a.averageScore;
        });

        if (groupByRibbon) {
          const ribbonData = groupEntriesByRibbon(sorted);
          setRibbonCategories(ribbonData);
        }

        return sorted;
      });
    } catch (err) {
      console.error('Error fetching cat data for new class score leaderboard entry:', err);
    }
  };

  const getRibbonIcon = (ribbonType: RibbonType) => {
    switch (ribbonType) {
      case 'Blue': return '🥇';
      case 'Red': return '🥈';
      case 'White': return '🥉';
      case 'Participation': return '🎖️';
      default: return '🏆';
    }
  };

  const getRibbonColor = (ribbonType: RibbonType) => {
    switch (ribbonType) {
      case 'Blue': return '#007bff';
      case 'Red': return '#dc3545';
      case 'White': return '#6c757d';
      case 'Participation': return '#28a745';
      default: return '#6c757d';
    }
  };

  if (loading) {
    return (
      <div className="cat-card" style={{ backgroundColor: '#e3f2fd', borderColor: '#2196f3' }}>
        <h3 style={{ color: '#1976d2' }}>🏆 Loading Class Score Leaderboard...</h3>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '2rem' }}>🐱</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cat-card" style={{ backgroundColor: '#e3f2fd', borderColor: '#2196f3' }}>
        <h3 style={{ color: '#1976d2' }}>❌ Error Loading Class Score Leaderboard</h3>
        <p style={{ color: 'red' }}>{error}</p>
        <button className="btn btn-primary" onClick={fetchLeaderboardData}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="cat-card" style={{ backgroundColor: '#e3f2fd', borderColor: '#2196f3' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ color: '#1976d2' }}>🏆 Class Score Leaderboard</h3>
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
          ✅ Showing finalized class scores only
        </div>
      )}

      {leaderboard.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🏆</div>
          <p>No class scores available yet.</p>
        </div>
      ) : groupByRibbon ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {ribbonCategories.map((category) => (
            <div key={category.type}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '10px',
                padding: '8px 12px',
                backgroundColor: category.color,
                color: 'white',
                borderRadius: '6px',
                fontWeight: 'bold'
              }}>
                <span style={{ marginRight: '8px', fontSize: '1.2em' }}>
                  {category.icon}
                </span>
                {category.type} Ribbon ({category.entries.length})
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {category.entries.map((entry, index) => (
                  <div
                    key={entry.catId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px',
                      backgroundColor: 'white',
                      border: `2px solid ${category.color}`,
                      borderRadius: '6px',
                      marginLeft: '20px'
                    }}
                  >
                    {/* Rank within ribbon */}
                    <div style={{ 
                      fontSize: '1em', 
                      fontWeight: 'bold', 
                      minWidth: '30px',
                      textAlign: 'center',
                      color: category.color
                    }}>
                      {index + 1}.
                    </div>

                    {/* Cat Info */}
                    <div style={{ flex: 1, marginLeft: '15px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '1em' }}>
                        {entry.cat?.name || 'Unknown Cat'}
                      </div>
                      <div style={{ fontSize: '0.8em', color: '#666' }}>
                        {entry.cat?.owner || 'Unknown Owner'} • Cage {entry.cat?.cageNumber || 'N/A'}
                      </div>
                    </div>

                    {/* Scores */}
                    <div style={{ textAlign: 'right', marginRight: '15px' }}>
                      <div style={{ 
                        fontSize: '1.2em', 
                        fontWeight: 'bold',
                        color: category.color
                      }}>
                        {entry.highestScore}/50
                      </div>
                      <div style={{ fontSize: '0.7em', color: '#666' }}>
                        Avg: {entry.averageScore} ({entry.scoreCount} score{entry.scoreCount !== 1 ? 's' : ''})
                      </div>
                    </div>

                    {/* Status */}
                    <div style={{ minWidth: '50px', textAlign: 'center' }}>
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
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {leaderboard.slice(0, maxEntriesPerRibbon).map((entry, index) => (
            <div
              key={entry.catId}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                backgroundColor: index < 3 ? '#f8f9fa' : 'white',
                border: `2px solid ${getRibbonColor(entry.ribbonEligibility)}`,
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
                {index + 1}.
              </div>

              {/* Ribbon */}
              <div style={{ 
                fontSize: '1.2em', 
                minWidth: '40px',
                textAlign: 'center'
              }}>
                {getRibbonIcon(entry.ribbonEligibility)}
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
                  color: getRibbonColor(entry.ribbonEligibility)
                }}>
                  {entry.highestScore}/50
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
        {groupByRibbon ? 
          `Showing entries grouped by ribbon eligibility` : 
          `Showing top ${Math.min(leaderboard.length, maxEntriesPerRibbon)} entries`
        }
      </div>
    </div>
  );
}

export default ClassScoreLeaderboard;