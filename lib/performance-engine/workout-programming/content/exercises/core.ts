import type { Exercise } from '../../types.ts';

export const coreExercises = [
  {
    "id": "push_up",
    "name": "Push-Up",
    "summary": "Bodyweight horizontal press.",
    "coachingSummary": "Brace the trunk and keep shoulders comfortable.",
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
      "bodyweight"
    ],
    "workoutTypeIds": [
      "strength",
      "hypertrophy",
      "bodyweight_strength"
    ],
    "goalIds": [
      "beginner_strength",
      "no_equipment",
      "limited_equipment",
      "upper_body_strength"
    ],
    "minExperience": "beginner",
    "intensity": "moderate",
    "impact": "none",
    "contraindicationFlags": [
      "wrist_caution",
      "shoulder_caution"
    ],
    "trackingMetricIds": [
      "sets_completed",
      "reps_completed",
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "strength_beginner",
    "shortName": "Push-Up",
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
    "equipmentOptionalIds": [],
    "setupType": "floor",
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
    "gymFriendly": false,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "incline_push_up"
    ],
    "progressionExerciseIds": [
      "dumbbell_bench_press",
      "floor_press"
    ],
    "substitutionExerciseIds": [
      "incline_push_up",
      "floor_press"
    ],
    "setupInstructions": [
      "Set hands and bodyweight so shoulders start comfortable and ribs stay stacked over the pelvis.",
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
    "id": "inverted_row",
    "name": "Inverted Row",
    "summary": "Bodyweight horizontal pulling pattern.",
    "coachingSummary": "Keep body long and pull the chest toward the handle or bar.",
    "movementPatternIds": [
      "horizontal_pull",
      "anti_extension"
    ],
    "primaryMuscleIds": [
      "upper_back",
      "lats"
    ],
    "secondaryMuscleIds": [
      "biceps",
      "core"
    ],
    "equipmentIds": [
      "trx",
      "pull_up_bar"
    ],
    "workoutTypeIds": [
      "strength",
      "bodyweight_strength",
      "upper_strength"
    ],
    "goalIds": [
      "beginner_strength",
      "limited_equipment",
      "upper_body_strength"
    ],
    "minExperience": "beginner",
    "intensity": "moderate",
    "impact": "none",
    "contraindicationFlags": [],
    "trackingMetricIds": [
      "sets_completed",
      "reps_completed",
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "strength_beginner",
    "shortName": "Inverted Row",
    "category": "strength",
    "subPatternIds": [
      "loaded_row",
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
      "trx",
      "pull_up_bar"
    ],
    "equipmentOptionalIds": [],
    "setupType": "floor",
    "technicalComplexity": "low",
    "loadability": "low",
    "fatigueCost": "moderate",
    "spineLoading": "low",
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
      "band_row"
    ],
    "progressionExerciseIds": [
      "assisted_pull_up"
    ],
    "substitutionExerciseIds": [
      "band_row",
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
    "id": "sit_up",
    "name": "Sit-Up",
    "summary": "Trunk flexion exercise for anterior core endurance.",
    "coachingSummary": "Curl up under control and stop if the low back or hip flexors take over.",
    "movementPatternIds": [
      "trunk_flexion"
    ],
    "primaryMuscleIds": [
      "rectus_abs"
    ],
    "secondaryMuscleIds": [
      "hip_flexors",
      "obliques"
    ],
    "equipmentIds": [
      "bodyweight",
      "mat"
    ],
    "workoutTypeIds": [
      "core_durability",
      "bodyweight_strength"
    ],
    "goalIds": [
      "core_durability",
      "no_equipment"
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
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "core_control",
    "shortName": "Sit-Up",
    "category": "strength",
    "subPatternIds": [
      "controlled_trunk_flexion"
    ],
    "jointsInvolved": [
      "spine"
    ],
    "planeOfMotion": "sagittal",
    "equipmentRequiredIds": [
      "bodyweight"
    ],
    "equipmentOptionalIds": [
      "mat"
    ],
    "setupType": "floor",
    "technicalComplexity": "moderate",
    "loadability": "low",
    "fatigueCost": "moderate",
    "spineLoading": "high",
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
      "front_plank"
    ],
    "substitutionExerciseIds": [
      "dead_bug",
      "pallof_press"
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
  }
] satisfies Exercise[];
