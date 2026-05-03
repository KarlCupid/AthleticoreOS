import type { SessionTemplate } from '../../types.ts';

export const recoverySessionTemplates = [
  {
    "id": "recovery_reset",
    "label": "Recovery Reset",
    "summary": "Low-stress movement, breathwork, and symptom tracking.",
    "workoutTypeId": "recovery",
    "goalIds": [
      "recovery",
      "return_to_training"
    ],
    "formatId": "recovery_flow",
    "minDurationMinutes": 10,
    "defaultDurationMinutes": 20,
    "maxDurationMinutes": 35,
    "experienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "blocks": [
      {
        "id": "warmup",
        "kind": "warmup",
        "title": "Check-In",
        "durationMinutes": 3,
        "prescriptionTemplateId": "breathing_reset"
      },
      {
        "id": "main",
        "kind": "main",
        "title": "Easy Recovery Work",
        "durationMinutes": 12,
        "prescriptionTemplateId": "recovery_easy"
      },
      {
        "id": "cooldown",
        "kind": "cooldown",
        "title": "Breathing Downshift",
        "durationMinutes": 5,
        "prescriptionTemplateId": "breathing_reset"
      }
    ],
    "movementSlots": [
      {
        "id": "warmup_breathing",
        "blockId": "warmup",
        "movementPatternIds": [
          "breathing"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "main_easy",
        "blockId": "main",
        "movementPatternIds": [
          "locomotion",
          "hip_mobility",
          "thoracic_mobility"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "main_control",
        "blockId": "main",
        "movementPatternIds": [
          "anti_extension",
          "balance"
        ],
        "order": 2,
        "optional": true
      },
      {
        "id": "cooldown_breathing",
        "blockId": "cooldown",
        "movementPatternIds": [
          "breathing"
        ],
        "order": 1,
        "optional": false
      }
    ],
    "successCriteria": [
      "Session stays easy.",
      "Symptoms are checked before and after.",
      "The athlete stops if symptoms worsen."
    ]
  }
] satisfies SessionTemplate[];
