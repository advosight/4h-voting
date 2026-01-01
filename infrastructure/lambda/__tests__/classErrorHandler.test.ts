import {
  ClassScoringValidationError,
  ClassScoringPermissionError,
  ClassScoringNotFoundError,
  ClassScoringConflictError,
  validateClassScoringInput,
  handleClassScoringError,
  createClassScoringErrorResponse,
  validateClassScoringPermissions,
  validateCatForClassScoring,
  calculateRibbonEligibility
} from '../classErrorHandler';
import { ErrorType } from '../errorHandler';

describe('ClassScoringValidationError', () => {
  it('should create validation error with category', () => {
    const error = new ClassScoringValidationError(
      'Beauty score must be between 0 and 15',
      'beautyScore',
      'beauty',
      { minValue: 0, maxValue: 15, currentValue: 20 }
    );

    expect(error.message).toBe('Beauty score must be between 0 and 15');
    expect(error.field).toBe('beautyScore');
    expect(error.category).toBe('beauty');
    expect(error.validationDetails).toEqual({
      minValue: 0,
      maxValue: 15,
      currentValue: 20
    });
  });
});

describe('ClassScoringPermissionError', () => {
  it('should create permission error with default message', () => {
    const error = new ClassScoringPermissionError();
    expect(error.message).toBe('Access denied for class scoring');
  });

  it('should create permission error with custom message', () => {
    const error = new ClassScoringPermissionError('Custom permission error');
    expect(error.message).toBe('Custom permission error');
  });
});

describe('ClassScoringNotFoundError', () => {
  it('should create not found error with resource type', () => {
    const error = new ClassScoringNotFoundError('Cat not found', 'cat');
    expect(error.message).toBe('Cat not found');
    expect(error.resourceType).toBe('cat');
  });
});

describe('ClassScoringConflictError', () => {
  it('should create conflict error with conflict type', () => {
    const error = new ClassScoringConflictError(
      'Score modified by another judge',
      'optimistic_lock'
    );
    expect(error.message).toBe('Score modified by another judge');
    expect(error.conflictType).toBe('optimistic_lock');
  });
});

describe('validateClassScoringInput', () => {
  it('should validate beauty score range', () => {
    expect(() => {
      validateClassScoringInput({ beautyScore: 20 });
    }).toThrow(ClassScoringValidationError);

    expect(() => {
      validateClassScoringInput({ beautyScore: -1 });
    }).toThrow(ClassScoringValidationError);

    expect(() => {
      validateClassScoringInput({ beautyScore: 10 });
    }).not.toThrow();
  });

  it('should validate personality score range', () => {
    expect(() => {
      validateClassScoringInput({ personalityScore: 25 });
    }).toThrow(ClassScoringValidationError);

    expect(() => {
      validateClassScoringInput({ personalityScore: -1 });
    }).toThrow(ClassScoringValidationError);

    expect(() => {
      validateClassScoringInput({ personalityScore: 15 });
    }).not.toThrow();
  });

  it('should validate balance/proportion score range', () => {
    expect(() => {
      validateClassScoringInput({ balanceProportionScore: 20 });
    }).toThrow(ClassScoringValidationError);

    expect(() => {
      validateClassScoringInput({ balanceProportionScore: -1 });
    }).toThrow(ClassScoringValidationError);

    expect(() => {
      validateClassScoringInput({ balanceProportionScore: 12 });
    }).not.toThrow();
  });

  it('should validate boolean health fields', () => {
    expect(() => {
      validateClassScoringInput({ coatCleanGroomed: 'true' as any });
    }).toThrow(ClassScoringValidationError);

    expect(() => {
      validateClassScoringInput({ coatCleanGroomed: true });
    }).not.toThrow();
  });

  it('should validate comment lengths', () => {
    const longComment = 'a'.repeat(501);
    expect(() => {
      validateClassScoringInput({ beautyComments: longComment });
    }).toThrow(ClassScoringValidationError);

    const veryLongHealthComment = 'a'.repeat(1001);
    expect(() => {
      validateClassScoringInput({ healthGroomingComments: veryLongHealthComment });
    }).toThrow(ClassScoringValidationError);
  });

  it('should validate required health fields for finalization', () => {
    expect(() => {
      validateClassScoringInput({
        isFinalized: true,
        coatCleanGroomed: true,
        // Missing other required health fields
      });
    }).toThrow(ClassScoringValidationError);

    expect(() => {
      validateClassScoringInput({
        isFinalized: true,
        coatCleanGroomed: true,
        teethGumsHealthy: true,
        eyesNoseClear: true,
        earsCleanMiteFree: true,
        toenailsClipped: true
      });
    }).not.toThrow();
  });
});

describe('handleClassScoringError', () => {
  it('should handle ClassScoringValidationError', () => {
    const error = new ClassScoringValidationError(
      'Beauty score invalid',
      'beautyScore',
      'beauty',
      { minValue: 0, maxValue: 15 }
    );

    const response = handleClassScoringError(error);

    expect(response.error.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(response.error.message).toBe('Beauty score invalid');
    expect(response.error.scoringType).toBe('CLASS');
    expect(response.error.category).toBe('beauty');
    expect(response.error.validationDetails).toEqual({ minValue: 0, maxValue: 15 });
  });

  it('should handle ClassScoringPermissionError', () => {
    const error = new ClassScoringPermissionError('Access denied');

    const response = handleClassScoringError(error);

    expect(response.error.type).toBe(ErrorType.PERMISSION_ERROR);
    expect(response.error.message).toBe('Access denied');
    expect(response.error.scoringType).toBe('CLASS');
  });

  it('should handle ClassScoringNotFoundError', () => {
    const error = new ClassScoringNotFoundError('Cat not found', 'cat');

    const response = handleClassScoringError(error);

    expect(response.error.type).toBe(ErrorType.NOT_FOUND);
    expect(response.error.message).toBe('Cat not found');
    expect(response.error.field).toBe('cat');
    expect(response.error.scoringType).toBe('CLASS');
  });

  it('should handle ClassScoringConflictError', () => {
    const error = new ClassScoringConflictError('Score modified', 'optimistic_lock');

    const response = handleClassScoringError(error);

    expect(response.error.type).toBe(ErrorType.CONFLICT);
    expect(response.error.message).toBe('Score modified');
    expect(response.error.scoringType).toBe('CLASS');
    expect(response.error.details).toEqual({ conflictType: 'optimistic_lock' });
  });

  it('should handle DynamoDB ConditionalCheckFailedException with class context', () => {
    const error = { name: 'ConditionalCheckFailedException' };

    const response = handleClassScoringError(error, 'class-scoring-operation');

    expect(response.error.type).toBe(ErrorType.CONFLICT);
    expect(response.error.message).toBe('This class score has been modified by another judge. Please refresh and try again.');
    expect(response.error.scoringType).toBe('CLASS');
  });

  it('should handle ResourceNotFoundException with class context', () => {
    const error = { name: 'ResourceNotFoundException' };

    const response = handleClassScoringError(error, 'class-scoring-operation');

    expect(response.error.type).toBe(ErrorType.NOT_FOUND);
    expect(response.error.message).toBe('The requested class score or cat was not found.');
    expect(response.error.scoringType).toBe('CLASS');
  });
});

describe('createClassScoringErrorResponse', () => {
  it('should create class scoring error response with HTTP status', () => {
    const response = createClassScoringErrorResponse(
      ErrorType.VALIDATION_ERROR,
      'Invalid input',
      400,
      'beautyScore',
      'beauty',
      { minValue: 0, maxValue: 15 }
    );

    expect(response.statusCode).toBe(400);
    
    const body = JSON.parse(response.body);
    expect(body.error.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(body.error.message).toBe('Invalid input');
    expect(body.error.scoringType).toBe('CLASS');
    expect(body.error.category).toBe('beauty');
    expect(body.error.validationDetails).toEqual({ minValue: 0, maxValue: 15 });
  });
});

describe('validateClassScoringPermissions', () => {
  it('should allow admin role', () => {
    expect(() => {
      validateClassScoringPermissions('admin', 'create');
    }).not.toThrow();
  });

  it('should allow judge role', () => {
    expect(() => {
      validateClassScoringPermissions('judge', 'create');
    }).not.toThrow();
  });

  it('should reject participant role', () => {
    expect(() => {
      validateClassScoringPermissions('participant', 'create');
    }).toThrow(ClassScoringPermissionError);
  });

  it('should reject unknown role', () => {
    expect(() => {
      validateClassScoringPermissions('unknown', 'create');
    }).toThrow(ClassScoringPermissionError);
  });
});

describe('validateCatForClassScoring', () => {
  it('should validate existing cat with ID', () => {
    const cat = { id: 'cat123', name: 'Fluffy' };
    expect(() => {
      validateCatForClassScoring(cat);
    }).not.toThrow();
  });

  it('should throw error for null cat', () => {
    expect(() => {
      validateCatForClassScoring(null);
    }).toThrow(ClassScoringNotFoundError);
  });

  it('should throw error for cat without ID', () => {
    const cat = { name: 'Fluffy' };
    expect(() => {
      validateCatForClassScoring(cat);
    }).toThrow(ClassScoringValidationError);
  });
});

describe('calculateRibbonEligibility', () => {
  it('should return Blue ribbon for high score with passing health', () => {
    const ribbon = calculateRibbonEligibility(47, true, false);
    expect(ribbon).toBe('Blue');
  });

  it('should return Red ribbon for medium score with passing health', () => {
    const ribbon = calculateRibbonEligibility(40, true, false);
    expect(ribbon).toBe('Red');
  });

  it('should return White ribbon for low score with passing health', () => {
    const ribbon = calculateRibbonEligibility(30, true, false);
    expect(ribbon).toBe('White');
  });

  it('should return Participation ribbon for very low score', () => {
    const ribbon = calculateRibbonEligibility(20, true, false);
    expect(ribbon).toBe('Participation');
  });

  it('should return Red ribbon for high score with flea issues', () => {
    const ribbon = calculateRibbonEligibility(47, true, true);
    expect(ribbon).toBe('Red');
  });

  it('should return Red ribbon for high score with failing health', () => {
    const ribbon = calculateRibbonEligibility(47, false, false);
    expect(ribbon).toBe('Red');
  });

  it('should throw error for invalid total score', () => {
    expect(() => {
      calculateRibbonEligibility(-5, true, false);
    }).toThrow(ClassScoringValidationError);

    expect(() => {
      calculateRibbonEligibility(55, true, false);
    }).toThrow(ClassScoringValidationError);
  });

  it('should throw error for non-numeric score', () => {
    expect(() => {
      calculateRibbonEligibility('invalid' as any, true, false);
    }).toThrow(ClassScoringValidationError);
  });
});