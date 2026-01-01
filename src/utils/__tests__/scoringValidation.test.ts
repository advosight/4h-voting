/**
 * Unit tests for scoring validation utilities
 */

import {
  validateCategoryScore,
  validateCategoryComment,
  calculateTotalScore,
  validateCreateScoreInput,
  validateUpdateScoreInput,
  validateScore,
  createScoreFromInput
} from '../scoringValidation';
import { CreateScoreInput, UpdateScoreInput, Score } from '../../types/scoring';
import { SCORING_CATEGORIES, MAX_COMMENT_LENGTH } from '../scoringConstants';

describe('validateCategoryScore', () => {
  test('should return null for valid scores', () => {
    expect(validateCategoryScore('cageCondition', 0)).toBeNull();
    expect(validateCategoryScore('cageCondition', 15)).toBeNull();
    expect(validateCategoryScore('cageCondition', 25)).toBeNull();
  });

  test('should return error for scores below minimum', () => {
    const error = validateCategoryScore('cageCondition', -1);
    expect(error).not.toBeNull();
    expect(error?.message).toContain('cannot be less than 0');
    expect(error?.field).toBe('cageConditionScore');
  });

  test('should return error for scores above maximum', () => {
    const error = validateCategoryScore('cageCondition', 26);
    expect(error).not.toBeNull();
    expect(error?.message).toContain('cannot exceed 25 points');
    expect(error?.field).toBe('cageConditionScore');
  });

  test('should return error for non-numeric scores', () => {
    const error = validateCategoryScore('cageCondition', NaN);
    expect(error).not.toBeNull();
    expect(error?.message).toContain('must be a valid number');
  });

  test('should work for all category types', () => {
    Object.keys(SCORING_CATEGORIES).forEach(categoryKey => {
      const category = categoryKey as keyof typeof SCORING_CATEGORIES;
      expect(validateCategoryScore(category, 20)).toBeNull();
      
      const error = validateCategoryScore(category, 30);
      expect(error).not.toBeNull();
      expect(error?.field).toBe(SCORING_CATEGORIES[category].field);
    });
  });
});

describe('validateCategoryComment', () => {
  test('should return null for valid comments', () => {
    expect(validateCategoryComment('cageCondition', 'Good presentation')).toBeNull();
    expect(validateCategoryComment('cageCondition', '')).toBeNull();
    expect(validateCategoryComment('cageCondition', undefined)).toBeNull();
  });

  test('should return error for comments exceeding max length', () => {
    const longComment = 'a'.repeat(MAX_COMMENT_LENGTH + 1);
    const error = validateCategoryComment('cageCondition', longComment);
    expect(error).not.toBeNull();
    expect(error?.message).toContain(`cannot exceed ${MAX_COMMENT_LENGTH} characters`);
    expect(error?.field).toBe('cageConditionComments');
  });

  test('should return error for non-string comments', () => {
    const error = validateCategoryComment('cageCondition', 123 as any);
    expect(error).not.toBeNull();
    expect(error?.message).toContain('must be a string');
  });

  test('should work for all category types', () => {
    Object.keys(SCORING_CATEGORIES).forEach(categoryKey => {
      const category = categoryKey as keyof typeof SCORING_CATEGORIES;
      expect(validateCategoryComment(category, 'Valid comment')).toBeNull();
      
      const error = validateCategoryComment(category, 123 as any);
      expect(error).not.toBeNull();
      expect(error?.field).toBe(SCORING_CATEGORIES[category].commentField);
    });
  });
});

describe('calculateTotalScore', () => {
  test('should correctly sum all category scores', () => {
    const scores = {
      cageConditionScore: 20,
      catConditionScore: 22,
      groomingScore: 18,
      overallScore: 25
    };
    expect(calculateTotalScore(scores)).toBe(85);
  });

  test('should handle zero scores', () => {
    const scores = {
      cageConditionScore: 0,
      catConditionScore: 0,
      groomingScore: 0,
      overallScore: 0
    };
    expect(calculateTotalScore(scores)).toBe(0);
  });

  test('should handle maximum scores', () => {
    const scores = {
      cageConditionScore: 25,
      catConditionScore: 25,
      groomingScore: 25,
      overallScore: 25
    };
    expect(calculateTotalScore(scores)).toBe(100);
  });
});

describe('validateCreateScoreInput', () => {
  const validInput: CreateScoreInput = {
    catId: 'cat-123',
    cageConditionScore: 20,
    cageConditionComments: 'Clean and organized',
    catConditionScore: 22,
    catConditionComments: 'Healthy and alert',
    groomingScore: 18,
    groomingComments: 'Well groomed',
    overallScore: 25,
    overallComments: 'Excellent presentation',
    isFinalized: false
  };

  test('should validate correct input', () => {
    const result = validateCreateScoreInput(validInput);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should require catId', () => {
    const input = { ...validInput, catId: '' };
    const result = validateCreateScoreInput(input);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: 'catId',
        message: expect.stringContaining('Cat ID is required')
      })
    );
  });

  test('should validate all category scores', () => {
    const input = { 
      ...validInput, 
      cageConditionScore: -1,
      catConditionScore: 30
    };
    const result = validateCreateScoreInput(input);
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.errors.some(e => e.field === 'cageConditionScore')).toBe(true);
    expect(result.errors.some(e => e.field === 'catConditionScore')).toBe(true);
  });

  test('should validate comments', () => {
    const longComment = 'a'.repeat(MAX_COMMENT_LENGTH + 1);
    const input = { 
      ...validInput, 
      cageConditionComments: longComment
    };
    const result = validateCreateScoreInput(input);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: 'cageConditionComments',
        message: expect.stringContaining('cannot exceed')
      })
    );
  });

  test('should work without optional comments', () => {
    const input: CreateScoreInput = {
      catId: 'cat-123',
      cageConditionScore: 20,
      catConditionScore: 22,
      groomingScore: 18,
      overallScore: 25
    };
    const result = validateCreateScoreInput(input);
    expect(result.isValid).toBe(true);
  });
});

describe('validateUpdateScoreInput', () => {
  test('should validate partial updates', () => {
    const input: UpdateScoreInput = {
      cageConditionScore: 22,
      cageConditionComments: 'Updated comment'
    };
    const result = validateUpdateScoreInput(input);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should validate provided scores', () => {
    const input: UpdateScoreInput = {
      cageConditionScore: -5,
      groomingScore: 30
    };
    const result = validateUpdateScoreInput(input);
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(2);
  });

  test('should allow empty updates', () => {
    const input: UpdateScoreInput = {};
    const result = validateUpdateScoreInput(input);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should validate provided comments', () => {
    const longComment = 'a'.repeat(MAX_COMMENT_LENGTH + 1);
    const input: UpdateScoreInput = {
      overallComments: longComment
    };
    const result = validateUpdateScoreInput(input);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: 'overallComments'
      })
    );
  });
});

describe('validateScore', () => {
  const validScore: Score = {
    id: 'score-123',
    catId: 'cat-123',
    judgeId: 'judge-456',
    judgeName: 'Judge Smith',
    cageConditionScore: 20,
    cageConditionComments: 'Clean and organized',
    catConditionScore: 22,
    catConditionComments: 'Healthy and alert',
    groomingScore: 18,
    groomingComments: 'Well groomed',
    overallScore: 25,
    overallComments: 'Excellent presentation',
    totalScore: 85,
    timestamp: '2024-01-01T12:00:00Z',
    isFinalized: false
  };

  test('should validate complete score object', () => {
    const result = validateScore(validScore);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should require essential fields', () => {
    const score = { ...validScore, id: '', judgeId: undefined as any };
    const result = validateScore(score);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.field === 'id')).toBe(true);
    expect(result.errors.some(e => e.field === 'judgeId')).toBe(true);
  });

  test('should validate total score matches category sum', () => {
    const score = { ...validScore, totalScore: 999 };
    const result = validateScore(score);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: 'totalScore',
        message: expect.stringContaining('does not match sum')
      })
    );
  });

  test('should validate isFinalized is boolean', () => {
    const score = { ...validScore, isFinalized: 'true' as any };
    const result = validateScore(score);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: 'isFinalized',
        message: expect.stringContaining('must be a boolean')
      })
    );
  });

  test('should validate category scores and comments', () => {
    const score = { 
      ...validScore, 
      cageConditionScore: -1,
      groomingComments: 'a'.repeat(MAX_COMMENT_LENGTH + 1)
    };
    const result = validateScore(score);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});

describe('createScoreFromInput', () => {
  const input: CreateScoreInput = {
    catId: 'cat-123',
    cageConditionScore: 20,
    cageConditionComments: 'Clean and organized',
    catConditionScore: 22,
    catConditionComments: 'Healthy and alert',
    groomingScore: 18,
    groomingComments: 'Well groomed',
    overallScore: 25,
    overallComments: 'Excellent presentation',
    isFinalized: true
  };

  test('should create complete score object', () => {
    const score = createScoreFromInput(input, 'score-123', 'judge-456', 'Judge Smith');
    
    expect(score.id).toBe('score-123');
    expect(score.catId).toBe('cat-123');
    expect(score.judgeId).toBe('judge-456');
    expect(score.judgeName).toBe('Judge Smith');
    expect(score.cageConditionScore).toBe(20);
    expect(score.catConditionScore).toBe(22);
    expect(score.groomingScore).toBe(18);
    expect(score.overallScore).toBe(25);
    expect(score.totalScore).toBe(85);
    expect(score.isFinalized).toBe(true);
    expect(score.timestamp).toBeDefined();
    expect(new Date(score.timestamp)).toBeInstanceOf(Date);
  });

  test('should calculate correct total score', () => {
    const score = createScoreFromInput(input, 'score-123', 'judge-456', 'Judge Smith');
    const expectedTotal = 20 + 22 + 18 + 25;
    expect(score.totalScore).toBe(expectedTotal);
  });

  test('should handle missing optional fields', () => {
    const minimalInput: CreateScoreInput = {
      catId: 'cat-123',
      cageConditionScore: 10,
      catConditionScore: 15,
      groomingScore: 12,
      overallScore: 20
    };
    
    const score = createScoreFromInput(minimalInput, 'score-123', 'judge-456', 'Judge Smith');
    expect(score.cageConditionComments).toBeUndefined();
    expect(score.isFinalized).toBe(false);
    expect(score.totalScore).toBe(57);
  });

  test('should set current timestamp', () => {
    const beforeTime = new Date().toISOString();
    const score = createScoreFromInput(input, 'score-123', 'judge-456', 'Judge Smith');
    const afterTime = new Date().toISOString();
    
    expect(score.timestamp >= beforeTime).toBe(true);
    expect(score.timestamp <= afterTime).toBe(true);
  });
});