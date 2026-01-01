import React from 'react';

interface KnowledgeScoringProps {
  generalKnowledge: number;
  catBreedsShowing: number;
  catAnatomy: number;
  fourHKnowledge: number;
  comments: string;
  total: number;
  onScoreChange: (field: string, value: number | string) => void;
}

export const KnowledgeScoring: React.FC<KnowledgeScoringProps> = ({
  generalKnowledge,
  catBreedsShowing,
  catAnatomy,
  fourHKnowledge,
  comments,
  total,
  onScoreChange
}) => {
  return (
    <div className="scoring-section knowledge-scoring">
      <div className="section-header">
        <h3>Knowledge</h3>
        <div className="section-total">
          <strong>{total}/12 points</strong>
        </div>
      </div>

      <div className="scoring-fields">
        <div className="score-field">
          <label htmlFor="generalKnowledge">
            General Knowledge (1-3 pts)
          </label>
          <div className="score-input-container">
            <input
              type="number"
              id="generalKnowledge"
              min="1"
              max="3"
              value={generalKnowledge}
              onChange={(e) => onScoreChange('generalKnowledge', parseInt(e.target.value) || 1)}
              className="score-input"
            />
            <div className="score-bar">
              <div 
                className="score-fill" 
                style={{ width: `${(generalKnowledge / 3) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="score-range">1-3 points</div>
        </div>

        <div className="score-field">
          <label htmlFor="catBreedsShowing">
            Cat Breeds & Showing (1-3 pts)
          </label>
          <div className="score-input-container">
            <input
              type="number"
              id="catBreedsShowing"
              min="1"
              max="3"
              value={catBreedsShowing}
              onChange={(e) => onScoreChange('catBreedsShowing', parseInt(e.target.value) || 1)}
              className="score-input"
            />
            <div className="score-bar">
              <div 
                className="score-fill" 
                style={{ width: `${(catBreedsShowing / 3) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="score-range">1-3 points</div>
        </div>

        <div className="score-field">
          <label htmlFor="catAnatomy">
            Cat Anatomy (1-3 pts)
          </label>
          <div className="score-input-container">
            <input
              type="number"
              id="catAnatomy"
              min="1"
              max="3"
              value={catAnatomy}
              onChange={(e) => onScoreChange('catAnatomy', parseInt(e.target.value) || 1)}
              className="score-input"
            />
            <div className="score-bar">
              <div 
                className="score-fill" 
                style={{ width: `${(catAnatomy / 3) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="score-range">1-3 points</div>
        </div>

        <div className="score-field">
          <label htmlFor="fourHKnowledge">
            4-H Knowledge (1-3 pts)
          </label>
          <div className="score-input-container">
            <input
              type="number"
              id="fourHKnowledge"
              min="1"
              max="3"
              value={fourHKnowledge}
              onChange={(e) => onScoreChange('fourHKnowledge', parseInt(e.target.value) || 1)}
              className="score-input"
            />
            <div className="score-bar">
              <div 
                className="score-fill" 
                style={{ width: `${(fourHKnowledge / 3) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="score-range">1-3 points</div>
        </div>
      </div>

      <div className="comments-section">
        <label htmlFor="knowledgeComments">
          Comments (optional, max 500 characters)
        </label>
        <textarea
          id="knowledgeComments"
          value={comments}
          onChange={(e) => onScoreChange('knowledgeComments', e.target.value)}
          maxLength={500}
          rows={3}
          className="comments-textarea"
          placeholder="Add comments about the participant's knowledge of cats, breeds, and 4H..."
        />
        <div className="character-count">
          {comments.length}/500 characters
        </div>
      </div>
    </div>
  );
};