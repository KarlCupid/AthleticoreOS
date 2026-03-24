# Project State

**Last Updated:** 2026-03-23

## Current direction

- The product is centered on a daily engine state, not a standalone workout planner flow.
- `build_phase` and `fight_camp` both feed the same mission-driven runtime.
- The repo is optimized around a deterministic engine plus a Supabase service layer.
- Validation is expected to start with engine tests and, for higher-risk changes, simulation.

## What is in place

- Auth -> onboarding -> planning setup -> tab app gating is implemented in `App.tsx`.
- Dashboard loading is driven by `src/hooks/useDashboardData.ts`, which pulls `getDailyEngineState`, rolling schedule data, nutrition ledger data, and fight-camp status.
- Daily engine orchestration is implemented in `lib/api/dailyMissionService.ts`.
- Weekly plan entries can reuse stored daily mission snapshots and engine-owned prescriptions.
- Snapshot persistence exists for `daily_engine_snapshots` and weekly plan mission mirrors.
- Engine modules cover readiness, ACWR, mission construction, nutrition, hydration, weight trend, cut protocols, interference modeling, S&C autoregulation, presentation mapping, and simulation.
- The internal `Engine Replay Lab` is available from Profile via a hidden version-tap entry and is now the main in-app inspection surface for deterministic replay analysis.
- Replay lab coverage now includes:
  - deterministic seeded replay runs
  - week/day replay browsing
  - chart window zoom and pan controls
  - full prescribed-vs-logged S&C session inspection
  - dedicated conditioning prescription and simulated conditioning log views
- Supabase migrations are present through `015_engine_v3_foundation.sql`.

## Current priorities

- Keep documentation and architecture notes aligned with the actual code, especially around engine orchestration and persistence contracts.
- Continue improving intervention behavior inside the mission and cut logic without fragmenting the ownership model.
- Maintain confidence in ACWR, readiness, and workload-sensitive prescriptions.
- Add or preserve engine-level coverage whenever deterministic behavior changes.
- Keep the replay lab aligned with actual engine outputs so internal debugging does not drift into a parallel simulation UI with different logic.

## Active risks and tech debt

- `lib/api/dailyMissionService.ts` is the densest orchestration file and remains a likely source of coupling risk.
- Snapshot-backed behavior can drift if schema or mission shape changes are only updated in one path.
- The app still has legacy fallback behavior in some flows, especially around planning completion and reused mission data.
- Weekly plan entries and scheduled activities both influence the daily mission, so precedence bugs are easy to introduce.
- Simulation tooling exists, but its usage is still discipline-dependent rather than enforced by the toolchain.
- Full repo typecheck remains noisy from pre-existing issues; `npm run test:engine` is currently the reliable regression gate for engine/replay changes.
- Replay data for conditioning and exercise logs is UI-facing now, so replay model changes need coordination between `lib/engine/simulation/*` and `src/components/EngineReplayLab.tsx`.

## Working assumptions

- Read this file first, then `CONTEXT.md`.
- Treat the daily engine and its persisted snapshots as the operational source of truth.
- Before changing UI summaries, verify whether the real fix belongs in engine logic or service orchestration.
- When documentation drifts from the code, update the docs in the same pass as the code change.
- For engine/replay debugging work, check `lib/engine/simulation/runner.ts`, `lib/engine/simulation/lab.ts`, and `src/components/EngineReplayLab.tsx` together.
- For replay regressions, validate with `npm run test:engine` first, then run a targeted replay smoke test if the issue is simulation- or UI-shape-related.
