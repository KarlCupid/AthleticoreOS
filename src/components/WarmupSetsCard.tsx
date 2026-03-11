import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';

interface WarmupSet {
  setNumber: number;
  weight: number;
  reps: number;
  label: string;
  isCompleted: boolean;
}

interface WarmupSetsCardProps {
  sets: WarmupSet[];
  onToggleSet: (setNumber: number) => void;
  exerciseName: string;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function SetRow({
  set,
  onToggle,
}: {
  set: WarmupSet;
  onToggle: (setNumber: number) => void;
}) {
  const scale = useSharedValue(1);

  const handlePress = () => {
    scale.value = withSequence(
      withSpring(0.95, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );
    onToggle(set.setNumber);
  };

  const rowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkboxAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(
      set.isCompleted ? COLORS.success : 'transparent',
      { duration: 200 }
    ),
    borderColor: withTiming(
      set.isCompleted ? COLORS.success : COLORS.border,
      { duration: 200 }
    ),
  }));

  return (
    <AnimatedTouchable
      style={[styles.setRow, rowAnimatedStyle]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Animated.View style={[styles.checkbox, checkboxAnimatedStyle]}>
        {set.isCompleted && <Text style={styles.checkmark}>{'✓'}</Text>}
      </Animated.View>

      <Text
        style={[
          styles.setNumber,
          set.isCompleted && styles.completedText,
        ]}
      >
        Set {set.setNumber}
      </Text>

      <Text
        style={[
          styles.setWeight,
          set.isCompleted && styles.completedText,
        ]}
      >
        {set.weight} lbs
      </Text>

      <Text
        style={[
          styles.setReps,
          set.isCompleted && styles.completedText,
        ]}
      >
        {set.reps} reps
      </Text>

      <Text
        style={[
          styles.setLabel,
          set.isCompleted && styles.completedLabel,
        ]}
      >
        {set.label}
      </Text>
    </AnimatedTouchable>
  );
}

export default function WarmupSetsCard({
  sets,
  onToggleSet,
  exerciseName,
}: WarmupSetsCardProps) {
  const completedCount = sets.filter((s) => s.isCompleted).length;
  const totalCount = sets.length;
  const progressRatio = totalCount > 0 ? completedCount / totalCount : 0;

  const progressWidth = useAnimatedStyle(() => ({
    width: withTiming(`${progressRatio * 100}%` as any, { duration: 300 }),
  }));

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Warmup — {exerciseName}</Text>

      <View style={styles.headerRow}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerLabel}>Set</Text>
        <Text style={styles.headerLabel}>Weight</Text>
        <Text style={styles.headerLabel}>Reps</Text>
        <Text style={styles.headerLabel}>Label</Text>
      </View>

      {sets.map((set) => (
        <SetRow key={set.setNumber} set={set} onToggle={onToggleSet} />
      ))}

      <View style={styles.progressContainer}>
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>
            {completedCount}/{totalCount} sets completed
          </Text>
          {completedCount === totalCount && totalCount > 0 && (
            <Text style={styles.readyText}>Ready for working sets</Text>
          )}
        </View>
        <View style={styles.progressBarBackground}>
          <Animated.View
            style={[
              styles.progressBarFill,
              progressWidth,
              completedCount === totalCount && totalCount > 0
                ? styles.progressBarComplete
                : null,
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  title: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 17,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    paddingHorizontal: SPACING.xs,
  },
  headerSpacer: {
    width: 28,
    marginRight: SPACING.sm,
  },
  headerLabel: {
    flex: 1,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.sm,
    marginBottom: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.sm - 2,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  checkmark: {
    color: COLORS.surface,
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
    lineHeight: 16,
  },
  setNumber: {
    flex: 1,
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 14,
    color: COLORS.text.primary,
  },
  setWeight: {
    flex: 1,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    color: COLORS.text.primary,
  },
  setReps: {
    flex: 1,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    color: COLORS.text.primary,
  },
  setLabel: {
    flex: 1,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: COLORS.text.tertiary,
  },
  completedLabel: {
    textDecorationLine: 'line-through',
    color: COLORS.text.tertiary,
  },
  progressContainer: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  progressText: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  readyText: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 12,
    color: COLORS.success,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.full,
  },
  progressBarComplete: {
    backgroundColor: COLORS.success,
  },
});
