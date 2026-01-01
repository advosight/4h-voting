import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import {
  ClassScoringValidationDisplay,
  useClassScoringValidation,
  FieldValidation
} from '../ClassScoringValidationDisplay';
import { ClassScoringValidationError } from '../../utils/classErrorHandling';

// Mock the class error handling utilities
jest.mock('../../utils/classErrorHandling', () => ({
  ClassScoringValidationError: jest.requireActual('../../utils/classErrorHandling').ClassScoringValidationError,
  getValidationErrorSummary: jest.fn((errors) => {
    if (errors.length === 0) return '';
    if (errors.length === 1) return errors[0].message;
    return `Please fix ${errors.length} validation errors`;
  }),
  validateClassScoringInput: jest.fn((input) => {
    const errors = [];
    if (input.beautyScore > 15) {
      errors.push(new (jest.requireActual('../../utils/classErrorHandling').ClassScoringValidationError)(
        'Beauty score must be between 0 and 15',
        'beauty',
        'beautyScore',
        { minValue: 0, maxValue: 15, currentValue: input.beautyScore }
      ));
    }
    if (input.personalityScore > 20) {
      errors.push(new (jest.requireActual('../../utils/classErrorHandling').ClassScoringValidationError)(
        'Personality score must be between 0 and 20',
        'personality',
        'personalityScore',
        { minValue: 0, maxValue: 20, currentValue: input.personalityScore }
      ));
    }
    return errors;
  }),
  validateHealthRequirements: jest.fn((input) => {
    const errors = [];
    if (!input.coatCleanGroomed) {
      errors.push(new (jest.requireActual('../../utils/classErrorHandling').ClassScoringValidationError)(
        'All health items must be evaluated',
        'health',
        'healthGrooming',
        { requiredFields: ['Coat Clean & Groomed'] }
      ));
    }
    return errors;
  })
}));

describe('ClassScoringValidationDisplay', () => {
  it('should render nothing when no errors', () => {
    const { container } = render(
      <ClassScoringValidationDisplay errors={[]} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render validation errors by category', () => {
    const errors = [
      new ClassScoringValidationError(
        'Beauty score must be between 0 and 15',
        'beauty',
        'beautyScore',
        { minValue: 0, maxValue: 15, currentValue: 20 }
      ),
      new ClassScoringValidationError(
        'Personality score must be between 0 and 20',
        'personality',
        'personalityScore',
        { minValue: 0, maxValue: 20, currentValue: 25 }
      )
    ];

    render(<ClassScoringValidationDisplay errors={errors} />);

    expect(screen.getByText('Beauty Score')).toBeInTheDocument();
    expect(screen.getByText('Personality Score')).toBeInTheDocument();
    expect(screen.getByText('Beauty score must be between 0 and 15')).toBeInTheDocument();
    expect(screen.getByText('Personality score must be between 0 and 20')).toBeInTheDocument();
  });

  it('should show validation details', () => {
    const errors = [
      new ClassScoringValidationError(
        'Beauty score must be between 0 and 15',
        'beauty',
        'beautyScore',
        { minValue: 0, maxValue: 15, currentValue: 20 }
      )
    ];

    render(<ClassScoringValidationDisplay errors={errors} />);

    expect(screen.getByText('Valid range: 0-15')).toBeInTheDocument();
    expect(screen.getByText('Current: 20')).toBeInTheDocument();
  });

  it('should show required fields for health errors', () => {
    const errors = [
      new ClassScoringValidationError(
        'All health items must be evaluated',
        'health',
        'healthGrooming',
        { requiredFields: ['Coat Clean & Groomed', 'Teeth/Gums Healthy'] }
      )
    ];

    render(<ClassScoringValidationDisplay errors={errors} />);

    expect(screen.getByText('Health & Grooming')).toBeInTheDocument();
    expect(screen.getByText('Required:')).toBeInTheDocument();
    expect(screen.getByText('Coat Clean & Groomed')).toBeInTheDocument();
    expect(screen.getByText('Teeth/Gums Healthy')).toBeInTheDocument();
  });

  it('should show summary when requested', () => {
    const errors = [
      new ClassScoringValidationError(
        'Beauty score invalid',
        'beauty',
        'beautyScore'
      )
    ];

    render(<ClassScoringValidationDisplay errors={errors} showSummary={true} />);

    expect(screen.getByText('Beauty score invalid')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const errors = [
      new ClassScoringValidationError(
        'Test error',
        'beauty',
        'beautyScore'
      )
    ];

    const { container } = render(
      <ClassScoringValidationDisplay errors={errors} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('class-scoring-validation-display');
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('useClassScoringValidation', () => {
  it('should return no errors for valid input', () => {
    const { result } = renderHook(() =>
      useClassScoringValidation({
        beautyScore: 10,
        personalityScore: 15,
        balanceProportionScore: 12
      })
    );

    expect(result.current.validationErrors).toHaveLength(0);
    expect(result.current.isValid).toBe(true);
    expect(result.current.hasErrors).toBe(false);
  });

  it('should return errors for invalid input', () => {
    const { result } = renderHook(() =>
      useClassScoringValidation({
        beautyScore: 20, // Invalid - max is 15
        personalityScore: 25 // Invalid - max is 20
      })
    );

    expect(result.current.validationErrors).toHaveLength(2);
    expect(result.current.isValid).toBe(false);
    expect(result.current.hasErrors).toBe(true);
  });

  it('should validate health requirements when finalizing', () => {
    const { result } = renderHook(() =>
      useClassScoringValidation({
        beautyScore: 10,
        personalityScore: 15,
        balanceProportionScore: 12
        // Missing health fields
      }, true) // isFinalized = true
    );

    expect(result.current.validationErrors).toHaveLength(1);
    expect(result.current.isValid).toBe(false);
  });

  it('should update errors when form data changes', () => {
    const { result, rerender } = renderHook(
      ({ formData }) => useClassScoringValidation(formData),
      {
        initialProps: {
          formData: { beautyScore: 10 }
        }
      }
    );

    expect(result.current.validationErrors).toHaveLength(0);

    rerender({ formData: { beautyScore: 20 } }); // Invalid score

    expect(result.current.validationErrors).toHaveLength(1);
  });

  it('should group errors by category', () => {
    const { result } = renderHook(() =>
      useClassScoringValidation({
        beautyScore: 20,
        personalityScore: 25
      })
    );

    expect(result.current.errorsByCategory.beauty).toHaveLength(1);
    expect(result.current.errorsByCategory.personality).toHaveLength(1);
  });

  it('should provide helper functions for getting errors', () => {
    const { result } = renderHook(() =>
      useClassScoringValidation({
        beautyScore: 20,
        personalityScore: 25
      })
    );

    const beautyErrors = result.current.getErrorsForField('beautyScore');
    const personalityErrors = result.current.getErrorsForCategory('personality');

    expect(beautyErrors).toHaveLength(1);
    expect(personalityErrors).toHaveLength(1);
  });
});

describe('FieldValidation', () => {
  it('should render nothing when no field errors', () => {
    const errors = [
      new ClassScoringValidationError(
        'Other field error',
        'personality',
        'personalityScore'
      )
    ];

    const { container } = render(
      <FieldValidation field="beautyScore" errors={errors} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render field-specific errors', () => {
    const errors = [
      new ClassScoringValidationError(
        'Beauty score invalid',
        'beauty',
        'beautyScore'
      ),
      new ClassScoringValidationError(
        'Other field error',
        'personality',
        'personalityScore'
      )
    ];

    render(<FieldValidation field="beautyScore" errors={errors} />);

    expect(screen.getByText('Beauty score invalid')).toBeInTheDocument();
    expect(screen.queryByText('Other field error')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const errors = [
      new ClassScoringValidationError(
        'Beauty score invalid',
        'beauty',
        'beautyScore'
      )
    ];

    const { container } = render(
      <FieldValidation field="beautyScore" errors={errors} className="custom-field-class" />
    );

    expect(container.firstChild).toHaveClass('field-validation');
    expect(container.firstChild).toHaveClass('custom-field-class');
  });

  it('should render multiple errors for the same field', () => {
    const errors = [
      new ClassScoringValidationError(
        'Beauty score too high',
        'beauty',
        'beautyScore'
      ),
      new ClassScoringValidationError(
        'Beauty score format invalid',
        'beauty',
        'beautyScore'
      )
    ];

    render(<FieldValidation field="beautyScore" errors={errors} />);

    expect(screen.getByText('Beauty score too high')).toBeInTheDocument();
    expect(screen.getByText('Beauty score format invalid')).toBeInTheDocument();
  });
});