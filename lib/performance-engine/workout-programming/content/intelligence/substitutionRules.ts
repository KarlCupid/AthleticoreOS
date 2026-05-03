import type { SubstitutionRule } from '../../types.ts';

export const substitutionRules = [
  {
    "id": "sub_back_squat_dumbbell_or_knee",
    "sourceExerciseId": "barbell_back_squat",
    "sourceMovementPatternIds": [
      "squat"
    ],
    "acceptableReplacementIds": [
      "goblet_squat",
      "box_squat",
      "leg_press",
      "bodyweight_squat"
    ],
    "replacementPriority": [
      "goblet_squat",
      "box_squat",
      "leg_press",
      "bodyweight_squat"
    ],
    "reason": "Keeps a squat-dominant lower-body stimulus when a rack is unavailable or knee range needs tighter control.",
    "requiredEquipmentIds": [],
    "supportedSafetyFlags": [
      "equipment_limited",
      "knee_caution",
      "limited_space"
    ],
    "excludedSafetyFlags": [
      "no_floor_work"
    ],
    "skillLevelMatch": "same_or_lower",
    "goalMatch": "same_workout_type",
    "prescriptionAdjustment": {
      "targetRpeDelta": -1,
      "restSecondsDelta": -30,
      "note": "Use moderate load and stop one rep earlier than the barbell prescription."
    },
    "coachingNote": "Choose the replacement that lets the athlete keep full-foot pressure and a pain-free depth.",
    "substituteExerciseIds": [
      "goblet_squat",
      "box_squat",
      "leg_press",
      "bodyweight_squat"
    ],
    "conditionFlags": [
      "equipment_limited",
      "knee_caution",
      "limited_space"
    ],
    "rationale": "Keeps a squat-dominant lower-body stimulus when a rack is unavailable or knee range needs tighter control."
  },
  {
    "id": "sub_goblet_squat_no_equipment_or_knee",
    "sourceExerciseId": "goblet_squat",
    "sourceMovementPatternIds": [
      "squat"
    ],
    "acceptableReplacementIds": [
      "box_squat",
      "bodyweight_squat",
      "glute_bridge",
      "leg_press"
    ],
    "replacementPriority": [
      "box_squat",
      "bodyweight_squat",
      "glute_bridge",
      "leg_press"
    ],
    "reason": "Preserves squat practice while reducing load, equipment dependency, or knee range.",
    "supportedSafetyFlags": [
      "equipment_limited",
      "knee_caution",
      "poor_readiness",
      "high_fatigue"
    ],
    "skillLevelMatch": "same_or_lower",
    "goalMatch": "same_pattern",
    "prescriptionAdjustment": {
      "setsDelta": -1,
      "targetRpeDelta": -1,
      "note": "Use the same rep range but cap depth and effort below symptom change."
    },
    "coachingNote": "Keep the torso quiet and use a box or support before removing the squat pattern entirely.",
    "substituteExerciseIds": [
      "box_squat",
      "bodyweight_squat",
      "glute_bridge",
      "leg_press"
    ],
    "conditionFlags": [
      "equipment_limited",
      "knee_caution",
      "poor_readiness",
      "high_fatigue"
    ],
    "rationale": "Preserves squat practice while reducing load, equipment dependency, or knee range."
  },
  {
    "id": "sub_bodyweight_squat_knee_or_fatigue",
    "sourceExerciseId": "bodyweight_squat",
    "sourceMovementPatternIds": [
      "squat"
    ],
    "acceptableReplacementIds": [
      "box_squat",
      "glute_bridge",
      "dead_bug"
    ],
    "replacementPriority": [
      "box_squat",
      "glute_bridge",
      "dead_bug"
    ],
    "reason": "Keeps lower-body or trunk work available when unsupported squatting is not the right choice today.",
    "supportedSafetyFlags": [
      "knee_caution",
      "poor_readiness",
      "high_fatigue"
    ],
    "skillLevelMatch": "same_or_lower",
    "goalMatch": "same_pattern",
    "prescriptionAdjustment": {
      "repsDelta": -2,
      "targetRpeDelta": -1,
      "note": "Use controlled reps and stop before knee symptoms rise."
    },
    "coachingNote": "A box target is preferred when the squat pattern is still tolerated.",
    "substituteExerciseIds": [
      "box_squat",
      "glute_bridge",
      "dead_bug"
    ],
    "conditionFlags": [
      "knee_caution",
      "poor_readiness",
      "high_fatigue"
    ],
    "rationale": "Keeps lower-body or trunk work available when unsupported squatting is not the right choice today."
  },
  {
    "id": "sub_lunge_knee_or_balance",
    "sourceExerciseId": "reverse_lunge",
    "sourceMovementPatternIds": [
      "lunge"
    ],
    "acceptableReplacementIds": [
      "split_squat",
      "box_squat",
      "glute_bridge",
      "step_up"
    ],
    "replacementPriority": [
      "box_squat",
      "glute_bridge",
      "split_squat",
      "step_up"
    ],
    "reason": "Trades dynamic single-leg deceleration for more stable lower-body work when knee or balance tolerance is limited.",
    "supportedSafetyFlags": [
      "knee_caution",
      "poor_readiness",
      "balance_fall_risk"
    ],
    "skillLevelMatch": "same_or_lower",
    "goalMatch": "same_pattern",
    "prescriptionAdjustment": {
      "targetRpeDelta": -1,
      "note": "Reduce range before reducing total work."
    },
    "coachingNote": "Prefer a hand-supported or box-based option before loading the lunge again.",
    "substituteExerciseIds": [
      "split_squat",
      "box_squat",
      "glute_bridge",
      "step_up"
    ],
    "conditionFlags": [
      "knee_caution",
      "poor_readiness",
      "balance_fall_risk"
    ],
    "rationale": "Trades dynamic single-leg deceleration for more stable lower-body work when knee or balance tolerance is limited."
  },
  {
    "id": "sub_split_squat_knee_or_beginner",
    "sourceExerciseId": "split_squat",
    "sourceMovementPatternIds": [
      "lunge"
    ],
    "acceptableReplacementIds": [
      "box_squat",
      "bodyweight_squat",
      "glute_bridge"
    ],
    "replacementPriority": [
      "box_squat",
      "bodyweight_squat",
      "glute_bridge"
    ],
    "reason": "Keeps quad and glute work while removing split-stance balance and deep knee stress.",
    "supportedSafetyFlags": [
      "knee_caution",
      "new_athlete",
      "poor_readiness"
    ],
    "skillLevelMatch": "same_or_lower",
    "goalMatch": "same_pattern",
    "prescriptionAdjustment": {
      "setsDelta": -1,
      "note": "Use a stable stance and leave extra reps in reserve."
    },
    "coachingNote": "If split stance is retained, shorten range and hold support.",
    "substituteExerciseIds": [
      "box_squat",
      "bodyweight_squat",
      "glute_bridge"
    ],
    "conditionFlags": [
      "knee_caution",
      "new_athlete",
      "poor_readiness"
    ],
    "rationale": "Keeps quad and glute work while removing split-stance balance and deep knee stress."
  },
  {
    "id": "sub_rdl_back_or_fatigue",
    "sourceExerciseId": "romanian_deadlift",
    "sourceMovementPatternIds": [
      "hinge"
    ],
    "acceptableReplacementIds": [
      "glute_bridge",
      "hip_hinge_dowel",
      "bodyweight_squat"
    ],
    "replacementPriority": [
      "glute_bridge",
      "hip_hinge_dowel",
      "bodyweight_squat"
    ],
    "reason": "Maintains posterior-chain intent while reducing spinal loading and technical hinge demand.",
    "supportedSafetyFlags": [
      "back_caution",
      "poor_readiness",
      "high_fatigue",
      "high_soreness"
    ],
    "skillLevelMatch": "same_or_lower",
    "goalMatch": "same_pattern",
    "prescriptionAdjustment": {
      "setsDelta": -1,
      "targetRpeDelta": -2,
      "restSecondsDelta": -30,
      "note": "Remove heavy loading and use slow controlled reps or drill work."
    },
    "coachingNote": "Stop the set if the pelvis or low back position changes.",
    "substituteExerciseIds": [
      "glute_bridge",
      "hip_hinge_dowel",
      "bodyweight_squat"
    ],
    "conditionFlags": [
      "back_caution",
      "poor_readiness",
      "high_fatigue",
      "high_soreness"
    ],
    "rationale": "Maintains posterior-chain intent while reducing spinal loading and technical hinge demand."
  },
  {
    "id": "sub_trap_bar_deadlift_back_or_equipment",
    "sourceExerciseId": "trap_bar_deadlift",
    "sourceMovementPatternIds": [
      "hinge",
      "squat"
    ],
    "acceptableReplacementIds": [
      "romanian_deadlift",
      "goblet_squat",
      "glute_bridge",
      "leg_press"
    ],
    "replacementPriority": [
      "goblet_squat",
      "glute_bridge",
      "romanian_deadlift",
      "leg_press"
    ],
    "reason": "Replaces heavy whole-body loading with a lower-spine-stress hinge or squat option.",
    "supportedSafetyFlags": [
      "back_caution",
      "equipment_limited",
      "poor_readiness"
    ],
    "skillLevelMatch": "same_or_lower",
    "goalMatch": "same_workout_type",
    "prescriptionAdjustment": {
      "setsDelta": -1,
      "targetRpeDelta": -2,
      "restSecondsDelta": -60,
      "note": "Do not chase the original heavy strength load on the substitute."
    },
    "coachingNote": "Use the option that preserves bracing without axial or shear discomfort.",
    "substituteExerciseIds": [
      "romanian_deadlift",
      "goblet_squat",
      "glute_bridge",
      "leg_press"
    ],
    "conditionFlags": [
      "back_caution",
      "equipment_limited",
      "poor_readiness"
    ],
    "rationale": "Replaces heavy whole-body loading with a lower-spine-stress hinge or squat option."
  },
  {
    "id": "sub_kettlebell_swing_fatigue_or_back",
    "sourceExerciseId": "kettlebell_swing",
    "sourceMovementPatternIds": [
      "hinge"
    ],
    "acceptableReplacementIds": [
      "glute_bridge",
      "romanian_deadlift",
      "sled_push"
    ],
    "replacementPriority": [
      "glute_bridge",
      "romanian_deadlift",
      "sled_push"
    ],
    "reason": "Removes ballistic hinge speed when fatigue, readiness, or back caution makes timing unreliable.",
    "supportedSafetyFlags": [
      "back_caution",
      "poor_readiness",
      "high_fatigue",
      "equipment_limited"
    ],
    "skillLevelMatch": "same_or_lower",
    "goalMatch": "same_workout_type",
    "prescriptionAdjustment": {
      "targetRpeDelta": -2,
      "note": "Convert ballistic intervals to controlled reps or low-impact conditioning."
    },
    "coachingNote": "Return to swings only when hinge timing and trunk position are crisp.",
    "substituteExerciseIds": [
      "glute_bridge",
      "romanian_deadlift",
      "sled_push"
    ],
    "conditionFlags": [
      "back_caution",
      "poor_readiness",
      "high_fatigue",
      "equipment_limited"
    ],
    "rationale": "Removes ballistic hinge speed when fatigue, readiness, or back caution makes timing unreliable."
  },
  {
    "id": "sub_bench_press_equipment_or_shoulder",
    "sourceExerciseId": "barbell_bench_press",
    "sourceMovementPatternIds": [
      "horizontal_push"
    ],
    "acceptableReplacementIds": [
      "dumbbell_bench_press",
      "floor_press",
      "incline_push_up",
      "push_up"
    ],
    "replacementPriority": [
      "dumbbell_bench_press",
      "floor_press",
      "incline_push_up",
      "push_up"
    ],
    "reason": "Keeps horizontal pressing while adapting to equipment and shoulder range tolerance.",
    "supportedSafetyFlags": [
      "equipment_limited",
      "shoulder_caution",
      "wrist_caution"
    ],
    "skillLevelMatch": "same_or_lower",
    "goalMatch": "same_workout_type",
    "prescriptionAdjustment": {
      "targetRpeDelta": -1,
      "note": "Use a pain-free range and stop short of grindy reps."
    },
    "coachingNote": "Floor press is preferred when shoulder extension at the bottom is the issue.",
    "substituteExerciseIds": [
      "dumbbell_bench_press",
      "floor_press",
      "incline_push_up",
      "push_up"
    ],
    "conditionFlags": [
      "equipment_limited",
      "shoulder_caution",
      "wrist_caution"
    ],
    "rationale": "Keeps horizontal pressing while adapting to equipment and shoulder range tolerance."
  },
  {
    "id": "sub_dumbbell_bench_press_shoulder",
    "sourceExerciseId": "dumbbell_bench_press",
    "sourceMovementPatternIds": [
      "horizontal_push"
    ],
    "acceptableReplacementIds": [
      "floor_press",
      "incline_push_up",
      "push_up"
    ],
    "replacementPriority": [
      "floor_press",
      "incline_push_up",
      "push_up"
    ],
    "reason": "Reduces shoulder range or loading while preserving horizontal press volume.",
    "supportedSafetyFlags": [
      "shoulder_caution",
      "equipment_limited"
    ],
    "skillLevelMatch": "same_or_lower",
    "goalMatch": "same_workout_type",
    "prescriptionAdjustment": {
      "targetRpeDelta": -1,
      "note": "Keep two to four reps in reserve and use neutral wrist alignment."
    },
    "coachingNote": "Pick the option where the shoulder stays centered through the entire range.",
    "substituteExerciseIds": [
      "floor_press",
      "incline_push_up",
      "push_up"
    ],
    "conditionFlags": [
      "shoulder_caution",
      "equipment_limited"
    ],
    "rationale": "Reduces shoulder range or loading while preserving horizontal press volume."
  },
  {
    "id": "sub_push_up_wrist_floor_or_beginner",
    "sourceExerciseId": "push_up",
    "sourceMovementPatternIds": [
      "horizontal_push",
      "anti_extension"
    ],
    "acceptableReplacementIds": [
      "incline_push_up",
      "floor_press",
      "dumbbell_bench_press",
      "band_pull_apart"
    ],
    "replacementPriority": [
      "incline_push_up",
      "floor_press",
      "dumbbell_bench_press",
      "band_pull_apart"
    ],
    "reason": "Preserves pressing intent while reducing wrist extension, floor loading, or trunk demand.",
    "supportedSafetyFlags": [
      "wrist_caution",
      "no_floor_work",
      "new_athlete",
      "poor_readiness"
    ],
    "skillLevelMatch": "same_or_lower",
    "goalMatch": "same_pattern",
    "prescriptionAdjustment": {
      "repsDelta": -2,
      "targetRpeDelta": -1,
      "note": "Use an incline high enough that every rep stays clean."
    },
    "coachingNote": "Neutral handles or an incline are preferred before abandoning the push pattern.",
    "substituteExerciseIds": [
      "incline_push_up",
      "floor_press",
      "dumbbell_bench_press",
      "band_pull_apart"
    ],
    "conditionFlags": [
      "wrist_caution",
      "no_floor_work",
      "new_athlete",
      "poor_readiness"
    ],
    "rationale": "Preserves pressing intent while reducing wrist extension, floor loading, or trunk demand."
  },
  {
    "id": "sub_pull_up_beginner_or_equipment",
    "sourceExerciseId": "pull_up",
    "sourceMovementPatternIds": [
      "vertical_pull"
    ],
    "acceptableReplacementIds": [
      "assisted_pull_up",
      "lat_pulldown",
      "band_row",
      "inverted_row"
    ],
    "replacementPriority": [
      "assisted_pull_up",
      "lat_pulldown",
      "band_row",
      "inverted_row"
    ],
    "reason": "Keeps vertical-pull intent or nearby upper-back work while matching equipment and skill.",
    "supportedSafetyFlags": [
      "equipment_limited",
      "new_athlete",
      "shoulder_caution"
    ],
    "skillLevelMatch": "same_or_lower",
    "goalMatch": "same_pattern",
    "prescriptionAdjustment": {
      "targetRpeDelta": -1,
      "note": "Use assistance or a machine so reps stay controlled with full shoulder comfort."
    },
    "coachingNote": "Choose band row only when vertical pulling is not available or shoulder symptoms prefer horizontal pulling.",
    "substituteExerciseIds": [
      "assisted_pull_up",
      "lat_pulldown",
      "band_row",
      "inverted_row"
    ],
    "conditionFlags": [
      "equipment_limited",
      "new_athlete",
      "shoulder_caution"
    ],
    "rationale": "Keeps vertical-pull intent or nearby upper-back work while matching equipment and skill."
  },
  {
    "id": "sub_lat_pulldown_shoulder_or_equipment",
    "sourceExerciseId": "lat_pulldown",
    "sourceMovementPatternIds": [
      "vertical_pull"
    ],
    "acceptableReplacementIds": [
      "band_row",
      "assisted_pull_up",
      "seated_cable_row",
      "inverted_row"
    ],
    "replacementPriority": [
      "band_row",
      "seated_cable_row",
      "assisted_pull_up",
      "inverted_row"
    ],
    "reason": "Moves pulling to a shoulder-friendly angle or equipment setup while keeping upper-back work.",
    "supportedSafetyFlags": [
      "shoulder_caution",
      "equipment_limited"
    ],
    "skillLevelMatch": "same_or_lower",
    "goalMatch": "same_workout_type",
    "prescriptionAdjustment": {
      "targetRpeDelta": -1,
      "note": "Use slower tempo and avoid shrugging into the neck."
    },
    "coachingNote": "Horizontal pulling is the safer fallback if overhead shoulder position is provocative.",
    "substituteExerciseIds": [
      "band_row",
      "assisted_pull_up",
      "seated_cable_row",
      "inverted_row"
    ],
    "conditionFlags": [
      "shoulder_caution",
      "equipment_limited"
    ],
    "rationale": "Moves pulling to a shoulder-friendly angle or equipment setup while keeping upper-back work."
  },
  {
    "id": "sub_overhead_press_shoulder_or_no_overhead",
    "sourceExerciseId": "overhead_press",
    "sourceMovementPatternIds": [
      "vertical_push"
    ],
    "acceptableReplacementIds": [
      "landmine_press",
      "dumbbell_lateral_raise",
      "band_external_rotation",
      "wall_slide"
    ],
    "replacementPriority": [
      "landmine_press",
      "band_external_rotation",
      "wall_slide",
      "dumbbell_lateral_raise"
    ],
    "reason": "Keeps shoulder training while moving away from aggressive overhead loading.",
    "supportedSafetyFlags": [
      "shoulder_caution",
      "no_overhead_pressing",
      "poor_readiness"
    ],
    "skillLevelMatch": "same_or_lower",
    "goalMatch": "same_workout_type",
    "prescriptionAdjustment": {
      "targetRpeDelta": -2,
      "restSecondsDelta": -30,
      "note": "Use light controlled reps and avoid end-range pinching."
    },
    "coachingNote": "Landmine press is the bridge option; cuff or wall-slide work is the pain-sensitive fallback.",
    "substituteExerciseIds": [
      "landmine_press",
      "dumbbell_lateral_raise",
      "band_external_rotation",
      "wall_slide"
    ],
    "conditionFlags": [
      "shoulder_caution",
      "no_overhead_pressing",
      "poor_readiness"
    ],
    "rationale": "Keeps shoulder training while moving away from aggressive overhead loading."
  },
  {
    "id": "sub_row_equipment_or_back",
    "sourceExerciseId": "one_arm_dumbbell_row",
    "sourceMovementPatternIds": [
      "horizontal_pull"
    ],
    "acceptableReplacementIds": [
      "band_row",
      "seated_cable_row",
      "inverted_row",
      "lat_pulldown"
    ],
    "replacementPriority": [
      "band_row",
      "seated_cable_row",
      "inverted_row",
      "lat_pulldown"
    ],
    "reason": "Preserves upper-back pulling while adapting support, equipment, and trunk position.",
    "supportedSafetyFlags": [
      "equipment_limited",
      "back_caution",
      "limited_space"
    ],
    "skillLevelMatch": "same_or_lower",
    "goalMatch": "same_workout_type",
    "prescriptionAdjustment": {
      "targetRpeDelta": -1,
      "note": "Use support or a band if trunk bracing is the limiter."
    },
    "coachingNote": "Supported rows are preferred when low-back tolerance is uncertain.",
    "substituteExerciseIds": [
      "band_row",
      "seated_cable_row",
      "inverted_row",
      "lat_pulldown"
    ],
    "conditionFlags": [
      "equipment_limited",
      "back_caution",
      "limited_space"
    ],
    "rationale": "Preserves upper-back pulling while adapting support, equipment, and trunk position."
  },
  {
    "id": "sub_barbell_row_back_or_equipment",
    "sourceExerciseId": "barbell_row",
    "sourceMovementPatternIds": [
      "horizontal_pull"
    ],
    "acceptableReplacementIds": [
      "one_arm_dumbbell_row",
      "seated_cable_row",
      "band_row",
      "inverted_row"
    ],
    "replacementPriority": [
      "one_arm_dumbbell_row",
      "seated_cable_row",
      "band_row",
      "inverted_row"
    ],
    "reason": "Keeps rowing stimulus while reducing unsupported hinge load or barbell requirement.",
    "supportedSafetyFlags": [
      "back_caution",
      "equipment_limited",
      "poor_readiness"
    ],
    "skillLevelMatch": "same_or_lower",
    "goalMatch": "same_pattern",
    "prescriptionAdjustment": {
      "targetRpeDelta": -1,
      "note": "Prioritize chest or hand support and strict tempo."
    },
    "coachingNote": "Avoid turning the substitute into another loaded hinge.",
    "substituteExerciseIds": [
      "one_arm_dumbbell_row",
      "seated_cable_row",
      "band_row",
      "inverted_row"
    ],
    "conditionFlags": [
      "back_caution",
      "equipment_limited",
      "poor_readiness"
    ],
    "rationale": "Keeps rowing stimulus while reducing unsupported hinge load or barbell requirement."
  },
  {
    "id": "sub_front_plank_floor_or_shoulder",
    "sourceExerciseId": "front_plank",
    "sourceMovementPatternIds": [
      "anti_extension"
    ],
    "acceptableReplacementIds": [
      "dead_bug",
      "pallof_press",
      "bird_dog"
    ],
    "replacementPriority": [
      "pallof_press",
      "dead_bug",
      "bird_dog"
    ],
    "reason": "Keeps trunk control while reducing floor, wrist, or shoulder loading.",
    "supportedSafetyFlags": [
      "wrist_caution",
      "shoulder_caution",
      "no_floor_work",
      "poor_readiness"
    ],
    "skillLevelMatch": "same_or_lower",
    "goalMatch": "same_pattern",
    "prescriptionAdjustment": {
      "durationSecondsDelta": -10,
      "targetRpeDelta": -1,
      "note": "Use shorter holds or controlled reps without shaking through position."
    },
    "coachingNote": "Pallof press is preferred when floor work is unavailable.",
    "substituteExerciseIds": [
      "dead_bug",
      "pallof_press",
      "bird_dog"
    ],
    "conditionFlags": [
      "wrist_caution",
      "shoulder_caution",
      "no_floor_work",
      "poor_readiness"
    ],
    "rationale": "Keeps trunk control while reducing floor, wrist, or shoulder loading."
  },
  {
    "id": "sub_side_plank_shoulder_or_floor",
    "sourceExerciseId": "side_plank",
    "sourceMovementPatternIds": [
      "anti_rotation"
    ],
    "acceptableReplacementIds": [
      "pallof_press",
      "dead_bug",
      "suitcase_carry"
    ],
    "replacementPriority": [
      "pallof_press",
      "dead_bug",
      "suitcase_carry"
    ],
    "reason": "Preserves anti-rotation while avoiding shoulder compression or floor setup.",
    "supportedSafetyFlags": [
      "shoulder_caution",
      "wrist_caution",
      "no_floor_work"
    ],
    "skillLevelMatch": "same_or_lower",
    "goalMatch": "same_pattern",
    "prescriptionAdjustment": {
      "durationSecondsDelta": -10,
      "note": "Switch holds to controlled presses or carries and keep breathing smooth."
    },
    "coachingNote": "Use Pallof press when shoulder pressure is the main issue.",
    "substituteExerciseIds": [
      "pallof_press",
      "dead_bug",
      "suitcase_carry"
    ],
    "conditionFlags": [
      "shoulder_caution",
      "wrist_caution",
      "no_floor_work"
    ],
    "rationale": "Preserves anti-rotation while avoiding shoulder compression or floor setup."
  },
  {
    "id": "sub_sit_up_back_or_floor",
    "sourceExerciseId": "sit_up",
    "sourceMovementPatternIds": [
      "anti_extension"
    ],
    "acceptableReplacementIds": [
      "dead_bug",
      "front_plank",
      "pallof_press"
    ],
    "replacementPriority": [
      "dead_bug",
      "pallof_press",
      "front_plank"
    ],
    "reason": "Replaces repeated trunk flexion with spine-friendlier core control.",
    "supportedSafetyFlags": [
      "back_caution",
      "no_floor_work",
      "poor_readiness"
    ],
    "skillLevelMatch": "same_or_lower",
    "goalMatch": "same_pattern",
    "prescriptionAdjustment": {
      "repsDelta": -4,
      "targetRpeDelta": -1,
      "note": "Use quality reps or short holds instead of chasing fatigue."
    },
    "coachingNote": "Choose dead bug for back caution and Pallof press when floor work is unavailable.",
    "substituteExerciseIds": [
      "dead_bug",
      "front_plank",
      "pallof_press"
    ],
    "conditionFlags": [
      "back_caution",
      "no_floor_work",
      "poor_readiness"
    ],
    "rationale": "Replaces repeated trunk flexion with spine-friendlier core control."
  },
  {
    "id": "sub_box_jump_no_jump_or_knee",
    "sourceExerciseId": "box_jump",
    "sourceMovementPatternIds": [
      "jump_land"
    ],
    "acceptableReplacementIds": [
      "step_up",
      "sled_push",
      "stationary_bike_zone2",
      "single_leg_balance"
    ],
    "replacementPriority": [
      "step_up",
      "sled_push",
      "stationary_bike_zone2",
      "single_leg_balance"
    ],
    "reason": "Removes landings while keeping leg drive, power intent, or conditioning support.",
    "supportedSafetyFlags": [
      "no_jumping",
      "knee_caution",
      "low_impact_required",
      "poor_readiness"
    ],
    "skillLevelMatch": "same_or_lower",
    "goalMatch": "same_workout_type",
    "prescriptionAdjustment": {
      "targetRpeDelta": -2,
      "restSecondsDelta": -30,
      "note": "Replace contacts with controlled reps or low-impact intervals."
    },
    "coachingNote": "No jumping means no workaround contacts; use step-up or sled only if pain-free.",
    "substituteExerciseIds": [
      "step_up",
      "sled_push",
      "stationary_bike_zone2",
      "single_leg_balance"
    ],
    "conditionFlags": [
      "no_jumping",
      "knee_caution",
      "low_impact_required",
      "poor_readiness"
    ],
    "rationale": "Removes landings while keeping leg drive, power intent, or conditioning support."
  },
  {
    "id": "sub_pogo_no_jump_or_ankle",
    "sourceExerciseId": "pogo_hop",
    "sourceMovementPatternIds": [
      "jump_land"
    ],
    "acceptableReplacementIds": [
      "ankle_rocker",
      "single_leg_balance",
      "incline_walk"
    ],
    "replacementPriority": [
      "ankle_rocker",
      "single_leg_balance",
      "incline_walk"
    ],
    "reason": "Keeps ankle stiffness or foot control without repeated contacts.",
    "supportedSafetyFlags": [
      "no_jumping",
      "knee_caution",
      "low_impact_required"
    ],
    "skillLevelMatch": "same_or_lower",
    "goalMatch": "same_pattern",
    "prescriptionAdjustment": {
      "targetRpeDelta": -2,
      "note": "Use controlled ankle reps or balance holds instead of contacts."
    },
    "coachingNote": "The replacement should feel springy-control oriented, not like conditioning punishment.",
    "substituteExerciseIds": [
      "ankle_rocker",
      "single_leg_balance",
      "incline_walk"
    ],
    "conditionFlags": [
      "no_jumping",
      "knee_caution",
      "low_impact_required"
    ],
    "rationale": "Keeps ankle stiffness or foot control without repeated contacts."
  },
  {
    "id": "sub_jump_rope_no_jump_or_low_impact",
    "sourceExerciseId": "jump_rope_easy",
    "sourceMovementPatternIds": [
      "jump_land",
      "locomotion"
    ],
    "acceptableReplacementIds": [
      "stationary_bike_zone2",
      "incline_walk",
      "easy_walk",
      "ankle_rocker"
    ],
    "replacementPriority": [
      "stationary_bike_zone2",
      "incline_walk",
      "easy_walk",
      "ankle_rocker"
    ],
    "reason": "Keeps aerobic rhythm while removing repetitive ground contacts.",
    "supportedSafetyFlags": [
      "no_jumping",
      "low_impact_required",
      "knee_caution"
    ],
    "skillLevelMatch": "same_or_lower",
    "goalMatch": "same_workout_type",
    "prescriptionAdjustment": {
      "durationMinutesDelta": 5,
      "targetRpeDelta": -1,
      "note": "Convert rope intervals to steady or repeatable low-impact work."
    },
    "coachingNote": "Use conversational effort if the original jump-rope work was not meant to be HIIT.",
    "substituteExerciseIds": [
      "stationary_bike_zone2",
      "incline_walk",
      "easy_walk",
      "ankle_rocker"
    ],
    "conditionFlags": [
      "no_jumping",
      "low_impact_required",
      "knee_caution"
    ],
    "rationale": "Keeps aerobic rhythm while removing repetitive ground contacts."
  },
  {
    "id": "sub_burpee_no_jump_floor_or_wrist",
    "sourceExerciseId": "burpee",
    "sourceMovementPatternIds": [
      "squat",
      "horizontal_push",
      "jump_land"
    ],
    "acceptableReplacementIds": [
      "sled_push",
      "incline_push_up",
      "bodyweight_squat",
      "stationary_bike_zone2"
    ],
    "replacementPriority": [
      "sled_push",
      "stationary_bike_zone2",
      "incline_push_up",
      "bodyweight_squat"
    ],
    "reason": "Splits the burpee into lower-impact conditioning or simple pattern work when jumping, floor loading, or wrists are not appropriate.",
    "supportedSafetyFlags": [
      "no_jumping",
      "no_floor_work",
      "wrist_caution",
      "low_impact_required",
      "poor_readiness"
    ],
    "skillLevelMatch": "same_or_lower",
    "goalMatch": "same_workout_type",
    "prescriptionAdjustment": {
      "targetRpeDelta": -2,
      "note": "Use repeatable intervals; do not preserve burpee fatigue at the expense of mechanics."
    },
    "coachingNote": "Choose one simple substitute rather than stacking squat plus push-up under fatigue.",
    "substituteExerciseIds": [
      "sled_push",
      "incline_push_up",
      "bodyweight_squat",
      "stationary_bike_zone2"
    ],
    "conditionFlags": [
      "no_jumping",
      "no_floor_work",
      "wrist_caution",
      "low_impact_required",
      "poor_readiness"
    ],
    "rationale": "Splits the burpee into lower-impact conditioning or simple pattern work when jumping, floor loading, or wrists are not appropriate."
  },
  {
    "id": "sub_running_no_running",
    "sourceExerciseId": "running_interval",
    "sourceMovementPatternIds": [
      "locomotion"
    ],
    "acceptableReplacementIds": [
      "stationary_bike_zone2",
      "assault_bike_zone2",
      "rower_zone2",
      "incline_walk"
    ],
    "replacementPriority": [
      "stationary_bike_zone2",
      "assault_bike_zone2",
      "rower_zone2",
      "incline_walk"
    ],
    "reason": "Preserves aerobic or interval intent without running exposure.",
    "supportedSafetyFlags": [
      "no_running",
      "low_impact_required",
      "knee_caution"
    ],
    "skillLevelMatch": "same_or_lower",
    "goalMatch": "same_workout_type",
    "prescriptionAdjustment": {
      "targetRpeDelta": -1,
      "note": "Match effort by RPE or heart-rate zone rather than pace."
    },
    "coachingNote": "Bike is the default when impact restriction is the reason.",
    "substituteExerciseIds": [
      "stationary_bike_zone2",
      "assault_bike_zone2",
      "rower_zone2",
      "incline_walk"
    ],
    "conditionFlags": [
      "no_running",
      "low_impact_required",
      "knee_caution"
    ],
    "rationale": "Preserves aerobic or interval intent without running exposure."
  },
  {
    "id": "sub_incline_walk_no_running_or_space",
    "sourceExerciseId": "incline_walk",
    "sourceMovementPatternIds": [
      "locomotion"
    ],
    "acceptableReplacementIds": [
      "stationary_bike_zone2",
      "assault_bike_zone2",
      "easy_walk",
      "crocodile_breathing"
    ],
    "replacementPriority": [
      "stationary_bike_zone2",
      "assault_bike_zone2",
      "easy_walk",
      "crocodile_breathing"
    ],
    "reason": "Keeps low-intensity aerobic work when treadmill, running exposure, or space is not available.",
    "supportedSafetyFlags": [
      "no_running",
      "equipment_limited",
      "limited_space"
    ],
    "skillLevelMatch": "same_or_lower",
    "goalMatch": "same_workout_type",
    "prescriptionAdjustment": {
      "note": "Match duration and keep the same conversational effort target."
    },
    "coachingNote": "Do not turn the replacement into intervals if the session intent is Zone 2.",
    "substituteExerciseIds": [
      "stationary_bike_zone2",
      "assault_bike_zone2",
      "easy_walk",
      "crocodile_breathing"
    ],
    "conditionFlags": [
      "no_running",
      "equipment_limited",
      "limited_space"
    ],
    "rationale": "Keeps low-intensity aerobic work when treadmill, running exposure, or space is not available."
  },
  {
    "id": "sub_rower_back_or_equipment",
    "sourceExerciseId": "rower_zone2",
    "sourceMovementPatternIds": [
      "locomotion",
      "horizontal_pull"
    ],
    "acceptableReplacementIds": [
      "stationary_bike_zone2",
      "incline_walk",
      "easy_walk"
    ],
    "replacementPriority": [
      "stationary_bike_zone2",
      "incline_walk",
      "easy_walk"
    ],
    "reason": "Keeps Zone 2 while reducing repeated hinge and machine dependence.",
    "supportedSafetyFlags": [
      "back_caution",
      "equipment_limited"
    ],
    "skillLevelMatch": "same_or_lower",
    "goalMatch": "same_workout_type",
    "prescriptionAdjustment": {
      "note": "Keep the same duration and heart-rate zone; ignore rower pace targets."
    },
    "coachingNote": "Bike is preferred when back symptoms dislike the catch position.",
    "substituteExerciseIds": [
      "stationary_bike_zone2",
      "incline_walk",
      "easy_walk"
    ],
    "conditionFlags": [
      "back_caution",
      "equipment_limited"
    ],
    "rationale": "Keeps Zone 2 while reducing repeated hinge and machine dependence."
  },
  {
    "id": "sub_stationary_bike_unavailable",
    "sourceExerciseId": "stationary_bike_zone2",
    "sourceMovementPatternIds": [
      "locomotion"
    ],
    "acceptableReplacementIds": [
      "easy_walk",
      "incline_walk",
      "crocodile_breathing"
    ],
    "replacementPriority": [
      "easy_walk",
      "incline_walk",
      "crocodile_breathing"
    ],
    "reason": "Provides a no-machine aerobic or recovery fallback when bike equipment is unavailable.",
    "supportedSafetyFlags": [
      "equipment_limited",
      "limited_space"
    ],
    "skillLevelMatch": "same_or_lower",
    "goalMatch": "same_workout_type",
    "prescriptionAdjustment": {
      "note": "Use duration and talk-test targets instead of watts or cadence."
    },
    "coachingNote": "If walking is not available, use breathing reset as recovery rather than pretending it is cardio.",
    "substituteExerciseIds": [
      "easy_walk",
      "incline_walk",
      "crocodile_breathing"
    ],
    "conditionFlags": [
      "equipment_limited",
      "limited_space"
    ],
    "rationale": "Provides a no-machine aerobic or recovery fallback when bike equipment is unavailable."
  },
  {
    "id": "sub_sled_knee_or_space",
    "sourceExerciseId": "sled_push",
    "sourceMovementPatternIds": [
      "locomotion",
      "squat"
    ],
    "acceptableReplacementIds": [
      "stationary_bike_zone2",
      "battle_rope_wave",
      "incline_walk"
    ],
    "replacementPriority": [
      "stationary_bike_zone2",
      "battle_rope_wave",
      "incline_walk"
    ],
    "reason": "Keeps conditioning with less knee drive, less lane requirement, or no sled.",
    "supportedSafetyFlags": [
      "knee_caution",
      "limited_space",
      "equipment_limited"
    ],
    "skillLevelMatch": "same_or_lower",
    "goalMatch": "same_workout_type",
    "prescriptionAdjustment": {
      "targetRpeDelta": -1,
      "note": "Replace sled pushes with repeatable intervals or steady work at the same session intent."
    },
    "coachingNote": "Battle ropes preserve conditioning density when lower-body drive is the issue.",
    "substituteExerciseIds": [
      "stationary_bike_zone2",
      "battle_rope_wave",
      "incline_walk"
    ],
    "conditionFlags": [
      "knee_caution",
      "limited_space",
      "equipment_limited"
    ],
    "rationale": "Keeps conditioning with less knee drive, less lane requirement, or no sled."
  },
  {
    "id": "sub_battle_rope_shoulder_or_equipment",
    "sourceExerciseId": "battle_rope_wave",
    "sourceMovementPatternIds": [
      "horizontal_push",
      "breathing"
    ],
    "acceptableReplacementIds": [
      "stationary_bike_zone2",
      "sled_push",
      "band_pull_apart"
    ],
    "replacementPriority": [
      "stationary_bike_zone2",
      "band_pull_apart",
      "sled_push"
    ],
    "reason": "Keeps conditioning or shoulder support while avoiding provocative rope volume.",
    "supportedSafetyFlags": [
      "shoulder_caution",
      "equipment_limited",
      "poor_readiness"
    ],
    "skillLevelMatch": "same_or_lower",
    "goalMatch": "same_workout_type",
    "prescriptionAdjustment": {
      "targetRpeDelta": -1,
      "note": "Reduce interval intensity and keep shoulder rhythm pain-free."
    },
    "coachingNote": "Use band work only when the goal shifts from conditioning to shoulder tolerance.",
    "substituteExerciseIds": [
      "stationary_bike_zone2",
      "sled_push",
      "band_pull_apart"
    ],
    "conditionFlags": [
      "shoulder_caution",
      "equipment_limited",
      "poor_readiness"
    ],
    "rationale": "Keeps conditioning or shoulder support while avoiding provocative rope volume."
  },
  {
    "id": "sub_bear_crawl_wrist_floor_or_space",
    "sourceExerciseId": "bear_crawl",
    "sourceMovementPatternIds": [
      "crawl",
      "anti_extension"
    ],
    "acceptableReplacementIds": [
      "dead_bug",
      "bird_dog",
      "front_plank",
      "pallof_press"
    ],
    "replacementPriority": [
      "pallof_press",
      "dead_bug",
      "bird_dog",
      "front_plank"
    ],
    "reason": "Preserves trunk control while removing loaded wrists, floor crawling, or open-space needs.",
    "supportedSafetyFlags": [
      "wrist_caution",
      "shoulder_caution",
      "no_floor_work",
      "limited_space"
    ],
    "skillLevelMatch": "same_or_lower",
    "goalMatch": "same_pattern",
    "prescriptionAdjustment": {
      "durationSecondsDelta": -15,
      "note": "Use controlled reps or presses instead of crawling distance."
    },
    "coachingNote": "Pallof press is preferred when floor work is explicitly unavailable.",
    "substituteExerciseIds": [
      "dead_bug",
      "bird_dog",
      "front_plank",
      "pallof_press"
    ],
    "conditionFlags": [
      "wrist_caution",
      "shoulder_caution",
      "no_floor_work",
      "limited_space"
    ],
    "rationale": "Preserves trunk control while removing loaded wrists, floor crawling, or open-space needs."
  },
  {
    "id": "sub_worlds_greatest_stretch_wrist_or_floor",
    "sourceExerciseId": "worlds_greatest_stretch",
    "sourceMovementPatternIds": [
      "hip_mobility",
      "thoracic_mobility"
    ],
    "acceptableReplacementIds": [
      "half_kneeling_hip_flexor",
      "thoracic_open_book",
      "ankle_rocker"
    ],
    "replacementPriority": [
      "half_kneeling_hip_flexor",
      "thoracic_open_book",
      "ankle_rocker"
    ],
    "reason": "Keeps hip and thoracic mobility while removing loaded-hand positions or complex floor transitions.",
    "supportedSafetyFlags": [
      "wrist_caution",
      "no_floor_work",
      "poor_readiness"
    ],
    "skillLevelMatch": "same_or_lower",
    "goalMatch": "same_pattern",
    "prescriptionAdjustment": {
      "note": "Break the flow into separate controlled mobility drills."
    },
    "coachingNote": "Use pain-free range and own each position rather than forcing the flow.",
    "substituteExerciseIds": [
      "half_kneeling_hip_flexor",
      "thoracic_open_book",
      "ankle_rocker"
    ],
    "conditionFlags": [
      "wrist_caution",
      "no_floor_work",
      "poor_readiness"
    ],
    "rationale": "Keeps hip and thoracic mobility while removing loaded-hand positions or complex floor transitions."
  },
  {
    "id": "sub_medball_power_shoulder_or_space",
    "sourceExerciseId": "med_ball_rotational_throw",
    "sourceMovementPatternIds": [
      "rotation"
    ],
    "acceptableReplacementIds": [
      "cable_woodchop",
      "pallof_press",
      "band_pull_apart"
    ],
    "replacementPriority": [
      "cable_woodchop",
      "pallof_press",
      "band_pull_apart"
    ],
    "reason": "Replaces ballistic rotation with controlled trunk or shoulder work when shoulder tolerance or space is limited.",
    "supportedSafetyFlags": [
      "shoulder_caution",
      "limited_space",
      "poor_readiness"
    ],
    "skillLevelMatch": "same_or_lower",
    "goalMatch": "same_workout_type",
    "prescriptionAdjustment": {
      "targetRpeDelta": -2,
      "note": "Shift from power reps to controlled quality reps."
    },
    "coachingNote": "Keep ribs stacked and avoid yanking through the shoulder.",
    "substituteExerciseIds": [
      "cable_woodchop",
      "pallof_press",
      "band_pull_apart"
    ],
    "conditionFlags": [
      "shoulder_caution",
      "limited_space",
      "poor_readiness"
    ],
    "rationale": "Replaces ballistic rotation with controlled trunk or shoulder work when shoulder tolerance or space is limited."
  }
] satisfies SubstitutionRule[];
