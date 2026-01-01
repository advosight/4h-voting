import React from 'react';

export interface FitShowValidationError {
  field: string;
  message: string;
  value?: any;
  expectedRange?: string;
}

interface FitShowValidationErrorDisplayProps {
  errors: FitShowValidationError[];
  className?: string;
  showFieldNames?: boolean;
  maxErrors?: number;
}

const FIELD_DISPLAY_NAMES: Record<string, string> = {
  // Appearance & Demeanor
  attire: 'Neat, Clean, Appropriate Attire',
  attentive: 'Attentive',
  courteous: 'Courteous',
  
  // Handling & Control
  controlEquipment: 'Control, Harness Fits, Leash on Wrist',
  pickupCarrying: 'Picking Up & Carrying of Cat',
  
  // Demonstration Skills
  showingHeadShape: 'Showing Head Shape',
  showingBodyType: 'Showing Body Type',
  showingTail: 'Showing Tail',
  showingCoatTexture: 'Showing Coat Texture',
  
  // Health Examination
  showingMouthTeethGums: 'Showing Mouth/Teeth/Gums',
  conditionMouthTeethGums: 'Condition of Mouth/Teeth/Gums',
  showingNose: 'Showing Nose',
  showingEyes: 'Showing Eyes',
  conditionNoseEyes: 'Condition of Nose & Eyes',
  showingEars: 'Showing Ears',
  earsClean: 'Ears Clean',
  showingToenailsClaws: 'Showing Toenails/Claws',
  toenailsClipped: 'Toenails Clipped',
  
  // Grooming & Care
  showingBellyCoatCleanliness: 'Showing Belly/Coat/Cleanliness',
  coatCleanWellGroomed: 'Coat Clean & Well Groomed',
  catHealthCare: 'Cat Health/Care',
  
  // Knowledge
  generalKnowledge: 'General Knowledge',
  catBreedsShowing: 'Cat Breeds & Showing',
  catAnatomy: 'Cat Anatomy',
  fourHKnowledge: '4-H Knowledge',
  
  // Comments
  appearanceComments: 'Appearance Comments',
  handlingComments: 'Handling Comments',
  demonstrationComments: 'Demonstration Comments',
  healthExaminationComments: 'Health Examination Comments',
  groomingCareComments: 'Grooming & Care Comments',
  knowledgeComments: 'Knowledge Comments',
  
  // Required fields
  catId: 'Cat ID',
  judgeId: 'Judge ID',
  participantName: 'Participant Name'
};

const CATEGORY_GROUPS: Record<string, string[]> = {
  'Appearance & Demeanor': ['attire', 'attentive', 'courteous', 'appearanceComments'],
  'Handling & Control': ['controlEquipment', 'pickupCarrying', 'handlingComments'],
  'Demonstration Skills': ['showingHeadShape', 'showingBodyType', 'showingTail', 'showingCoatTexture', 'demonstrationComments'],
  'Health Examination': [
    'showingMouthTeethGums', 'conditionMouthTeethGums', 'showingNose', 'showingEyes',
    'conditionNoseEyes', 'showingEars', 'earsClean', 'showingToenailsClaws',
    'toenailsClipped', 'healthExaminationComments'
  ],
  'Grooming & Care': ['showingBellyCoatCleanliness', 'coatCleanWellGroomed', 'catHealthCare', 'groomingCareComments'],
  'Knowledge': ['generalKnowledge', 'catBreedsShowing', 'catAnatomy', 'fourHKnowledge', 'knowledgeComments'],
  'General': ['catId', 'judgeId', 'participantName']
};

export const FitShowValidationErrorDisplay: React.FC<FitShowValidationErrorDisplayProps> = ({
  errors,
  className = '',
  showFieldNames = true,
  maxErrors = 10
}) => {
  if (!errors || errors.length === 0) {
    return null;
  }

  const displayErrors = errors.slice(0, maxErrors);
  const hasMoreErrors = errors.length > maxErrors;

  const getFieldDisplayName = (field: string): string => {
    return FIELD_DISPLAY_NAMES[field] || field;
  };

  const getCategoryForField = (field: string): string => {
    for (const [category, fields] of Object.entries(CATEGORY_GROUPS)) {
      if (fields.includes(field)) {
        return category;
      }
    }
    return 'Other';
  };

  const groupErrorsByCategory = () => {
    const grouped: Record<string, FitShowValidationError[]> = {};
    
    displayErrors.forEach(error => {
      const category = getCategoryForField(error.field);
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(error);
    });
    
    return grouped;
  };

  const groupedErrors = groupErrorsByCategory();

  const getErrorIcon = (field: string) => {
    if (field.includes('Comments') || field.includes('comment')) {
      return '💬';
    }
    if (field === 'catId' || field === 'judgeId') {
      return '🔍';
    }
    return '⚠️';
  };

  return (
    <div className={`fit-show-validation-errors ${className}`}>
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center mb-3">
          <span className="text-red-500 text-lg mr-2">❌</span>
          <h3 className="text-red-800 font-medium">
            Validation Errors ({errors.length})
          </h3>
        </div>

        <div className="space-y-4">
          {Object.entries(groupedErrors).map(([category, categoryErrors]) => (
            <div key={category} className="border-l-4 border-red-300 pl-4">
              <h4 className="font-medium text-red-700 text-sm mb-2">
                {category}
              </h4>
              
              <div className="space-y-2">
                {categoryErrors.map((error, index) => (
                  <div key={`${error.field}-${index}`} className="flex items-start">
                    <span className="mr-2 text-sm">
                      {getErrorIcon(error.field)}
                    </span>
                    <div className="flex-1">
                      {showFieldNames && (
                        <div className="font-medium text-red-800 text-sm">
                          {getFieldDisplayName(error.field)}
                        </div>
                      )}
                      <div className="text-red-700 text-sm">
                        {error.message}
                      </div>
                      {error.expectedRange && (
                        <div className="text-red-600 text-xs mt-1">
                          Expected: {error.expectedRange}
                          {error.value !== undefined && (
                            <span className="ml-2">
                              Received: {error.value}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {hasMoreErrors && (
          <div className="mt-3 pt-3 border-t border-red-200">
            <p className="text-red-600 text-sm">
              ... and {errors.length - maxErrors} more error{errors.length - maxErrors !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        <div className="mt-4 p-3 bg-red-100 rounded">
          <h4 className="font-medium text-red-800 text-sm mb-1">
            How to fix these errors:
          </h4>
          <ul className="text-red-700 text-sm space-y-1">
            <li>• Ensure all scores are within the valid range for each category</li>
            <li>• Fill in all required fields</li>
            <li>• Keep comments under 500 characters</li>
            <li>• Verify participant and judge information is correct</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FitShowValidationErrorDisplay;