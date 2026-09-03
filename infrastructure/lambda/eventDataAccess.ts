import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { NotFoundError, SystemError } from './errorHandler';

export interface Event {
  id: string;
  name: string;
  date: string;
  status: 'active' | 'archived';
  archivedAt?: string;
  archivedBy?: string;
  createdAt: string;
}

export class EventDataAccess {
  constructor(private docClient: DynamoDBDocumentClient, private tableName: string) {}

  /**
   * Get the currently active event ID from the SETTINGS/ACTIVE_EVENT pointer
   */
  private async getActiveEventPointer(): Promise<string | null> {
    try {
      const result = await this.docClient.send(new GetCommand({
        TableName: this.tableName,
        Key: { PK: 'SETTINGS', SK: 'ACTIVE_EVENT' },
      }));
      return result.Item?.activeEventId ?? null;
    } catch (error) {
      console.error('Error getting active event pointer:', error);
      throw error;
    }
  }

  /**
   * Set the active event pointer
   */
  private async setActiveEventPointer(eventId: string, updatedBy: string): Promise<void> {
    try {
      await this.docClient.send(new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: 'SETTINGS',
          SK: 'ACTIVE_EVENT',
          activeEventId: eventId,
          updatedAt: new Date().toISOString(),
          updatedBy,
        },
      }));
    } catch (error) {
      console.error('Error setting active event pointer:', error);
      throw error;
    }
  }

  /**
   * Get a specific event by ID (status is placeholder 'archived', caller must derive correct status)
   */
  async getEvent(id: string): Promise<Event | null> {
    try {
      const result = await this.docClient.send(new GetCommand({
        TableName: this.tableName,
        Key: { PK: `EVENT#${id}`, SK: 'METADATA' },
      }));

      if (!result.Item) {
        return null;
      }

      return {
        id: result.Item.PK.replace('EVENT#', ''),
        name: result.Item.name,
        date: result.Item.date,
        createdAt: result.Item.createdAt,
        status: 'archived', // Placeholder, caller must derive actual status
        archivedAt: result.Item.archivedAt ?? undefined,
        archivedBy: result.Item.archivedBy ?? undefined,
      };
    } catch (error) {
      console.error('Error getting event:', error);
      throw error;
    }
  }

  /**
   * Get the currently active event
   */
  async getActiveEvent(): Promise<Event | null> {
    try {
      const pointerId = await this.getActiveEventPointer();
      if (!pointerId) {
        return null;
      }

      const event = await this.getEvent(pointerId);
      if (!event) {
        return null;
      }

      return {
        ...event,
        status: 'active',
      };
    } catch (error) {
      console.error('Error getting active event:', error);
      throw error;
    }
  }

  /**
   * Switch the active event pointer to a different event
   */
  async switchActiveEvent(eventId: string, updatedBy: string): Promise<Event> {
    try {
      const event = await this.getEvent(eventId);
      if (!event) {
        throw new NotFoundError(`Event ${eventId} not found`);
      }

      await this.setActiveEventPointer(eventId, updatedBy);

      return {
        ...event,
        status: 'active',
      };
    } catch (error) {
      console.error('Error switching active event:', error);
      throw error;
    }
  }

  /**
   * Create a new event
   */
  private async createEvent(name: string, date: string): Promise<Event> {
    try {
      const id = randomUUID();
      const createdAt = new Date().toISOString();

      await this.docClient.send(new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `EVENT#${id}`,
          SK: 'METADATA',
          name,
          date,
          createdAt,
        },
      }));

      return {
        id,
        name,
        date,
        createdAt,
        status: 'active',
      };
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  /**
   * Archive the current active event and create a new active event
   */
  async archiveAndCreateEvent(newEventName: string, newEventDate: string, archivedBy: string): Promise<Event> {
    try {
      const previousEventId = await this.getActiveEventPointer();

      // If there was a previous active event, archive it
      if (previousEventId) {
        await this.docClient.send(new UpdateCommand({
          TableName: this.tableName,
          Key: { PK: `EVENT#${previousEventId}`, SK: 'METADATA' },
          UpdateExpression: 'SET archivedAt = :archivedAt, archivedBy = :archivedBy',
          ExpressionAttributeValues: {
            ':archivedAt': new Date().toISOString(),
            ':archivedBy': archivedBy,
          },
        }));
      }

      // Create the new event
      const newEvent = await this.createEvent(newEventName, newEventDate);

      // Set it as the active event
      await this.setActiveEventPointer(newEvent.id, archivedBy);

      return {
        ...newEvent,
        status: 'active',
      };
    } catch (error) {
      console.error('Error archiving and creating event:', error);
      throw error;
    }
  }

  /**
   * List all events, deriving status based on the current active pointer
   */
  async listEvents(): Promise<Event[]> {
    try {
      const events: Event[] = [];
      let exclusiveStartKey: any = undefined;

      // Paginated scan for all EVENT# items
      do {
        const result = await this.docClient.send(new ScanCommand({
          TableName: this.tableName,
          FilterExpression: 'begins_with(PK, :pk) AND SK = :sk',
          ExpressionAttributeValues: {
            ':pk': 'EVENT#',
            ':sk': 'METADATA',
          },
          ExclusiveStartKey: exclusiveStartKey,
        }));

        if (result.Items) {
          events.push(...result.Items.map(item => ({
            id: item.PK.replace('EVENT#', ''),
            name: item.name,
            date: item.date,
            createdAt: item.createdAt,
            status: 'archived' as const, // Will be updated below
            archivedAt: item.archivedAt ?? undefined,
            archivedBy: item.archivedBy ?? undefined,
          })));
        }

        exclusiveStartKey = result.LastEvaluatedKey;
      } while (exclusiveStartKey);

      // Determine which event is active
      const activeEventId = await this.getActiveEventPointer();

      // Set the status for each event
      return events.map(event => ({
        ...event,
        status: event.id === activeEventId ? 'active' : 'archived',
      }));
    } catch (error) {
      console.error('Error listing events:', error);
      throw error;
    }
  }
}

/**
 * Standalone helper function to get the currently active event ID
 * Used by other resolvers to determine which eventId to use for new records
 */
export async function getActiveEventId(docClient: DynamoDBDocumentClient, tableName: string): Promise<string> {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: tableName,
      Key: { PK: 'SETTINGS', SK: 'ACTIVE_EVENT' },
    }));

    const activeEventId = result.Item?.activeEventId;
    if (!activeEventId) {
      throw new SystemError('No active event configured');
    }

    return activeEventId;
  } catch (error) {
    if (error instanceof SystemError) {
      throw error;
    }
    console.error('Error getting active event ID:', error);
    throw new SystemError('No active event configured');
  }
}
