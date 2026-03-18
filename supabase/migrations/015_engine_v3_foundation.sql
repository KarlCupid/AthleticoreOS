ALTER TABLE public.athlete_profiles
  ADD COLUMN IF NOT EXISTS training_age TEXT
  CHECK (training_age IN ('novice', 'intermediate', 'advanced'));

ALTER TABLE public.exercise_library
  ADD COLUMN IF NOT EXISTS recovery_hours INTEGER,
  ADD COLUMN IF NOT EXISTS eccentric_damage INTEGER CHECK (eccentric_damage BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS interference_risk TEXT CHECK (interference_risk IN ('NONE', 'LOW', 'MODERATE', 'HIGH')),
  ADD COLUMN IF NOT EXISTS normalized_recovery_cost INTEGER;

ALTER TABLE public.workout_log
  ADD COLUMN IF NOT EXISTS compliance_reason TEXT CHECK (compliance_reason IN ('FATIGUE', 'TIME', 'PAIN', 'MOTIVATION', 'EQUIPMENT', 'OTHER')),
  ADD COLUMN IF NOT EXISTS activation_rpe NUMERIC;
