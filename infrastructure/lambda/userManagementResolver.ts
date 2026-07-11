import { AppSyncResolverEvent } from 'aws-lambda';
import { 
  CognitoIdentityProviderClient, 
  AdminCreateUserCommand,
  AdminUpdateUserAttributesCommand,
  ListUsersCommand,
  AdminGetUserCommand,
  UserType
} from '@aws-sdk/client-cognito-identity-provider';
import { 
  getUserContext, 
  requireRole, 
  UserContext 
} from './roleValidation';

const cognitoClient = new CognitoIdentityProviderClient({});
const USER_POOL_ID = process.env.USER_POOL_ID!;

interface CreateJudgeInput {
  email: string;
  name: string;
  temporaryPassword: string;
  judgeId?: string;
  cageScoring?: boolean;
  classScoring?: boolean;
  fitShowScoring?: boolean;
}

interface JudgeAccount {
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
 * Convert Cognito user to JudgeAccount format
 */
function mapUserToJudgeAccount(user: UserType): JudgeAccount | null {
  if (!user.Username || !user.Attributes) return null;

  const attributes = user.Attributes.reduce((acc, attr) => {
    if (attr.Name && attr.Value) {
      acc[attr.Name] = attr.Value;
    }
    return acc;
  }, {} as Record<string, string>);

  const role = attributes['custom:role'];
  if (!role || !['judge', 'admin'].includes(role)) return null;

  // Legacy accounts created before per-scoring-type permissions existed have none of these
  // attributes set; default them to fully permitted so existing judges keep their access.
  const hasAnyPermissionAttr = 'custom:cageScoring' in attributes ||
    'custom:classScoring' in attributes ||
    'custom:fitShowScoring' in attributes;

  return {
    userId: user.Username,
    email: attributes.email || '',
    name: attributes.name || attributes.email || 'Unknown',
    judgeId: attributes['custom:judgeId'] || user.Username,
    role,
    createdAt: user.UserCreateDate?.toISOString() || new Date().toISOString(),
    isActive: user.UserStatus === 'CONFIRMED' || user.UserStatus === 'FORCE_CHANGE_PASSWORD',
    cageScoring: role === 'admin' || (hasAnyPermissionAttr ? attributes['custom:cageScoring'] === 'true' : true),
    classScoring: role === 'admin' || (hasAnyPermissionAttr ? attributes['custom:classScoring'] === 'true' : true),
    fitShowScoring: role === 'admin' || (hasAnyPermissionAttr ? attributes['custom:fitShowScoring'] === 'true' : true),
  };
}

export const handler = async (event: AppSyncResolverEvent<any>) => {
  const { fieldName } = event.info;

  try {
    switch (fieldName) {
      case 'createJudgeAccount':
        return await createJudgeAccount(event);
      case 'updateUserRole':
        return await updateUserRole(event);
      case 'listJudgeAccounts':
        return await listJudgeAccounts(event);
      case 'getJudgeAccount':
        return await getJudgeAccount(event);
      default:
        throw new Error(`Unknown field: ${fieldName}`);
    }
  } catch (error) {
    console.error(`Error in ${fieldName}:`, error);
    throw error;
  }
};

/**
 * Create a new judge account in Cognito
 */
async function createJudgeAccount(event: AppSyncResolverEvent<{ input: CreateJudgeInput }>): Promise<JudgeAccount> {
  const userContext = getUserContext(event);
  requireRole(userContext, 'admin');

  const { email, name, temporaryPassword, judgeId, cageScoring, classScoring, fitShowScoring } = event.arguments.input;

  // Generate judge ID if not provided
  const finalJudgeId = judgeId || generateJudgeId();

  // Default each permission to granted unless the admin explicitly unchecked it
  const finalCageScoring = cageScoring ?? true;
  const finalClassScoring = classScoring ?? true;
  const finalFitShowScoring = fitShowScoring ?? true;

  try {
    // Create user in Cognito
    const createUserCommand = new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'name', Value: name },
        { Name: 'custom:role', Value: 'judge' },
        { Name: 'custom:judgeId', Value: finalJudgeId },
        { Name: 'custom:cageScoring', Value: finalCageScoring ? 'true' : 'false' },
        { Name: 'custom:classScoring', Value: finalClassScoring ? 'true' : 'false' },
        { Name: 'custom:fitShowScoring', Value: finalFitShowScoring ? 'true' : 'false' },
        { Name: 'email_verified', Value: 'true' },
      ],
      TemporaryPassword: temporaryPassword,
      MessageAction: 'SUPPRESS', // Don't send welcome email
    });

    const result = await cognitoClient.send(createUserCommand);

    if (!result.User?.Username) {
      throw new Error('Failed to create user');
    }

    return {
      userId: result.User.Username,
      email,
      name,
      judgeId: finalJudgeId,
      role: 'judge',
      createdAt: new Date().toISOString(),
      isActive: true,
      cageScoring: finalCageScoring,
      classScoring: finalClassScoring,
      fitShowScoring: finalFitShowScoring,
    };

  } catch (error) {
    console.error('Error creating judge account:', error);
    if (error instanceof Error) {
      if (error.message.includes('UsernameExistsException')) {
        throw new Error('A user with this email already exists');
      }
      throw new Error(`Failed to create judge account: ${error.message}`);
    }
    throw new Error('Failed to create judge account');
  }
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
 * List all judge accounts
 */
async function listJudgeAccounts(event: AppSyncResolverEvent<{}>): Promise<{ items: JudgeAccount[] }> {
  const userContext = getUserContext(event);
  requireRole(userContext, 'admin');

  try {
    const listCommand = new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Filter: 'custom:role = "judge" or custom:role = "admin"',
    });

    const result = await cognitoClient.send(listCommand);
    const judgeAccounts = (result.Users || [])
      .map(mapUserToJudgeAccount)
      .filter((account): account is JudgeAccount => account !== null);

    return { items: judgeAccounts };

  } catch (error) {
    console.error('Error listing judge accounts:', error);
    throw new Error('Failed to list judge accounts');
  }
}

/**
 * Get a specific judge account
 */
async function getJudgeAccount(event: AppSyncResolverEvent<{ userId: string }>): Promise<JudgeAccount | null> {
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
    };

    return mapUserToJudgeAccount(mockUser);

  } catch (error) {
    console.error('Error getting judge account:', error);
    if (error instanceof Error && error.name === 'UserNotFoundException') {
      return null;
    }
    throw new Error('Failed to get judge account');
  }
}