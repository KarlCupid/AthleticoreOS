-- Weight drift is now derived through canonical body-mass state instead of
-- persisted daily cut protocols. This migration only retains external load
-- intake scaffolding.

ALTER TABLE public.daily_checkins
    ADD COLUMN IF NOT EXISTS external_heart_rate_load NUMERIC;
