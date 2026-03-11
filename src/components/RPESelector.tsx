import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import { COLORS, FONT_FAMILY, SPACING, RADIUS } from '../theme/theme';

interface RPESelectorProps {
  value: number | null;
  onChange: (rpe: number) => void;
  disabled?: boolean;
}

const RPE_COLORS: Record<number, string> = {
  1: '#22C55E',
  2: '#22C55E',
  3: '#22C55E',
  4: '#F59E0B',
  5: '#F59E0B',
  6: '#F59E0B',
  7: '#F97316',
  8: '#F97316',
  9: '#EF4444',
  10: '#EF4444',
};

const RPE_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface RPECircleProps {
  rpeValue: number;
  isSelected: boolean;
  onPress: (rpe: number) => void;
  disabled: boolean;
}

const RPECircle: React.FC<RPECircleProps> = ({
  rpeValue,
  isSelected,
  onPress,
  disabled,
}) => {
  const scale = useSharedValue(1);
  const color = RPE_COLORS[rpeValue];

  React.useEffect(() => {
    scale.value = withSpring(isSelected ? 1.15 : 1, {
      damping: 12,
      stiffness: 180,
    });
  }, [isSelected, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    if (!disabled) {
      onPress(rpeValue);
    }
  }, [disabled, onPress, rpeValue]);

  return (
    <AnimatedTouchable
      onPress={handlePress}
      activeOpacity={disabled ? 1 : 0.7}
      style={[
        styles.circle,
        isSelected
          ? { backgroundColor: color, borderColor: color }
          : { backgroundColor: 'transparent', borderColor: color },
        disabled && styles.circleDisabled,
        animatedStyle,
      ]}
    >
      <Text
        style={[
          styles.circleText,
          { color: isSelected ? '#FFFFFF' : color },
          disabled && styles.textDisabled,
        ]}
      >
        {rpeValue}
      </Text>
    </AnimatedTouchable>
  );
};

const RPESelector: React.FC<RPESelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.container}>
      <Text style={[styles.label, disabled && styles.textDisabled]}>
        Rate Your Effort (RPE)
      </Text>
      <View style={styles.row}>
        {RPE_VALUES.map((rpe) => (
          <RPECircle
            key={rpe}
            rpeValue={rpe}
            isSelected={value === rpe}
            onPress={onChange}
            disabled={disabled}
          />
        ))}
      </View>
    </Animated.View>
  );
};

const CIRCLE_SIZE = 32;

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.sm,
  },
  label: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 14,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleText: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 12,
  },
  circleDisabled: {
    opacity: 0.4,
  },
  textDisabled: {
    opacity: 0.4,
  },
});

export default RPESelector;
