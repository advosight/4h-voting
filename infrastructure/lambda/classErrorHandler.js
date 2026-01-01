"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logClassScoringOperation = exports.checkClassScoringRateLimit = exports.validateMultipleClassScores = exports.createClassScoringErrorResponseWithRetry = exports.validateConcurrentModification = exports.withClassScoringOptimisticLock = exports.getClassScoringRecoveryStrategy = exports.getClassScoringHttpStatusCode = exports.calculateRibbonEligibility = exports.validateCatForClassScoring = exports.validateClassScoringPermissions = exports.createClassScoringErrorResponse = exports.handleClassScoringError = exports.validateClassScoringInput = exports.ClassScoringConflictError = exports.ClassScoringNotFoundError = exports.ClassScoringPermissionError = exports.ClassScoringValidationError = void 0;
const errorHandler_1 = require("./errorHandler");
// Class scoring specific validation error
class ClassScoringValidationError extends errorHandler_1.ValidationError {
    constructor(message, field, category, validationDetails) {
        super(message, field, validationDetails);
        this.category = category;
        this.validationDetails = validationDetails;
    }
}
exports.ClassScoringValidationError = ClassScoringValidationError;
// Class scoring permission error
class ClassScoringPermissionError extends errorHandler_1.PermissionError {
    constructor(message = 'Access denied for class scoring', details) {
        super(message, details);
    }
}
exports.ClassScoringPermissionError = ClassScoringPermissionError;
// Class scoring not found error
class ClassScoringNotFoundError extends errorHandler_1.NotFoundError {
    constructor(message, resourceType = 'classScore', details) {
        super(message, details);
        this.resourceType = resourceType;
    }
}
exports.ClassScoringNotFoundError = ClassScoringNotFoundError;
// Class scoring conflict error (for optimistic locking)
class ClassScoringConflictError extends errorHandler_1.ConflictError {
    constructor(message = 'Class score has been modified by another judge', conflictType = 'optimistic_lock', details) {
        super(message, details);
        this.conflictType = conflictType;
    }
}
exports.ClassScoringConflictError = ClassScoringConflictError;
// Validate class scoring input
const validateClassScoringInput = (input) => {
    const errors = [];
    // Validate beauty score
    if (input.beautyScore !== undefined) {
        if (typeof input.beautyScore !== 'number' || input.beautyScore < 0 || input.beautyScore > 15) {
            throw new ClassScoringValidationError('Beauty score must be between 0 and 15', 'beautyScore', 'beauty', { minValue: 0, maxValue: 15, currentValue: input.beautyScore });
        }
    }
    // Validate personality score
    if (input.personalityScore !== undefined) {
        if (typeof input.personalityScore !== 'number' || input.personalityScore < 0 || input.personalityScore > 20) {
            throw new ClassScoringValidationError('Personality score must be between 0 and 20', 'personalityScore', 'personality', { minValue: 0, maxValue: 20, currentValue: input.personalityScore });
        }
    }
    // Validate balance/proportion score
    if (input.balanceProportionScore !== undefined) {
        if (typeof input.balanceProportionScore !== 'number' || input.balanceProportionScore < 0 || input.balanceProportionScore > 15) {
            throw new ClassScoringValidationError('Balance/Proportion score must be between 0 and 15', 'balanceProportionScore', 'balanceProportion', { minValue: 0, maxValue: 15, currentValue: input.balanceProportionScore });
        }
    }
    // Validate required fields for finalization
    if (input.isFinalized === true) {
        const requiredHealthFields = [
            'coatCleanGroomed',
            'teethGumsHealthy',
            'eyesNoseClear',
            'earsCleanMiteFree',
            'toenailsClipped'
        ];
        const missingFields = requiredHealthFields.filter(field => input[field] === undefined || input[field] === null);
        if (missingFields.length > 0) {
            throw new ClassScoringValidationError('All health and grooming evaluations must be completed before finalizing', 'healthGrooming', 'health', { requiredFields: missingFields });
        }
    }
    // Validate boolean health fields
    const booleanFields = [
        'coatCleanGroomed',
        'teethGumsHealthy',
        'eyesNoseClear',
        'earsCleanMiteFree',
        'toenailsClipped',
        'fleaIssues'
    ];
    booleanFields.forEach(field => {
        if (input[field] !== undefined && typeof input[field] !== 'boolean') {
            throw new ClassScoringValidationError(`${field} must be a boolean value`, field, 'health');
        }
    });
    // Validate comment lengths
    const commentFields = [
        { field: 'beautyComments', maxLength: 500 },
        { field: 'personalityComments', maxLength: 500 },
        { field: 'balanceProportionComments', maxLength: 500 },
        { field: 'healthGroomingComments', maxLength: 1000 }
    ];
    commentFields.forEach(({ field, maxLength }) => {
        if (input[field] && typeof input[field] === 'string' && input[field].length > maxLength) {
            throw new ClassScoringValidationError(`${field} cannot exceed ${maxLength} characters`, field, 'general', { maxLength, currentLength: input[field].length });
        }
    });
};
exports.validateClassScoringInput = validateClassScoringInput;
// Handle class scoring specific errors
const handleClassScoringError = (error, context) => {
    console.error('Class scoring error occurred:', { error, context });
    // Handle class scoring specific errors
    if (error instanceof ClassScoringValidationError) {
        return {
            error: {
                type: errorHandler_1.ErrorType.VALIDATION_ERROR,
                message: error.message,
                field: error.field,
                code: 'CLASS_SCORING_VALIDATION_ERROR',
                scoringType: 'CLASS',
                category: error.category,
                validationDetails: error.validationDetails
            }
        };
    }
    if (error instanceof ClassScoringPermissionError) {
        return {
            error: {
                type: errorHandler_1.ErrorType.PERMISSION_ERROR,
                message: error.message,
                code: 'CLASS_SCORING_PERMISSION_ERROR',
                scoringType: 'CLASS'
            }
        };
    }
    if (error instanceof ClassScoringNotFoundError) {
        return {
            error: {
                type: errorHandler_1.ErrorType.NOT_FOUND,
                message: error.message,
                field: error.resourceType,
                code: 'CLASS_SCORING_NOT_FOUND',
                scoringType: 'CLASS'
            }
        };
    }
    if (error instanceof ClassScoringConflictError) {
        return {
            error: {
                type: errorHandler_1.ErrorType.CONFLICT,
                message: error.message,
                code: 'CLASS_SCORING_OPTIMISTIC_LOCK_FAILED',
                scoringType: 'CLASS',
                details: { conflictType: error.conflictType }
            }
        };
    }
    // Handle DynamoDB conditional check failures for class scoring
    if (error.name === 'ConditionalCheckFailedException' && context?.includes('class')) {
        return {
            error: {
                type: errorHandler_1.ErrorType.CONFLICT,
                message: 'This class score has been modified by another judge. Please refresh and try again.',
                code: 'CLASS_SCORING_OPTIMISTIC_LOCK_FAILED',
                scoringType: 'CLASS'
            }
        };
    }
    // Handle resource not found for class scoring
    if (error.name === 'ResourceNotFoundException' && context?.includes('class')) {
        return {
            error: {
                type: errorHandler_1.ErrorType.NOT_FOUND,
                message: 'The requested class score or cat was not found.',
                code: 'CLASS_SCORING_RESOURCE_NOT_FOUND',
                scoringType: 'CLASS'
            }
        };
    }
    // Fall back to base error handling but add class scoring context
    const baseError = (0, errorHandler_1.handleError)(error);
    return {
        ...baseError,
        error: {
            ...baseError.error,
            scoringType: 'CLASS'
        }
    };
};
exports.handleClassScoringError = handleClassScoringError;
// Create class scoring error response with proper HTTP status codes
const createClassScoringErrorResponse = (type, message, statusCode = 500, field, category, validationDetails) => {
    const errorResponse = {
        error: {
            type,
            message,
            field,
            code: `CLASS_SCORING_${type}`,
            scoringType: 'CLASS',
            category: category,
            validationDetails
        }
    };
    return {
        statusCode,
        body: JSON.stringify(errorResponse)
    };
};
exports.createClassScoringErrorResponse = createClassScoringErrorResponse;
// Validate judge permissions for class scoring
const validateClassScoringPermissions = (userRole, operation) => {
    const allowedRoles = ['admin', 'judge'];
    if (!allowedRoles.includes(userRole.toLowerCase())) {
        throw new ClassScoringPermissionError(`Role '${userRole}' is not authorized for class scoring operations`, { operation, requiredRoles: allowedRoles });
    }
};
exports.validateClassScoringPermissions = validateClassScoringPermissions;
// Validate cat exists for class scoring
const validateCatForClassScoring = (cat) => {
    if (!cat) {
        throw new ClassScoringNotFoundError('Cat not found for class scoring', 'cat');
    }
    if (!cat.id) {
        throw new ClassScoringValidationError('Cat ID is required for class scoring', 'catId', 'general');
    }
};
exports.validateCatForClassScoring = validateCatForClassScoring;
// Calculate ribbon eligibility with error handling
const calculateRibbonEligibility = (totalScore, healthPassing, fleaIssues = false) => {
    try {
        // Validate inputs
        if (typeof totalScore !== 'number' || totalScore < 0 || totalScore > 50) {
            throw new ClassScoringValidationError('Invalid total score for ribbon calculation', 'totalScore', 'general', { minValue: 0, maxValue: 50, currentValue: totalScore });
        }
        // Flea issues or health failures result in Red Ribbon regardless of score
        if (fleaIssues || !healthPassing) {
            return 'Red';
        }
        // Calculate ribbon based on score
        if (totalScore >= 45)
            return 'Blue';
        if (totalScore >= 35)
            return 'Red';
        if (totalScore >= 25)
            return 'White';
        return 'Participation';
    }
    catch (error) {
        console.error('Error calculating ribbon eligibility:', error);
        throw new errorHandler_1.SystemError('Failed to calculate ribbon eligibility');
    }
};
exports.calculateRibbonEligibility = calculateRibbonEligibility;
// Enhanced HTTP status code mapping for class scoring errors
const getClassScoringHttpStatusCode = (errorType) => {
    switch (errorType) {
        case errorHandler_1.ErrorType.VALIDATION_ERROR:
            return 400; // Bad Request
        case errorHandler_1.ErrorType.PERMISSION_ERROR:
            return 403; // Forbidden
        case errorHandler_1.ErrorType.NOT_FOUND:
            return 404; // Not Found
        case errorHandler_1.ErrorType.CONFLICT:
            return 409; // Conflict (for optimistic locking)
        case errorHandler_1.ErrorType.TIMEOUT_ERROR:
            return 408; // Request Timeout
        case errorHandler_1.ErrorType.NETWORK_ERROR:
            return 503; // Service Unavailable
        case errorHandler_1.ErrorType.SYSTEM_ERROR:
        default:
            return 500; // Internal Server Error
    }
};
exports.getClassScoringHttpStatusCode = getClassScoringHttpStatusCode;
// Enhanced error recovery strategies for class scoring
const getClassScoringRecoveryStrategy = (errorType, context) => {
    switch (errorType) {
        case errorHandler_1.ErrorType.NETWORK_ERROR:
        case errorHandler_1.ErrorType.TIMEOUT_ERROR:
            return {
                retryable: true,
                retryAfter: 2000,
                maxRetries: 3,
                strategy: 'exponential_backoff'
            };
        case errorHandler_1.ErrorType.CONFLICT:
            return {
                retryable: true,
                retryAfter: 1000,
                maxRetries: 2,
                strategy: 'linear_backoff'
            };
        case errorHandler_1.ErrorType.SYSTEM_ERROR:
            // Only retry system errors if they're not validation-related
            if (context?.includes('validation')) {
                return { retryable: false, strategy: 'no_retry' };
            }
            return {
                retryable: true,
                retryAfter: 3000,
                maxRetries: 2,
                strategy: 'exponential_backoff'
            };
        case errorHandler_1.ErrorType.VALIDATION_ERROR:
        case errorHandler_1.ErrorType.PERMISSION_ERROR:
        case errorHandler_1.ErrorType.NOT_FOUND:
        default:
            return { retryable: false, strategy: 'no_retry' };
    }
};
exports.getClassScoringRecoveryStrategy = getClassScoringRecoveryStrategy;
// Optimistic locking helper for class scores
const withClassScoringOptimisticLock = async (operation, expectedVersion, resourceId) => {
    try {
        return await operation();
    }
    catch (error) {
        // Handle DynamoDB conditional check failures
        if (error?.name === 'ConditionalCheckFailedException') {
            throw new ClassScoringConflictError('This class score has been modified by another judge. Please refresh and try again.', 'optimistic_lock', {
                resourceId,
                expectedVersion,
                timestamp: new Date().toISOString()
            });
        }
        // Handle other AWS errors that might indicate conflicts
        if (error?.name === 'TransactionCanceledException') {
            const cancelReasons = error.CancellationReasons || [];
            const hasConditionalCheckFailure = cancelReasons.some((reason) => reason.Code === 'ConditionalCheckFailed');
            if (hasConditionalCheckFailure) {
                throw new ClassScoringConflictError('Class score modification conflict detected in transaction.', 'transaction_conflict', {
                    resourceId,
                    expectedVersion,
                    cancelReasons,
                    timestamp: new Date().toISOString()
                });
            }
        }
        throw error;
    }
};
exports.withClassScoringOptimisticLock = withClassScoringOptimisticLock;
// Validate concurrent modification protection
const validateConcurrentModification = (currentVersion, expectedVersion, resourceId) => {
    if (currentVersion !== expectedVersion) {
        throw new ClassScoringConflictError('Class score has been modified by another judge since you last loaded it.', 'version_mismatch', {
            resourceId,
            currentVersion,
            expectedVersion,
            timestamp: new Date().toISOString()
        });
    }
};
exports.validateConcurrentModification = validateConcurrentModification;
// Enhanced error response with retry information
const createClassScoringErrorResponseWithRetry = (type, message, field, category, validationDetails, retryInfo) => {
    const statusCode = (0, exports.getClassScoringHttpStatusCode)(type);
    const headers = {
        'Content-Type': 'application/json',
        'X-Scoring-Type': 'CLASS'
    };
    // Add retry headers if applicable
    if (retryInfo?.retryable && retryInfo.retryAfter) {
        headers['Retry-After'] = retryInfo.retryAfter.toString();
    }
    const errorResponse = {
        error: {
            type,
            message,
            field,
            code: `CLASS_SCORING_${type}`,
            scoringType: 'CLASS',
            category: category,
            validationDetails,
            retryInfo
        }
    };
    return {
        statusCode,
        headers,
        body: JSON.stringify(errorResponse)
    };
};
exports.createClassScoringErrorResponseWithRetry = createClassScoringErrorResponseWithRetry;
// Batch validation for multiple class scores
const validateMultipleClassScores = (scores) => {
    return scores.map(({ id, input }) => {
        const errors = [];
        try {
            (0, exports.validateClassScoringInput)(input);
        }
        catch (error) {
            if (error instanceof ClassScoringValidationError) {
                errors.push(error);
            }
        }
        return { id, errors };
    });
};
exports.validateMultipleClassScores = validateMultipleClassScores;
// Rate limiting helper for class scoring operations
const checkClassScoringRateLimit = (judgeId, operation, windowMs = 60000, // 1 minute
maxOperations = 30) => {
    // This would typically use Redis or DynamoDB for distributed rate limiting
    // For now, we'll implement a simple in-memory version
    const key = `${judgeId}:${operation}`;
    const now = Date.now();
    // In a real implementation, you'd store this in a persistent cache
    // and clean up old entries periodically
    return true; // Placeholder - always allow for now
};
exports.checkClassScoringRateLimit = checkClassScoringRateLimit;
// Enhanced logging for class scoring operations
const logClassScoringOperation = (operation, judgeId, catId, details, error) => {
    const logData = {
        timestamp: new Date().toISOString(),
        operation,
        judgeId,
        catId,
        details,
        error: error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
        } : undefined
    };
    if (error) {
        console.error('Class scoring operation failed:', logData);
    }
    else {
        console.log('Class scoring operation:', logData);
    }
};
exports.logClassScoringOperation = logClassScoringOperation;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhc3NFcnJvckhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGFzc0Vycm9ySGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxpREFVd0I7QUFxQnhCLDBDQUEwQztBQUMxQyxNQUFhLDJCQUE0QixTQUFRLDhCQUFlO0lBSTlELFlBQ0UsT0FBZSxFQUNmLEtBQWEsRUFDYixRQUFnQixFQUNoQixpQkFBdUI7UUFFdkIsS0FBSyxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUN6QixJQUFJLENBQUMsaUJBQWlCLEdBQUcsaUJBQWlCLENBQUM7SUFDN0MsQ0FBQztDQUNGO0FBZEQsa0VBY0M7QUFFRCxpQ0FBaUM7QUFDakMsTUFBYSwyQkFBNEIsU0FBUSw4QkFBZTtJQUM5RCxZQUFZLFVBQWtCLGlDQUFpQyxFQUFFLE9BQWE7UUFDNUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztJQUMxQixDQUFDO0NBQ0Y7QUFKRCxrRUFJQztBQUVELGdDQUFnQztBQUNoQyxNQUFhLHlCQUEwQixTQUFRLDRCQUFhO0lBRzFELFlBQVksT0FBZSxFQUFFLGVBQXVCLFlBQVksRUFBRSxPQUFhO1FBQzdFLEtBQUssQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDeEIsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7SUFDbkMsQ0FBQztDQUNGO0FBUEQsOERBT0M7QUFFRCx3REFBd0Q7QUFDeEQsTUFBYSx5QkFBMEIsU0FBUSw0QkFBYTtJQUcxRCxZQUNFLFVBQWtCLGdEQUFnRCxFQUNsRSxlQUF1QixpQkFBaUIsRUFDeEMsT0FBYTtRQUViLEtBQUssQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDeEIsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7SUFDbkMsQ0FBQztDQUNGO0FB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LE9BQU8sQ0FBQyxLQUFLLENBQUMsaUNBQWlDLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDNUQsQ0FBQztTQUFNLENBQUM7UUFDTixPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUEwQixFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ25ELENBQUM7QUFDSCxDQUFDLENBQUM7QUF6QlcsUUFBQSx3QkFBd0IsNEJBeUJuQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFxuICBFcnJvclR5cGUsIFxuICBFcnJvclJlc3BvbnNlLCBcbiAgQXBwRXJyb3IsIFxuICBWYWxpZGF0aW9uRXJyb3IsIFxuICBQZXJtaXNzaW9uRXJyb3IsIFxuICBOb3RGb3VuZEVycm9yLCBcbiAgQ29uZmxpY3RFcnJvciwgXG4gIFN5c3RlbUVycm9yLFxuICBoYW5kbGVFcnJvciBhcyBiYXNlSGFuZGxlRXJyb3Jcbn0gZnJvbSAnLi9lcnJvckhhbmRsZXInO1xuXG4vLyBDbGFzcyBzY29yaW5nIHNwZWNpZmljIGVycm9yIHJlc3BvbnNlXG5leHBvcnQgaW50ZXJmYWNlIENsYXNzU2NvcmluZ0Vycm9yUmVzcG9uc2UgZXh0ZW5kcyBFcnJvclJlc3BvbnNlIHtcbiAgZXJyb3I6IEVycm9yUmVzcG9uc2VbJ2Vycm9yJ10gJiB7XG4gICAgc2NvcmluZ1R5cGU6ICdDTEFTUyc7XG4gICAgY2F0ZWdvcnk/OiAnYmVhdXR5JyB8ICdwZXJzb25hbGl0eScgfCAnYmFsYW5jZVByb3BvcnRpb24nIHwgJ2hlYWx0aCcgfCAnZ2VuZXJhbCc7XG4gICAgdmFsaWRhdGlvbkRldGFpbHM/OiB7XG4gICAgICBtaW5WYWx1ZT86IG51bWJlcjtcbiAgICAgIG1heFZhbHVlPzogbnVtYmVyO1xuICAgICAgY3VycmVudFZhbHVlPzogbnVtYmVyO1xuICAgICAgcmVxdWlyZWRGaWVsZHM/OiBzdHJpbmdbXTtcbiAgICB9O1xuICAgIHJldHJ5SW5mbz86IHtcbiAgICAgIHJldHJ5YWJsZTogYm9vbGVhbjtcbiAgICAgIHJldHJ5QWZ0ZXI/OiBudW1iZXI7XG4gICAgICBtYXhSZXRyaWVzPzogbnVtYmVyO1xuICAgIH07XG4gIH07XG59XG5cbi8vIENsYXNzIHNjb3Jpbmcgc3BlY2lmaWMgdmFsaWRhdGlvbiBlcnJvclxuZXhwb3J0IGNsYXNzIENsYXNzU2NvcmluZ1ZhbGlkYXRpb25FcnJvciBleHRlbmRzIFZhbGlkYXRpb25FcnJvciB7XG4gIHB1YmxpYyByZWFkb25seSBjYXRlZ29yeTogc3RyaW5nO1xuICBwdWJsaWMgcmVhZG9ubHkgdmFsaWRhdGlvbkRldGFpbHM/OiBhbnk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgbWVzc2FnZTogc3RyaW5nLCBcbiAgICBmaWVsZDogc3RyaW5nLCBcbiAgICBjYXRlZ29yeTogc3RyaW5nLCBcbiAgICB2YWxpZGF0aW9uRGV0YWlscz86IGFueVxuICApIHtcbiAgICBzdXBlcihtZXNzYWdlLCBmaWVsZCwgdmFsaWRhdGlvbkRldGFpbHMpO1xuICAgIHRoaXMuY2F0ZWdvcnkgPSBjYXRlZ29yeTtcbiAgICB0aGlzLnZhbGlkYXRpb25EZXRhaWxzID0gdmFsaWRhdGlvbkRldGFpbHM7XG4gIH1cbn1cblxuLy8gQ2xhc3Mgc2NvcmluZyBwZXJtaXNzaW9uIGVycm9yXG5leHBvcnQgY2xhc3MgQ2xhc3NTY29yaW5nUGVybWlzc2lvbkVycm9yIGV4dGVuZHMgUGVybWlzc2lvbkVycm9yIHtcbiAgY29uc3RydWN0b3IobWVzc2FnZTogc3RyaW5nID0gJ0FjY2VzcyBkZW5pZWQgZm9yIGNsYXNzIHNjb3JpbmcnLCBkZXRhaWxzPzogYW55KSB7XG4gICAgc3VwZXIobWVzc2FnZSwgZGV0YWlscyk7XG4gIH1cbn1cblxuLy8gQ2xhc3Mgc2NvcmluZyBub3QgZm91bmQgZXJyb3JcbmV4cG9ydCBjbGFzcyBDbGFzc1Njb3JpbmdOb3RGb3VuZEVycm9yIGV4dGVuZHMgTm90Rm91bmRFcnJvciB7XG4gIHB1YmxpYyByZWFkb25seSByZXNvdXJjZVR5cGU6IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihtZXNzYWdlOiBzdHJpbmcsIHJlc291cmNlVHlwZTogc3RyaW5nID0gJ2NsYXNzU2NvcmUnLCBkZXRhaWxzPzogYW55KSB7XG4gICAgc3VwZXIobWVzc2FnZSwgZGV0YWlscyk7XG4gICAgdGhpcy5yZXNvdXJjZVR5cGUgPSByZXNvdXJjZVR5cGU7XG4gIH1cbn1cblxuLy8gQ2xhc3Mgc2NvcmluZyBjb25mbGljdCBlcnJvciAoZm9yIG9wdGltaXN0aWMgbG9ja2luZylcbmV4cG9ydCBjbGFzcyBDbGFzc1Njb3JpbmdDb25mbGljdEVycm9yIGV4dGVuZHMgQ29uZmxpY3RFcnJvciB7XG4gIHB1YmxpYyByZWFkb25seSBjb25mbGljdFR5cGU6IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihcbiAgICBtZXNzYWdlOiBzdHJpbmcgPSAnQ2xhc3Mgc2NvcmUgaGFzIGJlZW4gbW9kaWZpZWQgYnkgYW5vdGhlciBqdWRnZScsIFxuICAgIGNvbmZsaWN0VHlwZTogc3RyaW5nID0gJ29wdGltaXN0aWNfbG9jaycsXG4gICAgZGV0YWlscz86IGFueVxuICApIHtcbiAgICBzdXBlcihtZXNzYWdlLCBkZXRhaWxzKTtcbiAgICB0aGlzLmNvbmZsaWN0VHlwZSA9IGNvbmZsaWN0VHlwZTtcbiAgfVxufVxuXG4vLyBWYWxpZGF0ZSBjbGFzcyBzY29yaW5nIGlucHV0XG5leHBvcnQgY29uc3QgdmFsaWRhdGVDbGFzc1Njb3JpbmdJbnB1dCA9IChpbnB1dDogYW55KTogdm9pZCA9PiB7XG4gIGNvbnN0IGVycm9yczogc3RyaW5nW10gPSBbXTtcblxuICAvLyBWYWxpZGF0ZSBiZWF1dHkgc2NvcmVcbiAgaWYgKGlucHV0LmJlYXV0eVNjb3JlICE9PSB1bmRlZmluZWQpIHtcbiAgICBpZiAodHlwZW9mIGlucHV0LmJlYXV0eVNjb3JlICE9PSAnbnVtYmVyJyB8fCBpbnB1dC5iZWF1dHlTY29yZSA8IDAgfHwgaW5wdXQuYmVhdXR5U2NvcmUgPiAxNSkge1xuICAgICAgdGhyb3cgbmV3IENsYXNzU2NvcmluZ1ZhbGlkYXRpb25FcnJvcihcbiAgICAgICAgJ0JlYXV0eSBzY29yZSBtdXN0IGJlIGJldHdlZW4gMCBhbmQgMTUnLFxuICAgICAgICAnYmVhdXR5U2NvcmUnLFxuICAgICAgICAnYmVhdXR5JyxcbiAgICAgICAgeyBtaW5WYWx1ZTogMCwgbWF4VmFsdWU6IDE1LCBjdXJyZW50VmFsdWU6IGlucHV0LmJlYXV0eVNjb3JlIH1cbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgLy8gVmFsaWRhdGUgcGVyc29uYWxpdHkgc2NvcmVcbiAgaWYgKGlucHV0LnBlcnNvbmFsaXR5U2NvcmUgIT09IHVuZGVmaW5lZCkge1xuICAgIGlmICh0eXBlb2YgaW5wdXQucGVyc29uYWxpdHlTY29yZSAhPT0gJ251bWJlcicgfHwgaW5wdXQucGVyc29uYWxpdHlTY29yZSA8IDAgfHwgaW5wdXQucGVyc29uYWxpdHlTY29yZSA+IDIwKSB7XG4gICAgICB0aHJvdyBuZXcgQ2xhc3NTY29yaW5nVmFsaWRhdGlvbkVycm9yKFxuICAgICAgICAnUGVyc29uYWxpdHkgc2NvcmUgbXVzdCBiZSBiZXR3ZWVuIDAgYW5kIDIwJyxcbiAgICAgICAgJ3BlcnNvbmFsaXR5U2NvcmUnLFxuICAgICAgICAncGVyc29uYWxpdHknLFxuICAgICAgICB7IG1pblZhbHVlOiAwLCBtYXhWYWx1ZTogMjAsIGN1cnJlbnRWYWx1ZTogaW5wdXQucGVyc29uYWxpdHlTY29yZSB9XG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIC8vIFZhbGlkYXRlIGJhbGFuY2UvcHJvcG9ydGlvbiBzY29yZVxuICBpZiAoaW5wdXQuYmFsYW5jZVByb3BvcnRpb25TY29yZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKHR5cGVvZiBpbnB1dC5iYWxhbmNlUHJvcG9ydGlvblNjb3JlICE9PSAnbnVtYmVyJyB8fCBpbnB1dC5iYWxhbmNlUHJvcG9ydGlvblNjb3JlIDwgMCB8fCBpbnB1dC5iYWxhbmNlUHJvcG9ydGlvblNjb3JlID4gMTUpIHtcbiAgICAgIHRocm93IG5ldyBDbGFzc1Njb3JpbmdWYWxpZGF0aW9uRXJyb3IoXG4gICAgICAgICdCYWxhbmNlL1Byb3BvcnRpb24gc2NvcmUgbXVzdCBiZSBiZXR3ZWVuIDAgYW5kIDE1JyxcbiAgICAgICAgJ2JhbGFuY2VQcm9wb3J0aW9uU2NvcmUnLFxuICAgICAgICAnYmFsYW5jZVByb3BvcnRpb24nLFxuICAgICAgICB7IG1pblZhbHVlOiAwLCBtYXhWYWx1ZTogMTUsIGN1cnJlbnRWYWx1ZTogaW5wdXQuYmFsYW5jZVByb3BvcnRpb25TY29yZSB9XG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIC8vIFZhbGlkYXRlIHJlcXVpcmVkIGZpZWxkcyBmb3IgZmluYWxpemF0aW9uXG4gIGlmIChpbnB1dC5pc0ZpbmFsaXplZCA9PT0gdHJ1ZSkge1xuICAgIGNvbnN0IHJlcXVpcmVkSGVhbHRoRmllbGRzID0gW1xuICAgICAgJ2NvYXRDbGVhbkdyb29tZWQnLFxuICAgICAgJ3RlZXRoR3Vtc0hlYWx0aHknLCBcbiAgICAgICdleWVzTm9zZUNsZWFyJyxcbiAgICAgICdlYXJzQ2xlYW5NaXRlRnJlZScsXG4gICAgICAndG9lbmFpbHNDbGlwcGVkJ1xuICAgIF07XG5cbiAgICBjb25zdCBtaXNzaW5nRmllbGRzID0gcmVxdWlyZWRIZWFsdGhGaWVsZHMuZmlsdGVyKGZpZWxkID0+IFxuICAgICAgaW5wdXRbZmllbGRdID09PSB1bmRlZmluZWQgfHwgaW5wdXRbZmllbGRdID09PSBudWxsXG4gICAgKTtcblxuICAgIGlmIChtaXNzaW5nRmllbGRzLmxlbmd0aCA+IDApIHtcbiAgICAgIHRocm93IG5ldyBDbGFzc1Njb3JpbmdWYWxpZGF0aW9uRXJyb3IoXG4gICAgICAgICdBbGwgaGVhbHRoIGFuZCBncm9vbWluZyBldmFsdWF0aW9ucyBtdXN0IGJlIGNvbXBsZXRlZCBiZWZvcmUgZmluYWxpemluZycsXG4gICAgICAgICdoZWFsdGhHcm9vbWluZycsXG4gICAgICAgICdoZWFsdGgnLFxuICAgICAgICB7IHJlcXVpcmVkRmllbGRzOiBtaXNzaW5nRmllbGRzIH1cbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgLy8gVmFsaWRhdGUgYm9vbGVhbiBoZWFsdGggZmllbGRzXG4gIGNvbnN0IGJvb2xlYW5GaWVsZHMgPSBbXG4gICAgJ2NvYXRDbGVhbkdyb29tZWQnLFxuICAgICd0ZWV0aEd1bXNIZWFsdGh5JyxcbiAgICAnZXllc05vc2VDbGVhcicsIFxuICAgICdlYXJzQ2xlYW5NaXRlRnJlZScsXG4gICAgJ3RvZW5haWxzQ2xpcHBlZCcsXG4gICAgJ2ZsZWFJc3N1ZXMnXG4gIF07XG5cbiAgYm9vbGVhbkZpZWxkcy5mb3JFYWNoKGZpZWxkID0+IHtcbiAgICBpZiAoaW5wdXRbZmllbGRdICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIGlucHV0W2ZpZWxkXSAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICB0aHJvdyBuZXcgQ2xhc3NTY29yaW5nVmFsaWRhdGlvbkVycm9yKFxuICAgICAgICBgJHtmaWVsZH0gbXVzdCBiZSBhIGJvb2xlYW4gdmFsdWVgLFxuICAgICAgICBmaWVsZCxcbiAgICAgICAgJ2hlYWx0aCdcbiAgICAgICk7XG4gICAgfVxuICB9KTtcblxuICAvLyBWYWxpZGF0ZSBjb21tZW50IGxlbmd0aHNcbiAgY29uc3QgY29tbWVudEZpZWxkcyA9IFtcbiAgICB7IGZpZWxkOiAnYmVhdXR5Q29tbWVudHMnLCBtYXhMZW5ndGg6IDUwMCB9LFxuICAgIHsgZmllbGQ6ICdwZXJzb25hbGl0eUNvbW1lbnRzJywgbWF4TGVuZ3RoOiA1MDAgfSxcbiAgICB7IGZpZWxkOiAnYmFsYW5jZVByb3BvcnRpb25Db21tZW50cycsIG1heExlbmd0aDogNTAwIH0sXG4gICAgeyBmaWVsZDogJ2hlYWx0aEdyb29taW5nQ29tbWVudHMnLCBtYXhMZW5ndGg6IDEwMDAgfVxuICBdO1xuXG4gIGNvbW1lbnRGaWVsZHMuZm9yRWFjaCgoeyBmaWVsZCwgbWF4TGVuZ3RoIH0pID0+IHtcbiAgICBpZiAoaW5wdXRbZmllbGRdICYmIHR5cGVvZiBpbnB1dFtmaWVsZF0gPT09ICdzdHJpbmcnICYmIGlucHV0W2ZpZWxkXS5sZW5ndGggPiBtYXhMZW5ndGgpIHtcbiAgICAgIHRocm93IG5ldyBDbGFzc1Njb3JpbmdWYWxpZGF0aW9uRXJyb3IoXG4gICAgICAgIGAke2ZpZWxkfSBjYW5ub3QgZXhjZWVkICR7bWF4TGVuZ3RofSBjaGFyYWN0ZXJzYCxcbiAgICAgICAgZmllbGQsXG4gICAgICAgICdnZW5lcmFsJyxcbiAgICAgICAgeyBtYXhMZW5ndGgsIGN1cnJlbnRMZW5ndGg6IGlucHV0W2ZpZWxkXS5sZW5ndGggfVxuICAgICAgKTtcbiAgICB9XG4gIH0pO1xufTtcblxuLy8gSGFuZGxlIGNsYXNzIHNjb3Jpbmcgc3BlY2lmaWMgZXJyb3JzXG5leHBvcnQgY29uc3QgaGFuZGxlQ2xhc3NTY29yaW5nRXJyb3IgPSAoZXJyb3I6IGFueSwgY29udGV4dD86IHN0cmluZyk6IENsYXNzU2NvcmluZ0Vycm9yUmVzcG9uc2UgPT4ge1xuICBjb25zb2xlLmVycm9yKCdDbGFzcyBzY29yaW5nIGVycm9yIG9jY3VycmVkOicsIHsgZXJyb3IsIGNvbnRleHQgfSk7XG5cbiAgLy8gSGFuZGxlIGNsYXNzIHNjb3Jpbmcgc3BlY2lmaWMgZXJyb3JzXG4gIGlmIChlcnJvciBpbnN0YW5jZW9mIENsYXNzU2NvcmluZ1ZhbGlkYXRpb25FcnJvcikge1xuICAgIHJldHVybiB7XG4gICAgICBlcnJvcjoge1xuICAgICAgICB0eXBlOiBFcnJvclR5cGUuVkFMSURBVElPTl9FUlJPUixcbiAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgZmllbGQ6IGVycm9yLmZpZWxkLFxuICAgICAgICBjb2RlOiAnQ0xBU1NfU0NPUklOR19WQUxJREFUSU9OX0VSUk9SJyxcbiAgICAgICAgc2NvcmluZ1R5cGU6ICdDTEFTUycsXG4gICAgICAgIGNhdGVnb3J5OiBlcnJvci5jYXRlZ29yeSBhcyBhbnksXG4gICAgICAgIHZhbGlkYXRpb25EZXRhaWxzOiBlcnJvci52YWxpZGF0aW9uRGV0YWlsc1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBDbGFzc1Njb3JpbmdQZXJtaXNzaW9uRXJyb3IpIHtcbiAgICByZXR1cm4ge1xuICAgICAgZXJyb3I6IHtcbiAgICAgICAgdHlwZTogRXJyb3JUeXBlLlBFUk1JU1NJT05fRVJST1IsXG4gICAgICAgIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UsXG4gICAgICAgIGNvZGU6ICdDTEFTU19TQ09SSU5HX1BFUk1JU1NJT05fRVJST1InLFxuICAgICAgICBzY29yaW5nVHlwZTogJ0NMQVNTJ1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBDbGFzc1Njb3JpbmdOb3RGb3VuZEVycm9yKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yOiB7XG4gICAgICAgIHR5cGU6IEVycm9yVHlwZS5OT1RfRk9VTkQsXG4gICAgICAgIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UsXG4gICAgICAgIGZpZWxkOiBlcnJvci5yZXNvdXJjZVR5cGUsXG4gICAgICAgIGNvZGU6ICdDTEFTU19TQ09SSU5HX05PVF9GT1VORCcsXG4gICAgICAgIHNjb3JpbmdUeXBlOiAnQ0xBU1MnXG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIGlmIChlcnJvciBpbnN0YW5jZW9mIENsYXNzU2NvcmluZ0NvbmZsaWN0RXJyb3IpIHtcbiAgICByZXR1cm4ge1xuICAgICAgZXJyb3I6IHtcbiAgICAgICAgdHlwZTogRXJyb3JUeXBlLkNPTkZMSUNULFxuICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlLFxuICAgICAgICBjb2RlOiAnQ0xBU1NfU0NPUklOR19PUFRJTUlTVElDX0xPQ0tfRkFJTEVEJyxcbiAgICAgICAgc2NvcmluZ1R5cGU6ICdDTEFTUycsXG4gICAgICAgIGRldGFpbHM6IHsgY29uZmxpY3RUeXBlOiBlcnJvci5jb25mbGljdFR5cGUgfVxuICAgICAgfVxuICAgIH07XG4gIH1cblxuICAvLyBIYW5kbGUgRHluYW1vREIgY29uZGl0aW9uYWwgY2hlY2sgZmFpbHVyZXMgZm9yIGNsYXNzIHNjb3JpbmdcbiAgaWYgKGVycm9yLm5hbWUgPT09ICdDb25kaXRpb25hbENoZWNrRmFpbGVkRXhjZXB0aW9uJyAmJiBjb250ZXh0Py5pbmNsdWRlcygnY2xhc3MnKSkge1xuICAgIHJldHVybiB7XG4gICAgICBlcnJvcjoge1xuICAgICAgICB0eXBlOiBFcnJvclR5cGUuQ09ORkxJQ1QsXG4gICAgICAgIG1lc3NhZ2U6ICdUaGlzIGNsYXNzIHNjb3JlIGhhcyBiZWVuIG1vZGlmaWVkIGJ5IGFub3RoZXIganVkZ2UuIFBsZWFzZSByZWZyZXNoIGFuZCB0cnkgYWdhaW4uJyxcbiAgICAgICAgY29kZTogJ0NMQVNTX1NDT1JJTkdfT1BUSU1JU1RJQ19MT0NLX0ZBSUxFRCcsXG4gICAgICAgIHNjb3JpbmdUeXBlOiAnQ0xBU1MnXG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIC8vIEhhbmRsZSByZXNvdXJjZSBub3QgZm91bmQgZm9yIGNsYXNzIHNjb3JpbmdcbiAgaWYgKGVycm9yLm5hbWUgPT09ICdSZXNvdXJjZU5vdEZvdW5kRXhjZXB0aW9uJyAmJiBjb250ZXh0Py5pbmNsdWRlcygnY2xhc3MnKSkge1xuICAgIHJldHVybiB7XG4gICAgICBlcnJvcjoge1xuICAgICAgICB0eXBlOiBFcnJvclR5cGUuTk9UX0ZPVU5ELFxuICAgICAgICBtZXNzYWdlOiAnVGhlIHJlcXVlc3RlZCBjbGFzcyBzY29yZSBvciBjYXQgd2FzIG5vdCBmb3VuZC4nLFxuICAgICAgICBjb2RlOiAnQ0xBU1NfU0NPUklOR19SRVNPVVJDRV9OT1RfRk9VTkQnLFxuICAgICAgICBzY29yaW5nVHlwZTogJ0NMQVNTJ1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICAvLyBGYWxsIGJhY2sgdG8gYmFzZSBlcnJvciBoYW5kbGluZyBidXQgYWRkIGNsYXNzIHNjb3JpbmcgY29udGV4dFxuICBjb25zdCBiYXNlRXJyb3IgPSBiYXNlSGFuZGxlRXJyb3IoZXJyb3IpO1xuICByZXR1cm4ge1xuICAgIC4uLmJhc2VFcnJvcixcbiAgICBlcnJvcjoge1xuICAgICAgLi4uYmFzZUVycm9yLmVycm9yLFxuICAgICAgc2NvcmluZ1R5cGU6ICdDTEFTUydcbiAgICB9XG4gIH0gYXMgQ2xhc3NTY29yaW5nRXJyb3JSZXNwb25zZTtcbn07XG5cbi8vIENyZWF0ZSBjbGFzcyBzY29yaW5nIGVycm9yIHJlc3BvbnNlIHdpdGggcHJvcGVyIEhUVFAgc3RhdHVzIGNvZGVzXG5leHBvcnQgY29uc3QgY3JlYXRlQ2xhc3NTY29yaW5nRXJyb3JSZXNwb25zZSA9IChcbiAgdHlwZTogRXJyb3JUeXBlLFxuICBtZXNzYWdlOiBzdHJpbmcsXG4gIHN0YXR1c0NvZGU6IG51bWJlciA9IDUwMCxcbiAgZmllbGQ/OiBzdHJpbmcsXG4gIGNhdGVnb3J5Pzogc3RyaW5nLFxuICB2YWxpZGF0aW9uRGV0YWlscz86IGFueVxuKTogeyBzdGF0dXNDb2RlOiBudW1iZXI7IGJvZHk6IHN0cmluZyB9ID0+IHtcbiAgY29uc3QgZXJyb3JSZXNwb25zZTogQ2xhc3NTY29yaW5nRXJyb3JSZXNwb25zZSA9IHtcbiAgICBlcnJvcjoge1xuICAgICAgdHlwZSxcbiAgICAgIG1lc3NhZ2UsXG4gICAgICBmaWVsZCxcbiAgICAgIGNvZGU6IGBDTEFTU19TQ09SSU5HXyR7dHlwZX1gLFxuICAgICAgc2NvcmluZ1R5cGU6ICdDTEFTUycsXG4gICAgICBjYXRlZ29yeTogY2F0ZWdvcnkgYXMgYW55LFxuICAgICAgdmFsaWRhdGlvbkRldGFpbHNcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIHtcbiAgICBzdGF0dXNDb2RlLFxuICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KGVycm9yUmVzcG9uc2UpXG4gIH07XG59O1xuXG4vLyBWYWxpZGF0ZSBqdWRnZSBwZXJtaXNzaW9ucyBmb3IgY2xhc3Mgc2NvcmluZ1xuZXhwb3J0IGNvbnN0IHZhbGlkYXRlQ2xhc3NTY29yaW5nUGVybWlzc2lvbnMgPSAodXNlclJvbGU6IHN0cmluZywgb3BlcmF0aW9uOiBzdHJpbmcpOiB2b2lkID0+IHtcbiAgY29uc3QgYWxsb3dlZFJvbGVzID0gWydhZG1pbicsICdqdWRnZSddO1xuICBcbiAgaWYgKCFhbGxvd2VkUm9sZXMuaW5jbHVkZXModXNlclJvbGUudG9Mb3dlckNhc2UoKSkpIHtcbiAgICB0aHJvdyBuZXcgQ2xhc3NTY29yaW5nUGVybWlzc2lvbkVycm9yKFxuICAgICAgYFJvbGUgJyR7dXNlclJvbGV9JyBpcyBub3QgYXV0aG9yaXplZCBmb3IgY2xhc3Mgc2NvcmluZyBvcGVyYXRpb25zYCxcbiAgICAgIHsgb3BlcmF0aW9uLCByZXF1aXJlZFJvbGVzOiBhbGxvd2VkUm9sZXMgfVxuICAgICk7XG4gIH1cbn07XG5cbi8vIFZhbGlkYXRlIGNhdCBleGlzdHMgZm9yIGNsYXNzIHNjb3JpbmdcbmV4cG9ydCBjb25zdCB2YWxpZGF0ZUNhdEZvckNsYXNzU2NvcmluZyA9IChjYXQ6IGFueSk6IHZvaWQgPT4ge1xuICBpZiAoIWNhdCkge1xuICAgIHRocm93IG5ldyBDbGFzc1Njb3JpbmdOb3RGb3VuZEVycm9yKFxuICAgICAgJ0NhdCBub3QgZm91bmQgZm9yIGNsYXNzIHNjb3JpbmcnLFxuICAgICAgJ2NhdCdcbiAgICApO1xuICB9XG5cbiAgaWYgKCFjYXQuaWQpIHtcbiAgICB0aHJvdyBuZXcgQ2xhc3NTY29yaW5nVmFsaWRhdGlvbkVycm9yKFxuICAgICAgJ0NhdCBJRCBpcyByZXF1aXJlZCBmb3IgY2xhc3Mgc2NvcmluZycsXG4gICAgICAnY2F0SWQnLFxuICAgICAgJ2dlbmVyYWwnXG4gICAgKTtcbiAgfVxufTtcblxuLy8gQ2FsY3VsYXRlIHJpYmJvbiBlbGlnaWJpbGl0eSB3aXRoIGVycm9yIGhhbmRsaW5nXG5leHBvcnQgY29uc3QgY2FsY3VsYXRlUmliYm9uRWxpZ2liaWxpdHkgPSAoXG4gIHRvdGFsU2NvcmU6IG51bWJlcixcbiAgaGVhbHRoUGFzc2luZzogYm9vbGVhbixcbiAgZmxlYUlzc3VlczogYm9vbGVhbiA9IGZhbHNlXG4pOiBzdHJpbmcgPT4ge1xuICB0cnkge1xuICAgIC8vIFZhbGlkYXRlIGlucHV0c1xuICAgIGlmICh0eXBlb2YgdG90YWxTY29yZSAhPT0gJ251bWJlcicgfHwgdG90YWxTY29yZSA8IDAgfHwgdG90YWxTY29yZSA+IDUwKSB7XG4gICAgICB0aHJvdyBuZXcgQ2xhc3NTY29yaW5nVmFsaWRhdGlvbkVycm9yKFxuICAgICAgICAnSW52YWxpZCB0b3RhbCBzY29yZSBmb3IgcmliYm9uIGNhbGN1bGF0aW9uJyxcbiAgICAgICAgJ3RvdGFsU2NvcmUnLFxuICAgICAgICAnZ2VuZXJhbCcsXG4gICAgICAgIHsgbWluVmFsdWU6IDAsIG1heFZhbHVlOiA1MCwgY3VycmVudFZhbHVlOiB0b3RhbFNjb3JlIH1cbiAgICAgICk7XG4gICAgfVxuXG4gICAgLy8gRmxlYSBpc3N1ZXMgb3IgaGVhbHRoIGZhaWx1cmVzIHJlc3VsdCBpbiBSZWQgUmliYm9uIHJlZ2FyZGxlc3Mgb2Ygc2NvcmVcbiAgICBpZiAoZmxlYUlzc3VlcyB8fCAhaGVhbHRoUGFzc2luZykge1xuICAgICAgcmV0dXJuICdSZWQnO1xuICAgIH1cblxuICAgIC8vIENhbGN1bGF0ZSByaWJib24gYmFzZWQgb24gc2NvcmVcbiAgICBpZiAodG90YWxTY29yZSA+PSA0NSkgcmV0dXJuICdCbHVlJztcbiAgICBpZiAodG90YWxTY29yZSA+PSAzNSkgcmV0dXJuICdSZWQnO1xuICAgIGlmICh0b3RhbFNjb3JlID49IDI1KSByZXR1cm4gJ1doaXRlJztcbiAgICByZXR1cm4gJ1BhcnRpY2lwYXRpb24nO1xuXG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgY2FsY3VsYXRpbmcgcmliYm9uIGVsaWdpYmlsaXR5OicsIGVycm9yKTtcbiAgICB0aHJvdyBuZXcgU3lzdGVtRXJyb3IoJ0ZhaWxlZCB0byBjYWxjdWxhdGUgcmliYm9uIGVsaWdpYmlsaXR5Jyk7XG4gIH1cbn07XG5cbi8vIEVuaGFuY2VkIEhUVFAgc3RhdHVzIGNvZGUgbWFwcGluZyBmb3IgY2xhc3Mgc2NvcmluZyBlcnJvcnNcbmV4cG9ydCBjb25zdCBnZXRDbGFzc1Njb3JpbmdIdHRwU3RhdHVzQ29kZSA9IChlcnJvclR5cGU6IEVycm9yVHlwZSk6IG51bWJlciA9PiB7XG4gIHN3aXRjaCAoZXJyb3JUeXBlKSB7XG4gICAgY2FzZSBFcnJvclR5cGUuVkFMSURBVElPTl9FUlJPUjpcbiAgICAgIHJldHVybiA0MDA7IC8vIEJhZCBSZXF1ZXN0XG4gICAgY2FzZSBFcnJvclR5cGUuUEVSTUlTU0lPTl9FUlJPUjpcbiAgICAgIHJldHVybiA0MDM7IC8vIEZvcmJpZGRlblxuICAgIGNhc2UgRXJyb3JUeXBlLk5PVF9GT1VORDpcbiAgICAgIHJldHVybiA0MDQ7IC8vIE5vdCBGb3VuZFxuICAgIGNhc2UgRXJyb3JUeXBlLkNPTkZMSUNUOlxuICAgICAgcmV0dXJuIDQwOTsgLy8gQ29uZmxpY3QgKGZvciBvcHRpbWlzdGljIGxvY2tpbmcpXG4gICAgY2FzZSBFcnJvclR5cGUuVElNRU9VVF9FUlJPUjpcbiAgICAgIHJldHVybiA0MDg7IC8vIFJlcXVlc3QgVGltZW91dFxuICAgIGNhc2UgRXJyb3JUeXBlLk5FVFdPUktfRVJST1I6XG4gICAgICByZXR1cm4gNTAzOyAvLyBTZXJ2aWNlIFVuYXZhaWxhYmxlXG4gICAgY2FzZSBFcnJvclR5cGUuU1lTVEVNX0VSUk9SOlxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gNTAwOyAvLyBJbnRlcm5hbCBTZXJ2ZXIgRXJyb3JcbiAgfVxufTtcblxuLy8gRW5oYW5jZWQgZXJyb3IgcmVjb3Zlcnkgc3RyYXRlZ2llcyBmb3IgY2xhc3Mgc2NvcmluZ1xuZXhwb3J0IGNvbnN0IGdldENsYXNzU2NvcmluZ1JlY292ZXJ5U3RyYXRlZ3kgPSAoZXJyb3JUeXBlOiBFcnJvclR5cGUsIGNvbnRleHQ/OiBzdHJpbmcpOiB7XG4gIHJldHJ5YWJsZTogYm9vbGVhbjtcbiAgcmV0cnlBZnRlcj86IG51bWJlcjtcbiAgbWF4UmV0cmllcz86IG51bWJlcjtcbiAgc3RyYXRlZ3k6ICdpbW1lZGlhdGUnIHwgJ2V4cG9uZW50aWFsX2JhY2tvZmYnIHwgJ2xpbmVhcl9iYWNrb2ZmJyB8ICdub19yZXRyeSc7XG59ID0+IHtcbiAgc3dpdGNoIChlcnJvclR5cGUpIHtcbiAgICBjYXNlIEVycm9yVHlwZS5ORVRXT1JLX0VSUk9SOlxuICAgIGNhc2UgRXJyb3JUeXBlLlRJTUVPVVRfRVJST1I6XG4gICAgICByZXR1cm4ge1xuICAgICAgICByZXRyeWFibGU6IHRydWUsXG4gICAgICAgIHJldHJ5QWZ0ZXI6IDIwMDAsXG4gICAgICAgIG1heFJldHJpZXM6IDMsXG4gICAgICAgIHN0cmF0ZWd5OiAnZXhwb25lbnRpYWxfYmFja29mZidcbiAgICAgIH07XG4gICAgXG4gICAgY2FzZSBFcnJvclR5cGUuQ09ORkxJQ1Q6XG4gICAgICByZXR1cm4ge1xuICAgICAgICByZXRyeWFibGU6IHRydWUsXG4gICAgICAgIHJldHJ5QWZ0ZXI6IDEwMDAsXG4gICAgICAgIG1heFJldHJpZXM6IDIsXG4gICAgICAgIHN0cmF0ZWd5OiAnbGluZWFyX2JhY2tvZmYnXG4gICAgICB9O1xuICAgIFxuICAgIGNhc2UgRXJyb3JUeXBlLlNZU1RFTV9FUlJPUjpcbiAgICAgIC8vIE9ubHkgcmV0cnkgc3lzdGVtIGVycm9ycyBpZiB0aGV5J3JlIG5vdCB2YWxpZGF0aW9uLXJlbGF0ZWRcbiAgICAgIGlmIChjb250ZXh0Py5pbmNsdWRlcygndmFsaWRhdGlvbicpKSB7XG4gICAgICAgIHJldHVybiB7IHJldHJ5YWJsZTogZmFsc2UsIHN0cmF0ZWd5OiAnbm9fcmV0cnknIH07XG4gICAgICB9XG4gICAgICByZXR1cm4ge1xuICAgICAgICByZXRyeWFibGU6IHRydWUsXG4gICAgICAgIHJldHJ5QWZ0ZXI6IDMwMDAsXG4gICAgICAgIG1heFJldHJpZXM6IDIsXG4gICAgICAgIHN0cmF0ZWd5OiAnZXhwb25lbnRpYWxfYmFja29mZidcbiAgICAgIH07XG4gICAgXG4gICAgY2FzZSBFcnJvclR5cGUuVkFMSURBVElPTl9FUlJPUjpcbiAgICBjYXNlIEVycm9yVHlwZS5QRVJNSVNTSU9OX0VSUk9SOlxuICAgIGNhc2UgRXJyb3JUeXBlLk5PVF9GT1VORDpcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIHsgcmV0cnlhYmxlOiBmYWxzZSwgc3RyYXRlZ3k6ICdub19yZXRyeScgfTtcbiAgfVxufTtcblxuLy8gT3B0aW1pc3RpYyBsb2NraW5nIGhlbHBlciBmb3IgY2xhc3Mgc2NvcmVzXG5leHBvcnQgY29uc3Qgd2l0aENsYXNzU2NvcmluZ09wdGltaXN0aWNMb2NrID0gYXN5bmMgPFQ+KFxuICBvcGVyYXRpb246ICgpID0+IFByb21pc2U8VD4sXG4gIGV4cGVjdGVkVmVyc2lvbj86IHN0cmluZyxcbiAgcmVzb3VyY2VJZD86IHN0cmluZ1xuKTogUHJvbWlzZTxUPiA9PiB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGF3YWl0IG9wZXJhdGlvbigpO1xuICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgLy8gSGFuZGxlIER5bmFtb0RCIGNvbmRpdGlvbmFsIGNoZWNrIGZhaWx1cmVzXG4gICAgaWYgKGVycm9yPy5uYW1lID09PSAnQ29uZGl0aW9uYWxDaGVja0ZhaWxlZEV4Y2VwdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBDbGFzc1Njb3JpbmdDb25mbGljdEVycm9yKFxuICAgICAgICAnVGhpcyBjbGFzcyBzY29yZSBoYXMgYmVlbiBtb2RpZmllZCBieSBhbm90aGVyIGp1ZGdlLiBQbGVhc2UgcmVmcmVzaCBhbmQgdHJ5IGFnYWluLicsXG4gICAgICAgICdvcHRpbWlzdGljX2xvY2snLFxuICAgICAgICB7XG4gICAgICAgICAgcmVzb3VyY2VJZCxcbiAgICAgICAgICBleHBlY3RlZFZlcnNpb24sXG4gICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcbiAgICAgICAgfVxuICAgICAgKTtcbiAgICB9XG4gICAgXG4gICAgLy8gSGFuZGxlIG90aGVyIEFXUyBlcnJvcnMgdGhhdCBtaWdodCBpbmRpY2F0ZSBjb25mbGljdHNcbiAgICBpZiAoZXJyb3I/Lm5hbWUgPT09ICdUcmFuc2FjdGlvbkNhbmNlbGVkRXhjZXB0aW9uJykge1xuICAgICAgY29uc3QgY2FuY2VsUmVhc29ucyA9IGVycm9yLkNhbmNlbGxhdGlvblJlYXNvbnMgfHwgW107XG4gICAgICBjb25zdCBoYXNDb25kaXRpb25hbENoZWNrRmFpbHVyZSA9IGNhbmNlbFJlYXNvbnMuc29tZShcbiAgICAgICAgKHJlYXNvbjogYW55KSA9PiByZWFzb24uQ29kZSA9PT0gJ0NvbmRpdGlvbmFsQ2hlY2tGYWlsZWQnXG4gICAgICApO1xuICAgICAgXG4gICAgICBpZiAoaGFzQ29uZGl0aW9uYWxDaGVja0ZhaWx1cmUpIHtcbiAgICAgICAgdGhyb3cgbmV3IENsYXNzU2NvcmluZ0NvbmZsaWN0RXJyb3IoXG4gICAgICAgICAgJ0NsYXNzIHNjb3JlIG1vZGlmaWNhdGlvbiBjb25mbGljdCBkZXRlY3RlZCBpbiB0cmFuc2FjdGlvbi4nLFxuICAgICAgICAgICd0cmFuc2FjdGlvbl9jb25mbGljdCcsXG4gICAgICAgICAge1xuICAgICAgICAgICAgcmVzb3VyY2VJZCxcbiAgICAgICAgICAgIGV4cGVjdGVkVmVyc2lvbixcbiAgICAgICAgICAgIGNhbmNlbFJlYXNvbnMsXG4gICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxuICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn07XG5cbi8vIFZhbGlkYXRlIGNvbmN1cnJlbnQgbW9kaWZpY2F0aW9uIHByb3RlY3Rpb25cbmV4cG9ydCBjb25zdCB2YWxpZGF0ZUNvbmN1cnJlbnRNb2RpZmljYXRpb24gPSAoXG4gIGN1cnJlbnRWZXJzaW9uOiBzdHJpbmcsXG4gIGV4cGVjdGVkVmVyc2lvbjogc3RyaW5nLFxuICByZXNvdXJjZUlkOiBzdHJpbmdcbik6IHZvaWQgPT4ge1xuICBpZiAoY3VycmVudFZlcnNpb24gIT09IGV4cGVjdGVkVmVyc2lvbikge1xuICAgIHRocm93IG5ldyBDbGFzc1Njb3JpbmdDb25mbGljdEVycm9yKFxuICAgICAgJ0NsYXNzIHNjb3JlIGhhcyBiZWVuIG1vZGlmaWVkIGJ5IGFub3RoZXIganVkZ2Ugc2luY2UgeW91IGxhc3QgbG9hZGVkIGl0LicsXG4gICAgICAndmVyc2lvbl9taXNtYXRjaCcsXG4gICAgICB7XG4gICAgICAgIHJlc291cmNlSWQsXG4gICAgICAgIGN1cnJlbnRWZXJzaW9uLFxuICAgICAgICBleHBlY3RlZFZlcnNpb24sXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXG4gICAgICB9XG4gICAgKTtcbiAgfVxufTtcblxuLy8gRW5oYW5jZWQgZXJyb3IgcmVzcG9uc2Ugd2l0aCByZXRyeSBpbmZvcm1hdGlvblxuZXhwb3J0IGNvbnN0IGNyZWF0ZUNsYXNzU2NvcmluZ0Vycm9yUmVzcG9uc2VXaXRoUmV0cnkgPSAoXG4gIHR5cGU6IEVycm9yVHlwZSxcbiAgbWVzc2FnZTogc3RyaW5nLFxuICBmaWVsZD86IHN0cmluZyxcbiAgY2F0ZWdvcnk/OiBzdHJpbmcsXG4gIHZhbGlkYXRpb25EZXRhaWxzPzogYW55LFxuICByZXRyeUluZm8/OiB7XG4gICAgcmV0cnlhYmxlOiBib29sZWFuO1xuICAgIHJldHJ5QWZ0ZXI/OiBudW1iZXI7XG4gICAgbWF4UmV0cmllcz86IG51bWJlcjtcbiAgfVxuKTogeyBzdGF0dXNDb2RlOiBudW1iZXI7IGJvZHk6IHN0cmluZzsgaGVhZGVycz86IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gfSA9PiB7XG4gIGNvbnN0IHN0YXR1c0NvZGUgPSBnZXRDbGFzc1Njb3JpbmdIdHRwU3RhdHVzQ29kZSh0eXBlKTtcbiAgY29uc3QgaGVhZGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICdYLVNjb3JpbmctVHlwZSc6ICdDTEFTUydcbiAgfTtcblxuICAvLyBBZGQgcmV0cnkgaGVhZGVycyBpZiBhcHBsaWNhYmxlXG4gIGlmIChyZXRyeUluZm8/LnJldHJ5YWJsZSAmJiByZXRyeUluZm8ucmV0cnlBZnRlcikge1xuICAgIGhlYWRlcnNbJ1JldHJ5LUFmdGVyJ10gPSByZXRyeUluZm8ucmV0cnlBZnRlci50b1N0cmluZygpO1xuICB9XG5cbiAgY29uc3QgZXJyb3JSZXNwb25zZTogQ2xhc3NTY29yaW5nRXJyb3JSZXNwb25zZSA9IHtcbiAgICBlcnJvcjoge1xuICAgICAgdHlwZSxcbiAgICAgIG1lc3NhZ2UsXG4gICAgICBmaWVsZCxcbiAgICAgIGNvZGU6IGBDTEFTU19TQ09SSU5HXyR7dHlwZX1gLFxuICAgICAgc2NvcmluZ1R5cGU6ICdDTEFTUycsXG4gICAgICBjYXRlZ29yeTogY2F0ZWdvcnkgYXMgYW55LFxuICAgICAgdmFsaWRhdGlvbkRldGFpbHMsXG4gICAgICByZXRyeUluZm9cbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIHtcbiAgICBzdGF0dXNDb2RlLFxuICAgIGhlYWRlcnMsXG4gICAgYm9keTogSlNPTi5zdHJpbmdpZnkoZXJyb3JSZXNwb25zZSlcbiAgfTtcbn07XG5cbi8vIEJhdGNoIHZhbGlkYXRpb24gZm9yIG11bHRpcGxlIGNsYXNzIHNjb3Jlc1xuZXhwb3J0IGNvbnN0IHZhbGlkYXRlTXVsdGlwbGVDbGFzc1Njb3JlcyA9IChcbiAgc2NvcmVzOiBBcnJheTx7IGlkOiBzdHJpbmc7IGlucHV0OiBhbnkgfT5cbik6IEFycmF5PHsgaWQ6IHN0cmluZzsgZXJyb3JzOiBDbGFzc1Njb3JpbmdWYWxpZGF0aW9uRXJyb3JbXSB9PiA9PiB7XG4gIHJldHVybiBzY29yZXMubWFwKCh7IGlkLCBpbnB1dCB9KSA9PiB7XG4gICAgY29uc3QgZXJyb3JzOiBDbGFzc1Njb3JpbmdWYWxpZGF0aW9uRXJyb3JbXSA9IFtdO1xuICAgIFxuICAgIHRyeSB7XG4gICAgICB2YWxpZGF0ZUNsYXNzU2NvcmluZ0lucHV0KGlucHV0KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgQ2xhc3NTY29yaW5nVmFsaWRhdGlvbkVycm9yKSB7XG4gICAgICAgIGVycm9ycy5wdXNoKGVycm9yKTtcbiAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIHsgaWQsIGVycm9ycyB9O1xuICB9KTtcbn07XG5cbi8vIFJhdGUgbGltaXRpbmcgaGVscGVyIGZvciBjbGFzcyBzY29yaW5nIG9wZXJhdGlvbnNcbmV4cG9ydCBjb25zdCBjaGVja0NsYXNzU2NvcmluZ1JhdGVMaW1pdCA9IChcbiAganVkZ2VJZDogc3RyaW5nLFxuICBvcGVyYXRpb246IHN0cmluZyxcbiAgd2luZG93TXM6IG51bWJlciA9IDYwMDAwLCAvLyAxIG1pbnV0ZVxuICBtYXhPcGVyYXRpb25zOiBudW1iZXIgPSAzMFxuKTogYm9vbGVhbiA9PiB7XG4gIC8vIFRoaXMgd291bGQgdHlwaWNhbGx5IHVzZSBSZWRpcyBvciBEeW5hbW9EQiBmb3IgZGlzdHJpYnV0ZWQgcmF0ZSBsaW1pdGluZ1xuICAvLyBGb3Igbm93LCB3ZSdsbCBpbXBsZW1lbnQgYSBzaW1wbGUgaW4tbWVtb3J5IHZlcnNpb25cbiAgY29uc3Qga2V5ID0gYCR7anVkZ2VJZH06JHtvcGVyYXRpb259YDtcbiAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcbiAgXG4gIC8vIEluIGEgcmVhbCBpbXBsZW1lbnRhdGlvbiwgeW91J2Qgc3RvcmUgdGhpcyBpbiBhIHBlcnNpc3RlbnQgY2FjaGVcbiAgLy8gYW5kIGNsZWFuIHVwIG9sZCBlbnRyaWVzIHBlcmlvZGljYWxseVxuICBcbiAgcmV0dXJuIHRydWU7IC8vIFBsYWNlaG9sZGVyIC0gYWx3YXlzIGFsbG93IGZvciBub3dcbn07XG5cbi8vIEVuaGFuY2VkIGxvZ2dpbmcgZm9yIGNsYXNzIHNjb3Jpbmcgb3BlcmF0aW9uc1xuZXhwb3J0IGNvbnN0IGxvZ0NsYXNzU2NvcmluZ09wZXJhdGlvbiA9IChcbiAgb3BlcmF0aW9uOiBzdHJpbmcsXG4gIGp1ZGdlSWQ6IHN0cmluZyxcbiAgY2F0SWQ/OiBzdHJpbmcsXG4gIGRldGFpbHM/OiBhbnksXG4gIGVycm9yPzogYW55XG4pOiB2b2lkID0+IHtcbiAgY29uc3QgbG9nRGF0YSA9IHtcbiAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICBvcGVyYXRpb24sXG4gICAganVkZ2VJZCxcbiAgICBjYXRJZCxcbiAgICBkZXRhaWxzLFxuICAgIGVycm9yOiBlcnJvciA/IHtcbiAgICAgIG5hbWU6IGVycm9yLm5hbWUsXG4gICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlLFxuICAgICAgc3RhY2s6IGVycm9yLnN0YWNrXG4gICAgfSA6IHVuZGVmaW5lZFxuICB9O1xuICBcbiAgaWYgKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignQ2xhc3Mgc2NvcmluZyBvcGVyYXRpb24gZmFpbGVkOicsIGxvZ0RhdGEpO1xuICB9IGVsc2Uge1xuICAgIGNvbnNvbGUubG9nKCdDbGFzcyBzY29yaW5nIG9wZXJhdGlvbjonLCBsb2dEYXRhKTtcbiAgfVxufTsiXX0=