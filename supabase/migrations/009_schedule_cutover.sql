ALTER TABLE IF EXISTS public.workout_log
  ADD COLUMN IF NOT EXISTS scheduled_activity_id UUID REFERENCES public.scheduled_activities(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.weekly_plan_entries
  ADD COLUMN IF NOT EXISTS scheduled_activity_id UUID REFERENCES public.scheduled_activities(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.scheduled_activities
  ADD COLUMN IF NOT EXISTS weekly_plan_entry_id UUID REFERENCES public.weekly_plan_entries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_workout_log_scheduled_activity
  ON public.workout_log(scheduled_activity_id);

CREATE INDEX IF NOT EXISTS idx_weekly_plan_entries_scheduled_activity
  ON public.weekly_plan_entries(scheduled_activity_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_activities_weekly_plan_entry
  ON public.scheduled_activities(weekly_plan_entry_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_scheduled_activities_weekly_plan_entry_unique
  ON public.scheduled_activities(weekly_plan_entry_id)
  WHERE weekly_plan_entry_id IS NOT NULL;

WITH matched_engine_activities AS (
  SELECT
    sa.id AS scheduled_activity_id,
    (
      SELECT wpe.id
      FROM public.weekly_plan_entries wpe
      WHERE wpe.user_id = sa.user_id
        AND wpe.date = sa.date
        AND wpe.session_type = sa.activity_type
        AND (wpe.scheduled_activity_id IS NULL OR wpe.scheduled_activity_id = sa.id)
      ORDER BY wpe.created_at ASC
      LIMIT 1
    ) AS weekly_plan_entry_id
  FROM public.scheduled_activities sa
  WHERE sa.source = 'engine'
    AND sa.weekly_plan_entry_id IS NULL
)
UPDATE public.scheduled_activities sa
SET weekly_plan_entry_id = matched_engine_activities.weekly_plan_entry_id
FROM matched_engine_activities
WHERE sa.id = matched_engine_activities.scheduled_activity_id
  AND matched_engine_activities.weekly_plan_entry_id IS NOT NULL;

UPDATE public.weekly_plan_entries wpe
SET scheduled_activity_id = sa.id
FROM public.scheduled_activities sa
WHERE sa.weekly_plan_entry_id = wpe.id
  AND (wpe.scheduled_activity_id IS NULL OR wpe.scheduled_activity_id <> sa.id);

UPDATE public.workout_log wl
SET scheduled_activity_id = COALESCE(
  (
    SELECT wpe.scheduled_activity_id
    FROM public.weekly_plan_entries wpe
    WHERE wpe.id = wl.weekly_plan_entry_id
      AND wpe.scheduled_activity_id IS NOT NULL
    LIMIT 1
  ),
  (
    SELECT sa.id
    FROM public.scheduled_activities sa
    WHERE sa.user_id = wl.user_id
      AND sa.date = wl.date
      AND sa.activity_type = 'sc'
    ORDER BY sa.created_at ASC
    LIMIT 1
  )
)
WHERE wl.scheduled_activity_id IS NULL;
