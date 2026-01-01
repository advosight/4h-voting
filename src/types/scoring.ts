/**
 * TypeScript types for the 4H cat cage scoring system
 */

export interface ScoringCategory {
  maxPoints: number;
  description: string;
  field: string;
  commentField: string;
}

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

export interface CreateScoreInput {
  catId: string;
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

export interface ValidationError {
  field: string;
  message: string;
  value: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
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

export interface ScoreConnection {
  items: Score[];
}

export interface ScoreAuditConnection {
  items: ScoreAuditEntry[];
}

// Class Scoring Types
export interface ClassScoringCategory {
  maxPoints: number;
  description: string;
  field: string;
  commentField: string;
}

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
  coatCleanGroomed: number; // 0-15 points
  teethGumsHealthy: number; // 0-5 points
  eyesNoseClear: number; // 0-5 points
  earsCleanMiteFree: number; // 0-10 points
  toenailsClipped: number; // 0-15 points
  fleaIssues: boolean;
  healthGroomingComments?: string;
  totalScore: number;
  ribbonEligibility: string;
  timestamp: string;
  isFinalized: boolean;
}

export interface CreateClassScoreInput {
  catId: string;
  beautyScore: number;
  beautyComments?: string;
  personalityScore: number;
  personalityComments?: string;
  balanceProportionScore: number;
  balanceProportionComments?: string;
  coatCleanGroomed: number; // 0-15 points
  teethGumsHealthy: number; // 0-5 points
  eyesNoseClear: number; // 0-5 points
  earsCleanMiteFree: number; // 0-10 points
  toenailsClipped: number; // 0-15 points
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
  coatCleanGroomed?: number; // 0-15 points
  teethGumsHealthy?: number; // 0-5 points
  eyesNoseClear?: number; // 0-5 points
  earsCleanMiteFree?: number; // 0-10 points
  toenailsClipped?: number; // 0-15 points
  fleaIssues?: boolean;
  healthGroomingComments?: string;
  isFinalized?: boolean;
}

export interface ClassScoreConnection {
  items: ClassScore[];
}

export interface HealthGroomingChecklist {
  coatCleanGroomed: number; // 0-15 points
  teethGumsHealthy: number; // 0-5 points
  eyesNoseClear: number; // 0-5 points
  earsCleanMiteFree: number; // 0-10 points
  toenailsClipped: number; // 0-15 points
  fleaIssues: boolean;
}

export type RibbonType = 'Blue' | 'Red' | 'White' | 'Participation';

// Fit and Show Scoring Types
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
  totalScore: number; // Maximum 100 points
  
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
  modificationCount?: number;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
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
  
  isFinalized?: boolean;
}

export interface UpdateFitShowScoreInput {
  id: string;
  
  // All scoring fields (optional for updates)
  attire?: number;
  attentive?: number;
  courteous?: number;
  controlEquipment?: number;
  pickupCarrying?: number;
  showingHeadShape?: number;
  showingBodyType?: number;
  showingTail?: number;
  showingCoatTexture?: number;
  showingMouthTeethGums?: number;
  conditionMouthTeethGums?: number;
  showingNose?: number;
  showingEyes?: number;
  conditionNoseEyes?: number;
  showingEars?: number;
  earsClean?: number;
  showingToenailsClaws?: number;
  toenailsClipped?: number;
  showingBellyCoatCleanliness?: number;
  coatCleanWellGroomed?: number;
  catHealthCare?: number;
  generalKnowledge?: number;
  catBreedsShowing?: number;
  catAnatomy?: number;
  fourHKnowledge?: number;
  
  // Calculated totals
  appearanceTotal?: number;
  handlingTotal?: number;
  demonstrationTotal?: number;
  healthExaminationTotal?: number;
  groomingCareTotal?: number;
  knowledgeTotal?: number;
  totalScore?: number;
  
  // Comments
  appearanceComments?: string;
  handlingComments?: string;
  demonstrationComments?: string;
  healthExaminationComments?: string;
  groomingCareComments?: string;
  knowledgeComments?: string;
  
  isFinalized?: boolean;
  modificationReason?: string;
}

export interface FitShowScoreConnection {
  items: FitShowScore[];
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

export interface FitShowScoreAuditConnection {
  items: FitShowScoreAuditEntry[];
}

// Cat interface
export interface Cat {
  id: string;
  name: string;
  owner: string;
  cageNumber: number;
  votes: number;
  ownerAgeGroup?: string;
  catAgeGroup?: string;
}