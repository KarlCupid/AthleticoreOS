# Project State

**Last Updated:** 2026-03-14

## Current Focus
* **AI Efficiency:** Optimizing the repository for AI agents (Antigravity, Claude, Codex) to minimize context window usage and improve response accuracy.
* **Core Engine Refinement:** Enhancing deterministic logic for dynamic workout generation, scheduling (`calculateSchedule.ts`), and strength & conditioning generation.
* **Bug Fixing & UI Polish:** Resolving React Native UI issues (e.g., keyboard dismiss, dev server connectivity issues) and ensuring type safety across the board.

## Recent Milestones
* Extracted complex UI sections from monolithic screens (`DashboardScreen.tsx`, `WorkoutScreen.tsx`, etc.) into small, focused components (`/src/components`).
* Resolved various TypeScript compilation errors in `calculateSchedule.ts` and `DayPlanCard.tsx`.
* Fixed `GuidedWorkoutScreen` errors related to undefined `readinessState` parameters.
* Implemented dynamic 4-week adaptive workout generation based on daily readiness.

## Known Issues / Tech Debt
* **Context Overload:** Some legacy files might still be too large; ongoing effort to refactor any screen or engine file over 500 lines.
* **Dev Server:** Occasional issues with Expo development server connection times.
* **Testing:** Need to ensure `lib/engine` logic is thoroughly unit tested to catch edge cases in workout generation.

## How to use this file
AI Agents should read this file first (alongside `CONTEXT.md`) to understand the current priority and avoid regressions, without needing to process the entire conversational history. Update this file whenever a major milestone is reached or the high-level focus shifts.
