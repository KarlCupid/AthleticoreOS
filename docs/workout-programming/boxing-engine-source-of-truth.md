# Boxing Engine Source Of Truth

AthleticoreOS is a boxing-athlete development platform. Workout programming has one canonical runtime owner: the boxing workout-programming engine in `lib/performance-engine/workout-programming/`.

## Canonical Objects

- Weekly program: `GeneratedProgram`
- Planned session: `GeneratedProgramSession`
- Executable generated workout: `GeneratedWorkout`
- Weekly persistence projection: `weekly_plan_entries`, built from `GeneratedProgram` sessions
- Completion and progression source: generated workout completion logs, exercise results, substitutions, feedback tags, pain before/after, session RPE, ratings, notes, readiness, and progression decisions

`weekly_plan_entries` and `scheduled_activities` remain useful storage and calendar surfaces. They do not decide the programming intent for new weeks. New weekly rows should be created from boxing `GeneratedProgram` sessions through `generatedProgramWeeklyPlanAdapter.ts`.

## Not Source Of Truth

These paths are not allowed to own normal product workout generation:

- `adaptiveTrainingAdapter`
- `calculateSC` and old smart-week generation
- `generateAdaptiveSmartWeekPlan`
- `WorkoutPrescriptionV2` as the primary generated workout format
- Generic generated workout flows
- `general_fitness_legacy` as a user-facing mode

They may exist only for old data compatibility, characterization tests, unrelated legacy calculations, or explicit migration helpers.

## Weekly Plan Flow

1. Load weekly configuration, gym/equipment profile, athlete context, readiness, fight-camp context, protected recurring activities, recent completions, and progression decisions.
2. Build a `BoxingTrainingContext`.
3. Call `generateWeeklyProgramForUser` or `generateWeeklyProgramFromPerformanceState`.
4. Convert `GeneratedProgram` sessions into `weekly_plan_entries`.
5. Save the week projection.
6. Render Train, Plan, Detail, history, and analytics from the boxing snapshot and generated workout completion surfaces.

If boxing generation fails, the product should show a clear "could not generate week" error. It must not silently substitute the old adaptive generator.

## Compatibility Boundary

Old `weekly_plan_entries` and old `prescription_snapshot` rows can be read so athletes do not lose history. Compatibility helpers may:

- Detect old rows with `isLegacyWeeklyPlanEntry`.
- Detect boxing rows with `isBoxingGeneratedWeeklyPlanEntry`.
- Read boxing snapshots with `getBoxingSnapshotFromWeeklyPlanEntry`.
- Map safe old rows into a boxing intent with `migrateLegacyEntryToBoxingIntent`.
- Build a `GeneratedWorkout` request from a boxing entry with `buildGeneratedWorkoutRequestFromPlanEntry`.

Compatibility helpers must not recreate old runtime generation as a fallback. Old rows without enough boxing intent should be displayed as archived compatibility entries.

## Boxing Safety Rules

- No generated sparring.
- Sparring and competition are protected coach-led anchors only.
- Protected boxing anchors are not silently moved or removed.
- MMA, grappling, wrestling, BJJ, Muay Thai, kickboxing, and other non-boxing labels are external non-boxing load unless the entry explicitly describes boxing.
- Missing readiness, pain, sleep, hydration, body-mass, symptoms, or fueling data is unknown, not safe.
- Hard generated work should not stack onto sparring or competition days.
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
