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
  'scripts/simulate_weight_cut.ts',
  'scripts/simulate_full_app.ts',
  'src/components/DailyProtocolCard.tsx',
  'src/components/SafetyStatusIndicator.tsx',
  'src/components/DashboardNutritionCard.tsx',
];

for (const file of deletedFiles) {
  assert(`${file} is removed`, !fs.existsSync(path.join(process.cwd(), file)));
}

const engineIndex = read('lib/engine/index.ts');
assert('legacy weight-cut generator is not exported', !/calculateWeightCut|generateCutPlan|computeDailyCutProtocol|determineCutPhase|getDailyCutIntensityCap/.test(engineIndex));

const sources = activeSource();
const combined = sources.map((source) => `\n${source.file}\n${source.text}`).join('\n');

assert('active app source does not import old cut generator module', !combined.includes('calculateWeightCut'));
assert('active app source does not reference daily cut protocol persistence helpers', !/upsertDailyCutProtocol|getDailyCutProtocol|updateProtocolCompliance|getLastRefeedDate|getConsecutiveDepletedDays/.test(combined));
assert('active app source does not reference removed daily protocol UI', !/DailyProtocolCard|SafetyStatusIndicator|DashboardNutritionCard/.test(combined));
assert('active app source does not carry a cutProtocol compatibility field', !/\bcutProtocol\b/.test(combined));

const dangerousMethodPattern = /\b(sauna|sweat suit|diuretic|laxative|vomiting|severe fasting|extreme fluid restriction)\b/i;
const dangerousHits = sources.filter((source) => dangerousMethodPattern.test(source.text));
assert('active source does not recommend dangerous dehydration methods', dangerousHits.length === 0);

const dailyMission = read('lib/api/dailyMissionService.ts');
assert('daily mission no longer imports legacy protocol row type', !dailyMission.includes('DailyCutProtocolRow'));
assert('daily mission no longer threads legacy cut protocol output', !dailyMission.includes('LegacyCutProtocol') && !dailyMission.includes('cutProtocol'));

const weightCutMigration = read('supabase/migrations/002_weight_cut.sql');
assert('fresh schema does not create retired daily cut protocol table', !weightCutMigration.includes('daily_cut_protocols'));

const adaptiveTraining = read('lib/performance-engine/adaptive-training/adaptiveTrainingEngine.ts');
assert('protected workouts remain canonical anchors', /protected/i.test(adaptiveTraining) && /anchor/i.test(adaptiveTraining));

const phaseController = read('lib/performance-engine/phase-controller/phaseController.ts');
assert('phase transitions preserve journey history', /transitionHistory/.test(phaseController) && /previous/.test(phaseController));

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
