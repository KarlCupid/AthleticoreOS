CREATE OR REPLACE FUNCTION public.complete_scheduled_activity(
  p_user_id UUID,
  p_activity_id UUID,
  p_actual_duration_min INTEGER,
  p_actual_rpe INTEGER,
  p_notes TEXT DEFAULT NULL,
  p_components JSONB DEFAULT '[]'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_activity RECORD;
  v_components JSONB := COALESCE(p_components, '[]'::jsonb);
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Cannot complete activity for another user.'
      USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(v_components) <> 'array' THEN
    RAISE EXCEPTION 'Activity components must be a JSON array.'
      USING ERRCODE = '22023';
  END IF;

  SELECT date, activity_type
    INTO v_activity
    FROM public.scheduled_activities
   WHERE id = p_activity_id
     AND user_id = p_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Scheduled activity not found.'
      USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.scheduled_activities
     SET status = 'completed',
         actual_duration_min = p_actual_duration_min,
         actual_rpe = p_actual_rpe,
         notes = p_notes,
         recommendation_status = 'completed',
         updated_at = now()
   WHERE id = p_activity_id
     AND user_id = p_user_id;

  INSERT INTO public.activity_log (
    scheduled_activity_id,
    user_id,
    date,
    component_type,
    duration_min,
    distance_miles,
    pace_per_mile,
    rounds,
    intensity,
    heart_rate_avg,
    notes
  )
  SELECT
    p_activity_id,
    p_user_id,
    v_activity.date,
    component->>'component_type',
    (component->>'duration_min')::integer,
    (component->>'distance_miles')::numeric,
    component->>'pace_per_mile',
    (component->>'rounds')::integer,
    (component->>'intensity')::integer,
    (component->>'heart_rate_avg')::integer,
    component->>'notes'
  FROM jsonb_array_elements(v_components) AS component;

  IF v_activity.activity_type <> 'rest' THEN
    INSERT INTO public.training_sessions (
      user_id,
      date,
      duration_minutes,
      intensity_srpe
    )
    VALUES (
      p_user_id,
      v_activity.date,
      p_actual_duration_min,
      p_actual_rpe
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_scheduled_activity(UUID, UUID, INTEGER, INTEGER, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_scheduled_activity(UUID, UUID, INTEGER, INTEGER, TEXT, JSONB) TO authenticated;
