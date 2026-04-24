import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS } from '../theme/theme';

interface Props {
  value?: number | null;
  onChange?: (value: number) => void;
  onSelect?: (value: number) => void;
}

const COLORS_SCALE = [
  { value: 1, hex: '#FEFCE8', label: 'Clear'        },
  { value: 2, hex: '#FEF9C3', label: 'Pale yellow'  },
  { value: 3, hex: '#FEF08A', label: 'Light yellow' },
  { value: 4, hex: '#FDE047', label: 'Yellow'       },
  { value: 5, hex: '#EAB308', label: 'Dark yellow'  },
  { value: 6, hex: '#CA8A04', label: 'Amber'        },
  { value: 7, hex: '#92400E', label: 'Orange-brown' },
  { value: 8, hex: '#431407', label: 'Brown'        },
];

const STATUS_MESSAGES: Record<number, { text: string; color: string }> = {
  1: { text: 'Over-hydrated — slightly reduce water intake', color: '#8C6A1E' },
  2: { text: 'Excellent hydration', color: '#B7D9A8' },
  3: { text: 'Well hydrated', color: '#B7D9A8' },
  4: { text: 'Adequately hydrated', color: '#B7D9A8' },
  5: { text: 'Mildly dehydrated — drink more water', color: '#B8892D' },
  6: { text: 'Dehydrated — increase intake now', color: '#B8892D' },
  7: { text: 'Significantly dehydrated — DANGER', color: '#D9827E' },
  8: { text: 'Severely dehydrated — seek medical attention', color: '#D9827E' },
};

export function UrineColorPicker({ value = null, onChange, onSelect }: Props) {
  const handleSelect = (v: number) => {
    onChange?.(v);
    onSelect?.(v);
  };
  const status = value ? STATUS_MESSAGES[value] : null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Urine Color</Text>
      <Text style={styles.subtitle}>Tap the swatch that best matches</Text>

      <View style={styles.swatchRow}>
        {COLORS_SCALE.map(item => {
          const isSelected = value === item.value;
          return (
            <TouchableOpacity
              key={item.value}
              onPress={() => handleSelect(item.value)}
              activeOpacity={0.75}
              style={[
                styles.swatch,
                { backgroundColor: item.hex },
                isSelected && styles.swatchSelected,
              ]}
            >
              {isSelected && (
                <View style={styles.checkMark}>
                  <Text style={styles.checkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Scale numbers */}
      <View style={styles.numberRow}>
        {COLORS_SCALE.map(item => (
          <Text
            key={item.value}
            style={[styles.scaleNumber, value === item.value && styles.scaleNumberActive]}
          >
            {item.value}
          </Text>
        ))}
      </View>

      {/* Status message */}
      {status && (
        <View style={[styles.statusBar, { borderColor: status.color + '40', backgroundColor: status.color + '15' }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
        </View>
      )}

      {value && (
        <Text style={styles.selectedLabel}>
          Selected: {COLORS_SCALE.find(c => c.value === value)?.label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  label: { fontFamily: FONT_FAMILY.semiBold, fontSize: 15, color: COLORS.text.primary, marginBottom: 2 },
  subtitle: { fontFamily: FONT_FAMILY.regular, fontSize: 12, color: COLORS.text.secondary, marginBottom: SPACING.sm },
  swatchRow: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  swatch: {
    flex: 1,
    height: 40,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swatchSelected: {
    borderWidth: 2.5,
    borderColor: COLORS.text.primary,
  },
  checkMark: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkText: { fontSize: 11, color: '#fff', fontFamily: FONT_FAMILY.semiBold },
  numberRow: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 4,
    marginBottom: SPACING.xs,
  },
  scaleNumber: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
    color: COLORS.text.tertiary,
  },
  scaleNumberActive: {
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  statusBar: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.sm,
    marginTop: SPACING.xs,
  },
  statusText: { fontFamily: FONT_FAMILY.semiBold, fontSize: 13, textAlign: 'center' },
  selectedLabel: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: 4,
  },
});
