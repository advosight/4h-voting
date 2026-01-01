import React from 'react';

interface AppearanceScoringProps {
  attire: number;
  attentive: number;
  courteous: number;
  comments: string;
  total: number;
  onScoreChange: (field: string, value: number | string) => void;
}

export const AppearanceScoring: React.FC<AppearanceScoringProps> = ({
  attire,
  attentive,
  courteous,
  comments,
  total,
  onScoreChange
}) => {
  return (
    <div className="scoring-section appearance-scoring">
      <div className="section-header">
        <h3>Appearance & Demeanor</h3>
        <div className="section-total">
          <strong>{total}/20 points</strong>
        </div>
      </div>

      <div className="scoring-fields">
        <div className="score-field">
          <label htmlFor="attire">
            Neat, clean, appropriate attire (1-10 pts)
          </label>
          <div className="score-input-container">
            <input
              type="number"
              id="attire"
              min="1"
              max="10"
              value={attire}
              onChange={(e) => onScoreChange('attire', parseInt(e.target.value) || 1)}
              className="score-input"
            />
            <div className="score-bar">
              <div 
                className="score-fill" 
                style={{ width: `${(attire / 10) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="score-range">1-10 points</div>
        </div>

        <div className="score-field">
          <label htmlFor="attentive">
            Attentive (1-5 pts)
          </label>
          <div className="score-input-container">
            <input
              type="number"
              id="attentive"
              min="1"
              max="5"
              value={attentive}
              onChange={(e) => onScoreChange('attentive', parseInt(e.target.value) || 1)}
              className="score-input"
            />
            <div className="score-bar">
              <div 
                className="score-fill" 
                style={{ width: `${(attentive / 5) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="score-range">1-5 points</div>
        </div>

        <div className="score-field">
          <label htmlFor="courteous">
            Courteous (1-5 pts)
          </label>
          <div className="score-input-container">
            <input
              type="number"
              id="courteous"
              min="1"
              max="5"
              value={courteous}
              onChange={(e) => onScoreChange('courteous', parseInt(e.target.value) || 1)}
              className="score-input"
            />
            <div className="score-bar">
              <div 
                className="score-fill" 
                style={{ width: `${(courteous / 5) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="score-range">1-5 points</div>
        </div>
      </div>

      <div className="comments-section">
        <label htmlFor="appearanceComments">
          Comments (optional, max 500 characters)
        </label>
        <textarea
          id="appearanceComments"
          value={comments}
          onChange={(e) => onScoreChange('appearanceComments', e.target.value)}
          maxLength={500}
          rows={3}
          className="comments-textarea"
          placeholder="Add comments about the participant's appearance and demeanor..."
        />
        <div className="character-count">
          {comments.length}/500 characters
        </div>
      </div>
    </div>
  );
};