import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';

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

  return (
    <Animated.View
      entering={FadeInDown.duration(500).springify()}
      style={[styles.container, SHADOWS.card]}
    >
      {isDeload && (
        <View style={styles.deloadBadge}>
          <Text style={styles.deloadBadgeText}>Deload</Text>
        </View>
      )}

      <Text style={styles.lastLine}>
        Last: {lastWeight}x{lastReps}{rpeDisplay}
      </Text>

      <Text style={styles.suggestionLine}>
        Try {suggestedWeight}x{suggestedReps}
      </Text>

      <Text style={styles.reasoningText}>{reasoning}</Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          onPress={onAccept}
          activeOpacity={0.7}
          style={styles.acceptButton}
        >
          <Text style={styles.acceptButtonText}>Accept</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onModify}
          activeOpacity={0.7}
          style={styles.modifyButton}
        >
          <Text style={styles.modifyButtonText}>Modify</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  deloadBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#7C3AED',
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    marginBottom: SPACING.sm,
  },
  deloadBadgeText: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 11,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lastLine: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  suggestionLine: {
    fontFamily: FONT_FAMILY.extraBold,
    fontSize: 22,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  reasoningText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: COLORS.text.secondary,
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonText: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  modifyButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modifyButtonText: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 14,
    color: COLORS.accent,
  },
});

export default WeightSuggestionBanner;
