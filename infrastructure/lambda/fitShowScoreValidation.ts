import { CreateFitShowScoreInput, UpdateFitShowScoreInput } from './fitShowScoreDataAccess';

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validation rules for each scoring field
 */
const FIELD_RANGES: Record<string, { min: number; max: number; description: string }> = {
  // Appearance & Demeanor (20 points total)
  attire: { min: 1, max: 10, description: 'Neat, clean, appropriate attire' },
  attentive: { min: 1, max: 5, description: 'Attentive' },
  courteous: { min: 1, max: 5, description: 'Courteous' },
  
  // Handling & Control (14 points total)
  controlEquipment: { min: 1, max: 10, description: 'Control, harness fits, leash on wrist' },
  pickupCarrying: { min: 1, max: 4, description: 'Picking up & carrying of cat' },
  
  // Demonstration Skills (16 points total)
  showingHeadShape: { min: 1, max: 4, description: 'Showing head shape' },
  showingBodyType: { min: 1, max: 4, description: 'Showing body type' },
  showingTail: { min: 1, max: 4, description: 'Showing tail' },
  showingCoatTexture: { min: 1, max: 4, description: 'Showing coat texture' },
  
  // Health Examination (21 points total)
  showingMouthTeethGums: { min: 1, max: 3, description: 'Showing mouth/teeth/gums' },
  conditionMouthTeethGums: { min: 1, max: 2, description: 'Condition of mouth/teeth/gums' },
  showingNose: { min: 1, max: 2, description: 'Showing nose' },
  showingEyes: { min: 1, max: 2, description: 'Showing eyes' },
  conditionNoseEyes: { min: 1, max: 2, description: 'Condition of nose & eyes' },
  showingEars: { min: 1, max: 2, description: 'Showing ears' },
  earsClean: { min: 1, max: 2, description: 'Ears clean' },
  showingToenailsClaws: { min: 1, max: 3, description: 'Showing toenails/claws' },
  toenailsClipped: { min: 1, max: 6, description: 'Toenails clipped' },
  
  // Grooming & Care (14 points total)
  showingBellyCoatCleanliness: { min: 1, max: 3, description: 'Showing belly/coat/cleanliness' },
  coatCleanWellGroomed: { min: 1, max: 8, description: 'Coat clean & well groomed' },
  catHealthCare: { min: 1, max: 3, description: 'Cat health/care' },
  
  // Knowledge (12 points total)
  generalKnowledge: { min: 1, max: 3, description: 'General Knowledge' },
  catBreedsShowing: { min: 1, max: 3, description: 'Cat Breeds & Showing' },
  catAnatomy: { min: 1, max: 3, description: 'Cat Anatomy' },
  fourHKnowledge: { min: 1, max: 3, description: '4-H Knowledge' }
};

/**
 * Maximum points for each category
 */
export const CATEGORY_MAXIMUMS = {
  appearance: 20,    // 10 + 5 + 5
  handling: 14,      // 10 + 4
  demonstration: 16, // 4 + 4 + 4 + 4
  healthExamination: 24, // 3 + 2 + 2 + 2 + 2 + 2 + 2 + 3 + 6
  groomingCare: 14,  // 3 + 8 + 3
  knowledge: 12,     // 3 + 3 + 3 + 3
  total: 100         // 20 + 14 + 16 + 24 + 14 + 12 = 100
};

/**
 * Comment field maximum lengths
 */
const COMMENT_MAX_LENGTH = 500;

/**
 * Validate a single scoring field
 */
function validateScoreField(field: string, value: any): ValidationError | null {
  const range = FIELD_RANGES[field];
  if (!range) {
    return {
      field,
      message: `Unknown scoring field: ${field}`,
      value
    };
  }

  if (typeof value !== 'number') {
    return {
      field,
      message: `${range.description} must be a number`,
      value
    };
  }

  if (!Number.isInteger(value)) {
    return {
      field,
      message: `${range.description} must be a whole number`,
      value
    };
  }

  if (value < range.min || value > range.max) {
    return {
      field,
      message: `${range.description} must be between ${range.min} and ${range.max} points`,
      value
    };
  }

  return null;
}

/**
 * Validate a comment field
 */
function validateCommentField(field: string, value: any): ValidationError | null {
  if (value === undefined || value === null) {
    return null; // Comments are optional
  }

  if (typeof value !== 'string') {
    return {
      field,
      message: `${field} must be a string`,
      value
    };
  }

  if (value.length > COMMENT_MAX_LENGTH) {
    return {
      field,
      message: `${field} cannot exceed ${COMMENT_MAX_LENGTH} characters`,
      value
    };
  }

  return null;
}

/**
 * Validate required string fields
 */
function validateRequiredString(field: string, value: any, description: string): ValidationError | null {
  if (value === undefined || value === null) {
    return {
      field,
      message: `${description} is required`,
      value
    };
  }

  if (typeof value !== 'string') {
    return {
      field,
      message: `${description} must be a string`,
      value
    };
  }

  if (value === '' || value.trim().length === 0) {
    return {
      field,
      message: `${description} cannot be empty`,
      value
    };
  }

  return null;
}

/**
 * Validate create fit and show score input
 */
export function validateCreateFitShowScoreInput(input: CreateFitShowScoreInput): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate required fields
  const requiredStringFields = [
    { field: 'catId', description: 'Cat ID' },
    { field: 'participantName', description: 'Participant name' },
    { field: 'judgeId', description: 'Judge ID' },
    { field: 'judgeName', description: 'Judge name' }
  ];

  for (const { field, description } of requiredStringFields) {
    const error = validateRequiredString(field, (input as any)[field], description);
    if (error) {
      errors.push(error);
    }
  }

  // Validate all scoring fields
  const scoringFields = Object.keys(FIELD_RANGES);
  for (const field of scoringFields) {
    const error = validateScoreField(field, (input as any)[field]);
    if (error) {
      errors.push(error);
    }
  }

  // Validate comment fields
  const commentFields = [
    'appearanceComments',
    'handlingComments',
    'demonstrationComments',
    'healthExaminationComments',
    'groomingCareComments',
    'knowledgeComments'
  ];

  for (const field of commentFields) {
    const error = validateCommentField(field, (input as any)[field]);
    if (error) {
      errors.push(error);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate update fit and show score input
 */
export function validateUpdateFitShowScoreInput(input: UpdateFitShowScoreInput): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate ID field
  const idError = validateRequiredString('id', input.id, 'Score ID');
  if (idError) {
    errors.push(idError);
  }

  // Validate the rest using create validation
  const createValidation = validateCreateFitShowScoreInput(input);
  errors.push(...createValidation.errors);

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate calculated scores against expected maximums
 */
export function validateCalculatedScores(scores: {
  appearanceTotal: number;
  handlingTotal: number;
  demonstrationTotal: number;
  healthExaminationTotal: number;
  groomingCareTotal: number;
  knowledgeTotal: number;
  totalScore: number;
}): ValidationResult {
  const errors: ValidationError[] = [];

  const categoryChecks = [
    { field: 'appearanceTotal', value: scores.appearanceTotal, max: CATEGORY_MAXIMUMS.appearance, name: 'Appearance & Demeanor' },
    { field: 'handlingTotal', value: scores.handlingTotal, max: CATEGORY_MAXIMUMS.handling, name: 'Handling & Control' },
    { field: 'demonstrationTotal', value: scores.demonstrationTotal, max: CATEGORY_MAXIMUMS.demonstration, name: 'Demonstration Skills' },
    { field: 'healthExaminationTotal', value: scores.healthExaminationTotal, max: CATEGORY_MAXIMUMS.healthExamination, name: 'Health Examination' },
    { field: 'groomingCareTotal', value: scores.groomingCareTotal, max: CATEGORY_MAXIMUMS.groomingCare, name: 'Grooming & Care' },
    { field: 'knowledgeTotal', value: scores.knowledgeTotal, max: CATEGORY_MAXIMUMS.knowledge, name: 'Knowledge' },
    { field: 'totalScore', value: scores.totalScore, max: CATEGORY_MAXIMUMS.total, name: 'Total Score' }
  ];

  for (const check of categoryChecks) {
    if (check.value < 0) {
      errors.push({
        field: check.field,
        message: `${check.name} cannot be negative`,
        value: check.value
      });
    }

    if (check.value > check.max) {
      errors.push({
        field: check.field,
        message: `${check.name} cannot exceed ${check.max} points`,
        value: check.value
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get all scoring field names
 */
export function getScoringFieldNames(): string[] {
  return Object.keys(FIELD_RANGES);
}

/**
 * Get field range information
 */
export function getFieldRange(field: string): { min: number; max: number; description: string } | null {
  return FIELD_RANGES[field] || null;
}

/**
 * Get all field ranges
 */
export function getAllFieldRanges(): Record<string, { min: number; max: number; description: string }> {
  return { ...FIELD_RANGES };
}

/**
 * Validate that all required scoring fields are present
 */
export function validateAllScoringFieldsPresent(input: any): ValidationResult {
  const errors: ValidationError[] = [];
  const requiredFields = Object.keys(FIELD_RANGES);

  for (const field of requiredFields) {
    if (!(field in input)) {
      errors.push({
        field,
        message: `Required scoring field ${field} is missing`,
        value: undefined
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Create a comprehensive validation summary
 */
export function createValidationSummary(errors: ValidationError[]): string {
  if (errors.length === 0) {
    return 'All validations passed';
  }

  const summary = [`Found ${errors.length} validation error(s):`];
  
  for (const error of errors) {
    if (error.value !== undefined) {
      summary.push(`- ${error.field}: ${error.message} (received: ${error.value})`);
    } else {
      summary.push(`- ${error.field}: ${error.message}`);
    }
  }

  return summary.join('\n');
}