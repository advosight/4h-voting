import React from 'react';
import { getCurrentUser, fetchUserAttributes, fetchAuthSession } from 'aws-amplify/auth';

export type UserRole = 'admin' | 'judge' | 'participant';

export interface UserWithRole {
  userId: string;
  email: string;
  role: UserRole;
  judgeId?: string;
  name?: string;
  permissions?: {
    cageScoring?: boolean;
    classScoring?: boolean;
    fitShowScoring?: boolean;
  };
}

/**
 * Extract user role from Cognito user attributes
 */
export async function getUserRole(): Promise<UserWithRole | null> {
  try {
    const user = await getCurrentUser();
    const loginId = user.signInDetails?.loginId;

    // getCurrentUser() does not include custom attributes or group membership in
    // Amplify v6 - those must be fetched separately.
    const userAttributes = await fetchUserAttributes();
    const session = await fetchAuthSession();
    const cognitoGroups = (session.tokens?.idToken?.payload?.['cognito:groups'] as string[]) || [];

    const customRole = userAttributes['custom:role'] as UserRole | undefined;
    const judgeId = userAttributes['custom:judgeId'];

    // Cognito groups are the source of truth when present; fall back to custom:role,
    // then judgeId, matching the backend's role derivation in roleValidation.ts.
    let role: UserRole = customRole || 'participant';
    if (cognitoGroups.includes('admin')) {
      role = 'admin';
    } else if (cognitoGroups.includes('judge')) {
      role = 'judge';
    } else if (customRole) {
      role = customRole;
    } else if (judgeId) {
      role = 'judge';
    }

    // Extract judge permissions from custom attributes
    const permissions = {
      cageScoring: userAttributes['custom:cageScoring'] === 'true' || role === 'admin',
      classScoring: userAttributes['custom:classScoring'] === 'true' || role === 'admin',
      fitShowScoring: userAttributes['custom:fitShowScoring'] === 'true' || role === 'admin',
    };

    // If user is a judge but no specific permissions are set, grant all permissions
    if (role === 'judge' && !userAttributes['custom:cageScoring'] && !userAttributes['custom:classScoring'] && !userAttributes['custom:fitShowScoring']) {
      permissions.cageScoring = true;
      permissions.classScoring = true;
      permissions.fitShowScoring = true;
    }

    return {
      userId: user.userId,
      email: userAttributes.email || loginId || user.username,
      role,
      judgeId,
      name: userAttributes.name || userAttributes.email || loginId,
      permissions,
    };
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}

/**
 * Check if current user has the specified role
 */
export async function hasRole(requiredRole: UserRole): Promise<boolean> {
  const userInfo = await getUserRole();
  if (!userInfo) return false;
  
  // Admin users have access to all roles
  if (userInfo.role === 'admin') return true;
  
  return userInfo.role === requiredRole;
}

/**
 * Check if current user has any of the specified roles
 */
export async function hasAnyRole(requiredRoles: UserRole[]): Promise<boolean> {
  const userInfo = await getUserRole();
  if (!userInfo) return false;
  
  // Admin users have access to all roles
  if (userInfo.role === 'admin') return true;
  
  return requiredRoles.includes(userInfo.role);
}

/**
 * Check if current user is a judge
 */
export async function isJudge(): Promise<boolean> {
  return hasAnyRole(['judge', 'admin']);
}

/**
 * Check if current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  return hasRole('admin');
}

/**
 * Get judge ID for current user (if they are a judge)
 */
export async function getJudgeId(): Promise<string | null> {
  const userInfo = await getUserRole();
  if (!userInfo || !['judge', 'admin'].includes(userInfo.role)) {
    return null;
  }
  
  // For admin users, use their userId as judgeId
  return userInfo.judgeId || userInfo.userId;
}

/**
 * Check if current user can perform cage scoring
 */
export async function canCageScore(): Promise<boolean> {
  const userInfo = await getUserRole();
  if (!userInfo) return false;
  
  return userInfo.role === 'admin' || (userInfo.role === 'judge' && userInfo.permissions?.cageScoring === true);
}

/**
 * Check if current user can perform class scoring
 */
export async function canClassScore(): Promise<boolean> {
  const userInfo = await getUserRole();
  if (!userInfo) return false;
  
  return userInfo.role === 'admin' || (userInfo.role === 'judge' && userInfo.permissions?.classScoring === true);
}

/**
 * Check if current user can perform fit and show scoring
 */
export async function canFitShowScore(): Promise<boolean> {
  const userInfo = await getUserRole();
  if (!userInfo) return false;
  
  return userInfo.role === 'admin' || (userInfo.role === 'judge' && userInfo.permissions?.fitShowScoring === true);
}

/**
 * Hook for React components to get user role information
 */
export function useUserRole() {
  const [userInfo, setUserInfo] = React.useState<UserWithRole | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    
    const fetchUserRole = async () => {
      try {
        setLoading(true);
        setError(null);
        const info = await getUserRole();
        if (mounted) {
          setUserInfo(info);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to get user role');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchUserRole();
    
    return () => {
      mounted = false;
    };
  }, []);

  return { userInfo, loading, error };
}

