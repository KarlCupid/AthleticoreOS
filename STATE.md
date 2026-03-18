# Project State

**Last Updated:** 2026-03-17

## Current Direction
- **Daily Engine v3:** the core orchestration layer has been upgraded to a more granular, simulation-backed version that manages complex concurrent training interference.
- **Interference & Autoregulation:** `lib/engine` now explicitly models the metabolic and structural interference between S&C and Conditioning, with real-time autoregulation of prescriptions.
- **Intervention Enforcement:** the system proactively identifies and enforces interventions for weight drift, excessive chronic load, or nutritional gaps.
- **Sim-First Validation:** all engine changes are verified against a massive library of athlete personas via `lib/engine/simulation`.

## What Is Already In Place
- Auth -> onboarding -> planning setup -> tab navigation gate is implemented in `App.tsx`.
- Dashboard data is driven by live engine state via `useDashboardData`.
- Weekly planning, guided workout handoff, and mission snapshot reuse are implemented.
- Interference Model, Energy Availability, and SC Autoregulation modules are integrated into the core engine.
- Daily engine snapshots are persisted in `daily_engine_snapshots` with v3 schema support.
- Weight drift and external training load tracking are implemented at the database and API level.
- Engine test coverage is high, supplemented by rigorous simulation runs (`/sim_results`).

## Current Priorities
- **Intervention Mastery:** refine the "coaching nudge" and enforcement logic to ensure athletes stay within safe performance windows.
- **Simulation Fidelity:** ensure the persona library in `lib/engine/simulation` accurately represents edge-case athlete behaviors.
- **ACWR & External Load:** deepen the integration of unscheduled external load into the acute:chronic workload calculations.
- **Testing discipline:** continue adding engine-level coverage when changing deterministic behavior.

## Active Risks / Tech Debt
- Some large files still exist, especially in engine and screen orchestration layers.
- Snapshot-backed flows can drift if mission schema changes are not updated everywhere.
- The app mixes legacy data paths with newer mission-driven behavior in some places, so regressions can hide in fallback logic.
- Weekly plan and scheduled activity flows need careful handling because both can feed today's mission and workout entry points.

## Working Assumptions For Agents
- Read this file first, then `CONTEXT.md`.
- Assume the daily mission engine is the current product source of truth unless the task explicitly targets legacy behavior.
- When changing user-facing recommendations, verify whether the change belongs in engine logic, API orchestration, snapshot persistence, or only the UI.
- Keep documentation aligned with the current athlete OS direction whenever major architecture or product-state changes land.
