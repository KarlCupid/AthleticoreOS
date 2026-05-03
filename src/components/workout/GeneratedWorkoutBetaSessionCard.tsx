import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type {
  GeneratedWorkout,
  GeneratedWorkoutSessionExerciseCompletionInput,
  ProgressionDecision,
  WorkoutReadinessBand,
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
  loading: boolean;
  completing: boolean;
  error: string | null;
  progressionDecision: ProgressionDecision | null;
  defaultReadinessBand: WorkoutReadinessBand;
  onGenerate: (config: GeneratedWorkoutBetaConfig) => void;
  onStart: () => void;
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
const FEEDBACK_TAGS = ['too_easy', 'too_hard', 'pain', 'good_fit', 'time_fit'] as const;

function labelize(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
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
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
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
          style={styles.stepperButton}
          onPress={() => onChange(Math.max(min, value - 1))}
        >
          <Text style={styles.stepperButtonText}>-</Text>
        </Pressable>
        <Text style={styles.stepperValue}>{value}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
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
  value,
  onChangeText,
  editable,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  editable: boolean;
}) {
  return (
    <View style={styles.logInputGroup}>
      <Text style={styles.logInputLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
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
  loading,
  completing,
  error,
  progressionDecision,
  defaultReadinessBand,
  onGenerate,
  onStart,
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
  const effectiveCompletedExerciseIds = completedExerciseIds.length > 0
    ? completedExerciseIds
    : allExercises.map((exercise) => exercise.exerciseId);

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
    onGenerate({ goalId, durationMinutes, equipmentIds, readinessBand });
  }

  function submitComplete() {
    const exerciseResults = allExercises.map((exercise) => {
      const completed = effectiveCompletedExerciseIds.includes(exercise.exerciseId);
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
      completedExerciseIds: effectiveCompletedExerciseIds,
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
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Goal</Text>
          <View style={styles.chipRow}>
            {GOAL_OPTIONS.map((goal) => (
              <ToggleChip key={goal.id} label={goal.label} selected={goalId === goal.id} onPress={() => setGoalId(goal.id)} disabled={loading || completing} />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Duration</Text>
          <View style={styles.chipRow}>
            {DURATION_OPTIONS.map((duration) => (
              <ToggleChip key={duration} label={`${duration} min`} selected={durationMinutes === duration} onPress={() => setDurationMinutes(duration)} disabled={loading || completing} />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Equipment</Text>
          <View style={styles.chipRow}>
            {EQUIPMENT_OPTIONS.map((equipment) => (
              <ToggleChip key={equipment.id} label={equipment.label} selected={equipmentIds.includes(equipment.id)} onPress={() => toggleEquipment(equipment.id)} disabled={loading || completing} />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Readiness</Text>
          <View style={styles.chipRow}>
            {READINESS_OPTIONS.map((readiness) => (
              <ToggleChip key={readiness} label={labelize(readiness)} selected={readinessBand === readiness} onPress={() => setReadinessBand(readiness)} disabled={loading || completing} />
            ))}
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.actionRow}>
          <Pressable
            testID="generated-workout-beta-generate"
            accessibilityRole="button"
            style={[styles.primaryButton, loading && styles.disabledButton]}
            disabled={loading || completing}
            onPress={submitGenerate}
          >
            <Text style={styles.primaryButtonText}>{loading ? 'Generating...' : workout ? 'Regenerate' : 'Generate Workout'}</Text>
          </Pressable>
          {workout ? (
            <Pressable testID="generated-workout-beta-clear" accessibilityRole="button" style={styles.secondaryButton} disabled={loading || completing} onPress={onReset}>
              <Text style={styles.secondaryButtonText}>Clear</Text>
            </Pressable>
          ) : null}
        </View>

        {workout ? (
          <View testID="generated-workout-beta-status" style={styles.statusPanel}>
            <Text style={styles.statusText}>{persisted ? `Saved as ${generatedWorkoutId}` : 'Not persisted; using in-memory beta mode.'}</Text>
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
            <Pressable testID="generated-workout-beta-start" accessibilityRole="button" style={styles.primaryButton} onPress={onStart}>
              <Text style={styles.primaryButtonText}>Start Workout</Text>
            </Pressable>
          ) : null}

          {startedAt ? <Text style={styles.statusText}>Started {new Date(startedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text> : null}

          {stage === 'started' || stage === 'completed' ? (
            <View testID="generated-workout-beta-checklist" style={styles.section}>
              <Text style={styles.sectionLabel}>Exercise checklist</Text>
              <View style={styles.exerciseStack}>
                {allExercises.map((exercise) => {
                  const completed = effectiveCompletedExerciseIds.includes(exercise.exerciseId);
                  const exerciseLog = exerciseLogFor(exercise, completed);
                  const firstSubstitution = exercise.substitutions?.[0];
                  const liked = likedExerciseIds.includes(exercise.exerciseId);
                  const disliked = dislikedExerciseIds.includes(exercise.exerciseId);
                  return (
                    <View key={exercise.exerciseId} style={styles.exerciseItem}>
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: completed }}
                        style={styles.exerciseHeader}
                        onPress={() => toggleListValue(exercise.exerciseId, effectiveCompletedExerciseIds, setCompletedExerciseIds)}
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
                          selected={liked}
                          onPress={() => {
                            toggleListValue(exercise.exerciseId, likedExerciseIds, setLikedExerciseIds);
                            if (disliked) setDislikedExerciseIds(dislikedExerciseIds.filter((id) => id !== exercise.exerciseId));
                          }}
                          disabled={stage === 'completed'}
                        />
                        <ToggleChip
                          label="Dislike"
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
                            selected={substitutionsUsed.includes(firstSubstitution.exerciseId)}
                            onPress={() => toggleListValue(firstSubstitution.exerciseId, substitutionsUsed, setSubstitutionsUsed)}
                            disabled={stage === 'completed'}
                          />
                        ) : null}
                      </View>
                      <View style={styles.exerciseLogRow}>
                        <NumericLogInput
                          label="Sets"
                          value={exerciseLog.setsCompleted}
                          editable={stage === 'started'}
                          onChangeText={(value) => updateExerciseLog(exercise, completed, 'setsCompleted', value)}
                        />
                        <NumericLogInput
                          label="Reps"
                          value={exerciseLog.repsCompleted}
                          editable={stage === 'started'}
                          onChangeText={(value) => updateExerciseLog(exercise, completed, 'repsCompleted', value)}
                        />
                        <NumericLogInput
                          label="Min"
                          value={exerciseLog.durationMinutesCompleted}
                          editable={stage === 'started'}
                          onChangeText={(value) => updateExerciseLog(exercise, completed, 'durationMinutesCompleted', value)}
                        />
                        <NumericLogInput
                          label="Sec"
                          value={exerciseLog.durationSecondsCompleted}
                          editable={stage === 'started'}
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
                <Text style={styles.sectionLabel}>Completion status</Text>
                <View style={styles.chipRow}>
                  {(['completed', 'partial', 'stopped'] as const).map((status) => (
                    <ToggleChip key={status} label={labelize(status)} selected={completionStatus === status} onPress={() => setCompletionStatus(status)} />
                  ))}
                </View>
              </View>
              <Stepper label="Session RPE" value={sessionRpe} min={1} max={10} onChange={setSessionRpe} />
              <Stepper label="Pain before" value={painScoreBefore} min={0} max={10} onChange={setPainScoreBefore} />
              <Stepper label="Pain after" value={painScoreAfter} min={0} max={10} onChange={setPainScoreAfter} />
              <Stepper label="Rating" value={rating} min={1} max={5} onChange={setRating} />
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Feedback</Text>
                <View testID="generated-workout-beta-feedback" style={styles.chipRow}>
                  {FEEDBACK_TAGS.map((tag) => (
                    <ToggleChip key={tag} label={labelize(tag)} selected={feedbackTags.includes(tag)} onPress={() => toggleListValue(tag, feedbackTags, setFeedbackTags)} />
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
                style={[styles.primaryButton, completing && styles.disabledButton]}
                disabled={completing}
                onPress={submitComplete}
              >
                <Text style={styles.primaryButtonText}>{completing ? 'Completing...' : 'Complete Workout'}</Text>
              </Pressable>
            </>
          ) : null}

          {stage === 'completed' && progressionDecision ? (
            <View testID="generated-workout-beta-next-progression" style={styles.progressionPanel}>
              <Text style={styles.sectionLabel}>Next progression</Text>
              <Text style={styles.progressionTitle}>{labelize(progressionDecision.direction)}</Text>
              <Text style={styles.progressionBody}>{progressionDecision.userMessage ?? progressionDecision.reason}</Text>
              <Text style={styles.progressionBody}>{progressionDecision.nextAdjustment}</Text>
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
  section: {
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  sectionLabel: {
    color: COLORS.text.tertiary,
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 11,
    letterSpacing: 0,
    textTransform: 'uppercase',
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
  statusPanel: {
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSecondary,
    gap: 4,
    marginTop: SPACING.md,
    padding: SPACING.md,
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
