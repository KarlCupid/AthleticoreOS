# Athleticore OS - Architecture & Context

**CRITICAL:** Always read `STATE.md` first to understand current project priorities before making any targeted code changes.

This file serves as a high-level map for AI agents to understand the repository structure and domain logic without having to crawl the entire codebase. Please use this as a reference to keep context windows small and focused.

## Tech Stack
- **Framework:** React Native (Expo)
- **Language:** TypeScript
- **Styling/Animation:** react-native-reanimated, customized vanilla UI components
- **Backend/Database:** Supabase

## Directory Structure
- `/src/components` - Reusable, isolated UI components (e.g., `HeroHeader`, grids, base cards).
- `/src/screens` - Main page views (e.g., `DashboardScreen`, `WorkoutScreen`). Contains most data fetching and local state glue. 
- `/src/navigation` - React Navigation stacks (e.g., `TabNavigator`, `MainStack`).
- `/src/theme` - Color palettes, themes, and design system variables (e.g., `ReadinessThemeContext`).
- `/lib/api` - Interaction with Supabase database (e.g., `scService.ts` for strength & conditioning).
- `/lib/engine` - Core deterministic logic (S&C/Nutrition calculation engines).
- `/lib/supabase.ts` - Supabase client setup.

## Key Files to Know
1. **`lib/engine/types.ts`:** Central repository for most core domain interfaces (`ReadinessState`, `TrainingSession`, `WorkoutLog`, etc.). Always refer here for types before proposing new ones.
2. **`DashboardScreen.tsx`, `WorkoutScreen.tsx`, & `CutPlanSetupScreen.tsx`:** Previously monolithic, these screens now primarily handle data fetching and state orchestration. Their complex UI sections have been successfully extracted into smaller, focused components within `/src/components` (e.g., `DashboardNutritionCard`, `WorkoutAnalyticsTab`, `CutPlanPreviewStep`) to improve maintainability and AI context efficiency.
3. **`lib/engine/calculateSC.ts` & `calculateACWR.ts`:** Key logic hubs for computing workout prescriptions and workloads.

## AI Instructions for Context Efficiency
1. **Targeted Reading:** Use specific file reads rather than broad recursive directory searches. Refrain from viewing `package-lock.json` or image files.
2. **Modular Edits:** For logic updates, check if the change belongs in `/lib/engine/` rather than a screen component to keep files small and separated by concern.
3. **Type Re-use:** To minimize context drain, import types from `lib/engine/types.ts` rather than redefining them inside components.

## Large-File Routing (Token-Saving)
When possible, avoid opening entire high-line files. Jump directly to the relevant section:

- `lib/engine/calculateSchedule.ts` (~1,500 lines)
  - Recovery/day validation: `getRecoveryWindow`, `validateDayLoad`, `suggestAlternative` (around lines 296-460)
  - Nutrition/day adjustment: `adjustNutritionForDay` (around lines 470-570)
  - Weekly planning core: `generateWeekPlan` (around lines 749-1129)
  - Daily adaptation/compliance: `adaptDailySchedule`, `calculateWeeklyCompliance` (around lines 1142+)
- `lib/engine/calculateSC.ts` (~835 lines)
  - Workout generation: `generateWorkout`, `generateWorkoutV2` (around lines 238-738)
  - Equipment/time constraints: `filterByEquipment`, `fitToTimeConstraint` (around lines 401-491)
- `lib/engine/calculateWeightCut.ts` (~817 lines)
  - Plan generation/safety: `generateCutPlan`, `validateCutSafety` (around lines 71-545)
  - Daily/fight-week protocol: `computeDailyCutProtocol`, `computeRehydrationProtocol` (around lines 565+)
- `src/screens/GuidedWorkoutScreen.tsx` (~1,200 lines)
  - Reusable UI helper components are defined before the screen export. Prefer editing local components first, then the main `GuidedWorkoutScreen` body.
- `lib/engine/types.ts` (~1,295 lines)
  - Use section headers (ACWR, hydration, schedule, weight cut, camp, overload, warmup) and only load the domain-specific type block.

## Excluded by Agent Ignore
To reduce context cost across Codex/Antigravity/Claude, these are excluded by default:
- Local compile diagnostics (`compile_errors.txt`, `*.log`)
- Generated SQL bundles in `archive/generated/` (`supabase_migration_and_seed.sql`, `supabase_schedule_migration.sql`, `migration_recurring_activities.sql`)
- Large local simulation/seed artifacts (`scripts/simulate_*.ts`, `lib/data/exerciseSeed.ts`, `archive/generated/test.js`)
