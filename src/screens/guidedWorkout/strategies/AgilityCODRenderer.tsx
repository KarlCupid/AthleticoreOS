import React, { useState } from 'react';
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
import type { StrategyRendererProps } from './StrategyRendererProps';

export function AgilityCODRenderer(props: StrategyRendererProps) {
  const {
    exercise,
    progress,
    onLogEffort,
    onCompleteExercise,
    onFinishWorkout,
    isLastExercise,
  } = props;

  const dose = exercise.modalityDose?.agility;
  const completedReps = progress?.effortsCompleted ?? 0;
  const totalReps = dose?.reps ?? exercise.targetSets;
  const [timeSec, setTimeSec] = useState('');
  const [errors, setErrors] = useState(0);
  const [quality, setQuality] = useState(4);
  const done = completedReps >= totalReps;

  const handleLogRep = async () => {
    const parsedTime = Number(timeSec);
    await onLogEffort({
      exercise_library_id: exercise.id,
      effort_kind: 'agility_rep',
      effort_index: completedReps + 1,
      target_snapshot: {
        drill_distance_m: dose?.drillDistanceMeters ?? null,
        direction_changes: dose?.directionChanges ?? null,
        reaction_component: dose?.reactionComponent ?? false,
      },
      actual_snapshot: {
        time_sec: Number.isFinite(parsedTime) && parsedTime > 0 ? parsedTime : null,
        errors,
        quality,
        direction_changes: dose?.directionChanges ?? 0,
      },
      quality_rating: quality,
      pain_flag: false,
    });
    setTimeSec('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBlock}>
        <Text style={styles.kicker}>Agility / COD</Text>
        <Text style={styles.title}>{exercise.name}</Text>
        <Text style={styles.subtitle}>
          {dose?.drillDistanceMeters ?? 10} m | {dose?.directionChanges ?? 2} cuts | {dose?.reactionComponent ? 'reactive' : 'planned'}
        </Text>
      </View>

      {!done ? (
        <>
          <View style={styles.metricRow}>
            <Metric label="Rep" value={`${completedReps + 1}/${totalReps}`} />
            <Metric label="Errors" value={String(errors)} />
            <Metric label="Quality" value={`${quality}/5`} />
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Best time</Text>
            <TextInput
              value={timeSec}
              onChangeText={setTimeSec}
              keyboardType="decimal-pad"
              placeholder="optional"
              placeholderTextColor={COLORS.text.tertiary}
              style={styles.input}
            />
          </View>

          <Stepper
            label="Errors or slips"
            value={errors}
            onMinus={() => setErrors((value) => Math.max(0, value - 1))}
            onPlus={() => setErrors((value) => value + 1)}
          />
          <Stepper
            label="Movement quality"
            value={quality}
            onMinus={() => setQuality((value) => Math.max(1, value - 1))}
            onPlus={() => setQuality((value) => Math.min(5, value + 1))}
          />

          <TouchableOpacity style={styles.primaryButton} onPress={handleLogRep} activeOpacity={0.82}>
            <Text style={styles.primaryText}>Log Agility Rep</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.finishSection}>
          <Text style={styles.doneTitle}>Agility Work Complete</Text>
          <Text style={styles.doneSubtitle}>{completedReps} reps logged</Text>
          <TouchableOpacity
            style={styles.completeButton}
            onPress={isLastExercise ? onFinishWorkout : onCompleteExercise}
            activeOpacity={0.82}
          >
            <Text style={styles.completeText}>{isLastExercise ? 'Finish Workout' : 'Complete ->'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function Stepper({
  label,
  value,
  onMinus,
  onPlus,
}: {
  label: string;
  value: number;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <TouchableOpacity style={styles.stepperButton} onPress={onMinus}>
          <Text style={styles.stepperText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.stepperValue}>{value}</Text>
        <TouchableOpacity style={styles.stepperButton} onPress={onPlus}>
          <Text style={styles.stepperText}>+</Text>
        </TouchableOpacity>
      </View>
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
