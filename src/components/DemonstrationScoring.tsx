import React from 'react';

interface DemonstrationScoringProps {
  showingHeadShape: number;
  showingBodyType: number;
  showingTail: number;
  showingCoatTexture: number;
  comments: string;
  total: number;
  onScoreChange: (field: string, value: number | string) => void;
}

export const DemonstrationScoring: React.FC<DemonstrationScoringProps> = ({
  showingHeadShape,
  showingBodyType,
  showingTail,
  showingCoatTexture,
  comments,
  total,
  onScoreChange
}) => {
  return (
    <div className="scoring-section demonstration-scoring">
      <div className="section-header">
        <h3>Demonstration Skills</h3>
        <div className="section-total">
          <strong>{total}/16 points</strong>
        </div>
      </div>

      <div className="scoring-fields">
        <div className="score-field">
          <label htmlFor="showingHeadShape">
            Showing head shape (1-4 pts)
          </label>
          <div className="score-input-container">
            <input
              type="number"
              id="showingHeadShape"
              min="1"
              max="4"
              value={showingHeadShape}
              onChange={(e) => onScoreChange('showingHeadShape', parseInt(e.target.value) || 1)}
              className="score-input"
            />
            <div className="score-bar">
              <div 
                className="score-fill" 
                style={{ width: `${(showingHeadShape / 4) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="score-range">1-4 points</div>
        </div>

        <div className="score-field">
          <label htmlFor="showingBodyType">
            Showing body type (1-4 pts)
          </label>
          <div className="score-input-container">
            <input
              type="number"
              id="showingBodyType"
              min="1"
              max="4"
              value={showingBodyType}
              onChange={(e) => onScoreChange('showingBodyType', parseInt(e.target.value) || 1)}
              className="score-input"
            />
            <div className="score-bar">
              <div 
                className="score-fill" 
                style={{ width: `${(showingBodyType / 4) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="score-range">1-4 points</div>
        </div>

        <div className="score-field">
          <label htmlFor="showingTail">
            Showing tail (1-4 pts)
          </label>
          <div className="score-input-container">
            <input
              type="number"
              id="showingTail"
              min="1"
              max="4"
              value={showingTail}
              onChange={(e) => onScoreChange('showingTail', parseInt(e.target.value) || 1)}
              className="score-input"
            />
            <div className="score-bar">
              <div 
                className="score-fill" 
                style={{ width: `${(showingTail / 4) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="score-range">1-4 points</div>
        </div>

        <div className="score-field">
          <label htmlFor="showingCoatTexture">
            Showing coat texture (1-4 pts)
          </label>
          <div className="score-input-container">
            <input
              type="number"
              id="showingCoatTexture"
              min="1"
              max="4"
              value={showingCoatTexture}
              onChange={(e) => onScoreChange('showingCoatTexture', parseInt(e.target.value) || 1)}
              className="score-input"
            />
            <div className="score-bar">
              <div 
                className="score-fill" 
                style={{ width: `${(showingCoatTexture / 4) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="score-range">1-4 points</div>
        </div>
      </div>

      <div className="comments-section">
        <label htmlFor="demonstrationComments">
          Comments (optional, max 500 characters)
        </label>
        <textarea
          id="demonstrationComments"
          value={comments}
          onChange={(e) => onScoreChange('demonstrationComments', e.target.value)}
          maxLength={500}
          rows={3}
          className="comments-textarea"
          placeholder="Add comments about the participant's demonstration skills..."
        />
        <div className="character-count">
          {comments.length}/500 characters
        </div>
      </div>
    </div>
  );
};