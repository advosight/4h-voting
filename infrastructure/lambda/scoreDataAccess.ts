import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

export interface Score {
  id: string;
  catId: string;
  judgeId: string;
  judgeName: string;
  firstImpressionScore: number;
  firstImpressionComments?: string;
  originalityScore: number;
  originalityComments?: string;
  informationCardScore: number;
  informationCardComments?: string;
  workDoneByMemberScore: number;
  workDoneByMemberComments?: string;
  basicComfortScore: number;
  basicComfortComments?: string;
  safetyScore: number;
  safetyComments?: string;
  easyViewOfCatScore: number;
  easyViewOfCatComments?: string;
  totalScore: number;
  timestamp: string;
  isFinalized: boolean;
  modificationCount: number;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
}

export interface ScoreAuditEntry {
  id: string;
  scoreId: string;
  action: string;
  modifiedBy: string;
  modifiedAt: string;
  previousValues?: any;
  newValues?: any;
  reason?: string;
}

export interface CreateScoreInput {
  catId: string;
  judgeId: string;
  judgeName: string;
  firstImpressionScore: number;
  firstImpressionComments?: string;
  originalityScore: number;
  originalityComments?: string;
  informationCardScore: number;
  informationCardComments?: string;
  workDoneByMemberScore: number;
  workDoneByMemberComments?: string;
  basicComfortScore: number;
  basicComfortComments?: string;
  safetyScore: number;
  safetyComments?: string;
  easyViewOfCatScore: number;
  easyViewOfCatComments?: string;
  isFinalized?: boolean;
}

export interface UpdateScoreInput {
  firstImpressionScore?: number;
  firstImpressionComments?: string;
  originalityScore?: number;
  originalityComments?: string;
  informationCardScore?: number;
  informationCardComments?: string;
  workDoneByMemberScore?: number;
  workDoneByMemberComments?: string;
  basicComfortScore?: number;
  basicComfortComments?: string;
  safetyScore?: number;
  safetyComments?: string;
  easyViewOfCatScore?: number;
  easyViewOfCatComments?: string;
  isFinalized?: boolean;
  modificationReason?: string;
}

export class ScoreDataAccess {
  constructor(private docClient: DynamoDBDocumentClient, private tableName: string) {}

  /**
   * Calculate total score from individual category scores
   */
  private calculateTotalScore(
    firstImpressionScore: number,
    originalityScore: number,
    informationCardScore: number,
    workDoneByMemberScore: number,
    basicComfortScore: number,
    safetyScore: number,
    easyViewOfCatScore: number
  ): number {
    return firstImpressionScore + originalityScore + informationCardScore + 
           workDoneByMemberScore + basicComfortScore + safetyScore + easyViewOfCatScore;
  }

  /**
   * Create audit trail entry
   */
  private async createAuditEntry(
    scoreId: string,
    action: string,
    modifiedBy: string,
    previousValues?: any,
    newValues?: any,
    reason?: string
  ): Promise<void> {
    const auditId = randomUUID();
    const timestamp = new Date().toISOString();

    await this.docClient.send(new PutCommand({
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
  async createScore(input: CreateScoreInput, createdBy?: string): Promise<Score> {
    const id = randomUUID();
    const timestamp = new Date().toISOString();
    const totalScore = this.calculateTotalScore(
      input.firstImpressionScore,
      input.originalityScore,
      input.informationCardScore,
      input.workDoneByMemberScore,
      input.basicComfortScore,
      input.safetyScore,
      input.easyViewOfCatScore
    );

    const score: Score = {
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
    await this.docClient.send(new PutCommand({
      TableName: this.tableName,
      Item: {
        PK: `SCORE#${id}`,
        SK: 'METADATA',
        ...score,
      },
    }));

    // Store score-by-cat index record
    await this.docClient.send(new PutCommand({
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
    await this.docClient.send(new PutCommand({
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
    await this.createAuditEntry(
      id,
      'CREATE',
      createdBy || input.judgeName,
      undefined,
      score,
      'Initial score creation'
    );

    return score;
  }

  /**
   * Get a score by ID
   */
  async getScore(id: string): Promise<Score | null> {
    const result = await this.docClient.send(new GetCommand({
      TableName: this.tableName,
      Key: { PK: `SCORE#${id}`, SK: 'METADATA' },
    }));

    if (!result.Item) return null;

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
   * @param allowFinalizedEdit set true only when the caller has already verified the
   *   requester is an admin overriding a finalized score; otherwise the write is
   *   rejected if the score was finalized between the caller's read and this write.
   */
  async updateScore(id: string, input: UpdateScoreInput, modifiedBy?: string, allowFinalizedEdit: boolean = false): Promise<Score> {
    // First get the existing score
    const existingScore = await this.getScore(id);
    if (!existingScore) {
      throw new Error('Score not found');
    }

    // Store previous values for audit trail
    const previousValues = { ...existingScore };

    // Calculate new total score if any category scores are being updated
    const updatedScore = { ...existingScore, ...input };
    const newTotalScore = this.calculateTotalScore(
      updatedScore.firstImpressionScore,
      updatedScore.originalityScore,
      updatedScore.informationCardScore,
      updatedScore.workDoneByMemberScore,
      updatedScore.basicComfortScore,
      updatedScore.safetyScore,
      updatedScore.easyViewOfCatScore
    );

    const timestamp = new Date().toISOString();
    const finalScore: Score = {
      ...updatedScore,
      totalScore: newTotalScore,
      timestamp, // Update timestamp on modification
      modificationCount: existingScore.modificationCount + 1,
      lastModifiedBy: modifiedBy || existingScore.judgeName,
      lastModifiedAt: timestamp,
    };

    // Update main score record with optimistic locking. Unless the caller has confirmed
    // an admin override, also require the score to still be unfinalized at write time,
    // closing the gap between the resolver's finalized check and this write.
    let conditionExpression = 'modificationCount = :expectedModificationCount';
    const expressionAttributeValues: Record<string, any> = {
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
    };
    if (!allowFinalizedEdit) {
      conditionExpression += ' AND isFinalized = :expectedNotFinalized';
      expressionAttributeValues[':expectedNotFinalized'] = false;
    }

    await this.docClient.send(new UpdateCommand({
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
      ConditionExpression: conditionExpression,
      ExpressionAttributeNames: {
        '#timestamp': 'timestamp'
      },
      ExpressionAttributeValues: expressionAttributeValues
    }));

    // Update score-by-cat index record
    await this.docClient.send(new PutCommand({
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
    await this.docClient.send(new PutCommand({
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
    await this.createAuditEntry(
      id,
      'UPDATE',
      modifiedBy || existingScore.judgeName,
      previousValues,
      finalScore,
      input.modificationReason || 'Score updated'
    );

    return finalScore;
  }

  /**
   * Delete a score and all its index records
   */
  async deleteScore(id: string): Promise<Score> {
    const existingScore = await this.getScore(id);
    if (!existingScore) {
      throw new Error('Score not found');
    }

    // Delete main score record
    await this.docClient.send(new DeleteCommand({
      TableName: this.tableName,
      Key: { PK: `SCORE#${id}`, SK: 'METADATA' },
    }));

    // Delete score-by-cat index record
    await this.docClient.send(new DeleteCommand({
      TableName: this.tableName,
      Key: { PK: `CAT#${existingScore.catId}`, SK: `SCORE#${id}` },
    }));

    // Delete score-by-judge index record
    await this.docClient.send(new DeleteCommand({
      TableName: this.tableName,
      Key: { PK: `JUDGE#${existingScore.judgeId}`, SK: `SCORE#${id}` },
    }));

    return existingScore;
  }

  /**
   * Get all scores for a specific cat
   */
  async getScoresByCat(catId: string): Promise<Score[]> {
    const result = await this.docClient.send(new QueryCommand({
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
    
    return scores.filter((score): score is Score => score !== null);
  }

  /**
   * Get all scores by a specific judge
   */
  async getScoresByJudge(judgeId: string): Promise<Score[]> {
    const result = await this.docClient.send(new QueryCommand({
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
    
    return scores.filter((score): score is Score => score !== null);
  }

  /**
   * Get scores for a specific cage number (requires looking up cat first)
   */
  async getScoresByCage(cageNumber: number): Promise<Score[]> {
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
    
    return this.getScoresByCat(catId);
  }

  /**
   * List all scores in the system
   */
  async listAllScores(): Promise<Score[]> {
    const result = await this.docClient.send(new ScanCommand({
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
  async getScoreAuditHistory(scoreId: string): Promise<ScoreAuditEntry[]> {
    const result = await this.docClient.send(new QueryCommand({
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