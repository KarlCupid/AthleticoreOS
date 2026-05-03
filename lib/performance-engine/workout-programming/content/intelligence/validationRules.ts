import type { ValidationRule } from '../../types.ts';

export const validationRules = [
  {
    "id": "workout_type_consistency",
    "label": "Workout Type Consistency",
    "severity": "error",
    "explanation": "The generated workout type must match the selected session template and taxonomy.",
    "correction": "Use a workout type that matches the template or select a matching template.",
    "userFacingMessage": "The workout label and structure need to match before this can be shown."
  },
  {
    "id": "training_goal_consistency",
    "label": "Training Goal Consistency",
    "severity": "error",
    "explanation": "The session template must support the selected training goal.",
    "correction": "Choose a template whose goalIds include the requested training goal.",
    "userFacingMessage": "The workout structure should match the goal you selected."
  },
  {
    "id": "workout_format_consistency",
    "label": "Workout Format Consistency",
    "severity": "error",
    "explanation": "The workout format must match the selected template and known format taxonomy.",
    "correction": "Use a known workout format and keep it aligned with the session template.",
    "userFacingMessage": "The workout format needs to match the planned session style."
  },
  {
    "id": "intensity_model_consistency",
    "label": "Intensity Model Consistency",
    "severity": "error",
    "explanation": "Main-work prescription payloads must match the workout type intensity model.",
    "correction": "Use resistance for strength, cardio for Zone 2, mobility for mobility, recovery for recovery, and quality-gated power for power.",
    "userFacingMessage": "The effort targets need to match the type of session."
  },
  {
    "id": "volume_consistency",
    "label": "Volume Consistency",
    "severity": "error",
    "explanation": "Every exercise must have a valid work amount through sets or duration.",
    "correction": "Add sets, duration, rounds, or hold time according to the prescription kind.",
    "userFacingMessage": "Each exercise needs a clear amount of work."
  },
  {
    "id": "rest_guidance_completeness",
    "label": "Rest Guidance Completeness",
    "severity": "error",
    "explanation": "Strength, hypertrophy, power, and interval prescriptions need explicit rest guidance.",
    "correction": "Add restSeconds, rest ranges, or work/rest interval structure.",
    "userFacingMessage": "The workout needs clear rest guidance so effort stays controlled."
  },
  {
    "id": "exercise_eligibility",
    "label": "Exercise Eligibility",
    "severity": "error",
    "explanation": "Selected exercises must exist and fit the workout type or goal.",
    "correction": "Swap to an exercise whose ontology supports the workout type or goal.",
    "userFacingMessage": "One exercise does not fit this workout goal yet."
  },
  {
    "id": "equipment_compatibility",
    "label": "Equipment Compatibility",
    "severity": "error",
    "explanation": "Selected exercises must be possible with the available equipment.",
    "correction": "Swap to a compatible bodyweight or available-equipment alternative.",
    "userFacingMessage": "One exercise needs equipment that is not available."
  },
  {
    "id": "experience_level_compatibility",
    "label": "Experience-Level Compatibility",
    "severity": "error",
    "explanation": "Exercise complexity and minimum experience must fit the athlete experience level.",
    "correction": "Use a regression or lower-complexity variation for beginner athletes.",
    "userFacingMessage": "One exercise is too advanced for the athlete right now."
  },
  {
    "id": "safety_flag_compatibility",
    "label": "Safety Flag Compatibility",
    "severity": "error",
    "explanation": "Safety flags must remove contraindicated exercises, running, jumping, and restricted patterns.",
    "correction": "Use substitutions that remove the restricted joint, impact, or movement pattern.",
    "userFacingMessage": "One exercise conflicts with a current safety restriction."
  },
  {
    "id": "pain_flag_compatibility",
    "label": "Pain Flag Compatibility",
    "severity": "error",
    "explanation": "Pain and caution flags must constrain spinal loading, overhead work, and loaded wrist positions.",
    "correction": "Swap to lower-load, supported, or friendlier-angle alternatives.",
    "userFacingMessage": "One exercise needs to be changed for today\u2019s pain or caution signal."
  },
  {
    "id": "movement_pattern_balance",
    "label": "Movement Pattern Balance",
    "severity": "warning",
    "explanation": "Full-body strength sessions should include lower, upper, and trunk/control patterns.",
    "correction": "Add compatible movement slots to restore lower, upper, and trunk balance.",
    "userFacingMessage": "This session may be more balanced with another movement pattern."
  },
  {
    "id": "fatigue_management",
    "label": "Fatigue Management",
    "severity": "error",
    "explanation": "High-skill or high-fatigue work must not be placed in recovery or fatigue-based AMRAP contexts.",
    "correction": "Use quality sets for technical lifts and easy work for recovery sessions.",
    "userFacingMessage": "This workout includes a fatigue mismatch that should be corrected."
  },
  {
    "id": "progression_logic",
    "label": "Progression Logic",
    "severity": "error",
    "explanation": "Progressable prescriptions need explicit progression rules.",
    "correction": "Attach progression rule IDs for resistance and cardio prescriptions.",
    "userFacingMessage": "The workout needs a safe next-step rule."
  },
  {
    "id": "tracking_metric_availability",
    "label": "Tracking Metric Availability",
    "severity": "error",
    "explanation": "Workout and exercise tracking metrics must exist in the tracking taxonomy.",
    "correction": "Use known tracking metric IDs and attach at least one metric per exercise.",
    "userFacingMessage": "One tracking field is missing or unavailable."
  },
  {
    "id": "description_completeness",
    "label": "Description Completeness",
    "severity": "error",
    "explanation": "Generated workouts must include display-ready coaching language and safety copy.",
    "correction": "Generate a complete workout description before returning the workout.",
    "userFacingMessage": "The workout needs complete coaching notes before it is shown."
  },
  {
    "id": "warmup_requirements",
    "label": "Warm-Up Requirements",
    "severity": "error",
    "explanation": "Every trainable workout needs a warm-up block with prep work.",
    "correction": "Add a warm-up block with at least one exercise and enough time to prepare.",
    "userFacingMessage": "This workout needs a warm-up before the main work."
  },
  {
    "id": "cooldown_requirements",
    "label": "Cooldown Requirements",
    "severity": "error",
    "explanation": "Every trainable workout needs a cooldown or downshift block.",
    "correction": "Add cooldown breathing, easy mobility, or easy circulation.",
    "userFacingMessage": "This workout needs a cooldown to finish safely."
  },
  {
    "id": "recovery_session_constraints",
    "label": "Recovery Session Constraints",
    "severity": "error",
    "explanation": "Recovery sessions cannot contain hard intensity, HIIT, conditioning, or power work.",
    "correction": "Cap recovery at easy intensity and use recovery, mobility, flexibility, balance, or easy cardio prescriptions.",
    "userFacingMessage": "Recovery work should stay easy and restorative."
  },
  {
    "id": "power_session_constraints",
    "label": "Power Session Constraints",
    "severity": "error",
    "explanation": "Power work must be low fatigue with explosive intent and full recovery.",
    "correction": "Use low reps, full rest, and a technical quality gate.",
    "userFacingMessage": "Power work needs enough rest to stay fast and clean."
  },
  {
    "id": "hiit_constraints",
    "label": "HIIT Constraints",
    "severity": "error",
    "explanation": "HIIT and conditioning require work interval, rest interval, rounds, and intensity targets.",
    "correction": "Add work/rest/rounds/intensity and label the session as conditioning, not recovery.",
    "userFacingMessage": "Intervals need clear work, rest, rounds, and a matching session label."
  },
  {
    "id": "mobility_constraints",
    "label": "Mobility Constraints",
    "severity": "error",
    "explanation": "Mobility prescriptions require target joints, range intent, and pain-free range.",
    "correction": "Add targetJoints, rangeOfMotionIntent, and painFreeRange=true.",
    "userFacingMessage": "Mobility work needs a target area and a pain-free range."
  },
  {
    "id": "strength_training_constraints",
    "label": "Strength Training Constraints",
    "severity": "error",
    "explanation": "Strength and hypertrophy need load, effort, rest, and proximity-to-failure guidance where appropriate.",
    "correction": "Add rest ranges, load guidance, effort guidance, and RIR/RPE for hypertrophy.",
    "userFacingMessage": "Strength work needs clear load, effort, and rest guidance."
  },
  {
    "id": "cardio_constraints",
    "label": "Cardio Constraints",
    "severity": "error",
    "explanation": "Cardio prescriptions require duration and intensity targets such as heart-rate zone, RPE, and talk test.",
    "correction": "Add durationMinutes, heartRateZone or RPE, and talk-test guidance.",
    "userFacingMessage": "Cardio work needs duration and intensity targets."
  },
  {
    "id": "balance_training_constraints",
    "label": "Balance Training Constraints",
    "severity": "error",
    "explanation": "Balance training needs fall-risk rules and must avoid unstable progressions too early.",
    "correction": "Use floor surface, eyes open, support, and simple stance before unstable surfaces.",
    "userFacingMessage": "Balance work should start supported and stable before progressing."
  }
] satisfies ValidationRule[];
