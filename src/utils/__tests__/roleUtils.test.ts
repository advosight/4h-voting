import { getUserRole, hasRole, hasAnyRole, isJudge, isAdmin, getJudgeId } from '../roleUtils';
import { getCurrentUser } from 'aws-amplify/auth';
import type { MockedFunction, Mock } from 'vitest';

// Mock aws-amplify/auth
vi.mock('aws-amplify/auth', () => ({
  getCurrentUser: vi.fn(),
}));

const mockGetCurrentUser = getCurrentUser as MockedFunction<typeof getCurrentUser>;

describe('roleUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserRole', () => {
    it('should return admin role for default admin user', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'admin-123',
        username: 'admin',
        signInDetails: {
          loginId: '4h-leader@example.com',
        },
        attributes: {},
      } as any);

      const result = await getUserRole();

      expect(result).toEqual({
        userId: 'admin-123',
        email: '4h-leader@example.com',
        role: 'admin',
        judgeId: undefined,
        name: '4h-leader@example.com',
      });
    });

    it('should return judge role for user with custom:role judge', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'judge-123',
        username: 'judge1',
        signInDetails: {
          loginId: 'judge@example.com',
        },
        attributes: {
          'custom:role': 'judge',
          'custom:judgeId': 'JUDGE_001',
          name: 'Judge Smith',
        },
      } as any);

      const result = await getUserRole();

      expect(result).toEqual({
        userId: 'judge-123',
        email: 'judge@example.com',
        role: 'judge',
        judgeId: 'JUDGE_001',
        name: 'Judge Smith',
      });
    });

    it('should return judge role for user with judgeId but no role', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'judge-456',
        username: 'judge2',
        signInDetails: {
          loginId: 'judge2@example.com',
        },
        attributes: {
          'custom:judgeId': 'JUDGE_002',
          name: 'Judge Jones',
        },
      } as any);

      const result = await getUserRole();

      expect(result).toEqual({
        userId: 'judge-456',
        email: 'judge2@example.com',
        role: 'judge',
        judgeId: 'JUDGE_002',
        name: 'Judge Jones',
      });
    });

    it('should return participant role for regular user', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'user-789',
        username: 'participant1',
        signInDetails: {
          loginId: 'participant@example.com',
        },
        attributes: {
          name: 'John Participant',
        },
      } as any);

      const result = await getUserRole();

      expect(result).toEqual({
        userId: 'user-789',
        email: 'participant@example.com',
        role: 'participant',
        judgeId: undefined,
        name: 'John Participant',
      });
    });

    it('should return null on error', async () => {
      mockGetCurrentUser.mockRejectedValue(new Error('Auth error'));

      const result = await getUserRole();

      expect(result).toBeNull();
    });
  });

  describe('hasRole', () => {
    it('should return true for admin user with any role', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'admin-123',
        signInDetails: { loginId: '4h-leader@example.com' },
        attributes: {},
      } as any);

      const result = await hasRole('judge');
      expect(result).toBe(true);
    });

    it('should return true for matching role', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'judge-123',
        signInDetails: { loginId: 'judge@example.com' },
        attributes: { 'custom:role': 'judge' },
      } as any);

      const result = await hasRole('judge');
      expect(result).toBe(true);
    });

    it('should return false for non-matching role', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'participant-123',
        signInDetails: { loginId: 'participant@example.com' },
        attributes: { 'custom:role': 'participant' },
      } as any);

      const result = await hasRole('judge');
      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockGetCurrentUser.mockRejectedValue(new Error('Auth error'));

      const result = await hasRole('admin');
      expect(result).toBe(false);
    });
  });

  describe('hasAnyRole', () => {
    it('should return true for admin user with any roles', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'admin-123',
        signInDetails: { loginId: '4h-leader@example.com' },
        attributes: {},
      } as any);

      const result = await hasAnyRole(['judge', 'participant']);
      expect(result).toBe(true);
    });

    it('should return true for matching role in array', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'judge-123',
        signInDetails: { loginId: 'judge@example.com' },
        attributes: { 'custom:role': 'judge' },
      } as any);

      const result = await hasAnyRole(['judge', 'admin']);
      expect(result).toBe(true);
    });

    it('should return false for non-matching roles', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'participant-123',
        signInDetails: { loginId: 'participant@example.com' },
        attributes: { 'custom:role': 'participant' },
      } as any);

      const result = await hasAnyRole(['judge', 'admin']);
      expect(result).toBe(false);
    });
  });

  describe('isJudge', () => {
    it('should return true for judge user', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'judge-123',
        signInDetails: { loginId: 'judge@example.com' },
        attributes: { 'custom:role': 'judge' },
      } as any);

      const result = await isJudge();
      expect(result).toBe(true);
    });

    it('should return true for admin user', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'admin-123',
        signInDetails: { loginId: '4h-leader@example.com' },
        attributes: {},
      } as any);

      const result = await isJudge();
      expect(result).toBe(true);
    });

    it('should return false for participant user', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'participant-123',
        signInDetails: { loginId: 'participant@example.com' },
        attributes: { 'custom:role': 'participant' },
      } as any);

      const result = await isJudge();
      expect(result).toBe(false);
    });
  });

  describe('isAdmin', () => {
    it('should return true for admin user', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'admin-123',
        signInDetails: { loginId: '4h-leader@example.com' },
        attributes: {},
      } as any);

      const result = await isAdmin();
      expect(result).toBe(true);
    });

    it('should return false for judge user', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'judge-123',
        signInDetails: { loginId: 'judge@example.com' },
        attributes: { 'custom:role': 'judge' },
      } as any);

      const result = await isAdmin();
      expect(result).toBe(false);
    });
  });

  describe('getJudgeId', () => {
    it('should return judgeId for judge user', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'judge-123',
        signInDetails: { loginId: 'judge@example.com' },
        attributes: { 
          'custom:role': 'judge',
          'custom:judgeId': 'JUDGE_001',
        },
      } as any);

      const result = await getJudgeId();
      expect(result).toBe('JUDGE_001');
    });

    it('should return userId for admin user without judgeId', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'admin-123',
        signInDetails: { loginId: '4h-leader@example.com' },
        attributes: {},
      } as any);

      const result = await getJudgeId();
      expect(result).toBe('admin-123');
    });

    it('should return null for participant user', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'participant-123',
        signInDetails: { loginId: 'participant@example.com' },
        attributes: { 'custom:role': 'participant' },
      } as any);

      const result = await getJudgeId();
      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockGetCurrentUser.mockRejectedValue(new Error('Auth error'));

      const result = await getJudgeId();
      expect(result).toBeNull();
    });
  });
});