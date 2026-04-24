import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { FoodPortionOption } from '../../lib/engine/types';
import { COLORS, FONT_FAMILY, SPACING, RADIUS } from '../theme/theme';

interface ServingSelectorProps {
  amountValue: number;
  setAmountValue: (value: number) => void;
  selectedPortion: FoodPortionOption;
  setSelectedPortion: (portion: FoodPortionOption) => void;
  portionOptions: FoodPortionOption[];
}

function formatPresetValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
}

export function ServingSelector({
  amountValue,
  setAmountValue,
  selectedPortion,
  setSelectedPortion,
  portionOptions,
}: ServingSelectorProps) {
  const quantityPresets = selectedPortion.unit === 'g'
    ? [50, 100, 150, 200]
    : [0.5, 1, 1.5, 2];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Amount</Text>
      <Text style={styles.helperText}>Pick portion and amount.</Text>

      <View style={styles.portionGrid}>
        {portionOptions.map((portion) => {
          const active = portion.id === selectedPortion.id;
          return (
            <TouchableOpacity
              key={portion.id}
              style={[styles.portionButton, active && styles.portionButtonActive]}
              onPress={() => setSelectedPortion(portion)}
              activeOpacity={0.75}
            >
              <Text style={[styles.portionText, active && styles.portionTextActive]}>
                {portion.label}
              </Text>
              <Text style={[styles.portionSubtext, active && styles.portionTextActive]}>
                {Math.round(portion.grams)}g
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.presetRow}>
        {quantityPresets.map((preset) => {
          const active = amountValue === preset;
          return (
            <TouchableOpacity
              key={`${selectedPortion.id}-${preset}`}
              style={[styles.presetButton, active && styles.presetActive]}
              onPress={() => setAmountValue(preset)}
              activeOpacity={0.75}
            >
              <Text style={[styles.presetText, active && styles.presetTextActive]}>
                {formatPresetValue(preset)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.customRow}>
        <Text style={styles.customLabel}>
          {selectedPortion.unit === 'g' ? 'Custom grams' : 'Custom quantity'}
        </Text>
        <TextInput
          style={styles.input}
          value={String(amountValue)}
          onChangeText={(text) => {
            const parsed = parseFloat(text);
            if (!Number.isNaN(parsed) && parsed > 0) {
              setAmountValue(parsed);
            }
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
  helperText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
    marginBottom: SPACING.md,
  },
  portionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  portionButton: {
    minWidth: 96,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.borderLight,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  portionButtonActive: {
    backgroundColor: COLORS.text.primary,
    borderColor: COLORS.text.primary,
  },
  portionText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  portionSubtext: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  portionTextActive: {
    color: COLORS.text.inverse,
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
    backgroundColor: COLORS.accent,
  },
  presetText: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
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
