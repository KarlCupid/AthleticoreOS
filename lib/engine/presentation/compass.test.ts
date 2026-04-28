/**
 * Standalone test script for lib/engine/presentation/compass.ts
 * Run with: npx tsx lib/engine/presentation/compass.ts
 */

import { buildCompassViewModel } from './compass.ts';
import type { DailyMission } from '../types/mission.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  PASS ${label}`); }
  else { failed++; console.error(`  FAIL ${label}`); }
}

function makeMission(overrides: Partial<DailyMission> = {}): DailyMission {
  return {
    date: '2026-03-18',
    engineVersion: 'v3',
    generatedAt: '2026-03-18T06:00:00Z',
    headline: 'Strong training day',
    summary: 'All systems green.',
    objective: {} as any,
    macrocycleContext: {} as any,
    trainingDirective: {
      sessionRole: 'develop',
      interventionState: 'none' as any,
      isMandatoryRecovery: false,
      focus: 'strength',
      workoutType: 'sc' as any,
      intent: 'Build strength',
      reason: 'Following the plan.',
      intensityCap: null,
      durationMin: 60,
      volumeTarget: 'moderate',
      keyQualities: [],
      source: 'daily_engine',
      prescription: null,
    },
    fuelDirective: {} as any,
    hydrationDirective: {} as any,
    recoveryDirective: {} as any,
    riskState: { level: 'low', score: 0, label: 'Low', drivers: [] },
    decisionTrace: [],
    overrideState: { status: 'following_plan', note: '' },
    ...overrides,
  };
}

console.log('\n── null mission → default ──');

const nullResult = buildCompassViewModel(null, false, false, false);
assert('null mission: hasPrescription = false', nullResult.hasPrescription === false);
assert('null mission: CTA target = checkin', nullResult.primaryCTATarget === 'checkin');
assert('null mission: summaryLine mentions check-in', nullResult.summaryLine.toLowerCase().includes('check'));

console.log('\n── CTA state machine ──');

const mission = makeMission();

// No checkin done: primary = Log Check-in
const noCheckin = buildCompassViewModel(mission, false, false, false);
assert('no checkin: primaryCTA = Log Check-in', noCheckin.primaryCTALabel === 'Log Check-in');
assert('no checkin: primaryCTATarget = checkin', noCheckin.primaryCTATarget === 'checkin');
assert('no checkin: no secondary CTA without prescription', noCheckin.secondaryCTALabel === null);

// No checkin but has prescription: secondary = View Training Plan
const noCiWithRx = buildCompassViewModel(mission, true, false, false);
assert('no checkin + prescription: secondary = View Training Plan', noCiWithRx.secondaryCTALabel === 'View Training Plan');
assert('no checkin + prescription: secondary target = training', noCiWithRx.secondaryCTATarget === 'training');

// Checkin done + prescription + session not done: primary = Start Training
const ciDoneWithRx = buildCompassViewModel(mission, true, true, false);
assert('checkin + rx + not done: primary = Start Training', ciDoneWithRx.primaryCTALabel === 'Start Training');
assert('checkin + rx + not done: primaryTarget = training', ciDoneWithRx.primaryCTATarget === 'training');
assert('checkin + rx + not done: secondary = Log Fuel', ciDoneWithRx.secondaryCTALabel === 'Log Fuel');

// Session done: primary = Log Fuel
const sessionDone = buildCompassViewModel(mission, true, true, true);
assert('session done: primary = Log Fuel', sessionDone.primaryCTALabel === 'Log Fuel');
assert('session done: secondary = View Plan', sessionDone.secondaryCTALabel === 'View Plan');

// Checkin done, no prescription, session not done: primary = View Plan
const ciNoRx = buildCompassViewModel(mission, false, true, false);
assert('checkin + no rx + not done: primary = View Plan', ciNoRx.primaryCTALabel === 'View Plan');
assert('checkin + no rx + not done: secondary = Log Fuel', ciNoRx.secondaryCTALabel === 'Log Fuel');

console.log('\n── Mission fields passed through ──');

const result = buildCompassViewModel(mission, true, true, false);
assert('headline is human mission copy', result.headline === 'Strength today');
assert('summaryLine is simple direction', result.summaryLine === 'Do the planned work. Keep reps clean.');
assert('riskLevel from mission.riskState.level', result.riskLevel === 'low');
assert('sessionLabel derived from workout identity', result.sessionLabel === 'Strength');
assert('hasPrescription reflects arg', result.hasPrescription === true);

console.log('\n── Session role labels ──');

const restMission = makeMission({ trainingDirective: { ...makeMission().trainingDirective, sessionRole: 'rest' } });
const restResult = buildCompassViewModel(restMission, false, true, false);
assert('rest role: label = Rest Day', restResult.sessionRoleLabel === 'Rest Day');

const recoverMission = makeMission({ trainingDirective: { ...makeMission().trainingDirective, sessionRole: 'recover' } });
const recoverResult = buildCompassViewModel(recoverMission, false, true, false);
assert('recover role: label = Recovery Day', recoverResult.sessionRoleLabel === 'Recovery Day');

const sparMission = makeMission({ trainingDirective: { ...makeMission().trainingDirective, sessionRole: 'spar_support' } });
const sparResult = buildCompassViewModel(sparMission, false, true, false);
assert('spar_support role: label = Sparring Support', sparResult.sessionRoleLabel === 'Sparring Support');

const conditioningMission = makeMission({
  trainingDirective: {
    ...makeMission().trainingDirective,
    sessionRole: 'spar_support',
    focus: 'conditioning' as any,
    workoutType: 'conditioning' as any,
  },
});
const conditioningResult = buildCompassViewModel(conditioningMission, false, true, false);
assert('sessionLabel prioritizes session family over role label', conditioningResult.sessionLabel === 'Conditioning');
assert('role label remains secondary context', conditioningResult.sessionRoleLabel === 'Sparring Support');

const taperMission = makeMission({ trainingDirective: { ...makeMission().trainingDirective, sessionRole: 'taper_sharpen' } });
const taperResult = buildCompassViewModel(taperMission, false, true, false);
assert('taper_sharpen: label = Taper & Sharpen', taperResult.sessionRoleLabel === 'Taper & Sharpen');

console.log('\n── Decision reason from trace ──');

const withTrace = makeMission({
  decisionTrace: [{
    subsystem: 'training',
    title: 'High ACWR',
    detail: 'Load is elevated above threshold.',
    humanInterpretation: 'Back off today.',
    impact: 'restricted',
  }],
});
const traceResult = buildCompassViewModel(withTrace, false, true, false);
assert('plain trace reason can pass through', traceResult.reasonSentence === 'Back off today.');

console.log('\n── Human mission copy ──');

const hardMission = makeMission({
  trainingDirective: {
    ...makeMission().trainingDirective,
    interventionState: 'hard' as any,
    isMandatoryRecovery: true,
    sessionRole: 'recover',
  },
  riskState: { level: 'critical', score: 85, label: 'Critical', drivers: [] },
});
const hardResult = buildCompassViewModel(hardMission, false, true, false);
assert('hard intervention headline is recovery first', hardResult.headline === 'Recovery first');
assert('hard intervention summary is direct', hardResult.summaryLine === 'Keep it easy today. Do not add extra work.');
assert('hard intervention reason is human', hardResult.reasonSentence === 'Your body needs the lighter option today.');

const softMission = makeMission({
  trainingDirective: {
    ...makeMission().trainingDirective,
    interventionState: 'soft' as any,
  },
  riskState: { level: 'high', score: 62, label: 'High', drivers: [] },
});
const softResult = buildCompassViewModel(softMission, true, true, false);
assert('soft intervention headline is controlled', softResult.headline === 'Keep it controlled');
assert('soft intervention summary skips optional extras', softResult.summaryLine === 'Do the main work. Skip optional extras.');

const restCopyResult = buildCompassViewModel(restMission, false, true, false);
assert('rest copy headline is plain', restCopyResult.headline === 'Rest today');
assert('rest copy summary is plain', restCopyResult.summaryLine === 'No training today. Let the work settle.');

const cutMission = makeMission({
  trainingDirective: {
    ...makeMission().trainingDirective,
    sessionRole: 'cut_protect',
    source: 'daily_engine',
  },
});
const cutResult = buildCompassViewModel(cutMission, false, true, false);
assert('body-mass protection headline is plain', cutResult.headline === 'Keep it light');
assert('body-mass protection reason is plain', cutResult.reasonSentence === 'Body-mass and recovery context are setting today\'s limits.');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
