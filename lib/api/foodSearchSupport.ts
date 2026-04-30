import { FoodSearchMode, FoodSearchResult } from '../engine/types';
import { COMMON_INGREDIENT_CATALOG, type CommonIngredientDefinition } from './commonIngredientCatalog';

export type FoodQueryClassification = 'barcode' | 'ingredient' | 'packaged';

const PACKAGED_KEYWORDS = [
  'bar',
  'shake',
  'protein',
  'quest',
  'fairlife',
  'gatorade',
  'cereal',
  'cookie',
  'cookies',
  'chips',
  'drink',
  'snack',
  'powder',
];

const HOUSEHOLD_PORTION_HINTS = [
  'egg',
  'cup',
  'slice',
  'piece',
  'large',
  'medium',
  'small',
  'tbsp',
  'tsp',
  'oz',
  'fillet',
  'breast',
];

const STAPLE_ALIAS_MAP: Record<string, string[]> = {
  egg: ['egg', 'whole egg', 'large egg'],
  eggs: ['egg', 'whole egg', 'large egg'],
  banana: ['banana', 'medium banana'],
  bananas: ['banana', 'medium banana'],
  oatmeal: ['oatmeal', 'oats', 'rolled oats', 'old fashioned oats'],
  rice: ['rice', 'white rice', 'cooked white rice'],
  yogurt: ['yogurt', 'plain yogurt', 'greek yogurt'],
  yogurts: ['yogurt', 'plain yogurt', 'greek yogurt'],
  'greek yogurt': ['greek yogurt', 'plain greek yogurt', 'nonfat greek yogurt'],
  strawberry: ['strawberry', 'strawberries'],
  strawberries: ['strawberry', 'strawberries'],
  kiwi: ['kiwi', 'kiwifruit'],
  kiwis: ['kiwi', 'kiwifruit'],
  oats: ['oats', 'rolled oats', 'old fashioned oats'],
  oat: ['oats', 'rolled oats'],
  pork: ['pork', 'pork loin', 'pork chop', 'pork tenderloin'],
  'pork chop': ['pork', 'pork chop', 'pork loin'],
  chicken: ['chicken', 'chicken breast', 'chicken thigh', 'chicken tenderloin', 'chicken drumstick'],
  'chicken breast': ['chicken breast', 'boneless skinless chicken breast'],
  lamb: ['lamb', 'lamb loin', 'lamb chop', 'ground lamb'],
  'lamb chop': ['lamb', 'lamb chop', 'lamb loin'],
  beef: ['beef', 'ground beef', 'lean ground beef'],
  turkey: ['turkey', 'turkey breast', 'ground turkey'],
  apple: ['apple', 'medium apple'],
  apples: ['apple', 'medium apple'],
};

const COMMON_ALIAS_LOOKUP = (() => {
  const lookup = new Map<string, string[]>();

  for (const item of COMMON_INGREDIENT_CATALOG) {
    const relatedTerms = uniqueNormalized([item.name, ...item.aliases]);
    for (const term of relatedTerms) {
      lookup.set(term, relatedTerms);
    }
  }

  return lookup;
})();

export interface FoodSearchQueryProfile {
  rawQuery: string;
  normalizedQuery: string;
  canonicalQuery: string;
  tokens: string[];
  searchTerms: string[];
  stapleAliases: string[];
  classifier: FoodQueryClassification;
  isShortGenericIngredient: boolean;
}

type FoodSearchRankable = Pick<
  FoodSearchResult,
  'name' | 'brand' | 'source' | 'sourceType' | 'verified' | 'serving_label' | 'portionOptions' | 'searchRank' | 'user_id' | 'badges'
>;

function uniqueNormalized(values: string[]): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  for (const value of values) {
    const normalized = normalizeFoodSearchText(value);
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    results.push(normalized);
  }

  return results;
}

function singularizeWord(word: string): string {
  if (word.endsWith('ies') && word.length > 3) {
    return `${word.slice(0, -3)}y`;
  }

  if (word.endsWith('oes') && word.length > 3) {
    return word.slice(0, -2);
  }

  if (word.endsWith('es') && word.length > 4 && !word.endsWith('ses')) {
    return word.slice(0, -2);
  }

  if (word.endsWith('s') && word.length > 3 && !word.endsWith('ss')) {
    return word.slice(0, -1);
  }

  return word;
}

function classifyNormalizedQuery(normalized: string, tokens: string[]): FoodQueryClassification {
  if (!normalized) {
    return 'ingredient';
  }

  if (/^\d{8,14}$/.test(normalized)) {
    return 'barcode';
  }

  if (STAPLE_ALIAS_MAP[normalized]) {
    return 'ingredient';
  }

  return PACKAGED_KEYWORDS.some((keyword) => tokens.includes(keyword) || normalized.includes(keyword))
    ? 'packaged'
    : 'ingredient';
}

function getTextMatchScore(text: string, terms: string[]): number {
  let score = 0;

  for (const term of terms) {
    if (!term) {
      continue;
    }

    if (text === term) {
      score = Math.max(score, 240);
      continue;
    }

    if (text.startsWith(`${term} `) || text.startsWith(term)) {
      score = Math.max(score, 180);
      continue;
    }

    if (text.includes(` ${term} `) || text.endsWith(` ${term}`) || text.includes(term)) {
      score = Math.max(score, 110);
    }
  }

  return score;
}

function hasHouseholdPortion(item: FoodSearchRankable): boolean {
  const labels = [
    item.serving_label,
    ...item.portionOptions.map((option) => option.label),
  ]
    .map((value) => normalizeFoodSearchText(value))
    .filter(Boolean);

  return labels.some((label) => HOUSEHOLD_PORTION_HINTS.some((hint) => label.includes(hint)));
}

function matchesRecentFilter(item: FoodSearchRankable): boolean {
  return Boolean(item.user_id) || item.badges.includes('Favorite') || item.badges.includes('Recent');
}

export function shouldSearchIngredientsForMode(mode: FoodSearchMode): boolean {
  return mode === 'all' || mode === 'ingredients';
}

export function shouldSearchPackagedForMode(mode: FoodSearchMode): boolean {
  return mode === 'all' || mode === 'packaged';
}

function collectRelatedAliasTerms(values: string[]): string[] {
  const normalizedValues = uniqueNormalized(values);
  const relatedTerms = new Set<string>();

  for (const value of normalizedValues) {
    const directMatches = COMMON_ALIAS_LOOKUP.get(value);
    if (directMatches) {
      directMatches.forEach((term) => relatedTerms.add(term));
    }

    const stapleMatches = STAPLE_ALIAS_MAP[value] ?? STAPLE_ALIAS_MAP[singularizeWord(value)] ?? [];
    stapleMatches.forEach((term) => relatedTerms.add(normalizeFoodSearchText(term)));

    for (const [lookupValue, aliases] of COMMON_ALIAS_LOOKUP.entries()) {
      if (
        value === lookupValue ||
        value.includes(lookupValue) ||
        lookupValue.includes(value)
      ) {
        aliases.forEach((term) => relatedTerms.add(term));
      }
    }
  }

  return [...relatedTerms];
}

export function normalizeFoodSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function classifyFoodQuery(query: string): FoodQueryClassification {
  const normalized = normalizeFoodSearchText(query);
  return classifyNormalizedQuery(normalized, normalized.split(' ').filter(Boolean));
}

export function buildFoodSearchQueryProfile(query: string): FoodSearchQueryProfile {
  const normalizedQuery = normalizeFoodSearchText(query);
  const tokens = normalizedQuery.split(' ').filter(Boolean);
  const singularTokens = tokens.map((token) => singularizeWord(token));
  const singularQuery = singularTokens.join(' ').trim();
  const tokenTerms = uniqueNormalized([
    ...tokens,
    ...singularTokens,
  ]);
  const stapleAliases = uniqueNormalized([
    ...(STAPLE_ALIAS_MAP[normalizedQuery] ?? []),
    ...(STAPLE_ALIAS_MAP[singularQuery] ?? []),
    ...collectRelatedAliasTerms([normalizedQuery, singularQuery, ...tokenTerms]),
  ]);
  const canonicalQuery = (stapleAliases[0] ?? singularQuery) || normalizedQuery;
  const searchTerms = uniqueNormalized([
    normalizedQuery,
    singularQuery,
    canonicalQuery,
    ...tokenTerms,
    ...stapleAliases,
  ]);
  const classifier = classifyNormalizedQuery(normalizedQuery, tokens);

  return {
    rawQuery: query,
    normalizedQuery,
    canonicalQuery,
    tokens,
    searchTerms,
    stapleAliases,
    classifier,
    isShortGenericIngredient: classifier === 'ingredient' && tokens.length > 0 && tokens.length <= 2,
  };
}

function scoreFallbackDefinition(
  fallback: CommonIngredientDefinition,
  profile: FoodSearchQueryProfile,
): number {
  const candidates = [...fallback.aliases, fallback.name].map((value) => normalizeFoodSearchText(value));
  const candidateSet = [...new Set(candidates)];
  let score = fallback.priority ?? 0;

  for (const candidate of candidateSet) {
    score += getTextMatchScore(candidate, profile.searchTerms);

    if (profile.searchTerms.some((term) => candidate.includes(term) || term.includes(candidate))) {
      score += 28;
    }

    const candidateTokens = candidate.split(' ').filter(Boolean);
    const overlap = profile.tokens.filter((token) => candidateTokens.includes(token)).length;
    score += overlap * 18;
  }

  return score;
}

export function getStapleFallbackResults(profile: FoodSearchQueryProfile): FoodSearchResult[] {
  return COMMON_INGREDIENT_CATALOG
    .map((fallback) => ({ fallback, score: scoreFallbackDefinition(fallback, profile) }))
    .filter(({ score }) => score >= 70)
    .sort((left, right) => right.score - left.score)
    .slice(0, 8)
    .map(({ fallback }, index) => {
      const portionOptions = [
        {
          id: 'serving',
          label: fallback.servingLabel,
          amount: 1,
          unit: 'portion',
          grams: fallback.servingGrams,
          isDefault: true,
        },
        ...(fallback.extraPortions ?? []).map((portion) => ({
          id: portion.id,
          label: portion.label,
          amount: portion.amount,
          unit: portion.label.toLowerCase().includes('g') ? 'g' : 'portion',
          grams: portion.grams,
        })),
      ];

      return {
        key: `fallback:${fallback.id}`,
        user_id: null,
        source: 'custom',
        sourceType: 'ingredient',
        external_id: `fallback:${fallback.id}`,
        verified: true,
        searchRank: 20 + index,
        off_barcode: null,
        name: fallback.name,
        brand: null,
        image_url: null,
        baseAmount: 1,
        baseUnit: 'portion',
        gramsPerPortion: fallback.servingGrams,
        portionOptions,
        serving_size_g: fallback.servingGrams,
        serving_label: fallback.servingLabel,
        calories_per_serving: fallback.calories,
        protein_per_serving: fallback.protein,
        carbs_per_serving: fallback.carbs,
        fat_per_serving: fallback.fat,
        is_supplement: false,
        badges: ['Ingredient', 'Verified'],
      };
    });
}

export function buildFoodSearchMetadataText(input: {
  name: string;
  brand?: string | null | undefined;
  servingLabel?: string | null | undefined;
  portionOptions?: Array<{ label?: string | null | undefined }> | undefined;
}): string {
  const normalizedName = normalizeFoodSearchText(input.name);
  const nameTokens = normalizedName.split(' ').filter(Boolean);
  const singularName = nameTokens.map((token) => singularizeWord(token)).join(' ').trim();
  const portionLabels = (input.portionOptions ?? [])
    .map((option) => option.label ?? '')
    .filter(Boolean);
  const aliasTerms = collectRelatedAliasTerms([
    normalizedName,
    singularName,
    ...nameTokens,
    ...portionLabels,
  ]);

  return uniqueNormalized([
    input.name,
    input.brand ?? '',
    input.servingLabel ?? '',
    ...portionLabels,
    ...aliasTerms,
    ...nameTokens,
    ...nameTokens.map((token) => singularizeWord(token)),
  ]).join(' ');
}

export function scoreFoodSearchItem(item: FoodSearchRankable, profile: FoodSearchQueryProfile): number {
  const normalizedName = normalizeFoodSearchText(item.name);
  const normalizedBrand = normalizeFoodSearchText(item.brand ?? '');
  let score = 0;

  score += getTextMatchScore(normalizedName, profile.searchTerms);

  if (profile.tokens.length > 1 && profile.tokens.every((token) => normalizedName.includes(token))) {
    score += 35;
  }

  if (normalizedBrand) {
    score += Math.min(24, Math.round(getTextMatchScore(normalizedBrand, profile.searchTerms) / 5));
  }

  if (item.verified) {
    score += 18;
  }

  if (item.sourceType === 'ingredient') {
    score += profile.classifier === 'ingredient' ? 42 : 12;
  }

  if (item.sourceType === 'packaged') {
    score += profile.classifier === 'packaged' ? 28 : 0;
  }

  if (matchesRecentFilter(item)) {
    score += 10;
  }

  if (hasHouseholdPortion(item)) {
    score += 18;
  }

  if (profile.isShortGenericIngredient && item.sourceType === 'packaged') {
    score -= 90;
    if (normalizedBrand) {
      score -= 10;
    }
  }

  if (profile.isShortGenericIngredient && normalizedName.split(' ').filter(Boolean).length > 4) {
    score -= 18;
  }

  score -= Math.round((item.searchRank ?? 0) * 0.15);

  return score;
}

export function scoreIngredientCandidate(
  input: { description?: string; dataType?: string },
  profile: FoodSearchQueryProfile,
): number {
  const normalizedDescription = normalizeFoodSearchText(input.description ?? '');
  let score = getTextMatchScore(normalizedDescription, profile.searchTerms);

  if (profile.tokens.length > 1 && profile.tokens.every((token) => normalizedDescription.includes(token))) {
    score += 30;
  }

  if (normalizedDescription.includes(profile.canonicalQuery)) {
    score += 18;
  }

  const dataType = normalizeFoodSearchText(input.dataType ?? '');
  if (dataType.includes('foundation')) {
    score += 20;
  } else if (dataType.includes('legacy')) {
    score += 12;
  }

  if (profile.isShortGenericIngredient && normalizedDescription.split(' ').filter(Boolean).length > 5) {
    score -= 12;
  }

  return score;
}

export function hasHighConfidenceBestMatch(
  rankedItems: Array<{ item: FoodSearchResult; score: number }>
): boolean {
  if (rankedItems.length === 0) {
    return false;
  }

  const [best, second] = rankedItems;
  if (best.score < 160) {
    return false;
  }

  if (best.item.calories_per_serving <= 0) {
    return false;
  }

  return !second || best.score - second.score >= 20;
}

export function filterFoodSearchSections(
  sections: Array<{ id: string; title: string; items: FoodSearchResult[] }>,
  mode: FoodSearchMode,
): Array<{ id: string; title: string; items: FoodSearchResult[] }> {
  if (mode === 'all') {
    return sections.filter((section) => section.items.length > 0);
  }

  const filterItem = (item: FoodSearchResult) => {
    if (mode === 'ingredients') {
      return item.sourceType === 'ingredient' || item.sourceType === 'custom';
    }

    if (mode === 'packaged') {
      return item.sourceType === 'packaged';
    }

    return matchesRecentFilter(item);
  };

  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter(filterItem),
    }))
    .filter((section) => section.items.length > 0);
}
