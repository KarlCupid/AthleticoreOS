CREATE TABLE IF NOT EXISTS public.daily_engine_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.Users(id) NOT NULL,
  date DATE NOT NULL,
  engine_version TEXT NOT NULL DEFAULT 'daily-engine-v3',
  objective_context_snapshot JSONB NOT NULL,
  nutrition_targets_snapshot JSONB NOT NULL,
  workout_prescription_snapshot JSONB,
  mission_snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.daily_engine_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own daily engine snapshots" ON public.daily_engine_snapshots;

CREATE POLICY "Users manage own daily engine snapshots"
  ON public.daily_engine_snapshots FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_daily_engine_snapshots_user_date
  ON public.daily_engine_snapshots(user_id, date);

INSERT INTO public.daily_engine_snapshots (
  user_id,
  date,
  engine_version,
  objective_context_snapshot,
  nutrition_targets_snapshot,
  workout_prescription_snapshot,
  mission_snapshot
)
SELECT
  user_id,
  date,
  COALESCE(daily_mission_snapshot->>'engineVersion', 'daily-engine-v3'),
  COALESCE(daily_mission_snapshot->'macrocycleContext', '{}'::jsonb),
  jsonb_build_object(
    'tdee', COALESCE((daily_mission_snapshot->'fuelDirective'->>'calories')::INTEGER, 0),
    'adjustedCalories', COALESCE((daily_mission_snapshot->'fuelDirective'->>'calories')::INTEGER, 0),
    'protein', COALESCE((daily_mission_snapshot->'fuelDirective'->>'protein')::INTEGER, 0),
    'carbs', COALESCE((daily_mission_snapshot->'fuelDirective'->>'carbs')::INTEGER, 0),
    'fat', COALESCE((daily_mission_snapshot->'fuelDirective'->>'fat')::INTEGER, 0),
    'proteinModifier', 1,
    'phaseMultiplier', 0,
    'weightCorrectionDeficit', 0,
    'message', COALESCE(daily_mission_snapshot->'fuelDirective'->>'message', ''),
    'source', 'daily_activity_adjusted',
    'fuelState', COALESCE(daily_mission_snapshot->'fuelDirective'->>'state', 'rest'),
    'sessionDemandScore', COALESCE((daily_mission_snapshot->'fuelDirective'->>'sessionDemandScore')::INTEGER, 0),
    'hydrationBoostOz', COALESCE((daily_mission_snapshot->'fuelDirective'->>'hydrationBoostOz')::INTEGER, 0),
    'reasonLines', COALESCE(daily_mission_snapshot->'fuelDirective'->'reasons', '[]'::jsonb)
  ),
  COALESCE(daily_mission_snapshot->'trainingDirective'->'prescription', prescription_snapshot),
  daily_mission_snapshot
FROM public.weekly_plan_entries
WHERE daily_mission_snapshot IS NOT NULL
ON CONFLICT (user_id, date) DO NOTHING;
