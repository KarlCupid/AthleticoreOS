import type {
  FoodNutritionSnapshot,
  FoodItemRow,
  FoodLogRow,
  FoodPortionOption,
  FoodSearchResult,
  MealType,
} from '../../../lib/engine/types';
import { calculateCaloriesFromMacros } from '../../../lib/utils/nutrition';
import { computeActualNutrition, type DashboardNutritionTotals } from '../dashboard/utils';
import type {
  FuelHistoryDay,
  HydrationEntryViewModel,
  MealLogEntryViewModel,
} from './types';

type FoodLogRowWithRelations = FoodLogRow & {
  created_at?: string | null;
  food_items?: Partial<FoodItemRow> | null;
};

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

function buildFallbackPortionOptions(input: {
  servingLabel?: string | null;
  servingSizeG?: number | null;
  baseAmount?: number | null;
  baseUnit?: string | null;
}): FoodPortionOption[] {
  const baseAmount = input.baseAmount && input.baseAmount > 0 ? input.baseAmount : 1;
  const baseUnit = input.baseUnit?.trim() || 'serving';
  const servingSizeG = input.servingSizeG && input.servingSizeG > 0 ? input.servingSizeG : 100;
  const servingLabel =
    input.servingLabel?.trim() ||
    (baseUnit === 'g' ? `${baseAmount}g` : `${baseAmount} ${baseUnit}`);

  return [
    {
      id: 'default',
      label: servingLabel,
      amount: baseAmount,
      unit: baseUnit,
      grams: servingSizeG,
      isDefault: true,
    },
  ];
}

function normalizeSnapshot(
  row: Pick<
    FoodItemRow,
    | 'source'
    | 'source_type'
    | 'external_id'
    | 'verified'
    | 'off_barcode'
    | 'name'
    | 'brand'
    | 'image_url'
    | 'base_amount'
    | 'base_unit'
    | 'grams_per_portion'
    | 'portion_options'
    | 'serving_size_g'
    | 'serving_label'
    | 'calories_per_serving'
    | 'protein_per_serving'
    | 'carbs_per_serving'
    | 'fat_per_serving'
    | 'is_supplement'
  >,
): FoodNutritionSnapshot {
  return {
    source: row.source,
    sourceType: row.source_type,
    external_id: row.external_id,
    verified: row.verified,
    name: row.name,
    brand: row.brand,
    image_url: row.image_url,
    baseAmount: row.base_amount,
    baseUnit: row.base_unit,
    gramsPerPortion: row.grams_per_portion,
    portionOptions:
      row.portion_options && row.portion_options.length > 0
        ? row.portion_options
        : buildFallbackPortionOptions({
          servingLabel: row.serving_label,
          servingSizeG: row.serving_size_g,
          baseAmount: row.base_amount,
          baseUnit: row.base_unit,
        }),
    serving_size_g: row.serving_size_g,
    serving_label: row.serving_label,
    calories_per_serving: row.calories_per_serving,
    protein_per_serving: row.protein_per_serving,
    carbs_per_serving: row.carbs_per_serving,
    fat_per_serving: row.fat_per_serving,
    is_supplement: row.is_supplement,
  };
}

function toFoodSearchResult(snapshot: FoodNutritionSnapshot, fallbackId: string): FoodSearchResult {
  return {
    key: `${snapshot.source}:${snapshot.external_id ?? fallbackId}`,
    id: fallbackId,
    user_id: null,
    source: snapshot.source,
    sourceType: snapshot.sourceType,
    external_id: snapshot.external_id,
    verified: snapshot.verified,
    searchRank: 0,
    off_barcode: null,
    name: snapshot.name,
    brand: snapshot.brand,
    image_url: snapshot.image_url,
    baseAmount: snapshot.baseAmount,
    baseUnit: snapshot.baseUnit,
    gramsPerPortion: snapshot.gramsPerPortion,
    portionOptions:
      snapshot.portionOptions.length > 0
        ? snapshot.portionOptions
        : buildFallbackPortionOptions({
          servingLabel: snapshot.serving_label,
          servingSizeG: snapshot.serving_size_g,
          baseAmount: snapshot.baseAmount,
          baseUnit: snapshot.baseUnit,
        }),
    serving_size_g: snapshot.serving_size_g,
    serving_label: snapshot.serving_label,
    calories_per_serving: snapshot.calories_per_serving,
    protein_per_serving: snapshot.protein_per_serving,
    carbs_per_serving: snapshot.carbs_per_serving,
    fat_per_serving: snapshot.fat_per_serving,
    is_supplement: snapshot.is_supplement,
    badges: snapshot.verified ? ['Verified'] : [],
  };
}

export function formatLoggedAmount(entry: Pick<FoodLogRow, 'amount_value' | 'amount_unit'> & {
  nutrition_snapshot?: FoodNutritionSnapshot | null;
  food_items?: Partial<FoodItemRow> | null;
}): string {
  const amountValue = entry.amount_value ?? 1;
  const amountUnit = entry.amount_unit ?? 'serving';
  const roundedValue = Number.isInteger(amountValue)
    ? String(amountValue)
    : roundToTenth(amountValue).toFixed(1).replace(/\.0$/, '');

  if (amountUnit === 'g') {
    return `${roundedValue}g`;
  }

  if (amountUnit === 'serving') {
    const servingLabel = entry.nutrition_snapshot?.serving_label ?? entry.food_items?.serving_label ?? 'serving';
    return `${roundedValue} x ${servingLabel}`;
  }

  return `${roundedValue} x ${amountUnit}`;
}

export function buildFoodItemFromLogEntry(entry: FoodLogRowWithRelations): FoodSearchResult | null {
  const snapshot = entry.nutrition_snapshot
    ?? (entry.food_items
      ? normalizeSnapshot({
        source: entry.food_items.source ?? 'custom',
        source_type: entry.food_items.source_type ?? 'custom',
        external_id: entry.food_items.external_id ?? null,
        verified: entry.food_items.verified ?? false,
        off_barcode: entry.food_items.off_barcode ?? null,
        name: entry.food_items.name ?? 'Unknown food',
        brand: entry.food_items.brand ?? null,
        image_url: entry.food_items.image_url ?? null,
        base_amount: entry.food_items.base_amount ?? 1,
        base_unit: entry.food_items.base_unit ?? 'serving',
        grams_per_portion: entry.food_items.grams_per_portion ?? null,
        portion_options: entry.food_items.portion_options ?? null,
        serving_size_g: entry.food_items.serving_size_g ?? 100,
        serving_label: entry.food_items.serving_label ?? 'serving',
        calories_per_serving: entry.food_items.calories_per_serving ?? 0,
        protein_per_serving: entry.food_items.protein_per_serving ?? 0,
        carbs_per_serving: entry.food_items.carbs_per_serving ?? 0,
        fat_per_serving: entry.food_items.fat_per_serving ?? 0,
        is_supplement: entry.food_items.is_supplement ?? false,
      })
      : null);

  if (!snapshot) {
    return null;
  }

  return toFoodSearchResult(snapshot, entry.food_item_id);
}

export function buildFoodSearchResultFromFoodItemRow(row: FoodItemRow): FoodSearchResult {
  return toFoodSearchResult(normalizeSnapshot(row), row.id);
}

export function buildMealGroups(foodLog: FoodLogRowWithRelations[]): Record<MealType, MealLogEntryViewModel[]> {
  const grouped: Record<MealType, MealLogEntryViewModel[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snacks: [],
  };

  for (const entry of foodLog) {
    const mealType = entry.meal_type;
    const foodItem = buildFoodItemFromLogEntry(entry);
    if (!foodItem || !grouped[mealType]) {
      continue;
    }

    grouped[mealType].push({
      id: entry.id,
      mealType,
      foodName: entry.nutrition_snapshot?.name ?? entry.food_items?.name ?? 'Unknown food',
      foodBrand: entry.nutrition_snapshot?.brand ?? entry.food_items?.brand ?? null,
      amountLabel: formatLoggedAmount(entry),
      loggedCalories: entry.logged_calories,
      loggedProtein: entry.logged_protein,
      loggedCarbs: entry.logged_carbs,
      loggedFat: entry.logged_fat,
      amountValue: entry.amount_value ?? entry.servings ?? 1,
      amountUnit: entry.amount_unit ?? 'serving',
      grams: entry.grams ?? null,
      foodItem,
    });
  }

  return grouped;
}

export function buildHydrationEntries(entries: Array<{ id: string; amount_oz: number; created_at?: string | null }>): HydrationEntryViewModel[] {
  return entries.map((entry, index) => ({
    id: entry.id,
    amountOz: entry.amount_oz,
    createdAtLabel: entry.created_at
      ? new Date(entry.created_at).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      })
      : 'Logged',
    isLatest: index === entries.length - 1,
  }));
}

export function summarizeFuelHistory(input: {
  totalWaterOz: number | null | undefined;
  mealGroups: Record<MealType, MealLogEntryViewModel[]>;
}): FuelHistoryDay {
  const mealCount = Object.values(input.mealGroups).reduce((sum, entries) => {
    if (entries.length === 0) return sum;
    return sum + 1;
  }, 0);

  return {
    mealCount,
    waterOz: Math.round(input.totalWaterOz ?? 0),
  };
}

export function buildTotalsFromFoodLog(foodLog: Array<{
  logged_calories?: number | null;
  logged_protein?: number | null;
  logged_carbs?: number | null;
  logged_fat?: number | null;
}>, totalWaterOz: number | null | undefined): DashboardNutritionTotals {
  const fromLog = computeActualNutrition(foodLog, totalWaterOz);
  const calories = foodLog.reduce((sum, entry) => sum + (entry.logged_calories ?? 0), 0);

  return {
    ...fromLog,
    calories: calories > 0
      ? Math.round(calories)
      : calculateCaloriesFromMacros(fromLog.protein, fromLog.carbs, fromLog.fat),
  };
}
