# 4H Voting - Roadmap

## Milestone 1: Core Voting Features

### Phase 1: Finish the fit and show

**Goal:** Complete fit and show scoring interface and display for participant evaluation —
full scoring flow across all six judging categories, real-time multi-judge updates,
mobile-optimized forms, and admin-controlled score finalization/override with an audit
trail.

**Depends on:** None

**Plans:** 5/5 plans executed

- [x] 01-01-PLAN.md — Complete FitShowScoringForm (all six categories), judge score
      editing, and live subscription updates to the scoring grid

- [x] 01-02-PLAN.md — Backend: last-write-wins conflict resolution + admin-only bulk
      finalize mutation

- [x] 01-03-PLAN.md — Optimistic submit UX + offline queue/reconnect sync + leaderboard
      category-max fix

- [x] 01-04-PLAN.md — Admin "Finalize All Scores" action, finalized-score override with
      audit reason, and audit-history changelog viewer

- [x] 01-05-PLAN.md — Mobile: floating action button, guaranteed single-column layout,
      48x48px touch targets, pinch-zoom support

---

### Phase 2: Type class judging pages

**Goal:** Create type class judging pages for the voting application.

**Depends on:** Phase 1

**Plans:**

- [ ] Implementation

---

## Accumulated Context

(Project context and decisions will accumulate here)

### Phase 02.1: Make a way to archive the current contestants, allowing a new event to take place while making it possible to switch back to a previous one (INSERTED)

**Goal:** Create a system for managing multiple 4-H events within the same application. Admins
can archive the current contest (all cats and scores), start a fresh event for judging, and
switch back to any previous event at any time. Judges always work in whichever event the
admin has marked as active.
**Requirements**: D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08, D-09, D-10, D-11, D-12
**Depends on:** Phase 2
**Plans:** 3 plans

Plans:

- [ ] 02.1-01-PLAN.md — Event Management API: Event GraphQL type, EventDataAccess,
      eventResolver.ts, and CDK wiring for getActiveEvent/listEvents/archiveAndCreateEvent/
      switchActiveEvent/onActiveEventChange
- [ ] 02.1-02-PLAN.md — eventId stamping/filtering across Cat, Score, ClassScore,
      FitShowScore, and their audit trails, plus the one-time production backfill script
- [ ] 02.1-03-PLAN.md — EventContext, EventSelector, ArchiveEventDialog, and App.tsx
      remount-on-switch wiring for real-time, no-reload event switching
