import type { SessionTemplate } from '../../types.ts';

export const cardioSessionTemplates = [
  {
    "id": "zone2_cardio",
    "label": "Zone 2 Cardio",
    "summary": "Steady aerobic work with a short prep and cooldown.",
    "workoutTypeId": "zone2_cardio",
    "goalIds": [
      "zone2_cardio",
      "low_impact_conditioning"
    ],
    "formatId": "steady_state",
    "minDurationMinutes": 20,
    "defaultDurationMinutes": 35,
    "maxDurationMinutes": 60,
    "experienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "blocks": [
      {
        "id": "warmup",
        "kind": "warmup",
        "title": "Easy Ramp",
        "durationMinutes": 5,
        "prescriptionTemplateId": "recovery_easy"
      },
      {
        "id": "main",
        "kind": "main",
        "title": "Zone 2 Steady Work",
        "durationMinutes": 25,
        "prescriptionTemplateId": "zone2_steady"
      },
      {
        "id": "cooldown",
        "kind": "cooldown",
        "title": "Easy Cooldown",
        "durationMinutes": 5,
        "prescriptionTemplateId": "recovery_easy"
      }
    ],
    "movementSlots": [
      {
        "id": "warmup_locomotion",
        "blockId": "warmup",
        "movementPatternIds": [
          "locomotion"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "main_locomotion",
        "blockId": "main",
        "movementPatternIds": [
          "locomotion"
        ],
        "order": 1,
        "optional": false
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
      "Breathing remains conversational.",
      "Duration and RPE are logged.",
      "The athlete finishes without symptom escalation."
    ]
  }
] satisfies SessionTemplate[];
