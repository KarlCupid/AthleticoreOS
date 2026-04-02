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

  DELETE FROM public.activity_log WHERE user_id = target_user_id;
  DELETE FROM public.scheduled_activities WHERE user_id = target_user_id;
  DELETE FROM public.recurring_activities WHERE user_id = target_user_id;
  DELETE FROM public.weekly_targets WHERE user_id = target_user_id;
  DELETE FROM public.fight_camps WHERE user_id = target_user_id;
  DELETE FROM public.build_phase_goals WHERE user_id = target_user_id;
  DELETE FROM public.daily_engine_snapshots WHERE user_id = target_user_id;

  DELETE FROM public.cut_safety_checks WHERE user_id = target_user_id;
  DELETE FROM public.daily_cut_protocols WHERE user_id = target_user_id;
  DELETE FROM public.weight_cut_history WHERE user_id = target_user_id;

  DELETE FROM public.exercise_pr_log WHERE user_id = target_user_id;
  DELETE FROM public.exercise_overload_history WHERE user_id = target_user_id;
  DELETE FROM public.weekly_plan_entries WHERE user_id = target_user_id;
  DELETE FROM public.weekly_plan_config WHERE user_id = target_user_id;
  DELETE FROM public.gym_profiles WHERE user_id = target_user_id;

  DELETE FROM public.favorite_foods WHERE user_id = target_user_id;
  DELETE FROM public.food_log WHERE user_id = target_user_id;
  DELETE FROM public.daily_nutrition_summary WHERE user_id = target_user_id;
  DELETE FROM public.hydration_log WHERE user_id = target_user_id;

  DELETE FROM public.workout_log WHERE user_id = target_user_id;
  DELETE FROM public.training_sessions WHERE user_id = target_user_id;
  DELETE FROM public.daily_checkins WHERE user_id = target_user_id;
  DELETE FROM public.daily_timeline WHERE user_id = target_user_id;
  DELETE FROM public.macro_ledger WHERE user_id = target_user_id;

  DELETE FROM public.athlete_profiles WHERE user_id = target_user_id;
  DELETE FROM public.weight_cut_plans WHERE user_id = target_user_id;
  DELETE FROM public.food_items WHERE user_id = target_user_id;
  DELETE FROM public.exercise_library WHERE user_id = target_user_id;
  DELETE FROM public.users WHERE id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
