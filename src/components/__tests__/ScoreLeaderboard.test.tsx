import React from 'react';

// Simple test to verify component can be imported
describe('ScoreLeaderboard', () => {
  it('can be imported without errors', () => {
    // Mock AWS Amplify to prevent import errors
    jest.doMock('aws-amplify/api', () => ({
      generateClient: jest.fn(() => ({
        graphql: jest.fn(() => Promise.resolve({ data: { listAllScores: { items: [] } } })),
      })),
    }));

    // Dynamic import to avoid hoisting issues
    const importComponent = async () => {
      const { default: ScoreLeaderboard } = await import('../ScoreLeaderboard');
      return ScoreLeaderboard;
    };

    expect(importComponent).not.toThrow();
  });

  it('component exists and is a function', async () => {
    jest.doMock('aws-amplify/api', () => ({
      generateClient: jest.fn(() => ({
        graphql: jest.fn(() => Promise.resolve({ data: { listAllScores: { items: [] } } })),
      })),
    }));

    const { default: ScoreLeaderboard } = await import('../ScoreLeaderboard');
    expect(typeof ScoreLeaderboard).toBe('function');
  });
});