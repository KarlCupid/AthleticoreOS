-- Reassert schedule-link columns and refresh PostgREST's schema cache.
-- This is intentionally idempotent: some linked projects reported migration 009
-- as applied while PostgREST still could not see workout_log.scheduled_activity_id.

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

NOTIFY pgrst, 'reload schema';
