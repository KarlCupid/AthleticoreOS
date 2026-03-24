# Athleticore OS - Architecture & Product Context

Read `STATE.md` first for the current direction. This file explains how the codebase is organized today.

Athleticore OS is an athlete operating system for combat-sports training. The product is built around a shared daily engine state that turns planning, readiness, nutrition, hydration, workload, and weight-management data into one actionable mission.

## Product shape

- Primary experience: authenticated athlete dashboard plus planning and execution flows.
- Goal modes: `build_phase` and `fight_camp`.
- Core loop: auth -> onboarding -> planning setup -> rolling schedule + daily engine -> dashboard and plan execution -> logs and snapshots.
- Main surfaces:
  - `Home`: dashboard, day detail, activity log, logging.
  - `Plan`: weekly plan, workouts, calendar, nutrition, weight-cut, review.
  - `Profile`: settings/profile.
  - Internal-only replay inspection: `Engine Replay Lab` from the hidden Profile version-tap entry.

## Current architecture

### App shell

`App.tsx` decides between:

- `AuthScreen`
- `OnboardingScreen`
- `PlanningSetupStackNavigator`
- `TabNavigator`

That decision depends on Supabase auth, the existence of an athlete profile, and `getPlanningSetupStatus`.

### Navigation

- `src/navigation/HomeStack.tsx`: dashboard and logging flows.
- `src/navigation/PlanStack.tsx`: weekly plan, workouts, nutrition, calendar, weight-cut, and review flows.
- `src/navigation/PlanningSetupStack.tsx`: setup gate before the main app.
- `src/navigation/TabNavigator.tsx`: bottom-tab shell.

### Data ownership

- `lib/engine/*`: deterministic calculations and domain rules.
- `lib/api/*`: Supabase access plus orchestration around engine inputs/outputs.
- `src/hooks/*`: screen-oriented assembly of service results and UI state.
- `src/screens/*`: final product surfaces.

## Runtime concepts that matter

### Planning setup is enforced

Users are not fully admitted into the app until they have:

- an athlete profile
- availability windows
- an active mode record for the current goal mode

Legacy usage can satisfy the gate for older accounts.

### Daily engine state is the center of the app

`lib/api/dailyMissionService.ts` resolves, in order:

- objective context
- ACWR
- readiness profile and stimulus constraints
- cut protocol
- nutrition targets
- hydration
- workout prescription
- camp risk
- final mission

This state is what powers the dashboard and much of the planning UI.

### Snapshot persistence is part of the contract

Engine outputs are persisted in `daily_engine_snapshots` and mirrored into `weekly_plan_entries.daily_mission_snapshot`. If mission or engine shapes change, you need to consider persistence and reuse paths, not just the local caller.

### Intervention logic is engine-driven

There is no separate `interventionService` at the moment. Safety and intervention behavior are embedded in the mission engine and related cut/risk calculations, especially in `lib/engine/calculateMission.ts`, `lib/engine/calculateWeightCut.ts`, and the orchestration in `lib/api/dailyMissionService.ts`.

### Guided sessions have ownership rules

Weekly plan entries can supply engine-owned prescriptions that flow into workout execution. The ownership rules live in `lib/engine/sessionOwnership.ts`.

### Replay lab is now a first-class internal debugging surface

`src/components/EngineReplayLab.tsx` is the current internal inspection tool for understanding how the engine behaves over a full block. It reuses `lib/engine/simulation/lab.ts` and `lib/engine/simulation/runner.ts` rather than a separate visualization-only simulator.

Current replay lab capabilities include:

- deterministic seeded block replay
- week/day browsing instead of a single long day list
- chart focus controls with 7/14/28/all windows plus pan/center actions
- run-level readiness, weight, calories, and load charts with summary stats
- selected-day inspection tabs for overview, workout, fuel, and decisions
- full prescribed-vs-logged S&C inspection
- dedicated conditioning prescription and simulated conditioning log views

If you change simulation output shape, you usually need to update both the replay adapter in `lib/engine/simulation/lab.ts` and the replay UI in `src/components/EngineReplayLab.tsx`.

## Directory guide

- `src/screens`: user-visible surfaces.
- `src/components`: shared UI blocks.
- `src/components/EngineReplayLab.tsx`: internal replay and engine inspection surface.
- `src/navigation`: tab and stack definitions.
- `src/hooks`: orchestration hooks like `useDashboardData`, `useWeeklyPlan`, and workout hooks.
- `src/theme`: theme tokens and readiness-aware theming.
- `src/context`: shared runtime UI contexts.
- `lib/api`: service layer for athlete context, planning, mission, schedules, nutrition, fight camp, weight, and weight cut.
- `lib/engine`: deterministic business logic.
- `lib/engine/presentation`: engine-to-copy mapping for summaries and semantic presentation.
- `lib/engine/simulation`: persona library, runner, and reporting.
- `supabase/migrations`: schema history.

## Files that matter most

1. `App.tsx`
   Entry gate and provider tree.
2. `lib/api/dailyMissionService.ts`
   Main daily engine orchestration path.
3. `src/hooks/useDashboardData.ts`
   Dashboard state assembly and refresh behavior.
4. `lib/api/weeklyPlanService.ts` and `src/screens/WeeklyPlanScreen.tsx`
   Weekly planning, mission reuse, and plan execution entry points.
5. `lib/engine/index.ts` and `lib/engine/types.ts`
   Export surface and shared engine contracts.
6. `lib/engine/simulation/runner.ts`, `lib/engine/simulation/lab.ts`, and `src/components/EngineReplayLab.tsx`
   Deterministic replay generation, replay view-model mapping, and internal engine inspection UI.

## Editing guidance

- Prefer fixing behavior in the engine or service layer when multiple screens depend on it.
- Reuse shared engine types instead of redefining API or UI-only variants.
- Treat snapshots and mirrored mission fields as public contracts inside the app.
- Preserve the auth/profile/planning gate unless the task explicitly targets it.
- If the code path is mode-sensitive, check both `build_phase` and `fight_camp`.
- For replay-lab work, do not fork engine logic for visualization. Reuse engine outputs and add adapter/view-model fields instead.

## Validation guidance

- Engine logic: start with `lib/engine/*.test.ts`
- Deterministic changes: run `npm run test:engine`
- Structural changes: also run `npm run lint`, `npm run typecheck`, and `npm run typecheck:clean`
- Higher-risk engine changes: use the simulation tooling in `scripts/run-simulation.ts` and `lib/engine/simulation/*`
- In practice, `npm run test:engine` is the dependable gate today for replay and engine work. Full typecheck is known to have pre-existing failures, so use targeted transpile or replay smoke checks when touching replay UI.
