import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';

interface FormCueCardProps {
  exerciseName: string;
  cues: string;
  isExpanded?: boolean;
  onToggle?: () => void;
}

function parseCues(cues: string): string[] {
  // Split by newlines first, then by '. ' for sentence-separated cues
  const lines = cues.split(/\n/).filter((line) => line.trim().length > 0);
  if (lines.length > 1) {
    return lines.map((line) => line.trim());
  }
  // Fall back to splitting by '. '
  return cues
    .split('. ')
    .map((cue) => cue.trim())
    .filter((cue) => cue.length > 0)
    .map((cue) => (cue.endsWith('.') ? cue : cue));
}

export default function FormCueCard({
  exerciseName,
  cues,
  isExpanded = false,
  onToggle,
}: FormCueCardProps) {
  const expandProgress = useSharedValue(isExpanded ? 1 : 0);
  const parsedCues = parseCues(cues);

  useEffect(() => {
    expandProgress.value = withTiming(isExpanded ? 1 : 0, {
      duration: 250,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [isExpanded]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${interpolate(expandProgress.value, [0, 1], [0, 180])}deg`,
      },
    ],
  }));

  const bodyStyle = useAnimatedStyle(() => ({
    opacity: expandProgress.value,
    maxHeight: interpolate(expandProgress.value, [0, 1], [0, 500]),
  }));

  const borderStyle = useAnimatedStyle(() => ({
    borderLeftWidth: interpolate(expandProgress.value, [0, 1], [0, 3]),
    borderLeftColor: COLORS.accent,
  }));

  return (
    <Animated.View style={[styles.card, borderStyle]}>
      <TouchableOpacity
        style={styles.header}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{'i'}</Text>
          </View>
          <Text style={styles.exerciseName}>{exerciseName}</Text>
        </View>

        <Animated.View style={[styles.chevronContainer, chevronStyle]}>
          <Text style={styles.chevron}>{'v'}</Text>
        </Animated.View>
      </TouchableOpacity>

      <Animated.View style={[styles.body, bodyStyle]}>
        <View style={styles.cuesList}>
          {parsedCues.map((cue, index) => (
            <View key={index} style={styles.cueRow}>
              <View style={styles.bullet} />
              <Text style={styles.cueText}>{cue}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm + 4,
    paddingHorizontal: SPACING.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  icon: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 13,
    color: COLORS.accent,
  },
  exerciseName: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 15,
    color: COLORS.text.primary,
    flex: 1,
  },
  chevronContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 14,
    color: COLORS.text.tertiary,
  },
  body: {
    overflow: 'hidden',
  },
  cuesList: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    paddingTop: SPACING.xs,
  },
  cueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.accent,
    marginTop: 7,
    marginRight: SPACING.sm + 2,
    flexShrink: 0,
  },
  cueText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
    flex: 1,
  },
});
