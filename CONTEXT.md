# Athleticore OS - Architecture & Product Context

**Read `STATE.md` first** before making targeted changes. It captures the current product direction and active priorities.

Athleticore OS is no longer just a workout planner. The app now behaves like an athlete operating system: it gates users through onboarding and planning setup, computes a daily engine state, and drives training, nutrition, hydration, weight-cut, and risk guidance from that shared context.

## Product Shape
- **Primary experience:** authenticated athlete dashboard plus a planning workspace.
- **Goal modes:** `build_phase` and `fight_camp`.
- **Core runtime loop:** onboarding -> planning setup -> rolling schedule + daily engine -> dashboard mission + plan execution -> logs and snapshots.
- **Main user surfaces:**
  - `Home` tab: dashboard, today detail, logs.
  - `Plan` tab: weekly plan, guided workouts, calendar, nutrition, weight cut, weekly review.
  - `Profile` tab: profile and settings.

## Current Architecture
- **App shell:** `App.tsx` decides among `AuthScreen`, `OnboardingScreen`, `PlanningSetupStackNavigator`, and `TabNavigator`.
- **Navigation:** bottom-tab app with separate `HomeStack` and `PlanStack` flows.
- **Backend:** Supabase for auth, profile data, plans, sessions, nutrition, weight cut, and engine snapshots.
- **Deterministic engine:** `lib/engine/*` owns readiness, mission construction, schedule generation, nutrition targets, risk scoring, and workout prescriptions.
- **Service layer:** `lib/api/*` coordinates Supabase IO plus engine orchestration.

## Important Runtime Concepts
- **Planning setup is a gate.** Users are not considered ready until they have availability windows plus an active mode record, unless legacy usage data satisfies the check.
- **Daily engine state is central.** `getDailyEngineState` resolves objective context, ACWR, readiness, nutrition targets, hydration, cut protocol, workout prescription, and the final daily mission.
- **Snapshots are first-class.** Daily engine results are persisted in `daily_engine_snapshots` and mirrored into `weekly_plan_entries.daily_mission_snapshot` for reuse.
- **Guided engine sessions matter.** Weekly plan entries and scheduled activities can hand off into `GuidedWorkoutScreen` using engine-owned prescriptions and session ownership rules.
- **Dashboard is operational, not decorative.** It is the "today" command center for mission summary, readiness, fuel, training load, weight trend, camp risk, and fast navigation into execution flows.

## Directory Guide
- `/src/screens` - top-level product surfaces. Start here for user-visible behavior.
- `/src/components` - reusable UI blocks used by dashboard, planning, nutrition, and workout flows.
- `/src/navigation` - app shell, tab structure, and stack routing.
- `/src/hooks` - screen-focused orchestration hooks like `useDashboardData`, `useWeeklyPlan`, and workout/planning hooks.
- `/src/theme` - colors, spacing, readiness theme context.
- `/lib/api` - service layer for athlete context, planning setup, daily mission state, weekly plans, nutrition, fight camp, and weight cut.
- `/lib/engine` - deterministic business logic and tests.
- `/supabase/migrations` - schema history for planning, camp, daily mission OS, and daily engine snapshots.

## Files That Matter Most
1. `App.tsx`
   Controls the app gate sequence and tells you which product state the user can reach.
2. `lib/api/dailyMissionService.ts`
   Main orchestration layer for the daily engine. Read this before changing dashboard, mission, or daily prescription behavior.
3. `src/hooks/useDashboardData.ts`
   Connects the dashboard to the daily engine, schedule generation, ledgers, and current athlete context.
4. `src/screens/WeeklyPlanScreen.tsx` and `lib/api/weeklyPlanService.ts`
   Core weekly planning and mission snapshot integration.
5. `lib/engine/index.ts` and `lib/engine/types.ts`
   Source of truth for exported engine functions and shared domain types.

## Editing Guidance
- Prefer changing engine or service code over patching screen logic when the behavior is cross-surface.
- Reuse types from `lib/engine/types.ts` or the typed splits under `lib/engine/types/*`.
- Treat `daily_mission_snapshot` and `daily_engine_snapshots` as part of the contract when changing mission shape.
- Preserve the setup gate in `App.tsx`; do not bypass onboarding or planning setup unless that is the explicit task.
- If a flow depends on goal mode, verify both `build_phase` and `fight_camp` paths.

## High-Value Test Areas
- `lib/engine/*.test.ts` covers the deterministic layer and is the safest place to add coverage.
- Mission, workout, schedule, camp-risk, nutrition, and weight-cut changes should usually be verified with `npm run test:engine`.
- Structural changes should also pass `npm run lint`, `npm run typecheck`, and `npm run typecheck:clean`.
