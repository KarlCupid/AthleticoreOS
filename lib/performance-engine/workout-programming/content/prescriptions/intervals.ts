import type { PrescriptionTemplate } from '../../types.ts';

export const intervalPrescriptionTemplates = [
  {
    "id": "conditioning_interval",
    "label": "Conditioning Intervals",
    "kind": "conditioning",
    "appliesToWorkoutTypeIds": [
      "conditioning",
      "low_impact_conditioning"
    ],
    "defaultSets": 6,
    "defaultDurationSeconds": 40,
    "defaultRpe": 6,
    "restSeconds": 40,
    "intensityCue": "Repeatable hard work, never all-out in the MVP generator.",
    "restGuidance": "Recover enough that each round stays repeatable.",
    "effortGuidance": "Hard but controlled; leave one more quality round in reserve.",
    "progressionRuleIds": [
      "progression_hiit_interval",
      "progression_circuit_density"
    ],
    "payload": {
      "kind": "conditioning",
      "workIntervalSeconds": {
        "min": 20,
        "max": 45,
        "target": 40
      },
      "restIntervalSeconds": {
        "min": 30,
        "max": 60,
        "target": 40
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
        "talkTest": "Short phrases during work, full sentences during recovery."
      },
      "impactLevel": "low",
      "fatigueRisk": "moderate",
      "densityTarget": "Complete repeatable rounds without form loss.",
      "scalingOptions": {
        "down": "Reduce rounds by two or shorten work to 20-30 seconds.",
        "up": "Add one round only when all rounds stay repeatable."
      }
    }
  },
  {
    "id": "hiit_interval",
    "label": "HIIT Intervals",
    "kind": "interval",
    "appliesToWorkoutTypeIds": [
      "conditioning",
      "boxing_support"
    ],
    "defaultSets": 6,
    "defaultDurationSeconds": 30,
    "defaultRpe": 8,
    "restSeconds": 60,
    "intensityCue": "Hard intervals must stay technically repeatable; stop before all-out failure.",
    "restGuidance": "Rest 40-90 seconds, or longer if quality drops.",
    "effortGuidance": "Target a hard effort that can be repeated across all rounds.",
    "progressionRuleIds": [
      "progression_hiit_interval"
    ],
    "payload": {
      "kind": "interval",
      "workIntervalSeconds": {
        "min": 20,
        "max": 40,
        "target": 30
      },
      "restIntervalSeconds": {
        "min": 40,
        "max": 90,
        "target": 60
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
        "talkTest": "Broken phrases only during work; breathing should recover before the next round."
      },
      "impactLevel": "moderate",
      "fatigueRisk": "high",
      "scalingOptions": {
        "down": "Reduce to four rounds or change to low-impact conditioning.",
        "up": "Add one round only when every interval remains technically sharp."
      }
    }
  }
] satisfies PrescriptionTemplate[];
