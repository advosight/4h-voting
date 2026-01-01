"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreResolverHandler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const scoreDataAccess_1 = require("./scoreDataAccess");
const client = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const scoreDataAccess = new scoreDataAccess_1.ScoreDataAccess(docClient, process.env.TABLE_NAME);
/**
 * Example resolver function showing how to integrate ScoreDataAccess
 * This would be integrated into the main resolver.ts file
 */
const scoreResolverHandler = async (event) => {
    const { fieldName } = event.info;
    try {
        switch (fieldName) {
            case 'createScore':
                return await createScore(event.arguments.input);
            case 'getScore':
                return await getScore(event.arguments.id);
            case 'updateScore':
                return await updateScore(event.arguments.id, event.arguments.input);
            case 'deleteScore':
                return await deleteScore(event.arguments.id);
            case 'getScoresByCat':
                return await getScoresByCat(event.arguments.catId);
            case 'getScoresByJudge':
                return await getScoresByJudge(event.arguments.judgeId);
            case 'getScoresByCage':
                return await getScoresByCage(event.arguments.cageNumber);
            case 'listAllScores':
                return await listAllScores();
            default:
                throw new Error(`Unknown field: ${fieldName}`);
        }
    }
    catch (error) {
        console.error(`Error in ${fieldName}:`, error);
        throw error;
    }
};
exports.scoreResolverHandler = scoreResolverHandler;
async function createScore(input) {
    // Add validation here if needed
    validateScoreInput(input);
    const score = await scoreDataAccess.createScore(input);
    return score;
}
async function getScore(id) {
    const score = await scoreDataAccess.getScore(id);
    if (!score) {
        throw new Error('Score not found');
    }
    return score;
}
async function updateScore(id, input) {
    // Add validation here if needed
    validateUpdateScoreInput(input);
    const score = await scoreDataAccess.updateScore(id, input);
    return score;
}
async function deleteScore(id) {
    const score = await scoreDataAccess.deleteScore(id);
    return score;
}
async function getScoresByCat(catId) {
    const scores = await scoreDataAccess.getScoresByCat(catId);
    return { items: scores };
}
async function getScoresByJudge(judgeId) {
    const scores = await scoreDataAccess.getScoresByJudge(judgeId);
    return { items: scores };
}
async function getScoresByCage(cageNumber) {
    const scores = await scoreDataAccess.getScoresByCage(cageNumber);
    return { items: scores };
}
async function listAllScores() {
    const scores = await scoreDataAccess.listAllScores();
    return { items: scores };
}
/**
 * Validation functions
 */
function validateScoreInput(input) {
    // Validate score ranges (0-25 for each category)
    const scores = [
        input.cageConditionScore,
        input.catConditionScore,
        input.groomingScore,
        input.overallScore,
    ];
    for (const score of scores) {
        if (score < 0 || score > 25) {
            throw new Error(`Score must be between 0 and 25, got ${score}`);
        }
    }
    // Validate comment lengths (max 500 characters)
    const comments = [
        input.cageConditionComments,
        input.catConditionComments,
        input.groomingComments,
        input.overallComments,
    ];
    for (const comment of comments) {
        if (comment && comment.length > 500) {
            throw new Error(`Comment must be 500 characters or less, got ${comment.length}`);
        }
    }
    // Validate required fields
    if (!input.catId || !input.judgeId || !input.judgeName) {
        throw new Error('catId, judgeId, and judgeName are required');
    }
}
function validateUpdateScoreInput(input) {
    // Validate score ranges if provided
    const scores = [
        input.cageConditionScore,
        input.catConditionScore,
        input.groomingScore,
        input.overallScore,
    ].filter(score => score !== undefined);
    for (const score of scores) {
        if (score < 0 || score > 25) {
            throw new Error(`Score must be between 0 and 25, got ${score}`);
        }
    }
    // Validate comment lengths if provided
    const comments = [
        input.cageConditionComments,
        input.catConditionComments,
        input.groomingComments,
        input.overallComments,
    ].filter(comment => comment !== undefined);
    for (const comment of comments) {
        if (comment && comment.length > 500) {
            throw new Error(`Comment must be 500 characters or less, got ${comment.length}`);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NvcmVSZXNvbHZlci5leGFtcGxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2NvcmVSZXNvbHZlci5leGFtcGxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDhEQUEwRDtBQUMxRCx3REFBK0Q7QUFDL0QsdURBQXdGO0FBRXhGLE1BQU0sTUFBTSxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUN0QyxNQUFNLFNBQVMsR0FBRyxxQ0FBc0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDdEQsTUFBTSxlQUFlLEdBQUcsSUFBSSxpQ0FBZSxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVcsQ0FBQyxDQUFDO0FBRWhGOzs7R0FHRztBQUNJLE1BQU0sb0JBQW9CLEdBQUcsS0FBSyxFQUFFLEtBQWdDLEVBQUUsRUFBRTtJQUM3RSxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQztJQUVqQyxJQUFJLENBQUM7UUFDSCxRQUFRLFNBQVMsRUFBRSxDQUFDO1lBQ2xCLEtBQUssYUFBYTtnQkFDaEIsT0FBTyxNQUFNLFdBQVcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2xELEtBQUssVUFBVTtnQkFDYixPQUFPLE1BQU0sUUFBUSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDNUMsS0FBSyxhQUFhO2dCQUNoQixPQUFPLE1BQU0sV0FBVyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDdEUsS0FBSyxhQUFhO2dCQUNoQixPQUFPLE1BQU0sV0FBVyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDL0MsS0FBSyxnQkFBZ0I7Z0JBQ25CLE9BQU8sTUFBTSxjQUFjLENBQUMsS0FB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QyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEtBQUssU0FBUyxDQUFDLENBQUM7SUFFdkMsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUUsQ0FBQztRQUMzQixJQUFJLEtBQU0sR0FBRyxDQUFDLElBQUksS0FBTSxHQUFHLEVBQUUsRUFBRSxDQUFDO1lBQzlCLE1BQU0sSUFBSSxLQUFLLENBQUMsdUNBQXVDLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDbEUsQ0FBQztJQUNILENBQUM7SUFFRCx1Q0FBdUM7SUFDdkMsTUFBTSxRQUFRLEdBQUc7UUFDZixLQUFLLENBQUMscUJBQXFCO1FBQzNCLEtBQUssQ0FBQyxvQkFBb0I7UUFDMUIsS0FBSyxDQUFDLGdCQUFnQjtRQUN0QixLQUFLLENBQUMsZUFBZTtLQUN0QixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sS0FBSyxTQUFTLENBQUMsQ0FBQztJQUUzQyxLQUFLLE1BQU0sT0FBTyxJQUFJLFFBQVEsRUFBRSxDQUFDO1FBQy9CLElBQUksT0FBTyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEdBQUcsR0FBRyxFQUFFLENBQUM7WUFDcEMsTUFBTSxJQUFJLEtBQUssQ0FBQywrQ0FBK0MsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDbkYsQ0FBQztJQUNILENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwU3luY1Jlc29sdmVyRXZlbnQgfSBmcm9tICdhd3MtbGFtYmRhJztcbmltcG9ydCB7IER5bmFtb0RCQ2xpZW50IH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcbmltcG9ydCB7IER5bmFtb0RCRG9jdW1lbnRDbGllbnQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xuaW1wb3J0IHsgU2NvcmVEYXRhQWNjZXNzLCBDcmVhdGVTY29yZUlucHV0LCBVcGRhdGVTY29yZUlucHV0IH0gZnJvbSAnLi9zY29yZURhdGFBY2Nlc3MnO1xuXG5jb25zdCBjbGllbnQgPSBuZXcgRHluYW1vREJDbGllbnQoe30pO1xuY29uc3QgZG9jQ2xpZW50ID0gRHluYW1vREJEb2N1bWVudENsaWVudC5mcm9tKGNsaWVudCk7XG5jb25zdCBzY29yZURhdGFBY2Nlc3MgPSBuZXcgU2NvcmVEYXRhQWNjZXNzKGRvY0NsaWVudCwgcHJvY2Vzcy5lbnYuVEFCTEVfTkFNRSEpO1xuXG4vKipcbiAqIEV4YW1wbGUgcmVzb2x2ZXIgZnVuY3Rpb24gc2hvd2luZyBob3cgdG8gaW50ZWdyYXRlIFNjb3JlRGF0YUFjY2Vzc1xuICogVGhpcyB3b3VsZCBiZSBpbnRlZ3JhdGVkIGludG8gdGhlIG1haW4gcmVzb2x2ZXIudHMgZmlsZVxuICovXG5leHBvcnQgY29uc3Qgc2NvcmVSZXNvbHZlckhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IEFwcFN5bmNSZXNvbHZlckV2ZW50PGFueT4pID0+IHtcbiAgY29uc3QgeyBmaWVsZE5hbWUgfSA9IGV2ZW50LmluZm87XG5cbiAgdHJ5IHtcbiAgICBzd2l0Y2ggKGZpZWxkTmFtZSkge1xuICAgICAgY2FzZSAnY3JlYXRlU2NvcmUnOlxuICAgICAgICByZXR1cm4gYXdhaXQgY3JlYXRlU2NvcmUoZXZlbnQuYXJndW1lbnRzLmlucHV0KTtcbiAgICAgIGNhc2UgJ2dldFNjb3JlJzpcbiAgICAgICAgcmV0dXJuIGF3YWl0IGdldFNjb3JlKGV2ZW50LmFyZ3VtZW50cy5pZCk7XG4gICAgICBjYXNlICd1cGRhdGVTY29yZSc6XG4gICAgICAgIHJldHVybiBhd2FpdCB1cGRhdGVTY29yZShldmVudC5hcmd1bWVudHMuaWQsIGV2ZW50LmFyZ3VtZW50cy5pbnB1dCk7XG4gICAgICBjYXNlICdkZWxldGVTY29yZSc6XG4gICAgICAgIHJldHVybiBhd2FpdCBkZWxldGVTY29yZShldmVudC5hcmd1bWVudHMuaWQpO1xuICAgICAgY2FzZSAnZ2V0U2NvcmVzQnlDYXQnOlxuICAgICAgICByZXR1cm4gYXdhaXQgZ2V0U2NvcmVzQnlDYXQoZXZlbnQuYXJndW1lbnRzLmNhdElkKTtcbiAgICAgIGNhc2UgJ2dldFNjb3Jlc0J5SnVkZ2UnOlxuICAgICAgICByZXR1cm4gYXdhaXQgZ2V0U2NvcmVzQnlKdWRnZShldmVudC5hcmd1bWVudHMuanVkZ2VJZCk7XG4gICAgICBjYXNlICdnZXRTY29yZXNCeUNhZ2UnOlxuICAgICAgICByZXR1cm4gYXdhaXQgZ2V0U2NvcmVzQnlDYWdlKGV2ZW50LmFyZ3VtZW50cy5jYWdlTnVtYmVyKTtcbiAgICAgIGNhc2UgJ2xpc3RBbGxTY29yZXMnOlxuICAgICAgICByZXR1cm4gYXdhaXQgbGlzdEFsbFNjb3JlcygpO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGZpZWxkOiAke2ZpZWxkTmFtZX1gKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihgRXJyb3IgaW4gJHtmaWVsZE5hbWV9OmAsIGVycm9yKTtcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxufTtcblxuYXN5bmMgZnVuY3Rpb24gY3JlYXRlU2NvcmUoaW5wdXQ6IENyZWF0ZVNjb3JlSW5wdXQpIHtcbiAgLy8gQWRkIHZhbGlkYXRpb24gaGVyZSBpZiBuZWVkZWRcbiAgdmFsaWRhdGVTY29yZUlucHV0KGlucHV0KTtcbiAgXG4gIGNvbnN0IHNjb3JlID0gYXdhaXQgc2NvcmVEYXRhQWNjZXNzLmNyZWF0ZVNjb3JlKGlucHV0KTtcbiAgcmV0dXJuIHNjb3JlO1xufVxuXG5hc3luYyBmdW5jdGlvbiBnZXRTY29yZShpZDogc3RyaW5nKSB7XG4gIGNvbnN0IHNjb3JlID0gYXdhaXQgc2NvcmVEYXRhQWNjZXNzLmdldFNjb3JlKGlkKTtcbiAgaWYgKCFzY29yZSkge1xuICAgIHRocm93IG5ldyBFcnJvcignU2NvcmUgbm90IGZvdW5kJyk7XG4gIH1cbiAgcmV0dXJuIHNjb3JlO1xufVxuXG5hc3luYyBmdW5jdGlvbiB1cGRhdGVTY29yZShpZDogc3RyaW5nLCBpbnB1dDogVXBkYXRlU2NvcmVJbnB1dCkge1xuICAvLyBBZGQgdmFsaWRhdGlvbiBoZXJlIGlmIG5lZWRlZFxuICB2YWxpZGF0ZVVwZGF0ZVNjb3JlSW5wdXQoaW5wdXQpO1xuICBcbiAgY29uc3Qgc2NvcmUgPSBhd2FpdCBzY29yZURhdGFBY2Nlc3MudXBkYXRlU2NvcmUoaWQsIGlucHV0KTtcbiAgcmV0dXJuIHNjb3JlO1xufVxuXG5hc3luYyBmdW5jdGlvbiBkZWxldGVTY29yZShpZDogc3RyaW5nKSB7XG4gIGNvbnN0IHNjb3JlID0gYXdhaXQgc2NvcmVEYXRhQWNjZXNzLmRlbGV0ZVNjb3JlKGlkKTtcbiAgcmV0dXJuIHNjb3JlO1xufVxuXG5hc3luYyBmdW5jdGlvbiBnZXRTY29yZXNCeUNhdChjYXRJZDogc3RyaW5nKSB7XG4gIGNvbnN0IHNjb3JlcyA9IGF3YWl0IHNjb3JlRGF0YUFjY2Vzcy5nZXRTY29yZXNCeUNhdChjYXRJZCk7XG4gIHJldHVybiB7IGl0ZW1zOiBzY29yZXMgfTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZ2V0U2NvcmVzQnlKdWRnZShqdWRnZUlkOiBzdHJpbmcpIHtcbiAgY29uc3Qgc2NvcmVzID0gYXdhaXQgc2NvcmVEYXRhQWNjZXNzLmdldFNjb3Jlc0J5SnVkZ2UoanVkZ2VJZCk7XG4gIHJldHVybiB7IGl0ZW1zOiBzY29yZXMgfTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZ2V0U2NvcmVzQnlDYWdlKGNhZ2VOdW1iZXI6IG51bWJlcikge1xuICBjb25zdCBzY29yZXMgPSBhd2FpdCBzY29yZURhdGFBY2Nlc3MuZ2V0U2NvcmVzQnlDYWdlKGNhZ2VOdW1iZXIpO1xuICByZXR1cm4geyBpdGVtczogc2NvcmVzIH07XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGxpc3RBbGxTY29yZXMoKSB7XG4gIGNvbnN0IHNjb3JlcyA9IGF3YWl0IHNjb3JlRGF0YUFjY2Vzcy5saXN0QWxsU2NvcmVzKCk7XG4gIHJldHVybiB7IGl0ZW1zOiBzY29yZXMgfTtcbn1cblxuLyoqXG4gKiBWYWxpZGF0aW9uIGZ1bmN0aW9uc1xuICovXG5mdW5jdGlvbiB2YWxpZGF0ZVNjb3JlSW5wdXQoaW5wdXQ6IENyZWF0ZVNjb3JlSW5wdXQpIHtcbiAgLy8gVmFsaWRhdGUgc2NvcmUgcmFuZ2VzICgwLTI1IGZvciBlYWNoIGNhdGVnb3J5KVxuICBjb25zdCBzY29yZXMgPSBbXG4gICAgaW5wdXQuY2FnZUNvbmRpdGlvblNjb3JlLFxuICAgIGlucHV0LmNhdENvbmRpdGlvblNjb3JlLFxuICAgIGlucHV0Lmdyb29taW5nU2NvcmUsXG4gICAgaW5wdXQub3ZlcmFsbFNjb3JlLFxuICBdO1xuXG4gIGZvciAoY29uc3Qgc2NvcmUgb2Ygc2NvcmVzKSB7XG4gICAgaWYgKHNjb3JlIDwgMCB8fCBzY29yZSA+IDI1KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFNjb3JlIG11c3QgYmUgYmV0d2VlbiAwIGFuZCAyNSwgZ290ICR7c2NvcmV9YCk7XG4gICAgfVxuICB9XG5cbiAgLy8gVmFsaWRhdGUgY29tbWVudCBsZW5ndGhzIChtYXggNTAwIGNoYXJhY3RlcnMpXG4gIGNvbnN0IGNvbW1lbnRzID0gW1xuICAgIGlucHV0LmNhZ2VDb25kaXRpb25Db21tZW50cyxcbiAgICBpbnB1dC5jYXRDb25kaXRpb25Db21tZW50cyxcbiAgICBpbnB1dC5ncm9vbWluZ0NvbW1lbnRzLFxuICAgIGlucHV0Lm92ZXJhbGxDb21tZW50cyxcbiAgXTtcblxuICBmb3IgKGNvbnN0IGNvbW1lbnQgb2YgY29tbWVudHMpIHtcbiAgICBpZiAoY29tbWVudCAmJiBjb21tZW50Lmxlbmd0aCA+IDUwMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb21tZW50IG11c3QgYmUgNTAwIGNoYXJhY3RlcnMgb3IgbGVzcywgZ290ICR7Y29tbWVudC5sZW5ndGh9YCk7XG4gICAgfVxuICB9XG5cbiAgLy8gVmFsaWRhdGUgcmVxdWlyZWQgZmllbGRzXG4gIGlmICghaW5wdXQuY2F0SWQgfHwgIWlucHV0Lmp1ZGdlSWQgfHwgIWlucHV0Lmp1ZGdlTmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcignY2F0SWQsIGp1ZGdlSWQsIGFuZCBqdWRnZU5hbWUgYXJlIHJlcXVpcmVkJyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gdmFsaWRhdGVVcGRhdGVTY29yZUlucHV0KGlucHV0OiBVcGRhdGVTY29yZUlucHV0KSB7XG4gIC8vIFZhbGlkYXRlIHNjb3JlIHJhbmdlcyBpZiBwcm92aWRlZFxuICBjb25zdCBzY29yZXMgPSBbXG4gICAgaW5wdXQuY2FnZUNvbmRpdGlvblNjb3JlLFxuICAgIGlucHV0LmNhdENvbmRpdGlvblNjb3JlLFxuICAgIGlucHV0Lmdyb29taW5nU2NvcmUsXG4gICAgaW5wdXQub3ZlcmFsbFNjb3JlLFxuICBdLmZpbHRlcihzY29yZSA9PiBzY29yZSAhPT0gdW5kZWZpbmVkKTtcblxuICBmb3IgKGNvbnN0IHNjb3JlIG9mIHNjb3Jlcykge1xuICAgIGlmIChzY29yZSEgPCAwIHx8IHNjb3JlISA+IDI1KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFNjb3JlIG11c3QgYmUgYmV0d2VlbiAwIGFuZCAyNSwgZ290ICR7c2NvcmV9YCk7XG4gICAgfVxuICB9XG5cbiAgLy8gVmFsaWRhdGUgY29tbWVudCBsZW5ndGhzIGlmIHByb3ZpZGVkXG4gIGNvbnN0IGNvbW1lbnRzID0gW1xuICAgIGlucHV0LmNhZ2VDb25kaXRpb25Db21tZW50cyxcbiAgICBpbnB1dC5jYXRDb25kaXRpb25Db21tZW50cyxcbiAgICBpbnB1dC5ncm9vbWluZ0NvbW1lbnRzLFxuICAgIGlucHV0Lm92ZXJhbGxDb21tZW50cyxcbiAgXS5maWx0ZXIoY29tbWVudCA9PiBjb21tZW50ICE9PSB1bmRlZmluZWQpO1xuXG4gIGZvciAoY29uc3QgY29tbWVudCBvZiBjb21tZW50cykge1xuICAgIGlmIChjb21tZW50ICYmIGNvbW1lbnQubGVuZ3RoID4gNTAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENvbW1lbnQgbXVzdCBiZSA1MDAgY2hhcmFjdGVycyBvciBsZXNzLCBnb3QgJHtjb21tZW50Lmxlbmd0aH1gKTtcbiAgICB9XG4gIH1cbn0iXX0=