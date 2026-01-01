import { AppSyncResolverEvent, Context } from 'aws-lambda';

export interface FitShowError {
  code: string;
  message: string;
  field?: string;
  value?: any;
  details?: Record<string, any>;
}

export class FitShowErrorHandler {
  static createError(code: string, message: string, field?: string, value?: any, details?: Record<string, any>): FitShowError {
    return {
      code,
      message,
      field,
      value,
      details
    };
  }

  static handleValidationError(field: string, value: any, expectedRange?: string): FitShowError {
    let message = `Invalid value for ${field}`;
    if (expectedRange) {
      message += `. Expected range: ${expectedRange}`;
    }
    
    return this.createError('INVALID_SCORE_RANGE', message, field, value, {
      expectedRange,
      receivedValue: value
    });
  }

  static handleMissingFieldError(field: string): FitShowError {
    return this.createError(
      'MISSING_REQUIRED_FIELD',
      `Required field '${field}' is missing`,
      field
    );
  }

  static handleUnauthorizedJudgeError(judgeId: string): FitShowError {
    return this.createError(
      'UNAUTHORIZED_JUDGE',
      'User lacks judge permissions for fit and show scoring',
      'judgeId',
      judgeId
    );
  }

  static handleCatNotFoundError(catId: string): FitShowError {
    return this.createError(
      'CAT_NOT_FOUND',
      `Cat with ID '${catId}' not found`,
      'catId',
      catId
    );
  }

  static handleScoreAlreadyFinalizedError(scoreId: string): FitShowError {
    return this.createError(
      'SCORE_ALREADY_FINALIZED',
      'Cannot modify finalized score without proper authorization',
      'scoreId',
      scoreId
    );
  }

  static handleCommentTooLongError(field: string, length: number, maxLength: number = 500): FitShowError {
    return this.createError(
      'COMMENT_TOO_LONG',
      `Comment exceeds maximum length of ${maxLength} characters`,
      field,
      length,
      { maxLength, actualLength: length }
    );
  }

  static handleConcurrentModificationError(scoreId: string, expectedVersion?: number, actualVersion?: number): FitShowError {
    return this.createError(
      'CONCURRENT_MODIFICATION',
      'Score was modified by another user. Please refresh and try again.',
      'scoreId',
      scoreId,
      { expectedVersion, actualVersion }
    );
  }

  static handleNetworkError(operation: string, retryCount?: number): FitShowError {
    return this.createError(
      'NETWORK_ERROR',
      `Network error during ${operation}`,
      'operation',
      operation,
      { retryCount }
    );
  }

  static handleDatabaseError(operation: string, originalError?: Error): FitShowError {
    return this.createError(
      'DATABASE_ERROR',
      `Database error during ${operation}`,
      'operation',
      operation,
      { originalError: originalError?.message }
    );
  }

  static handleUnknownError(originalError: Error): FitShowError {
    return this.createError(
      'UNKNOWN_ERROR',
      'An unexpected error occurred',
      undefined,
      undefined,
      { originalError: originalError.message, stack: originalError.stack }
    );
  }

  static formatErrorForResponse(error: FitShowError): any {
    return {
      errorType: error.code,
      errorMessage: error.message,
      errorInfo: {
        field: error.field,
        value: error.value,
        details: error.details
      }
    };
  }

  static async handleResolverError(
    event: AppSyncResolverEvent<any>,
    context: Context,
    error: Error | FitShowError
  ): Promise<any> {
    console.error('FitShow Resolver Error:', {
      operation: event.info.fieldName,
      arguments: event.arguments,
      error: error instanceof Error ? error.message : error.message,
      requestId: context.awsRequestId
    });

    if (error instanceof Error) {
      // Convert regular Error to FitShowError
      const fitShowError = this.handleUnknownError(error);
      return this.formatErrorForResponse(fitShowError);
    }

    return this.formatErrorForResponse(error);
  }

  static validateScoreRange(field: string, value: number, min: number, max: number): FitShowError | null {
    if (typeof value !== 'number' || value < min || value > max) {
      return this.handleValidationError(field, value, `${min}-${max}`);
    }
    return null;
  }

  static validateRequiredField(field: string, value: any): FitShowError | null {
    if (value === undefined || value === null || value === '') {
      return this.handleMissingFieldError(field);
    }
    return null;
  }

  static validateCommentLength(field: string, comment: string, maxLength: number = 500): FitShowError | null {
    if (comment && comment.length > maxLength) {
      return this.handleCommentTooLongError(field, comment.length, maxLength);
    }
    return null;
  }

  static validateAllFitShowScores(scores: any): FitShowError[] {
    const errors: FitShowError[] = [];

    // Appearance & Demeanor validation
    const attireError = this.validateScoreRange('attire', scores.attire, 1, 10);
    if (attireError) errors.push(attireError);

    const attentiveError = this.validateScoreRange('attentive', scores.attentive, 1, 5);
    if (attentiveError) errors.push(attentiveError);

    const courteousError = this.validateScoreRange('courteous', scores.courteous, 1, 5);
    if (courteousError) errors.push(courteousError);

    // Handling & Control validation
    const controlError = this.validateScoreRange('controlEquipment', scores.controlEquipment, 1, 10);
    if (controlError) errors.push(controlError);

    const pickupError = this.validateScoreRange('pickupCarrying', scores.pickupCarrying, 1, 4);
    if (pickupError) errors.push(pickupError);

    // Demonstration Skills validation
    const headError = this.validateScoreRange('showingHeadShape', scores.showingHeadShape, 1, 4);
    if (headError) errors.push(headError);

    const bodyError = this.validateScoreRange('showingBodyType', scores.showingBodyType, 1, 4);
    if (bodyError) errors.push(bodyError);

    const tailError = this.validateScoreRange('showingTail', scores.showingTail, 1, 4);
    if (tailError) errors.push(tailError);

    const coatError = this.validateScoreRange('showingCoatTexture', scores.showingCoatTexture, 1, 4);
    if (coatError) errors.push(coatError);

    // Health Examination validation
    const mouthShowError = this.validateScoreRange('showingMouthTeethGums', scores.showingMouthTeethGums, 1, 3);
    if (mouthShowError) errors.push(mouthShowError);

    const mouthCondError = this.validateScoreRange('conditionMouthTeethGums', scores.conditionMouthTeethGums, 1, 2);
    if (mouthCondError) errors.push(mouthCondError);

    const noseShowError = this.validateScoreRange('showingNose', scores.showingNose, 1, 2);
    if (noseShowError) errors.push(noseShowError);

    const eyesShowError = this.validateScoreRange('showingEyes', scores.showingEyes, 1, 2);
    if (eyesShowError) errors.push(eyesShowError);

    const noseEyesCondError = this.validateScoreRange('conditionNoseEyes', scores.conditionNoseEyes, 1, 2);
    if (noseEyesCondError) errors.push(noseEyesCondError);

    const earsShowError = this.validateScoreRange('showingEars', scores.showingEars, 1, 2);
    if (earsShowError) errors.push(earsShowError);

    const earsCleanError = this.validateScoreRange('earsClean', scores.earsClean, 1, 2);
    if (earsCleanError) errors.push(earsCleanError);

    const clawsShowError = this.validateScoreRange('showingToenailsClaws', scores.showingToenailsClaws, 1, 3);
    if (clawsShowError) errors.push(clawsShowError);

    const clawsClippedError = this.validateScoreRange('toenailsClipped', scores.toenailsClipped, 1, 6);
    if (clawsClippedError) errors.push(clawsClippedError);

    // Grooming & Care validation
    const bellyShowError = this.validateScoreRange('showingBellyCoatCleanliness', scores.showingBellyCoatCleanliness, 1, 3);
    if (bellyShowError) errors.push(bellyShowError);

    const coatGroomedError = this.validateScoreRange('coatCleanWellGroomed', scores.coatCleanWellGroomed, 1, 8);
    if (coatGroomedError) errors.push(coatGroomedError);

    const healthCareError = this.validateScoreRange('catHealthCare', scores.catHealthCare, 1, 3);
    if (healthCareError) errors.push(healthCareError);

    // Knowledge validation
    const generalKnowError = this.validateScoreRange('generalKnowledge', scores.generalKnowledge, 1, 3);
    if (generalKnowError) errors.push(generalKnowError);

    const breedsKnowError = this.validateScoreRange('catBreedsShowing', scores.catBreedsShowing, 1, 3);
    if (breedsKnowError) errors.push(breedsKnowError);

    const anatomyKnowError = this.validateScoreRange('catAnatomy', scores.catAnatomy, 1, 3);
    if (anatomyKnowError) errors.push(anatomyKnowError);

    const fourHKnowError = this.validateScoreRange('fourHKnowledge', scores.fourHKnowledge, 1, 3);
    if (fourHKnowError) errors.push(fourHKnowError);

    // Required field validation
    const catIdError = this.validateRequiredField('catId', scores.catId);
    if (catIdError) errors.push(catIdError);

    const judgeIdError = this.validateRequiredField('judgeId', scores.judgeId);
    if (judgeIdError) errors.push(judgeIdError);

    // Comment length validation
    if (scores.appearanceComments) {
      const appearanceCommentError = this.validateCommentLength('appearanceComments', scores.appearanceComments);
      if (appearanceCommentError) errors.push(appearanceCommentError);
    }

    if (scores.handlingComments) {
      const handlingCommentError = this.validateCommentLength('handlingComments', scores.handlingComments);
      if (handlingCommentError) errors.push(handlingCommentError);
    }

    if (scores.demonstrationComments) {
      const demonstrationCommentError = this.validateCommentLength('demonstrationComments', scores.demonstrationComments);
      if (demonstrationCommentError) errors.push(demonstrationCommentError);
    }

    if (scores.healthExaminationComments) {
      const healthCommentError = this.validateCommentLength('healthExaminationComments', scores.healthExaminationComments);
      if (healthCommentError) errors.push(healthCommentError);
    }

    if (scores.groomingCareComments) {
      const groomingCommentError = this.validateCommentLength('groomingCareComments', scores.groomingCareComments);
      if (groomingCommentError) errors.push(groomingCommentError);
    }

    if (scores.knowledgeComments) {
      const knowledgeCommentError = this.validateCommentLength('knowledgeComments', scores.knowledgeComments);
      if (knowledgeCommentError) errors.push(knowledgeCommentError);
    }

    return errors;
  }
}