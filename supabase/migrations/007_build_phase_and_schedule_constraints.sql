-- Mode-first build phase goals + constraint-aware planning inputs

ALTER TABLE IF EXISTS public.athlete_profiles
  ADD COLUMN IF NOT EXISTS planning_setup_version INTEGER NOT NULL DEFAULT 0;

UPDATE public.athlete_profiles
SET athlete_goal_mode = 'build_phase'
WHERE athlete_goal_mode = 'performance_block';

DO $$
DECLARE
  con_name text;
BEGIN
  SELECT c.conname
  INTO con_name
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'athlete_profiles'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%athlete_goal_mode%';

  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.athlete_profiles DROP CONSTRAINT %I', con_name);
  END IF;
END $$;

ALTER TABLE IF EXISTS public.athlete_profiles
  ADD CONSTRAINT athlete_profiles_athlete_goal_mode_check
  CHECK (athlete_goal_mode IN ('fight_camp', 'build_phase'));

CREATE TABLE IF NOT EXISTS public.build_phase_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  goal_type TEXT NOT NULL CHECK (goal_type IN ('strength', 'conditioning', 'boxing_skill', 'weight_class_prep')),
  goal_label TEXT,
  goal_statement TEXT NOT NULL,
  target_metric TEXT NOT NULL,
  target_value NUMERIC,
  target_unit TEXT,
  target_date DATE,
  target_horizon_weeks INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_build_phase_goals_user_status
  ON public.build_phase_goals(user_id, status);

ALTER TABLE public.build_phase_goals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Users own build_phase_goals"
    ON public.build_phase_goals FOR ALL
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE IF EXISTS public.weekly_plan_config
  ADD COLUMN IF NOT EXISTS availability_windows JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE IF EXISTS public.recurring_activities
  ADD COLUMN IF NOT EXISTS constraint_tier TEXT DEFAULT 'mandatory'
    CHECK (constraint_tier IN ('mandatory', 'preferred'));

ALTER TABLE IF EXISTS public.scheduled_activities
  ADD COLUMN IF NOT EXISTS constraint_tier TEXT
    CHECK (constraint_tier IN ('mandatory', 'preferred'));
