import type { Exercise } from '../../types.ts';

export const powerExercises = [
  {
    "id": "landmine_press",
    "name": "Landmine Press",
    "summary": "Angled press that can be easier on shoulders than overhead work.",
    "coachingSummary": "Press up and forward while staying stacked through the trunk.",
    "movementPatternIds": [
      "vertical_push",
      "anti_rotation"
    ],
    "primaryMuscleIds": [
      "shoulders",
      "triceps"
    ],
    "secondaryMuscleIds": [
      "obliques",
      "chest"
    ],
    "equipmentIds": [
      "barbell"
    ],
    "workoutTypeIds": [
      "strength",
      "boxing_support",
      "upper_strength"
    ],
    "goalIds": [
      "boxing_support",
      "upper_body_strength",
      "full_gym_strength"
    ],
    "minExperience": "beginner",
    "intensity": "moderate",
    "impact": "none",
    "contraindicationFlags": [],
    "trackingMetricIds": [
      "sets_completed",
      "reps_completed",
      "load_used",
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "strength_beginner",
    "shortName": "Landmine Press",
    "category": "strength",
    "subPatternIds": [
      "overhead_pressing",
      "rotary_stability"
    ],
    "jointsInvolved": [
      "spine",
      "shoulders",
      "elbows"
    ],
    "planeOfMotion": [
      "sagittal",
      "transverse"
    ],
    "equipmentRequiredIds": [
      "barbell"
    ],
    "equipmentOptionalIds": [],
    "setupType": "standing",
    "technicalComplexity": "low",
    "loadability": "high",
    "fatigueCost": "moderate",
    "spineLoading": "low",
    "kneeDemand": "low",
    "hipDemand": "low",
    "shoulderDemand": "high",
    "wristDemand": "low",
    "ankleDemand": "low",
    "balanceDemand": "low",
    "cardioDemand": "low",
    "spaceRequired": [
      "small_space"
    ],
    "homeFriendly": false,
    "gymFriendly": true,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "wall_slide"
    ],
    "progressionExerciseIds": [
      "overhead_press"
    ],
    "substitutionExerciseIds": [
      "overhead_press",
      "pallof_press"
    ],
    "setupInstructions": [
      "Set hands and barbell so shoulders start comfortable and ribs stay stacked over the pelvis.",
      "Use a range that avoids pinching at the front of the shoulder."
    ],
    "executionInstructions": [
      "Press smoothly without shrugging or losing trunk position.",
      "Stop the set when shoulder comfort, wrist position, or rep speed changes."
    ],
    "breathingInstructions": [
      "Inhale and brace before the hard part of each rep.",
      "Exhale through the finish without losing trunk position."
    ],
    "safetyNotes": [
      "Stop the exercise if pain, dizziness, or unusual symptoms appear."
    ],
    "defaultPrescriptionRanges": {
      "sets": {
        "min": 2,
        "max": 4
      },
      "reps": {
        "min": 6,
        "max": 10
      },
      "rpe": {
        "min": 5,
        "max": 7
      },
      "restSeconds": {
        "min": 60,
        "max": 120
      }
    }
  },
  {
    "id": "pallof_press",
    "name": "Pallof Press",
    "summary": "Cable or band anti-rotation press.",
    "coachingSummary": "Press straight out and resist rotation through the trunk.",
    "movementPatternIds": [
      "anti_rotation"
    ],
    "primaryMuscleIds": [
      "obliques",
      "transverse_abs"
    ],
    "secondaryMuscleIds": [
      "shoulders"
    ],
    "equipmentIds": [
      "resistance_band",
      "cable_machine"
    ],
    "workoutTypeIds": [
      "core_durability",
      "boxing_support",
      "strength"
    ],
    "goalIds": [
      "core_durability",
      "boxing_support",
      "limited_equipment"
    ],
    "minExperience": "beginner",
    "intensity": "low",
    "impact": "none",
    "contraindicationFlags": [],
    "trackingMetricIds": [
      "sets_completed",
      "reps_completed",
      "movement_quality",
      "load_used",
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "core_control",
    "shortName": "Pallof Press",
    "category": "strength",
    "subPatternIds": [
      "rotary_stability"
    ],
    "jointsInvolved": [
      "spine"
    ],
    "planeOfMotion": "transverse",
    "equipmentRequiredIds": [
      "resistance_band",
      "cable_machine"
    ],
    "equipmentOptionalIds": [],
    "setupType": "standing",
    "technicalComplexity": "low",
    "loadability": "moderate",
    "fatigueCost": "low",
    "spineLoading": "low",
    "kneeDemand": "low",
    "hipDemand": "low",
    "shoulderDemand": "low",
    "wristDemand": "low",
    "ankleDemand": "low",
    "balanceDemand": "low",
    "cardioDemand": "low",
    "spaceRequired": [
      "machine_station"
    ],
    "homeFriendly": false,
    "gymFriendly": true,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "dead_bug"
    ],
    "progressionExerciseIds": [
      "cable_woodchop"
    ],
    "substitutionExerciseIds": [
      "side_plank",
      "cable_woodchop"
    ],
    "setupInstructions": [
      "Set the trunk before moving and keep a stable base of support.",
      "Place any load or support where posture can stay tall and controlled."
    ],
    "executionInstructions": [
      "Maintain trunk position while the limbs or load move around it.",
      "End the set before posture collapses or balance becomes a scramble."
    ],
    "breathingInstructions": [
      "Use steady nasal or quiet mouth breathing.",
      "Do not hold the breath during low-intensity mobility or control work."
    ],
    "safetyNotes": [
      "Stop the exercise if pain, dizziness, or unusual symptoms appear."
    ],
    "defaultPrescriptionRanges": {
      "sets": {
        "min": 2,
        "max": 3
      },
      "reps": {
        "min": 6,
        "max": 10
      },
      "rpe": {
        "min": 3,
        "max": 6
      },
      "restSeconds": {
        "min": 30,
        "max": 60
      }
    }
  },
  {
    "id": "suitcase_carry",
    "name": "Suitcase Carry",
    "summary": "Loaded carry resisting side bend.",
    "coachingSummary": "Walk tall and do not lean toward the load.",
    "movementPatternIds": [
      "carry",
      "anti_rotation"
    ],
    "primaryMuscleIds": [
      "obliques",
      "forearms"
    ],
    "secondaryMuscleIds": [
      "glutes",
      "shoulders"
    ],
    "equipmentIds": [
      "dumbbells",
      "kettlebell",
      "open_space"
    ],
    "workoutTypeIds": [
      "core_durability",
      "strength",
      "boxing_support"
    ],
    "goalIds": [
      "core_durability",
      "limited_equipment",
      "boxing_support"
    ],
    "minExperience": "beginner",
    "intensity": "moderate",
    "impact": "low",
    "contraindicationFlags": [
      "back_caution"
    ],
    "trackingMetricIds": [
      "duration_minutes",
      "load_used",
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "carry_control",
    "shortName": "Suitcase Carry",
    "category": "strength",
    "subPatternIds": [
      "unilateral_loaded_carry",
      "rotary_stability"
    ],
    "jointsInvolved": [
      "spine",
      "shoulders",
      "wrists"
    ],
    "planeOfMotion": [
      "frontal",
      "transverse"
    ],
    "equipmentRequiredIds": [
      "dumbbells",
      "kettlebell"
    ],
    "equipmentOptionalIds": [
      "open_space"
    ],
    "setupType": "locomotion",
    "technicalComplexity": "moderate",
    "loadability": "moderate",
    "fatigueCost": "moderate",
    "spineLoading": "high",
    "kneeDemand": "low",
    "hipDemand": "high",
    "shoulderDemand": "moderate",
    "wristDemand": "moderate",
    "ankleDemand": "low",
    "balanceDemand": "high",
    "cardioDemand": "moderate",
    "spaceRequired": [
      "lane",
      "open_space"
    ],
    "homeFriendly": true,
    "gymFriendly": true,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "side_plank",
      "pallof_press"
    ],
    "progressionExerciseIds": [
      "farmers_carry"
    ],
    "substitutionExerciseIds": [
      "farmers_carry",
      "pallof_press"
    ],
    "setupInstructions": [
      "Set the trunk before moving and keep a stable base of support.",
      "Place any load or support where posture can stay tall and controlled."
    ],
    "executionInstructions": [
      "Maintain trunk position while the limbs or load move around it.",
      "End the set before posture collapses or balance becomes a scramble."
    ],
    "breathingInstructions": [
      "Inhale and brace before the hard part of each rep.",
      "Exhale through the finish without losing trunk position."
    ],
    "safetyNotes": [
      "Stop if back position changes, symptoms radiate, or hinge/carry loading feels sharp."
    ],
    "defaultPrescriptionRanges": {
      "sets": {
        "min": 2,
        "max": 4
      },
      "durationSeconds": {
        "min": 20,
        "max": 45
      },
      "rpe": {
        "min": 5,
        "max": 7
      },
      "restSeconds": {
        "min": 45,
        "max": 90
      }
    }
  },
  {
    "id": "med_ball_rotational_throw",
    "name": "Med Ball Rotational Throw",
    "summary": "Explosive trunk rotation throw.",
    "coachingSummary": "Rotate through hips and keep reps snappy, not fatiguing.",
    "movementPatternIds": [
      "rotation"
    ],
    "primaryMuscleIds": [
      "obliques",
      "glutes"
    ],
    "secondaryMuscleIds": [
      "shoulders",
      "full_body"
    ],
    "equipmentIds": [
      "medicine_ball",
      "open_space"
    ],
    "workoutTypeIds": [
      "power",
      "boxing_support"
    ],
    "goalIds": [
      "boxing_support"
    ],
    "minExperience": "intermediate",
    "intensity": "moderate",
    "impact": "none",
    "contraindicationFlags": [
      "shoulder_caution",
      "back_caution"
    ],
    "trackingMetricIds": [
      "sets_completed",
      "reps_completed",
      "movement_quality",
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "power_quality",
    "shortName": "Med Ball Rotational Throw",
    "category": "power",
    "subPatternIds": [
      "rotational_power"
    ],
    "jointsInvolved": [
      "spine",
      "shoulders"
    ],
    "planeOfMotion": "transverse",
    "equipmentRequiredIds": [
      "medicine_ball"
    ],
    "equipmentOptionalIds": [
      "open_space"
    ],
    "setupType": "standing",
    "technicalComplexity": "high",
    "loadability": "moderate",
    "fatigueCost": "high",
    "spineLoading": "high",
    "kneeDemand": "low",
    "hipDemand": "low",
    "shoulderDemand": "high",
    "wristDemand": "low",
    "ankleDemand": "low",
    "balanceDemand": "high",
    "cardioDemand": "low",
    "spaceRequired": [
      "open_space"
    ],
    "homeFriendly": false,
    "gymFriendly": true,
    "beginnerFriendly": false,
    "regressionExerciseIds": [
      "cable_woodchop"
    ],
    "progressionExerciseIds": [],
    "substitutionExerciseIds": [
      "medicine_ball_slam",
      "cable_woodchop"
    ],
    "setupInstructions": [
      "Set up in a stable start position with the target joints pain-free.",
      "Confirm the first rep can be performed without rushing or compensation."
    ],
    "executionInstructions": [
      "Move with controlled tempo and finish each rep in the same position you started.",
      "Keep effort repeatable across the full prescription."
    ],
    "breathingInstructions": [
      "Use steady nasal or quiet mouth breathing.",
      "Do not hold the breath during low-intensity mobility or control work."
    ],
    "safetyNotes": [
      "Stop if back position changes, symptoms radiate, or hinge/carry loading feels sharp.",
      "Use a smaller range or substitute if shoulder pinching, instability, or pain appears."
    ],
    "defaultPrescriptionRanges": {
      "sets": {
        "min": 3,
        "max": 5
      },
      "reps": {
        "min": 3,
        "max": 5
      },
      "rpe": {
        "min": 5,
        "max": 7
      },
      "restSeconds": {
        "min": 90,
        "max": 150
      }
    }
  },
  {
    "id": "medicine_ball_slam",
    "name": "Medicine Ball Slam",
    "summary": "Full-body medicine ball power and conditioning.",
    "coachingSummary": "Slam with control and stop before technique gets sloppy.",
    "movementPatternIds": [
      "hinge",
      "rotation"
    ],
    "primaryMuscleIds": [
      "full_body",
      "rectus_abs"
    ],
    "secondaryMuscleIds": [
      "shoulders",
      "lats"
    ],
    "equipmentIds": [
      "medicine_ball"
    ],
    "workoutTypeIds": [
      "power",
      "conditioning",
      "boxing_support"
    ],
    "goalIds": [
      "boxing_support",
      "low_impact_conditioning"
    ],
    "minExperience": "beginner",
    "intensity": "moderate",
    "impact": "low",
    "contraindicationFlags": [
      "shoulder_caution",
      "back_caution"
    ],
    "trackingMetricIds": [
      "sets_completed",
      "reps_completed",
      "actual_rpe",
      "rounds_completed",
      "work_seconds"
    ],
    "defaultPrescriptionTemplateId": "conditioning_interval",
    "shortName": "Medicine Ball Slam",
    "category": "power",
    "subPatternIds": [
      "controlled_hip_hinge",
      "controlled_rotation"
    ],
    "jointsInvolved": [
      "hips",
      "spine",
      "shoulders"
    ],
    "planeOfMotion": [
      "sagittal",
      "transverse"
    ],
    "equipmentRequiredIds": [
      "medicine_ball"
    ],
    "equipmentOptionalIds": [],
    "setupType": "standing",
    "technicalComplexity": "high",
    "loadability": "moderate",
    "fatigueCost": "high",
    "spineLoading": "high",
    "kneeDemand": "low",
    "hipDemand": "high",
    "shoulderDemand": "high",
    "wristDemand": "low",
    "ankleDemand": "low",
    "balanceDemand": "high",
    "cardioDemand": "high",
    "spaceRequired": [
      "open_space"
    ],
    "homeFriendly": false,
    "gymFriendly": true,
    "beginnerFriendly": false,
    "regressionExerciseIds": [
      "battle_rope_wave"
    ],
    "progressionExerciseIds": [
      "med_ball_rotational_throw"
    ],
    "substitutionExerciseIds": [
      "battle_rope_wave",
      "sled_push"
    ],
    "setupInstructions": [
      "Set medicine_ball close to the body and soften the knees before sending the hips back.",
      "Brace the trunk before each rep so the hinge comes from the hips, not the low back."
    ],
    "executionInstructions": [
      "Push the hips back until hamstrings load while the spine position stays unchanged.",
      "Return by squeezing the glutes and bringing the hips through without leaning back."
    ],
    "breathingInstructions": [
      "Exhale through hard efforts and regain control during rest.",
      "Start each round only when breathing has settled enough to repeat quality."
    ],
    "safetyNotes": [
      "Stop if back position changes, symptoms radiate, or hinge/carry loading feels sharp.",
      "Use a smaller range or substitute if shoulder pinching, instability, or pain appears.",
      "Intervals should remain repeatable; stop before form becomes sloppy or symptoms climb."
    ],
    "defaultPrescriptionRanges": {
      "rounds": {
        "min": 4,
        "max": 8
      },
      "workSeconds": {
        "min": 20,
        "max": 45
      },
      "restIntervalSeconds": {
        "min": 30,
        "max": 60
      },
      "rpe": {
        "min": 5,
        "max": 7
      }
    }
  },
  {
    "id": "kettlebell_swing",
    "name": "Kettlebell Swing",
    "summary": "Ballistic hip hinge for power endurance.",
    "coachingSummary": "Hinge, snap the hips, and avoid turning it into a squat raise.",
    "movementPatternIds": [
      "hinge"
    ],
    "primaryMuscleIds": [
      "glutes",
      "hamstrings"
    ],
    "secondaryMuscleIds": [
      "spinal_erectors",
      "forearms"
    ],
    "equipmentIds": [
      "kettlebell"
    ],
    "workoutTypeIds": [
      "power",
      "conditioning",
      "strength"
    ],
    "goalIds": [
      "limited_equipment",
      "low_impact_conditioning"
    ],
    "minExperience": "intermediate",
    "intensity": "moderate",
    "impact": "low",
    "contraindicationFlags": [
      "back_caution"
    ],
    "trackingMetricIds": [
      "sets_completed",
      "reps_completed",
      "actual_rpe",
      "rounds_completed",
      "work_seconds",
      "load_used"
    ],
    "defaultPrescriptionTemplateId": "conditioning_interval",
    "shortName": "Kettlebell Swing",
    "category": "power",
    "subPatternIds": [
      "ballistic_hip_hinge"
    ],
    "jointsInvolved": [
      "hips",
      "spine"
    ],
    "planeOfMotion": "sagittal",
    "equipmentRequiredIds": [
      "kettlebell"
    ],
    "equipmentOptionalIds": [],
    "setupType": "standing",
    "technicalComplexity": "high",
    "loadability": "moderate",
    "fatigueCost": "high",
    "spineLoading": "high",
    "kneeDemand": "low",
    "hipDemand": "high",
    "shoulderDemand": "low",
    "wristDemand": "low",
    "ankleDemand": "low",
    "balanceDemand": "moderate",
    "cardioDemand": "high",
    "spaceRequired": [
      "small_space"
    ],
    "homeFriendly": true,
    "gymFriendly": false,
    "beginnerFriendly": false,
    "regressionExerciseIds": [
      "romanian_deadlift",
      "glute_bridge"
    ],
    "progressionExerciseIds": [],
    "substitutionExerciseIds": [
      "romanian_deadlift",
      "sled_push"
    ],
    "setupInstructions": [
      "Set kettlebell close to the body and soften the knees before sending the hips back.",
      "Brace the trunk before each rep so the hinge comes from the hips, not the low back."
    ],
    "executionInstructions": [
      "Push the hips back until hamstrings load while the spine position stays unchanged.",
      "Return by squeezing the glutes and bringing the hips through without leaning back."
    ],
    "breathingInstructions": [
      "Exhale through hard efforts and regain control during rest.",
      "Start each round only when breathing has settled enough to repeat quality."
    ],
    "safetyNotes": [
      "Stop if back position changes, symptoms radiate, or hinge/carry loading feels sharp.",
      "Intervals should remain repeatable; stop before form becomes sloppy or symptoms climb."
    ],
    "defaultPrescriptionRanges": {
      "rounds": {
        "min": 4,
        "max": 8
      },
      "workSeconds": {
        "min": 20,
        "max": 45
      },
      "restIntervalSeconds": {
        "min": 30,
        "max": 60
      },
      "rpe": {
        "min": 5,
        "max": 7
      }
    }
  },
  {
    "id": "box_jump",
    "name": "Box Jump",
    "summary": "Vertical jump to a box.",
    "coachingSummary": "Jump only while landings are quiet and pain-free.",
    "movementPatternIds": [
      "jump_land"
    ],
    "primaryMuscleIds": [
      "quads",
      "glutes",
      "calves"
    ],
    "secondaryMuscleIds": [
      "full_body"
    ],
    "equipmentIds": [
      "plyo_box"
    ],
    "workoutTypeIds": [
      "power"
    ],
    "goalIds": [
      "boxing_support"
    ],
    "minExperience": "intermediate",
    "intensity": "moderate",
    "impact": "moderate",
    "contraindicationFlags": [
      "no_jumping",
      "knee_caution"
    ],
    "trackingMetricIds": [
      "sets_completed",
      "reps_completed",
      "movement_quality",
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "power_quality",
    "shortName": "Box Jump",
    "category": "power",
    "subPatternIds": [
      "elastic_lower_leg"
    ],
    "jointsInvolved": [
      "hips",
      "knees",
      "ankles"
    ],
    "planeOfMotion": "sagittal",
    "equipmentRequiredIds": [
      "plyo_box"
    ],
    "equipmentOptionalIds": [],
    "setupType": "supported",
    "technicalComplexity": "high",
    "loadability": "low",
    "fatigueCost": "high",
    "spineLoading": "none",
    "kneeDemand": "high",
    "hipDemand": "low",
    "shoulderDemand": "low",
    "wristDemand": "low",
    "ankleDemand": "high",
    "balanceDemand": "low",
    "cardioDemand": "moderate",
    "spaceRequired": [
      "open_space"
    ],
    "homeFriendly": true,
    "gymFriendly": false,
    "beginnerFriendly": false,
    "regressionExerciseIds": [
      "step_up",
      "pogo_hop"
    ],
    "progressionExerciseIds": [],
    "substitutionExerciseIds": [
      "step_up",
      "sled_push"
    ],
    "setupInstructions": [
      "Set up in a stable start position with the target joints pain-free.",
      "Confirm the first rep can be performed without rushing or compensation."
    ],
    "executionInstructions": [
      "Keep contacts quiet and springy with knees and ankles aligned.",
      "Stop when landing quality, rhythm, or lower-leg comfort drops."
    ],
    "breathingInstructions": [
      "Use steady nasal or quiet mouth breathing.",
      "Do not hold the breath during low-intensity mobility or control work."
    ],
    "safetyNotes": [
      "Skip or regress if knee pain increases during the set or after the session.",
      "Do not use when jump or landing restrictions are active."
    ],
    "defaultPrescriptionRanges": {
      "sets": {
        "min": 3,
        "max": 5
      },
      "reps": {
        "min": 3,
        "max": 5
      },
      "rpe": {
        "min": 5,
        "max": 7
      },
      "restSeconds": {
        "min": 90,
        "max": 150
      }
    }
  },
  {
    "id": "pogo_hop",
    "name": "Pogo Hop",
    "summary": "Low-amplitude ankle stiffness drill.",
    "coachingSummary": "Keep contacts quiet and stop on Achilles, ankle, or knee pain.",
    "movementPatternIds": [
      "jump_land",
      "ankle_mobility"
    ],
    "primaryMuscleIds": [
      "calves",
      "feet_intrinsics"
    ],
    "secondaryMuscleIds": [
      "quads"
    ],
    "equipmentIds": [
      "bodyweight"
    ],
    "workoutTypeIds": [
      "power",
      "conditioning"
    ],
    "goalIds": [
      "boxing_support"
    ],
    "minExperience": "intermediate",
    "intensity": "moderate",
    "impact": "moderate",
    "contraindicationFlags": [
      "no_jumping",
      "knee_caution"
    ],
    "trackingMetricIds": [
      "sets_completed",
      "movement_quality",
      "range_quality"
    ],
    "defaultPrescriptionTemplateId": "power_quality",
    "shortName": "Pogo Hop",
    "category": "power",
    "subPatternIds": [
      "elastic_lower_leg",
      "ankle_dorsiflexion_control"
    ],
    "jointsInvolved": [
      "hips",
      "knees",
      "ankles"
    ],
    "planeOfMotion": "sagittal",
    "equipmentRequiredIds": [
      "bodyweight"
    ],
    "equipmentOptionalIds": [],
    "setupType": "standing",
    "technicalComplexity": "high",
    "loadability": "low",
    "fatigueCost": "high",
    "spineLoading": "none",
    "kneeDemand": "high",
    "hipDemand": "low",
    "shoulderDemand": "low",
    "wristDemand": "low",
    "ankleDemand": "high",
    "balanceDemand": "low",
    "cardioDemand": "high",
    "spaceRequired": [
      "open_space"
    ],
    "homeFriendly": true,
    "gymFriendly": false,
    "beginnerFriendly": false,
    "regressionExerciseIds": [
      "ankle_rocker"
    ],
    "progressionExerciseIds": [
      "box_jump"
    ],
    "substitutionExerciseIds": [
      "ankle_rocker",
      "jump_rope_easy"
    ],
    "setupInstructions": [
      "Start from a supported position where the target joint can move without compensation.",
      "Use a small range first, then expand only if symptoms stay quiet."
    ],
    "executionInstructions": [
      "Keep contacts quiet and springy with knees and ankles aligned.",
      "Stop when landing quality, rhythm, or lower-leg comfort drops."
    ],
    "breathingInstructions": [
      "Use steady nasal or quiet mouth breathing.",
      "Do not hold the breath during low-intensity mobility or control work."
    ],
    "safetyNotes": [
      "Skip or regress if knee pain increases during the set or after the session.",
      "Do not use when jump or landing restrictions are active."
    ],
    "defaultPrescriptionRanges": {
      "sets": {
        "min": 3,
        "max": 5
      },
      "reps": {
        "min": 3,
        "max": 5
      },
      "rpe": {
        "min": 5,
        "max": 7
      },
      "restSeconds": {
        "min": 90,
        "max": 150
      }
    }
  },
  {
    "id": "burpee",
    "name": "Burpee",
    "summary": "Bodyweight squat, floor transition, push-up, and jump conditioning movement.",
    "coachingSummary": "Use only when jumping, wrists, shoulders, and floor transitions are all tolerated.",
    "movementPatternIds": [
      "squat",
      "horizontal_push",
      "jump_land"
    ],
    "primaryMuscleIds": [
      "full_body",
      "aerobic_system"
    ],
    "secondaryMuscleIds": [
      "chest",
      "triceps",
      "quads",
      "core"
    ],
    "equipmentIds": [
      "bodyweight",
      "open_space"
    ],
    "workoutTypeIds": [
      "conditioning",
      "bodyweight_strength"
    ],
    "goalIds": [
      "no_equipment",
      "boxing_support"
    ],
    "minExperience": "intermediate",
    "intensity": "hard",
    "impact": "high",
    "contraindicationFlags": [
      "no_jumping",
      "wrist_caution",
      "shoulder_caution",
      "knee_caution"
    ],
    "trackingMetricIds": [
      "rounds_completed",
      "reps_completed",
      "actual_rpe",
      "movement_quality",
      "work_seconds"
    ],
    "defaultPrescriptionTemplateId": "hiit_interval",
    "shortName": "Burpee",
    "category": "conditioning",
    "subPatternIds": [
      "bodyweight_squat_pattern",
      "bodyweight_press",
      "elastic_lower_leg"
    ],
    "jointsInvolved": [
      "hips",
      "knees",
      "ankles",
      "shoulders",
      "elbows",
      "wrists"
    ],
    "planeOfMotion": "sagittal",
    "equipmentRequiredIds": [
      "bodyweight"
    ],
    "equipmentOptionalIds": [
      "open_space"
    ],
    "setupType": "standing",
    "technicalComplexity": "low",
    "loadability": "low",
    "fatigueCost": "high",
    "spineLoading": "moderate",
    "kneeDemand": "high",
    "hipDemand": "high",
    "shoulderDemand": "high",
    "wristDemand": "high",
    "ankleDemand": "high",
    "balanceDemand": "moderate",
    "cardioDemand": "high",
    "spaceRequired": [
      "open_space"
    ],
    "homeFriendly": true,
    "gymFriendly": true,
    "beginnerFriendly": false,
    "regressionExerciseIds": [
      "bodyweight_squat",
      "incline_push_up"
    ],
    "progressionExerciseIds": [],
    "substitutionExerciseIds": [
      "sled_push",
      "stationary_bike_zone2",
      "incline_push_up"
    ],
    "setupInstructions": [
      "Set feet in a stable squat stance and position open_space so the torso can stay braced.",
      "Choose a depth target that is pain-free before the first working rep."
    ],
    "executionInstructions": [
      "Descend under control with knees tracking over the middle toes.",
      "Stand by driving the floor away while keeping the ribs stacked and feet rooted."
    ],
    "breathingInstructions": [
      "Inhale and brace before the hard part of each rep.",
      "Exhale through the finish without losing trunk position."
    ],
    "safetyNotes": [
      "Skip or regress if knee pain increases during the set or after the session.",
      "Use a smaller range or substitute if shoulder pinching, instability, or pain appears.",
      "Use a neutral wrist option or substitute if wrist pressure becomes painful.",
      "Do not use when jump or landing restrictions are active."
    ],
    "defaultPrescriptionRanges": {
      "rounds": {
        "min": 4,
        "max": 8
      },
      "workSeconds": {
        "min": 20,
        "max": 40
      },
      "restIntervalSeconds": {
        "min": 40,
        "max": 90
      },
      "rpe": {
        "min": 7,
        "max": 9
      }
    }
  },
  {
    "id": "battle_rope_wave",
    "name": "Battle Rope Wave",
    "summary": "Low-impact upper-body conditioning.",
    "coachingSummary": "Keep ribs down and rhythm steady.",
    "movementPatternIds": [
      "horizontal_push",
      "breathing"
    ],
    "primaryMuscleIds": [
      "shoulders",
      "aerobic_system"
    ],
    "secondaryMuscleIds": [
      "forearms",
      "core"
    ],
    "equipmentIds": [
      "battle_rope"
    ],
    "workoutTypeIds": [
      "conditioning",
      "low_impact_conditioning",
      "boxing_support"
    ],
    "goalIds": [
      "low_impact_conditioning",
      "boxing_support"
    ],
    "minExperience": "beginner",
    "intensity": "moderate",
    "impact": "none",
    "contraindicationFlags": [
      "shoulder_caution"
    ],
    "trackingMetricIds": [
      "work_seconds",
      "rounds_completed",
      "actual_rpe",
      "breathing_quality"
    ],
    "defaultPrescriptionTemplateId": "conditioning_interval",
    "shortName": "Battle Rope Wave",
    "category": "conditioning",
    "subPatternIds": [
      "loaded_horizontal_press",
      "parasympathetic_breathing"
    ],
    "jointsInvolved": [
      "spine",
      "shoulders",
      "elbows",
      "wrists"
    ],
    "planeOfMotion": [
      "sagittal",
      "static"
    ],
    "equipmentRequiredIds": [
      "battle_rope"
    ],
    "equipmentOptionalIds": [],
    "setupType": "floor",
    "technicalComplexity": "low",
    "loadability": "moderate",
    "fatigueCost": "high",
    "spineLoading": "low",
    "kneeDemand": "low",
    "hipDemand": "low",
    "shoulderDemand": "high",
    "wristDemand": "high",
    "ankleDemand": "low",
    "balanceDemand": "low",
    "cardioDemand": "high",
    "spaceRequired": [
      "open_space"
    ],
    "homeFriendly": false,
    "gymFriendly": true,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "band_pull_apart"
    ],
    "progressionExerciseIds": [
      "medicine_ball_slam"
    ],
    "substitutionExerciseIds": [
      "stationary_bike_zone2",
      "sled_push"
    ],
    "setupInstructions": [
      "Set hands and battle_rope so shoulders start comfortable and ribs stay stacked over the pelvis.",
      "Use a range that avoids pinching at the front of the shoulder."
    ],
    "executionInstructions": [
      "Press smoothly without shrugging or losing trunk position.",
      "Stop the set when shoulder comfort, wrist position, or rep speed changes."
    ],
    "breathingInstructions": [
      "Inhale quietly through the nose when possible.",
      "Use a longer exhale to downshift effort and track whether symptoms improve."
    ],
    "safetyNotes": [
      "Use a smaller range or substitute if shoulder pinching, instability, or pain appears.",
      "Intervals should remain repeatable; stop before form becomes sloppy or symptoms climb."
    ],
    "defaultPrescriptionRanges": {
      "rounds": {
        "min": 4,
        "max": 8
      },
      "workSeconds": {
        "min": 20,
        "max": 45
      },
      "restIntervalSeconds": {
        "min": 30,
        "max": 60
      },
      "rpe": {
        "min": 5,
        "max": 7
      }
    }
  },
  {
    "id": "thoracic_open_book",
    "name": "Thoracic Open Book",
    "summary": "Side-lying thoracic rotation drill.",
    "coachingSummary": "Rotate through the upper back, not by forcing the shoulder.",
    "movementPatternIds": [
      "thoracic_mobility",
      "rotation"
    ],
    "primaryMuscleIds": [
      "obliques",
      "spinal_erectors"
    ],
    "secondaryMuscleIds": [
      "shoulders"
    ],
    "equipmentIds": [
      "bodyweight",
      "mat"
    ],
    "workoutTypeIds": [
      "mobility",
      "recovery"
    ],
    "goalIds": [
      "mobility",
      "recovery",
      "no_equipment"
    ],
    "minExperience": "beginner",
    "intensity": "recovery",
    "impact": "none",
    "contraindicationFlags": [
      "shoulder_caution"
    ],
    "trackingMetricIds": [
      "sets_completed",
      "reps_completed",
      "range_quality"
    ],
    "defaultPrescriptionTemplateId": "mobility_hold",
    "shortName": "Thoracic Open Book",
    "category": "mobility",
    "subPatternIds": [
      "thoracic_rotation_extension",
      "controlled_rotation"
    ],
    "jointsInvolved": [
      "spine",
      "shoulders"
    ],
    "planeOfMotion": "transverse",
    "equipmentRequiredIds": [
      "bodyweight"
    ],
    "equipmentOptionalIds": [
      "mat"
    ],
    "setupType": "floor",
    "technicalComplexity": "moderate",
    "loadability": "low",
    "fatigueCost": "low",
    "spineLoading": "moderate",
    "kneeDemand": "low",
    "hipDemand": "low",
    "shoulderDemand": "high",
    "wristDemand": "low",
    "ankleDemand": "low",
    "balanceDemand": "high",
    "cardioDemand": "low",
    "spaceRequired": [
      "open_space"
    ],
    "homeFriendly": true,
    "gymFriendly": false,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "cat_cow"
    ],
    "progressionExerciseIds": [
      "worlds_greatest_stretch"
    ],
    "substitutionExerciseIds": [
      "cat_cow",
      "band_pull_apart"
    ],
    "setupInstructions": [
      "Start from a supported position where the target joint can move without compensation.",
      "Use a small range first, then expand only if symptoms stay quiet."
    ],
    "executionInstructions": [
      "Move slowly through the available range and pause where control is weakest.",
      "Keep the target joint moving without forcing neighboring joints to compensate."
    ],
    "breathingInstructions": [
      "Use steady nasal or quiet mouth breathing.",
      "Do not hold the breath during low-intensity mobility or control work."
    ],
    "safetyNotes": [
      "Use a smaller range or substitute if shoulder pinching, instability, or pain appears."
    ],
    "defaultPrescriptionRanges": {
      "sets": {
        "min": 1,
        "max": 3
      },
      "reps": {
        "target": "4-8 controlled reps per side"
      },
      "holdSeconds": {
        "min": 10,
        "max": 30
      },
      "rpe": {
        "min": 1,
        "max": 3
      },
      "targetJoints": [
        "spine",
        "shoulders"
      ],
      "targetTissues": [
        "obliques",
        "spinal_erectors"
      ],
      "rangeOfMotionIntent": "Increase usable pain-free range while keeping control at the end position."
    }
  },
  {
    "id": "band_pull_apart",
    "name": "Band Pull-Apart",
    "summary": "Shoulder and upper-back prehab.",
    "coachingSummary": "Keep ribs down and pull the band without shrugging.",
    "movementPatternIds": [
      "shoulder_prehab",
      "horizontal_pull"
    ],
    "primaryMuscleIds": [
      "rear_delts",
      "upper_back"
    ],
    "secondaryMuscleIds": [
      "rotator_cuff"
    ],
    "equipmentIds": [
      "resistance_band"
    ],
    "workoutTypeIds": [
      "mobility",
      "recovery",
      "boxing_support"
    ],
    "goalIds": [
      "mobility",
      "recovery",
      "boxing_support",
      "limited_equipment"
    ],
    "minExperience": "beginner",
    "intensity": "low",
    "impact": "none",
    "contraindicationFlags": [],
    "trackingMetricIds": [
      "sets_completed",
      "reps_completed",
      "movement_quality",
      "range_quality"
    ],
    "defaultPrescriptionTemplateId": "shoulder_prehab",
    "shortName": "Band Pull-Apart",
    "category": "prehab",
    "subPatternIds": [
      "scapular_rotator_cuff_control",
      "loaded_row"
    ],
    "jointsInvolved": [
      "shoulders",
      "elbows",
      "wrists"
    ],
    "planeOfMotion": "sagittal",
    "equipmentRequiredIds": [
      "resistance_band"
    ],
    "equipmentOptionalIds": [],
    "setupType": "standing",
    "technicalComplexity": "low",
    "loadability": "low",
    "fatigueCost": "low",
    "spineLoading": "none",
    "kneeDemand": "low",
    "hipDemand": "low",
    "shoulderDemand": "high",
    "wristDemand": "moderate",
    "ankleDemand": "low",
    "balanceDemand": "low",
    "cardioDemand": "low",
    "spaceRequired": [
      "small_space"
    ],
    "homeFriendly": true,
    "gymFriendly": false,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "wall_slide"
    ],
    "progressionExerciseIds": [
      "band_external_rotation"
    ],
    "substitutionExerciseIds": [
      "wall_slide",
      "band_external_rotation"
    ],
    "setupInstructions": [
      "Set the handle, band, or support so the first pull starts with relaxed neck and active shoulder blades.",
      "Pick a load or body angle that allows a controlled pause."
    ],
    "executionInstructions": [
      "Start each rep by setting the shoulder blade, then pull without neck tension.",
      "Control the return instead of letting the load pull posture out of position."
    ],
    "breathingInstructions": [
      "Use steady nasal or quiet mouth breathing.",
      "Do not hold the breath during low-intensity mobility or control work."
    ],
    "safetyNotes": [
      "Stop the exercise if pain, dizziness, or unusual symptoms appear."
    ],
    "defaultPrescriptionRanges": {
      "sets": {
        "min": 1,
        "max": 3
      },
      "reps": {
        "min": 10,
        "max": 15
      },
      "rpe": {
        "min": 2,
        "max": 4
      },
      "targetJoints": [
        "shoulders",
        "scapulae"
      ],
      "targetTissues": [
        "rotator_cuff",
        "rear_delts",
        "upper_back"
      ],
      "rangeOfMotionIntent": "Restore shoulder control without pinching or fatigue."
    }
  },
  {
    "id": "band_external_rotation",
    "name": "Band External Rotation",
    "summary": "Rotator cuff control exercise.",
    "coachingSummary": "Keep elbow pinned and move only through pain-free range.",
    "movementPatternIds": [
      "shoulder_prehab"
    ],
    "primaryMuscleIds": [
      "rotator_cuff"
    ],
    "secondaryMuscleIds": [
      "rear_delts"
    ],
    "equipmentIds": [
      "resistance_band"
    ],
    "workoutTypeIds": [
      "mobility",
      "recovery",
      "boxing_support"
    ],
    "goalIds": [
      "mobility",
      "recovery",
      "boxing_support"
    ],
    "minExperience": "beginner",
    "intensity": "recovery",
    "impact": "none",
    "contraindicationFlags": [],
    "trackingMetricIds": [
      "sets_completed",
      "reps_completed",
      "movement_quality",
      "range_quality"
    ],
    "defaultPrescriptionTemplateId": "shoulder_prehab",
    "shortName": "Band External Rotation",
    "category": "prehab",
    "subPatternIds": [
      "scapular_rotator_cuff_control"
    ],
    "jointsInvolved": [
      "shoulders",
      "elbows",
      "wrists"
    ],
    "planeOfMotion": "sagittal",
    "equipmentRequiredIds": [
      "resistance_band"
    ],
    "equipmentOptionalIds": [],
    "setupType": "standing",
    "technicalComplexity": "low",
    "loadability": "low",
    "fatigueCost": "low",
    "spineLoading": "none",
    "kneeDemand": "low",
    "hipDemand": "low",
    "shoulderDemand": "high",
    "wristDemand": "moderate",
    "ankleDemand": "low",
    "balanceDemand": "low",
    "cardioDemand": "low",
    "spaceRequired": [
      "small_space"
    ],
    "homeFriendly": true,
    "gymFriendly": false,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "wall_slide"
    ],
    "progressionExerciseIds": [
      "band_pull_apart"
    ],
    "substitutionExerciseIds": [
      "wall_slide",
      "band_pull_apart"
    ],
    "setupInstructions": [
      "Start from a supported position where the target joint can move without compensation.",
      "Use a small range first, then expand only if symptoms stay quiet."
    ],
    "executionInstructions": [
      "Move slowly through the available range and pause where control is weakest.",
      "Keep the target joint moving without forcing neighboring joints to compensate."
    ],
    "breathingInstructions": [
      "Use steady nasal or quiet mouth breathing.",
      "Do not hold the breath during low-intensity mobility or control work."
    ],
    "safetyNotes": [
      "Stop the exercise if pain, dizziness, or unusual symptoms appear."
    ],
    "defaultPrescriptionRanges": {
      "sets": {
        "min": 1,
        "max": 3
      },
      "reps": {
        "min": 10,
        "max": 15
      },
      "rpe": {
        "min": 2,
        "max": 4
      },
      "targetJoints": [
        "shoulders",
        "scapulae"
      ],
      "targetTissues": [
        "rotator_cuff",
        "rear_delts",
        "upper_back"
      ],
      "rangeOfMotionIntent": "Restore shoulder control without pinching or fatigue."
    }
  },
  {
    "id": "cable_woodchop",
    "name": "Cable Woodchop",
    "summary": "Controlled rotational cable pattern.",
    "coachingSummary": "Rotate through hips and trunk without yanking through the back.",
    "movementPatternIds": [
      "rotation"
    ],
    "primaryMuscleIds": [
      "obliques"
    ],
    "secondaryMuscleIds": [
      "shoulders",
      "glutes"
    ],
    "equipmentIds": [
      "cable_machine"
    ],
    "workoutTypeIds": [
      "core_durability",
      "boxing_support",
      "hypertrophy"
    ],
    "goalIds": [
      "core_durability",
      "boxing_support",
      "full_gym_strength"
    ],
    "minExperience": "beginner",
    "intensity": "moderate",
    "impact": "none",
    "contraindicationFlags": [
      "back_caution"
    ],
    "trackingMetricIds": [
      "sets_completed",
      "reps_completed",
      "load_used",
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "core_control",
    "shortName": "Cable Woodchop",
    "category": "strength",
    "subPatternIds": [
      "controlled_rotation"
    ],
    "jointsInvolved": [
      "spine",
      "shoulders"
    ],
    "planeOfMotion": "transverse",
    "equipmentRequiredIds": [
      "cable_machine"
    ],
    "equipmentOptionalIds": [],
    "setupType": "standing",
    "technicalComplexity": "moderate",
    "loadability": "moderate",
    "fatigueCost": "moderate",
    "spineLoading": "high",
    "kneeDemand": "low",
    "hipDemand": "low",
    "shoulderDemand": "high",
    "wristDemand": "low",
    "ankleDemand": "low",
    "balanceDemand": "high",
    "cardioDemand": "low",
    "spaceRequired": [
      "machine_station"
    ],
    "homeFriendly": false,
    "gymFriendly": true,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "pallof_press"
    ],
    "progressionExerciseIds": [
      "med_ball_rotational_throw"
    ],
    "substitutionExerciseIds": [
      "pallof_press",
      "medicine_ball_slam"
    ],
    "setupInstructions": [
      "Set up in a stable start position with the target joints pain-free.",
      "Confirm the first rep can be performed without rushing or compensation."
    ],
    "executionInstructions": [
      "Move with controlled tempo and finish each rep in the same position you started.",
      "Keep effort repeatable across the full prescription."
    ],
    "breathingInstructions": [
      "Use steady nasal or quiet mouth breathing.",
      "Do not hold the breath during low-intensity mobility or control work."
    ],
    "safetyNotes": [
      "Stop if back position changes, symptoms radiate, or hinge/carry loading feels sharp."
    ],
    "defaultPrescriptionRanges": {
      "sets": {
        "min": 2,
        "max": 3
      },
      "reps": {
        "min": 6,
        "max": 10
      },
      "rpe": {
        "min": 3,
        "max": 6
      },
      "restSeconds": {
        "min": 30,
        "max": 60
      }
    }
  },
  {
    "id": "jump_rope_easy",
    "name": "Easy Jump Rope",
    "summary": "Rhythm and light conditioning with contacts.",
    "coachingSummary": "Keep contacts quiet and stop on knee, ankle, or foot pain.",
    "movementPatternIds": [
      "jump_land",
      "locomotion"
    ],
    "primaryMuscleIds": [
      "calves",
      "aerobic_system"
    ],
    "secondaryMuscleIds": [
      "shoulders",
      "feet_intrinsics"
    ],
    "equipmentIds": [
      "jump_rope"
    ],
    "workoutTypeIds": [
      "conditioning"
    ],
    "goalIds": [
      "boxing_support"
    ],
    "minExperience": "beginner",
    "intensity": "moderate",
    "impact": "moderate",
    "contraindicationFlags": [
      "no_jumping",
      "knee_caution"
    ],
    "trackingMetricIds": [
      "duration_minutes",
      "actual_rpe",
      "movement_quality",
      "rounds_completed",
      "work_seconds"
    ],
    "defaultPrescriptionTemplateId": "hiit_interval",
    "shortName": "Jump Rope",
    "category": "conditioning",
    "subPatternIds": [
      "elastic_lower_leg",
      "interval_locomotion"
    ],
    "jointsInvolved": [
      "hips",
      "knees",
      "ankles"
    ],
    "planeOfMotion": "sagittal",
    "equipmentRequiredIds": [
      "jump_rope"
    ],
    "equipmentOptionalIds": [],
    "setupType": "locomotion",
    "technicalComplexity": "low",
    "loadability": "low",
    "fatigueCost": "moderate",
    "spineLoading": "none",
    "kneeDemand": "high",
    "hipDemand": "moderate",
    "shoulderDemand": "low",
    "wristDemand": "low",
    "ankleDemand": "high",
    "balanceDemand": "moderate",
    "cardioDemand": "high",
    "spaceRequired": [
      "lane",
      "open_space"
    ],
    "homeFriendly": true,
    "gymFriendly": false,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "pogo_hop",
      "ankle_rocker"
    ],
    "progressionExerciseIds": [
      "box_jump"
    ],
    "substitutionExerciseIds": [
      "incline_walk",
      "stationary_bike_zone2"
    ],
    "setupInstructions": [
      "Set up the jump_rope path or machine and confirm cadence feels smooth before starting the working interval.",
      "Begin below target effort for the first minute so intensity can settle gradually."
    ],
    "executionInstructions": [
      "Build into the target effort gradually and keep the rhythm repeatable.",
      "Reduce pace or resistance if breathing becomes sharp or mechanics deteriorate."
    ],
    "breathingInstructions": [
      "Use steady nasal or quiet mouth breathing.",
      "Do not hold the breath during low-intensity mobility or control work."
    ],
    "safetyNotes": [
      "Skip or regress if knee pain increases during the set or after the session.",
      "Do not use when jump or landing restrictions are active."
    ],
    "defaultPrescriptionRanges": {
      "rounds": {
        "min": 4,
        "max": 8
      },
      "workSeconds": {
        "min": 20,
        "max": 40
      },
      "restIntervalSeconds": {
        "min": 40,
        "max": 90
      },
      "rpe": {
        "min": 7,
        "max": 9
      }
    }
  }
] satisfies Exercise[];
