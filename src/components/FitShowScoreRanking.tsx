import React, { useState, useEffect } from 'react';
import { FitShowScore } from '../types/scoring';

interface FitShowScoreRankingProps {
  scores: FitShowScore[];
  highlightParticipant?: string;
  showTop?: number;
  showCategoryBreakdown?: boolean;
}

interface RankedScore extends FitShowScore {
  rank: number;
  percentile: number;
}

export const FitShowScoreRanking: React.FC<FitShowScoreRankingProps> = ({
  scores,
  highlightParticipant,
  showTop = 10,
  showCategoryBreakdown = false
}) => {
  const [rankedScores, setRankedScores] = useState<RankedScore[]>([]);
  const [sortBy, setSortBy] = useState<'total' | 'appearance' | 'handling' | 'demonstration' | 'health' | 'grooming' | 'knowledge'>('total');

  useEffect(() => {
    calculateRankings();
  }, [scores, sortBy]);

  const calculateRankings = () => {
    // Only include finalized scores
    const finalizedScores = scores.filter(score => score.isFinalized);
    
    // Sort by selected category
    const sortedScores = [...finalizedScores].sort((a, b) => {
      switch (sortBy) {
        case 'appearance':
          return b.appearanceTotal - a.appearanceTotal;
        case 'handling':
          return b.handlingTotal - a.handlingTotal;
        case 'demonstration':
          return b.demonstrationTotal - a.demonstrationTotal;
        case 'health':
          return b.healthExaminationTotal - a.healthExaminationTotal;
        case 'grooming':
          return b.groomingCareTotal - a.groomingCareTotal;
        case 'knowledge':
          return b.knowledgeTotal - a.knowledgeTotal;
        default:
          return b.totalScore - a.totalScore;
      }
    });

    // Add ranking and percentile information
    const ranked = sortedScores.map((score, index) => ({
      ...score,
      rank: index + 1,
      percentile: Math.round(((sortedScores.length - index) / sortedScores.length) * 100)
    }));

    setRankedScores(ranked);
  };

  const getCategoryScore = (score: FitShowScore, category: string) => {
    switch (category) {
      case 'appearance':
        return { score: score.appearanceTotal, max: 20 };
      case 'handling':
        return { score: score.handlingTotal, max: 14 };
      case 'demonstration':
        return { score: score.demonstrationTotal, max: 16 };
      case 'health':
        return { score: score.healthExaminationTotal, max: 21 };
      case 'grooming':
        return { score: score.groomingCareTotal, max: 14 };
      case 'knowledge':
        return { score: score.knowledgeTotal, max: 12 };
      default:
        return { score: score.totalScore, max: 100 };
    }
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (rank === 2) return 'bg-gray-100 text-gray-800 border-gray-200';
    if (rank === 3) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (rank <= 5) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-gray-50 text-gray-600 border-gray-200';
  };

  const getPercentileColor = (percentile: number) => {
    if (percentile >= 95) return 'text-green-600';
    if (percentile >= 90) return 'text-blue-600';
    if (percentile >= 80) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const displayedScores = showTop ? rankedScores.slice(0, showTop) : rankedScores;

  if (rankedScores.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto h-12 w-12 text-gray-400">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No Rankings Available</h3>
        <p className="mt-1 text-sm text-gray-500">
          Rankings will appear once fit and show scores are finalized.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sort Controls */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm font-medium text-gray-700 self-center">Sort by:</span>
        {[
          { key: 'total', label: 'Total Score' },
          { key: 'appearance', label: 'Appearance' },
          { key: 'handling', label: 'Handling' },
          { key: 'demonstration', label: 'Demonstration' },
          { key: 'health', label: 'Health Exam' },
          { key: 'grooming', label: 'Grooming' },
          { key: 'knowledge', label: 'Knowledge' }
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSortBy(key as any)}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              sortBy === key
                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Rankings List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Fit and Show Rankings
            {showTop && rankedScores.length > showTop && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                (Top {showTop} of {rankedScores.length})
              </span>
            )}
          </h3>
        </div>

        <div className="divide-y divide-gray-200">
          {displayedScores.map((score) => {
            const categoryData = getCategoryScore(score, sortBy);
            const isHighlighted = highlightParticipant && score.participantName === highlightParticipant;
            
            return (
              <div
                key={score.id}
                className={`px-4 py-4 hover:bg-gray-50 transition-colors ${
                  isHighlighted ? 'bg-purple-50 border-l-4 border-purple-500' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {/* Rank Badge */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center text-sm font-bold ${getRankBadgeColor(score.rank)}`}>
                      {score.rank}
                    </div>
                    
                    {/* Participant Info */}
                    <div>
                      <h4 className={`font-medium ${isHighlighted ? 'text-purple-900' : 'text-gray-900'}`}>
                        {score.participantName}
                      </h4>
                      <p className="text-sm text-gray-500">
                        Judge: {score.judgeName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {/* Score */}
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        {categoryData.score}/{categoryData.max}
                      </div>
                      <div className={`text-sm ${getPercentileColor(score.percentile)}`}>
                        {Math.round((categoryData.score / categoryData.max) * 100)}%
                      </div>
                    </div>

                    {/* Percentile */}
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Percentile</div>
                      <div className={`text-sm font-medium ${getPercentileColor(score.percentile)}`}>
                        {score.percentile}th
                      </div>
                    </div>
                  </div>
                </div>

                {/* Category Breakdown */}
                {showCategoryBreakdown && (
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
                    {[
                      { label: 'Appearance', score: score.appearanceTotal, max: 20 },
                      { label: 'Handling', score: score.handlingTotal, max: 14 },
                      { label: 'Demo', score: score.demonstrationTotal, max: 16 },
                      { label: 'Health', score: score.healthExaminationTotal, max: 21 },
                      { label: 'Grooming', score: score.groomingCareTotal, max: 14 },
                      { label: 'Knowledge', score: score.knowledgeTotal, max: 12 }
                    ].map(({ label, score: catScore, max }) => (
                      <div key={label} className="text-center">
                        <div className="text-gray-500">{label}</div>
                        <div className="font-medium">
                          {catScore}/{max}
                        </div>
                        <div className="text-gray-400">
                          {Math.round((catScore / max) * 100)}%
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Show More Button */}
        {showTop && rankedScores.length > showTop && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-center">
            <button
              onClick={() => {/* This would expand to show all scores */}}
              className="text-purple-600 hover:text-purple-700 text-sm font-medium"
            >
              Show All {rankedScores.length} Participants
            </button>
          </div>
        )}
      </div>

      {/* Statistics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">
            {rankedScores.length}
          </div>
          <div className="text-sm text-gray-600">Total Participants</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {rankedScores.length > 0 ? Math.round(rankedScores.reduce((sum, s) => sum + s.totalScore, 0) / rankedScores.length) : 0}
          </div>
          <div className="text-sm text-gray-600">Average Score</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {rankedScores.length > 0 ? Math.max(...rankedScores.map(s => s.totalScore)) : 0}
          </div>
          <div className="text-sm text-gray-600">Highest Score</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {rankedScores.length > 0 ? Math.min(...rankedScores.map(s => s.totalScore)) : 0}
          </div>
          <div className="text-sm text-gray-600">Lowest Score</div>
        </div>
      </div>
    </div>
  );
};