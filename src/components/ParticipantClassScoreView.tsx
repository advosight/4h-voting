import React, { useState, useEffect } from 'react';
import { ClassScore, Cat, RibbonType } from '../types/scoring';

interface ParticipantClassScoreViewProps {
  catId: string;
  classScores: ClassScore[];
  cat: Cat | null;
  allClassScores?: ClassScore[]; // For ranking calculation
  loading?: boolean;
  error?: string;
}

interface ClassScoreRanking {
  rank: number;
  totalEntries: number;
  percentile: number;
}

const RIBBON_COLORS = {
  'Blue': '#1976d2',
  'Red': '#d32f2f',
  'White': '#757575',
  'Participation': '#ff9800'
};

const HEALTH_GROOMING_LABELS = {
  coatCleanGroomed: 'Coat is clean & well groomed',
  teethGumsHealthy: 'Teeth/gums clean & healthy',
  eyesNoseClear: 'Eyes & nose clear',
  earsCleanMiteFree: 'Ears clean & free of mites',
  toenailsClipped: 'Toenails/claws clipped',
  fleaIssues: 'Flea or flea dirt issues detected'
};

const ParticipantClassScoreView: React.FC<ParticipantClassScoreViewProps> = ({
  catId,
  classScores,
  cat,
  allClassScores = [],
  loading = false,
  error
}) => {
  const [ranking, setRanking] = useState<ClassScoreRanking | null>(null);

  // Calculate ranking among all class entries
  useEffect(() => {
    if (allClassScores.length > 0 && classScores.length > 0) {
      const finalizedScores = allClassScores.filter(score => score.isFinalized);
      const catFinalizedScores = classScores.filter(score => score.isFinalized);
      
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
  }, [allClassScores, classScores]);

  if (loading) {
    return (
      <div className="participant-class-score-view loading">
        <div className="loading-spinner">Loading class scores...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="participant-class-score-view error">
        <div className="error-message">
          <h3>Error Loading Class Scores</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const finalizedScores = classScores.filter(score => score.isFinalized);
  const pendingScores = classScores.filter(score => !score.isFinalized);

  if (classScores.length === 0 && cat) {
    return (
      <div className="participant-class-score-view no-scores">
        <div className="cat-header class-scoring">
          <h2>{cat.name}</h2>
          <p>Owner: {cat.owner}</p>
          <p>Cage: {cat.cageNumber}</p>
          <div className="scoring-type-badge">Type Class Scoring</div>
        </div>
        <div className="no-scores-message">
          <h3>No Class Scores Available</h3>
          <p>This cat has not been judged for class competition yet. Please check back later.</p>
        </div>
      </div>
    );
  }

  if (!cat && !loading && !error) {
    return (
      <div className="participant-class-score-view no-scores">
        <div className="no-scores-message">
          <h3>No Cat Data</h3>
          <p>Unable to load cat information.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="participant-class-score-view">
      {cat && (
        <div className="cat-header class-scoring">
          <h2>{cat.name}</h2>
          <p>Owner: {cat.owner}</p>
          <p>Cage: {cat.cageNumber}</p>
          <div className="scoring-type-badge">Type Class Scoring</div>
        </div>
      )}

      {finalizedScores.length > 0 && (
        <div className="finalized-scores-section">
          <h3>Final Class Scores</h3>
          
          {ranking && (
            <div className="ranking-display class-scoring">
              <div className="rank-badge">
                <span className="rank-number">#{ranking.rank}</span>
                <span className="rank-details">
                  out of {ranking.totalEntries} class entries ({ranking.percentile}th percentile)
                </span>
              </div>
            </div>
          )}

          {finalizedScores.map((score, index) => (
            <ClassScoreCard key={score.id} score={score} index={index} />
          ))}
        </div>
      )}

      {pendingScores.length > 0 && (
        <div className="pending-scores-section">
          <h3>Preliminary Class Scores</h3>
          <p className="pending-notice">
            These class scores are not yet finalized and may change.
          </p>
          
          {pendingScores.map((score, index) => (
            <ClassScoreCard key={score.id} score={score} index={index} isPending={true} />
          ))}
        </div>
      )}

      {finalizedScores.length === 0 && pendingScores.length > 0 && (
        <div className="judging-in-progress">
          <h3>Class Judging in Progress</h3>
          <p>Your cat is currently being judged for class competition. Final scores will be available once judging is complete.</p>
        </div>
      )}
    </div>
  );
};

interface ClassScoreCardProps {
  score: ClassScore;
  index: number;
  isPending?: boolean;
}

const ClassScoreCard: React.FC<ClassScoreCardProps> = ({ score, index, isPending = false }) => {
  const ribbonColor = RIBBON_COLORS[score.ribbonEligibility as RibbonType] || '#757575';

  return (
    <div className={`class-score-card ${isPending ? 'pending' : 'finalized'}`}>
      <div className="score-header">
        <h4>
          Judge: {score.judgeName}
          {isPending && <span className="pending-badge">Preliminary</span>}
        </h4>
        <div className="total-score-and-ribbon">
          <div className="total-score">
            <span className="score-value">{score.totalScore}</span>
            <span className="score-max">/ 50</span>
          </div>
          <div 
            className="ribbon-eligibility"
            style={{ backgroundColor: ribbonColor }}
          >
            {score.ribbonEligibility} Ribbon
          </div>
        </div>
      </div>

      <div className="class-category-scores">
        <div className="category-score">
          <div className="category-header">
            <span className="category-name">Cat's Beauty</span>
            <span className="category-score-value">
              {score.beautyScore} / 15
            </span>
          </div>
          <div className="category-description">Overall beauty and appearance</div>
          {score.beautyComments && (
            <div className="judge-comments">
              <strong>Judge Comments:</strong>
              <p>{score.beautyComments}</p>
            </div>
          )}
        </div>

        <div className="category-score">
          <div className="category-header">
            <span className="category-name">Cat's Personality</span>
            <span className="category-score-value">
              {score.personalityScore} / 20
            </span>
          </div>
          <div className="category-description">Temperament, behavior, and personality</div>
          {score.personalityComments && (
            <div className="judge-comments">
              <strong>Judge Comments:</strong>
              <p>{score.personalityComments}</p>
            </div>
          )}
        </div>

        <div className="category-score">
          <div className="category-header">
            <span className="category-name">Balance/Proportion</span>
            <span className="category-score-value">
              {score.balanceProportionScore} / 15
            </span>
          </div>
          <div className="category-description">Physical balance and body proportion</div>
          {score.balanceProportionComments && (
            <div className="judge-comments">
              <strong>Judge Comments:</strong>
              <p>{score.balanceProportionComments}</p>
            </div>
          )}
        </div>
      </div>

      <div className="health-grooming-section">
        <h5>Health & Grooming Evaluation</h5>
        <div className="health-checklist">
          {Object.entries(HEALTH_GROOMING_LABELS).map(([key, label]) => {
            const value = score[key as keyof ClassScore] as boolean;
            const isFleasIssue = key === 'fleaIssues';
            const passed = isFleasIssue ? !value : value; // Flea issues are bad, others are good
            
            return (
              <div key={key} className={`health-item ${passed ? 'passed' : 'failed'}`}>
                <span className={`status-icon ${passed ? 'pass' : 'fail'}`}>
                  {passed ? '✓' : '✗'}
                </span>
                <span className="health-label">{label}</span>
              </div>
            );
          })}
        </div>
        
        {score.healthGroomingComments && (
          <div className="health-comments">
            <strong>Health & Grooming Comments:</strong>
            <p>{score.healthGroomingComments}</p>
          </div>
        )}
      </div>

      <div className="score-timestamp">
        Scored on: {new Date(score.timestamp).toLocaleString()}
      </div>
    </div>
  );
};

export default ParticipantClassScoreView;