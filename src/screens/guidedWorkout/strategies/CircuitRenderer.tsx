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
import { TrainingCard } from '../../../components/workout/TrainingCard';
import { buildTrainingCoachCopy, formatSecondsForCoach } from '../../../components/workout/trainingCopy';
import type { StrategyRendererProps } from './StrategyRendererProps';

export function CircuitRenderer(props: StrategyRendererProps) {
  const { exercise, onLogEffort, onCompleteExercise, onFinishWorkout, isLastExercise, selectedRPE, onSelectRPE } = props;

  const circuit = exercise.circuitRound ?? exercise.setPrescription[0]?.circuitRound;
  const dose = exercise.modalityDose?.circuit;
  const totalRounds = circuit?.roundCount ?? dose?.rounds ?? exercise.targetSets;
  const [currentRound, setCurrentRound] = useState(1);
  const [completedMovements, setCompletedMovements] = useState<Set<number>>(new Set());
  const [resting, setResting] = useState(false);
  const allRoundsDone = currentRound > totalRounds;

  const movementCount = circuit?.movements.length ?? dose?.movementCount ?? 1;
  const restBetweenRoundsSec = circuit?.restBetweenRoundsSec ?? dose?.restSeconds ?? 0;
  const coachCopy = buildTrainingCoachCopy(exercise);

  const logRound = useCallback((round: number) => {
    void onLogEffort({
      exercise_library_id: exercise.id,
      effort_kind: 'circuit_round',
      effort_index: round,
      target_snapshot: {
        rounds: totalRounds,
        movement_count: movementCount,
        work_seconds: dose?.workSeconds ?? null,
        rest_seconds: restBetweenRoundsSec || null,
        score_type: dose?.scoreType ?? null,
        density_target: dose?.densityTarget ?? null,
      },
      actual_snapshot: {
        rounds_completed: 1,
        movement_count: movementCount,
        completed: true,
      },
      actual_rpe: selectedRPE,
      pain_flag: false,
    });
  }, [dose?.densityTarget, dose?.scoreType, dose?.workSeconds, exercise.id, movementCount, onLogEffort, restBetweenRoundsSec, selectedRPE, totalRounds]);

  const handleToggleMovement = useCallback((index: number) => {
    setCompletedMovements((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }

      if (next.size >= movementCount) {
        logRound(currentRound);
        if (currentRound < totalRounds) {
          setResting(true);
        } else {
          setCurrentRound(totalRounds + 1);
        }
        return new Set();
      }

      return next;
    });
  }, [currentRound, logRound, movementCount, totalRounds]);

  const handleRestComplete = useCallback(() => {
    setResting(false);
    setCurrentRound((prev) => prev + 1);
  }, []);

  return (
    <View style={styles.container}>
      <TrainingCard
        eyebrow="Circuit"
        title={exercise.name}
        prescription={coachCopy.prescription}
        effort={coachCopy.effort}
        rest={coachCopy.rest}
        focus={coachCopy.focus}
        feel={coachCopy.feel}
        mistake={coachCopy.mistake}
        metrics={[
          { label: 'Round', value: `${Math.min(currentRound, totalRounds)}/${totalRounds}`, tone: 'accent' },
          { label: 'Moves', value: movementCount },
          { label: 'Rest', value: restBetweenRoundsSec > 0 ? formatSecondsForCoach(restBetweenRoundsSec) ?? '-' : 'As needed' },
        ]}
        compact
      />

      {resting && restBetweenRoundsSec > 0 ? (
        <TimerDisplay
          mode="countdown"
          totalSeconds={restBetweenRoundsSec}
          running={true}
          label={`Rest before Round ${currentRound + 1}`}
          size="prominent"
          onComplete={handleRestComplete}
          onSkip={handleRestComplete}
        />
      ) : !allRoundsDone && circuit ? (
        <CircuitView
          circuit={circuit}
          currentRound={currentRound}
          completedMovements={completedMovements}
          onToggleMovement={handleToggleMovement}
          interactive={true}
        />
      ) : !allRoundsDone ? (
        <View style={styles.finishSection}>
          <Text style={styles.doneTitle}>Round {currentRound}</Text>
          <Text style={styles.doneSubtitle}>{movementCount} movements | {dose?.scoreType?.replace(/_/g, ' ') ?? 'rounds'}</Text>
          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => {
              logRound(currentRound);
              setCurrentRound((round) => round + 1);
            }}
            activeOpacity={0.82}
          >
            <Text style={styles.completeText}>Complete Round</Text>
          </TouchableOpacity>
        </View>
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
              {isLastExercise ? 'Finish Session' : 'Next Exercise'}
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
