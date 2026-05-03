-- Production hardening: expose generated workout completion metadata for
-- history and analytics surfaces without rewriting legacy workout logs.

ALTER TABLE public.workout_completions
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'workout_programming'
    CHECK (source IN ('workout_programming', 'generated_workout')),
  ADD COLUMN IF NOT EXISTS completion_status TEXT
    CHECK (completion_status IS NULL OR completion_status IN ('completed', 'partial', 'stopped', 'abandoned', 'expired')),
  ADD COLUMN IF NOT EXISTS substitutions_used TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS idx_workout_completions_user_source_completed
  ON public.workout_completions(user_id, source, completed_at DESC);

-- Keep the existing atomic RPC contract, but persist the newly surfaced
-- metadata in the same transaction as completion parent and child rows.
CREATE OR REPLACE FUNCTION public.log_workout_completion_with_results(
  p_user_id UUID,
  p_completion JSONB,
  p_results JSONB DEFAULT '[]'::jsonb,
  p_generated_workout_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_completion JSONB := COALESCE(p_completion, '{}'::jsonb);
  v_results JSONB := COALESCE(p_results, '[]'::jsonb);
  v_generated_workout_id UUID := p_generated_workout_id;
  v_completion_id UUID;
  v_source TEXT;
BEGIN
  IF p_user_id IS NULL OR auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Cannot log workout completion for another user.'
      USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(v_completion) <> 'object' THEN
    RAISE EXCEPTION 'Workout completion payload must be a JSON object.'
      USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(v_results) <> 'array' THEN
    RAISE EXCEPTION 'Exercise completion results must be a JSON array.'
      USING ERRCODE = '22023';
  END IF;

  IF v_generated_workout_id IS NULL AND NULLIF(v_completion->>'generated_workout_id', '') IS NOT NULL THEN
    v_generated_workout_id := (v_completion->>'generated_workout_id')::UUID;
  END IF;

  IF v_generated_workout_id IS NOT NULL THEN
    PERFORM 1
      FROM public.generated_workouts
     WHERE id = v_generated_workout_id
       AND user_id = p_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Cannot log completion for a generated workout owned by another user.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  v_source := COALESCE(
    NULLIF(v_completion->>'source', ''),
    CASE WHEN v_generated_workout_id IS NULL THEN 'workout_programming' ELSE 'generated_workout' END
  );

  IF v_source NOT IN ('workout_programming', 'generated_workout') THEN
    RAISE EXCEPTION 'Workout completion source is invalid.'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.workout_completions (
    generated_workout_id,
    user_id,
    source,
    workout_type_id,
    goal_id,
    prescription_template_id,
    completion_status,
    substitutions_used,
    completed_at,
    planned_duration_minutes,
    actual_duration_minutes,
    session_rpe,
    readiness_before,
    readiness_after,
    heart_rate_zone_compliance,
    density_score,
    movement_quality,
    range_control_score,
    power_quality_score,
    pain_score_before,
    pain_score_after,
    notes
  )
  VALUES (
    v_generated_workout_id,
    p_user_id,
    v_source,
    NULLIF(v_completion->>'workout_type_id', ''),
    NULLIF(v_completion->>'goal_id', ''),
    NULLIF(v_completion->>'prescription_template_id', ''),
    NULLIF(v_completion->>'completion_status', ''),
    CASE
      WHEN jsonb_typeof(v_completion->'substitutions_used') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(v_completion->'substitutions_used'))
      ELSE ARRAY[]::TEXT[]
    END,
    COALESCE((v_completion->>'completed_at')::TIMESTAMPTZ, now()),
    (v_completion->>'planned_duration_minutes')::INTEGER,
    (v_completion->>'actual_duration_minutes')::INTEGER,
    (v_completion->>'session_rpe')::NUMERIC,
    NULLIF(v_completion->>'readiness_before', ''),
    NULLIF(v_completion->>'readiness_after', ''),
    NULLIF(v_completion->>'heart_rate_zone_compliance', '')::NUMERIC,
    NULLIF(v_completion->>'density_score', '')::NUMERIC,
    NULLIF(v_completion->>'movement_quality', '')::NUMERIC,
    NULLIF(v_completion->>'range_control_score', '')::NUMERIC,
    NULLIF(v_completion->>'power_quality_score', '')::NUMERIC,
    NULLIF(v_completion->>'pain_score_before', '')::INTEGER,
    NULLIF(v_completion->>'pain_score_after', '')::INTEGER,
    NULLIF(v_completion->>'notes', '')
  )
  RETURNING id INTO v_completion_id;

  INSERT INTO public.exercise_completion_results (
    workout_completion_id,
    exercise_id,
    sets_completed,
    sets_prescribed,
    reps_completed,
    reps_prescribed,
    rep_range_min,
    rep_range_max,
    duration_seconds_completed,
    duration_seconds_prescribed,
    duration_minutes_completed,
    duration_minutes_prescribed,
    load_used,
    prescribed_load,
    actual_rpe,
    target_rpe,
    actual_rir,
    target_rir,
    heart_rate_zone_compliance,
    movement_quality,
    range_control_score,
    power_quality_score,
    pain_score,
    completed_as_prescribed
  )
  SELECT
    v_completion_id,
    result->>'exercise_id',
    COALESCE((result->>'sets_completed')::INTEGER, 0),
    NULLIF(result->>'sets_prescribed', '')::INTEGER,
    NULLIF(result->>'reps_completed', '')::INTEGER,
    NULLIF(result->>'reps_prescribed', '')::INTEGER,
    NULLIF(result->>'rep_range_min', '')::INTEGER,
    NULLIF(result->>'rep_range_max', '')::INTEGER,
    NULLIF(result->>'duration_seconds_completed', '')::INTEGER,
    NULLIF(result->>'duration_seconds_prescribed', '')::INTEGER,
    NULLIF(result->>'duration_minutes_completed', '')::NUMERIC,
    NULLIF(result->>'duration_minutes_prescribed', '')::NUMERIC,
    NULLIF(result->>'load_used', '')::NUMERIC,
    NULLIF(result->>'prescribed_load', '')::NUMERIC,
    NULLIF(result->>'actual_rpe', '')::NUMERIC,
    NULLIF(result->>'target_rpe', '')::NUMERIC,
    NULLIF(result->>'actual_rir', '')::NUMERIC,
    NULLIF(result->>'target_rir', '')::NUMERIC,
    NULLIF(result->>'heart_rate_zone_compliance', '')::NUMERIC,
    NULLIF(result->>'movement_quality', '')::NUMERIC,
    NULLIF(result->>'range_control_score', '')::NUMERIC,
    NULLIF(result->>'power_quality_score', '')::NUMERIC,
    NULLIF(result->>'pain_score', '')::INTEGER,
    COALESCE((result->>'completed_as_prescribed')::BOOLEAN, false)
  FROM jsonb_array_elements(v_results) AS item(result);

  RETURN v_completion_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_workout_completion_with_results(UUID, JSONB, JSONB, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_workout_completion_with_results(UUID, JSONB, JSONB, UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
