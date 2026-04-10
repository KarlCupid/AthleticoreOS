import { FoodSearchResult } from '../engine/types';

const BASE_URL = 'https://world.openfoodfacts.org';
const SEARCH_FIELDS = 'code,product_name,brands,serving_size,nutriments,image_small_url,serving_quantity';

interface OFFNutriments {
  'energy-kcal_100g'?: number;
  'energy-kcal_serving'?: number;
  proteins_100g?: number;
  proteins_serving?: number;
  carbohydrates_100g?: number;
  carbohydrates_serving?: number;
  fat_100g?: number;
  fat_serving?: number;
}

interface OFFProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number;
  nutriments?: OFFNutriments;
  image_small_url?: string;
}

interface OFFSearchResponse {
  products?: OFFProduct[];
  count?: number;
}

function normalizeOFFProduct(product: OFFProduct, searchRank: number): FoodSearchResult {
  const nutriments = product.nutriments ?? {};
  const hasServingData =
    nutriments['energy-kcal_serving'] != null &&
    nutriments['energy-kcal_serving'] > 0 &&
    product.serving_quantity != null &&
    product.serving_quantity > 0;

  const servingSizeG = hasServingData ? Number(product.serving_quantity) : 100;
  const servingLabel = hasServingData
    ? product.serving_size?.trim() || `${servingSizeG}g`
    : '100g';

  const calories = Math.round(
    hasServingData
      ? nutriments['energy-kcal_serving'] ?? 0
      : nutriments['energy-kcal_100g'] ?? 0
  );
  const protein = Math.round(
    ((hasServingData ? nutriments.proteins_serving : nutriments.proteins_100g) ?? 0) * 10
  ) / 10;
  const carbs = Math.round(
    ((hasServingData ? nutriments.carbohydrates_serving : nutriments.carbohydrates_100g) ?? 0) * 10
  ) / 10;
  const fat = Math.round(
    ((hasServingData ? nutriments.fat_serving : nutriments.fat_100g) ?? 0) * 10
  ) / 10;

  return {
    key: `off:${product.code ?? product.product_name ?? searchRank}`,
    user_id: null,
    source: 'open_food_facts',
    sourceType: 'packaged',
    external_id: product.code ?? null,
    verified: Boolean(product.code),
    searchRank,
    off_barcode: product.code ?? null,
    name: product.product_name?.trim() || 'Unknown product',
    brand: product.brands?.trim() || null,
    image_url: product.image_small_url ?? null,
    baseAmount: 1,
    baseUnit: 'serving',
    gramsPerPortion: servingSizeG,
    portionOptions: [
      {
        id: 'serving',
        label: servingLabel,
        amount: 1,
        unit: 'serving',
        grams: servingSizeG,
        isDefault: true,
      },
    ],
    serving_size_g: servingSizeG,
    serving_label: servingLabel,
    calories_per_serving: calories,
    protein_per_serving: protein,
    carbs_per_serving: carbs,
    fat_per_serving: fat,
    is_supplement: false,
    badges: [
      'Packaged',
      ...(product.code ? (['Verified'] as const) : []),
    ],
  };
}

export async function searchPackagedFoods(
  query: string,
  page: number = 1,
  pageSize: number = 12
): Promise<{
  items: FoodSearchResult[];
  totalCount: number;
  hasMore: boolean;
}> {
  const url = `${BASE_URL}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page=${page}&page_size=${pageSize}&fields=${SEARCH_FIELDS}`;

  const response = await fetch(url, {
    headers: { 'User-Agent': 'AthleticoreOS/1.0 (contact@athleticore.app)' },
  });

  if (!response.ok) {
    throw new Error(`Open Food Facts search failed: ${response.status}`);
  }

  const data: OFFSearchResponse = await response.json();
  const products = data.products ?? [];
  const totalCount = data.count ?? 0;

  const items = products
    .filter((product) => product.product_name && product.product_name.trim() !== '')
    .map((product, index) => normalizeOFFProduct(product, 100 + index));

  return {
    items,
    totalCount,
    hasMore: page * pageSize < totalCount,
  };
}

export async function lookupBarcode(
  barcode: string
): Promise<FoodSearchResult | null> {
  const url = `${BASE_URL}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${SEARCH_FIELDS}`;

  const response = await fetch(url, {
    headers: { 'User-Agent': 'AthleticoreOS/1.0 (contact@athleticore.app)' },
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  if (!data.product || data.status === 0) {
    return null;
  }

  return normalizeOFFProduct(data.product as OFFProduct, 10);
}
