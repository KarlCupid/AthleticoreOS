# Athleticore OS

Athleticore OS is an Expo + React Native athlete operating system for combat-sports training. It combines onboarding, planning, readiness, nutrition, hydration, body-mass and weight-class workflows, and guided training into one app backed by Supabase and a deterministic engine in `lib/engine`.

## Product overview

- The app is centered on a continuous athlete journey, not disconnected setup, planning, nutrition, and tracking flows.
- Goal modes are `build_phase` and `fight_camp`.
- The runtime resolves readiness, workload, nutrition, hydration, body-mass, phase, fight, risk, and prescription context through one performance state.
- Dashboard and planning flows consume canonical Unified Performance Engine outputs instead of legacy daily mission snapshots.

## App shell

`App.tsx` gates users through:

1. `AuthScreen`
2. `OnboardingScreen`
3. `PlanningSetupStackNavigator`
4. `TabNavigator`

The main app shell is a five-tab experience:

- `Today`: dashboard, day detail, logging, and activity history.
- `Train`: workout discovery, exercise detail, active workouts, guided workouts, and workout summaries.
- `Plan`: weekly plan, calendar, weekly review, and workout detail.
- `Fuel`: nutrition, food search, barcode scan, weight-class home, body-mass setup, and fight-week support.
- `Me`: profile and settings, plus the hidden replay-lab entry path.

## Theme and design system

The current UI is built around a fixed dark chrome with selective accents rather than readiness-tinted full-screen themes.

- Root chrome uses `APP_CHROME` and the shared `AuroraBackground`.
- Most surfaces use dark translucent cards from `Card` and theme tokens in `src/theme/theme.ts`.
- `TYPOGRAPHY_V2` is the preferred typography system for all new UI.
- Readiness colors are scoped to readiness-specific accents and feedback, not app-wide chrome.
- The old `GlassCard` primitive has been removed; use `Card` for new surfaces.

See `DESIGN_SYSTEM.md` for contributor guidance on palette, surfaces, typography, interaction modes, and design rules.

## Tech stack

- Expo 54
- React Native 0.81
- React 19
- TypeScript
- React Navigation
- Supabase
- React Native Reanimated
- React Native Skia

## Project layout

- `App.tsx`: root gate, providers, aurora shell, and navigation container.
- `src/navigation`: tab and stack navigation.
- `src/screens`: product surfaces.
- `src/components`: reusable UI components and internal replay-lab UI.
- `src/hooks`: screen orchestration hooks.
- `src/theme`: theme tokens, typography, spacing, interaction sizes, and readiness accent helpers.
- `src/context`: shared runtime UI contexts such as interaction mode.
- `lib/api`: Supabase-facing services and orchestration.
- `lib/engine`: deterministic training, readiness, daily athlete summary, nutrition, body-mass, and presentation logic.
- `lib/performance-engine`: canonical athlete journey, phase, fight, adaptive training, nutrition, tracking, body-mass, risk, explanation, and unified performance modules.
- `lib/engine/simulation`: persona-based simulation runner and reporting.
- `supabase/migrations`: schema history.
- `scripts`: project utilities, engine test runner, and simulation entry points.

## Getting started

### Prerequisites

- Node.js 20+ recommended
- npm
- Expo tooling for local mobile or web development
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
- `typecheck`, `typecheck:clean`, and `test:engine` should pass before handoff.

## Simulation tooling

The deterministic engine can be stress-tested with persona simulations through `scripts/run-simulation.ts`. Run it with your preferred TypeScript runner, for example:

```bash
npx tsx scripts/run-simulation.ts perfect 8
```

Outputs are written to `sim_results/`. `tsx` is not currently declared as a project script or dependency, so use your preferred local TS execution flow.

## Runtime architecture

### Unified performance flow

`lib/performance-engine/unified-performance/unifiedPerformanceEngine.ts` is the canonical orchestration entry point. App-facing services such as `lib/api/dailyPerformanceService.ts` project daily athlete summaries from Unified Performance Engine output. The flow resolves:

- objective context
- ACWR
- readiness profile and stimulus constraints
- phase and fight opportunity context
- protected workouts
- adaptive training plans
- nutrition and session fueling targets
- body-mass and weight-class feasibility
- risk flags
- explanations

Canonical outputs are persisted through current performance-engine tables and weekly plan entries. Retired daily mission snapshot persistence has been archived and dropped by the schema cleanup migration.

### Data ownership

- `lib/engine/*`: deterministic calculations and domain rules.
- `lib/performance-engine/*`: canonical journey, performance state, specialist engines, risk, explanation, and presentation view models.
- `lib/api/*`: Supabase access plus orchestration around engine inputs and outputs.
- `src/hooks/*`: screen-oriented assembly of service results and UI state.
- `src/screens/*`: final product surfaces.

## Working rules

- Keep business logic in `lib/engine` pure and synchronous.
- Use `lib/performance-engine` as the source of truth for unified athlete journey, phase, nutrition, tracking, readiness, body-mass, risk, and explanation decisions.
- Prefer service or engine fixes over UI-only patches when behavior spans multiple screens.
- When changing canonical output shape or persistence-backed fields, verify persistence contracts as well as UI consumption.
- If you touch deterministic behavior, add or update engine tests before changing screens.
- When updating UI, follow `DESIGN_SYSTEM.md` and keep docs aligned with the visual system in the same pass.

## Key files

- `App.tsx`
- `src/navigation/TabNavigator.tsx`
- `src/theme/theme.ts`
- `lib/performance-engine/unified-performance/unifiedPerformanceEngine.ts`
- `lib/api/dailyPerformanceService.ts`
- `src/hooks/useDashboardData.ts`
- `lib/api/weeklyPlanService.ts`
- `lib/engine/index.ts`
- `lib/engine/types.ts`

## Additional repo docs

- `DESIGN_SYSTEM.md`: current theme and design rules.
- `docs/workout-programming/README.md`: workout-programming architecture, release gates, feature flags, and production-readiness status.
- `STATE.md`: current direction, priorities, and risks.
- `CONTEXT.md`: product and architecture overview.
- `AGENT.md`: concise implementation guidance for coding agents.
- `CLAUDE.md`: practical repo workflow notes.
