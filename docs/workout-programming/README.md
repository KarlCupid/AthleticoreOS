# Workout Programming System

This folder documents the production-grade workout-programming system under `lib/performance-engine/workout-programming/`.

The module turns boxing-athlete context into a safe, explainable workout or weekly program. The boxing workout-programming engine is the canonical runtime source for weekly planning, generated support sessions, completion, progression, and training-week intelligence. It combines static programming taxonomy, typed prescriptions, hand-authored coaching intelligence, user constraints, substitution logic, validation, progression decisions, persistence services, boxing-week adapters, and internal diagnostics.

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
- `generatedProgramWeeklyPlanAdapter.ts`: canonical `GeneratedProgram` to `weekly_plan_entries` projection plus old-row compatibility helpers.
- `persistenceService.ts`: Supabase-compatible persistence surfaces with in-code fallback.
- `workoutProgrammingService.ts`: high-level app-facing facade.
- `workoutGenerationService.ts`, `workoutCompletionService.ts`, `workoutProgressionService.ts`, `workoutProgramService.ts`, `workoutDescriptionFacade.ts`, `workoutSubstitutionService.ts`: focused service orchestration behind the facade.
- `workoutProgrammingFallbacks.ts`: internal diagnostics fallback, error-copy, feature-flag, and content-review-mode rules.
- `workoutSafetyCopy.ts`: shared generated-workout safety, fallback, and local-mode copy.
- `contentReviewWorkflow.ts`: JSON queue/decision workflow for coach/admin review handoff.
- `workoutMediaAudit.ts`: exercise media asset audit helpers and approved media selection.
- `analyticsEngine.ts`: adherence, completion, pain trend, and recommendation quality summary.
- `boxingTrainingModel.ts`: boxing-first track, ruleset, dose, variance, quality-gap, and weekly load-ledger planner.
- `combatTrainingModel.ts`: deprecated compatibility facade that maps old combat inputs into boxing concepts.

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
- [Boxing Athlete Development Engine](./boxing-athlete-development-engine.md)
- [Boxing Engine Source Of Truth](./boxing-engine-source-of-truth.md)
- [How-To Workflows](./how-to.md)
- [Generated Workout UI Smoke Checklist](./ui-smoke-checklist.md)
- [Testing, Limitations, and Roadmap](./testing-limitations-roadmap.md)

## Quick Start: Generate a Boxing Session

```ts
import { workoutProgrammingService } from '../lib/performance-engine/workout-programming';

const session = await workoutProgrammingService.generateGeneratedWorkoutSessionForUser(userId, {
  goalId: 'footwork_agility',
  durationMinutes: 20,
  equipmentIds: ['bodyweight', 'open_space'],
  experienceLevel: 'beginner',
  readinessBand: 'green',
  intendedBoxingSessionFamily: 'footwork_agility',
  intendedBoxingSessionRole: 'footwork_agility',
  intendedSessionDoseCategory: 'microdose',
  preferredSessionTemplateId: 'footwork_agility',
});
```

For weekly boxing planning:

```ts
const program = await workoutProgrammingService.generateWeeklyProgramForUser(userId, {
  goalId: 'boxing_support',
  sessionsPerWeek: 4,
  desiredProgramLengthWeeks: 4,
  availableDays: [1, 2, 4, 6],
  boxingTrainingContext: { track: 'amateur_open' },
});
```

Use the service layer and boxing weekly adapter for app integration. Lower-level legacy engines remain exported for tests, compatibility, and unrelated specialist work, but UI/API code must not assemble raw seed data or call old adaptive weekly generation as a product fallback.
