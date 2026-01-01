// Test utilities for mocking AWS Amplify
export const createMockGraphqlClient = () => {
  const mockGraphql = jest.fn();
  
  // Default implementation that handles both queries and subscriptions
  mockGraphql.mockImplementation((params) => {
    if (params.query && params.query.includes('subscription')) {
      // Return a subscription object
      return {
        subscribe: jest.fn(() => ({
          unsubscribe: jest.fn(),
        })),
      };
    }
    
    // Return a promise for regular queries
    return Promise.resolve({
      data: {},
    });
  });
  
  return {
    mockGraphql,
    mockClient: {
      graphql: mockGraphql,
    },
  };
};

export const setupAmplifyMocks = () => {
  const { mockGraphql, mockClient } = createMockGraphqlClient();
  
  // Mock AWS Amplify API
  jest.mock('aws-amplify/api', () => ({
    generateClient: jest.fn(() => mockClient),
  }));
  
  // Mock AWS Amplify Auth
  jest.mock('aws-amplify/auth', () => ({
    getCurrentUser: jest.fn(),
  }));
  
  return { mockGraphql, mockClient };
};