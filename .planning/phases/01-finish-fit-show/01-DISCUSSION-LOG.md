# Phase 1: Finish the Fit & Show - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-28  
**Phase:** 01-finish-fit-show  
**Areas discussed:** Real-time updates, Mobile responsiveness, Score finalization flow

---

## Real-Time Updates & Multiplayer Scoring

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, live updates (Recommended) | Use real-time subscriptions (WebSocket/AppSync) to push score changes to all connected clients. Judges see others' work instantly. | ✓ |
| Polling only | Judges manually refresh or app polls every N seconds. Simpler to implement, less resource-intensive. | |
| Notify, don't auto-update | Show a notification that new scores are available, but let judges choose when to refresh. | |

**User's choice:** Yes, live updates (Recommended)  
**Notes:** Chosen for collaborative scoring environment where judges benefit from seeing others' work in real-time.

### Concurrent Edit Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Last write wins | Most recent submission overwrites earlier one. Simpler but can lose data silently. | ✓ |
| First submission locks it | First judge to submit locks the score; second judge gets a 'score already finalized' error and must refresh. | |
| Merge approaches | Combine updates intelligently (e.g., if they edited different scoring criteria, merge both changes). | |

**User's choice:** Last write wins  
**Notes:** Simpler conflict resolution strategy chosen for implementation.

### Offline Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Local queue & sync on reconnect | Save changes locally, auto-sync when connection returns. Judges don't lose work. | ✓ |
| Discard & start over | Clear the form; judge re-enters scores when back online. Simpler but can be frustrating. | |
| Warn & prevent scoring | Block scoring interface if no connection. Force judges to complete when online. | |

**User's choice:** Local queue & sync on reconnect  
**Notes:** Preserves judge work and provides best UX during temporary connectivity issues.

### Submit Feedback

| Option | Description | Selected |
|--------|-------------|----------|
| Optimistic update + spinner | UI confirms immediately ('Score submitted!'), spinner shows until server confirms. Instant feedback, feels fast. | ✓ |
| Spinner until confirmed | Button disables, spinner shows, then confirmation appears once server acknowledges. More cautious, less frustrating than failure. | |
| You decide | Choose what feels right for the judge experience. | |

**User's choice:** Optimistic update + spinner  
**Notes:** Chosen for better perceived performance and immediate feedback to judges.

---

## Mobile Responsiveness

| Option | Description | Selected |
|--------|-------------|----------|
| Full single-column (Recommended) | All scoring criteria, buttons, and labels stack vertically. Easier to tap on mobile, optimized for portrait. | ✓ |
| Two-column on landscape | Portrait stays single-column, but landscape uses two columns to use screen space. More complex but better UX. | |
| Adaptive grid | Always try to fit 2-3 criteria per row if space allows, scale down as needed. Maximum flexibility. | |

**User's choice:** Full single-column (Recommended)  
**Notes:** Simplicity chosen over attempting landscape optimization; single-column works well on all orientations.

### Action Button Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Sticky footer (Recommended) | Buttons stay fixed at bottom of screen, always accessible. Judge doesn't need to scroll to submit. | |
| Bottom of form | Buttons scroll with content. Standard pattern but requires scrolling back up if form is long. | |
| Floating action button | Single FAB (e.g., circular 'Submit' button) overlays the form. Minimal but may obscure content. | ✓ |

**User's choice:** Floating action button  
**Notes:** Chosen for minimal screen space usage and quick access without scrolling.

### Touch Target Sizing

| Option | Description | Selected |
|--------|-------------|----------|
| 44x44px (iOS guideline) | Standard from iOS Human Interface Guidelines. Comfortable for most users. | |
| 48x48px (Material Design) | Material Design's recommended minimum. Slightly larger, more accessible. | ✓ |
| Auto-scale per device | Adapt to device capability — larger on older phones with smaller screens, standard on modern phones. | |

**User's choice:** 48x48px (Material Design)  
**Notes:** Standard Material Design size chosen for consistency with existing app design system.

### Zoom Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Allow zoom (User choice) | Set maximum-scale=5.0 in viewport. Judges can pinch-zoom if they need larger text or controls. | ✓ |
| Prevent zoom | Set user-scalable=no. Form always fits viewport, faster interaction, but less flexibility. | |
| You decide | I'll choose what makes sense. | |

**User's choice:** Allow zoom (User choice)  
**Notes:** Chosen for flexibility; judges who need larger text can zoom without restriction.

---

## Score Finalization & State Management

| Option | Description | Selected |
|--------|-------------|----------|
| Editable until admin locks it (Recommended) | Judge can revise their score anytime. Admin (at event end) locks all scores to prevent changes. | ✓ |
| One-time submit only | Once submitted, score is immutable. Judge can't edit. Prevents accidental overwrites. | |
| Time-window edit | Judge can edit within 5 minutes of submission, then it locks. Balances flexibility with data integrity. | |

**User's choice:** Editable until admin locks it (Recommended)  
**Notes:** Chosen for judge flexibility while maintaining admin control at event end.

### Visual State Indication

| Option | Description | Selected |
|--------|-------------|----------|
| Color + badge (Recommended) | Draft: orange border + 'Draft' badge. Finalized: green border + checkmark. Clear at a glance. | ✓ |
| Opacity difference | Finalized scores appear slightly faded/dimmed. Draft scores are full opacity. Subtle but might be missed. | |
| Icon overlay | Small icon in corner (pencil for draft, lock for finalized). Minimal visual change, compact. | |

**User's choice:** Color + badge (Recommended)  
**Notes:** Chosen for clarity; judges and admins can immediately see which scores are draft vs. finalized.

### Admin Override Capability

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, but with audit trail (Recommended) | Admin can edit, but the change is logged (who changed it, when, from what to what). Allows corrections while maintaining accountability. | ✓ |
| No, immutable once finalized | Once a judge finalizes, it's locked for everyone including admins. Forces judges to get it right the first time. | |
| Yes, full override | Admin can change any finalized score without restrictions or logging. Maximum flexibility, minimal oversight. | |

**User's choice:** Yes, but with audit trail (Recommended)  
**Notes:** Chosen for balance between flexibility and accountability. Admins can correct scoring errors while maintaining a full audit trail.

### Event Finalization Trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Manual admin action (Recommended) | Admin clicks 'Finalize Scoring' button. Admin has full control when scores lock. | ✓ |
| Automatic at event end time | System automatically locks all scores at a configured event end time. No manual step needed. | |
| Both options available | Admin can lock manually anytime, or system auto-locks at event time. Most flexible. | |

**User's choice:** Manual admin action (Recommended)  
**Notes:** Chosen for admin control; ensures finalization happens when admin is ready, not on a timer.

---

## Claude's Discretion

None — all implementation decisions were made by the user.

## Deferred Ideas

- **TV mode display for fit & show scores** — Noted for consideration in a future phase after core scoring is complete.
- **Email notifications when scores are finalized** — Out of scope; belongs in a notification/alert phase.
- **Scoring history/version control** — Audit trail for admin overrides will be logged, but full score change history viewing can be deferred to a future reporting/analytics phase.

---

*Discussion conducted: 2026-08-28*  
*Next steps: Plan phase (gsd-plan-phase 1)*
