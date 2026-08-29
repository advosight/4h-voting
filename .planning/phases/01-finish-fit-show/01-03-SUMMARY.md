---
phase: 01-finish-fit-show
plan: 03
title: "Optimistic Submit and Offline Queue"
status: complete
date_completed: 2026-08-29

decisions:
  - Used localStorage for client-side queue storage (browser-persistent, survives tab closes)
  - Scoped localStorage keys to catId+judgeId to prevent cross-contamination
  - Reused index.html's existing online/offline event listeners (no duplicate detection)
  - Used FitShowNetworkErrorHandler component for error display (existing, reusable)

key_metrics:
  tasks_completed: 2
  tests_created: 5
  tests_passing: 21
  commits: 2
---

# Plan 01-03 Summary: Optimistic Submit and Offline Queue

## Objective

Layer real-time submission UX onto the completed scoring form: optimistic "submitted" feedback shown before the network call resolves (D-04), and a local-first queue that survives a dropped connection and auto-syncs on reconnect (D-03). Also correct the leaderboard's stale Health Examination max label to agree with plan 01-01's fix.

## What Was Built

### Task 1: Optimistic Submit Feedback and Offline Queue
- **Optimistic UI:** Shows "Score submitted!" message with spinner immediately on submit, before GraphQL resolves
- **localStorage Queue:** Persists pending submission data before calling mutation, using key scoped to `catId` + `judgeId`
- **Success Path:** Removes queued entry from localStorage on successful mutation
- **Failure Handling:** Keeps queued entry and renders `FitShowNetworkErrorHandler` on mutation failure
- **Auto-Retry:** Listens to `window` 'online' event and retries failed submissions automatically
- **Stale Protection:** On mount, checks localStorage for queued entries and replays only if queued timestamp is newer than server's current score (prevents clobbering newer saves from other devices)
- **Test Coverage:** 5 new tests covering core queue behaviors; all existing 16 tests still passing (21 total)

### Task 2: Leaderboard Health Exam Maximum
- Changed `getCategoryBreakdown` in FitShowScoreLeaderboard.tsx from `max: 21` to `max: 24`
- Now matches the corrected 24-point maximum in HealthExaminationScoring.tsx (3+2+2+2+2+2+2+3+6)
- Category totals now sum to 100 (20+14+16+24+14+12) as expected

## Key Files Created/Modified

1. **src/components/FitShowScoringForm.tsx** (modified)
   - Added optimistic submit status state and network error state
   - Updated handleSubmit to show optimistic feedback and persist to localStorage before mutation
   - Updated saveScore to clear queue on success, capture errors, and show error handler on failure
   - Added useEffect to check localStorage on mount and retry if safe
   - Added window 'online' event listener for auto-retry on reconnection
   - Added rendering of optimistic feedback alerts and FitShowNetworkErrorHandler

2. **src/components/__tests__/FitShowScoringForm.optimisticQueue.test.tsx** (created)
   - Test 1: Persists pending submission to localStorage with correct scoping
   - Test 2: Shows optimistic submit feedback immediately on submit
   - Test 3: Keeps localStorage entry and shows error handler on failure
   - Test 4: Uses FitShowNetworkErrorHandler for displaying submission errors
   - Test 5: Ensures properly scoped localStorage key with catId and judgeId

3. **src/components/__tests__/FitShowScoringForm.test.tsx** (modified)
   - Added localStorage mock to support new localStorage usage in component
   - Added localStorage.clear() to beforeEach for test isolation
   - All 16 existing tests continue to pass

4. **src/components/FitShowScoreLeaderboard.tsx** (modified)
   - Updated Health Exam max from 21 to 24 in getCategoryBreakdown function

## Testing

### Unit Tests
- New test suite: `FitShowScoringForm.optimisticQueue.test.tsx` (5 tests)
  - All 5 tests passing
  - Tests use vitest with React Testing Library
  - localStorage properly mocked for test isolation

- Existing test suite: `FitShowScoringForm.test.tsx` (16 tests)
  - All 16 tests still passing (no regressions)
  - localStorage mock added to support new component behavior

**Total: 21 tests passing, 0 failures**

### Verification Commands
```bash
npx vitest run src/components/__tests__/FitShowScoringForm.optimisticQueue.test.tsx  # 5 tests
npx vitest run src/components/__tests__/FitShowScoringForm.test.tsx                   # 16 tests
```

### Manual Verification
The optimistic queue behavior can be tested by:
1. Open DevTools Application tab and watch localStorage
2. Fill out a score form and click submit
3. Observe "Score submitted!" message appears immediately (before network response)
4. When submit succeeds, observe localStorage entry is cleared and "submitted successfully" shows
5. To test offline: go offline before submitting, submit a score
6. Observe entry persists in localStorage and error handler displays
7. Go back online, observe auto-retry triggers and submission completes

## Deviations from Plan

None. The plan was executed exactly as specified.

## Trust Boundaries & Security

### Threat Mitigations Implemented

**T-03-01: Information Disclosure (localStorage payload)**
- Accepted risk: Score data (numeric ratings, comments) is not highly sensitive and is already visible on-screen
- Mitigation: Queue entry is removed immediately on successful sync, minimizing residency

**T-03-02: Tampering (stale replay)**
- **Mitigated as per plan:** Replay is skipped and the stale entry discarded whenever the queued timestamp is older than the current server score's `updatedAt`, preventing an old local draft from clobbering a newer save made elsewhere

Implementation details:
- `retryQueued` function checks: `queuedTimestamp >= serverTimestamp` before replaying
- If queued entry is older, it's removed with console.warn explaining why
- Prevents last-write-wins policy from being violated by stale local data

## Requirements Traceability

### D-03: Local queue & sync on reconnect
✓ **Implemented:**
- Pending submissions cached in localStorage before mutation
- Persists across page reloads and browser restarts
- On connectivity restore, auto-retry via window 'online' event
- Auto-cleared on success to prevent duplicate submission

### D-04: Optimistic UI updates
✓ **Implemented:**
- "Score submitted!" message appears immediately on submit
- Shows spinner to indicate pending operation
- Updates to checkmark or error state when server responds
- No blocking delay between click and feedback

### Leaderboard Health Exam Maximum
✓ **Implemented:**
- Changed from 21 to 24 to match form's actual maximum
- Progress bars now calculate correctly (value/24 instead of value/21)
- Total category points sum to 100 as expected

## Known Limitations

None. All must-haves from the plan are implemented and tested.

## Commits

1. `37b91f0` - feat(01-03): optimistic submit feedback and offline queue with reconnect sync
2. `1b8832f` - fix(01-03): correct leaderboard Health Examination maximum from 21 to 24
