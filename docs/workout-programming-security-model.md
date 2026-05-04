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
generated workout session lifecycle, phase transitions, feedback, and
recommendation quality scores are user-specific.

These tables must have RLS enabled and policies scoped to `auth.uid()`. Tables
with a direct `user_id` column are owned by that user. Child tables without
`user_id` are scoped through their parent record; lifecycle rows are directly
user-owned and also validate generated-workout parent ownership:

- `generated_workout_exercises` belongs to `generated_workouts`.
- `generated_workout_session_lifecycle` is directly user-owned and also validates ownership through `generated_workouts`.
- `exercise_completion_results` belongs to `workout_completions`.
- `progression_decisions` belongs to `workout_completions`.

No public policy should expose user-specific workout, completion, readiness,
pain, program, feedback, or recommendation data. Service-role/server operations
continue to work through Supabase's service-role RLS bypass.

## Migration Review Notes

The TypeScript engine tests validate workout-programming behavior, and the repo
now includes guarded live Supabase DB/RLS harnesses:

```bash
WORKOUT_DB_TESTS=1 npm run test:workout-db
WORKOUT_RLS_TESTS=1 npm run test:rls
```

Use a local Supabase instance or a dedicated non-production test project. Remote
runs require the matching `WORKOUT_*_ALLOW_REMOTE=1` flag plus
`WORKOUT_SUPABASE_NON_PRODUCTION=1`; the guards reject configured production
targets. RLS changes should still be reviewed by checking the latest
forward-only migration and adding cross-user denial coverage for every new
user-specific table.
