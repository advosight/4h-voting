#!/usr/bin/env node

/**
 * Backfills today's per-day vote bucket (CAT#<id> / VOTES#<date>) from each
 * cat's existing event-wide total (CAT#<id> / METADATA / votes).
 *
 * Daily tracking was only just added, so every vote already on a cat's total
 * predates any VOTES#<date> rows. This script attributes that pre-existing
 * total to today's bucket, without double-counting live votes that may have
 * already landed in today's bucket since the feature deployed.
 *
 * Idempotent: for each cat it computes `backfill = total - existingDayVotes`
 * and only ADDs the positive remainder, so re-running is a no-op once a
 * cat's day bucket has caught up to its total.
 *
 * Usage:
 *   node scripts/backfill-daily-votes.js            # dry run, no writes
 *   node scripts/backfill-daily-votes.js --apply     # perform the backfill
 *   node scripts/backfill-daily-votes.js --apply --date 2026-07-16
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const TABLE_NAME = process.env.TABLE_NAME || 'cat-voting-table';
const REGION = process.env.AWS_REGION || 'us-west-2';

const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

const APPLY = process.argv.includes('--apply');

function getDateArg() {
  const flagIndex = process.argv.indexOf('--date');
  if (flagIndex !== -1 && process.argv[flagIndex + 1]) {
    return process.argv[flagIndex + 1];
  }
  // Same convention as the live resolver: venue-local (Pacific) calendar day.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
}

async function listCats() {
  let items = [];
  let lastEvaluatedKey;

  do {
    const result = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :pk) AND SK = :sk',
      ExpressionAttributeValues: { ':pk': 'CAT#', ':sk': 'METADATA' },
      ConsistentRead: true,
      ExclusiveStartKey: lastEvaluatedKey,
    }));
    items.push(...(result.Items || []));
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return items.map(item => ({
    id: item.PK.replace('CAT#', ''),
    name: item.name || 'Unknown Cat',
    votes: parseInt(item.votes) || 0,
  }));
}

async function backfillCat(cat, dateStr) {
  const dayKey = { PK: `CAT#${cat.id}`, SK: `VOTES#${dateStr}` };

  const existing = await docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: dayKey }));
  const existingVotes = parseInt(existing.Item?.votes) || 0;
  const backfill = cat.votes - existingVotes;

  if (backfill <= 0) {
    console.log(`  = ${cat.name} (${cat.id}): day bucket already has ${existingVotes}, total is ${cat.votes} — skipping`);
    return;
  }

  console.log(`  + ${cat.name} (${cat.id}): ${existingVotes} -> ${cat.votes} (adding ${backfill})`);

  if (!APPLY) return;

  await docClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: dayKey,
    UpdateExpression: 'SET #date = :date ADD votes :backfill',
    ExpressionAttributeNames: { '#date': 'date' },
    ExpressionAttributeValues: { ':date': dateStr, ':backfill': backfill },
  }));
}

async function run() {
  const dateStr = getDateArg();

  console.log('Backfill daily votes');
  console.log(`  Table:  ${TABLE_NAME}`);
  console.log(`  Region: ${REGION}`);
  console.log(`  Date:   ${dateStr}`);
  console.log(`  Mode:   ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes, pass --apply to write)'}`);
  console.log('');

  const cats = await listCats();
  console.log(`Found ${cats.length} cats\n`);

  for (const cat of cats) {
    await backfillCat(cat, dateStr);
  }

  console.log('');
  console.log(APPLY ? 'Backfill complete.' : 'Dry run complete — re-run with --apply to write changes.');
}

if (require.main === module) {
  run().catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
  });
}

module.exports = { listCats, backfillCat };
