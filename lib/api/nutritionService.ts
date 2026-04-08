import { supabase } from '../supabase';
import {
  DailyNutritionTargetSource,
  FoodDataSource,
  FoodItemRow,
  FoodNutritionSnapshot,
  FoodPortionOption,
  FoodSearchBadge,
  FoodSearchMode,
  FoodSearchResult,
  FoodSourceType,
  MealType,
} from '../engine/types';
import { todayLocalDate } from '../utils/date';
import { searchPackagedFoods } from './openFoodFacts';
import { hydrateIngredientFood, searchIngredientFoods } from './usdaFoodData';

const today = todayLocalDate;
const LOCAL_RESULT_LIMIT = 12;
const RECENT_SECTION_LIMIT = 8;

export type FoodQueryClassification = 'barcode' | 'ingredient' | 'packaged';

export interface FoodSearchSection {
  id: string;
  title: string;
  items: FoodSearchResult[];
}

export interface FoodLogSelection {
  foodItem: FoodItemRow;
  amountValue: number;
  amountUnit: string;
  grams: number | null;
  snapshot?: FoodNutritionSnapshot;
}

function buildLoggedNutritionValues(
  foodItem: FoodItemRow,
  selection: Pick<FoodLogSelection, 'amountValue' | 'amountUnit' | 'grams'>
) {
  const resolvedGrams = resolveLoggedGrams(
    foodItem,
    selection.amountValue,
    selection.amountUnit,
    selection.grams,
  );
  const multiplier = resolveLoggedMultiplier(
    foodItem,
    selection.amountValue,
    selection.amountUnit,
    resolvedGrams,
  );

  return {
    resolvedGrams,
    multiplier,
    loggedCalories: Math.round(foodItem.calories_per_serving * multiplier),
    loggedProtein: roundToTenth(foodItem.protein_per_serving * multiplier),
    loggedCarbs: roundToTenth(foodItem.carbs_per_serving * multiplier),
    loggedFat: roundToTenth(foodItem.fat_per_serving * multiplier),
  };
}

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

function normalizeSource(row: Partial<FoodItemRow>): FoodDataSource {
  if (row.source) {
    return row.source;
  }

  if (row.off_barcode) {
    return 'open_food_facts';
  }

  return 'custom';
}

function normalizeSourceType(row: Partial<FoodItemRow>): FoodSourceType {
  if (row.source_type) {
    return row.source_type;
  }

  if (row.user_id) {
    return 'custom';
  }

  return row.off_barcode ? 'packaged' : 'ingredient';
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

function normalizePortionOptions(
  row: Pick<FoodItemRow, 'portion_options' | 'serving_label' | 'serving_size_g' | 'base_amount' | 'base_unit'>
): FoodPortionOption[] {
  if (Array.isArray(row.portion_options) && row.portion_options.length > 0) {
    return row.portion_options;
  }

  return buildFallbackPortionOptions({
    servingLabel: row.serving_label,
    servingSizeG: row.serving_size_g,
    baseAmount: row.base_amount,
    baseUnit: row.base_unit,
  });
}

function uniqueBadges(badges: FoodSearchBadge[]): FoodSearchBadge[] {
  return [...new Set(badges)];
}

function toFoodSearchResult(
  row: FoodItemRow,
  options?: { searchRank?: number; recent?: boolean; favorite?: boolean }
): FoodSearchResult {
  const source = normalizeSource(row);
  const sourceType = normalizeSourceType(row);
  const baseBadge: FoodSearchBadge =
    sourceType === 'ingredient'
      ? 'Ingredient'
      : sourceType === 'packaged'
        ? 'Packaged'
        : 'Custom';

  return {
    key: `${source}:${row.external_id ?? row.off_barcode ?? row.id}`,
    id: row.id,
    user_id: row.user_id,
    source,
    sourceType,
    external_id: row.external_id ?? null,
    verified: row.verified ?? source !== 'custom',
    searchRank: options?.searchRank ?? 0,
    off_barcode: row.off_barcode,
    name: row.name,
    brand: row.brand,
    image_url: row.image_url,
    baseAmount: row.base_amount ?? 1,
    baseUnit: row.base_unit ?? 'serving',
    gramsPerPortion: row.grams_per_portion ?? row.serving_size_g,
    portionOptions: normalizePortionOptions(row),
    serving_size_g: row.serving_size_g,
    serving_label: row.serving_label,
    calories_per_serving: row.calories_per_serving,
    protein_per_serving: row.protein_per_serving,
    carbs_per_serving: row.carbs_per_serving,
    fat_per_serving: row.fat_per_serving,
    is_supplement: row.is_supplement,
    badges: uniqueBadges([
      baseBadge,
      ...(options?.recent ? (['Recent'] as const) : []),
      ...(options?.favorite ? (['Favorite'] as const) : []),
      ...(row.verified ?? source !== 'custom' ? (['Verified'] as const) : []),
    ]),
  };
}

function buildNutritionSnapshot(item: FoodItemRow): FoodNutritionSnapshot {
  return {
    source: normalizeSource(item),
    sourceType: normalizeSourceType(item),
    external_id: item.external_id ?? null,
    verified: item.verified ?? normalizeSource(item) !== 'custom',
    name: item.name,
    brand: item.brand,
    image_url: item.image_url,
    baseAmount: item.base_amount ?? 1,
    baseUnit: item.base_unit ?? 'serving',
    gramsPerPortion: item.grams_per_portion ?? item.serving_size_g,
    portionOptions: normalizePortionOptions(item),
    serving_size_g: item.serving_size_g,
    serving_label: item.serving_label,
    calories_per_serving: item.calories_per_serving,
    protein_per_serving: item.protein_per_serving,
    carbs_per_serving: item.carbs_per_serving,
    fat_per_serving: item.fat_per_serving,
    is_supplement: item.is_supplement,
  };
}

function isFoodSearchResult(item: FoodSearchResult | Omit<FoodItemRow, 'id'>): item is FoodSearchResult {
  return 'key' in item && 'sourceType' in item;
}

function toFoodItemInsert(
  item: FoodSearchResult | Omit<FoodItemRow, 'id'>
): Omit<FoodItemRow, 'id'> {
  if (!isFoodSearchResult(item)) {
    return {
      ...item,
      source: item.source ?? normalizeSource(item),
      source_type: item.source_type ?? normalizeSourceType(item),
      external_id: item.external_id ?? null,
      verified: item.verified ?? normalizeSource(item) !== 'custom',
      base_amount: item.base_amount ?? 1,
      base_unit: item.base_unit ?? 'serving',
      grams_per_portion: item.grams_per_portion ?? item.serving_size_g,
      portion_options: item.portion_options ?? buildFallbackPortionOptions({
        servingLabel: item.serving_label,
        servingSizeG: item.serving_size_g,
        baseAmount: item.base_amount,
        baseUnit: item.base_unit,
      }),
    };
  }

  return {
    user_id: item.user_id,
    source: item.source,
    source_type: item.sourceType,
    external_id: item.external_id,
    verified: item.verified,
    off_barcode: item.off_barcode,
    name: item.name,
    brand: item.brand,
    base_amount: item.baseAmount,
    base_unit: item.baseUnit,
    grams_per_portion: item.gramsPerPortion,
    portion_options: item.portionOptions,
    serving_size_g: item.serving_size_g,
    serving_label: item.serving_label,
    calories_per_serving: item.calories_per_serving,
    protein_per_serving: item.protein_per_serving,
    carbs_per_serving: item.carbs_per_serving,
    fat_per_serving: item.fat_per_serving,
    is_supplement: item.is_supplement,
    image_url: item.image_url,
  };
}

function buildResultIdentity(item: Pick<FoodSearchResult, 'source' | 'external_id' | 'off_barcode' | 'name'>): string {
  return `${item.source}:${item.external_id ?? item.off_barcode ?? item.name.toLowerCase()}`;
}

function getLocalSearchScore(item: FoodItemRow, query: string): number {
  const name = item.name.toLowerCase();
  const brand = item.brand?.toLowerCase() ?? '';
  const sourceType = normalizeSourceType(item);
  let score = 0;

  if (name === query) score += 120;
  if (name.startsWith(query)) score += 80;
  if (name.includes(query)) score += 45;
  if (brand.startsWith(query)) score += 25;
  if (brand.includes(query)) score += 10;
  if (normalizeSource(item) === 'custom') score += 20;
  if (sourceType === 'ingredient') score += 10;

  return score;
}

async function getFavoriteFoodIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('favorite_foods')
    .select('food_item_id')
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  return new Set((data ?? []).map((row) => row.food_item_id));
}

function passesMode(result: FoodSearchResult, mode: FoodSearchMode): boolean {
  if (mode === 'recent') {
    return true;
  }

  if (result.source === 'custom') {
    return true;
  }

  return mode === 'ingredients'
    ? result.sourceType === 'ingredient'
    : result.sourceType === 'packaged';
}

function resolveLoggedGrams(
  foodItem: FoodItemRow,
  amountValue: number,
  amountUnit: string,
  grams: number | null
): number | null {
  if (typeof grams === 'number' && Number.isFinite(grams) && grams > 0) {
    return grams;
  }

  if (amountUnit === 'g') {
    return amountValue;
  }

  if (amountUnit === 'oz') {
    return roundToTenth(amountValue * 28.3495);
  }

  if (amountUnit === 'serving' && foodItem.serving_size_g > 0) {
    return roundToTenth(amountValue * foodItem.serving_size_g);
  }

  if (amountUnit === 'portion' && (foodItem.grams_per_portion ?? 0) > 0) {
    return roundToTenth(amountValue * (foodItem.grams_per_portion ?? 0));
  }

  return null;
}

function resolveLoggedMultiplier(
  foodItem: FoodItemRow,
  amountValue: number,
  amountUnit: string,
  grams: number | null
): number {
  const resolvedGrams = resolveLoggedGrams(foodItem, amountValue, amountUnit, grams);
  if (resolvedGrams != null && foodItem.serving_size_g > 0) {
    return resolvedGrams / foodItem.serving_size_g;
  }

  if (amountUnit === (foodItem.base_unit ?? 'serving') && (foodItem.base_amount ?? 0) > 0) {
    return amountValue / (foodItem.base_amount ?? 1);
  }

  return amountValue;
}

export function classifyFoodQuery(query: string): FoodQueryClassification {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return 'ingredient';
  }

  if (/^\d{8,14}$/.test(trimmed)) {
    return 'barcode';
  }

  const packagedKeywords = [
    'bar',
    'shake',
    'protein',
    'quest',
    'fairlife',
    'gatorade',
    'cereal',
    'cookie',
    'chips',
    'drink',
  ];

  return packagedKeywords.some((keyword) => trimmed.includes(keyword))
    ? 'packaged'
    : 'ingredient';
}

/**
 * Log a food entry to a meal. Inserts a source-aware snapshot log row, then
 * recalculates daily_nutrition_summary and macro_ledger actuals.
 */
export async function logFoodEntry(
  userId: string,
  selection: FoodLogSelection,
  mealType: MealType,
  date: string = today()
) {
  const { foodItem, amountValue, amountUnit } = selection;
  const {
    resolvedGrams,
    multiplier,
    loggedCalories,
    loggedProtein,
    loggedCarbs,
    loggedFat,
  } = buildLoggedNutritionValues(foodItem, selection);

  const { error: logError } = await supabase.from('food_log').insert({
    user_id: userId,
    food_item_id: foodItem.id,
    date,
    meal_type: mealType,
    servings: Math.round(multiplier * 1000) / 1000,
    amount_value: amountValue,
    amount_unit: amountUnit,
    grams: resolvedGrams,
    source: normalizeSource(foodItem),
    nutrition_snapshot: selection.snapshot ?? buildNutritionSnapshot(foodItem),
    logged_calories: loggedCalories,
    logged_protein: loggedProtein,
    logged_carbs: loggedCarbs,
    logged_fat: loggedFat,
  });

  if (logError) {
    throw logError;
  }

  await recalculateDailySummary(userId, date);
}

export async function updateFoodEntry(
  userId: string,
  foodLogId: string,
  selection: FoodLogSelection,
  mealType: MealType,
  date: string = today()
) {
  const { foodItem, amountValue, amountUnit } = selection;
  const {
    resolvedGrams,
    multiplier,
    loggedCalories,
    loggedProtein,
    loggedCarbs,
    loggedFat,
  } = buildLoggedNutritionValues(foodItem, selection);

  const { error } = await supabase
    .from('food_log')
    .update({
      food_item_id: foodItem.id,
      meal_type: mealType,
      servings: Math.round(multiplier * 1000) / 1000,
      amount_value: amountValue,
      amount_unit: amountUnit,
      grams: resolvedGrams,
      source: normalizeSource(foodItem),
      nutrition_snapshot: selection.snapshot ?? buildNutritionSnapshot(foodItem),
      logged_calories: loggedCalories,
      logged_protein: loggedProtein,
      logged_carbs: loggedCarbs,
      logged_fat: loggedFat,
    })
    .eq('id', foodLogId)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  await recalculateDailySummary(userId, date);
}

export async function removeFoodEntry(
  userId: string,
  foodLogId: string,
  date: string
) {
  const { error } = await supabase.from('food_log').delete().eq('id', foodLogId);
  if (error) {
    throw error;
  }

  await recalculateDailySummary(userId, date);
}

async function recalculateDailySummary(userId: string, date: string) {
  const { data: logs, error: fetchError } = await supabase
    .from('food_log')
    .select('logged_calories, logged_protein, logged_carbs, logged_fat, meal_type')
    .eq('user_id', userId)
    .eq('date', date);

  if (fetchError) {
    throw fetchError;
  }

  const totals = (logs ?? []).reduce(
    (acc, entry) => ({
      calories: acc.calories + (entry.logged_calories ?? 0),
      protein: acc.protein + (entry.logged_protein ?? 0),
      carbs: acc.carbs + (entry.logged_carbs ?? 0),
      fat: acc.fat + (entry.logged_fat ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const mealTypes = new Set((logs ?? []).map((entry) => entry.meal_type));

  const { data: waterLogs } = await supabase
    .from('hydration_log')
    .select('amount_oz')
    .eq('user_id', userId)
    .eq('date', date);

  const totalWater = (waterLogs ?? []).reduce((sum, entry) => sum + (entry.amount_oz ?? 0), 0);

  await supabase.from('daily_nutrition_summary').upsert(
    {
      user_id: userId,
      date,
      total_calories: Math.round(totals.calories),
      total_protein: roundToTenth(totals.protein),
      total_carbs: roundToTenth(totals.carbs),
      total_fat: roundToTenth(totals.fat),
      total_water_oz: totalWater,
      meal_count: mealTypes.size,
    },
    { onConflict: 'user_id,date' }
  );

  await supabase
    .from('macro_ledger')
    .update({
      actual_calories: Math.round(totals.calories),
      actual_protein: Math.round(totals.protein),
      actual_carbs: Math.round(totals.carbs),
      actual_fat: Math.round(totals.fat),
    })
    .eq('user_id', userId)
    .eq('date', date);
}

export async function getDailyNutrition(userId: string, date: string = today()) {
  const [foodLogResult, ledgerResult, hydrationResult, summaryResult] =
    await Promise.all([
      supabase
        .from('food_log')
        .select('*, food_items(*)')
        .eq('user_id', userId)
        .eq('date', date)
        .order('created_at', { ascending: true }),
      supabase
        .from('macro_ledger')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .maybeSingle(),
      supabase
        .from('hydration_log')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .order('created_at', { ascending: true }),
      supabase
        .from('daily_nutrition_summary')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .maybeSingle(),
    ]);

  return {
    foodLog: foodLogResult.data ?? [],
    ledger: ledgerResult.data,
    hydrationLog: hydrationResult.data ?? [],
    summary: summaryResult.data,
  };
}

export async function getRecentFoods(
  userId: string,
  limit: number = 20
): Promise<FoodItemRow[]> {
  const { data, error } = await supabase
    .from('food_log')
    .select('food_item_id, food_items(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit * 2);

  if (error) {
    throw error;
  }

  const seen = new Set<string>();
  const items: FoodItemRow[] = [];
  for (const row of data ?? []) {
    if (!seen.has(row.food_item_id) && row.food_items) {
      seen.add(row.food_item_id);
      items.push(row.food_items as unknown as FoodItemRow);
      if (items.length >= limit) {
        break;
      }
    }
  }

  return items;
}

export async function toggleFavorite(
  userId: string,
  foodItemId: string
): Promise<boolean> {
  const { data: existing } = await supabase
    .from('favorite_foods')
    .select('id')
    .eq('user_id', userId)
    .eq('food_item_id', foodItemId)
    .maybeSingle();

  if (existing) {
    await supabase.from('favorite_foods').delete().eq('id', existing.id);
    return false;
  }

  await supabase.from('favorite_foods').insert({
    user_id: userId,
    food_item_id: foodItemId,
  });
  return true;
}

export async function getFavoriteFoods(userId: string): Promise<FoodItemRow[]> {
  const { data, error } = await supabase
    .from('favorite_foods')
    .select('food_items(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => row.food_items as unknown as FoodItemRow)
    .filter(Boolean);
}

export async function logWater(
  userId: string,
  amountOz: number,
  date: string = today()
) {
  const { error } = await supabase.from('hydration_log').insert({
    user_id: userId,
    date,
    amount_oz: amountOz,
  });
  if (error) {
    throw error;
  }

  await recalculateDailySummary(userId, date);
}

export async function updateWaterEntry(
  userId: string,
  hydrationLogId: string,
  amountOz: number,
  date: string = today()
) {
  const { error } = await supabase
    .from('hydration_log')
    .update({ amount_oz: amountOz })
    .eq('id', hydrationLogId)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  await recalculateDailySummary(userId, date);
}

export async function removeWaterEntry(
  userId: string,
  hydrationLogId: string,
  date: string = today()
) {
  const { error } = await supabase
    .from('hydration_log')
    .delete()
    .eq('id', hydrationLogId)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  await recalculateDailySummary(userId, date);
}

export async function upsertFoodItem(
  item: FoodSearchResult | Omit<FoodItemRow, 'id'>
): Promise<FoodItemRow> {
  const payload = toFoodItemInsert(item);

  let existing: FoodItemRow | null = null;

  if (payload.off_barcode) {
    const { data } = await supabase
      .from('food_items')
      .select('*')
      .eq('off_barcode', payload.off_barcode)
      .maybeSingle();
    existing = (data as FoodItemRow | null) ?? existing;
  }

  if (!existing && payload.external_id) {
    const { data } = await supabase
      .from('food_items')
      .select('*')
      .eq('source', payload.source)
      .eq('external_id', payload.external_id)
      .maybeSingle();
    existing = (data as FoodItemRow | null) ?? existing;
  }

  if (existing) {
    if (existing.user_id == null) {
      return existing;
    }

    const { data, error } = await supabase
      .from('food_items')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as FoodItemRow;
  }

  const { data, error } = await supabase
    .from('food_items')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as FoodItemRow;
}

export async function searchLocalFoods(
  userId: string,
  query: string,
  limit: number = 10
): Promise<FoodItemRow[]> {
  const trimmed = query.trim().toLowerCase();
  const { data, error } = await supabase
    .from('food_items')
    .select('*')
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .ilike('name', `%${trimmed}%`)
    .order('created_at', { ascending: false })
    .limit(limit * 3);

  if (error) {
    throw error;
  }

  return ((data ?? []) as FoodItemRow[])
    .sort((left, right) => getLocalSearchScore(right, trimmed) - getLocalSearchScore(left, trimmed))
    .slice(0, limit);
}

export async function searchFoodCatalog(input: {
  userId: string;
  query: string;
  mode: FoodSearchMode;
}): Promise<{
  classifier: FoodQueryClassification;
  sections: FoodSearchSection[];
}> {
  const trimmed = input.query.trim();
  const classifier = classifyFoodQuery(trimmed);

  if (trimmed.length < 2) {
    const [favoriteRows, recentRows] = await Promise.all([
      getFavoriteFoods(input.userId),
      getRecentFoods(input.userId, RECENT_SECTION_LIMIT),
    ]);

    const favoriteIds = new Set(favoriteRows.map((item) => item.id));
    const sections: FoodSearchSection[] = [];

    if (favoriteRows.length > 0) {
      sections.push({
        id: 'favorites',
        title: 'Favorites',
        items: favoriteRows.map((item, index) =>
          toFoodSearchResult(item, { searchRank: index, favorite: true })
        ),
      });
    }

    if (recentRows.length > 0) {
      sections.push({
        id: 'recent',
        title: 'Recent',
        items: recentRows.map((item, index) =>
          toFoodSearchResult(item, {
            searchRank: index + 20,
            recent: true,
            favorite: favoriteIds.has(item.id),
          })
        ),
      });
    }

    return { classifier, sections };
  }

  const [favoriteIds, localRows] = await Promise.all([
    getFavoriteFoodIds(input.userId),
    searchLocalFoods(input.userId, trimmed, LOCAL_RESULT_LIMIT),
  ]);

  const localItems = localRows
    .map((item, index) =>
      toFoodSearchResult(item, {
        searchRank: index,
        favorite: favoriteIds.has(item.id),
      })
    )
    .filter((item) => passesMode(item, input.mode));

  let externalItems: FoodSearchResult[] = [];
  if (input.mode === 'ingredients') {
    externalItems = await searchIngredientFoods(trimmed, 6);
  } else if (input.mode === 'packaged') {
    externalItems = (await searchPackagedFoods(trimmed, 1)).items;
  }

  const seen = new Set(localItems.map(buildResultIdentity));
  const dedupedExternal = externalItems
    .filter((item) => !seen.has(buildResultIdentity(item)))
    .map((item, index) => ({
      ...item,
      searchRank: index + 100,
    }));

  const sections: FoodSearchSection[] = [];
  if (localItems.length > 0) {
    sections.push({
      id: 'local',
      title: 'Your foods',
      items: localItems,
    });
  }

  if (dedupedExternal.length > 0) {
    sections.push({
      id: 'external',
      title: input.mode === 'ingredients' ? 'Ingredient results' : 'Packaged results',
      items: dedupedExternal,
    });
  }

  return { classifier, sections };
}

export async function hydrateFoodSearchResult(
  result: FoodSearchResult
): Promise<FoodSearchResult> {
  if (result.source === 'usda') {
    return hydrateIngredientFood(result);
  }

  return result;
}

export async function createCustomFood(
  userId: string,
  food: {
    name: string;
    brand?: string;
    serving_size_g: number;
    serving_label: string;
    calories_per_serving: number;
    protein_per_serving: number;
    carbs_per_serving: number;
    fat_per_serving: number;
    is_supplement: boolean;
  }
): Promise<FoodItemRow> {
  const portionOptions = buildFallbackPortionOptions({
    servingLabel: food.serving_label,
    servingSizeG: food.serving_size_g,
    baseAmount: 1,
    baseUnit: 'serving',
  });

  const { data, error } = await supabase
    .from('food_items')
    .insert({
      user_id: userId,
      source: 'custom',
      source_type: 'custom',
      external_id: null,
      verified: true,
      off_barcode: null,
      base_amount: 1,
      base_unit: 'serving',
      grams_per_portion: food.serving_size_g,
      portion_options: portionOptions,
      ...food,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as FoodItemRow;
}

export async function ensureDailyLedger(
  userId: string,
  date: string,
  targets: {
    tdee: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    weightCorrectionDeficit?: number;
    targetSource?: DailyNutritionTargetSource;
  }
) {
  const payload = {
    user_id: userId,
    date,
    base_tdee: targets.tdee,
    prescribed_calories: targets.calories,
    prescribed_protein: targets.protein,
    prescribed_fats: targets.fat,
    prescribed_carbs: targets.carbs,
    weight_correction_deficit: targets.weightCorrectionDeficit ?? 0,
    target_source: targets.targetSource ?? 'base',
  };

  const { data, error } = await supabase
    .from('macro_ledger')
    .upsert(payload, { onConflict: 'user_id,date' })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
