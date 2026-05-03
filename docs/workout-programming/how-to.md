# How-To Workflows

This guide gives practical workflows for engineers and content editors.

## How to Generate a Workout

Use the service layer for app/API code:

```ts
import { workoutProgrammingService } from '../../lib/performance-engine/workout-programming';

const workout = await workoutProgrammingService.generatePreviewWorkout({
  goalId: 'beginner_strength',
  durationMinutes: 30,
  equipmentIds: ['bodyweight', 'dumbbells'],
  experienceLevel: 'beginner',
  readinessBand: 'green',
});
```

For user-personalized generation:

```ts
const workout = await workoutProgrammingService.generateWorkoutForUser(userId, {
  goalId: 'dumbbell_hypertrophy',
  preferredDurationMinutes: 45,
  preferredToneVariant: 'coach_like',
});
```

For the beta generated-session flow, use the session helpers so generation, persistence,
completion, feedback, and progression stay in the service layer:

```ts
const session = await workoutProgrammingService.generateGeneratedWorkoutSessionForUser(userId, {
  goalId: 'beginner_strength',
  durationMinutes: 30,
  equipmentIds: ['bodyweight', 'dumbbells'],
  readinessBand: 'green',
});

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
  goalId: 'beginner_strength',
  sessionsPerWeek: 3,
  desiredProgramLengthWeeks: 4,
  availableDays: [1, 3, 5],
});
```

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
   - Specific `media.altText`
   - `media.reviewStatus: 'needs_review'`
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
npm run workout:export-seed -- --out C:\tmp\workout-programming-seed.json
```

`workout:validate-content` is CI-ready and fails on validation errors, duplicate IDs,
or production blockers. Use `--json` when another tool needs machine-readable output,
and `--strict` when warnings should fail the command too.

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

## How to Display Generated Workouts

UI should render a `GeneratedWorkout` and avoid business logic duplication.

Current non-invasive UI path:

- `src/components/workout/GeneratedWorkoutPreviewCard.tsx`
- `src/components/workout/GeneratedWorkoutBetaSessionCard.tsx`
- Feature flag in `WorkoutScreen.tsx`
- Beta flow enabled when `EXPO_PUBLIC_WORKOUT_PROGRAMMING_BETA=1`
- Developer-only read-only preview enabled when beta is disabled, `__DEV__` is true, and `EXPO_PUBLIC_WORKOUT_PROGRAMMING_PREVIEW=1`

The beta flow supports generate, inspect, start, completion logging, workout feedback,
exercise preferences, and next progression recommendation. When a Supabase user is
available it persists generated workouts, completions, feedback, and progression
decisions. Without an authenticated user, it stays in local in-memory mode.

Future UI work should call `workoutProgrammingService`, not raw seed data or lower-level engines.
