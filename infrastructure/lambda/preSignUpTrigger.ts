import { PreSignUpTriggerEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const TABLE_NAME = process.env.TABLE_NAME!;

interface InvitationRecord {
  token: string;
  status: 'pending' | 'accepted';
  expiresAt: string;
}

/**
 * Gates self-service signup to invited users only. Cognito's selfSignUpEnabled
 * would otherwise let anyone create an account; this trigger rejects any signup
 * that isn't backed by a matching, unexpired, pending invitation, and skips the
 * separate Cognito confirmation-code email since the invite link already proved
 * control of the inbox.
 */
export const handler = async (event: PreSignUpTriggerEvent): Promise<PreSignUpTriggerEvent> => {
  const email = event.request.userAttributes.email?.trim().toLowerCase();
  const token = event.request.clientMetadata?.inviteToken;

  if (!email || !token) {
    throw new Error('An invitation is required to sign up.');
  }

  const result = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: `INVITE#${email}`, SK: 'METADATA' },
  }));

  const record = result.Item as InvitationRecord | undefined;

  if (!record || record.status !== 'pending' || record.token !== token) {
    throw new Error('Invalid or expired invitation.');
  }

  if (new Date(record.expiresAt).getTime() < Date.now()) {
    throw new Error('This invitation has expired. Please ask an admin to resend it.');
  }

  event.response.autoConfirmUser = true;
  event.response.autoVerifyEmail = true;

  return event;
};
