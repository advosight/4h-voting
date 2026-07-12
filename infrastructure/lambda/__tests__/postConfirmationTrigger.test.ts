import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import {
  CognitoIdentityProviderClient,
  AdminUpdateUserAttributesCommand,
  AdminAddUserToGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { mockClient } from 'aws-sdk-client-mock';

process.env.TABLE_NAME = 'test-table';

import { handler } from '../postConfirmationTrigger';

const ddbMock = mockClient(DynamoDBDocumentClient);
const cognitoMock = mockClient(CognitoIdentityProviderClient);

function buildEvent(email: string, userName = 'user-123'): any {
  return {
    userName,
    userPoolId: 'test-pool',
    request: { userAttributes: { email } },
    response: {},
  };
}

describe('postConfirmationTrigger', () => {
  beforeEach(() => {
    ddbMock.reset();
    cognitoMock.reset();
  });

  it('applies role, permissions, and group membership from a matching invite', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        email: 'judge@example.com',
        role: 'judge',
        judgeId: 'JUDGE_1',
        cageScoring: true,
        classScoring: false,
        fitShowScoring: true,
        status: 'pending',
      },
    });
    cognitoMock.on(AdminUpdateUserAttributesCommand).resolves({});
    cognitoMock.on(AdminAddUserToGroupCommand).resolves({});
    ddbMock.on(UpdateCommand).resolves({});

    await handler(buildEvent('judge@example.com', 'user-123'));

    const updateAttrsCall = cognitoMock.commandCalls(AdminUpdateUserAttributesCommand)[0].args[0].input;
    expect(updateAttrsCall.Username).toBe('user-123');
    expect(updateAttrsCall.UserAttributes).toEqual(expect.arrayContaining([
      { Name: 'custom:role', Value: 'judge' },
      { Name: 'custom:judgeId', Value: 'JUDGE_1' },
      { Name: 'custom:cageScoring', Value: 'true' },
      { Name: 'custom:classScoring', Value: 'false' },
      { Name: 'custom:fitShowScoring', Value: 'true' },
    ]));

    const addToGroupCall = cognitoMock.commandCalls(AdminAddUserToGroupCommand)[0].args[0].input;
    expect(addToGroupCall.GroupName).toBe('judge');

    const invitationUpdateCall = ddbMock.commandCalls(UpdateCommand)[0].args[0].input;
    expect(invitationUpdateCall.ExpressionAttributeValues?.[':accepted']).toBe('accepted');
  });

  it('adds admin invitees to the admin group', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        email: 'admin@example.com',
        role: 'admin',
        cageScoring: true,
        classScoring: true,
        fitShowScoring: true,
        status: 'pending',
      },
    });
    cognitoMock.on(AdminUpdateUserAttributesCommand).resolves({});
    cognitoMock.on(AdminAddUserToGroupCommand).resolves({});
    ddbMock.on(UpdateCommand).resolves({});

    await handler(buildEvent('admin@example.com', 'user-456'));

    const addToGroupCall = cognitoMock.commandCalls(AdminAddUserToGroupCommand)[0].args[0].input;
    expect(addToGroupCall.GroupName).toBe('admin');
  });

  it('does nothing when there is no matching invitation', async () => {
    ddbMock.on(GetCommand).resolves({});

    await handler(buildEvent('nobody@example.com'));

    expect(cognitoMock.commandCalls(AdminUpdateUserAttributesCommand)).toHaveLength(0);
    expect(cognitoMock.commandCalls(AdminAddUserToGroupCommand)).toHaveLength(0);
  });
});
