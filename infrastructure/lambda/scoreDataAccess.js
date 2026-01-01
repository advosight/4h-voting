"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScoreDataAccess = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const crypto_1 = require("crypto");
class ScoreDataAccess {
    constructor(docClient, tableName) {
        this.docClient = docClient;
        this.tableName = tableName;
    }
    /**
     * Calculate total score from individual category scores
     */
    calculateTotalScore(firstImpressionScore, originalityScore, informationCardScore, workDoneByMemberScore, basicComfortScore, safetyScore, easyViewOfCatScore) {
        return firstImpressionScore + originalityScore + informationCardScore +
            workDoneByMemberScore + basicComfortScore + safetyScore + easyViewOfCatScore;
    }
    /**
     * Create audit trail entry
     */
    async createAuditEntry(scoreId, action, modifiedBy, previousValues, newValues, reason) {
        const auditId = (0, crypto_1.randomUUID)();
        const timestamp = new Date().toISOString();
        await this.docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: this.tableName,
            Item: {
                PK: `SCORE#${scoreId}`,
                SK: `AUDIT#${timestamp}#${auditId}`,
                id: auditId,
                scoreId,
                action,
                modifiedBy,
                modifiedAt: timestamp,
                previousValues: previousValues ? JSON.stringify(previousValues) : undefined,
                newValues: newValues ? JSON.stringify(newValues) : undefined,
                reason,
            },
        }));
    }
    /**
     * Create a new score record
     */
    async createScore(input, createdBy) {
        const id = (0, crypto_1.randomUUID)();
        const timestamp = new Date().toISOString();
        const totalScore = this.calculateTotalScore(input.firstImpressionScore, input.originalityScore, input.informationCardScore, input.workDoneByMemberScore, input.basicComfortScore, input.safetyScore, input.easyViewOfCatScore);
        const score = {
            id,
            catId: input.catId,
            judgeId: input.judgeId,
            judgeName: input.judgeName,
            firstImpressionScore: input.firstImpressionScore,
            firstImpressionComments: input.firstImpressionComments,
            originalityScore: input.originalityScore,
            originalityComments: input.originalityComments,
            informationCardScore: input.informationCardScore,
            informationCardComments: input.informationCardComments,
            workDoneByMemberScore: input.workDoneByMemberScore,
            workDoneByMemberComments: input.workDoneByMemberComments,
            basicComfortScore: input.basicComfortScore,
            basicComfortComments: input.basicComfortComments,
            safetyScore: input.safetyScore,
            safetyComments: input.safetyComments,
            easyViewOfCatScore: input.easyViewOfCatScore,
            easyViewOfCatComments: input.easyViewOfCatComments,
            totalScore,
            timestamp,
            isFinalized: input.isFinalized || false,
            modificationCount: 0,
            lastModifiedBy: createdBy || input.judgeName,
            lastModifiedAt: timestamp,
        };
        // Store main score record
        await this.docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: this.tableName,
            Item: {
                PK: `SCORE#${id}`,
                SK: 'METADATA',
                ...score,
            },
        }));
        // Store score-by-cat index record
        await this.docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: this.tableName,
            Item: {
                PK: `CAT#${input.catId}`,
                SK: `SCORE#${id}`,
                scoreId: id,
                judgeId: input.judgeId,
                judgeName: input.judgeName,
                totalScore,
                timestamp,
                isFinalized: input.isFinalized || false,
            },
        }));
        // Store score-by-judge index record
        await this.docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: this.tableName,
            Item: {
                PK: `JUDGE#${input.judgeId}`,
                SK: `SCORE#${id}`,
                scoreId: id,
                catId: input.catId,
                totalScore,
                timestamp,
                isFinalized: input.isFinalized || false,
            },
        }));
        // Create audit trail entry for score creation
        await this.createAuditEntry(id, 'CREATE', createdBy || input.judgeName, undefined, score, 'Initial score creation');
        return score;
    }
    /**
     * Get a score by ID
     */
    async getScore(id) {
        const result = await this.docClient.send(new lib_dynamodb_1.GetCommand({
            TableName: this.tableName,
            Key: { PK: `SCORE#${id}`, SK: 'METADATA' },
        }));
        if (!result.Item)
            return null;
        return {
            id: result.Item.id,
            catId: result.Item.catId,
            judgeId: result.Item.judgeId,
            judgeName: result.Item.judgeName,
            firstImpressionScore: parseInt(result.Item.firstImpressionScore) || 0,
            firstImpressionComments: result.Item.firstImpressionComments,
            originalityScore: parseInt(result.Item.originalityScore) || 0,
            originalityComments: result.Item.originalityComments,
            informationCardScore: parseInt(result.Item.informationCardScore) || 0,
            informationCardComments: result.Item.informationCardComments,
            workDoneByMemberScore: parseInt(result.Item.workDoneByMemberScore) || 0,
            workDoneByMemberComments: result.Item.workDoneByMemberComments,
            basicComfortScore: parseInt(result.Item.basicComfortScore) || 0,
            basicComfortComments: result.Item.basicComfortComments,
            safetyScore: parseInt(result.Item.safetyScore) || 0,
            safetyComments: result.Item.safetyComments,
            easyViewOfCatScore: parseInt(result.Item.easyViewOfCatScore) || 0,
            easyViewOfCatComments: result.Item.easyViewOfCatComments,
            totalScore: parseInt(result.Item.totalScore) || 0,
            timestamp: result.Item.timestamp,
            isFinalized: result.Item.isFinalized,
            modificationCount: parseInt(result.Item.modificationCount) || 0,
            lastModifiedBy: result.Item.lastModifiedBy,
            lastModifiedAt: result.Item.lastModifiedAt,
        };
    }
    /**
     * Update an existing score
     */
    async updateScore(id, input, modifiedBy) {
        // First get the existing score
        const existingScore = await this.getScore(id);
        if (!existingScore) {
            throw new Error('Score not found');
        }
        // Store previous values for audit trail
        const previousValues = { ...existingScore };
        // Calculate new total score if any category scores are being updated
        const updatedScore = { ...existingScore, ...input };
        const newTotalScore = this.calculateTotalScore(updatedScore.firstImpressionScore, updatedScore.originalityScore, updatedScore.informationCardScore, updatedScore.workDoneByMemberScore, updatedScore.basicComfortScore, updatedScore.safetyScore, updatedScore.easyViewOfCatScore);
        const timestamp = new Date().toISOString();
        const finalScore = {
            ...updatedScore,
            totalScore: newTotalScore,
            timestamp, // Update timestamp on modification
            modificationCount: existingScore.modificationCount + 1,
            lastModifiedBy: modifiedBy || existingScore.judgeName,
            lastModifiedAt: timestamp,
        };
        // Update main score record with optimistic locking
        await this.docClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: this.tableName,
            Key: {
                PK: `SCORE#${id}`,
                SK: 'METADATA',
            },
            UpdateExpression: `SET 
        firstImpressionScore = :firstImpressionScore,
        firstImpressionComments = :firstImpressionComments,
        originalityScore = :originalityScore,
        originalityComments = :originalityComments,
        informationCardScore = :informationCardScore,
        informationCardComments = :informationCardComments,
        workDoneByMemberScore = :workDoneByMemberScore,
        workDoneByMemberComments = :workDoneByMemberComments,
        basicComfortScore = :basicComfortScore,
        basicComfortComments = :basicComfortComments,
        safetyScore = :safetyScore,
        safetyComments = :safetyComments,
        easyViewOfCatScore = :easyViewOfCatScore,
        easyViewOfCatComments = :easyViewOfCatComments,
        totalScore = :totalScore,
        #timestamp = :timestamp,
        isFinalized = :isFinalized,
        modificationCount = :newModificationCount,
        lastModifiedBy = :lastModifiedBy,
        lastModifiedAt = :lastModifiedAt`,
            ConditionExpression: 'modificationCount = :expectedModificationCount',
            ExpressionAttributeNames: {
                '#timestamp': 'timestamp'
            },
            ExpressionAttributeValues: {
                ':firstImpressionScore': finalScore.firstImpressionScore,
                ':firstImpressionComments': finalScore.firstImpressionComments || null,
                ':originalityScore': finalScore.originalityScore,
                ':originalityComments': finalScore.originalityComments || null,
                ':informationCardScore': finalScore.informationCardScore,
                ':informationCardComments': finalScore.informationCardComments || null,
                ':workDoneByMemberScore': finalScore.workDoneByMemberScore,
                ':workDoneByMemberComments': finalScore.workDoneByMemberComments || null,
                ':basicComfortScore': finalScore.basicComfortScore,
                ':basicComfortComments': finalScore.basicComfortComments || null,
                ':safetyScore': finalScore.safetyScore,
                ':safetyComments': finalScore.safetyComments || null,
                ':easyViewOfCatScore': finalScore.easyViewOfCatScore,
                ':easyViewOfCatComments': finalScore.easyViewOfCatComments || null,
                ':totalScore': finalScore.totalScore,
                ':timestamp': timestamp,
                ':isFinalized': finalScore.isFinalized,
                ':newModificationCount': finalScore.modificationCount,
                ':lastModifiedBy': finalScore.lastModifiedBy,
                ':lastModifiedAt': finalScore.lastModifiedAt,
                ':expectedModificationCount': existingScore.modificationCount
            }
        }));
        // Update score-by-cat index record
        await this.docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: this.tableName,
            Item: {
                PK: `CAT#${existingScore.catId}`,
                SK: `SCORE#${id}`,
                scoreId: id,
                judgeId: existingScore.judgeId,
                judgeName: existingScore.judgeName,
                totalScore: newTotalScore,
                timestamp,
                isFinalized: finalScore.isFinalized,
            },
        }));
        // Update score-by-judge index record
        await this.docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: this.tableName,
            Item: {
                PK: `JUDGE#${existingScore.judgeId}`,
                SK: `SCORE#${id}`,
                scoreId: id,
                catId: existingScore.catId,
                totalScore: newTotalScore,
                timestamp,
                isFinalized: finalScore.isFinalized,
            },
        }));
        // Create audit trail entry for score modification
        await this.createAuditEntry(id, 'UPDATE', modifiedBy || existingScore.judgeName, previousValues, finalScore, input.modificationReason || 'Score updated');
        return finalScore;
    }
    /**
     * Delete a score and all its index records
     */
    async deleteScore(id) {
        const existingScore = await this.getScore(id);
        if (!existingScore) {
            throw new Error('Score not found');
        }
        // Delete main score record
        await this.docClient.send(new lib_dynamodb_1.DeleteCommand({
            TableName: this.tableName,
            Key: { PK: `SCORE#${id}`, SK: 'METADATA' },
        }));
        // Delete score-by-cat index record
        await this.docClient.send(new lib_dynamodb_1.DeleteCommand({
            TableName: this.tableName,
            Key: { PK: `CAT#${existingScore.catId}`, SK: `SCORE#${id}` },
        }));
        // Delete score-by-judge index record
        await this.docClient.send(new lib_dynamodb_1.DeleteCommand({
            TableName: this.tableName,
            Key: { PK: `JUDGE#${existingScore.judgeId}`, SK: `SCORE#${id}` },
        }));
        return existingScore;
    }
    /**
     * Get all scores for a specific cat
     */
    async getScoresByCat(catId) {
        const result = await this.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
            ExpressionAttributeValues: {
                ':pk': `CAT#${catId}`,
                ':sk': 'SCORE#',
            },
        }));
        if (!result.Items || result.Items.length === 0) {
            return [];
        }
        // Get full score details for each score ID
        const scorePromises = result.Items.map(item => this.getScore(item.scoreId));
        const scores = await Promise.all(scorePromises);
        return scores.filter((score) => score !== null);
    }
    /**
     * Get all scores by a specific judge
     */
    async getScoresByJudge(judgeId) {
        const result = await this.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
            ExpressionAttributeValues: {
                ':pk': `JUDGE#${judgeId}`,
                ':sk': 'SCORE#',
            },
        }));
        if (!result.Items || result.Items.length === 0) {
            return [];
        }
        // Get full score details for each score ID
        const scorePromises = result.Items.map(item => this.getScore(item.scoreId));
        const scores = await Promise.all(scorePromises);
        return scores.filter((score) => score !== null);
    }
    /**
     * Get scores for a specific cage number (requires looking up cat first)
     */
    async getScoresByCage(cageNumber) {
        // First find the cat with this cage number
        const catsResult = await this.docClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: this.tableName,
            FilterExpression: 'begins_with(PK, :pk) AND cageNumber = :cageNumber',
            ExpressionAttributeValues: {
                ':pk': 'CAT#',
                ':cageNumber': cageNumber,
            },
        }));
        if (!catsResult.Items || catsResult.Items.length === 0) {
            return [];
        }
        // Get the cat ID (should only be one cat per cage)
        const catId = catsResult.Items[0].PK.replace('CAT#', '');
        return this.getScoresByCat(catId);
    }
    /**
     * List all scores in the system
     */
    async listAllScores() {
        const result = await this.docClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: this.tableName,
            FilterExpression: 'begins_with(PK, :pk) AND SK = :sk',
            ExpressionAttributeValues: {
                ':pk': 'SCORE#',
                ':sk': 'METADATA',
            },
        }));
        if (!result.Items || result.Items.length === 0) {
            return [];
        }
        return result.Items.map(item => ({
            id: item.id,
            catId: item.catId,
            judgeId: item.judgeId,
            judgeName: item.judgeName,
            firstImpressionScore: parseInt(item.firstImpressionScore) || 0,
            firstImpressionComments: item.firstImpressionComments,
            originalityScore: parseInt(item.originalityScore) || 0,
            originalityComments: item.originalityComments,
            informationCardScore: parseInt(item.informationCardScore) || 0,
            informationCardComments: item.informationCardComments,
            workDoneByMemberScore: parseInt(item.workDoneByMemberScore) || 0,
            workDoneByMemberComments: item.workDoneByMemberComments,
            basicComfortScore: parseInt(item.basicComfortScore) || 0,
            basicComfortComments: item.basicComfortComments,
            safetyScore: parseInt(item.safetyScore) || 0,
            safetyComments: item.safetyComments,
            easyViewOfCatScore: parseInt(item.easyViewOfCatScore) || 0,
            easyViewOfCatComments: item.easyViewOfCatComments,
            totalScore: parseInt(item.totalScore) || 0,
            timestamp: item.timestamp,
            isFinalized: item.isFinalized,
            modificationCount: parseInt(item.modificationCount) || 0,
            lastModifiedBy: item.lastModifiedBy,
            lastModifiedAt: item.lastModifiedAt,
        }));
    }
    /**
     * Get audit history for a specific score
     */
    async getScoreAuditHistory(scoreId) {
        const result = await this.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
            ExpressionAttributeValues: {
                ':pk': `SCORE#${scoreId}`,
                ':sk': 'AUDIT#',
            },
            ScanIndexForward: false, // Sort by timestamp descending (newest first)
        }));
        if (!result.Items || result.Items.length === 0) {
            return [];
        }
        return result.Items.map(item => ({
            id: item.id,
            scoreId: item.scoreId,
            action: item.action,
            modifiedBy: item.modifiedBy,
            modifiedAt: item.modifiedAt,
            previousValues: item.previousValues ? JSON.parse(item.previousValues) : undefined,
            newValues: item.newValues ? JSON.parse(item.newValues) : undefined,
            reason: item.reason,
        }));
    }
}
exports.ScoreDataAccess = ScoreDataAccess;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NvcmVEYXRhQWNjZXNzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2NvcmVEYXRhQWNjZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHdEQUFnSjtBQUNoSixtQ0FBb0M7QUFnRnBDLE1BQWEsZUFBZTtJQUMxQixZQUFvQixTQUFpQyxFQUFVLFNBQWlCO1FBQTVELGNBQVMsR0FBVCxTQUFTLENBQXdCO1FBQVUsY0FBUyxHQUFULFNBQVMsQ0FBUTtJQUFHLENBQUM7SUFFcEY7O09BRUc7SUFDSyxtQkFBbUIsQ0FDekIsb0JBQTRCLEVBQzVCLGdCQUF3QixFQUN4QixvQkFBNEIsRUFDNUIscUJBQTZCLEVBQzdCLGlCQUF5QixFQUN6QixXQUFtQixFQUNuQixrQkFBMEI7UUFFMUIsT0FBTyxvQkFBb0IsR0FBRyxnQkFBZ0IsR0FBRyxvQkFBb0I7WUFDOUQscUJBQXFCLEdBQUcsaUJBQWlCLEdBQUcsV0FBVyxHQUFHLGtCQUFrQixDQUFDO0lBQ3RGLENBQUM7SUFFRDs7T0FFRztJQUNLLEtBQUssQ0FBQyxnQkFBZ0IsQ0FDNUIsT0FBZSxFQUNmLE1BQWMsRUFDZCxVQUFrQixFQUNsQixjQUFvQixFQUNwQixTQUFlLEVBQ2YsTUFBZTtRQUVmLE1BQU0sT0FBTyxHQUFHLElBQUEsbUJBQVUsR0FBRSxDQUFDO1FBQzdCLE1BQU0sU0FBUyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUM7UUFFM0MsTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLHlCQUFVLENBQUM7WUFDdkMsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTO1lBQ3pCLElBQUksRUFBRTtnQkFDSixFQUFFLEVBQUUsU0FBUyxPQUFPLEVBQUU7Z0JBQ3RCLEVBQUUsRUFBRSxTQUFTLFNBQVMsSUFBSSxPQUFPLEVBQUU7Z0JBQ25DLEVBQUUsRUFBRSxPQUFPO2dCQUNYLE9BQU87Z0JBQ1AsTUFBTTtnQkFDTixVQUFVO2dCQUNW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QyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUztZQUNqRixTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVM7WUFDbEUsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO1NBQ3BCLENBQUMsQ0FBQyxDQUFDO0lBQ04sQ0FBQztDQUNGO0FBOWVELDBDQThlQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IER5bmFtb0RCRG9jdW1lbnRDbGllbnQsIFNjYW5Db21tYW5kLCBHZXRDb21tYW5kLCBQdXRDb21tYW5kLCBVcGRhdGVDb21tYW5kLCBEZWxldGVDb21tYW5kLCBRdWVyeUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xuaW1wb3J0IHsgcmFuZG9tVVVJRCB9IGZyb20gJ2NyeXB0byc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2NvcmUge1xuICBpZDogc3RyaW5nO1xuICBjYXRJZDogc3RyaW5nO1xuICBqdWRnZUlkOiBzdHJpbmc7XG4gIGp1ZGdlTmFtZTogc3RyaW5nO1xuICBmaXJzdEltcHJlc3Npb25TY29yZTogbnVtYmVyO1xuICBmaXJzdEltcHJlc3Npb25Db21tZW50cz86IHN0cmluZztcbiAgb3JpZ2luYWxpdHlTY29yZTogbnVtYmVyO1xuICBvcmlnaW5hbGl0eUNvbW1lbnRzPzogc3RyaW5nO1xuICBpbmZvcm1hdGlvbkNhcmRTY29yZTogbnVtYmVyO1xuICBpbmZvcm1hdGlvbkNhcmRDb21tZW50cz86IHN0cmluZztcbiAgd29ya0RvbmVCeU1lbWJlclNjb3JlOiBudW1iZXI7XG4gIHdvcmtEb25lQnlNZW1iZXJDb21tZW50cz86IHN0cmluZztcbiAgYmFzaWNDb21mb3J0U2NvcmU6IG51bWJlcjtcbiAgYmFzaWNDb21mb3J0Q29tbWVudHM/OiBzdHJpbmc7XG4gIHNhZmV0eVNjb3JlOiBudW1iZXI7XG4gIHNhZmV0eUNvbW1lbnRzPzogc3RyaW5nO1xuICBlYXN5Vmlld09mQ2F0U2NvcmU6IG51bWJlcjtcbiAgZWFzeVZpZXdPZkNhdENvbW1lbnRzPzogc3RyaW5nO1xuICB0b3RhbFNjb3JlOiBudW1iZXI7XG4gIHRpbWVzdGFtcDogc3RyaW5nO1xuICBpc0ZpbmFsaXplZDogYm9vbGVhbjtcbiAgbW9kaWZpY2F0aW9uQ291bnQ6IG51bWJlcjtcbiAgbGFzdE1vZGlmaWVkQnk/OiBzdHJpbmc7XG4gIGxhc3RNb2RpZmllZEF0Pzogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFNjb3JlQXVkaXRFbnRyeSB7XG4gIGlkOiBzdHJpbmc7XG4gIHNjb3JlSWQ6IHN0cmluZztcbiAgYWN0aW9uOiBzdHJpbmc7XG4gIG1vZGlmaWVkQnk6IHN0cmluZztcbiAgbW9kaWZpZWRBdDogc3RyaW5nO1xuICBwcmV2aW91c1ZhbHVlcz86IGFueTtcbiAgbmV3VmFsdWVzPzogYW55O1xuICByZWFzb24/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ3JlYXRlU2NvcmVJbnB1dCB7XG4gIGNhdElkOiBzdHJpbmc7XG4gIGp1ZGdlSWQ6IHN0cmluZztcbiAganVkZ2VOYW1lOiBzdHJpbmc7XG4gIGZpcnN0SW1wcmVzc2lvblNjb3JlOiBudW1iZXI7XG4gIGZpcnN0SW1wcmVzc2lvbkNvbW1lbnRzPzogc3RyaW5nO1xuICBvcmlnaW5hbGl0eVNjb3JlOiBudW1iZXI7XG4gIG9yaWdpbmFsaXR5Q29tbWVudHM/OiBzdHJpbmc7XG4gIGluZm9ybWF0aW9uQ2FyZFNjb3JlOiBudW1iZXI7XG4gIGluZm9ybWF0aW9uQ2FyZENvbW1lbnRzPzogc3RyaW5nO1xuICB3b3JrRG9uZUJ5TWVtYmVyU2NvcmU6IG51bWJlcjtcbiAgd29ya0RvbmVCeU1lbWJlckNvbW1lbnRzPzogc3RyaW5nO1xuICBiYXNpY0NvbWZvcnRTY29yZTogbnVtYmVyO1xuICBiYXNpY0NvbWZvcnRDb21tZW50cz86IHN0cmluZztcbiAgc2FmZXR5U2NvcmU6IG51bWJlcjtcbiAgc2FmZXR5Q29tbWVudHM/OiBzdHJpbmc7XG4gIGVhc3lWaWV3T2ZDYXRTY29yZTogbnVtYmVyO1xuICBlYXN5Vmlld09mQ2F0Q29tbWVudHM/OiBzdHJpbmc7XG4gIGlzRmluYWxpemVkPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBVcGRhdGVTY29yZUlucHV0IHtcbiAgZmlyc3RJbXByZXNzaW9uU2NvcmU/OiBudW1iZXI7XG4gIGZpcnN0SW1wcmVzc2lvbkNvbW1lbnRzPzogc3RyaW5nO1xuICBvcmlnaW5hbGl0eVNjb3JlPzogbnVtYmVyO1xuICBvcmlnaW5hbGl0eUNvbW1lbnRzPzogc3RyaW5nO1xuICBpbmZvcm1hdGlvbkNhcmRTY29yZT86IG51bWJlcjtcbiAgaW5mb3JtYXRpb25DYXJkQ29tbWVudHM/OiBzdHJpbmc7XG4gIHdvcmtEb25lQnlNZW1iZXJTY29yZT86IG51bWJlcjtcbiAgd29ya0RvbmVCeU1lbWJlckNvbW1lbnRzPzogc3RyaW5nO1xuICBiYXNpY0NvbWZvcnRTY29yZT86IG51bWJlcjtcbiAgYmFzaWNDb21mb3J0Q29tbWVudHM/OiBzdHJpbmc7XG4gIHNhZmV0eVNjb3JlPzogbnVtYmVyO1xuICBzYWZldHlDb21tZW50cz86IHN0cmluZztcbiAgZWFzeVZpZXdPZkNhdFNjb3JlPzogbnVtYmVyO1xuICBlYXN5Vmlld09mQ2F0Q29tbWVudHM/OiBzdHJpbmc7XG4gIGlzRmluYWxpemVkPzogYm9vbGVhbjtcbiAgbW9kaWZpY2F0aW9uUmVhc29uPzogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgU2NvcmVEYXRhQWNjZXNzIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBkb2NDbGllbnQ6IER5bmFtb0RCRG9jdW1lbnRDbGllbnQsIHByaXZhdGUgdGFibGVOYW1lOiBzdHJpbmcpIHt9XG5cbiAgLyoqXG4gICAqIENhbGN1bGF0ZSB0b3RhbCBzY29yZSBmcm9tIGluZGl2aWR1YWwgY2F0ZWdvcnkgc2NvcmVzXG4gICAqL1xuICBwcml2YXRlIGNhbGN1bGF0ZVRvdGFsU2NvcmUoXG4gICAgZmlyc3RJbXByZXNzaW9uU2NvcmU6IG51bWJlcixcbiAgICBvcmlnaW5hbGl0eVNjb3JlOiBudW1iZXIsXG4gICAgaW5mb3JtYXRpb25DYXJkU2NvcmU6IG51bWJlcixcbiAgICB3b3JrRG9uZUJ5TWVtYmVyU2NvcmU6IG51bWJlcixcbiAgICBiYXNpY0NvbWZvcnRTY29yZTogbnVtYmVyLFxuICAgIHNhZmV0eVNjb3JlOiBudW1iZXIsXG4gICAgZWFzeVZpZXdPZkNhdFNjb3JlOiBudW1iZXJcbiAgKTogbnVtYmVyIHtcbiAgICByZXR1cm4gZmlyc3RJbXByZXNzaW9uU2NvcmUgKyBvcmlnaW5hbGl0eVNjb3JlICsgaW5mb3JtYXRpb25DYXJkU2NvcmUgKyBcbiAgICAgICAgICAgd29ya0RvbmVCeU1lbWJlclNjb3JlICsgYmFzaWNDb21mb3J0U2NvcmUgKyBzYWZldHlTY29yZSArIGVhc3lWaWV3T2ZDYXRTY29yZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYXVkaXQgdHJhaWwgZW50cnlcbiAgICovXG4gIHByaXZhdGUgYXN5bmMgY3JlYXRlQXVkaXRFbnRyeShcbiAgICBzY29yZUlkOiBzdHJpbmcsXG4gICAgYWN0aW9uOiBzdHJpbmcsXG4gICAgbW9kaWZpZWRCeTogc3RyaW5nLFxuICAgIHByZXZpb3VzVmFsdWVzPzogYW55LFxuICAgIG5ld1ZhbHVlcz86IGFueSxcbiAgICByZWFzb24/OiBzdHJpbmdcbiAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgYXVkaXRJZCA9IHJhbmRvbVVVSUQoKTtcbiAgICBjb25zdCB0aW1lc3RhbXAgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG5cbiAgICBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKG5ldyBQdXRDb21tYW5kKHtcbiAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXG4gICAgICBJdGVtOiB7XG4gICAgICAgIFBLOiBgU0NPUkUjJHtzY29yZUlkfWAsXG4gICAgICAgIFNLOiBgQVVESVQjJHt0aW1lc3RhbXB9IyR7YXVkaXRJZH1gLFxuICAgICAgICBpZDogYXVkaXRJZCxcbiAgICAgICAgc2NvcmVJZCxcbiAgICAgICAgYWN0aW9uLFxuICAgICAgICBtb2RpZmllZEJ5LFxuICAgICAgICBtb2RpZmllZEF0OiB0aW1lc3RhbXAsXG4gICAgICAgIHByZXZpb3VzVmFsdWVzOiBwcmV2aW91c1ZhbHVlcyA/IEpTT04uc3RyaW5naWZ5KHByZXZpb3VzVmFsdWVzKSA6IHVuZGVmaW5lZCxcbiAgICAgICAgbmV3VmFsdWVzOiBuZXdWYWx1ZXMgPyBKU09OLnN0cmluZ2lmeShuZXdWYWx1ZXMpIDogdW5kZWZpbmVkLFxuICAgICAgICByZWFzb24sXG4gICAgICB9LFxuICAgIH0pKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBuZXcgc2NvcmUgcmVjb3JkXG4gICAqL1xuICBhc3luYyBjcmVhdGVTY29yZShpbnB1dDogQ3JlYXRlU2NvcmVJbnB1dCwgY3JlYXRlZEJ5Pzogc3RyaW5nKTogUHJvbWlzZTxTY29yZT4ge1xuICAgIGNvbnN0IGlkID0gcmFuZG9tVVVJRCgpO1xuICAgIGNvbnN0IHRpbWVzdGFtcCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICBjb25zdCB0b3RhbFNjb3JlID0gdGhpcy5jYWxjdWxhdGVUb3RhbFNjb3JlKFxuICAgICAgaW5wdXQuZmlyc3RJbXByZXNzaW9uU2NvcmUsXG4gICAgICBpbnB1dC5vcmlnaW5hbGl0eVNjb3JlLFxuICAgICAgaW5wdXQuaW5mb3JtYXRpb25DYXJkU2NvcmUsXG4gICAgICBpbnB1dC53b3JrRG9uZUJ5TWVtYmVyU2NvcmUsXG4gICAgICBpbnB1dC5iYXNpY0NvbWZvcnRTY29yZSxcbiAgICAgIGlucHV0LnNhZmV0eVNjb3JlLFxuICAgICAgaW5wdXQuZWFzeVZpZXdPZkNhdFNjb3JlXG4gICAgKTtcblxuICAgIGNvbnN0IHNjb3JlOiBTY29yZSA9IHtcbiAgICAgIGlkLFxuICAgICAgY2F0SWQ6IGlucHV0LmNhdElkLFxuICAgICAganVkZ2VJZDogaW5wdXQuanVkZ2VJZCxcbiAgICAgIGp1ZGdlTmFtZTogaW5wdXQuanVkZ2VOYW1lLFxuICAgICAgZmlyc3RJbXByZXNzaW9uU2NvcmU6IGlucHV0LmZpcnN0SW1wcmVzc2lvblNjb3JlLFxuICAgICAgZmlyc3RJbXByZXNzaW9uQ29tbWVudHM6IGlucHV0LmZpcnN0SW1wcmVzc2lvbkNvbW1lbnRzLFxuICAgICAgb3JpZ2luYWxpdHlTY29yZTogaW5wdXQub3JpZ2luYWxpdHlTY29yZSxcbiAgICAgIG9yaWdpbmFsaXR5Q29tbWVudHM6IGlucHV0Lm9yaWdpbmFsaXR5Q29tbWVudHMsXG4gICAgICBpbmZvcm1hdGlvbkNhcmRTY29yZTogaW5wdXQuaW5mb3JtYXRpb25DYXJkU2NvcmUsXG4gICAgICBpbmZvcm1hdGlvbkNhcmRDb21tZW50czogaW5wdXQuaW5mb3JtYXRpb25DYXJkQ29tbWVudHMsXG4gICAgICB3b3JrRG9uZUJ5TWVtYmVyU2NvcmU6IGlucHV0LndvcmtEb25lQnlNZW1iZXJTY29yZSxcbiAgICAgIHdvcmtEb25lQnlNZW1iZXJDb21tZW50czogaW5wdXQud29ya0RvbmVCeU1lbWJlckNvbW1lbnRzLFxuICAgICAgYmFzaWNDb21mb3J0U2NvcmU6IGlucHV0LmJhc2ljQ29tZm9ydFNjb3JlLFxuICAgICAgYmFzaWNDb21mb3J0Q29tbWVudHM6IGlucHV0LmJhc2ljQ29tZm9ydENvbW1lbnRzLFxuICAgICAgc2FmZXR5U2NvcmU6IGlucHV0LnNhZmV0eVNjb3JlLFxuICAgICAgc2FmZXR5Q29tbWVudHM6IGlucHV0LnNhZmV0eUNvbW1lbnRzLFxuICAgICAgZWFzeVZpZXdPZkNhdFNjb3JlOiBpbnB1dC5lYXN5Vmlld09mQ2F0U2NvcmUsXG4gICAgICBlYXN5Vmlld09mQ2F0Q29tbWVudHM6IGlucHV0LmVhc3lWaWV3T2ZDYXRDb21tZW50cyxcbiAgICAgIHRvdGFsU2NvcmUsXG4gICAgICB0aW1lc3RhbXAsXG4gICAgICBpc0ZpbmFsaXplZDogaW5wdXQuaXNGaW5hbGl6ZWQgfHwgZmFsc2UsXG4gICAgICBtb2RpZmljYXRpb25Db3VudDogMCxcbiAgICAgIGxhc3RNb2RpZmllZEJ5OiBjcmVhdGVkQnkgfHwgaW5wdXQuanVkZ2VOYW1lLFxuICAgICAgbGFzdE1vZGlmaWVkQXQ6IHRpbWVzdGFtcCxcbiAgICB9O1xuXG4gICAgLy8gU3RvcmUgbWFpbiBzY29yZSByZWNvcmRcbiAgICBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKG5ldyBQdXRDb21tYW5kKHtcbiAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXG4gICAgICBJdGVtOiB7XG4gICAgICAgIFBLOiBgU0NPUkUjJHtpZH1gLFxuICAgICAgICBTSzogJ01FVEFEQVRBJyxcbiAgICAgICAgLi4uc2NvcmUsXG4gICAgICB9LFxuICAgIH0pKTtcblxuICAgIC8vIFN0b3JlIHNjb3JlLWJ5LWNhdCBpbmRleCByZWNvcmRcbiAgICBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKG5ldyBQdXRDb21tYW5kKHtcbiAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXG4gICAgICBJdGVtOiB7XG4gICAgICAgIFBLOiBgQ0FUIyR7aW5wdXQuY2F0SWR9YCxcbiAgICAgICAgU0s6IGBTQ09SRSMke2lkfWAsXG4gICAgICAgIHNjb3JlSWQ6IGlkLFxuICAgICAgICBqdWRnZUlkOiBpbnB1dC5qdWRnZUlkLFxuICAgICAgICBqdWRnZU5hbWU6IGlucHV0Lmp1ZGdlTmFtZSxcbiAgICAgICAgdG90YWxTY29yZSxcbiAgICAgICAgdGltZXN0YW1wLFxuICAgICAgICBpc0ZpbmFsaXplZDogaW5wdXQuaXNGaW5hbGl6ZWQgfHwgZmFsc2UsXG4gICAgICB9LFxuICAgIH0pKTtcblxuICAgIC8vIFN0b3JlIHNjb3JlLWJ5LWp1ZGdlIGluZGV4IHJlY29yZFxuICAgIGF3YWl0IHRoaXMuZG9jQ2xpZW50LnNlbmQobmV3IFB1dENvbW1hbmQoe1xuICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcbiAgICAgIEl0ZW06IHtcbiAgICAgICAgUEs6IGBKVURHRSMke2lucHV0Lmp1ZGdlSWR9YCxcbiAgICAgICAgU0s6IGBTQ09SRSMke2lkfWAsXG4gICAgICAgIHNjb3JlSWQ6IGlkLFxuICAgICAgICBjYXRJZDogaW5wdXQuY2F0SWQsXG4gICAgICAgIHRvdGFsU2NvcmUsXG4gICAgICAgIHRpbWVzdGFtcCxcbiAgICAgICAgaXNGaW5hbGl6ZWQ6IGlucHV0LmlzRmluYWxpemVkIHx8IGZhbHNlLFxuICAgICAgfSxcbiAgICB9KSk7XG5cbiAgICAvLyBDcmVhdGUgYXVkaXQgdHJhaWwgZW50cnkgZm9yIHNjb3JlIGNyZWF0aW9uXG4gICAgYXdhaXQgdGhpcy5jcmVhdGVBdWRpdEVudHJ5KFxuICAgICAgaWQsXG4gICAgICAnQ1JFQVRFJyxcbiAgICAgIGNyZWF0ZWRCeSB8fCBpbnB1dC5qdWRnZU5hbWUsXG4gICAgICB1bmRlZmluZWQsXG4gICAgICBzY29yZSxcbiAgICAgICdJbml0aWFsIHNjb3JlIGNyZWF0aW9uJ1xuICAgICk7XG5cbiAgICByZXR1cm4gc2NvcmU7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGEgc2NvcmUgYnkgSURcbiAgICovXG4gIGFzeW5jIGdldFNjb3JlKGlkOiBzdHJpbmcpOiBQcm9taXNlPFNjb3JlIHwgbnVsbD4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZG9jQ2xpZW50LnNlbmQobmV3IEdldENvbW1hbmQoe1xuICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcbiAgICAgIEtleTogeyBQSzogYFNDT1JFIyR7aWR9YCwgU0s6ICdNRVRBREFUQScgfSxcbiAgICB9KSk7XG5cbiAgICBpZiAoIXJlc3VsdC5JdGVtKSByZXR1cm4gbnVsbDtcblxuICAgIHJldHVybiB7XG4gICAgICBpZDogcmVzdWx0Lkl0ZW0uaWQsXG4gICAgICBjYXRJZDogcmVzdWx0Lkl0ZW0uY2F0SWQsXG4gICAgICBqdWRnZUlkOiByZXN1bHQuSXRlbS5qdWRnZUlkLFxuICAgICAganVkZ2VOYW1lOiByZXN1bHQuSXRlbS5qdWRnZU5hbWUsXG4gICAgICBmaXJzdEltcHJlc3Npb25TY29yZTogcGFyc2VJbnQocmVzdWx0Lkl0ZW0uZmlyc3RJbXByZXNzaW9uU2NvcmUpIHx8IDAsXG4gICAgICBmaXJzdEltcHJlc3Npb25Db21tZW50czogcmVzdWx0Lkl0ZW0uZmlyc3RJbXByZXNzaW9uQ29tbWVudHMsXG4gICAgICBvcmlnaW5hbGl0eVNjb3JlOiBwYXJzZUludChyZXN1bHQuSXRlbS5vcmlnaW5hbGl0eVNjb3JlKSB8fCAwLFxuICAgICAgb3JpZ2luYWxpdHlDb21tZW50czogcmVzdWx0Lkl0ZW0ub3JpZ2luYWxpdHlDb21tZW50cyxcbiAgICAgIGluZm9ybWF0aW9uQ2FyZFNjb3JlOiBwYXJzZUludChyZXN1bHQuSXRlbS5pbmZvcm1hdGlvbkNhcmRTY29yZSkgfHwgMCxcbiAgICAgIGluZm9ybWF0aW9uQ2FyZENvbW1lbnRzOiByZXN1bHQuSXRlbS5pbmZvcm1hdGlvbkNhcmRDb21tZW50cyxcbiAgICAgIHdvcmtEb25lQnlNZW1iZXJTY29yZTogcGFyc2VJbnQocmVzdWx0Lkl0ZW0ud29ya0RvbmVCeU1lbWJlclNjb3JlKSB8fCAwLFxuICAgICAgd29ya0RvbmVCeU1lbWJlckNvbW1lbnRzOiByZXN1bHQuSXRlbS53b3JrRG9uZUJ5TWVtYmVyQ29tbWVudHMsXG4gICAgICBiYXNpY0NvbWZvcnRTY29yZTogcGFyc2VJbnQocmVzdWx0Lkl0ZW0uYmFzaWNDb21mb3J0U2NvcmUpIHx8IDAsXG4gICAgICBiYXNpY0NvbWZvcnRDb21tZW50czogcmVzdWx0Lkl0ZW0uYmFzaWNDb21mb3J0Q29tbWVudHMsXG4gICAgICBzYWZldHlTY29yZTogcGFyc2VJbnQocmVzdWx0Lkl0ZW0uc2FmZXR5U2NvcmUpIHx8IDAsXG4gICAgICBzYWZldHlDb21tZW50czogcmVzdWx0Lkl0ZW0uc2FmZXR5Q29tbWVudHMsXG4gICAgICBlYXN5Vmlld09mQ2F0U2NvcmU6IHBhcnNlSW50KHJlc3VsdC5JdGVtLmVhc3lWaWV3T2ZDYXRTY29yZSkgfHwgMCxcbiAgICAgIGVhc3lWaWV3T2ZDYXRDb21tZW50czogcmVzdWx0Lkl0ZW0uZWFzeVZpZXdPZkNhdENvbW1lbnRzLFxuICAgICAgdG90YWxTY29yZTogcGFyc2VJbnQocmVzdWx0Lkl0ZW0udG90YWxTY29yZSkgfHwgMCxcbiAgICAgIHRpbWVzdGFtcDogcmVzdWx0Lkl0ZW0udGltZXN0YW1wLFxuICAgICAgaXNGaW5hbGl6ZWQ6IHJlc3VsdC5JdGVtLmlzRmluYWxpemVkLFxuICAgICAgbW9kaWZpY2F0aW9uQ291bnQ6IHBhcnNlSW50KHJlc3VsdC5JdGVtLm1vZGlmaWNhdGlvbkNvdW50KSB8fCAwLFxuICAgICAgbGFzdE1vZGlmaWVkQnk6IHJlc3VsdC5JdGVtLmxhc3RNb2RpZmllZEJ5LFxuICAgICAgbGFzdE1vZGlmaWVkQXQ6IHJlc3VsdC5JdGVtLmxhc3RNb2RpZmllZEF0LFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlIGFuIGV4aXN0aW5nIHNjb3JlXG4gICAqL1xuICBhc3luYyB1cGRhdGVTY29yZShpZDogc3RyaW5nLCBpbnB1dDogVXBkYXRlU2NvcmVJbnB1dCwgbW9kaWZpZWRCeT86IHN0cmluZyk6IFByb21pc2U8U2NvcmU+IHtcbiAgICAvLyBGaXJzdCBnZXQgdGhlIGV4aXN0aW5nIHNjb3JlXG4gICAgY29uc3QgZXhpc3RpbmdTY29yZSA9IGF3YWl0IHRoaXMuZ2V0U2NvcmUoaWQpO1xuICAgIGlmICghZXhpc3RpbmdTY29yZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdTY29yZSBub3QgZm91bmQnKTtcbiAgICB9XG5cbiAgICAvLyBTdG9yZSBwcmV2aW91cyB2YWx1ZXMgZm9yIGF1ZGl0IHRyYWlsXG4gICAgY29uc3QgcHJldmlvdXNWYWx1ZXMgPSB7IC4uLmV4aXN0aW5nU2NvcmUgfTtcblxuICAgIC8vIENhbGN1bGF0ZSBuZXcgdG90YWwgc2NvcmUgaWYgYW55IGNhdGVnb3J5IHNjb3JlcyBhcmUgYmVpbmcgdXBkYXRlZFxuICAgIGNvbnN0IHVwZGF0ZWRTY29yZSA9IHsgLi4uZXhpc3RpbmdTY29yZSwgLi4uaW5wdXQgfTtcbiAgICBjb25zdCBuZXdUb3RhbFNjb3JlID0gdGhpcy5jYWxjdWxhdGVUb3RhbFNjb3JlKFxuICAgICAgdXBkYXRlZFNjb3JlLmZpcnN0SW1wcmVzc2lvblNjb3JlLFxuICAgICAgdXBkYXRlZFNjb3JlLm9yaWdpbmFsaXR5U2NvcmUsXG4gICAgICB1cGRhdGVkU2NvcmUuaW5mb3JtYXRpb25DYXJkU2NvcmUsXG4gICAgICB1cGRhdGVkU2NvcmUud29ya0RvbmVCeU1lbWJlclNjb3JlLFxuICAgICAgdXBkYXRlZFNjb3JlLmJhc2ljQ29tZm9ydFNjb3JlLFxuICAgICAgdXBkYXRlZFNjb3JlLnNhZmV0eVNjb3JlLFxuICAgICAgdXBkYXRlZFNjb3JlLmVhc3lWaWV3T2ZDYXRTY29yZVxuICAgICk7XG5cbiAgICBjb25zdCB0aW1lc3RhbXAgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgY29uc3QgZmluYWxTY29yZTogU2NvcmUgPSB7XG4gICAgICAuLi51cGRhdGVkU2NvcmUsXG4gICAgICB0b3RhbFNjb3JlOiBuZXdUb3RhbFNjb3JlLFxuICAgICAgdGltZXN0YW1wLCAvLyBVcGRhdGUgdGltZXN0YW1wIG9uIG1vZGlmaWNhdGlvblxuICAgICAgbW9kaWZpY2F0aW9uQ291bnQ6IGV4aXN0aW5nU2NvcmUubW9kaWZpY2F0aW9uQ291bnQgKyAxLFxuICAgICAgbGFzdE1vZGlmaWVkQnk6IG1vZGlmaWVkQnkgfHwgZXhpc3RpbmdTY29yZS5qdWRnZU5hbWUsXG4gICAgICBsYXN0TW9kaWZpZWRBdDogdGltZXN0YW1wLFxuICAgIH07XG5cbiAgICAvLyBVcGRhdGUgbWFpbiBzY29yZSByZWNvcmQgd2l0aCBvcHRpbWlzdGljIGxvY2tpbmdcbiAgICBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKG5ldyBVcGRhdGVDb21tYW5kKHtcbiAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXG4gICAgICBLZXk6IHtcbiAgICAgICAgUEs6IGBTQ09SRSMke2lkfWAsXG4gICAgICAgIFNLOiAnTUVUQURBVEEnLFxuICAgICAgfSxcbiAgICAgIFVwZGF0ZUV4cHJlc3Npb246IGBTRVQgXG4gICAgICAgIGZpcnN0SW1wcmVzc2lvblNjb3JlID0gOmZpcnN0SW1wcmVzc2lvblNjb3JlLFxuICAgICAgICBmaXJzdEltcHJlc3Npb25Db21tZW50cyA9IDpmaXJzdEltcHJlc3Npb25Db21tZW50cyxcbiAgICAgICAgb3JpZ2luYWxpdHlTY29yZSA9IDpvcmlnaW5hbGl0eVNjb3JlLFxuICAgICAgICBvcmlnaW5hbGl0eUNvbW1lbnRzID0gOm9yaWdpbmFsaXR5Q29tbWVudHMsXG4gICAgICAgIGluZm9ybWF0aW9uQ2FyZFNjb3JlID0gOmluZm9ybWF0aW9uQ2FyZFNjb3JlLFxuICAgICAgICBpbmZvcm1hdGlvbkNhcmRDb21tZW50cyA9IDppbmZvcm1hdGlvbkNhcmRDb21tZW50cyxcbiAgICAgICAgd29ya0RvbmVCeU1lbWJlclNjb3JlID0gOndvcmtEb25lQnlNZW1iZXJTY29yZSxcbiAgICAgICAgd29ya0RvbmVCeU1lbWJlckNvbW1lbnRzID0gOndvcmtEb25lQnlNZW1iZXJDb21tZW50cyxcbiAgICAgICAgYmFzaWNDb21mb3J0U2NvcmUgPSA6YmFzaWNDb21mb3J0U2NvcmUsXG4gICAgICAgIGJhc2ljQ29tZm9ydENvbW1lbnRzID0gOmJhc2ljQ29tZm9ydENvbW1lbnRzLFxuICAgICAgICBzYWZldHlTY29yZSA9IDpzYWZldHlTY29yZSxcbiAgICAgICAgc2FmZXR5Q29tbWVudHMgPSA6c2FmZXR5Q29tbWVudHMsXG4gICAgICAgIGVhc3lWaWV3T2ZDYXRTY29yZSA9IDplYXN5Vmlld09mQ2F0U2NvcmUsXG4gICAgICAgIGVhc3lWaWV3T2ZDYXRDb21tZW50cyA9IDplYXN5Vmlld09mQ2F0Q29tbWVudHMsXG4gICAgICAgIHRvdGFsU2NvcmUgPSA6dG90YWxTY29yZSxcbiAgICAgICAgI3RpbWVzdGFtcCA9IDp0aW1lc3RhbXAsXG4gICAgICAgIGlzRmluYWxpemVkID0gOmlzRmluYWxpemVkLFxuICAgICAgICBtb2RpZmljYXRpb25Db3VudCA9IDpuZXdNb2RpZmljYXRpb25Db3VudCxcbiAgICAgICAgbGFzdE1vZGlmaWVkQnkgPSA6bGFzdE1vZGlmaWVkQnksXG4gICAgICAgIGxhc3RNb2RpZmllZEF0ID0gOmxhc3RNb2RpZmllZEF0YCxcbiAgICAgIENvbmRpdGlvbkV4cHJlc3Npb246ICdtb2RpZmljYXRpb25Db3VudCA9IDpleHBlY3RlZE1vZGlmaWNhdGlvbkNvdW50JyxcbiAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lczoge1xuICAgICAgICAnI3RpbWVzdGFtcCc6ICd0aW1lc3RhbXAnXG4gICAgICB9LFxuICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xuICAgICAgICAnOmZpcnN0SW1wcmVzc2lvblNjb3JlJzogZmluYWxTY29yZS5maXJzdEltcHJlc3Npb25TY29yZSxcbiAgICAgICAgJzpmaXJzdEltcHJlc3Npb25Db21tZW50cyc6IGZpbmFsU2NvcmUuZmlyc3RJbXByZXNzaW9uQ29tbWVudHMgfHwgbnVsbCxcbiAgICAgICAgJzpvcmlnaW5hbGl0eVNjb3JlJzogZmluYWxTY29yZS5vcmlnaW5hbGl0eVNjb3JlLFxuICAgICAgICAnOm9yaWdpbmFsaXR5Q29tbWVudHMnOiBmaW5hbFNjb3JlLm9yaWdpbmFsaXR5Q29tbWVudHMgfHwgbnVsbCxcbiAgICAgICAgJzppbmZvcm1hdGlvbkNhcmRTY29yZSc6IGZpbmFsU2NvcmUuaW5mb3JtYXRpb25DYXJkU2NvcmUsXG4gICAgICAgICc6aW5mb3JtYXRpb25DYXJkQ29tbWVudHMnOiBmaW5hbFNjb3JlLmluZm9ybWF0aW9uQ2FyZENvbW1lbnRzIHx8IG51bGwsXG4gICAgICAgICc6d29ya0RvbmVCeU1lbWJlclNjb3JlJzogZmluYWxTY29yZS53b3JrRG9uZUJ5TWVtYmVyU2NvcmUsXG4gICAgICAgICc6d29ya0RvbmVCeU1lbWJlckNvbW1lbnRzJzogZmluYWxTY29yZS53b3JrRG9uZUJ5TWVtYmVyQ29tbWVudHMgfHwgbnVsbCxcbiAgICAgICAgJzpiYXNpY0NvbWZvcnRTY29yZSc6IGZpbmFsU2NvcmUuYmFzaWNDb21mb3J0U2NvcmUsXG4gICAgICAgICc6YmFzaWNDb21mb3J0Q29tbWVudHMnOiBmaW5hbFNjb3JlLmJhc2ljQ29tZm9ydENvbW1lbnRzIHx8IG51bGwsXG4gICAgICAgICc6c2FmZXR5U2NvcmUnOiBmaW5hbFNjb3JlLnNhZmV0eVNjb3JlLFxuICAgICAgICAnOnNhZmV0eUNvbW1lbnRzJzogZmluYWxTY29yZS5zYWZldHlDb21tZW50cyB8fCBudWxsLFxuICAgICAgICAnOmVhc3lWaWV3T2ZDYXRTY29yZSc6IGZpbmFsU2NvcmUuZWFzeVZpZXdPZkNhdFNjb3JlLFxuICAgICAgICAnOmVhc3lWaWV3T2ZDYXRDb21tZW50cyc6IGZpbmFsU2NvcmUuZWFzeVZpZXdPZkNhdENvbW1lbnRzIHx8IG51bGwsXG4gICAgICAgICc6dG90YWxTY29yZSc6IGZpbmFsU2NvcmUudG90YWxTY29yZSxcbiAgICAgICAgJzp0aW1lc3RhbXAnOiB0aW1lc3RhbXAsXG4gICAgICAgICc6aXNGaW5hbGl6ZWQnOiBmaW5hbFNjb3JlLmlzRmluYWxpemVkLFxuICAgICAgICAnOm5ld01vZGlmaWNhdGlvbkNvdW50JzogZmluYWxTY29yZS5tb2RpZmljYXRpb25Db3VudCxcbiAgICAgICAgJzpsYXN0TW9kaWZpZWRCeSc6IGZpbmFsU2NvcmUubGFzdE1vZGlmaWVkQnksXG4gICAgICAgICc6bGFzdE1vZGlmaWVkQXQnOiBmaW5hbFNjb3JlLmxhc3RNb2RpZmllZEF0LFxuICAgICAgICAnOmV4cGVjdGVkTW9kaWZpY2F0aW9uQ291bnQnOiBleGlzdGluZ1Njb3JlLm1vZGlmaWNhdGlvbkNvdW50XG4gICAgICB9XG4gICAgfSkpO1xuXG4gICAgLy8gVXBkYXRlIHNjb3JlLWJ5LWNhdCBpbmRleCByZWNvcmRcbiAgICBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKG5ldyBQdXRDb21tYW5kKHtcbiAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXG4gICAgICBJdGVtOiB7XG4gICAgICAgIFBLOiBgQ0FUIyR7ZXhpc3RpbmdTY29yZS5jYXRJZH1gLFxuICAgICAgICBTSzogYFNDT1JFIyR7aWR9YCxcbiAgICAgICAgc2NvcmVJZDogaWQsXG4gICAgICAgIGp1ZGdlSWQ6IGV4aXN0aW5nU2NvcmUuanVkZ2VJZCxcbiAgICAgICAganVkZ2VOYW1lOiBleGlzdGluZ1Njb3JlLmp1ZGdlTmFtZSxcbiAgICAgICAgdG90YWxTY29yZTogbmV3VG90YWxTY29yZSxcbiAgICAgICAgdGltZXN0YW1wLFxuICAgICAgICBpc0ZpbmFsaXplZDogZmluYWxTY29yZS5pc0ZpbmFsaXplZCxcbiAgICAgIH0sXG4gICAgfSkpO1xuXG4gICAgLy8gVXBkYXRlIHNjb3JlLWJ5LWp1ZGdlIGluZGV4IHJlY29yZFxuICAgIGF3YWl0IHRoaXMuZG9jQ2xpZW50LnNlbmQobmV3IFB1dENvbW1hbmQoe1xuICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcbiAgICAgIEl0ZW06IHtcbiAgICAgICAgUEs6IGBKVURHRSMke2V4aXN0aW5nU2NvcmUuanVkZ2VJZH1gLFxuICAgICAgICBTSzogYFNDT1JFIyR7aWR9YCxcbiAgICAgICAgc2NvcmVJZDogaWQsXG4gICAgICAgIGNhdElkOiBleGlzdGluZ1Njb3JlLmNhdElkLFxuICAgICAgICB0b3RhbFNjb3JlOiBuZXdUb3RhbFNjb3JlLFxuICAgICAgICB0aW1lc3RhbXAsXG4gICAgICAgIGlzRmluYWxpemVkOiBmaW5hbFNjb3JlLmlzRmluYWxpemVkLFxuICAgICAgfSxcbiAgICB9KSk7XG5cbiAgICAvLyBDcmVhdGUgYXVkaXQgdHJhaWwgZW50cnkgZm9yIHNjb3JlIG1vZGlmaWNhdGlvblxuICAgIGF3YWl0IHRoaXMuY3JlYXRlQXVkaXRFbnRyeShcbiAgICAgIGlkLFxuICAgICAgJ1VQREFURScsXG4gICAgICBtb2RpZmllZEJ5IHx8IGV4aXN0aW5nU2NvcmUuanVkZ2VOYW1lLFxuICAgICAgcHJldmlvdXNWYWx1ZXMsXG4gICAgICBmaW5hbFNjb3JlLFxuICAgICAgaW5wdXQubW9kaWZpY2F0aW9uUmVhc29uIHx8ICdTY29yZSB1cGRhdGVkJ1xuICAgICk7XG5cbiAgICByZXR1cm4gZmluYWxTY29yZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZWxldGUgYSBzY29yZSBhbmQgYWxsIGl0cyBpbmRleCByZWNvcmRzXG4gICAqL1xuICBhc3luYyBkZWxldGVTY29yZShpZDogc3RyaW5nKTogUHJvbWlzZTxTY29yZT4ge1xuICAgIGNvbnN0IGV4aXN0aW5nU2NvcmUgPSBhd2FpdCB0aGlzLmdldFNjb3JlKGlkKTtcbiAgICBpZiAoIWV4aXN0aW5nU2NvcmUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignU2NvcmUgbm90IGZvdW5kJyk7XG4gICAgfVxuXG4gICAgLy8gRGVsZXRlIG1haW4gc2NvcmUgcmVjb3JkXG4gICAgYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChuZXcgRGVsZXRlQ29tbWFuZCh7XG4gICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxuICAgICAgS2V5OiB7IFBLOiBgU0NPUkUjJHtpZH1gLCBTSzogJ01FVEFEQVRBJyB9LFxuICAgIH0pKTtcblxuICAgIC8vIERlbGV0ZSBzY29yZS1ieS1jYXQgaW5kZXggcmVjb3JkXG4gICAgYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChuZXcgRGVsZXRlQ29tbWFuZCh7XG4gICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxuICAgICAgS2V5OiB7IFBLOiBgQ0FUIyR7ZXhpc3RpbmdTY29yZS5jYXRJZH1gLCBTSzogYFNDT1JFIyR7aWR9YCB9LFxuICAgIH0pKTtcblxuICAgIC8vIERlbGV0ZSBzY29yZS1ieS1qdWRnZSBpbmRleCByZWNvcmRcbiAgICBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKG5ldyBEZWxldGVDb21tYW5kKHtcbiAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXG4gICAgICBLZXk6IHsgUEs6IGBKVURHRSMke2V4aXN0aW5nU2NvcmUuanVkZ2VJZH1gLCBTSzogYFNDT1JFIyR7aWR9YCB9LFxuICAgIH0pKTtcblxuICAgIHJldHVybiBleGlzdGluZ1Njb3JlO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhbGwgc2NvcmVzIGZvciBhIHNwZWNpZmljIGNhdFxuICAgKi9cbiAgYXN5bmMgZ2V0U2NvcmVzQnlDYXQoY2F0SWQ6IHN0cmluZyk6IFByb21pc2U8U2NvcmVbXT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZG9jQ2xpZW50LnNlbmQobmV3IFF1ZXJ5Q29tbWFuZCh7XG4gICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxuICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjogJ1BLID0gOnBrIEFORCBiZWdpbnNfd2l0aChTSywgOnNrKScsXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XG4gICAgICAgICc6cGsnOiBgQ0FUIyR7Y2F0SWR9YCxcbiAgICAgICAgJzpzayc6ICdTQ09SRSMnLFxuICAgICAgfSxcbiAgICB9KSk7XG5cbiAgICBpZiAoIXJlc3VsdC5JdGVtcyB8fCByZXN1bHQuSXRlbXMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgLy8gR2V0IGZ1bGwgc2NvcmUgZGV0YWlscyBmb3IgZWFjaCBzY29yZSBJRFxuICAgIGNvbnN0IHNjb3JlUHJvbWlzZXMgPSByZXN1bHQuSXRlbXMubWFwKGl0ZW0gPT4gdGhpcy5nZXRTY29yZShpdGVtLnNjb3JlSWQpKTtcbiAgICBjb25zdCBzY29yZXMgPSBhd2FpdCBQcm9taXNlLmFsbChzY29yZVByb21pc2VzKTtcbiAgICBcbiAgICByZXR1cm4gc2NvcmVzLmZpbHRlcigoc2NvcmUpOiBzY29yZSBpcyBTY29yZSA9PiBzY29yZSAhPT0gbnVsbCk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFsbCBzY29yZXMgYnkgYSBzcGVjaWZpYyBqdWRnZVxuICAgKi9cbiAgYXN5bmMgZ2V0U2NvcmVzQnlKdWRnZShqdWRnZUlkOiBzdHJpbmcpOiBQcm9taXNlPFNjb3JlW10+IHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKG5ldyBRdWVyeUNvbW1hbmQoe1xuICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcbiAgICAgIEtleUNvbmRpdGlvbkV4cHJlc3Npb246ICdQSyA9IDpwayBBTkQgYmVnaW5zX3dpdGgoU0ssIDpzayknLFxuICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xuICAgICAgICAnOnBrJzogYEpVREdFIyR7anVkZ2VJZH1gLFxuICAgICAgICAnOnNrJzogJ1NDT1JFIycsXG4gICAgICB9LFxuICAgIH0pKTtcblxuICAgIGlmICghcmVzdWx0Lkl0ZW1zIHx8IHJlc3VsdC5JdGVtcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICAvLyBHZXQgZnVsbCBzY29yZSBkZXRhaWxzIGZvciBlYWNoIHNjb3JlIElEXG4gICAgY29uc3Qgc2NvcmVQcm9taXNlcyA9IHJlc3VsdC5JdGVtcy5tYXAoaXRlbSA9PiB0aGlzLmdldFNjb3JlKGl0ZW0uc2NvcmVJZCkpO1xuICAgIGNvbnN0IHNjb3JlcyA9IGF3YWl0IFByb21pc2UuYWxsKHNjb3JlUHJvbWlzZXMpO1xuICAgIFxuICAgIHJldHVybiBzY29yZXMuZmlsdGVyKChzY29yZSk6IHNjb3JlIGlzIFNjb3JlID0+IHNjb3JlICE9PSBudWxsKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgc2NvcmVzIGZvciBhIHNwZWNpZmljIGNhZ2UgbnVtYmVyIChyZXF1aXJlcyBsb29raW5nIHVwIGNhdCBmaXJzdClcbiAgICovXG4gIGFzeW5jIGdldFNjb3Jlc0J5Q2FnZShjYWdlTnVtYmVyOiBudW1iZXIpOiBQcm9taXNlPFNjb3JlW10+IHtcbiAgICAvLyBGaXJzdCBmaW5kIHRoZSBjYXQgd2l0aCB0aGlzIGNhZ2UgbnVtYmVyXG4gICAgY29uc3QgY2F0c1Jlc3VsdCA9IGF3YWl0IHRoaXMuZG9jQ2xpZW50LnNlbmQobmV3IFNjYW5Db21tYW5kKHtcbiAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXG4gICAgICBGaWx0ZXJFeHByZXNzaW9uOiAnYmVnaW5zX3dpdGgoUEssIDpwaykgQU5EIGNhZ2VOdW1iZXIgPSA6Y2FnZU51bWJlcicsXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XG4gICAgICAgICc6cGsnOiAnQ0FUIycsXG4gICAgICAgICc6Y2FnZU51bWJlcic6IGNhZ2VOdW1iZXIsXG4gICAgICB9LFxuICAgIH0pKTtcblxuICAgIGlmICghY2F0c1Jlc3VsdC5JdGVtcyB8fCBjYXRzUmVzdWx0Lkl0ZW1zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIC8vIEdldCB0aGUgY2F0IElEIChzaG91bGQgb25seSBiZSBvbmUgY2F0IHBlciBjYWdlKVxuICAgIGNvbnN0IGNhdElkID0gY2F0c1Jlc3VsdC5JdGVtc1swXS5QSy5yZXBsYWNlKCdDQVQjJywgJycpO1xuICAgIFxuICAgIHJldHVybiB0aGlzLmdldFNjb3Jlc0J5Q2F0KGNhdElkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMaXN0IGFsbCBzY29yZXMgaW4gdGhlIHN5c3RlbVxuICAgKi9cbiAgYXN5bmMgbGlzdEFsbFNjb3JlcygpOiBQcm9taXNlPFNjb3JlW10+IHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKG5ldyBTY2FuQ29tbWFuZCh7XG4gICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxuICAgICAgRmlsdGVyRXhwcmVzc2lvbjogJ2JlZ2luc193aXRoKFBLLCA6cGspIEFORCBTSyA9IDpzaycsXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XG4gICAgICAgICc6cGsnOiAnU0NPUkUjJyxcbiAgICAgICAgJzpzayc6ICdNRVRBREFUQScsXG4gICAgICB9LFxuICAgIH0pKTtcblxuICAgIGlmICghcmVzdWx0Lkl0ZW1zIHx8IHJlc3VsdC5JdGVtcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0Lkl0ZW1zLm1hcChpdGVtID0+ICh7XG4gICAgICBpZDogaXRlbS5pZCxcbiAgICAgIGNhdElkOiBpdGVtLmNhdElkLFxuICAgICAganVkZ2VJZDogaXRlbS5qdWRnZUlkLFxuICAgICAganVkZ2VOYW1lOiBpdGVtLmp1ZGdlTmFtZSxcbiAgICAgIGZpcnN0SW1wcmVzc2lvblNjb3JlOiBwYXJzZUludChpdGVtLmZpcnN0SW1wcmVzc2lvblNjb3JlKSB8fCAwLFxuICAgICAgZmlyc3RJbXByZXNzaW9uQ29tbWVudHM6IGl0ZW0uZmlyc3RJbXByZXNzaW9uQ29tbWVudHMsXG4gICAgICBvcmlnaW5hbGl0eVNjb3JlOiBwYXJzZUludChpdGVtLm9yaWdpbmFsaXR5U2NvcmUpIHx8IDAsXG4gICAgICBvcmlnaW5hbGl0eUNvbW1lbnRzOiBpdGVtLm9yaWdpbmFsaXR5Q29tbWVudHMsXG4gICAgICBpbmZvcm1hdGlvbkNhcmRTY29yZTogcGFyc2VJbnQoaXRlbS5pbmZvcm1hdGlvbkNhcmRTY29yZSkgfHwgMCxcbiAgICAgIGluZm9ybWF0aW9uQ2FyZENvbW1lbnRzOiBpdGVtLmluZm9ybWF0aW9uQ2FyZENvbW1lbnRzLFxuICAgICAgd29ya0RvbmVCeU1lbWJlclNjb3JlOiBwYXJzZUludChpdGVtLndvcmtEb25lQnlNZW1iZXJTY29yZSkgfHwgMCxcbiAgICAgIHdvcmtEb25lQnlNZW1iZXJDb21tZW50czogaXRlbS53b3JrRG9uZUJ5TWVtYmVyQ29tbWVudHMsXG4gICAgICBiYXNpY0NvbWZvcnRTY29yZTogcGFyc2VJbnQoaXRlbS5iYXNpY0NvbWZvcnRTY29yZSkgfHwgMCxcbiAgICAgIGJhc2ljQ29tZm9ydENvbW1lbnRzOiBpdGVtLmJhc2ljQ29tZm9ydENvbW1lbnRzLFxuICAgICAgc2FmZXR5U2NvcmU6IHBhcnNlSW50KGl0ZW0uc2FmZXR5U2NvcmUpIHx8IDAsXG4gICAgICBzYWZldHlDb21tZW50czogaXRlbS5zYWZldHlDb21tZW50cyxcbiAgICAgIGVhc3lWaWV3T2ZDYXRTY29yZTogcGFyc2VJbnQoaXRlbS5lYXN5Vmlld09mQ2F0U2NvcmUpIHx8IDAsXG4gICAgICBlYXN5Vmlld09mQ2F0Q29tbWVudHM6IGl0ZW0uZWFzeVZpZXdPZkNhdENvbW1lbnRzLFxuICAgICAgdG90YWxTY29yZTogcGFyc2VJbnQoaXRlbS50b3RhbFNjb3JlKSB8fCAwLFxuICAgICAgdGltZXN0YW1wOiBpdGVtLnRpbWVzdGFtcCxcbiAgICAgIGlzRmluYWxpemVkOiBpdGVtLmlzRmluYWxpemVkLFxuICAgICAgbW9kaWZpY2F0aW9uQ291bnQ6IHBhcnNlSW50KGl0ZW0ubW9kaWZpY2F0aW9uQ291bnQpIHx8IDAsXG4gICAgICBsYXN0TW9kaWZpZWRCeTogaXRlbS5sYXN0TW9kaWZpZWRCeSxcbiAgICAgIGxhc3RNb2RpZmllZEF0OiBpdGVtLmxhc3RNb2RpZmllZEF0LFxuICAgIH0pKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYXVkaXQgaGlzdG9yeSBmb3IgYSBzcGVjaWZpYyBzY29yZVxuICAgKi9cbiAgYXN5bmMgZ2V0U2NvcmVBdWRpdEhpc3Rvcnkoc2NvcmVJZDogc3RyaW5nKTogUHJvbWlzZTxTY29yZUF1ZGl0RW50cnlbXT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZG9jQ2xpZW50LnNlbmQobmV3IFF1ZXJ5Q29tbWFuZCh7XG4gICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxuICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjogJ1BLID0gOnBrIEFORCBiZWdpbnNfd2l0aChTSywgOnNrKScsXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XG4gICAgICAgICc6cGsnOiBgU0NPUkUjJHtzY29yZUlkfWAsXG4gICAgICAgICc6c2snOiAnQVVESVQjJyxcbiAgICAgIH0sXG4gICAgICBTY2FuSW5kZXhGb3J3YXJkOiBmYWxzZSwgLy8gU29ydCBieSB0aW1lc3RhbXAgZGVzY2VuZGluZyAobmV3ZXN0IGZpcnN0KVxuICAgIH0pKTtcblxuICAgIGlmICghcmVzdWx0Lkl0ZW1zIHx8IHJlc3VsdC5JdGVtcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0Lkl0ZW1zLm1hcChpdGVtID0+ICh7XG4gICAgICBpZDogaXRlbS5pZCxcbiAgICAgIHNjb3JlSWQ6IGl0ZW0uc2NvcmVJZCxcbiAgICAgIGFjdGlvbjogaXRlbS5hY3Rpb24sXG4gICAgICBtb2RpZmllZEJ5OiBpdGVtLm1vZGlmaWVkQnksXG4gICAgICBtb2RpZmllZEF0OiBpdGVtLm1vZGlmaWVkQXQsXG4gICAgICBwcmV2aW91c1ZhbHVlczogaXRlbS5wcmV2aW91c1ZhbHVlcyA/IEpTT04ucGFyc2UoaXRlbS5wcmV2aW91c1ZhbHVlcykgOiB1bmRlZmluZWQsXG4gICAgICBuZXdWYWx1ZXM6IGl0ZW0ubmV3VmFsdWVzID8gSlNPTi5wYXJzZShpdGVtLm5ld1ZhbHVlcykgOiB1bmRlZmluZWQsXG4gICAgICByZWFzb246IGl0ZW0ucmVhc29uLFxuICAgIH0pKTtcbiAgfVxufSJdfQ==