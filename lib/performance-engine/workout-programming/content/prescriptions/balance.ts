import type { PrescriptionTemplate } from '../../types.ts';

export const balancePrescriptionTemplates = [
  {
    "id": "core_control",
    "label": "Core Control",
    "kind": "balance",
    "appliesToWorkoutTypeIds": [
      "core_durability",
      "strength",
      "recovery"
    ],
    "defaultSets": 2,
    "defaultReps": "6-10 controlled reps or 20-30 sec",
    "defaultRpe": 4,
    "restSeconds": 45,
    "tempo": "slow",
    "intensityCue": "Own trunk position and stop before compensation.",
    "effortGuidance": "Quality beats duration; stop before the low back or shoulders take over.",
    "progressionRuleIds": [
      "progression_core_endurance",
      "progression_balance_complexity"
    ],
    "regressionRuleIds": [
      "regression_balance_fall_risk",
      "regression_pain_increase",
      "regression_low_back_caution",
      "regression_poor_readiness"
    ],
    "deloadRuleIds": [
      "deload_week_four_reduction",
      "deload_pain_trend",
      "deload_low_adherence"
    ],
    "payload": {
      "kind": "balance",
      "baseOfSupport": "bilateral",
      "surface": "floor",
      "visualInput": "eyes_open",
      "mode": "static",
      "durationSeconds": {
        "min": 20,
        "max": 40,
        "target": 30
      },
      "complexityProgression": [
        "increase hold quality",
        "narrow base of support",
        "add limb movement",
        "add light load"
      ],
      "fallRiskRules": [
        "Use external support when balance is uncertain.",
        "Do not progress if dizziness or instability appears."
      ]
    }
  }
] satisfies PrescriptionTemplate[];
