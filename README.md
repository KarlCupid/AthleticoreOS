# Athleticore OS

Athleticore OS is an Expo + React Native athlete operating system for combat-sports training. It combines onboarding, planning, readiness, nutrition, hydration, weight-cut workflows, and guided training into one app backed by Supabase and a deterministic engine in `lib/engine`.

## Product overview

- The app is centered on a shared daily mission, not a standalone workout planner.
- Goal modes are `build_phase` and `fight_camp`.
- The runtime combines readiness, workload, nutrition, hydration, risk, and prescription into one engine-backed operating state.
- Engine snapshots are persisted and reused across dashboard and planning flows.

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
- `Fuel`: nutrition, food search, barcode scan, weight-cut home, cut-plan setup, and fight-week protocols.
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
- `lib/engine`: deterministic training, readiness, mission, nutrition, weight, and presentation logic.
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
- Full repo typecheck can still surface pre-existing noise, so engine and targeted checks are often the most trustworthy regression gate.

## Simulation tooling

The deterministic engine can be stress-tested with persona simulations through `scripts/run-simulation.ts`. Run it with your preferred TypeScript runner, for example:

```bash
npx tsx scripts/run-simulation.ts perfect 8
```

Outputs are written to `sim_results/`. `tsx` is not currently declared as a project script or dependency, so use your preferred local TS execution flow.

## Runtime architecture

### Daily engine flow

`lib/api/dailyMissionService.ts` is the main orchestration entry point. It resolves:

- objective context
- ACWR
- readiness profile and stimulus constraints
- unified body-mass and weight-class context
- nutrition targets
- hydration
- workout prescription
- camp risk
- final daily mission

It then persists snapshots through `daily_engine_snapshots` and mirrors mission snapshots into weekly plan entries.

### Data ownership

- `lib/engine/*`: deterministic calculations and domain rules.
- `lib/api/*`: Supabase access plus orchestration around engine inputs and outputs.
- `src/hooks/*`: screen-oriented assembly of service results and UI state.
- `src/screens/*`: final product surfaces.

## Working rules

- Keep business logic in `lib/engine` pure and synchronous.
- Prefer service or engine fixes over UI-only patches when behavior spans multiple screens.
- When changing mission shape or snapshot-backed fields, verify persistence contracts as well as UI consumption.
- If you touch deterministic behavior, add or update engine tests before changing screens.
- When updating UI, follow `DESIGN_SYSTEM.md` and keep docs aligned with the visual system in the same pass.

## Key files

- `App.tsx`
- `src/navigation/TabNavigator.tsx`
- `src/theme/theme.ts`
- `lib/api/dailyMissionService.ts`
- `src/hooks/useDashboardData.ts`
- `lib/api/weeklyPlanService.ts`
- `lib/engine/index.ts`
- `lib/engine/types.ts`

## Additional repo docs

- `DESIGN_SYSTEM.md`: current theme and design rules.
- `STATE.md`: current direction, priorities, and risks.
- `CONTEXT.md`: product and architecture overview.
- `AGENT.md`: concise implementation guidance for coding agents.
- `CLAUDE.md`: practical repo workflow notes.
