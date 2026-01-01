/**
 * Unit tests for class scoring validation utilities
 */

import {
  validateClassCategoryScore,
  validateClassCategoryComment,
  validateHealthGroomingComment,
  calculateClassTotalScore,
  calculateRibbonEligibility,
  validateCreateClassScoreInput,
  validateUpdateClassScoreInput,
  createClassScoreFromInput
} from '../scoringValidation';
import {
  CreateClassScoreInput,
  UpdateClassScoreInput,
  HealthGroomingChecklist
} from '../../types/scoring';

describe('Class Scoring Validation', () => {
  describe('validateClassCategoryScore', () => {
    it('should validate beauty score within range (0-15)', () => {
      expect(validateClassCategoryScore('beauty', 10)).toBeNull();
      expect(validateClassCategoryScore('beauty', 0)).toBeNull();
      expect(validateClassCategoryScore('beauty', 15)).toBeNull();
    });

    it('should validate personality score within range (0-20)', () => {
      expect(validateClassCategoryScore('personality', 10)).toBeNull();
      expect(validateClassCategoryScore('personality', 0)).toBeNull();
      expect(validateClassCategoryScore('personality', 20)).toBeNull();
    });

    it('should validate balance/proportion score within range (0-15)', () => {
      expect(validateClassCategoryScore('balanceProportion', 10)).toBeNull();
      expect(validateClassCategoryScore('balanceProportion', 0)).toBeNull();
      expect(validateClassCategoryScore('balanceProportion', 15)).toBeNull();
    });

    it('should reject scores above maximum', () => {
      const error = validateClassCategoryScore('beauty', 16);
      expect(error).not.toBeNull();
      expect(error?.message).toContain('cannot exceed 15 points');
    });

    it('should reject scores below minimum', () => {
      const error = validateClassCategoryScore('personality', -1);
      expect(error).not.toBeNull();
      expect(error?.message).toContain('cannot be less than 0');
    });

    it('should reject non-numeric scores', () => {
      const error = validateClassCategoryScore('beauty', NaN);
      expect(error).not.toBeNull();
      expect(error?.message).toContain('must be a valid number');
    });
  });

  describe('validateClassCategoryComment', () => {
    it('should allow valid comments', () => {
      expect(validateClassCategoryComment('beauty', 'Great appearance')).toBeNull();
      expect(validateClassCategoryComment('beauty', undefined)).toBeNull();
      expect(validateClassCategoryComment('beauty', '')).toBeNull();
    });

    it('should reject comments exceeding max length', () => {
      const longComment = 'a'.repeat(501);
      const error = validateClassCategoryComment('beauty', longComment);
      expect(error).not.toBeNull();
      expect(error?.message).toContain('cannot exceed 500 characters');
    });

    it('should reject non-string comments', () => {
      const error = validateClassCategoryComment('beauty', 123 as any);
      expect(error).not.toBeNull();
      expect(error?.message).toContain('must be a string');
    });
  });

  describe('validateHealthGroomingComment', () => {
    it('should allow valid health comments', () => {
      expect(validateHealthGroomingComment('Cat appears healthy')).toBeNull();
      expect(validateHealthGroomingComment(undefined)).toBeNull();
    });

    it('should reject comments exceeding max length', () => {
      const longComment = 'a'.repeat(1001);
      const error = validateHealthGroomingComment(longComment);
      expect(error).not.toBeNull();
      expect(error?.message).toContain('cannot exceed 1000 characters');
    });
  });

  describe('calculateClassTotalScore', () => {
    it('should calculate total score correctly', () => {
      const scores = {
        beautyScore: 12,
        personalityScore: 18,
        balanceProportionScore: 13
      };
      expect(calculateClassTotalScore(scores)).toBe(43);
    });

    it('should handle zero scores', () => {
      const scores = {
        beautyScore: 0,
        personalityScore: 0,
        balanceProportionScore: 0
      };
      expect(calculateClassTotalScore(scores)).toBe(0);
    });

    it('should handle maximum scores', () => {
      const scores = {
        beautyScore: 15,
        personalityScore: 20,
        balanceProportionScore: 15
      };
      expect(calculateClassTotalScore(scores)).toBe(50);
    });
  });

  describe('calculateRibbonEligibility', () => {
    const allHealthPassed: HealthGroomingChecklist = {
      coatCleanGroomed: true,
      teethGumsHealthy: true,
      eyesNoseClear: true,
      earsCleanMiteFree: true,
      toenailsClipped: true,
      fleaIssues: false
    };

    it('should award Blue ribbon for high scores with all health passed', () => {
      expect(calculateRibbonEligibility(47, allHealthPassed)).toBe('Blue');
      expect(calculateRibbonEligibility(45, allHealthPassed)).toBe('Blue');
      expect(calculateRibbonEligibility(50, allHealthPassed)).toBe('Blue');
    });

    it('should award Red ribbon for medium scores with all health passed', () => {
      expect(calculateRibbonEligibility(40, allHealthPassed)).toBe('Red');
      expect(calculateRibbonEligibility(35, allHealthPassed)).toBe('Red');
      expect(calculateRibbonEligibility(44, allHealthPassed)).toBe('Red');
    });

    it('should award White ribbon for lower scores with all health passed', () => {
      expect(calculateRibbonEligibility(30, allHealthPassed)).toBe('White');
      expect(calculateRibbonEligibility(25, allHealthPassed)).toBe('White');
      expect(calculateRibbonEligibility(34, allHealthPassed)).toBe('White');
    });

    it('should award Participation ribbon for very low scores', () => {
      expect(calculateRibbonEligibility(20, allHealthPassed)).toBe('Participation');
      expect(calculateRibbonEligibility(0, allHealthPassed)).toBe('Participation');
      expect(calculateRibbonEligibility(24, allHealthPassed)).toBe('Participation');
    });

    it('should award Red ribbon when health items fail regardless of score', () => {
      const healthFailed = { ...allHealthPassed, coatCleanGroomed: false };
      expect(calculateRibbonEligibility(50, healthFailed)).toBe('Red');
      expect(calculateRibbonEligibility(47, healthFailed)).toBe('Red');
    });

    it('should award Red ribbon when flea issues are present regardless of score', () => {
      const fleaIssues = { ...allHealthPassed, fleaIssues: true };
      expect(calculateRibbonEligibility(50, fleaIssues)).toBe('Red');
      expect(calculateRibbonEligibility(47, fleaIssues)).toBe('Red');
    });
  });

  describe('validateCreateClassScoreInput', () => {
    const validInput: CreateClassScoreInput = {
      catId: 'cat-123',
      beautyScore: 12,
      beautyComments: 'Beautiful cat',
      personalityScore: 18,
      personalityComments: 'Very friendly',
      balanceProportionScore: 13,
      balanceProportionComments: 'Well proportioned',
      coatCleanGroomed: true,
      teethGumsHealthy: true,
      eyesNoseClear: true,
      earsCleanMiteFree: true,
      toenailsClipped: true,
      fleaIssues: false,
      healthGroomingComments: 'Cat appears healthy',
      isFinalized: false
    };

    it('should validate correct input', () => {
      const result = validateCreateClassScoreInput(validInput);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing catId', () => {
      const input = { ...validInput, catId: '' };
      const result = validateCreateClassScoreInput(input);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'catId')).toBe(true);
    });

    it('should reject invalid scores', () => {
      const input = { ...validInput, beautyScore: 20 };
      const result = validateCreateClassScoreInput(input);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'beautyScore')).toBe(true);
    });

    it('should reject non-boolean health values', () => {
      const input = { ...validInput, coatCleanGroomed: 'true' as any };
      const result = validateCreateClassScoreInput(input);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'coatCleanGroomed')).toBe(true);
    });
  });

  describe('validateUpdateClassScoreInput', () => {
    it('should validate partial updates', () => {
      const input: UpdateClassScoreInput = {
        beautyScore: 14,
        personalityComments: 'Updated comment'
      };
      const result = validateUpdateClassScoreInput(input);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid partial scores', () => {
      const input: UpdateClassScoreInput = {
        personalityScore: 25 // exceeds max of 20
      };
      const result = validateUpdateClassScoreInput(input);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'personalityScore')).toBe(true);
    });
  });

  describe('createClassScoreFromInput', () => {
    const validInput: CreateClassScoreInput = {
      catId: 'cat-123',
      beautyScore: 12,
      beautyComments: 'Beautiful cat',
      personalityScore: 18,
      personalityComments: 'Very friendly',
      balanceProportionScore: 13,
      balanceProportionComments: 'Well proportioned',
      coatCleanGroomed: true,
      teethGumsHealthy: true,
      eyesNoseClear: true,
      earsCleanMiteFree: true,
      toenailsClipped: true,
      fleaIssues: false,
      healthGroomingComments: 'Cat appears healthy',
      isFinalized: false
    };

    it('should create complete ClassScore object', () => {
      const classScore = createClassScoreFromInput(
        validInput,
        'score-123',
        'judge-456',
        'Judge Smith'
      );

      expect(classScore.id).toBe('score-123');
      expect(classScore.catId).toBe('cat-123');
      expect(classScore.judgeId).toBe('judge-456');
      expect(classScore.judgeName).toBe('Judge Smith');
      expect(classScore.totalScore).toBe(43); // 12 + 18 + 13
      expect(classScore.ribbonEligibility).toBe('Red'); // 43 points with all health passed
      expect(classScore.timestamp).toBeDefined();
      expect(classScore.isFinalized).toBe(false);
    });

    it('should calculate Blue ribbon for high scores', () => {
      const highScoreInput = {
        ...validInput,
        beautyScore: 15,
        personalityScore: 20,
        balanceProportionScore: 12
      };
      const classScore = createClassScoreFromInput(
        highScoreInput,
        'score-123',
        'judge-456',
        'Judge Smith'
      );

      expect(classScore.totalScore).toBe(47);
      expect(classScore.ribbonEligibility).toBe('Blue');
    });

    it('should calculate Red ribbon when health fails', () => {
      const healthFailInput = {
        ...validInput,
        beautyScore: 15,
        personalityScore: 20,
        balanceProportionScore: 15,
        fleaIssues: true
      };
      const classScore = createClassScoreFromInput(
        healthFailInput,
        'score-123',
        'judge-456',
        'Judge Smith'
      );

      expect(classScore.totalScore).toBe(50);
      expect(classScore.ribbonEligibility).toBe('Red'); // Flea issues override high score
    });
  });
});