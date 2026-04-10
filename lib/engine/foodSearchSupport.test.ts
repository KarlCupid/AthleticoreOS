import { FoodSearchResult } from './types/nutrition.ts';
import {
  buildFoodSearchQueryProfile,
  classifyFoodQuery,
  filterFoodSearchSections,
  hasHighConfidenceBestMatch,
  scoreFoodSearchItem,
} from '../api/foodSearchSupport.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) {
    passed += 1;
    console.log(`  PASS ${label}`);
    return;
  }

  failed += 1;
  console.error(`  FAIL ${label}`);
}

function makeItem(overrides: Partial<FoodSearchResult>): FoodSearchResult {
  return {
    key: 'item',
    user_id: null,
    source: 'usda',
    sourceType: 'ingredient',
    external_id: '1',
    verified: true,
    searchRank: 0,
    off_barcode: null,
    name: 'Egg, whole, cooked',
    brand: null,
    image_url: null,
    baseAmount: 100,
    baseUnit: 'g',
    gramsPerPortion: 100,
    portionOptions: [
      { id: '100g', label: '100g', amount: 100, unit: 'g', grams: 100, isDefault: true },
      { id: 'egg', label: '1 large egg', amount: 1, unit: 'portion', grams: 50 },
    ],
    serving_size_g: 100,
    serving_label: '100g',
    calories_per_serving: 143,
    protein_per_serving: 12.6,
    carbs_per_serving: 1.1,
    fat_per_serving: 9.5,
    is_supplement: false,
    badges: ['Ingredient', 'Verified'],
    ...overrides,
  };
}

console.log('\n-- food search normalization --');
{
  const eggProfile = buildFoodSearchQueryProfile('eggs');
  assert('eggs canonicalizes to egg', eggProfile.canonicalQuery === 'egg');
  assert('eggs search terms include whole egg alias', eggProfile.searchTerms.includes('whole egg'));
  assert('egg classifies as ingredient', classifyFoodQuery('egg') === 'ingredient');
  assert('quest bar classifies as packaged', classifyFoodQuery('quest bar') === 'packaged');
}

console.log('\n-- food search ranking --');
{
  const eggProfile = buildFoodSearchQueryProfile('egg');
  const stapleEgg = makeItem({
    key: 'egg',
    name: 'Egg, whole, cooked',
    source: 'usda',
    sourceType: 'ingredient',
    brand: null,
  });
  const brandedEgg = makeItem({
    key: 'brand-egg',
    source: 'open_food_facts',
    sourceType: 'packaged',
    external_id: '2',
    off_barcode: '2',
    name: 'Egg Protein Bites Snack Pack',
    brand: 'BrandCo',
    serving_label: '1 pack',
    portionOptions: [{ id: 'pack', label: '1 pack', amount: 1, unit: 'serving', grams: 45, isDefault: true }],
    calories_per_serving: 180,
    badges: ['Packaged', 'Verified'],
  });
  assert(
    'generic egg query ranks ingredient above packaged snack',
    scoreFoodSearchItem(stapleEgg, eggProfile) > scoreFoodSearchItem(brandedEgg, eggProfile)
  );

  const questProfile = buildFoodSearchQueryProfile('quest bar');
  const questBar = makeItem({
    key: 'quest',
    source: 'open_food_facts',
    sourceType: 'packaged',
    external_id: '3',
    off_barcode: '3',
    name: 'Quest Protein Bar',
    brand: 'Quest',
    serving_label: '1 bar',
    portionOptions: [{ id: 'bar', label: '1 bar', amount: 1, unit: 'serving', grams: 60, isDefault: true }],
    calories_per_serving: 200,
    badges: ['Packaged', 'Verified'],
  });
  const chicken = makeItem({
    key: 'chicken',
    name: 'Chicken breast, roasted',
    source: 'usda',
    sourceType: 'ingredient',
    external_id: '4',
    calories_per_serving: 165,
    protein_per_serving: 31,
    carbs_per_serving: 0,
    fat_per_serving: 3.6,
  });
  assert(
    'branded packaged query ranks packaged item above ingredient',
    scoreFoodSearchItem(questBar, questProfile) > scoreFoodSearchItem(chicken, questProfile)
  );
}

console.log('\n-- best match and filtering --');
{
  const ingredient = makeItem({ key: 'ingredient' });
  const packaged = makeItem({
    key: 'packaged',
    source: 'open_food_facts',
    sourceType: 'packaged',
    external_id: '5',
    off_barcode: '5',
    name: 'Egg Breakfast Sandwich',
    brand: 'CafeCo',
    serving_label: '1 sandwich',
    portionOptions: [{ id: 'sandwich', label: '1 sandwich', amount: 1, unit: 'serving', grams: 140, isDefault: true }],
    calories_per_serving: 320,
    badges: ['Packaged', 'Verified'],
  });
  assert(
    'high confidence best match is detected for clear winner',
    hasHighConfidenceBestMatch([
      { item: ingredient, score: 210 },
      { item: packaged, score: 150 },
    ])
  );

  const sections = filterFoodSearchSections([
    { id: 'best-match', title: 'Best match', items: [ingredient] },
    { id: 'ingredients', title: 'Ingredient results', items: [ingredient] },
    { id: 'packaged', title: 'Packaged results', items: [packaged] },
  ], 'ingredients');
  assert('ingredient filter keeps ingredient sections', sections.some((section) => section.id === 'ingredients'));
  assert('ingredient filter removes packaged section', !sections.some((section) => section.id === 'packaged'));
}

console.log(`\n${passed} passed, ${failed} failed`);

if (failed > 0) {
  throw new Error(`${failed} food search tests failed`);
}
