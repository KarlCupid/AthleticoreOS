import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { COLORS, FONT_FAMILY, SPACING, RADIUS } from '../theme/theme';

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
      set.isCompleted ? COLORS.accent : 'transparent',
      { duration: 200 }
    ),
    borderColor: withTiming(
      set.isCompleted ? COLORS.accent : COLORS.border,
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
        {set.isCompleted && <Text style={styles.checkmark}>{'âœ“'}</Text>}
      </Animated.View>

      <View style={styles.setInfo}>
        <Text
          style={[
            styles.setWeight,
            set.isCompleted && styles.completedText,
          ]}
        >
          {set.weight} lbs Ã— {set.reps}
        </Text>
        <Text
          style={[
            styles.setLabel,
            set.isCompleted && styles.completedText,
          ]}
        >
          {set.label}
        </Text>
      </View>
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{exerciseName ? `Warmup Â· ${exerciseName}` : 'Warmup'}</Text>
        <Text style={styles.counter}>
          {completedCount}/{totalCount}
        </Text>
      </View>

      {sets.map((set) => (
        <SetRow key={set.setNumber} set={set} onToggle={onToggleSet} />
      ))}

      <View style={styles.progressBar}>
        <Animated.View
          style={[
            styles.progressFill,
            progressWidth,
            completedCount === totalCount && totalCount > 0
              ? styles.progressComplete
              : null,
          ]}
        />
      </View>

      {completedCount === totalCount && totalCount > 0 && (
        <Text style={styles.readyText}>Ready for working sets</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
    paddingLeft: SPACING.md,
    gap: SPACING.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: FONT_FAMILY.extraBold,
    fontSize: 16,
    color: COLORS.text.primary,
    letterSpacing: 0,
  },
  counter: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 13,
    color: COLORS.text.tertiary,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: COLORS.text.inverse,
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    lineHeight: 17,
  },
  setInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  setWeight: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 15,
    color: COLORS.text.primary,
  },
  setLabel: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: COLORS.text.tertiary,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.borderLight,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginTop: SPACING.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.full,
  },
  progressComplete: {
    backgroundColor: COLORS.success,
  },
  readyText: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 13,
    color: COLORS.success,
  },
});
