import React from 'react';
import { render, screen } from '@testing-library/react';
import { ValidationErrorDisplay, FormField, ValidationSummary } from '../ValidationErrorDisplay';

// Mock the error handling utilities
vi.mock('../../utils/errorHandling', () => ({
  parseError: vi.fn((error) => ({
    error: {
      type: error?.error?.type || 'VALIDATION_ERROR',
      message: error?.error?.message || 'Validation failed',
      field: error?.error?.field
    }
  })),
  getUserFriendlyMessage: vi.fn((parsedError) => parsedError.error.message)
}));

describe('ValidationErrorDisplay', () => {
  it('renders validation error message', () => {
    const error = {
      error: {
        type: 'VALIDATION_ERROR',
        message: 'Field is required',
        field: 'name'
      }
    };

    render(<ValidationErrorDisplay error={error} />);

    expect(screen.getByText('Field is required')).toBeInTheDocument();
  });

  it('does not render for non-validation errors', () => {
    const error = {
      error: {
        type: 'NETWORK_ERROR',
        message: 'Network failed'
      }
    };

    render(<ValidationErrorDisplay error={error} />);

    expect(screen.queryByText('Network failed')).not.toBeInTheDocument();
  });

  it('filters by field when specified', () => {
    const error = {
      error: {
        type: 'VALIDATION_ERROR',
        message: 'Email is invalid',
        field: 'email'
      }
    };

    render(<ValidationErrorDisplay error={error} field="name" />);

    expect(screen.queryByText('Email is invalid')).not.toBeInTheDocument();
  });

  it('shows error when field matches', () => {
    const error = {
      error: {
        type: 'VALIDATION_ERROR',
        message: 'Email is invalid',
        field: 'email'
      }
    };

    render(<ValidationErrorDisplay error={error} field="email" />);

    expect(screen.getByText('Email is invalid')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const error = {
      error: {
        type: 'VALIDATION_ERROR',
        message: 'Field is required'
      }
    };

    render(<ValidationErrorDisplay error={error} className="custom-error" />);

    const errorElement = screen.getByText('Field is required');
    expect(errorElement).toHaveClass('validation-error', 'custom-error');
  });

  it('returns null when no error provided', () => {
    const { container } = render(<ValidationErrorDisplay error={null} />);

    expect(container.firstChild).toBeNull();
  });
});

describe('FormField', () => {
  it('renders children and label', () => {
    render(
      <FormField label="Test Field">
        <input type="text" />
      </FormField>
    );

    expect(screen.getByText('Test Field')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows required indicator when required', () => {
    render(
      <FormField label="Test Field" required>
        <input type="text" />
      </FormField>
    );

    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('applies error class when validation error exists', () => {
    const error = {
      error: {
        type: 'VALIDATION_ERROR',
        message: 'Field is required',
        field: 'test'
      }
    };

    render(
      <FormField error={error} field="test">
        <input type="text" />
      </FormField>
    );

    const formField = screen.getByRole('textbox').closest('.form-field');
    expect(formField).toHaveClass('error');
  });

  it('does not apply error class for non-matching field', () => {
    const error = {
      error: {
        type: 'VALIDATION_ERROR',
        message: 'Field is required',
        field: 'other'
      }
    };

    render(
      <FormField error={error} field="test">
        <input type="text" />
      </FormField>
    );

    const formField = screen.getByRole('textbox').closest('.form-field');
    expect(formField).not.toHaveClass('error');
  });

  it('shows validation error for field', () => {
    const error = {
      error: {
        type: 'VALIDATION_ERROR',
        message: 'Field is required',
        field: 'test'
      }
    };

    render(
      <FormField error={error} field="test" label="Test Field">
        <input type="text" />
      </FormField>
    );

    expect(screen.getByText('Field is required')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <FormField className="custom-field">
        <input type="text" />
      </FormField>
    );

    const formField = screen.getByRole('textbox').closest('.form-field');
    expect(formField).toHaveClass('custom-field');
  });
});

describe('ValidationSummary', () => {
  it('renders validation errors in a list', () => {
    const errors = [
      {
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Name is required'
        }
      },
      {
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Email is invalid'
        }
      }
    ];

    render(<ValidationSummary errors={errors} />);

    expect(screen.getByText('Please correct the following errors:')).toBeInTheDocument();
    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is invalid')).toBeInTheDocument();
  });

  it('filters out non-validation errors', () => {
    const errors = [
      {
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Name is required'
        }
      },
      {
        error: {
          type: 'NETWORK_ERROR',
          message: 'Network failed'
        }
      }
    ];

    render(<ValidationSummary errors={errors} />);

    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.queryByText('Network failed')).not.toBeInTheDocument();
  });

  it('uses custom title', () => {
    const errors = [
      {
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Name is required'
        }
      }
    ];

    render(<ValidationSummary errors={errors} title="Fix these issues:" />);

    expect(screen.getByText('Fix these issues:')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const errors = [
      {
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Name is required'
        }
      }
    ];

    render(<ValidationSummary errors={errors} className="custom-summary" />);

    const summary = screen.getByText('Please correct the following errors:').closest('.validation-summary');
    expect(summary).toHaveClass('custom-summary');
  });

  it('returns null when no validation errors', () => {
    const errors = [
      {
        error: {
          type: 'NETWORK_ERROR',
          message: 'Network failed'
        }
      }
    ];

    const { container } = render(<ValidationSummary errors={errors} />);

    expect(container.firstChild).toBeNull();
  });

  it('returns null when errors array is empty', () => {
    const { container } = render(<ValidationSummary errors={[]} />);

    expect(container.firstChild).toBeNull();
  });
});