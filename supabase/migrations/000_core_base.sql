-- Core baseline tables for clean Supabase bootstrap.
-- Safe to apply on existing databases due to IF NOT EXISTS + duplicate policy guards.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users mirror table for auth metadata joins.
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'athlete' CHECK (role IN ('athlete', 'coach', 'admin'))
);

CREATE TABLE IF NOT EXISTS public.athlete_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id),
    coach_id UUID REFERENCES public.users(id),
    gym_id UUID,
    biological_sex TEXT CHECK (biological_sex IN ('male', 'female')),
    fight_status TEXT CHECK (fight_status IN ('amateur', 'pro')),
    phase TEXT CHECK (phase IN ('off-season', 'pre-camp', 'fight-camp', 'camp-base', 'camp-build', 'camp-peak', 'camp-taper')),
    target_weight NUMERIC,
    base_weight NUMERIC,
    cycle_tracking BOOLEAN NOT NULL DEFAULT false,
    fitness_level TEXT DEFAULT 'intermediate' CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced', 'elite')),
    fitness_score NUMERIC,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daily_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    morning_weight NUMERIC,
    sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 5),
    readiness INTEGER CHECK (readiness BETWEEN 1 AND 5),
    macro_adherence TEXT CHECK (macro_adherence IN ('Target Met', 'Close Enough', 'Missed It')),
    UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS public.training_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    duration_minutes INTEGER NOT NULL,
    intensity_srpe INTEGER NOT NULL CHECK (intensity_srpe BETWEEN 1 AND 10),
    total_load INTEGER GENERATED ALWAYS AS (duration_minutes * intensity_srpe) STORED
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_training_sessions_user_date
    ON public.training_sessions(user_id, date);

CREATE TABLE IF NOT EXISTS public.exercise_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('heavy_lift', 'power', 'mobility', 'active_recovery', 'conditioning', 'sport_specific')),
    cns_load INTEGER NOT NULL CHECK (cns_load BETWEEN 1 AND 10),
    muscle_group TEXT NOT NULL DEFAULT 'full_body' CHECK (muscle_group IN ('chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes', 'arms', 'core', 'full_body', 'neck', 'calves')),
    equipment TEXT NOT NULL DEFAULT 'bodyweight' CHECK (equipment IN ('barbell', 'dumbbell', 'kettlebell', 'bodyweight', 'cable', 'machine', 'band', 'medicine_ball', 'sled', 'heavy_bag', 'other')),
    description TEXT DEFAULT '',
    cues TEXT DEFAULT '',
    sport_tags TEXT[] NOT NULL DEFAULT '{}'::text[],
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercise_library_name ON public.exercise_library(name);
CREATE INDEX IF NOT EXISTS idx_exercise_library_user ON public.exercise_library(user_id);

CREATE TABLE IF NOT EXISTS public.daily_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    block_type TEXT NOT NULL CHECK (block_type IN ('Boxing', 'S&C', 'Recovery')),
    planned_intensity INTEGER NOT NULL CHECK (planned_intensity BETWEEN 1 AND 10),
    actual_intensity INTEGER CHECK (actual_intensity BETWEEN 1 AND 10),
    status TEXT NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Completed', 'Skipped', 'Audible')),
    UNIQUE(user_id, date, block_type)
);

CREATE TABLE IF NOT EXISTS public.macro_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    base_tdee INTEGER NOT NULL,
    prescribed_protein INTEGER NOT NULL,
    prescribed_fats INTEGER NOT NULL,
    prescribed_carbs INTEGER NOT NULL,
    weight_correction_deficit INTEGER NOT NULL DEFAULT 0,
    UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS public.workout_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    timeline_block_id UUID REFERENCES public.daily_timeline(id),
    workout_type TEXT NOT NULL CHECK (workout_type IN ('strength', 'practice', 'sparring', 'conditioning', 'recovery')),
    focus TEXT CHECK (focus IN ('upper_push', 'upper_pull', 'lower', 'full_body', 'sport_specific', 'recovery', 'conditioning')),
    total_volume NUMERIC NOT NULL DEFAULT 0,
    total_sets INTEGER NOT NULL DEFAULT 0,
    session_rpe INTEGER CHECK (session_rpe BETWEEN 1 AND 10),
    duration_minutes INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workout_log_user_date ON public.workout_log(user_id, date DESC);

CREATE TABLE IF NOT EXISTS public.workout_set_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_log_id UUID NOT NULL REFERENCES public.workout_log(id) ON DELETE CASCADE,
    exercise_library_id UUID NOT NULL REFERENCES public.exercise_library(id),
    superset_group INTEGER,
    set_number INTEGER NOT NULL,
    reps INTEGER NOT NULL DEFAULT 0,
    weight_lbs NUMERIC NOT NULL DEFAULT 0,
    rpe INTEGER CHECK (rpe BETWEEN 1 AND 10),
    tempo TEXT,
    rest_seconds INTEGER,
    is_warmup BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workout_set_log_workout ON public.workout_set_log(workout_log_id, set_number);

CREATE TABLE IF NOT EXISTS public.scheduled_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    recurring_activity_id UUID,
    date DATE NOT NULL,
    activity_type TEXT NOT NULL,
    custom_label TEXT,
    start_time TIME,
    estimated_duration_min INTEGER NOT NULL DEFAULT 60,
    expected_intensity INTEGER NOT NULL DEFAULT 5,
    session_components JSONB NOT NULL DEFAULT '[]'::jsonb,
    source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('template', 'manual', 'engine')),
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'skipped', 'modified')),
    actual_duration_min INTEGER,
    actual_rpe INTEGER,
    notes TEXT,
    engine_recommendation TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_activities_user_date
    ON public.scheduled_activities(user_id, date);

CREATE TABLE IF NOT EXISTS public.weekly_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),
    sc_sessions INTEGER NOT NULL DEFAULT 2,
    running_sessions INTEGER NOT NULL DEFAULT 0,
    road_work_sessions INTEGER NOT NULL DEFAULT 2,
    boxing_sessions INTEGER NOT NULL DEFAULT 3,
    conditioning_sessions INTEGER NOT NULL DEFAULT 1,
    recovery_sessions INTEGER NOT NULL DEFAULT 1,
    total_weekly_load_cap INTEGER NOT NULL DEFAULT 4000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheduled_activity_id UUID REFERENCES public.scheduled_activities(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    date DATE NOT NULL,
    component_type TEXT NOT NULL,
    duration_min INTEGER NOT NULL,
    distance_miles NUMERIC,
    pace_per_mile TEXT,
    rounds INTEGER,
    intensity INTEGER NOT NULL,
    heart_rate_avg INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_date ON public.activity_log(user_id, date);
CREATE INDEX IF NOT EXISTS idx_activity_log_activity_id ON public.activity_log(scheduled_activity_id);

CREATE TABLE IF NOT EXISTS public.fight_camps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    fight_date DATE NOT NULL,
    camp_start_date DATE NOT NULL,
    total_weeks INTEGER NOT NULL,
    has_concurrent_cut BOOLEAN NOT NULL DEFAULT false,
    base_phase_start DATE,
    base_phase_end DATE,
    build_phase_start DATE,
    build_phase_end DATE,
    peak_phase_start DATE,
    peak_phase_end DATE,
    taper_phase_start DATE,
    taper_phase_end DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fight_camps_user_status ON public.fight_camps(user_id, status);

-- RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.macro_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_set_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fight_camps ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    CREATE POLICY "Users can view own users row"
        ON public.users FOR SELECT
        USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    CREATE POLICY "Athletes manage own profile"
        ON public.athlete_profiles FOR ALL
        USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    CREATE POLICY "Athletes manage own checkins"
        ON public.daily_checkins FOR ALL
        USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    CREATE POLICY "Athletes manage own sessions"
        ON public.training_sessions FOR ALL
        USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    CREATE POLICY "Users read shared and own exercises"
        ON public.exercise_library FOR SELECT
        USING (user_id IS NULL OR auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    CREATE POLICY "Users insert own exercises"
        ON public.exercise_library FOR INSERT
        WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    CREATE POLICY "Users update own exercises"
        ON public.exercise_library FOR UPDATE
        USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    CREATE POLICY "Users delete own exercises"
        ON public.exercise_library FOR DELETE
        USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    CREATE POLICY "Athletes manage own timeline"
        ON public.daily_timeline FOR ALL
        USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    CREATE POLICY "Athletes manage own macros"
        ON public.macro_ledger FOR ALL
        USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    CREATE POLICY "Athletes manage own workouts"
        ON public.workout_log FOR ALL
        USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    CREATE POLICY "Athletes manage own workout sets"
        ON public.workout_set_log FOR ALL
        USING (
            EXISTS (
                SELECT 1 FROM public.workout_log w
                WHERE w.id = workout_set_log.workout_log_id
                AND w.user_id = auth.uid()
            )
        );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    CREATE POLICY "Users own scheduled activities"
        ON public.scheduled_activities FOR ALL
        USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    CREATE POLICY "Users own weekly targets"
        ON public.weekly_targets FOR ALL
        USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    CREATE POLICY "Users own activity logs"
        ON public.activity_log FOR ALL
        USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    CREATE POLICY "Users own fight camps"
        ON public.fight_camps FOR ALL
        USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.users (id, email, role)
    VALUES (new.id, new.email, 'athlete')
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
