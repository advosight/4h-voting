import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ClassScoringErrorBoundary } from '../components/ClassScoringErrorBoundary';
import { ClassScoringNetworkErrorHandler } from '../components/ClassScoringNetworkErrorHandler';
import { ClassScoringValidationDisplay } from '../components/ClassScoringValidationDisplay';
import { ClassScoringConflictResolutionDialog } from '../components/ClassScoringConflictResolutionDialog';
import { useClassScoringErrorHandling } from '../hooks/useClassScoringErrorHandling';
import {
  ClassScoringValidationError,
  validateClassScoringInput,
  retryClassScoringOperation,
  withOptimisticLockRetry
} from '../utils/classErrorHandling';

// Mock the error handling utilities
jest.mock('../utils/classErrorHandling', () => ({
  ...jest.requireActual('../utils/classErrorHandling'),
  logClassScoringError: jest.fn(),
  retryClassScoringOperation: jest.fn(),
  withOptimisticLockRetry: jest.fn(),
  classScoringNetworkMonitor: {
    addListener: jest.fn(() => jest.fn()),
    getIsOnline: jest.fn(() => true),
    waitForConnection: jest.fn(() => Promise.resolve(true))
  }
}));

// Mock the base error handling
jest.mock('../utils/errorHandling', () => ({
  parseError: jest.fn((error) => ({
    error: {
      type: error.type || 'SYSTEM_ERROR',
      message: error.message || 'Test error'
    }
  })),
  isRetryableError: jest.fn(() => true),
  logError: jest.fn()
}));

// Test component that uses the error handling hook
const TestClassScoringComponent: React.FC<{
  shouldThrowError?: boolean;
  errorType?: string;
  onError?: (error: any) => void;
}> = ({ shouldThrowError = false, errorType = 'SYSTEM_ERROR', onError }) => {
  const errorHandling = useClassScoringErrorHandling({
    context: 'scoring',
    catId: 'cat123',
    judgeId: 'judge456',
    onError
  });

  const simulateOperation = async () => {
    if (shouldThrowError) {
      const error = { type: errorType, message: `${errorType} occurred` };
      throw error;
    }
    return 'success';
  };

  const handleTestOperation = async () => {
    await errorHandling.executeWithErrorHandling(simulateOperation);
  };

  const handleRetry = async () => {
    await errorHandling.retryOperation(simulateOperation);
  };

  return (
    <div>
      <div data-testid="error-state">
        {errorHandling.error ? 'Has Error' : 'No Error'}
      </div>
      <div data-testid="error-message">{errorHandling.userMessage}</div>
      <div data-testid="error-type">
        Network: {errorHandling.isNetworkError ? 'Yes' : 'No'} |
        Validation: {errorHandling.isValidationError ? 'Yes' : 'No'} |
        Conflict: {errorHandling.isConflictError ? 'Yes' : 'No'}
      </div>
      <div data-testid="retry-info">
        Can Retry: {errorHandling.canRetry ? 'Yes' : 'No'} |
        Retrying: {errorHandling.isRetrying ? 'Yes' : 'No'} |
        Count: {errorHandling.retryCount}
      </div>
      <div data-testid="severity">{errorHandling.errorSeverity}</div>
      
      <button onClick={handleTestOperation} data-testid="test-operation">
        Test Operation
      </button>
      <button onClick={handleRetry} data-testid="retry-button">
        {errorHandling.retryButtonText}
      </button>
      <button onClick={errorHandling.clearError} data-testid="clear-error">
        Clear Error
      </button>
    </div>
  );
};

describe('Class Scoring Error Handling Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Error Boundary Integration', () => {
    it('should catch and display class scoring errors', () => {
      const ThrowingComponent = () => {
        throw new Error('Class scoring component error');
      };

      render(
        <ClassScoringErrorBoundary context="scoring">
          <ThrowingComponent />
        </ClassScoringErrorBoundary>
      );

      expect(screen.getByText('Class Scoring Error')).toBeInTheDocument();
      expect(screen.getByText(/There was an issue with the class scoring form/)).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should provide context-specific error messages', () => {
      const ThrowingComponent = () => {
        throw new Error('Reports error');
      };

      render(
        <ClassScoringErrorBoundary context="reports">
          <ThrowingComponent />
        </ClassScoringErrorBoundary>
      );

      expect(screen.getByText(/Unable to load class scoring reports/)).toBeInTheDocument();
    });
  });

  describe('Network Error Handling Integration', () => {
    it('should display network error with retry options', () => {
      const networkError = { type: 'NETWORK_ERROR', message: 'Connection failed' };
      const onRetry = jest.fn().mockResolvedValue(undefined);

      render(
        <ClassScoringNetworkErrorHandler
          error={networkError}
          onRetry={onRetry}
          context="scoring"
          catId="cat123"
          judgeId="judge456"
        />
      );

      expect(screen.getByText('Class Scoring Connection Issue')).toBeInTheDocument();
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
      expect(screen.getByText(/Your scoring progress is automatically saved/)).toBeInTheDocument();
      
      const retryButton = screen.getByText(/Retry/);
      expect(retryButton).toBeInTheDocument();
    });

    it('should handle offline state', () => {
      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      const networkError = { type: 'NETWORK_ERROR', message: 'Offline' };
      const onRetry = jest.fn();

      render(
        <ClassScoringNetworkErrorHandler
          error={networkError}
          onRetry={onRetry}
          context="scoring"
        />
      );

      expect(screen.getByText("You're offline")).toBeInTheDocument();
      expect(screen.getByText(/check your internet connection/)).toBeInTheDocument();
    });
  });

  describe('Validation Error Display Integration', () => {
    it('should display validation errors by category', () => {
      const validationErrors = [
        new ClassScoringValidationError(
          'Beauty score must be between 0 and 15',
          'beauty',
          'beautyScore',
          { minValue: 0, maxValue: 15, currentValue: 20 }
        ),
        new ClassScoringValidationError(
          'Health evaluation required',
          'health',
          'healthGrooming'
        )
      ];

      render(
        <ClassScoringValidationDisplay
          errors={validationErrors}
          showSummary={true}
        />
      );

      expect(screen.getByText('Beauty Score')).toBeInTheDocument();
      expect(screen.getByText('Health & Grooming')).toBeInTheDocument();
      expect(screen.getByText('Beauty score must be between 0 and 15')).toBeInTheDocument();
      expect(screen.getByText('Health evaluation required')).toBeInTheDocument();
      expect(screen.getByText(/Please fix 2 validation errors/)).toBeInTheDocument();
    });

    it('should show validation details', () => {
      const validationError = new ClassScoringValidationError(
        'Score out of range',
        'beauty',
        'beautyScore',
        { minValue: 0, maxValue: 15, currentValue: 20 }
      );

      render(
        <ClassScoringValidationDisplay
          errors={[validationError]}
        />
      );

      expect(screen.getByText('Valid range: 0-15')).toBeInTheDocument();
      expect(screen.getByText('Current: 20')).toBeInTheDocument();
    });
  });

  describe('Conflict Resolution Integration', () => {
    it('should display conflict resolution dialog', () => {
      const currentScore = {
        id: 'score123',
        catId: 'cat123',
        judgeId: 'judge456',
        beautyScore: 12,
        personalityScore: 18,
        balanceProportionScore: 10
      };

      const serverScore = {
        ...currentScore,
        beautyScore: 14,
        personalityScore: 16,
        judgeName: 'Other Judge',
        timestamp: new Date().toISOString(),
        totalScore: 45,
        ribbonEligibility: 'Blue',
        isFinalized: false,
        coatCleanGroomed: true,
        teethGumsHealthy: true,
        eyesNoseClear: true,
        earsCleanMiteFree: true,
        toenailsClipped: true,
        fleaIssues: false
      };

      const onResolve = jest.fn();

      render(
        <ClassScoringConflictResolutionDialog
          isOpen={true}
          onClose={() => {}}
          currentScore={currentScore}
          serverScore={serverScore}
          onResolve={onResolve}
          catName="Fluffy"
          cageNumber={42}
        />
      );

      expect(screen.getByText('🎗️ Class Scoring Conflict')).toBeInTheDocument();
      expect(screen.getByText(/Another judge has modified the class score for Fluffy/)).toBeInTheDocument();
      expect(screen.getByText('Use Server Version')).toBeInTheDocument();
      expect(screen.getByText('Keep Your Version')).toBeInTheDocument();
    });
  });

  describe('Error Handling Hook Integration', () => {
    it('should handle successful operations', async () => {
      render(<TestClassScoringComponent shouldThrowError={false} />);

      expect(screen.getByTestId('error-state')).toHaveTextContent('No Error');

      fireEvent.click(screen.getByTestId('test-operation'));

      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toHaveTextContent('No Error');
      });
    });

    it('should handle operation failures', async () => {
      render(<TestClassScoringComponent shouldThrowError={true} errorType="NETWORK_ERROR" />);

      fireEvent.click(screen.getByTestId('test-operation'));

      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toHaveTextContent('Has Error');
        expect(screen.getByTestId('error-message')).toHaveTextContent('NETWORK_ERROR occurred');
        expect(screen.getByTestId('error-type')).toHaveTextContent('Network: Yes');
      });
    });

    it('should identify different error types', async () => {
      const { rerender } = render(
        <TestClassScoringComponent shouldThrowError={true} errorType="VALIDATION_ERROR" />
      );

      fireEvent.click(screen.getByTestId('test-operation'));

      await waitFor(() => {
        expect(screen.getByTestId('error-type')).toHaveTextContent('Validation: Yes');
        expect(screen.getByTestId('severity')).toHaveTextContent('low');
      });

      rerender(<TestClassScoringComponent shouldThrowError={true} errorType="CONFLICT" />);

      fireEvent.click(screen.getByTestId('test-operation'));

      await waitFor(() => {
        expect(screen.getByTestId('error-type')).toHaveTextContent('Conflict: Yes');
        expect(screen.getByTestId('severity')).toHaveTextContent('medium');
      });
    });

    it('should handle retry operations', async () => {
      (retryClassScoringOperation as jest.Mock).mockResolvedValue(undefined);

      render(<TestClassScoringComponent shouldThrowError={true} errorType="NETWORK_ERROR" />);

      // Trigger initial error
      fireEvent.click(screen.getByTestId('test-operation'));

      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toHaveTextContent('Has Error');
      });

      // Retry the operation
      fireEvent.click(screen.getByTestId('retry-button'));

      await waitFor(() => {
        expect(retryClassScoringOperation).toHaveBeenCalled();
        expect(screen.getByTestId('error-state')).toHaveTextContent('No Error');
      });
    });

    it('should clear errors', async () => {
      render(<TestClassScoringComponent shouldThrowError={true} />);

      // Trigger error
      fireEvent.click(screen.getByTestId('test-operation'));

      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toHaveTextContent('Has Error');
      });

      // Clear error
      fireEvent.click(screen.getByTestId('clear-error'));

      expect(screen.getByTestId('error-state')).toHaveTextContent('No Error');
      expect(screen.getByTestId('error-message')).toHaveTextContent('');
    });

    it('should call custom error handlers', async () => {
      const onError = jest.fn();
      render(<TestClassScoringComponent shouldThrowError={true} onError={onError} />);

      fireEvent.click(screen.getByTestId('test-operation'));

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });
  });

  describe('Validation Integration', () => {
    it('should validate class scoring input and show errors', () => {
      const invalidInput = {
        beautyScore: 20, // Max is 15
        personalityScore: -5, // Min is 0
        balanceProportionScore: 25 // Max is 15
      };

      const errors = validateClassScoringInput(invalidInput);

      expect(errors).toHaveLength(3);
      expect(errors[0].category).toBe('beauty');
      expect(errors[1].category).toBe('personality');
      expect(errors[2].category).toBe('balanceProportion');
    });

    it('should validate health requirements', () => {
      const incompleteHealthInput = {
        coatCleanGroomed: true,
        // Missing other required health fields
      };

      const { validateHealthRequirements } = require('../utils/classErrorHandling');
      const errors = validateHealthRequirements(incompleteHealthInput);

      expect(errors).toHaveLength(1);
      expect(errors[0].category).toBe('health');
      expect(errors[0].validationDetails.requiredFields).toContain('Teeth/Gums Healthy');
    });
  });

  describe('End-to-End Error Scenarios', () => {
    it('should handle complete error workflow with retry and recovery', async () => {
      // Mock initial failure then success
      let callCount = 0;
      (retryClassScoringOperation as jest.Mock).mockImplementation(async (operation) => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Network failure');
        }
        return await operation();
      });

      render(<TestClassScoringComponent shouldThrowError={false} />);

      // Initial operation should succeed
      fireEvent.click(screen.getByTestId('test-operation'));

      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toHaveTextContent('No Error');
      });
    });

    it('should handle optimistic lock conflicts with resolution', async () => {
      const conflictError = {
        type: 'CONFLICT',
        code: 'OPTIMISTIC_LOCK_FAILED',
        message: 'Score modified by another judge'
      };

      (withOptimisticLockRetry as jest.Mock).mockRejectedValue(conflictError);

      render(<TestClassScoringComponent shouldThrowError={true} errorType="CONFLICT" />);

      fireEvent.click(screen.getByTestId('test-operation'));

      await waitFor(() => {
        expect(screen.getByTestId('error-type')).toHaveTextContent('Conflict: Yes');
        expect(screen.getByTestId('severity')).toHaveTextContent('medium');
      });
    });
  });
});