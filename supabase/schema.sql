-- AthletiCore OS Supabase Schema

-- Users table linking to Supabase auth.users
CREATE TABLE public.Users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'athlete' NOT NULL CHECK (role IN ('athlete', 'coach', 'admin'))
);

-- Athlete Profiles
CREATE TABLE public.Athlete_Profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.Users(id) NOT NULL UNIQUE,
    coach_id UUID REFERENCES public.Users(id),
    gym_id UUID,
    biological_sex TEXT CHECK (biological_sex IN ('male', 'female')),
    fight_status TEXT CHECK (fight_status IN ('amateur', 'pro')),
    phase TEXT CHECK (phase IN ('off-season', 'pre-camp', 'fight-camp')),
    target_weight NUMERIC,
    base_weight NUMERIC,
    cycle_tracking BOOLEAN DEFAULT FALSE
);

-- Daily Checkins
CREATE TABLE public.Daily_Checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.Users(id) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    morning_weight NUMERIC,
    sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 5),
    readiness INTEGER CHECK (readiness BETWEEN 1 AND 5),
    macro_adherence TEXT CHECK (macro_adherence IN ('Target Met', 'Close Enough', 'Missed It')),
    UNIQUE(user_id, date)
);

-- Training Sessions
CREATE TABLE public.Training_Sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.Users(id) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    duration_minutes INTEGER NOT NULL,
    intensity_srpe INTEGER CHECK (intensity_srpe BETWEEN 1 AND 10) NOT NULL,
    total_load INTEGER GENERATED ALWAYS AS (duration_minutes * intensity_srpe) STORED
);

-- Row Level Security (RLS) setup
ALTER TABLE public.Users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.Athlete_Profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.Daily_Checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.Training_Sessions ENABLE ROW LEVEL SECURITY;

-- Policies for Users
CREATE POLICY "Users can view their own profile" 
    ON public.Users FOR SELECT 
    USING (auth.uid() = id);

-- Policies for Athlete_Profiles
CREATE POLICY "Athletes can manage their own profile" 
    ON public.Athlete_Profiles FOR ALL 
    USING (auth.uid() = user_id);

-- Policies for Daily_Checkins
CREATE POLICY "Athletes can manage their daily checkins" 
    ON public.Daily_Checkins FOR ALL 
    USING (auth.uid() = user_id);

-- Policies for Training_Sessions
CREATE POLICY "Athletes can manage their training sessions" 
    ON public.Training_Sessions FOR ALL 
    USING (auth.uid() = user_id);

-- Trigger to automatically create a user in public.Users when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.Users (id, email, role)
  VALUES (new.id, new.email, 'athlete');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════
-- S&C Planner & Adaptive Nutrition Engine (snake_case)
-- ═══════════════════════════════════════════════════════════════

-- Exercise Library (reference table, no user_id — shared across all users)
CREATE TABLE public.exercise_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('heavy_lift', 'mobility', 'active_recovery')),
    cns_load INTEGER NOT NULL CHECK (cns_load BETWEEN 1 AND 10)
);

-- Daily Timeline (per-user schedule blocks)
CREATE TABLE public.daily_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.Users(id) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    block_type TEXT NOT NULL CHECK (block_type IN ('Boxing', 'S&C', 'Recovery')),
    planned_intensity INTEGER NOT NULL CHECK (planned_intensity BETWEEN 1 AND 10),
    actual_intensity INTEGER CHECK (actual_intensity BETWEEN 1 AND 10),
    status TEXT NOT NULL DEFAULT 'Scheduled'
        CHECK (status IN ('Scheduled', 'Completed', 'Skipped', 'Audible'))
);

-- Macro Ledger (per-user daily nutrition targets)
CREATE TABLE public.macro_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.Users(id) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    base_tdee INTEGER NOT NULL,
    prescribed_calories INTEGER,
    prescribed_protein INTEGER NOT NULL,
    prescribed_fats INTEGER NOT NULL,
    prescribed_carbs INTEGER NOT NULL,
    weight_correction_deficit INTEGER NOT NULL DEFAULT 0,
    target_source TEXT CHECK (target_source IN ('base', 'daily_activity_adjusted', 'weight_cut_protocol')),
    UNIQUE(user_id, date)
);

-- RLS for new tables
ALTER TABLE public.exercise_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.macro_ledger ENABLE ROW LEVEL SECURITY;

-- exercise_library: readable by all authenticated users (shared reference data)
CREATE POLICY "Authenticated users can read exercises"
    ON public.exercise_library FOR SELECT
    USING (auth.role() = 'authenticated');

-- daily_timeline: users manage their own rows
CREATE POLICY "Athletes can manage their own timeline"
    ON public.daily_timeline FOR ALL
    USING (auth.uid() = user_id);

-- macro_ledger: users manage their own rows
CREATE POLICY "Athletes can manage their own macros"
    ON public.macro_ledger FOR ALL
    USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- Nutrition System (Phase 1)
-- ═══════════════════════════════════════════════════════════════

-- Food Items: cached Open Food Facts items (user_id NULL) + custom foods (user_id set)
CREATE TABLE public.food_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.Users(id),
    source TEXT NOT NULL DEFAULT 'custom' CHECK (source IN ('usda', 'open_food_facts', 'custom')),
    source_type TEXT NOT NULL DEFAULT 'custom' CHECK (source_type IN ('ingredient', 'packaged', 'custom')),
    external_id TEXT,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    off_barcode TEXT,
    name TEXT NOT NULL,
    brand TEXT,
    search_text TEXT NOT NULL DEFAULT '',
    base_amount NUMERIC NOT NULL DEFAULT 1,
    base_unit TEXT NOT NULL DEFAULT 'serving',
    grams_per_portion NUMERIC,
    portion_options JSONB NOT NULL DEFAULT '[]'::jsonb,
    serving_size_g NUMERIC NOT NULL DEFAULT 100,
    serving_label TEXT DEFAULT '100g',
    calories_per_serving NUMERIC NOT NULL DEFAULT 0,
    protein_per_serving NUMERIC NOT NULL DEFAULT 0,
    carbs_per_serving NUMERIC NOT NULL DEFAULT 0,
    fat_per_serving NUMERIC NOT NULL DEFAULT 0,
    is_supplement BOOLEAN DEFAULT FALSE,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(off_barcode)
);

CREATE UNIQUE INDEX food_items_source_external_id_key
    ON public.food_items (source, external_id)
    WHERE external_id IS NOT NULL;

-- Food Log: individual food entries per meal
CREATE TABLE public.food_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.Users(id) NOT NULL,
    food_item_id UUID REFERENCES public.food_items(id) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snacks')),
    servings NUMERIC NOT NULL DEFAULT 1,
    amount_value NUMERIC NOT NULL DEFAULT 1,
    amount_unit TEXT NOT NULL DEFAULT 'serving',
    grams NUMERIC,
    source TEXT CHECK (source IN ('usda', 'open_food_facts', 'custom')),
    nutrition_snapshot JSONB,
    logged_calories NUMERIC NOT NULL,
    logged_protein NUMERIC NOT NULL,
    logged_carbs NUMERIC NOT NULL,
    logged_fat NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Daily Nutrition Summary: materialized daily totals
CREATE TABLE public.daily_nutrition_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.Users(id) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_calories NUMERIC NOT NULL DEFAULT 0,
    total_protein NUMERIC NOT NULL DEFAULT 0,
    total_carbs NUMERIC NOT NULL DEFAULT 0,
    total_fat NUMERIC NOT NULL DEFAULT 0,
    total_water_oz NUMERIC NOT NULL DEFAULT 0,
    meal_count INTEGER NOT NULL DEFAULT 0,
    UNIQUE(user_id, date)
);

-- Favorite Foods: quick re-logging
CREATE TABLE public.favorite_foods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.Users(id) NOT NULL,
    food_item_id UUID REFERENCES public.food_items(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, food_item_id)
);

-- Hydration Log: individual water intake entries
CREATE TABLE public.hydration_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.Users(id) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount_oz NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for nutrition tables
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_nutrition_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hydration_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read shared and own food items"
    ON public.food_items FOR SELECT
    USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can insert their own food items"
    ON public.food_items FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own custom foods"
    ON public.food_items FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom foods"
    ON public.food_items FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Athletes can manage their own food log"
    ON public.food_log FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Athletes can manage their own nutrition summary"
    ON public.daily_nutrition_summary FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Athletes can manage their own favorites"
    ON public.favorite_foods FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Athletes can manage their own hydration log"
    ON public.hydration_log FOR ALL
    USING (auth.uid() = user_id);

-- Daily Engine Snapshots: canonical mission/fuel/workout output per user/day
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

CREATE POLICY "Users manage own daily engine snapshots"
    ON public.daily_engine_snapshots FOR ALL
    USING (auth.uid() = user_id);
