import fs from 'node:fs';
import path from 'node:path';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) {
    passed++;
    console.log(`  PASS ${label}`);
  } else {
    failed++;
    console.error(`  FAIL ${label}`);
  }
}

function read(filePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), filePath), 'utf8');
}

function walk(dir: string): string[] {
  const fullDir = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullDir)) return [];

  const results: string[] = [];
  for (const entry of fs.readdirSync(fullDir, { withFileTypes: true })) {
    const fullPath = path.join(fullDir, entry.name);
    const relPath = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      if (['node_modules', '.expo', '.git'].includes(entry.name)) continue;
      results.push(...walk(relPath));
    } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name) && !entry.name.endsWith('.test.ts')) {
      results.push(relPath);
    }
  }
  return results;
}

function activeSource(): Array<{ file: string; text: string }> {
  return [...walk('src'), ...walk('lib'), ...walk('scripts')]
    .filter((file) => !file.includes('/engine/simulation/'))
    .map((file) => ({ file, text: read(file) }));
}

console.log('\n-- performance-engine legacy boundary --');

const deletedFiles = [
  'lib/engine/calculateWeightCut.ts',
  'lib/engine/calculateWeightCut.test.ts',
  'scripts/simulate_weightClassPlan.ts',
  'scripts/simulate_full_app.ts',
  'src/components/DailyProtocolCard.tsx',
  'src/components/SafetyStatusIndicator.tsx',
  'src/components/DashboardNutritionCard.tsx',
];

for (const file of deletedFiles) {
  assert(`${file} is removed`, !fs.existsSync(path.join(process.cwd(), file)));
}

const engineIndex = read('lib/engine/index.ts');
assert('legacy weight-class generator is not exported', !/calculateWeightCut|generateCutPlan|computeDailyCutProtocol|determineCutPhase|getDailyCutIntensityCap/.test(engineIndex));

const sources = activeSource();
const combined = sources.map((source) => `\n${source.file}\n${source.text}`).join('\n');

assert('active app source does not import old weight-class generator module', !combined.includes('calculateWeightCut'));
assert('active app source does not reference daily body-mass guidance persistence helpers', !/upsertDailyCutProtocol|getDailyCutProtocol|updateProtocolCompliance|getLastRefeedDate|getConsecutiveDepletedDays/.test(combined));
assert('active app source does not reference removed daily protocol UI', !/DailyProtocolCard|SafetyStatusIndicator|DashboardNutritionCard/.test(combined));
assert('active app source does not carry a cutProtocol compatibility field', !/\bcutProtocol\b/.test(combined));
assert('active app source does not use daily performance snapshot services', !/dailyPerformanceSnapshotService|DailyPerformanceSnapshot|daily_performance_summary_snapshot/.test(combined));
assert('active app source does not use ResolvedNutritionTargets wrappers', !/ResolvedNutritionTargets|ResolvedNutritionTarget/.test(combined));
assert('active app source does not point at retired DB tables or columns', !/daily_engine_snapshots|daily_mission_snapshot|weight_cut_plans|cut_safety_checks|weight_cut_history|active_cut_plan_id|has_concurrent_cut|weight_cut_state|max_water_cut_pct|water_cut_allocation_lbs|protocol_adherence_pct/.test(combined));
assert('active app source uses canonical body-mass and weight-class schema names', /weight_class_plans/.test(combined) && /body_mass_safety_checks/.test(combined) && /active_weight_class_plan_id/.test(combined));

const dangerousMethodPattern = /\b(sauna|sweat suit|diuretic|laxative|vomiting|severe fasting|extreme fluid restriction)\b/i;
const dangerousHits = sources.filter((source) => dangerousMethodPattern.test(source.text));
assert('active source does not recommend dangerous dehydration methods', dangerousHits.length === 0);

const dailyAthleteSummary = read('lib/api/dailyPerformanceService.ts');
const bodyMassMapping = read('lib/api/dailyPerformance/bodyMassMapping.ts');
const unifiedDailyPerformance = read('lib/api/dailyPerformance/unifiedDailyPerformance.ts');
assert('daily athlete summary no longer imports legacy protocol row type', !dailyAthleteSummary.includes('DailyCutProtocolRow'));
assert('daily athlete summary no longer threads legacy body-mass guidance output', !dailyAthleteSummary.includes('LegacyCutProtocol') && !dailyAthleteSummary.includes('cutProtocol'));
assert('unified daily performance preserves unknown body mass instead of legacy fallback', /currentWeight:\s*number \| null/.test(unifiedDailyPerformance)
  && /const canonicalCurrentWeight = input\.objectiveContext\.currentWeightLbs \?\? input\.currentWeight \?\? null/.test(unifiedDailyPerformance)
  && bodyMassMapping.includes("missingFields: current ? [] : [{ field: 'current_body_mass', reason: 'not_collected' }]"));

const weightClassMigration = read('supabase/migrations/002_weight_cut.sql');
assert('fresh schema does not create retired daily body-mass guidance table', !weightClassMigration.includes('daily_cut_protocols'));

const schemaCleanupMigration = read('supabase/migrations/030_performance_engine_schema_cleanup.sql');
assert('cleanup migration creates canonical weight-class plan table', /CREATE TABLE IF NOT EXISTS public\.weight_class_plans/.test(schemaCleanupMigration));
assert('cleanup migration creates canonical body-mass safety table', /CREATE TABLE IF NOT EXISTS public\.body_mass_safety_checks/.test(schemaCleanupMigration));
assert('cleanup migration backfills active weight-class plan ids', /active_weight_class_plan_id/.test(schemaCleanupMigration) && /active_cut_plan_id/.test(schemaCleanupMigration));
assert('cleanup migration archives retired daily snapshots before dropping them', /performance_engine_migration_archive/.test(schemaCleanupMigration) && /retired_daily_snapshot_persistence/.test(schemaCleanupMigration) && /DROP TABLE IF EXISTS public\.daily_engine_snapshots/.test(schemaCleanupMigration));
assert('cleanup migration archives retired daily body-mass protocol table before dropping it', /retired_daily_body_mass_protocol/.test(schemaCleanupMigration) && /DROP TABLE IF EXISTS public\.daily_cut_protocols/.test(schemaCleanupMigration));
assert('cleanup migration retires old weight-class schema names', /DROP TABLE IF EXISTS public\.weight_cut_plans/.test(schemaCleanupMigration) && /DROP COLUMN IF EXISTS has_concurrent_cut/.test(schemaCleanupMigration));
assert('cleanup migration refreshes account deletion for canonical tables', /DELETE FROM public\.body_mass_safety_checks/.test(schemaCleanupMigration) && /DELETE FROM public\.weight_class_plans/.test(schemaCleanupMigration));

const adaptiveTraining = read('lib/performance-engine/adaptive-training/adaptiveTrainingEngine.ts');
assert('protected workouts remain canonical anchors', /protected/i.test(adaptiveTraining) && /anchor/i.test(adaptiveTraining));

const phaseController = read('lib/performance-engine/phase-controller/phaseController.ts');
assert('phase transitions preserve journey history', /transitionHistory/.test(phaseController) && /previous/.test(phaseController));

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
