import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';
import { IconPlus, IconChevronRight } from './icons';
import { MealType } from '../../lib/engine/types';
import type { MealLogEntryViewModel } from '../hooks/fuel/types';

interface MealSectionProps {
  mealType: MealType;
  foods: MealLogEntryViewModel[];
  subtotalCalories: number;
  onAddFood: () => void;
  onSelectFood: (foodLogId: string) => void;
  onRemoveFood: (foodLogId: string) => void;
}

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
};

const MEAL_ICONS: Record<MealType, string> = {
  breakfast: '\u2600\uFE0F',
  lunch: '\uD83C\uDF5C',
  dinner: '\uD83C\uDF19',
  snacks: '\uD83C\uDF4E',
};

export function MealSection({
  mealType,
  foods,
  subtotalCalories,
  onAddFood,
  onSelectFood,
  onRemoveFood,
}: MealSectionProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.mealIcon}>{MEAL_ICONS[mealType]}</Text>
          <Text style={styles.mealLabel}>{MEAL_LABELS[mealType]}</Text>
          <Text style={styles.itemCount}>
            {foods.length > 0 ? `${foods.length} item${foods.length > 1 ? 's' : ''}` : ''}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.calories}>
            {subtotalCalories > 0 ? `${Math.round(subtotalCalories)} cal` : ''}
          </Text>
          <View style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}>
            <IconChevronRight size={16} color={COLORS.text.tertiary} />
          </View>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.body}>
          {foods.map((food) => (
            <TouchableOpacity
              key={food.id}
              style={styles.foodRow}
              onPress={() => onSelectFood(food.id)}
              onLongPress={() => onRemoveFood(food.id)}
              activeOpacity={0.7}
            >
              <View style={styles.foodInfo}>
                <Text style={styles.foodName} numberOfLines={1}>
                  {food.foodName}
                </Text>
                <Text style={styles.foodDetail}>
                  {food.amountLabel}
                  {food.foodBrand ? ` \u2022 ${food.foodBrand}` : ''}
                </Text>
              </View>
              <Text style={styles.foodCalories}>{Math.round(food.loggedCalories)}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.addButton} onPress={onAddFood} activeOpacity={0.7}>
            <IconPlus size={16} color={COLORS.text.tertiary} strokeWidth={2} />
            <Text style={styles.addText}>Add Food</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.sm + 4,
    ...SHADOWS.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  mealIcon: {
    fontSize: 18,
  },
  mealLabel: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  itemCount: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  calories: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
  },
  body: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  foodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderLight,
  },
  foodInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  foodName: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  foodDetail: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
    marginTop: 1,
  },
  foodCalories: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm + 4,
    marginTop: SPACING.xs,
    gap: SPACING.xs + 2,
  },
  addText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
  },
});
