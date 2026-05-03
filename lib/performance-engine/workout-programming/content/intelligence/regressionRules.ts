import type { RegressionRule } from '../../types.ts';

export const regressionRules = [
  {
    "id": "regression_missed_reps",
    "label": "Missed Reps Regression",
    "ruleType": "regression",
    "appliesToWorkoutTypeIds": [
      "strength",
      "hypertrophy"
    ],
    "appliesToGoalIds": [
      "beginner_strength",
      "hypertrophy",
      "full_gym_strength",
      "dumbbell_hypertrophy"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "trigger": "Athlete misses prescribed reps before the planned final set.",
    "triggerConditions": [
      {
        "metricId": "reps_completed",
        "operator": "<",
        "value": 0.8,
        "explanation": "Less than 80 percent of target reps were completed."
      }
    ],
    "regressWhen": [
      {
        "metricId": "completion_status",
        "operator": "=",
        "value": "modified"
      }
    ],
    "action": "Reduce load 5-10 percent or move to the lower end of the rep range next session.",
    "regressionAction": {
      "kind": "decrease_load",
      "amount": 10,
      "unit": "percent",
      "target": "load"
    },
    "safetyOverride": {
      "missingDataBehavior": "repeat"
    },
    "requiredTrackingMetricIds": [
      "reps_completed",
      "load_used",
      "actual_rpe"
    ],
    "userMessage": "The target reps were not there today. Lower the load and rebuild clean reps.",
    "coachNotes": [
      "Distinguish missed reps from intentional RIR before regressing."
    ],
    "explanation": "Missed reps signal the dose exceeded current capacity or recovery."
  },
  {
    "id": "regression_high_rpe",
    "label": "High RPE Regression",
    "ruleType": "regression",
    "appliesToWorkoutTypeIds": [
      "strength",
      "hypertrophy",
      "conditioning"
    ],
    "appliesToGoalIds": [
      "beginner_strength",
      "hypertrophy",
      "low_impact_conditioning"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "trigger": "Actual RPE is 9 or higher or two points above target.",
    "triggerConditions": [
      {
        "metricId": "actual_rpe",
        "operator": ">=",
        "value": 9
      }
    ],
    "regressWhen": [
      {
        "metricId": "actual_rpe",
        "operator": ">=",
        "value": 9
      }
    ],
    "action": "Lower target RPE by one and reduce volume by one set or interval.",
    "regressionAction": {
      "kind": "reduce_volume",
      "amount": 1,
      "unit": "set_or_interval",
      "target": "session_volume"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "poor_readiness"
      ],
      "missingDataBehavior": "regress"
    },
    "requiredTrackingMetricIds": [
      "actual_rpe"
    ],
    "userMessage": "That was too close to the ceiling. Bring effort down next time.",
    "coachNotes": [
      "High RPE is especially important for beginners and return-to-training blocks."
    ],
    "explanation": "Repeated high effort increases fatigue cost and reduces repeatability."
  },
  {
    "id": "regression_pain_increase",
    "label": "Pain Increase Regression",
    "ruleType": "regression",
    "appliesToWorkoutTypeIds": [
      "strength",
      "hypertrophy",
      "conditioning",
      "mobility"
    ],
    "appliesToGoalIds": [
      "beginner_strength",
      "hypertrophy",
      "mobility",
      "return_to_training"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "trigger": "Pain increases during or after the session.",
    "triggerConditions": [
      {
        "metricId": "pain_score_after",
        "operator": ">",
        "value": 3
      }
    ],
    "regressWhen": [
      {
        "metricId": "symptom_change",
        "operator": "=",
        "value": "worse"
      }
    ],
    "action": "Use a safer substitution, reduce range/load, and cap effort until pain is stable.",
    "regressionAction": {
      "kind": "swap_exercise",
      "target": "first_safe_substitution"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "pain_increased_last_session"
      ],
      "missingDataBehavior": "regress"
    },
    "requiredTrackingMetricIds": [
      "pain_score_before",
      "pain_score_after",
      "symptom_change"
    ],
    "userMessage": "Pain went up, so the next plan gets safer before it gets harder.",
    "coachNotes": [
      "Pain increase overrides progression regardless of completion."
    ],
    "explanation": "Pain escalation is a safety signal, not a performance target."
  },
  {
    "id": "regression_poor_readiness",
    "label": "Poor Readiness Regression",
    "ruleType": "regression",
    "appliesToWorkoutTypeIds": [
      "strength",
      "hypertrophy",
      "conditioning",
      "power"
    ],
    "appliesToGoalIds": [
      "beginner_strength",
      "hypertrophy",
      "boxing_support",
      "low_impact_conditioning"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "trigger": "Readiness is red/orange or the athlete reports poor readiness.",
    "triggerConditions": [
      {
        "metricId": "readiness_after",
        "operator": "=",
        "value": "poor_readiness"
      }
    ],
    "regressWhen": [
      {
        "metricId": "readiness_score",
        "operator": "<=",
        "value": 40
      }
    ],
    "action": "Reduce volume 25-40 percent and remove hard intervals or power work.",
    "regressionAction": {
      "kind": "reduce_volume",
      "amount": 30,
      "unit": "percent",
      "target": "session_volume"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "poor_readiness"
      ],
      "missingDataBehavior": "regress"
    },
    "requiredTrackingMetricIds": [
      "readiness_after"
    ],
    "userMessage": "Readiness is low. Today becomes a lower-cost version of the plan.",
    "coachNotes": [
      "Preserve protected workouts but reduce supporting load."
    ],
    "explanation": "Poor readiness should cap training stress before performance drops or risk rises."
  },
  {
    "id": "regression_high_soreness",
    "label": "High Soreness Regression",
    "ruleType": "regression",
    "appliesToWorkoutTypeIds": [
      "strength",
      "hypertrophy",
      "conditioning"
    ],
    "appliesToGoalIds": [
      "hypertrophy",
      "dumbbell_hypertrophy",
      "lower_body_strength"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "trigger": "Soreness is high enough to alter movement or warm-up quality.",
    "triggerConditions": [
      {
        "metricId": "soreness",
        "operator": ">=",
        "value": 4
      }
    ],
    "regressWhen": [
      {
        "metricId": "movement_quality",
        "operator": "<=",
        "value": 3
      }
    ],
    "action": "Reduce eccentric-heavy work and cut one to two hard sets.",
    "regressionAction": {
      "kind": "reduce_volume",
      "amount": 2,
      "unit": "sets",
      "target": "eccentric_volume"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "high_soreness"
      ],
      "missingDataBehavior": "repeat"
    },
    "requiredTrackingMetricIds": [
      "soreness",
      "movement_quality"
    ],
    "userMessage": "Soreness is affecting quality. Cut the hard volume and move better.",
    "coachNotes": [
      "Avoid tempo eccentrics and high-volume lower-body work."
    ],
    "explanation": "High soreness reduces movement quality and increases cost of hard training."
  },
  {
    "id": "regression_poor_sleep",
    "label": "Poor Sleep Regression",
    "ruleType": "regression",
    "appliesToWorkoutTypeIds": [
      "strength",
      "hypertrophy",
      "conditioning",
      "power"
    ],
    "appliesToGoalIds": [
      "beginner_strength",
      "hypertrophy",
      "boxing_support"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "trigger": "Sleep quality or duration is meaningfully below normal.",
    "triggerConditions": [
      {
        "metricId": "sleep_quality",
        "operator": "<=",
        "value": 2
      }
    ],
    "regressWhen": [
      {
        "metricId": "readiness_score",
        "operator": "<=",
        "value": 55
      }
    ],
    "action": "Remove top-end work and use conservative RPE caps.",
    "regressionAction": {
      "kind": "change_intensity",
      "amount": -1,
      "unit": "rpe",
      "target": "target_rpe"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "poor_sleep"
      ],
      "missingDataBehavior": "repeat"
    },
    "requiredTrackingMetricIds": [
      "sleep_quality",
      "actual_rpe"
    ],
    "userMessage": "Sleep was low. Keep the work technical and away from max effort.",
    "coachNotes": [
      "Poor sleep especially constrains power, HIIT, and heavy strength."
    ],
    "explanation": "Poor sleep lowers recovery confidence and should soften intensity."
  },
  {
    "id": "regression_knee_pain_caution",
    "label": "Knee Pain Caution Regression",
    "ruleType": "regression",
    "appliesToWorkoutTypeIds": [
      "strength",
      "hypertrophy",
      "conditioning"
    ],
    "appliesToGoalIds": [
      "lower_body_strength",
      "beginner_strength",
      "low_impact_conditioning"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "trigger": "Knee caution or knee pain appears in the current session.",
    "triggerConditions": [
      {
        "metricId": "pain_location",
        "operator": "=",
        "value": "knee"
      }
    ],
    "regressWhen": [
      {
        "metricId": "pain_score_after",
        "operator": ">",
        "value": 2
      }
    ],
    "action": "Reduce knee-dominant range and replace jumps/lunges with box squat, bridge, bike, or sled variants.",
    "regressionAction": {
      "kind": "swap_exercise",
      "target": "knee_friendlier_substitution"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "knee_caution",
        "no_jumping"
      ],
      "missingDataBehavior": "regress"
    },
    "requiredTrackingMetricIds": [
      "pain_location",
      "pain_score_after"
    ],
    "userMessage": "Knee signal is active. Use the friendlier version and keep range pain-free.",
    "coachNotes": [
      "Avoid deep knee flexion under fatigue until symptoms settle."
    ],
    "explanation": "Knee pain changes exercise selection before load or density progresses."
  },
  {
    "id": "regression_low_back_caution",
    "label": "Low-Back Caution Regression",
    "ruleType": "regression",
    "appliesToWorkoutTypeIds": [
      "strength",
      "hypertrophy",
      "conditioning"
    ],
    "appliesToGoalIds": [
      "beginner_strength",
      "lower_body_strength",
      "full_gym_strength"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "trigger": "Back caution is present or hinge work provokes symptoms.",
    "triggerConditions": [
      {
        "metricId": "pain_location",
        "operator": "=",
        "value": "back"
      }
    ],
    "regressWhen": [
      {
        "metricId": "pain_score_after",
        "operator": ">",
        "value": 2
      }
    ],
    "action": "Remove heavy hinge/axial load and use bridge, supported squat, or bike alternatives.",
    "regressionAction": {
      "kind": "swap_exercise",
      "target": "low_spine_load_substitution"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "back_caution"
      ],
      "missingDataBehavior": "regress"
    },
    "requiredTrackingMetricIds": [
      "pain_location",
      "pain_score_after",
      "movement_quality"
    ],
    "userMessage": "Back signal is active. Shift to lower-spine-load work today.",
    "coachNotes": [
      "Avoid loaded flexion and fatigue-based hinge density."
    ],
    "explanation": "Low-back caution requires reducing spinal load and hinge repetition."
  },
  {
    "id": "regression_shoulder_caution",
    "label": "Shoulder Caution Regression",
    "ruleType": "regression",
    "appliesToWorkoutTypeIds": [
      "strength",
      "hypertrophy",
      "boxing_support"
    ],
    "appliesToGoalIds": [
      "upper_body_strength",
      "boxing_support",
      "dumbbell_hypertrophy"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "trigger": "Shoulder caution is present or pressing/throwing creates symptoms.",
    "triggerConditions": [
      {
        "metricId": "pain_location",
        "operator": "=",
        "value": "shoulder"
      }
    ],
    "regressWhen": [
      {
        "metricId": "pain_score_after",
        "operator": ">",
        "value": 2
      }
    ],
    "action": "Swap overhead/ballistic shoulder work for rows, cuff work, landmine angles, or floor press.",
    "regressionAction": {
      "kind": "swap_exercise",
      "target": "shoulder_friendlier_substitution"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "shoulder_caution"
      ],
      "missingDataBehavior": "regress"
    },
    "requiredTrackingMetricIds": [
      "pain_location",
      "pain_score_after"
    ],
    "userMessage": "Shoulder signal is active. Use the pain-free angle and skip aggressive overhead work.",
    "coachNotes": [
      "Avoid end-range pressing and ballistic throws with shoulder pain."
    ],
    "explanation": "Shoulder caution changes angles and removes ballistic demand."
  },
  {
    "id": "regression_wrist_caution",
    "label": "Wrist Caution Regression",
    "ruleType": "regression",
    "appliesToWorkoutTypeIds": [
      "strength",
      "bodyweight_strength",
      "mobility"
    ],
    "appliesToGoalIds": [
      "no_equipment",
      "beginner_strength",
      "mobility"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "trigger": "Wrist-loaded positions are painful or unavailable.",
    "triggerConditions": [
      {
        "metricId": "pain_location",
        "operator": "=",
        "value": "wrist"
      }
    ],
    "regressWhen": [
      {
        "metricId": "pain_score_after",
        "operator": ">",
        "value": 2
      }
    ],
    "action": "Use incline, fist/handle, forearm-supported, or non-hand-loaded substitutes.",
    "regressionAction": {
      "kind": "swap_exercise",
      "target": "wrist_neutral_substitution"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "wrist_caution"
      ],
      "missingDataBehavior": "regress"
    },
    "requiredTrackingMetricIds": [
      "pain_location",
      "pain_score_after"
    ],
    "userMessage": "No need to force loaded wrists. Pick the neutral-hand version.",
    "coachNotes": [
      "Watch push-ups, crawling, side planks, and floor mobility."
    ],
    "explanation": "Wrist caution is solved by changing contact position or exercise family."
  },
  {
    "id": "regression_no_jumping",
    "label": "No Jumping Regression",
    "ruleType": "regression",
    "appliesToWorkoutTypeIds": [
      "conditioning",
      "power",
      "boxing_support"
    ],
    "appliesToGoalIds": [
      "boxing_support",
      "low_impact_conditioning"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "trigger": "No-jumping flag is active.",
    "triggerConditions": [
      {
        "metricId": "safety_flag",
        "operator": "includes",
        "value": "no_jumping"
      }
    ],
    "regressWhen": [
      {
        "metricId": "safety_flag",
        "operator": "includes",
        "value": "no_jumping"
      }
    ],
    "action": "Replace jumps, hops, and rope contacts with bike, sled, ropes, carries, or step-controlled work.",
    "regressionAction": {
      "kind": "swap_exercise",
      "target": "low_impact_substitution"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "no_jumping"
      ],
      "missingDataBehavior": "regress"
    },
    "requiredTrackingMetricIds": [
      "substitution_used",
      "pain_score_after"
    ],
    "userMessage": "Jumping is out today. Keep the conditioning effect without contacts.",
    "coachNotes": [
      "Do not substitute running for jumping if knee/ankle flags exist."
    ],
    "explanation": "No-jumping constraints remove repeated contacts while preserving training intent."
  },
  {
    "id": "regression_no_running",
    "label": "No Running Regression",
    "ruleType": "regression",
    "appliesToWorkoutTypeIds": [
      "zone2_cardio",
      "conditioning",
      "low_impact_conditioning"
    ],
    "appliesToGoalIds": [
      "zone2_cardio",
      "low_impact_conditioning",
      "recovery"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "trigger": "No-running flag is active.",
    "triggerConditions": [
      {
        "metricId": "safety_flag",
        "operator": "includes",
        "value": "no_running"
      }
    ],
    "regressWhen": [
      {
        "metricId": "safety_flag",
        "operator": "includes",
        "value": "no_running"
      }
    ],
    "action": "Use bike, rower if tolerated, sled, incline walk if allowed, or easy recovery flow.",
    "regressionAction": {
      "kind": "swap_exercise",
      "target": "non_running_cardio"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "no_running"
      ],
      "missingDataBehavior": "regress"
    },
    "requiredTrackingMetricIds": [
      "duration_minutes",
      "actual_rpe",
      "substitution_used"
    ],
    "userMessage": "Running is out. Keep the aerobic target with a non-running option.",
    "coachNotes": [
      "Foot-strike symptoms should bias bike before incline walking."
    ],
    "explanation": "No-running constraints preserve aerobic work without running exposure."
  },
  {
    "id": "regression_limited_time",
    "label": "Limited Time Regression",
    "ruleType": "regression",
    "appliesToWorkoutTypeIds": [
      "strength",
      "hypertrophy",
      "conditioning",
      "mobility"
    ],
    "appliesToGoalIds": [
      "limited_equipment",
      "beginner_strength",
      "hypertrophy",
      "mobility"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "trigger": "Requested duration is too short for the full template.",
    "triggerConditions": [
      {
        "metricId": "duration_minutes",
        "operator": "<",
        "value": 25
      }
    ],
    "regressWhen": [
      {
        "metricId": "time_limited",
        "operator": "=",
        "value": true
      }
    ],
    "action": "Keep warm-up, one main priority, and cooldown; remove optional accessories first.",
    "regressionAction": {
      "kind": "reduce_volume",
      "amount": 1,
      "unit": "optional_block",
      "target": "session_template"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "time_limited"
      ],
      "missingDataBehavior": "repeat"
    },
    "requiredTrackingMetricIds": [
      "duration_minutes"
    ],
    "userMessage": "Short session: keep the anchor work and cut the extras.",
    "coachNotes": [
      "Never remove warm-up or safety check-in to save time."
    ],
    "explanation": "Time limitation reduces optional work before core session intent."
  },
  {
    "id": "regression_limited_equipment",
    "label": "Limited Equipment Regression",
    "ruleType": "regression",
    "appliesToWorkoutTypeIds": [
      "strength",
      "hypertrophy",
      "conditioning"
    ],
    "appliesToGoalIds": [
      "limited_equipment",
      "no_equipment"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "trigger": "Required equipment is unavailable.",
    "triggerConditions": [
      {
        "metricId": "equipment_available",
        "operator": "=",
        "value": false
      }
    ],
    "regressWhen": [
      {
        "metricId": "substitution_used",
        "operator": "present"
      }
    ],
    "action": "Select bodyweight, band, dumbbell, or space-only substitute preserving the pattern.",
    "regressionAction": {
      "kind": "swap_exercise",
      "target": "equipment_compatible_substitution"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "equipment_limited"
      ],
      "missingDataBehavior": "repeat"
    },
    "requiredTrackingMetricIds": [
      "substitution_used"
    ],
    "userMessage": "Use the version that matches your setup. Same pattern, available tools.",
    "coachNotes": [
      "Equipment substitution must still satisfy safety flags."
    ],
    "explanation": "Equipment constraints should alter exercise choice, not erase the training goal."
  },
  {
    "id": "regression_beginner_technique_issue",
    "label": "Beginner Technique Issue Regression",
    "ruleType": "regression",
    "appliesToWorkoutTypeIds": [
      "strength",
      "bodyweight_strength",
      "mobility"
    ],
    "appliesToGoalIds": [
      "beginner_strength",
      "no_equipment",
      "return_to_training"
    ],
    "appliesToExperienceLevels": [
      "beginner"
    ],
    "trigger": "Movement quality is low or the athlete cannot describe/feel the target pattern.",
    "triggerConditions": [
      {
        "metricId": "movement_quality",
        "operator": "<=",
        "value": 2
      }
    ],
    "regressWhen": [
      {
        "metricId": "technical_quality",
        "operator": "<=",
        "value": 2
      }
    ],
    "action": "Use the teaching drill or supported variation and lower intensity.",
    "regressionAction": {
      "kind": "swap_exercise",
      "target": "teaching_regression"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "new_athlete"
      ],
      "missingDataBehavior": "regress"
    },
    "requiredTrackingMetricIds": [
      "movement_quality",
      "technical_quality"
    ],
    "userMessage": "Switch to the teaching version and make the pattern feel obvious.",
    "coachNotes": [
      "Technique issues are not solved with more fatigue."
    ],
    "explanation": "Beginners need pattern clarity before load, density, or complexity."
  },
  {
    "id": "regression_balance_fall_risk",
    "label": "Balance/Fall Risk Regression",
    "ruleType": "regression",
    "appliesToWorkoutTypeIds": [
      "mobility",
      "core_durability",
      "recovery"
    ],
    "appliesToGoalIds": [
      "mobility",
      "core_durability",
      "return_to_training"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "trigger": "Balance loss, dizziness, or fall concern is present.",
    "triggerConditions": [
      {
        "metricId": "movement_quality",
        "operator": "<=",
        "value": 2
      }
    ],
    "regressWhen": [
      {
        "metricId": "safety_flag",
        "operator": "includes",
        "value": "severe_dizziness"
      }
    ],
    "action": "Use supported stance, seated/floor drills, or remove balance challenge.",
    "regressionAction": {
      "kind": "swap_exercise",
      "target": "supported_balance_regression"
    },
    "safetyOverride": {
      "blockingFlagIds": [
        "severe_dizziness",
        "fainting"
      ],
      "missingDataBehavior": "regress"
    },
    "requiredTrackingMetricIds": [
      "movement_quality",
      "symptom_change"
    ],
    "userMessage": "Use support and remove the balance challenge today.",
    "coachNotes": [
      "Dizziness/fainting is a block, not a balance progression problem."
    ],
    "explanation": "Fall risk requires environmental support and lower complexity."
  },
  {
    "id": "regression_post_illness_return",
    "label": "Post-Illness Return Regression",
    "ruleType": "regression",
    "appliesToWorkoutTypeIds": [
      "strength",
      "conditioning",
      "recovery"
    ],
    "appliesToGoalIds": [
      "return_to_training",
      "recovery",
      "zone2_cardio"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "trigger": "Illness caution or first week back after symptoms.",
    "triggerConditions": [
      {
        "metricId": "safety_flag",
        "operator": "includes",
        "value": "illness_caution"
      }
    ],
    "regressWhen": [
      {
        "metricId": "symptom_change",
        "operator": "=",
        "value": "worse"
      }
    ],
    "action": "Use recovery or easy Zone 2 only; cap RPE at 3-4 until symptoms remain stable.",
    "regressionAction": {
      "kind": "change_intensity",
      "amount": 4,
      "unit": "rpe_cap",
      "target": "session"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "illness_caution"
      ],
      "missingDataBehavior": "regress"
    },
    "requiredTrackingMetricIds": [
      "symptom_change",
      "actual_rpe"
    ],
    "userMessage": "First build back from illness: easy work only, stop if symptoms climb.",
    "coachNotes": [
      "Avoid HIIT, hard sparring support, and heavy lower-body loading."
    ],
    "explanation": "Illness return is a re-entry phase, not a restart at prior intensity."
  },
  {
    "id": "regression_high_fatigue",
    "label": "High Fatigue Regression",
    "ruleType": "regression",
    "appliesToWorkoutTypeIds": [
      "strength",
      "hypertrophy",
      "conditioning",
      "power"
    ],
    "appliesToGoalIds": [
      "beginner_strength",
      "hypertrophy",
      "boxing_support"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "trigger": "Fatigue markers or repeated high RPE indicate accumulating cost.",
    "triggerConditions": [
      {
        "metricId": "actual_rpe",
        "operator": ">=",
        "value": 8,
        "windowDays": 7
      }
    ],
    "regressWhen": [
      {
        "metricId": "completion_tolerance",
        "operator": "=",
        "value": "poor"
      }
    ],
    "action": "Cut hard sets or intervals by 25 percent and remove optional finishers.",
    "regressionAction": {
      "kind": "reduce_volume",
      "amount": 25,
      "unit": "percent",
      "target": "hard_volume"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "high_soreness",
        "poor_readiness"
      ],
      "missingDataBehavior": "regress"
    },
    "requiredTrackingMetricIds": [
      "actual_rpe",
      "completion_tolerance"
    ],
    "userMessage": "Fatigue is stacking. Trim hard work so the next sessions can land.",
    "coachNotes": [
      "Look at protected workouts before adding support sessions."
    ],
    "explanation": "High fatigue calls for lower cost before adherence and quality drop."
  },
  {
    "id": "regression_user_disliked_exercise",
    "label": "User Disliked Exercise Regression",
    "ruleType": "regression",
    "appliesToWorkoutTypeIds": [
      "strength",
      "hypertrophy",
      "conditioning",
      "mobility"
    ],
    "appliesToGoalIds": [
      "beginner_strength",
      "hypertrophy",
      "limited_equipment",
      "mobility"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "trigger": "Athlete dislikes or avoids a selected exercise.",
    "triggerConditions": [
      {
        "metricId": "preference",
        "operator": "=",
        "value": "dislike"
      }
    ],
    "regressWhen": [
      {
        "metricId": "completion_status",
        "operator": "=",
        "value": "skipped"
      }
    ],
    "action": "Choose a same-pattern substitute that improves adherence while preserving safety.",
    "regressionAction": {
      "kind": "swap_exercise",
      "target": "preference_compatible_substitution"
    },
    "safetyOverride": {
      "missingDataBehavior": "repeat"
    },
    "requiredTrackingMetricIds": [
      "completion_status",
      "substitution_used"
    ],
    "userMessage": "Swap the exercise, not the goal. Pick a version you will actually do.",
    "coachNotes": [
      "Preference matters after safety and pattern intent are preserved."
    ],
    "explanation": "Adherence improves when disliked exercises have intelligent substitutions."
  },
  {
    "id": "regression_repeated_non_completion",
    "label": "Repeated Non-Completion Regression",
    "ruleType": "regression",
    "appliesToWorkoutTypeIds": [
      "strength",
      "hypertrophy",
      "conditioning"
    ],
    "appliesToGoalIds": [
      "beginner_strength",
      "hypertrophy",
      "low_impact_conditioning",
      "limited_equipment"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "trigger": "Two or more recent sessions are not completed as prescribed.",
    "triggerConditions": [
      {
        "metricId": "completion_status",
        "operator": "=",
        "value": "not_completed",
        "windowDays": 14
      }
    ],
    "regressWhen": [
      {
        "metricId": "completion_status",
        "operator": "=",
        "value": "not_completed"
      }
    ],
    "action": "Reduce session length and volume, then rebuild from a repeatable baseline.",
    "regressionAction": {
      "kind": "reduce_volume",
      "amount": 30,
      "unit": "percent",
      "target": "session_volume"
    },
    "safetyOverride": {
      "missingDataBehavior": "regress"
    },
    "requiredTrackingMetricIds": [
      "completion_status",
      "duration_minutes",
      "actual_rpe"
    ],
    "userMessage": "The current dose is not repeatable yet. Shrink it until consistency returns.",
    "coachNotes": [
      "Check time, equipment, preference, and readiness before blaming effort."
    ],
    "explanation": "Repeated non-completion means the plan should meet the athlete where they are."
  }
] satisfies RegressionRule[];
