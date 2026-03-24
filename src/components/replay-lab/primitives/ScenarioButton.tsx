import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY_V2 } from '../../../theme/theme';
import { AnimatedPressable } from '../../AnimatedPressable';

interface ScenarioButtonProps {
  selected: boolean;
  label: string;
  description: string;
  onPress: () => void;
}

export function ScenarioButton({ selected, label, description, onPress }: ScenarioButtonProps) {
  return (
    <AnimatedPressable
      onPress={onPress}
      style={[styles.button, selected && styles.buttonSelected]}
      accessibilityRole="button"
      accessibilityLabel={`Scenario: ${label}`}
      accessibilityState={{ selected }}
    >
      <Text style={[styles.title, selected && styles.titleSelected]}>{label}</Text>
      <Text style={styles.description}>{description}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSecondary,
    padding: SPACING.md,
    minHeight: 44,
  },
  buttonSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentLight,
    borderLeftWidth: 3,
  },
  title: {
    ...TYPOGRAPHY_V2.plan.body,
    fontFamily: TYPOGRAPHY_V2.plan.body.fontFamily,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  titleSelected: {
    color: COLORS.accent,
  },
  description: {
    marginTop: SPACING.xs,
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
});
