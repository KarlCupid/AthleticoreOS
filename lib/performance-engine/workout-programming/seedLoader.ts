import { workoutProgrammingCatalog } from './seedData.ts';
import type { WorkoutProgrammingCatalog } from './types.ts';

export interface WorkoutProgrammingSeedRows {
  workout_types: { id: string; label: string; summary: string; sort_order: number }[];
  training_goals: { id: string; label: string; summary: string; default_workout_type_id: string; sort_order: number }[];
  workout_formats: { id: string; label: string; summary: string; sort_order: number }[];
  movement_patterns: { id: string; label: string; summary: string; sort_order: number }[];
  muscle_groups: { id: string; label: string; region: string; summary: string; sort_order: number }[];
  equipment_types: { id: string; label: string; category: string; summary: string; sort_order: number }[];
  programming_exercises: {
    id: string;
    name: string;
    summary: string;
    coaching_summary: string;
    min_experience: string;
    intensity: string;
    impact: string;
    contraindication_flags: string[];
    default_prescription_template_id: string;
  }[];
  exercise_primary_muscles: { exercise_id: string; muscle_group_id: string; sort_order: number }[];
  exercise_secondary_muscles: { exercise_id: string; muscle_group_id: string; sort_order: number }[];
  exercise_equipment: { exercise_id: string; equipment_type_id: string; requirement_kind: 'compatible' | 'optional'; }[];
  exercise_movement_patterns: { exercise_id: string; movement_pattern_id: string; sort_order: number }[];
  exercise_workout_types: { exercise_id: string; workout_type_id: string }[];
  exercise_training_goals: { exercise_id: string; training_goal_id: string }[];
  exercise_tracking_metrics: { exercise_id: string; tracking_metric_id: string }[];
  tracking_metrics: { id: string; label: string; summary: string; sort_order: number }[];
  assessment_metrics: { id: string; label: string; summary: string; sort_order: number }[];
  prescription_templates: {
    id: string;
    label: string;
    applies_to_workout_type_ids: string[];
    default_sets: number | null;
    default_reps: string | null;
    default_duration_seconds: number | null;
    default_duration_minutes: number | null;
    default_rpe: number;
    rest_seconds: number;
    tempo: string | null;
    intensity_cue: string;
  }[];
  session_templates: {
    id: string;
    label: string;
    summary: string;
    workout_type_id: string;
    format_id: string;
    min_duration_minutes: number;
    default_duration_minutes: number;
    max_duration_minutes: number;
    experience_levels: string[];
    success_criteria: string[];
  }[];
  session_template_goals: { session_template_id: string; training_goal_id: string }[];
  session_template_blocks: {
    id: string;
    session_template_id: string;
    kind: string;
    title: string;
    duration_minutes: number;
    prescription_template_id: string;
    sort_order: number;
  }[];
  session_template_movement_slots: {
    id: string;
    session_template_id: string;
    block_id: string;
    movement_pattern_ids: string[];
    optional: boolean;
    preferred_exercise_ids: string[];
    avoid_exercise_ids: string[];
    sort_order: number;
  }[];
}

const GOAL_TO_WORKOUT_TYPE: Record<string, string> = {
  beginner_strength: 'strength',
  hypertrophy: 'hypertrophy',
  zone2_cardio: 'zone2_cardio',
  mobility: 'mobility',
  recovery: 'recovery',
  limited_equipment: 'strength',
  no_equipment: 'bodyweight_strength',
  full_gym_strength: 'full_body_strength',
  dumbbell_hypertrophy: 'hypertrophy',
  low_impact_conditioning: 'low_impact_conditioning',
  core_durability: 'core_durability',
  upper_body_strength: 'upper_strength',
  lower_body_strength: 'lower_strength',
  boxing_support: 'boxing_support',
  return_to_training: 'recovery',
};

function ordered<T extends { id: string }>(items: T[]): (T & { sort_order: number })[] {
  return items.map((item, index) => ({ ...item, sort_order: index + 1 }));
}

export function buildWorkoutProgrammingSeedRows(
  catalog: WorkoutProgrammingCatalog = workoutProgrammingCatalog,
): WorkoutProgrammingSeedRows {
  return {
    workout_types: ordered(catalog.workoutTypes),
    training_goals: ordered(catalog.trainingGoals).map((goal) => ({
      id: goal.id,
      label: goal.label,
      summary: goal.summary,
      default_workout_type_id: GOAL_TO_WORKOUT_TYPE[goal.id] ?? 'strength',
      sort_order: goal.sort_order,
    })),
    workout_formats: ordered(catalog.workoutFormats),
    movement_patterns: ordered(catalog.movementPatterns),
    muscle_groups: ordered(catalog.muscleGroups).map((muscle) => ({
      id: muscle.id,
      label: muscle.label,
      region: muscle.region,
      summary: muscle.summary,
      sort_order: muscle.sort_order,
    })),
    equipment_types: ordered(catalog.equipmentTypes).map((equipment) => ({
      id: equipment.id,
      label: equipment.label,
      category: equipment.category,
      summary: equipment.summary,
      sort_order: equipment.sort_order,
    })),
    programming_exercises: catalog.exercises.map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      summary: exercise.summary,
      coaching_summary: exercise.coachingSummary,
      min_experience: exercise.minExperience,
      intensity: exercise.intensity,
      impact: exercise.impact,
      contraindication_flags: exercise.contraindicationFlags,
      default_prescription_template_id: exercise.defaultPrescriptionTemplateId,
    })),
    exercise_primary_muscles: catalog.exercises.flatMap((exercise) => (
      exercise.primaryMuscleIds.map((muscleGroupId, index) => ({
        exercise_id: exercise.id,
        muscle_group_id: muscleGroupId,
        sort_order: index + 1,
      }))
    )),
    exercise_secondary_muscles: catalog.exercises.flatMap((exercise) => (
      exercise.secondaryMuscleIds.map((muscleGroupId, index) => ({
        exercise_id: exercise.id,
        muscle_group_id: muscleGroupId,
        sort_order: index + 1,
      }))
    )),
    exercise_equipment: catalog.exercises.flatMap((exercise) => (
      exercise.equipmentIds.map((equipmentTypeId) => ({
        exercise_id: exercise.id,
        equipment_type_id: equipmentTypeId,
        requirement_kind: ['bodyweight', 'mat', 'open_space', 'track_or_road'].includes(equipmentTypeId) ? 'optional' : 'compatible',
      }))
    )),
    exercise_movement_patterns: catalog.exercises.flatMap((exercise) => (
      exercise.movementPatternIds.map((movementPatternId, index) => ({
        exercise_id: exercise.id,
        movement_pattern_id: movementPatternId,
        sort_order: index + 1,
      }))
    )),
    exercise_workout_types: catalog.exercises.flatMap((exercise) => (
      exercise.workoutTypeIds.map((workoutTypeId) => ({ exercise_id: exercise.id, workout_type_id: workoutTypeId }))
    )),
    exercise_training_goals: catalog.exercises.flatMap((exercise) => (
      exercise.goalIds.map((trainingGoalId) => ({ exercise_id: exercise.id, training_goal_id: trainingGoalId }))
    )),
    exercise_tracking_metrics: catalog.exercises.flatMap((exercise) => (
      exercise.trackingMetricIds.map((trackingMetricId) => ({ exercise_id: exercise.id, tracking_metric_id: trackingMetricId }))
    )),
    tracking_metrics: ordered(catalog.trackingMetrics),
    assessment_metrics: ordered(catalog.assessmentMetrics),
    prescription_templates: catalog.prescriptionTemplates.map((template) => ({
      id: template.id,
      label: template.label,
      applies_to_workout_type_ids: template.appliesToWorkoutTypeIds,
      default_sets: template.defaultSets ?? null,
      default_reps: template.defaultReps ?? null,
      default_duration_seconds: template.defaultDurationSeconds ?? null,
      default_duration_minutes: template.defaultDurationMinutes ?? null,
      default_rpe: template.defaultRpe,
      rest_seconds: template.restSeconds,
      tempo: template.tempo ?? null,
      intensity_cue: template.intensityCue,
    })),
    session_templates: catalog.sessionTemplates.map((template) => ({
      id: template.id,
      label: template.label,
      summary: template.summary,
      workout_type_id: template.workoutTypeId,
      format_id: template.formatId,
      min_duration_minutes: template.minDurationMinutes,
      default_duration_minutes: template.defaultDurationMinutes,
      max_duration_minutes: template.maxDurationMinutes,
      experience_levels: template.experienceLevels,
      success_criteria: template.successCriteria,
    })),
    session_template_goals: catalog.sessionTemplates.flatMap((template) => (
      template.goalIds.map((goalId) => ({ session_template_id: template.id, training_goal_id: goalId }))
    )),
    session_template_blocks: catalog.sessionTemplates.flatMap((template) => (
      template.blocks.map((block, index) => ({
        id: `${template.id}:${block.id}`,
        session_template_id: template.id,
        kind: block.kind,
        title: block.title,
        duration_minutes: block.durationMinutes,
        prescription_template_id: block.prescriptionTemplateId,
        sort_order: index + 1,
      }))
    )),
    session_template_movement_slots: catalog.sessionTemplates.flatMap((template) => (
      template.movementSlots.map((slot, index) => ({
        id: `${template.id}:${slot.id}`,
        session_template_id: template.id,
        block_id: `${template.id}:${slot.blockId}`,
        movement_pattern_ids: slot.movementPatternIds,
        optional: slot.optional,
        preferred_exercise_ids: slot.preferredExerciseIds ?? [],
        avoid_exercise_ids: slot.avoidExerciseIds ?? [],
        sort_order: index + 1,
      }))
    )),
  };
}
