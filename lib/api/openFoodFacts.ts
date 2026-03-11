import { FoodItemRow } from '../engine/types';

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
  page?: number;
  page_size?: number;
}

function normalizeOFFProduct(product: OFFProduct): Omit<FoodItemRow, 'id'> {
  const n = product.nutriments ?? {};
  const hasServingData =
    n['energy-kcal_serving'] != null && n['energy-kcal_serving'] > 0;

  let calories: number;
  let protein: number;
  let carbs: number;
  let fat: number;
  let servingSizeG: number;
  let servingLabel: string;

  if (hasServingData && product.serving_quantity) {
    // Use per-serving data
    calories = Math.round(n['energy-kcal_serving'] ?? 0);
    protein = Math.round((n.proteins_serving ?? 0) * 10) / 10;
    carbs = Math.round((n.carbohydrates_serving ?? 0) * 10) / 10;
    fat = Math.round((n.fat_serving ?? 0) * 10) / 10;
    servingSizeG = product.serving_quantity;
    servingLabel = product.serving_size ?? `${servingSizeG}g`;
  } else {
    // Fall back to per-100g
    calories = Math.round(n['energy-kcal_100g'] ?? 0);
    protein = Math.round((n.proteins_100g ?? 0) * 10) / 10;
    carbs = Math.round((n.carbohydrates_100g ?? 0) * 10) / 10;
    fat = Math.round((n.fat_100g ?? 0) * 10) / 10;
    servingSizeG = 100;
    servingLabel = '100g';
  }

  return {
    user_id: null,
    off_barcode: product.code ?? null,
    name: product.product_name ?? 'Unknown Product',
    brand: product.brands ?? null,
    serving_size_g: servingSizeG,
    serving_label: servingLabel,
    calories_per_serving: calories,
    protein_per_serving: protein,
    carbs_per_serving: carbs,
    fat_per_serving: fat,
    is_supplement: false,
    image_url: product.image_small_url ?? null,
  };
}

export async function searchFoods(
  query: string,
  page: number = 1
): Promise<{
  items: Omit<FoodItemRow, 'id'>[];
  totalCount: number;
  hasMore: boolean;
}> {
  const pageSize = 24;
  const url = `${BASE_URL}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page=${page}&page_size=${pageSize}&fields=${SEARCH_FIELDS}`;

  const response = await fetch(url, {
    headers: { 'User-Agent': 'AthleticoreOS/1.0 (contact@athleticore.app)' },
  });

  if (!response.ok) {
    throw new Error(`OFF search failed: ${response.status}`);
  }

  const data: OFFSearchResponse = await response.json();
  const products = data.products ?? [];
  const totalCount = data.count ?? 0;

  const items = products
    .filter((p) => p.product_name && p.product_name.trim() !== '')
    .map(normalizeOFFProduct);

  return {
    items,
    totalCount,
    hasMore: page * pageSize < totalCount,
  };
}

export async function lookupBarcode(
  barcode: string
): Promise<Omit<FoodItemRow, 'id'> | null> {
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

  return normalizeOFFProduct(data.product);
}
