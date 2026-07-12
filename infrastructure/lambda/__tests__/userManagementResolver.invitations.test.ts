import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { mockClient } from 'aws-sdk-client-mock';

process.env.USER_POOL_ID = 'test-pool';
process.env.TABLE_NAME = 'test-table';
process.env.SES_FROM_EMAIL = 'noreply@advosight.com';
process.env.APP_BASE_URL = 'https://example.com';

import { handler } from '../userManagementResolver';

const ddbMock = mockClient(DynamoDBDocumentClient);
const sesMock = mockClient(SESClient);

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

const publicEvent = (fieldName: string, args: any) => ({
  info: { fieldName },
  arguments: args,
  identity: null,
} as any);

describe('userManagementResolver invitations', () => {
  beforeEach(() => {
    ddbMock.reset();
    sesMock.reset();
  });

  describe('inviteUser', () => {
    it('creates a pending invitation and emails the invitee', async () => {
      ddbMock.on(PutCommand).resolves({});
      sesMock.on(SendEmailCommand).resolves({});

      const result: any = await handler(adminEvent('inviteUser', {
        input: { email: 'Judge@Example.com', name: 'Jamie Judge', role: 'judge' },
      }));

      expect(result.email).toBe('judge@example.com');
      expect(result.role).toBe('judge');
      expect(result.status).toBe('pending');
      expect(result.cageScoring).toBe(true);
      expect(result.classScoring).toBe(true);
      expect(result.fitShowScoring).toBe(true);

      const putCall = ddbMock.commandCalls(PutCommand)[0].args[0].input;
      expect(putCall.Item?.PK).toBe('INVITE#judge@example.com');
      expect(putCall.Item?.token).toBeTruthy();

      const emailCall = sesMock.commandCalls(SendEmailCommand)[0].args[0].input;
      expect(emailCall.Destination?.ToAddresses).toEqual(['judge@example.com']);
      expect(emailCall.Source).toBe('noreply@advosight.com');
    });

    it('respects explicit scoring permission overrides for judges', async () => {
      ddbMock.on(PutCommand).resolves({});
      sesMock.on(SendEmailCommand).resolves({});

      const result: any = await handler(adminEvent('inviteUser', {
        input: {
          email: 'judge2@example.com',
          role: 'judge',
          cageScoring: false,
          classScoring: true,
          fitShowScoring: false,
        },
      }));

      expect(result.cageScoring).toBe(false);
      expect(result.classScoring).toBe(true);
      expect(result.fitShowScoring).toBe(false);
    });

    it('grants full permissions for admin invites regardless of input', async () => {
      ddbMock.on(PutCommand).resolves({});
      sesMock.on(SendEmailCommand).resolves({});

      const result: any = await handler(adminEvent('inviteUser', {
        input: { email: 'admin2@example.com', role: 'admin', cageScoring: false },
      }));

      expect(result.role).toBe('admin');
      expect(result.cageScoring).toBe(true);
      expect(result.classScoring).toBe(true);
      expect(result.fitShowScoring).toBe(true);
    });

    it('rejects an invalid role', async () => {
      await expect(handler(adminEvent('inviteUser', {
        input: { email: 'x@example.com', role: 'superadmin' },
      }))).rejects.toThrow('Invalid role');
    });

    it('rejects invites from non-admins', async () => {
      const judgeEvent = {
        info: { fieldName: 'inviteUser' },
        arguments: { input: { email: 'x@example.com', role: 'judge' } },
        identity: { claims: { sub: 'j1', email: 'j@example.com', 'custom:role': 'judge' } },
      } as any;

      await expect(handler(judgeEvent)).rejects.toThrow('Access denied');
    });
  });

  describe('resendInvitation', () => {
    it('rotates the token and extends expiry for an existing invite', async () => {
      const existing = {
        PK: 'INVITE#judge@example.com',
        SK: 'METADATA',
        email: 'judge@example.com',
        role: 'judge',
        judgeId: 'JUDGE_1',
        cageScoring: true,
        classScoring: true,
        fitShowScoring: true,
        token: 'old-token',
        status: 'pending',
        invitedBy: 'admin@example.com',
        createdAt: new Date().toISOString(),
        expiresAt: new Date().toISOString(),
      };

      ddbMock.on(GetCommand).resolves({ Item: existing });
      ddbMock.on(PutCommand).resolves({});
      sesMock.on(SendEmailCommand).resolves({});

      const result: any = await handler(adminEvent('resendInvitation', { email: 'judge@example.com' }));

      expect(result.status).toBe('pending');
      const putItem = ddbMock.commandCalls(PutCommand)[0].args[0].input.Item as any;
      expect(putItem.token).not.toBe('old-token');
    });

    it('throws when there is no existing invitation', async () => {
      ddbMock.on(GetCommand).resolves({});

      await expect(handler(adminEvent('resendInvitation', { email: 'nobody@example.com' })))
        .rejects.toThrow('No pending invitation found');
    });
  });

  describe('revokeInvitation', () => {
    it('deletes the invitation record', async () => {
      ddbMock.on(DeleteCommand).resolves({});

      const result: any = await handler(adminEvent('revokeInvitation', { email: 'judge@example.com' }));

      expect(result).toBe(true);
      expect(ddbMock.commandCalls(DeleteCommand)[0].args[0].input.Key).toEqual({
        PK: 'INVITE#judge@example.com',
        SK: 'METADATA',
      });
    });
  });

  describe('listInvitations', () => {
    it('returns only pending invitations', async () => {
      ddbMock.on(ScanCommand).resolves({
        Items: [
          { email: 'a@example.com', role: 'judge', status: 'pending', cageScoring: true, classScoring: true, fitShowScoring: true, invitedBy: 'admin@example.com', createdAt: '', expiresAt: '' },
        ],
      });

      const result: any = await handler(adminEvent('listInvitations', {}));

      expect(result.items).toHaveLength(1);
      expect(result.items[0].email).toBe('a@example.com');
    });
  });

  describe('validateInvitation', () => {
    const baseRecord = {
      PK: 'INVITE#judge@example.com',
      SK: 'METADATA',
      email: 'judge@example.com',
      role: 'judge',
      token: 'good-token',
      status: 'pending',
      invitedBy: 'admin@example.com',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    };

    it('is valid for a matching, unexpired, pending invite', async () => {
      ddbMock.on(GetCommand).resolves({ Item: baseRecord });

      const result: any = await handler(publicEvent('validateInvitation', { email: 'judge@example.com', token: 'good-token' }));

      expect(result.valid).toBe(true);
      expect(result.role).toBe('judge');
    });

    it('is invalid when there is no invitation for the email', async () => {
      ddbMock.on(GetCommand).resolves({});

      const result: any = await handler(publicEvent('validateInvitation', { email: 'nobody@example.com', token: 'x' }));

      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/No invitation found/);
    });

    it('is invalid when the token does not match', async () => {
      ddbMock.on(GetCommand).resolves({ Item: baseRecord });

      const result: any = await handler(publicEvent('validateInvitation', { email: 'judge@example.com', token: 'wrong-token' }));

      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/Invalid invitation link/);
    });

    it('is invalid when the invitation has already been accepted', async () => {
      ddbMock.on(GetCommand).resolves({ Item: { ...baseRecord, status: 'accepted' } });

      const result: any = await handler(publicEvent('validateInvitation', { email: 'judge@example.com', token: 'good-token' }));

      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/already been used/);
    });

    it('is invalid when the invitation has expired', async () => {
      ddbMock.on(GetCommand).resolves({ Item: { ...baseRecord, expiresAt: new Date(Date.now() - 60_000).toISOString() } });

      const result: any = await handler(publicEvent('validateInvitation', { email: 'judge@example.com', token: 'good-token' }));

      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/expired/);
    });
  });
});
