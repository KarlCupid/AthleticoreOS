import type { Exercise } from '../../types.ts';

export const recoveryExercises = [
  {
    "id": "bodyweight_squat",
    "name": "Bodyweight Squat",
    "summary": "Unloaded squat for strength, warm-up, or no-equipment sessions.",
    "coachingSummary": "Use pain-free depth, feet planted, and steady tempo.",
    "movementPatternIds": [
      "squat"
    ],
    "primaryMuscleIds": [
      "quads",
      "glutes"
    ],
    "secondaryMuscleIds": [
      "core"
    ],
    "equipmentIds": [
      "bodyweight"
    ],
    "workoutTypeIds": [
      "strength",
      "bodyweight_strength",
      "recovery"
    ],
    "goalIds": [
      "beginner_strength",
      "no_equipment",
      "limited_equipment",
      "return_to_training"
    ],
    "minExperience": "beginner",
    "intensity": "low",
    "impact": "none",
    "contraindicationFlags": [
      "knee_caution"
    ],
    "trackingMetricIds": [
      "sets_completed",
      "reps_completed",
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "strength_beginner",
    "shortName": "Bodyweight Squat",
    "category": "strength",
    "subPatternIds": [
      "bodyweight_squat_pattern"
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
    "technicalComplexity": "low",
    "loadability": "low",
    "fatigueCost": "moderate",
    "spineLoading": "moderate",
    "kneeDemand": "high",
    "hipDemand": "high",
    "shoulderDemand": "low",
    "wristDemand": "low",
    "ankleDemand": "moderate",
    "balanceDemand": "moderate",
    "cardioDemand": "low",
    "spaceRequired": [
      "small_space"
    ],
    "homeFriendly": true,
    "gymFriendly": false,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "box_squat"
    ],
    "progressionExerciseIds": [
      "goblet_squat",
      "split_squat"
    ],
    "substitutionExerciseIds": [
      "box_squat",
      "reverse_lunge"
    ],
    "setupInstructions": [
      "Set feet in a stable squat stance and position bodyweight so the torso can stay braced.",
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
      "Skip or regress if knee pain increases during the set or after the session."
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
    "id": "box_squat",
    "name": "Box Squat",
    "summary": "Squat to a box for range control and confidence.",
    "coachingSummary": "Control to the box, keep tension, and stand without rocking.",
    "movementPatternIds": [
      "squat"
    ],
    "primaryMuscleIds": [
      "quads",
      "glutes"
    ],
    "secondaryMuscleIds": [
      "core"
    ],
    "equipmentIds": [
      "bodyweight",
      "plyo_box",
      "dumbbells"
    ],
    "workoutTypeIds": [
      "strength",
      "recovery",
      "lower_strength"
    ],
    "goalIds": [
      "beginner_strength",
      "return_to_training",
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
    "defaultPrescriptionTemplateId": "strength_beginner",
    "shortName": "Box Squat",
    "category": "strength",
    "subPatternIds": [
      "bodyweight_squat_pattern"
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
    "equipmentOptionalIds": [
      "plyo_box",
      "dumbbells"
    ],
    "setupType": "supported",
    "technicalComplexity": "low",
    "loadability": "moderate",
    "fatigueCost": "moderate",
    "spineLoading": "moderate",
    "kneeDemand": "high",
    "hipDemand": "high",
    "shoulderDemand": "low",
    "wristDemand": "low",
    "ankleDemand": "moderate",
    "balanceDemand": "moderate",
    "cardioDemand": "low",
    "spaceRequired": [
      "small_space"
    ],
    "homeFriendly": true,
    "gymFriendly": false,
    "beginnerFriendly": true,
    "regressionExerciseIds": [],
    "progressionExerciseIds": [
      "bodyweight_squat",
      "goblet_squat"
    ],
    "substitutionExerciseIds": [
      "bodyweight_squat",
      "leg_press"
    ],
    "setupInstructions": [
      "Set feet in a stable squat stance and position plyo_box, dumbbells so the torso can stay braced.",
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
    "id": "glute_bridge",
    "name": "Glute Bridge",
    "summary": "Floor-based hip extension.",
    "coachingSummary": "Drive through heels and keep ribs down at lockout.",
    "movementPatternIds": [
      "hinge"
    ],
    "primaryMuscleIds": [
      "glutes",
      "hamstrings"
    ],
    "secondaryMuscleIds": [
      "core"
    ],
    "equipmentIds": [
      "bodyweight",
      "resistance_band"
    ],
    "workoutTypeIds": [
      "strength",
      "recovery",
      "bodyweight_strength"
    ],
    "goalIds": [
      "beginner_strength",
      "no_equipment",
      "recovery",
      "return_to_training"
    ],
    "minExperience": "beginner",
    "intensity": "low",
    "impact": "none",
    "contraindicationFlags": [],
    "trackingMetricIds": [
      "sets_completed",
      "reps_completed",
      "movement_quality",
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "strength_beginner",
    "shortName": "Glute Bridge",
    "category": "strength",
    "subPatternIds": [
      "controlled_hip_hinge"
    ],
    "jointsInvolved": [
      "hips",
      "spine"
    ],
    "planeOfMotion": "sagittal",
    "equipmentRequiredIds": [
      "bodyweight"
    ],
    "equipmentOptionalIds": [
      "resistance_band"
    ],
    "setupType": "standing",
    "technicalComplexity": "moderate",
    "loadability": "low",
    "fatigueCost": "moderate",
    "spineLoading": "moderate",
    "kneeDemand": "low",
    "hipDemand": "high",
    "shoulderDemand": "low",
    "wristDemand": "low",
    "ankleDemand": "low",
    "balanceDemand": "moderate",
    "cardioDemand": "low",
    "spaceRequired": [
      "small_space"
    ],
    "homeFriendly": true,
    "gymFriendly": false,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "hip_hinge_dowel"
    ],
    "progressionExerciseIds": [
      "romanian_deadlift",
      "kettlebell_swing"
    ],
    "substitutionExerciseIds": [
      "hip_hinge_dowel",
      "bodyweight_squat"
    ],
    "setupInstructions": [
      "Set resistance_band close to the body and soften the knees before sending the hips back.",
      "Brace the trunk before each rep so the hinge comes from the hips, not the low back."
    ],
    "executionInstructions": [
      "Push the hips back until hamstrings load while the spine position stays unchanged.",
      "Return by squeezing the glutes and bringing the hips through without leaning back."
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
    "id": "incline_push_up",
    "name": "Incline Push-Up",
    "summary": "Regressed push-up using a bench or box.",
    "coachingSummary": "Use a height that allows clean reps without shoulder or wrist pain.",
    "movementPatternIds": [
      "horizontal_push",
      "anti_extension"
    ],
    "primaryMuscleIds": [
      "chest",
      "triceps"
    ],
    "secondaryMuscleIds": [
      "shoulders",
      "core"
    ],
    "equipmentIds": [
      "bodyweight",
      "bench",
      "plyo_box"
    ],
    "workoutTypeIds": [
      "strength",
      "bodyweight_strength",
      "recovery"
    ],
    "goalIds": [
      "beginner_strength",
      "no_equipment",
      "return_to_training"
    ],
    "minExperience": "beginner",
    "intensity": "low",
    "impact": "none",
    "contraindicationFlags": [
      "wrist_caution"
    ],
    "trackingMetricIds": [
      "sets_completed",
      "reps_completed",
      "movement_quality",
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "strength_beginner",
    "shortName": "Incline Push-Up",
    "category": "strength",
    "subPatternIds": [
      "bodyweight_press",
      "anterior_core_control"
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
      "bodyweight"
    ],
    "equipmentOptionalIds": [
      "bench",
      "plyo_box"
    ],
    "setupType": "bench",
    "technicalComplexity": "low",
    "loadability": "low",
    "fatigueCost": "moderate",
    "spineLoading": "low",
    "kneeDemand": "low",
    "hipDemand": "low",
    "shoulderDemand": "high",
    "wristDemand": "high",
    "ankleDemand": "low",
    "balanceDemand": "low",
    "cardioDemand": "low",
    "spaceRequired": [
      "small_space"
    ],
    "homeFriendly": true,
    "gymFriendly": true,
    "beginnerFriendly": true,
    "regressionExerciseIds": [],
    "progressionExerciseIds": [
      "push_up",
      "floor_press"
    ],
    "substitutionExerciseIds": [
      "push_up",
      "floor_press"
    ],
    "setupInstructions": [
      "Set hands and bench, plyo_box so shoulders start comfortable and ribs stay stacked over the pelvis.",
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
      "Use a neutral wrist option or substitute if wrist pressure becomes painful."
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
    "id": "band_row",
    "name": "Band Row",
    "summary": "Low-equipment row variation.",
    "coachingSummary": "Pause with shoulder blades back and ribs down.",
    "movementPatternIds": [
      "horizontal_pull"
    ],
    "primaryMuscleIds": [
      "upper_back",
      "lats"
    ],
    "secondaryMuscleIds": [
      "biceps",
      "rear_delts"
    ],
    "equipmentIds": [
      "resistance_band"
    ],
    "workoutTypeIds": [
      "strength",
      "hypertrophy",
      "recovery"
    ],
    "goalIds": [
      "limited_equipment",
      "recovery",
      "return_to_training"
    ],
    "minExperience": "beginner",
    "intensity": "low",
    "impact": "none",
    "contraindicationFlags": [],
    "trackingMetricIds": [
      "sets_completed",
      "reps_completed",
      "movement_quality",
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "strength_beginner",
    "shortName": "Band Row",
    "category": "strength",
    "subPatternIds": [
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
    "fatigueCost": "moderate",
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
    "regressionExerciseIds": [],
    "progressionExerciseIds": [
      "one_arm_dumbbell_row",
      "inverted_row"
    ],
    "substitutionExerciseIds": [
      "seated_cable_row",
      "one_arm_dumbbell_row"
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
    "id": "dead_bug",
    "name": "Dead Bug",
    "summary": "Supine anti-extension trunk control.",
    "coachingSummary": "Exhale, keep low back quiet, and move slowly.",
    "movementPatternIds": [
      "anti_extension"
    ],
    "primaryMuscleIds": [
      "transverse_abs",
      "rectus_abs"
    ],
    "secondaryMuscleIds": [
      "hip_flexors"
    ],
    "equipmentIds": [
      "bodyweight",
      "mat"
    ],
    "workoutTypeIds": [
      "core_durability",
      "recovery",
      "mobility"
    ],
    "goalIds": [
      "beginner_strength",
      "core_durability",
      "recovery",
      "no_equipment"
    ],
    "minExperience": "beginner",
    "intensity": "low",
    "impact": "none",
    "contraindicationFlags": [],
    "trackingMetricIds": [
      "sets_completed",
      "reps_completed",
      "movement_quality",
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "core_control",
    "shortName": "Dead Bug",
    "category": "strength",
    "subPatternIds": [
      "anterior_core_control"
    ],
    "jointsInvolved": [
      "spine"
    ],
    "planeOfMotion": "static",
    "equipmentRequiredIds": [
      "bodyweight"
    ],
    "equipmentOptionalIds": [
      "mat"
    ],
    "setupType": "floor",
    "technicalComplexity": "low",
    "loadability": "low",
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
      "mat"
    ],
    "homeFriendly": true,
    "gymFriendly": false,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "crocodile_breathing"
    ],
    "progressionExerciseIds": [
      "front_plank",
      "bird_dog"
    ],
    "substitutionExerciseIds": [
      "bird_dog",
      "front_plank"
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
    "id": "front_plank",
    "name": "Front Plank",
    "summary": "Anti-extension isometric trunk hold.",
    "coachingSummary": "Make a straight line and stop before low-back sag.",
    "movementPatternIds": [
      "anti_extension"
    ],
    "primaryMuscleIds": [
      "rectus_abs",
      "transverse_abs"
    ],
    "secondaryMuscleIds": [
      "shoulders",
      "glutes"
    ],
    "equipmentIds": [
      "bodyweight",
      "mat"
    ],
    "workoutTypeIds": [
      "core_durability",
      "bodyweight_strength",
      "recovery"
    ],
    "goalIds": [
      "beginner_strength",
      "no_equipment",
      "core_durability"
    ],
    "minExperience": "beginner",
    "intensity": "low",
    "impact": "none",
    "contraindicationFlags": [
      "shoulder_caution"
    ],
    "trackingMetricIds": [
      "duration_minutes",
      "actual_rpe",
      "movement_quality"
    ],
    "defaultPrescriptionTemplateId": "core_control",
    "shortName": "Front Plank",
    "category": "strength",
    "subPatternIds": [
      "anterior_core_control"
    ],
    "jointsInvolved": [
      "spine"
    ],
    "planeOfMotion": "static",
    "equipmentRequiredIds": [
      "bodyweight"
    ],
    "equipmentOptionalIds": [
      "mat"
    ],
    "setupType": "floor",
    "technicalComplexity": "low",
    "loadability": "low",
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
      "mat"
    ],
    "homeFriendly": true,
    "gymFriendly": false,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "dead_bug"
    ],
    "progressionExerciseIds": [
      "bear_crawl"
    ],
    "substitutionExerciseIds": [
      "dead_bug",
      "side_plank"
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
      "Use a smaller range or substitute if shoulder pinching, instability, or pain appears."
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
    "id": "side_plank",
    "name": "Side Plank",
    "summary": "Lateral trunk stability hold.",
    "coachingSummary": "Stack hips and keep pressure away from painful shoulders.",
    "movementPatternIds": [
      "anti_rotation"
    ],
    "primaryMuscleIds": [
      "obliques",
      "transverse_abs"
    ],
    "secondaryMuscleIds": [
      "shoulders",
      "glutes"
    ],
    "equipmentIds": [
      "bodyweight",
      "mat"
    ],
    "workoutTypeIds": [
      "core_durability",
      "bodyweight_strength",
      "recovery"
    ],
    "goalIds": [
      "core_durability",
      "no_equipment",
      "beginner_strength"
    ],
    "minExperience": "beginner",
    "intensity": "low",
    "impact": "none",
    "contraindicationFlags": [
      "shoulder_caution"
    ],
    "trackingMetricIds": [
      "duration_minutes",
      "movement_quality",
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "core_control",
    "shortName": "Side Plank",
    "category": "strength",
    "subPatternIds": [
      "rotary_stability"
    ],
    "jointsInvolved": [
      "spine"
    ],
    "planeOfMotion": "transverse",
    "equipmentRequiredIds": [
      "bodyweight"
    ],
    "equipmentOptionalIds": [
      "mat"
    ],
    "setupType": "floor",
    "technicalComplexity": "low",
    "loadability": "low",
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
      "mat"
    ],
    "homeFriendly": true,
    "gymFriendly": false,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "dead_bug"
    ],
    "progressionExerciseIds": [
      "suitcase_carry"
    ],
    "substitutionExerciseIds": [
      "pallof_press",
      "front_plank"
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
      "Use a smaller range or substitute if shoulder pinching, instability, or pain appears."
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
    "id": "bird_dog",
    "name": "Bird Dog",
    "summary": "Low-load trunk and hip control drill.",
    "coachingSummary": "Move slowly and keep the pelvis level.",
    "movementPatternIds": [
      "anti_rotation",
      "balance"
    ],
    "primaryMuscleIds": [
      "multifidus",
      "glutes"
    ],
    "secondaryMuscleIds": [
      "shoulders",
      "transverse_abs"
    ],
    "equipmentIds": [
      "bodyweight",
      "mat"
    ],
    "workoutTypeIds": [
      "mobility",
      "recovery",
      "core_durability"
    ],
    "goalIds": [
      "recovery",
      "mobility",
      "return_to_training",
      "no_equipment"
    ],
    "minExperience": "beginner",
    "intensity": "recovery",
    "impact": "none",
    "contraindicationFlags": [],
    "trackingMetricIds": [
      "sets_completed",
      "reps_completed",
      "movement_quality",
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "core_control",
    "shortName": "Bird Dog",
    "category": "balance",
    "subPatternIds": [
      "rotary_stability",
      "single_leg_postural_control"
    ],
    "jointsInvolved": [
      "hips",
      "ankles",
      "spine"
    ],
    "planeOfMotion": [
      "frontal",
      "transverse"
    ],
    "equipmentRequiredIds": [
      "bodyweight"
    ],
    "equipmentOptionalIds": [
      "mat"
    ],
    "setupType": "floor",
    "technicalComplexity": "low",
    "loadability": "low",
    "fatigueCost": "low",
    "spineLoading": "low",
    "kneeDemand": "low",
    "hipDemand": "low",
    "shoulderDemand": "low",
    "wristDemand": "low",
    "ankleDemand": "moderate",
    "balanceDemand": "high",
    "cardioDemand": "low",
    "spaceRequired": [
      "mat"
    ],
    "homeFriendly": true,
    "gymFriendly": false,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "dead_bug"
    ],
    "progressionExerciseIds": [
      "bear_crawl"
    ],
    "substitutionExerciseIds": [
      "dead_bug",
      "single_leg_balance"
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
    "id": "childs_pose_breathing",
    "name": "Childs Pose Breathing",
    "summary": "Low-stress breathing and back expansion drill.",
    "coachingSummary": "Long exhales, relaxed neck, and no forced stretch.",
    "movementPatternIds": [
      "breathing",
      "thoracic_mobility"
    ],
    "primaryMuscleIds": [
      "diaphragm"
    ],
    "secondaryMuscleIds": [
      "lats",
      "spinal_erectors"
    ],
    "equipmentIds": [
      "bodyweight",
      "mat"
    ],
    "workoutTypeIds": [
      "recovery",
      "mobility"
    ],
    "goalIds": [
      "recovery",
      "mobility",
      "no_equipment"
    ],
    "minExperience": "beginner",
    "intensity": "recovery",
    "impact": "none",
    "contraindicationFlags": [],
    "trackingMetricIds": [
      "duration_minutes",
      "breathing_quality",
      "symptom_change",
      "range_quality"
    ],
    "defaultPrescriptionTemplateId": "breathing_reset",
    "shortName": "Childs Pose Breathing",
    "category": "recovery",
    "subPatternIds": [
      "parasympathetic_breathing",
      "thoracic_rotation_extension"
    ],
    "jointsInvolved": [
      "spine"
    ],
    "planeOfMotion": [
      "transverse",
      "static"
    ],
    "equipmentRequiredIds": [
      "bodyweight"
    ],
    "equipmentOptionalIds": [
      "mat"
    ],
    "setupType": "floor",
    "technicalComplexity": "low",
    "loadability": "low",
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
      "mat"
    ],
    "homeFriendly": true,
    "gymFriendly": false,
    "beginnerFriendly": true,
    "regressionExerciseIds": [],
    "progressionExerciseIds": [
      "cat_cow",
      "crocodile_breathing"
    ],
    "substitutionExerciseIds": [
      "crocodile_breathing",
      "cat_cow"
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
      "Inhale quietly through the nose when possible.",
      "Use a longer exhale to downshift effort and track whether symptoms improve."
    ],
    "safetyNotes": [
      "Stop the exercise if pain, dizziness, or unusual symptoms appear."
    ],
    "defaultPrescriptionRanges": {
      "durationMinutes": {
        "min": 2,
        "max": 6
      },
      "rpe": {
        "min": 1,
        "max": 2
      },
      "talkTest": "Breathing should feel calm enough to speak normally."
    }
  },
  {
    "id": "crocodile_breathing",
    "name": "Crocodile Breathing",
    "summary": "Prone breathing drill for down-regulation.",
    "coachingSummary": "Breathe into the floor and lengthen the exhale.",
    "movementPatternIds": [
      "breathing"
    ],
    "primaryMuscleIds": [
      "diaphragm"
    ],
    "secondaryMuscleIds": [
      "transverse_abs"
    ],
    "equipmentIds": [
      "bodyweight",
      "mat"
    ],
    "workoutTypeIds": [
      "recovery",
      "mobility"
    ],
    "goalIds": [
      "recovery",
      "return_to_training",
      "no_equipment"
    ],
    "minExperience": "beginner",
    "intensity": "recovery",
    "impact": "none",
    "contraindicationFlags": [],
    "trackingMetricIds": [
      "duration_minutes",
      "breathing_quality",
      "readiness_after"
    ],
    "defaultPrescriptionTemplateId": "breathing_reset",
    "shortName": "Crocodile Breathing",
    "category": "recovery",
    "subPatternIds": [
      "parasympathetic_breathing"
    ],
    "jointsInvolved": [
      "spine"
    ],
    "planeOfMotion": "static",
    "equipmentRequiredIds": [
      "bodyweight"
    ],
    "equipmentOptionalIds": [
      "mat"
    ],
    "setupType": "floor",
    "technicalComplexity": "low",
    "loadability": "low",
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
      "mat"
    ],
    "homeFriendly": true,
    "gymFriendly": false,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "childs_pose_breathing"
    ],
    "progressionExerciseIds": [
      "dead_bug"
    ],
    "substitutionExerciseIds": [
      "childs_pose_breathing",
      "cat_cow"
    ],
    "setupInstructions": [
      "Choose a comfortable position that lets the neck and jaw relax.",
      "Place attention on slow nasal inhales and longer exhales before adding movement."
    ],
    "executionInstructions": [
      "Let each exhale soften the rib cage and slow the system down.",
      "Keep the effort easy enough that symptoms do not rise."
    ],
    "breathingInstructions": [
      "Inhale quietly through the nose when possible.",
      "Use a longer exhale to downshift effort and track whether symptoms improve."
    ],
    "safetyNotes": [
      "Stop the exercise if pain, dizziness, or unusual symptoms appear."
    ],
    "defaultPrescriptionRanges": {
      "durationMinutes": {
        "min": 2,
        "max": 6
      },
      "rpe": {
        "min": 1,
        "max": 2
      },
      "talkTest": "Breathing should feel calm enough to speak normally."
    }
  },
  {
    "id": "single_leg_balance",
    "name": "Single-Leg Balance",
    "summary": "Static balance and foot control drill.",
    "coachingSummary": "Hold posture and use support if needed.",
    "movementPatternIds": [
      "balance"
    ],
    "primaryMuscleIds": [
      "feet_intrinsics",
      "glutes"
    ],
    "secondaryMuscleIds": [
      "calves",
      "obliques"
    ],
    "equipmentIds": [
      "bodyweight"
    ],
    "workoutTypeIds": [
      "mobility",
      "recovery",
      "core_durability"
    ],
    "goalIds": [
      "mobility",
      "recovery",
      "return_to_training"
    ],
    "minExperience": "beginner",
    "intensity": "recovery",
    "impact": "none",
    "contraindicationFlags": [],
    "trackingMetricIds": [
      "duration_minutes",
      "movement_quality",
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "core_control",
    "shortName": "Single-Leg Balance",
    "category": "balance",
    "subPatternIds": [
      "single_leg_postural_control"
    ],
    "jointsInvolved": [
      "hips",
      "ankles"
    ],
    "planeOfMotion": "frontal",
    "equipmentRequiredIds": [
      "bodyweight"
    ],
    "equipmentOptionalIds": [],
    "setupType": "standing",
    "technicalComplexity": "low",
    "loadability": "low",
    "fatigueCost": "low",
    "spineLoading": "none",
    "kneeDemand": "low",
    "hipDemand": "low",
    "shoulderDemand": "low",
    "wristDemand": "low",
    "ankleDemand": "moderate",
    "balanceDemand": "high",
    "cardioDemand": "low",
    "spaceRequired": [
      "small_space"
    ],
    "homeFriendly": true,
    "gymFriendly": false,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "bird_dog"
    ],
    "progressionExerciseIds": [
      "step_up"
    ],
    "substitutionExerciseIds": [
      "bird_dog",
      "ankle_rocker"
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
  }
] satisfies Exercise[];
