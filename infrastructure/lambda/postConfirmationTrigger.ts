import { PostConfirmationTriggerEvent } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  AdminUpdateUserAttributesCommand,
  AdminAddUserToGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const cognitoClient = new CognitoIdentityProviderClient({});

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const TABLE_NAME = process.env.TABLE_NAME!;

interface InvitationRecord {
  email: string;
  role: 'judge' | 'admin';
  judgeId?: string;
  cageScoring: boolean;
  classScoring: boolean;
  fitShowScoring: boolean;
  status: 'pending' | 'accepted';
}

/**
 * Applies the role/permissions promised by the invitation, and adds the new
 * user to the matching Cognito group, once their self-service signup is
 * confirmed. This is what makes "invited as a judge/admin" stick without any
 * further admin action.
 */
export const handler = async (event: PostConfirmationTriggerEvent): Promise<PostConfirmationTriggerEvent> => {
  const email = event.request.userAttributes.email?.trim().toLowerCase();

  if (!email) {
    return event;
  }

  const invitePK = `INVITE#${email}`;

  const result = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: invitePK, SK: 'METADATA' },
  }));

  const record = result.Item as InvitationRecord | undefined;

  if (!record) {
    console.warn(`PostConfirmation: no invitation record found for ${email}`);
    return event;
  }

  await cognitoClient.send(new AdminUpdateUserAttributesCommand({
    UserPoolId: event.userPoolId,
    Username: event.userName,
    UserAttributes: [
      { Name: 'custom:role', Value: record.role },
      ...(record.judgeId ? [{ Name: 'custom:judgeId', Value: record.judgeId }] : []),
      { Name: 'custom:cageScoring', Value: record.cageScoring ? 'true' : 'false' },
      { Name: 'custom:classScoring', Value: record.classScoring ? 'true' : 'false' },
      { Name: 'custom:fitShowScoring', Value: record.fitShowScoring ? 'true' : 'false' },
    ],
  }));

  await cognitoClient.send(new AdminAddUserToGroupCommand({
    UserPoolId: event.userPoolId,
    Username: event.userName,
    GroupName: record.role,
  }));

  await docClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: invitePK, SK: 'METADATA' },
    UpdateExpression: 'SET #status = :accepted, acceptedAt = :now',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':accepted': 'accepted',
      ':now': new Date().toISOString(),
    },
  }));

  return event;
};
