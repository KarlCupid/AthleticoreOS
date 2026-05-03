import type { PrescriptionTemplate } from '../../types.ts';

export const hypertrophyPrescriptionTemplates = [
  {
    "id": "hypertrophy_straight",
    "label": "Hypertrophy Straight Sets",
    "kind": "resistance",
    "appliesToWorkoutTypeIds": [
      "hypertrophy"
    ],
    "defaultSets": 3,
    "defaultReps": "8-12",
    "defaultRpe": 7,
    "restSeconds": 75,
    "tempo": "2-0-2",
    "intensityCue": "Accumulate clean reps with 2-3 reps in reserve.",
    "restGuidance": "Rest 60-90 seconds, long enough to keep the target muscle doing the work.",
    "tempoGuidance": "Use a controlled lowering phase and avoid bouncing through the bottom.",
    "effortGuidance": "Work close enough to failure to stimulate, not so close that joints or form break down.",
    "progressionRuleIds": [
      "progression_double_8_12",
      "progression_hypertrophy_volume"
    ],
    "payload": {
      "kind": "resistance",
      "sets": {
        "min": 2,
        "max": 4,
        "target": 3,
        "unit": "sets_per_exercise"
      },
      "reps": "8-12",
      "repRange": {
        "min": 8,
        "max": 12
      },
      "loadGuidance": "Select a load that reaches the target muscle with 1-3 reps in reserve.",
      "intensityModel": "rir",
      "RPE": {
        "min": 7,
        "max": 9,
        "target": 8
      },
      "RIR": {
        "min": 1,
        "max": 3,
        "target": 2
      },
      "restSecondsRange": {
        "min": 60,
        "max": 90,
        "target": 75
      },
      "tempo": "2-0-2",
      "effortGuidance": "Use double progression: add reps inside the range before adding load.",
      "mainLiftVsAccessory": "hypertrophy_accessory",
      "weeklyVolumeTarget": {
        "min": 8,
        "max": 14,
        "unit": "sets_per_muscle_group"
      },
      "progressionRuleIds": [
        "progression_double_8_12",
        "progression_hypertrophy_volume"
      ]
    }
  },
  {
    "id": "accessory_volume",
    "label": "Accessory Volume",
    "kind": "resistance",
    "appliesToWorkoutTypeIds": [
      "hypertrophy",
      "upper_strength"
    ],
    "defaultSets": 2,
    "defaultReps": "12-15",
    "defaultRpe": 7,
    "restSeconds": 45,
    "tempo": "smooth",
    "intensityCue": "Small-muscle work should burn, not irritate joints.",
    "restGuidance": "Rest 30-60 seconds and keep the target tissue, not momentum, as the limiter.",
    "effortGuidance": "Stay 1-3 reps shy of failure with clean joint position.",
    "progressionRuleIds": [
      "progression_double_8_12",
      "progression_hypertrophy_volume"
    ],
    "payload": {
      "kind": "resistance",
      "sets": {
        "min": 2,
        "max": 3,
        "target": 2,
        "unit": "sets_per_exercise"
      },
      "reps": "12-15",
      "repRange": {
        "min": 12,
        "max": 15
      },
      "loadGuidance": "Light to moderate load, high control, no joint irritation.",
      "intensityModel": "rir",
      "RPE": {
        "min": 6,
        "max": 8,
        "target": 7
      },
      "RIR": {
        "min": 1,
        "max": 3,
        "target": 2
      },
      "restSecondsRange": {
        "min": 30,
        "max": 60,
        "target": 45
      },
      "tempo": "smooth controlled reps",
      "effortGuidance": "Use proximity to failure cautiously; burning is acceptable, pain is not.",
      "mainLiftVsAccessory": "accessory",
      "weeklyVolumeTarget": {
        "min": 4,
        "max": 10,
        "unit": "sets_per_accessory_pattern"
      },
      "progressionRuleIds": [
        "progression_double_8_12"
      ]
    }
  }
] satisfies PrescriptionTemplate[];
