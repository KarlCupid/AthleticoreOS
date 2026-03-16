-- Weight drift persistence and external load intake scaffolding.

ALTER TABLE public.daily_cut_protocols
    ADD COLUMN IF NOT EXISTS weight_drift_lbs NUMERIC,
    ADD COLUMN IF NOT EXISTS intervention_reason TEXT;

ALTER TABLE public.daily_checkins
    ADD COLUMN IF NOT EXISTS external_heart_rate_load NUMERIC;
