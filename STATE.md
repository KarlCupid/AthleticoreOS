# Project State

**Last Updated:** 2026-04-29

## Current direction

- The product is centered on Unified Performance Engine output and daily engine state, not a standalone workout planner flow.
- `build_phase` and `fight_camp` both feed the same mission-driven runtime.
- The repo is optimized around a deterministic engine plus a Supabase service layer.
- The app shell is now documented and built as a five-tab experience: `Today`, `Train`, `Plan`, `Fuel`, and `Me`.
- The visual system is intentionally fixed-chrome and dark-surface based, with readiness color used as a scoped accent rather than a full-screen theme.
- Validation is expected to start with engine tests and, for higher-risk changes, simulation.
- New dashboard and UI work should consume Unified Performance Engine view models first, especially `performanceContext`, `todayMission`, and `phaseTransition`.

## What is in place

- Auth -> onboarding -> planning setup -> tab app gating is implemented in `App.tsx`.
- Dashboard loading is driven by `src/hooks/useDashboardData.ts`, which pulls `getDailyEngineState`, rolling schedule data, nutrition ledger data, and fight-camp status.
- Canonical daily orchestration is implemented in `lib/api/dailyPerformanceService.ts`.
- Daily dashboard state is assembled from `DailyEngineState.unifiedPerformance` and the Unified Performance Engine presentation view models.
- Legacy daily mission and daily snapshot structures are compatibility layers. They are not the future architecture and should not be expanded for new dashboard work.
- Weekly plan entries can reuse engine-owned `prescription_snapshot` data for guided training execution, but daily mission snapshot mirrors are retired.
- Engine modules cover readiness, ACWR, mission construction, nutrition, hydration, body-mass and weight-class management, interference modeling, S and C autoregulation, presentation mapping, and simulation.
- The internal `Engine Replay Lab` is available from Me/Profile via a hidden version-tap entry and is now the main in-app inspection surface for deterministic replay analysis.
- Replay lab coverage now includes:
  - deterministic seeded replay runs
  - a workout-first week/day rail with selected-week expansion
  - chart window zoom controls inside a collapsed trends section
  - selected-day workout hero with quick-context stats and nearby previous or next navigation
  - sectioned workout blueprints with set-level targets, rest guidance, and simulated log detail
  - full prescribed-vs-logged S and C session inspection
  - dedicated conditioning prescription and simulated conditioning log views
- The design system direction is codified in `DESIGN_SYSTEM.md`, centered on:
  - `APP_CHROME` plus `AuroraBackground` for root chrome
  - `Card` and tokenized dark surfaces for primary content
  - `TYPOGRAPHY_V2` for new UI work
  - scoped readiness accents and semantic feedback palettes
  - interaction-mode aware sizing for gym-floor and focus contexts
- Supabase migrations are present through `015_engine_v3_foundation.sql`.

## Current priorities

- Keep documentation and architecture notes aligned with the actual code, especially around engine orchestration, navigation, persistence contracts, and the design system.
- Continue improving intervention behavior inside Unified Performance Engine, readiness, risk, nutrition, and body-mass logic without fragmenting the ownership model.
- Maintain confidence in ACWR, readiness, and workload-sensitive prescriptions.
- Keep new UI work aligned with the fixed chrome plus scoped accent model and avoid reintroducing deprecated glassmorphism patterns.
- Add or preserve engine-level coverage whenever deterministic behavior changes.
- Keep the replay lab aligned with actual engine outputs so internal debugging does not drift into a parallel simulation UI with different logic.

## Active risks and tech debt

- `lib/api/dailyPerformanceService.ts` is the densest daily orchestration file and remains a likely source of coupling risk.
- Legacy daily mission/snapshot compatibility paths can drift if new UPE view models are not treated as the source of truth.
- The app still has legacy fallback behavior in some flows, especially around planning completion and reused mission data.
- Weekly plan entries and scheduled activities both influence the daily mission, so precedence bugs are easy to introduce.
- Simulation tooling exists, but its usage is still discipline-dependent rather than enforced by the toolchain.
- `npm run test:engine`, `npm run typecheck`, and `npm run typecheck:clean` are expected to pass before handoff for relevant engine and app changes.
- Replay data for conditioning and exercise logs is UI-facing now, so replay model changes need coordination between `lib/engine/simulation/*` and `src/components/replay-lab/`.
- Legacy theme usage still exists in parts of the app, including compatibility tokens and older surface primitives, so contributors need to actively follow `DESIGN_SYSTEM.md` during UI changes.

## Working assumptions

- Read this file first, then `CONTEXT.md`.
- Treat Unified Performance Engine outputs and their presentation view models as the operational source of truth for new dashboard/UI work.
- Treat legacy daily mission/snapshot structures as compatibility only. Do not reintroduce `daily_engine_snapshots`, daily mission mirrors, or snapshot-backed dashboard contracts unless a migration plan explicitly makes them canonical again.
- Before changing UI summaries, verify whether the real fix belongs in engine logic or service orchestration.
- When documentation drifts from the code, update the docs in the same pass as the code change.
- For engine or replay debugging work, check `lib/engine/simulation/runner.ts`, `lib/engine/simulation/lab.ts`, and `src/components/replay-lab/` together.
- For replay regressions, validate with `npm run test:engine` first, then run a targeted replay smoke test if the issue is simulation- or UI-shape-related.
- For theme or layout changes, use `src/theme/theme.ts`, `src/context/InteractionModeContext.tsx`, and `DESIGN_SYSTEM.md` as the primary source of truth.
