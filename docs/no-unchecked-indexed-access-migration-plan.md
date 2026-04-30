# noUncheckedIndexedAccess Migration Plan

Date: 2026-04-29

## Summary

Adding `"noUncheckedIndexedAccess": true` to `tsconfig.json` currently creates too many errors for one reviewable PR.

Measured with:

```bash
npm run typecheck
```

Temporary result with the flag enabled:

- 246 TypeScript errors
- 69 files
- Most common compiler codes:
  - 108 `TS18048`: indexed value is possibly `undefined`
  - 76 `TS2532`: object is possibly `undefined`
  - 34 `TS2322`: `T | undefined` assigned to `T`
  - 26 `TS2345`: `T | undefined` passed where `T` is required
  - 1 `TS2488`: possible undefined value used as iterable
  - 1 `TS2538`: possible undefined index key

Because Athleticore OS works with partial records, missing check-ins, incomplete plans, and legacy data, this flag is valuable. It should be enabled after a series of smaller safety PRs rather than as a single broad change.

## Top Hotspots

Files with the highest error counts:

- `lib/engine/workoutSessionBuilder.ts`: 23
- `lib/engine/calculateSchedule.ts`: 16
- `lib/engine/sc/autoregulation.test.ts`: 16
- `src/screens/WorkoutScreen.tsx`: 12
- `lib/engine/calculateWeight.ts`: 12
- `lib/engine/calculateRoadWork.ts`: 9
- `src/hooks/useGuidedWorkout.ts`: 9
- `lib/engine/presentation/nutritionQuickAction.test.ts`: 7
- `lib/engine/calculateSC.ts`: 6
- `lib/engine/calculateOverload.ts`: 5
- `src/hooks/workout/computeACWRTimeSeries.ts`: 5
- `src/screens/WeeklyPlanSetupScreen.tsx`: 5
- `lib/performance-engine/tracking-readiness/trackingReadinessEngine.ts`: 5
- `lib/engine/calculateFitness.ts`: 5
- `lib/engine/calculateConditioning.ts`: 5

## Error Categories

### Array Boundary Assumptions

Common patterns:

- `array[0]` used after sorting or filtering
- `array[index]` used inside loops where TypeScript cannot prove the index exists
- `array[array.length - 1]` used without a non-empty guard
- adjacent access such as `items[i]` and `items[i + 1]`

Representative files:

- `lib/engine/workoutSessionBuilder.ts`
- `lib/engine/calculateSC.ts`
- `lib/engine/calculateRoadWork.ts`
- `lib/engine/calculateConditioning.ts`
- `lib/performance-engine/tracking-readiness/trackingReadinessEngine.ts`
- `lib/performance-engine/body-mass-weight-class/bodyMassWeightClassEngine.ts`
- `src/components/WeightTrendCard.tsx`

Migration approach:

- Add local non-empty guards before using first, last, current, next, or top-ranked items.
- Prefer early returns with cautious confidence when required history is missing.
- For pairwise loops, assign `const current = items[i]` and `const next = items[i + 1]`, then guard both before use.
- Avoid global helper abstractions until repeated patterns settle.

### Record and Dictionary Access

Common patterns:

- `records[id]` assumed present
- color maps, metadata maps, and lookup tables indexed by dynamic keys
- partial progress state merged through computed keys

Representative files:

- `src/hooks/useGuidedWorkout.ts`
- `src/components/OvertrainingAlert.tsx`
- `src/components/workout/metadata.ts`
- `lib/api/weeklyPlanService.ts`
- `lib/api/nutritionService.ts`

Migration approach:

- Add fallback values where the UI can safely degrade.
- Add explicit missing-record branches where missing data affects training, nutrition, safety, or persistence.
- Preserve unknown as unknown. Do not convert missing values to zero for body mass, readiness, load, or intake.

### Exercise and Plan Selection

Common patterns:

- selected exercise rows assumed to exist after filtering
- primary weekly-plan entries assumed present
- generated prescriptions updated from possibly missing section entries

Representative files:

- `lib/engine/adaptiveWorkout.ts`
- `lib/engine/calculateSchedule.ts`
- `lib/engine/workoutSessionBuilder.ts`
- `src/screens/WorkoutScreen.tsx`
- `src/hooks/useWeeklyPlanScreenController.ts`
- `src/screens/WeeklyPlanScreen.tsx`

Migration approach:

- Guard missing exercise rows at the selection boundary.
- Return a lower-confidence fallback, skip optional accessory work, or surface a planning warning where appropriate.
- Do not silently remove protected workouts. If a protected anchor is missing supporting data, keep the anchor and degrade the supporting prescription.

### Weight, Body-Mass, and Readiness Safety

Common patterns:

- current and prior body weights assumed present
- first and last trend points assumed present
- readiness deltas calculated from possibly missing samples

Representative files:

- `lib/engine/calculateWeight.ts`
- `lib/performance-engine/body-mass-weight-class/bodyMassWeightClassEngine.ts`
- `lib/performance-engine/tracking-readiness/trackingReadinessEngine.ts`
- `src/components/BodyMassTrendChart.tsx`
- `src/screens/WeightClassHomeScreen.tsx`

Migration approach:

- Treat missing body-mass and readiness values as unknown.
- Reduce confidence or return a caution state when trend endpoints are missing.
- Do not infer that missing hydration, intake, symptoms, sleep, or weight data is safe.

### Date, Time, and Label Parsing

Common patterns:

- split date or time segments assumed present
- weekday labels indexed by numeric day
- generated timeline labels assumed complete

Representative files:

- `src/components/DatePickerField.tsx`
- `src/components/TimePickerField.tsx`
- `src/screens/WorkoutScreen.tsx`
- `src/hooks/dashboard/buildTodayHomeState.ts`
- `src/hooks/workout/computeACWRTimeSeries.ts`

Migration approach:

- Use narrow parsing guards for string segments.
- Fall back to existing date values or neutral labels for UI-only display.
- Avoid parsing fallbacks that create fake performance data.

### Tests With Direct Indexed Assertions

Common patterns:

- test assertions access `result.items[0]` directly
- fixtures derive records from possibly missing search results
- assertions assume generated arrays are non-empty without expressing that expectation

Representative files:

- `lib/engine/sc/autoregulation.test.ts`
- `lib/engine/adaptiveWorkout.test.ts`
- `lib/engine/calculateSchedule.test.ts`
- `lib/engine/foodSearchSupport.test.ts`
- `src/screens/workout/utils.test.ts`

Migration approach:

- Add explicit `expect(value).toBeDefined()` before dereferencing indexed results.
- When the non-empty result is part of the contract, keep the assertion close to the use.
- Do not weaken tests by replacing meaningful expectations with optional chaining.

## Recommended PR Sequence

1. Engine boundary PR: fix first, last, current, and next access in pure engine modules with narrow guards.
2. Body-mass and readiness safety PR: clarify missing trend and check-in behavior in weight-class, readiness, and chart code.
3. Workout prescription PR: guard exercise selection and section-prescription lookups without moving protected anchors.
4. UI fallback PR: add safe display fallbacks for colors, labels, date/time segments, and chart labels.
5. Test assertion PR: update tests to state non-empty expectations before direct indexed assertions.
6. Enable `"noUncheckedIndexedAccess": true` after the above categories are addressed and `npm run typecheck` passes.

## Validation Plan

For each migration PR:

- Run `npm run typecheck`.
- Run focused tests for touched files.
- Run `npm run test:engine` when engine logic changes.
- Prefer `npm run typecheck:clean` before the final flag-enabling PR.

## Next Compiler Flag

Do not enable `exactOptionalPropertyTypes` before `noUncheckedIndexedAccess` is fully adopted. After this migration lands, `exactOptionalPropertyTypes` is the right next flag because it will further separate missing values from explicitly undefined values across partial athlete, nutrition, schedule, and readiness records.
