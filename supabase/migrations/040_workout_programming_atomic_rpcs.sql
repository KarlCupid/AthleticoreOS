-- Atomic workout-programming persistence RPCs.
-- These functions intentionally run as SECURITY INVOKER so existing RLS
-- policies remain the source of row visibility and write ownership.

CREATE OR REPLACE FUNCTION public.workout_programming_program_session_payload_with_id(
  p_session JSONB,
  p_user_program_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_session_id TEXT := NULLIF(p_session->>'id', '');
BEGIN
  IF jsonb_typeof(p_session) <> 'object' THEN
    RETURN p_session;
  END IF;

  RETURN p_session || jsonb_build_object(
    'persistenceId',
    COALESCE(NULLIF(p_session->>'persistenceId', ''), p_user_program_id::TEXT || ':' || COALESCE(v_session_id, 'session')),
    'userProgramId',
    p_user_program_id::TEXT
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.workout_programming_program_payload_with_id(
  p_program JSONB,
  p_user_program_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_program JSONB := COALESCE(p_program, '{}'::jsonb) || jsonb_build_object('persistenceId', p_user_program_id::TEXT);
  v_session JSONB;
  v_sessions JSONB;
  v_week JSONB;
  v_weeks JSONB;
  v_week_session JSONB;
  v_week_sessions JSONB;
BEGIN
  IF jsonb_typeof(v_program->'sessions') = 'array' THEN
    v_sessions := '[]'::jsonb;
    FOR v_session IN SELECT value FROM jsonb_array_elements(v_program->'sessions')
    LOOP
      v_sessions := v_sessions || jsonb_build_array(
        public.workout_programming_program_session_payload_with_id(v_session, p_user_program_id)
      );
    END LOOP;
    v_program := jsonb_set(v_program, '{sessions}', v_sessions, true);
  END IF;

  IF jsonb_typeof(v_program->'weeks') = 'array' THEN
    v_weeks := '[]'::jsonb;
    FOR v_week IN SELECT value FROM jsonb_array_elements(v_program->'weeks')
    LOOP
      IF jsonb_typeof(v_week->'sessions') = 'array' THEN
        v_week_sessions := '[]'::jsonb;
        FOR v_week_session IN SELECT value FROM jsonb_array_elements(v_week->'sessions')
        LOOP
          v_week_sessions := v_week_sessions || jsonb_build_array(
            public.workout_programming_program_session_payload_with_id(v_week_session, p_user_program_id)
          );
        END LOOP;
        v_week := jsonb_set(v_week, '{sessions}', v_week_sessions, true);
      END IF;
      v_weeks := v_weeks || jsonb_build_array(v_week);
    END LOOP;
    v_program := jsonb_set(v_program, '{weeks}', v_weeks, true);
  END IF;

  RETURN v_program;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_generated_workout_with_exercises(
  p_user_id UUID,
  p_workout JSONB,
  p_exercises JSONB DEFAULT '[]'::jsonb,
  p_generated_workout_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_workout JSONB := COALESCE(p_workout, '{}'::jsonb);
  v_exercises JSONB := COALESCE(p_exercises, '[]'::jsonb);
  v_workout_id UUID;
BEGIN
  IF p_user_id IS NULL OR auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Cannot save generated workout for another user.'
      USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(v_workout) <> 'object' THEN
    RAISE EXCEPTION 'Generated workout payload must be a JSON object.'
      USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(v_exercises) <> 'array' THEN
    RAISE EXCEPTION 'Generated workout exercises must be a JSON array.'
      USING ERRCODE = '22023';
  END IF;

  IF p_generated_workout_id IS NULL THEN
    INSERT INTO public.generated_workouts (
      user_id,
      goal_id,
      template_id,
      requested_duration_minutes,
      estimated_duration_minutes,
      safety_flags,
      payload,
      blocked
    )
    VALUES (
      p_user_id,
      NULLIF(v_workout->>'goal_id', ''),
      NULLIF(v_workout->>'template_id', ''),
      (v_workout->>'requested_duration_minutes')::INTEGER,
      (v_workout->>'estimated_duration_minutes')::INTEGER,
      CASE
        WHEN jsonb_typeof(v_workout->'safety_flags') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(v_workout->'safety_flags'))
        ELSE ARRAY[]::TEXT[]
      END,
      v_workout->'payload',
      COALESCE((v_workout->>'blocked')::BOOLEAN, false)
    )
    RETURNING id INTO v_workout_id;
  ELSE
    PERFORM 1
      FROM public.generated_workouts
     WHERE id = p_generated_workout_id
       AND user_id = p_user_id
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Generated workout not found for this user.'
        USING ERRCODE = 'P0002';
    END IF;

    UPDATE public.generated_workouts
       SET goal_id = NULLIF(v_workout->>'goal_id', ''),
           template_id = NULLIF(v_workout->>'template_id', ''),
           requested_duration_minutes = (v_workout->>'requested_duration_minutes')::INTEGER,
           estimated_duration_minutes = (v_workout->>'estimated_duration_minutes')::INTEGER,
           safety_flags = CASE
             WHEN jsonb_typeof(v_workout->'safety_flags') = 'array'
               THEN ARRAY(SELECT jsonb_array_elements_text(v_workout->'safety_flags'))
             ELSE ARRAY[]::TEXT[]
           END,
           payload = v_workout->'payload',
           blocked = COALESCE((v_workout->>'blocked')::BOOLEAN, false)
     WHERE id = p_generated_workout_id
       AND user_id = p_user_id;

    DELETE FROM public.generated_workout_exercises
     WHERE generated_workout_id = p_generated_workout_id;

    v_workout_id := p_generated_workout_id;
  END IF;

  INSERT INTO public.generated_workout_exercises (
    generated_workout_id,
    exercise_id,
    block_id,
    prescription,
    substitutions,
    sort_order
  )
  SELECT
    v_workout_id,
    exercise->>'exercise_id',
    exercise->>'block_id',
    COALESCE(exercise->'prescription', '{}'::jsonb),
    COALESCE(exercise->'substitutions', '[]'::jsonb),
    COALESCE((exercise->>'sort_order')::INTEGER, ordinal::INTEGER - 1)
  FROM jsonb_array_elements(v_exercises) WITH ORDINALITY AS item(exercise, ordinal);

  RETURN v_workout_id;
END;
$$;

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

  INSERT INTO public.workout_completions (
    generated_workout_id,
    user_id,
    workout_type_id,
    goal_id,
    prescription_template_id,
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
    NULLIF(v_completion->>'workout_type_id', ''),
    NULLIF(v_completion->>'goal_id', ''),
    NULLIF(v_completion->>'prescription_template_id', ''),
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

CREATE OR REPLACE FUNCTION public.save_generated_program_with_sessions(
  p_user_id UUID,
  p_program JSONB,
  p_user_program_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_program JSONB := COALESCE(p_program, '{}'::jsonb);
  v_program_id UUID := COALESCE(p_user_program_id, gen_random_uuid());
  v_payload JSONB;
BEGIN
  IF p_user_id IS NULL OR auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Cannot save generated program for another user.'
      USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(v_program) <> 'object' THEN
    RAISE EXCEPTION 'Generated program payload must be a JSON object.'
      USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(v_program->'sessions') <> 'array' OR jsonb_typeof(v_program->'weeks') <> 'array' THEN
    RAISE EXCEPTION 'Generated program payload must include weeks and sessions arrays.'
      USING ERRCODE = '22023';
  END IF;

  v_payload := public.workout_programming_program_payload_with_id(v_program, v_program_id);

  IF p_user_program_id IS NULL THEN
    INSERT INTO public.user_programs (
      id,
      user_id,
      goal_id,
      status,
      started_at,
      payload
    )
    VALUES (
      v_program_id,
      p_user_id,
      NULLIF(v_payload->>'goalId', ''),
      COALESCE(NULLIF(v_payload->>'status', ''), 'active'),
      COALESCE(NULLIF(v_payload->>'startedAt', '')::DATE, NULLIF(v_payload->>'scheduleStartDate', '')::DATE, CURRENT_DATE),
      v_payload
    );
  ELSE
    PERFORM 1
      FROM public.user_programs
     WHERE id = p_user_program_id
       AND user_id = p_user_id
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Generated program not found for this user.'
        USING ERRCODE = 'P0002';
    END IF;

    UPDATE public.user_programs
       SET goal_id = NULLIF(v_payload->>'goalId', ''),
           status = COALESCE(NULLIF(v_payload->>'status', ''), 'active'),
           started_at = COALESCE(NULLIF(v_payload->>'startedAt', '')::DATE, NULLIF(v_payload->>'scheduleStartDate', '')::DATE, started_at),
           payload = v_payload
     WHERE id = p_user_program_id
       AND user_id = p_user_id;
  END IF;

  RETURN v_program_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_program_session(
  p_user_id UUID,
  p_user_program_id UUID,
  p_session_id TEXT,
  p_program JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_program JSONB := COALESCE(p_program, '{}'::jsonb);
  v_payload JSONB;
BEGIN
  IF p_user_id IS NULL OR auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Cannot complete program session for another user.'
      USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(v_program) <> 'object' OR jsonb_typeof(v_program->'sessions') <> 'array' THEN
    RAISE EXCEPTION 'Completed program payload must include a sessions array.'
      USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM jsonb_array_elements(v_program->'sessions') AS item(session)
     WHERE session->>'id' = p_session_id
       AND session->>'status' = 'completed'
  ) THEN
    RAISE EXCEPTION 'Completed program payload does not include the completed session.'
      USING ERRCODE = '22023';
  END IF;

  PERFORM 1
    FROM public.user_programs
   WHERE id = p_user_program_id
     AND user_id = p_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Generated program not found for this user.'
      USING ERRCODE = 'P0002';
  END IF;

  v_payload := public.workout_programming_program_payload_with_id(v_program, p_user_program_id);

  UPDATE public.user_programs
     SET goal_id = NULLIF(v_payload->>'goalId', ''),
         status = COALESCE(NULLIF(v_payload->>'status', ''), 'active'),
         started_at = COALESCE(NULLIF(v_payload->>'startedAt', '')::DATE, NULLIF(v_payload->>'scheduleStartDate', '')::DATE, started_at),
         payload = v_payload
   WHERE id = p_user_program_id
     AND user_id = p_user_id;

  RETURN p_user_program_id;
END;
$$;

REVOKE ALL ON FUNCTION public.workout_programming_program_session_payload_with_id(JSONB, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.workout_programming_program_payload_with_id(JSONB, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_generated_workout_with_exercises(UUID, JSONB, JSONB, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_workout_completion_with_results(UUID, JSONB, JSONB, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_generated_program_with_sessions(UUID, JSONB, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_program_session(UUID, UUID, TEXT, JSONB) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.workout_programming_program_session_payload_with_id(JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workout_programming_program_payload_with_id(JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_generated_workout_with_exercises(UUID, JSONB, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_workout_completion_with_results(UUID, JSONB, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_generated_program_with_sessions(UUID, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_program_session(UUID, UUID, TEXT, JSONB) TO authenticated;

NOTIFY pgrst, 'reload schema';
