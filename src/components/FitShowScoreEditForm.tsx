import React, { useState, useEffect } from 'react';
import { FitShowScore } from '../types/scoring';
import { AppearanceScoring } from './AppearanceScoring';
import { HandlingScoring } from './HandlingScoring';
import { DemonstrationScoring } from './DemonstrationScoring';
import { HealthExaminationScoring } from './HealthExaminationScoring';
import { GroomingCareScoring } from './GroomingCareScoring';
import { KnowledgeScoring } from './KnowledgeScoring';

interface FitShowScoreEditFormProps {
  score: FitShowScore;
  onSave: (updatedScore: Partial<FitShowScore>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

interface ModificationTracker {
  field: string;
  oldValue: any;
  newValue: any;
  timestamp: string;
}

export const FitShowScoreEditForm: React.FC<FitShowScoreEditFormProps> = ({
  score,
  onSave,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<Partial<FitShowScore>>(score);
  const [modifications, setModifications] = useState<ModificationTracker[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Track modifications
  const trackModification = (field: string, oldValue: any, newValue: any) => {
    if (oldValue !== newValue) {
      const modification: ModificationTracker = {
        field,
        oldValue,
        newValue,
        timestamp: new Date().toISOString()
      };
      setModifications(prev => [...prev, modification]);
      setHasChanges(true);
    }
  };

  // Handle field updates with modification tracking
  const handleFieldUpdate = (field: keyof FitShowScore, value: any) => {
    const oldValue = formData[field];
    setFormData(prev => ({ ...prev, [field]: value }));
    trackModification(field, oldValue, value);
  };

  // Calculate totals when scores change
  useEffect(() => {
    const calculateTotals = () => {
      const appearanceTotal = (formData.attire || 0) + (formData.attentive || 0) + (formData.courteous || 0);
      const handlingTotal = (formData.controlEquipment || 0) + (formData.pickupCarrying || 0);
      const demonstrationTotal = (formData.showingHeadShape || 0) + (formData.showingBodyType || 0) + 
                                (formData.showingTail || 0) + (formData.showingCoatTexture || 0);
      const healthExaminationTotal = (formData.showingMouthTeethGums || 0) + (formData.conditionMouthTeethGums || 0) +
                                   (formData.showingNose || 0) + (formData.showingEyes || 0) + (formData.conditionNoseEyes || 0) +
                                   (formData.showingEars || 0) + (formData.earsClean || 0) + (formData.showingToenailsClaws || 0) +
                                   (formData.toenailsClipped || 0);
      const groomingCareTotal = (formData.showingBellyCoatCleanliness || 0) + (formData.coatCleanWellGroomed || 0) + 
                               (formData.catHealthCare || 0);
      const knowledgeTotal = (formData.generalKnowledge || 0) + (formData.catBreedsShowing || 0) + 
                            (formData.catAnatomy || 0) + (formData.fourHKnowledge || 0);
      const totalScore = appearanceTotal + handlingTotal + demonstrationTotal + healthExaminationTotal + 
                        groomingCareTotal + knowledgeTotal;

      setFormData(prev => ({
        ...prev,
        appearanceTotal,
        handlingTotal,
        demonstrationTotal,
        healthExaminationTotal,
        groomingCareTotal,
        knowledgeTotal,
        totalScore
      }));
    };

    calculateTotals();
  }, [
    formData.attire, formData.attentive, formData.courteous,
    formData.controlEquipment, formData.pickupCarrying,
    formData.showingHeadShape, formData.showingBodyType, formData.showingTail, formData.showingCoatTexture,
    formData.showingMouthTeethGums, formData.conditionMouthTeethGums, formData.showingNose, formData.showingEyes,
    formData.conditionNoseEyes, formData.showingEars, formData.earsClean, formData.showingToenailsClaws, formData.toenailsClipped,
    formData.showingBellyCoatCleanliness, formData.coatCleanWellGroomed, formData.catHealthCare,
    formData.generalKnowledge, formData.catBreedsShowing, formData.catAnatomy, formData.fourHKnowledge
  ]);

  const handleSave = async () => {
    if (score.isFinalized && !showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    try {
      await onSave({
        ...formData,
        updatedAt: new Date().toISOString(),
        modificationCount: (score.modificationCount || 0) + 1,
        lastModifiedBy: 'current-judge', // This would come from auth context
        lastModifiedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error saving fit and show score:', error);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        onCancel();
      }
    } else {
      onCancel();
    }
  };

  return (
    <div className="fit-show-score-edit-form">
      <div className="form-header">
        <h2>Edit Fit and Show Score</h2>
        <div className="participant-info">
          <p><strong>Participant:</strong> {score.participantName}</p>
          <p><strong>Cat:</strong> {score.catId}</p>
          <p><strong>Judge:</strong> {score.judgeName}</p>
          {score.isFinalized && (
            <div className="finalized-warning">
              ⚠️ This score has been finalized. Changes require confirmation.
            </div>
          )}
        </div>
      </div>

      {modifications.length > 0 && (
        <div className="modifications-summary">
          <h3>Recent Modifications ({modifications.length})</h3>
          <div className="modifications-list">
            {modifications.slice(-5).map((mod, index) => (
              <div key={index} className="modification-item">
                <span className="field">{mod.field}:</span>
                <span className="change">{mod.oldValue} → {mod.newValue}</span>
                <span className="timestamp">{new Date(mod.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="scoring-sections">
        <AppearanceScoring
          scores={{
            attire: formData.attire || 0,
            attentive: formData.attentive || 0,
            courteous: formData.courteous || 0
          }}
          comments={formData.appearanceComments || ''}
          onScoreChange={(field, value) => handleFieldUpdate(field as keyof FitShowScore, value)}
          onCommentsChange={(comments) => handleFieldUpdate('appearanceComments', comments)}
          total={formData.appearanceTotal || 0}
        />

        <HandlingScoring
          scores={{
            controlEquipment: formData.controlEquipment || 0,
            pickupCarrying: formData.pickupCarrying || 0
          }}
          comments={formData.handlingComments || ''}
          onScoreChange={(field, value) => handleFieldUpdate(field as keyof FitShowScore, value)}
          onCommentsChange={(comments) => handleFieldUpdate('handlingComments', comments)}
          total={formData.handlingTotal || 0}
        />

        <DemonstrationScoring
          scores={{
            showingHeadShape: formData.showingHeadShape || 0,
            showingBodyType: formData.showingBodyType || 0,
            showingTail: formData.showingTail || 0,
            showingCoatTexture: formData.showingCoatTexture || 0
          }}
          comments={formData.demonstrationComments || ''}
          onScoreChange={(field, value) => handleFieldUpdate(field as keyof FitShowScore, value)}
          onCommentsChange={(comments) => handleFieldUpdate('demonstrationComments', comments)}
          total={formData.demonstrationTotal || 0}
        />

        <HealthExaminationScoring
          scores={{
            showingMouthTeethGums: formData.showingMouthTeethGums || 0,
            conditionMouthTeethGums: formData.conditionMouthTeethGums || 0,
            showingNose: formData.showingNose || 0,
            showingEyes: formData.showingEyes || 0,
            conditionNoseEyes: formData.conditionNoseEyes || 0,
            showingEars: formData.showingEars || 0,
            earsClean: formData.earsClean || 0,
            showingToenailsClaws: formData.showingToenailsClaws || 0,
            toenailsClipped: formData.toenailsClipped || 0
          }}
          comments={formData.healthExaminationComments || ''}
          onScoreChange={(field, value) => handleFieldUpdate(field as keyof FitShowScore, value)}
          onCommentsChange={(comments) => handleFieldUpdate('healthExaminationComments', comments)}
          total={formData.healthExaminationTotal || 0}
        />

        <GroomingCareScoring
          scores={{
            showingBellyCoatCleanliness: formData.showingBellyCoatCleanliness || 0,
            coatCleanWellGroomed: formData.coatCleanWellGroomed || 0,
            catHealthCare: formData.catHealthCare || 0
          }}
          comments={formData.groomingCareComments || ''}
          onScoreChange={(field, value) => handleFieldUpdate(field as keyof FitShowScore, value)}
          onCommentsChange={(comments) => handleFieldUpdate('groomingCareComments', comments)}
          total={formData.groomingCareTotal || 0}
        />

        <KnowledgeScoring
          scores={{
            generalKnowledge: formData.generalKnowledge || 0,
            catBreedsShowing: formData.catBreedsShowing || 0,
            catAnatomy: formData.catAnatomy || 0,
            fourHKnowledge: formData.fourHKnowledge || 0
          }}
          comments={formData.knowledgeComments || ''}
          onScoreChange={(field, value) => handleFieldUpdate(field as keyof FitShowScore, value)}
          onCommentsChange={(comments) => handleFieldUpdate('knowledgeComments', comments)}
          total={formData.knowledgeTotal || 0}
        />
      </div>

      <div className="total-score">
        <h3>Total Score: {formData.totalScore || 0} / 100</h3>
      </div>

      <div className="form-actions">
        <button 
          type="button" 
          onClick={handleCancel}
          className="cancel-button"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button 
          type="button" 
          onClick={handleSave}
          className="save-button"
          disabled={isLoading || !hasChanges}
        >
          {isLoading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {showConfirmation && (
        <div className="confirmation-dialog">
          <div className="dialog-content">
            <h3>Confirm Modification</h3>
            <p>This score has been finalized. Are you sure you want to modify it?</p>
            <div className="dialog-actions">
              <button onClick={() => setShowConfirmation(false)}>Cancel</button>
              <button onClick={handleSave} className="confirm-button">
                Yes, Modify Score
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};