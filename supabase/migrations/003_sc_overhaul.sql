-- ═══════════════════════════════════════════════════════════════
-- S&C Workout System Overhaul
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- New Tables
-- ═══════════════════════════════════════════════════════════════

-- Gym Profiles: equipment presets for different training locations
CREATE TABLE IF NOT EXISTS public.gym_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    equipment JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.gym_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own gym profiles"
    ON public.gym_profiles FOR ALL
    USING (auth.uid() = user_id);

-- Weekly Plan Config: user scheduling preferences
CREATE TABLE IF NOT EXISTS public.weekly_plan_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    available_days INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}',
    session_duration_min INTEGER NOT NULL DEFAULT 60,
    allow_two_a_days BOOLEAN NOT NULL DEFAULT FALSE,
    two_a_day_days INTEGER[] DEFAULT '{}',
    am_session_type TEXT DEFAULT 'sc',
    pm_session_type TEXT DEFAULT 'boxing_practice',
    preferred_gym_profile_id UUID REFERENCES public.gym_profiles(id),
    auto_deload_interval_weeks INTEGER DEFAULT 4,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.weekly_plan_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own weekly config"
    ON public.weekly_plan_config FOR ALL
    USING (auth.uid() = user_id);

-- Weekly Plan Entries: individual scheduled sessions
CREATE TABLE IF NOT EXISTS public.weekly_plan_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    week_start_date DATE NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    date DATE NOT NULL,
    slot TEXT NOT NULL CHECK (slot IN ('am', 'pm', 'single')),
    session_type TEXT NOT NULL,
    focus TEXT,
    estimated_duration_min INTEGER NOT NULL,
    target_intensity INTEGER,
    status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'completed', 'skipped', 'rescheduled')),
    rescheduled_to DATE,
    workout_log_id UUID,
    prescription_snapshot JSONB,
    engine_notes TEXT,
    is_deload BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, date, slot)
);

ALTER TABLE public.weekly_plan_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own plan entries"
    ON public.weekly_plan_entries FOR ALL
    USING (auth.uid() = user_id);

-- Exercise PR Log: personal record tracking per exercise
CREATE TABLE IF NOT EXISTS public.exercise_pr_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    exercise_library_id UUID NOT NULL,
    pr_type TEXT NOT NULL CHECK (pr_type IN ('weight', 'reps', 'estimated_1rm', 'volume')),
    value NUMERIC NOT NULL,
    reps_at_pr INTEGER,
    weight_at_pr NUMERIC,
    rpe_at_pr INTEGER,
    estimated_1rm NUMERIC,
    workout_log_id UUID,
    achieved_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.exercise_pr_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own PRs"
    ON public.exercise_pr_log FOR ALL
    USING (auth.uid() = user_id);

-- Exercise Overload History: progressive overload tracking per exercise per day
CREATE TABLE IF NOT EXISTS public.exercise_overload_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    exercise_library_id UUID NOT NULL,
    date DATE NOT NULL,
    best_set_weight NUMERIC NOT NULL,
    best_set_reps INTEGER NOT NULL,
    best_set_rpe INTEGER,
    total_volume NUMERIC NOT NULL,
    working_sets INTEGER NOT NULL,
    estimated_1rm NUMERIC,
    progression_model TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, exercise_library_id, date)
);

ALTER TABLE public.exercise_overload_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own overload history"
    ON public.exercise_overload_history FOR ALL
    USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- ALTER existing tables
-- ═══════════════════════════════════════════════════════════════

-- exercise_library: add movement_pattern column
ALTER TABLE public.exercise_library ADD COLUMN IF NOT EXISTS movement_pattern TEXT DEFAULT 'compound'
    CHECK (movement_pattern IN ('horizontal_push', 'horizontal_pull', 'vertical_push', 'vertical_pull',
        'hip_hinge', 'squat', 'lunge', 'rotation', 'carry', 'compound', 'isolation', 'sport_specific',
        'conditioning', 'mobility'));

-- workout_log: add weekly plan and gym profile references
ALTER TABLE public.workout_log
    ADD COLUMN IF NOT EXISTS weekly_plan_entry_id UUID,
    ADD COLUMN IF NOT EXISTS gym_profile_id UUID,
    ADD COLUMN IF NOT EXISTS cumulative_fatigue_score NUMERIC,
    ADD COLUMN IF NOT EXISTS adaptations_applied INTEGER DEFAULT 0;

-- workout_set_log: add target/adaptation tracking
ALTER TABLE public.workout_set_log
    ADD COLUMN IF NOT EXISTS target_weight NUMERIC,
    ADD COLUMN IF NOT EXISTS target_reps INTEGER,
    ADD COLUMN IF NOT EXISTS target_rpe INTEGER,
    ADD COLUMN IF NOT EXISTS was_adapted BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS adaptation_reason TEXT,
    ADD COLUMN IF NOT EXISTS estimated_1rm NUMERIC;

-- Athlete_Profiles: add gym profile and progression model
ALTER TABLE public.athlete_profiles
    ADD COLUMN IF NOT EXISTS default_gym_profile_id UUID,
    ADD COLUMN IF NOT EXISTS progression_model TEXT DEFAULT 'linear'
        CHECK (progression_model IN ('linear', 'wave', 'block'));

-- ═══════════════════════════════════════════════════════════════
-- Seed Data: Update exercise_library with movement_pattern values
-- ═══════════════════════════════════════════════════════════════

-- Horizontal Push: Bench press variations, floor press, push-ups, dips
UPDATE public.exercise_library SET movement_pattern = 'horizontal_push'
    WHERE name ILIKE '%bench press%'
       OR name ILIKE '%floor press%'
       OR name ILIKE '%push-up%'
       OR name ILIKE '%pushup%'
       OR name ILIKE '%push up%'
       OR name ILIKE 'dips'
       OR name ILIKE '%plyometric push%'
       OR name ILIKE '%incline%press%'
       OR name ILIKE '%med ball chest pass%';

-- Vertical Push: Overhead press, shoulder press, landmine press
UPDATE public.exercise_library SET movement_pattern = 'vertical_push'
    WHERE name ILIKE '%overhead press%'
       OR name ILIKE '%shoulder press%'
       OR name ILIKE '%landmine press%'
       OR name ILIKE '%clean and press%';

-- Horizontal Pull: Rows (barbell, dumbbell, inverted)
UPDATE public.exercise_library SET movement_pattern = 'horizontal_pull'
    WHERE name ILIKE '%barbell row%'
       OR name ILIKE '%dumbbell row%'
       OR name ILIKE '%inverted row%'
       OR name ILIKE '%face pull%'
       OR name ILIKE '%rack pull%';

-- Vertical Pull: Pull-ups, chin-ups, lat pulldown, muscle-up
UPDATE public.exercise_library SET movement_pattern = 'vertical_pull'
    WHERE name ILIKE '%pull-up%'
       OR name ILIKE '%pullup%'
       OR name ILIKE '%pull up%'
       OR name ILIKE '%chin-up%'
       OR name ILIKE '%chinup%'
       OR name ILIKE '%chin up%'
       OR name ILIKE '%lat pulldown%'
       OR name ILIKE '%muscle-up%'
       OR name ILIKE '%dead hang%';

-- Hip Hinge: Deadlifts, Romanian DL, hip thrust, kettlebell swing
UPDATE public.exercise_library SET movement_pattern = 'hip_hinge'
    WHERE name ILIKE '%deadlift%'
       OR name ILIKE '%romanian%'
       OR name ILIKE '%hip thrust%'
       OR name ILIKE '%kettlebell swing%'
       OR name ILIKE '%trap bar%';

-- Squat: All squat variations
UPDATE public.exercise_library SET movement_pattern = 'squat'
    WHERE name ILIKE '%squat%'
       OR name ILIKE '%goblet squat%'
       OR name ILIKE '%pistol squat%'
       OR name ILIKE '%leg press%';

-- Lunge: Lunges, split squats, step-ups
UPDATE public.exercise_library SET movement_pattern = 'lunge'
    WHERE name ILIKE '%lunge%'
       OR name ILIKE '%split squat%'
       OR name ILIKE '%step-up%'
       OR name ILIKE '%step up%';

-- Rotation: Rotational movements, woodchops, Russian twist
UPDATE public.exercise_library SET movement_pattern = 'rotation'
    WHERE name ILIKE '%rotation%'
       OR name ILIKE '%rotational%'
       OR name ILIKE '%woodchop%'
       OR name ILIKE '%russian twist%'
       OR name ILIKE '%landmine rotation%'
       OR name ILIKE '%med ball rotational%'
       OR name ILIKE '%medicine ball rotational%';

-- Carry: Farmer's walk, sled push/pull, prowler
UPDATE public.exercise_library SET movement_pattern = 'carry'
    WHERE name ILIKE '%farmer%walk%'
       OR name ILIKE '%sled push%'
       OR name ILIKE '%sled pull%'
       OR name ILIKE '%prowler%'
       OR name ILIKE '%tire flip%';

-- Isolation: Bicep, tricep, calf, lateral raise, wrist, band pull-aparts
UPDATE public.exercise_library SET movement_pattern = 'isolation'
    WHERE name ILIKE '%barbell curl%'
       OR name ILIKE '%hammer curl%'
       OR name ILIKE '%tricep pushdown%'
       OR name ILIKE '%lateral raise%'
       OR name ILIKE '%wrist roller%'
       OR name ILIKE '%wrist circle%'
       OR name ILIKE '%ankle circle%'
       OR name ILIKE '%band pull-apart%'
       OR name ILIKE '%shoulder dislocate%'
       OR name ILIKE '%calf raise%';

-- Sport Specific: Boxing drills, sparring, mitt work, bags, neck, footwork
UPDATE public.exercise_library SET movement_pattern = 'sport_specific'
    WHERE name ILIKE '%heavy bag%'
       OR name ILIKE '%shadow boxing%'
       OR name ILIKE '%speed bag%'
       OR name ILIKE '%double end bag%'
       OR name ILIKE '%slip rope%'
       OR name ILIKE '%mitt work%'
       OR name ILIKE '%sparring%'
       OR name ILIKE '%neck harness%'
       OR name ILIKE '%neck bridge%'
       OR name ILIKE '%footwork ladder%'
       OR name ILIKE '%clinch work%'
       OR name ILIKE '%body shot bag%'
       OR name ILIKE '%defensive drill%'
       OR name ILIKE '%feint and counter%'
       OR name ILIKE '%sit-ups%fighter%'
       OR name ILIKE '%light shadow%';

-- Conditioning: Cardio, intervals, jump rope, sprints, bike, rowing, burpees, battle ropes, swimming, running
UPDATE public.exercise_library SET movement_pattern = 'conditioning'
    WHERE name ILIKE '%assault bike%'
       OR name ILIKE '%jump rope%'
       OR name ILIKE '%burpee%'
       OR name ILIKE '%rowing machine%'
       OR name ILIKE '%stair sprint%'
       OR name ILIKE '%hill sprint%'
       OR name ILIKE '%battle rope%'
       OR name ILIKE '%shuttle run%'
       OR name ILIKE '%swimming%'
       OR name ILIKE '%road run%'
       OR name ILIKE '%light bike%';

-- Mobility: Stretches, foam rolling, mobility drills, yoga, recovery
UPDATE public.exercise_library SET movement_pattern = 'mobility'
    WHERE name ILIKE '%hip circle%'
       OR name ILIKE '%foam roll%'
       OR name ILIKE '%world%greatest stretch%'
       OR name ILIKE '%90/90%'
       OR name ILIKE '%thoracic spine%'
       OR name ILIKE '%cat-cow%'
       OR name ILIKE '%pigeon stretch%'
       OR name ILIKE '%couch stretch%'
       OR name ILIKE '%lacrosse ball%'
       OR name ILIKE '%child%pose%'
       OR name ILIKE '%yoga flow%'
       OR name ILIKE '%walking%'
       OR name ILIKE '%dead bug%'
       OR name ILIKE '%band work%shoulder%';

-- Compound: Explosive power movements that are full-body compound
-- These override any prior matches for compound/power exercises
UPDATE public.exercise_library SET movement_pattern = 'compound'
    WHERE name ILIKE '%power clean%'
       OR name ILIKE '%hang clean%'
       OR name ILIKE '%dumbbell snatch%'
       OR name ILIKE '%ab wheel%'
       OR name ILIKE '%hanging leg raise%'
       OR name ILIKE '%pallof press%'
       OR name ILIKE '%plank'
       OR name ILIKE '%side plank%'
       OR name ILIKE '%box jump%'
       OR name ILIKE '%broad jump%'
       OR name ILIKE '%depth jump%'
       OR name ILIKE '%lateral bound%'
       OR name ILIKE '%medicine ball slam%'
       OR name ILIKE '%battle rope slam%';

-- ═══════════════════════════════════════════════════════════════
-- Indexes for query performance
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_exercise_overload_history_user_exercise
    ON public.exercise_overload_history(user_id, exercise_library_id);

CREATE INDEX IF NOT EXISTS idx_exercise_pr_log_user_exercise
    ON public.exercise_pr_log(user_id, exercise_library_id);

CREATE INDEX IF NOT EXISTS idx_weekly_plan_entries_user_week
    ON public.weekly_plan_entries(user_id, week_start_date);

CREATE INDEX IF NOT EXISTS idx_weekly_plan_entries_user_date
    ON public.weekly_plan_entries(user_id, date);

CREATE INDEX IF NOT EXISTS idx_gym_profiles_user
    ON public.gym_profiles(user_id);
