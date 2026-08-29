# 4H Voting - Roadmap

## Milestone 1: Core Voting Features

### Phase 1: Finish the fit and show
**Goal:** Complete fit and show scoring interface and display for participant evaluation —
full scoring flow across all six judging categories, real-time multi-judge updates,
mobile-optimized forms, and admin-controlled score finalization/override with an audit
trail.

**Depends on:** None

**Plans:** 5 plans
- [ ] 01-01-PLAN.md — Complete FitShowScoringForm (all six categories), judge score
      editing, and live subscription updates to the scoring grid
- [ ] 01-02-PLAN.md — Backend: last-write-wins conflict resolution + admin-only bulk
      finalize mutation
- [ ] 01-03-PLAN.md — Optimistic submit UX + offline queue/reconnect sync + leaderboard
      category-max fix
- [ ] 01-04-PLAN.md — Admin "Finalize All Scores" action, finalized-score override with
      audit reason, and audit-history changelog viewer
- [ ] 01-05-PLAN.md — Mobile: floating action button, guaranteed single-column layout,
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
