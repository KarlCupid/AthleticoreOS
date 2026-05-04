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
- `analyticsEngine.ts`: adherence, completion, pain trend, and recommendation quality summary.

## Database Migrations

- `033_workout_programming_mvp.sql`: initial static catalog and MVP generated workout schema.
- `034_workout_programming_remaining_phases.sql`: user-specific programming, completions, profiles, feedback, programs, progression tables.
- `036_workout_programming_rls_hardening.sql`: RLS enablement and user-scoped policies for user data.
- `037_workout_programming_domain_model_alignment.sql`: schema support for richer ontology and typed payloads.

## Data Flow

1. App code calls the `workoutProgrammingService` facade.
2. Focused service modules load the static catalog and user profile through `persistenceService`.
3. The generator resolves goal, workout type, session template, prescription template, and exercises.
4. Personalization applies readiness, pain, equipment, preferences, safety flags, and constraints.
5. Substitution logic ranks safe alternatives.
6. Description service generates display-ready coaching copy.
7. Validation engine checks domain correctness.
8. Persistence can save generated workouts, completions, feedback, readiness, and progression decisions.

## Guide Index

- [Database and Security](./database-and-security.md)
- [Live DB Smoke Tests](./live-db-smoke-tests.md)
- [Copy and Accessibility](./copy-and-accessibility.md)
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
