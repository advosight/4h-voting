import {
  getUserContext,
  hasRole,
  hasAnyRole,
  requireRole,
  requireAnyRole,
  getJudgeId,
  canAccessScore,
  requireScoreAccess,
  UserContext,
} from '../roleValidation';

describe('roleValidation', () => {
  const mockAdminEvent = {
    identity: {
      claims: {
        sub: 'admin-123',
        'cognito:username': 'admin',
        email: '4h-leader@example.com',
        'cognito:groups': ['admin'],
      },
    },
  };

  const mockJudgeEvent = {
    identity: {
      claims: {
        sub: 'judge-123',
        'cognito:username': 'judge1',
        email: 'judge@example.com',
        'custom:role': 'judge',
        'custom:judgeId': 'JUDGE_001',
      },
    },
  };

  const mockParticipantEvent = {
    identity: {
      claims: {
        sub: 'participant-123',
        'cognito:username': 'participant1',
        email: 'participant@example.com',
        'custom:role': 'participant',
      },
    },
  };

  const mockInvalidEvent = {
    identity: null,
  };

  describe('getUserContext', () => {
    it('should extract admin user context correctly', () => {
      const result = getUserContext(mockAdminEvent);

      expect(result).toEqual({
        userId: 'admin-123',
        email: '4h-leader@example.com',
        role: 'admin',
        judgeId: undefined,
        claims: mockAdminEvent.identity.claims,
        permissions: { cageScoring: true, classScoring: true, fitShowScoring: true },
      });
    });

    it('should extract judge user context correctly', () => {
      const result = getUserContext(mockJudgeEvent);

      expect(result).toEqual({
        userId: 'judge-123',
        email: 'judge@example.com',
        role: 'judge',
        judgeId: 'JUDGE_001',
        claims: mockJudgeEvent.identity.claims,
        permissions: { cageScoring: true, classScoring: true, fitShowScoring: true },
      });
    });

    it('should extract participant user context correctly', () => {
      const result = getUserContext(mockParticipantEvent);

      expect(result).toEqual({
        userId: 'participant-123',
        email: 'participant@example.com',
        role: 'participant',
        judgeId: undefined,
        claims: mockParticipantEvent.identity.claims,
        permissions: { cageScoring: true, classScoring: true, fitShowScoring: true },
      });
    });

    it('should return null for invalid event', () => {
      const result = getUserContext(mockInvalidEvent);
      expect(result).toBeNull();
    });

    it('should handle user with judgeId but no role', () => {
      const eventWithJudgeId = {
        identity: {
          claims: {
            sub: 'judge-456',
            email: 'judge2@example.com',
            'custom:judgeId': 'JUDGE_002',
          },
        },
      };

      const result = getUserContext(eventWithJudgeId);

      expect(result?.role).toBe('judge');
      expect(result?.judgeId).toBe('JUDGE_002');
    });
  });

  describe('hasRole', () => {
    it('should return true for admin user with any role', () => {
      const userContext = getUserContext(mockAdminEvent);
      expect(hasRole(userContext, 'judge')).toBe(true);
      expect(hasRole(userContext, 'participant')).toBe(true);
      expect(hasRole(userContext, 'admin')).toBe(true);
    });

    it('should return true for matching role', () => {
      const userContext = getUserContext(mockJudgeEvent);
      expect(hasRole(userContext, 'judge')).toBe(true);
    });

    it('should return false for non-matching role', () => {
      const userContext = getUserContext(mockJudgeEvent);
      expect(hasRole(userContext, 'participant')).toBe(false);
    });

    it('should return false for null user context', () => {
      expect(hasRole(null, 'admin')).toBe(false);
    });
  });

  describe('hasAnyRole', () => {
    it('should return true for admin user with any roles', () => {
      const userContext = getUserContext(mockAdminEvent);
      expect(hasAnyRole(userContext, ['judge', 'participant'])).toBe(true);
    });

    it('should return true for matching role in array', () => {
      const userContext = getUserContext(mockJudgeEvent);
      expect(hasAnyRole(userContext, ['judge', 'admin'])).toBe(true);
    });

    it('should return false for non-matching roles', () => {
      const userContext = getUserContext(mockParticipantEvent);
      expect(hasAnyRole(userContext, ['judge', 'admin'])).toBe(false);
    });

    it('should return false for null user context', () => {
      expect(hasAnyRole(null, ['admin', 'judge'])).toBe(false);
    });
  });

  describe('requireRole', () => {
    it('should not throw for admin user with any role', () => {
      const userContext = getUserContext(mockAdminEvent);
      expect(() => requireRole(userContext, 'judge')).not.toThrow();
    });

    it('should not throw for matching role', () => {
      const userContext = getUserContext(mockJudgeEvent);
      expect(() => requireRole(userContext, 'judge')).not.toThrow();
    });

    it('should throw for non-matching role', () => {
      const userContext = getUserContext(mockParticipantEvent);
      expect(() => requireRole(userContext, 'judge')).toThrow('Access denied. Required role: judge, current role: participant');
    });

    it('should throw for null user context', () => {
      expect(() => requireRole(null, 'admin')).toThrow('Access denied. Required role: admin, current role: unknown');
    });
  });

  describe('requireAnyRole', () => {
    it('should not throw for admin user with any roles', () => {
      const userContext = getUserContext(mockAdminEvent);
      expect(() => requireAnyRole(userContext, ['judge', 'participant'])).not.toThrow();
    });

    it('should not throw for matching role in array', () => {
      const userContext = getUserContext(mockJudgeEvent);
      expect(() => requireAnyRole(userContext, ['judge', 'admin'])).not.toThrow();
    });

    it('should throw for non-matching roles', () => {
      const userContext = getUserContext(mockParticipantEvent);
      expect(() => requireAnyRole(userContext, ['judge', 'admin'])).toThrow('Access denied. Required roles: judge or admin, current role: participant');
    });

    it('should throw for null user context', () => {
      expect(() => requireAnyRole(null, ['admin', 'judge'])).toThrow('Access denied. Required roles: admin or judge, current role: unknown');
    });
  });

  describe('getJudgeId', () => {
    it('should return judgeId for judge user', () => {
      const userContext = getUserContext(mockJudgeEvent);
      expect(getJudgeId(userContext)).toBe('JUDGE_001');
    });

    it('should return userId for admin user without judgeId', () => {
      const userContext = getUserContext(mockAdminEvent);
      expect(getJudgeId(userContext)).toBe('admin-123');
    });

    it('should return null for participant user', () => {
      const userContext = getUserContext(mockParticipantEvent);
      expect(getJudgeId(userContext)).toBeNull();
    });

    it('should return null for null user context', () => {
      expect(getJudgeId(null)).toBeNull();
    });
  });

  describe('canAccessScore', () => {
    it('should return true for admin user', () => {
      const userContext = getUserContext(mockAdminEvent);
      expect(canAccessScore(userContext, 'any-judge-id')).toBe(true);
    });

    it('should return true for judge accessing their own score', () => {
      const userContext = getUserContext(mockJudgeEvent);
      expect(canAccessScore(userContext, 'JUDGE_001')).toBe(true);
    });

    it('should return false for judge accessing another judge\'s score', () => {
      const userContext = getUserContext(mockJudgeEvent);
      expect(canAccessScore(userContext, 'JUDGE_002')).toBe(false);
    });

    it('should return false for participant user', () => {
      const userContext = getUserContext(mockParticipantEvent);
      expect(canAccessScore(userContext, 'any-judge-id')).toBe(false);
    });

    it('should return false for null user context', () => {
      expect(canAccessScore(null, 'any-judge-id')).toBe(false);
    });
  });

  describe('requireScoreAccess', () => {
    it('should not throw for admin user', () => {
      const userContext = getUserContext(mockAdminEvent);
      expect(() => requireScoreAccess(userContext, 'any-judge-id')).not.toThrow();
    });

    it('should not throw for judge accessing their own score', () => {
      const userContext = getUserContext(mockJudgeEvent);
      expect(() => requireScoreAccess(userContext, 'JUDGE_001')).not.toThrow();
    });

    it('should throw for judge accessing another judge\'s score', () => {
      const userContext = getUserContext(mockJudgeEvent);
      expect(() => requireScoreAccess(userContext, 'JUDGE_002')).toThrow('Access denied. You can only access your own scores.');
    });

    it('should throw for participant user', () => {
      const userContext = getUserContext(mockParticipantEvent);
      expect(() => requireScoreAccess(userContext, 'any-judge-id')).toThrow('Access denied. You can only access your own scores.');
    });

    it('should throw for null user context', () => {
      expect(() => requireScoreAccess(null, 'any-judge-id')).toThrow('Access denied. You can only access your own scores.');
    });
  });
});