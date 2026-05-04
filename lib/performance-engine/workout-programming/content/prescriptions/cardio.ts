import type { PrescriptionTemplate } from '../../types.ts';

export const cardioPrescriptionTemplates = [
  {
    "id": "zone2_steady",
    "label": "Zone 2 Steady Work",
    "kind": "cardio",
    "appliesToWorkoutTypeIds": [
      "zone2_cardio"
    ],
    "defaultDurationMinutes": 24,
    "defaultRpe": 4,
    "restSeconds": 0,
    "intensityCue": "Conversational effort; reduce pace if breathing gets sharp.",
    "effortGuidance": "Keep intensity below the point where breathing turns sharp.",
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
      "deload_return_to_training",
      "deload_low_adherence"
    ],
    "payload": {
      "kind": "cardio",
      "durationMinutes": {
        "min": 20,
        "max": 45,
        "target": 24
      },
      "modality": "mixed_low_impact",
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
      "talkTest": "Can speak in full sentences without gasping.",
      "pace": {
        "target": "conversational"
      },
      "progression": "duration_then_frequency",
      "progressionRuleIds": [
        "progression_zone2_duration",
        "progression_aerobic_frequency"
      ]
    }
  }
] satisfies PrescriptionTemplate[];
