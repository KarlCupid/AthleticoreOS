-- ═══════════════════════════════════════════════════════════════
-- Nutrition System Tables (Phase 1)
-- ═══════════════════════════════════════════════════════════════

-- Food Items: cached Open Food Facts items (user_id NULL) + custom foods (user_id set)
CREATE TABLE public.food_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.Users(id),
    off_barcode TEXT,
    name TEXT NOT NULL,
    brand TEXT,
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

-- Food Log: individual food entries per meal
CREATE TABLE public.food_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.Users(id) NOT NULL,
    food_item_id UUID REFERENCES public.food_items(id) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snacks')),
    servings NUMERIC NOT NULL DEFAULT 1,
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

-- ═══════════════════════════════════════════════════════════════
-- ALTER existing tables
-- ═══════════════════════════════════════════════════════════════

-- Athlete_Profiles: add nutrition-related fields
ALTER TABLE public.Athlete_Profiles
    ADD COLUMN IF NOT EXISTS height_inches NUMERIC,
    ADD COLUMN IF NOT EXISTS age INTEGER,
    ADD COLUMN IF NOT EXISTS activity_level TEXT
        CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'very_active', 'extra_active'))
        DEFAULT 'moderate',
    ADD COLUMN IF NOT EXISTS nutrition_goal TEXT
        CHECK (nutrition_goal IN ('maintain', 'cut', 'bulk'))
        DEFAULT 'maintain',
    ADD COLUMN IF NOT EXISTS coach_protein_override INTEGER,
    ADD COLUMN IF NOT EXISTS coach_carbs_override INTEGER,
    ADD COLUMN IF NOT EXISTS coach_fat_override INTEGER,
    ADD COLUMN IF NOT EXISTS coach_calories_override INTEGER;

-- macro_ledger: add actual consumed totals
ALTER TABLE public.macro_ledger
    ADD COLUMN IF NOT EXISTS actual_calories INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS actual_protein INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS actual_carbs INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS actual_fat INTEGER DEFAULT 0;

-- ═══════════════════════════════════════════════════════════════
-- Row Level Security
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_nutrition_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hydration_log ENABLE ROW LEVEL SECURITY;

-- food_items: users can read shared items (user_id IS NULL) + their own custom foods
CREATE POLICY "Users can read shared and own food items"
    ON public.food_items FOR SELECT
    USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can insert shared food items"
    ON public.food_items FOR INSERT
    WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can manage their own custom foods"
    ON public.food_items FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom foods"
    ON public.food_items FOR DELETE
    USING (auth.uid() = user_id);

-- food_log: users manage their own
CREATE POLICY "Athletes can manage their own food log"
    ON public.food_log FOR ALL
    USING (auth.uid() = user_id);

-- daily_nutrition_summary: users manage their own
CREATE POLICY "Athletes can manage their own nutrition summary"
    ON public.daily_nutrition_summary FOR ALL
    USING (auth.uid() = user_id);

-- favorite_foods: users manage their own
CREATE POLICY "Athletes can manage their own favorites"
    ON public.favorite_foods FOR ALL
    USING (auth.uid() = user_id);

-- hydration_log: users manage their own
CREATE POLICY "Athletes can manage their own hydration log"
    ON public.hydration_log FOR ALL
    USING (auth.uid() = user_id);
