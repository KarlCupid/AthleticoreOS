import React from 'react';
import { Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { UseGeneratedWorkoutBetaResult } from '../../hooks/useGeneratedWorkoutBeta';
import { GeneratedWorkoutBetaSessionCard } from './GeneratedWorkoutBetaSessionCard';

interface GeneratedWorkoutBetaContainerProps {
  controller: UseGeneratedWorkoutBetaResult;
}

export function GeneratedWorkoutBetaContainer({ controller }: GeneratedWorkoutBetaContainerProps) {
  const { betaEnabled, beta } = controller;

  if (!betaEnabled) return null;

  const confirmReset = () => {
    Alert.alert(
      'Clear generated workout?',
      'This removes the current generated workout draft from this screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: beta.reset },
      ],
    );
  };

  const confirmAbandon = () => {
    Alert.alert(
      'Abandon generated workout?',
      'This stops the generated workout session and saves no completion result.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Abandon', style: 'destructive', onPress: () => { void beta.abandon(); } },
      ],
    );
  };

  return (
    <Animated.View
      testID="generated-workout-beta-section"
      accessibilityLabel="Generated workout beta flow"
      entering={FadeInDown.delay(70).duration(280).springify()}
    >
      <GeneratedWorkoutBetaSessionCard
        userAuthenticated={beta.userAuthenticated}
        stage={beta.stage}
        workout={beta.workout}
        generatedWorkoutId={beta.generatedWorkoutId}
        persisted={beta.persisted}
        startedAt={beta.startedAt}
        lifecycleStatus={beta.lifecycleStatus}
        lifecycleMessage={beta.lifecycleMessage}
        loading={beta.loading}
        completing={beta.completing}
        error={beta.error}
        progressionDecision={beta.progressionDecision}
        defaultReadinessBand={beta.defaultReadinessBand}
        onGenerate={(config) => { void beta.generate(config); }}
        onStart={() => { void beta.start(); }}
        onPause={() => { void beta.pause(); }}
        onResume={() => { void beta.resume(); }}
        onAbandon={confirmAbandon}
        onComplete={(draft) => { void beta.complete(draft); }}
        onReset={confirmReset}
      />
    </Animated.View>
  );
}
