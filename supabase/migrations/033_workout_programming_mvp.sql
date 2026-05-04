-- Historical workout-programming foundation schema.
-- Static taxonomy/content tables are public read; later forward-only migrations add
-- hardened user-data RLS, atomic RPC persistence, lifecycle, completion surfaces,
-- and telemetry.

CREATE TABLE IF NOT EXISTS public.workout_types (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    summary TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.training_goals (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    summary TEXT NOT NULL,
    default_workout_type_id TEXT NOT NULL REFERENCES public.workout_types(id),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workout_formats (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    summary TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.movement_patterns (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    summary TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.muscle_groups (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    region TEXT NOT NULL CHECK (region IN ('upper', 'lower', 'core', 'full_body')),
    summary TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.equipment_types (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('bodyweight', 'free_weight', 'machine', 'cardio', 'accessory', 'space')),
    summary TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.programming_exercises (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    summary TEXT NOT NULL,
    coaching_summary TEXT NOT NULL,
    min_experience TEXT NOT NULL CHECK (min_experience IN ('beginner', 'intermediate', 'advanced')),
    intensity TEXT NOT NULL CHECK (intensity IN ('recovery', 'low', 'moderate', 'hard')),
    impact TEXT NOT NULL CHECK (impact IN ('none', 'low', 'moderate', 'high')),
    contraindication_flags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    default_prescription_template_id TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exercise_primary_muscles (
    exercise_id TEXT NOT NULL REFERENCES public.programming_exercises(id) ON DELETE CASCADE,
    muscle_group_id TEXT NOT NULL REFERENCES public.muscle_groups(id),
    sort_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (exercise_id, muscle_group_id)
);

CREATE TABLE IF NOT EXISTS public.exercise_secondary_muscles (
    exercise_id TEXT NOT NULL REFERENCES public.programming_exercises(id) ON DELETE CASCADE,
    muscle_group_id TEXT NOT NULL REFERENCES public.muscle_groups(id),
    sort_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (exercise_id, muscle_group_id)
);

CREATE TABLE IF NOT EXISTS public.exercise_equipment (
    exercise_id TEXT NOT NULL REFERENCES public.programming_exercises(id) ON DELETE CASCADE,
    equipment_type_id TEXT NOT NULL REFERENCES public.equipment_types(id),
    requirement_kind TEXT NOT NULL DEFAULT 'compatible' CHECK (requirement_kind IN ('required', 'compatible', 'optional')),
    PRIMARY KEY (exercise_id, equipment_type_id)
);

CREATE TABLE IF NOT EXISTS public.exercise_movement_patterns (
    exercise_id TEXT NOT NULL REFERENCES public.programming_exercises(id) ON DELETE CASCADE,
    movement_pattern_id TEXT NOT NULL REFERENCES public.movement_patterns(id),
    sort_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (exercise_id, movement_pattern_id)
);

CREATE TABLE IF NOT EXISTS public.exercise_workout_types (
    exercise_id TEXT NOT NULL REFERENCES public.programming_exercises(id) ON DELETE CASCADE,
    workout_type_id TEXT NOT NULL REFERENCES public.workout_types(id),
    PRIMARY KEY (exercise_id, workout_type_id)
);

CREATE TABLE IF NOT EXISTS public.exercise_training_goals (
    exercise_id TEXT NOT NULL REFERENCES public.programming_exercises(id) ON DELETE CASCADE,
    training_goal_id TEXT NOT NULL REFERENCES public.training_goals(id),
    PRIMARY KEY (exercise_id, training_goal_id)
);

CREATE TABLE IF NOT EXISTS public.tracking_metrics (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    summary TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assessment_metrics (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    summary TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exercise_tracking_metrics (
    exercise_id TEXT NOT NULL REFERENCES public.programming_exercises(id) ON DELETE CASCADE,
    tracking_metric_id TEXT NOT NULL REFERENCES public.tracking_metrics(id),
    PRIMARY KEY (exercise_id, tracking_metric_id)
);

CREATE TABLE IF NOT EXISTS public.prescription_templates (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    applies_to_workout_type_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    default_sets INTEGER CHECK (default_sets IS NULL OR default_sets > 0),
    default_reps TEXT,
    default_duration_seconds INTEGER CHECK (default_duration_seconds IS NULL OR default_duration_seconds > 0),
    default_duration_minutes INTEGER CHECK (default_duration_minutes IS NULL OR default_duration_minutes > 0),
    default_rpe NUMERIC NOT NULL CHECK (default_rpe >= 1 AND default_rpe <= 10),
    rest_seconds INTEGER NOT NULL CHECK (rest_seconds >= 0),
    tempo TEXT,
    intensity_cue TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.programming_exercises
    ADD CONSTRAINT programming_exercises_default_prescription_fk
    FOREIGN KEY (default_prescription_template_id)
    REFERENCES public.prescription_templates(id)
    DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE IF NOT EXISTS public.session_templates (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    summary TEXT NOT NULL,
    workout_type_id TEXT NOT NULL REFERENCES public.workout_types(id),
    format_id TEXT NOT NULL REFERENCES public.workout_formats(id),
    min_duration_minutes INTEGER NOT NULL CHECK (min_duration_minutes > 0),
    default_duration_minutes INTEGER NOT NULL CHECK (default_duration_minutes > 0),
    max_duration_minutes INTEGER NOT NULL CHECK (max_duration_minutes >= default_duration_minutes),
    experience_levels TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    success_criteria TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.session_template_goals (
    session_template_id TEXT NOT NULL REFERENCES public.session_templates(id) ON DELETE CASCADE,
    training_goal_id TEXT NOT NULL REFERENCES public.training_goals(id),
    PRIMARY KEY (session_template_id, training_goal_id)
);

CREATE TABLE IF NOT EXISTS public.session_template_blocks (
    id TEXT PRIMARY KEY,
    session_template_id TEXT NOT NULL REFERENCES public.session_templates(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('warmup', 'main', 'cooldown')),
    title TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    prescription_template_id TEXT NOT NULL REFERENCES public.prescription_templates(id),
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.session_template_movement_slots (
    id TEXT PRIMARY KEY,
    session_template_id TEXT NOT NULL REFERENCES public.session_templates(id) ON DELETE CASCADE,
    block_id TEXT NOT NULL REFERENCES public.session_template_blocks(id) ON DELETE CASCADE,
    movement_pattern_ids TEXT[] NOT NULL,
    optional BOOLEAN NOT NULL DEFAULT false,
    preferred_exercise_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    avoid_exercise_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_programming_exercises_active
    ON public.programming_exercises(is_active, min_experience, impact);

CREATE INDEX IF NOT EXISTS idx_programming_exercises_contraindications
    ON public.programming_exercises USING gin(contraindication_flags);

CREATE INDEX IF NOT EXISTS idx_exercise_movement_patterns_pattern
    ON public.exercise_movement_patterns(movement_pattern_id, exercise_id);

CREATE INDEX IF NOT EXISTS idx_exercise_equipment_equipment
    ON public.exercise_equipment(equipment_type_id, exercise_id);

CREATE INDEX IF NOT EXISTS idx_session_templates_goal
    ON public.session_template_goals(training_goal_id, session_template_id);

ALTER TABLE public.workout_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_formats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movement_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muscle_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programming_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_primary_muscles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_secondary_muscles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_movement_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_workout_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_training_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_tracking_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_template_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_template_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_template_movement_slots ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'workout_types',
        'training_goals',
        'workout_formats',
        'movement_patterns',
        'muscle_groups',
        'equipment_types',
        'programming_exercises',
        'exercise_primary_muscles',
        'exercise_secondary_muscles',
        'exercise_equipment',
        'exercise_movement_patterns',
        'exercise_workout_types',
        'exercise_training_goals',
        'tracking_metrics',
        'assessment_metrics',
        'exercise_tracking_metrics',
        'prescription_templates',
        'session_templates',
        'session_template_goals',
        'session_template_blocks',
        'session_template_movement_slots'
    ]
    LOOP
        EXECUTE format('CREATE POLICY "Public read %I" ON public.%I FOR SELECT USING (true)', table_name, table_name);
    END LOOP;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;
