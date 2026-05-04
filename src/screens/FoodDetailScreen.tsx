import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Card } from '../components/Card';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { ProgressRing } from '../components/ProgressRing';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { ServingSelector } from '../components/ServingSelector';
import { IconChevronLeft } from '../components/icons';
import {
  FoodPortionOption,
  FoodSearchResult,
  MealType,
} from '../../lib/engine/types';
import type { FuelStackParamList } from '../navigation/types';
import {
  logFoodEntry,
  toggleFavorite,
  updateFoodEntry,
  upsertFoodItem,
} from '../../lib/api/nutritionService';
import { supabase } from '../../lib/supabase';
import { todayLocalDate } from '../../lib/utils/date';
import {
  COLORS,
  FONT_FAMILY,
  SPACING,
  RADIUS,
  SHADOWS,
  ANIMATION,
  GRADIENTS,
} from '../theme/theme';
import { resolveFoodDetailParams } from '../navigation/routeValidation';

type RouteParams = {
  FoodDetail: {
    foodItem: FoodSearchResult;
    mealType: MealType;
    date?: string;
    foodLogId?: string;
    initialAmountValue?: number;
    initialAmountUnit?: string;
    initialGrams?: number | null;
  };
};

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
};

const INVALID_FOOD_ROUTE_FALLBACK: FoodSearchResult = {
  key: 'invalid-food-route',
  user_id: null,
  source: 'custom',
  sourceType: 'custom',
  external_id: null,
  verified: false,
  searchRank: 0,
  off_barcode: null,
  name: 'Food unavailable',
  brand: null,
  image_url: null,
  baseAmount: 100,
  baseUnit: 'g',
  gramsPerPortion: 100,
  portionOptions: [{ id: 'grams', label: '100g', amount: 100, unit: 'g', grams: 100, isDefault: true }],
  serving_size_g: 100,
  serving_label: '100g',
  calories_per_serving: 0,
  protein_per_serving: 0,
  carbs_per_serving: 0,
  fat_per_serving: 0,
  is_supplement: false,
  badges: ['Custom'],
};

function getDefaultPortion(food: FoodSearchResult): FoodPortionOption {
  return food.portionOptions.find((option) => option.isDefault) ?? food.portionOptions[0];
}

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

export function FoodDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'FoodDetail'>>();
  const validatedParams = resolveFoodDetailParams(route.params);
  const safeParams: FuelStackParamList['FoodDetail'] = validatedParams ?? {
    foodItem: INVALID_FOOD_ROUTE_FALLBACK,
    mealType: 'snacks' as MealType,
  };
  const { mealType, date } = safeParams;
  const today = date ?? todayLocalDate();
  const isEditingEntry = Boolean(safeParams.foodLogId);

  const [foodItem] = useState(safeParams.foodItem);
  const [selectedPortion, setSelectedPortion] = useState<FoodPortionOption>(() =>
    getDefaultPortion(safeParams.foodItem)
  );
  const [amountValue, setAmountValue] = useState(
    safeParams.initialAmountValue ?? (safeParams.foodItem.baseUnit === 'g' ? 100 : 1)
  );
  const [saving, setSaving] = useState(false);
  const [favoriteOnSave, setFavoriteOnSave] = useState(false);

  useEffect(() => {
    const initialAmountUnit = safeParams.initialAmountUnit;
    if (!initialAmountUnit) {
      return;
    }

    const matchingPortion = foodItem.portionOptions.find((option) =>
      option.unit === initialAmountUnit || option.label === initialAmountUnit
    );

    if (matchingPortion) {
      setSelectedPortion(matchingPortion);
      return;
    }

    if (initialAmountUnit === 'g') {
      const gramsOption = foodItem.portionOptions.find((option) => option.unit === 'g');
      if (gramsOption) {
        setSelectedPortion(gramsOption);
      }
    }
  }, [foodItem.portionOptions, safeParams.initialAmountUnit]);

  const selectedGrams = useMemo(() => {
    if (selectedPortion.unit === 'g') {
      return amountValue;
    }

    if (selectedPortion.amount > 0) {
      return roundToTenth((amountValue / selectedPortion.amount) * selectedPortion.grams);
    }

    return roundToTenth(amountValue * selectedPortion.grams);
  }, [amountValue, selectedPortion]);

  const multiplier = useMemo(() => {
    const baseGrams = foodItem.serving_size_g > 0 ? foodItem.serving_size_g : 100;
    return selectedGrams / baseGrams;
  }, [foodItem.serving_size_g, selectedGrams]);

  const calories = Math.round(foodItem.calories_per_serving * multiplier);
  const protein = roundToTenth(foodItem.protein_per_serving * multiplier);
  const carbs = roundToTenth(foodItem.carbs_per_serving * multiplier);
  const fat = roundToTenth(foodItem.fat_per_serving * multiplier);

  const proteinProgress = Math.min(protein / 50, 1);
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

      const savedItem = await upsertFoodItem(foodItem, { userIdForCustom: session.user.id });
      const payload = {
        foodItem: savedItem,
        amountValue,
        amountUnit: selectedPortion.unit === 'portion' ? selectedPortion.label : selectedPortion.unit,
        grams: selectedGrams,
      };

      if (safeParams.foodLogId) {
        await updateFoodEntry(
          session.user.id,
          safeParams.foodLogId,
          payload,
          mealType,
          today
        );
      } else {
        await logFoodEntry(
          session.user.id,
          payload,
          mealType,
          today
        );
      }

      if (favoriteOnSave && !safeParams.foodLogId) {
        await toggleFavorite(session.user.id, savedItem.id);
      }

      navigation.navigate('NutritionHome');
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Failed to add food');
    } finally {
      setSaving(false);
    }
  };

  if (!validatedParams) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            accessibilityHint="Returns to the previous food screen."
            testID="food-detail-back"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <IconChevronLeft size={24} color={COLORS.text.primary} />
          </AnimatedPressable>
          <Text style={styles.title} numberOfLines={1}>Food unavailable</Text>
        </View>
        <View style={styles.invalidState}>
          <Text style={styles.invalidTitle}>This food link can&apos;t be opened.</Text>
          <Text style={styles.invalidBody}>Search again from Fuel to log a food safely.</Text>
          <AnimatedPressable style={styles.invalidButton} onPress={() => navigation.navigate('NutritionHome')}>
            <Text style={styles.invalidButtonText}>Back to Fuel</Text>
          </AnimatedPressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          accessibilityHint="Returns to the previous food screen."
          testID="food-detail-back"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <IconChevronLeft size={24} color={COLORS.text.primary} />
        </AnimatedPressable>
        <Text style={styles.title} numberOfLines={1}>
          {isEditingEntry ? 'Edit Food' : foodItem.name}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + SPACING.xxxl + 72 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Animated.View entering={FadeInDown.duration(ANIMATION.slow).springify()}>
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
              <View style={styles.badgeRow}>
                {foodItem.badges.map((badge) => (
                  <View key={badge} style={styles.badge}>
                    <Text style={styles.badgeText}>{badge}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.foodName}>{foodItem.name}</Text>
              <Text style={styles.foodBrand}>
                {foodItem.brand ? `${foodItem.brand} • ` : ''}
                {foodItem.serving_label}
              </Text>
            </View>
          </View>

          <ServingSelector
            amountValue={amountValue}
            setAmountValue={setAmountValue}
            selectedPortion={selectedPortion}
            setSelectedPortion={setSelectedPortion}
            portionOptions={foodItem.portionOptions}
          />

          <Card style={{ marginTop: SPACING.md }}>
            <Text style={styles.previewTitle}>Nutrition for this amount</Text>

            <View style={styles.calorieRow}>
              <AnimatedNumber value={calories} style={styles.calorieValue} />
              <Text style={styles.calorieUnit}> cal</Text>
            </View>

            <Text style={styles.gramCaption}>
              {Math.round(selectedGrams)}g logged to {MEAL_LABELS[mealType].toLowerCase()}
            </Text>

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

          <Card style={{ marginTop: SPACING.md }}>
            <Text style={styles.favoriteTitle}>Quick access</Text>
            <AnimatedPressable
              testID="food-detail-save-favorite"
              style={[styles.favoriteChip, favoriteOnSave && styles.favoriteChipActive]}
              onPress={() => setFavoriteOnSave((current) => !current)}
            >
              <Text style={[styles.favoriteChipText, favoriteOnSave && styles.favoriteChipTextActive]}>
                {favoriteOnSave ? 'Will save to Favorites' : 'Save to Favorites'}
              </Text>
            </AnimatedPressable>
          </Card>
        </Animated.View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + SPACING.md }]}>
        <AnimatedPressable
          testID="food-detail-submit"
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
              {saving ? 'Saving...' : isEditingEntry ? 'Save Changes' : `Add to ${MEAL_LABELS[mealType]}`}
            </Text>
          </LinearGradient>
        </AnimatedPressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scroll: {
    flex: 1,
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
  invalidState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  invalidTitle: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  invalidBody: {
    marginTop: SPACING.sm,
    fontSize: 14,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  invalidButton: {
    marginTop: SPACING.lg,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invalidButtonText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.inverse,
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
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  badge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 3,
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
    marginBottom: SPACING.sm,
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
  gramCaption: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
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
  favoriteTitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
  favoriteChip: {
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surface,
  },
  favoriteChipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  favoriteChipText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  favoriteChipTextActive: {
    color: COLORS.text.inverse,
  },
  bottomBar: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    backgroundColor: 'transparent',
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
