import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

export interface ClassScore {
  id: string;
  catId: string;
  judgeId: string;
  judgeName: string;
  beautyScore: number;
  beautyComments?: string;
  personalityScore: number;
  personalityComments?: string;
  balanceProportionScore: number;
  balanceProportionComments?: string;
  coatCleanGroomed: boolean;
  teethGumsHealthy: boolean;
  eyesNoseClear: boolean;
  earsCleanMiteFree: boolean;
  toenailsClipped: boolean;
  fleaIssues: boolean;
  healthGroomingComments?: string;
  totalScore: number;
  ribbonEligibility: string;
  timestamp: string;
  isFinalized: boolean;
  modificationCount: number;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
}

export interface ClassScoreAuditEntry {
  id: string;
  classScoreId: string;
  action: string;
  modifiedBy: string;
  modifiedAt: string;
  previousValues?: any;
  newValues?: any;
  reason?: string;
}

export interface CreateClassScoreInput {
  catId: string;
  judgeId: string;
  judgeName: string;
  beautyScore: number;
  beautyComments?: string;
  personalityScore: number;
  personalityComments?: string;
  balanceProportionScore: number;
  balanceProportionComments?: string;
  coatCleanGroomed: boolean;
  teethGumsHealthy: boolean;
  eyesNoseClear: boolean;
  earsCleanMiteFree: boolean;
  toenailsClipped: boolean;
  fleaIssues: boolean;
  healthGroomingComments?: string;
  isFinalized?: boolean;
}

export interface UpdateClassScoreInput {
  beautyScore?: number;
  beautyComments?: string;
  personalityScore?: number;
  personalityComments?: string;
  balanceProportionScore?: number;
  balanceProportionComments?: string;
  coatCleanGroomed?: boolean;
  teethGumsHealthy?: boolean;
  eyesNoseClear?: boolean;
  earsCleanMiteFree?: boolean;
  toenailsClipped?: boolean;
  fleaIssues?: boolean;
  healthGroomingComments?: string;
  isFinalized?: boolean;
  modificationReason?: string;
}

export interface HealthGroomingChecklist {
  coatCleanGroomed: boolean;
  teethGumsHealthy: boolean;
  eyesNoseClear: boolean;
  earsCleanMiteFree: boolean;
  toenailsClipped: boolean;
  fleaIssues: boolean;
}

export type RibbonType = 'Blue' | 'Red' | 'White' | 'Participation';

export class ClassScoreDataAccess {
  constructor(private docClient: DynamoDBDocumentClient, private tableName: string) {}

  /**
   * Create an audit trail entry for class score modifications
   */
  private async createAuditEntry(
    classScoreId: string,
    action: string,
    modifiedBy: string,
    previousValues?: any,
    newValues?: any,
    reason?: string
  ): Promise<void> {
    const auditId = randomUUID();
    const modifiedAt = new Date().toISOString();

    const auditEntry: ClassScoreAuditEntry = {
      id: auditId,
      classScoreId,
      action,
      modifiedBy,
      modifiedAt,
      previousValues,
      newValues,
      reason
    };

    await this.docClient.send(new PutCommand({
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
  private calculateClassTotalScore(
    beautyScore: number,
    personalityScore: number,
    balanceProportionScore: number
  ): number {
    return beautyScore + personalityScore + balanceProportionScore;
  }

  /**
   * Determine ribbon eligibility based on total score and health/grooming checklist
   */
  private calculateRibbonEligibility(
    totalScore: number,
    healthChecklist: HealthGroomingChecklist
  ): RibbonType {
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
    } else if (totalScore >= 35 && totalScore <= 44) {
      return 'Red';
    } else if (totalScore >= 25 && totalScore <= 34) {
      return 'White';
    } else {
      return 'Participation';
    }
  }

  /**
   * Create a new class score record
   */
  async createClassScore(input: CreateClassScoreInput): Promise<ClassScore> {
    const id = randomUUID();
    const timestamp = new Date().toISOString();
    const totalScore = this.calculateClassTotalScore(
      input.beautyScore,
      input.personalityScore,
      input.balanceProportionScore
    );

    const healthChecklist: HealthGroomingChecklist = {
      coatCleanGroomed: input.coatCleanGroomed,
      teethGumsHealthy: input.teethGumsHealthy,
      eyesNoseClear: input.eyesNoseClear,
      earsCleanMiteFree: input.earsCleanMiteFree,
      toenailsClipped: input.toenailsClipped,
      fleaIssues: input.fleaIssues
    };

    const ribbonEligibility = this.calculateRibbonEligibility(totalScore, healthChecklist);

    const classScore: ClassScore = {
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
    await this.docClient.send(new PutCommand({
      TableName: this.tableName,
      Item: {
        PK: `CLASS_SCORE#${id}`,
        SK: 'METADATA',
        ...classScore,
      },
    }));

    // Store class-score-by-cat index record
    await this.docClient.send(new PutCommand({
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
    await this.docClient.send(new PutCommand({
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
    await this.createAuditEntry(
      id,
      'CREATE',
      input.judgeName,
      null,
      classScore,
      'Initial class score creation'
    );

    return classScore;
  }

  /**
   * Get a class score by ID
   */
  async getClassScore(id: string): Promise<ClassScore | null> {
    const result = await this.docClient.send(new GetCommand({
      TableName: this.tableName,
      Key: { PK: `CLASS_SCORE#${id}`, SK: 'METADATA' },
    }));

    if (!result.Item) return null;

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
   * @param allowFinalizedEdit set true only when the caller has already verified the
   *   requester is an admin overriding a finalized score; otherwise the write is
   *   rejected if the score was finalized between the caller's read and this write.
   */
  async updateClassScore(id: string, input: UpdateClassScoreInput, modifiedBy: string, allowFinalizedEdit: boolean = false): Promise<ClassScore> {
    // First get the existing class score
    const existingScore = await this.getClassScore(id);
    if (!existingScore) {
      throw new Error('Class score not found');
    }

    // Calculate new total score and ribbon eligibility if any category scores are being updated
    const updatedScore = { ...existingScore, ...input };
    const newTotalScore = this.calculateClassTotalScore(
      updatedScore.beautyScore,
      updatedScore.personalityScore,
      updatedScore.balanceProportionScore
    );

    const healthChecklist: HealthGroomingChecklist = {
      coatCleanGroomed: updatedScore.coatCleanGroomed,
      teethGumsHealthy: updatedScore.teethGumsHealthy,
      eyesNoseClear: updatedScore.eyesNoseClear,
      earsCleanMiteFree: updatedScore.earsCleanMiteFree,
      toenailsClipped: updatedScore.toenailsClipped,
      fleaIssues: updatedScore.fleaIssues
    };

    const newRibbonEligibility = this.calculateRibbonEligibility(newTotalScore, healthChecklist);

    const timestamp = new Date().toISOString();
    const finalScore: ClassScore = {
      ...updatedScore,
      totalScore: newTotalScore,
      ribbonEligibility: newRibbonEligibility,
      timestamp, // Update timestamp on modification
      modificationCount: (existingScore.modificationCount || 0) + 1,
      lastModifiedBy: modifiedBy,
      lastModifiedAt: timestamp,
    };

    // Update main class score record with optimistic locking. Unless the caller has
    // confirmed an admin override, also require the score to still be unfinalized at
    // write time, closing the gap between the resolver's finalized check and this write.
    let conditionExpression = 'modificationCount = :expectedModificationCount';
    const expressionAttributeValues: Record<string, any> = {
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
      ':expectedModificationCount': existingScore.modificationCount,
    };
    if (!allowFinalizedEdit) {
      conditionExpression += ' AND isFinalized = :expectedNotFinalized';
      expressionAttributeValues[':expectedNotFinalized'] = false;
    }

    await this.docClient.send(new UpdateCommand({
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
      ConditionExpression: conditionExpression,
      ExpressionAttributeNames: {
        '#timestamp': 'timestamp'
      },
      ExpressionAttributeValues: expressionAttributeValues
    }));

    // Update class-score-by-cat index record
    await this.docClient.send(new PutCommand({
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
    await this.docClient.send(new PutCommand({
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

    // Create audit trail entry only after the conditional write actually succeeds
    await this.createAuditEntry(
      id,
      'UPDATE',
      modifiedBy,
      existingScore,
      finalScore,
      input.modificationReason || 'Class score updated'
    );

    return finalScore;
  }

  /**
   * Delete a class score and all its index records
   */
  async deleteClassScore(id: string): Promise<ClassScore> {
    const existingScore = await this.getClassScore(id);
    if (!existingScore) {
      throw new Error('Class score not found');
    }

    // Delete main class score record
    await this.docClient.send(new DeleteCommand({
      TableName: this.tableName,
      Key: { PK: `CLASS_SCORE#${id}`, SK: 'METADATA' },
    }));

    // Delete class-score-by-cat index record
    await this.docClient.send(new DeleteCommand({
      TableName: this.tableName,
      Key: { PK: `CAT#${existingScore.catId}`, SK: `CLASS_SCORE#${id}` },
    }));

    // Delete class-score-by-judge index record
    await this.docClient.send(new DeleteCommand({
      TableName: this.tableName,
      Key: { PK: `JUDGE#${existingScore.judgeId}`, SK: `CLASS_SCORE#${id}` },
    }));

    return existingScore;
  }

  /**
   * Get all class scores for a specific cat
   */
  async getClassScoresByCat(catId: string): Promise<ClassScore[]> {
    const result = await this.docClient.send(new QueryCommand({
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
    
    return scores.filter((score): score is ClassScore => score !== null);
  }

  /**
   * Get all class scores by a specific judge
   */
  async getClassScoresByJudge(judgeId: string): Promise<ClassScore[]> {
    const result = await this.docClient.send(new QueryCommand({
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
    
    return scores.filter((score): score is ClassScore => score !== null);
  }

  /**
   * Get class scores for a specific cage number (requires looking up cat first)
   */
  async getClassScoresByCage(cageNumber: number): Promise<ClassScore[]> {
    // First find the cat with this cage number
    const catsResult = await this.docClient.send(new ScanCommand({
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
  async listAllClassScores(): Promise<ClassScore[]> {
    const result = await this.docClient.send(new ScanCommand({
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
  async getClassScoreAuditHistory(classScoreId: string): Promise<ClassScoreAuditEntry[]> {
    const result = await this.docClient.send(new QueryCommand({
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
  async finalizeClassScore(id: string, modifiedBy: string): Promise<ClassScore> {
    const existingScore = await this.getClassScore(id);
    if (!existingScore) {
      throw new Error('Class score not found');
    }

    if (existingScore.isFinalized) {
      throw new Error('Class score is already finalized');
    }

    const timestamp = new Date().toISOString();
    const finalizedScore: ClassScore = {
      ...existingScore,
      isFinalized: true,
      modificationCount: (existingScore.modificationCount || 0) + 1,
      lastModifiedBy: modifiedBy,
      lastModifiedAt: timestamp,
    };

    // Create audit trail entry for finalization
    await this.createAuditEntry(
      id,
      'FINALIZE',
      modifiedBy,
      existingScore,
      finalizedScore,
      'Class score finalized'
    );

    // Update main class score record
    await this.docClient.send(new UpdateCommand({
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
    await this.docClient.send(new PutCommand({
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

    await this.docClient.send(new PutCommand({
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