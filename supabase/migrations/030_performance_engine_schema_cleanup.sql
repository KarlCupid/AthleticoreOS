-- Performance Engine schema cleanup.
-- Canonicalizes body-mass / weight-class persistence and retires legacy
-- daily snapshot persistence that is now derived from the Unified Performance
-- Engine at read time.

CREATE TABLE IF NOT EXISTS public.performance_engine_migration_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_table TEXT NOT NULL,
  source_id UUID,
  user_id UUID,
  archive_reason TEXT NOT NULL,
  payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_performance_engine_migration_archive_user
  ON public.performance_engine_migration_archive(user_id, archived_at DESC);

CREATE TABLE IF NOT EXISTS public.weight_class_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) NOT NULL,
  start_weight NUMERIC NOT NULL,
  target_weight NUMERIC NOT NULL,
  weight_class_name TEXT,
  sport TEXT CHECK (sport IN ('boxing', 'mma')) DEFAULT 'mma',
  fight_date DATE NOT NULL,
  weigh_in_date DATE NOT NULL,
  plan_created_date DATE NOT NULL DEFAULT CURRENT_DATE,
  fight_status TEXT NOT NULL CHECK (fight_status IN ('amateur', 'pro')),
  max_fight_week_body_mass_change_pct NUMERIC NOT NULL DEFAULT 0,
  required_body_mass_change_lbs NUMERIC NOT NULL DEFAULT 0,
  gradual_body_mass_target_lbs NUMERIC NOT NULL DEFAULT 0,
  competition_week_body_mass_change_lbs NUMERIC NOT NULL DEFAULT 0,
  chronic_phase_start DATE,
  chronic_phase_end DATE,
  intensified_phase_start DATE,
  intensified_phase_end DATE,
  fight_week_start DATE,
  weigh_in_day DATE,
  rehydration_start DATE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'abandoned', 'paused')),
  completed_at TIMESTAMPTZ,
  safe_weekly_loss_rate NUMERIC NOT NULL DEFAULT 0,
  calorie_floor INTEGER NOT NULL DEFAULT 1800,
  baseline_cognitive_score INTEGER,
  coach_notes TEXT,
  risk_acknowledged_at TIMESTAMPTZ,
  risk_acknowledgement_version TEXT,
  risk_warning_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.weight_class_plans
  ADD COLUMN IF NOT EXISTS max_fight_week_body_mass_change_pct NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS required_body_mass_change_lbs NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gradual_body_mass_target_lbs NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS competition_week_body_mass_change_lbs NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS risk_acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS risk_acknowledgement_version TEXT,
  ADD COLUMN IF NOT EXISTS risk_warning_snapshot JSONB;

CREATE TABLE IF NOT EXISTS public.body_mass_safety_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) NOT NULL,
  plan_id UUID REFERENCES public.weight_class_plans(id) NOT NULL,
  date DATE NOT NULL,
  urine_color INTEGER CHECK (urine_color BETWEEN 1 AND 8),
  body_temp_f NUMERIC,
  cognitive_score INTEGER,
  mood_rating INTEGER CHECK (mood_rating BETWEEN 1 AND 5),
  dizziness BOOLEAN DEFAULT FALSE,
  headache BOOLEAN DEFAULT FALSE,
  muscle_cramps BOOLEAN DEFAULT FALSE,
  post_weigh_in_weight NUMERIC,
  rehydration_weight_regained NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS public.weight_class_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) NOT NULL,
  plan_id UUID REFERENCES public.weight_class_plans(id) NOT NULL,
  start_weight NUMERIC NOT NULL,
  final_weigh_in_weight NUMERIC,
  target_weight NUMERIC NOT NULL,
  made_weight BOOLEAN,
  total_duration_days INTEGER,
  gradual_body_mass_change_lbs NUMERIC,
  competition_week_body_mass_change_lbs NUMERIC,
  avg_weekly_loss_rate NUMERIC,
  rehydration_weight_regained NUMERIC,
  fight_day_weight NUMERIC,
  adherence_pct NUMERIC,
  refeed_days_used INTEGER,
  diet_breaks_used INTEGER,
  safety_flags_triggered JSONB DEFAULT '[]'::jsonb,
  fight_date DATE,
  completed_at TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
  IF to_regclass('public.weight_cut_plans') IS NOT NULL THEN
    INSERT INTO public.weight_class_plans (
      id,
      user_id,
      start_weight,
      target_weight,
      weight_class_name,
      sport,
      fight_date,
      weigh_in_date,
      plan_created_date,
      fight_status,
      max_fight_week_body_mass_change_pct,
      required_body_mass_change_lbs,
      gradual_body_mass_target_lbs,
      competition_week_body_mass_change_lbs,
      chronic_phase_start,
      chronic_phase_end,
      intensified_phase_start,
      intensified_phase_end,
      fight_week_start,
      weigh_in_day,
      rehydration_start,
      status,
      completed_at,
      safe_weekly_loss_rate,
      calorie_floor,
      baseline_cognitive_score,
      coach_notes,
      risk_acknowledged_at,
      risk_acknowledgement_version,
      risk_warning_snapshot,
      created_at,
      updated_at
    )
    SELECT
      id,
      user_id,
      start_weight,
      target_weight,
      weight_class_name,
      sport,
      fight_date,
      weigh_in_date,
      plan_created_date,
      fight_status,
      COALESCE(max_water_cut_pct, 0),
      COALESCE(total_cut_lbs, 0),
      COALESCE(diet_phase_target_lbs, 0),
      COALESCE(water_cut_allocation_lbs, 0),
      chronic_phase_start,
      chronic_phase_end,
      intensified_phase_start,
      intensified_phase_end,
      fight_week_start,
      weigh_in_day,
      rehydration_start,
      status,
      completed_at,
      safe_weekly_loss_rate,
      calorie_floor,
      baseline_cognitive_score,
      coach_notes,
      risk_acknowledged_at,
      risk_acknowledgement_version,
      risk_warning_snapshot,
      created_at,
      updated_at
    FROM public.weight_cut_plans
    ON CONFLICT (id) DO UPDATE
    SET
      user_id = EXCLUDED.user_id,
      start_weight = EXCLUDED.start_weight,
      target_weight = EXCLUDED.target_weight,
      weight_class_name = EXCLUDED.weight_class_name,
      sport = EXCLUDED.sport,
      fight_date = EXCLUDED.fight_date,
      weigh_in_date = EXCLUDED.weigh_in_date,
      plan_created_date = EXCLUDED.plan_created_date,
      fight_status = EXCLUDED.fight_status,
      max_fight_week_body_mass_change_pct = EXCLUDED.max_fight_week_body_mass_change_pct,
      required_body_mass_change_lbs = EXCLUDED.required_body_mass_change_lbs,
      gradual_body_mass_target_lbs = EXCLUDED.gradual_body_mass_target_lbs,
      competition_week_body_mass_change_lbs = EXCLUDED.competition_week_body_mass_change_lbs,
      status = EXCLUDED.status,
      completed_at = EXCLUDED.completed_at,
      safe_weekly_loss_rate = EXCLUDED.safe_weekly_loss_rate,
      calorie_floor = EXCLUDED.calorie_floor,
      baseline_cognitive_score = EXCLUDED.baseline_cognitive_score,
      coach_notes = EXCLUDED.coach_notes,
      risk_acknowledged_at = EXCLUDED.risk_acknowledged_at,
      risk_acknowledgement_version = EXCLUDED.risk_acknowledgement_version,
      risk_warning_snapshot = EXCLUDED.risk_warning_snapshot,
      updated_at = EXCLUDED.updated_at;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.cut_safety_checks') IS NOT NULL THEN
    INSERT INTO public.body_mass_safety_checks (
      id,
      user_id,
      plan_id,
      date,
      urine_color,
      body_temp_f,
      cognitive_score,
      mood_rating,
      dizziness,
      headache,
      muscle_cramps,
      post_weigh_in_weight,
      rehydration_weight_regained,
      notes,
      created_at
    )
    SELECT
      id,
      user_id,
      plan_id,
      date,
      urine_color,
      body_temp_f,
      cognitive_score,
      mood_rating,
      dizziness,
      headache,
      muscle_cramps,
      post_weigh_in_weight,
      rehydration_weight_regained,
      notes,
      created_at
    FROM public.cut_safety_checks
    ON CONFLICT (user_id, date) DO UPDATE
    SET
      plan_id = EXCLUDED.plan_id,
      urine_color = EXCLUDED.urine_color,
      body_temp_f = EXCLUDED.body_temp_f,
      cognitive_score = EXCLUDED.cognitive_score,
      mood_rating = EXCLUDED.mood_rating,
      dizziness = EXCLUDED.dizziness,
      headache = EXCLUDED.headache,
      muscle_cramps = EXCLUDED.muscle_cramps,
      post_weigh_in_weight = EXCLUDED.post_weigh_in_weight,
      rehydration_weight_regained = EXCLUDED.rehydration_weight_regained,
      notes = EXCLUDED.notes;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.weight_cut_history') IS NOT NULL THEN
    INSERT INTO public.weight_class_history (
      id,
      user_id,
      plan_id,
      start_weight,
      final_weigh_in_weight,
      target_weight,
      made_weight,
      total_duration_days,
      gradual_body_mass_change_lbs,
      competition_week_body_mass_change_lbs,
      avg_weekly_loss_rate,
      rehydration_weight_regained,
      fight_day_weight,
      adherence_pct,
      refeed_days_used,
      diet_breaks_used,
      safety_flags_triggered,
      fight_date,
      completed_at
    )
    SELECT
      id,
      user_id,
      plan_id,
      start_weight,
      final_weigh_in_weight,
      target_weight,
      made_weight,
      total_duration_days,
      total_diet_loss_lbs,
      total_water_cut_lbs,
      avg_weekly_loss_rate,
      rehydration_weight_regained,
      fight_day_weight,
      protocol_adherence_pct,
      refeed_days_used,
      diet_breaks_used,
      safety_flags_triggered,
      fight_date,
      completed_at
    FROM public.weight_cut_history
    ON CONFLICT (id) DO UPDATE
    SET
      user_id = EXCLUDED.user_id,
      plan_id = EXCLUDED.plan_id,
      start_weight = EXCLUDED.start_weight,
      final_weigh_in_weight = EXCLUDED.final_weigh_in_weight,
      target_weight = EXCLUDED.target_weight,
      made_weight = EXCLUDED.made_weight,
      total_duration_days = EXCLUDED.total_duration_days,
      gradual_body_mass_change_lbs = EXCLUDED.gradual_body_mass_change_lbs,
      competition_week_body_mass_change_lbs = EXCLUDED.competition_week_body_mass_change_lbs,
      avg_weekly_loss_rate = EXCLUDED.avg_weekly_loss_rate,
      rehydration_weight_regained = EXCLUDED.rehydration_weight_regained,
      fight_day_weight = EXCLUDED.fight_day_weight,
      adherence_pct = EXCLUDED.adherence_pct,
      safety_flags_triggered = EXCLUDED.safety_flags_triggered,
      fight_date = EXCLUDED.fight_date,
      completed_at = EXCLUDED.completed_at;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.athlete_profiles
  ADD COLUMN IF NOT EXISTS active_weight_class_plan_id UUID REFERENCES public.weight_class_plans(id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'athlete_profiles'
      AND column_name = 'active_cut_plan_id'
  ) THEN
    UPDATE public.athlete_profiles
    SET active_weight_class_plan_id = COALESCE(active_weight_class_plan_id, active_cut_plan_id)
    WHERE active_cut_plan_id IS NOT NULL;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.fight_camps
  ADD COLUMN IF NOT EXISTS has_concurrent_weight_class_plan BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS weight_class_state TEXT DEFAULT 'none'
    CHECK (weight_class_state IN ('none', 'monitoring', 'driving'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'fight_camps'
      AND column_name = 'has_concurrent_cut'
  ) THEN
    UPDATE public.fight_camps
    SET has_concurrent_weight_class_plan = COALESCE(has_concurrent_weight_class_plan, has_concurrent_cut);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'fight_camps'
      AND column_name = 'weight_cut_state'
  ) THEN
    UPDATE public.fight_camps
    SET weight_class_state = COALESCE(weight_class_state, weight_cut_state);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.daily_engine_snapshots') IS NOT NULL THEN
    INSERT INTO public.performance_engine_migration_archive (
      source_table,
      source_id,
      user_id,
      archive_reason,
      payload
    )
    SELECT
      'daily_engine_snapshots',
      id,
      user_id,
      'retired_daily_snapshot_persistence',
      to_jsonb(daily_engine_snapshots)
    FROM public.daily_engine_snapshots;
  END IF;

  IF to_regclass('public.daily_cut_protocols') IS NOT NULL THEN
    INSERT INTO public.performance_engine_migration_archive (
      source_table,
      source_id,
      user_id,
      archive_reason,
      payload
    )
    SELECT
      'daily_cut_protocols',
      id,
      user_id,
      'retired_daily_body_mass_protocol',
      to_jsonb(daily_cut_protocols)
    FROM public.daily_cut_protocols;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'weekly_plan_entries'
      AND column_name = 'daily_mission_snapshot'
  ) THEN
    INSERT INTO public.performance_engine_migration_archive (
      source_table,
      source_id,
      user_id,
      archive_reason,
      payload
    )
    SELECT
      'weekly_plan_entries.daily_mission_snapshot',
      id,
      user_id,
      'retired_daily_summary_mirror',
      jsonb_build_object(
        'weekly_plan_entry_id', id,
        'date', date,
        'dailySummarySnapshot', daily_mission_snapshot
      )
    FROM public.weekly_plan_entries
    WHERE daily_mission_snapshot IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'macro_ledger'
      AND column_name = 'cut_phase'
  ) THEN
    INSERT INTO public.performance_engine_migration_archive (
      source_table,
      source_id,
      user_id,
      archive_reason,
      payload
    )
    SELECT
      'macro_ledger.retired_body_mass_protocol_columns',
      id,
      user_id,
      'retired_body_mass_protocol_columns',
      jsonb_build_object(
        'date', date,
        'cut_phase', cut_phase,
        'sodium_target_mg', sodium_target_mg,
        'is_refeed_day', is_refeed_day,
        'is_carb_cycle_high', is_carb_cycle_high
      )
    FROM public.macro_ledger
    WHERE cut_phase IS NOT NULL
       OR sodium_target_mg IS NOT NULL
       OR is_refeed_day IS TRUE
       OR is_carb_cycle_high IS TRUE;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.weekly_plan_entries
  DROP COLUMN IF EXISTS daily_mission_snapshot;

ALTER TABLE IF EXISTS public.macro_ledger
  DROP COLUMN IF EXISTS cut_phase,
  DROP COLUMN IF EXISTS sodium_target_mg,
  DROP COLUMN IF EXISTS is_refeed_day,
  DROP COLUMN IF EXISTS is_carb_cycle_high;

ALTER TABLE IF EXISTS public.athlete_profiles
  DROP COLUMN IF EXISTS active_cut_plan_id;

ALTER TABLE IF EXISTS public.fight_camps
  DROP COLUMN IF EXISTS has_concurrent_cut,
  DROP COLUMN IF EXISTS weight_cut_state;

DROP TABLE IF EXISTS public.daily_engine_snapshots;
DROP TABLE IF EXISTS public.daily_cut_protocols;
DROP TABLE IF EXISTS public.cut_safety_checks;
DROP TABLE IF EXISTS public.weight_cut_history;
DROP TABLE IF EXISTS public.weight_cut_plans;

ALTER TABLE public.weight_class_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_mass_safety_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_class_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_engine_migration_archive ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Athletes can manage their own weight-class plans" ON public.weight_class_plans;
CREATE POLICY "Athletes can manage their own weight-class plans"
  ON public.weight_class_plans FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Athletes can manage their own body-mass safety checks" ON public.body_mass_safety_checks;
CREATE POLICY "Athletes can manage their own body-mass safety checks"
  ON public.body_mass_safety_checks FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Athletes can manage their own weight-class history" ON public.weight_class_history;
CREATE POLICY "Athletes can manage their own weight-class history"
  ON public.weight_class_history FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Athletes can read their own performance migration archive" ON public.performance_engine_migration_archive;
CREATE POLICY "Athletes can read their own performance migration archive"
  ON public.performance_engine_migration_archive FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_weight_class_plans_user_status
  ON public.weight_class_plans(user_id, status);

CREATE INDEX IF NOT EXISTS idx_body_mass_safety_checks_user_date
  ON public.body_mass_safety_checks(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_weight_class_history_user_completed
  ON public.weight_class_history(user_id, completed_at DESC);

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  target_user_id uuid := auth.uid();
BEGIN
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user required';
  END IF;

  DELETE FROM public.activity_log WHERE user_id = target_user_id;
  DELETE FROM public.scheduled_activities WHERE user_id = target_user_id;
  DELETE FROM public.recurring_activities WHERE user_id = target_user_id;
  DELETE FROM public.weekly_targets WHERE user_id = target_user_id;
  DELETE FROM public.fight_camps WHERE user_id = target_user_id;
  DELETE FROM public.build_phase_goals WHERE user_id = target_user_id;

  DELETE FROM public.body_mass_safety_checks WHERE user_id = target_user_id;
  DELETE FROM public.weight_class_history WHERE user_id = target_user_id;

  DELETE FROM public.exercise_pr_log WHERE user_id = target_user_id;
  DELETE FROM public.exercise_overload_history WHERE user_id = target_user_id;
  DELETE FROM public.weekly_plan_entries WHERE user_id = target_user_id;
  DELETE FROM public.weekly_plan_config WHERE user_id = target_user_id;
  DELETE FROM public.gym_profiles WHERE user_id = target_user_id;

  DELETE FROM public.favorite_foods WHERE user_id = target_user_id;
  DELETE FROM public.food_log WHERE user_id = target_user_id;
  DELETE FROM public.daily_nutrition_summary WHERE user_id = target_user_id;
  DELETE FROM public.hydration_log WHERE user_id = target_user_id;

  DELETE FROM public.workout_log WHERE user_id = target_user_id;
  DELETE FROM public.training_sessions WHERE user_id = target_user_id;
  DELETE FROM public.daily_checkins WHERE user_id = target_user_id;
  DELETE FROM public.daily_timeline WHERE user_id = target_user_id;
  DELETE FROM public.macro_ledger WHERE user_id = target_user_id;

  DELETE FROM public.athlete_profiles WHERE user_id = target_user_id;
  DELETE FROM public.weight_class_plans WHERE user_id = target_user_id;
  DELETE FROM public.food_items WHERE user_id = target_user_id;
  DELETE FROM public.exercise_library WHERE user_id = target_user_id;
  DELETE FROM public.performance_engine_migration_archive WHERE user_id = target_user_id;
  DELETE FROM public.users WHERE id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

NOTIFY pgrst, 'reload schema';
