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
import { ExerciseCard } from '../../../components/workout/ExerciseCard';
import { TimerDisplay } from '../../../components/workout/TimerDisplay';
import RPESelector from '../../../components/RPESelector';
import type { StrategyRendererProps } from './StrategyRendererProps';

export function EMOMRenderer(props: StrategyRendererProps) {
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
  const totalMinutes = timedWork?.roundCount
    ?? timedWork?.targetRounds
    ?? (timedWork ? Math.ceil(timedWork.totalDurationSec / 60) : exercise.targetSets);
  const completedMinutes = progress?.setsCompleted ?? 0;
  const currentMinute = Math.min(completedMinutes + 1, totalMinutes);
  const allDone = completedMinutes >= totalMinutes;
  const [showRPE, setShowRPE] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.minuteHeader}>
        <Text style={styles.minuteLabel}>MIN</Text>
        <Text style={styles.minuteNumber}>{currentMinute}</Text>
        <Text style={styles.minuteOf}>of {totalMinutes}</Text>
      </View>

      {!allDone && (
        <TimerDisplay
          mode="countdown"
          totalSeconds={60}
          running={true}
          label="This minute"
          size="prominent"
        />
      )}

      <View style={styles.blocks}>
        {Array.from({ length: totalMinutes }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.block,
              index < completedMinutes ? styles.blockDone : undefined,
              index === completedMinutes && !allDone ? styles.blockCurrent : undefined,
            ]}
          />
        ))}
      </View>

      <ExerciseCard exercise={exercise} progress={progress} mode="interactive" />

      {!allDone ? (
        <TouchableOpacity
          style={[styles.doneButton, isGymFloor && styles.doneButtonFocus]}
          onPress={onLogSet}
          activeOpacity={0.82}
          accessibilityLabel="Done this minute"
          accessibilityRole="button"
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.finishSection}>
          {!showRPE ? (
            <TouchableOpacity
              style={styles.rpePrompt}
              onPress={() => setShowRPE(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.rpePromptText}>Rate this session</Text>
            </TouchableOpacity>
          ) : (
            <>
              <RPESelector value={selectedRPE} onChange={onSelectRPE} />
              <TouchableOpacity
                style={[styles.doneButton, styles.completeButton]}
                onPress={isLastExercise ? onFinishWorkout : onCompleteExercise}
                disabled={selectedRPE === null}
                activeOpacity={0.82}
              >
                <Text style={styles.doneButtonText}>
                  {isLastExercise ? 'Finish Workout' : 'Complete ->'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: SPACING.md },
  minuteHeader: { alignItems: 'center', gap: SPACING.xs },
  minuteLabel: { ...TYPOGRAPHY_V2.plan.caption, color: COLORS.text.tertiary, textTransform: 'uppercase', letterSpacing: 2 },
  minuteNumber: { ...TYPOGRAPHY_V2.focus.target, color: COLORS.text.primary },
  minuteOf: { ...TYPOGRAPHY_V2.plan.body, color: COLORS.text.secondary },
  blocks: { flexDirection: 'row', gap: 3, flexWrap: 'wrap' },
  block: { flex: 1, height: 6, borderRadius: 3, backgroundColor: COLORS.border, minWidth: 12 },
  blockDone: { backgroundColor: COLORS.accent },
  blockCurrent: { backgroundColor: COLORS.readiness.caution },
  doneButton: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.md + 2,
    alignItems: 'center',
    minHeight: TAP_TARGETS.plan.recommended,
    ...SHADOWS.colored.accent,
  },
  doneButtonFocus: { minHeight: TAP_TARGETS.focusPrimary.min, paddingVertical: SPACING.lg },
  doneButtonText: { fontFamily: FONT_FAMILY.extraBold, fontSize: 17, color: COLORS.text.inverse },
  completeButton: { backgroundColor: COLORS.readiness.prime, ...SHADOWS.colored.prime },
  finishSection: { gap: SPACING.md },
  rpePrompt: { alignItems: 'center', paddingVertical: SPACING.md },
  rpePromptText: { ...TYPOGRAPHY_V2.plan.body, color: COLORS.accent, fontWeight: '600' },
});
