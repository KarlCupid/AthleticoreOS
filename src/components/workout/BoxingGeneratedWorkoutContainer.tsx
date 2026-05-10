import React from 'react';
import { Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { UseBoxingGeneratedWorkoutResult } from '../../hooks/useBoxingGeneratedWorkout';
import { BoxingGeneratedWorkoutSessionCard } from './BoxingGeneratedWorkoutSessionCard';

export interface BoxingGeneratedWorkoutContainerProps {
  controller: UseBoxingGeneratedWorkoutResult;
  mode?: 'standalone';
}

export function BoxingGeneratedWorkoutContainer({ controller, mode = 'standalone' }: BoxingGeneratedWorkoutContainerProps) {
  const { engineEnabled, support } = controller;

  if (!engineEnabled) return null;

  const confirmReset = () => {
    Alert.alert(
      'Clear support session?',
      'This removes the current generated Athleticore support session draft from this screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: support.reset },
      ],
    );
  };

  const confirmAbandon = () => {
    Alert.alert(
      'Abandon support session?',
      'This stops the generated Athleticore support session and saves no completion result.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Abandon', style: 'destructive', onPress: () => { void support.abandon(); } },
      ],
    );
  };

  return (
    <Animated.View
      testID="boxing-generated-workout-section"
      accessibilityLabel={mode === 'standalone' ? 'Standalone Athleticore support session flow' : 'Athleticore support session flow'}
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
