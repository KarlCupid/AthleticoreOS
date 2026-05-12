import fs from 'node:fs';
import path from 'node:path';
import {
  fuelPriorityForSupportDomain,
  familyToAthleticDevelopmentDomain,
  supportDemandForSession,
  supportDomainLabel,
  supportSessionMetadata,
} from './athleteSupportDomains.ts';
import { buildWorkoutProgrammingSeedRows } from './seedLoader.ts';
import { workoutProgrammingCatalog } from './seedData.ts';
import type {
  AthleteSupportFuelPriority,
  BoxingAthleteSupportDomain,
  BoxingPlannedSessionRole,
  BoxingSessionFamily,
  ProtectedWorkoutModality,
  WorkoutIntensity,
} from './types.ts';
import type { FuelPriority } from '../../engine/types/nutrition.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean): void {
  if (condition) {
    passed += 1;
    console.log(`  PASS ${label}`);
  } else {
    failed += 1;
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

const BOXING_SESSION_FAMILY_RECORD: Record<BoxingSessionFamily, true> = {
  boxing_skill_microdose: true,
  footwork_agility: true,
  reaction_rhythm: true,
  shadowboxing_quality: true,
  bag_pad_support: true,
  max_strength_lower: true,
  strength_power: true,
  explosive_power: true,
  rotational_power: true,
  trunk_durability: true,
  shoulder_scap_durability: true,
  neck_trap_durability: true,
  hip_ankle_mobility: true,
  roadwork_zone2: true,
  roadwork_tempo: true,
  roadwork_intervals: true,
  alactic_repeat_power: true,
  glycolytic_round_tolerance: true,
  boxing_conditioning_support: true,
  mobility_prehab: true,
  recovery_reset: true,
};

const SUPPORT_DOMAIN_RECORD: Record<BoxingAthleteSupportDomain, true> = {
  boxing_skill_support: true,
  strength: true,
  power: true,
  speed_agility: true,
  conditioning: true,
  roadwork: true,
  durability: true,
  mobility: true,
  recovery: true,
  nutrition_fueling: true,
  hydration: true,
  weight_class_support: true,
};

const FUEL_PRIORITY_RECORD: Record<AthleteSupportFuelPriority, FuelPriority> = {
  sparring: 'sparring',
  boxing_practice: 'boxing_practice',
  strength_power: 'strength_power',
  power: 'power',
  roadwork_aerobic: 'roadwork_aerobic',
  roadwork_tempo: 'roadwork_tempo',
  conditioning_intervals: 'conditioning_intervals',
  durability: 'durability',
  mobility: 'mobility',
  recovery: 'recovery',
  double_session: 'double_session',
  body_mass_protect: 'body_mass_protect',
};

const ROLE_BY_FAMILY: Record<BoxingSessionFamily, BoxingPlannedSessionRole> = {
  boxing_skill_microdose: 'boxing_skill_microdose',
  footwork_agility: 'footwork_agility',
  reaction_rhythm: 'reaction_rhythm',
  shadowboxing_quality: 'boxing_technical_practice',
  bag_pad_support: 'bag_or_pad_support',
  max_strength_lower: 'max_strength_lower',
  strength_power: 'strength_power',
  explosive_power: 'explosive_power',
  rotational_power: 'rotational_power',
  trunk_durability: 'trunk_rotation_durability',
  shoulder_scap_durability: 'shoulder_scap_durability',
  neck_trap_durability: 'neck_trap_durability',
  hip_ankle_mobility: 'hip_footwork_durability',
  roadwork_zone2: 'roadwork_aerobic_base',
  roadwork_tempo: 'roadwork_tempo',
  roadwork_intervals: 'roadwork_intervals',
  alactic_repeat_power: 'alactic_repeat_power',
  glycolytic_round_tolerance: 'glycolytic_round_tolerance',
  boxing_conditioning_support: 'boxing_conditioning_support',
  mobility_prehab: 'mobility_prehab',
  recovery_reset: 'recovery_reset',
};

const GENERATED_FAMILIES = Object.keys(BOXING_SESSION_FAMILY_RECORD) as BoxingSessionFamily[];
const SUPPORT_DOMAINS = Object.keys(SUPPORT_DOMAIN_RECORD) as BoxingAthleteSupportDomain[];
const FUEL_PRIORITIES = Object.keys(FUEL_PRIORITY_RECORD) as AthleteSupportFuelPriority[];
const SNAPSHOT_METADATA_FIELDS = [
  'athleticDevelopmentDomain',
  'supportDomainLabel',
  'expectedFuelPriority',
  'expectedCarbDemandClass',
  'expectedRecoveryDemandClass',
  'expectedHydrationDemandClass',
  'sessionEnergyDemandScore',
  'sessionRecoveryDemandScore',
  'boxingSessionFamily',
  'boxingSessionRole',
  'boxingRelevance',
  'sAndCRationale',
  'athleticDevelopmentRationale',
];

function plannedIntensityForFamily(family: BoxingSessionFamily): WorkoutIntensity {
  if (family === 'recovery_reset' || family === 'mobility_prehab') return 'recovery';
  if (family.includes('intervals') || family === 'alactic_repeat_power' || family === 'glycolytic_round_tolerance' || family === 'boxing_conditioning_support') return 'hard';
  if (family.includes('roadwork') || family.includes('durability') || family === 'hip_ankle_mobility') return 'low';
  return 'moderate';
}

function assertDemandScores(label: string, energy: number, recovery: number): void {
  assert(`${label} energy demand is on 0-100 scale`, energy >= 0 && energy <= 100);
  assert(`${label} recovery demand is on 0-100 scale`, recovery >= 0 && recovery <= 100);
  assert(`${label} no 1-9 energy score leaks`, !(energy >= 1 && energy <= 9));
  assert(`${label} no 1-9 recovery score leaks`, !(recovery >= 1 && recovery <= 9));
}

console.log('\n-- support engine release audit --');

for (const family of GENERATED_FAMILIES) {
  const role = ROLE_BY_FAMILY[family];
  const domain = familyToAthleticDevelopmentDomain(family, role);
  const meta = supportSessionMetadata({
    family,
    role,
    plannedIntensity: plannedIntensityForFamily(family),
    durationMinutes: family === 'roadwork_zone2' ? 35 : family === 'roadwork_tempo' ? 45 : 30,
  });
  assert(`${family} maps to a support domain`, Boolean(domain));
  assert(`${family} maps to a support-domain label`, Boolean(meta.supportDomainLabel && meta.supportDomainLabel === supportDomainLabel(meta.athleticDevelopmentDomain)));
  assertDemandScores(`${family} support metadata`, meta.sessionEnergyDemandScore, meta.sessionRecoveryDemandScore);
  assert(`${family} fuel priority is accepted by nutrition`, Boolean(FUEL_PRIORITY_RECORD[meta.expectedFuelPriority]));
}

for (const domain of SUPPORT_DOMAINS) {
  const priority = fuelPriorityForSupportDomain({ domain, plannedIntensity: 'moderate', durationMinutes: 35 });
  const demand = supportDemandForSession({ domain, fuelPriority: priority, plannedIntensity: 'moderate', durationMinutes: 35 });
  assert(`${domain} maps to a fuel priority`, Boolean(FUEL_PRIORITY_RECORD[priority]));
  assert(`${domain} maps to demand classes`, Boolean(demand.expectedCarbDemandClass && demand.expectedRecoveryDemandClass && demand.expectedHydrationDemandClass));
  assertDemandScores(`${domain} demand`, demand.sessionEnergyDemandScore, demand.sessionRecoveryDemandScore);
}

for (const priority of FUEL_PRIORITIES) {
  const demand = supportDemandForSession({ fuelPriority: priority, plannedIntensity: priority === 'conditioning_intervals' ? 'hard' : 'moderate', durationMinutes: 45 });
  assertDemandScores(`${priority} priority`, demand.sessionEnergyDemandScore, demand.sessionRecoveryDemandScore);
}

const hardBoxingConditioning = supportSessionMetadata({
  protectedModality: 'boxing_conditioning',
  plannedIntensity: 'hard',
  durationMinutes: 24,
});
const longBoxingConditioning = supportSessionMetadata({
  protectedModality: 'boxing_conditioning',
  plannedIntensity: 'moderate',
  durationMinutes: 35,
});
const shortBoxingConditioning = supportSessionMetadata({
  protectedModality: 'boxing_conditioning',
  plannedIntensity: 'low',
  durationMinutes: 18,
});
assert('hard protected boxing conditioning fuels as intervals', hardBoxingConditioning.expectedFuelPriority === 'conditioning_intervals');
assert('long protected boxing conditioning fuels as intervals', longBoxingConditioning.expectedFuelPriority === 'conditioning_intervals');
assert('short protected boxing conditioning does not overstate interval demand', shortBoxingConditioning.expectedFuelPriority === 'boxing_practice');

const lowSkillMicrodose = supportSessionMetadata({
  family: 'boxing_skill_microdose',
  role: 'boxing_skill_microdose',
  plannedIntensity: 'low',
  durationMinutes: 12,
});
const hardSkillSupport = supportSessionMetadata({
  family: 'shadowboxing_quality',
  role: 'boxing_technical_practice',
  plannedIntensity: 'hard',
  durationMinutes: 30,
});
assert('low boxing skill microdose stays light-fuel support', lowSkillMicrodose.expectedFuelPriority === 'mobility');
assert('hard or long boxing skill support fuels as boxing practice', hardSkillSupport.expectedFuelPriority === 'boxing_practice');

const externalPriority = fuelPriorityForSupportDomain({
  protectedModality: 'external_non_boxing_load' as ProtectedWorkoutModality,
  plannedIntensity: 'moderate',
  durationMinutes: 45,
});
assert('external non-boxing load is not inferred as boxing practice', externalPriority !== 'boxing_practice' && externalPriority !== 'sparring');

assert('generated BoxingSessionFamily union contains no sparring family', GENERATED_FAMILIES.every((family) => !/spar/i.test(family)));
assert('generated session templates do not create sparring', workoutProgrammingCatalog.sessionTemplates.every((template) => (
  !/spar/i.test(`${template.id} ${template.label} ${template.workoutTypeId} ${template.goalIds.join(' ')}`)
)));
assert('generated training goals and workout types do not create sparring', [
  ...workoutProgrammingCatalog.trainingGoals,
  ...workoutProgrammingCatalog.workoutTypes,
].every((item) => !/spar/i.test(`${item.id} ${item.label}`)));

const boxingSnapshotSessions = read('lib/api/dailyPerformance/boxingSnapshotSessions.ts');
const summaryMapping = read('lib/api/dailyPerformance/summaryMapping.ts');
const taxonomySeedMigration = read('supabase/migrations/045_workout_programming_taxonomy_goal_seed.sql');
const taxonomySeedRows = buildWorkoutProgrammingSeedRows(workoutProgrammingCatalog);

assert('taxonomy migration upserts workout types', taxonomySeedMigration.includes('INSERT INTO public.workout_types') && taxonomySeedMigration.includes('ON CONFLICT (id) DO UPDATE'));
assert('taxonomy migration upserts training goals', taxonomySeedMigration.includes('INSERT INTO public.training_goals') && taxonomySeedMigration.includes('default_workout_type_id = EXCLUDED.default_workout_type_id'));
for (const workoutType of taxonomySeedRows.workout_types) {
  assert(`taxonomy migration seeds workout type ${workoutType.id}`, taxonomySeedMigration.includes(`'${workoutType.id}'`));
}
for (const goal of taxonomySeedRows.training_goals) {
  assert(`taxonomy migration seeds training goal ${goal.id}`, taxonomySeedMigration.includes(`'${goal.id}'`));
}

for (const field of SNAPSHOT_METADATA_FIELDS) {
  assert(`snapshot path carries ${field}`, boxingSnapshotSessions.includes(field));
  assert(`daily summary/fuel path carries ${field}`, summaryMapping.includes(field));
}

assert('title/family inference is fallback-only when direct metadata exists', (
  summaryMapping.includes('Title/family inference is fallback-only for older rows without direct support metadata.')
  && summaryMapping.indexOf('const direct = session?.supportMetadata?.expectedFuelPriority') < summaryMapping.indexOf('const title =')
));

const productSources = [...walk('src'), ...walk('lib/api')]
  .map((file) => ({ file, text: read(file) }));
const legacyGenerationImportPattern = /import\s+(?:type\s+)?(?:[^;]*\b(?:generateAdaptiveSmartWeekPlan|generateWorkoutV2|generateSmartWeekPlan|generateBlockPlan|generateLegacyBlockPlan)\b[^;]*)\s+from\s+['"][^'"]+['"]/;
const productLegacyImports = productSources.filter((source) => legacyGenerationImportPattern.test(source.text));
assert('product src/ and lib/api do not import legacy workout generation APIs', productLegacyImports.length === 0);

const workoutScreen = read('src/screens/WorkoutScreen.tsx');
const workoutDetail = read('src/screens/WorkoutDetailScreen.tsx');
const weeklyPlanService = read('lib/api/weeklyPlanService.ts');
const legacyBoundary = read('lib/engine/legacyWorkoutGeneration.ts');
assert('Today planned support flow does not mount standalone generator by default', (
  workoutScreen.includes('PlannedSupportSessionCard')
  && workoutScreen.includes("navigation.navigate('WorkoutDetail'")
  && !workoutScreen.includes('BoxingGeneratedWorkoutContainer')
));
assert('Today support copy avoids developer snapshot language', (
  !workoutScreen.includes('Generated workout attached')
  && !workoutScreen.includes('Generated workout will attach')
  && !workoutDetail.includes('GeneratedWorkout snapshot')
));
assert('old rows remain readable through older-session view', (
  workoutDetail.includes('buildCompatibilityCopy')
  && weeklyPlanService.includes('This archived workout can be viewed')
));
assert('legacy generation has an explicit compatibility boundary', (
  legacyBoundary.includes('Compatibility only. Do not use for product workout generation.')
  && legacyBoundary.includes('generateLegacyBlockPlan')
  && !legacyBoundary.includes('generateLegacyBlockPlan as generateBlockPlan')
));

if (failed > 0) {
  throw new Error(`${failed} support engine release audit check(s) failed`);
}

console.log(`supportEngineReleaseAudit tests: ${passed} passed`);
