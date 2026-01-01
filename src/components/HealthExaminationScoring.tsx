import React from 'react';

interface HealthExaminationScoringProps {
  showingMouthTeethGums: number;
  conditionMouthTeethGums: number;
  showingNose: number;
  showingEyes: number;
  conditionNoseEyes: number;
  showingEars: number;
  earsClean: number;
  showingToenailsClaws: number;
  toenailsClipped: number;
  comments: string;
  total: number;
  onScoreChange: (field: string, value: number | string) => void;
}

export const HealthExaminationScoring: React.FC<HealthExaminationScoringProps> = ({
  showingMouthTeethGums,
  conditionMouthTeethGums,
  showingNose,
  showingEyes,
  conditionNoseEyes,
  showingEars,
  earsClean,
  showingToenailsClaws,
  toenailsClipped,
  comments,
  total,
  onScoreChange
}) => {
  return (
    <div className="scoring-section health-examination-scoring">
      <div className="section-header">
        <h3>Health Examination</h3>
        <div className="section-total">
          <strong>{total}/21 points</strong>
        </div>
      </div>

      <div className="scoring-fields">
        <div className="score-field">
          <label htmlFor="showingMouthTeethGums">
            Showing mouth/teeth/gums (1-3 pts)
          </label>
          <div className="score-input-container">
            <input
              type="number"
              id="showingMouthTeethGums"
              min="1"
              max="3"
              value={showingMouthTeethGums}
              onChange={(e) => onScoreChange('showingMouthTeethGums', parseInt(e.target.value) || 1)}
              className="score-input"
            />
            <div className="score-bar">
              <div 
                className="score-fill" 
                style={{ width: `${(showingMouthTeethGums / 3) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="score-range">1-3 points</div>
        </div>

        <div className="score-field">
          <label htmlFor="conditionMouthTeethGums">
            Condition of mouth/teeth/gums (1-2 pts)
          </label>
          <div className="score-input-container">
            <input
              type="number"
              id="conditionMouthTeethGums"
              min="1"
              max="2"
              value={conditionMouthTeethGums}
              onChange={(e) => onScoreChange('conditionMouthTeethGums', parseInt(e.target.value) || 1)}
              className="score-input"
            />
            <div className="score-bar">
              <div 
                className="score-fill" 
                style={{ width: `${(conditionMouthTeethGums / 2) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="score-range">1-2 points</div>
        </div>

        <div className="score-field">
          <label htmlFor="showingNose">
            Showing nose (1-2 pts)
          </label>
          <div className="score-input-container">
            <input
              type="number"
              id="showingNose"
              min="1"
              max="2"
              value={showingNose}
              onChange={(e) => onScoreChange('showingNose', parseInt(e.target.value) || 1)}
              className="score-input"
            />
            <div className="score-bar">
              <div 
                className="score-fill" 
                style={{ width: `${(showingNose / 2) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="score-range">1-2 points</div>
        </div>

        <div className="score-field">
          <label htmlFor="showingEyes">
            Showing eyes (1-2 pts)
          </label>
          <div className="score-input-container">
            <input
              type="number"
              id="showingEyes"
              min="1"
              max="2"
              value={showingEyes}
              onChange={(e) => onScoreChange('showingEyes', parseInt(e.target.value) || 1)}
              className="score-input"
            />
            <div className="score-bar">
              <div 
                className="score-fill" 
                style={{ width: `${(showingEyes / 2) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="score-range">1-2 points</div>
        </div>

        <div className="score-field">
          <label htmlFor="conditionNoseEyes">
            Condition of nose & eyes (1-2 pts)
          </label>
          <div className="score-input-container">
            <input
              type="number"
              id="conditionNoseEyes"
              min="1"
              max="2"
              value={conditionNoseEyes}
              onChange={(e) => onScoreChange('conditionNoseEyes', parseInt(e.target.value) || 1)}
              className="score-input"
            />
            <div className="score-bar">
              <div 
                className="score-fill" 
                style={{ width: `${(conditionNoseEyes / 2) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="score-range">1-2 points</div>
        </div>

        <div className="score-field">
          <label htmlFor="showingEars">
            Showing ears (1-2 pts)
          </label>
          <div className="score-input-container">
            <input
              type="number"
              id="showingEars"
              min="1"
              max="2"
              value={showingEars}
              onChange={(e) => onScoreChange('showingEars', parseInt(e.target.value) || 1)}
              className="score-input"
            />
            <div className="score-bar">
              <div 
                className="score-fill" 
                style={{ width: `${(showingEars / 2) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="score-range">1-2 points</div>
        </div>

        <div className="score-field">
          <label htmlFor="earsClean">
            Ears clean (1-2 pts)
          </label>
          <div className="score-input-container">
            <input
              type="number"
              id="earsClean"
              min="1"
              max="2"
              value={earsClean}
              onChange={(e) => onScoreChange('earsClean', parseInt(e.target.value) || 1)}
              className="score-input"
            />
            <div className="score-bar">
              <div 
                className="score-fill" 
                style={{ width: `${(earsClean / 2) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="score-range">1-2 points</div>
        </div>

        <div className="score-field">
          <label htmlFor="showingToenailsClaws">
            Showing toenails/claws (1-3 pts)
          </label>
          <div className="score-input-container">
            <input
              type="number"
              id="showingToenailsClaws"
              min="1"
              max="3"
              value={showingToenailsClaws}
              onChange={(e) => onScoreChange('showingToenailsClaws', parseInt(e.target.value) || 1)}
              className="score-input"
            />
            <div className="score-bar">
              <div 
                className="score-fill" 
                style={{ width: `${(showingToenailsClaws / 3) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="score-range">1-3 points</div>
        </div>

        <div className="score-field">
          <label htmlFor="toenailsClipped">
            Toenails clipped (1-6 pts)
          </label>
          <div className="score-input-container">
            <input
              type="number"
              id="toenailsClipped"
              min="1"
              max="6"
              value={toenailsClipped}
              onChange={(e) => onScoreChange('toenailsClipped', parseInt(e.target.value) || 1)}
              className="score-input"
            />
            <div className="score-bar">
              <div 
                className="score-fill" 
                style={{ width: `${(toenailsClipped / 6) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="score-range">1-6 points</div>
        </div>
      </div>

      <div className="comments-section">
        <label htmlFor="healthExaminationComments">
          Comments (optional, max 500 characters)
        </label>
        <textarea
          id="healthExaminationComments"
          value={comments}
          onChange={(e) => onScoreChange('healthExaminationComments', e.target.value)}
          maxLength={500}
          rows={3}
          className="comments-textarea"
          placeholder="Add comments about the participant's health examination skills..."
        />
        <div className="character-count">
          {comments.length}/500 characters
        </div>
      </div>
    </div>
  );
};