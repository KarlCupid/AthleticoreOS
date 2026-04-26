# CLAUDE.md

This file is the fast operational guide for working in Athleticore OS. It is intentionally practical and repo-specific.

Read order:

1. `STATE.md`
2. `CONTEXT.md`
3. `DESIGN_SYSTEM.md`
4. `AGENT.md`
5. this file

If any of these disagree with the code, update the docs in the same pass as the code change.

## What this repo is

Athleticore OS is an Expo + React Native athlete operating system with:

- a deterministic engine in `lib/engine/*`
- a Supabase-backed orchestration layer in `lib/api/*`
- UI state assembly in `src/hooks/*`
- product surfaces in `src/screens/*`
- a tokenized visual system in `src/theme/*`

The app is centered on a shared daily engine state, not a standalone workout planner.

## Core product truth

- Goal modes are `build_phase` and `fight_camp`.
- The daily mission is the main runtime object.
- Dashboard, planning, nutrition, hydration, and training all converge on engine outputs.
- Snapshots are part of the contract, not just a cache.
- The main app shell is `Today`, `Train`, `Plan`, `Fuel`, and `Me`.

The main orchestration path is `lib/api/dailyMissionService.ts`.

## App gate

The user flow is:

1. auth
2. onboarding
3. planning setup
4. tab app

Do not casually bypass or weaken this gate. It is controlled by `App.tsx` and planning-setup services.

## Theme and design truth

- Root chrome is fixed with `APP_CHROME` plus the shared `AuroraBackground`.
- New UI should use `TYPOGRAPHY_V2`, tokenized spacing and radii, and standard `Card` surfaces.
- Readiness color is scoped to readiness-aware accents, not whole-screen backgrounds.
- The old `GlassCard` primitive has been removed; do not reintroduce it.
- Workout and gym-floor experiences must respect `InteractionModeContext` and larger target sizing.

Use `DESIGN_SYSTEM.md` when making UI decisions or updating product docs.

## Where to start by problem

- Mission behavior, risk, readiness, prescription, nutrition, hydration:
  `lib/api/dailyMissionService.ts`
- Engine logic:
  `lib/engine/*`
- Weekly plan reuse and snapshot behavior:
  `lib/api/weeklyPlanService.ts`
  `src/screens/WeeklyPlanScreen.tsx`
- Dashboard state:
  `src/hooks/useDashboardData.ts`
- Session ownership and guided workout boundaries:
  `lib/engine/sessionOwnership.ts`
- Tab shell or gym-floor navigation behavior:
  `src/navigation/TabNavigator.tsx`
- Theme tokens and design rules:
  `src/theme/theme.ts`
  `DESIGN_SYSTEM.md`

## Current replay-lab state

The repo includes an internal `Engine Replay Lab` for deterministic engine inspection.

Primary files:

- `src/components/EngineReplayLab.tsx` (thin re-export)
- `src/components/replay-lab/` (decomposed UI - shell, charts, browser, tabs, primitives)
- `lib/engine/simulation/lab.ts`
- `lib/engine/simulation/runner.ts`
- `lib/engine/simulation/types.ts`

Key files inside `src/components/replay-lab/`:

- `EngineReplayLab.tsx` - shell: modal, header, scenario picker, loading and error states
- `useReplayState.ts` - state, derived values, and actions
- `ReplayCharts.tsx` - collapsible block-trends section with four charts plus zoom strip
- `ReplayBrowser.tsx` - workout-first week/day rail with one expanded week at a time
- `DayInspector.tsx` - selected-workout hero, quick-context strip, sequential nav, and collapsible diagnostics
- `tabs/` - content sections reused inside the section-based inspector
- `primitives/` - shared replay-lab controls and display units
- `helpers.ts` - pure utility functions
- `styles.ts` - shared styles plus semantic tone constants

Access:

- hidden from Me/Profile via version-label multi-tap

Current replay-lab capabilities:

- deterministic seeded replay runs
- workout-first week/day rail with danger, override, and mandatory-recovery indicators
- chart zoom windows: `7D`, `14D`, `28D`, `All`
- charts live in a collapsed `Block Trends` section by default
- readiness, weight, calories, and load charts with summary stats
- selected-day hero with quick-context stats and nearby previous or next navigation
- sectioned workout-session blueprint with rest rules, set-level targets, cues, and simulated logged outcome
- prescribed-vs-logged S and C comparisons
- simulated exercise-level workout logs
- dedicated conditioning prescription and simulated conditioning-log views
- risk, fuel, and decision diagnostics in collapsible secondary sections
- semantic metric-tile coloring and impact-based decision trace tinting
- accessibility labels and roles on interactive elements
- `TYPOGRAPHY_V2.plan` tokens throughout

Important rule:

- Do not create a second simulator path just for the UI.
- Reuse engine or simulation outputs and extend adapter or view-model fields when needed.
- Keep UI components in `src/components/replay-lab/`; do not re-monolith.

## Current testing reality

Use this order of trust:

1. `npm run test:engine`
2. targeted replay smoke check
3. targeted transpile check for replay UI
4. broader repo checks only if necessary

Important:

- `npm run test:engine` is currently the reliable regression gate for engine and replay work.
- Full repo `typecheck` is known to have pre-existing failures.
- Do not assume a clean or noisy `npm run typecheck` is attributable to your change without checking whether failures are pre-existing.

## Validation commands

- `npm run test:engine`
- `npm run lint`
- `npm run typecheck`
- `npm run typecheck:clean`
- `npm run quality`

For replay work, a practical validation pass is:

1. `npm run test:engine`
2. replay adapter smoke test against `buildEngineReplayRun(...)`
3. targeted TS transpile check on `src/components/EngineReplayLab.tsx`

## Engineering rules for this repo

- Prefer fixing cross-surface issues in `lib/engine` or `lib/api`, not in one screen.
- Keep deterministic engine code pure and side-effect-free.
- Respect snapshot persistence when mission or engine shapes change.
- Reuse shared engine types instead of inventing parallel UI contracts.
- If the code path is mode-sensitive, check both `build_phase` and `fight_camp`.
- When replay output shape changes, update both the simulation model and replay UI.
- When UI shape changes, update the design docs if the contributor rules changed materially.

## Known risks and sharp edges

- `lib/api/dailyMissionService.ts` is dense and easy to couple further.
- Snapshot and weekly-plan mirror drift is a real risk.
- Weekly plan entries and scheduled activities can create precedence bugs.
- Replay data now includes exercise logs and conditioning logs, so model or UI drift is easy to introduce.
- Some conditioning days may require dedicated presentation even when they are not exercise-based S and C sessions.
- Simulation is useful but still not enforced systematically by the toolchain.
- Legacy theme primitives still exist for compatibility, so UI changes need discipline to stay aligned with the current design system.

## Files that matter most right now

1. `App.tsx`
2. `src/navigation/TabNavigator.tsx`
3. `src/theme/theme.ts`
4. `lib/api/dailyMissionService.ts`
5. `src/hooks/useDashboardData.ts`
6. `lib/api/weeklyPlanService.ts`
7. `lib/engine/simulation/runner.ts`
8. `lib/engine/simulation/lab.ts`
9. `src/components/replay-lab/`

## Practical workflow for replay or engine bugs

1. Reproduce with a deterministic replay scenario.
2. Inspect `runner.ts` for what the simulation actually emits.
3. Inspect `lab.ts` for what the replay adapter exposes.
4. Inspect the relevant file in `src/components/replay-lab/` for what the UI renders or hides.
5. Run `npm run test:engine`.
6. Run a targeted replay smoke test for the specific day or scenario involved.

## Practical workflow for UI-only confusion

1. Check whether the engine output is already correct.
2. If correct, fix the view model or UI.
3. If incorrect, fix the engine or simulation source first.
4. If the UI change affects contributor guidance, update `DESIGN_SYSTEM.md` and whichever top-level docs reference it.

## Documentation maintenance

If you change:

- mission shape
- snapshot shape
- replay model shape
- replay-lab capabilities
- navigation shell expectations
- theme or design-system contributor rules
- validation expectations

then update:

- `STATE.md`
- `CONTEXT.md`
- `DESIGN_SYSTEM.md` when UI rules changed
- `AGENT.md` if the short guidance changed materially
- `CLAUDE.md` if the operational workflow changed materially
