import React from 'react';
import { useUserRole, UserWithRole } from '../utils/roleUtils';

interface RoleBasedNavigationProps {
  user?: UserWithRole;
  signOut?: () => void;
}

interface NavigationItem {
  path: string;
  label: string;
  requiredRoles: string[];
  description?: string;
}

const navigationItems: NavigationItem[] = [
  {
    path: '/',
    label: 'Dashboard',
    requiredRoles: ['admin', 'judge', 'participant'],
    description: 'Main dashboard and cat management',
  },
  {
    path: '/scoring',
    label: 'Scoring Interface',
    requiredRoles: ['admin', 'judge'],
    description: 'Access cage scoring and class scoring interfaces',
  },
  {
    path: '/reports',
    label: 'Scoring Reports',
    requiredRoles: ['admin'],
    description: 'View and export cage scoring and class scoring reports',
  },
  {
    path: '/judges',
    label: 'Judge Management',
    requiredRoles: ['admin'],
    description: 'Create and manage judge accounts',
  },
  {
    path: '/tv-mode',
    label: 'TV Display',
    requiredRoles: ['admin', 'judge', 'participant'],
    description: 'Public results display',
  },
];

function RoleBasedNavigation({ user, signOut }: RoleBasedNavigationProps): JSX.Element {
  const { userInfo, loading } = useUserRole();
  const currentUser = user || userInfo;

  if (loading) {
    return <div>Loading navigation...</div>;
  }

  if (!currentUser) {
    return <div>Please sign in to access navigation</div>;
  }

  // Filter navigation items based on user role
  const availableItems = navigationItems.filter(item => 
    item.requiredRoles.includes(currentUser.role) || currentUser.role === 'admin'
  );

  return (
    <nav className="role-based-navigation" style={{ 
      padding: '1rem', 
      backgroundColor: '#f8f9fa', 
      borderBottom: '1px solid #dee2e6',
      marginBottom: '1rem'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <h2 style={{ margin: 0, color: '#495057' }}>4H Cat System</h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {availableItems.map(item => (
              <a
                key={item.path}
                href={item.path}
                style={{
                  textDecoration: 'none',
                  color: '#007bff',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  border: '1px solid #007bff',
                  backgroundColor: 'white',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#007bff';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.color = '#007bff';
                }}
                title={item.description}
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>
              {currentUser.name || currentUser.email}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>
              Role: <strong>{currentUser.role}</strong>
              {currentUser.judgeId && (
                <span> | Judge ID: <strong>{currentUser.judgeId}</strong></span>
              )}
            </div>
          </div>
          {signOut && (
            <button
              onClick={signOut}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Sign Out
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

export default RoleBasedNavigation;