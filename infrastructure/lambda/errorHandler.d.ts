export declare enum ErrorType {
    VALIDATION_ERROR = "VALIDATION_ERROR",
    PERMISSION_ERROR = "PERMISSION_ERROR",
    NOT_FOUND = "NOT_FOUND",
    CONFLICT = "CONFLICT",
    SYSTEM_ERROR = "SYSTEM_ERROR",
    NETWORK_ERROR = "NETWORK_ERROR",
    TIMEOUT_ERROR = "TIMEOUT_ERROR"
}
export interface ErrorResponse {
    error: {
        type: ErrorType;
        message: string;
        field?: string;
        code?: string;
        details?: any;
    };
}
export declare class AppError extends Error {
    readonly type: ErrorType;
    readonly statusCode: number;
    readonly field?: string;
    readonly code?: string;
    readonly details?: any;
    constructor(type: ErrorType, message: string, statusCode?: number, field?: string, code?: string, details?: any);
}
export declare class ValidationError extends AppError {
    constructor(message: string, field?: string, details?: any);
}
export declare class PermissionError extends AppError {
    constructor(message?: string, details?: any);
}
export declare class NotFoundError extends AppError {
    constructor(message: string, details?: any);
}
export declare class ConflictError extends AppError {
    constructor(message: string, details?: any);
}
export declare class SystemError extends AppError {
    constructor(message?: string, details?: any);
}
export declare const handleError: (error: any) => ErrorResponse;
export declare const createErrorResponse: (type: ErrorType, message: string, statusCode?: number, field?: string, code?: string, details?: any) => {
    statusCode: number;
    body: string;
};
