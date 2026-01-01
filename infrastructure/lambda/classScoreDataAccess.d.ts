import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
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
export declare class ClassScoreDataAccess {
    private docClient;
    private tableName;
    constructor(docClient: DynamoDBDocumentClient, tableName: string);
    /**
     * Create an audit trail entry for class score modifications
     */
    private createAuditEntry;
    /**
     * Calculate total class score from individual category scores
     */
    private calculateClassTotalScore;
    /**
     * Determine ribbon eligibility based on total score and health/grooming checklist
     */
    private calculateRibbonEligibility;
    /**
     * Create a new class score record
     */
    createClassScore(input: CreateClassScoreInput): Promise<ClassScore>;
    /**
     * Get a class score by ID
     */
    getClassScore(id: string): Promise<ClassScore | null>;
    /**
     * Update an existing class score with audit trail
     */
    updateClassScore(id: string, input: UpdateClassScoreInput, modifiedBy: string): Promise<ClassScore>;
    /**
     * Delete a class score and all its index records
     */
    deleteClassScore(id: string): Promise<ClassScore>;
    /**
     * Get all class scores for a specific cat
     */
    getClassScoresByCat(catId: string): Promise<ClassScore[]>;
    /**
     * Get all class scores by a specific judge
     */
    getClassScoresByJudge(judgeId: string): Promise<ClassScore[]>;
    /**
     * Get class scores for a specific cage number (requires looking up cat first)
     */
    getClassScoresByCage(cageNumber: number): Promise<ClassScore[]>;
    /**
     * List all class scores in the system
     */
    listAllClassScores(): Promise<ClassScore[]>;
    /**
     * Get audit history for a specific class score
     */
    getClassScoreAuditHistory(classScoreId: string): Promise<ClassScoreAuditEntry[]>;
    /**
     * Finalize a class score with confirmation
     */
    finalizeClassScore(id: string, modifiedBy: string): Promise<ClassScore>;
}
