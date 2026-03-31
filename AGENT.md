# Agent Guidance: Working with Athleticore OS

Athleticore OS is an Expo + React Native athlete operating system with a deterministic engine, a Supabase-backed service layer, and a documented design system. Use this file as the short version; use `STATE.md`, `CONTEXT.md`, and `DESIGN_SYSTEM.md` for the broader picture.

## Executive summary

The app is organized around a daily engine state. That state combines objective context, readiness, workload, nutrition, hydration, risk, and training prescription into a single mission that powers the dashboard, planning, fueling, and training flows.

The current gate is:

1. auth
2. onboarding
3. planning setup
4. tab app

The main tab shell is:

1. `Today`
2. `Train`
3. `Plan`
4. `Fuel`
5. `Me`

## Working rules

1. Trust the engine. If behavior is cross-surface, start in `lib/engine` or `lib/api`, not the UI.
2. Keep engine code pure. `lib/engine/*` should stay synchronous and side-effect-free.
3. Respect snapshot contracts. Mission and engine shape changes can require updates to persisted snapshots and weekly plan mirrors.
4. Follow the gate. `App.tsx` and `lib/api/planningSetupService.ts` define who can enter the app.
5. Validate deterministic changes with engine tests before relying on UI smoke checks.
6. For UI changes, preserve the fixed chrome plus scoped readiness accent model documented in `DESIGN_SYSTEM.md`.

## Layer map

- `App.tsx`: auth/profile/planning gate, root shell, and providers.
- `src/navigation/*`: today, train, plan, fuel, and me routing.
- `src/screens/*`: product surfaces.
- `src/hooks/*`: screen orchestration, especially dashboard and weekly plan.
- `src/theme/*`: theme tokens, typography, interaction sizes, and readiness accent helpers.
- `src/context/*`: shared UI runtime state such as interaction mode.
- `lib/api/*`: Supabase reads/writes and orchestration.
- `lib/engine/*`: deterministic business logic.
- `lib/engine/presentation/*`: trace-to-copy mapping for user-facing summaries.
- `lib/engine/simulation/*`: persona-based validation.

## Start here by problem type

- Mission, risk, readiness, prescription, nutrition, hydration: `lib/api/dailyMissionService.ts`
- Dashboard behavior: `src/hooks/useDashboardData.ts`
- Weekly planning and snapshot reuse: `lib/api/weeklyPlanService.ts` and `src/screens/WeeklyPlanScreen.tsx`
- Planning gate logic: `lib/api/planningSetupService.ts`
- Fight camp or build phase context: `lib/api/fightCampService.ts`, `lib/api/buildPhaseService.ts`
- Navigation shell: `src/navigation/TabNavigator.tsx`
- Theme and design rules: `src/theme/theme.ts` and `DESIGN_SYSTEM.md`
- Engine exports and types: `lib/engine/index.ts`, `lib/engine/types.ts`

## Fastest ways to understand the code

- Read the matching `*.test.ts` file before the implementation for engine modules.
- Search by table name when tracing persistence or data ownership.
- Check hooks before screens when UI state looks inconsistent.
- Check `src/theme/theme.ts` before introducing new colors, typography, spacing, or tap-target rules.

## UI and theme rules

- Use `APP_CHROME` for app-wide chrome and backgrounds.
- Use `Card` and tokenized surfaces for new content blocks.
- Prefer `TYPOGRAPHY_V2` for all new UI.
- Keep readiness color scoped to readiness-specific accents and stateful feedback.
- Do not introduce new usages of `GlassCard`.
- Respect interaction modes when working on workout or gym-floor experiences.

## Validation commands

- `npm run test:engine`
- `npm run lint`
- `npm run typecheck`
- `npm run typecheck:clean`
- `npm run quality`

Use simulation tooling when changing core load, mission, cut, or readiness behavior and you need multi-week confidence.
