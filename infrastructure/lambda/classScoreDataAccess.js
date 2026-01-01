"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassScoreDataAccess = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const crypto_1 = require("crypto");
class ClassScoreDataAccess {
    constructor(docClient, tableName) {
        this.docClient = docClient;
        this.tableName = tableName;
    }
    /**
     * Create an audit trail entry for class score modifications
     */
    async createAuditEntry(classScoreId, action, modifiedBy, previousValues, newValues, reason) {
        const auditId = (0, crypto_1.randomUUID)();
        const modifiedAt = new Date().toISOString();
        const auditEntry = {
            id: auditId,
            classScoreId,
            action,
            modifiedBy,
            modifiedAt,
            previousValues,
            newValues,
            reason
        };
        await this.docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: this.tableName,
            Item: {
                PK: `CLASS_SCORE_AUDIT#${classScoreId}`,
                SK: `ENTRY#${modifiedAt}#${auditId}`,
                ...auditEntry,
            },
        }));
    }
    /**
     * Calculate total class score from individual category scores
     */
    calculateClassTotalScore(beautyScore, personalityScore, balanceProportionScore) {
        return beautyScore + personalityScore + balanceProportionScore;
    }
    /**
     * Determine ribbon eligibility based on total score and health/grooming checklist
     */
    calculateRibbonEligibility(totalScore, healthChecklist) {
        // Check if all health items pass (excluding flea issues which is a negative indicator)
        const healthItemsPassed = healthChecklist.coatCleanGroomed &&
            healthChecklist.teethGumsHealthy &&
            healthChecklist.eyesNoseClear &&
            healthChecklist.earsCleanMiteFree &&
            healthChecklist.toenailsClipped;
        // If any health item fails OR flea issues are present, Red Ribbon regardless of score
        if (!healthItemsPassed || healthChecklist.fleaIssues) {
            return 'Red';
        }
        // Determine ribbon based on score thresholds
        if (totalScore >= 45 && totalScore <= 50) {
            return 'Blue';
        }
        else if (totalScore >= 35 && totalScore <= 44) {
            return 'Red';
        }
        else if (totalScore >= 25 && totalScore <= 34) {
            return 'White';
        }
        else {
            return 'Participation';
        }
    }
    /**
     * Create a new class score record
     */
    async createClassScore(input) {
        const id = (0, crypto_1.randomUUID)();
        const timestamp = new Date().toISOString();
        const totalScore = this.calculateClassTotalScore(input.beautyScore, input.personalityScore, input.balanceProportionScore);
        const healthChecklist = {
            coatCleanGroomed: input.coatCleanGroomed,
            teethGumsHealthy: input.teethGumsHealthy,
            eyesNoseClear: input.eyesNoseClear,
            earsCleanMiteFree: input.earsCleanMiteFree,
            toenailsClipped: input.toenailsClipped,
            fleaIssues: input.fleaIssues
        };
        const ribbonEligibility = this.calculateRibbonEligibility(totalScore, healthChecklist);
        const classScore = {
            id,
            catId: input.catId,
            judgeId: input.judgeId,
            judgeName: input.judgeName,
            beautyScore: input.beautyScore,
            beautyComments: input.beautyComments,
            personalityScore: input.personalityScore,
            personalityComments: input.personalityComments,
            balanceProportionScore: input.balanceProportionScore,
            balanceProportionComments: input.balanceProportionComments,
            coatCleanGroomed: input.coatCleanGroomed,
            teethGumsHealthy: input.teethGumsHealthy,
            eyesNoseClear: input.eyesNoseClear,
            earsCleanMiteFree: input.earsCleanMiteFree,
            toenailsClipped: input.toenailsClipped,
            fleaIssues: input.fleaIssues,
            healthGroomingComments: input.healthGroomingComments,
            totalScore,
            ribbonEligibility,
            timestamp,
            isFinalized: input.isFinalized || false,
            modificationCount: 0,
            lastModifiedBy: input.judgeName,
            lastModifiedAt: timestamp,
        };
        // Store main class score record
        await this.docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: this.tableName,
            Item: {
                PK: `CLASS_SCORE#${id}`,
                SK: 'METADATA',
                ...classScore,
            },
        }));
        // Store class-score-by-cat index record
        await this.docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: this.tableName,
            Item: {
                PK: `CAT#${input.catId}`,
                SK: `CLASS_SCORE#${id}`,
                classScoreId: id,
                judgeId: input.judgeId,
                judgeName: input.judgeName,
                totalScore,
                ribbonEligibility,
                timestamp,
                isFinalized: input.isFinalized || false,
            },
        }));
        // Store class-score-by-judge index record
        await this.docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: this.tableName,
            Item: {
                PK: `JUDGE#${input.judgeId}`,
                SK: `CLASS_SCORE#${id}`,
                classScoreId: id,
                catId: input.catId,
                totalScore,
                ribbonEligibility,
                timestamp,
                isFinalized: input.isFinalized || false,
            },
        }));
        // Create audit trail entry for creation
        await this.createAuditEntry(id, 'CREATE', input.judgeName, null, classScore, 'Initial class score creation');
        return classScore;
    }
    /**
     * Get a class score by ID
     */
    async getClassScore(id) {
        const result = await this.docClient.send(new lib_dynamodb_1.GetCommand({
            TableName: this.tableName,
            Key: { PK: `CLASS_SCORE#${id}`, SK: 'METADATA' },
        }));
        if (!result.Item)
            return null;
        return {
            id: result.Item.id,
            catId: result.Item.catId,
            judgeId: result.Item.judgeId,
            judgeName: result.Item.judgeName,
            beautyScore: parseInt(result.Item.beautyScore) || 0,
            beautyComments: result.Item.beautyComments,
            personalityScore: parseInt(result.Item.personalityScore) || 0,
            personalityComments: result.Item.personalityComments,
            balanceProportionScore: parseInt(result.Item.balanceProportionScore) || 0,
            balanceProportionComments: result.Item.balanceProportionComments,
            coatCleanGroomed: result.Item.coatCleanGroomed,
            teethGumsHealthy: result.Item.teethGumsHealthy,
            eyesNoseClear: result.Item.eyesNoseClear,
            earsCleanMiteFree: result.Item.earsCleanMiteFree,
            toenailsClipped: result.Item.toenailsClipped,
            fleaIssues: result.Item.fleaIssues,
            healthGroomingComments: result.Item.healthGroomingComments,
            totalScore: parseInt(result.Item.totalScore) || 0,
            ribbonEligibility: result.Item.ribbonEligibility,
            timestamp: result.Item.timestamp,
            isFinalized: result.Item.isFinalized,
            modificationCount: parseInt(result.Item.modificationCount) || 0,
            lastModifiedBy: result.Item.lastModifiedBy,
            lastModifiedAt: result.Item.lastModifiedAt,
        };
    }
    /**
     * Update an existing class score with audit trail
     */
    async updateClassScore(id, input, modifiedBy) {
        // First get the existing class score
        const existingScore = await this.getClassScore(id);
        if (!existingScore) {
            throw new Error('Class score not found');
        }
        // Calculate new total score and ribbon eligibility if any category scores are being updated
        const updatedScore = { ...existingScore, ...input };
        const newTotalScore = this.calculateClassTotalScore(updatedScore.beautyScore, updatedScore.personalityScore, updatedScore.balanceProportionScore);
        const healthChecklist = {
            coatCleanGroomed: updatedScore.coatCleanGroomed,
            teethGumsHealthy: updatedScore.teethGumsHealthy,
            eyesNoseClear: updatedScore.eyesNoseClear,
            earsCleanMiteFree: updatedScore.earsCleanMiteFree,
            toenailsClipped: updatedScore.toenailsClipped,
            fleaIssues: updatedScore.fleaIssues
        };
        const newRibbonEligibility = this.calculateRibbonEligibility(newTotalScore, healthChecklist);
        const timestamp = new Date().toISOString();
        const finalScore = {
            ...updatedScore,
            totalScore: newTotalScore,
            ribbonEligibility: newRibbonEligibility,
            timestamp, // Update timestamp on modification
            modificationCount: (existingScore.modificationCount || 0) + 1,
            lastModifiedBy: modifiedBy,
            lastModifiedAt: timestamp,
        };
        // Create audit trail entry before updating
        await this.createAuditEntry(id, 'UPDATE', modifiedBy, existingScore, finalScore, input.modificationReason || 'Class score updated');
        // Update main class score record
        await this.docClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: this.tableName,
            Key: {
                PK: `CLASS_SCORE#${id}`,
                SK: 'METADATA',
            },
            UpdateExpression: `SET 
        beautyScore = :beautyScore,
        beautyComments = :beautyComments,
        personalityScore = :personalityScore,
        personalityComments = :personalityComments,
        balanceProportionScore = :balanceProportionScore,
        balanceProportionComments = :balanceProportionComments,
        coatCleanGroomed = :coatCleanGroomed,
        teethGumsHealthy = :teethGumsHealthy,
        eyesNoseClear = :eyesNoseClear,
        earsCleanMiteFree = :earsCleanMiteFree,
        toenailsClipped = :toenailsClipped,
        fleaIssues = :fleaIssues,
        healthGroomingComments = :healthGroomingComments,
        totalScore = :totalScore,
        ribbonEligibility = :ribbonEligibility,
        #timestamp = :timestamp,
        isFinalized = :isFinalized,
        modificationCount = :modificationCount,
        lastModifiedBy = :lastModifiedBy,
        lastModifiedAt = :lastModifiedAt`,
            ExpressionAttributeNames: {
                '#timestamp': 'timestamp'
            },
            ExpressionAttributeValues: {
                ':beautyScore': finalScore.beautyScore,
                ':beautyComments': finalScore.beautyComments || null,
                ':personalityScore': finalScore.personalityScore,
                ':personalityComments': finalScore.personalityComments || null,
                ':balanceProportionScore': finalScore.balanceProportionScore,
                ':balanceProportionComments': finalScore.balanceProportionComments || null,
                ':coatCleanGroomed': finalScore.coatCleanGroomed,
                ':teethGumsHealthy': finalScore.teethGumsHealthy,
                ':eyesNoseClear': finalScore.eyesNoseClear,
                ':earsCleanMiteFree': finalScore.earsCleanMiteFree,
                ':toenailsClipped': finalScore.toenailsClipped,
                ':fleaIssues': finalScore.fleaIssues,
                ':healthGroomingComments': finalScore.healthGroomingComments || null,
                ':totalScore': finalScore.totalScore,
                ':ribbonEligibility': finalScore.ribbonEligibility,
                ':timestamp': timestamp,
                ':isFinalized': finalScore.isFinalized,
                ':modificationCount': finalScore.modificationCount,
                ':lastModifiedBy': finalScore.lastModifiedBy,
                ':lastModifiedAt': finalScore.lastModifiedAt,
            }
        }));
        // Update class-score-by-cat index record
        await this.docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: this.tableName,
            Item: {
                PK: `CAT#${existingScore.catId}`,
                SK: `CLASS_SCORE#${id}`,
                classScoreId: id,
                judgeId: existingScore.judgeId,
                judgeName: existingScore.judgeName,
                totalScore: newTotalScore,
                ribbonEligibility: newRibbonEligibility,
                timestamp,
                isFinalized: finalScore.isFinalized,
            },
        }));
        // Update class-score-by-judge index record
        await this.docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: this.tableName,
            Item: {
                PK: `JUDGE#${existingScore.judgeId}`,
                SK: `CLASS_SCORE#${id}`,
                classScoreId: id,
                catId: existingScore.catId,
                totalScore: newTotalScore,
                ribbonEligibility: newRibbonEligibility,
                timestamp,
                isFinalized: finalScore.isFinalized,
            },
        }));
        return finalScore;
    }
    /**
     * Delete a class score and all its index records
     */
    async deleteClassScore(id) {
        const existingScore = await this.getClassScore(id);
        if (!existingScore) {
            throw new Error('Class score not found');
        }
        // Delete main class score record
        await this.docClient.send(new lib_dynamodb_1.DeleteCommand({
            TableName: this.tableName,
            Key: { PK: `CLASS_SCORE#${id}`, SK: 'METADATA' },
        }));
        // Delete class-score-by-cat index record
        await this.docClient.send(new lib_dynamodb_1.DeleteCommand({
            TableName: this.tableName,
            Key: { PK: `CAT#${existingScore.catId}`, SK: `CLASS_SCORE#${id}` },
        }));
        // Delete class-score-by-judge index record
        await this.docClient.send(new lib_dynamodb_1.DeleteCommand({
            TableName: this.tableName,
            Key: { PK: `JUDGE#${existingScore.judgeId}`, SK: `CLASS_SCORE#${id}` },
        }));
        return existingScore;
    }
    /**
     * Get all class scores for a specific cat
     */
    async getClassScoresByCat(catId) {
        const result = await this.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
            ExpressionAttributeValues: {
                ':pk': `CAT#${catId}`,
                ':sk': 'CLASS_SCORE#',
            },
        }));
        if (!result.Items || result.Items.length === 0) {
            return [];
        }
        // Get full class score details for each score ID
        const scorePromises = result.Items.map(item => this.getClassScore(item.classScoreId));
        const scores = await Promise.all(scorePromises);
        return scores.filter((score) => score !== null);
    }
    /**
     * Get all class scores by a specific judge
     */
    async getClassScoresByJudge(judgeId) {
        const result = await this.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
            ExpressionAttributeValues: {
                ':pk': `JUDGE#${judgeId}`,
                ':sk': 'CLASS_SCORE#',
            },
        }));
        if (!result.Items || result.Items.length === 0) {
            return [];
        }
        // Get full class score details for each score ID
        const scorePromises = result.Items.map(item => this.getClassScore(item.classScoreId));
        const scores = await Promise.all(scorePromises);
        return scores.filter((score) => score !== null);
    }
    /**
     * Get class scores for a specific cage number (requires looking up cat first)
     */
    async getClassScoresByCage(cageNumber) {
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
        return this.getClassScoresByCat(catId);
    }
    /**
     * List all class scores in the system
     */
    async listAllClassScores() {
        const result = await this.docClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: this.tableName,
            FilterExpression: 'begins_with(PK, :pk) AND SK = :sk',
            ExpressionAttributeValues: {
                ':pk': 'CLASS_SCORE#',
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
            beautyScore: parseInt(item.beautyScore) || 0,
            beautyComments: item.beautyComments,
            personalityScore: parseInt(item.personalityScore) || 0,
            personalityComments: item.personalityComments,
            balanceProportionScore: parseInt(item.balanceProportionScore) || 0,
            balanceProportionComments: item.balanceProportionComments,
            coatCleanGroomed: item.coatCleanGroomed,
            teethGumsHealthy: item.teethGumsHealthy,
            eyesNoseClear: item.eyesNoseClear,
            earsCleanMiteFree: item.earsCleanMiteFree,
            toenailsClipped: item.toenailsClipped,
            fleaIssues: item.fleaIssues,
            healthGroomingComments: item.healthGroomingComments,
            totalScore: parseInt(item.totalScore) || 0,
            ribbonEligibility: item.ribbonEligibility,
            timestamp: item.timestamp,
            isFinalized: item.isFinalized,
            modificationCount: parseInt(item.modificationCount) || 0,
            lastModifiedBy: item.lastModifiedBy,
            lastModifiedAt: item.lastModifiedAt,
        }));
    }
    /**
     * Get audit history for a specific class score
     */
    async getClassScoreAuditHistory(classScoreId) {
        const result = await this.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
            ExpressionAttributeValues: {
                ':pk': `CLASS_SCORE_AUDIT#${classScoreId}`,
                ':sk': 'ENTRY#',
            },
            ScanIndexForward: false, // Most recent first
        }));
        if (!result.Items || result.Items.length === 0) {
            return [];
        }
        return result.Items.map(item => ({
            id: item.id,
            classScoreId: item.classScoreId,
            action: item.action,
            modifiedBy: item.modifiedBy,
            modifiedAt: item.modifiedAt,
            previousValues: item.previousValues,
            newValues: item.newValues,
            reason: item.reason,
        }));
    }
    /**
     * Finalize a class score with confirmation
     */
    async finalizeClassScore(id, modifiedBy) {
        const existingScore = await this.getClassScore(id);
        if (!existingScore) {
            throw new Error('Class score not found');
        }
        if (existingScore.isFinalized) {
            throw new Error('Class score is already finalized');
        }
        const timestamp = new Date().toISOString();
        const finalizedScore = {
            ...existingScore,
            isFinalized: true,
            modificationCount: (existingScore.modificationCount || 0) + 1,
            lastModifiedBy: modifiedBy,
            lastModifiedAt: timestamp,
        };
        // Create audit trail entry for finalization
        await this.createAuditEntry(id, 'FINALIZE', modifiedBy, existingScore, finalizedScore, 'Class score finalized');
        // Update main class score record
        await this.docClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: this.tableName,
            Key: {
                PK: `CLASS_SCORE#${id}`,
                SK: 'METADATA',
            },
            UpdateExpression: `SET 
        isFinalized = :isFinalized,
        modificationCount = :modificationCount,
        lastModifiedBy = :lastModifiedBy,
        lastModifiedAt = :lastModifiedAt`,
            ExpressionAttributeValues: {
                ':isFinalized': true,
                ':modificationCount': finalizedScore.modificationCount,
                ':lastModifiedBy': modifiedBy,
                ':lastModifiedAt': timestamp,
            }
        }));
        // Update index records
        await this.docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: this.tableName,
            Item: {
                PK: `CAT#${existingScore.catId}`,
                SK: `CLASS_SCORE#${id}`,
                classScoreId: id,
                judgeId: existingScore.judgeId,
                judgeName: existingScore.judgeName,
                totalScore: existingScore.totalScore,
                ribbonEligibility: existingScore.ribbonEligibility,
                timestamp: existingScore.timestamp,
                isFinalized: true,
            },
        }));
        await this.docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: this.tableName,
            Item: {
                PK: `JUDGE#${existingScore.judgeId}`,
                SK: `CLASS_SCORE#${id}`,
                classScoreId: id,
                catId: existingScore.catId,
                totalScore: existingScore.totalScore,
                ribbonEligibility: existingScore.ribbonEligibility,
                timestamp: existingScore.timestamp,
                isFinalized: true,
            },
        }));
        return finalizedScore;
    }
}
exports.ClassScoreDataAccess = ClassScoreDataAccess;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhc3NTY29yZURhdGFBY2Nlc3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGFzc1Njb3JlRGF0YUFjY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSx3REFBZ0o7QUFDaEosbUNBQW9DO0FBeUZwQyxNQUFhLG9CQUFvQjtJQUMvQixZQUFvQixTQUFpQyxFQUFVLFNBQWlCO1FBQTVELGNBQVMsR0FBVCxTQUFTLENBQXdCO1FBQVUsY0FBUyxHQUFULFNBQVMsQ0FBUTtJQUFHLENBQUM7SUFFcEY7O09BRUc7SUFDSyxLQUFLLENBQUMsZ0JBQWdCLENBQzVCLFlBQW9CLEVBQ3BCLE1BQWMsRUFDZCxVQUFrQixFQUNsQixjQUFvQixFQUNwQixTQUFlLEVBQ2YsTUFBZTtRQUVmLE1BQU0sT0FBTyxHQUFHLElBQUEsbUJBQVUsR0FBRSxDQUFDO1FBQzdCLE1BQU0sVUFBVSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUM7UUFFNUMsTUFBTSxVQUFVLEdBQXlCO1lBQ3ZDLEVBQUUsRUFBRSxPQUFPO1lBQ1gsWUFBWTtZQUNaLE1BQU07WUFDTixVQUFVO1lBQ1YsVUFBVTtZQUNWLGNBQWM7WUFDZCxTQUFTO1lBQ1QsTUFBTTtTQUNQLENBQUM7UUFFRixNQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUkseUJBQVUsQ0FBQztZQUN2QyxTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7WUFDekIsSUFBSSxFQUFFO2dCQUNKLEVBQUUsRUFBRSxxQkFBcUIsWUFBWSxFQUFFO2dCQUN2QyxFQUFFLEVBQUUsU0FBUyxVQUFVLElBQUksT0FBTyxFQUFFO2dCQUNwQyxHQUFHLFVBQVU7YUFDZDtTQUNGLENBQUMsQ0FBQyxDQUFDO0lBQ04sQ0FBQztJQUVEOztPQUVHO0lBQ0ssd0JBQXdCLENBQzlCLFdBQW1CLEVBQ25CLGdCQUF3QixFQUN4QixzQkFBOEI7UUFFOUIsT0FBTyxXQUFXLEdBQUcsZ0JBQWdC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QVMsRUFBRSxhQUFhLENBQUMsU0FBUztnQkFDbEMsVUFBVSxFQUFFLGFBQWEsQ0FBQyxVQUFVO2dCQUNwQyxpQkFBaUIsRUFBRSxhQUFhLENBQUMsaUJBQWlCO2dCQUNsRCxTQUFTLEVBQUUsYUFBYSxDQUFDLFNBQVM7Z0JBQ2xDLFdBQVcsRUFBRSxJQUFJO2FBQ2xCO1NBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSixNQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUkseUJBQVUsQ0FBQztZQUN2QyxTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7WUFDekIsSUFBSSxFQUFFO2dCQUNKLEVBQUUsRUFBRSxTQUFTLGFBQWEsQ0FBQyxPQUFPLEVBQUU7Z0JBQ3BDLEVBQUUsRUFBRSxlQUFlLEVBQUUsRUFBRTtnQkFDdkIsWUFBWSxFQUFFLEVBQUU7Z0JBQ2hCLEtBQUssRUFBRSxhQUFhLENBQUMsS0FBSztnQkFDMUIsVUFBVSxFQUFFLGFBQWEsQ0FBQyxVQUFVO2dCQUNwQyxpQkFBaUIsRUFBRSxhQUFhLENBQUMsaUJBQWlCO2dCQUNsRCxTQUFTLEVBQUUsYUFBYSxDQUFDLFNBQVM7Z0JBQ2xDLFdBQVcsRUFBRSxJQUFJO2FBQ2xCO1NBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSixPQUFPLGNBQWMsQ0FBQztJQUN4QixDQUFDO0NBQ0Y7QUEvbUJELG9EQSttQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LCBTY2FuQ29tbWFuZCwgR2V0Q29tbWFuZCwgUHV0Q29tbWFuZCwgVXBkYXRlQ29tbWFuZCwgRGVsZXRlQ29tbWFuZCwgUXVlcnlDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvbGliLWR5bmFtb2RiJztcbmltcG9ydCB7IHJhbmRvbVVVSUQgfSBmcm9tICdjcnlwdG8nO1xuXG5leHBvcnQgaW50ZXJmYWNlIENsYXNzU2NvcmUge1xuICBpZDogc3RyaW5nO1xuICBjYXRJZDogc3RyaW5nO1xuICBqdWRnZUlkOiBzdHJpbmc7XG4gIGp1ZGdlTmFtZTogc3RyaW5nO1xuICBiZWF1dHlTY29yZTogbnVtYmVyO1xuICBiZWF1dHlDb21tZW50cz86IHN0cmluZztcbiAgcGVyc29uYWxpdHlTY29yZTogbnVtYmVyO1xuICBwZXJzb25hbGl0eUNvbW1lbnRzPzogc3RyaW5nO1xuICBiYWxhbmNlUHJvcG9ydGlvblNjb3JlOiBudW1iZXI7XG4gIGJhbGFuY2VQcm9wb3J0aW9uQ29tbWVudHM/OiBzdHJpbmc7XG4gIGNvYXRDbGVhbkdyb29tZWQ6IGJvb2xlYW47XG4gIHRlZXRoR3Vtc0hlYWx0aHk6IGJvb2xlYW47XG4gIGV5ZXNOb3NlQ2xlYXI6IGJvb2xlYW47XG4gIGVhcnNDbGVhbk1pdGVGcmVlOiBib29sZWFuO1xuICB0b2VuYWlsc0NsaXBwZWQ6IGJvb2xlYW47XG4gIGZsZWFJc3N1ZXM6IGJvb2xlYW47XG4gIGhlYWx0aEdyb29taW5nQ29tbWVudHM/OiBzdHJpbmc7XG4gIHRvdGFsU2NvcmU6IG51bWJlcjtcbiAgcmliYm9uRWxpZ2liaWxpdHk6IHN0cmluZztcbiAgdGltZXN0YW1wOiBzdHJpbmc7XG4gIGlzRmluYWxpemVkOiBib29sZWFuO1xuICBtb2RpZmljYXRpb25Db3VudDogbnVtYmVyO1xuICBsYXN0TW9kaWZpZWRCeT86IHN0cmluZztcbiAgbGFzdE1vZGlmaWVkQXQ/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2xhc3NTY29yZUF1ZGl0RW50cnkge1xuICBpZDogc3RyaW5nO1xuICBjbGFzc1Njb3JlSWQ6IHN0cmluZztcbiAgYWN0aW9uOiBzdHJpbmc7XG4gIG1vZGlmaWVkQnk6IHN0cmluZztcbiAgbW9kaWZpZWRBdDogc3RyaW5nO1xuICBwcmV2aW91c1ZhbHVlcz86IGFueTtcbiAgbmV3VmFsdWVzPzogYW55O1xuICByZWFzb24/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ3JlYXRlQ2xhc3NTY29yZUlucHV0IHtcbiAgY2F0SWQ6IHN0cmluZztcbiAganVkZ2VJZDogc3RyaW5nO1xuICBqdWRnZU5hbWU6IHN0cmluZztcbiAgYmVhdXR5U2NvcmU6IG51bWJlcjtcbiAgYmVhdXR5Q29tbWVudHM/OiBzdHJpbmc7XG4gIHBlcnNvbmFsaXR5U2NvcmU6IG51bWJlcjtcbiAgcGVyc29uYWxpdHlDb21tZW50cz86IHN0cmluZztcbiAgYmFsYW5jZVByb3BvcnRpb25TY29yZTogbnVtYmVyO1xuICBiYWxhbmNlUHJvcG9ydGlvbkNvbW1lbnRzPzogc3RyaW5nO1xuICBjb2F0Q2xlYW5Hcm9vbWVkOiBib29sZWFuO1xuICB0ZWV0aEd1bXNIZWFsdGh5OiBib29sZWFuO1xuICBleWVzTm9zZUNsZWFyOiBib29sZWFuO1xuICBlYXJzQ2xlYW5NaXRlRnJlZTogYm9vbGVhbjtcbiAgdG9lbmFpbHNDbGlwcGVkOiBib29sZWFuO1xuICBmbGVhSXNzdWVzOiBib29sZWFuO1xuICBoZWFsdGhHcm9vbWluZ0NvbW1lbnRzPzogc3RyaW5nO1xuICBpc0ZpbmFsaXplZD86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVXBkYXRlQ2xhc3NTY29yZUlucHV0IHtcbiAgYmVhdXR5U2NvcmU/OiBudW1iZXI7XG4gIGJlYXV0eUNvbW1lbnRzPzogc3RyaW5nO1xuICBwZXJzb25hbGl0eVNjb3JlPzogbnVtYmVyO1xuICBwZXJzb25hbGl0eUNvbW1lbnRzPzogc3RyaW5nO1xuICBiYWxhbmNlUHJvcG9ydGlvblNjb3JlPzogbnVtYmVyO1xuICBiYWxhbmNlUHJvcG9ydGlvbkNvbW1lbnRzPzogc3RyaW5nO1xuICBjb2F0Q2xlYW5Hcm9vbWVkPzogYm9vbGVhbjtcbiAgdGVldGhHdW1zSGVhbHRoeT86IGJvb2xlYW47XG4gIGV5ZXNOb3NlQ2xlYXI/OiBib29sZWFuO1xuICBlYXJzQ2xlYW5NaXRlRnJlZT86IGJvb2xlYW47XG4gIHRvZW5haWxzQ2xpcHBlZD86IGJvb2xlYW47XG4gIGZsZWFJc3N1ZXM/OiBib29sZWFuO1xuICBoZWFsdGhHcm9vbWluZ0NvbW1lbnRzPzogc3RyaW5nO1xuICBpc0ZpbmFsaXplZD86IGJvb2xlYW47XG4gIG1vZGlmaWNhdGlvblJlYXNvbj86IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBIZWFsdGhHcm9vbWluZ0NoZWNrbGlzdCB7XG4gIGNvYXRDbGVhbkdyb29tZWQ6IGJvb2xlYW47XG4gIHRlZXRoR3Vtc0hlYWx0aHk6IGJvb2xlYW47XG4gIGV5ZXNOb3NlQ2xlYXI6IGJvb2xlYW47XG4gIGVhcnNDbGVhbk1pdGVGcmVlOiBib29sZWFuO1xuICB0b2VuYWlsc0NsaXBwZWQ6IGJvb2xlYW47XG4gIGZsZWFJc3N1ZXM6IGJvb2xlYW47XG59XG5cbmV4cG9ydCB0eXBlIFJpYmJvblR5cGUgPSAnQmx1ZScgfCAnUmVkJyB8ICdXaGl0ZScgfCAnUGFydGljaXBhdGlvbic7XG5cbmV4cG9ydCBjbGFzcyBDbGFzc1Njb3JlRGF0YUFjY2VzcyB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgZG9jQ2xpZW50OiBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LCBwcml2YXRlIHRhYmxlTmFtZTogc3RyaW5nKSB7fVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYW4gYXVkaXQgdHJhaWwgZW50cnkgZm9yIGNsYXNzIHNjb3JlIG1vZGlmaWNhdGlvbnNcbiAgICovXG4gIHByaXZhdGUgYXN5bmMgY3JlYXRlQXVkaXRFbnRyeShcbiAgICBjbGFzc1Njb3JlSWQ6IHN0cmluZyxcbiAgICBhY3Rpb246IHN0cmluZyxcbiAgICBtb2RpZmllZEJ5OiBzdHJpbmcsXG4gICAgcHJldmlvdXNWYWx1ZXM/OiBhbnksXG4gICAgbmV3VmFsdWVzPzogYW55LFxuICAgIHJlYXNvbj86IHN0cmluZ1xuICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBhdWRpdElkID0gcmFuZG9tVVVJRCgpO1xuICAgIGNvbnN0IG1vZGlmaWVkQXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG5cbiAgICBjb25zdCBhdWRpdEVudHJ5OiBDbGFzc1Njb3JlQXVkaXRFbnRyeSA9IHtcbiAgICAgIGlkOiBhdWRpdElkLFxuICAgICAgY2xhc3NTY29yZUlkLFxuICAgICAgYWN0aW9uLFxuICAgICAgbW9kaWZpZWRCeSxcbiAgICAgIG1vZGlmaWVkQXQsXG4gICAgICBwcmV2aW91c1ZhbHVlcyxcbiAgICAgIG5ld1ZhbHVlcyxcbiAgICAgIHJlYXNvblxuICAgIH07XG5cbiAgICBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKG5ldyBQdXRDb21tYW5kKHtcbiAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXG4gICAgICBJdGVtOiB7XG4gICAgICAgIFBLOiBgQ0xBU1NfU0NPUkVfQVVESVQjJHtjbGFzc1Njb3JlSWR9YCxcbiAgICAgICAgU0s6IGBFTlRSWSMke21vZGlmaWVkQXR9IyR7YXVkaXRJZH1gLFxuICAgICAgICAuLi5hdWRpdEVudHJ5LFxuICAgICAgfSxcbiAgICB9KSk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsY3VsYXRlIHRvdGFsIGNsYXNzIHNjb3JlIGZyb20gaW5kaXZpZHVhbCBjYXRlZ29yeSBzY29yZXNcbiAgICovXG4gIHByaXZhdGUgY2FsY3VsYXRlQ2xhc3NUb3RhbFNjb3JlKFxuICAgIGJlYXV0eVNjb3JlOiBudW1iZXIsXG4gICAgcGVyc29uYWxpdHlTY29yZTogbnVtYmVyLFxuICAgIGJhbGFuY2VQcm9wb3J0aW9uU2NvcmU6IG51bWJlclxuICApOiBudW1iZXIge1xuICAgIHJldHVybiBiZWF1dHlTY29yZSArIHBlcnNvbmFsaXR5U2NvcmUgKyBiYWxhbmNlUHJvcG9ydGlvblNjb3JlO1xuICB9XG5cbiAgLyoqXG4gICAqIERldGVybWluZSByaWJib24gZWxpZ2liaWxpdHkgYmFzZWQgb24gdG90YWwgc2NvcmUgYW5kIGhlYWx0aC9ncm9vbWluZyBjaGVja2xpc3RcbiAgICovXG4gIHByaXZhdGUgY2FsY3VsYXRlUmliYm9uRWxpZ2liaWxpdHkoXG4gICAgdG90YWxTY29yZTogbnVtYmVyLFxuICAgIGhlYWx0aENoZWNrbGlzdDogSGVhbHRoR3Jvb21pbmdDaGVja2xpc3RcbiAgKTogUmliYm9uVHlwZSB7XG4gICAgLy8gQ2hlY2sgaWYgYWxsIGhlYWx0aCBpdGVtcyBwYXNzIChleGNsdWRpbmcgZmxlYSBpc3N1ZXMgd2hpY2ggaXMgYSBuZWdhdGl2ZSBpbmRpY2F0b3IpXG4gICAgY29uc3QgaGVhbHRoSXRlbXNQYXNzZWQgPSBoZWFsdGhDaGVja2xpc3QuY29hdENsZWFuR3Jvb21lZCAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWFsdGhDaGVja2xpc3QudGVldGhHdW1zSGVhbHRoeSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWFsdGhDaGVja2xpc3QuZXllc05vc2VDbGVhciAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWFsdGhDaGVja2xpc3QuZWFyc0NsZWFuTWl0ZUZyZWUgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVhbHRoQ2hlY2tsaXN0LnRvZW5haWxzQ2xpcHBlZDtcblxuICAgIC8vIElmIGFueSBoZWFsdGggaXRlbSBmYWlscyBPUiBmbGVhIGlzc3VlcyBhcmUgcHJlc2VudCwgUmVkIFJpYmJvbiByZWdhcmRsZXNzIG9mIHNjb3JlXG4gICAgaWYgKCFoZWFsdGhJdGVtc1Bhc3NlZCB8fCBoZWFsdGhDaGVja2xpc3QuZmxlYUlzc3Vlcykge1xuICAgICAgcmV0dXJuICdSZWQnO1xuICAgIH1cblxuICAgIC8vIERldGVybWluZSByaWJib24gYmFzZWQgb24gc2NvcmUgdGhyZXNob2xkc1xuICAgIGlmICh0b3RhbFNjb3JlID49IDQ1ICYmIHRvdGFsU2NvcmUgPD0gNTApIHtcbiAgICAgIHJldHVybiAnQmx1ZSc7XG4gICAgfSBlbHNlIGlmICh0b3RhbFNjb3JlID49IDM1ICYmIHRvdGFsU2NvcmUgPD0gNDQpIHtcbiAgICAgIHJldHVybiAnUmVkJztcbiAgICB9IGVsc2UgaWYgKHRvdGFsU2NvcmUgPj0gMjUgJiYgdG90YWxTY29yZSA8PSAzNCkge1xuICAgICAgcmV0dXJuICdXaGl0ZSc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiAnUGFydGljaXBhdGlvbic7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5ldyBjbGFzcyBzY29yZSByZWNvcmRcbiAgICovXG4gIGFzeW5jIGNyZWF0ZUNsYXNzU2NvcmUoaW5wdXQ6IENyZWF0ZUNsYXNzU2NvcmVJbnB1dCk6IFByb21pc2U8Q2xhc3NTY29yZT4ge1xuICAgIGNvbnN0IGlkID0gcmFuZG9tVVVJRCgpO1xuICAgIGNvbnN0IHRpbWVzdGFtcCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICBjb25zdCB0b3RhbFNjb3JlID0gdGhpcy5jYWxjdWxhdGVDbGFzc1RvdGFsU2NvcmUoXG4gICAgICBpbnB1dC5iZWF1dHlTY29yZSxcbiAgICAgIGlucHV0LnBlcnNvbmFsaXR5U2NvcmUsXG4gICAgICBpbnB1dC5iYWxhbmNlUHJvcG9ydGlvblNjb3JlXG4gICAgKTtcblxuICAgIGNvbnN0IGhlYWx0aENoZWNrbGlzdDogSGVhbHRoR3Jvb21pbmdDaGVja2xpc3QgPSB7XG4gICAgICBjb2F0Q2xlYW5Hcm9vbWVkOiBpbnB1dC5jb2F0Q2xlYW5Hcm9vbWVkLFxuICAgICAgdGVldGhHdW1zSGVhbHRoeTogaW5wdXQudGVldGhHdW1zSGVhbHRoeSxcbiAgICAgIGV5ZXNOb3NlQ2xlYXI6IGlucHV0LmV5ZXNOb3NlQ2xlYXIsXG4gICAgICBlYXJzQ2xlYW5NaXRlRnJlZTogaW5wdXQuZWFyc0NsZWFuTWl0ZUZyZWUsXG4gICAgICB0b2VuYWlsc0NsaXBwZWQ6IGlucHV0LnRvZW5haWxzQ2xpcHBlZCxcbiAgICAgIGZsZWFJc3N1ZXM6IGlucHV0LmZsZWFJc3N1ZXNcbiAgICB9O1xuXG4gICAgY29uc3QgcmliYm9uRWxpZ2liaWxpdHkgPSB0aGlzLmNhbGN1bGF0ZVJpYmJvbkVsaWdpYmlsaXR5KHRvdGFsU2NvcmUsIGhlYWx0aENoZWNrbGlzdCk7XG5cbiAgICBjb25zdCBjbGFzc1Njb3JlOiBDbGFzc1Njb3JlID0ge1xuICAgICAgaWQsXG4gICAgICBjYXRJZDogaW5wdXQuY2F0SWQsXG4gICAgICBqdWRnZUlkOiBpbnB1dC5qdWRnZUlkLFxuICAgICAganVkZ2VOYW1lOiBpbnB1dC5qdWRnZU5hbWUsXG4gICAgICBiZWF1dHlTY29yZTogaW5wdXQuYmVhdXR5U2NvcmUsXG4gICAgICBiZWF1dHlDb21tZW50czogaW5wdXQuYmVhdXR5Q29tbWVudHMsXG4gICAgICBwZXJzb25hbGl0eVNjb3JlOiBpbnB1dC5wZXJzb25hbGl0eVNjb3JlLFxuICAgICAgcGVyc29uYWxpdHlDb21tZW50czogaW5wdXQucGVyc29uYWxpdHlDb21tZW50cyxcbiAgICAgIGJhbGFuY2VQcm9wb3J0aW9uU2NvcmU6IGlucHV0LmJhbGFuY2VQcm9wb3J0aW9uU2NvcmUsXG4gICAgICBiYWxhbmNlUHJvcG9ydGlvbkNvbW1lbnRzOiBpbnB1dC5iYWxhbmNlUHJvcG9ydGlvbkNvbW1lbnRzLFxuICAgICAgY29hdENsZWFuR3Jvb21lZDogaW5wdXQuY29hdENsZWFuR3Jvb21lZCxcbiAgICAgIHRlZXRoR3Vtc0hlYWx0aHk6IGlucHV0LnRlZXRoR3Vtc0hlYWx0aHksXG4gICAgICBleWVzTm9zZUNsZWFyOiBpbnB1dC5leWVzTm9zZUNsZWFyLFxuICAgICAgZWFyc0NsZWFuTWl0ZUZyZWU6IGlucHV0LmVhcnNDbGVhbk1pdGVGcmVlLFxuICAgICAgdG9lbmFpbHNDbGlwcGVkOiBpbnB1dC50b2VuYWlsc0NsaXBwZWQsXG4gICAgICBmbGVhSXNzdWVzOiBpbnB1dC5mbGVhSXNzdWVzLFxuICAgICAgaGVhbHRoR3Jvb21pbmdDb21tZW50czogaW5wdXQuaGVhbHRoR3Jvb21pbmdDb21tZW50cyxcbiAgICAgIHRvdGFsU2NvcmUsXG4gICAgICByaWJib25FbGlnaWJpbGl0eSxcbiAgICAgIHRpbWVzdGFtcCxcbiAgICAgIGlzRmluYWxpemVkOiBpbnB1dC5pc0ZpbmFsaXplZCB8fCBmYWxzZSxcbiAgICAgIG1vZGlmaWNhdGlvbkNvdW50OiAwLFxuICAgICAgbGFzdE1vZGlmaWVkQnk6IGlucHV0Lmp1ZGdlTmFtZSxcbiAgICAgIGxhc3RNb2RpZmllZEF0OiB0aW1lc3RhbXAsXG4gICAgfTtcblxuICAgIC8vIFN0b3JlIG1haW4gY2xhc3Mgc2NvcmUgcmVjb3JkXG4gICAgYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChuZXcgUHV0Q29tbWFuZCh7XG4gICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxuICAgICAgSXRlbToge1xuICAgICAgICBQSzogYENMQVNTX1NDT1JFIyR7aWR9YCxcbiAgICAgICAgU0s6ICdNRVRBREFUQScsXG4gICAgICAgIC4uLmNsYXNzU2NvcmUsXG4gICAgICB9LFxuICAgIH0pKTtcblxuICAgIC8vIFN0b3JlIGNsYXNzLXNjb3JlLWJ5LWNhdCBpbmRleCByZWNvcmRcbiAgICBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKG5ldyBQdXRDb21tYW5kKHtcbiAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXG4gICAgICBJdGVtOiB7XG4gICAgICAgIFBLOiBgQ0FUIyR7aW5wdXQuY2F0SWR9YCxcbiAgICAgICAgU0s6IGBDTEFTU19TQ09SRSMke2lkfWAsXG4gICAgICAgIGNsYXNzU2NvcmVJZDogaWQsXG4gICAgICAgIGp1ZGdlSWQ6IGlucHV0Lmp1ZGdlSWQsXG4gICAgICAgIGp1ZGdlTmFtZTogaW5wdXQuanVkZ2VOYW1lLFxuICAgICAgICB0b3RhbFNjb3JlLFxuICAgICAgICByaWJib25FbGlnaWJpbGl0eSxcbiAgICAgICAgdGltZXN0YW1wLFxuICAgICAgICBpc0ZpbmFsaXplZDogaW5wdXQuaXNGaW5hbGl6ZWQgfHwgZmFsc2UsXG4gICAgICB9LFxuICAgIH0pKTtcblxuICAgIC8vIFN0b3JlIGNsYXNzLXNjb3JlLWJ5LWp1ZGdlIGluZGV4IHJlY29yZFxuICAgIGF3YWl0IHRoaXMuZG9jQ2xpZW50LnNlbmQobmV3IFB1dENvbW1hbmQoe1xuICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcbiAgICAgIEl0ZW06IHtcbiAgICAgICAgUEs6IGBKVURHRSMke2lucHV0Lmp1ZGdlSWR9YCxcbiAgICAgICAgU0s6IGBDTEFTU19TQ09SRSMke2lkfWAsXG4gICAgICAgIGNsYXNzU2NvcmVJZDogaWQsXG4gICAgICAgIGNhdElkOiBpbnB1dC5jYXRJZCxcbiAgICAgICAgdG90YWxTY29yZSxcbiAgICAgICAgcmliYm9uRWxpZ2liaWxpdHksXG4gICAgICAgIHRpbWVzdGFtcCxcbiAgICAgICAgaXNGaW5hbGl6ZWQ6IGlucHV0LmlzRmluYWxpemVkIHx8IGZhbHNlLFxuICAgICAgfSxcbiAgICB9KSk7XG5cbiAgICAvLyBDcmVhdGUgYXVkaXQgdHJhaWwgZW50cnkgZm9yIGNyZWF0aW9uXG4gICAgYXdhaXQgdGhpcy5jcmVhdGVBdWRpdEVudHJ5KFxuICAgICAgaWQsXG4gICAgICAnQ1JFQVRFJyxcbiAgICAgIGlucHV0Lmp1ZGdlTmFtZSxcbiAgICAgIG51bGwsXG4gICAgICBjbGFzc1Njb3JlLFxuICAgICAgJ0luaXRpYWwgY2xhc3Mgc2NvcmUgY3JlYXRpb24nXG4gICAgKTtcblxuICAgIHJldHVybiBjbGFzc1Njb3JlO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhIGNsYXNzIHNjb3JlIGJ5IElEXG4gICAqL1xuICBhc3luYyBnZXRDbGFzc1Njb3JlKGlkOiBzdHJpbmcpOiBQcm9taXNlPENsYXNzU2NvcmUgfCBudWxsPiB7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChuZXcgR2V0Q29tbWFuZCh7XG4gICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxuICAgICAgS2V5OiB7IFBLOiBgQ0xBU1NfU0NPUkUjJHtpZH1gLCBTSzogJ01FVEFEQVRBJyB9LFxuICAgIH0pKTtcblxuICAgIGlmICghcmVzdWx0Lkl0ZW0pIHJldHVybiBudWxsO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiByZXN1bHQuSXRlbS5pZCxcbiAgICAgIGNhdElkOiByZXN1bHQuSXRlbS5jYXRJZCxcbiAgICAgIGp1ZGdlSWQ6IHJlc3VsdC5JdGVtLmp1ZGdlSWQsXG4gICAgICBqdWRnZU5hbWU6IHJlc3VsdC5JdGVtLmp1ZGdlTmFtZSxcbiAgICAgIGJlYXV0eVNjb3JlOiBwYXJzZUludChyZXN1bHQuSXRlbS5iZWF1dHlTY29yZSkgfHwgMCxcbiAgICAgIGJlYXV0eUNvbW1lbnRzOiByZXN1bHQuSXRlbS5iZWF1dHlDb21tZW50cyxcbiAgICAgIHBlcnNvbmFsaXR5U2NvcmU6IHBhcnNlSW50KHJlc3VsdC5JdGVtLnBlcnNvbmFsaXR5U2NvcmUpIHx8IDAsXG4gICAgICBwZXJzb25hbGl0eUNvbW1lbnRzOiByZXN1bHQuSXRlbS5wZXJzb25hbGl0eUNvbW1lbnRzLFxuICAgICAgYmFsYW5jZVByb3BvcnRpb25TY29yZTogcGFyc2VJbnQocmVzdWx0Lkl0ZW0uYmFsYW5jZVByb3BvcnRpb25TY29yZSkgfHwgMCxcbiAgICAgIGJhbGFuY2VQcm9wb3J0aW9uQ29tbWVudHM6IHJlc3VsdC5JdGVtLmJhbGFuY2VQcm9wb3J0aW9uQ29tbWVudHMsXG4gICAgICBjb2F0Q2xlYW5Hcm9vbWVkOiByZXN1bHQuSXRlbS5jb2F0Q2xlYW5Hcm9vbWVkLFxuICAgICAgdGVldGhHdW1zSGVhbHRoeTogcmVzdWx0Lkl0ZW0udGVldGhHdW1zSGVhbHRoeSxcbiAgICAgIGV5ZXNOb3NlQ2xlYXI6IHJlc3VsdC5JdGVtLmV5ZXNOb3NlQ2xlYXIsXG4gICAgICBlYXJzQ2xlYW5NaXRlRnJlZTogcmVzdWx0Lkl0ZW0uZWFyc0NsZWFuTWl0ZUZyZWUsXG4gICAgICB0b2VuYWlsc0NsaXBwZWQ6IHJlc3VsdC5JdGVtLnRvZW5haWxzQ2xpcHBlZCxcbiAgICAgIGZsZWFJc3N1ZXM6IHJlc3VsdC5JdGVtLmZsZWFJc3N1ZXMsXG4gICAgICBoZWFsdGhHcm9vbWluZ0NvbW1lbnRzOiByZXN1bHQuSXRlbS5oZWFsdGhHcm9vbWluZ0NvbW1lbnRzLFxuICAgICAgdG90YWxTY29yZTogcGFyc2VJbnQocmVzdWx0Lkl0ZW0udG90YWxTY29yZSkgfHwgMCxcbiAgICAgIHJpYmJvbkVsaWdpYmlsaXR5OiByZXN1bHQuSXRlbS5yaWJib25FbGlnaWJpbGl0eSxcbiAgICAgIHRpbWVzdGFtcDogcmVzdWx0Lkl0ZW0udGltZXN0YW1wLFxuICAgICAgaXNGaW5hbGl6ZWQ6IHJlc3VsdC5JdGVtLmlzRmluYWxpemVkLFxuICAgICAgbW9kaWZpY2F0aW9uQ291bnQ6IHBhcnNlSW50KHJlc3VsdC5JdGVtLm1vZGlmaWNhdGlvbkNvdW50KSB8fCAwLFxuICAgICAgbGFzdE1vZGlmaWVkQnk6IHJlc3VsdC5JdGVtLmxhc3RNb2RpZmllZEJ5LFxuICAgICAgbGFzdE1vZGlmaWVkQXQ6IHJlc3VsdC5JdGVtLmxhc3RNb2RpZmllZEF0LFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlIGFuIGV4aXN0aW5nIGNsYXNzIHNjb3JlIHdpdGggYXVkaXQgdHJhaWxcbiAgICovXG4gIGFzeW5jIHVwZGF0ZUNsYXNzU2NvcmUoaWQ6IHN0cmluZywgaW5wdXQ6IFVwZGF0ZUNsYXNzU2NvcmVJbnB1dCwgbW9kaWZpZWRCeTogc3RyaW5nKTogUHJvbWlzZTxDbGFzc1Njb3JlPiB7XG4gICAgLy8gRmlyc3QgZ2V0IHRoZSBleGlzdGluZyBjbGFzcyBzY29yZVxuICAgIGNvbnN0IGV4aXN0aW5nU2NvcmUgPSBhd2FpdCB0aGlzLmdldENsYXNzU2NvcmUoaWQpO1xuICAgIGlmICghZXhpc3RpbmdTY29yZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDbGFzcyBzY29yZSBub3QgZm91bmQnKTtcbiAgICB9XG5cbiAgICAvLyBDYWxjdWxhdGUgbmV3IHRvdGFsIHNjb3JlIGFuZCByaWJib24gZWxpZ2liaWxpdHkgaWYgYW55IGNhdGVnb3J5IHNjb3JlcyBhcmUgYmVpbmcgdXBkYXRlZFxuICAgIGNvbnN0IHVwZGF0ZWRTY29yZSA9IHsgLi4uZXhpc3RpbmdTY29yZSwgLi4uaW5wdXQgfTtcbiAgICBjb25zdCBuZXdUb3RhbFNjb3JlID0gdGhpcy5jYWxjdWxhdGVDbGFzc1RvdGFsU2NvcmUoXG4gICAgICB1cGRhdGVkU2NvcmUuYmVhdXR5U2NvcmUsXG4gICAgICB1cGRhdGVkU2NvcmUucGVyc29uYWxpdHlTY29yZSxcbiAgICAgIHVwZGF0ZWRTY29yZS5iYWxhbmNlUHJvcG9ydGlvblNjb3JlXG4gICAgKTtcblxuICAgIGNvbnN0IGhlYWx0aENoZWNrbGlzdDogSGVhbHRoR3Jvb21pbmdDaGVja2xpc3QgPSB7XG4gICAgICBjb2F0Q2xlYW5Hcm9vbWVkOiB1cGRhdGVkU2NvcmUuY29hdENsZWFuR3Jvb21lZCxcbiAgICAgIHRlZXRoR3Vtc0hlYWx0aHk6IHVwZGF0ZWRTY29yZS50ZWV0aEd1bXNIZWFsdGh5LFxuICAgICAgZXllc05vc2VDbGVhcjogdXBkYXRlZFNjb3JlLmV5ZXNOb3NlQ2xlYXIsXG4gICAgICBlYXJzQ2xlYW5NaXRlRnJlZTogdXBkYXRlZFNjb3JlLmVhcnNDbGVhbk1pdGVGcmVlLFxuICAgICAgdG9lbmFpbHNDbGlwcGVkOiB1cGRhdGVkU2NvcmUudG9lbmFpbHNDbGlwcGVkLFxuICAgICAgZmxlYUlzc3VlczogdXBkYXRlZFNjb3JlLmZsZWFJc3N1ZXNcbiAgICB9O1xuXG4gICAgY29uc3QgbmV3UmliYm9uRWxpZ2liaWxpdHkgPSB0aGlzLmNhbGN1bGF0ZVJpYmJvbkVsaWdpYmlsaXR5KG5ld1RvdGFsU2NvcmUsIGhlYWx0aENoZWNrbGlzdCk7XG5cbiAgICBjb25zdCB0aW1lc3RhbXAgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgY29uc3QgZmluYWxTY29yZTogQ2xhc3NTY29yZSA9IHtcbiAgICAgIC4uLnVwZGF0ZWRTY29yZSxcbiAgICAgIHRvdGFsU2NvcmU6IG5ld1RvdGFsU2NvcmUsXG4gICAgICByaWJib25FbGlnaWJpbGl0eTogbmV3UmliYm9uRWxpZ2liaWxpdHksXG4gICAgICB0aW1lc3RhbXAsIC8vIFVwZGF0ZSB0aW1lc3RhbXAgb24gbW9kaWZpY2F0aW9uXG4gICAgICBtb2RpZmljYXRpb25Db3VudDogKGV4aXN0aW5nU2NvcmUubW9kaWZpY2F0aW9uQ291bnQgfHwgMCkgKyAxLFxuICAgICAgbGFzdE1vZGlmaWVkQnk6IG1vZGlmaWVkQnksXG4gICAgICBsYXN0TW9kaWZpZWRBdDogdGltZXN0YW1wLFxuICAgIH07XG5cbiAgICAvLyBDcmVhdGUgYXVkaXQgdHJhaWwgZW50cnkgYmVmb3JlIHVwZGF0aW5nXG4gICAgYXdhaXQgdGhpcy5jcmVhdGVBdWRpdEVudHJ5KFxuICAgICAgaWQsXG4gICAgICAnVVBEQVRFJyxcbiAgICAgIG1vZGlmaWVkQnksXG4gICAgICBleGlzdGluZ1Njb3JlLFxuICAgICAgZmluYWxTY29yZSxcbiAgICAgIGlucHV0Lm1vZGlmaWNhdGlvblJlYXNvbiB8fCAnQ2xhc3Mgc2NvcmUgdXBkYXRlZCdcbiAgICApO1xuXG4gICAgLy8gVXBkYXRlIG1haW4gY2xhc3Mgc2NvcmUgcmVjb3JkXG4gICAgYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChuZXcgVXBkYXRlQ29tbWFuZCh7XG4gICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxuICAgICAgS2V5OiB7XG4gICAgICAgIFBLOiBgQ0xBU1NfU0NPUkUjJHtpZH1gLFxuICAgICAgICBTSzogJ01FVEFEQVRBJyxcbiAgICAgIH0sXG4gICAgICBVcGRhdGVFeHByZXNzaW9uOiBgU0VUIFxuICAgICAgICBiZWF1dHlTY29yZSA9IDpiZWF1dHlTY29yZSxcbiAgICAgICAgYmVhdXR5Q29tbWVudHMgPSA6YmVhdXR5Q29tbWVudHMsXG4gICAgICAgIHBlcnNvbmFsaXR5U2NvcmUgPSA6cGVyc29uYWxpdHlTY29yZSxcbiAgICAgICAgcGVyc29uYWxpdHlDb21tZW50cyA9IDpwZXJzb25hbGl0eUNvbW1lbnRzLFxuICAgICAgICBiYWxhbmNlUHJvcG9ydGlvblNjb3JlID0gOmJhbGFuY2VQcm9wb3J0aW9uU2NvcmUsXG4gICAgICAgIGJhbGFuY2VQcm9wb3J0aW9uQ29tbWVudHMgPSA6YmFsYW5jZVByb3BvcnRpb25Db21tZW50cyxcbiAgICAgICAgY29hdENsZWFuR3Jvb21lZCA9IDpjb2F0Q2xlYW5Hcm9vbWVkLFxuICAgICAgICB0ZWV0aEd1bXNIZWFsdGh5ID0gOnRlZXRoR3Vtc0hlYWx0aHksXG4gICAgICAgIGV5ZXNOb3NlQ2xlYXIgPSA6ZXllc05vc2VDbGVhcixcbiAgICAgICAgZWFyc0NsZWFuTWl0ZUZyZWUgPSA6ZWFyc0NsZWFuTWl0ZUZyZWUsXG4gICAgICAgIHRvZW5haWxzQ2xpcHBlZCA9IDp0b2VuYWlsc0NsaXBwZWQsXG4gICAgICAgIGZsZWFJc3N1ZXMgPSA6ZmxlYUlzc3VlcyxcbiAgICAgICAgaGVhbHRoR3Jvb21pbmdDb21tZW50cyA9IDpoZWFsdGhHcm9vbWluZ0NvbW1lbnRzLFxuICAgICAgICB0b3RhbFNjb3JlID0gOnRvdGFsU2NvcmUsXG4gICAgICAgIHJpYmJvbkVsaWdpYmlsaXR5ID0gOnJpYmJvbkVsaWdpYmlsaXR5LFxuICAgICAgICAjdGltZXN0YW1wID0gOnRpbWVzdGFtcCxcbiAgICAgICAgaXNGaW5hbGl6ZWQgPSA6aXNGaW5hbGl6ZWQsXG4gICAgICAgIG1vZGlmaWNhdGlvbkNvdW50ID0gOm1vZGlmaWNhdGlvbkNvdW50LFxuICAgICAgICBsYXN0TW9kaWZpZWRCeSA9IDpsYXN0TW9kaWZpZWRCeSxcbiAgICAgICAgbGFzdE1vZGlmaWVkQXQgPSA6bGFzdE1vZGlmaWVkQXRgLFxuICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzOiB7XG4gICAgICAgICcjdGltZXN0YW1wJzogJ3RpbWVzdGFtcCdcbiAgICAgIH0sXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XG4gICAgICAgICc6YmVhdXR5U2NvcmUnOiBmaW5hbFNjb3JlLmJlYXV0eVNjb3JlLFxuICAgICAgICAnOmJlYXV0eUNvbW1lbnRzJzogZmluYWxTY29yZS5iZWF1dHlDb21tZW50cyB8fCBudWxsLFxuICAgICAgICAnOnBlcnNvbmFsaXR5U2NvcmUnOiBmaW5hbFNjb3JlLnBlcnNvbmFsaXR5U2NvcmUsXG4gICAgICAgICc6cGVyc29uYWxpdHlDb21tZW50cyc6IGZpbmFsU2NvcmUucGVyc29uYWxpdHlDb21tZW50cyB8fCBudWxsLFxuICAgICAgICAnOmJhbGFuY2VQcm9wb3J0aW9uU2NvcmUnOiBmaW5hbFNjb3JlLmJhbGFuY2VQcm9wb3J0aW9uU2NvcmUsXG4gICAgICAgICc6YmFsYW5jZVByb3BvcnRpb25Db21tZW50cyc6IGZpbmFsU2NvcmUuYmFsYW5jZVByb3BvcnRpb25Db21tZW50cyB8fCBudWxsLFxuICAgICAgICAnOmNvYXRDbGVhbkdyb29tZWQnOiBmaW5hbFNjb3JlLmNvYXRDbGVhbkdyb29tZWQsXG4gICAgICAgICc6dGVldGhHdW1zSGVhbHRoeSc6IGZpbmFsU2NvcmUudGVldGhHdW1zSGVhbHRoeSxcbiAgICAgICAgJzpleWVzTm9zZUNsZWFyJzogZmluYWxTY29yZS5leWVzTm9zZUNsZWFyLFxuICAgICAgICAnOmVhcnNDbGVhbk1pdGVGcmVlJzogZmluYWxTY29yZS5lYXJzQ2xlYW5NaXRlRnJlZSxcbiAgICAgICAgJzp0b2VuYWlsc0NsaXBwZWQnOiBmaW5hbFNjb3JlLnRvZW5haWxzQ2xpcHBlZCxcbiAgICAgICAgJzpmbGVhSXNzdWVzJzogZmluYWxTY29yZS5mbGVhSXNzdWVzLFxuICAgICAgICAnOmhlYWx0aEdyb29taW5nQ29tbWVudHMnOiBmaW5hbFNjb3JlLmhlYWx0aEdyb29taW5nQ29tbWVudHMgfHwgbnVsbCxcbiAgICAgICAgJzp0b3RhbFNjb3JlJzogZmluYWxTY29yZS50b3RhbFNjb3JlLFxuICAgICAgICAnOnJpYmJvbkVsaWdpYmlsaXR5JzogZmluYWxTY29yZS5yaWJib25FbGlnaWJpbGl0eSxcbiAgICAgICAgJzp0aW1lc3RhbXAnOiB0aW1lc3RhbXAsXG4gICAgICAgICc6aXNGaW5hbGl6ZWQnOiBmaW5hbFNjb3JlLmlzRmluYWxpemVkLFxuICAgICAgICAnOm1vZGlmaWNhdGlvbkNvdW50JzogZmluYWxTY29yZS5tb2RpZmljYXRpb25Db3VudCxcbiAgICAgICAgJzpsYXN0TW9kaWZpZWRCeSc6IGZpbmFsU2NvcmUubGFzdE1vZGlmaWVkQnksXG4gICAgICAgICc6bGFzdE1vZGlmaWVkQXQnOiBmaW5hbFNjb3JlLmxhc3RNb2RpZmllZEF0LFxuICAgICAgfVxuICAgIH0pKTtcblxuICAgIC8vIFVwZGF0ZSBjbGFzcy1zY29yZS1ieS1jYXQgaW5kZXggcmVjb3JkXG4gICAgYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChuZXcgUHV0Q29tbWFuZCh7XG4gICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxuICAgICAgSXRlbToge1xuICAgICAgICBQSzogYENBVCMke2V4aXN0aW5nU2NvcmUuY2F0SWR9YCxcbiAgICAgICAgU0s6IGBDTEFTU19TQ09SRSMke2lkfWAsXG4gICAgICAgIGNsYXNzU2NvcmVJZDogaWQsXG4gICAgICAgIGp1ZGdlSWQ6IGV4aXN0aW5nU2NvcmUuanVkZ2VJZCxcbiAgICAgICAganVkZ2VOYW1lOiBleGlzdGluZ1Njb3JlLmp1ZGdlTmFtZSxcbiAgICAgICAgdG90YWxTY29yZTogbmV3VG90YWxTY29yZSxcbiAgICAgICAgcmliYm9uRWxpZ2liaWxpdHk6IG5ld1JpYmJvbkVsaWdpYmlsaXR5LFxuICAgICAgICB0aW1lc3RhbXAsXG4gICAgICAgIGlzRmluYWxpemVkOiBmaW5hbFNjb3JlLmlzRmluYWxpemVkLFxuICAgICAgfSxcbiAgICB9KSk7XG5cbiAgICAvLyBVcGRhdGUgY2xhc3Mtc2NvcmUtYnktanVkZ2UgaW5kZXggcmVjb3JkXG4gICAgYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChuZXcgUHV0Q29tbWFuZCh7XG4gICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxuICAgICAgSXRlbToge1xuICAgICAgICBQSzogYEpVREdFIyR7ZXhpc3RpbmdTY29yZS5qdWRnZUlkfWAsXG4gICAgICAgIFNLOiBgQ0xBU1NfU0NPUkUjJHtpZH1gLFxuICAgICAgICBjbGFzc1Njb3JlSWQ6IGlkLFxuICAgICAgICBjYXRJZDogZXhpc3RpbmdTY29yZS5jYXRJZCxcbiAgICAgICAgdG90YWxTY29yZTogbmV3VG90YWxTY29yZSxcbiAgICAgICAgcmliYm9uRWxpZ2liaWxpdHk6IG5ld1JpYmJvbkVsaWdpYmlsaXR5LFxuICAgICAgICB0aW1lc3RhbXAsXG4gICAgICAgIGlzRmluYWxpemVkOiBmaW5hbFNjb3JlLmlzRmluYWxpemVkLFxuICAgICAgfSxcbiAgICB9KSk7XG5cbiAgICByZXR1cm4gZmluYWxTY29yZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZWxldGUgYSBjbGFzcyBzY29yZSBhbmQgYWxsIGl0cyBpbmRleCByZWNvcmRzXG4gICAqL1xuICBhc3luYyBkZWxldGVDbGFzc1Njb3JlKGlkOiBzdHJpbmcpOiBQcm9taXNlPENsYXNzU2NvcmU+IHtcbiAgICBjb25zdCBleGlzdGluZ1Njb3JlID0gYXdhaXQgdGhpcy5nZXRDbGFzc1Njb3JlKGlkKTtcbiAgICBpZiAoIWV4aXN0aW5nU2NvcmUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2xhc3Mgc2NvcmUgbm90IGZvdW5kJyk7XG4gICAgfVxuXG4gICAgLy8gRGVsZXRlIG1haW4gY2xhc3Mgc2NvcmUgcmVjb3JkXG4gICAgYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChuZXcgRGVsZXRlQ29tbWFuZCh7XG4gICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxuICAgICAgS2V5OiB7IFBLOiBgQ0xBU1NfU0NPUkUjJHtpZH1gLCBTSzogJ01FVEFEQVRBJyB9LFxuICAgIH0pKTtcblxuICAgIC8vIERlbGV0ZSBjbGFzcy1zY29yZS1ieS1jYXQgaW5kZXggcmVjb3JkXG4gICAgYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChuZXcgRGVsZXRlQ29tbWFuZCh7XG4gICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxuICAgICAgS2V5OiB7IFBLOiBgQ0FUIyR7ZXhpc3RpbmdTY29yZS5jYXRJZH1gLCBTSzogYENMQVNTX1NDT1JFIyR7aWR9YCB9LFxuICAgIH0pKTtcblxuICAgIC8vIERlbGV0ZSBjbGFzcy1zY29yZS1ieS1qdWRnZSBpbmRleCByZWNvcmRcbiAgICBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKG5ldyBEZWxldGVDb21tYW5kKHtcbiAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXG4gICAgICBLZXk6IHsgUEs6IGBKVURHRSMke2V4aXN0aW5nU2NvcmUuanVkZ2VJZH1gLCBTSzogYENMQVNTX1NDT1JFIyR7aWR9YCB9LFxuICAgIH0pKTtcblxuICAgIHJldHVybiBleGlzdGluZ1Njb3JlO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhbGwgY2xhc3Mgc2NvcmVzIGZvciBhIHNwZWNpZmljIGNhdFxuICAgKi9cbiAgYXN5bmMgZ2V0Q2xhc3NTY29yZXNCeUNhdChjYXRJZDogc3RyaW5nKTogUHJvbWlzZTxDbGFzc1Njb3JlW10+IHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKG5ldyBRdWVyeUNvbW1hbmQoe1xuICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcbiAgICAgIEtleUNvbmRpdGlvbkV4cHJlc3Npb246ICdQSyA9IDpwayBBTkQgYmVnaW5zX3dpdGgoU0ssIDpzayknLFxuICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xuICAgICAgICAnOnBrJzogYENBVCMke2NhdElkfWAsXG4gICAgICAgICc6c2snOiAnQ0xBU1NfU0NPUkUjJyxcbiAgICAgIH0sXG4gICAgfSkpO1xuXG4gICAgaWYgKCFyZXN1bHQuSXRlbXMgfHwgcmVzdWx0Lkl0ZW1zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIC8vIEdldCBmdWxsIGNsYXNzIHNjb3JlIGRldGFpbHMgZm9yIGVhY2ggc2NvcmUgSURcbiAgICBjb25zdCBzY29yZVByb21pc2VzID0gcmVzdWx0Lkl0ZW1zLm1hcChpdGVtID0+IHRoaXMuZ2V0Q2xhc3NTY29yZShpdGVtLmNsYXNzU2NvcmVJZCkpO1xuICAgIGNvbnN0IHNjb3JlcyA9IGF3YWl0IFByb21pc2UuYWxsKHNjb3JlUHJvbWlzZXMpO1xuICAgIFxuICAgIHJldHVybiBzY29yZXMuZmlsdGVyKChzY29yZSk6IHNjb3JlIGlzIENsYXNzU2NvcmUgPT4gc2NvcmUgIT09IG51bGwpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhbGwgY2xhc3Mgc2NvcmVzIGJ5IGEgc3BlY2lmaWMganVkZ2VcbiAgICovXG4gIGFzeW5jIGdldENsYXNzU2NvcmVzQnlKdWRnZShqdWRnZUlkOiBzdHJpbmcpOiBQcm9taXNlPENsYXNzU2NvcmVbXT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZG9jQ2xpZW50LnNlbmQobmV3IFF1ZXJ5Q29tbWFuZCh7XG4gICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxuICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjogJ1BLID0gOnBrIEFORCBiZWdpbnNfd2l0aChTSywgOnNrKScsXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XG4gICAgICAgICc6cGsnOiBgSlVER0UjJHtqdWRnZUlkfWAsXG4gICAgICAgICc6c2snOiAnQ0xBU1NfU0NPUkUjJyxcbiAgICAgIH0sXG4gICAgfSkpO1xuXG4gICAgaWYgKCFyZXN1bHQuSXRlbXMgfHwgcmVzdWx0Lkl0ZW1zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIC8vIEdldCBmdWxsIGNsYXNzIHNjb3JlIGRldGFpbHMgZm9yIGVhY2ggc2NvcmUgSURcbiAgICBjb25zdCBzY29yZVByb21pc2VzID0gcmVzdWx0Lkl0ZW1zLm1hcChpdGVtID0+IHRoaXMuZ2V0Q2xhc3NTY29yZShpdGVtLmNsYXNzU2NvcmVJZCkpO1xuICAgIGNvbnN0IHNjb3JlcyA9IGF3YWl0IFByb21pc2UuYWxsKHNjb3JlUHJvbWlzZXMpO1xuICAgIFxuICAgIHJldHVybiBzY29yZXMuZmlsdGVyKChzY29yZSk6IHNjb3JlIGlzIENsYXNzU2NvcmUgPT4gc2NvcmUgIT09IG51bGwpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBjbGFzcyBzY29yZXMgZm9yIGEgc3BlY2lmaWMgY2FnZSBudW1iZXIgKHJlcXVpcmVzIGxvb2tpbmcgdXAgY2F0IGZpcnN0KVxuICAgKi9cbiAgYXN5bmMgZ2V0Q2xhc3NTY29yZXNCeUNhZ2UoY2FnZU51bWJlcjogbnVtYmVyKTogUHJvbWlzZTxDbGFzc1Njb3JlW10+IHtcbiAgICAvLyBGaXJzdCBmaW5kIHRoZSBjYXQgd2l0aCB0aGlzIGNhZ2UgbnVtYmVyXG4gICAgY29uc3QgY2F0c1Jlc3VsdCA9IGF3YWl0IHRoaXMuZG9jQ2xpZW50LnNlbmQobmV3IFNjYW5Db21tYW5kKHtcbiAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXG4gICAgICBGaWx0ZXJFeHByZXNzaW9uOiAnYmVnaW5zX3dpdGgoUEssIDpwaykgQU5EIGNhZ2VOdW1iZXIgPSA6Y2FnZU51bWJlcicsXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XG4gICAgICAgICc6cGsnOiAnQ0FUIycsXG4gICAgICAgICc6Y2FnZU51bWJlcic6IGNhZ2VOdW1iZXIsXG4gICAgICB9LFxuICAgIH0pKTtcblxuICAgIGlmICghY2F0c1Jlc3VsdC5JdGVtcyB8fCBjYXRzUmVzdWx0Lkl0ZW1zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIC8vIEdldCB0aGUgY2F0IElEIChzaG91bGQgb25seSBiZSBvbmUgY2F0IHBlciBjYWdlKVxuICAgIGNvbnN0IGNhdElkID0gY2F0c1Jlc3VsdC5JdGVtc1swXS5QSy5yZXBsYWNlKCdDQVQjJywgJycpO1xuICAgIFxuICAgIHJldHVybiB0aGlzLmdldENsYXNzU2NvcmVzQnlDYXQoY2F0SWQpO1xuICB9XG5cbiAgLyoqXG4gICAqIExpc3QgYWxsIGNsYXNzIHNjb3JlcyBpbiB0aGUgc3lzdGVtXG4gICAqL1xuICBhc3luYyBsaXN0QWxsQ2xhc3NTY29yZXMoKTogUHJvbWlzZTxDbGFzc1Njb3JlW10+IHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKG5ldyBTY2FuQ29tbWFuZCh7XG4gICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxuICAgICAgRmlsdGVyRXhwcmVzc2lvbjogJ2JlZ2luc193aXRoKFBLLCA6cGspIEFORCBTSyA9IDpzaycsXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XG4gICAgICAgICc6cGsnOiAnQ0xBU1NfU0NPUkUjJyxcbiAgICAgICAgJzpzayc6ICdNRVRBREFUQScsXG4gICAgICB9LFxuICAgIH0pKTtcblxuICAgIGlmICghcmVzdWx0Lkl0ZW1zIHx8IHJlc3VsdC5JdGVtcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0Lkl0ZW1zLm1hcChpdGVtID0+ICh7XG4gICAgICBpZDogaXRlbS5pZCxcbiAgICAgIGNhdElkOiBpdGVtLmNhdElkLFxuICAgICAganVkZ2VJZDogaXRlbS5qdWRnZUlkLFxuICAgICAganVkZ2VOYW1lOiBpdGVtLmp1ZGdlTmFtZSxcbiAgICAgIGJlYXV0eVNjb3JlOiBwYXJzZUludChpdGVtLmJlYXV0eVNjb3JlKSB8fCAwLFxuICAgICAgYmVhdXR5Q29tbWVudHM6IGl0ZW0uYmVhdXR5Q29tbWVudHMsXG4gICAgICBwZXJzb25hbGl0eVNjb3JlOiBwYXJzZUludChpdGVtLnBlcnNvbmFsaXR5U2NvcmUpIHx8IDAsXG4gICAgICBwZXJzb25hbGl0eUNvbW1lbnRzOiBpdGVtLnBlcnNvbmFsaXR5Q29tbWVudHMsXG4gICAgICBiYWxhbmNlUHJvcG9ydGlvblNjb3JlOiBwYXJzZUludChpdGVtLmJhbGFuY2VQcm9wb3J0aW9uU2NvcmUpIHx8IDAsXG4gICAgICBiYWxhbmNlUHJvcG9ydGlvbkNvbW1lbnRzOiBpdGVtLmJhbGFuY2VQcm9wb3J0aW9uQ29tbWVudHMsXG4gICAgICBjb2F0Q2xlYW5Hcm9vbWVkOiBpdGVtLmNvYXRDbGVhbkdyb29tZWQsXG4gICAgICB0ZWV0aEd1bXNIZWFsdGh5OiBpdGVtLnRlZXRoR3Vtc0hlYWx0aHksXG4gICAgICBleWVzTm9zZUNsZWFyOiBpdGVtLmV5ZXNOb3NlQ2xlYXIsXG4gICAgICBlYXJzQ2xlYW5NaXRlRnJlZTogaXRlbS5lYXJzQ2xlYW5NaXRlRnJlZSxcbiAgICAgIHRvZW5haWxzQ2xpcHBlZDogaXRlbS50b2VuYWlsc0NsaXBwZWQsXG4gICAgICBmbGVhSXNzdWVzOiBpdGVtLmZsZWFJc3N1ZXMsXG4gICAgICBoZWFsdGhHcm9vbWluZ0NvbW1lbnRzOiBpdGVtLmhlYWx0aEdyb29taW5nQ29tbWVudHMsXG4gICAgICB0b3RhbFNjb3JlOiBwYXJzZUludChpdGVtLnRvdGFsU2NvcmUpIHx8IDAsXG4gICAgICByaWJib25FbGlnaWJpbGl0eTogaXRlbS5yaWJib25FbGlnaWJpbGl0eSxcbiAgICAgIHRpbWVzdGFtcDogaXRlbS50aW1lc3RhbXAsXG4gICAgICBpc0ZpbmFsaXplZDogaXRlbS5pc0ZpbmFsaXplZCxcbiAgICAgIG1vZGlmaWNhdGlvbkNvdW50OiBwYXJzZUludChpdGVtLm1vZGlmaWNhdGlvbkNvdW50KSB8fCAwLFxuICAgICAgbGFzdE1vZGlmaWVkQnk6IGl0ZW0ubGFzdE1vZGlmaWVkQnksXG4gICAgICBsYXN0TW9kaWZpZWRBdDogaXRlbS5sYXN0TW9kaWZpZWRBdCxcbiAgICB9KSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGF1ZGl0IGhpc3RvcnkgZm9yIGEgc3BlY2lmaWMgY2xhc3Mgc2NvcmVcbiAgICovXG4gIGFzeW5jIGdldENsYXNzU2NvcmVBdWRpdEhpc3RvcnkoY2xhc3NTY29yZUlkOiBzdHJpbmcpOiBQcm9taXNlPENsYXNzU2NvcmVBdWRpdEVudHJ5W10+IHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKG5ldyBRdWVyeUNvbW1hbmQoe1xuICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcbiAgICAgIEtleUNvbmRpdGlvbkV4cHJlc3Npb246ICdQSyA9IDpwayBBTkQgYmVnaW5zX3dpdGgoU0ssIDpzayknLFxuICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xuICAgICAgICAnOnBrJzogYENMQVNTX1NDT1JFX0FVRElUIyR7Y2xhc3NTY29yZUlkfWAsXG4gICAgICAgICc6c2snOiAnRU5UUlkjJyxcbiAgICAgIH0sXG4gICAgICBTY2FuSW5kZXhGb3J3YXJkOiBmYWxzZSwgLy8gTW9zdCByZWNlbnQgZmlyc3RcbiAgICB9KSk7XG5cbiAgICBpZiAoIXJlc3VsdC5JdGVtcyB8fCByZXN1bHQuSXRlbXMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdC5JdGVtcy5tYXAoaXRlbSA9PiAoe1xuICAgICAgaWQ6IGl0ZW0uaWQsXG4gICAgICBjbGFzc1Njb3JlSWQ6IGl0ZW0uY2xhc3NTY29yZUlkLFxuICAgICAgYWN0aW9uOiBpdGVtLmFjdGlvbixcbiAgICAgIG1vZGlmaWVkQnk6IGl0ZW0ubW9kaWZpZWRCeSxcbiAgICAgIG1vZGlmaWVkQXQ6IGl0ZW0ubW9kaWZpZWRBdCxcbiAgICAgIHByZXZpb3VzVmFsdWVzOiBpdGVtLnByZXZpb3VzVmFsdWVzLFxuICAgICAgbmV3VmFsdWVzOiBpdGVtLm5ld1ZhbHVlcyxcbiAgICAgIHJlYXNvbjogaXRlbS5yZWFzb24sXG4gICAgfSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmFsaXplIGEgY2xhc3Mgc2NvcmUgd2l0aCBjb25maXJtYXRpb25cbiAgICovXG4gIGFzeW5jIGZpbmFsaXplQ2xhc3NTY29yZShpZDogc3RyaW5nLCBtb2RpZmllZEJ5OiBzdHJpbmcpOiBQcm9taXNlPENsYXNzU2NvcmU+IHtcbiAgICBjb25zdCBleGlzdGluZ1Njb3JlID0gYXdhaXQgdGhpcy5nZXRDbGFzc1Njb3JlKGlkKTtcbiAgICBpZiAoIWV4aXN0aW5nU2NvcmUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2xhc3Mgc2NvcmUgbm90IGZvdW5kJyk7XG4gICAgfVxuXG4gICAgaWYgKGV4aXN0aW5nU2NvcmUuaXNGaW5hbGl6ZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2xhc3Mgc2NvcmUgaXMgYWxyZWFkeSBmaW5hbGl6ZWQnKTtcbiAgICB9XG5cbiAgICBjb25zdCB0aW1lc3RhbXAgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgY29uc3QgZmluYWxpemVkU2NvcmU6IENsYXNzU2NvcmUgPSB7XG4gICAgICAuLi5leGlzdGluZ1Njb3JlLFxuICAgICAgaXNGaW5hbGl6ZWQ6IHRydWUsXG4gICAgICBtb2RpZmljYXRpb25Db3VudDogKGV4aXN0aW5nU2NvcmUubW9kaWZpY2F0aW9uQ291bnQgfHwgMCkgKyAxLFxuICAgICAgbGFzdE1vZGlmaWVkQnk6IG1vZGlmaWVkQnksXG4gICAgICBsYXN0TW9kaWZpZWRBdDogdGltZXN0YW1wLFxuICAgIH07XG5cbiAgICAvLyBDcmVhdGUgYXVkaXQgdHJhaWwgZW50cnkgZm9yIGZpbmFsaXphdGlvblxuICAgIGF3YWl0IHRoaXMuY3JlYXRlQXVkaXRFbnRyeShcbiAgICAgIGlkLFxuICAgICAgJ0ZJTkFMSVpFJyxcbiAgICAgIG1vZGlmaWVkQnksXG4gICAgICBleGlzdGluZ1Njb3JlLFxuICAgICAgZmluYWxpemVkU2NvcmUsXG4gICAgICAnQ2xhc3Mgc2NvcmUgZmluYWxpemVkJ1xuICAgICk7XG5cbiAgICAvLyBVcGRhdGUgbWFpbiBjbGFzcyBzY29yZSByZWNvcmRcbiAgICBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKG5ldyBVcGRhdGVDb21tYW5kKHtcbiAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXG4gICAgICBLZXk6IHtcbiAgICAgICAgUEs6IGBDTEFTU19TQ09SRSMke2lkfWAsXG4gICAgICAgIFNLOiAnTUVUQURBVEEnLFxuICAgICAgfSxcbiAgICAgIFVwZGF0ZUV4cHJlc3Npb246IGBTRVQgXG4gICAgICAgIGlzRmluYWxpemVkID0gOmlzRmluYWxpemVkLFxuICAgICAgICBtb2RpZmljYXRpb25Db3VudCA9IDptb2RpZmljYXRpb25Db3VudCxcbiAgICAgICAgbGFzdE1vZGlmaWVkQnkgPSA6bGFzdE1vZGlmaWVkQnksXG4gICAgICAgIGxhc3RNb2RpZmllZEF0ID0gOmxhc3RNb2RpZmllZEF0YCxcbiAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcbiAgICAgICAgJzppc0ZpbmFsaXplZCc6IHRydWUsXG4gICAgICAgICc6bW9kaWZpY2F0aW9uQ291bnQnOiBmaW5hbGl6ZWRTY29yZS5tb2RpZmljYXRpb25Db3VudCxcbiAgICAgICAgJzpsYXN0TW9kaWZpZWRCeSc6IG1vZGlmaWVkQnksXG4gICAgICAgICc6bGFzdE1vZGlmaWVkQXQnOiB0aW1lc3RhbXAsXG4gICAgICB9XG4gICAgfSkpO1xuXG4gICAgLy8gVXBkYXRlIGluZGV4IHJlY29yZHNcbiAgICBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKG5ldyBQdXRDb21tYW5kKHtcbiAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXG4gICAgICBJdGVtOiB7XG4gICAgICAgIFBLOiBgQ0FUIyR7ZXhpc3RpbmdTY29yZS5jYXRJZH1gLFxuICAgICAgICBTSzogYENMQVNTX1NDT1JFIyR7aWR9YCxcbiAgICAgICAgY2xhc3NTY29yZUlkOiBpZCxcbiAgICAgICAganVkZ2VJZDogZXhpc3RpbmdTY29yZS5qdWRnZUlkLFxuICAgICAgICBqdWRnZU5hbWU6IGV4aXN0aW5nU2NvcmUuanVkZ2VOYW1lLFxuICAgICAgICB0b3RhbFNjb3JlOiBleGlzdGluZ1Njb3JlLnRvdGFsU2NvcmUsXG4gICAgICAgIHJpYmJvbkVsaWdpYmlsaXR5OiBleGlzdGluZ1Njb3JlLnJpYmJvbkVsaWdpYmlsaXR5LFxuICAgICAgICB0aW1lc3RhbXA6IGV4aXN0aW5nU2NvcmUudGltZXN0YW1wLFxuICAgICAgICBpc0ZpbmFsaXplZDogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfSkpO1xuXG4gICAgYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChuZXcgUHV0Q29tbWFuZCh7XG4gICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxuICAgICAgSXRlbToge1xuICAgICAgICBQSzogYEpVREdFIyR7ZXhpc3RpbmdTY29yZS5qdWRnZUlkfWAsXG4gICAgICAgIFNLOiBgQ0xBU1NfU0NPUkUjJHtpZH1gLFxuICAgICAgICBjbGFzc1Njb3JlSWQ6IGlkLFxuICAgICAgICBjYXRJZDogZXhpc3RpbmdTY29yZS5jYXRJZCxcbiAgICAgICAgdG90YWxTY29yZTogZXhpc3RpbmdTY29yZS50b3RhbFNjb3JlLFxuICAgICAgICByaWJib25FbGlnaWJpbGl0eTogZXhpc3RpbmdTY29yZS5yaWJib25FbGlnaWJpbGl0eSxcbiAgICAgICAgdGltZXN0YW1wOiBleGlzdGluZ1Njb3JlLnRpbWVzdGFtcCxcbiAgICAgICAgaXNGaW5hbGl6ZWQ6IHRydWUsXG4gICAgICB9LFxuICAgIH0pKTtcblxuICAgIHJldHVybiBmaW5hbGl6ZWRTY29yZTtcbiAgfVxufSJdfQ==