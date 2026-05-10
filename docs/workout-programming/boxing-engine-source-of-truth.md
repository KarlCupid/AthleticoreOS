# Boxing Engine Source Of Truth

AthleticoreOS is a boxing-athlete S&C and performance-support platform. Workout programming has one canonical runtime owner: the boxing athlete support engine in `lib/performance-engine/workout-programming/`.

## Canonical Objects

- Weekly program: `GeneratedProgram`
- Planned session: `GeneratedProgramSession`
- Executable generated workout: `GeneratedWorkout`
- Weekly persistence projection: `weekly_plan_entries`, built from `GeneratedProgram` sessions
- Athletic-development domain: `BoxingAthleteSupportDomain`
- Completion and progression source: generated workout completion logs, exercise results, substitutions, feedback tags, pain before/after, session RPE, ratings, notes, readiness, and progression decisions

`weekly_plan_entries` and `scheduled_activities` remain useful storage and calendar surfaces. They do not decide the programming intent for new weeks. New weekly rows should be created from boxing `GeneratedProgram` sessions through `generatedProgramWeeklyPlanAdapter.ts`.

Today's active Athleticore training selection recognizes a `BoxingGeneratedPlanEntrySnapshot` in `weekly_plan_entries.prescription_snapshot` as the source of truth. A planned generated support snapshot is active training even when it has no legacy `WorkoutPrescriptionV2.exercises`, and runtime code should trust the snapshot itself rather than require `placement_source = generated`. Planned generated support ranks ahead of protected anchors and old guided compatibility rows.

## Not Source Of Truth

These paths are not allowed to own normal product workout generation:

- `adaptiveTrainingAdapter`
- `calculateSC` and old smart-week generation
- `generateAdaptiveSmartWeekPlan`
- `WorkoutPrescriptionV2` as the primary generated workout format
- Generic generated workout flows
- `general_fitness_legacy` as a user-facing mode

They may exist only for old data compatibility, characterization tests, unrelated legacy calculations, or explicit migration helpers.

Legacy workout-generation functions such as `generateWorkoutV2`, `generateAdaptiveSmartWeekPlan`, and the `generateSmartWeekPlan` alias are exposed only from `lib/engine/legacyWorkoutGeneration.ts`, which is an explicit compatibility boundary. Product app code should not import them from `lib/engine/index.ts`.

## Weekly Plan Flow

1. Load weekly configuration, gym/equipment profile, athlete context, readiness, fight-camp context, protected recurring activities, recent completions, and progression decisions.
2. Build a `BoxingTrainingContext`.
3. Call `generateWeeklyProgramForUser` or `generateWeeklyProgramFromPerformanceState`.
4. Convert `GeneratedProgram` sessions into `weekly_plan_entries` with support-domain snapshots.
5. Save the week projection before persisting/linking the generated program so orphan active programs are not left silently.
6. Render Train, Plan, Detail, history, analytics, nutrition, and daily performance from the boxing snapshot and generated workout completion surfaces.

If boxing generation fails, the product should show a clear "could not generate week" error. It must not silently substitute the old adaptive generator.

## Compatibility Boundary

Old `weekly_plan_entries` and old `prescription_snapshot` rows can be read so athletes do not lose history. Compatibility helpers may:

- Detect old rows with `isLegacyWeeklyPlanEntry`.
- Detect boxing rows with `isBoxingGeneratedWeeklyPlanEntry`.
- Read boxing snapshots with `getBoxingSnapshotFromWeeklyPlanEntry`.
- Classify runtime surfaces with `classifyPlanEntryRuntimeSurface`: `athleticore_support_session`, `protected_boxing_anchor`, `legacy_guided_workout`, `archived_compatibility`, or `unknown`.
- Map safe old rows into a boxing intent with `migrateLegacyEntryToBoxingIntent`.
- Build a `GeneratedWorkout` request from a boxing entry with `buildGeneratedWorkoutRequestFromPlanEntry`.

Compatibility helpers must not recreate old runtime generation as a fallback. Old rows without enough boxing intent should be displayed as archived compatibility entries.

`GuidedWorkout` is compatibility-only for old rows that still carry a legacy guided prescription. Generated support sessions and protected boxing anchors route through `WorkoutDetail`; if a support snapshot does not yet have an attached `GeneratedWorkout`, the detail surface may lazily generate and attach one through the generated-workout path.

Daily performance and nutrition read support-domain metadata directly from `BoxingGeneratedPlanEntrySnapshot`, including `athleticDevelopmentDomain`, `expectedFuelPriority`, demand classes, and energy/recovery demand scores. Title and family heuristics are fallback behavior for old data, not the primary interpretation path.

## Boxing Safety Rules

- No generated sparring.
- Sparring and competition are protected coach-led anchors only.
- Protected boxing anchors are not silently moved or removed.
- MMA, grappling, wrestling, BJJ, Muay Thai, kickboxing, and other non-boxing labels are external non-boxing load unless the entry explicitly describes boxing.
- Missing readiness, pain, sleep, hydration, body-mass, symptoms, or fueling data is unknown, not safe.
- Hard generated work should not stack onto sparring or competition days.
- Generated Athleticore support is never marked as a boxing-practice replacement.
- Nutrition, hydration, recovery, and weight-class copy must follow the support domain and safety state.
- Content review, media review, safety validation, and red-readiness blocks remain strict.

## Data Migration Strategy

This migration does not require destructive database changes. Existing tables continue to store plan/calendar rows and generated workout persistence. New rows carry a stable `BoxingGeneratedPlanEntrySnapshot` in `prescription_snapshot`, plus existing flexible columns such as `session_family`, `sc_session_family`, `placement_source`, `progression_intent`, `session_modules`, `dose_credits`, `dose_summary`, and `realized_dose_buckets`.

Future schema work may add first-class boxing snapshot columns, but the current adapter is intentionally forward-compatible and safe to read from UI without fragile `any` logic.

## Do Not Reintroduce

- A second weekly generator beside the boxing engine.
- A generic fitness goal picker as the main generated workout entry point.
- Silent fallback from boxing generation to old smart-week or `calculateSC` generation.
- User-facing "legacy", "beta", "dev preview", "combat", or "general fitness legacy" copy.
- Generated sparring.
- Treating external non-boxing combat-sport load as boxing skill.
- Empty or underfilled weeks hidden behind compatibility behavior.
