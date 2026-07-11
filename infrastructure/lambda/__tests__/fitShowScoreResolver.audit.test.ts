import { AppSyncResolverEvent } from 'aws-lambda';

// Mock the data access layer. The mock instance must exist before the resolver
// module is imported below: the resolver constructs a module-level singleton via
// `new FitShowScoreDataAccess(...)` at import time, so reassigning the mock's
// return value afterwards (e.g. in beforeEach) would never reach that singleton.
const mockDataAccess = {
  createFitShowScoreWithAudit: jest.fn(),
  updateFitShowScoreWithAudit: jest.fn(),
  getFitShowScore: jest.fn(),
  getFitShowScoreAuditHistory: jest.fn(),
  finalizeFitShowScore: jest.fn()
} as any;

jest.mock('../fitShowScoreDataAccess', () => ({
  FitShowScoreDataAccess: jest.fn().mockImplementation(() => mockDataAccess),
}));

// Mock role validation
jest.mock('../roleValidation', () => ({
  getUserContext: jest.fn(),
  requireAnyRole: jest.fn(),
  requireRole: jest.fn(),
  getJudgeId: jest.fn(),
  requireScoreAccess: jest.fn(),
  requireScoringPermission: jest.fn()
}));

import { getUserContext, getJudgeId, requireAnyRole, requireScoreAccess, requireScoringPermission } from '../roleValidation';

const mockGetUserContext = getUserContext as jest.MockedFunction<typeof getUserContext>;
const mockGetJudgeId = getJudgeId as jest.MockedFunction<typeof getJudgeId>;
const mockRequireAnyRole = requireAnyRole as jest.MockedFunction<typeof requireAnyRole>;
const mockRequireScoreAccess = requireScoreAccess as jest.MockedFunction<typeof requireScoreAccess>;
const mockRequireScoringPermission = requireScoringPermission as jest.MockedFunction<typeof requireScoringPermission>;

// Import the handler after all mocks above are configured.
import { handler } from '../fitShowScoreResolver';

describe('FitShowScoreResolver - Audit Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockGetUserContext.mockReturnValue({
      userId: 'judge-1',
      role: 'judge',
      claims: { 'cognito:username': 'judge-smith', email: 'judge@example.com' },
      email: 'judge@example.com',
      permissions: { cageScoring: true, classScoring: true, fitShowScoring: true }
    });
    mockGetJudgeId.mockReturnValue('judge-1');
    mockRequireAnyRole.mockImplementation(() => {});
    mockRequireScoreAccess.mockImplementation(() => {});
    mockRequireScoringPermission.mockImplementation(() => {});
  });

  const mockEvent = (fieldName: string, args: any): AppSyncResolverEvent<any> => ({
    info: { fieldName },
    arguments: args,
    identity: {
      claims: {
        'cognito:username': 'judge-smith',
        email: 'judge@example.com'
      }
    }
  } as any);

  describe('createFitShowScore with audit', () => {
    it('calls createFitShowScoreWithAudit instead of regular create', async () => {
      const mockScore = {
        id: 'score-1',
        catId: 'cat-1',
        participantName: 'John Doe',
        judgeId: 'judge-1',
        judgeName: 'judge-smith',
        attire: 8,
        totalScore: 88,
        isFinalized: false
      };

      mockDataAccess.createFitShowScoreWithAudit.mockResolvedValue(mockScore as any);

      const event = mockEvent('createFitShowScore', {
        input: {
          catId: 'cat-1',
          participantName: 'John Doe',
          attire: 8,
          attentive: 4,
          courteous: 5,
          controlEquipment: 9,
          pickupCarrying: 3,
          showingHeadShape: 3,
          showingBodyType: 4,
          showingTail: 3,
          showingCoatTexture: 4,
          showingMouthTeethGums: 2,
          conditionMouthTeethGums: 2,
          showingNose: 2,
          showingEyes: 2,
          conditionNoseEyes: 2,
          showingEars: 2,
          earsClean: 2,
          showingToenailsClaws: 3,
          toenailsClipped: 5,
          showingBellyCoatCleanliness: 3,
          coatCleanWellGroomed: 7,
          catHealthCare: 3,
          generalKnowledge: 3,
          catBreedsShowing: 3,
          catAnatomy: 3,
          fourHKnowledge: 3
        }
      });

      const result = await handler(event);

      expect(mockDataAccess.createFitShowScoreWithAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          catId: 'cat-1',
          participantName: 'John Doe',
          judgeId: 'judge-1',
          judgeName: 'judge-smith'
        })
      );
      expect(result).toEqual(mockScore);
    });
  });

  describe('updateFitShowScore with audit', () => {
    it('calls updateFitShowScoreWithAudit with modification reason', async () => {
      const existingScore = {
        id: 'score-1',
        catId: 'cat-1',
        participantName: 'John Doe',
        judgeId: 'judge-1',
        judgeName: 'judge-smith',
        attire: 8,
        totalScore: 88,
        isFinalized: false
      };

      const updatedScore = {
        ...existingScore,
        attire: 10,
        totalScore: 90
      };

      mockDataAccess.getFitShowScore.mockResolvedValue(existingScore as any);
      mockDataAccess.updateFitShowScoreWithAudit.mockResolvedValue(updatedScore as any);

      const event = mockEvent('updateFitShowScore', {
        id: 'score-1',
        input: {
          attire: 10,
          modificationReason: 'Improved attire presentation'
        }
      });

      const result = await handler(event);

      expect(mockDataAccess.updateFitShowScoreWithAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'score-1',
          attire: 10
        }),
        'Improved attire presentation',
        false
      );
      expect(result).toEqual(updatedScore);
    });

    it('uses default reason when modificationReason not provided', async () => {
      const existingScore = {
        id: 'score-1',
        catId: 'cat-1',
        participantName: 'John Doe',
        judgeId: 'judge-1',
        judgeName: 'judge-smith',
        attire: 8,
        totalScore: 88,
        isFinalized: false
      };

      mockDataAccess.getFitShowScore.mockResolvedValue(existingScore as any);
      mockDataAccess.updateFitShowScoreWithAudit.mockResolvedValue(existingScore as any);

      const event = mockEvent('updateFitShowScore', {
        id: 'score-1',
        input: {
          attire: 10
        }
      });

      await handler(event);

      expect(mockDataAccess.updateFitShowScoreWithAudit).toHaveBeenCalledWith(
        expect.anything(),
        'Score updated by judge',
        false
      );
    });

    it('prevents modification of finalized scores by non-admin users', async () => {
      const finalizedScore = {
        id: 'score-1',
        catId: 'cat-1',
        participantName: 'John Doe',
        judgeId: 'judge-1',
        judgeName: 'judge-smith',
        attire: 8,
        totalScore: 88,
        isFinalized: true
      };

      mockDataAccess.getFitShowScore.mockResolvedValue(finalizedScore as any);

      const event = mockEvent('updateFitShowScore', {
        id: 'score-1',
        input: {
          attire: 10
        }
      });

      await expect(handler(event)).rejects.toThrow('Cannot modify finalized fit and show scores');
    });

    it('allows admin users to modify finalized scores', async () => {
      mockGetUserContext.mockReturnValue({
        userId: 'admin-1',
        role: 'admin',
        claims: { 'cognito:username': 'admin-user', email: 'admin@example.com' },
        email: 'admin@example.com',
        permissions: { cageScoring: true, classScoring: true, fitShowScoring: true }
      });

      const finalizedScore = {
        id: 'score-1',
        catId: 'cat-1',
        participantName: 'John Doe',
        judgeId: 'judge-1',
        judgeName: 'judge-smith',
        attire: 8,
        totalScore: 88,
        isFinalized: true
      };

      const updatedScore = {
        ...finalizedScore,
        attire: 10,
        totalScore: 90
      };

      mockDataAccess.getFitShowScore.mockResolvedValue(finalizedScore as any);
      mockDataAccess.updateFitShowScoreWithAudit.mockResolvedValue(updatedScore as any);

      const event = mockEvent('updateFitShowScore', {
        id: 'score-1',
        input: {
          attire: 10,
          modificationReason: 'Admin correction'
        }
      });

      const result = await handler(event);

      expect(mockDataAccess.updateFitShowScoreWithAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'score-1',
          attire: 10
        }),
        'Admin correction',
        true
      );
      expect(result).toEqual(updatedScore);
    });
  });

  describe('getFitShowScoreAuditHistory', () => {
    it('retrieves audit history for authorized users', async () => {
      const mockScore = {
        id: 'score-1',
        judgeId: 'judge-1',
        participantName: 'John Doe'
      };

      const mockAuditEntries = [
        {
          id: 'audit-1',
          fitShowScoreId: 'score-1',
          action: 'CREATE',
          modifiedBy: 'judge-1',
          modifiedAt: '2024-01-01T10:00:00Z',
          reason: 'Initial creation'
        },
        {
          id: 'audit-2',
          fitShowScoreId: 'score-1',
          action: 'UPDATE',
          modifiedBy: 'judge-1',
          modifiedAt: '2024-01-01T11:00:00Z',
          reason: 'Score updated'
        }
      ];

      mockDataAccess.getFitShowScore.mockResolvedValue(mockScore as any);
      mockDataAccess.getFitShowScoreAuditHistory.mockResolvedValue(mockAuditEntries as any);

      const event = mockEvent('getFitShowScoreAuditHistory', {
        fitShowScoreId: 'score-1'
      });

      const result = await handler(event);

      expect(mockDataAccess.getFitShowScoreAuditHistory).toHaveBeenCalledWith('score-1');
      expect(result).toEqual({ items: mockAuditEntries });
    });

    it('validates score access permissions', async () => {
      const mockScore = {
        id: 'score-1',
        judgeId: 'other-judge',
        participantName: 'John Doe'
      };

      mockDataAccess.getFitShowScore.mockResolvedValue(mockScore as any);

      const event = mockEvent('getFitShowScoreAuditHistory', {
        fitShowScoreId: 'score-1'
      });

      await handler(event);

      expect(mockRequireScoreAccess).toHaveBeenCalledWith(
        expect.anything(),
        'other-judge'
      );
    });

    it('throws error when score not found', async () => {
      mockDataAccess.getFitShowScore.mockResolvedValue(null);

      const event = mockEvent('getFitShowScoreAuditHistory', {
        fitShowScoreId: 'nonexistent-score'
      });

      await expect(handler(event)).rejects.toThrow('Fit and show score with ID nonexistent-score not found');
    });

    it('requires appropriate role for audit access', async () => {
      mockDataAccess.getFitShowScore.mockResolvedValue({ id: 'score-1', judgeId: 'judge-1' } as any);
      mockDataAccess.getFitShowScoreAuditHistory.mockResolvedValue([] as any);

      const event = mockEvent('getFitShowScoreAuditHistory', {
        fitShowScoreId: 'score-1'
      });

      await handler(event);

      expect(mockRequireAnyRole).toHaveBeenCalledWith(
        expect.anything(),
        ['judge', 'admin']
      );
    });
  });

  describe('finalizeFitShowScore with audit', () => {
    it('creates audit entry when finalizing score', async () => {
      const mockScore = {
        id: 'score-1',
        judgeId: 'judge-1',
        isFinalized: false
      };

      const finalizedScore = {
        ...mockScore,
        isFinalized: true
      };

      mockDataAccess.getFitShowScore.mockResolvedValue(mockScore as any);
      mockDataAccess.finalizeFitShowScore.mockResolvedValue(finalizedScore as any);

      const event = mockEvent('finalizeFitShowScore', {
        id: 'score-1'
      });

      const result = await handler(event);

      expect(mockDataAccess.finalizeFitShowScore).toHaveBeenCalledWith('score-1', 'judge-1');
      expect(result).toEqual(finalizedScore);
    });

    it('prevents finalizing already finalized scores', async () => {
      const finalizedScore = {
        id: 'score-1',
        judgeId: 'judge-1',
        isFinalized: true
      };

      mockDataAccess.getFitShowScore.mockResolvedValue(finalizedScore as any);

      const event = mockEvent('finalizeFitShowScore', {
        id: 'score-1'
      });

      await expect(handler(event)).rejects.toThrow('Fit and show score is already finalized');
    });
  });

  describe('error handling', () => {
    it('handles data access errors gracefully', async () => {
      mockDataAccess.getFitShowScoreAuditHistory.mockRejectedValue(new Error('Database error'));

      const mockScore = {
        id: 'score-1',
        judgeId: 'judge-1'
      };

      mockDataAccess.getFitShowScore.mockResolvedValue(mockScore as any);

      const event = mockEvent('getFitShowScoreAuditHistory', {
        fitShowScoreId: 'score-1'
      });

      await expect(handler(event)).rejects.toThrow();
    });

    it('validates input parameters', async () => {
      const event = mockEvent('getFitShowScoreAuditHistory', {
        // Missing fitShowScoreId
      });

      await expect(handler(event)).rejects.toThrow();
    });
  });
});