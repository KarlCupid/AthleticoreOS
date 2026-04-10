import { FoodSearchMode, FoodSearchResult } from '../engine/types';

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
  rice: ['rice', 'white rice', 'cooked white rice'],
  oats: ['oats', 'rolled oats', 'old fashioned oats'],
  oat: ['oats', 'rolled oats'],
  chicken: ['chicken', 'chicken breast'],
  'chicken breast': ['chicken breast', 'boneless skinless chicken breast'],
  apple: ['apple', 'medium apple'],
  apples: ['apple', 'medium apple'],
};

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
  return Boolean(item.user_id) || item.source === 'custom' || item.badges.includes('Favorite') || item.badges.includes('Recent');
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
  const stapleAliases = uniqueNormalized([
    ...(STAPLE_ALIAS_MAP[normalizedQuery] ?? []),
    ...(STAPLE_ALIAS_MAP[singularQuery] ?? []),
  ]);
  const canonicalQuery = (stapleAliases[0] ?? singularQuery) || normalizedQuery;
  const searchTerms = uniqueNormalized([
    normalizedQuery,
    singularQuery,
    canonicalQuery,
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
  const filterItem = (item: FoodSearchResult) => {
    if (mode === 'ingredients') {
      return item.sourceType === 'ingredient';
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
