import React from 'react';
import { render, screen } from '@testing-library/react';
import FitShowValidationErrorDisplay, { FitShowValidationError } from '../FitShowValidationErrorDisplay';

describe('FitShowValidationErrorDisplay', () => {
  const mockErrors: FitShowValidationError[] = [
    {
      field: 'attire',
      message: 'Score must be between 1 and 10',
      value: 15,
      expectedRange: '1-10'
    },
    {
      field: 'catId',
      message: 'Cat ID is required'
    },
    {
      field: 'appearanceComments',
      message: 'Comment exceeds maximum length of 500 characters',
      value: 600,
      expectedRange: '0-500'
    }
  ];

  it('should render nothing when no errors', () => {
    const { container } = render(<FitShowValidationErrorDisplay errors={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render nothing when errors is null or undefined', () => {
    const { container: container1 } = render(<FitShowValidationErrorDisplay errors={null as any} />);
    expect(container1.firstChild).toBeNull();

    const { container: container2 } = render(<FitShowValidationErrorDisplay errors={undefined as any} />);
    expect(container2.firstChild).toBeNull();
  });

  it('should display error count in header', () => {
    render(<FitShowValidationErrorDisplay errors={mockErrors} />);
    
    expect(screen.getByText('Validation Errors (3)')).toBeInTheDocument();
  });

  it('should group errors by category', () => {
    render(<FitShowValidationErrorDisplay errors={mockErrors} />);
    
    expect(screen.getByText('Appearance & Demeanor')).toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
  });

  it('should display field names when showFieldNames is true', () => {
    render(<FitShowValidationErrorDisplay errors={mockErrors} showFieldNames={true} />);
    
    expect(screen.getByText('Neat, Clean, Appropriate Attire')).toBeInTheDocument();
    expect(screen.getByText('Cat ID')).toBeInTheDocument();
    expect(screen.getByText('Appearance Comments')).toBeInTheDocument();
  });

  it('should hide field names when showFieldNames is false', () => {
    render(<FitShowValidationErrorDisplay errors={mockErrors} showFieldNames={false} />);
    
    expect(screen.queryByText('Neat, Clean, Appropriate Attire')).not.toBeInTheDocument();
    expect(screen.queryByText('Cat ID')).not.toBeInTheDocument();
    expect(screen.queryByText('Appearance Comments')).not.toBeInTheDocument();
  });

  it('should display error messages', () => {
    render(<FitShowValidationErrorDisplay errors={mockErrors} />);
    
    expect(screen.getByText('Score must be between 1 and 10')).toBeInTheDocument();
    expect(screen.getByText('Cat ID is required')).toBeInTheDocument();
    expect(screen.getByText('Comment exceeds maximum length of 500 characters')).toBeInTheDocument();
  });

  it('should display expected range and received value when available', () => {
    render(<FitShowValidationErrorDisplay errors={mockErrors} />);
    
    expect(screen.getByText('Expected: 1-10')).toBeInTheDocument();
    expect(screen.getByText('Received: 15')).toBeInTheDocument();
    
    expect(screen.getByText('Expected: 0-500')).toBeInTheDocument();
    expect(screen.getByText('Received: 600')).toBeInTheDocument();
  });

  it('should limit displayed errors when maxErrors is set', () => {
    const manyErrors: FitShowValidationError[] = Array.from({ length: 15 }, (_, i) => ({
      field: `field${i}`,
      message: `Error message ${i}`
    }));

    render(<FitShowValidationErrorDisplay errors={manyErrors} maxErrors={5} />);
    
    expect(screen.getByText('Validation Errors (15)')).toBeInTheDocument();
    expect(screen.getByText('... and 10 more errors')).toBeInTheDocument();
  });

  it('should show singular form for one additional error', () => {
    const manyErrors: FitShowValidationError[] = Array.from({ length: 6 }, (_, i) => ({
      field: `field${i}`,
      message: `Error message ${i}`
    }));

    render(<FitShowValidationErrorDisplay errors={manyErrors} maxErrors={5} />);
    
    expect(screen.getByText('... and 1 more error')).toBeInTheDocument();
  });

  it('should display help information', () => {
    render(<FitShowValidationErrorDisplay errors={mockErrors} />);
    
    expect(screen.getByText('How to fix these errors:')).toBeInTheDocument();
    expect(screen.getByText('• Ensure all scores are within the valid range for each category')).toBeInTheDocument();
    expect(screen.getByText('• Fill in all required fields')).toBeInTheDocument();
    expect(screen.getByText('• Keep comments under 500 characters')).toBeInTheDocument();
    expect(screen.getByText('• Verify participant and judge information is correct')).toBeInTheDocument();
  });

  it('should use appropriate icons for different field types', () => {
    const commentError: FitShowValidationError = {
      field: 'appearanceComments',
      message: 'Comment too long'
    };

    const idError: FitShowValidationError = {
      field: 'catId',
      message: 'ID required'
    };

    const scoreError: FitShowValidationError = {
      field: 'attire',
      message: 'Invalid score'
    };

    render(<FitShowValidationErrorDisplay errors={[commentError, idError, scoreError]} />);
    
    // Icons are rendered as text content, so we check for their presence
    const container = screen.getByRole('main') || document.body;
    expect(container.textContent).toContain('💬'); // Comment icon
    expect(container.textContent).toContain('🔍'); // ID icon
    expect(container.textContent).toContain('⚠️'); // Warning icon
  });

  it('should apply custom className', () => {
    const { container } = render(
      <FitShowValidationErrorDisplay errors={mockErrors} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should handle unknown field names gracefully', () => {
    const unknownFieldError: FitShowValidationError = {
      field: 'unknownField',
      message: 'Unknown field error'
    };

    render(<FitShowValidationErrorDisplay errors={[unknownFieldError]} />);
    
    expect(screen.getByText('unknownField')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('should group multiple errors in same category', () => {
    const appearanceErrors: FitShowValidationError[] = [
      { field: 'attire', message: 'Attire error' },
      { field: 'attentive', message: 'Attentive error' },
      { field: 'courteous', message: 'Courteous error' }
    ];

    render(<FitShowValidationErrorDisplay errors={appearanceErrors} />);
    
    const appearanceSection = screen.getByText('Appearance & Demeanor').closest('div');
    expect(appearanceSection).toBeInTheDocument();
    
    expect(screen.getByText('Attire error')).toBeInTheDocument();
    expect(screen.getByText('Attentive error')).toBeInTheDocument();
    expect(screen.getByText('Courteous error')).toBeInTheDocument();
  });
});