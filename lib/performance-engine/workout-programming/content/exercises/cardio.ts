import type { Exercise } from '../../types.ts';

export const cardioExercises = [
  {
    "id": "farmers_carry",
    "name": "Farmer Carry",
    "summary": "Two-hand loaded carry for grip and trunk endurance.",
    "coachingSummary": "Stay tall, take short steps, and stop before posture collapses.",
    "movementPatternIds": [
      "carry"
    ],
    "primaryMuscleIds": [
      "forearms",
      "upper_back"
    ],
    "secondaryMuscleIds": [
      "obliques",
      "glutes"
    ],
    "equipmentIds": [
      "dumbbells",
      "kettlebell",
      "open_space"
    ],
    "workoutTypeIds": [
      "strength",
      "core_durability",
      "conditioning"
    ],
    "goalIds": [
      "full_gym_strength",
      "limited_equipment",
      "core_durability"
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
    "shortName": "Farmer Carry",
    "category": "strength",
    "subPatternIds": [
      "bilateral_loaded_carry"
    ],
    "jointsInvolved": [
      "shoulders",
      "wrists"
    ],
    "planeOfMotion": "frontal",
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
    "cardioDemand": "high",
    "spaceRequired": [
      "lane",
      "open_space"
    ],
    "homeFriendly": true,
    "gymFriendly": true,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "suitcase_carry"
    ],
    "progressionExerciseIds": [],
    "substitutionExerciseIds": [
      "suitcase_carry",
      "sled_push"
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
    "id": "step_up",
    "name": "Step-Up",
    "summary": "Low-impact single-leg strength pattern.",
    "coachingSummary": "Step through the whole foot and control the descent.",
    "movementPatternIds": [
      "lunge"
    ],
    "primaryMuscleIds": [
      "quads",
      "glutes"
    ],
    "secondaryMuscleIds": [
      "hamstrings",
      "calves"
    ],
    "equipmentIds": [
      "plyo_box",
      "dumbbells",
      "bodyweight"
    ],
    "workoutTypeIds": [
      "strength",
      "hypertrophy",
      "low_impact_conditioning"
    ],
    "goalIds": [
      "beginner_strength",
      "low_impact_conditioning",
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
    "shortName": "Step-Up",
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
      "plyo_box",
      "dumbbells"
    ],
    "setupType": "supported",
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
    "cardioDemand": "high",
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
      "reverse_lunge"
    ],
    "substitutionExerciseIds": [
      "split_squat",
      "box_squat"
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
    "id": "assault_bike_zone2",
    "name": "Assault Bike Zone 2",
    "summary": "Low-impact steady aerobic bike work.",
    "coachingSummary": "Keep breathing controlled and stay conversational.",
    "movementPatternIds": [
      "locomotion"
    ],
    "primaryMuscleIds": [
      "aerobic_system"
    ],
    "secondaryMuscleIds": [
      "quads",
      "shoulders"
    ],
    "equipmentIds": [
      "assault_bike"
    ],
    "workoutTypeIds": [
      "zone2_cardio",
      "recovery",
      "low_impact_conditioning"
    ],
    "goalIds": [
      "zone2_cardio",
      "low_impact_conditioning",
      "recovery"
    ],
    "minExperience": "beginner",
    "intensity": "low",
    "impact": "none",
    "contraindicationFlags": [],
    "trackingMetricIds": [
      "duration_minutes",
      "heart_rate_zone",
      "actual_rpe",
      "heart_rate_avg",
      "pace"
    ],
    "defaultPrescriptionTemplateId": "zone2_steady",
    "shortName": "Assault Bike Zone 2",
    "category": "cardio",
    "subPatternIds": [
      "steady_aerobic"
    ],
    "jointsInvolved": [
      "hips",
      "knees",
      "ankles"
    ],
    "planeOfMotion": "sagittal",
    "equipmentRequiredIds": [
      "assault_bike"
    ],
    "equipmentOptionalIds": [],
    "setupType": "machine",
    "technicalComplexity": "low",
    "loadability": "low",
    "fatigueCost": "low",
    "spineLoading": "none",
    "kneeDemand": "moderate",
    "hipDemand": "moderate",
    "shoulderDemand": "low",
    "wristDemand": "low",
    "ankleDemand": "moderate",
    "balanceDemand": "moderate",
    "cardioDemand": "high",
    "spaceRequired": [
      "machine_station"
    ],
    "homeFriendly": false,
    "gymFriendly": true,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "easy_walk"
    ],
    "progressionExerciseIds": [
      "stationary_bike_zone2"
    ],
    "substitutionExerciseIds": [
      "stationary_bike_zone2",
      "rower_zone2"
    ],
    "setupInstructions": [
      "Set up the assault_bike path or machine and confirm cadence feels smooth before starting the working interval.",
      "Begin below target effort for the first minute so intensity can settle gradually."
    ],
    "executionInstructions": [
      "Build into the target effort gradually and keep the rhythm repeatable.",
      "Reduce pace or resistance if breathing becomes sharp or mechanics deteriorate."
    ],
    "breathingInstructions": [
      "Keep breathing conversational throughout the main block.",
      "Lower pace if talking requires broken sentences."
    ],
    "safetyNotes": [
      "Keep effort conversational; this is not a test of toughness or max output."
    ],
    "defaultPrescriptionRanges": {
      "durationMinutes": {
        "min": 20,
        "max": 45
      },
      "rpe": {
        "min": 3,
        "max": 5
      },
      "heartRateZone": {
        "min": 2,
        "max": 2,
        "unit": "zone"
      },
      "pace": {
        "target": "conversational"
      },
      "talkTest": "Can speak in full sentences without gasping."
    }
  },
  {
    "id": "stationary_bike_zone2",
    "name": "Stationary Bike Zone 2",
    "summary": "Steady bike work with minimal joint impact.",
    "coachingSummary": "Hold a smooth cadence and nasal/conversational breathing when possible.",
    "movementPatternIds": [
      "locomotion"
    ],
    "primaryMuscleIds": [
      "aerobic_system"
    ],
    "secondaryMuscleIds": [
      "quads",
      "glutes"
    ],
    "equipmentIds": [
      "stationary_bike"
    ],
    "workoutTypeIds": [
      "zone2_cardio",
      "recovery",
      "low_impact_conditioning"
    ],
    "goalIds": [
      "zone2_cardio",
      "low_impact_conditioning",
      "recovery"
    ],
    "minExperience": "beginner",
    "intensity": "low",
    "impact": "none",
    "contraindicationFlags": [],
    "trackingMetricIds": [
      "duration_minutes",
      "heart_rate_zone",
      "actual_rpe",
      "heart_rate_avg",
      "pace"
    ],
    "defaultPrescriptionTemplateId": "zone2_steady",
    "shortName": "Stationary Bike Zone 2",
    "category": "cardio",
    "subPatternIds": [
      "steady_aerobic"
    ],
    "jointsInvolved": [
      "hips",
      "knees",
      "ankles"
    ],
    "planeOfMotion": "sagittal",
    "equipmentRequiredIds": [
      "stationary_bike"
    ],
    "equipmentOptionalIds": [],
    "setupType": "machine",
    "technicalComplexity": "low",
    "loadability": "low",
    "fatigueCost": "low",
    "spineLoading": "none",
    "kneeDemand": "moderate",
    "hipDemand": "moderate",
    "shoulderDemand": "low",
    "wristDemand": "low",
    "ankleDemand": "moderate",
    "balanceDemand": "moderate",
    "cardioDemand": "high",
    "spaceRequired": [
      "machine_station"
    ],
    "homeFriendly": false,
    "gymFriendly": true,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "easy_walk"
    ],
    "progressionExerciseIds": [
      "assault_bike_zone2",
      "rower_zone2"
    ],
    "substitutionExerciseIds": [
      "assault_bike_zone2",
      "incline_walk"
    ],
    "setupInstructions": [
      "Set up the stationary_bike path or machine and confirm cadence feels smooth before starting the working interval.",
      "Begin below target effort for the first minute so intensity can settle gradually."
    ],
    "executionInstructions": [
      "Build into the target effort gradually and keep the rhythm repeatable.",
      "Reduce pace or resistance if breathing becomes sharp or mechanics deteriorate."
    ],
    "breathingInstructions": [
      "Keep breathing conversational throughout the main block.",
      "Lower pace if talking requires broken sentences."
    ],
    "safetyNotes": [
      "Keep effort conversational; this is not a test of toughness or max output."
    ],
    "defaultPrescriptionRanges": {
      "durationMinutes": {
        "min": 20,
        "max": 45
      },
      "rpe": {
        "min": 3,
        "max": 5
      },
      "heartRateZone": {
        "min": 2,
        "max": 2,
        "unit": "zone"
      },
      "pace": {
        "target": "conversational"
      },
      "talkTest": "Can speak in full sentences without gasping."
    }
  },
  {
    "id": "rower_zone2",
    "name": "Rower Zone 2",
    "summary": "Steady rowing machine aerobic work.",
    "coachingSummary": "Drive with legs, swing, pull, and keep the effort easy.",
    "movementPatternIds": [
      "locomotion",
      "horizontal_pull"
    ],
    "primaryMuscleIds": [
      "aerobic_system",
      "upper_back"
    ],
    "secondaryMuscleIds": [
      "quads",
      "glutes"
    ],
    "equipmentIds": [
      "rowing_machine"
    ],
    "workoutTypeIds": [
      "zone2_cardio",
      "low_impact_conditioning"
    ],
    "goalIds": [
      "zone2_cardio",
      "low_impact_conditioning"
    ],
    "minExperience": "beginner",
    "intensity": "low",
    "impact": "none",
    "contraindicationFlags": [
      "back_caution"
    ],
    "trackingMetricIds": [
      "duration_minutes",
      "heart_rate_zone",
      "pace",
      "actual_rpe",
      "heart_rate_avg"
    ],
    "defaultPrescriptionTemplateId": "zone2_steady",
    "shortName": "Rower Zone 2",
    "category": "cardio",
    "subPatternIds": [
      "steady_aerobic",
      "loaded_row"
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
      "rowing_machine"
    ],
    "equipmentOptionalIds": [],
    "setupType": "machine",
    "technicalComplexity": "moderate",
    "loadability": "low",
    "fatigueCost": "low",
    "spineLoading": "high",
    "kneeDemand": "moderate",
    "hipDemand": "moderate",
    "shoulderDemand": "high",
    "wristDemand": "moderate",
    "ankleDemand": "moderate",
    "balanceDemand": "moderate",
    "cardioDemand": "high",
    "spaceRequired": [
      "machine_station"
    ],
    "homeFriendly": false,
    "gymFriendly": true,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "stationary_bike_zone2"
    ],
    "progressionExerciseIds": [],
    "substitutionExerciseIds": [
      "stationary_bike_zone2",
      "incline_walk"
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
      "Keep breathing conversational throughout the main block.",
      "Lower pace if talking requires broken sentences."
    ],
    "safetyNotes": [
      "Stop if back position changes, symptoms radiate, or hinge/carry loading feels sharp.",
      "Keep effort conversational; this is not a test of toughness or max output."
    ],
    "defaultPrescriptionRanges": {
      "durationMinutes": {
        "min": 20,
        "max": 45
      },
      "rpe": {
        "min": 3,
        "max": 5
      },
      "heartRateZone": {
        "min": 2,
        "max": 2,
        "unit": "zone"
      },
      "pace": {
        "target": "conversational"
      },
      "talkTest": "Can speak in full sentences without gasping."
    }
  },
  {
    "id": "incline_walk",
    "name": "Incline Walk",
    "summary": "Low-impact treadmill or hill walking.",
    "coachingSummary": "Walk tall at a pace that keeps breathing controlled.",
    "movementPatternIds": [
      "locomotion"
    ],
    "primaryMuscleIds": [
      "aerobic_system",
      "glutes"
    ],
    "secondaryMuscleIds": [
      "calves",
      "hamstrings"
    ],
    "equipmentIds": [
      "treadmill",
      "track_or_road"
    ],
    "workoutTypeIds": [
      "zone2_cardio",
      "recovery",
      "low_impact_conditioning"
    ],
    "goalIds": [
      "zone2_cardio",
      "low_impact_conditioning",
      "recovery"
    ],
    "minExperience": "beginner",
    "intensity": "low",
    "impact": "low",
    "contraindicationFlags": [],
    "trackingMetricIds": [
      "duration_minutes",
      "heart_rate_zone",
      "pace",
      "heart_rate_avg",
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "zone2_steady",
    "shortName": "Incline Walk",
    "category": "cardio",
    "subPatternIds": [
      "steady_aerobic"
    ],
    "jointsInvolved": [
      "hips",
      "knees",
      "ankles"
    ],
    "planeOfMotion": "sagittal",
    "equipmentRequiredIds": [
      "treadmill"
    ],
    "equipmentOptionalIds": [
      "track_or_road"
    ],
    "setupType": "machine",
    "technicalComplexity": "low",
    "loadability": "low",
    "fatigueCost": "low",
    "spineLoading": "none",
    "kneeDemand": "moderate",
    "hipDemand": "moderate",
    "shoulderDemand": "low",
    "wristDemand": "low",
    "ankleDemand": "moderate",
    "balanceDemand": "moderate",
    "cardioDemand": "high",
    "spaceRequired": [
      "machine_station"
    ],
    "homeFriendly": false,
    "gymFriendly": true,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "easy_walk"
    ],
    "progressionExerciseIds": [
      "rower_zone2"
    ],
    "substitutionExerciseIds": [
      "easy_walk",
      "stationary_bike_zone2"
    ],
    "setupInstructions": [
      "Set up the treadmill, track_or_road path or machine and confirm cadence feels smooth before starting the working interval.",
      "Begin below target effort for the first minute so intensity can settle gradually."
    ],
    "executionInstructions": [
      "Build into the target effort gradually and keep the rhythm repeatable.",
      "Reduce pace or resistance if breathing becomes sharp or mechanics deteriorate."
    ],
    "breathingInstructions": [
      "Keep breathing conversational throughout the main block.",
      "Lower pace if talking requires broken sentences."
    ],
    "safetyNotes": [
      "Keep effort conversational; this is not a test of toughness or max output."
    ],
    "defaultPrescriptionRanges": {
      "durationMinutes": {
        "min": 20,
        "max": 45
      },
      "rpe": {
        "min": 3,
        "max": 5
      },
      "heartRateZone": {
        "min": 2,
        "max": 2,
        "unit": "zone"
      },
      "pace": {
        "target": "conversational"
      },
      "talkTest": "Can speak in full sentences without gasping."
    }
  },
  {
    "id": "easy_walk",
    "name": "Easy Walk",
    "summary": "No-equipment low-intensity aerobic work.",
    "coachingSummary": "Keep it easy enough to finish feeling better than when you started.",
    "movementPatternIds": [
      "locomotion",
      "breathing"
    ],
    "primaryMuscleIds": [
      "aerobic_system"
    ],
    "secondaryMuscleIds": [
      "calves",
      "glutes"
    ],
    "equipmentIds": [
      "bodyweight",
      "track_or_road"
    ],
    "workoutTypeIds": [
      "zone2_cardio",
      "recovery"
    ],
    "goalIds": [
      "zone2_cardio",
      "recovery",
      "no_equipment",
      "return_to_training"
    ],
    "minExperience": "beginner",
    "intensity": "recovery",
    "impact": "low",
    "contraindicationFlags": [],
    "trackingMetricIds": [
      "duration_minutes",
      "actual_rpe",
      "symptom_change",
      "breathing_quality"
    ],
    "defaultPrescriptionTemplateId": "recovery_easy",
    "shortName": "Walk",
    "category": "recovery",
    "subPatternIds": [
      "interval_locomotion",
      "parasympathetic_breathing"
    ],
    "jointsInvolved": [
      "hips",
      "knees",
      "ankles",
      "spine"
    ],
    "planeOfMotion": [
      "sagittal",
      "static"
    ],
    "equipmentRequiredIds": [
      "bodyweight"
    ],
    "equipmentOptionalIds": [
      "track_or_road"
    ],
    "setupType": "floor",
    "technicalComplexity": "low",
    "loadability": "low",
    "fatigueCost": "low",
    "spineLoading": "low",
    "kneeDemand": "moderate",
    "hipDemand": "moderate",
    "shoulderDemand": "low",
    "wristDemand": "low",
    "ankleDemand": "moderate",
    "balanceDemand": "moderate",
    "cardioDemand": "high",
    "spaceRequired": [
      "lane",
      "open_space"
    ],
    "homeFriendly": false,
    "gymFriendly": false,
    "beginnerFriendly": true,
    "regressionExerciseIds": [],
    "progressionExerciseIds": [
      "incline_walk",
      "stationary_bike_zone2"
    ],
    "substitutionExerciseIds": [
      "stationary_bike_zone2",
      "incline_walk"
    ],
    "setupInstructions": [
      "Set up the track_or_road path or machine and confirm cadence feels smooth before starting the working interval.",
      "Begin below target effort for the first minute so intensity can settle gradually."
    ],
    "executionInstructions": [
      "Build into the target effort gradually and keep the rhythm repeatable.",
      "Reduce pace or resistance if breathing becomes sharp or mechanics deteriorate."
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
        "min": 8,
        "max": 25
      },
      "rpe": {
        "min": 1,
        "max": 3
      },
      "talkTest": "Easy nasal or conversational breathing."
    }
  },
  {
    "id": "sled_push",
    "name": "Sled Push",
    "summary": "Low-eccentric conditioning and leg drive.",
    "coachingSummary": "Push with stable posture and stop before knees or back complain.",
    "movementPatternIds": [
      "locomotion",
      "squat"
    ],
    "primaryMuscleIds": [
      "quads",
      "glutes"
    ],
    "secondaryMuscleIds": [
      "calves",
      "aerobic_system"
    ],
    "equipmentIds": [
      "sled",
      "open_space"
    ],
    "workoutTypeIds": [
      "conditioning",
      "low_impact_conditioning"
    ],
    "goalIds": [
      "low_impact_conditioning",
      "full_gym_strength"
    ],
    "minExperience": "beginner",
    "intensity": "moderate",
    "impact": "low",
    "contraindicationFlags": [
      "knee_caution"
    ],
    "trackingMetricIds": [
      "duration_minutes",
      "rounds_completed",
      "actual_rpe",
      "work_seconds",
      "load_used"
    ],
    "defaultPrescriptionTemplateId": "conditioning_interval",
    "shortName": "Sled Push",
    "category": "conditioning",
    "subPatternIds": [
      "interval_locomotion",
      "loaded_squat_pattern"
    ],
    "jointsInvolved": [
      "hips",
      "knees",
      "ankles"
    ],
    "planeOfMotion": "sagittal",
    "equipmentRequiredIds": [
      "sled"
    ],
    "equipmentOptionalIds": [
      "open_space"
    ],
    "setupType": "locomotion",
    "technicalComplexity": "low",
    "loadability": "high",
    "fatigueCost": "high",
    "spineLoading": "moderate",
    "kneeDemand": "high",
    "hipDemand": "high",
    "shoulderDemand": "low",
    "wristDemand": "low",
    "ankleDemand": "moderate",
    "balanceDemand": "moderate",
    "cardioDemand": "high",
    "spaceRequired": [
      "lane",
      "open_space"
    ],
    "homeFriendly": false,
    "gymFriendly": true,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "incline_walk"
    ],
    "progressionExerciseIds": [],
    "substitutionExerciseIds": [
      "stationary_bike_zone2",
      "battle_rope_wave"
    ],
    "setupInstructions": [
      "Set up the sled, open_space path or machine and confirm cadence feels smooth before starting the working interval.",
      "Begin below target effort for the first minute so intensity can settle gradually."
    ],
    "executionInstructions": [
      "Build into the target effort gradually and keep the rhythm repeatable.",
      "Reduce pace or resistance if breathing becomes sharp or mechanics deteriorate."
    ],
    "breathingInstructions": [
      "Exhale through hard efforts and regain control during rest.",
      "Start each round only when breathing has settled enough to repeat quality."
    ],
    "safetyNotes": [
      "Skip or regress if knee pain increases during the set or after the session.",
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
    "id": "running_interval",
    "name": "Running Interval",
    "summary": "Run-based conditioning interval.",
    "coachingSummary": "Keep stride relaxed and stop if impact or breathing becomes unrepeatable.",
    "movementPatternIds": [
      "locomotion"
    ],
    "primaryMuscleIds": [
      "aerobic_system",
      "calves"
    ],
    "secondaryMuscleIds": [
      "quads",
      "glutes",
      "hamstrings"
    ],
    "equipmentIds": [
      "bodyweight",
      "track_or_road"
    ],
    "workoutTypeIds": [
      "conditioning"
    ],
    "goalIds": [
      "boxing_support",
      "low_impact_conditioning"
    ],
    "minExperience": "intermediate",
    "intensity": "hard",
    "impact": "high",
    "contraindicationFlags": [
      "no_running",
      "knee_caution"
    ],
    "trackingMetricIds": [
      "duration_minutes",
      "pace",
      "actual_rpe",
      "rounds_completed",
      "work_seconds"
    ],
    "defaultPrescriptionTemplateId": "hiit_interval",
    "shortName": "Running Interval",
    "category": "conditioning",
    "subPatternIds": [
      "interval_locomotion"
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
      "track_or_road"
    ],
    "setupType": "locomotion",
    "technicalComplexity": "low",
    "loadability": "low",
    "fatigueCost": "high",
    "spineLoading": "none",
    "kneeDemand": "moderate",
    "hipDemand": "moderate",
    "shoulderDemand": "low",
    "wristDemand": "low",
    "ankleDemand": "moderate",
    "balanceDemand": "moderate",
    "cardioDemand": "high",
    "spaceRequired": [
      "lane",
      "open_space"
    ],
    "homeFriendly": false,
    "gymFriendly": false,
    "beginnerFriendly": false,
    "regressionExerciseIds": [
      "incline_walk"
    ],
    "progressionExerciseIds": [],
    "substitutionExerciseIds": [
      "stationary_bike_zone2",
      "assault_bike_zone2",
      "rower_zone2"
    ],
    "setupInstructions": [
      "Set up the track_or_road path or machine and confirm cadence feels smooth before starting the working interval.",
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
      "Skip or regress if knee pain increases during the set or after the session."
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
    "id": "bear_crawl",
    "name": "Bear Crawl",
    "summary": "Bodyweight crawl for trunk and shoulder endurance.",
    "coachingSummary": "Move slowly with hips low and wrists comfortable.",
    "movementPatternIds": [
      "crawl",
      "anti_extension"
    ],
    "primaryMuscleIds": [
      "shoulders",
      "transverse_abs"
    ],
    "secondaryMuscleIds": [
      "quads",
      "forearms"
    ],
    "equipmentIds": [
      "bodyweight",
      "open_space"
    ],
    "workoutTypeIds": [
      "conditioning",
      "core_durability",
      "bodyweight_strength"
    ],
    "goalIds": [
      "no_equipment",
      "core_durability",
      "limited_equipment"
    ],
    "minExperience": "beginner",
    "intensity": "moderate",
    "impact": "none",
    "contraindicationFlags": [
      "wrist_caution",
      "shoulder_caution"
    ],
    "trackingMetricIds": [
      "duration_minutes",
      "movement_quality",
      "actual_rpe",
      "rounds_completed",
      "work_seconds"
    ],
    "defaultPrescriptionTemplateId": "conditioning_interval",
    "shortName": "Bear Crawl",
    "category": "conditioning",
    "subPatternIds": [
      "contralateral_crawl",
      "anterior_core_control"
    ],
    "jointsInvolved": [
      "spine",
      "shoulders",
      "wrists"
    ],
    "planeOfMotion": "static",
    "equipmentRequiredIds": [
      "bodyweight"
    ],
    "equipmentOptionalIds": [
      "open_space"
    ],
    "setupType": "floor",
    "technicalComplexity": "moderate",
    "loadability": "low",
    "fatigueCost": "high",
    "spineLoading": "moderate",
    "kneeDemand": "low",
    "hipDemand": "low",
    "shoulderDemand": "high",
    "wristDemand": "high",
    "ankleDemand": "low",
    "balanceDemand": "high",
    "cardioDemand": "high",
    "spaceRequired": [
      "open_space"
    ],
    "homeFriendly": true,
    "gymFriendly": true,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "front_plank",
      "bird_dog"
    ],
    "progressionExerciseIds": [],
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
      "Exhale through hard efforts and regain control during rest.",
      "Start each round only when breathing has settled enough to repeat quality."
    ],
    "safetyNotes": [
      "Use a smaller range or substitute if shoulder pinching, instability, or pain appears.",
      "Use a neutral wrist option or substitute if wrist pressure becomes painful.",
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
  }
] satisfies Exercise[];
