import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  GENERATED_WORKOUT_FALLBACK_COPY,
  type GeneratedWorkout,
  type GeneratedWorkoutSessionExerciseCompletionInput,
  type GeneratedWorkoutSessionLifecycleStatus,
  type ProgressionDecision,
  type WorkoutReadinessBand,
} from '../../../lib/performance-engine/workout-programming';
import { Card } from '../Card';
import { COLORS, FONT_FAMILY, RADIUS, SPACING } from '../../theme/theme';
import { GeneratedWorkoutPreviewCard } from './GeneratedWorkoutPreviewCard';

export interface GeneratedWorkoutBetaConfig {
  goalId: string;
  durationMinutes: number;
  equipmentIds: string[];
  readinessBand: WorkoutReadinessBand;
}

export type GeneratedWorkoutBetaStage = 'configure' | 'inspect' | 'started' | 'completed';

export interface GeneratedWorkoutBetaCompletionDraft {
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

interface GeneratedWorkoutBetaSessionCardProps {
  userAuthenticated: boolean;
  stage: GeneratedWorkoutBetaStage;
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
  onGenerate: (config: GeneratedWorkoutBetaConfig) => void;
  onStart: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onAbandon?: () => void;
  onComplete: (draft: GeneratedWorkoutBetaCompletionDraft) => void;
  onReset: () => void;
}

const GOAL_OPTIONS = [
  { id: 'beginner_strength', label: 'Strength' },
  { id: 'dumbbell_hypertrophy', label: 'Hypertrophy' },
  { id: 'zone2_cardio', label: 'Zone 2' },
  { id: 'mobility', label: 'Mobility' },
  { id: 'recovery', label: 'Recovery' },
] as const;

const DURATION_OPTIONS = [30, 40, 50] as const;
const EQUIPMENT_OPTIONS = [
  { id: 'bodyweight', label: 'Bodyweight' },
  { id: 'dumbbells', label: 'Dumbbells' },
  { id: 'bench', label: 'Bench' },
  { id: 'stationary_bike', label: 'Bike' },
] as const;
const READINESS_OPTIONS: WorkoutReadinessBand[] = ['green', 'yellow', 'orange', 'red', 'unknown'];
const FEEDBACK_OPTIONS = [
  { id: 'too_easy', label: 'Too easy' },
  { id: 'good_fit', label: 'Right' },
  { id: 'too_hard', label: 'Too hard' },
  { id: 'pain', label: 'Pain or discomfort' },
  { id: 'time_fit', label: 'Time fit' },
] as const;
const BETA_STAGES: GeneratedWorkoutBetaStage[] = ['configure', 'inspect', 'started', 'completed'];
const SAFETY_REMINDER = 'Pause if pain becomes sharp, unusual, or changes how you move. If you notice chest pain, fainting, severe dizziness, or neurological symptoms, stop and seek professional guidance.';

function labelize(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function stageLabel(stage: GeneratedWorkoutBetaStage): string {
  if (stage === 'configure') return 'Generate';
  if (stage === 'inspect') return 'Inspect';
  if (stage === 'started') return 'Complete';
  return 'Next step';
}

function stageHelp(stage: GeneratedWorkoutBetaStage): string {
  if (stage === 'configure') return 'Choose the basics. The engine keeps safety and readiness in the request.';
  if (stage === 'inspect') return 'Review the session before starting. Use substitutions or scaling if needed.';
  if (stage === 'started') return 'Check off work as you finish it, then log effort, pain, feedback, and notes.';
  return 'Review the recommendation before the next generated session.';
}

function workoutSafetyLine(workout: GeneratedWorkout | null): string {
  if (!workout) return 'No generated workout yet.';
  if (workout.blocked) return GENERATED_WORKOUT_FALLBACK_COPY.sessionBlockedBySafetyReview;
  if (workout.validation && !workout.validation.isValid) return 'Review validation messages before starting.';
  if (workout.safetyFlags.length > 0 || (workout.safetyNotes?.length ?? 0) > 0) return 'Safety guardrails are active.';
  return 'No extra safety flag was applied.';
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

export function GeneratedWorkoutBetaSessionCard({
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
}: GeneratedWorkoutBetaSessionCardProps) {
  const [goalId, setGoalId] = useState('beginner_strength');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [equipmentIds, setEquipmentIds] = useState<string[]>(['bodyweight']);
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
  const currentStageIndex = BETA_STAGES.indexOf(stage);
  const sessionPaused = lifecycleStatus === 'paused';

  function toggleListValue(value: string, values: string[], setter: (next: string[]) => void) {
    setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }

  function toggleEquipment(id: string) {
    const next = equipmentIds.includes(id) ? equipmentIds.filter((item) => item !== id) : [...equipmentIds, id];
    setEquipmentIds(next.length > 0 ? next : ['bodyweight']);
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
    onGenerate({ goalId, durationMinutes, equipmentIds, readinessBand });
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
    <View testID="generated-workout-beta-card" style={styles.stack}>
      <Card
        title="Generated workout beta"
        subtitle={userAuthenticated ? 'Generate, run, complete, and progress.' : 'Local beta mode; sign in to persist.'}
        subtitleLines={2}
        backgroundTone="workoutFloor"
        backgroundScrimColor="rgba(10, 10, 10, 0.72)"
        style={styles.card}
      >
        <View testID="generated-workout-beta-stage-row" style={styles.stageRow}>
          {BETA_STAGES.map((item, index) => {
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

        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionLabel}>Goal</Text>
          <View style={styles.chipRow}>
            {GOAL_OPTIONS.map((goal) => (
              <ToggleChip key={goal.id} label={goal.label} selected={goalId === goal.id} onPress={() => setGoalId(goal.id)} disabled={loading || completing} />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionLabel}>Duration</Text>
          <View style={styles.chipRow}>
            {DURATION_OPTIONS.map((duration) => (
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

        {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
        <Text style={styles.safetyReminder}>{SAFETY_REMINDER}</Text>

        <View style={styles.actionRow}>
          <Pressable
            testID="generated-workout-beta-generate"
            accessibilityRole="button"
            accessibilityLabel={loading ? 'Generating workout' : workout ? 'Regenerate workout' : 'Generate workout'}
            style={[styles.primaryButton, loading && styles.disabledButton]}
            disabled={loading || completing}
            onPress={submitGenerate}
          >
            <Text style={styles.primaryButtonText}>{loading ? 'Generating...' : workout ? 'Regenerate' : 'Generate Workout'}</Text>
          </Pressable>
          {workout ? (
            <Pressable
              testID="generated-workout-beta-clear"
              accessibilityRole="button"
              accessibilityLabel="Clear generated workout"
              style={styles.secondaryButton}
              disabled={loading || completing}
              onPress={onReset}
            >
              <Text style={styles.secondaryButtonText}>Clear</Text>
            </Pressable>
          ) : null}
        </View>

        {workout ? (
          <View testID="generated-workout-beta-status" style={styles.statusPanel}>
            <Text style={styles.statusHeadline}>{workoutSafetyLine(workout)}</Text>
            <Text style={styles.statusText}>{persisted ? `Saved as ${generatedWorkoutId}` : 'Not persisted; using in-memory beta mode.'}</Text>
            {lifecycleStatus ? (
              <Text testID="generated-workout-beta-lifecycle" style={styles.statusText}>Session status: {labelize(lifecycleStatus)}</Text>
            ) : null}
            {lifecycleMessage ? <Text style={styles.statusText}>{lifecycleMessage}</Text> : null}
            <Text style={styles.statusText}>Validation: {workout.validation?.isValid ? 'passed' : 'review warnings available'}</Text>
          </View>
        ) : null}
      </Card>

      {workout ? (
        <GeneratedWorkoutPreviewCard
          workout={workout}
          title="Generated workout"
          subtitle={stage === 'inspect' ? 'Inspect before starting' : 'Session details'}
        />
      ) : null}

      {workout ? (
        <Card
          title="Session flow"
          subtitle={stage === 'completed' ? 'Completion and next progression' : 'Start, check off work, and complete.'}
          subtitleLines={2}
          backgroundTone="workoutFloor"
          backgroundScrimColor="rgba(10, 10, 10, 0.72)"
          style={styles.card}
        >
          {stage === 'inspect' ? (
            <Pressable
              testID="generated-workout-beta-start"
              accessibilityRole="button"
              accessibilityLabel={workout.blocked ? GENERATED_WORKOUT_FALLBACK_COPY.sessionBlockedBySafetyReview : 'Start generated workout'}
              accessibilityState={{ disabled: workout.blocked === true }}
              disabled={workout.blocked === true}
              style={[styles.primaryButton, workout.blocked && styles.disabledButton]}
              onPress={onStart}
            >
              <Text style={styles.primaryButtonText}>{workout.blocked ? 'Blocked by Safety Review' : 'Start Workout'}</Text>
            </Pressable>
          ) : null}

          {startedAt ? <Text style={styles.statusText}>Started {new Date(startedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text> : null}

          {stage === 'started' ? (
            <View testID="generated-workout-beta-lifecycle-controls" style={styles.lifecycleControls}>
              {sessionPaused ? (
                <Pressable
                  testID="generated-workout-beta-resume"
                  accessibilityRole="button"
                  accessibilityLabel="Resume generated workout"
                  style={styles.secondaryButton}
                  disabled={completing || !onResume}
                  onPress={onResume}
                >
                  <Text style={styles.secondaryButtonText}>Resume</Text>
                </Pressable>
              ) : (
                <Pressable
                  testID="generated-workout-beta-pause"
                  accessibilityRole="button"
                  accessibilityLabel="Pause generated workout"
                  style={styles.secondaryButton}
                  disabled={completing || !onPause}
                  onPress={onPause}
                >
                  <Text style={styles.secondaryButtonText}>Pause</Text>
                </Pressable>
              )}
              <Pressable
                testID="generated-workout-beta-abandon"
                accessibilityRole="button"
                accessibilityLabel="Abandon generated workout"
                style={styles.quietButton}
                disabled={completing || !onAbandon}
                onPress={onAbandon}
              >
                <Text style={styles.quietButtonText}>Abandon</Text>
              </Pressable>
            </View>
          ) : null}

          {stage === 'started' || stage === 'completed' ? (
            <View testID="generated-workout-beta-checklist" style={styles.section}>
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
              <View testID="generated-workout-beta-session-log" style={styles.logPanel}>
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
                <View testID="generated-workout-beta-feedback" style={styles.chipRow}>
                  {FEEDBACK_OPTIONS.map((option) => (
                    <ToggleChip key={option.id} label={option.label} selected={feedbackTags.includes(option.id)} onPress={() => toggleListValue(option.id, feedbackTags, setFeedbackTags)} />
                  ))}
                </View>
              </View>
              <TextInput
                testID="generated-workout-beta-notes"
                accessibilityLabel="Workout notes"
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="Notes, substitutions, or anything the next session should know"
                placeholderTextColor={COLORS.text.tertiary}
                multiline
              />
              <Pressable
                testID="generated-workout-beta-complete"
                accessibilityRole="button"
                accessibilityLabel={sessionPaused ? 'Resume generated workout before completing' : completing ? 'Completing workout' : 'Complete generated workout'}
                style={[styles.primaryButton, (completing || sessionPaused) && styles.disabledButton]}
                disabled={completing || sessionPaused}
                onPress={submitComplete}
              >
                <Text style={styles.primaryButtonText}>{sessionPaused ? 'Resume to Complete' : completing ? 'Completing...' : 'Complete Workout'}</Text>
              </Pressable>
            </>
          ) : null}

          {stage === 'completed' && progressionDecision ? (
            <View testID="generated-workout-beta-next-progression" style={styles.progressionPanel}>
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
