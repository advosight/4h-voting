"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const fitShowScoreDataAccess_1 = require("./fitShowScoreDataAccess");
const roleValidation_1 = require("./roleValidation");
const errorHandler_1 = require("./errorHandler");
const client = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const fitShowScoreDataAccess = new fitShowScoreDataAccess_1.FitShowScoreDataAccess(process.env.TABLE_NAME);
/**
 * Validate fit and show score input values for all 25 scoring categories
 */
function validateFitShowScoreInput(input) {
    const scores = [
        // Appearance & Demeanor (20 points)
        { name: 'attire', value: input.attire, min: 1, max: 10 },
        { name: 'attentive', value: input.attentive, min: 1, max: 5 },
        { name: 'courteous', value: input.courteous, min: 1, max: 5 },
        // Handling & Control (14 points)
        { name: 'controlEquipment', value: input.controlEquipment, min: 1, max: 10 },
        { name: 'pickupCarrying', value: input.pickupCarrying, min: 1, max: 4 },
        // Demonstration Skills (16 points)
        { name: 'showingHeadShape', value: input.showingHeadShape, min: 1, max: 4 },
        { name: 'showingBodyType', value: input.showingBodyType, min: 1, max: 4 },
        { name: 'showingTail', value: input.showingTail, min: 1, max: 4 },
        { name: 'showingCoatTexture', value: input.showingCoatTexture, min: 1, max: 4 },
        // Health Examination (21 points)
        { name: 'showingMouthTeethGums', value: input.showingMouthTeethGums, min: 1, max: 3 },
        { name: 'conditionMouthTeethGums', value: input.conditionMouthTeethGums, min: 1, max: 2 },
        { name: 'showingNose', value: input.showingNose, min: 1, max: 2 },
        { name: 'showingEyes', value: input.showingEyes, min: 1, max: 2 },
        { name: 'conditionNoseEyes', value: input.conditionNoseEyes, min: 1, max: 2 },
        { name: 'showingEars', value: input.showingEars, min: 1, max: 2 },
        { name: 'earsClean', value: input.earsClean, min: 1, max: 2 },
        { name: 'showingToenailsClaws', value: input.showingToenailsClaws, min: 1, max: 3 },
        { name: 'toenailsClipped', value: input.toenailsClipped, min: 1, max: 6 },
        // Grooming & Care (14 points)
        { name: 'showingBellyCoatCleanliness', value: input.showingBellyCoatCleanliness, min: 1, max: 3 },
        { name: 'coatCleanWellGroomed', value: input.coatCleanWellGroomed, min: 1, max: 8 },
        { name: 'catHealthCare', value: input.catHealthCare, min: 1, max: 3 },
        // Knowledge (12 points)
        { name: 'generalKnowledge', value: input.generalKnowledge, min: 1, max: 3 },
        { name: 'catBreedsShowing', value: input.catBreedsShowing, min: 1, max: 3 },
        { name: 'catAnatomy', value: input.catAnatomy, min: 1, max: 3 },
        { name: 'fourHKnowledge', value: input.fourHKnowledge, min: 1, max: 3 },
    ];
    for (const score of scores) {
        if (score.value !== undefined) {
            if (typeof score.value !== 'number' || score.value < score.min || score.value > score.max) {
                throw new errorHandler_1.ValidationError(`${score.name} must be between ${score.min} and ${score.max}`, score.name, { value: score.value, min: score.min, max: score.max });
            }
        }
    }
    // Validate participant name
    if ('participantName' in input && input.participantName !== undefined) {
        if (!input.participantName || input.participantName.trim().length === 0) {
            throw new errorHandler_1.ValidationError('Participant name is required and cannot be empty', 'participantName');
        }
        if (input.participantName.length > 100) {
            throw new errorHandler_1.ValidationError('Participant name must be 100 characters or less', 'participantName', { length: input.participantName.length, maxLength: 100 });
        }
    }
    // Validate comment lengths
    const comments = [
        { name: 'appearanceComments', value: input.appearanceComments },
        { name: 'handlingComments', value: input.handlingComments },
        { name: 'demonstrationComments', value: input.demonstrationComments },
        { name: 'healthExaminationComments', value: input.healthExaminationComments },
        { name: 'groomingCareComments', value: input.groomingCareComments },
        { name: 'knowledgeComments', value: input.knowledgeComments },
    ];
    for (const comment of comments) {
        if (comment.value && comment.value.length > 500) {
            throw new errorHandler_1.ValidationError(`Comment must be 500 characters or less`, comment.name, { length: comment.value.length, maxLength: 500 });
        }
    }
}
const handler = async (event) => {
    const { fieldName } = event.info;
    try {
        switch (fieldName) {
            case 'createFitShowScore':
                return await createFitShowScore(event);
            case 'updateFitShowScore':
                return await updateFitShowScore(event);
            case 'getFitShowScore':
                return await getFitShowScore(event);
            case 'getFitShowScoresByCat':
                return await getFitShowScoresByCat(event);
            case 'getFitShowScoresByCage':
                return await getFitShowScoresByCage(event);
            case 'listAllFitShowScores':
                return await listAllFitShowScores(event);
            case 'getFitShowScoresByJudge':
                return await getFitShowScoresByJudge(event);
            case 'finalizeFitShowScore':
                return await finalizeFitShowScore(event);
            case 'getFitShowScoreAuditHistory':
                return await getFitShowScoreAuditHistory(event);
            default:
                throw new errorHandler_1.ValidationError(`Unknown field: ${fieldName}`);
        }
    }
    catch (error) {
        console.error(`Error in ${fieldName}:`, error);
        // Re-throw AppError instances to preserve error type and status
        if (error instanceof errorHandler_1.ValidationError ||
            error instanceof errorHandler_1.PermissionError ||
            error instanceof errorHandler_1.NotFoundError ||
            error instanceof errorHandler_1.ConflictError ||
            error instanceof errorHandler_1.SystemError) {
            throw error;
        }
        // Handle other errors
        const errorResponse = (0, errorHandler_1.handleError)(error);
        throw new errorHandler_1.SystemError(errorResponse.error.message, errorResponse.error.details);
    }
};
exports.handler = handler;
/**
 * Create a new fit and show score
 */
async function createFitShowScore(event) {
    const userContext = (0, roleValidation_1.getUserContext)(event);
    (0, roleValidation_1.requireAnyRole)(userContext, ['judge', 'admin']);
    const input = event.arguments.input;
    validateFitShowScoreInput(input);
    const judgeId = (0, roleValidation_1.getJudgeId)(userContext);
    if (!judgeId) {
        throw new errorHandler_1.ValidationError('Unable to determine judge ID from authentication context');
    }
    // Add judge information from authenticated user
    const judgeName = userContext?.claims?.['cognito:username'] ||
        userContext?.claims?.name ||
        userContext?.email ||
        userContext?.claims?.email ||
        'Unknown Judge';
    console.log('Creating fit and show score with judge info:', { judgeId, judgeName, userContext: userContext });
    const createInput = {
        ...input,
        judgeId,
        judgeName,
    };
    return await fitShowScoreDataAccess.createFitShowScoreWithAudit(createInput);
}
/**
 * Update an existing fit and show score
 */
async function updateFitShowScore(event) {
    const userContext = (0, roleValidation_1.getUserContext)(event);
    (0, roleValidation_1.requireAnyRole)(userContext, ['judge', 'admin']);
    const { id, input } = event.arguments;
    validateFitShowScoreInput(input);
    // Check if the score exists
    const existingScore = await fitShowScoreDataAccess.getFitShowScore(id);
    if (!existingScore) {
        throw new errorHandler_1.NotFoundError(`Fit and show score with ID ${id} not found`);
    }
    // Validate score access permissions
    (0, roleValidation_1.requireScoreAccess)(userContext, existingScore.judgeId);
    // Check if score is finalized and require admin role for modifications
    if (existingScore.isFinalized && userContext?.role !== 'admin') {
        throw new errorHandler_1.PermissionError('Cannot modify finalized fit and show scores. Admin access required.');
    }
    const updateInput = { ...input, id };
    const reason = input.modificationReason || 'Score updated by judge';
    return await fitShowScoreDataAccess.updateFitShowScoreWithAudit(updateInput, reason);
}
/**
 * Get a single fit and show score by ID
 */
async function getFitShowScore(event) {
    const userContext = (0, roleValidation_1.getUserContext)(event);
    (0, roleValidation_1.requireAnyRole)(userContext, ['judge', 'admin', 'participant']);
    const { id } = event.arguments;
    const score = await fitShowScoreDataAccess.getFitShowScore(id);
    if (!score) {
        return null;
    }
    // Check permissions: judges can see their own scores, admins can see all, participants can see finalized scores
    if (userContext?.role === 'participant') {
        if (!score.isFinalized) {
            throw new errorHandler_1.PermissionError('Fit and show score is not yet finalized and cannot be viewed by participants');
        }
    }
    else if (userContext?.role === 'judge') {
        (0, roleValidation_1.requireScoreAccess)(userContext, score.judgeId);
    }
    // Admin can see all scores
    return score;
}
/**
 * Get all fit and show scores for a specific cat
 */
async function getFitShowScoresByCat(event) {
    const userContext = (0, roleValidation_1.getUserContext)(event);
    (0, roleValidation_1.requireAnyRole)(userContext, ['judge', 'admin', 'participant']);
    const { catId } = event.arguments;
    const scores = await fitShowScoreDataAccess.getFitShowScoresByCat(catId);
    // Filter scores based on user role
    if (userContext?.role === 'admin') {
        // Admins can see all scores
        return { items: scores };
    }
    else if (userContext?.role === 'judge') {
        // Judges can only see their own scores
        const currentJudgeId = (0, roleValidation_1.getJudgeId)(userContext);
        const filteredScores = scores.filter(score => score.judgeId === currentJudgeId);
        return { items: filteredScores };
    }
    else {
        // Participants can only see finalized scores
        const finalizedScores = scores.filter(score => score.isFinalized);
        return { items: finalizedScores };
    }
}
/**
 * Get all fit and show scores for a specific cage number
 */
async function getFitShowScoresByCage(event) {
    const userContext = (0, roleValidation_1.getUserContext)(event);
    (0, roleValidation_1.requireAnyRole)(userContext, ['judge', 'admin', 'participant']);
    const { cageNumber } = event.arguments;
    // First find the cat by cage number, then get scores by cat
    // This would need to be implemented in the data access layer or handled here
    // For now, we'll throw an error indicating this needs implementation
    throw new errorHandler_1.ValidationError('getFitShowScoresByCage not yet implemented - use getFitShowScoresByCat instead');
}
/**
 * List all fit and show scores in the system
 */
async function listAllFitShowScores(event) {
    const userContext = (0, roleValidation_1.getUserContext)(event);
    (0, roleValidation_1.requireRole)(userContext, 'admin'); // Only admins can list all scores
    const scores = await fitShowScoreDataAccess.listFitShowScores();
    return { items: scores };
}
/**
 * Get all fit and show scores by a specific judge
 */
async function getFitShowScoresByJudge(event) {
    const userContext = (0, roleValidation_1.getUserContext)(event);
    (0, roleValidation_1.requireAnyRole)(userContext, ['judge', 'admin']);
    const { judgeId } = event.arguments;
    // Validate score access permissions
    (0, roleValidation_1.requireScoreAccess)(userContext, judgeId);
    const scores = await fitShowScoreDataAccess.getFitShowScoresByJudge(judgeId);
    return { items: scores };
}
/**
 * Finalize a fit and show score (prevent further modifications)
 */
async function finalizeFitShowScore(event) {
    const userContext = (0, roleValidation_1.getUserContext)(event);
    (0, roleValidation_1.requireAnyRole)(userContext, ['judge', 'admin']);
    const { id } = event.arguments;
    // Check if the score exists
    const existingScore = await fitShowScoreDataAccess.getFitShowScore(id);
    if (!existingScore) {
        throw new errorHandler_1.NotFoundError(`Fit and show score with ID ${id} not found`);
    }
    // Validate score access permissions
    (0, roleValidation_1.requireScoreAccess)(userContext, existingScore.judgeId);
    // Check if already finalized
    if (existingScore.isFinalized) {
        throw new errorHandler_1.ConflictError('Fit and show score is already finalized');
    }
    return await fitShowScoreDataAccess.finalizeFitShowScore(id, existingScore.judgeId);
}
/**
 * Get audit history for a fit and show score
 */
async function getFitShowScoreAuditHistory(event) {
    const userContext = (0, roleValidation_1.getUserContext)(event);
    (0, roleValidation_1.requireAnyRole)(userContext, ['judge', 'admin']);
    const { fitShowScoreId } = event.arguments;
    // Check if the score exists
    const score = await fitShowScoreDataAccess.getFitShowScore(fitShowScoreId);
    if (!score) {
        throw new errorHandler_1.NotFoundError(`Fit and show score with ID ${fitShowScoreId} not found`);
    }
    // Validate score access permissions
    (0, roleValidation_1.requireScoreAccess)(userContext, score.judgeId);
    const auditEntries = await fitShowScoreDataAccess.getFitShowScoreAuditHistory(fitShowScoreId);
    return { items: auditEntries };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZml0U2hvd1Njb3JlUmVzb2x2ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJmaXRTaG93U2NvcmVSZXNvbHZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSw4REFBMEQ7QUFDMUQsd0RBQStEO0FBQy9ELHFFQUFvSDtBQUNwSCxxREFPMEI7QUFDMUIsaURBT3dCO0FBRXhCLE1BQU0sTUFBTSxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUN0QyxNQUFNLFNBQVMsR0FBRyxxQ0FBc0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDdEQsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLCtDQUFzQixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVyxDQUFDLENBQUM7QUFFbkY7O0dBRUc7QUFDSCxTQUFTLHlCQUF5QixDQUFDLEtBQXdEO0lBQ3pGLE1BQU0sTUFBTSxHQUFHO1FBQ2Isb0NBQW9DO1FBQ3BDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUcsS0FBYSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7UUFDakUsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRyxLQUFhLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRTtRQUN0RSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFHLEtBQWEsQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFO1FBRXRFLGlDQUFpQztRQUNqQyxFQUFFLElBQUksRUFBRSxrQkFBa0IsRUFBRSxLQUFLLEVBQUcsS0FBYSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtRQUNyRixFQUFFLElBQUksRUFBRSxnQkFBZ0IsRUFB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QSwrQkFBYyxFQUFDLFdBQVcsRUFBRSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBRWhELE1BQU0sRUFBRSxjQUFjLEVBQUUsR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDO0lBRTNDLDRCQUE0QjtJQUM1QixNQUFNLEtBQUssR0FBRyxNQUFNLHNCQUFzQixDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUMzRSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDWCxNQUFNLElBQUksNEJBQWEsQ0FBQyw4QkFBOEIsY0FBYyxZQUFZLENBQUMsQ0FBQztJQUNwRixDQUFDO0lBRUQsb0NBQW9DO0lBQ3BDLElBQUEsbUNBQWtCLEVBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUUvQyxNQUFNLFlBQVksR0FBRyxNQUFNLHNCQUFzQixDQUFDLDJCQUEyQixDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQzlGLE9BQU8sRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLENBQUM7QUFDakMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcFN5bmNSZXNvbHZlckV2ZW50IH0gZnJvbSAnYXdzLWxhbWJkYSc7XG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XG5pbXBvcnQgeyBEeW5hbW9EQkRvY3VtZW50Q2xpZW50IH0gZnJvbSAnQGF3cy1zZGsvbGliLWR5bmFtb2RiJztcbmltcG9ydCB7IEZpdFNob3dTY29yZURhdGFBY2Nlc3MsIENyZWF0ZUZpdFNob3dTY29yZUlucHV0LCBVcGRhdGVGaXRTaG93U2NvcmVJbnB1dCB9IGZyb20gJy4vZml0U2hvd1Njb3JlRGF0YUFjY2Vzcyc7XG5pbXBvcnQgeyBcbiAgZ2V0VXNlckNvbnRleHQsIFxuICByZXF1aXJlQW55Um9sZSwgXG4gIHJlcXVpcmVSb2xlLCBcbiAgZ2V0SnVkZ2VJZCwgXG4gIHJlcXVpcmVTY29yZUFjY2VzcyxcbiAgVXNlckNvbnRleHQgXG59IGZyb20gJy4vcm9sZVZhbGlkYXRpb24nO1xuaW1wb3J0IHsgXG4gIGhhbmRsZUVycm9yLCBcbiAgVmFsaWRhdGlvbkVycm9yLCBcbiAgUGVybWlzc2lvbkVycm9yLCBcbiAgTm90Rm91bmRFcnJvcixcbiAgQ29uZmxpY3RFcnJvcixcbiAgU3lzdGVtRXJyb3IgXG59IGZyb20gJy4vZXJyb3JIYW5kbGVyJztcblxuY29uc3QgY2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHt9KTtcbmNvbnN0IGRvY0NsaWVudCA9IER5bmFtb0RCRG9jdW1lbnRDbGllbnQuZnJvbShjbGllbnQpO1xuY29uc3QgZml0U2hvd1Njb3JlRGF0YUFjY2VzcyA9IG5ldyBGaXRTaG93U2NvcmVEYXRhQWNjZXNzKHByb2Nlc3MuZW52LlRBQkxFX05BTUUhKTtcblxuLyoqXG4gKiBWYWxpZGF0ZSBmaXQgYW5kIHNob3cgc2NvcmUgaW5wdXQgdmFsdWVzIGZvciBhbGwgMjUgc2NvcmluZyBjYXRlZ29yaWVzXG4gKi9cbmZ1bmN0aW9uIHZhbGlkYXRlRml0U2hvd1Njb3JlSW5wdXQoaW5wdXQ6IENyZWF0ZUZpdFNob3dTY29yZUlucHV0IHwgVXBkYXRlRml0U2hvd1Njb3JlSW5wdXQpOiB2b2lkIHtcbiAgY29uc3Qgc2NvcmVzID0gW1xuICAgIC8vIEFwcGVhcmFuY2UgJiBEZW1lYW5vciAoMjAgcG9pbnRzKVxuICAgIHsgbmFtZTogJ2F0dGlyZScsIHZhbHVlOiAoaW5wdXQgYXMgYW55KS5hdHRpcmUsIG1pbjogMSwgbWF4OiAxMCB9LFxuICAgIHsgbmFtZTogJ2F0dGVudGl2ZScsIHZhbHVlOiAoaW5wdXQgYXMgYW55KS5hdHRlbnRpdmUsIG1pbjogMSwgbWF4OiA1IH0sXG4gICAgeyBuYW1lOiAnY291cnRlb3VzJywgdmFsdWU6IChpbnB1dCBhcyBhbnkpLmNvdXJ0ZW91cywgbWluOiAxLCBtYXg6IDUgfSxcbiAgICBcbiAgICAvLyBIYW5kbGluZyAmIENvbnRyb2wgKDE0IHBvaW50cylcbiAgICB7IG5hbWU6ICdjb250cm9sRXF1aXBtZW50JywgdmFsdWU6IChpbnB1dCBhcyBhbnkpLmNvbnRyb2xFcXVpcG1lbnQsIG1pbjogMSwgbWF4OiAxMCB9LFxuICAgIHsgbmFtZTogJ3BpY2t1cENhcnJ5aW5nJywgdmFsdWU6IChpbnB1dCBhcyBhbnkpLnBpY2t1cENhcnJ5aW5nLCBtaW46IDEsIG1heDogNCB9LFxuICAgIFxuICAgIC8vIERlbW9uc3RyYXRpb24gU2tpbGxzICgxNiBwb2ludHMpXG4gICAgeyBuYW1lOiAnc2hvd2luZ0hlYWRTaGFwZScsIHZhbHVlOiAoaW5wdXQgYXMgYW55KS5zaG93aW5nSGVhZFNoYXBlLCBtaW46IDEsIG1heDogNCB9LFxuICAgIHsgbmFtZTogJ3Nob3dpbmdCb2R5VHlwZScsIHZhbHVlOiAoaW5wdXQgYXMgYW55KS5zaG93aW5nQm9keVR5cGUsIG1pbjogMSwgbWF4OiA0IH0sXG4gICAgeyBuYW1lOiAnc2hvd2luZ1RhaWwnLCB2YWx1ZTogKGlucHV0IGFzIGFueSkuc2hvd2luZ1RhaWwsIG1pbjogMSwgbWF4OiA0IH0sXG4gICAgeyBuYW1lOiAnc2hvd2luZ0NvYXRUZXh0dXJlJywgdmFsdWU6IChpbnB1dCBhcyBhbnkpLnNob3dpbmdDb2F0VGV4dHVyZSwgbWluOiAxLCBtYXg6IDQgfSxcbiAgICBcbiAgICAvLyBIZWFsdGggRXhhbWluYXRpb24gKDIxIHBvaW50cylcbiAgICB7IG5hbWU6ICdzaG93aW5nTW91dGhUZWV0aEd1bXMnLCB2YWx1ZTogKGlucHV0IGFzIGFueSkuc2hvd2luZ01vdXRoVGVldGhHdW1zLCBtaW46IDEsIG1heDogMyB9LFxuICAgIHsgbmFtZTogJ2NvbmRpdGlvbk1vdXRoVGVldGhHdW1zJywgdmFsdWU6IChpbnB1dCBhcyBhbnkpLmNvbmRpdGlvbk1vdXRoVGVldGhHdW1zLCBtaW46IDEsIG1heDogMiB9LFxuICAgIHsgbmFtZTogJ3Nob3dpbmdOb3NlJywgdmFsdWU6IChpbnB1dCBhcyBhbnkpLnNob3dpbmdOb3NlLCBtaW46IDEsIG1heDogMiB9LFxuICAgIHsgbmFtZTogJ3Nob3dpbmdFeWVzJywgdmFsdWU6IChpbnB1dCBhcyBhbnkpLnNob3dpbmdFeWVzLCBtaW46IDEsIG1heDogMiB9LFxuICAgIHsgbmFtZTogJ2NvbmRpdGlvbk5vc2VFeWVzJywgdmFsdWU6IChpbnB1dCBhcyBhbnkpLmNvbmRpdGlvbk5vc2VFeWVzLCBtaW46IDEsIG1heDogMiB9LFxuICAgIHsgbmFtZTogJ3Nob3dpbmdFYXJzJywgdmFsdWU6IChpbnB1dCBhcyBhbnkpLnNob3dpbmdFYXJzLCBtaW46IDEsIG1heDogMiB9LFxuICAgIHsgbmFtZTogJ2VhcnNDbGVhbicsIHZhbHVlOiAoaW5wdXQgYXMgYW55KS5lYXJzQ2xlYW4sIG1pbjogMSwgbWF4OiAyIH0sXG4gICAgeyBuYW1lOiAnc2hvd2luZ1RvZW5haWxzQ2xhd3MnLCB2YWx1ZTogKGlucHV0IGFzIGFueSkuc2hvd2luZ1RvZW5haWxzQ2xhd3MsIG1pbjogMSwgbWF4OiAzIH0sXG4gICAgeyBuYW1lOiAndG9lbmFpbHNDbGlwcGVkJywgdmFsdWU6IChpbnB1dCBhcyBhbnkpLnRvZW5haWxzQ2xpcHBlZCwgbWluOiAxLCBtYXg6IDYgfSxcbiAgICBcbiAgICAvLyBHcm9vbWluZyAmIENhcmUgKDE0IHBvaW50cylcbiAgICB7IG5hbWU6ICdzaG93aW5nQmVsbHlDb2F0Q2xlYW5saW5lc3MnLCB2YWx1ZTogKGlucHV0IGFzIGFueSkuc2hvd2luZ0JlbGx5Q29hdENsZWFubGluZXNzLCBtaW46IDEsIG1heDogMyB9LFxuICAgIHsgbmFtZTogJ2NvYXRDbGVhbldlbGxHcm9vbWVkJywgdmFsdWU6IChpbnB1dCBhcyBhbnkpLmNvYXRDbGVhbldlbGxHcm9vbWVkLCBtaW46IDEsIG1heDogOCB9LFxuICAgIHsgbmFtZTogJ2NhdEhlYWx0aENhcmUnLCB2YWx1ZTogKGlucHV0IGFzIGFueSkuY2F0SGVhbHRoQ2FyZSwgbWluOiAxLCBtYXg6IDMgfSxcbiAgICBcbiAgICAvLyBLbm93bGVkZ2UgKDEyIHBvaW50cylcbiAgICB7IG5hbWU6ICdnZW5lcmFsS25vd2xlZGdlJywgdmFsdWU6IChpbnB1dCBhcyBhbnkpLmdlbmVyYWxLbm93bGVkZ2UsIG1pbjogMSwgbWF4OiAzIH0sXG4gICAgeyBuYW1lOiAnY2F0QnJlZWRzU2hvd2luZycsIHZhbHVlOiAoaW5wdXQgYXMgYW55KS5jYXRCcmVlZHNTaG93aW5nLCBtaW46IDEsIG1heDogMyB9LFxuICAgIHsgbmFtZTogJ2NhdEFuYXRvbXknLCB2YWx1ZTogKGlucHV0IGFzIGFueSkuY2F0QW5hdG9teSwgbWluOiAxLCBtYXg6IDMgfSxcbiAgICB7IG5hbWU6ICdmb3VySEtub3dsZWRnZScsIHZhbHVlOiAoaW5wdXQgYXMgYW55KS5mb3VySEtub3dsZWRnZSwgbWluOiAxLCBtYXg6IDMgfSxcbiAgXTtcblxuICBmb3IgKGNvbnN0IHNjb3JlIG9mIHNjb3Jlcykge1xuICAgIGlmIChzY29yZS52YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAodHlwZW9mIHNjb3JlLnZhbHVlICE9PSAnbnVtYmVyJyB8fCBzY29yZS52YWx1ZSA8IHNjb3JlLm1pbiB8fCBzY29yZS52YWx1ZSA+IHNjb3JlLm1heCkge1xuICAgICAgICB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFxuICAgICAgICAgIGAke3Njb3JlLm5hbWV9IG11c3QgYmUgYmV0d2VlbiAke3Njb3JlLm1pbn0gYW5kICR7c2NvcmUubWF4fWAsXG4gICAgICAgICAgc2NvcmUubmFtZSxcbiAgICAgICAgICB7IHZhbHVlOiBzY29yZS52YWx1ZSwgbWluOiBzY29yZS5taW4sIG1heDogc2NvcmUubWF4IH1cbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBWYWxpZGF0ZSBwYXJ0aWNpcGFudCBuYW1lXG4gIGlmICgncGFydGljaXBhbnROYW1lJyBpbiBpbnB1dCAmJiBpbnB1dC5wYXJ0aWNpcGFudE5hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgIGlmICghaW5wdXQucGFydGljaXBhbnROYW1lIHx8IGlucHV0LnBhcnRpY2lwYW50TmFtZS50cmltKCkubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKCdQYXJ0aWNpcGFudCBuYW1lIGlzIHJlcXVpcmVkIGFuZCBjYW5ub3QgYmUgZW1wdHknLCAncGFydGljaXBhbnROYW1lJyk7XG4gICAgfVxuICAgIGlmIChpbnB1dC5wYXJ0aWNpcGFudE5hbWUubGVuZ3RoID4gMTAwKSB7XG4gICAgICB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKCdQYXJ0aWNpcGFudCBuYW1lIG11c3QgYmUgMTAwIGNoYXJhY3RlcnMgb3IgbGVzcycsICdwYXJ0aWNpcGFudE5hbWUnLCBcbiAgICAgICAgeyBsZW5ndGg6IGlucHV0LnBhcnRpY2lwYW50TmFtZS5sZW5ndGgsIG1heExlbmd0aDogMTAwIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIFZhbGlkYXRlIGNvbW1lbnQgbGVuZ3Roc1xuICBjb25zdCBjb21tZW50cyA9IFtcbiAgICB7IG5hbWU6ICdhcHBlYXJhbmNlQ29tbWVudHMnLCB2YWx1ZTogKGlucHV0IGFzIGFueSkuYXBwZWFyYW5jZUNvbW1lbnRzIH0sXG4gICAgeyBuYW1lOiAnaGFuZGxpbmdDb21tZW50cycsIHZhbHVlOiAoaW5wdXQgYXMgYW55KS5oYW5kbGluZ0NvbW1lbnRzIH0sXG4gICAgeyBuYW1lOiAnZGVtb25zdHJhdGlvbkNvbW1lbnRzJywgdmFsdWU6IChpbnB1dCBhcyBhbnkpLmRlbW9uc3RyYXRpb25Db21tZW50cyB9LFxuICAgIHsgbmFtZTogJ2hlYWx0aEV4YW1pbmF0aW9uQ29tbWVudHMnLCB2YWx1ZTogKGlucHV0IGFzIGFueSkuaGVhbHRoRXhhbWluYXRpb25Db21tZW50cyB9LFxuICAgIHsgbmFtZTogJ2dyb29taW5nQ2FyZUNvbW1lbnRzJywgdmFsdWU6IChpbnB1dCBhcyBhbnkpLmdyb29taW5nQ2FyZUNvbW1lbnRzIH0sXG4gICAgeyBuYW1lOiAna25vd2xlZGdlQ29tbWVudHMnLCB2YWx1ZTogKGlucHV0IGFzIGFueSkua25vd2xlZGdlQ29tbWVudHMgfSxcbiAgXTtcblxuICBmb3IgKGNvbnN0IGNvbW1lbnQgb2YgY29tbWVudHMpIHtcbiAgICBpZiAoY29tbWVudC52YWx1ZSAmJiBjb21tZW50LnZhbHVlLmxlbmd0aCA+IDUwMCkge1xuICAgICAgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihcbiAgICAgICAgYENvbW1lbnQgbXVzdCBiZSA1MDAgY2hhcmFjdGVycyBvciBsZXNzYCxcbiAgICAgICAgY29tbWVudC5uYW1lLFxuICAgICAgICB7IGxlbmd0aDogY29tbWVudC52YWx1ZS5sZW5ndGgsIG1heExlbmd0aDogNTAwIH1cbiAgICAgICk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBBcHBTeW5jUmVzb2x2ZXJFdmVudDxhbnk+KSA9PiB7XG4gIGNvbnN0IHsgZmllbGROYW1lIH0gPSBldmVudC5pbmZvO1xuXG4gIHRyeSB7XG4gICAgc3dpdGNoIChmaWVsZE5hbWUpIHtcbiAgICAgIGNhc2UgJ2NyZWF0ZUZpdFNob3dTY29yZSc6XG4gICAgICAgIHJldHVybiBhd2FpdCBjcmVhdGVGaXRTaG93U2NvcmUoZXZlbnQpO1xuICAgICAgY2FzZSAndXBkYXRlRml0U2hvd1Njb3JlJzpcbiAgICAgICAgcmV0dXJuIGF3YWl0IHVwZGF0ZUZpdFNob3dTY29yZShldmVudCk7XG4gICAgICBjYXNlICdnZXRGaXRTaG93U2NvcmUnOlxuICAgICAgICByZXR1cm4gYXdhaXQgZ2V0Rml0U2hvd1Njb3JlKGV2ZW50KTtcbiAgICAgIGNhc2UgJ2dldEZpdFNob3dTY29yZXNCeUNhdCc6XG4gICAgICAgIHJldHVybiBhd2FpdCBnZXRGaXRTaG93U2NvcmVzQnlDYXQoZXZlbnQpO1xuICAgICAgY2FzZSAnZ2V0Rml0U2hvd1Njb3Jlc0J5Q2FnZSc6XG4gICAgICAgIHJldHVybiBhd2FpdCBnZXRGaXRTaG93U2NvcmVzQnlDYWdlKGV2ZW50KTtcbiAgICAgIGNhc2UgJ2xpc3RBbGxGaXRTaG93U2NvcmVzJzpcbiAgICAgICAgcmV0dXJuIGF3YWl0IGxpc3RBbGxGaXRTaG93U2NvcmVzKGV2ZW50KTtcbiAgICAgIGNhc2UgJ2dldEZpdFNob3dTY29yZXNCeUp1ZGdlJzpcbiAgICAgICAgcmV0dXJuIGF3YWl0IGdldEZpdFNob3dTY29yZXNCeUp1ZGdlKGV2ZW50KTtcbiAgICAgIGNhc2UgJ2ZpbmFsaXplRml0U2hvd1Njb3JlJzpcbiAgICAgICAgcmV0dXJuIGF3YWl0IGZpbmFsaXplRml0U2hvd1Njb3JlKGV2ZW50KTtcbiAgICAgIGNhc2UgJ2dldEZpdFNob3dTY29yZUF1ZGl0SGlzdG9yeSc6XG4gICAgICAgIHJldHVybiBhd2FpdCBnZXRGaXRTaG93U2NvcmVBdWRpdEhpc3RvcnkoZXZlbnQpO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihgVW5rbm93biBmaWVsZDogJHtmaWVsZE5hbWV9YCk7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGluICR7ZmllbGROYW1lfTpgLCBlcnJvcik7XG4gICAgXG4gICAgLy8gUmUtdGhyb3cgQXBwRXJyb3IgaW5zdGFuY2VzIHRvIHByZXNlcnZlIGVycm9yIHR5cGUgYW5kIHN0YXR1c1xuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIFZhbGlkYXRpb25FcnJvciB8fCBcbiAgICAgICAgZXJyb3IgaW5zdGFuY2VvZiBQZXJtaXNzaW9uRXJyb3IgfHwgXG4gICAgICAgIGVycm9yIGluc3RhbmNlb2YgTm90Rm91bmRFcnJvciB8fCBcbiAgICAgICAgZXJyb3IgaW5zdGFuY2VvZiBDb25mbGljdEVycm9yIHx8IFxuICAgICAgICBlcnJvciBpbnN0YW5jZW9mIFN5c3RlbUVycm9yKSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gICAgXG4gICAgLy8gSGFuZGxlIG90aGVyIGVycm9yc1xuICAgIGNvbnN0IGVycm9yUmVzcG9uc2UgPSBoYW5kbGVFcnJvcihlcnJvcik7XG4gICAgdGhyb3cgbmV3IFN5c3RlbUVycm9yKGVycm9yUmVzcG9uc2UuZXJyb3IubWVzc2FnZSwgZXJyb3JSZXNwb25zZS5lcnJvci5kZXRhaWxzKTtcbiAgfVxufTtcblxuLyoqXG4gKiBDcmVhdGUgYSBuZXcgZml0IGFuZCBzaG93IHNjb3JlXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGNyZWF0ZUZpdFNob3dTY29yZShldmVudDogQXBwU3luY1Jlc29sdmVyRXZlbnQ8eyBpbnB1dDogQ3JlYXRlRml0U2hvd1Njb3JlSW5wdXQgfT4pIHtcbiAgY29uc3QgdXNlckNvbnRleHQgPSBnZXRVc2VyQ29udGV4dChldmVudCk7XG4gIHJlcXVpcmVBbnlSb2xlKHVzZXJDb250ZXh0LCBbJ2p1ZGdlJywgJ2FkbWluJ10pO1xuXG4gIGNvbnN0IGlucHV0ID0gZXZlbnQuYXJndW1lbnRzLmlucHV0O1xuICB2YWxpZGF0ZUZpdFNob3dTY29yZUlucHV0KGlucHV0KTtcblxuICBjb25zdCBqdWRnZUlkID0gZ2V0SnVkZ2VJZCh1c2VyQ29udGV4dCk7XG4gIGlmICghanVkZ2VJZCkge1xuICAgIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoJ1VuYWJsZSB0byBkZXRlcm1pbmUganVkZ2UgSUQgZnJvbSBhdXRoZW50aWNhdGlvbiBjb250ZXh0Jyk7XG4gIH1cblxuICAvLyBBZGQganVkZ2UgaW5mb3JtYXRpb24gZnJvbSBhdXRoZW50aWNhdGVkIHVzZXJcbiAgY29uc3QganVkZ2VOYW1lID0gdXNlckNvbnRleHQ/LmNsYWltcz8uWydjb2duaXRvOnVzZXJuYW1lJ10gfHxcbiAgICAgICAgICAgICAgICAgICB1c2VyQ29udGV4dD8uY2xhaW1zPy5uYW1lIHx8XG4gICAgICAgICAgICAgICAgICAgdXNlckNvbnRleHQ/LmVtYWlsIHx8IFxuICAgICAgICAgICAgICAgICAgIHVzZXJDb250ZXh0Py5jbGFpbXM/LmVtYWlsIHx8IFxuICAgICAgICAgICAgICAgICAgICdVbmtub3duIEp1ZGdlJztcbiAgXG4gIGNvbnNvbGUubG9nKCdDcmVhdGluZyBmaXQgYW5kIHNob3cgc2NvcmUgd2l0aCBqdWRnZSBpbmZvOicsIHsganVkZ2VJZCwganVkZ2VOYW1lLCB1c2VyQ29udGV4dDogdXNlckNvbnRleHQgfSk7XG4gIFxuICBjb25zdCBjcmVhdGVJbnB1dDogQ3JlYXRlRml0U2hvd1Njb3JlSW5wdXQgPSB7XG4gICAgLi4uaW5wdXQsXG4gICAganVkZ2VJZCxcbiAgICBqdWRnZU5hbWUsXG4gIH07XG5cbiAgcmV0dXJuIGF3YWl0IGZpdFNob3dTY29yZURhdGFBY2Nlc3MuY3JlYXRlRml0U2hvd1Njb3JlV2l0aEF1ZGl0KGNyZWF0ZUlucHV0KTtcbn1cblxuLyoqXG4gKiBVcGRhdGUgYW4gZXhpc3RpbmcgZml0IGFuZCBzaG93IHNjb3JlXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHVwZGF0ZUZpdFNob3dTY29yZShldmVudDogQXBwU3luY1Jlc29sdmVyRXZlbnQ8eyBpZDogc3RyaW5nOyBpbnB1dDogVXBkYXRlRml0U2hvd1Njb3JlSW5wdXQgfT4pIHtcbiAgY29uc3QgdXNlckNvbnRleHQgPSBnZXRVc2VyQ29udGV4dChldmVudCk7XG4gIHJlcXVpcmVBbnlSb2xlKHVzZXJDb250ZXh0LCBbJ2p1ZGdlJywgJ2FkbWluJ10pO1xuXG4gIGNvbnN0IHsgaWQsIGlucHV0IH0gPSBldmVudC5hcmd1bWVudHM7XG4gIHZhbGlkYXRlRml0U2hvd1Njb3JlSW5wdXQoaW5wdXQpO1xuXG4gIC8vIENoZWNrIGlmIHRoZSBzY29yZSBleGlzdHNcbiAgY29uc3QgZXhpc3RpbmdTY29yZSA9IGF3YWl0IGZpdFNob3dTY29yZURhdGFBY2Nlc3MuZ2V0Rml0U2hvd1Njb3JlKGlkKTtcbiAgaWYgKCFleGlzdGluZ1Njb3JlKSB7XG4gICAgdGhyb3cgbmV3IE5vdEZvdW5kRXJyb3IoYEZpdCBhbmQgc2hvdyBzY29yZSB3aXRoIElEICR7aWR9IG5vdCBmb3VuZGApO1xuICB9XG5cbiAgLy8gVmFsaWRhdGUgc2NvcmUgYWNjZXNzIHBlcm1pc3Npb25zXG4gIHJlcXVpcmVTY29yZUFjY2Vzcyh1c2VyQ29udGV4dCwgZXhpc3RpbmdTY29yZS5qdWRnZUlkKTtcblxuICAvLyBDaGVjayBpZiBzY29yZSBpcyBmaW5hbGl6ZWQgYW5kIHJlcXVpcmUgYWRtaW4gcm9sZSBmb3IgbW9kaWZpY2F0aW9uc1xuICBpZiAoZXhpc3RpbmdTY29yZS5pc0ZpbmFsaXplZCAmJiB1c2VyQ29udGV4dD8ucm9sZSAhPT0gJ2FkbWluJykge1xuICAgIHRocm93IG5ldyBQZXJtaXNzaW9uRXJyb3IoJ0Nhbm5vdCBtb2RpZnkgZmluYWxpemVkIGZpdCBhbmQgc2hvdyBzY29yZXMuIEFkbWluIGFjY2VzcyByZXF1aXJlZC4nKTtcbiAgfVxuXG4gIGNvbnN0IHVwZGF0ZUlucHV0ID0geyAuLi5pbnB1dCwgaWQgfTtcbiAgY29uc3QgcmVhc29uID0gaW5wdXQubW9kaWZpY2F0aW9uUmVhc29uIHx8ICdTY29yZSB1cGRhdGVkIGJ5IGp1ZGdlJztcbiAgcmV0dXJuIGF3YWl0IGZpdFNob3dTY29yZURhdGFBY2Nlc3MudXBkYXRlRml0U2hvd1Njb3JlV2l0aEF1ZGl0KHVwZGF0ZUlucHV0LCByZWFzb24pO1xufVxuXG4vKipcbiAqIEdldCBhIHNpbmdsZSBmaXQgYW5kIHNob3cgc2NvcmUgYnkgSURcbiAqL1xuYXN5bmMgZnVuY3Rpb24gZ2V0Rml0U2hvd1Njb3JlKGV2ZW50OiBBcHBTeW5jUmVzb2x2ZXJFdmVudDx7IGlkOiBzdHJpbmcgfT4pIHtcbiAgY29uc3QgdXNlckNvbnRleHQgPSBnZXRVc2VyQ29udGV4dChldmVudCk7XG4gIHJlcXVpcmVBbnlSb2xlKHVzZXJDb250ZXh0LCBbJ2p1ZGdlJywgJ2FkbWluJywgJ3BhcnRpY2lwYW50J10pO1xuXG4gIGNvbnN0IHsgaWQgfSA9IGV2ZW50LmFyZ3VtZW50cztcblxuICBjb25zdCBzY29yZSA9IGF3YWl0IGZpdFNob3dTY29yZURhdGFBY2Nlc3MuZ2V0Rml0U2hvd1Njb3JlKGlkKTtcbiAgaWYgKCFzY29yZSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gQ2hlY2sgcGVybWlzc2lvbnM6IGp1ZGdlcyBjYW4gc2VlIHRoZWlyIG93biBzY29yZXMsIGFkbWlucyBjYW4gc2VlIGFsbCwgcGFydGljaXBhbnRzIGNhbiBzZWUgZmluYWxpemVkIHNjb3Jlc1xuICBpZiAodXNlckNvbnRleHQ/LnJvbGUgPT09ICdwYXJ0aWNpcGFudCcpIHtcbiAgICBpZiAoIXNjb3JlLmlzRmluYWxpemVkKSB7XG4gICAgICB0aHJvdyBuZXcgUGVybWlzc2lvbkVycm9yKCdGaXQgYW5kIHNob3cgc2NvcmUgaXMgbm90IHlldCBmaW5hbGl6ZWQgYW5kIGNhbm5vdCBiZSB2aWV3ZWQgYnkgcGFydGljaXBhbnRzJyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKHVzZXJDb250ZXh0Py5yb2xlID09PSAnanVkZ2UnKSB7XG4gICAgcmVxdWlyZVNjb3JlQWNjZXNzKHVzZXJDb250ZXh0LCBzY29yZS5qdWRnZUlkKTtcbiAgfVxuICAvLyBBZG1pbiBjYW4gc2VlIGFsbCBzY29yZXNcblxuICByZXR1cm4gc2NvcmU7XG59XG5cbi8qKlxuICogR2V0IGFsbCBmaXQgYW5kIHNob3cgc2NvcmVzIGZvciBhIHNwZWNpZmljIGNhdFxuICovXG5hc3luYyBmdW5jdGlvbiBnZXRGaXRTaG93U2NvcmVzQnlDYXQoZXZlbnQ6IEFwcFN5bmNSZXNvbHZlckV2ZW50PHsgY2F0SWQ6IHN0cmluZyB9Pikge1xuICBjb25zdCB1c2VyQ29udGV4dCA9IGdldFVzZXJDb250ZXh0KGV2ZW50KTtcbiAgcmVxdWlyZUFueVJvbGUodXNlckNvbnRleHQsIFsnanVkZ2UnLCAnYWRtaW4nLCAncGFydGljaXBhbnQnXSk7XG5cbiAgY29uc3QgeyBjYXRJZCB9ID0gZXZlbnQuYXJndW1lbnRzO1xuXG4gIGNvbnN0IHNjb3JlcyA9IGF3YWl0IGZpdFNob3dTY29yZURhdGFBY2Nlc3MuZ2V0Rml0U2hvd1Njb3Jlc0J5Q2F0KGNhdElkKTtcblxuICAvLyBGaWx0ZXIgc2NvcmVzIGJhc2VkIG9uIHVzZXIgcm9sZVxuICBpZiAodXNlckNvbnRleHQ/LnJvbGUgPT09ICdhZG1pbicpIHtcbiAgICAvLyBBZG1pbnMgY2FuIHNlZSBhbGwgc2NvcmVzXG4gICAgcmV0dXJuIHsgaXRlbXM6IHNjb3JlcyB9O1xuICB9IGVsc2UgaWYgKHVzZXJDb250ZXh0Py5yb2xlID09PSAnanVkZ2UnKSB7XG4gICAgLy8gSnVkZ2VzIGNhbiBvbmx5IHNlZSB0aGVpciBvd24gc2NvcmVzXG4gICAgY29uc3QgY3VycmVudEp1ZGdlSWQgPSBnZXRKdWRnZUlkKHVzZXJDb250ZXh0KTtcbiAgICBjb25zdCBmaWx0ZXJlZFNjb3JlcyA9IHNjb3Jlcy5maWx0ZXIoc2NvcmUgPT4gc2NvcmUuanVkZ2VJZCA9PT0gY3VycmVudEp1ZGdlSWQpO1xuICAgIHJldHVybiB7IGl0ZW1zOiBmaWx0ZXJlZFNjb3JlcyB9O1xuICB9IGVsc2Uge1xuICAgIC8vIFBhcnRpY2lwYW50cyBjYW4gb25seSBzZWUgZmluYWxpemVkIHNjb3Jlc1xuICAgIGNvbnN0IGZpbmFsaXplZFNjb3JlcyA9IHNjb3Jlcy5maWx0ZXIoc2NvcmUgPT4gc2NvcmUuaXNGaW5hbGl6ZWQpO1xuICAgIHJldHVybiB7IGl0ZW1zOiBmaW5hbGl6ZWRTY29yZXMgfTtcbiAgfVxufVxuXG4vKipcbiAqIEdldCBhbGwgZml0IGFuZCBzaG93IHNjb3JlcyBmb3IgYSBzcGVjaWZpYyBjYWdlIG51bWJlclxuICovXG5hc3luYyBmdW5jdGlvbiBnZXRGaXRTaG93U2NvcmVzQnlDYWdlKGV2ZW50OiBBcHBTeW5jUmVzb2x2ZXJFdmVudDx7IGNhZ2VOdW1iZXI6IG51bWJlciB9Pikge1xuICBjb25zdCB1c2VyQ29udGV4dCA9IGdldFVzZXJDb250ZXh0KGV2ZW50KTtcbiAgcmVxdWlyZUFueVJvbGUodXNlckNvbnRleHQsIFsnanVkZ2UnLCAnYWRtaW4nLCAncGFydGljaXBhbnQnXSk7XG5cbiAgY29uc3QgeyBjYWdlTnVtYmVyIH0gPSBldmVudC5hcmd1bWVudHM7XG5cbiAgLy8gRmlyc3QgZmluZCB0aGUgY2F0IGJ5IGNhZ2UgbnVtYmVyLCB0aGVuIGdldCBzY29yZXMgYnkgY2F0XG4gIC8vIFRoaXMgd291bGQgbmVlZCB0byBiZSBpbXBsZW1lbnRlZCBpbiB0aGUgZGF0YSBhY2Nlc3MgbGF5ZXIgb3IgaGFuZGxlZCBoZXJlXG4gIC8vIEZvciBub3csIHdlJ2xsIHRocm93IGFuIGVycm9yIGluZGljYXRpbmcgdGhpcyBuZWVkcyBpbXBsZW1lbnRhdGlvblxuICB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKCdnZXRGaXRTaG93U2NvcmVzQnlDYWdlIG5vdCB5ZXQgaW1wbGVtZW50ZWQgLSB1c2UgZ2V0Rml0U2hvd1Njb3Jlc0J5Q2F0IGluc3RlYWQnKTtcbn1cblxuLyoqXG4gKiBMaXN0IGFsbCBmaXQgYW5kIHNob3cgc2NvcmVzIGluIHRoZSBzeXN0ZW1cbiAqL1xuYXN5bmMgZnVuY3Rpb24gbGlzdEFsbEZpdFNob3dTY29yZXMoZXZlbnQ6IEFwcFN5bmNSZXNvbHZlckV2ZW50PHt9Pikge1xuICBjb25zdCB1c2VyQ29udGV4dCA9IGdldFVzZXJDb250ZXh0KGV2ZW50KTtcbiAgcmVxdWlyZVJvbGUodXNlckNvbnRleHQsICdhZG1pbicpOyAvLyBPbmx5IGFkbWlucyBjYW4gbGlzdCBhbGwgc2NvcmVzXG5cbiAgY29uc3Qgc2NvcmVzID0gYXdhaXQgZml0U2hvd1Njb3JlRGF0YUFjY2Vzcy5saXN0Rml0U2hvd1Njb3JlcygpO1xuICByZXR1cm4geyBpdGVtczogc2NvcmVzIH07XG59XG5cbi8qKlxuICogR2V0IGFsbCBmaXQgYW5kIHNob3cgc2NvcmVzIGJ5IGEgc3BlY2lmaWMganVkZ2VcbiAqL1xuYXN5bmMgZnVuY3Rpb24gZ2V0Rml0U2hvd1Njb3Jlc0J5SnVkZ2UoZXZlbnQ6IEFwcFN5bmNSZXNvbHZlckV2ZW50PHsganVkZ2VJZDogc3RyaW5nIH0+KSB7XG4gIGNvbnN0IHVzZXJDb250ZXh0ID0gZ2V0VXNlckNvbnRleHQoZXZlbnQpO1xuICByZXF1aXJlQW55Um9sZSh1c2VyQ29udGV4dCwgWydqdWRnZScsICdhZG1pbiddKTtcblxuICBjb25zdCB7IGp1ZGdlSWQgfSA9IGV2ZW50LmFyZ3VtZW50cztcblxuICAvLyBWYWxpZGF0ZSBzY29yZSBhY2Nlc3MgcGVybWlzc2lvbnNcbiAgcmVxdWlyZVNjb3JlQWNjZXNzKHVzZXJDb250ZXh0LCBqdWRnZUlkKTtcblxuICBjb25zdCBzY29yZXMgPSBhd2FpdCBmaXRTaG93U2NvcmVEYXRhQWNjZXNzLmdldEZpdFNob3dTY29yZXNCeUp1ZGdlKGp1ZGdlSWQpO1xuICByZXR1cm4geyBpdGVtczogc2NvcmVzIH07XG59XG5cbi8qKlxuICogRmluYWxpemUgYSBmaXQgYW5kIHNob3cgc2NvcmUgKHByZXZlbnQgZnVydGhlciBtb2RpZmljYXRpb25zKVxuICovXG5hc3luYyBmdW5jdGlvbiBmaW5hbGl6ZUZpdFNob3dTY29yZShldmVudDogQXBwU3luY1Jlc29sdmVyRXZlbnQ8eyBpZDogc3RyaW5nIH0+KSB7XG4gIGNvbnN0IHVzZXJDb250ZXh0ID0gZ2V0VXNlckNvbnRleHQoZXZlbnQpO1xuICByZXF1aXJlQW55Um9sZSh1c2VyQ29udGV4dCwgWydqdWRnZScsICdhZG1pbiddKTtcblxuICBjb25zdCB7IGlkIH0gPSBldmVudC5hcmd1bWVudHM7XG5cbiAgLy8gQ2hlY2sgaWYgdGhlIHNjb3JlIGV4aXN0c1xuICBjb25zdCBleGlzdGluZ1Njb3JlID0gYXdhaXQgZml0U2hvd1Njb3JlRGF0YUFjY2Vzcy5nZXRGaXRTaG93U2NvcmUoaWQpO1xuICBpZiAoIWV4aXN0aW5nU2NvcmUpIHtcbiAgICB0aHJvdyBuZXcgTm90Rm91bmRFcnJvcihgRml0IGFuZCBzaG93IHNjb3JlIHdpdGggSUQgJHtpZH0gbm90IGZvdW5kYCk7XG4gIH1cblxuICAvLyBWYWxpZGF0ZSBzY29yZSBhY2Nlc3MgcGVybWlzc2lvbnNcbiAgcmVxdWlyZVNjb3JlQWNjZXNzKHVzZXJDb250ZXh0LCBleGlzdGluZ1Njb3JlLmp1ZGdlSWQpO1xuXG4gIC8vIENoZWNrIGlmIGFscmVhZHkgZmluYWxpemVkXG4gIGlmIChleGlzdGluZ1Njb3JlLmlzRmluYWxpemVkKSB7XG4gICAgdGhyb3cgbmV3IENvbmZsaWN0RXJyb3IoJ0ZpdCBhbmQgc2hvdyBzY29yZSBpcyBhbHJlYWR5IGZpbmFsaXplZCcpO1xuICB9XG5cbiAgcmV0dXJuIGF3YWl0IGZpdFNob3dTY29yZURhdGFBY2Nlc3MuZmluYWxpemVGaXRTaG93U2NvcmUoaWQsIGV4aXN0aW5nU2NvcmUuanVkZ2VJZCk7XG59XG5cbi8qKlxuICogR2V0IGF1ZGl0IGhpc3RvcnkgZm9yIGEgZml0IGFuZCBzaG93IHNjb3JlXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGdldEZpdFNob3dTY29yZUF1ZGl0SGlzdG9yeShldmVudDogQXBwU3luY1Jlc29sdmVyRXZlbnQ8eyBmaXRTaG93U2NvcmVJZDogc3RyaW5nIH0+KSB7XG4gIGNvbnN0IHVzZXJDb250ZXh0ID0gZ2V0VXNlckNvbnRleHQoZXZlbnQpO1xuICByZXF1aXJlQW55Um9sZSh1c2VyQ29udGV4dCwgWydqdWRnZScsICdhZG1pbiddKTtcblxuICBjb25zdCB7IGZpdFNob3dTY29yZUlkIH0gPSBldmVudC5hcmd1bWVudHM7XG5cbiAgLy8gQ2hlY2sgaWYgdGhlIHNjb3JlIGV4aXN0c1xuICBjb25zdCBzY29yZSA9IGF3YWl0IGZpdFNob3dTY29yZURhdGFBY2Nlc3MuZ2V0Rml0U2hvd1Njb3JlKGZpdFNob3dTY29yZUlkKTtcbiAgaWYgKCFzY29yZSkge1xuICAgIHRocm93IG5ldyBOb3RGb3VuZEVycm9yKGBGaXQgYW5kIHNob3cgc2NvcmUgd2l0aCBJRCAke2ZpdFNob3dTY29yZUlkfSBub3QgZm91bmRgKTtcbiAgfVxuXG4gIC8vIFZhbGlkYXRlIHNjb3JlIGFjY2VzcyBwZXJtaXNzaW9uc1xuICByZXF1aXJlU2NvcmVBY2Nlc3ModXNlckNvbnRleHQsIHNjb3JlLmp1ZGdlSWQpO1xuXG4gIGNvbnN0IGF1ZGl0RW50cmllcyA9IGF3YWl0IGZpdFNob3dTY29yZURhdGFBY2Nlc3MuZ2V0Rml0U2hvd1Njb3JlQXVkaXRIaXN0b3J5KGZpdFNob3dTY29yZUlkKTtcbiAgcmV0dXJuIHsgaXRlbXM6IGF1ZGl0RW50cmllcyB9O1xufSJdfQ==