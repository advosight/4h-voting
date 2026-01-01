import React from 'react';

interface HandlingScoringProps {
  controlEquipment: number;
  pickupCarrying: number;
  comments: string;
  total: number;
  onScoreChange: (field: string, value: number | string) => void;
}

export const HandlingScoring: React.FC<HandlingScoringProps> = ({
  controlEquipment,
  pickupCarrying,
  comments,
  total,
  onScoreChange
}) => {
  return (
    <div className="scoring-section handling-scoring">
      <div className="section-header">
        <h3>Handling & Control</h3>
        <div className="section-total">
          <strong>{total}/14 points</strong>
        </div>
      </div>

      <div className="scoring-fields">
        <div className="score-field">
          <label htmlFor="controlEquipment">
            Control, harness fits, leash on wrist (1-10 pts)
          </label>
          <div className="score-input-container">
            <input
              type="number"
              id="controlEquipment"
              min="1"
              max="10"
              value={controlEquipment}
              onChange={(e) => onScoreChange('controlEquipment', parseInt(e.target.value) || 1)}
              className="score-input"
            />
            <div className="score-bar">
              <div 
                className="score-fill" 
                style={{ width: `${(controlEquipment / 10) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="score-range">1-10 points</div>
        </div>

        <div className="score-field">
          <label htmlFor="pickupCarrying">
            Picking up & carrying of cat (1-4 pts)
          </label>
          <div className="score-input-container">
            <input
              type="number"
              id="pickupCarrying"
              min="1"
              max="4"
              value={pickupCarrying}
              onChange={(e) => onScoreChange('pickupCarrying', parseInt(e.target.value) || 1)}
              className="score-input"
            />
            <div className="score-bar">
              <div 
                className="score-fill" 
                style={{ width: `${(pickupCarrying / 4) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="score-range">1-4 points</div>
        </div>
      </div>

      <div className="comments-section">
        <label htmlFor="handlingComments">
          Comments (optional, max 500 characters)
        </label>
        <textarea
          id="handlingComments"
          value={comments}
          onChange={(e) => onScoreChange('handlingComments', e.target.value)}
          maxLength={500}
          rows={3}
          className="comments-textarea"
          placeholder="Add comments about the participant's handling techniques..."
        />
        <div className="character-count">
          {comments.length}/500 characters
        </div>
      </div>
    </div>
  );
};