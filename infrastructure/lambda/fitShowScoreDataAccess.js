"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FitShowScoreDataAccess = exports.setDocClient = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
// Create default client - can be overridden for testing
let docClient;
function getDocClient() {
    if (!docClient) {
        const client = new client_dynamodb_1.DynamoDBClient({});
        docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
    }
    return docClient;
}
// Export for testing
function setDocClient(client) {
    docClient = client;
}
exports.setDocClient = setDocClient;
class FitShowScoreDataAccess {
    constructor(tableName) {
        this.tableName = tableName;
    }
    /**
     * Calculate category totals and overall total score
     */
    calculateScores(input) {
        const appearanceTotal = input.attire + input.attentive + input.courteous;
        const handlingTotal = input.controlEquipment + input.pickupCarrying;
        const demonstrationTotal = input.showingHeadShape + input.showingBodyType + input.showingTail + input.showingCoatTexture;
        const healthExaminationTotal = input.showingMouthTeethGums + input.conditionMouthTeethGums +
            input.showingNose + input.showingEyes + input.conditionNoseEyes +
            input.showingEars + input.earsClean + input.showingToenailsClaws + input.toenailsClipped;
        const groomingCareTotal = input.showingBellyCoatCleanliness + input.coatCleanWellGroomed + input.catHealthCare;
        const knowledgeTotal = input.generalKnowledge + input.catBreedsShowing + input.catAnatomy + input.fourHKnowledge;
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
    /**
     * Create a new fit and show score
     */
    async createFitShowScore(input) {
        const id = (0, uuid_1.v4)();
        const timestamp = new Date().toISOString();
        const scores = this.calculateScores(input);
        const fitShowScore = {
            id,
            ...input,
            ...scores,
            createdAt: timestamp,
            updatedAt: timestamp,
            isFinalized: false,
            modificationCount: 0,
            lastModifiedBy: input.judgeId,
            lastModifiedAt: timestamp
        };
        // Main record
        await getDocClient().send(new lib_dynamodb_1.PutCommand({
            TableName: this.tableName,
            Item: {
                PK: `FIT_SHOW_SCORE#${id}`,
                SK: 'METADATA',
                ...fitShowScore
            }
        }));
        // Index by cat
        await getDocClient().send(new lib_dynamodb_1.PutCommand({
            TableName: this.tableName,
            Item: {
                PK: `CAT#${input.catId}`,
                SK: `FIT_SHOW_SCORE#${id}`,
                fitShowScoreId: id,
                judgeId: input.judgeId,
                judgeName: input.judgeName,
                participantName: input.participantName,
                totalScore: scores.totalScore,
                timestamp,
                isFinalized: false
            }
        }));
        // Index by judge
        await getDocClient().send(new lib_dynamodb_1.PutCommand({
            TableName: this.tableName,
            Item: {
                PK: `JUDGE#${input.judgeId}`,
                SK: `FIT_SHOW_SCORE#${id}`,
                fitShowScoreId: id,
                catId: input.catId,
                participantName: input.participantName,
                totalScore: scores.totalScore,
                timestamp,
                isFinalized: false
            }
        }));
        return fitShowScore;
    }
    /**
     * Get a fit and show score by ID
     */
    async getFitShowScore(id) {
        const result = await getDocClient().send(new lib_dynamodb_1.GetCommand({
            TableName: this.tableName,
            Key: {
                PK: `FIT_SHOW_SCORE#${id}`,
                SK: 'METADATA'
            }
        }));
        if (!result.Item) {
            return null;
        }
        const { PK, SK, ...fitShowScore } = result.Item;
        return fitShowScore;
    }
    /**
     * Update a fit and show score
     */
    async updateFitShowScore(input) {
        const existing = await this.getFitShowScore(input.id);
        if (!existing) {
            throw new Error('Fit and show score not found');
        }
        const timestamp = new Date().toISOString();
        const scores = this.calculateScores(input);
        const updatedScore = {
            ...existing,
            ...input,
            ...scores,
            updatedAt: timestamp,
            modificationCount: existing.modificationCount + 1,
            lastModifiedBy: input.judgeId,
            lastModifiedAt: timestamp
        };
        // Update main record
        await getDocClient().send(new lib_dynamodb_1.PutCommand({
            TableName: this.tableName,
            Item: {
                PK: `FIT_SHOW_SCORE#${input.id}`,
                SK: 'METADATA',
                ...updatedScore
            }
        }));
        // Update cat index
        await getDocClient().send(new lib_dynamodb_1.PutCommand({
            TableName: this.tableName,
            Item: {
                PK: `CAT#${input.catId}`,
                SK: `FIT_SHOW_SCORE#${input.id}`,
                fitShowScoreId: input.id,
                judgeId: input.judgeId,
                judgeName: input.judgeName,
                participantName: input.participantName,
                totalScore: scores.totalScore,
                timestamp,
                isFinalized: updatedScore.isFinalized
            }
        }));
        // Update judge index
        await getDocClient().send(new lib_dynamodb_1.PutCommand({
            TableName: this.tableName,
            Item: {
                PK: `JUDGE#${input.judgeId}`,
                SK: `FIT_SHOW_SCORE#${input.id}`,
                fitShowScoreId: input.id,
                catId: input.catId,
                participantName: input.participantName,
                totalScore: scores.totalScore,
                timestamp,
                isFinalized: updatedScore.isFinalized
            }
        }));
        return updatedScore;
    }
    /**
     * Delete a fit and show score
     */
    async deleteFitShowScore(id) {
        const existing = await this.getFitShowScore(id);
        if (!existing) {
            throw new Error('Fit and show score not found');
        }
        // Delete main record
        await getDocClient().send(new lib_dynamodb_1.DeleteCommand({
            TableName: this.tableName,
            Key: {
                PK: `FIT_SHOW_SCORE#${id}`,
                SK: 'METADATA'
            }
        }));
        // Delete cat index
        await getDocClient().send(new lib_dynamodb_1.DeleteCommand({
            TableName: this.tableName,
            Key: {
                PK: `CAT#${existing.catId}`,
                SK: `FIT_SHOW_SCORE#${id}`
            }
        }));
        // Delete judge index
        await getDocClient().send(new lib_dynamodb_1.DeleteCommand({
            TableName: this.tableName,
            Key: {
                PK: `JUDGE#${existing.judgeId}`,
                SK: `FIT_SHOW_SCORE#${id}`
            }
        }));
    }
    /**
     * Get all fit and show scores for a cat
     */
    async getFitShowScoresByCat(catId) {
        const result = await getDocClient().send(new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
            ExpressionAttributeValues: {
                ':pk': `CAT#${catId}`,
                ':sk': 'FIT_SHOW_SCORE#'
            }
        }));
        if (!result.Items || result.Items.length === 0) {
            return [];
        }
        // Get full score details for each score
        const scores = [];
        for (const item of result.Items) {
            const score = await this.getFitShowScore(item.fitShowScoreId);
            if (score) {
                scores.push(score);
            }
        }
        return scores;
    }
    /**
     * Get all fit and show scores by a judge
     */
    async getFitShowScoresByJudge(judgeId) {
        const result = await getDocClient().send(new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
            ExpressionAttributeValues: {
                ':pk': `JUDGE#${judgeId}`,
                ':sk': 'FIT_SHOW_SCORE#'
            }
        }));
        if (!result.Items || result.Items.length === 0) {
            return [];
        }
        // Get full score details for each score
        const scores = [];
        for (const item of result.Items) {
            const score = await this.getFitShowScore(item.fitShowScoreId);
            if (score) {
                scores.push(score);
            }
        }
        return scores;
    }
    /**
     * List all fit and show scores
     */
    async listFitShowScores() {
        const result = await getDocClient().send(new lib_dynamodb_1.ScanCommand({
            TableName: this.tableName,
            FilterExpression: 'begins_with(PK, :pk) AND SK = :sk',
            ExpressionAttributeValues: {
                ':pk': 'FIT_SHOW_SCORE#',
                ':sk': 'METADATA'
            }
        }));
        if (!result.Items || result.Items.length === 0) {
            return [];
        }
        return result.Items.map(item => {
            const { PK, SK, ...fitShowScore } = item;
            return fitShowScore;
        });
    }
    /**
     * Finalize a fit and show score
     */
    async finalizeFitShowScore(id, judgeId) {
        const existing = await this.getFitShowScore(id);
        if (!existing) {
            throw new Error('Fit and show score not found');
        }
        const timestamp = new Date().toISOString();
        const finalizedScore = {
            ...existing,
            isFinalized: true,
            updatedAt: timestamp,
            lastModifiedBy: judgeId,
            lastModifiedAt: timestamp
        };
        // Create audit entry
        await this.createAuditEntry({
            fitShowScoreId: id,
            action: 'FINALIZE',
            modifiedBy: judgeId,
            modifiedAt: timestamp,
            previousValues: { isFinalized: existing.isFinalized },
            newValues: { isFinalized: true },
            reason: 'Score finalized by judge'
        });
        // Update main record
        await getDocClient().send(new lib_dynamodb_1.PutCommand({
            TableName: this.tableName,
            Item: {
                PK: `FIT_SHOW_SCORE#${id}`,
                SK: 'METADATA',
                ...finalizedScore
            }
        }));
        // Update cat index
        await getDocClient().send(new lib_dynamodb_1.PutCommand({
            TableName: this.tableName,
            Item: {
                PK: `CAT#${existing.catId}`,
                SK: `FIT_SHOW_SCORE#${id}`,
                fitShowScoreId: id,
                judgeId: existing.judgeId,
                judgeName: existing.judgeName,
                participantName: existing.participantName,
                totalScore: existing.totalScore,
                timestamp,
                isFinalized: true
            }
        }));
        // Update judge index
        await getDocClient().send(new lib_dynamodb_1.PutCommand({
            TableName: this.tableName,
            Item: {
                PK: `JUDGE#${existing.judgeId}`,
                SK: `FIT_SHOW_SCORE#${id}`,
                fitShowScoreId: id,
                catId: existing.catId,
                participantName: existing.participantName,
                totalScore: existing.totalScore,
                timestamp,
                isFinalized: true
            }
        }));
        return finalizedScore;
    }
    /**
     * Create an audit entry for score modifications
     */
    async createAuditEntry(entry) {
        const auditId = (0, uuid_1.v4)();
        const timestamp = entry.modifiedAt;
        await getDocClient().send(new lib_dynamodb_1.PutCommand({
            TableName: this.tableName,
            Item: {
                PK: `FIT_SHOW_SCORE_AUDIT#${entry.fitShowScoreId}`,
                SK: `ENTRY#${timestamp}#${auditId}`,
                id: auditId,
                ...entry
            }
        }));
    }
    /**
     * Get audit history for a fit and show score
     */
    async getFitShowScoreAuditHistory(scoreId) {
        const result = await getDocClient().send(new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
            ExpressionAttributeValues: {
                ':pk': `FIT_SHOW_SCORE_AUDIT#${scoreId}`,
                ':sk': 'ENTRY#'
            },
            ScanIndexForward: false // Most recent first
        }));
        if (!result.Items || result.Items.length === 0) {
            return [];
        }
        return result.Items.map(item => {
            const { PK, SK, ...auditEntry } = item;
            return auditEntry;
        });
    }
    /**
     * Update fit and show score with audit trail
     */
    async updateFitShowScoreWithAudit(input, reason) {
        const existing = await this.getFitShowScore(input.id);
        if (!existing) {
            throw new Error('Fit and show score not found');
        }
        // Create audit entry before update
        const timestamp = new Date().toISOString();
        await this.createAuditEntry({
            fitShowScoreId: input.id,
            action: 'UPDATE',
            modifiedBy: input.judgeId,
            modifiedAt: timestamp,
            previousValues: { ...existing },
            newValues: { ...input },
            reason: reason || 'Score updated by judge'
        });
        // Perform the update
        return this.updateFitShowScore(input);
    }
    /**
     * Create fit and show score with audit trail
     */
    async createFitShowScoreWithAudit(input) {
        const score = await this.createFitShowScore(input);
        // Create audit entry after creation
        await this.createAuditEntry({
            fitShowScoreId: score.id,
            action: 'CREATE',
            modifiedBy: input.judgeId,
            modifiedAt: score.createdAt,
            newValues: { ...score },
            reason: 'Initial score creation'
        });
        return score;
    }
    /**
     * Delete fit and show score with audit trail
     */
    async deleteFitShowScoreWithAudit(id, judgeId, reason) {
        const existing = await this.getFitShowScore(id);
        if (!existing) {
            throw new Error('Fit and show score not found');
        }
        // Create audit entry before deletion
        const timestamp = new Date().toISOString();
        await this.createAuditEntry({
            fitShowScoreId: id,
            action: 'DELETE',
            modifiedBy: judgeId,
            modifiedAt: timestamp,
            previousValues: { ...existing },
            reason: reason || 'Score deleted by judge'
        });
        // Perform the deletion
        await this.deleteFitShowScore(id);
    }
}
exports.FitShowScoreDataAccess = FitShowScoreDataAccess;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZml0U2hvd1Njb3JlRGF0YUFjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImZpdFNob3dTY29yZURhdGFBY2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsOERBQTBEO0FBQzFELHdEQUFnSjtBQUNoSiwrQkFBb0M7QUFFcEMsd0RBQXdEO0FBQ3hELElBQUksU0FBaUMsQ0FBQztBQUV0QyxTQUFTLFlBQVk7SUFDbkIsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ2YsTUFBTSxNQUFNLEdBQUcsSUFBSSxnQ0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3RDLFNBQVMsR0FBRyxxQ0FBc0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDbEQsQ0FBQztJQUNELE9BQU8sU0FBUyxDQUFDO0FBQ25CLENBQUM7QUFFRCxxQkFBcUI7QUFDckIsU0FBZ0IsWUFBWSxDQUFDLE1BQThCO0lBQ3pELFNBQVMsR0FBRyxNQUFNLENBQUM7QUFDckIsQ0FBQztBQUZELG9DQUVDO0FBa0lELE1BQWEsc0JBQXNCO0lBR2pDLFlBQVksU0FBaUI7UUFDM0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7SUFDN0IsQ0FBQztJQUVEOztPQUVHO0lBQ0ssZUFBZSxDQUFDLEtBQThCO1FBU3BELE1BQU0sZUFBZSxHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDO1FBQ3pFLE1BQU0sYUFBYSxHQUFHLEtBQUssQ0FBQyxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDO1FBQ3BFLE1BQU0sa0JBQWtCLEdBQUcsS0FBSyxDQUFDLGdCQUFnQixHQUFHLEtBQUssQ0FBQyxlQUFlLEdBQUcsS0FBSyxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUMsa0JBQWtCLENBQUM7UUFDekgsTUFBTSxzQkFBc0IsR0FBRyxLQUFLLENBQUMscUJBQXFCLEdBQUcsS0FBSyxD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bGllbnQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xuaW1wb3J0IHsgRHluYW1vREJEb2N1bWVudENsaWVudCwgUHV0Q29tbWFuZCwgR2V0Q29tbWFuZCwgVXBkYXRlQ29tbWFuZCwgRGVsZXRlQ29tbWFuZCwgUXVlcnlDb21tYW5kLCBTY2FuQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XG5pbXBvcnQgeyB2NCBhcyB1dWlkdjQgfSBmcm9tICd1dWlkJztcblxuLy8gQ3JlYXRlIGRlZmF1bHQgY2xpZW50IC0gY2FuIGJlIG92ZXJyaWRkZW4gZm9yIHRlc3RpbmdcbmxldCBkb2NDbGllbnQ6IER5bmFtb0RCRG9jdW1lbnRDbGllbnQ7XG5cbmZ1bmN0aW9uIGdldERvY0NsaWVudCgpOiBEeW5hbW9EQkRvY3VtZW50Q2xpZW50IHtcbiAgaWYgKCFkb2NDbGllbnQpIHtcbiAgICBjb25zdCBjbGllbnQgPSBuZXcgRHluYW1vREJDbGllbnQoe30pO1xuICAgIGRvY0NsaWVudCA9IER5bmFtb0RCRG9jdW1lbnRDbGllbnQuZnJvbShjbGllbnQpO1xuICB9XG4gIHJldHVybiBkb2NDbGllbnQ7XG59XG5cbi8vIEV4cG9ydCBmb3IgdGVzdGluZ1xuZXhwb3J0IGZ1bmN0aW9uIHNldERvY0NsaWVudChjbGllbnQ6IER5bmFtb0RCRG9jdW1lbnRDbGllbnQpOiB2b2lkIHtcbiAgZG9jQ2xpZW50ID0gY2xpZW50O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEZpdFNob3dTY29yZSB7XG4gIGlkOiBzdHJpbmc7XG4gIGNhdElkOiBzdHJpbmc7XG4gIHBhcnRpY2lwYW50TmFtZTogc3RyaW5nO1xuICBqdWRnZUlkOiBzdHJpbmc7XG4gIGp1ZGdlTmFtZTogc3RyaW5nO1xuICBcbiAgLy8gQXBwZWFyYW5jZSAmIERlbWVhbm9yICgyMCBwb2ludHMpXG4gIGF0dGlyZTogbnVtYmVyOyAvLyAxLTEwXG4gIGF0dGVudGl2ZTogbnVtYmVyOyAvLyAxLTVcbiAgY291cnRlb3VzOiBudW1iZXI7IC8vIDEtNVxuICBcbiAgLy8gSGFuZGxpbmcgJiBDb250cm9sICgxNCBwb2ludHMpXG4gIGNvbnRyb2xFcXVpcG1lbnQ6IG51bWJlcjsgLy8gMS0xMFxuICBwaWNrdXBDYXJyeWluZzogbnVtYmVyOyAvLyAxLTRcbiAgXG4gIC8vIERlbW9uc3RyYXRpb24gU2tpbGxzICgxNiBwb2ludHMpXG4gIHNob3dpbmdIZWFkU2hhcGU6IG51bWJlcjsgLy8gMS00XG4gIHNob3dpbmdCb2R5VHlwZTogbnVtYmVyOyAvLyAxLTRcbiAgc2hvd2luZ1RhaWw6IG51bWJlcjsgLy8gMS00XG4gIHNob3dpbmdDb2F0VGV4dHVyZTogbnVtYmVyOyAvLyAxLTRcbiAgXG4gIC8vIEhlYWx0aCBFeGFtaW5hdGlvbiAoMjEgcG9pbnRzKVxuICBzaG93aW5nTW91dGhUZWV0aEd1bXM6IG51bWJlcjsgLy8gMS0zXG4gIGNvbmRpdGlvbk1vdXRoVGVldGhHdW1zOiBudW1iZXI7IC8vIDEtMlxuICBzaG93aW5nTm9zZTogbnVtYmVyOyAvLyAxLTJcbiAgc2hvd2luZ0V5ZXM6IG51bWJlcjsgLy8gMS0yXG4gIGNvbmRpdGlvbk5vc2VFeWVzOiBudW1iZXI7IC8vIDEtMlxuICBzaG93aW5nRWFyczogbnVtYmVyOyAvLyAxLTJcbiAgZWFyc0NsZWFuOiBudW1iZXI7IC8vIDEtMlxuICBzaG93aW5nVG9lbmFpbHNDbGF3czogbnVtYmVyOyAvLyAxLTNcbiAgdG9lbmFpbHNDbGlwcGVkOiBudW1iZXI7IC8vIDEtNlxuICBcbiAgLy8gR3Jvb21pbmcgJiBDYXJlICgxNCBwb2ludHMpXG4gIHNob3dpbmdCZWxseUNvYXRDbGVhbmxpbmVzczogbnVtYmVyOyAvLyAxLTNcbiAgY29hdENsZWFuV2VsbEdyb29tZWQ6IG51bWJlcjsgLy8gMS04XG4gIGNhdEhlYWx0aENhcmU6IG51bWJlcjsgLy8gMS0zXG4gIFxuICAvLyBLbm93bGVkZ2UgKDEyIHBvaW50cylcbiAgZ2VuZXJhbEtub3dsZWRnZTogbnVtYmVyOyAvLyAxLTNcbiAgY2F0QnJlZWRzU2hvd2luZzogbnVtYmVyOyAvLyAxLTNcbiAgY2F0QW5hdG9teTogbnVtYmVyOyAvLyAxLTNcbiAgZm91ckhLbm93bGVkZ2U6IG51bWJlcjsgLy8gMS0zXG4gIFxuICAvLyBDYWxjdWxhdGVkIHRvdGFsc1xuICBhcHBlYXJhbmNlVG90YWw6IG51bWJlcjtcbiAgaGFuZGxpbmdUb3RhbDogbnVtYmVyO1xuICBkZW1vbnN0cmF0aW9uVG90YWw6IG51bWJlcjtcbiAgaGVhbHRoRXhhbWluYXRpb25Ub3RhbDogbnVtYmVyO1xuICBncm9vbWluZ0NhcmVUb3RhbDogbnVtYmVyO1xuICBrbm93bGVkZ2VUb3RhbDogbnVtYmVyO1xuICB0b3RhbFNjb3JlOiBudW1iZXI7XG4gIFxuICAvLyBDb21tZW50c1xuICBhcHBlYXJhbmNlQ29tbWVudHM/OiBzdHJpbmc7XG4gIGhhbmRsaW5nQ29tbWVudHM/OiBzdHJpbmc7XG4gIGRlbW9uc3RyYXRpb25Db21tZW50cz86IHN0cmluZztcbiAgaGVhbHRoRXhhbWluYXRpb25Db21tZW50cz86IHN0cmluZztcbiAgZ3Jvb21pbmdDYXJlQ29tbWVudHM/OiBzdHJpbmc7XG4gIGtub3dsZWRnZUNvbW1lbnRzPzogc3RyaW5nO1xuICBcbiAgLy8gTWV0YWRhdGFcbiAgY3JlYXRlZEF0OiBzdHJpbmc7XG4gIHVwZGF0ZWRBdDogc3RyaW5nO1xuICBpc0ZpbmFsaXplZDogYm9vbGVhbjtcbiAgbW9kaWZpY2F0aW9uQ291bnQ6IG51bWJlcjtcbiAgbGFzdE1vZGlmaWVkQnk6IHN0cmluZztcbiAgbGFzdE1vZGlmaWVkQXQ6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDcmVhdGVGaXRTaG93U2NvcmVJbnB1dCB7XG4gIGNhdElkOiBzdHJpbmc7XG4gIHBhcnRpY2lwYW50TmFtZTogc3RyaW5nO1xuICBqdWRnZUlkOiBzdHJpbmc7XG4gIGp1ZGdlTmFtZTogc3RyaW5nO1xuICBcbiAgLy8gQWxsIHNjb3JpbmcgZmllbGRzXG4gIGF0dGlyZTogbnVtYmVyO1xuICBhdHRlbnRpdmU6IG51bWJlcjtcbiAgY291cnRlb3VzOiBudW1iZXI7XG4gIGNvbnRyb2xFcXVpcG1lbnQ6IG51bWJlcjtcbiAgcGlja3VwQ2Fycnlpbmc6IG51bWJlcjtcbiAgc2hvd2luZ0hlYWRTaGFwZTogbnVtYmVyO1xuICBzaG93aW5nQm9keVR5cGU6IG51bWJlcjtcbiAgc2hvd2luZ1RhaWw6IG51bWJlcjtcbiAgc2hvd2luZ0NvYXRUZXh0dXJlOiBudW1iZXI7XG4gIHNob3dpbmdNb3V0aFRlZXRoR3VtczogbnVtYmVyO1xuICBjb25kaXRpb25Nb3V0aFRlZXRoR3VtczogbnVtYmVyO1xuICBzaG93aW5nTm9zZTogbnVtYmVyO1xuICBzaG93aW5nRXllczogbnVtYmVyO1xuICBjb25kaXRpb25Ob3NlRXllczogbnVtYmVyO1xuICBzaG93aW5nRWFyczogbnVtYmVyO1xuICBlYXJzQ2xlYW46IG51bWJlcjtcbiAgc2hvd2luZ1RvZW5haWxzQ2xhd3M6IG51bWJlcjtcbiAgdG9lbmFpbHNDbGlwcGVkOiBudW1iZXI7XG4gIHNob3dpbmdCZWxseUNvYXRDbGVhbmxpbmVzczogbnVtYmVyO1xuICBjb2F0Q2xlYW5XZWxsR3Jvb21lZDogbnVtYmVyO1xuICBjYXRIZWFsdGhDYXJlOiBudW1iZXI7XG4gIGdlbmVyYWxLbm93bGVkZ2U6IG51bWJlcjtcbiAgY2F0QnJlZWRzU2hvd2luZzogbnVtYmVyO1xuICBjYXRBbmF0b215OiBudW1iZXI7XG4gIGZvdXJIS25vd2xlZGdlOiBudW1iZXI7XG4gIFxuICAvLyBPcHRpb25hbCBjb21tZW50c1xuICBhcHBlYXJhbmNlQ29tbWVudHM/OiBzdHJpbmc7XG4gIGhhbmRsaW5nQ29tbWVudHM/OiBzdHJpbmc7XG4gIGRlbW9uc3RyYXRpb25Db21tZW50cz86IHN0cmluZztcbiAgaGVhbHRoRXhhbWluYXRpb25Db21tZW50cz86IHN0cmluZztcbiAgZ3Jvb21pbmdDYXJlQ29tbWVudHM/OiBzdHJpbmc7XG4gIGtub3dsZWRnZUNvbW1lbnRzPzogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFVwZGF0ZUZpdFNob3dTY29yZUlucHV0IGV4dGVuZHMgQ3JlYXRlRml0U2hvd1Njb3JlSW5wdXQge1xuICBpZDogc3RyaW5nO1xuICBtb2RpZmljYXRpb25SZWFzb24/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRml0U2hvd1Njb3JlQXVkaXRFbnRyeSB7XG4gIGlkOiBzdHJpbmc7XG4gIGZpdFNob3dTY29yZUlkOiBzdHJpbmc7XG4gIGFjdGlvbjogJ0NSRUFURScgfCAnVVBEQVRFJyB8ICdGSU5BTElaRScgfCAnREVMRVRFJztcbiAgbW9kaWZpZWRCeTogc3RyaW5nO1xuICBtb2RpZmllZEF0OiBzdHJpbmc7XG4gIHByZXZpb3VzVmFsdWVzPzogUmVjb3JkPHN0cmluZywgYW55PjtcbiAgbmV3VmFsdWVzPzogUmVjb3JkPHN0cmluZywgYW55PjtcbiAgcmVhc29uPzogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgRml0U2hvd1Njb3JlRGF0YUFjY2VzcyB7XG4gIHByaXZhdGUgdGFibGVOYW1lOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IodGFibGVOYW1lOiBzdHJpbmcpIHtcbiAgICB0aGlzLnRhYmxlTmFtZSA9IHRhYmxlTmFtZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxjdWxhdGUgY2F0ZWdvcnkgdG90YWxzIGFuZCBvdmVyYWxsIHRvdGFsIHNjb3JlXG4gICAqL1xuICBwcml2YXRlIGNhbGN1bGF0ZVNjb3JlcyhpbnB1dDogQ3JlYXRlRml0U2hvd1Njb3JlSW5wdXQpOiB7XG4gICAgYXBwZWFyYW5jZVRvdGFsOiBudW1iZXI7XG4gICAgaGFuZGxpbmdUb3RhbDogbnVtYmVyO1xuICAgIGRlbW9uc3RyYXRpb25Ub3RhbDogbnVtYmVyO1xuICAgIGhlYWx0aEV4YW1pbmF0aW9uVG90YWw6IG51bWJlcjtcbiAgICBncm9vbWluZ0NhcmVUb3RhbDogbnVtYmVyO1xuICAgIGtub3dsZWRnZVRvdGFsOiBudW1iZXI7XG4gICAgdG90YWxTY29yZTogbnVtYmVyO1xuICB9IHtcbiAgICBjb25zdCBhcHBlYXJhbmNlVG90YWwgPSBpbnB1dC5hdHRpcmUgKyBpbnB1dC5hdHRlbnRpdmUgKyBpbnB1dC5jb3VydGVvdXM7XG4gICAgY29uc3QgaGFuZGxpbmdUb3RhbCA9IGlucHV0LmNvbnRyb2xFcXVpcG1lbnQgKyBpbnB1dC5waWNrdXBDYXJyeWluZztcbiAgICBjb25zdCBkZW1vbnN0cmF0aW9uVG90YWwgPSBpbnB1dC5zaG93aW5nSGVhZFNoYXBlICsgaW5wdXQuc2hvd2luZ0JvZHlUeXBlICsgaW5wdXQuc2hvd2luZ1RhaWwgKyBpbnB1dC5zaG93aW5nQ29hdFRleHR1cmU7XG4gICAgY29uc3QgaGVhbHRoRXhhbWluYXRpb25Ub3RhbCA9IGlucHV0LnNob3dpbmdNb3V0aFRlZXRoR3VtcyArIGlucHV0LmNvbmRpdGlvbk1vdXRoVGVldGhHdW1zICsgXG4gICAgICBpbnB1dC5zaG93aW5nTm9zZSArIGlucHV0LnNob3dpbmdFeWVzICsgaW5wdXQuY29uZGl0aW9uTm9zZUV5ZXMgKyBcbiAgICAgIGlucHV0LnNob3dpbmdFYXJzICsgaW5wdXQuZWFyc0NsZWFuICsgaW5wdXQuc2hvd2luZ1RvZW5haWxzQ2xhd3MgKyBpbnB1dC50b2VuYWlsc0NsaXBwZWQ7XG4gICAgY29uc3QgZ3Jvb21pbmdDYXJlVG90YWwgPSBpbnB1dC5zaG93aW5nQmVsbHlDb2F0Q2xlYW5saW5lc3MgKyBpbnB1dC5jb2F0Q2xlYW5XZWxsR3Jvb21lZCArIGlucHV0LmNhdEhlYWx0aENhcmU7XG4gICAgY29uc3Qga25vd2xlZGdlVG90YWwgPSBpbnB1dC5nZW5lcmFsS25vd2xlZGdlICsgaW5wdXQuY2F0QnJlZWRzU2hvd2luZyArIGlucHV0LmNhdEFuYXRvbXkgKyBpbnB1dC5mb3VySEtub3dsZWRnZTtcbiAgICBcbiAgICBjb25zdCB0b3RhbFNjb3JlID0gYXBwZWFyYW5jZVRvdGFsICsgaGFuZGxpbmdUb3RhbCArIGRlbW9uc3RyYXRpb25Ub3RhbCArIFxuICAgICAgaGVhbHRoRXhhbWluYXRpb25Ub3RhbCArIGdyb29taW5nQ2FyZVRvdGFsICsga25vd2xlZGdlVG90YWw7XG5cbiAgICByZXR1cm4ge1xuICAgICAgYXBwZWFyYW5jZVRvdGFsLFxuICAgICAgaGFuZGxpbmdUb3RhbCxcbiAgICAgIGRlbW9uc3RyYXRpb25Ub3RhbCxcbiAgICAgIGhlYWx0aEV4YW1pbmF0aW9uVG90YWwsXG4gICAgICBncm9vbWluZ0NhcmVUb3RhbCxcbiAgICAgIGtub3dsZWRnZVRvdGFsLFxuICAgICAgdG90YWxTY29yZVxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGEgbmV3IGZpdCBhbmQgc2hvdyBzY29yZVxuICAgKi9cbiAgYXN5bmMgY3JlYXRlRml0U2hvd1Njb3JlKGlucHV0OiBDcmVhdGVGaXRTaG93U2NvcmVJbnB1dCk6IFByb21pc2U8Rml0U2hvd1Njb3JlPiB7XG4gICAgY29uc3QgaWQgPSB1dWlkdjQoKTtcbiAgICBjb25zdCB0aW1lc3RhbXAgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgY29uc3Qgc2NvcmVzID0gdGhpcy5jYWxjdWxhdGVTY29yZXMoaW5wdXQpO1xuXG4gICAgY29uc3QgZml0U2hvd1Njb3JlOiBGaXRTaG93U2NvcmUgPSB7XG4gICAgICBpZCxcbiAgICAgIC4uLmlucHV0LFxuICAgICAgLi4uc2NvcmVzLFxuICAgICAgY3JlYXRlZEF0OiB0aW1lc3RhbXAsXG4gICAgICB1cGRhdGVkQXQ6IHRpbWVzdGFtcCxcbiAgICAgIGlzRmluYWxpemVkOiBmYWxzZSxcbiAgICAgIG1vZGlmaWNhdGlvbkNvdW50OiAwLFxuICAgICAgbGFzdE1vZGlmaWVkQnk6IGlucHV0Lmp1ZGdlSWQsXG4gICAgICBsYXN0TW9kaWZpZWRBdDogdGltZXN0YW1wXG4gICAgfTtcblxuICAgIC8vIE1haW4gcmVjb3JkXG4gICAgYXdhaXQgZ2V0RG9jQ2xpZW50KCkuc2VuZChuZXcgUHV0Q29tbWFuZCh7XG4gICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxuICAgICAgSXRlbToge1xuICAgICAgICBQSzogYEZJVF9TSE9XX1NDT1JFIyR7aWR9YCxcbiAgICAgICAgU0s6ICdNRVRBREFUQScsXG4gICAgICAgIC4uLmZpdFNob3dTY29yZVxuICAgICAgfVxuICAgIH0pKTtcblxuICAgIC8vIEluZGV4IGJ5IGNhdFxuICAgIGF3YWl0IGdldERvY0NsaWVudCgpLnNlbmQobmV3IFB1dENvbW1hbmQoe1xuICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcbiAgICAgIEl0ZW06IHtcbiAgICAgICAgUEs6IGBDQVQjJHtpbnB1dC5jYXRJZH1gLFxuICAgICAgICBTSzogYEZJVF9TSE9XX1NDT1JFIyR7aWR9YCxcbiAgICAgICAgZml0U2hvd1Njb3JlSWQ6IGlkLFxuICAgICAgICBqdWRnZUlkOiBpbnB1dC5qdWRnZUlkLFxuICAgICAgICBqdWRnZU5hbWU6IGlucHV0Lmp1ZGdlTmFtZSxcbiAgICAgICAgcGFydGljaXBhbnROYW1lOiBpbnB1dC5wYXJ0aWNpcGFudE5hbWUsXG4gICAgICAgIHRvdGFsU2NvcmU6IHNjb3Jlcy50b3RhbFNjb3JlLFxuICAgICAgICB0aW1lc3RhbXAsXG4gICAgICAgIGlzRmluYWxpemVkOiBmYWxzZVxuICAgICAgfVxuICAgIH0pKTtcblxuICAgIC8vIEluZGV4IGJ5IGp1ZGdlXG4gICAgYXdhaXQgZ2V0RG9jQ2xpZW50KCkuc2VuZChuZXcgUHV0Q29tbWFuZCh7XG4gICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxuICAgICAgSXRlbToge1xuICAgICAgICBQSzogYEpVREdFIyR7aW5wdXQuanVkZ2VJZH1gLFxuICAgICAgICBTSzogYEZJVF9TSE9XX1NDT1JFIyR7aWR9YCxcbiAgICAgICAgZml0U2hvd1Njb3JlSWQ6IGlkLFxuICAgICAgICBjYXRJZDogaW5wdXQuY2F0SWQsXG4gICAgICAgIHBhcnRpY2lwYW50TmFtZTogaW5wdXQucGFydGljaXBhbnROYW1lLFxuICAgICAgICB0b3RhbFNjb3JlOiBzY29yZXMudG90YWxTY29yZSxcbiAgICAgICAgdGltZXN0YW1wLFxuICAgICAgICBpc0ZpbmFsaXplZDogZmFsc2VcbiAgICAgIH1cbiAgICB9KSk7XG5cbiAgICByZXR1cm4gZml0U2hvd1Njb3JlO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhIGZpdCBhbmQgc2hvdyBzY29yZSBieSBJRFxuICAgKi9cbiAgYXN5bmMgZ2V0Rml0U2hvd1Njb3JlKGlkOiBzdHJpbmcpOiBQcm9taXNlPEZpdFNob3dTY29yZSB8IG51bGw+IHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBnZXREb2NDbGllbnQoKS5zZW5kKG5ldyBHZXRDb21tYW5kKHtcbiAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXG4gICAgICBLZXk6IHtcbiAgICAgICAgUEs6IGBGSVRfU0hPV19TQ09SRSMke2lkfWAsXG4gICAgICAgIFNLOiAnTUVUQURBVEEnXG4gICAgICB9XG4gICAgfSkpO1xuXG4gICAgaWYgKCFyZXN1bHQuSXRlbSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgeyBQSywgU0ssIC4uLmZpdFNob3dTY29yZSB9ID0gcmVzdWx0Lkl0ZW07XG4gICAgcmV0dXJuIGZpdFNob3dTY29yZSBhcyBGaXRTaG93U2NvcmU7XG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlIGEgZml0IGFuZCBzaG93IHNjb3JlXG4gICAqL1xuICBhc3luYyB1cGRhdGVGaXRTaG93U2NvcmUoaW5wdXQ6IFVwZGF0ZUZpdFNob3dTY29yZUlucHV0KTogUHJvbWlzZTxGaXRTaG93U2NvcmU+IHtcbiAgICBjb25zdCBleGlzdGluZyA9IGF3YWl0IHRoaXMuZ2V0Rml0U2hvd1Njb3JlKGlucHV0LmlkKTtcbiAgICBpZiAoIWV4aXN0aW5nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZpdCBhbmQgc2hvdyBzY29yZSBub3QgZm91bmQnKTtcbiAgICB9XG5cbiAgICBjb25zdCB0aW1lc3RhbXAgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgY29uc3Qgc2NvcmVzID0gdGhpcy5jYWxjdWxhdGVTY29yZXMoaW5wdXQpO1xuXG4gICAgY29uc3QgdXBkYXRlZFNjb3JlOiBGaXRTaG93U2NvcmUgPSB7XG4gICAgICAuLi5leGlzdGluZyxcbiAgICAgIC4uLmlucHV0LFxuICAgICAgLi4uc2NvcmVzLFxuICAgICAgdXBkYXRlZEF0OiB0aW1lc3RhbXAsXG4gICAgICBtb2RpZmljYXRpb25Db3VudDogZXhpc3RpbmcubW9kaWZpY2F0aW9uQ291bnQgKyAxLFxuICAgICAgbGFzdE1vZGlmaWVkQnk6IGlucHV0Lmp1ZGdlSWQsXG4gICAgICBsYXN0TW9kaWZpZWRBdDogdGltZXN0YW1wXG4gICAgfTtcblxuICAgIC8vIFVwZGF0ZSBtYWluIHJlY29yZFxuICAgIGF3YWl0IGdldERvY0NsaWVudCgpLnNlbmQobmV3IFB1dENvbW1hbmQoe1xuICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcbiAgICAgIEl0ZW06IHtcbiAgICAgICAgUEs6IGBGSVRfU0hPV19TQ09SRSMke2lucHV0LmlkfWAsXG4gICAgICAgIFNLOiAnTUVUQURBVEEnLFxuICAgICAgICAuLi51cGRhdGVkU2NvcmVcbiAgICAgIH1cbiAgICB9KSk7XG5cbiAgICAvLyBVcGRhdGUgY2F0IGluZGV4XG4gICAgYXdhaXQgZ2V0RG9jQ2xpZW50KCkuc2VuZChuZXcgUHV0Q29tbWFuZCh7XG4gICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxuICAgICAgSXRlbToge1xuICAgICAgICBQSzogYENBVCMke2lucHV0LmNhdElkfWAsXG4gICAgICAgIFNLOiBgRklUX1NIT1dfU0NPUkUjJHtpbnB1dC5pZH1gLFxuICAgICAgICBmaXRTaG93U2NvcmVJZDogaW5wdXQuaWQsXG4gICAgICAgIGp1ZGdlSWQ6IGlucHV0Lmp1ZGdlSWQsXG4gICAgICAgIGp1ZGdlTmFtZTogaW5wdXQuanVkZ2VOYW1lLFxuICAgICAgICBwYXJ0aWNpcGFudE5hbWU6IGlucHV0LnBhcnRpY2lwYW50TmFtZSxcbiAgICAgICAgdG90YWxTY29yZTogc2NvcmVzLnRvdGFsU2NvcmUsXG4gICAgICAgIHRpbWVzdGFtcCxcbiAgICAgICAgaXNGaW5hbGl6ZWQ6IHVwZGF0ZWRTY29yZS5pc0ZpbmFsaXplZFxuICAgICAgfVxuICAgIH0pKTtcblxuICAgIC8vIFVwZGF0ZSBqdWRnZSBpbmRleFxuICAgIGF3YWl0IGdldERvY0NsaWVudCgpLnNlbmQobmV3IFB1dENvbW1hbmQoe1xuICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcbiAgICAgIEl0ZW06IHtcbiAgICAgICAgUEs6IGBKVURHRSMke2lucHV0Lmp1ZGdlSWR9YCxcbiAgICAgICAgU0s6IGBGSVRfU0hPV19TQ09SRSMke2lucHV0LmlkfWAsXG4gICAgICAgIGZpdFNob3dTY29yZUlkOiBpbnB1dC5pZCxcbiAgICAgICAgY2F0SWQ6IGlucHV0LmNhdElkLFxuICAgICAgICBwYXJ0aWNpcGFudE5hbWU6IGlucHV0LnBhcnRpY2lwYW50TmFtZSxcbiAgICAgICAgdG90YWxTY29yZTogc2NvcmVzLnRvdGFsU2NvcmUsXG4gICAgICAgIHRpbWVzdGFtcCxcbiAgICAgICAgaXNGaW5hbGl6ZWQ6IHVwZGF0ZWRTY29yZS5pc0ZpbmFsaXplZFxuICAgICAgfVxuICAgIH0pKTtcblxuICAgIHJldHVybiB1cGRhdGVkU2NvcmU7XG4gIH1cblxuICAvKipcbiAgICogRGVsZXRlIGEgZml0IGFuZCBzaG93IHNjb3JlXG4gICAqL1xuICBhc3luYyBkZWxldGVGaXRTaG93U2NvcmUoaWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGV4aXN0aW5nID0gYXdhaXQgdGhpcy5nZXRGaXRTaG93U2NvcmUoaWQpO1xuICAgIGlmICghZXhpc3RpbmcpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignRml0IGFuZCBzaG93IHNjb3JlIG5vdCBmb3VuZCcpO1xuICAgIH1cblxuICAgIC8vIERlbGV0ZSBtYWluIHJlY29yZFxuICAgIGF3YWl0IGdldERvY0NsaWVudCgpLnNlbmQobmV3IERlbGV0ZUNvbW1hbmQoe1xuICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcbiAgICAgIEtleToge1xuICAgICAgICBQSzogYEZJVF9TSE9XX1NDT1JFIyR7aWR9YCxcbiAgICAgICAgU0s6ICdNRVRBREFUQSdcbiAgICAgIH1cbiAgICB9KSk7XG5cbiAgICAvLyBEZWxldGUgY2F0IGluZGV4XG4gICAgYXdhaXQgZ2V0RG9jQ2xpZW50KCkuc2VuZChuZXcgRGVsZXRlQ29tbWFuZCh7XG4gICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxuICAgICAgS2V5OiB7XG4gICAgICAgIFBLOiBgQ0FUIyR7ZXhpc3RpbmcuY2F0SWR9YCxcbiAgICAgICAgU0s6IGBGSVRfU0hPV19TQ09SRSMke2lkfWBcbiAgICAgIH1cbiAgICB9KSk7XG5cbiAgICAvLyBEZWxldGUganVkZ2UgaW5kZXhcbiAgICBhd2FpdCBnZXREb2NDbGllbnQoKS5zZW5kKG5ldyBEZWxldGVDb21tYW5kKHtcbiAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXG4gICAgICBLZXk6IHtcbiAgICAgICAgUEs6IGBKVURHRSMke2V4aXN0aW5nLmp1ZGdlSWR9YCxcbiAgICAgICAgU0s6IGBGSVRfU0hPV19TQ09SRSMke2lkfWBcbiAgICAgIH1cbiAgICB9KSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFsbCBmaXQgYW5kIHNob3cgc2NvcmVzIGZvciBhIGNhdFxuICAgKi9cbiAgYXN5bmMgZ2V0Rml0U2hvd1Njb3Jlc0J5Q2F0KGNhdElkOiBzdHJpbmcpOiBQcm9taXNlPEZpdFNob3dTY29yZVtdPiB7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZ2V0RG9jQ2xpZW50KCkuc2VuZChuZXcgUXVlcnlDb21tYW5kKHtcbiAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXG4gICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiAnUEsgPSA6cGsgQU5EIGJlZ2luc193aXRoKFNLLCA6c2spJyxcbiAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcbiAgICAgICAgJzpwayc6IGBDQVQjJHtjYXRJZH1gLFxuICAgICAgICAnOnNrJzogJ0ZJVF9TSE9XX1NDT1JFIydcbiAgICAgIH1cbiAgICB9KSk7XG5cbiAgICBpZiAoIXJlc3VsdC5JdGVtcyB8fCByZXN1bHQuSXRlbXMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgLy8gR2V0IGZ1bGwgc2NvcmUgZGV0YWlscyBmb3IgZWFjaCBzY29yZVxuICAgIGNvbnN0IHNjb3JlczogRml0U2hvd1Njb3JlW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgcmVzdWx0Lkl0ZW1zKSB7XG4gICAgICBjb25zdCBzY29yZSA9IGF3YWl0IHRoaXMuZ2V0Rml0U2hvd1Njb3JlKGl0ZW0uZml0U2hvd1Njb3JlSWQpO1xuICAgICAgaWYgKHNjb3JlKSB7XG4gICAgICAgIHNjb3Jlcy5wdXNoKHNjb3JlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gc2NvcmVzO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhbGwgZml0IGFuZCBzaG93IHNjb3JlcyBieSBhIGp1ZGdlXG4gICAqL1xuICBhc3luYyBnZXRGaXRTaG93U2NvcmVzQnlKdWRnZShqdWRnZUlkOiBzdHJpbmcpOiBQcm9taXNlPEZpdFNob3dTY29yZVtdPiB7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZ2V0RG9jQ2xpZW50KCkuc2VuZChuZXcgUXVlcnlDb21tYW5kKHtcbiAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXG4gICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiAnUEsgPSA6cGsgQU5EIGJlZ2luc193aXRoKFNLLCA6c2spJyxcbiAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcbiAgICAgICAgJzpwayc6IGBKVURHRSMke2p1ZGdlSWR9YCxcbiAgICAgICAgJzpzayc6ICdGSVRfU0hPV19TQ09SRSMnXG4gICAgICB9XG4gICAgfSkpO1xuXG4gICAgaWYgKCFyZXN1bHQuSXRlbXMgfHwgcmVzdWx0Lkl0ZW1zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIC8vIEdldCBmdWxsIHNjb3JlIGRldGFpbHMgZm9yIGVhY2ggc2NvcmVcbiAgICBjb25zdCBzY29yZXM6IEZpdFNob3dTY29yZVtdID0gW107XG4gICAgZm9yIChjb25zdCBpdGVtIG9mIHJlc3VsdC5JdGVtcykge1xuICAgICAgY29uc3Qgc2NvcmUgPSBhd2FpdCB0aGlzLmdldEZpdFNob3dTY29yZShpdGVtLmZpdFNob3dTY29yZUlkKTtcbiAgICAgIGlmIChzY29yZSkge1xuICAgICAgICBzY29yZXMucHVzaChzY29yZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHNjb3JlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBMaXN0IGFsbCBmaXQgYW5kIHNob3cgc2NvcmVzXG4gICAqL1xuICBhc3luYyBsaXN0Rml0U2hvd1Njb3JlcygpOiBQcm9taXNlPEZpdFNob3dTY29yZVtdPiB7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZ2V0RG9jQ2xpZW50KCkuc2VuZChuZXcgU2NhbkNvbW1hbmQoe1xuICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcbiAgICAgIEZpbHRlckV4cHJlc3Npb246ICdiZWdpbnNfd2l0aChQSywgOnBrKSBBTkQgU0sgPSA6c2snLFxuICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xuICAgICAgICAnOnBrJzogJ0ZJVF9TSE9XX1NDT1JFIycsXG4gICAgICAgICc6c2snOiAnTUVUQURBVEEnXG4gICAgICB9XG4gICAgfSkpO1xuXG4gICAgaWYgKCFyZXN1bHQuSXRlbXMgfHwgcmVzdWx0Lkl0ZW1zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQuSXRlbXMubWFwKGl0ZW0gPT4ge1xuICAgICAgY29uc3QgeyBQSywgU0ssIC4uLmZpdFNob3dTY29yZSB9ID0gaXRlbTtcbiAgICAgIHJldHVybiBmaXRTaG93U2NvcmUgYXMgRml0U2hvd1Njb3JlO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmFsaXplIGEgZml0IGFuZCBzaG93IHNjb3JlXG4gICAqL1xuICBhc3luYyBmaW5hbGl6ZUZpdFNob3dTY29yZShpZDogc3RyaW5nLCBqdWRnZUlkOiBzdHJpbmcpOiBQcm9taXNlPEZpdFNob3dTY29yZT4ge1xuICAgIGNvbnN0IGV4aXN0aW5nID0gYXdhaXQgdGhpcy5nZXRGaXRTaG93U2NvcmUoaWQpO1xuICAgIGlmICghZXhpc3RpbmcpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignRml0IGFuZCBzaG93IHNjb3JlIG5vdCBmb3VuZCcpO1xuICAgIH1cblxuICAgIGNvbnN0IHRpbWVzdGFtcCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICBjb25zdCBmaW5hbGl6ZWRTY29yZTogRml0U2hvd1Njb3JlID0ge1xuICAgICAgLi4uZXhpc3RpbmcsXG4gICAgICBpc0ZpbmFsaXplZDogdHJ1ZSxcbiAgICAgIHVwZGF0ZWRBdDogdGltZXN0YW1wLFxuICAgICAgbGFzdE1vZGlmaWVkQnk6IGp1ZGdlSWQsXG4gICAgICBsYXN0TW9kaWZpZWRBdDogdGltZXN0YW1wXG4gICAgfTtcblxuICAgIC8vIENyZWF0ZSBhdWRpdCBlbnRyeVxuICAgIGF3YWl0IHRoaXMuY3JlYXRlQXVkaXRFbnRyeSh7XG4gICAgICBmaXRTaG93U2NvcmVJZDogaWQsXG4gICAgICBhY3Rpb246ICdGSU5BTElaRScsXG4gICAgICBtb2RpZmllZEJ5OiBqdWRnZUlkLFxuICAgICAgbW9kaWZpZWRBdDogdGltZXN0YW1wLFxuICAgICAgcHJldmlvdXNWYWx1ZXM6IHsgaXNGaW5hbGl6ZWQ6IGV4aXN0aW5nLmlzRmluYWxpemVkIH0sXG4gICAgICBuZXdWYWx1ZXM6IHsgaXNGaW5hbGl6ZWQ6IHRydWUgfSxcbiAgICAgIHJlYXNvbjogJ1Njb3JlIGZpbmFsaXplZCBieSBqdWRnZSdcbiAgICB9KTtcblxuICAgIC8vIFVwZGF0ZSBtYWluIHJlY29yZFxuICAgIGF3YWl0IGdldERvY0NsaWVudCgpLnNlbmQobmV3IFB1dENvbW1hbmQoe1xuICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcbiAgICAgIEl0ZW06IHtcbiAgICAgICAgUEs6IGBGSVRfU0hPV19TQ09SRSMke2lkfWAsXG4gICAgICAgIFNLOiAnTUVUQURBVEEnLFxuICAgICAgICAuLi5maW5hbGl6ZWRTY29yZVxuICAgICAgfVxuICAgIH0pKTtcblxuICAgIC8vIFVwZGF0ZSBjYXQgaW5kZXhcbiAgICBhd2FpdCBnZXREb2NDbGllbnQoKS5zZW5kKG5ldyBQdXRDb21tYW5kKHtcbiAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXG4gICAgICBJdGVtOiB7XG4gICAgICAgIFBLOiBgQ0FUIyR7ZXhpc3RpbmcuY2F0SWR9YCxcbiAgICAgICAgU0s6IGBGSVRfU0hPV19TQ09SRSMke2lkfWAsXG4gICAgICAgIGZpdFNob3dTY29yZUlkOiBpZCxcbiAgICAgICAganVkZ2VJZDogZXhpc3RpbmcuanVkZ2VJZCxcbiAgICAgICAganVkZ2VOYW1lOiBleGlzdGluZy5qdWRnZU5hbWUsXG4gICAgICAgIHBhcnRpY2lwYW50TmFtZTogZXhpc3RpbmcucGFydGljaXBhbnROYW1lLFxuICAgICAgICB0b3RhbFNjb3JlOiBleGlzdGluZy50b3RhbFNjb3JlLFxuICAgICAgICB0aW1lc3RhbXAsXG4gICAgICAgIGlzRmluYWxpemVkOiB0cnVlXG4gICAgICB9XG4gICAgfSkpO1xuXG4gICAgLy8gVXBkYXRlIGp1ZGdlIGluZGV4XG4gICAgYXdhaXQgZ2V0RG9jQ2xpZW50KCkuc2VuZChuZXcgUHV0Q29tbWFuZCh7XG4gICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxuICAgICAgSXRlbToge1xuICAgICAgICBQSzogYEpVREdFIyR7ZXhpc3RpbmcuanVkZ2VJZH1gLFxuICAgICAgICBTSzogYEZJVF9TSE9XX1NDT1JFIyR7aWR9YCxcbiAgICAgICAgZml0U2hvd1Njb3JlSWQ6IGlkLFxuICAgICAgICBjYXRJZDogZXhpc3RpbmcuY2F0SWQsXG4gICAgICAgIHBhcnRpY2lwYW50TmFtZTogZXhpc3RpbmcucGFydGljaXBhbnROYW1lLFxuICAgICAgICB0b3RhbFNjb3JlOiBleGlzdGluZy50b3RhbFNjb3JlLFxuICAgICAgICB0aW1lc3RhbXAsXG4gICAgICAgIGlzRmluYWxpemVkOiB0cnVlXG4gICAgICB9XG4gICAgfSkpO1xuXG4gICAgcmV0dXJuIGZpbmFsaXplZFNjb3JlO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbiBhdWRpdCBlbnRyeSBmb3Igc2NvcmUgbW9kaWZpY2F0aW9uc1xuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBjcmVhdGVBdWRpdEVudHJ5KGVudHJ5OiBPbWl0PEZpdFNob3dTY29yZUF1ZGl0RW50cnksICdpZCc+KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgYXVkaXRJZCA9IHV1aWR2NCgpO1xuICAgIGNvbnN0IHRpbWVzdGFtcCA9IGVudHJ5Lm1vZGlmaWVkQXQ7XG5cbiAgICBhd2FpdCBnZXREb2NDbGllbnQoKS5zZW5kKG5ldyBQdXRDb21tYW5kKHtcbiAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXG4gICAgICBJdGVtOiB7XG4gICAgICAgIFBLOiBgRklUX1NIT1dfU0NPUkVfQVVESVQjJHtlbnRyeS5maXRTaG93U2NvcmVJZH1gLFxuICAgICAgICBTSzogYEVOVFJZIyR7dGltZXN0YW1wfSMke2F1ZGl0SWR9YCxcbiAgICAgICAgaWQ6IGF1ZGl0SWQsXG4gICAgICAgIC4uLmVudHJ5XG4gICAgICB9XG4gICAgfSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhdWRpdCBoaXN0b3J5IGZvciBhIGZpdCBhbmQgc2hvdyBzY29yZVxuICAgKi9cbiAgYXN5bmMgZ2V0Rml0U2hvd1Njb3JlQXVkaXRIaXN0b3J5KHNjb3JlSWQ6IHN0cmluZyk6IFByb21pc2U8Rml0U2hvd1Njb3JlQXVkaXRFbnRyeVtdPiB7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZ2V0RG9jQ2xpZW50KCkuc2VuZChuZXcgUXVlcnlDb21tYW5kKHtcbiAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXG4gICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiAnUEsgPSA6cGsgQU5EIGJlZ2luc193aXRoKFNLLCA6c2spJyxcbiAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcbiAgICAgICAgJzpwayc6IGBGSVRfU0hPV19TQ09SRV9BVURJVCMke3Njb3JlSWR9YCxcbiAgICAgICAgJzpzayc6ICdFTlRSWSMnXG4gICAgICB9LFxuICAgICAgU2NhbkluZGV4Rm9yd2FyZDogZmFsc2UgLy8gTW9zdCByZWNlbnQgZmlyc3RcbiAgICB9KSk7XG5cbiAgICBpZiAoIXJlc3VsdC5JdGVtcyB8fCByZXN1bHQuSXRlbXMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdC5JdGVtcy5tYXAoaXRlbSA9PiB7XG4gICAgICBjb25zdCB7IFBLLCBTSywgLi4uYXVkaXRFbnRyeSB9ID0gaXRlbTtcbiAgICAgIHJldHVybiBhdWRpdEVudHJ5IGFzIEZpdFNob3dTY29yZUF1ZGl0RW50cnk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlIGZpdCBhbmQgc2hvdyBzY29yZSB3aXRoIGF1ZGl0IHRyYWlsXG4gICAqL1xuICBhc3luYyB1cGRhdGVGaXRTaG93U2NvcmVXaXRoQXVkaXQoaW5wdXQ6IFVwZGF0ZUZpdFNob3dTY29yZUlucHV0LCByZWFzb24/OiBzdHJpbmcpOiBQcm9taXNlPEZpdFNob3dTY29yZT4ge1xuICAgIGNvbnN0IGV4aXN0aW5nID0gYXdhaXQgdGhpcy5nZXRGaXRTaG93U2NvcmUoaW5wdXQuaWQpO1xuICAgIGlmICghZXhpc3RpbmcpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignRml0IGFuZCBzaG93IHNjb3JlIG5vdCBmb3VuZCcpO1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSBhdWRpdCBlbnRyeSBiZWZvcmUgdXBkYXRlXG4gICAgY29uc3QgdGltZXN0YW1wID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgIGF3YWl0IHRoaXMuY3JlYXRlQXVkaXRFbnRyeSh7XG4gICAgICBmaXRTaG93U2NvcmVJZDogaW5wdXQuaWQsXG4gICAgICBhY3Rpb246ICdVUERBVEUnLFxuICAgICAgbW9kaWZpZWRCeTogaW5wdXQuanVkZ2VJZCxcbiAgICAgIG1vZGlmaWVkQXQ6IHRpbWVzdGFtcCxcbiAgICAgIHByZXZpb3VzVmFsdWVzOiB7IC4uLmV4aXN0aW5nIH0sXG4gICAgICBuZXdWYWx1ZXM6IHsgLi4uaW5wdXQgfSxcbiAgICAgIHJlYXNvbjogcmVhc29uIHx8ICdTY29yZSB1cGRhdGVkIGJ5IGp1ZGdlJ1xuICAgIH0pO1xuXG4gICAgLy8gUGVyZm9ybSB0aGUgdXBkYXRlXG4gICAgcmV0dXJuIHRoaXMudXBkYXRlRml0U2hvd1Njb3JlKGlucHV0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgZml0IGFuZCBzaG93IHNjb3JlIHdpdGggYXVkaXQgdHJhaWxcbiAgICovXG4gIGFzeW5jIGNyZWF0ZUZpdFNob3dTY29yZVdpdGhBdWRpdChpbnB1dDogQ3JlYXRlRml0U2hvd1Njb3JlSW5wdXQpOiBQcm9taXNlPEZpdFNob3dTY29yZT4ge1xuICAgIGNvbnN0IHNjb3JlID0gYXdhaXQgdGhpcy5jcmVhdGVGaXRTaG93U2NvcmUoaW5wdXQpO1xuXG4gICAgLy8gQ3JlYXRlIGF1ZGl0IGVudHJ5IGFmdGVyIGNyZWF0aW9uXG4gICAgYXdhaXQgdGhpcy5jcmVhdGVBdWRpdEVudHJ5KHtcbiAgICAgIGZpdFNob3dTY29yZUlkOiBzY29yZS5pZCxcbiAgICAgIGFjdGlvbjogJ0NSRUFURScsXG4gICAgICBtb2RpZmllZEJ5OiBpbnB1dC5qdWRnZUlkLFxuICAgICAgbW9kaWZpZWRBdDogc2NvcmUuY3JlYXRlZEF0LFxuICAgICAgbmV3VmFsdWVzOiB7IC4uLnNjb3JlIH0sXG4gICAgICByZWFzb246ICdJbml0aWFsIHNjb3JlIGNyZWF0aW9uJ1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHNjb3JlO1xuICB9XG5cbiAgLyoqXG4gICAqIERlbGV0ZSBmaXQgYW5kIHNob3cgc2NvcmUgd2l0aCBhdWRpdCB0cmFpbFxuICAgKi9cbiAgYXN5bmMgZGVsZXRlRml0U2hvd1Njb3JlV2l0aEF1ZGl0KGlkOiBzdHJpbmcsIGp1ZGdlSWQ6IHN0cmluZywgcmVhc29uPzogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgZXhpc3RpbmcgPSBhd2FpdCB0aGlzLmdldEZpdFNob3dTY29yZShpZCk7XG4gICAgaWYgKCFleGlzdGluZykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdGaXQgYW5kIHNob3cgc2NvcmUgbm90IGZvdW5kJyk7XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIGF1ZGl0IGVudHJ5IGJlZm9yZSBkZWxldGlvblxuICAgIGNvbnN0IHRpbWVzdGFtcCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICBhd2FpdCB0aGlzLmNyZWF0ZUF1ZGl0RW50cnkoe1xuICAgICAgZml0U2hvd1Njb3JlSWQ6IGlkLFxuICAgICAgYWN0aW9uOiAnREVMRVRFJyxcbiAgICAgIG1vZGlmaWVkQnk6IGp1ZGdlSWQsXG4gICAgICBtb2RpZmllZEF0OiB0aW1lc3RhbXAsXG4gICAgICBwcmV2aW91c1ZhbHVlczogeyAuLi5leGlzdGluZyB9LFxuICAgICAgcmVhc29uOiByZWFzb24gfHwgJ1Njb3JlIGRlbGV0ZWQgYnkganVkZ2UnXG4gICAgfSk7XG5cbiAgICAvLyBQZXJmb3JtIHRoZSBkZWxldGlvblxuICAgIGF3YWl0IHRoaXMuZGVsZXRlRml0U2hvd1Njb3JlKGlkKTtcbiAgfVxufSJdfQ==