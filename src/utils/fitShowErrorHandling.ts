import { FitShowScore } from '../types/scoring';

export interface FitShowErrorContext {
  operation: string;
  scoreId?: string;
  catId?: string;
  judgeId?: string;
  participantName?: string;
  timestamp: Date;
}

export interface FitShowValidationError {
  field: string;
  message: string;
  value?: any;
  expectedRange?: string;
}

export interface FitShowNetworkError {
  message: string;
  code: string;
  operation: string;
  timestamp: Date;
  retryCount?: number;
  originalError?: Error;
}

export class FitShowErrorHandler {
  private static errorLog: Array<{
    error: Error | FitShowNetworkError;
    context: FitShowErrorContext;
    timestamp: Date;
  }> = [];

  static logError(error: Error | FitShowNetworkError, context: FitShowErrorContext): void {
    this.errorLog.push({
      error,
      context,
      timestamp: new Date()
    });

    // Keep only last 50 errors
    if (this.errorLog.length > 50) {
      this.errorLog = this.errorLog.slice(-50);
    }

    console.error('FitShow Error:', {
      error: error.message,
      context,
      timestamp: new Date().toISOString()
    });
  }

  static getErrorLog(): Array<{
    error: Error | FitShowNetworkError;
    context: FitShowErrorContext;
    timestamp: Date;
  }> {
    return [...this.errorLog];
  }

  static clearErrorLog(): void {
    this.errorLog = [];
  }

  static createNetworkError(
    message: string,
    operation: string,
    code: string = 'NETWORK_ERROR',
    retryCount: number = 0,
    originalError?: Error
  ): FitShowNetworkError {
    return {
      message,
      code,
      operation,
      timestamp: new Date(),
      retryCount,
      originalError
    };
  }

  static isNetworkError(error: any): error is FitShowNetworkError {
    return error !== null && error !== undefined && typeof error === 'object' && 'code' in error && 'operation' in error;
  }

  static isValidationError(error: any): boolean {
    return error && typeof error === 'object' && 'field' in error && 'message' in error;
  }

  static async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = 3,
    delay: number = 1000,
    context?: Partial<FitShowErrorContext>
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        const errorContext: FitShowErrorContext = {
          operation: operationName,
          timestamp: new Date(),
          ...context
        };

        if (attempt === maxRetries) {
          const networkError = this.createNetworkError(
            `Failed after ${maxRetries + 1} attempts: ${lastError.message}`,
            operationName,
            'MAX_RETRIES_EXCEEDED',
            attempt,
            lastError
          );
          
          this.logError(networkError, errorContext);
          throw networkError;
        }

        const networkError = this.createNetworkError(
          `Attempt ${attempt + 1} failed: ${lastError.message}`,
          operationName,
          'RETRY_ATTEMPT',
          attempt,
          lastError
        );
        
        this.logError(networkError, errorContext);

        // Exponential backoff
        const waitTime = delay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    throw lastError!;
  }

  static validateFitShowScore(score: Partial<FitShowScore>): FitShowValidationError[] {
    const errors: FitShowValidationError[] = [];

    // Required fields
    if (!score.catId) {
      errors.push({
        field: 'catId',
        message: 'Cat ID is required'
      });
    }

    if (!score.judgeId) {
      errors.push({
        field: 'judgeId',
        message: 'Judge ID is required'
      });
    }

    if (!score.participantName || score.participantName.trim() === '') {
      errors.push({
        field: 'participantName',
        message: 'Participant name is required'
      });
    }

    // Score validations with ranges
    const scoreValidations = [
      { field: 'attire', min: 1, max: 10 },
      { field: 'attentive', min: 1, max: 5 },
      { field: 'courteous', min: 1, max: 5 },
      { field: 'controlEquipment', min: 1, max: 10 },
      { field: 'pickupCarrying', min: 1, max: 4 },
      { field: 'showingHeadShape', min: 1, max: 4 },
      { field: 'showingBodyType', min: 1, max: 4 },
      { field: 'showingTail', min: 1, max: 4 },
      { field: 'showingCoatTexture', min: 1, max: 4 },
      { field: 'showingMouthTeethGums', min: 1, max: 3 },
      { field: 'conditionMouthTeethGums', min: 1, max: 2 },
      { field: 'showingNose', min: 1, max: 2 },
      { field: 'showingEyes', min: 1, max: 2 },
      { field: 'conditionNoseEyes', min: 1, max: 2 },
      { field: 'showingEars', min: 1, max: 2 },
      { field: 'earsClean', min: 1, max: 2 },
      { field: 'showingToenailsClaws', min: 1, max: 3 },
      { field: 'toenailsClipped', min: 1, max: 6 },
      { field: 'showingBellyCoatCleanliness', min: 1, max: 3 },
      { field: 'coatCleanWellGroomed', min: 1, max: 8 },
      { field: 'catHealthCare', min: 1, max: 3 },
      { field: 'generalKnowledge', min: 1, max: 3 },
      { field: 'catBreedsShowing', min: 1, max: 3 },
      { field: 'catAnatomy', min: 1, max: 3 },
      { field: 'fourHKnowledge', min: 1, max: 3 }
    ];

    scoreValidations.forEach(({ field, min, max }) => {
      const value = (score as any)[field];
      if (value !== undefined && value !== null) {
        if (typeof value !== 'number' || value < min || value > max) {
          errors.push({
            field,
            message: `Score must be between ${min} and ${max}`,
            value,
            expectedRange: `${min}-${max}`
          });
        }
      }
    });

    // Comment length validations
    const commentFields = [
      'appearanceComments',
      'handlingComments',
      'demonstrationComments',
      'healthExaminationComments',
      'groomingCareComments',
      'knowledgeComments'
    ];

    commentFields.forEach(field => {
      const comment = (score as any)[field];
      if (comment && typeof comment === 'string' && comment.length > 500) {
        errors.push({
          field,
          message: 'Comment must be 500 characters or less',
          value: comment.length,
          expectedRange: '0-500'
        });
      }
    });

    return errors;
  }

  static calculateFitShowTotals(score: Partial<FitShowScore>): {
    appearanceTotal: number;
    handlingTotal: number;
    demonstrationTotal: number;
    healthExaminationTotal: number;
    groomingCareTotal: number;
    knowledgeTotal: number;
    totalScore: number;
  } {
    const safeGet = (field: string): number => {
      const value = (score as any)[field];
      return typeof value === 'number' ? value : 0;
    };

    const appearanceTotal = safeGet('attire') + safeGet('attentive') + safeGet('courteous');
    
    const handlingTotal = safeGet('controlEquipment') + safeGet('pickupCarrying');
    
    const demonstrationTotal = safeGet('showingHeadShape') + safeGet('showingBodyType') + 
                              safeGet('showingTail') + safeGet('showingCoatTexture');
    
    const healthExaminationTotal = safeGet('showingMouthTeethGums') + safeGet('conditionMouthTeethGums') +
                                  safeGet('showingNose') + safeGet('showingEyes') + safeGet('conditionNoseEyes') +
                                  safeGet('showingEars') + safeGet('earsClean') + safeGet('showingToenailsClaws') +
                                  safeGet('toenailsClipped');
    
    const groomingCareTotal = safeGet('showingBellyCoatCleanliness') + safeGet('coatCleanWellGroomed') + 
                             safeGet('catHealthCare');
    
    const knowledgeTotal = safeGet('generalKnowledge') + safeGet('catBreedsShowing') + 
                          safeGet('catAnatomy') + safeGet('fourHKnowledge');
    
    const totalScore = appearanceTotal + handlingTotal + demonstrationTotal + 
                      healthExaminationTotal + groomingCareTotal + knowledgeTotal;

    return {
      appearanceTotal,
      handlingTotal,
      demonstrationTotal,
      healthExaminationTotal,
      groomingCareTotal,
      knowledgeTotal,
      totalScore
    };
  }

  static formatErrorForUser(error: Error | FitShowNetworkError): string {
    if (this.isNetworkError(error)) {
      switch (error.code) {
        case 'NETWORK_ERROR':
          return 'Network connection error. Please check your internet connection and try again.';
        case 'TIMEOUT_ERROR':
          return 'The request timed out. Please try again.';
        case 'SERVER_ERROR':
          return 'Server error. Please try again in a few moments.';
        case 'MAX_RETRIES_EXCEEDED':
          return 'Unable to complete the operation after multiple attempts. Please try again later.';
        default:
          return error.message || 'An unexpected error occurred.';
      }
    }

    return error.message || 'An unexpected error occurred.';
  }

  static async handleAsyncOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: Partial<FitShowErrorContext>
  ): Promise<{ success: true; data: T } | { success: false; error: FitShowNetworkError }> {
    try {
      const data = await this.withRetry(operation, operationName, 3, 1000, context);
      return { success: true, data };
    } catch (error) {
      const networkError = this.isNetworkError(error) 
        ? error 
        : this.createNetworkError(
            (error as Error).message,
            operationName,
            'UNKNOWN_ERROR',
            0,
            error as Error
          );

      return { success: false, error: networkError };
    }
  }

  static detectConflictFields(
    localScore: Partial<FitShowScore>,
    serverScore: FitShowScore
  ): string[] {
    const conflictFields: string[] = [];
    
    const fieldsToCheck = [
      'attire', 'attentive', 'courteous', 'appearanceComments',
      'controlEquipment', 'pickupCarrying', 'handlingComments',
      'showingHeadShape', 'showingBodyType', 'showingTail', 'showingCoatTexture', 'demonstrationComments',
      'showingMouthTeethGums', 'conditionMouthTeethGums', 'showingNose', 'showingEyes',
      'conditionNoseEyes', 'showingEars', 'earsClean', 'showingToenailsClaws',
      'toenailsClipped', 'healthExaminationComments',
      'showingBellyCoatCleanliness', 'coatCleanWellGroomed', 'catHealthCare', 'groomingCareComments',
      'generalKnowledge', 'catBreedsShowing', 'catAnatomy', 'fourHKnowledge', 'knowledgeComments',
      'isFinalized'
    ];

    fieldsToCheck.forEach(field => {
      const localValue = (localScore as any)[field];
      const serverValue = (serverScore as any)[field];
      
      if (localValue !== undefined && localValue !== serverValue) {
        conflictFields.push(field);
      }
    });

    return conflictFields;
  }
}