# Athleticore OS - Architecture, Product, and Design Context

Read `STATE.md` first for the current direction. This file explains how the codebase is organized today and how the product is meant to feel.

Athleticore OS is an athlete operating system for combat-sports training. The product is built around a shared daily engine state that turns planning, readiness, nutrition, hydration, workload, and weight-management data into one actionable mission.

## Product shape

- Primary experience: authenticated athlete dashboard plus planning, fueling, and execution flows.
- Goal modes: `build_phase` and `fight_camp`.
- Core loop: auth -> onboarding -> planning setup -> rolling schedule plus daily engine -> dashboard and plan execution -> logs and snapshots.
- Main surfaces:
  - `Today`: dashboard, day detail, logging, and activity history.
  - `Train`: workout home, active training, guided sessions, exercise discovery, and summaries.
  - `Plan`: weekly plan, calendar, weekly review, and workout detail.
  - `Fuel`: nutrition, food search, barcode scanning, weight-cut home, cut-plan setup, fight-week protocol, and rehydration.
  - `Me`: profile and settings.
  - Internal-only replay inspection: `Engine Replay Lab` from the hidden Me/Profile version-tap entry.

## Current design system

The visual system now has a clear separation between app chrome, content surfaces, and stateful accents.

### App chrome is fixed

- The root shell uses `APP_CHROME.background` with `AuroraBackground` rendered once behind the app.
- Navigation is transparent over the root background rather than each screen painting its own full-screen theme.
- The bottom tab shell uses a dark, elevated treatment with `APP_CHROME.accent` for the active state.

### Surfaces are dark and layered

- The default surface language is dark translucent cards using `COLORS.surface`, `COLORS.surfaceElevated`, and border tokens from `src/theme/theme.ts`.
- `Card` is the preferred content surface component.
- The old `GlassCard` primitive has been removed; new surfaces should use `Card` or theme tokens.

### Readiness is scoped, not global

- Screen chrome should not shift by readiness level.
- Readiness colors are reserved for readiness-specific components, charts, and intervention cues.
- Semantic feedback for notes and coaching states should prefer `SEMANTIC_PALETTE` over painting entire surfaces with readiness colors.

### Typography is mode-aware

- `TYPOGRAPHY_V2.plan` is the preferred system for planning, review, replay, and general product reading.
- `TYPOGRAPHY_V2.focus` is for larger, arm's-length workout and gym-floor interactions.
- Legacy `TYPOGRAPHY` remains for backward compatibility, but new UI should not expand its footprint.

### Interaction modes matter

- `InteractionModeContext` exposes `standard`, `focus`, and `gym-floor` behavior.
- Gym-floor mode hides bottom navigation and uses larger tap targets and denser action affordances.
- Tap-target guidance lives in `TAP_TARGETS` inside `src/theme/theme.ts`.

For the practical contributor rules, read `DESIGN_SYSTEM.md`.

## Current architecture

### App shell

`App.tsx` decides between:

- `AuthScreen`
- `OnboardingScreen`
- `PlanningSetupStackNavigator`
- `TabNavigator`

That decision depends on Supabase auth, the existence of an athlete profile, and `getPlanningSetupStatus`.

### Navigation

- `src/navigation/TodayStack.tsx`: dashboard, day detail, logs, and quick logging flows.
- `src/navigation/TrainStack.tsx`: training home, active workouts, guided workouts, exercise search, and summaries.
- `src/navigation/PlanStack.tsx`: weekly planning, calendar, review, and workout detail flows.
- `src/navigation/FuelStack.tsx`: nutrition and weight-cut flows.
- `src/navigation/MeStack.tsx`: profile and settings.
- `src/navigation/PlanningSetupStack.tsx`: setup gate before the main app.
- `src/navigation/TabNavigator.tsx`: bottom-tab shell.

### Data ownership

- `lib/engine/*`: deterministic calculations and domain rules.
- `lib/api/*`: Supabase access plus orchestration around engine inputs and outputs.
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

This state powers the dashboard and much of the planning, fueling, and training UI.

### Snapshot persistence is part of the contract

Engine outputs are persisted in `daily_engine_snapshots` and mirrored into `weekly_plan_entries.daily_mission_snapshot`. If mission or engine shapes change, consider persistence and reuse paths, not just the local caller.

### Intervention logic is engine-driven

There is no separate `interventionService` at the moment. Safety and intervention behavior is coordinated through the Unified Performance Engine, Risk and Safety Engine, Body Mass and Weight-Class Management Engine, and the orchestration in `lib/api/dailyMissionService.ts`.

### Guided sessions have ownership rules

Weekly plan entries can supply engine-owned prescriptions that flow into workout execution. The ownership rules live in `lib/engine/sessionOwnership.ts`.

### Replay lab is a first-class internal debugging surface

`src/components/EngineReplayLab.tsx` is the current internal inspection tool for understanding how the engine behaves over a full block. It reuses `lib/engine/simulation/lab.ts` and `lib/engine/simulation/runner.ts` rather than a separate visualization-only simulator.

Current replay-lab capabilities include:

- deterministic seeded block replay
- a workout-first week/day rail instead of split week and day selectors
- chart focus controls with `7D`, `14D`, `28D`, and `All` windows inside a collapsed trends section
- run-level readiness, weight, calories, and load charts with summary stats
- selected-day workout hero with quick-context stats and previous or next navigation
- sectioned replay workout blueprint with set-by-set targets, rest guidance, cues, and simulated logs
- full prescribed-vs-logged S and C inspection
- dedicated conditioning prescription and simulated conditioning log views
- collapsible secondary sections for risk, findings, fuel, and decision trace

If you change simulation output shape, you usually need to update both the replay adapter in `lib/engine/simulation/lab.ts` and the replay UI in `src/components/replay-lab/`.

## Directory guide

- `src/screens`: user-visible surfaces.
- `src/components`: shared UI blocks and replay-lab UI.
- `src/components/replay-lab`: decomposed internal replay inspector.
- `src/navigation`: tab and stack definitions.
- `src/hooks`: orchestration hooks like `useDashboardData`, `useWeeklyPlan`, and workout hooks.
- `src/theme`: theme tokens, typography, spacing, semantic palettes, and readiness accent helpers.
- `src/context`: shared runtime UI contexts.
- `lib/api`: service layer for athlete context, planning, mission, schedules, nutrition, fight camp, weight, and weight cut.
- `lib/engine`: deterministic business logic.
- `lib/engine/presentation`: engine-to-copy mapping for summaries and semantic presentation.
- `lib/engine/simulation`: persona library, runner, and reporting.
- `supabase/migrations`: schema history.

## Files that matter most

1. `App.tsx`
   Entry gate, provider tree, and root visual shell.
2. `src/navigation/TabNavigator.tsx`
   Five-tab shell and gym-floor navigation behavior.
3. `src/theme/theme.ts`
   Color, spacing, typography, semantic, and interaction tokens.
4. `lib/api/dailyMissionService.ts`
   Main daily engine orchestration path.
5. `src/hooks/useDashboardData.ts`
   Dashboard state assembly and refresh behavior.
6. `lib/api/weeklyPlanService.ts` and `src/screens/WeeklyPlanScreen.tsx`
   Weekly planning, mission reuse, and plan execution entry points.
7. `lib/engine/index.ts` and `lib/engine/types.ts`
   Export surface and shared engine contracts.
8. `lib/engine/simulation/runner.ts`, `lib/engine/simulation/lab.ts`, and `src/components/replay-lab/`
   Deterministic replay generation, replay view-model mapping, and internal engine inspection UI.

## Editing guidance

- Prefer fixing behavior in the engine or service layer when multiple screens depend on it.
- Reuse shared engine types instead of redefining API or UI-only variants.
- Treat snapshots and mirrored mission fields as public contracts inside the app.
- Preserve the auth, profile, and planning gate unless the task explicitly targets it.
- If the code path is mode-sensitive, check both `build_phase` and `fight_camp`.
- For replay-lab work, do not fork engine logic for visualization. Reuse engine outputs and add adapter or view-model fields instead.
- For UI work, keep the fixed chrome plus scoped-accent model intact instead of reintroducing full-screen readiness tinting or one-off surface primitives.

## Validation guidance

- Engine logic: start with `lib/engine/*.test.ts`
- Deterministic changes: run `npm run test:engine`
- Structural changes: also run `npm run lint`, `npm run typecheck`, and `npm run typecheck:clean`
- Higher-risk engine changes: use the simulation tooling in `scripts/run-simulation.ts` and `lib/engine/simulation/*`
- In practice, `npm run test:engine` is the dependable gate today for replay and engine work. Full typecheck is known to have pre-existing failures, so use targeted transpile or replay smoke checks when touching replay UI.
