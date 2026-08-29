import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Chip,
  Grid,
  Paper,
  Alert,
  CircularProgress,
  Fab,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Check as CheckIcon } from '@mui/icons-material';
import { generateClient } from 'aws-amplify/api';
import { FitShowScore, CreateFitShowScoreInput, UpdateFitShowScoreInput } from '../types/scoring';
import { ValidationSummary } from './ValidationErrorDisplay';
import { AppearanceScoring } from './AppearanceScoring';
import { HandlingScoring } from './HandlingScoring';
import { DemonstrationScoring } from './DemonstrationScoring';
import { HealthExaminationScoring } from './HealthExaminationScoring';
import { GroomingCareScoring } from './GroomingCareScoring';
import { KnowledgeScoring } from './KnowledgeScoring';
import { FitShowNetworkErrorHandler, NetworkError } from './FitShowNetworkErrorHandler';

const client = generateClient();

interface FitShowScoringFormProps {
  catId: string;
  participantName: string;
  judgeId: string;
  judgeName: string;
  existingScore?: FitShowScore;
  modificationReason?: string;
  onScoreSubmitted?: (score: FitShowScore) => void;
  onError?: (error: string) => void;
}

interface FitShowScoreData {
  // Appearance & Demeanor (20 points)
  attire: number;
  attentive: number;
  courteous: number;

  // Handling & Control (14 points)
  controlEquipment: number;
  pickupCarrying: number;

  // Demonstration Skills (16 points)
  showingHeadShape: number;
  showingBodyType: number;
  showingTail: number;
  showingCoatTexture: number;

  // Health Examination (24 points)
  showingMouthTeethGums: number;
  conditionMouthTeethGums: number;
  showingNose: number;
  showingEyes: number;
  conditionNoseEyes: number;
  showingEars: number;
  earsClean: number;
  showingToenailsClaws: number;
  toenailsClipped: number;

  // Grooming & Care (14 points)
  showingBellyCoatCleanliness: number;
  coatCleanWellGroomed: number;
  catHealthCare: number;

  // Knowledge (12 points)
  generalKnowledge: number;
  catBreedsShowing: number;
  catAnatomy: number;
  fourHKnowledge: number;

  // Comments
  appearanceComments: string;
  handlingComments: string;
  demonstrationComments: string;
  healthExaminationComments: string;
  groomingCareComments: string;
  knowledgeComments: string;
}

const initialScoreData: FitShowScoreData = {
  // All numeric fields default to their maximum values
  attire: 10,
  attentive: 5,
  courteous: 5,

  controlEquipment: 10,
  pickupCarrying: 4,

  showingHeadShape: 4,
  showingBodyType: 4,
  showingTail: 4,
  showingCoatTexture: 4,

  showingMouthTeethGums: 3,
  conditionMouthTeethGums: 2,
  showingNose: 2,
  showingEyes: 2,
  conditionNoseEyes: 2,
  showingEars: 2,
  earsClean: 2,
  showingToenailsClaws: 3,
  toenailsClipped: 6,

  showingBellyCoatCleanliness: 3,
  coatCleanWellGroomed: 8,
  catHealthCare: 3,

  generalKnowledge: 3,
  catBreedsShowing: 3,
  catAnatomy: 3,
  fourHKnowledge: 3,

  // Comments
  appearanceComments: '',
  handlingComments: '',
  demonstrationComments: '',
  healthExaminationComments: '',
  groomingCareComments: '',
  knowledgeComments: ''
};

export const FitShowScoringForm: React.FC<FitShowScoringFormProps> = ({
  catId,
  participantName,
  judgeId,
  judgeName,
  existingScore,
  modificationReason,
  onScoreSubmitted,
  onError
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [scoreData, setScoreData] = useState<FitShowScoreData>(initialScoreData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitted' | 'success' | 'error'>('idle');
  const [networkError, setNetworkError] = useState<NetworkError | null>(null);

  // Initialize form with existing score data
  useEffect(() => {
    if (existingScore) {
      setScoreData({
        attire: existingScore.attire,
        attentive: existingScore.attentive,
        courteous: existingScore.courteous,
        controlEquipment: existingScore.controlEquipment,
        pickupCarrying: existingScore.pickupCarrying,
        showingHeadShape: existingScore.showingHeadShape,
        showingBodyType: existingScore.showingBodyType,
        showingTail: existingScore.showingTail,
        showingCoatTexture: existingScore.showingCoatTexture,
        showingMouthTeethGums: existingScore.showingMouthTeethGums,
        conditionMouthTeethGums: existingScore.conditionMouthTeethGums,
        showingNose: existingScore.showingNose,
        showingEyes: existingScore.showingEyes,
        conditionNoseEyes: existingScore.conditionNoseEyes,
        showingEars: existingScore.showingEars,
        earsClean: existingScore.earsClean,
        showingToenailsClaws: existingScore.showingToenailsClaws,
        toenailsClipped: existingScore.toenailsClipped,
        showingBellyCoatCleanliness: existingScore.showingBellyCoatCleanliness,
        coatCleanWellGroomed: existingScore.coatCleanWellGroomed,
        catHealthCare: existingScore.catHealthCare,
        generalKnowledge: existingScore.generalKnowledge,
        catBreedsShowing: existingScore.catBreedsShowing,
        catAnatomy: existingScore.catAnatomy,
        fourHKnowledge: existingScore.fourHKnowledge,
        appearanceComments: existingScore.appearanceComments || '',
        handlingComments: existingScore.handlingComments || '',
        demonstrationComments: existingScore.demonstrationComments || '',
        healthExaminationComments: existingScore.healthExaminationComments || '',
        groomingCareComments: existingScore.groomingCareComments || '',
        knowledgeComments: existingScore.knowledgeComments || ''
      });
    }
  }, [existingScore]);

  // Check localStorage for queued submission on mount and retry if safe
  const retryQueued = useCallback(async () => {
    const queueKey = `fitshow-queue-${catId}-${judgeId}`;
    const queuedData = localStorage.getItem(queueKey);

    if (!queuedData) {
      return;
    }

    try {
      const queued = JSON.parse(queuedData);

      // Check if queued entry is newer than current server score
      if (existingScore) {
        const queuedTimestamp = new Date(queued.timestamp).getTime();
        const serverTimestamp = new Date(existingScore.updatedAt).getTime();

        if (queuedTimestamp < serverTimestamp) {
          // Queued entry is older - discard it to avoid clobbering newer save
          console.warn(
            `Discarding stale queued submission (${new Date(queued.timestamp).toISOString()}) ` +
            `— server has newer save (${existingScore.updatedAt})`
          );
          localStorage.removeItem(queueKey);
          return;
        }
      }

      // Safe to replay - seed form and retry
      if (queued.scoreData) {
        setScoreData(queued.scoreData);
      }

      // Retry the submission
      await saveScore(false);
    } catch (error) {
      console.error('Error replaying queued submission:', error);
    }
  }, [catId, judgeId, existingScore]);

  useEffect(() => {
    // On mount, check for queued entry and retry if online
    if (navigator.onLine) {
      retryQueued();
    }

    // Add listener for online event
    const handleOnline = () => {
      retryQueued();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [retryQueued]);

  // Calculate category totals
  const calculateCategoryTotals = useCallback(() => {
    const exhibitorTotal = scoreData.attire + scoreData.attentive + scoreData.courteous;
    const showmanshipTotal = scoreData.controlEquipment + scoreData.pickupCarrying +
      scoreData.showingHeadShape + scoreData.showingBodyType +
      scoreData.showingTail + scoreData.showingCoatTexture;
    const presentationTotal = scoreData.showingMouthTeethGums + scoreData.conditionMouthTeethGums +
      scoreData.showingNose + scoreData.showingEyes + scoreData.conditionNoseEyes +
      scoreData.showingEars + scoreData.earsClean + scoreData.showingToenailsClaws +
      scoreData.toenailsClipped + scoreData.showingBellyCoatCleanliness + scoreData.coatCleanWellGroomed;
    const knowledgeTotal = scoreData.catHealthCare + scoreData.generalKnowledge +
      scoreData.catBreedsShowing + scoreData.catAnatomy + scoreData.fourHKnowledge;
    const totalScore = exhibitorTotal + showmanshipTotal + presentationTotal + knowledgeTotal;

    return {
      exhibitorTotal,
      showmanshipTotal,
      presentationTotal,
      knowledgeTotal,
      totalScore
    };
  }, [scoreData]);

  const totals = calculateCategoryTotals();

  // Validation function
  const validateScoreData = useCallback((): string[] => {
    const errors: string[] = [];

    // Validate appearance & demeanor scores
    if (scoreData.attire < 1 || scoreData.attire > 10) errors.push('Attire score must be between 1-10');
    if (scoreData.attentive < 1 || scoreData.attentive > 5) errors.push('Attentive score must be between 1-5');
    if (scoreData.courteous < 1 || scoreData.courteous > 5) errors.push('Courteous score must be between 1-5');

    // Validate handling & control scores
    if (scoreData.controlEquipment < 1 || scoreData.controlEquipment > 10) errors.push('Control/Equipment score must be between 1-10');
    if (scoreData.pickupCarrying < 1 || scoreData.pickupCarrying > 4) errors.push('Pickup/Carrying score must be between 1-4');

    // Validate demonstration skills scores
    if (scoreData.showingHeadShape < 1 || scoreData.showingHeadShape > 4) errors.push('Showing head shape score must be between 1-4');
    if (scoreData.showingBodyType < 1 || scoreData.showingBodyType > 4) errors.push('Showing body type score must be between 1-4');
    if (scoreData.showingTail < 1 || scoreData.showingTail > 4) errors.push('Showing tail score must be between 1-4');
    if (scoreData.showingCoatTexture < 1 || scoreData.showingCoatTexture > 4) errors.push('Showing coat texture score must be between 1-4');

    // Validate health examination scores
    if (scoreData.showingMouthTeethGums < 1 || scoreData.showingMouthTeethGums > 3) errors.push('Showing mouth/teeth/gums score must be between 1-3');
    if (scoreData.conditionMouthTeethGums < 1 || scoreData.conditionMouthTeethGums > 2) errors.push('Condition of mouth/teeth/gums score must be between 1-2');
    if (scoreData.showingNose < 1 || scoreData.showingNose > 2) errors.push('Showing nose score must be between 1-2');
    if (scoreData.showingEyes < 1 || scoreData.showingEyes > 2) errors.push('Showing eyes score must be between 1-2');
    if (scoreData.conditionNoseEyes < 1 || scoreData.conditionNoseEyes > 2) errors.push('Condition of nose & eyes score must be between 1-2');
    if (scoreData.showingEars < 1 || scoreData.showingEars > 2) errors.push('Showing ears score must be between 1-2');
    if (scoreData.earsClean < 1 || scoreData.earsClean > 2) errors.push('Ears clean score must be between 1-2');
    if (scoreData.showingToenailsClaws < 1 || scoreData.showingToenailsClaws > 3) errors.push('Showing toenails/claws score must be between 1-3');
    if (scoreData.toenailsClipped < 1 || scoreData.toenailsClipped > 6) errors.push('Toenails clipped score must be between 1-6');

    // Validate grooming & care scores
    if (scoreData.showingBellyCoatCleanliness < 1 || scoreData.showingBellyCoatCleanliness > 3) errors.push('Showing belly/coat/cleanliness score must be between 1-3');
    if (scoreData.coatCleanWellGroomed < 1 || scoreData.coatCleanWellGroomed > 8) errors.push('Coat clean & well groomed score must be between 1-8');
    if (scoreData.catHealthCare < 1 || scoreData.catHealthCare > 3) errors.push('Cat health/care score must be between 1-3');

    // Validate knowledge scores
    if (scoreData.generalKnowledge < 1 || scoreData.generalKnowledge > 3) errors.push('General knowledge score must be between 1-3');
    if (scoreData.catBreedsShowing < 1 || scoreData.catBreedsShowing > 3) errors.push('Cat breeds & showing score must be between 1-3');
    if (scoreData.catAnatomy < 1 || scoreData.catAnatomy > 3) errors.push('Cat anatomy score must be between 1-3');
    if (scoreData.fourHKnowledge < 1 || scoreData.fourHKnowledge > 3) errors.push('4-H knowledge score must be between 1-3');

    // Validate comment lengths
    if (scoreData.appearanceComments.length > 500) errors.push('Appearance comments must be 500 characters or less');
    if (scoreData.handlingComments.length > 500) errors.push('Handling comments must be 500 characters or less');
    if (scoreData.demonstrationComments.length > 500) errors.push('Demonstration comments must be 500 characters or less');
    if (scoreData.healthExaminationComments.length > 500) errors.push('Health examination comments must be 500 characters or less');
    if (scoreData.groomingCareComments.length > 500) errors.push('Grooming/Care comments must be 500 characters or less');
    if (scoreData.knowledgeComments.length > 500) errors.push('Knowledge comments must be 500 characters or less');

    return errors;
  }, [scoreData]);

  // GraphQL mutations
  const createFitShowScore = `
    mutation CreateFitShowScore($input: CreateFitShowScoreInput!) {
      createFitShowScore(input: $input) {
        id
        catId
        participantName
        judgeId
        judgeName
        attire
        attentive
        courteous
        controlEquipment
        pickupCarrying
        showingHeadShape
        showingBodyType
        showingTail
        showingCoatTexture
        showingMouthTeethGums
        conditionMouthTeethGums
        showingNose
        showingEyes
        conditionNoseEyes
        showingEars
        earsClean
        showingToenailsClaws
        toenailsClipped
        showingBellyCoatCleanliness
        coatCleanWellGroomed
        catHealthCare
        generalKnowledge
        catBreedsShowing
        catAnatomy
        fourHKnowledge
        appearanceTotal
        handlingTotal
        demonstrationTotal
        healthExaminationTotal
        groomingCareTotal
        knowledgeTotal
        totalScore
        appearanceComments
        handlingComments
        demonstrationComments
        healthExaminationComments
        groomingCareComments
        knowledgeComments
        createdAt
        updatedAt
        isFinalized
      }
    }
  `;

  const updateFitShowScore = `
    mutation UpdateFitShowScore($id: ID!, $input: UpdateFitShowScoreInput!) {
      updateFitShowScore(id: $id, input: $input) {
        id
        catId
        participantName
        judgeId
        judgeName
        attire
        attentive
        courteous
        controlEquipment
        pickupCarrying
        showingHeadShape
        showingBodyType
        showingTail
        showingCoatTexture
        showingMouthTeethGums
        conditionMouthTeethGums
        showingNose
        showingEyes
        conditionNoseEyes
        showingEars
        earsClean
        showingToenailsClaws
        toenailsClipped
        showingBellyCoatCleanliness
        coatCleanWellGroomed
        catHealthCare
        generalKnowledge
        catBreedsShowing
        catAnatomy
        fourHKnowledge
        appearanceTotal
        handlingTotal
        demonstrationTotal
        healthExaminationTotal
        groomingCareTotal
        knowledgeTotal
        totalScore
        appearanceComments
        handlingComments
        demonstrationComments
        healthExaminationComments
        groomingCareComments
        knowledgeComments
        createdAt
        updatedAt
        isFinalized
      }
    }
  `;

  // Auto-save functionality with debouncing
  useEffect(() => {
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Only auto-save for existing scores and when not already saving
    if (existingScore && autoSaveStatus === 'idle') {
      autoSaveTimeoutRef.current = setTimeout(async () => {
        setAutoSaveStatus('saving');
        try {
          await handleAutoSave();
          setAutoSaveStatus('saved');
          setTimeout(() => setAutoSaveStatus('idle'), 2000);
        } catch (error) {
          console.error('Auto-save failed:', error);
          setAutoSaveStatus('error');
          setTimeout(() => setAutoSaveStatus('idle'), 3000);
        }
      }, 2000);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [scoreData, existingScore, autoSaveStatus]);

  const handleAutoSave = async () => {
    const errors = validateScoreData();
    if (errors.length > 0) return; // Don't auto-save invalid data

    const updateInput: UpdateFitShowScoreInput = {
      participantName,
      // Individual scores
      attire: scoreData.attire,
      attentive: scoreData.attentive,
      courteous: scoreData.courteous,
      controlEquipment: scoreData.controlEquipment,
      pickupCarrying: scoreData.pickupCarrying,
      showingHeadShape: scoreData.showingHeadShape,
      showingBodyType: scoreData.showingBodyType,
      showingTail: scoreData.showingTail,
      showingCoatTexture: scoreData.showingCoatTexture,
      showingMouthTeethGums: scoreData.showingMouthTeethGums,
      conditionMouthTeethGums: scoreData.conditionMouthTeethGums,
      showingNose: scoreData.showingNose,
      showingEyes: scoreData.showingEyes,
      conditionNoseEyes: scoreData.conditionNoseEyes,
      showingEars: scoreData.showingEars,
      earsClean: scoreData.earsClean,
      showingToenailsClaws: scoreData.showingToenailsClaws,
      toenailsClipped: scoreData.toenailsClipped,
      showingBellyCoatCleanliness: scoreData.showingBellyCoatCleanliness,
      coatCleanWellGroomed: scoreData.coatCleanWellGroomed,
      catHealthCare: scoreData.catHealthCare,
      generalKnowledge: scoreData.generalKnowledge,
      catBreedsShowing: scoreData.catBreedsShowing,
      catAnatomy: scoreData.catAnatomy,
      fourHKnowledge: scoreData.fourHKnowledge,
      // Comments
      appearanceComments: scoreData.appearanceComments,
      handlingComments: scoreData.handlingComments,
      demonstrationComments: scoreData.demonstrationComments,
      healthExaminationComments: scoreData.healthExaminationComments,
      groomingCareComments: scoreData.groomingCareComments,
      knowledgeComments: scoreData.knowledgeComments,
      isFinalized: false
    };

    try {
      const result = await client.graphql({ query: updateFitShowScore, variables: { id: existingScore!.id, input: updateInput } });
      // Optionally update the existing score with the result
    } catch (error) {
      throw error; // Re-throw to be caught by the calling function
    }
  };

  const handleScoreChange = (field: string, value: number | string) => {
    setScoreData(prev => ({
      ...prev,
      [field]: value
    }));
    setAutoSaveStatus('idle');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateScoreData();
    setValidationErrors(errors);

    if (errors.length > 0) {
      onError?.('Please correct the validation errors before submitting.');
      return;
    }

    // Show optimistic feedback immediately
    setSubmitStatus('submitted');
    setNetworkError(null);
    setIsSubmitting(true);

    // Persist to localStorage before mutation
    const queueKey = `fitshow-queue-${catId}-${judgeId}`;
    const queuedEntry = {
      catId,
      judgeId,
      timestamp: new Date().toISOString(),
      scoreData
    };
    localStorage.setItem(queueKey, JSON.stringify(queuedEntry));

    try {
      await saveScore(false); // Never finalize from judge action
    } catch (error) {
      console.error('Error submitting fit and show score:', error);
      onError?.('Failed to submit score. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveScore = async (isFinalized: boolean) => {
    const queueKey = `fitshow-queue-${catId}-${judgeId}`;

    try {
      if (existingScore) {
        // Update existing score
        const updateInput: UpdateFitShowScoreInput = {
          participantName,
          // Individual scores
          attire: scoreData.attire,
          attentive: scoreData.attentive,
          courteous: scoreData.courteous,
          controlEquipment: scoreData.controlEquipment,
          pickupCarrying: scoreData.pickupCarrying,
          showingHeadShape: scoreData.showingHeadShape,
          showingBodyType: scoreData.showingBodyType,
          showingTail: scoreData.showingTail,
          showingCoatTexture: scoreData.showingCoatTexture,
          showingMouthTeethGums: scoreData.showingMouthTeethGums,
          conditionMouthTeethGums: scoreData.conditionMouthTeethGums,
          showingNose: scoreData.showingNose,
          showingEyes: scoreData.showingEyes,
          conditionNoseEyes: scoreData.conditionNoseEyes,
          showingEars: scoreData.showingEars,
          earsClean: scoreData.earsClean,
          showingToenailsClaws: scoreData.showingToenailsClaws,
          toenailsClipped: scoreData.toenailsClipped,
          showingBellyCoatCleanliness: scoreData.showingBellyCoatCleanliness,
          coatCleanWellGroomed: scoreData.coatCleanWellGroomed,
          catHealthCare: scoreData.catHealthCare,
          generalKnowledge: scoreData.generalKnowledge,
          catBreedsShowing: scoreData.catBreedsShowing,
          catAnatomy: scoreData.catAnatomy,
          fourHKnowledge: scoreData.fourHKnowledge,
          // Comments
          appearanceComments: scoreData.appearanceComments,
          handlingComments: scoreData.handlingComments,
          demonstrationComments: scoreData.demonstrationComments,
          healthExaminationComments: scoreData.healthExaminationComments,
          groomingCareComments: scoreData.groomingCareComments,
          knowledgeComments: scoreData.knowledgeComments,
          isFinalized: false,  // Always false for judge action
          ...(modificationReason && { modificationReason })  // Include reason if provided (admin override)
        };

        const result = await client.graphql({ query: updateFitShowScore, variables: { id: existingScore.id, input: updateInput } });
        const updatedScore = (result as any).data.updateFitShowScore;

        console.log('Updated score result:', updatedScore);
        console.log('isFinalized in result:', updatedScore.isFinalized);

        // Success - remove from queue and update status
        localStorage.removeItem(queueKey);
        setSubmitStatus('success');
        setTimeout(() => setSubmitStatus('idle'), 2000);

        onScoreSubmitted?.(updatedScore);
      } else {
        // Create new score
        const createInput: CreateFitShowScoreInput = {
          catId,
          participantName,
          // Individual scores
          attire: scoreData.attire,
          attentive: scoreData.attentive,
          courteous: scoreData.courteous,
          controlEquipment: scoreData.controlEquipment,
          pickupCarrying: scoreData.pickupCarrying,
          showingHeadShape: scoreData.showingHeadShape,
          showingBodyType: scoreData.showingBodyType,
          showingTail: scoreData.showingTail,
          showingCoatTexture: scoreData.showingCoatTexture,
          showingMouthTeethGums: scoreData.showingMouthTeethGums,
          conditionMouthTeethGums: scoreData.conditionMouthTeethGums,
          showingNose: scoreData.showingNose,
          showingEyes: scoreData.showingEyes,
          conditionNoseEyes: scoreData.conditionNoseEyes,
          showingEars: scoreData.showingEars,
          earsClean: scoreData.earsClean,
          showingToenailsClaws: scoreData.showingToenailsClaws,
          toenailsClipped: scoreData.toenailsClipped,
          showingBellyCoatCleanliness: scoreData.showingBellyCoatCleanliness,
          coatCleanWellGroomed: scoreData.coatCleanWellGroomed,
          catHealthCare: scoreData.catHealthCare,
          generalKnowledge: scoreData.generalKnowledge,
          catBreedsShowing: scoreData.catBreedsShowing,
          catAnatomy: scoreData.catAnatomy,
          fourHKnowledge: scoreData.fourHKnowledge,
          // Comments
          appearanceComments: scoreData.appearanceComments,
          handlingComments: scoreData.handlingComments,
          demonstrationComments: scoreData.demonstrationComments,
          healthExaminationComments: scoreData.healthExaminationComments,
          groomingCareComments: scoreData.groomingCareComments,
          knowledgeComments: scoreData.knowledgeComments,
          isFinalized: false  // Always false for judge action
        };

        const result = await client.graphql({ query: createFitShowScore, variables: { input: createInput } });
        const newScore = (result as any).data.createFitShowScore;

        // Success - remove from queue and update status
        localStorage.removeItem(queueKey);
        setSubmitStatus('success');
        setTimeout(() => setSubmitStatus('idle'), 2000);

        onScoreSubmitted?.(newScore);
      }
    } catch (error) {
      // Failure - keep in queue and show error handler
      setSubmitStatus('error');
      const networkErr: NetworkError = {
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        code: 'NETWORK_ERROR',
        operation: 'submit score',
        timestamp: new Date(),
        retryCount: 0
      };
      setNetworkError(networkErr);
      throw error;
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* Sticky Header with Totals */}
      <Paper elevation={3} sx={{ p: 3, mb: 3, bgcolor: '#fff8f0', border: '2px solid #ff9800', position: 'sticky', top: 0, zIndex: 100 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 'bold', mb: 1 }}>
            Fit and Show Scoring
          </Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body1">
            Participant: <Box component="span">{participantName}</Box>
          </Typography>
          <Typography variant="body1">
            Judge: <Box component="span">{judgeName}</Box>
          </Typography>
          <Typography variant="body1">
            Cat ID: <Box component="span">{catId}</Box>
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip
            label={`Total Score: ${totals.totalScore}/100`}
            color="warning"
            variant="filled"
            sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}
          />
          <Chip
            label={`Exhibitor: ${totals.exhibitorTotal}/20`}
            color="warning"
            variant="outlined"
          />
          <Chip
            label={`Showmanship: ${totals.showmanshipTotal}/30`}
            color="warning"
            variant="outlined"
          />
          <Chip
            label={`Presentation: ${totals.presentationTotal}/35`}
            color="warning"
            variant="outlined"
          />
          <Chip
            label={`Knowledge: ${totals.knowledgeTotal}/15`}
            color="warning"
            variant="outlined"
          />
        </Box>

        {autoSaveStatus !== 'idle' && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            {autoSaveStatus === 'saving' && <Typography color="warning.main">💾 Saving...</Typography>}
            {autoSaveStatus === 'saved' && <Typography color="success.main">✅ Saved</Typography>}
            {autoSaveStatus === 'error' && <Typography color="error.main">❌ Save failed</Typography>}
          </Box>
        )}
      </Paper>

      {submitStatus === 'submitted' && (
        <Alert severity="success" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={20} sx={{ color: 'success.main' }} />
          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
            Score submitted! Syncing to server...
          </Typography>
        </Alert>
      )}

      {submitStatus === 'success' && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
            ✅ Score submitted successfully!
          </Typography>
        </Alert>
      )}

      {validationErrors.length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>Please correct the following errors:</Typography>
          <ul>
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      {networkError && (
        <Box sx={{ mb: 3 }}>
          <FitShowNetworkErrorHandler
            error={networkError}
            onRetry={async () => {
              try {
                await saveScore(false);
              } catch (error) {
                // Error handler will update networkError state
              }
            }}
            autoRetry
            maxRetries={3}
          />
        </Box>
      )}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Exhibitor Section */}
          <Grid size={{ xs: 12 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#ff9800' }}>
                Exhibitor (20 pts)
              </Typography>
            </Box>
            <AppearanceScoring
              data-testid="appearance-scoring"
              attire={scoreData.attire}
              attentive={scoreData.attentive}
              courteous={scoreData.courteous}
              comments={scoreData.appearanceComments}
              total={totals.exhibitorTotal}
              onScoreChange={handleScoreChange}
            />
          </Grid>

          {/* Showing of Cat Showmanship Section */}
          <Grid size={{ xs: 12 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#ff9800' }}>
                Showing of Cat Showmanship (30 pts)
              </Typography>
            </Box>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <HandlingScoring
              data-testid="handling-scoring"
              controlEquipment={scoreData.controlEquipment}
              pickupCarrying={scoreData.pickupCarrying}
              comments={scoreData.handlingComments}
              total={scoreData.controlEquipment + scoreData.pickupCarrying}
              onScoreChange={handleScoreChange}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <DemonstrationScoring
              data-testid="demonstration-scoring"
              showingHeadShape={scoreData.showingHeadShape}
              showingBodyType={scoreData.showingBodyType}
              showingTail={scoreData.showingTail}
              showingCoatTexture={scoreData.showingCoatTexture}
              comments={scoreData.demonstrationComments}
              total={scoreData.showingHeadShape + scoreData.showingBodyType + scoreData.showingTail + scoreData.showingCoatTexture}
              onScoreChange={handleScoreChange}
            />
          </Grid>

          {/* Presentation & Appearance Section */}
          <Grid size={{ xs: 12 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#ff9800' }}>
                Presentation & Appearance (35 pts)
              </Typography>
            </Box>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <HealthExaminationScoring
              data-testid="health-examination-scoring"
              showingMouthTeethGums={scoreData.showingMouthTeethGums}
              conditionMouthTeethGums={scoreData.conditionMouthTeethGums}
              showingNose={scoreData.showingNose}
              showingEyes={scoreData.showingEyes}
              conditionNoseEyes={scoreData.conditionNoseEyes}
              showingEars={scoreData.showingEars}
              earsClean={scoreData.earsClean}
              showingToenailsClaws={scoreData.showingToenailsClaws}
              toenailsClipped={scoreData.toenailsClipped}
              comments={scoreData.healthExaminationComments}
              total={scoreData.showingMouthTeethGums + scoreData.conditionMouthTeethGums + scoreData.showingNose + scoreData.showingEyes + scoreData.conditionNoseEyes + scoreData.showingEars + scoreData.earsClean + scoreData.showingToenailsClaws + scoreData.toenailsClipped}
              onScoreChange={handleScoreChange}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <GroomingCareScoring
              data-testid="grooming-care-scoring"
              showingBellyCoatCleanliness={scoreData.showingBellyCoatCleanliness}
              coatCleanWellGroomed={scoreData.coatCleanWellGroomed}
              comments={scoreData.groomingCareComments}
              total={scoreData.showingBellyCoatCleanliness + scoreData.coatCleanWellGroomed}
              onScoreChange={handleScoreChange}
            />
          </Grid>

          {/* Knowledge of Exhibitor Section */}
          <Grid size={{ xs: 12 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#ff9800' }}>
                Knowledge of Exhibitor (15 pts)
              </Typography>
            </Box>
            <KnowledgeScoring
              data-testid="knowledge-scoring"
              catHealthCare={scoreData.catHealthCare}
              generalKnowledge={scoreData.generalKnowledge}
              catBreedsShowing={scoreData.catBreedsShowing}
              catAnatomy={scoreData.catAnatomy}
              fourHKnowledge={scoreData.fourHKnowledge}
              comments={scoreData.knowledgeComments}
              total={totals.knowledgeTotal}
              onScoreChange={handleScoreChange}
            />
          </Grid>

          {/* Action Button */}
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 4 }}>
              <Button
                type="submit"
                variant="contained"
                color="warning"
                disabled={isSubmitting}
                size="large"
                sx={{ fontWeight: 'bold' }}
                startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
              >
                {isSubmitting ? 'Submitting...' : (existingScore ? 'Update Score' : 'Submit Score')}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>

      {/* Mobile Floating Action Button for Submit */}
      {isMobile && (
        <Fab
          color="warning"
          aria-label="submit score"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: (theme) => theme.zIndex.speedDial,
          }}
          disabled={isSubmitting}
          onClick={() => {
            // Trigger form submission
            const form = document.querySelector('form');
            if (form) {
              const event = new Event('submit', { bubbles: true, cancelable: true });
              form.dispatchEvent(event);
            }
          }}
        >
          <CheckIcon />
        </Fab>
      )}
    </Box>
  );
};
