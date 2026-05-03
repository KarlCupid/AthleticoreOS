-- Phase P1: retain typed completion history for progression decisions.
-- Forward-only, nullable additions keep existing completion rows valid.

ALTER TABLE public.workout_completions
  ADD COLUMN IF NOT EXISTS workout_type_id TEXT,
  ADD COLUMN IF NOT EXISTS goal_id TEXT,
  ADD COLUMN IF NOT EXISTS prescription_template_id TEXT,
  ADD COLUMN IF NOT EXISTS readiness_before TEXT,
  ADD COLUMN IF NOT EXISTS readiness_after TEXT,
  ADD COLUMN IF NOT EXISTS heart_rate_zone_compliance NUMERIC,
  ADD COLUMN IF NOT EXISTS density_score NUMERIC,
  ADD COLUMN IF NOT EXISTS movement_quality NUMERIC,
  ADD COLUMN IF NOT EXISTS range_control_score NUMERIC,
  ADD COLUMN IF NOT EXISTS power_quality_score NUMERIC;

ALTER TABLE public.exercise_completion_results
  ADD COLUMN IF NOT EXISTS sets_prescribed INTEGER,
  ADD COLUMN IF NOT EXISTS reps_prescribed INTEGER,
  ADD COLUMN IF NOT EXISTS rep_range_min INTEGER,
  ADD COLUMN IF NOT EXISTS rep_range_max INTEGER,
  ADD COLUMN IF NOT EXISTS duration_seconds_prescribed INTEGER,
  ADD COLUMN IF NOT EXISTS duration_minutes_completed NUMERIC,
  ADD COLUMN IF NOT EXISTS duration_minutes_prescribed NUMERIC,
  ADD COLUMN IF NOT EXISTS prescribed_load NUMERIC,
  ADD COLUMN IF NOT EXISTS target_rpe NUMERIC,
  ADD COLUMN IF NOT EXISTS actual_rir NUMERIC,
  ADD COLUMN IF NOT EXISTS target_rir NUMERIC,
  ADD COLUMN IF NOT EXISTS heart_rate_zone_compliance NUMERIC,
  ADD COLUMN IF NOT EXISTS movement_quality NUMERIC,
  ADD COLUMN IF NOT EXISTS range_control_score NUMERIC,
  ADD COLUMN IF NOT EXISTS power_quality_score NUMERIC;

ALTER TABLE public.progression_decisions
  ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_workout_completions_user_type_completed
  ON public.workout_completions(user_id, workout_type_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_workout_completions_user_goal_completed
  ON public.workout_completions(user_id, goal_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_exercise_completion_results_exercise_completion
  ON public.exercise_completion_results(exercise_id, workout_completion_id);
