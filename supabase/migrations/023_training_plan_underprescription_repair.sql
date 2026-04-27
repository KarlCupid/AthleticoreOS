-- Repair weekly programming persistence, remove stale generated planner state,
-- and seed the S&C resource floor.

ALTER TABLE IF EXISTS public.weekly_plan_config
  ALTER COLUMN available_days SET DEFAULT ARRAY[1,2,3,4,5],
  ALTER COLUMN session_duration_min SET DEFAULT 75;

UPDATE public.weekly_plan_config
SET
  available_days = CASE
    WHEN available_days IS NULL
      OR array_length(available_days, 1) IS NULL
      OR available_days = ARRAY[1,3,5]
      THEN ARRAY[1,2,3,4,5]
    ELSE available_days
  END,
  session_duration_min = CASE
    WHEN session_duration_min IS NULL OR session_duration_min < 75 THEN 75
    ELSE session_duration_min
  END,
  two_a_day_days = COALESCE(two_a_day_days, ARRAY[]::INTEGER[]),
  availability_windows = CASE
    WHEN availability_windows IS NULL OR availability_windows = '[]'::jsonb THEN
      '[
        {"dayOfWeek":1,"startTime":"18:00","endTime":"20:00"},
        {"dayOfWeek":2,"startTime":"18:00","endTime":"20:00"},
        {"dayOfWeek":3,"startTime":"18:00","endTime":"20:00"},
        {"dayOfWeek":4,"startTime":"18:00","endTime":"20:00"},
        {"dayOfWeek":5,"startTime":"18:00","endTime":"20:00"}
      ]'::jsonb
    ELSE availability_windows
  END
WHERE available_days IS NULL
  OR array_length(available_days, 1) IS NULL
  OR available_days = ARRAY[1,3,5]
  OR session_duration_min IS NULL
  OR session_duration_min < 75
  OR two_a_day_days IS NULL
  OR availability_windows IS NULL
  OR availability_windows = '[]'::jsonb;

ALTER TABLE IF EXISTS public.weekly_plan_entries
  ADD COLUMN IF NOT EXISTS day_order INTEGER,
  ADD COLUMN IF NOT EXISTS session_family TEXT CHECK (
    session_family IS NULL OR session_family IN (
      'sparring', 'boxing_skill', 'conditioning', 'strength', 'durability_core', 'recovery', 'rest'
    )
  ),
  ADD COLUMN IF NOT EXISTS sc_session_family TEXT CHECK (
    sc_session_family IS NULL OR sc_session_family IN (
      'max_strength', 'hypertrophy', 'strength_endurance', 'unilateral_strength', 'durability',
      'olympic_lift_power', 'med_ball_power', 'loaded_jump_power', 'contrast_power',
      'low_contact_plyometrics', 'bounding', 'hops', 'lateral_plyometrics', 'depth_drop_progression',
      'acceleration', 'max_velocity', 'hill_sprints', 'resisted_sprints', 'repeated_sprint_ability',
      'aerobic_base', 'tempo', 'threshold', 'hiit', 'sit', 'mixed_intervals', 'sport_round_conditioning',
      'strength_endurance_circuit', 'metabolic_circuit', 'bodyweight_circuit', 'kettlebell_circuit',
      'sled_rope_circuit', 'combat_specific_circuit', 'planned_cod', 'reactive_agility', 'footwork',
      'deceleration', 'mobility_flow', 'tissue_capacity', 'breathwork', 'easy_aerobic_flush'
    )
  ),
  ADD COLUMN IF NOT EXISTS placement_source TEXT CHECK (
    placement_source IS NULL OR placement_source IN ('locked', 'generated', 'carry_forward')
  ),
  ADD COLUMN IF NOT EXISTS progression_intent TEXT,
  ADD COLUMN IF NOT EXISTS carry_forward_reason TEXT,
  ADD COLUMN IF NOT EXISTS session_modules JSONB,
  ADD COLUMN IF NOT EXISTS dose_credits JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS dose_summary JSONB,
  ADD COLUMN IF NOT EXISTS realized_dose_buckets TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS idx_weekly_plan_entries_user_week_family
  ON public.weekly_plan_entries(user_id, week_start_date, session_family);

CREATE INDEX IF NOT EXISTS idx_weekly_plan_entries_sc_family
  ON public.weekly_plan_entries(sc_session_family);

DELETE FROM public.scheduled_activities
WHERE source = 'engine'
  AND status <> 'completed';

DELETE FROM public.weekly_plan_entries
WHERE status <> 'completed'
  AND workout_log_id IS NULL
  AND (
    placement_source IS NULL
    OR prescription_snapshot IS NULL
    OR (
      COALESCE(session_family, session_type) IN ('strength', 'conditioning', 'durability_core', 'recovery', 'sc')
      AND sc_session_family IS NULL
    )
  );

DELETE FROM public.daily_engine_snapshots;

UPDATE public.athlete_profiles
SET athlete_goal_mode = 'build_phase'
WHERE athlete_goal_mode IS NULL OR athlete_goal_mode = 'performance_block';

DO $$
DECLARE
  con_name text;
BEGIN
  FOR con_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'athlete_profiles'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%athlete_goal_mode%'
  LOOP
    EXECUTE format('ALTER TABLE public.athlete_profiles DROP CONSTRAINT %I', con_name);
  END LOOP;
END $$;

ALTER TABLE IF EXISTS public.athlete_profiles
  ADD CONSTRAINT athlete_profiles_athlete_goal_mode_check
  CHECK (athlete_goal_mode IN ('fight_camp', 'build_phase'));

DO $$
DECLARE
  con_name text;
BEGIN
  FOR con_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'athlete_profiles'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%performance_goal_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.athlete_profiles DROP CONSTRAINT %I', con_name);
  END LOOP;
END $$;

ALTER TABLE IF EXISTS public.athlete_profiles
  ADD CONSTRAINT athlete_profiles_performance_goal_type_check
  CHECK (performance_goal_type IN ('strength', 'conditioning', 'boxing_skill', 'weight_class_prep'));

WITH seeds (
  name, type, cns_load, muscle_group, equipment, description, cues, sport_tags,
  movement_pattern, modality, energy_systems, skill_demand, tissue_stress,
  axial_load, impact_level, eccentric_load, youth_suitability, contraindication_tags,
  progression_family, surface_tags, tracking_schema_id, resource_metadata
) AS (
  VALUES
    ('Back Squat', 'heavy_lift', 8, 'quads', 'barbell', 'Primary squat strength pattern.', 'Brace, sit between the hips, and drive evenly through the floor.', ARRAY['combat']::TEXT[], 'squat', 'strength', ARRAY['alactic_power']::TEXT[], 'moderate', 'high', 'high', 'none', 'high', 'coach_required', ARRAY['acute_knee_pain','acute_back_pain']::TEXT[], 'load', ARRAY['gym_floor']::TEXT[], 'schema-strength-v1', '{}'::JSONB),
    ('Trap Bar Deadlift', 'heavy_lift', 7, 'full_body', 'barbell', 'Lower-body strength pull with lower technical barrier than straight-bar pulls.', 'Push the floor away and keep the torso stacked.', ARRAY['combat']::TEXT[], 'hip_hinge', 'strength', ARRAY['alactic_power']::TEXT[], 'moderate', 'high', 'high', 'none', 'moderate', 'coach_required', ARRAY['acute_back_pain']::TEXT[], 'load', ARRAY['gym_floor']::TEXT[], 'schema-strength-v1', '{}'::JSONB),
    ('Med Ball Rotational Throw', 'power', 4, 'full_body', 'medicine_ball', 'Rotational power throw for hip-to-trunk transfer.', 'Load the hip, rotate fast, and release with full intent.', ARRAY['boxing','combat']::TEXT[], 'rotation', 'power', ARRAY['alactic_power']::TEXT[], 'moderate', 'low', 'none', 'none', 'low', 'suitable', ARRAY['acute_shoulder_pain']::TEXT[], 'quality', ARRAY['gym_floor','turf']::TEXT[], 'schema-strength-v1', '{}'::JSONB),
    ('Pogo Jump', 'power', 4, 'calves', 'bodyweight', 'Low-amplitude extensive plyometric contact exposure.', 'Stay tall, keep contacts quiet, and stop if rhythm breaks.', ARRAY['combat']::TEXT[], 'compound', 'plyometric', ARRAY['tissue_capacity']::TEXT[], 'low', 'moderate', 'low', 'moderate', 'moderate', 'suitable', ARRAY['achilles_pain','acute_ankle_pain']::TEXT[], 'contact', ARRAY['turf','gym_floor']::TEXT[], 'schema-plyometric-v1', '{}'::JSONB),
    ('Lateral Bound', 'power', 6, 'glutes', 'bodyweight', 'Lateral plyometric for frontal-plane power and landing quality.', 'Stick the landing before rebounding and keep the knee tracking clean.', ARRAY['combat']::TEXT[], 'lunge', 'plyometric', ARRAY['alactic_capacity']::TEXT[], 'moderate', 'high', 'low', 'high', 'high', 'coach_required', ARRAY['knee_valgus_uncontrolled','acute_knee_pain']::TEXT[], 'contact', ARRAY['grass','turf']::TEXT[], 'schema-plyometric-v1', '{}'::JSONB),
    ('20 m Acceleration Sprint', 'conditioning', 8, 'full_body', 'bodyweight', 'Short acceleration exposure for first-step and drive mechanics.', 'Full recovery between reps and stop when speed drops.', ARRAY['combat','speed']::TEXT[], 'conditioning', 'sprint', ARRAY['alactic_power']::TEXT[], 'high', 'high', 'low', 'high', 'high', 'coach_required', ARRAY['hamstring_pain','low_neural_readiness']::TEXT[], 'meter', ARRAY['track','turf','grass']::TEXT[], 'schema-sprint-v1', '{}'::JSONB),
    ('Hill Sprint', 'conditioning', 7, 'full_body', 'bodyweight', 'Incline sprint exposure that biases acceleration with reduced overstride.', 'Attack the hill, keep posture, and walk back fully recovered.', ARRAY['combat','speed']::TEXT[], 'conditioning', 'sprint', ARRAY['alactic_capacity']::TEXT[], 'moderate', 'moderate', 'low', 'moderate', 'moderate', 'coach_required', ARRAY['hamstring_pain']::TEXT[], 'meter', ARRAY['hill','grass']::TEXT[], 'schema-sprint-v1', '{}'::JSONB),
    ('Assault Bike Interval', 'conditioning', 5, 'full_body', 'machine', 'Low-impact high-output interval option.', 'Drive hard through the work interval and keep cadence honest.', ARRAY['conditioning']::TEXT[], 'conditioning', 'conditioning', ARRAY['glycolytic_power','aerobic_power']::TEXT[], 'low', 'moderate', 'none', 'none', 'low', 'suitable', ARRAY['low_energy_availability']::TEXT[], 'density', ARRAY['bike']::TEXT[], 'schema-hiit-v1', '{}'::JSONB),
    ('Tempo Run', 'conditioning', 4, 'full_body', 'bodyweight', 'Sub-threshold aerobic power and repeatability work.', 'Smooth repeatable pace, never a race.', ARRAY['conditioning']::TEXT[], 'conditioning', 'conditioning', ARRAY['aerobic_power']::TEXT[], 'low', 'moderate', 'low', 'moderate', 'moderate', 'suitable', ARRAY['acute_lower_limb_pain']::TEXT[], 'pace', ARRAY['track','grass']::TEXT[], 'schema-aerobic-tempo-v1', '{}'::JSONB),
    ('Kettlebell Complex', 'conditioning', 5, 'full_body', 'kettlebell', 'Loaded density circuit for strength endurance.', 'Keep hinge mechanics crisp and leave one clean rep in reserve.', ARRAY['conditioning']::TEXT[], 'hip_hinge', 'circuit', ARRAY['local_muscular_endurance','glycolytic_capacity']::TEXT[], 'moderate', 'moderate', 'moderate', 'low', 'moderate', 'coach_required', ARRAY['acute_back_pain']::TEXT[], 'density', ARRAY['gym_floor']::TEXT[], 'schema-circuit-v1', '{}'::JSONB),
    ('Sled Push Circuit', 'conditioning', 6, 'full_body', 'sled', 'Low-skill power endurance circuit option.', 'Stay low, drive the legs, and keep steps powerful.', ARRAY['conditioning']::TEXT[], 'conditioning', 'circuit', ARRAY['glycolytic_capacity']::TEXT[], 'low', 'high', 'low', 'low', 'low', 'suitable', ARRAY['acute_knee_pain']::TEXT[], 'density', ARRAY['sled_lane','turf']::TEXT[], 'schema-circuit-v1', '{}'::JSONB),
    ('Pro Agility Shuttle', 'sport_specific', 6, 'full_body', 'bodyweight', 'Planned change-of-direction drill with acceleration and deceleration demands.', 'Brake under control and re-accelerate without slipping.', ARRAY['agility']::TEXT[], 'sport_specific', 'agility', ARRAY['alactic_capacity']::TEXT[], 'moderate', 'high', 'low', 'high', 'high', 'coach_required', ARRAY['acute_ankle_pain','acute_knee_pain']::TEXT[], 'quality', ARRAY['turf','court']::TEXT[], 'schema-agility-cod-v1', '{}'::JSONB),
    ('Reactive Mirror Drill', 'sport_specific', 5, 'full_body', 'bodyweight', 'Reactive agility drill for perception-action timing.', 'Stay balanced, mirror the cue, and avoid crossing feet under fatigue.', ARRAY['agility','combat']::TEXT[], 'sport_specific', 'agility', ARRAY['alactic_capacity']::TEXT[], 'high', 'moderate', 'low', 'moderate', 'moderate', 'coach_required', ARRAY['balance_concern']::TEXT[], 'quality', ARRAY['turf','court','mat']::TEXT[], 'schema-agility-cod-v1', '{}'::JSONB),
    ('Mobility Flow', 'mobility', 1, 'full_body', 'bodyweight', 'Guided full-body mobility and tissue readiness flow.', 'Move slowly, breathe, and stay below pain.', ARRAY['recovery']::TEXT[], 'mobility', 'mobility', ARRAY['parasympathetic_recovery']::TEXT[], 'low', 'low', 'none', 'none', 'low', 'suitable', ARRAY['pain_flag']::TEXT[], 'range_of_motion', ARRAY['mat']::TEXT[], 'schema-recovery-v1', '{}'::JSONB),
    ('Easy Bike Flush', 'active_recovery', 1, 'full_body', 'machine', 'Easy aerobic recovery flush.', 'Keep breathing nasal and finish feeling better than you started.', ARRAY['recovery']::TEXT[], 'conditioning', 'recovery', ARRAY['aerobic_capacity','parasympathetic_recovery']::TEXT[], 'low', 'low', 'none', 'none', 'none', 'suitable', ARRAY[]::TEXT[], 'pace', ARRAY['bike']::TEXT[], 'schema-aerobic-tempo-v1', '{}'::JSONB)
)
INSERT INTO public.exercise_library (
  name, type, cns_load, muscle_group, equipment, description, cues, sport_tags,
  movement_pattern, modality, energy_systems, skill_demand, tissue_stress,
  axial_load, impact_level, eccentric_load, youth_suitability, contraindication_tags,
  progression_family, surface_tags, tracking_schema_id, resource_metadata
)
SELECT
  name, type, cns_load, muscle_group, equipment, description, cues, sport_tags,
  movement_pattern, modality, energy_systems, skill_demand, tissue_stress,
  axial_load, impact_level, eccentric_load, youth_suitability, contraindication_tags,
  progression_family, surface_tags, tracking_schema_id, resource_metadata
FROM seeds
WHERE NOT EXISTS (
  SELECT 1
  FROM public.exercise_library existing
  WHERE existing.user_id IS NULL
    AND lower(existing.name) = lower(seeds.name)
);
