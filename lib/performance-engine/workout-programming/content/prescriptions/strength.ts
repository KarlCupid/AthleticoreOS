import type { PrescriptionTemplate } from '../../types.ts';

export const strengthPrescriptionTemplates = [
  {
    "id": "strength_beginner",
    "label": "Beginner Strength Sets",
    "kind": "resistance",
    "appliesToWorkoutTypeIds": [
      "strength",
      "bodyweight_strength",
      "full_body_strength"
    ],
    "defaultSets": 3,
    "defaultReps": "6-10",
    "defaultRpe": 6,
    "restSeconds": 90,
    "tempo": "controlled",
    "intensityCue": "Leave 3-4 reps in reserve and stop on pain or form loss.",
    "restGuidance": "Rest 60-120 seconds so the next set looks like the first.",
    "effortGuidance": "Finish each set with clear reserve and no grinding.",
    "progressionRuleIds": [
      "progression_beginner_linear_load",
      "progression_autoregulated_rpe_rir"
    ],
    "payload": {
      "kind": "resistance",
      "sets": {
        "min": 2,
        "max": 4,
        "target": 3
      },
      "reps": "6-10",
      "repRange": {
        "min": 6,
        "max": 10
      },
      "loadGuidance": "Use a load or variation that allows crisp reps with 3-4 reps in reserve.",
      "intensityModel": "rpe",
      "RPE": {
        "min": 5,
        "max": 7,
        "target": 6
      },
      "RIR": {
        "min": 3,
        "max": 4
      },
      "restSecondsRange": {
        "min": 60,
        "max": 120,
        "target": 90
      },
      "tempo": "controlled",
      "effortGuidance": "Stop the set before form changes or pain appears.",
      "mainLiftVsAccessory": "main_lift",
      "weeklyVolumeTarget": {
        "min": 6,
        "max": 10,
        "unit": "sets_per_pattern"
      },
      "progressionRuleIds": [
        "progression_beginner_linear_load",
        "progression_autoregulated_rpe_rir"
      ]
    }
  },
  {
    "id": "strength_heavy",
    "label": "Heavy Strength Sets",
    "kind": "resistance",
    "appliesToWorkoutTypeIds": [
      "strength",
      "lower_strength",
      "upper_strength",
      "full_body_strength"
    ],
    "defaultSets": 4,
    "defaultReps": "3-6",
    "defaultRpe": 7,
    "restSeconds": 150,
    "tempo": "controlled",
    "intensityCue": "Crisp forceful reps; no grinding for MVP prescriptions.",
    "restGuidance": "Rest 120-180 seconds and repeat only while bar speed and setup stay sharp.",
    "effortGuidance": "Heavy does not mean maximal; keep 2-3 reps in reserve.",
    "progressionRuleIds": [
      "progression_double_6_10",
      "progression_power_quality_gate"
    ],
    "payload": {
      "kind": "resistance",
      "sets": {
        "min": 3,
        "max": 5,
        "target": 4
      },
      "reps": "3-6",
      "repRange": {
        "min": 3,
        "max": 6
      },
      "loadGuidance": "Use a challenging submaximal load that never turns into a grind.",
      "intensityModel": "percent_1rm",
      "RPE": {
        "min": 6,
        "max": 8,
        "target": 7
      },
      "RIR": {
        "min": 2,
        "max": 3
      },
      "percent1RM": {
        "min": 70,
        "max": 85
      },
      "restSecondsRange": {
        "min": 120,
        "max": 180,
        "target": 150
      },
      "tempo": "controlled eccentric, forceful concentric",
      "effortGuidance": "End the set if speed drops sharply or bracing changes.",
      "mainLiftVsAccessory": "main_lift",
      "weeklyVolumeTarget": {
        "min": 4,
        "max": 8,
        "unit": "hard_sets_per_lift"
      },
      "progressionRuleIds": [
        "progression_double_6_10",
        "progression_autoregulated_rpe_rir"
      ]
    }
  },
  {
    "id": "carry_control",
    "label": "Carry Control",
    "kind": "resistance",
    "appliesToWorkoutTypeIds": [
      "strength",
      "core_durability"
    ],
    "defaultSets": 3,
    "defaultDurationSeconds": 30,
    "defaultRpe": 6,
    "restSeconds": 60,
    "intensityCue": "Stay tall and stop when posture changes.",
    "restGuidance": "Rest 45-90 seconds so posture can reset before the next carry.",
    "effortGuidance": "End the set before grip or trunk position collapses.",
    "progressionRuleIds": [
      "progression_core_endurance",
      "progression_unilateral_stability"
    ],
    "payload": {
      "kind": "resistance",
      "sets": {
        "min": 2,
        "max": 4,
        "target": 3
      },
      "repRange": {
        "target": "20-45 seconds per carry"
      },
      "loadGuidance": "Use a load that challenges posture without forcing a lean.",
      "intensityModel": "rpe",
      "RPE": {
        "min": 5,
        "max": 7,
        "target": 6
      },
      "restSecondsRange": {
        "min": 45,
        "max": 90,
        "target": 60
      },
      "tempo": "controlled walk",
      "effortGuidance": "Posture quality is the limiter.",
      "mainLiftVsAccessory": "core_accessory",
      "progressionRuleIds": [
        "progression_core_endurance",
        "progression_unilateral_stability"
      ]
    }
  }
] satisfies PrescriptionTemplate[];
