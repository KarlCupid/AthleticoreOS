import type { SessionTemplate } from '../../types.ts';

export const powerSessionTemplates = [
  {
    "id": "boxing_support",
    "label": "Boxing Support",
    "summary": "Shoulder, trunk, and low-impact power support for boxers.",
    "workoutTypeId": "boxing_support",
    "goalIds": [
      "boxing_support"
    ],
    "formatId": "skill_practice",
    "minDurationMinutes": 25,
    "defaultDurationMinutes": 40,
    "maxDurationMinutes": 55,
    "experienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "blocks": [
      {
        "id": "warmup",
        "kind": "warmup",
        "title": "Shoulder Prep",
        "durationMinutes": 6,
        "prescriptionTemplateId": "shoulder_prehab"
      },
      {
        "id": "main",
        "kind": "main",
        "title": "Boxing Support Work",
        "durationMinutes": 29,
        "prescriptionTemplateId": "power_quality"
      },
      {
        "id": "cooldown",
        "kind": "cooldown",
        "title": "Breathing Reset",
        "durationMinutes": 5,
        "prescriptionTemplateId": "breathing_reset"
      }
    ],
    "movementSlots": [
      {
        "id": "warmup_shoulder",
        "blockId": "warmup",
        "movementPatternIds": [
          "shoulder_prehab"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "main_rotation",
        "blockId": "main",
        "movementPatternIds": [
          "rotation",
          "anti_rotation"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "main_push_pull",
        "blockId": "main",
        "movementPatternIds": [
          "horizontal_push",
          "horizontal_pull"
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
      "Power reps stay fast and controlled.",
      "Shoulders feel better or unchanged.",
      "Quality and RPE are logged."
    ]
  }
] satisfies SessionTemplate[];
