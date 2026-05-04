import type { PrescriptionTemplate } from '../../types.ts';

export const mobilityPrescriptionTemplates = [
  {
    "id": "mobility_hold",
    "label": "Mobility Control",
    "kind": "mobility",
    "appliesToWorkoutTypeIds": [
      "mobility",
      "recovery"
    ],
    "defaultSets": 2,
    "defaultReps": "5 slow reps/side",
    "defaultRpe": 2,
    "restSeconds": 20,
    "tempo": "slow",
    "intensityCue": "Explore range without forcing symptoms.",
    "effortGuidance": "Own the range you have today; do not chase stretch intensity.",
    "progressionRuleIds": [
      "progression_mobility_range_of_motion",
      "progression_tempo_control",
      "progression_balance_complexity"
    ],
    "regressionRuleIds": [
      "regression_pain_increase",
      "regression_limited_time",
      "regression_balance_fall_risk"
    ],
    "deloadRuleIds": [
      "deload_pain_trend",
      "deload_low_adherence"
    ],
    "payload": {
      "kind": "mobility",
      "targetJoints": [
        "hips",
        "thoracic_spine",
        "ankles",
        "shoulders"
      ],
      "rangeOfMotionIntent": "Expand usable range with control, not passive forcing.",
      "reps": {
        "target": "4-8 controlled reps per side"
      },
      "holdTimeSeconds": {
        "min": 10,
        "max": 30
      },
      "breathing": "Slow exhales at end range.",
      "painFreeRange": true,
      "endRangeControl": "Pause where control is weakest and leave if symptoms increase."
    }
  },
  {
    "id": "shoulder_prehab",
    "label": "Shoulder Prehab",
    "kind": "mobility",
    "appliesToWorkoutTypeIds": [
      "mobility",
      "recovery",
      "boxing_support"
    ],
    "defaultSets": 2,
    "defaultReps": "12-15",
    "defaultRpe": 3,
    "restSeconds": 30,
    "tempo": "controlled",
    "intensityCue": "Light activation only; avoid pinching or sharp pain.",
    "effortGuidance": "Treat this as control and tissue prep, not fatigue work.",
    "progressionRuleIds": [
      "progression_mobility_range_of_motion",
      "progression_tempo_control"
    ],
    "regressionRuleIds": [
      "regression_shoulder_caution",
      "regression_pain_increase",
      "regression_limited_time"
    ],
    "deloadRuleIds": [
      "deload_pain_trend",
      "deload_low_adherence"
    ],
    "payload": {
      "kind": "mobility",
      "targetJoints": [
        "shoulders",
        "scapulae"
      ],
      "rangeOfMotionIntent": "Improve scapular and cuff control in a pain-free range.",
      "reps": {
        "min": 10,
        "max": 15
      },
      "holdTimeSeconds": {
        "min": 1,
        "max": 3
      },
      "breathing": "Exhale as the shoulder blade settles; avoid breath-holding.",
      "painFreeRange": true,
      "endRangeControl": "Stop before pinching or rib flare."
    }
  }
] satisfies PrescriptionTemplate[];
