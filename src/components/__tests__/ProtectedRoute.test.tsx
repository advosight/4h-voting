import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Authenticator } from '@aws-amplify/ui-react';
import ProtectedRoute from '../ProtectedRoute';
import * as roleUtils from '../../utils/roleUtils';
import type { MockedFunction, Mock } from 'vitest';

// Mock the role utils
vi.mock('../../utils/roleUtils', () => ({
  getUserRole: vi.fn(),
  hasAnyRole: vi.fn(),
}));

// Mock the Authenticator component
vi.mock('@aws-amplify/ui-react', () => ({
  Authenticator: ({ children }: { children: any }) => {
    const mockUser = { userId: 'test-user', email: 'test@example.com' };
    const mockSignOut = vi.fn();
    return children({ user: mockUser, signOut: mockSignOut });
  },
}));

const mockGetUserRole = roleUtils.getUserRole as MockedFunction<typeof roleUtils.getUserRole>;
const mockHasAnyRole = roleUtils.hasAnyRole as MockedFunction<typeof roleUtils.hasAnyRole>;

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const TestComponent = () => <div>Protected Content</div>;

  it('should show loading state while checking permissions', async () => {
    // Mock a delayed response
    mockGetUserRole.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({
      userId: 'test-user',
      email: 'test@example.com',
      role: 'admin',
    }), 100)));
    mockHasAnyRole.mockResolvedValue(true);

    render(
      <ProtectedRoute requiredRoles={['admin']}>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByText('Checking permissions...')).toBeInTheDocument();
  });

  it('should render protected content for authorized admin user', async () => {
    mockGetUserRole.mockResolvedValue({
      userId: 'admin-123',
      email: 'admin@example.com',
      role: 'admin',
    });
    mockHasAnyRole.mockResolvedValue(true);

    render(
      <ProtectedRoute requiredRoles={['admin']}>
        <TestComponent />
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  it('should render protected content for authorized judge user', async () => {
    mockGetUserRole.mockResolvedValue({
      userId: 'judge-123',
      email: 'judge@example.com',
      role: 'judge',
      judgeId: 'JUDGE_001',
    });
    mockHasAnyRole.mockResolvedValue(true);

    render(
      <ProtectedRoute requiredRoles={['judge', 'admin']}>
        <TestComponent />
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  it('should show access denied for unauthorized user', async () => {
    mockGetUserRole.mockResolvedValue({
      userId: 'participant-123',
      email: 'participant@example.com',
      role: 'participant',
    });
    mockHasAnyRole.mockResolvedValue(false);

    render(
      <ProtectedRoute requiredRoles={['admin']}>
        <TestComponent />
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText('admin access is required for this functionality.')).toBeInTheDocument();
      expect(screen.getByText('Your current role: participant')).toBeInTheDocument();
    });
  });

  it('should show access denied for multiple required roles', async () => {
    mockGetUserRole.mockResolvedValue({
      userId: 'participant-123',
      email: 'participant@example.com',
      role: 'participant',
    });
    mockHasAnyRole.mockResolvedValue(false);

    render(
      <ProtectedRoute requiredRoles={['judge', 'admin']}>
        <TestComponent />
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText('judge or admin access is required for this functionality.')).toBeInTheDocument();
    });
  });

  it('should handle backward compatibility with requireJudgeRole prop', async () => {
    mockGetUserRole.mockResolvedValue({
      userId: 'judge-123',
      email: 'judge@example.com',
      role: 'judge',
      judgeId: 'JUDGE_001',
    });
    mockHasAnyRole.mockResolvedValue(true);

    render(
      <ProtectedRoute requireJudgeRole={true}>
        <TestComponent />
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    expect(mockHasAnyRole).toHaveBeenCalledWith(['judge', 'admin']);
  });

  it('should show error message when role check fails', async () => {
    mockGetUserRole.mockResolvedValue(null);
    mockHasAnyRole.mockResolvedValue(false);

    render(
      <ProtectedRoute requiredRoles={['admin']}>
        <TestComponent />
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });
  });

  it('should handle getUserRole error gracefully', async () => {
    mockGetUserRole.mockRejectedValue(new Error('Auth error'));
    mockHasAnyRole.mockResolvedValue(false);

    render(
      <ProtectedRoute requiredRoles={['admin']}>
        <TestComponent />
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText('Error: Auth error')).toBeInTheDocument();
    });
  });

  it('should pass user context to child component', async () => {
    const mockUserInfo = {
      userId: 'admin-123',
      email: 'admin@example.com',
      role: 'admin' as const,
    };

    mockGetUserRole.mockResolvedValue(mockUserInfo);
    mockHasAnyRole.mockResolvedValue(true);

    const TestComponentWithProps = ({ user }: { user: any }) => (
      <div>
        <span>User: {user.email}</span>
        <span>Role: {user.role}</span>
      </div>
    );

    render(
      <ProtectedRoute requiredRoles={['admin']}>
        <TestComponentWithProps />
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(screen.getByText('User: admin@example.com')).toBeInTheDocument();
      expect(screen.getByText('Role: admin')).toBeInTheDocument();
    });
  });
});