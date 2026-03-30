import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  COLORS,
  FONT_FAMILY,
  SPACING,
  RADIUS,
  TYPOGRAPHY_V2,
  TAP_TARGETS,
} from '../../theme/theme';
import { AnimatedPressable } from '../AnimatedPressable';

// ---------------------------------------------------------------------------
// RollingValue — digit slides out/in on value change
// ---------------------------------------------------------------------------

function RollingValue({
  display,
  style: textStyle,
}: {
  display: string;
  style?: object;
}) {
  const prevRef = useRef(display);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (prevRef.current === display) return;
    prevRef.current = display;

    translateY.value = 0;
    opacity.value = 1;
    translateY.value = withSequence(
      withTiming(-14, { duration: 90, easing: Easing.in(Easing.ease) }),
      withTiming(14, { duration: 0 }),
      withTiming(0, { duration: 130, easing: Easing.out(Easing.ease) }),
    );
    opacity.value = withSequence(
      withTiming(0, { duration: 90 }),
      withTiming(0, { duration: 0 }),
      withTiming(1, { duration: 130 }),
    );
  }, [display]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.Text style={[textStyle, animStyle]}>{display}</Animated.Text>
  );
}

// ---------------------------------------------------------------------------
// NumberStepper — weight or reps input with +/- buttons
// ---------------------------------------------------------------------------

interface NumberStepperProps {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  label: string;
  formatValue?: (v: number) => string;
  mode?: 'plan' | 'focus';
}

export function NumberStepper({
  value,
  onDecrement,
  onIncrement,
  label,
  formatValue,
  mode = 'plan',
}: NumberStepperProps) {
  const display = formatValue ? formatValue(value) : String(value);
  const isFocus = mode === 'focus';

  const handleDecrement = () => {
    Haptics.selectionAsync();
    onDecrement();
  };

  const handleIncrement = () => {
    Haptics.selectionAsync();
    onIncrement();
  };

  return (
    <View style={stepStyles.wrapper}>
      <Text style={stepStyles.label}>{label}</Text>
      <View style={[stepStyles.row, isFocus && stepStyles.rowFocus]}>
        <AnimatedPressable
          style={[stepStyles.btn, isFocus && stepStyles.btnFocus]}
          onPress={handleDecrement}
          activeScale={0.88}
          accessibilityLabel={`Decrease ${label}`}
          accessibilityRole="button"
        >
          <Text style={[stepStyles.btnText, isFocus && stepStyles.btnTextFocus]}>−</Text>
        </AnimatedPressable>

        <View style={stepStyles.display}>
          <RollingValue
            display={display}
            style={[stepStyles.value, isFocus ? stepStyles.valueFocus : undefined]}
          />
        </View>

        <AnimatedPressable
          style={[stepStyles.btn, isFocus && stepStyles.btnFocus]}
          onPress={handleIncrement}
          activeScale={0.88}
          accessibilityLabel={`Increase ${label}`}
          accessibilityRole="button"
        >
          <Text style={[stepStyles.btnText, isFocus && stepStyles.btnTextFocus]}>+</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

const stepStyles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 12,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    overflow: 'hidden',
  },
  rowFocus: {
    borderRadius: RADIUS.xl,
    borderColor: COLORS.border,
  },
  btn: {
    width: TAP_TARGETS.plan.recommended,
    height: TAP_TARGETS.plan.recommended + 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  btnFocus: {
    width: TAP_TARGETS.focus.min,
    height: TAP_TARGETS.focus.recommended,
  },
  btnText: {
    fontFamily: FONT_FAMILY.extraBold,
    fontSize: 26,
    color: COLORS.accent,
    lineHeight: 30,
  },
  btnTextFocus: {
    fontSize: 32,
    lineHeight: 36,
  },
  display: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  value: {
    fontFamily: FONT_FAMILY.extraBold,
    fontSize: 32,
    color: COLORS.text.primary,
    letterSpacing: -0.5,
  },
  valueFocus: {
    ...TYPOGRAPHY_V2.focus.target,
    color: COLORS.text.primary,
    letterSpacing: -0.5,
  },
});

// ---------------------------------------------------------------------------
// InputRow — standard weight + reps input row
// ---------------------------------------------------------------------------

interface InputRowProps {
  weight: number;
  reps: number;
  onWeightDecrement: () => void;
  onWeightIncrement: () => void;
  onRepsDecrement: () => void;
  onRepsIncrement: () => void;
  formatWeight?: (v: number) => string;
  mode?: 'plan' | 'focus';
}

export function InputRow({
  weight,
  reps,
  onWeightDecrement,
  onWeightIncrement,
  onRepsDecrement,
  onRepsIncrement,
  formatWeight,
  mode = 'plan',
}: InputRowProps) {
  return (
    <View style={inputRowStyles.container}>
      <NumberStepper
        value={weight}
        onDecrement={onWeightDecrement}
        onIncrement={onWeightIncrement}
        label="Weight"
        formatValue={formatWeight}
        mode={mode}
      />
      <NumberStepper
        value={reps}
        onDecrement={onRepsDecrement}
        onIncrement={onRepsIncrement}
        label="Reps"
        mode={mode}
      />
    </View>
  );
}

const inputRowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
});
