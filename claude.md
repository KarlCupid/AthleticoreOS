# Claude Notes

Read `STATE.md` first, then `CONTEXT.md`.

## What This App Is
Athleticore OS is an athlete operating system built with Expo, React Native, TypeScript, and Supabase. The current product center is the daily mission engine that turns athlete context, plan state, readiness, and goal mode into today-specific coaching.

## Current Product Priorities
- Keep the daily engine, weekly planning, and dashboard aligned.
- Preserve the planning-setup gate before users enter the main tab app.
- Maintain parity across `build_phase` and `fight_camp`.
- Favor deterministic logic and persisted snapshots over ad hoc UI-only decisions.

## Where To Look First
- `App.tsx` for entry gating and main app flow.
- `lib/api/dailyMissionService.ts` for daily engine orchestration.
- `src/hooks/useDashboardData.ts` for dashboard state assembly.
- `src/screens/WeeklyPlanScreen.tsx` and `src/screens/DashboardScreen.tsx` for the primary user-facing surfaces.
- `lib/engine/*` for business rules and tests.

## Working Rules
- Put shared behavior in `lib/engine` or `lib/api`, not directly in screens.
- Reuse existing engine types instead of introducing parallel interfaces.
- Respect snapshot persistence: changes to mission shape can affect both `weekly_plan_entries.daily_mission_snapshot` and `daily_engine_snapshots`.
- Treat weight cut, readiness, nutrition, and workout prescription as linked systems.
- Prefer targeted reads; avoid loading large unrelated files.
