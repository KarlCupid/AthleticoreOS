-- Fight Camp v1: planning mode, camp metadata, structured boxing blocks, and recommendation payloads

-- Athlete planning mode
ALTER TABLE IF EXISTS public.athlete_profiles
  ADD COLUMN IF NOT EXISTS athlete_goal_mode TEXT DEFAULT 'performance_block'
    CHECK (athlete_goal_mode IN ('fight_camp', 'performance_block'));

ALTER TABLE IF EXISTS public.athlete_profiles
  ADD COLUMN IF NOT EXISTS performance_goal_type TEXT DEFAULT 'conditioning'
    CHECK (performance_goal_type IN ('strength', 'conditioning', 'boxing_skill'));

-- Fight camp metadata
ALTER TABLE IF EXISTS public.fight_camps
  ADD COLUMN IF NOT EXISTS weigh_in_timing TEXT DEFAULT 'next_day'
    CHECK (weigh_in_timing IN ('same_day', 'next_day'));

ALTER TABLE IF EXISTS public.fight_camps
  ADD COLUMN IF NOT EXISTS target_weight NUMERIC;

ALTER TABLE IF EXISTS public.fight_camps
  ADD COLUMN IF NOT EXISTS round_count INTEGER DEFAULT 3;

ALTER TABLE IF EXISTS public.fight_camps
  ADD COLUMN IF NOT EXISTS round_duration_sec INTEGER DEFAULT 180;

ALTER TABLE IF EXISTS public.fight_camps
  ADD COLUMN IF NOT EXISTS rest_duration_sec INTEGER DEFAULT 60;

ALTER TABLE IF EXISTS public.fight_camps
  ADD COLUMN IF NOT EXISTS travel_start_date DATE;

ALTER TABLE IF EXISTS public.fight_camps
  ADD COLUMN IF NOT EXISTS weight_cut_state TEXT DEFAULT 'none'
    CHECK (weight_cut_state IN ('none', 'monitoring', 'driving'));

-- Normalize status values to use 'abandoned' consistently
UPDATE public.fight_camps
SET status = 'abandoned'
WHERE status = 'cancelled';

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
    AND t.relname = 'fight_camps'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%status%'
  LIMIT 1;

  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.fight_camps DROP CONSTRAINT %I', con_name);
  END IF;
END $$;

ALTER TABLE public.fight_camps
  ADD CONSTRAINT fight_camps_status_check
  CHECK (status IN ('active', 'completed', 'abandoned'));

-- Structured boxing fields in recurring/scheduled activities
ALTER TABLE IF EXISTS public.recurring_activities
  ADD COLUMN IF NOT EXISTS session_kind TEXT;

ALTER TABLE IF EXISTS public.recurring_activities
  ADD COLUMN IF NOT EXISTS rounds INTEGER;

ALTER TABLE IF EXISTS public.recurring_activities
  ADD COLUMN IF NOT EXISTS round_duration_sec INTEGER;

ALTER TABLE IF EXISTS public.recurring_activities
  ADD COLUMN IF NOT EXISTS rest_duration_sec INTEGER;

ALTER TABLE IF EXISTS public.recurring_activities
  ADD COLUMN IF NOT EXISTS athlete_locked BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE IF EXISTS public.recurring_activities
  ADD COLUMN IF NOT EXISTS intended_intensity INTEGER;

ALTER TABLE IF EXISTS public.scheduled_activities
  ADD COLUMN IF NOT EXISTS session_kind TEXT;

ALTER TABLE IF EXISTS public.scheduled_activities
  ADD COLUMN IF NOT EXISTS rounds INTEGER;

ALTER TABLE IF EXISTS public.scheduled_activities
  ADD COLUMN IF NOT EXISTS round_duration_sec INTEGER;

ALTER TABLE IF EXISTS public.scheduled_activities
  ADD COLUMN IF NOT EXISTS rest_duration_sec INTEGER;

ALTER TABLE IF EXISTS public.scheduled_activities
  ADD COLUMN IF NOT EXISTS athlete_locked BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE IF EXISTS public.scheduled_activities
  ADD COLUMN IF NOT EXISTS intended_intensity INTEGER;

-- Recommendation payloads for explain-first UX
ALTER TABLE IF EXISTS public.scheduled_activities
  ADD COLUMN IF NOT EXISTS recommendation_reason TEXT;

ALTER TABLE IF EXISTS public.scheduled_activities
  ADD COLUMN IF NOT EXISTS recommendation_severity TEXT
    CHECK (recommendation_severity IN ('info', 'recommended', 'strongly_recommended'));

ALTER TABLE IF EXISTS public.scheduled_activities
  ADD COLUMN IF NOT EXISTS recommendation_affected_subsystem TEXT;

ALTER TABLE IF EXISTS public.scheduled_activities
  ADD COLUMN IF NOT EXISTS recommendation_change TEXT;

ALTER TABLE IF EXISTS public.scheduled_activities
  ADD COLUMN IF NOT EXISTS recommendation_education TEXT;

-- Normalize weekly config weekday conventions to 0=Sun..6=Sat
UPDATE public.weekly_plan_config
SET
  available_days = (
    SELECT array_agg(CASE WHEN d = 7 THEN 0 ELSE d END ORDER BY CASE WHEN d = 7 THEN 0 ELSE d END)
    FROM unnest(COALESCE(available_days, '{}'::int[])) AS d
  ),
  two_a_day_days = (
    SELECT array_agg(CASE WHEN d = 7 THEN 0 ELSE d END ORDER BY CASE WHEN d = 7 THEN 0 ELSE d END)
    FROM unnest(COALESCE(two_a_day_days, '{}'::int[])) AS d
  );

UPDATE public.weekly_plan_config
SET available_days = '{1,3,5}'
WHERE available_days IS NULL OR array_length(available_days, 1) IS NULL;

UPDATE public.weekly_plan_config
SET two_a_day_days = '{}'
WHERE two_a_day_days IS NULL;
