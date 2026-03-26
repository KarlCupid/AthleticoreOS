import React, { useState, useCallback } from 'react';
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
import { CircuitView } from '../../../components/workout/CircuitView';
import { TimerDisplay } from '../../../components/workout/TimerDisplay';
import RPESelector from '../../../components/RPESelector';
import type { StrategyRendererProps } from './StrategyRendererProps';

export function CircuitRenderer(props: StrategyRendererProps) {
  const { exercise, onLogSet, onCompleteExercise, onFinishWorkout, isLastExercise, selectedRPE, onSelectRPE } = props;

  const circuit = exercise.circuitRound ?? exercise.setPrescription[0]?.circuitRound;
  const totalRounds = circuit?.roundCount ?? exercise.targetSets;
  const [currentRound, setCurrentRound] = useState(1);
  const [completedMovements, setCompletedMovements] = useState<Set<number>>(new Set());
  const [resting, setResting] = useState(false);
  const allRoundsDone = currentRound > totalRounds;

  const movementCount = circuit?.movements.length ?? 0;

  const handleToggleMovement = useCallback((index: number) => {
    setCompletedMovements((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }

      if (next.size >= movementCount) {
        onLogSet();
        if (currentRound < totalRounds) {
          setResting(true);
        } else {
          setCurrentRound(totalRounds + 1);
        }
        return new Set();
      }

      return next;
    });
  }, [currentRound, movementCount, onLogSet, totalRounds]);

  const handleRestComplete = useCallback(() => {
    setResting(false);
    setCurrentRound((prev) => prev + 1);
  }, []);

  if (!circuit) {
    return (
      <View style={styles.container}>
        <Text style={styles.fallback}>Circuit data not available.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {resting && circuit.restBetweenRoundsSec > 0 ? (
        <TimerDisplay
          mode="countdown"
          totalSeconds={circuit.restBetweenRoundsSec}
          running={true}
          label={`Rest before Round ${currentRound + 1}`}
          size="prominent"
          onComplete={handleRestComplete}
          onSkip={handleRestComplete}
        />
      ) : !allRoundsDone ? (
        <CircuitView
          circuit={circuit}
          currentRound={currentRound}
          completedMovements={completedMovements}
          onToggleMovement={handleToggleMovement}
          interactive={true}
        />
      ) : (
        <View style={styles.finishSection}>
          <Text style={styles.doneTitle}>Circuit Complete</Text>
          <Text style={styles.doneSubtitle}>
            {totalRounds} rounds of {movementCount} movements
          </Text>
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
  fallback: { ...TYPOGRAPHY_V2.plan.body, color: COLORS.text.tertiary, textAlign: 'center', paddingVertical: SPACING.xl },
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
