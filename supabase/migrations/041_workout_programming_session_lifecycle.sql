-- Durable lifecycle state for generated workout beta sessions.
-- Forward-only: adds one user-owned lifecycle row per generated workout.

CREATE TABLE IF NOT EXISTS public.generated_workout_session_lifecycle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_workout_id UUID NOT NULL REFERENCES public.generated_workouts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN (
    'generated',
    'inspected',
    'started',
    'paused',
    'resumed',
    'completed',
    'abandoned',
    'stopped',
    'expired'
  )),
  inspected_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  resumed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  abandoned_at TIMESTAMPTZ,
  stopped_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completion_status TEXT CHECK (completion_status IS NULL OR completion_status IN (
    'completed',
    'partial',
    'stopped',
    'abandoned',
    'expired'
  )),
  active_block_id TEXT,
  active_exercise_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (generated_workout_id)
);

CREATE INDEX IF NOT EXISTS idx_generated_workout_lifecycle_user_status_active
  ON public.generated_workout_session_lifecycle(user_id, status, last_active_at DESC);

CREATE INDEX IF NOT EXISTS idx_generated_workout_lifecycle_workout
  ON public.generated_workout_session_lifecycle(generated_workout_id);

CREATE OR REPLACE FUNCTION public.touch_generated_workout_session_lifecycle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_generated_workout_session_lifecycle_updated_at
  ON public.generated_workout_session_lifecycle;

CREATE TRIGGER touch_generated_workout_session_lifecycle_updated_at
  BEFORE UPDATE ON public.generated_workout_session_lifecycle
  FOR EACH ROW
  EXECUTE PROCEDURE public.touch_generated_workout_session_lifecycle_updated_at();

ALTER TABLE public.generated_workout_session_lifecycle ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'generated_workout_session_lifecycle'
      AND policyname = 'Users manage own generated workout lifecycle'
  ) THEN
    CREATE POLICY "Users manage own generated workout lifecycle"
      ON public.generated_workout_session_lifecycle FOR ALL
      USING (
        (select auth.uid()) = user_id
        AND EXISTS (
          SELECT 1
          FROM public.generated_workouts workout
          WHERE workout.id = generated_workout_id
            AND workout.user_id = (select auth.uid())
        )
      )
      WITH CHECK (
        (select auth.uid()) = user_id
        AND EXISTS (
          SELECT 1
          FROM public.generated_workouts workout
          WHERE workout.id = generated_workout_id
            AND workout.user_id = (select auth.uid())
        )
      );
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.touch_generated_workout_session_lifecycle_updated_at() FROM PUBLIC;

NOTIFY pgrst, 'reload schema';
