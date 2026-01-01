import { AppSyncResolverEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

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
      return await createCat(event.arguments.input);
    case 'updateVotes':
      return await updateVotes(event.arguments.id, event.arguments.votes);
    case 'updateCat':
      return await updateCat(event.arguments.id, event.arguments.input);
    case 'listEmails':
      return await listEmails();
    case 'addEmail':
      return await addEmail(event.arguments.email, event.arguments.context);
    case 'deleteCat':
      return await deleteCat(event.arguments.id);
    case 'getVotingStatus':
      return await getVotingStatus();
    case 'setVotingStatus':
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
  };
}

async function createCat(input: { name: string; owner: string; votes: number; cageNumber?: number; ownerAgeGroup?: string; catAgeGroup?: string; peoplesChoiceGroup?: number }) {
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
  };
}

async function updateCat(id: string, input: { name?: string; owner?: string; cageNumber?: number; votes?: number; ownerAgeGroup?: string; catAgeGroup?: string; peoplesChoiceGroup?: number }) {
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
  };
}

async function updateVotes(id: string, votes: number) {
  await docClient.send(new UpdateCommand({
    TableName: process.env.TABLE_NAME,
    Key: { PK: `CAT#${id}`, SK: 'METADATA' },
    UpdateExpression: 'SET votes = :votes',
    ExpressionAttributeValues: { ':votes': votes },
  }));

  const result = await docClient.send(new GetCommand({
    TableName: process.env.TABLE_NAME,
    Key: { PK: `CAT#${id}`, SK: 'METADATA' },
  }));

  return {
    id,
    name: result.Item?.name,
    owner: result.Item?.owner,
    votes: votes,
    cageNumber: result.Item?.cageNumber,
    ownerAgeGroup: result.Item?.ownerAgeGroup,
    catAgeGroup: result.Item?.catAgeGroup,
    peoplesChoiceGroup: result.Item?.peoplesChoiceGroup ? parseInt(result.Item.peoplesChoiceGroup) : null,
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