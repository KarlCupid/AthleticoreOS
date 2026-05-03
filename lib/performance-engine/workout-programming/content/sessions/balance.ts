import type { SessionTemplate } from '../../types.ts';

export const balanceSessionTemplates = [
  {
    "id": "core_durability",
    "label": "Core Durability",
    "summary": "Anti-extension, anti-rotation, carry, and balance work.",
    "workoutTypeId": "core_durability",
    "goalIds": [
      "core_durability",
      "boxing_support"
    ],
    "formatId": "density_block",
    "minDurationMinutes": 20,
    "defaultDurationMinutes": 30,
    "maxDurationMinutes": 45,
    "experienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "blocks": [
      {
        "id": "warmup",
        "kind": "warmup",
        "title": "Breathing and Control",
        "durationMinutes": 5,
        "prescriptionTemplateId": "breathing_reset"
      },
      {
        "id": "main",
        "kind": "main",
        "title": "Trunk Durability",
        "durationMinutes": 20,
        "prescriptionTemplateId": "core_control"
      },
      {
        "id": "cooldown",
        "kind": "cooldown",
        "title": "Reset",
        "durationMinutes": 5,
        "prescriptionTemplateId": "mobility_hold"
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
        "id": "main_anti_extension",
        "blockId": "main",
        "movementPatternIds": [
          "anti_extension"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "main_anti_rotation",
        "blockId": "main",
        "movementPatternIds": [
          "anti_rotation"
        ],
        "order": 2,
        "optional": false
      },
      {
        "id": "main_carry",
        "blockId": "main",
        "movementPatternIds": [
          "carry"
        ],
        "order": 3,
        "optional": true
      },
      {
        "id": "main_balance",
        "blockId": "main",
        "movementPatternIds": [
          "balance"
        ],
        "order": 4,
        "optional": true
      },
      {
        "id": "cooldown_mobility",
        "blockId": "cooldown",
        "movementPatternIds": [
          "thoracic_mobility"
        ],
        "order": 1,
        "optional": false
      }
    ],
    "successCriteria": [
      "Trunk position stays controlled.",
      "No low-back pain is provoked.",
      "Duration or reps are logged."
    ]
  }
] satisfies SessionTemplate[];
