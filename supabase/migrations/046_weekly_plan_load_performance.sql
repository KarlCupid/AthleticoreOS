-- Weekly plan and training screen load-path performance.
-- The app opens these surfaces frequently, so support the exact date/window
-- ordering used by PostgREST and avoid per-row auth.uid() calls in hot RLS paths.

CREATE INDEX IF NOT EXISTS idx_weekly_plan_entries_user_week_date_slot
  ON public.weekly_plan_entries(user_id, week_start_date, date, slot);

CREATE INDEX IF NOT EXISTS idx_weekly_plan_entries_user_date_slot
  ON public.weekly_plan_entries(user_id, date, slot);

CREATE INDEX IF NOT EXISTS idx_scheduled_activities_user_date_start
  ON public.scheduled_activities(user_id, date, start_time);

CREATE INDEX IF NOT EXISTS idx_workout_log_user_activation_date
  ON public.workout_log(user_id, date DESC)
  WHERE activation_rpe IS NOT NULL;

DROP POLICY IF EXISTS "Athletes manage own profile" ON public.athlete_profiles;
CREATE POLICY "Athletes manage own profile"
  ON public.athlete_profiles FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Athletes manage own checkins" ON public.daily_checkins;
CREATE POLICY "Athletes manage own checkins"
  ON public.daily_checkins FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Athletes manage own sessions" ON public.training_sessions;
CREATE POLICY "Athletes manage own sessions"
  ON public.training_sessions FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Athletes manage own workouts" ON public.workout_log;
CREATE POLICY "Athletes manage own workouts"
  ON public.workout_log FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users own scheduled activities" ON public.scheduled_activities;
CREATE POLICY "Users own scheduled activities"
  ON public.scheduled_activities FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users own fight camps" ON public.fight_camps;
CREATE POLICY "Users own fight camps"
  ON public.fight_camps FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage own gym profiles" ON public.gym_profiles;
CREATE POLICY "Users manage own gym profiles"
  ON public.gym_profiles FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage own weekly config" ON public.weekly_plan_config;
CREATE POLICY "Users manage own weekly config"
  ON public.weekly_plan_config FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users manage own plan entries" ON public.weekly_plan_entries;
CREATE POLICY "Users manage own plan entries"
  ON public.weekly_plan_entries FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users own recurring_activities" ON public.recurring_activities;
CREATE POLICY "Users own recurring_activities"
  ON public.recurring_activities FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users own build_phase_goals" ON public.build_phase_goals;
CREATE POLICY "Users own build_phase_goals"
  ON public.build_phase_goals FOR ALL
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
