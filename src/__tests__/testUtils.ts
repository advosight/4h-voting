// Test utilities for mocking AWS Amplify
export const createMockGraphqlClient = () => {
  const mockGraphql = vi.fn();
  
  // Default implementation that handles both queries and subscriptions
  mockGraphql.mockImplementation((params) => {
    if (params.query && params.query.includes('subscription')) {
      // Return a subscription object
      return {
        subscribe: vi.fn(() => ({
          unsubscribe: vi.fn(),
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
  vi.mock('aws-amplify/api', () => ({
    generateClient: vi.fn(() => mockClient),
  }));
  
  // Mock AWS Amplify Auth
  vi.mock('aws-amplify/auth', () => ({
    getCurrentUser: vi.fn(),
  }));
  
  return { mockGraphql, mockClient };
};