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
import {
  buildFoodSearchMetadataText,
  buildFoodSearchQueryProfile,
  hasHighConfidenceBestMatch,
  normalizeFoodSearchText,
  scoreFoodSearchItem,
  shouldSearchIngredientsForMode,
  shouldSearchPackagedForMode,
  type FoodQueryClassification,
} from './foodSearchSupport';
import { searchPackagedFoods } from './openFoodFacts';
import { logWarn } from '../utils/logger';
import {
  createNutritionDataQuality,
  type NutritionDataSourceType,
  type UnknownField,
} from '../performance-engine';
import { withEngineInvalidation } from './engineInvalidation';

const today = todayLocalDate;
const LOCAL_RESULT_LIMIT = 16;
const RECENT_SECTION_LIMIT = 8;
const PROVIDER_TIMEOUT_MS = 4500;

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

export { classifyFoodQuery, filterFoodSearchSections } from './foodSearchSupport';

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

function nutritionDataSourceType(source: FoodDataSource): NutritionDataSourceType {
  if (source === 'usda') return 'fdc';
  if (source === 'open_food_facts') return 'open_food_facts';
  return 'custom';
}

function getFoodSourceId(item: Partial<FoodItemRow>): string | null {
  return item.external_id ?? item.off_barcode ?? null;
}

function getMissingSnapshotNutrients(item: Partial<FoodItemRow>): UnknownField[] {
  const nutrientFields = [
    ['calories_per_serving', item.calories_per_serving],
    ['protein_per_serving', item.protein_per_serving],
    ['carbs_per_serving', item.carbs_per_serving],
    ['fat_per_serving', item.fat_per_serving],
  ] as const;

  return nutrientFields
    .filter(([, value]) => value == null || !Number.isFinite(Number(value)))
    .map(([field]) => ({ field, reason: 'not_collected' as const }));
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
  const source = normalizeSource(item);
  const sourceType = normalizeSourceType(item);
  const sourceId = getFoodSourceId(item);
  const verified = item.verified ?? source !== 'custom';
  const missingFields = getMissingSnapshotNutrients(item);
  const dataQuality = createNutritionDataQuality({
    sourceType: nutritionDataSourceType(source),
    verified,
    userEstimate: source === 'custom' || sourceType === 'custom',
    missingFields,
    source: sourceId ? { source, sourceId, capturedAt: null } : null,
    warnings: missingFields.length > 0 ? ['Missing nutrients are unknown, not zero.'] : [],
  });

  return {
    source,
    sourceType,
    external_id: item.external_id ?? null,
    source_id: sourceId,
    verified,
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
    data_quality: dataQuality,
    missing_nutrients: missingFields.map((field) => field.field),
    confidence: dataQuality.confidence,
  };
}

function isFoodSearchResult(item: FoodSearchResult | Omit<FoodItemRow, 'id'>): item is FoodSearchResult {
  return 'key' in item && 'sourceType' in item;
}

function toFoodItemInsert(
  item: FoodSearchResult | Omit<FoodItemRow, 'id'>,
  options?: { userIdForCustom?: string },
): Omit<FoodItemRow, 'id'> {
  if (!isFoodSearchResult(item)) {
    const normalizedPortionOptions =
      item.portion_options ?? buildFallbackPortionOptions({
        servingLabel: item.serving_label,
        servingSizeG: item.serving_size_g,
        baseAmount: item.base_amount,
        baseUnit: item.base_unit,
      });

    return {
      ...item,
      source: item.source ?? normalizeSource(item),
      source_type: item.source_type ?? normalizeSourceType(item),
      external_id: item.external_id ?? null,
      verified: item.verified ?? normalizeSource(item) !== 'custom',
      base_amount: item.base_amount ?? 1,
      base_unit: item.base_unit ?? 'serving',
      grams_per_portion: item.grams_per_portion ?? item.serving_size_g,
      portion_options: normalizedPortionOptions,
      search_text:
        item.search_text ??
        buildFoodSearchMetadataText({
          name: item.name,
          brand: item.brand,
          servingLabel: item.serving_label,
          portionOptions: normalizedPortionOptions,
        }),
    };
  }

  return {
    user_id: item.source === 'custom' ? item.user_id ?? options?.userIdForCustom ?? null : item.user_id,
    source: item.source,
    source_type: item.sourceType,
    external_id:
      item.source === 'custom' && item.external_id?.startsWith('fallback:')
        ? null
        : item.external_id,
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
    search_text: buildFoodSearchMetadataText({
      name: item.name,
      brand: item.brand,
      servingLabel: item.serving_label,
      portionOptions: item.portionOptions,
    }),
  };
}

function buildResultIdentity(item: Pick<FoodSearchResult, 'source' | 'external_id' | 'off_barcode' | 'name'>): string {
  return `${item.source}:${item.external_id ?? item.off_barcode ?? normalizeFoodSearchText(item.name)}`;
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

function sortFoodSearchItems(items: FoodSearchResult[], query: string): FoodSearchResult[] {
  const profile = buildFoodSearchQueryProfile(query);
  return [...items].sort((left, right) => {
    const scoreDelta = scoreFoodSearchItem(right, profile) - scoreFoodSearchItem(left, profile);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    return left.name.localeCompare(right.name);
  });
}

function foodSearchItemMatchesQuery(item: FoodSearchResult, query: string): boolean {
  const profile = buildFoodSearchQueryProfile(query);
  const searchableText = [
    item.name,
    item.brand ?? '',
    item.serving_label,
    ...item.portionOptions.map((option) => option.label),
  ]
    .map((value) => normalizeFoodSearchText(value))
    .filter(Boolean);

  return profile.searchTerms.some((term) =>
    term.length >= 2 &&
    searchableText.some((text) => text === term || text.includes(term))
  );
}

function filterLocalItemsForMode(items: FoodSearchResult[], mode: FoodSearchMode): FoodSearchResult[] {
  if (mode === 'all') {
    return items;
  }

  if (mode === 'ingredients') {
    return items.filter((item) => item.sourceType === 'ingredient' || item.sourceType === 'custom');
  }

  if (mode === 'packaged') {
    return items.filter((item) => item.sourceType === 'packaged' || item.sourceType === 'custom');
  }

  return items.filter(
    (item) => Boolean(item.user_id) || item.badges.includes('Favorite') || item.badges.includes('Recent')
  );
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  context: { label: string; query: string; fallback: T },
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      logWarn('searchFoodCatalog.providerTimeout', new Error(`${context.label} timed out`), {
        query: context.query,
        timeoutMs,
      });
      resolve(context.fallback);
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function buildFoodSearchSections(input: {
  query: string;
  localItems: FoodSearchResult[];
  ingredientItems: FoodSearchResult[];
  packagedItems: FoodSearchResult[];
}): FoodSearchSection[] {
  const profile = buildFoodSearchQueryProfile(input.query);
  const localItems = sortFoodSearchItems(input.localItems, input.query);
  const ingredientItems = sortFoodSearchItems(input.ingredientItems, input.query);
  const packagedItems = sortFoodSearchItems(input.packagedItems, input.query);
  const rankedItems = [...localItems, ...ingredientItems, ...packagedItems]
    .map((item) => ({ item, score: scoreFoodSearchItem(item, profile) }))
    .sort((left, right) => right.score - left.score);

  let bestMatch: FoodSearchResult | null = null;
  if (hasHighConfidenceBestMatch(rankedItems)) {
    bestMatch = rankedItems[0].item;
  }

  const removeBestMatch = (items: FoodSearchResult[]) =>
    bestMatch ? items.filter((item) => item.key !== bestMatch!.key) : items;

  const sections: FoodSearchSection[] = [];
  if (bestMatch) {
    sections.push({
      id: 'best-match',
      title: 'Best match',
      items: [bestMatch],
    });
  }

  const localWithoutBest = removeBestMatch(localItems);
  if (localWithoutBest.length > 0) {
    sections.push({
      id: 'local',
      title: 'Your foods',
      items: localWithoutBest,
    });
  }

  const ingredientWithoutBest = removeBestMatch(ingredientItems);
  if (ingredientWithoutBest.length > 0) {
    sections.push({
      id: 'ingredients',
      title: 'Ingredient results',
      items: ingredientWithoutBest,
    });
  }

  const packagedWithoutBest = removeBestMatch(packagedItems);
  if (packagedWithoutBest.length > 0) {
    sections.push({
      id: 'packaged',
      title: 'Packaged results',
      items: packagedWithoutBest,
    });
  }

  return sections;
}

function buildFavoriteIdSet(rows: FoodItemRow[]): Set<string> {
  return new Set(rows.map((item) => item.id));
}

function buildRecentIdSet(rows: FoodItemRow[]): Set<string> {
  return new Set(rows.map((item) => item.id));
}

function toLocalFoodSearchResults(
  rows: FoodItemRow[],
  favoriteIds: Set<string>,
  recentIds: Set<string>,
): FoodSearchResult[] {
  return rows.map((item, index) =>
    toFoodSearchResult(item, {
      searchRank: index,
      favorite: favoriteIds.has(item.id),
      recent: recentIds.has(item.id),
    })
  );
}

function dedupeFoodSearchResults(items: FoodSearchResult[]): FoodSearchResult[] {
  const seen = new Set<string>();
  const results: FoodSearchResult[] = [];

  for (const item of items) {
    const identity = buildResultIdentity(item);
    if (seen.has(identity)) {
      continue;
    }

    seen.add(identity);
    results.push(item);
  }

  return results;
}

async function cacheSearchResults(items: FoodSearchResult[]) {
  await Promise.allSettled(
    items
      .filter((item) => item.source !== 'custom' && (item.external_id || item.off_barcode))
      .slice(0, 8)
      .map(async (item) => {
        try {
          await upsertFoodItem(item);
        } catch {
          // Ignore cache misses so the foreground search remains responsive.
        }
      })
  );
}

function buildLocalSearchClause(terms: string[], columns: string[]): string {
  return terms
    .slice(0, 6)
    .flatMap((term) => columns.map((column) => `${column}.ilike.%${term}%`))
    .join(',');
}

async function searchLocalFoodsByColumns(
  userId: string,
  columns: string[],
  profile: ReturnType<typeof buildFoodSearchQueryProfile>,
  limit: number,
): Promise<FoodItemRow[]> {
  const searchClause = buildLocalSearchClause(profile.searchTerms, columns);
  if (!searchClause) {
    return [];
  }

  const [sharedResult, userResult] = await Promise.all([
    supabase
      .from('food_items')
      .select('*')
      .is('user_id', null)
      .or(searchClause)
      .order('created_at', { ascending: false })
      .limit(limit * 3),
    supabase
      .from('food_items')
      .select('*')
      .eq('user_id', userId)
      .or(searchClause)
      .order('created_at', { ascending: false })
      .limit(limit * 3),
  ]);

  if (sharedResult.error) {
    throw sharedResult.error;
  }

  if (userResult.error) {
    throw userResult.error;
  }

  const rows = [...((userResult.data ?? []) as FoodItemRow[]), ...((sharedResult.data ?? []) as FoodItemRow[])];
  const dedupedRows = new Map<string, FoodItemRow>();

  for (const row of rows) {
    dedupedRows.set(row.id, row);
  }

  return [...dedupedRows.values()];
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
  return withEngineInvalidation({ userId, date, reason: 'nutrition_log_save' }, async () => {
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
  });
}

export async function updateFoodEntry(
  userId: string,
  foodLogId: string,
  selection: FoodLogSelection,
  mealType: MealType,
  date: string = today()
) {
  return withEngineInvalidation({ userId, date, reason: 'nutrition_log_update' }, async () => {
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
  });
}

export async function removeFoodEntry(
  userId: string,
  foodLogId: string,
  date: string
) {
  return withEngineInvalidation({ userId, date, reason: 'nutrition_log_remove' }, async () => {
    const { error } = await supabase.from('food_log').delete().eq('id', foodLogId);
    if (error) {
      throw error;
    }

    await recalculateDailySummary(userId, date);
  });
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
  return withEngineInvalidation({ userId, date, reason: 'hydration_log_save' }, async () => {
    const { error } = await supabase.from('hydration_log').insert({
      user_id: userId,
      date,
      amount_oz: amountOz,
    });
    if (error) {
      throw error;
    }

    await recalculateDailySummary(userId, date);
  });
}

export async function updateWaterEntry(
  userId: string,
  hydrationLogId: string,
  amountOz: number,
  date: string = today()
) {
  return withEngineInvalidation({ userId, date, reason: 'hydration_log_update' }, async () => {
    const { error } = await supabase
      .from('hydration_log')
      .update({ amount_oz: amountOz })
      .eq('id', hydrationLogId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    await recalculateDailySummary(userId, date);
  });
}

export async function removeWaterEntry(
  userId: string,
  hydrationLogId: string,
  date: string = today()
) {
  return withEngineInvalidation({ userId, date, reason: 'hydration_log_remove' }, async () => {
    const { error } = await supabase
      .from('hydration_log')
      .delete()
      .eq('id', hydrationLogId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    await recalculateDailySummary(userId, date);
  });
}

export async function upsertFoodItem(
  item: FoodSearchResult | Omit<FoodItemRow, 'id'>,
  options?: { userIdForCustom?: string },
): Promise<FoodItemRow> {
  const payload = toFoodItemInsert(item, options);

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

  if (!existing && payload.source === 'custom' && payload.user_id) {
    const { data } = await supabase
      .from('food_items')
      .select('*')
      .eq('source', 'custom')
      .eq('user_id', payload.user_id)
      .eq('name', payload.name)
      .eq('serving_label', payload.serving_label)
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
  const profile = buildFoodSearchQueryProfile(query);
  let rows: FoodItemRow[] = [];

  try {
    rows = await searchLocalFoodsByColumns(userId, ['search_text', 'name'], profile, limit);
  } catch (error) {
    logWarn('searchLocalFoods.searchTextFallback', error, {
      query,
      terms: profile.searchTerms.slice(0, 4),
    });
    rows = await searchLocalFoodsByColumns(userId, ['name'], profile, limit);
  }

  return rows
    .sort((left, right) => {
      const leftItem = toFoodSearchResult(left, { searchRank: 0 });
      const rightItem = toFoodSearchResult(right, { searchRank: 0 });
      return scoreFoodSearchItem(rightItem, profile) - scoreFoodSearchItem(leftItem, profile);
    })
    .slice(0, limit);
}

export async function searchLocalFoodCatalog(input: {
  userId: string;
  query: string;
  mode?: FoodSearchMode;
}): Promise<{
  classifier: FoodQueryClassification;
  sections: FoodSearchSection[];
}> {
  const profile = buildFoodSearchQueryProfile(input.query);
  const mode = input.mode ?? 'all';
  const [favoriteIds, recentRows, localRows] = await Promise.all([
    getFavoriteFoodIds(input.userId),
    getRecentFoods(input.userId, RECENT_SECTION_LIMIT),
    searchLocalFoods(input.userId, input.query, LOCAL_RESULT_LIMIT),
  ]);

  const recentIds = buildRecentIdSet(recentRows);
  const localSearchResults = toLocalFoodSearchResults(localRows, favoriteIds, recentIds);
  const userOwnedItems = localSearchResults.filter((item) => item.user_id === input.userId);
  const sharedIngredientItems = localSearchResults.filter(
    (item) => item.user_id == null && item.sourceType === 'ingredient'
  );
  const localItems = filterLocalItemsForMode(userOwnedItems, mode);
  const localIdentities = new Set(localItems.map(buildResultIdentity));
  const ingredientItems = shouldSearchIngredientsForMode(mode)
    ? dedupeFoodSearchResults(
        sharedIngredientItems
          .filter((item) => !localIdentities.has(buildResultIdentity(item)))
          .map((item, index) => ({ ...item, searchRank: index + 100 }))
      )
    : [];

  return {
    classifier: profile.classifier,
    sections: buildFoodSearchSections({
      query: input.query,
      localItems,
      ingredientItems,
      packagedItems: [],
    }),
  };
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
  const profile = buildFoodSearchQueryProfile(trimmed);
  const classifier = profile.classifier;
  const mode = trimmed.length < 2 ? 'recent' : input.mode;

  if (mode === 'recent') {
    const [favoriteRows, recentRows] = await Promise.all([
      getFavoriteFoods(input.userId),
      getRecentFoods(input.userId, RECENT_SECTION_LIMIT),
    ]);

    const favoriteIds = buildFavoriteIdSet(favoriteRows);
    const typedQuery = trimmed.length >= 2;
    const favoriteItems = favoriteRows
      .map((item, index) => toFoodSearchResult(item, { searchRank: index, favorite: true }))
      .filter((item) => !typedQuery || foodSearchItemMatchesQuery(item, trimmed));
    const recentItems = recentRows
      .map((item, index) =>
        toFoodSearchResult(item, {
          searchRank: index + 20,
          recent: true,
          favorite: favoriteIds.has(item.id),
        })
      )
      .filter((item) => !typedQuery || foodSearchItemMatchesQuery(item, trimmed));
    const recentIdentities = new Set([...favoriteItems, ...recentItems].map(buildResultIdentity));
    const customItems = typedQuery
      ? filterLocalItemsForMode(
          toLocalFoodSearchResults(
            (await searchLocalFoods(input.userId, trimmed, LOCAL_RESULT_LIMIT)).filter(
              (item) => item.user_id === input.userId
            ),
            favoriteIds,
            buildRecentIdSet(recentRows),
          ),
          'recent',
        ).filter((item) => !recentIdentities.has(buildResultIdentity(item)))
      : [];
    const sections: FoodSearchSection[] = [];

    if (favoriteItems.length > 0) {
      sections.push({
        id: 'favorites',
        title: 'Favorites',
        items: favoriteItems,
      });
    }

    if (recentItems.length > 0) {
      sections.push({
        id: 'recent',
        title: 'Recent',
        items: recentItems,
      });
    }

    if (customItems.length > 0) {
      sections.push({
        id: 'custom',
        title: 'Your custom foods',
        items: sortFoodSearchItems(customItems, trimmed),
      });
    }

    return { classifier, sections: sections.filter((section) => section.items.length > 0) };
  }

  const shouldSearchIngredients = shouldSearchIngredientsForMode(mode);
  const shouldSearchPackaged = shouldSearchPackagedForMode(mode);
  const emptyPackagedResponse = { items: [] as FoodSearchResult[], totalCount: 0, hasMore: false };
  const [favoriteIds, recentRows, localRows, packagedResponse] = await Promise.all([
    getFavoriteFoodIds(input.userId),
    getRecentFoods(input.userId, RECENT_SECTION_LIMIT),
    searchLocalFoods(input.userId, trimmed, LOCAL_RESULT_LIMIT),
    shouldSearchPackaged
      ? withTimeout(searchPackagedFoods(trimmed, 1, 24), PROVIDER_TIMEOUT_MS, {
          label: 'Open Food Facts search',
          query: trimmed,
          fallback: emptyPackagedResponse,
        }).catch((error) => {
          logWarn('searchFoodCatalog.packaged', error, { query: trimmed });
          return emptyPackagedResponse;
        })
      : Promise.resolve(emptyPackagedResponse),
  ]);
  const recentIds = buildRecentIdSet(recentRows);
  const localSearchResults = toLocalFoodSearchResults(localRows, favoriteIds, recentIds);
  const userOwnedItems = localSearchResults.filter((item) => item.user_id === input.userId);
  const sharedIngredientItems = localSearchResults.filter(
    (item) => item.user_id == null && item.sourceType === 'ingredient'
  );
  const localItems = filterLocalItemsForMode(userOwnedItems, mode);
  const localIdentities = new Set(localItems.map(buildResultIdentity));
  const dedupedIngredientItems = dedupeFoodSearchResults(
    (shouldSearchIngredients ? sharedIngredientItems : [])
      .filter((item) => !localIdentities.has(buildResultIdentity(item)))
      .map((item, index) => ({ ...item, searchRank: index + 100 }))
  );
  const ingredientIdentities = new Set(dedupedIngredientItems.map(buildResultIdentity));
  const dedupedPackagedItems = dedupeFoodSearchResults(
    packagedResponse.items
      .filter((item) => {
        const identity = buildResultIdentity(item);
        return !localIdentities.has(identity) && !ingredientIdentities.has(identity);
      })
      .map((item, index) => ({ ...item, searchRank: index + 200 }))
  );

  const sections = buildFoodSearchSections({
    query: trimmed,
    localItems,
    ingredientItems: dedupedIngredientItems,
    packagedItems: dedupedPackagedItems,
  });

  const finalVisibleCount = sections.reduce((sum, section) => sum + section.items.length, 0);
  console.info('[searchFoodCatalog.coverage]', {
    query: trimmed,
    mode,
    classifier,
    localCount: localItems.length,
    ingredientCount: dedupedIngredientItems.length,
    offCount: dedupedPackagedItems.length,
    finalVisibleCount,
  });

  void cacheSearchResults([...dedupedIngredientItems, ...dedupedPackagedItems]);

  return { classifier, sections };
}

export async function hydrateFoodSearchResult(
  result: FoodSearchResult
): Promise<FoodSearchResult> {
  // Ingredient and packaged details are fully represented in search results.
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
      search_text: buildFoodSearchMetadataText({
        name: food.name,
        brand: food.brand,
        servingLabel: food.serving_label,
        portionOptions,
      }),
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
