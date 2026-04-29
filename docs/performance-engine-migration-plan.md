# Performance Engine Migration Plan

This plan breaks the Athleticore OS overhaul into implementation phases. The app is still in development, so prefer clean replacement over long-lived compatibility shims when legacy logic conflicts with the target architecture.

## Phase 1: Foundation Domain Models and PerformanceState

Goals:

- Define `AthleteJourneyState`.
- Define `PerformanceState`.
- Define journey events and core domain types.
- Add adapter tests that compare the new state projection with current daily engine behavior.

Exit criteria:

- New types exist without changing app behavior.
- Existing daily athlete context can be represented as `PerformanceState`.
- Missing data is represented as unknown, not zero.

## Phase 2: Onboarding as Journey Initialization

Goals:

- Convert onboarding from isolated setup into athlete journey initialization.
- Store baseline athlete context, protected workouts, goals, body-mass context, nutrition context, and safety-relevant data as journey state.
- Replace fragile profile/planning boolean gates with journey-derived readiness for app entry.

Exit criteria:

- New athletes enter a continuous journey after onboarding.
- App flow no longer treats planning setup as a separate restart.
- First plan generation reads from journey/performance state.

## Phase 3: Phase Transition Engine and Fight Opportunity Engine

Goals:

- Add the Phase Controller.
- Add the Fight Opportunity Engine.
- Model tentative, confirmed, short-notice, canceled, rescheduled, and changed-weight-class fights.
- Separate fight opportunity state from camp state.

Exit criteria:

- Fight changes transition the journey instead of resetting it.
- Fight camps, weight-class plans, weekly plans, and dashboard summaries reference the active fight opportunity when applicable.
- Old direct profile-phase mutation is no longer the source of truth.

## Phase 4: Risk and Explanation Foundations

Goals:

- Establish the Risk and Safety Engine.
- Establish the Explanation Engine.
- Centralize safety constraints and decision traces.
- Make under-fueling, REDs-style risk, hydration risk, rapid weight-loss risk, pain, illness, and readiness constraints available to all engines.

Exit criteria:

- Major recommendations carry an explanation trace.
- Unsafe weight-class recommendations are blocked or capped.
- Missing safety data lowers confidence instead of being treated as safe.

## Phase 5: Adaptive Training Engine

Goals:

- Move weekly planning, protected workout handling, daily adaptation, missed session handling, and workout prescription behind the Adaptive Training Engine.
- Preserve protected workouts as non-negotiable anchors.
- Remove duplicate planning paths.

Exit criteria:

- One engine owns generated training plans.
- Calendar, Plan, Train, and Today consume the same training state.
- Superseded schedule generation paths are removed.
- Completed workouts are preserved during regeneration.

## Phase 6: Nutrition and Fueling Engine

Goals:

- Move calorie, macro, hydration, and session-fueling targets behind the Nutrition and Fueling Engine.
- Integrate phase, fight opportunity, readiness, training demand, body mass, and risk.
- Ensure body-mass guidances cannot bypass safety floors.

Exit criteria:

- One path resolves prescribed nutrition targets.
- Food actuals remain separate from prescribed targets.
- Dashboard and Fuel no longer create hidden target side effects on read.

## Phase 7: Body Mass and Weight-Class Management Engine

Goals:

- Move body-mass trends, weight-class strategy, competition body-mass planning, fight-week monitoring, and post-weigh-in recovery behind the Body Mass and Weight-Class Management Engine.
- Coordinate weight-class decisions with fight opportunities and weigh-in timing.

Exit criteria:

- Chronic weight goals and competition-week body-mass logistics are clearly separated.
- Changed fight date or weight class invalidates stale body-mass guidances, nutrition targets, and training assumptions.
- Safety gates prevent unsafe recommendations.

## Phase 8: Tracking and Readiness Engine

Goals:

- Consolidate check-ins, readiness scoring, data confidence, and stimulus constraints.
- Remove legacy readiness paths once the new engine is active.

Exit criteria:

- One readiness profile feeds training, nutrition, body mass, risk, and dashboard summaries.
- Missing data is explicitly tracked.
- Obsolete readiness tests are rewritten or removed.

## Phase 9: Unified Performance Engine Integration

Goals:

- Replace the current mixed daily athlete-summary orchestration with the Unified Performance Engine.
- Resolve `PerformanceState` once and pass it to specialist engines.
- Centralize performance-state recomputation and cache invalidation.
- Retire daily mission snapshot persistence instead of expanding it into a new public contract.

Exit criteria:

- Today, Plan, Train, Fuel, and Me are all driven by unified performance state.
- Invalidation covers onboarding, phase changes, fight changes, protected workout changes, readiness logs, body-mass logs, weight-class plan changes, food logs, and training outcomes.
- Legacy daily mission snapshots are archived or dropped; weekly plan `prescription_snapshot` remains only as a guided training-prescription contract.
- Old orchestration branches are removed.

## Phase 10: Dashboard and App-Flow Integration

Goals:

- Update UI hooks and screens to consume unified view models.
- Ensure dashboard summaries reflect the same state used by planning, nutrition, readiness, and body-mass engines.
- Make major recommendations explainable from every relevant surface.

Exit criteria:

- App entry, Today, Plan, Train, Fuel, and Me agree about phase, fight, readiness, nutrition, body mass, and risk.
- No screen depends on obsolete phase or setup logic.

## Phase 11: Legacy Removal and Regression Hardening

Goals:

- Remove superseded modules, stale helpers, unused imports, dead branches, compatibility fallbacks, and duplicate persistence paths.
- Rewrite tests that enforce obsolete behavior.
- Add regression tests for the new engine boundaries.

Exit criteria:

- `npm run quality` passes, or documented blockers are resolved before handoff.
- No directly superseded legacy system remains active beside the new system.
- Critical flows have coverage: onboarding, fight changes, protected workouts, weekly plan generation, food logging, nutrition targets, body-mass changes, weight-class safety, readiness, dashboard summaries, and guided workouts.

## Migration Rules

- Replace call sites when ownership moves to a new engine.
- Do not maintain old APIs solely to avoid touching callers.
- Do not run old and new systems in parallel for the same responsibility.
- Add characterization tests before risky replacements when current behavior matters.
- Remove obsolete tests when they only protect legacy behavior.
- Keep safety behavior conservative throughout migration.

## Repo Commands

Use these commands during implementation:

- `npm run lint`
- `npm run typecheck`
- `npm run typecheck:clean`
- `npm run test:engine`
- `npm run quality`
