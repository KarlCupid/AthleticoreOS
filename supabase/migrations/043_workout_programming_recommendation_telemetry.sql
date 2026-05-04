-- Workout programming recommendation quality telemetry.
-- Extends the existing recommendation_events table without changing current RLS ownership.

ALTER TABLE public.recommendation_events
  ADD COLUMN IF NOT EXISTS generated_workout_id UUID REFERENCES public.generated_workouts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS app_context_version TEXT,
  ADD COLUMN IF NOT EXISTS engine_version TEXT,
  ADD COLUMN IF NOT EXISTS content_version TEXT;

CREATE INDEX IF NOT EXISTS idx_recommendation_events_generated_workout
  ON public.recommendation_events(generated_workout_id, created_at DESC)
  WHERE generated_workout_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recommendation_events_user_kind_created
  ON public.recommendation_events(user_id, event_kind, created_at DESC);

CREATE OR REPLACE FUNCTION public.assert_recommendation_event_generated_workout_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.generated_workout_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.generated_workouts workout
      WHERE workout.id = NEW.generated_workout_id
        AND workout.user_id = NEW.user_id
    )
  THEN
    RAISE EXCEPTION 'recommendation event generated_workout_id must belong to the event user'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assert_recommendation_event_generated_workout_owner
  ON public.recommendation_events;

CREATE TRIGGER trg_assert_recommendation_event_generated_workout_owner
  BEFORE INSERT OR UPDATE OF user_id, generated_workout_id
  ON public.recommendation_events
  FOR EACH ROW
  EXECUTE FUNCTION public.assert_recommendation_event_generated_workout_owner();

NOTIFY pgrst, 'reload schema';
