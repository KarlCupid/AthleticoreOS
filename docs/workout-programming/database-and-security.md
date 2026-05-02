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

Important functions:

- `loadWorkoutProgrammingCatalog`
- `loadUserWorkoutProfile`
- `saveGeneratedWorkout`
- `logWorkoutCompletion`
- `saveProgressionDecision`
- `updateUserEquipment`
- `updateUserSafetyFlags`
- `updateExercisePreference`
- `logReadiness`
- `saveRecommendationFeedback`

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

The repo has mock-backed persistence tests proving service calls are user-scoped. It does not yet have a live database RLS harness that signs in as two users and proves cross-user denial. Add that before treating RLS as fully verified in production.
