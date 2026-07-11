import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

// Create default client - can be overridden for testing
let docClient: DynamoDBDocumentClient;

function getDocClient(): DynamoDBDocumentClient {
  if (!docClient) {
    const client = new DynamoDBClient({});
    docClient = DynamoDBDocumentClient.from(client);
  }
  return docClient;
}

// Export for testing
export function setDocClient(client: DynamoDBDocumentClient): void {
  docClient = client;
}

export interface FitShowScore {
  id: string;
  catId: string;
  participantName: string;
  judgeId: string;
  judgeName: string;
  
  // Appearance & Demeanor (20 points)
  attire: number; // 1-10
  attentive: number; // 1-5
  courteous: number; // 1-5
  
  // Handling & Control (14 points)
  controlEquipment: number; // 1-10
  pickupCarrying: number; // 1-4
  
  // Demonstration Skills (16 points)
  showingHeadShape: number; // 1-4
  showingBodyType: number; // 1-4
  showingTail: number; // 1-4
  showingCoatTexture: number; // 1-4
  
  // Health Examination (21 points)
  showingMouthTeethGums: number; // 1-3
  conditionMouthTeethGums: number; // 1-2
  showingNose: number; // 1-2
  showingEyes: number; // 1-2
  conditionNoseEyes: number; // 1-2
  showingEars: number; // 1-2
  earsClean: number; // 1-2
  showingToenailsClaws: number; // 1-3
  toenailsClipped: number; // 1-6
  
  // Grooming & Care (14 points)
  showingBellyCoatCleanliness: number; // 1-3
  coatCleanWellGroomed: number; // 1-8
  catHealthCare: number; // 1-3
  
  // Knowledge (12 points)
  generalKnowledge: number; // 1-3
  catBreedsShowing: number; // 1-3
  catAnatomy: number; // 1-3
  fourHKnowledge: number; // 1-3
  
  // Calculated totals
  appearanceTotal: number;
  handlingTotal: number;
  demonstrationTotal: number;
  healthExaminationTotal: number;
  groomingCareTotal: number;
  knowledgeTotal: number;
  totalScore: number;
  
  // Comments
  appearanceComments?: string;
  handlingComments?: string;
  demonstrationComments?: string;
  healthExaminationComments?: string;
  groomingCareComments?: string;
  knowledgeComments?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  isFinalized: boolean;
  modificationCount: number;
  lastModifiedBy: string;
  lastModifiedAt: string;
}

export interface CreateFitShowScoreInput {
  catId: string;
  participantName: string;
  judgeId: string;
  judgeName: string;
  
  // All scoring fields
  attire: number;
  attentive: number;
  courteous: number;
  controlEquipment: number;
  pickupCarrying: number;
  showingHeadShape: number;
  showingBodyType: number;
  showingTail: number;
  showingCoatTexture: number;
  showingMouthTeethGums: number;
  conditionMouthTeethGums: number;
  showingNose: number;
  showingEyes: number;
  conditionNoseEyes: number;
  showingEars: number;
  earsClean: number;
  showingToenailsClaws: number;
  toenailsClipped: number;
  showingBellyCoatCleanliness: number;
  coatCleanWellGroomed: number;
  catHealthCare: number;
  generalKnowledge: number;
  catBreedsShowing: number;
  catAnatomy: number;
  fourHKnowledge: number;
  isFinalized?: boolean;

  // Optional comments
  appearanceComments?: string;
  handlingComments?: string;
  demonstrationComments?: string;
  healthExaminationComments?: string;
  groomingCareComments?: string;
  knowledgeComments?: string;
}

export interface UpdateFitShowScoreInput extends CreateFitShowScoreInput {
  id: string;
  modificationReason?: string;
}

export interface FitShowScoreAuditEntry {
  id: string;
  fitShowScoreId: string;
  action: 'CREATE' | 'UPDATE' | 'FINALIZE' | 'DELETE';
  modifiedBy: string;
  modifiedAt: string;
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
  reason?: string;
}

export class FitShowScoreDataAccess {
  private tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  /**
   * Calculate category totals and overall total score
   */
  private calculateScores(input: CreateFitShowScoreInput): {
    appearanceTotal: number;
    handlingTotal: number;
    demonstrationTotal: number;
    healthExaminationTotal: number;
    groomingCareTotal: number;
    knowledgeTotal: number;
    totalScore: number;
  } {
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
  async createFitShowScore(input: CreateFitShowScoreInput): Promise<FitShowScore> {
    const id = uuidv4();
    const timestamp = new Date().toISOString();
    const scores = this.calculateScores(input);

    const fitShowScore: FitShowScore = {
      id,
      ...input,
      ...scores,
      createdAt: timestamp,
      updatedAt: timestamp,
      isFinalized: input.isFinalized || false,
      modificationCount: 0,
      lastModifiedBy: input.judgeId,
      lastModifiedAt: timestamp
    };

    // Main record
    await getDocClient().send(new PutCommand({
      TableName: this.tableName,
      Item: {
        PK: `FIT_SHOW_SCORE#${id}`,
        SK: 'METADATA',
        ...fitShowScore
      }
    }));

    // Index by cat
    await getDocClient().send(new PutCommand({
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
        isFinalized: input.isFinalized || false
      }
    }));

    // Index by judge
    await getDocClient().send(new PutCommand({
      TableName: this.tableName,
      Item: {
        PK: `JUDGE#${input.judgeId}`,
        SK: `FIT_SHOW_SCORE#${id}`,
        fitShowScoreId: id,
        catId: input.catId,
        participantName: input.participantName,
        totalScore: scores.totalScore,
        timestamp,
        isFinalized: input.isFinalized || false
      }
    }));

    return fitShowScore;
  }

  /**
   * Get a fit and show score by ID
   */
  async getFitShowScore(id: string): Promise<FitShowScore | null> {
    const result = await getDocClient().send(new GetCommand({
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
    
    // Handle migration for existing records without timestamp field
    if (!fitShowScore.timestamp) {
      // Use createdAt if available, otherwise use current timestamp
      fitShowScore.timestamp = fitShowScore.createdAt || new Date().toISOString();
    }
    
    return fitShowScore as FitShowScore;
  }

  /**
   * Update a fit and show score
   * @param allowFinalizedEdit set true only when the caller has already verified the
   *   requester is an admin overriding a finalized score; otherwise the write is
   *   rejected if the score was finalized between the caller's read and this write.
   */
  async updateFitShowScore(input: UpdateFitShowScoreInput, allowFinalizedEdit: boolean = false): Promise<FitShowScore> {
    const existing = await this.getFitShowScore(input.id);
    if (!existing) {
      throw new Error('Fit and show score not found');
    }

    const timestamp = new Date().toISOString();
    // Merge onto the existing record first so a partial update's absent fields fall
    // back to their stored values instead of becoming undefined (which would corrupt
    // the category totals computed below into NaN).
    const merged = { ...existing, ...input };
    const scores = this.calculateScores(merged);

    const updatedScore: FitShowScore = {
      ...merged,
      ...scores,
      updatedAt: timestamp,
      modificationCount: existing.modificationCount + 1,
      lastModifiedBy: input.judgeId,
      lastModifiedAt: timestamp
    };

    // Update main record with optimistic locking. Unless the caller has confirmed an
    // admin override, also require the score to still be unfinalized at write time,
    // closing the gap between the resolver's finalized check and this write.
    let conditionExpression = 'modificationCount = :expectedModificationCount';
    const expressionAttributeValues: Record<string, any> = {
      ':expectedModificationCount': existing.modificationCount,
    };
    if (!allowFinalizedEdit) {
      conditionExpression += ' AND isFinalized = :expectedNotFinalized';
      expressionAttributeValues[':expectedNotFinalized'] = false;
    }

    await getDocClient().send(new PutCommand({
      TableName: this.tableName,
      Item: {
        PK: `FIT_SHOW_SCORE#${input.id}`,
        SK: 'METADATA',
        ...updatedScore
      },
      ConditionExpression: conditionExpression,
      ExpressionAttributeValues: expressionAttributeValues
    }));

    // Update cat index
    await getDocClient().send(new PutCommand({
      TableName: this.tableName,
      Item: {
        PK: `CAT#${merged.catId}`,
        SK: `FIT_SHOW_SCORE#${input.id}`,
        fitShowScoreId: input.id,
        judgeId: merged.judgeId,
        judgeName: merged.judgeName,
        participantName: merged.participantName,
        totalScore: scores.totalScore,
        timestamp,
        isFinalized: updatedScore.isFinalized
      }
    }));

    // Update judge index
    await getDocClient().send(new PutCommand({
      TableName: this.tableName,
      Item: {
        PK: `JUDGE#${merged.judgeId}`,
        SK: `FIT_SHOW_SCORE#${input.id}`,
        fitShowScoreId: input.id,
        catId: merged.catId,
        participantName: merged.participantName,
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
  async deleteFitShowScore(id: string): Promise<void> {
    const existing = await this.getFitShowScore(id);
    if (!existing) {
      throw new Error('Fit and show score not found');
    }

    // Delete main record
    await getDocClient().send(new DeleteCommand({
      TableName: this.tableName,
      Key: {
        PK: `FIT_SHOW_SCORE#${id}`,
        SK: 'METADATA'
      }
    }));

    // Delete cat index
    await getDocClient().send(new DeleteCommand({
      TableName: this.tableName,
      Key: {
        PK: `CAT#${existing.catId}`,
        SK: `FIT_SHOW_SCORE#${id}`
      }
    }));

    // Delete judge index
    await getDocClient().send(new DeleteCommand({
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
  async getFitShowScoresByCat(catId: string): Promise<FitShowScore[]> {
    const result = await getDocClient().send(new QueryCommand({
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
    const scores: FitShowScore[] = [];
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
  async getFitShowScoresByJudge(judgeId: string): Promise<FitShowScore[]> {
    const result = await getDocClient().send(new QueryCommand({
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
    const scores: FitShowScore[] = [];
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
  async listFitShowScores(): Promise<FitShowScore[]> {
    const result = await getDocClient().send(new ScanCommand({
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
      
      // Handle migration for existing records without timestamp field
      if (!fitShowScore.timestamp) {
        // Use createdAt if available, otherwise use current timestamp
        fitShowScore.timestamp = fitShowScore.createdAt || new Date().toISOString();
      }
      
      return fitShowScore as FitShowScore;
    });
  }

  /**
   * Finalize a fit and show score
   */
  async finalizeFitShowScore(id: string, judgeId: string): Promise<FitShowScore> {
    const existing = await this.getFitShowScore(id);
    if (!existing) {
      throw new Error('Fit and show score not found');
    }

    const timestamp = new Date().toISOString();
    const finalizedScore: FitShowScore = {
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
    await getDocClient().send(new PutCommand({
      TableName: this.tableName,
      Item: {
        PK: `FIT_SHOW_SCORE#${id}`,
        SK: 'METADATA',
        ...finalizedScore
      }
    }));

    // Update cat index
    await getDocClient().send(new PutCommand({
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
    await getDocClient().send(new PutCommand({
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
  private async createAuditEntry(entry: Omit<FitShowScoreAuditEntry, 'id'>): Promise<void> {
    const auditId = uuidv4();
    const timestamp = entry.modifiedAt;

    await getDocClient().send(new PutCommand({
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
  async getFitShowScoreAuditHistory(scoreId: string): Promise<FitShowScoreAuditEntry[]> {
    const result = await getDocClient().send(new QueryCommand({
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
      return auditEntry as FitShowScoreAuditEntry;
    });
  }

  /**
   * Update fit and show score with audit trail
   */
  async updateFitShowScoreWithAudit(input: UpdateFitShowScoreInput, reason?: string, allowFinalizedEdit: boolean = false): Promise<FitShowScore> {
    const existing = await this.getFitShowScore(input.id);
    if (!existing) {
      throw new Error('Fit and show score not found');
    }

    // Perform the update first so a rejected (conflicting) write never produces a
    // phantom audit entry claiming the update succeeded.
    const updated = await this.updateFitShowScore(input, allowFinalizedEdit);

    await this.createAuditEntry({
      fitShowScoreId: input.id,
      action: 'UPDATE',
      modifiedBy: input.judgeId,
      modifiedAt: updated.lastModifiedAt,
      previousValues: { ...existing },
      newValues: { ...input },
      reason: reason || 'Score updated by judge'
    });

    return updated;
  }

  /**
   * Create fit and show score with audit trail
   */
  async createFitShowScoreWithAudit(input: CreateFitShowScoreInput): Promise<FitShowScore> {
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
  async deleteFitShowScoreWithAudit(id: string, judgeId: string, reason?: string): Promise<void> {
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