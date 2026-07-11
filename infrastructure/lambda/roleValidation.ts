export type UserRole = 'admin' | 'judge' | 'participant';

export type ScoringType = 'cageScoring' | 'classScoring' | 'fitShowScoring';

export interface UserContext {
  userId: string;
  email: string;
  role: UserRole;
  judgeId?: string;
  claims: Record<string, any>;
  permissions: Record<ScoringType, boolean>;
}

/**
 * Extract user context from AppSync event
 */
export function getUserContext(event: any): UserContext | null {
  try {
    const identity = event.identity;
    
    if (!identity || !identity.claims) {
      return null;
    }

    const claims = identity.claims;
    const userId = claims.sub || claims['cognito:username'];
    const email = claims.email || claims['cognito:username'];
    
    console.log('Extracting user context:', { userId, email, claims });
    
    // Get custom attributes and Cognito groups
    const customRole = claims['custom:role'] as UserRole;
    const judgeId = claims['custom:judgeId'];
    const cognitoGroups = claims['cognito:groups'] as string[] || [];
    
    // Default role logic
    let role: UserRole = customRole || 'participant';
    
    // Cognito groups are the source of truth when present; fall back to custom:role otherwise
    if (cognitoGroups.includes('admin')) {
      role = 'admin';
    } else if (cognitoGroups.includes('judge')) {
      role = 'judge';
    } else if (customRole) {
      if (cognitoGroups.length > 0) {
        console.warn(`Role mismatch for user ${userId}: custom:role=${customRole} but cognito:groups=${JSON.stringify(cognitoGroups)} contains neither 'admin' nor 'judge'`);
      }
      role = customRole;
    }
    // If user has judge ID but no role set, they're a judge
    else if (judgeId) {
      role = 'judge';
    }

    // Legacy accounts created before per-scoring-type permissions existed have none of these
    // claims set; default them to fully permitted so existing judges keep their access.
    const hasAnyPermissionClaim = 'custom:cageScoring' in claims ||
      'custom:classScoring' in claims ||
      'custom:fitShowScoring' in claims;
    const permissions: Record<ScoringType, boolean> = {
      cageScoring: role === 'admin' || (hasAnyPermissionClaim ? claims['custom:cageScoring'] === 'true' : true),
      classScoring: role === 'admin' || (hasAnyPermissionClaim ? claims['custom:classScoring'] === 'true' : true),
      fitShowScoring: role === 'admin' || (hasAnyPermissionClaim ? claims['custom:fitShowScoring'] === 'true' : true),
    };

    return {
      userId,
      email,
      role,
      judgeId,
      claims,
      permissions,
    };
  } catch (error) {
    console.error('Error extracting user context:', error);
    return null;
  }
}

/**
 * Check if user has the required role
 */
export function hasRole(userContext: UserContext | null, requiredRole: UserRole): boolean {
  if (!userContext) return false;
  
  // Admin users have access to all roles
  if (userContext.role === 'admin') return true;
  
  return userContext.role === requiredRole;
}

/**
 * Check if user has any of the required roles
 */
export function hasAnyRole(userContext: UserContext | null, requiredRoles: UserRole[]): boolean {
  if (!userContext) return false;
  
  // Admin users have access to all roles
  if (userContext.role === 'admin') return true;
  
  return requiredRoles.includes(userContext.role);
}

/**
 * Validate that user has required role, throw error if not
 */
export function requireRole(userContext: UserContext | null, requiredRole: UserRole): void {
  if (!hasRole(userContext, requiredRole)) {
    const currentRole = userContext?.role || 'unknown';
    throw new Error(`Access denied. Required role: ${requiredRole}, current role: ${currentRole}`);
  }
}

/**
 * Validate that user has any of the required roles, throw error if not
 */
export function requireAnyRole(userContext: UserContext | null, requiredRoles: UserRole[]): void {
  if (!hasAnyRole(userContext, requiredRoles)) {
    const currentRole = userContext?.role || 'unknown';
    const roleNames = requiredRoles.join(' or ');
    throw new Error(`Access denied. Required roles: ${roleNames}, current role: ${currentRole}`);
  }
}

/**
 * Get judge ID for the current user (if they are a judge)
 */
export function getJudgeId(userContext: UserContext | null): string | null {
  if (!userContext || !hasAnyRole(userContext, ['judge', 'admin'])) {
    return null;
  }
  
  // For admin users, use their userId as judgeId
  return userContext.judgeId || userContext.userId;
}

/**
 * Check if user can access score data (either their own scores or admin)
 */
export function canAccessScore(userContext: UserContext | null, scoreJudgeId?: string): boolean {
  if (!userContext) return false;
  
  // Admin can access all scores
  if (userContext.role === 'admin') return true;
  
  // Judges can access their own scores
  if (userContext.role === 'judge') {
    const currentJudgeId = getJudgeId(userContext);
    return currentJudgeId === scoreJudgeId;
  }
  
  return false;
}

/**
 * Validate score access permissions
 */
export function requireScoreAccess(userContext: UserContext | null, scoreJudgeId?: string): void {
  if (!canAccessScore(userContext, scoreJudgeId)) {
    throw new Error('Access denied. You can only access your own scores.');
  }
}

/**
 * Validate that a judge has been granted the given scoring-type permission.
 * Admins always pass; participants are rejected by the caller's role check upstream.
 */
export function requireScoringPermission(userContext: UserContext | null, scoringType: ScoringType): void {
  if (!userContext || userContext.role === 'admin') return;

  if (!userContext.permissions[scoringType]) {
    throw new Error(`Access denied. You do not have ${scoringType} permission.`);
  }
}