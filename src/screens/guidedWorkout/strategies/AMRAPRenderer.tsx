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

/**
 * AMRAPRenderer — As Many Rounds As Possible
 *
 * Layout:
 *   Running timer counting UP + time-cap progress bar
 *   Movement list as a vertical checklist
 *   Large round counter + "Complete Round" button
 *   Last round: tap individual movements for partial credit
 *   RPE at end
 */
export function AMRAPRenderer(props: StrategyRendererProps) {
  const { exercise, progress, isGymFloor, onLogSet, onCompleteExercise, onFinishWorkout, isLastExercise, selectedRPE, onSelectRPE } = props;

  const timedWork = exercise.timedWork ?? exercise.setPrescription[0]?.timedWork;
  const timeCap = timedWork?.totalDurationSec ?? 0;
  const completedRounds = progress?.setsCompleted ?? 0;
  const [finished, setFinished] = useState(false);

  return (
    <View style={styles.container}>
      {/* Running timer */}
      <TimerDisplay
        mode="countup"
        running={!finished}
        timeCap={timeCap > 0 ? timeCap : undefined}
        label="AMRAP"
        size="prominent"
        onComplete={() => setFinished(true)}
      />

      {/* Round counter */}
      <View style={styles.roundSection}>
        <Text style={styles.roundLabel}>Rounds Completed</Text>
        <Text style={styles.roundNumber}>{completedRounds}</Text>
      </View>

      {/* Exercise info */}
      <ExerciseCard exercise={exercise} progress={progress} />

      {/* Complete Round button */}
      {!finished ? (
        <TouchableOpacity
          style={[styles.roundButton, isGymFloor && styles.roundButtonFocus]}
          onPress={onLogSet}
          activeOpacity={0.82}
          accessibilityLabel="Complete round"
          accessibilityRole="button"
        >
          <Text style={styles.roundButtonText}>Complete Round</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.finishSection}>
          <Text style={styles.finishTitle}>Time's up!</Text>
          <Text style={styles.finishSubtitle}>{completedRounds} rounds completed</Text>
          <RPESelector value={selectedRPE} onChange={onSelectRPE} />
          <TouchableOpacity
            style={[styles.roundButton, styles.completeButton]}
            onPress={isLastExercise ? onFinishWorkout : onCompleteExercise}
            disabled={selectedRPE === null}
            activeOpacity={0.82}
          >
            <Text style={styles.roundButtonText}>
              {isLastExercise ? 'Finish Workout' : 'Complete →'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: SPACING.md },
  roundSection: { alignItems: 'center', gap: SPACING.xs },
  roundLabel: { ...TYPOGRAPHY_V2.plan.caption, color: COLORS.text.tertiary, textTransform: 'uppercase', letterSpacing: 1 },
  roundNumber: { fontFamily: FONT_FAMILY.extraBold, fontSize: 64, color: COLORS.accent, lineHeight: 72 },
  roundButton: {
    backgroundColor: COLORS.accent, borderRadius: RADIUS.xl,
    paddingVertical: SPACING.md + 4, alignItems: 'center',
    minHeight: TAP_TARGETS.focusPrimary.min, ...SHADOWS.colored.accent,
  },
  roundButtonFocus: { paddingVertical: SPACING.lg },
  roundButtonText: { fontFamily: FONT_FAMILY.extraBold, fontSize: 19, color: COLORS.text.inverse, letterSpacing: 0.3 },
  completeButton: { backgroundColor: COLORS.readiness.prime, ...SHADOWS.colored.prime },
  finishSection: { alignItems: 'center', gap: SPACING.md },
  finishTitle: { ...TYPOGRAPHY_V2.focus.display, color: COLORS.text.primary },
  finishSubtitle: { ...TYPOGRAPHY_V2.plan.body, color: COLORS.text.secondary },
});
