import type { Exercise } from '../../types.ts';

export const lowerBodyExercises = [
  {
    "id": "barbell_back_squat",
    "name": "Barbell Back Squat",
    "summary": "Rack-based loaded squat for strength development.",
    "coachingSummary": "Brace hard, keep the bar path over mid-foot, and use a depth that stays pain-free.",
    "movementPatternIds": [
      "squat"
    ],
    "primaryMuscleIds": [
      "quads",
      "glutes"
    ],
    "secondaryMuscleIds": [
      "adductors",
      "spinal_erectors",
      "core"
    ],
    "equipmentIds": [
      "barbell",
      "squat_rack"
    ],
    "workoutTypeIds": [
      "strength",
      "full_body_strength",
      "lower_strength"
    ],
    "goalIds": [
      "full_gym_strength",
      "lower_body_strength"
    ],
    "minExperience": "intermediate",
    "intensity": "hard",
    "impact": "none",
    "contraindicationFlags": [
      "knee_caution",
      "back_caution"
    ],
    "trackingMetricIds": [
      "sets_completed",
      "reps_completed",
      "load_used",
      "actual_rpe",
      "rest_seconds"
    ],
    "defaultPrescriptionTemplateId": "strength_heavy",
    "shortName": "Barbell Back Squat",
    "category": "strength",
    "subPatternIds": [
      "loaded_squat_pattern"
    ],
    "jointsInvolved": [
      "hips",
      "knees",
      "ankles"
    ],
    "planeOfMotion": "sagittal",
    "equipmentRequiredIds": [
      "barbell"
    ],
    "equipmentOptionalIds": [
      "squat_rack"
    ],
    "setupType": "standing",
    "technicalComplexity": "low",
    "loadability": "high",
    "fatigueCost": "high",
    "spineLoading": "high",
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
    "homeFriendly": false,
    "gymFriendly": true,
    "beginnerFriendly": false,
    "regressionExerciseIds": [
      "goblet_squat",
      "box_squat"
    ],
    "progressionExerciseIds": [
      "trap_bar_deadlift"
    ],
    "substitutionExerciseIds": [
      "goblet_squat",
      "box_squat",
      "leg_press"
    ],
    "setupInstructions": [
      "Set feet in a stable squat stance and position barbell, squat_rack so the torso can stay braced.",
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
    "id": "goblet_squat",
    "name": "Goblet Squat",
    "summary": "Beginner-friendly squat pattern with load held in front.",
    "coachingSummary": "Stay tall, brace, and sit between the hips without knee pain.",
    "movementPatternIds": [
      "squat"
    ],
    "primaryMuscleIds": [
      "quads",
      "glutes"
    ],
    "secondaryMuscleIds": [
      "core",
      "adductors"
    ],
    "equipmentIds": [
      "dumbbells",
      "kettlebell"
    ],
    "workoutTypeIds": [
      "strength",
      "hypertrophy",
      "full_body_strength",
      "lower_strength"
    ],
    "goalIds": [
      "beginner_strength",
      "hypertrophy",
      "limited_equipment",
      "lower_body_strength",
      "dumbbell_hypertrophy"
    ],
    "minExperience": "beginner",
    "intensity": "moderate",
    "impact": "none",
    "contraindicationFlags": [
      "knee_caution"
    ],
    "trackingMetricIds": [
      "sets_completed",
      "reps_completed",
      "load_used",
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "strength_beginner",
    "shortName": "Goblet Squat",
    "category": "strength",
    "subPatternIds": [
      "loaded_squat_pattern"
    ],
    "jointsInvolved": [
      "hips",
      "knees",
      "ankles"
    ],
    "planeOfMotion": "sagittal",
    "equipmentRequiredIds": [
      "dumbbells",
      "kettlebell"
    ],
    "equipmentOptionalIds": [],
    "setupType": "standing",
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
    "regressionExerciseIds": [
      "box_squat",
      "bodyweight_squat"
    ],
    "progressionExerciseIds": [
      "trap_bar_deadlift",
      "leg_press"
    ],
    "substitutionExerciseIds": [
      "bodyweight_squat",
      "box_squat",
      "leg_press"
    ],
    "setupInstructions": [
      "Set feet in a stable squat stance and position dumbbells, kettlebell so the torso can stay braced.",
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
    "id": "split_squat",
    "name": "Split Squat",
    "summary": "Static single-leg strength pattern.",
    "coachingSummary": "Keep front foot rooted and use a range that keeps the knee comfortable.",
    "movementPatternIds": [
      "lunge"
    ],
    "primaryMuscleIds": [
      "quads",
      "glutes"
    ],
    "secondaryMuscleIds": [
      "adductors",
      "core"
    ],
    "equipmentIds": [
      "bodyweight",
      "dumbbells"
    ],
    "workoutTypeIds": [
      "strength",
      "hypertrophy",
      "bodyweight_strength"
    ],
    "goalIds": [
      "beginner_strength",
      "hypertrophy",
      "no_equipment",
      "dumbbell_hypertrophy"
    ],
    "minExperience": "beginner",
    "intensity": "moderate",
    "impact": "none",
    "contraindicationFlags": [
      "knee_caution"
    ],
    "trackingMetricIds": [
      "sets_completed",
      "reps_completed",
      "actual_rpe",
      "load_used"
    ],
    "defaultPrescriptionTemplateId": "hypertrophy_straight",
    "shortName": "Split Squat",
    "category": "hypertrophy",
    "subPatternIds": [
      "unilateral_knee_dominant"
    ],
    "jointsInvolved": [
      "hips",
      "knees",
      "ankles"
    ],
    "planeOfMotion": "frontal",
    "equipmentRequiredIds": [
      "bodyweight"
    ],
    "equipmentOptionalIds": [
      "dumbbells"
    ],
    "setupType": "standing",
    "technicalComplexity": "moderate",
    "loadability": "moderate",
    "fatigueCost": "moderate",
    "spineLoading": "none",
    "kneeDemand": "high",
    "hipDemand": "high",
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
      "bodyweight_squat"
    ],
    "progressionExerciseIds": [
      "reverse_lunge",
      "step_up"
    ],
    "substitutionExerciseIds": [
      "reverse_lunge",
      "step_up"
    ],
    "setupInstructions": [
      "Start in a stance that lets the front foot stay rooted and the pelvis stay square.",
      "Use bodyweight first if balance or knee comfort is uncertain."
    ],
    "executionInstructions": [
      "Lower with control, keep the front foot planted, and avoid bouncing out of the bottom.",
      "Drive through the front foot and finish tall before the next rep."
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
    "id": "reverse_lunge",
    "name": "Reverse Lunge",
    "summary": "Deceleration-friendly lunge variation.",
    "coachingSummary": "Step back softly and drive through the front foot.",
    "movementPatternIds": [
      "lunge"
    ],
    "primaryMuscleIds": [
      "quads",
      "glutes"
    ],
    "secondaryMuscleIds": [
      "hamstrings",
      "core"
    ],
    "equipmentIds": [
      "bodyweight",
      "dumbbells"
    ],
    "workoutTypeIds": [
      "strength",
      "hypertrophy",
      "lower_strength"
    ],
    "goalIds": [
      "beginner_strength",
      "hypertrophy",
      "limited_equipment"
    ],
    "minExperience": "beginner",
    "intensity": "moderate",
    "impact": "low",
    "contraindicationFlags": [
      "knee_caution"
    ],
    "trackingMetricIds": [
      "sets_completed",
      "reps_completed",
      "movement_quality",
      "load_used",
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "hypertrophy_straight",
    "shortName": "Reverse Lunge",
    "category": "hypertrophy",
    "subPatternIds": [
      "unilateral_knee_dominant"
    ],
    "jointsInvolved": [
      "hips",
      "knees",
      "ankles"
    ],
    "planeOfMotion": "frontal",
    "equipmentRequiredIds": [
      "bodyweight"
    ],
    "equipmentOptionalIds": [
      "dumbbells"
    ],
    "setupType": "standing",
    "technicalComplexity": "moderate",
    "loadability": "moderate",
    "fatigueCost": "moderate",
    "spineLoading": "none",
    "kneeDemand": "high",
    "hipDemand": "high",
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
      "split_squat"
    ],
    "progressionExerciseIds": [
      "step_up"
    ],
    "substitutionExerciseIds": [
      "split_squat",
      "step_up"
    ],
    "setupInstructions": [
      "Start in a stance that lets the front foot stay rooted and the pelvis stay square.",
      "Use bodyweight first if balance or knee comfort is uncertain."
    ],
    "executionInstructions": [
      "Lower with control, keep the front foot planted, and avoid bouncing out of the bottom.",
      "Drive through the front foot and finish tall before the next rep."
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
    "id": "romanian_deadlift",
    "name": "Romanian Deadlift",
    "summary": "Hip hinge for hamstrings and glutes.",
    "coachingSummary": "Push hips back, keep ribs down, and stop before back position changes.",
    "movementPatternIds": [
      "hinge"
    ],
    "primaryMuscleIds": [
      "hamstrings",
      "glutes"
    ],
    "secondaryMuscleIds": [
      "spinal_erectors",
      "forearms"
    ],
    "equipmentIds": [
      "dumbbells",
      "barbell"
    ],
    "workoutTypeIds": [
      "strength",
      "hypertrophy",
      "lower_strength"
    ],
    "goalIds": [
      "beginner_strength",
      "hypertrophy",
      "dumbbell_hypertrophy",
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
    "defaultPrescriptionTemplateId": "hypertrophy_straight",
    "shortName": "Romanian Deadlift",
    "category": "hypertrophy",
    "subPatternIds": [
      "controlled_hip_hinge"
    ],
    "jointsInvolved": [
      "hips",
      "spine"
    ],
    "planeOfMotion": "sagittal",
    "equipmentRequiredIds": [
      "dumbbells",
      "barbell"
    ],
    "equipmentOptionalIds": [],
    "setupType": "standing",
    "technicalComplexity": "moderate",
    "loadability": "high",
    "fatigueCost": "moderate",
    "spineLoading": "high",
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
    "homeFriendly": false,
    "gymFriendly": true,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "hip_hinge_dowel",
      "glute_bridge"
    ],
    "progressionExerciseIds": [
      "trap_bar_deadlift",
      "kettlebell_swing"
    ],
    "substitutionExerciseIds": [
      "glute_bridge",
      "hip_hinge_dowel"
    ],
    "setupInstructions": [
      "Set dumbbells, barbell close to the body and soften the knees before sending the hips back.",
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
      "Stop if back position changes, symptoms radiate, or hinge/carry loading feels sharp."
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
    "id": "trap_bar_deadlift",
    "name": "Trap Bar Deadlift",
    "summary": "Loaded hinge/squat hybrid with neutral handles.",
    "coachingSummary": "Brace first, push the floor away, and avoid grinding reps.",
    "movementPatternIds": [
      "hinge",
      "squat"
    ],
    "primaryMuscleIds": [
      "glutes",
      "quads",
      "hamstrings"
    ],
    "secondaryMuscleIds": [
      "spinal_erectors",
      "forearms"
    ],
    "equipmentIds": [
      "barbell"
    ],
    "workoutTypeIds": [
      "strength",
      "full_body_strength",
      "lower_strength"
    ],
    "goalIds": [
      "full_gym_strength",
      "lower_body_strength"
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
    "shortName": "Trap Bar Deadlift",
    "category": "strength",
    "subPatternIds": [
      "controlled_hip_hinge",
      "loaded_squat_pattern"
    ],
    "jointsInvolved": [
      "hips",
      "knees",
      "ankles",
      "spine"
    ],
    "planeOfMotion": "sagittal",
    "equipmentRequiredIds": [
      "barbell"
    ],
    "equipmentOptionalIds": [],
    "setupType": "standing",
    "technicalComplexity": "high",
    "loadability": "high",
    "fatigueCost": "high",
    "spineLoading": "high",
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
    "homeFriendly": false,
    "gymFriendly": true,
    "beginnerFriendly": false,
    "regressionExerciseIds": [
      "romanian_deadlift",
      "goblet_squat"
    ],
    "progressionExerciseIds": [],
    "substitutionExerciseIds": [
      "romanian_deadlift",
      "leg_press"
    ],
    "setupInstructions": [
      "Set barbell close to the body and soften the knees before sending the hips back.",
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
    "id": "leg_press",
    "name": "Leg Press",
    "summary": "Machine squat pattern for controlled lower-body volume.",
    "coachingSummary": "Use controlled depth and avoid locking knees hard.",
    "movementPatternIds": [
      "squat"
    ],
    "primaryMuscleIds": [
      "quads",
      "glutes"
    ],
    "secondaryMuscleIds": [
      "hamstrings"
    ],
    "equipmentIds": [
      "leg_press"
    ],
    "workoutTypeIds": [
      "hypertrophy",
      "lower_strength"
    ],
    "goalIds": [
      "hypertrophy",
      "full_gym_strength",
      "lower_body_strength"
    ],
    "minExperience": "beginner",
    "intensity": "moderate",
    "impact": "none",
    "contraindicationFlags": [
      "knee_caution"
    ],
    "trackingMetricIds": [
      "sets_completed",
      "reps_completed",
      "load_used",
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "hypertrophy_straight",
    "shortName": "Leg Press",
    "category": "hypertrophy",
    "subPatternIds": [
      "loaded_squat_pattern"
    ],
    "jointsInvolved": [
      "hips",
      "knees",
      "ankles"
    ],
    "planeOfMotion": "sagittal",
    "equipmentRequiredIds": [
      "leg_press"
    ],
    "equipmentOptionalIds": [],
    "setupType": "machine",
    "technicalComplexity": "low",
    "loadability": "high",
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
      "machine_station"
    ],
    "homeFriendly": false,
    "gymFriendly": true,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "box_squat",
      "goblet_squat"
    ],
    "progressionExerciseIds": [
      "trap_bar_deadlift"
    ],
    "substitutionExerciseIds": [
      "goblet_squat",
      "box_squat"
    ],
    "setupInstructions": [
      "Set feet in a stable squat stance and position leg_press so the torso can stay braced.",
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
