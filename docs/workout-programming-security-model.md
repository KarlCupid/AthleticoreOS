# Workout Programming Security Model

Workout programming uses two database access models.

## Static Content

Workout taxonomy, exercise catalog, prescription templates, session templates,
rules, safety flags, cue sets, description templates, validation metadata,
program templates, and phase definitions are shared product content.

These tables are public read-only through RLS `SELECT` policies. Client code may
read them to build programming experiences, but normal users do not get insert,
update, or delete policies for shared programming content. Content writes should
remain a service-role/admin responsibility.

## User Data

Generated workouts, generated workout exercises, user training profiles,
equipment, constraints, safety flags, pain reports, readiness logs, exercise
preferences, completions, completion exercise results, performance observations,
progression decisions, recommendation events, programs, protected workouts,
phase transitions, feedback, and recommendation quality scores are user-specific.

These tables must have RLS enabled and policies scoped to `auth.uid()`. Tables
with a direct `user_id` column are owned by that user. Child tables without
`user_id` are scoped through their parent record:

- `generated_workout_exercises` belongs to `generated_workouts`.
- `exercise_completion_results` belongs to `workout_completions`.
- `progression_decisions` belongs to `workout_completions`.

No public policy should expose user-specific workout, completion, readiness,
pain, program, feedback, or recommendation data. Service-role/server operations
continue to work through Supabase's service-role RLS bypass.

## Migration Review Notes

The TypeScript engine tests validate workout-programming behavior, but this repo
does not currently include a local database policy test harness that signs in as
multiple users and asserts RLS isolation. RLS changes should be reviewed by
checking the latest forward-only migration and, when a database test harness is
available, adding cross-user `SELECT`, `INSERT`, `UPDATE`, and `DELETE` denial
tests for every user-specific table.
