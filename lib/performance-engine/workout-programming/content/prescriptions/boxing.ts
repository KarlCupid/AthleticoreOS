import type { PrescriptionTemplate } from '../../types.ts';

export const boxingPrescriptionTemplates = [
  {
    "id": "boxing_microdose_quality",
    "label": "Boxing Microdose Quality",
    "kind": "conditioning",
    "appliesToWorkoutTypeIds": [
      "boxing_progression"
    ],
    "appliesToGoalIds": [
      "boxing_skill_microdose",
      "boxing_progression",
      "footwork_agility",
      "shadowboxing_quality"
    ],
    "defaultSets": 3,
    "defaultDurationSeconds": 60,
    "defaultRpe": 3,
    "restSeconds": 30,
    "intensityCue": "Quality-only boxing movement; stop before speed, guard, breathing, or stance degrades.",
    "effortGuidance": "This is practice density, not fatigue. Keep the nervous system fresh.",
    "restGuidance": "Rest long enough that each minute starts organized and calm.",
    "progressionRuleIds": [
      "progression_skill",
      "progression_tempo_control"
    ],
    "regressionRuleIds": [
      "regression_poor_readiness",
      "regression_limited_time"
    ],
    "deloadRuleIds": [
      "deload_accumulated_fatigue",
      "deload_low_adherence"
    ],
    "payload": {
      "kind": "conditioning",
      "workIntervalSeconds": {
        "min": 30,
        "max": 90,
        "target": 60
      },
      "restIntervalSeconds": {
        "min": 20,
        "max": 60,
        "target": 30
      },
      "rounds": {
        "min": 2,
        "max": 5,
        "target": 3
      },
      "targetIntensity": {
        "RPE": {
          "min": 2,
          "max": 4,
          "target": 3
        },
        "quality": "Stance, guard, breathing, and foot placement stay crisp."
      },
      "impactLevel": "low",
      "fatigueRisk": "low",
      "densityTarget": "Accumulate clean minutes without contact or opponent simulation.",
      "scalingOptions": {
        "down": "Use 30-second rounds and keep only stance, breathing, and step-slide work.",
        "up": "Add one quality round only if every round stays relaxed and repeatable."
      }
    }
  },
  {
    "id": "boxing_footwork_agility_quality",
    "label": "Boxing Footwork Agility Quality",
    "kind": "conditioning",
    "appliesToWorkoutTypeIds": [
      "boxing_progression",
      "boxing_durability"
    ],
    "appliesToGoalIds": [
      "footwork_agility",
      "hip_ankle_mobility",
      "hip_footwork_durability"
    ],
    "defaultSets": 4,
    "defaultDurationSeconds": 45,
    "defaultRpe": 4,
    "restSeconds": 45,
    "intensityCue": "Move smoothly with quiet feet; no sloppy speed chasing.",
    "effortGuidance": "Keep change-of-direction crisp and low impact.",
    "restGuidance": "Rest before foot placement or balance becomes rushed.",
    "progressionRuleIds": [
      "progression_skill",
      "progression_balance_complexity"
    ],
    "regressionRuleIds": [
      "regression_no_jumping",
      "regression_poor_readiness",
      "regression_balance_fall_risk"
    ],
    "deloadRuleIds": [
      "deload_accumulated_fatigue"
    ],
    "payload": {
      "kind": "conditioning",
      "workIntervalSeconds": {
        "min": 30,
        "max": 60,
        "target": 45
      },
      "restIntervalSeconds": {
        "min": 30,
        "max": 75,
        "target": 45
      },
      "rounds": {
        "min": 3,
        "max": 6,
        "target": 4
      },
      "targetIntensity": {
        "RPE": {
          "min": 3,
          "max": 5,
          "target": 4
        },
        "quality": "Balance, stance width, and quiet contacts remain stable."
      },
      "impactLevel": "low",
      "fatigueRisk": "low",
      "densityTarget": "Repeat clean direction changes without turning it into conditioning.",
      "scalingOptions": {
        "down": "Remove pivots and use slower step-slide patterns.",
        "up": "Add a second direction or stance reset, not extra fatigue."
      }
    }
  },
  {
    "id": "boxing_shadowboxing_quality_rounds",
    "label": "Shadowboxing Quality Rounds",
    "kind": "conditioning",
    "appliesToWorkoutTypeIds": [
      "boxing_progression"
    ],
    "appliesToGoalIds": [
      "shadowboxing_quality",
      "boxing_progression",
      "boxing_skill_microdose"
    ],
    "defaultSets": 3,
    "defaultDurationSeconds": 120,
    "defaultRpe": 4,
    "restSeconds": 60,
    "intensityCue": "Low-contact shadowboxing only; no opponent, sparring, or fight simulation.",
    "effortGuidance": "Use rhythm, posture, breathing, and clean resets as the target.",
    "restGuidance": "Recover until breathing and guard position are organized again.",
    "progressionRuleIds": [
      "progression_skill",
      "progression_aerobic_frequency"
    ],
    "regressionRuleIds": [
      "regression_poor_readiness",
      "regression_high_rpe"
    ],
    "deloadRuleIds": [
      "deload_accumulated_fatigue"
    ],
    "payload": {
      "kind": "conditioning",
      "workIntervalSeconds": {
        "min": 60,
        "max": 180,
        "target": 120
      },
      "restIntervalSeconds": {
        "min": 45,
        "max": 90,
        "target": 60
      },
      "rounds": {
        "min": 2,
        "max": 5,
        "target": 3
      },
      "targetIntensity": {
        "RPE": {
          "min": 3,
          "max": 5,
          "target": 4
        },
        "quality": "Guard, breathing, foot placement, and posture stay repeatable."
      },
      "impactLevel": "low",
      "fatigueRisk": "low",
      "densityTarget": "Finish each round able to repeat the same quality.",
      "scalingOptions": {
        "down": "Use stance resets, breathing, and single-motion shadowboxing only.",
        "up": "Add one round or a simple rhythm constraint without increasing contact risk."
      }
    }
  },
  {
    "id": "boxing_roadwork_zone2",
    "label": "Boxing Roadwork Zone 2",
    "kind": "cardio",
    "appliesToWorkoutTypeIds": [
      "zone2_cardio"
    ],
    "appliesToGoalIds": [
      "roadwork_aerobic_base"
    ],
    "defaultDurationMinutes": 30,
    "defaultRpe": 4,
    "restSeconds": 0,
    "intensityCue": "Conversational roadwork for repeat-round recovery, not a test.",
    "effortGuidance": "Keep the pace easy enough to preserve the rest of the boxing week.",
    "progressionRuleIds": [
      "progression_zone2_duration",
      "progression_aerobic_frequency"
    ],
    "regressionRuleIds": [
      "regression_no_running",
      "regression_post_illness_return",
      "regression_poor_readiness"
    ],
    "deloadRuleIds": [
      "deload_illness_caution",
      "deload_return_to_training"
    ],
    "payload": {
      "kind": "cardio",
      "durationMinutes": {
        "min": 20,
        "max": 50,
        "target": 30
      },
      "modality": "run",
      "heartRateZone": {
        "min": 2,
        "max": 2,
        "unit": "zone"
      },
      "RPE": {
        "min": 3,
        "max": 5,
        "target": 4
      },
      "talkTest": "Full sentences stay available.",
      "pace": {
        "target": "conversational boxing roadwork"
      },
      "progression": "duration_then_frequency",
      "progressionRuleIds": [
        "progression_zone2_duration",
        "progression_aerobic_frequency"
      ]
    }
  },
  {
    "id": "boxing_roadwork_tempo",
    "label": "Boxing Roadwork Tempo",
    "kind": "cardio",
    "appliesToWorkoutTypeIds": [
      "roadwork_tempo"
    ],
    "appliesToGoalIds": [
      "roadwork_tempo"
    ],
    "defaultDurationMinutes": 24,
    "defaultRpe": 6,
    "restSeconds": 0,
    "intensityCue": "Controlled tempo; strong but not interval-hard.",
    "effortGuidance": "Hold a sustainable pace that supports pro-style pacing durability.",
    "progressionRuleIds": [
      "progression_zone2_duration",
      "progression_aerobic_frequency"
    ],
    "regressionRuleIds": [
      "regression_no_running",
      "regression_poor_readiness",
      "regression_high_rpe"
    ],
    "deloadRuleIds": [
      "deload_accumulated_fatigue",
      "deload_high_session_rpe_trend"
    ],
    "payload": {
      "kind": "cardio",
      "durationMinutes": {
        "min": 16,
        "max": 35,
        "target": 24
      },
      "modality": "run",
      "heartRateZone": {
        "min": 3,
        "max": 3,
        "unit": "zone"
      },
      "RPE": {
        "min": 5,
        "max": 7,
        "target": 6
      },
      "talkTest": "Short sentences are possible; breathing never becomes frantic.",
      "pace": {
        "target": "controlled tempo"
      },
      "progression": "duration",
      "progressionRuleIds": [
        "progression_zone2_duration"
      ]
    }
  },
  {
    "id": "boxing_roadwork_intervals",
    "label": "Boxing Roadwork Intervals",
    "kind": "interval",
    "appliesToWorkoutTypeIds": [
      "roadwork_intervals"
    ],
    "appliesToGoalIds": [
      "roadwork_intervals"
    ],
    "defaultSets": 6,
    "defaultDurationSeconds": 45,
    "defaultRpe": 8,
    "restSeconds": 90,
    "intensityCue": "Fast but controlled; every interval must be repeatable.",
    "effortGuidance": "Use only when hard-day budget and readiness allow it.",
    "restGuidance": "Recover until stride and breathing are organized.",
    "progressionRuleIds": [
      "progression_hiit_interval"
    ],
    "regressionRuleIds": [
      "regression_no_running",
      "regression_poor_readiness",
      "regression_high_fatigue"
    ],
    "deloadRuleIds": [
      "deload_accumulated_fatigue",
      "deload_performance_drop"
    ],
    "payload": {
      "kind": "interval",
      "workIntervalSeconds": {
        "min": 20,
        "max": 60,
        "target": 45
      },
      "restIntervalSeconds": {
        "min": 75,
        "max": 150,
        "target": 90
      },
      "rounds": {
        "min": 4,
        "max": 8,
        "target": 6
      },
      "targetIntensity": {
        "RPE": {
          "min": 7,
          "max": 9,
          "target": 8
        },
        "talkTest": "Broken phrases during work; breathing recovers before the next rep."
      },
      "impactLevel": "moderate",
      "fatigueRisk": "high",
      "scalingOptions": {
        "down": "Use tempo roadwork or bike intervals if running impact or readiness is not appropriate.",
        "up": "Add one interval only when every rep stays repeatable."
      }
    }
  },
  {
    "id": "boxing_alactic_repeat_power",
    "label": "Boxing Alactic Repeat Power",
    "kind": "interval",
    "appliesToWorkoutTypeIds": [
      "boxing_conditioning_support"
    ],
    "appliesToGoalIds": [
      "alactic_repeat_power"
    ],
    "defaultSets": 6,
    "defaultDurationSeconds": 10,
    "defaultRpe": 7,
    "restSeconds": 110,
    "intensityCue": "Short burst, full reset. Stop before it becomes conditioning fatigue.",
    "effortGuidance": "High intent with low total fatigue for boxing burst support.",
    "restGuidance": "Take full quality recovery between bursts.",
    "progressionRuleIds": [
      "progression_power_quality_gate",
      "progression_hiit_interval"
    ],
    "regressionRuleIds": [
      "regression_poor_readiness",
      "regression_high_fatigue"
    ],
    "deloadRuleIds": [
      "deload_performance_drop",
      "deload_accumulated_fatigue"
    ],
    "payload": {
      "kind": "interval",
      "workIntervalSeconds": {
        "min": 6,
        "max": 12,
        "target": 10
      },
      "restIntervalSeconds": {
        "min": 90,
        "max": 150,
        "target": 110
      },
      "rounds": {
        "min": 4,
        "max": 8,
        "target": 6
      },
      "targetIntensity": {
        "RPE": {
          "min": 6,
          "max": 8,
          "target": 7
        },
        "quality": "First-step speed and posture stay crisp."
      },
      "impactLevel": "low",
      "fatigueRisk": "moderate",
      "scalingOptions": {
        "down": "Cut two bursts or extend recovery.",
        "up": "Add one burst only when all bursts stay fast."
      }
    }
  },
  {
    "id": "boxing_glycolytic_round_tolerance",
    "label": "Boxing Glycolytic Round Tolerance",
    "kind": "conditioning",
    "appliesToWorkoutTypeIds": [
      "boxing_conditioning_support"
    ],
    "appliesToGoalIds": [
      "glycolytic_round_tolerance"
    ],
    "defaultSets": 4,
    "defaultDurationSeconds": 120,
    "defaultRpe": 7,
    "restSeconds": 60,
    "intensityCue": "Controlled round tolerance; no all-out finishers.",
    "effortGuidance": "Prepared athletes only. Keep output repeatable and stop if mechanics collapse.",
    "restGuidance": "Use full one-minute round-style recovery and downgrade if breathing does not settle.",
    "progressionRuleIds": [
      "progression_hiit_interval",
      "progression_circuit_density"
    ],
    "regressionRuleIds": [
      "regression_poor_readiness",
      "regression_high_fatigue",
      "regression_high_rpe"
    ],
    "deloadRuleIds": [
      "deload_accumulated_fatigue",
      "deload_high_session_rpe_trend"
    ],
    "payload": {
      "kind": "conditioning",
      "workIntervalSeconds": {
        "min": 90,
        "max": 180,
        "target": 120
      },
      "restIntervalSeconds": {
        "min": 60,
        "max": 90,
        "target": 60
      },
      "rounds": {
        "min": 3,
        "max": 5,
        "target": 4
      },
      "targetIntensity": {
        "RPE": {
          "min": 6,
          "max": 8,
          "target": 7
        },
        "talkTest": "Short phrases only during work; full control returns during rest."
      },
      "impactLevel": "low",
      "fatigueRisk": "high",
      "densityTarget": "Round output stays repeatable without simulating sparring.",
      "scalingOptions": {
        "down": "Use alactic bursts or tempo roadwork instead.",
        "up": "Add volume only when protected sparring load is low and readiness is green."
      }
    }
  },
  {
    "id": "boxing_rotational_power_quality",
    "label": "Boxing Rotational Power Quality",
    "kind": "power",
    "appliesToWorkoutTypeIds": [
      "boxing_support",
      "power"
    ],
    "appliesToGoalIds": [
      "rotational_power",
      "explosive_power"
    ],
    "defaultSets": 4,
    "defaultReps": "3-5/side",
    "defaultRpe": 6,
    "restSeconds": 120,
    "tempo": "fast intent",
    "intensityCue": "Explode through hip-to-trunk sequencing, then fully reset.",
    "effortGuidance": "Low reps, high intent, no grinding or conditioning fatigue.",
    "restGuidance": "Rest fully before each side or set.",
    "progressionRuleIds": [
      "progression_power_quality_gate"
    ],
    "regressionRuleIds": [
      "regression_poor_readiness",
      "regression_shoulder_caution",
      "regression_high_fatigue"
    ],
    "deloadRuleIds": [
      "deload_performance_drop",
      "deload_accumulated_fatigue"
    ],
    "payload": {
      "kind": "power",
      "sets": {
        "min": 3,
        "max": 5,
        "target": 4
      },
      "reps": {
        "min": 3,
        "max": 5,
        "target": 4
      },
      "explosiveIntent": "Transfer force from feet and hips through the trunk without yanking through the shoulder.",
      "fullRecoverySeconds": {
        "min": 90,
        "max": 180,
        "target": 120
      },
      "technicalQuality": "Stop if rotation becomes arm-dominant, rushed, or back-loaded.",
      "lowFatigue": true,
      "movementSpeed": "fast, clean, and repeatable",
      "eligibilityRestrictions": [
        "No red readiness state",
        "No acute back or shoulder pain",
        "No high fatigue trend"
      ]
    }
  },
  {
    "id": "boxing_trunk_durability_control",
    "label": "Boxing Trunk Durability Control",
    "kind": "resistance",
    "appliesToWorkoutTypeIds": [
      "core_durability",
      "boxing_durability",
      "boxing_support"
    ],
    "appliesToGoalIds": [
      "trunk_rotation_durability"
    ],
    "defaultSets": 3,
    "defaultReps": "6-10/side or 20-30 sec",
    "defaultRpe": 5,
    "restSeconds": 45,
    "tempo": "controlled",
    "intensityCue": "Brace, rotate or resist rotation cleanly, and leave reps in reserve.",
    "effortGuidance": "Durability work should build posture, not create soreness.",
    "restGuidance": "Rest enough to keep rib, pelvis, and shoulder position clean.",
    "progressionRuleIds": [
      "progression_tempo_control",
      "progression_skill"
    ],
    "regressionRuleIds": [
      "regression_pain_increase",
      "regression_poor_readiness"
    ],
    "deloadRuleIds": [
      "deload_pain_trend"
    ],
    "payload": {
      "kind": "resistance",
      "sets": {
        "min": 2,
        "max": 4,
        "target": 3
      },
      "repRange": {
        "target": "6-10/side or 20-30 sec holds"
      },
      "loadGuidance": "Use light-to-moderate load that lets posture stay organized.",
      "intensityModel": "rpe",
      "RPE": {
        "min": 4,
        "max": 6,
        "target": 5
      },
      "restSecondsRange": {
        "min": 30,
        "max": 75,
        "target": 45
      },
      "tempo": "controlled",
      "effortGuidance": "Stop before bracing or shoulder position breaks down.",
      "mainLiftVsAccessory": "core_accessory",
      "progressionRuleIds": [
        "progression_tempo_control",
        "progression_skill"
      ]
    }
  },
  {
    "id": "boxing_shoulder_scap_durability",
    "label": "Boxing Shoulder Scap Durability",
    "kind": "mobility",
    "appliesToWorkoutTypeIds": [
      "boxing_durability",
      "mobility",
      "boxing_support"
    ],
    "appliesToGoalIds": [
      "shoulder_scap_durability"
    ],
    "defaultSets": 2,
    "defaultReps": "10-15",
    "defaultRpe": 3,
    "restSeconds": 30,
    "tempo": "controlled",
    "intensityCue": "Light cuff, serratus, and scap control; no pinching or shrugging.",
    "effortGuidance": "Build control and endurance, not fatigue.",
    "progressionRuleIds": [
      "progression_tempo_control",
      "progression_mobility_range_of_motion"
    ],
    "regressionRuleIds": [
      "regression_shoulder_caution",
      "regression_pain_increase"
    ],
    "deloadRuleIds": [
      "deload_pain_trend"
    ],
    "payload": {
      "kind": "mobility",
      "targetJoints": [
        "shoulders",
        "scapulae",
        "thoracic_spine"
      ],
      "rangeOfMotionIntent": "Improve shoulder blade control and endurance in pain-free boxing guard positions.",
      "reps": {
        "min": 10,
        "max": 15
      },
      "holdTimeSeconds": {
        "min": 1,
        "max": 5
      },
      "breathing": "Exhale as ribs settle and the shoulder blade moves cleanly.",
      "painFreeRange": true,
      "endRangeControl": "Stop before neck tension, pinching, or rib flare."
    }
  },
  {
    "id": "boxing_neck_trap_postural_durability",
    "label": "Boxing Neck Trap Postural Durability",
    "kind": "mobility",
    "appliesToWorkoutTypeIds": [
      "boxing_durability",
      "mobility",
      "recovery"
    ],
    "appliesToGoalIds": [
      "neck_trap_durability"
    ],
    "defaultSets": 2,
    "defaultReps": "8-12 easy reps",
    "defaultRpe": 2,
    "restSeconds": 30,
    "tempo": "slow",
    "intensityCue": "Conservative trap/scap/postural work only; no loaded neck flexion or bridging.",
    "effortGuidance": "Keep it easy enough that the neck feels calmer afterward.",
    "progressionRuleIds": [
      "progression_tempo_control"
    ],
    "regressionRuleIds": [
      "regression_pain_increase",
      "regression_poor_readiness"
    ],
    "deloadRuleIds": [
      "deload_pain_trend"
    ],
    "payload": {
      "kind": "mobility",
      "targetJoints": [
        "neck",
        "shoulders",
        "scapulae",
        "thoracic_spine"
      ],
      "rangeOfMotionIntent": "Restore relaxed neck/trap posture and scapular control without direct neck loading.",
      "reps": {
        "min": 8,
        "max": 12
      },
      "holdTimeSeconds": {
        "min": 2,
        "max": 5
      },
      "breathing": "Long exhales; jaw and neck stay relaxed.",
      "painFreeRange": true,
      "endRangeControl": "No forced end range and no loaded neck positions."
    }
  },
  {
    "id": "boxing_hip_ankle_mobility",
    "label": "Boxing Hip Ankle Mobility",
    "kind": "mobility",
    "appliesToWorkoutTypeIds": [
      "boxing_durability",
      "mobility",
      "boxing_progression"
    ],
    "appliesToGoalIds": [
      "hip_ankle_mobility",
      "hip_footwork_durability",
      "mobility_prehab"
    ],
    "defaultSets": 2,
    "defaultReps": "5-8/side",
    "defaultRpe": 3,
    "restSeconds": 25,
    "tempo": "slow",
    "intensityCue": "Own hips, ankles, calves, and adductors without forcing range.",
    "effortGuidance": "This should make footwork feel easier, not tired.",
    "progressionRuleIds": [
      "progression_mobility_range_of_motion",
      "progression_balance_complexity"
    ],
    "regressionRuleIds": [
      "regression_balance_fall_risk",
      "regression_pain_increase"
    ],
    "deloadRuleIds": [
      "deload_pain_trend"
    ],
    "payload": {
      "kind": "mobility",
      "targetJoints": [
        "hips",
        "ankles",
        "feet"
      ],
      "rangeOfMotionIntent": "Improve usable lower-body range and balance for boxing stance changes.",
      "reps": {
        "target": "5-8 controlled reps per side"
      },
      "holdTimeSeconds": {
        "min": 5,
        "max": 20
      },
      "breathing": "Quiet nasal or easy mouth breathing while range stays controlled.",
      "painFreeRange": true,
      "endRangeControl": "Pause only where balance and foot pressure remain organized."
    }
  },
  {
    "id": "boxing_recovery_reset",
    "label": "Boxing Recovery Reset",
    "kind": "recovery",
    "appliesToWorkoutTypeIds": [
      "recovery"
    ],
    "appliesToGoalIds": [
      "recovery_reset",
      "return_to_training"
    ],
    "defaultDurationMinutes": 18,
    "defaultRpe": 2,
    "restSeconds": 0,
    "intensityCue": "Downshift breathing and circulation; finish fresher than you started.",
    "effortGuidance": "No fatigue chasing, no conditioning, and no contact.",
    "progressionRuleIds": [
      "progression_aerobic_frequency",
      "progression_mobility_range_of_motion"
    ],
    "regressionRuleIds": [
      "regression_poor_readiness",
      "regression_post_illness_return",
      "regression_pain_increase"
    ],
    "deloadRuleIds": [
      "deload_illness_caution",
      "deload_return_to_training",
      "deload_accumulated_fatigue"
    ],
    "payload": {
      "kind": "recovery",
      "intensityCap": {
        "min": 1,
        "max": 3,
        "target": 2
      },
      "durationMinutes": {
        "min": 10,
        "max": 25,
        "target": 18
      },
      "breathingStrategy": "Long exhales, relaxed jaw and neck, and easy nasal breathing when available.",
      "circulationGoal": "Easy movement restores legs, shoulders, and trunk without adding load.",
      "readinessAdjustment": "If readiness worsens, stop and treat the session as recovery only."
    }
  }
] satisfies PrescriptionTemplate[];
