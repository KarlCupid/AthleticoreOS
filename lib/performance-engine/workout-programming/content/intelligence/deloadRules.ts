import type { DeloadRule } from '../../types.ts';

export const deloadRules = [
  {
    "id": "deload_accumulated_fatigue",
    "label": "Accumulated Fatigue Deload",
    "ruleType": "deload",
    "appliesToWorkoutTypeIds": [
      "strength",
      "hypertrophy",
      "conditioning"
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
    "trigger": "Fatigue remains high across multiple sessions despite normal regressions.",
    "triggerConditions": [
      {
        "metricId": "actual_rpe",
        "operator": ">=",
        "value": 8,
        "windowDays": 10
      }
    ],
    "deloadTrigger": [
      {
        "metricId": "completion_tolerance",
        "operator": "=",
        "value": "poor"
      }
    ],
    "action": "Reduce hard volume 30-50 percent for one week and keep easy movement.",
    "regressionAction": {
      "kind": "deload",
      "amount": 40,
      "unit": "percent",
      "target": "hard_volume"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "poor_readiness",
        "high_soreness"
      ],
      "missingDataBehavior": "regress"
    },
    "requiredTrackingMetricIds": [
      "actual_rpe",
      "completion_tolerance",
      "soreness"
    ],
    "userMessage": "Fatigue is carrying over. This week backs off so training can work again.",
    "coachNotes": [
      "Preserve protected anchors; deload support work around them."
    ],
    "explanation": "Accumulated fatigue requires a temporary reduction in training cost."
  },
  {
    "id": "deload_performance_drop",
    "label": "Performance Drop Deload",
    "ruleType": "deload",
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
      "intermediate",
      "advanced"
    ],
    "trigger": "Performance drops 10 percent or more for two exposures without a planned reason.",
    "triggerConditions": [
      {
        "metricId": "load_used",
        "operator": "<=",
        "value": 0.9,
        "windowDays": 14
      }
    ],
    "deloadTrigger": [
      {
        "metricId": "movement_quality",
        "operator": "<=",
        "value": 3
      }
    ],
    "action": "Reduce intensity and volume for 5-7 days, then return to baseline gradually.",
    "regressionAction": {
      "kind": "deload",
      "amount": 35,
      "unit": "percent",
      "target": "load_and_volume"
    },
    "safetyOverride": {
      "missingDataBehavior": "repeat"
    },
    "requiredTrackingMetricIds": [
      "load_used",
      "reps_completed",
      "movement_quality"
    ],
    "userMessage": "Performance is sliding. Take a planned back-off instead of forcing it.",
    "coachNotes": [
      "Investigate sleep, fueling, and protected workout load."
    ],
    "explanation": "A real performance drop often means fatigue is outpacing adaptation."
  },
  {
    "id": "deload_pain_trend",
    "label": "Pain Trend Deload",
    "ruleType": "deload",
    "appliesToWorkoutTypeIds": [
      "strength",
      "hypertrophy",
      "conditioning",
      "mobility"
    ],
    "appliesToGoalIds": [
      "beginner_strength",
      "hypertrophy",
      "return_to_training",
      "mobility"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "trigger": "Pain trends upward across recent sessions.",
    "triggerConditions": [
      {
        "metricId": "pain_score_after",
        "operator": ">",
        "value": 3,
        "windowDays": 10
      }
    ],
    "deloadTrigger": [
      {
        "metricId": "symptom_change",
        "operator": "=",
        "value": "worse"
      }
    ],
    "action": "Switch to recovery/mobility bias and safe substitutions until pain stabilizes.",
    "regressionAction": {
      "kind": "deload",
      "target": "pain_safe_recovery_week"
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
    "userMessage": "Pain is trending the wrong way. Training shifts to calming it down.",
    "coachNotes": [
      "Escalate to review if pain is sharp, neurological, or worsening at rest."
    ],
    "explanation": "A worsening pain trend overrides performance progression."
  },
  {
    "id": "deload_high_session_rpe_trend",
    "label": "High Session RPE Trend Deload",
    "ruleType": "deload",
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
    "trigger": "Session RPE averages 8.5 or higher across the week.",
    "triggerConditions": [
      {
        "metricId": "session_rpe",
        "operator": ">=",
        "value": 8.5,
        "windowDays": 7
      }
    ],
    "deloadTrigger": [
      {
        "metricId": "actual_rpe",
        "operator": ">=",
        "value": 9
      }
    ],
    "action": "Reduce target RPE and remove optional density or finishers for one week.",
    "regressionAction": {
      "kind": "deload",
      "amount": 1,
      "unit": "rpe_point",
      "target": "target_rpe"
    },
    "safetyOverride": {
      "missingDataBehavior": "repeat"
    },
    "requiredTrackingMetricIds": [
      "session_rpe",
      "actual_rpe"
    ],
    "userMessage": "Too many sessions are landing too hard. Bring the week down a notch.",
    "coachNotes": [
      "A deload can be intensity-only if volume tolerance is otherwise good."
    ],
    "explanation": "High perceived effort across sessions signals rising recovery debt."
  },
  {
    "id": "deload_low_adherence",
    "label": "Low Adherence Deload",
    "ruleType": "deload",
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
      "recovery"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "trigger": "Adherence falls below 70 percent over the recent block.",
    "triggerConditions": [
      {
        "metricId": "completion_status",
        "operator": "=",
        "value": "not_completed",
        "windowDays": 14
      }
    ],
    "deloadTrigger": [
      {
        "metricId": "completion_tolerance",
        "operator": "=",
        "value": "poor"
      }
    ],
    "action": "Reduce session duration and number of exercises before rebuilding frequency.",
    "regressionAction": {
      "kind": "deload",
      "amount": 30,
      "unit": "percent",
      "target": "session_duration"
    },
    "safetyOverride": {
      "missingDataBehavior": "repeat"
    },
    "requiredTrackingMetricIds": [
      "completion_status",
      "duration_minutes"
    ],
    "userMessage": "The plan is too much friction right now. Make it smaller and repeatable.",
    "coachNotes": [
      "Adherence deloads are about fit, not punishment."
    ],
    "explanation": "Low adherence means the program dose or logistics need to be simplified."
  },
  {
    "id": "deload_post_competition_recovery",
    "label": "Post-Competition Recovery Deload",
    "ruleType": "deload",
    "appliesToWorkoutTypeIds": [
      "strength",
      "conditioning",
      "boxing_support"
    ],
    "appliesToGoalIds": [
      "boxing_support",
      "recovery",
      "return_to_training"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "trigger": "Athlete is in post-competition recovery window.",
    "triggerConditions": [
      {
        "metricId": "safety_flag",
        "operator": "includes",
        "value": "post_competition_recovery"
      }
    ],
    "deloadTrigger": [
      {
        "metricId": "readiness_after",
        "operator": "present"
      }
    ],
    "action": "Use recovery and mobility work; avoid hard conditioning and heavy support lifts.",
    "regressionAction": {
      "kind": "deload",
      "target": "post_competition_recovery"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "post_competition_recovery"
      ],
      "missingDataBehavior": "regress"
    },
    "requiredTrackingMetricIds": [
      "readiness_after",
      "pain_score_after",
      "symptom_change"
    ],
    "userMessage": "After competition, recovery is the training goal.",
    "coachNotes": [
      "Do not restart build-phase load until readiness and symptoms normalize."
    ],
    "explanation": "Post-competition deload protects the transition back into training."
  },
  {
    "id": "deload_illness_caution",
    "label": "Illness Caution Deload",
    "ruleType": "deload",
    "appliesToWorkoutTypeIds": [
      "strength",
      "conditioning",
      "hypertrophy"
    ],
    "appliesToGoalIds": [
      "recovery",
      "return_to_training",
      "zone2_cardio"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "trigger": "Illness caution is active or symptoms are not fully resolved.",
    "triggerConditions": [
      {
        "metricId": "safety_flag",
        "operator": "includes",
        "value": "illness_caution"
      }
    ],
    "deloadTrigger": [
      {
        "metricId": "symptom_change",
        "operator": "present"
      }
    ],
    "action": "Use recovery sessions and easy aerobic work only while symptoms settle.",
    "regressionAction": {
      "kind": "deload",
      "target": "illness_return"
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
    "userMessage": "Illness changes the target: easy movement and symptom monitoring.",
    "coachNotes": [
      "Block hard training if fever, chest symptoms, fainting, or severe dizziness appear."
    ],
    "explanation": "Illness caution requires reducing physiological stress."
  },
  {
    "id": "deload_return_to_training",
    "label": "Return-to-Training Deload",
    "ruleType": "deload",
    "appliesToWorkoutTypeIds": [
      "strength",
      "hypertrophy",
      "conditioning"
    ],
    "appliesToGoalIds": [
      "return_to_training",
      "recovery",
      "beginner_strength"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "trigger": "Athlete returns after layoff, pain, illness, or inconsistent training.",
    "triggerConditions": [
      {
        "metricId": "completion_status",
        "operator": "missing",
        "value": null,
        "windowDays": 14
      }
    ],
    "deloadTrigger": [
      {
        "metricId": "new_athlete",
        "operator": "present"
      }
    ],
    "action": "Start at 50-70 percent of prior volume and cap RPE at 5-6.",
    "regressionAction": {
      "kind": "deload",
      "amount": 60,
      "unit": "percent_of_baseline",
      "target": "volume"
    },
    "safetyOverride": {
      "restrictionFlagIds": [
        "new_athlete",
        "unknown_readiness"
      ],
      "missingDataBehavior": "regress"
    },
    "requiredTrackingMetricIds": [
      "actual_rpe",
      "completion_status",
      "pain_score_after"
    ],
    "userMessage": "Rebuild from a level you can repeat, then earn the next step.",
    "coachNotes": [
      "Treat missing recent history as unknown, not safe."
    ],
    "explanation": "Return-to-training phases should transition back gradually instead of restarting at old load."
  },
  {
    "id": "deload_high_soreness",
    "label": "High Soreness Deload",
    "ruleType": "deload",
    "appliesToWorkoutTypeIds": [
      "strength",
      "hypertrophy"
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
    "trigger": "Soreness remains high for more than one session or changes mechanics.",
    "triggerConditions": [
      {
        "metricId": "soreness",
        "operator": ">=",
        "value": 4,
        "windowDays": 7
      }
    ],
    "deloadTrigger": [
      {
        "metricId": "movement_quality",
        "operator": "<=",
        "value": 3
      }
    ],
    "action": "Cut volume and eccentric loading until movement quality returns.",
    "regressionAction": {
      "kind": "deload",
      "amount": 40,
      "unit": "percent",
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
    "userMessage": "Soreness is stealing quality. Back off volume and move cleanly.",
    "coachNotes": [
      "Avoid new exercise novelty during this deload."
    ],
    "explanation": "Persistent soreness can indicate excessive novelty or volume."
  },
  {
    "id": "deload_week_four_reduction",
    "label": "Planned Week-Four Reduction",
    "ruleType": "deload",
    "appliesToWorkoutTypeIds": [
      "strength",
      "hypertrophy",
      "conditioning",
      "core_durability"
    ],
    "appliesToGoalIds": [
      "beginner_strength",
      "hypertrophy",
      "limited_equipment",
      "boxing_support"
    ],
    "appliesToExperienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "trigger": "Fourth week of a four-week accumulation wave.",
    "triggerConditions": [
      {
        "metricId": "week_index",
        "operator": "=",
        "value": 4
      }
    ],
    "deloadTrigger": [
      {
        "metricId": "completion_status",
        "operator": "present"
      }
    ],
    "action": "Reduce volume 20-30 percent while preserving movement patterns and protected anchors.",
    "regressionAction": {
      "kind": "deload",
      "amount": 25,
      "unit": "percent",
      "target": "planned_weekly_volume"
    },
    "safetyOverride": {
      "missingDataBehavior": "repeat"
    },
    "requiredTrackingMetricIds": [
      "completion_status",
      "actual_rpe"
    ],
    "userMessage": "This is a planned easier week so the next block starts fresher.",
    "coachNotes": [
      "Keep skill exposure and protected workouts; trim supporting volume."
    ],
    "explanation": "Planned reductions prevent accumulation from becoming a forced deload."
  }
] satisfies DeloadRule[];
