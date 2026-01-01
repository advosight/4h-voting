export type UserRole = 'admin' | 'judge' | 'participant';
export interface UserContext {
    userId: string;
    email: string;
    role: UserRole;
    judgeId?: string;
    claims: Record<string, any>;
}
/**
 * Extract user context from AppSync event
 */
export declare function getUserContext(event: any): UserContext | null;
/**
 * Check if user has the required role
 */
export declare function hasRole(userContext: UserContext | null, requiredRole: UserRole): boolean;
/**
 * Check if user has any of the required roles
 */
export declare function hasAnyRole(userContext: UserContext | null, requiredRoles: UserRole[]): boolean;
/**
 * Validate that user has required role, throw error if not
 */
export declare function requireRole(userContext: UserContext | null, requiredRole: UserRole): void;
/**
 * Validate that user has any of the required roles, throw error if not
 */
export declare function requireAnyRole(userContext: UserContext | null, requiredRoles: UserRole[]): void;
/**
 * Get judge ID for the current user (if they are a judge)
 */
export declare function getJudgeId(userContext: UserContext | null): string | null;
/**
 * Check if user can access score data (either their own scores or admin)
 */
export declare function canAccessScore(userContext: UserContext | null, scoreJudgeId?: string): boolean;
/**
 * Validate score access permissions
 */
export declare function requireScoreAccess(userContext: UserContext | null, scoreJudgeId?: string): void;
