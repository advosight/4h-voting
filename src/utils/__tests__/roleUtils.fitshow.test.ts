import { getCurrentUser } from 'aws-amplify/auth';
import {
  getUserRole,
  canCageScore,
  canClassScore,
  canFitShowScore,
  hasRole,
  hasAnyRole,
  isJudge,
  isAdmin,
  getJudgeId
} from '../roleUtils';
import type { MockedFunction, Mock } from 'vitest';

// Mock AWS Amplify
vi.mock('aws-amplify/auth');
const mockGetCurrentUser = getCurrentUser as MockedFunction<typeof getCurrentUser>;

describe('Role Utils - Fit and Show Scoring Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserRole with permissions', () => {
    it('should return admin user with all permissions', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'admin-123',
        username: 'admin',
        signInDetails: {
          loginId: '4h-leader@example.com'
        },
        attributes: {}
      } as any);

      const userRole = await getUserRole();

      expect(userRole).toEqual({
        userId: 'admin-123',
        email: '4h-leader@example.com',
        role: 'admin',
        judgeId: undefined,
        name: '4h-leader@example.com',
        permissions: {
          cageScoring: true,
          classScoring: true,
          fitShowScoring: true,
        }
      });
    });

    it('should return judge with specific permissions', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'judge-123',
        username: 'judge1',
        signInDetails: {
          loginId: 'judge1@example.com'
        },
        attributes: {
          'custom:role': 'judge',
          'custom:judgeId': 'J001',
          'custom:cageScoring': 'true',
          'custom:classScoring': 'false',
          'custom:fitShowScoring': 'true',
          name: 'Judge One'
        }
      } as any);

      const userRole = await getUserRole();

      expect(userRole).toEqual({
        userId: 'judge-123',
        email: 'judge1@example.com',
        role: 'judge',
        judgeId: 'J001',
        name: 'Judge One',
        permissions: {
          cageScoring: true,
          classScoring: false,
          fitShowScoring: true,
        }
      });
    });

    it('should grant all permissions to judge without specific permissions set', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'judge-123',
        username: 'judge1',
        signInDetails: {
          loginId: 'judge1@example.com'
        },
        attributes: {
          'custom:role': 'judge',
          'custom:judgeId': 'J001'
        }
      } as any);

      const userRole = await getUserRole();

      expect(userRole?.permissions).toEqual({
        cageScoring: true,
        classScoring: true,
        fitShowScoring: true,
      });
    });

    it('should return participant with no permissions', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'participant-123',
        username: 'participant',
        signInDetails: {
          loginId: 'participant@example.com'
        },
        attributes: {
          'custom:role': 'participant'
        }
      } as any);

      const userRole = await getUserRole();

      expect(userRole?.permissions).toEqual({
        cageScoring: false,
        classScoring: false,
        fitShowScoring: false,
      });
    });
  });

  describe('canCageScore', () => {
    it('should return true for admin user', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'admin-123',
        signInDetails: { loginId: '4h-leader@example.com' },
        attributes: {}
      } as any);

      const result = await canCageScore();
      expect(result).toBe(true);
    });

    it('should return true for judge with cage scoring permission', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'judge-123',
        signInDetails: { loginId: 'judge@example.com' },
        attributes: {
          'custom:role': 'judge',
          'custom:cageScoring': 'true'
        }
      } as any);

      const result = await canCageScore();
      expect(result).toBe(true);
    });

    it('should return false for judge without cage scoring permission', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'judge-123',
        signInDetails: { loginId: 'judge@example.com' },
        attributes: {
          'custom:role': 'judge',
          'custom:cageScoring': 'false'
        }
      } as any);

      const result = await canCageScore();
      expect(result).toBe(false);
    });

    it('should return false for participant', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'participant-123',
        signInDetails: { loginId: 'participant@example.com' },
        attributes: {
          'custom:role': 'participant'
        }
      } as any);

      const result = await canCageScore();
      expect(result).toBe(false);
    });
  });

  describe('canClassScore', () => {
    it('should return true for admin user', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'admin-123',
        signInDetails: { loginId: '4h-leader@example.com' },
        attributes: {}
      } as any);

      const result = await canClassScore();
      expect(result).toBe(true);
    });

    it('should return true for judge with class scoring permission', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'judge-123',
        signInDetails: { loginId: 'judge@example.com' },
        attributes: {
          'custom:role': 'judge',
          'custom:classScoring': 'true'
        }
      } as any);

      const result = await canClassScore();
      expect(result).toBe(true);
    });

    it('should return false for judge without class scoring permission', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'judge-123',
        signInDetails: { loginId: 'judge@example.com' },
        attributes: {
          'custom:role': 'judge',
          'custom:classScoring': 'false'
        }
      } as any);

      const result = await canClassScore();
      expect(result).toBe(false);
    });
  });

  describe('canFitShowScore', () => {
    it('should return true for admin user', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'admin-123',
        signInDetails: { loginId: '4h-leader@example.com' },
        attributes: {}
      } as any);

      const result = await canFitShowScore();
      expect(result).toBe(true);
    });

    it('should return true for judge with fit and show scoring permission', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'judge-123',
        signInDetails: { loginId: 'judge@example.com' },
        attributes: {
          'custom:role': 'judge',
          'custom:fitShowScoring': 'true'
        }
      } as any);

      const result = await canFitShowScore();
      expect(result).toBe(true);
    });

    it('should return false for judge without fit and show scoring permission', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'judge-123',
        signInDetails: { loginId: 'judge@example.com' },
        attributes: {
          'custom:role': 'judge',
          'custom:fitShowScoring': 'false'
        }
      } as any);

      const result = await canFitShowScore();
      expect(result).toBe(false);
    });

    it('should return false for participant', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'participant-123',
        signInDetails: { loginId: 'participant@example.com' },
        attributes: {
          'custom:role': 'participant'
        }
      } as any);

      const result = await canFitShowScore();
      expect(result).toBe(false);
    });
  });

  describe('Permission combinations', () => {
    it('should handle judge with mixed permissions correctly', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'judge-123',
        signInDetails: { loginId: 'judge@example.com' },
        attributes: {
          'custom:role': 'judge',
          'custom:cageScoring': 'true',
          'custom:classScoring': 'false',
          'custom:fitShowScoring': 'true'
        }
      } as any);

      const cageResult = await canCageScore();
      const classResult = await canClassScore();
      const fitShowResult = await canFitShowScore();

      expect(cageResult).toBe(true);
      expect(classResult).toBe(false);
      expect(fitShowResult).toBe(true);
    });

    it('should handle judge with no permissions correctly', async () => {
      mockGetCurrentUser.mockResolvedValue({
        userId: 'judge-123',
        signInDetails: { loginId: 'judge@example.com' },
        attributes: {
          'custom:role': 'judge',
          'custom:cageScoring': 'false',
          'custom:classScoring': 'false',
          'custom:fitShowScoring': 'false'
        }
      } as any);

      const cageResult = await canCageScore();
      const classResult = await canClassScore();
      const fitShowResult = await canFitShowScore();

      expect(cageResult).toBe(false);
      expect(classResult).toBe(false);
      expect(fitShowResult).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should return false for all permissions when authentication fails', async () => {
      mockGetCurrentUser.mockRejectedValue(new Error('Authentication failed'));

      const cageResult = await canCageScore();
      const classResult = await canClassScore();
      const fitShowResult = await canFitShowScore();

      expect(cageResult).toBe(false);
      expect(classResult).toBe(false);
      expect(fitShowResult).toBe(false);
    });

    it('should return null for getUserRole when authentication fails', async () => {
      mockGetCurrentUser.mockRejectedValue(new Error('Authentication failed'));

      const userRole = await getUserRole();
      expect(userRole).toBe(null);
    });
  });
});