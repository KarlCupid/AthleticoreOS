import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS } from '../theme/theme';

interface ServingSelectorProps {
  servings: number;
  setServings: (val: number) => void;
  servingLabel: string;
}

const PRESETS = [0.5, 1, 1.5, 2];

export function ServingSelector({
  servings,
  setServings,
  servingLabel,
}: ServingSelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Servings</Text>
      <Text style={styles.servingLabel}>{servingLabel}</Text>

      <View style={styles.presetRow}>
        {PRESETS.map((preset) => (
          <TouchableOpacity
            key={preset}
            style={[
              styles.presetButton,
              servings === preset && styles.presetActive,
            ]}
            onPress={() => setServings(preset)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.presetText,
                servings === preset && styles.presetTextActive,
              ]}
            >
              {preset}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.customRow}>
        <Text style={styles.customLabel}>Custom</Text>
        <TextInput
          style={styles.input}
          value={String(servings)}
          onChangeText={(text) => {
            const num = parseFloat(text);
            if (!isNaN(num) && num > 0) setServings(num);
          }}
          keyboardType="decimal-pad"
          selectTextOnFocus
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.md,
  },
  label: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  servingLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
    marginBottom: SPACING.md,
  },
  presetRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  presetButton: {
    flex: 1,
    paddingVertical: SPACING.sm + 4,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
  },
  presetActive: {
    backgroundColor: COLORS.text.primary,
  },
  presetText: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
  },
  presetTextActive: {
    color: COLORS.text.inverse,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  customLabel: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: 16,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
    textAlign: 'center',
  },
});
