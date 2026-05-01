-- Workout programming Phases 2-5 persistence surfaces.

CREATE TABLE IF NOT EXISTS public.progression_rules (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    applies_to_goal_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    trigger TEXT NOT NULL,
    action TEXT NOT NULL,
    explanation TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.regression_rules (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    applies_to_goal_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    trigger TEXT NOT NULL,
    action TEXT NOT NULL,
    explanation TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.deload_rules (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    applies_to_goal_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    trigger TEXT NOT NULL,
    action TEXT NOT NULL,
    explanation TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.safety_flags (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'caution', 'restriction', 'block')),
    summary TEXT NOT NULL,
    blocks_hard_training BOOLEAN NOT NULL DEFAULT false,
    contraindication_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.substitution_rules (
    id TEXT PRIMARY KEY,
    source_exercise_id TEXT NOT NULL REFERENCES public.programming_exercises(id) ON DELETE CASCADE,
    substitute_exercise_ids TEXT[] NOT NULL,
    condition_flags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    rationale TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.substitution_rule_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    substitution_rule_id TEXT NOT NULL REFERENCES public.substitution_rules(id) ON DELETE CASCADE,
    flag_id TEXT NOT NULL REFERENCES public.safety_flags(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(substitution_rule_id, flag_id)
);

CREATE TABLE IF NOT EXISTS public.exercise_contraindication_flags (
    exercise_id TEXT NOT NULL REFERENCES public.programming_exercises(id) ON DELETE CASCADE,
    safety_flag_id TEXT NOT NULL REFERENCES public.safety_flags(id),
    PRIMARY KEY (exercise_id, safety_flag_id)
);

CREATE TABLE IF NOT EXISTS public.coaching_cue_sets (
    id TEXT PRIMARY KEY,
    exercise_id TEXT NOT NULL REFERENCES public.programming_exercises(id) ON DELETE CASCADE,
    cues TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.common_mistake_sets (
    id TEXT PRIMARY KEY,
    exercise_id TEXT NOT NULL REFERENCES public.programming_exercises(id) ON DELETE CASCADE,
    mistakes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.description_templates (
    id TEXT PRIMARY KEY,
    applies_to_goal_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    summary_template TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.validation_rules (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('warning', 'error')),
    explanation TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.generated_workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    goal_id TEXT NOT NULL REFERENCES public.training_goals(id),
    template_id TEXT,
    requested_duration_minutes INTEGER NOT NULL,
    estimated_duration_minutes INTEGER NOT NULL,
    safety_flags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    payload JSONB NOT NULL,
    blocked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.generated_workout_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generated_workout_id UUID NOT NULL REFERENCES public.generated_workouts(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL REFERENCES public.programming_exercises(id),
    block_id TEXT NOT NULL,
    prescription JSONB NOT NULL,
    substitutions JSONB NOT NULL DEFAULT '[]'::jsonb,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.user_training_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    experience_level TEXT NOT NULL DEFAULT 'beginner' CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
    preferred_duration_minutes INTEGER NOT NULL DEFAULT 35,
    readiness_band TEXT NOT NULL DEFAULT 'unknown',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_equipment (
    user_id UUID NOT NULL REFERENCES auth.users(id),
    equipment_type_id TEXT NOT NULL REFERENCES public.equipment_types(id),
    PRIMARY KEY (user_id, equipment_type_id)
);

CREATE TABLE IF NOT EXISTS public.user_constraints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    constraint_type TEXT NOT NULL,
    constraint_value TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_safety_flags (
    user_id UUID NOT NULL REFERENCES auth.users(id),
    safety_flag_id TEXT NOT NULL REFERENCES public.safety_flags(id),
    source TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, safety_flag_id)
);

CREATE TABLE IF NOT EXISTS public.user_pain_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    location TEXT NOT NULL,
    severity INTEGER NOT NULL CHECK (severity BETWEEN 0 AND 10),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_readiness_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    readiness_band TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_exercise_preferences (
    user_id UUID NOT NULL REFERENCES auth.users(id),
    exercise_id TEXT NOT NULL REFERENCES public.programming_exercises(id),
    preference TEXT NOT NULL CHECK (preference IN ('like', 'neutral', 'dislike')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, exercise_id)
);

CREATE TABLE IF NOT EXISTS public.workout_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generated_workout_id UUID REFERENCES public.generated_workouts(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    planned_duration_minutes INTEGER NOT NULL,
    actual_duration_minutes INTEGER NOT NULL,
    session_rpe NUMERIC NOT NULL CHECK (session_rpe BETWEEN 1 AND 10),
    pain_score_before INTEGER CHECK (pain_score_before BETWEEN 0 AND 10),
    pain_score_after INTEGER CHECK (pain_score_after BETWEEN 0 AND 10),
    notes TEXT
);

CREATE TABLE IF NOT EXISTS public.exercise_completion_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_completion_id UUID NOT NULL REFERENCES public.workout_completions(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL REFERENCES public.programming_exercises(id),
    sets_completed INTEGER NOT NULL DEFAULT 0,
    reps_completed INTEGER,
    duration_seconds_completed INTEGER,
    load_used NUMERIC,
    actual_rpe NUMERIC CHECK (actual_rpe IS NULL OR actual_rpe BETWEEN 1 AND 10),
    pain_score INTEGER CHECK (pain_score IS NULL OR pain_score BETWEEN 0 AND 10),
    completed_as_prescribed BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.performance_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    observation_kind TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.progression_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_completion_id UUID REFERENCES public.workout_completions(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('progress', 'repeat', 'regress', 'recover')),
    reason TEXT NOT NULL,
    next_adjustment TEXT NOT NULL,
    safety_flags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recommendation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    event_kind TEXT NOT NULL,
    decision_trace JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.program_templates (
    id TEXT PRIMARY KEY,
    goal_id TEXT NOT NULL REFERENCES public.training_goals(id),
    label TEXT NOT NULL,
    summary TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.program_template_weeks (
    id TEXT PRIMARY KEY,
    program_template_id TEXT NOT NULL REFERENCES public.program_templates(id) ON DELETE CASCADE,
    week_index INTEGER NOT NULL CHECK (week_index > 0),
    emphasis TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.program_template_sessions (
    id TEXT PRIMARY KEY,
    program_template_week_id TEXT NOT NULL REFERENCES public.program_template_weeks(id) ON DELETE CASCADE,
    session_template_id TEXT REFERENCES public.session_templates(id),
    day_index INTEGER NOT NULL CHECK (day_index BETWEEN 1 AND 7),
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.training_phases (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    summary TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    goal_id TEXT NOT NULL REFERENCES public.training_goals(id),
    status TEXT NOT NULL DEFAULT 'active',
    started_at DATE NOT NULL DEFAULT CURRENT_DATE,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.protected_workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    label TEXT NOT NULL,
    day_index INTEGER NOT NULL CHECK (day_index BETWEEN 1 AND 7),
    duration_minutes INTEGER NOT NULL,
    intensity TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.phase_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    from_phase TEXT,
    to_phase TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recommendation_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    generated_workout_id UUID REFERENCES public.generated_workouts(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recommendation_quality_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    score NUMERIC NOT NULL CHECK (score BETWEEN 0 AND 100),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generated_workouts_user_created ON public.generated_workouts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workout_completions_user_completed ON public.workout_completions(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_pain_reports_user_created ON public.user_pain_reports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendation_quality_user_created ON public.recommendation_quality_scores(user_id, created_at DESC);
