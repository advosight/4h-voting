import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';

process.env.TABLE_NAME = 'test-table';

import { handler } from '../preSignUpTrigger';

const ddbMock = mockClient(DynamoDBDocumentClient);

function buildEvent(email: string, inviteToken?: string): any {
  return {
    request: {
      userAttributes: { email },
      clientMetadata: inviteToken ? { inviteToken } : undefined,
    },
    response: {},
  };
}

describe('preSignUpTrigger', () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  it('auto-confirms signup for a valid, matching, unexpired invite', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        token: 'good-token',
        status: 'pending',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    });

    const event = buildEvent('judge@example.com', 'good-token');
    const result = await handler(event);

    expect(result.response.autoConfirmUser).toBe(true);
    expect(result.response.autoVerifyEmail).toBe(true);
  });

  it('rejects signup with no invite token', async () => {
    const event = buildEvent('judge@example.com', undefined);

    await expect(handler(event)).rejects.toThrow('An invitation is required');
  });

  it('rejects signup when no invitation record exists', async () => {
    ddbMock.on(GetCommand).resolves({});

    const event = buildEvent('nobody@example.com', 'some-token');

    await expect(handler(event)).rejects.toThrow('Invalid or expired invitation');
  });

  it('rejects signup when the token does not match', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        token: 'good-token',
        status: 'pending',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    });

    const event = buildEvent('judge@example.com', 'wrong-token');

    await expect(handler(event)).rejects.toThrow('Invalid or expired invitation');
  });

  it('rejects signup when the invitation has expired', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        token: 'good-token',
        status: 'pending',
        expiresAt: new Date(Date.now() - 60_000).toISOString(),
      },
    });

    const event = buildEvent('judge@example.com', 'good-token');

    await expect(handler(event)).rejects.toThrow('expired');
  });

  it('rejects signup when the invitation was already accepted', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        token: 'good-token',
        status: 'accepted',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    });

    const event = buildEvent('judge@example.com', 'good-token');

    await expect(handler(event)).rejects.toThrow('Invalid or expired invitation');
  });
});
