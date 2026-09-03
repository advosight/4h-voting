import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PermissionError } from '../errorHandler';
import * as roleValidation from '../roleValidation';

describe('EventResolver auth gating', () => {
  describe('requireRole enforcement', () => {
    it('should throw PermissionError when judge tries to use admin-only mutation', () => {
      const judgeContext = {
        userId: 'judge-123',
        email: 'judge@test.com',
        role: 'judge' as const,
        judgeId: 'judge-123',
        claims: { sub: 'judge-123' },
        permissions: { cageScoring: true, classScoring: true, fitShowScoring: true },
      };

      expect(() => {
        roleValidation.requireRole(judgeContext, 'admin');
      }).toThrow(Error);
      expect(() => {
        roleValidation.requireRole(judgeContext, 'admin');
      }).toThrow(/Access denied/);
    });

    it('should allow admin to use admin-only mutation', () => {
      const adminContext = {
        userId: 'admin-123',
        email: 'admin@test.com',
        role: 'admin' as const,
        judgeId: 'admin-123',
        claims: { sub: 'admin-123' },
        permissions: { cageScoring: true, classScoring: true, fitShowScoring: true },
      };

      // Should not throw
      expect(() => {
        roleValidation.requireRole(adminContext, 'admin');
      }).not.toThrow();
    });

    it('should throw PermissionError when null context tries to use admin mutation', () => {
      expect(() => {
        roleValidation.requireRole(null, 'admin');
      }).toThrow(Error);
    });
  });

  describe('requireAnyRole enforcement', () => {
    it('should allow judge to use judge or admin query', () => {
      const judgeContext = {
        userId: 'judge-123',
        email: 'judge@test.com',
        role: 'judge' as const,
        judgeId: 'judge-123',
        claims: { sub: 'judge-123' },
        permissions: { cageScoring: true, classScoring: true, fitShowScoring: true },
      };

      // Should not throw for judge-allowed queries
      expect(() => {
        roleValidation.requireAnyRole(judgeContext, ['admin', 'judge']);
      }).not.toThrow();
    });

    it('should allow admin to use any role query', () => {
      const adminContext = {
        userId: 'admin-123',
        email: 'admin@test.com',
        role: 'admin' as const,
        judgeId: 'admin-123',
        claims: { sub: 'admin-123' },
        permissions: { cageScoring: true, classScoring: true, fitShowScoring: true },
      };

      // Admin should be able to use any query
      expect(() => {
        roleValidation.requireAnyRole(adminContext, ['admin', 'judge']);
      }).not.toThrow();

      expect(() => {
        roleValidation.requireAnyRole(adminContext, ['judge']);
      }).not.toThrow();
    });

    it('should throw PermissionError when participant tries to use judge-only query', () => {
      const participantContext = {
        userId: 'participant-123',
        email: 'participant@test.com',
        role: 'participant' as const,
        claims: { sub: 'participant-123' },
        permissions: { cageScoring: false, classScoring: false, fitShowScoring: false },
      };

      expect(() => {
        roleValidation.requireAnyRole(participantContext, ['admin', 'judge']);
      }).toThrow(Error);
      expect(() => {
        roleValidation.requireAnyRole(participantContext, ['admin', 'judge']);
      }).toThrow(/Access denied/);
    });
  });

  describe('Auth gate summary for Event mutations/queries', () => {
    it('getActiveEvent and listEvents require admin OR judge role', () => {
      const judgeContext = {
        userId: 'judge-123',
        role: 'judge' as const,
        claims: { sub: 'judge-123' },
        email: 'judge@test.com',
        permissions: { cageScoring: true, classScoring: true, fitShowScoring: true },
      };

      // Query operations allow judge
      expect(() => {
        roleValidation.requireAnyRole(judgeContext, ['admin', 'judge']);
      }).not.toThrow();
    });

    it('switchActiveEvent and archiveAndCreateEvent require admin role only', () => {
      const judgeContext = {
        userId: 'judge-123',
        role: 'judge' as const,
        claims: { sub: 'judge-123' },
        email: 'judge@test.com',
        permissions: { cageScoring: true, classScoring: true, fitShowScoring: true },
      };

      const adminContext = {
        userId: 'admin-123',
        role: 'admin' as const,
        claims: { sub: 'admin-123' },
        email: 'admin@test.com',
        permissions: { cageScoring: true, classScoring: true, fitShowScoring: true },
      };

      // Mutation operations reject judge
      expect(() => {
        roleValidation.requireRole(judgeContext, 'admin');
      }).toThrow();

      // Mutation operations allow admin
      expect(() => {
        roleValidation.requireRole(adminContext, 'admin');
      }).not.toThrow();
    });
  });
});
