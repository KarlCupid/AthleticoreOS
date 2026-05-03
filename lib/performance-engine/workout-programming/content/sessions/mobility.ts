import type { SessionTemplate } from '../../types.ts';

export const mobilitySessionTemplates = [
  {
    "id": "mobility_flow",
    "label": "Mobility Flow",
    "summary": "Hip, thoracic, ankle, and shoulder mobility with breathing.",
    "workoutTypeId": "mobility",
    "goalIds": [
      "mobility",
      "return_to_training"
    ],
    "formatId": "mobility_flow",
    "minDurationMinutes": 15,
    "defaultDurationMinutes": 25,
    "maxDurationMinutes": 40,
    "experienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "blocks": [
      {
        "id": "warmup",
        "kind": "warmup",
        "title": "Breathing Entry",
        "durationMinutes": 3,
        "prescriptionTemplateId": "breathing_reset"
      },
      {
        "id": "main",
        "kind": "main",
        "title": "Mobility Flow",
        "durationMinutes": 18,
        "prescriptionTemplateId": "mobility_hold"
      },
      {
        "id": "cooldown",
        "kind": "cooldown",
        "title": "Downshift",
        "durationMinutes": 4,
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
        "id": "main_hip",
        "blockId": "main",
        "movementPatternIds": [
          "hip_mobility"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "main_tspine",
        "blockId": "main",
        "movementPatternIds": [
          "thoracic_mobility"
        ],
        "order": 2,
        "optional": false
      },
      {
        "id": "main_ankle",
        "blockId": "main",
        "movementPatternIds": [
          "ankle_mobility"
        ],
        "order": 3,
        "optional": false
      },
      {
        "id": "main_shoulder",
        "blockId": "main",
        "movementPatternIds": [
          "shoulder_prehab"
        ],
        "order": 4,
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
      "Range improves or stays comfortable.",
      "Pain does not increase.",
      "Breathing quality is logged."
    ]
  }
] satisfies SessionTemplate[];
