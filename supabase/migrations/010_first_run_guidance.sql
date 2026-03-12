-- First-run guidance state (cross-device, profile-backed)

ALTER TABLE IF EXISTS public.athlete_profiles
  ADD COLUMN IF NOT EXISTS first_run_guidance_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (first_run_guidance_status IN ('pending', 'completed'));

ALTER TABLE IF EXISTS public.athlete_profiles
  ADD COLUMN IF NOT EXISTS first_run_guidance_intro_seen_at TIMESTAMPTZ;

-- Roll out to all existing athletes once.
UPDATE public.athlete_profiles
SET
  first_run_guidance_status = 'pending',
  first_run_guidance_intro_seen_at = NULL;
