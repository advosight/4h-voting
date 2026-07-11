import { AppSyncResolverEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { getUserContext, requireRole } from './roleValidation';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: AppSyncResolverEvent<any>) => {
  const { fieldName } = event.info;

  switch (fieldName) {
    case 'listCats':
      return await listCats();
    case 'getCat':
      return await getCat(event.arguments.id);
    case 'getCatByCage':
      return await getCatByCage(event.arguments.cageNumber);
    case 'createCat':
      requireRole(getUserContext(event), 'admin');
      return await createCat(event.arguments.input);
    case 'updateVotes':
      // Called by the public voting Lambda via API key auth; no Cognito role check applies.
      return await updateVotes(event.arguments.id, event.arguments.votes);
    case 'updateCat':
      requireRole(getUserContext(event), 'admin');
      return await updateCat(event.arguments.id, event.arguments.input);
    case 'listEmails':
      requireRole(getUserContext(event), 'admin');
      return await listEmails();
    case 'addEmail':
      return await addEmail(event.arguments.email, event.arguments.context);
    case 'deleteCat':
      requireRole(getUserContext(event), 'admin');
      return await deleteCat(event.arguments.id);
    case 'getVotingStatus':
      return await getVotingStatus();
    case 'setVotingStatus':
      requireRole(getUserContext(event), 'admin');
      return await setVotingStatus(event.arguments.isActive);
    default:
      throw new Error(`Unknown field: ${fieldName}`);
  }
};

async function listCats() {
  let allItems: any[] = [];
  let lastEvaluatedKey: any = undefined;

  // Handle pagination to get all items
  do {
    const result = await docClient.send(new ScanCommand({
      TableName: process.env.TABLE_NAME,
      FilterExpression: 'begins_with(PK, :pk) AND SK = :sk',
      ExpressionAttributeValues: { 
        ':pk': 'CAT#',
        ':sk': 'METADATA'
      },
      ConsistentRead: true,
      ExclusiveStartKey: lastEvaluatedKey,
    }));

    if (result.Items) {
      allItems.push(...result.Items);
    }
    
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(`Found ${allItems.length} raw cat items from DynamoDB`);
  
  const cats = allItems.map(item => ({
    id: item.PK.replace('CAT#', ''),
    name: item.name || 'Unknown Cat',
    owner: item.owner || 'Unknown Owner',
    votes: parseInt(item.votes) || 0,
    cageNumber: parseInt(item.cageNumber) || 0,
    ownerAgeGroup: item.ownerAgeGroup || null,
    catAgeGroup: item.catAgeGroup || null,
    peoplesChoiceGroup: item.peoplesChoiceGroup ? parseInt(item.peoplesChoiceGroup) : null,
    breedCategory: item.breedCategory || null,
  })).filter(cat => cat.name && cat.owner);

  console.log(`Returning ${cats.length} filtered cats:`, cats.map(c => ({ id: c.id, name: c.name, owner: c.owner })));

  return { items: cats };
}

async function getCat(id: string) {
  const result = await docClient.send(new GetCommand({
    TableName: process.env.TABLE_NAME,
    Key: { PK: `CAT#${id}`, SK: 'METADATA' },
  }));

  if (!result.Item) return null;

  return {
    id,
    name: result.Item.name || 'Unknown Cat',
    owner: result.Item.owner || 'Unknown Owner',
    votes: parseInt(result.Item.votes) || 0,
    cageNumber: parseInt(result.Item.cageNumber) || 0,
    ownerAgeGroup: result.Item.ownerAgeGroup || null,
    catAgeGroup: result.Item.catAgeGroup || null,
    peoplesChoiceGroup: result.Item.peoplesChoiceGroup ? parseInt(result.Item.peoplesChoiceGroup) : null,
    breedCategory: result.Item.breedCategory || null,
  };
}

async function getCatByCage(cageNumber: number) {
  const result = await docClient.send(new ScanCommand({
    TableName: process.env.TABLE_NAME,
    FilterExpression: 'begins_with(PK, :pk) AND SK = :sk AND cageNumber = :cageNumber',
    ExpressionAttributeValues: { 
      ':pk': 'CAT#',
      ':sk': 'METADATA',
      ':cageNumber': cageNumber
    },
  }));

  if (!result.Items || result.Items.length === 0) return null;

  const item = result.Items[0];
  return {
    id: item.PK.replace('CAT#', ''),
    name: item.name || 'Unknown Cat',
    owner: item.owner || 'Unknown Owner',
    votes: parseInt(item.votes) || 0,
    cageNumber: parseInt(item.cageNumber) || 0,
    ownerAgeGroup: item.ownerAgeGroup || null,
    catAgeGroup: item.catAgeGroup || null,
    peoplesChoiceGroup: item.peoplesChoiceGroup ? parseInt(item.peoplesChoiceGroup) : null,
    breedCategory: item.breedCategory || null,
  };
}

async function createCat(input: { name: string; owner: string; votes: number; cageNumber?: number; ownerAgeGroup?: string; catAgeGroup?: string; peoplesChoiceGroup?: number; breedCategory?: string }) {
  const id = randomUUID();

  await docClient.send(new PutCommand({
    TableName: process.env.TABLE_NAME,
    Item: {
      PK: `CAT#${id}`,
      SK: 'METADATA',
      name: input.name,
      owner: input.owner,
      votes: input.votes,
      cageNumber: input.cageNumber,
      ownerAgeGroup: input.ownerAgeGroup,
      catAgeGroup: input.catAgeGroup,
      peoplesChoiceGroup: input.peoplesChoiceGroup,
      breedCategory: input.breedCategory,
    },
  }));

  return {
    id,
    name: input.name,
    owner: input.owner,
    votes: input.votes,
    cageNumber: input.cageNumber,
    ownerAgeGroup: input.ownerAgeGroup,
    catAgeGroup: input.catAgeGroup,
    peoplesChoiceGroup: input.peoplesChoiceGroup,
    breedCategory: input.breedCategory,
  };
}

async function updateCat(id: string, input: { name?: string; owner?: string; cageNumber?: number; votes?: number; ownerAgeGroup?: string; catAgeGroup?: string; peoplesChoiceGroup?: number; breedCategory?: string }) {
  const result = await docClient.send(new GetCommand({
    TableName: process.env.TABLE_NAME,
    Key: { PK: `CAT#${id}`, SK: 'METADATA' },
  }));

  if (!result.Item) throw new Error('Cat not found');

  const updatedItem = {
    ...result.Item,
    ...input,
  };

  await docClient.send(new PutCommand({
    TableName: process.env.TABLE_NAME,
    Item: updatedItem,
  }));

  return {
    id,
    name: updatedItem.name,
    owner: updatedItem.owner,
    votes: updatedItem.votes,
    cageNumber: updatedItem.cageNumber,
    ownerAgeGroup: updatedItem.ownerAgeGroup,
    catAgeGroup: updatedItem.catAgeGroup,
    peoplesChoiceGroup: updatedItem.peoplesChoiceGroup,
    breedCategory: updatedItem.breedCategory,
  };
}

// `votes` is the number of votes to add (typically 1), not the new absolute total.
// Using an atomic ADD instead of a read-then-SET avoids losing votes when two
// requests for the same cat race each other.
async function updateVotes(id: string, votes: number) {
  const result = await docClient.send(new UpdateCommand({
    TableName: process.env.TABLE_NAME,
    Key: { PK: `CAT#${id}`, SK: 'METADATA' },
    UpdateExpression: 'ADD votes :increment',
    ExpressionAttributeValues: { ':increment': votes },
    ReturnValues: 'ALL_NEW',
  }));

  const item = result.Attributes;
  return {
    id,
    name: item?.name,
    owner: item?.owner,
    votes: parseInt(item?.votes) || 0,
    cageNumber: item?.cageNumber,
    ownerAgeGroup: item?.ownerAgeGroup,
    catAgeGroup: item?.catAgeGroup,
    peoplesChoiceGroup: item?.peoplesChoiceGroup ? parseInt(item.peoplesChoiceGroup) : null,
    breedCategory: item?.breedCategory,
  };
}

async function listEmails() {
  const result = await docClient.send(new ScanCommand({
    TableName: process.env.TABLE_NAME,
    FilterExpression: 'begins_with(PK, :pk)',
    ExpressionAttributeValues: {
      ':pk': 'EMAIL#',
    },
  }));

  const emails = result.Items?.map(item => ({
    id: item.email,
    email: item.email,
    timestamp: item.timestamp,
  })) || [];

  return { items: emails.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) };
}

async function addEmail(email: string, context?: any) {
  const timestamp = new Date().toISOString();
  
  // Get device info from context if available
  const userAgent = context?.userAgent || 'Unknown';
  const sourceIp = context?.sourceIp || 'Unknown';
  
  await docClient.send(new PutCommand({
    TableName: process.env.TABLE_NAME,
    Item: {
      PK: `EMAIL#${email}`,
      SK: 'METADATA',
      email: email,
      timestamp: timestamp,
      userAgent,
      sourceIp,
    },
  }));

  return {
    id: email,
    email: email,
    timestamp: timestamp,
  };
}

async function deleteCat(id: string) {
  const result = await docClient.send(new GetCommand({
    TableName: process.env.TABLE_NAME,
    Key: { PK: `CAT#${id}`, SK: 'METADATA' },
  }));

  if (!result.Item) throw new Error('Cat not found');

  // Cascade-delete every score (cage, class, and fit/show) tied to this cat.
  // Without this, deleted cats leave orphaned score records behind that keep
  // showing up in leaderboards/reports (e.g. as "Unknown Cat" or a stale name).
  const relatedItems = await docClient.send(new QueryCommand({
    TableName: process.env.TABLE_NAME,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': `CAT#${id}` },
  }));

  const scoreIndexItems = (relatedItems.Items || []).filter(item => item.SK !== 'METADATA');

  for (const indexItem of scoreIndexItems) {
    const sk: string = indexItem.SK;
    const separatorIndex = sk.lastIndexOf('#');
    if (separatorIndex === -1) continue;

    const scoreType = sk.slice(0, separatorIndex); // SCORE | CLASS_SCORE | FIT_SHOW_SCORE
    const scoreId = sk.slice(separatorIndex + 1);

    const scoreResult = await docClient.send(new GetCommand({
      TableName: process.env.TABLE_NAME,
      Key: { PK: `${scoreType}#${scoreId}`, SK: 'METADATA' },
    }));
    const judgeId = scoreResult.Item?.judgeId;

    await docClient.send(new DeleteCommand({
      TableName: process.env.TABLE_NAME,
      Key: { PK: `${scoreType}#${scoreId}`, SK: 'METADATA' },
    }));

    await docClient.send(new DeleteCommand({
      TableName: process.env.TABLE_NAME,
      Key: { PK: `CAT#${id}`, SK: sk },
    }));

    if (judgeId) {
      await docClient.send(new DeleteCommand({
        TableName: process.env.TABLE_NAME,
        Key: { PK: `JUDGE#${judgeId}`, SK: sk },
      }));
    }
  }

  await docClient.send(new DeleteCommand({
    TableName: process.env.TABLE_NAME,
    Key: { PK: `CAT#${id}`, SK: 'METADATA' },
  }));

  return {
    id,
    name: result.Item.name,
    owner: result.Item.owner,
    votes: result.Item.votes,
    cageNumber: result.Item.cageNumber,
  };
}

async function getVotingStatus() {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: process.env.TABLE_NAME,
      Key: { PK: 'SETTINGS', SK: 'VOTING_STATUS' },
    }));
    
    console.log('Voting status from DynamoDB:', JSON.stringify(result.Item, null, 2));
    return { isActive: result.Item?.isActive ?? true };
  } catch (error) {
    console.error('Error getting voting status:', error);
    return { isActive: true }; // Default to active if error
  }
}

async function setVotingStatus(isActive: boolean) {
  await docClient.send(new PutCommand({
    TableName: process.env.TABLE_NAME,
    Item: {
      PK: 'SETTINGS',
      SK: 'VOTING_STATUS',
      isActive: isActive,
      updatedAt: new Date().toISOString(),
    },
  }));
  
  return { isActive };
}