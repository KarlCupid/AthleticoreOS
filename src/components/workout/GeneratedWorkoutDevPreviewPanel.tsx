import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useGeneratedWorkoutDevPreview } from '../../hooks/useGeneratedWorkoutDevPreview';
import { AnimatedPressable } from '../AnimatedPressable';
import { Card } from '../Card';
import { COLORS, FONT_FAMILY, RADIUS, SPACING } from '../../theme/theme';
import { GeneratedWorkoutPreviewCard } from './GeneratedWorkoutPreviewCard';

interface GeneratedWorkoutDevPreviewPanelProps {
  active: boolean;
}

function GeneratedWorkoutDevStateCard({
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

export function GeneratedWorkoutDevPreviewPanel({ active }: GeneratedWorkoutDevPreviewPanelProps) {
  const preview = useGeneratedWorkoutDevPreview({ active });

  if (!preview.enabled) return null;

  return (
    <Animated.View
      testID="generated-workout-preview-section"
      accessibilityLabel="Generated workout developer preview section"
      entering={FadeInDown.delay(70).duration(280).springify()}
    >
      {preview.loading && !preview.workout ? (
        <GeneratedWorkoutDevStateCard
          title="Generating programming preview"
          body="This developer-only debug section is loading a fixed fixture through the workout-programming service layer."
          actionLabel="Refresh Preview"
          onPress={() => { void preview.load(); }}
        />
      ) : preview.error ? (
        <GeneratedWorkoutDevStateCard
          title="Generated preview unavailable"
          body={preview.error}
          actionLabel="Try Again"
          onPress={() => { void preview.load(); }}
        />
      ) : preview.workout ? (
        <GeneratedWorkoutPreviewCard workout={preview.workout} />
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stateCard: { alignItems: 'center', paddingVertical: SPACING.xl, gap: SPACING.sm },
  stateTitle: { fontSize: 20, fontFamily: FONT_FAMILY.extraBold, color: COLORS.text.primary, textAlign: 'center', lineHeight: 26 },
  stateBody: { fontSize: 14, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary, textAlign: 'center', lineHeight: 20 },
  stateActionButton: { backgroundColor: COLORS.accent, borderRadius: RADIUS.full, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, marginTop: SPACING.sm },
  stateActionButtonText: { fontSize: 15, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.inverse },
});
