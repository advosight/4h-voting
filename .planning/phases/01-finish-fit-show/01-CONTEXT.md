# Phase 1: Finish the Fit & Show - Context

**Gathered:** 2026-08-28  
**Status:** Ready for planning

## Phase Boundary

Complete fit & show scoring interface and display for participant evaluation. This phase delivers the full scoring flow including real-time updates, mobile-optimized forms, and score finalization/locking for judges during a 4-H event.

## Implementation Decisions

### Real-Time Updates & Multiplayer Scoring
- **D-01:** Live updates via WebSocket/AppSync subscription — when one judge submits or updates a fit & show score, all other judges' screens auto-update immediately.
- **D-02:** Last-write-wins conflict resolution — if two judges edit the same participant's score simultaneously, the most recent submission overwrites earlier one.
- **D-03:** Local queue & sync on reconnect — unsaved changes are cached locally; when connection returns, changes auto-sync to server without losing work.
- **D-04:** Optimistic UI updates — on submit, show "Score submitted!" confirmation immediately with spinner, then update when server acknowledges.

### Mobile Responsiveness
- **D-05:** Full single-column layout on all mobile devices (portrait and landscape) — all scoring criteria, labels, and fields stack vertically for simplicity and tap-friendly interaction.
- **D-06:** Floating action button for submit/save — primary action is a FAB overlaid on the form, giving judges quick access without scrolling.
- **D-07:** 48x48px minimum touch target size (Material Design standard) for all interactive elements on mobile.
- **D-08:** Allow zoom (user choice) — set viewport maximum-scale=5.0 so judges can pinch-zoom if they need larger text or controls.

### Score Finalization & State Management
- **D-09:** Scores are editable until admin locks them — judges can revise their submitted scores anytime; admin action (manual button click) locks all scores at event end to prevent changes.
- **D-10:** Visual state indicators: Draft scores show orange border + "Draft" badge; Finalized scores show green border + checkmark. Clear at a glance.
- **D-11:** Admin override with audit trail — admins can edit a finalized judge's score, but the change is logged (who, when, from/to values) for accountability.
- **D-12:** Manual admin action to finalize all scores — admin clicks "Finalize Scoring" button to lock all submitted scores. No automatic cutoff time; manual control is required.

### Claude's Discretion
None — all decisions were made by the user.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Fit & Show Feature Architecture
- `.planning/ROADMAP.md` — Phase 1 goal and dependencies
- `.planning/STATE.md` — Project state and recommendations

### Existing Implementation
- `src/pages/FitShowScoringPage.tsx` — Main scoring interface page; shows participant grid and scoring entry points
- `src/pages/FitShowScorePage.tsx` — Individual participant scoring form
- `src/components/FitShowScoringForm.tsx` — Scoring form component (reusable)
- `src/components/FitShowScoringErrorBoundary.tsx` — Error handling for fit & show scoring
- `src/components/FitShowScoreLeaderboard.tsx` — Real-time leaderboard display
- `src/components/FitShowScoreNotifications.tsx` — Notification system for score updates

### Testing & Validation
- `src/__tests__/concurrent-fit-show-scoring.integration.test.tsx` — Tests for concurrent scoring scenarios
- `src/__tests__/realtime-fit-show-scoring.integration.test.tsx` — Real-time update tests
- `src/__tests__/end-to-end-fit-show-scoring.integration.test.tsx` — End-to-end scoring workflows

### Responsive Design Utilities
- `src/contexts/ResponsiveContext.tsx` — Responsive breakpoints and device detection
- `src/components/ResponsiveForm.tsx` — Responsive form wrapper for mobile optimization
- `src/utils/mobileDetection.ts` — Mobile device detection utilities

### Error Handling & Utilities
- `src/utils/fitShowErrorHandling.ts` — Fit & show specific error handling
- `src/utils/errorHandling.ts` — General error handling patterns
- `src/utils/accessibilityAudit.ts` — Accessibility audit utilities

## Existing Code Insights

### Reusable Assets
- **FitShowScoringForm component**: Existing form component for scoring — can be adapted for the new real-time/mobile decisions.
- **AppSync real-time subscriptions**: Already integrated in the codebase (based on imports from `aws-amplify/api`). Can be leveraged for live updates.
- **ResponsiveContext**: Existing responsive context provider — integrates with mobile layout decisions to detect orientation and screen size.
- **Error boundary pattern**: `FitShowScoringErrorBoundary` shows robust error handling already in place.

### Established Patterns
- **Service Worker**: Project already has PWA setup (`src/utils/serviceWorker.ts`) — can support offline queue for unsaved changes.
- **Real-time leaderboard**: `FitShowScoreLeaderboard` already supports real-time updates and refresh intervals; provides a foundation for live score propagation.
- **Responsive grid layout**: App uses Material UI Grid with breakpoints — established pattern for responsive design.

### Integration Points
- **Routing**: `src/App.tsx` has routes for `/fit-show-score/:catId` and `/fit-show-score/cage/:cageNumber` — entry points for scoring.
- **Authentication**: Routes are protected with `ProtectedRoute` component requiring judge/admin roles.
- **GraphQL API**: Queries for `getCat`, `getCatByCage`, `listAllFitShowScores` are already defined.

## Specific Ideas

- Judges should see immediate visual feedback when submitting (optimistic updates keep the UX snappy).
- Mobile landscape should NOT change to multi-column — keep single-column for consistency with portrait.
- The FAB for submit should be at bottom-right corner, visible at all times but not overlapping critical form content.
- Audit trail for admin overrides should be viewable in a score history/changelog, not just logged silently.

## Deferred Ideas

- **TV mode display for fit & show scores** — not required for Phase 1; can be added in a future phase once scoring is complete.
- **Email notifications when scores are finalized** — out of scope for this phase; belongs in a notification/alert phase.
- **Scoring history/version control** — admin override audit trail is captured, but viewing full score change history (all edits) can be deferred to a future reporting phase.

---

*Phase: 1-finish-fit-show*  
*Context gathered: 2026-08-28*
