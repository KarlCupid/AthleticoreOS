const fs = require('node:fs');
const path = require('node:path');

const projectRoot = process.cwd();
const seedPath = path.join(projectRoot, 'supabase', 'seeds', 'ingredient_catalog_seed.json');

function parseArgs(argv) {
  const defaults = {
    target: 2000,
    migration: '020_expand_ingredient_catalog_to_2000.sql',
  };

  const args = { ...defaults };
  for (const raw of argv) {
    if (!raw.startsWith('--')) continue;
    const [key, value] = raw.slice(2).split('=');
    if (!key) continue;

    if (key === 'target' && value) {
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed < 1) {
        throw new Error(`Invalid --target value: ${value}`);
      }
      args.target = Math.floor(parsed);
    }

    if (key === 'migration' && value) {
      args.migration = value;
    }
  }

  return args;
}

function normalizeSearchText(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function unique(values) {
  return [...new Set(values)];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundToTenth(value) {
  return Math.round(value * 10) / 10;
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function inferCategory(entry) {
  const id = entry.id || '';
  const lowerName = normalizeSearchText(entry.name || '');

  if (id.startsWith('meat_')) return 'meat';
  if (id.startsWith('seafood_')) return 'seafood';
  if (id.startsWith('grain_')) return 'grain';
  if (id.startsWith('legume_')) return 'legume';
  if (id.startsWith('fruit_')) return 'fruit';
  if (id.startsWith('vegetable_')) return 'vegetable';
  if (id.startsWith('nut_seed_')) return 'nut_seed';
  if (id.startsWith('dairy_')) return 'dairy';

  if (/(chicken|beef|pork|lamb|turkey|goat|venison|rabbit|salmon|tuna|shrimp|fish|meat)/.test(lowerName)) {
    return 'protein';
  }

  if (/(rice|oat|quinoa|barley|pasta|grain|beans|lentil|chickpea)/.test(lowerName)) {
    return 'staple';
  }

  if (/(apple|banana|berry|fruit|orange|mango|kiwi|grape|melon)/.test(lowerName)) {
    return 'fruit';
  }

  if (/(broccoli|spinach|carrot|tomato|pepper|potato|vegetable|kale|cabbage)/.test(lowerName)) {
    return 'vegetable';
  }

  return 'general';
}

const PROFILES = {
  meat: [
    { key: 'raw', label: 'raw', aliases: ['raw'], calorieMul: 0.92, proteinMul: 0.97, carbsMul: 1, fatMul: 0.9 },
    { key: 'grilled', label: 'grilled', aliases: ['grilled'], calorieMul: 1.02, proteinMul: 1.02, carbsMul: 1, fatMul: 1.03 },
    { key: 'roasted', label: 'roasted', aliases: ['roasted'], calorieMul: 1.06, proteinMul: 1.01, carbsMul: 1, fatMul: 1.1 },
    { key: 'braised', label: 'braised', aliases: ['braised'], calorieMul: 1.08, proteinMul: 1.0, carbsMul: 1, fatMul: 1.12 },
    { key: 'pan_seared', label: 'pan seared', aliases: ['pan seared'], calorieMul: 1.05, proteinMul: 1.01, carbsMul: 1, fatMul: 1.08 },
  ],
  seafood: [
    { key: 'raw', label: 'raw', aliases: ['raw'], calorieMul: 0.94, proteinMul: 0.98, carbsMul: 1, fatMul: 0.93 },
    { key: 'steamed', label: 'steamed', aliases: ['steamed'], calorieMul: 1.0, proteinMul: 1.01, carbsMul: 1, fatMul: 0.99 },
    { key: 'grilled', label: 'grilled', aliases: ['grilled'], calorieMul: 1.04, proteinMul: 1.02, carbsMul: 1, fatMul: 1.04 },
    { key: 'baked', label: 'baked', aliases: ['baked'], calorieMul: 1.03, proteinMul: 1.02, carbsMul: 1, fatMul: 1.03 },
    { key: 'broiled', label: 'broiled', aliases: ['broiled'], calorieMul: 1.02, proteinMul: 1.02, carbsMul: 1, fatMul: 1.02 },
  ],
  grain: [
    { key: 'boiled', label: 'boiled', aliases: ['boiled'], calorieMul: 0.98, proteinMul: 1, carbsMul: 0.99, fatMul: 0.98 },
    { key: 'steamed', label: 'steamed', aliases: ['steamed'], calorieMul: 0.99, proteinMul: 1, carbsMul: 1, fatMul: 0.99 },
    { key: 'pressure_cooked', label: 'pressure cooked', aliases: ['pressure cooked'], calorieMul: 1.0, proteinMul: 1, carbsMul: 1, fatMul: 1 },
    { key: 'pilaf', label: 'pilaf style', aliases: ['pilaf'], calorieMul: 1.08, proteinMul: 1, carbsMul: 1.02, fatMul: 1.2 },
    { key: 'porridge', label: 'porridge style', aliases: ['porridge'], calorieMul: 0.92, proteinMul: 0.98, carbsMul: 0.9, fatMul: 0.95 },
  ],
  legume: [
    { key: 'boiled', label: 'boiled', aliases: ['boiled'], calorieMul: 0.97, proteinMul: 0.99, carbsMul: 0.98, fatMul: 0.95 },
    { key: 'stewed', label: 'stewed', aliases: ['stewed'], calorieMul: 1.04, proteinMul: 1.0, carbsMul: 1.01, fatMul: 1.02 },
    { key: 'mashed', label: 'mashed', aliases: ['mashed'], calorieMul: 1.02, proteinMul: 1.0, carbsMul: 1.0, fatMul: 1.01 },
    { key: 'sprouted', label: 'sprouted', aliases: ['sprouted'], calorieMul: 0.94, proteinMul: 1.03, carbsMul: 0.9, fatMul: 0.92 },
    { key: 'baked', label: 'baked', aliases: ['baked'], calorieMul: 1.05, proteinMul: 1.0, carbsMul: 1.03, fatMul: 1.03 },
  ],
  fruit: [
    { key: 'raw', label: 'raw', aliases: ['raw'], calorieMul: 1.0, proteinMul: 1.0, carbsMul: 1.0, fatMul: 1.0 },
    { key: 'frozen', label: 'frozen', aliases: ['frozen'], calorieMul: 0.99, proteinMul: 1.0, carbsMul: 0.99, fatMul: 1.0 },
    { key: 'dried', label: 'dried', aliases: ['dried'], calorieMul: 2.3, proteinMul: 1.4, carbsMul: 2.8, fatMul: 1.2 },
    { key: 'stewed', label: 'stewed', aliases: ['stewed'], calorieMul: 1.1, proteinMul: 1.0, carbsMul: 1.15, fatMul: 1.0 },
    { key: 'pureed', label: 'pureed', aliases: ['pureed'], calorieMul: 1.03, proteinMul: 1.0, carbsMul: 1.03, fatMul: 1.0 },
  ],
  vegetable: [
    { key: 'raw', label: 'raw', aliases: ['raw'], calorieMul: 0.98, proteinMul: 1.0, carbsMul: 0.98, fatMul: 0.98 },
    { key: 'steamed', label: 'steamed', aliases: ['steamed'], calorieMul: 1.0, proteinMul: 1.0, carbsMul: 1.0, fatMul: 1.0 },
    { key: 'roasted', label: 'roasted', aliases: ['roasted'], calorieMul: 1.15, proteinMul: 1.0, carbsMul: 1.08, fatMul: 1.2 },
    { key: 'sauteed', label: 'sauteed', aliases: ['sauteed'], calorieMul: 1.22, proteinMul: 1.0, carbsMul: 1.05, fatMul: 1.45 },
    { key: 'grilled', label: 'grilled', aliases: ['grilled'], calorieMul: 1.08, proteinMul: 1.0, carbsMul: 1.03, fatMul: 1.1 },
  ],
  nut_seed: [
    { key: 'raw', label: 'raw', aliases: ['raw'], calorieMul: 1.0, proteinMul: 1.0, carbsMul: 1.0, fatMul: 1.0 },
    { key: 'dry_roasted', label: 'dry roasted', aliases: ['dry roasted'], calorieMul: 1.05, proteinMul: 1.01, carbsMul: 0.99, fatMul: 1.06 },
    { key: 'toasted', label: 'toasted', aliases: ['toasted'], calorieMul: 1.03, proteinMul: 1.0, carbsMul: 1.0, fatMul: 1.03 },
    { key: 'unsalted', label: 'unsalted', aliases: ['unsalted'], calorieMul: 1.0, proteinMul: 1.0, carbsMul: 1.0, fatMul: 1.0 },
    { key: 'ground', label: 'ground', aliases: ['ground'], calorieMul: 1.01, proteinMul: 1.0, carbsMul: 1.01, fatMul: 1.01 },
  ],
  dairy: [
    { key: 'plain', label: 'plain', aliases: ['plain'], calorieMul: 1.0, proteinMul: 1.0, carbsMul: 1.0, fatMul: 1.0 },
    { key: 'lowfat', label: 'lowfat', aliases: ['lowfat'], calorieMul: 0.86, proteinMul: 1.02, carbsMul: 0.98, fatMul: 0.6 },
    { key: 'nonfat', label: 'nonfat', aliases: ['nonfat'], calorieMul: 0.75, proteinMul: 1.05, carbsMul: 0.98, fatMul: 0.2 },
    { key: 'whole', label: 'whole', aliases: ['whole'], calorieMul: 1.15, proteinMul: 1.0, carbsMul: 1.02, fatMul: 1.35 },
    { key: 'cultured', label: 'cultured', aliases: ['cultured'], calorieMul: 1.03, proteinMul: 1.01, carbsMul: 1.02, fatMul: 1.01 },
  ],
  staple: [
    { key: 'cooked', label: 'cooked', aliases: ['cooked'], calorieMul: 1.0, proteinMul: 1.0, carbsMul: 1.0, fatMul: 1.0 },
    { key: 'boiled', label: 'boiled', aliases: ['boiled'], calorieMul: 0.97, proteinMul: 1.0, carbsMul: 0.98, fatMul: 0.98 },
    { key: 'steamed', label: 'steamed', aliases: ['steamed'], calorieMul: 0.99, proteinMul: 1.0, carbsMul: 1.0, fatMul: 0.99 },
    { key: 'baked', label: 'baked', aliases: ['baked'], calorieMul: 1.05, proteinMul: 1.01, carbsMul: 1.03, fatMul: 1.05 },
    { key: 'mashed', label: 'mashed', aliases: ['mashed'], calorieMul: 1.04, proteinMul: 1.0, carbsMul: 1.01, fatMul: 1.03 },
  ],
  protein: [
    { key: 'raw', label: 'raw', aliases: ['raw'], calorieMul: 0.94, proteinMul: 0.98, carbsMul: 1.0, fatMul: 0.92 },
    { key: 'cooked', label: 'cooked', aliases: ['cooked'], calorieMul: 1.0, proteinMul: 1.01, carbsMul: 1.0, fatMul: 1.01 },
    { key: 'grilled', label: 'grilled', aliases: ['grilled'], calorieMul: 1.03, proteinMul: 1.02, carbsMul: 1.0, fatMul: 1.04 },
    { key: 'roasted', label: 'roasted', aliases: ['roasted'], calorieMul: 1.05, proteinMul: 1.01, carbsMul: 1.0, fatMul: 1.08 },
    { key: 'seared', label: 'seared', aliases: ['seared'], calorieMul: 1.04, proteinMul: 1.01, carbsMul: 1.0, fatMul: 1.06 },
  ],
  general: [
    { key: 'plain', label: 'plain', aliases: ['plain'], calorieMul: 1.0, proteinMul: 1.0, carbsMul: 1.0, fatMul: 1.0 },
    { key: 'raw', label: 'raw', aliases: ['raw'], calorieMul: 0.98, proteinMul: 1.0, carbsMul: 0.98, fatMul: 0.98 },
    { key: 'cooked', label: 'cooked', aliases: ['cooked'], calorieMul: 1.02, proteinMul: 1.0, carbsMul: 1.01, fatMul: 1.02 },
    { key: 'fresh', label: 'fresh', aliases: ['fresh'], calorieMul: 1.0, proteinMul: 1.0, carbsMul: 1.0, fatMul: 1.0 },
    { key: 'prepared', label: 'prepared', aliases: ['prepared'], calorieMul: 1.04, proteinMul: 1.0, carbsMul: 1.02, fatMul: 1.03 },
  ],
};

function profileFor(category, round) {
  const profiles = PROFILES[category] || PROFILES.general;
  return profiles[round % profiles.length];
}

function normalizeEntry(entry) {
  return {
    id: slugify(entry.id),
    name: entry.name,
    aliases: unique((entry.aliases || []).map((v) => normalizeSearchText(v)).filter(Boolean)),
    servingLabel: entry.servingLabel,
    servingGrams: Math.max(1, Math.round(Number(entry.servingGrams || 100))),
    calories: Math.max(0, Math.round(Number(entry.calories || 0))),
    protein: Math.max(0, roundToTenth(Number(entry.protein || 0))),
    carbs: Math.max(0, roundToTenth(Number(entry.carbs || 0))),
    fat: Math.max(0, roundToTenth(Number(entry.fat || 0))),
    extraPortions: Array.isArray(entry.extraPortions) ? entry.extraPortions : [],
  };
}

function createVariant(base, profile, round) {
  const canonicalBaseName = base.name.split(',')[0].trim() || base.name;
  const variantName = `${base.name}, ${profile.label}`;
  const variantId = `${base.id}_${profile.key}_${round + 1}`;

  const noise = (hashString(`${base.id}:${profile.key}:${round}`) % 5) - 2;
  const calorieDelta = noise * 2;

  return normalizeEntry({
    id: variantId,
    name: variantName,
    aliases: unique([
      ...base.aliases,
      normalizeSearchText(canonicalBaseName),
      normalizeSearchText(`${canonicalBaseName} ${profile.label}`),
      ...profile.aliases.map((alias) => normalizeSearchText(`${canonicalBaseName} ${alias}`)),
    ]),
    servingLabel: base.servingLabel,
    servingGrams: base.servingGrams,
    calories: clamp(Math.round(base.calories * profile.calorieMul + calorieDelta), 0, 1600),
    protein: roundToTenth(clamp(base.protein * profile.proteinMul, 0, 150)),
    carbs: roundToTenth(clamp(base.carbs * profile.carbsMul, 0, 220)),
    fat: roundToTenth(clamp(base.fat * profile.fatMul, 0, 150)),
    extraPortions: base.extraPortions,
  });
}

function expandEntries(seedItems, target) {
  const baseEntries = seedItems.map(normalizeEntry);
  const expanded = [...baseEntries];
  const seen = new Set(expanded.map((item) => item.id));

  let round = 0;
  let guard = 0;

  while (expanded.length < target) {
    let addedThisRound = 0;

    for (const base of baseEntries) {
      if (expanded.length >= target) break;

      const category = inferCategory(base);
      const profile = profileFor(category, round);
      const variant = createVariant(base, profile, round);
      if (seen.has(variant.id)) {
        continue;
      }

      seen.add(variant.id);
      expanded.push(variant);
      addedThisRound += 1;
    }

    round += 1;
    guard += 1;

    if (addedThisRound === 0 || guard > 100) {
      throw new Error(`Unable to reach target count ${target}; stopped at ${expanded.length}.`);
    }
  }

  return expanded.slice(0, target);
}

function toSqlValue(value) {
  if (value == null) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return String(value);
  return `'${String(value).replace(/'/g, "''")}'`;
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
      amount: Number(portion.amount || 1),
      unit: String(portion.label || '').toLowerCase().includes('g') ? 'g' : 'portion',
      grams: Number(portion.grams || entry.servingGrams),
    })),
  ];

  return JSON.stringify(options);
}

function buildSearchText(entry) {
  return normalizeSearchText([entry.name, ...(entry.aliases || []), entry.servingLabel].join(' '));
}

function buildMigrationSql(entries) {
  const valueRows = entries.map((entry) => {
    const externalId = `ingredient:${entry.id}`;
    const searchText = buildSearchText(entry);
    const portionOptions = buildPortionOptions(entry);

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

  return `-- Expand local-owned ingredient catalog
-- Generated by scripts/expand-ingredient-catalog.js

BEGIN;

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
  const args = parseArgs(process.argv.slice(2));
  const seedRaw = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const baseItems = Array.isArray(seedRaw.items) ? seedRaw.items : [];
  if (baseItems.length === 0) {
    throw new Error('No seed items found to expand.');
  }

  const expanded = expandEntries(baseItems, args.target);
  const seedPayload = {
    count: expanded.length,
    items: expanded,
  };
  fs.writeFileSync(seedPath, `${JSON.stringify(seedPayload, null, 2)}\n`);

  const migrationPath = path.join(projectRoot, 'supabase', 'migrations', args.migration);
  const migrationSql = buildMigrationSql(expanded);
  fs.writeFileSync(migrationPath, migrationSql);

  console.log(`Expanded ingredient seed to ${expanded.length}: ${path.relative(projectRoot, seedPath)}`);
  console.log(`Generated migration: ${path.relative(projectRoot, migrationPath)}`);
}

main();
