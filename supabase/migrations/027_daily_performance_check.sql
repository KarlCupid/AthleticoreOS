-- Daily Performance Check v2: subjective, non-wearable readiness inputs.
-- Columns are nullable/default-safe so existing check-ins continue to work.

ALTER TABLE public.daily_checkins
    ADD COLUMN IF NOT EXISTS energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 5),
    ADD COLUMN IF NOT EXISTS fuel_hydration_status INTEGER CHECK (fuel_hydration_status BETWEEN 1 AND 5),
    ADD COLUMN IF NOT EXISTS pain_level INTEGER CHECK (pain_level BETWEEN 1 AND 5),
    ADD COLUMN IF NOT EXISTS readiness_score INTEGER CHECK (readiness_score BETWEEN 0 AND 100),
    ADD COLUMN IF NOT EXISTS checkin_version INTEGER NOT NULL DEFAULT 2;
