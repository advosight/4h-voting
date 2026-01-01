// Integration test configuration for scoring workflow tests

// This file is imported by integration tests to set up common configuration
// It should not contain any test cases itself

// Extend Jest timeout for integration tests
if (typeof jest !== 'undefined') {
  jest.setTimeout(30000);
}

// Mock environment variables
process.env.REACT_APP_GRAPHQL_ENDPOINT = 'https://test-api.example.com/graphql';
process.env.REACT_APP_API_KEY = 'test-api-key';
process.env.REACT_APP_REGION = 'us-east-1';

// Global test setup
beforeAll(() => {
  // Mock console methods to reduce noise in test output
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  
  // Mock window.matchMedia for responsive components
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // Mock IntersectionObserver
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    observe() { return null; }
    disconnect() { return null; }
    unobserve() { return null; }
  };

  // Mock ResizeObserver
  global.ResizeObserver = class ResizeObserver {
    constructor() {}
    observe() { return null; }
    disconnect() { return null; }
    unobserve() { return null; }
  };
});

afterAll(() => {
  // Restore console methods
  console.warn.mockRestore();
  console.error.mockRestore();
});

// Global test utilities
global.testUtils = {
  // Helper to wait for async operations
  waitForAsync: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Helper to create mock GraphQL responses
  createMockResponse: (query, variables, data, errors = null) => ({
    request: { query, variables },
    result: errors ? { errors } : { data },
  }),
  
  // Helper to create mock subscription responses
  createMockSubscription: (query, data) => ({
    request: { query },
    result: { data },
  }),
  
  // Helper to simulate user authentication
  mockAuthenticatedUser: (user) => {
    const mockRoleUtils = require('../utils/roleUtils');
    mockRoleUtils.getCurrentUser.mockResolvedValue(user);
    mockRoleUtils.hasRole.mockImplementation((role) => user.role === role || user.role === 'admin');
    mockRoleUtils.isJudge.mockReturnValue(user.role === 'judge' || user.role === 'admin');
    mockRoleUtils.isAdmin.mockReturnValue(user.role === 'admin');
    mockRoleUtils.requireRole.mockResolvedValue(true);
  },
  
  // Helper to simulate unauthenticated user
  mockUnauthenticatedUser: () => {
    const mockRoleUtils = require('../utils/roleUtils');
    mockRoleUtils.getCurrentUser.mockResolvedValue(null);
    mockRoleUtils.hasRole.mockReturnValue(false);
    mockRoleUtils.isJudge.mockReturnValue(false);
    mockRoleUtils.isAdmin.mockReturnValue(false);
    mockRoleUtils.requireRole.mockRejectedValue(new Error('Authentication required'));
  },
};

// Test data factories
global.testData = {
  createMockCat: (overrides = {}) => ({
    id: 'cat-1',
    name: 'Test Cat',
    owner: 'Test Owner',
    cageNumber: 1,
    votes: 0,
    ...overrides,
  }),
  
  createMockJudge: (overrides = {}) => ({
    id: 'judge-1',
    name: 'Test Judge',
    username: 'judge@example.com',
    role: 'judge',
    ...overrides,
  }),
  
  createMockAdmin: (overrides = {}) => ({
    id: 'admin-1',
    name: 'Test Admin',
    username: 'admin@example.com',
    role: 'admin',
    ...overrides,
  }),
  
  createMockScore: (overrides = {}) => ({
    id: 'score-1',
    catId: 'cat-1',
    judgeId: 'judge-1',
    judgeName: 'Test Judge',
    cageConditionScore: 20,
    cageConditionComments: 'Test comment',
    catConditionScore: 20,
    catConditionComments: 'Test comment',
    groomingScore: 20,
    groomingComments: 'Test comment',
    overallScore: 20,
    overallComments: 'Test comment',
    totalScore: 80,
    timestamp: '2024-01-15T10:00:00Z',
    isFinalized: false,
    ...overrides,
  }),
};

// Custom matchers for scoring-specific assertions
expect.extend({
  toHaveValidScore(received) {
    const pass = received >= 0 && received <= 100 && Number.isInteger(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid score`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid score (0-100)`,
        pass: false,
      };
    }
  },
  
  toHaveValidCategoryScore(received) {
    const pass = received >= 0 && received <= 25 && Number.isInteger(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid category score`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid category score (0-25)`,
        pass: false,
      };
    }
  },
  
  toHaveValidComment(received) {
    const pass = typeof received === 'string' && received.length <= 500;
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid comment`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid comment (string, ≤500 chars)`,
        pass: false,
      };
    }
  },
});

export {};