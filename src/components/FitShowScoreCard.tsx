import React from 'react';
import { FitShowScore } from '../types/scoring';

interface FitShowScoreCardProps {
  score: FitShowScore;
  showJudgeInfo?: boolean;
  showParticipantInfo?: boolean;
  compact?: boolean;
}

export const FitShowScoreCard: React.FC<FitShowScoreCardProps> = ({
  score,
  showJudgeInfo = true,
  showParticipantInfo = true,
  compact = false
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryPercentage = (score: number, maxScore: number) => {
    return Math.round((score / maxScore) * 100);
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
        <div className="flex justify-between items-start">
          <div>
            {showParticipantInfo && (
              <h3 className="font-semibold text-lg text-gray-900">
                {score.participantName}
              </h3>
            )}
            {showJudgeInfo && (
              <p className="text-sm text-gray-600">Judge: {score.judgeName}</p>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-purple-600">
              {score.totalScore}/100
            </div>
            <div className="text-sm text-gray-500">
              {getCategoryPercentage(score.totalScore, 100)}%
            </div>
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          {formatDate(score.updatedAt)}
          {score.isFinalized && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
              Finalized
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          {showParticipantInfo && (
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              {score.participantName}
            </h2>
          )}
          {showJudgeInfo && (
            <p className="text-gray-600">Judged by: {score.judgeName}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            {formatDate(score.updatedAt)}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-purple-600 mb-1">
            {score.totalScore}/100
          </div>
          <div className="text-lg text-gray-600">
            {getCategoryPercentage(score.totalScore, 100)}%
          </div>
          {score.isFinalized && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 mt-2">
              Finalized
            </span>
          )}
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Appearance & Demeanor */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Appearance & Demeanor</h3>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Score:</span>
            <span className={`font-semibold ${getScoreColor(getCategoryPercentage(score.appearanceTotal, 20))}`}>
              {score.appearanceTotal}/20 ({getCategoryPercentage(score.appearanceTotal, 20)}%)
            </span>
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            <div>Attire: {score.attire}/10</div>
            <div>Attentive: {score.attentive}/5</div>
            <div>Courteous: {score.courteous}/5</div>
          </div>
          {score.appearanceComments && (
            <div className="mt-2 text-sm text-gray-700 italic">
              "{score.appearanceComments}"
            </div>
          )}
        </div>

        {/* Handling & Control */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Handling & Control</h3>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Score:</span>
            <span className={`font-semibold ${getScoreColor(getCategoryPercentage(score.handlingTotal, 14))}`}>
              {score.handlingTotal}/14 ({getCategoryPercentage(score.handlingTotal, 14)}%)
            </span>
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            <div>Control & Equipment: {score.controlEquipment}/10</div>
            <div>Pickup & Carrying: {score.pickupCarrying}/4</div>
          </div>
          {score.handlingComments && (
            <div className="mt-2 text-sm text-gray-700 italic">
              "{score.handlingComments}"
            </div>
          )}
        </div>

        {/* Demonstration Skills */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Demonstration Skills</h3>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Score:</span>
            <span className={`font-semibold ${getScoreColor(getCategoryPercentage(score.demonstrationTotal, 16))}`}>
              {score.demonstrationTotal}/16 ({getCategoryPercentage(score.demonstrationTotal, 16)}%)
            </span>
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            <div>Head Shape: {score.showingHeadShape}/4</div>
            <div>Body Type: {score.showingBodyType}/4</div>
            <div>Tail: {score.showingTail}/4</div>
            <div>Coat Texture: {score.showingCoatTexture}/4</div>
          </div>
          {score.demonstrationComments && (
            <div className="mt-2 text-sm text-gray-700 italic">
              "{score.demonstrationComments}"
            </div>
          )}
        </div>

        {/* Health Examination */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Health Examination</h3>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Score:</span>
            <span className={`font-semibold ${getScoreColor(getCategoryPercentage(score.healthExaminationTotal, 21))}`}>
              {score.healthExaminationTotal}/21 ({getCategoryPercentage(score.healthExaminationTotal, 21)}%)
            </span>
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            <div>Mouth/Teeth/Gums: {score.showingMouthTeethGums + score.conditionMouthTeethGums}/5</div>
            <div>Nose & Eyes: {score.showingNose + score.showingEyes + score.conditionNoseEyes}/6</div>
            <div>Ears: {score.showingEars + score.earsClean}/4</div>
            <div>Toenails/Claws: {score.showingToenailsClaws + score.toenailsClipped}/9</div>
          </div>
          {score.healthExaminationComments && (
            <div className="mt-2 text-sm text-gray-700 italic">
              "{score.healthExaminationComments}"
            </div>
          )}
        </div>

        {/* Grooming & Care */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Grooming & Care</h3>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Score:</span>
            <span className={`font-semibold ${getScoreColor(getCategoryPercentage(score.groomingCareTotal, 14))}`}>
              {score.groomingCareTotal}/14 ({getCategoryPercentage(score.groomingCareTotal, 14)}%)
            </span>
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            <div>Belly/Coat/Cleanliness: {score.showingBellyCoatCleanliness}/3</div>
            <div>Coat Clean & Groomed: {score.coatCleanWellGroomed}/8</div>
            <div>Cat Health/Care: {score.catHealthCare}/3</div>
          </div>
          {score.groomingCareComments && (
            <div className="mt-2 text-sm text-gray-700 italic">
              "{score.groomingCareComments}"
            </div>
          )}
        </div>

        {/* Knowledge */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Knowledge</h3>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Score:</span>
            <span className={`font-semibold ${getScoreColor(getCategoryPercentage(score.knowledgeTotal, 12))}`}>
              {score.knowledgeTotal}/12 ({getCategoryPercentage(score.knowledgeTotal, 12)}%)
            </span>
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            <div>General Knowledge: {score.generalKnowledge}/3</div>
            <div>Cat Breeds & Showing: {score.catBreedsShowing}/3</div>
            <div>Cat Anatomy: {score.catAnatomy}/3</div>
            <div>4-H Knowledge: {score.fourHKnowledge}/3</div>
          </div>
          {score.knowledgeComments && (
            <div className="mt-2 text-sm text-gray-700 italic">
              "{score.knowledgeComments}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};