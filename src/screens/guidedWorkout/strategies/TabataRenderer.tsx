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
import { TrainingCard } from '../../../components/workout/TrainingCard';
import { buildTrainingCoachCopy } from '../../../components/workout/trainingCopy';
import type { StrategyRendererProps } from './StrategyRendererProps';

export function TabataRenderer(props: StrategyRendererProps) {
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
  const workSec = timedWork?.workIntervalSec ?? 20;
  const restSec = timedWork?.restIntervalSec ?? 10;
  const totalRounds = timedWork?.roundCount ?? 8;
  const currentRound = Math.min((progress?.setsCompleted ?? 0) + 1, totalRounds);
  const allDone = (progress?.setsCompleted ?? 0) >= totalRounds;
  const coachCopy = buildTrainingCoachCopy(exercise);

  return (
    <View style={styles.container}>
      {!allDone ? (
        <>
          <TrainingCard
            eyebrow="Tabata"
            title={exercise.name}
            prescription={coachCopy.prescription}
            effort={coachCopy.effort}
            rest={coachCopy.rest}
            focus={coachCopy.focus}
            feel={coachCopy.feel}
            mistake={coachCopy.mistake}
            metrics={[
              { label: 'Round', value: `${currentRound}/${totalRounds}`, tone: 'accent' },
              { label: 'Work', value: `${workSec}s` },
              { label: 'Rest', value: `${restSec}s` },
            ]}
            compact
          />
          <TimerDisplay
            mode="interval"
            workSeconds={workSec}
            restSeconds={restSec}
            totalRounds={totalRounds}
            currentRound={currentRound}
            running={true}
            formatLabel="TABATA"
            size="prominent"
          />
          <TouchableOpacity
            style={[styles.roundButton, isGymFloor && styles.roundButtonFocus]}
            onPress={onLogSet}
            activeOpacity={0.82}
            accessibilityLabel="Complete round"
            accessibilityRole="button"
          >
            <Text style={styles.roundButtonText}>Complete Round</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.finishSection}>
          <Text style={styles.doneTitle}>Tabata Complete</Text>
          <Text style={styles.doneSubtitle}>{totalRounds} rounds of {exercise.name}</Text>
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
  container: { gap: SPACING.md, flex: 1 },
  exerciseName: { ...TYPOGRAPHY_V2.focus.display, color: COLORS.text.primary, textAlign: 'center' },
  roundButton: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.md + 4,
    alignItems: 'center',
    minHeight: TAP_TARGETS.focusPrimary.min,
    ...SHADOWS.colored.accent,
  },
  roundButtonFocus: { paddingVertical: SPACING.lg },
  roundButtonText: { fontFamily: FONT_FAMILY.extraBold, fontSize: 19, color: COLORS.text.inverse },
  finishSection: { alignItems: 'center', gap: SPACING.md, paddingTop: SPACING.xl },
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
