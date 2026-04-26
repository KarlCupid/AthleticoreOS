-- Sports-science S&C resources and modality-specific effort logging.

ALTER TABLE public.exercise_library
    ADD COLUMN IF NOT EXISTS modality TEXT CHECK (
        modality IS NULL OR modality IN (
            'strength', 'power', 'plyometric', 'sprint', 'conditioning',
            'circuit', 'agility', 'mobility', 'recovery'
        )
    ),
    ADD COLUMN IF NOT EXISTS energy_systems TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS skill_demand TEXT CHECK (
        skill_demand IS NULL OR skill_demand IN ('low', 'moderate', 'high', 'elite')
    ),
    ADD COLUMN IF NOT EXISTS tissue_stress TEXT CHECK (
        tissue_stress IS NULL OR tissue_stress IN ('low', 'moderate', 'high', 'very_high')
    ),
    ADD COLUMN IF NOT EXISTS axial_load TEXT CHECK (
        axial_load IS NULL OR axial_load IN ('none', 'low', 'moderate', 'high', 'very_high')
    ),
    ADD COLUMN IF NOT EXISTS impact_level TEXT CHECK (
        impact_level IS NULL OR impact_level IN ('none', 'low', 'moderate', 'high', 'very_high')
    ),
    ADD COLUMN IF NOT EXISTS eccentric_load TEXT CHECK (
        eccentric_load IS NULL OR eccentric_load IN ('none', 'low', 'moderate', 'high', 'very_high')
    ),
    ADD COLUMN IF NOT EXISTS youth_suitability TEXT CHECK (
        youth_suitability IS NULL OR youth_suitability IN ('suitable', 'restricted', 'coach_required', 'not_recommended')
    ),
    ADD COLUMN IF NOT EXISTS contraindication_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS progression_family TEXT CHECK (
        progression_family IS NULL OR progression_family IN (
            'load', 'volume', 'contact', 'meter', 'density', 'pace', 'quality', 'range_of_motion'
        )
    ),
    ADD COLUMN IF NOT EXISTS surface_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS tracking_schema_id TEXT,
    ADD COLUMN IF NOT EXISTS resource_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.workout_log
    ADD COLUMN IF NOT EXISTS session_family TEXT,
    ADD COLUMN IF NOT EXISTS primary_modality TEXT CHECK (
        primary_modality IS NULL OR primary_modality IN (
            'strength', 'power', 'plyometric', 'sprint', 'conditioning',
            'circuit', 'agility', 'mobility', 'recovery'
        )
    ),
    ADD COLUMN IF NOT EXISTS energy_system TEXT CHECK (
        energy_system IS NULL OR energy_system IN (
            'alactic_power', 'alactic_capacity', 'glycolytic_power', 'glycolytic_capacity',
            'aerobic_power', 'aerobic_capacity', 'local_muscular_endurance',
            'tissue_capacity', 'parasympathetic_recovery'
        )
    ),
    ADD COLUMN IF NOT EXISTS dose_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS tracking_schema_id TEXT,
    ADD COLUMN IF NOT EXISTS safety_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS sprint_meters NUMERIC,
    ADD COLUMN IF NOT EXISTS plyo_contacts INTEGER,
    ADD COLUMN IF NOT EXISTS hiit_minutes NUMERIC,
    ADD COLUMN IF NOT EXISTS aerobic_minutes NUMERIC,
    ADD COLUMN IF NOT EXISTS circuit_rounds NUMERIC,
    ADD COLUMN IF NOT EXISTS high_impact_count INTEGER,
    ADD COLUMN IF NOT EXISTS tissue_stress_load NUMERIC;

CREATE TABLE IF NOT EXISTS public.workout_effort_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_log_id UUID NOT NULL REFERENCES public.workout_log(id) ON DELETE CASCADE,
    exercise_library_id UUID REFERENCES public.exercise_library(id),
    effort_kind TEXT NOT NULL CHECK (
        effort_kind IN (
            'strength_set', 'plyo_set', 'sprint_rep', 'interval_round',
            'circuit_round', 'aerobic_block', 'agility_rep', 'recovery_block'
        )
    ),
    effort_index INTEGER NOT NULL CHECK (effort_index > 0),
    target_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    actual_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    actual_rpe NUMERIC CHECK (actual_rpe IS NULL OR (actual_rpe >= 1 AND actual_rpe <= 10)),
    quality_rating NUMERIC CHECK (quality_rating IS NULL OR (quality_rating >= 1 AND quality_rating <= 5)),
    pain_flag BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workout_effort_log_workout
    ON public.workout_effort_log(workout_log_id, effort_index);

CREATE INDEX IF NOT EXISTS idx_workout_effort_log_exercise
    ON public.workout_effort_log(exercise_library_id);

ALTER TABLE public.workout_effort_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    CREATE POLICY "Athletes manage own workout effort logs"
        ON public.workout_effort_log FOR ALL
        USING (
            EXISTS (
                SELECT 1
                FROM public.workout_log w
                WHERE w.id = workout_effort_log.workout_log_id
                  AND w.user_id = auth.uid()
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1
                FROM public.workout_log w
                WHERE w.id = workout_effort_log.workout_log_id
                  AND w.user_id = auth.uid()
            )
        );
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;
