import type { Exercise, ExerciseMedia } from '../../types.ts';

function pendingMedia(altText: string): ExerciseMedia {
  return {
    videoUrl: null,
    imageUrl: null,
    thumbnailUrl: null,
    animationUrl: null,
    altText,
    reviewStatus: 'needs_review',
    missingReason: 'asset_not_produced',
    priority: 'medium',
  };
}

export const boxingExercises = [
  {
    "id": "boxing_stance_breathing_reset",
    "name": "Boxing Stance Breathing Reset",
    "summary": "Low-risk stance, guard, and breathing quality drill.",
    "coachingSummary": "Set stance, soften the shoulders, and breathe without losing guard position.",
    "movementPatternIds": [
      "breathing",
      "balance"
    ],
    "primaryMuscleIds": [
      "diaphragm",
      "feet_intrinsics"
    ],
    "secondaryMuscleIds": [
      "shoulders",
      "core"
    ],
    "equipmentIds": [
      "bodyweight",
      "open_space"
    ],
    "workoutTypeIds": [
      "boxing_progression",
      "recovery"
    ],
    "goalIds": [
      "boxing_skill_microdose",
      "boxing_progression",
      "shadowboxing_quality",
      "recovery_reset"
    ],
    "minExperience": "beginner",
    "intensity": "recovery",
    "impact": "none",
    "contraindicationFlags": [],
    "trackingMetricIds": [
      "duration_minutes",
      "breathing_quality",
      "movement_quality",
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "boxing_microdose_quality",
    "shortName": "Stance Breathing",
    "category": "skill",
    "subPatternIds": [
      "parasympathetic_breathing",
      "boxing_stance_quality"
    ],
    "jointsInvolved": [
      "ankles",
      "hips",
      "shoulders"
    ],
    "planeOfMotion": [
      "static",
      "multi_planar"
    ],
    "equipmentRequiredIds": [
      "bodyweight"
    ],
    "equipmentOptionalIds": [
      "open_space"
    ],
    "setupType": "standing",
    "technicalComplexity": "low",
    "loadability": "low",
    "fatigueCost": "low",
    "spineLoading": "none",
    "kneeDemand": "low",
    "hipDemand": "low",
    "shoulderDemand": "low",
    "wristDemand": "low",
    "ankleDemand": "low",
    "balanceDemand": "moderate",
    "cardioDemand": "low",
    "spaceRequired": [
      "small_space"
    ],
    "homeFriendly": true,
    "gymFriendly": true,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "crocodile_breathing"
    ],
    "progressionExerciseIds": [
      "boxing_step_slide_line"
    ],
    "substitutionExerciseIds": [
      "crocodile_breathing",
      "easy_walk"
    ],
    "setupInstructions": [
      "Stand in a comfortable boxing stance with feet under control and shoulders relaxed.",
      "Keep hands high enough to practice guard without neck tension."
    ],
    "executionInstructions": [
      "Breathe quietly while shifting pressure between feet without crossing them.",
      "Reset posture after every small shift; this is not sparring or fight simulation."
    ],
    "breathingInstructions": [
      "Use long exhales to relax the jaw, neck, and shoulders.",
      "Keep breathing steady enough to speak a short sentence."
    ],
    "safetyNotes": [
      "Stop if dizziness, sharp pain, or unusual symptoms appear.",
      "Do not add contact, partner drills, or hard combinations."
    ],
    "media": pendingMedia("Athlete standing in a relaxed boxing stance, practicing quiet breathing and guard posture."),
    "defaultPrescriptionRanges": {
      "durationMinutes": {
        "min": 4,
        "max": 12
      },
      "rpe": {
        "min": 1,
        "max": 3
      },
      "talkTest": "Easy breathing and posture control."
    }
  },
  {
    "id": "boxing_step_slide_line",
    "name": "Boxing Step-Slide Line Drill",
    "summary": "Footwork line drill for stance width, balance, and quiet feet.",
    "coachingSummary": "Step, slide, reset stance, and keep contacts quiet.",
    "movementPatternIds": [
      "locomotion",
      "balance",
      "ankle_mobility"
    ],
    "primaryMuscleIds": [
      "calves",
      "feet_intrinsics"
    ],
    "secondaryMuscleIds": [
      "glutes",
      "adductors"
    ],
    "equipmentIds": [
      "bodyweight",
      "open_space"
    ],
    "workoutTypeIds": [
      "boxing_progression",
      "boxing_durability"
    ],
    "goalIds": [
      "footwork_agility",
      "boxing_progression",
      "hip_ankle_mobility",
      "hip_footwork_durability"
    ],
    "minExperience": "beginner",
    "intensity": "low",
    "impact": "low",
    "contraindicationFlags": [],
    "trackingMetricIds": [
      "duration_minutes",
      "movement_quality",
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "boxing_footwork_agility_quality",
    "shortName": "Step-Slide",
    "category": "skill",
    "subPatternIds": [
      "boxing_footwork_quality",
      "ankle_dorsiflexion_control"
    ],
    "jointsInvolved": [
      "hips",
      "knees",
      "ankles"
    ],
    "planeOfMotion": [
      "frontal",
      "sagittal"
    ],
    "equipmentRequiredIds": [
      "bodyweight"
    ],
    "equipmentOptionalIds": [
      "open_space"
    ],
    "setupType": "locomotion",
    "technicalComplexity": "low",
    "loadability": "low",
    "fatigueCost": "low",
    "spineLoading": "none",
    "kneeDemand": "low",
    "hipDemand": "moderate",
    "shoulderDemand": "low",
    "wristDemand": "low",
    "ankleDemand": "moderate",
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
      "boxing_stance_breathing_reset"
    ],
    "progressionExerciseIds": [
      "boxing_pivot_stance_reset"
    ],
    "substitutionExerciseIds": [
      "boxing_stance_breathing_reset",
      "ankle_rocker"
    ],
    "setupInstructions": [
      "Mark a short line or visual target and start in a relaxed boxing stance.",
      "Keep the drill slow enough that feet never cross or slap the ground."
    ],
    "executionInstructions": [
      "Step in the direction of travel, slide the trailing foot, then reset stance width.",
      "Pause briefly after each direction change to confirm balance and guard position."
    ],
    "breathingInstructions": [
      "Exhale through direction changes.",
      "Recover breathing before speed increases."
    ],
    "safetyNotes": [
      "Keep impact low and stop if ankle, calf, knee, or hip pain appears.",
      "Do not turn this into reactive partner work."
    ],
    "media": pendingMedia("Athlete practicing step-slide footwork along a line with quiet feet and balanced stance."),
    "defaultPrescriptionRanges": {
      "rounds": {
        "min": 3,
        "max": 6
      },
      "workSeconds": {
        "min": 30,
        "max": 60
      },
      "restIntervalSeconds": {
        "min": 30,
        "max": 75
      },
      "rpe": {
        "min": 2,
        "max": 5
      }
    }
  },
  {
    "id": "boxing_pivot_stance_reset",
    "name": "Boxing Pivot Stance Reset",
    "summary": "Controlled pivot and stance reset for footwork rhythm.",
    "coachingSummary": "Pivot through the ball of the foot and reset without wobble.",
    "movementPatternIds": [
      "rotation",
      "balance",
      "ankle_mobility"
    ],
    "primaryMuscleIds": [
      "feet_intrinsics",
      "calves"
    ],
    "secondaryMuscleIds": [
      "obliques",
      "glutes"
    ],
    "equipmentIds": [
      "bodyweight",
      "open_space"
    ],
    "workoutTypeIds": [
      "boxing_progression",
      "boxing_durability"
    ],
    "goalIds": [
      "footwork_agility",
      "hip_ankle_mobility",
      "hip_footwork_durability",
      "rotational_power"
    ],
    "minExperience": "beginner",
    "intensity": "low",
    "impact": "low",
    "contraindicationFlags": [],
    "trackingMetricIds": [
      "sets_completed",
      "reps_completed",
      "movement_quality",
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "boxing_footwork_agility_quality",
    "shortName": "Pivot Reset",
    "category": "skill",
    "subPatternIds": [
      "boxing_footwork_quality",
      "controlled_rotation"
    ],
    "jointsInvolved": [
      "hips",
      "knees",
      "ankles",
      "spine"
    ],
    "planeOfMotion": [
      "transverse",
      "frontal"
    ],
    "equipmentRequiredIds": [
      "bodyweight"
    ],
    "equipmentOptionalIds": [
      "open_space"
    ],
    "setupType": "standing",
    "technicalComplexity": "moderate",
    "loadability": "low",
    "fatigueCost": "low",
    "spineLoading": "low",
    "kneeDemand": "low",
    "hipDemand": "moderate",
    "shoulderDemand": "low",
    "wristDemand": "low",
    "ankleDemand": "moderate",
    "balanceDemand": "high",
    "cardioDemand": "low",
    "spaceRequired": [
      "small_space"
    ],
    "homeFriendly": true,
    "gymFriendly": true,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "boxing_step_slide_line"
    ],
    "progressionExerciseIds": [
      "shadowboxing_posture_round"
    ],
    "substitutionExerciseIds": [
      "boxing_step_slide_line",
      "ankle_rocker"
    ],
    "setupInstructions": [
      "Start in stance with enough room to turn without slipping.",
      "Keep knees soft and weight balanced before each pivot."
    ],
    "executionInstructions": [
      "Pivot lightly, reset stance, and confirm guard and head position.",
      "Keep reps smooth; do not whip through the knee or low back."
    ],
    "breathingInstructions": [
      "Exhale through the pivot and inhale during the reset.",
      "Keep the neck relaxed instead of bracing through the jaw."
    ],
    "safetyNotes": [
      "Stop if the knee twists, the ankle pinches, or balance becomes a scramble.",
      "This is solo movement quality, not a contact drill."
    ],
    "media": pendingMedia("Athlete performing a controlled boxing pivot and stance reset in open space."),
    "defaultPrescriptionRanges": {
      "sets": {
        "min": 2,
        "max": 4
      },
      "reps": {
        "target": "4-8 controlled pivots per side"
      },
      "rpe": {
        "min": 2,
        "max": 5
      }
    }
  },
  {
    "id": "shadowboxing_posture_round",
    "name": "Shadowboxing Posture Round",
    "summary": "Low-contact self-guided shadowboxing for rhythm, posture, and breathing.",
    "coachingSummary": "Move lightly, reset guard often, and keep it technical rather than hard.",
    "movementPatternIds": [
      "locomotion",
      "rotation",
      "breathing"
    ],
    "primaryMuscleIds": [
      "aerobic_system",
      "obliques"
    ],
    "secondaryMuscleIds": [
      "shoulders",
      "calves"
    ],
    "equipmentIds": [
      "bodyweight",
      "open_space"
    ],
    "workoutTypeIds": [
      "boxing_progression"
    ],
    "goalIds": [
      "shadowboxing_quality",
      "boxing_skill_microdose",
      "boxing_progression"
    ],
    "minExperience": "beginner",
    "intensity": "low",
    "impact": "low",
    "contraindicationFlags": [],
    "trackingMetricIds": [
      "rounds_completed",
      "duration_minutes",
      "movement_quality",
      "breathing_quality",
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "boxing_shadowboxing_quality_rounds",
    "shortName": "Shadowbox Quality",
    "category": "skill",
    "subPatternIds": [
      "boxing_shadowboxing_quality",
      "controlled_rotation"
    ],
    "jointsInvolved": [
      "hips",
      "spine",
      "shoulders",
      "ankles"
    ],
    "planeOfMotion": [
      "multi_planar",
      "transverse"
    ],
    "equipmentRequiredIds": [
      "bodyweight"
    ],
    "equipmentOptionalIds": [
      "open_space"
    ],
    "setupType": "locomotion",
    "technicalComplexity": "low",
    "loadability": "low",
    "fatigueCost": "low",
    "spineLoading": "low",
    "kneeDemand": "low",
    "hipDemand": "moderate",
    "shoulderDemand": "moderate",
    "wristDemand": "low",
    "ankleDemand": "moderate",
    "balanceDemand": "moderate",
    "cardioDemand": "moderate",
    "spaceRequired": [
      "open_space"
    ],
    "homeFriendly": true,
    "gymFriendly": true,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "boxing_stance_breathing_reset"
    ],
    "progressionExerciseIds": [
      "boxing_step_slide_line"
    ],
    "substitutionExerciseIds": [
      "boxing_stance_breathing_reset",
      "boxing_step_slide_line"
    ],
    "setupInstructions": [
      "Clear space and choose one simple technical focus such as stance, guard, breathing, or foot placement.",
      "Keep the round solo and low contact; no partner, opponent, or sparring scenario."
    ],
    "executionInstructions": [
      "Move at a pace that lets posture and breathing stay clean.",
      "Reset guard and stance after each short sequence before continuing."
    ],
    "breathingInstructions": [
      "Exhale through effort and recover breathing during stance resets.",
      "Lower pace if breathing turns frantic or shoulders rise."
    ],
    "safetyNotes": [
      "Do not generate live sparring, fight simulation, or coach-required drills from this exercise.",
      "Stop if shoulder, wrist, back, knee, ankle, dizziness, or symptom signals appear."
    ],
    "media": pendingMedia("Athlete shadowboxing lightly with organized guard, posture, and foot placement."),
    "defaultPrescriptionRanges": {
      "rounds": {
        "min": 2,
        "max": 5
      },
      "workSeconds": {
        "min": 60,
        "max": 180
      },
      "restIntervalSeconds": {
        "min": 45,
        "max": 90
      },
      "rpe": {
        "min": 3,
        "max": 5
      }
    }
  },
  {
    "id": "boxing_roadwork_easy_run",
    "name": "Boxing Roadwork Easy Run",
    "summary": "Easy roadwork for aerobic base and repeat-round recovery.",
    "coachingSummary": "Run or brisk walk at a conversational effort that supports the rest of the boxing week.",
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
      "zone2_cardio"
    ],
    "goalIds": [
      "roadwork_aerobic_base"
    ],
    "minExperience": "beginner",
    "intensity": "low",
    "impact": "low",
    "contraindicationFlags": [
      "no_running"
    ],
    "trackingMetricIds": [
      "duration_minutes",
      "heart_rate_zone",
      "pace",
      "actual_rpe",
      "breathing_quality"
    ],
    "defaultPrescriptionTemplateId": "boxing_roadwork_zone2",
    "shortName": "Easy Roadwork",
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
      "bodyweight"
    ],
    "equipmentOptionalIds": [
      "track_or_road"
    ],
    "setupType": "locomotion",
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
      "outdoor",
      "lane"
    ],
    "homeFriendly": false,
    "gymFriendly": false,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "easy_walk"
    ],
    "progressionExerciseIds": [
      "boxing_roadwork_tempo_run"
    ],
    "substitutionExerciseIds": [
      "easy_walk",
      "stationary_bike_zone2",
      "incline_walk"
    ],
    "setupInstructions": [
      "Choose a safe route or machine option and start below target pace.",
      "Use shoes, surface, and route choices that keep impact controlled."
    ],
    "executionInstructions": [
      "Hold a conversational pace and avoid surges.",
      "Finish with enough freshness to keep boxing skill work high quality."
    ],
    "breathingInstructions": [
      "Stay conversational throughout the main block.",
      "Slow down if full sentences are no longer available."
    ],
    "safetyNotes": [
      "Do not run through pain, dizziness, illness symptoms, or impact restrictions.",
      "Use a walk, bike, or row option when running is not appropriate."
    ],
    "media": pendingMedia("Athlete completing easy roadwork at a conversational pace on a safe path."),
    "defaultPrescriptionRanges": {
      "durationMinutes": {
        "min": 20,
        "max": 50
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
      "talkTest": "Full sentences stay available."
    }
  },
  {
    "id": "boxing_roadwork_tempo_run",
    "name": "Boxing Roadwork Tempo Run",
    "summary": "Controlled tempo roadwork for pacing durability.",
    "coachingSummary": "Hold a strong but sustainable pace without turning it into intervals.",
    "movementPatternIds": [
      "locomotion"
    ],
    "primaryMuscleIds": [
      "aerobic_system"
    ],
    "secondaryMuscleIds": [
      "calves",
      "quads",
      "glutes"
    ],
    "equipmentIds": [
      "bodyweight",
      "track_or_road"
    ],
    "workoutTypeIds": [
      "roadwork_tempo"
    ],
    "goalIds": [
      "roadwork_tempo"
    ],
    "minExperience": "intermediate",
    "intensity": "moderate",
    "impact": "moderate",
    "contraindicationFlags": [
      "no_running",
      "knee_caution"
    ],
    "trackingMetricIds": [
      "duration_minutes",
      "pace",
      "actual_rpe",
      "heart_rate_avg"
    ],
    "defaultPrescriptionTemplateId": "boxing_roadwork_tempo",
    "shortName": "Tempo Roadwork",
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
      "bodyweight"
    ],
    "equipmentOptionalIds": [
      "track_or_road"
    ],
    "setupType": "locomotion",
    "technicalComplexity": "low",
    "loadability": "low",
    "fatigueCost": "moderate",
    "spineLoading": "none",
    "kneeDemand": "moderate",
    "hipDemand": "moderate",
    "shoulderDemand": "low",
    "wristDemand": "low",
    "ankleDemand": "moderate",
    "balanceDemand": "moderate",
    "cardioDemand": "high",
    "spaceRequired": [
      "outdoor",
      "lane"
    ],
    "homeFriendly": false,
    "gymFriendly": false,
    "beginnerFriendly": false,
    "regressionExerciseIds": [
      "boxing_roadwork_easy_run"
    ],
    "progressionExerciseIds": [
      "boxing_roadwork_interval_stride"
    ],
    "substitutionExerciseIds": [
      "stationary_bike_zone2",
      "incline_walk",
      "boxing_roadwork_easy_run"
    ],
    "setupInstructions": [
      "Start with easy roadwork before settling into tempo.",
      "Pick a route or treadmill setting that avoids sudden pace changes."
    ],
    "executionInstructions": [
      "Hold a controlled pace and avoid sprinting the finish.",
      "End the tempo block when mechanics or breathing stop being repeatable."
    ],
    "breathingInstructions": [
      "Use controlled breathing; short sentences should remain possible.",
      "Back off if breathing becomes frantic."
    ],
    "safetyNotes": [
      "Do not use tempo work on red or orange readiness.",
      "Use low-impact substitutions if running, knee, calf, or foot signals are present."
    ],
    "media": pendingMedia("Athlete running controlled tempo roadwork with relaxed shoulders and steady pacing."),
    "defaultPrescriptionRanges": {
      "durationMinutes": {
        "min": 16,
        "max": 35
      },
      "rpe": {
        "min": 5,
        "max": 7
      },
      "pace": {
        "target": "controlled tempo"
      }
    }
  },
  {
    "id": "boxing_roadwork_interval_stride",
    "name": "Boxing Roadwork Interval Stride",
    "summary": "Repeatable roadwork intervals for prepared athletes.",
    "coachingSummary": "Fast but controlled reps with full enough recovery to repeat quality.",
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
      "roadwork_intervals"
    ],
    "goalIds": [
      "roadwork_intervals"
    ],
    "minExperience": "intermediate",
    "intensity": "hard",
    "impact": "moderate",
    "contraindicationFlags": [
      "no_running",
      "knee_caution"
    ],
    "trackingMetricIds": [
      "rounds_completed",
      "work_seconds",
      "pace",
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "boxing_roadwork_intervals",
    "shortName": "Roadwork Interval",
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
    "ankleDemand": "high",
    "balanceDemand": "moderate",
    "cardioDemand": "high",
    "spaceRequired": [
      "outdoor",
      "lane"
    ],
    "homeFriendly": false,
    "gymFriendly": false,
    "beginnerFriendly": false,
    "regressionExerciseIds": [
      "boxing_roadwork_tempo_run"
    ],
    "progressionExerciseIds": [],
    "substitutionExerciseIds": [
      "stationary_bike_zone2",
      "sled_push",
      "boxing_roadwork_tempo_run"
    ],
    "setupInstructions": [
      "Warm up thoroughly and confirm readiness is green before starting.",
      "Choose a flat, safe route or track with enough space to slow down."
    ],
    "executionInstructions": [
      "Run fast enough to train repeat output, not so hard that form collapses.",
      "Start each rep only when breathing and stride are organized."
    ],
    "breathingInstructions": [
      "Let breathing rise during work and recover during the full rest.",
      "Stop if breathing does not recover before the next interval."
    ],
    "safetyNotes": [
      "Do not place near hard sparring or competition.",
      "Do not run through pain, illness, dizziness, or impact restrictions."
    ],
    "media": pendingMedia("Athlete performing controlled roadwork intervals with full awareness of pacing and recovery."),
    "defaultPrescriptionRanges": {
      "rounds": {
        "min": 4,
        "max": 8
      },
      "workSeconds": {
        "min": 20,
        "max": 60
      },
      "restIntervalSeconds": {
        "min": 75,
        "max": 150
      },
      "rpe": {
        "min": 7,
        "max": 9
      }
    }
  },
  {
    "id": "boxing_alactic_first_step_burst",
    "name": "Boxing Alactic First-Step Burst",
    "summary": "Short first-step burst with full recovery for boxing repeat power.",
    "coachingSummary": "Burst for a few seconds, then fully reset before quality drops.",
    "movementPatternIds": [
      "locomotion",
      "balance"
    ],
    "primaryMuscleIds": [
      "calves",
      "glutes"
    ],
    "secondaryMuscleIds": [
      "aerobic_system",
      "feet_intrinsics"
    ],
    "equipmentIds": [
      "bodyweight",
      "open_space"
    ],
    "workoutTypeIds": [
      "boxing_conditioning_support"
    ],
    "goalIds": [
      "alactic_repeat_power"
    ],
    "minExperience": "intermediate",
    "intensity": "hard",
    "impact": "low",
    "contraindicationFlags": [],
    "trackingMetricIds": [
      "rounds_completed",
      "work_seconds",
      "movement_quality",
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "boxing_alactic_repeat_power",
    "shortName": "Alactic Burst",
    "category": "conditioning",
    "subPatternIds": [
      "boxing_burst_quality",
      "interval_locomotion"
    ],
    "jointsInvolved": [
      "hips",
      "knees",
      "ankles"
    ],
    "planeOfMotion": [
      "sagittal",
      "frontal"
    ],
    "equipmentRequiredIds": [
      "bodyweight"
    ],
    "equipmentOptionalIds": [
      "open_space"
    ],
    "setupType": "locomotion",
    "technicalComplexity": "moderate",
    "loadability": "low",
    "fatigueCost": "moderate",
    "spineLoading": "none",
    "kneeDemand": "moderate",
    "hipDemand": "moderate",
    "shoulderDemand": "low",
    "wristDemand": "low",
    "ankleDemand": "moderate",
    "balanceDemand": "high",
    "cardioDemand": "moderate",
    "spaceRequired": [
      "open_space"
    ],
    "homeFriendly": true,
    "gymFriendly": true,
    "beginnerFriendly": false,
    "regressionExerciseIds": [
      "boxing_step_slide_line"
    ],
    "progressionExerciseIds": [
      "boxing_round_tolerance_footwork"
    ],
    "substitutionExerciseIds": [
      "boxing_step_slide_line",
      "stationary_bike_zone2"
    ],
    "setupInstructions": [
      "Start in stance with a clear lane and no obstacles.",
      "Choose one direction and keep the burst short enough to stay sharp."
    ],
    "executionInstructions": [
      "Burst for the prescribed seconds, stop cleanly, and reset stance.",
      "If the first step slows, the set is done."
    ],
    "breathingInstructions": [
      "Exhale on the burst and fully recover breathing during rest.",
      "Do not start the next burst while breathing is frantic."
    ],
    "safetyNotes": [
      "Skip this on red readiness, high fatigue, acute pain, or poor warm-up quality.",
      "This is not a sparring or fight-simulation drill."
    ],
    "media": pendingMedia("Athlete performing a short first-step boxing burst with full recovery between efforts."),
    "defaultPrescriptionRanges": {
      "rounds": {
        "min": 4,
        "max": 8
      },
      "workSeconds": {
        "min": 6,
        "max": 12
      },
      "restIntervalSeconds": {
        "min": 90,
        "max": 150
      },
      "rpe": {
        "min": 6,
        "max": 8
      }
    }
  },
  {
    "id": "boxing_round_tolerance_footwork",
    "name": "Boxing Round Tolerance Footwork",
    "summary": "Controlled low-contact round-tolerance footwork for prepared athletes.",
    "coachingSummary": "Sustain movement quality through the round without simulating sparring.",
    "movementPatternIds": [
      "locomotion",
      "breathing",
      "anti_rotation"
    ],
    "primaryMuscleIds": [
      "aerobic_system",
      "calves"
    ],
    "secondaryMuscleIds": [
      "obliques",
      "shoulders"
    ],
    "equipmentIds": [
      "bodyweight",
      "open_space"
    ],
    "workoutTypeIds": [
      "boxing_conditioning_support"
    ],
    "goalIds": [
      "glycolytic_round_tolerance"
    ],
    "minExperience": "intermediate",
    "intensity": "hard",
    "impact": "low",
    "contraindicationFlags": [],
    "trackingMetricIds": [
      "rounds_completed",
      "work_seconds",
      "movement_quality",
      "breathing_quality",
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "boxing_glycolytic_round_tolerance",
    "shortName": "Round Tolerance",
    "category": "conditioning",
    "subPatternIds": [
      "boxing_round_tolerance",
      "interval_locomotion"
    ],
    "jointsInvolved": [
      "hips",
      "knees",
      "ankles",
      "shoulders",
      "spine"
    ],
    "planeOfMotion": "multi_planar",
    "equipmentRequiredIds": [
      "bodyweight"
    ],
    "equipmentOptionalIds": [
      "open_space"
    ],
    "setupType": "locomotion",
    "technicalComplexity": "moderate",
    "loadability": "low",
    "fatigueCost": "high",
    "spineLoading": "low",
    "kneeDemand": "moderate",
    "hipDemand": "moderate",
    "shoulderDemand": "moderate",
    "wristDemand": "low",
    "ankleDemand": "moderate",
    "balanceDemand": "high",
    "cardioDemand": "high",
    "spaceRequired": [
      "open_space"
    ],
    "homeFriendly": true,
    "gymFriendly": true,
    "beginnerFriendly": false,
    "regressionExerciseIds": [
      "boxing_alactic_first_step_burst",
      "boxing_roadwork_tempo_run"
    ],
    "progressionExerciseIds": [],
    "substitutionExerciseIds": [
      "boxing_alactic_first_step_burst",
      "sled_push",
      "stationary_bike_zone2"
    ],
    "setupInstructions": [
      "Use only when readiness and the weekly hard-day budget support it.",
      "Choose a low-contact footwork pattern and a simple quality focus."
    ],
    "executionInstructions": [
      "Move for the round while keeping stance, guard, and breathing repeatable.",
      "Stop the round if posture, footwork, or breathing becomes uncontrolled."
    ],
    "breathingInstructions": [
      "Recover fully during rest and downgrade if breathing does not settle.",
      "Use calm exhales during resets inside the round."
    ],
    "safetyNotes": [
      "Do not place this near hard sparring, competition, red readiness, or taper week.",
      "Do not add live contact, opponent simulation, or coach-required drills."
    ],
    "media": pendingMedia("Athlete completing controlled round-tolerance footwork intervals without contact or opponent simulation."),
    "defaultPrescriptionRanges": {
      "rounds": {
        "min": 3,
        "max": 5
      },
      "workSeconds": {
        "min": 90,
        "max": 180
      },
      "restIntervalSeconds": {
        "min": 60,
        "max": 90
      },
      "rpe": {
        "min": 6,
        "max": 8
      }
    }
  },
  {
    "id": "boxing_med_ball_rotational_throw",
    "name": "Boxing Med Ball Rotational Throw",
    "summary": "Low-volume rotational power for hip-to-trunk transfer.",
    "coachingSummary": "Throw from the hips and trunk with a full reset between reps.",
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
      "boxing_support",
      "power"
    ],
    "goalIds": [
      "rotational_power",
      "explosive_power"
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
    "defaultPrescriptionTemplateId": "boxing_rotational_power_quality",
    "shortName": "Boxing Rot Throw",
    "category": "power",
    "subPatternIds": [
      "rotational_power"
    ],
    "jointsInvolved": [
      "hips",
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
    "technicalComplexity": "moderate",
    "loadability": "moderate",
    "fatigueCost": "moderate",
    "spineLoading": "moderate",
    "kneeDemand": "low",
    "hipDemand": "moderate",
    "shoulderDemand": "moderate",
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
      "boxing_pallof_guard_press"
    ],
    "progressionExerciseIds": [],
    "substitutionExerciseIds": [
      "cable_woodchop",
      "pallof_press"
    ],
    "setupInstructions": [
      "Use a light medicine ball and a safe wall or open-space setup.",
      "Start with feet rooted and ribs stacked over pelvis."
    ],
    "executionInstructions": [
      "Rotate from feet and hips through the trunk; avoid arm-only throws.",
      "Reset fully before each rep and stop when speed drops."
    ],
    "breathingInstructions": [
      "Exhale through the throw and breathe normally during the reset.",
      "Do not brace through the neck or jaw."
    ],
    "safetyNotes": [
      "Use a Pallof or woodchop regression if shoulder or back caution is active.",
      "Keep volume low; this is power quality, not conditioning."
    ],
    "media": pendingMedia("Athlete throwing a light medicine ball rotationally with hip-to-trunk sequencing and braced posture."),
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
        "max": 180
      }
    }
  },
  {
    "id": "boxing_pallof_guard_press",
    "name": "Boxing Pallof Guard Press",
    "summary": "Anti-rotation trunk durability with guard-position control.",
    "coachingSummary": "Press from a guard-height position while resisting rotation.",
    "movementPatternIds": [
      "anti_rotation",
      "horizontal_push"
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
      "boxing_durability"
    ],
    "goalIds": [
      "trunk_rotation_durability",
      "rotational_power"
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
    "defaultPrescriptionTemplateId": "boxing_trunk_durability_control",
    "shortName": "Guard Pallof",
    "category": "strength",
    "subPatternIds": [
      "rotary_stability"
    ],
    "jointsInvolved": [
      "spine",
      "shoulders"
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
    "balanceDemand": "moderate",
    "cardioDemand": "low",
    "spaceRequired": [
      "small_space"
    ],
    "homeFriendly": true,
    "gymFriendly": true,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "dead_bug"
    ],
    "progressionExerciseIds": [
      "boxing_med_ball_rotational_throw"
    ],
    "substitutionExerciseIds": [
      "pallof_press",
      "side_plank"
    ],
    "setupInstructions": [
      "Anchor the band or cable at mid-chest height and stand in a boxing stance.",
      "Set ribs over pelvis before pressing away from the chest."
    ],
    "executionInstructions": [
      "Press smoothly without rotating, leaning, or shrugging.",
      "Pause briefly at reach, then return under control."
    ],
    "breathingInstructions": [
      "Exhale as the hands move away.",
      "Avoid breath-holding or neck tension."
    ],
    "safetyNotes": [
      "Use light resistance and stop if back, shoulder, or wrist symptoms appear."
    ],
    "media": pendingMedia("Athlete performing a Pallof-style guard press with steady trunk position and controlled breathing."),
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
        "min": 4,
        "max": 6
      }
    }
  },
  {
    "id": "boxing_scap_guard_endurance",
    "name": "Boxing Scap Guard Endurance",
    "summary": "Shoulder blade and cuff endurance for frequent guard exposure.",
    "coachingSummary": "Move the shoulder blades without shrugging or rib flare.",
    "movementPatternIds": [
      "shoulder_prehab",
      "horizontal_pull"
    ],
    "primaryMuscleIds": [
      "rotator_cuff",
      "rear_delts"
    ],
    "secondaryMuscleIds": [
      "upper_back",
      "shoulders"
    ],
    "equipmentIds": [
      "resistance_band",
      "bodyweight"
    ],
    "workoutTypeIds": [
      "boxing_durability",
      "mobility",
      "boxing_support"
    ],
    "goalIds": [
      "shoulder_scap_durability",
      "neck_trap_durability"
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
    "defaultPrescriptionTemplateId": "boxing_shoulder_scap_durability",
    "shortName": "Scap Guard",
    "category": "prehab",
    "subPatternIds": [
      "scapular_rotator_cuff_control",
      "boxing_guard_endurance"
    ],
    "jointsInvolved": [
      "shoulders",
      "elbows",
      "wrists",
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
      "resistance_band"
    ],
    "setupType": "standing",
    "technicalComplexity": "low",
    "loadability": "low",
    "fatigueCost": "low",
    "spineLoading": "none",
    "kneeDemand": "low",
    "hipDemand": "low",
    "shoulderDemand": "moderate",
    "wristDemand": "low",
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
      "wall_slide"
    ],
    "progressionExerciseIds": [
      "band_pull_apart"
    ],
    "substitutionExerciseIds": [
      "wall_slide",
      "band_external_rotation"
    ],
    "setupInstructions": [
      "Stand tall with ribs down and neck relaxed.",
      "Use bodyweight scap control or a light band only if shoulder position stays clean."
    ],
    "executionInstructions": [
      "Move slowly through pain-free shoulder blade range.",
      "Keep the guard-height posture without shrugging into the neck."
    ],
    "breathingInstructions": [
      "Exhale as the shoulder blades settle.",
      "Keep jaw and neck relaxed throughout."
    ],
    "safetyNotes": [
      "Stop if pinching, numbness, sharp pain, or neck symptoms appear.",
      "This is durability work, not heavy shoulder loading."
    ],
    "media": pendingMedia("Athlete using a band for scapular and guard endurance with ribs down and shoulders controlled."),
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
      "rangeOfMotionIntent": "Build pain-free guard-position endurance."
    }
  },
  {
    "id": "boxing_neck_trap_posture_reset",
    "name": "Boxing Neck Trap Posture Reset",
    "summary": "Conservative neck/trap-adjacent posture and scapular reset.",
    "coachingSummary": "Relax the jaw and neck while the upper back supports posture.",
    "movementPatternIds": [
      "shoulder_prehab",
      "thoracic_mobility",
      "breathing"
    ],
    "primaryMuscleIds": [
      "upper_back",
      "neck"
    ],
    "secondaryMuscleIds": [
      "diaphragm",
      "rear_delts"
    ],
    "equipmentIds": [
      "bodyweight",
      "mat"
    ],
    "workoutTypeIds": [
      "boxing_durability",
      "mobility",
      "recovery"
    ],
    "goalIds": [
      "neck_trap_durability",
      "shoulder_scap_durability",
      "recovery_reset"
    ],
    "minExperience": "beginner",
    "intensity": "recovery",
    "impact": "none",
    "contraindicationFlags": [],
    "trackingMetricIds": [
      "duration_minutes",
      "breathing_quality",
      "range_quality",
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "boxing_neck_trap_postural_durability",
    "shortName": "Neck Trap Reset",
    "category": "prehab",
    "subPatternIds": [
      "scapular_rotator_cuff_control",
      "parasympathetic_breathing"
    ],
    "jointsInvolved": [
      "neck",
      "spine",
      "shoulders"
    ],
    "planeOfMotion": [
      "static",
      "transverse"
    ],
    "equipmentRequiredIds": [
      "bodyweight"
    ],
    "equipmentOptionalIds": [
      "mat"
    ],
    "setupType": "standing",
    "technicalComplexity": "low",
    "loadability": "low",
    "fatigueCost": "low",
    "spineLoading": "none",
    "kneeDemand": "low",
    "hipDemand": "low",
    "shoulderDemand": "low",
    "wristDemand": "low",
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
      "crocodile_breathing"
    ],
    "progressionExerciseIds": [
      "boxing_scap_guard_endurance"
    ],
    "substitutionExerciseIds": [
      "childs_pose_breathing",
      "wall_slide"
    ],
    "setupInstructions": [
      "Choose a relaxed standing, seated, or supported position.",
      "Set the jaw, neck, and shoulders at an easy tension level before starting."
    ],
    "executionInstructions": [
      "Use small scapular and upper-back movements while the neck stays relaxed.",
      "Avoid loaded neck flexion, extension, bridging, or forced end range."
    ],
    "breathingInstructions": [
      "Use long exhales and keep the jaw unclenched.",
      "Stop if breathing becomes braced or symptoms increase."
    ],
    "safetyNotes": [
      "No direct loaded neck work is prescribed here.",
      "Stop for headache, dizziness, numbness, radiating symptoms, or sharp pain."
    ],
    "media": pendingMedia("Athlete performing conservative trap and posture resets with relaxed jaw and no loaded neck movement."),
    "defaultPrescriptionRanges": {
      "sets": {
        "min": 1,
        "max": 3
      },
      "reps": {
        "min": 8,
        "max": 12
      },
      "rpe": {
        "min": 1,
        "max": 3
      },
      "targetJoints": [
        "neck",
        "shoulders",
        "spine"
      ],
      "rangeOfMotionIntent": "Reduce neck and trap tone while improving posture."
    }
  },
  {
    "id": "boxing_hip_ankle_footwork_flow",
    "name": "Boxing Hip Ankle Footwork Flow",
    "summary": "Hip, ankle, calf, and adductor mobility for stance changes.",
    "coachingSummary": "Move through footwork-relevant range without forcing end positions.",
    "movementPatternIds": [
      "hip_mobility",
      "ankle_mobility",
      "balance"
    ],
    "primaryMuscleIds": [
      "calves",
      "glutes",
      "adductors"
    ],
    "secondaryMuscleIds": [
      "feet_intrinsics",
      "hip_flexors"
    ],
    "equipmentIds": [
      "bodyweight",
      "mat"
    ],
    "workoutTypeIds": [
      "boxing_durability",
      "mobility",
      "boxing_progression"
    ],
    "goalIds": [
      "hip_ankle_mobility",
      "hip_footwork_durability",
      "mobility_prehab",
      "footwork_agility"
    ],
    "minExperience": "beginner",
    "intensity": "low",
    "impact": "none",
    "contraindicationFlags": [],
    "trackingMetricIds": [
      "sets_completed",
      "reps_completed",
      "range_quality",
      "movement_quality"
    ],
    "defaultPrescriptionTemplateId": "boxing_hip_ankle_mobility",
    "shortName": "Hip Ankle Flow",
    "category": "mobility",
    "subPatternIds": [
      "ankle_dorsiflexion_control",
      "hip_extension_rotation_range"
    ],
    "jointsInvolved": [
      "hips",
      "ankles",
      "knees"
    ],
    "planeOfMotion": [
      "sagittal",
      "frontal",
      "transverse"
    ],
    "equipmentRequiredIds": [
      "bodyweight"
    ],
    "equipmentOptionalIds": [
      "mat"
    ],
    "setupType": "standing",
    "technicalComplexity": "low",
    "loadability": "low",
    "fatigueCost": "low",
    "spineLoading": "none",
    "kneeDemand": "low",
    "hipDemand": "moderate",
    "shoulderDemand": "low",
    "wristDemand": "low",
    "ankleDemand": "moderate",
    "balanceDemand": "moderate",
    "cardioDemand": "low",
    "spaceRequired": [
      "small_space"
    ],
    "homeFriendly": true,
    "gymFriendly": true,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "ankle_rocker",
      "half_kneeling_hip_flexor"
    ],
    "progressionExerciseIds": [
      "boxing_step_slide_line"
    ],
    "substitutionExerciseIds": [
      "ankle_rocker",
      "worlds_greatest_stretch"
    ],
    "setupInstructions": [
      "Start near support if balance is uncertain.",
      "Move only through ranges that keep foot pressure and knee tracking organized."
    ],
    "executionInstructions": [
      "Alternate ankle rocks, hip shifts, and stance resets slowly.",
      "Pause where control is weakest and avoid bouncing into range."
    ],
    "breathingInstructions": [
      "Use steady breathing and relax the shoulders.",
      "Exhale into the pause without forcing range."
    ],
    "safetyNotes": [
      "Stop if hip, knee, ankle, calf, Achilles, or foot pain increases.",
      "This should improve footwork readiness, not create fatigue."
    ],
    "media": pendingMedia("Athlete moving through a hip, ankle, calf, and lateral footwork mobility flow."),
    "defaultPrescriptionRanges": {
      "sets": {
        "min": 1,
        "max": 3
      },
      "reps": {
        "target": "5-8 controlled reps per side"
      },
      "rpe": {
        "min": 1,
        "max": 3
      },
      "targetJoints": [
        "hips",
        "ankles",
        "feet"
      ],
      "rangeOfMotionIntent": "Improve stance-change readiness in a pain-free range."
    }
  },
  {
    "id": "boxing_recovery_walk_breathing",
    "name": "Boxing Recovery Walk Breathing",
    "summary": "Easy walk and breathing reset for boxing training weeks.",
    "coachingSummary": "Move easily and downshift breathing so readiness improves.",
    "movementPatternIds": [
      "locomotion",
      "breathing",
      "thoracic_mobility"
    ],
    "primaryMuscleIds": [
      "aerobic_system",
      "diaphragm"
    ],
    "secondaryMuscleIds": [
      "calves",
      "upper_back"
    ],
    "equipmentIds": [
      "bodyweight",
      "track_or_road"
    ],
    "workoutTypeIds": [
      "recovery"
    ],
    "goalIds": [
      "recovery_reset",
      "return_to_training"
    ],
    "minExperience": "beginner",
    "intensity": "recovery",
    "impact": "low",
    "contraindicationFlags": [],
    "trackingMetricIds": [
      "duration_minutes",
      "breathing_quality",
      "symptom_change",
      "actual_rpe"
    ],
    "defaultPrescriptionTemplateId": "boxing_recovery_reset",
    "shortName": "Recovery Walk",
    "category": "recovery",
    "subPatternIds": [
      "parasympathetic_breathing",
      "steady_aerobic"
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
    "setupType": "locomotion",
    "technicalComplexity": "low",
    "loadability": "low",
    "fatigueCost": "low",
    "spineLoading": "none",
    "kneeDemand": "low",
    "hipDemand": "low",
    "shoulderDemand": "low",
    "wristDemand": "low",
    "ankleDemand": "low",
    "balanceDemand": "low",
    "cardioDemand": "moderate",
    "spaceRequired": [
      "lane",
      "open_space"
    ],
    "homeFriendly": false,
    "gymFriendly": false,
    "beginnerFriendly": true,
    "regressionExerciseIds": [
      "crocodile_breathing"
    ],
    "progressionExerciseIds": [
      "boxing_roadwork_easy_run"
    ],
    "substitutionExerciseIds": [
      "crocodile_breathing",
      "childs_pose_breathing",
      "easy_walk"
    ],
    "setupInstructions": [
      "Choose an easy surface or small walking route.",
      "Start below RPE 2 and keep the purpose restorative."
    ],
    "executionInstructions": [
      "Walk or move easily while checking that symptoms improve or stay quiet.",
      "Add gentle shoulder and rib motion only if it helps breathing relax."
    ],
    "breathingInstructions": [
      "Use long exhales and easy nasal breathing if available.",
      "Stop if breathing becomes strained or readiness worsens."
    ],
    "safetyNotes": [
      "This is not conditioning. Keep it easy and stop for symptoms.",
      "Use seated breathing if walking is not appropriate today."
    ],
    "media": pendingMedia("Athlete walking easily after training while using relaxed breathing and gentle shoulder motion."),
    "defaultPrescriptionRanges": {
      "durationMinutes": {
        "min": 10,
        "max": 25
      },
      "rpe": {
        "min": 1,
        "max": 3
      },
      "talkTest": "Easy nasal or conversational breathing."
    }
  }
] satisfies Exercise[];
