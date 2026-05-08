import type { SessionTemplate } from '../../types.ts';

export const boxingSessionTemplates = [
  {
    "id": "boxing_skill_microdose",
    "label": "Boxing Skill Microdose",
    "summary": "Short low-risk stance, rhythm, breathing, and shadowboxing quality practice.",
    "workoutTypeId": "boxing_progression",
    "goalIds": [
      "boxing_skill_microdose",
      "boxing_progression",
      "boxing_support"
    ],
    "formatId": "skill_practice",
    "minDurationMinutes": 8,
    "defaultDurationMinutes": 18,
    "maxDurationMinutes": 30,
    "experienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "blocks": [
      {
        "id": "warmup",
        "kind": "warmup",
        "title": "Stance And Breathing Prep",
        "durationMinutes": 4,
        "prescriptionTemplateId": "boxing_microdose_quality"
      },
      {
        "id": "main",
        "kind": "main",
        "title": "Low-Contact Skill Microdose",
        "durationMinutes": 10,
        "prescriptionTemplateId": "boxing_microdose_quality"
      },
      {
        "id": "cooldown",
        "kind": "cooldown",
        "title": "Guard Reset",
        "durationMinutes": 4,
        "prescriptionTemplateId": "boxing_recovery_reset"
      }
    ],
    "movementSlots": [
      {
        "id": "warmup_stance",
        "blockId": "warmup",
        "movementPatternIds": [
          "breathing",
          "balance"
        ],
        "preferredExerciseIds": [
          "boxing_stance_breathing_reset"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "main_shadow_quality",
        "blockId": "main",
        "movementPatternIds": [
          "locomotion",
          "breathing",
          "rotation"
        ],
        "preferredExerciseIds": [
          "shadowboxing_posture_round",
          "boxing_step_slide_line"
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
        "preferredExerciseIds": [
          "boxing_stance_breathing_reset",
          "crocodile_breathing"
        ],
        "order": 1,
        "optional": false
      }
    ],
    "successCriteria": [
      "No live sparring, opponent simulation, or contact is added.",
      "Stance, guard, and breathing stay controlled.",
      "The athlete finishes feeling fresher, not drained."
    ]
  },
  {
    "id": "footwork_agility",
    "label": "Boxing Footwork Agility",
    "summary": "Footwork, stance resets, pivots, and ankle/hip capacity for boxing movement.",
    "workoutTypeId": "boxing_progression",
    "goalIds": [
      "footwork_agility",
      "boxing_progression"
    ],
    "formatId": "skill_practice",
    "minDurationMinutes": 18,
    "defaultDurationMinutes": 28,
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
        "title": "Foot And Hip Prep",
        "durationMinutes": 6,
        "prescriptionTemplateId": "boxing_hip_ankle_mobility"
      },
      {
        "id": "main",
        "kind": "main",
        "title": "Footwork Quality Rounds",
        "durationMinutes": 17,
        "prescriptionTemplateId": "boxing_footwork_agility_quality"
      },
      {
        "id": "cooldown",
        "kind": "cooldown",
        "title": "Ankle Breathing Reset",
        "durationMinutes": 5,
        "prescriptionTemplateId": "boxing_recovery_reset"
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
        "preferredExerciseIds": [
          "boxing_hip_ankle_footwork_flow",
          "ankle_rocker"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "main_step_slide",
        "blockId": "main",
        "movementPatternIds": [
          "locomotion",
          "balance",
          "ankle_mobility"
        ],
        "preferredExerciseIds": [
          "boxing_step_slide_line"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "main_pivot",
        "blockId": "main",
        "movementPatternIds": [
          "rotation",
          "balance"
        ],
        "preferredExerciseIds": [
          "boxing_pivot_stance_reset"
        ],
        "order": 2,
        "optional": true
      },
      {
        "id": "cooldown_breathing",
        "blockId": "cooldown",
        "movementPatternIds": [
          "breathing",
          "ankle_mobility"
        ],
        "preferredExerciseIds": [
          "boxing_stance_breathing_reset",
          "ankle_rocker"
        ],
        "order": 1,
        "optional": false
      }
    ],
    "successCriteria": [
      "Feet stay quiet and stance width is recovered after each change.",
      "No reckless plyometric volume is added for beginners.",
      "Footwork quality is logged before fatigue dominates."
    ]
  },
  {
    "id": "shadowboxing_quality",
    "label": "Shadowboxing Quality",
    "summary": "Low-contact solo shadowboxing for posture, rhythm, guard, breathing, and foot placement.",
    "workoutTypeId": "boxing_progression",
    "goalIds": [
      "shadowboxing_quality",
      "boxing_progression"
    ],
    "formatId": "skill_practice",
    "minDurationMinutes": 15,
    "defaultDurationMinutes": 25,
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
        "title": "Stance And Guard Prep",
        "durationMinutes": 5,
        "prescriptionTemplateId": "boxing_microdose_quality"
      },
      {
        "id": "main",
        "kind": "main",
        "title": "Shadowboxing Quality Rounds",
        "durationMinutes": 15,
        "prescriptionTemplateId": "boxing_shadowboxing_quality_rounds"
      },
      {
        "id": "cooldown",
        "kind": "cooldown",
        "title": "Breathing And Posture Reset",
        "durationMinutes": 5,
        "prescriptionTemplateId": "boxing_recovery_reset"
      }
    ],
    "movementSlots": [
      {
        "id": "warmup_stance",
        "blockId": "warmup",
        "movementPatternIds": [
          "breathing",
          "balance"
        ],
        "preferredExerciseIds": [
          "boxing_stance_breathing_reset"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "main_shadowboxing",
        "blockId": "main",
        "movementPatternIds": [
          "locomotion",
          "rotation",
          "breathing"
        ],
        "preferredExerciseIds": [
          "shadowboxing_posture_round"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "cooldown_neck_shoulders",
        "blockId": "cooldown",
        "movementPatternIds": [
          "breathing",
          "shoulder_prehab"
        ],
        "preferredExerciseIds": [
          "boxing_neck_trap_posture_reset",
          "boxing_stance_breathing_reset"
        ],
        "order": 1,
        "optional": false
      }
    ],
    "successCriteria": [
      "The session stays solo, low contact, and self-guided.",
      "Guard, foot placement, and breathing are reset before fatigue changes them.",
      "The session does not claim to replace coach-led technical instruction."
    ]
  },
  {
    "id": "boxing_roadwork_zone2",
    "label": "Boxing Roadwork Aerobic Base",
    "summary": "Conversational boxing roadwork for aerobic base and repeat-round recovery.",
    "workoutTypeId": "zone2_cardio",
    "goalIds": [
      "roadwork_aerobic_base"
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
        "title": "Easy Roadwork Ramp",
        "durationMinutes": 5,
        "prescriptionTemplateId": "boxing_recovery_reset"
      },
      {
        "id": "main",
        "kind": "main",
        "title": "Conversational Roadwork",
        "durationMinutes": 25,
        "prescriptionTemplateId": "boxing_roadwork_zone2"
      },
      {
        "id": "cooldown",
        "kind": "cooldown",
        "title": "Walk Downshift",
        "durationMinutes": 5,
        "prescriptionTemplateId": "boxing_recovery_reset"
      }
    ],
    "movementSlots": [
      {
        "id": "warmup_walk",
        "blockId": "warmup",
        "movementPatternIds": [
          "locomotion",
          "breathing"
        ],
        "preferredExerciseIds": [
          "boxing_recovery_walk_breathing",
          "easy_walk"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "main_roadwork",
        "blockId": "main",
        "movementPatternIds": [
          "locomotion"
        ],
        "preferredExerciseIds": [
          "boxing_roadwork_easy_run",
          "easy_walk"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "cooldown_walk",
        "blockId": "cooldown",
        "movementPatternIds": [
          "locomotion",
          "breathing"
        ],
        "preferredExerciseIds": [
          "boxing_recovery_walk_breathing",
          "easy_walk"
        ],
        "order": 1,
        "optional": false
      }
    ],
    "successCriteria": [
      "Breathing stays conversational.",
      "The session supports boxing recovery rather than adding hard fatigue.",
      "Duration, RPE, and optional heart-rate zone are logged."
    ]
  },
  {
    "id": "boxing_roadwork_tempo",
    "label": "Boxing Roadwork Tempo",
    "summary": "Controlled tempo roadwork for pacing durability without random finishers.",
    "workoutTypeId": "roadwork_tempo",
    "goalIds": [
      "roadwork_tempo"
    ],
    "formatId": "tempo_sets",
    "minDurationMinutes": 22,
    "defaultDurationMinutes": 32,
    "maxDurationMinutes": 45,
    "experienceLevels": [
      "intermediate",
      "advanced"
    ],
    "blocks": [
      {
        "id": "warmup",
        "kind": "warmup",
        "title": "Easy Roadwork Ramp",
        "durationMinutes": 7,
        "prescriptionTemplateId": "boxing_roadwork_zone2"
      },
      {
        "id": "main",
        "kind": "main",
        "title": "Controlled Tempo",
        "durationMinutes": 18,
        "prescriptionTemplateId": "boxing_roadwork_tempo"
      },
      {
        "id": "cooldown",
        "kind": "cooldown",
        "title": "Easy Walk Down",
        "durationMinutes": 7,
        "prescriptionTemplateId": "boxing_recovery_reset"
      }
    ],
    "movementSlots": [
      {
        "id": "warmup_roadwork",
        "blockId": "warmup",
        "movementPatternIds": [
          "locomotion",
          "breathing"
        ],
        "preferredExerciseIds": [
          "boxing_roadwork_easy_run",
          "easy_walk"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "main_tempo",
        "blockId": "main",
        "movementPatternIds": [
          "locomotion"
        ],
        "preferredExerciseIds": [
          "boxing_roadwork_tempo_run"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "cooldown_breathing",
        "blockId": "cooldown",
        "movementPatternIds": [
          "locomotion",
          "breathing"
        ],
        "preferredExerciseIds": [
          "boxing_recovery_walk_breathing"
        ],
        "order": 1,
        "optional": false
      }
    ],
    "successCriteria": [
      "Tempo remains controlled and does not become intervals.",
      "No red or orange readiness context receives this template.",
      "The athlete finishes with repeatable pacing, not a final sprint."
    ]
  },
  {
    "id": "boxing_roadwork_intervals",
    "label": "Boxing Roadwork Intervals",
    "summary": "Readiness-gated roadwork intervals for repeat output.",
    "workoutTypeId": "roadwork_intervals",
    "goalIds": [
      "roadwork_intervals"
    ],
    "formatId": "intervals",
    "minDurationMinutes": 25,
    "defaultDurationMinutes": 38,
    "maxDurationMinutes": 50,
    "experienceLevels": [
      "intermediate",
      "advanced"
    ],
    "blocks": [
      {
        "id": "warmup",
        "kind": "warmup",
        "title": "Roadwork Ramp",
        "durationMinutes": 10,
        "prescriptionTemplateId": "boxing_roadwork_zone2"
      },
      {
        "id": "main",
        "kind": "main",
        "title": "Repeatable Running Intervals",
        "durationMinutes": 20,
        "prescriptionTemplateId": "boxing_roadwork_intervals"
      },
      {
        "id": "cooldown",
        "kind": "cooldown",
        "title": "Walk And Breathing Recovery",
        "durationMinutes": 8,
        "prescriptionTemplateId": "boxing_recovery_reset"
      }
    ],
    "movementSlots": [
      {
        "id": "warmup_roadwork",
        "blockId": "warmup",
        "movementPatternIds": [
          "locomotion",
          "breathing"
        ],
        "preferredExerciseIds": [
          "boxing_roadwork_easy_run"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "main_intervals",
        "blockId": "main",
        "movementPatternIds": [
          "locomotion"
        ],
        "preferredExerciseIds": [
          "boxing_roadwork_interval_stride"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "cooldown_walk",
        "blockId": "cooldown",
        "movementPatternIds": [
          "locomotion",
          "breathing"
        ],
        "preferredExerciseIds": [
          "boxing_recovery_walk_breathing"
        ],
        "order": 1,
        "optional": false
      }
    ],
    "successCriteria": [
      "Intervals are repeatable and never all-out.",
      "The session is not placed near hard sparring or competition.",
      "Running is substituted when impact or readiness does not allow it."
    ]
  },
  {
    "id": "boxing_alactic_repeat_power",
    "label": "Boxing Alactic Repeat Power",
    "summary": "Short burst work with full recovery for boxing repeat-output support.",
    "workoutTypeId": "boxing_conditioning_support",
    "goalIds": [
      "alactic_repeat_power"
    ],
    "formatId": "intervals",
    "minDurationMinutes": 20,
    "defaultDurationMinutes": 30,
    "maxDurationMinutes": 40,
    "experienceLevels": [
      "intermediate",
      "advanced"
    ],
    "blocks": [
      {
        "id": "warmup",
        "kind": "warmup",
        "title": "Footwork Prep",
        "durationMinutes": 8,
        "prescriptionTemplateId": "boxing_footwork_agility_quality"
      },
      {
        "id": "main",
        "kind": "main",
        "title": "Short Burst Full-Recovery Repeats",
        "durationMinutes": 15,
        "prescriptionTemplateId": "boxing_alactic_repeat_power"
      },
      {
        "id": "cooldown",
        "kind": "cooldown",
        "title": "Breathing Reset",
        "durationMinutes": 7,
        "prescriptionTemplateId": "boxing_recovery_reset"
      }
    ],
    "movementSlots": [
      {
        "id": "warmup_footwork",
        "blockId": "warmup",
        "movementPatternIds": [
          "locomotion",
          "balance"
        ],
        "preferredExerciseIds": [
          "boxing_step_slide_line"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "main_burst",
        "blockId": "main",
        "movementPatternIds": [
          "locomotion",
          "balance"
        ],
        "preferredExerciseIds": [
          "boxing_alactic_first_step_burst"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "cooldown_reset",
        "blockId": "cooldown",
        "movementPatternIds": [
          "breathing"
        ],
        "preferredExerciseIds": [
          "boxing_stance_breathing_reset"
        ],
        "order": 1,
        "optional": false
      }
    ],
    "successCriteria": [
      "Every burst stays fast and low volume.",
      "Full recovery is used before the next repeat.",
      "The session does not turn into glycolytic fatigue."
    ]
  },
  {
    "id": "boxing_glycolytic_round_tolerance",
    "label": "Boxing Glycolytic Round Tolerance",
    "summary": "Prepared-athlete round tolerance that avoids live-contact simulation.",
    "workoutTypeId": "boxing_conditioning_support",
    "goalIds": [
      "glycolytic_round_tolerance"
    ],
    "formatId": "intervals",
    "minDurationMinutes": 25,
    "defaultDurationMinutes": 36,
    "maxDurationMinutes": 48,
    "experienceLevels": [
      "intermediate",
      "advanced"
    ],
    "blocks": [
      {
        "id": "warmup",
        "kind": "warmup",
        "title": "Movement Prep",
        "durationMinutes": 8,
        "prescriptionTemplateId": "boxing_footwork_agility_quality"
      },
      {
        "id": "main",
        "kind": "main",
        "title": "Controlled Round Tolerance",
        "durationMinutes": 21,
        "prescriptionTemplateId": "boxing_glycolytic_round_tolerance"
      },
      {
        "id": "cooldown",
        "kind": "cooldown",
        "title": "Recovery Breathing",
        "durationMinutes": 7,
        "prescriptionTemplateId": "boxing_recovery_reset"
      }
    ],
    "movementSlots": [
      {
        "id": "warmup_footwork",
        "blockId": "warmup",
        "movementPatternIds": [
          "locomotion",
          "balance"
        ],
        "preferredExerciseIds": [
          "boxing_step_slide_line"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "main_round_tolerance",
        "blockId": "main",
        "movementPatternIds": [
          "locomotion",
          "breathing",
          "anti_rotation"
        ],
        "preferredExerciseIds": [
          "boxing_round_tolerance_footwork"
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
        "preferredExerciseIds": [
          "boxing_stance_breathing_reset"
        ],
        "order": 1,
        "optional": false
      }
    ],
    "successCriteria": [
      "No live sparring or opponent simulation is generated.",
      "Round output remains repeatable and readiness-gated.",
      "The session is not stacked near hard sparring."
    ]
  },
  {
    "id": "boxing_rotational_power",
    "label": "Boxing Rotational Power",
    "summary": "Low-volume rotational power and hip-to-trunk transfer support.",
    "workoutTypeId": "boxing_support",
    "goalIds": [
      "rotational_power",
      "explosive_power"
    ],
    "formatId": "skill_practice",
    "minDurationMinutes": 25,
    "defaultDurationMinutes": 38,
    "maxDurationMinutes": 50,
    "experienceLevels": [
      "intermediate",
      "advanced"
    ],
    "blocks": [
      {
        "id": "warmup",
        "kind": "warmup",
        "title": "Trunk And Shoulder Prep",
        "durationMinutes": 8,
        "prescriptionTemplateId": "boxing_trunk_durability_control"
      },
      {
        "id": "main",
        "kind": "main",
        "title": "Rotational Power Quality",
        "durationMinutes": 22,
        "prescriptionTemplateId": "boxing_rotational_power_quality"
      },
      {
        "id": "cooldown",
        "kind": "cooldown",
        "title": "Scap And Breathing Reset",
        "durationMinutes": 8,
        "prescriptionTemplateId": "boxing_recovery_reset"
      }
    ],
    "movementSlots": [
      {
        "id": "warmup_trunk",
        "blockId": "warmup",
        "movementPatternIds": [
          "anti_rotation",
          "shoulder_prehab"
        ],
        "preferredExerciseIds": [
          "boxing_pallof_guard_press",
          "boxing_scap_guard_endurance"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "main_rotation_power",
        "blockId": "main",
        "movementPatternIds": [
          "rotation"
        ],
        "preferredExerciseIds": [
          "boxing_med_ball_rotational_throw",
          "med_ball_rotational_throw"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "cooldown_scap",
        "blockId": "cooldown",
        "movementPatternIds": [
          "shoulder_prehab",
          "breathing"
        ],
        "preferredExerciseIds": [
          "boxing_scap_guard_endurance",
          "boxing_neck_trap_posture_reset"
        ],
        "order": 1,
        "optional": false
      }
    ],
    "successCriteria": [
      "Power reps stay fast and low fatigue.",
      "Hip-to-trunk transfer is trained without conditioning spillover.",
      "Back and shoulder comfort stay unchanged or better."
    ]
  },
  {
    "id": "boxing_trunk_durability",
    "label": "Boxing Trunk Durability",
    "summary": "Anti-rotation, rotation control, bracing, and posture support for boxing rounds.",
    "workoutTypeId": "core_durability",
    "goalIds": [
      "trunk_rotation_durability"
    ],
    "formatId": "superset",
    "minDurationMinutes": 22,
    "defaultDurationMinutes": 34,
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
        "title": "Breathing And Brace Prep",
        "durationMinutes": 6,
        "prescriptionTemplateId": "boxing_recovery_reset"
      },
      {
        "id": "main",
        "kind": "main",
        "title": "Trunk Rotation Durability",
        "durationMinutes": 22,
        "prescriptionTemplateId": "boxing_trunk_durability_control"
      },
      {
        "id": "cooldown",
        "kind": "cooldown",
        "title": "Thoracic Reset",
        "durationMinutes": 6,
        "prescriptionTemplateId": "boxing_neck_trap_postural_durability"
      }
    ],
    "movementSlots": [
      {
        "id": "warmup_breathing",
        "blockId": "warmup",
        "movementPatternIds": [
          "breathing",
          "anti_extension"
        ],
        "preferredExerciseIds": [
          "dead_bug",
          "boxing_stance_breathing_reset"
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
        "preferredExerciseIds": [
          "boxing_pallof_guard_press",
          "pallof_press"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "main_rotation_control",
        "blockId": "main",
        "movementPatternIds": [
          "rotation"
        ],
        "preferredExerciseIds": [
          "cable_woodchop",
          "boxing_pivot_stance_reset"
        ],
        "order": 2,
        "optional": true
      },
      {
        "id": "cooldown_tspine",
        "blockId": "cooldown",
        "movementPatternIds": [
          "thoracic_mobility",
          "breathing"
        ],
        "preferredExerciseIds": [
          "boxing_neck_trap_posture_reset",
          "thoracic_open_book"
        ],
        "order": 1,
        "optional": false
      }
    ],
    "successCriteria": [
      "Trunk control stays crisp without back symptoms.",
      "Anti-rotation and posture are trained before fatigue.",
      "The session supports boxing rounds without contact."
    ]
  },
  {
    "id": "boxing_shoulder_scap_durability",
    "label": "Boxing Shoulder Scap Durability",
    "summary": "Scapular control, rotator cuff, serratus, and thoracic support for boxing frequency.",
    "workoutTypeId": "boxing_durability",
    "goalIds": [
      "shoulder_scap_durability"
    ],
    "formatId": "mobility_flow",
    "minDurationMinutes": 16,
    "defaultDurationMinutes": 26,
    "maxDurationMinutes": 38,
    "experienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "blocks": [
      {
        "id": "warmup",
        "kind": "warmup",
        "title": "Thoracic And Breath Prep",
        "durationMinutes": 5,
        "prescriptionTemplateId": "boxing_recovery_reset"
      },
      {
        "id": "main",
        "kind": "main",
        "title": "Shoulder Scap Durability",
        "durationMinutes": 16,
        "prescriptionTemplateId": "boxing_shoulder_scap_durability"
      },
      {
        "id": "cooldown",
        "kind": "cooldown",
        "title": "Neck And Guard Reset",
        "durationMinutes": 5,
        "prescriptionTemplateId": "boxing_neck_trap_postural_durability"
      }
    ],
    "movementSlots": [
      {
        "id": "warmup_tspine",
        "blockId": "warmup",
        "movementPatternIds": [
          "thoracic_mobility",
          "breathing"
        ],
        "preferredExerciseIds": [
          "boxing_neck_trap_posture_reset",
          "cat_cow"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "main_scap",
        "blockId": "main",
        "movementPatternIds": [
          "shoulder_prehab",
          "horizontal_pull"
        ],
        "preferredExerciseIds": [
          "boxing_scap_guard_endurance",
          "band_pull_apart",
          "band_external_rotation"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "cooldown_neck",
        "blockId": "cooldown",
        "movementPatternIds": [
          "shoulder_prehab",
          "breathing"
        ],
        "preferredExerciseIds": [
          "boxing_neck_trap_posture_reset"
        ],
        "order": 1,
        "optional": false
      }
    ],
    "successCriteria": [
      "Shoulders feel better or unchanged.",
      "No pinching, numbness, or neck tension is trained through.",
      "The work supports guard durability without heavy loading."
    ]
  },
  {
    "id": "boxing_neck_trap_durability",
    "label": "Boxing Neck Trap Durability",
    "summary": "Conservative neck/trap-adjacent posture, scapular, and breathing reset work.",
    "workoutTypeId": "boxing_durability",
    "goalIds": [
      "neck_trap_durability"
    ],
    "formatId": "mobility_flow",
    "minDurationMinutes": 12,
    "defaultDurationMinutes": 22,
    "maxDurationMinutes": 32,
    "experienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "blocks": [
      {
        "id": "warmup",
        "kind": "warmup",
        "title": "Breathing Downshift",
        "durationMinutes": 4,
        "prescriptionTemplateId": "boxing_recovery_reset"
      },
      {
        "id": "main",
        "kind": "main",
        "title": "Conservative Neck Trap Reset",
        "durationMinutes": 14,
        "prescriptionTemplateId": "boxing_neck_trap_postural_durability"
      },
      {
        "id": "cooldown",
        "kind": "cooldown",
        "title": "Easy Posture Check",
        "durationMinutes": 4,
        "prescriptionTemplateId": "boxing_recovery_reset"
      }
    ],
    "movementSlots": [
      {
        "id": "warmup_breathing",
        "blockId": "warmup",
        "movementPatternIds": [
          "breathing"
        ],
        "preferredExerciseIds": [
          "crocodile_breathing",
          "boxing_stance_breathing_reset"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "main_posture",
        "blockId": "main",
        "movementPatternIds": [
          "shoulder_prehab",
          "thoracic_mobility",
          "breathing"
        ],
        "preferredExerciseIds": [
          "boxing_neck_trap_posture_reset",
          "boxing_scap_guard_endurance"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "cooldown_reset",
        "blockId": "cooldown",
        "movementPatternIds": [
          "breathing"
        ],
        "preferredExerciseIds": [
          "boxing_stance_breathing_reset",
          "childs_pose_breathing"
        ],
        "order": 1,
        "optional": false
      }
    ],
    "successCriteria": [
      "No loaded neck flexion, extension, bridging, or forced range is prescribed.",
      "Jaw, neck, and trap tone decrease or stay quiet.",
      "The athlete stops for headache, dizziness, numbness, or sharp pain."
    ]
  },
  {
    "id": "boxing_hip_ankle_mobility",
    "label": "Boxing Hip Ankle Mobility",
    "summary": "Hip, ankle, calf, adductor, and balance support for boxing footwork frequency.",
    "workoutTypeId": "boxing_durability",
    "goalIds": [
      "hip_ankle_mobility",
      "hip_footwork_durability",
      "mobility_prehab"
    ],
    "formatId": "mobility_flow",
    "minDurationMinutes": 15,
    "defaultDurationMinutes": 25,
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
        "title": "Foot Pressure Prep",
        "durationMinutes": 5,
        "prescriptionTemplateId": "boxing_microdose_quality"
      },
      {
        "id": "main",
        "kind": "main",
        "title": "Hip Ankle Footwork Durability",
        "durationMinutes": 15,
        "prescriptionTemplateId": "boxing_hip_ankle_mobility"
      },
      {
        "id": "cooldown",
        "kind": "cooldown",
        "title": "Stance Breathing Reset",
        "durationMinutes": 5,
        "prescriptionTemplateId": "boxing_recovery_reset"
      }
    ],
    "movementSlots": [
      {
        "id": "warmup_stance",
        "blockId": "warmup",
        "movementPatternIds": [
          "balance",
          "breathing"
        ],
        "preferredExerciseIds": [
          "boxing_stance_breathing_reset"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "main_hip_ankle",
        "blockId": "main",
        "movementPatternIds": [
          "hip_mobility",
          "ankle_mobility",
          "balance"
        ],
        "preferredExerciseIds": [
          "boxing_hip_ankle_footwork_flow",
          "ankle_rocker",
          "half_kneeling_hip_flexor"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "cooldown_reset",
        "blockId": "cooldown",
        "movementPatternIds": [
          "breathing",
          "hip_mobility"
        ],
        "preferredExerciseIds": [
          "boxing_stance_breathing_reset",
          "childs_pose_breathing"
        ],
        "order": 1,
        "optional": false
      }
    ],
    "successCriteria": [
      "Hip, ankle, calf, and footwork range stays pain-free.",
      "The session supports future footwork quality rather than creating soreness.",
      "Balance and foot pressure are logged."
    ]
  },
  {
    "id": "boxing_recovery_reset",
    "label": "Boxing Recovery Reset",
    "summary": "Low-stress breathing, easy movement, and mobility for readiness preservation.",
    "workoutTypeId": "recovery",
    "goalIds": [
      "recovery_reset",
      "recovery",
      "return_to_training"
    ],
    "formatId": "recovery_flow",
    "minDurationMinutes": 10,
    "defaultDurationMinutes": 20,
    "maxDurationMinutes": 30,
    "experienceLevels": [
      "beginner",
      "intermediate",
      "advanced"
    ],
    "blocks": [
      {
        "id": "warmup",
        "kind": "warmup",
        "title": "Breathing Check",
        "durationMinutes": 4,
        "prescriptionTemplateId": "boxing_recovery_reset"
      },
      {
        "id": "main",
        "kind": "main",
        "title": "Easy Circulation Reset",
        "durationMinutes": 12,
        "prescriptionTemplateId": "boxing_recovery_reset"
      },
      {
        "id": "cooldown",
        "kind": "cooldown",
        "title": "Readiness Downshift",
        "durationMinutes": 4,
        "prescriptionTemplateId": "boxing_recovery_reset"
      }
    ],
    "movementSlots": [
      {
        "id": "warmup_breathing",
        "blockId": "warmup",
        "movementPatternIds": [
          "breathing"
        ],
        "preferredExerciseIds": [
          "crocodile_breathing",
          "boxing_stance_breathing_reset"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "main_recovery_walk",
        "blockId": "main",
        "movementPatternIds": [
          "locomotion",
          "breathing"
        ],
        "preferredExerciseIds": [
          "boxing_recovery_walk_breathing",
          "easy_walk"
        ],
        "order": 1,
        "optional": false
      },
      {
        "id": "cooldown_reset",
        "blockId": "cooldown",
        "movementPatternIds": [
          "breathing",
          "thoracic_mobility"
        ],
        "preferredExerciseIds": [
          "boxing_neck_trap_posture_reset",
          "childs_pose_breathing"
        ],
        "order": 1,
        "optional": false
      }
    ],
    "successCriteria": [
      "Intensity stays at recovery effort.",
      "Symptoms and readiness improve or stay quiet.",
      "No conditioning or contact is added."
    ]
  }
] satisfies SessionTemplate[];
