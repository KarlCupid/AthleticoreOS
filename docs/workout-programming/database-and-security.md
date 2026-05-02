# Database and Security

This guide explains how workout-programming data maps to Supabase and how RLS protects user data.

## Schema Overview

The schema has two broad categories.

### Static Catalog Tables

Static catalog tables are shared product content. They describe the programming ontology and can be publicly read by the app:

- Workout taxonomy: `workout_types`, `training_goals`, `workout_formats`
- Ontology: `movement_patterns`, `muscle_groups`, `equipment_types`, `tracking_metrics`, `assessment_metrics`
- Exercises: `programming_exercises` plus normalized relationship tables
- Templates: `prescription_templates`, `session_templates`, `session_template_blocks`, `session_template_movement_slots`
- Intelligence content: rules, cue sets, mistakes, description templates, validation metadata, safety flags

Normal users should not have insert, update, or delete access to static content. Content writes are an admin/service-role responsibility.

### User-Specific Tables

User tables contain generated output, preferences, logs, feedback, and progression state:

- `generated_workouts`
- `generated_workout_exercises`
- `user_training_profiles`
- `user_equipment`
- `user_constraints`
- `user_safety_flags`
- `user_pain_reports`
- `user_readiness_logs`
- `user_exercise_preferences`
- `workout_completions`
- `exercise_completion_results`
- `performance_observations`
- `progression_decisions`
- `recommendation_events`
- `user_programs`
- `protected_workouts`
- `phase_transitions`
- `recommendation_feedback`
- `recommendation_quality_scores`

These rows are owned by a user, either directly through `user_id` or indirectly through a parent record.

## RLS Model

Static content:

- RLS is enabled where applicable.
- Public `SELECT` is allowed.
- Public writes are not allowed.

User data:

- RLS is enabled on every user-specific table.
- Direct user tables scope policies with `auth.uid() = user_id`.
- Child tables without `user_id` scope through parent ownership.

Parent-scoped child tables:

- `generated_workout_exercises` belongs to `generated_workouts`.
- `exercise_completion_results` belongs to `workout_completions`.
- `progression_decisions` belongs to `workout_completions`.

No user should be able to read another user's generated workouts, completions, pain reports, readiness logs, programs, or feedback.

## Service-Role Behavior

Supabase service-role/server access continues to bypass RLS. That is useful for migrations, admin content workflows, and backend maintenance, but app/client code should not rely on service-role credentials.

## Persistence Service Safety

`persistenceService.ts` keeps app-facing persistence modular:

- Uses in-code fallback when no Supabase client is provided.
- Accepts an injected Supabase-like client for tests and future server contexts.
- Lazily imports the app Supabase client only when `useSupabase: true`.
- User reads and writes include `user_id` or parent IDs.
- Child inserts are written through parent records wherever possible.
- Runtime-validates generated workout payloads before saving and after loading.
- Uses bulk upserts for user profile/preferences/equipment/safety surfaces.
- Treats parent + child writes as transaction-like units in application code: if child persistence fails, the service throws a structured error and attempts to roll back the parent row.
- Maps Supabase/PostgREST failures into explicit errors such as `NotFoundError`, `UnauthorizedError`, `ValidationError`, `ConflictError`, and `DatabaseUnavailableError`.

Important functions:

- `loadWorkoutProgrammingCatalog`
- `loadUserWorkoutProfile`
- `saveGeneratedWorkoutWithExercises`
- `loadGeneratedWorkout`
- `listGeneratedWorkoutsForUser`
- `logWorkoutCompletionWithExerciseResults`
- `loadRecentCompletions`
- `saveProgressionDecision`
- `loadProgressionDecisionsForCompletion`
- `upsertUserWorkoutProfile`
- `upsertUserEquipment`
- `upsertUserSafetyFlags`
- `upsertExercisePreferences`
- `logReadiness`
- `loadRecentReadiness`
- `saveRecommendationFeedback`
- `saveGeneratedProgram`
- `loadUserProgram`

Compatibility aliases such as `saveGeneratedWorkout`, `logWorkoutCompletion`, `updateUserEquipment`, `updateUserSafetyFlags`, `updateExercisePreference`, and `saveUserWorkoutProfile` remain available, but new app code should prefer the explicit hardened names.

### Persistence Error Semantics

All persistence failures should be actionable:

- `ValidationError`: the payload is malformed, unsafe to persist, or violates a known database constraint.
- `NotFoundError`: a user-scoped row was requested but does not exist or is not visible under RLS.
- `UnauthorizedError`: Supabase rejected the operation because the caller is not allowed to access the row.
- `ConflictError`: a unique/conflict constraint rejected the write.
- `DatabaseUnavailableError`: the database or network appears unavailable and retry may be appropriate.
- `WorkoutProgrammingPersistenceError`: fallback for unexpected persistence failures.

Generated workout and completion persistence intentionally do not report success if child rows fail. The service either saves the parent and all child rows, or it throws and attempts parent rollback.

## Migration Rules

- Do not destructively change existing workout-programming tables.
- Add new forward-only migrations for schema changes.
- Prefer nullable/defaulted columns for expanding static content.
- Add indexes for policy joins and common filters.
- Keep static content public read-only.
- Keep user data user-scoped.

## Security Review Checklist

Before merging schema or persistence changes:

- Every new user-specific table has RLS enabled.
- Every direct user table has policies scoped to `auth.uid() = user_id`.
- Every child table without `user_id` scopes through an owned parent.
- No public policies exist on user-specific data.
- Static tables remain read-only to normal users.
- Indexes exist on `user_id`, parent foreign keys, and high-use filter columns.
- Tests or migration notes cover the security assumption.

## Current Test Coverage

The repo has mock-backed persistence tests proving service calls are user-scoped and a live/local Supabase RLS harness for workout-programming user data:

```bash
npm run test:rls
```

The RLS harness signs in two temporary users, inserts temporary workout-programming rows with the service role, and verifies:

- User A cannot select User B rows.
- Child tables are protected through owned parent rows.
- Anonymous/public clients cannot read user-specific rows.
- Static catalog tables remain publicly readable.
- Service-role/server context can still read fixture rows for backend work.

Required environment variables:

- `SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_URL`
- `SUPABASE_ANON_KEY` or `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

For local Supabase, run `npx supabase start`, then `npx supabase status`, and copy the API URL, anon key, and service-role key into `.env.local`. Prefer local Supabase or a disposable preview project; the harness can run against a live project, but it creates temporary auth users and fixture rows before cleanup. The script also reads `.env`, but service-role credentials should stay server-only and must never be exposed through Expo public app code.

The test creates rows with IDs prefixed by a unique `rls_*` run id and cleans them up at the end. If a run is interrupted, re-running the test with service-role access is safe because fixture IDs are unique per run.
