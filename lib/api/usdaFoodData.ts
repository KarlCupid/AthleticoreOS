import { FoodPortionOption, FoodSearchResult } from '../engine/types';
import { buildFoodSearchQueryProfile, scoreIngredientCandidate, type FoodSearchQueryProfile } from './foodSearchSupport';
import { calculateCaloriesFromMacros } from '../utils/nutrition';

const USDA_API_BASE = 'https://api.nal.usda.gov/fdc/v1';
const USDA_INGREDIENT_TYPES = ['Foundation', 'SR Legacy', 'Survey (FNDDS)'];

function getDataTypeRank(dataType: string | undefined): number {
  const normalized = dataType ?? '';
  const index = USDA_INGREDIENT_TYPES.indexOf(normalized);
  return index === -1 ? USDA_INGREDIENT_TYPES.length : index;
}

interface USDASearchFood {
  fdcId?: number;
  description?: string;
  dataType?: string;
}

interface USDASearchResponse {
  foods?: USDASearchFood[];
}

interface USDANutrientRef {
  number?: string;
  name?: string;
  unitName?: string;
}

interface USDAFoodNutrient {
  amount?: number;
  value?: number;
  nutrient?: USDANutrientRef;
  nutrientNumber?: string;
  nutrientName?: string;
  unitName?: string;
}

interface USDAMeasureUnit {
  name?: string;
  abbreviation?: string;
}

interface USDAFoodPortion {
  id?: number;
  amount?: number;
  gramWeight?: number;
  modifier?: string;
  portionDescription?: string;
  measureUnit?: USDAMeasureUnit;
}

interface USDAFoodDetail {
  fdcId?: number;
  description?: string;
  dataType?: string;
  brandOwner?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  foodNutrients?: USDAFoodNutrient[];
  foodPortions?: USDAFoodPortion[];
}

function getUsdaApiKey(): string {
  return process.env.EXPO_PUBLIC_USDA_API_KEY || 'DEMO_KEY';
}

function getNutrientValue(
  nutrients: USDAFoodNutrient[] | undefined,
  targets: { numbers: string[]; names: string[] }
): number {
  for (const nutrient of nutrients ?? []) {
    const nutrientNumber = nutrient.nutrient?.number ?? nutrient.nutrientNumber ?? '';
    const nutrientName = (nutrient.nutrient?.name ?? nutrient.nutrientName ?? '').toLowerCase();
    const matchesNumber = targets.numbers.includes(nutrientNumber);
    const matchesName = targets.names.some((name) => nutrientName.includes(name));
    if (matchesNumber || matchesName) {
      const value = nutrient.amount ?? nutrient.value;
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
    }
  }

  return 0;
}

function buildIngredientPortionOptions(food: USDAFoodDetail): FoodPortionOption[] {
  const options: FoodPortionOption[] = [
    { id: '100g', label: '100g', amount: 100, unit: 'g', grams: 100, isDefault: true },
  ];
  const seen = new Set(['100g']);

  if (
    typeof food.servingSize === 'number' &&
    food.servingSize > 0 &&
    typeof food.servingSizeUnit === 'string' &&
    food.servingSizeUnit.trim()
  ) {
    const label = food.householdServingFullText?.trim() || `${food.servingSize} ${food.servingSizeUnit}`;
    const id = `serving-${label.toLowerCase()}`;
    if (!seen.has(id)) {
      options.push({
        id,
        label,
        amount: 1,
        unit: 'portion',
        grams: food.servingSizeUnit.toLowerCase() === 'g' ? food.servingSize : food.servingSize,
      });
      seen.add(id);
    }
  }

  for (const portion of food.foodPortions ?? []) {
    const gramWeight = portion.gramWeight ?? 0;
    if (!gramWeight || gramWeight <= 0) {
      continue;
    }

    const measureLabel =
      portion.portionDescription?.trim() ||
      portion.modifier?.trim() ||
      portion.measureUnit?.abbreviation?.trim() ||
      portion.measureUnit?.name?.trim();
    const amount = portion.amount ?? 1;
    const label = measureLabel ? `${amount} ${measureLabel}` : `${gramWeight}g`;
    const id = `portion-${portion.id ?? label.toLowerCase()}`;
    if (seen.has(id)) {
      continue;
    }

    options.push({
      id,
      label,
      amount,
      unit: 'portion',
      grams: gramWeight,
    });
    seen.add(id);
  }

  return options.slice(0, 6);
}

function normalizeUSDAFood(food: USDAFoodDetail, searchRank: number): FoodSearchResult {
  const calories = Math.round(
    getNutrientValue(food.foodNutrients, {
      numbers: ['1008'],
      names: ['energy'],
    })
  );
  const protein = Math.round(
    getNutrientValue(food.foodNutrients, {
      numbers: ['1003'],
      names: ['protein'],
    }) * 10
  ) / 10;
  const carbs = Math.round(
    getNutrientValue(food.foodNutrients, {
      numbers: ['1005'],
      names: ['carbohydrate'],
    }) * 10
  ) / 10;
  const fat = Math.round(
    getNutrientValue(food.foodNutrients, {
      numbers: ['1004'],
      names: ['total lipid', 'fat'],
    }) * 10
  ) / 10;
  const portionOptions = buildIngredientPortionOptions(food);
  const safeCalories = calories || calculateCaloriesFromMacros(protein, carbs, fat);

  return {
    key: `usda:${food.fdcId ?? food.description ?? searchRank}`,
    user_id: null,
    source: 'usda',
    sourceType: 'ingredient',
    external_id: food.fdcId != null ? String(food.fdcId) : null,
    verified: true,
    searchRank,
    off_barcode: null,
    name: food.description?.trim() || 'Unknown ingredient',
    brand: food.brandOwner?.trim() || null,
    image_url: null,
    baseAmount: 100,
    baseUnit: 'g',
    gramsPerPortion: 100,
    portionOptions,
    serving_size_g: 100,
    serving_label: '100g',
    calories_per_serving: safeCalories,
    protein_per_serving: protein,
    carbs_per_serving: carbs,
    fat_per_serving: fat,
    is_supplement: false,
    badges: ['Ingredient', 'Verified'],
  };
}

async function fetchUSDADetail(fdcId: number): Promise<USDAFoodDetail | null> {
  const apiKey = getUsdaApiKey();
  const response = await fetch(`${USDA_API_BASE}/food/${fdcId}?api_key=${encodeURIComponent(apiKey)}`);

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function searchIngredientFoods(
  query: string,
  limit: number = 6,
  profile?: FoodSearchQueryProfile,
): Promise<FoodSearchResult[]> {
  const queryProfile = profile ?? buildFoodSearchQueryProfile(query);
  const apiKey = getUsdaApiKey();
  const response = await fetch(`${USDA_API_BASE}/foods/search?api_key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: queryProfile.canonicalQuery || query,
      pageSize: Math.max(limit * 3, 18),
      pageNumber: 1,
      dataType: USDA_INGREDIENT_TYPES,
    }),
  });

  if (!response.ok) {
    throw new Error(`USDA search failed: ${response.status}`);
  }

  const data: USDASearchResponse = await response.json();
  const foods = (data.foods ?? [])
    .filter((food) => food.fdcId != null)
    .sort((left, right) => {
      const scoreDelta = scoreIngredientCandidate(right, queryProfile) - scoreIngredientCandidate(left, queryProfile);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return getDataTypeRank(left.dataType) - getDataTypeRank(right.dataType);
    })
    .slice(0, limit);

  const detailedFoods = await Promise.all(
    foods.map(async (food, index) => {
      const detail = await fetchUSDADetail(food.fdcId!);
      if (!detail) {
        return null;
      }

      return normalizeUSDAFood(detail, index);
    })
  );

  return detailedFoods.filter(Boolean) as FoodSearchResult[];
}

export async function hydrateIngredientFood(
  result: FoodSearchResult
): Promise<FoodSearchResult> {
  if (result.source !== 'usda' || !result.external_id) {
    return result;
  }

  const detail = await fetchUSDADetail(Number(result.external_id));
  if (!detail) {
    return result;
  }

  return normalizeUSDAFood(detail, result.searchRank);
}
