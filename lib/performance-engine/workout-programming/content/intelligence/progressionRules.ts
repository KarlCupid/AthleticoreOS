import type { ProgressionRule } from '../../types.ts';

export const progressionRules = [
  {
    "id": "progression_beginner_linear_load",
    "label": "Beginner Linear Load Progression",
    "ruleType": "progression",
    "appliesToWorkoutTypeIds": [
      "strength",
      "full_body_strength",
      "upper_strength",
      "lower_strength"
    ],
    "appliesToGoalIds": [
      "beginner_strength",
      "full_gym_strength",
      "upper_body_strength",
      "lower_body_strength"
    ],
    "appliesToExperienceLevels": [
      "beginner"
    ],
    "trigger": "All prescribed sets completed with stable pain and target RPE at or below 7.",
    "triggerConditions": [
      {
        "metricId": "completion_status",
        "operator": "=",
        "value": "completed",
        "explanation": "The athlete finished the planned work."
      },
      {
        "metricId": "actual_rpe",
        "operator": "<=",
        "value": 7,
        "explanation": "Effort stayed comfortably submaximal."
      },
      {
        "metricId": "pain_score_after",
        "operator": "<=",
        "value": 2,
        "explanation": "Pain did not become a limiter."
      }
    ],
    "action": "Increase load by the smallest practical jump next exposure while keeping the same sets and reps.",
    "progressionAction": {
      "kind": "increase_load",
      "amount": 2.5,
      "unit": "percent",
      "target": "load",
      "explanation": "Small load jumps protect technique for new athletes."
    },
    "maxProgressionRate": {
      "max": 5,
      "unit": "percent_per_session"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "pain_increased_last_session",
        "poor_readiness"
      ],
      "missingDataBehavior": "repeat"
    },
    "requiredTrackingMetricIds": [
      "sets_completed",
      "reps_completed",
      "load_used",
      "actual_rpe",
      "pain_score_after"
    ],
    "userMessage": "You owned the work. Add the smallest load jump next time and keep the same clean reps.",
    "coachNotes": [
      "Use only the smallest available load jump.",
      "Repeat instead of progressing if pain, dizziness, or poor readiness is present."
    ],
    "explanation": "Linear load progression is appropriate for beginner strength when completion, pain, and effort are all controlled."
  },
  {
    "id": "progression_double_8_12",
    "label": "Double Progression 8-12",
    "ruleType": "progression",
    "appliesToWorkoutTypeIds": [
      "hypertrophy"
    ],
    "appliesToGoalIds": [
      "hypertrophy",
      "dumbbell_hypertrophy"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "trigger": "All working sets reach the top of the 8-12 rep range at RPE 8 or lower.",
    "triggerConditions": [
      {
        "metricId": "reps_completed",
        "operator": ">=",
        "value": 12,
        "explanation": "Top of the rep range was achieved."
      },
      {
        "metricId": "actual_rpe",
        "operator": "<=",
        "value": 8,
        "explanation": "The top set was not a grind."
      }
    ],
    "action": "Increase load next time and restart near 8 reps per set.",
    "progressionAction": {
      "kind": "increase_load",
      "amount": 2.5,
      "unit": "percent",
      "target": "load",
      "explanation": "Load rises only after the athlete owns the full rep range."
    },
    "maxProgressionRate": {
      "max": 5,
      "unit": "percent_per_progression"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "shoulder_caution",
        "knee_caution",
        "back_caution"
      ],
      "missingDataBehavior": "repeat"
    },
    "requiredTrackingMetricIds": [
      "reps_completed",
      "load_used",
      "actual_rpe"
    ],
    "userMessage": "You hit the top of the range. Add a small load next time and build back from 8 clean reps.",
    "coachNotes": [
      "Do not add load if the final reps changed shape.",
      "For dumbbells, one available jump may exceed 5%; reduce reps accordingly."
    ],
    "explanation": "The 8-12 double progression balances hypertrophy volume with load progression."
  },
  {
    "id": "progression_double_6_10",
    "label": "Double Progression 6-10",
    "ruleType": "progression",
    "appliesToWorkoutTypeIds": [
      "strength",
      "full_body_strength",
      "upper_strength",
      "lower_strength"
    ],
    "appliesToGoalIds": [
      "beginner_strength",
      "full_gym_strength",
      "upper_body_strength",
      "lower_body_strength"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate"
    ],
    "trigger": "All prescribed sets reach 10 reps with RPE at or below 7 and no technique loss.",
    "triggerConditions": [
      {
        "metricId": "reps_completed",
        "operator": ">=",
        "value": 10
      },
      {
        "metricId": "actual_rpe",
        "operator": "<=",
        "value": 7
      },
      {
        "metricId": "movement_quality",
        "operator": ">=",
        "value": 4
      }
    ],
    "action": "Add a small load and return to 6-8 reps on the next exposure.",
    "progressionAction": {
      "kind": "increase_load",
      "amount": 2.5,
      "unit": "percent",
      "target": "load"
    },
    "maxProgressionRate": {
      "max": 5,
      "unit": "percent_per_session"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "pain_increased_last_session"
      ],
      "missingDataBehavior": "repeat"
    },
    "requiredTrackingMetricIds": [
      "reps_completed",
      "load_used",
      "actual_rpe",
      "movement_quality"
    ],
    "userMessage": "The set quality is ready for a small load bump. Start lower in the rep range next time.",
    "coachNotes": [
      "Best for foundational lifts and accessories that tolerate load well."
    ],
    "explanation": "The 6-10 range lets strength-oriented work progress without rushing load."
  },
  {
    "id": "progression_hypertrophy_volume",
    "label": "Hypertrophy Volume Progression",
    "ruleType": "progression",
    "appliesToWorkoutTypeIds": [
      "hypertrophy"
    ],
    "appliesToGoalIds": [
      "hypertrophy",
      "dumbbell_hypertrophy"
    ],
    "appliesToExperienceLevels": [
      "intermediate",
      "advanced"
    ],
    "trigger": "Two exposures completed at target RPE with stable soreness and no joint irritation.",
    "triggerConditions": [
      {
        "metricId": "completion_status",
        "operator": "=",
        "value": "completed",
        "windowDays": 14
      },
      {
        "metricId": "actual_rpe",
        "operator": "<=",
        "value": 8
      },
      {
        "metricId": "soreness",
        "operator": "<=",
        "value": 3
      }
    ],
    "action": "Add one set to the priority muscle group or add 2-4 total weekly sets.",
    "progressionAction": {
      "kind": "add_volume",
      "amount": 1,
      "unit": "set",
      "target": "priority_exercise"
    },
    "maxProgressionRate": {
      "max": 4,
      "unit": "sets_per_week"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "high_soreness",
        "under_fueled"
      ],
      "missingDataBehavior": "repeat"
    },
    "requiredTrackingMetricIds": [
      "sets_completed",
      "actual_rpe",
      "soreness"
    ],
    "userMessage": "Recovery is keeping up. Add a little volume to the target area, not the whole workout.",
    "coachNotes": [
      "Progress one region at a time.",
      "Do not add volume after under-fueling or poor sleep trends."
    ],
    "explanation": "Hypertrophy volume should advance only when the athlete is tolerating the current dose."
  },
  {
    "id": "progression_zone2_duration",
    "label": "Zone 2 Duration Progression",
    "ruleType": "progression",
    "appliesToWorkoutTypeIds": [
      "zone2_cardio"
    ],
    "appliesToGoalIds": [
      "zone2_cardio"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "trigger": "Athlete completes the full duration at conversational effort without symptom increase.",
    "triggerConditions": [
      {
        "metricId": "duration_minutes",
        "operator": ">=",
        "value": 20
      },
      {
        "metricId": "actual_rpe",
        "operator": "<=",
        "value": 4
      },
      {
        "metricId": "talk_test",
        "operator": "=",
        "value": "conversational"
      }
    ],
    "action": "Add 3-5 minutes next session, capped at the goal duration.",
    "progressionAction": {
      "kind": "add_volume",
      "amount": 5,
      "unit": "minutes",
      "target": "duration"
    },
    "maxProgressionRate": {
      "max": 10,
      "unit": "minutes_per_week"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "illness_caution",
        "poor_readiness"
      ],
      "missingDataBehavior": "repeat"
    },
    "requiredTrackingMetricIds": [
      "duration_minutes",
      "actual_rpe",
      "heart_rate_zone"
    ],
    "userMessage": "Keep the same easy pace and add a few minutes, not intensity.",
    "coachNotes": [
      "Progress duration before pace.",
      "Back off if breathing stops being conversational."
    ],
    "explanation": "Zone 2 grows through repeatable duration while effort stays easy."
  },
  {
    "id": "progression_hiit_interval",
    "label": "HIIT Interval Progression",
    "ruleType": "progression",
    "appliesToWorkoutTypeIds": [
      "conditioning",
      "low_impact_conditioning"
    ],
    "appliesToGoalIds": [
      "low_impact_conditioning",
      "boxing_support"
    ],
    "appliesToExperienceLevels": [
      "intermediate",
      "advanced"
    ],
    "trigger": "All intervals completed within target effort and output does not drop more than 10 percent.",
    "triggerConditions": [
      {
        "metricId": "rounds_completed",
        "operator": ">=",
        "value": 6
      },
      {
        "metricId": "actual_rpe",
        "operator": "<=",
        "value": 8
      },
      {
        "metricId": "pace",
        "operator": ">=",
        "value": 0.9,
        "explanation": "Output remains within 10 percent of the first interval."
      }
    ],
    "action": "Add one interval or add 5 seconds of work while preserving rest.",
    "progressionAction": {
      "kind": "add_volume",
      "amount": 1,
      "unit": "interval",
      "target": "rounds"
    },
    "maxProgressionRate": {
      "max": 1,
      "unit": "interval_per_session"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "under_fueled",
        "poor_readiness",
        "post_competition_recovery"
      ],
      "missingDataBehavior": "regress"
    },
    "requiredTrackingMetricIds": [
      "rounds_completed",
      "work_seconds",
      "actual_rpe"
    ],
    "userMessage": "Add one repeat only if the last repeat still looked like training, not survival.",
    "coachNotes": [
      "Prefer low-impact tools when joints are flagged.",
      "Do not progress HIIT with sleep or fueling risk."
    ],
    "explanation": "Intervals progress when repeat quality holds, not when the athlete merely survives them."
  },
  {
    "id": "progression_circuit_density",
    "label": "Circuit Density Progression",
    "ruleType": "progression",
    "appliesToWorkoutTypeIds": [
      "conditioning",
      "bodyweight_strength",
      "core_durability"
    ],
    "appliesToGoalIds": [
      "no_equipment",
      "limited_equipment",
      "core_durability"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "trigger": "Circuit completed with clean movement and at least one minute left before the time cap.",
    "triggerConditions": [
      {
        "metricId": "rounds_completed",
        "operator": ">=",
        "value": 3
      },
      {
        "metricId": "movement_quality",
        "operator": ">=",
        "value": 4
      }
    ],
    "action": "Add a round, reduce transition rest slightly, or add one rep per movement.",
    "progressionAction": {
      "kind": "add_volume",
      "amount": 1,
      "unit": "round",
      "target": "circuit"
    },
    "maxProgressionRate": {
      "max": 1,
      "unit": "round_per_session"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "high_fatigue",
        "pain_increased_last_session"
      ],
      "missingDataBehavior": "repeat"
    },
    "requiredTrackingMetricIds": [
      "rounds_completed",
      "movement_quality",
      "actual_rpe"
    ],
    "userMessage": "Make the circuit a little denser while keeping the same clean movement standard.",
    "coachNotes": [
      "Do not reduce rest if technique is already decaying."
    ],
    "explanation": "Density progression increases work capacity without needing more equipment."
  },
  {
    "id": "progression_balance_complexity",
    "label": "Balance Complexity Progression",
    "ruleType": "progression",
    "appliesToWorkoutTypeIds": [
      "mobility",
      "recovery",
      "core_durability"
    ],
    "appliesToGoalIds": [
      "mobility",
      "recovery",
      "core_durability",
      "return_to_training"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "trigger": "Balance hold is steady with no stumbles or pain for the target duration.",
    "triggerConditions": [
      {
        "metricId": "duration_minutes",
        "operator": ">=",
        "value": 1
      },
      {
        "metricId": "movement_quality",
        "operator": ">=",
        "value": 4
      },
      {
        "metricId": "pain_score_after",
        "operator": "<=",
        "value": 2
      }
    ],
    "action": "Progress stance, reach, or visual challenge before adding load.",
    "progressionAction": {
      "kind": "change_intensity",
      "target": "coordination_complexity",
      "explanation": "Complexity rises before external load."
    },
    "maxProgressionRate": {
      "max": 1,
      "unit": "complexity_step_per_week"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "balance_concern"
      ],
      "missingDataBehavior": "repeat"
    },
    "requiredTrackingMetricIds": [
      "duration_minutes",
      "movement_quality"
    ],
    "userMessage": "Make the balance task slightly more complex, but keep a support nearby.",
    "coachNotes": [
      "Never progress balance after dizziness, fainting, or fall concern."
    ],
    "explanation": "Balance progresses through controlled complexity rather than fatigue."
  },
  {
    "id": "progression_mobility_range_of_motion",
    "label": "Range-of-Motion Mobility Progression",
    "ruleType": "progression",
    "appliesToWorkoutTypeIds": [
      "mobility",
      "recovery"
    ],
    "appliesToGoalIds": [
      "mobility",
      "recovery",
      "return_to_training"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "trigger": "Range improves or feels easier without symptom increase after two exposures.",
    "triggerConditions": [
      {
        "metricId": "range_quality",
        "operator": ">=",
        "value": 4
      },
      {
        "metricId": "symptom_change",
        "operator": "=",
        "value": "same_or_better"
      }
    ],
    "action": "Increase range slightly or add one controlled rep per side.",
    "progressionAction": {
      "kind": "add_volume",
      "amount": 1,
      "unit": "rep_per_side",
      "target": "mobility_drill"
    },
    "maxProgressionRate": {
      "max": 2,
      "unit": "reps_per_week"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "pain_increased_last_session"
      ],
      "missingDataBehavior": "repeat"
    },
    "requiredTrackingMetricIds": [
      "range_quality",
      "symptom_change"
    ],
    "userMessage": "Explore a little more range, but stop before the body guards or pinches.",
    "coachNotes": [
      "Range progression must feel smoother, not forced."
    ],
    "explanation": "Mobility improves when range is earned with control and symptoms stay quiet."
  },
  {
    "id": "progression_power_quality_gate",
    "label": "Power Progression with Quality Gate",
    "ruleType": "progression",
    "appliesToWorkoutTypeIds": [
      "power",
      "boxing_support"
    ],
    "appliesToGoalIds": [
      "boxing_support"
    ],
    "appliesToExperienceLevels": [
      "intermediate",
      "advanced"
    ],
    "trigger": "All power reps stay fast, crisp, and pain-free with full recovery between sets.",
    "triggerConditions": [
      {
        "metricId": "movement_quality",
        "operator": ">=",
        "value": 4
      },
      {
        "metricId": "actual_rpe",
        "operator": "<=",
        "value": 7
      },
      {
        "metricId": "pain_score_after",
        "operator": "<=",
        "value": 2
      }
    ],
    "action": "Add one set or slightly increase implement load; never add reps under fatigue.",
    "progressionAction": {
      "kind": "add_volume",
      "amount": 1,
      "unit": "set",
      "target": "power_block"
    },
    "maxProgressionRate": {
      "max": 1,
      "unit": "set_per_week"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "shoulder_caution",
        "poor_readiness",
        "high_soreness"
      ],
      "missingDataBehavior": "repeat"
    },
    "requiredTrackingMetricIds": [
      "movement_quality",
      "actual_rpe",
      "pain_score_after"
    ],
    "userMessage": "Power only progresses when every rep is sharp. Add a little, then stop before speed drops.",
    "coachNotes": [
      "Terminate power sets on speed loss.",
      "Do not progress ballistic work with shoulder or back flags."
    ],
    "explanation": "Power work is quality-gated because fatigue changes the training effect and raises risk."
  },
  {
    "id": "progression_autoregulated_rpe_rir",
    "label": "Autoregulated RPE/RIR Progression",
    "ruleType": "progression",
    "appliesToWorkoutTypeIds": [
      "strength",
      "hypertrophy",
      "full_body_strength"
    ],
    "appliesToGoalIds": [
      "beginner_strength",
      "hypertrophy",
      "full_gym_strength",
      "dumbbell_hypertrophy"
    ],
    "appliesToExperienceLevels": [
      "intermediate",
      "advanced"
    ],
    "trigger": "Actual RPE is at least one point below target or RIR is higher than prescribed.",
    "triggerConditions": [
      {
        "metricId": "actual_rpe",
        "operator": "<=",
        "value": 6
      },
      {
        "metricId": "completion_status",
        "operator": "=",
        "value": "completed"
      }
    ],
    "action": "Progress load, reps, or sets by the smallest available step based on the prescription model.",
    "progressionAction": {
      "kind": "increase_load",
      "amount": 2.5,
      "unit": "percent",
      "target": "primary_progression_variable"
    },
    "maxProgressionRate": {
      "max": 5,
      "unit": "percent_or_one_set"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "unknown_readiness",
        "pain_increased_last_session"
      ],
      "missingDataBehavior": "repeat"
    },
    "requiredTrackingMetricIds": [
      "actual_rpe",
      "sets_completed",
      "reps_completed"
    ],
    "userMessage": "Today had room in reserve. Take the smallest useful progression, not a leap.",
    "coachNotes": [
      "Use RPE/RIR to choose the variable, not to justify aggressive jumps."
    ],
    "explanation": "Autoregulation progresses only when the athlete demonstrates reserve under the target prescription."
  },
  {
    "id": "progression_recovery_based",
    "label": "Recovery-Based Progression",
    "ruleType": "progression",
    "appliesToWorkoutTypeIds": [
      "strength",
      "hypertrophy",
      "conditioning"
    ],
    "appliesToGoalIds": [
      "beginner_strength",
      "hypertrophy",
      "limited_equipment",
      "low_impact_conditioning"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "trigger": "Readiness is green or yellow, sleep is adequate, and soreness is low.",
    "triggerConditions": [
      {
        "metricId": "readiness_after",
        "operator": "present"
      },
      {
        "metricId": "sleep_quality",
        "operator": ">=",
        "value": 3
      },
      {
        "metricId": "soreness",
        "operator": "<=",
        "value": 2
      }
    ],
    "action": "Allow normal progression for the session type; otherwise repeat the prior dose.",
    "progressionAction": {
      "kind": "repeat",
      "target": "normal_progression_gate",
      "explanation": "Recovery opens the gate for the relevant progression rule."
    },
    "maxProgressionRate": {
      "max": 1,
      "unit": "normal_rule_step"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "poor_sleep",
        "high_soreness",
        "poor_readiness"
      ],
      "missingDataBehavior": "repeat"
    },
    "requiredTrackingMetricIds": [
      "readiness_after",
      "sleep_quality",
      "soreness"
    ],
    "userMessage": "Recovery is good enough to progress the plan. Keep the change modest.",
    "coachNotes": [
      "This is a gate rule; pair it with the lift/cardio-specific rule."
    ],
    "explanation": "Progression should harmonize with readiness instead of ignoring it."
  },
  {
    "id": "progression_skill",
    "label": "Skill Progression",
    "ruleType": "progression",
    "appliesToWorkoutTypeIds": [
      "boxing_support",
      "assessment"
    ],
    "appliesToGoalIds": [
      "boxing_support"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "trigger": "The athlete repeats the skill with clean timing and no fatigue-driven breakdown.",
    "triggerConditions": [
      {
        "metricId": "technical_quality",
        "operator": ">=",
        "value": 4
      },
      {
        "metricId": "actual_rpe",
        "operator": "<=",
        "value": 6
      }
    ],
    "action": "Progress one skill variable: stance demand, speed, coordination, or decision complexity.",
    "progressionAction": {
      "kind": "change_intensity",
      "target": "skill_complexity"
    },
    "maxProgressionRate": {
      "max": 1,
      "unit": "skill_variable_per_session"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "coach_review_needed",
        "poor_readiness"
      ],
      "missingDataBehavior": "repeat"
    },
    "requiredTrackingMetricIds": [
      "technical_quality",
      "actual_rpe"
    ],
    "userMessage": "Add one layer of skill difficulty while keeping the same smooth timing.",
    "coachNotes": [
      "Avoid progressing speed and complexity together."
    ],
    "explanation": "Skill work progresses by complexity only after repeatable technical quality."
  },
  {
    "id": "progression_deload_return_to_baseline",
    "label": "Deload Return-to-Baseline Progression",
    "ruleType": "progression",
    "appliesToWorkoutTypeIds": [
      "strength",
      "hypertrophy",
      "conditioning"
    ],
    "appliesToGoalIds": [
      "beginner_strength",
      "hypertrophy",
      "low_impact_conditioning",
      "return_to_training"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "trigger": "Deload week is completed and soreness/readiness return to baseline.",
    "triggerConditions": [
      {
        "metricId": "completion_status",
        "operator": "=",
        "value": "completed"
      },
      {
        "metricId": "soreness",
        "operator": "<=",
        "value": 2
      },
      {
        "metricId": "readiness_after",
        "operator": "present"
      }
    ],
    "action": "Return to 90-100 percent of the pre-deload volume before adding new load or density.",
    "progressionAction": {
      "kind": "add_volume",
      "amount": 90,
      "unit": "percent_of_baseline",
      "target": "weekly_volume"
    },
    "maxProgressionRate": {
      "max": 100,
      "unit": "percent_of_pre_deload_baseline"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "pain_increased_last_session",
        "illness_caution"
      ],
      "missingDataBehavior": "repeat"
    },
    "requiredTrackingMetricIds": [
      "soreness",
      "readiness_after",
      "sets_completed"
    ],
    "userMessage": "Come back to baseline first. Progress after the normal work feels normal again.",
    "coachNotes": [
      "Do not stack a new overload immediately after deload."
    ],
    "explanation": "A deload return should restore baseline tolerance before chasing new progression."
  },
  {
    "id": "progression_no_equipment",
    "label": "No-Equipment Progression",
    "ruleType": "progression",
    "appliesToWorkoutTypeIds": [
      "bodyweight_strength"
    ],
    "appliesToGoalIds": [
      "no_equipment",
      "limited_equipment"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "trigger": "Bodyweight sets are completed at target effort with stable technique.",
    "triggerConditions": [
      {
        "metricId": "reps_completed",
        "operator": ">=",
        "value": 10
      },
      {
        "metricId": "movement_quality",
        "operator": ">=",
        "value": 4
      }
    ],
    "action": "Progress leverage, tempo, range, or reps instead of load.",
    "progressionAction": {
      "kind": "change_intensity",
      "target": "bodyweight_leverage_or_tempo"
    },
    "maxProgressionRate": {
      "max": 1,
      "unit": "difficulty_step_per_session"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "wrist_caution",
        "knee_caution"
      ],
      "missingDataBehavior": "repeat"
    },
    "requiredTrackingMetricIds": [
      "reps_completed",
      "movement_quality",
      "actual_rpe"
    ],
    "userMessage": "No equipment needed. Make the same movement slightly harder through control or leverage.",
    "coachNotes": [
      "Use tempo before unstable variations for beginners."
    ],
    "explanation": "No-equipment training progresses through mechanical difficulty and control."
  },
  {
    "id": "progression_low_impact_conditioning",
    "label": "Low-Impact Conditioning Progression",
    "ruleType": "progression",
    "appliesToWorkoutTypeIds": [
      "low_impact_conditioning",
      "zone2_cardio"
    ],
    "appliesToGoalIds": [
      "low_impact_conditioning",
      "zone2_cardio"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "trigger": "Conditioning is completed without joint irritation or impact exposure.",
    "triggerConditions": [
      {
        "metricId": "actual_rpe",
        "operator": "<=",
        "value": 6
      },
      {
        "metricId": "pain_score_after",
        "operator": "<=",
        "value": 2
      }
    ],
    "action": "Add duration or one low-impact interval; do not add running or jumping.",
    "progressionAction": {
      "kind": "add_volume",
      "amount": 5,
      "unit": "minutes",
      "target": "low_impact_duration"
    },
    "maxProgressionRate": {
      "max": 10,
      "unit": "minutes_per_week"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "no_jumping",
        "no_running",
        "knee_caution"
      ],
      "missingDataBehavior": "repeat"
    },
    "requiredTrackingMetricIds": [
      "duration_minutes",
      "actual_rpe",
      "pain_score_after"
    ],
    "userMessage": "Build the engine without adding impact. Add time before intensity.",
    "coachNotes": [
      "Bike, sled, rower, ropes, and incline walk are preferred options."
    ],
    "explanation": "Low-impact progression improves conditioning while preserving joint constraints."
  },
  {
    "id": "progression_core_endurance",
    "label": "Core Endurance Progression",
    "ruleType": "progression",
    "appliesToWorkoutTypeIds": [
      "core_durability",
      "strength"
    ],
    "appliesToGoalIds": [
      "core_durability",
      "boxing_support",
      "beginner_strength"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "trigger": "Core position holds without shaking, breath holding, or back discomfort.",
    "triggerConditions": [
      {
        "metricId": "duration_minutes",
        "operator": ">=",
        "value": 1
      },
      {
        "metricId": "movement_quality",
        "operator": ">=",
        "value": 4
      },
      {
        "metricId": "pain_score_after",
        "operator": "<=",
        "value": 2
      }
    ],
    "action": "Add 5-10 seconds per hold or one controlled rep before adding harder variations.",
    "progressionAction": {
      "kind": "add_volume",
      "amount": 10,
      "unit": "seconds",
      "target": "hold_duration"
    },
    "maxProgressionRate": {
      "max": 20,
      "unit": "seconds_per_week"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "back_caution"
      ],
      "missingDataBehavior": "repeat"
    },
    "requiredTrackingMetricIds": [
      "duration_minutes",
      "movement_quality",
      "pain_score_after"
    ],
    "userMessage": "Hold the position a little longer, but end before your back takes over.",
    "coachNotes": [
      "Breathing quality is a gate for trunk endurance."
    ],
    "explanation": "Core endurance grows through position quality and breathing control."
  },
  {
    "id": "progression_unilateral_stability",
    "label": "Unilateral Stability Progression",
    "ruleType": "progression",
    "appliesToWorkoutTypeIds": [
      "strength",
      "core_durability",
      "mobility"
    ],
    "appliesToGoalIds": [
      "lower_body_strength",
      "core_durability",
      "return_to_training"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "trigger": "Single-side work is symmetrical enough and pain-free on both sides.",
    "triggerConditions": [
      {
        "metricId": "movement_quality",
        "operator": ">=",
        "value": 4
      },
      {
        "metricId": "pain_score_after",
        "operator": "<=",
        "value": 2
      }
    ],
    "action": "Progress range, stance challenge, or load on the limiting side first.",
    "progressionAction": {
      "kind": "change_intensity",
      "target": "unilateral_stability"
    },
    "maxProgressionRate": {
      "max": 1,
      "unit": "stability_step_per_week"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "knee_caution",
        "balance_concern"
      ],
      "missingDataBehavior": "repeat"
    },
    "requiredTrackingMetricIds": [
      "movement_quality",
      "pain_score_after"
    ],
    "userMessage": "Make the single-side work a bit more stable and controlled before chasing load.",
    "coachNotes": [
      "Bias the weaker or less controlled side; avoid fatigue-based instability."
    ],
    "explanation": "Unilateral progress should improve symmetry and control, not just load."
  },
  {
    "id": "progression_tempo_control",
    "label": "Tempo-Control Progression",
    "ruleType": "progression",
    "appliesToWorkoutTypeIds": [
      "strength",
      "hypertrophy",
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
      "intermediate"
    ],
    "trigger": "Athlete completes all reps with the prescribed tempo and no compensations.",
    "triggerConditions": [
      {
        "metricId": "tempo",
        "operator": "present"
      },
      {
        "metricId": "movement_quality",
        "operator": ">=",
        "value": 4
      }
    ],
    "action": "Add a small load or extend the eccentric/isometric phase by one count.",
    "progressionAction": {
      "kind": "change_intensity",
      "target": "tempo_or_load"
    },
    "maxProgressionRate": {
      "max": 1,
      "unit": "tempo_count_or_small_load_jump"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "high_soreness",
        "pain_increased_last_session"
      ],
      "missingDataBehavior": "repeat"
    },
    "requiredTrackingMetricIds": [
      "tempo",
      "movement_quality",
      "actual_rpe"
    ],
    "userMessage": "Keep the tempo honest. Progress control before heavier work.",
    "coachNotes": [
      "Avoid long eccentrics during high soreness or return from illness."
    ],
    "explanation": "Tempo progression builds control and tissue tolerance when recovery can support it."
  },
  {
    "id": "progression_aerobic_frequency",
    "label": "Aerobic Frequency Progression",
    "ruleType": "progression",
    "appliesToWorkoutTypeIds": [
      "zone2_cardio",
      "recovery"
    ],
    "appliesToGoalIds": [
      "zone2_cardio",
      "recovery",
      "low_impact_conditioning"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "trigger": "Two weeks of aerobic work are completed with stable readiness and no symptom increase.",
    "triggerConditions": [
      {
        "metricId": "completion_status",
        "operator": "=",
        "value": "completed",
        "windowDays": 14
      },
      {
        "metricId": "symptom_change",
        "operator": "=",
        "value": "same_or_better"
      }
    ],
    "action": "Add one short easy aerobic exposure before increasing hard conditioning.",
    "progressionAction": {
      "kind": "add_volume",
      "amount": 1,
      "unit": "session_per_week",
      "target": "aerobic_frequency"
    },
    "maxProgressionRate": {
      "max": 1,
      "unit": "session_per_week"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "illness_caution",
        "post_competition_recovery"
      ],
      "missingDataBehavior": "repeat"
    },
    "requiredTrackingMetricIds": [
      "completion_status",
      "symptom_change",
      "duration_minutes"
    ],
    "userMessage": "Add one short easy aerobic day. Keep it easy enough to support recovery.",
    "coachNotes": [
      "Frequency progressions should be easy sessions, not extra intensity."
    ],
    "explanation": "Aerobic capacity often progresses safely by adding easy frequency before intensity."
  }
] satisfies ProgressionRule[];
