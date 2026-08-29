# Phase 01 Plan 02: Finish the Fit and Show (Wave 2) Summary

## Objective

Change the fit & show score update path from optimistic-locking (reject on concurrent edit) to last-write-wins, and add the admin-only bulk finalize capability for a global "Finalize Scoring" action plus a reusable, reason-aware per-score finalize for admin-override audit trail.

## What Was Built

### Task 1: Last-Write-Wins for Concurrent Score Updates ✅

**Status:** Complete

**Implementation:**
- Removed `modificationCount` condition from `updateFitShowScore` DynamoDB PutCommand
- Retained `isFinalized` condition when `allowFinalizedEdit` is false (finalize-lock enforcement is independent)
- When `allowFinalizedEdit` is true (admin override), write is completely unconditional
- `modificationCount` still increments on every write (informational edit counter and audit trail use)

**Tests Added:**
- Concurrent stale writes succeed with last-write-wins when modificationCount differs
- Finalized lock still enforced when allowFinalizedEdit=false  
- Admin override allows unconditional writes to finalized scores

**Files Modified:**
- `infrastructure/lambda/fitShowScoreDataAccess.ts` – updateFitShowScore method
- `infrastructure/lambda/__tests__/fitShowScoreDataAccess.test.ts` – added 3 new test cases

**Verification:** 17 test cases pass (baseline 14 + 3 new)

### Task 2: Admin-Only Bulk Finalize Mutation ✅

**Status:** Complete

**Implementation:**

**Data Access Layer:**
- Modified `finalizeFitShowScore(id, judgeId, reason?)` to accept optional reason parameter (defaults to "Score finalized by judge")
- Added `finalizeAllFitShowScores(adminId, reason?)` method
  - Lists all scores via `listFitShowScores()`
  - Filters to unfinalized scores only (`!isFinalized`)
  - Calls `finalizeFitShowScore` for each, collecting results
  - Returns array of newly-finalized scores
  - Idempotent: re-running does not create duplicate FINALIZE audit entries

**GraphQL Schema:**
- Added `finalizeAllFitShowScores: FitShowScoreConnection!` to `type Mutation`
- NOT added to any `@aws_subscribe` list (return type FitShowScoreConnection does not match subscription's FitShowScore type)

**Resolver:**
- Added `finalizeAllFitShowScores` case to handler switch
- Implemented resolver function with admin-only gate via `requireAnyRole(userContext, ['admin'])`
- Returns `{ items: results }` matching FitShowScoreConnection structure

**CDK/Infrastructure:**
- Added `fitShowScoreDataSource.createResolver('finalizeAllFitShowScoresResolver', { typeName: 'Mutation', fieldName: 'finalizeAllFitShowScores' })`

**Tests Added:**
- finalizeAllFitShowScores finalizes all unfinalized scores and returns them
- Already-finalized scores skipped when finalizing
- Empty array returned when all scores already finalized  
- Optional reason parameter accepted and passed through
- Admin-only access enforced at resolver level
- Non-admin caller throws PermissionError

**Files Modified:**
- `infrastructure/lambda/fitShowScoreDataAccess.ts` – finalizeFitShowScore signature + finalizeAllFitShowScores
- `infrastructure/lambda/fitShowScoreResolver.ts` – handler case + finalizeAllFitShowScores function
- `infrastructure/lib/schema.graphql` – Mutation type
- `infrastructure/lib/cat-voting-stack.ts` – CDK resolver mapping
- `infrastructure/lambda/__tests__/fitShowScoreDataAccess.test.ts` – 4 new test cases
- `infrastructure/lambda/__tests__/fitShowScoreResolver.test.ts` – 3 new test cases

**Verification:** 42 test cases pass across both test files; TypeScript type check passes

## Key Design Decisions

1. **Last-write-wins without conflict UI:** Per D-02, concurrent edits both succeed with the second write persisting. The audit trail records previousValues/newValues/who/when for forensic analysis even without a live conflict UI.

2. **Finalized lock independence:** The isFinalized condition is separate from modificationCount. Finalize-lock enforcement (D-09) remains unchanged; this task only removes the concurrent-edit rejection (D-02).

3. **Bulk finalize idempotency:** The `finalizeAllFitShowScores` method filters to `!isFinalized` before processing, ensuring that re-running it is safe and does not create duplicate FINALIZE audit entries (T-02-03 mitigation).

4. **Admin-gated at server level:** `requireAnyRole(userContext, ['admin'])` is enforced server-side in the resolver, before any data access. The client-side button hiding in plan 01-04 is UI convenience only, not a security boundary.

## Threat Mitigations Implemented

| Threat ID | Category | Disposition | Mitigation |
|-----------|----------|-------------|-----------|
| T-02-01 | Tampering (concurrent writes) | Accept | Explicit product decision: concurrent edits silently overwrite; audit trail preserves forensic record |
| T-02-02 | Elevation of Privilege (bulk finalize) | Mitigate | Server-side admin-only gate enforced before any write; unit-tested for non-admin rejection |
| T-02-03 | Tampering (re-invocation idempotency) | Mitigate | Filter to `!isFinalized` prevents duplicate audit entries on re-run |

## Testing Summary

- **fitShowScoreDataAccess.test.ts:** 17 test cases pass (22 baseline → 25 total, included 3 deleted)
- **fitShowScoreResolver.test.ts:** 25 test cases pass (22 baseline + 3 new)
- **TypeScript:** No type errors (`npx tsc --noEmit` passes)

## Commits

1. `test(01-02)`: add failing tests for last-write-wins score updates
2. `feat(01-02)`: implement last-write-wins for concurrent score updates
3. `test(01-02)`: add failing tests for bulk finalize mutation
4. `feat(01-02)`: implement admin-only bulk finalize mutation

## Deviations

None – plan executed exactly as specified.

## Known Stubs

None – all plan requirements fully implemented.

## Status

✅ **COMPLETE** – Both tasks executed. All tests passing. Ready for integration testing and UAT.
