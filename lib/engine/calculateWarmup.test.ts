/**
 * Standalone test script for lib/engine/calculateWarmup.ts
 * Run with: npx tsx lib/engine/calculateWarmup.test.ts
 */

import { generateWarmupSets } from './calculateWarmup.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  PASS ${label}`); }
  else { failed++; console.error(`  FAIL ${label}`); }
}

function makeInput(overrides: Record<string, any> = {}) {
  return {
    session_type: 'boxing',
    expected_intensity: 7,
    readiness_score: 70,
    injury_history: [] as string[],
    body_weight_state: 'normal',
    ...overrides,
  } as any;
}

console.log('\n── generateWarmupSets: basic structure ──');

const boxing = generateWarmupSets(makeInput({ session_type: 'boxing', expected_intensity: 7 }));
assert('result has total_duration_min', typeof boxing.total_duration_min === 'number');
assert('result has focus', typeof boxing.focus === 'string');
assert('result has phases array', Array.isArray(boxing.phases));
assert('each phase has name and duration_min', boxing.phases.every((p: any) => p.name && typeof p.duration_min === 'number'));
assert('each phase has movements array', boxing.phases.every((p: any) => Array.isArray(p.movements)));
assert('total_duration equals sum of phase durations', boxing.total_duration_min === boxing.phases.reduce((s: number, p: any) => s + p.duration_min, 0));

console.log('\n── Focus mapping ──');

const boxingResult = generateWarmupSets(makeInput({ session_type: 'boxing', expected_intensity: 7 }));
assert('boxing → striking focus', boxingResult.focus === 'striking');

const muayThai = generateWarmupSets(makeInput({ session_type: 'muay_thai', expected_intensity: 7 }));
assert('muay_thai → striking focus', muayThai.focus === 'striking');

const bjj = generateWarmupSets(makeInput({ session_type: 'bjj', expected_intensity: 7 }));
assert('bjj → grappling focus', bjj.focus === 'grappling');

const wrestling = generateWarmupSets(makeInput({ session_type: 'wrestling', expected_intensity: 7 }));
assert('wrestling → grappling focus', wrestling.focus === 'grappling');

const strength = generateWarmupSets(makeInput({ session_type: 'strength', expected_intensity: 7 }));
assert('strength → s_c focus', strength.focus === 's_c');

const conditioning = generateWarmupSets(makeInput({ session_type: 'conditioning', expected_intensity: 7 }));
assert('conditioning → s_c focus', conditioning.focus === 's_c');

const general = generateWarmupSets(makeInput({ session_type: 'yoga', expected_intensity: 5 }));
assert('unknown session type → general focus', general.focus === 'general');

console.log('\n── Potentiation phase (intensity >= 6) ──');

const highIntensity = generateWarmupSets(makeInput({ expected_intensity: 8 }));
const hasNeuralPhase = highIntensity.phases.some((p: any) => p.name.toLowerCase().includes('neural') || p.name.toLowerCase().includes('potentiation'));
assert('intensity 8 includes potentiation phase', hasNeuralPhase);

const lowIntensity = generateWarmupSets(makeInput({ expected_intensity: 4 }));
const noNeuralPhase = !lowIntensity.phases.some((p: any) => p.name.toLowerCase().includes('neural') || p.name.toLowerCase().includes('potentiation'));
assert('intensity 4 skips potentiation phase', noNeuralPhase);

const exactlySix = generateWarmupSets(makeInput({ expected_intensity: 6 }));
const hasPotentiationAt6 = exactlySix.phases.some((p: any) => p.name.toLowerCase().includes('neural') || p.name.toLowerCase().includes('potentiation'));
assert('intensity 6 includes potentiation phase', hasPotentiationAt6);

console.log('\n── Injury history additions ──');

const noInjury = generateWarmupSets(makeInput({ injury_history: [] }));
const withShoulder = generateWarmupSets(makeInput({ injury_history: ['shoulder'] }));
const noInjuryActivation = noInjury.phases.find((p: any) => p.name.toLowerCase().includes('activation'));
const shoulderActivation = withShoulder.phases.find((p: any) => p.name.toLowerCase().includes('activation'));
assert('shoulder injury adds scapular work to activation', shoulderActivation!.movements.length > noInjuryActivation!.movements.length);

const withKnee = generateWarmupSets(makeInput({ injury_history: ['knee'] }));
const kneeActivation = withKnee.phases.find((p: any) => p.name.toLowerCase().includes('activation'));
assert('knee injury adds monster walk to activation', kneeActivation!.movements.length > noInjuryActivation!.movements.length);

console.log('\n── Dehydrated body weight state ──');

const dehydrated = generateWarmupSets(makeInput({ body_weight_state: 'dehydrated', expected_intensity: 8 }));
assert('dehydrated: safety_warning present', dehydrated.safety_warning != null);
assert('dehydrated: safety_warning mentions weight cut', (dehydrated.safety_warning as string).toLowerCase().includes('weight cut') || (dehydrated.safety_warning as string).toLowerCase().includes('cut'));
assert('dehydrated: GPP phase modified to slow movements', dehydrated.phases[0].movements.length <= 2);

const normal = generateWarmupSets(makeInput({ body_weight_state: 'normal' }));
assert('normal state: no safety_warning', normal.safety_warning == null || normal.safety_warning === undefined);

console.log('\n── Duration adjustments ──');

const stiffAthlete = generateWarmupSets(makeInput({ readiness_score: 30, expected_intensity: 5 }));
const freshAthlete = generateWarmupSets(makeInput({ readiness_score: 80, expected_intensity: 5 }));
assert('low readiness extends warmup duration', stiffAthlete.total_duration_min >= freshAthlete.total_duration_min);

const highIntensityDur = generateWarmupSets(makeInput({ readiness_score: 70, expected_intensity: 9 }));
const lowIntensityDur = generateWarmupSets(makeInput({ readiness_score: 70, expected_intensity: 4 }));
assert('high intensity extends warmup duration', highIntensityDur.total_duration_min >= lowIntensityDur.total_duration_min);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
