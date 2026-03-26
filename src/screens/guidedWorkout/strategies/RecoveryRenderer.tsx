import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  COLORS,
  FONT_FAMILY,
  SPACING,
  RADIUS,
  SHADOWS,
  TAP_TARGETS,
} from '../../../theme/theme';
import { RecoveryChecklist } from '../../../components/workout/RecoveryChecklist';
import type { StrategyRendererProps } from './StrategyRendererProps';

export function RecoveryRenderer(props: StrategyRendererProps) {
  const { exercise, session, currentSection, onCompleteExercise, onFinishWorkout, isLastExercise } = props;

  const exercises = currentSection?.exercises ?? [exercise];
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  const handleToggle = useCallback((id: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allDone = completedIds.size >= exercises.length;

  return (
    <View style={styles.container}>
      <RecoveryChecklist
        exercises={exercises}
        completedIds={completedIds}
        onToggle={handleToggle}
        interactive={true}
        message={session.sessionGoal ?? currentSection?.intent}
      />

      <TouchableOpacity
        style={[
          styles.completeButton,
          !allDone && styles.completeButtonDisabled,
        ]}
        onPress={isLastExercise ? onFinishWorkout : onCompleteExercise}
        disabled={!allDone}
        activeOpacity={0.82}
        accessibilityLabel={isLastExercise ? 'Finish workout' : 'Complete section'}
        accessibilityRole="button"
      >
        <Text style={[
          styles.completeText,
          !allDone && styles.completeTextDisabled,
        ]}>
          {isLastExercise ? 'Finish Workout' : 'Complete ->'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: SPACING.lg, paddingVertical: SPACING.sm },
  completeButton: {
    backgroundColor: COLORS.readiness.prime,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.md + 4,
    alignItems: 'center',
    minHeight: TAP_TARGETS.plan.recommended,
    ...SHADOWS.colored.prime,
  },
  completeButtonDisabled: {
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  completeText: { fontFamily: FONT_FAMILY.extraBold, fontSize: 17, color: COLORS.text.inverse },
  completeTextDisabled: { color: COLORS.text.tertiary },
});
