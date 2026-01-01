import React, { useState, useEffect } from 'react';
import { FitShowScore } from '../types/scoring';
import { FitShowScoreCard } from './FitShowScoreCard';

interface ParticipantFitShowScoreViewProps {
  catId: string;
  participantName?: string;
}

export const ParticipantFitShowScoreView: React.FC<ParticipantFitShowScoreViewProps> = ({
  catId,
  participantName
}) => {
  const [scores, setScores] = useState<FitShowScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllScores, setShowAllScores] = useState(false);

  useEffect(() => {
    fetchFitShowScores();
  }, [catId]);

  const fetchFitShowScores = async () => {
    try {
      setLoading(true);
      setError(null);

      // This would be replaced with actual GraphQL query
      const response = await fetch(`/api/fit-show-scores/cat/${catId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch fit and show scores');
      }

      const data = await response.json();
      // Only show finalized scores to participants
      const finalizedScores = data.filter((score: FitShowScore) => score.isFinalized);
      setScores(finalizedScores);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getLatestScore = () => {
    if (scores.length === 0) return null;
    return scores.reduce((latest, current) => 
      new Date(current.updatedAt) > new Date(latest.updatedAt) ? current : latest
    );
  };

  const getAverageScore = () => {
    if (scores.length === 0) return 0;
    const total = scores.reduce((sum, score) => sum + score.totalScore, 0);
    return Math.round(total / scores.length);
  };

  const getBestScore = () => {
    if (scores.length === 0) return null;
    return scores.reduce((best, current) => 
      current.totalScore > best.totalScore ? current : best
    );
  };

  const getRanking = (score: FitShowScore) => {
    // This would be calculated based on all participants' scores
    // For now, return a placeholder
    const percentage = (score.totalScore / 100) * 100;
    if (percentage >= 95) return { rank: 1, total: 10, percentile: 'Top 10%' };
    if (percentage >= 90) return { rank: 2, total: 10, percentile: 'Top 20%' };
    if (percentage >= 85) return { rank: 3, total: 10, percentile: 'Top 30%' };
    if (percentage >= 80) return { rank: 4, total: 10, percentile: 'Top 40%' };
    return { rank: 5, total: 10, percentile: 'Top 50%' };
  };

  const getPerformanceInsights = (score: FitShowScore) => {
    const insights = [];
    const categories = [
      { name: 'Appearance & Demeanor', score: score.appearanceTotal, max: 20 },
      { name: 'Handling & Control', score: score.handlingTotal, max: 14 },
      { name: 'Demonstration Skills', score: score.demonstrationTotal, max: 16 },
      { name: 'Health Examination', score: score.healthExaminationTotal, max: 21 },
      { name: 'Grooming & Care', score: score.groomingCareTotal, max: 14 },
      { name: 'Knowledge', score: score.knowledgeTotal, max: 12 }
    ];

    const bestCategory = categories.reduce((best, current) => 
      (current.score / current.max) > (best.score / best.max) ? current : best
    );

    const weakestCategory = categories.reduce((weakest, current) => 
      (current.score / current.max) < (weakest.score / weakest.max) ? current : weakest
    );

    insights.push(`Strongest area: ${bestCategory.name} (${Math.round((bestCategory.score / bestCategory.max) * 100)}%)`);
    
    if ((weakestCategory.score / weakestCategory.max) < 0.8) {
      insights.push(`Area for improvement: ${weakestCategory.name} (${Math.round((weakestCategory.score / weakestCategory.max) * 100)}%)`);
    }

    return insights;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-2 text-gray-600">Loading your fit and show scores...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error Loading Scores</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              onClick={fetchFitShowScores}
              className="mt-2 text-sm text-red-800 underline hover:text-red-900"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (scores.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto h-12 w-12 text-gray-400">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No Fit and Show Scores Yet</h3>
        <p className="mt-1 text-sm text-gray-500">
          {participantName ? `${participantName}'s` : 'Your'} fit and show judging is either in progress or hasn't started yet.
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Scores will appear here once they have been finalized by the judges.
        </p>
      </div>
    );
  }

  const latestScore = getLatestScore();
  const bestScore = getBestScore();
  const averageScore = getAverageScore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">
          {participantName ? `${participantName}'s` : 'Your'} Fit and Show Results
        </h2>
        <p className="text-purple-100">
          Showmanship and knowledge evaluation results
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {latestScore?.totalScore || 0}/100
          </div>
          <div className="text-sm text-gray-600">Latest Score</div>
        </div>
        
        {scores.length > 1 && (
          <>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {bestScore?.totalScore || 0}/100
              </div>
              <div className="text-sm text-gray-600">Best Score</div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {averageScore}/100
              </div>
              <div className="text-sm text-gray-600">Average Score</div>
            </div>
          </>
        )}
      </div>

      {/* Latest Score Details */}
      {latestScore && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {scores.length > 1 ? 'Latest Evaluation' : 'Your Evaluation'}
            </h3>
            {scores.length > 1 && (
              <button
                onClick={() => setShowAllScores(!showAllScores)}
                className="text-purple-600 hover:text-purple-700 text-sm font-medium"
              >
                {showAllScores ? 'Show Latest Only' : `View All ${scores.length} Scores`}
              </button>
            )}
          </div>

          <FitShowScoreCard 
            score={latestScore} 
            showJudgeInfo={true}
            showParticipantInfo={false}
          />

          {/* Ranking Information */}
          {(() => {
            const ranking = getRanking(latestScore);
            return (
              <div className="mt-4 bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Performance Ranking</h4>
                <p className="text-blue-800">
                  Ranked #{ranking.rank} out of {ranking.total} participants ({ranking.percentile})
                </p>
              </div>
            );
          })()}

          {/* Performance Insights */}
          <div className="mt-4 bg-green-50 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 mb-2">Performance Insights</h4>
            <ul className="text-green-800 space-y-1">
              {getPerformanceInsights(latestScore).map((insight, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-green-600 mr-2">•</span>
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* All Scores */}
      {showAllScores && scores.length > 1 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">All Evaluations</h3>
          <div className="space-y-4">
            {scores
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .map((score, index) => (
                <FitShowScoreCard 
                  key={score.id} 
                  score={score} 
                  showJudgeInfo={true}
                  showParticipantInfo={false}
                  compact={index > 0}
                />
              ))}
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <h4 className="font-semibold text-gray-900 mb-2">About Fit and Show Scoring</h4>
        <p>
          Fit and show judging evaluates your presentation skills, cat handling abilities, and knowledge. 
          Scores are based on six categories: appearance & demeanor, handling & control, demonstration skills, 
          health examination, grooming & care, and knowledge. The maximum possible score is 100 points.
        </p>
      </div>
    </div>
  );
};