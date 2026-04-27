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
import { TrainingCard } from '../../../components/workout/TrainingCard';
import { buildTrainingCoachCopy, formatSecondsForCoach } from '../../../components/workout/trainingCopy';
import type { StrategyRendererProps } from './StrategyRendererProps';

export function ForTimeRenderer(props: StrategyRendererProps) {
  const {
    exercise,
    isGymFloor,
    onLogSet,
    onCompleteExercise,
    onFinishWorkout,
    isLastExercise,
    selectedRPE,
    onSelectRPE,
  } = props;

  const timedWork = exercise.timedWork ?? exercise.setPrescription[0]?.timedWork;
  const isCountdown = exercise.loadingStrategy === 'timed_sets';
  const timeCap = timedWork?.totalDurationSec ?? 0;
  const [finished, setFinished] = useState(false);
  const coachCopy = buildTrainingCoachCopy(exercise);

  return (
    <View style={styles.container}>
      {isCountdown ? (
        <TimerDisplay
          mode="countdown"
          running={!finished}
          totalSeconds={timeCap}
          label={exercise.loadingStrategy === 'for_time' ? 'For Time' : 'Timed Set'}
          size="prominent"
          onComplete={() => setFinished(true)}
        />
      ) : (
        <TimerDisplay
          mode="countup"
          running={!finished}
          timeCap={timeCap > 0 ? timeCap : undefined}
          label={exercise.loadingStrategy === 'for_time' ? 'For Time' : 'Timed Set'}
          size="prominent"
        />
      )}

      <TrainingCard
        eyebrow={exercise.loadingStrategy === 'for_time' ? 'For Time' : 'Timed Set'}
        title={exercise.name}
        prescription={coachCopy.prescription}
        effort={coachCopy.effort}
        rest={coachCopy.rest}
        focus={coachCopy.focus}
        feel={coachCopy.feel}
        mistake={coachCopy.mistake}
        metrics={[
          { label: 'Cap', value: timeCap > 0 ? formatSecondsForCoach(timeCap) ?? '-' : 'Open', tone: 'accent' },
        ]}
        compact
      />

      {!finished ? (
        <TouchableOpacity
          style={[styles.doneButton, isGymFloor && styles.doneButtonFocus]}
          onPress={() => {
            onLogSet();
            setFinished(true);
          }}
          activeOpacity={0.82}
          accessibilityLabel="Task complete"
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.finishSection}>
          <Text style={styles.doneTitle}>Complete</Text>
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
  doneButton: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.md + 4,
    alignItems: 'center',
    minHeight: TAP_TARGETS.focusPrimary.min,
    ...SHADOWS.colored.accent,
  },
  doneButtonFocus: { paddingVertical: SPACING.lg },
  doneButtonText: { fontFamily: FONT_FAMILY.extraBold, fontSize: 19, color: COLORS.text.inverse },
  finishSection: { alignItems: 'center', gap: SPACING.md },
  doneTitle: { ...TYPOGRAPHY_V2.focus.display, color: COLORS.text.primary },
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
