import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY_V2 } from '../../../theme/theme';
import { AnimatedPressable } from '../../AnimatedPressable';

interface PillButtonProps {
  active: boolean;
  label: string;
  onPress: () => void;
  size?: 'sm' | 'md';
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function PillButton({
  active,
  label,
  onPress,
  size = 'md',
  disabled = false,
  accessibilityLabel: a11yLabel,
}: PillButtonProps) {
  const small = size === 'sm';

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.pill,
        small && styles.pillSmall,
        active && styles.pillActive,
        disabled && styles.pillDisabled,
      ]}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel ?? label}
      accessibilityState={{ selected: active, disabled }}
    >
      <Text style={[styles.text, small && styles.textSmall, active && styles.textActive]}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceSecondary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillSmall: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    minHeight: 36,
  },
  pillActive: {
    backgroundColor: COLORS.accent,
  },
  pillDisabled: {
    opacity: 0.45,
  },
  text: {
    ...TYPOGRAPHY_V2.plan.caption,
    fontFamily: TYPOGRAPHY_V2.plan.caption.fontFamily,
    color: COLORS.text.primary,
  },
  textSmall: {
    fontSize: 12,
  },
  textActive: {
    color: COLORS.text.inverse,
  },
});
