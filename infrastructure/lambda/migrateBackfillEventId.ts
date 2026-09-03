import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || 'cat-voting-table';

/**
 * One-time backfill migration to:
 * 1. Create a bootstrap Event if none exists
 * 2. Set the SETTINGS/ACTIVE_EVENT pointer to the bootstrap event
 * 3. Stamp eventId onto every pre-existing untagged Cat/Score/ClassScore/FitShowScore item
 *
 * This script is idempotent: it skips items that already have eventId set.
 * Safe to re-run if interrupted.
 */

interface Item {
  PK: string;
  SK: string;
  eventId?: string;
  [key: string]: any;
}

async function getActiveEventPointer(): Promise<string | null> {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: 'SETTINGS', SK: 'ACTIVE_EVENT' },
    }));
    return result.Item?.activeEventId ?? null;
  } catch (error) {
    console.error('Error getting active event pointer:', error);
    return null;
  }
}

async function setActiveEventPointer(eventId: string, migratedBy: string): Promise<void> {
  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      PK: 'SETTINGS',
      SK: 'ACTIVE_EVENT',
      activeEventId: eventId,
      updatedAt: new Date().toISOString(),
      updatedBy: migratedBy,
    },
  }));
}

async function createBootstrapEvent(): Promise<string> {
  const eventId = randomUUID();
  const now = new Date().toISOString();

  console.log('Creating bootstrap Event:', { eventId, createdAt: now });

  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      PK: `EVENT#${eventId}`,
      SK: 'METADATA',
      id: eventId,
      name: 'Legacy Event',
      date: now.split('T')[0], // YYYY-MM-DD
      createdAt: now,
      status: 'active',
    },
  }));

  return eventId;
}

async function main(): Promise<void> {
  console.log('Starting eventId backfill migration for table:', TABLE_NAME);

  // Step 1: Check if an active event is already configured
  let activeEventId = await getActiveEventPointer();

  if (activeEventId) {
    console.log('Active event already configured:', activeEventId);
  } else {
    // Step 2: Create a bootstrap event if none exists
    console.log('No active event configured. Creating bootstrap event...');
    activeEventId = await createBootstrapEvent();
    await setActiveEventPointer(activeEventId, 'migration-script');
    console.log('Bootstrap event created and set as active:', activeEventId);
  }

  // Step 3: Paginated scan and backfill all untagged items
  let scannedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let lastEvaluatedKey: any = undefined;

  console.log('Beginning paginated scan to backfill eventId...');

  do {
    const result = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      ExclusiveStartKey: lastEvaluatedKey,
      Limit: 100, // Scan in batches to avoid timeout
    }));

    if (!result.Items || result.Items.length === 0) {
      break;
    }

    // Filter to only items that need eventId (CAT#, SCORE#, CLASS_SCORE#, FIT_SHOW_SCORE# and their audit entries)
    const itemsNeedingEventId = (result.Items as Item[]).filter((item: Item) => {
      const pk = item.PK || '';
      const isRelevantItem =
        pk.startsWith('CAT#') ||
        pk.startsWith('SCORE#') ||
        pk.startsWith('CLASS_SCORE#') ||
        pk.startsWith('FIT_SHOW_SCORE#') ||
        pk.startsWith('CLASS_SCORE_AUDIT#') ||
        pk.startsWith('SCORE_AUDIT#');
      return isRelevantItem;
    });

    // Update items that don't have eventId
    for (const item of itemsNeedingEventId) {
      scannedCount++;

      if (item.eventId) {
        skippedCount++;
        continue;
      }

      try {
        // Use UpdateCommand with ConditionExpression for idempotency
        await docClient.send(new UpdateCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: item.PK,
            SK: item.SK,
          },
          UpdateExpression: 'SET eventId = :eventId',
          ExpressionAttributeValues: {
            ':eventId': activeEventId,
          },
          ConditionExpression: 'attribute_not_exists(eventId)',
        }));

        updatedCount++;

        if (updatedCount % 100 === 0) {
          console.log(`Progress: scanned=${scannedCount}, updated=${updatedCount}, skipped=${skippedCount}`);
        }
      } catch (error: any) {
        if (error.name === 'ConditionalCheckFailedException') {
          // Item was already updated by another run, skip silently
          skippedCount++;
        } else {
          console.error(`Error updating item ${item.PK}#${item.SK}:`, error.message);
          throw error;
        }
      }
    }

    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log('Migration complete!');
  console.log(`Final stats: scanned=${scannedCount}, updated=${updatedCount}, skipped=${skippedCount}`);
  console.log(`Active event ID: ${activeEventId}`);
}

// Run the migration when invoked directly
if (require.main === module) {
  main().catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

export { main };
