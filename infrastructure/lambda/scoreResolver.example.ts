import { AppSyncResolverEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { ScoreDataAccess, CreateScoreInput, UpdateScoreInput } from './scoreDataAccess';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const scoreDataAccess = new ScoreDataAccess(docClient, process.env.TABLE_NAME!);

/**
 * Example resolver function showing how to integrate ScoreDataAccess
 * This would be integrated into the main resolver.ts file
 */
export const scoreResolverHandler = async (event: AppSyncResolverEvent<any>) => {
  const { fieldName } = event.info;

  try {
    switch (fieldName) {
      case 'createScore':
        return await createScore(event.arguments.input);
      case 'getScore':
        return await getScore(event.arguments.id);
      case 'updateScore':
        return await updateScore(event.arguments.id, event.arguments.input);
      case 'deleteScore':
        return await deleteScore(event.arguments.id);
      case 'getScoresByCat':
        return await getScoresByCat(event.arguments.catId);
      case 'getScoresByJudge':
        return await getScoresByJudge(event.arguments.judgeId);
      case 'getScoresByCage':
        return await getScoresByCage(event.arguments.cageNumber);
      case 'listAllScores':
        return await listAllScores();
      default:
        throw new Error(`Unknown field: ${fieldName}`);
    }
  } catch (error) {
    console.error(`Error in ${fieldName}:`, error);
    throw error;
  }
};

async function createScore(input: CreateScoreInput) {
  // Add validation here if needed
  validateScoreInput(input);
  
  const score = await scoreDataAccess.createScore(input);
  return score;
}

async function getScore(id: string) {
  const score = await scoreDataAccess.getScore(id);
  if (!score) {
    throw new Error('Score not found');
  }
  return score;
}

async function updateScore(id: string, input: UpdateScoreInput) {
  // Add validation here if needed
  validateUpdateScoreInput(input);
  
  const score = await scoreDataAccess.updateScore(id, input);
  return score;
}

async function deleteScore(id: string) {
  const score = await scoreDataAccess.deleteScore(id);
  return score;
}

async function getScoresByCat(catId: string) {
  const scores = await scoreDataAccess.getScoresByCat(catId);
  return { items: scores };
}

async function getScoresByJudge(judgeId: string) {
  const scores = await scoreDataAccess.getScoresByJudge(judgeId);
  return { items: scores };
}

async function getScoresByCage(cageNumber: number) {
  const scores = await scoreDataAccess.getScoresByCage(cageNumber);
  return { items: scores };
}

async function listAllScores() {
  const scores = await scoreDataAccess.listAllScores();
  return { items: scores };
}

/**
 * Validation functions
 */
function validateScoreInput(input: CreateScoreInput) {
  // Validate score ranges (0-25 for each category)
  const scores = [
    input.cageConditionScore,
    input.catConditionScore,
    input.groomingScore,
    input.overallScore,
  ];

  for (const score of scores) {
    if (score < 0 || score > 25) {
      throw new Error(`Score must be between 0 and 25, got ${score}`);
    }
  }

  // Validate comment lengths (max 500 characters)
  const comments = [
    input.cageConditionComments,
    input.catConditionComments,
    input.groomingComments,
    input.overallComments,
  ];

  for (const comment of comments) {
    if (comment && comment.length > 500) {
      throw new Error(`Comment must be 500 characters or less, got ${comment.length}`);
    }
  }

  // Validate required fields
  if (!input.catId || !input.judgeId || !input.judgeName) {
    throw new Error('catId, judgeId, and judgeName are required');
  }
}

function validateUpdateScoreInput(input: UpdateScoreInput) {
  // Validate score ranges if provided
  const scores = [
    input.cageConditionScore,
    input.catConditionScore,
    input.groomingScore,
    input.overallScore,
  ].filter(score => score !== undefined);

  for (const score of scores) {
    if (score! < 0 || score! > 25) {
      throw new Error(`Score must be between 0 and 25, got ${score}`);
    }
  }

  // Validate comment lengths if provided
  const comments = [
    input.cageConditionComments,
    input.catConditionComments,
    input.groomingComments,
    input.overallComments,
  ].filter(comment => comment !== undefined);

  for (const comment of comments) {
    if (comment && comment.length > 500) {
      throw new Error(`Comment must be 500 characters or less, got ${comment.length}`);
    }
  }
}