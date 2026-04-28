-- ═══════════════════════════════════════════════════════════════
-- Weight Cut System (Phase 1 — Core Tables)
-- ═══════════════════════════════════════════════════════════════

-- Weight Cut Plans: master record per active cut
CREATE TABLE public.weight_cut_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.Users(id) NOT NULL,

    -- Target
    start_weight NUMERIC NOT NULL,
    target_weight NUMERIC NOT NULL,
    weight_class_name TEXT,
    sport TEXT CHECK (sport IN ('boxing', 'mma')) DEFAULT 'mma',

    -- Timeline
    fight_date DATE NOT NULL,
    weigh_in_date DATE NOT NULL,
    plan_created_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Configuration
    fight_status TEXT NOT NULL CHECK (fight_status IN ('amateur', 'pro')),
    max_water_cut_pct NUMERIC NOT NULL,
    total_cut_lbs NUMERIC NOT NULL,
    diet_phase_target_lbs NUMERIC NOT NULL,
    water_cut_allocation_lbs NUMERIC NOT NULL,

    -- Phase date boundaries (computed by engine, stored for display)
    chronic_phase_start DATE,
    chronic_phase_end DATE,
    intensified_phase_start DATE,
    intensified_phase_end DATE,
    fight_week_start DATE,
    weigh_in_day DATE,
    rehydration_start DATE,

    -- Status
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'completed', 'abandoned', 'paused')),
    completed_at TIMESTAMPTZ,

    -- Safety envelope
    safe_weekly_loss_rate NUMERIC NOT NULL,
    calorie_floor INTEGER NOT NULL,
    baseline_cognitive_score INTEGER,

    -- Notes
    coach_notes TEXT,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Cut Safety Checks: fight-week enhanced vitals
CREATE TABLE public.cut_safety_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.Users(id) NOT NULL,
    plan_id UUID REFERENCES public.weight_cut_plans(id) NOT NULL,
    date DATE NOT NULL,

    -- Subjective vitals
    urine_color INTEGER CHECK (urine_color BETWEEN 1 AND 8),
    body_temp_f NUMERIC,
    cognitive_score INTEGER,
    mood_rating INTEGER CHECK (mood_rating BETWEEN 1 AND 5),

    -- Physical symptoms
    dizziness BOOLEAN DEFAULT FALSE,
    headache BOOLEAN DEFAULT FALSE,
    muscle_cramps BOOLEAN DEFAULT FALSE,

    -- Rehydration tracking (post weigh-in)
    post_weigh_in_weight NUMERIC,
    rehydration_weight_regained NUMERIC,

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, date)
);

-- Weight Cut History: completed cut summaries for longitudinal learning
CREATE TABLE public.weight_cut_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.Users(id) NOT NULL,
    plan_id UUID REFERENCES public.weight_cut_plans(id) NOT NULL,

    -- Outcome
    start_weight NUMERIC NOT NULL,
    final_weigh_in_weight NUMERIC,
    target_weight NUMERIC NOT NULL,
    made_weight BOOLEAN,

    -- Performance metrics
    total_duration_days INTEGER,
    total_diet_loss_lbs NUMERIC,
    total_water_cut_lbs NUMERIC,
    avg_weekly_loss_rate NUMERIC,
    rehydration_weight_regained NUMERIC,
    fight_day_weight NUMERIC,

    -- Adherence
    protocol_adherence_pct NUMERIC,
    refeed_days_used INTEGER,
    diet_breaks_used INTEGER,
    safety_flags_triggered JSONB DEFAULT '[]',

    -- Timing
    fight_date DATE,
    completed_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- ALTER existing tables
-- ═══════════════════════════════════════════════════════════════

-- Athlete_Profiles: add weight cut link + weight class
ALTER TABLE public.Athlete_Profiles
    ADD COLUMN IF NOT EXISTS active_cut_plan_id UUID REFERENCES public.weight_cut_plans(id),
    ADD COLUMN IF NOT EXISTS weight_class TEXT,
    ADD COLUMN IF NOT EXISTS fight_date DATE,
    ADD COLUMN IF NOT EXISTS sport TEXT CHECK (sport IN ('boxing', 'mma')) DEFAULT 'mma';

-- Daily_Checkins: add fight-week enhanced fields
ALTER TABLE public.Daily_Checkins
    ADD COLUMN IF NOT EXISTS urine_color INTEGER CHECK (urine_color BETWEEN 1 AND 8),
    ADD COLUMN IF NOT EXISTS body_temp_f NUMERIC,
    ADD COLUMN IF NOT EXISTS cognitive_score INTEGER,
    ADD COLUMN IF NOT EXISTS mood_rating INTEGER CHECK (mood_rating BETWEEN 1 AND 5);

-- macro_ledger: add cut phase + sodium tracking
ALTER TABLE public.macro_ledger
    ADD COLUMN IF NOT EXISTS cut_phase TEXT,
    ADD COLUMN IF NOT EXISTS sodium_target_mg INTEGER,
    ADD COLUMN IF NOT EXISTS is_refeed_day BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_carb_cycle_high BOOLEAN DEFAULT FALSE;

-- ═══════════════════════════════════════════════════════════════
-- Row Level Security
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.weight_cut_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cut_safety_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_cut_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes can manage their own cut plans"
    ON public.weight_cut_plans FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Athletes can manage their own safety checks"
    ON public.cut_safety_checks FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Athletes can manage their own cut history"
    ON public.weight_cut_history FOR ALL
    USING (auth.uid() = user_id);
