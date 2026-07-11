import { AppSyncResolverEvent } from 'aws-lambda';

// Mock the ScoreDataAccess before importing the handler
const mockScoreDataAccess = {
  createScore: jest.fn(),
  updateScore: jest.fn(),
  getScore: jest.fn(),
  getScoresByCat: jest.fn(),
  getScoresByCage: jest.fn(),
  listAllScores: jest.fn(),
  getScoresByJudge: jest.fn(),
  deleteScore: jest.fn(),
};

jest.mock('../scoreDataAccess', () => ({
  ScoreDataAccess: jest.fn().mockImplementation(() => mockScoreDataAccess),
}));

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn(),
}));

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn(),
  },
}));

// Now import the handler after mocks are set up
import { handler } from '../scoreResolver';

describe('Score Resolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockEvent = (
    fieldName: string,
    arguments_: any = {},
    userRole: string = 'judge',
    userId: string = 'judge-123'
  ): AppSyncResolverEvent<any> => ({
    info: { fieldName },
    arguments: arguments_,
    identity: {
      claims: {
        sub: userId,
        'cognito:username': 'testjudge',
        'custom:role': userRole,
        email: 'judge@example.com',
      },
    },
  } as any);

  const mockScore = {
    id: 'score-123',
    catId: 'cat-456',
    judgeId: 'judge-123',
    judgeName: 'testjudge',
    firstImpressionScore: 8,
    firstImpressionComments: 'Good cage condition',
    originalityScore: 12,
    originalityComments: 'Healthy cat',
    informationCardScore: 14,
    informationCardComments: 'Well groomed',
    workDoneByMemberScore: 13,
    workDoneByMemberComments: 'Excellent overall',
    totalScore: 83,
    timestamp: '2024-01-01T00:00:00.000Z',
    isFinalized: false,
  };

  describe('createScore', () => {
    it('should create a score successfully for judge', async () => {
      const input = {
        catId: 'cat-456',
        firstImpressionScore: 8,
        originalityScore: 12,
        informationCardScore: 14,
        workDoneByMemberScore: 13,
      };

      mockScoreDataAccess.createScore.mockResolvedValue(mockScore);

      const event = createMockEvent('createScore', { input });
      const result = await handler(event);

      expect(mockScoreDataAccess.createScore).toHaveBeenCalledWith({
        ...input,
        judgeId: 'judge-123',
        judgeName: 'judge@example.com',
      }, 'judge@example.com');
      expect(result).toEqual(mockScore);
    });

    it('should create a score successfully for admin', async () => {
      const input = {
        catId: 'cat-456',
        firstImpressionScore: 8,
        originalityScore: 12,
        informationCardScore: 14,
        workDoneByMemberScore: 13,
      };

      mockScoreDataAccess.createScore.mockResolvedValue(mockScore);

      const event = createMockEvent('createScore', { input }, 'admin');
      const result = await handler(event);

      expect(result).toEqual(mockScore);
    });

    it('should reject creation for non-judge/admin users', async () => {
      const input = {
        catId: 'cat-456',
        firstImpressionScore: 8,
        originalityScore: 12,
        informationCardScore: 14,
        workDoneByMemberScore: 13,
      };

      const event = createMockEvent('createScore', { input }, 'participant');

      await expect(handler(event)).rejects.toThrow('Forbidden: Judge role required');
      expect(mockScoreDataAccess.createScore).not.toHaveBeenCalled();
    });

    it('should validate score ranges', async () => {
      const input = {
        catId: 'cat-456',
        firstImpressionScore: 15, // Invalid: > 10
        originalityScore: 12,
        informationCardScore: 14,
        workDoneByMemberScore: 13,
      };

      const event = createMockEvent('createScore', { input });

      await expect(handler(event)).rejects.toThrow('firstImpressionScore must be between 0 and 10');
      expect(mockScoreDataAccess.createScore).not.toHaveBeenCalled();
    });

    it('should validate comment lengths', async () => {
      const input = {
        catId: 'cat-456',
        firstImpressionScore: 8,
        originalityScore: 12,
        informationCardScore: 14,
        workDoneByMemberScore: 13,
        firstImpressionComments: 'a'.repeat(501), // Too long
      };

      const event = createMockEvent('createScore', { input });

      await expect(handler(event)).rejects.toThrow('Comment must be 500 characters or less');
      expect(mockScoreDataAccess.createScore).not.toHaveBeenCalled();
    });

    it('should reject creation without authentication', async () => {
      const input = {
        catId: 'cat-456',
        firstImpressionScore: 8,
        originalityScore: 12,
        informationCardScore: 14,
        workDoneByMemberScore: 13,
      };

      const event = {
        info: { fieldName: 'createScore' },
        arguments: { input },
        identity: null,
      } as any;

      await expect(handler(event)).rejects.toThrow('Forbidden: Judge role required');
    });
  });

  describe('updateScore', () => {
    it('should update own score successfully', async () => {
      const input = { firstImpressionScore: 8 };
      const updatedScore = { ...mockScore, firstImpressionScore: 8, totalScore: 88 };

      mockScoreDataAccess.getScore.mockResolvedValue(mockScore);
      mockScoreDataAccess.updateScore.mockResolvedValue(updatedScore);

      const event = createMockEvent('updateScore', { id: 'score-123', input });
      const result = await handler(event);

      expect(mockScoreDataAccess.updateScore).toHaveBeenCalledWith('score-123', input, 'judge@example.com', false);
      expect(result).toEqual(updatedScore);
    });

    it('should allow admin to update any score', async () => {
      const input = { firstImpressionScore: 8 };
      const otherJudgeScore = { ...mockScore, judgeId: 'other-judge' };
      const updatedScore = { ...otherJudgeScore, firstImpressionScore: 8 };

      mockScoreDataAccess.getScore.mockResolvedValue(otherJudgeScore);
      mockScoreDataAccess.updateScore.mockResolvedValue(updatedScore);

      const event = createMockEvent('updateScore', { id: 'score-123', input }, 'admin');
      const result = await handler(event);

      expect(result).toEqual(updatedScore);
    });

    it('should reject updating other judge scores', async () => {
      const input = { firstImpressionScore: 8 };
      const otherJudgeScore = { ...mockScore, judgeId: 'other-judge' };

      mockScoreDataAccess.getScore.mockResolvedValue(otherJudgeScore);

      const event = createMockEvent('updateScore', { id: 'score-123', input });

      await expect(handler(event)).rejects.toThrow('Forbidden: Admin role required');
      expect(mockScoreDataAccess.updateScore).not.toHaveBeenCalled();
    });

    it('should reject updating finalized scores for non-admin', async () => {
      const input = { firstImpressionScore: 8 };
      const finalizedScore = { ...mockScore, isFinalized: true };

      mockScoreDataAccess.getScore.mockResolvedValue(finalizedScore);

      const event = createMockEvent('updateScore', { id: 'score-123', input });

      await expect(handler(event)).rejects.toThrow('Cannot modify finalized scores. Admin access required.');
      expect(mockScoreDataAccess.updateScore).not.toHaveBeenCalled();
    });

    it('should allow admin to update finalized scores', async () => {
      const input = { firstImpressionScore: 8 };
      const finalizedScore = { ...mockScore, isFinalized: true };
      const updatedScore = { ...finalizedScore, firstImpressionScore: 8 };

      mockScoreDataAccess.getScore.mockResolvedValue(finalizedScore);
      mockScoreDataAccess.updateScore.mockResolvedValue(updatedScore);

      const event = createMockEvent('updateScore', { id: 'score-123', input }, 'admin');
      const result = await handler(event);

      expect(result).toEqual(updatedScore);
    });

    it('should handle non-existent score', async () => {
      const input = { firstImpressionScore: 8 };

      mockScoreDataAccess.getScore.mockResolvedValue(null);

      const event = createMockEvent('updateScore', { id: 'nonexistent', input });

      await expect(handler(event)).rejects.toThrow('Score with ID nonexistent not found');
      expect(mockScoreDataAccess.updateScore).not.toHaveBeenCalled();
    });
  });

  describe('getScore', () => {
    it('should get own score successfully', async () => {
      mockScoreDataAccess.getScore.mockResolvedValue(mockScore);

      const event = createMockEvent('getScore', { id: 'score-123' });
      const result = await handler(event);

      expect(result).toEqual(mockScore);
    });

    it('should allow admin to get any score', async () => {
      const otherJudgeScore = { ...mockScore, judgeId: 'other-judge' };
      mockScoreDataAccess.getScore.mockResolvedValue(otherJudgeScore);

      const event = createMockEvent('getScore', { id: 'score-123' }, 'admin');
      const result = await handler(event);

      expect(result).toEqual(otherJudgeScore);
    });

    it('should reject getting other judge scores', async () => {
      const otherJudgeScore = { ...mockScore, judgeId: 'other-judge' };
      mockScoreDataAccess.getScore.mockResolvedValue(otherJudgeScore);

      const event = createMockEvent('getScore', { id: 'score-123' });

      await expect(handler(event)).rejects.toThrow('Forbidden: Admin role required');
    });

    it('should return null for non-existent score', async () => {
      mockScoreDataAccess.getScore.mockResolvedValue(null);

      const event = createMockEvent('getScore', { id: 'nonexistent' });
      const result = await handler(event);

      expect(result).toBeNull();
    });
  });

  describe('getScoresByCat', () => {
    const mockScores = [
      mockScore,
      { ...mockScore, id: 'score-456', judgeId: 'other-judge' },
    ];

    it('should return all scores for admin', async () => {
      mockScoreDataAccess.getScoresByCat.mockResolvedValue(mockScores);

      const event = createMockEvent('getScoresByCat', { catId: 'cat-456' }, 'admin');
      const result = await handler(event);

      expect(result).toEqual({ items: mockScores });
    });

    it('should filter to own scores for judge', async () => {
      mockScoreDataAccess.getScoresByCat.mockResolvedValue(mockScores);

      const event = createMockEvent('getScoresByCat', { catId: 'cat-456' });
      const result = await handler(event);

      expect(result).toEqual({ items: [mockScore] });
    });

    it('should return only finalized scores for participants', async () => {
      const finalizedScore = { ...mockScore, isFinalized: true };
      const unfinalizedScore = { ...mockScore, id: 'score-456', isFinalized: false };
      mockScoreDataAccess.getScoresByCat.mockResolvedValue([finalizedScore, unfinalizedScore]);

      const event = createMockEvent('getScoresByCat', { catId: 'cat-456' }, 'participant');
      const result = await handler(event);

      expect(result).toEqual({ items: [finalizedScore] });
    });
  });

  describe('getScoresByCage', () => {
    it('should get scores by cage number', async () => {
      mockScoreDataAccess.getScoresByCage.mockResolvedValue([mockScore]);

      const event = createMockEvent('getScoresByCage', { cageNumber: 1 }, 'admin');
      const result = await handler(event);

      expect(result).toEqual({ items: [mockScore] });
      expect(mockScoreDataAccess.getScoresByCage).toHaveBeenCalledWith(1);
    });
  });

  describe('listAllScores', () => {
    it('should list all scores for admin', async () => {
      const allScores = [mockScore, { ...mockScore, id: 'score-456' }];
      mockScoreDataAccess.listAllScores.mockResolvedValue(allScores);

      const event = createMockEvent('listAllScores', {}, 'admin');
      const result = await handler(event);

      expect(result).toEqual({ items: allScores });
    });

    it('should reject listing all scores for non-admin', async () => {
      const event = createMockEvent('listAllScores', {});

      await expect(handler(event)).rejects.toThrow('Forbidden: Admin role required');
      expect(mockScoreDataAccess.listAllScores).not.toHaveBeenCalled();
    });
  });

  describe('getScoresByJudge', () => {
    it('should get own scores', async () => {
      mockScoreDataAccess.getScoresByJudge.mockResolvedValue([mockScore]);

      const event = createMockEvent('getScoresByJudge', { judgeId: 'judge-123' });
      const result = await handler(event);

      expect(result).toEqual({ items: [mockScore] });
    });

    it('should allow admin to get any judge scores', async () => {
      mockScoreDataAccess.getScoresByJudge.mockResolvedValue([mockScore]);

      const event = createMockEvent('getScoresByJudge', { judgeId: 'other-judge' }, 'admin');
      const result = await handler(event);

      expect(result).toEqual({ items: [mockScore] });
    });

    it('should reject getting other judge scores', async () => {
      const event = createMockEvent('getScoresByJudge', { judgeId: 'other-judge' });

      await expect(handler(event)).rejects.toThrow('Forbidden: Admin role required');
      expect(mockScoreDataAccess.getScoresByJudge).not.toHaveBeenCalled();
    });
  });

  describe('finalizeScore', () => {
    it('should finalize own score', async () => {
      const finalizedScore = { ...mockScore, isFinalized: true };
      mockScoreDataAccess.getScore.mockResolvedValue(mockScore);
      mockScoreDataAccess.updateScore.mockResolvedValue(finalizedScore);

      const event = createMockEvent('finalizeScore', { id: 'score-123' });
      const result = await handler(event);

      expect(mockScoreDataAccess.updateScore).toHaveBeenCalledWith('score-123', { isFinalized: true, modificationReason: 'Score finalized' }, 'judge@example.com');
      expect(result).toEqual(finalizedScore);
    });

    it('should allow admin to finalize any score', async () => {
      const otherJudgeScore = { ...mockScore, judgeId: 'other-judge' };
      const finalizedScore = { ...otherJudgeScore, isFinalized: true };
      mockScoreDataAccess.getScore.mockResolvedValue(otherJudgeScore);
      mockScoreDataAccess.updateScore.mockResolvedValue(finalizedScore);

      const event = createMockEvent('finalizeScore', { id: 'score-123' }, 'admin');
      const result = await handler(event);

      expect(result).toEqual(finalizedScore);
    });

    it('should reject finalizing other judge scores', async () => {
      const otherJudgeScore = { ...mockScore, judgeId: 'other-judge' };
      mockScoreDataAccess.getScore.mockResolvedValue(otherJudgeScore);

      const event = createMockEvent('finalizeScore', { id: 'score-123' });

      await expect(handler(event)).rejects.toThrow('Forbidden: Admin role required');
      expect(mockScoreDataAccess.updateScore).not.toHaveBeenCalled();
    });

    it('should handle non-existent score', async () => {
      mockScoreDataAccess.getScore.mockResolvedValue(null);

      const event = createMockEvent('finalizeScore', { id: 'nonexistent' });

      await expect(handler(event)).rejects.toThrow('Score with ID nonexistent not found');
      expect(mockScoreDataAccess.updateScore).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle unknown field names', async () => {
      const event = createMockEvent('unknownField');

      await expect(handler(event)).rejects.toThrow('Unknown field: unknownField');
    });

    it('should handle data access errors', async () => {
      mockScoreDataAccess.getScore.mockRejectedValue(new Error('Database error'));

      const event = createMockEvent('getScore', { id: 'score-123' });

      await expect(handler(event)).rejects.toThrow('An unexpected error occurred. Please try again later.');
    });
  });
});