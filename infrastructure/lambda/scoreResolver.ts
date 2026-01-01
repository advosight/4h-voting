import { AppSyncResolverEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { ScoreDataAccess, CreateScoreInput, UpdateScoreInput } from './scoreDataAccess';
import { 
  getUserContext, 
  requireAnyRole, 
  requireRole, 
  getJudgeId, 
  requireScoreAccess,
  UserContext 
} from './roleValidation';
import { 
  handleError, 
  ValidationError, 
  PermissionError, 
  NotFoundError,
  ConflictError,
  SystemError 
} from './errorHandler';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const scoreDataAccess = new ScoreDataAccess(docClient, process.env.TABLE_NAME!);



/**
 * Validate score input values for 4H cage scoring categories
 */
function validateScoreInput(input: CreateScoreInput | UpdateScoreInput): void {
  const scores = [
    { name: 'firstImpressionScore', value: (input as any).firstImpressionScore, max: 10 },
    { name: 'originalityScore', value: (input as any).originalityScore, max: 15 },
    { name: 'informationCardScore', value: (input as any).informationCardScore, max: 15 },
    { name: 'workDoneByMemberScore', value: (input as any).workDoneByMemberScore, max: 15 },
    { name: 'basicComfortScore', value: (input as any).basicComfortScore, max: 15 },
    { name: 'safetyScore', value: (input as any).safetyScore, max: 15 },
    { name: 'easyViewOfCatScore', value: (input as any).easyViewOfCatScore, max: 15 },
  ];

  for (const score of scores) {
    if (score.value !== undefined) {
      if (typeof score.value !== 'number' || score.value < 0 || score.value > score.max) {
        throw new ValidationError(
          `${score.name} must be between 0 and ${score.max}`,
          score.name,
          { value: score.value, min: 0, max: score.max }
        );
      }
    }
  }

  // Validate comment lengths
  const comments = [
    { name: 'firstImpressionComments', value: (input as any).firstImpressionComments },
    { name: 'originalityComments', value: (input as any).originalityComments },
    { name: 'informationCardComments', value: (input as any).informationCardComments },
    { name: 'workDoneByMemberComments', value: (input as any).workDoneByMemberComments },
    { name: 'basicComfortComments', value: (input as any).basicComfortComments },
    { name: 'safetyComments', value: (input as any).safetyComments },
    { name: 'easyViewOfCatComments', value: (input as any).easyViewOfCatComments },
  ];

  for (const comment of comments) {
    if (comment.value && comment.value.length > 500) {
      throw new ValidationError(
        `Comment must be 500 characters or less`,
        comment.name,
        { length: comment.value.length, maxLength: 500 }
      );
    }
  }
}

export const handler = async (event: AppSyncResolverEvent<any>) => {
  const { fieldName } = event.info;

  try {
    switch (fieldName) {
      case 'createScore':
        return await createScore(event);
      case 'updateScore':
        return await updateScore(event);
      case 'getScore':
        return await getScore(event);
      case 'getScoresByCat':
        return await getScoresByCat(event);
      case 'getScoresByCage':
        return await getScoresByCage(event);
      case 'listAllScores':
        return await listAllScores(event);
      case 'getScoresByJudge':
        return await getScoresByJudge(event);
      case 'finalizeScore':
        return await finalizeScore(event);
      case 'getScoreAuditHistory':
        return await getScoreAuditHistory(event);
      default:
        throw new ValidationError(`Unknown field: ${fieldName}`);
    }
  } catch (error) {
    console.error(`Error in ${fieldName}:`, error);
    
    // Re-throw AppError instances to preserve error type and status
    if (error instanceof ValidationError || 
        error instanceof PermissionError || 
        error instanceof NotFoundError || 
        error instanceof ConflictError || 
        error instanceof SystemError) {
      throw error;
    }
    
    // Handle other errors
    const errorResponse = handleError(error);
    throw new SystemError(errorResponse.error.message, errorResponse.error.details);
  }
};

/**
 * Create a new score
 */
async function createScore(event: AppSyncResolverEvent<{ input: CreateScoreInput }>) {
  const userContext = getUserContext(event);
  requireAnyRole(userContext, ['judge', 'admin']);

  const input = event.arguments.input;
  validateScoreInput(input);

  const judgeId = getJudgeId(userContext);
  if (!judgeId) {
    throw new ValidationError('Unable to determine judge ID from authentication context');
  }

  // Add judge information from authenticated user
  // Try to get a human-readable name from various sources
  const judgeName = userContext?.email || 
                   userContext?.claims?.email || 
                   userContext?.claims?.['cognito:username'] || 
                   userContext?.claims?.name ||
                   'Unknown Judge';
  
  console.log('Creating score with judge info:', { judgeId, judgeName, userContext: userContext });
  
  const createInput: CreateScoreInput = {
    ...input,
    judgeId,
    judgeName,
  };

  const createdBy = userContext?.email || 'Unknown Judge';
  return await scoreDataAccess.createScore(createInput, createdBy);
}

/**
 * Update an existing score
 */
async function updateScore(event: AppSyncResolverEvent<{ id: string; input: UpdateScoreInput }>) {
  const userContext = getUserContext(event);
  requireAnyRole(userContext, ['judge', 'admin']);

  const { id, input } = event.arguments;
  validateScoreInput(input);

  // Check if the score exists
  const existingScore = await scoreDataAccess.getScore(id);
  if (!existingScore) {
    throw new NotFoundError(`Score with ID ${id} not found`);
  }

  // Validate score access permissions
  requireScoreAccess(userContext, existingScore.judgeId);

  // Check if score is finalized and require admin role for modifications
  if (existingScore.isFinalized && userContext?.role !== 'admin') {
    throw new PermissionError('Cannot modify finalized scores. Admin access required.');
  }

  const modifiedBy = userContext?.email || 'Unknown User';
  return await scoreDataAccess.updateScore(id, input, modifiedBy);
}

/**
 * Get a single score by ID
 */
async function getScore(event: AppSyncResolverEvent<{ id: string }>) {
  const userContext = getUserContext(event);
  requireAnyRole(userContext, ['judge', 'admin', 'participant']);

  const { id } = event.arguments;

  const score = await scoreDataAccess.getScore(id);
  if (!score) {
    return null;
  }

  // Check permissions: judges can see their own scores, admins can see all, participants can see finalized scores
  if (userContext?.role === 'participant') {
    if (!score.isFinalized) {
      throw new PermissionError('Score is not yet finalized and cannot be viewed by participants');
    }
  } else if (userContext?.role === 'judge') {
    requireScoreAccess(userContext, score.judgeId);
  }
  // Admin can see all scores

  return score;
}

/**
 * Get all scores for a specific cat
 */
async function getScoresByCat(event: AppSyncResolverEvent<{ catId: string }>) {
  const userContext = getUserContext(event);
  requireAnyRole(userContext, ['judge', 'admin', 'participant']);

  const { catId } = event.arguments;

  const scores = await scoreDataAccess.getScoresByCat(catId);

  // Filter scores based on user role
  if (userContext?.role === 'admin') {
    // Admins can see all scores
    return { items: scores };
  } else if (userContext?.role === 'judge') {
    // Judges can only see their own scores
    const currentJudgeId = getJudgeId(userContext);
    const filteredScores = scores.filter(score => score.judgeId === currentJudgeId);
    return { items: filteredScores };
  } else {
    // Participants can only see finalized scores
    const finalizedScores = scores.filter(score => score.isFinalized);
    return { items: finalizedScores };
  }
}

/**
 * Get all scores for a specific cage number
 */
async function getScoresByCage(event: AppSyncResolverEvent<{ cageNumber: number }>) {
  const userContext = getUserContext(event);
  requireAnyRole(userContext, ['judge', 'admin', 'participant']);

  const { cageNumber } = event.arguments;

  const scores = await scoreDataAccess.getScoresByCage(cageNumber);

  // Apply same filtering logic as getScoresByCat
  if (userContext?.role === 'admin') {
    return { items: scores };
  } else if (userContext?.role === 'judge') {
    const currentJudgeId = getJudgeId(userContext);
    const filteredScores = scores.filter(score => score.judgeId === currentJudgeId);
    return { items: filteredScores };
  } else {
    const finalizedScores = scores.filter(score => score.isFinalized);
    return { items: finalizedScores };
  }
}

/**
 * List all scores in the system
 */
async function listAllScores(event: AppSyncResolverEvent<{}>) {
  const userContext = getUserContext(event);
  requireRole(userContext, 'admin'); // Only admins can list all scores

  const scores = await scoreDataAccess.listAllScores();
  return { items: scores };
}

/**
 * Get all scores by a specific judge
 */
async function getScoresByJudge(event: AppSyncResolverEvent<{ judgeId: string }>) {
  const userContext = getUserContext(event);
  requireAnyRole(userContext, ['judge', 'admin']);

  const { judgeId } = event.arguments;

  // Validate score access permissions
  requireScoreAccess(userContext, judgeId);

  const scores = await scoreDataAccess.getScoresByJudge(judgeId);
  return { items: scores };
}

/**
 * Finalize a score (prevent further modifications)
 */
async function finalizeScore(event: AppSyncResolverEvent<{ id: string }>) {
  const userContext = getUserContext(event);
  requireAnyRole(userContext, ['judge', 'admin']);

  const { id } = event.arguments;

  // Check if the score exists
  const existingScore = await scoreDataAccess.getScore(id);
  if (!existingScore) {
    throw new NotFoundError(`Score with ID ${id} not found`);
  }

  // Validate score access permissions
  requireScoreAccess(userContext, existingScore.judgeId);

  // Check if already finalized
  if (existingScore.isFinalized) {
    throw new ConflictError('Score is already finalized');
  }

  const modifiedBy = userContext?.email || 'Unknown User';
  return await scoreDataAccess.updateScore(id, { 
    isFinalized: true, 
    modificationReason: 'Score finalized' 
  }, modifiedBy);
}

/**
 * Get audit history for a score
 */
async function getScoreAuditHistory(event: AppSyncResolverEvent<{ scoreId: string }>) {
  const userContext = getUserContext(event);
  requireAnyRole(userContext, ['judge', 'admin']);

  const { scoreId } = event.arguments;

  // Check if the score exists
  const score = await scoreDataAccess.getScore(scoreId);
  if (!score) {
    throw new NotFoundError(`Score with ID ${scoreId} not found`);
  }

  // Validate score access permissions
  requireScoreAccess(userContext, score.judgeId);

  const auditEntries = await scoreDataAccess.getScoreAuditHistory(scoreId);
  return { items: auditEntries };
}