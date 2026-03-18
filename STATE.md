# Project State

**Last Updated:** 2026-03-17

## Current Direction
- **Athlete OS:** the app is now centered on a daily operating system for athletes, not just isolated workout or nutrition screens.
- **Daily mission engine:** `getDailyEngineState` is the main integration point joining objective context, readiness, ACWR, hydration, nutrition, workout prescription, camp risk, and daily mission output.
- **Structured planning:** onboarding now leads into a required planning setup flow before the main tab app is accessible.
- **Mode-aware coaching:** the product actively supports both `build_phase` and `fight_camp`, including active cut and fight-week related flows.
- **Functional Core Pattern:** coaching logic is isolated in pure, deterministic engine functions (`lib/engine/*`) for 100% testability.

## What Is Already In Place
- Auth -> onboarding -> planning setup -> tab navigation gate is implemented in `App.tsx`.
- Dashboard data is driven by live engine state via `useDashboardData`.
- Weekly planning, guided workout handoff, and mission snapshot reuse are implemented.
- Daily engine snapshots are persisted in `daily_engine_snapshots`.
- Weight cut, rehydration, nutrition, readiness, and camp risk features are integrated into the broader planning model.
- Engine test coverage exists across ACWR, camp, conditioning, daily coach debrief, nutrition, overload, performance planner, road work, schedule, strength and conditioning, adaptive workout, weight, and weight cut logic.

## Current Priorities
- **Consistency across surfaces:** keep dashboard, weekly plan, guided workout, and logs using the same engine-derived truth.
- **Snapshot reliability:** ensure `PrescriptionV2` schema updates don't break historical snapshots in `daily_engine_snapshots`.
- **ACWR Integrity:** rigorously monitor acute:chronic workload ratios, especially when users skip rest days or add unscheduled volume.
- **Planning quality:** keep rolling schedule generation and plan setup stable for both build phase and fight camp.
- **Execution polish:** improve guided workout, logging, and daily action flows without breaking the engine contract.
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
