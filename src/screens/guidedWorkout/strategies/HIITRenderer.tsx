import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  COLORS,
  FONT_FAMILY,
  SPACING,
  RADIUS,
  SHADOWS,
  TYPOGRAPHY_V2,
  TAP_TARGETS,
} from '../../../theme/theme';
import { TimerDisplay } from '../../../components/workout/TimerDisplay';
import RPESelector from '../../../components/RPESelector';
import type { StrategyRendererProps } from './StrategyRendererProps';

export function HIITRenderer(props: StrategyRendererProps) {
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

  const dose = exercise.modalityDose?.interval;
  const completedRounds = progress?.effortsCompleted ?? 0;
  const totalRounds = dose?.rounds ?? exercise.targetSets;
  const workSeconds = dose?.workSeconds ?? 60;
  const restSeconds = dose?.restSeconds ?? exercise.restSeconds ?? 60;
  const done = completedRounds >= totalRounds;

  const handleLogRound = async () => {
    await onLogEffort({
      exercise_library_id: exercise.id,
      effort_kind: 'interval_round',
      effort_index: completedRounds + 1,
      target_snapshot: {
        work_seconds: workSeconds,
        rest_seconds: restSeconds,
        modality: dose?.modality ?? null,
        target_intensity: dose?.targetIntensity ?? null,
      },
      actual_snapshot: {
        work_seconds: workSeconds,
        rest_seconds: restSeconds,
        completed: true,
      },
      actual_rpe: selectedRPE,
      pain_flag: false,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBlock}>
        <Text style={styles.kicker}>Intervals</Text>
        <Text style={styles.title}>{exercise.name}</Text>
        <Text style={styles.subtitle}>
          {workSeconds}s work / {restSeconds}s rest | {dose?.modality ?? 'mixed'} | {dose?.targetIntensity?.replace(/_/g, ' ') ?? 'hard'}
        </Text>
      </View>

      {!done ? (
        <>
          <TimerDisplay
            mode="interval"
            workSeconds={workSeconds}
            restSeconds={restSeconds}
            totalRounds={totalRounds}
            currentRound={completedRounds + 1}
            running={true}
            formatLabel="HIIT"
            size="prominent"
          />

          <View style={styles.roundSection}>
            <Text style={styles.roundLabel}>Round</Text>
            <Text style={styles.roundNumber}>{completedRounds + 1}/{totalRounds}</Text>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handleLogRound} activeOpacity={0.82}>
            <Text style={styles.primaryText}>Complete Round</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.finishSection}>
          <Text style={styles.doneTitle}>Intervals Complete</Text>
          <Text style={styles.doneSubtitle}>
            {totalRounds} rounds | {Math.round((totalRounds * workSeconds / 60) * 10) / 10} work min
          </Text>
          <RPESelector value={selectedRPE} onChange={onSelectRPE} />
          <TouchableOpacity
            style={[styles.completeButton, selectedRPE === null && styles.buttonDisabled]}
            onPress={isLastExercise ? onFinishWorkout : onCompleteExercise}
            disabled={selectedRPE === null}
            activeOpacity={0.82}
          >
            <Text style={styles.completeText}>{isLastExercise ? 'Finish Workout' : 'Complete ->'}</Text>
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
  roundSection: { flexDirection: 'row', justifyContent: 'center', alignItems: 'baseline', gap: SPACING.sm },
  roundLabel: { ...TYPOGRAPHY_V2.plan.body, color: COLORS.text.secondary },
  roundNumber: { fontFamily: FONT_FAMILY.extraBold, fontSize: 36, color: COLORS.accent },
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
  buttonDisabled: { backgroundColor: COLORS.border, ...SHADOWS.sm },
  completeText: { fontFamily: FONT_FAMILY.extraBold, fontSize: 17, color: COLORS.text.inverse },
});
