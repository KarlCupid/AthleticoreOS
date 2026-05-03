import type { Exercise } from '../../types.ts';

export const mobilityExercises = [
  {
    "id": "hip_hinge_dowel",
    "name": "Hip Hinge Drill",
    "summary": "Low-load hinge patterning drill.",
    "coachingSummary": "Keep three points of contact and learn the hip-back pattern.",
    "movementPatternIds": [
      "hinge"
    ],
    "primaryMuscleIds": [
      "hamstrings",
      "glutes"
    ],
    "secondaryMuscleIds": [
      "spinal_erectors"
    ],
    "equipmentIds": [
      "bodyweight"
    ],
    "workoutTypeIds": [
      "mobility",
      "recovery",
      "bodyweight_strength"
    ],
    "goalIds": [
      "mobility",
      "recovery",
      "no_equipment",
      "return_to_training"
    ],
    "minExperience": "beginner",
    "intensity": "low",
    "impact": "none",
    "contraindicationFlags": [],
    "trackingMetricIds": [
      "movement_quality",
      "range_quality",
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "mobility_hold",
    "shortName": "Hip Hinge Drill",
    "category": "mobility",
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
    "equipmentOptionalIds": [],
    "setupType": "standing",
    "technicalComplexity": "moderate",
    "loadability": "low",
    "fatigueCost": "low",
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
    "regressionExerciseIds": [],
    "progressionExerciseIds": [
      "glute_bridge",
      "romanian_deadlift"
    ],
    "substitutionExerciseIds": [
      "glute_bridge",
      "cat_cow"
    ],
    "setupInstructions": [
      "Set bodyweight close to the body and soften the knees before sending the hips back.",
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
        "hips",
        "spine"
      ],
      "targetTissues": [
        "hamstrings",
        "glutes"
      ],
      "rangeOfMotionIntent": "Increase usable pain-free range while keeping control at the end position."
    }
  },
  {
    "id": "cat_cow",
    "name": "Cat-Cow",
    "summary": "Gentle spinal flexion-extension mobility.",
    "coachingSummary": "Move through a pain-free range and breathe slowly.",
    "movementPatternIds": [
      "thoracic_mobility",
      "breathing"
    ],
    "primaryMuscleIds": [
      "spinal_erectors",
      "diaphragm"
    ],
    "secondaryMuscleIds": [
      "rectus_abs"
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
    "contraindicationFlags": [],
    "trackingMetricIds": [
      "duration_minutes",
      "range_quality",
      "breathing_quality"
    ],
    "defaultPrescriptionTemplateId": "mobility_hold",
    "shortName": "Cat-Cow",
    "category": "mobility",
    "subPatternIds": [
      "thoracic_rotation_extension",
      "parasympathetic_breathing"
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
    "regressionExerciseIds": [
      "childs_pose_breathing"
    ],
    "progressionExerciseIds": [
      "worlds_greatest_stretch"
    ],
    "substitutionExerciseIds": [
      "thoracic_open_book",
      "childs_pose_breathing"
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
        "spine"
      ],
      "targetTissues": [
        "spinal_erectors",
        "diaphragm"
      ],
      "rangeOfMotionIntent": "Increase usable pain-free range while keeping control at the end position."
    }
  },
  {
    "id": "worlds_greatest_stretch",
    "name": "Worlds Greatest Stretch",
    "summary": "Integrated hip and thoracic mobility flow.",
    "coachingSummary": "Own each position and avoid forcing end ranges.",
    "movementPatternIds": [
      "hip_mobility",
      "thoracic_mobility"
    ],
    "primaryMuscleIds": [
      "hip_flexors",
      "glutes"
    ],
    "secondaryMuscleIds": [
      "obliques",
      "adductors"
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
    "intensity": "low",
    "impact": "none",
    "contraindicationFlags": [
      "wrist_caution"
    ],
    "trackingMetricIds": [
      "duration_minutes",
      "range_quality",
      "movement_quality"
    ],
    "defaultPrescriptionTemplateId": "mobility_hold",
    "shortName": "Worlds Greatest Stretch",
    "category": "flexibility",
    "subPatternIds": [
      "hip_extension_rotation_range",
      "thoracic_rotation_extension"
    ],
    "jointsInvolved": [
      "hips",
      "spine"
    ],
    "planeOfMotion": [
      "sagittal",
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
    "hipDemand": "high",
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
      "half_kneeling_hip_flexor",
      "thoracic_open_book"
    ],
    "progressionExerciseIds": [],
    "substitutionExerciseIds": [
      "half_kneeling_hip_flexor",
      "thoracic_open_book"
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
      "Use a neutral wrist option or substitute if wrist pressure becomes painful."
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
        "hips",
        "spine"
      ],
      "targetTissues": [
        "hip_flexors",
        "glutes"
      ],
      "rangeOfMotionIntent": "Increase usable pain-free range while keeping control at the end position."
    }
  },
  {
    "id": "half_kneeling_hip_flexor",
    "name": "Half-Kneeling Hip Flexor Stretch",
    "summary": "Hip flexor mobility with pelvis control.",
    "coachingSummary": "Squeeze the back glute and avoid arching the low back.",
    "movementPatternIds": [
      "hip_mobility"
    ],
    "primaryMuscleIds": [
      "hip_flexors"
    ],
    "secondaryMuscleIds": [
      "glutes",
      "rectus_abs"
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
    "contraindicationFlags": [],
    "trackingMetricIds": [
      "duration_minutes",
      "range_quality"
    ],
    "defaultPrescriptionTemplateId": "flexibility_hold",
    "shortName": "Half-Kneeling Hip Flexor Stretch",
    "category": "flexibility",
    "subPatternIds": [
      "hip_extension_rotation_range"
    ],
    "jointsInvolved": [
      "hips"
    ],
    "planeOfMotion": "sagittal",
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
    "spineLoading": "none",
    "kneeDemand": "low",
    "hipDemand": "high",
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
      "glute_bridge"
    ],
    "progressionExerciseIds": [
      "worlds_greatest_stretch"
    ],
    "substitutionExerciseIds": [
      "ankle_rocker",
      "worlds_greatest_stretch"
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
      "holdSeconds": {
        "min": 20,
        "max": 45
      },
      "rpe": {
        "min": 1,
        "max": 3
      },
      "targetJoints": [
        "hips"
      ],
      "targetTissues": [
        "hip_flexors"
      ],
      "rangeOfMotionIntent": "Relax into a pain-free stretch while preserving pelvis and rib position."
    }
  },
  {
    "id": "ankle_rocker",
    "name": "Ankle Rocker",
    "summary": "Knee-over-toe ankle mobility drill.",
    "coachingSummary": "Move slowly and keep heel heavy.",
    "movementPatternIds": [
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
    "contraindicationFlags": [],
    "trackingMetricIds": [
      "sets_completed",
      "reps_completed",
      "range_quality"
    ],
    "defaultPrescriptionTemplateId": "mobility_hold",
    "shortName": "Ankle Rocker",
    "category": "mobility",
    "subPatternIds": [
      "ankle_dorsiflexion_control"
    ],
    "jointsInvolved": [
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
    "fatigueCost": "low",
    "spineLoading": "none",
    "kneeDemand": "low",
    "hipDemand": "low",
    "shoulderDemand": "low",
    "wristDemand": "low",
    "ankleDemand": "high",
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
      "pogo_hop",
      "worlds_greatest_stretch"
    ],
    "substitutionExerciseIds": [
      "half_kneeling_hip_flexor",
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
        "ankles"
      ],
      "targetTissues": [
        "calves",
        "feet_intrinsics"
      ],
      "rangeOfMotionIntent": "Increase usable pain-free range while keeping control at the end position."
    }
  },
  {
    "id": "wall_slide",
    "name": "Wall Slide",
    "summary": "Scapular control and shoulder mobility drill.",
    "coachingSummary": "Slide only as high as ribs and shoulders stay controlled.",
    "movementPatternIds": [
      "shoulder_prehab",
      "thoracic_mobility"
    ],
    "primaryMuscleIds": [
      "rotator_cuff",
      "rear_delts"
    ],
    "secondaryMuscleIds": [
      "shoulders"
    ],
    "equipmentIds": [
      "bodyweight"
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
    "contraindicationFlags": [],
    "trackingMetricIds": [
      "sets_completed",
      "reps_completed",
      "range_quality"
    ],
    "defaultPrescriptionTemplateId": "shoulder_prehab",
    "shortName": "Wall Slide",
    "category": "prehab",
    "subPatternIds": [
      "scapular_rotator_cuff_control",
      "thoracic_rotation_extension"
    ],
    "jointsInvolved": [
      "spine",
      "shoulders",
      "elbows",
      "wrists"
    ],
    "planeOfMotion": "transverse",
    "equipmentRequiredIds": [
      "bodyweight"
    ],
    "equipmentOptionalIds": [],
    "setupType": "standing",
    "technicalComplexity": "low",
    "loadability": "low",
    "fatigueCost": "low",
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
    "homeFriendly": true,
    "gymFriendly": false,
    "beginnerFriendly": true,
    "regressionExerciseIds": [],
    "progressionExerciseIds": [
      "band_pull_apart",
      "band_external_rotation"
    ],
    "substitutionExerciseIds": [
      "band_pull_apart",
      "thoracic_open_book"
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
  }
] satisfies Exercise[];
