import { supabase } from '../supabase';
import { FoodItemRow, FoodLogRow, MealType } from '../engine/types';
import { todayLocalDate } from '../utils/date';

const today = todayLocalDate;

/**
 * Log a food entry to a meal. Inserts into food_log, upserts daily_nutrition_summary,
 * and updates macro_ledger.actual_* columns.
 */
export async function logFoodEntry(
  userId: string,
  foodItem: FoodItemRow,
  mealType: MealType,
  servings: number,
  date: string = today()
) {
  const loggedCalories = Math.round(foodItem.calories_per_serving * servings);
  const loggedProtein = Math.round(foodItem.protein_per_serving * servings * 10) / 10;
  const loggedCarbs = Math.round(foodItem.carbs_per_serving * servings * 10) / 10;
  const loggedFat = Math.round(foodItem.fat_per_serving * servings * 10) / 10;

  // 1. Insert food_log entry
  const { error: logError } = await supabase.from('food_log').insert({
    user_id: userId,
    food_item_id: foodItem.id,
    date,
    meal_type: mealType,
    servings,
    logged_calories: loggedCalories,
    logged_protein: loggedProtein,
    logged_carbs: loggedCarbs,
    logged_fat: loggedFat,
  });

  if (logError) throw logError;

  // 2. Recalculate and upsert daily_nutrition_summary
  await recalculateDailySummary(userId, date);
}

/**
 * Remove a food log entry and recalculate the summary.
 */
export async function removeFoodEntry(
  userId: string,
  foodLogId: string,
  date: string
) {
  const { error } = await supabase.from('food_log').delete().eq('id', foodLogId);
  if (error) throw error;

  await recalculateDailySummary(userId, date);
}

/**
 * Recalculate daily_nutrition_summary and macro_ledger actuals from food_log.
 */
async function recalculateDailySummary(userId: string, date: string) {
  // Fetch all food_log entries for this day
  const { data: logs, error: fetchError } = await supabase
    .from('food_log')
    .select('logged_calories, logged_protein, logged_carbs, logged_fat, meal_type')
    .eq('user_id', userId)
    .eq('date', date);

  if (fetchError) throw fetchError;

  const totals = (logs ?? []).reduce(
    (acc, entry) => ({
      calories: acc.calories + (entry.logged_calories ?? 0),
      protein: acc.protein + (entry.logged_protein ?? 0),
      carbs: acc.carbs + (entry.logged_carbs ?? 0),
      fat: acc.fat + (entry.logged_fat ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const mealTypes = new Set((logs ?? []).map((l) => l.meal_type));

  // Fetch existing water total
  const { data: waterLogs } = await supabase
    .from('hydration_log')
    .select('amount_oz')
    .eq('user_id', userId)
    .eq('date', date);

  const totalWater = (waterLogs ?? []).reduce((sum, w) => sum + (w.amount_oz ?? 0), 0);

  // Upsert daily_nutrition_summary
  await supabase.from('daily_nutrition_summary').upsert(
    {
      user_id: userId,
      date,
      total_calories: Math.round(totals.calories),
      total_protein: Math.round(totals.protein * 10) / 10,
      total_carbs: Math.round(totals.carbs * 10) / 10,
      total_fat: Math.round(totals.fat * 10) / 10,
      total_water_oz: totalWater,
      meal_count: mealTypes.size,
    },
    { onConflict: 'user_id,date' }
  );

  // Update macro_ledger actuals
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

/**
 * Fetch all nutrition data for a day: food log entries with food item details,
 * macro ledger (targets + actuals), and hydration log.
 */
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

/**
 * Get recently logged foods for quick re-logging.
 */
export async function getRecentFoods(
  userId: string,
  limit: number = 20
): Promise<FoodItemRow[]> {
  const { data, error } = await supabase
    .from('food_log')
    .select('food_item_id, food_items(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit * 2); // Fetch extra to account for dedup

  if (error) throw error;

  // Deduplicate by food_item_id, keep most recent
  const seen = new Set<string>();
  const items: FoodItemRow[] = [];
  for (const row of data ?? []) {
    if (!seen.has(row.food_item_id) && row.food_items) {
      seen.add(row.food_item_id);
      items.push(row.food_items as unknown as FoodItemRow);
      if (items.length >= limit) break;
    }
  }

  return items;
}

/**
 * Toggle a food item as favorite.
 */
export async function toggleFavorite(
  userId: string,
  foodItemId: string
): Promise<boolean> {
  // Check if already favorited
  const { data: existing } = await supabase
    .from('favorite_foods')
    .select('id')
    .eq('user_id', userId)
    .eq('food_item_id', foodItemId)
    .maybeSingle();

  if (existing) {
    await supabase.from('favorite_foods').delete().eq('id', existing.id);
    return false; // unfavorited
  }

  await supabase.from('favorite_foods').insert({
    user_id: userId,
    food_item_id: foodItemId,
  });
  return true; // favorited
}

/**
 * Get favorite foods.
 */
export async function getFavoriteFoods(userId: string): Promise<FoodItemRow[]> {
  const { data, error } = await supabase
    .from('favorite_foods')
    .select('food_items(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? [])
    .map((row) => row.food_items as unknown as FoodItemRow)
    .filter(Boolean);
}

/**
 * Log water intake.
 */
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
  if (error) throw error;

  // Recalculate the full summary so water updates never clobber macro totals
  await recalculateDailySummary(userId, date);
}

/**
 * Upsert a food item into the food_items table (for caching OFF results).
 * Returns the food item with its database ID.
 */
export async function upsertFoodItem(
  item: Omit<FoodItemRow, 'id'>
): Promise<FoodItemRow> {
  if (item.off_barcode) {
    // Try to find existing by barcode
    const { data: existing } = await supabase
      .from('food_items')
      .select('*')
      .eq('off_barcode', item.off_barcode)
      .maybeSingle();

    if (existing) return existing as FoodItemRow;
  }

  const { data, error } = await supabase
    .from('food_items')
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  return data as FoodItemRow;
}

/**
 * Search local food_items by name (for cached foods + custom foods).
 */
export async function searchLocalFoods(
  userId: string,
  query: string,
  limit: number = 10
): Promise<FoodItemRow[]> {
  const { data, error } = await supabase
    .from('food_items')
    .select('*')
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .ilike('name', `%${query}%`)
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as FoodItemRow[];
}

/**
 * Create a custom food item.
 */
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
  const { data, error } = await supabase
    .from('food_items')
    .insert({
      user_id: userId,
      ...food,
    })
    .select()
    .single();

  if (error) throw error;
  return data as FoodItemRow;
}

/**
 * Ensure a macro_ledger row exists for today. Creates one with provided targets if missing.
 */
export async function ensureDailyLedger(
  userId: string,
  date: string,
  targets: {
    tdee: number;
    protein: number;
    carbs: number;
    fat: number;
    weightCorrectionDeficit?: number;
  }
) {
  const { data: existing } = await supabase
    .from('macro_ledger')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from('macro_ledger')
    .insert({
      user_id: userId,
      date,
      base_tdee: targets.tdee,
      prescribed_protein: targets.protein,
      prescribed_fats: targets.fat,
      prescribed_carbs: targets.carbs,
      weight_correction_deficit: targets.weightCorrectionDeficit ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
