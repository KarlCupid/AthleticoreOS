import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { SPACING } from '../../../theme/theme';
import { ActivationChecklist } from '../../../components/workout/ActivationChecklist';
import { TrainingCard } from '../../../components/workout/TrainingCard';
import type { StrategyRendererProps } from './StrategyRendererProps';

/**
 * ActivationRenderer — sparring prep / activation sections
 *
 * Layout:
 *   All movements shown simultaneously (not one-at-a-time)
 *   Simple checkboxes per movement
 *   "Ready for Training" button at bottom
 *   Compact layout — 10–15 minutes
 */
export function ActivationRenderer(props: StrategyRendererProps) {
  const { exercise, session, currentSection, onCompleteExercise, onFinishWorkout, isLastExercise } = props;

  const exercises = currentSection?.exercises ?? [exercise];
  const estimatedMin = currentSection?.timeCap ?? 10;

  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  const handleToggle = useCallback((id: string) => {
    setCompletedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <View style={styles.container}>
      <TrainingCard
        eyebrow="Activation"
        title={currentSection?.title ?? exercise.name}
        prescription={`${exercises.length} crisp movements`}
        effort="Easy, sharp, no fatigue"
        rest="Reset between moves"
        focus={['Wake up positions', 'Move better before you train']}
        feel="Ready, warm, and switched on."
        compact
      />

      <ActivationChecklist
        exercises={exercises}
        estimatedMinutes={estimatedMin}
        completedIds={completedIds}
        onToggle={handleToggle}
        onReady={isLastExercise ? onFinishWorkout : onCompleteExercise}
        interactive={true}
        nextActivityLabel={session.workoutType === 'sparring' ? 'Sparring' : 'Training'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: SPACING.md },
});
