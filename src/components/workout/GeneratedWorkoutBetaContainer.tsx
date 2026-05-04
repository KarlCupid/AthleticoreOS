import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { UseGeneratedWorkoutBetaResult } from '../../hooks/useGeneratedWorkoutBeta';
import { AnimatedPressable } from '../AnimatedPressable';
import { Card } from '../Card';
import { COLORS, FONT_FAMILY, RADIUS, SPACING } from '../../theme/theme';
import { GeneratedWorkoutBetaSessionCard } from './GeneratedWorkoutBetaSessionCard';
import { GeneratedWorkoutPreviewCard } from './GeneratedWorkoutPreviewCard';

interface GeneratedWorkoutBetaContainerProps {
  controller: UseGeneratedWorkoutBetaResult;
}

function GeneratedWorkoutStateCard({
  title,
  body,
  actionLabel,
  onPress,
}: {
  title: string;
  body: string;
  actionLabel: string;
  onPress: () => void;
}) {
  return (
    <Card
      backgroundTone="workoutFloor"
      backgroundScrimColor="rgba(10, 10, 10, 0.72)"
    >
      <View style={styles.stateCard}>
        <Text style={styles.stateTitle}>{title}</Text>
        <Text style={styles.stateBody}>{body}</Text>
        <AnimatedPressable style={styles.stateActionButton} onPress={onPress}>
          <Text style={styles.stateActionButtonText}>{actionLabel}</Text>
        </AnimatedPressable>
      </View>
    </Card>
  );
}

export function GeneratedWorkoutBetaContainer({ controller }: GeneratedWorkoutBetaContainerProps) {
  const { betaEnabled, previewEnabled, beta, preview } = controller;

  return (
    <>
      {betaEnabled ? (
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
      ) : null}
      {previewEnabled ? (
        <Animated.View
          testID="generated-workout-preview-section"
          accessibilityLabel="Generated workout preview section"
          entering={FadeInDown.delay(70).duration(280).springify()}
        >
          {preview.loading && !preview.workout ? (
            <GeneratedWorkoutStateCard
              title="Generating programming preview"
              body="This developer-only section is loading through the workout-programming service layer."
              actionLabel="Refresh Preview"
              onPress={() => { void preview.load(); }}
            />
          ) : preview.error ? (
            <GeneratedWorkoutStateCard
              title="Generated preview unavailable"
              body={preview.error}
              actionLabel="Try Again"
              onPress={() => { void preview.load(); }}
            />
          ) : preview.workout ? (
            <GeneratedWorkoutPreviewCard workout={preview.workout} />
          ) : null}
        </Animated.View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  stateCard: { alignItems: 'center', paddingVertical: SPACING.xl, gap: SPACING.sm },
  stateTitle: { fontSize: 20, fontFamily: FONT_FAMILY.extraBold, color: COLORS.text.primary, textAlign: 'center', lineHeight: 26 },
  stateBody: { fontSize: 14, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary, textAlign: 'center', lineHeight: 20 },
  stateActionButton: { backgroundColor: COLORS.accent, borderRadius: RADIUS.full, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, marginTop: SPACING.sm },
  stateActionButtonText: { fontSize: 15, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.inverse },
});
