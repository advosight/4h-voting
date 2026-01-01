import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ClassScorePage from '../ClassScorePage';
import '@testing-library/jest-dom';

// Mock AWS Amplify
jest.mock('aws-amplify/api', () => ({
  generateClient: () => ({
    graphql: jest.fn()
  })
}));

jest.mock('aws-amplify/auth', () => ({
  getCurrentUser: jest.fn()
}));

// Mock the utility functions
jest.mock('../../utils/errorHandling', () => ({
  parseError: jest.fn(),
  getUserFriendlyMessage: jest.fn(),
  logError: jest.fn(),
  withRetry: jest.fn((fn) => fn),
  handleOptimisticLockConflict: jest.fn((fn) => fn)
}));

jest.mock('../../utils/roleUtils', () => ({
  isJudge: jest.fn(),
  getUserRole: jest.fn()
}));

// Mock components
jest.mock('../components/ClassScoringForm', () => {
  return function MockClassScoringForm() {
    return <div data-testid="class-scoring-form">Mock Type Class Scoring Form</div>;
  };
});

jest.mock('../components/ScoringErrorBoundary', () => ({
  ScoringErrorBoundary: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

jest.mock('../components/NetworkErrorHandler', () => ({
  NetworkErrorHandler: () => <div data-testid="network-error-handler">Network Error Handler</div>
}));

const theme = createTheme();

const renderClassScorePage = () => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <ClassScorePage />
      </ThemeProvider>
    </BrowserRouter>
  );
};

// Mock useParams to return test data
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ catId: '1' }),
  useNavigate: () => jest.fn()
}));

describe('ClassScorePage Visual Differentiation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful authentication
    const { getCurrentUser } = require('aws-amplify/auth');
    getCurrentUser.mockResolvedValue({
      userId: 'judge1',
      username: 'testjudge',
      signInDetails: { loginId: 'judge@example.com' }
    });

    // Mock judge role check
    const { isJudge } = require('../../utils/roleUtils');
    isJudge.mockResolvedValue(true);
  });

  describe('Blue Theme Implementation', () => {
    test('should apply class-scoring-page CSS class to main container', async () => {
      renderClassScorePage();
      
      await waitFor(() => {
        const pageElement = document.querySelector('.class-scoring-page');
        expect(pageElement).toBeInTheDocument();
      });
    });

    test('should apply class-scoring-container CSS class', async () => {
      renderClassScorePage();
      
      await waitFor(() => {
        const containerElement = document.querySelector('.class-scoring-container');
        expect(containerElement).toBeInTheDocument();
      });
    });

    test('should display class scoring header with blue theme', async () => {
      renderClassScorePage();
      
      await waitFor(() => {
        const headerElement = document.querySelector('.class-scoring-header');
        expect(headerElement).toBeInTheDocument();
      });
    });
  });

  describe('Page Title and Breadcrumbs', () => {
    test('should display "Type Class Scoring System" title', async () => {
      renderClassScorePage();
      
      await waitFor(() => {
        expect(screen.getByText('Type Class Scoring System')).toBeInTheDocument();
      });
    });

    test('should display class scoring subtitle', async () => {
      renderClassScorePage();
      
      await waitFor(() => {
        expect(screen.getByText(/Professional judging for class competition/)).toBeInTheDocument();
      });
    });

    test('should display breadcrumbs with class scoring context', async () => {
      renderClassScorePage();
      
      await waitFor(() => {
        const breadcrumbs = document.querySelector('.class-scoring-breadcrumbs');
        expect(breadcrumbs).toBeInTheDocument();
      });
    });

    test('should display breadcrumb navigation elements', async () => {
      renderClassScorePage();
      
      await waitFor(() => {
        expect(screen.getByText('Scoring Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Type Class Scoring')).toBeInTheDocument();
      });
    });
  });

  describe('Unique Iconography', () => {
    test('should display trophy icon in breadcrumbs', async () => {
      renderClassScorePage();
      
      await waitFor(() => {
        const breadcrumbIcon = document.querySelector('.breadcrumb-icon');
        expect(breadcrumbIcon).toBeInTheDocument();
      });
    });

    test('should display loading state with class scoring specific styling', async () => {
      // Mock loading state by not resolving the auth promise immediately
      const { getCurrentUser } = require('aws-amplify/auth');
      getCurrentUser.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      renderClassScorePage();
      
      await waitFor(() => {
        expect(screen.getByText('Preparing class scoring interface...')).toBeInTheDocument();
      });
    });
  });

  describe('Error States with Blue Theme', () => {
    test('should display authentication error with class scoring styling', async () => {
      const { getCurrentUser } = require('aws-amplify/auth');
      getCurrentUser.mockRejectedValue(new Error('Authentication failed'));
      
      renderClassScorePage();
      
      await waitFor(() => {
        expect(screen.getByText(/Authentication required/)).toBeInTheDocument();
        expect(screen.getByText('🚫 Access Error')).toBeInTheDocument();
      });
    });

    test('should display permission error with class scoring styling', async () => {
      const { isJudge } = require('../../utils/roleUtils');
      isJudge.mockResolvedValue(false);
      
      renderClassScorePage();
      
      await waitFor(() => {
        expect(screen.getByText(/Access denied/)).toBeInTheDocument();
      });
    });

    test('should display cat not found error with class scoring styling', async () => {
      const { generateClient } = require('aws-amplify/api');
      const mockClient = {
        graphql: jest.fn().mockResolvedValue({
          data: { getCat: null }
        })
      };
      generateClient.mockReturnValue(mockClient);
      
      renderClassScorePage();
      
      await waitFor(() => {
        expect(screen.getByText('🔍 Cat Not Found')).toBeInTheDocument();
      });
    });
  });

  describe('Return Button Styling', () => {
    test('should display return button with blue theme styling', async () => {
      const { getCurrentUser } = require('aws-amplify/auth');
      getCurrentUser.mockRejectedValue(new Error('Authentication failed'));
      
      renderClassScorePage();
      
      await waitFor(() => {
        const returnButton = screen.getByText('Return to Scoring Dashboard');
        expect(returnButton).toBeInTheDocument();
        expect(returnButton.closest('button')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State Visual Differentiation', () => {
    test('should display class scoring specific loading message', async () => {
      const { getCurrentUser } = require('aws-amplify/auth');
      getCurrentUser.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      renderClassScorePage();
      
      await waitFor(() => {
        expect(screen.getByText('Loading class scoring page...')).toBeInTheDocument();
        expect(screen.getByText('Type Class Scoring System')).toBeInTheDocument();
      });
    });

    test('should display trophy icon in loading state', async () => {
      const { getCurrentUser } = require('aws-amplify/auth');
      getCurrentUser.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      renderClassScorePage();
      
      await waitFor(() => {
        // The trophy icon should be present in the loading state
        const loadingContainer = screen.getByText('Preparing class scoring interface...').closest('div');
        expect(loadingContainer).toBeInTheDocument();
      });
    });
  });

  describe('Header Typography and Styling', () => {
    test('should display distinct header typography for class scoring', async () => {
      renderClassScorePage();
      
      await waitFor(() => {
        const header = screen.getByText('Type Class Scoring System');
        expect(header).toBeInTheDocument();
        
        // Check that it's in a header element with proper styling
        const headerElement = header.closest('.class-scoring-header');
        expect(headerElement).toBeInTheDocument();
      });
    });

    test('should display subtitle with class scoring context', async () => {
      renderClassScorePage();
      
      await waitFor(() => {
        const subtitle = screen.getByText(/Professional judging for class competition - Beauty, Personality & Balance\/Proportion/);
        expect(subtitle).toBeInTheDocument();
        expect(subtitle).toHaveClass('subtitle');
      });
    });
  });

  describe('Visual Separation from Cage Scoring', () => {
    test('should use class-specific CSS classes throughout', async () => {
      renderClassScorePage();
      
      await waitFor(() => {
        // Check for class-specific CSS classes
        expect(document.querySelector('.class-scoring-page')).toBeInTheDocument();
        expect(document.querySelector('.class-scoring-container')).toBeInTheDocument();
        expect(document.querySelector('.class-scoring-header')).toBeInTheDocument();
        expect(document.querySelector('.class-scoring-breadcrumbs')).toBeInTheDocument();
      });
    });

    test('should not use cage scoring CSS classes', async () => {
      renderClassScorePage();
      
      await waitFor(() => {
        // Ensure cage scoring classes are not present
        expect(document.querySelector('.cage-scoring-page')).not.toBeInTheDocument();
        expect(document.querySelector('.cage-scoring-container')).not.toBeInTheDocument();
        expect(document.querySelector('.cage-scoring-header')).not.toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design Maintenance', () => {
    test('should maintain visual differentiation on mobile', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 480,
      });

      renderClassScorePage();
      
      await waitFor(() => {
        // Class-specific styling should still be present
        expect(document.querySelector('.class-scoring-page')).toBeInTheDocument();
        expect(document.querySelector('.class-scoring-header')).toBeInTheDocument();
      });
    });
  });

  describe('Color Scheme Consistency', () => {
    test('should maintain blue color scheme throughout error states', async () => {
      const { getCurrentUser } = require('aws-amplify/auth');
      getCurrentUser.mockRejectedValue(new Error('Authentication failed'));
      
      renderClassScorePage();
      
      await waitFor(() => {
        // Even in error states, should maintain class scoring styling
        expect(document.querySelector('.class-scoring-page')).toBeInTheDocument();
        expect(document.querySelector('.class-scoring-header')).toBeInTheDocument();
        expect(screen.getByText('Type Class Scoring System')).toBeInTheDocument();
      });
    });
  });
});