import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
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
export declare class ScoreDataAccess {
    private docClient;
    private tableName;
    constructor(docClient: DynamoDBDocumentClient, tableName: string);
    /**
     * Calculate total score from individual category scores
     */
    private calculateTotalScore;
    /**
     * Create audit trail entry
     */
    private createAuditEntry;
    /**
     * Create a new score record
     */
    createScore(input: CreateScoreInput, createdBy?: string): Promise<Score>;
    /**
     * Get a score by ID
     */
    getScore(id: string): Promise<Score | null>;
    /**
     * Update an existing score
     */
    updateScore(id: string, input: UpdateScoreInput, modifiedBy?: string): Promise<Score>;
    /**
     * Delete a score and all its index records
     */
    deleteScore(id: string): Promise<Score>;
    /**
     * Get all scores for a specific cat
     */
    getScoresByCat(catId: string): Promise<Score[]>;
    /**
     * Get all scores by a specific judge
     */
    getScoresByJudge(judgeId: string): Promise<Score[]>;
    /**
     * Get scores for a specific cage number (requires looking up cat first)
     */
    getScoresByCage(cageNumber: number): Promise<Score[]>;
    /**
     * List all scores in the system
     */
    listAllScores(): Promise<Score[]>;
    /**
     * Get audit history for a specific score
     */
    getScoreAuditHistory(scoreId: string): Promise<ScoreAuditEntry[]>;
}
