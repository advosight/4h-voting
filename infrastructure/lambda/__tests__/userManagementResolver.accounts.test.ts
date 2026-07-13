import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
  AdminUpdateUserAttributesCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { mockClient } from 'aws-sdk-client-mock';

process.env.USER_POOL_ID = 'test-pool';
process.env.TABLE_NAME = 'test-table';
process.env.SES_FROM_EMAIL = 'noreply@advosight.com';
process.env.SES_CONFIGURATION_SET = 'test-configuration-set';
process.env.APP_BASE_URL = 'https://example.com';

import { handler } from '../userManagementResolver';

const cognitoMock = mockClient(CognitoIdentityProviderClient);

const adminEvent = (fieldName: string, args: any) => ({
  info: { fieldName },
  arguments: args,
  identity: {
    claims: {
      sub: 'admin-123',
      email: 'admin@example.com',
      'cognito:groups': ['admin'],
    },
  },
} as any);

const judgeAttributes = [
  { Name: 'email', Value: 'judge@example.com' },
  { Name: 'name', Value: 'Jane Judge' },
  { Name: 'custom:role', Value: 'judge' },
  { Name: 'custom:judgeId', Value: 'JUDGE_1' },
];

describe('userManagementResolver account management', () => {
  beforeEach(() => {
    cognitoMock.reset();
  });

  describe('updateUserPermissions', () => {
    it('updates the given scoring permissions for a judge', async () => {
      cognitoMock.on(AdminGetUserCommand).resolves({
        UserAttributes: judgeAttributes,
        UserStatus: 'CONFIRMED',
        Enabled: true,
      });
      cognitoMock.on(AdminUpdateUserAttributesCommand).resolves({});

      const result: any = await handler(adminEvent('updateUserPermissions', {
        userId: 'judge-1',
        cageScoring: false,
        classScoring: true,
        fitShowScoring: false,
      }));

      expect(result.cageScoring).toBe(false);
      expect(result.classScoring).toBe(true);
      expect(result.fitShowScoring).toBe(false);

      const call = cognitoMock.commandCalls(AdminUpdateUserAttributesCommand)[0].args[0].input;
      expect(call.UserAttributes).toEqual([
        { Name: 'custom:cageScoring', Value: 'false' },
        { Name: 'custom:classScoring', Value: 'true' },
        { Name: 'custom:fitShowScoring', Value: 'false' },
      ]);
    });

    it('rejects setting individual permissions for an admin account', async () => {
      cognitoMock.on(AdminGetUserCommand).resolves({
        UserAttributes: [
          { Name: 'email', Value: 'admin2@example.com' },
          { Name: 'custom:role', Value: 'admin' },
        ],
        UserStatus: 'CONFIRMED',
        Enabled: true,
      });

      await expect(handler(adminEvent('updateUserPermissions', {
        userId: 'admin-2',
        cageScoring: false,
        classScoring: false,
        fitShowScoring: false,
      }))).rejects.toThrow(/only apply to judges/i);

      expect(cognitoMock.commandCalls(AdminUpdateUserAttributesCommand)).toHaveLength(0);
    });

    it('rejects setting individual permissions for a participant account', async () => {
      cognitoMock.on(AdminGetUserCommand).resolves({
        UserAttributes: [
          { Name: 'email', Value: 'participant@example.com' },
          { Name: 'custom:role', Value: 'participant' },
        ],
        UserStatus: 'CONFIRMED',
        Enabled: true,
      });

      await expect(handler(adminEvent('updateUserPermissions', {
        userId: 'participant-1',
        cageScoring: true,
        classScoring: true,
        fitShowScoring: true,
      }))).rejects.toThrow(/only apply to judges/i);

      expect(cognitoMock.commandCalls(AdminUpdateUserAttributesCommand)).toHaveLength(0);
    });
  });

  describe('revokeUser', () => {
    it('disables the target user', async () => {
      cognitoMock.on(AdminGetUserCommand).resolves({
        UserAttributes: judgeAttributes,
        UserStatus: 'CONFIRMED',
        Enabled: true,
      });
      cognitoMock.on(AdminDisableUserCommand).resolves({});

      const result: any = await handler(adminEvent('revokeUser', { userId: 'judge-1' }));

      expect(result).toBe(true);
      expect(cognitoMock.commandCalls(AdminDisableUserCommand)[0].args[0].input).toEqual({
        UserPoolId: 'test-pool',
        Username: 'judge-1',
      });
    });

    it('prevents an admin from revoking their own account', async () => {
      cognitoMock.on(AdminGetUserCommand).resolves({
        UserAttributes: [
          { Name: 'email', Value: 'admin@example.com' },
          { Name: 'custom:role', Value: 'admin' },
        ],
        UserStatus: 'CONFIRMED',
        Enabled: true,
      });

      await expect(handler(adminEvent('revokeUser', { userId: 'admin-123' })))
        .rejects.toThrow(/cannot revoke your own account/i);

      expect(cognitoMock.commandCalls(AdminDisableUserCommand)).toHaveLength(0);
    });
  });

  describe('reactivateUser', () => {
    it('re-enables the target user', async () => {
      cognitoMock.on(AdminEnableUserCommand).resolves({});

      const result: any = await handler(adminEvent('reactivateUser', { userId: 'judge-1' }));

      expect(result).toBe(true);
      expect(cognitoMock.commandCalls(AdminEnableUserCommand)[0].args[0].input).toEqual({
        UserPoolId: 'test-pool',
        Username: 'judge-1',
      });
    });
  });

  describe('listAccounts', () => {
    it('includes participants alongside judges and admins', async () => {
      cognitoMock.on(ListUsersCommand).resolves({
        Users: [
          {
            Username: 'judge-1',
            Attributes: judgeAttributes,
            UserStatus: 'CONFIRMED',
            Enabled: true,
          },
          {
            Username: 'admin-1',
            Attributes: [
              { Name: 'email', Value: 'admin@example.com' },
              { Name: 'custom:role', Value: 'admin' },
            ],
            UserStatus: 'CONFIRMED',
            Enabled: true,
          },
          {
            Username: 'participant-1',
            Attributes: [
              { Name: 'email', Value: 'participant@example.com' },
              { Name: 'name', Value: 'Pat Participant' },
              { Name: 'custom:role', Value: 'participant' },
            ],
            UserStatus: 'CONFIRMED',
            Enabled: true,
          },
        ],
      });

      const result: any = await handler(adminEvent('listAccounts', {}));

      expect(result.items).toHaveLength(3);
      const participant = result.items.find((item: any) => item.userId === 'participant-1');
      expect(participant).toMatchObject({
        role: 'participant',
        name: 'Pat Participant',
        cageScoring: false,
        classScoring: false,
        fitShowScoring: false,
      });
    });

    it('treats an account with no custom:role attribute as a participant', async () => {
      cognitoMock.on(ListUsersCommand).resolves({
        Users: [
          {
            Username: 'no-role-1',
            Attributes: [{ Name: 'email', Value: 'noattrs@example.com' }],
            UserStatus: 'CONFIRMED',
            Enabled: true,
          },
        ],
      });

      const result: any = await handler(adminEvent('listAccounts', {}));

      expect(result.items).toHaveLength(1);
      expect(result.items[0].role).toBe('participant');
    });
  });
});
