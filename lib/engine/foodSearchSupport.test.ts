import { FoodSearchResult } from './types/nutrition.ts';
import {
  buildFoodSearchQueryProfile,
  classifyFoodQuery,
  filterFoodSearchSections,
  getStapleFallbackResults,
  hasHighConfidenceBestMatch,
  scoreFoodSearchItem,
  shouldSearchIngredientsForMode,
  shouldSearchPackagedForMode,
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
  const fallbackEggs = getStapleFallbackResults(eggProfile);
  assert('eggs has a staple fallback result', fallbackEggs.length > 0);
  assert('eggs fallback is a large egg entry', fallbackEggs[0].serving_label === '1 large egg');

  const riceProfile = buildFoodSearchQueryProfile('rice');
  const fallbackRice = getStapleFallbackResults(riceProfile);
  assert('rice has multiple staple fallback results', fallbackRice.length >= 4);
  assert('rice fallback includes brown rice', fallbackRice.some((item) => item.name.toLowerCase().includes('brown rice')));
  assert('rice fallback includes rice pudding', fallbackRice.some((item) => item.name.toLowerCase().includes('rice pudding')));

  const yogurtProfile = buildFoodSearchQueryProfile('plain yogurt');
  const fallbackYogurt = getStapleFallbackResults(yogurtProfile);
  assert('plain yogurt resolves to fallback results', fallbackYogurt.length >= 2);
  assert('plain yogurt includes greek yogurt', fallbackYogurt.some((item) => item.name.toLowerCase().includes('greek yogurt')));

  const strawberryProfile = buildFoodSearchQueryProfile('strawberries');
  const fallbackStrawberry = getStapleFallbackResults(strawberryProfile);
  assert('strawberries resolves to fallback results', fallbackStrawberry.length >= 1);
  assert('strawberries includes strawberry entry', fallbackStrawberry.some((item) => item.name.toLowerCase().includes('strawberr')));

  const kiwiProfile = buildFoodSearchQueryProfile('kiwi');
  const fallbackKiwi = getStapleFallbackResults(kiwiProfile);
  assert('kiwi resolves to fallback results', fallbackKiwi.length >= 2);
  assert('kiwi includes green kiwi', fallbackKiwi.some((item) => item.name.toLowerCase().includes('green')));

  const mangoProfile = buildFoodSearchQueryProfile('mango');
  const fallbackMango = getStapleFallbackResults(mangoProfile);
  assert('mango resolves to fallback results', fallbackMango.length >= 1);
  assert('mango includes mango entry', fallbackMango.some((item) => item.name.toLowerCase().includes('mango')));

  const oatmealProfile = buildFoodSearchQueryProfile('oatmeal');
  const fallbackOatmeal = getStapleFallbackResults(oatmealProfile);
  assert('oatmeal canonicalizes into oats-style terms', oatmealProfile.searchTerms.includes('rolled oats'));
  assert('oatmeal resolves to fallback results', fallbackOatmeal.length >= 1);

  const groundPorkProfile = buildFoodSearchQueryProfile('ground pork');
  assert('multi-word queries retain tokenized search terms', groundPorkProfile.searchTerms.includes('ground'));
  assert('multi-word queries retain shared noun token', groundPorkProfile.searchTerms.includes('pork'));

  const porkProfile = buildFoodSearchQueryProfile('pork');
  const fallbackPork = getStapleFallbackResults(porkProfile);
  assert('pork resolves to fallback results', fallbackPork.length >= 4);
  assert('pork includes pork chop or pork loin', fallbackPork.some((item) => item.name.toLowerCase().includes('pork')));

  const chickenProfile = buildFoodSearchQueryProfile('chicken');
  const fallbackChicken = getStapleFallbackResults(chickenProfile);
  assert('chicken resolves to multiple fallback cuts', fallbackChicken.length >= 4);
  assert('chicken includes breast and thigh style entries', fallbackChicken.some((item) => item.name.toLowerCase().includes('thigh')));
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

  const allSections = filterFoodSearchSections([
    { id: 'best-match', title: 'Best match', items: [ingredient] },
    { id: 'ingredients', title: 'Ingredient results', items: [ingredient] },
    { id: 'packaged', title: 'Packaged results', items: [packaged] },
  ], 'all');
  assert('all filter keeps ingredient sections', allSections.some((section) => section.id === 'ingredients'));
  assert('all filter keeps packaged sections', allSections.some((section) => section.id === 'packaged'));

  const fallback = getStapleFallbackResults(buildFoodSearchQueryProfile('egg'))[0];
  const recentSections = filterFoodSearchSections([
    { id: 'ingredients', title: 'Ingredient results', items: [fallback] },
  ], 'recent');
  assert('recent filter excludes unlogged fallback staples', recentSections.length === 0);

  const loggedFallback = { ...fallback, user_id: 'user-1' };
  const loggedFallbackSections = filterFoodSearchSections([
    { id: 'ingredients', title: 'Ingredient results', items: [loggedFallback] },
  ], 'recent');
  assert('recent filter keeps logged fallback staples', loggedFallbackSections.length === 1);
}

console.log('\n-- mode provider planning --');
{
  assert('all mode searches ingredients', shouldSearchIngredientsForMode('all'));
  assert('all mode searches packaged', shouldSearchPackagedForMode('all'));
  assert('ingredients mode skips packaged provider', !shouldSearchPackagedForMode('ingredients'));
  assert('ingredients mode searches ingredient provider', shouldSearchIngredientsForMode('ingredients'));
  assert('packaged mode skips ingredient provider', !shouldSearchIngredientsForMode('packaged'));
  assert('packaged mode searches packaged provider', shouldSearchPackagedForMode('packaged'));
  assert('recent mode skips ingredient provider', !shouldSearchIngredientsForMode('recent'));
  assert('recent mode skips packaged provider', !shouldSearchPackagedForMode('recent'));
}

console.log(`\n${passed} passed, ${failed} failed`);

if (failed > 0) {
  throw new Error(`${failed} food search tests failed`);
}
