import type { SessionTemplate } from '../../types.ts';

export const strengthSessionTemplates = [
  {
    "id": "beginner_full_body_strength",
    "label": "Beginner Full-Body Strength",
    "summary": "A safe squat, push, pull, hinge, and trunk session for new athletes.",
    "workoutTypeId": "strength",
    "goalIds": [
      "beginner_strength",
      "limited_equipment",
      "no_equipment"
    ],
    "formatId": "straight_sets",
    "minDurationMinutes": 25,
    "defaultDurationMinutes": 40,
    "maxDurationMinutes": 60,
    "experienceLevels": [
      "beginner",
      "intermediate"
    ],
    "blocks": [
      {
        "id": "warmup",
        "kind": "warmup",
        "title": "Movement Prep",
        "durationMinutes": 7,
        "prescriptionTemplateId": "mobility_hold"
      },
      {
        "id": "main",
        "kind": "main",
        "title": "Full-Body Strength",
        "durationMinutes": 28,
        "prescriptionTemplateId": "strength_beginner"
      },
      {
        "id": "cooldown",
        "kind": "cooldown",
        "title": "Downshift",
        "durationMinutes": 5,
        "prescriptionTemplateId": "breathing_reset"
      }
    ],
    "movementSlots": [
      {
        "id": "warmup_hip",
        "blockId": "warmup",
        "movementPatternIds": [
          "hip_mobility"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "warmup_shoulder",
        "blockId": "warmup",
        "movementPatternIds": [
          "shoulder_prehab"
        ],
        "order": 2,
        "optional": true
      },
      {
        "id": "main_squat",
        "blockId": "main",
        "movementPatternIds": [
          "squat"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "main_push",
        "blockId": "main",
        "movementPatternIds": [
          "horizontal_push"
        ],
        "order": 2,
        "optional": false
      },
      {
        "id": "main_pull",
        "blockId": "main",
        "movementPatternIds": [
          "horizontal_pull",
          "vertical_pull"
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
        "id": "main_core",
        "blockId": "main",
        "movementPatternIds": [
          "anti_extension",
          "anti_rotation"
        ],
        "order": 5,
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
      "All reps stay pain-free.",
      "RPE stays at or below the target.",
      "The athlete records sets, reps, and session RPE."
    ]
  },
  {
    "id": "full_gym_strength",
    "label": "Full-Gym Strength",
    "summary": "Gym-based strength session with heavier anchors and controlled accessories.",
    "workoutTypeId": "full_body_strength",
    "goalIds": [
      "full_gym_strength",
      "lower_body_strength",
      "upper_body_strength"
    ],
    "formatId": "straight_sets",
    "minDurationMinutes": 40,
    "defaultDurationMinutes": 55,
    "maxDurationMinutes": 75,
    "experienceLevels": [
      "intermediate",
      "advanced"
    ],
    "blocks": [
      {
        "id": "warmup",
        "kind": "warmup",
        "title": "Ramp and Prep",
        "durationMinutes": 8,
        "prescriptionTemplateId": "mobility_hold"
      },
      {
        "id": "main",
        "kind": "main",
        "title": "Strength Anchors",
        "durationMinutes": 42,
        "prescriptionTemplateId": "strength_heavy"
      },
      {
        "id": "cooldown",
        "kind": "cooldown",
        "title": "Recovery Reset",
        "durationMinutes": 5,
        "prescriptionTemplateId": "breathing_reset"
      }
    ],
    "movementSlots": [
      {
        "id": "warmup_hips",
        "blockId": "warmup",
        "movementPatternIds": [
          "hip_mobility",
          "ankle_mobility"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "main_lower",
        "blockId": "main",
        "movementPatternIds": [
          "squat",
          "hinge"
        ],
        "order": 1,
        "optional": false,
        "preferredExerciseIds": [
          "trap_bar_deadlift"
        ]
      },
      {
        "id": "main_press",
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
          "horizontal_pull",
          "vertical_pull"
        ],
        "order": 3,
        "optional": false
      },
      {
        "id": "main_carry",
        "blockId": "main",
        "movementPatternIds": [
          "carry"
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
      "Heavy sets stay submaximal.",
      "No contraindicated exercise is selected.",
      "Load, reps, and RPE are captured."
    ]
  },
  {
    "id": "low_impact_conditioning",
    "label": "Low-Impact Conditioning",
    "summary": "Machine, sled, carry, or rope conditioning without jumps.",
    "workoutTypeId": "low_impact_conditioning",
    "goalIds": [
      "low_impact_conditioning",
      "limited_equipment"
    ],
    "formatId": "intervals",
    "minDurationMinutes": 20,
    "defaultDurationMinutes": 32,
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
        "title": "Easy Ramp",
        "durationMinutes": 5,
        "prescriptionTemplateId": "recovery_easy"
      },
      {
        "id": "main",
        "kind": "main",
        "title": "Low-Impact Intervals",
        "durationMinutes": 22,
        "prescriptionTemplateId": "conditioning_interval"
      },
      {
        "id": "cooldown",
        "kind": "cooldown",
        "title": "Cooldown",
        "durationMinutes": 5,
        "prescriptionTemplateId": "breathing_reset"
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
        "id": "main_conditioning",
        "blockId": "main",
        "movementPatternIds": [
          "locomotion",
          "carry"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "main_support",
        "blockId": "main",
        "movementPatternIds": [
          "horizontal_push",
          "squat"
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
      "No jumping or running is required.",
      "Work intervals remain repeatable.",
      "Rounds and RPE are logged."
    ]
  },
  {
    "id": "no_equipment_strength",
    "label": "No-Equipment Strength",
    "summary": "Bodyweight strength and trunk work for constrained settings.",
    "workoutTypeId": "bodyweight_strength",
    "goalIds": [
      "no_equipment",
      "beginner_strength"
    ],
    "formatId": "circuit",
    "minDurationMinutes": 18,
    "defaultDurationMinutes": 30,
    "maxDurationMinutes": 45,
    "experienceLevels": [
      "beginner",
      "intermediate"
    ],
    "blocks": [
      {
        "id": "warmup",
        "kind": "warmup",
        "title": "Movement Prep",
        "durationMinutes": 5,
        "prescriptionTemplateId": "mobility_hold"
      },
      {
        "id": "main",
        "kind": "main",
        "title": "Bodyweight Strength Circuit",
        "durationMinutes": 20,
        "prescriptionTemplateId": "strength_beginner"
      },
      {
        "id": "cooldown",
        "kind": "cooldown",
        "title": "Downshift",
        "durationMinutes": 5,
        "prescriptionTemplateId": "breathing_reset"
      }
    ],
    "movementSlots": [
      {
        "id": "warmup_mobility",
        "blockId": "warmup",
        "movementPatternIds": [
          "hip_mobility",
          "thoracic_mobility"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "main_squat",
        "blockId": "main",
        "movementPatternIds": [
          "squat"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "main_push",
        "blockId": "main",
        "movementPatternIds": [
          "horizontal_push"
        ],
        "order": 2,
        "optional": false
      },
      {
        "id": "main_hinge",
        "blockId": "main",
        "movementPatternIds": [
          "hinge"
        ],
        "order": 3,
        "optional": false
      },
      {
        "id": "main_core",
        "blockId": "main",
        "movementPatternIds": [
          "anti_extension",
          "anti_rotation"
        ],
        "order": 4,
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
      "All movements require bodyweight only.",
      "The circuit remains pain-free.",
      "Completion and RPE are logged."
    ]
  },
  {
    "id": "upper_strength",
    "label": "Upper Strength",
    "summary": "Upper-body push, pull, and shoulder support.",
    "workoutTypeId": "upper_strength",
    "goalIds": [
      "upper_body_strength"
    ],
    "formatId": "straight_sets",
    "minDurationMinutes": 30,
    "defaultDurationMinutes": 45,
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
        "title": "Shoulder Prep",
        "durationMinutes": 6,
        "prescriptionTemplateId": "shoulder_prehab"
      },
      {
        "id": "main",
        "kind": "main",
        "title": "Upper Strength",
        "durationMinutes": 34,
        "prescriptionTemplateId": "strength_beginner"
      },
      {
        "id": "cooldown",
        "kind": "cooldown",
        "title": "Shoulder Reset",
        "durationMinutes": 5,
        "prescriptionTemplateId": "mobility_hold"
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
        "id": "main_push",
        "blockId": "main",
        "movementPatternIds": [
          "horizontal_push",
          "vertical_push"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "main_pull",
        "blockId": "main",
        "movementPatternIds": [
          "horizontal_pull",
          "vertical_pull"
        ],
        "order": 2,
        "optional": false
      },
      {
        "id": "main_core",
        "blockId": "main",
        "movementPatternIds": [
          "anti_rotation"
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
      "Pressing and pulling remain shoulder-safe.",
      "Loads and reps are logged.",
      "No set is taken to failure."
    ]
  },
  {
    "id": "lower_strength",
    "label": "Lower Strength",
    "summary": "Lower-body squat, hinge, lunge, and trunk support.",
    "workoutTypeId": "lower_strength",
    "goalIds": [
      "lower_body_strength"
    ],
    "formatId": "straight_sets",
    "minDurationMinutes": 35,
    "defaultDurationMinutes": 50,
    "maxDurationMinutes": 65,
    "experienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "blocks": [
      {
        "id": "warmup",
        "kind": "warmup",
        "title": "Lower Prep",
        "durationMinutes": 7,
        "prescriptionTemplateId": "mobility_hold"
      },
      {
        "id": "main",
        "kind": "main",
        "title": "Lower Strength",
        "durationMinutes": 38,
        "prescriptionTemplateId": "strength_beginner"
      },
      {
        "id": "cooldown",
        "kind": "cooldown",
        "title": "Cooldown",
        "durationMinutes": 5,
        "prescriptionTemplateId": "breathing_reset"
      }
    ],
    "movementSlots": [
      {
        "id": "warmup_hip_ankle",
        "blockId": "warmup",
        "movementPatternIds": [
          "hip_mobility",
          "ankle_mobility"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "main_squat",
        "blockId": "main",
        "movementPatternIds": [
          "squat"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "main_hinge",
        "blockId": "main",
        "movementPatternIds": [
          "hinge"
        ],
        "order": 2,
        "optional": false
      },
      {
        "id": "main_lunge",
        "blockId": "main",
        "movementPatternIds": [
          "lunge"
        ],
        "order": 3,
        "optional": false
      },
      {
        "id": "main_core",
        "blockId": "main",
        "movementPatternIds": [
          "anti_extension"
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
      "Knee and back signals stay quiet.",
      "Working sets stay technically clean.",
      "Sets, reps, load, and RPE are logged."
    ]
  }
] satisfies SessionTemplate[];
