import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  COLORS,
  FONT_FAMILY,
  SPACING,
  RADIUS,
  SHADOWS,
  TYPOGRAPHY_V2,
  TAP_TARGETS,
} from '../../theme/theme';

// ---------------------------------------------------------------------------
// NumberStepper — weight or reps input with +/- buttons
// ---------------------------------------------------------------------------

interface NumberStepperProps {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  label: string;
  formatValue?: (v: number) => string;
  /** Size mode — focus uses larger tap targets and typography */
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

  return (
    <View style={stepStyles.wrapper}>
      <Text style={[stepStyles.label, isFocus && stepStyles.labelFocus]}>{label}</Text>
      <View style={[stepStyles.row, isFocus && stepStyles.rowFocus]}>
        <TouchableOpacity
          style={[stepStyles.btn, isFocus && stepStyles.btnFocus]}
          onPress={onDecrement}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={`Decrease ${label}`}
          accessibilityRole="button"
        >
          <Text style={[stepStyles.btnText, isFocus && stepStyles.btnTextFocus]}>−</Text>
        </TouchableOpacity>
        <View style={stepStyles.display}>
          <Text style={[stepStyles.value, isFocus && stepStyles.valueFocus]}>{display}</Text>
        </View>
        <TouchableOpacity
          style={[stepStyles.btn, isFocus && stepStyles.btnFocus]}
          onPress={onIncrement}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={`Increase ${label}`}
          accessibilityRole="button"
        >
          <Text style={[stepStyles.btnText, isFocus && stepStyles.btnTextFocus]}>+</Text>
        </TouchableOpacity>
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
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING.xs,
  },
  labelFocus: {
    ...TYPOGRAPHY_V2.focus.caption,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  rowFocus: {
    borderRadius: RADIUS.xl,
  },
  btn: {
    width: TAP_TARGETS.plan.min,
    height: TAP_TARGETS.plan.recommended + 8,
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
    fontSize: 22,
    color: COLORS.accent,
    lineHeight: 26,
  },
  btnTextFocus: {
    fontSize: 28,
    lineHeight: 32,
  },
  display: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  value: {
    fontFamily: FONT_FAMILY.extraBold,
    fontSize: 28,
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
        label="Weight (lbs)"
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
