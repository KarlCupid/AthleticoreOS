import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { FoodSearchResult } from '../../lib/engine/types';
import { COLORS, FONT_FAMILY, SPACING, RADIUS } from '../theme/theme';
import { IconPlus } from './icons';

interface FoodSearchItemProps {
  item: FoodSearchResult;
  onSelect: (item: FoodSearchResult) => void;
}

export function FoodSearchItem({ item, onSelect }: FoodSearchItemProps) {
  const hasNutrition = item.calories_per_serving > 0;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onSelect(item)}
      activeOpacity={0.75}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.placeholderText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      <View style={styles.info}>
        <View style={styles.badgeRow}>
          {item.badges.slice(0, 3).map((badge) => (
            <View key={`${item.key}-${badge}`} style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.detail} numberOfLines={1}>
          {item.brand ? `${item.brand} • ` : ''}
          {item.serving_label}
          {!hasNutrition ? ' • No nutrition data' : ''}
        </Text>
      </View>

      <View style={styles.right}>
        <Text style={styles.calories}>
          {Math.round(item.calories_per_serving)} cal
        </Text>
        <View style={styles.macroRow}>
          <Text style={[styles.macro, { color: COLORS.chart.protein }]}>
            P{Math.round(item.protein_per_serving)}
          </Text>
          <Text style={[styles.macro, { color: COLORS.chart.carbs }]}>
            C{Math.round(item.carbs_per_serving)}
          </Text>
          <Text style={[styles.macro, { color: COLORS.chart.fat }]}>
            F{Math.round(item.fat_per_serving)}
          </Text>
        </View>
      </View>

      <View style={styles.addIcon}>
        <IconPlus size={18} color={COLORS.text.tertiary} strokeWidth={2} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 4,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderLight,
  },
  image: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    marginRight: SPACING.md,
  },
  imagePlaceholder: {
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
  },
  info: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  badge: {
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
    textTransform: 'uppercase',
  },
  name: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  detail: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
    marginRight: SPACING.sm,
  },
  calories: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  macroRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  macro: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.semiBold,
  },
  addIcon: {
    padding: SPACING.xs,
  },
});
