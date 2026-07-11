import { AppSyncResolverEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { FitShowScoreDataAccess, CreateFitShowScoreInput, UpdateFitShowScoreInput } from './fitShowScoreDataAccess';
import {
  getUserContext,
  requireAnyRole,
  requireRole,
  getJudgeId,
  requireScoreAccess,
  requireScoringPermission,
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
const fitShowScoreDataAccess = new FitShowScoreDataAccess(process.env.TABLE_NAME!);

/**
 * Validate fit and show score input values for all 25 scoring categories
 */
function validateFitShowScoreInput(input: CreateFitShowScoreInput | UpdateFitShowScoreInput): void {
  const scores = [
    // Appearance & Demeanor (20 points)
    { name: 'attire', value: (input as any).attire, min: 1, max: 10 },
    { name: 'attentive', value: (input as any).attentive, min: 1, max: 5 },
    { name: 'courteous', value: (input as any).courteous, min: 1, max: 5 },
    
    // Handling & Control (14 points)
    { name: 'controlEquipment', value: (input as any).controlEquipment, min: 1, max: 10 },
    { name: 'pickupCarrying', value: (input as any).pickupCarrying, min: 1, max: 4 },
    
    // Demonstration Skills (16 points)
    { name: 'showingHeadShape', value: (input as any).showingHeadShape, min: 1, max: 4 },
    { name: 'showingBodyType', value: (input as any).showingBodyType, min: 1, max: 4 },
    { name: 'showingTail', value: (input as any).showingTail, min: 1, max: 4 },
    { name: 'showingCoatTexture', value: (input as any).showingCoatTexture, min: 1, max: 4 },
    
    // Health Examination (21 points)
    { name: 'showingMouthTeethGums', value: (input as any).showingMouthTeethGums, min: 1, max: 3 },
    { name: 'conditionMouthTeethGums', value: (input as any).conditionMouthTeethGums, min: 1, max: 2 },
    { name: 'showingNose', value: (input as any).showingNose, min: 1, max: 2 },
    { name: 'showingEyes', value: (input as any).showingEyes, min: 1, max: 2 },
    { name: 'conditionNoseEyes', value: (input as any).conditionNoseEyes, min: 1, max: 2 },
    { name: 'showingEars', value: (input as any).showingEars, min: 1, max: 2 },
    { name: 'earsClean', value: (input as any).earsClean, min: 1, max: 2 },
    { name: 'showingToenailsClaws', value: (input as any).showingToenailsClaws, min: 1, max: 3 },
    { name: 'toenailsClipped', value: (input as any).toenailsClipped, min: 1, max: 6 },
    
    // Grooming & Care (14 points)
    { name: 'showingBellyCoatCleanliness', value: (input as any).showingBellyCoatCleanliness, min: 1, max: 3 },
    { name: 'coatCleanWellGroomed', value: (input as any).coatCleanWellGroomed, min: 1, max: 8 },
    { name: 'catHealthCare', value: (input as any).catHealthCare, min: 1, max: 3 },
    
    // Knowledge (12 points)
    { name: 'generalKnowledge', value: (input as any).generalKnowledge, min: 1, max: 3 },
    { name: 'catBreedsShowing', value: (input as any).catBreedsShowing, min: 1, max: 3 },
    { name: 'catAnatomy', value: (input as any).catAnatomy, min: 1, max: 3 },
    { name: 'fourHKnowledge', value: (input as any).fourHKnowledge, min: 1, max: 3 },
  ];

  for (const score of scores) {
    if (score.value !== undefined) {
      if (typeof score.value !== 'number' || score.value < score.min || score.value > score.max) {
        throw new ValidationError(
          `${score.name} must be between ${score.min} and ${score.max}`,
          score.name,
          { value: score.value, min: score.min, max: score.max }
        );
      }
    }
  }

  // Validate participant name
  if ('participantName' in input && input.participantName !== undefined) {
    if (!input.participantName || input.participantName.trim().length === 0) {
      throw new ValidationError('Participant name is required and cannot be empty', 'participantName');
    }
    if (input.participantName.length > 100) {
      throw new ValidationError('Participant name must be 100 characters or less', 'participantName', 
        { length: input.participantName.length, maxLength: 100 });
    }
  }

  // Validate comment lengths
  const comments = [
    { name: 'appearanceComments', value: (input as any).appearanceComments },
    { name: 'handlingComments', value: (input as any).handlingComments },
    { name: 'demonstrationComments', value: (input as any).demonstrationComments },
    { name: 'healthExaminationComments', value: (input as any).healthExaminationComments },
    { name: 'groomingCareComments', value: (input as any).groomingCareComments },
    { name: 'knowledgeComments', value: (input as any).knowledgeComments },
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
      case 'createFitShowScore':
        return await createFitShowScore(event);
      case 'updateFitShowScore':
        return await updateFitShowScore(event);
      case 'getFitShowScore':
        return await getFitShowScore(event);
      case 'getFitShowScoresByCat':
        return await getFitShowScoresByCat(event);
      case 'getFitShowScoresByCage':
        return await getFitShowScoresByCage(event);
      case 'listAllFitShowScores':
        return await listAllFitShowScores(event);
      case 'listFitShowScores':
        return await listFitShowScores(event);
      case 'getFitShowScoresByJudge':
        return await getFitShowScoresByJudge(event);
      case 'finalizeFitShowScore':
        return await finalizeFitShowScore(event);
      case 'getFitShowScoreAuditHistory':
        return await getFitShowScoreAuditHistory(event);
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

    // Preserve optimistic-locking conflicts so the frontend's conflict-resolution UI
    // (gated on type=CONFLICT/code=OPTIMISTIC_LOCK_FAILED) actually triggers, instead
    // of relabeling them as a generic SystemError.
    if ((error as any).name === 'ConditionalCheckFailedException') {
      throw new ConflictError(
        'The item has been modified by another user. Please refresh and try again.',
        undefined,
        'OPTIMISTIC_LOCK_FAILED'
      );
    }

    // Handle other errors
    const errorResponse = handleError(error);
    throw new SystemError(errorResponse.error.message, errorResponse.error.details);
  }
};

/**
 * Create a new fit and show score
 */
async function createFitShowScore(event: AppSyncResolverEvent<{ input: CreateFitShowScoreInput }>) {
  const userContext = getUserContext(event);
  requireAnyRole(userContext, ['judge', 'admin']);
  requireScoringPermission(userContext, 'fitShowScoring');

  const input = event.arguments.input;
  validateFitShowScoreInput(input);

  const judgeId = getJudgeId(userContext);
  if (!judgeId) {
    throw new ValidationError('Unable to determine judge ID from authentication context');
  }

  // Add judge information from authenticated user
  const judgeName = userContext?.claims?.['cognito:username'] ||
                   userContext?.claims?.name ||
                   userContext?.email || 
                   userContext?.claims?.email || 
                   'Unknown Judge';
  
  console.log('Creating fit and show score with judge info:', { judgeId, judgeName, userContext: userContext });
  
  const createInput: CreateFitShowScoreInput = {
    ...input,
    judgeId,
    judgeName,
  };

  return await fitShowScoreDataAccess.createFitShowScoreWithAudit(createInput);
}

/**
 * Update an existing fit and show score
 */
async function updateFitShowScore(event: AppSyncResolverEvent<{ id: string; input: UpdateFitShowScoreInput }>) {
  const userContext = getUserContext(event);
  requireAnyRole(userContext, ['judge', 'admin']);
  requireScoringPermission(userContext, 'fitShowScoring');

  const { id, input } = event.arguments;
  validateFitShowScoreInput(input);

  // Check if the score exists
  const existingScore = await fitShowScoreDataAccess.getFitShowScore(id);
  if (!existingScore) {
    throw new NotFoundError(`Fit and show score with ID ${id} not found`);
  }

  // Validate score access permissions
  requireScoreAccess(userContext, existingScore.judgeId);

  // Check if score is finalized and require admin role for modifications
  if (existingScore.isFinalized && userContext?.role !== 'admin') {
    throw new PermissionError('Cannot modify finalized fit and show scores. Admin access required.');
  }

  const updateInput = { ...input, id };
  const reason = input.modificationReason || 'Score updated by judge';
  return await fitShowScoreDataAccess.updateFitShowScoreWithAudit(updateInput, reason, userContext?.role === 'admin');
}

/**
 * Get a single fit and show score by ID
 */
async function getFitShowScore(event: AppSyncResolverEvent<{ id: string }>) {
  const userContext = getUserContext(event);
  requireAnyRole(userContext, ['judge', 'admin', 'participant']);

  const { id } = event.arguments;

  const score = await fitShowScoreDataAccess.getFitShowScore(id);
  if (!score) {
    return null;
  }

  // Check permissions: judges can see their own scores, admins can see all, participants can see finalized scores
  if (userContext?.role === 'participant') {
    if (!score.isFinalized) {
      throw new PermissionError('Fit and show score is not yet finalized and cannot be viewed by participants');
    }
  } else if (userContext?.role === 'judge') {
    requireScoreAccess(userContext, score.judgeId);
  }
  // Admin can see all scores

  return score;
}

/**
 * Get all fit and show scores for a specific cat
 */
async function getFitShowScoresByCat(event: AppSyncResolverEvent<{ catId: string }>) {
  const userContext = getUserContext(event);
  requireAnyRole(userContext, ['judge', 'admin', 'participant']);

  const { catId } = event.arguments;

  const scores = await fitShowScoreDataAccess.getFitShowScoresByCat(catId);

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
 * Get all fit and show scores for a specific cage number
 */
async function getFitShowScoresByCage(event: AppSyncResolverEvent<{ cageNumber: number }>) {
  const userContext = getUserContext(event);
  requireAnyRole(userContext, ['judge', 'admin', 'participant']);

  const { cageNumber } = event.arguments;

  // First find the cat by cage number, then get scores by cat
  // This would need to be implemented in the data access layer or handled here
  // For now, we'll throw an error indicating this needs implementation
  throw new ValidationError('getFitShowScoresByCage not yet implemented - use getFitShowScoresByCat instead');
}

/**
 * List all fit and show scores in the system
 */
async function listAllFitShowScores(event: AppSyncResolverEvent<{}>) {
  const userContext = getUserContext(event);
  requireRole(userContext, 'admin'); // Only admins can list all scores

  const scores = await fitShowScoreDataAccess.listFitShowScores();
  return { items: scores };
}

/**
 * List fit and show scores (alias for listAllFitShowScores for backward compatibility)
 */
async function listFitShowScores(event: AppSyncResolverEvent<{}>) {
  const userContext = getUserContext(event);
  requireRole(userContext, 'admin'); // Only admins can list all scores

  const scores = await fitShowScoreDataAccess.listFitShowScores();
  return { items: scores };
}

/**
 * Get all fit and show scores by a specific judge
 */
async function getFitShowScoresByJudge(event: AppSyncResolverEvent<{ judgeId: string }>) {
  const userContext = getUserContext(event);
  requireAnyRole(userContext, ['judge', 'admin']);

  const { judgeId } = event.arguments;

  // Validate score access permissions
  requireScoreAccess(userContext, judgeId);

  const scores = await fitShowScoreDataAccess.getFitShowScoresByJudge(judgeId);
  return { items: scores };
}

/**
 * Finalize a fit and show score (prevent further modifications)
 */
async function finalizeFitShowScore(event: AppSyncResolverEvent<{ id: string }>) {
  const userContext = getUserContext(event);
  requireAnyRole(userContext, ['judge', 'admin']);

  const { id } = event.arguments;

  // Check if the score exists
  const existingScore = await fitShowScoreDataAccess.getFitShowScore(id);
  if (!existingScore) {
    throw new NotFoundError(`Fit and show score with ID ${id} not found`);
  }

  // Validate score access permissions
  requireScoreAccess(userContext, existingScore.judgeId);

  // Check if already finalized
  if (existingScore.isFinalized) {
    throw new ConflictError('Fit and show score is already finalized');
  }

  return await fitShowScoreDataAccess.finalizeFitShowScore(id, existingScore.judgeId);
}

/**
 * Get audit history for a fit and show score
 */
async function getFitShowScoreAuditHistory(event: AppSyncResolverEvent<{ fitShowScoreId: string }>) {
  const userContext = getUserContext(event);
  requireAnyRole(userContext, ['judge', 'admin']);

  const { fitShowScoreId } = event.arguments;

  // Check if the score exists
  const score = await fitShowScoreDataAccess.getFitShowScore(fitShowScoreId);
  if (!score) {
    throw new NotFoundError(`Fit and show score with ID ${fitShowScoreId} not found`);
  }

  // Validate score access permissions
  requireScoreAccess(userContext, score.judgeId);

  const auditEntries = await fitShowScoreDataAccess.getFitShowScoreAuditHistory(fitShowScoreId);
  return { items: auditEntries };
}