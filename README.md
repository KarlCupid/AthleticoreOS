# Athleticore OS

Athleticore OS is an Expo + React Native athlete operating system for combat-sports training. It combines onboarding, planning, daily readiness, nutrition, hydration, weight-cut management, and guided training into one app backed by Supabase and a deterministic engine in `lib/engine`.

## What the app does

- Gates users through auth, onboarding, and planning setup before they enter the main app.
- Builds a daily engine state that drives mission, nutrition, hydration, risk, and workout recommendations.
- Supports both `build_phase` and `fight_camp` modes.
- Persists mission and engine snapshots so the dashboard and weekly plan can reuse the same state.
- Uses simulation-backed engine tests for the deterministic layer.

## Tech stack

- Expo 54
- React Native 0.81 / React 19
- TypeScript
- React Navigation
- Supabase

## Project layout

- `App.tsx`: root app gate and provider setup.
- `src/navigation`: tab and stack navigation.
- `src/screens`: product surfaces.
- `src/components`: reusable UI components.
- `src/hooks`: screen orchestration hooks.
- `lib/api`: Supabase-facing services and orchestration.
- `lib/engine`: deterministic training, readiness, mission, nutrition, weight, and presentation logic.
- `lib/engine/simulation`: persona-based simulation runner and reporting.
- `supabase/migrations`: schema history.
- `scripts`: project utilities, engine test runner, and simulation entry points.

## Getting started

### Prerequisites

- Node.js 20+ recommended
- npm
- Expo tooling for local mobile/web development
- A Supabase project with the schema in `supabase/migrations`

### Environment variables

Create `.env` from `.env.example` and set:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

The app throws during startup if either variable is missing because `lib/supabase.ts` requires both.

### Install and run

```bash
npm install
npm run start
```

Useful targets:

```bash
npm run android
npm run ios
npm run web
```

## Validation commands

```bash
npm run lint
npm run typecheck
npm run typecheck:clean
npm run test:engine
npm run quality
```

Notes:

- `npm run test:engine` runs the custom TypeScript test harness in `scripts/run-engine-tests.js`.
- `npm run quality` is the main repo health check.

## Simulation tooling

The deterministic engine can be stress-tested with persona simulations through `scripts/run-simulation.ts`. Run it with your preferred TypeScript runner, for example:

```bash
npx tsx scripts/run-simulation.ts perfect 8
```

Outputs are written to `sim_results/`. `tsx` is not currently declared as a project script or dependency, so use whatever TS execution flow you already use locally.

Other simulation utilities:

- `scripts/simulate_full_app.ts`
- `scripts/simulate_weight_cut.ts`

## Runtime architecture

### App shell

`App.tsx` decides between:

1. `AuthScreen`
2. `OnboardingScreen`
3. `PlanningSetupStackNavigator`
4. `TabNavigator`

That gate depends on Supabase auth, the existence of `athlete_profiles`, and planning setup completion from `lib/api/planningSetupService.ts`.

### Navigation

- `Home` tab: dashboard, day detail, logs.
- `Plan` tab: weekly plan, workouts, nutrition, calendar, weight cut, weekly review.
- `Profile` tab: settings/profile surface.

### Daily engine flow

`lib/api/dailyMissionService.ts` is the main orchestration entry point. It resolves:

- objective context
- ACWR
- readiness profile and stimulus constraints
- cut protocol
- nutrition targets
- hydration
- workout prescription
- camp risk
- final daily mission

It then persists snapshots through `daily_engine_snapshots` and mirrors mission snapshots into weekly plan entries.

## Working rules

- Keep business logic in `lib/engine` pure and synchronous.
- Prefer service or engine fixes over UI-only patches when behavior spans multiple screens.
- When changing mission shape or snapshot-backed fields, verify persistence contracts as well as UI consumption.
- If you touch deterministic behavior, add or update engine tests before changing screens.

## Key files

- `App.tsx`
- `lib/api/dailyMissionService.ts`
- `src/hooks/useDashboardData.ts`
- `lib/api/weeklyPlanService.ts`
- `lib/engine/index.ts`
- `lib/engine/types.ts`

## Additional repo docs

- `STATE.md`: current direction, priorities, and risks.
- `CONTEXT.md`: product and architecture overview.
- `AGENT.md`: concise implementation guidance for coding agents.
