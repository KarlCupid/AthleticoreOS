import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS, FONT_FAMILY, SPACING, RADIUS } from '../theme/theme';
import { AnimatedPressable } from './AnimatedPressable';

interface WeightSuggestionBannerProps {
  lastWeight: number;
  lastReps: number;
  lastRPE: number | null;
  suggestedWeight: number;
  suggestedReps: number;
  reasoning: string;
  onAccept: () => void;
  onModify: () => void;
  isDeload?: boolean;
}

const WeightSuggestionBanner: React.FC<WeightSuggestionBannerProps> = ({
  lastWeight,
  lastReps,
  lastRPE,
  suggestedWeight,
  suggestedReps,
  reasoning,
  onAccept,
  onModify,
  isDeload = false,
}) => {
  const rpeDisplay = lastRPE !== null ? ` @ RPE ${lastRPE}` : '';

  const handleAccept = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAccept();
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(400).springify()}
      style={styles.container}
    >
      <View style={styles.topRow}>
        {isDeload && (
          <View style={styles.deloadChip}>
            <Text style={styles.deloadChipText}>DELOAD</Text>
          </View>
        )}
        <Text style={styles.lastLine}>
          Last: {lastWeight}×{lastReps}{rpeDisplay}
        </Text>
      </View>

      <Text style={styles.suggestion}>
        Try {suggestedWeight} × {suggestedReps}
      </Text>

      <Text style={styles.reasoning}>{reasoning}</Text>

      <View style={styles.buttonRow}>
        <AnimatedPressable
          onPress={handleAccept}
          activeScale={0.94}
          style={styles.acceptButton}
        >
          <Text style={styles.acceptText}>Accept</Text>
        </AnimatedPressable>

        <AnimatedPressable
          onPress={onModify}
          activeScale={0.94}
          style={styles.modifyButton}
        >
          <Text style={styles.modifyText}>Modify</Text>
        </AnimatedPressable>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
    paddingLeft: SPACING.md,
    gap: SPACING.xs,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  deloadChip: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  deloadChipText: {
    fontFamily: FONT_FAMILY.extraBold,
    fontSize: 10,
    color: '#F5F5F0',
    letterSpacing: 1,
  },
  lastLine: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    color: COLORS.text.tertiary,
  },
  suggestion: {
    fontFamily: FONT_FAMILY.extraBold,
    fontSize: 24,
    color: COLORS.text.primary,
    letterSpacing: -0.3,
  },
  reasoning: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    color: COLORS.text.secondary,
    lineHeight: 19,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: {
    fontFamily: FONT_FAMILY.extraBold,
    fontSize: 15,
    color: '#F5F5F0',
  },
  modifyButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modifyText: {
    fontFamily: FONT_FAMILY.extraBold,
    fontSize: 15,
    color: COLORS.text.secondary,
  },
});

export default WeightSuggestionBanner;
