import { AppSyncResolverEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { ClassScoreDataAccess, CreateClassScoreInput, UpdateClassScoreInput } from './classScoreDataAccess';
import {
  getUserContext,
  requireAnyRole,
  requireRole,
  getJudgeId,
  requireScoreAccess,
  requireScoringPermission
} from './roleValidation';
import { 
  handleError, 
  ValidationError, 
  PermissionError, 
  NotFoundError,
  ConflictError,
  SystemError 
} from './errorHandler';
import {
  handleClassScoringError,
  validateClassScoringInput,
  validateClassScoringPermissions,
  validateCatForClassScoring,
  calculateRibbonEligibility,
  ClassScoringValidationError,
  ClassScoringPermissionError,
  ClassScoringNotFoundError,
  ClassScoringConflictError
} from './classErrorHandler';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const classScoreDataAccess = new ClassScoreDataAccess(docClient, process.env.TABLE_NAME!);

// Validation is now handled by classErrorHandler.validateClassScoringInput

export const handler = async (event: AppSyncResolverEvent<any>) => {
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
        throw new ClassScoringValidationError(
          `Unknown field: ${fieldName}`,
          'fieldName',
          'general'
        );
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

  } catch (error: any) {
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
    if (error instanceof ClassScoringValidationError || 
        error instanceof ClassScoringPermissionError || 
        error instanceof ClassScoringNotFoundError || 
        error instanceof ClassScoringConflictError) {
      throw error;
    }
    
    // Re-throw AppError instances to preserve error type and status
    if (error instanceof ValidationError || 
        error instanceof PermissionError || 
        error instanceof NotFoundError || 
        error instanceof ConflictError || 
        error instanceof SystemError) {
      throw error;
    }
    
    // Handle AWS SDK errors with class scoring context
    if (error.name === 'ResourceNotFoundException') {
      throw new ClassScoringNotFoundError(
        'The requested resource was not found',
        'resource',
        { originalError: error.message, operation: fieldName }
      );
    }
    
    if (error.name === 'ConditionalCheckFailedException') {
      throw new ClassScoringConflictError(
        'A conflict occurred while processing your request. Please refresh and try again.',
        'conditional_check_failed',
        { originalError: error.message, operation: fieldName }
      );
    }
    
    if (error.name === 'ValidationException') {
      throw new ClassScoringValidationError(
        'Invalid input provided',
        'input',
        'general',
        { originalError: error.message, operation: fieldName }
      );
    }
    
    if (error.name === 'AccessDeniedException') {
      throw new ClassScoringPermissionError(
        'Access denied for this class scoring operation',
        { originalError: error.message, operation: fieldName }
      );
    }
    
    if (error.name === 'ThrottlingException' || error.name === 'ProvisionedThroughputExceededException') {
      throw new SystemError(
        'Service is temporarily unavailable due to high load. Please try again in a moment.',
        { 
          originalError: error.message, 
          operation: fieldName,
          retryable: true,
          retryAfter: 2000
        }
      );
    }
    
    // Handle timeout errors
    if (error.name === 'TimeoutError' || error.code === 'TIMEOUT') {
      throw new SystemError(
        'The operation timed out. Please try again.',
        { 
          originalError: error.message, 
          operation: fieldName,
          retryable: true,
          retryAfter: 1000
        }
      );
    }
    
    // Handle other errors with class scoring context
    const errorResponse = handleClassScoringError(error, `resolver:${fieldName}`);
    throw new SystemError(
      errorResponse.error.message, 
      { 
        ...errorResponse.error.details,
        operation: fieldName,
        duration
      }
    );
  }
};

/**
 * Create a new class score
 */
async function createClassScore(event: AppSyncResolverEvent<{ input: CreateClassScoreInput }>) {
  const userContext = getUserContext(event);
  
  try {
    // Validate permissions
    validateClassScoringPermissions(userContext?.role || '', 'create');
    requireAnyRole(userContext, ['judge', 'admin']);
    requireScoringPermission(userContext, 'classScoring');

    const input = event.arguments.input;
    
    // Validate input using class scoring specific validation
    validateClassScoringInput(input);

    const judgeId = getJudgeId(userContext);
    if (!judgeId) {
      throw new ClassScoringValidationError(
        'Unable to determine judge ID from authentication context',
        'judgeId',
        'general'
      );
    }

    // Add judge information from authenticated user
    const judgeName = userContext?.email || 
                     userContext?.claims?.email || 
                     userContext?.claims?.['cognito:username'] || 
                     userContext?.claims?.name ||
                     'Unknown Judge';
    
    console.log('Creating class score with judge info:', { judgeId, judgeName, userContext: userContext });
    
    const createInput: CreateClassScoreInput = {
      ...input,
      judgeId,
      judgeName,
    };

    return await classScoreDataAccess.createClassScore(createInput);
    
  } catch (error: any) {
    if (error instanceof ClassScoringValidationError || 
        error instanceof ClassScoringPermissionError) {
      throw error;
    }
    
    // Handle DynamoDB errors with class scoring context
    if (error.name === 'ConditionalCheckFailedException') {
      throw new ClassScoringConflictError(
        'Unable to create class score due to a conflict. Please try again.',
        'create_conflict'
      );
    }
    
    throw new SystemError('Failed to create class score', { originalError: error.message });
  }
}

/**
 * Update an existing class score
 */
async function updateClassScore(event: AppSyncResolverEvent<{ id: string; input: UpdateClassScoreInput }>) {
  const userContext = getUserContext(event);
  
  try {
    // Validate permissions
    validateClassScoringPermissions(userContext?.role || '', 'update');
    requireAnyRole(userContext, ['judge', 'admin']);
    requireScoringPermission(userContext, 'classScoring');

    const { id, input } = event.arguments;
    
    // Validate input using class scoring specific validation
    validateClassScoringInput(input);

    // Check if the class score exists
    const existingScore = await classScoreDataAccess.getClassScore(id);
    if (!existingScore) {
      throw new ClassScoringNotFoundError(
        `Class score with ID ${id} not found`,
        'classScore'
      );
    }

    // Validate score access permissions
    requireScoreAccess(userContext, existingScore.judgeId);

    // Check if score is finalized and require admin role for modifications
    if (existingScore.isFinalized && userContext?.role !== 'admin') {
      throw new ClassScoringPermissionError(
        'Cannot modify finalized class scores. Admin access required.',
        { scoreId: id, isFinalized: true }
      );
    }

    // Get the modifier's name for audit trail
    const modifiedBy = userContext?.email || 
                      userContext?.claims?.email || 
                      userContext?.claims?.['cognito:username'] || 
                      userContext?.claims?.name ||
                      'Unknown User';

    return await classScoreDataAccess.updateClassScore(id, input, modifiedBy, userContext?.role === 'admin');

  } catch (error: any) {
    if (error instanceof ClassScoringValidationError ||
        error instanceof ClassScoringPermissionError ||
        error instanceof ClassScoringNotFoundError) {
      throw error;
    }

    // Handle optimistic locking conflicts
    if (error.name === 'ConditionalCheckFailedException') {
      throw new ClassScoringConflictError(
        'This class score has been modified by another judge. Please refresh and try again.',
        'optimistic_lock'
      );
    }
    
    throw new SystemError('Failed to update class score', { originalError: error.message });
  }
}

/**
 * Get a single class score by ID
 */
async function getClassScore(event: AppSyncResolverEvent<{ id: string }>) {
  const userContext = getUserContext(event);
  requireAnyRole(userContext, ['judge', 'admin', 'participant']);

  const { id } = event.arguments;

  const score = await classScoreDataAccess.getClassScore(id);
  if (!score) {
    return null;
  }

  // Check permissions: judges can see their own scores plus any finalized score,
  // admins can see all, participants can only see finalized scores
  if (userContext?.role === 'judge') {
    if (!score.isFinalized) {
      requireScoreAccess(userContext, score.judgeId);
    }
  } else if (userContext?.role === 'participant') {
    if (!score.isFinalized) {
      throw new PermissionError('Class score is not yet finalized and cannot be viewed by participants');
    }
  }
  // Admin can see all scores

  return score;
}

/**
 * Get all class scores for a specific cat
 */
async function getClassScoresByCat(event: AppSyncResolverEvent<{ catId: string }>) {
  const userContext = getUserContext(event);
  
  // If no user context, return empty connection instead of throwing error
  if (!userContext) {
    console.log('No user context found for getClassScoresByCat, returning empty connection');
    return { items: [] };
  }
  
  try {
    requireAnyRole(userContext, ['judge', 'admin', 'participant']);
  } catch (error) {
    console.log('User does not have required role for getClassScoresByCat, returning empty connection');
    return { items: [] };
  }

  const { catId } = event.arguments;

  const scores = await classScoreDataAccess.getClassScoresByCat(catId);

  // Filter scores based on user role
  if (userContext?.role === 'admin') {
    // Admins can see all scores
    return { items: scores };
  } else if (userContext?.role === 'judge') {
    // Judges can see their own scores (finalized or not) plus any finalized score
    const currentJudgeId = getJudgeId(userContext);
    const visibleScores = scores.filter(score => score.isFinalized || score.judgeId === currentJudgeId);
    return { items: visibleScores };
  } else {
    // Participants can only see finalized scores
    const finalizedScores = scores.filter(score => score.isFinalized);
    return { items: finalizedScores };
  }
}

/**
 * Get all class scores for a specific cage number
 */
async function getClassScoresByCage(event: AppSyncResolverEvent<{ cageNumber: number }>) {
  const userContext = getUserContext(event);
  
  // If no user context, return empty connection instead of throwing error
  if (!userContext) {
    console.log('No user context found for getClassScoresByCage, returning empty connection');
    return { items: [] };
  }
  
  try {
    requireAnyRole(userContext, ['judge', 'admin', 'participant']);
  } catch (error) {
    console.log('User does not have required role for getClassScoresByCage, returning empty connection');
    return { items: [] };
  }

  const { cageNumber } = event.arguments;

  const scores = await classScoreDataAccess.getClassScoresByCage(cageNumber);

  // Apply same filtering logic as getClassScoresByCat
  if (userContext?.role === 'admin') {
    return { items: scores };
  } else if (userContext?.role === 'judge') {
    const currentJudgeId = getJudgeId(userContext);
    const visibleScores = scores.filter(score => score.isFinalized || score.judgeId === currentJudgeId);
    return { items: visibleScores };
  } else {
    const finalizedScores = scores.filter(score => score.isFinalized);
    return { items: finalizedScores };
  }
}

/**
 * List all class scores in the system
 */
async function listAllClassScores(event: AppSyncResolverEvent<{}>) {
  const userContext = getUserContext(event);
  requireAnyRole(userContext, ['judge', 'admin']); // Judges and admins can list all scores for the leaderboard

  const scores = await classScoreDataAccess.listAllClassScores();
  return { items: scores };
}

/**
 * Get all class scores by a specific judge
 */
async function getClassScoresByJudge(event: AppSyncResolverEvent<{ judgeId: string }>) {
  const userContext = getUserContext(event);
  
  // If no user context, return empty connection instead of throwing error
  if (!userContext) {
    console.log('No user context found for getClassScoresByJudge, returning empty connection');
    return { items: [] };
  }
  
  try {
    requireAnyRole(userContext, ['judge', 'admin']);
  } catch (error) {
    console.log('User does not have required role for getClassScoresByJudge, returning empty connection');
    return { items: [] };
  }

  const { judgeId } = event.arguments;

  // A judge requesting another judge's scores is a genuine access violation, not an
  // "empty result" case — let it surface as a real permission error instead of masking
  // it as {items: []}, which would make a broken access check indistinguishable from
  // a judge who legitimately has no scores yet.
  requireScoreAccess(userContext, judgeId);

  const scores = await classScoreDataAccess.getClassScoresByJudge(judgeId);
  return { items: scores };
}

/**
 * Finalize a class score (prevent further modifications)
 */
async function finalizeClassScore(event: AppSyncResolverEvent<{ id: string }>) {
  const userContext = getUserContext(event);
  requireAnyRole(userContext, ['judge', 'admin']);

  const { id } = event.arguments;

  // Check if the class score exists
  const existingScore = await classScoreDataAccess.getClassScore(id);
  if (!existingScore) {
    throw new NotFoundError(`Class score with ID ${id} not found`);
  }

  // Validate score access permissions
  requireScoreAccess(userContext, existingScore.judgeId);

  // Check if already finalized
  if (existingScore.isFinalized) {
    throw new ConflictError('Class score is already finalized');
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
async function getClassScoreAuditHistory(event: AppSyncResolverEvent<{ classScoreId: string }>) {
  const userContext = getUserContext(event);
  requireRole(userContext, 'admin'); // Only admins can view audit history

  const { classScoreId } = event.arguments;

  const auditEntries = await classScoreDataAccess.getClassScoreAuditHistory(classScoreId);
  return { items: auditEntries };
}