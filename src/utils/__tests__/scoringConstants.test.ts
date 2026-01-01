/**
 * Unit tests for scoring constants and configuration
 */

import {
  SCORING_CATEGORIES,
  MAX_TOTAL_SCORE,
  MIN_SCORE_PER_CATEGORY,
  MAX_COMMENT_LENGTH,
  SCORING_CATEGORY_KEYS,
  SCORING_CATEGORY_LABELS
} from '../scoringConstants';

describe('SCORING_CATEGORIES', () => {
  test('should have all required categories', () => {
    const expectedCategories = ['cageCondition', 'catCondition', 'grooming', 'overall'];
    expectedCategories.forEach(category => {
      expect(SCORING_CATEGORIES).toHaveProperty(category);
    });
  });

  test('should have consistent max points for all categories', () => {
    Object.values(SCORING_CATEGORIES).forEach(category => {
      expect(category.maxPoints).toBe(25);
    });
  });

  test('should have descriptions for all categories', () => {
    Object.values(SCORING_CATEGORIES).forEach(category => {
      expect(category.description).toBeDefined();
      expect(typeof category.description).toBe('string');
      expect(category.description.length).toBeGreaterThan(0);
    });
  });

  test('should have correct field mappings', () => {
    expect(SCORING_CATEGORIES.cageCondition.field).toBe('cageConditionScore');
    expect(SCORING_CATEGORIES.cageCondition.commentField).toBe('cageConditionComments');
    
    expect(SCORING_CATEGORIES.catCondition.field).toBe('catConditionScore');
    expect(SCORING_CATEGORIES.catCondition.commentField).toBe('catConditionComments');
    
    expect(SCORING_CATEGORIES.grooming.field).toBe('groomingScore');
    expect(SCORING_CATEGORIES.grooming.commentField).toBe('groomingComments');
    
    expect(SCORING_CATEGORIES.overall.field).toBe('overallScore');
    expect(SCORING_CATEGORIES.overall.commentField).toBe('overallComments');
  });

  test('should have unique field names', () => {
    const fields = Object.values(SCORING_CATEGORIES).map(cat => cat.field);
    const commentFields = Object.values(SCORING_CATEGORIES).map(cat => cat.commentField);
    
    expect(new Set(fields).size).toBe(fields.length);
    expect(new Set(commentFields).size).toBe(commentFields.length);
  });
});

describe('Scoring constants', () => {
  test('should have correct maximum total score', () => {
    const expectedMax = Object.values(SCORING_CATEGORIES).reduce((sum, cat) => sum + cat.maxPoints, 0);
    expect(MAX_TOTAL_SCORE).toBe(expectedMax);
    expect(MAX_TOTAL_SCORE).toBe(100);
  });

  test('should have correct minimum score', () => {
    expect(MIN_SCORE_PER_CATEGORY).toBe(0);
  });

  test('should have reasonable comment length limit', () => {
    expect(MAX_COMMENT_LENGTH).toBe(500);
    expect(MAX_COMMENT_LENGTH).toBeGreaterThan(0);
  });
});

describe('SCORING_CATEGORY_KEYS', () => {
  test('should contain all category keys', () => {
    const expectedKeys = Object.keys(SCORING_CATEGORIES);
    expect(SCORING_CATEGORY_KEYS).toEqual(expectedKeys);
  });

  test('should have correct number of keys', () => {
    expect(SCORING_CATEGORY_KEYS).toHaveLength(4);
  });
});

describe('SCORING_CATEGORY_LABELS', () => {
  test('should have labels for all categories', () => {
    SCORING_CATEGORY_KEYS.forEach(key => {
      expect(SCORING_CATEGORY_LABELS).toHaveProperty(key);
      expect(typeof SCORING_CATEGORY_LABELS[key]).toBe('string');
      expect(SCORING_CATEGORY_LABELS[key].length).toBeGreaterThan(0);
    });
  });

  test('should have human-readable labels', () => {
    expect(SCORING_CATEGORY_LABELS.cageCondition).toBe('Cage Condition');
    expect(SCORING_CATEGORY_LABELS.catCondition).toBe('Cat Condition');
    expect(SCORING_CATEGORY_LABELS.grooming).toBe('Grooming');
    expect(SCORING_CATEGORY_LABELS.overall).toBe('Overall Presentation');
  });

  test('should have same keys as SCORING_CATEGORIES', () => {
    const labelKeys = Object.keys(SCORING_CATEGORY_LABELS);
    const categoryKeys = Object.keys(SCORING_CATEGORIES);
    expect(labelKeys.sort()).toEqual(categoryKeys.sort());
  });
});