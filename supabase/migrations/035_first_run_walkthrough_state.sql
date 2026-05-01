-- Versioned first-run walkthrough UX state.
-- This state guides first-run UI only. Canonical athlete data remains in
-- AthleteJourneyState / PerformanceState projections and their source records.

CREATE TABLE IF NOT EXISTS public.user_walkthrough_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  athlete_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  walkthrough_key TEXT NOT NULL DEFAULT 'first_run_walkthrough',
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed', 'skipped', 'dismissed', 'needs_update')),
  current_step TEXT
    CHECK (
      current_step IS NULL OR current_step IN (
        'welcome',
        'journey_setup',
        'protected_workout_setup',
        'fight_context_setup',
        'fueling_setup',
        'readiness_baseline',
        'today_mission_intro',
        'app_tour'
      )
    ),
  completed_steps TEXT[] NOT NULL DEFAULT '{}',
  skipped_steps TEXT[] NOT NULL DEFAULT '{}',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  walkthrough_version INTEGER NOT NULL DEFAULT 1,
  applies_to TEXT NOT NULL
    CHECK (applies_to IN ('new_signup', 'first_sign_in', 'existing_user_overhaul_intro')),
  is_new_user BOOLEAN NOT NULL DEFAULT false,
  is_existing_user_migration BOOLEAN NOT NULL DEFAULT false,
  has_seen_today_mission_intro BOOLEAN NOT NULL DEFAULT false,
  has_seen_app_tour BOOLEAN NOT NULL DEFAULT false,
  has_completed_journey_setup BOOLEAN NOT NULL DEFAULT false,
  has_completed_protected_workout_setup BOOLEAN NOT NULL DEFAULT false,
  has_completed_fight_context_setup BOOLEAN NOT NULL DEFAULT false,
  has_completed_fueling_setup BOOLEAN NOT NULL DEFAULT false,
  has_completed_readiness_baseline BOOLEAN NOT NULL DEFAULT false,
  can_resume BOOLEAN NOT NULL DEFAULT true,
  source TEXT NOT NULL DEFAULT 'app_entry'
    CHECK (source IN ('auth_signup', 'auth_sign_in', 'app_entry', 'onboarding', 'existing_user_migration', 'manual')),
  explanations JSONB NOT NULL DEFAULT '[]'::jsonb,
  step_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, walkthrough_key)
);

CREATE INDEX IF NOT EXISTS idx_user_walkthrough_state_user_status
  ON public.user_walkthrough_state(user_id, status);

ALTER TABLE public.user_walkthrough_state ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Users can manage own walkthrough state"
    ON public.user_walkthrough_state FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE OR REPLACE FUNCTION public.touch_user_walkthrough_state_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS touch_user_walkthrough_state_updated_at ON public.user_walkthrough_state;
CREATE TRIGGER touch_user_walkthrough_state_updated_at
  BEFORE UPDATE ON public.user_walkthrough_state
  FOR EACH ROW EXECUTE PROCEDURE public.touch_user_walkthrough_state_updated_at();

NOTIFY pgrst, 'reload schema';
