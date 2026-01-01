/**
 * Validation utilities for the 4H cat scoring system
 */

import { 
  Score, 
  CreateScoreInput, 
  UpdateScoreInput, 
  ValidationResult, 
  ValidationError,
  ClassScore,
  CreateClassScoreInput,
  UpdateClassScoreInput,
  HealthGroomingChecklist,
  RibbonType
} from '../types/scoring.ts';
import { 
  SCORING_CATEGORIES, 
  MAX_COMMENT_LENGTH, 
  MIN_SCORE_PER_CATEGORY,
  SCORING_CATEGORY_KEYS,
  CLASS_SCORING_CATEGORIES,
  MAX_CLASS_COMMENT_LENGTH,
  MAX_HEALTH_COMMENT_LENGTH,
  MIN_CLASS_SCORE_PER_CATEGORY,
  CLASS_SCORING_CATEGORY_KEYS,
  RIBBON_THRESHOLDS,
  HEALTH_GROOMING_ITEMS
} from './scoringConstants.ts';

/**
 * Validates a score value for a specific category
 */
export function validateCategoryScore(
  categoryKey: keyof typeof SCORING_CATEGORIES,
  score: number
): ValidationError | null {
  const category = SCORING_CATEGORIES[categoryKey];
  
  if (typeof score !== 'number' || isNaN(score)) {
    return {
      field: category.field,
      message: `${categoryKey} score must be a valid number`,
      value: score
    };
  }

  if (score < MIN_SCORE_PER_CATEGORY) {
    return {
      field: category.field,
      message: `${categoryKey} score cannot be less than ${MIN_SCORE_PER_CATEGORY}`,
      value: score
    };
  }

  if (score > category.maxPoints) {
    return {
      field: category.field,
      message: `${categoryKey} score cannot exceed ${category.maxPoints} points`,
      value: score
    };
  }

  return null;
}

/**
 * Validates a comment for a specific category
 */
export function validateCategoryComment(
  categoryKey: keyof typeof SCORING_CATEGORIES,
  comment?: string
): ValidationError | null {
  if (!comment) {
    return null; // Comments are optional
  }

  const category = SCORING_CATEGORIES[categoryKey];

  if (typeof comment !== 'string') {
    return {
      field: category.commentField,
      message: `${categoryKey} comment must be a string`,
      value: comment
    };
  }

  if (comment.length > MAX_COMMENT_LENGTH) {
    return {
      field: category.commentField,
      message: `${categoryKey} comment cannot exceed ${MAX_COMMENT_LENGTH} characters`,
      value: comment.length
    };
  }

  return null;
}

/**
 * Calculates the total score from individual category scores
 */
export function calculateTotalScore(scores: {
  firstImpressionScore: number;
  originalityScore: number;
  informationCardScore: number;
  workDoneByMemberScore: number;
  basicComfortScore: number;
  safetyScore: number;
  easyViewOfCatScore: number;
}): number {
  return scores.firstImpressionScore + 
         scores.originalityScore + 
         scores.informationCardScore + 
         scores.workDoneByMemberScore + 
         scores.basicComfortScore + 
         scores.safetyScore + 
         scores.easyViewOfCatScore;
}

/**
 * Validates a CreateScoreInput object
 */
export function validateCreateScoreInput(input: CreateScoreInput): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate required fields
  if (!input.catId || typeof input.catId !== 'string') {
    errors.push({
      field: 'catId',
      message: 'Cat ID is required and must be a string',
      value: input.catId
    });
  }

  // Validate all category scores
  SCORING_CATEGORY_KEYS.forEach(categoryKey => {
    const category = SCORING_CATEGORIES[categoryKey];
    const score = input[category.field];
    const comment = input[category.commentField];

    // Validate score
    const scoreError = validateCategoryScore(categoryKey, score);
    if (scoreError) {
      errors.push(scoreError);
    }

    // Validate comment
    const commentError = validateCategoryComment(categoryKey, comment);
    if (commentError) {
      errors.push(commentError);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates an UpdateScoreInput object
 */
export function validateUpdateScoreInput(input: UpdateScoreInput): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate category scores (only if provided)
  SCORING_CATEGORY_KEYS.forEach(categoryKey => {
    const category = SCORING_CATEGORIES[categoryKey];
    const score = input[category.field];
    const comment = input[category.commentField];

    // Validate score if provided
    if (score !== undefined) {
      const scoreError = validateCategoryScore(categoryKey, score);
      if (scoreError) {
        errors.push(scoreError);
      }
    }

    // Validate comment if provided
    if (comment !== undefined) {
      const commentError = validateCategoryComment(categoryKey, comment);
      if (commentError) {
        errors.push(commentError);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates a complete Score object
 */
export function validateScore(score: Partial<Score>): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate required fields
  const requiredFields = ['id', 'catId', 'judgeId', 'judgeName', 'timestamp'];
  requiredFields.forEach(field => {
    if (!score[field as keyof Score] || typeof score[field as keyof Score] !== 'string') {
      errors.push({
        field,
        message: `${field} is required and must be a string`,
        value: score[field as keyof Score]
      });
    }
  });

  // Validate boolean fields
  if (typeof score.isFinalized !== 'boolean') {
    errors.push({
      field: 'isFinalized',
      message: 'isFinalized must be a boolean',
      value: score.isFinalized
    });
  }

  // Validate category scores and comments
  SCORING_CATEGORY_KEYS.forEach(categoryKey => {
    const category = SCORING_CATEGORIES[categoryKey];
    const scoreValue = score[category.field];
    const comment = score[category.commentField];

    // Validate score
    if (scoreValue !== undefined) {
      const scoreError = validateCategoryScore(categoryKey, scoreValue);
      if (scoreError) {
        errors.push(scoreError);
      }
    }

    // Validate comment
    const commentError = validateCategoryComment(categoryKey, comment);
    if (commentError) {
      errors.push(commentError);
    }
  });

  // Validate total score if provided
  if (score.totalScore !== undefined) {
    const expectedTotal = calculateTotalScore({
      firstImpressionScore: score.firstImpressionScore || 0,
      originalityScore: score.originalityScore || 0,
      informationCardScore: score.informationCardScore || 0,
      workDoneByMemberScore: score.workDoneByMemberScore || 0,
      basicComfortScore: score.basicComfortScore || 0,
      safetyScore: score.safetyScore || 0,
      easyViewOfCatScore: score.easyViewOfCatScore || 0
    });

    if (score.totalScore !== expectedTotal) {
      errors.push({
        field: 'totalScore',
        message: `Total score (${score.totalScore}) does not match sum of category scores (${expectedTotal})`,
        value: score.totalScore
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Creates a complete Score object with calculated total from CreateScoreInput
 */
export function createScoreFromInput(
  input: CreateScoreInput,
  id: string,
  judgeId: string,
  judgeName: string
): Score {
  const totalScore = calculateTotalScore({
    firstImpressionScore: input.firstImpressionScore,
    originalityScore: input.originalityScore,
    informationCardScore: input.informationCardScore,
    workDoneByMemberScore: input.workDoneByMemberScore,
    basicComfortScore: input.basicComfortScore,
    safetyScore: input.safetyScore,
    easyViewOfCatScore: input.easyViewOfCatScore
  });

  return {
    id,
    catId: input.catId,
    judgeId,
    judgeName,
    firstImpressionScore: input.firstImpressionScore,
    firstImpressionComments: input.firstImpressionComments,
    originalityScore: input.originalityScore,
    originalityComments: input.originalityComments,
    informationCardScore: input.informationCardScore,
    informationCardComments: input.informationCardComments,
    workDoneByMemberScore: input.workDoneByMemberScore,
    workDoneByMemberComments: input.workDoneByMemberComments,
    basicComfortScore: input.basicComfortScore,
    basicComfortComments: input.basicComfortComments,
    safetyScore: input.safetyScore,
    safetyComments: input.safetyComments,
    easyViewOfCatScore: input.easyViewOfCatScore,
    easyViewOfCatComments: input.easyViewOfCatComments,
    totalScore,
    timestamp: new Date().toISOString(),
    isFinalized: input.isFinalized || false,
    modificationCount: 0,
    lastModifiedBy: judgeName,
    lastModifiedAt: new Date().toISOString()
  };
}

// Class Scoring Validation Functions

/**
 * Validates a class score value for a specific category
 */
export function validateClassCategoryScore(
  categoryKey: keyof typeof CLASS_SCORING_CATEGORIES,
  score: number
): ValidationError | null {
  const category = CLASS_SCORING_CATEGORIES[categoryKey];
  
  if (typeof score !== 'number' || isNaN(score)) {
    return {
      field: category.field,
      message: `${categoryKey} score must be a valid number`,
      value: score
    };
  }

  if (score < MIN_CLASS_SCORE_PER_CATEGORY) {
    return {
      field: category.field,
      message: `${categoryKey} score cannot be less than ${MIN_CLASS_SCORE_PER_CATEGORY}`,
      value: score
    };
  }

  if (score > category.maxPoints) {
    return {
      field: category.field,
      message: `${categoryKey} score cannot exceed ${category.maxPoints} points`,
      value: score
    };
  }

  return null;
}

/**
 * Validates a class score comment for a specific category
 */
export function validateClassCategoryComment(
  categoryKey: keyof typeof CLASS_SCORING_CATEGORIES,
  comment?: string
): ValidationError | null {
  if (!comment) {
    return null; // Comments are optional
  }

  const category = CLASS_SCORING_CATEGORIES[categoryKey];

  if (typeof comment !== 'string') {
    return {
      field: category.commentField,
      message: `${categoryKey} comment must be a string`,
      value: comment
    };
  }

  if (comment.length > MAX_CLASS_COMMENT_LENGTH) {
    return {
      field: category.commentField,
      message: `${categoryKey} comment cannot exceed ${MAX_CLASS_COMMENT_LENGTH} characters`,
      value: comment.length
    };
  }

  return null;
}

/**
 * Validates health/grooming comments
 */
export function validateHealthGroomingComment(comment?: string): ValidationError | null {
  if (!comment) {
    return null; // Comments are optional
  }

  if (typeof comment !== 'string') {
    return {
      field: 'healthGroomingComments',
      message: 'Health/grooming comment must be a string',
      value: comment
    };
  }

  if (comment.length > MAX_HEALTH_COMMENT_LENGTH) {
    return {
      field: 'healthGroomingComments',
      message: `Health/grooming comment cannot exceed ${MAX_HEALTH_COMMENT_LENGTH} characters`,
      value: comment.length
    };
  }

  return null;
}

/**
 * Calculates the total class score from individual category scores
 */
export function calculateClassTotalScore(scores: {
  beautyScore: number;
  personalityScore: number;
  balanceProportionScore: number;
}): number {
  return scores.beautyScore + scores.personalityScore + scores.balanceProportionScore;
}

/**
 * Determines ribbon eligibility based on total score and health/grooming checklist
 */
export function calculateRibbonEligibility(
  totalScore: number,
  healthChecklist: HealthGroomingChecklist
): RibbonType {
  // Check if all health items pass (excluding flea issues which is a negative indicator)
  const healthItemsPassed = healthChecklist.coatCleanGroomed &&
                           healthChecklist.teethGumsHealthy &&
                           healthChecklist.eyesNoseClear &&
                           healthChecklist.earsCleanMiteFree &&
                           healthChecklist.toenailsClipped;

  // If any health item fails OR flea issues are present, Red Ribbon regardless of score
  if (!healthItemsPassed || healthChecklist.fleaIssues) {
    return 'Red';
  }

  // Determine ribbon based on score thresholds
  if (totalScore >= RIBBON_THRESHOLDS.BLUE.minScore && totalScore <= RIBBON_THRESHOLDS.BLUE.maxScore) {
    return 'Blue';
  } else if (totalScore >= RIBBON_THRESHOLDS.RED.minScore && totalScore <= RIBBON_THRESHOLDS.RED.maxScore) {
    return 'Red';
  } else if (totalScore >= RIBBON_THRESHOLDS.WHITE.minScore && totalScore <= RIBBON_THRESHOLDS.WHITE.maxScore) {
    return 'White';
  } else {
    return 'Participation';
  }
}

/**
 * Validates a CreateClassScoreInput object
 */
export function validateCreateClassScoreInput(input: CreateClassScoreInput): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate required fields
  if (!input.catId || typeof input.catId !== 'string') {
    errors.push({
      field: 'catId',
      message: 'Cat ID is required and must be a string',
      value: input.catId
    });
  }

  // Validate all class scoring category scores
  CLASS_SCORING_CATEGORY_KEYS.forEach(categoryKey => {
    const category = CLASS_SCORING_CATEGORIES[categoryKey];
    const score = input[category.field as keyof CreateClassScoreInput] as number;
    const comment = input[category.commentField as keyof CreateClassScoreInput] as string;

    // Validate score
    const scoreError = validateClassCategoryScore(categoryKey, score);
    if (scoreError) {
      errors.push(scoreError);
    }

    // Validate comment
    const commentError = validateClassCategoryComment(categoryKey, comment);
    if (commentError) {
      errors.push(commentError);
    }
  });

  // Validate health/grooming boolean fields
  const healthFields = Object.keys(HEALTH_GROOMING_ITEMS) as Array<keyof HealthGroomingChecklist>;
  healthFields.forEach(field => {
    const value = input[field];
    if (typeof value !== 'boolean') {
      errors.push({
        field,
        message: `${field} must be a boolean value`,
        value
      });
    }
  });

  // Validate health/grooming comments
  const healthCommentError = validateHealthGroomingComment(input.healthGroomingComments);
  if (healthCommentError) {
    errors.push(healthCommentError);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates an UpdateClassScoreInput object
 */
export function validateUpdateClassScoreInput(input: UpdateClassScoreInput): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate class scoring category scores (only if provided)
  CLASS_SCORING_CATEGORY_KEYS.forEach(categoryKey => {
    const category = CLASS_SCORING_CATEGORIES[categoryKey];
    const score = input[category.field as keyof UpdateClassScoreInput] as number;
    const comment = input[category.commentField as keyof UpdateClassScoreInput] as string;

    // Validate score if provided
    if (score !== undefined) {
      const scoreError = validateClassCategoryScore(categoryKey, score);
      if (scoreError) {
        errors.push(scoreError);
      }
    }

    // Validate comment if provided
    if (comment !== undefined) {
      const commentError = validateClassCategoryComment(categoryKey, comment);
      if (commentError) {
        errors.push(commentError);
      }
    }
  });

  // Validate health/grooming boolean fields (only if provided)
  const healthFields = Object.keys(HEALTH_GROOMING_ITEMS) as Array<keyof HealthGroomingChecklist>;
  healthFields.forEach(field => {
    const value = input[field];
    if (value !== undefined && typeof value !== 'boolean') {
      errors.push({
        field,
        message: `${field} must be a boolean value`,
        value
      });
    }
  });

  // Validate health/grooming comments if provided
  if (input.healthGroomingComments !== undefined) {
    const healthCommentError = validateHealthGroomingComment(input.healthGroomingComments);
    if (healthCommentError) {
      errors.push(healthCommentError);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Creates a complete ClassScore object with calculated total and ribbon eligibility from CreateClassScoreInput
 */
export function createClassScoreFromInput(
  input: CreateClassScoreInput,
  id: string,
  judgeId: string,
  judgeName: string
): ClassScore {
  const totalScore = calculateClassTotalScore({
    beautyScore: input.beautyScore,
    personalityScore: input.personalityScore,
    balanceProportionScore: input.balanceProportionScore
  });

  const healthChecklist: HealthGroomingChecklist = {
    coatCleanGroomed: input.coatCleanGroomed,
    teethGumsHealthy: input.teethGumsHealthy,
    eyesNoseClear: input.eyesNoseClear,
    earsCleanMiteFree: input.earsCleanMiteFree,
    toenailsClipped: input.toenailsClipped,
    fleaIssues: input.fleaIssues
  };

  const ribbonEligibility = calculateRibbonEligibility(totalScore, healthChecklist);

  return {
    id,
    catId: input.catId,
    judgeId,
    judgeName,
    beautyScore: input.beautyScore,
    beautyComments: input.beautyComments,
    personalityScore: input.personalityScore,
    personalityComments: input.personalityComments,
    balanceProportionScore: input.balanceProportionScore,
    balanceProportionComments: input.balanceProportionComments,
    coatCleanGroomed: input.coatCleanGroomed,
    teethGumsHealthy: input.teethGumsHealthy,
    eyesNoseClear: input.eyesNoseClear,
    earsCleanMiteFree: input.earsCleanMiteFree,
    toenailsClipped: input.toenailsClipped,
    fleaIssues: input.fleaIssues,
    healthGroomingComments: input.healthGroomingComments,
    totalScore,
    ribbonEligibility,
    timestamp: new Date().toISOString(),
    isFinalized: input.isFinalized || false
  };
}