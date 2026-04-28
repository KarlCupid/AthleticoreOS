-- Engine launch safety policy persistence

ALTER TABLE public.weight_cut_plans
  ADD COLUMN IF NOT EXISTS risk_acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS risk_acknowledgement_version TEXT,
  ADD COLUMN IF NOT EXISTS risk_warning_snapshot JSONB;
