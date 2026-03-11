-- Schedule hardening migration: recurring activities RLS + weekly target parity

CREATE TABLE IF NOT EXISTS public.recurring_activities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  activity_type text NOT NULL,
  custom_label text,
  start_time time,
  estimated_duration_min integer DEFAULT 60 NOT NULL,
  expected_intensity integer DEFAULT 5 NOT NULL,
  session_components jsonb DEFAULT '[]'::jsonb NOT NULL,
  recurrence jsonb NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.recurring_activities ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Users own recurring_activities"
    ON public.recurring_activities FOR ALL
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_recurring_activities_user_active
  ON public.recurring_activities(user_id, is_active);

ALTER TABLE IF EXISTS public.scheduled_activities
  ADD COLUMN IF NOT EXISTS recurring_activity_id uuid REFERENCES public.recurring_activities(id);

CREATE INDEX IF NOT EXISTS idx_scheduled_activities_recurring_activity
  ON public.scheduled_activities(recurring_activity_id);

ALTER TABLE IF EXISTS public.weekly_targets
  ADD COLUMN IF NOT EXISTS road_work_sessions integer DEFAULT 2;
