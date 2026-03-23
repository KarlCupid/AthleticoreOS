# Project State

**Last Updated:** 2026-03-21

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
- Supabase migrations are present through `015_engine_v3_foundation.sql`.

## Current priorities

- Keep documentation and architecture notes aligned with the actual code, especially around engine orchestration and persistence contracts.
- Continue improving intervention behavior inside the mission and cut logic without fragmenting the ownership model.
- Maintain confidence in ACWR, readiness, and workload-sensitive prescriptions.
- Add or preserve engine-level coverage whenever deterministic behavior changes.

## Active risks and tech debt

- `lib/api/dailyMissionService.ts` is the densest orchestration file and remains a likely source of coupling risk.
- Snapshot-backed behavior can drift if schema or mission shape changes are only updated in one path.
- The app still has legacy fallback behavior in some flows, especially around planning completion and reused mission data.
- Weekly plan entries and scheduled activities both influence the daily mission, so precedence bugs are easy to introduce.
- Simulation tooling exists, but its usage is still discipline-dependent rather than enforced by the toolchain.

## Working assumptions

- Read this file first, then `CONTEXT.md`.
- Treat the daily engine and its persisted snapshots as the operational source of truth.
- Before changing UI summaries, verify whether the real fix belongs in engine logic or service orchestration.
- When documentation drifts from the code, update the docs in the same pass as the code change.
