import { AppSyncResolverEvent, Context } from 'aws-lambda';
export interface FitShowError {
    code: string;
    message: string;
    field?: string;
    value?: any;
    details?: Record<string, any>;
}
export declare class FitShowErrorHandler {
    static createError(code: string, message: string, field?: string, value?: any, details?: Record<string, any>): FitShowError;
    static handleValidationError(field: string, value: any, expectedRange?: string): FitShowError;
    static handleMissingFieldError(field: string): FitShowError;
    static handleUnauthorizedJudgeError(judgeId: string): FitShowError;
    static handleCatNotFoundError(catId: string): FitShowError;
    static handleScoreAlreadyFinalizedError(scoreId: string): FitShowError;
    static handleCommentTooLongError(field: string, length: number, maxLength?: number): FitShowError;
    static handleConcurrentModificationError(scoreId: string, expectedVersion?: number, actualVersion?: number): FitShowError;
    static handleNetworkError(operation: string, retryCount?: number): FitShowError;
    static handleDatabaseError(operation: string, originalError?: Error): FitShowError;
    static handleUnknownError(originalError: Error): FitShowError;
    static formatErrorForResponse(error: FitShowError): any;
    static handleResolverError(event: AppSyncResolverEvent<any>, context: Context, error: Error | FitShowError): Promise<any>;
    static validateScoreRange(field: string, value: number, min: number, max: number): FitShowError | null;
    static validateRequiredField(field: string, value: any): FitShowError | null;
    static validateCommentLength(field: string, comment: string, maxLength?: number): FitShowError | null;
    static validateAllFitShowScores(scores: any): FitShowError[];
}
