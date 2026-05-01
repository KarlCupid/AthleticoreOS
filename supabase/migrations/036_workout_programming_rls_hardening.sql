-- Workout programming RLS hardening.
-- Static intelligence tables are public read-only. User-specific tables are
-- scoped to auth.uid(), with child tables protected through parent ownership.

CREATE INDEX IF NOT EXISTS idx_generated_workout_exercises_workout
  ON public.generated_workout_exercises(generated_workout_id);

CREATE INDEX IF NOT EXISTS idx_user_constraints_user_created
  ON public.user_constraints(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_readiness_logs_user_created
  ON public.user_readiness_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exercise_completion_results_completion
  ON public.exercise_completion_results(workout_completion_id);

CREATE INDEX IF NOT EXISTS idx_performance_observations_user_created
  ON public.performance_observations(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_progression_decisions_completion
  ON public.progression_decisions(workout_completion_id);

CREATE INDEX IF NOT EXISTS idx_recommendation_events_user_created
  ON public.recommendation_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_programs_user_status
  ON public.user_programs(user_id, status);

CREATE INDEX IF NOT EXISTS idx_protected_workouts_user_day
  ON public.protected_workouts(user_id, day_index);

CREATE INDEX IF NOT EXISTS idx_phase_transitions_user_created
  ON public.phase_transitions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_user_created
  ON public.recommendation_feedback(user_id, created_at DESC);

ALTER TABLE public.progression_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regression_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deload_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.substitution_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.substitution_rule_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_contraindication_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_cue_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.common_mistake_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.description_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_template_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_template_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_phases ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'progression_rules',
    'regression_rules',
    'deload_rules',
    'safety_flags',
    'substitution_rules',
    'substitution_rule_conditions',
    'exercise_contraindication_flags',
    'coaching_cue_sets',
    'common_mistake_sets',
    'description_templates',
    'validation_rules',
    'program_templates',
    'program_template_weeks',
    'program_template_sessions',
    'training_phases'
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

ALTER TABLE public.generated_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_training_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_safety_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_pain_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_readiness_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_exercise_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_completion_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progression_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protected_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_quality_scores ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'generated_workouts'
      AND policyname = 'Users manage own generated workouts'
  ) THEN
    CREATE POLICY "Users manage own generated workouts"
      ON public.generated_workouts FOR ALL
      USING ((select auth.uid()) = user_id)
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'generated_workout_exercises'
      AND policyname = 'Users manage exercises for own generated workouts'
  ) THEN
    CREATE POLICY "Users manage exercises for own generated workouts"
      ON public.generated_workout_exercises FOR ALL
      USING (
        EXISTS (
          SELECT 1
          FROM public.generated_workouts workout
          WHERE workout.id = generated_workout_id
            AND workout.user_id = (select auth.uid())
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.generated_workouts workout
          WHERE workout.id = generated_workout_id
            AND workout.user_id = (select auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_training_profiles'
      AND policyname = 'Users manage own training profile'
  ) THEN
    CREATE POLICY "Users manage own training profile"
      ON public.user_training_profiles FOR ALL
      USING ((select auth.uid()) = user_id)
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_equipment'
      AND policyname = 'Users manage own equipment'
  ) THEN
    CREATE POLICY "Users manage own equipment"
      ON public.user_equipment FOR ALL
      USING ((select auth.uid()) = user_id)
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_constraints'
      AND policyname = 'Users manage own constraints'
  ) THEN
    CREATE POLICY "Users manage own constraints"
      ON public.user_constraints FOR ALL
      USING ((select auth.uid()) = user_id)
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_safety_flags'
      AND policyname = 'Users manage own safety flags'
  ) THEN
    CREATE POLICY "Users manage own safety flags"
      ON public.user_safety_flags FOR ALL
      USING ((select auth.uid()) = user_id)
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_pain_reports'
      AND policyname = 'Users manage own pain reports'
  ) THEN
    CREATE POLICY "Users manage own pain reports"
      ON public.user_pain_reports FOR ALL
      USING ((select auth.uid()) = user_id)
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_readiness_logs'
      AND policyname = 'Users manage own readiness logs'
  ) THEN
    CREATE POLICY "Users manage own readiness logs"
      ON public.user_readiness_logs FOR ALL
      USING ((select auth.uid()) = user_id)
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_exercise_preferences'
      AND policyname = 'Users manage own exercise preferences'
  ) THEN
    CREATE POLICY "Users manage own exercise preferences"
      ON public.user_exercise_preferences FOR ALL
      USING ((select auth.uid()) = user_id)
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workout_completions'
      AND policyname = 'Users manage own workout completions'
  ) THEN
    CREATE POLICY "Users manage own workout completions"
      ON public.workout_completions FOR ALL
      USING ((select auth.uid()) = user_id)
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'exercise_completion_results'
      AND policyname = 'Users manage results for own workout completions'
  ) THEN
    CREATE POLICY "Users manage results for own workout completions"
      ON public.exercise_completion_results FOR ALL
      USING (
        EXISTS (
          SELECT 1
          FROM public.workout_completions completion
          WHERE completion.id = workout_completion_id
            AND completion.user_id = (select auth.uid())
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.workout_completions completion
          WHERE completion.id = workout_completion_id
            AND completion.user_id = (select auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'performance_observations'
      AND policyname = 'Users manage own performance observations'
  ) THEN
    CREATE POLICY "Users manage own performance observations"
      ON public.performance_observations FOR ALL
      USING ((select auth.uid()) = user_id)
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'progression_decisions'
      AND policyname = 'Users manage progression decisions for own completions'
  ) THEN
    CREATE POLICY "Users manage progression decisions for own completions"
      ON public.progression_decisions FOR ALL
      USING (
        EXISTS (
          SELECT 1
          FROM public.workout_completions completion
          WHERE completion.id = workout_completion_id
            AND completion.user_id = (select auth.uid())
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.workout_completions completion
          WHERE completion.id = workout_completion_id
            AND completion.user_id = (select auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'recommendation_events'
      AND policyname = 'Users manage own recommendation events'
  ) THEN
    CREATE POLICY "Users manage own recommendation events"
      ON public.recommendation_events FOR ALL
      USING ((select auth.uid()) = user_id)
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_programs'
      AND policyname = 'Users manage own programs'
  ) THEN
    CREATE POLICY "Users manage own programs"
      ON public.user_programs FOR ALL
      USING ((select auth.uid()) = user_id)
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'protected_workouts'
      AND policyname = 'Users manage own protected workouts'
  ) THEN
    CREATE POLICY "Users manage own protected workouts"
      ON public.protected_workouts FOR ALL
      USING ((select auth.uid()) = user_id)
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'phase_transitions'
      AND policyname = 'Users manage own phase transitions'
  ) THEN
    CREATE POLICY "Users manage own phase transitions"
      ON public.phase_transitions FOR ALL
      USING ((select auth.uid()) = user_id)
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'recommendation_feedback'
      AND policyname = 'Users manage own recommendation feedback'
  ) THEN
    CREATE POLICY "Users manage own recommendation feedback"
      ON public.recommendation_feedback FOR ALL
      USING ((select auth.uid()) = user_id)
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'recommendation_quality_scores'
      AND policyname = 'Users manage own recommendation quality scores'
  ) THEN
    CREATE POLICY "Users manage own recommendation quality scores"
      ON public.recommendation_quality_scores FOR ALL
      USING ((select auth.uid()) = user_id)
      WITH CHECK ((select auth.uid()) = user_id);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
