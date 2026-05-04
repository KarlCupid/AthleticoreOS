import React from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { UseGeneratedWorkoutBetaResult } from '../../hooks/useGeneratedWorkoutBeta';
import { GeneratedWorkoutBetaSessionCard } from './GeneratedWorkoutBetaSessionCard';

interface GeneratedWorkoutBetaContainerProps {
  controller: UseGeneratedWorkoutBetaResult;
}

export function GeneratedWorkoutBetaContainer({ controller }: GeneratedWorkoutBetaContainerProps) {
  const { betaEnabled, beta } = controller;

  if (!betaEnabled) return null;

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
        onAbandon={() => { void beta.abandon(); }}
        onComplete={(draft) => { void beta.complete(draft); }}
        onReset={beta.reset}
      />
    </Animated.View>
  );
}
