import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  GENERATED_WORKOUT_SAFETY_COPY,
  templateIdForBoxingFamily,
  generatedWorkoutSafetyReminder,
  supportDomainLabel,
  type BoxingAthleteSupportDomain,
  type BoxingPlannedSessionRole,
  type BoxingSessionDoseCategory,
  type BoxingSessionFamily,
  type BoxingTrainingContext,
  type GeneratedWorkout,
  type GeneratedWorkoutSessionExerciseCompletionInput,
  type GeneratedWorkoutSessionLifecycleStatus,
  type ProgressionDecision,
  type WorkoutReadinessBand,
} from '../../../lib/performance-engine/workout-programming';
import { Card } from '../Card';
import { COLORS, FONT_FAMILY, RADIUS, SPACING } from '../../theme/theme';
import { GeneratedWorkoutPreviewCard } from './GeneratedWorkoutPreviewCard';

export interface BoxingGeneratedWorkoutConfig {
  goalId: string;
  durationMinutes: number;
  equipmentIds: string[];
  readinessBand: WorkoutReadinessBand;
  intendedBoxingSessionFamily: BoxingSessionFamily;
  intendedBoxingSessionRole: BoxingPlannedSessionRole;
  intendedSessionDoseCategory: BoxingSessionDoseCategory;
  athleticDevelopmentDomain: BoxingAthleteSupportDomain;
  preferredSessionTemplateId: string;
  boxingTrainingContext?: BoxingTrainingContext;
}

export type BoxingGeneratedWorkoutStage = 'configure' | 'inspect' | 'started' | 'completed';

export interface BoxingGeneratedWorkoutCompletionDraft {
  sessionRpe: number;
  painScoreBefore: number;
  painScoreAfter: number;
  rating: number;
  notes: string;
  completionStatus: 'completed' | 'partial' | 'stopped';
  completedExerciseIds: string[];
  exerciseResults: GeneratedWorkoutSessionExerciseCompletionInput[];
  substitutionsUsed: string[];
  feedbackTags: string[];
  likedExerciseIds: string[];
  dislikedExerciseIds: string[];
}

interface ExerciseLogDraft {
  setsCompleted: string;
  repsCompleted: string;
  durationMinutesCompleted: string;
  durationSecondsCompleted: string;
}

interface BoxingGeneratedWorkoutSessionCardProps {
  userAuthenticated: boolean;
  stage: BoxingGeneratedWorkoutStage;
  workout: GeneratedWorkout | null;
  generatedWorkoutId: string | null;
  persisted: boolean;
  startedAt: string | null;
  lifecycleStatus?: GeneratedWorkoutSessionLifecycleStatus | null;
  lifecycleMessage?: string | null;
  loading: boolean;
  completing: boolean;
  error: string | null;
  progressionDecision: ProgressionDecision | null;
  defaultReadinessBand: WorkoutReadinessBand;
  onGenerate: (config: BoxingGeneratedWorkoutConfig) => void;
  onStart: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onAbandon?: () => void;
  onComplete: (draft: BoxingGeneratedWorkoutCompletionDraft) => void;
  onReset: () => void;
  mode?: 'configure' | 'executeOnly';
}

export interface BoxingGeneratedWorkoutOption {
  id: string;
  label: string;
  group: 'Skill Support' | 'Strength & Power' | 'Conditioning & Roadwork' | 'Durability' | 'Mobility & Recovery';
  supportKind: 'skill_support' | 's_and_c_support' | 'roadwork' | 'conditioning' | 'durability' | 'mobility' | 'recovery';
  goalId: string;
  athleticDevelopmentDomain: BoxingAthleteSupportDomain;
  intendedBoxingSessionFamily: BoxingSessionFamily;
  intendedBoxingSessionRole: BoxingPlannedSessionRole;
  intendedSessionDoseCategory: BoxingSessionDoseCategory;
  preferredSessionTemplateId: string;
  defaultDurationMinutes: number;
  minDurationMinutes: number;
  maxDurationMinutes: number;
  defaultEquipmentIds: string[];
  minExperience: 'beginner' | 'intermediate' | 'advanced';
  blockedReadinessBands: WorkoutReadinessBand[];
  rationale: string;
}

const BOXING_GENERATED_WORKOUT_OPTION_DEFS: Array<Omit<BoxingGeneratedWorkoutOption, 'group' | 'supportKind' | 'athleticDevelopmentDomain'>> = [
  {
    id: 'boxing_skill_microdose',
    label: 'Boxing skill microdose',
    goalId: 'boxing_skill_microdose',
    intendedBoxingSessionFamily: 'boxing_skill_microdose',
    intendedBoxingSessionRole: 'boxing_skill_microdose',
    intendedSessionDoseCategory: 'microdose',
    preferredSessionTemplateId: templateIdForBoxingFamily('boxing_skill_microdose'),
    defaultDurationMinutes: 15,
    minDurationMinutes: 10,
    maxDurationMinutes: 25,
    defaultEquipmentIds: ['bodyweight', 'open_space'],
    minExperience: 'beginner',
    blockedReadinessBands: [],
    rationale: 'A short technical touch that adds skill quality without loading the week hard.',
  },
  {
    id: 'footwork_agility',
    label: 'Footwork agility',
    goalId: 'footwork_agility',
    intendedBoxingSessionFamily: 'footwork_agility',
    intendedBoxingSessionRole: 'footwork_agility',
    intendedSessionDoseCategory: 'support_session',
    preferredSessionTemplateId: templateIdForBoxingFamily('footwork_agility'),
    defaultDurationMinutes: 25,
    minDurationMinutes: 15,
    maxDurationMinutes: 40,
    defaultEquipmentIds: ['bodyweight', 'open_space'],
    minExperience: 'beginner',
    blockedReadinessBands: [],
    rationale: 'Builds stance, rhythm, and position changes without pretending external sport load is boxing skill.',
  },
  {
    id: 'shadowboxing_quality',
    label: 'Shadowboxing quality',
    goalId: 'shadowboxing_quality',
    intendedBoxingSessionFamily: 'shadowboxing_quality',
    intendedBoxingSessionRole: 'boxing_technical_practice',
    intendedSessionDoseCategory: 'support_session',
    preferredSessionTemplateId: templateIdForBoxingFamily('shadowboxing_quality'),
    defaultDurationMinutes: 25,
    minDurationMinutes: 15,
    maxDurationMinutes: 40,
    defaultEquipmentIds: ['bodyweight', 'open_space'],
    minExperience: 'beginner',
    blockedReadinessBands: [],
    rationale: 'Keeps boxing intent high while controlling fatigue, volume, and impact.',
  },
  {
    id: 'roadwork_base',
    label: 'Roadwork base',
    goalId: 'roadwork_aerobic_base',
    intendedBoxingSessionFamily: 'roadwork_zone2',
    intendedBoxingSessionRole: 'roadwork_aerobic_base',
    intendedSessionDoseCategory: 'support_session',
    preferredSessionTemplateId: templateIdForBoxingFamily('roadwork_zone2'),
    defaultDurationMinutes: 35,
    minDurationMinutes: 20,
    maxDurationMinutes: 55,
    defaultEquipmentIds: ['track_or_road'],
    minExperience: 'beginner',
    blockedReadinessBands: ['red'],
    rationale: 'Adds aerobic base that supports rounds and recovery between boxing days.',
  },
  {
    id: 'roadwork_tempo',
    label: 'Roadwork tempo',
    goalId: 'roadwork_tempo',
    intendedBoxingSessionFamily: 'roadwork_tempo',
    intendedBoxingSessionRole: 'roadwork_tempo',
    intendedSessionDoseCategory: 'support_session',
    preferredSessionTemplateId: templateIdForBoxingFamily('roadwork_tempo'),
    defaultDurationMinutes: 30,
    minDurationMinutes: 20,
    maxDurationMinutes: 45,
    defaultEquipmentIds: ['track_or_road'],
    minExperience: 'intermediate',
    blockedReadinessBands: ['orange', 'red'],
    rationale: 'Builds controlled pressure without stacking another hard boxing day.',
  },
  {
    id: 'roadwork_intervals',
    label: 'Roadwork intervals',
    goalId: 'roadwork_intervals',
    intendedBoxingSessionFamily: 'roadwork_intervals',
    intendedBoxingSessionRole: 'roadwork_intervals',
    intendedSessionDoseCategory: 'support_session',
    preferredSessionTemplateId: templateIdForBoxingFamily('roadwork_intervals'),
    defaultDurationMinutes: 28,
    minDurationMinutes: 18,
    maxDurationMinutes: 40,
    defaultEquipmentIds: ['track_or_road'],
    minExperience: 'intermediate',
    blockedReadinessBands: ['orange', 'red'],
    rationale: 'Adds repeatability only when readiness can absorb it.',
  },
  {
    id: 'alactic_repeat_power',
    label: 'Alactic repeat power',
    goalId: 'alactic_repeat_power',
    intendedBoxingSessionFamily: 'alactic_repeat_power',
    intendedBoxingSessionRole: 'alactic_repeat_power',
    intendedSessionDoseCategory: 'support_session',
    preferredSessionTemplateId: templateIdForBoxingFamily('alactic_repeat_power'),
    defaultDurationMinutes: 25,
    minDurationMinutes: 15,
    maxDurationMinutes: 35,
    defaultEquipmentIds: ['bodyweight', 'open_space'],
    minExperience: 'intermediate',
    blockedReadinessBands: ['orange', 'red'],
    rationale: 'Small explosive repeat doses for boxing speed without generating sparring.',
  },
  {
    id: 'round_tolerance',
    label: 'Round tolerance',
    goalId: 'glycolytic_round_tolerance',
    intendedBoxingSessionFamily: 'glycolytic_round_tolerance',
    intendedBoxingSessionRole: 'glycolytic_round_tolerance',
    intendedSessionDoseCategory: 'support_session',
    preferredSessionTemplateId: templateIdForBoxingFamily('glycolytic_round_tolerance'),
    defaultDurationMinutes: 30,
    minDurationMinutes: 20,
    maxDurationMinutes: 40,
    defaultEquipmentIds: ['bodyweight', 'open_space'],
    minExperience: 'intermediate',
    blockedReadinessBands: ['orange', 'red'],
    rationale: 'Rounds-style conditioning for tolerance, capped by readiness and weekly hard-day load.',
  },
  {
    id: 'rotational_power',
    label: 'Rotational power',
    goalId: 'rotational_power',
    intendedBoxingSessionFamily: 'rotational_power',
    intendedBoxingSessionRole: 'rotational_power',
    intendedSessionDoseCategory: 'support_session',
    preferredSessionTemplateId: templateIdForBoxingFamily('rotational_power'),
    defaultDurationMinutes: 30,
    minDurationMinutes: 20,
    maxDurationMinutes: 45,
    defaultEquipmentIds: ['medicine_ball', 'open_space'],
    minExperience: 'beginner',
    blockedReadinessBands: ['red'],
    rationale: 'Links hips, trunk, and punch mechanics with controlled power work.',
  },
  {
    id: 'strength_power',
    label: 'Strength-power',
    goalId: 'boxing_support',
    intendedBoxingSessionFamily: 'strength_power',
    intendedBoxingSessionRole: 'strength_power',
    intendedSessionDoseCategory: 'full_session',
    preferredSessionTemplateId: templateIdForBoxingFamily('strength_power'),
    defaultDurationMinutes: 40,
    minDurationMinutes: 25,
    maxDurationMinutes: 60,
    defaultEquipmentIds: ['dumbbell', 'resistance_band', 'mat'],
    minExperience: 'beginner',
    blockedReadinessBands: ['red'],
    rationale: 'Strength & conditioning support that builds force capacity around boxing anchors.',
  },
  {
    id: 'lower_body_strength',
    label: 'Lower-body strength',
    goalId: 'lower_body_strength',
    intendedBoxingSessionFamily: 'max_strength_lower',
    intendedBoxingSessionRole: 'max_strength_lower',
    intendedSessionDoseCategory: 'full_session',
    preferredSessionTemplateId: templateIdForBoxingFamily('max_strength_lower'),
    defaultDurationMinutes: 40,
    minDurationMinutes: 25,
    maxDurationMinutes: 60,
    defaultEquipmentIds: ['dumbbell', 'resistance_band', 'mat'],
    minExperience: 'beginner',
    blockedReadinessBands: ['red'],
    rationale: 'Builds stance, pressure, and late-round legs without adding more boxing practice.',
  },
  {
    id: 'explosive_power',
    label: 'Explosive power',
    goalId: 'explosive_power',
    intendedBoxingSessionFamily: 'explosive_power',
    intendedBoxingSessionRole: 'explosive_power',
    intendedSessionDoseCategory: 'support_session',
    preferredSessionTemplateId: templateIdForBoxingFamily('explosive_power'),
    defaultDurationMinutes: 30,
    minDurationMinutes: 20,
    maxDurationMinutes: 45,
    defaultEquipmentIds: ['medicine_ball', 'open_space'],
    minExperience: 'beginner',
    blockedReadinessBands: ['orange', 'red'],
    rationale: 'Fast intent work for boxing power qualities without contact or sparring.',
  },
  {
    id: 'trunk_durability',
    label: 'Trunk durability',
    goalId: 'trunk_rotation_durability',
    intendedBoxingSessionFamily: 'trunk_durability',
    intendedBoxingSessionRole: 'trunk_rotation_durability',
    intendedSessionDoseCategory: 'support_session',
    preferredSessionTemplateId: templateIdForBoxingFamily('trunk_durability'),
    defaultDurationMinutes: 25,
    minDurationMinutes: 15,
    maxDurationMinutes: 35,
    defaultEquipmentIds: ['bodyweight', 'mat'],
    minExperience: 'beginner',
    blockedReadinessBands: [],
    rationale: 'Builds trunk control for punching, bracing, and fatigue resistance.',
  },
  {
    id: 'shoulder_durability',
    label: 'Shoulder durability',
    goalId: 'shoulder_scap_durability',
    intendedBoxingSessionFamily: 'shoulder_scap_durability',
    intendedBoxingSessionRole: 'shoulder_scap_durability',
    intendedSessionDoseCategory: 'support_session',
    preferredSessionTemplateId: templateIdForBoxingFamily('shoulder_scap_durability'),
    defaultDurationMinutes: 22,
    minDurationMinutes: 12,
    maxDurationMinutes: 35,
    defaultEquipmentIds: ['resistance_band', 'mat'],
    minExperience: 'beginner',
    blockedReadinessBands: [],
    rationale: 'Supports punch volume and guard durability while respecting pain changes.',
  },
  {
    id: 'neck_trap_durability',
    label: 'Neck/trap durability',
    goalId: 'neck_trap_durability',
    intendedBoxingSessionFamily: 'neck_trap_durability',
    intendedBoxingSessionRole: 'neck_trap_durability',
    intendedSessionDoseCategory: 'support_session',
    preferredSessionTemplateId: templateIdForBoxingFamily('neck_trap_durability'),
    defaultDurationMinutes: 18,
    minDurationMinutes: 10,
    maxDurationMinutes: 30,
    defaultEquipmentIds: ['bodyweight', 'mat'],
    minExperience: 'beginner',
    blockedReadinessBands: [],
    rationale: 'A conservative neck and upper-back support dose for boxing posture and contact tolerance.',
  },
  {
    id: 'hip_ankle_mobility',
    label: 'Hip/ankle mobility',
    goalId: 'hip_ankle_mobility',
    intendedBoxingSessionFamily: 'hip_ankle_mobility',
    intendedBoxingSessionRole: 'hip_footwork_durability',
    intendedSessionDoseCategory: 'support_session',
    preferredSessionTemplateId: templateIdForBoxingFamily('hip_ankle_mobility'),
    defaultDurationMinutes: 20,
    minDurationMinutes: 10,
    maxDurationMinutes: 30,
    defaultEquipmentIds: ['bodyweight', 'mat'],
    minExperience: 'beginner',
    blockedReadinessBands: [],
    rationale: 'Keeps stance, pivots, and footwork range available without extra fatigue.',
  },
  {
    id: 'recovery_reset',
    label: 'Recovery reset',
    goalId: 'recovery_reset',
    intendedBoxingSessionFamily: 'recovery_reset',
    intendedBoxingSessionRole: 'recovery_reset',
    intendedSessionDoseCategory: 'recovery_reset',
    preferredSessionTemplateId: templateIdForBoxingFamily('recovery_reset'),
    defaultDurationMinutes: 20,
    minDurationMinutes: 10,
    maxDurationMinutes: 30,
    defaultEquipmentIds: ['bodyweight', 'mat'],
    minExperience: 'beginner',
    blockedReadinessBands: [],
    rationale: 'Downshifts the day when readiness, pain, or missed work says the smarter move is recovery.',
  },
  {
    id: 'mobility_prehab',
    label: 'Mobility/prehab',
    goalId: 'hip_ankle_mobility',
    intendedBoxingSessionFamily: 'mobility_prehab',
    intendedBoxingSessionRole: 'mobility_prehab',
    intendedSessionDoseCategory: 'support_session',
    preferredSessionTemplateId: templateIdForBoxingFamily('mobility_prehab'),
    defaultDurationMinutes: 20,
    minDurationMinutes: 10,
    maxDurationMinutes: 30,
    defaultEquipmentIds: ['bodyweight', 'mat', 'resistance_band'],
    minExperience: 'beginner',
    blockedReadinessBands: [],
    rationale: 'Low-load mobility and prehab support for the hips, ankles, shoulders, and trunk boxing uses.',
  },
];
function optionDomain(family: BoxingSessionFamily): BoxingAthleteSupportDomain {
  if (family === 'boxing_skill_microdose' || family === 'shadowboxing_quality' || family === 'bag_pad_support') return 'boxing_skill_support';
  if (family === 'footwork_agility' || family === 'reaction_rhythm') return 'speed_agility';
  if (family === 'max_strength_lower' || family === 'strength_power') return 'strength';
  if (family === 'explosive_power' || family === 'rotational_power') return 'power';
  if (family === 'roadwork_zone2' || family === 'roadwork_tempo') return 'roadwork';
  if (family === 'roadwork_intervals' || family === 'alactic_repeat_power' || family === 'glycolytic_round_tolerance' || family === 'boxing_conditioning_support') return 'conditioning';
  if (family === 'trunk_durability' || family === 'shoulder_scap_durability' || family === 'neck_trap_durability') return 'durability';
  if (family === 'hip_ankle_mobility' || family === 'mobility_prehab') return 'mobility';
  return 'recovery';
}

function optionGroup(domain: BoxingAthleteSupportDomain, family: BoxingSessionFamily): BoxingGeneratedWorkoutOption['group'] {
  if (domain === 'boxing_skill_support' || family === 'footwork_agility') return 'Skill Support';
  if (domain === 'strength' || domain === 'power') return 'Strength & Power';
  if (domain === 'roadwork' || domain === 'conditioning') return 'Conditioning & Roadwork';
  if (domain === 'durability') return 'Durability';
  return 'Mobility & Recovery';
}

function optionSupportKind(domain: BoxingAthleteSupportDomain, family: BoxingSessionFamily): BoxingGeneratedWorkoutOption['supportKind'] {
  if (domain === 'boxing_skill_support' || family === 'footwork_agility') return 'skill_support';
  if (domain === 'roadwork') return 'roadwork';
  if (domain === 'conditioning') return 'conditioning';
  if (domain === 'durability') return 'durability';
  if (domain === 'mobility') return 'mobility';
  if (domain === 'recovery') return 'recovery';
  return 's_and_c_support';
}

export const BOXING_GENERATED_WORKOUT_OPTIONS: BoxingGeneratedWorkoutOption[] = BOXING_GENERATED_WORKOUT_OPTION_DEFS.map((option) => {
  const athleticDevelopmentDomain = optionDomain(option.intendedBoxingSessionFamily);
  return {
    ...option,
    athleticDevelopmentDomain,
    group: optionGroup(athleticDevelopmentDomain, option.intendedBoxingSessionFamily),
    supportKind: optionSupportKind(athleticDevelopmentDomain, option.intendedBoxingSessionFamily),
  };
});
const DEFAULT_BOXING_GENERATED_WORKOUT_OPTION = BOXING_GENERATED_WORKOUT_OPTIONS[0] as BoxingGeneratedWorkoutOption;

const EQUIPMENT_OPTIONS = [
  { id: 'bodyweight', label: 'Bodyweight' },
  { id: 'open_space', label: 'Open space' },
  { id: 'track_or_road', label: 'Road/track' },
  { id: 'mat', label: 'Mat' },
  { id: 'resistance_band', label: 'Band' },
  { id: 'dumbbell', label: 'Dumbbell' },
  { id: 'medicine_ball', label: 'Med ball' },
] as const;
const READINESS_OPTIONS: WorkoutReadinessBand[] = ['green', 'yellow', 'orange', 'red', 'unknown'];
const FEEDBACK_OPTIONS = [
  { id: 'too_easy', label: 'Too easy' },
  { id: 'good_fit', label: 'Right' },
  { id: 'too_hard', label: 'Too hard' },
  { id: 'pain', label: 'Pain or discomfort' },
  { id: 'time_fit', label: 'Time fit' },
] as const;
const BOXING_GENERATED_WORKOUT_STAGES: BoxingGeneratedWorkoutStage[] = ['configure', 'inspect', 'started', 'completed'];
const OPTION_GROUP_ORDER: BoxingGeneratedWorkoutOption['group'][] = [
  'Skill Support',
  'Strength & Power',
  'Conditioning & Roadwork',
  'Durability',
  'Mobility & Recovery',
];

function labelize(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function stageLabel(stage: BoxingGeneratedWorkoutStage): string {
  if (stage === 'configure') return 'Build';
  if (stage === 'inspect') return 'Review';
  if (stage === 'started') return 'Complete';
  return 'Next step';
}

function stageHelp(stage: BoxingGeneratedWorkoutStage): string {
  if (stage === 'configure') return 'Choose extra support only when it helps the week. Planned sessions open from Today and Train.';
  if (stage === 'inspect') return 'Review the session before starting. Use substitutions or scaling if needed.';
  if (stage === 'started') return 'Check off work as you finish it, then log effort, pain, feedback, and notes.';
  return 'Review the next step before the next support session.';
}

function workoutSafetyLine(workout: GeneratedWorkout | null): string {
  if (!workout) return GENERATED_WORKOUT_SAFETY_COPY.user.noGeneratedWorkoutYet;
  if (workout.blocked) return GENERATED_WORKOUT_SAFETY_COPY.user.sessionBlockedBySafetyReview;
  if (workout.validation && !workout.validation.isValid) return GENERATED_WORKOUT_SAFETY_COPY.user.validationReviewBeforeStart;
  if (workout.safetyFlags.length > 0 || (workout.safetyNotes?.length ?? 0) > 0) return GENERATED_WORKOUT_SAFETY_COPY.user.safetyGuardrailsActive;
  return GENERATED_WORKOUT_SAFETY_COPY.user.noExtraSafetyFlag;
}

function prescribedLine(exercise: GeneratedWorkout['blocks'][number]['exercises'][number]): string {
  const parts = [
    exercise.prescription.sets != null ? `${exercise.prescription.sets} sets` : null,
    exercise.prescription.reps ? `${exercise.prescription.reps} reps` : null,
    exercise.prescription.durationMinutes != null ? `${exercise.prescription.durationMinutes} min` : null,
    exercise.prescription.durationSeconds != null ? `${exercise.prescription.durationSeconds}s` : null,
  ].filter(Boolean);
  return parts.join('  |  ') || 'Complete as coached';
}

function plannedRepsValue(reps: string | null): number | null {
  if (!reps) return null;
  const matches = reps.match(/\d+/g);
  if (!matches || matches.length === 0) return null;
  return Number(matches[matches.length - 1]);
}

function numberOrNull(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanNumberInput(value: string): string {
  return value.replace(/[^\d.]/g, '');
}

function defaultExerciseLog(
  exercise: GeneratedWorkout['blocks'][number]['exercises'][number],
  completed: boolean,
): ExerciseLogDraft {
  return {
    setsCompleted: completed && exercise.prescription.sets != null ? String(exercise.prescription.sets) : '',
    repsCompleted: completed && plannedRepsValue(exercise.prescription.reps) != null ? String(plannedRepsValue(exercise.prescription.reps)) : '',
    durationMinutesCompleted: completed && exercise.prescription.durationMinutes != null ? String(exercise.prescription.durationMinutes) : '',
    durationSecondsCompleted: completed && exercise.prescription.durationSeconds != null ? String(exercise.prescription.durationSeconds) : '',
  };
}

function ToggleChip({
  label,
  selected,
  onPress,
  disabled,
  accessibilityLabel,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `${selected ? 'Selected' : 'Select'} ${label}`}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      style={[styles.chip, selected && styles.chipSelected, disabled && styles.chipDisabled]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (nextValue: number) => void;
}) {
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          accessibilityValue={{ min, max, now: value }}
          style={styles.stepperButton}
          onPress={() => onChange(Math.max(min, value - 1))}
        >
          <Text style={styles.stepperButtonText}>-</Text>
        </Pressable>
        <Text style={styles.stepperValue}>{value}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          accessibilityValue={{ min, max, now: value }}
          style={styles.stepperButton}
          onPress={() => onChange(Math.min(max, value + 1))}
        >
          <Text style={styles.stepperButtonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function NumericLogInput({
  label,
  accessibilityLabel,
  value,
  onChangeText,
  editable,
}: {
  label: string;
  accessibilityLabel?: string;
  value: string;
  onChangeText: (value: string) => void;
  editable: boolean;
}) {
  return (
    <View style={styles.logInputGroup}>
      <Text style={styles.logInputLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={accessibilityLabel ?? label}
        editable={editable}
        keyboardType="numeric"
        style={[styles.logInput, !editable && styles.logInputDisabled]}
        value={value}
        onChangeText={(nextValue) => onChangeText(cleanNumberInput(nextValue))}
        placeholder="-"
        placeholderTextColor={COLORS.text.tertiary}
      />
    </View>
  );
}

export function BoxingGeneratedWorkoutSessionCard({
  userAuthenticated,
  stage,
  workout,
  generatedWorkoutId,
  persisted,
  startedAt,
  lifecycleStatus,
  lifecycleMessage,
  loading,
  completing,
  error,
  progressionDecision,
  defaultReadinessBand,
  onGenerate,
  onStart,
  onPause,
  onResume,
  onAbandon,
  onComplete,
  onReset,
  mode = 'configure',
}: BoxingGeneratedWorkoutSessionCardProps) {
  const [optionId, setOptionId] = useState(DEFAULT_BOXING_GENERATED_WORKOUT_OPTION.id);
  const selectedOption = useMemo(
    () => BOXING_GENERATED_WORKOUT_OPTIONS.find((option) => option.id === optionId) ?? DEFAULT_BOXING_GENERATED_WORKOUT_OPTION,
    [optionId],
  );
  const [durationMinutes, setDurationMinutes] = useState(selectedOption.defaultDurationMinutes);
  const [equipmentIds, setEquipmentIds] = useState<string[]>(selectedOption.defaultEquipmentIds);
  const [readinessBand, setReadinessBand] = useState<WorkoutReadinessBand>(defaultReadinessBand);
  const [sessionRpe, setSessionRpe] = useState(6);
  const [painScoreBefore, setPainScoreBefore] = useState(0);
  const [painScoreAfter, setPainScoreAfter] = useState(0);
  const [rating, setRating] = useState(4);
  const [notes, setNotes] = useState('');
  const [completionStatus, setCompletionStatus] = useState<'completed' | 'partial' | 'stopped'>('completed');
  const [completedExerciseIds, setCompletedExerciseIds] = useState<string[]>([]);
  const [substitutionsUsed, setSubstitutionsUsed] = useState<string[]>([]);
  const [feedbackTags, setFeedbackTags] = useState<string[]>([]);
  const [likedExerciseIds, setLikedExerciseIds] = useState<string[]>([]);
  const [dislikedExerciseIds, setDislikedExerciseIds] = useState<string[]>([]);
  const [exerciseLogs, setExerciseLogs] = useState<Record<string, ExerciseLogDraft>>({});

  const allExercises = useMemo(() => workout?.blocks.flatMap((block) => block.exercises) ?? [], [workout]);
  const completedExerciseCount = completedExerciseIds.length;
  const totalExerciseCount = allExercises.length;
  const allExercisesComplete = totalExerciseCount > 0 && completedExerciseCount === totalExerciseCount;
  const currentStageIndex = BOXING_GENERATED_WORKOUT_STAGES.indexOf(stage);
  const sessionPaused = lifecycleStatus === 'paused';
  const readinessBlocked = selectedOption.blockedReadinessBands.includes(readinessBand);
  const cardTitle = mode === 'executeOnly' ? 'Athleticore support session' : 'Build support session';
  const cardSubtitle = mode === 'executeOnly'
    ? 'Weekly support execution from today\'s plan.'
    : userAuthenticated
      ? 'Use this only when you need extra support outside the planned week.'
      : 'Sign in to save extra support completions and progression.';
  const durationOptions = useMemo(() => {
    const values = [
      selectedOption.minDurationMinutes,
      selectedOption.defaultDurationMinutes,
      selectedOption.maxDurationMinutes,
      durationMinutes,
    ];
    return Array.from(new Set(values))
      .filter((value) => value >= selectedOption.minDurationMinutes && value <= selectedOption.maxDurationMinutes)
      .sort((a, b) => a - b);
  }, [durationMinutes, selectedOption]);

  function toggleListValue(value: string, values: string[], setter: (next: string[]) => void) {
    setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }

  function toggleEquipment(id: string) {
    const next = equipmentIds.includes(id) ? equipmentIds.filter((item) => item !== id) : [...equipmentIds, id];
    setEquipmentIds(next.length > 0 ? next : ['bodyweight']);
  }

  function selectOption(option: BoxingGeneratedWorkoutOption) {
    setOptionId(option.id);
    setDurationMinutes(option.defaultDurationMinutes);
    setEquipmentIds(option.defaultEquipmentIds);
  }

  function exerciseLogFor(exercise: GeneratedWorkout['blocks'][number]['exercises'][number], completed: boolean) {
    return {
      ...defaultExerciseLog(exercise, completed),
      ...(exerciseLogs[exercise.exerciseId] ?? {}),
    };
  }

  function updateExerciseLog(
    exercise: GeneratedWorkout['blocks'][number]['exercises'][number],
    completed: boolean,
    field: keyof ExerciseLogDraft,
    value: string,
  ) {
    const current = exerciseLogFor(exercise, completed);
    setExerciseLogs((previous) => ({
      ...previous,
      [exercise.exerciseId]: {
        ...current,
        [field]: value,
      },
    }));
  }

  function submitGenerate() {
    if (readinessBlocked) return;
    setCompletedExerciseIds([]);
    setSubstitutionsUsed([]);
    setFeedbackTags([]);
    setLikedExerciseIds([]);
    setDislikedExerciseIds([]);
    setExerciseLogs({});
    setSessionRpe(6);
    setPainScoreBefore(0);
    setPainScoreAfter(0);
    setRating(4);
    setCompletionStatus('completed');
    setNotes('');
    onGenerate({
      goalId: selectedOption.goalId,
      durationMinutes,
      equipmentIds,
      readinessBand,
      intendedBoxingSessionFamily: selectedOption.intendedBoxingSessionFamily,
      intendedBoxingSessionRole: selectedOption.intendedBoxingSessionRole,
      intendedSessionDoseCategory: selectedOption.intendedSessionDoseCategory,
      athleticDevelopmentDomain: selectedOption.athleticDevelopmentDomain,
      preferredSessionTemplateId: selectedOption.preferredSessionTemplateId,
      boxingTrainingContext: { track: 'aspiring_boxer' },
    });
  }

  function toggleAllExercisesComplete() {
    setCompletedExerciseIds(allExercisesComplete ? [] : allExercises.map((exercise) => exercise.exerciseId));
  }

  function submitComplete() {
    const exerciseResults = allExercises.map((exercise) => {
      const completed = completedExerciseIds.includes(exercise.exerciseId);
      const log = exerciseLogFor(exercise, completed);
      return {
        exerciseId: exercise.exerciseId,
        setsCompleted: numberOrNull(log.setsCompleted),
        repsCompleted: numberOrNull(log.repsCompleted),
        durationMinutesCompleted: numberOrNull(log.durationMinutesCompleted),
        durationSecondsCompleted: numberOrNull(log.durationSecondsCompleted),
        actualRpe: completed ? sessionRpe : null,
        painScore: painScoreAfter,
        completedAsPrescribed: completed,
      };
    });
    onComplete({
      sessionRpe,
      painScoreBefore,
      painScoreAfter,
      rating,
      notes,
      completionStatus,
      completedExerciseIds,
      exerciseResults,
      substitutionsUsed,
      feedbackTags,
      likedExerciseIds,
      dislikedExerciseIds,
    });
  }

  return (
    <View testID="boxing-generated-workout-card" style={styles.stack}>
      <Card
        title={cardTitle}
        subtitle={cardSubtitle}
        subtitleLines={2}
        backgroundTone="workoutFloor"
        backgroundScrimColor="rgba(10, 10, 10, 0.72)"
        style={styles.card}
      >
        <View testID="boxing-generated-workout-stage-row" style={styles.stageRow}>
          {BOXING_GENERATED_WORKOUT_STAGES.map((item, index) => {
            const active = index === currentStageIndex;
            const complete = index < currentStageIndex;
            return (
              <View
                key={item}
                accessible
                accessibilityLabel={`${stageLabel(item)} step, ${active ? 'current' : complete ? 'complete' : 'upcoming'}`}
                style={[styles.stagePill, active && styles.stagePillActive, complete && styles.stagePillComplete]}
              >
                <Text style={[styles.stagePillText, active && styles.stagePillTextActive]}>{stageLabel(item)}</Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.stageHelp}>{stageHelp(stage)}</Text>

        {mode === 'configure' ? (
          <>
        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionLabel}>Athlete development</Text>
          <Text style={styles.sectionHint}>Use this for explicit extra support only. Sparring and coach-led boxing practice are protected anchors, not built here.</Text>
          {OPTION_GROUP_ORDER.map((group) => {
            const groupOptions = BOXING_GENERATED_WORKOUT_OPTIONS.filter((option) => option.group === group);
            return (
              <View key={group} style={styles.optionGroup}>
                <Text style={styles.optionGroupLabel}>{group}</Text>
                <View style={styles.chipRow}>
                  {groupOptions.map((option) => (
                    <ToggleChip key={option.id} label={option.label} selected={optionId === option.id} onPress={() => selectOption(option)} disabled={loading || completing} />
                  ))}
                </View>
              </View>
            );
          })}
          <Text style={styles.sectionHint}>{supportDomainLabel(selectedOption.athleticDevelopmentDomain)}: {selectedOption.rationale}</Text>
        </View>

        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionLabel}>Duration</Text>
          <View style={styles.chipRow}>
            {durationOptions.map((duration) => (
              <ToggleChip key={duration} label={`${duration} min`} selected={durationMinutes === duration} onPress={() => setDurationMinutes(duration)} disabled={loading || completing} />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionLabel}>Equipment</Text>
          <View style={styles.chipRow}>
            {EQUIPMENT_OPTIONS.map((equipment) => (
              <ToggleChip key={equipment.id} label={equipment.label} selected={equipmentIds.includes(equipment.id)} onPress={() => toggleEquipment(equipment.id)} disabled={loading || completing} />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionLabel}>Readiness</Text>
          <View style={styles.chipRow}>
            {READINESS_OPTIONS.map((readiness) => (
              <ToggleChip key={readiness} label={labelize(readiness)} selected={readinessBand === readiness} onPress={() => setReadinessBand(readiness)} disabled={loading || completing} />
            ))}
          </View>
        </View>
          </>
        ) : null}

        {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
        {readinessBlocked && mode === 'configure' ? (
          <Text accessibilityRole="alert" style={styles.errorText}>
            Choose recovery reset or a low-dose skill support option today. This support session is not a good fit for {labelize(readinessBand)} readiness.
          </Text>
        ) : null}
        <Text style={styles.safetyReminder}>{generatedWorkoutSafetyReminder()}</Text>

        {mode === 'configure' ? (
        <View style={styles.actionRow}>
          <Pressable
            testID="boxing-generated-workout-generate"
            accessibilityRole="button"
            accessibilityLabel={loading ? 'Building support session' : workout ? 'Rebuild support session' : 'Build support session'}
            style={[styles.primaryButton, (loading || readinessBlocked) && styles.disabledButton]}
            disabled={loading || completing || readinessBlocked}
            onPress={submitGenerate}
          >
            <Text style={styles.primaryButtonText}>{loading ? 'Building session...' : workout ? 'Rebuild session' : 'Build support session'}</Text>
          </Pressable>
          {workout ? (
            <Pressable
              testID="boxing-generated-workout-clear"
              accessibilityRole="button"
              accessibilityLabel="Clear Athleticore support session"
              accessibilityHint="Asks for confirmation before removing this support-session draft."
              style={styles.secondaryButton}
              disabled={loading || completing}
              onPress={onReset}
            >
              <Text style={styles.secondaryButtonText}>Clear</Text>
            </Pressable>
          ) : null}
        </View>
        ) : null}

        {workout ? (
          <View testID="boxing-generated-workout-status" style={styles.statusPanel}>
            <Text style={styles.statusHeadline}>{workoutSafetyLine(workout)}</Text>
            <Text style={styles.statusText}>{persisted && generatedWorkoutId ? 'Session saved.' : 'Completion will stay on this device until saving is ready.'}</Text>
            {lifecycleStatus ? (
              <Text testID="boxing-generated-workout-lifecycle" style={styles.statusText}>Session status: {labelize(lifecycleStatus)}</Text>
            ) : null}
            {lifecycleMessage ? <Text style={styles.statusText}>{lifecycleMessage}</Text> : null}
            <Text style={styles.statusText}>Review notes: {workout.validation?.isValid ? 'none' : 'available before starting'}</Text>
          </View>
        ) : null}
      </Card>

      {workout ? (
          <GeneratedWorkoutPreviewCard
            workout={workout}
          title="Athleticore support session"
          subtitle={stage === 'inspect' ? 'Review the S&C support before starting' : 'Support-session details'}
        />
      ) : null}

      {workout ? (
        <Card
          title="Session flow"
          subtitle={stage === 'completed' ? 'Completion and next progression' : 'Start, check off work, and complete the support session.'}
          subtitleLines={2}
          backgroundTone="workoutFloor"
          backgroundScrimColor="rgba(10, 10, 10, 0.72)"
          style={styles.card}
        >
          {stage === 'inspect' ? (
            <Pressable
              testID="boxing-generated-workout-start"
              accessibilityRole="button"
              accessibilityLabel={workout.blocked ? 'Review safer options' : 'Start Athleticore support session'}
              accessibilityState={{ disabled: workout.blocked === true }}
              disabled={workout.blocked === true}
              style={[styles.primaryButton, workout.blocked && styles.disabledButton]}
              onPress={onStart}
            >
              <Text style={styles.primaryButtonText}>{workout.blocked ? 'Review needed' : 'Start session'}</Text>
            </Pressable>
          ) : null}

          {startedAt ? <Text style={styles.statusText}>Started {new Date(startedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text> : null}

          {stage === 'started' ? (
            <View testID="boxing-generated-workout-lifecycle-controls" style={styles.lifecycleControls}>
              {sessionPaused ? (
                <Pressable
                  testID="boxing-generated-workout-resume"
                  accessibilityRole="button"
                  accessibilityLabel="Resume Athleticore support session"
                  style={styles.secondaryButton}
                  disabled={completing || !onResume}
                  onPress={onResume}
                >
                  <Text style={styles.secondaryButtonText}>Resume</Text>
                </Pressable>
              ) : (
                <Pressable
                  testID="boxing-generated-workout-pause"
                  accessibilityRole="button"
                  accessibilityLabel="Pause Athleticore support session"
                  style={styles.secondaryButton}
                  disabled={completing || !onPause}
                  onPress={onPause}
                >
                  <Text style={styles.secondaryButtonText}>Pause</Text>
                </Pressable>
              )}
                <Pressable
                testID="boxing-generated-workout-abandon"
                accessibilityRole="button"
                accessibilityLabel="Abandon Athleticore support session"
                accessibilityHint="Asks for confirmation before abandoning this support session."
                style={styles.quietButton}
                disabled={completing || !onAbandon}
                onPress={onAbandon}
              >
                <Text style={styles.quietButtonText}>Abandon</Text>
              </Pressable>
            </View>
          ) : null}

          {stage === 'started' || stage === 'completed' ? (
            <View testID="boxing-generated-workout-checklist" style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderCopy}>
                  <Text accessibilityRole="header" style={styles.sectionLabel}>Exercise checklist</Text>
                  <Text style={styles.sectionHint}>{completedExerciseCount}/{totalExerciseCount} marked complete</Text>
                </View>
                {stage === 'started' ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={allExercisesComplete ? 'Clear all completed exercises' : 'Mark all exercises complete'}
                    style={styles.smallButton}
                    onPress={toggleAllExercisesComplete}
                  >
                    <Text style={styles.smallButtonText}>{allExercisesComplete ? 'Clear' : 'Mark all'}</Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.exerciseStack}>
                {allExercises.map((exercise) => {
                  const completed = completedExerciseIds.includes(exercise.exerciseId);
                  const exerciseLog = exerciseLogFor(exercise, completed);
                  const firstSubstitution = exercise.substitutions?.[0];
                  const liked = likedExerciseIds.includes(exercise.exerciseId);
                  const disliked = dislikedExerciseIds.includes(exercise.exerciseId);
                  return (
                    <View key={exercise.exerciseId} style={styles.exerciseItem}>
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityLabel={`${completed ? 'Mark incomplete' : 'Mark complete'}: ${exercise.name}`}
                        accessibilityState={{ checked: completed }}
                        style={styles.exerciseHeader}
                        disabled={stage === 'completed' || sessionPaused}
                        onPress={() => toggleListValue(exercise.exerciseId, completedExerciseIds, setCompletedExerciseIds)}
                      >
                        <View style={[styles.checkbox, completed && styles.checkboxSelected]} />
                        <View style={styles.exerciseCopy}>
                          <Text style={styles.exerciseName}>{exercise.name}</Text>
                          <Text style={styles.exerciseMeta}>{prescribedLine(exercise)}</Text>
                        </View>
                      </Pressable>
                      <View style={styles.miniChipRow}>
                        <ToggleChip
                          label="Like"
                          accessibilityLabel={`${liked ? 'Remove like for' : 'Like'} ${exercise.name}`}
                          selected={liked}
                          onPress={() => {
                            toggleListValue(exercise.exerciseId, likedExerciseIds, setLikedExerciseIds);
                            if (disliked) setDislikedExerciseIds(dislikedExerciseIds.filter((id) => id !== exercise.exerciseId));
                          }}
                          disabled={stage === 'completed'}
                        />
                        <ToggleChip
                          label="Dislike"
                          accessibilityLabel={`${disliked ? 'Remove dislike for' : 'Dislike'} ${exercise.name}`}
                          selected={disliked}
                          onPress={() => {
                            toggleListValue(exercise.exerciseId, dislikedExerciseIds, setDislikedExerciseIds);
                            if (liked) setLikedExerciseIds(likedExerciseIds.filter((id) => id !== exercise.exerciseId));
                          }}
                          disabled={stage === 'completed'}
                        />
                        {firstSubstitution ? (
                          <ToggleChip
                            label={`Used ${firstSubstitution.name}`}
                            accessibilityLabel={`${substitutionsUsed.includes(firstSubstitution.exerciseId) ? 'Remove substitution' : 'Log substitution'} ${firstSubstitution.name} for ${exercise.name}`}
                            selected={substitutionsUsed.includes(firstSubstitution.exerciseId)}
                            onPress={() => toggleListValue(firstSubstitution.exerciseId, substitutionsUsed, setSubstitutionsUsed)}
                            disabled={stage === 'completed'}
                          />
                        ) : null}
                      </View>
                      <View style={styles.exerciseLogRow}>
                        <NumericLogInput
                          label="Sets"
                          accessibilityLabel={`Sets completed for ${exercise.name}`}
                          value={exerciseLog.setsCompleted}
                          editable={stage === 'started' && !sessionPaused}
                          onChangeText={(value) => updateExerciseLog(exercise, completed, 'setsCompleted', value)}
                        />
                        <NumericLogInput
                          label="Reps"
                          accessibilityLabel={`Reps completed for ${exercise.name}`}
                          value={exerciseLog.repsCompleted}
                          editable={stage === 'started' && !sessionPaused}
                          onChangeText={(value) => updateExerciseLog(exercise, completed, 'repsCompleted', value)}
                        />
                        <NumericLogInput
                          label="Min"
                          accessibilityLabel={`Minutes completed for ${exercise.name}`}
                          value={exerciseLog.durationMinutesCompleted}
                          editable={stage === 'started' && !sessionPaused}
                          onChangeText={(value) => updateExerciseLog(exercise, completed, 'durationMinutesCompleted', value)}
                        />
                        <NumericLogInput
                          label="Sec"
                          accessibilityLabel={`Seconds completed for ${exercise.name}`}
                          value={exerciseLog.durationSecondsCompleted}
                          editable={stage === 'started' && !sessionPaused}
                          onChangeText={(value) => updateExerciseLog(exercise, completed, 'durationSecondsCompleted', value)}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {stage === 'started' ? (
            <>
              <View style={styles.section}>
                <Text accessibilityRole="header" style={styles.sectionLabel}>Completion status</Text>
                <View style={styles.chipRow}>
                  {(['completed', 'partial', 'stopped'] as const).map((status) => (
                    <ToggleChip key={status} label={labelize(status)} selected={completionStatus === status} onPress={() => setCompletionStatus(status)} />
                  ))}
                </View>
              </View>
                <View testID="boxing-generated-workout-session-log" style={styles.logPanel}>
                <Text accessibilityRole="header" style={styles.sectionLabel}>Session log</Text>
                <Text style={styles.sectionHint}>Capture effort and pain honestly. This guides the next recommendation.</Text>
                <Stepper label="Session effort rating" value={sessionRpe} min={1} max={10} onChange={setSessionRpe} />
                <Stepper label="Pain before" value={painScoreBefore} min={0} max={10} onChange={setPainScoreBefore} />
                <Stepper label="Pain after" value={painScoreAfter} min={0} max={10} onChange={setPainScoreAfter} />
                <Stepper label="Rating" value={rating} min={1} max={5} onChange={setRating} />
              </View>
              <View style={styles.section}>
                <Text accessibilityRole="header" style={styles.sectionLabel}>Feedback</Text>
                <Text style={styles.sectionHint}>Pick what best describes the session. Preferences shape future exercise choices.</Text>
                <View testID="boxing-generated-workout-feedback" style={styles.chipRow}>
                  {FEEDBACK_OPTIONS.map((option) => (
                    <ToggleChip key={option.id} label={option.label} selected={feedbackTags.includes(option.id)} onPress={() => toggleListValue(option.id, feedbackTags, setFeedbackTags)} />
                  ))}
                </View>
              </View>
              <TextInput
                testID="boxing-generated-workout-notes"
                accessibilityLabel="Workout notes"
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="Notes, substitutions, or anything the next session should know"
                placeholderTextColor={COLORS.text.tertiary}
                multiline
              />
              <Pressable
                testID="boxing-generated-workout-complete"
                accessibilityRole="button"
                accessibilityLabel={sessionPaused ? 'Resume Athleticore support session before completing' : completing ? 'Completing Athleticore support session' : 'Complete Athleticore support session'}
                style={[styles.primaryButton, (completing || sessionPaused) && styles.disabledButton]}
                disabled={completing || sessionPaused}
                onPress={submitComplete}
              >
                <Text style={styles.primaryButtonText}>{sessionPaused ? 'Resume to complete' : completing ? 'Completing...' : 'Complete session'}</Text>
              </Pressable>
            </>
          ) : null}

          {stage === 'completed' && progressionDecision ? (
            <View testID="boxing-generated-workout-next-progression" style={styles.progressionPanel}>
              <Text accessibilityRole="header" style={styles.sectionLabel}>Recommended next step</Text>
              <Text style={styles.progressionTitle}>{labelize(progressionDecision.direction)}</Text>
              <Text style={styles.progressionBody}>{progressionDecision.userMessage ?? progressionDecision.reason}</Text>
              <Text style={styles.progressionBody}>{progressionDecision.nextAdjustment}</Text>
              {(progressionDecision.safetyFlags?.length ?? 0) > 0 ? (
                <Text style={styles.progressionBody}>Safety notes considered: {progressionDecision.safetyFlags.map(labelize).join(', ')}</Text>
              ) : null}
            </View>
          ) : null}
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: SPACING.md,
  },
  card: {
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  stageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  stagePill: {
    minHeight: 32,
    justifyContent: 'center',
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.surfaceSecondary,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 5,
  },
  stagePillActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  stagePillComplete: {
    borderColor: 'rgba(183, 217, 168, 0.28)',
  },
  stagePillText: {
    color: COLORS.text.secondary,
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 11,
  },
  stagePillTextActive: {
    color: COLORS.text.inverse,
  },
  stageHelp: {
    color: COLORS.text.secondary,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: SPACING.sm,
  },
  section: {
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  sectionHeaderRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  sectionHeaderCopy: {
    flex: 1,
    gap: 3,
  },
  sectionLabel: {
    color: COLORS.text.tertiary,
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 11,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  sectionHint: {
    color: COLORS.text.secondary,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  optionGroup: {
    gap: SPACING.xs,
  },
  optionGroupLabel: {
    color: COLORS.text.secondary,
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 12,
  },
  safetyReminder: {
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(217, 130, 126, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(217, 130, 126, 0.22)',
    color: COLORS.text.secondary,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: SPACING.md,
    padding: SPACING.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  miniChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    paddingLeft: 34,
  },
  exerciseLogRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    paddingLeft: 34,
  },
  logInputGroup: {
    minWidth: 68,
    flexGrow: 1,
    gap: 4,
  },
  logInputLabel: {
    color: COLORS.text.tertiary,
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 10,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  logInput: {
    minHeight: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
    color: COLORS.text.primary,
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 14,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  logInputDisabled: {
    opacity: 0.65,
  },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.surfaceSecondary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  chipSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  chipDisabled: {
    opacity: 0.55,
  },
  chipText: {
    color: COLORS.text.secondary,
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 12,
  },
  chipTextSelected: {
    color: COLORS.text.inverse,
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  lifecycleControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  primaryButton: {
    minHeight: 48,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  disabledButton: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: COLORS.text.inverse,
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 15,
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  secondaryButtonText: {
    color: COLORS.text.secondary,
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 14,
  },
  quietButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  quietButtonText: {
    color: COLORS.text.tertiary,
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 14,
  },
  smallButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  smallButtonText: {
    color: COLORS.text.secondary,
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 12,
  },
  statusPanel: {
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSecondary,
    gap: 4,
    marginTop: SPACING.md,
    padding: SPACING.md,
  },
  statusHeadline: {
    color: COLORS.text.primary,
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 14,
    lineHeight: 19,
  },
  statusText: {
    color: COLORS.text.secondary,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  errorText: {
    color: COLORS.warning,
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 13,
    lineHeight: 18,
    marginTop: SPACING.md,
  },
  exerciseStack: {
    gap: SPACING.sm,
  },
  exerciseItem: {
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSecondary,
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  exerciseHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  checkboxSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  exerciseCopy: {
    flex: 1,
  },
  exerciseName: {
    color: COLORS.text.primary,
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 15,
  },
  exerciseMeta: {
    color: COLORS.text.secondary,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  stepperRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderLight,
    gap: SPACING.md,
  },
  logPanel: {
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSecondary,
    gap: SPACING.sm,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  stepperLabel: {
    flex: 1,
    color: COLORS.text.primary,
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 14,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  stepperButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  stepperButtonText: {
    color: COLORS.text.primary,
    fontFamily: FONT_FAMILY.extraBold,
    fontSize: 20,
  },
  stepperValue: {
    minWidth: 24,
    textAlign: 'center',
    color: COLORS.text.primary,
    fontFamily: FONT_FAMILY.extraBold,
    fontSize: 16,
  },
  notesInput: {
    minHeight: 88,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.surfaceSecondary,
    color: COLORS.text.primary,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    lineHeight: 20,
    padding: SPACING.md,
    marginTop: SPACING.md,
    textAlignVertical: 'top',
  },
  progressionPanel: {
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.accentLight,
    gap: SPACING.xs,
    marginTop: SPACING.md,
    padding: SPACING.md,
  },
  progressionTitle: {
    color: COLORS.accent,
    fontFamily: FONT_FAMILY.extraBold,
    fontSize: 18,
  },
  progressionBody: {
    color: COLORS.text.secondary,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    lineHeight: 19,
  },
});
