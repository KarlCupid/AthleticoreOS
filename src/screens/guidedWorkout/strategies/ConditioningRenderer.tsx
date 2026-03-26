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
import { ConditioningCard } from '../../../components/workout/ConditioningCard';
import { TimerDisplay } from '../../../components/workout/TimerDisplay';
import RPESelector from '../../../components/RPESelector';
import type { StrategyRendererProps } from './StrategyRendererProps';

export function ConditioningRenderer(props: StrategyRendererProps) {
  const {
    exercise,
    session,
    progress,
    isGymFloor,
    onLogSet,
    onCompleteExercise,
    onFinishWorkout,
    isLastExercise,
    selectedRPE,
    onSelectRPE,
  } = props;

  const conditioning = session.conditioning;
  const [finished, setFinished] = useState(false);
  const completedRounds = progress?.setsCompleted ?? 0;
  const totalRounds = conditioning?.rounds ?? exercise.targetSets;

  return (
    <View style={styles.container}>
      {conditioning && <ConditioningCard conditioning={conditioning} />}

      {!finished ? (
        <>
          {conditioning && conditioning.workIntervalSec > 0 && (
            <TimerDisplay
              mode="interval"
              workSeconds={conditioning.workIntervalSec}
              restSeconds={conditioning.restIntervalSec}
              totalRounds={totalRounds}
              currentRound={completedRounds + 1}
              running={true}
              formatLabel={conditioning.format?.toUpperCase()}
              size="prominent"
            />
          )}

          <View style={styles.roundSection}>
            <Text style={styles.roundLabel}>Round</Text>
            <Text style={styles.roundNumber}>{completedRounds + 1}/{totalRounds}</Text>
          </View>

          <TouchableOpacity
            style={[styles.roundButton, isGymFloor && styles.roundButtonFocus]}
            onPress={() => {
              onLogSet();
              if (completedRounds + 1 >= totalRounds) {
                setFinished(true);
              }
            }}
            activeOpacity={0.82}
          >
            <Text style={styles.roundButtonText}>Complete Round</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.finishSection}>
          <Text style={styles.doneTitle}>Conditioning Complete</Text>
          <Text style={styles.doneSubtitle}>
            {completedRounds} rounds{conditioning ? ` | ${conditioning.type.replace(/_/g, ' ')}` : ''}
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
  roundSection: { flexDirection: 'row', justifyContent: 'center', alignItems: 'baseline', gap: SPACING.sm },
  roundLabel: { ...TYPOGRAPHY_V2.plan.body, color: COLORS.text.secondary },
  roundNumber: { fontFamily: FONT_FAMILY.extraBold, fontSize: 36, color: COLORS.accent },
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
