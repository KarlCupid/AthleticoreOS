# Performance Engine Architecture

This document defines the target architecture for the Athleticore OS overhaul. The goal is to replace fragmented phase, scheduling, nutrition, readiness, and body-mass logic with one continuous performance state.

## Core Concept

The app should maintain an ongoing `AthleteJourneyState` and resolve it into a current `PerformanceState`.

`AthleteJourneyState` is the durable story of the athlete. It should include baseline onboarding data, major events, active goals, fight opportunities, plan history, training outcomes, nutrition trends, body-mass trends, readiness history, and risk signals.

`PerformanceState` is the current operational state used by the app. It should answer what the athlete is doing now, what constraints apply, what risks exist, what the plan should do next, and why.

## Target Data Flow

1. Onboarding initializes the athlete journey.
2. User actions and system observations append journey events or update canonical domain records.
3. The Unified Performance Engine resolves `PerformanceState`.
4. Specialist engines read the same `PerformanceState`.
5. Recommendations, plans, targets, and explanations are generated from one harmonized state.
6. UI surfaces consume view models derived from the unified state.

## Target Modules

### Athlete Journey Engine

Owns the continuous journey from sign-up onward.

Responsibilities:

- Initialize the athlete baseline from onboarding.
- Record major journey events.
- Preserve continuity across phase changes.
- Project the current journey state from historical events and canonical records.
- Treat missing data as unknown, not zero.

Example events:

- `OnboardingCompleted`
- `BuildPhaseStarted`
- `FightOpportunityCreated`
- `FightOpportunityConfirmed`
- `FightOpportunityRescheduled`
- `FightOpportunityCanceled`
- `FightWeightClassChanged`
- `CampStarted`
- `CompetitionWeekStarted`
- `RecoveryPhaseStarted`
- `WorkoutCompleted`
- `FoodLogged`
- `BodyMassLogged`
- `ReadinessLogged`
- `SafetyFlagRaised`

### Unified Performance Engine

The orchestration layer that resolves the current `PerformanceState` and coordinates specialist engines.

Responsibilities:

- Resolve current athlete context.
- Resolve phase and fight context.
- Resolve readiness, load, nutrition, body-mass, and risk context.
- Provide one source of truth for Today, Plan, Train, Fuel, and Me surfaces.
- Own recomputation and cache-invalidation rules when major context changes.
- Avoid treating retired daily mission snapshots as a public contract.

### PerformanceState

The canonical state object for planning and recommendations.

It should include:

- Athlete identity and baseline
- Current phase
- Active objective
- Active or pending fight opportunity
- Protected workouts
- Training load and recent completion
- Readiness profile and data confidence
- Nutrition and fueling state
- Body-mass and weight-class state
- Weigh-in logistics and post-weigh-in recovery state when applicable
- Risk and safety constraints
- Explanation trace

### Phase Controller

Owns phase transitions.

Responsibilities:

- Move athletes between build, camp, competition week, recovery, and other future phases.
- Preserve history and training context during transitions.
- Prevent phase changes from resetting the athlete journey.
- Coordinate with fight opportunities, body-mass management, adaptive training, and nutrition.

### Fight Opportunity Engine

Owns boxing fight uncertainty.

Responsibilities:

- Model tentative, confirmed, short-notice, canceled, rescheduled, and changed-weight-class fights.
- Distinguish fight opportunity state from fight camp state.
- Decide when a fight opportunity should affect training, nutrition, body mass, risk, and dashboard summaries.
- Preserve the journey when fights change instead of resetting plans.

### Adaptive Training Engine

Owns training planning and workout adaptation.

Responsibilities:

- Generate training plans from `PerformanceState`.
- Preserve protected workouts as anchors.
- Adapt strength, conditioning, roadwork, and recovery around boxing commitments.
- Respond to readiness, ACWR, missed sessions, phase changes, fight opportunities, and safety constraints.
- Avoid duplicate planning paths.

Existing pure modules such as schedule calculation, performance planning, workout session building, load safety, and session ownership are candidates for reuse if they remain compatible with the new state model.

### Nutrition and Fueling Engine

Owns calorie, macro, hydration, and session-fueling targets.

Responsibilities:

- Resolve daily targets from `PerformanceState`.
- Integrate training demand, phase, readiness, body-mass goals, camp context, and safety floors.
- Avoid unsafe under-fueling.
- Coordinate with body-mass guidance without letting scale-pressure logic override safety.
- Produce explanations for target changes.

### Food Logging Reliability Layer

Owns reliable food, water, and nutrition summary persistence.

Responsibilities:

- Make food logging idempotent and auditable.
- Preserve source-aware nutrition entries.
- Recalculate daily summaries consistently.
- Keep actuals separate from prescribed targets.
- Avoid read paths that unexpectedly mutate nutrition state.

### Tracking and Readiness Engine

Owns check-ins, readiness interpretation, and training constraints.

Responsibilities:

- Convert check-ins and recent history into readiness profiles.
- Track data confidence and missing data.
- Detect neural, structural, metabolic, sleep, soreness, pain, and cycle-related constraints.
- Feed readiness into training, nutrition, risk, and explanations.

### Body Mass and Weight-Class Management Engine

Owns body-mass trends, weight-class strategy, competition body-mass planning, fight-week monitoring, and post-weigh-in recovery.

Responsibilities:

- Separate chronic body-composition goals from competition-week body-mass monitoring and weigh-in logistics.
- Track effective weight, trend, target, rate of change, and uncertainty.
- Coordinate with fight opportunities and weigh-in timing.
- Enforce safety limits and escalation rules.
- Avoid unsafe recommendations when data is missing or risk is high.

### Risk and Safety Engine

Owns cross-domain safety decisions.

Responsibilities:

- Centralize safety rules for load, readiness, under-fueling, hydration, pain, rapid weight loss, and acute symptoms.
- Screen for REDs-style and under-fueling risk.
- Produce hard stops, caps, warnings, and confidence levels.
- Make safety constraints available to every specialist engine.

### Explanation Engine

Owns athlete-facing reasoning.

Responsibilities:

- Convert decision traces into concise explanations.
- Explain changes in training, nutrition, phase, fight handling, body-mass plans, and recovery.
- Surface data confidence and missing-data caveats.
- Keep explanations consistent across Today, Plan, Train, Fuel, and Me.

## Persistence Direction

The long-term persistence model should separate:

- Journey events and canonical domain records
- Current projected state
- Generated plans and prescriptions
- User logs and outcomes
- Explanations and decision traces

Persisted projections should exist only when they have a clear owner and invalidation rule. Weekly plan prescription snapshots may remain a training-execution contract. Retired daily mission snapshot persistence, including `daily_engine_snapshots` and `weekly_plan_entries.daily_mission_snapshot`, is not part of the target architecture; app-facing performance state should be resolved from canonical records through the Unified Performance Engine and its presentation view models.

## Legacy Boundary

Existing modules under `lib/engine`, `lib/api`, `src/hooks`, and `src/screens` should be migrated behind the target engines in stages. Strong pure functions can survive. Mixed orchestration services should usually be split or replaced.

Do not leave old and new systems active for the same responsibility.
