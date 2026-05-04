import type { PrescriptionTemplate } from '../../types.ts';

export const powerPrescriptionTemplates = [
  {
    "id": "power_quality",
    "label": "Power Quality",
    "kind": "power",
    "appliesToWorkoutTypeIds": [
      "power",
      "boxing_support"
    ],
    "defaultSets": 4,
    "defaultReps": "3-5",
    "defaultRpe": 6,
    "restSeconds": 120,
    "tempo": "fast intent",
    "intensityCue": "Stop the set when speed or landing quality drops.",
    "restGuidance": "Rest fully between sets; power work is done fresh or not at all.",
    "effortGuidance": "Every rep should look fast, crisp, and technically repeatable.",
    "progressionRuleIds": [
      "progression_power_quality_gate",
      "progression_skill"
    ],
    "regressionRuleIds": [
      "regression_poor_readiness",
      "regression_high_fatigue",
      "regression_no_jumping",
      "regression_poor_sleep"
    ],
    "deloadRuleIds": [
      "deload_performance_drop",
      "deload_accumulated_fatigue",
      "deload_post_competition_recovery"
    ],
    "payload": {
      "kind": "power",
      "sets": {
        "min": 3,
        "max": 5,
        "target": 4
      },
      "reps": {
        "min": 2,
        "max": 5,
        "target": 3
      },
      "explosiveIntent": "Move explosively while staying technically clean.",
      "fullRecoverySeconds": {
        "min": 90,
        "max": 180,
        "target": 120
      },
      "technicalQuality": "Stop if speed, landing, posture, or coordination drops.",
      "lowFatigue": true,
      "movementSpeed": "fast and crisp; no grinding",
      "eligibilityRestrictions": [
        "No red readiness state",
        "No acute pain",
        "No high fatigue trend"
      ]
    }
  }
] satisfies PrescriptionTemplate[];
