import React from 'react';

interface GroomingCareScoringProps {
  showingBellyCoatCleanliness: number;
  coatCleanWellGroomed: number;
  catHealthCare: number;
  comments: string;
  total: number;
  onScoreChange: (field: string, value: number | string) => void;
}

export const GroomingCareScoring: React.FC<GroomingCareScoringProps> = ({
  showingBellyCoatCleanliness,
  coatCleanWellGroomed,
  catHealthCare,
  comments,
  total,
  onScoreChange
}) => {
  return (
    <div className="scoring-section grooming-care-scoring">
      <div className="section-header">
        <h3>Grooming & Care</h3>
        <div className="section-total">
          <strong>{total}/14 points</strong>
        </div>
      </div>

      <div className="scoring-fields">
        <div className="score-field">
          <label htmlFor="showingBellyCoatCleanliness">
            Showing belly/coat/cleanliness (1-3 pts)
          </label>
          <div className="score-input-container">
            <input
              type="number"
              id="showingBellyCoatCleanliness"
              min="1"
              max="3"
              value={showingBellyCoatCleanliness}
              onChange={(e) => onScoreChange('showingBellyCoatCleanliness', parseInt(e.target.value) || 1)}
              className="score-input"
            />
            <div className="score-bar">
              <div 
                className="score-fill" 
                style={{ width: `${(showingBellyCoatCleanliness / 3) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="score-range">1-3 points</div>
        </div>

        <div className="score-field">
          <label htmlFor="coatCleanWellGroomed">
            Coat clean & well groomed (1-8 pts)
          </label>
          <div className="score-input-container">
            <input
              type="number"
              id="coatCleanWellGroomed"
              min="1"
              max="8"
              value={coatCleanWellGroomed}
              onChange={(e) => onScoreChange('coatCleanWellGroomed', parseInt(e.target.value) || 1)}
              className="score-input"
            />
            <div className="score-bar">
              <div 
                className="score-fill" 
                style={{ width: `${(coatCleanWellGroomed / 8) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="score-range">1-8 points</div>
        </div>

        <div className="score-field">
          <label htmlFor="catHealthCare">
            Cat health/care (1-3 pts)
          </label>
          <div className="score-input-container">
            <input
              type="number"
              id="catHealthCare"
              min="1"
              max="3"
              value={catHealthCare}
              onChange={(e) => onScoreChange('catHealthCare', parseInt(e.target.value) || 1)}
              className="score-input"
            />
            <div className="score-bar">
              <div 
                className="score-fill" 
                style={{ width: `${(catHealthCare / 3) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="score-range">1-3 points</div>
        </div>
      </div>

      <div className="comments-section">
        <label htmlFor="groomingCareComments">
          Comments (optional, max 500 characters)
        </label>
        <textarea
          id="groomingCareComments"
          value={comments}
          onChange={(e) => onScoreChange('groomingCareComments', e.target.value)}
          maxLength={500}
          rows={3}
          className="comments-textarea"
          placeholder="Add comments about the participant's grooming and care knowledge..."
        />
        <div className="character-count">
          {comments.length}/500 characters
        </div>
      </div>
    </div>
  );
};