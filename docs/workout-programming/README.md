# Workout Programming System

This folder documents the production-grade workout-programming system under `lib/performance-engine/workout-programming/`.

The module turns a training request into a safe, explainable workout or weekly program. It combines static programming taxonomy, typed prescriptions, hand-authored coaching intelligence, user constraints, substitution logic, validation, progression decisions, persistence services, a feature-flagged beta UI flow, and an isolated developer-only preview panel.

## Audience

- Engineers: use this to understand module boundaries, service entry points, schema alignment, and tests.
- Coaches and content editors: use this to add exercises, prescriptions, descriptions, and rules safely.
- Product designers: use this to understand what generated workouts can display and why safety fallbacks appear.
- Future Codex runs: use this as the source map before changing the system.

## Main Files

- `types.ts`: canonical TypeScript ontology.
- `seedData.ts`: static taxonomy, exercises, prescriptions, session templates.
- `intelligenceData.ts`: rules, safety flags, descriptions, cues, mistakes, substitution rules, validation metadata.
- `workoutProgrammingEngine.ts`: single-session generation and catalog validation.
- `intelligenceEngine.ts`: personalization, readiness adjustment, safety enrichment.
- `validationEngine.ts`: domain validation.
- `substitutionEngine.ts`: constraint-aware substitution ranking.
- `workoutDescriptionService.ts`: display-ready coaching copy.
- `personalizationEngine.ts`: user profile handling and next progression decisions.
- `programBuilder.ts`: weekly periodized planning.
- `persistenceService.ts`: Supabase-compatible persistence surfaces with in-code fallback.
- `workoutProgrammingService.ts`: high-level app-facing facade.
- `workoutGenerationService.ts`, `workoutCompletionService.ts`, `workoutProgressionService.ts`, `workoutProgramService.ts`, `workoutDescriptionFacade.ts`, `workoutSubstitutionService.ts`: focused service orchestration behind the facade.
- `workoutProgrammingFallbacks.ts`: shared beta/dev fallback, error-copy, feature-flag, and content-review-mode rules.
- `workoutSafetyCopy.ts`: shared generated-workout safety, fallback, and local-mode copy.
- `contentReviewWorkflow.ts`: JSON queue/decision workflow for coach/admin review handoff.
- `workoutMediaAudit.ts`: exercise media asset audit helpers and approved media selection.
- `analyticsEngine.ts`: adherence, completion, pain trend, and recommendation quality summary.

## Database Migrations

- `033_workout_programming_mvp.sql`: historical foundation schema for static catalog and initial generated workout tables.
- `034_workout_programming_remaining_phases.sql`: user-specific programming, completions, profiles, feedback, programs, progression tables.
- `036_workout_programming_rls_hardening.sql`: RLS enablement and user-scoped policies for user data.
- `037_workout_programming_domain_model_alignment.sql`: schema support for richer ontology and typed payloads.
- `038_workout_programming_content_review_metadata.sql`: content review, safety review, rollout eligibility, and media review metadata.
- `039_workout_programming_progression_history.sql`: progression history and richer completion metadata.
- `040_workout_programming_atomic_rpcs.sql`: transactional RPCs for generated workouts, completions, generated programs, and program-session completion.
- `041_workout_programming_session_lifecycle.sql`: durable generated workout session lifecycle state.
- `042_workout_programming_completion_surfaces.sql`: generated completion fields for history and analytics surfaces.
- `043_workout_programming_recommendation_telemetry.sql`: recommendation quality telemetry events.

## Data Flow

1. App code calls the `workoutProgrammingService` facade.
2. Focused service modules load the static catalog and user profile through `persistenceService`.
3. The generator resolves goal, workout type, session template, prescription template, and exercises.
4. Personalization applies readiness, pain, equipment, preferences, safety flags, and constraints.
5. Substitution logic ranks safe alternatives.
6. Description service generates display-ready coaching copy.
7. Validation engine checks domain correctness.
8. Persistence saves critical generated workout, completion, program, and program-session parent/child writes through transactional RPCs when Supabase is available; dev/test fallback remains guarded.

## Guide Index

- [Database and Security](./database-and-security.md)
- [Current Production Readiness Status](./current-production-readiness-status.md)
- [Live DB Smoke Tests](./live-db-smoke-tests.md)
- [Copy and Accessibility](./copy-and-accessibility.md)
- [Media Assets](./media-assets.md)
- [Models and Content](./models-and-content.md)
- [Engine Behavior](./engine-behavior.md)
- [How-To Workflows](./how-to.md)
- [Generated Workout UI Smoke Checklist](./ui-smoke-checklist.md)
- [Testing, Limitations, and Roadmap](./testing-limitations-roadmap.md)

## Quick Start: Generate a Workout

```ts
import { workoutProgrammingService } from '../lib/performance-engine/workout-programming';

const workout = await workoutProgrammingService.generatePreviewWorkout({
  goalId: 'beginner_strength',
  durationMinutes: 30,
  equipmentIds: ['bodyweight', 'dumbbells'],
  experienceLevel: 'beginner',
  readinessBand: 'green',
});
```

For user-aware generation:

```ts
const workout = await workoutProgrammingService.generateWorkoutForUser(userId, {
  goalId: 'dumbbell_hypertrophy',
  preferredDurationMinutes: 45,
});
```

Use the service layer for app integration. Lower-level engines remain exported for tests and specialist work, but UI/API code should not assemble raw seed data directly.
