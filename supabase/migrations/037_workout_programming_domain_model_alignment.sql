-- Workout programming domain model alignment.
-- Forward-only schema expansion for the richer TypeScript ontology introduced
-- after the MVP workout-programming catalog.

ALTER TABLE public.programming_exercises
  ADD COLUMN IF NOT EXISTS short_name TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS sub_pattern_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS joints_involved TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS plane_of_motion TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS setup_type TEXT,
  ADD COLUMN IF NOT EXISTS technical_complexity TEXT,
  ADD COLUMN IF NOT EXISTS loadability TEXT,
  ADD COLUMN IF NOT EXISTS fatigue_cost TEXT,
  ADD COLUMN IF NOT EXISTS spine_loading TEXT,
  ADD COLUMN IF NOT EXISTS knee_demand TEXT,
  ADD COLUMN IF NOT EXISTS hip_demand TEXT,
  ADD COLUMN IF NOT EXISTS shoulder_demand TEXT,
  ADD COLUMN IF NOT EXISTS wrist_demand TEXT,
  ADD COLUMN IF NOT EXISTS ankle_demand TEXT,
  ADD COLUMN IF NOT EXISTS balance_demand TEXT,
  ADD COLUMN IF NOT EXISTS cardio_demand TEXT,
  ADD COLUMN IF NOT EXISTS space_required TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS home_friendly BOOLEAN,
  ADD COLUMN IF NOT EXISTS gym_friendly BOOLEAN,
  ADD COLUMN IF NOT EXISTS beginner_friendly BOOLEAN,
  ADD COLUMN IF NOT EXISTS setup_instructions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS execution_instructions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS breathing_instructions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS safety_notes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS default_prescription_ranges JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS media JSONB NOT NULL DEFAULT '{}'::JSONB;

CREATE TABLE IF NOT EXISTS public.exercise_progressions (
  exercise_id TEXT NOT NULL REFERENCES public.programming_exercises(id) ON DELETE CASCADE,
  progression_exercise_id TEXT NOT NULL REFERENCES public.programming_exercises(id) ON DELETE CASCADE,
  rationale TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (exercise_id, progression_exercise_id)
);

CREATE TABLE IF NOT EXISTS public.exercise_regressions (
  exercise_id TEXT NOT NULL REFERENCES public.programming_exercises(id) ON DELETE CASCADE,
  regression_exercise_id TEXT NOT NULL REFERENCES public.programming_exercises(id) ON DELETE CASCADE,
  rationale TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (exercise_id, regression_exercise_id)
);

CREATE TABLE IF NOT EXISTS public.exercise_substitution_links (
  exercise_id TEXT NOT NULL REFERENCES public.programming_exercises(id) ON DELETE CASCADE,
  substitute_exercise_id TEXT NOT NULL REFERENCES public.programming_exercises(id) ON DELETE CASCADE,
  condition_flags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  rationale TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (exercise_id, substitute_exercise_id)
);

CREATE TABLE IF NOT EXISTS public.exercise_coaching_cue_links (
  exercise_id TEXT NOT NULL REFERENCES public.programming_exercises(id) ON DELETE CASCADE,
  coaching_cue_set_id TEXT NOT NULL REFERENCES public.coaching_cue_sets(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (exercise_id, coaching_cue_set_id)
);

CREATE TABLE IF NOT EXISTS public.exercise_common_mistake_links (
  exercise_id TEXT NOT NULL REFERENCES public.programming_exercises(id) ON DELETE CASCADE,
  common_mistake_set_id TEXT NOT NULL REFERENCES public.common_mistake_sets(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (exercise_id, common_mistake_set_id)
);

ALTER TABLE public.prescription_templates
  ADD COLUMN IF NOT EXISTS kind TEXT,
  ADD COLUMN IF NOT EXISTS applies_to_goal_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS applies_to_exercise_categories TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS intensity_model TEXT,
  ADD COLUMN IF NOT EXISTS target_intensity JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS volume_model TEXT,
  ADD COLUMN IF NOT EXISTS target_volume JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS rest_model TEXT,
  ADD COLUMN IF NOT EXISTS rest_guidance TEXT,
  ADD COLUMN IF NOT EXISTS tempo_guidance TEXT,
  ADD COLUMN IF NOT EXISTS effort_guidance TEXT,
  ADD COLUMN IF NOT EXISTS prescription_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS progression_rule_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS regression_rule_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS deload_rule_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS success_criteria TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS coach_notes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS user_facing_summary TEXT;

ALTER TABLE public.description_templates
  ADD COLUMN IF NOT EXISTS applies_to_entity_type TEXT,
  ADD COLUMN IF NOT EXISTS applies_to_entity_id TEXT,
  ADD COLUMN IF NOT EXISTS tone_variant TEXT,
  ADD COLUMN IF NOT EXISTS session_intent TEXT,
  ADD COLUMN IF NOT EXISTS plain_language_summary TEXT,
  ADD COLUMN IF NOT EXISTS coach_explanation TEXT,
  ADD COLUMN IF NOT EXISTS effort_explanation TEXT,
  ADD COLUMN IF NOT EXISTS why_this_matters TEXT,
  ADD COLUMN IF NOT EXISTS how_it_should_feel TEXT,
  ADD COLUMN IF NOT EXISTS success_criteria TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS scaling_down TEXT,
  ADD COLUMN IF NOT EXISTS scaling_up TEXT,
  ADD COLUMN IF NOT EXISTS form_focus TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS breathing_focus TEXT,
  ADD COLUMN IF NOT EXISTS common_mistakes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS safety_notes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS recovery_expectation TEXT,
  ADD COLUMN IF NOT EXISTS completion_message TEXT,
  ADD COLUMN IF NOT EXISTS next_session_note TEXT;

ALTER TABLE public.validation_rules
  ADD COLUMN IF NOT EXISTS applies_to_workout_type_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS applies_to_goal_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS failure_condition JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS correction JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS user_facing_message TEXT,
  ADD COLUMN IF NOT EXISTS test_cases JSONB NOT NULL DEFAULT '[]'::JSONB;

ALTER TABLE public.progression_rules
  ADD COLUMN IF NOT EXISTS rule_type TEXT NOT NULL DEFAULT 'progression',
  ADD COLUMN IF NOT EXISTS applies_to_workout_type_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS applies_to_experience_levels TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS trigger_conditions JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS advance_when JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS regress_when JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS progression_action JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS regression_action JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS deload_trigger JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS max_progression_rate JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS safety_override JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS required_tracking_metric_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS user_message TEXT,
  ADD COLUMN IF NOT EXISTS coach_notes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE public.regression_rules
  ADD COLUMN IF NOT EXISTS rule_type TEXT NOT NULL DEFAULT 'regression',
  ADD COLUMN IF NOT EXISTS applies_to_workout_type_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS applies_to_experience_levels TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS trigger_conditions JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS advance_when JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS regress_when JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS progression_action JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS regression_action JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS deload_trigger JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS max_progression_rate JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS safety_override JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS required_tracking_metric_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS user_message TEXT,
  ADD COLUMN IF NOT EXISTS coach_notes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE public.deload_rules
  ADD COLUMN IF NOT EXISTS rule_type TEXT NOT NULL DEFAULT 'deload',
  ADD COLUMN IF NOT EXISTS applies_to_workout_type_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS applies_to_experience_levels TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS trigger_conditions JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS advance_when JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS regress_when JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS progression_action JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS regression_action JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS deload_trigger JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS max_progression_rate JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS safety_override JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS required_tracking_metric_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS user_message TEXT,
  ADD COLUMN IF NOT EXISTS coach_notes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE public.safety_flags
  ADD COLUMN IF NOT EXISTS applies_to_workout_type_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS applies_to_goal_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS applies_to_exercise_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS affected_joint_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS affected_movement_pattern_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS requires_professional_review BOOLEAN,
  ADD COLUMN IF NOT EXISTS unknown_data_handling TEXT,
  ADD COLUMN IF NOT EXISTS user_facing_message TEXT,
  ADD COLUMN IF NOT EXISTS coach_notes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS idx_programming_exercises_category_experience
  ON public.programming_exercises(category, min_experience);

CREATE INDEX IF NOT EXISTS idx_programming_exercises_technical_complexity
  ON public.programming_exercises(technical_complexity, fatigue_cost);

CREATE INDEX IF NOT EXISTS idx_programming_exercises_demands
  ON public.programming_exercises(knee_demand, hip_demand, shoulder_demand, cardio_demand);

CREATE INDEX IF NOT EXISTS idx_programming_exercises_sub_patterns
  ON public.programming_exercises USING gin(sub_pattern_ids);

CREATE INDEX IF NOT EXISTS idx_programming_exercises_joints
  ON public.programming_exercises USING gin(joints_involved);

CREATE INDEX IF NOT EXISTS idx_programming_exercises_plane
  ON public.programming_exercises USING gin(plane_of_motion);

CREATE INDEX IF NOT EXISTS idx_programming_exercises_space
  ON public.programming_exercises USING gin(space_required);

CREATE INDEX IF NOT EXISTS idx_programming_exercises_prescription_ranges
  ON public.programming_exercises USING gin(default_prescription_ranges);

CREATE INDEX IF NOT EXISTS idx_exercise_workout_types_workout_type
  ON public.exercise_workout_types(workout_type_id, exercise_id);

CREATE INDEX IF NOT EXISTS idx_exercise_training_goals_goal
  ON public.exercise_training_goals(training_goal_id, exercise_id);

CREATE INDEX IF NOT EXISTS idx_exercise_progressions_progression
  ON public.exercise_progressions(progression_exercise_id, exercise_id);

CREATE INDEX IF NOT EXISTS idx_exercise_regressions_regression
  ON public.exercise_regressions(regression_exercise_id, exercise_id);

CREATE INDEX IF NOT EXISTS idx_exercise_substitution_links_substitute
  ON public.exercise_substitution_links(substitute_exercise_id, exercise_id);

CREATE INDEX IF NOT EXISTS idx_exercise_substitution_links_flags
  ON public.exercise_substitution_links USING gin(condition_flags);

CREATE INDEX IF NOT EXISTS idx_exercise_coaching_cue_links_set
  ON public.exercise_coaching_cue_links(coaching_cue_set_id, exercise_id);

CREATE INDEX IF NOT EXISTS idx_exercise_common_mistake_links_set
  ON public.exercise_common_mistake_links(common_mistake_set_id, exercise_id);

CREATE INDEX IF NOT EXISTS idx_prescription_templates_intensity_model
  ON public.prescription_templates(intensity_model);

CREATE INDEX IF NOT EXISTS idx_prescription_templates_kind
  ON public.prescription_templates(kind);

CREATE INDEX IF NOT EXISTS idx_prescription_templates_goal_ids
  ON public.prescription_templates USING gin(applies_to_goal_ids);

CREATE INDEX IF NOT EXISTS idx_prescription_templates_exercise_categories
  ON public.prescription_templates USING gin(applies_to_exercise_categories);

CREATE INDEX IF NOT EXISTS idx_prescription_templates_volume_model
  ON public.prescription_templates(volume_model);

CREATE INDEX IF NOT EXISTS idx_prescription_templates_rule_ids
  ON public.prescription_templates USING gin(progression_rule_ids);

CREATE INDEX IF NOT EXISTS idx_prescription_templates_regression_rule_ids
  ON public.prescription_templates USING gin(regression_rule_ids);

CREATE INDEX IF NOT EXISTS idx_prescription_templates_deload_rule_ids
  ON public.prescription_templates USING gin(deload_rule_ids);

CREATE INDEX IF NOT EXISTS idx_prescription_templates_payload
  ON public.prescription_templates USING gin(prescription_payload);

CREATE INDEX IF NOT EXISTS idx_description_templates_entity
  ON public.description_templates(applies_to_entity_type, applies_to_entity_id);

CREATE INDEX IF NOT EXISTS idx_validation_rules_workout_types
  ON public.validation_rules USING gin(applies_to_workout_type_ids);

CREATE INDEX IF NOT EXISTS idx_validation_rules_goals
  ON public.validation_rules USING gin(applies_to_goal_ids);

CREATE INDEX IF NOT EXISTS idx_validation_rules_failure_condition
  ON public.validation_rules USING gin(failure_condition);

CREATE INDEX IF NOT EXISTS idx_progression_rules_structured_filters
  ON public.progression_rules USING gin(applies_to_workout_type_ids);

CREATE INDEX IF NOT EXISTS idx_progression_rules_goal_filters
  ON public.progression_rules USING gin(applies_to_goal_ids);

CREATE INDEX IF NOT EXISTS idx_progression_rules_tracking_filters
  ON public.progression_rules USING gin(required_tracking_metric_ids);

CREATE INDEX IF NOT EXISTS idx_progression_rules_conditions
  ON public.progression_rules USING gin(trigger_conditions);

CREATE INDEX IF NOT EXISTS idx_regression_rules_structured_filters
  ON public.regression_rules USING gin(applies_to_workout_type_ids);

CREATE INDEX IF NOT EXISTS idx_regression_rules_goal_filters
  ON public.regression_rules USING gin(applies_to_goal_ids);

CREATE INDEX IF NOT EXISTS idx_regression_rules_tracking_filters
  ON public.regression_rules USING gin(required_tracking_metric_ids);

CREATE INDEX IF NOT EXISTS idx_regression_rules_conditions
  ON public.regression_rules USING gin(trigger_conditions);

CREATE INDEX IF NOT EXISTS idx_deload_rules_structured_filters
  ON public.deload_rules USING gin(applies_to_workout_type_ids);

CREATE INDEX IF NOT EXISTS idx_deload_rules_goal_filters
  ON public.deload_rules USING gin(applies_to_goal_ids);

CREATE INDEX IF NOT EXISTS idx_deload_rules_tracking_filters
  ON public.deload_rules USING gin(required_tracking_metric_ids);

CREATE INDEX IF NOT EXISTS idx_deload_rules_conditions
  ON public.deload_rules USING gin(trigger_conditions);

CREATE INDEX IF NOT EXISTS idx_safety_flags_contraindication_tags
  ON public.safety_flags USING gin(contraindication_tags);

CREATE INDEX IF NOT EXISTS idx_safety_flags_workout_types
  ON public.safety_flags USING gin(applies_to_workout_type_ids);

CREATE INDEX IF NOT EXISTS idx_safety_flags_goals
  ON public.safety_flags USING gin(applies_to_goal_ids);

CREATE INDEX IF NOT EXISTS idx_safety_flags_exercises
  ON public.safety_flags USING gin(applies_to_exercise_ids);

CREATE INDEX IF NOT EXISTS idx_safety_flags_movement_patterns
  ON public.safety_flags USING gin(affected_movement_pattern_ids);

ALTER TABLE public.exercise_progressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_regressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_substitution_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_coaching_cue_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_common_mistake_links ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'exercise_progressions',
    'exercise_regressions',
    'exercise_substitution_links',
    'exercise_coaching_cue_links',
    'exercise_common_mistake_links'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = table_name
        AND policyname = format('Public read %I', table_name)
    ) THEN
      EXECUTE format('CREATE POLICY "Public read %I" ON public.%I FOR SELECT USING (true)', table_name, table_name);
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
