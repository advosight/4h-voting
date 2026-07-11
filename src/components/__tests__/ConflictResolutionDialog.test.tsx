import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConflictResolutionDialog } from '../ConflictResolutionDialog';

// Mock the error handling utilities
vi.mock('../../utils/errorHandling', () => ({
  parseError: vi.fn((error) => ({
    error: {
      type: error.type || 'CONFLICT',
      message: error.message || 'Conflict occurred',
      code: error.code || 'CONFLICT',
      details: error.details
    }
  }))
}));

const mockOnRefresh = vi.fn();
const mockOnCancel = vi.fn();

describe('ConflictResolutionDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders conflict dialog with default message', () => {
    const error = { 
      type: 'CONFLICT', 
      message: 'Item has been modified by another user' 
    };

    render(
      <ConflictResolutionDialog
        error={error}
        onRefresh={mockOnRefresh}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Update Conflict')).toBeInTheDocument();
    expect(screen.getByText('Item has been modified by another user')).toBeInTheDocument();
  });

  it('renders optimistic lock conflict message', () => {
    const error = { 
      type: 'CONFLICT', 
      code: 'OPTIMISTIC_LOCK_FAILED',
      message: 'Optimistic lock failed' 
    };

    render(
      <ConflictResolutionDialog
        error={error}
        onRefresh={mockOnRefresh}
        onCancel={mockOnCancel}
        itemType="score"
      />
    );

    expect(screen.getByText('Conflict Detected')).toBeInTheDocument();
    expect(screen.getByText('This score has been modified by another user while you were editing it.')).toBeInTheDocument();
    expect(screen.getByText('To continue, you\'ll need to refresh the data and reapply your changes. Your current changes will be lost.')).toBeInTheDocument();
  });

  it('shows warning about losing changes', () => {
    const error = { 
      type: 'CONFLICT', 
      code: 'OPTIMISTIC_LOCK_FAILED' 
    };

    render(
      <ConflictResolutionDialog
        error={error}
        onRefresh={mockOnRefresh}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('⚠️')).toBeInTheDocument();
    expect(screen.getByText('Warning:')).toBeInTheDocument();
    expect(screen.getByText('Refreshing will discard your current changes.')).toBeInTheDocument();
  });

  it('calls onRefresh when refresh button is clicked', async () => {
    const error = { type: 'CONFLICT' };

    render(
      <ConflictResolutionDialog
        error={error}
        onRefresh={mockOnRefresh}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Refresh & Continue'));

    await waitFor(() => {
      expect(mockOnRefresh).toHaveBeenCalled();
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    const error = { type: 'CONFLICT' };

    render(
      <ConflictResolutionDialog
        error={error}
        onRefresh={mockOnRefresh}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('shows loading state during refresh', async () => {
    const error = { type: 'CONFLICT' };
    const slowRefresh = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <ConflictResolutionDialog
        error={error}
        onRefresh={slowRefresh}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Refresh & Continue'));

    expect(screen.getByText('Refreshing...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByText('Refreshing...')).not.toBeInTheDocument();
    });
  });

  it('disables buttons during refresh', async () => {
    const error = { type: 'CONFLICT' };
    const slowRefresh = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <ConflictResolutionDialog
        error={error}
        onRefresh={slowRefresh}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Refresh & Continue'));

    expect(screen.getByText('Refreshing...')).toBeDisabled();
    expect(screen.getByText('Cancel')).toBeDisabled();
    
    await waitFor(() => {
      expect(screen.getByText('Refresh & Continue')).not.toBeDisabled();
      expect(screen.getByText('Cancel')).not.toBeDisabled();
    });
  });

  it('shows technical details when available', () => {
    const error = { 
      type: 'CONFLICT',
      details: { 
        conflictingVersion: 2,
        currentVersion: 1 
      }
    };

    render(
      <ConflictResolutionDialog
        error={error}
        onRefresh={mockOnRefresh}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Technical Details')).toBeInTheDocument();
    
    // Click to expand details
    fireEvent.click(screen.getByText('Technical Details'));
    
    expect(screen.getByText(/"conflictingVersion": 2/)).toBeInTheDocument();
    expect(screen.getByText(/"currentVersion": 1/)).toBeInTheDocument();
  });

  it('uses custom item type in message', () => {
    const error = { 
      type: 'CONFLICT', 
      code: 'OPTIMISTIC_LOCK_FAILED' 
    };

    render(
      <ConflictResolutionDialog
        error={error}
        onRefresh={mockOnRefresh}
        onCancel={mockOnCancel}
        itemType="report"
      />
    );

    expect(screen.getByText('This report has been modified by another user while you were editing it.')).toBeInTheDocument();
  });
});