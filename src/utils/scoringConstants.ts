/**
 * Scoring constants and configuration for the 4H cat scoring system
 */

import { ScoringCategory, ClassScoringCategory } from '../types/scoring';

export const SCORING_CATEGORIES: Record<string, ScoringCategory> = {
  firstImpression: {
    maxPoints: 10,
    description: "Initial visual impact and presentation",
    field: 'firstImpressionScore',
    commentField: 'firstImpressionComments'
  },
  originality: {
    maxPoints: 15,
    description: "Creativity and uniqueness of cage decoration",
    field: 'originalityScore',
    commentField: 'originalityComments'
  },
  informationCard: {
    maxPoints: 15,
    description: "Quality and completeness of information card",
    field: 'informationCardScore',
    commentField: 'informationCardComments'
  },
  workDoneByMember: {
    maxPoints: 15,
    description: "Evidence of member's personal work and effort",
    field: 'workDoneByMemberScore',
    commentField: 'workDoneByMemberComments'
  },
  basicComfort: {
    maxPoints: 15,
    description: "Cat comfort, space, and basic needs met",
    field: 'basicComfortScore',
    commentField: 'basicComfortComments'
  },
  safety: {
    maxPoints: 15,
    description: "Safety of cage setup for cat and visitors",
    field: 'safetyScore',
    commentField: 'safetyComments'
  },
  easyViewOfCat: {
    maxPoints: 15,
    description: "Visibility and accessibility for viewing the cat",
    field: 'easyViewOfCatScore',
    commentField: 'easyViewOfCatComments'
  }
};

export const MAX_TOTAL_SCORE = 100;
export const MIN_SCORE_PER_CATEGORY = 0;
export const MAX_COMMENT_LENGTH = 500;

export const SCORING_CATEGORY_KEYS = Object.keys(SCORING_CATEGORIES) as Array<keyof typeof SCORING_CATEGORIES>;

export const SCORING_CATEGORY_LABELS: Record<keyof typeof SCORING_CATEGORIES, string> = {
  firstImpression: "First Impression",
  originality: "Originality",
  informationCard: "Information Card",
  workDoneByMember: "Work Done by Member",
  basicComfort: "Basic Comfort",
  safety: "Safety",
  easyViewOfCat: "Easy View of Cat"
};

// Class Scoring Constants
export const CLASS_SCORING_CATEGORIES: Record<string, ClassScoringCategory> = {
  beauty: {
    maxPoints: 15,
    description: "Cat's overall beauty and appearance",
    field: 'beautyScore',
    commentField: 'beautyComments'
  },
  personality: {
    maxPoints: 20,
    description: "Cat's temperament, behavior, and personality",
    field: 'personalityScore',
    commentField: 'personalityComments'
  },
  balanceProportion: {
    maxPoints: 15,
    description: "Cat's physical balance and body proportion",
    field: 'balanceProportionScore',
    commentField: 'balanceProportionComments'
  }
};

export const MAX_CLASS_TOTAL_SCORE = 50; // Beauty + Personality + Balance/Proportion
export const MIN_CLASS_SCORE_PER_CATEGORY = 0;
export const MAX_CLASS_COMMENT_LENGTH = 500;
export const MAX_HEALTH_COMMENT_LENGTH = 1000;

export const CLASS_SCORING_CATEGORY_KEYS = Object.keys(CLASS_SCORING_CATEGORIES) as Array<keyof typeof CLASS_SCORING_CATEGORIES>;

export const CLASS_SCORING_CATEGORY_LABELS: Record<keyof typeof CLASS_SCORING_CATEGORIES, string> = {
  beauty: "Cat's Beauty",
  personality: "Cat's Personality", 
  balanceProportion: "Cat's Balance/Proportion"
};

// Health/Grooming Checklist Items
export const HEALTH_GROOMING_ITEMS = {
  coatCleanGroomed: "Coat is clean & well groomed",
  teethGumsHealthy: "Teeth/gums clean & healthy",
  eyesNoseClear: "Eyes & nose clear",
  earsCleanMiteFree: "Ears clean & free of mites",
  toenailsClipped: "Toenails/claws clipped",
  fleaIssues: "Flea or flea dirt issues detected"
};

// Ribbon Eligibility Thresholds
export const RIBBON_THRESHOLDS = {
  BLUE: { minScore: 45, maxScore: 50, healthRequired: true },
  RED: { minScore: 35, maxScore: 44, healthRequired: true },
  WHITE: { minScore: 25, maxScore: 34, healthRequired: true },
  PARTICIPATION: { minScore: 0, maxScore: 24, healthRequired: false }
};

export const RIBBON_TYPES = ['Blue', 'Red', 'White', 'Participation'] as const;