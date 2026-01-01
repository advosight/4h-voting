import { ErrorType, ErrorResponse, ValidationError, PermissionError, NotFoundError, ConflictError } from './errorHandler';
export interface ClassScoringErrorResponse extends ErrorResponse {
    error: ErrorResponse['error'] & {
        scoringType: 'CLASS';
        category?: 'beauty' | 'personality' | 'balanceProportion' | 'health' | 'general';
        validationDetails?: {
            minValue?: number;
            maxValue?: number;
            currentValue?: number;
            requiredFields?: string[];
        };
        retryInfo?: {
            retryable: boolean;
            retryAfter?: number;
            maxRetries?: number;
        };
    };
}
export declare class ClassScoringValidationError extends ValidationError {
    readonly category: string;
    readonly validationDetails?: any;
    constructor(message: string, field: string, category: string, validationDetails?: any);
}
export declare class ClassScoringPermissionError extends PermissionError {
    constructor(message?: string, details?: any);
}
export declare class ClassScoringNotFoundError extends NotFoundError {
    readonly resourceType: string;
    constructor(message: string, resourceType?: string, details?: any);
}
export declare class ClassScoringConflictError extends ConflictError {
    readonly conflictType: string;
    constructor(message?: string, conflictType?: string, details?: any);
}
export declare const validateClassScoringInput: (input: any) => void;
export declare const handleClassScoringError: (error: any, context?: string) => ClassScoringErrorResponse;
export declare const createClassScoringErrorResponse: (type: ErrorType, message: string, statusCode?: number, field?: string, category?: string, validationDetails?: any) => {
    statusCode: number;
    body: string;
};
export declare const validateClassScoringPermissions: (userRole: string, operation: string) => void;
export declare const validateCatForClassScoring: (cat: any) => void;
export declare const calculateRibbonEligibility: (totalScore: number, healthPassing: boolean, fleaIssues?: boolean) => string;
export declare const getClassScoringHttpStatusCode: (errorType: ErrorType) => number;
export declare const getClassScoringRecoveryStrategy: (errorType: ErrorType, context?: string) => {
    retryable: boolean;
    retryAfter?: number;
    maxRetries?: number;
    strategy: 'immediate' | 'exponential_backoff' | 'linear_backoff' | 'no_retry';
};
export declare const withClassScoringOptimisticLock: <T>(operation: () => Promise<T>, expectedVersion?: string, resourceId?: string) => Promise<T>;
export declare const validateConcurrentModification: (currentVersion: string, expectedVersion: string, resourceId: string) => void;
export declare const createClassScoringErrorResponseWithRetry: (type: ErrorType, message: string, field?: string, category?: string, validationDetails?: any, retryInfo?: {
    retryable: boolean;
    retryAfter?: number;
    maxRetries?: number;
}) => {
    statusCode: number;
    body: string;
    headers?: Record<string, string> | undefined;
};
export declare const validateMultipleClassScores: (scores: Array<{
    id: string;
    input: any;
}>) => Array<{
    id: string;
    errors: ClassScoringValidationError[];
}>;
export declare const checkClassScoringRateLimit: (judgeId: string, operation: string, windowMs?: number, maxOperations?: number) => boolean;
export declare const logClassScoringOperation: (operation: string, judgeId: string, catId?: string, details?: any, error?: any) => void;
