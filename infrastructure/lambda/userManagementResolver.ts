import { AppSyncResolverEvent } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  AdminUpdateUserAttributesCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  ListUsersCommand,
  AdminGetUserCommand,
  UserType
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { randomUUID } from 'crypto';
import {
  getUserContext,
  requireRole,
  UserContext
} from './roleValidation';

const cognitoClient = new CognitoIdentityProviderClient({});
const USER_POOL_ID = process.env.USER_POOL_ID!;

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const TABLE_NAME = process.env.TABLE_NAME!;

const sesClient = new SESClient({});
const SES_FROM_EMAIL = process.env.SES_FROM_EMAIL!;
const SES_CONFIGURATION_SET = process.env.SES_CONFIGURATION_SET!;
const APP_BASE_URL = process.env.APP_BASE_URL!;

const INVITATION_TTL_DAYS = 7;

type InviteRole = 'judge' | 'admin';

interface InviteUserInput {
  email: string;
  name?: string;
  role: string;
  cageScoring?: boolean;
  classScoring?: boolean;
  fitShowScoring?: boolean;
}

interface InvitationRecord {
  PK: string;
  SK: string;
  email: string;
  name?: string;
  role: InviteRole;
  judgeId?: string;
  cageScoring: boolean;
  classScoring: boolean;
  fitShowScoring: boolean;
  token: string;
  status: 'pending' | 'accepted';
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
}

interface Invitation {
  email: string;
  name?: string;
  role: string;
  judgeId?: string;
  cageScoring: boolean;
  classScoring: boolean;
  fitShowScoring: boolean;
  status: string;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
}

interface InvitationValidation {
  valid: boolean;
  email?: string;
  name?: string;
  role?: string;
  reason?: string;
}

interface UserAccount {
  userId: string;
  email: string;
  name: string;
  judgeId: string;
  role: string;
  createdAt: string;
  isActive: boolean;
  cageScoring: boolean;
  classScoring: boolean;
  fitShowScoring: boolean;
}

interface UserRoleUpdate {
  userId: string;
  email: string;
  role: string;
  updatedAt: string;
}

/**
 * Generate a unique judge ID
 */
function generateJudgeId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `JUDGE_${timestamp}_${random}`.toUpperCase();
}

/**
 * Convert Cognito user to UserAccount format
 */
function mapUserToAccount(user: UserType): UserAccount | null {
  if (!user.Username || !user.Attributes) return null;

  const attributes = user.Attributes.reduce((acc, attr) => {
    if (attr.Name && attr.Value) {
      acc[attr.Name] = attr.Value;
    }
    return acc;
  }, {} as Record<string, string>);

  // No custom:role attribute (e.g. an account an admin downgraded away from
  // judge/admin) falls back to participant, matching roleValidation's runtime default.
  const role = attributes['custom:role'] || 'participant';
  if (!['judge', 'admin', 'participant'].includes(role)) return null;

  // Legacy judge accounts created before per-scoring-type permissions existed have none
  // of these attributes set; default them to fully permitted so they keep their access.
  // Participants never score, so they get no permissions regardless of these attributes.
  const hasAnyPermissionAttr = 'custom:cageScoring' in attributes ||
    'custom:classScoring' in attributes ||
    'custom:fitShowScoring' in attributes;
  const isJudge = role === 'judge';

  return {
    userId: user.Username,
    email: attributes.email || '',
    name: attributes.name || attributes.email || 'Unknown',
    judgeId: attributes['custom:judgeId'] || user.Username,
    role,
    createdAt: user.UserCreateDate?.toISOString() || new Date().toISOString(),
    // Enabled is undefined on some SDK response shapes (e.g. AdminGetUser via the
    // mockUser bridge in getAccount); only a hard `false` from AdminDisableUser
    // should count as revoked.
    isActive: user.Enabled !== false && (user.UserStatus === 'CONFIRMED' || user.UserStatus === 'FORCE_CHANGE_PASSWORD'),
    cageScoring: role === 'admin' || (isJudge && (hasAnyPermissionAttr ? attributes['custom:cageScoring'] === 'true' : true)),
    classScoring: role === 'admin' || (isJudge && (hasAnyPermissionAttr ? attributes['custom:classScoring'] === 'true' : true)),
    fitShowScoring: role === 'admin' || (isJudge && (hasAnyPermissionAttr ? attributes['custom:fitShowScoring'] === 'true' : true)),
  };
}

export const handler = async (event: AppSyncResolverEvent<any>) => {
  const { fieldName } = event.info;

  try {
    switch (fieldName) {
      case 'inviteUser':
        return await inviteUser(event);
      case 'resendInvitation':
        return await resendInvitation(event);
      case 'revokeInvitation':
        return await revokeInvitation(event);
      case 'listInvitations':
        return await listInvitations(event);
      case 'validateInvitation':
        return await validateInvitation(event);
      case 'updateUserRole':
        return await updateUserRole(event);
      case 'updateUserPermissions':
        return await updateUserPermissions(event);
      case 'revokeUser':
        return await revokeUser(event);
      case 'reactivateUser':
        return await reactivateUser(event);
      case 'listAccounts':
        return await listAccounts(event);
      case 'getAccount':
        return await getAccount(event);
      default:
        throw new Error(`Unknown field: ${fieldName}`);
    }
  } catch (error) {
    console.error(`Error in ${fieldName}:`, error);
    throw error;
  }
};

function invitationPK(email: string): string {
  return `INVITE#${email.trim().toLowerCase()}`;
}

function toInvitation(record: InvitationRecord): Invitation {
  return {
    email: record.email,
    name: record.name,
    role: record.role,
    judgeId: record.judgeId,
    cageScoring: record.cageScoring,
    classScoring: record.classScoring,
    fitShowScoring: record.fitShowScoring,
    status: record.status,
    invitedBy: record.invitedBy,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendInviteEmail(record: InvitationRecord): Promise<void> {
  const roleLabel = record.role === 'admin' ? 'Admin' : 'Judge';
  const acceptUrl = `${APP_BASE_URL}/accept-invite?email=${encodeURIComponent(record.email)}&token=${encodeURIComponent(record.token)}`;
  const expiresLabel = new Date(record.expiresAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const greeting = record.name ? `Hi ${record.name},` : 'Hi there,';
  const invitedByLabel = record.invitedBy || 'A 4H Cat Show admin';

  const textBody = `${greeting}\n\n` +
    `${invitedByLabel} has invited you to join the 4H Cat Show as a ${roleLabel}.\n\n` +
    `Set up your account here:\n${acceptUrl}\n\n` +
    `This invitation expires on ${expiresLabel}.\n\n` +
    `If you weren't expecting this invitation, you can safely ignore this email.`;

  const safeName = record.name ? escapeHtml(record.name) : '';
  const safeInvitedBy = escapeHtml(invitedByLabel);
  const safeGreeting = safeName ? `Hi ${safeName},` : 'Hi there,';

  const htmlBody = `
<!DOCTYPE html>
<html>
  <body style="margin:0; padding:0; background-color:#f5f5f5; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5; padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; max-width:480px; width:100%;">
            <tr>
              <td style="background-color:#1976d2; padding:24px 32px;">
                <span style="color:#ffffff; font-size:20px; font-weight:500;">4H Cat Show</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px; font-size:16px; color:#212121;">${safeGreeting}</p>
                <p style="margin:0 0 24px; font-size:16px; line-height:1.5; color:#212121;">
                  <strong>${safeInvitedBy}</strong> has invited you to join the 4H Cat Show as a <strong>${roleLabel}</strong>.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:8px; background-color:#1976d2;">
                      <a href="${acceptUrl}" style="display:inline-block; padding:12px 24px; font-size:16px; font-weight:500; color:#ffffff; text-decoration:none; border-radius:8px;">
                        Set up your account
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0; font-size:13px; color:#757575;">
                  This invitation expires on ${expiresLabel}.
                </p>
                <p style="margin:16px 0 0; font-size:13px; color:#757575;">
                  If you weren't expecting this invitation, you can safely ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  await sesClient.send(new SendEmailCommand({
    Source: SES_FROM_EMAIL,
    Destination: { ToAddresses: [record.email] },
    ConfigurationSetName: SES_CONFIGURATION_SET,
    Message: {
      Subject: { Data: `You're invited to join the 4H Cat Show as a ${roleLabel}` },
      Body: {
        Text: { Data: textBody },
        Html: { Data: htmlBody },
      },
    },
  }));
}

/**
 * Invite a new judge or admin by email
 */
async function inviteUser(event: AppSyncResolverEvent<{ input: InviteUserInput }>): Promise<Invitation> {
  const userContext = getUserContext(event);
  requireRole(userContext, 'admin');

  const { email, name, role, cageScoring, classScoring, fitShowScoring } = event.arguments.input;

  if (!['judge', 'admin'].includes(role)) {
    throw new Error('Invalid role. Must be judge or admin');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const isAdmin = role === 'admin';

  // The AppSync identity claims don't reliably carry an email (e.g. Cognito access
  // tokens never include one), so look up the inviting admin's email directly rather
  // than trusting userContext.email, which can be undefined.
  const inviterResult = await cognitoClient.send(new AdminGetUserCommand({
    UserPoolId: USER_POOL_ID,
    Username: userContext!.userId,
  }));
  const inviterAttributes = inviterResult.UserAttributes?.reduce((acc, attr) => {
    if (attr.Name && attr.Value) {
      acc[attr.Name] = attr.Value;
    }
    return acc;
  }, {} as Record<string, string>) || {};
  const invitedByEmail = inviterAttributes.email || userContext!.email;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

  const record: InvitationRecord = {
    PK: invitationPK(normalizedEmail),
    SK: 'METADATA',
    email: normalizedEmail,
    name,
    role: role as InviteRole,
    judgeId: isAdmin ? undefined : generateJudgeId(),
    cageScoring: isAdmin || (cageScoring ?? true),
    classScoring: isAdmin || (classScoring ?? true),
    fitShowScoring: isAdmin || (fitShowScoring ?? true),
    token: randomUUID(),
    status: 'pending',
    invitedBy: invitedByEmail,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: record,
  }));

  await sendInviteEmail(record);

  return toInvitation(record);
}

/**
 * Resend an existing pending invitation, rotating its token and extending its expiry
 */
async function resendInvitation(event: AppSyncResolverEvent<{ email: string }>): Promise<Invitation> {
  const userContext = getUserContext(event);
  requireRole(userContext, 'admin');

  const normalizedEmail = event.arguments.email.trim().toLowerCase();

  const existing = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: invitationPK(normalizedEmail), SK: 'METADATA' },
  }));

  if (!existing.Item) {
    throw new Error('No pending invitation found for this email');
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

  const record: InvitationRecord = {
    ...(existing.Item as InvitationRecord),
    token: randomUUID(),
    status: 'pending',
    expiresAt: expiresAt.toISOString(),
  };

  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: record,
  }));

  await sendInviteEmail(record);

  return toInvitation(record);
}

/**
 * Revoke a pending invitation
 */
async function revokeInvitation(event: AppSyncResolverEvent<{ email: string }>): Promise<boolean> {
  const userContext = getUserContext(event);
  requireRole(userContext, 'admin');

  const normalizedEmail = event.arguments.email.trim().toLowerCase();

  await docClient.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { PK: invitationPK(normalizedEmail), SK: 'METADATA' },
  }));

  return true;
}

/**
 * List all pending invitations
 */
async function listInvitations(event: AppSyncResolverEvent<{}>): Promise<{ items: Invitation[] }> {
  const userContext = getUserContext(event);
  requireRole(userContext, 'admin');

  const result = await docClient.send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'begins_with(PK, :pk) AND SK = :sk AND #status = :status',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':pk': 'INVITE#',
      ':sk': 'METADATA',
      ':status': 'pending',
    },
  }));

  const items = ((result.Items || []) as InvitationRecord[]).map(toInvitation);

  return { items };
}

/**
 * Validate an invitation token before allowing self-service signup.
 * Public (API key) - called from the unauthenticated accept-invite page.
 */
async function validateInvitation(event: AppSyncResolverEvent<{ email: string; token: string }>): Promise<InvitationValidation> {
  const { email, token } = event.arguments;
  const normalizedEmail = email.trim().toLowerCase();

  const result = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: invitationPK(normalizedEmail), SK: 'METADATA' },
  }));

  const record = result.Item as InvitationRecord | undefined;

  if (!record) {
    return { valid: false, reason: 'No invitation found for this email.' };
  }

  if (record.status !== 'pending') {
    return { valid: false, reason: 'This invitation has already been used.' };
  }

  if (record.token !== token) {
    return { valid: false, reason: 'Invalid invitation link.' };
  }

  if (new Date(record.expiresAt).getTime() < Date.now()) {
    return { valid: false, reason: 'This invitation has expired. Please ask an admin to resend it.' };
  }

  return { valid: true, email: record.email, name: record.name, role: record.role };
}

/**
 * Update user role
 */
async function updateUserRole(event: AppSyncResolverEvent<{ userId: string; role: string }>): Promise<UserRoleUpdate> {
  const userContext = getUserContext(event);
  requireRole(userContext, 'admin');

  const { userId, role } = event.arguments;

  // Validate role
  if (!['admin', 'judge', 'participant'].includes(role)) {
    throw new Error('Invalid role. Must be admin, judge, or participant');
  }

  try {
    // Get current user to check if they exist
    const getUserCommand = new AdminGetUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: userId,
    });

    const userResult = await cognitoClient.send(getUserCommand);
    const currentAttributes = userResult.UserAttributes?.reduce((acc, attr) => {
      if (attr.Name && attr.Value) {
        acc[attr.Name] = attr.Value;
      }
      return acc;
    }, {} as Record<string, string>) || {};

    // Update user attributes
    const updateCommand = new AdminUpdateUserAttributesCommand({
      UserPoolId: USER_POOL_ID,
      Username: userId,
      UserAttributes: [
        { Name: 'custom:role', Value: role },
        // If changing to judge and no judgeId exists, generate one
        ...(role === 'judge' && !currentAttributes['custom:judgeId'] 
          ? [{ Name: 'custom:judgeId', Value: generateJudgeId() }] 
          : []),
      ],
    });

    await cognitoClient.send(updateCommand);

    return {
      userId,
      email: currentAttributes.email || '',
      role,
      updatedAt: new Date().toISOString(),
    };

  } catch (error) {
    console.error('Error updating user role:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to update user role: ${error.message}`);
    }
    throw new Error('Failed to update user role');
  }
}

/**
 * Update a judge's per-scoring-type permissions
 */
async function updateUserPermissions(event: AppSyncResolverEvent<{
  userId: string;
  cageScoring: boolean;
  classScoring: boolean;
  fitShowScoring: boolean;
}>): Promise<UserAccount> {
  const userContext = getUserContext(event);
  requireRole(userContext, 'admin');

  const { userId, cageScoring, classScoring, fitShowScoring } = event.arguments;

  const userResult = await cognitoClient.send(new AdminGetUserCommand({
    UserPoolId: USER_POOL_ID,
    Username: userId,
  }));

  const attributes = (userResult.UserAttributes || []).reduce((acc, attr) => {
    if (attr.Name && attr.Value) {
      acc[attr.Name] = attr.Value;
    }
    return acc;
  }, {} as Record<string, string>);

  const targetRole = attributes['custom:role'] || 'participant';
  if (targetRole !== 'judge') {
    throw new Error('Individual scoring permissions only apply to judges.');
  }

  await cognitoClient.send(new AdminUpdateUserAttributesCommand({
    UserPoolId: USER_POOL_ID,
    Username: userId,
    UserAttributes: [
      { Name: 'custom:cageScoring', Value: String(cageScoring) },
      { Name: 'custom:classScoring', Value: String(classScoring) },
      { Name: 'custom:fitShowScoring', Value: String(fitShowScoring) },
    ],
  }));

  return {
    userId,
    email: attributes.email || '',
    name: attributes.name || attributes.email || 'Unknown',
    judgeId: attributes['custom:judgeId'] || userId,
    role: attributes['custom:role'] || 'judge',
    createdAt: userResult.UserCreateDate?.toISOString() || new Date().toISOString(),
    isActive: userResult.Enabled !== false && (userResult.UserStatus === 'CONFIRMED' || userResult.UserStatus === 'FORCE_CHANGE_PASSWORD'),
    cageScoring,
    classScoring,
    fitShowScoring,
  };
}

/**
 * Revoke (disable) a user's account. Disabled users can no longer sign in;
 * this does not delete their account or history, so it can be undone via
 * reactivateUser.
 */
async function revokeUser(event: AppSyncResolverEvent<{ userId: string }>): Promise<boolean> {
  const userContext = getUserContext(event);
  requireRole(userContext, 'admin');

  const { userId } = event.arguments;

  const userResult = await cognitoClient.send(new AdminGetUserCommand({
    UserPoolId: USER_POOL_ID,
    Username: userId,
  }));
  const email = userResult.UserAttributes?.find((attr) => attr.Name === 'email')?.Value;

  if (email && userContext!.email && email.toLowerCase() === userContext!.email.toLowerCase()) {
    throw new Error('You cannot revoke your own account.');
  }

  await cognitoClient.send(new AdminDisableUserCommand({
    UserPoolId: USER_POOL_ID,
    Username: userId,
  }));

  return true;
}

/**
 * Reactivate a previously revoked user's account.
 */
async function reactivateUser(event: AppSyncResolverEvent<{ userId: string }>): Promise<boolean> {
  const userContext = getUserContext(event);
  requireRole(userContext, 'admin');

  const { userId } = event.arguments;

  await cognitoClient.send(new AdminEnableUserCommand({
    UserPoolId: USER_POOL_ID,
    Username: userId,
  }));

  return true;
}

/**
 * List all accounts (judges, admins, and participants)
 */
async function listAccounts(event: AppSyncResolverEvent<{}>): Promise<{ items: UserAccount[] }> {
  const userContext = getUserContext(event);
  requireRole(userContext, 'admin');

  try {
    // Cognito's ListUsers Filter only supports a single attribute expression
    // (no "or"), so role filtering happens in mapUserToAccount instead.
    const listCommand = new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
    });

    const result = await cognitoClient.send(listCommand);
    const accounts = (result.Users || [])
      .map(mapUserToAccount)
      .filter((account): account is UserAccount => account !== null);

    return { items: accounts };

  } catch (error) {
    console.error('Error listing accounts:', error);
    throw new Error('Failed to list accounts');
  }
}

/**
 * Get a specific account
 */
async function getAccount(event: AppSyncResolverEvent<{ userId: string }>): Promise<UserAccount | null> {
  const userContext = getUserContext(event);
  requireRole(userContext, 'admin');

  const { userId } = event.arguments;

  try {
    const getUserCommand = new AdminGetUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: userId,
    });

    const result = await cognitoClient.send(getUserCommand);
    
    if (!result.UserAttributes) {
      return null;
    }

    const mockUser: UserType = {
      Username: userId,
      Attributes: result.UserAttributes,
      UserCreateDate: result.UserCreateDate,
      UserStatus: result.UserStatus,
      Enabled: result.Enabled,
    };

    return mapUserToAccount(mockUser);

  } catch (error) {
    console.error('Error getting account:', error);
    if (error instanceof Error && error.name === 'UserNotFoundException') {
      return null;
    }
    throw new Error('Failed to get account');
  }
}