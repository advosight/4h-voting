import React, { useState, useCallback } from 'react';
import { FitShowScore } from '../types/scoring';

export interface FitShowScoreConflict {
  scoreId: string;
  participantName: string;
  localVersion: Partial<FitShowScore>;
  serverVersion: FitShowScore;
  conflictFields: string[];
  lastModifiedBy?: string;
  lastModifiedAt?: string;
}

interface FitShowConflictResolutionDialogProps {
  conflict: FitShowScoreConflict | null;
  onResolve: (resolution: 'keep-local' | 'use-server' | 'merge', mergedData?: Partial<FitShowScore>) => void;
  onCancel: () => void;
  isOpen: boolean;
}

interface FieldComparison {
  field: string;
  displayName: string;
  localValue: any;
  serverValue: any;
  selectedValue: 'local' | 'server';
}

const FIELD_DISPLAY_NAMES: Record<string, string> = {
  // Appearance & Demeanor
  attire: 'Neat, Clean, Appropriate Attire',
  attentive: 'Attentive',
  courteous: 'Courteous',
  appearanceComments: 'Appearance Comments',
  
  // Handling & Control
  controlEquipment: 'Control, Harness Fits, Leash on Wrist',
  pickupCarrying: 'Picking Up & Carrying of Cat',
  handlingComments: 'Handling Comments',
  
  // Demonstration Skills
  showingHeadShape: 'Showing Head Shape',
  showingBodyType: 'Showing Body Type',
  showingTail: 'Showing Tail',
  showingCoatTexture: 'Showing Coat Texture',
  demonstrationComments: 'Demonstration Comments',
  
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
  healthExaminationComments: 'Health Examination Comments',
  
  // Grooming & Care
  showingBellyCoatCleanliness: 'Showing Belly/Coat/Cleanliness',
  coatCleanWellGroomed: 'Coat Clean & Well Groomed',
  catHealthCare: 'Cat Health/Care',
  groomingCareComments: 'Grooming & Care Comments',
  
  // Knowledge
  generalKnowledge: 'General Knowledge',
  catBreedsShowing: 'Cat Breeds & Showing',
  catAnatomy: 'Cat Anatomy',
  fourHKnowledge: '4-H Knowledge',
  knowledgeComments: 'Knowledge Comments',
  
  // Metadata
  isFinalized: 'Finalized Status',
  totalScore: 'Total Score'
};

export const FitShowConflictResolutionDialog: React.FC<FitShowConflictResolutionDialogProps> = ({
  conflict,
  onResolve,
  onCancel,
  isOpen
}) => {
  const [selectedResolution, setSelectedResolution] = useState<'keep-local' | 'use-server' | 'merge'>('merge');
  const [fieldSelections, setFieldSelections] = useState<Record<string, 'local' | 'server'>>({});

  const getFieldComparisons = useCallback((): FieldComparison[] => {
    if (!conflict) return [];

    return conflict.conflictFields.map(field => ({
      field,
      displayName: FIELD_DISPLAY_NAMES[field] || field,
      localValue: (conflict.localVersion as any)[field],
      serverValue: (conflict.serverVersion as any)[field],
      selectedValue: fieldSelections[field] || 'local'
    }));
  }, [conflict, fieldSelections]);

  const handleFieldSelection = useCallback((field: string, selection: 'local' | 'server') => {
    setFieldSelections(prev => ({
      ...prev,
      [field]: selection
    }));
  }, []);

  const handleResolve = useCallback(() => {
    if (!conflict) return;

    if (selectedResolution === 'merge') {
      const mergedData: Partial<FitShowScore> = { ...conflict.localVersion };
      
      // Apply field-level selections
      conflict.conflictFields.forEach(field => {
        const selection = fieldSelections[field] || 'local';
        if (selection === 'server') {
          (mergedData as any)[field] = (conflict.serverVersion as any)[field];
        }
      });

      onResolve('merge', mergedData);
    } else {
      onResolve(selectedResolution);
    }
  }, [conflict, selectedResolution, fieldSelections, onResolve]);

  const formatValue = (value: any, field: string): string => {
    if (value === null || value === undefined) {
      return 'Not set';
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    if (typeof value === 'number') {
      return value.toString();
    }
    
    if (typeof value === 'string') {
      if (field.includes('Comments') || field.includes('comment')) {
        return value.length > 50 ? `${value.substring(0, 50)}...` : value;
      }
      return value;
    }
    
    return String(value);
  };

  const getValueColor = (isSelected: boolean, isLocal: boolean): string => {
    if (isSelected) {
      return isLocal ? 'bg-blue-100 border-blue-300' : 'bg-green-100 border-green-300';
    }
    return 'bg-gray-50 border-gray-200';
  };

  if (!isOpen || !conflict) {
    return null;
  }

  const fieldComparisons = getFieldComparisons();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Resolve Fit & Show Score Conflict
          </h2>
          <p className="text-gray-600">
            The fit & show score for <strong>{conflict.participantName}</strong> has been modified by another user. 
            Please choose how to resolve the conflicts.
          </p>
          {conflict.lastModifiedBy && (
            <p className="text-sm text-gray-500 mt-2">
              Last modified by: {conflict.lastModifiedBy}
              {conflict.lastModifiedAt && (
                <span className="ml-2">
                  at {new Date(conflict.lastModifiedAt).toLocaleString()}
                </span>
              )}
            </p>
          )}
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Resolution Strategy Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Resolution Strategy
            </h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="resolution"
                  value="keep-local"
                  checked={selectedResolution === 'keep-local'}
                  onChange={(e) => setSelectedResolution(e.target.value as any)}
                  className="mr-2"
                />
                <span className="text-gray-700">
                  Keep my changes (discard server changes)
                </span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="radio"
                  name="resolution"
                  value="use-server"
                  checked={selectedResolution === 'use-server'}
                  onChange={(e) => setSelectedResolution(e.target.value as any)}
                  className="mr-2"
                />
                <span className="text-gray-700">
                  Use server version (discard my changes)
                </span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="radio"
                  name="resolution"
                  value="merge"
                  checked={selectedResolution === 'merge'}
                  onChange={(e) => setSelectedResolution(e.target.value as any)}
                  className="mr-2"
                />
                <span className="text-gray-700">
                  Merge changes (choose field by field)
                </span>
              </label>
            </div>
          </div>

          {/* Field-by-Field Comparison (only shown for merge) */}
          {selectedResolution === 'merge' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Conflicting Fields ({fieldComparisons.length})
              </h3>
              
              <div className="space-y-4">
                {fieldComparisons.map((comparison) => (
                  <div key={comparison.field} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">
                      {comparison.displayName}
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {/* Local Version */}
                      <div>
                        <label className="flex items-start cursor-pointer">
                          <input
                            type="radio"
                            name={`field-${comparison.field}`}
                            value="local"
                            checked={comparison.selectedValue === 'local'}
                            onChange={() => handleFieldSelection(comparison.field, 'local')}
                            className="mt-1 mr-2"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-blue-700 mb-1">
                              My Version
                            </div>
                            <div className={`p-3 rounded border ${getValueColor(comparison.selectedValue === 'local', true)}`}>
                              {formatValue(comparison.localValue, comparison.field)}
                            </div>
                          </div>
                        </label>
                      </div>
                      
                      {/* Server Version */}
                      <div>
                        <label className="flex items-start cursor-pointer">
                          <input
                            type="radio"
                            name={`field-${comparison.field}`}
                            value="server"
                            checked={comparison.selectedValue === 'server'}
                            onChange={() => handleFieldSelection(comparison.field, 'server')}
                            className="mt-1 mr-2"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-green-700 mb-1">
                              Server Version
                            </div>
                            <div className={`p-3 rounded border ${getValueColor(comparison.selectedValue === 'server', false)}`}>
                              {formatValue(comparison.serverValue, comparison.field)}
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleResolve}
            className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            Resolve Conflict
          </button>
        </div>
      </div>
    </div>
  );
};

export default FitShowConflictResolutionDialog;