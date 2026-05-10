# How-To Workflows

This guide gives practical workflows for engineers and content editors.

## How to Generate an Athleticore Support Session

Use the service layer for app/API code. Product UI should pass boxing intent plus athletic-development domain instead of a generic fitness goal:

```ts
import { workoutProgrammingService } from '../../lib/performance-engine/workout-programming';

const session = await workoutProgrammingService.generateGeneratedWorkoutSessionForUser(userId, {
  goalId: 'roadwork_aerobic_base',
  durationMinutes: 35,
  equipmentIds: ['bodyweight', 'track_or_road'],
  experienceLevel: 'beginner',
  readinessBand: 'green',
  intendedBoxingSessionFamily: 'roadwork_zone2',
  intendedBoxingSessionRole: 'roadwork_aerobic_base',
  intendedSessionDoseCategory: 'support_session',
  athleticDevelopmentDomain: 'roadwork',
  preferredSessionTemplateId: 'boxing_roadwork_zone2',
});
```

For low-risk boxing skill support:

```ts
const session = await workoutProgrammingService.generateGeneratedWorkoutSessionForUser(userId, {
  goalId: 'footwork_agility',
  preferredDurationMinutes: 20,
  equipmentIds: ['bodyweight', 'open_space'],
  intendedBoxingSessionFamily: 'footwork_agility',
  intendedBoxingSessionRole: 'footwork_agility',
  intendedSessionDoseCategory: 'microdose',
  athleticDevelopmentDomain: 'speed_agility',
  preferredSessionTemplateId: 'footwork_agility',
  preferredToneVariant: 'coach_like',
});
```

Use the session helpers so generation, persistence, completion, feedback, and progression stay in the service layer:

```ts
const completion = await workoutProgrammingService.completeGeneratedWorkoutSession(userId, {
  workout: session.workout,
  generatedWorkoutId: session.generatedWorkoutId,
  startedAt: new Date().toISOString(),
  sessionRpe: 6,
  painScoreBefore: 0,
  painScoreAfter: 1,
  completionStatus: 'completed',
  rating: 5,
});

console.log(completion.progressionDecision.nextAdjustment);
```

For weekly programs:

```ts
const program = await workoutProgrammingService.generateWeeklyProgramForUser(userId, {
  goalId: 'boxing_support',
  sessionsPerWeek: 4,
  desiredProgramLengthWeeks: 4,
  availableDays: [1, 2, 4, 6],
  boxingTrainingContext: {
    track: 'amateur_open',
    protectedWorkouts: [
      { dayOfWeek: 2, modality: 'boxing_skill', durationMinutes: 75, intensity: 'moderate' },
      { dayOfWeek: 5, modality: 'sparring', durationMinutes: 60, intensity: 'hard' },
    ],
  },
});
```

After weekly generation, app/API code should project the program into `weekly_plan_entries` with `generatedProgramToWeeklyPlanEntries`. Do not call `generateAdaptiveSmartWeekPlan` or `calculateSC` as a fallback.

If compatibility or simulation code must exercise old generation APIs, import them from `lib/engine/legacyWorkoutGeneration.ts`. That includes `generateLegacyBlockPlan` / the legacy `generateBlockPlan` alias. Do not expose them through `lib/engine/index.ts` or call them from product workout-generation flows.

## How to Add a New Exercise

1. Add the exercise to the right content pack under `lib/performance-engine/workout-programming/content/exercises/`.
2. Use a stable snake_case `id`.
3. Fill the full ontology:
   - Movement patterns and sub-patterns
   - Primary and secondary muscles
   - Joints and plane of motion
   - Equipment required and optional
   - Setup type
   - Experience and technical complexity
   - Loadability and fatigue cost
   - Joint/spine/cardio/balance demands
   - Home/gym/beginner friendliness
   - Contraindication flags
   - Setup, execution, breathing, and safety notes
   - Tracking metrics
   - Default prescription ranges
4. Add `reviewStatus`, `safetyReviewStatus`, `riskLevel`, `rolloutEligibility`, `contentVersion`, and `lastUpdatedAt`.
5. Add media hooks even when assets are not ready:
   - `media.videoUrl: null`
   - `media.imageUrl: null`
   - `media.thumbnailUrl: null`
   - `media.animationUrl: null`
   - Specific `media.altText`
   - `media.reviewStatus: 'needs_review'`
   - `media.missingReason`
   - `media.priority: 'low' | 'medium' | 'high'`
6. Add valid regression, progression, and substitution IDs only when they preserve intent.
7. Add coaching cues and common mistakes under `content/intelligence/` if the exercise is important.
8. Run:

```bash
npm run workout:validate-content
npm run workout:audit-content
npm run test:engine
```

Checklist before committing:

- Every referenced ID exists.
- The exercise has at least one equipment compatibility path.
- Safety notes are specific.
- Tracking metrics match the prescription.
- Missing media appears in the audit report instead of pretending an asset exists.
- Any real media URL has useful alt text and an approved review status before release.
- Tests do not flag generic filler.

## How to Add a New Workout Type

1. Add a new item to `content/taxonomy/workoutTypes.ts`.
2. Add one or more `trainingGoals` that map to it.
3. Update the goal-to-workout-type mapping in `workoutProgrammingEngine.ts` if needed.
4. Add compatible `PrescriptionTemplate` entries with typed payloads.
5. Add one or more `SessionTemplate` entries with blocks and movement slots.
6. Add or tag exercises with the new workout type.
7. Add description templates in `content/intelligence/descriptions.ts`.
8. Add validation rules if the workout type has unique constraints.
9. Add QA tests that generate the new workout type under normal and constrained conditions.

Avoid adding a workout type if it can be represented as a goal, format, or prescription variant of an existing type.

## How to Add a New Validation Rule

1. Define the rule intent in `content/intelligence/validationRules.ts` as metadata.
2. Implement executable logic in `validationEngine.ts`.
3. Return:
   - Clear `failedRuleIds`
   - Actionable `suggestedCorrections`
   - Calm `userFacingMessages`
   - Useful `decisionTrace`
4. Add invalid-case tests.
5. Add a valid-case test showing the rule does not over-block safe workouts.

Validation rules should block unsafe or incoherent programming. They should not be used to enforce personal style preferences.

## How to Add a Prescription Template

1. Pick the correct `PrescriptionKind` and content pack under `content/prescriptions/`.
2. Fill the typed `payload` completely.
3. Scope with `appliesToWorkoutTypeIds` and, when useful, `appliesToGoalIds`.
4. Add success criteria, coach notes, and user-facing summary.
5. Ensure required tracking metrics exist on compatible exercises.
6. Add tests for generated workout output shape.

## How to Add Coaching Copy

1. Add or update a `DescriptionTemplate` in `content/intelligence/descriptions.ts`.
2. Scope it to a goal, workout type, session template, exercise, or program.
3. Choose a tone variant.
4. Fill every major field:
   - Intent
   - Plain summary
   - Coach explanation
   - Effort explanation
   - Why it matters
   - How it should feel
   - Scaling
   - Safety
   - Completion/next-session copy
5. Run tests to catch generic copy.

## Content Authoring Tools

Run these commands before handing content to engineering review:

```bash
npm run workout:validate-content
npm run workout:audit-content
npm run workout:review-content -- export-queue --out review-queue.json
npm run workout:export-seed -- --out C:\tmp\workout-programming-seed.json
```

`workout:validate-content` is CI-ready and fails on validation errors, duplicate IDs,
or production blockers. Use `--json` when another tool needs machine-readable output,
and `--strict` for release-grade validation, where warnings and unresolved release
blockers fail the command.

`workout:audit-content` prints a production-oriented report with:

- Summary counts
- Validation errors and warnings
- Review blockers
- Production blockers
- Missing media
- Exercises without substitutions
- Prescriptions without progression rules
- Missing description tone variants
- Duplicate IDs and orphaned references
- Unsafe content marked production-eligible
- Suggestions for the next cleanup pass

`workout:review-content` supports the coach/admin review handoff:

- `export-queue --out review-queue.json`
- `validate-decisions --in review-decisions.json`
- `apply-decisions --in review-decisions.json`
- `export-sql --in review-decisions.json --out review-updates.sql`

Use `--review-decisions review-decisions.json` with `workout:validate-content` or
`workout:audit-content` when release checks should consume approved review
metadata from the JSON workflow.

`workout:export-seed` reuses `buildWorkoutProgrammingSeedRows()` and emits the Supabase
static catalog row shape. Without `--out`, it writes JSON to stdout. With `--out`, it
writes the JSON artifact to the requested path. The export refuses to run when content
has validation or production blockers unless `--allow-invalid` is passed for local
debugging.

## How to Add Persistence

1. Prefer adding a function to `persistenceService.ts`.
2. Keep user access scoped by `user_id` or parent ownership.
3. Add a mock-backed test.
4. Add a forward-only migration if schema changes are required.
5. Do not let UI code talk directly to raw tables unless there is a strong reason.

## How to Display Athleticore Support Sessions

UI should render a `GeneratedWorkout` and avoid business logic duplication.

Current product UI path:

- `src/components/workout/GeneratedWorkoutPreviewCard.tsx`
- `src/components/workout/BoxingGeneratedWorkoutSessionCard.tsx`
- `src/components/workout/BoxingGeneratedWorkoutContainer.tsx` for explicit standalone/ad hoc extra support generation only
- `src/screens/WorkoutScreen.tsx`
- `src/screens/WorkoutDetailScreen.tsx`
- `src/hooks/useBoxingGeneratedWorkout.ts`
- Rollout flag: `EXPO_PUBLIC_BOXING_WORKOUT_ENGINE_ENABLED`

The Athleticore support flow supports generate, inspect, start, completion logging, workout feedback, exercise preferences, and next progression recommendation. When a Supabase user is available it persists generated workouts, completions, feedback, and progression decisions. Without an authenticated user, it stays in local in-memory mode.

Train shows Athlete Support This Week when an active generated week exists. The Today tab shows the planned Athleticore support session from `todayPlanEntry` and its `BoxingGeneratedPlanEntrySnapshot` as the single active-session execution card, not a duplicate hero CTA and not an unrelated standalone configure/generate surface. Protected boxing anchors are separated from Athleticore support sessions, and domain tags show Strength, Power, Roadwork, Conditioning, Durability, Mobility, Recovery, or Skill support.

Today's active support session is selected from `weekly_plan_entries` by reading the `BoxingGeneratedPlanEntrySnapshot` directly. The snapshot is the runtime signal even if older rows are missing `placement_source`. Planned generated support snapshots open `WorkoutDetail`, not `GuidedWorkout`; old guided-prescription rows remain readable through compatibility routing only. If the planned snapshot has no attached `GeneratedWorkout`, `WorkoutDetail` owns the generate/attach step from the weekly-plan snapshot.

Daily performance and nutrition should consume snapshot metadata directly:

- `athleticDevelopmentDomain`
- `expectedFuelPriority`
- `expectedCarbDemandClass`
- `expectedRecoveryDemandClass`
- `expectedHydrationDemandClass`
- `sessionEnergyDemandScore`
- `sessionRecoveryDemandScore`
- `supportDomainLabel`
- `boxingSessionFamily`
- `boxingSessionRole`
- `boxingRelevance`
- `sAndCRationale`
- `athleticDevelopmentRationale`

`DailyAthleteSummary.trainingDirective` exposes those support-domain fields for UI copy and summary cards. UI should prefer direct metadata over title parsing.

`DailyAthleteSummary.fuelDirective` exposes the same support-domain fields for Fuel and nutrition surfaces: support domain, support label, fuel priority, demand classes, energy/recovery demand scores, boxing family/role, boxing relevance, S&C rationale, and athletic-development rationale. Fuel UI should read these fields directly and keep `prioritySession` as the canonical fueling priority.

Low-risk `boxing_skill_support` microdoses are not sparring. They should route as develop/recover support unless the session is actual sparring, protected boxing practice, or high-intensity boxing practice.

Title and family string inference is only a fallback for archived rows.

Internal diagnostics are not rendered in the normal Train screen, do not persist, and should not be treated as a production rollout path.

Future UI work should call `workoutProgrammingService`, the boxing weekly adapter, or the generated workout completion service. It should not call raw seed data, lower-level legacy engines, `generateAdaptiveSmartWeekPlan`, `generateSmartWeekPlan`, `generateLegacyBlockPlan`, `generateWorkoutV2`, or `calculateSC` for product workout generation. Those old functions remain compatibility/simulation-only behind `lib/engine/legacyWorkoutGeneration.ts`.
