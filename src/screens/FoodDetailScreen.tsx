import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS, ANIMATION, GRADIENTS } from '../theme/theme';
import { Card } from '../components/Card';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { ProgressRing } from '../components/ProgressRing';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { ServingSelector } from '../components/ServingSelector';
import { IconChevronLeft } from '../components/icons';
import { FoodItemRow, MealType } from '../../lib/engine/types';
import { upsertFoodItem, logFoodEntry } from '../../lib/api/nutritionService';
import { supabase } from '../../lib/supabase';
import { todayLocalDate } from '../../lib/utils/date';

type RouteParams = {
  FoodDetail: {
    foodItem: FoodItemRow | Omit<FoodItemRow, 'id'>;
    mealType: MealType;
    date?: string;
  };
};

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
};

export function FoodDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'FoodDetail'>>();
  const { foodItem, mealType, date } = route.params;
  const today = date ?? todayLocalDate();

  const [servings, setServings] = useState(1);
  const [saving, setSaving] = useState(false);

  const cal = Math.round(foodItem.calories_per_serving * servings);
  const protein = Math.round(foodItem.protein_per_serving * servings * 10) / 10;
  const carbs = Math.round(foodItem.carbs_per_serving * servings * 10) / 10;
  const fat = Math.round(foodItem.fat_per_serving * servings * 10) / 10;

  // Calculate progress for rings (based on reasonable daily targets)
  const proteinProgress = Math.min(protein / 50, 1); // 50g per serving is max
  const carbsProgress = Math.min(carbs / 80, 1);
  const fatProgress = Math.min(fat / 30, 1);

  const handleAdd = async () => {
    setSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        Alert.alert('Error', 'Not signed in');
        return;
      }

      // Upsert food item to DB (ensures it has an id)
      const savedItem = await upsertFoodItem(foodItem as Omit<FoodItemRow, 'id'>);

      // Log the food entry
      await logFoodEntry(session.user.id, savedItem, mealType, servings, today);

      // Go back to NutritionScreen
      navigation.navigate('NutritionHome');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to add food');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <AnimatedPressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <IconChevronLeft size={24} color={COLORS.text.primary} />
        </AnimatedPressable>
        <Text style={styles.title} numberOfLines={1}>
          {foodItem.name}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(ANIMATION.slow).springify()}>
          {/* Food Info */}
          <View style={styles.foodInfoRow}>
            {foodItem.image_url ? (
              <Image source={{ uri: foodItem.image_url }} style={styles.foodImage} />
            ) : (
              <View style={[styles.foodImage, styles.imagePlaceholder]}>
                <Text style={styles.placeholderText}>
                  {foodItem.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.foodInfo}>
              <Text style={styles.foodName}>{foodItem.name}</Text>
              {foodItem.brand && (
                <Text style={styles.foodBrand}>{foodItem.brand}</Text>
              )}
            </View>
          </View>

          {/* Serving Selector */}
          <ServingSelector
            servings={servings}
            setServings={setServings}
            servingLabel={foodItem.serving_label}
          />

          {/* Live Macro Preview with ProgressRings */}
          <Card style={{ marginTop: SPACING.md }}>
            <Text style={styles.previewTitle}>Nutrition for {servings} serving{servings !== 1 ? 's' : ''}</Text>

            {/* Calorie display */}
            <View style={styles.calorieRow}>
              <AnimatedNumber value={cal} style={styles.calorieValue} />
              <Text style={styles.calorieUnit}> cal</Text>
            </View>

            {/* Macro ProgressRings */}
            <View style={styles.macroRingGrid}>
              <View style={styles.macroRingItem}>
                <ProgressRing
                  progress={proteinProgress}
                  size={56}
                  strokeWidth={5}
                  color={COLORS.chart.protein}
                  label={`${Math.round(protein)}`}
                />
                <Text style={styles.macroRingLabel}>Protein</Text>
              </View>
              <View style={styles.macroRingItem}>
                <ProgressRing
                  progress={carbsProgress}
                  size={56}
                  strokeWidth={5}
                  color={COLORS.chart.carbs}
                  label={`${Math.round(carbs)}`}
                />
                <Text style={styles.macroRingLabel}>Carbs</Text>
              </View>
              <View style={styles.macroRingItem}>
                <ProgressRing
                  progress={fatProgress}
                  size={56}
                  strokeWidth={5}
                  color={COLORS.chart.fat}
                  label={`${Math.round(fat)}`}
                />
                <Text style={styles.macroRingLabel}>Fat</Text>
              </View>
            </View>
          </Card>
        </Animated.View>
      </ScrollView>

      {/* Add Button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + SPACING.md }]}>
        <AnimatedPressable
          style={[styles.addButtonWrapper, saving && { opacity: 0.6 }]}
          onPress={handleAdd}
          disabled={saving}
        >
          <LinearGradient
            colors={[...GRADIENTS.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.addButtonGradient}
          >
            <Text style={styles.addButtonText}>
              {saving ? 'Adding...' : `Add to ${MEAL_LABELS[mealType]}`}
            </Text>
          </LinearGradient>
        </AnimatedPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  backButton: {
    padding: SPACING.sm,
    marginRight: SPACING.sm,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
  },
  content: {
    padding: SPACING.lg,
  },
  foodInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  foodImage: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.lg,
    marginRight: SPACING.md,
  },
  imagePlaceholder: {
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 24,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
  },
  foodBrand: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  previewTitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
  },
  calorieRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  calorieValue: {
    fontSize: 28,
    fontFamily: FONT_FAMILY.black,
    color: COLORS.text.primary,
  },
  calorieUnit: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
  },
  macroRingGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroRingItem: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  macroRingLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  bottomBar: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    backgroundColor: COLORS.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  addButtonWrapper: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.colored.accent,
  },
  addButtonGradient: {
    paddingVertical: SPACING.md + 2,
    alignItems: 'center',
    borderRadius: RADIUS.lg,
  },
  addButtonText: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.inverse,
  },
});

