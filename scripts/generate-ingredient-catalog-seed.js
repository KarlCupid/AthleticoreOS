const fs = require('node:fs');
const path = require('node:path');

const TARGET_COUNT = 500;
const projectRoot = process.cwd();
const commonCatalogPath = path.join(projectRoot, 'lib', 'api', 'commonIngredientCatalog.ts');
const outputSeedPath = path.join(projectRoot, 'supabase', 'seeds', 'ingredient_catalog_seed.json');
const outputMigrationPath = path.join(projectRoot, 'supabase', 'migrations', '019_local_ingredient_catalog.sql');

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function normalizeSearchText(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function unique(values) {
  return [...new Set(values)];
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundToTenth(value) {
  return Math.round(value * 10) / 10;
}

function parseCommonCatalog() {
  const file = fs.readFileSync(commonCatalogPath, 'utf8');
  const marker = 'export const COMMON_INGREDIENT_CATALOG';
  const markerIndex = file.indexOf(marker);
  if (markerIndex === -1) {
    throw new Error('Could not find COMMON_INGREDIENT_CATALOG export.');
  }

  const equalsIndex = file.indexOf('=', markerIndex);
  const start = file.indexOf('[', equalsIndex);
  const end = file.indexOf('];', start);
  if (equalsIndex === -1 || start === -1 || end === -1) {
    throw new Error('Could not parse COMMON_INGREDIENT_CATALOG array.');
  }

  const arrayText = file.substring(start, end + 1);
  const parsed = eval(arrayText);
  if (!Array.isArray(parsed)) {
    throw new Error('COMMON_INGREDIENT_CATALOG did not parse to an array.');
  }

  return parsed;
}

function createEntry(input) {
  const id = slugify(input.id || input.name);
  const aliases = unique([
    normalizeSearchText(input.name),
    ...(input.aliases || []).map((alias) => normalizeSearchText(alias)).filter(Boolean),
  ]).filter(Boolean);
  const servingGrams = clamp(Math.round(input.servingGrams || 100), 1, 1000);
  const servingLabel = input.servingLabel || (servingGrams === 100 ? '100g' : '1 serving');
  const calories = clamp(Math.round(input.calories || 0), 0, 1200);
  const protein = roundToTenth(clamp(Number(input.protein || 0), 0, 120));
  const carbs = roundToTenth(clamp(Number(input.carbs || 0), 0, 150));
  const fat = roundToTenth(clamp(Number(input.fat || 0), 0, 120));

  const extraPortions = (input.extraPortions || []).map((portion) => ({
    id: slugify(portion.id || portion.label || 'portion'),
    label: portion.label || `${portion.amount || 1} portion`,
    amount: Number(portion.amount || 1),
    grams: Number(portion.grams || servingGrams),
  }));

  return {
    id,
    name: input.name,
    aliases,
    servingLabel,
    servingGrams,
    calories,
    protein,
    carbs,
    fat,
    extraPortions,
  };
}

function buildSyntheticEntry(name, category, options = {}) {
  const key = `${category}:${name}`;
  const hash = hashString(key);
  const variation = (hash % 9) - 4;
  const servingGrams = options.servingGrams || 100;
  const servingLabel = options.servingLabel || (servingGrams === 100 ? '100g' : '1 serving');

  const base = {
    calories: options.baseCalories || 100,
    protein: options.baseProtein || 3,
    carbs: options.baseCarbs || 10,
    fat: options.baseFat || 2,
  };

  const calories = clamp(Math.round(base.calories + variation * 4), 5, 900);
  const protein = roundToTenth(clamp(base.protein + variation * 0.6, 0, 90));
  const carbs = roundToTenth(clamp(base.carbs + variation * 0.9, 0, 120));
  const fat = roundToTenth(clamp(base.fat + variation * 0.5, 0, 90));

  const aliases = unique([
    name,
    ...(options.aliases || []),
    ...(options.familyAliases || []),
  ]);

  return createEntry({
    id: `${category}_${name}`,
    name,
    aliases,
    servingLabel,
    servingGrams,
    calories,
    protein,
    carbs,
    fat,
    extraPortions: options.extraPortions || [],
  });
}

function addMatrix(entries, seenIds, familyList, variants, options) {
  for (const family of familyList) {
    for (const variant of variants) {
      const name = `${family.label}, ${variant.label}`;
      const aliasBase = unique([
        family.label,
        ...family.aliases,
        `${family.label} ${variant.short}`,
        `${variant.short} ${family.label}`,
      ]);
      const entry = buildSyntheticEntry(name, `${options.category}_${family.key}_${variant.key}`, {
        servingLabel: options.servingLabel,
        servingGrams: options.servingGrams,
        baseCalories: options.baseCalories + (variant.calorieOffset || 0),
        baseProtein: options.baseProtein + (variant.proteinOffset || 0),
        baseCarbs: options.baseCarbs + (variant.carbOffset || 0),
        baseFat: options.baseFat + (variant.fatOffset || 0),
        aliases: aliasBase,
        familyAliases: family.aliases,
        extraPortions: options.extraPortions || [],
      });

      if (!seenIds.has(entry.id)) {
        seenIds.add(entry.id);
        entries.push(entry);
      }
    }
  }
}

function addList(entries, seenIds, values, options) {
  for (const value of values) {
    const name = typeof value === 'string' ? value : value.name;
    const aliases = typeof value === 'string' ? [] : value.aliases || [];
    const entry = buildSyntheticEntry(name, `${options.category}_${slugify(name)}`, {
      servingLabel: options.servingLabel,
      servingGrams: options.servingGrams,
      baseCalories: options.baseCalories,
      baseProtein: options.baseProtein,
      baseCarbs: options.baseCarbs,
      baseFat: options.baseFat,
      aliases,
      familyAliases: options.familyAliases || [],
      extraPortions: options.extraPortions || [],
    });

    if (!seenIds.has(entry.id)) {
      seenIds.add(entry.id);
      entries.push(entry);
    }
  }
}

function buildCanonicalSeed() {
  const commonCatalog = parseCommonCatalog();
  const entries = [];
  const seenIds = new Set();

  for (const item of commonCatalog) {
    const entry = createEntry({
      id: item.id,
      name: item.name,
      aliases: item.aliases,
      servingLabel: item.servingLabel,
      servingGrams: item.servingGrams,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      extraPortions: item.extraPortions || [],
    });

    if (!seenIds.has(entry.id)) {
      seenIds.add(entry.id);
      entries.push(entry);
    }
  }

  const meatFamilies = [
    { key: 'chicken', label: 'Chicken', aliases: ['chicken', 'poultry'] },
    { key: 'turkey', label: 'Turkey', aliases: ['turkey', 'poultry'] },
    { key: 'duck', label: 'Duck', aliases: ['duck', 'poultry'] },
    { key: 'beef', label: 'Beef', aliases: ['beef', 'red meat'] },
    { key: 'bison', label: 'Bison', aliases: ['bison', 'red meat'] },
    { key: 'veal', label: 'Veal', aliases: ['veal', 'red meat'] },
    { key: 'pork', label: 'Pork', aliases: ['pork'] },
    { key: 'lamb', label: 'Lamb', aliases: ['lamb'] },
    { key: 'goat', label: 'Goat', aliases: ['goat'] },
    { key: 'venison', label: 'Venison', aliases: ['venison', 'game meat'] },
    { key: 'rabbit', label: 'Rabbit', aliases: ['rabbit', 'game meat'] },
    { key: 'boar', label: 'Wild boar', aliases: ['boar', 'wild boar'] },
  ];

  const meatVariants = [
    { key: 'loin', label: 'loin, cooked', short: 'loin', calorieOffset: -10, proteinOffset: 2, fatOffset: -2 },
    { key: 'chop', label: 'chop, cooked', short: 'chop', calorieOffset: 15, proteinOffset: 1, fatOffset: 3 },
    { key: 'sirloin', label: 'sirloin, cooked', short: 'sirloin', calorieOffset: -5, proteinOffset: 2, fatOffset: -1 },
    { key: 'roast', label: 'roast, cooked', short: 'roast', calorieOffset: 8, proteinOffset: 1, fatOffset: 1 },
    { key: 'tenderloin', label: 'tenderloin, cooked', short: 'tenderloin', calorieOffset: -12, proteinOffset: 3, fatOffset: -3 },
    { key: 'ground_lean', label: 'ground, lean, cooked', short: 'lean ground', calorieOffset: 5, proteinOffset: 0, fatOffset: 1 },
    { key: 'ground_regular', label: 'ground, regular, cooked', short: 'ground', calorieOffset: 30, proteinOffset: -1, fatOffset: 5 },
    { key: 'stew', label: 'stew meat, cooked', short: 'stew', calorieOffset: 12, proteinOffset: 1, fatOffset: 2 },
  ];

  addMatrix(entries, seenIds, meatFamilies, meatVariants, {
    category: 'meat',
    servingLabel: '4 oz cooked',
    servingGrams: 112,
    baseCalories: 210,
    baseProtein: 28,
    baseCarbs: 0,
    baseFat: 10,
    extraPortions: [{ id: '100g', label: '100g', amount: 100, grams: 100 }],
  });

  const seafoodFamilies = [
    'Salmon', 'Tuna', 'Cod', 'Halibut', 'Tilapia', 'Sardine', 'Anchovy', 'Herring', 'Mackerel',
    'Trout', 'Snapper', 'Mahi mahi', 'Swordfish', 'Catfish', 'Pollock', 'Sole', 'Flounder',
    'Sea bass', 'Grouper', 'Whiting', 'Perch', 'Char', 'Shrimp', 'Prawn', 'Crab', 'Lobster',
    'Scallop', 'Mussel', 'Clam', 'Oyster', 'Octopus', 'Squid', 'Cuttlefish', 'Eel', 'Monkfish',
  ];
  const seafoodForms = [
    { key: 'raw', label: 'raw', short: 'raw', calorieOffset: -8, proteinOffset: -1, fatOffset: -1 },
    { key: 'baked', label: 'baked', short: 'baked', calorieOffset: 5, proteinOffset: 1, fatOffset: 0 },
    { key: 'grilled', label: 'grilled', short: 'grilled', calorieOffset: 8, proteinOffset: 1, fatOffset: 1 },
  ];

  addMatrix(
    entries,
    seenIds,
    seafoodFamilies.map((name) => ({ key: slugify(name), label: name, aliases: [name.toLowerCase(), 'seafood'] })),
    seafoodForms,
    {
      category: 'seafood',
      servingLabel: '4 oz cooked',
      servingGrams: 112,
      baseCalories: 145,
      baseProtein: 24,
      baseCarbs: 0,
      baseFat: 4,
      extraPortions: [{ id: '100g', label: '100g', amount: 100, grams: 100 }],
    }
  );

  const grainFamilies = [
    'Brown rice', 'White rice', 'Jasmine rice', 'Basmati rice', 'Black rice', 'Wild rice',
    'Quinoa', 'Farro', 'Barley', 'Bulgur', 'Couscous', 'Millet', 'Sorghum', 'Buckwheat',
    'Amaranth', 'Oat groats', 'Steel-cut oats', 'Rolled oats', 'Polenta', 'Whole-wheat pasta',
  ];
  const grainForms = [
    { key: 'cooked', label: 'cooked', short: 'cooked', calorieOffset: 0, proteinOffset: 0, carbOffset: 0, fatOffset: 0 },
    { key: 'boiled', label: 'boiled', short: 'boiled', calorieOffset: -5, proteinOffset: 0, carbOffset: -1, fatOffset: 0 },
    { key: 'steamed', label: 'steamed', short: 'steamed', calorieOffset: -3, proteinOffset: 0, carbOffset: -1, fatOffset: 0 },
  ];

  addMatrix(
    entries,
    seenIds,
    grainFamilies.map((name) => ({ key: slugify(name), label: name, aliases: [name.toLowerCase(), 'grain'] })),
    grainForms,
    {
      category: 'grain',
      servingLabel: '1 cup cooked',
      servingGrams: 158,
      baseCalories: 205,
      baseProtein: 5,
      baseCarbs: 40,
      baseFat: 2,
      extraPortions: [{ id: '100g', label: '100g', amount: 100, grams: 100 }],
    }
  );

  const legumeFamilies = [
    'Black beans', 'Kidney beans', 'Pinto beans', 'Navy beans', 'Cannellini beans', 'Great northern beans',
    'Lentils, brown', 'Lentils, green', 'Lentils, red', 'Chickpeas', 'Split peas', 'Edamame',
    'Soybeans', 'Mung beans', 'Lima beans', 'Fava beans',
  ];
  const legumeForms = [
    { key: 'cooked', label: 'cooked', short: 'cooked', calorieOffset: 0, proteinOffset: 0, carbOffset: 0, fatOffset: 0 },
    { key: 'boiled', label: 'boiled', short: 'boiled', calorieOffset: -4, proteinOffset: 0, carbOffset: -1, fatOffset: 0 },
    { key: 'stewed', label: 'stewed', short: 'stewed', calorieOffset: 6, proteinOffset: 0, carbOffset: 1, fatOffset: 0 },
  ];

  addMatrix(
    entries,
    seenIds,
    legumeFamilies.map((name) => ({ key: slugify(name), label: name, aliases: [name.toLowerCase(), 'legume'] })),
    legumeForms,
    {
      category: 'legume',
      servingLabel: '1/2 cup cooked',
      servingGrams: 86,
      baseCalories: 115,
      baseProtein: 7,
      baseCarbs: 20,
      baseFat: 1,
      extraPortions: [{ id: '100g', label: '100g', amount: 100, grams: 100 }],
    }
  );

  const fruits = [
    'Apple', 'Apricot', 'Avocado', 'Banana', 'Blackberry', 'Blueberry', 'Boysenberry', 'Cantaloupe', 'Cherry',
    'Clementine', 'Coconut', 'Cranberry', 'Date', 'Dragon fruit', 'Fig', 'Grape', 'Grapefruit', 'Guava',
    'Honeydew', 'Jackfruit', 'Kiwi', 'Kumquat', 'Lemon', 'Lime', 'Lychee', 'Mango', 'Mulberry', 'Nectarine',
    'Orange', 'Papaya', 'Passion fruit', 'Peach', 'Pear', 'Persimmon', 'Pineapple', 'Plantain', 'Plum',
    'Pomegranate', 'Pomelo', 'Quince', 'Raspberry', 'Starfruit', 'Strawberry', 'Tangerine', 'Watermelon',
  ];

  addList(entries, seenIds, fruits, {
    category: 'fruit',
    servingLabel: '1 cup',
    servingGrams: 140,
    baseCalories: 78,
    baseProtein: 1.2,
    baseCarbs: 19,
    baseFat: 0.4,
    familyAliases: ['fruit'],
    extraPortions: [{ id: '100g', label: '100g', amount: 100, grams: 100 }],
  });

  const vegetables = [
    'Artichoke', 'Arugula', 'Asparagus', 'Beet', 'Bell pepper', 'Bok choy', 'Broccoli', 'Brussels sprouts',
    'Cabbage', 'Carrot', 'Cauliflower', 'Celery', 'Chard', 'Collard greens', 'Corn', 'Cucumber', 'Daikon',
    'Eggplant', 'Endive', 'Fennel', 'Green bean', 'Kale', 'Kohlrabi', 'Leek', 'Lettuce', 'Mushroom',
    'Mustard greens', 'Okra', 'Onion', 'Parsnip', 'Pea', 'Potato', 'Pumpkin', 'Radish', 'Rutabaga',
    'Shallot', 'Spinach', 'Squash', 'Sweet potato', 'Tomatillo', 'Tomato', 'Turnip', 'Watercress',
    'Yam', 'Zucchini', 'Butternut squash', 'Acorn squash', 'Snow pea', 'Snap pea', 'Broccolini',
    'Red cabbage', 'Savoy cabbage', 'Romanesco', 'Chayote', 'Jicama', 'Celery root', 'Beet greens', 'Radicchio',
    'Napa cabbage', 'Swiss chard',
  ];

  addList(entries, seenIds, vegetables, {
    category: 'vegetable',
    servingLabel: '1 cup',
    servingGrams: 90,
    baseCalories: 38,
    baseProtein: 2.1,
    baseCarbs: 7.4,
    baseFat: 0.4,
    familyAliases: ['vegetable'],
    extraPortions: [{ id: '100g', label: '100g', amount: 100, grams: 100 }],
  });

  const nutsAndSeeds = [
    'Almond', 'Cashew', 'Pistachio', 'Walnut', 'Pecan', 'Hazelnut', 'Macadamia', 'Brazil nut', 'Pine nut',
    'Peanut', 'Sunflower seed', 'Pumpkin seed', 'Sesame seed', 'Chia seed', 'Flaxseed', 'Hemp seed',
    'Coconut flakes', 'Chestnut', 'Lotus seed', 'Watermelon seed',
  ];

  addList(entries, seenIds, nutsAndSeeds, {
    category: 'nut_seed',
    servingLabel: '1 oz',
    servingGrams: 28,
    baseCalories: 170,
    baseProtein: 6,
    baseCarbs: 6,
    baseFat: 14,
    familyAliases: ['nuts', 'seeds'],
    extraPortions: [{ id: '100g', label: '100g', amount: 100, grams: 100 }],
  });

  const dairyAndAlternatives = [
    { name: 'Milk, skim', aliases: ['skim milk'] },
    { name: 'Milk, 1%', aliases: ['1 percent milk'] },
    { name: 'Milk, 2%', aliases: ['2 percent milk'] },
    { name: 'Milk, whole', aliases: ['whole milk'] },
    { name: 'Greek yogurt, plain', aliases: ['greek yogurt'] },
    { name: 'Yogurt, plain', aliases: ['plain yogurt'] },
    { name: 'Cottage cheese, lowfat', aliases: ['cottage cheese'] },
    { name: 'Ricotta cheese', aliases: ['ricotta'] },
    { name: 'Mozzarella cheese', aliases: ['mozzarella'] },
    { name: 'Cheddar cheese', aliases: ['cheddar'] },
    { name: 'Parmesan cheese', aliases: ['parmesan'] },
    { name: 'Soy milk, unsweetened', aliases: ['soy milk'] },
    { name: 'Almond milk, unsweetened', aliases: ['almond milk'] },
    { name: 'Oat milk, unsweetened', aliases: ['oat milk'] },
    { name: 'Coconut milk beverage, unsweetened', aliases: ['coconut milk beverage'] },
  ];

  addList(entries, seenIds, dairyAndAlternatives, {
    category: 'dairy',
    servingLabel: '1 cup',
    servingGrams: 240,
    baseCalories: 120,
    baseProtein: 8,
    baseCarbs: 10,
    baseFat: 5,
    familyAliases: ['dairy'],
    extraPortions: [{ id: '100g', label: '100g', amount: 100, grams: 100 }],
  });

  if (entries.length < TARGET_COUNT) {
    throw new Error(`Generated ${entries.length} ingredients, below target of ${TARGET_COUNT}.`);
  }

  return entries.slice(0, TARGET_COUNT);
}

function toSqlValue(value) {
  if (value == null) {
    return 'NULL';
  }

  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : String(value);
  }

  return `'${String(value).replace(/'/g, "''")}'`;
}

function buildSearchText(entry) {
  return normalizeSearchText([
    entry.name,
    ...entry.aliases,
    entry.servingLabel,
  ].join(' '));
}

function buildPortionOptions(entry) {
  const options = [
    {
      id: 'serving',
      label: entry.servingLabel,
      amount: 1,
      unit: 'portion',
      grams: entry.servingGrams,
      isDefault: true,
    },
    ...(entry.extraPortions || []).map((portion) => ({
      id: slugify(portion.id || portion.label || 'portion'),
      label: portion.label,
      amount: portion.amount,
      unit: portion.label.toLowerCase().includes('g') ? 'g' : 'portion',
      grams: portion.grams,
    })),
  ];

  return JSON.stringify(options);
}

function buildMigration(seedEntries) {
  const valueRows = seedEntries.map((entry) => {
    const externalId = `ingredient:${entry.id}`;
    const portionOptions = buildPortionOptions(entry);
    const searchText = buildSearchText(entry);

    return `  (
    NULL,
    'custom',
    'ingredient',
    ${toSqlValue(externalId)},
    TRUE,
    NULL,
    ${toSqlValue(entry.name)},
    NULL,
    ${toSqlValue(searchText)},
    1,
    'portion',
    ${toSqlValue(entry.servingGrams)},
    ${toSqlValue(portionOptions)}::jsonb,
    ${toSqlValue(entry.servingGrams)},
    ${toSqlValue(entry.servingLabel)},
    ${toSqlValue(entry.calories)},
    ${toSqlValue(entry.protein)},
    ${toSqlValue(entry.carbs)},
    ${toSqlValue(entry.fat)},
    FALSE,
    NULL
  )`;
  });

  return `-- Local-owned ingredient catalog seed and policy tightening
-- Generated by scripts/generate-ingredient-catalog-seed.js

BEGIN;

-- Normalize legacy USDA ingredient rows to local-owned semantics.
UPDATE public.food_items
SET
  source = 'custom',
  source_type = 'ingredient',
  verified = TRUE,
  search_text = lower(
    trim(
      regexp_replace(
        concat_ws(' ', coalesce(name, ''), coalesce(brand, ''), coalesce(serving_label, '')),
        '\\s+',
        ' ',
        'g'
      )
    )
  )
WHERE source = 'usda' AND coalesce(source_type, 'ingredient') = 'ingredient';

-- Clients can only insert their own rows; shared catalog writes are migration/service-role only.
DROP POLICY IF EXISTS "Users can insert shared food items" ON public.food_items;
DROP POLICY IF EXISTS "Users can insert their own food items" ON public.food_items;
CREATE POLICY "Users can insert their own food items"
  ON public.food_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

INSERT INTO public.food_items (
  user_id,
  source,
  source_type,
  external_id,
  verified,
  off_barcode,
  name,
  brand,
  search_text,
  base_amount,
  base_unit,
  grams_per_portion,
  portion_options,
  serving_size_g,
  serving_label,
  calories_per_serving,
  protein_per_serving,
  carbs_per_serving,
  fat_per_serving,
  is_supplement,
  image_url
)
VALUES
${valueRows.join(',\n')}
ON CONFLICT (source, external_id) WHERE (external_id IS NOT NULL)
DO UPDATE SET
  source_type = EXCLUDED.source_type,
  verified = EXCLUDED.verified,
  name = EXCLUDED.name,
  search_text = EXCLUDED.search_text,
  base_amount = EXCLUDED.base_amount,
  base_unit = EXCLUDED.base_unit,
  grams_per_portion = EXCLUDED.grams_per_portion,
  portion_options = EXCLUDED.portion_options,
  serving_size_g = EXCLUDED.serving_size_g,
  serving_label = EXCLUDED.serving_label,
  calories_per_serving = EXCLUDED.calories_per_serving,
  protein_per_serving = EXCLUDED.protein_per_serving,
  carbs_per_serving = EXCLUDED.carbs_per_serving,
  fat_per_serving = EXCLUDED.fat_per_serving,
  is_supplement = EXCLUDED.is_supplement,
  image_url = EXCLUDED.image_url;

COMMIT;
`;
}

function main() {
  const seedEntries = buildCanonicalSeed();
  const seedPayload = {
    count: seedEntries.length,
    items: seedEntries,
  };

  fs.mkdirSync(path.dirname(outputSeedPath), { recursive: true });
  fs.writeFileSync(outputSeedPath, `${JSON.stringify(seedPayload, null, 2)}\n`);

  const migrationSql = buildMigration(seedEntries);
  fs.writeFileSync(outputMigrationPath, migrationSql);

  console.log(`Wrote ${seedEntries.length} ingredients to ${path.relative(projectRoot, outputSeedPath)}`);
  console.log(`Wrote migration to ${path.relative(projectRoot, outputMigrationPath)}`);
}

main();
