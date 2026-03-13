-- Daily Mission OS v1

ALTER TABLE IF EXISTS public.weekly_plan_entries
  ADD COLUMN IF NOT EXISTS daily_mission_snapshot JSONB;

ALTER TABLE IF EXISTS public.build_phase_goals
  ADD COLUMN IF NOT EXISTS primary_outcome TEXT,
  ADD COLUMN IF NOT EXISTS secondary_constraint TEXT
    CHECK (secondary_constraint IN ('protect_recovery', 'weight_trajectory', 'skill_frequency', 'schedule_reliability', 'injury_risk', 'none')),
  ADD COLUMN IF NOT EXISTS success_window TEXT;

UPDATE public.build_phase_goals
SET
  primary_outcome = COALESCE(primary_outcome, goal_statement),
  secondary_constraint = COALESCE(secondary_constraint, 'protect_recovery')
WHERE primary_outcome IS NULL
   OR secondary_constraint IS NULL;
