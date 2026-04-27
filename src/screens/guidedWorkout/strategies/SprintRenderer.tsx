import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import {
  COLORS,
  FONT_FAMILY,
  SPACING,
  RADIUS,
  SHADOWS,
  TYPOGRAPHY_V2,
  TAP_TARGETS,
} from '../../../theme/theme';
import { TrainingCard } from '../../../components/workout/TrainingCard';
import { buildTrainingCoachCopy, formatDisplayLabel } from '../../../components/workout/trainingCopy';
import type { StrategyRendererProps } from './StrategyRendererProps';

export function SprintRenderer(props: StrategyRendererProps) {
  const {
    exercise,
    progress,
    onLogEffort,
    onCompleteExercise,
    onFinishWorkout,
    isLastExercise,
  } = props;

  const dose = exercise.modalityDose?.sprint;
  const completedReps = progress?.effortsCompleted ?? 0;
  const repDistance = dose?.repDistanceMeters ?? 20;
  const totalReps = Math.max(1, Math.ceil((dose?.totalMeters ?? repDistance * exercise.targetSets) / repDistance));
  const [timeSec, setTimeSec] = useState('');
  const [quality, setQuality] = useState(4);
  const done = completedReps >= totalReps || quality <= 2;
  const coachCopy = useMemo(() => buildTrainingCoachCopy(exercise), [exercise]);
  const sprintType = dose?.sprintType ? formatDisplayLabel(dose.sprintType) : 'Sprint';
  const surface = dose?.surface ? formatDisplayLabel(dose.surface) : 'Surface';

  const handleLogRep = async () => {
    const parsedTime = Number(timeSec);
    await onLogEffort({
      exercise_library_id: exercise.id,
      effort_kind: 'sprint_rep',
      effort_index: completedReps + 1,
      target_snapshot: {
        distance_m: repDistance,
        rest_seconds: dose?.restSeconds ?? exercise.restSeconds ?? null,
        intensity_percent: dose?.intensityPercent ?? null,
        surface: dose?.surface ?? null,
        sprint_type: dose?.sprintType ?? null,
      },
      actual_snapshot: {
        distance_m: repDistance,
        time_sec: Number.isFinite(parsedTime) && parsedTime > 0 ? parsedTime : null,
        quality,
        speed_drop_stop: quality <= 2,
      },
      quality_rating: quality,
      pain_flag: false,
    });
    setTimeSec('');
  };

  return (
    <View style={styles.container}>
      <TrainingCard
        eyebrow="Speed"
        title={exercise.name}
        prescription={coachCopy.prescription}
        effort={coachCopy.effort}
        rest={coachCopy.rest}
        focus={coachCopy.focus}
        feel={coachCopy.feel}
        mistake={coachCopy.mistake}
        metrics={[
          { label: 'Rep', value: `${Math.min(completedReps + 1, totalReps)}/${totalReps}`, tone: 'accent' },
          { label: 'Meters', value: `${completedReps * repDistance}/${totalReps * repDistance}` },
          { label: surface, value: sprintType },
        ]}
      />

      {!done ? (
        <>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Rep time</Text>
            <TextInput
              value={timeSec}
              onChangeText={setTimeSec}
              keyboardType="decimal-pad"
              placeholder="optional"
              placeholderTextColor={COLORS.text.tertiary}
              style={styles.input}
            />
          </View>

          <View style={styles.stepper}>
            <Text style={styles.stepperLabel}>Speed quality</Text>
            <View style={styles.stepperControls}>
              <TouchableOpacity style={styles.stepperButton} onPress={() => setQuality((value) => Math.max(1, value - 1))}>
                <Text style={styles.stepperText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{quality}/5</Text>
              <TouchableOpacity style={styles.stepperButton} onPress={() => setQuality((value) => Math.min(5, value + 1))}>
                <Text style={styles.stepperText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handleLogRep} activeOpacity={0.82}>
            <Text style={styles.primaryText}>Sprint Done</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.finishSection}>
          <Text style={styles.doneTitle}>{quality <= 2 ? 'Speed Drop Reached' : 'Sprint Work Complete'}</Text>
          <Text style={styles.doneSubtitle}>{completedReps} reps | {completedReps * repDistance} m</Text>
          <TouchableOpacity
            style={styles.completeButton}
            onPress={isLastExercise ? onFinishWorkout : onCompleteExercise}
            activeOpacity={0.82}
          >
            <Text style={styles.completeText}>{isLastExercise ? 'Finish Session' : 'Next Exercise'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: SPACING.md },
  headerBlock: { gap: SPACING.xs },
  kicker: { ...TYPOGRAPHY_V2.plan.caption, color: COLORS.accent, textTransform: 'uppercase' },
  title: { ...TYPOGRAPHY_V2.focus.display, color: COLORS.text.primary },
  subtitle: { ...TYPOGRAPHY_V2.plan.body, color: COLORS.text.secondary },
  metricRow: { flexDirection: 'row', gap: SPACING.sm },
  metric: {
    flex: 1,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricLabel: { ...TYPOGRAPHY_V2.plan.caption, color: COLORS.text.tertiary },
  metricValue: { fontFamily: FONT_FAMILY.extraBold, fontSize: 20, color: COLORS.text.primary },
  inputRow: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  inputLabel: { ...TYPOGRAPHY_V2.plan.body, color: COLORS.text.primary },
  input: {
    minHeight: TAP_TARGETS.plan.min,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSecondary,
    paddingHorizontal: SPACING.md,
    color: COLORS.text.primary,
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 18,
  },
  stepper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepperLabel: { ...TYPOGRAPHY_V2.plan.body, color: COLORS.text.primary, flex: 1 },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceSecondary,
  },
  stepperText: { fontFamily: FONT_FAMILY.extraBold, fontSize: 22, color: COLORS.text.primary },
  stepperValue: { fontFamily: FONT_FAMILY.extraBold, fontSize: 18, color: COLORS.text.primary, minWidth: 44, textAlign: 'center' },
  primaryButton: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.md + 4,
    alignItems: 'center',
    minHeight: TAP_TARGETS.focusPrimary.min,
    ...SHADOWS.colored.accent,
  },
  primaryText: { fontFamily: FONT_FAMILY.extraBold, fontSize: 17, color: COLORS.text.inverse },
  finishSection: { alignItems: 'center', gap: SPACING.md, paddingTop: SPACING.lg },
  doneTitle: { ...TYPOGRAPHY_V2.focus.display, color: COLORS.text.primary },
  doneSubtitle: { ...TYPOGRAPHY_V2.plan.body, color: COLORS.text.secondary },
  completeButton: {
    backgroundColor: COLORS.readiness.prime,
    borderRadius: RADIUS.xl,
    width: '100%',
    paddingVertical: SPACING.md + 4,
    alignItems: 'center',
    minHeight: TAP_TARGETS.focusPrimary.min,
    ...SHADOWS.colored.prime,
  },
  completeText: { fontFamily: FONT_FAMILY.extraBold, fontSize: 17, color: COLORS.text.inverse },
});
