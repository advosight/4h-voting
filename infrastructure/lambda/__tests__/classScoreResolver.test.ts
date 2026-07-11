/**
 * Unit tests for classScoreResolver
 */

import { AppSyncResolverEvent } from 'aws-lambda';
import { ClassScoreDataAccess } from '../classScoreDataAccess';
import { getUserContext, requireAnyRole, getJudgeId } from '../roleValidation';
import { ValidationError, PermissionError, NotFoundError, ConflictError } from '../errorHandler';

// Mock dependencies
jest.mock('../classScoreDataAccess');
jest.mock('../roleValidation');
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

const mockClassScoreDataAccess = ClassScoreDataAccess as jest.MockedClass<typeof ClassScoreDataAccess>;
const mockGetUserContext = getUserContext as jest.MockedFunction<typeof getUserContext>;
const mockRequireAnyRole = requireAnyRole as jest.MockedFunction<typeof requireAnyRole>;
const mockGetJudgeId = getJudgeId as jest.MockedFunction<typeof getJudgeId>;

// The mock instance must exist and be wired up before the resolver module is
// imported below: the resolver constructs a module-level singleton via
// `new ClassScoreDataAccess(...)` at import time, so reassigning the mock's
// return value afterwards (e.g. in beforeEach) would never reach that singleton.
const mockDataAccess = {
  createClassScore: jest.fn(),
  updateClassScore: jest.fn(),
  getClassScore: jest.fn(),
  getClassScoresByCat: jest.fn(),
  getClassScoresByCage: jest.fn(),
  listAllClassScores: jest.fn(),
  getClassScoresByJudge: jest.fn(),
  deleteClassScore: jest.fn(),
  finalizeClassScore: jest.fn(),
  getClassScoreAuditHistory: jest.fn(),
} as any;
mockClassScoreDataAccess.mockImplementation(() => mockDataAccess);

// Import the handler after all mocks above are configured.
import { handler } from '../classScoreResolver';

describe('classScoreResolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockGetUserContext.mockReturnValue({
      userId: 'user-123',
      role: 'judge',
      email: 'judge@example.com',
      claims: { 'cognito:username': 'judge123' },
      permissions: { cageScoring: true, classScoring: true, fitShowScoring: true }
    });
    mockRequireAnyRole.mockImplementation(() => {});
    mockGetJudgeId.mockReturnValue('judge-123');
  });

  describe('createClassScore', () => {
    const validInput = {
      catId: 'cat-123',
      beautyScore: 12,
      beautyComments: 'Beautiful cat',
      personalityScore: 18,
      personalityComments: 'Very friendly',
      balanceProportionScore: 13,
      balanceProportionComments: 'Well proportioned',
      coatCleanGroomed: true,
      teethGumsHealthy: true,
      eyesNoseClear: true,
      earsCleanMiteFree: true,
      toenailsClipped: true,
      fleaIssues: false,
      healthGroomingComments: 'Cat appears healthy',
      isFinalized: false
    };

    const mockEvent: AppSyncResolverEvent<{ input: any }> = {
      info: { fieldName: 'createClassScore' },
      arguments: { input: validInput }
    } as any;

    it('should create a class score successfully', async () => {
      const expectedScore = {
        id: 'score-123',
        ...validInput,
        judgeId: 'judge-123',
        judgeName: 'judge@example.com',
        totalScore: 43,
        ribbonEligibility: 'Red',
        modificationCount: 0,
        timestamp: '2023-01-01T00:00:00.000Z'
      };

      mockDataAccess.createClassScore.mockResolvedValue(expectedScore);

      const result = await handler(mockEvent);

      expect(mockRequireAnyRole).toHaveBeenCalledWith(expect.any(Object), ['judge', 'admin']);
      expect(mockGetJudgeId).toHaveBeenCalled();
      expect(mockDataAccess.createClassScore).toHaveBeenCalledWith({
        ...validInput,
        judgeId: 'judge-123',
        judgeName: 'judge@example.com'
      });
      expect(result).toEqual(expectedScore);
    });

    it('should validate beauty score range (0-15)', async () => {
      const invalidInput = { ...validInput, beautyScore: 20 };
      const event = { ...mockEvent, arguments: { input: invalidInput } };

      await expect(handler(event)).rejects.toThrow(ValidationError);
      expect(mockDataAccess.createClassScore).not.toHaveBeenCalled();
    });

    it('should validate personality score range (0-20)', async () => {
      const invalidInput = { ...validInput, personalityScore: 25 };
      const event = { ...mockEvent, arguments: { input: invalidInput } };

      await expect(handler(event)).rejects.toThrow(ValidationError);
      expect(mockDataAccess.createClassScore).not.toHaveBeenCalled();
    });

    it('should validate balance/proportion score range (0-15)', async () => {
      const invalidInput = { ...validInput, balanceProportionScore: 18 };
      const event = { ...mockEvent, arguments: { input: invalidInput } };

      await expect(handler(event)).rejects.toThrow(ValidationError);
      expect(mockDataAccess.createClassScore).not.toHaveBeenCalled();
    });

    it('should validate comment lengths', async () => {
      const longComment = 'a'.repeat(501);
      const invalidInput = { ...validInput, beautyComments: longComment };
      const event = { ...mockEvent, arguments: { input: invalidInput } };

      await expect(handler(event)).rejects.toThrow(ValidationError);
      expect(mockDataAccess.createClassScore).not.toHaveBeenCalled();
    });

    it('should validate health comment length (1000 chars)', async () => {
      const longComment = 'a'.repeat(1001);
      const invalidInput = { ...validInput, healthGroomingComments: longComment };
      const event = { ...mockEvent, arguments: { input: invalidInput } };

      await expect(handler(event)).rejects.toThrow(ValidationError);
      expect(mockDataAccess.createClassScore).not.toHaveBeenCalled();
    });

    it('should validate boolean health fields', async () => {
      const invalidInput = { ...validInput, coatCleanGroomed: 'true' as any };
      const event = { ...mockEvent, arguments: { input: invalidInput } };

      await expect(handler(event)).rejects.toThrow(ValidationError);
      expect(mockDataAccess.createClassScore).not.toHaveBeenCalled();
    });

    it('should throw error when judge ID cannot be determined', async () => {
      mockGetJudgeId.mockReturnValue(null);

      await expect(handler(mockEvent)).rejects.toThrow(ValidationError);
      expect(mockDataAccess.createClassScore).not.toHaveBeenCalled();
    });
  });

  describe('updateClassScore', () => {
    const updateInput = {
      beautyScore: 14,
      personalityScore: 19
    };

    const mockEvent: AppSyncResolverEvent<{ id: string; input: any }> = {
      info: { fieldName: 'updateClassScore' },
      arguments: { id: 'score-123', input: updateInput }
    } as any;

    const existingScore = {
      id: 'score-123',
      catId: 'cat-123',
      judgeId: 'judge-123',
      judgeName: 'Judge Smith',
      beautyScore: 12,
      beautyComments: 'Beautiful cat',
      personalityScore: 18,
      personalityComments: 'Very friendly',
      balanceProportionScore: 13,
      balanceProportionComments: 'Well proportioned',
      coatCleanGroomed: true,
      teethGumsHealthy: true,
      eyesNoseClear: true,
      earsCleanMiteFree: true,
      toenailsClipped: true,
      fleaIssues: false,
      healthGroomingComments: 'Cat appears healthy',
      totalScore: 43,
      ribbonEligibility: 'Red',
      modificationCount: 0,
      timestamp: '2023-01-01T00:00:00.000Z',
      isFinalized: false
    };

    it('should update a class score successfully', async () => {
      const updatedScore = { ...existingScore, ...updateInput, totalScore: 46 };

      mockDataAccess.getClassScore.mockResolvedValue(existingScore);
      mockDataAccess.updateClassScore.mockResolvedValue(updatedScore);

      const result = await handler(mockEvent);

      expect(mockRequireAnyRole).toHaveBeenCalledWith(expect.any(Object), ['judge', 'admin']);
      expect(mockDataAccess.getClassScore).toHaveBeenCalledWith('score-123');
      expect(mockDataAccess.updateClassScore).toHaveBeenCalledWith('score-123', updateInput, 'judge@example.com', false);
      expect(result).toEqual(updatedScore);
    });

    it('should throw error when class score not found', async () => {
      mockDataAccess.getClassScore.mockResolvedValue(null);

      await expect(handler(mockEvent)).rejects.toThrow(NotFoundError);
      expect(mockDataAccess.updateClassScore).not.toHaveBeenCalled();
    });

    it('should prevent modification of finalized scores by non-admin', async () => {
      const finalizedScore = { ...existingScore, isFinalized: true };
      mockDataAccess.getClassScore.mockResolvedValue(finalizedScore);

      await expect(handler(mockEvent)).rejects.toThrow(PermissionError);
      expect(mockDataAccess.updateClassScore).not.toHaveBeenCalled();
    });

    it('should allow admin to modify finalized scores', async () => {
      const finalizedScore = { ...existingScore, isFinalized: true };
      const updatedScore = { ...finalizedScore, ...updateInput };

      mockGetUserContext.mockReturnValue({ 
        userId: 'admin-123',
        role: 'admin', 
        email: 'admin@example.com',
        claims: {},
        permissions: { cageScoring: true, classScoring: true, fitShowScoring: true }
      });
      mockDataAccess.getClassScore.mockResolvedValue(finalizedScore);
      mockDataAccess.updateClassScore.mockResolvedValue(updatedScore);

      const result = await handler(mockEvent);

      expect(result).toEqual(updatedScore);
    });
  });

  describe('getClassScore', () => {
    const mockEvent: AppSyncResolverEvent<{ id: string }> = {
      info: { fieldName: 'getClassScore' },
      arguments: { id: 'score-123' }
    } as any;

    const existingScore = {
      id: 'score-123',
      catId: 'cat-123',
      judgeId: 'judge-123',
      judgeName: 'Judge Smith',
      beautyScore: 12,
      beautyComments: 'Beautiful cat',
      personalityScore: 18,
      personalityComments: 'Very friendly',
      balanceProportionScore: 13,
      balanceProportionComments: 'Well proportioned',
      coatCleanGroomed: true,
      teethGumsHealthy: true,
      eyesNoseClear: true,
      earsCleanMiteFree: true,
      toenailsClipped: true,
      fleaIssues: false,
      healthGroomingComments: 'Cat appears healthy',
      totalScore: 43,
      ribbonEligibility: 'Red',
      modificationCount: 0,
      timestamp: '2023-01-01T00:00:00.000Z',
      isFinalized: true
    };

    it('should return class score for admin', async () => {
      mockGetUserContext.mockReturnValue({ 
        userId: 'admin-123',
        role: 'admin', 
        email: 'admin@example.com',
        claims: {},
        permissions: { cageScoring: true, classScoring: true, fitShowScoring: true }
      });
      mockDataAccess.getClassScore.mockResolvedValue(existingScore);

      const result = await handler(mockEvent);

      expect(result).toEqual(existingScore);
    });

    it('should return class score for owning judge', async () => {
      mockDataAccess.getClassScore.mockResolvedValue(existingScore);

      const result = await handler(mockEvent);

      expect(result).toEqual(existingScore);
    });

    it('should return finalized score for participant', async () => {
      mockGetUserContext.mockReturnValue({ 
        userId: 'participant-123',
        role: 'participant', 
        email: 'participant@example.com',
        claims: {},
        permissions: { cageScoring: true, classScoring: true, fitShowScoring: true }
      });
      mockDataAccess.getClassScore.mockResolvedValue(existingScore);

      const result = await handler(mockEvent);

      expect(result).toEqual(existingScore);
    });

    it('should prevent participant from viewing non-finalized score', async () => {
      const nonFinalizedScore = { ...existingScore, isFinalized: false };
      mockGetUserContext.mockReturnValue({ 
        userId: 'participant-123',
        role: 'participant', 
        email: 'participant@example.com',
        claims: {},
        permissions: { cageScoring: true, classScoring: true, fitShowScoring: true }
      });
      mockDataAccess.getClassScore.mockResolvedValue(nonFinalizedScore);

      await expect(handler(mockEvent)).rejects.toThrow(PermissionError);
    });

    it('should return null when score not found', async () => {
      mockDataAccess.getClassScore.mockResolvedValue(null);

      const result = await handler(mockEvent);

      expect(result).toBeNull();
    });
  });

  describe('getClassScoresByCat', () => {
    const mockEvent: AppSyncResolverEvent<{ catId: string }> = {
      info: { fieldName: 'getClassScoresByCat' },
      arguments: { catId: 'cat-123' }
    } as any;

    const mockScores = [
      {
        id: 'score-1',
        catId: 'cat-123',
        judgeId: 'judge-123',
        judgeName: 'Judge Smith',
        beautyScore: 12,
        beautyComments: 'Beautiful cat',
        personalityScore: 18,
        personalityComments: 'Very friendly',
        balanceProportionScore: 13,
        balanceProportionComments: 'Well proportioned',
        coatCleanGroomed: true,
        teethGumsHealthy: true,
        eyesNoseClear: true,
        earsCleanMiteFree: true,
        toenailsClipped: true,
        fleaIssues: false,
        healthGroomingComments: 'Cat appears healthy',
        totalScore: 43,
        ribbonEligibility: 'Red',
        modificationCount: 0,
        timestamp: '2023-01-01T00:00:00.000Z',
        isFinalized: true
      },
      {
        id: 'score-2',
        catId: 'cat-123',
        judgeId: 'judge-456',
        judgeName: 'Judge Jones',
        beautyScore: 15,
        beautyComments: 'Excellent appearance',
        personalityScore: 20,
        personalityComments: 'Outstanding personality',
        balanceProportionScore: 12,
        balanceProportionComments: 'Good proportions',
        coatCleanGroomed: true,
        teethGumsHealthy: true,
        eyesNoseClear: true,
        earsCleanMiteFree: true,
        toenailsClipped: true,
        fleaIssues: false,
        healthGroomingComments: 'Excellent health',
        totalScore: 47,
        ribbonEligibility: 'Blue',
        modificationCount: 0,
        timestamp: '2023-01-01T01:00:00.000Z',
        isFinalized: false
      }
    ];

    it('should return all scores for admin', async () => {
      mockGetUserContext.mockReturnValue({ 
        userId: 'admin-123',
        role: 'admin', 
        email: 'admin@example.com',
        claims: {},
        permissions: { cageScoring: true, classScoring: true, fitShowScoring: true }
      });
      mockDataAccess.getClassScoresByCat.mockResolvedValue(mockScores);

      const result = await handler(mockEvent);

      expect(result).toEqual({ items: mockScores });
    });

    it('should return only own scores for judge', async () => {
      mockDataAccess.getClassScoresByCat.mockResolvedValue(mockScores);

      const result = await handler(mockEvent);

      expect(result).toEqual({ items: [mockScores[0]] }); // Only judge-123's score
    });

    it('should return only finalized scores for participant', async () => {
      mockGetUserContext.mockReturnValue({ 
        userId: 'participant-123',
        role: 'participant', 
        email: 'participant@example.com',
        claims: {},
        permissions: { cageScoring: true, classScoring: true, fitShowScoring: true }
      });
      mockDataAccess.getClassScoresByCat.mockResolvedValue(mockScores);

      const result = await handler(mockEvent);

      expect(result).toEqual({ items: [mockScores[0]] }); // Only finalized score
    });
  });

  describe('finalizeClassScore', () => {
    const mockEvent: AppSyncResolverEvent<{ id: string }> = {
      info: { fieldName: 'finalizeClassScore' },
      arguments: { id: 'score-123' }
    } as any;

    const existingScore = {
      id: 'score-123',
      catId: 'cat-123',
      judgeId: 'judge-123',
      judgeName: 'Judge Smith',
      beautyScore: 12,
      beautyComments: 'Beautiful cat',
      personalityScore: 18,
      personalityComments: 'Very friendly',
      balanceProportionScore: 13,
      balanceProportionComments: 'Well proportioned',
      coatCleanGroomed: true,
      teethGumsHealthy: true,
      eyesNoseClear: true,
      earsCleanMiteFree: true,
      toenailsClipped: true,
      fleaIssues: false,
      healthGroomingComments: 'Cat appears healthy',
      totalScore: 43,
      ribbonEligibility: 'Red',
      modificationCount: 0,
      timestamp: '2023-01-01T00:00:00.000Z',
      isFinalized: false
    };

    it('should finalize a class score successfully', async () => {
      const finalizedScore = { ...existingScore, isFinalized: true };

      mockDataAccess.getClassScore.mockResolvedValue(existingScore);
      mockDataAccess.finalizeClassScore.mockResolvedValue(finalizedScore);

      const result = await handler(mockEvent);

      expect(mockDataAccess.getClassScore).toHaveBeenCalledWith('score-123');
      expect(mockDataAccess.finalizeClassScore).toHaveBeenCalledWith('score-123', 'judge@example.com');
      expect(result).toEqual(finalizedScore);
    });

    it('should throw error when class score not found', async () => {
      mockDataAccess.getClassScore.mockResolvedValue(null);

      await expect(handler(mockEvent)).rejects.toThrow(NotFoundError);
      expect(mockDataAccess.finalizeClassScore).not.toHaveBeenCalled();
    });

    it('should throw error when score is already finalized', async () => {
      const alreadyFinalizedScore = { ...existingScore, isFinalized: true };
      mockDataAccess.getClassScore.mockResolvedValue(alreadyFinalizedScore);

      await expect(handler(mockEvent)).rejects.toThrow(ConflictError);
      expect(mockDataAccess.finalizeClassScore).not.toHaveBeenCalled();
    });
  });

  describe('listAllClassScores', () => {
    const mockEvent: AppSyncResolverEvent<{}> = {
      info: { fieldName: 'listAllClassScores' },
      arguments: {}
    } as any;

    it('should require judge or admin role', async () => {
      mockDataAccess.listAllClassScores.mockResolvedValue([]);

      await handler(mockEvent);

      expect(mockRequireAnyRole).toHaveBeenCalledWith(expect.any(Object), ['judge', 'admin']);
    });

    it('should list all class scores for the leaderboard', async () => {
      const scores = [{ id: 'score-123' }, { id: 'score-456' }];
      mockDataAccess.listAllClassScores.mockResolvedValue(scores);

      const result = await handler(mockEvent);

      expect(result).toEqual({ items: scores });
    });
  });

  describe('unknown field', () => {
    it('should throw error for unknown field', async () => {
      const mockEvent: AppSyncResolverEvent<any> = {
        info: { fieldName: 'unknownField' },
        arguments: {}
      } as any;

      await expect(handler(mockEvent)).rejects.toThrow(ValidationError);
    });
  });
});