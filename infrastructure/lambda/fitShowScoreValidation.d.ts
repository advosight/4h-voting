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
 * Maximum points for each category
 */
export declare const CATEGORY_MAXIMUMS: {
    appearance: number;
    handling: number;
    demonstration: number;
    healthExamination: number;
    groomingCare: number;
    knowledge: number;
    total: number;
};
/**
 * Validate create fit and show score input
 */
export declare function validateCreateFitShowScoreInput(input: CreateFitShowScoreInput): ValidationResult;
/**
 * Validate update fit and show score input
 */
export declare function validateUpdateFitShowScoreInput(input: UpdateFitShowScoreInput): ValidationResult;
/**
 * Validate calculated scores against expected maximums
 */
export declare function validateCalculatedScores(scores: {
    appearanceTotal: number;
    handlingTotal: number;
    demonstrationTotal: number;
    healthExaminationTotal: number;
    groomingCareTotal: number;
    knowledgeTotal: number;
    totalScore: number;
}): ValidationResult;
/**
 * Get all scoring field names
 */
export declare function getScoringFieldNames(): string[];
/**
 * Get field range information
 */
export declare function getFieldRange(field: string): {
    min: number;
    max: number;
    description: string;
} | null;
/**
 * Get all field ranges
 */
export declare function getAllFieldRanges(): Record<string, {
    min: number;
    max: number;
    description: string;
}>;
/**
 * Validate that all required scoring fields are present
 */
export declare function validateAllScoringFieldsPresent(input: any): ValidationResult;
/**
 * Create a comprehensive validation summary
 */
export declare function createValidationSummary(errors: ValidationError[]): string;
