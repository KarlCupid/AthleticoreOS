# Agent Guidance: Working with Athleticore OS

Athleticore OS is a high-performance system where logic is strictly separated from presentation. Follow these rules to work efficiently and reduce agent overhead.

## Executive Summary: What is Athleticore OS?
Athleticore OS is a **daily operating system for elite athletes**, centralizing all biological and performance variables (Readiness, ACWR, Nutrition, Weight, and Phase Context) into a unified **Daily Mission Engine**. The app is "mode-aware," dynamically shifting between **Build Phases** and **Fight Camps** (including weight cut management), providing a single, clear directive every 24 hours.

## Architectural Commandments
1. **Trust the Engine**: All business logic lives in `lib/engine/*`. If you need to know *why* a number was calculated, read the engine code and its `.test.ts` file. Do not attempt to reverse-engineer logic from the UI.
2. **Anti-Wiring**: Engine functions (`lib/engine`) MUST be pure and synchronous. No database calls, no network requests. If you need data, pass it in as an argument.
3. **Decision Traceability**: The engine produces a `decisionTrace`. Use it to explain system behavior to the user.
4. **Snapshot Persistence**: The system relies on "snapshots" of the engine state (`daily_engine_snapshots`). Changes to types in `lib/engine/types.ts` may require migrations for stored snapshots.

## Token-Saving Tips
- **Check the Tests First**: Engine tests (`lib/engine/*.test.ts`) are the fastest way to understand complex logic without reading hundreds of lines of implementation.
- **Layer awareness**:
    - Logic change? Go to `lib/engine`.
    - Data flow change? Go to `lib/api` or `src/hooks`.
    - Visual change? Go to `src/screens` or `src/components`.
- **Don't Guess**: If you're unsure about the "Performance Objective" or "Camp Phase" routing, check `lib/engine/calculateMission.ts`.

## Where To Look First
- `App.tsx`: App gate and main flow.
- `lib/api/dailyMissionService.ts`: Daily engine orchestration.
- `src/hooks/useDashboardData.ts`: Dashboard state assembly.
- `lib/engine/index.ts`: Source of truth for engine logic.
