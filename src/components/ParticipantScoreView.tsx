import React, { useState, useEffect } from 'react';
import { Score } from '../types/scoring';
import { SCORING_CATEGORIES, SCORING_CATEGORY_LABELS, MAX_TOTAL_SCORE } from '../utils/scoringConstants';

interface Cat {
  id: string;
  name: string;
  owner: string;
  cageNumber?: number;
}

interface ParticipantScoreViewProps {
  catId: string;
  scores: Score[];
  cat: Cat | null;
  allScores?: Score[]; // For ranking calculation
  loading?: boolean;
  error?: string;
}

interface ScoreRanking {
  rank: number;
  totalEntries: number;
  percentile: number;
}

const ParticipantScoreView: React.FC<ParticipantScoreViewProps> = ({
  catId,
  scores,
  cat,
  allScores = [],
  loading = false,
  error
}) => {
  const [ranking, setRanking] = useState<ScoreRanking | null>(null);

  // Calculate ranking among all entries
  useEffect(() => {
    if (allScores.length > 0 && scores.length > 0) {
      const finalizedScores = allScores.filter(score => score.isFinalized);
      const catFinalizedScores = scores.filter(score => score.isFinalized);
      
      if (catFinalizedScores.length > 0 && finalizedScores.length > 0) {
        // Use the highest score if multiple judges scored this cat
        const bestScore = Math.max(...catFinalizedScores.map(s => s.totalScore));
        
        // Get unique cats with their best scores
        const catScoreMap = new Map<string, number>();
        finalizedScores.forEach(score => {
          const currentBest = catScoreMap.get(score.catId) || 0;
          if (score.totalScore > currentBest) {
            catScoreMap.set(score.catId, score.totalScore);
          }
        });
        
        const sortedScores = Array.from(catScoreMap.values()).sort((a, b) => b - a);
        const rank = sortedScores.findIndex(score => score <= bestScore) + 1;
        const percentile = Math.round(((sortedScores.length - rank + 1) / sortedScores.length) * 100);
        
        setRanking({
          rank,
          totalEntries: sortedScores.length,
          percentile
        });
      }
    }
  }, [allScores, scores]);

  if (loading) {
    return (
      <div className="participant-score-view loading">
        <div className="loading-spinner">Loading scores...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="participant-score-view error">
        <div className="error-message">
          <h3>Error Loading Scores</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const finalizedScores = scores.filter(score => score.isFinalized);
  const pendingScores = scores.filter(score => !score.isFinalized);

  if (scores.length === 0 && cat) {
    return (
      <div className="participant-score-view no-scores">
        <div className="cat-header">
          <h2>{cat.name}</h2>
          <p>Owner: {cat.owner}</p>
          {cat.cageNumber && <p>Cage: {cat.cageNumber}</p>}
        </div>
        <div className="no-scores-message">
          <h3>No Scores Available</h3>
          <p>This cat has not been judged yet. Please check back later.</p>
        </div>
      </div>
    );
  }

  if (!cat && !loading && !error) {
    return (
      <div className="participant-score-view no-scores">
        <div className="no-scores-message">
          <h3>No Cat Data</h3>
          <p>Unable to load cat information.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="participant-score-view">
      {cat && (
        <div className="cat-header">
          <h2>{cat.name}</h2>
          <p>Owner: {cat.owner}</p>
          {cat.cageNumber && <p>Cage: {cat.cageNumber}</p>}
        </div>
      )}

      {finalizedScores.length > 0 && (
        <div className="finalized-scores-section">
          <h3>Final Scores</h3>
          
          {ranking && (
            <div className="ranking-display">
              <div className="rank-badge">
                <span className="rank-number">#{ranking.rank}</span>
                <span className="rank-details">
                  out of {ranking.totalEntries} entries ({ranking.percentile}th percentile)
                </span>
              </div>
            </div>
          )}

          {finalizedScores.map((score, index) => (
            <ScoreCard key={score.id} score={score} index={index} />
          ))}
        </div>
      )}

      {pendingScores.length > 0 && (
        <div className="pending-scores-section">
          <h3>Preliminary Scores</h3>
          <p className="pending-notice">
            These scores are not yet finalized and may change.
          </p>
          
          {pendingScores.map((score, index) => (
            <ScoreCard key={score.id} score={score} index={index} isPending={true} />
          ))}
        </div>
      )}

      {finalizedScores.length === 0 && pendingScores.length > 0 && (
        <div className="judging-in-progress">
          <h3>Judging in Progress</h3>
          <p>Your cat is currently being judged. Final scores will be available once judging is complete.</p>
        </div>
      )}
    </div>
  );
};

interface ScoreCardProps {
  score: Score;
  index: number;
  isPending?: boolean;
}

const ScoreCard: React.FC<ScoreCardProps> = ({ score, index, isPending = false }) => {
  return (
    <div className={`score-card ${isPending ? 'pending' : 'finalized'}`}>
      <div className="score-header">
        <h4>
          Judge: {score.judgeName}
          {isPending && <span className="pending-badge">Preliminary</span>}
        </h4>
        <div className="total-score">
          <span className="score-value">{score.totalScore}</span>
          <span className="score-max">/ {MAX_TOTAL_SCORE}</span>
        </div>
      </div>

      <div className="category-scores">
        {Object.entries(SCORING_CATEGORIES).map(([key, category]) => {
          const scoreValue = score[category.field];
          const comments = score[category.commentField];
          
          return (
            <div key={key} className="category-score">
              <div className="category-header">
                <span className="category-name">{SCORING_CATEGORY_LABELS[key as keyof typeof SCORING_CATEGORY_LABELS]}</span>
                <span className="category-score-value">
                  {scoreValue} / {category.maxPoints}
                </span>
              </div>
              <div className="category-description">{category.description}</div>
              {comments && (
                <div className="judge-comments">
                  <strong>Judge Comments:</strong>
                  <p>{comments}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="score-timestamp">
        Scored on: {new Date(score.timestamp).toLocaleString()}
      </div>
    </div>
  );
};

export default ParticipantScoreView;