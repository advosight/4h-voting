import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
export declare function setDocClient(client: DynamoDBDocumentClient): void;
export interface FitShowScore {
    id: string;
    catId: string;
    participantName: string;
    judgeId: string;
    judgeName: string;
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
    appearanceTotal: number;
    handlingTotal: number;
    demonstrationTotal: number;
    healthExaminationTotal: number;
    groomingCareTotal: number;
    knowledgeTotal: number;
    totalScore: number;
    appearanceComments?: string;
    handlingComments?: string;
    demonstrationComments?: string;
    healthExaminationComments?: string;
    groomingCareComments?: string;
    knowledgeComments?: string;
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
export declare class FitShowScoreDataAccess {
    private tableName;
    constructor(tableName: string);
    /**
     * Calculate category totals and overall total score
     */
    private calculateScores;
    /**
     * Create a new fit and show score
     */
    createFitShowScore(input: CreateFitShowScoreInput): Promise<FitShowScore>;
    /**
     * Get a fit and show score by ID
     */
    getFitShowScore(id: string): Promise<FitShowScore | null>;
    /**
     * Update a fit and show score
     */
    updateFitShowScore(input: UpdateFitShowScoreInput): Promise<FitShowScore>;
    /**
     * Delete a fit and show score
     */
    deleteFitShowScore(id: string): Promise<void>;
    /**
     * Get all fit and show scores for a cat
     */
    getFitShowScoresByCat(catId: string): Promise<FitShowScore[]>;
    /**
     * Get all fit and show scores by a judge
     */
    getFitShowScoresByJudge(judgeId: string): Promise<FitShowScore[]>;
    /**
     * List all fit and show scores
     */
    listFitShowScores(): Promise<FitShowScore[]>;
    /**
     * Finalize a fit and show score
     */
    finalizeFitShowScore(id: string, judgeId: string): Promise<FitShowScore>;
    /**
     * Create an audit entry for score modifications
     */
    private createAuditEntry;
    /**
     * Get audit history for a fit and show score
     */
    getFitShowScoreAuditHistory(scoreId: string): Promise<FitShowScoreAuditEntry[]>;
    /**
     * Update fit and show score with audit trail
     */
    updateFitShowScoreWithAudit(input: UpdateFitShowScoreInput, reason?: string): Promise<FitShowScore>;
    /**
     * Create fit and show score with audit trail
     */
    createFitShowScoreWithAudit(input: CreateFitShowScoreInput): Promise<FitShowScore>;
    /**
     * Delete fit and show score with audit trail
     */
    deleteFitShowScoreWithAudit(id: string, judgeId: string, reason?: string): Promise<void>;
}
