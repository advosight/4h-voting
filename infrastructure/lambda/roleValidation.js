"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireScoreAccess = exports.canAccessScore = exports.getJudgeId = exports.requireAnyRole = exports.requireRole = exports.hasAnyRole = exports.hasRole = exports.getUserContext = void 0;
/**
 * Extract user context from AppSync event
 */
function getUserContext(event) {
    try {
        const identity = event.identity;
        if (!identity || !identity.claims) {
            return null;
        }
        const claims = identity.claims;
        const userId = claims.sub || claims['cognito:username'];
        const email = claims.email || claims['cognito:username'];
        console.log('Extracting user context:', { userId, email, claims });
        // Get custom attributes and Cognito groups
        const customRole = claims['custom:role'];
        const judgeId = claims['custom:judgeId'];
        const cognitoGroups = claims['cognito:groups'] || [];
        // Default role logic
        let role = customRole || 'participant';
        // Check Cognito groups first (highest priority)
        if (cognitoGroups.includes('admin')) {
            role = 'admin';
        }
        else if (cognitoGroups.includes('judge')) {
            role = 'judge';
        }
        // Special handling for the default admin user
        else if (email === '4h-leader@example.com') {
            role = 'admin';
        }
        // If user has judge ID but no role set, they're a judge
        else if (judgeId && !customRole) {
            role = 'judge';
        }
        return {
            userId,
            email,
            role,
            judgeId,
            claims,
        };
    }
    catch (error) {
        console.error('Error extracting user context:', error);
        return null;
    }
}
exports.getUserContext = getUserContext;
/**
 * Check if user has the required role
 */
function hasRole(userContext, requiredRole) {
    if (!userContext)
        return false;
    // Admin users have access to all roles
    if (userContext.role === 'admin')
        return true;
    return userContext.role === requiredRole;
}
exports.hasRole = hasRole;
/**
 * Check if user has any of the required roles
 */
function hasAnyRole(userContext, requiredRoles) {
    if (!userContext)
        return false;
    // Admin users have access to all roles
    if (userContext.role === 'admin')
        return true;
    return requiredRoles.includes(userContext.role);
}
exports.hasAnyRole = hasAnyRole;
/**
 * Validate that user has required role, throw error if not
 */
function requireRole(userContext, requiredRole) {
    if (!hasRole(userContext, requiredRole)) {
        const currentRole = userContext?.role || 'unknown';
        throw new Error(`Access denied. Required role: ${requiredRole}, current role: ${currentRole}`);
    }
}
exports.requireRole = requireRole;
/**
 * Validate that user has any of the required roles, throw error if not
 */
function requireAnyRole(userContext, requiredRoles) {
    if (!hasAnyRole(userContext, requiredRoles)) {
        const currentRole = userContext?.role || 'unknown';
        const roleNames = requiredRoles.join(' or ');
        throw new Error(`Access denied. Required roles: ${roleNames}, current role: ${currentRole}`);
    }
}
exports.requireAnyRole = requireAnyRole;
/**
 * Get judge ID for the current user (if they are a judge)
 */
function getJudgeId(userContext) {
    if (!userContext || !hasAnyRole(userContext, ['judge', 'admin'])) {
        return null;
    }
    // For admin users, use their userId as judgeId
    return userContext.judgeId || userContext.userId;
}
exports.getJudgeId = getJudgeId;
/**
 * Check if user can access score data (either their own scores or admin)
 */
function canAccessScore(userContext, scoreJudgeId) {
    if (!userContext)
        return false;
    // Admin can access all scores
    if (userContext.role === 'admin')
        return true;
    // Judges can access their own scores
    if (userContext.role === 'judge') {
        const currentJudgeId = getJudgeId(userContext);
        return currentJudgeId === scoreJudgeId;
    }
    return false;
}
exports.canAccessScore = canAccessScore;
/**
 * Validate score access permissions
 */
function requireScoreAccess(userContext, scoreJudgeId) {
    if (!canAccessScore(userContext, scoreJudgeId)) {
        throw new Error('Access denied. You can only access your own scores.');
    }
}
exports.requireScoreAccess = requireScoreAccess;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9sZVZhbGlkYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJyb2xlVmFsaWRhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFVQTs7R0FFRztBQUNILFNBQWdCLGNBQWMsQ0FBQyxLQUFVO0lBQ3ZDLElBQUksQ0FBQztRQUNILE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUM7UUFFaEMsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNsQyxPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDO1FBQy9CLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxHQUFHLElBQUksTUFBTSxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDeEQsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssSUFBSSxNQUFNLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUV6RCxPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUEwQixFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBRW5FLDJDQUEyQztRQUMzQyxNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsYUFBYSxDQUFhLENBQUM7UUFDckQsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDekMsTUFBTSxhQUFhLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixDQUFhLElBQUksRUFBRSxDQUFDO1FBRWpFLHFCQUFxQjtRQUNyQixJQUFJLElBQUksR0FBYSxVQUFVLElBQUksYUFBYSxDQUFDO1FBRWpELGdEQUFnRDtRQUNoRCxJQUFJLGFBQWEsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNwQyxJQUFJLEdBQUcsT0FBTyxDQUFDO1FBQ2pCLENBQUM7YUFBTSxJQUFJLGFBQWEsQ0FBQyxRQUFRLENB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QUFDO0lBRS9CLDhCQUE4QjtJQUM5QixJQUFJLFdBQVcsQ0FBQyxJQUFJLEtBQUssT0FBTztRQUFFLE9BQU8sSUFBSSxDQUFDO0lBRTlDLHFDQUFxQztJQUNyQyxJQUFJLFdBQVcsQ0FBQyxJQUFJLEtBQUssT0FBTyxFQUFFLENBQUM7UUFDakMsTUFBTSxjQUFjLEdBQUcsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQy9DLE9BQU8sY0FBYyxLQUFLLFlBQVksQ0FBQztJQUN6QyxDQUFDO0lBRUQsT0FBTyxLQUFLLENBQUM7QUFDZixDQUFDO0FBYkQsd0NBYUM7QUFFRDs7R0FFRztBQUNILFNBQWdCLGtCQUFrQixDQUFDLFdBQStCLEVBQUUsWUFBcUI7SUFDdkYsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLEVBQUUsWUFBWSxDQUFDLEVBQUUsQ0FBQztRQUMvQyxNQUFNLElBQUksS0FBSyxDQUFDLHFEQUFxRCxDQUFDLENBQUM7SUFDekUsQ0FBQztBQUNILENBQUM7QUFKRCxnREFJQyIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCB0eXBlIFVzZXJSb2xlID0gJ2FkbWluJyB8ICdqdWRnZScgfCAncGFydGljaXBhbnQnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFVzZXJDb250ZXh0IHtcbiAgdXNlcklkOiBzdHJpbmc7XG4gIGVtYWlsOiBzdHJpbmc7XG4gIHJvbGU6IFVzZXJSb2xlO1xuICBqdWRnZUlkPzogc3RyaW5nO1xuICBjbGFpbXM6IFJlY29yZDxzdHJpbmcsIGFueT47XG59XG5cbi8qKlxuICogRXh0cmFjdCB1c2VyIGNvbnRleHQgZnJvbSBBcHBTeW5jIGV2ZW50XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRVc2VyQ29udGV4dChldmVudDogYW55KTogVXNlckNvbnRleHQgfCBudWxsIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBpZGVudGl0eSA9IGV2ZW50LmlkZW50aXR5O1xuICAgIFxuICAgIGlmICghaWRlbnRpdHkgfHwgIWlkZW50aXR5LmNsYWltcykge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgY2xhaW1zID0gaWRlbnRpdHkuY2xhaW1zO1xuICAgIGNvbnN0IHVzZXJJZCA9IGNsYWltcy5zdWIgfHwgY2xhaW1zWydjb2duaXRvOnVzZXJuYW1lJ107XG4gICAgY29uc3QgZW1haWwgPSBjbGFpbXMuZW1haWwgfHwgY2xhaW1zWydjb2duaXRvOnVzZXJuYW1lJ107XG4gICAgXG4gICAgY29uc29sZS5sb2coJ0V4dHJhY3RpbmcgdXNlciBjb250ZXh0OicsIHsgdXNlcklkLCBlbWFpbCwgY2xhaW1zIH0pO1xuICAgIFxuICAgIC8vIEdldCBjdXN0b20gYXR0cmlidXRlcyBhbmQgQ29nbml0byBncm91cHNcbiAgICBjb25zdCBjdXN0b21Sb2xlID0gY2xhaW1zWydjdXN0b206cm9sZSddIGFzIFVzZXJSb2xlO1xuICAgIGNvbnN0IGp1ZGdlSWQgPSBjbGFpbXNbJ2N1c3RvbTpqdWRnZUlkJ107XG4gICAgY29uc3QgY29nbml0b0dyb3VwcyA9IGNsYWltc1snY29nbml0bzpncm91cHMnXSBhcyBzdHJpbmdbXSB8fCBbXTtcbiAgICBcbiAgICAvLyBEZWZhdWx0IHJvbGUgbG9naWNcbiAgICBsZXQgcm9sZTogVXNlclJvbGUgPSBjdXN0b21Sb2xlIHx8ICdwYXJ0aWNpcGFudCc7XG4gICAgXG4gICAgLy8gQ2hlY2sgQ29nbml0byBncm91cHMgZmlyc3QgKGhpZ2hlc3QgcHJpb3JpdHkpXG4gICAgaWYgKGNvZ25pdG9Hcm91cHMuaW5jbHVkZXMoJ2FkbWluJykpIHtcbiAgICAgIHJvbGUgPSAnYWRtaW4nO1xuICAgIH0gZWxzZSBpZiAoY29nbml0b0dyb3Vwcy5pbmNsdWRlcygnanVkZ2UnKSkge1xuICAgICAgcm9sZSA9ICdqdWRnZSc7XG4gICAgfVxuICAgIC8vIFNwZWNpYWwgaGFuZGxpbmcgZm9yIHRoZSBkZWZhdWx0IGFkbWluIHVzZXJcbiAgICBlbHNlIGlmIChlbWFpbCA9PT0gJzRoLWxlYWRlckBleGFtcGxlLmNvbScpIHtcbiAgICAgIHJvbGUgPSAnYWRtaW4nO1xuICAgIH1cbiAgICAvLyBJZiB1c2VyIGhhcyBqdWRnZSBJRCBidXQgbm8gcm9sZSBzZXQsIHRoZXkncmUgYSBqdWRnZVxuICAgIGVsc2UgaWYgKGp1ZGdlSWQgJiYgIWN1c3RvbVJvbGUpIHtcbiAgICAgIHJvbGUgPSAnanVkZ2UnO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB1c2VySWQsXG4gICAgICBlbWFpbCxcbiAgICAgIHJvbGUsXG4gICAgICBqdWRnZUlkLFxuICAgICAgY2xhaW1zLFxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgZXh0cmFjdGluZyB1c2VyIGNvbnRleHQ6JywgZXJyb3IpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogQ2hlY2sgaWYgdXNlciBoYXMgdGhlIHJlcXVpcmVkIHJvbGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGhhc1JvbGUodXNlckNvbnRleHQ6IFVzZXJDb250ZXh0IHwgbnVsbCwgcmVxdWlyZWRSb2xlOiBVc2VyUm9sZSk6IGJvb2xlYW4ge1xuICBpZiAoIXVzZXJDb250ZXh0KSByZXR1cm4gZmFsc2U7XG4gIFxuICAvLyBBZG1pbiB1c2VycyBoYXZlIGFjY2VzcyB0byBhbGwgcm9sZXNcbiAgaWYgKHVzZXJDb250ZXh0LnJvbGUgPT09ICdhZG1pbicpIHJldHVybiB0cnVlO1xuICBcbiAgcmV0dXJuIHVzZXJDb250ZXh0LnJvbGUgPT09IHJlcXVpcmVkUm9sZTtcbn1cblxuLyoqXG4gKiBDaGVjayBpZiB1c2VyIGhhcyBhbnkgb2YgdGhlIHJlcXVpcmVkIHJvbGVzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBoYXNBbnlSb2xlKHVzZXJDb250ZXh0OiBVc2VyQ29udGV4dCB8IG51bGwsIHJlcXVpcmVkUm9sZXM6IFVzZXJSb2xlW10pOiBib29sZWFuIHtcbiAgaWYgKCF1c2VyQ29udGV4dCkgcmV0dXJuIGZhbHNlO1xuICBcbiAgLy8gQWRtaW4gdXNlcnMgaGF2ZSBhY2Nlc3MgdG8gYWxsIHJvbGVzXG4gIGlmICh1c2VyQ29udGV4dC5yb2xlID09PSAnYWRtaW4nKSByZXR1cm4gdHJ1ZTtcbiAgXG4gIHJldHVybiByZXF1aXJlZFJvbGVzLmluY2x1ZGVzKHVzZXJDb250ZXh0LnJvbGUpO1xufVxuXG4vKipcbiAqIFZhbGlkYXRlIHRoYXQgdXNlciBoYXMgcmVxdWlyZWQgcm9sZSwgdGhyb3cgZXJyb3IgaWYgbm90XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXF1aXJlUm9sZSh1c2VyQ29udGV4dDogVXNlckNvbnRleHQgfCBudWxsLCByZXF1aXJlZFJvbGU6IFVzZXJSb2xlKTogdm9pZCB7XG4gIGlmICghaGFzUm9sZSh1c2VyQ29udGV4dCwgcmVxdWlyZWRSb2xlKSkge1xuICAgIGNvbnN0IGN1cnJlbnRSb2xlID0gdXNlckNvbnRleHQ/LnJvbGUgfHwgJ3Vua25vd24nO1xuICAgIHRocm93IG5ldyBFcnJvcihgQWNjZXNzIGRlbmllZC4gUmVxdWlyZWQgcm9sZTogJHtyZXF1aXJlZFJvbGV9LCBjdXJyZW50IHJvbGU6ICR7Y3VycmVudFJvbGV9YCk7XG4gIH1cbn1cblxuLyoqXG4gKiBWYWxpZGF0ZSB0aGF0IHVzZXIgaGFzIGFueSBvZiB0aGUgcmVxdWlyZWQgcm9sZXMsIHRocm93IGVycm9yIGlmIG5vdFxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVxdWlyZUFueVJvbGUodXNlckNvbnRleHQ6IFVzZXJDb250ZXh0IHwgbnVsbCwgcmVxdWlyZWRSb2xlczogVXNlclJvbGVbXSk6IHZvaWQge1xuICBpZiAoIWhhc0FueVJvbGUodXNlckNvbnRleHQsIHJlcXVpcmVkUm9sZXMpKSB7XG4gICAgY29uc3QgY3VycmVudFJvbGUgPSB1c2VyQ29udGV4dD8ucm9sZSB8fCAndW5rbm93bic7XG4gICAgY29uc3Qgcm9sZU5hbWVzID0gcmVxdWlyZWRSb2xlcy5qb2luKCcgb3IgJyk7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBBY2Nlc3MgZGVuaWVkLiBSZXF1aXJlZCByb2xlczogJHtyb2xlTmFtZXN9LCBjdXJyZW50IHJvbGU6ICR7Y3VycmVudFJvbGV9YCk7XG4gIH1cbn1cblxuLyoqXG4gKiBHZXQganVkZ2UgSUQgZm9yIHRoZSBjdXJyZW50IHVzZXIgKGlmIHRoZXkgYXJlIGEganVkZ2UpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRKdWRnZUlkKHVzZXJDb250ZXh0OiBVc2VyQ29udGV4dCB8IG51bGwpOiBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKCF1c2VyQ29udGV4dCB8fCAhaGFzQW55Um9sZSh1c2VyQ29udGV4dCwgWydqdWRnZScsICdhZG1pbiddKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIFxuICAvLyBGb3IgYWRtaW4gdXNlcnMsIHVzZSB0aGVpciB1c2VySWQgYXMganVkZ2VJZFxuICByZXR1cm4gdXNlckNvbnRleHQuanVkZ2VJZCB8fCB1c2VyQ29udGV4dC51c2VySWQ7XG59XG5cbi8qKlxuICogQ2hlY2sgaWYgdXNlciBjYW4gYWNjZXNzIHNjb3JlIGRhdGEgKGVpdGhlciB0aGVpciBvd24gc2NvcmVzIG9yIGFkbWluKVxuICovXG5leHBvcnQgZnVuY3Rpb24gY2FuQWNjZXNzU2NvcmUodXNlckNvbnRleHQ6IFVzZXJDb250ZXh0IHwgbnVsbCwgc2NvcmVKdWRnZUlkPzogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGlmICghdXNlckNvbnRleHQpIHJldHVybiBmYWxzZTtcbiAgXG4gIC8vIEFkbWluIGNhbiBhY2Nlc3MgYWxsIHNjb3Jlc1xuICBpZiAodXNlckNvbnRleHQucm9sZSA9PT0gJ2FkbWluJykgcmV0dXJuIHRydWU7XG4gIFxuICAvLyBKdWRnZXMgY2FuIGFjY2VzcyB0aGVpciBvd24gc2NvcmVzXG4gIGlmICh1c2VyQ29udGV4dC5yb2xlID09PSAnanVkZ2UnKSB7XG4gICAgY29uc3QgY3VycmVudEp1ZGdlSWQgPSBnZXRKdWRnZUlkKHVzZXJDb250ZXh0KTtcbiAgICByZXR1cm4gY3VycmVudEp1ZGdlSWQgPT09IHNjb3JlSnVkZ2VJZDtcbiAgfVxuICBcbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIFZhbGlkYXRlIHNjb3JlIGFjY2VzcyBwZXJtaXNzaW9uc1xuICovXG5leHBvcnQgZnVuY3Rpb24gcmVxdWlyZVNjb3JlQWNjZXNzKHVzZXJDb250ZXh0OiBVc2VyQ29udGV4dCB8IG51bGwsIHNjb3JlSnVkZ2VJZD86IHN0cmluZyk6IHZvaWQge1xuICBpZiAoIWNhbkFjY2Vzc1Njb3JlKHVzZXJDb250ZXh0LCBzY29yZUp1ZGdlSWQpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdBY2Nlc3MgZGVuaWVkLiBZb3UgY2FuIG9ubHkgYWNjZXNzIHlvdXIgb3duIHNjb3Jlcy4nKTtcbiAgfVxufSJdfQ==