import { AppSyncResolverEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { EventDataAccess } from './eventDataAccess';
import { getUserContext, requireRole, requireAnyRole, UserContext } from './roleValidation';
import { handleError, ValidationError, PermissionError, NotFoundError, SystemError } from './errorHandler';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const eventDataAccess = new EventDataAccess(docClient, process.env.TABLE_NAME!);

export const handler = async (event: AppSyncResolverEvent<any>) => {
  const { fieldName } = event.info;

  try {
    switch (fieldName) {
      case 'getActiveEvent':
        return await getActiveEvent(event);
      case 'listEvents':
        return await listEvents(event);
      case 'switchActiveEvent':
        return await switchActiveEvent(event);
      case 'archiveAndCreateEvent':
        return await archiveAndCreateEvent(event);
      default:
        throw new ValidationError(`Unknown field: ${fieldName}`);
    }
  } catch (error) {
    console.error(`Error in ${fieldName}:`, error);

    // Re-throw AppError instances to preserve error type and status
    if (
      error instanceof ValidationError ||
      error instanceof PermissionError ||
      error instanceof NotFoundError ||
      error instanceof SystemError
    ) {
      throw error;
    }

    // Handle other errors
    const errorResponse = handleError(error);
    throw new SystemError(errorResponse.error.message, errorResponse.error.details);
  }
};

/**
 * Get the currently active event
 */
async function getActiveEvent(event: AppSyncResolverEvent<any>) {
  const userContext = await getUserContext(event);
  requireAnyRole(userContext, ['admin', 'judge']);

  return await eventDataAccess.getActiveEvent();
}

/**
 * List all events
 */
async function listEvents(event: AppSyncResolverEvent<any>) {
  const userContext = await getUserContext(event);
  requireAnyRole(userContext, ['admin', 'judge']);

  const items = await eventDataAccess.listEvents();
  return { items };
}

/**
 * Switch the active event to a different event
 */
async function switchActiveEvent(event: AppSyncResolverEvent<any>) {
  const userContext = await getUserContext(event);
  requireRole(userContext, 'admin');

  const adminId = userContext?.claims?.sub || userContext?.userId || 'unknown-admin';
  const eventId = event.arguments.eventId;

  return await eventDataAccess.switchActiveEvent(eventId, adminId);
}

/**
 * Archive the current event and create a new active event
 */
async function archiveAndCreateEvent(event: AppSyncResolverEvent<any>) {
  const userContext = await getUserContext(event);
  requireRole(userContext, 'admin');

  const adminId = userContext?.claims?.sub || userContext?.userId || 'unknown-admin';
  const newEventName = event.arguments.newEventName;
  const newEventDate = event.arguments.newEventDate;

  return await eventDataAccess.archiveAndCreateEvent(newEventName, newEventDate, adminId);
}
