import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { COLORS, FONT_FAMILY, SPACING, RADIUS } from '../theme/theme';

interface EquipmentSelectorProps {
  selected: string[];
  onChange: (items: string[]) => void;
}

interface EquipmentCategory {
  title: string;
  items: string[];
}

const EQUIPMENT_CATEGORIES: EquipmentCategory[] = [
  {
    title: 'FREE WEIGHTS',
    items: ['barbell', 'dumbbells', 'kettlebells'],
  },
  {
    title: 'MACHINES',
    items: [
      'smith_machine',
      'leg_press_machine',
      'cable_crossover',
      'lat_pulldown_machine',
    ],
  },
  {
    title: 'CARDIO',
    items: ['assault_bike', 'rowing_machine'],
  },
  {
    title: 'ACCESSORIES',
    items: ['cables', 'resistance_bands', 'medicine_balls', 'sled'],
  },
  {
    title: 'BOXING',
    items: ['heavy_bag'],
  },
];

function formatLabel(item: string): string {
  return item
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function Chip({
  label,
  isSelected,
  onToggle,
}: {
  label: string;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, isSelected && styles.chipSelected]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function EquipmentSelector({
  selected,
  onChange,
}: EquipmentSelectorProps) {
  const handleToggle = useCallback(
    (item: string) => {
      if (selected.includes(item)) {
        onChange(selected.filter((s) => s !== item));
      } else {
        onChange([...selected, item]);
      }
    },
    [selected, onChange]
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {EQUIPMENT_CATEGORIES.map((category, catIdx) => (
        <Animated.View
          key={category.title}
          entering={FadeInDown.delay(catIdx * 80).duration(350)}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>{category.title}</Text>
          <View style={styles.chipGrid}>
            {category.items.map((item) => (
              <Chip
                key={item}
                label={formatLabel(item)}
                isSelected={selected.includes(item)}
                onToggle={() => handleToggle(item)}
              />
            ))}
          </View>
        </Animated.View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingVertical: SPACING.sm,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 11,
    color: COLORS.text.secondary,
    letterSpacing: 1.2,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chip: {
    backgroundColor: COLORS.surfaceSecondary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  chipText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    color: COLORS.text.primary,
  },
  chipTextSelected: {
    fontFamily: FONT_FAMILY.semiBold,
    color: '#FFFFFF',
  },
});
