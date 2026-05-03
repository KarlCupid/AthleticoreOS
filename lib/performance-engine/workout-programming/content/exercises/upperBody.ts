import type { Exercise } from '../../types.ts';

export const upperBodyExercises = [
  {
    "id": "barbell_bench_press",
    "name": "Barbell Bench Press",
    "summary": "Rack-based horizontal press for upper-body strength.",
    "coachingSummary": "Set the shoulder blades, keep wrists stacked, and press without shoulder pinch.",
    "movementPatternIds": [
      "horizontal_push"
    ],
    "primaryMuscleIds": [
      "chest",
      "triceps"
    ],
    "secondaryMuscleIds": [
      "shoulders"
    ],
    "equipmentIds": [
      "barbell",
      "bench"
    ],
    "workoutTypeIds": [
      "strength",
      "upper_strength"
    ],
    "goalIds": [
      "full_gym_strength",
      "upper_body_strength"
    ],
    "minExperience": "intermediate",
    "intensity": "hard",
    "impact": "none",
    "contraindicationFlags": [
      "shoulder_caution",
      "wrist_caution"
    ],
    "trackingMetricIds": [
      "sets_completed",
      "reps_completed",
      "load_used",
      "actual_rpe",
      "rest_seconds"
    ],
    "defaultPrescriptionTemplateId": "strength_heavy",
    "shortName": "Barbell Bench Press",
    "category": "strength",
    "subPatternIds": [
      "loaded_horizontal_press"
    ],
    "jointsInvolved": [
      "shoulders",
      "elbows",
      "wrists"
    ],
    "planeOfMotion": "sagittal",
    "equipmentRequiredIds": [
      "barbell"
    ],
    "equipmentOptionalIds": [
      "bench"
    ],
    "setupType": "bench",
    "technicalComplexity": "low",
    "loadability": "high",
    "fatigueCost": "high",
    "spineLoading": "high",
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
    "homeFriendly": false,
    "gymFriendly": true,
    "beginnerFriendly": false,
    "regressionExerciseIds": [
      "dumbbell_bench_press",
      "floor_press"
    ],
    "progressionExerciseIds": [],
    "substitutionExerciseIds": [
      "dumbbell_bench_press",
      "floor_press",
      "push_up"
    ],
    "setupInstructions": [
      "Set hands and barbell, bench so shoulders start comfortable and ribs stay stacked over the pelvis.",
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
      "Use a smaller range or substitute if shoulder pinching, instability, or pain appears.",
      "Use a neutral wrist option or substitute if wrist pressure becomes painful."
    ],
    "defaultPrescriptionRanges": {
      "sets": {
        "min": 3,
        "max": 5
      },
      "reps": {
        "min": 3,
        "max": 6
      },
      "rpe": {
        "min": 6,
        "max": 8
      },
      "restSeconds": {
        "min": 120,
        "max": 180
      },
      "load": {
        "min": 70,
        "max": 85,
        "unit": "percent_estimated_max"
      }
    }
  },
  {
    "id": "dumbbell_bench_press",
    "name": "Dumbbell Bench Press",
    "summary": "Dumbbell horizontal press for upper-body strength and size.",
    "coachingSummary": "Control the bottom and keep the shoulder blades set.",
    "movementPatternIds": [
      "horizontal_push"
    ],
    "primaryMuscleIds": [
      "chest",
      "triceps"
    ],
    "secondaryMuscleIds": [
      "shoulders"
    ],
    "equipmentIds": [
      "dumbbells",
      "bench"
    ],
    "workoutTypeIds": [
      "strength",
      "hypertrophy",
      "upper_strength"
    ],
    "goalIds": [
      "hypertrophy",
      "dumbbell_hypertrophy",
      "upper_body_strength",
      "full_gym_strength"
    ],
    "minExperience": "beginner",
    "intensity": "moderate",
    "impact": "none",
    "contraindicationFlags": [
      "shoulder_caution"
    ],
    "trackingMetricIds": [
      "sets_completed",
      "reps_completed",
      "load_used",
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "hypertrophy_straight",
    "shortName": "Bench Press",
    "category": "hypertrophy",
    "subPatternIds": [
      "loaded_horizontal_press"
    ],
    "jointsInvolved": [
      "shoulders",
      "elbows",
      "wrists"
    ],
    "planeOfMotion": "sagittal",
    "equipmentRequiredIds": [
      "dumbbells"
    ],
    "equipmentOptionalIds": [
      "bench"
    ],
    "setupType": "bench",
    "technicalComplexity": "low",
    "loadability": "moderate",
    "fatigueCost": "moderate",
    "spineLoading": "none",
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
    "regressionExerciseIds": [
      "floor_press",
      "push_up"
    ],
    "progressionExerciseIds": [],
    "substitutionExerciseIds": [
      "floor_press",
      "push_up"
    ],
    "setupInstructions": [
      "Set hands and dumbbells, bench so shoulders start comfortable and ribs stay stacked over the pelvis.",
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
      "Use a smaller range or substitute if shoulder pinching, instability, or pain appears."
    ],
    "defaultPrescriptionRanges": {
      "sets": {
        "min": 2,
        "max": 4
      },
      "reps": {
        "min": 8,
        "max": 12
      },
      "rpe": {
        "min": 6,
        "max": 8
      },
      "rir": {
        "min": 2,
        "max": 4
      },
      "restSeconds": {
        "min": 60,
        "max": 90
      }
    }
  },
  {
    "id": "floor_press",
    "name": "Dumbbell Floor Press",
    "summary": "Shoulder-friendly dumbbell press from the floor.",
    "coachingSummary": "Pause the upper arm on the floor and press smoothly.",
    "movementPatternIds": [
      "horizontal_push"
    ],
    "primaryMuscleIds": [
      "chest",
      "triceps"
    ],
    "secondaryMuscleIds": [
      "shoulders"
    ],
    "equipmentIds": [
      "dumbbells"
    ],
    "workoutTypeIds": [
      "strength",
      "hypertrophy",
      "upper_strength"
    ],
    "goalIds": [
      "limited_equipment",
      "dumbbell_hypertrophy",
      "upper_body_strength"
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
    "defaultPrescriptionTemplateId": "hypertrophy_straight",
    "shortName": "Floor Press",
    "category": "hypertrophy",
    "subPatternIds": [
      "loaded_horizontal_press"
    ],
    "jointsInvolved": [
      "shoulders",
      "elbows",
      "wrists"
    ],
    "planeOfMotion": "sagittal",
    "equipmentRequiredIds": [
      "dumbbells"
    ],
    "equipmentOptionalIds": [],
    "setupType": "standing",
    "technicalComplexity": "low",
    "loadability": "moderate",
    "fatigueCost": "moderate",
    "spineLoading": "none",
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
    "gymFriendly": false,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "incline_push_up"
    ],
    "progressionExerciseIds": [
      "dumbbell_bench_press"
    ],
    "substitutionExerciseIds": [
      "push_up",
      "dumbbell_bench_press"
    ],
    "setupInstructions": [
      "Set hands and dumbbells so shoulders start comfortable and ribs stay stacked over the pelvis.",
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
        "min": 8,
        "max": 12
      },
      "rpe": {
        "min": 6,
        "max": 8
      },
      "rir": {
        "min": 2,
        "max": 4
      },
      "restSeconds": {
        "min": 60,
        "max": 90
      }
    }
  },
  {
    "id": "overhead_press",
    "name": "Dumbbell Overhead Press",
    "summary": "Vertical press using dumbbells.",
    "coachingSummary": "Brace hard and press without leaning back.",
    "movementPatternIds": [
      "vertical_push"
    ],
    "primaryMuscleIds": [
      "shoulders",
      "triceps"
    ],
    "secondaryMuscleIds": [
      "core"
    ],
    "equipmentIds": [
      "dumbbells"
    ],
    "workoutTypeIds": [
      "strength",
      "hypertrophy",
      "upper_strength"
    ],
    "goalIds": [
      "hypertrophy",
      "dumbbell_hypertrophy",
      "upper_body_strength"
    ],
    "minExperience": "beginner",
    "intensity": "moderate",
    "impact": "none",
    "contraindicationFlags": [
      "shoulder_caution"
    ],
    "trackingMetricIds": [
      "sets_completed",
      "reps_completed",
      "load_used",
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "hypertrophy_straight",
    "shortName": "Overhead Press",
    "category": "hypertrophy",
    "subPatternIds": [
      "overhead_pressing"
    ],
    "jointsInvolved": [
      "shoulders",
      "elbows"
    ],
    "planeOfMotion": "sagittal",
    "equipmentRequiredIds": [
      "dumbbells"
    ],
    "equipmentOptionalIds": [],
    "setupType": "standing",
    "technicalComplexity": "low",
    "loadability": "moderate",
    "fatigueCost": "moderate",
    "spineLoading": "none",
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
    "homeFriendly": true,
    "gymFriendly": false,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "landmine_press",
      "wall_slide"
    ],
    "progressionExerciseIds": [],
    "substitutionExerciseIds": [
      "landmine_press",
      "dumbbell_lateral_raise"
    ],
    "setupInstructions": [
      "Set hands and dumbbells so shoulders start comfortable and ribs stay stacked over the pelvis.",
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
      "Use a smaller range or substitute if shoulder pinching, instability, or pain appears."
    ],
    "defaultPrescriptionRanges": {
      "sets": {
        "min": 2,
        "max": 4
      },
      "reps": {
        "min": 8,
        "max": 12
      },
      "rpe": {
        "min": 6,
        "max": 8
      },
      "rir": {
        "min": 2,
        "max": 4
      },
      "restSeconds": {
        "min": 60,
        "max": 90
      }
    }
  },
  {
    "id": "one_arm_dumbbell_row",
    "name": "One-Arm Dumbbell Row",
    "summary": "Unilateral horizontal pull.",
    "coachingSummary": "Pull to the hip and avoid twisting through the torso.",
    "movementPatternIds": [
      "horizontal_pull"
    ],
    "primaryMuscleIds": [
      "lats",
      "upper_back"
    ],
    "secondaryMuscleIds": [
      "biceps",
      "forearms"
    ],
    "equipmentIds": [
      "dumbbells",
      "bench"
    ],
    "workoutTypeIds": [
      "strength",
      "hypertrophy",
      "upper_strength"
    ],
    "goalIds": [
      "beginner_strength",
      "hypertrophy",
      "dumbbell_hypertrophy",
      "upper_body_strength"
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
    "defaultPrescriptionTemplateId": "hypertrophy_straight",
    "shortName": "One-Arm Dumbbell Row",
    "category": "hypertrophy",
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
      "dumbbells"
    ],
    "equipmentOptionalIds": [
      "bench"
    ],
    "setupType": "bench",
    "technicalComplexity": "low",
    "loadability": "moderate",
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
    "gymFriendly": true,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "band_row"
    ],
    "progressionExerciseIds": [
      "seated_cable_row"
    ],
    "substitutionExerciseIds": [
      "band_row",
      "seated_cable_row"
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
        "min": 8,
        "max": 12
      },
      "rpe": {
        "min": 6,
        "max": 8
      },
      "rir": {
        "min": 2,
        "max": 4
      },
      "restSeconds": {
        "min": 60,
        "max": 90
      }
    }
  },
  {
    "id": "barbell_row",
    "name": "Barbell Row",
    "summary": "Unsupported barbell horizontal pull for upper-back strength.",
    "coachingSummary": "Hinge only as far as the trunk stays braced and row without yanking.",
    "movementPatternIds": [
      "horizontal_pull",
      "hinge"
    ],
    "primaryMuscleIds": [
      "upper_back",
      "lats"
    ],
    "secondaryMuscleIds": [
      "biceps",
      "spinal_erectors",
      "forearms"
    ],
    "equipmentIds": [
      "barbell"
    ],
    "workoutTypeIds": [
      "strength",
      "upper_strength"
    ],
    "goalIds": [
      "full_gym_strength",
      "upper_body_strength"
    ],
    "minExperience": "intermediate",
    "intensity": "hard",
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
    "defaultPrescriptionTemplateId": "strength_heavy",
    "shortName": "Barbell Row",
    "category": "strength",
    "subPatternIds": [
      "loaded_row",
      "controlled_hip_hinge"
    ],
    "jointsInvolved": [
      "hips",
      "spine",
      "shoulders",
      "elbows",
      "wrists"
    ],
    "planeOfMotion": "sagittal",
    "equipmentRequiredIds": [
      "barbell"
    ],
    "equipmentOptionalIds": [],
    "setupType": "standing",
    "technicalComplexity": "moderate",
    "loadability": "high",
    "fatigueCost": "high",
    "spineLoading": "high",
    "kneeDemand": "low",
    "hipDemand": "high",
    "shoulderDemand": "high",
    "wristDemand": "moderate",
    "ankleDemand": "low",
    "balanceDemand": "moderate",
    "cardioDemand": "low",
    "spaceRequired": [
      "small_space"
    ],
    "homeFriendly": false,
    "gymFriendly": true,
    "beginnerFriendly": false,
    "regressionExerciseIds": [
      "one_arm_dumbbell_row",
      "band_row"
    ],
    "progressionExerciseIds": [],
    "substitutionExerciseIds": [
      "one_arm_dumbbell_row",
      "seated_cable_row",
      "band_row"
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
      "Inhale and brace before the hard part of each rep.",
      "Exhale through the finish without losing trunk position."
    ],
    "safetyNotes": [
      "Stop if back position changes, symptoms radiate, or hinge/carry loading feels sharp."
    ],
    "defaultPrescriptionRanges": {
      "sets": {
        "min": 3,
        "max": 5
      },
      "reps": {
        "min": 3,
        "max": 6
      },
      "rpe": {
        "min": 6,
        "max": 8
      },
      "restSeconds": {
        "min": 120,
        "max": 180
      },
      "load": {
        "min": 70,
        "max": 85,
        "unit": "percent_estimated_max"
      }
    }
  },
  {
    "id": "lat_pulldown",
    "name": "Lat Pulldown",
    "summary": "Machine vertical pull.",
    "coachingSummary": "Pull elbows down, not back, and avoid neck jutting.",
    "movementPatternIds": [
      "vertical_pull"
    ],
    "primaryMuscleIds": [
      "lats"
    ],
    "secondaryMuscleIds": [
      "biceps",
      "upper_back"
    ],
    "equipmentIds": [
      "lat_pulldown"
    ],
    "workoutTypeIds": [
      "strength",
      "hypertrophy",
      "upper_strength"
    ],
    "goalIds": [
      "hypertrophy",
      "full_gym_strength",
      "upper_body_strength"
    ],
    "minExperience": "beginner",
    "intensity": "moderate",
    "impact": "none",
    "contraindicationFlags": [
      "shoulder_caution"
    ],
    "trackingMetricIds": [
      "sets_completed",
      "reps_completed",
      "load_used",
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "hypertrophy_straight",
    "shortName": "Lat Pulldown",
    "category": "hypertrophy",
    "subPatternIds": [
      "shoulder_adduction_pull"
    ],
    "jointsInvolved": [
      "shoulders",
      "elbows",
      "wrists"
    ],
    "planeOfMotion": "sagittal",
    "equipmentRequiredIds": [
      "lat_pulldown"
    ],
    "equipmentOptionalIds": [],
    "setupType": "machine",
    "technicalComplexity": "low",
    "loadability": "moderate",
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
      "machine_station"
    ],
    "homeFriendly": false,
    "gymFriendly": true,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "band_row"
    ],
    "progressionExerciseIds": [
      "assisted_pull_up"
    ],
    "substitutionExerciseIds": [
      "assisted_pull_up",
      "seated_cable_row"
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
      "Use a smaller range or substitute if shoulder pinching, instability, or pain appears."
    ],
    "defaultPrescriptionRanges": {
      "sets": {
        "min": 2,
        "max": 4
      },
      "reps": {
        "min": 8,
        "max": 12
      },
      "rpe": {
        "min": 6,
        "max": 8
      },
      "rir": {
        "min": 2,
        "max": 4
      },
      "restSeconds": {
        "min": 60,
        "max": 90
      }
    }
  },
  {
    "id": "assisted_pull_up",
    "name": "Assisted Pull-Up",
    "summary": "Regressed vertical pull using assistance.",
    "coachingSummary": "Use enough assistance to keep full range and shoulder control.",
    "movementPatternIds": [
      "vertical_pull"
    ],
    "primaryMuscleIds": [
      "lats",
      "upper_back"
    ],
    "secondaryMuscleIds": [
      "biceps",
      "forearms"
    ],
    "equipmentIds": [
      "pull_up_bar",
      "resistance_band"
    ],
    "workoutTypeIds": [
      "strength",
      "upper_strength",
      "bodyweight_strength"
    ],
    "goalIds": [
      "beginner_strength",
      "limited_equipment",
      "upper_body_strength"
    ],
    "minExperience": "beginner",
    "intensity": "moderate",
    "impact": "none",
    "contraindicationFlags": [
      "shoulder_caution"
    ],
    "trackingMetricIds": [
      "sets_completed",
      "reps_completed",
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "strength_beginner",
    "shortName": "Assisted Pull-Up",
    "category": "strength",
    "subPatternIds": [
      "shoulder_adduction_pull"
    ],
    "jointsInvolved": [
      "shoulders",
      "elbows",
      "wrists"
    ],
    "planeOfMotion": "sagittal",
    "equipmentRequiredIds": [
      "pull_up_bar",
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
    "homeFriendly": false,
    "gymFriendly": true,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "lat_pulldown",
      "band_row"
    ],
    "progressionExerciseIds": [
      "pull_up"
    ],
    "substitutionExerciseIds": [
      "lat_pulldown",
      "inverted_row"
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
      "Use a smaller range or substitute if shoulder pinching, instability, or pain appears."
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
    "id": "pull_up",
    "name": "Pull-Up",
    "summary": "Bodyweight vertical pull for upper-body strength.",
    "coachingSummary": "Pull with shoulder blades set and stop before reps turn into neck tension.",
    "movementPatternIds": [
      "vertical_pull"
    ],
    "primaryMuscleIds": [
      "lats",
      "upper_back"
    ],
    "secondaryMuscleIds": [
      "biceps",
      "forearms",
      "core"
    ],
    "equipmentIds": [
      "pull_up_bar"
    ],
    "workoutTypeIds": [
      "strength",
      "upper_strength",
      "bodyweight_strength"
    ],
    "goalIds": [
      "upper_body_strength",
      "full_gym_strength"
    ],
    "minExperience": "intermediate",
    "intensity": "hard",
    "impact": "none",
    "contraindicationFlags": [
      "shoulder_caution"
    ],
    "trackingMetricIds": [
      "sets_completed",
      "reps_completed",
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "strength_heavy",
    "shortName": "Pull-Up",
    "category": "strength",
    "subPatternIds": [
      "shoulder_adduction_pull"
    ],
    "jointsInvolved": [
      "shoulders",
      "elbows",
      "wrists"
    ],
    "planeOfMotion": "sagittal",
    "equipmentRequiredIds": [
      "pull_up_bar"
    ],
    "equipmentOptionalIds": [],
    "setupType": "standing",
    "technicalComplexity": "low",
    "loadability": "high",
    "fatigueCost": "high",
    "spineLoading": "high",
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
    "homeFriendly": false,
    "gymFriendly": true,
    "beginnerFriendly": false,
    "regressionExerciseIds": [
      "assisted_pull_up",
      "lat_pulldown",
      "band_row"
    ],
    "progressionExerciseIds": [],
    "substitutionExerciseIds": [
      "assisted_pull_up",
      "lat_pulldown",
      "band_row"
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
      "Use a smaller range or substitute if shoulder pinching, instability, or pain appears."
    ],
    "defaultPrescriptionRanges": {
      "sets": {
        "min": 3,
        "max": 5
      },
      "reps": {
        "min": 3,
        "max": 6
      },
      "rpe": {
        "min": 6,
        "max": 8
      },
      "restSeconds": {
        "min": 120,
        "max": 180
      },
      "load": {
        "min": 70,
        "max": 85,
        "unit": "percent_estimated_max"
      }
    }
  },
  {
    "id": "dumbbell_lateral_raise",
    "name": "Dumbbell Lateral Raise",
    "summary": "Shoulder hypertrophy accessory.",
    "coachingSummary": "Raise smoothly and stop short of shoulder pinch.",
    "movementPatternIds": [
      "vertical_push"
    ],
    "primaryMuscleIds": [
      "shoulders"
    ],
    "secondaryMuscleIds": [
      "rotator_cuff"
    ],
    "equipmentIds": [
      "dumbbells"
    ],
    "workoutTypeIds": [
      "hypertrophy",
      "upper_strength"
    ],
    "goalIds": [
      "hypertrophy",
      "dumbbell_hypertrophy",
      "upper_body_strength"
    ],
    "minExperience": "beginner",
    "intensity": "low",
    "impact": "none",
    "contraindicationFlags": [
      "shoulder_caution"
    ],
    "trackingMetricIds": [
      "sets_completed",
      "reps_completed",
      "load_used",
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "accessory_volume",
    "shortName": "Lateral Raise",
    "category": "hypertrophy",
    "subPatternIds": [
      "overhead_pressing"
    ],
    "jointsInvolved": [
      "shoulders",
      "elbows"
    ],
    "planeOfMotion": "sagittal",
    "equipmentRequiredIds": [
      "dumbbells"
    ],
    "equipmentOptionalIds": [],
    "setupType": "standing",
    "technicalComplexity": "low",
    "loadability": "moderate",
    "fatigueCost": "low",
    "spineLoading": "none",
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
    "homeFriendly": true,
    "gymFriendly": false,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "wall_slide"
    ],
    "progressionExerciseIds": [
      "overhead_press"
    ],
    "substitutionExerciseIds": [
      "band_pull_apart",
      "overhead_press"
    ],
    "setupInstructions": [
      "Set hands and dumbbells so shoulders start comfortable and ribs stay stacked over the pelvis.",
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
      "Use a smaller range or substitute if shoulder pinching, instability, or pain appears."
    ],
    "defaultPrescriptionRanges": {
      "sets": {
        "min": 2,
        "max": 3
      },
      "reps": {
        "min": 12,
        "max": 15
      },
      "rpe": {
        "min": 6,
        "max": 8
      },
      "restSeconds": {
        "min": 30,
        "max": 60
      }
    }
  },
  {
    "id": "dumbbell_curl",
    "name": "Dumbbell Curl",
    "summary": "Simple arm accessory for hypertrophy.",
    "coachingSummary": "Keep elbows quiet and control the lower.",
    "movementPatternIds": [
      "vertical_pull"
    ],
    "primaryMuscleIds": [
      "biceps"
    ],
    "secondaryMuscleIds": [
      "forearms"
    ],
    "equipmentIds": [
      "dumbbells"
    ],
    "workoutTypeIds": [
      "hypertrophy",
      "upper_strength"
    ],
    "goalIds": [
      "hypertrophy",
      "dumbbell_hypertrophy",
      "upper_body_strength"
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
      "load_used",
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "accessory_volume",
    "shortName": "Curl",
    "category": "hypertrophy",
    "subPatternIds": [
      "shoulder_adduction_pull"
    ],
    "jointsInvolved": [
      "shoulders",
      "elbows",
      "wrists"
    ],
    "planeOfMotion": "sagittal",
    "equipmentRequiredIds": [
      "dumbbells"
    ],
    "equipmentOptionalIds": [],
    "setupType": "standing",
    "technicalComplexity": "low",
    "loadability": "moderate",
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
      "band_row"
    ],
    "progressionExerciseIds": [],
    "substitutionExerciseIds": [
      "cable_triceps_pressdown",
      "band_row"
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
      "Use a neutral wrist option or substitute if wrist pressure becomes painful."
    ],
    "defaultPrescriptionRanges": {
      "sets": {
        "min": 2,
        "max": 3
      },
      "reps": {
        "min": 12,
        "max": 15
      },
      "rpe": {
        "min": 6,
        "max": 8
      },
      "restSeconds": {
        "min": 30,
        "max": 60
      }
    }
  },
  {
    "id": "cable_triceps_pressdown",
    "name": "Cable Triceps Pressdown",
    "summary": "Elbow-extension accessory.",
    "coachingSummary": "Pin elbows and finish without shoulder roll.",
    "movementPatternIds": [
      "horizontal_push"
    ],
    "primaryMuscleIds": [
      "triceps"
    ],
    "secondaryMuscleIds": [
      "forearms"
    ],
    "equipmentIds": [
      "cable_machine",
      "resistance_band"
    ],
    "workoutTypeIds": [
      "hypertrophy",
      "upper_strength"
    ],
    "goalIds": [
      "hypertrophy",
      "upper_body_strength",
      "full_gym_strength"
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
      "load_used",
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "accessory_volume",
    "shortName": "Cable Triceps Pressdown",
    "category": "hypertrophy",
    "subPatternIds": [
      "loaded_horizontal_press"
    ],
    "jointsInvolved": [
      "shoulders",
      "elbows",
      "wrists"
    ],
    "planeOfMotion": "sagittal",
    "equipmentRequiredIds": [
      "cable_machine",
      "resistance_band"
    ],
    "equipmentOptionalIds": [],
    "setupType": "standing",
    "technicalComplexity": "low",
    "loadability": "moderate",
    "fatigueCost": "low",
    "spineLoading": "none",
    "kneeDemand": "low",
    "hipDemand": "low",
    "shoulderDemand": "high",
    "wristDemand": "high",
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
      "incline_push_up"
    ],
    "progressionExerciseIds": [
      "push_up"
    ],
    "substitutionExerciseIds": [
      "floor_press",
      "push_up"
    ],
    "setupInstructions": [
      "Set hands and cable_machine, resistance_band so shoulders start comfortable and ribs stay stacked over the pelvis.",
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
        "max": 3
      },
      "reps": {
        "min": 12,
        "max": 15
      },
      "rpe": {
        "min": 6,
        "max": 8
      },
      "restSeconds": {
        "min": 30,
        "max": 60
      }
    }
  },
  {
    "id": "seated_cable_row",
    "name": "Seated Cable Row",
    "summary": "Machine-supported horizontal row.",
    "coachingSummary": "Sit tall and pull without shrugging.",
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
      "cable_machine"
    ],
    "workoutTypeIds": [
      "hypertrophy",
      "strength",
      "upper_strength"
    ],
    "goalIds": [
      "hypertrophy",
      "full_gym_strength",
      "upper_body_strength"
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
    "defaultPrescriptionTemplateId": "hypertrophy_straight",
    "shortName": "Seated Cable Row",
    "category": "hypertrophy",
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
      "cable_machine"
    ],
    "equipmentOptionalIds": [],
    "setupType": "standing",
    "technicalComplexity": "low",
    "loadability": "moderate",
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
      "machine_station"
    ],
    "homeFriendly": false,
    "gymFriendly": true,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "band_row"
    ],
    "progressionExerciseIds": [
      "one_arm_dumbbell_row"
    ],
    "substitutionExerciseIds": [
      "one_arm_dumbbell_row",
      "lat_pulldown"
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
        "min": 8,
        "max": 12
      },
      "rpe": {
        "min": 6,
        "max": 8
      },
      "rir": {
        "min": 2,
        "max": 4
      },
      "restSeconds": {
        "min": 60,
        "max": 90
      }
    }
  }
] satisfies Exercise[];
