import React from 'react';
import { Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { UseBoxingGeneratedWorkoutResult } from '../../hooks/useBoxingGeneratedWorkout';
import { BoxingGeneratedWorkoutSessionCard } from './BoxingGeneratedWorkoutSessionCard';

export interface BoxingGeneratedWorkoutContainerProps {
  controller: UseBoxingGeneratedWorkoutResult;
  mode?: 'standalone';
}

/**
 * Explicit ad hoc support generation only.
 *
 * Planned weekly Athleticore support entries should open from Today into
 * WorkoutDetail, where the weekly snapshot owns lazy generation and execution.
 */
export function BoxingGeneratedWorkoutContainer({ controller, mode = 'standalone' }: BoxingGeneratedWorkoutContainerProps) {
  const { engineEnabled, support } = controller;

  if (!engineEnabled) return null;

  const confirmReset = () => {
    Alert.alert(
      'Clear support session?',
      'This removes the current Athleticore support session draft from this screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: support.reset },
      ],
    );
  };

  const confirmAbandon = () => {
    Alert.alert(
      'Abandon support session?',
      'This stops the Athleticore support session and saves no completion result.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Abandon', style: 'destructive', onPress: () => { void support.abandon(); } },
      ],
    );
  };

  return (
    <Animated.View
      testID="boxing-generated-workout-section"
      accessibilityLabel={mode === 'standalone' ? 'Ad hoc Athleticore support session flow' : 'Athleticore support session flow'}
      entering={FadeInDown.delay(70).duration(280).springify()}
    >
      <BoxingGeneratedWorkoutSessionCard
        userAuthenticated={support.userAuthenticated}
        stage={support.stage}
        workout={support.workout}
        generatedWorkoutId={support.generatedWorkoutId}
        persisted={support.persisted}
        startedAt={support.startedAt}
        lifecycleStatus={support.lifecycleStatus}
        lifecycleMessage={support.lifecycleMessage}
        loading={support.loading}
        completing={support.completing}
        error={support.error}
        progressionDecision={support.progressionDecision}
        defaultReadinessBand={support.defaultReadinessBand}
        onGenerate={(config) => { void support.generate(config); }}
        onStart={() => { void support.start(); }}
        onPause={() => { void support.pause(); }}
        onResume={() => { void support.resume(); }}
        onAbandon={confirmAbandon}
        onComplete={(draft) => { void support.complete(draft); }}
        onReset={confirmReset}
      />
    </Animated.View>
  );
}
