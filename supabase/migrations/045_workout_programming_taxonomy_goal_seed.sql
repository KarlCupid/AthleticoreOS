-- Keep the database taxonomy aligned with the generated-program goal ids used
-- by the boxing-first workout engine. Generated programs persist goal_id through
-- public.user_programs, so these canonical parent rows must exist before
-- onboarding can save the first mission.

INSERT INTO public.workout_types (id, label, summary, sort_order)
VALUES
  ('strength', 'Strength', 'Force production with controlled rest and technically crisp sets.', 1),
  ('hypertrophy', 'Hypertrophy', 'Muscle-building volume with moderate load and repeatable effort.', 2),
  ('zone2_cardio', 'Zone 2 Cardio', 'Easy aerobic work that supports recovery and repeatability.', 3),
  ('mobility', 'Mobility', 'Controlled range-of-motion work without chasing fatigue.', 4),
  ('recovery', 'Recovery', 'Low-stress work that downshifts the system and tracks symptoms.', 5),
  ('conditioning', 'Conditioning', 'Structured intervals or circuits with explicit density.', 6),
  ('power', 'Power', 'Explosive low-volume work that prioritizes speed and quality.', 7),
  ('core_durability', 'Core Durability', 'Trunk control, bracing, anti-rotation, and carry capacity.', 8),
  ('upper_strength', 'Upper Strength', 'Upper-body push and pull strength work.', 9),
  ('lower_strength', 'Lower Strength', 'Lower-body squat, hinge, and unilateral strength work.', 10),
  ('full_body_strength', 'Full-Body Strength', 'Balanced strength exposure for the whole body.', 11),
  ('low_impact_conditioning', 'Low-Impact Conditioning', 'Conditioning that avoids jumping and hard landings.', 12),
  ('bodyweight_strength', 'Bodyweight Strength', 'Strength work using body mass and simple supports.', 13),
  ('boxing_support', 'Boxing Support', 'S&C support for punch mechanics, footwork, and trunk resilience.', 14),
  ('boxing_progression', 'Boxing Progression', 'Low-risk technical movement, shadowboxing, footwork, and rhythm support.', 15),
  ('roadwork_tempo', 'Roadwork Tempo', 'Controlled aerobic power and pacing work.', 16),
  ('roadwork_intervals', 'Roadwork Intervals', 'High-control running intervals for athletes ready for the dose.', 17),
  ('boxing_conditioning_support', 'Boxing Conditioning Support', 'Conditioning that supports boxing rounds without generating sparring.', 18),
  ('boxing_durability', 'Boxing Durability', 'Trunk, shoulder, hip, ankle, neck/trap-adjacent, and hand/wrist durability support.', 19),
  ('assessment', 'Assessment', 'Repeatable measures of strength, conditioning, mobility, and symptoms.', 20)
ON CONFLICT (id) DO UPDATE
SET label = EXCLUDED.label,
    summary = EXCLUDED.summary,
    sort_order = EXCLUDED.sort_order;

INSERT INTO public.training_goals (id, label, summary, default_workout_type_id, sort_order)
VALUES
  ('beginner_strength', 'Beginner Strength', 'Build basic full-body strength safely.', 'strength', 1),
  ('hypertrophy', 'Hypertrophy', 'Accumulate muscle-building volume.', 'hypertrophy', 2),
  ('zone2_cardio', 'Zone 2 Cardio', 'Improve aerobic base at conversational effort.', 'zone2_cardio', 3),
  ('mobility', 'Mobility', 'Improve usable range and movement comfort.', 'mobility', 4),
  ('recovery', 'Recovery', 'Restore readiness with low stress.', 'recovery', 5),
  ('limited_equipment', 'Limited Equipment', 'Train effectively with a small equipment footprint.', 'strength', 6),
  ('no_equipment', 'No Equipment', 'Generate a safe bodyweight-only session.', 'bodyweight_strength', 7),
  ('full_gym_strength', 'Full-Gym Strength', 'Use gym equipment for balanced strength.', 'full_body_strength', 8),
  ('dumbbell_hypertrophy', 'Dumbbell Hypertrophy', 'Build muscle with dumbbells and benches.', 'hypertrophy', 9),
  ('low_impact_conditioning', 'Low-Impact Conditioning', 'Condition without running or jumping.', 'low_impact_conditioning', 10),
  ('core_durability', 'Core Durability', 'Improve trunk control and fatigue resistance.', 'core_durability', 11),
  ('upper_body_strength', 'Upper Body Strength', 'Bias presses, rows, and shoulder stability.', 'upper_strength', 12),
  ('lower_body_strength', 'Lower Body Strength', 'Bias squat, hinge, and single-leg patterns.', 'lower_strength', 13),
  ('boxing_support', 'Boxing Support', 'Support boxing with trunk, shoulder, and conditioning work.', 'boxing_support', 14),
  ('boxing_progression', 'Boxing Progression', 'Low-contact boxing fundamentals, rhythm, positioning, and movement quality.', 'boxing_progression', 15),
  ('boxing_skill_microdose', 'Boxing Skill Microdose', 'Short low-risk stance, rhythm, guard, breathing, and movement quality practice.', 'boxing_progression', 16),
  ('footwork_agility', 'Footwork Agility', 'Boxing footwork, stance resets, pivots, balance, and ankle/hip capacity.', 'boxing_progression', 17),
  ('shadowboxing_quality', 'Shadowboxing Quality', 'Low-contact self-guided shadowboxing for posture, rhythm, breathing, and foot placement.', 'boxing_progression', 18),
  ('roadwork_aerobic_base', 'Roadwork Aerobic Base', 'Easy roadwork that supports repeat-round recovery.', 'zone2_cardio', 19),
  ('roadwork_tempo', 'Roadwork Tempo', 'Controlled tempo work for pacing durability.', 'roadwork_tempo', 20),
  ('roadwork_intervals', 'Roadwork Intervals', 'Structured running intervals used only when readiness and load allow.', 'roadwork_intervals', 21),
  ('alactic_repeat_power', 'Alactic Repeat Power', 'Short repeat-output work for boxing bursts without reckless fatigue.', 'boxing_conditioning_support', 22),
  ('glycolytic_round_tolerance', 'Glycolytic Round Tolerance', 'Controlled round-tolerance conditioning for prepared athletes.', 'boxing_conditioning_support', 23),
  ('explosive_power', 'Explosive Power', 'Low-volume explosive qualities that support boxing without speed loss.', 'power', 24),
  ('rotational_power', 'Rotational Power', 'Hip-to-trunk power transfer for boxing support.', 'boxing_support', 25),
  ('trunk_rotation_durability', 'Trunk Rotation Durability', 'Rotation and anti-rotation capacity for boxing posture and force transfer.', 'core_durability', 26),
  ('shoulder_scap_durability', 'Shoulder/Scap Durability', 'Shoulder blade and rotator-cuff support for frequent boxing exposure.', 'boxing_durability', 27),
  ('neck_trap_durability', 'Neck/Trap Durability', 'Conservative neck and trap-adjacent durability where safe content exists.', 'boxing_durability', 28),
  ('hip_footwork_durability', 'Hip Footwork Durability', 'Hip, ankle, calf, and foot support for boxing movement frequency.', 'boxing_durability', 29),
  ('hip_ankle_mobility', 'Hip/Ankle Mobility', 'Hip, ankle, calf, adductor, and foot control for boxing stance changes.', 'boxing_durability', 30),
  ('mobility_prehab', 'Mobility/Prehab', 'Low-load mobility and prehab support for the boxing athletic chain.', 'boxing_durability', 31),
  ('recovery_reset', 'Recovery Reset', 'Readiness-preserving recovery work for boxing training weeks.', 'recovery', 32),
  ('return_to_training', 'Return to Training', 'Re-enter training with conservative stress.', 'recovery', 33)
ON CONFLICT (id) DO UPDATE
SET label = EXCLUDED.label,
    summary = EXCLUDED.summary,
    default_workout_type_id = EXCLUDED.default_workout_type_id,
    sort_order = EXCLUDED.sort_order;
