import React from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import { getUserRole, hasAnyRole, UserRole, UserWithRole } from '../utils/roleUtils';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
  requireJudgeRole?: boolean; // Deprecated: use requiredRoles instead
}

interface AuthenticatorChildProps {
  signOut?: ((data?: any) => void) | undefined;
  user: any;
}

interface AuthorizedContentProps {
  user: any;
  signOut?: ((data?: any) => void) | undefined;
  children: React.ReactNode;
  requiredRoles: UserRole[];
}

function AuthorizedContent({ user, signOut, children, requiredRoles }: AuthorizedContentProps): JSX.Element {
  const [isAuthorized, setIsAuthorized] = React.useState<boolean | null>(null);
  const [userInfo, setUserInfo] = React.useState<UserWithRole | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const checkUserRole = React.useCallback(async () => {
    try {
      setError(null);
      const roleInfo = await getUserRole();
      
      if (!roleInfo) {
        setIsAuthorized(false);
        setError('Unable to determine user role');
        return;
      }

      setUserInfo(roleInfo);
      
      // Check if user has any of the required roles
      const authorized = await hasAnyRole(requiredRoles);
      setIsAuthorized(authorized);
      
    } catch (error) {
      console.error('Error checking user role:', error);
      setIsAuthorized(false);
      setError(error instanceof Error ? error.message : 'Authorization check failed');
    }
  }, [requiredRoles]);

  // Check authorization when user changes
  React.useEffect(() => {
    if (user) {
      checkUserRole();
    }
  }, [user, checkUserRole]);

  // Show loading while checking authorization
  if (isAuthorized === null) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column'
      }}>
        <div>Checking permissions...</div>
      </div>
    );
  }

  // Show unauthorized message if user doesn't have required role
  if (!isAuthorized) {
    const roleNames = requiredRoles.join(' or ');
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        textAlign: 'center',
        padding: '20px'
      }}>
        <h2>Access Denied</h2>
        <p>You don't have permission to access this page.</p>
        <p>{roleNames} access is required for this functionality.</p>
        {userInfo && (
          <p>Your current role: <strong>{userInfo.role}</strong></p>
        )}
        {error && (
          <p style={{ color: 'red', fontSize: '0.9em' }}>Error: {error}</p>
        )}
        <button 
          className="btn btn-primary" 
          onClick={() => signOut && signOut()}
          style={{ marginTop: '20px' }}
        >
          Sign Out
        </button>
      </div>
    );
  }

  // Render children with user context if authorized
  return (
    <>
      {React.cloneElement(children as React.ReactElement, { 
        user: userInfo, 
        signOut: signOut || (() => {})
      })}
    </>
  );
}

function ProtectedRoute({ children, requiredRoles, requireJudgeRole = false }: ProtectedRouteProps): JSX.Element {
  // Handle backward compatibility
  const roles = requiredRoles || (requireJudgeRole ? ['judge', 'admin'] : ['admin']);
  
  return (
    <Authenticator>
      {({ signOut, user }: AuthenticatorChildProps) => (
        <AuthorizedContent 
          user={user} 
          signOut={signOut} 
          children={children} 
          requiredRoles={roles}
        />
      )}
    </Authenticator>
  );
}

export default ProtectedRoute;