import React, { useState, useEffect, useMemo } from 'react';
import { generateClient } from 'aws-amplify/api';
import { FitShowScore } from '../types/scoring';

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

interface FitShowScoreLeaderboardProps {
  className?: string;
  showTop?: number;
  finalizedOnly?: boolean;
}

interface LeaderboardEntry {
  participantName: string;
  bestScore: number;
  scoreCount: number;
  latestScore: FitShowScore;
  rank: number;
}

export const FitShowScoreLeaderboard: React.FC<FitShowScoreLeaderboardProps> = ({ 
  className = '',
  showTop = 10,
  finalizedOnly = true
}) => {
  const [scores, setScores] = useState<FitShowScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'best' | 'latest'>('best');

  useEffect(() => {
    loadScores();
  }, []);

  const loadScores = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const client = generateClient();
      const result = await client.graphql({
        query: LIST_FIT_SHOW_SCORES,
        variables: { limit: 1000 }
      }) as any;
      const allScores = result.data.listFitShowScores.items || [];
      
      // Filter by finalized status if required
      const filteredScores = finalizedOnly 
        ? allScores.filter((score: FitShowScore) => score.isFinalized)
        : allScores;
      
      setScores(filteredScores);
    } catch (err) {
      console.error('Error loading fit and show scores:', err);
      setError('Failed to load fit and show scores');
    } finally {
      setLoading(false);
    }
  };

  const leaderboardEntries = useMemo(() => {
    // Group scores by participant
    const participantScores = scores.reduce((acc, score) => {
      const participant = score.participantName;
      if (!acc[participant]) {
        acc[participant] = [];
      }
      acc[participant].push(score);
      return acc;
    }, {} as Record<string, FitShowScore[]>);

    // Create leaderboard entries
    const entries: LeaderboardEntry[] = Object.entries(participantScores).map(([participantName, participantScoreList]) => {
      // Sort scores by total score (descending) and then by date (most recent first)
      const sortedScores = participantScoreList.sort((a, b) => {
        if (b.totalScore !== a.totalScore) {
          return b.totalScore - a.totalScore;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      const bestScore = sortedScores[0];
      const latestScore = participantScoreList.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];

      return {
        participantName,
        bestScore: bestScore.totalScore,
        scoreCount: participantScoreList.length,
        latestScore: viewMode === 'latest' ? latestScore : bestScore,
        rank: 0 // Will be set after sorting
      };
    });

    // Sort entries by the score we're displaying
    entries.sort((a, b) => {
      const scoreA = viewMode === 'latest' ? a.latestScore.totalScore : a.bestScore;
      const scoreB = viewMode === 'latest' ? b.latestScore.totalScore : b.bestScore;
      
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
      
      // If scores are tied, sort by most recent date
      return new Date(b.latestScore.createdAt).getTime() - new Date(a.latestScore.createdAt).getTime();
    });

    // Assign ranks (handle ties)
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

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getCategoryBreakdown = (score: FitShowScore) => {
    return [
      { name: 'Appearance', score: score.appearanceTotal, max: 20 },
      { name: 'Handling', score: score.handlingTotal, max: 14 },
      { name: 'Demonstration', score: score.demonstrationTotal, max: 16 },
      { name: 'Health Exam', score: score.healthExaminationTotal, max: 21 },
      { name: 'Grooming', score: score.groomingCareTotal, max: 14 },
      { name: 'Knowledge', score: score.knowledgeTotal, max: 12 }
    ];
  };

  if (loading) {
    return (
      <div className={`fit-show-score-leaderboard ${className}`}>
        <div className="loading">Loading fit and show leaderboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`fit-show-score-leaderboard ${className}`}>
        <div className="error">
          <p>{error}</p>
          <button onClick={loadScores}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`fit-show-score-leaderboard ${className}`}>
      <div className="leaderboard-header">
        <h2>Fit and Show Scoring Leaderboard</h2>
        <div className="header-controls">
          <div className="view-mode-toggle">
            <button 
              className={viewMode === 'best' ? 'active' : ''}
              onClick={() => setViewMode('best')}
            >
              Best Scores
            </button>
            <button 
              className={viewMode === 'latest' ? 'active' : ''}
              onClick={() => setViewMode('latest')}
            >
              Latest Scores
            </button>
          </div>
          <button onClick={loadScores} className="refresh-btn">
            Refresh
          </button>
        </div>
      </div>

      <div className="leaderboard-info">
        <p>
          Showing top {Math.min(showTop, leaderboardEntries.length)} participants
          {finalizedOnly && ' (finalized scores only)'}
        </p>
        <p className="view-mode-description">
          {viewMode === 'best' 
            ? 'Ranked by each participant\'s highest score'
            : 'Ranked by each participant\'s most recent score'
          }
        </p>
      </div>

      {leaderboardEntries.length === 0 ? (
        <div className="no-scores">
          <p>No fit and show scores available for leaderboard.</p>
        </div>
      ) : (
        <div className="leaderboard-list">
          {leaderboardEntries.map((entry, index) => (
            <div key={entry.participantName} className={`leaderboard-entry rank-${entry.rank}`}>
              <div className="entry-header">
                <div className="rank-display">
                  {getRankDisplay(entry.rank)}
                </div>
                <div className="participant-info">
                  <h3 className="participant-name">{entry.participantName}</h3>
                  <div className="score-info">
                    <span className="total-score">
                      {entry.latestScore.totalScore}/100 points
                    </span>
                    <span className="score-metadata">
                      {viewMode === 'best' && entry.scoreCount > 1 && (
                        <span className="score-count">Best of {entry.scoreCount} scores</span>
                      )}
                      <span className="judge-name">Judge: {entry.latestScore.judgeName}</span>
                      <span className="score-date">
                        {new Date(entry.latestScore.createdAt).toLocaleDateString()}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="category-breakdown">
                <div className="breakdown-grid">
                  {getCategoryBreakdown(entry.latestScore).map((category) => (
                    <div key={category.name} className="category-score">
                      <span className="category-name">{category.name}</span>
                      <span className="category-points">
                        {category.score}/{category.max}
                      </span>
                      <div className="category-bar">
                        <div 
                          className="category-fill"
                          style={{ width: `${(category.score / category.max) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="leaderboard-footer">
        <p>
          Total participants with scores: {Object.keys(
            scores.reduce((acc, score) => {
              acc[score.participantName] = true;
              return acc;
            }, {} as Record<string, boolean>)
          ).length}
        </p>
      </div>
    </div>
  );
};

export default FitShowScoreLeaderboard;