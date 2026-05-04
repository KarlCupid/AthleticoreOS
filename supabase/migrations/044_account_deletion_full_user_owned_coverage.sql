-- Privacy-critical account deletion hardening.
-- Forward-only replacement for delete_my_account() that covers every
-- user-owned table introduced through the workout-programming migrations.

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  target_user_id uuid := auth.uid();
BEGIN
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user required';
  END IF;

  -- Remove nullable cross-user references that would otherwise block the
  -- public user mirror row. This does not expose or delete another user's data.
  UPDATE public.athlete_profiles
  SET coach_id = NULL
  WHERE coach_id = target_user_id;

  UPDATE public.athlete_profiles
  SET active_weight_class_plan_id = NULL
  WHERE active_weight_class_plan_id IN (
    SELECT id FROM public.weight_class_plans WHERE user_id = target_user_id
  );

  UPDATE public.weekly_plan_config
  SET preferred_gym_profile_id = NULL
  WHERE preferred_gym_profile_id IN (
    SELECT id FROM public.gym_profiles WHERE user_id = target_user_id
  );

  UPDATE public.workout_log
  SET timeline_block_id = NULL
  WHERE timeline_block_id IN (
    SELECT id FROM public.daily_timeline WHERE user_id = target_user_id
  );

  UPDATE public.scheduled_activities
  SET recurring_activity_id = NULL
  WHERE recurring_activity_id IN (
    SELECT id FROM public.recurring_activities WHERE user_id = target_user_id
  );

  UPDATE public.workout_effort_log
  SET exercise_library_id = NULL
  WHERE exercise_library_id IN (
    SELECT id FROM public.exercise_library WHERE user_id = target_user_id
  );

  -- Workout-programming generated workout, completion, program, and telemetry
  -- surfaces. Child rows are removed before their owned parents.
  DELETE FROM public.generated_workout_session_lifecycle
  WHERE user_id = target_user_id;

  DELETE FROM public.generated_workout_exercises
  WHERE generated_workout_id IN (
    SELECT id FROM public.generated_workouts WHERE user_id = target_user_id
  );

  DELETE FROM public.exercise_completion_results
  WHERE workout_completion_id IN (
    SELECT id FROM public.workout_completions WHERE user_id = target_user_id
  );

  DELETE FROM public.progression_decisions
  WHERE workout_completion_id IN (
    SELECT id FROM public.workout_completions WHERE user_id = target_user_id
  );

  DELETE FROM public.recommendation_feedback WHERE user_id = target_user_id;
  DELETE FROM public.recommendation_events WHERE user_id = target_user_id;
  DELETE FROM public.workout_completions WHERE user_id = target_user_id;
  DELETE FROM public.generated_workouts WHERE user_id = target_user_id;

  DELETE FROM public.recommendation_quality_scores WHERE user_id = target_user_id;
  DELETE FROM public.performance_observations WHERE user_id = target_user_id;
  DELETE FROM public.phase_transitions WHERE user_id = target_user_id;
  DELETE FROM public.protected_workouts WHERE user_id = target_user_id;
  DELETE FROM public.user_programs WHERE user_id = target_user_id;
  DELETE FROM public.user_exercise_preferences WHERE user_id = target_user_id;
  DELETE FROM public.user_safety_flags WHERE user_id = target_user_id;
  DELETE FROM public.user_equipment WHERE user_id = target_user_id;
  DELETE FROM public.user_constraints WHERE user_id = target_user_id;
  DELETE FROM public.user_pain_reports WHERE user_id = target_user_id;
  DELETE FROM public.user_readiness_logs WHERE user_id = target_user_id;
  DELETE FROM public.user_training_profiles WHERE user_id = target_user_id;

  -- Legacy and current S&C workout logs. Effort/set children must go before
  -- workout_log because they also reference exercise_library rows.
  DELETE FROM public.workout_effort_log
  WHERE workout_log_id IN (
    SELECT id FROM public.workout_log WHERE user_id = target_user_id
  );

  DELETE FROM public.workout_set_log
  WHERE workout_log_id IN (
    SELECT id FROM public.workout_log WHERE user_id = target_user_id
  );

  DELETE FROM public.exercise_pr_log WHERE user_id = target_user_id;
  DELETE FROM public.exercise_overload_history WHERE user_id = target_user_id;
  DELETE FROM public.weekly_plan_entries WHERE user_id = target_user_id;
  DELETE FROM public.weekly_plan_config WHERE user_id = target_user_id;
  DELETE FROM public.gym_profiles WHERE user_id = target_user_id;
  DELETE FROM public.workout_log WHERE user_id = target_user_id;

  -- Schedule, training, nutrition, body-mass, and journey state.
  DELETE FROM public.activity_log WHERE user_id = target_user_id;
  DELETE FROM public.scheduled_activities WHERE user_id = target_user_id;
  DELETE FROM public.recurring_activities WHERE user_id = target_user_id;
  DELETE FROM public.weekly_targets WHERE user_id = target_user_id;
  DELETE FROM public.fight_camps WHERE user_id = target_user_id;
  DELETE FROM public.build_phase_goals WHERE user_id = target_user_id;

  DELETE FROM public.favorite_foods WHERE user_id = target_user_id;
  DELETE FROM public.food_log WHERE user_id = target_user_id;
  DELETE FROM public.daily_nutrition_summary WHERE user_id = target_user_id;
  DELETE FROM public.hydration_log WHERE user_id = target_user_id;

  DELETE FROM public.body_mass_safety_checks WHERE user_id = target_user_id;
  DELETE FROM public.weight_class_history WHERE user_id = target_user_id;

  DELETE FROM public.training_sessions WHERE user_id = target_user_id;
  DELETE FROM public.daily_checkins WHERE user_id = target_user_id;
  DELETE FROM public.daily_timeline WHERE user_id = target_user_id;
  DELETE FROM public.macro_ledger WHERE user_id = target_user_id;

  DELETE FROM public.user_walkthrough_state WHERE user_id = target_user_id;
  DELETE FROM public.athlete_profiles WHERE user_id = target_user_id;
  DELETE FROM public.weight_class_plans WHERE user_id = target_user_id;
  DELETE FROM public.performance_engine_migration_archive WHERE user_id = target_user_id;

  DELETE FROM public.food_items WHERE user_id = target_user_id;
  DELETE FROM public.exercise_library WHERE user_id = target_user_id;

  DELETE FROM public.users WHERE id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

NOTIFY pgrst, 'reload schema';
