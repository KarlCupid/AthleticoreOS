import type { SessionTemplate } from '../../types.ts';

export const hypertrophySessionTemplates = [
  {
    "id": "dumbbell_hypertrophy",
    "label": "Dumbbell Hypertrophy",
    "summary": "Moderate-volume dumbbell session with balanced upper/lower exposure.",
    "workoutTypeId": "hypertrophy",
    "goalIds": [
      "hypertrophy",
      "dumbbell_hypertrophy"
    ],
    "formatId": "superset",
    "minDurationMinutes": 30,
    "defaultDurationMinutes": 45,
    "maxDurationMinutes": 70,
    "experienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "blocks": [
      {
        "id": "warmup",
        "kind": "warmup",
        "title": "Tissue Prep",
        "durationMinutes": 6,
        "prescriptionTemplateId": "mobility_hold"
      },
      {
        "id": "main",
        "kind": "main",
        "title": "Hypertrophy Work",
        "durationMinutes": 34,
        "prescriptionTemplateId": "hypertrophy_straight"
      },
      {
        "id": "cooldown",
        "kind": "cooldown",
        "title": "Range Reset",
        "durationMinutes": 5,
        "prescriptionTemplateId": "mobility_hold"
      }
    ],
    "movementSlots": [
      {
        "id": "warmup_thoracic",
        "blockId": "warmup",
        "movementPatternIds": [
          "thoracic_mobility"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "main_squat_lunge",
        "blockId": "main",
        "movementPatternIds": [
          "squat",
          "lunge"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "main_push",
        "blockId": "main",
        "movementPatternIds": [
          "horizontal_push",
          "vertical_push"
        ],
        "order": 2,
        "optional": false
      },
      {
        "id": "main_pull",
        "blockId": "main",
        "movementPatternIds": [
          "horizontal_pull"
        ],
        "order": 3,
        "optional": false
      },
      {
        "id": "main_hinge",
        "blockId": "main",
        "movementPatternIds": [
          "hinge"
        ],
        "order": 4,
        "optional": false
      },
      {
        "id": "main_accessory",
        "blockId": "main",
        "movementPatternIds": [
          "vertical_push",
          "vertical_pull"
        ],
        "order": 5,
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
      "No set reaches failure.",
      "The athlete logs load and reps.",
      "Joint discomfort does not increase during the session."
    ]
  }
] satisfies SessionTemplate[];
