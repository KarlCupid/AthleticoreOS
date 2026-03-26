import React, { useState } from 'react';
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

export function DensityRenderer(props: StrategyRendererProps) {
  const {
    exercise,
    progress,
    isGymFloor,
    onLogSet,
    onCompleteExercise,
    onFinishWorkout,
    isLastExercise,
    selectedRPE,
    onSelectRPE,
  } = props;

  const timedWork = exercise.timedWork ?? exercise.setPrescription[0]?.timedWork;
  const timeCap = timedWork?.totalDurationSec ?? exercise.restSeconds ?? 300;
  const setsLogged = progress?.setsCompleted ?? 0;
  const [finished, setFinished] = useState(false);

  return (
    <View style={styles.container}>
      {!finished ? (
        <>
          <TimerDisplay
            mode="countdown"
            totalSeconds={timeCap}
            running={true}
            label="Density Block"
            size="prominent"
            onComplete={() => setFinished(true)}
          />

          <View style={styles.exerciseSection}>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
            <Text style={styles.setScheme}>{exercise.setScheme ?? `${exercise.targetReps} reps per set`}</Text>
          </View>

          <View style={styles.counter}>
            <Text style={styles.counterNumber}>{setsLogged}</Text>
            <Text style={styles.counterLabel}>sets completed</Text>
          </View>

          <TouchableOpacity
            style={[styles.logButton, isGymFloor && styles.logButtonFocus]}
            onPress={onLogSet}
            activeOpacity={0.82}
            accessibilityLabel="Set done"
            accessibilityRole="button"
          >
            <Text style={styles.logButtonText}>Set Done</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.finishSection}>
          <Text style={styles.doneTitle}>Block Complete</Text>
          <Text style={styles.doneSubtitle}>{setsLogged} sets in {Math.round(timeCap / 60)} minutes</Text>
          <RPESelector value={selectedRPE} onChange={onSelectRPE} />
          <TouchableOpacity
            style={[styles.completeButton, selectedRPE === null && styles.buttonDisabled]}
            onPress={isLastExercise ? onFinishWorkout : onCompleteExercise}
            disabled={selectedRPE === null}
            activeOpacity={0.82}
          >
            <Text style={styles.completeText}>
              {isLastExercise ? 'Finish Workout' : 'Complete ->'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: SPACING.md },
  exerciseSection: { alignItems: 'center', gap: SPACING.xs },
  exerciseName: { ...TYPOGRAPHY_V2.focus.display, color: COLORS.text.primary, textAlign: 'center' },
  setScheme: { ...TYPOGRAPHY_V2.plan.body, color: COLORS.text.secondary },
  counter: { alignItems: 'center', paddingVertical: SPACING.sm },
  counterNumber: { fontFamily: FONT_FAMILY.extraBold, fontSize: 56, color: COLORS.accent, lineHeight: 64 },
  counterLabel: { ...TYPOGRAPHY_V2.plan.caption, color: COLORS.text.tertiary, textTransform: 'uppercase' },
  logButton: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.md + 4,
    alignItems: 'center',
    minHeight: TAP_TARGETS.focusPrimary.min,
    ...SHADOWS.colored.accent,
  },
  logButtonFocus: { paddingVertical: SPACING.lg },
  logButtonText: { fontFamily: FONT_FAMILY.extraBold, fontSize: 19, color: COLORS.text.inverse },
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
