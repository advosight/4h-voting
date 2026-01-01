"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const classScoreDataAccess_1 = require("./classScoreDataAccess");
const roleValidation_1 = require("./roleValidation");
const errorHandler_1 = require("./errorHandler");
const classErrorHandler_1 = require("./classErrorHandler");
const client = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const classScoreDataAccess = new classScoreDataAccess_1.ClassScoreDataAccess(docClient, process.env.TABLE_NAME);
// Validation is now handled by classErrorHandler.validateClassScoringInput
const handler = async (event) => {
    const { fieldName } = event.info;
    const startTime = Date.now();
    try {
        // Log the operation start
        console.log(`Starting class scoring operation: ${fieldName}`, {
            timestamp: new Date().toISOString(),
            fieldName,
            arguments: event.arguments,
            identity: event.identity
        });
        let result;
        switch (fieldName) {
            case 'createClassScore':
                result = await createClassScore(event);
                break;
            case 'updateClassScore':
                result = await updateClassScore(event);
                break;
            case 'getClassScore':
                result = await getClassScore(event);
                break;
            case 'getClassScoresByCat':
                result = await getClassScoresByCat(event);
                break;
            case 'getClassScoresByCage':
                result = await getClassScoresByCage(event);
                break;
            case 'listAllClassScores':
                result = await listAllClassScores(event);
                break;
            case 'getClassScoresByJudge':
                result = await getClassScoresByJudge(event);
                break;
            case 'finalizeClassScore':
                result = await finalizeClassScore(event);
                break;
            case 'getClassScoreAuditHistory':
                result = await getClassScoreAuditHistory(event);
                break;
            default:
                throw new classErrorHandler_1.ClassScoringValidationError(`Unknown field: ${fieldName}`, 'fieldName', 'general');
        }
        // Log successful operation
        const duration = Date.now() - startTime;
        console.log(`Class scoring operation completed: ${fieldName}`, {
            timestamp: new Date().toISOString(),
            fieldName,
            duration,
            success: true
        });
        return result;
    }
    catch (error) {
        const duration = Date.now() - startTime;
        // Enhanced error logging with context
        console.error(`Error in class scoring ${fieldName}:`, {
            timestamp: new Date().toISOString(),
            fieldName,
            duration,
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack
            },
            arguments: event.arguments,
            identity: event.identity
        });
        // Handle class scoring specific errors first
        if (error instanceof classErrorHandler_1.ClassScoringValidationError ||
            error instanceof classErrorHandler_1.ClassScoringPermissionError ||
            error instanceof classErrorHandler_1.ClassScoringNotFoundError ||
            error instanceof classErrorHandler_1.ClassScoringConflictError) {
            throw error;
        }
        // Re-throw AppError instances to preserve error type and status
        if (error instanceof errorHandler_1.ValidationError ||
            error instanceof errorHandler_1.PermissionError ||
            error instanceof errorHandler_1.NotFoundError ||
            error instanceof errorHandler_1.ConflictError ||
            error instanceof errorHandler_1.SystemError) {
            throw error;
        }
        // Handle AWS SDK errors with class scoring context
        if (error.name === 'ResourceNotFoundException') {
            throw new classErrorHandler_1.ClassScoringNotFoundError('The requested resource was not found', 'resource', { originalError: error.message, operation: fieldName });
        }
        if (error.name === 'ConditionalCheckFailedException') {
            throw new classErrorHandler_1.ClassScoringConflictError('A conflict occurred while processing your request. Please refresh and try again.', 'conditional_check_failed', { originalError: error.message, operation: fieldName });
        }
        if (error.name === 'ValidationException') {
            throw new classErrorHandler_1.ClassScoringValidationError('Invalid input provided', 'input', 'general', { originalError: error.message, operation: fieldName });
        }
        if (error.name === 'AccessDeniedException') {
            throw new classErrorHandler_1.ClassScoringPermissionError('Access denied for this class scoring operation', { originalError: error.message, operation: fieldName });
        }
        if (error.name === 'ThrottlingException' || error.name === 'ProvisionedThroughputExceededException') {
            throw new errorHandler_1.SystemError('Service is temporarily unavailable due to high load. Please try again in a moment.', {
                originalError: error.message,
                operation: fieldName,
                retryable: true,
                retryAfter: 2000
            });
        }
        // Handle timeout errors
        if (error.name === 'TimeoutError' || error.code === 'TIMEOUT') {
            throw new errorHandler_1.SystemError('The operation timed out. Please try again.', {
                originalError: error.message,
                operation: fieldName,
                retryable: true,
                retryAfter: 1000
            });
        }
        // Handle other errors with class scoring context
        const errorResponse = (0, classErrorHandler_1.handleClassScoringError)(error, `resolver:${fieldName}`);
        throw new errorHandler_1.SystemError(errorResponse.error.message, {
            ...errorResponse.error.details,
            operation: fieldName,
            duration
        });
    }
};
exports.handler = handler;
/**
 * Create a new class score
 */
async function createClassScore(event) {
    const userContext = (0, roleValidation_1.getUserContext)(event);
    try {
        // Validate permissions
        (0, classErrorHandler_1.validateClassScoringPermissions)(userContext?.role || '', 'create');
        (0, roleValidation_1.requireAnyRole)(userContext, ['judge', 'admin']);
        const input = event.arguments.input;
        // Validate input using class scoring specific validation
        (0, classErrorHandler_1.validateClassScoringInput)(input);
        const judgeId = (0, roleValidation_1.getJudgeId)(userContext);
        if (!judgeId) {
            throw new classErrorHandler_1.ClassScoringValidationError('Unable to determine judge ID from authentication context', 'judgeId', 'general');
        }
        // Add judge information from authenticated user
        const judgeName = userContext?.email ||
            userContext?.claims?.email ||
            userContext?.claims?.['cognito:username'] ||
            userContext?.claims?.name ||
            'Unknown Judge';
        console.log('Creating class score with judge info:', { judgeId, judgeName, userContext: userContext });
        const createInput = {
            ...input,
            judgeId,
            judgeName,
        };
        return await classScoreDataAccess.createClassScore(createInput);
    }
    catch (error) {
        if (error instanceof classErrorHandler_1.ClassScoringValidationError ||
            error instanceof classErrorHandler_1.ClassScoringPermissionError) {
            throw error;
        }
        // Handle DynamoDB errors with class scoring context
        if (error.name === 'ConditionalCheckFailedException') {
            throw new classErrorHandler_1.ClassScoringConflictError('Unable to create class score due to a conflict. Please try again.', 'create_conflict');
        }
        throw new errorHandler_1.SystemError('Failed to create class score', { originalError: error.message });
    }
}
/**
 * Update an existing class score
 */
async function updateClassScore(event) {
    const userContext = (0, roleValidation_1.getUserContext)(event);
    try {
        // Validate permissions
        (0, classErrorHandler_1.validateClassScoringPermissions)(userContext?.role || '', 'update');
        (0, roleValidation_1.requireAnyRole)(userContext, ['judge', 'admin']);
        const { id, input } = event.arguments;
        // Validate input using class scoring specific validation
        (0, classErrorHandler_1.validateClassScoringInput)(input);
        // Check if the class score exists
        const existingScore = await classScoreDataAccess.getClassScore(id);
        if (!existingScore) {
            throw new classErrorHandler_1.ClassScoringNotFoundError(`Class score with ID ${id} not found`, 'classScore');
        }
        // Validate score access permissions
        (0, roleValidation_1.requireScoreAccess)(userContext, existingScore.judgeId);
        // Check if score is finalized and require admin role for modifications
        if (existingScore.isFinalized && userContext?.role !== 'admin') {
            throw new classErrorHandler_1.ClassScoringPermissionError('Cannot modify finalized class scores. Admin access required.', { scoreId: id, isFinalized: true });
        }
        // Get the modifier's name for audit trail
        const modifiedBy = userContext?.email ||
            userContext?.claims?.email ||
            userContext?.claims?.['cognito:username'] ||
            userContext?.claims?.name ||
            'Unknown User';
        return await classScoreDataAccess.updateClassScore(id, input, modifiedBy);
    }
    catch (error) {
        if (error instanceof classErrorHandler_1.ClassScoringValidationError ||
            error instanceof classErrorHandler_1.ClassScoringPermissionError ||
            error instanceof classErrorHandler_1.ClassScoringNotFoundError) {
            throw error;
        }
        // Handle optimistic locking conflicts
        if (error.name === 'ConditionalCheckFailedException') {
            throw new classErrorHandler_1.ClassScoringConflictError('This class score has been modified by another judge. Please refresh and try again.', 'optimistic_lock');
        }
        throw new errorHandler_1.SystemError('Failed to update class score', { originalError: error.message });
    }
}
/**
 * Get a single class score by ID
 */
async function getClassScore(event) {
    const userContext = (0, roleValidation_1.getUserContext)(event);
    (0, roleValidation_1.requireAnyRole)(userContext, ['judge', 'admin', 'participant']);
    const { id } = event.arguments;
    const score = await classScoreDataAccess.getClassScore(id);
    if (!score) {
        return null;
    }
    // Check permissions: judges can see their own scores, admins can see all, participants can see finalized scores
    if (userContext?.role === 'participant') {
        if (!score.isFinalized) {
            throw new errorHandler_1.PermissionError('Class score is not yet finalized and cannot be viewed by participants');
        }
    }
    else if (userContext?.role === 'judge') {
        (0, roleValidation_1.requireScoreAccess)(userContext, score.judgeId);
    }
    // Admin can see all scores
    return score;
}
/**
 * Get all class scores for a specific cat
 */
async function getClassScoresByCat(event) {
    const userContext = (0, roleValidation_1.getUserContext)(event);
    // If no user context, return empty connection instead of throwing error
    if (!userContext) {
        console.log('No user context found for getClassScoresByCat, returning empty connection');
        return { items: [] };
    }
    try {
        (0, roleValidation_1.requireAnyRole)(userContext, ['judge', 'admin', 'participant']);
    }
    catch (error) {
        console.log('User does not have required role for getClassScoresByCat, returning empty connection');
        return { items: [] };
    }
    const { catId } = event.arguments;
    const scores = await classScoreDataAccess.getClassScoresByCat(catId);
    // Filter scores based on user role
    if (userContext?.role === 'admin') {
        // Admins can see all scores
        return { items: scores };
    }
    else if (userContext?.role === 'judge') {
        // Judges can only see their own scores
        const currentJudgeId = (0, roleValidation_1.getJudgeId)(userContext);
        const filteredScores = scores.filter(score => score.judgeId === currentJudgeId);
        return { items: filteredScores };
    }
    else {
        // Participants can only see finalized scores
        const finalizedScores = scores.filter(score => score.isFinalized);
        return { items: finalizedScores };
    }
}
/**
 * Get all class scores for a specific cage number
 */
async function getClassScoresByCage(event) {
    const userContext = (0, roleValidation_1.getUserContext)(event);
    // If no user context, return empty connection instead of throwing error
    if (!userContext) {
        console.log('No user context found for getClassScoresByCage, returning empty connection');
        return { items: [] };
    }
    try {
        (0, roleValidation_1.requireAnyRole)(userContext, ['judge', 'admin', 'participant']);
    }
    catch (error) {
        console.log('User does not have required role for getClassScoresByCage, returning empty connection');
        return { items: [] };
    }
    const { cageNumber } = event.arguments;
    const scores = await classScoreDataAccess.getClassScoresByCage(cageNumber);
    // Apply same filtering logic as getClassScoresByCat
    if (userContext?.role === 'admin') {
        return { items: scores };
    }
    else if (userContext?.role === 'judge') {
        const currentJudgeId = (0, roleValidation_1.getJudgeId)(userContext);
        const filteredScores = scores.filter(score => score.judgeId === currentJudgeId);
        return { items: filteredScores };
    }
    else {
        const finalizedScores = scores.filter(score => score.isFinalized);
        return { items: finalizedScores };
    }
}
/**
 * List all class scores in the system
 */
async function listAllClassScores(event) {
    const userContext = (0, roleValidation_1.getUserContext)(event);
    (0, roleValidation_1.requireRole)(userContext, 'admin'); // Only admins can list all scores
    const scores = await classScoreDataAccess.listAllClassScores();
    return { items: scores };
}
/**
 * Get all class scores by a specific judge
 */
async function getClassScoresByJudge(event) {
    const userContext = (0, roleValidation_1.getUserContext)(event);
    // If no user context, return empty connection instead of throwing error
    if (!userContext) {
        console.log('No user context found for getClassScoresByJudge, returning empty connection');
        return { items: [] };
    }
    try {
        (0, roleValidation_1.requireAnyRole)(userContext, ['judge', 'admin']);
        // Validate score access permissions
        (0, roleValidation_1.requireScoreAccess)(userContext, event.arguments.judgeId);
    }
    catch (error) {
        console.log('User does not have required role for getClassScoresByJudge, returning empty connection');
        return { items: [] };
    }
    const { judgeId } = event.arguments;
    const scores = await classScoreDataAccess.getClassScoresByJudge(judgeId);
    return { items: scores };
}
/**
 * Finalize a class score (prevent further modifications)
 */
async function finalizeClassScore(event) {
    const userContext = (0, roleValidation_1.getUserContext)(event);
    (0, roleValidation_1.requireAnyRole)(userContext, ['judge', 'admin']);
    const { id } = event.arguments;
    // Check if the class score exists
    const existingScore = await classScoreDataAccess.getClassScore(id);
    if (!existingScore) {
        throw new errorHandler_1.NotFoundError(`Class score with ID ${id} not found`);
    }
    // Validate score access permissions
    (0, roleValidation_1.requireScoreAccess)(userContext, existingScore.judgeId);
    // Check if already finalized
    if (existingScore.isFinalized) {
        throw new errorHandler_1.ConflictError('Class score is already finalized');
    }
    // Get the modifier's name for audit trail
    const modifiedBy = userContext?.email ||
        userContext?.claims?.email ||
        userContext?.claims?.['cognito:username'] ||
        userContext?.claims?.name ||
        'Unknown User';
    return await classScoreDataAccess.finalizeClassScore(id, modifiedBy);
}
/**
 * Get audit history for a class score
 */
async function getClassScoreAuditHistory(event) {
    const userContext = (0, roleValidation_1.getUserContext)(event);
    (0, roleValidation_1.requireRole)(userContext, 'admin'); // Only admins can view audit history
    const { classScoreId } = event.arguments;
    const auditEntries = await classScoreDataAccess.getClassScoreAuditHistory(classScoreId);
    return { items: auditEntries };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhc3NTY29yZVJlc29sdmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xhc3NTY29yZVJlc29sdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDhEQUEwRDtBQUMxRCx3REFBK0Q7QUFDL0QsaUVBQTRHO0FBQzVHLHFEQU0wQjtBQUMxQixpREFPd0I7QUFDeEIsMkRBVTZCO0FBRTdCLE1BQU0sTUFBTSxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUN0QyxNQUFNLFNBQVMsR0FBRyxxQ0FBc0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDdEQsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLDJDQUFvQixDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVcsQ0FBQyxDQUFDO0FBRTFGLDJFQUEyRTtBQUVwRSxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBZ0MsRUFBRSxFQUFFO0lBQ2hFLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO0lBQ2pDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUU3QixJQUFJLENBQUM7UUFDSCwwQkFBMEI7UUFDMUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQ0FBcUMsU0FBUyxFQUFFLEVBQUU7WUFDNUQsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO1lBQ25DLFNBQVM7WUFDVCxTQUFTLEVBQUUsS0FBSyxDQUFDLFNBQVM7WUFDMUIsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRO1NBQ3pCLENBQUMsQ0FBQztRQUVILElBQUksTUFBTSxDQUFDO1FBQ1gsUUFBUSxTQUFTLEVBQUUsQ0FBQztZQUNsQixLQUFLLGtCQUFrQjtnQkFDckIsTUFBTSxHQUFHLE1BQU0sZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ3ZDLE1BQU07WUFDUixLQUFLLGtCQUFr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QUFDakMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcFN5bmNSZXNvbHZlckV2ZW50IH0gZnJvbSAnYXdzLWxhbWJkYSc7XG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XG5pbXBvcnQgeyBEeW5hbW9EQkRvY3VtZW50Q2xpZW50IH0gZnJvbSAnQGF3cy1zZGsvbGliLWR5bmFtb2RiJztcbmltcG9ydCB7IENsYXNzU2NvcmVEYXRhQWNjZXNzLCBDcmVhdGVDbGFzc1Njb3JlSW5wdXQsIFVwZGF0ZUNsYXNzU2NvcmVJbnB1dCB9IGZyb20gJy4vY2xhc3NTY29yZURhdGFBY2Nlc3MnO1xuaW1wb3J0IHsgXG4gIGdldFVzZXJDb250ZXh0LCBcbiAgcmVxdWlyZUFueVJvbGUsIFxuICByZXF1aXJlUm9sZSwgXG4gIGdldEp1ZGdlSWQsIFxuICByZXF1aXJlU2NvcmVBY2Nlc3Ncbn0gZnJvbSAnLi9yb2xlVmFsaWRhdGlvbic7XG5pbXBvcnQgeyBcbiAgaGFuZGxlRXJyb3IsIFxuICBWYWxpZGF0aW9uRXJyb3IsIFxuICBQZXJtaXNzaW9uRXJyb3IsIFxuICBOb3RGb3VuZEVycm9yLFxuICBDb25mbGljdEVycm9yLFxuICBTeXN0ZW1FcnJvciBcbn0gZnJvbSAnLi9lcnJvckhhbmRsZXInO1xuaW1wb3J0IHtcbiAgaGFuZGxlQ2xhc3NTY29yaW5nRXJyb3IsXG4gIHZhbGlkYXRlQ2xhc3NTY29yaW5nSW5wdXQsXG4gIHZhbGlkYXRlQ2xhc3NTY29yaW5nUGVybWlzc2lvbnMsXG4gIHZhbGlkYXRlQ2F0Rm9yQ2xhc3NTY29yaW5nLFxuICBjYWxjdWxhdGVSaWJib25FbGlnaWJpbGl0eSxcbiAgQ2xhc3NTY29yaW5nVmFsaWRhdGlvbkVycm9yLFxuICBDbGFzc1Njb3JpbmdQZXJtaXNzaW9uRXJyb3IsXG4gIENsYXNzU2NvcmluZ05vdEZvdW5kRXJyb3IsXG4gIENsYXNzU2NvcmluZ0NvbmZsaWN0RXJyb3Jcbn0gZnJvbSAnLi9jbGFzc0Vycm9ySGFuZGxlcic7XG5cbmNvbnN0IGNsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7fSk7XG5jb25zdCBkb2NDbGllbnQgPSBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LmZyb20oY2xpZW50KTtcbmNvbnN0IGNsYXNzU2NvcmVEYXRhQWNjZXNzID0gbmV3IENsYXNzU2NvcmVEYXRhQWNjZXNzKGRvY0NsaWVudCwgcHJvY2Vzcy5lbnYuVEFCTEVfTkFNRSEpO1xuXG4vLyBWYWxpZGF0aW9uIGlzIG5vdyBoYW5kbGVkIGJ5IGNsYXNzRXJyb3JIYW5kbGVyLnZhbGlkYXRlQ2xhc3NTY29yaW5nSW5wdXRcblxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IEFwcFN5bmNSZXNvbHZlckV2ZW50PGFueT4pID0+IHtcbiAgY29uc3QgeyBmaWVsZE5hbWUgfSA9IGV2ZW50LmluZm87XG4gIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XG5cbiAgdHJ5IHtcbiAgICAvLyBMb2cgdGhlIG9wZXJhdGlvbiBzdGFydFxuICAgIGNvbnNvbGUubG9nKGBTdGFydGluZyBjbGFzcyBzY29yaW5nIG9wZXJhdGlvbjogJHtmaWVsZE5hbWV9YCwge1xuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICBmaWVsZE5hbWUsXG4gICAgICBhcmd1bWVudHM6IGV2ZW50LmFyZ3VtZW50cyxcbiAgICAgIGlkZW50aXR5OiBldmVudC5pZGVudGl0eVxuICAgIH0pO1xuXG4gICAgbGV0IHJlc3VsdDtcbiAgICBzd2l0Y2ggKGZpZWxkTmFtZSkge1xuICAgICAgY2FzZSAnY3JlYXRlQ2xhc3NTY29yZSc6XG4gICAgICAgIHJlc3VsdCA9IGF3YWl0IGNyZWF0ZUNsYXNzU2NvcmUoZXZlbnQpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3VwZGF0ZUNsYXNzU2NvcmUnOlxuICAgICAgICByZXN1bHQgPSBhd2FpdCB1cGRhdGVDbGFzc1Njb3JlKGV2ZW50KTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdnZXRDbGFzc1Njb3JlJzpcbiAgICAgICAgcmVzdWx0ID0gYXdhaXQgZ2V0Q2xhc3NTY29yZShldmVudCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnZ2V0Q2xhc3NTY29yZXNCeUNhdCc6XG4gICAgICAgIHJlc3VsdCA9IGF3YWl0IGdldENsYXNzU2NvcmVzQnlDYXQoZXZlbnQpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2dldENsYXNzU2NvcmVzQnlDYWdlJzpcbiAgICAgICAgcmVzdWx0ID0gYXdhaXQgZ2V0Q2xhc3NTY29yZXNCeUNhZ2UoZXZlbnQpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2xpc3RBbGxDbGFzc1Njb3Jlcyc6XG4gICAgICAgIHJlc3VsdCA9IGF3YWl0IGxpc3RBbGxDbGFzc1Njb3JlcyhldmVudCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnZ2V0Q2xhc3NTY29yZXNCeUp1ZGdlJzpcbiAgICAgICAgcmVzdWx0ID0gYXdhaXQgZ2V0Q2xhc3NTY29yZXNCeUp1ZGdlKGV2ZW50KTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdmaW5hbGl6ZUNsYXNzU2NvcmUnOlxuICAgICAgICByZXN1bHQgPSBhd2FpdCBmaW5hbGl6ZUNsYXNzU2NvcmUoZXZlbnQpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2dldENsYXNzU2NvcmVBdWRpdEhpc3RvcnknOlxuICAgICAgICByZXN1bHQgPSBhd2FpdCBnZXRDbGFzc1Njb3JlQXVkaXRIaXN0b3J5KGV2ZW50KTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgQ2xhc3NTY29yaW5nVmFsaWRhdGlvbkVycm9yKFxuICAgICAgICAgIGBVbmtub3duIGZpZWxkOiAke2ZpZWxkTmFtZX1gLFxuICAgICAgICAgICdmaWVsZE5hbWUnLFxuICAgICAgICAgICdnZW5lcmFsJ1xuICAgICAgICApO1xuICAgIH1cblxuICAgIC8vIExvZyBzdWNjZXNzZnVsIG9wZXJhdGlvblxuICAgIGNvbnN0IGR1cmF0aW9uID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcbiAgICBjb25zb2xlLmxvZyhgQ2xhc3Mgc2NvcmluZyBvcGVyYXRpb24gY29tcGxldGVkOiAke2ZpZWxkTmFtZX1gLCB7XG4gICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgIGZpZWxkTmFtZSxcbiAgICAgIGR1cmF0aW9uLFxuICAgICAgc3VjY2VzczogdHJ1ZVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcblxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnN0IGR1cmF0aW9uID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcbiAgICBcbiAgICAvLyBFbmhhbmNlZCBlcnJvciBsb2dnaW5nIHdpdGggY29udGV4dFxuICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGluIGNsYXNzIHNjb3JpbmcgJHtmaWVsZE5hbWV9OmAsIHtcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgZmllbGROYW1lLFxuICAgICAgZHVyYXRpb24sXG4gICAgICBlcnJvcjoge1xuICAgICAgICBuYW1lOiBlcnJvci5uYW1lLFxuICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlLFxuICAgICAgICBzdGFjazogZXJyb3Iuc3RhY2tcbiAgICAgIH0sXG4gICAgICBhcmd1bWVudHM6IGV2ZW50LmFyZ3VtZW50cyxcbiAgICAgIGlkZW50aXR5OiBldmVudC5pZGVudGl0eVxuICAgIH0pO1xuICAgIFxuICAgIC8vIEhhbmRsZSBjbGFzcyBzY29yaW5nIHNwZWNpZmljIGVycm9ycyBmaXJzdFxuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIENsYXNzU2NvcmluZ1ZhbGlkYXRpb25FcnJvciB8fCBcbiAgICAgICAgZXJyb3IgaW5zdGFuY2VvZiBDbGFzc1Njb3JpbmdQZXJtaXNzaW9uRXJyb3IgfHwgXG4gICAgICAgIGVycm9yIGluc3RhbmNlb2YgQ2xhc3NTY29yaW5nTm90Rm91bmRFcnJvciB8fCBcbiAgICAgICAgZXJyb3IgaW5zdGFuY2VvZiBDbGFzc1Njb3JpbmdDb25mbGljdEVycm9yKSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gICAgXG4gICAgLy8gUmUtdGhyb3cgQXBwRXJyb3IgaW5zdGFuY2VzIHRvIHByZXNlcnZlIGVycm9yIHR5cGUgYW5kIHN0YXR1c1xuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIFZhbGlkYXRpb25FcnJvciB8fCBcbiAgICAgICAgZXJyb3IgaW5zdGFuY2VvZiBQZXJtaXNzaW9uRXJyb3IgfHwgXG4gICAgICAgIGVycm9yIGluc3RhbmNlb2YgTm90Rm91bmRFcnJvciB8fCBcbiAgICAgICAgZXJyb3IgaW5zdGFuY2VvZiBDb25mbGljdEVycm9yIHx8IFxuICAgICAgICBlcnJvciBpbnN0YW5jZW9mIFN5c3RlbUVycm9yKSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gICAgXG4gICAgLy8gSGFuZGxlIEFXUyBTREsgZXJyb3JzIHdpdGggY2xhc3Mgc2NvcmluZyBjb250ZXh0XG4gICAgaWYgKGVycm9yLm5hbWUgPT09ICdSZXNvdXJjZU5vdEZvdW5kRXhjZXB0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IENsYXNzU2NvcmluZ05vdEZvdW5kRXJyb3IoXG4gICAgICAgICdUaGUgcmVxdWVzdGVkIHJlc291cmNlIHdhcyBub3QgZm91bmQnLFxuICAgICAgICAncmVzb3VyY2UnLFxuICAgICAgICB7IG9yaWdpbmFsRXJyb3I6IGVycm9yLm1lc3NhZ2UsIG9wZXJhdGlvbjogZmllbGROYW1lIH1cbiAgICAgICk7XG4gICAgfVxuICAgIFxuICAgIGlmIChlcnJvci5uYW1lID09PSAnQ29uZGl0aW9uYWxDaGVja0ZhaWxlZEV4Y2VwdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBDbGFzc1Njb3JpbmdDb25mbGljdEVycm9yKFxuICAgICAgICAnQSBjb25mbGljdCBvY2N1cnJlZCB3aGlsZSBwcm9jZXNzaW5nIHlvdXIgcmVxdWVzdC4gUGxlYXNlIHJlZnJlc2ggYW5kIHRyeSBhZ2Fpbi4nLFxuICAgICAgICAnY29uZGl0aW9uYWxfY2hlY2tfZmFpbGVkJyxcbiAgICAgICAgeyBvcmlnaW5hbEVycm9yOiBlcnJvci5tZXNzYWdlLCBvcGVyYXRpb246IGZpZWxkTmFtZSB9XG4gICAgICApO1xuICAgIH1cbiAgICBcbiAgICBpZiAoZXJyb3IubmFtZSA9PT0gJ1ZhbGlkYXRpb25FeGNlcHRpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgQ2xhc3NTY29yaW5nVmFsaWRhdGlvbkVycm9yKFxuICAgICAgICAnSW52YWxpZCBpbnB1dCBwcm92aWRlZCcsXG4gICAgICAgICdpbnB1dCcsXG4gICAgICAgICdnZW5lcmFsJyxcbiAgICAgICAgeyBvcmlnaW5hbEVycm9yOiBlcnJvci5tZXNzYWdlLCBvcGVyYXRpb246IGZpZWxkTmFtZSB9XG4gICAgICApO1xuICAgIH1cbiAgICBcbiAgICBpZiAoZXJyb3IubmFtZSA9PT0gJ0FjY2Vzc0RlbmllZEV4Y2VwdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBDbGFzc1Njb3JpbmdQZXJtaXNzaW9uRXJyb3IoXG4gICAgICAgICdBY2Nlc3MgZGVuaWVkIGZvciB0aGlzIGNsYXNzIHNjb3Jpbmcgb3BlcmF0aW9uJyxcbiAgICAgICAgeyBvcmlnaW5hbEVycm9yOiBlcnJvci5tZXNzYWdlLCBvcGVyYXRpb246IGZpZWxkTmFtZSB9XG4gICAgICApO1xuICAgIH1cbiAgICBcbiAgICBpZiAoZXJyb3IubmFtZSA9PT0gJ1Rocm90dGxpbmdFeGNlcHRpb24nIHx8IGVycm9yLm5hbWUgPT09ICdQcm92aXNpb25lZFRocm91Z2hwdXRFeGNlZWRlZEV4Y2VwdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBTeXN0ZW1FcnJvcihcbiAgICAgICAgJ1NlcnZpY2UgaXMgdGVtcG9yYXJpbHkgdW5hdmFpbGFibGUgZHVlIHRvIGhpZ2ggbG9hZC4gUGxlYXNlIHRyeSBhZ2FpbiBpbiBhIG1vbWVudC4nLFxuICAgICAgICB7IFxuICAgICAgICAgIG9yaWdpbmFsRXJyb3I6IGVycm9yLm1lc3NhZ2UsIFxuICAgICAgICAgIG9wZXJhdGlvbjogZmllbGROYW1lLFxuICAgICAgICAgIHJldHJ5YWJsZTogdHJ1ZSxcbiAgICAgICAgICByZXRyeUFmdGVyOiAyMDAwXG4gICAgICAgIH1cbiAgICAgICk7XG4gICAgfVxuICAgIFxuICAgIC8vIEhhbmRsZSB0aW1lb3V0IGVycm9yc1xuICAgIGlmIChlcnJvci5uYW1lID09PSAnVGltZW91dEVycm9yJyB8fCBlcnJvci5jb2RlID09PSAnVElNRU9VVCcpIHtcbiAgICAgIHRocm93IG5ldyBTeXN0ZW1FcnJvcihcbiAgICAgICAgJ1RoZSBvcGVyYXRpb24gdGltZWQgb3V0LiBQbGVhc2UgdHJ5IGFnYWluLicsXG4gICAgICAgIHsgXG4gICAgICAgICAgb3JpZ2luYWxFcnJvcjogZXJyb3IubWVzc2FnZSwgXG4gICAgICAgICAgb3BlcmF0aW9uOiBmaWVsZE5hbWUsXG4gICAgICAgICAgcmV0cnlhYmxlOiB0cnVlLFxuICAgICAgICAgIHJldHJ5QWZ0ZXI6IDEwMDBcbiAgICAgICAgfVxuICAgICAgKTtcbiAgICB9XG4gICAgXG4gICAgLy8gSGFuZGxlIG90aGVyIGVycm9ycyB3aXRoIGNsYXNzIHNjb3JpbmcgY29udGV4dFxuICAgIGNvbnN0IGVycm9yUmVzcG9uc2UgPSBoYW5kbGVDbGFzc1Njb3JpbmdFcnJvcihlcnJvciwgYHJlc29sdmVyOiR7ZmllbGROYW1lfWApO1xuICAgIHRocm93IG5ldyBTeXN0ZW1FcnJvcihcbiAgICAgIGVycm9yUmVzcG9uc2UuZXJyb3IubWVzc2FnZSwgXG4gICAgICB7IFxuICAgICAgICAuLi5lcnJvclJlc3BvbnNlLmVycm9yLmRldGFpbHMsXG4gICAgICAgIG9wZXJhdGlvbjogZmllbGROYW1lLFxuICAgICAgICBkdXJhdGlvblxuICAgICAgfVxuICAgICk7XG4gIH1cbn07XG5cbi8qKlxuICogQ3JlYXRlIGEgbmV3IGNsYXNzIHNjb3JlXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGNyZWF0ZUNsYXNzU2NvcmUoZXZlbnQ6IEFwcFN5bmNSZXNvbHZlckV2ZW50PHsgaW5wdXQ6IENyZWF0ZUNsYXNzU2NvcmVJbnB1dCB9Pikge1xuICBjb25zdCB1c2VyQ29udGV4dCA9IGdldFVzZXJDb250ZXh0KGV2ZW50KTtcbiAgXG4gIHRyeSB7XG4gICAgLy8gVmFsaWRhdGUgcGVybWlzc2lvbnNcbiAgICB2YWxpZGF0ZUNsYXNzU2NvcmluZ1Blcm1pc3Npb25zKHVzZXJDb250ZXh0Py5yb2xlIHx8ICcnLCAnY3JlYXRlJyk7XG4gICAgcmVxdWlyZUFueVJvbGUodXNlckNvbnRleHQsIFsnanVkZ2UnLCAnYWRtaW4nXSk7XG5cbiAgICBjb25zdCBpbnB1dCA9IGV2ZW50LmFyZ3VtZW50cy5pbnB1dDtcbiAgICBcbiAgICAvLyBWYWxpZGF0ZSBpbnB1dCB1c2luZyBjbGFzcyBzY29yaW5nIHNwZWNpZmljIHZhbGlkYXRpb25cbiAgICB2YWxpZGF0ZUNsYXNzU2NvcmluZ0lucHV0KGlucHV0KTtcblxuICAgIGNvbnN0IGp1ZGdlSWQgPSBnZXRKdWRnZUlkKHVzZXJDb250ZXh0KTtcbiAgICBpZiAoIWp1ZGdlSWQpIHtcbiAgICAgIHRocm93IG5ldyBDbGFzc1Njb3JpbmdWYWxpZGF0aW9uRXJyb3IoXG4gICAgICAgICdVbmFibGUgdG8gZGV0ZXJtaW5lIGp1ZGdlIElEIGZyb20gYXV0aGVudGljYXRpb24gY29udGV4dCcsXG4gICAgICAgICdqdWRnZUlkJyxcbiAgICAgICAgJ2dlbmVyYWwnXG4gICAgICApO1xuICAgIH1cblxuICAgIC8vIEFkZCBqdWRnZSBpbmZvcm1hdGlvbiBmcm9tIGF1dGhlbnRpY2F0ZWQgdXNlclxuICAgIGNvbnN0IGp1ZGdlTmFtZSA9IHVzZXJDb250ZXh0Py5lbWFpbCB8fCBcbiAgICAgICAgICAgICAgICAgICAgIHVzZXJDb250ZXh0Py5jbGFpbXM/LmVtYWlsIHx8IFxuICAgICAgICAgICAgICAgICAgICAgdXNlckNvbnRleHQ/LmNsYWltcz8uWydjb2duaXRvOnVzZXJuYW1lJ10gfHwgXG4gICAgICAgICAgICAgICAgICAgICB1c2VyQ29udGV4dD8uY2xhaW1zPy5uYW1lIHx8XG4gICAgICAgICAgICAgICAgICAgICAnVW5rbm93biBKdWRnZSc7XG4gICAgXG4gICAgY29uc29sZS5sb2coJ0NyZWF0aW5nIGNsYXNzIHNjb3JlIHdpdGgganVkZ2UgaW5mbzonLCB7IGp1ZGdlSWQsIGp1ZGdlTmFtZSwgdXNlckNvbnRleHQ6IHVzZXJDb250ZXh0IH0pO1xuICAgIFxuICAgIGNvbnN0IGNyZWF0ZUlucHV0OiBDcmVhdGVDbGFzc1Njb3JlSW5wdXQgPSB7XG4gICAgICAuLi5pbnB1dCxcbiAgICAgIGp1ZGdlSWQsXG4gICAgICBqdWRnZU5hbWUsXG4gICAgfTtcblxuICAgIHJldHVybiBhd2FpdCBjbGFzc1Njb3JlRGF0YUFjY2Vzcy5jcmVhdGVDbGFzc1Njb3JlKGNyZWF0ZUlucHV0KTtcbiAgICBcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBDbGFzc1Njb3JpbmdWYWxpZGF0aW9uRXJyb3IgfHwgXG4gICAgICAgIGVycm9yIGluc3RhbmNlb2YgQ2xhc3NTY29yaW5nUGVybWlzc2lvbkVycm9yKSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gICAgXG4gICAgLy8gSGFuZGxlIER5bmFtb0RCIGVycm9ycyB3aXRoIGNsYXNzIHNjb3JpbmcgY29udGV4dFxuICAgIGlmIChlcnJvci5uYW1lID09PSAnQ29uZGl0aW9uYWxDaGVja0ZhaWxlZEV4Y2VwdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBDbGFzc1Njb3JpbmdDb25mbGljdEVycm9yKFxuICAgICAgICAnVW5hYmxlIHRvIGNyZWF0ZSBjbGFzcyBzY29yZSBkdWUgdG8gYSBjb25mbGljdC4gUGxlYXNlIHRyeSBhZ2Fpbi4nLFxuICAgICAgICAnY3JlYXRlX2NvbmZsaWN0J1xuICAgICAgKTtcbiAgICB9XG4gICAgXG4gICAgdGhyb3cgbmV3IFN5c3RlbUVycm9yKCdGYWlsZWQgdG8gY3JlYXRlIGNsYXNzIHNjb3JlJywgeyBvcmlnaW5hbEVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xuICB9XG59XG5cbi8qKlxuICogVXBkYXRlIGFuIGV4aXN0aW5nIGNsYXNzIHNjb3JlXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHVwZGF0ZUNsYXNzU2NvcmUoZXZlbnQ6IEFwcFN5bmNSZXNvbHZlckV2ZW50PHsgaWQ6IHN0cmluZzsgaW5wdXQ6IFVwZGF0ZUNsYXNzU2NvcmVJbnB1dCB9Pikge1xuICBjb25zdCB1c2VyQ29udGV4dCA9IGdldFVzZXJDb250ZXh0KGV2ZW50KTtcbiAgXG4gIHRyeSB7XG4gICAgLy8gVmFsaWRhdGUgcGVybWlzc2lvbnNcbiAgICB2YWxpZGF0ZUNsYXNzU2NvcmluZ1Blcm1pc3Npb25zKHVzZXJDb250ZXh0Py5yb2xlIHx8ICcnLCAndXBkYXRlJyk7XG4gICAgcmVxdWlyZUFueVJvbGUodXNlckNvbnRleHQsIFsnanVkZ2UnLCAnYWRtaW4nXSk7XG5cbiAgICBjb25zdCB7IGlkLCBpbnB1dCB9ID0gZXZlbnQuYXJndW1lbnRzO1xuICAgIFxuICAgIC8vIFZhbGlkYXRlIGlucHV0IHVzaW5nIGNsYXNzIHNjb3Jpbmcgc3BlY2lmaWMgdmFsaWRhdGlvblxuICAgIHZhbGlkYXRlQ2xhc3NTY29yaW5nSW5wdXQoaW5wdXQpO1xuXG4gICAgLy8gQ2hlY2sgaWYgdGhlIGNsYXNzIHNjb3JlIGV4aXN0c1xuICAgIGNvbnN0IGV4aXN0aW5nU2NvcmUgPSBhd2FpdCBjbGFzc1Njb3JlRGF0YUFjY2Vzcy5nZXRDbGFzc1Njb3JlKGlkKTtcbiAgICBpZiAoIWV4aXN0aW5nU2NvcmUpIHtcbiAgICAgIHRocm93IG5ldyBDbGFzc1Njb3JpbmdOb3RGb3VuZEVycm9yKFxuICAgICAgICBgQ2xhc3Mgc2NvcmUgd2l0aCBJRCAke2lkfSBub3QgZm91bmRgLFxuICAgICAgICAnY2xhc3NTY29yZSdcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLy8gVmFsaWRhdGUgc2NvcmUgYWNjZXNzIHBlcm1pc3Npb25zXG4gICAgcmVxdWlyZVNjb3JlQWNjZXNzKHVzZXJDb250ZXh0LCBleGlzdGluZ1Njb3JlLmp1ZGdlSWQpO1xuXG4gICAgLy8gQ2hlY2sgaWYgc2NvcmUgaXMgZmluYWxpemVkIGFuZCByZXF1aXJlIGFkbWluIHJvbGUgZm9yIG1vZGlmaWNhdGlvbnNcbiAgICBpZiAoZXhpc3RpbmdTY29yZS5pc0ZpbmFsaXplZCAmJiB1c2VyQ29udGV4dD8ucm9sZSAhPT0gJ2FkbWluJykge1xuICAgICAgdGhyb3cgbmV3IENsYXNzU2NvcmluZ1Blcm1pc3Npb25FcnJvcihcbiAgICAgICAgJ0Nhbm5vdCBtb2RpZnkgZmluYWxpemVkIGNsYXNzIHNjb3Jlcy4gQWRtaW4gYWNjZXNzIHJlcXVpcmVkLicsXG4gICAgICAgIHsgc2NvcmVJZDogaWQsIGlzRmluYWxpemVkOiB0cnVlIH1cbiAgICAgICk7XG4gICAgfVxuXG4gICAgLy8gR2V0IHRoZSBtb2RpZmllcidzIG5hbWUgZm9yIGF1ZGl0IHRyYWlsXG4gICAgY29uc3QgbW9kaWZpZWRCeSA9IHVzZXJDb250ZXh0Py5lbWFpbCB8fCBcbiAgICAgICAgICAgICAgICAgICAgICB1c2VyQ29udGV4dD8uY2xhaW1zPy5lbWFpbCB8fCBcbiAgICAgICAgICAgICAgICAgICAgICB1c2VyQ29udGV4dD8uY2xhaW1zPy5bJ2NvZ25pdG86dXNlcm5hbWUnXSB8fCBcbiAgICAgICAgICAgICAgICAgICAgICB1c2VyQ29udGV4dD8uY2xhaW1zPy5uYW1lIHx8XG4gICAgICAgICAgICAgICAgICAgICAgJ1Vua25vd24gVXNlcic7XG5cbiAgICByZXR1cm4gYXdhaXQgY2xhc3NTY29yZURhdGFBY2Nlc3MudXBkYXRlQ2xhc3NTY29yZShpZCwgaW5wdXQsIG1vZGlmaWVkQnkpO1xuICAgIFxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIENsYXNzU2NvcmluZ1ZhbGlkYXRpb25FcnJvciB8fCBcbiAgICAgICAgZXJyb3IgaW5zdGFuY2VvZiBDbGFzc1Njb3JpbmdQZXJtaXNzaW9uRXJyb3IgfHxcbiAgICAgICAgZXJyb3IgaW5zdGFuY2VvZiBDbGFzc1Njb3JpbmdOb3RGb3VuZEVycm9yKSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gICAgXG4gICAgLy8gSGFuZGxlIG9wdGltaXN0aWMgbG9ja2luZyBjb25mbGljdHNcbiAgICBpZiAoZXJyb3IubmFtZSA9PT0gJ0NvbmRpdGlvbmFsQ2hlY2tGYWlsZWRFeGNlcHRpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgQ2xhc3NTY29yaW5nQ29uZmxpY3RFcnJvcihcbiAgICAgICAgJ1RoaXMgY2xhc3Mgc2NvcmUgaGFzIGJlZW4gbW9kaWZpZWQgYnkgYW5vdGhlciBqdWRnZS4gUGxlYXNlIHJlZnJlc2ggYW5kIHRyeSBhZ2Fpbi4nLFxuICAgICAgICAnb3B0aW1pc3RpY19sb2NrJ1xuICAgICAgKTtcbiAgICB9XG4gICAgXG4gICAgdGhyb3cgbmV3IFN5c3RlbUVycm9yKCdGYWlsZWQgdG8gdXBkYXRlIGNsYXNzIHNjb3JlJywgeyBvcmlnaW5hbEVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xuICB9XG59XG5cbi8qKlxuICogR2V0IGEgc2luZ2xlIGNsYXNzIHNjb3JlIGJ5IElEXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGdldENsYXNzU2NvcmUoZXZlbnQ6IEFwcFN5bmNSZXNvbHZlckV2ZW50PHsgaWQ6IHN0cmluZyB9Pikge1xuICBjb25zdCB1c2VyQ29udGV4dCA9IGdldFVzZXJDb250ZXh0KGV2ZW50KTtcbiAgcmVxdWlyZUFueVJvbGUodXNlckNvbnRleHQsIFsnanVkZ2UnLCAnYWRtaW4nLCAncGFydGljaXBhbnQnXSk7XG5cbiAgY29uc3QgeyBpZCB9ID0gZXZlbnQuYXJndW1lbnRzO1xuXG4gIGNvbnN0IHNjb3JlID0gYXdhaXQgY2xhc3NTY29yZURhdGFBY2Nlc3MuZ2V0Q2xhc3NTY29yZShpZCk7XG4gIGlmICghc2NvcmUpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIENoZWNrIHBlcm1pc3Npb25zOiBqdWRnZXMgY2FuIHNlZSB0aGVpciBvd24gc2NvcmVzLCBhZG1pbnMgY2FuIHNlZSBhbGwsIHBhcnRpY2lwYW50cyBjYW4gc2VlIGZpbmFsaXplZCBzY29yZXNcbiAgaWYgKHVzZXJDb250ZXh0Py5yb2xlID09PSAncGFydGljaXBhbnQnKSB7XG4gICAgaWYgKCFzY29yZS5pc0ZpbmFsaXplZCkge1xuICAgICAgdGhyb3cgbmV3IFBlcm1pc3Npb25FcnJvcignQ2xhc3Mgc2NvcmUgaXMgbm90IHlldCBmaW5hbGl6ZWQgYW5kIGNhbm5vdCBiZSB2aWV3ZWQgYnkgcGFydGljaXBhbnRzJyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKHVzZXJDb250ZXh0Py5yb2xlID09PSAnanVkZ2UnKSB7XG4gICAgcmVxdWlyZVNjb3JlQWNjZXNzKHVzZXJDb250ZXh0LCBzY29yZS5qdWRnZUlkKTtcbiAgfVxuICAvLyBBZG1pbiBjYW4gc2VlIGFsbCBzY29yZXNcblxuICByZXR1cm4gc2NvcmU7XG59XG5cbi8qKlxuICogR2V0IGFsbCBjbGFzcyBzY29yZXMgZm9yIGEgc3BlY2lmaWMgY2F0XG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGdldENsYXNzU2NvcmVzQnlDYXQoZXZlbnQ6IEFwcFN5bmNSZXNvbHZlckV2ZW50PHsgY2F0SWQ6IHN0cmluZyB9Pikge1xuICBjb25zdCB1c2VyQ29udGV4dCA9IGdldFVzZXJDb250ZXh0KGV2ZW50KTtcbiAgXG4gIC8vIElmIG5vIHVzZXIgY29udGV4dCwgcmV0dXJuIGVtcHR5IGNvbm5lY3Rpb24gaW5zdGVhZCBvZiB0aHJvd2luZyBlcnJvclxuICBpZiAoIXVzZXJDb250ZXh0KSB7XG4gICAgY29uc29sZS5sb2coJ05vIHVzZXIgY29udGV4dCBmb3VuZCBmb3IgZ2V0Q2xhc3NTY29yZXNCeUNhdCwgcmV0dXJuaW5nIGVtcHR5IGNvbm5lY3Rpb24nKTtcbiAgICByZXR1cm4geyBpdGVtczogW10gfTtcbiAgfVxuICBcbiAgdHJ5IHtcbiAgICByZXF1aXJlQW55Um9sZSh1c2VyQ29udGV4dCwgWydqdWRnZScsICdhZG1pbicsICdwYXJ0aWNpcGFudCddKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmxvZygnVXNlciBkb2VzIG5vdCBoYXZlIHJlcXVpcmVkIHJvbGUgZm9yIGdldENsYXNzU2NvcmVzQnlDYXQsIHJldHVybmluZyBlbXB0eSBjb25uZWN0aW9uJyk7XG4gICAgcmV0dXJuIHsgaXRlbXM6IFtdIH07XG4gIH1cblxuICBjb25zdCB7IGNhdElkIH0gPSBldmVudC5hcmd1bWVudHM7XG5cbiAgY29uc3Qgc2NvcmVzID0gYXdhaXQgY2xhc3NTY29yZURhdGFBY2Nlc3MuZ2V0Q2xhc3NTY29yZXNCeUNhdChjYXRJZCk7XG5cbiAgLy8gRmlsdGVyIHNjb3JlcyBiYXNlZCBvbiB1c2VyIHJvbGVcbiAgaWYgKHVzZXJDb250ZXh0Py5yb2xlID09PSAnYWRtaW4nKSB7XG4gICAgLy8gQWRtaW5zIGNhbiBzZWUgYWxsIHNjb3Jlc1xuICAgIHJldHVybiB7IGl0ZW1zOiBzY29yZXMgfTtcbiAgfSBlbHNlIGlmICh1c2VyQ29udGV4dD8ucm9sZSA9PT0gJ2p1ZGdlJykge1xuICAgIC8vIEp1ZGdlcyBjYW4gb25seSBzZWUgdGhlaXIgb3duIHNjb3Jlc1xuICAgIGNvbnN0IGN1cnJlbnRKdWRnZUlkID0gZ2V0SnVkZ2VJZCh1c2VyQ29udGV4dCk7XG4gICAgY29uc3QgZmlsdGVyZWRTY29yZXMgPSBzY29yZXMuZmlsdGVyKHNjb3JlID0+IHNjb3JlLmp1ZGdlSWQgPT09IGN1cnJlbnRKdWRnZUlkKTtcbiAgICByZXR1cm4geyBpdGVtczogZmlsdGVyZWRTY29yZXMgfTtcbiAgfSBlbHNlIHtcbiAgICAvLyBQYXJ0aWNpcGFudHMgY2FuIG9ubHkgc2VlIGZpbmFsaXplZCBzY29yZXNcbiAgICBjb25zdCBmaW5hbGl6ZWRTY29yZXMgPSBzY29yZXMuZmlsdGVyKHNjb3JlID0+IHNjb3JlLmlzRmluYWxpemVkKTtcbiAgICByZXR1cm4geyBpdGVtczogZmluYWxpemVkU2NvcmVzIH07XG4gIH1cbn1cblxuLyoqXG4gKiBHZXQgYWxsIGNsYXNzIHNjb3JlcyBmb3IgYSBzcGVjaWZpYyBjYWdlIG51bWJlclxuICovXG5hc3luYyBmdW5jdGlvbiBnZXRDbGFzc1Njb3Jlc0J5Q2FnZShldmVudDogQXBwU3luY1Jlc29sdmVyRXZlbnQ8eyBjYWdlTnVtYmVyOiBudW1iZXIgfT4pIHtcbiAgY29uc3QgdXNlckNvbnRleHQgPSBnZXRVc2VyQ29udGV4dChldmVudCk7XG4gIFxuICAvLyBJZiBubyB1c2VyIGNvbnRleHQsIHJldHVybiBlbXB0eSBjb25uZWN0aW9uIGluc3RlYWQgb2YgdGhyb3dpbmcgZXJyb3JcbiAgaWYgKCF1c2VyQ29udGV4dCkge1xuICAgIGNvbnNvbGUubG9nKCdObyB1c2VyIGNvbnRleHQgZm91bmQgZm9yIGdldENsYXNzU2NvcmVzQnlDYWdlLCByZXR1cm5pbmcgZW1wdHkgY29ubmVjdGlvbicpO1xuICAgIHJldHVybiB7IGl0ZW1zOiBbXSB9O1xuICB9XG4gIFxuICB0cnkge1xuICAgIHJlcXVpcmVBbnlSb2xlKHVzZXJDb250ZXh0LCBbJ2p1ZGdlJywgJ2FkbWluJywgJ3BhcnRpY2lwYW50J10pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUubG9nKCdVc2VyIGRvZXMgbm90IGhhdmUgcmVxdWlyZWQgcm9sZSBmb3IgZ2V0Q2xhc3NTY29yZXNCeUNhZ2UsIHJldHVybmluZyBlbXB0eSBjb25uZWN0aW9uJyk7XG4gICAgcmV0dXJuIHsgaXRlbXM6IFtdIH07XG4gIH1cblxuICBjb25zdCB7IGNhZ2VOdW1iZXIgfSA9IGV2ZW50LmFyZ3VtZW50cztcblxuICBjb25zdCBzY29yZXMgPSBhd2FpdCBjbGFzc1Njb3JlRGF0YUFjY2Vzcy5nZXRDbGFzc1Njb3Jlc0J5Q2FnZShjYWdlTnVtYmVyKTtcblxuICAvLyBBcHBseSBzYW1lIGZpbHRlcmluZyBsb2dpYyBhcyBnZXRDbGFzc1Njb3Jlc0J5Q2F0XG4gIGlmICh1c2VyQ29udGV4dD8ucm9sZSA9PT0gJ2FkbWluJykge1xuICAgIHJldHVybiB7IGl0ZW1zOiBzY29yZXMgfTtcbiAgfSBlbHNlIGlmICh1c2VyQ29udGV4dD8ucm9sZSA9PT0gJ2p1ZGdlJykge1xuICAgIGNvbnN0IGN1cnJlbnRKdWRnZUlkID0gZ2V0SnVkZ2VJZCh1c2VyQ29udGV4dCk7XG4gICAgY29uc3QgZmlsdGVyZWRTY29yZXMgPSBzY29yZXMuZmlsdGVyKHNjb3JlID0+IHNjb3JlLmp1ZGdlSWQgPT09IGN1cnJlbnRKdWRnZUlkKTtcbiAgICByZXR1cm4geyBpdGVtczogZmlsdGVyZWRTY29yZXMgfTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBmaW5hbGl6ZWRTY29yZXMgPSBzY29yZXMuZmlsdGVyKHNjb3JlID0+IHNjb3JlLmlzRmluYWxpemVkKTtcbiAgICByZXR1cm4geyBpdGVtczogZmluYWxpemVkU2NvcmVzIH07XG4gIH1cbn1cblxuLyoqXG4gKiBMaXN0IGFsbCBjbGFzcyBzY29yZXMgaW4gdGhlIHN5c3RlbVxuICovXG5hc3luYyBmdW5jdGlvbiBsaXN0QWxsQ2xhc3NTY29yZXMoZXZlbnQ6IEFwcFN5bmNSZXNvbHZlckV2ZW50PHt9Pikge1xuICBjb25zdCB1c2VyQ29udGV4dCA9IGdldFVzZXJDb250ZXh0KGV2ZW50KTtcbiAgcmVxdWlyZVJvbGUodXNlckNvbnRleHQsICdhZG1pbicpOyAvLyBPbmx5IGFkbWlucyBjYW4gbGlzdCBhbGwgc2NvcmVzXG5cbiAgY29uc3Qgc2NvcmVzID0gYXdhaXQgY2xhc3NTY29yZURhdGFBY2Nlc3MubGlzdEFsbENsYXNzU2NvcmVzKCk7XG4gIHJldHVybiB7IGl0ZW1zOiBzY29yZXMgfTtcbn1cblxuLyoqXG4gKiBHZXQgYWxsIGNsYXNzIHNjb3JlcyBieSBhIHNwZWNpZmljIGp1ZGdlXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGdldENsYXNzU2NvcmVzQnlKdWRnZShldmVudDogQXBwU3luY1Jlc29sdmVyRXZlbnQ8eyBqdWRnZUlkOiBzdHJpbmcgfT4pIHtcbiAgY29uc3QgdXNlckNvbnRleHQgPSBnZXRVc2VyQ29udGV4dChldmVudCk7XG4gIFxuICAvLyBJZiBubyB1c2VyIGNvbnRleHQsIHJldHVybiBlbXB0eSBjb25uZWN0aW9uIGluc3RlYWQgb2YgdGhyb3dpbmcgZXJyb3JcbiAgaWYgKCF1c2VyQ29udGV4dCkge1xuICAgIGNvbnNvbGUubG9nKCdObyB1c2VyIGNvbnRleHQgZm91bmQgZm9yIGdldENsYXNzU2NvcmVzQnlKdWRnZSwgcmV0dXJuaW5nIGVtcHR5IGNvbm5lY3Rpb24nKTtcbiAgICByZXR1cm4geyBpdGVtczogW10gfTtcbiAgfVxuICBcbiAgdHJ5IHtcbiAgICByZXF1aXJlQW55Um9sZSh1c2VyQ29udGV4dCwgWydqdWRnZScsICdhZG1pbiddKTtcbiAgICAvLyBWYWxpZGF0ZSBzY29yZSBhY2Nlc3MgcGVybWlzc2lvbnNcbiAgICByZXF1aXJlU2NvcmVBY2Nlc3ModXNlckNvbnRleHQsIGV2ZW50LmFyZ3VtZW50cy5qdWRnZUlkKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmxvZygnVXNlciBkb2VzIG5vdCBoYXZlIHJlcXVpcmVkIHJvbGUgZm9yIGdldENsYXNzU2NvcmVzQnlKdWRnZSwgcmV0dXJuaW5nIGVtcHR5IGNvbm5lY3Rpb24nKTtcbiAgICByZXR1cm4geyBpdGVtczogW10gfTtcbiAgfVxuXG4gIGNvbnN0IHsganVkZ2VJZCB9ID0gZXZlbnQuYXJndW1lbnRzO1xuXG4gIGNvbnN0IHNjb3JlcyA9IGF3YWl0IGNsYXNzU2NvcmVEYXRhQWNjZXNzLmdldENsYXNzU2NvcmVzQnlKdWRnZShqdWRnZUlkKTtcbiAgcmV0dXJuIHsgaXRlbXM6IHNjb3JlcyB9O1xufVxuXG4vKipcbiAqIEZpbmFsaXplIGEgY2xhc3Mgc2NvcmUgKHByZXZlbnQgZnVydGhlciBtb2RpZmljYXRpb25zKVxuICovXG5hc3luYyBmdW5jdGlvbiBmaW5hbGl6ZUNsYXNzU2NvcmUoZXZlbnQ6IEFwcFN5bmNSZXNvbHZlckV2ZW50PHsgaWQ6IHN0cmluZyB9Pikge1xuICBjb25zdCB1c2VyQ29udGV4dCA9IGdldFVzZXJDb250ZXh0KGV2ZW50KTtcbiAgcmVxdWlyZUFueVJvbGUodXNlckNvbnRleHQsIFsnanVkZ2UnLCAnYWRtaW4nXSk7XG5cbiAgY29uc3QgeyBpZCB9ID0gZXZlbnQuYXJndW1lbnRzO1xuXG4gIC8vIENoZWNrIGlmIHRoZSBjbGFzcyBzY29yZSBleGlzdHNcbiAgY29uc3QgZXhpc3RpbmdTY29yZSA9IGF3YWl0IGNsYXNzU2NvcmVEYXRhQWNjZXNzLmdldENsYXNzU2NvcmUoaWQpO1xuICBpZiAoIWV4aXN0aW5nU2NvcmUpIHtcbiAgICB0aHJvdyBuZXcgTm90Rm91bmRFcnJvcihgQ2xhc3Mgc2NvcmUgd2l0aCBJRCAke2lkfSBub3QgZm91bmRgKTtcbiAgfVxuXG4gIC8vIFZhbGlkYXRlIHNjb3JlIGFjY2VzcyBwZXJtaXNzaW9uc1xuICByZXF1aXJlU2NvcmVBY2Nlc3ModXNlckNvbnRleHQsIGV4aXN0aW5nU2NvcmUuanVkZ2VJZCk7XG5cbiAgLy8gQ2hlY2sgaWYgYWxyZWFkeSBmaW5hbGl6ZWRcbiAgaWYgKGV4aXN0aW5nU2NvcmUuaXNGaW5hbGl6ZWQpIHtcbiAgICB0aHJvdyBuZXcgQ29uZmxpY3RFcnJvcignQ2xhc3Mgc2NvcmUgaXMgYWxyZWFkeSBmaW5hbGl6ZWQnKTtcbiAgfVxuXG4gIC8vIEdldCB0aGUgbW9kaWZpZXIncyBuYW1lIGZvciBhdWRpdCB0cmFpbFxuICBjb25zdCBtb2RpZmllZEJ5ID0gdXNlckNvbnRleHQ/LmVtYWlsIHx8IFxuICAgICAgICAgICAgICAgICAgICB1c2VyQ29udGV4dD8uY2xhaW1zPy5lbWFpbCB8fCBcbiAgICAgICAgICAgICAgICAgICAgdXNlckNvbnRleHQ/LmNsYWltcz8uWydjb2duaXRvOnVzZXJuYW1lJ10gfHwgXG4gICAgICAgICAgICAgICAgICAgIHVzZXJDb250ZXh0Py5jbGFpbXM/Lm5hbWUgfHxcbiAgICAgICAgICAgICAgICAgICAgJ1Vua25vd24gVXNlcic7XG5cbiAgcmV0dXJuIGF3YWl0IGNsYXNzU2NvcmVEYXRhQWNjZXNzLmZpbmFsaXplQ2xhc3NTY29yZShpZCwgbW9kaWZpZWRCeSk7XG59XG5cbi8qKlxuICogR2V0IGF1ZGl0IGhpc3RvcnkgZm9yIGEgY2xhc3Mgc2NvcmVcbiAqL1xuYXN5bmMgZnVuY3Rpb24gZ2V0Q2xhc3NTY29yZUF1ZGl0SGlzdG9yeShldmVudDogQXBwU3luY1Jlc29sdmVyRXZlbnQ8eyBjbGFzc1Njb3JlSWQ6IHN0cmluZyB9Pikge1xuICBjb25zdCB1c2VyQ29udGV4dCA9IGdldFVzZXJDb250ZXh0KGV2ZW50KTtcbiAgcmVxdWlyZVJvbGUodXNlckNvbnRleHQsICdhZG1pbicpOyAvLyBPbmx5IGFkbWlucyBjYW4gdmlldyBhdWRpdCBoaXN0b3J5XG5cbiAgY29uc3QgeyBjbGFzc1Njb3JlSWQgfSA9IGV2ZW50LmFyZ3VtZW50cztcblxuICBjb25zdCBhdWRpdEVudHJpZXMgPSBhd2FpdCBjbGFzc1Njb3JlRGF0YUFjY2Vzcy5nZXRDbGFzc1Njb3JlQXVkaXRIaXN0b3J5KGNsYXNzU2NvcmVJZCk7XG4gIHJldHVybiB7IGl0ZW1zOiBhdWRpdEVudHJpZXMgfTtcbn0iXX0=