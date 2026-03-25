# CLAUDE.md

This file is the fast operational guide for working in Athleticore OS. It is intentionally practical and repo-specific.

Read order:

1. `STATE.md`
2. `CONTEXT.md`
3. `AGENT.md`
4. this file

If any of these disagree with the code, update the docs in the same pass as the code change.

## What this repo is

Athleticore OS is an Expo + React Native athlete operating system with:

- a deterministic engine in `lib/engine/*`
- a Supabase-backed orchestration layer in `lib/api/*`
- UI state assembly in `src/hooks/*`
- product surfaces in `src/screens/*`

The app is centered on a shared daily engine state, not a standalone workout planner.

## Core product truth

- Goal modes are `build_phase` and `fight_camp`.
- The daily mission is the main runtime object.
- Dashboard, planning, nutrition, hydration, and training all converge on engine outputs.
- Snapshots are part of the contract, not just a cache.

The main orchestration path is `lib/api/dailyMissionService.ts`.

## App gate

The user flow is:

1. auth
2. onboarding
3. planning setup
4. tab app

Do not casually bypass or weaken this gate. It is controlled by `App.tsx` and planning-setup services.

## Where to start by problem

- Mission behavior, risk, readiness, prescription, nutrition, hydration:
  `lib/api/dailyMissionService.ts`
- Engine logic:
  `lib/engine/*`
- Weekly plan reuse / snapshot behavior:
  `lib/api/weeklyPlanService.ts`
  `src/screens/WeeklyPlanScreen.tsx`
- Dashboard state:
  `src/hooks/useDashboardData.ts`
- Session ownership / guided workout boundaries:
  `lib/engine/sessionOwnership.ts`

## Current replay-lab state

The repo now includes an internal `Engine Replay Lab` for deterministic engine inspection.

Primary files:

- `src/components/EngineReplayLab.tsx` (thin re-export)
- `src/components/replay-lab/` (decomposed UI — shell, charts, browser, tabs, primitives)
- `lib/engine/simulation/lab.ts`
- `lib/engine/simulation/runner.ts`
- `lib/engine/simulation/types.ts`

Key files inside `src/components/replay-lab/`:

- `EngineReplayLab.tsx` — shell: modal, header, scenario picker, loading/error states
- `useReplayState.ts` — all state, derived values, and actions
- `ReplayCharts.tsx` — collapsible block-trends section with 4 charts + zoom strip
- `ReplayBrowser.tsx` — workout-first week/day rail with one expanded week at a time
- `DayInspector.tsx` — selected-workout hero, quick-context strip, sequential nav, and collapsible secondary diagnostics
- `tabs/` — content sections reused inside the section-based inspector (OverviewTab, WorkoutTab, FuelTab, DecisionsTab)
- `primitives/` — MetricTile, PillButton, ScenarioButton, ChartWidgets, FindingBadge, ExerciseRow, ConditioningDrillRow, CollapsibleSection
- `helpers.ts` — pure utility functions
- `styles.ts` — shared styles + semantic tone constants

Access:

- hidden from Profile via version-label multi-tap

Current replay-lab capabilities:

- deterministic seeded replay runs
- workout-first week/day rail with danger, override, and mandatory-recovery indicators
- chart zoom windows: `7D`, `14D`, `28D`, `All` (auto-centers on selected day)
- charts live in a collapsed `Block Trends` section by default
- readiness, weight, calories, and load charts with summary stats
- selected-day hero with quick-context stats and nearby previous/next navigation
- sectioned workout-session blueprint with rest rules, set-level targets, cues, and simulated logged outcome
- S&C prescribed-vs-logged comparisons
- simulated exercise-level workout logs
- dedicated conditioning prescription and simulated conditioning-log views
- risk, fuel, and decision diagnostics moved into collapsible secondary sections
- semantic MetricTile coloring (good/warning/danger)
- decision trace grouped by subsystem with impact-based tinting
- skeleton loading state and error+retry UX
- accessibility labels/roles on all interactive elements
- TYPOGRAPHY_V2.plan tokens throughout

Important rule:

- Do not create a second simulator path just for the UI.
- Reuse engine/simulation outputs and extend adapter/view-model fields when needed.
- Keep UI components in `src/components/replay-lab/` — do not re-monolith.

## Current testing reality

Use this order of trust:

1. `npm run test:engine`
2. targeted replay smoke check
3. targeted transpile check for replay UI
4. broader repo checks only if necessary

Important:

- `npm run test:engine` is currently the reliable regression gate for engine/replay work.
- Full repo `typecheck` is known to have pre-existing failures.
- Do not assume a clean `npm run typecheck` means your work is good or bad without checking whether failures are pre-existing.

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

## Known risks / sharp edges

- `lib/api/dailyMissionService.ts` is dense and easy to couple further.
- Snapshot and weekly-plan mirror drift is a real risk.
- Weekly plan entries and scheduled activities can create precedence bugs.
- Replay data now includes exercise logs and conditioning logs, so model/UI drift is easy to introduce.
- Some conditioning days may require dedicated presentation even when they are not exercise-based S&C sessions.
- Simulation is useful but still not enforced systematically by the toolchain.

## Files that matter most right now

1. `App.tsx`
2. `lib/api/dailyMissionService.ts`
3. `src/hooks/useDashboardData.ts`
4. `lib/api/weeklyPlanService.ts`
5. `lib/engine/index.ts`
6. `lib/engine/simulation/runner.ts`
7. `lib/engine/simulation/lab.ts`
8. `src/components/replay-lab/` (decomposed replay UI)

## Practical workflow for replay or engine bugs

1. Reproduce with a deterministic replay scenario.
2. Inspect `runner.ts` for what the simulation actually emits.
3. Inspect `lab.ts` for what the replay adapter exposes.
4. Inspect the relevant file in `src/components/replay-lab/` for what the UI renders or hides.
5. Run `npm run test:engine`.
6. Run a targeted replay smoke test for the specific day/scenario involved.

## Practical workflow for UI-only confusion

1. Check whether the engine output is already correct.
2. If correct, fix the view model or UI.
3. If incorrect, fix the engine or simulation source first.

## Documentation maintenance

If you change:

- mission shape
- snapshot shape
- replay model shape
- replay-lab capabilities
- validation expectations

then update:

- `STATE.md`
- `CONTEXT.md`
- `AGENT.md` if the short guidance changed materially
- `CLAUDE.md` if the operational workflow changed materially
