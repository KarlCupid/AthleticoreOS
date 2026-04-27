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
import RPESelector from '../../../components/RPESelector';
import { TrainingCard } from '../../../components/workout/TrainingCard';
import { buildTrainingCoachCopy } from '../../../components/workout/trainingCopy';
import type { StrategyRendererProps } from './StrategyRendererProps';

export function AerobicTempoRenderer(props: StrategyRendererProps) {
  const {
    exercise,
    progress,
    selectedRPE,
    onSelectRPE,
    onLogEffort,
    onCompleteExercise,
    onFinishWorkout,
    isLastExercise,
  } = props;

  const dose = exercise.modalityDose?.aerobic;
  const targetMinutes = dose?.durationMin ?? exercise.targetSets * 5;
  const [durationMin, setDurationMin] = useState(String(targetMinutes));
  const [distance, setDistance] = useState('');
  const done = (progress?.effortsCompleted ?? 0) > 0;
  const coachCopy = buildTrainingCoachCopy(exercise);

  const handleLogBlock = async () => {
    const minutes = Number(durationMin);
    const distanceValue = Number(distance);
    await onLogEffort({
      exercise_library_id: exercise.id,
      effort_kind: 'aerobic_block',
      effort_index: 1,
      target_snapshot: {
        duration_min: targetMinutes,
        hr_zone: dose?.hrZone ?? null,
        target_rpe: dose?.targetRPE ?? exercise.targetRPE,
        pace: dose?.pace ?? null,
      },
      actual_snapshot: {
        duration_min: Number.isFinite(minutes) && minutes > 0 ? minutes : targetMinutes,
        distance: Number.isFinite(distanceValue) && distanceValue > 0 ? distanceValue : null,
        rpe: selectedRPE,
      },
      actual_rpe: selectedRPE,
      pain_flag: false,
    });
  };

  return (
    <View style={styles.container}>
      <TrainingCard
        eyebrow="Conditioning"
        title={exercise.name}
        prescription={coachCopy.prescription}
        effort={coachCopy.effort}
        rest={coachCopy.rest}
        focus={coachCopy.focus}
        feel={coachCopy.feel}
        mistake={coachCopy.mistake}
        metrics={[
          { label: 'Time', value: `${targetMinutes} min`, tone: 'accent' },
          { label: 'Zone', value: dose?.hrZone ?? 2 },
          { label: 'RPE', value: dose?.targetRPE ?? exercise.targetRPE },
        ]}
      />

      {!done ? (
        <>
          <View style={styles.inputGrid}>
            <View style={styles.inputBlock}>
              <Text style={styles.inputLabel}>Duration</Text>
              <TextInput
                value={durationMin}
                onChangeText={setDurationMin}
                keyboardType="decimal-pad"
                style={styles.input}
              />
            </View>
            <View style={styles.inputBlock}>
              <Text style={styles.inputLabel}>Distance</Text>
              <TextInput
                value={distance}
                onChangeText={setDistance}
                keyboardType="decimal-pad"
                placeholder="optional"
                placeholderTextColor={COLORS.text.tertiary}
                style={styles.input}
              />
            </View>
          </View>

          <RPESelector value={selectedRPE} onChange={onSelectRPE} />

          <TouchableOpacity
            style={[styles.primaryButton, selectedRPE === null && styles.buttonDisabled]}
            onPress={handleLogBlock}
            disabled={selectedRPE === null}
            activeOpacity={0.82}
          >
            <Text style={styles.primaryText}>Block Done</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.finishSection}>
          <Text style={styles.doneTitle}>Aerobic Work Complete</Text>
          <Text style={styles.doneSubtitle}>{durationMin} min logged</Text>
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
  inputGrid: { flexDirection: 'row', gap: SPACING.sm },
  inputBlock: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  inputLabel: { ...TYPOGRAPHY_V2.plan.caption, color: COLORS.text.secondary },
  input: {
    minHeight: TAP_TARGETS.plan.min,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSecondary,
    paddingHorizontal: SPACING.md,
    color: COLORS.text.primary,
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 18,
  },
  primaryButton: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.md + 4,
    alignItems: 'center',
    minHeight: TAP_TARGETS.focusPrimary.min,
    ...SHADOWS.colored.accent,
  },
  buttonDisabled: { backgroundColor: COLORS.border, ...SHADOWS.sm },
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
