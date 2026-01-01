"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const roleValidation_1 = require("../roleValidation");
describe('roleValidation', () => {
    const mockAdminEvent = {
        identity: {
            claims: {
                sub: 'admin-123',
                'cognito:username': 'admin',
                email: '4h-leader@example.com',
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
            const result = (0, roleValidation_1.getUserContext)(mockAdminEvent);
            expect(result).toEqual({
                userId: 'admin-123',
                email: '4h-leader@example.com',
                role: 'admin',
                judgeId: undefined,
                claims: mockAdminEvent.identity.claims,
            });
        });
        it('should extract judge user context correctly', () => {
            const result = (0, roleValidation_1.getUserContext)(mockJudgeEvent);
            expect(result).toEqual({
                userId: 'judge-123',
                email: 'judge@example.com',
                role: 'judge',
                judgeId: 'JUDGE_001',
                claims: mockJudgeEvent.identity.claims,
            });
        });
        it('should extract participant user context correctly', () => {
            const result = (0, roleValidation_1.getUserContext)(mockParticipantEvent);
            expect(result).toEqual({
                userId: 'participant-123',
                email: 'participant@example.com',
                role: 'participant',
                judgeId: undefined,
                claims: mockParticipantEvent.identity.claims,
            });
        });
        it('should return null for invalid event', () => {
            const result = (0, roleValidation_1.getUserContext)(mockInvalidEvent);
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
            const result = (0, roleValidation_1.getUserContext)(eventWithJudgeId);
            expect(result?.role).toBe('judge');
            expect(result?.judgeId).toBe('JUDGE_002');
        });
    });
    describe('hasRole', () => {
        it('should return true for admin user with any role', () => {
            const userContext = (0, roleValidation_1.getUserContext)(mockAdminEvent);
            expect((0, roleValidation_1.hasRole)(userContext, 'judge')).toBe(true);
            expect((0, roleValidation_1.hasRole)(userContext, 'participant')).toBe(true);
            expect((0, roleValidation_1.hasRole)(userContext, 'admin')).toBe(true);
        });
        it('should return true for matching role', () => {
            const userContext = (0, roleValidation_1.getUserContext)(mockJudgeEvent);
            expect((0, roleValidation_1.hasRole)(userContext, 'judge')).toBe(true);
        });
        it('should return false for non-matching role', () => {
            const userContext = (0, roleValidation_1.getUserContext)(mockJudgeEvent);
            expect((0, roleValidation_1.hasRole)(userContext, 'participant')).toBe(false);
        });
        it('should return false for null user context', () => {
            expect((0, roleValidation_1.hasRole)(null, 'admin')).toBe(false);
        });
    });
    describe('hasAnyRole', () => {
        it('should return true for admin user with any roles', () => {
            const userContext = (0, roleValidation_1.getUserContext)(mockAdminEvent);
            expect((0, roleValidation_1.hasAnyRole)(userContext, ['judge', 'participant'])).toBe(true);
        });
        it('should return true for matching role in array', () => {
            const userContext = (0, roleValidation_1.getUserContext)(mockJudgeEvent);
            expect((0, roleValidation_1.hasAnyRole)(userContext, ['judge', 'admin'])).toBe(true);
        });
        it('should return false for non-matching roles', () => {
            const userContext = (0, roleValidation_1.getUserContext)(mockParticipantEvent);
            expect((0, roleValidation_1.hasAnyRole)(userContext, ['judge', 'admin'])).toBe(false);
        });
        it('should return false for null user context', () => {
            expect((0, roleValidation_1.hasAnyRole)(null, ['admin', 'judge'])).toBe(false);
        });
    });
    describe('requireRole', () => {
        it('should not throw for admin user with any role', () => {
            const userContext = (0, roleValidation_1.getUserContext)(mockAdminEvent);
            expect(() => (0, roleValidation_1.requireRole)(userContext, 'judge')).not.toThrow();
        });
        it('should not throw for matching role', () => {
            const userContext = (0, roleValidation_1.getUserContext)(mockJudgeEvent);
            expect(() => (0, roleValidation_1.requireRole)(userContext, 'judge')).not.toThrow();
        });
        it('should throw for non-matching role', () => {
            const userContext = (0, roleValidation_1.getUserContext)(mockParticipantEvent);
            expect(() => (0, roleValidation_1.requireRole)(userContext, 'judge')).toThrow('Access denied. Required role: judge, current role: participant');
        });
        it('should throw for null user context', () => {
            expect(() => (0, roleValidation_1.requireRole)(null, 'admin')).toThrow('Access denied. Required role: admin, current role: unknown');
        });
    });
    describe('requireAnyRole', () => {
        it('should not throw for admin user with any roles', () => {
            const userContext = (0, roleValidation_1.getUserContext)(mockAdminEvent);
            expect(() => (0, roleValidation_1.requireAnyRole)(userContext, ['judge', 'participant'])).not.toThrow();
        });
        it('should not throw for matching role in array', () => {
            const userContext = (0, roleValidation_1.getUserContext)(mockJudgeEvent);
            expect(() => (0, roleValidation_1.requireAnyRole)(userContext, ['judge', 'admin'])).not.toThrow();
        });
        it('should throw for non-matching roles', () => {
            const userContext = (0, roleValidation_1.getUserContext)(mockParticipantEvent);
            expect(() => (0, roleValidation_1.requireAnyRole)(userContext, ['judge', 'admin'])).toThrow('Access denied. Required roles: judge or admin, current role: participant');
        });
        it('should throw for null user context', () => {
            expect(() => (0, roleValidation_1.requireAnyRole)(null, ['admin', 'judge'])).toThrow('Access denied. Required roles: admin or judge, current role: unknown');
        });
    });
    describe('getJudgeId', () => {
        it('should return judgeId for judge user', () => {
            const userContext = (0, roleValidation_1.getUserContext)(mockJudgeEvent);
            expect((0, roleValidation_1.getJudgeId)(userContext)).toBe('JUDGE_001');
        });
        it('should return userId for admin user without judgeId', () => {
            const userContext = (0, roleValidation_1.getUserContext)(mockAdminEvent);
            expect((0, roleValidation_1.getJudgeId)(userContext)).toBe('admin-123');
        });
        it('should return null for participant user', () => {
            const userContext = (0, roleValidation_1.getUserContext)(mockParticipantEvent);
            expect((0, roleValidation_1.getJudgeId)(userContext)).toBeNull();
        });
        it('should return null for null user context', () => {
            expect((0, roleValidation_1.getJudgeId)(null)).toBeNull();
        });
    });
    describe('canAccessScore', () => {
        it('should return true for admin user', () => {
            const userContext = (0, roleValidation_1.getUserContext)(mockAdminEvent);
            expect((0, roleValidation_1.canAccessScore)(userContext, 'any-judge-id')).toBe(true);
        });
        it('should return true for judge accessing their own score', () => {
            const userContext = (0, roleValidation_1.getUserContext)(mockJudgeEvent);
            expect((0, roleValidation_1.canAccessScore)(userContext, 'JUDGE_001')).toBe(true);
        });
        it('should return false for judge accessing another judge\'s score', () => {
            const userContext = (0, roleValidation_1.getUserContext)(mockJudgeEvent);
            expect((0, roleValidation_1.canAccessScore)(userContext, 'JUDGE_002')).toBe(false);
        });
        it('should return false for participant user', () => {
            const userContext = (0, roleValidation_1.getUserContext)(mockParticipantEvent);
            expect((0, roleValidation_1.canAccessScore)(userContext, 'any-judge-id')).toBe(false);
        });
        it('should return false for null user context', () => {
            expect((0, roleValidation_1.canAccessScore)(null, 'any-judge-id')).toBe(false);
        });
    });
    describe('requireScoreAccess', () => {
        it('should not throw for admin user', () => {
            const userContext = (0, roleValidation_1.getUserContext)(mockAdminEvent);
            expect(() => (0, roleValidation_1.requireScoreAccess)(userContext, 'any-judge-id')).not.toThrow();
        });
        it('should not throw for judge accessing their own score', () => {
            const userContext = (0, roleValidation_1.getUserContext)(mockJudgeEvent);
            expect(() => (0, roleValidation_1.requireScoreAccess)(userContext, 'JUDGE_001')).not.toThrow();
        });
        it('should throw for judge accessing another judge\'s score', () => {
            const userContext = (0, roleValidation_1.getUserContext)(mockJudgeEvent);
            expect(() => (0, roleValidation_1.requireScoreAccess)(userContext, 'JUDGE_002')).toThrow('Access denied. You can only access your own scores.');
        });
        it('should throw for participant user', () => {
            const userContext = (0, roleValidation_1.getUserContext)(mockParticipantEvent);
            expect(() => (0, roleValidation_1.requireScoreAccess)(userContext, 'any-judge-id')).toThrow('Access denied. You can only access your own scores.');
        });
        it('should throw for null user context', () => {
            expect(() => (0, roleValidation_1.requireScoreAccess)(null, 'any-judge-id')).toThrow('Access denied. You can only access your own scores.');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9sZVZhbGlkYXRpb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJvbGVWYWxpZGF0aW9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxzREFVMkI7QUFFM0IsUUFBUSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtJQUM5QixNQUFNLGNBQWMsR0FBRztRQUNyQixRQUFRLEVBQUU7WUFDUixNQUFNLEVBQUU7Z0JBQ04sR0FBRyxFQUFFLFdBQVc7Z0JBQ2hCLGtCQUFrQixFQUFFLE9BQU87Z0JBQzNCLEtBQUssRUFBRSx1QkFBdUI7YUFDL0I7U0FDRjtLQUNGLENBQUM7SUFFRixNQUFNLGNBQWMsR0FBRztRQUNyQixRQUFRLEVBQUU7WUFDUixNQUFNLEVBQUU7Z0JBQ04sR0FBRyxFQUFFLFdBQVc7Z0JBQ2hCLGtCQUFrQixFQUFFLFFBQVE7Z0JBQzVCLEtBQUssRUFBRSxtQkFBbUI7Z0JBQzFCLGFBQWEsRUFBRSxPQUFPO2dCQUN0QixnQkFBZ0IsRUFBRSxXQUFXO2FBQzlCO1NBQ0Y7S0FDRixDQUFDO0lBRUYsTUFBTSxvQkFBb0IsR0FBRztRQUMzQixRQUFRLEVBQUU7WUFDUixNQUFNLEVBQUU7Z0JBQ04sR0FBRyxFQUFFLGlCQUFpQjtnQkFDdEIsa0JBQWtCLEVBQUUsY0FBYztnQkFDbEMsS0FBSyxFQUFFLHlCQUF5QjtnQkFDaEMsYUFBYSxFQUFFLGFBQWE7YUFDN0I7U0FDRjtLQUNGLENBQUM7SUFFRixNQUFNLGdCQUFnQixHQUFHO1FBQ3ZCLFFBQVEsRUFBRSxJQUFJO0tBQ2YsQ0FBQztJQUVGLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7UUFDOUIsRUFBRSxDQUFDLDZDQUE2QyxFQUFFLEdBQUcsRUFBRTtZQUNyRCxNQUFNLE1BQU0sR0FBRyxJQUFBLCtCQUFjLEVBQUMsY0FBYyxDQUFDLENBQUM7WUFFOUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQztnQkFDckIsTUFB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QUFNLFdBQVcsR0FBRyxJQUFBLCtCQUFjLEVBQUMsY0FBYyxDQUFDLENBQUM7WUFDbkQsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUEsbUNBQWtCLEVBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLHFEQUFxRCxDQUFDLENBQUM7UUFDNUgsQ0FBQyxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsbUNBQW1DLEVBQUUsR0FBRyxFQUFFO1lBQzNDLE1BQU0sV0FBVyxHQUFHLElBQUEsK0JBQWMsRUFBQyxvQkFBb0IsQ0FBQyxDQUFDO1lBQ3pELE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFBLG1DQUFrQixFQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxxREFBcUQsQ0FBQyxDQUFDO1FBQy9ILENBQUMsQ0FBQyxDQUFDO1FBRUgsRUFBRSxDQUFDLG9DQUFvQyxFQUFFLEdBQUcsRUFBRTtZQUM1QyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBQSxtQ0FBa0IsRUFBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMscURBQXFELENBQUMsQ0FBQztRQUN4SCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBnZXRVc2VyQ29udGV4dCxcbiAgaGFzUm9sZSxcbiAgaGFzQW55Um9sZSxcbiAgcmVxdWlyZVJvbGUsXG4gIHJlcXVpcmVBbnlSb2xlLFxuICBnZXRKdWRnZUlkLFxuICBjYW5BY2Nlc3NTY29yZSxcbiAgcmVxdWlyZVNjb3JlQWNjZXNzLFxuICBVc2VyQ29udGV4dCxcbn0gZnJvbSAnLi4vcm9sZVZhbGlkYXRpb24nO1xuXG5kZXNjcmliZSgncm9sZVZhbGlkYXRpb24nLCAoKSA9PiB7XG4gIGNvbnN0IG1vY2tBZG1pbkV2ZW50ID0ge1xuICAgIGlkZW50aXR5OiB7XG4gICAgICBjbGFpbXM6IHtcbiAgICAgICAgc3ViOiAnYWRtaW4tMTIzJyxcbiAgICAgICAgJ2NvZ25pdG86dXNlcm5hbWUnOiAnYWRtaW4nLFxuICAgICAgICBlbWFpbDogJzRoLWxlYWRlckBleGFtcGxlLmNvbScsXG4gICAgICB9LFxuICAgIH0sXG4gIH07XG5cbiAgY29uc3QgbW9ja0p1ZGdlRXZlbnQgPSB7XG4gICAgaWRlbnRpdHk6IHtcbiAgICAgIGNsYWltczoge1xuICAgICAgICBzdWI6ICdqdWRnZS0xMjMnLFxuICAgICAgICAnY29nbml0bzp1c2VybmFtZSc6ICdqdWRnZTEnLFxuICAgICAgICBlbWFpbDogJ2p1ZGdlQGV4YW1wbGUuY29tJyxcbiAgICAgICAgJ2N1c3RvbTpyb2xlJzogJ2p1ZGdlJyxcbiAgICAgICAgJ2N1c3RvbTpqdWRnZUlkJzogJ0pVREdFXzAwMScsXG4gICAgICB9LFxuICAgIH0sXG4gIH07XG5cbiAgY29uc3QgbW9ja1BhcnRpY2lwYW50RXZlbnQgPSB7XG4gICAgaWRlbnRpdHk6IHtcbiAgICAgIGNsYWltczoge1xuICAgICAgICBzdWI6ICdwYXJ0aWNpcGFudC0xMjMnLFxuICAgICAgICAnY29nbml0bzp1c2VybmFtZSc6ICdwYXJ0aWNpcGFudDEnLFxuICAgICAgICBlbWFpbDogJ3BhcnRpY2lwYW50QGV4YW1wbGUuY29tJyxcbiAgICAgICAgJ2N1c3RvbTpyb2xlJzogJ3BhcnRpY2lwYW50JyxcbiAgICAgIH0sXG4gICAgfSxcbiAgfTtcblxuICBjb25zdCBtb2NrSW52YWxpZEV2ZW50ID0ge1xuICAgIGlkZW50aXR5OiBudWxsLFxuICB9O1xuXG4gIGRlc2NyaWJlKCdnZXRVc2VyQ29udGV4dCcsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIGV4dHJhY3QgYWRtaW4gdXNlciBjb250ZXh0IGNvcnJlY3RseScsICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGdldFVzZXJDb250ZXh0KG1vY2tBZG1pbkV2ZW50KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdCkudG9FcXVhbCh7XG4gICAgICAgIHVzZXJJZDogJ2FkbWluLTEyMycsXG4gICAgICAgIGVtYWlsOiAnNGgtbGVhZGVyQGV4YW1wbGUuY29tJyxcbiAgICAgICAgcm9sZTogJ2FkbWluJyxcbiAgICAgICAganVkZ2VJZDogdW5kZWZpbmVkLFxuICAgICAgICBjbGFpbXM6IG1vY2tBZG1pbkV2ZW50LmlkZW50aXR5LmNsYWltcyxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBleHRyYWN0IGp1ZGdlIHVzZXIgY29udGV4dCBjb3JyZWN0bHknLCAoKSA9PiB7XG4gICAgICBjb25zdCByZXN1bHQgPSBnZXRVc2VyQ29udGV4dChtb2NrSnVkZ2VFdmVudCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvRXF1YWwoe1xuICAgICAgICB1c2VySWQ6ICdqdWRnZS0xMjMnLFxuICAgICAgICBlbWFpbDogJ2p1ZGdlQGV4YW1wbGUuY29tJyxcbiAgICAgICAgcm9sZTogJ2p1ZGdlJyxcbiAgICAgICAganVkZ2VJZDogJ0pVREdFXzAwMScsXG4gICAgICAgIGNsYWltczogbW9ja0p1ZGdlRXZlbnQuaWRlbnRpdHkuY2xhaW1zLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGV4dHJhY3QgcGFydGljaXBhbnQgdXNlciBjb250ZXh0IGNvcnJlY3RseScsICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGdldFVzZXJDb250ZXh0KG1vY2tQYXJ0aWNpcGFudEV2ZW50KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdCkudG9FcXVhbCh7XG4gICAgICAgIHVzZXJJZDogJ3BhcnRpY2lwYW50LTEyMycsXG4gICAgICAgIGVtYWlsOiAncGFydGljaXBhbnRAZXhhbXBsZS5jb20nLFxuICAgICAgICByb2xlOiAncGFydGljaXBhbnQnLFxuICAgICAgICBqdWRnZUlkOiB1bmRlZmluZWQsXG4gICAgICAgIGNsYWltczogbW9ja1BhcnRpY2lwYW50RXZlbnQuaWRlbnRpdHkuY2xhaW1zLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHJldHVybiBudWxsIGZvciBpbnZhbGlkIGV2ZW50JywgKCkgPT4ge1xuICAgICAgY29uc3QgcmVzdWx0ID0gZ2V0VXNlckNvbnRleHQobW9ja0ludmFsaWRFdmVudCk7XG4gICAgICBleHBlY3QocmVzdWx0KS50b0JlTnVsbCgpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBoYW5kbGUgdXNlciB3aXRoIGp1ZGdlSWQgYnV0IG5vIHJvbGUnLCAoKSA9PiB7XG4gICAgICBjb25zdCBldmVudFdpdGhKdWRnZUlkID0ge1xuICAgICAgICBpZGVudGl0eToge1xuICAgICAgICAgIGNsYWltczoge1xuICAgICAgICAgICAgc3ViOiAnanVkZ2UtNDU2JyxcbiAgICAgICAgICAgIGVtYWlsOiAnanVkZ2UyQGV4YW1wbGUuY29tJyxcbiAgICAgICAgICAgICdjdXN0b206anVkZ2VJZCc6ICdKVURHRV8wMDInLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9O1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBnZXRVc2VyQ29udGV4dChldmVudFdpdGhKdWRnZUlkKTtcblxuICAgICAgZXhwZWN0KHJlc3VsdD8ucm9sZSkudG9CZSgnanVkZ2UnKTtcbiAgICAgIGV4cGVjdChyZXN1bHQ/Lmp1ZGdlSWQpLnRvQmUoJ0pVREdFXzAwMicpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnaGFzUm9sZScsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIHJldHVybiB0cnVlIGZvciBhZG1pbiB1c2VyIHdpdGggYW55IHJvbGUnLCAoKSA9PiB7XG4gICAgICBjb25zdCB1c2VyQ29udGV4dCA9IGdldFVzZXJDb250ZXh0KG1vY2tBZG1pbkV2ZW50KTtcbiAgICAgIGV4cGVjdChoYXNSb2xlKHVzZXJDb250ZXh0LCAnanVkZ2UnKSkudG9CZSh0cnVlKTtcbiAgICAgIGV4cGVjdChoYXNSb2xlKHVzZXJDb250ZXh0LCAncGFydGljaXBhbnQnKSkudG9CZSh0cnVlKTtcbiAgICAgIGV4cGVjdChoYXNSb2xlKHVzZXJDb250ZXh0LCAnYWRtaW4nKSkudG9CZSh0cnVlKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmV0dXJuIHRydWUgZm9yIG1hdGNoaW5nIHJvbGUnLCAoKSA9PiB7XG4gICAgICBjb25zdCB1c2VyQ29udGV4dCA9IGdldFVzZXJDb250ZXh0KG1vY2tKdWRnZUV2ZW50KTtcbiAgICAgIGV4cGVjdChoYXNSb2xlKHVzZXJDb250ZXh0LCAnanVkZ2UnKSkudG9CZSh0cnVlKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmV0dXJuIGZhbHNlIGZvciBub24tbWF0Y2hpbmcgcm9sZScsICgpID0+IHtcbiAgICAgIGNvbnN0IHVzZXJDb250ZXh0ID0gZ2V0VXNlckNvbnRleHQobW9ja0p1ZGdlRXZlbnQpO1xuICAgICAgZXhwZWN0KGhhc1JvbGUodXNlckNvbnRleHQsICdwYXJ0aWNpcGFudCcpKS50b0JlKGZhbHNlKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmV0dXJuIGZhbHNlIGZvciBudWxsIHVzZXIgY29udGV4dCcsICgpID0+IHtcbiAgICAgIGV4cGVjdChoYXNSb2xlKG51bGwsICdhZG1pbicpKS50b0JlKGZhbHNlKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2hhc0FueVJvbGUnLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gdHJ1ZSBmb3IgYWRtaW4gdXNlciB3aXRoIGFueSByb2xlcycsICgpID0+IHtcbiAgICAgIGNvbnN0IHVzZXJDb250ZXh0ID0gZ2V0VXNlckNvbnRleHQobW9ja0FkbWluRXZlbnQpO1xuICAgICAgZXhwZWN0KGhhc0FueVJvbGUodXNlckNvbnRleHQsIFsnanVkZ2UnLCAncGFydGljaXBhbnQnXSkpLnRvQmUodHJ1ZSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHJldHVybiB0cnVlIGZvciBtYXRjaGluZyByb2xlIGluIGFycmF5JywgKCkgPT4ge1xuICAgICAgY29uc3QgdXNlckNvbnRleHQgPSBnZXRVc2VyQ29udGV4dChtb2NrSnVkZ2VFdmVudCk7XG4gICAgICBleHBlY3QoaGFzQW55Um9sZSh1c2VyQ29udGV4dCwgWydqdWRnZScsICdhZG1pbiddKSkudG9CZSh0cnVlKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmV0dXJuIGZhbHNlIGZvciBub24tbWF0Y2hpbmcgcm9sZXMnLCAoKSA9PiB7XG4gICAgICBjb25zdCB1c2VyQ29udGV4dCA9IGdldFVzZXJDb250ZXh0KG1vY2tQYXJ0aWNpcGFudEV2ZW50KTtcbiAgICAgIGV4cGVjdChoYXNBbnlSb2xlKHVzZXJDb250ZXh0LCBbJ2p1ZGdlJywgJ2FkbWluJ10pKS50b0JlKGZhbHNlKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmV0dXJuIGZhbHNlIGZvciBudWxsIHVzZXIgY29udGV4dCcsICgpID0+IHtcbiAgICAgIGV4cGVjdChoYXNBbnlSb2xlKG51bGwsIFsnYWRtaW4nLCAnanVkZ2UnXSkpLnRvQmUoZmFsc2UpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgncmVxdWlyZVJvbGUnLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCBub3QgdGhyb3cgZm9yIGFkbWluIHVzZXIgd2l0aCBhbnkgcm9sZScsICgpID0+IHtcbiAgICAgIGNvbnN0IHVzZXJDb250ZXh0ID0gZ2V0VXNlckNvbnRleHQobW9ja0FkbWluRXZlbnQpO1xuICAgICAgZXhwZWN0KCgpID0+IHJlcXVpcmVSb2xlKHVzZXJDb250ZXh0LCAnanVkZ2UnKSkubm90LnRvVGhyb3coKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgbm90IHRocm93IGZvciBtYXRjaGluZyByb2xlJywgKCkgPT4ge1xuICAgICAgY29uc3QgdXNlckNvbnRleHQgPSBnZXRVc2VyQ29udGV4dChtb2NrSnVkZ2VFdmVudCk7XG4gICAgICBleHBlY3QoKCkgPT4gcmVxdWlyZVJvbGUodXNlckNvbnRleHQsICdqdWRnZScpKS5ub3QudG9UaHJvdygpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCB0aHJvdyBmb3Igbm9uLW1hdGNoaW5nIHJvbGUnLCAoKSA9PiB7XG4gICAgICBjb25zdCB1c2VyQ29udGV4dCA9IGdldFVzZXJDb250ZXh0KG1vY2tQYXJ0aWNpcGFudEV2ZW50KTtcbiAgICAgIGV4cGVjdCgoKSA9PiByZXF1aXJlUm9sZSh1c2VyQ29udGV4dCwgJ2p1ZGdlJykpLnRvVGhyb3coJ0FjY2VzcyBkZW5pZWQuIFJlcXVpcmVkIHJvbGU6IGp1ZGdlLCBjdXJyZW50IHJvbGU6IHBhcnRpY2lwYW50Jyk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHRocm93IGZvciBudWxsIHVzZXIgY29udGV4dCcsICgpID0+IHtcbiAgICAgIGV4cGVjdCgoKSA9PiByZXF1aXJlUm9sZShudWxsLCAnYWRtaW4nKSkudG9UaHJvdygnQWNjZXNzIGRlbmllZC4gUmVxdWlyZWQgcm9sZTogYWRtaW4sIGN1cnJlbnQgcm9sZTogdW5rbm93bicpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgncmVxdWlyZUFueVJvbGUnLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCBub3QgdGhyb3cgZm9yIGFkbWluIHVzZXIgd2l0aCBhbnkgcm9sZXMnLCAoKSA9PiB7XG4gICAgICBjb25zdCB1c2VyQ29udGV4dCA9IGdldFVzZXJDb250ZXh0KG1vY2tBZG1pbkV2ZW50KTtcbiAgICAgIGV4cGVjdCgoKSA9PiByZXF1aXJlQW55Um9sZSh1c2VyQ29udGV4dCwgWydqdWRnZScsICdwYXJ0aWNpcGFudCddKSkubm90LnRvVGhyb3coKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgbm90IHRocm93IGZvciBtYXRjaGluZyByb2xlIGluIGFycmF5JywgKCkgPT4ge1xuICAgICAgY29uc3QgdXNlckNvbnRleHQgPSBnZXRVc2VyQ29udGV4dChtb2NrSnVkZ2VFdmVudCk7XG4gICAgICBleHBlY3QoKCkgPT4gcmVxdWlyZUFueVJvbGUodXNlckNvbnRleHQsIFsnanVkZ2UnLCAnYWRtaW4nXSkpLm5vdC50b1Rocm93KCk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHRocm93IGZvciBub24tbWF0Y2hpbmcgcm9sZXMnLCAoKSA9PiB7XG4gICAgICBjb25zdCB1c2VyQ29udGV4dCA9IGdldFVzZXJDb250ZXh0KG1vY2tQYXJ0aWNpcGFudEV2ZW50KTtcbiAgICAgIGV4cGVjdCgoKSA9PiByZXF1aXJlQW55Um9sZSh1c2VyQ29udGV4dCwgWydqdWRnZScsICdhZG1pbiddKSkudG9UaHJvdygnQWNjZXNzIGRlbmllZC4gUmVxdWlyZWQgcm9sZXM6IGp1ZGdlIG9yIGFkbWluLCBjdXJyZW50IHJvbGU6IHBhcnRpY2lwYW50Jyk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHRocm93IGZvciBudWxsIHVzZXIgY29udGV4dCcsICgpID0+IHtcbiAgICAgIGV4cGVjdCgoKSA9PiByZXF1aXJlQW55Um9sZShudWxsLCBbJ2FkbWluJywgJ2p1ZGdlJ10pKS50b1Rocm93KCdBY2Nlc3MgZGVuaWVkLiBSZXF1aXJlZCByb2xlczogYWRtaW4gb3IganVkZ2UsIGN1cnJlbnQgcm9sZTogdW5rbm93bicpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnZ2V0SnVkZ2VJZCcsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIHJldHVybiBqdWRnZUlkIGZvciBqdWRnZSB1c2VyJywgKCkgPT4ge1xuICAgICAgY29uc3QgdXNlckNvbnRleHQgPSBnZXRVc2VyQ29udGV4dChtb2NrSnVkZ2VFdmVudCk7XG4gICAgICBleHBlY3QoZ2V0SnVkZ2VJZCh1c2VyQ29udGV4dCkpLnRvQmUoJ0pVREdFXzAwMScpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gdXNlcklkIGZvciBhZG1pbiB1c2VyIHdpdGhvdXQganVkZ2VJZCcsICgpID0+IHtcbiAgICAgIGNvbnN0IHVzZXJDb250ZXh0ID0gZ2V0VXNlckNvbnRleHQobW9ja0FkbWluRXZlbnQpO1xuICAgICAgZXhwZWN0KGdldEp1ZGdlSWQodXNlckNvbnRleHQpKS50b0JlKCdhZG1pbi0xMjMnKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmV0dXJuIG51bGwgZm9yIHBhcnRpY2lwYW50IHVzZXInLCAoKSA9PiB7XG4gICAgICBjb25zdCB1c2VyQ29udGV4dCA9IGdldFVzZXJDb250ZXh0KG1vY2tQYXJ0aWNpcGFudEV2ZW50KTtcbiAgICAgIGV4cGVjdChnZXRKdWRnZUlkKHVzZXJDb250ZXh0KSkudG9CZU51bGwoKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmV0dXJuIG51bGwgZm9yIG51bGwgdXNlciBjb250ZXh0JywgKCkgPT4ge1xuICAgICAgZXhwZWN0KGdldEp1ZGdlSWQobnVsbCkpLnRvQmVOdWxsKCk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdjYW5BY2Nlc3NTY29yZScsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIHJldHVybiB0cnVlIGZvciBhZG1pbiB1c2VyJywgKCkgPT4ge1xuICAgICAgY29uc3QgdXNlckNvbnRleHQgPSBnZXRVc2VyQ29udGV4dChtb2NrQWRtaW5FdmVudCk7XG4gICAgICBleHBlY3QoY2FuQWNjZXNzU2NvcmUodXNlckNvbnRleHQsICdhbnktanVkZ2UtaWQnKSkudG9CZSh0cnVlKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmV0dXJuIHRydWUgZm9yIGp1ZGdlIGFjY2Vzc2luZyB0aGVpciBvd24gc2NvcmUnLCAoKSA9PiB7XG4gICAgICBjb25zdCB1c2VyQ29udGV4dCA9IGdldFVzZXJDb250ZXh0KG1vY2tKdWRnZUV2ZW50KTtcbiAgICAgIGV4cGVjdChjYW5BY2Nlc3NTY29yZSh1c2VyQ29udGV4dCwgJ0pVREdFXzAwMScpKS50b0JlKHRydWUpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gZmFsc2UgZm9yIGp1ZGdlIGFjY2Vzc2luZyBhbm90aGVyIGp1ZGdlXFwncyBzY29yZScsICgpID0+IHtcbiAgICAgIGNvbnN0IHVzZXJDb250ZXh0ID0gZ2V0VXNlckNvbnRleHQobW9ja0p1ZGdlRXZlbnQpO1xuICAgICAgZXhwZWN0KGNhbkFjY2Vzc1Njb3JlKHVzZXJDb250ZXh0LCAnSlVER0VfMDAyJykpLnRvQmUoZmFsc2UpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gZmFsc2UgZm9yIHBhcnRpY2lwYW50IHVzZXInLCAoKSA9PiB7XG4gICAgICBjb25zdCB1c2VyQ29udGV4dCA9IGdldFVzZXJDb250ZXh0KG1vY2tQYXJ0aWNpcGFudEV2ZW50KTtcbiAgICAgIGV4cGVjdChjYW5BY2Nlc3NTY29yZSh1c2VyQ29udGV4dCwgJ2FueS1qdWRnZS1pZCcpKS50b0JlKGZhbHNlKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmV0dXJuIGZhbHNlIGZvciBudWxsIHVzZXIgY29udGV4dCcsICgpID0+IHtcbiAgICAgIGV4cGVjdChjYW5BY2Nlc3NTY29yZShudWxsLCAnYW55LWp1ZGdlLWlkJykpLnRvQmUoZmFsc2UpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgncmVxdWlyZVNjb3JlQWNjZXNzJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgbm90IHRocm93IGZvciBhZG1pbiB1c2VyJywgKCkgPT4ge1xuICAgICAgY29uc3QgdXNlckNvbnRleHQgPSBnZXRVc2VyQ29udGV4dChtb2NrQWRtaW5FdmVudCk7XG4gICAgICBleHBlY3QoKCkgPT4gcmVxdWlyZVNjb3JlQWNjZXNzKHVzZXJDb250ZXh0LCAnYW55LWp1ZGdlLWlkJykpLm5vdC50b1Rocm93KCk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIG5vdCB0aHJvdyBmb3IganVkZ2UgYWNjZXNzaW5nIHRoZWlyIG93biBzY29yZScsICgpID0+IHtcbiAgICAgIGNvbnN0IHVzZXJDb250ZXh0ID0gZ2V0VXNlckNvbnRleHQobW9ja0p1ZGdlRXZlbnQpO1xuICAgICAgZXhwZWN0KCgpID0+IHJlcXVpcmVTY29yZUFjY2Vzcyh1c2VyQ29udGV4dCwgJ0pVREdFXzAwMScpKS5ub3QudG9UaHJvdygpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCB0aHJvdyBmb3IganVkZ2UgYWNjZXNzaW5nIGFub3RoZXIganVkZ2VcXCdzIHNjb3JlJywgKCkgPT4ge1xuICAgICAgY29uc3QgdXNlckNvbnRleHQgPSBnZXRVc2VyQ29udGV4dChtb2NrSnVkZ2VFdmVudCk7XG4gICAgICBleHBlY3QoKCkgPT4gcmVxdWlyZVNjb3JlQWNjZXNzKHVzZXJDb250ZXh0LCAnSlVER0VfMDAyJykpLnRvVGhyb3coJ0FjY2VzcyBkZW5pZWQuIFlvdSBjYW4gb25seSBhY2Nlc3MgeW91ciBvd24gc2NvcmVzLicpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCB0aHJvdyBmb3IgcGFydGljaXBhbnQgdXNlcicsICgpID0+IHtcbiAgICAgIGNvbnN0IHVzZXJDb250ZXh0ID0gZ2V0VXNlckNvbnRleHQobW9ja1BhcnRpY2lwYW50RXZlbnQpO1xuICAgICAgZXhwZWN0KCgpID0+IHJlcXVpcmVTY29yZUFjY2Vzcyh1c2VyQ29udGV4dCwgJ2FueS1qdWRnZS1pZCcpKS50b1Rocm93KCdBY2Nlc3MgZGVuaWVkLiBZb3UgY2FuIG9ubHkgYWNjZXNzIHlvdXIgb3duIHNjb3Jlcy4nKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgdGhyb3cgZm9yIG51bGwgdXNlciBjb250ZXh0JywgKCkgPT4ge1xuICAgICAgZXhwZWN0KCgpID0+IHJlcXVpcmVTY29yZUFjY2VzcyhudWxsLCAnYW55LWp1ZGdlLWlkJykpLnRvVGhyb3coJ0FjY2VzcyBkZW5pZWQuIFlvdSBjYW4gb25seSBhY2Nlc3MgeW91ciBvd24gc2NvcmVzLicpO1xuICAgIH0pO1xuICB9KTtcbn0pOyJdfQ==