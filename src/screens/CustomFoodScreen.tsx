import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS, ANIMATION, GRADIENTS } from '../theme/theme';
import { Card } from '../components/Card';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { IconChevronLeft } from '../components/icons';
import { createCustomFood } from '../../lib/api/nutritionService';
import { supabase } from '../../lib/supabase';
import type { FoodItemRow, FoodPortionOption, FoodSearchResult, MealType } from '../../lib/engine/types';
import { resolveCustomFoodParams } from '../navigation/routeValidation';

const STAGGER_DELAY = 60;

type RouteParams = {
  CustomFood: { mealType?: MealType; date?: string } | undefined;
};

function buildFallbackPortionOptions(row: FoodItemRow): FoodPortionOption[] {
  return [
    {
      id: 'default',
      label: row.serving_label,
      amount: 1,
      unit: 'serving',
      grams: row.serving_size_g,
      isDefault: true,
    },
  ];
}

function buildFoodSearchResult(row: FoodItemRow): FoodSearchResult {
  const portionOptions =
    row.portion_options && row.portion_options.length > 0
      ? row.portion_options
      : buildFallbackPortionOptions(row);

  return {
    key: `${row.source}:${row.external_id ?? row.id}`,
    id: row.id,
    user_id: row.user_id,
    source: row.source,
    sourceType: row.source_type,
    external_id: row.external_id,
    verified: row.verified,
    searchRank: 0,
    off_barcode: row.off_barcode,
    name: row.name,
    brand: row.brand,
    image_url: row.image_url,
    baseAmount: row.base_amount,
    baseUnit: row.base_unit,
    gramsPerPortion: row.grams_per_portion,
    portionOptions,
    serving_size_g: row.serving_size_g,
    serving_label: row.serving_label,
    calories_per_serving: row.calories_per_serving,
    protein_per_serving: row.protein_per_serving,
    carbs_per_serving: row.carbs_per_serving,
    fat_per_serving: row.fat_per_serving,
    is_supplement: row.is_supplement,
    badges: ['Custom', 'Verified'],
  };
}

export function CustomFoodScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'CustomFood'>>();
  const customFoodParams = resolveCustomFoodParams(route.params);
  const mealType = customFoodParams?.mealType;
  const date = customFoodParams?.date;

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [servingSize, setServingSize] = useState('100');
  const [servingLabel, setServingLabel] = useState('100g');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [isSupplement, setIsSupplement] = useState(false);
  const [saving, setSaving] = useState(false);

  const canSave = name.trim().length > 0 && calories.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        Alert.alert('Error', 'Not signed in');
        return;
      }

      const savedFood = await createCustomFood(session.user.id, {
        name: name.trim(),
        brand: brand.trim() || undefined,
        serving_size_g: parseFloat(servingSize) || 100,
        serving_label: servingLabel.trim() || '100g',
        calories_per_serving: parseFloat(calories) || 0,
        protein_per_serving: parseFloat(protein) || 0,
        carbs_per_serving: parseFloat(carbs) || 0,
        fat_per_serving: parseFloat(fat) || 0,
        is_supplement: isSupplement,
      });

      if (mealType) {
        navigation.replace('FoodDetail', {
          foodItem: buildFoodSearchResult(savedFood),
          mealType,
          date,
        });
        return;
      }

      Alert.alert('Saved', `${name.trim()} has been created.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

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
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <IconChevronLeft size={24} color={COLORS.text.primary} />
        </AnimatedPressable>
        <Text style={styles.title}>Create Custom Food</Text>
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
        <Animated.View entering={FadeInDown.delay(STAGGER_DELAY).duration(ANIMATION.slow).springify()}>
          <Card>
            <Field label="Name *" value={name} onChangeText={setName} placeholder="e.g. Protein shake" />
            <Field label="Brand" value={brand} onChangeText={setBrand} placeholder="Optional" />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Serving size (g)"
                  value={servingSize}
                  onChangeText={setServingSize}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Serving label"
                  value={servingLabel}
                  onChangeText={setServingLabel}
                  placeholder="e.g. 1 scoop"
                />
              </View>
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(STAGGER_DELAY * 2).duration(ANIMATION.slow).springify()}>
          <Card style={{ marginTop: SPACING.md }}>
            <Text style={styles.sectionTitle}>Nutrition per serving</Text>
            <Field
              label="Calories *"
              value={calories}
              onChangeText={setCalories}
              keyboardType="decimal-pad"
              placeholder="0"
            />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Protein (g)"
                  value={protein}
                  onChangeText={setProtein}
                  keyboardType="decimal-pad"
                  placeholder="0"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Carbs (g)"
                  value={carbs}
                  onChangeText={setCarbs}
                  keyboardType="decimal-pad"
                  placeholder="0"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Fat (g)"
                  value={fat}
                  onChangeText={setFat}
                  keyboardType="decimal-pad"
                  placeholder="0"
                />
              </View>
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(STAGGER_DELAY * 3).duration(ANIMATION.slow).springify()}>
          <Card style={{ marginTop: SPACING.md }}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>This is a supplement</Text>
              <Switch
                accessibilityRole="switch"
                accessibilityLabel="Supplement food"
                accessibilityHint="Marks this custom food as a supplement."
                value={isSupplement}
                onValueChange={setIsSupplement}
                trackColor={{ true: COLORS.chart.protein, false: COLORS.border }}
                thumbColor={COLORS.text.primary}
              />
            </View>
          </Card>
        </Animated.View>

      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + SPACING.md }]}>
        <AnimatedPressable
          testID="custom-food-submit"
          accessibilityRole="button"
          accessibilityLabel={saving ? 'Saving custom food' : 'Save custom food'}
          accessibilityHint="Creates this food item and returns it to the current meal flow."
          accessibilityState={{ disabled: !canSave || saving, busy: saving }}
          style={[styles.saveButtonWrapper, (!canSave || saving) && { opacity: 0.4 }]}
          onPress={handleSave}
          disabled={!canSave || saving}
        >
          <LinearGradient
            colors={[...GRADIENTS.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveButtonGradient}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save Food'}
            </Text>
          </LinearGradient>
        </AnimatedPressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad';
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={fieldStyles.container}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label.replace(' *', '')}
        style={[
          fieldStyles.input,
          focused && { borderColor: COLORS.accent, ...SHADOWS.sm },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.text.tertiary}
        keyboardType={keyboardType ?? 'default'}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs + 2,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: 15,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.primary,
  },
});

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
    minWidth: 44,
    minHeight: 44,
    marginRight: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
  },
  content: {
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.primary,
  },
  bottomBar: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    backgroundColor: 'transparent',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  saveButtonWrapper: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.colored.accent,
  },
  saveButtonGradient: {
    minHeight: 52,
    paddingVertical: SPACING.md + 2,
    alignItems: 'center',
    borderRadius: RADIUS.lg,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.inverse,
  },
});
