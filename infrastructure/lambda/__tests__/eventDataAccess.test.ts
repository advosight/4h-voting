import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { EventDataAccess, getActiveEventId } from '../eventDataAccess';
import { SystemError, NotFoundError } from '../errorHandler';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('EventDataAccess', () => {
  let eventDataAccess: EventDataAccess;
  const tableName = 'test-table';

  beforeEach(() => {
    ddbMock.reset();
    const docClient = ddbMock as unknown as DynamoDBDocumentClient;
    eventDataAccess = new EventDataAccess(docClient, tableName);
  });

  describe('getActiveEvent', () => {
    it('should return null when no active event is configured', async () => {
      ddbMock.on(GetCommand).resolves({});

      const result = await eventDataAccess.getActiveEvent();

      expect(result).toBeNull();
    });

    it('should return the active event with status "active"', async () => {
      const eventId = 'event-123';
      const eventItem = {
        PK: `EVENT#${eventId}`,
        SK: 'METADATA',
        name: 'Test Event',
        date: '2024-09-02',
        createdAt: '2024-09-02T10:00:00Z',
      };

      // Mock the active event pointer query
      ddbMock.on(GetCommand, {
        Key: { PK: 'SETTINGS', SK: 'ACTIVE_EVENT' },
      }).resolves({ Item: { activeEventId: eventId } });

      // Mock the event metadata query
      ddbMock.on(GetCommand, {
        Key: { PK: `EVENT#${eventId}`, SK: 'METADATA' },
      }).resolves({ Item: eventItem });

      const result = await eventDataAccess.getActiveEvent();

      expect(result).toBeDefined();
      expect(result?.id).toEqual(eventId);
      expect(result?.status).toEqual('active');
      expect(result?.name).toEqual('Test Event');
    });
  });

  describe('switchActiveEvent', () => {
    it('should throw NotFoundError when event does not exist', async () => {
      // Mock the event metadata query to return nothing
      ddbMock.on(GetCommand, {
        Key: { PK: 'EVENT#unknown-id', SK: 'METADATA' },
      }).resolves({});

      await expect(
        eventDataAccess.switchActiveEvent('unknown-id', 'admin-123')
      ).rejects.toThrow(NotFoundError);
    });

    it('should switch to a new active event', async () => {
      const newEventId = 'event-456';
      const eventItem = {
        PK: `EVENT#${newEventId}`,
        SK: 'METADATA',
        name: 'New Event',
        date: '2024-09-10',
        createdAt: '2024-09-10T10:00:00Z',
      };

      // Mock the event metadata query
      ddbMock.on(GetCommand, {
        Key: { PK: `EVENT#${newEventId}`, SK: 'METADATA' },
      }).resolves({ Item: eventItem });

      // Mock the pointer update
      ddbMock.on(PutCommand, {
        Item: {
          PK: 'SETTINGS',
          SK: 'ACTIVE_EVENT',
        },
      }).resolves({});

      const result = await eventDataAccess.switchActiveEvent(newEventId, 'admin-123');

      expect(result).toBeDefined();
      expect(result.id).toEqual(newEventId);
      expect(result.status).toEqual('active');
    });
  });

  describe('getActiveEventId', () => {
    it('should throw SystemError when no active event is configured', async () => {
      ddbMock.on(GetCommand, {
        Key: { PK: 'SETTINGS', SK: 'ACTIVE_EVENT' },
      }).resolves({});

      const docClient = ddbMock as unknown as DynamoDBDocumentClient;

      await expect(
        getActiveEventId(docClient, tableName)
      ).rejects.toThrow(SystemError);
    });

    it('should return the active event ID when configured', async () => {
      const eventId = 'event-789';

      ddbMock.on(GetCommand, {
        Key: { PK: 'SETTINGS', SK: 'ACTIVE_EVENT' },
      }).resolves({ Item: { activeEventId: eventId } });

      const docClient = ddbMock as unknown as DynamoDBDocumentClient;

      const result = await getActiveEventId(docClient, tableName);

      expect(result).toEqual(eventId);
    });
  });

  describe('listEvents', () => {
    it('should return all events with correct status derivation', async () => {
      const activeEventId = 'event-1';
      const archivedEventId = 'event-2';

      // Mock the scan to return all events
      ddbMock.on(ScanCommand).resolves({
        Items: [
          {
            PK: `EVENT#${activeEventId}`,
            SK: 'METADATA',
            name: 'Active Event',
            date: '2024-09-02',
            createdAt: '2024-09-02T10:00:00Z',
          },
          {
            PK: `EVENT#${archivedEventId}`,
            SK: 'METADATA',
            name: 'Archived Event',
            date: '2024-08-01',
            createdAt: '2024-08-01T10:00:00Z',
            archivedAt: '2024-09-01T10:00:00Z',
            archivedBy: 'admin-123',
          },
        ],
      });

      // Mock the active event pointer query
      ddbMock.on(GetCommand, {
        Key: { PK: 'SETTINGS', SK: 'ACTIVE_EVENT' },
      }).resolves({ Item: { activeEventId } });

      const results = await eventDataAccess.listEvents();

      expect(results).toHaveLength(2);
      expect(results.find(e => e.id === activeEventId)?.status).toEqual('active');
      expect(results.find(e => e.id === archivedEventId)?.status).toEqual('archived');
    });
  });

  describe('archiveAndCreateEvent', () => {
    it('should create a new event and make it active when no prior event exists', async () => {
      // Mock no active event pointer
      ddbMock.on(GetCommand, {
        Key: { PK: 'SETTINGS', SK: 'ACTIVE_EVENT' },
      }).resolves({});

      // Mock the put commands for new event and pointer
      ddbMock.on(PutCommand).resolves({});

      const result = await eventDataAccess.archiveAndCreateEvent(
        'New Event',
        '2024-09-10',
        'admin-123'
      );

      expect(result).toBeDefined();
      expect(result.status).toEqual('active');
      expect(result.name).toEqual('New Event');
      expect(result.date).toEqual('2024-09-10');
    });

    it('should archive previous event and create new active event', async () => {
      const previousEventId = 'event-old';
      const newEventId = 'event-new';

      // Mock the active event pointer query
      ddbMock.on(GetCommand, {
        Key: { PK: 'SETTINGS', SK: 'ACTIVE_EVENT' },
      }).resolves({ Item: { activeEventId: previousEventId } });

      // Mock the put and update commands
      ddbMock.on(UpdateCommand).resolves({});
      ddbMock.on(PutCommand).resolves({});

      const result = await eventDataAccess.archiveAndCreateEvent(
        'New Event',
        '2024-09-10',
        'admin-123'
      );

      expect(result).toBeDefined();
      expect(result.status).toEqual('active');
      expect(result.name).toEqual('New Event');
      expect(result.date).toEqual('2024-09-10');
    });
  });
});
