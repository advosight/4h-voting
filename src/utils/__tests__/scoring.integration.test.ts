/**
 * Integration tests for scoring utilities
 */

import {
  CreateScoreInput,
  validateCreateScoreInput,
  createScoreFromInput,
  validateScore,
  calculateTotalScore,
  SCORING_CATEGORIES,
  MAX_TOTAL_SCORE
} from '../scoring';

describe('Scoring Integration Tests', () => {
  test('should handle complete scoring workflow', () => {
    // Create a valid scoring input
    const input: CreateScoreInput = {
      catId: 'cat-123',
      cageConditionScore: 23,
      cageConditionComments: 'Excellent cage presentation with clean bedding and organized supplies',
      catConditionScore: 22,
      catConditionComments: 'Healthy cat with good body condition and calm temperament',
      groomingScore: 20,
      groomingComments: 'Well-groomed coat, clean ears and nails trimmed',
      overallScore: 24,
      overallComments: 'Outstanding overall presentation, very impressive entry',
      isFinalized: false
    };

    // Validate the input
    const inputValidation = validateCreateScoreInput(input);
    expect(inputValidation.isValid).toBe(true);
    expect(inputValidation.errors).toHaveLength(0);

    // Create a complete score object
    const score = createScoreFromInput(input, 'score-456', 'judge-789', 'Judge Johnson');

    // Verify the score was created correctly
    expect(score.id).toBe('score-456');
    expect(score.judgeId).toBe('judge-789');
    expect(score.judgeName).toBe('Judge Johnson');
    expect(score.totalScore).toBe(89); // 23 + 22 + 20 + 24

    // Validate the complete score object
    const scoreValidation = validateScore(score);
    expect(scoreValidation.isValid).toBe(true);
    expect(scoreValidation.errors).toHaveLength(0);
  });

  test('should handle edge case with minimum scores', () => {
    const input: CreateScoreInput = {
      catId: 'cat-456',
      cageConditionScore: 0,
      catConditionScore: 0,
      groomingScore: 0,
      overallScore: 0
    };

    const inputValidation = validateCreateScoreInput(input);
    expect(inputValidation.isValid).toBe(true);

    const score = createScoreFromInput(input, 'score-789', 'judge-123', 'Judge Wilson');
    expect(score.totalScore).toBe(0);

    const scoreValidation = validateScore(score);
    expect(scoreValidation.isValid).toBe(true);
  });

  test('should handle edge case with maximum scores', () => {
    const input: CreateScoreInput = {
      catId: 'cat-789',
      cageConditionScore: 25,
      catConditionScore: 25,
      groomingScore: 25,
      overallScore: 25
    };

    const inputValidation = validateCreateScoreInput(input);
    expect(inputValidation.isValid).toBe(true);

    const score = createScoreFromInput(input, 'score-999', 'judge-456', 'Judge Davis');
    expect(score.totalScore).toBe(MAX_TOTAL_SCORE);

    const scoreValidation = validateScore(score);
    expect(scoreValidation.isValid).toBe(true);
  });

  test('should reject invalid scoring workflow', () => {
    const invalidInput: CreateScoreInput = {
      catId: '', // Invalid: empty catId
      cageConditionScore: -5, // Invalid: below minimum
      catConditionScore: 30, // Invalid: above maximum
      groomingScore: 15,
      overallScore: 20
    };

    const inputValidation = validateCreateScoreInput(invalidInput);
    expect(inputValidation.isValid).toBe(false);
    expect(inputValidation.errors.length).toBeGreaterThan(0);

    // Should have errors for catId, cageConditionScore, and catConditionScore
    expect(inputValidation.errors.some(e => e.field === 'catId')).toBe(true);
    expect(inputValidation.errors.some(e => e.field === 'cageConditionScore')).toBe(true);
    expect(inputValidation.errors.some(e => e.field === 'catConditionScore')).toBe(true);
  });

  test('should verify all scoring categories are properly configured', () => {
    // Ensure all categories have the expected structure
    Object.entries(SCORING_CATEGORIES).forEach(([key, category]) => {
      expect(category.maxPoints).toBe(25);
      expect(category.description).toBeDefined();
      expect(category.field).toBeDefined();
      expect(category.commentField).toBeDefined();
      
      // Verify field names follow expected pattern
      expect(category.field).toContain('Score');
      expect(category.commentField).toContain('Comments');
    });

    // Verify total possible score
    const totalPossible = Object.values(SCORING_CATEGORIES).reduce(
      (sum, category) => sum + category.maxPoints, 
      0
    );
    expect(totalPossible).toBe(MAX_TOTAL_SCORE);
  });

  test('should handle score calculation consistency', () => {
    const scores = {
      cageConditionScore: 15,
      catConditionScore: 18,
      groomingScore: 22,
      overallScore: 19
    };

    const calculatedTotal = calculateTotalScore(scores);
    expect(calculatedTotal).toBe(74);

    // Verify this matches what createScoreFromInput would produce
    const input: CreateScoreInput = {
      catId: 'test-cat',
      ...scores
    };

    const score = createScoreFromInput(input, 'test-score', 'test-judge', 'Test Judge');
    expect(score.totalScore).toBe(calculatedTotal);
  });
});