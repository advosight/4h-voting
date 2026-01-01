import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Chip,
  Slider,
  Grid,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';
import { generateClient } from 'aws-amplify/api';
import { FitShowScore, CreateFitShowScoreInput, UpdateFitShowScoreInput } from '../types/scoring';
import { ValidationSummary } from './ValidationErrorDisplay';

const client = generateClient();

interface FitShowScoringFormProps {
  catId: string;
  participantName: string;
  judgeId: string;
  judgeName: string;
  existingScore?: FitShowScore;
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

  // Health Examination (21 points)
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
  // Appearance & Demeanor (20 points max)
  attire: 10,        // max 10
  attentive: 5,      // max 5
  courteous: 5,      // max 5

  // Handling & Control (14 points max)
  controlEquipment: 10,  // max 10
  pickupCarrying: 4,     // max 4

  // Demonstration Skills (16 points max)
  showingHeadShape: 4,     // max 4
  showingBodyType: 4,      // max 4
  showingTail: 4,          // max 4
  showingCoatTexture: 4,   // max 4

  // Health Examination (21 points max)
  showingMouthTeethGums: 3,    // max 3
  conditionMouthTeethGums: 2,  // max 2
  showingNose: 2,              // max 2
  showingEyes: 2,              // max 2
  conditionNoseEyes: 2,        // max 2
  showingEars: 2,              // max 2
  earsClean: 2,                // max 2
  showingToenailsClaws: 3,     // max 3
  toenailsClipped: 6,          // max 6

  // Grooming & Care (14 points max)
  showingBellyCoatCleanliness: 3,  // max 3
  coatCleanWellGroomed: 8,         // max 8
  catHealthCare: 3,                // max 3

  // Knowledge (12 points max)
  generalKnowledge: 3,    // max 3
  catBreedsShowing: 3,    // max 3
  catAnatomy: 3,          // max 3
  fourHKnowledge: 3,      // max 3

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
  onScoreSubmitted,
  onError
}) => {
  const [scoreData, setScoreData] = useState<FitShowScoreData>(initialScoreData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Calculate category totals
  const calculateCategoryTotals = useCallback(() => {
    const appearanceTotal = scoreData.attire + scoreData.attentive + scoreData.courteous;
    const handlingTotal = scoreData.controlEquipment + scoreData.pickupCarrying;
    const demonstrationTotal = scoreData.showingHeadShape + scoreData.showingBodyType +
      scoreData.showingTail + scoreData.showingCoatTexture;
    const healthExaminationTotal = scoreData.showingMouthTeethGums + scoreData.conditionMouthTeethGums +
      scoreData.showingNose + scoreData.showingEyes + scoreData.conditionNoseEyes +
      scoreData.showingEars + scoreData.earsClean + scoreData.showingToenailsClaws +
      scoreData.toenailsClipped;
    const groomingCareTotal = scoreData.showingBellyCoatCleanliness + scoreData.coatCleanWellGroomed +
      scoreData.catHealthCare;
    const knowledgeTotal = scoreData.generalKnowledge + scoreData.catBreedsShowing +
      scoreData.catAnatomy + scoreData.fourHKnowledge;
    const totalScore = appearanceTotal + handlingTotal + demonstrationTotal +
      healthExaminationTotal + groomingCareTotal + knowledgeTotal;

    return {
      appearanceTotal,
      handlingTotal,
      demonstrationTotal,
      healthExaminationTotal,
      groomingCareTotal,
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

  const handleSaveDraft = async () => {
    const errors = validateScoreData();
    setValidationErrors(errors);

    if (errors.length > 0) {
      onError?.('Please correct the validation errors before saving.');
      return;
    }

    setIsSubmitting(true);

    try {
      await saveScore(false); // Save as draft (isFinalized: false)
    } catch (error) {
      console.error('Error saving fit and show score draft:', error);
      onError?.('Failed to save draft. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateScoreData();
    setValidationErrors(errors);

    if (errors.length > 0) {
      onError?.('Please correct the validation errors before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      await saveScore(true); // Submit as finalized (isFinalized: true)
    } catch (error) {
      console.error('Error submitting fit and show score:', error);
      onError?.('Failed to submit score. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveScore = async (isFinalized: boolean) => {
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
        isFinalized
      };

      const result = await client.graphql({ query: updateFitShowScore, variables: { id: existingScore.id, input: updateInput } });
      const updatedScore = (result as any).data.updateFitShowScore;

      console.log('Updated score result:', updatedScore);
      console.log('isFinalized in result:', updatedScore.isFinalized);

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
        isFinalized
      };

      const result = await client.graphql({ query: createFitShowScore, variables: { input: createInput } });
      const newScore = (result as any).data.createFitShowScore;

      onScoreSubmitted?.(newScore);
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* Sticky Header with Totals */}
      <Paper elevation={3} sx={{ p: 3, mb: 3, bgcolor: '#fff8f0', border: '2px solid #ff9800', position: 'sticky', top: 0, zIndex: 100 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Box sx={{
            bgcolor: '#ff9800',
            color: 'white',
            borderRadius: '50%',
            width: 56,
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem'
          }}>
            🎓
          </Box>
          <Box>
            <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
              Fit & Show Scoring
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Participant: {participantName} • Judge: {judgeName}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip
            label={`Total Score: ${totals.totalScore}/100`}
            color="warning"
            variant="filled"
            sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}
          />
          <Chip
            label={`Appearance: ${totals.appearanceTotal}/20`}
            color="warning"
            variant="outlined"
          />
          <Chip
            label={`Handling: ${totals.handlingTotal}/14`}
            color="warning"
            variant="outlined"
          />
          <Chip
            label={`Demo: ${totals.demonstrationTotal}/16`}
            color="warning"
            variant="outlined"
          />
          <Chip
            label={`Health: ${totals.healthExaminationTotal}/21`}
            color="warning"
            variant="outlined"
          />
          <Chip
            label={`Grooming: ${totals.groomingCareTotal}/14`}
            color="warning"
            variant="outlined"
          />
          <Chip
            label={`Knowledge: ${totals.knowledgeTotal}/12`}
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

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Appearance & Demeanor Section */}
          <Grid size={{ xs: 12 }}>
            <Card elevation={2} sx={{ border: '2px solid #ff9800' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ mr: 2, fontSize: '2rem' }}>👔</Box>
                  <Typography variant="h6" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                    Appearance & Demeanor ({totals.appearanceTotal}/20)
                  </Typography>
                </Box>

                <Grid container spacing={3}>
                  {/* Attire */}
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Card sx={{ p: 2, border: '1px solid #ff9800' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, color: '#ff9800' }}>
                        Neat, Clean, Appropriate Attire (1-10)
                      </Typography>
                      <TextField
                        type="number"
                        label="Score"
                        value={scoreData.attire}
                        onChange={(e) => handleScoreChange('attire', parseInt(e.target.value) || 1)}
                        slotProps={{ htmlInput: { min: 1, max: 10 } }}
                        fullWidth
                        sx={{ mb: 1 }}
                      />
                      <Slider
                        value={scoreData.attire}
                        onChange={(_, value) => handleScoreChange('attire', value as number)}
                        min={1}
                        max={10}
                        marks
                        step={1}
                        valueLabelDisplay="auto"
                        sx={{ color: '#ff9800' }}
                      />
                    </Card>
                  </Grid>

                  {/* Attentive */}
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Card sx={{ p: 2, border: '1px solid #ff9800' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, color: '#ff9800' }}>
                        Attentive (1-5)
                      </Typography>
                      <TextField
                        type="number"
                        label="Score"
                        value={scoreData.attentive}
                        onChange={(e) => handleScoreChange('attentive', parseInt(e.target.value) || 1)}
                        slotProps={{ htmlInput: { min: 1, max: 5 } }}
                        fullWidth
                        sx={{ mb: 1 }}
                      />
                      <Slider
                        value={scoreData.attentive}
                        onChange={(_, value) => handleScoreChange('attentive', value as number)}
                        min={1}
                        max={5}
                        marks
                        step={1}
                        valueLabelDisplay="auto"
                        sx={{ color: '#ff9800' }}
                      />
                    </Card>
                  </Grid>

                  {/* Courteous */}
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Card sx={{ p: 2, border: '1px solid #ff9800' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, color: '#ff9800' }}>
                        Courteous (1-5)
                      </Typography>
                      <TextField
                        type="number"
                        label="Score"
                        value={scoreData.courteous}
                        onChange={(e) => handleScoreChange('courteous', parseInt(e.target.value) || 1)}
                        slotProps={{ htmlInput: { min: 1, max: 5 } }}
                        fullWidth
                        sx={{ mb: 1 }}
                      />
                      <Slider
                        value={scoreData.courteous}
                        onChange={(_, value) => handleScoreChange('courteous', value as number)}
                        min={1}
                        max={5}
                        marks
                        step={1}
                        valueLabelDisplay="auto"
                        sx={{ color: '#ff9800' }}
                      />
                    </Card>
                  </Grid>

                  {/* Comments */}
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      multiline
                      rows={3}
                      label="Appearance Comments (optional, max 500 characters)"
                      value={scoreData.appearanceComments}
                      onChange={(e) => handleScoreChange('appearanceComments', e.target.value)}
                      placeholder="Add comments about the participant's appearance and demeanor..."
                      fullWidth
                      slotProps={{ htmlInput: { maxLength: 500 } }}
                      helperText={`${scoreData.appearanceComments.length}/500 characters`}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Handling & Control Section */}
          <Grid size={{ xs: 12 }}>
            <Card elevation={2} sx={{ border: '2px solid #ff9800' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ mr: 2, fontSize: '2rem' }}>🤲</Box>
                  <Typography variant="h6" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                    Handling & Control ({totals.handlingTotal}/14)
                  </Typography>
                </Box>

                <Grid container spacing={3}>
                  {/* Control Equipment */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ p: 2, border: '1px solid #ff9800' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, color: '#ff9800' }}>
                        Control/Equipment (1-10)
                      </Typography>
                      <TextField
                        type="number"
                        label="Score"
                        value={scoreData.controlEquipment}
                        onChange={(e) => handleScoreChange('controlEquipment', parseInt(e.target.value) || 1)}
                        slotProps={{ htmlInput: { min: 1, max: 10 } }}
                        fullWidth
                        sx={{ mb: 1 }}
                      />
                      <Slider
                        value={scoreData.controlEquipment}
                        onChange={(_, value) => handleScoreChange('controlEquipment', value as number)}
                        min={1}
                        max={10}
                        marks
                        step={1}
                        valueLabelDisplay="auto"
                        sx={{ color: '#ff9800' }}
                      />
                    </Card>
                  </Grid>

                  {/* Pickup Carrying */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ p: 2, border: '1px solid #ff9800' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, color: '#ff9800' }}>
                        Pickup/Carrying (1-4)
                      </Typography>
                      <TextField
                        type="number"
                        label="Score"
                        value={scoreData.pickupCarrying}
                        onChange={(e) => handleScoreChange('pickupCarrying', parseInt(e.target.value) || 1)}
                        slotProps={{ htmlInput: { min: 1, max: 4 } }}
                        fullWidth
                        sx={{ mb: 1 }}
                      />
                      <Slider
                        value={scoreData.pickupCarrying}
                        onChange={(_, value) => handleScoreChange('pickupCarrying', value as number)}
                        min={1}
                        max={4}
                        marks
                        step={1}
                        valueLabelDisplay="auto"
                        sx={{ color: '#ff9800' }}
                      />
                    </Card>
                  </Grid>

                  {/* Comments */}
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      multiline
                      rows={3}
                      label="Handling Comments (optional, max 500 characters)"
                      value={scoreData.handlingComments}
                      onChange={(e) => handleScoreChange('handlingComments', e.target.value)}
                      placeholder="Add comments about handling and control..."
                      fullWidth
                      slotProps={{ htmlInput: { maxLength: 500 } }}
                      helperText={`${scoreData.handlingComments.length}/500 characters`}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Action Buttons */}
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 4 }}>
              <Button
                variant="outlined"
                color="warning"
                disabled={isSubmitting}
                size="large"
                onClick={handleSaveDraft}
                startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
              >
                {isSubmitting ? 'Saving...' : 'Save Draft'}
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="warning"
                disabled={isSubmitting}
                size="large"
                sx={{ fontWeight: 'bold' }}
                startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
              >
                {isSubmitting ? 'Submitting...' : 'Submit & Finalize Score'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
};